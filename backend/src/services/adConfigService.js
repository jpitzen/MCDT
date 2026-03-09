/**
 * AD Configuration Service
 *
 * Business logic for AD/LDAP configuration management:
 *   CRUD, activation, connection testing, group browsing,
 *   user sync, and role-mapping resolution.
 */
const { AdConfiguration, AdRoleMapping, User, AuditLog } = require('../models');
const ldapService = require('./ldapService');
const { encrypt } = require('../utils/encryption');
const logger = require('./logger');

class AdConfigService {
  // ── CRUD ──────────────────────────────────────────────────

  /**
   * List all AD configurations (bind password masked).
   */
  async listConfigs() {
    const configs = await AdConfiguration.findAll({
      include: [{ model: AdRoleMapping, as: 'roleMappings' }],
      order: [['createdAt', 'DESC']],
    });
    return configs.map((c) => c.toSafeJSON());
  }

  /**
   * Get a single configuration by ID with role mappings.
   */
  async getConfig(id) {
    const config = await AdConfiguration.findByPk(id, {
      include: [{ model: AdRoleMapping, as: 'roleMappings' }],
    });
    if (!config) return null;
    return { raw: config, safe: config.toSafeJSON() };
  }

  /**
   * Create a new AD configuration.
   * @param {object} data - Config fields including bindPassword (plaintext)
   * @param {string} userId - Creator's user ID
   */
  async createConfig(data, userId) {
    const { bindPassword, ...fields } = data;

    const config = AdConfiguration.build({
      ...fields,
      createdBy: userId,
      // Encrypted placeholders — overwritten immediately
      bindPasswordEncrypted: '',
      bindPasswordIv: '',
      bindPasswordAuthTag: '',
    });
    config.setBindPassword(bindPassword);
    await config.save();

    logger.info(`AD configuration created: ${config.name}`, { configId: config.id, userId });
    return config.toSafeJSON();
  }

  /**
   * Update an existing AD configuration.
   * If bindPassword is provided it is re-encrypted; otherwise kept as-is.
   */
  async updateConfig(id, data) {
    const config = await AdConfiguration.findByPk(id);
    if (!config) return null;

    const { bindPassword, ...fields } = data;

    // Apply scalar fields
    const allowedFields = [
      'name', 'serverUrl', 'baseDn', 'useSsl', 'port', 'connectionTimeout',
      'bindDn', 'userSearchFilter', 'userSearchBase', 'groupSearchFilter',
      'groupSearchBase', 'emailAttribute', 'displayNameAttribute',
      'firstNameAttribute', 'lastNameAttribute', 'groupAttribute',
      'uniqueIdAttribute', 'autoCreateUsers', 'defaultRole', 'syncIntervalMinutes',
    ];

    for (const key of allowedFields) {
      if (fields[key] !== undefined) {
        config[key] = fields[key];
      }
    }

    if (bindPassword) {
      config.setBindPassword(bindPassword);
    }

    await config.save();
    ldapService.invalidateConfigCache();

    logger.info(`AD configuration updated: ${config.name}`, { configId: config.id });
    return config.toSafeJSON();
  }

  /**
   * Delete an AD configuration (role mappings cascade).
   */
  async deleteConfig(id) {
    const config = await AdConfiguration.findByPk(id);
    if (!config) return null;

    const name = config.name;
    await config.destroy();
    ldapService.invalidateConfigCache();

    logger.info(`AD configuration deleted: ${name}`, { configId: id });
    return { id, name };
  }

  // ── Activation ────────────────────────────────────────────

  /**
   * Activate a configuration (deactivates all others).
   */
  async activateConfig(id) {
    const config = await AdConfiguration.findByPk(id);
    if (!config) return null;

    // Deactivate all others
    await AdConfiguration.update({ isActive: false }, { where: {} });
    config.isActive = true;
    await config.save();
    ldapService.invalidateConfigCache();

    logger.info(`AD configuration activated: ${config.name}`, { configId: id });
    return config.toSafeJSON();
  }

  /**
   * Deactivate a configuration.
   */
  async deactivateConfig(id) {
    const config = await AdConfiguration.findByPk(id);
    if (!config) return null;

    config.isActive = false;
    await config.save();
    ldapService.invalidateConfigCache();

    logger.info(`AD configuration deactivated: ${config.name}`, { configId: id });
    return config.toSafeJSON();
  }

  // ── Connection testing ────────────────────────────────────

  /**
   * Test connection to the LDAP server using a stored config.
   */
  async testConnectionById(id) {
    const config = await AdConfiguration.findByPk(id);
    if (!config) return null;

    const start = Date.now();
    const result = await ldapService.testConnection(config);
    result.latencyMs = Date.now() - start;
    return result;
  }

  /**
   * Test connection with ad-hoc config data (for pre-save testing).
   * Builds a temporary AdConfiguration instance without persisting it.
   */
  async testConnectionAdHoc(data) {
    const { bindPassword, ...fields } = data;

    const temp = AdConfiguration.build({
      ...fields,
      bindPasswordEncrypted: '',
      bindPasswordIv: '',
      bindPasswordAuthTag: '',
    });
    temp.setBindPassword(bindPassword);

    const start = Date.now();
    const result = await ldapService.testConnection(temp);
    result.latencyMs = Date.now() - start;
    return result;
  }

  // ── Service account ───────────────────────────────────────

  /**
   * Update bind DN and password for a config.
   */
  async updateServiceAccount(id, bindDn, bindPassword) {
    const config = await AdConfiguration.findByPk(id);
    if (!config) return null;

    config.bindDn = bindDn;
    config.setBindPassword(bindPassword);
    await config.save();
    ldapService.invalidateConfigCache();

    logger.info(`Service account updated for config: ${config.name}`, { configId: id });
    return config.toSafeJSON();
  }

  /**
   * Verify the stored service account can bind successfully.
   */
  async verifyServiceAccount(id) {
    const config = await AdConfiguration.findByPk(id);
    if (!config) return null;

    const start = Date.now();
    const result = await ldapService.testConnection(config);
    result.latencyMs = Date.now() - start;
    return result;
  }

  // ── Group browsing ────────────────────────────────────────

  /**
   * Search AD groups visible to the service account.
   */
  async searchGroups(id, search, limit = 50) {
    const config = await AdConfiguration.findByPk(id);
    if (!config) return null;

    let client;
    try {
      client = await ldapService.connect(config);
      const searchBase = config.groupSearchBase || config.baseDn;
      const filter = search
        ? `(&${config.groupSearchFilter}(cn=*${search}*))`
        : config.groupSearchFilter;

      const entries = await ldapService._search(client, searchBase, {
        filter,
        scope: 'sub',
        attributes: ['dn', 'cn', 'description'],
        sizeLimit: limit,
      });

      return entries.map((e) => ({
        dn: e.dn ? e.dn.toString() : null,
        name: ldapService._getAttr(e, 'cn'),
        description: ldapService._getAttr(e, 'description'),
      }));
    } finally {
      ldapService.disconnect(client);
    }
  }

  /**
   * List members of a specific AD group.
   */
  async getGroupMembers(id, groupDn) {
    const config = await AdConfiguration.findByPk(id);
    if (!config) return null;

    let client;
    try {
      client = await ldapService.connect(config);
      const entries = await ldapService._search(client, groupDn, {
        filter: '(objectClass=*)',
        scope: 'base',
        attributes: ['member'],
      });

      if (entries.length === 0) return [];

      const memberAttr = ldapService._getAttr(entries[0], 'member');
      if (!memberAttr) return [];
      return Array.isArray(memberAttr) ? memberAttr : [memberAttr];
    } finally {
      ldapService.disconnect(client);
    }
  }

  // ── User sync ─────────────────────────────────────────────

  /**
   * Synchronise AD users with local User records.
   * For v1 this runs synchronously within the request.
   */
  async syncUsers(id) {
    const config = await AdConfiguration.findByPk(id);
    if (!config) return null;

    const stats = { synced: 0, created: 0, updated: 0, errors: 0 };
    const startTime = Date.now();

    let client;
    try {
      client = await ldapService.connect(config);
      const searchBase = config.userSearchBase || config.baseDn;
      // Remove the {username} placeholder for a broad search
      const filter = config.userSearchFilter.replace(/\{username\}/g, '*');

      const entries = await ldapService._search(client, searchBase, {
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
        sizeLimit: 1000,
      });

      const { authService } = require('./authService');

      for (const entry of entries) {
        try {
          const mapped = ldapService._mapUserAttributes(entry, config);
          if (!mapped.email) continue;

          const groups = mapped.groups || [];

          let user = mapped.externalId
            ? await User.findByExternalId(mapped.externalId)
            : null;

          if (!user) {
            user = await User.findOne({ where: { email: mapped.email } });
          }

          // Resolve role
          const { authService: authSvc } = require('../services');
          const role = await authSvc.resolveAdRole(groups, config.id);

          if (user) {
            user.authProvider = 'ad';
            user.externalId = mapped.externalId || user.externalId;
            user.distinguishedName = mapped.dn || user.distinguishedName;
            user.adGroups = groups;
            user.lastAdSync = new Date();
            user.firstName = mapped.firstName || user.firstName;
            user.lastName = mapped.lastName || user.lastName;
            user.role = role;
            await user.save();
            stats.updated++;
          } else if (config.autoCreateUsers) {
            await User.create({
              email: mapped.email,
              firstName: mapped.firstName || null,
              lastName: mapped.lastName || null,
              passwordHash: null,
              authProvider: 'ad',
              externalId: mapped.externalId || null,
              distinguishedName: mapped.dn || null,
              adGroups: groups,
              lastAdSync: new Date(),
              role,
              isActive: true,
            });
            stats.created++;
          }
          stats.synced++;
        } catch (err) {
          stats.errors++;
          logger.error('Sync error for entry', err);
        }
      }
    } finally {
      ldapService.disconnect(client);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1) + 's';
    logger.info(`AD sync completed for config ${config.name}`, { ...stats, duration });

    return { ...stats, duration };
  }

  /**
   * Get the last sync metadata for a config.
   * (For v1, we compute it from User records.)
   */
  async getSyncStatus(id) {
    const config = await AdConfiguration.findByPk(id);
    if (!config) return null;

    const adUsers = await User.findAll({
      where: { authProvider: 'ad' },
      attributes: ['id', 'email', 'lastAdSync', 'adGroups', 'role'],
      order: [['lastAdSync', 'DESC']],
    });

    const lastSync = adUsers.length > 0 ? adUsers[0].lastAdSync : null;

    return {
      configName: config.name,
      totalAdUsers: adUsers.length,
      lastSync,
      users: adUsers.map((u) => ({
        id: u.id,
        email: u.email,
        role: u.role,
        lastAdSync: u.lastAdSync,
        groupCount: (u.adGroups || []).length,
      })),
    };
  }

  // ── Role resolution ───────────────────────────────────────

  /**
   * Test role resolution for a given username.
   * Searches the user in AD, retrieves groups, resolves via mappings.
   */
  async testRoleResolution(configId, username) {
    const config = await AdConfiguration.findByPk(configId, {
      include: [{ model: AdRoleMapping, as: 'roleMappings', where: { isActive: true }, required: false }],
    });
    if (!config) return null;

    // Search user in AD
    const userInfo = await ldapService.searchUser(username, config);
    if (!userInfo) {
      return { username, found: false, message: 'User not found in AD' };
    }

    const groups = userInfo.groups || [];
    const normalised = groups.map((g) => g.toLowerCase());

    // Find matching mappings
    const matchedMappings = (config.roleMappings || [])
      .filter((m) => normalised.includes(m.adGroupDn.toLowerCase()))
      .sort((a, b) => b.priority - a.priority)
      .map((m) => ({
        group: m.adGroupName,
        groupDn: m.adGroupDn,
        role: m.mappedRole,
        priority: m.priority,
      }));

    const resolvedRole = matchedMappings.length > 0
      ? matchedMappings[0].role
      : config.defaultRole;

    const reason = matchedMappings.length > 0
      ? `Highest priority mapping: ${matchedMappings[0].group} → ${matchedMappings[0].role} (priority ${matchedMappings[0].priority})`
      : `No matching group mapping — using default role: ${config.defaultRole}`;

    return {
      username,
      found: true,
      email: userInfo.email,
      displayName: userInfo.displayName,
      adGroups: groups,
      matchedMappings,
      resolvedRole,
      reason,
    };
  }

  // ── Audit helper ──────────────────────────────────────────

  /**
   * Write a row to audit_logs for AD config operations.
   */
  async audit(action, userId, resourceId, resourceName, details = {}, status = 'success', req = null) {
    try {
      await AuditLog.create({
        userId,
        action,
        resourceType: 'ad_configuration',
        resourceId,
        resourceName,
        actionStatus: status,
        changes: details,
        ipAddress: req ? req.ip : null,
        userAgent: req ? req.get('user-agent') : null,
      });
    } catch (err) {
      logger.error('Failed to write AD audit log', err);
    }
  }
}

module.exports = new AdConfigService();
