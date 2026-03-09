const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { encrypt, decrypt } = require('../utils/encryption');

const AdConfiguration = sequelize.define(
  'AdConfiguration',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_active',
    },

    // ── Connection settings ──────────────────────────────────
    serverUrl: {
      type: DataTypes.STRING(500),
      allowNull: false,
      field: 'server_url',
    },
    baseDn: {
      type: DataTypes.STRING(500),
      allowNull: false,
      field: 'base_dn',
    },
    useSsl: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'use_ssl',
    },
    port: {
      type: DataTypes.INTEGER,
      defaultValue: 636,
    },
    connectionTimeout: {
      type: DataTypes.INTEGER,
      defaultValue: 10,
      field: 'connection_timeout',
    },

    // ── Bind credentials (encrypted) ─────────────────────────
    bindDn: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'bind_dn',
    },
    bindPasswordEncrypted: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'bind_password_encrypted',
    },
    bindPasswordIv: {
      type: DataTypes.STRING(64),
      allowNull: false,
      field: 'bind_password_iv',
    },
    bindPasswordAuthTag: {
      type: DataTypes.STRING(64),
      allowNull: false,
      field: 'bind_password_auth_tag',
    },

    // ── Search settings ──────────────────────────────────────
    userSearchFilter: {
      type: DataTypes.STRING(500),
      defaultValue: '(sAMAccountName={username})',
      field: 'user_search_filter',
    },
    userSearchBase: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'user_search_base',
    },
    groupSearchFilter: {
      type: DataTypes.STRING(500),
      defaultValue: '(objectClass=group)',
      field: 'group_search_filter',
    },
    groupSearchBase: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'group_search_base',
    },

    // ── Attribute mapping ────────────────────────────────────
    emailAttribute: {
      type: DataTypes.STRING(100),
      defaultValue: 'mail',
      field: 'email_attribute',
    },
    displayNameAttribute: {
      type: DataTypes.STRING(100),
      defaultValue: 'displayName',
      field: 'display_name_attribute',
    },
    firstNameAttribute: {
      type: DataTypes.STRING(100),
      defaultValue: 'givenName',
      field: 'first_name_attribute',
    },
    lastNameAttribute: {
      type: DataTypes.STRING(100),
      defaultValue: 'sn',
      field: 'last_name_attribute',
    },
    groupAttribute: {
      type: DataTypes.STRING(100),
      defaultValue: 'memberOf',
      field: 'group_attribute',
    },
    uniqueIdAttribute: {
      type: DataTypes.STRING(100),
      defaultValue: 'objectGUID',
      field: 'unique_id_attribute',
    },

    // ── Behavior ─────────────────────────────────────────────
    autoCreateUsers: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'auto_create_users',
    },
    defaultRole: {
      type: DataTypes.STRING(20),
      defaultValue: 'viewer',
      field: 'default_role',
    },
    syncIntervalMinutes: {
      type: DataTypes.INTEGER,
      defaultValue: 60,
      field: 'sync_interval_minutes',
    },

    // ── Metadata ─────────────────────────────────────────────
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'created_by',
    },
  },
  {
    sequelize,
    modelName: 'AdConfiguration',
    tableName: 'ad_configurations',
    timestamps: true,
    underscored: true,
  }
);

// ── Instance methods — encrypted bind password ──────────────

/**
 * Set the bind password (encrypts before storage).
 * Call this instead of setting bindPasswordEncrypted directly.
 * @param {string} plaintext - The cleartext bind password
 */
AdConfiguration.prototype.setBindPassword = function (plaintext) {
  const { encryptedData, iv, authTag } = encrypt(plaintext);
  this.bindPasswordEncrypted = encryptedData;
  this.bindPasswordIv = iv;
  this.bindPasswordAuthTag = authTag;
};

/**
 * Get the decrypted bind password.
 * @returns {string} The cleartext bind password
 */
AdConfiguration.prototype.getDecryptedBindPassword = function () {
  return decrypt(
    this.bindPasswordEncrypted,
    this.bindPasswordIv,
    this.bindPasswordAuthTag
  );
};

/**
 * Return a safe representation (no encrypted fields).
 */
AdConfiguration.prototype.toSafeJSON = function () {
  const obj = this.toJSON();
  delete obj.bindPasswordEncrypted;
  delete obj.bindPasswordIv;
  delete obj.bindPasswordAuthTag;
  return obj;
};

module.exports = AdConfiguration;
