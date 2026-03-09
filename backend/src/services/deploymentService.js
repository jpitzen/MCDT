const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const logger = require('./logger');
const { Deployment, Credential } = require('../models');
const websocketEmissionService = require('./websocketEmissionService');

const execPromise = promisify(exec);

/**
 * DeploymentService - Manages multi-cloud deployment orchestration
 */
class DeploymentService {
  constructor() {
    this.scriptsPath = path.join(__dirname, '../../scripts');
    this.maxPhases = 11;
    this.phaseTimeout = 3600000; // 1 hour per phase

    /**
     * Named lifecycle phases for ZL application deployments.
     * Phases 1-11 are the existing Terraform infrastructure phases.
     * The zl-application-deploy phase runs after cluster-ready.
     */
    this.phaseNames = {
      'terraform-init': 1,
      'terraform-validate': 2,
      'terraform-plan': 3,
      'terraform-apply': 4,
      'cluster-ready': 5,
      'database-init': 6,
      'zl-application-deploy': 7,
      'zl-zk-quorum': 8,
      'zl-app-verify': 9,
      'post-deploy': 10,
      'monitoring-setup': 11,
      'completed': 12,
    };
  }

  /**
   * Create a new deployment
   * @param {object} params - { credentialId, userId, clusterName, cloudProvider, configuration, accessMode?, externalDomain?, sslMode?, sslCertArn? }
   * @param {object} transaction - Optional Sequelize transaction
   * @returns {object} - Created deployment
   */
  async createDeployment(params, transaction = null) {
    try {
      const deployment = await Deployment.create({
        credentialId: params.credentialId,
        userId: params.userId,
        clusterName: params.clusterName,
        cloudProvider: params.cloudProvider,
        configuration: params.configuration || {},
        parameters: params.parameters || {},
        accessMode: params.accessMode || 'internal',
        externalDomain: params.externalDomain || null,
        sslMode: params.sslMode || null,
        sslCertArn: params.sslCertArn || null,
        status: 'pending',
        currentPhase: 0,
        progress: 0,
        estimatedDuration: 3600, // 1 hour default
      }, transaction ? { transaction } : {});

      logger.deployment(deployment.id, 0, 'Deployment created', {
        clusterName: deployment.clusterName,
      });

      return deployment;
    } catch (error) {
      logger.error('Failed to create deployment', error);
      throw error;
    }
  }

  /**
   * Start deployment execution
   * @param {string} deploymentId - Deployment ID
   * @returns {object} - Updated deployment
   */
  async startDeployment(deploymentId) {
    try {
      const deployment = await Deployment.findByPk(deploymentId);

      if (!deployment) {
        throw new Error('Deployment not found');
      }

      if (deployment.status !== 'pending') {
        throw new Error(`Cannot start deployment with status: ${deployment.status}`);
      }

      // Update deployment status
      deployment.status = 'running';
      deployment.startedAt = new Date();
      deployment.currentPhase = 1;
      
      // Initialize metrics data
      deployment.metricsData = {
        startTime: deployment.startedAt,
        phaseMetrics: {},
      };
      
      await deployment.save();

      logger.deployment(deploymentId, 1, 'Deployment started');

      // Execute orchestrator asynchronously
      this.executeOrchestrator(deploymentId).catch((error) => {
        logger.error(`Orchestrator failed for deployment ${deploymentId}`, error);
      });

      return deployment;
    } catch (error) {
      logger.error('Failed to start deployment', error);
      throw error;
    }
  }

  /**
   * Execute the master orchestration script
   * @param {string} deploymentId - Deployment ID
   */
  async executeOrchestrator(deploymentId) {
    try {
      const deployment = await Deployment.findByPk(deploymentId, {
        include: ['credential'],
      });

      if (!deployment) {
        throw new Error('Deployment not found');
      }

      const orchestratorScript = path.join(this.scriptsPath, 'deploy-orchestrator.sh');
      // Convert Windows path to Unix-style for bash
      const bashScriptPath = orchestratorScript.replace(/\\/g, '/');

      // Environment variables for the orchestrator
      // Provide the region under a generic key; keep AWS_REGION for legacy scripts
      const region = deployment.region
        || (deployment.credential && (deployment.credential.awsRegion || deployment.credential.region))
        || '';
      const env = {
        ...process.env,
        DEPLOYMENT_ID: deploymentId,
        CLUSTER_NAME: deployment.clusterName,
        CLOUD_PROVIDER: deployment.cloud_provider || 'aws',
        DEPLOY_REGION: region,
        AWS_REGION: region, // legacy compatibility
      };

      // Execute orchestrator
      const { stdout, stderr } = await execPromise(
        `bash "${bashScriptPath}"`,
        {
          env,
          timeout: this.phaseTimeout * this.maxPhases,
        }
      );

      // Parse orchestrator output
      const result = {
        stdout,
        stderr,
        success: true,
      };

      deployment.status = 'completed';
      deployment.completedAt = new Date();
      deployment.progress = 100;
      deployment.currentPhase = this.maxPhases;
      deployment.results = result;
      await deployment.save();

      logger.deployment(deploymentId, this.maxPhases, 'Deployment completed successfully');
    } catch (error) {
      logger.error(`Orchestrator execution failed for ${deploymentId}`, error);

      // Mark deployment as failed
      try {
        const deployment = await Deployment.findByPk(deploymentId);
        if (deployment) {
          deployment.status = 'failed';
          deployment.errorMessage = error.message;
          deployment.errorStack = error.stack;
          await deployment.save();

          logger.deployment(deploymentId, deployment.currentPhase, 'Deployment failed', {
            error: error.message,
          });
        }
      } catch (updateError) {
        logger.error('Failed to update deployment status', updateError);
      }
    }
  }

  /**
   * Get deployment status
   * @param {string} deploymentId - Deployment ID
   * @returns {object} - Deployment object
   */
  async getDeploymentStatus(deploymentId) {
    try {
      const deployment = await Deployment.findByPk(deploymentId);

      if (!deployment) {
        throw new Error('Deployment not found');
      }

      return deployment;
    } catch (error) {
      logger.error('Failed to get deployment status', error);
      throw error;
    }
  }

  /**
   * Pause deployment
   * @param {string} deploymentId - Deployment ID
   * @returns {object} - Updated deployment
   */
  async pauseDeployment(deploymentId) {
    try {
      const deployment = await Deployment.findByPk(deploymentId);

      if (!deployment) {
        throw new Error('Deployment not found');
      }

      if (deployment.status !== 'running') {
        throw new Error(`Cannot pause deployment with status: ${deployment.status}`);
      }

      deployment.status = 'paused';
      deployment.pausedAt = new Date();
      await deployment.save();

      logger.deployment(deploymentId, deployment.currentPhase, 'Deployment paused');

      return deployment;
    } catch (error) {
      logger.error('Failed to pause deployment', error);
      throw error;
    }
  }

  /**
   * Resume deployment
   * @param {string} deploymentId - Deployment ID
   * @returns {object} - Updated deployment
   */
  async resumeDeployment(deploymentId) {
    try {
      const deployment = await Deployment.findByPk(deploymentId);

      if (!deployment) {
        throw new Error('Deployment not found');
      }

      if (deployment.status !== 'paused') {
        throw new Error(`Cannot resume deployment with status: ${deployment.status}`);
      }

      deployment.status = 'running';
      deployment.pausedAt = null;
      await deployment.save();

      logger.deployment(deploymentId, deployment.currentPhase, 'Deployment resumed');

      return deployment;
    } catch (error) {
      logger.error('Failed to resume deployment', error);
      throw error;
    }
  }

  /**
   * Rollback deployment
   * @param {string} deploymentId - Deployment ID
   * @param {string} reason - Reason for rollback
   * @returns {object} - Updated deployment
   */
  async rollbackDeployment(deploymentId, reason = 'Manual rollback') {
    try {
      const deployment = await Deployment.findByPk(deploymentId);

      if (!deployment) {
        throw new Error('Deployment not found');
      }

      deployment.status = 'rolled_back';
      deployment.rolledBackAt = new Date();
      deployment.rolledBackReason = reason;
      await deployment.save();

      logger.deployment(deploymentId, deployment.currentPhase, 'Deployment rolled back', {
        reason,
      });

      // Emit WebSocket rollback event
      try {
        websocketEmissionService.emitRollbackCompleted(deploymentId, reason);
      } catch (wsError) {
        logger.warn('Failed to emit WebSocket rollback event', { deploymentId, error: wsError.message });
      }

      return deployment;
    } catch (error) {
      logger.error('Failed to rollback deployment', error);
      throw error;
    }
  }

  /**
   * Cancel deployment
   * @param {string} deploymentId - Deployment ID
   * @returns {object} - Updated deployment
   */
  async cancelDeployment(deploymentId) {
    try {
      const deployment = await Deployment.findByPk(deploymentId);

      if (!deployment) {
        throw new Error('Deployment not found');
      }

      if (!['pending', 'running', 'paused'].includes(deployment.status)) {
        throw new Error(`Cannot cancel deployment with status: ${deployment.status}`);
      }

      deployment.status = 'failed';
      deployment.errorMessage = 'Deployment cancelled by user';
      deployment.completedAt = new Date();
      await deployment.save();

      logger.deployment(deploymentId, deployment.currentPhase, 'Deployment cancelled');

      // Emit WebSocket cancellation event
      try {
        websocketEmissionService.emitDeploymentFailure(deploymentId, 'Deployment cancelled by user', {
          cancelledManually: true,
        });
      } catch (wsError) {
        logger.warn('Failed to emit WebSocket cancellation event', { deploymentId, error: wsError.message });
      }

      return deployment;
    } catch (error) {
      logger.error('Failed to cancel deployment', error);
      throw error;
    }
  }

  /**
   * List deployments with filtering
   * @param {object} filters - { status, userId, credentialId, limit, offset }
   * @returns {object} - { deployments, total }
   */
  async listDeployments(filters = {}) {
    try {
      const where = {};

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.userId) {
        where.userId = filters.userId;
      }

      if (filters.credentialId) {
        where.credentialId = filters.credentialId;
      }

      const { count, rows } = await Deployment.findAndCountAll({
        where,
        limit: filters.limit || 20,
        offset: filters.offset || 0,
        order: [['createdAt', 'DESC']],
        include: ['credential', 'user'],
      });

      return {
        deployments: rows,
        total: count,
      };
    } catch (error) {
      logger.error('Failed to list deployments', error);
      throw error;
    }
  }

  /**
   * Update deployment progress
   * @param {string} deploymentId - Deployment ID
   * @param {number} progress - Progress percentage (0-100)
   * @param {number} currentPhase - Current phase number
   */
  async updateProgress(deploymentId, progress, currentPhase) {
    try {
      const deployment = await Deployment.findByPk(deploymentId);

      if (deployment) {
        deployment.progress = Math.min(progress, 100);
        deployment.currentPhase = currentPhase;
        await deployment.save();

        logger.deployment(deploymentId, currentPhase, `Progress updated to ${progress}%`);

        // Emit WebSocket progress update
        try {
          websocketEmissionService.emitProgressUpdate(deploymentId, progress, currentPhase);
        } catch (wsError) {
          logger.warn('Failed to emit WebSocket progress update', { deploymentId, error: wsError.message });
        }
      }
    } catch (error) {
      logger.error('Failed to update deployment progress', error);
    }
  }

  /**
   * Update deployment phase (Terraform-specific)
   * Phase states: created, terraform-init, terraform-plan, terraform-apply, 
   *               cluster-ready, monitoring-setup, database-setup, completed
   * @param {string} deploymentId - Deployment ID
   * @param {string} phase - New phase
   * @param {object} metadata - Additional metadata
   * @param {boolean} [metadata.skipStatusChange] - If true, don't change the deployment status (useful for preview)
   * @returns {object} Updated deployment
   */
  async updateDeploymentPhase(deploymentId, phase, metadata = {}) {
    try {
      const deployment = await Deployment.findByPk(deploymentId);

      if (!deployment) {
        throw new Error(`Deployment ${deploymentId} not found`);
      }

      // Extract skipStatusChange option from metadata
      const { skipStatusChange, ...logMetadata } = metadata;

      const validPhases = [
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
        'completed',
        'rollback-started',
        'rollback-complete',
        'destruction-pending',     // Awaiting destruction confirmation
        'destruction-started',     // Destruction in progress
        'destruction-complete',    // Destruction finished
        'failed',
      ];

      if (!validPhases.includes(phase)) {
        throw new Error(`Invalid deployment phase: ${phase}`);
      }

      const phaseProgress = {
        'created': 5,
        'terraform-init': 15,
        'terraform-validate': 20,
        'terraform-plan': 30,
        'terraform-plan-preview': 25,  // Preview is before actual plan
        'terraform-apply': 60,
        'terraform-destroy': 50,
        'cluster-ready': 75,
        'monitoring-setup': 85,
        'database-setup': 95,
        'database-init': 90,
        'database-ready': 97,
        'completed': 100,
        'rollback-started': 50,
        'rollback-complete': 0,
        'destruction-pending': 10,
        'destruction-started': 50,
        'destruction-complete': 100,
        'failed': 0,
      };

      deployment.deploymentPhase = phase;
      deployment.progress = phaseProgress[phase] || deployment.progress;

      // Update status based on phase (unless skipStatusChange is true)
      if (!skipStatusChange) {
        if (phase === 'completed') {
          deployment.status = 'completed';
          deployment.completedAt = new Date();
        } else if (phase.startsWith('rollback')) {
          deployment.status = phase === 'rollback-complete' ? 'rolled_back' : 'running';
          if (phase === 'rollback-started') {
            deployment.rolledBackAt = new Date();
          }
        } else if (phase === 'failed') {
          deployment.status = 'failed';
          deployment.completedAt = new Date();
        } else if (phase === 'terraform-init') {
          deployment.status = 'running';
          if (!deployment.startedAt) {
            deployment.startedAt = new Date();
          }
        }
      }

      // Add log entry
      const existingLogs = deployment.deploymentLogs || [];
      existingLogs.push({
        timestamp: new Date(),
        phase,
        type: 'phase-transition',
        metadata: logMetadata,
      });
      deployment.deploymentLogs = existingLogs;

      await deployment.save();

      logger.deployment(deploymentId, deployment.currentPhase, `Phase updated to ${phase}`, {
        progress: deployment.progress,
        metadata,
      });

      // Emit WebSocket events
      try {
        websocketEmissionService.emitPhaseTransition(
          deploymentId,
          null,
          phase,
          { progress: deployment.progress, ...metadata }
        );
      } catch (wsError) {
        logger.warn('Failed to emit WebSocket phase transition', { deploymentId, error: wsError.message });
      }

      return deployment;
    } catch (error) {
      logger.error('Failed to update deployment phase', error);
      throw error;
    }
  }

  /**
   * Add deployment log entry
   * @param {string} deploymentId - Deployment ID
   * @param {string} type - Log type (terraform-output, error, info, warning)
   * @param {string} message - Log message
   * @param {object} data - Additional data
   * @returns {object} Updated deployment
   */
  async addDeploymentLog(deploymentId, type, message, data = {}) {
    try {
      const deployment = await Deployment.findByPk(deploymentId);

      if (!deployment) {
        throw new Error(`Deployment ${deploymentId} not found`);
      }

      const existingLogs = deployment.deploymentLogs || [];
      existingLogs.push({
        timestamp: new Date(),
        type,
        message,
        data,
      });

      // Limit to 1000 logs
      if (existingLogs.length > 1000) {
        existingLogs.shift();
      }

      deployment.deploymentLogs = existingLogs;
      await deployment.save();

      // Emit WebSocket event
      try {
        websocketEmissionService.emitLog(deploymentId, type, message, data);
      } catch (wsError) {
        logger.warn('Failed to emit WebSocket log', { deploymentId, error: wsError.message });
      }

      return deployment;
    } catch (error) {
      logger.error('Failed to add deployment log', error);
      throw error;
    }
  }

  /**
   * Complete deployment successfully
   * @param {string} deploymentId - Deployment ID
   * @param {object} outputs - Terraform outputs
   * @param {object} metadata - Additional metadata
   * @returns {object} Updated deployment
   */
  async completeDeployment(deploymentId, outputs = {}, metadata = {}) {
    try {
      const deployment = await Deployment.findByPk(deploymentId);

      if (!deployment) {
        throw new Error(`Deployment ${deploymentId} not found`);
      }

      const results = {
        ...(deployment.results || {}),
        kubeconfig: outputs.kubeconfig || null,
        clusterEndpoint: outputs.cluster_endpoint || null,
        clusterArn: outputs.cluster_arn || null,
      };

      deployment.status = 'completed';
      deployment.deploymentPhase = 'completed';
      deployment.terraformOutputs = outputs;
      deployment.results = results;
      deployment.completedAt = new Date();
      deployment.progress = 100;

      // Calculate and store metrics
      const startTime = deployment.startedAt || deployment.createdAt;
      const endTime = deployment.completedAt;
      const duration = Math.round((new Date(endTime) - new Date(startTime)) / 1000);
      
      deployment.metricsData = {
        ...deployment.metricsData,
        startTime: startTime,
        endTime: endTime,
        duration: duration,
        durationMinutes: (duration / 60).toFixed(2),
        success: true,
        completedPhases: deployment.currentPhase,
      };

      const existingLogs = deployment.deploymentLogs || [];
      existingLogs.push({
        timestamp: new Date(),
        type: 'deployment-complete',
        message: 'Deployment completed successfully',
        data: metadata,
      });
      deployment.deploymentLogs = existingLogs;

      await deployment.save();

      logger.deployment(deploymentId, deployment.currentPhase, 'Deployment completed', {
        outputs,
      });

      // Emit WebSocket completion event
      try {
        websocketEmissionService.emitCompletion(deploymentId, results, {
          outputs,
          ...metadata,
        });
      } catch (wsError) {
        logger.warn('Failed to emit WebSocket completion event', { deploymentId, error: wsError.message });
      }

      return deployment;
    } catch (error) {
      logger.error('Failed to complete deployment', error);
      throw error;
    }
  }

  /**
   * Fail deployment
   * @param {string} deploymentId - Deployment ID
   * @param {string} errorMessage - Error message
   * @param {object} metadata - Additional metadata
   * @returns {object} Updated deployment
   */
  async failDeployment(deploymentId, errorMessage, metadata = {}) {
    try {
      const deployment = await Deployment.findByPk(deploymentId);

      if (!deployment) {
        throw new Error(`Deployment ${deploymentId} not found`);
      }

      deployment.status = 'failed';
      deployment.deploymentPhase = 'failed';
      deployment.errorMessage = errorMessage;
      deployment.completedAt = new Date();

      // Calculate and store metrics for failed deployment
      const startTime = deployment.startedAt || deployment.createdAt;
      const endTime = deployment.completedAt;
      const duration = Math.round((new Date(endTime) - new Date(startTime)) / 1000);
      
      deployment.metricsData = {
        ...deployment.metricsData,
        startTime: startTime,
        endTime: endTime,
        duration: duration,
        durationMinutes: (duration / 60).toFixed(2),
        success: false,
        failedAt: endTime,
        failurePhase: deployment.currentPhase || deployment.deploymentPhase,
        errorMessage: errorMessage,
      };

      const existingLogs = deployment.deploymentLogs || [];
      existingLogs.push({
        timestamp: new Date(),
        type: 'deployment-failed',
        message: errorMessage,
        data: metadata,
      });
      deployment.deploymentLogs = existingLogs;

      await deployment.save();

      logger.error(`Deployment failed: ${deploymentId}`, { errorMessage, metadata });

      // Emit WebSocket failure event
      try {
        websocketEmissionService.emitDeploymentFailure(deploymentId, errorMessage, metadata);
      } catch (wsError) {
        logger.warn('Failed to emit WebSocket failure event', { deploymentId, error: wsError.message });
      }

      return deployment;
    } catch (error) {
      logger.error('Failed to fail deployment', error);
      throw error;
    }
  }

  /**
   * Set Terraform working directory
   * @param {string} deploymentId - Deployment ID
   * @param {string} workingDir - Terraform working directory path
   * @returns {object} Updated deployment
   */
  async setTerraformWorkingDir(deploymentId, workingDir) {
    try {
      const deployment = await Deployment.findByPk(deploymentId);

      if (!deployment) {
        throw new Error(`Deployment ${deploymentId} not found`);
      }

      deployment.terraformWorkingDir = workingDir;
      await deployment.save();

      logger.deployment(deploymentId, deployment.currentPhase, `Terraform working dir set`, {
        workingDir,
      });

      return deployment;
    } catch (error) {
      logger.error('Failed to set Terraform working directory', error);
      throw error;
    }
  }

  /**
   * Get recent deployment logs
   * @param {string} deploymentId - Deployment ID
   * @param {number} limit - Number of logs to return
   * @returns {array} Recent logs
   */
  async getRecentLogs(deploymentId, limit = 50) {
    try {
      const deployment = await Deployment.findByPk(deploymentId);

      if (!deployment) {
        throw new Error(`Deployment ${deploymentId} not found`);
      }

      const logs = deployment.deploymentLogs || [];
      return logs.slice(-limit);
    } catch (error) {
      logger.error('Failed to get recent logs', error);
      throw error;
    }
  }

  /**
   * Get deployment with full logs
   * @param {string} deploymentId - Deployment ID
   * @returns {object} Deployment with logs
   */
  async getDeploymentWithLogs(deploymentId) {
    try {
      const deployment = await Deployment.findByPk(deploymentId);

      if (!deployment) {
        throw new Error(`Deployment ${deploymentId} not found`);
      }

      return {
        id: deployment.id,
        clusterName: deployment.clusterName,
        cloudProvider: deployment.cloudProvider,
        status: deployment.status,
        deploymentPhase: deployment.deploymentPhase,
        progress: deployment.progress,
        startedAt: deployment.startedAt,
        completedAt: deployment.completedAt,
        logs: deployment.deploymentLogs || [],
        outputs: deployment.terraformOutputs || {},
        errorMessage: deployment.errorMessage || null,
      };
    } catch (error) {
      logger.error('Failed to get deployment with logs', error);
      throw error;
    }
  }

  // ==========================================
  // Destruction Workflow Methods
  // ==========================================

  /**
   * Request destruction of a deployment
   * Sets status to 'pending_destruction' awaiting user confirmation
   * @param {string} deploymentId - Deployment ID
   * @returns {object} - Updated deployment
   */
  async requestDestruction(deploymentId) {
    try {
      const deployment = await Deployment.findByPk(deploymentId);

      if (!deployment) {
        throw new Error('Deployment not found');
      }

      // Can only destroy completed, failed, or rolled_back deployments
      const destroyableStatuses = ['completed', 'failed', 'rolled_back', 'destroy_failed'];
      if (!destroyableStatuses.includes(deployment.status)) {
        throw new Error(`Cannot destroy deployment with status: ${deployment.status}`);
      }

      deployment.status = 'pending_destruction';
      deployment.deploymentPhase = 'destruction-pending';
      deployment.destructionRequestedAt = new Date();
      await deployment.save();

      await this.addDeploymentLog(
        deploymentId,
        'destruction',
        'Destruction requested - awaiting confirmation'
      );

      logger.deployment(deploymentId, deployment.currentPhase, 'Destruction requested', {
        previousStatus: deployment.status,
      });

      // Emit WebSocket event
      try {
        websocketEmissionService.emitDeploymentUpdate(deploymentId, {
          status: 'pending_destruction',
          phase: 'destruction-pending',
          message: 'Destruction requested - awaiting confirmation',
        });
      } catch (wsError) {
        logger.warn('Failed to emit WebSocket destruction request event', { deploymentId, error: wsError.message });
      }

      return deployment;
    } catch (error) {
      logger.error('Failed to request destruction', error);
      throw error;
    }
  }

  /**
   * Confirm destruction by verifying deployment name
   * @param {string} deploymentId - Deployment ID
   * @param {string} confirmationName - Name typed by user for confirmation
   * @returns {object} - Updated deployment
   */
  async confirmDestruction(deploymentId, confirmationName) {
    try {
      const deployment = await Deployment.findByPk(deploymentId);

      if (!deployment) {
        throw new Error('Deployment not found');
      }

      if (deployment.status !== 'pending_destruction') {
        throw new Error('Deployment is not pending destruction');
      }

      // Verify the name matches
      if (deployment.clusterName !== confirmationName) {
        throw new Error('Confirmation name does not match deployment name');
      }

      deployment.destructionConfirmedAt = new Date();
      await deployment.save();

      await this.addDeploymentLog(
        deploymentId,
        'destruction',
        'Destruction confirmed - ready to execute'
      );

      logger.deployment(deploymentId, deployment.currentPhase, 'Destruction confirmed', {
        confirmedBy: confirmationName,
      });

      // Emit WebSocket event
      try {
        websocketEmissionService.emitDeploymentUpdate(deploymentId, {
          status: 'pending_destruction',
          phase: 'destruction-pending',
          message: 'Destruction confirmed - ready to execute',
          confirmed: true,
        });
      } catch (wsError) {
        logger.warn('Failed to emit WebSocket destruction confirmation event', { deploymentId, error: wsError.message });
      }

      return deployment;
    } catch (error) {
      logger.error('Failed to confirm destruction', error);
      throw error;
    }
  }

  /**
   * Start destruction execution
   * @param {string} deploymentId - Deployment ID
   * @returns {object} - Updated deployment
   */
  async startDestruction(deploymentId) {
    try {
      const deployment = await Deployment.findByPk(deploymentId);

      if (!deployment) {
        throw new Error('Deployment not found');
      }

      // Must be confirmed before executing
      if (deployment.status !== 'pending_destruction' || !deployment.destructionConfirmedAt) {
        throw new Error('Destruction must be confirmed before execution');
      }

      deployment.status = 'destroying';
      deployment.deploymentPhase = 'destruction-started';
      await deployment.save();

      await this.addDeploymentLog(
        deploymentId,
        'destruction',
        'Starting terraform destroy...'
      );

      logger.deployment(deploymentId, deployment.currentPhase, 'Destruction started');

      // Emit WebSocket event
      try {
        websocketEmissionService.emitPhaseUpdate(deploymentId, 'destruction-started', {
          status: 'destroying',
          message: 'Starting terraform destroy...',
        });
      } catch (wsError) {
        logger.warn('Failed to emit WebSocket destruction start event', { deploymentId, error: wsError.message });
      }

      return deployment;
    } catch (error) {
      logger.error('Failed to start destruction', error);
      throw error;
    }
  }

  /**
   * Complete destruction after terraform destroy succeeds
   * @param {string} deploymentId - Deployment ID
   * @returns {object} - Updated deployment
   */
  async completeDestruction(deploymentId) {
    try {
      const deployment = await Deployment.findByPk(deploymentId);

      if (!deployment) {
        throw new Error('Deployment not found');
      }

      deployment.status = 'destroyed';
      deployment.deploymentPhase = 'destruction-complete';
      deployment.destroyedAt = new Date();
      await deployment.save();

      await this.addDeploymentLog(
        deploymentId,
        'destruction',
        'Deployment destroyed successfully'
      );

      logger.deployment(deploymentId, deployment.currentPhase, 'Destruction completed');

      // Emit WebSocket event
      try {
        websocketEmissionService.emitPhaseUpdate(deploymentId, 'destruction-complete', {
          status: 'destroyed',
          message: 'Deployment destroyed successfully',
        });
      } catch (wsError) {
        logger.warn('Failed to emit WebSocket destruction complete event', { deploymentId, error: wsError.message });
      }

      return deployment;
    } catch (error) {
      logger.error('Failed to complete destruction', error);
      throw error;
    }
  }

  /**
   * Fail destruction if terraform destroy fails
   * @param {string} deploymentId - Deployment ID
   * @param {string} errorMessage - Error message
   * @returns {object} - Updated deployment
   */
  async failDestruction(deploymentId, errorMessage) {
    try {
      const deployment = await Deployment.findByPk(deploymentId);

      if (!deployment) {
        throw new Error('Deployment not found');
      }

      deployment.status = 'destroy_failed';
      deployment.errorMessage = errorMessage;
      await deployment.save();

      await this.addDeploymentLog(
        deploymentId,
        'error',
        `Destruction failed: ${errorMessage}`
      );

      logger.deployment(deploymentId, deployment.currentPhase, 'Destruction failed', {
        error: errorMessage,
      });

      // Emit WebSocket event
      try {
        websocketEmissionService.emitDeploymentFailure(deploymentId, `Destruction failed: ${errorMessage}`, {
          destructionFailed: true,
        });
      } catch (wsError) {
        logger.warn('Failed to emit WebSocket destruction failure event', { deploymentId, error: wsError.message });
      }

      return deployment;
    } catch (error) {
      logger.error('Failed to fail destruction', error);
      throw error;
    }
  }

  /**
   * Cancel pending destruction request
   * @param {string} deploymentId - Deployment ID
   * @returns {object} - Updated deployment
   */
  async cancelDestruction(deploymentId) {
    try {
      const deployment = await Deployment.findByPk(deploymentId);

      if (!deployment) {
        throw new Error('Deployment not found');
      }

      if (deployment.status !== 'pending_destruction') {
        throw new Error('Deployment is not pending destruction');
      }

      // Restore to previous status (typically 'completed')
      deployment.status = 'completed';
      deployment.deploymentPhase = 'completed';
      deployment.destructionRequestedAt = null;
      deployment.destructionConfirmedAt = null;
      await deployment.save();

      await this.addDeploymentLog(
        deploymentId,
        'info',
        'Destruction request cancelled'
      );

      logger.deployment(deploymentId, deployment.currentPhase, 'Destruction cancelled');

      return deployment;
    } catch (error) {
      logger.error('Failed to cancel destruction', error);
      throw error;
    }
  }

  /**
   * Delete deployment completely (database records and files)
   * Only use after terraform resources have been destroyed
   * @param {string} deploymentId - Deployment ID
   * @param {boolean} keepLogs - Whether to keep log files
   */
  async deleteDeploymentCompletely(deploymentId, keepLogs = false) {
    try {
      const deployment = await Deployment.findByPk(deploymentId);

      if (!deployment) {
        throw new Error('Deployment not found');
      }

      // Only delete destroyed, failed, or rolled_back deployments
      const deletableStatuses = ['destroyed', 'failed', 'rolled_back'];
      if (!deletableStatuses.includes(deployment.status)) {
        throw new Error(`Cannot delete deployment with status: ${deployment.status}. Must be destroyed first.`);
      }

      // Clean up deployment logs from DeploymentLog table
      const { DeploymentLog } = require('../models');
      if (DeploymentLog && !keepLogs) {
        await DeploymentLog.destroy({ where: { deploymentId } });
      }

      // Unlink from any deployment drafts
      const { DeploymentDraft } = require('../models');
      if (DeploymentDraft) {
        await DeploymentDraft.update(
          { deploymentId: null, status: 'approved' },
          { where: { deploymentId } }
        );
      }

      // Clean up SQL scripts
      const { DeploymentSqlScript } = require('../models');
      if (DeploymentSqlScript) {
        await DeploymentSqlScript.destroy({ where: { deploymentId } });
      }

      // Clean up working directory
      const terraformExecutor = require('./terraformExecutor');
      try {
        await terraformExecutor.cleanupDeployment(deploymentId, false);
      } catch (cleanupError) {
        logger.warn(`Failed to cleanup deployment directory`, { deploymentId, error: cleanupError.message });
      }

      // Delete the deployment record
      await deployment.destroy();

      logger.info(`Deployment ${deploymentId} completely deleted`);

      return { success: true, message: 'Deployment completely deleted' };
    } catch (error) {
      logger.error('Failed to delete deployment completely', error);
      throw error;
    }
  }

  /**
   * Build ZL manifest config from a Deployment record.
   * This bridges the database model fields → zlManifestTemplates config shape.
   *
   * @param {object} deployment — Sequelize Deployment instance
   * @returns {object} config suitable for ZLManifestTemplates / ZLDeploymentOrchestrator
   */
  buildZLConfig(deployment) {
    const cfg = deployment.configuration || {};

    return {
      cloudProvider: deployment.cloudProvider,
      namespace: cfg.namespace || 'default',
      registryUrl: cfg.registryUrl,
      repositoryName: cfg.repositoryName,
      imageTags: cfg.imageTags || {},
      efsFileSystemId: cfg.efsFileSystemId,
      db: cfg.db || {},
      zk: cfg.zk || { replicas: 3 },
      accessMode: deployment.accessMode || 'internal',
      externalDomain: deployment.externalDomain || undefined,
      ssl: {
        enabled: deployment.sslMode != null,
        mode: deployment.sslMode,
        certArn: deployment.sslCertArn,
      },
      app: cfg.app || {},
      dockerAuth: cfg.dockerAuth || {},
      serviceAccount: cfg.serviceAccount || {},
    };
  }
}

module.exports = new DeploymentService();
