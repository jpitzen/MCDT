const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const logger = require('./logger');
const ldapService = require('./ldapService');

/**
 * AuthService - Handles JWT token generation and validation
 */
class AuthService {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    this.jwtExpiration = process.env.JWT_EXPIRATION || '24h';
    this.refreshTokenExpiration = process.env.REFRESH_TOKEN_EXPIRATION || '7d';
  }

  /**
   * Generate JWT access token
   * @param {object} payload - Token payload (user data)
   * @returns {string} - JWT token
   */
  generateToken(payload) {
    try {
      const token = jwt.sign(payload, this.jwtSecret, {
        expiresIn: this.jwtExpiration,
        algorithm: 'HS256',
      });

      return token;
    } catch (error) {
      logger.error('Failed to generate token', error);
      throw new Error('Token generation failed');
    }
  }

  /**
   * Generate JWT refresh token
   * @param {object} payload - Token payload
   * @returns {string} - Refresh token
   */
  generateRefreshToken(payload) {
    try {
      const token = jwt.sign(payload, this.jwtSecret, {
        expiresIn: this.refreshTokenExpiration,
        algorithm: 'HS256',
      });

      return token;
    } catch (error) {
      logger.error('Failed to generate refresh token', error);
      throw new Error('Refresh token generation failed');
    }
  }

  /**
   * Verify and decode JWT token
   * @param {string} token - JWT token to verify
   * @returns {object} - Decoded payload
   */
  verifyToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret, {
        algorithms: ['HS256'],
      });

      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token has expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      }

      logger.error('Token verification error', error);
      throw new Error('Token verification failed');
    }
  }

  /**
   * Generate password hash
   * @param {string} password - Plain text password
   * @returns {string} - Hashed password
   */
  async hashPassword(password) {
    try {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);
      return hash;
    } catch (error) {
      logger.error('Failed to hash password', error);
      throw new Error('Password hashing failed');
    }
  }

  /**
   * Compare password with hash
   * @param {string} password - Plain text password
   * @param {string} hash - Password hash
   * @returns {boolean} - True if password matches
   */
  async comparePassword(password, hash) {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      logger.error('Failed to compare password', error);
      throw new Error('Password comparison failed');
    }
  }

  /**
   * Create authentication context for API requests
   * @param {object} user - User object with id, email, role
   * @returns {object} - { token, refreshToken, expiresIn }
   */
  createAuthContext(user) {
    try {
      const payload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        type: 'access',
        authProvider: user.authProvider || 'local',
      };

      const refreshPayload = {
        userId: user.id,
        type: 'refresh',
      };

      const token = this.generateToken(payload);
      const refreshToken = this.generateRefreshToken(refreshPayload);

      return {
        token,
        refreshToken,
        tokenType: 'Bearer',
        expiresIn: this.jwtExpiration,
      };
    } catch (error) {
      logger.error('Failed to create auth context', error);
      throw error;
    }
  }

  /**
   * Validate token structure and claims
   * @param {object} decoded - Decoded token payload
   * @returns {boolean} - True if valid
   */
  validateTokenClaims(decoded) {
    const requiredClaims = ['userId', 'email', 'role', 'type'];

    for (const claim of requiredClaims) {
      if (!decoded[claim]) {
        logger.warn(`Missing required claim in token: ${claim}`);
        return false;
      }
    }

    if (decoded.type !== 'access' && decoded.type !== 'refresh') {
      logger.warn(`Invalid token type: ${decoded.type}`);
      return false;
    }

    return true;
  }

  /**
   * Extract token from Authorization header
   * @param {string} authHeader - Authorization header value
   * @returns {string} - Token or null
   */
  extractToken(authHeader) {
    if (!authHeader) return null;

    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      return parts[1];
    }

    return null;
  }

  // ════════════════════════════════════════════════════════════
  //  AD / LDAP Authentication
  // ════════════════════════════════════════════════════════════

  /**
   * Authenticate a user against Active Directory / LDAP.
   *
   * Flow:
   *   1. ldapService.authenticate(username, password)
   *   2. Find-or-create local User record (authProvider = 'ad' | 'ldap')
   *   3. Resolve role from AD group → role mappings
   *   4. Generate JWT tokens
   *
   * @param {string} username - sAMAccountName or UPN
   * @param {string} password
   * @returns {{ user: object, token: string, refreshToken: string }}
   */
  async authenticateWithAd(username, password) {
    // Models are lazily required to avoid circular dependency at module load
    const { User, AdRoleMapping, AdConfiguration } = require('../models');

    // 1. LDAP bind + attribute retrieval
    const ldapResult = await ldapService.authenticate(username, password);
    const { user: ldapUser, groups } = ldapResult;

    if (!ldapUser.email) {
      throw new Error('LDAP user has no email attribute — cannot create local account');
    }

    // Determine auth provider label from config
    const activeConfig = await ldapService.getActiveConfig();
    const providerLabel = activeConfig
      ? (activeConfig.serverUrl.toLowerCase().includes('ad') ? 'ad' : 'ldap')
      : 'ad';

    // 2. Find-or-create local user
    let user = ldapUser.externalId
      ? await User.findByExternalId(ldapUser.externalId)
      : null;

    if (!user) {
      // Try by email as a fallback
      user = await User.findOne({ where: { email: ldapUser.email } });
    }

    // 3. Resolve role
    const resolvedRole = await this.resolveAdRole(groups, activeConfig?.id);

    if (user) {
      // Update existing record
      user.authProvider = providerLabel;
      user.externalId = ldapUser.externalId || user.externalId;
      user.distinguishedName = ldapUser.dn || user.distinguishedName;
      user.adGroups = groups;
      user.lastAdSync = new Date();
      user.lastLogin = new Date();
      user.firstName = ldapUser.firstName || user.firstName;
      user.lastName = ldapUser.lastName || user.lastName;
      user.role = resolvedRole;
      user.isActive = true;
      await user.save();
    } else {
      // Auto-create if config allows
      if (activeConfig && !activeConfig.autoCreateUsers) {
        throw new Error('AD user auto-creation is disabled');
      }
      user = await User.create({
        email: ldapUser.email,
        firstName: ldapUser.firstName || null,
        lastName: ldapUser.lastName || null,
        passwordHash: null,
        authProvider: providerLabel,
        externalId: ldapUser.externalId || null,
        distinguishedName: ldapUser.dn || null,
        adGroups: groups,
        lastAdSync: new Date(),
        lastLogin: new Date(),
        role: resolvedRole,
        isActive: true,
      });
    }

    // 4. JWT
    const authContext = this.createAuthContext(user);
    logger.info(`AD authentication succeeded for ${username}`, { userId: user.id });

    return {
      user,
      token: authContext.token,
      refreshToken: authContext.refreshToken,
      tokenType: authContext.tokenType,
    };
  }

  /**
   * Resolve a ZL-MCDT role from AD group DNs.
   * Highest-priority matching AdRoleMapping wins; falls back to config.defaultRole.
   *
   * @param {string[]} groups - Array of AD group DNs
   * @param {string|null} configId - AdConfiguration id
   * @returns {string} - Resolved role (admin | approver | operator | viewer)
   */
  async resolveAdRole(groups, configId) {
    if (!configId || !groups || groups.length === 0) return 'viewer';

    const { AdRoleMapping, AdConfiguration } = require('../models');

    const mappings = await AdRoleMapping.findAll({
      where: {
        adConfigId: configId,
        isActive: true,
      },
      order: [['priority', 'DESC']],
    });

    // Normalise group DNs for case-insensitive comparison
    const normalisedGroups = groups.map((g) => g.toLowerCase());

    for (const mapping of mappings) {
      if (normalisedGroups.includes(mapping.adGroupDn.toLowerCase())) {
        return mapping.mappedRole;
      }
    }

    // Fall back to config default
    const config = await AdConfiguration.findByPk(configId);
    return config ? config.defaultRole : 'viewer';
  }
}

module.exports = new AuthService();
