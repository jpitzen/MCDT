const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * ContainerDeployment Model
 * Tracks container image builds, registry pushes, and K8s deployments
 */
const ContainerDeployment = sequelize.define('ContainerDeployment', {
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
  credentialId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'credentials',
      key: 'id',
    },
  },
  deploymentId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'deployments',
      key: 'id',
    },
    comment: 'Reference to the K8s cluster deployment this container will deploy to',
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM(
      'pending',
      'building',
      'built',
      'pushing',
      'pushed',
      'deploying',
      'deployed',
      'failed',
      'rolled_back'
    ),
    defaultValue: 'pending',
  },
  currentPhase: {
    type: DataTypes.ENUM(
      'init',
      'build',
      'tag',
      'push',
      'deploy',
      'verify',
      'completed',
      'failed'
    ),
    defaultValue: 'init',
  },

  // Source configuration
  sourceType: {
    type: DataTypes.ENUM('dockerfile', 'docker-compose', 'local-image', 'git-repo'),
    allowNull: false,
    defaultValue: 'dockerfile',
  },
  dockerfilePath: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Path to Dockerfile or docker-compose.yml',
  },
  buildContext: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Docker build context path',
  },
  gitRepoUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  gitBranch: {
    type: DataTypes.STRING(100),
    defaultValue: 'main',
  },

  // Image configuration
  imageName: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  imageTag: {
    type: DataTypes.STRING(100),
    defaultValue: 'latest',
  },
  localImageId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Local Docker image ID after build',
  },

  // Deployment target - local only or push to registry
  deploymentTarget: {
    type: DataTypes.ENUM('local', 'registry'),
    defaultValue: 'local',
    comment: 'Whether to keep image local or push to a registry',
  },

  // Registry configuration (only used when deploymentTarget is 'registry')
  registryType: {
    type: DataTypes.ENUM('ecr', 'acr', 'gcr', 'docker-hub', 'private', 'local'),
    allowNull: true,
    defaultValue: 'local',
  },
  registryUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Full registry URL (e.g., 123456789.dkr.ecr.us-east-1.amazonaws.com)',
  },
  repositoryName: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Repository name within the registry',
  },
  registryRegion: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  pushedImageUri: {
    type: DataTypes.STRING(1000),
    allowNull: true,
    comment: 'Full URI of pushed image including tag',
  },

  // Kubernetes deployment configuration
  k8sNamespace: {
    type: DataTypes.STRING(100),
    defaultValue: 'default',
  },
  k8sDeploymentName: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  k8sServiceName: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  k8sServiceType: {
    type: DataTypes.ENUM('ClusterIP', 'NodePort', 'LoadBalancer'),
    defaultValue: 'ClusterIP',
  },
  k8sReplicas: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
  k8sContainerPort: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  k8sServicePort: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  k8sResourceRequests: {
    type: DataTypes.JSONB,
    defaultValue: {
      cpu: '100m',
      memory: '128Mi',
    },
  },
  k8sResourceLimits: {
    type: DataTypes.JSONB,
    defaultValue: {
      cpu: '500m',
      memory: '512Mi',
    },
  },
  k8sEnvironmentVars: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Array of {name, value} or {name, valueFrom}',
  },
  k8sConfigMaps: {
    type: DataTypes.JSONB,
    defaultValue: [],
  },
  k8sSecrets: {
    type: DataTypes.JSONB,
    defaultValue: [],
  },
  k8sHealthCheck: {
    type: DataTypes.JSONB,
    defaultValue: {
      enabled: false,
      path: '/health',
      port: 8080,
      initialDelaySeconds: 30,
      periodSeconds: 10,
    },
  },

  // Build options
  buildArgs: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Docker build arguments',
  },
  buildPlatform: {
    type: DataTypes.STRING(50),
    defaultValue: 'linux/amd64',
  },
  noCache: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },

  // Progress tracking
  progress: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100,
    },
  },
  logs: {
    type: DataTypes.JSONB,
    defaultValue: [],
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  // Timestamps
  buildStartedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  buildCompletedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  pushStartedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  pushCompletedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  deployStartedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  deployCompletedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },

  // Metrics
  metricsData: {
    type: DataTypes.JSONB,
    defaultValue: {},
  },

  // Rollback support
  previousImageUri: {
    type: DataTypes.STRING(1000),
    allowNull: true,
  },
  rollbackAvailable: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'container_deployments',
  timestamps: true,
  paranoid: true,
  indexes: [
    { fields: ['userId'] },
    { fields: ['credentialId'] },
    { fields: ['deploymentId'] },
    { fields: ['status'] },
    { fields: ['registryType'] },
    { fields: ['imageName'] },
    { fields: ['createdAt'] },
  ],
});

module.exports = ContainerDeployment;
