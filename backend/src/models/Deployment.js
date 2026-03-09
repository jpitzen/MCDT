const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Deployment = sequelize.define(
  'Deployment',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    credentialId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'credentials',
        key: 'id',
      },
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    // Cloud provider for this deployment
    cloudProvider: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['aws', 'azure', 'gcp', 'digitalocean', 'linode', 'local']],
      },
    },
    clusterName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 100],
      },
    },
    clusterArn: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // Deployment status: pending, running, paused, completed, failed, rolled_back, pending_destruction, destroying, destroyed, destroy_failed
    status: {
      type: DataTypes.ENUM(
        'pending', 
        'running', 
        'paused', 
        'completed', 
        'failed', 
        'rolled_back',
        'pending_destruction',  // Awaiting destruction confirmation
        'destroying',           // Terraform destroy in progress
        'destroyed',            // Successfully destroyed
        'destroy_failed'        // Destruction failed
      ),
      defaultValue: 'pending',
      allowNull: false,
    },
    // Destruction tracking
    destructionRequestedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When destruction was requested',
    },
    destructionConfirmedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When destruction was confirmed by user',
    },
    destroyedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When destruction completed',
    },
    // Progress tracking (0-100)
    progress: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100,
      },
    },
    // Current phase (1-11)
    currentPhase: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 11,
      },
    },
    // Configuration used for deployment
    configuration: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    // Access mode: internal (ClusterIP) or external (LoadBalancer + SSL + DNS)
    accessMode: {
      type: DataTypes.STRING(10),
      defaultValue: 'internal',
      validate: {
        isIn: [['internal', 'external']],
      },
      comment: 'Access mode: internal (cluster only) or external (public LB)',
    },
    externalDomain: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'FQDN for external access (when access_mode = external)',
    },
    sslMode: {
      type: DataTypes.STRING(10),
      allowNull: true,
      validate: {
        isIn: [['acm', 'upload']],
      },
      comment: 'SSL certificate source: acm (AWS Certificate Manager) or upload',
    },
    sslCertArn: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'ACM certificate ARN (when ssl_mode = acm)',
    },
    // Deployment parameters
    parameters: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
    },
    // Results and outputs
    results: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
    },
    // Error information if failed
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    errorStack: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // Timestamps for tracking
    startedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    pausedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    estimatedDuration: {
      type: DataTypes.INTEGER, // in seconds
      allowNull: true,
    },
    // Rollback tracking
    rolledBackAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    rolledBackReason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // Terraform-specific fields
    terraformWorkingDir: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Terraform working directory path for this deployment',
    },
    terraformState: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: 'Parsed Terraform state file',
    },
    terraformOutputs: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: 'Terraform output values (cluster endpoint, kubeconfig, etc)',
    },
    deploymentPhase: {
      type: DataTypes.ENUM(
        'created',
        'terraform-init',
        'terraform-validate',
        'terraform-plan',
        'terraform-plan-preview',  // Preview plan before apply
        'terraform-apply',
        'terraform-destroy',
        'cluster-ready',
        'monitoring-setup',
        'database-setup',
        'database-init',           // Database initialization
        'database-ready',          // Database ready
        'zl-application-deploy',   // ZL application manifest deployment
        'zl-zk-quorum',            // ZooKeeper quorum establishment
        'zl-app-verify',           // ZL application verification
        'post-deploy',             // Post-deployment tasks (vault, DB paths, model upload)
        'completed',
        'rollback-started',
        'rollback-complete',
        'destruction-pending',     // Awaiting destruction confirmation
        'destruction-started',     // Destruction in progress
        'destruction-complete',    // Destruction finished
        'failed'
      ),
      defaultValue: 'created',
      allowNull: false,
      comment: 'Current phase of deployment lifecycle',
    },
    terraformVersion: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Version of Terraform used for deployment',
    },
    // Deployment logs (array of log entries)
    deploymentLogs: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: 'Array of deployment event logs',
    },
    // Metrics data for analytics and performance tracking
    metricsData: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: 'Deployment metrics and performance data',
    },
    // Metadata
    tags: {
      type: DataTypes.JSONB,
      defaultValue: [],
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'Deployment',
    tableName: 'deployments',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['credential_id'],
      },
      {
        fields: ['user_id'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['deployment_phase'],
      },
      {
        fields: ['created_at'],
      },
    ],
  }
);

module.exports = Deployment;
