const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * DatabaseCredential Model
 * Stores database-specific authentication credentials (username/password)
 * These are separate from cloud provider credentials (AWS/Azure/GCP)
 * and are used to actually connect and query databases
 */
const DatabaseCredential = sequelize.define(
  'DatabaseCredential',
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
    // Human-readable name for the credential
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
    // What this credential connects to
    // 'deployment' - RDS from our deployment
    // 'cloud' - Discovered RDS from cloud account
    // 'external' - Manually added external database
    sourceType: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['deployment', 'cloud', 'external']],
      },
    },
    // Reference to the source
    // For deployment: deployment ID
    // For cloud: credential ID (cloud provider credential)
    sourceId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    // Database engine type
    engine: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['postgres', 'mysql', 'mariadb', 'sqlserver', 'mssql', 'oracle']],
      },
    },
    // Connection details
    host: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    port: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 5432,
    },
    databaseName: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'postgres',
    },
    // Encrypted credentials
    encryptedUsername: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    encryptedPassword: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    encryptionIv: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    authTag: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    // Optional SSL configuration
    sslEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    sslMode: {
      type: DataTypes.STRING,
      defaultValue: 'require',
      validate: {
        isIn: [['disable', 'allow', 'prefer', 'require', 'verify-ca', 'verify-full']],
      },
    },
    // RDS-specific: ARN of Secrets Manager secret if using AWS Secrets Manager
    awsSecretsArn: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // RDS identifier for cloud-discovered databases
    rdsInstanceId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // Connection validation
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
    modelName: 'DatabaseCredential',
    tableName: 'database_credentials',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['user_id'],
      },
      {
        fields: ['source_type'],
      },
      {
        fields: ['source_id'],
      },
      {
        fields: ['engine'],
      },
      {
        fields: ['host'],
      },
      {
        fields: ['is_active'],
      },
      {
        // Unique constraint: one credential per host/port/database/user combination
        unique: true,
        fields: ['user_id', 'host', 'port', 'database_name'],
        name: 'unique_db_credential_per_user',
      },
    ],
  }
);

module.exports = DatabaseCredential;
