const express = require('express');
const { body, validationResult } = require('express-validator');
const { Deployment, Credential } = require('../models');
const { deploymentService, logger, multiCloudOrchestrator } = require('../services');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, sendSuccess, sendError } = require('../middleware/errorHandler');
const localDeploymentService = require('../services/localDeploymentService');
const zlDeploymentOrchestrator = require('../services/zlDeploymentOrchestrator');
const containerDeploymentService = require('../services/containerDeploymentService');

const router = express.Router();

// All deployment routes require authentication
router.use(authenticate);

/**
 * POST /api/deployments
 * Start new multi-cloud deployment
 * Supports executionMode: 'production' (default), 'dryRun', 'localTest'
 */
router.post(
  '/',
  authorize(['admin', 'operator']),
  [
    body('credentialId').optional().isUUID(),
    body('cloudProvider').optional().isIn(['aws', 'azure', 'gcp', 'digitalocean', 'linode']),
    body('clusterName').trim().isLength({ min: 1, max: 100 }),
    body('kubernetesVersion').optional().matches(/^\d+\.\d+$/),
    body('region').optional().isString(),
    body('executionMode').optional().isIn(['production', 'dryRun', 'localTest']),
    
    // Compute configuration
    body('nodeInstanceType').optional().isString(),
    body('nodeCount').optional().isInt({ min: 1, max: 100 }),
    body('minNodeCount').optional().isInt({ min: 1, max: 100 }),
    body('maxNodeCount').optional().isInt({ min: 1, max: 100 }),
    body('enableAutoscaling').optional().isBoolean(),
    body('diskSizeGB').optional().isInt({ min: 20, max: 1000 }),
    
    // Additional VMs
    body('enableAdditionalVMs').optional().isBoolean(),
    body('vmCount').optional().isInt({ min: 0, max: 20 }),
    body('vmInstanceType').optional().isString(),
    body('vmOperatingSystem').optional().isString(),
    
    // Networking
    body('createNewVPC').optional().isBoolean(),
    body('vpcCIDR').optional().matches(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}$/),
    body('existingVPCId').optional().isString(),
    body('publicSubnets').optional().isArray(),
    body('privateSubnets').optional().isArray(),
    body('enableNATGateway').optional().isBoolean(),
    body('enableLoadBalancer').optional().isBoolean(),
    
    // Storage
    body('enableBlockStorage').optional().isBoolean(),
    body('blockStorageSize').optional().isInt({ min: 1, max: 16000 }),
    body('blockStorageType').optional().isString(),
    body('enableFileStorage').optional().isBoolean(),
    body('fileStorageSize').optional().isInt({ min: 1, max: 10000 }),
    body('enableObjectStorage').optional().isBoolean(),
    body('objectStorageBucket').optional().isString(),
    
    // Database
    body('enableRDS').optional().isBoolean(),
    body('dbEngine').optional().isString(),
    body('dbVersion').optional().isString(),
    body('dbInstanceClass').optional().isString(),
    body('dbAllocatedStorage').optional().isInt({ min: 20, max: 65536 }),
    body('dbMultiAZ').optional().isBoolean(),
    body('dbBackupRetentionDays').optional().isInt({ min: 0, max: 35 }),
    body('dbUsername').optional().isString(),
    
    // Monitoring & Logging
    body('enableMonitoring').optional().isBoolean(),
    body('enableLogging').optional().isBoolean(),
    body('enableAlerts').optional().isBoolean(),
    body('alertEmail').optional().isEmail(),
    
    // Tags
    body('tags').optional().isArray(),
    body('tags.*.key').optional().isString().trim().isLength({ min: 1, max: 128 }),
    body('tags.*.value').optional().isString().trim().isLength({ min: 0, max: 256 }),

    // Access Mode
    body('accessMode')
      .optional()
      .isIn(['internal', 'external'])
      .withMessage('accessMode must be internal or external'),
    body('externalDomain')
      .optional()
      .isFQDN()
      .withMessage('externalDomain must be a valid FQDN'),
    body('sslMode')
      .optional()
      .isIn(['acm', 'upload'])
      .withMessage('sslMode must be acm or upload'),
    body('sslCertArn')
      .optional()
      .matches(/^arn:aws:acm:/)
      .withMessage('sslCertArn must be a valid ACM ARN'),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', errors.array());
    }

    const { credentialId, cloudProvider, clusterName, executionMode = 'production', accessMode, externalDomain, sslMode, sslCertArn, ...config } = req.body;

    try {
      // Handle different execution modes
      if (executionMode === 'localTest') {
        // Local Minikube deployment - no cloud credentials needed
        return handleLocalTestDeployment(req, res, { clusterName, config });
      }

      if (executionMode === 'dryRun') {
        // Dry run - validate and preview without executing
        return handleDryRunDeployment(req, res, { credentialId, cloudProvider, clusterName, config });
      }

      // Production mode - requires valid cloud credentials
      // Verify credential exists and belongs to user
      const credential = await Credential.findOne({
        where: {
          id: credentialId,
          userId: req.user.id,
          cloudProvider,
        },
      });

      if (!credential) {
        return sendError(res, 'Credential not found or cloud provider mismatch', 404, 'CREDENTIAL_NOT_FOUND');
      }

      // Validate cloud credentials before creating deployment
      try {
        await multiCloudOrchestrator.validateCloudCredentials(cloudProvider, {
          secretRefId: credential.secretRefId,
          vaultType: credential.vaultType,
        });
      } catch (error) {
        logger.warn(`Credential validation failed for deployment`, { credentialId, cloudProvider, error: error.message });
        return sendError(res, 'Credential validation failed', 400, 'CREDENTIAL_INVALID');
      }

      // Create deployment record
      const deployment = await deploymentService.createDeployment({
        credentialId,
        userId: req.user.id,
        clusterName,
        cloudProvider,
        configuration: config,
        accessMode: accessMode || 'internal',
        externalDomain: externalDomain || null,
        sslMode: sslMode || null,
        sslCertArn: sslCertArn || null,
      });

      logger.info(`Multi-cloud deployment created: ${clusterName}`, {
        deploymentId: deployment.id,
        userId: req.user.id,
        cloudProvider,
      });

      sendSuccess(
        res,
        {
          id: deployment.id,
          clusterName: deployment.clusterName,
          cloudProvider: deployment.cloudProvider,
          status: deployment.status,
          progress: deployment.progress,
          currentPhase: deployment.currentPhase,
          createdAt: deployment.createdAt,
        },
        201,
        'Deployment created successfully'
      );
    } catch (error) {
      logger.error('Failed to create deployment', error);
      sendError(res, 'Failed to create deployment', 500, 'DEPLOYMENT_ERROR');
    }
  })
);

/**
 * Handle dry-run deployment - validates and previews without executing
 */
async function handleDryRunDeployment(req, res, { credentialId, cloudProvider, clusterName, config }) {
  try {
    logger.info(`Dry run deployment requested: ${clusterName}`, { userId: req.user.id });

    // Validate credential if provided (optional for dry run)
    let credentialValid = false;
    if (credentialId && cloudProvider) {
      const credential = await Credential.findOne({
        where: {
          id: credentialId,
          userId: req.user.id,
          cloudProvider,
        },
      });
      credentialValid = !!credential;
    }

    // Generate preview data without creating actual resources
    const preview = {
      executionMode: 'dryRun',
      clusterName,
      cloudProvider: cloudProvider || 'local',
      configuration: config,
      credentialValid,
      estimatedResources: generateResourceEstimate(cloudProvider, config),
      validationPassed: true,
      warnings: [],
      timestamp: new Date().toISOString()
    };

    // Add warnings for potential issues
    if (!credentialValid) {
      preview.warnings.push('Cloud credentials not validated - production deployment will require valid credentials');
    }
    if (!config.region) {
      preview.warnings.push('No region specified - default region will be used');
    }

    logger.info(`Dry run completed for ${clusterName}`, { warnings: preview.warnings.length });

    return sendSuccess(res, preview, 200, 'Dry run completed - no resources created');
  } catch (error) {
    logger.error('Dry run failed', error);
    return sendError(res, 'Dry run failed', 500, 'DRY_RUN_ERROR');
  }
}

/**
 * Handle local test deployment - deploys to Minikube
 */
async function handleLocalTestDeployment(req, res, { clusterName, config }) {
  try {
    logger.info(`Local test deployment requested: ${clusterName}`, { userId: req.user.id });

    // Generate unique deployment ID for tracking
    const deploymentId = `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create deployment record for tracking (with 'local' as cloud provider)
    const deployment = await deploymentService.createDeployment({
      credentialId: null, // No cloud credentials for local deployment
      userId: req.user.id,
      clusterName,
      cloudProvider: 'local',
      configuration: {
        ...config,
        executionMode: 'localTest',
        localDeploymentId: deploymentId
      },
    });

    // Start local deployment asynchronously
    localDeploymentService.deploy(
      { 
        ...config, 
        name: clusterName,
        namespace: config.namespace || 'default'
      },
      deployment.id
    ).then(result => {
      logger.info(`Local deployment completed: ${clusterName}`, { result });
    }).catch(error => {
      logger.error(`Local deployment failed: ${clusterName}`, error);
    });

    return sendSuccess(
      res,
      {
        id: deployment.id,
        localDeploymentId: deploymentId,
        clusterName,
        cloudProvider: 'local',
        executionMode: 'localTest',
        status: 'pending',
        message: 'Local deployment started - deploying to Minikube'
      },
      201,
      'Local test deployment started'
    );
  } catch (error) {
    logger.error('Local test deployment failed', error);
    return sendError(res, 'Local test deployment failed', 500, 'LOCAL_DEPLOYMENT_ERROR');
  }
}

/**
 * Generate estimated resources for dry run preview
 */
function generateResourceEstimate(cloudProvider, config) {
  const resources = [];

  // Kubernetes cluster
  resources.push({
    type: 'kubernetes_cluster',
    name: config.clusterName || 'k8s-cluster',
    provider: cloudProvider,
    specs: {
      nodeCount: config.nodeCount || 3,
      instanceType: config.nodeInstanceType || 'standard',
      kubernetesVersion: config.kubernetesVersion || '1.28'
    }
  });

  // VPC/Network
  if (config.createNewVPC !== false) {
    resources.push({
      type: 'vpc',
      name: `${config.clusterName}-vpc`,
      provider: cloudProvider,
      specs: {
        cidr: config.vpcCIDR || '10.0.0.0/16',
        publicSubnets: config.publicSubnets?.length || 2,
        privateSubnets: config.privateSubnets?.length || 2
      }
    });
  }

  // Additional VMs
  if (config.enableAdditionalVMs && config.vmCount > 0) {
    resources.push({
      type: 'virtual_machines',
      name: `${config.clusterName}-vms`,
      provider: cloudProvider,
      specs: {
        count: config.vmCount,
        instanceType: config.vmInstanceType,
        os: config.vmOperatingSystem
      }
    });
  }

  // Database
  if (config.enableRDS) {
    resources.push({
      type: 'database',
      name: `${config.clusterName}-db`,
      provider: cloudProvider,
      specs: {
        engine: config.dbEngine,
        instanceClass: config.dbInstanceClass,
        storage: config.dbAllocatedStorage
      }
    });
  }

  // Storage
  if (config.enableBlockStorage) {
    resources.push({
      type: 'block_storage',
      name: `${config.clusterName}-storage`,
      provider: cloudProvider,
      specs: {
        size: config.blockStorageSize,
        type: config.blockStorageType
      }
    });
  }

  return resources;
}

/**
 * GET /api/deployments
 * List all deployments with optional filtering
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    try {
      const { limit = 20, offset = 0, status, cloudProvider } = req.query;

      const result = await deploymentService.listDeployments({
        userId: req.user.id,
        status,
        cloudProvider,
        limit: parseInt(limit),
        offset: parseInt(offset),
      });

      sendSuccess(
        res,
        {
          data: result.deployments,
          pagination: {
            total: result.total,
            limit: parseInt(limit),
            offset: parseInt(offset),
          },
        },
        200,
        'Deployments retrieved'
      );
    } catch (error) {
      logger.error('Failed to list deployments', error);
      sendError(res, 'Failed to list deployments', 500, 'DEPLOYMENT_ERROR');
    }
  })
);

/**
 * GET /api/deployments/:id
 * Get deployment details, status, and configuration
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    try {
      const deployment = await Deployment.findOne({
        where: {
          id: req.params.id,
          userId: req.user.id,
        },
        include: [
          {
            association: 'credential',
            attributes: ['id', 'name', 'cloudProvider', 'cloudRegion'],
          },
          {
            association: 'user',
            attributes: ['id', 'email'],
          },
        ],
      });

      if (!deployment) {
        return sendError(res, 'Deployment not found', 404, 'DEPLOYMENT_NOT_FOUND');
      }

      sendSuccess(
        res,
        {
          data: {
            id: deployment.id,
            clusterName: deployment.clusterName,
            cloudProvider: deployment.cloudProvider,
            status: deployment.status,
            progress: deployment.progress,
            currentPhase: deployment.currentPhase,
            configuration: deployment.configuration,
            credential: deployment.credential,
            createdAt: deployment.createdAt,
            updatedAt: deployment.updatedAt,
          },
        },
        200,
        'Deployment retrieved'
      );
    } catch (error) {
      logger.error('Failed to get deployment', error);
      sendError(res, 'Failed to get deployment', 500, 'DEPLOYMENT_ERROR');
    }
  })
);

/**
 * POST /api/deployments/:id/start
 * Start deployment execution with Terraform
 * Flow: init Terraform → write tfvars → validate → plan → apply
 */
router.post(
  '/:id/start',
  authorize(['admin', 'operator']),
  asyncHandler(async (req, res) => {
    try {
      const deployment = await Deployment.findOne({
        where: {
          id: req.params.id,
          userId: req.user.id,
        },
        include: [
          {
            association: 'credential',
            attributes: ['id', 'cloudProvider', 'vaultType', 'secretRefId', 'cloudAccountId', 'cloudRegion'],
          },
        ],
      });

      if (!deployment) {
        return sendError(res, 'Deployment not found', 404, 'DEPLOYMENT_NOT_FOUND');
      }

      if (deployment.status !== 'pending') {
        return sendError(res, `Cannot start deployment with status: ${deployment.status}`, 400, 'INVALID_STATUS');
      }

      // Begin async Terraform execution
      startTerraformExecution(deployment)
        .catch((error) => {
          logger.error(`Terraform execution failed for deployment ${deployment.id}`, error);
          deploymentService.failDeployment(deployment.id, error.message, { 
            phase: 'terraform-execution',
            error: error.stack 
          });
        });

      // Immediately return success with deployment ID
      const updated = await deploymentService.startDeployment(req.params.id);

      // Update any associated draft status to 'deployed' now that deployment is actually starting
      try {
        const { DeploymentDraft } = require('../models');
        await DeploymentDraft.update(
          { status: 'deployed' },
          { where: { deploymentId: deployment.id, status: 'deployment_pending' } }
        );
      } catch (draftError) {
        logger.warn('Failed to update draft status', { deploymentId: deployment.id, error: draftError.message });
      }

      logger.info(`Terraform execution initiated for deployment`, {
        deploymentId: deployment.id,
        cloudProvider: deployment.cloudProvider,
        clusterName: deployment.clusterName,
      });

      sendSuccess(
        res,
        {
          data: {
            id: updated.id,
            status: updated.status,
            deploymentPhase: updated.deploymentPhase,
            progress: updated.progress,
            message: `Terraform execution initiated on ${deployment.cloudProvider}`,
          },
        },
        200,
        'Deployment started'
      );
    } catch (error) {
      logger.error('Failed to start deployment', error);
      sendError(res, error.message, 400, 'DEPLOYMENT_ERROR');
    }
  })
);

/**
 * Terraform Execution Flow
 * Async function runs independently of HTTP request
 */
async function startTerraformExecution(deployment) {
  const { terraformExecutor } = require('../services');

  try {
    // Phase 1: Initialize Terraform
    logger.info(`[Terraform] Initializing for deployment ${deployment.id}`);
    await deploymentService.updateDeploymentPhase(deployment.id, 'terraform-init');

    // Pass cluster name and region to ensure state persistence across deployments
    const initResult = await terraformExecutor.initTerraform(
      deployment.id,
      deployment.cloudProvider,
      {
        clusterName: deployment.clusterName,
        region: deployment.configuration?.clusterConfig?.region || deployment.configuration?.region || 'us-east-1',
      }
    );

    await deploymentService.setTerraformWorkingDir(deployment.id, initResult.deploymentDir);
    await deploymentService.addDeploymentLog(
      deployment.id,
      'terraform-output',
      'Terraform initialized',
      { initResult }
    );

    // Phase 2: Generate and write terraform.tfvars
    logger.info(`[Terraform] Generating variables for deployment ${deployment.id}`);
    
    // Merge cluster name into configuration
    const configWithClusterName = {
      ...deployment.configuration,
      clusterName: deployment.clusterName,
    };
    
    const tfvars = await multiCloudOrchestrator.generateTerraformVars(
      deployment.id,
      deployment.cloudProvider,
      deployment.credential.secretRefId,
      deployment.credential.vaultType,
      configWithClusterName
    );

    // Pass the deploymentDir from initResult to ensure we write to the correct location
    await terraformExecutor.writeTfvars(deployment.id, tfvars, { deploymentDir: initResult.deploymentDir });
    await deploymentService.addDeploymentLog(
      deployment.id,
      'info',
      'Terraform variables written',
      { variableCount: Object.keys(tfvars).length }
    );

    // Phase 3: Validate Terraform
    logger.info(`[Terraform] Validating configuration for deployment ${deployment.id}`);
    await deploymentService.updateDeploymentPhase(deployment.id, 'terraform-validate');

    const validateResult = await terraformExecutor.validateTerraform(deployment.id, { deploymentDir: initResult.deploymentDir });
    await deploymentService.addDeploymentLog(
      deployment.id,
      'terraform-output',
      'Terraform validated successfully',
      { validateResult }
    );

    // Phase 4: Plan Terraform
    logger.info(`[Terraform] Planning for deployment ${deployment.id}`);
    await deploymentService.updateDeploymentPhase(deployment.id, 'terraform-plan');
    
    const planResult = await terraformExecutor.planTerraform(deployment.id, null, { deploymentDir: initResult.deploymentDir });
    await deploymentService.addDeploymentLog(
      deployment.id,
      'terraform-output',
      'Terraform plan created',
      { planFile: planResult.planFile }
    );

    // Phase 5: Apply Terraform
    logger.info(`[Terraform] Applying for deployment ${deployment.id}`);
    await deploymentService.updateDeploymentPhase(deployment.id, 'terraform-apply');

    const applyResult = await terraformExecutor.applyTerraform(deployment.id, planResult.planFile, { deploymentDir: initResult.deploymentDir });
    await deploymentService.addDeploymentLog(
      deployment.id,
      'terraform-output',
      'Terraform applied successfully',
      { outputs: Object.keys(applyResult.outputs || {}) }
    );

    // Phase 6: Cluster ready
    logger.info(`[Terraform] Cluster ready for deployment ${deployment.id}`);
    await deploymentService.updateDeploymentPhase(deployment.id, 'cluster-ready');

    // Complete deployment
    await deploymentService.completeDeployment(
      deployment.id,
      applyResult.outputs || {},
      {
        terraformVersion: applyResult.terraformVersion,
        completionTime: new Date(),
      }
    );

    // Phase 7: Execute database scripts (if RDS enabled and scripts exist)
    const { DeploymentSqlScript } = require('../models');
    const databaseScriptExecutor = require('../services/databaseScriptExecutor');
    
    const config = deployment.configuration || {};
    const hasRDS = config.enableRDS === true;
    
    if (hasRDS) {
      const pendingScripts = await DeploymentSqlScript.count({
        where: {
          deploymentId: deployment.id,
          status: 'pending',
        },
      });
      
      if (pendingScripts > 0) {
        logger.info(`[Terraform] Starting database initialization for deployment ${deployment.id}`, {
          scriptCount: pendingScripts,
        });
        
        await deploymentService.updateDeploymentPhase(deployment.id, 'database-init');
        
        try {
          await databaseScriptExecutor.executeScripts(deployment.id);
          
          logger.info(`[Terraform] Database initialization completed for deployment ${deployment.id}`);
          await deploymentService.updateDeploymentPhase(deployment.id, 'database-ready');
          
        } catch (dbError) {
          logger.error(`[Terraform] Database initialization failed`, {
            deploymentId: deployment.id,
            error: dbError.message,
          });
          
          // Don't fail the entire deployment for DB script failures
          // User can manually re-execute scripts
          await deploymentService.addDeploymentLog(
            deployment.id,
            'warning',
            'Database script execution failed. Scripts can be re-executed manually.',
            { error: dbError.message }
          );
        }
      }
    }

    logger.info(`[Terraform] Deployment completed successfully`, {
      deploymentId: deployment.id,
      cloudProvider: deployment.cloudProvider,
      clusterName: deployment.clusterName,
      outputs: Object.keys(applyResult.outputs || {}),
    });

  } catch (error) {
    logger.error(`[Terraform] Execution failed`, {
      deploymentId: deployment.id,
      error: error.message,
      stack: error.stack,
    });

    await deploymentService.failDeployment(
      deployment.id,
      error.message,
      {
        phase: deployment.deploymentPhase,
        errorStack: error.stack,
      }
    );

    // Initiate rollback on failure
    try {
      await deploymentService.startRollback(deployment.id, `Automatic rollback after Terraform failure`);
      const destroyResult = await terraformExecutor.destroyTerraform(deployment.id);
      await deploymentService.completeRollback(deployment.id);
      
      logger.warn(`[Terraform] Rollback completed`, {
        deploymentId: deployment.id,
      });
    } catch (rollbackError) {
      logger.error(`[Terraform] Rollback failed`, {
        deploymentId: deployment.id,
        error: rollbackError.message,
      });
    }
  }
}

/**
 * POST /api/deployments/:id/pause
 * Pause running deployment
 */
router.post(
  '/:id/pause',
  authorize(['admin', 'operator']),
  asyncHandler(async (req, res) => {
    try {
      const deployment = await deploymentService.pauseDeployment(req.params.id);

      if (!deployment) {
        return sendError(res, 'Deployment not found', 404, 'DEPLOYMENT_NOT_FOUND');
      }

      sendSuccess(res, { deployment }, 200, 'Deployment paused');
    } catch (error) {
      logger.error('Failed to pause deployment', error);
      sendError(res, error.message, 400, 'DEPLOYMENT_ERROR');
    }
  })
);

/**
 * POST /api/deployments/:id/resume
 * Resume paused deployment
 */
router.post(
  '/:id/resume',
  authorize(['admin', 'operator']),
  asyncHandler(async (req, res) => {
    try {
      const deployment = await deploymentService.resumeDeployment(req.params.id);

      if (!deployment) {
        return sendError(res, 'Deployment not found', 404, 'DEPLOYMENT_NOT_FOUND');
      }

      sendSuccess(res, { deployment }, 200, 'Deployment resumed');
    } catch (error) {
      logger.error('Failed to resume deployment', error);
      sendError(res, error.message, 400, 'DEPLOYMENT_ERROR');
    }
  })
);

/**
 * POST /api/deployments/:id/rollback
 * Rollback deployment
 */
router.post(
  '/:id/rollback',
  authorize(['admin']),
  [body('reason').optional().trim()],
  asyncHandler(async (req, res) => {
    try {
      const deployment = await deploymentService.rollbackDeployment(
        req.params.id,
        req.body.reason || 'Manual rollback'
      );

      sendSuccess(res, { deployment }, 200, 'Deployment rolled back');
    } catch (error) {
      logger.error('Failed to rollback deployment', error);
      sendError(res, error.message, 400, 'DEPLOYMENT_ERROR');
    }
  })
);

/**
 * POST /api/deployments/:id/cancel
 * Cancel a running deployment
 */
router.post(
  '/:id/cancel',
  authorize(['admin', 'operator']),
  asyncHandler(async (req, res) => {
    try {
      const deployment = await deploymentService.cancelDeployment(req.params.id);

      sendSuccess(res, { deployment }, 200, 'Deployment cancelled');
    } catch (error) {
      logger.error('Failed to cancel deployment', error);
      sendError(res, error.message, 400, 'DEPLOYMENT_ERROR');
    }
  })
);

/**
 * DELETE /api/deployments/:id
 * Delete a failed or cancelled deployment permanently
 */
router.delete(
  '/:id',
  authorize(['admin', 'operator']),
  asyncHandler(async (req, res) => {
    try {
      const deployment = await Deployment.findOne({
        where: {
          id: req.params.id,
          userId: req.user.id,
        },
      });

      if (!deployment) {
        return sendError(res, 'Deployment not found', 404, 'DEPLOYMENT_NOT_FOUND');
      }

      // Only allow deleting failed or cancelled deployments
      if (!['failed', 'rolled_back'].includes(deployment.status)) {
        return sendError(
          res,
          `Cannot delete deployment with status: ${deployment.status}. Only failed or rolled_back deployments can be deleted.`,
          400,
          'INVALID_STATUS'
        );
      }

      // Delete the deployment record
      await deployment.destroy();

      logger.info(`Deployment deleted`, {
        deploymentId: deployment.id,
        userId: req.user.id,
        clusterName: deployment.clusterName,
        status: deployment.status,
      });

      sendSuccess(res, { id: deployment.id }, 200, 'Deployment deleted successfully');
    } catch (error) {
      logger.error('Failed to delete deployment', error);
      sendError(res, error.message, 400, 'DEPLOYMENT_ERROR');
    }
  })
);

/**
 * GET /api/deployments/:id/logs
 * Get deployment logs with multi-cloud support
 */
router.get(
  '/:id/logs',
  asyncHandler(async (req, res) => {
    try {
      const deployment = await Deployment.findOne({
        where: {
          id: req.params.id,
          userId: req.user.id,
        },
      });

      if (!deployment) {
        return sendError(res, 'Deployment not found', 404, 'DEPLOYMENT_NOT_FOUND');
      }

      // Get logs from orchestrator or log service
      // In production, this would fetch from Terraform logs, CloudWatch, etc.
      const logs = await deploymentService.getDeploymentLogs(req.params.id);

      sendSuccess(
        res,
        {
          data: {
            deploymentId: deployment.id,
            cloudProvider: deployment.cloudProvider,
            logs: logs || [
              `[Phase 1] Starting ${deployment.cloudProvider.toUpperCase()} cluster creation...`,
              `[Phase 1] Creating infrastructure...`,
              `[Phase 2] Initializing Kubernetes...`,
              `[Phase 3] Setting up storage...`,
              `[Phase 4] Deploying monitoring stack...`,
              `[${deployment.status.toUpperCase()}] Current status: ${deployment.progress}%`,
            ],
          },
        },
        200,
        'Logs retrieved'
      );
    } catch (error) {
      logger.error('Failed to get deployment logs', error);
      sendError(res, 'Failed to get deployment logs', 500, 'DEPLOYMENT_ERROR');
    }
  })
);

/**
 * GET /api/deployments/providers/info
 * Get supported cloud providers and metadata
 */
router.get(
  '/providers/info',
  asyncHandler(async (req, res) => {
    try {
      const providers = multiCloudOrchestrator.getAllProvidersInfo();

      sendSuccess(
        res,
        {
          data: providers,
        },
        200,
        'Provider information retrieved'
      );
    } catch (error) {
      logger.error('Failed to get provider information', error);
      sendError(res, 'Failed to get provider information', 500, 'PROVIDER_ERROR');
    }
  })
);

// ==========================================
// Terraform Preview Endpoints
// ==========================================

/**
 * POST /api/deployments/:id/preview
 * Run terraform plan without applying to preview changes
 * This is a "dry run" that shows what resources will be created/modified/destroyed
 */
router.post(
  '/:id/preview',
  authorize(['admin', 'operator']),
  asyncHandler(async (req, res) => {
    const { terraformExecutor } = require('../services');
    
    try {
      const deployment = await Deployment.findOne({
        where: {
          id: req.params.id,
          userId: req.user.id,
        },
        include: [
          {
            model: Credential,
            as: 'credential',
            attributes: ['id', 'cloudProvider', 'vaultType', 'secretRefId', 'cloudAccountId', 'cloudRegion'],
          },
        ],
      });

      if (!deployment) {
        return sendError(res, 'Deployment not found', 404, 'DEPLOYMENT_NOT_FOUND');
      }

      // Can only preview pending deployments
      if (deployment.status !== 'pending') {
        return sendError(
          res,
          `Cannot preview deployment with status: ${deployment.status}. Preview is only available for pending deployments.`,
          400,
          'INVALID_STATUS'
        );
      }

      logger.info(`Starting terraform preview for deployment ${deployment.id}`);

      // Update phase to indicate preview in progress (don't change status)
      await deploymentService.updateDeploymentPhase(deployment.id, 'terraform-plan-preview', { skipStatusChange: true });

      // Initialize terraform if not already done (skipStatusChange to keep status as 'pending')
      const initResult = await terraformExecutor.initTerraform(
        deployment.id,
        deployment.cloudProvider,
        {
          clusterName: deployment.clusterName,
          region: deployment.configuration?.clusterConfig?.region || deployment.configuration?.region || 'us-east-1',
          skipStatusChange: true,  // Don't change status during preview
        }
      );

      // Generate terraform variables
      const configWithClusterName = {
        ...deployment.configuration,
        clusterName: deployment.clusterName,
      };

      const tfvars = await multiCloudOrchestrator.generateTerraformVars(
        deployment.id,
        deployment.cloudProvider,
        deployment.credential.secretRefId,
        deployment.credential.vaultType,
        configWithClusterName
      );

      await terraformExecutor.writeTfvars(deployment.id, tfvars, { deploymentDir: initResult.deploymentDir });

      // Validate terraform configuration (don't change status during preview)
      await terraformExecutor.validateTerraform(deployment.id, { 
        deploymentDir: initResult.deploymentDir,
        skipStatusChange: true,
      });

      // Run AWS quota and resource pre-checks (for AWS deployments)
      let prerequisiteCheck = null;
      if (deployment.cloudProvider === 'aws') {
        try {
          const { awsService, credentialService } = require('../services');
          const { Credential } = require('../models');
          
          // Get decrypted credentials to initialize AWS
          const credential = await Credential.findByPk(deployment.credentialId);
          if (!credential) {
            throw new Error('Credential not found');
          }
          const decryptedCreds = credentialService.getDecryptedCredentialFromModel(credential);
          awsService.initializeClients({
            accessKeyId: decryptedCreds.accessKeyId,
            secretAccessKey: decryptedCreds.secretAccessKey,
            region: deployment.configuration?.clusterConfig?.region || deployment.configuration?.region || decryptedCreds.region || 'us-east-1',
          });

          prerequisiteCheck = await awsService.checkDeploymentPrerequisites({
            clusterName: deployment.clusterName,
            region: deployment.configuration?.clusterConfig?.region || deployment.configuration?.region || decryptedCreds.region || 'us-east-1',
            configuration: deployment.configuration,
          });

          logger.info('AWS prerequisite check completed', {
            deploymentId: deployment.id,
            valid: prerequisiteCheck.valid,
            errorCount: prerequisiteCheck.errors.length,
            warningCount: prerequisiteCheck.warnings.length,
          });
        } catch (prereqError) {
          logger.warn('Could not perform AWS prerequisite check', { 
            deploymentId: deployment.id, 
            error: prereqError.message 
          });
          // Don't fail the preview, just add a warning
          prerequisiteCheck = {
            valid: true,
            warnings: [`AWS prerequisite check could not be performed: ${prereqError.message}`],
            errors: [],
            quotas: {},
            existingResources: [],
          };
        }
      }

      // Run terraform plan and capture output (don't change status during preview)
      const planResult = await terraformExecutor.planTerraform(deployment.id, null, { 
        deploymentDir: initResult.deploymentDir,
        returnSummary: true,
        skipStatusChange: true,
      });

      // Parse the plan to extract resource summary
      const planSummary = parseTerraformPlanOutput(planResult.output || '');

      // Store the plan file path for potential apply
      await deploymentService.setTerraformWorkingDir(deployment.id, initResult.deploymentDir);

      // Reset phase back to created (preview complete, not started) - keep status as 'pending'
      await deploymentService.updateDeploymentPhase(deployment.id, 'created', { skipStatusChange: true });

      await deploymentService.addDeploymentLog(
        deployment.id,
        'terraform-preview',
        'Terraform plan preview completed',
        { planSummary, prerequisiteCheck }
      );

      logger.info(`Terraform preview completed for deployment ${deployment.id}`, planSummary);

      // Determine if deployment can proceed based on prerequisite check
      const canProceed = !prerequisiteCheck || prerequisiteCheck.valid;
      const message = canProceed 
        ? 'Terraform plan preview completed' 
        : 'Preview completed with issues - deployment may fail';

      sendSuccess(
        res,
        {
          deploymentId: deployment.id,
          planFile: planResult.planFile,
          summary: planSummary,
          rawOutput: planResult.output,
          previewedAt: new Date().toISOString(),
          // Include AWS prerequisite check results
          prerequisiteCheck: prerequisiteCheck || null,
          canProceed,
        },
        200,
        message
      );
    } catch (error) {
      logger.error('Failed to run terraform preview', error);
      sendError(res, error.message, 400, 'TERRAFORM_PREVIEW_ERROR');
    }
  })
);

/**
 * Helper function to parse terraform plan output
 * Extracts resource counts: to add, change, destroy
 */
function parseTerraformPlanOutput(output) {
  const summary = {
    toAdd: 0,
    toChange: 0,
    toDestroy: 0,
    resources: [],
    valid: false,
    message: '',
  };

  if (!output) {
    return summary;
  }

  // Strip ANSI escape codes (terminal colors) from output
  // eslint-disable-next-line no-control-regex
  const cleanOutput = output.replace(/\x1b\[[0-9;]*m/g, '');

  // Look for the plan summary line like: "Plan: 45 to add, 0 to change, 0 to destroy."
  const planMatch = cleanOutput.match(/Plan:\s*(\d+)\s*to add,\s*(\d+)\s*to change,\s*(\d+)\s*to destroy/i);
  if (planMatch) {
    summary.toAdd = parseInt(planMatch[1], 10);
    summary.toChange = parseInt(planMatch[2], 10);
    summary.toDestroy = parseInt(planMatch[3], 10);
    summary.valid = true;
    summary.message = `Plan: ${summary.toAdd} to add, ${summary.toChange} to change, ${summary.toDestroy} to destroy`;
  }

  // Look for "No changes" message
  if (cleanOutput.includes('No changes') || cleanOutput.includes('Your infrastructure matches the configuration')) {
    summary.valid = true;
    summary.message = 'No changes required - infrastructure matches configuration';
  }

  // Extract resource names from lines like "# aws_eks_cluster.main will be created"
  // or "# aws_eip.nat[0] will be created" (with array indices)
  const resourceRegex = /#\s+([\w_.\[\]0-9-]+)\s+will be (created|updated|destroyed)/g;
  let match;
  while ((match = resourceRegex.exec(cleanOutput)) !== null) {
    summary.resources.push({
      name: match[1],
      action: match[2],
    });
  }

  // If we didn't find a plan summary line but found resources, derive counts from resources
  if (!summary.valid && summary.resources.length > 0) {
    summary.toAdd = summary.resources.filter(r => r.action === 'created').length;
    summary.toChange = summary.resources.filter(r => r.action === 'updated').length;
    summary.toDestroy = summary.resources.filter(r => r.action === 'destroyed').length;
    summary.valid = true;
    summary.message = `Plan: ${summary.toAdd} to add, ${summary.toChange} to change, ${summary.toDestroy} to destroy`;
  }

  return summary;
}

// ==========================================
// Destruction Workflow Endpoints
// ==========================================

/**
 * POST /api/deployments/:id/request-destroy
 * Request destruction of a deployment (sets status to pending_destruction)
 */
router.post(
  '/:id/request-destroy',
  authorize(['admin']),
  asyncHandler(async (req, res) => {
    try {
      const deployment = await Deployment.findOne({
        where: {
          id: req.params.id,
          userId: req.user.id,
        },
      });

      if (!deployment) {
        return sendError(res, 'Deployment not found', 404, 'DEPLOYMENT_NOT_FOUND');
      }

      const updated = await deploymentService.requestDestruction(deployment.id);

      logger.info(`Destruction requested for deployment`, {
        deploymentId: deployment.id,
        userId: req.user.id,
        clusterName: deployment.clusterName,
      });

      sendSuccess(
        res,
        {
          data: {
            id: updated.id,
            status: updated.status,
            clusterName: updated.clusterName,
            destructionRequestedAt: updated.destructionRequestedAt,
            message: `Destruction requested for ${updated.clusterName}. Please confirm by typing the deployment name.`,
          },
        },
        200,
        'Destruction requested'
      );
    } catch (error) {
      logger.error('Failed to request destruction', error);
      sendError(res, error.message, 400, 'DESTRUCTION_REQUEST_ERROR');
    }
  })
);

/**
 * POST /api/deployments/:id/confirm-destroy
 * Confirm destruction by typing deployment name
 */
router.post(
  '/:id/confirm-destroy',
  authorize(['admin']),
  [body('confirmationName').trim().notEmpty().withMessage('Confirmation name is required')],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', errors.array());
    }

    try {
      const deployment = await Deployment.findOne({
        where: {
          id: req.params.id,
          userId: req.user.id,
        },
      });

      if (!deployment) {
        return sendError(res, 'Deployment not found', 404, 'DEPLOYMENT_NOT_FOUND');
      }

      const { confirmationName } = req.body;
      const updated = await deploymentService.confirmDestruction(deployment.id, confirmationName);

      logger.info(`Destruction confirmed for deployment`, {
        deploymentId: deployment.id,
        userId: req.user.id,
        confirmedName: confirmationName,
      });

      sendSuccess(
        res,
        {
          data: {
            id: updated.id,
            status: updated.status,
            clusterName: updated.clusterName,
            destructionConfirmedAt: updated.destructionConfirmedAt,
            message: `Destruction confirmed for ${updated.clusterName}. Ready to execute.`,
          },
        },
        200,
        'Destruction confirmed'
      );
    } catch (error) {
      logger.error('Failed to confirm destruction', error);
      sendError(res, error.message, 400, 'DESTRUCTION_CONFIRM_ERROR');
    }
  })
);

/**
 * POST /api/deployments/:id/execute-destroy
 * Execute terraform destroy after confirmation
 * This is a long-running operation (15-30 minutes)
 */
router.post(
  '/:id/execute-destroy',
  authorize(['admin']),
  asyncHandler(async (req, res) => {
    const { terraformExecutor } = require('../services');

    try {
      const deployment = await Deployment.findOne({
        where: {
          id: req.params.id,
          userId: req.user.id,
        },
      });

      if (!deployment) {
        return sendError(res, 'Deployment not found', 404, 'DEPLOYMENT_NOT_FOUND');
      }

      // Must be confirmed before executing
      if (deployment.status !== 'pending_destruction' || !deployment.destructionConfirmedAt) {
        return sendError(
          res,
          'Destruction must be confirmed before execution. Call /confirm-destroy first.',
          400,
          'DESTRUCTION_NOT_CONFIRMED'
        );
      }

      // Start destruction
      await deploymentService.startDestruction(deployment.id);

      // Execute terraform destroy asynchronously
      startTerraformDestruction(deployment)
        .catch((error) => {
          logger.error(`Terraform destruction failed for deployment ${deployment.id}`, error);
          deploymentService.failDestruction(deployment.id, error.message);
        });

      logger.info(`Terraform destruction initiated for deployment`, {
        deploymentId: deployment.id,
        userId: req.user.id,
        clusterName: deployment.clusterName,
      });

      sendSuccess(
        res,
        {
          data: {
            id: deployment.id,
            status: 'destroying',
            clusterName: deployment.clusterName,
            message: `Destruction initiated for ${deployment.clusterName}. This process takes 15-30 minutes.`,
          },
        },
        200,
        'Destruction initiated'
      );
    } catch (error) {
      logger.error('Failed to execute destruction', error);
      sendError(res, error.message, 400, 'DESTRUCTION_EXECUTE_ERROR');
    }
  })
);

/**
 * POST /api/deployments/:id/cancel-destroy
 * Cancel a pending destruction request
 */
router.post(
  '/:id/cancel-destroy',
  authorize(['admin']),
  asyncHandler(async (req, res) => {
    try {
      const deployment = await Deployment.findOne({
        where: {
          id: req.params.id,
          userId: req.user.id,
        },
      });

      if (!deployment) {
        return sendError(res, 'Deployment not found', 404, 'DEPLOYMENT_NOT_FOUND');
      }

      const updated = await deploymentService.cancelDestruction(deployment.id);

      logger.info(`Destruction cancelled for deployment`, {
        deploymentId: deployment.id,
        userId: req.user.id,
      });

      sendSuccess(
        res,
        {
          data: {
            id: updated.id,
            status: updated.status,
            message: 'Destruction request cancelled',
          },
        },
        200,
        'Destruction cancelled'
      );
    } catch (error) {
      logger.error('Failed to cancel destruction', error);
      sendError(res, error.message, 400, 'DESTRUCTION_CANCEL_ERROR');
    }
  })
);

/**
 * DELETE /api/deployments/:id/permanent
 * Permanently delete a destroyed deployment (database cleanup)
 * Only available after terraform destroy has completed
 */
router.delete(
  '/:id/permanent',
  authorize(['admin']),
  asyncHandler(async (req, res) => {
    try {
      const deployment = await Deployment.findOne({
        where: {
          id: req.params.id,
          userId: req.user.id,
        },
      });

      if (!deployment) {
        return sendError(res, 'Deployment not found', 404, 'DEPLOYMENT_NOT_FOUND');
      }

      const result = await deploymentService.deleteDeploymentCompletely(deployment.id);

      logger.info(`Deployment permanently deleted`, {
        deploymentId: deployment.id,
        userId: req.user.id,
      });

      sendSuccess(res, result, 200, 'Deployment permanently deleted');
    } catch (error) {
      logger.error('Failed to permanently delete deployment', error);
      sendError(res, error.message, 400, 'DELETION_ERROR');
    }
  })
);

/**
 * GET /api/deployments/:id/health
 * Check ZL application component health for a deployment
 */
router.get(
  '/:id/health',
  authorize(['admin', 'operator', 'viewer']),
  asyncHandler(async (req, res) => {
    const deployment = await Deployment.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!deployment) {
      return sendError(res, 'Deployment not found', 404, 'DEPLOYMENT_NOT_FOUND');
    }

    if (deployment.status !== 'completed' && deployment.status !== 'running') {
      return sendError(
        res,
        'Health check only available for running/completed deployments',
        400,
        'DEPLOYMENT_NOT_RUNNING'
      );
    }

    const health = await zlDeploymentOrchestrator.checkHealth(deployment);

    const overallStatus = Object.values(health).every(s => s === 'healthy' || s === 'connected')
      ? 'healthy'
      : Object.values(health).some(s => s === 'unreachable' || s === 'disconnected')
        ? 'unhealthy'
        : 'degraded';

    sendSuccess(
      res,
      { overallStatus, components: health, checkedAt: new Date().toISOString() },
      200,
      'Health check completed'
    );
  })
);

/**
 * POST /api/deployments/:id/scan
 * Run a Grype container image vulnerability scan for the deployment's images
 */
router.post(
  '/:id/scan',
  authorize(['admin', 'operator']),
  asyncHandler(async (req, res) => {
    const deployment = await Deployment.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!deployment) {
      return sendError(res, 'Deployment not found', 404, 'DEPLOYMENT_NOT_FOUND');
    }

    const config = deployment.configuration || {};
    const outputs = deployment.terraformOutputs || deployment.outputs || {};
    const imageTag =
      req.body.imageTag ||
      config.containerImage ||
      outputs.ecr_repository_url ||
      `${config.clusterName || 'zlapp'}:latest`;

    const severity = req.body.severity || 'medium';

    logger.info(`[Scan] Starting vulnerability scan`, {
      deploymentId: deployment.id,
      imageTag,
      severity,
      userId: req.user.id,
    });

    const scanResults = await containerDeploymentService.scanImage(imageTag, { severity });

    sendSuccess(res, scanResults, 200, 'Vulnerability scan completed');
  })
);

/**
 * Terraform Destruction Flow
 * Async function runs independently of HTTP request
 */
async function startTerraformDestruction(deployment) {
  const { terraformExecutor } = require('../services');

  try {
    logger.info(`[Terraform] Starting destruction for deployment ${deployment.id}`);

    await deploymentService.addDeploymentLog(
      deployment.id,
      'terraform-destroy',
      'Starting terraform destroy...'
    );

    // Run terraform destroy
    const destroyResult = await terraformExecutor.destroyTerraform(deployment.id);

    await deploymentService.addDeploymentLog(
      deployment.id,
      'terraform-destroy',
      'Terraform destroy completed',
      { destroyResult }
    );

    // Mark as destroyed
    await deploymentService.completeDestruction(deployment.id);

    logger.info(`[Terraform] Destruction completed for deployment ${deployment.id}`);

  } catch (error) {
    logger.error(`[Terraform] Destruction failed for deployment ${deployment.id}`, error);

    await deploymentService.addDeploymentLog(
      deployment.id,
      'error',
      `Terraform destroy failed: ${error.message}`
    );

    throw error;
  }
}

module.exports = router;
