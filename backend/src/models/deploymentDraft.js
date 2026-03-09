const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * DeploymentDraft Model - Stores saved/staged deployments for review and approval
 */
const DeploymentDraft = sequelize.define(
  'DeploymentDraft',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id',
      },
    },
    credentialId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'credential_id',
      references: {
        model: 'credentials',
        key: 'id',
      },
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    clusterName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'cluster_name',
    },
    cloudProvider: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'cloud_provider',
    },
    configuration: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    estimatedMonthlyCost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'estimated_monthly_cost',
    },
    costBreakdown: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'cost_breakdown',
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'draft',
      validate: {
        isIn: [['draft', 'pending_approval', 'approved', 'rejected', 'deployment_pending', 'deployed']],
      },
    },
    approvedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'approved_by',
      references: {
        model: 'users',
        key: 'id',
      },
    },
    approvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'approved_at',
    },
    approvalComment: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'approval_comment',
    },
    rejectionReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'rejection_reason',
    },
    testResults: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'test_results',
    },
    testedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'tested_at',
    },
    previewResults: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'preview_results',
    },
    previewedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'previewed_at',
    },
    deploymentId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'deployment_id',
      references: {
        model: 'deployments',
        key: 'id',
      },
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: [],
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
    },
  },
  {
    tableName: 'deployment_drafts',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['status'] },
      { fields: ['cloud_provider'] },
      { fields: ['approved_by'] },
      { fields: ['created_at'] },
    ],
  }
);

module.exports = DeploymentDraft;
