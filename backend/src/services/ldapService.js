/**
 * LDAP/AD Client Service
 *
 * Wraps the ldapjs library to provide high-level operations:
 *   connect, authenticate, searchUser, searchGroups, testConnection, disconnect
 *
 * Caches the active AdConfiguration for 5 minutes to avoid repeated DB reads.
 */
const ldap = require('ldapjs');
const logger = require('./logger');

// ── Structured error codes ──────────────────────────────────
const LDAP_ERRORS = {
  CONNECTION_FAILED: 'LDAP_CONNECTION_FAILED',
  BIND_FAILED: 'LDAP_BIND_FAILED',
  SEARCH_FAILED: 'LDAP_SEARCH_FAILED',
  USER_NOT_FOUND: 'LDAP_USER_NOT_FOUND',
  TIMEOUT: 'LDAP_TIMEOUT',
  CONFIG_NOT_FOUND: 'LDAP_CONFIG_NOT_FOUND',
};

class LdapError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'LdapError';
    this.code = code;
    this.details = details;
  }
}

class LdapService {
  constructor() {
    // Config cache — { config, expiresAt }
    this._configCache = null;
    this._configTtlMs = 5 * 60 * 1000; // 5 minutes
  }

  // ── Config helpers ─────────────────────────────────────────

  /**
   * Load the active AdConfiguration (with caching).
   * We require() models lazily to avoid circular-dependency at import time.
   */
  async getActiveConfig() {
    if (this._configCache && Date.now() < this._configCache.expiresAt) {
      return this._configCache.config;
    }

    const { AdConfiguration } = require('../models');
    const config = await AdConfiguration.findOne({ where: { isActive: true } });

    if (!config) {
      return null;
    }

    this._configCache = {
      config,
      expiresAt: Date.now() + this._configTtlMs,
    };
    return config;
  }

  /** Invalidate the cached config (call after config updates). */
  invalidateConfigCache() {
    this._configCache = null;
  }

  // ── Low-level client management ────────────────────────────

  /**
   * Create an ldapjs client and bind with the service-account credentials.
   * @param {AdConfiguration} config
   * @returns {ldap.Client} — bound client
   */
  async connect(config) {
    const url = config.serverUrl;
    const tlsOptions = config.useSsl
      ? { rejectUnauthorized: false } // allow self-signed certs in enterprise
      : undefined;

    const client = ldap.createClient({
      url,
      connectTimeout: (config.connectionTimeout || 10) * 1000,
      timeout: (config.connectionTimeout || 10) * 1000,
      tlsOptions,
    });

    // Wrap bind in a promise
    const bindPassword = config.getDecryptedBindPassword();

    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new LdapError(LDAP_ERRORS.TIMEOUT, `LDAP connection timed out to ${url}`));
      }, (config.connectionTimeout || 10) * 1000);

      client.on('error', (err) => {
        clearTimeout(timer);
        reject(
          new LdapError(LDAP_ERRORS.CONNECTION_FAILED, `LDAP connection error: ${err.message}`, {
            url,
          })
        );
      });

      client.bind(config.bindDn, bindPassword, (err) => {
        clearTimeout(timer);
        if (err) {
          return reject(
            new LdapError(LDAP_ERRORS.BIND_FAILED, `Service-account bind failed: ${err.message}`, {
              bindDn: config.bindDn,
            })
          );
        }
        resolve();
      });
    });

    return client;
  }

  /**
   * Unbind and destroy an ldapjs client.
   */
  disconnect(client) {
    if (!client) return;
    try {
      client.unbind();
      client.destroy();
    } catch {
      // ignore — client may already be disconnected
    }
  }

  // ── High-level operations ──────────────────────────────────

  /**
   * Authenticate a user against AD/LDAP.
   *
   * Flow:
   *   1. Connect with service account
   *   2. Search for user entry
   *   3. Re-bind as user to verify password
   *   4. Retrieve group memberships
   *
   * @param {string} username
   * @param {string} password
   * @param {AdConfiguration} [config] — optional, loaded from DB if omitted
   * @returns {{ success: boolean, user: object, groups: string[] }}
   */
  async authenticate(username, password, config) {
    config = config || (await this.getActiveConfig());
    if (!config) {
      throw new LdapError(LDAP_ERRORS.CONFIG_NOT_FOUND, 'No active AD/LDAP configuration found');
    }

    let client;
    try {
      // 1. Service-account bind
      client = await this.connect(config);

      // 2. Search for user
      const userEntry = await this._searchForUser(client, username, config);
      if (!userEntry) {
        throw new LdapError(LDAP_ERRORS.USER_NOT_FOUND, `User not found: ${username}`);
      }

      const userDn = userEntry.dn.toString();

      // 3. Re-bind as the user to verify password
      await new Promise((resolve, reject) => {
        client.bind(userDn, password, (err) => {
          if (err) {
            return reject(
              new LdapError(LDAP_ERRORS.BIND_FAILED, 'Invalid username or password', {
                username,
              })
            );
          }
          resolve();
        });
      });

      // 4. Gather group memberships
      const groups = this._extractGroups(userEntry, config);

      // Build normalised user object
      const user = this._mapUserAttributes(userEntry, config);

      logger.info(`LDAP authentication succeeded for ${username}`);
      return { success: true, user, groups };
    } catch (err) {
      if (err instanceof LdapError) throw err;
      logger.error('LDAP authentication error', err);
      throw new LdapError(LDAP_ERRORS.CONNECTION_FAILED, err.message);
    } finally {
      this.disconnect(client);
    }
  }

  /**
   * Search for a single user (service-account bind required first).
   * @returns {object|null} Raw ldapjs search entry
   */
  async searchUser(username, config) {
    config = config || (await this.getActiveConfig());
    if (!config) {
      throw new LdapError(LDAP_ERRORS.CONFIG_NOT_FOUND, 'No active AD/LDAP configuration found');
    }

    let client;
    try {
      client = await this.connect(config);
      const entry = await this._searchForUser(client, username, config);
      if (!entry) return null;
      return this._mapUserAttributes(entry, config);
    } finally {
      this.disconnect(client);
    }
  }

  /**
   * Get all group DNs for a user DN.
   */
  async searchGroups(userDn, config) {
    config = config || (await this.getActiveConfig());
    if (!config) {
      throw new LdapError(LDAP_ERRORS.CONFIG_NOT_FOUND, 'No active AD/LDAP configuration found');
    }

    let client;
    try {
      client = await this.connect(config);
      const searchBase = config.groupSearchBase || config.baseDn;
      const filter = `(&${config.groupSearchFilter}(member=${userDn}))`;

      const entries = await this._search(client, searchBase, {
        filter,
        scope: 'sub',
        attributes: ['dn', 'cn'],
      });

      return entries.map((e) => e.dn.toString());
    } finally {
      this.disconnect(client);
    }
  }

  /**
   * Test connectivity and service-account bind.
   * @returns {{ success: boolean, message: string, serverInfo?: object }}
   */
  async testConnection(config) {
    let client;
    try {
      client = await this.connect(config);

      // Quick search to verify base DN is reachable
      const entries = await this._search(client, config.baseDn, {
        filter: '(objectClass=*)',
        scope: 'base',
        attributes: ['namingContexts', 'defaultNamingContext'],
        sizeLimit: 1,
      });

      this.disconnect(client);

      return {
        success: true,
        message: 'Connection and bind succeeded',
        serverInfo: {
          url: config.serverUrl,
          baseDn: config.baseDn,
          ssl: config.useSsl,
          entriesFound: entries.length,
        },
      };
    } catch (err) {
      this.disconnect(client);
      const code = err instanceof LdapError ? err.code : LDAP_ERRORS.CONNECTION_FAILED;
      return {
        success: false,
        message: err.message,
        code,
      };
    }
  }

  // ── Internal helpers ───────────────────────────────────────

  /**
   * Run an LDAP search and return collected entries.
   */
  _search(client, base, opts) {
    return new Promise((resolve, reject) => {
      client.search(base, opts, (err, res) => {
        if (err) {
          return reject(
            new LdapError(LDAP_ERRORS.SEARCH_FAILED, `LDAP search error: ${err.message}`)
          );
        }

        const entries = [];
        res.on('searchEntry', (entry) => entries.push(entry));
        res.on('error', (searchErr) =>
          reject(
            new LdapError(LDAP_ERRORS.SEARCH_FAILED, `LDAP search stream error: ${searchErr.message}`)
          )
        );
        res.on('end', () => resolve(entries));
      });
    });
  }

  /**
   * Search for a single user by the configured filter.
   */
  async _searchForUser(client, username, config) {
    const searchBase = config.userSearchBase || config.baseDn;
    const filter = config.userSearchFilter.replace(/\{username\}/g, username);

    const entries = await this._search(client, searchBase, {
      filter,
      scope: 'sub',
      attributes: [
        config.emailAttribute,
        config.firstNameAttribute,
        config.lastNameAttribute,
        config.displayNameAttribute,
        config.uniqueIdAttribute,
        config.groupAttribute,
        'dn',
      ],
      sizeLimit: 1,
    });

    return entries.length > 0 ? entries[0] : null;
  }

  /**
   * Extract group DNs from the user entry's memberOf attribute.
   */
  _extractGroups(entry, config) {
    const attr = config.groupAttribute || 'memberOf';
    const raw = this._getAttr(entry, attr);
    if (!raw) return [];
    return Array.isArray(raw) ? raw : [raw];
  }

  /**
   * Map ldapjs entry attributes to a normalised user object.
   */
  _mapUserAttributes(entry, config) {
    return {
      dn: entry.dn ? entry.dn.toString() : null,
      externalId: this._getAttr(entry, config.uniqueIdAttribute) || null,
      email: this._getAttr(entry, config.emailAttribute) || null,
      firstName: this._getAttr(entry, config.firstNameAttribute) || null,
      lastName: this._getAttr(entry, config.lastNameAttribute) || null,
      displayName: this._getAttr(entry, config.displayNameAttribute) || null,
      groups: this._extractGroups(entry, config),
    };
  }

  /**
   * Safely read a single attribute value from an ldapjs search entry.
   * ldapjs v3 uses pojo.attributes array or entry.ppiject, we handle both.
   */
  _getAttr(entry, name) {
    // ldapjs v3: entry.ppiject?.attributes may be present
    if (entry.ppiject && entry.ppiject.attributes) {
      const found = entry.ppiject.attributes.find(
        (a) => a.type.toLowerCase() === name.toLowerCase()
      );
      if (found) {
        return found.values.length === 1 ? found.values[0] : found.values;
      }
    }
    // ldapjs v2 fallback: entry.attributes array
    if (entry.attributes) {
      const found = entry.attributes.find(
        (a) => (a.type || '').toLowerCase() === name.toLowerCase()
      );
      if (found) {
        const vals = found.values || found.vals || [];
        return vals.length === 1 ? vals[0] : vals;
      }
    }
    // Plain object (test doubles)
    if (entry[name] !== undefined) return entry[name];
    return null;
  }
}

module.exports = new LdapService();
