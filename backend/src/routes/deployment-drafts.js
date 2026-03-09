const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const { DeploymentDraft, Credential, User, Deployment } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../services/logger');
const costEstimationService = require('../services/costEstimationService');
const multiCloudOrchestrator = require('../services/multiCloudOrchestrator');
const terraformExecutor = require('../services/terraformExecutor');
const deploymentService = require('../services/deploymentService');
const { executeInTransaction } = require('../services/transactionHelper');
const credentialService = require('../services/credentialService');
const awsService = require('../services/awsService');

// Helper functions for consistent API responses
const sendSuccess = (res, data, statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    ...data
  });
};

const sendError = (res, message, statusCode = 500, code = 'ERROR', details = null) => {
  const response = {
    success: false,
    error: {
      message,
      code
    }
  };
  if (details) {
    response.error.details = details;
  }
  res.status(statusCode).json(response);
};

/**
 * GET /api/deployment-drafts
 * List all deployment drafts for the authenticated user
 */
router.get(
  '/',
  authenticate,
  [
    query('status').optional().isIn(['draft', 'pending_approval', 'approved', 'rejected', 'deployed']),
    query('cloudProvider').optional().isString(),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', errors.array());
    }

    const { status, cloudProvider, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    try {
      const where = { userId: req.user.id };
      if (status) where.status = status;
      if (cloudProvider) where.cloudProvider = cloudProvider;

      const { count, rows: drafts } = await DeploymentDraft.findAndCountAll({
        where,
        include: [
          {
            model: Credential,
            as: 'credential',
            attributes: ['id', 'name', 'cloudProvider', 'isValid'],
          },
          {
            model: User,
            as: 'approver',
            attributes: ['id', 'email', 'firstName', 'lastName'],
          },
        ],
        order: [['createdAt', 'DESC']],
        limit,
        offset,
      });

      sendSuccess(res, {
        data: {
          drafts,
          pagination: {
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit),
          },
        },
      });
    } catch (error) {
      logger.error('Failed to fetch deployment drafts', { error: error.message, userId: req.user.id });
      sendError(res, 'Failed to fetch deployment drafts', 500, 'FETCH_ERROR');
    }
  }
);

/**
 * GET /api/deployment-drafts/:id
 * Get a specific deployment draft
 */
router.get('/:id', authenticate, param('id').isUUID(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', errors.array());
  }

  try {
    const draft = await DeploymentDraft.findOne({
      where: { id: req.params.id, userId: req.user.id },
      include: [
        {
          model: Credential,
          as: 'credential',
          attributes: ['id', 'name', 'cloudProvider', 'cloudRegion', 'isValid'],
        },
        {
          model: User,
          as: 'approver',
          attributes: ['id', 'email', 'firstName', 'lastName'],
        },
        {
          model: Deployment,
          as: 'deployment',
          attributes: ['id', 'status', 'clusterName', 'createdAt'],
        },
      ],
    });

    if (!draft) {
      return sendError(res, 'Deployment draft not found', 404, 'NOT_FOUND');
    }

    sendSuccess(res, { data: draft });
  } catch (error) {
    logger.error('Failed to fetch deployment draft', { error: error.message, draftId: req.params.id });
    sendError(res, 'Failed to fetch deployment draft', 500, 'FETCH_ERROR');
  }
});

/**
 * POST /api/deployment-drafts
 * Create a new deployment draft
 */
router.post(
  '/',
  authenticate,
  [
    body('name').trim().notEmpty().withMessage('Draft name is required'),
    body('description').optional().trim(),
    body('credentialId').isUUID().withMessage('Valid credential ID is required'),
    body('cloudProvider').isIn(['aws', 'azure', 'gcp', 'digitalocean', 'linode']),
    body('clusterName').trim().notEmpty(),
    body('configuration').isObject(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', errors.array());
    }

    const { name, description, credentialId, cloudProvider, clusterName, configuration } = req.body;

    try {
      // Verify credential exists and belongs to user
      const credential = await Credential.findOne({
        where: { id: credentialId, userId: req.user.id, cloudProvider },
      });

      if (!credential) {
        return sendError(res, 'Credential not found or cloud provider mismatch', 404, 'CREDENTIAL_NOT_FOUND');
      }

      // Calculate estimated costs
      const costEstimate = costEstimationService.calculateMonthlyCost(cloudProvider, configuration);

      // Create draft
      const draft = await DeploymentDraft.create({
        userId: req.user.id,
        credentialId,
        name,
        description,
        clusterName,
        cloudProvider,
        configuration,
        estimatedMonthlyCost: costEstimate.totalCost,
        costBreakdown: costEstimate.breakdown,
        status: 'draft',
      });

      logger.info('Deployment draft created', {
        draftId: draft.id,
        name: draft.name,
        userId: req.user.id,
        estimatedCost: costEstimate.totalCost,
      });

      sendSuccess(res, { data: draft }, 201);
    } catch (error) {
      logger.error('Failed to create deployment draft', { error: error.message, userId: req.user.id });
      sendError(res, 'Failed to create deployment draft', 500, 'CREATE_ERROR');
    }
  }
);

/**
 * PUT /api/deployment-drafts/:id
 * Update a deployment draft
 */
router.put(
  '/:id',
  authenticate,
  [
    param('id').isUUID(),
    body('name').optional().trim().notEmpty(),
    body('description').optional().trim(),
    body('configuration').optional().isObject(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', errors.array());
    }

    try {
      const draft = await DeploymentDraft.findOne({
        where: { id: req.params.id, userId: req.user.id },
      });

      if (!draft) {
        return sendError(res, 'Deployment draft not found', 404, 'NOT_FOUND');
      }

      // Only allow updates if draft is in draft or rejected status
      if (!['draft', 'rejected'].includes(draft.status)) {
        return sendError(res, 'Cannot update draft in current status', 400, 'INVALID_STATUS');
      }

      const { name, description, configuration } = req.body;
      const updates = {};

      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;
      
      if (configuration !== undefined) {
        updates.configuration = configuration;
        // Recalculate costs if configuration changed
        const costEstimate = costEstimationService.calculateMonthlyCost(draft.cloudProvider, configuration);
        updates.estimatedMonthlyCost = costEstimate.totalCost;
        updates.costBreakdown = costEstimate.breakdown;
      }

      await draft.update(updates);

      logger.info('Deployment draft updated', { draftId: draft.id, userId: req.user.id });

      sendSuccess(res, { data: draft });
    } catch (error) {
      logger.error('Failed to update deployment draft', { error: error.message, draftId: req.params.id });
      sendError(res, 'Failed to update deployment draft', 500, 'UPDATE_ERROR');
    }
  }
);

/**
 * POST /api/deployment-drafts/:id/test
 * Test/validate a deployment draft without actually deploying
 */
router.post('/:id/test', authenticate, param('id').isUUID(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', errors.array());
  }

  try {
    const draft = await DeploymentDraft.findOne({
      where: { id: req.params.id, userId: req.user.id },
      include: [{ model: Credential, as: 'credential' }],
    });

    if (!draft) {
      return sendError(res, 'Deployment draft not found', 404, 'NOT_FOUND');
    }

    const testResults = {
      timestamp: new Date(),
      passed: true,
      checks: [],
    };

    // Check 1: Credential validation
    try {
      // Decrypt credentials from database
      const decrypted = credentialService.decryptCredentials({
        encryptedAccessKeyId: draft.credential.encryptedAccessKeyId,
        encryptedSecretAccessKey: draft.credential.encryptedSecretAccessKey,
        encryptionIv: draft.credential.encryptionIv,
        authTag: draft.credential.authTag,
      });

      // Initialize AWS client with decrypted credentials
      awsService.initializeClients({
        accessKeyId: decrypted.accessKeyId,
        secretAccessKey: decrypted.secretAccessKey,
        region: draft.credential.awsRegion || draft.credential.cloudRegion,
      });

      // Validate credentials against AWS
      const isValid = await awsService.validateCredentials();
      
      if (isValid) {
        testResults.checks.push({ name: 'Credential Validation', status: 'passed', message: 'Credentials are valid' });
      } else {
        testResults.passed = false;
        testResults.checks.push({ name: 'Credential Validation', status: 'failed', message: 'Credentials validation failed' });
      }
    } catch (error) {
      testResults.passed = false;
      testResults.checks.push({ name: 'Credential Validation', status: 'failed', message: error.message });
    }

    // Check 2: Cluster name availability (basic validation)
    const existingDeployment = await Deployment.findOne({
      where: { clusterName: draft.clusterName, cloudProvider: draft.cloudProvider },
    });
    if (existingDeployment) {
      testResults.checks.push({
        name: 'Cluster Name',
        status: 'warning',
        message: 'A deployment with this cluster name already exists',
      });
    } else {
      testResults.checks.push({ name: 'Cluster Name', status: 'passed', message: 'Cluster name is available' });
    }

    // Check 3: Configuration validation
    const configChecks = validateConfiguration(draft.configuration);
    testResults.checks.push(...configChecks);
    if (configChecks.some((c) => c.status === 'failed')) {
      testResults.passed = false;
    }

    // Check 4: Estimate deployment time
    const nodeCount = draft.configuration.nodeCount || 2;
    let estimatedMinutes = 15 + nodeCount * 3;
    if (draft.configuration.enableRDS) estimatedMinutes += 10;
    testResults.estimatedDuration = `${estimatedMinutes} minutes`;

    // Update draft with test results
    await draft.update({
      testResults,
      testedAt: new Date(),
    });

    logger.info('Deployment draft tested', {
      draftId: draft.id,
      passed: testResults.passed,
      userId: req.user.id,
    });

    sendSuccess(res, { data: { testResults } });
  } catch (error) {
    logger.error('Failed to test deployment draft', { error: error.message, draftId: req.params.id });
    sendError(res, 'Failed to test deployment draft', 500, 'TEST_ERROR');
  }
});

/**
 * Helper function to validate configuration
 */
function validateConfiguration(config) {
  const checks = [];

  // Validate node count
  if (config.nodeCount && (config.nodeCount < 1 || config.nodeCount > 20)) {
    checks.push({ name: 'Node Count', status: 'failed', message: 'Node count must be between 1 and 20' });
  } else {
    checks.push({ name: 'Node Count', status: 'passed', message: 'Node count is valid' });
  }

  // Validate autoscaling
  if (config.enableAutoscaling) {
    if (config.minNodeCount > config.maxNodeCount) {
      checks.push({
        name: 'Autoscaling',
        status: 'failed',
        message: 'Min node count cannot exceed max node count',
      });
    } else {
      checks.push({ name: 'Autoscaling', status: 'passed', message: 'Autoscaling configuration is valid' });
    }
  }

  // Validate database config
  if (config.enableRDS && !config.dbEngine) {
    checks.push({ name: 'Database', status: 'failed', message: 'Database engine must be specified' });
  } else if (config.enableRDS) {
    checks.push({ name: 'Database', status: 'passed', message: 'Database configuration is valid' });
  }

  // Validate VPC config
  if (config.createNewVPC && !config.vpcCIDR) {
    checks.push({ name: 'VPC', status: 'failed', message: 'VPC CIDR block must be specified' });
  } else {
    checks.push({ name: 'VPC', status: 'passed', message: 'VPC configuration is valid' });
  }

  return checks;
}

/**
 * POST /api/deployment-drafts/:id/submit-approval
 * Submit draft for approval - generates Terraform files for review
 */
router.post('/:id/submit-approval', authenticate, param('id').isUUID(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', errors.array());
  }

  try {
    const draft = await DeploymentDraft.findOne({
      where: { id: req.params.id, userId: req.user.id },
      include: [{ model: Credential, as: 'credential' }],
    });

    if (!draft) {
      return sendError(res, 'Deployment draft not found', 404, 'NOT_FOUND');
    }

    if (draft.status !== 'draft' && draft.status !== 'rejected') {
      return sendError(res, 'Draft cannot be submitted in current status', 400, 'INVALID_STATUS');
    }

    // Generate Terraform files for review
    let terraformDir = null;
    let terraformGenerated = false;
    let tfvarsGenerated = null;
    
    if (draft.credential) {
      try {
        logger.info('Generating Terraform files for draft review', { draftId: draft.id });
        
        // Initialize Terraform working directory
        // Pass cluster name and region to ensure state persistence across deployments
        const initResult = await terraformExecutor.initTerraform(
          draft.id,
          draft.cloudProvider,
          {
            clusterName: draft.clusterName,
            region: draft.configuration?.clusterConfig?.region || draft.configuration?.region || 'us-east-1',
          }
        );
        terraformDir = initResult.deploymentDir;
        
        // Generate terraform.tfvars from configuration
        const configWithClusterName = {
          ...draft.configuration,
          clusterName: draft.clusterName,
        };
        
        const tfvars = await multiCloudOrchestrator.generateTerraformVars(
          draft.id,
          draft.cloudProvider,
          draft.credential.secretRefId,
          draft.credential.vaultType,
          configWithClusterName
        );
        
        // Write terraform.tfvars - pass the deploymentDir from initResult
        await terraformExecutor.writeTfvars(draft.id, tfvars, { deploymentDir: terraformDir });
        
        terraformGenerated = true;
        tfvarsGenerated = Object.keys(tfvars).length;
        logger.info('Terraform files generated successfully for draft', { 
          draftId: draft.id, 
          terraformDir,
          variableCount: tfvarsGenerated 
        });
      } catch (tfError) {
        // Log error but don't fail the submission
        logger.warn('Failed to generate Terraform files for draft', { 
          draftId: draft.id, 
          error: tfError.message 
        });
      }
    }

    // Store terraform info in metadata
    const updatedMetadata = {
      ...(draft.metadata || {}),
      terraform: {
        generated: terraformGenerated,
        dir: terraformDir,
        variableCount: tfvarsGenerated,
        generatedAt: terraformGenerated ? new Date().toISOString() : null
      }
    };

    await draft.update({ 
      status: 'pending_approval',
      metadata: updatedMetadata
    });

    logger.info('Deployment draft submitted for approval', { 
      draftId: draft.id, 
      userId: req.user.id,
      terraformGenerated,
      terraformDir
    });

    sendSuccess(res, { 
      data: draft,
      terraformGenerated,
      message: terraformGenerated 
        ? 'Draft submitted for approval with Terraform files generated' 
        : 'Draft submitted for approval (Terraform generation deferred)'
    });
  } catch (error) {
    logger.error('Failed to submit draft for approval', { error: error.message, draftId: req.params.id });
    sendError(res, 'Failed to submit draft for approval', 500, 'SUBMIT_ERROR');
  }
});

/**
 * POST /api/deployment-drafts/:id/approve
 * Approve a deployment draft (admin/manager only)
 */
router.post(
  '/:id/approve',
  authenticate,
  authorize(['admin', 'approver', 'manager']),
  [param('id').isUUID(), body('comment').optional().trim()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', errors.array());
    }

    const { comment } = req.body;

    try {
      const draft = await DeploymentDraft.findByPk(req.params.id);

      if (!draft) {
        return sendError(res, 'Deployment draft not found', 404, 'NOT_FOUND');
      }

      if (draft.status !== 'pending_approval') {
        return sendError(res, 'Draft is not pending approval', 400, 'INVALID_STATUS');
      }

      await draft.update({
        status: 'approved',
        approvedBy: req.user.id,
        approvedAt: new Date(),
        approvalComment: comment,
      });

      logger.info('Deployment draft approved', {
        draftId: draft.id,
        approvedBy: req.user.email,
        userId: draft.userId,
      });

      sendSuccess(res, { data: draft });
    } catch (error) {
      logger.error('Failed to approve deployment draft', { error: error.message, draftId: req.params.id });
      sendError(res, 'Failed to approve deployment draft', 500, 'APPROVE_ERROR');
    }
  }
);

/**
 * POST /api/deployment-drafts/:id/reject
 * Reject a deployment draft (admin/manager only)
 */
router.post(
  '/:id/reject',
  authenticate,
  authorize(['admin', 'approver', 'manager']),
  [param('id').isUUID(), body('reason').trim().notEmpty().withMessage('Rejection reason is required')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', errors.array());
    }

    const { reason } = req.body;

    try {
      const draft = await DeploymentDraft.findByPk(req.params.id);

      if (!draft) {
        return sendError(res, 'Deployment draft not found', 404, 'NOT_FOUND');
      }

      if (draft.status !== 'pending_approval') {
        return sendError(res, 'Draft is not pending approval', 400, 'INVALID_STATUS');
      }

      await draft.update({
        status: 'rejected',
        approvedBy: req.user.id,
        approvedAt: new Date(),
        rejectionReason: reason,
      });

      logger.info('Deployment draft rejected', {
        draftId: draft.id,
        rejectedBy: req.user.email,
        reason,
        userId: draft.userId,
      });

      sendSuccess(res, { data: draft });
    } catch (error) {
      logger.error('Failed to reject deployment draft', { error: error.message, draftId: req.params.id });
      sendError(res, 'Failed to reject deployment draft', 500, 'REJECT_ERROR');
    }
  }
);

/**
 * POST /api/deployment-drafts/:id/deploy
 * Deploy an approved draft
 */
router.post('/:id/deploy', authenticate, param('id').isUUID(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', errors.array());
  }

  try {
    const draft = await DeploymentDraft.findOne({
      where: { id: req.params.id },
      include: [{ model: Credential, as: 'credential' }],
    });

    if (!draft) {
      return sendError(res, 'Deployment draft not found', 404, 'NOT_FOUND');
    }

    // Check authorization: owner or admin can deploy approved drafts
    if (draft.userId !== req.user.id && req.user.role !== 'admin') {
      return sendError(res, 'Unauthorized to deploy this draft', 403, 'FORBIDDEN');
    }

    if (draft.status !== 'approved') {
      return sendError(res, 'Draft must be approved before deployment', 400, 'NOT_APPROVED');
    }

    // Create deployment and update draft atomically
    const result = await executeInTransaction(async (t) => {
      // Create deployment from draft
      const deployment = await deploymentService.createDeployment(
        {
          credentialId: draft.credentialId,
          userId: draft.userId,
          clusterName: draft.clusterName,
          cloudProvider: draft.cloudProvider,
          configuration: draft.configuration,
        },
        t
      );

      // Update draft status and link to deployment
      // Use 'deployment_pending' instead of 'deployed' to indicate deployment was created but not yet started
      await draft.update(
        {
          status: 'deployment_pending',
          deploymentId: deployment.id,
        },
        { transaction: t }
      );

      return { deployment, draft };
    });

    logger.info('Deployment created from draft', {
      draftId: result.draft.id,
      deploymentId: result.deployment.id,
      clusterName: result.deployment.clusterName,
    });

    sendSuccess(
      res,
      {
        data: result,
      },
      201
    );
  } catch (error) {
    logger.error('Failed to deploy from draft', { error: error.message, draftId: req.params.id });
    sendError(res, 'Failed to deploy from draft', 500, 'DEPLOY_ERROR');
  }
});

/**
 * POST /api/deployment-drafts/:id/reset
 * Reset a deployed draft back to pending_approval status
 * This allows re-editing and re-deploying a draft that was previously deployed
 */
router.post(
  '/:id/reset',
  authenticate,
  authorize(['admin', 'operator']),
  [param('id').isUUID()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', errors.array());
    }

    try {
      const draft = await DeploymentDraft.findOne({
        where: { id: req.params.id, userId: req.user.id },
      });

      if (!draft) {
        return sendError(res, 'Deployment draft not found', 404, 'NOT_FOUND');
      }

      // Only allow resetting deployed or deployment_pending drafts
      if (draft.status !== 'deployed' && draft.status !== 'deployment_pending') {
        return sendError(
          res,
          `Cannot reset draft with status: ${draft.status}. Only deployed or ready-to-deploy drafts can be reset.`,
          400,
          'INVALID_STATUS'
        );
      }

      // Reset draft to pending_approval and clear deployment link
      await draft.update({
        status: 'pending_approval',
        deploymentId: null,
        approvedBy: null,
        approvedAt: null,
        approvalComment: null,
      });

      logger.info('Deployment draft reset', {
        draftId: draft.id,
        userId: req.user.id,
        draftName: draft.name,
      });

      sendSuccess(res, { data: draft }, 200);
    } catch (error) {
      logger.error('Failed to reset deployment draft', { error: error.message, draftId: req.params.id });
      sendError(res, 'Failed to reset deployment draft', 500, 'RESET_ERROR');
    }
  }
);

/**
 * POST /api/deployment-drafts/:id/save-preview
 * Save the terraform preview results to the draft for later review
 * This allows users to view the preview results without immediately deploying
 */
router.post(
  '/:id/save-preview',
  authenticate,
  [
    param('id').isUUID(),
    body('previewResults').isObject().withMessage('Preview results must be an object'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', errors.array());
    }

    try {
      const draft = await DeploymentDraft.findOne({
        where: { id: req.params.id, userId: req.user.id },
      });

      if (!draft) {
        return sendError(res, 'Deployment draft not found', 404, 'NOT_FOUND');
      }

      // Save preview results
      const { previewResults } = req.body;
      await draft.update({
        previewResults: previewResults,
        previewedAt: new Date(),
        // Update status to deployment_pending if it was approved
        status: ['approved', 'draft', 'pending_approval'].includes(draft.status) 
          ? 'deployment_pending' 
          : draft.status,
      });

      logger.info('Preview results saved to draft', {
        draftId: draft.id,
        userId: req.user.id,
        draftName: draft.name,
        hasDeploymentId: !!previewResults.deploymentId,
      });

      sendSuccess(res, { 
        data: {
          ...draft.toJSON(),
          previewResults: previewResults,
          previewedAt: new Date(),
        },
        message: 'Preview results saved successfully' 
      });
    } catch (error) {
      logger.error('Failed to save preview results', { error: error.message, draftId: req.params.id });
      sendError(res, 'Failed to save preview results', 500, 'SAVE_PREVIEW_ERROR');
    }
  }
);

/**
 * DELETE /api/deployment-drafts/:id
 * Delete a deployment draft
 */
router.delete('/:id', authenticate, param('id').isUUID(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', errors.array());
  }

  try {
    const draft = await DeploymentDraft.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!draft) {
      return sendError(res, 'Deployment draft not found', 404, 'NOT_FOUND');
    }

    // Cannot delete deployed drafts
    if (draft.status === 'deployed') {
      return sendError(res, 'Cannot delete deployed drafts', 400, 'INVALID_STATUS');
    }

    await draft.destroy();

    logger.info('Deployment draft deleted', { draftId: draft.id, userId: req.user.id });

    sendSuccess(res, { message: 'Deployment draft deleted successfully' });
  } catch (error) {
    logger.error('Failed to delete deployment draft', { error: error.message, draftId: req.params.id });
    sendError(res, 'Failed to delete deployment draft', 500, 'DELETE_ERROR');
  }
});

module.exports = router;
