'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('container_deployments', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        field: 'userId',
      },
      credentialId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'credentials',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        field: 'credentialId',
      },
      deploymentId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'deployments',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        field: 'deploymentId',
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM(
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
        type: Sequelize.ENUM(
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
        field: 'currentPhase',
      },
      sourceType: {
        type: Sequelize.ENUM('dockerfile', 'docker-compose', 'local-image', 'git-repo'),
        allowNull: false,
        defaultValue: 'dockerfile',
        field: 'sourceType',
      },
      dockerfilePath: {
        type: Sequelize.STRING(500),
        allowNull: true,
        field: 'dockerfilePath',
      },
      buildContext: {
        type: Sequelize.STRING(500),
        allowNull: true,
        field: 'buildContext',
      },
      gitRepoUrl: {
        type: Sequelize.STRING(500),
        allowNull: true,
        field: 'gitRepoUrl',
      },
      gitBranch: {
        type: Sequelize.STRING(100),
        defaultValue: 'main',
        field: 'gitBranch',
      },
      imageName: {
        type: Sequelize.STRING(255),
        allowNull: false,
        field: 'imageName',
      },
      imageTag: {
        type: Sequelize.STRING(100),
        defaultValue: 'latest',
        field: 'imageTag',
      },
      localImageId: {
        type: Sequelize.STRING(100),
        allowNull: true,
        field: 'localImageId',
      },
      deploymentTarget: {
        type: Sequelize.ENUM('local', 'registry'),
        defaultValue: 'local',
        field: 'deploymentTarget',
      },
      registryType: {
        type: Sequelize.ENUM('ecr', 'acr', 'gcr', 'docker-hub', 'private', 'local'),
        allowNull: true,
        defaultValue: 'local',
        field: 'registryType',
      },
      registryUrl: {
        type: Sequelize.STRING(500),
        allowNull: true,
        field: 'registryUrl',
      },
      repositoryName: {
        type: Sequelize.STRING(255),
        allowNull: true,
        field: 'repositoryName',
      },
      registryRegion: {
        type: Sequelize.STRING(50),
        allowNull: true,
        field: 'registryRegion',
      },
      pushedImageUri: {
        type: Sequelize.STRING(1000),
        allowNull: true,
        field: 'pushedImageUri',
      },
      k8sNamespace: {
        type: Sequelize.STRING(100),
        defaultValue: 'default',
        field: 'k8sNamespace',
      },
      k8sDeploymentName: {
        type: Sequelize.STRING(100),
        allowNull: true,
        field: 'k8sDeploymentName',
      },
      k8sServiceName: {
        type: Sequelize.STRING(100),
        allowNull: true,
        field: 'k8sServiceName',
      },
      k8sServiceType: {
        type: Sequelize.ENUM('ClusterIP', 'NodePort', 'LoadBalancer'),
        defaultValue: 'ClusterIP',
        field: 'k8sServiceType',
      },
      k8sReplicas: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
        field: 'k8sReplicas',
      },
      k8sContainerPort: {
        type: Sequelize.INTEGER,
        allowNull: true,
        field: 'k8sContainerPort',
      },
      k8sServicePort: {
        type: Sequelize.INTEGER,
        allowNull: true,
        field: 'k8sServicePort',
      },
      k8sResourceRequests: {
        type: Sequelize.JSONB,
        defaultValue: { cpu: '100m', memory: '128Mi' },
        field: 'k8sResourceRequests',
      },
      k8sResourceLimits: {
        type: Sequelize.JSONB,
        defaultValue: { cpu: '500m', memory: '512Mi' },
        field: 'k8sResourceLimits',
      },
      k8sEnvironmentVars: {
        type: Sequelize.JSONB,
        defaultValue: [],
        field: 'k8sEnvironmentVars',
      },
      k8sConfigMaps: {
        type: Sequelize.JSONB,
        defaultValue: [],
        field: 'k8sConfigMaps',
      },
      k8sSecrets: {
        type: Sequelize.JSONB,
        defaultValue: [],
        field: 'k8sSecrets',
      },
      k8sHealthCheck: {
        type: Sequelize.JSONB,
        defaultValue: {
          enabled: false,
          path: '/health',
          port: 8080,
          initialDelaySeconds: 30,
          periodSeconds: 10,
        },
        field: 'k8sHealthCheck',
      },
      buildArgs: {
        type: Sequelize.JSONB,
        defaultValue: {},
        field: 'buildArgs',
      },
      buildPlatform: {
        type: Sequelize.STRING(50),
        defaultValue: 'linux/amd64',
        field: 'buildPlatform',
      },
      noCache: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        field: 'noCache',
      },
      progress: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      logs: {
        type: Sequelize.JSONB,
        defaultValue: [],
      },
      errorMessage: {
        type: Sequelize.TEXT,
        allowNull: true,
        field: 'errorMessage',
      },
      buildStartedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'buildStartedAt',
      },
      buildCompletedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'buildCompletedAt',
      },
      pushStartedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'pushStartedAt',
      },
      pushCompletedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'pushCompletedAt',
      },
      deployStartedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'deployStartedAt',
      },
      deployCompletedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'deployCompletedAt',
      },
      metricsData: {
        type: Sequelize.JSONB,
        defaultValue: {},
        field: 'metricsData',
      },
      previousImageUri: {
        type: Sequelize.STRING(1000),
        allowNull: true,
        field: 'previousImageUri',
      },
      rollbackAvailable: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        field: 'rollbackAvailable',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    // Create indexes
    await queryInterface.addIndex('container_deployments', ['userId']);
    await queryInterface.addIndex('container_deployments', ['credentialId']);
    await queryInterface.addIndex('container_deployments', ['deploymentId']);
    await queryInterface.addIndex('container_deployments', ['status']);
    await queryInterface.addIndex('container_deployments', ['registryType']);
    await queryInterface.addIndex('container_deployments', ['imageName']);
    await queryInterface.addIndex('container_deployments', ['createdAt']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('container_deployments');
  },
};
