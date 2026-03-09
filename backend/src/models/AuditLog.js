const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AuditLog = sequelize.define(
  'AuditLog',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
        onDelete: 'SET NULL',
      },
    },
    action: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 100],
      },
    },
    resourceType: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 50],
      },
    },
    resourceId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    resourceName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // Status of the action: success, failure, pending
    actionStatus: {
      type: DataTypes.ENUM('success', 'failure', 'pending'),
      defaultValue: 'pending',
    },
    // Details about what changed
    changes: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
    },
    // Error details if action failed
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // Request metadata
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    userAgent: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    requestPath: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    requestMethod: {
      type: DataTypes.ENUM('GET', 'POST', 'PUT', 'DELETE', 'PATCH'),
      allowNull: true,
    },
    // Additional context
    context: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
    },
  },
  {
    sequelize,
    modelName: 'AuditLog',
    tableName: 'audit_logs',
    timestamps: true,
    underscored: true,
    paranoid: false, // Don't use soft deletes for audit logs
    indexes: [
      {
        fields: ['user_id'],
      },
      {
        fields: ['action'],
      },
      {
        fields: ['resource_type'],
      },
      {
        fields: ['action_status'],
      },
      {
        fields: ['created_at'],
      },
    ],
  }
);

module.exports = AuditLog;
