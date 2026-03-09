const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * AlertChannelConfig Model
 * Stores encrypted notification channel configurations
 * Supports email (SMTP), Slack webhooks, and custom webhooks
 * 
 * All sensitive data is encrypted using SecureCredentialService:
 * - SMTP password
 * - Slack webhook URL
 * - Custom webhook URL and authentication
 */
const AlertChannelConfig = sequelize.define(
  'AlertChannelConfig',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
        onDelete: 'CASCADE',
      },
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 100],
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // Channel type: 'email', 'slack', or 'webhook'
    channelType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        isIn: [['email', 'slack', 'webhook']],
      },
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },

    /**
     * EMAIL CHANNEL FIELDS
     */
    // SMTP host (stored plaintext - not sensitive)
    smtpHost: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // SMTP port (stored plaintext - not sensitive)
    smtpPort: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 65535,
      },
    },
    // SMTP use TLS/SSL flag (stored plaintext - not sensitive)
    smtpSecure: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: true,
    },
    // SMTP username (stored plaintext - not highly sensitive)
    smtpUser: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // SMTP password - ENCRYPTED
    encryptedSmtpPassword: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Encrypted SMTP password - never log or display in plaintext',
    },
    // Encryption metadata for SMTP password
    smtpPasswordIv: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    smtpPasswordAuthTag: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // Email recipients (comma-separated emails, stored plaintext)
    emailRecipients: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Comma-separated email addresses',
    },
    // Sender email address
    emailFrom: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: true,
      },
    },

    /**
     * SLACK CHANNEL FIELDS
     */
    // Slack webhook URL - ENCRYPTED
    encryptedSlackWebhookUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Encrypted Slack webhook URL - never log or display in plaintext',
    },
    // Encryption metadata for webhook URL
    slackWebhookIv: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    slackWebhookAuthTag: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // Hash of webhook URL for validation without storing plaintext
    slackWebhookHash: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'SHA256 hash of webhook URL for validation',
    },
    // Slack channel name (stored plaintext - not sensitive)
    slackChannel: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    /**
     * CUSTOM WEBHOOK FIELDS
     */
    // Webhook URL - ENCRYPTED
    encryptedWebhookUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Encrypted webhook URL - never log or display in plaintext',
    },
    // Encryption metadata for webhook URL
    webhookUrlIv: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    webhookUrlAuthTag: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // Hash of webhook URL for validation
    webhookUrlHash: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'SHA256 hash of webhook URL for validation',
    },
    // Webhook authentication type: 'none', 'bearer', 'api-key', 'basic'
    webhookAuthType: {
      type: DataTypes.STRING(50),
      defaultValue: 'none',
      allowNull: true,
      validate: {
        isIn: [['none', 'bearer', 'api-key', 'basic']],
      },
    },
    // Webhook authentication token - ENCRYPTED
    encryptedWebhookAuth: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Encrypted webhook authentication token/secret - never log or display in plaintext',
    },
    // Encryption metadata for webhook auth
    webhookAuthIv: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    webhookAuthAuthTag: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // HTTP method for webhook
    webhookMethod: {
      type: DataTypes.STRING(10),
      defaultValue: 'POST',
      allowNull: true,
      validate: {
        isIn: [['GET', 'POST', 'PUT', 'PATCH']],
      },
    },

    /**
     * TESTING & VALIDATION
     */
    // Last test timestamp
    lastTestedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // Test result: 'success' or error message
    lastTestResult: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // Number of failed delivery attempts
    failureCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    // Last failure timestamp
    lastFailureAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    /**
     * METADATA
     */
    // Custom tags for organization
    tags: {
      type: DataTypes.JSONB,
      defaultValue: [],
      allowNull: true,
    },
    // Additional metadata (non-sensitive)
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
      allowNull: true,
    },
    // Flag if this is a test configuration
    isTest: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    sequelize,
    modelName: 'AlertChannelConfig',
    tableName: 'alert_channel_configs',
    timestamps: true,
    underscored: true,
    paranoid: true, // Soft delete support
    indexes: [
      {
        fields: ['user_id'],
      },
      {
        fields: ['channel_type'],
      },
      {
        fields: ['enabled'],
      },
      {
        fields: ['user_id', 'channel_type'],
      },
      {
        fields: ['is_test'],
      },
    ],
  }
);

/**
 * Static Methods for secure operations
 */

/**
 * Create channel config with encrypted credentials
 */
AlertChannelConfig.createSecure = async function (userData, channelData, secureService) {
  const { encryptedSmtpPassword, smtpPasswordIv, smtpPasswordAuthTag } = channelData;
  
  // Encrypt credentials if provided
  let encryptedData = {};

  if (channelData.channelType === 'email' && channelData.smtpPassword) {
    const encrypted = secureService.encryptSmtpCredentials({
      host: channelData.smtpHost,
      port: channelData.smtpPort,
      user: channelData.smtpUser,
      pass: channelData.smtpPassword,
      secure: channelData.smtpSecure,
    });

    encryptedData = {
      ...encryptedData,
      encryptedSmtpPassword: encrypted.encryptedConfig,
      smtpPasswordIv: encrypted.iv,
      smtpPasswordAuthTag: encrypted.authTag,
      smtpUser: encrypted.user,
    };
  }

  if (channelData.channelType === 'slack' && channelData.slackWebhookUrl) {
    const encrypted = secureService.encryptSlackWebhook(channelData.slackWebhookUrl);

    encryptedData = {
      ...encryptedData,
      encryptedSlackWebhookUrl: encrypted.encryptedUrl,
      slackWebhookIv: encrypted.iv,
      slackWebhookAuthTag: encrypted.authTag,
      slackWebhookHash: encrypted.urlHash,
    };
  }

  if (channelData.channelType === 'webhook' && channelData.webhookUrl) {
    const encrypted = secureService.encryptWebhookCredentials(
      channelData.webhookUrl,
      channelData.webhookAuth
    );

    encryptedData = {
      ...encryptedData,
      encryptedWebhookUrl: encrypted.encryptedUrl,
      webhookUrlIv: encrypted.iv,
      webhookUrlAuthTag: encrypted.authTag,
      webhookUrlHash: encrypted.urlHash,
      webhookAuthType: channelData.webhookAuthType || 'none',
    };

    if (channelData.webhookAuth?.token) {
      const authEncrypted = secureService.encryptToken(
        channelData.webhookAuth.token,
        `webhook-auth:${channelData.webhookAuthType}`
      );

      encryptedData = {
        ...encryptedData,
        encryptedWebhookAuth: authEncrypted.encryptedToken,
        webhookAuthIv: authEncrypted.iv,
        webhookAuthAuthTag: authEncrypted.authTag,
      };
    }
  }

  return this.create({
    userId: userData.id,
    name: channelData.name,
    description: channelData.description,
    channelType: channelData.channelType,
    enabled: channelData.enabled !== false,
    ...encryptedData,
    emailRecipients: channelData.emailRecipients,
    emailFrom: channelData.emailFrom,
    slackChannel: channelData.slackChannel,
    webhookMethod: channelData.webhookMethod,
    tags: channelData.tags,
    metadata: channelData.metadata,
    isTest: channelData.isTest || false,
  });
};

/**
 * Find and decrypt channel config
 */
AlertChannelConfig.findByIdSecure = async function (configId, secureService) {
  const config = await this.findByPk(configId);
  if (!config) return null;

  return this._decryptConfig(config, secureService);
};

/**
 * Decrypt sensitive fields in config
 * @private
 */
AlertChannelConfig._decryptConfig = function (config, secureService) {
  const decrypted = config.toJSON();

  if (config.channelType === 'email' && config.encryptedSmtpPassword) {
    try {
      const smtpCreds = secureService.decryptSmtpCredentials({
        encryptedConfig: config.encryptedSmtpPassword,
        iv: config.smtpPasswordIv,
        authTag: config.smtpPasswordAuthTag,
      });

      decrypted.smtpPassword = smtpCreds.pass;
    } catch (error) {
      decrypted.smtpPasswordDecryptError = 'Failed to decrypt SMTP password';
    }
  }

  if (config.channelType === 'slack' && config.encryptedSlackWebhookUrl) {
    try {
      const webhook = secureService.decryptSlackWebhook({
        encryptedUrl: config.encryptedSlackWebhookUrl,
        iv: config.slackWebhookIv,
        authTag: config.slackWebhookAuthTag,
      });

      decrypted.slackWebhookUrl = webhook;
    } catch (error) {
      decrypted.slackWebhookUrlDecryptError = 'Failed to decrypt webhook URL';
    }
  }

  if (config.channelType === 'webhook' && config.encryptedWebhookUrl) {
    try {
      const webhook = secureService.decryptWebhookCredentials({
        encryptedUrl: config.encryptedWebhookUrl,
        iv: config.webhookUrlIv,
        authTag: config.webhookUrlAuthTag,
      });

      decrypted.webhookUrl = webhook.url;
      decrypted.webhookAuth = webhook.auth;
    } catch (error) {
      decrypted.webhookUrlDecryptError = 'Failed to decrypt webhook URL';
    }
  }

  return decrypted;
};

/**
 * Get config safely (decrypted but not exposed plaintext fields to API response)
 * @param {UUID} configId - Config ID
 * @param {object} secureService - SecureCredentialService instance
 * @returns {object} - Config with password/URL fields removed from plain JSON
 */
AlertChannelConfig.findSafe = async function (configId, secureService) {
  const config = await this.findByPk(configId);
  if (!config) return null;

  const safe = config.toJSON();

  // Remove all encrypted fields from API response
  // These will only be used server-side for actual sending
  delete safe.encryptedSmtpPassword;
  delete safe.smtpPasswordIv;
  delete safe.smtpPasswordAuthTag;
  delete safe.encryptedSlackWebhookUrl;
  delete safe.slackWebhookIv;
  delete safe.slackWebhookAuthTag;
  delete safe.encryptedWebhookUrl;
  delete safe.webhookUrlIv;
  delete safe.webhookUrlAuthTag;
  delete safe.encryptedWebhookAuth;
  delete safe.webhookAuthIv;
  delete safe.webhookAuthAuthTag;

  // Remove plaintext passwords if somehow stored
  delete safe.smtpPassword;

  // Add indicators instead
  safe.hasEncryptedConfig = {
    email: Boolean(safe.encryptedSmtpPassword),
    slack: Boolean(safe.encryptedSlackWebhookUrl),
    webhook: Boolean(safe.encryptedWebhookUrl),
  };

  safe.credentialsConfigured = safe.channelType === 'email'
    ? Boolean(safe.encryptedSmtpPassword)
    : safe.channelType === 'slack'
      ? Boolean(safe.encryptedSlackWebhookUrl)
      : Boolean(safe.encryptedWebhookUrl);

  return safe;
};

module.exports = AlertChannelConfig;
