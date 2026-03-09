/**
 * TerraformExecutor Service
 * Handles Terraform lifecycle management for multi-cloud deployments
 * 
 * Responsibilities:
 * - Initialize Terraform working directories
 * - Generate cloud-specific terraform.tfvars
 * - Validate Terraform configurations
 * - Execute plan and apply operations
 * - Capture and stream Terraform output
 * - Manage deployment state and rollback
 * 
 * Flow:
 * 1. initTerraform() - Create working dir, copy modules
 * 2. writeTfvars() - Generate provider-specific variables
 * 3. validateTerraform() - Run terraform validate
 * 4. planTerraform() - Run terraform plan (preview)
 * 5. applyTerraform() - Run terraform apply (execute)
 * 6. captureOutputs() - Extract cluster details from state
 * 7. destroyTerraform() - Cleanup resources
 */

const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const logger = require('./logger');
const { Deployment, DeploymentLog } = require('../models');
const websocketServer = require('../config/websocketServer');
const deploymentService = require('./deploymentService');

const execAsync = promisify(exec);

/**
 * Provider-specific Terraform apply error patterns.
 * Each entry maps a stderr substring to a user-friendly message with remediation guidance.
 */
const PROVIDER_APPLY_ERRORS = {
  aws: [
    { pattern: 'AddressLimitExceeded', message: 'AWS Elastic IP address limit exceeded. Please release unused EIPs or request a limit increase.' },
    { pattern: 'LimitExceeded', message: 'AWS resource limit exceeded. Please check your quotas in AWS Service Quotas.' },
    { pattern: 'RequestLimitExceeded', message: 'AWS request limit exceeded. Please wait and retry.' },
  ],
  azure: [
    { pattern: 'QuotaExceeded', message: 'Azure quota exceeded. Open a support request at https://portal.azure.com to increase vCPU or other limits.' },
    { pattern: 'ResourceGroupBeingDeleted', message: 'Azure resource group is still being deleted. Wait a few minutes and retry.' },
    { pattern: 'AuthorizationFailed', message: 'Azure authorization failed. Check that the Service Principal has Contributor role on the target subscription.' },
    { pattern: 'InvalidResourceLocation', message: 'Azure resource location mismatch. Ensure all resources are in the same region as the resource group.' },
    { pattern: 'SubscriptionNotRegistered', message: 'Azure resource provider not registered. Run: az provider register --namespace <provider> --subscription <id>' },
    { pattern: 'SKUNotAvailable', message: 'Azure VM SKU not available in this region. Choose a different VM size or region.' },
    { pattern: 'RequestDisallowedByPolicy', message: 'Azure Policy blocked this deployment. Contact your Azure administrator to review policy assignments.' },
  ],
  gcp: [
    { pattern: 'QUOTA_EXCEEDED', message: 'GCP quota exceeded. Request increases at https://console.cloud.google.com/iam-admin/quotas.' },
    { pattern: 'PERMISSION_DENIED', message: 'GCP permission denied. Ensure the Service Account has "roles/container.admin" and "roles/compute.networkAdmin".' },
    { pattern: 'API_DISABLED', message: 'A required GCP API is disabled. Enable container.googleapis.com and compute.googleapis.com in the project.' },
    { pattern: 'billing account', message: 'GCP billing account not linked to this project. Enable billing at https://console.cloud.google.com/billing.' },
    { pattern: 'RESOURCE_ALREADY_EXISTS', message: 'GCP resource already exists. Use `terraform import` to bring it under management, or choose a different cluster name.' },
    { pattern: 'invalid_grant', message: 'GCP service account key is invalid or expired. Generate a new key in IAM & Admin → Service Accounts.' },
  ],
  digitalocean: [
    { pattern: '422 Unprocessable Entity', message: 'DigitalOcean rejected the request (422). Check Kubernetes version availability and node pool size limits.' },
    { pattern: 'exhausted', message: 'DigitalOcean resource limit reached. Upgrade your account or destroy unused resources.' },
    { pattern: 'unauthorized', message: 'DigitalOcean API token is invalid or expired. Generate a new Personal Access Token with read/write scope.' },
    { pattern: 'not_found', message: 'DigitalOcean resource not found. Verify the region slug and Kubernetes version are valid.' },
    { pattern: 'too many requests', message: 'DigitalOcean API rate limit hit. Wait 60 seconds and retry.' },
  ],
  linode: [
    { pattern: '401', message: 'Linode API token is invalid or expired. Generate a new token at https://cloud.linode.com/profile/tokens.' },
    { pattern: 'limit_exceeded', message: 'Linode account resource limit exceeded. Open a support ticket to increase limits.' },
    { pattern: 'not_found', message: 'Linode resource not found. Verify the region and Kubernetes version are available.' },
    { pattern: 'requested entity is currently being updated', message: 'Linode resource is locked (in progress). Wait and retry.' },
  ],
};

class TerraformExecutor {
  constructor() {
    this.baseDeploymentDir = process.env.TERRAFORM_WORKING_DIR || '/tmp/zlaws_deployments';
    this.terraformBinary = process.env.TERRAFORM_BINARY || 'terraform';
    this.timeout = parseInt(process.env.TERRAFORM_TIMEOUT) || 3600000; // 1 hour default
  }

  /**
   * Infer the cloud provider from the deployment directory name.
   * Convention: dir basename starts with provider slug (e.g. "aws-us-east-1-my-cluster")
   * @param {string} deploymentDir
   * @returns {string} provider slug or 'unknown'
   */
  _inferProviderFromDir(deploymentDir) {
    const segments = path.basename(deploymentDir).toLowerCase();
    if (segments.startsWith('aws')) return 'aws';
    if (segments.startsWith('azure')) return 'azure';
    if (segments.startsWith('gcp')) return 'gcp';
    if (segments.startsWith('digitalocean')) return 'digitalocean';
    if (segments.startsWith('linode')) return 'linode';
    return 'unknown';
  }

  /**
   * Get the state directory for a cluster
   * Uses cluster name (not deployment ID) to ensure state persistence across deployments
   * 
   * @param {string} clusterName - Cluster name
   * @param {string} cloudProvider - Cloud provider
   * @param {string} region - Region
   * @returns {string} State directory path
   */
  getClusterStateDir(clusterName, cloudProvider, region) {
    // Use a consistent directory based on cluster identity, not deployment ID
    // This ensures Terraform state is preserved across deployment attempts
    const stateKey = `${cloudProvider}-${region}-${clusterName}`.replace(/[^a-zA-Z0-9-_]/g, '_');
    return path.join(this.baseDeploymentDir, 'clusters', stateKey);
  }

  /**
   * Initialize Terraform working directory
   * Creates directory structure and copies Terraform modules
   * 
   * @param {string} deploymentId - Deployment ID
   * @param {string} cloudProvider - Cloud provider (aws, azure, gcp, do, linode)
   * @param {object} options - Options including clusterName and region for state management
   * @param {boolean} [options.skipStatusChange] - If true, don't change deployment status (for preview)
   * @returns {object} Initialization result
   */
  async initTerraform(deploymentId, cloudProvider, options = {}) {
    try {
      // Use cluster-based directory if cluster info provided, otherwise fall back to deployment ID
      const { clusterName, region, skipStatusChange } = options;
      const deploymentDir = clusterName && region 
        ? this.getClusterStateDir(clusterName, cloudProvider, region)
        : this.getDeploymentDir(deploymentId);
      const environmentDir = path.join(deploymentDir, 'environments', cloudProvider);

      logger.info(`[TerraformExecutor] Initializing Terraform for deployment ${deploymentId}`, {
        deploymentId,
        cloudProvider,
        deploymentDir,
      });

      // Emit init start via WebSocket
      await deploymentService.updateDeploymentPhase(deploymentId, 'terraform-init', { status: 'starting', skipStatusChange });
      websocketServer.emitLog(deploymentId, {
        level: 'info',
        message: `Initializing Terraform for ${cloudProvider}`,
        timestamp: new Date(),
      });

      // Create directory structure
      if (!fs.existsSync(deploymentDir)) {
        fs.mkdirSync(deploymentDir, { recursive: true });
      }

      if (!fs.existsSync(environmentDir)) {
        fs.mkdirSync(environmentDir, { recursive: true });
      }

      // Copy modules directory (cloud-specific modules)
      await this.copyModulesDirectory(deploymentDir);

      // Copy environment-specific files (contains main.tf for the cloud provider)
      await this.copyEnvironmentFilesToRoot(deploymentDir, cloudProvider);

      // Run terraform init
      const initResult = await this.runTerraform(deploymentDir, 'init', [
        `-input=false`,
      ]);

      logger.info(`[TerraformExecutor] Terraform initialized successfully`, {
        deploymentId,
        exitCode: initResult.exitCode,
      });

      // Emit init success via WebSocket
      websocketServer.emitLog(deploymentId, {
        level: 'info',
        message: 'Terraform initialized successfully',
        timestamp: new Date(),
      });
      websocketServer.emitProgressUpdate(deploymentId, 20);

      return {
        success: true,
        deploymentDir,
        environmentDir,
        exitCode: initResult.exitCode,
        output: initResult.stdout,
      };
    } catch (error) {
      logger.error(`[TerraformExecutor] Failed to initialize Terraform`, {
        deploymentId,
        cloudProvider,
        error: error.message,
      });
      
      // Emit error via WebSocket
      websocketServer.emitFailure(deploymentId, error.message, { phase: 'terraform-init' });
      websocketServer.emitLog(deploymentId, {
        level: 'error',
        message: `Initialization failed: ${error.message}`,
        timestamp: new Date(),
      });
      
      throw error;
    }
  }

  /**
   * Write cloud-specific terraform.tfvars file
   * 
   * @param {string} deploymentIdOrDir - Deployment ID or directory path
   * @param {object} variables - Terraform variables
   * @param {object} options - Options including deploymentDir for cluster-based state
   * @returns {object} Write result
   */
  async writeTfvars(deploymentIdOrDir, variables, options = {}) {
    try {
      // If deploymentDir is provided in options, use it; otherwise use the deploymentId to get the dir
      const deploymentDir = options.deploymentDir || this.getDeploymentDir(deploymentIdOrDir);
      const tfvarsPath = path.join(deploymentDir, 'terraform.tfvars.json');

      logger.info(`[TerraformExecutor] Writing terraform.tfvars`, {
        deploymentDir,
        variablesCount: Object.keys(variables).length,
      });

      // Sanitize sensitive values in logging
      const loggableVars = { ...variables };
      if (loggableVars.database_password) loggableVars.database_password = '***';
      if (loggableVars.api_key) loggableVars.api_key = '***';

      logger.debug(`[TerraformExecutor] Variables`, { loggableVars });

      // Write variables as JSON
      fs.writeFileSync(tfvarsPath, JSON.stringify(variables, null, 2));

      logger.info(`[TerraformExecutor] terraform.tfvars written successfully`, {
        deploymentDir,
        path: tfvarsPath,
      });

      return {
        success: true,
        path: tfvarsPath,
        variablesCount: Object.keys(variables).length,
      };
    } catch (error) {
      logger.error(`[TerraformExecutor] Failed to write terraform.tfvars`, {
        deploymentDir: options.deploymentDir || deploymentIdOrDir,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Validate Terraform configuration
   * Checks for syntax errors and variable issues
   * 
   * @param {string} deploymentId - Deployment ID
   * @param {object} options - Options including deploymentDir for cluster-based state
   * @param {boolean} [options.skipStatusChange] - If true, don't change deployment status (for preview)
   * @returns {object} Validation result
   */
  async validateTerraform(deploymentId, options = {}) {
    try {
      const { deploymentDir: optDeploymentDir, skipStatusChange } = options;
      const deploymentDir = optDeploymentDir || this.getDeploymentDir(deploymentId);

      logger.info(`[TerraformExecutor] Validating Terraform for deployment ${deploymentId}`, {
        deploymentId,
        deploymentDir,
      });

      // Emit validation start via WebSocket
      await deploymentService.updateDeploymentPhase(deploymentId, 'terraform-validate', { status: 'starting', skipStatusChange });
      websocketServer.emitLog(deploymentId, {
        level: 'info',
        message: 'Validating Terraform configuration',
        timestamp: new Date(),
      });

      const result = await this.runTerraform(deploymentDir, 'validate', []);

      if (result.exitCode !== 0) {
        logger.error(`[TerraformExecutor] Terraform validation failed`, {
          deploymentId,
          exitCode: result.exitCode,
          stderr: result.stderr,
        });
        throw new Error(`Terraform validation failed: ${result.stderr}`);
      }

      logger.info(`[TerraformExecutor] Terraform validation passed`, {
        deploymentId,
      });

      // Emit validation success via WebSocket
      websocketServer.emitLog(deploymentId, {
        level: 'info',
        message: 'Terraform validation passed',
        timestamp: new Date(),
      });
      websocketServer.emitProgressUpdate(deploymentId, 30);

      return {
        success: true,
        valid: true,
        output: result.stdout,
      };
    } catch (error) {
      logger.error(`[TerraformExecutor] Validation error`, {
        deploymentId,
        error: error.message,
      });
      
      // Emit error via WebSocket
      websocketServer.emitFailure(deploymentId, error.message, { phase: 'terraform-validate' });
      websocketServer.emitLog(deploymentId, {
        level: 'error',
        message: `Validation failed: ${error.message}`,
        timestamp: new Date(),
      });
      
      throw error;
    }
  }

  /**
   * Execute terraform plan
   * Preview infrastructure changes without applying
   * 
   * @param {string} deploymentId - Deployment ID
   * @param {string} planFile - Output plan file path
   * @param {object} options - Options including deploymentDir for cluster-based state
   * @param {boolean} [options.skipStatusChange] - If true, don't change deployment status (for preview)
   * @returns {object} Plan result
   */
  async planTerraform(deploymentId, planFile = null, options = {}) {
    try {
      const { deploymentDir: optDeploymentDir, skipStatusChange, returnSummary } = options;
      const deploymentDir = optDeploymentDir || this.getDeploymentDir(deploymentId);
      const plan = planFile || path.join(deploymentDir, 'terraform.plan');

      logger.info(`[TerraformExecutor] Planning Terraform for deployment ${deploymentId}`, {
        deploymentId,
        deploymentDir,
        plan,
      });

      // Emit plan start via WebSocket
      await deploymentService.updateDeploymentPhase(deploymentId, 'terraform-plan', { status: 'starting', skipStatusChange });
      websocketServer.emitLog(deploymentId, {
        level: 'info',
        message: 'Generating Terraform execution plan',
        timestamp: new Date(),
      });

      const planArgs = [
        `-input=false`,
        `-out=${plan}`,
      ];

      const result = await this.runTerraform(deploymentDir, 'plan', planArgs);

      if (result.exitCode !== 0) {
        logger.error(`[TerraformExecutor] Terraform plan failed`, {
          deploymentId,
          exitCode: result.exitCode,
          stderr: result.stderr,
        });
        throw new Error(`Terraform plan failed: ${result.stderr}`);
      }

      logger.info(`[TerraformExecutor] Terraform plan completed`, {
        deploymentId,
        planFile: plan,
      });

      // Run terraform show to get readable plan output for parsing
      let planOutput = result.stdout;
      try {
        const showResult = await this.runTerraform(deploymentDir, 'show', [plan]);
        if (showResult.exitCode === 0 && showResult.stdout) {
          planOutput = showResult.stdout;
          logger.info(`[TerraformExecutor] Retrieved plan details via terraform show`, {
            deploymentId,
            outputLength: planOutput.length,
          });
        }
      } catch (showError) {
        logger.warn(`[TerraformExecutor] Failed to show plan details, using raw output`, {
          deploymentId,
          error: showError.message,
        });
      }

      // Emit plan success via WebSocket
      websocketServer.emitLog(deploymentId, {
        level: 'info',
        message: 'Terraform plan completed successfully',
        timestamp: new Date(),
      });

      return {
        success: true,
        planFile: plan,
        output: planOutput,
      };
    } catch (error) {
      logger.error(`[TerraformExecutor] Plan error`, {
        deploymentId,
        error: error.message,
      });
      
      // Emit error via WebSocket
      websocketServer.emitFailure(deploymentId, error.message, { phase: 'terraform-plan' });
      websocketServer.emitLog(deploymentId, {
        level: 'error',
        message: `Plan failed: ${error.message}`,
        timestamp: new Date(),
      });
      
      throw error;
    }
  }

  /**
   * Execute terraform apply
   * Apply planned infrastructure changes
   * 
   * @param {string} deploymentId - Deployment ID
   * @param {string} planFile - Input plan file path
   * @param {object} options - Options including deploymentDir for cluster-based state
   * @returns {object} Apply result
   */
  async applyTerraform(deploymentId, planFile = null, options = {}) {
    try {
      const deploymentDir = options.deploymentDir || this.getDeploymentDir(deploymentId);
      const plan = planFile || path.join(deploymentDir, 'terraform.plan');

      logger.info(`[TerraformExecutor] Applying Terraform for deployment ${deploymentId}`, {
        deploymentId,
        deploymentDir,
        plan,
      });

      // Emit apply start via WebSocket
      await deploymentService.updateDeploymentPhase(deploymentId, 'terraform-apply', { status: 'starting' });
      websocketServer.emitLog(deploymentId, {
        level: 'info',
        message: 'Applying Terraform changes - creating infrastructure',
        timestamp: new Date(),
      });

      const applyArgs = [
        `-input=false`,
        `-auto-approve`,
      ];

      if (planFile && fs.existsSync(plan)) {
        applyArgs.push(plan);
      }

      const result = await this._runTerraformStreaming(deploymentId, ['apply', ...applyArgs], deploymentDir);

      if (result.exitCode !== 0) {
        // Infer provider from directory name for provider-specific error handling
        const provider = this._inferProviderFromDir(deploymentDir);

        // Check for provider-specific errors (AWS quota, Azure auth, GCP permissions, etc.)
        const providerErrors = PROVIDER_APPLY_ERRORS[provider] || [];
        for (const providerError of providerErrors) {
          if (result.stderr.includes(providerError.pattern) ||
              result.stderr.toLowerCase().includes(providerError.pattern.toLowerCase())) {
            logger.error(`[TerraformExecutor] ${provider} apply error: ${providerError.message}`, {
              deploymentId,
              pattern: providerError.pattern,
            });
            websocketServer.emitFailure(deploymentId, providerError.message, {
              details: result.stderr,
              phase: 'terraform-apply',
              provider,
            });
            throw new Error(providerError.message);
          }
        }

        // Check if error is due to resources already existing
        const alreadyExistsErrors = [
          'already exists',
          'EntityAlreadyExists',
          'ResourceExistsException',
          'BucketAlreadyOwnedByYou',
          'RepositoryAlreadyExistsException',
          'FileSystemAlreadyExists',
          'Duplicate',
          'AlreadyExists'
        ];

        const hasExistingResourceError = alreadyExistsErrors.some(err => 
          result.stderr.includes(err)
        );

        if (hasExistingResourceError) {
          logger.warn(`[TerraformExecutor] Resources already exist, attempting import strategy`, {
            deploymentId,
          });

          websocketServer.emitLog(deploymentId, {
            level: 'warn',
            message: 'Some resources already exist. Attempting to import existing resources into Terraform state...',
            timestamp: new Date(),
          });

          // Parse error output to identify specific resources and attempt imports
          const importSuccess = await this.attemptResourceImports(deploymentDir, deploymentId, result.stderr);

          if (importSuccess) {
            // Retry apply after imports
            websocketServer.emitLog(deploymentId, {
              level: 'info',
              message: 'Resources imported successfully. Retrying apply...',
              timestamp: new Date(),
            });

            const retryResult = await this.runTerraform(deploymentDir, 'apply', [
              '-input=false',
              '-auto-approve',
              '-refresh=true'
            ]);

            if (retryResult.exitCode !== 0) {
              logger.error(`[TerraformExecutor] Terraform apply failed after import retry`, {
                deploymentId,
                exitCode: retryResult.exitCode,
                stderr: retryResult.stderr,
              });
              throw new Error(`Terraform apply failed: ${retryResult.stderr}`);
            }
          } else {
            // Fallback to refresh-only approach
            logger.warn(`[TerraformExecutor] Import failed, falling back to refresh strategy`, {
              deploymentId,
            });

            websocketServer.emitLog(deploymentId, {
              level: 'warn',
              message: 'Could not import all resources. Refreshing state and continuing...',
              timestamp: new Date(),
            });

            await this.runTerraform(deploymentDir, 'refresh', ['-input=false']);

            const retryResult = await this.runTerraform(deploymentDir, 'apply', [
              '-input=false',
              '-auto-approve',
              '-refresh=true'
            ]);

            if (retryResult.exitCode !== 0) {
              logger.error(`[TerraformExecutor] Terraform apply failed after refresh retry`, {
                deploymentId,
                exitCode: retryResult.exitCode,
                stderr: retryResult.stderr,
              });
              throw new Error(`Terraform apply failed: ${retryResult.stderr}`);
            }
          }
        } else {
          logger.error(`[TerraformExecutor] Terraform apply failed`, {
            deploymentId,
            exitCode: result.exitCode,
            stderr: result.stderr,
          });
          throw new Error(`Terraform apply failed: ${result.stderr}`);
        }
      }

      logger.info(`[TerraformExecutor] Terraform apply completed`, {
        deploymentId,
      });

      // Capture outputs after successful apply
      const outputs = await this.captureOutputs(deploymentId, { deploymentDir });

      // Emit apply success via WebSocket
      websocketServer.emitLog(deploymentId, {
        level: 'info',
        message: 'Infrastructure deployment completed successfully',
        timestamp: new Date(),
      });

      return {
        success: true,
        output: result.stdout,
        outputs,
      };
    } catch (error) {
      logger.error(`[TerraformExecutor] Apply error`, {
        deploymentId,
        error: error.message,
      });
      
      // Emit error via WebSocket
      websocketServer.emitFailure(deploymentId, error.message, { phase: 'terraform-apply' });
      websocketServer.emitLog(deploymentId, {
        level: 'error',
        message: `Apply failed: ${error.message}`,
        timestamp: new Date(),
      });
      
      throw error;
    }
  }

  /**
   * Destroy infrastructure
   * Used for rollback or cleanup
   * 
   * @param {string} deploymentId - Deployment ID
   * @param {string|null} cloudProvider - Cloud provider (aws|azure|gcp|digitalocean|linode). Resolved from deployment if null.
   * @param {object|null} deploymentConfig - Credential/config data for provider CLI cleanup. Resolved from deployment if null.
   * @returns {object} Destroy result
   */
  async destroyTerraform(deploymentId, cloudProvider = null, deploymentConfig = null) {
    try {
      // Get the actual terraform working directory from the deployment record
      const deployment = await Deployment.findByPk(deploymentId);
      if (!deployment) {
        throw new Error(`Deployment ${deploymentId} not found`);
      }

      // Use the stored terraform_working_dir from the deployment record
      // This is the actual location where terraform state/config exists
      let deploymentDir = deployment.terraformWorkingDir;
      
      // If no stored working dir, fall back to the default path
      if (!deploymentDir) {
        deploymentDir = this.getDeploymentDir(deploymentId);
        logger.warn(`[TerraformExecutor] No stored terraform_working_dir, using default`, {
          deploymentId,
          deploymentDir,
        });
      }

      // Normalize path for Windows
      if (process.platform === 'win32') {
        // If path starts with forward slash (Unix style), convert to Windows style
        if (deploymentDir.startsWith('/')) {
          deploymentDir = 'C:' + deploymentDir.replace(/\//g, '\\');
        }
        // If path starts with backslash but no drive letter, add C:
        else if (deploymentDir.startsWith('\\') && !deploymentDir.match(/^[A-Za-z]:/)) {
          deploymentDir = 'C:' + deploymentDir;
        }
      }

      // Verify directory exists
      if (!fs.existsSync(deploymentDir)) {
        logger.error(`[TerraformExecutor] Deployment directory does not exist`, {
          deploymentId,
          deploymentDir,
        });
        throw new Error(`Deployment directory does not exist: ${deploymentDir}`);
      }

      logger.warn(`[TerraformExecutor] Destroying Terraform resources for deployment ${deploymentId}`, {
        deploymentId,
        deploymentDir,
      });

      // Resolve cloud provider and config from deployment if not passed
      const provider = cloudProvider || deployment.cloud_provider || deployment.cloudProvider || 'unknown';
      const config = deploymentConfig || deployment.config || {};

      // Emit destroy start via WebSocket
      await deploymentService.updateDeploymentPhase(deploymentId, 'terraform-destroy', { status: 'starting' });
      websocketServer.emitLog(deploymentId, {
        level: 'warn',
        message: 'Destroying infrastructure resources',
        timestamp: new Date(),
      });

      // ── Pre-destroy cleanup (non-fatal) ────────────────────────────────
      const emitLog = (msg) => {
        websocketServer.emitLog(deploymentId, { level: 'info', message: msg, timestamp: new Date() });
        logger.deployment(deploymentId, 'destroy', msg);
      };
      try {
        await this._preDestroyCleanup(deploymentId, provider, config, deploymentDir, emitLog);
      } catch (cleanupErr) {
        logger.warn(`[TerraformExecutor] Pre-destroy cleanup threw (non-fatal): ${cleanupErr.message}`, { deploymentId });
        emitLog(`[pre-destroy] WARNING: cleanup failed: ${cleanupErr.message}. Proceeding with destroy.`);
      }

      const destroyArgs = [
        `-input=false`,
        `-auto-approve`,
      ];

      const result = await this._runTerraformStreaming(deploymentId, ['destroy', ...destroyArgs], deploymentDir);

      if (result.exitCode !== 0) {
        logger.error(`[TerraformExecutor] Terraform destroy failed`, {
          deploymentId,
          exitCode: result.exitCode,
          stderr: result.stderr,
        });
        throw new Error(`Terraform destroy failed: ${result.stderr}`);
      }

      logger.warn(`[TerraformExecutor] Terraform destroy completed`, {
        deploymentId,
      });

      // Emit destroy success via WebSocket
      websocketServer.emitLog(deploymentId, {
        level: 'info',
        message: 'Infrastructure destroyed successfully',
        timestamp: new Date(),
      });

      return {
        success: true,
        output: result.stdout,
      };
    } catch (error) {
      logger.error(`[TerraformExecutor] Destroy error`, {
        deploymentId,
        error: error.message,
      });
      
      // Emit error via WebSocket
      websocketServer.emitFailure(deploymentId, error.message, { phase: 'terraform-destroy' });
      websocketServer.emitLog(deploymentId, {
        level: 'error',
        message: `Destroy failed: ${error.message}`,
        timestamp: new Date(),
      });
      
      throw error;
    }
  }

  /**
   * Capture Terraform outputs
   * Extract cluster information from Terraform state
   * 
   * @param {string} deploymentId - Deployment ID
   * @param {object} options - Options including deploymentDir for cluster-based state
   * @returns {object} Terraform outputs
   */
  async captureOutputs(deploymentId, options = {}) {
    try {
      const deploymentDir = options.deploymentDir || this.getDeploymentDir(deploymentId);

      logger.info(`[TerraformExecutor] Capturing Terraform outputs for deployment ${deploymentId}`, {
        deploymentId,
      });

      const result = await this.runTerraform(deploymentDir, 'output', ['-json']);

      if (result.exitCode !== 0) {
        logger.warn(`[TerraformExecutor] Failed to capture outputs`, {
          deploymentId,
          exitCode: result.exitCode,
        });
        return {};
      }

      const outputs = JSON.parse(result.stdout);

      // Transform outputs to extract values
      const transformedOutputs = {};
      Object.entries(outputs).forEach(([key, value]) => {
        if (value.value !== undefined) {
          transformedOutputs[key] = value.value;
        }
      });

      logger.info(`[TerraformExecutor] Outputs captured successfully`, {
        deploymentId,
        outputKeys: Object.keys(transformedOutputs),
      });

      return transformedOutputs;
    } catch (error) {
      logger.error(`[TerraformExecutor] Failed to capture outputs`, {
        deploymentId,
        error: error.message,
      });
      return {};
    }
  }

  /**
   * Run arbitrary Terraform command
   * Internal helper for executing terraform CLI
   * 
   * @param {string} workingDir - Terraform working directory
   * @param {string} command - Terraform command (init, plan, apply, etc)
   * @param {array} args - Command arguments
   * @returns {object} Execution result
   */
  async runTerraform(workingDir, command, args = []) {
    try {
      const cmdArgs = args.join(' ');
      const fullCommand = `${this.terraformBinary} ${command} ${cmdArgs}`;

      logger.debug(`[TerraformExecutor] Executing command`, {
        command: fullCommand,
        workingDir,
      });

      // Use shell: true to execute via the system shell
      // This is required on Windows to properly spawn processes
      const execOptions = {
        cwd: workingDir,
        timeout: this.timeout,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        shell: true, // Use system shell (cmd.exe on Windows, /bin/sh on Unix)
        windowsHide: true, // Hide the console window on Windows
      };

      logger.debug(`[TerraformExecutor] Exec options`, {
        cwd: execOptions.cwd,
        shell: execOptions.shell,
        platform: process.platform,
      });

      const { stdout, stderr } = await execAsync(fullCommand, execOptions);

      logger.debug(`[TerraformExecutor] Command completed`, {
        command,
        exitCode: 0,
      });

      return {
        exitCode: 0,
        stdout,
        stderr,
      };
    } catch (error) {
      logger.error(`[TerraformExecutor] Command execution failed`, {
        command,
        exitCode: error.code,
        error: error.message,
      });

      return {
        exitCode: error.code || 1,
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
      };
    }
  }

  /**
   * Run a Terraform command with live stdout/stderr streaming to the WebSocket.
   * Used for long-running commands: apply, destroy.
   *
   * @param {string}   deploymentId - Deployment ID for WebSocket routing
   * @param {string[]} args          - Terraform arguments (e.g. ['apply', '-auto-approve'])
   * @param {string}   cwd           - Terraform working directory
   * @returns {Promise<{ exitCode: number, stdout: string, stderr: string }>}
   */
  _runTerraformStreaming(deploymentId, args, cwd) {
    return new Promise((resolve, reject) => {
      const env = {
        ...process.env,
        TF_IN_AUTOMATION: '1',
        TF_INPUT: '0',
      };

      logger.deployment(deploymentId, 'terraform', `Streaming: terraform ${args.join(' ')}`, { cwd });

      const child = spawn('terraform', args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });

      let stdout = '';
      let stderr = '';

      // Configurable timeout (default 60 min)
      const timeoutMs = parseInt(process.env.TERRAFORM_STREAM_TIMEOUT_MS || '3600000', 10);
      const timeoutHandle = setTimeout(() => {
        logger.error(`[TerraformExecutor] Streaming timeout after ${timeoutMs}ms`, { deploymentId, args });
        child.kill('SIGTERM');
        reject(new Error(`Terraform command timed out after ${timeoutMs / 60_000} minutes`));
      }, timeoutMs);

      // ── stdout line-by-line streaming ──────────────────────────────
      child.stdout.on('data', (chunk) => {
        const text = chunk.toString();
        stdout += text;

        const lines = text.split('\n');
        for (const line of lines) {
          const trimmed = line.trimEnd();
          if (trimmed.length === 0) continue;

          // Emit raw log line to frontend LogViewer
          websocketServer.emitDeploymentUpdate(deploymentId, 'log', {
            level: 'terraform-output',
            message: trimmed,
            source: 'terraform-stdout',
            timestamp: new Date().toISOString(),
          });

          // Parse structured progress lines
          if (trimmed.startsWith('Plan:')) {
            websocketServer.emitDeploymentUpdate(deploymentId, 'phase-update', {
              phase: 'terraform-planning',
              detail: trimmed,
            });
          }

          if (trimmed.includes('Apply complete!') || trimmed.includes('Destroy complete!')) {
            websocketServer.emitDeploymentUpdate(deploymentId, 'phase-update', {
              phase: trimmed.includes('Apply') ? 'terraform-apply-complete' : 'terraform-destroy-complete',
              detail: trimmed,
            });
          }

          if (trimmed.match(/^[a-z].*: (Creating|Modifying|Destroying|Still creating|Still destroying)/i)) {
            websocketServer.emitDeploymentUpdate(deploymentId, 'progress-update', {
              resourceLine: trimmed,
            });
          }
        }
      });

      // ── stderr line-by-line streaming ──────────────────────────────
      child.stderr.on('data', (chunk) => {
        const text = chunk.toString();
        stderr += text;

        const lines = text.split('\n');
        for (const line of lines) {
          const trimmed = line.trimEnd();
          if (trimmed.length === 0) continue;

          websocketServer.emitDeploymentUpdate(deploymentId, 'log', {
            level: 'terraform-stderr',
            message: trimmed,
            source: 'terraform-stderr',
            timestamp: new Date().toISOString(),
          });
        }
      });

      child.on('error', (err) => {
        clearTimeout(timeoutHandle);
        logger.error(`[TerraformExecutor] spawn error: ${err.message}`, { deploymentId, args });
        reject(err);
      });

      child.on('close', (exitCode) => {
        clearTimeout(timeoutHandle);
        logger.deployment(deploymentId, 'terraform', `Streaming command exited with code ${exitCode}`, { args });
        resolve({ exitCode: exitCode ?? 1, stdout, stderr });
      });
    });
  }

  /**
   * Copy modules directory to deployment directory
   * 
   * @param {string} deploymentDir - Deployment directory
   */
  async copyModulesDirectory(deploymentDir) {
    try {
      const terraformRootDir = path.join(__dirname, '../../../terraform');
      const srcModulesDir = path.join(terraformRootDir, 'modules');
      const destModulesDir = path.join(deploymentDir, 'modules');

      if (fs.existsSync(srcModulesDir)) {
        this.copyDirectoryRecursive(srcModulesDir, destModulesDir);
        logger.debug(`[TerraformExecutor] Copied modules directory`, { srcModulesDir, destModulesDir });
      }
    } catch (error) {
      logger.error(`[TerraformExecutor] Failed to copy modules directory`, {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Copy environment-specific files to deployment root
   * Environment files become the root terraform configuration
   * 
   * @param {string} deploymentDir - Deployment directory
   * @param {string} cloudProvider - Cloud provider
   */
  async copyEnvironmentFilesToRoot(deploymentDir, cloudProvider) {
    try {
      const terraformRootDir = path.join(__dirname, '../../../terraform');
      const srcEnvDir = path.join(terraformRootDir, 'environments', cloudProvider);

      if (!fs.existsSync(srcEnvDir)) {
        logger.warn(`[TerraformExecutor] Environment directory not found`, {
          cloudProvider,
          srcEnvDir,
        });
        throw new Error(`Environment directory not found for ${cloudProvider}`);
      }

      // Copy all files from environment directory to deployment root
      const files = fs.readdirSync(srcEnvDir);
      files.forEach(file => {
        const srcPath = path.join(srcEnvDir, file);
        const destPath = path.join(deploymentDir, file);
        const stat = fs.statSync(srcPath);

        if (stat.isFile()) {
          // For .tf files, fix module source paths
          if (file.endsWith('.tf')) {
            let content = fs.readFileSync(srcPath, 'utf8');
            // Replace relative module paths: ../../modules/ -> ./modules/
            content = content.replace(/source\s*=\s*"\.\.\/\.\.\/modules\//g, 'source = "./modules/');
            fs.writeFileSync(destPath, content, 'utf8');
            logger.debug(`[TerraformExecutor] Copied and fixed module paths in ${file}`, {
              file,
              srcPath,
              destPath,
            });
          } else {
            fs.copyFileSync(srcPath, destPath);
            logger.debug(`[TerraformExecutor] Copied environment file to root`, {
              file,
              srcPath,
              destPath,
            });
          }
        }
      });

      logger.info(`[TerraformExecutor] Copied environment files to deployment root`, {
        cloudProvider,
        srcEnvDir,
        deploymentDir,
      });
    } catch (error) {
      logger.error(`[TerraformExecutor] Failed to copy environment files`, {
        cloudProvider,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Copy Terraform root files to deployment directory
   * DEPRECATED: No longer used - environment files are copied to root instead
   * 
   * @param {string} deploymentDir - Deployment directory
   */
  async copyTerraformFiles(deploymentDir) {
    try {
      const terraformRootDir = path.join(__dirname, '../../../terraform');
      
      const filesToCopy = [
        'main.tf',
        'variables.tf',
        'outputs.tf',
        'terraform.tfvars.example',
      ];

      for (const file of filesToCopy) {
        const srcPath = path.join(terraformRootDir, file);
        const destPath = path.join(deploymentDir, file);

        if (fs.existsSync(srcPath)) {
          fs.copyFileSync(srcPath, destPath);
          logger.debug(`[TerraformExecutor] Copied file`, { file, srcPath, destPath });
        }
      }

      // Copy modules directory
      const srcModulesDir = path.join(terraformRootDir, 'modules');
      const destModulesDir = path.join(deploymentDir, 'modules');

      if (fs.existsSync(srcModulesDir)) {
        this.copyDirectoryRecursive(srcModulesDir, destModulesDir);
        logger.debug(`[TerraformExecutor] Copied modules directory`, { srcModulesDir, destModulesDir });
      }
    } catch (error) {
      logger.error(`[TerraformExecutor] Failed to copy Terraform files`, {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Copy environment-specific Terraform files
   * 
   * @param {string} deploymentDir - Deployment directory
   * @param {string} cloudProvider - Cloud provider
   */
  async copyEnvironmentFiles(deploymentDir, cloudProvider) {
    try {
      const terraformRootDir = path.join(__dirname, '../../../terraform');
      const srcEnvDir = path.join(terraformRootDir, 'environments', cloudProvider);
      const destEnvDir = path.join(deploymentDir, 'environments', cloudProvider);

      if (!fs.existsSync(srcEnvDir)) {
        logger.warn(`[TerraformExecutor] Environment directory not found`, {
          cloudProvider,
          srcEnvDir,
        });
        return;
      }

      if (!fs.existsSync(destEnvDir)) {
        fs.mkdirSync(destEnvDir, { recursive: true });
      }

      this.copyDirectoryRecursive(srcEnvDir, destEnvDir);
      logger.debug(`[TerraformExecutor] Copied environment files`, { cloudProvider, srcEnvDir, destEnvDir });
    } catch (error) {
      logger.error(`[TerraformExecutor] Failed to copy environment files`, {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Recursively copy directory
   * 
   * @param {string} src - Source directory
   * @param {string} dest - Destination directory
   */
  copyDirectoryRecursive(src, dest) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    const files = fs.readdirSync(src);

    files.forEach(file => {
      const srcPath = path.join(src, file);
      const destPath = path.join(dest, file);
      const stat = fs.statSync(srcPath);

      if (stat.isDirectory()) {
        this.copyDirectoryRecursive(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    });
  }

  /**
   * Get deployment directory path
   * 
   * @param {string} deploymentId - Deployment ID
   * @returns {string} Deployment directory path
   */
  getDeploymentDir(deploymentId) {
    return path.join(this.baseDeploymentDir, deploymentId);
  }

  /**
   * Clean up deployment directory
   * Optional: remove working directory after deployment
   * 
   * @param {string} deploymentId - Deployment ID
   * @param {boolean} keepState - Keep terraform state for future operations
   * @returns {boolean} Success
   */
  async cleanupDeployment(deploymentId, keepState = true) {
    try {
      const deploymentDir = this.getDeploymentDir(deploymentId);

      if (!keepState) {
        fs.rmSync(deploymentDir, { recursive: true, force: true });
        logger.info(`[TerraformExecutor] Deployment directory cleaned up`, { deploymentId });
      } else {
        // Keep .terraform directory and state file, remove temp files
        const tempFiles = ['terraform.plan', 'crash.log'];
        for (const file of tempFiles) {
          const filePath = path.join(deploymentDir, file);
          if (fs.existsSync(filePath)) {
            fs.rmSync(filePath, { recursive: true, force: true });
          }
        }
        logger.info(`[TerraformExecutor] Temporary files cleaned up`, { deploymentId });
      }

      return true;
    } catch (error) {
      logger.error(`[TerraformExecutor] Failed to cleanup deployment`, {
        deploymentId,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Attempt to import existing resources into Terraform state
   * Parses error messages to identify resources and their IDs
   * 
   * @param {string} deploymentDir - Deployment directory
   * @param {string} deploymentId - Deployment ID
   * @param {string} errorOutput - Terraform error output
   * @returns {Promise<boolean>} True if any imports succeeded
   */
  async attemptResourceImports(deploymentDir, deploymentId, errorOutput) {
    const importMappings = [
      // S3 Buckets
      {
        pattern: /creating S3 Bucket \(([^)]+)\)/,
        resource: 'module.s3_bucket[0].aws_s3_bucket.main',
        idExtractor: (match) => match[1],
      },
      // ECR Repositories
      {
        pattern: /creating ECR Repository \(([^)]+)\)/,
        resource: 'module.ecr.aws_ecr_repository.main',
        idExtractor: (match) => match[1],
      },
      // EFS File Systems (extract ID from error message)
      {
        pattern: /File system '([^']+)' already exists with creation token '([^']+)'/,
        resource: 'module.efs[0].aws_efs_file_system.main',
        idExtractor: (match) => match[1],
      },
      // IAM Roles
      {
        pattern: /creating IAM Role \(([^)]+)\).*EntityAlreadyExists/,
        resource: (match) => {
          const roleName = match[1];
          if (roleName.includes('cluster-role')) return 'module.eks_cluster.aws_iam_role.eks_cluster';
          if (roleName.includes('node-group-role')) return 'module.eks_cluster.aws_iam_role.eks_node_group';
          if (roleName.includes('ec2-role')) return 'module.ec2_vms[0].aws_iam_role.ec2';
          return null;
        },
        idExtractor: (match) => match[1],
      },
      // RDS Subnet Groups
      {
        pattern: /creating RDS DB Subnet Group \(([^)]+)\)/,
        resource: 'module.rds[0].aws_db_subnet_group.main',
        idExtractor: (match) => match[1],
      },
      // Secrets Manager Secrets
      {
        pattern: /creating Secrets Manager Secret \(([^)]+)\)/,
        resource: (match) => {
          const secretName = match[1];
          if (secretName.includes('ec2-private-key')) return 'module.ec2_vms[0].aws_secretsmanager_secret.ec2_private_key[0]';
          if (secretName.includes('db-password')) return 'module.rds[0].aws_secretsmanager_secret.db_password[0]';
          return null;
        },
        idExtractor: (match) => match[1],
      },
      // EC2 Key Pairs
      {
        pattern: /importing EC2 Key Pair \(([^)]+)\)/,
        resource: 'module.ec2_vms[0].aws_key_pair.ec2_key[0]',
        idExtractor: (match) => match[1],
      },
    ];

    let successCount = 0;
    let attemptCount = 0;

    for (const mapping of importMappings) {
      const match = errorOutput.match(mapping.pattern);
      if (match) {
        attemptCount++;
        
        const resourceAddress = typeof mapping.resource === 'function' 
          ? mapping.resource(match) 
          : mapping.resource;
        
        const resourceId = mapping.idExtractor(match);

        if (!resourceAddress || !resourceId) {
          logger.debug(`[TerraformExecutor] Skipping import - missing address or ID`, {
            deploymentId,
            pattern: mapping.pattern.source,
          });
          continue;
        }

        try {
          logger.info(`[TerraformExecutor] Attempting import`, {
            deploymentId,
            resource: resourceAddress,
            id: resourceId,
          });

          websocketServer.emitLog(deploymentId, {
            level: 'info',
            message: `Importing existing resource: ${resourceAddress}`,
            timestamp: new Date(),
          });

          const importResult = await this.runTerraform(deploymentDir, 'import', [
            resourceAddress,
            resourceId,
          ]);

          if (importResult.exitCode === 0) {
            successCount++;
            logger.info(`[TerraformExecutor] Successfully imported resource`, {
              deploymentId,
              resource: resourceAddress,
            });

            websocketServer.emitLog(deploymentId, {
              level: 'info',
              message: `✓ Imported: ${resourceAddress}`,
              timestamp: new Date(),
            });
          } else {
            logger.warn(`[TerraformExecutor] Failed to import resource`, {
              deploymentId,
              resource: resourceAddress,
              error: importResult.stderr,
            });
          }
        } catch (error) {
          logger.warn(`[TerraformExecutor] Import error`, {
            deploymentId,
            resource: resourceAddress,
            error: error.message,
          });
        }
      }
    }

    logger.info(`[TerraformExecutor] Import summary`, {
      deploymentId,
      attempted: attemptCount,
      successful: successCount,
    });

    return successCount > 0;
  }

  /**
   * Get deployment status
   * Check current state of Terraform deployment
   * 
   * @param {string} deploymentId - Deployment ID
   * @returns {object} Status information
   */
  async getDeploymentStatus(deploymentId) {
    try {
      const deploymentDir = this.getDeploymentDir(deploymentId);
      const statePath = path.join(deploymentDir, 'terraform.tfstate');

      if (!fs.existsSync(deploymentDir)) {
        return {
          status: 'not-initialized',
          exists: false,
        };
      }

      if (!fs.existsSync(statePath)) {
        return {
          status: 'initialized',
          hasPlan: fs.existsSync(path.join(deploymentDir, 'terraform.plan')),
          hasState: false,
        };
      }

      const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
      return {
        status: 'applied',
        hasState: true,
        resourceCount: state.resources ? state.resources.length : 0,
        version: state.terraform_version,
      };
    } catch (error) {
      logger.error(`[TerraformExecutor] Failed to get deployment status`, {
        deploymentId,
        error: error.message,
      });
      return { status: 'error', error: error.message };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Pre-Destroy Cleanup — provider-specific resource cleanup before
  // `terraform destroy` to prevent "resource not empty" failures.
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Run provider-specific pre-destroy cleanup.
   * @param {string} deploymentId
   * @param {string} cloudProvider   - aws | azure | gcp | digitalocean | linode
   * @param {object} deploymentConfig - the deployment's config/credential data
   * @param {string} deploymentDir    - path to the active Terraform workspace
   * @param {Function} emitLog        - function(message) to stream log lines
   */
  async _preDestroyCleanup(deploymentId, cloudProvider, deploymentConfig, deploymentDir, emitLog) {
    emitLog(`[pre-destroy] Starting pre-destroy cleanup for provider: ${cloudProvider}`);

    try {
      switch (cloudProvider) {
        case 'aws':
          await this._preDestroyAws(deploymentId, deploymentConfig, emitLog);
          break;
        case 'azure':
          await this._preDestroyAzure(deploymentId, deploymentConfig, emitLog);
          break;
        case 'gcp':
          await this._preDestroyGcp(deploymentId, deploymentConfig, emitLog);
          break;
        case 'digitalocean':
          await this._preDestroyDo(deploymentId, deploymentConfig, emitLog);
          break;
        case 'linode':
          await this._preDestroyLinode(deploymentId, deploymentConfig, emitLog);
          break;
        default:
          emitLog(`[pre-destroy] Unknown provider '${cloudProvider}' — skipping cleanup.`);
      }
    } catch (err) {
      logger.warn(`[TerraformExecutor] Pre-destroy cleanup failed (non-fatal): ${err.message}`, { deploymentId, cloudProvider });
      emitLog(`[pre-destroy] WARNING: cleanup step failed: ${err.message}. Proceeding with destroy anyway.`);
    }
  }

  /**
   * AWS pre-destroy: Empty S3 buckets, clear ECR repos, delete EFS mount targets.
   */
  async _preDestroyAws(deploymentId, config, emitLog) {
    const region = config.region || 'us-east-1';
    const envVars = {
      ...process.env,
      AWS_ACCESS_KEY_ID: config.accessKeyId,
      AWS_SECRET_ACCESS_KEY: config.secretAccessKey,
      AWS_DEFAULT_REGION: region,
    };

    // 1. Empty S3 buckets
    const buckets = [config.modelBucket, config.backupBucket, config.tfStateBucket].filter(Boolean);
    for (const bucket of buckets) {
      emitLog(`[pre-destroy][aws] Emptying S3 bucket: ${bucket}`);
      try {
        await execAsync(`aws s3 rm s3://${bucket} --recursive --quiet`, { env: envVars });
      } catch (e) {
        emitLog(`[pre-destroy][aws] Could not empty ${bucket} (may already be empty): ${e.message}`);
      }
    }

    // 2. Delete all ECR images
    const ecrRepos = [config.ecrRepository, config.modelEcrRepo].filter(Boolean);
    for (const repo of ecrRepos) {
      emitLog(`[pre-destroy][aws] Clearing ECR repo: ${repo}`);
      try {
        const listResult = await execAsync(
          `aws ecr list-images --repository-name ${repo} --region ${region} --query "imageIds[*]" --output json`,
          { env: envVars }
        );
        const imageIds = JSON.parse(listResult.stdout || '[]');
        if (imageIds.length > 0) {
          const idsJson = JSON.stringify(imageIds);
          await execAsync(
            `aws ecr batch-delete-image --repository-name ${repo} --region ${region} --image-ids '${idsJson}'`,
            { env: envVars }
          );
        }
      } catch (e) {
        emitLog(`[pre-destroy][aws] Could not clear ECR repo ${repo}: ${e.message}`);
      }
    }

    // 3. Delete EFS mount targets (must be removed before filesystem can be deleted)
    if (config.efsId) {
      emitLog(`[pre-destroy][aws] Removing EFS mount targets for: ${config.efsId}`);
      try {
        const mtResult = await execAsync(
          `aws efs describe-mount-targets --file-system-id ${config.efsId} --region ${region} --query "MountTargets[*].MountTargetId" --output json`,
          { env: envVars }
        );
        const mtIds = JSON.parse(mtResult.stdout || '[]');
        for (const mtId of mtIds) {
          await execAsync(
            `aws efs delete-mount-target --mount-target-id ${mtId} --region ${region}`,
            { env: envVars }
          );
          emitLog(`[pre-destroy][aws] Deleted EFS mount target ${mtId}`);
        }
        if (mtIds.length > 0) await new Promise(r => setTimeout(r, 10_000));
      } catch (e) {
        emitLog(`[pre-destroy][aws] Could not remove EFS mount targets: ${e.message}`);
      }
    }

    emitLog('[pre-destroy][aws] AWS pre-destroy cleanup complete.');
  }

  /**
   * Azure pre-destroy: Remove resource locks and empty blob containers.
   */
  async _preDestroyAzure(deploymentId, config, emitLog) {
    const rg = config.resourceGroup;
    if (!rg) {
      emitLog('[pre-destroy][azure] No resource group in config — skipping lock removal.');
      return;
    }

    emitLog(`[pre-destroy][azure] Checking for resource locks on resource group: ${rg}`);
    try {
      await execAsync(
        `az login --service-principal -u "${config.clientId}" -p "${config.clientSecret}" --tenant "${config.tenantId}" --output none`
      );

      const lockResult = await execAsync(
        `az lock list --resource-group ${rg} --subscription ${config.subscriptionId} --query "[*].name" --output json`
      );
      const locks = JSON.parse(lockResult.stdout || '[]');

      for (const lock of locks) {
        emitLog(`[pre-destroy][azure] Removing lock: ${lock}`);
        await execAsync(
          `az lock delete --name "${lock}" --resource-group ${rg} --subscription ${config.subscriptionId}`
        );
      }

      if (config.storageAccountName && config.storageContainerName) {
        emitLog(`[pre-destroy][azure] Emptying blob container: ${config.storageContainerName}`);
        await execAsync(
          `az storage blob delete-batch --account-name ${config.storageAccountName} --source ${config.storageContainerName} --output none`
        );
      }
    } catch (e) {
      emitLog(`[pre-destroy][azure] Azure pre-destroy step failed: ${e.message}`);
    }

    emitLog('[pre-destroy][azure] Azure pre-destroy cleanup complete.');
  }

  /**
   * GCP pre-destroy: Detach persistent disks from cluster instances.
   */
  async _preDestroyGcp(deploymentId, config, emitLog) {
    const project = config.projectId;
    const zone = config.zone || `${config.region}-a`;

    if (!project) {
      emitLog('[pre-destroy][gcp] No projectId in config — skipping disk detach.');
      return;
    }

    emitLog(`[pre-destroy][gcp] Listing persistent disks in project ${project}, zone ${zone}`);
    try {
      if (config.gcpKeyFile) {
        await execAsync(`gcloud auth activate-service-account --key-file="${config.gcpKeyFile}" --project=${project}`);
      }

      const diskResult = await execAsync(
        `gcloud compute disks list --project=${project} --filter="zone:(${zone}) AND labels.gke-cluster=${config.clusterName}" --format="json(name,users)"`
      );
      const disks = JSON.parse(diskResult.stdout || '[]');

      for (const disk of disks) {
        const users = disk.users || [];
        for (const instance of users) {
          const instanceName = instance.split('/').pop();
          emitLog(`[pre-destroy][gcp] Detaching disk ${disk.name} from instance ${instanceName}`);
          await execAsync(
            `gcloud compute instances detach-disk ${instanceName} --disk=${disk.name} --zone=${zone} --project=${project} --quiet`
          );
        }
      }
    } catch (e) {
      emitLog(`[pre-destroy][gcp] GCP pre-destroy step failed (non-fatal): ${e.message}`);
    }

    emitLog('[pre-destroy][gcp] GCP pre-destroy cleanup complete.');
  }

  /**
   * DigitalOcean pre-destroy: Empty Spaces bucket via S3-compatible CLI.
   */
  async _preDestroyDo(deploymentId, config, emitLog) {
    const bucket = config.spacesBucket;
    const region = config.region || 'nyc3';

    if (!bucket) {
      emitLog('[pre-destroy][digitalocean] No Spaces bucket in config — skipping.');
      return;
    }

    emitLog(`[pre-destroy][digitalocean] Emptying Spaces bucket: ${bucket}`);
    try {
      const envVars = {
        ...process.env,
        AWS_ACCESS_KEY_ID: config.spacesAccessKey,
        AWS_SECRET_ACCESS_KEY: config.spacesSecretKey,
      };
      await execAsync(
        `aws s3 rm s3://${bucket} --recursive --quiet --endpoint-url https://${region}.digitaloceanspaces.com`,
        { env: envVars }
      );
    } catch (e) {
      emitLog(`[pre-destroy][digitalocean] Could not empty Spaces bucket: ${e.message}`);
    }

    emitLog('[pre-destroy][digitalocean] DigitalOcean pre-destroy cleanup complete.');
  }

  /**
   * Linode pre-destroy: Empty Object Storage bucket via S3-compatible CLI.
   */
  async _preDestroyLinode(deploymentId, config, emitLog) {
    const bucket = config.objectStorageBucket;
    const region = config.region || 'us-east-1';

    if (!bucket) {
      emitLog('[pre-destroy][linode] No Object Storage bucket in config — skipping.');
      return;
    }

    emitLog(`[pre-destroy][linode] Emptying Object Storage bucket: ${bucket}`);
    try {
      const envVars = {
        ...process.env,
        AWS_ACCESS_KEY_ID: config.objectStorageKey,
        AWS_SECRET_ACCESS_KEY: config.objectStorageSecret,
      };
      await execAsync(
        `aws s3 rm s3://${bucket} --recursive --quiet --endpoint-url https://${region}.linodeobjects.com`,
        { env: envVars }
      );
    } catch (e) {
      emitLog(`[pre-destroy][linode] Could not empty Object Storage bucket: ${e.message}`);
    }

    emitLog('[pre-destroy][linode] Linode pre-destroy cleanup complete.');
  }
}

const terraformExecutor = new TerraformExecutor();
terraformExecutor.PROVIDER_APPLY_ERRORS = PROVIDER_APPLY_ERRORS;
module.exports = terraformExecutor;
