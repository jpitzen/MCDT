const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Credential = sequelize.define(
  'Credential',
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
      },
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [3, 100],
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // Cloud provider type (aws, azure, gcp, digitalocean, linode)
    cloudProvider: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['aws', 'azure', 'gcp', 'digitalocean', 'linode']],
      },
    },
    // Vault type where secret is stored (aws-secrets, azure-kv, gcp-secrets, hashicorp-vault)
    vaultType: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['aws-secrets', 'azure-kv', 'gcp-secrets', 'hashicorp-vault']],
      },
    },
    // Reference ID to secret in cloud vault (e.g., arn in AWS, vault path in Hashicorp)
    secretRefId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    // Cloud-specific account/subscription ID
    cloudAccountId: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 100],
      },
    },
    // Primary region for the cloud provider
    cloudRegion: {
      type: DataTypes.STRING,
      defaultValue: 'us-east-1',
      allowNull: false,
    },
    // For backward compatibility with AWS-only credentials
    awsAccountId: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: [12, 12],
        isNumeric: true,
      },
    },
    awsRegion: {
      type: DataTypes.STRING,
      defaultValue: 'us-east-1',
      allowNull: true,
    },
    // Legacy encrypted fields (deprecated, kept for migration)
    encryptedAccessKeyId: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    encryptedSecretAccessKey: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // IV (Initialization Vector) for decryption - legacy
    encryptionIv: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // Auth tag for GCM mode encryption - legacy
    authTag: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // Multi-cloud encrypted credential data (new format)
    encryptedCredentialData: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Encrypted JSON containing provider-specific credential data',
    },
    // IV for multi-cloud credential encryption
    credentialDataIv: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Initialization vector for credential data encryption',
    },
    // Auth tag for multi-cloud credential encryption
    credentialDataAuthTag: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Authentication tag for credential data encryption',
    },
    // Additional regions for multi-region support
    additionalRegions: {
      type: DataTypes.JSONB,
      defaultValue: [],
      allowNull: true,
      comment: 'Additional regions for multi-region operations',
    },
    // Validation status
    isValid: {
      type: DataTypes.BOOLEAN,
      defaultValue: null,
    },
    lastValidatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    validationError: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // Rotation tracking
    lastRotatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    rotationScheduledAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // Metadata
    tags: {
      type: DataTypes.JSONB,
      defaultValue: [],
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    sequelize,
    modelName: 'Credential',
    tableName: 'credentials',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['user_id'],
      },
      {
        fields: ['cloud_provider'],
      },
      {
        fields: ['vault_type'],
      },
      {
        fields: ['secret_ref_id'],
      },
      {
        fields: ['aws_account_id'],
      },
      {
        fields: ['is_active'],
      },
    ],
  }
);

module.exports = Credential;
