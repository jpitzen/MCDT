const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, sendSuccess, sendError } = require('../middleware/errorHandler');
const containerDeploymentService = require('../services/containerDeploymentService');
const { logger } = require('../services');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// ==========================================
// PREREQUISITES & SETUP ROUTES (must be before /:id to avoid route conflicts)
// ==========================================

/**
 * GET /api/container-deployments/prerequisites
 * Check all prerequisites for Cloud Deployment Toolkit
 */
router.get(
  '/prerequisites',
  asyncHandler(async (req, res) => {
    const result = await containerDeploymentService.checkPrerequisites();
    sendSuccess(res, result);
  })
);

/**
 * GET /api/container-deployments/prerequisites/aws/:credentialId
 * Validate AWS credentials configuration
 */
router.get(
  '/prerequisites/aws/:credentialId',
  [param('credentialId').isUUID()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const result = await containerDeploymentService.checkAwsConfiguration(req.params.credentialId);
    sendSuccess(res, result);
  })
);

/**
 * GET /api/container-deployments/prerequisites/iam/:credentialId
 * Check status of required EKS IAM roles
 */
router.get(
  '/prerequisites/iam/:credentialId',
  [
    param('credentialId').isUUID(),
    query('clusterName').optional().isString(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const result = await containerDeploymentService.checkEksIamRoles(
      req.params.credentialId,
      req.query.clusterName || 'eks'
    );
    sendSuccess(res, result);
  })
);

/**
 * POST /api/container-deployments/prerequisites/iam/:credentialId/create
 * Create a specific EKS IAM role
 * 
 * @deprecated This route is deprecated. IAM roles should be created by Terraform during deployment.
 *             Use Phase 1 Prerequisites status check (GET route) for informational purposes only.
 *             Creating resources outside Terraform causes state drift and deployment conflicts.
 */
router.post(
  '/prerequisites/iam/:credentialId/create',
  authorize(['admin', 'operator']),
  [
    param('credentialId').isUUID(),
    body('roleId').isString().notEmpty(),
    body('clusterName').optional().isString(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const result = await containerDeploymentService.createEksIamRole(
      req.params.credentialId,
      req.body.roleId,
      req.body.clusterName || 'eks'
    );
    sendSuccess(res, result);
  })
);

/**
 * POST /api/container-deployments/prerequisites/iam/:credentialId/create-all
 * Create all required EKS IAM roles
 * 
 * @deprecated This route is deprecated. IAM roles should be created by Terraform during deployment.
 *             Use Phase 1 Prerequisites status check (GET route) for informational purposes only.
 *             Creating resources outside Terraform causes state drift and deployment conflicts.
 */
router.post(
  '/prerequisites/iam/:credentialId/create-all',
  authorize(['admin', 'operator']),
  [
    param('credentialId').isUUID(),
    body('clusterName').optional().isString(),
    body('onlyRequired').optional().isBoolean(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const result = await containerDeploymentService.createAllEksIamRoles(
      req.params.credentialId,
      req.body.clusterName || 'eks',
      { onlyRequired: req.body.onlyRequired !== false }
    );
    sendSuccess(res, result);
  })
);

/**
 * GET /api/container-deployments/prerequisites/security-groups/:credentialId
 * Check status of required EKS security groups
 */
router.get(
  '/prerequisites/security-groups/:credentialId',
  [
    param('credentialId').isUUID(),
    query('region').optional().isString(),
    query('vpcId').optional().isString(),
    query('clusterName').optional().isString(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const result = await containerDeploymentService.checkEksSecurityGroups(
      req.params.credentialId,
      req.query.region,
      req.query.vpcId,
      req.query.clusterName || 'eks'
    );
    sendSuccess(res, result);
  })
);

/**
 * POST /api/container-deployments/prerequisites/security-groups/:credentialId/create
 * Create a specific EKS security group
 * 
 * @deprecated This route is deprecated. Security groups should be created by Terraform during deployment.
 *             Use Phase 1 Prerequisites status check (GET route) for informational purposes only.
 *             Creating resources outside Terraform causes state drift and deployment conflicts.
 */
router.post(
  '/prerequisites/security-groups/:credentialId/create',
  authorize(['admin', 'operator']),
  [
    param('credentialId').isUUID(),
    body('sgId').isString().notEmpty(),
    body('region').isString().notEmpty(),
    body('vpcId').isString().notEmpty(),
    body('clusterName').optional().isString(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const result = await containerDeploymentService.createEksSecurityGroup(
      req.params.credentialId,
      req.body.region,
      req.body.vpcId,
      req.body.sgId,
      req.body.clusterName || 'eks'
    );
    sendSuccess(res, result);
  })
);

/**
 * POST /api/container-deployments/prerequisites/security-groups/:credentialId/create-all
 * Create all required EKS security groups
 * 
 * @deprecated This route is deprecated. Security groups should be created by Terraform during deployment.
 *             Use Phase 1 Prerequisites status check (GET route) for informational purposes only.
 *             Creating resources outside Terraform causes state drift and deployment conflicts.
 */
router.post(
  '/prerequisites/security-groups/:credentialId/create-all',
  authorize(['admin', 'operator']),
  [
    param('credentialId').isUUID(),
    body('region').isString().notEmpty(),
    body('vpcId').isString().notEmpty(),
    body('clusterName').optional().isString(),
    body('onlyRequired').optional().isBoolean(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const result = await containerDeploymentService.createAllEksSecurityGroups(
      req.params.credentialId,
      req.body.region,
      req.body.vpcId,
      req.body.clusterName || 'eks',
      { onlyRequired: req.body.onlyRequired !== false }
    );
    sendSuccess(res, result);
  })
);

// ==========================================
// CORE DEPLOYMENT ROUTES
// ==========================================

/**
 * GET /api/container-deployments
 * List all container deployments for the authenticated user
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const deployments = await containerDeploymentService.getByUser(req.user.id);
    sendSuccess(res, { deployments });
  })
);

/**
 * GET /api/container-deployments/:id
 * Get a specific container deployment
 */
router.get(
  '/:id',
  [param('id').isUUID()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const deployment = await containerDeploymentService.getById(req.params.id);
    if (!deployment) {
      return sendError(res, 'Container deployment not found', 404);
    }

    if (deployment.userId !== req.user.id && req.user.role !== 'admin') {
      return sendError(res, 'Access denied', 403);
    }

    sendSuccess(res, { deployment });
  })
);

/**
 * POST /api/container-deployments
 * Create a new container deployment
 */
router.post(
  '/',
  authorize(['admin', 'operator']),
  [
    body('name').trim().isLength({ min: 1, max: 255 }),
    body('sourceType').isIn(['dockerfile', 'docker-compose', 'local-image', 'git-repo']),
    body('imageName').trim().isLength({ min: 1, max: 255 }),
    body('imageTag').optional().trim().isLength({ max: 100 }),
    body('registryType').isIn(['ecr', 'acr', 'gcr', 'docker-hub', 'private', 'local']),
    body('deploymentTarget').optional().isIn(['local', 'registry', 'both']),
    body('credentialId').optional().isUUID(),
    body('deploymentId').optional().isUUID(),
    body('dockerfilePath').optional().trim(),
    body('buildContext').optional().trim(),
    body('gitRepoUrl').optional().isURL(),
    body('gitBranch').optional().trim(),
    body('registryUrl').optional().trim(),
    body('repositoryName').optional().trim(),
    body('registryRegion').optional().trim(),
    body('k8sNamespace').optional().trim(),
    body('k8sDeploymentName').optional().trim(),
    body('k8sServiceName').optional().trim(),
    body('k8sServiceType').optional().isIn(['ClusterIP', 'NodePort', 'LoadBalancer']),
    body('k8sReplicas').optional().isInt({ min: 1, max: 100 }),
    body('k8sContainerPort').optional().isInt({ min: 1, max: 65535 }),
    body('k8sServicePort').optional().isInt({ min: 1, max: 65535 }),
    body('k8sResourceRequests').optional().isObject(),
    body('k8sResourceLimits').optional().isObject(),
    body('k8sEnvironmentVars').optional().isArray(),
    body('k8sHealthCheck').optional().isObject(),
    body('buildArgs').optional().isObject(),
    body('buildPlatform').optional().trim(),
    body('noCache').optional().isBoolean(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const deployment = await containerDeploymentService.create(req.user.id, req.body);
    sendSuccess(res, { deployment }, 201);
  })
);

/**
 * POST /api/container-deployments/:id/start
 * Start the deployment pipeline
 */
router.post(
  '/:id/start',
  authorize(['admin', 'operator']),
  [
    param('id').isUUID(),
    body('skipBuild').optional().isBoolean(),
    body('skipPush').optional().isBoolean(),
    body('skipDeploy').optional().isBoolean(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const deployment = await containerDeploymentService.getById(req.params.id);
    if (!deployment) {
      return sendError(res, 'Container deployment not found', 404);
    }

    if (deployment.userId !== req.user.id && req.user.role !== 'admin') {
      return sendError(res, 'Access denied', 403);
    }

    // Start pipeline asynchronously
    containerDeploymentService.startPipeline(req.params.id, {
      skipBuild: req.body.skipBuild,
      skipPush: req.body.skipPush,
      skipDeploy: req.body.skipDeploy,
    }).catch(error => {
      logger.error('Pipeline failed', { id: req.params.id, error: error.message });
    });

    sendSuccess(res, { 
      message: 'Deployment pipeline started',
      deploymentId: deployment.id,
    });
  })
);

/**
 * POST /api/container-deployments/:id/build
 * Build image only
 */
router.post(
  '/:id/build',
  authorize(['admin', 'operator']),
  [param('id').isUUID()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const deployment = await containerDeploymentService.getById(req.params.id);
    if (!deployment) {
      return sendError(res, 'Container deployment not found', 404);
    }

    await containerDeploymentService.buildImage(deployment);
    sendSuccess(res, { deployment: await containerDeploymentService.getById(req.params.id) });
  })
);

/**
 * POST /api/container-deployments/:id/push
 * Push to registry only
 */
router.post(
  '/:id/push',
  authorize(['admin', 'operator']),
  [param('id').isUUID()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const deployment = await containerDeploymentService.getById(req.params.id);
    if (!deployment) {
      return sendError(res, 'Container deployment not found', 404);
    }

    await containerDeploymentService.pushToRegistry(deployment);
    sendSuccess(res, { deployment: await containerDeploymentService.getById(req.params.id) });
  })
);

/**
 * POST /api/container-deployments/:id/deploy
 * Deploy to K8s only
 */
router.post(
  '/:id/deploy',
  authorize(['admin', 'operator']),
  [param('id').isUUID()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const deployment = await containerDeploymentService.getById(req.params.id);
    if (!deployment) {
      return sendError(res, 'Container deployment not found', 404);
    }

    await containerDeploymentService.deployToKubernetes(deployment);
    sendSuccess(res, { deployment: await containerDeploymentService.getById(req.params.id) });
  })
);

/**
 * POST /api/container-deployments/:id/rollback
 * Rollback to previous image
 */
router.post(
  '/:id/rollback',
  authorize(['admin', 'operator']),
  [param('id').isUUID()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const deployment = await containerDeploymentService.rollback(req.params.id);
    sendSuccess(res, { deployment });
  })
);

/**
 * POST /api/container-deployments/:id/scale
 * Scale the K8s deployment
 */
router.post(
  '/:id/scale',
  authorize(['admin', 'operator']),
  [
    param('id').isUUID(),
    body('replicas').isInt({ min: 0, max: 100 }),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const deployment = await containerDeploymentService.scale(req.params.id, req.body.replicas);
    sendSuccess(res, { deployment });
  })
);

/**
 * GET /api/container-deployments/:id/k8s-status
 * Get K8s status for the deployment
 */
router.get(
  '/:id/k8s-status',
  [param('id').isUUID()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const status = await containerDeploymentService.getK8sStatus(req.params.id);
    sendSuccess(res, status);
  })
);

/**
 * POST /api/container-deployments/:id/cancel
 * Cancel active build/push
 */
router.post(
  '/:id/cancel',
  authorize(['admin', 'operator']),
  [param('id').isUUID()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const result = await containerDeploymentService.cancel(req.params.id);
    sendSuccess(res, result);
  })
);

/**
 * DELETE /api/container-deployments/:id
 * Delete a container deployment
 */
router.delete(
  '/:id',
  authorize(['admin', 'operator']),
  [
    param('id').isUUID(),
    query('deleteFromK8s').optional().isBoolean(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const deployment = await containerDeploymentService.getById(req.params.id);
    if (!deployment) {
      return sendError(res, 'Container deployment not found', 404);
    }

    if (deployment.userId !== req.user.id && req.user.role !== 'admin') {
      return sendError(res, 'Access denied', 403);
    }

    const result = await containerDeploymentService.delete(
      req.params.id,
      req.query.deleteFromK8s === 'true'
    );
    sendSuccess(res, result);
  })
);

/**
 * GET /api/container-deployments/docker/local-images
 * List local Docker images
 */
router.get(
  '/docker/local-images',
  [
    query('repository').optional().isString(),
    query('tag').optional().isString(),
    query('dangling').optional().isBoolean(),
  ],
  asyncHandler(async (req, res) => {
    const filter = {
      repository: req.query.repository,
      tag: req.query.tag,
      dangling: req.query.dangling === 'true' ? true : req.query.dangling === 'false' ? false : undefined,
    };
    const images = await containerDeploymentService.listLocalImages(filter);
    sendSuccess(res, { images });
  })
);

/**
 * GET /api/container-deployments/docker/containers
 * List Docker containers
 */
router.get(
  '/docker/containers',
  [
    query('all').optional().isBoolean(),
    query('status').optional().isString(),
    query('name').optional().isString(),
    query('image').optional().isString(),
  ],
  asyncHandler(async (req, res) => {
    const options = {
      all: req.query.all === 'true',
      status: req.query.status,
      name: req.query.name,
      image: req.query.image,
    };
    const containers = await containerDeploymentService.listContainers(options);
    sendSuccess(res, { containers });
  })
);

/**
 * GET /api/container-deployments/docker/info
 * Get Docker system information
 */
router.get(
  '/docker/info',
  asyncHandler(async (req, res) => {
    const info = await containerDeploymentService.getDockerInfo();
    sendSuccess(res, info);
  })
);

/**
 * GET /api/container-deployments/docker/images/:imageId/inspect
 * Get detailed image information
 */
router.get(
  '/docker/images/:imageId/inspect',
  asyncHandler(async (req, res) => {
    const data = await containerDeploymentService.inspectImage(req.params.imageId);
    sendSuccess(res, { image: data });
  })
);

/**
 * GET /api/container-deployments/docker/containers/:containerId/inspect
 * Get detailed container information
 */
router.get(
  '/docker/containers/:containerId/inspect',
  asyncHandler(async (req, res) => {
    const data = await containerDeploymentService.inspectContainer(req.params.containerId);
    sendSuccess(res, { container: data });
  })
);

/**
 * GET /api/container-deployments/docker/containers/:containerId/logs
 * Get container logs
 */
router.get(
  '/docker/containers/:containerId/logs',
  [
    query('tail').optional().isInt({ min: 1, max: 10000 }),
    query('since').optional().isString(),
    query('timestamps').optional().isBoolean(),
  ],
  asyncHandler(async (req, res) => {
    const options = {
      tail: req.query.tail ? parseInt(req.query.tail) : 100,
      since: req.query.since,
      timestamps: req.query.timestamps === 'true',
    };
    const logs = await containerDeploymentService.getContainerLogs(req.params.containerId, options);
    sendSuccess(res, { logs });
  })
);

/**
 * GET /api/container-deployments/docker/images/check
 * Check if an image exists locally
 */
router.get(
  '/docker/images/check',
  [
    query('name').isString(),
    query('tag').optional().isString(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const result = await containerDeploymentService.imageExists(req.query.name, req.query.tag || 'latest');
    sendSuccess(res, result);
  })
);

/**
 * GET /api/container-deployments/docker/containers/check
 * Check if a container exists
 */
router.get(
  '/docker/containers/check',
  [
    query('name').isString(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const result = await containerDeploymentService.containerExists(req.query.name);
    sendSuccess(res, result);
  })
);

/**
 * POST /api/container-deployments/registry/check-image
 * Check if an image exists in a remote registry
 */
router.post(
  '/registry/check-image',
  [
    body('registryType').isIn(['ecr', 'acr', 'gcr', 'docker-hub', 'private']),
    body('imageUri').isString(),
    body('credentialId').optional().isUUID(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const result = await containerDeploymentService.checkRemoteImage(
      req.body.registryType,
      req.body.imageUri,
      req.body.credentialId
    );
    sendSuccess(res, result);
  })
);

/**
 * GET /api/container-deployments/registries/:credentialId
 * List available registries for a credential
 */
router.get(
  '/registries/:credentialId',
  [param('credentialId').isUUID()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const registries = await containerDeploymentService.listRegistries(req.params.credentialId);
    sendSuccess(res, { registries });
  })
);

// ==========================================
// KUBERNETES MANAGEMENT ROUTES
// ==========================================

/**
 * GET /api/container-deployments/k8s/context
 * Get current kubectl context
 */
router.get(
  '/k8s/context',
  asyncHandler(async (req, res) => {
    const context = await containerDeploymentService.getKubectlContext();
    sendSuccess(res, { context });
  })
);

/**
 * POST /api/container-deployments/k8s/context
 * Switch kubectl context
 */
router.post(
  '/k8s/context',
  [body('contextName').isString().trim().notEmpty()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const context = await containerDeploymentService.switchContext(req.body.contextName);
    sendSuccess(res, { context });
  })
);

/**
 * GET /api/container-deployments/k8s/namespaces
 * List all namespaces
 */
router.get(
  '/k8s/namespaces',
  asyncHandler(async (req, res) => {
    const namespaces = await containerDeploymentService.listNamespaces();
    sendSuccess(res, { namespaces });
  })
);

/**
 * POST /api/container-deployments/k8s/namespaces
 * Create a new namespace
 */
router.post(
  '/k8s/namespaces',
  authorize(['admin', 'operator']),
  [
    body('name').isString().trim().matches(/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/),
    body('labels').optional().isObject(),
    body('annotations').optional().isObject(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const result = await containerDeploymentService.createNamespace(
      req.body.name,
      req.body.labels,
      req.body.annotations
    );
    sendSuccess(res, result, 201);
  })
);

/**
 * DELETE /api/container-deployments/k8s/namespaces/:name
 * Delete a namespace
 */
router.delete(
  '/k8s/namespaces/:name',
  authorize(['admin']),
  asyncHandler(async (req, res) => {
    const result = await containerDeploymentService.deleteNamespace(req.params.name);
    sendSuccess(res, result);
  })
);

/**
 * GET /api/container-deployments/k8s/namespaces/:namespace/deployments
 * List deployments in a namespace
 */
router.get(
  '/k8s/namespaces/:namespace/deployments',
  asyncHandler(async (req, res) => {
    const deployments = await containerDeploymentService.listDeploymentsInNamespace(req.params.namespace);
    sendSuccess(res, { deployments });
  })
);

/**
 * GET /api/container-deployments/k8s/namespaces/:namespace/services
 * List services in a namespace
 */
router.get(
  '/k8s/namespaces/:namespace/services',
  asyncHandler(async (req, res) => {
    const services = await containerDeploymentService.listServicesInNamespace(req.params.namespace);
    sendSuccess(res, { services });
  })
);

/**
 * GET /api/container-deployments/k8s/namespaces/:namespace/pods
 * List pods in a namespace
 */
router.get(
  '/k8s/namespaces/:namespace/pods',
  asyncHandler(async (req, res) => {
    const pods = await containerDeploymentService.listPodsInNamespace(req.params.namespace);
    sendSuccess(res, { pods });
  })
);

/**
 * GET /api/container-deployments/k8s/namespaces/:namespace/pods/:pod/logs
 * Get pod logs
 */
router.get(
  '/k8s/namespaces/:namespace/pods/:pod/logs',
  asyncHandler(async (req, res) => {
    const logs = await containerDeploymentService.getPodLogs(
      req.params.namespace,
      req.params.pod,
      {
        container: req.query.container,
        tail: parseInt(req.query.tail) || 100,
        previous: req.query.previous === 'true',
      }
    );
    sendSuccess(res, logs);
  })
);

/**
 * GET /api/container-deployments/k8s/namespaces/:namespace/events
 * Get events in a namespace
 */
router.get(
  '/k8s/namespaces/:namespace/events',
  asyncHandler(async (req, res) => {
    const events = await containerDeploymentService.getEvents(
      req.params.namespace,
      parseInt(req.query.limit) || 50
    );
    sendSuccess(res, { events });
  })
);

/**
 * GET /api/container-deployments/k8s/namespaces/:namespace/configmaps
 * List configmaps in a namespace
 */
router.get(
  '/k8s/namespaces/:namespace/configmaps',
  asyncHandler(async (req, res) => {
    const configmaps = await containerDeploymentService.listConfigMaps(req.params.namespace);
    sendSuccess(res, { configmaps });
  })
);

/**
 * GET /api/container-deployments/k8s/namespaces/:namespace/secrets
 * List secrets in a namespace (names only)
 */
router.get(
  '/k8s/namespaces/:namespace/secrets',
  asyncHandler(async (req, res) => {
    const secrets = await containerDeploymentService.listSecrets(req.params.namespace);
    sendSuccess(res, { secrets });
  })
);

/**
 * GET /api/container-deployments/k8s/namespaces/:namespace/resources
 * Get resource usage for a namespace
 */
router.get(
  '/k8s/namespaces/:namespace/resources',
  asyncHandler(async (req, res) => {
    const resources = await containerDeploymentService.getResourceUsage(req.params.namespace);
    sendSuccess(res, resources);
  })
);

/**
 * POST /api/container-deployments/k8s/namespaces/:namespace/describe
 * Describe a K8s resource
 */
router.post(
  '/k8s/namespaces/:namespace/describe',
  [
    body('resourceType').isIn(['deployment', 'service', 'pod', 'configmap', 'secret', 'ingress']),
    body('name').isString().trim().notEmpty(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const result = await containerDeploymentService.describeResource(
      req.body.resourceType,
      req.body.name,
      req.params.namespace
    );
    sendSuccess(res, result);
  })
);

/**
 * POST /api/container-deployments/k8s/quick-deploy
 * Quick deploy an image to K8s
 */
router.post(
  '/k8s/quick-deploy',
  authorize(['admin', 'operator']),
  [
    body('imageName').isString().trim().notEmpty(),
    body('imageTag').optional().isString(),
    body('deploymentName').optional().isString(),
    body('namespace').optional().isString(),
    body('replicas').optional().isInt({ min: 1, max: 100 }),
    body('containerPort').optional().isInt({ min: 1, max: 65535 }),
    body('servicePort').optional().isInt({ min: 1, max: 65535 }),
    body('serviceType').optional().isIn(['ClusterIP', 'NodePort', 'LoadBalancer']),
    body('createService').optional().isBoolean(),
    body('envVars').optional().isArray(),
    body('resourceRequests').optional().isObject(),
    body('resourceLimits').optional().isObject(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const result = await containerDeploymentService.quickDeploy(req.body);
    sendSuccess(res, result, 201);
  })
);

/**
 * POST /api/container-deployments/k8s/apply-yaml
 * Apply custom YAML manifest to K8s
 */
router.post(
  '/k8s/apply-yaml',
  authorize(['admin', 'operator']),
  [
    body('yamlContent').isString().trim().notEmpty().withMessage('YAML content is required'),
    body('namespace').optional().isString(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const result = await containerDeploymentService.applyCustomYaml(
      req.body.yamlContent,
      req.body.namespace
    );
    sendSuccess(res, result, 201);
  })
);

/**
 * DELETE /api/container-deployments/k8s/namespaces/:namespace/deployments/:name
 * Delete a deployment
 */
router.delete(
  '/k8s/namespaces/:namespace/deployments/:name',
  authorize(['admin', 'operator']),
  asyncHandler(async (req, res) => {
    const result = await containerDeploymentService.deleteDeployment(
      req.params.name,
      req.params.namespace,
      req.query.deleteService !== 'false'
    );
    sendSuccess(res, result);
  })
);

/**
 * POST /api/container-deployments/k8s/namespaces/:namespace/deployments/:name/restart
 * Restart a deployment
 */
router.post(
  '/k8s/namespaces/:namespace/deployments/:name/restart',
  authorize(['admin', 'operator']),
  asyncHandler(async (req, res) => {
    const result = await containerDeploymentService.restartDeployment(
      req.params.name,
      req.params.namespace
    );
    sendSuccess(res, result);
  })
);

/**
 * GET /api/container-deployments/k8s/namespaces/:namespace/deployments/:name/rollout-status
 * Get deployment rollout status
 */
router.get(
  '/k8s/namespaces/:namespace/deployments/:name/rollout-status',
  asyncHandler(async (req, res) => {
    const result = await containerDeploymentService.getRolloutStatus(
      req.params.name,
      req.params.namespace
    );
    sendSuccess(res, result);
  })
);

/**
 * POST /api/container-deployments/k8s/port-forward
 * Get port forward command
 */
router.post(
  '/k8s/port-forward',
  [
    body('resourceType').isIn(['pod', 'service', 'deployment']),
    body('name').isString().trim().notEmpty(),
    body('namespace').isString().trim().notEmpty(),
    body('localPort').isInt({ min: 1, max: 65535 }),
    body('targetPort').isInt({ min: 1, max: 65535 }),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const result = await containerDeploymentService.portForward(
      req.body.resourceType,
      req.body.name,
      req.body.namespace,
      req.body.localPort,
      req.body.targetPort
    );
    sendSuccess(res, result);
  })
);

// ============================================
// Cloud Provider Registry & Cluster Routes
// ============================================

/**
 * GET /api/container-deployments/cloud/registries/:credentialId
 * List container registries for a cloud credential
 */
router.get(
  '/cloud/registries/:credentialId',
  [
    param('credentialId').isUUID(),
    query('region').optional().isString(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const registries = await containerDeploymentService.listRegistries(
      req.params.credentialId,
      { region: req.query.region }
    );
    sendSuccess(res, { registries });
  })
);

/**
 * GET /api/container-deployments/cloud/registries/:credentialId/images
 * List images in a cloud registry
 */
router.get(
  '/cloud/registries/:credentialId/images',
  [
    param('credentialId').isUUID(),
    query('registryUri').isString().trim().notEmpty(),
    query('region').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 200 }),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const images = await containerDeploymentService.listRegistryImages(
      req.params.credentialId,
      req.query.registryUri,
      { region: req.query.region, limit: parseInt(req.query.limit) || 50 }
    );
    sendSuccess(res, { images });
  })
);

/**
 * GET /api/container-deployments/cloud/clusters/:credentialId
 * List Kubernetes clusters for a cloud credential
 */
router.get(
  '/cloud/clusters/:credentialId',
  [
    param('credentialId').isUUID(),
    query('region').optional().isString(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const clusters = await containerDeploymentService.listClusters(
      req.params.credentialId,
      { region: req.query.region }
    );
    sendSuccess(res, { clusters });
  })
);

/**
 * GET /api/container-deployments/cloud/regions/:credentialId
 * Get available regions for a cloud credential
 */
router.get(
  '/cloud/regions/:credentialId',
  [param('credentialId').isUUID()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const regions = await containerDeploymentService.getAvailableRegions(req.params.credentialId);
    sendSuccess(res, { regions });
  })
);

/**
 * POST /api/container-deployments/cloud/clusters/:credentialId/connect
 * Connect to a cloud Kubernetes cluster
 */
router.post(
  '/cloud/clusters/:credentialId/connect',
  authorize(['admin', 'operator']),
  [
    param('credentialId').isUUID(),
    body('clusterName').isString().trim().notEmpty(),
    body('region').optional().isString(),
    body('zone').optional().isString(),
    body('resourceGroup').optional().isString(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const result = await containerDeploymentService.connectToCluster(
      req.params.credentialId,
      req.body.clusterName,
      {
        region: req.body.region,
        zone: req.body.zone,
        resourceGroup: req.body.resourceGroup,
      }
    );
    sendSuccess(res, result);
  })
);

/**
 * POST /api/container-deployments/cloud/registries/:credentialId/authenticate
 * Authenticate with a cloud container registry
 */
router.post(
  '/cloud/registries/:credentialId/authenticate',
  authorize(['admin', 'operator']),
  [
    param('credentialId').isUUID(),
    body('registryUri').isString().trim().notEmpty(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const result = await containerDeploymentService.authenticateToRegistry(
      req.params.credentialId,
      req.body.registryUri
    );
    sendSuccess(res, result);
  })
);

/**
 * POST /api/container-deployments/cloud/registries/:credentialId/pull
 * Pull an image from cloud registry to local Docker
 */
router.post(
  '/cloud/registries/:credentialId/pull',
  authorize(['admin', 'operator']),
  [
    param('credentialId').isUUID(),
    body('imageUri').isString().trim().notEmpty(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const result = await containerDeploymentService.pullFromRegistry(
      req.params.credentialId,
      req.body.imageUri
    );
    sendSuccess(res, result);
  })
);

/**
 * POST /api/container-deployments/cloud/registries/:credentialId/push
 * Push a local image to cloud registry
 */
router.post(
  '/cloud/registries/:credentialId/push',
  authorize(['admin', 'operator']),
  [
    param('credentialId').isUUID(),
    body('localImage').isString().trim().notEmpty(),
    body('targetUri').isString().trim().notEmpty(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const result = await containerDeploymentService.pushToCloudRegistry(
      req.params.credentialId,
      req.body.localImage,
      req.body.targetUri
    );
    sendSuccess(res, result);
  })
);

// ==========================================
// STORAGE MANAGEMENT ROUTES
// ==========================================

/**
 * GET /api/container-deployments/storage/classes
 * Get all StorageClasses in the cluster
 */
router.get(
  '/storage/classes',
  asyncHandler(async (req, res) => {
    const storageClasses = await containerDeploymentService.getStorageClasses();
    sendSuccess(res, { storageClasses });
  })
);

/**
 * GET /api/container-deployments/storage/classes/templates
 * Get StorageClass templates for common cloud providers
 */
router.get(
  '/storage/classes/templates',
  asyncHandler(async (req, res) => {
    const templates = containerDeploymentService.getStorageClassTemplates();
    sendSuccess(res, { templates });
  })
);

/**
 * POST /api/container-deployments/storage/classes
 * Create a new StorageClass
 */
router.post(
  '/storage/classes',
  [
    body('name').isString().notEmpty().withMessage('Name is required'),
    body('provisioner').isString().notEmpty().withMessage('Provisioner is required'),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const result = await containerDeploymentService.createStorageClass(req.body);
    sendSuccess(res, result);
  })
);

/**
 * DELETE /api/container-deployments/storage/classes/:name
 * Delete a StorageClass
 */
router.delete(
  '/storage/classes/:name',
  [param('name').isString().notEmpty()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const result = await containerDeploymentService.deleteStorageClass(req.params.name);
    sendSuccess(res, result);
  })
);

/**
 * GET /api/container-deployments/storage/pvcs
 * Get all PersistentVolumeClaims
 */
router.get(
  '/storage/pvcs',
  asyncHandler(async (req, res) => {
    const namespace = req.query.namespace || null;
    const pvcs = await containerDeploymentService.getPVCs(namespace);
    sendSuccess(res, { pvcs });
  })
);

/**
 * POST /api/container-deployments/storage/pvcs
 * Create a new PersistentVolumeClaim
 */
router.post(
  '/storage/pvcs',
  [
    body('name').isString().notEmpty().withMessage('Name is required'),
    body('namespace').isString().notEmpty().withMessage('Namespace is required'),
    body('storageClass').isString().notEmpty().withMessage('StorageClass is required'),
    body('storage').isString().notEmpty().withMessage('Storage size is required'),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const result = await containerDeploymentService.createPVC(req.body);
    sendSuccess(res, result);
  })
);

/**
 * DELETE /api/container-deployments/storage/pvcs/:namespace/:name
 * Delete a PersistentVolumeClaim
 */
router.delete(
  '/storage/pvcs/:namespace/:name',
  [
    param('namespace').isString().notEmpty(),
    param('name').isString().notEmpty(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const result = await containerDeploymentService.deletePVC(req.params.name, req.params.namespace);
    sendSuccess(res, result);
  })
);

/**
 * GET /api/container-deployments/storage/pvs
 * Get all PersistentVolumes
 */
router.get(
  '/storage/pvs',
  asyncHandler(async (req, res) => {
    const pvs = await containerDeploymentService.getPVs();
    sendSuccess(res, { pvs });
  })
);

/**
 * GET /api/container-deployments/storage/csi-drivers
 * Check CSI driver installation status
 */
router.get(
  '/storage/csi-drivers',
  asyncHandler(async (req, res) => {
    const status = await containerDeploymentService.checkCSIDriverStatus();
    sendSuccess(res, status);
  })
);

/**
 * GET /api/container-deployments/storage/addons/:credentialId
 * Get EKS add-ons for a cluster
 */
router.get(
  '/storage/addons/:credentialId',
  [param('credentialId').isUUID()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const { clusterName, region } = req.query;
    if (!clusterName) {
      return sendError(res, 'clusterName query parameter is required', 400);
    }

    const result = await containerDeploymentService.getEKSAddons(
      req.params.credentialId,
      clusterName,
      region
    );
    sendSuccess(res, result);
  })
);

/**
 * POST /api/container-deployments/storage/addons/ebs-csi
 * Install EBS CSI Driver add-on
 */
router.post(
  '/storage/addons/ebs-csi',
  [
    body('credentialId').isUUID().withMessage('Valid credentialId is required'),
    body('clusterName').isString().notEmpty().withMessage('clusterName is required'),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const { credentialId, clusterName, region, serviceAccountRoleArn } = req.body;
    const result = await containerDeploymentService.installEBSCSIDriver(
      credentialId,
      clusterName,
      region,
      serviceAccountRoleArn
    );
    sendSuccess(res, result);
  })
);

/**
 * POST /api/container-deployments/storage/addons/efs-csi
 * Install EFS CSI Driver via Helm
 */
router.post(
  '/storage/addons/efs-csi',
  asyncHandler(async (req, res) => {
    const result = await containerDeploymentService.installEFSCSIDriver();
    sendSuccess(res, result);
  })
);

/**
 * GET /api/container-deployments/storage/efs/:credentialId
 * Get EFS file systems for the account
 */
router.get(
  '/storage/efs/:credentialId',
  [param('credentialId').isUUID()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const result = await containerDeploymentService.getEFSFileSystems(
      req.params.credentialId,
      req.query.region
    );
    sendSuccess(res, { fileSystems: result });
  })
);

// ==========================================
// PRIVATE CLUSTER SUPPORT ROUTES
// ==========================================

/**
 * GET /api/container-deployments/cluster/:credentialId/endpoint-config
 * Get EKS cluster endpoint configuration
 */
router.get(
  '/cluster/:credentialId/endpoint-config',
  [param('credentialId').isUUID()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const { clusterName, region } = req.query;
    if (!clusterName) {
      return sendError(res, 'clusterName query parameter is required', 400);
    }

    const result = await containerDeploymentService.getClusterEndpointConfig(
      req.params.credentialId,
      clusterName,
      region
    );
    sendSuccess(res, result);
  })
);

/**
 * PUT /api/container-deployments/cluster/:credentialId/endpoint-config
 * Update EKS cluster endpoint configuration
 */
router.put(
  '/cluster/:credentialId/endpoint-config',
  [
    param('credentialId').isUUID(),
    body('clusterName').isString().notEmpty(),
    body('endpointPublicAccess').isBoolean(),
    body('endpointPrivateAccess').isBoolean(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const { clusterName, region, endpointPublicAccess, endpointPrivateAccess, publicAccessCidrs } = req.body;

    const result = await containerDeploymentService.updateClusterEndpointConfig(
      req.params.credentialId,
      clusterName,
      region,
      { endpointPublicAccess, endpointPrivateAccess, publicAccessCidrs }
    );
    sendSuccess(res, result);
  })
);

/**
 * GET /api/container-deployments/vpc/:credentialId/list
 * List all VPCs in the region
 */
router.get(
  '/vpc/:credentialId/list',
  [param('credentialId').isUUID()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const { region } = req.query;
    const result = await containerDeploymentService.listVpcs(
      req.params.credentialId,
      region
    );
    sendSuccess(res, { vpcs: result });
  })
);

/**
 * GET /api/container-deployments/vpc/:credentialId/subnets
 * Get VPC subnets with tags
 */
router.get(
  '/vpc/:credentialId/subnets',
  [param('credentialId').isUUID()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const { region, vpcId, subnetIds } = req.query;
    const subnetIdArray = subnetIds ? subnetIds.split(',') : null;

    const result = await containerDeploymentService.getSubnets(
      req.params.credentialId,
      region,
      vpcId,
      subnetIdArray
    );
    sendSuccess(res, { subnets: result });
  })
);

/**
 * PUT /api/container-deployments/vpc/:credentialId/subnets/:subnetId/tags
 * Update subnet tags for load balancer configuration
 */
router.put(
  '/vpc/:credentialId/subnets/:subnetId/tags',
  [
    param('credentialId').isUUID(),
    param('subnetId').isString().notEmpty(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const { region, tagsToAdd, tagsToRemove } = req.body;

    const result = await containerDeploymentService.updateSubnetTags(
      req.params.credentialId,
      region,
      req.params.subnetId,
      tagsToAdd || {},
      tagsToRemove || []
    );
    sendSuccess(res, result);
  })
);

/**
 * GET /api/container-deployments/vpc/:credentialId/security-groups
 * Get security groups
 */
router.get(
  '/vpc/:credentialId/security-groups',
  [param('credentialId').isUUID()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const { region, vpcId, securityGroupIds } = req.query;
    const sgIdArray = securityGroupIds ? securityGroupIds.split(',') : null;

    const result = await containerDeploymentService.getSecurityGroups(
      req.params.credentialId,
      region,
      vpcId,
      sgIdArray
    );
    sendSuccess(res, { securityGroups: result });
  })
);

/**
 * GET /api/container-deployments/vpc/:credentialId/load-balancers
 * Get load balancers in VPC
 */
router.get(
  '/vpc/:credentialId/load-balancers',
  [param('credentialId').isUUID()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const { region, vpcId } = req.query;

    const result = await containerDeploymentService.getLoadBalancers(
      req.params.credentialId,
      region,
      vpcId
    );
    sendSuccess(res, { loadBalancers: result });
  })
);

/**
 * GET /api/container-deployments/vpc/:credentialId/details
 * Get VPC details
 */
router.get(
  '/vpc/:credentialId/details',
  [param('credentialId').isUUID()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const { region, vpcId } = req.query;
    if (!vpcId) {
      return sendError(res, 'vpcId query parameter is required', 400);
    }

    const result = await containerDeploymentService.getVpcDetails(
      req.params.credentialId,
      region,
      vpcId
    );
    sendSuccess(res, result);
  })
);

/**
 * GET /api/container-deployments/ec2/:credentialId/instances
 * Get EC2 instances (for SSM target selection)
 */
router.get(
  '/ec2/:credentialId/instances',
  [param('credentialId').isUUID()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const { region, vpcId, filters } = req.query;
    const result = await containerDeploymentService.getEC2Instances(
      req.params.credentialId,
      region,
      { vpcId, filters }
    );
    sendSuccess(res, { instances: result });
  })
);

/**
 * GET /api/container-deployments/templates/internal-lb
 * Get internal load balancer templates
 */
router.get(
  '/templates/internal-lb',
  asyncHandler(async (req, res) => {
    const templates = containerDeploymentService.getInternalLoadBalancerTemplates();
    sendSuccess(res, { templates });
  })
);

// ==========================================
// PHASE 4: OPERATIONS ENHANCEMENTS ROUTES
// ==========================================

/**
 * GET /api/container-deployments/k8s/configmaps
 * Get ConfigMaps in a namespace
 */
router.get(
  '/k8s/configmaps',
  asyncHandler(async (req, res) => {
    const { namespace = 'default' } = req.query;
    const configMaps = await containerDeploymentService.getConfigMaps(namespace);
    sendSuccess(res, { configMaps });
  })
);

/**
 * GET /api/container-deployments/k8s/configmaps/:name
 * Get ConfigMap details
 */
router.get(
  '/k8s/configmaps/:name',
  asyncHandler(async (req, res) => {
    const { namespace = 'default' } = req.query;
    const configMap = await containerDeploymentService.getConfigMapDetails(req.params.name, namespace);
    sendSuccess(res, configMap);
  })
);

/**
 * POST /api/container-deployments/k8s/configmaps
 * Create a ConfigMap
 */
router.post(
  '/k8s/configmaps',
  [
    body('name').isString().notEmpty(),
    body('namespace').isString().notEmpty(),
    body('data').isObject(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const { name, namespace, data, labels } = req.body;
    const result = await containerDeploymentService.createConfigMap(name, namespace, data, labels);
    sendSuccess(res, result);
  })
);

/**
 * PUT /api/container-deployments/k8s/configmaps/:name
 * Update a ConfigMap
 */
router.put(
  '/k8s/configmaps/:name',
  [
    body('namespace').isString().notEmpty(),
    body('data').isObject(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const { namespace, data } = req.body;
    const result = await containerDeploymentService.updateConfigMap(req.params.name, namespace, data);
    sendSuccess(res, result);
  })
);

/**
 * DELETE /api/container-deployments/k8s/configmaps/:name
 * Delete a ConfigMap
 */
router.delete(
  '/k8s/configmaps/:name',
  asyncHandler(async (req, res) => {
    const { namespace = 'default' } = req.query;
    const result = await containerDeploymentService.deleteConfigMap(req.params.name, namespace);
    sendSuccess(res, result);
  })
);

/**
 * GET /api/container-deployments/k8s/secrets
 * Get Secrets in a namespace (metadata only)
 */
router.get(
  '/k8s/secrets',
  asyncHandler(async (req, res) => {
    const { namespace = 'default' } = req.query;
    const secrets = await containerDeploymentService.getSecrets(namespace);
    sendSuccess(res, { secrets });
  })
);

/**
 * GET /api/container-deployments/k8s/secrets/:name
 * Get Secret details
 */
router.get(
  '/k8s/secrets/:name',
  asyncHandler(async (req, res) => {
    const { namespace = 'default', showValues = 'false' } = req.query;
    const secret = await containerDeploymentService.getSecretDetails(
      req.params.name, 
      namespace, 
      showValues === 'true'
    );
    sendSuccess(res, secret);
  })
);

/**
 * POST /api/container-deployments/k8s/secrets
 * Create a Secret
 */
router.post(
  '/k8s/secrets',
  [
    body('name').isString().notEmpty(),
    body('namespace').isString().notEmpty(),
    body('data').isObject(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const { name, namespace, data, type, labels } = req.body;
    const result = await containerDeploymentService.createSecret(name, namespace, data, type, labels);
    sendSuccess(res, result);
  })
);

/**
 * DELETE /api/container-deployments/k8s/secrets/:name
 * Delete a Secret
 */
router.delete(
  '/k8s/secrets/:name',
  asyncHandler(async (req, res) => {
    const { namespace = 'default' } = req.query;
    const result = await containerDeploymentService.deleteSecret(req.params.name, namespace);
    sendSuccess(res, result);
  })
);

/**
 * GET /api/container-deployments/k8s/metrics-server/status
 * Check Metrics Server status
 */
router.get(
  '/k8s/metrics-server/status',
  asyncHandler(async (req, res) => {
    const status = await containerDeploymentService.checkMetricsServer();
    sendSuccess(res, status);
  })
);

/**
 * POST /api/container-deployments/k8s/metrics-server/install
 * Install Metrics Server
 */
router.post(
  '/k8s/metrics-server/install',
  asyncHandler(async (req, res) => {
    const result = await containerDeploymentService.installMetricsServer();
    sendSuccess(res, result);
  })
);

/**
 * GET /api/container-deployments/k8s/metrics/nodes
 * Get node resource metrics
 */
router.get(
  '/k8s/metrics/nodes',
  asyncHandler(async (req, res) => {
    const metrics = await containerDeploymentService.getNodeMetrics();
    sendSuccess(res, { metrics });
  })
);

/**
 * GET /api/container-deployments/k8s/metrics/pods
 * Get pod resource metrics
 */
router.get(
  '/k8s/metrics/pods',
  asyncHandler(async (req, res) => {
    const { namespace = 'default' } = req.query;
    const metrics = await containerDeploymentService.getPodMetrics(namespace);
    sendSuccess(res, { metrics });
  })
);

/**
 * GET /api/container-deployments/k8s/cluster-autoscaler/status
 * Check Cluster Autoscaler status
 */
router.get(
  '/k8s/cluster-autoscaler/status',
  asyncHandler(async (req, res) => {
    const status = await containerDeploymentService.checkClusterAutoscaler();
    sendSuccess(res, status);
  })
);

/**
 * POST /api/container-deployments/k8s/cluster-autoscaler/install
 * Install Cluster Autoscaler
 */
router.post(
  '/k8s/cluster-autoscaler/install',
  [
    body('clusterName').isString().notEmpty(),
    body('region').isString().notEmpty(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const { clusterName, region } = req.body;
    const result = await containerDeploymentService.installClusterAutoscaler(clusterName, region);
    sendSuccess(res, result);
  })
);

/**
 * GET /api/container-deployments/k8s/cluster-autoscaler/manifest
 * Get Cluster Autoscaler manifest
 */
router.get(
  '/k8s/cluster-autoscaler/manifest',
  asyncHandler(async (req, res) => {
    const { clusterName, region, minNodes = 1, maxNodes = 10 } = req.query;
    const manifest = containerDeploymentService.getClusterAutoscalerManifest(
      clusterName, 
      region, 
      parseInt(minNodes), 
      parseInt(maxNodes)
    );
    sendSuccess(res, { manifest });
  })
);

/**
 * GET /api/container-deployments/k8s/cluster-autoscaler/iam-policy
 * Get Cluster Autoscaler IAM policy
 */
router.get(
  '/k8s/cluster-autoscaler/iam-policy',
  asyncHandler(async (req, res) => {
    const policy = containerDeploymentService.getClusterAutoscalerIAMPolicy();
    sendSuccess(res, { policy });
  })
);

/**
 * GET /api/container-deployments/k8s/pods/problematic
 * Get problematic pods
 */
router.get(
  '/k8s/pods/problematic',
  asyncHandler(async (req, res) => {
    const { namespace = 'all' } = req.query;
    const pods = await containerDeploymentService.getProblematicPods(namespace);
    sendSuccess(res, { pods });
  })
);

/**
 * POST /api/container-deployments/k8s/pods/bulk-delete
 * Bulk delete pods
 */
router.post(
  '/k8s/pods/bulk-delete',
  [
    body('pods').isArray().notEmpty(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const { pods } = req.body;
    const result = await containerDeploymentService.bulkDeletePods(pods);
    sendSuccess(res, result);
  })
);

/**
 * GET /api/container-deployments/k8s/nodes/health
 * Get node health status
 */
router.get(
  '/k8s/nodes/health',
  asyncHandler(async (req, res) => {
    const nodes = await containerDeploymentService.getNodeHealth();
    sendSuccess(res, { nodes });
  })
);

/**
 * GET /api/container-deployments/troubleshooting/:issueType
 * Get troubleshooting checklist
 */
router.get(
  '/troubleshooting/:issueType',
  asyncHandler(async (req, res) => {
    const checklist = containerDeploymentService.getTroubleshootingChecklist(req.params.issueType);
    sendSuccess(res, { checklist, issueType: req.params.issueType });
  })
);

// ============================================================================
// PHASE 5: ADVANCED FEATURES - HELM CHART DEPLOYMENT
// ============================================================================

/**
 * GET /api/container-deployments/helm/repos
 * List configured Helm repositories
 */
router.get(
  '/helm/repos',
  asyncHandler(async (req, res) => {
    const repos = await containerDeploymentService.listHelmRepos();
    sendSuccess(res, { repos });
  })
);

/**
 * POST /api/container-deployments/helm/repos
 * Add a Helm repository
 */
router.post(
  '/helm/repos',
  [
    body('name').isString().notEmpty().withMessage('Repository name is required'),
    body('url').isURL().withMessage('Valid repository URL is required'),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const { name, url, username, password } = req.body;
    const result = await containerDeploymentService.addHelmRepo(name, url, username, password);
    sendSuccess(res, result, 201);
  })
);

/**
 * DELETE /api/container-deployments/helm/repos/:name
 * Remove a Helm repository
 */
router.delete(
  '/helm/repos/:name',
  asyncHandler(async (req, res) => {
    const result = await containerDeploymentService.removeHelmRepo(req.params.name);
    sendSuccess(res, result);
  })
);

/**
 * GET /api/container-deployments/helm/charts/search
 * Search for Helm charts
 */
router.get(
  '/helm/charts/search',
  asyncHandler(async (req, res) => {
    const { keyword = '', repo = '' } = req.query;
    const charts = await containerDeploymentService.searchHelmCharts(keyword, repo);
    sendSuccess(res, { charts });
  })
);

/**
 * GET /api/container-deployments/helm/charts/:repoName/:chartName/versions
 * Get available versions for a chart
 */
router.get(
  '/helm/charts/:repoName/:chartName/versions',
  asyncHandler(async (req, res) => {
    const chartName = `${req.params.repoName}/${req.params.chartName}`;
    const versions = await containerDeploymentService.getHelmChartVersions(chartName);
    sendSuccess(res, { versions });
  })
);

/**
 * GET /api/container-deployments/helm/charts/:repoName/:chartName/values
 * Get default values for a chart
 */
router.get(
  '/helm/charts/:repoName/:chartName/values',
  asyncHandler(async (req, res) => {
    const chartName = `${req.params.repoName}/${req.params.chartName}`;
    const { version } = req.query;
    const values = await containerDeploymentService.getHelmChartValues(chartName, version);
    sendSuccess(res, { values });
  })
);

/**
 * POST /api/container-deployments/helm/releases
 * Install a Helm chart
 */
router.post(
  '/helm/releases',
  [
    body('releaseName').isString().notEmpty().withMessage('Release name is required'),
    body('chartName').isString().notEmpty().withMessage('Chart name is required'),
    body('namespace').isString().notEmpty().withMessage('Namespace is required'),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const { releaseName, chartName, namespace, version, values, setValues, createNamespace } = req.body;
    const result = await containerDeploymentService.installHelmChart(
      releaseName, chartName, namespace, version, values, setValues, createNamespace
    );
    sendSuccess(res, result, 201);
  })
);

/**
 * PUT /api/container-deployments/helm/releases/:name
 * Upgrade a Helm release
 */
router.put(
  '/helm/releases/:name',
  [
    body('chartName').isString().notEmpty().withMessage('Chart name is required'),
    body('namespace').isString().notEmpty().withMessage('Namespace is required'),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const { chartName, namespace, version, values, setValues, reuseValues } = req.body;
    const result = await containerDeploymentService.upgradeHelmRelease(
      req.params.name, chartName, namespace, version, values, setValues, reuseValues
    );
    sendSuccess(res, result);
  })
);

/**
 * DELETE /api/container-deployments/helm/releases/:name
 * Uninstall a Helm release
 */
router.delete(
  '/helm/releases/:name',
  asyncHandler(async (req, res) => {
    const { namespace } = req.query;
    const result = await containerDeploymentService.uninstallHelmRelease(req.params.name, namespace);
    sendSuccess(res, result);
  })
);

/**
 * GET /api/container-deployments/helm/releases
 * List installed Helm releases
 */
router.get(
  '/helm/releases',
  asyncHandler(async (req, res) => {
    const { namespace = 'all', filter = '' } = req.query;
    const releases = await containerDeploymentService.listHelmReleases(namespace, filter);
    sendSuccess(res, { releases });
  })
);

/**
 * GET /api/container-deployments/helm/releases/:name/history
 * Get release history
 */
router.get(
  '/helm/releases/:name/history',
  asyncHandler(async (req, res) => {
    const { namespace } = req.query;
    const history = await containerDeploymentService.getHelmReleaseHistory(req.params.name, namespace);
    sendSuccess(res, { history });
  })
);

/**
 * POST /api/container-deployments/helm/releases/:name/rollback
 * Rollback a release to a previous revision
 */
router.post(
  '/helm/releases/:name/rollback',
  [
    body('revision').isInt({ min: 1 }).withMessage('Valid revision number is required'),
    body('namespace').isString().notEmpty().withMessage('Namespace is required'),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const { revision, namespace } = req.body;
    const result = await containerDeploymentService.rollbackHelmRelease(req.params.name, revision, namespace);
    sendSuccess(res, result);
  })
);

// ============================================================================
// PHASE 5: ADVANCED FEATURES - STATEFULSET WIZARD
// ============================================================================

/**
 * GET /api/container-deployments/k8s/statefulset-templates
 * Get pre-built StatefulSet templates
 */
router.get(
  '/k8s/statefulset-templates',
  asyncHandler(async (req, res) => {
    const templates = containerDeploymentService.getStatefulSetTemplates();
    sendSuccess(res, { templates });
  })
);

/**
 * POST /api/container-deployments/k8s/statefulsets
 * Create a StatefulSet
 */
router.post(
  '/k8s/statefulsets',
  [
    body('name').isString().notEmpty().withMessage('StatefulSet name is required'),
    body('namespace').isString().notEmpty().withMessage('Namespace is required'),
    body('template').isString().notEmpty().withMessage('Template name is required'),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const { name, namespace, template, replicas, storageSize, storageClass, customValues } = req.body;
    const result = await containerDeploymentService.createStatefulSet(
      name, namespace, template, replicas, storageSize, storageClass, customValues
    );
    sendSuccess(res, result, 201);
  })
);

/**
 * GET /api/container-deployments/k8s/statefulsets
 * List StatefulSets
 */
router.get(
  '/k8s/statefulsets',
  asyncHandler(async (req, res) => {
    const { namespace = 'default' } = req.query;
    const statefulsets = await containerDeploymentService.getStatefulSets(namespace);
    sendSuccess(res, { statefulsets });
  })
);

/**
 * GET /api/container-deployments/k8s/statefulsets/:namespace/:name
 * Get StatefulSet details
 */
router.get(
  '/k8s/statefulsets/:namespace/:name',
  asyncHandler(async (req, res) => {
    const details = await containerDeploymentService.getStatefulSetDetails(req.params.name, req.params.namespace);
    sendSuccess(res, { statefulset: details });
  })
);

/**
 * PUT /api/container-deployments/k8s/statefulsets/:namespace/:name/scale
 * Scale a StatefulSet
 */
router.put(
  '/k8s/statefulsets/:namespace/:name/scale',
  [
    body('replicas').isInt({ min: 0 }).withMessage('Valid replica count is required'),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const result = await containerDeploymentService.scaleStatefulSet(
      req.params.name, req.params.namespace, req.body.replicas
    );
    sendSuccess(res, result);
  })
);

/**
 * DELETE /api/container-deployments/k8s/statefulsets/:namespace/:name
 * Delete a StatefulSet
 */
router.delete(
  '/k8s/statefulsets/:namespace/:name',
  asyncHandler(async (req, res) => {
    const { deletePVCs = 'false' } = req.query;
    const result = await containerDeploymentService.deleteStatefulSet(
      req.params.name, req.params.namespace, deletePVCs === 'true'
    );
    sendSuccess(res, result);
  })
);

// ============================================================================
// PHASE 5: ADVANCED FEATURES - BASTION HOST INTEGRATION
// ============================================================================

/**
 * GET /api/container-deployments/bastion/guide
 * Get bastion host setup guide
 */
router.get(
  '/bastion/guide',
  asyncHandler(async (req, res) => {
    const { provider = 'aws', clusterName, region } = req.query;
    const guide = containerDeploymentService.getBastionSetupGuide(provider, clusterName, region);
    sendSuccess(res, { guide });
  })
);

/**
 * GET /api/container-deployments/kubectl-proxy/config
 * Generate kubectl proxy configuration
 */
router.get(
  '/kubectl-proxy/config',
  asyncHandler(async (req, res) => {
    const { clusterEndpoint, port = 8001 } = req.query;
    const config = containerDeploymentService.generateKubectlProxyConfig(clusterEndpoint, parseInt(port));
    sendSuccess(res, { config });
  })
);

/**
 * GET /api/container-deployments/ssh-tunnel/command
 * Generate SSH tunnel command
 */
router.get(
  '/ssh-tunnel/command',
  asyncHandler(async (req, res) => {
    const { bastionHost, bastionUser = 'ec2-user', clusterEndpoint, localPort = 6443 } = req.query;
    const command = containerDeploymentService.generateSSHTunnelCommand(
      bastionHost, bastionUser, clusterEndpoint, parseInt(localPort)
    );
    sendSuccess(res, { command });
  })
);

// ============================================================================
// PHASE 5: ADVANCED FEATURES - PORT FORWARDING
// ============================================================================

/**
 * POST /api/container-deployments/port-forwards
 * Start port forwarding
 */
router.post(
  '/port-forwards',
  [
    body('resourceType').isIn(['pod', 'service', 'deployment']).withMessage('Valid resource type is required'),
    body('resourceName').isString().notEmpty().withMessage('Resource name is required'),
    body('namespace').isString().notEmpty().withMessage('Namespace is required'),
    body('localPort').isInt({ min: 1, max: 65535 }).withMessage('Valid local port is required'),
    body('remotePort').isInt({ min: 1, max: 65535 }).withMessage('Valid remote port is required'),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const { resourceType, resourceName, namespace, localPort, remotePort, address } = req.body;
    const result = await containerDeploymentService.startPortForward(
      resourceType, resourceName, namespace, localPort, remotePort, address
    );
    sendSuccess(res, result, 201);
  })
);

/**
 * DELETE /api/container-deployments/port-forwards/:id
 * Stop port forwarding
 */
router.delete(
  '/port-forwards/:id',
  asyncHandler(async (req, res) => {
    const result = await containerDeploymentService.stopPortForward(req.params.id);
    sendSuccess(res, result);
  })
);

/**
 * GET /api/container-deployments/port-forwards
 * List active port forwards
 */
router.get(
  '/port-forwards',
  asyncHandler(async (req, res) => {
    const forwards = containerDeploymentService.listActivePortForwards();
    sendSuccess(res, { forwards });
  })
);

/**
 * GET /api/container-deployments/port-forwards/templates
 * Get common port forward templates
 */
router.get(
  '/port-forwards/templates',
  asyncHandler(async (req, res) => {
    const templates = containerDeploymentService.getPortForwardTemplates();
    sendSuccess(res, { templates });
  })
);

module.exports = router;
