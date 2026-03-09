const express = require('express');
const { body, validationResult } = require('express-validator');
const { Credential } = require('../models');
const { credentialService, awsService, logger } = require('../services');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, sendSuccess, sendError } = require('../middleware/errorHandler');

const router = express.Router();

// All credential routes require authentication
router.use(authenticate);

/**
 * POST /api/credentials
 * Add new AWS credentials with encryption
 */
router.post(
  '/',
  authorize(['admin', 'operator']),
  [
    body('name').trim().isLength({ min: 1, max: 100 }),
    body('cloudProvider').optional().isIn(['aws', 'azure', 'gcp', 'digitalocean', 'linode']),
    body('awsAccountId').trim().matches(/^\d{12}$/),
    body('accessKeyId').trim().isLength({ min: 1 }),
    body('secretAccessKey').trim().isLength({ min: 1 }),
    body('awsRegion').optional().trim().isIn([
      'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
      'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-central-1', 'eu-north-1',
      'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'ap-northeast-2', 'ap-south-1',
      'ca-central-1', 'sa-east-1', 'af-south-1', 'me-south-1'
    ]),
    body('description').optional().trim(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', errors.array());
    }

    const { name, awsAccountId, accessKeyId, secretAccessKey, awsRegion = 'us-east-1', description, cloudProvider = 'aws' } = req.body;

    try {
      // Encrypt credentials
      const encryptedCreds = credentialService.encryptCredentials({
        accessKeyId,
        secretAccessKey,
      });

      // Generate secret reference ID (using AWS Secrets Manager style for now)
      const secretRefId = `arn:aws:secretsmanager:${awsRegion}:${awsAccountId}:secret:zlaws/${name}-${Date.now()}`;

      // Create credential record
      const credential = await Credential.create({
        userId: req.user.id,
        name,
        cloudProvider,
        vaultType: 'aws-secrets', // Default to AWS Secrets Manager
        secretRefId,
        cloudAccountId: awsAccountId, // Required field
        awsAccountId,
        awsRegion,
        cloudRegion: awsRegion,
        encryptedAccessKeyId: encryptedCreds.encryptedAccessKeyId,
        encryptedSecretAccessKey: encryptedCreds.encryptedSecretAccessKey, // Fixed: was using encryptedAccessKeyId twice
        encryptionIv: encryptedCreds.encryptionIv,
        authTag: encryptedCreds.authTag, // Save authTag for GCM decryption
        description,
        isActive: true,
        isValid: null,
      });

      logger.info(`Credentials created: ${name}`, {
        credentialId: credential.id,
        userId: req.user.id,
      });

      sendSuccess(
        res,
        {
          credential: {
            id: credential.id,
            name: credential.name,
            awsAccountId: credential.awsAccountId,
            awsRegion: credential.awsRegion,
            description: credential.description,
            isValid: credential.isValid,
            isActive: credential.isActive,
            createdAt: credential.createdAt,
          },
        },
        201,
        'Credentials added successfully'
      );
    } catch (error) {
      logger.error('Failed to create credentials', error);
      sendError(res, 'Failed to add credentials', 500, 'CREDENTIAL_ERROR');
    }
  })
);

/**
 * POST /api/credentials/multi-cloud
 * Add new multi-cloud credentials (AWS, Azure, GCP, DigitalOcean, Linode)
 */
router.post(
  '/multi-cloud',
  authorize(['admin', 'operator']),
  [
    body('name').trim().isLength({ min: 1, max: 100 }),
    body('cloudProvider').isIn(['aws', 'azure', 'gcp', 'digitalocean', 'linode']),
    body('description').optional().trim(),
    body('region').optional().trim(),
    body('additionalRegions').optional().isArray(),
    // AWS fields
    body('accessKeyId').optional().trim(),
    body('secretAccessKey').optional().trim(),
    body('accountId').optional().trim(),
    // Azure fields
    body('clientId').optional().trim(),
    body('clientSecret').optional().trim(),
    body('tenantId').optional().trim(),
    body('subscriptionId').optional().trim(),
    // GCP fields
    body('serviceAccountKey').optional(),
    body('projectId').optional().trim(),
    // DigitalOcean/Linode fields
    body('apiToken').optional().trim(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', errors.array());
    }

    const { 
      name, 
      cloudProvider, 
      description, 
      region, 
      additionalRegions = [],
      // AWS
      accessKeyId,
      secretAccessKey,
      accountId,
      // Azure
      clientId,
      clientSecret,
      tenantId,
      subscriptionId,
      // GCP
      serviceAccountKey,
      projectId,
      // DO/Linode
      apiToken,
    } = req.body;

    try {
      // Build provider-specific credential object
      let credentialData = {};
      let cloudAccountId = '';
      let defaultRegion = '';
      let vaultType = 'aws-secrets';

      switch (cloudProvider) {
        case 'aws':
          if (!accessKeyId || !secretAccessKey) {
            return sendError(res, 'AWS credentials require accessKeyId and secretAccessKey', 400, 'VALIDATION_ERROR');
          }
          credentialData = { accessKeyId, secretAccessKey, region: region || 'us-east-1' };
          cloudAccountId = accountId || 'unknown';
          defaultRegion = region || 'us-east-1';
          vaultType = 'aws-secrets';
          break;

        case 'azure':
          if (!clientId || !clientSecret || !tenantId) {
            return sendError(res, 'Azure credentials require clientId, clientSecret, and tenantId', 400, 'VALIDATION_ERROR');
          }
          credentialData = { clientId, clientSecret, tenantId, subscriptionId, region: region || 'eastus' };
          cloudAccountId = subscriptionId || tenantId;
          defaultRegion = region || 'eastus';
          vaultType = 'azure-kv';
          break;

        case 'gcp':
          if (!serviceAccountKey) {
            return sendError(res, 'GCP credentials require serviceAccountKey', 400, 'VALIDATION_ERROR');
          }
          const parsedKey = typeof serviceAccountKey === 'string' 
            ? JSON.parse(serviceAccountKey) 
            : serviceAccountKey;
          credentialData = { serviceAccountKey: parsedKey, projectId: projectId || parsedKey.project_id, region: region || 'us-central1' };
          cloudAccountId = projectId || parsedKey.project_id;
          defaultRegion = region || 'us-central1';
          vaultType = 'gcp-secrets';
          break;

        case 'digitalocean':
          if (!apiToken) {
            return sendError(res, 'DigitalOcean credentials require apiToken', 400, 'VALIDATION_ERROR');
          }
          credentialData = { apiToken, region: region || 'nyc1' };
          cloudAccountId = 'digitalocean';
          defaultRegion = region || 'nyc1';
          vaultType = 'hashicorp-vault';
          break;

        case 'linode':
          if (!apiToken) {
            return sendError(res, 'Linode credentials require apiToken', 400, 'VALIDATION_ERROR');
          }
          credentialData = { apiToken, region: region || 'us-east' };
          cloudAccountId = 'linode';
          defaultRegion = region || 'us-east';
          vaultType = 'hashicorp-vault';
          break;

        default:
          return sendError(res, `Unsupported cloud provider: ${cloudProvider}`, 400, 'VALIDATION_ERROR');
      }

      // Encrypt the credential data
      const encryptedCreds = credentialService.encryptMultiCloudCredentials(cloudProvider, credentialData);

      // Generate secret reference ID
      const secretRefId = `${cloudProvider}:${defaultRegion}:secret:zlaws/${name}-${Date.now()}`;

      // Create credential record
      const credential = await Credential.create({
        userId: req.user.id,
        name,
        cloudProvider,
        vaultType,
        secretRefId,
        cloudAccountId,
        cloudRegion: defaultRegion,
        additionalRegions,
        encryptedCredentialData: encryptedCreds.encryptedCredentialData,
        credentialDataIv: encryptedCreds.credentialDataIv,
        credentialDataAuthTag: encryptedCreds.credentialDataAuthTag,
        description,
        isActive: true,
        isValid: null,
        // For AWS backward compatibility
        awsAccountId: cloudProvider === 'aws' ? accountId : null,
        awsRegion: cloudProvider === 'aws' ? defaultRegion : null,
      });

      logger.info(`Multi-cloud credentials created: ${name} (${cloudProvider})`, {
        credentialId: credential.id,
        userId: req.user.id,
        provider: cloudProvider,
      });

      sendSuccess(
        res,
        {
          credential: {
            id: credential.id,
            name: credential.name,
            cloudProvider: credential.cloudProvider,
            cloudAccountId: credential.cloudAccountId,
            cloudRegion: credential.cloudRegion,
            additionalRegions: credential.additionalRegions,
            description: credential.description,
            isValid: credential.isValid,
            isActive: credential.isActive,
            createdAt: credential.createdAt,
          },
        },
        201,
        `${cloudProvider.toUpperCase()} credentials added successfully`
      );
    } catch (error) {
      logger.error('Failed to create multi-cloud credentials', error);
      sendError(res, 'Failed to add credentials: ' + error.message, 500, 'CREDENTIAL_ERROR');
    }
  })
);

/**
 * GET /api/credentials/providers
 * Get supported cloud providers and their required fields
 */
router.get(
  '/providers',
  asyncHandler(async (req, res) => {
    const providers = credentialService.getSupportedProviders().map(provider => ({
      name: provider,
      requiredFields: credentialService.getRequiredFields(provider),
      optionalFields: credentialService.getOptionalFields(provider),
    }));

    sendSuccess(res, { providers }, 200, 'Supported providers retrieved');
  })
);

/**
 * GET /api/credentials
 * List all user's credentials (without sensitive data)
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    try {
      const { limit = 20, offset = 0 } = req.query;

      const { count, rows } = await Credential.findAndCountAll({
        where: { userId: req.user.id, isActive: true },
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['createdAt', 'DESC']],
        attributes: {
          exclude: [
            'encryptedAccessKeyId',
            'encryptedSecretAccessKey',
            'encryptionIv',
          ],
        },
      });

      sendSuccess(
        res,
        {
          credentials: rows,
          total: count,
          limit: parseInt(limit),
          offset: parseInt(offset),
        },
        200,
        'Credentials retrieved'
      );
    } catch (error) {
      logger.error('Failed to list credentials', error);
      sendError(res, 'Failed to list credentials', 500, 'CREDENTIAL_ERROR');
    }
  })
);

/**
 * GET /api/credentials/:id
 * Get specific credential details
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    try {
      const credential = await Credential.findOne({
        where: {
          id: req.params.id,
          userId: req.user.id,
        },
        attributes: {
          exclude: [
            'encryptedAccessKeyId',
            'encryptedSecretAccessKey',
            'encryptionIv',
          ],
        },
      });

      if (!credential) {
        return sendError(res, 'Credential not found', 404, 'NOT_FOUND');
      }

      sendSuccess(res, { credential }, 200, 'Credential retrieved');
    } catch (error) {
      logger.error('Failed to get credential', error);
      sendError(res, 'Failed to get credential', 500, 'CREDENTIAL_ERROR');
    }
  })
);

/**
 * DELETE /api/credentials/:id
 * Remove stored credentials
 */
router.delete(
  '/:id',
  authorize(['admin', 'operator']),
  asyncHandler(async (req, res) => {
    try {
      const credential = await Credential.findOne({
        where: {
          id: req.params.id,
          userId: req.user.id,
        },
      });

      if (!credential) {
        return sendError(res, 'Credential not found', 404, 'NOT_FOUND');
      }

      // Soft delete by marking inactive
      credential.isActive = false;
      await credential.save();

      logger.info(`Credentials deleted: ${credential.name}`, {
        credentialId: credential.id,
        userId: req.user.id,
      });

      sendSuccess(res, {}, 200, 'Credentials deleted successfully');
    } catch (error) {
      logger.error('Failed to delete credential', error);
      sendError(res, 'Failed to delete credential', 500, 'CREDENTIAL_ERROR');
    }
  })
);

/**
 * PUT /api/credentials/:id
 * Update credential
 */
router.put(
  '/:id',
  authorize(['admin', 'operator']),
  [
    body('name').optional().trim().isLength({ min: 1, max: 100 }),
    body('description').optional().trim(),
    // AWS credential fields
    body('accessKeyId').optional().trim().isLength({ min: 1 }),
    body('secretAccessKey').optional().trim().isLength({ min: 1 }),
    body('awsRegion').optional().trim().isIn([
      'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
      'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-central-1', 'eu-north-1',
      'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'ap-northeast-2', 'ap-south-1',
      'ca-central-1', 'sa-east-1', 'af-south-1', 'me-south-1'
    ]),
    // Azure credential fields
    body('clientId').optional().trim().isLength({ min: 1 }),
    body('clientSecret').optional().trim().isLength({ min: 1 }),
    body('tenantId').optional().trim().isLength({ min: 1 }),
    body('subscriptionId').optional().trim(),
    // Multi-cloud fields
    body('cloudRegion').optional().trim(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', errors.array());
    }

    try {
      const credential = await Credential.findOne({
        where: {
          id: req.params.id,
          userId: req.user.id,
        },
      });

      if (!credential) {
        return sendError(res, 'Credential not found', 404, 'NOT_FOUND');
      }

      // Update basic fields
      if (req.body.name) credential.name = req.body.name;
      if (req.body.description !== undefined) credential.description = req.body.description;

      // Update credential values if provided
      const hasCredentialUpdates = req.body.accessKeyId || req.body.secretAccessKey || 
                                   req.body.clientId || req.body.clientSecret || 
                                   req.body.tenantId;

      if (hasCredentialUpdates) {
        // Reset validation when credentials are updated
        credential.isValid = null;
        credential.validationError = null;
        credential.lastValidatedAt = null;

        // Handle AWS credential updates
        if ((req.body.accessKeyId || req.body.secretAccessKey) && credential.cloudProvider === 'aws') {
          const accessKeyId = req.body.accessKeyId || credentialService.decryptCredentials(credential).accessKeyId;
          const secretAccessKey = req.body.secretAccessKey || credentialService.decryptCredentials(credential).secretAccessKey;
          
          const legacy = credentialService.encryptCredentials({
            accessKeyId,
            secretAccessKey,
          });

          const region = req.body.awsRegion || credential.awsRegion || 'us-east-1';
          const enc = credentialService.encryptMultiCloudCredentials('aws', {
            accessKeyId,
            secretAccessKey,
            region,
          });

          // Update legacy fields
          credential.encryptedAccessKeyId = legacy.encryptedAccessKeyId;
          credential.encryptedSecretAccessKey = legacy.encryptedSecretAccessKey;
          credential.encryptionIv = legacy.encryptionIv;
          credential.authTag = legacy.authTag;

          // Update multi-cloud fields
          credential.encryptedCredentialData = enc.encryptedCredentialData;
          credential.credentialDataIv = enc.credentialDataIv;
          credential.credentialDataAuthTag = enc.credentialDataAuthTag;

          if (req.body.awsRegion) {
            credential.awsRegion = req.body.awsRegion;
            credential.cloudRegion = req.body.awsRegion;
          }
        }

        // Handle Azure credential updates
        if ((req.body.clientId || req.body.clientSecret || req.body.tenantId) && credential.cloudProvider === 'azure') {
          const decrypted = credentialService.getDecryptedCredentialFromModel(credential) || {};
          
          const clientId = req.body.clientId || decrypted.clientId;
          const clientSecret = req.body.clientSecret || decrypted.clientSecret;
          const tenantId = req.body.tenantId || decrypted.tenantId;
          const subscriptionId = req.body.subscriptionId || decrypted.subscriptionId;
          const region = req.body.cloudRegion || credential.cloudRegion || 'eastus';

          const legacy = credentialService.encryptCredentials({
            accessKeyId: clientId,
            secretAccessKey: clientSecret,
          });

          const enc = credentialService.encryptMultiCloudCredentials('azure', {
            clientId,
            clientSecret,
            tenantId,
            subscriptionId,
            region,
          });

          // Update legacy fields (repurposed for Azure clientId/secret)
          credential.encryptedAccessKeyId = legacy.encryptedAccessKeyId;
          credential.encryptedSecretAccessKey = legacy.encryptedSecretAccessKey;
          credential.encryptionIv = legacy.encryptionIv;
          credential.authTag = legacy.authTag;

          // Update multi-cloud fields
          credential.encryptedCredentialData = enc.encryptedCredentialData;
          credential.credentialDataIv = enc.credentialDataIv;
          credential.credentialDataAuthTag = enc.credentialDataAuthTag;

          // Update cloud account ID with tenant ID for tracking
          if (req.body.tenantId) {
            credential.cloudAccountId = req.body.tenantId;
          }

          if (req.body.cloudRegion) {
            credential.cloudRegion = req.body.cloudRegion;
          }
        }
      }

      await credential.save();

      logger.info(`Credentials updated: ${credential.name}`, {
        credentialId: credential.id,
        hasCredentialUpdates,
      });

      sendSuccess(
        res,
        {
          credential: {
            id: credential.id,
            name: credential.name,
            cloudProvider: credential.cloudProvider,
            cloudRegion: credential.cloudRegion,
            description: credential.description,
            isValid: credential.isValid,
            isActive: credential.isActive,
            createdAt: credential.createdAt,
            updatedAt: credential.updatedAt,
          },
        },
        200,
        'Credential updated successfully'
      );
    } catch (error) {
      logger.error('Failed to update credential', error);
      sendError(res, 'Failed to update credential', 500, 'CREDENTIAL_ERROR');
    }
  })
);

/**
 * POST /api/credentials/:id/validate
 * Validate credentials by testing connection (supports all cloud providers)
 */
router.post(
  '/:id/validate',
  authorize(['admin', 'operator']),
  asyncHandler(async (req, res) => {
    try {
      const credential = await Credential.findOne({
        where: {
          id: req.params.id,
          userId: req.user.id,
        },
      });

      if (!credential) {
        return sendError(res, 'Credential not found', 404, 'NOT_FOUND');
      }

      // Check for multi-cloud format first, then legacy format
      const hasMultiCloudCreds = credential.encryptedCredentialData && credential.credentialDataAuthTag;
      const hasLegacyCreds = credential.encryptedAccessKeyId && credential.authTag;

      if (!hasMultiCloudCreds && !hasLegacyCreds) {
        return sendError(res, 'This credential was created with an older version and cannot be validated. Please re-create the credential.', 400, 'LEGACY_CREDENTIAL');
      }

      // Decrypt credentials using the appropriate method
      const decrypted = credentialService.getDecryptedCredentialFromModel(credential);
      let isValid = false;
      let validationMessage = '';

      switch (credential.cloudProvider) {
        case 'aws':
          // Initialize AWS client and validate
          awsService.initializeClients({
            accessKeyId: decrypted.accessKeyId,
            secretAccessKey: decrypted.secretAccessKey,
            region: credential.cloudRegion || credential.awsRegion || 'us-east-1',
          });
          isValid = await awsService.validateCredentials();
          validationMessage = 'AWS credentials are valid';
          break;

        case 'azure':
          // Azure validation using Azure CLI
          try {
            const { exec } = require('child_process');
            const { promisify } = require('util');
            const execAsync = promisify(exec);
            
            // Test Azure login with service principal
            // Use --password= format to handle secrets starting with '-'
            const loginCmd = `az login --service-principal --username "${decrypted.clientId}" --password="${decrypted.clientSecret}" --tenant "${decrypted.tenantId}" --output none`;
            await execAsync(loginCmd);
            
            // If subscription is provided, verify access
            if (decrypted.subscriptionId) {
              await execAsync(`az account set --subscription "${decrypted.subscriptionId}"`);
            }
            
            // Logout after validation
            await execAsync('az logout --output none').catch(() => {});
            
            isValid = true;
            validationMessage = 'Azure credentials are valid';
          } catch (e) {
            throw new Error(`Azure validation failed: ${e.message}`);
          }
          break;

        case 'gcp':
          // GCP validation using gcloud CLI
          try {
            const { exec } = require('child_process');
            const { promisify } = require('util');
            const fs = require('fs');
            const os = require('os');
            const path = require('path');
            const execAsync = promisify(exec);
            
            // Write service account key to temp file
            const keyFilePath = path.join(os.tmpdir(), `gcp-validate-${Date.now()}.json`);
            fs.writeFileSync(keyFilePath, JSON.stringify(decrypted.serviceAccountKey));
            
            try {
              // Activate service account
              await execAsync(`gcloud auth activate-service-account --key-file="${keyFilePath}"`);
              
              // Test by listing projects
              const projectId = decrypted.projectId || decrypted.serviceAccountKey.project_id;
              if (projectId) {
                await execAsync(`gcloud projects describe ${projectId} --format=json`);
              }
              
              isValid = true;
              validationMessage = 'GCP credentials are valid';
            } finally {
              // Clean up temp file
              fs.unlinkSync(keyFilePath);
            }
          } catch (e) {
            throw new Error(`GCP validation failed: ${e.message}`);
          }
          break;

        case 'digitalocean':
          // DigitalOcean validation using API
          try {
            const https = require('https');
            
            const result = await new Promise((resolve, reject) => {
              const options = {
                hostname: 'api.digitalocean.com',
                path: '/v2/account',
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${decrypted.apiToken}`,
                  'Content-Type': 'application/json',
                },
              };
              
              const req = https.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                  if (res.statusCode === 200) {
                    resolve(JSON.parse(data));
                  } else {
                    reject(new Error(`API returned status ${res.statusCode}`));
                  }
                });
              });
              
              req.on('error', reject);
              req.end();
            });
            
            isValid = result.account && result.account.status === 'active';
            validationMessage = 'DigitalOcean credentials are valid';
          } catch (e) {
            throw new Error(`DigitalOcean validation failed: ${e.message}`);
          }
          break;

        case 'linode':
          // Linode validation using API
          try {
            const https = require('https');
            
            const result = await new Promise((resolve, reject) => {
              const options = {
                hostname: 'api.linode.com',
                path: '/v4/account',
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${decrypted.apiToken}`,
                  'Content-Type': 'application/json',
                },
              };
              
              const req = https.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                  if (res.statusCode === 200) {
                    resolve(JSON.parse(data));
                  } else {
                    reject(new Error(`API returned status ${res.statusCode}`));
                  }
                });
              });
              
              req.on('error', reject);
              req.end();
            });
            
            isValid = !!result.email;
            validationMessage = 'Linode credentials are valid';
          } catch (e) {
            throw new Error(`Linode validation failed: ${e.message}`);
          }
          break;

        default:
          throw new Error(`Validation not implemented for provider: ${credential.cloudProvider}`);
      }

      if (isValid) {
        credential.isValid = true;
        credential.lastValidatedAt = new Date();
        credential.validationError = null;
      }

      await credential.save();

      logger.info(`Credentials validated: ${credential.name} (${credential.cloudProvider})`, {
        credentialId: credential.id,
        isValid,
      });

      sendSuccess(res, { isValid, message: validationMessage }, 200, 'Validation successful');
    } catch (error) {
      logger.error('Failed to validate credentials', error);

      // Update validation error
      try {
        const credential = await Credential.findByPk(req.params.id);
        if (credential) {
          credential.isValid = false;
          credential.validationError = error.message;
          await credential.save();
        }
      } catch (e) {
        logger.error('Failed to update validation error', e);
      }

      sendError(res, 'Credentials validation failed', 400, 'VALIDATION_FAILED', {
        error: error.message,
      });
    }
  })
);

/**
 * PUT /api/credentials/:id/rotate
 * Rotate AWS access keys
 */
router.put(
  '/:id/rotate',
  authorize(['admin']),
  asyncHandler(async (req, res) => {
    try {
      const credential = await Credential.findOne({
        where: {
          id: req.params.id,
          userId: req.user.id,
        },
      });

      if (!credential) {
        return sendError(res, 'Credential not found', 404, 'NOT_FOUND');
      }

      // In production, this would call AWS IAM to rotate the keys
      // For now, we'll just update the rotation timestamp
      credential.lastRotatedAt = new Date();
      credential.rotationScheduledAt = null;
      await credential.save();

      logger.info(`Credentials rotation scheduled: ${credential.name}`, {
        credentialId: credential.id,
      });

      sendSuccess(
        res,
        {
          credential: {
            id: credential.id,
            lastRotatedAt: credential.lastRotatedAt,
            nextRotationDue: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          },
        },
        200,
        'Credentials rotation scheduled'
      );
    } catch (error) {
      logger.error('Failed to rotate credentials', error);
      sendError(res, 'Failed to rotate credentials', 500, 'CREDENTIAL_ERROR');
    }
  })
);

module.exports = router;
