const { spawn, exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const os = require('os');
const yaml = require('js-yaml');
const logger = require('./logger');
const credentialService = require('./credentialService');
const ContainerDeployment = require('../models/ContainerDeployment');
const { Credential, Deployment } = require('../models');

// AWS SDK v3 imports for EKS and EFS management
const { EKSClient, ListAddonsCommand, DescribeAddonCommand, CreateAddonCommand, DescribeClusterCommand, UpdateClusterConfigCommand } = require('@aws-sdk/client-eks');
const { EFSClient, DescribeFileSystemsCommand } = require('@aws-sdk/client-efs');
const { EC2Client, DescribeSubnetsCommand, CreateTagsCommand, DeleteTagsCommand, DescribeSecurityGroupsCommand, DescribeVpcsCommand, CreateSecurityGroupCommand, AuthorizeSecurityGroupIngressCommand, AuthorizeSecurityGroupEgressCommand, DescribeInstancesCommand, DescribeRegionsCommand } = require('@aws-sdk/client-ec2');
const { ElasticLoadBalancingV2Client, DescribeLoadBalancersCommand, DescribeTargetGroupsCommand } = require('@aws-sdk/client-elastic-load-balancing-v2');

const execAsync = promisify(exec);

/**
 * ContainerDeploymentService
 * Manages the full lifecycle of container deployments:
 * Local Docker build → Registry push → K8s deployment
 */
class ContainerDeploymentService {
  constructor() {
    this.activeProcesses = new Map();
  }

  /**
   * Get decrypted credential data for a given credential
   * Supports all cloud providers: AWS, Azure, GCP, DigitalOcean, Linode
   * @param {object} credential - Credential model instance
   * @returns {object} Decrypted credential data with provider-specific fields
   */
  getDecryptedCredentialData(credential) {
    if (!credential) {
      throw new Error('Credential is required');
    }

    // Use the new unified decryption method from credentialService
    // This handles both legacy AWS format and new multi-cloud format
    try {
      const decrypted = credentialService.getDecryptedCredentialFromModel(credential);
      
      // Ensure we always have a provider field
      if (!decrypted.provider) {
        decrypted.provider = credential.cloudProvider;
      }

      // Add additional metadata from the credential record
      decrypted.accountId = decrypted.accountId || credential.cloudAccountId;
      decrypted.region = decrypted.region || credential.cloudRegion;
      decrypted.additionalRegions = credential.additionalRegions || [];
      
      // For multi-region support, ensure regions array exists
      if (!decrypted.regions) {
        decrypted.regions = [decrypted.region];
        if (credential.additionalRegions && credential.additionalRegions.length > 0) {
          decrypted.regions = [...decrypted.regions, ...credential.additionalRegions];
        }
      }

      return decrypted;
    } catch (error) {
      logger.error(`Failed to decrypt credentials for provider ${credential.cloudProvider}`, { error: error.message });
      throw error;
    }
  }

  /**
   * Get available regions for a cloud credential
   * Dynamically queries the cloud provider API for real-time region list
   * Falls back to static defaults if API call fails
   */
  async getAvailableRegions(credentialId) {
    const credential = await Credential.findByPk(credentialId);
    if (!credential) {
      throw new Error('Credential not found');
    }

    const decryptedData = this.getDecryptedCredentialData(credential);
    const configuredRegion = decryptedData.region || credential.cloudRegion;
    const additionalRegions = decryptedData.additionalRegions || credential.additionalRegions || [];

    // Try to fetch regions dynamically from cloud provider API
    let regions = [];
    let fetchedFromApi = false;

    try {
      if (credential.cloudProvider === 'aws') {
        regions = await this._fetchAwsRegions(decryptedData);
        fetchedFromApi = true;
        logger.info('Fetched AWS regions dynamically from EC2 API', { count: regions.length });
      } else if (credential.cloudProvider === 'azure') {
        // Azure requires subscription-level API calls - use static for now
        regions = this._getStaticRegions('azure');
      } else if (credential.cloudProvider === 'gcp') {
        // GCP compute.regions.list requires project setup - use static for now  
        regions = this._getStaticRegions('gcp');
      } else if (credential.cloudProvider === 'digitalocean') {
        regions = await this._fetchDigitalOceanRegions(decryptedData);
        fetchedFromApi = true;
        logger.info('Fetched DigitalOcean regions dynamically from API', { count: regions.length });
      } else if (credential.cloudProvider === 'linode') {
        regions = await this._fetchLinodeRegions(decryptedData);
        fetchedFromApi = true;
        logger.info('Fetched Linode regions dynamically from API', { count: regions.length });
      } else {
        regions = this._getStaticRegions(credential.cloudProvider);
      }
    } catch (error) {
      logger.warn(`Failed to fetch regions dynamically for ${credential.cloudProvider}, using static fallback`, { 
        error: error.message 
      });
      regions = this._getStaticRegions(credential.cloudProvider);
    }
    
    return {
      provider: credential.cloudProvider,
      defaultRegion: configuredRegion,
      configuredRegions: [configuredRegion, ...additionalRegions].filter(Boolean),
      availableRegions: regions,
      fetchedFromApi,
    };
  }

  /**
   * Fetch AWS regions dynamically using EC2 DescribeRegions API
   * This returns all regions accessible to the credential (including GovCloud if applicable)
   */
  async _fetchAwsRegions(decryptedData) {
    const ec2Client = new EC2Client({
      region: decryptedData.region || 'us-east-1',
      credentials: {
        accessKeyId: decryptedData.accessKeyId,
        secretAccessKey: decryptedData.secretAccessKey,
        ...(decryptedData.sessionToken && { sessionToken: decryptedData.sessionToken }),
      },
    });

    const command = new DescribeRegionsCommand({
      AllRegions: false, // Only return regions enabled for this account
    });

    const response = await ec2Client.send(command);
    
    // Map AWS region response to our format with friendly names
    const regionNameMap = {
      'us-east-1': 'US East (N. Virginia)',
      'us-east-2': 'US East (Ohio)',
      'us-west-1': 'US West (N. California)',
      'us-west-2': 'US West (Oregon)',
      'af-south-1': 'Africa (Cape Town)',
      'ap-east-1': 'Asia Pacific (Hong Kong)',
      'ap-south-1': 'Asia Pacific (Mumbai)',
      'ap-south-2': 'Asia Pacific (Hyderabad)',
      'ap-northeast-1': 'Asia Pacific (Tokyo)',
      'ap-northeast-2': 'Asia Pacific (Seoul)',
      'ap-northeast-3': 'Asia Pacific (Osaka)',
      'ap-southeast-1': 'Asia Pacific (Singapore)',
      'ap-southeast-2': 'Asia Pacific (Sydney)',
      'ap-southeast-3': 'Asia Pacific (Jakarta)',
      'ap-southeast-4': 'Asia Pacific (Melbourne)',
      'ca-central-1': 'Canada (Central)',
      'ca-west-1': 'Canada West (Calgary)',
      'eu-central-1': 'Europe (Frankfurt)',
      'eu-central-2': 'Europe (Zurich)',
      'eu-west-1': 'Europe (Ireland)',
      'eu-west-2': 'Europe (London)',
      'eu-west-3': 'Europe (Paris)',
      'eu-north-1': 'Europe (Stockholm)',
      'eu-south-1': 'Europe (Milan)',
      'eu-south-2': 'Europe (Spain)',
      'il-central-1': 'Israel (Tel Aviv)',
      'me-south-1': 'Middle East (Bahrain)',
      'me-central-1': 'Middle East (UAE)',
      'sa-east-1': 'South America (São Paulo)',
      'us-gov-east-1': 'AWS GovCloud (US-East)',
      'us-gov-west-1': 'AWS GovCloud (US-West)',
      'cn-north-1': 'China (Beijing)',
      'cn-northwest-1': 'China (Ningxia)',
    };

    return response.Regions.map(region => ({
      id: region.RegionName,
      name: regionNameMap[region.RegionName] || region.RegionName,
      endpoint: region.Endpoint,
      optInStatus: region.OptInStatus,
    })).sort((a, b) => a.id.localeCompare(b.id));
  }

  /**
   * Fetch DigitalOcean regions dynamically
   */
  async _fetchDigitalOceanRegions(decryptedData) {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch('https://api.digitalocean.com/v2/regions', {
      headers: {
        'Authorization': `Bearer ${decryptedData.apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`DigitalOcean API error: ${response.status}`);
    }

    const data = await response.json();
    return data.regions
      .filter(r => r.available)
      .map(region => ({
        id: region.slug,
        name: region.name,
        available: region.available,
        features: region.features,
      }))
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  /**
   * Fetch Linode regions dynamically
   */
  async _fetchLinodeRegions(decryptedData) {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch('https://api.linode.com/v4/regions', {
      headers: {
        'Authorization': `Bearer ${decryptedData.apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Linode API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data
      .filter(r => r.status === 'ok')
      .map(region => ({
        id: region.id,
        name: `${region.label} (${region.country})`,
        country: region.country,
        capabilities: region.capabilities,
      }))
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  /**
   * Static fallback regions when API is unavailable
   */
  _getStaticRegions(provider) {
    const staticRegions = {
      aws: [
        { id: 'us-east-1', name: 'US East (N. Virginia)' },
        { id: 'us-east-2', name: 'US East (Ohio)' },
        { id: 'us-west-1', name: 'US West (N. California)' },
        { id: 'us-west-2', name: 'US West (Oregon)' },
        { id: 'eu-west-1', name: 'Europe (Ireland)' },
        { id: 'eu-west-2', name: 'Europe (London)' },
        { id: 'eu-central-1', name: 'Europe (Frankfurt)' },
        { id: 'ap-southeast-1', name: 'Asia Pacific (Singapore)' },
        { id: 'ap-southeast-2', name: 'Asia Pacific (Sydney)' },
        { id: 'ap-northeast-1', name: 'Asia Pacific (Tokyo)' },
        { id: 'ca-central-1', name: 'Canada (Central)' },
        { id: 'sa-east-1', name: 'South America (São Paulo)' },
      ],
      azure: [
        { id: 'eastus', name: 'East US' },
        { id: 'eastus2', name: 'East US 2' },
        { id: 'westus', name: 'West US' },
        { id: 'westus2', name: 'West US 2' },
        { id: 'westus3', name: 'West US 3' },
        { id: 'centralus', name: 'Central US' },
        { id: 'northeurope', name: 'North Europe' },
        { id: 'westeurope', name: 'West Europe' },
        { id: 'uksouth', name: 'UK South' },
        { id: 'eastasia', name: 'East Asia' },
        { id: 'southeastasia', name: 'Southeast Asia' },
        { id: 'japaneast', name: 'Japan East' },
        { id: 'australiaeast', name: 'Australia East' },
      ],
      gcp: [
        { id: 'us-central1', name: 'Iowa' },
        { id: 'us-east1', name: 'South Carolina' },
        { id: 'us-east4', name: 'Northern Virginia' },
        { id: 'us-west1', name: 'Oregon' },
        { id: 'us-west2', name: 'Los Angeles' },
        { id: 'europe-west1', name: 'Belgium' },
        { id: 'europe-west2', name: 'London' },
        { id: 'europe-west3', name: 'Frankfurt' },
        { id: 'asia-east1', name: 'Taiwan' },
        { id: 'asia-southeast1', name: 'Singapore' },
        { id: 'asia-northeast1', name: 'Tokyo' },
        { id: 'australia-southeast1', name: 'Sydney' },
      ],
      digitalocean: [
        { id: 'nyc1', name: 'New York 1' },
        { id: 'nyc3', name: 'New York 3' },
        { id: 'sfo3', name: 'San Francisco 3' },
        { id: 'ams3', name: 'Amsterdam 3' },
        { id: 'sgp1', name: 'Singapore 1' },
        { id: 'lon1', name: 'London 1' },
        { id: 'fra1', name: 'Frankfurt 1' },
        { id: 'tor1', name: 'Toronto 1' },
        { id: 'blr1', name: 'Bangalore 1' },
      ],
      linode: [
        { id: 'us-east', name: 'Newark, NJ' },
        { id: 'us-central', name: 'Dallas, TX' },
        { id: 'us-west', name: 'Fremont, CA' },
        { id: 'eu-west', name: 'London, UK' },
        { id: 'eu-central', name: 'Frankfurt, DE' },
        { id: 'ap-south', name: 'Singapore' },
        { id: 'ap-northeast', name: 'Tokyo, JP' },
        { id: 'ap-southeast', name: 'Sydney, AU' },
      ],
    };
    return staticRegions[provider] || [];
  }

  /**
   * Create a new container deployment record
   */
  async create(userId, config) {
    try {
      const deploymentTarget = config.deploymentTarget || 'local';
      const containerDeployment = await ContainerDeployment.create({
        userId,
        credentialId: config.credentialId,
        deploymentId: config.deploymentId,
        name: config.name,
        sourceType: config.sourceType || 'dockerfile',
        dockerfilePath: config.dockerfilePath,
        buildContext: config.buildContext || '.',
        gitRepoUrl: config.gitRepoUrl,
        gitBranch: config.gitBranch || 'main',
        imageName: config.imageName,
        imageTag: config.imageTag || 'latest',
        deploymentTarget: deploymentTarget,
        registryType: deploymentTarget === 'local' ? 'local' : config.registryType,
        registryUrl: config.registryUrl,
        repositoryName: config.repositoryName,
        registryRegion: config.registryRegion,
        k8sNamespace: config.k8sNamespace || 'default',
        k8sDeploymentName: config.k8sDeploymentName || config.imageName,
        k8sServiceName: config.k8sServiceName,
        k8sServiceType: config.k8sServiceType || 'ClusterIP',
        k8sReplicas: config.k8sReplicas || 1,
        k8sContainerPort: config.k8sContainerPort,
        k8sServicePort: config.k8sServicePort,
        k8sResourceRequests: config.k8sResourceRequests,
        k8sResourceLimits: config.k8sResourceLimits,
        k8sEnvironmentVars: config.k8sEnvironmentVars || [],
        k8sHealthCheck: config.k8sHealthCheck,
        buildArgs: config.buildArgs || {},
        buildPlatform: config.buildPlatform || 'linux/amd64',
        noCache: config.noCache || false,
      });

      logger.info('Container deployment created', { 
        id: containerDeployment.id, 
        name: config.name,
        target: deploymentTarget,
      });
      return containerDeployment;
    } catch (error) {
      logger.error('Failed to create container deployment', error);
      throw error;
    }
  }

  /**
   * Get all container deployments for a user
   */
  async getByUser(userId) {
    return ContainerDeployment.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      include: [
        { model: Credential, as: 'credential', attributes: ['id', 'name', 'cloudProvider'] },
        { model: Deployment, as: 'clusterDeployment', attributes: ['id', 'clusterName', 'status'] },
      ],
    });
  }

  /**
   * Get container deployment by ID
   */
  async getById(id) {
    return ContainerDeployment.findByPk(id, {
      include: [
        { model: Credential, as: 'credential' },
        { model: Deployment, as: 'clusterDeployment' },
      ],
    });
  }

  /**
   * Start the full deployment pipeline
   */
  async startPipeline(id, options = {}) {
    const deployment = await this.getById(id);
    if (!deployment) {
      throw new Error(`Container deployment ${id} not found`);
    }

    const { skipBuild, skipPush, skipDeploy } = options;
    const isLocalOnly = deployment.deploymentTarget === 'local';

    try {
      deployment.status = 'pending';
      deployment.currentPhase = 'init';
      deployment.progress = 0;
      await deployment.save();

      this.addLog(deployment, 'info', `Starting ${isLocalOnly ? 'local' : 'registry'} deployment pipeline`);

      // Phase 1: Build (if not skipping)
      if (!skipBuild && deployment.sourceType !== 'local-image') {
        await this.buildImage(deployment);
      }

      // Phase 2: Push to registry (only if target is 'registry' and not skipping)
      if (!isLocalOnly && !skipPush) {
        await this.pushToRegistry(deployment);
      } else if (isLocalOnly) {
        this.addLog(deployment, 'info', 'Skipping registry push (local deployment)');
        deployment.status = 'built';
        deployment.progress = 70;
        await deployment.save();
      }

      // Phase 3: Deploy to K8s (if not skipping and cluster is specified)
      if (!skipDeploy && deployment.deploymentId) {
        await this.deployToKubernetes(deployment);
      }

      // Mark as completed
      const finalStatus = deployment.deploymentId ? 'deployed' : (isLocalOnly ? 'built' : 'pushed');
      deployment.status = finalStatus;
      deployment.currentPhase = 'completed';
      deployment.progress = 100;
      deployment.deployCompletedAt = new Date();
      await deployment.save();

      logger.info('Container deployment pipeline completed', { id, target: deployment.deploymentTarget });
      return deployment;
    } catch (error) {
      deployment.status = 'failed';
      deployment.currentPhase = 'failed';
      deployment.errorMessage = error.message;
      await deployment.save();

      logger.error('Container deployment pipeline failed', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Build Docker image locally
   */
  async buildImage(deployment) {
    deployment.status = 'building';
    deployment.currentPhase = 'build';
    deployment.buildStartedAt = new Date();
    deployment.progress = 10;
    await deployment.save();

    this.addLog(deployment, 'info', `Starting build for ${deployment.imageName}:${deployment.imageTag}`);

    try {
      const buildArgs = [];
      
      // Add build arguments
      if (deployment.buildArgs && Object.keys(deployment.buildArgs).length > 0) {
        for (const [key, value] of Object.entries(deployment.buildArgs)) {
          buildArgs.push('--build-arg', `${key}=${value}`);
        }
      }

      // Build command
      const args = [
        'build',
        '-t', `${deployment.imageName}:${deployment.imageTag}`,
        '--platform', deployment.buildPlatform,
        ...(deployment.noCache ? ['--no-cache'] : []),
        ...(deployment.dockerfilePath ? ['-f', deployment.dockerfilePath] : []),
        ...buildArgs,
        deployment.buildContext || '.',
      ];

      this.addLog(deployment, 'info', `Running: docker ${args.join(' ')}`);

      const result = await this.runDockerCommand(args, deployment);

      // Get the image ID
      const { stdout } = await execAsync(`docker images -q ${deployment.imageName}:${deployment.imageTag}`);
      deployment.localImageId = stdout.trim();

      deployment.status = 'built';
      deployment.buildCompletedAt = new Date();
      deployment.progress = 40;
      await deployment.save();

      this.addLog(deployment, 'success', `Build completed. Image ID: ${deployment.localImageId}`);
      return result;
    } catch (error) {
      this.addLog(deployment, 'error', `Build failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Push image to container registry
   */
  async pushToRegistry(deployment) {
    deployment.status = 'pushing';
    deployment.currentPhase = 'push';
    deployment.pushStartedAt = new Date();
    deployment.progress = 50;
    await deployment.save();

    try {
      // Authenticate with registry
      await this.authenticateRegistry(deployment);

      // Tag image for registry
      const fullImageUri = this.getFullImageUri(deployment);
      await this.tagImage(deployment, fullImageUri);

      // Push image
      this.addLog(deployment, 'info', `Pushing to ${fullImageUri}`);
      await this.runDockerCommand(['push', fullImageUri], deployment);

      deployment.pushedImageUri = fullImageUri;
      deployment.status = 'pushed';
      deployment.pushCompletedAt = new Date();
      deployment.progress = 70;
      await deployment.save();

      this.addLog(deployment, 'success', `Push completed: ${fullImageUri}`);
    } catch (error) {
      this.addLog(deployment, 'error', `Push failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Deploy image to Kubernetes cluster
   */
  async deployToKubernetes(deployment) {
    deployment.status = 'deploying';
    deployment.currentPhase = 'deploy';
    deployment.deployStartedAt = new Date();
    deployment.progress = 80;
    await deployment.save();

    try {
      // Get cluster configuration
      const clusterDeployment = await Deployment.findByPk(deployment.deploymentId);
      if (!clusterDeployment) {
        throw new Error('Associated cluster deployment not found');
      }

      // Generate K8s manifests
      const manifests = this.generateK8sManifests(deployment);

      // Apply manifests
      for (const manifest of manifests) {
        await this.applyK8sManifest(manifest, deployment);
      }

      // Verify deployment
      await this.verifyK8sDeployment(deployment);

      deployment.status = 'deployed';
      deployment.currentPhase = 'verify';
      deployment.progress = 95;
      deployment.rollbackAvailable = true;
      await deployment.save();

      this.addLog(deployment, 'success', 'Kubernetes deployment completed');
    } catch (error) {
      this.addLog(deployment, 'error', `K8s deployment failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Authenticate with container registry
   */
  async authenticateRegistry(deployment) {
    this.addLog(deployment, 'info', `Authenticating with ${deployment.registryType} registry`);

    const credential = await Credential.findByPk(deployment.credentialId);
    if (!credential) {
      throw new Error('Credential not found for registry authentication');
    }

    // Decrypt credentials
    const decryptedData = this.getDecryptedCredentialData(credential);

    switch (deployment.registryType) {
      case 'ecr':
        await this.authenticateECR(deployment, decryptedData);
        break;
      case 'acr':
        await this.authenticateACR(deployment, decryptedData);
        break;
      case 'gcr':
        await this.authenticateGCR(deployment, decryptedData);
        break;
      case 'docker-hub':
        await this.authenticateDockerHub(deployment, decryptedData);
        break;
      case 'private':
        await this.authenticatePrivateRegistry(deployment, decryptedData);
        break;
      default:
        throw new Error(`Unsupported registry type: ${deployment.registryType}`);
    }
  }

  /**
   * Authenticate with AWS ECR
   */
  async authenticateECR(deployment, credentials) {
    const region = deployment.registryRegion || 'us-east-1';
    
    // Set AWS credentials in environment
    const env = {
      ...process.env,
      AWS_ACCESS_KEY_ID: credentials.accessKeyId,
      AWS_SECRET_ACCESS_KEY: credentials.secretAccessKey,
      AWS_DEFAULT_REGION: region,
    };

    // Get ECR login password
    const { stdout: password } = await execAsync(
      `aws ecr get-login-password --region ${region}`,
      { env }
    );

    // Docker login
    const registryUrl = deployment.registryUrl || 
      `${credentials.accountId || ''}.dkr.ecr.${region}.amazonaws.com`;

    await execAsync(
      `docker login --username AWS --password-stdin ${registryUrl}`,
      { env, input: password.trim() }
    );

    deployment.registryUrl = registryUrl;
    this.addLog(deployment, 'success', 'ECR authentication successful');
  }

  /**
   * Authenticate with Azure ACR
   */
  async authenticateACR(deployment, credentials) {
    const registryUrl = deployment.registryUrl;
    
    await execAsync(
      `docker login ${registryUrl} -u ${credentials.clientId} -p ${credentials.clientSecret}`
    );

    this.addLog(deployment, 'success', 'ACR authentication successful');
  }

  /**
   * Authenticate with Google GCR
   */
  async authenticateGCR(deployment, credentials) {
    const keyFile = `/tmp/gcp-key-${deployment.id}.json`;
    await fs.writeFile(keyFile, JSON.stringify(credentials.serviceAccountKey));

    try {
      await execAsync(`cat ${keyFile} | docker login -u _json_key --password-stdin https://gcr.io`);
      this.addLog(deployment, 'success', 'GCR authentication successful');
    } finally {
      await fs.unlink(keyFile).catch(() => {});
    }
  }

  /**
   * Authenticate with Docker Hub
   */
  async authenticateDockerHub(deployment, credentials) {
    await execAsync(
      `docker login -u ${credentials.username} -p ${credentials.password}`
    );
    this.addLog(deployment, 'success', 'Docker Hub authentication successful');
  }

  /**
   * Authenticate with private registry
   */
  async authenticatePrivateRegistry(deployment, credentials) {
    await execAsync(
      `docker login ${deployment.registryUrl} -u ${credentials.username} -p ${credentials.password}`
    );
    this.addLog(deployment, 'success', 'Private registry authentication successful');
  }

  /**
   * Tag image for registry
   */
  async tagImage(deployment, fullImageUri) {
    deployment.currentPhase = 'tag';
    await deployment.save();

    const localImage = `${deployment.imageName}:${deployment.imageTag}`;
    this.addLog(deployment, 'info', `Tagging ${localImage} as ${fullImageUri}`);

    await this.runDockerCommand(['tag', localImage, fullImageUri], deployment);
  }

  /**
   * Get full image URI for registry
   */
  getFullImageUri(deployment) {
    const registry = deployment.registryUrl || '';
    const repo = deployment.repositoryName || deployment.imageName;
    const tag = deployment.imageTag || 'latest';

    switch (deployment.registryType) {
      case 'ecr':
        return `${registry}/${repo}:${tag}`;
      case 'acr':
        return `${registry}/${repo}:${tag}`;
      case 'gcr':
        return `gcr.io/${registry}/${repo}:${tag}`;
      case 'docker-hub':
        return registry ? `${registry}/${repo}:${tag}` : `${repo}:${tag}`;
      case 'private':
        return `${registry}/${repo}:${tag}`;
      default:
        return `${repo}:${tag}`;
    }
  }

  /**
   * Generate Kubernetes manifests
   */
  generateK8sManifests(deployment) {
    const manifests = [];

    // Deployment manifest
    const deploymentManifest = {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: {
        name: deployment.k8sDeploymentName,
        namespace: deployment.k8sNamespace,
        labels: {
          app: deployment.k8sDeploymentName,
          'managed-by': 'zlaws-container-deployer',
        },
      },
      spec: {
        replicas: deployment.k8sReplicas,
        selector: {
          matchLabels: {
            app: deployment.k8sDeploymentName,
          },
        },
        template: {
          metadata: {
            labels: {
              app: deployment.k8sDeploymentName,
            },
          },
          spec: {
            containers: [{
              name: deployment.imageName.replace(/[^a-z0-9-]/gi, '-'),
              image: deployment.pushedImageUri,
              ports: deployment.k8sContainerPort ? [{
                containerPort: deployment.k8sContainerPort,
              }] : [],
              resources: {
                requests: deployment.k8sResourceRequests,
                limits: deployment.k8sResourceLimits,
              },
              env: deployment.k8sEnvironmentVars,
              ...(deployment.k8sHealthCheck?.enabled ? {
                livenessProbe: {
                  httpGet: {
                    path: deployment.k8sHealthCheck.path,
                    port: deployment.k8sHealthCheck.port,
                  },
                  initialDelaySeconds: deployment.k8sHealthCheck.initialDelaySeconds,
                  periodSeconds: deployment.k8sHealthCheck.periodSeconds,
                },
                readinessProbe: {
                  httpGet: {
                    path: deployment.k8sHealthCheck.path,
                    port: deployment.k8sHealthCheck.port,
                  },
                  initialDelaySeconds: 5,
                  periodSeconds: 5,
                },
              } : {}),
            }],
          },
        },
      },
    };
    manifests.push(deploymentManifest);

    // Service manifest (if service name specified)
    if (deployment.k8sServiceName && deployment.k8sServicePort) {
      const serviceManifest = {
        apiVersion: 'v1',
        kind: 'Service',
        metadata: {
          name: deployment.k8sServiceName,
          namespace: deployment.k8sNamespace,
          labels: {
            app: deployment.k8sDeploymentName,
          },
        },
        spec: {
          type: deployment.k8sServiceType,
          ports: [{
            port: deployment.k8sServicePort,
            targetPort: deployment.k8sContainerPort || deployment.k8sServicePort,
            protocol: 'TCP',
          }],
          selector: {
            app: deployment.k8sDeploymentName,
          },
        },
      };
      manifests.push(serviceManifest);
    }

    return manifests;
  }

  /**
   * Apply K8s manifest
   */
  async applyK8sManifest(manifest, deployment) {
    const yaml = require('js-yaml');
    const manifestYaml = yaml.dump(manifest);
    const manifestFile = `/tmp/k8s-manifest-${deployment.id}-${manifest.kind.toLowerCase()}.yaml`;

    await fs.writeFile(manifestFile, manifestYaml);

    try {
      this.addLog(deployment, 'info', `Applying ${manifest.kind}: ${manifest.metadata.name}`);
      await execAsync(`kubectl apply -f ${manifestFile}`);
      this.addLog(deployment, 'success', `${manifest.kind} applied successfully`);
    } finally {
      await fs.unlink(manifestFile).catch(() => {});
    }
  }

  /**
   * Verify K8s deployment is running
   */
  async verifyK8sDeployment(deployment) {
    this.addLog(deployment, 'info', 'Verifying Kubernetes deployment...');

    const maxRetries = 30;
    const retryInterval = 5000;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const { stdout } = await execAsync(
          `kubectl get deployment ${deployment.k8sDeploymentName} -n ${deployment.k8sNamespace} -o jsonpath='{.status.readyReplicas}'`
        );

        const readyReplicas = parseInt(stdout) || 0;
        if (readyReplicas >= deployment.k8sReplicas) {
          this.addLog(deployment, 'success', `All ${readyReplicas} replicas are ready`);
          return true;
        }

        this.addLog(deployment, 'info', `Waiting for replicas... (${readyReplicas}/${deployment.k8sReplicas})`);
      } catch (error) {
        this.addLog(deployment, 'warn', `Verification attempt ${i + 1} failed: ${error.message}`);
      }

      await new Promise(resolve => setTimeout(resolve, retryInterval));
    }

    throw new Error('Deployment verification timed out');
  }

  /**
   * Rollback to previous image
   */
  async rollback(id) {
    const deployment = await this.getById(id);
    if (!deployment) {
      throw new Error(`Container deployment ${id} not found`);
    }

    if (!deployment.rollbackAvailable || !deployment.previousImageUri) {
      throw new Error('No previous image available for rollback');
    }

    try {
      this.addLog(deployment, 'info', `Rolling back to ${deployment.previousImageUri}`);

      // Update the K8s deployment with previous image
      await execAsync(
        `kubectl set image deployment/${deployment.k8sDeploymentName} ` +
        `${deployment.imageName.replace(/[^a-z0-9-]/gi, '-')}=${deployment.previousImageUri} ` +
        `-n ${deployment.k8sNamespace}`
      );

      // Swap current and previous images
      const currentUri = deployment.pushedImageUri;
      deployment.pushedImageUri = deployment.previousImageUri;
      deployment.previousImageUri = currentUri;
      deployment.status = 'rolled_back';
      await deployment.save();

      this.addLog(deployment, 'success', 'Rollback completed');
      return deployment;
    } catch (error) {
      this.addLog(deployment, 'error', `Rollback failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Scale K8s deployment
   */
  async scale(id, replicas) {
    const deployment = await this.getById(id);
    if (!deployment) {
      throw new Error(`Container deployment ${id} not found`);
    }

    await execAsync(
      `kubectl scale deployment/${deployment.k8sDeploymentName} --replicas=${replicas} -n ${deployment.k8sNamespace}`
    );

    deployment.k8sReplicas = replicas;
    await deployment.save();

    this.addLog(deployment, 'success', `Scaled to ${replicas} replicas`);
    return deployment;
  }

  /**
   * Get deployment status from K8s
   */
  async getK8sStatus(id) {
    const deployment = await this.getById(id);
    if (!deployment) {
      throw new Error(`Container deployment ${id} not found`);
    }

    try {
      const { stdout: deploymentStatus } = await execAsync(
        `kubectl get deployment ${deployment.k8sDeploymentName} -n ${deployment.k8sNamespace} -o json`
      );

      const { stdout: podsStatus } = await execAsync(
        `kubectl get pods -l app=${deployment.k8sDeploymentName} -n ${deployment.k8sNamespace} -o json`
      );

      let serviceStatus = null;
      if (deployment.k8sServiceName) {
        const { stdout } = await execAsync(
          `kubectl get service ${deployment.k8sServiceName} -n ${deployment.k8sNamespace} -o json`
        ).catch(() => ({ stdout: null }));
        serviceStatus = stdout ? JSON.parse(stdout) : null;
      }

      return {
        deployment: JSON.parse(deploymentStatus),
        pods: JSON.parse(podsStatus),
        service: serviceStatus,
      };
    } catch (error) {
      logger.error('Failed to get K8s status', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Delete container deployment
   */
  async delete(id, deleteFromK8s = false) {
    const deployment = await this.getById(id);
    if (!deployment) {
      throw new Error(`Container deployment ${id} not found`);
    }

    if (deleteFromK8s && deployment.k8sDeploymentName) {
      try {
        await execAsync(
          `kubectl delete deployment ${deployment.k8sDeploymentName} -n ${deployment.k8sNamespace}`
        );
        if (deployment.k8sServiceName) {
          await execAsync(
            `kubectl delete service ${deployment.k8sServiceName} -n ${deployment.k8sNamespace}`
          );
        }
      } catch (error) {
        logger.warn('Failed to delete K8s resources', { id, error: error.message });
      }
    }

    await deployment.destroy();
    return { deleted: true };
  }

  /**
   * Run Docker command and capture output
   */
  async runDockerCommand(args, deployment) {
    return new Promise((resolve, reject) => {
      const docker = spawn('docker', args, {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      this.activeProcesses.set(deployment.id, docker);

      let stdout = '';
      let stderr = '';

      docker.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        this.addLog(deployment, 'output', output.trim());
      });

      docker.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        // Docker build progress goes to stderr
        if (!output.includes('error') && !output.includes('Error')) {
          this.addLog(deployment, 'output', output.trim());
        } else {
          this.addLog(deployment, 'error', output.trim());
        }
      });

      docker.on('close', (code) => {
        this.activeProcesses.delete(deployment.id);
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`Docker command failed with code ${code}: ${stderr}`));
        }
      });

      docker.on('error', (error) => {
        this.activeProcesses.delete(deployment.id);
        reject(error);
      });
    });
  }

  /**
   * Add log entry to deployment
   */
  async addLog(deployment, type, message) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type,
      message,
    };

    deployment.logs = [...(deployment.logs || []), logEntry];
    await deployment.save();

    logger.info(`[ContainerDeploy:${deployment.id}] ${type}: ${message}`);
  }

  /**
   * Cancel active build/push
   */
  async cancel(id) {
    const process = this.activeProcesses.get(id);
    if (process) {
      process.kill('SIGTERM');
      this.activeProcesses.delete(id);
    }

    const deployment = await this.getById(id);
    if (deployment) {
      deployment.status = 'failed';
      deployment.errorMessage = 'Cancelled by user';
      await deployment.save();
    }

    return { cancelled: true };
  }

  /**
   * List local Docker images
   */
  async listLocalImages(filter = {}) {
    try {
      const { stdout } = await execAsync('docker images --format "{{json .}}"');
      const lines = stdout.trim().split('\n').filter(Boolean);
      let images = lines.map(line => JSON.parse(line));

      // Apply filters
      if (filter.repository) {
        images = images.filter(img => 
          img.Repository.toLowerCase().includes(filter.repository.toLowerCase())
        );
      }
      if (filter.tag) {
        images = images.filter(img => img.Tag === filter.tag);
      }
      if (filter.dangling === false) {
        images = images.filter(img => img.Repository !== '<none>');
      }

      return images;
    } catch (error) {
      logger.error('Failed to list local images', { error: error.message });
      throw error;
    }
  }

  /**
   * List running and stopped containers
   */
  async listContainers(options = {}) {
    try {
      const allFlag = options.all ? '-a' : '';
      const { stdout } = await execAsync(`docker ps ${allFlag} --format "{{json .}}"`);
      const lines = stdout.trim().split('\n').filter(Boolean);
      let containers = lines.map(line => JSON.parse(line));

      // Apply filters
      if (options.status) {
        containers = containers.filter(c => c.State === options.status);
      }
      if (options.name) {
        containers = containers.filter(c => 
          c.Names.toLowerCase().includes(options.name.toLowerCase())
        );
      }
      if (options.image) {
        containers = containers.filter(c => 
          c.Image.toLowerCase().includes(options.image.toLowerCase())
        );
      }

      return containers;
    } catch (error) {
      logger.error('Failed to list containers', { error: error.message });
      throw error;
    }
  }

  /**
   * Get detailed information about a specific image
   */
  async inspectImage(imageId) {
    try {
      const { stdout } = await execAsync(`docker inspect ${imageId}`);
      const inspectData = JSON.parse(stdout);
      return inspectData[0];
    } catch (error) {
      logger.error('Failed to inspect image', { imageId, error: error.message });
      throw error;
    }
  }

  /**
   * Get detailed information about a specific container
   */
  async inspectContainer(containerId) {
    try {
      const { stdout } = await execAsync(`docker inspect ${containerId}`);
      const inspectData = JSON.parse(stdout);
      return inspectData[0];
    } catch (error) {
      logger.error('Failed to inspect container', { containerId, error: error.message });
      throw error;
    }
  }

  /**
   * Get container logs
   */
  async getContainerLogs(containerId, options = {}) {
    try {
      const tail = options.tail ? `--tail ${options.tail}` : '--tail 100';
      const since = options.since ? `--since ${options.since}` : '';
      const timestamps = options.timestamps ? '--timestamps' : '';
      
      const { stdout, stderr } = await execAsync(
        `docker logs ${containerId} ${tail} ${since} ${timestamps} 2>&1`
      );
      return stdout || stderr;
    } catch (error) {
      logger.error('Failed to get container logs', { containerId, error: error.message });
      throw error;
    }
  }

  /**
   * Check if an image exists locally
   */
  async imageExists(imageName, tag = 'latest') {
    try {
      const fullName = `${imageName}:${tag}`;
      const { stdout } = await execAsync(`docker images -q ${fullName}`);
      return {
        exists: stdout.trim().length > 0,
        imageId: stdout.trim() || null,
        imageName: fullName,
      };
    } catch (error) {
      return { exists: false, imageId: null, imageName: `${imageName}:${tag}` };
    }
  }

  /**
   * Check if a container exists (running or stopped)
   */
  async containerExists(containerName) {
    try {
      const { stdout } = await execAsync(`docker ps -a --filter "name=^${containerName}$" --format "{{json .}}"`);
      if (!stdout.trim()) {
        return { exists: false, container: null };
      }
      const container = JSON.parse(stdout.trim());
      return {
        exists: true,
        container,
        isRunning: container.State === 'running',
      };
    } catch (error) {
      return { exists: false, container: null };
    }
  }

  /**
   * Get Docker system information
   */
  async getDockerInfo() {
    try {
      const [infoResult, versionResult, dfResult] = await Promise.all([
        execAsync('docker info --format "{{json .}}"'),
        execAsync('docker version --format "{{json .}}"'),
        execAsync('docker system df --format "{{json .}}"'),
      ]);

      const info = JSON.parse(infoResult.stdout);
      const version = JSON.parse(versionResult.stdout);
      
      // Parse disk usage (multiple lines)
      const dfLines = dfResult.stdout.trim().split('\n').filter(Boolean);
      const diskUsage = dfLines.map(line => JSON.parse(line));

      return {
        info: {
          containers: info.Containers,
          containersRunning: info.ContainersRunning,
          containersPaused: info.ContainersPaused,
          containersStopped: info.ContainersStopped,
          images: info.Images,
          serverVersion: info.ServerVersion,
          operatingSystem: info.OperatingSystem,
          architecture: info.Architecture,
          cpus: info.NCPU,
          memory: info.MemTotal,
          driver: info.Driver,
        },
        version: {
          client: version.Client?.Version,
          server: version.Server?.Version,
          apiVersion: version.Client?.ApiVersion,
        },
        diskUsage,
      };
    } catch (error) {
      logger.error('Failed to get Docker info', { error: error.message });
      throw error;
    }
  }

  /**
   * Check if image exists in remote registry
   */
  async checkRemoteImage(registryType, imageUri, credentialId) {
    try {
      const credential = await Credential.findByPk(credentialId);
      if (!credential) {
        throw new Error('Credential not found');
      }

      const decryptedData = this.getDecryptedCredentialData(credential);
      let exists = false;
      let manifest = null;

      switch (registryType) {
        case 'ecr': {
          const env = {
            ...process.env,
            AWS_ACCESS_KEY_ID: decryptedData.accessKeyId,
            AWS_SECRET_ACCESS_KEY: decryptedData.secretAccessKey,
            AWS_DEFAULT_REGION: decryptedData.region || 'us-east-1',
          };
          
          // Parse repository and tag from URI
          const match = imageUri.match(/([^/]+)\/([^:]+):?(.*)$/);
          if (match) {
            const [, , repoName, tag] = match;
            const imageTag = tag || 'latest';
            
            try {
              const { stdout } = await execAsync(
                `aws ecr describe-images --repository-name ${repoName} --image-ids imageTag=${imageTag}`,
                { env }
              );
              const result = JSON.parse(stdout);
              exists = result.imageDetails && result.imageDetails.length > 0;
              manifest = result.imageDetails?.[0];
            } catch (e) {
              exists = false;
            }
          }
          break;
        }
        case 'docker-hub': {
          // Use Docker Hub API
          const match = imageUri.match(/^(?:([^/]+)\/)?([^:]+):?(.*)$/);
          if (match) {
            const [, namespace = 'library', repo, tag = 'latest'] = match;
            try {
              const { stdout } = await execAsync(
                `curl -s "https://hub.docker.com/v2/repositories/${namespace}/${repo}/tags/${tag}"`
              );
              const result = JSON.parse(stdout);
              exists = !result.errinfo;
              manifest = result;
            } catch (e) {
              exists = false;
            }
          }
          break;
        }
        default:
          // Try docker manifest inspect for generic registries
          try {
            await execAsync(`docker manifest inspect ${imageUri}`);
            exists = true;
          } catch (e) {
            exists = false;
          }
      }

      return { exists, imageUri, manifest };
    } catch (error) {
      logger.error('Failed to check remote image', { imageUri, error: error.message });
      return { exists: false, imageUri, error: error.message };
    }
  }

  /**
   * List available container registries for a credential
   * @param {string} credentialId - The credential ID
   * @param {object} options - Options including region
   */
  async listRegistries(credentialId, options = {}) {
    const credential = await Credential.findByPk(credentialId);
    if (!credential) {
      throw new Error('Credential not found');
    }

    const decryptedData = this.getDecryptedCredentialData(credential);
    const registries = [];

    switch (credential.cloudProvider) {
      case 'aws':
        try {
          // Use specified region or fall back to configured regions
          let regions;
          if (options.region) {
            regions = [options.region];
          } else {
            regions = decryptedData.regions || [decryptedData.region || 'us-east-1'];
          }
          
          for (const region of regions) {
            const env = {
              ...process.env,
              AWS_ACCESS_KEY_ID: decryptedData.accessKeyId,
              AWS_SECRET_ACCESS_KEY: decryptedData.secretAccessKey,
              AWS_DEFAULT_REGION: region,
            };
            try {
              const { stdout } = await execAsync(`aws ecr describe-repositories --region ${region}`, { env });
              const repos = JSON.parse(stdout);
              registries.push(...repos.repositories.map(r => ({
                type: 'ecr',
                provider: 'aws',
                name: r.repositoryName,
                uri: r.repositoryUri,
                arn: r.repositoryArn,
                region: region,
                createdAt: r.createdAt,
                imageCount: r.imageCount || 0,
              })));
            } catch (e) {
              logger.warn(`Failed to list ECR repos in ${region}`, { error: e.message });
            }
          }
        } catch (error) {
          logger.warn('Failed to list ECR repositories', { error: error.message });
        }
        break;

      case 'azure':
        // Azure credentials - requires clientId, clientSecret, tenantId
        if (!decryptedData.clientId || !decryptedData.clientSecret || !decryptedData.tenantId) {
          logger.warn('Azure credentials incomplete - missing required fields');
          break;
        }
        try {
          // Azure CLI login using service principal
          // Use --password= format to handle secrets starting with '-'
          const loginCmd = `az login --service-principal --username "${decryptedData.clientId}" --password="${decryptedData.clientSecret}" --tenant "${decryptedData.tenantId}"`;
          await execAsync(loginCmd);
          
          // Set subscription
          if (decryptedData.subscriptionId) {
            await execAsync(`az account set --subscription "${decryptedData.subscriptionId}"`);
          }

          // List ACR registries
          const { stdout } = await execAsync('az acr list -o json');
          const acrs = JSON.parse(stdout);
          registries.push(...acrs.map(r => ({
            type: 'acr',
            provider: 'azure',
            name: r.name,
            uri: r.loginServer,
            resourceGroup: r.resourceGroup,
            location: r.location,
            sku: r.sku?.name,
            adminEnabled: r.adminUserEnabled,
            createdAt: r.creationDate,
          })));
        } catch (error) {
          logger.warn('Failed to list ACR registries', { error: error.message });
        }
        break;

      case 'gcp':
        // GCP credentials - requires serviceAccountKey
        if (!decryptedData.serviceAccountKey) {
          logger.warn('GCP credentials incomplete - missing serviceAccountKey');
          break;
        }
        try {
          // Authenticate with service account
          const keyFilePath = path.join(os.tmpdir(), `gcp-key-${Date.now()}.json`);
          fsSync.writeFileSync(keyFilePath, JSON.stringify(decryptedData.serviceAccountKey));
          
          await execAsync(`gcloud auth activate-service-account --key-file="${keyFilePath}"`);
          const projectId = decryptedData.projectId || decryptedData.serviceAccountKey?.project_id;
          
          if (projectId) {
            await execAsync(`gcloud config set project ${projectId}`);
            
            // List GCR/Artifact Registry repositories
            try {
              const { stdout } = await execAsync(`gcloud artifacts repositories list --format=json --project=${projectId}`);
              const repos = JSON.parse(stdout);
              registries.push(...repos.map(r => ({
                type: 'gcr',
                provider: 'gcp',
                name: r.name,
                uri: `${r.name.split('/').pop()}-docker.pkg.dev/${projectId}`,
                location: r.name.split('/')[3],
                format: r.format,
                createdAt: r.createTime,
              })));
            } catch (e) {
              // Fallback to legacy GCR
              registries.push({
                type: 'gcr',
                provider: 'gcp',
                name: 'gcr.io',
                uri: `gcr.io/${projectId}`,
                location: 'global',
              });
            }
          }
          
          fsSync.unlinkSync(keyFilePath);
        } catch (error) {
          logger.warn('Failed to list GCR registries', { error: error.message });
        }
        break;
    }

    return registries;
  }

  /**
   * List images in a cloud registry
   */
  async listRegistryImages(credentialId, registryUri, options = {}) {
    const credential = await Credential.findByPk(credentialId);
    if (!credential) {
      throw new Error('Credential not found');
    }

    const decryptedData = this.getDecryptedCredentialData(credential);
    const images = [];

    switch (credential.cloudProvider) {
      case 'aws':
        try {
          const region = options.region || decryptedData.region || 'us-east-1';
          const repoName = registryUri.split('/').pop();
          const env = {
            ...process.env,
            AWS_ACCESS_KEY_ID: decryptedData.accessKeyId,
            AWS_SECRET_ACCESS_KEY: decryptedData.secretAccessKey,
            AWS_DEFAULT_REGION: region,
          };
          
          const { stdout } = await execAsync(`aws ecr describe-images --repository-name ${repoName} --region ${region}`, { env });
          const data = JSON.parse(stdout);
          
          images.push(...data.imageDetails.map(img => ({
            digest: img.imageDigest,
            tags: img.imageTags || [],
            pushedAt: img.imagePushedAt,
            size: img.imageSizeInBytes,
            uri: `${registryUri}:${img.imageTags?.[0] || img.imageDigest.slice(7, 19)}`,
          })));
        } catch (error) {
          logger.warn('Failed to list ECR images', { error: error.message });
        }
        break;

      case 'azure':
        try {
          const registryName = registryUri.split('.')[0];
          const { stdout } = await execAsync(`az acr repository list --name ${registryName} -o json`);
          const repos = JSON.parse(stdout);
          
          for (const repo of repos.slice(0, options.limit || 50)) {
            try {
              const { stdout: tagsOutput } = await execAsync(`az acr repository show-tags --name ${registryName} --repository ${repo} -o json`);
              const tags = JSON.parse(tagsOutput);
              images.push(...tags.map(tag => ({
                name: repo,
                tag: tag,
                uri: `${registryUri}/${repo}:${tag}`,
              })));
            } catch (e) {
              logger.warn(`Failed to list tags for ${repo}`, { error: e.message });
            }
          }
        } catch (error) {
          logger.warn('Failed to list ACR images', { error: error.message });
        }
        break;

      case 'gcp':
        try {
          const projectId = decryptedData.projectId || decryptedData.serviceAccountKey?.project_id;
          const { stdout } = await execAsync(`gcloud container images list --repository=${registryUri} --format=json`);
          const repos = JSON.parse(stdout);
          
          for (const repo of repos.slice(0, options.limit || 50)) {
            try {
              const { stdout: tagsOutput } = await execAsync(`gcloud container images list-tags ${repo.name} --format=json`);
              const tags = JSON.parse(tagsOutput);
              images.push(...tags.map(t => ({
                name: repo.name,
                digest: t.digest,
                tags: t.tags || [],
                timestamp: t.timestamp?.datetime,
                uri: `${repo.name}:${t.tags?.[0] || t.digest.slice(7, 19)}`,
              })));
            } catch (e) {
              logger.warn(`Failed to list tags for ${repo.name}`, { error: e.message });
            }
          }
        } catch (error) {
          logger.warn('Failed to list GCR images', { error: error.message });
        }
        break;
    }

    return images;
  }

  /**
   * List Kubernetes clusters for a credential
   * @param {number} credentialId - Credential ID
   * @param {Object} options - Options
   * @param {string} options.region - Specific region to query (optional)
   */
  async listClusters(credentialId, options = {}) {
    const credential = await Credential.findByPk(credentialId);
    if (!credential) {
      throw new Error('Credential not found');
    }

    const decryptedData = this.getDecryptedCredentialData(credential);
    const clusters = [];

    switch (credential.cloudProvider) {
      case 'aws':
        try {
          // Use specified region or fall back to credential's configured regions
          const allRegions = decryptedData.regions || [decryptedData.region || 'us-east-1'];
          const targetRegions = options.region ? [options.region] : allRegions;
          
          for (const region of targetRegions) {
            const env = {
              ...process.env,
              AWS_ACCESS_KEY_ID: decryptedData.accessKeyId,
              AWS_SECRET_ACCESS_KEY: decryptedData.secretAccessKey,
              AWS_DEFAULT_REGION: region,
            };
            
            try {
              const { stdout: listOutput } = await execAsync(`aws eks list-clusters --region ${region}`, { env });
              const clusterNames = JSON.parse(listOutput).clusters || [];
              
              for (const name of clusterNames) {
                try {
                  const { stdout: describeOutput } = await execAsync(`aws eks describe-cluster --name ${name} --region ${region}`, { env });
                  const cluster = JSON.parse(describeOutput).cluster;
                  clusters.push({
                    provider: 'aws',
                    type: 'eks',
                    name: cluster.name,
                    arn: cluster.arn,
                    region: region,
                    version: cluster.version,
                    status: cluster.status,
                    endpoint: cluster.endpoint,
                    createdAt: cluster.createdAt,
                    platformVersion: cluster.platformVersion,
                  });
                } catch (e) {
                  logger.warn(`Failed to describe EKS cluster ${name}`, { error: e.message });
                }
              }
            } catch (e) {
              logger.warn(`Failed to list EKS clusters in ${region}`, { error: e.message });
            }
          }
        } catch (error) {
          logger.warn('Failed to list EKS clusters', { error: error.message });
        }
        break;

      case 'azure':
        // Azure credentials - requires clientId, clientSecret, tenantId
        if (!decryptedData.clientId || !decryptedData.clientSecret || !decryptedData.tenantId) {
          logger.warn('Azure credentials incomplete - missing required fields');
          break;
        }
        try {
          // Azure CLI login
          // Use --password= format to handle secrets starting with '-'
          const loginCmd = `az login --service-principal --username "${decryptedData.clientId}" --password="${decryptedData.clientSecret}" --tenant "${decryptedData.tenantId}"`;
          await execAsync(loginCmd);
          
          if (decryptedData.subscriptionId) {
            await execAsync(`az account set --subscription "${decryptedData.subscriptionId}"`);
          }

          const { stdout } = await execAsync('az aks list -o json');
          const aksClusters = JSON.parse(stdout);
          
          clusters.push(...aksClusters.map(c => ({
            provider: 'azure',
            type: 'aks',
            name: c.name,
            resourceGroup: c.resourceGroup,
            location: c.location,
            version: c.kubernetesVersion,
            status: c.provisioningState,
            nodeCount: c.agentPoolProfiles?.reduce((sum, p) => sum + p.count, 0) || 0,
            fqdn: c.fqdn,
          })));
        } catch (error) {
          logger.warn('Failed to list AKS clusters', { error: error.message });
        }
        break;

      case 'gcp':
        // GCP credentials - requires serviceAccountKey
        if (!decryptedData.serviceAccountKey) {
          logger.warn('GCP credentials incomplete - missing serviceAccountKey');
          break;
        }
        try {
          const keyFilePath = path.join(os.tmpdir(), `gcp-key-${Date.now()}.json`);
          fsSync.writeFileSync(keyFilePath, JSON.stringify(decryptedData.serviceAccountKey));
          
          await execAsync(`gcloud auth activate-service-account --key-file="${keyFilePath}"`);
          const projectId = decryptedData.projectId || decryptedData.serviceAccountKey?.project_id;
          
          if (projectId) {
            await execAsync(`gcloud config set project ${projectId}`);
            
            const { stdout } = await execAsync(`gcloud container clusters list --format=json --project=${projectId}`);
            const gkeClusters = JSON.parse(stdout);
            
            clusters.push(...gkeClusters.map(c => ({
              provider: 'gcp',
              type: 'gke',
              name: c.name,
              zone: c.zone,
              location: c.location,
              version: c.currentMasterVersion,
              status: c.status,
              nodeCount: c.currentNodeCount,
              endpoint: c.endpoint,
              network: c.network,
            })));
          }
          
          fsSync.unlinkSync(keyFilePath);
        } catch (error) {
          logger.warn('Failed to list GKE clusters', { error: error.message });
        }
        break;
    }

    return clusters;
  }

  /**
   * Connect to a cloud Kubernetes cluster (update kubeconfig)
   */
  async connectToCluster(credentialId, clusterName, options = {}) {
    const credential = await Credential.findByPk(credentialId);
    if (!credential) {
      throw new Error('Credential not found');
    }

    const decryptedData = this.getDecryptedCredentialData(credential);
    let contextName = '';

    switch (credential.cloudProvider) {
      case 'aws':
        try {
          const region = options.region || decryptedData.region || 'us-east-1';
          const env = {
            ...process.env,
            AWS_ACCESS_KEY_ID: decryptedData.accessKeyId,
            AWS_SECRET_ACCESS_KEY: decryptedData.secretAccessKey,
            AWS_DEFAULT_REGION: region,
          };
          
          // Update kubeconfig for EKS cluster
          const { stdout } = await execAsync(
            `aws eks update-kubeconfig --name ${clusterName} --region ${region}`,
            { env }
          );
          
          contextName = `arn:aws:eks:${region}:${decryptedData.accountId || 'unknown'}:cluster/${clusterName}`;
          logger.info('Connected to EKS cluster', { clusterName, region });
          
          return {
            success: true,
            provider: 'aws',
            clusterName,
            region,
            contextName,
            message: stdout.trim(),
          };
        } catch (error) {
          throw new Error(`Failed to connect to EKS cluster: ${error.message}`);
        }

      case 'azure':
        try {
          // Azure CLI login
          // Use --password= format to handle secrets starting with '-'
          const loginCmd = `az login --service-principal --username "${decryptedData.clientId}" --password="${decryptedData.clientSecret}" --tenant "${decryptedData.tenantId}"`;
          await execAsync(loginCmd);
          
          if (decryptedData.subscriptionId) {
            await execAsync(`az account set --subscription "${decryptedData.subscriptionId}"`);
          }

          const resourceGroup = options.resourceGroup;
          if (!resourceGroup) {
            // Find the resource group for this cluster
            const { stdout: listOutput } = await execAsync('az aks list -o json');
            const clusters = JSON.parse(listOutput);
            const cluster = clusters.find(c => c.name === clusterName);
            if (!cluster) {
              throw new Error(`Cluster ${clusterName} not found`);
            }
            options.resourceGroup = cluster.resourceGroup;
          }

          // Get AKS credentials
          const { stdout } = await execAsync(
            `az aks get-credentials --name ${clusterName} --resource-group ${options.resourceGroup} --overwrite-existing`
          );
          
          contextName = clusterName;
          logger.info('Connected to AKS cluster', { clusterName, resourceGroup: options.resourceGroup });
          
          return {
            success: true,
            provider: 'azure',
            clusterName,
            resourceGroup: options.resourceGroup,
            contextName,
            message: stdout.trim() || 'Connected successfully',
          };
        } catch (error) {
          throw new Error(`Failed to connect to AKS cluster: ${error.message}`);
        }

      case 'gcp':
        try {
          const keyFilePath = path.join(os.tmpdir(), `gcp-key-${Date.now()}.json`);
          fsSync.writeFileSync(keyFilePath, JSON.stringify(decryptedData.serviceAccountKey || decryptedData));
          
          await execAsync(`gcloud auth activate-service-account --key-file="${keyFilePath}"`);
          const projectId = decryptedData.projectId || decryptedData.serviceAccountKey?.project_id;
          
          if (projectId) {
            await execAsync(`gcloud config set project ${projectId}`);
          }

          const zone = options.zone || options.location;
          if (!zone) {
            // Find the zone for this cluster
            const { stdout: listOutput } = await execAsync(`gcloud container clusters list --format=json --project=${projectId}`);
            const clusters = JSON.parse(listOutput);
            const cluster = clusters.find(c => c.name === clusterName);
            if (!cluster) {
              throw new Error(`Cluster ${clusterName} not found`);
            }
            options.zone = cluster.zone || cluster.location;
          }

          // Get GKE credentials
          const locationFlag = options.zone?.includes('-') && !options.zone?.match(/-[a-z]$/) 
            ? `--region=${options.zone}` 
            : `--zone=${options.zone}`;
            
          const { stdout } = await execAsync(
            `gcloud container clusters get-credentials ${clusterName} ${locationFlag} --project=${projectId}`
          );
          
          contextName = `gke_${projectId}_${options.zone}_${clusterName}`;
          logger.info('Connected to GKE cluster', { clusterName, zone: options.zone, projectId });
          
          fsSync.unlinkSync(keyFilePath);
          
          return {
            success: true,
            provider: 'gcp',
            clusterName,
            zone: options.zone,
            projectId,
            contextName,
            message: stdout.trim() || 'Connected successfully',
          };
        } catch (error) {
          throw new Error(`Failed to connect to GKE cluster: ${error.message}`);
        }

      default:
        throw new Error(`Unsupported cloud provider: ${credential.cloudProvider}`);
    }
  }

  /**
   * Authenticate with a cloud container registry
   */
  async authenticateToRegistry(credentialId, registryUri) {
    const credential = await Credential.findByPk(credentialId);
    if (!credential) {
      throw new Error('Credential not found');
    }

    const decryptedData = this.getDecryptedCredentialData(credential);

    switch (credential.cloudProvider) {
      case 'aws':
        try {
          const region = decryptedData.region || 'us-east-1';
          const env = {
            ...process.env,
            AWS_ACCESS_KEY_ID: decryptedData.accessKeyId,
            AWS_SECRET_ACCESS_KEY: decryptedData.secretAccessKey,
            AWS_DEFAULT_REGION: region,
          };
          
          // Get ECR login password and login to Docker
          const { stdout: password } = await execAsync(
            `aws ecr get-login-password --region ${region}`,
            { env }
          );
          
          const registryHost = registryUri.split('/')[0];
          await execAsync(
            `docker login --username AWS --password-stdin ${registryHost}`,
            { env, input: password.trim() }
          );
          
          logger.info('Authenticated to ECR', { registryHost });
          return { success: true, registryHost, provider: 'aws' };
        } catch (error) {
          throw new Error(`Failed to authenticate to ECR: ${error.message}`);
        }

      case 'azure':
        try {
          const registryName = registryUri.split('.')[0];
          
          // Login using service principal
          await execAsync(
            `az acr login --name ${registryName} --username "${decryptedData.clientId}" --password "${decryptedData.clientSecret}"`
          );
          
          logger.info('Authenticated to ACR', { registryName });
          return { success: true, registryName, provider: 'azure' };
        } catch (error) {
          throw new Error(`Failed to authenticate to ACR: ${error.message}`);
        }

      case 'gcp':
        try {
          const keyFilePath = path.join(os.tmpdir(), `gcp-key-${Date.now()}.json`);
          fsSync.writeFileSync(keyFilePath, JSON.stringify(decryptedData.serviceAccountKey || decryptedData));
          
          // Configure Docker for GCR authentication
          await execAsync(`gcloud auth activate-service-account --key-file="${keyFilePath}"`);
          await execAsync('gcloud auth configure-docker --quiet');
          
          fsSync.unlinkSync(keyFilePath);
          
          logger.info('Authenticated to GCR');
          return { success: true, provider: 'gcp' };
        } catch (error) {
          throw new Error(`Failed to authenticate to GCR: ${error.message}`);
        }

      default:
        throw new Error(`Unsupported cloud provider: ${credential.cloudProvider}`);
    }
  }

  /**
   * Pull an image from cloud registry to local Docker
   */
  async pullFromRegistry(credentialId, imageUri) {
    // First authenticate
    await this.authenticateToRegistry(credentialId, imageUri);
    
    // Then pull the image
    try {
      const { stdout } = await execAsync(`docker pull ${imageUri}`);
      logger.info('Pulled image from registry', { imageUri });
      return { success: true, imageUri, output: stdout };
    } catch (error) {
      throw new Error(`Failed to pull image: ${error.message}`);
    }
  }

  /**
   * Push a local image to cloud registry
   */
  async pushToCloudRegistry(credentialId, localImage, targetUri) {
    // First authenticate
    await this.authenticateToRegistry(credentialId, targetUri);
    
    try {
      // Tag the image for the target registry
      await execAsync(`docker tag ${localImage} ${targetUri}`);
      
      // Push to registry
      const { stdout } = await execAsync(`docker push ${targetUri}`);
      logger.info('Pushed image to registry', { localImage, targetUri });
      
      return { success: true, localImage, targetUri, output: stdout };
    } catch (error) {
      throw new Error(`Failed to push image: ${error.message}`);
    }
  }

  // ==========================================
  // KUBERNETES CLUSTER MANAGEMENT
  // ==========================================

  /**
   * Get current kubectl context info
   */
  async getKubectlContext() {
    try {
      const { stdout: currentContext } = await execAsync('kubectl config current-context');
      const { stdout: clusterInfo } = await execAsync('kubectl cluster-info');
      const { stdout: contextsRaw } = await execAsync('kubectl config get-contexts -o name');
      
      const contexts = contextsRaw.trim().split('\n').filter(c => c);
      
      return {
        currentContext: currentContext.trim(),
        availableContexts: contexts,
        clusterInfo: clusterInfo.trim(),
      };
    } catch (error) {
      logger.error('Failed to get kubectl context', { error: error.message });
      throw new Error(`Failed to get kubectl context: ${error.message}`);
    }
  }

  /**
   * Switch kubectl context
   */
  async switchContext(contextName) {
    try {
      await execAsync(`kubectl config use-context ${contextName}`);
      return await this.getKubectlContext();
    } catch (error) {
      logger.error('Failed to switch kubectl context', { contextName, error: error.message });
      throw new Error(`Failed to switch context: ${error.message}`);
    }
  }

  /**
   * List all namespaces
   */
  async listNamespaces() {
    try {
      const { stdout } = await execAsync('kubectl get namespaces -o json');
      const data = JSON.parse(stdout);
      return data.items.map(ns => ({
        name: ns.metadata.name,
        status: ns.status.phase,
        createdAt: ns.metadata.creationTimestamp,
        labels: ns.metadata.labels || {},
        annotations: ns.metadata.annotations || {},
      }));
    } catch (error) {
      logger.error('Failed to list namespaces', { error: error.message });
      throw new Error(`Failed to list namespaces: ${error.message}`);
    }
  }

  /**
   * Create a new namespace
   */
  async createNamespace(name, labels = {}, annotations = {}) {
    try {
      const manifest = {
        apiVersion: 'v1',
        kind: 'Namespace',
        metadata: {
          name,
          labels: { ...labels, 'managed-by': 'zl-mcdt' },
          annotations,
        },
      };

      const tempFile = path.join(os.tmpdir(), `namespace-${name}-${Date.now()}.yaml`);
      fsSync.writeFileSync(tempFile, yaml.dump(manifest));
      
      await execAsync(`kubectl apply -f "${tempFile}"`);
      fsSync.unlinkSync(tempFile);

      logger.info('Created namespace', { name });
      return { success: true, name };
    } catch (error) {
      logger.error('Failed to create namespace', { name, error: error.message });
      throw new Error(`Failed to create namespace: ${error.message}`);
    }
  }

  /**
   * Delete a namespace
   */
  async deleteNamespace(name) {
    try {
      // Prevent deletion of system namespaces
      const protectedNamespaces = ['default', 'kube-system', 'kube-public', 'kube-node-lease'];
      if (protectedNamespaces.includes(name)) {
        throw new Error(`Cannot delete protected namespace: ${name}`);
      }

      await execAsync(`kubectl delete namespace ${name}`);
      logger.info('Deleted namespace', { name });
      return { success: true, name };
    } catch (error) {
      logger.error('Failed to delete namespace', { name, error: error.message });
      throw new Error(`Failed to delete namespace: ${error.message}`);
    }
  }

  /**
   * List deployments in a namespace
   */
  async listDeploymentsInNamespace(namespace = 'default') {
    try {
      const { stdout } = await execAsync(`kubectl get deployments -n ${namespace} -o json`);
      const data = JSON.parse(stdout);
      return data.items.map(dep => ({
        name: dep.metadata.name,
        namespace: dep.metadata.namespace,
        replicas: dep.spec.replicas,
        readyReplicas: dep.status.readyReplicas || 0,
        availableReplicas: dep.status.availableReplicas || 0,
        image: dep.spec.template.spec.containers[0]?.image,
        createdAt: dep.metadata.creationTimestamp,
        labels: dep.metadata.labels || {},
        conditions: dep.status.conditions || [],
      }));
    } catch (error) {
      logger.error('Failed to list deployments', { namespace, error: error.message });
      throw new Error(`Failed to list deployments: ${error.message}`);
    }
  }

  /**
   * List services in a namespace
   */
  async listServicesInNamespace(namespace = 'default') {
    try {
      const { stdout } = await execAsync(`kubectl get services -n ${namespace} -o json`);
      const data = JSON.parse(stdout);
      return data.items.map(svc => ({
        name: svc.metadata.name,
        namespace: svc.metadata.namespace,
        type: svc.spec.type,
        clusterIP: svc.spec.clusterIP,
        externalIP: svc.status.loadBalancer?.ingress?.[0]?.ip || svc.status.loadBalancer?.ingress?.[0]?.hostname || null,
        ports: svc.spec.ports?.map(p => ({
          name: p.name,
          port: p.port,
          targetPort: p.targetPort,
          nodePort: p.nodePort,
          protocol: p.protocol,
        })) || [],
        selector: svc.spec.selector,
        createdAt: svc.metadata.creationTimestamp,
      }));
    } catch (error) {
      logger.error('Failed to list services', { namespace, error: error.message });
      throw new Error(`Failed to list services: ${error.message}`);
    }
  }

  /**
   * List pods in a namespace
   */
  async listPodsInNamespace(namespace = 'default') {
    try {
      const { stdout } = await execAsync(`kubectl get pods -n ${namespace} -o json`);
      const data = JSON.parse(stdout);
      return data.items.map(pod => ({
        name: pod.metadata.name,
        namespace: pod.metadata.namespace,
        status: pod.status.phase,
        ready: pod.status.containerStatuses?.every(c => c.ready) || false,
        restarts: pod.status.containerStatuses?.reduce((sum, c) => sum + c.restartCount, 0) || 0,
        nodeName: pod.spec.nodeName,
        podIP: pod.status.podIP,
        hostIP: pod.status.hostIP,
        containers: pod.spec.containers?.map(c => ({
          name: c.name,
          image: c.image,
          ports: c.ports,
        })) || [],
        createdAt: pod.metadata.creationTimestamp,
        conditions: pod.status.conditions || [],
      }));
    } catch (error) {
      logger.error('Failed to list pods', { namespace, error: error.message });
      throw new Error(`Failed to list pods: ${error.message}`);
    }
  }

  /**
   * Get pod logs
   */
  async getPodLogs(namespace, podName, options = {}) {
    try {
      const { container, tail = 100, previous = false } = options;
      let cmd = `kubectl logs -n ${namespace} ${podName}`;
      if (container) cmd += ` -c ${container}`;
      if (tail) cmd += ` --tail=${tail}`;
      if (previous) cmd += ' --previous';

      const { stdout } = await execAsync(cmd);
      return { logs: stdout, podName, namespace };
    } catch (error) {
      logger.error('Failed to get pod logs', { namespace, podName, error: error.message });
      throw new Error(`Failed to get pod logs: ${error.message}`);
    }
  }

  /**
   * Describe a K8s resource
   */
  async describeResource(resourceType, name, namespace = 'default') {
    try {
      const { stdout } = await execAsync(`kubectl describe ${resourceType} ${name} -n ${namespace}`);
      return { description: stdout, resourceType, name, namespace };
    } catch (error) {
      logger.error('Failed to describe resource', { resourceType, name, namespace, error: error.message });
      throw new Error(`Failed to describe resource: ${error.message}`);
    }
  }

  /**
   * Quick deploy an image to K8s
   */
  async quickDeploy(options) {
    const {
      imageName,
      imageTag = 'latest',
      deploymentName,
      namespace = 'default',
      replicas = 1,
      containerPort = 8080,
      servicePort = 80,
      serviceType = 'ClusterIP',
      createService = true,
      envVars = [],
      resourceRequests = { cpu: '100m', memory: '128Mi' },
      resourceLimits = { cpu: '500m', memory: '512Mi' },
      imagePullPolicy = 'IfNotPresent',
    } = options;

    // Handle case where imageName already includes the tag (from cloud registry URIs)
    let fullImage;
    if (imageName.includes(':') && imageName.split(':').pop() === imageTag) {
      // imageName already has the tag, use as-is
      fullImage = imageName;
    } else if (imageName.includes(':')) {
      // imageName has a different tag, use imageName as-is (caller's intent)
      fullImage = imageName;
    } else {
      // imageName doesn't have a tag, append imageTag
      fullImage = `${imageName}:${imageTag}`;
    }
    const name = deploymentName || imageName.split('/').pop().split(':')[0];

    logger.info('Quick deploy starting', { fullImage, name, namespace });

    try {
      // Ensure namespace exists
      try {
        await execAsync(`kubectl get namespace ${namespace}`);
      } catch {
        await this.createNamespace(namespace);
      }

      // Build deployment manifest
      const deployment = {
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        metadata: {
          name,
          namespace,
          labels: { app: name, 'managed-by': 'zl-mcdt' },
        },
        spec: {
          replicas,
          selector: { matchLabels: { app: name } },
          template: {
            metadata: { labels: { app: name } },
            spec: {
              containers: [{
                name,
                image: fullImage,
                imagePullPolicy,
                ports: [{ containerPort }],
                env: envVars.map(e => ({ name: e.name, value: e.value })),
                resources: {
                  requests: resourceRequests,
                  limits: resourceLimits,
                },
              }],
            },
          },
        },
      };

      // Build service manifest if requested
      const manifests = [deployment];
      if (createService) {
        const service = {
          apiVersion: 'v1',
          kind: 'Service',
          metadata: {
            name: `${name}-svc`,
            namespace,
            labels: { app: name, 'managed-by': 'zl-mcdt' },
          },
          spec: {
            type: serviceType,
            selector: { app: name },
            ports: [{
              port: servicePort,
              targetPort: containerPort,
              protocol: 'TCP',
            }],
          },
        };
        manifests.push(service);
      }

      // Apply manifests
      const tempFile = path.join(os.tmpdir(), `quick-deploy-${name}-${Date.now()}.yaml`);
      fsSync.writeFileSync(tempFile, manifests.map(m => yaml.dump(m)).join('---\n'));

      const { stdout } = await execAsync(`kubectl apply -f "${tempFile}"`);
      fsSync.unlinkSync(tempFile);

      logger.info('Quick deploy completed', { name, namespace, output: stdout });

      return {
        success: true,
        deploymentName: name,
        serviceName: createService ? `${name}-svc` : null,
        namespace,
        image: fullImage,
        replicas,
        output: stdout,
      };
    } catch (error) {
      logger.error('Quick deploy failed', { options, error: error.message });
      throw new Error(`Quick deploy failed: ${error.message}`);
    }
  }

  /**
   * Apply custom YAML manifest to K8s
   */
  async applyCustomYaml(yamlContent, namespace = 'default') {
    logger.info('Applying custom YAML', { namespace, yamlLength: yamlContent.length });

    try {
      // Validate YAML syntax
      const documents = yamlContent.split(/^---$/m).filter(doc => doc.trim());
      const parsedDocs = [];
      
      for (const doc of documents) {
        if (doc.trim()) {
          try {
            const parsed = yaml.load(doc);
            if (parsed) {
              parsedDocs.push(parsed);
            }
          } catch (parseError) {
            throw new Error(`Invalid YAML syntax: ${parseError.message}`);
          }
        }
      }

      if (parsedDocs.length === 0) {
        throw new Error('No valid YAML documents found');
      }

      // Log what we're applying
      const resourceNames = parsedDocs.map(doc => 
        `${doc.kind || 'Unknown'}/${doc.metadata?.name || 'unnamed'}`
      );
      logger.info('Applying YAML resources', { resources: resourceNames });

      // Ensure namespace exists if specified
      if (namespace && namespace !== 'default') {
        try {
          await execAsync(`kubectl get namespace ${namespace}`);
        } catch {
          await this.createNamespace(namespace);
        }
      }

      // Write to temp file and apply
      const tempFile = path.join(os.tmpdir(), `custom-yaml-${Date.now()}.yaml`);
      fsSync.writeFileSync(tempFile, yamlContent);

      try {
        const { stdout } = await execAsync(`kubectl apply -f "${tempFile}" -n ${namespace}`);
        
        logger.info('Custom YAML applied successfully', { output: stdout });

        return {
          success: true,
          namespace,
          resources: resourceNames,
          output: stdout,
        };
      } finally {
        // Clean up temp file
        try {
          fsSync.unlinkSync(tempFile);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    } catch (error) {
      logger.error('Failed to apply custom YAML', { error: error.message });
      throw new Error(`Failed to apply YAML: ${error.message}`);
    }
  }

  /**
   * Delete a deployment and its service
   */
  async deleteDeployment(name, namespace = 'default', deleteService = true) {
    try {
      const results = [];
      
      // Delete deployment
      try {
        await execAsync(`kubectl delete deployment ${name} -n ${namespace}`);
        results.push({ type: 'deployment', name, deleted: true });
      } catch (e) {
        results.push({ type: 'deployment', name, deleted: false, error: e.message });
      }

      // Delete associated service
      if (deleteService) {
        try {
          await execAsync(`kubectl delete service ${name}-svc -n ${namespace}`);
          results.push({ type: 'service', name: `${name}-svc`, deleted: true });
        } catch (e) {
          // Service may not exist
          results.push({ type: 'service', name: `${name}-svc`, deleted: false, error: e.message });
        }
      }

      return { success: true, results };
    } catch (error) {
      logger.error('Failed to delete deployment', { name, namespace, error: error.message });
      throw new Error(`Failed to delete deployment: ${error.message}`);
    }
  }

  /**
   * Get resource usage for a namespace
   */
  async getResourceUsage(namespace = 'default') {
    try {
      const { stdout: podMetrics } = await execAsync(`kubectl top pods -n ${namespace} --no-headers 2>/dev/null || echo ""`);
      const { stdout: nodeMetrics } = await execAsync(`kubectl top nodes --no-headers 2>/dev/null || echo ""`);
      
      const pods = podMetrics.trim().split('\n').filter(l => l).map(line => {
        const parts = line.split(/\s+/);
        return {
          name: parts[0],
          cpu: parts[1],
          memory: parts[2],
        };
      });

      const nodes = nodeMetrics.trim().split('\n').filter(l => l).map(line => {
        const parts = line.split(/\s+/);
        return {
          name: parts[0],
          cpuUsage: parts[1],
          cpuPercent: parts[2],
          memoryUsage: parts[3],
          memoryPercent: parts[4],
        };
      });

      return { pods, nodes, namespace };
    } catch (error) {
      logger.warn('Failed to get resource usage (metrics-server may not be installed)', { error: error.message });
      return { pods: [], nodes: [], namespace, error: 'Metrics server may not be available' };
    }
  }

  /**
   * List ConfigMaps in a namespace
   */
  async listConfigMaps(namespace = 'default') {
    try {
      const { stdout } = await execAsync(`kubectl get configmaps -n ${namespace} -o json`);
      const data = JSON.parse(stdout);
      return data.items.map(cm => ({
        name: cm.metadata.name,
        namespace: cm.metadata.namespace,
        dataKeys: Object.keys(cm.data || {}),
        createdAt: cm.metadata.creationTimestamp,
      }));
    } catch (error) {
      logger.error('Failed to list configmaps', { namespace, error: error.message });
      throw new Error(`Failed to list configmaps: ${error.message}`);
    }
  }

  /**
   * List Secrets in a namespace (names only, not values)
   */
  async listSecrets(namespace = 'default') {
    try {
      const { stdout } = await execAsync(`kubectl get secrets -n ${namespace} -o json`);
      const data = JSON.parse(stdout);
      return data.items.map(secret => ({
        name: secret.metadata.name,
        namespace: secret.metadata.namespace,
        type: secret.type,
        dataKeys: Object.keys(secret.data || {}),
        createdAt: secret.metadata.creationTimestamp,
      }));
    } catch (error) {
      logger.error('Failed to list secrets', { namespace, error: error.message });
      throw new Error(`Failed to list secrets: ${error.message}`);
    }
  }

  /**
   * Restart a deployment (rolling restart)
   */
  async restartDeployment(name, namespace = 'default') {
    try {
      const { stdout } = await execAsync(`kubectl rollout restart deployment/${name} -n ${namespace}`);
      return { success: true, output: stdout };
    } catch (error) {
      logger.error('Failed to restart deployment', { name, namespace, error: error.message });
      throw new Error(`Failed to restart deployment: ${error.message}`);
    }
  }

  /**
   * Get deployment rollout status
   */
  async getRolloutStatus(name, namespace = 'default') {
    try {
      const { stdout } = await execAsync(`kubectl rollout status deployment/${name} -n ${namespace} --timeout=5s`);
      return { status: 'complete', output: stdout };
    } catch (error) {
      return { status: 'in-progress', output: error.message };
    }
  }

  /**
   * Port forward to a pod or service
   */
  async portForward(resourceType, name, namespace, localPort, targetPort) {
    try {
      // This would typically be a background process
      const cmd = `kubectl port-forward ${resourceType}/${name} ${localPort}:${targetPort} -n ${namespace}`;
      logger.info('Port forward command ready', { cmd });
      return {
        command: cmd,
        localPort,
        targetPort,
        resource: `${resourceType}/${name}`,
        namespace,
        note: 'Run this command in a terminal to start port forwarding',
      };
    } catch (error) {
      throw new Error(`Port forward setup failed: ${error.message}`);
    }
  }

  /**
   * Get events for a namespace
   */
  async getEvents(namespace = 'default', limit = 50) {
    try {
      // Don't use --sort-by as it fails when there are no events
      const { stdout } = await execAsync(`kubectl get events -n ${namespace} -o json`);
      const data = JSON.parse(stdout);
      
      // Return empty array if no events
      if (!data.items || data.items.length === 0) {
        return [];
      }
      
      // Sort by lastTimestamp in JavaScript (most recent last)
      const sortedItems = data.items.sort((a, b) => {
        const timeA = new Date(a.lastTimestamp || a.firstTimestamp || 0);
        const timeB = new Date(b.lastTimestamp || b.firstTimestamp || 0);
        return timeA - timeB;
      });
      
      return sortedItems.slice(-limit).map(event => ({
        type: event.type,
        reason: event.reason,
        message: event.message,
        source: event.source?.component,
        object: `${event.involvedObject?.kind}/${event.involvedObject?.name}`,
        count: event.count,
        firstTimestamp: event.firstTimestamp,
        lastTimestamp: event.lastTimestamp,
      }));
    } catch (error) {
      logger.error('Failed to get events', { namespace, error: error.message });
      throw new Error(`Failed to get events: ${error.message}`);
    }
  }

  /**
   * Check prerequisites for cloud deployment toolkit
   * Validates installation of required CLI tools
   */
  async checkPrerequisites() {
    const prerequisites = [];

    // Check Docker
    try {
      const { stdout: dockerVersion } = await execAsync('docker --version');
      const { stdout: dockerInfo } = await execAsync('docker info --format "{{.ServerVersion}}"');
      prerequisites.push({
        name: 'Docker',
        status: 'installed',
        version: dockerVersion.trim(),
        serverVersion: dockerInfo.trim(),
        description: 'Container runtime for building and running containers',
        required: true,
      });
    } catch (error) {
      prerequisites.push({
        name: 'Docker',
        status: 'not_installed',
        version: null,
        error: error.message,
        description: 'Container runtime for building and running containers',
        required: true,
        installUrl: 'https://docs.docker.com/get-docker/',
        installCommand: null,
      });
    }

    // Check kubectl
    try {
      const { stdout: kubectlVersion } = await execAsync('kubectl version --client -o json');
      const versionInfo = JSON.parse(kubectlVersion);
      prerequisites.push({
        name: 'kubectl',
        status: 'installed',
        version: versionInfo.clientVersion?.gitVersion || 'unknown',
        description: 'Kubernetes command-line tool for cluster management',
        required: true,
      });
    } catch (error) {
      prerequisites.push({
        name: 'kubectl',
        status: 'not_installed',
        version: null,
        error: error.message,
        description: 'Kubernetes command-line tool for cluster management',
        required: true,
        installUrl: 'https://kubernetes.io/docs/tasks/tools/',
        installCommand: {
          windows: 'choco install kubernetes-cli',
          mac: 'brew install kubectl',
          linux: 'curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"',
        },
      });
    }

    // Check AWS CLI
    try {
      const { stdout: awsVersion } = await execAsync('aws --version');
      prerequisites.push({
        name: 'AWS CLI',
        status: 'installed',
        version: awsVersion.trim(),
        description: 'AWS command-line interface for cloud operations',
        required: false,
        requiredFor: ['AWS EKS', 'ECR'],
      });
    } catch (error) {
      prerequisites.push({
        name: 'AWS CLI',
        status: 'not_installed',
        version: null,
        error: error.message,
        description: 'AWS command-line interface for cloud operations',
        required: false,
        requiredFor: ['AWS EKS', 'ECR'],
        installUrl: 'https://aws.amazon.com/cli/',
        installCommand: {
          windows: 'msiexec.exe /i https://awscli.amazonaws.com/AWSCLIV2.msi',
          mac: 'brew install awscli',
          linux: 'curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && unzip awscliv2.zip && sudo ./aws/install',
        },
      });
    }

    // Check eksctl
    try {
      const { stdout: eksctlVersion } = await execAsync('eksctl version');
      prerequisites.push({
        name: 'eksctl',
        status: 'installed',
        version: eksctlVersion.trim(),
        description: 'Official CLI for Amazon EKS cluster management',
        required: false,
        requiredFor: ['EKS cluster creation', 'IAM service accounts'],
      });
    } catch (error) {
      prerequisites.push({
        name: 'eksctl',
        status: 'not_installed',
        version: null,
        error: error.message,
        description: 'Official CLI for Amazon EKS cluster management',
        required: false,
        requiredFor: ['EKS cluster creation', 'IAM service accounts'],
        installUrl: 'https://eksctl.io/installation/',
        installCommand: {
          windows: 'choco install eksctl',
          mac: 'brew tap weaveworks/tap && brew install weaveworks/tap/eksctl',
          linux: 'curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp && sudo mv /tmp/eksctl /usr/local/bin',
        },
      });
    }

    // Check Helm
    try {
      const { stdout: helmVersion } = await execAsync('helm version --short');
      prerequisites.push({
        name: 'Helm',
        status: 'installed',
        version: helmVersion.trim(),
        description: 'Kubernetes package manager for deploying applications',
        required: false,
        requiredFor: ['EFS CSI driver', 'Helm chart deployments'],
      });
    } catch (error) {
      prerequisites.push({
        name: 'Helm',
        status: 'not_installed',
        version: null,
        error: error.message,
        description: 'Kubernetes package manager for deploying applications',
        required: false,
        requiredFor: ['EFS CSI driver', 'Helm chart deployments'],
        installUrl: 'https://helm.sh/docs/intro/install/',
        installCommand: {
          windows: 'choco install kubernetes-helm',
          mac: 'brew install helm',
          linux: 'curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash',
        },
      });
    }

    // Check Azure CLI (optional)
    try {
      const { stdout: azVersion } = await execAsync('az version -o json');
      const azInfo = JSON.parse(azVersion);
      prerequisites.push({
        name: 'Azure CLI',
        status: 'installed',
        version: azInfo['azure-cli'] || 'unknown',
        description: 'Azure command-line interface for cloud operations',
        required: false,
        requiredFor: ['Azure AKS', 'ACR'],
      });
    } catch (error) {
      prerequisites.push({
        name: 'Azure CLI',
        status: 'not_installed',
        version: null,
        description: 'Azure command-line interface for cloud operations',
        required: false,
        requiredFor: ['Azure AKS', 'ACR'],
        installUrl: 'https://docs.microsoft.com/en-us/cli/azure/install-azure-cli',
      });
    }

    // Check gcloud CLI (optional)
    try {
      const { stdout: gcloudVersion } = await execAsync('gcloud version --format=json');
      const gcloudInfo = JSON.parse(gcloudVersion);
      prerequisites.push({
        name: 'Google Cloud CLI',
        status: 'installed',
        version: gcloudInfo['Google Cloud SDK'] || 'unknown',
        description: 'Google Cloud command-line interface',
        required: false,
        requiredFor: ['GKE', 'GCR'],
      });
    } catch (error) {
      prerequisites.push({
        name: 'Google Cloud CLI',
        status: 'not_installed',
        version: null,
        description: 'Google Cloud command-line interface',
        required: false,
        requiredFor: ['GKE', 'GCR'],
        installUrl: 'https://cloud.google.com/sdk/docs/install',
      });
    }

    // Check Terraform (optional)
    try {
      const { stdout: tfVersion } = await execAsync('terraform version -json');
      const tfInfo = JSON.parse(tfVersion);
      prerequisites.push({
        name: 'Terraform',
        status: 'installed',
        version: tfInfo.terraform_version || 'unknown',
        description: 'Infrastructure as Code tool for cloud provisioning',
        required: false,
        requiredFor: ['Infrastructure provisioning'],
      });
    } catch (error) {
      prerequisites.push({
        name: 'Terraform',
        status: 'not_installed',
        version: null,
        description: 'Infrastructure as Code tool for cloud provisioning',
        required: false,
        requiredFor: ['Infrastructure provisioning'],
        installUrl: 'https://www.terraform.io/downloads',
      });
    }

    // Check kubeconfig
    let kubeconfigStatus = { configured: false };
    try {
      const { stdout: currentContext } = await execAsync('kubectl config current-context');
      const { stdout: contextsJson } = await execAsync('kubectl config get-contexts -o name');
      const contexts = contextsJson.trim().split('\n').filter(c => c);
      kubeconfigStatus = {
        configured: true,
        currentContext: currentContext.trim(),
        availableContexts: contexts,
      };
    } catch (error) {
      kubeconfigStatus = {
        configured: false,
        error: error.message,
      };
    }

    // Summary
    const installed = prerequisites.filter(p => p.status === 'installed').length;
    const requiredMissing = prerequisites.filter(p => p.required && p.status !== 'installed');
    const optionalMissing = prerequisites.filter(p => !p.required && p.status !== 'installed');

    return {
      prerequisites,
      kubeconfig: kubeconfigStatus,
      summary: {
        total: prerequisites.length,
        installed,
        missing: prerequisites.length - installed,
        requiredMissing: requiredMissing.length,
        optionalMissing: optionalMissing.length,
        ready: requiredMissing.length === 0,
      },
    };
  }

  /**
   * Validate AWS credentials configuration
   */
  async checkAwsConfiguration(credentialId) {
    try {
      const credential = await require('../models').Credential.findByPk(credentialId);
      if (!credential) {
        return { configured: false, error: 'Credential not found' };
      }

      const decrypted = this.getDecryptedCredentialData(credential);
      
      // Test AWS credentials by calling STS GetCallerIdentity
      const env = {
        ...process.env,
        AWS_ACCESS_KEY_ID: decrypted.accessKeyId,
        AWS_SECRET_ACCESS_KEY: decrypted.secretAccessKey,
        AWS_DEFAULT_REGION: decrypted.region || 'us-east-1',
      };

      const { stdout } = await execAsync('aws sts get-caller-identity --output json', { env });
      const identity = JSON.parse(stdout);

      return {
        configured: true,
        accountId: identity.Account,
        arn: identity.Arn,
        userId: identity.UserId,
        region: decrypted.region,
      };
    } catch (error) {
      return {
        configured: false,
        error: error.message,
      };
    }
  }

  // ==========================================
  // IAM ROLE MANAGEMENT FOR EKS
  // ==========================================

  /**
   * Define required IAM roles for EKS
   * 
   * Note: Terraform creates these roles during deployment:
   * - ${clusterName}-cluster-role (required)
   * - ${clusterName}-node-group-role (required)
   * 
   * The CSI driver, LB controller, and autoscaler roles are created by EKS add-ons
   * or Helm charts after cluster deployment.
   */
  getRequiredEksIamRoles(clusterName) {
    const namePrefix = clusterName || 'eks';
    return [
      {
        id: 'eks-cluster-role',
        name: `${namePrefix}-cluster-role`,
        description: 'Allows EKS control plane to manage AWS resources',
        required: true,
        createdBy: 'terraform',
        category: 'Cluster',
        trustPolicy: {
          Version: '2012-10-17',
          Statement: [{
            Effect: 'Allow',
            Principal: { Service: 'eks.amazonaws.com' },
            Action: 'sts:AssumeRole',
          }],
        },
        managedPolicies: [
          'arn:aws:iam::aws:policy/AmazonEKSClusterPolicy',
        ],
      },
      {
        id: 'eks-node-group-role',
        name: `${namePrefix}-node-group-role`,
        description: 'Allows EC2 worker nodes to call AWS APIs',
        required: true,
        createdBy: 'terraform',
        category: 'Cluster',
        trustPolicy: {
          Version: '2012-10-17',
          Statement: [{
            Effect: 'Allow',
            Principal: { Service: 'ec2.amazonaws.com' },
            Action: 'sts:AssumeRole',
          }],
        },
        managedPolicies: [
          'arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy',
          'arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy',
          'arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly',
        ],
      },
      {
        id: 'ebs-csi-driver-role',
        name: `${namePrefix}-ebs-csi-driver-role`,
        description: 'Allows EBS CSI driver to provision and manage EBS volumes',
        required: false,
        createdBy: 'eks-addon',
        requiredFor: 'EBS Storage',
        category: 'Storage',
        trustPolicy: {
          Version: '2012-10-17',
          Statement: [{
            Effect: 'Allow',
            Principal: { Service: 'eks.amazonaws.com' },
            Action: 'sts:AssumeRole',
          }],
        },
        managedPolicies: [
          'arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy',
        ],
      },
      {
        id: 'efs-csi-driver-role',
        name: `${namePrefix}-efs-csi-driver-role`,
        description: 'Allows EFS CSI driver to provision and manage EFS file systems',
        required: false,
        createdBy: 'eks-addon',
        requiredFor: 'EFS Storage',
        category: 'Storage',
        trustPolicy: {
          Version: '2012-10-17',
          Statement: [{
            Effect: 'Allow',
            Principal: { Service: 'eks.amazonaws.com' },
            Action: 'sts:AssumeRole',
          }],
        },
        managedPolicies: [
          'arn:aws:iam::aws:policy/service-role/AmazonEFSCSIDriverPolicy',
        ],
      },
      {
        id: 'aws-lb-controller-role',
        name: `${namePrefix}-aws-lb-controller-role`,
        description: 'Allows AWS Load Balancer Controller to manage ALB/NLB resources',
        required: false,
        createdBy: 'helm',
        requiredFor: 'Load Balancing',
        category: 'Networking',
        trustPolicy: {
          Version: '2012-10-17',
          Statement: [{
            Effect: 'Allow',
            Principal: { Service: 'eks.amazonaws.com' },
            Action: 'sts:AssumeRole',
          }],
        },
        managedPolicies: [],
        inlinePolicy: {
          PolicyName: 'AWSLoadBalancerControllerPolicy',
          PolicyDocument: {
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Action: [
                  'iam:CreateServiceLinkedRole',
                ],
                Resource: '*',
                Condition: {
                  StringEquals: {
                    'iam:AWSServiceName': 'elasticloadbalancing.amazonaws.com',
                  },
                },
              },
              {
                Effect: 'Allow',
                Action: [
                  'ec2:DescribeAccountAttributes',
                  'ec2:DescribeAddresses',
                  'ec2:DescribeAvailabilityZones',
                  'ec2:DescribeInternetGateways',
                  'ec2:DescribeVpcs',
                  'ec2:DescribeVpcPeeringConnections',
                  'ec2:DescribeSubnets',
                  'ec2:DescribeSecurityGroups',
                  'ec2:DescribeInstances',
                  'ec2:DescribeNetworkInterfaces',
                  'ec2:DescribeTags',
                  'ec2:GetCoipPoolUsage',
                  'ec2:DescribeCoipPools',
                  'elasticloadbalancing:DescribeLoadBalancers',
                  'elasticloadbalancing:DescribeLoadBalancerAttributes',
                  'elasticloadbalancing:DescribeListeners',
                  'elasticloadbalancing:DescribeListenerCertificates',
                  'elasticloadbalancing:DescribeSSLPolicies',
                  'elasticloadbalancing:DescribeRules',
                  'elasticloadbalancing:DescribeTargetGroups',
                  'elasticloadbalancing:DescribeTargetGroupAttributes',
                  'elasticloadbalancing:DescribeTargetHealth',
                  'elasticloadbalancing:DescribeTags',
                ],
                Resource: '*',
              },
              {
                Effect: 'Allow',
                Action: [
                  'cognito-idp:DescribeUserPoolClient',
                  'acm:ListCertificates',
                  'acm:DescribeCertificate',
                  'iam:ListServerCertificates',
                  'iam:GetServerCertificate',
                  'waf-regional:GetWebACL',
                  'waf-regional:GetWebACLForResource',
                  'waf-regional:AssociateWebACL',
                  'waf-regional:DisassociateWebACL',
                  'wafv2:GetWebACL',
                  'wafv2:GetWebACLForResource',
                  'wafv2:AssociateWebACL',
                  'wafv2:DisassociateWebACL',
                  'shield:GetSubscriptionState',
                  'shield:DescribeProtection',
                  'shield:CreateProtection',
                  'shield:DeleteProtection',
                ],
                Resource: '*',
              },
              {
                Effect: 'Allow',
                Action: [
                  'ec2:AuthorizeSecurityGroupIngress',
                  'ec2:RevokeSecurityGroupIngress',
                  'ec2:CreateSecurityGroup',
                  'ec2:CreateTags',
                  'ec2:DeleteTags',
                  'ec2:DeleteSecurityGroup',
                ],
                Resource: '*',
              },
              {
                Effect: 'Allow',
                Action: [
                  'elasticloadbalancing:CreateLoadBalancer',
                  'elasticloadbalancing:CreateTargetGroup',
                  'elasticloadbalancing:CreateListener',
                  'elasticloadbalancing:DeleteListener',
                  'elasticloadbalancing:CreateRule',
                  'elasticloadbalancing:DeleteRule',
                  'elasticloadbalancing:AddTags',
                  'elasticloadbalancing:RemoveTags',
                  'elasticloadbalancing:ModifyLoadBalancerAttributes',
                  'elasticloadbalancing:SetIpAddressType',
                  'elasticloadbalancing:SetSecurityGroups',
                  'elasticloadbalancing:SetSubnets',
                  'elasticloadbalancing:DeleteLoadBalancer',
                  'elasticloadbalancing:ModifyTargetGroup',
                  'elasticloadbalancing:ModifyTargetGroupAttributes',
                  'elasticloadbalancing:DeleteTargetGroup',
                  'elasticloadbalancing:RegisterTargets',
                  'elasticloadbalancing:DeregisterTargets',
                  'elasticloadbalancing:SetWebAcl',
                  'elasticloadbalancing:ModifyListener',
                  'elasticloadbalancing:AddListenerCertificates',
                  'elasticloadbalancing:RemoveListenerCertificates',
                  'elasticloadbalancing:ModifyRule',
                ],
                Resource: '*',
              },
            ],
          },
        },
      },
      {
        id: 'cluster-autoscaler-role',
        name: `${namePrefix}-cluster-autoscaler-role`,
        description: 'Allows Cluster Autoscaler to scale node groups',
        required: false,
        createdBy: 'helm',
        requiredFor: 'Autoscaling',
        category: 'Scaling',
        trustPolicy: {
          Version: '2012-10-17',
          Statement: [{
            Effect: 'Allow',
            Principal: { Service: 'eks.amazonaws.com' },
            Action: 'sts:AssumeRole',
          }],
        },
        managedPolicies: [],
        inlinePolicy: {
          PolicyName: 'ClusterAutoscalerPolicy',
          PolicyDocument: {
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Action: [
                  'autoscaling:DescribeAutoScalingGroups',
                  'autoscaling:DescribeAutoScalingInstances',
                  'autoscaling:DescribeLaunchConfigurations',
                  'autoscaling:DescribeScalingActivities',
                  'autoscaling:DescribeTags',
                  'ec2:DescribeInstanceTypes',
                  'ec2:DescribeLaunchTemplateVersions',
                ],
                Resource: ['*'],
              },
              {
                Effect: 'Allow',
                Action: [
                  'autoscaling:SetDesiredCapacity',
                  'autoscaling:TerminateInstanceInAutoScalingGroup',
                  'ec2:DescribeImages',
                  'ec2:GetInstanceTypesFromInstanceRequirements',
                  'eks:DescribeNodegroup',
                ],
                Resource: ['*'],
              },
            ],
          },
        },
      },
    ];
  }

  /**
   * Check status of EKS IAM roles
   */
  async checkEksIamRoles(credentialId, clusterName) {
    try {
      const credential = await require('../models').Credential.findByPk(credentialId);
      if (!credential) {
        throw new Error('Credential not found');
      }

      const decrypted = this.getDecryptedCredentialData(credential);
      const env = {
        ...process.env,
        AWS_ACCESS_KEY_ID: decrypted.accessKeyId,
        AWS_SECRET_ACCESS_KEY: decrypted.secretAccessKey,
        AWS_DEFAULT_REGION: decrypted.region || 'us-east-1',
      };

      const requiredRoles = this.getRequiredEksIamRoles(clusterName);
      const roleStatuses = [];

      for (const roleConfig of requiredRoles) {
        try {
          const { stdout } = await execAsync(`aws iam get-role --role-name ${roleConfig.name} --output json`, { env });
          const roleData = JSON.parse(stdout);
          
          // Check attached policies
          const { stdout: policiesOutput } = await execAsync(
            `aws iam list-attached-role-policies --role-name ${roleConfig.name} --output json`, 
            { env }
          );
          const attachedPolicies = JSON.parse(policiesOutput).AttachedPolicies || [];
          
          roleStatuses.push({
            ...roleConfig,
            status: 'exists',
            arn: roleData.Role.Arn,
            createdAt: roleData.Role.CreateDate,
            attachedPolicies: attachedPolicies.map(p => p.PolicyArn),
            allPoliciesAttached: roleConfig.managedPolicies.every(
              mp => attachedPolicies.some(ap => ap.PolicyArn === mp)
            ),
          });
        } catch (error) {
          // Combine error message and stderr for better error detection
          const errorMsg = `${error.message || ''} ${error.stderr || ''}`.trim();
          // AWS CLI returns NoSuchEntity in stderr when role doesn't exist
          if (errorMsg.includes('NoSuchEntity') || errorMsg.includes('cannot be found') || errorMsg.includes('does not exist')) {
            roleStatuses.push({
              ...roleConfig,
              status: 'missing',
              arn: null,
            });
          } else {
            logger.warn(`Error checking IAM role ${roleConfig.name}:`, errorMsg);
            roleStatuses.push({
              ...roleConfig,
              status: 'error',
              error: errorMsg.substring(0, 200), // Truncate long error messages
            });
          }
        }
      }

      const allRequiredExist = roleStatuses
        .filter(r => r.required)
        .every(r => r.status === 'exists' && r.allPoliciesAttached);

      return {
        roles: roleStatuses,
        summary: {
          total: roleStatuses.length,
          existing: roleStatuses.filter(r => r.status === 'exists').length,
          missing: roleStatuses.filter(r => r.status === 'missing').length,
          errors: roleStatuses.filter(r => r.status === 'error').length,
          allRequiredExist,
          ready: allRequiredExist,
        },
      };
    } catch (error) {
      logger.error('Failed to check EKS IAM roles:', error);
      throw new Error(`Failed to check IAM roles: ${error.message}`);
    }
  }

  /**
   * Create a single EKS IAM role with policies
   */
  async createEksIamRole(credentialId, roleId, clusterName) {
    try {
      const credential = await require('../models').Credential.findByPk(credentialId);
      if (!credential) {
        throw new Error('Credential not found');
      }

      const decrypted = this.getDecryptedCredentialData(credential);
      const env = {
        ...process.env,
        AWS_ACCESS_KEY_ID: decrypted.accessKeyId,
        AWS_SECRET_ACCESS_KEY: decrypted.secretAccessKey,
        AWS_DEFAULT_REGION: decrypted.region || 'us-east-1',
      };

      const requiredRoles = this.getRequiredEksIamRoles(clusterName);
      const roleConfig = requiredRoles.find(r => r.id === roleId);
      
      if (!roleConfig) {
        throw new Error(`Unknown role ID: ${roleId}`);
      }

      // Write trust policy to a temp file (avoids shell escaping issues on Windows)
      const tempDir = os.tmpdir();
      const trustPolicyPath = path.join(tempDir, `trust-policy-${Date.now()}.json`);
      await fs.writeFile(trustPolicyPath, JSON.stringify(roleConfig.trustPolicy, null, 2));

      try {
        // Create the role using file:// syntax
        await execAsync(
          `aws iam create-role --role-name ${roleConfig.name} --assume-role-policy-document file://${trustPolicyPath} --description "${roleConfig.description}"`,
          { env }
        );

        logger.info(`Created IAM role: ${roleConfig.name}`);
      } finally {
        // Clean up temp file
        await fs.unlink(trustPolicyPath).catch(() => {});
      }

      // Attach managed policies
      for (const policyArn of roleConfig.managedPolicies) {
        await execAsync(
          `aws iam attach-role-policy --role-name ${roleConfig.name} --policy-arn ${policyArn}`,
          { env }
        );
        logger.info(`Attached policy ${policyArn} to ${roleConfig.name}`);
      }

      // Add inline policy if defined
      if (roleConfig.inlinePolicy) {
        const inlinePolicyPath = path.join(tempDir, `inline-policy-${Date.now()}.json`);
        await fs.writeFile(inlinePolicyPath, JSON.stringify(roleConfig.inlinePolicy.PolicyDocument, null, 2));
        
        try {
          await execAsync(
            `aws iam put-role-policy --role-name ${roleConfig.name} --policy-name ${roleConfig.inlinePolicy.PolicyName} --policy-document file://${inlinePolicyPath}`,
            { env }
          );
          logger.info(`Added inline policy to ${roleConfig.name}`);
        } finally {
          await fs.unlink(inlinePolicyPath).catch(() => {});
        }
      }

      // Get the created role ARN
      const { stdout } = await execAsync(`aws iam get-role --role-name ${roleConfig.name} --output json`, { env });
      const roleData = JSON.parse(stdout);

      return {
        success: true,
        role: {
          id: roleConfig.id,
          name: roleConfig.name,
          arn: roleData.Role.Arn,
          status: 'created',
        },
      };
    } catch (error) {
      logger.error(`Failed to create IAM role:`, error);
      
      if (error.message.includes('EntityAlreadyExists')) {
        return {
          success: true,
          role: {
            id: roleId,
            status: 'already_exists',
          },
          message: 'Role already exists',
        };
      }
      
      throw new Error(`Failed to create IAM role: ${error.message}`);
    }
  }

  /**
   * Create all required EKS IAM roles
   */
  async createAllEksIamRoles(credentialId, clusterName, options = {}) {
    const { onlyRequired = true } = options;
    const results = [];
    const requiredRoles = this.getRequiredEksIamRoles(clusterName);
    
    const rolesToCreate = onlyRequired 
      ? requiredRoles.filter(r => r.required)
      : requiredRoles;

    for (const roleConfig of rolesToCreate) {
      try {
        const result = await this.createEksIamRole(credentialId, roleConfig.id, clusterName);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          role: { id: roleConfig.id, name: roleConfig.name },
          error: error.message,
        });
      }
    }

    return {
      results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
      },
    };
  }

  // ==========================================
  // PHASE 2: STORAGE MANAGEMENT
  // ==========================================

  /**
   * Get all StorageClasses in the cluster
   */
  async getStorageClasses() {
    try {
      const { stdout } = await execAsync('kubectl get storageclasses -o json');
      const result = JSON.parse(stdout);
      
      return result.items.map(sc => ({
        name: sc.metadata.name,
        provisioner: sc.provisioner,
        reclaimPolicy: sc.reclaimPolicy || 'Delete',
        volumeBindingMode: sc.volumeBindingMode || 'Immediate',
        allowVolumeExpansion: sc.allowVolumeExpansion || false,
        isDefault: sc.metadata.annotations?.['storageclass.kubernetes.io/is-default-class'] === 'true',
        parameters: sc.parameters || {},
        createdAt: sc.metadata.creationTimestamp,
      }));
    } catch (error) {
      logger.error('Failed to get StorageClasses:', error);
      throw new Error(`Failed to get StorageClasses: ${error.message}`);
    }
  }

  /**
   * Create a new StorageClass
   */
  async createStorageClass(config) {
    const { name, provisioner, reclaimPolicy, volumeBindingMode, allowVolumeExpansion, parameters, isDefault } = config;

    const storageClass = {
      apiVersion: 'storage.k8s.io/v1',
      kind: 'StorageClass',
      metadata: {
        name,
        annotations: isDefault ? { 'storageclass.kubernetes.io/is-default-class': 'true' } : {},
      },
      provisioner,
      reclaimPolicy: reclaimPolicy || 'Delete',
      volumeBindingMode: volumeBindingMode || 'WaitForFirstConsumer',
      allowVolumeExpansion: allowVolumeExpansion || false,
      parameters: parameters || {},
    };

    try {
      const yamlContent = yaml.dump(storageClass);
      const { stdout, stderr } = await execAsync(`echo '${yamlContent.replace(/'/g, "\\'")}' | kubectl apply -f -`);
      logger.info(`Created StorageClass: ${name}`);
      return { success: true, name, message: stdout || 'StorageClass created successfully' };
    } catch (error) {
      logger.error(`Failed to create StorageClass ${name}:`, error);
      throw new Error(`Failed to create StorageClass: ${error.message}`);
    }
  }

  /**
   * Delete a StorageClass
   */
  async deleteStorageClass(name) {
    try {
      const { stdout } = await execAsync(`kubectl delete storageclass ${name}`);
      logger.info(`Deleted StorageClass: ${name}`);
      return { success: true, message: stdout };
    } catch (error) {
      logger.error(`Failed to delete StorageClass ${name}:`, error);
      throw new Error(`Failed to delete StorageClass: ${error.message}`);
    }
  }

  /**
   * Get StorageClass templates for common providers
   */
  getStorageClassTemplates() {
    return {
      'aws-ebs-gp3': {
        name: 'ebs-sc',
        provisioner: 'ebs.csi.aws.com',
        reclaimPolicy: 'Delete',
        volumeBindingMode: 'WaitForFirstConsumer',
        allowVolumeExpansion: true,
        parameters: {
          type: 'gp3',
          fsType: 'ext4',
        },
        description: 'AWS EBS gp3 volumes - balanced price/performance for most workloads',
      },
      'aws-ebs-gp2': {
        name: 'ebs-gp2-sc',
        provisioner: 'ebs.csi.aws.com',
        reclaimPolicy: 'Delete',
        volumeBindingMode: 'WaitForFirstConsumer',
        allowVolumeExpansion: true,
        parameters: {
          type: 'gp2',
          fsType: 'ext4',
        },
        description: 'AWS EBS gp2 volumes - legacy SSD volumes',
      },
      'aws-ebs-io1': {
        name: 'ebs-io1-sc',
        provisioner: 'ebs.csi.aws.com',
        reclaimPolicy: 'Retain',
        volumeBindingMode: 'WaitForFirstConsumer',
        allowVolumeExpansion: true,
        parameters: {
          type: 'io1',
          iopsPerGB: '50',
          fsType: 'ext4',
        },
        description: 'AWS EBS io1 volumes - high-performance SSD for databases',
      },
      'aws-efs': {
        name: 'efs-sc',
        provisioner: 'efs.csi.aws.com',
        reclaimPolicy: 'Delete',
        volumeBindingMode: 'Immediate',
        allowVolumeExpansion: false,
        parameters: {
          provisioningMode: 'efs-ap',
          directoryPerms: '700',
        },
        description: 'AWS EFS - shared file system for multi-pod access',
      },
      'azure-disk-premium': {
        name: 'azure-premium-sc',
        provisioner: 'disk.csi.azure.com',
        reclaimPolicy: 'Delete',
        volumeBindingMode: 'WaitForFirstConsumer',
        allowVolumeExpansion: true,
        parameters: {
          skuName: 'Premium_LRS',
        },
        description: 'Azure Premium SSD managed disk',
      },
      'azure-disk-standard': {
        name: 'azure-standard-sc',
        provisioner: 'disk.csi.azure.com',
        reclaimPolicy: 'Delete',
        volumeBindingMode: 'WaitForFirstConsumer',
        allowVolumeExpansion: true,
        parameters: {
          skuName: 'StandardSSD_LRS',
        },
        description: 'Azure Standard SSD managed disk',
      },
      'gcp-pd-ssd': {
        name: 'gcp-ssd-sc',
        provisioner: 'pd.csi.storage.gke.io',
        reclaimPolicy: 'Delete',
        volumeBindingMode: 'WaitForFirstConsumer',
        allowVolumeExpansion: true,
        parameters: {
          type: 'pd-ssd',
        },
        description: 'GCP SSD persistent disk',
      },
      'gcp-pd-standard': {
        name: 'gcp-standard-sc',
        provisioner: 'pd.csi.storage.gke.io',
        reclaimPolicy: 'Delete',
        volumeBindingMode: 'WaitForFirstConsumer',
        allowVolumeExpansion: true,
        parameters: {
          type: 'pd-standard',
        },
        description: 'GCP Standard persistent disk',
      },
    };
  }

  /**
   * Get all PersistentVolumeClaims
   */
  async getPVCs(namespace = null) {
    try {
      const nsFlag = namespace ? `-n ${namespace}` : '--all-namespaces';
      const { stdout } = await execAsync(`kubectl get pvc ${nsFlag} -o json`);
      const result = JSON.parse(stdout);
      
      return result.items.map(pvc => ({
        name: pvc.metadata.name,
        namespace: pvc.metadata.namespace,
        status: pvc.status.phase,
        volume: pvc.spec.volumeName || null,
        storageClass: pvc.spec.storageClassName,
        accessModes: pvc.spec.accessModes,
        capacity: pvc.status.capacity?.storage || pvc.spec.resources?.requests?.storage,
        requestedStorage: pvc.spec.resources?.requests?.storage,
        createdAt: pvc.metadata.creationTimestamp,
      }));
    } catch (error) {
      logger.error('Failed to get PVCs:', error);
      throw new Error(`Failed to get PVCs: ${error.message}`);
    }
  }

  /**
   * Create a new PersistentVolumeClaim
   */
  async createPVC(config) {
    const { name, namespace, storageClass, accessModes, storage, labels } = config;

    const pvc = {
      apiVersion: 'v1',
      kind: 'PersistentVolumeClaim',
      metadata: {
        name,
        namespace: namespace || 'default',
        labels: labels || {},
      },
      spec: {
        accessModes: accessModes || ['ReadWriteOnce'],
        storageClassName: storageClass,
        resources: {
          requests: {
            storage: storage || '10Gi',
          },
        },
      },
    };

    try {
      const yamlContent = yaml.dump(pvc);
      const { stdout } = await execAsync(`echo '${yamlContent.replace(/'/g, "\\'")}' | kubectl apply -f -`);
      logger.info(`Created PVC: ${name} in namespace ${namespace}`);
      return { success: true, name, namespace, message: stdout || 'PVC created successfully' };
    } catch (error) {
      logger.error(`Failed to create PVC ${name}:`, error);
      throw new Error(`Failed to create PVC: ${error.message}`);
    }
  }

  /**
   * Delete a PersistentVolumeClaim
   */
  async deletePVC(name, namespace) {
    try {
      const { stdout } = await execAsync(`kubectl delete pvc ${name} -n ${namespace}`);
      logger.info(`Deleted PVC: ${name} from namespace ${namespace}`);
      return { success: true, message: stdout };
    } catch (error) {
      logger.error(`Failed to delete PVC ${name}:`, error);
      throw new Error(`Failed to delete PVC: ${error.message}`);
    }
  }

  /**
   * Get all PersistentVolumes
   */
  async getPVs() {
    try {
      const { stdout } = await execAsync('kubectl get pv -o json');
      const result = JSON.parse(stdout);
      
      return result.items.map(pv => ({
        name: pv.metadata.name,
        capacity: pv.spec.capacity?.storage,
        accessModes: pv.spec.accessModes,
        reclaimPolicy: pv.spec.persistentVolumeReclaimPolicy,
        status: pv.status.phase,
        claim: pv.spec.claimRef ? `${pv.spec.claimRef.namespace}/${pv.spec.claimRef.name}` : null,
        storageClass: pv.spec.storageClassName,
        volumeHandle: pv.spec.csi?.volumeHandle || pv.spec.awsElasticBlockStore?.volumeID || null,
        createdAt: pv.metadata.creationTimestamp,
      }));
    } catch (error) {
      logger.error('Failed to get PVs:', error);
      throw new Error(`Failed to get PVs: ${error.message}`);
    }
  }

  /**
   * Get EKS add-ons status
   */
  async getEKSAddons(credentialId, clusterName, region) {
    try {
      const credential = await require('../models').Credential.findByPk(credentialId);
      if (!credential) {
        throw new Error('Credential not found');
      }

      const decrypted = this.getDecryptedCredentialData(credential);
      
      const eksClient = new EKSClient({
        region: region || decrypted.region,
        credentials: {
          accessKeyId: decrypted.accessKeyId,
          secretAccessKey: decrypted.secretAccessKey,
        },
      });

      const command = new ListAddonsCommand({ clusterName });
      const response = await eksClient.send(command);

      // Get details for each addon
      const addons = await Promise.all(
        (response.addons || []).map(async (addonName) => {
          try {
            const describeCmd = new DescribeAddonCommand({ clusterName, addonName });
            const addonInfo = await eksClient.send(describeCmd);
            return {
              name: addonInfo.addon.addonName,
              version: addonInfo.addon.addonVersion,
              status: addonInfo.addon.status,
              serviceAccountRoleArn: addonInfo.addon.serviceAccountRoleArn,
              createdAt: addonInfo.addon.createdAt,
              modifiedAt: addonInfo.addon.modifiedAt,
            };
          } catch (err) {
            return { name: addonName, status: 'UNKNOWN', error: err.message };
          }
        })
      );

      return {
        clusterName,
        addons,
        ebsCsiInstalled: addons.some(a => a.name === 'aws-ebs-csi-driver'),
        efsCsiInstalled: addons.some(a => a.name === 'aws-efs-csi-driver'),
        vpcCniInstalled: addons.some(a => a.name === 'vpc-cni'),
        corednsInstalled: addons.some(a => a.name === 'coredns'),
        kubeProxyInstalled: addons.some(a => a.name === 'kube-proxy'),
      };
    } catch (error) {
      logger.error('Failed to get EKS addons:', error);
      throw new Error(`Failed to get EKS addons: ${error.message}`);
    }
  }

  /**
   * Install EBS CSI Driver add-on
   */
  async installEBSCSIDriver(credentialId, clusterName, region, serviceAccountRoleArn = null) {
    try {
      const credential = await require('../models').Credential.findByPk(credentialId);
      if (!credential) {
        throw new Error('Credential not found');
      }

      const decrypted = this.getDecryptedCredentialData(credential);
      
      const eksClient = new EKSClient({
        region: region || decrypted.region,
        credentials: {
          accessKeyId: decrypted.accessKeyId,
          secretAccessKey: decrypted.secretAccessKey,
        },
      });

      const command = new CreateAddonCommand({
        clusterName,
        addonName: 'aws-ebs-csi-driver',
        serviceAccountRoleArn,
        resolveConflicts: 'OVERWRITE',
      });

      const response = await eksClient.send(command);
      logger.info(`Installed EBS CSI Driver on cluster ${clusterName}`);
      
      return {
        success: true,
        addon: response.addon,
        message: 'EBS CSI Driver installation initiated. It may take a few minutes to become active.',
      };
    } catch (error) {
      logger.error('Failed to install EBS CSI Driver:', error);
      throw new Error(`Failed to install EBS CSI Driver: ${error.message}`);
    }
  }

  /**
   * Install EFS CSI Driver via Helm
   */
  async installEFSCSIDriver() {
    try {
      // Add the EFS CSI driver Helm repo
      await execAsync('helm repo add aws-efs-csi-driver https://kubernetes-sigs.github.io/aws-efs-csi-driver/');
      await execAsync('helm repo update');
      
      // Install or upgrade the driver
      const { stdout, stderr } = await execAsync(
        'helm upgrade --install aws-efs-csi-driver aws-efs-csi-driver/aws-efs-csi-driver ' +
        '--namespace kube-system ' +
        '--set controller.serviceAccount.create=true ' +
        '--set controller.serviceAccount.name=efs-csi-controller-sa'
      );
      
      logger.info('Installed EFS CSI Driver via Helm');
      return {
        success: true,
        message: 'EFS CSI Driver installed successfully',
        output: stdout,
      };
    } catch (error) {
      logger.error('Failed to install EFS CSI Driver:', error);
      throw new Error(`Failed to install EFS CSI Driver: ${error.message}`);
    }
  }

  /**
   * Check CSI driver status (both EBS and EFS)
   */
  async checkCSIDriverStatus() {
    const status = {
      ebs: { installed: false, pods: [], healthy: false },
      efs: { installed: false, pods: [], healthy: false },
    };

    try {
      // Check EBS CSI driver pods
      const { stdout: ebsPods } = await execAsync(
        'kubectl get pods -n kube-system -l app.kubernetes.io/name=aws-ebs-csi-driver -o json'
      ).catch(() => ({ stdout: '{"items":[]}' }));
      
      const ebsResult = JSON.parse(ebsPods);
      if (ebsResult.items && ebsResult.items.length > 0) {
        status.ebs.installed = true;
        status.ebs.pods = ebsResult.items.map(pod => ({
          name: pod.metadata.name,
          status: pod.status.phase,
          ready: pod.status.conditions?.find(c => c.type === 'Ready')?.status === 'True',
        }));
        status.ebs.healthy = status.ebs.pods.every(p => p.ready);
      }

      // Check EFS CSI driver pods
      const { stdout: efsPods } = await execAsync(
        'kubectl get pods -n kube-system -l app=efs-csi-controller -o json'
      ).catch(() => ({ stdout: '{"items":[]}' }));
      
      const efsResult = JSON.parse(efsPods);
      if (efsResult.items && efsResult.items.length > 0) {
        status.efs.installed = true;
        status.efs.pods = efsResult.items.map(pod => ({
          name: pod.metadata.name,
          status: pod.status.phase,
          ready: pod.status.conditions?.find(c => c.type === 'Ready')?.status === 'True',
        }));
        status.efs.healthy = status.efs.pods.every(p => p.ready);
      }

      // Also check for node daemonsets
      const { stdout: ebsNodePods } = await execAsync(
        'kubectl get pods -n kube-system -l app=ebs-csi-node -o json'
      ).catch(() => ({ stdout: '{"items":[]}' }));
      
      const ebsNodeResult = JSON.parse(ebsNodePods);
      if (ebsNodeResult.items && ebsNodeResult.items.length > 0) {
        status.ebs.nodePods = ebsNodeResult.items.map(pod => ({
          name: pod.metadata.name,
          node: pod.spec.nodeName,
          status: pod.status.phase,
          ready: pod.status.conditions?.find(c => c.type === 'Ready')?.status === 'True',
        }));
      }

      const { stdout: efsNodePods } = await execAsync(
        'kubectl get pods -n kube-system -l app=efs-csi-node -o json'
      ).catch(() => ({ stdout: '{"items":[]}' }));
      
      const efsNodeResult = JSON.parse(efsNodePods);
      if (efsNodeResult.items && efsNodeResult.items.length > 0) {
        status.efs.nodePods = efsNodeResult.items.map(pod => ({
          name: pod.metadata.name,
          node: pod.spec.nodeName,
          status: pod.status.phase,
          ready: pod.status.conditions?.find(c => c.type === 'Ready')?.status === 'True',
        }));
      }

      return status;
    } catch (error) {
      logger.error('Failed to check CSI driver status:', error);
      return status;
    }
  }

  /**
   * Get EFS file systems for the account
   */
  async getEFSFileSystems(credentialId, region) {
    try {
      const credential = await require('../models').Credential.findByPk(credentialId);
      if (!credential) {
        throw new Error('Credential not found');
      }

      const decrypted = this.getDecryptedCredentialData(credential);
      
      const efsClient = new EFSClient({
        region: region || decrypted.region,
        credentials: {
          accessKeyId: decrypted.accessKeyId,
          secretAccessKey: decrypted.secretAccessKey,
        },
      });

      const command = new DescribeFileSystemsCommand({});
      const response = await efsClient.send(command);

      return response.FileSystems.map(fs => ({
        fileSystemId: fs.FileSystemId,
        name: fs.Name || fs.FileSystemId,
        lifecycleState: fs.LifeCycleState,
        sizeInBytes: fs.SizeInBytes?.Value,
        performanceMode: fs.PerformanceMode,
        throughputMode: fs.ThroughputMode,
        encrypted: fs.Encrypted,
        createdAt: fs.CreationTime,
        numberOfMountTargets: fs.NumberOfMountTargets,
      }));
    } catch (error) {
      logger.error('Failed to get EFS file systems:', error);
      throw new Error(`Failed to get EFS file systems: ${error.message}`);
    }
  }

  // ==========================================
  // PHASE 3: PRIVATE CLUSTER SUPPORT
  // ==========================================

  /**
   * Get EKS cluster endpoint configuration
   */
  async getClusterEndpointConfig(credentialId, clusterName, region) {
    try {
      const credential = await require('../models').Credential.findByPk(credentialId);
      if (!credential) {
        throw new Error('Credential not found');
      }

      const decrypted = this.getDecryptedCredentialData(credential);
      
      const eksClient = new EKSClient({
        region: region || decrypted.region,
        credentials: {
          accessKeyId: decrypted.accessKeyId,
          secretAccessKey: decrypted.secretAccessKey,
        },
      });

      const command = new DescribeClusterCommand({ name: clusterName });
      const response = await eksClient.send(command);
      const cluster = response.cluster;

      return {
        clusterName: cluster.name,
        endpoint: cluster.endpoint,
        endpointPublicAccess: cluster.resourcesVpcConfig.endpointPublicAccess,
        endpointPrivateAccess: cluster.resourcesVpcConfig.endpointPrivateAccess,
        publicAccessCidrs: cluster.resourcesVpcConfig.publicAccessCidrs,
        vpcId: cluster.resourcesVpcConfig.vpcId,
        subnetIds: cluster.resourcesVpcConfig.subnetIds,
        securityGroupIds: cluster.resourcesVpcConfig.securityGroupIds,
        clusterSecurityGroupId: cluster.resourcesVpcConfig.clusterSecurityGroupId,
        status: cluster.status,
        version: cluster.version,
        platformVersion: cluster.platformVersion,
      };
    } catch (error) {
      logger.error('Failed to get cluster endpoint config:', error);
      throw new Error(`Failed to get cluster endpoint config: ${error.message}`);
    }
  }

  /**
   * Update EKS cluster endpoint configuration
   */
  async updateClusterEndpointConfig(credentialId, clusterName, region, config) {
    try {
      const credential = await require('../models').Credential.findByPk(credentialId);
      if (!credential) {
        throw new Error('Credential not found');
      }

      const decrypted = this.getDecryptedCredentialData(credential);
      
      const eksClient = new EKSClient({
        region: region || decrypted.region,
        credentials: {
          accessKeyId: decrypted.accessKeyId,
          secretAccessKey: decrypted.secretAccessKey,
        },
      });

      const command = new UpdateClusterConfigCommand({
        name: clusterName,
        resourcesVpcConfig: {
          endpointPublicAccess: config.endpointPublicAccess,
          endpointPrivateAccess: config.endpointPrivateAccess,
          publicAccessCidrs: config.publicAccessCidrs,
        },
      });

      const response = await eksClient.send(command);
      logger.info(`Updated cluster endpoint config for ${clusterName}`);

      return {
        success: true,
        updateId: response.update?.id,
        status: response.update?.status,
        message: 'Cluster endpoint configuration update initiated. This may take several minutes.',
      };
    } catch (error) {
      logger.error('Failed to update cluster endpoint config:', error);
      throw new Error(`Failed to update cluster endpoint config: ${error.message}`);
    }
  }

  /**
   * Get VPC subnets with their tags
   */
  async getSubnets(credentialId, region, vpcId = null, subnetIds = null) {
    try {
      const credential = await require('../models').Credential.findByPk(credentialId);
      if (!credential) {
        throw new Error('Credential not found');
      }

      const decrypted = this.getDecryptedCredentialData(credential);
      
      const ec2Client = new EC2Client({
        region: region || decrypted.region,
        credentials: {
          accessKeyId: decrypted.accessKeyId,
          secretAccessKey: decrypted.secretAccessKey,
        },
      });

      const filters = [];
      if (vpcId) {
        filters.push({ Name: 'vpc-id', Values: [vpcId] });
      }

      const command = new DescribeSubnetsCommand({
        Filters: filters.length > 0 ? filters : undefined,
        SubnetIds: subnetIds || undefined,
      });

      const response = await ec2Client.send(command);

      return response.Subnets.map(subnet => {
        const tags = {};
        (subnet.Tags || []).forEach(tag => {
          tags[tag.Key] = tag.Value;
        });

        return {
          subnetId: subnet.SubnetId,
          vpcId: subnet.VpcId,
          availabilityZone: subnet.AvailabilityZone,
          availabilityZoneId: subnet.AvailabilityZoneId,
          cidrBlock: subnet.CidrBlock,
          state: subnet.State,
          mapPublicIpOnLaunch: subnet.MapPublicIpOnLaunch,
          availableIpAddressCount: subnet.AvailableIpAddressCount,
          tags,
          name: tags.Name || subnet.SubnetId,
          hasElbTag: tags['kubernetes.io/role/elb'] === '1',
          hasInternalElbTag: tags['kubernetes.io/role/internal-elb'] === '1',
          isPublic: subnet.MapPublicIpOnLaunch,
        };
      });
    } catch (error) {
      logger.error('Failed to get subnets:', error);
      throw new Error(`Failed to get subnets: ${error.message}`);
    }
  }

  /**
   * Add or remove subnet tags for load balancer configuration
   */
  async updateSubnetTags(credentialId, region, subnetId, tagsToAdd = {}, tagsToRemove = []) {
    try {
      const credential = await require('../models').Credential.findByPk(credentialId);
      if (!credential) {
        throw new Error('Credential not found');
      }

      const decrypted = this.getDecryptedCredentialData(credential);
      
      const ec2Client = new EC2Client({
        region: region || decrypted.region,
        credentials: {
          accessKeyId: decrypted.accessKeyId,
          secretAccessKey: decrypted.secretAccessKey,
        },
      });

      const results = { added: [], removed: [] };

      // Add tags
      if (Object.keys(tagsToAdd).length > 0) {
        const addCommand = new CreateTagsCommand({
          Resources: [subnetId],
          Tags: Object.entries(tagsToAdd).map(([Key, Value]) => ({ Key, Value })),
        });
        await ec2Client.send(addCommand);
        results.added = Object.keys(tagsToAdd);
        logger.info(`Added tags to subnet ${subnetId}:`, tagsToAdd);
      }

      // Remove tags
      if (tagsToRemove.length > 0) {
        const removeCommand = new DeleteTagsCommand({
          Resources: [subnetId],
          Tags: tagsToRemove.map(Key => ({ Key })),
        });
        await ec2Client.send(removeCommand);
        results.removed = tagsToRemove;
        logger.info(`Removed tags from subnet ${subnetId}:`, tagsToRemove);
      }

      return {
        success: true,
        subnetId,
        ...results,
        message: 'Subnet tags updated successfully',
      };
    } catch (error) {
      logger.error('Failed to update subnet tags:', error);
      throw new Error(`Failed to update subnet tags: ${error.message}`);
    }
  }

  /**
   * Get security groups related to EKS cluster
   */
  async getSecurityGroups(credentialId, region, vpcId = null, securityGroupIds = null) {
    try {
      const credential = await require('../models').Credential.findByPk(credentialId);
      if (!credential) {
        throw new Error('Credential not found');
      }

      const decrypted = this.getDecryptedCredentialData(credential);
      
      const ec2Client = new EC2Client({
        region: region || decrypted.region,
        credentials: {
          accessKeyId: decrypted.accessKeyId,
          secretAccessKey: decrypted.secretAccessKey,
        },
      });

      const filters = [];
      if (vpcId) {
        filters.push({ Name: 'vpc-id', Values: [vpcId] });
      }

      const command = new DescribeSecurityGroupsCommand({
        Filters: filters.length > 0 ? filters : undefined,
        GroupIds: securityGroupIds || undefined,
      });

      const response = await ec2Client.send(command);

      return response.SecurityGroups.map(sg => {
        const tags = {};
        (sg.Tags || []).forEach(tag => {
          tags[tag.Key] = tag.Value;
        });

        return {
          groupId: sg.GroupId,
          groupName: sg.GroupName,
          description: sg.Description,
          vpcId: sg.VpcId,
          tags,
          name: tags.Name || sg.GroupName,
          isEksClusterSg: sg.GroupName.includes('eks-cluster-sg') || tags['aws:eks:cluster-name'] !== undefined,
          isEksNodeSg: sg.GroupName.includes('node') || tags['kubernetes.io/cluster/'] !== undefined,
          inboundRules: sg.IpPermissions.map(rule => ({
            protocol: rule.IpProtocol,
            fromPort: rule.FromPort,
            toPort: rule.ToPort,
            sources: [
              ...rule.IpRanges.map(r => ({ type: 'cidr', value: r.CidrIp, description: r.Description })),
              ...rule.Ipv6Ranges.map(r => ({ type: 'cidrv6', value: r.CidrIpv6, description: r.Description })),
              ...rule.UserIdGroupPairs.map(r => ({ type: 'sg', value: r.GroupId, description: r.Description })),
              ...rule.PrefixListIds.map(r => ({ type: 'prefix', value: r.PrefixListId, description: r.Description })),
            ],
          })),
          outboundRules: sg.IpPermissionsEgress.map(rule => ({
            protocol: rule.IpProtocol,
            fromPort: rule.FromPort,
            toPort: rule.ToPort,
            destinations: [
              ...rule.IpRanges.map(r => ({ type: 'cidr', value: r.CidrIp, description: r.Description })),
              ...rule.Ipv6Ranges.map(r => ({ type: 'cidrv6', value: r.CidrIpv6, description: r.Description })),
              ...rule.UserIdGroupPairs.map(r => ({ type: 'sg', value: r.GroupId, description: r.Description })),
              ...rule.PrefixListIds.map(r => ({ type: 'prefix', value: r.PrefixListId, description: r.Description })),
            ],
          })),
        };
      });
    } catch (error) {
      logger.error('Failed to get security groups:', error);
      throw new Error(`Failed to get security groups: ${error.message}`);
    }
  }

  /**
   * Define required security groups for EKS
   */
  getRequiredEksSecurityGroups(clusterName, vpcCidr = '10.0.0.0/16') {
    const namePrefix = clusterName || 'eks';
    return [
      {
        id: 'ssm-endpoints-sg',
        name: `${namePrefix}-ssm-endpoints-sg`,
        description: 'Security group for SSM VPC endpoints - enables private cluster access',
        required: true,
        requiredFor: 'SSM Session Manager',
        category: 'Access',
        ingressRules: [
          {
            protocol: 'tcp',
            fromPort: 443,
            toPort: 443,
            cidr: vpcCidr,
            description: 'HTTPS from VPC for SSM endpoints',
          },
        ],
        egressRules: [],
      },
      {
        id: 'cluster-additional-sg',
        name: `${namePrefix}-cluster-additional-sg`,
        description: 'Additional security group for EKS cluster control plane',
        required: false,
        requiredFor: 'Cluster',
        category: 'Cluster',
        ingressRules: [
          {
            protocol: 'tcp',
            fromPort: 443,
            toPort: 443,
            cidr: vpcCidr,
            description: 'Kubernetes API from VPC',
          },
        ],
        egressRules: [],
      },
      {
        id: 'efs-mount-target-sg',
        name: `${namePrefix}-efs-mount-target-sg`,
        description: 'Security group for EFS mount targets - allows NFS traffic from nodes',
        required: false,
        requiredFor: 'EFS Storage',
        category: 'Storage',
        ingressRules: [
          {
            protocol: 'tcp',
            fromPort: 2049,
            toPort: 2049,
            cidr: vpcCidr,
            description: 'NFS from VPC (EFS mount)',
          },
        ],
        egressRules: [],
      },
      {
        id: 'node-to-efs-sg',
        name: `${namePrefix}-node-to-efs-sg`,
        description: 'Security group for worker nodes to access EFS',
        required: false,
        requiredFor: 'EFS Storage',
        category: 'Storage',
        ingressRules: [],
        egressRules: [
          {
            protocol: 'tcp',
            fromPort: 2049,
            toPort: 2049,
            cidr: vpcCidr,
            description: 'NFS to EFS mount targets',
          },
        ],
      },
      {
        id: 'internal-alb-sg',
        name: `${namePrefix}-internal-alb-sg`,
        description: 'Security group for internal Application Load Balancers',
        required: false,
        requiredFor: 'Internal Services',
        category: 'Networking',
        ingressRules: [
          {
            protocol: 'tcp',
            fromPort: 80,
            toPort: 80,
            cidr: vpcCidr,
            description: 'HTTP from VPC',
          },
          {
            protocol: 'tcp',
            fromPort: 443,
            toPort: 443,
            cidr: vpcCidr,
            description: 'HTTPS from VPC',
          },
        ],
        egressRules: [],
      },
      {
        id: 'external-alb-sg',
        name: `${namePrefix}-external-alb-sg`,
        description: 'Security group for internet-facing Application Load Balancers',
        required: false,
        requiredFor: 'External Services',
        category: 'Networking',
        ingressRules: [
          {
            protocol: 'tcp',
            fromPort: 80,
            toPort: 80,
            cidr: '0.0.0.0/0',
            description: 'HTTP from internet',
          },
          {
            protocol: 'tcp',
            fromPort: 443,
            toPort: 443,
            cidr: '0.0.0.0/0',
            description: 'HTTPS from internet',
          },
        ],
        egressRules: [],
      },
    ];
  }

  /**
   * Check status of EKS security groups
   */
  async checkEksSecurityGroups(credentialId, region, vpcId, clusterName) {
    try {
      const credential = await require('../models').Credential.findByPk(credentialId);
      if (!credential) {
        throw new Error('Credential not found');
      }

      const decrypted = this.getDecryptedCredentialData(credential);
      const env = {
        ...process.env,
        AWS_ACCESS_KEY_ID: decrypted.accessKeyId,
        AWS_SECRET_ACCESS_KEY: decrypted.secretAccessKey,
        AWS_DEFAULT_REGION: region || decrypted.region,
      };

      // Get VPC CIDR
      let vpcCidr = '10.0.0.0/16';
      if (vpcId) {
        try {
          const { stdout: vpcOutput } = await execAsync(
            `aws ec2 describe-vpcs --vpc-ids ${vpcId} --query 'Vpcs[0].CidrBlock' --output text`,
            { env }
          );
          vpcCidr = vpcOutput.trim();
        } catch (e) {
          logger.warn('Could not get VPC CIDR, using default');
        }
      }

      const requiredSgs = this.getRequiredEksSecurityGroups(clusterName, vpcCidr);
      const sgStatuses = [];

      // Get all security groups in VPC
      const existingSgs = await this.getSecurityGroups(credentialId, region, vpcId);

      for (const sgConfig of requiredSgs) {
        const existing = existingSgs.find(sg => sg.groupName === sgConfig.name);
        
        if (existing) {
          sgStatuses.push({
            ...sgConfig,
            status: 'exists',
            groupId: existing.groupId,
            vpcId: existing.vpcId,
            inboundRulesCount: existing.inboundRules.length,
            outboundRulesCount: existing.outboundRules.length,
          });
        } else {
          sgStatuses.push({
            ...sgConfig,
            status: 'missing',
            groupId: null,
          });
        }
      }

      const allRequiredExist = sgStatuses
        .filter(sg => sg.required)
        .every(sg => sg.status === 'exists');

      return {
        securityGroups: sgStatuses,
        existingSecurityGroups: existingSgs,
        summary: {
          total: sgStatuses.length,
          existing: sgStatuses.filter(sg => sg.status === 'exists').length,
          missing: sgStatuses.filter(sg => sg.status === 'missing').length,
          allRequiredExist,
          ready: allRequiredExist,
        },
      };
    } catch (error) {
      logger.error('Failed to check EKS security groups:', error);
      throw new Error(`Failed to check security groups: ${error.message}`);
    }
  }

  /**
   * Create a single EKS security group
   */
  async createEksSecurityGroup(credentialId, region, vpcId, sgId, clusterName) {
    try {
      const credential = await require('../models').Credential.findByPk(credentialId);
      if (!credential) {
        throw new Error('Credential not found');
      }

      const decrypted = this.getDecryptedCredentialData(credential);
      
      const ec2Client = new EC2Client({
        region: region || decrypted.region,
        credentials: {
          accessKeyId: decrypted.accessKeyId,
          secretAccessKey: decrypted.secretAccessKey,
        },
      });

      // Get VPC CIDR for rules
      const env = {
        ...process.env,
        AWS_ACCESS_KEY_ID: decrypted.accessKeyId,
        AWS_SECRET_ACCESS_KEY: decrypted.secretAccessKey,
        AWS_DEFAULT_REGION: region || decrypted.region,
      };

      let vpcCidr = '10.0.0.0/16';
      if (vpcId) {
        try {
          const { stdout: vpcOutput } = await execAsync(
            `aws ec2 describe-vpcs --vpc-ids ${vpcId} --query 'Vpcs[0].CidrBlock' --output text`,
            { env }
          );
          vpcCidr = vpcOutput.trim();
        } catch (e) {
          logger.warn('Could not get VPC CIDR, using default');
        }
      }

      const requiredSgs = this.getRequiredEksSecurityGroups(clusterName, vpcCidr);
      const sgConfig = requiredSgs.find(sg => sg.id === sgId);
      
      if (!sgConfig) {
        throw new Error(`Unknown security group ID: ${sgId}`);
      }

      // Create security group
      const createCommand = new CreateSecurityGroupCommand({
        GroupName: sgConfig.name,
        Description: sgConfig.description,
        VpcId: vpcId,
        TagSpecifications: [
          {
            ResourceType: 'security-group',
            Tags: [
              { Key: 'Name', Value: sgConfig.name },
              { Key: 'CreatedBy', Value: 'zl-mcdt' },
              { Key: 'Purpose', Value: sgConfig.requiredFor },
            ],
          },
        ],
      });

      const createResponse = await ec2Client.send(createCommand);
      const groupId = createResponse.GroupId;

      logger.info(`Created security group: ${sgConfig.name} (${groupId})`);

      // Add ingress rules
      if (sgConfig.ingressRules && sgConfig.ingressRules.length > 0) {
        const ingressCommand = new AuthorizeSecurityGroupIngressCommand({
          GroupId: groupId,
          IpPermissions: sgConfig.ingressRules.map(rule => ({
            IpProtocol: rule.protocol,
            FromPort: rule.fromPort,
            ToPort: rule.toPort,
            IpRanges: [
              {
                CidrIp: rule.cidr,
                Description: rule.description,
              },
            ],
          })),
        });

        await ec2Client.send(ingressCommand);
        logger.info(`Added ${sgConfig.ingressRules.length} ingress rules to ${sgConfig.name}`);
      }

      return {
        success: true,
        securityGroup: {
          id: sgConfig.id,
          name: sgConfig.name,
          groupId: groupId,
          vpcId: vpcId,
          status: 'created',
        },
      };
    } catch (error) {
      logger.error('Failed to create security group:', error);
      
      if (error.name === 'InvalidGroup.Duplicate') {
        return {
          success: true,
          securityGroup: {
            id: sgId,
            status: 'already_exists',
          },
          message: 'Security group already exists',
        };
      }
      
      throw new Error(`Failed to create security group: ${error.message}`);
    }
  }

  /**
   * Create all required EKS security groups
   */
  async createAllEksSecurityGroups(credentialId, region, vpcId, clusterName, options = {}) {
    const { onlyRequired = true } = options;
    const results = [];
    
    // Get VPC CIDR
    const credential = await require('../models').Credential.findByPk(credentialId);
    const decrypted = this.getDecryptedCredentialData(credential);
    const env = {
      ...process.env,
      AWS_ACCESS_KEY_ID: decrypted.accessKeyId,
      AWS_SECRET_ACCESS_KEY: decrypted.secretAccessKey,
      AWS_DEFAULT_REGION: region || decrypted.region,
    };

    let vpcCidr = '10.0.0.0/16';
    if (vpcId) {
      try {
        const { stdout: vpcOutput } = await execAsync(
          `aws ec2 describe-vpcs --vpc-ids ${vpcId} --query 'Vpcs[0].CidrBlock' --output text`,
          { env }
        );
        vpcCidr = vpcOutput.trim();
      } catch (e) {
        logger.warn('Could not get VPC CIDR, using default');
      }
    }

    const requiredSgs = this.getRequiredEksSecurityGroups(clusterName, vpcCidr);
    const sgsToCreate = onlyRequired 
      ? requiredSgs.filter(sg => sg.required)
      : requiredSgs;

    for (const sgConfig of sgsToCreate) {
      try {
        const result = await this.createEksSecurityGroup(credentialId, region, vpcId, sgConfig.id, clusterName);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          securityGroup: { id: sgConfig.id, name: sgConfig.name },
          error: error.message,
        });
      }
    }

    return {
      results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
      },
    };
  }

  /**
   * Get load balancers in the VPC
   */
  async getLoadBalancers(credentialId, region, vpcId = null) {
    try {
      const credential = await require('../models').Credential.findByPk(credentialId);
      if (!credential) {
        throw new Error('Credential not found');
      }

      const decrypted = this.getDecryptedCredentialData(credential);
      
      const elbClient = new ElasticLoadBalancingV2Client({
        region: region || decrypted.region,
        credentials: {
          accessKeyId: decrypted.accessKeyId,
          secretAccessKey: decrypted.secretAccessKey,
        },
      });

      const command = new DescribeLoadBalancersCommand({});
      const response = await elbClient.send(command);

      let loadBalancers = response.LoadBalancers || [];
      
      // Filter by VPC if specified
      if (vpcId) {
        loadBalancers = loadBalancers.filter(lb => lb.VpcId === vpcId);
      }

      return loadBalancers.map(lb => ({
        arn: lb.LoadBalancerArn,
        name: lb.LoadBalancerName,
        dnsName: lb.DNSName,
        type: lb.Type,
        scheme: lb.Scheme, // 'internet-facing' or 'internal'
        vpcId: lb.VpcId,
        state: lb.State?.Code,
        availabilityZones: lb.AvailabilityZones?.map(az => ({
          zoneName: az.ZoneName,
          subnetId: az.SubnetId,
        })),
        securityGroups: lb.SecurityGroups,
        ipAddressType: lb.IpAddressType,
        createdTime: lb.CreatedTime,
        isInternal: lb.Scheme === 'internal',
        isKubernetesManaged: lb.LoadBalancerName.includes('k8s-') || 
          lb.LoadBalancerName.startsWith('a') && lb.LoadBalancerName.length > 30, // AWS LB Controller naming pattern
      }));
    } catch (error) {
      logger.error('Failed to get load balancers:', error);
      throw new Error(`Failed to get load balancers: ${error.message}`);
    }
  }

  /**
   * Get internal load balancer service templates
   */
  getInternalLoadBalancerTemplates() {
    return {
      'nlb-internal': {
        name: 'Internal Network Load Balancer',
        description: 'Layer 4 load balancer for TCP/UDP traffic within VPC',
        yaml: `apiVersion: v1
kind: Service
metadata:
  name: my-internal-nlb
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
    service.beta.kubernetes.io/aws-load-balancer-internal: "true"
    service.beta.kubernetes.io/aws-load-balancer-scheme: "internal"
spec:
  type: LoadBalancer
  selector:
    app: my-app
  ports:
    - port: 80
      targetPort: 8080
      protocol: TCP`,
      },
      'alb-internal': {
        name: 'Internal Application Load Balancer',
        description: 'Layer 7 load balancer for HTTP/HTTPS traffic within VPC (requires AWS LB Controller)',
        yaml: `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-internal-ingress
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internal
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTP": 80}]'
spec:
  rules:
    - http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-service
                port:
                  number: 80`,
      },
      'nlb-internal-tls': {
        name: 'Internal NLB with TLS',
        description: 'Internal NLB with TLS termination using ACM certificate',
        yaml: `apiVersion: v1
kind: Service
metadata:
  name: my-internal-nlb-tls
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
    service.beta.kubernetes.io/aws-load-balancer-internal: "true"
    service.beta.kubernetes.io/aws-load-balancer-scheme: "internal"
    service.beta.kubernetes.io/aws-load-balancer-ssl-cert: "arn:aws:acm:REGION:ACCOUNT:certificate/CERT-ID"
    service.beta.kubernetes.io/aws-load-balancer-ssl-ports: "443"
spec:
  type: LoadBalancer
  selector:
    app: my-app
  ports:
    - name: https
      port: 443
      targetPort: 8080
      protocol: TCP`,
      },
      'nlb-subnet-specific': {
        name: 'Subnet-Specific Internal NLB',
        description: 'Internal NLB deployed to specific subnets',
        yaml: `apiVersion: v1
kind: Service
metadata:
  name: my-subnet-nlb
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
    service.beta.kubernetes.io/aws-load-balancer-internal: "true"
    service.beta.kubernetes.io/aws-load-balancer-subnets: "subnet-xxxxx,subnet-yyyyy"
spec:
  type: LoadBalancer
  selector:
    app: my-app
  ports:
    - port: 80
      targetPort: 8080
      protocol: TCP`,
      },
      'clb-internal': {
        name: 'Internal Classic Load Balancer',
        description: 'Legacy Classic Load Balancer for internal traffic',
        yaml: `apiVersion: v1
kind: Service
metadata:
  name: my-internal-clb
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-internal: "true"
spec:
  type: LoadBalancer
  selector:
    app: my-app
  ports:
    - port: 80
      targetPort: 8080
      protocol: TCP`,
      },
    };
  }

  /**
   * Get VPC details
   */
  async getVpcDetails(credentialId, region, vpcId) {
    try {
      const credential = await require('../models').Credential.findByPk(credentialId);
      if (!credential) {
        throw new Error('Credential not found');
      }

      const decrypted = this.getDecryptedCredentialData(credential);
      
      const ec2Client = new EC2Client({
        region: region || decrypted.region,
        credentials: {
          accessKeyId: decrypted.accessKeyId,
          secretAccessKey: decrypted.secretAccessKey,
        },
      });

      const command = new DescribeVpcsCommand({
        VpcIds: [vpcId],
      });

      const response = await ec2Client.send(command);
      const vpc = response.Vpcs[0];

      if (!vpc) {
        throw new Error(`VPC ${vpcId} not found`);
      }

      const tags = {};
      (vpc.Tags || []).forEach(tag => {
        tags[tag.Key] = tag.Value;
      });

      return {
        vpcId: vpc.VpcId,
        cidrBlock: vpc.CidrBlock,
        state: vpc.State,
        isDefault: vpc.IsDefault,
        tags,
        name: tags.Name || vpc.VpcId,
        dhcpOptionsId: vpc.DhcpOptionsId,
        instanceTenancy: vpc.InstanceTenancy,
      };
    } catch (error) {
      logger.error('Failed to get VPC details:', error);
      throw new Error(`Failed to get VPC details: ${error.message}`);
    }
  }

  /**
   * Get EC2 instances (for SSM target selection)
   * @param {string} credentialId - Credential ID
   * @param {string} region - AWS region
   * @param {object} options - Filter options (vpcId, filters)
   * @returns {Array} List of EC2 instances
   */
  async getEC2Instances(credentialId, region, options = {}) {
    try {
      const credential = await require('../models').Credential.findByPk(credentialId);
      if (!credential) {
        throw new Error('Credential not found');
      }

      const decrypted = this.getDecryptedCredentialData(credential);
      
      const ec2Client = new EC2Client({
        region: region || decrypted.region,
        credentials: {
          accessKeyId: decrypted.accessKeyId,
          secretAccessKey: decrypted.secretAccessKey,
        },
      });

      // Build filters
      const filters = [];
      
      // Filter by VPC if specified
      if (options.vpcId) {
        filters.push({
          Name: 'vpc-id',
          Values: [options.vpcId],
        });
      }

      // Parse filter string (e.g., 'running,ssm-enabled')
      const filterStr = options.filters || '';
      if (filterStr.includes('running')) {
        filters.push({
          Name: 'instance-state-name',
          Values: ['running'],
        });
      }

      const command = new DescribeInstancesCommand({
        Filters: filters.length > 0 ? filters : undefined,
      });

      const response = await ec2Client.send(command);

      // Flatten reservations into instances
      const instances = [];
      for (const reservation of response.Reservations || []) {
        for (const instance of reservation.Instances || []) {
          const tags = {};
          (instance.Tags || []).forEach(tag => {
            tags[tag.Key] = tag.Value;
          });

          // Check if instance has SSM agent (indicated by IamInstanceProfile or common patterns)
          const hasSSMAgent = !!(
            instance.IamInstanceProfile ||
            tags['aws:ec2:fleet-id'] || // EKS node groups often have this
            tags['eks:nodegroup-name'] ||
            tags['aws:autoscaling:groupName']
          );

          // Skip instances that clearly don't have SSM if filter is set
          if (filterStr.includes('ssm-enabled') && !hasSSMAgent && !instance.IamInstanceProfile) {
            // Still include if we can't determine - SSM status is hard to detect without extra API calls
          }

          instances.push({
            instanceId: instance.InstanceId,
            instanceType: instance.InstanceType,
            state: instance.State?.Name,
            privateIpAddress: instance.PrivateIpAddress,
            publicIpAddress: instance.PublicIpAddress,
            vpcId: instance.VpcId,
            subnetId: instance.SubnetId,
            availabilityZone: instance.Placement?.AvailabilityZone,
            launchTime: instance.LaunchTime,
            platform: instance.Platform || 'linux',
            architecture: instance.Architecture,
            name: tags.Name || instance.InstanceId,
            tags,
            iamInstanceProfile: instance.IamInstanceProfile ? {
              arn: instance.IamInstanceProfile.Arn,
              id: instance.IamInstanceProfile.Id,
            } : null,
            hasSSMAgent,
          });
        }
      }

      // Sort by name
      instances.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

      return instances;
    } catch (error) {
      logger.error('Failed to get EC2 instances:', error);
      throw new Error(`Failed to get EC2 instances: ${error.message}`);
    }
  }

  /**
   * List all VPCs in a region
   */
  async listVpcs(credentialId, region) {
    try {
      const credential = await require('../models').Credential.findByPk(credentialId);
      if (!credential) {
        throw new Error('Credential not found');
      }

      const decrypted = this.getDecryptedCredentialData(credential);
      
      const ec2Client = new EC2Client({
        region: region || decrypted.region,
        credentials: {
          accessKeyId: decrypted.accessKeyId,
          secretAccessKey: decrypted.secretAccessKey,
        },
      });

      const command = new DescribeVpcsCommand({});
      const response = await ec2Client.send(command);

      return (response.Vpcs || []).map(vpc => {
        const tags = {};
        (vpc.Tags || []).forEach(tag => {
          tags[tag.Key] = tag.Value;
        });

        return {
          vpcId: vpc.VpcId,
          cidrBlock: vpc.CidrBlock,
          state: vpc.State,
          isDefault: vpc.IsDefault,
          tags,
          name: tags.Name || vpc.VpcId,
        };
      });
    } catch (error) {
      logger.error('Failed to list VPCs:', error);
      throw new Error(`Failed to list VPCs: ${error.message}`);
    }
  }

  // ==========================================
  // PHASE 4: OPERATIONS ENHANCEMENTS
  // ==========================================

  /**
   * Get ConfigMaps in a namespace
   */
  async getConfigMaps(namespace = 'default') {
    try {
      const result = await this.executeKubectl(`get configmaps -n ${namespace} -o json`);
      const data = JSON.parse(result);
      
      return (data.items || []).map(cm => ({
        name: cm.metadata.name,
        namespace: cm.metadata.namespace,
        dataKeys: Object.keys(cm.data || {}),
        dataCount: Object.keys(cm.data || {}).length,
        binaryDataCount: Object.keys(cm.binaryData || {}).length,
        createdAt: cm.metadata.creationTimestamp,
        labels: cm.metadata.labels || {},
        annotations: cm.metadata.annotations || {},
      }));
    } catch (error) {
      logger.error('Failed to get ConfigMaps:', error);
      throw new Error(`Failed to get ConfigMaps: ${error.message}`);
    }
  }

  /**
   * Get ConfigMap details
   */
  async getConfigMapDetails(name, namespace = 'default') {
    try {
      const result = await this.executeKubectl(`get configmap ${name} -n ${namespace} -o json`);
      const cm = JSON.parse(result);
      
      return {
        name: cm.metadata.name,
        namespace: cm.metadata.namespace,
        data: cm.data || {},
        binaryData: cm.binaryData ? Object.keys(cm.binaryData) : [],
        createdAt: cm.metadata.creationTimestamp,
        labels: cm.metadata.labels || {},
        annotations: cm.metadata.annotations || {},
        resourceVersion: cm.metadata.resourceVersion,
      };
    } catch (error) {
      logger.error('Failed to get ConfigMap details:', error);
      throw new Error(`Failed to get ConfigMap details: ${error.message}`);
    }
  }

  /**
   * Create a ConfigMap
   */
  async createConfigMap(name, namespace, data, labels = {}) {
    try {
      const manifest = {
        apiVersion: 'v1',
        kind: 'ConfigMap',
        metadata: {
          name,
          namespace,
          labels,
        },
        data,
      };

      const yaml = JSON.stringify(manifest);
      const result = await this.executeKubectl(`apply -f - <<EOF
${JSON.stringify(manifest, null, 2)}
EOF`);
      
      return { success: true, message: `ConfigMap ${name} created in ${namespace}` };
    } catch (error) {
      logger.error('Failed to create ConfigMap:', error);
      throw new Error(`Failed to create ConfigMap: ${error.message}`);
    }
  }

  /**
   * Update ConfigMap data
   */
  async updateConfigMap(name, namespace, data) {
    try {
      // Get existing ConfigMap
      const existing = await this.getConfigMapDetails(name, namespace);
      
      const manifest = {
        apiVersion: 'v1',
        kind: 'ConfigMap',
        metadata: {
          name,
          namespace,
          labels: existing.labels,
          annotations: existing.annotations,
        },
        data: { ...existing.data, ...data },
      };

      await this.executeKubectl(`apply -f - <<EOF
${JSON.stringify(manifest, null, 2)}
EOF`);
      
      return { success: true, message: `ConfigMap ${name} updated` };
    } catch (error) {
      logger.error('Failed to update ConfigMap:', error);
      throw new Error(`Failed to update ConfigMap: ${error.message}`);
    }
  }

  /**
   * Delete a ConfigMap
   */
  async deleteConfigMap(name, namespace) {
    try {
      await this.executeKubectl(`delete configmap ${name} -n ${namespace}`);
      return { success: true, message: `ConfigMap ${name} deleted from ${namespace}` };
    } catch (error) {
      logger.error('Failed to delete ConfigMap:', error);
      throw new Error(`Failed to delete ConfigMap: ${error.message}`);
    }
  }

  /**
   * Get Secrets in a namespace (metadata only, values masked)
   */
  async getSecrets(namespace = 'default') {
    try {
      const result = await this.executeKubectl(`get secrets -n ${namespace} -o json`);
      const data = JSON.parse(result);
      
      return (data.items || []).map(secret => ({
        name: secret.metadata.name,
        namespace: secret.metadata.namespace,
        type: secret.type,
        dataKeys: Object.keys(secret.data || {}),
        dataCount: Object.keys(secret.data || {}).length,
        createdAt: secret.metadata.creationTimestamp,
        labels: secret.metadata.labels || {},
        annotations: secret.metadata.annotations || {},
      }));
    } catch (error) {
      logger.error('Failed to get Secrets:', error);
      throw new Error(`Failed to get Secrets: ${error.message}`);
    }
  }

  /**
   * Get Secret details (values masked by default)
   */
  async getSecretDetails(name, namespace = 'default', showValues = false) {
    try {
      const result = await this.executeKubectl(`get secret ${name} -n ${namespace} -o json`);
      const secret = JSON.parse(result);
      
      let data = {};
      if (secret.data) {
        for (const [key, value] of Object.entries(secret.data)) {
          if (showValues) {
            // Decode base64
            data[key] = Buffer.from(value, 'base64').toString('utf-8');
          } else {
            // Mask value but show length
            const decoded = Buffer.from(value, 'base64').toString('utf-8');
            data[key] = `${'*'.repeat(Math.min(decoded.length, 20))} (${decoded.length} chars)`;
          }
        }
      }
      
      return {
        name: secret.metadata.name,
        namespace: secret.metadata.namespace,
        type: secret.type,
        data,
        dataKeys: Object.keys(secret.data || {}),
        createdAt: secret.metadata.creationTimestamp,
        labels: secret.metadata.labels || {},
        annotations: secret.metadata.annotations || {},
        resourceVersion: secret.metadata.resourceVersion,
      };
    } catch (error) {
      logger.error('Failed to get Secret details:', error);
      throw new Error(`Failed to get Secret details: ${error.message}`);
    }
  }

  /**
   * Create a Secret
   */
  async createSecret(name, namespace, data, type = 'Opaque', labels = {}) {
    try {
      // Base64 encode values
      const encodedData = {};
      for (const [key, value] of Object.entries(data)) {
        encodedData[key] = Buffer.from(value).toString('base64');
      }

      const manifest = {
        apiVersion: 'v1',
        kind: 'Secret',
        metadata: {
          name,
          namespace,
          labels,
        },
        type,
        data: encodedData,
      };

      await this.executeKubectl(`apply -f - <<EOF
${JSON.stringify(manifest, null, 2)}
EOF`);
      
      return { success: true, message: `Secret ${name} created in ${namespace}` };
    } catch (error) {
      logger.error('Failed to create Secret:', error);
      throw new Error(`Failed to create Secret: ${error.message}`);
    }
  }

  /**
   * Delete a Secret
   */
  async deleteSecret(name, namespace) {
    try {
      await this.executeKubectl(`delete secret ${name} -n ${namespace}`);
      return { success: true, message: `Secret ${name} deleted from ${namespace}` };
    } catch (error) {
      logger.error('Failed to delete Secret:', error);
      throw new Error(`Failed to delete Secret: ${error.message}`);
    }
  }

  /**
   * Check if Metrics Server is installed
   */
  async checkMetricsServer() {
    try {
      const result = await this.executeKubectl('get deployment metrics-server -n kube-system -o json');
      const deployment = JSON.parse(result);
      
      const ready = deployment.status?.readyReplicas === deployment.status?.replicas;
      
      return {
        installed: true,
        ready,
        replicas: deployment.status?.replicas || 0,
        readyReplicas: deployment.status?.readyReplicas || 0,
        image: deployment.spec?.template?.spec?.containers?.[0]?.image,
      };
    } catch (error) {
      if (error.message.includes('not found')) {
        return { installed: false, ready: false };
      }
      throw error;
    }
  }

  /**
   * Install Metrics Server
   */
  async installMetricsServer() {
    try {
      // Apply the official metrics-server manifest
      const manifestUrl = 'https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml';
      await this.executeKubectl(`apply -f ${manifestUrl}`);
      
      return { 
        success: true, 
        message: 'Metrics Server installation initiated. It may take a few minutes to become ready.' 
      };
    } catch (error) {
      logger.error('Failed to install Metrics Server:', error);
      throw new Error(`Failed to install Metrics Server: ${error.message}`);
    }
  }

  /**
   * Get node resource usage (requires metrics-server)
   */
  async getNodeMetrics() {
    try {
      const result = await this.executeKubectl('top nodes --no-headers');
      const lines = result.trim().split('\n').filter(l => l.trim());
      
      return lines.map(line => {
        const parts = line.trim().split(/\s+/);
        return {
          name: parts[0],
          cpuUsage: parts[1],
          cpuPercent: parts[2],
          memoryUsage: parts[3],
          memoryPercent: parts[4],
        };
      });
    } catch (error) {
      if (error.message.includes('Metrics API not available') || error.message.includes('metrics')) {
        return { error: 'Metrics Server not installed or not ready' };
      }
      logger.error('Failed to get node metrics:', error);
      throw new Error(`Failed to get node metrics: ${error.message}`);
    }
  }

  /**
   * Get pod resource usage (requires metrics-server)
   */
  async getPodMetrics(namespace = 'default') {
    try {
      const nsFlag = namespace === 'all' ? '--all-namespaces' : `-n ${namespace}`;
      const result = await this.executeKubectl(`top pods ${nsFlag} --no-headers`);
      const lines = result.trim().split('\n').filter(l => l.trim());
      
      return lines.map(line => {
        const parts = line.trim().split(/\s+/);
        if (namespace === 'all') {
          return {
            namespace: parts[0],
            name: parts[1],
            cpuUsage: parts[2],
            memoryUsage: parts[3],
          };
        }
        return {
          namespace,
          name: parts[0],
          cpuUsage: parts[1],
          memoryUsage: parts[2],
        };
      });
    } catch (error) {
      if (error.message.includes('Metrics API not available') || error.message.includes('metrics')) {
        return { error: 'Metrics Server not installed or not ready' };
      }
      logger.error('Failed to get pod metrics:', error);
      throw new Error(`Failed to get pod metrics: ${error.message}`);
    }
  }

  /**
   * Check Cluster Autoscaler status
   */
  async checkClusterAutoscaler() {
    try {
      const result = await this.executeKubectl('get deployment cluster-autoscaler -n kube-system -o json');
      const deployment = JSON.parse(result);
      
      const ready = deployment.status?.readyReplicas === deployment.status?.replicas;
      
      return {
        installed: true,
        ready,
        replicas: deployment.status?.replicas || 0,
        readyReplicas: deployment.status?.readyReplicas || 0,
        image: deployment.spec?.template?.spec?.containers?.[0]?.image,
      };
    } catch (error) {
      if (error.message.includes('not found')) {
        return { installed: false, ready: false };
      }
      throw error;
    }
  }

  /**
   * Get Cluster Autoscaler deployment manifest
   */
  getClusterAutoscalerManifest(clusterName, region, minNodes = 1, maxNodes = 10) {
    return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: cluster-autoscaler
  namespace: kube-system
  labels:
    app: cluster-autoscaler
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cluster-autoscaler
  template:
    metadata:
      labels:
        app: cluster-autoscaler
      annotations:
        prometheus.io/scrape: 'true'
        prometheus.io/port: '8085'
    spec:
      serviceAccountName: cluster-autoscaler
      containers:
        - image: registry.k8s.io/autoscaling/cluster-autoscaler:v1.28.0
          name: cluster-autoscaler
          resources:
            limits:
              cpu: 100m
              memory: 600Mi
            requests:
              cpu: 100m
              memory: 600Mi
          command:
            - ./cluster-autoscaler
            - --v=4
            - --stderrthreshold=info
            - --cloud-provider=aws
            - --skip-nodes-with-local-storage=false
            - --expander=least-waste
            - --node-group-auto-discovery=asg:tag=k8s.io/cluster-autoscaler/enabled,k8s.io/cluster-autoscaler/${clusterName}
            - --balance-similar-node-groups
            - --skip-nodes-with-system-pods=false
          volumeMounts:
            - name: ssl-certs
              mountPath: /etc/ssl/certs/ca-certificates.crt
              readOnly: true
          imagePullPolicy: Always
      volumes:
        - name: ssl-certs
          hostPath:
            path: /etc/ssl/certs/ca-bundle.crt
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: cluster-autoscaler
  namespace: kube-system
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::ACCOUNT_ID:role/ClusterAutoscalerRole
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: cluster-autoscaler
rules:
  - apiGroups: [""]
    resources: ["events", "endpoints"]
    verbs: ["create", "patch"]
  - apiGroups: [""]
    resources: ["pods/eviction"]
    verbs: ["create"]
  - apiGroups: [""]
    resources: ["pods/status"]
    verbs: ["update"]
  - apiGroups: [""]
    resources: ["endpoints"]
    resourceNames: ["cluster-autoscaler"]
    verbs: ["get", "update"]
  - apiGroups: [""]
    resources: ["nodes"]
    verbs: ["watch", "list", "get", "update"]
  - apiGroups: [""]
    resources: ["namespaces", "pods", "services", "replicationcontrollers", "persistentvolumeclaims", "persistentvolumes"]
    verbs: ["watch", "list", "get"]
  - apiGroups: ["extensions"]
    resources: ["replicasets", "daemonsets"]
    verbs: ["watch", "list", "get"]
  - apiGroups: ["policy"]
    resources: ["poddisruptionbudgets"]
    verbs: ["watch", "list"]
  - apiGroups: ["apps"]
    resources: ["statefulsets", "replicasets", "daemonsets"]
    verbs: ["watch", "list", "get"]
  - apiGroups: ["storage.k8s.io"]
    resources: ["storageclasses", "csinodes", "csidrivers", "csistoragecapacities"]
    verbs: ["watch", "list", "get"]
  - apiGroups: ["batch", "extensions"]
    resources: ["jobs"]
    verbs: ["get", "list", "watch", "patch"]
  - apiGroups: ["coordination.k8s.io"]
    resources: ["leases"]
    verbs: ["create"]
  - apiGroups: ["coordination.k8s.io"]
    resourceNames: ["cluster-autoscaler"]
    resources: ["leases"]
    verbs: ["get", "update"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: cluster-autoscaler
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-autoscaler
subjects:
  - kind: ServiceAccount
    name: cluster-autoscaler
    namespace: kube-system`;
  }

  /**
   * Install Cluster Autoscaler
   */
  async installClusterAutoscaler(clusterName, region) {
    try {
      const manifest = this.getClusterAutoscalerManifest(clusterName, region);
      
      await this.executeKubectl(`apply -f - <<EOF
${manifest}
EOF`);
      
      return { 
        success: true, 
        message: 'Cluster Autoscaler installation initiated. Note: You need to create an IAM role with the appropriate permissions and update the ServiceAccount annotation.',
        iamPolicyRequired: true,
      };
    } catch (error) {
      logger.error('Failed to install Cluster Autoscaler:', error);
      throw new Error(`Failed to install Cluster Autoscaler: ${error.message}`);
    }
  }

  /**
   * Get Cluster Autoscaler IAM policy
   */
  getClusterAutoscalerIAMPolicy() {
    return {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: [
            'autoscaling:DescribeAutoScalingGroups',
            'autoscaling:DescribeAutoScalingInstances',
            'autoscaling:DescribeLaunchConfigurations',
            'autoscaling:DescribeScalingActivities',
            'autoscaling:DescribeTags',
            'ec2:DescribeImages',
            'ec2:DescribeInstanceTypes',
            'ec2:DescribeLaunchTemplateVersions',
            'ec2:GetInstanceTypesFromInstanceRequirements',
            'eks:DescribeNodegroup',
          ],
          Resource: ['*'],
        },
        {
          Effect: 'Allow',
          Action: [
            'autoscaling:SetDesiredCapacity',
            'autoscaling:TerminateInstanceInAutoScalingGroup',
          ],
          Resource: ['*'],
          Condition: {
            StringEquals: {
              'aws:ResourceTag/k8s.io/cluster-autoscaler/enabled': 'true',
            },
          },
        },
      ],
    };
  }

  /**
   * Get failed/problematic pods
   */
  async getProblematicPods(namespace = 'all') {
    try {
      const nsFlag = namespace === 'all' ? '--all-namespaces' : `-n ${namespace}`;
      const result = await this.executeKubectl(`get pods ${nsFlag} -o json`);
      const data = JSON.parse(result);
      
      const problematic = [];
      
      for (const pod of data.items || []) {
        const status = pod.status?.phase;
        const containerStatuses = pod.status?.containerStatuses || [];
        
        let issue = null;
        let restartCount = 0;
        
        // Check for CrashLoopBackOff or Error states
        for (const cs of containerStatuses) {
          restartCount += cs.restartCount || 0;
          
          if (cs.state?.waiting?.reason === 'CrashLoopBackOff') {
            issue = 'CrashLoopBackOff';
          } else if (cs.state?.waiting?.reason === 'ImagePullBackOff') {
            issue = 'ImagePullBackOff';
          } else if (cs.state?.waiting?.reason === 'ErrImagePull') {
            issue = 'ErrImagePull';
          } else if (cs.state?.terminated?.reason === 'Error') {
            issue = 'Error';
          } else if (cs.state?.terminated?.reason === 'OOMKilled') {
            issue = 'OOMKilled';
          }
        }
        
        // Check pending pods
        if (status === 'Pending') {
          const conditions = pod.status?.conditions || [];
          const unschedulable = conditions.find(c => c.type === 'PodScheduled' && c.status === 'False');
          if (unschedulable) {
            issue = 'Unschedulable';
          } else {
            issue = 'Pending';
          }
        }
        
        // Check failed pods
        if (status === 'Failed') {
          issue = pod.status?.reason || 'Failed';
        }
        
        if (issue || restartCount > 5) {
          problematic.push({
            name: pod.metadata.name,
            namespace: pod.metadata.namespace,
            status,
            issue: issue || `High Restarts (${restartCount})`,
            restartCount,
            age: pod.metadata.creationTimestamp,
            nodeName: pod.spec?.nodeName,
            reason: pod.status?.reason,
            message: pod.status?.message,
          });
        }
      }
      
      return problematic;
    } catch (error) {
      logger.error('Failed to get problematic pods:', error);
      throw new Error(`Failed to get problematic pods: ${error.message}`);
    }
  }

  /**
   * Delete multiple pods (bulk cleanup)
   */
  async bulkDeletePods(pods) {
    try {
      const results = [];
      
      for (const pod of pods) {
        try {
          await this.executeKubectl(`delete pod ${pod.name} -n ${pod.namespace} --force --grace-period=0`);
          results.push({ name: pod.name, namespace: pod.namespace, success: true });
        } catch (err) {
          results.push({ name: pod.name, namespace: pod.namespace, success: false, error: err.message });
        }
      }
      
      const successCount = results.filter(r => r.success).length;
      return { 
        success: true, 
        message: `Deleted ${successCount}/${pods.length} pods`,
        results 
      };
    } catch (error) {
      logger.error('Failed to bulk delete pods:', error);
      throw new Error(`Failed to bulk delete pods: ${error.message}`);
    }
  }

  /**
   * Get node health status
   */
  async getNodeHealth() {
    try {
      const result = await this.executeKubectl('get nodes -o json');
      const data = JSON.parse(result);
      
      return (data.items || []).map(node => {
        const conditions = node.status?.conditions || [];
        
        const conditionMap = {};
        for (const c of conditions) {
          conditionMap[c.type] = {
            status: c.status,
            reason: c.reason,
            message: c.message,
            lastTransitionTime: c.lastTransitionTime,
          };
        }
        
        const issues = [];
        if (conditionMap.MemoryPressure?.status === 'True') issues.push('MemoryPressure');
        if (conditionMap.DiskPressure?.status === 'True') issues.push('DiskPressure');
        if (conditionMap.PIDPressure?.status === 'True') issues.push('PIDPressure');
        if (conditionMap.NetworkUnavailable?.status === 'True') issues.push('NetworkUnavailable');
        if (conditionMap.Ready?.status !== 'True') issues.push('NotReady');
        
        return {
          name: node.metadata.name,
          ready: conditionMap.Ready?.status === 'True',
          conditions: conditionMap,
          issues,
          healthy: issues.length === 0,
          labels: node.metadata.labels || {},
          capacity: node.status?.capacity,
          allocatable: node.status?.allocatable,
          nodeInfo: {
            kubeletVersion: node.status?.nodeInfo?.kubeletVersion,
            osImage: node.status?.nodeInfo?.osImage,
            containerRuntime: node.status?.nodeInfo?.containerRuntimeVersion,
            architecture: node.status?.nodeInfo?.architecture,
          },
        };
      });
    } catch (error) {
      logger.error('Failed to get node health:', error);
      throw new Error(`Failed to get node health: ${error.message}`);
    }
  }

  /**
   * Get troubleshooting checklist based on issue type
   */
  getTroubleshootingChecklist(issueType) {
    const checklists = {
      'pod-not-starting': [
        { step: 1, title: 'Check Pod Events', command: 'kubectl describe pod <pod-name> -n <namespace>', description: 'Look for scheduling, image pull, or resource issues' },
        { step: 2, title: 'Check Pod Logs', command: 'kubectl logs <pod-name> -n <namespace>', description: 'Review application logs for errors' },
        { step: 3, title: 'Check Node Resources', command: 'kubectl describe node <node-name>', description: 'Verify node has sufficient CPU/memory' },
        { step: 4, title: 'Check Image Pull', command: 'kubectl get events -n <namespace> --field-selector reason=Failed', description: 'Look for image pull failures' },
        { step: 5, title: 'Check PVC Status', command: 'kubectl get pvc -n <namespace>', description: 'Ensure PVCs are bound if required' },
        { step: 6, title: 'Check Service Account', command: 'kubectl get sa <sa-name> -n <namespace>', description: 'Verify service account exists' },
        { step: 7, title: 'Check Resource Limits', command: 'kubectl get limitrange,resourcequota -n <namespace>', description: 'Check namespace resource limits' },
      ],
      'service-not-accessible': [
        { step: 1, title: 'Check Service Endpoints', command: 'kubectl get endpoints <service-name> -n <namespace>', description: 'Verify service has endpoints' },
        { step: 2, title: 'Check Pod Labels', command: 'kubectl get pods -n <namespace> --show-labels', description: 'Ensure pod labels match service selector' },
        { step: 3, title: 'Check Service Type', command: 'kubectl get svc <service-name> -n <namespace> -o yaml', description: 'Verify LoadBalancer/NodePort/ClusterIP' },
        { step: 4, title: 'Check Load Balancer', command: 'kubectl describe svc <service-name> -n <namespace>', description: 'Look for LB provisioning events' },
        { step: 5, title: 'Check Security Groups', command: 'aws ec2 describe-security-groups', description: 'Verify inbound rules allow traffic' },
        { step: 6, title: 'Test DNS Resolution', command: 'kubectl run test --rm -it --image=busybox -- nslookup <service-name>', description: 'Verify DNS works inside cluster' },
      ],
      'persistent-volume': [
        { step: 1, title: 'Check PVC Status', command: 'kubectl get pvc -n <namespace>', description: 'Look for Pending PVCs' },
        { step: 2, title: 'Check StorageClass', command: 'kubectl get storageclass', description: 'Verify StorageClass exists and is default' },
        { step: 3, title: 'Check CSI Driver', command: 'kubectl get pods -n kube-system -l app=ebs-csi-controller', description: 'Ensure CSI driver pods are running' },
        { step: 4, title: 'Check PVC Events', command: 'kubectl describe pvc <pvc-name> -n <namespace>', description: 'Look for provisioning errors' },
        { step: 5, title: 'Check Node Affinity', command: 'kubectl get pv -o yaml', description: 'Verify PV node affinity matches pod node' },
      ],
      'node-issues': [
        { step: 1, title: 'Check Node Status', command: 'kubectl get nodes', description: 'Look for NotReady nodes' },
        { step: 2, title: 'Check Node Conditions', command: 'kubectl describe node <node-name>', description: 'Look for DiskPressure, MemoryPressure' },
        { step: 3, title: 'Check Node Resources', command: 'kubectl top nodes', description: 'Review CPU/memory usage' },
        { step: 4, title: 'Check System Pods', command: 'kubectl get pods -n kube-system -o wide', description: 'Ensure system pods are running' },
        { step: 5, title: 'Check EC2 Instance', command: 'aws ec2 describe-instance-status --instance-ids <instance-id>', description: 'Verify EC2 health checks' },
      ],
      'cluster-autoscaler': [
        { step: 1, title: 'Check CA Logs', command: 'kubectl logs -n kube-system -l app=cluster-autoscaler', description: 'Look for scaling decisions/errors' },
        { step: 2, title: 'Check ASG Tags', command: 'aws autoscaling describe-auto-scaling-groups', description: 'Verify k8s.io/cluster-autoscaler tags' },
        { step: 3, title: 'Check CA ConfigMap', command: 'kubectl get configmap cluster-autoscaler-status -n kube-system -o yaml', description: 'Review CA status' },
        { step: 4, title: 'Check Pending Pods', command: 'kubectl get pods --all-namespaces --field-selector=status.phase=Pending', description: 'See what needs scaling' },
        { step: 5, title: 'Check IAM Permissions', command: 'aws iam get-role-policy --role-name ClusterAutoscalerRole', description: 'Verify IAM permissions' },
      ],
    };
    
    return checklists[issueType] || checklists['pod-not-starting'];
  }

  // ==========================================
  // PHASE 5: ADVANCED FEATURES
  // ==========================================

  /**
   * Check if Helm is installed and get version
   */
  async checkHelmStatus() {
    try {
      const result = await this.executeCommand('helm version --short');
      return {
        installed: true,
        version: result.trim(),
      };
    } catch (error) {
      return { installed: false, version: null };
    }
  }

  /**
   * List Helm repositories
   */
  async listHelmRepos() {
    try {
      const result = await this.executeCommand('helm repo list -o json');
      return JSON.parse(result);
    } catch (error) {
      if (error.message.includes('no repositories')) {
        return [];
      }
      throw error;
    }
  }

  /**
   * Add a Helm repository
   */
  async addHelmRepo(name, url, username, password) {
    try {
      let cmd = `helm repo add ${name} ${url}`;
      if (username && password) {
        cmd += ` --username ${username} --password ${password}`;
      }
      await this.executeCommand(cmd);
      await this.executeCommand('helm repo update');
      return { success: true, message: `Repository ${name} added successfully` };
    } catch (error) {
      throw new Error(`Failed to add Helm repository: ${error.message}`);
    }
  }

  /**
   * Remove a Helm repository
   */
  async removeHelmRepo(name) {
    try {
      await this.executeCommand(`helm repo remove ${name}`);
      return { success: true, message: `Repository ${name} removed` };
    } catch (error) {
      throw new Error(`Failed to remove Helm repository: ${error.message}`);
    }
  }

  /**
   * Search Helm charts in a repository
   */
  async searchHelmCharts(keyword = '', repo = '') {
    try {
      await this.executeCommand('helm repo update');
      let searchTerm = keyword || '';
      if (repo) {
        searchTerm = keyword ? `${repo}/${keyword}` : repo;
      }
      const result = await this.executeCommand(`helm search repo ${searchTerm} -o json`);
      return JSON.parse(result);
    } catch (error) {
      if (error.message.includes('no results')) {
        return [];
      }
      throw new Error(`Failed to search Helm charts: ${error.message}`);
    }
  }

  /**
   * Get Helm chart versions
   */
  async getHelmChartVersions(chartName) {
    try {
      const result = await this.executeCommand(`helm search repo ${chartName} --versions -o json`);
      const versions = JSON.parse(result);
      return versions.map(v => ({
        version: v.version,
        appVersion: v.app_version,
        description: v.description
      }));
    } catch (error) {
      throw new Error(`Failed to get chart versions: ${error.message}`);
    }
  }

  /**
   * Get Helm chart information
   */
  async getHelmChartInfo(chartName) {
    try {
      const result = await this.executeCommand(`helm show chart ${chartName}`);
      // Parse YAML output
      const lines = result.split('\n');
      const info = {};
      for (const line of lines) {
        const [key, ...values] = line.split(':');
        if (key && values.length > 0) {
          info[key.trim()] = values.join(':').trim();
        }
      }
      return info;
    } catch (error) {
      throw new Error(`Failed to get chart info: ${error.message}`);
    }
  }

  /**
   * Get Helm chart default values
   */
  async getHelmChartValues(chartName) {
    try {
      const result = await this.executeCommand(`helm show values ${chartName}`);
      return result;
    } catch (error) {
      throw new Error(`Failed to get chart values: ${error.message}`);
    }
  }

  /**
   * List installed Helm releases
   */
  async listHelmReleases(namespace = 'all') {
    try {
      const nsFlag = namespace === 'all' ? '--all-namespaces' : `-n ${namespace}`;
      const result = await this.executeCommand(`helm list ${nsFlag} -o json`);
      return JSON.parse(result) || [];
    } catch (error) {
      throw new Error(`Failed to list Helm releases: ${error.message}`);
    }
  }

  /**
   * Install a Helm chart
   */
  async installHelmChart(releaseName, chartName, namespace, values = {}, options = {}) {
    try {
      let cmd = `helm install ${releaseName} ${chartName} -n ${namespace}`;
      
      if (options.createNamespace) {
        cmd += ' --create-namespace';
      }
      
      if (options.version) {
        cmd += ` --version ${options.version}`;
      }
      
      // Write values to temp file if provided
      if (Object.keys(values).length > 0) {
        const valuesYaml = yaml.dump(values);
        const tempFile = `/tmp/helm-values-${Date.now()}.yaml`;
        await fs.writeFile(tempFile, valuesYaml);
        cmd += ` -f ${tempFile}`;
      }
      
      if (options.wait) {
        cmd += ' --wait';
      }
      
      if (options.timeout) {
        cmd += ` --timeout ${options.timeout}`;
      }

      await this.executeCommand(cmd);
      return { success: true, message: `Release ${releaseName} installed successfully` };
    } catch (error) {
      throw new Error(`Failed to install Helm chart: ${error.message}`);
    }
  }

  /**
   * Upgrade a Helm release
   */
  async upgradeHelmRelease(releaseName, chartName, namespace, values = {}, options = {}) {
    try {
      let cmd = `helm upgrade ${releaseName} ${chartName} -n ${namespace}`;
      
      if (options.version) {
        cmd += ` --version ${options.version}`;
      }
      
      if (Object.keys(values).length > 0) {
        const valuesYaml = yaml.dump(values);
        const tempFile = `/tmp/helm-values-${Date.now()}.yaml`;
        await fs.writeFile(tempFile, valuesYaml);
        cmd += ` -f ${tempFile}`;
      }
      
      if (options.reuseValues) {
        cmd += ' --reuse-values';
      }
      
      if (options.wait) {
        cmd += ' --wait';
      }

      await this.executeCommand(cmd);
      return { success: true, message: `Release ${releaseName} upgraded successfully` };
    } catch (error) {
      throw new Error(`Failed to upgrade Helm release: ${error.message}`);
    }
  }

  /**
   * Rollback a Helm release
   */
  async rollbackHelmRelease(releaseName, revision, namespace) {
    try {
      await this.executeCommand(`helm rollback ${releaseName} ${revision} -n ${namespace}`);
      return { success: true, message: `Release ${releaseName} rolled back to revision ${revision}` };
    } catch (error) {
      throw new Error(`Failed to rollback Helm release: ${error.message}`);
    }
  }

  /**
   * Uninstall a Helm release
   */
  async uninstallHelmRelease(releaseName, namespace) {
    try {
      await this.executeCommand(`helm uninstall ${releaseName} -n ${namespace}`);
      return { success: true, message: `Release ${releaseName} uninstalled` };
    } catch (error) {
      throw new Error(`Failed to uninstall Helm release: ${error.message}`);
    }
  }

  /**
   * Get Helm release history
   */
  async getHelmReleaseHistory(releaseName, namespace) {
    try {
      const result = await this.executeCommand(`helm history ${releaseName} -n ${namespace} -o json`);
      return JSON.parse(result);
    } catch (error) {
      throw new Error(`Failed to get release history: ${error.message}`);
    }
  }

  /**
   * Get popular Helm repository presets
   */
  getHelmRepoPresets() {
    return [
      { name: 'bitnami', url: 'https://charts.bitnami.com/bitnami', description: 'Popular application charts (MySQL, PostgreSQL, Redis, etc.)' },
      { name: 'ingress-nginx', url: 'https://kubernetes.github.io/ingress-nginx', description: 'NGINX Ingress Controller' },
      { name: 'jetstack', url: 'https://charts.jetstack.io', description: 'cert-manager for TLS certificates' },
      { name: 'prometheus-community', url: 'https://prometheus-community.github.io/helm-charts', description: 'Prometheus monitoring stack' },
      { name: 'grafana', url: 'https://grafana.github.io/helm-charts', description: 'Grafana dashboards and Loki' },
      { name: 'aws-ebs-csi-driver', url: 'https://kubernetes-sigs.github.io/aws-ebs-csi-driver', description: 'AWS EBS CSI Driver' },
      { name: 'aws-efs-csi-driver', url: 'https://kubernetes-sigs.github.io/aws-efs-csi-driver', description: 'AWS EFS CSI Driver' },
      { name: 'eks', url: 'https://aws.github.io/eks-charts', description: 'AWS Load Balancer Controller, etc.' },
      { name: 'elastic', url: 'https://helm.elastic.co', description: 'Elasticsearch, Kibana, Filebeat' },
      { name: 'hashicorp', url: 'https://helm.releases.hashicorp.com', description: 'Vault, Consul, Terraform' },
    ];
  }

  /**
   * Get StatefulSet templates
   */
  getStatefulSetTemplates() {
    return {
      'zookeeper': {
        name: 'Apache Zookeeper',
        description: 'Distributed coordination service - 3 node ensemble',
        replicas: 3,
        yaml: `apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: zookeeper
spec:
  serviceName: zookeeper-headless
  replicas: 3
  selector:
    matchLabels:
      app: zookeeper
  template:
    metadata:
      labels:
        app: zookeeper
    spec:
      containers:
      - name: zookeeper
        image: zookeeper:3.8
        ports:
        - containerPort: 2181
          name: client
        - containerPort: 2888
          name: follower
        - containerPort: 3888
          name: election
        env:
        - name: ZOO_MY_ID
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: ZOO_SERVERS
          value: server.1=zookeeper-0.zookeeper-headless:2888:3888;2181 server.2=zookeeper-1.zookeeper-headless:2888:3888;2181 server.3=zookeeper-2.zookeeper-headless:2888:3888;2181
        volumeMounts:
        - name: data
          mountPath: /data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: gp3
      resources:
        requests:
          storage: 10Gi
---
apiVersion: v1
kind: Service
metadata:
  name: zookeeper-headless
spec:
  clusterIP: None
  selector:
    app: zookeeper
  ports:
  - port: 2181
    name: client
  - port: 2888
    name: follower
  - port: 3888
    name: election
---
apiVersion: v1
kind: Service
metadata:
  name: zookeeper
spec:
  selector:
    app: zookeeper
  ports:
  - port: 2181
    name: client`,
      },
      'kafka': {
        name: 'Apache Kafka',
        description: 'Distributed event streaming - 3 broker cluster',
        replicas: 3,
        yaml: `apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: kafka
spec:
  serviceName: kafka-headless
  replicas: 3
  selector:
    matchLabels:
      app: kafka
  template:
    metadata:
      labels:
        app: kafka
    spec:
      containers:
      - name: kafka
        image: bitnami/kafka:3.5
        ports:
        - containerPort: 9092
          name: kafka
        - containerPort: 9093
          name: kafka-internal
        env:
        - name: KAFKA_CFG_ZOOKEEPER_CONNECT
          value: zookeeper:2181
        - name: ALLOW_PLAINTEXT_LISTENER
          value: "yes"
        - name: KAFKA_CFG_LISTENER_SECURITY_PROTOCOL_MAP
          value: PLAINTEXT:PLAINTEXT,INTERNAL:PLAINTEXT
        - name: KAFKA_CFG_LISTENERS
          value: PLAINTEXT://:9092,INTERNAL://:9093
        - name: KAFKA_CFG_ADVERTISED_LISTENERS
          value: PLAINTEXT://$(MY_POD_NAME).kafka-headless:9092,INTERNAL://$(MY_POD_NAME).kafka-headless:9093
        - name: MY_POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        volumeMounts:
        - name: data
          mountPath: /bitnami/kafka
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: gp3
      resources:
        requests:
          storage: 50Gi
---
apiVersion: v1
kind: Service
metadata:
  name: kafka-headless
spec:
  clusterIP: None
  selector:
    app: kafka
  ports:
  - port: 9092
    name: kafka
  - port: 9093
    name: kafka-internal
---
apiVersion: v1
kind: Service
metadata:
  name: kafka
spec:
  selector:
    app: kafka
  ports:
  - port: 9092
    name: kafka`,
      },
      'redis-cluster': {
        name: 'Redis Cluster',
        description: 'In-memory data store with persistence - 3 node cluster',
        replicas: 3,
        yaml: `apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
spec:
  serviceName: redis-headless
  replicas: 3
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        command:
        - redis-server
        - /etc/redis/redis.conf
        ports:
        - containerPort: 6379
          name: redis
        - containerPort: 16379
          name: cluster
        volumeMounts:
        - name: data
          mountPath: /data
        - name: config
          mountPath: /etc/redis
      volumes:
      - name: config
        configMap:
          name: redis-config
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: gp3
      resources:
        requests:
          storage: 10Gi
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: redis-config
data:
  redis.conf: |
    cluster-enabled yes
    cluster-config-file nodes.conf
    cluster-node-timeout 5000
    appendonly yes
    appendfsync everysec
---
apiVersion: v1
kind: Service
metadata:
  name: redis-headless
spec:
  clusterIP: None
  selector:
    app: redis
  ports:
  - port: 6379
    name: redis
  - port: 16379
    name: cluster
---
apiVersion: v1
kind: Service
metadata:
  name: redis
spec:
  selector:
    app: redis
  ports:
  - port: 6379
    name: redis`,
      },
      'postgresql-ha': {
        name: 'PostgreSQL HA',
        description: 'PostgreSQL with streaming replication - primary + replica',
        replicas: 2,
        yaml: `apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgresql
spec:
  serviceName: postgresql-headless
  replicas: 2
  selector:
    matchLabels:
      app: postgresql
  template:
    metadata:
      labels:
        app: postgresql
    spec:
      containers:
      - name: postgresql
        image: postgres:15-alpine
        ports:
        - containerPort: 5432
          name: postgresql
        env:
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: postgresql-secret
              key: username
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgresql-secret
              key: password
        - name: POSTGRES_DB
          value: mydb
        - name: PGDATA
          value: /var/lib/postgresql/data/pgdata
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: gp3
      resources:
        requests:
          storage: 20Gi
---
apiVersion: v1
kind: Service
metadata:
  name: postgresql-headless
spec:
  clusterIP: None
  selector:
    app: postgresql
  ports:
  - port: 5432
    name: postgresql
---
apiVersion: v1
kind: Service
metadata:
  name: postgresql
spec:
  selector:
    app: postgresql
  ports:
  - port: 5432
    name: postgresql
---
apiVersion: v1
kind: Secret
metadata:
  name: postgresql-secret
type: Opaque
stringData:
  username: postgres
  password: changeme`,
      },
      'mongodb-replicaset': {
        name: 'MongoDB ReplicaSet',
        description: 'MongoDB with replica set - 3 node cluster',
        replicas: 3,
        yaml: `apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mongodb
spec:
  serviceName: mongodb-headless
  replicas: 3
  selector:
    matchLabels:
      app: mongodb
  template:
    metadata:
      labels:
        app: mongodb
    spec:
      containers:
      - name: mongodb
        image: mongo:6
        command:
        - mongod
        - --replSet
        - rs0
        - --bind_ip_all
        ports:
        - containerPort: 27017
          name: mongodb
        volumeMounts:
        - name: data
          mountPath: /data/db
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: gp3
      resources:
        requests:
          storage: 20Gi
---
apiVersion: v1
kind: Service
metadata:
  name: mongodb-headless
spec:
  clusterIP: None
  selector:
    app: mongodb
  ports:
  - port: 27017
    name: mongodb
---
apiVersion: v1
kind: Service
metadata:
  name: mongodb
spec:
  selector:
    app: mongodb
  ports:
  - port: 27017
    name: mongodb`,
      },
      'elasticsearch': {
        name: 'Elasticsearch',
        description: 'Search and analytics engine - 3 node cluster',
        replicas: 3,
        yaml: `apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: elasticsearch
spec:
  serviceName: elasticsearch-headless
  replicas: 3
  selector:
    matchLabels:
      app: elasticsearch
  template:
    metadata:
      labels:
        app: elasticsearch
    spec:
      initContainers:
      - name: sysctl
        image: busybox
        command: ["sysctl", "-w", "vm.max_map_count=262144"]
        securityContext:
          privileged: true
      containers:
      - name: elasticsearch
        image: elasticsearch:8.10.2
        ports:
        - containerPort: 9200
          name: http
        - containerPort: 9300
          name: transport
        env:
        - name: cluster.name
          value: elasticsearch-cluster
        - name: node.name
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: discovery.seed_hosts
          value: elasticsearch-headless
        - name: cluster.initial_master_nodes
          value: elasticsearch-0,elasticsearch-1,elasticsearch-2
        - name: ES_JAVA_OPTS
          value: "-Xms512m -Xmx512m"
        - name: xpack.security.enabled
          value: "false"
        volumeMounts:
        - name: data
          mountPath: /usr/share/elasticsearch/data
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: gp3
      resources:
        requests:
          storage: 50Gi
---
apiVersion: v1
kind: Service
metadata:
  name: elasticsearch-headless
spec:
  clusterIP: None
  selector:
    app: elasticsearch
  ports:
  - port: 9200
    name: http
  - port: 9300
    name: transport
---
apiVersion: v1
kind: Service
metadata:
  name: elasticsearch
spec:
  selector:
    app: elasticsearch
  ports:
  - port: 9200
    name: http`,
      },
    };
  }

  /**
   * Create a StatefulSet from template
   * @param {string} name - Name for the StatefulSet
   * @param {string} namespace - Kubernetes namespace
   * @param {string} template - Template key (postgresql, redis, mongodb, etc.)
   * @param {number} replicas - Number of replicas
   * @param {string} storageSize - Storage size (e.g., '10Gi')
   * @param {string} storageClass - Storage class name
   * @param {object} customValues - Additional custom values
   */
  async createStatefulSet(name, namespace, template, replicas = 1, storageSize = '10Gi', storageClass = 'gp3', customValues = {}) {
    try {
      const templates = this.getStatefulSetTemplates();
      const templateDef = templates[template];
      
      if (!templateDef) {
        throw new Error(`Template ${template} not found. Available: ${Object.keys(templates).join(', ')}`);
      }
      
      let yamlContent = templateDef.yaml;
      
      // Apply name customization
      if (name) {
        yamlContent = yamlContent.replace(new RegExp(template, 'g'), name);
      }
      
      // Apply replicas
      if (replicas) {
        yamlContent = yamlContent.replace(/replicas: \d+/g, `replicas: ${replicas}`);
      }
      
      // Apply storage class
      if (storageClass) {
        yamlContent = yamlContent.replace(/storageClassName: \S+/g, `storageClassName: ${storageClass}`);
      }
      
      // Apply storage size
      if (storageSize) {
        yamlContent = yamlContent.replace(/storage: \d+Gi/g, `storage: ${storageSize}`);
      }
      
      // Apply any additional custom values (environment variables, resources, etc.)
      if (customValues.image) {
        yamlContent = yamlContent.replace(/image: [^\n]+/g, `image: ${customValues.image}`);
      }
      
      // Apply the YAML
      await this.executeKubectl(`apply -n ${namespace} -f - <<EOF
${yamlContent}
EOF`);
      
      return { 
        success: true, 
        message: `StatefulSet ${name || template} created in ${namespace}`,
        name: name || template,
        namespace,
        replicas,
        storageSize,
        storageClass
      };
    } catch (error) {
      throw new Error(`Failed to create StatefulSet: ${error.message}`);
    }
  }

  /**
   * Get StatefulSets in a namespace
   * @param {string} namespace - Kubernetes namespace
   * @returns {Promise<Array>} List of StatefulSets
   */
  async getStatefulSets(namespace = 'default') {
    try {
      const output = await this.executeKubectl(`get statefulsets -n ${namespace} -o json`);
      const data = JSON.parse(output);
      
      return (data.items || []).map(sts => ({
        name: sts.metadata.name,
        namespace: sts.metadata.namespace,
        replicas: sts.spec.replicas,
        readyReplicas: sts.status?.readyReplicas || 0,
        currentReplicas: sts.status?.currentReplicas || 0,
        serviceName: sts.spec.serviceName,
        creationTimestamp: sts.metadata.creationTimestamp,
        labels: sts.metadata.labels || {},
        selector: sts.spec.selector?.matchLabels || {},
        volumeClaimTemplates: (sts.spec.volumeClaimTemplates || []).map(vct => ({
          name: vct.metadata.name,
          storageClass: vct.spec.storageClassName,
          accessModes: vct.spec.accessModes,
          storage: vct.spec.resources?.requests?.storage
        }))
      }));
    } catch (error) {
      if (error.message.includes('No resources found')) {
        return [];
      }
      throw new Error(`Failed to get StatefulSets: ${error.message}`);
    }
  }

  /**
   * Get details of a specific StatefulSet
   * @param {string} name - StatefulSet name
   * @param {string} namespace - Kubernetes namespace
   * @returns {Promise<object>} StatefulSet details
   */
  async getStatefulSetDetails(name, namespace = 'default') {
    try {
      const output = await this.executeKubectl(`get statefulset ${name} -n ${namespace} -o json`);
      const sts = JSON.parse(output);
      
      // Get associated pods
      const podSelector = Object.entries(sts.spec.selector?.matchLabels || {})
        .map(([k, v]) => `${k}=${v}`)
        .join(',');
      
      let pods = [];
      if (podSelector) {
        try {
          const podsOutput = await this.executeKubectl(`get pods -n ${namespace} -l ${podSelector} -o json`);
          const podsData = JSON.parse(podsOutput);
          pods = (podsData.items || []).map(pod => ({
            name: pod.metadata.name,
            status: pod.status.phase,
            ready: pod.status.conditions?.find(c => c.type === 'Ready')?.status === 'True',
            restarts: pod.status.containerStatuses?.[0]?.restartCount || 0,
            nodeName: pod.spec.nodeName
          }));
        } catch (e) {
          // Ignore pod fetch errors
        }
      }
      
      // Get associated PVCs
      let pvcs = [];
      try {
        const pvcPrefix = sts.spec.volumeClaimTemplates?.[0]?.metadata?.name;
        if (pvcPrefix) {
          const pvcsOutput = await this.executeKubectl(`get pvc -n ${namespace} -o json`);
          const pvcsData = JSON.parse(pvcsOutput);
          pvcs = (pvcsData.items || [])
            .filter(pvc => pvc.metadata.name.startsWith(`${pvcPrefix}-${name}`))
            .map(pvc => ({
              name: pvc.metadata.name,
              status: pvc.status.phase,
              capacity: pvc.status.capacity?.storage,
              storageClass: pvc.spec.storageClassName,
              volumeName: pvc.spec.volumeName
            }));
        }
      } catch (e) {
        // Ignore PVC fetch errors
      }
      
      return {
        name: sts.metadata.name,
        namespace: sts.metadata.namespace,
        replicas: sts.spec.replicas,
        readyReplicas: sts.status?.readyReplicas || 0,
        currentReplicas: sts.status?.currentReplicas || 0,
        updatedReplicas: sts.status?.updatedReplicas || 0,
        serviceName: sts.spec.serviceName,
        creationTimestamp: sts.metadata.creationTimestamp,
        labels: sts.metadata.labels || {},
        annotations: sts.metadata.annotations || {},
        selector: sts.spec.selector?.matchLabels || {},
        updateStrategy: sts.spec.updateStrategy,
        podManagementPolicy: sts.spec.podManagementPolicy,
        containers: (sts.spec.template.spec.containers || []).map(c => ({
          name: c.name,
          image: c.image,
          ports: c.ports,
          resources: c.resources
        })),
        volumeClaimTemplates: (sts.spec.volumeClaimTemplates || []).map(vct => ({
          name: vct.metadata.name,
          storageClass: vct.spec.storageClassName,
          accessModes: vct.spec.accessModes,
          storage: vct.spec.resources?.requests?.storage
        })),
        pods,
        pvcs,
        conditions: sts.status?.conditions || []
      };
    } catch (error) {
      throw new Error(`Failed to get StatefulSet details: ${error.message}`);
    }
  }

  /**
   * Scale a StatefulSet
   * @param {string} name - StatefulSet name
   * @param {string} namespace - Kubernetes namespace
   * @param {number} replicas - Target replica count
   * @returns {Promise<object>} Scale result
   */
  async scaleStatefulSet(name, namespace = 'default', replicas) {
    try {
      if (replicas < 0) {
        throw new Error('Replicas cannot be negative');
      }
      
      await this.executeKubectl(`scale statefulset ${name} --replicas=${replicas} -n ${namespace}`);
      
      // Wait briefly and get updated status
      await new Promise(resolve => setTimeout(resolve, 1000));
      const output = await this.executeKubectl(`get statefulset ${name} -n ${namespace} -o json`);
      const sts = JSON.parse(output);
      
      return {
        success: true,
        message: `StatefulSet ${name} scaled to ${replicas} replicas`,
        name,
        namespace,
        targetReplicas: replicas,
        currentReplicas: sts.status?.currentReplicas || 0,
        readyReplicas: sts.status?.readyReplicas || 0
      };
    } catch (error) {
      throw new Error(`Failed to scale StatefulSet: ${error.message}`);
    }
  }

  /**
   * Delete a StatefulSet
   * @param {string} name - StatefulSet name
   * @param {string} namespace - Kubernetes namespace
   * @param {boolean} deletePVCs - Whether to also delete associated PVCs
   * @returns {Promise<object>} Delete result
   */
  async deleteStatefulSet(name, namespace = 'default', deletePVCs = false) {
    try {
      let deletedPVCs = [];
      
      // If we need to delete PVCs, first get the VolumeClaimTemplate info
      if (deletePVCs) {
        try {
          const stsOutput = await this.executeKubectl(`get statefulset ${name} -n ${namespace} -o json`);
          const sts = JSON.parse(stsOutput);
          const pvcPrefix = sts.spec.volumeClaimTemplates?.[0]?.metadata?.name;
          const replicas = sts.spec.replicas || 0;
          
          if (pvcPrefix) {
            // Delete PVCs for each replica ordinal
            for (let i = 0; i < replicas; i++) {
              const pvcName = `${pvcPrefix}-${name}-${i}`;
              try {
                await this.executeKubectl(`delete pvc ${pvcName} -n ${namespace} --ignore-not-found`);
                deletedPVCs.push(pvcName);
              } catch (e) {
                // Continue if individual PVC deletion fails
              }
            }
          }
        } catch (e) {
          // Continue with StatefulSet deletion even if PVC lookup fails
        }
      }
      
      // Delete the StatefulSet
      await this.executeKubectl(`delete statefulset ${name} -n ${namespace}`);
      
      return {
        success: true,
        message: `StatefulSet ${name} deleted from ${namespace}`,
        name,
        namespace,
        deletedPVCs,
        pvcsDeletionRequested: deletePVCs
      };
    } catch (error) {
      throw new Error(`Failed to delete StatefulSet: ${error.message}`);
    }
  }

  /**
   * Get bastion host connection guide
   */
  getBastionHostGuide() {
    return {
      windowsBastion: {
        title: 'Windows Bastion Host Setup',
        steps: [
          {
            step: 1,
            title: 'Launch Windows EC2 Instance',
            description: 'Create a Windows Server EC2 instance in a public subnet of your EKS VPC',
            commands: [
              'aws ec2 run-instances --image-id ami-WINDOWS --instance-type t3.medium --subnet-id subnet-xxx --security-group-ids sg-xxx --key-name your-key',
            ],
          },
          {
            step: 2,
            title: 'Configure Security Group',
            description: 'Allow RDP (3389) from your IP and all traffic to EKS VPC CIDR',
            commands: [
              'aws ec2 authorize-security-group-ingress --group-id sg-xxx --protocol tcp --port 3389 --cidr YOUR_IP/32',
              'aws ec2 authorize-security-group-ingress --group-id sg-xxx --protocol all --cidr 10.0.0.0/16',
            ],
          },
          {
            step: 3,
            title: 'Connect via RDP',
            description: 'Use Remote Desktop to connect to the Windows instance',
            commands: [
              'mstsc /v:INSTANCE_PUBLIC_IP',
            ],
          },
          {
            step: 4,
            title: 'Install kubectl on Bastion',
            description: 'Download and configure kubectl',
            commands: [
              'curl -LO "https://dl.k8s.io/release/v1.28.0/bin/windows/amd64/kubectl.exe"',
              'mkdir C:\\kubectl',
              'move kubectl.exe C:\\kubectl\\',
              'setx PATH "%PATH%;C:\\kubectl"',
            ],
          },
          {
            step: 5,
            title: 'Configure AWS CLI & kubeconfig',
            description: 'Setup AWS credentials and update kubeconfig',
            commands: [
              'aws configure',
              'aws eks update-kubeconfig --name CLUSTER_NAME --region REGION',
            ],
          },
          {
            step: 6,
            title: 'Verify Connection',
            description: 'Test kubectl connectivity to the private cluster',
            commands: [
              'kubectl get nodes',
              'kubectl get pods --all-namespaces',
            ],
          },
        ],
      },
      linuxBastion: {
        title: 'Linux Bastion Host Setup',
        steps: [
          {
            step: 1,
            title: 'Launch Linux EC2 Instance',
            description: 'Create an Amazon Linux 2 EC2 instance in a public subnet',
            commands: [
              'aws ec2 run-instances --image-id ami-AMAZON_LINUX_2 --instance-type t3.micro --subnet-id subnet-xxx --security-group-ids sg-xxx --key-name your-key',
            ],
          },
          {
            step: 2,
            title: 'Configure Security Group',
            description: 'Allow SSH (22) from your IP',
            commands: [
              'aws ec2 authorize-security-group-ingress --group-id sg-xxx --protocol tcp --port 22 --cidr YOUR_IP/32',
            ],
          },
          {
            step: 3,
            title: 'Connect via SSH',
            description: 'SSH into the bastion host',
            commands: [
              'ssh -i your-key.pem ec2-user@INSTANCE_PUBLIC_IP',
            ],
          },
          {
            step: 4,
            title: 'Install kubectl',
            description: 'Install kubectl on the bastion',
            commands: [
              'curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"',
              'chmod +x kubectl',
              'sudo mv kubectl /usr/local/bin/',
            ],
          },
          {
            step: 5,
            title: 'Configure kubeconfig',
            description: 'Update kubeconfig for EKS cluster',
            commands: [
              'aws eks update-kubeconfig --name CLUSTER_NAME --region REGION',
            ],
          },
        ],
      },
      sshTunnel: {
        title: 'SSH Tunnel for Local kubectl',
        description: 'Access private cluster API from local machine through SSH tunnel',
        steps: [
          {
            step: 1,
            title: 'Start SSH Tunnel',
            description: 'Create a SOCKS proxy through the bastion',
            commands: [
              'ssh -D 8888 -f -C -q -N -i your-key.pem ec2-user@BASTION_PUBLIC_IP',
            ],
          },
          {
            step: 2,
            title: 'Configure kubectl to use proxy',
            description: 'Set HTTPS_PROXY environment variable',
            commands: [
              'export HTTPS_PROXY=socks5://127.0.0.1:8888',
              'kubectl get nodes',
            ],
          },
        ],
      },
      sessionManager: {
        title: 'AWS Session Manager (No SSH Key Required)',
        description: 'Use SSM Session Manager for secure, keyless access',
        steps: [
          {
            step: 1,
            title: 'Attach IAM Role',
            description: 'Ensure EC2 has SSM managed instance core policy',
            commands: [
              'aws iam attach-role-policy --role-name EC2_ROLE --policy-arn arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore',
            ],
          },
          {
            step: 2,
            title: 'Start Session',
            description: 'Connect using AWS CLI',
            commands: [
              'aws ssm start-session --target INSTANCE_ID --region REGION',
            ],
          },
          {
            step: 3,
            title: 'Port Forwarding (for local kubectl)',
            description: 'Forward EKS API server port',
            commands: [
              'aws ssm start-session --target INSTANCE_ID --document-name AWS-StartPortForwardingSession --parameters "localPortNumber=6443,portNumber=443"',
            ],
          },
        ],
      },
    };
  }

  /**
   * Get kubectl proxy configuration
   */
  getKubectlProxyConfig() {
    return {
      directProxy: {
        title: 'kubectl proxy',
        description: 'Start a local proxy to access the Kubernetes API',
        command: 'kubectl proxy --port=8001',
        accessUrl: 'http://localhost:8001/api/v1/namespaces/default/pods',
      },
      portForward: {
        title: 'Port Forward to Service',
        description: 'Forward local port to a service in the cluster',
        examples: [
          { service: 'dashboard', command: 'kubectl port-forward svc/kubernetes-dashboard 8443:443 -n kubernetes-dashboard' },
          { service: 'prometheus', command: 'kubectl port-forward svc/prometheus-server 9090:80 -n monitoring' },
          { service: 'grafana', command: 'kubectl port-forward svc/grafana 3000:80 -n monitoring' },
        ],
      },
    };
  }

  // ============================================================================
  // PHASE 5: BASTION HOST & SSH HELPERS
  // ============================================================================

  /**
   * Get bastion host setup guide
   */
  getBastionSetupGuide(provider = 'aws', clusterName, region) {
    const guides = {
      aws: {
        title: 'AWS Bastion Host Setup Guide',
        description: 'Set up a bastion host to access private EKS clusters',
        prerequisites: [
          'AWS CLI configured with appropriate permissions',
          'VPC with public and private subnets',
          'EKS cluster with private endpoint enabled',
          'Key pair for SSH access (Linux) or Administrator password (Windows)'
        ],
        steps: [
          {
            step: 1,
            title: 'Create Security Group',
            description: 'Create a security group for the bastion host',
            commands: [
              `aws ec2 create-security-group --group-name bastion-sg --description "Bastion host security group" --vpc-id VPC_ID${region ? ` --region ${region}` : ''}`,
              'aws ec2 authorize-security-group-ingress --group-id sg-xxx --protocol tcp --port 22 --cidr YOUR_IP/32',
              'aws ec2 authorize-security-group-ingress --group-id sg-xxx --protocol tcp --port 3389 --cidr YOUR_IP/32'
            ]
          },
          {
            step: 2,
            title: 'Launch Bastion Instance',
            description: 'Launch an EC2 instance in a public subnet',
            commands: [
              `aws ec2 run-instances --image-id ami-XXXX --instance-type t3.micro --key-name your-key --subnet-id subnet-public --security-group-ids sg-bastion${region ? ` --region ${region}` : ''}`
            ]
          },
          {
            step: 3,
            title: 'Connect to Bastion',
            description: 'SSH (Linux) or RDP (Windows) to the bastion host',
            commands: [
              'ssh -i your-key.pem ec2-user@BASTION_PUBLIC_IP',
              '# For Windows: mstsc /v:BASTION_PUBLIC_IP'
            ]
          },
          {
            step: 4,
            title: 'Install kubectl',
            description: 'Install kubectl on the bastion host',
            commands: [
              'curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"',
              'chmod +x kubectl && sudo mv kubectl /usr/local/bin/'
            ]
          },
          {
            step: 5,
            title: 'Configure kubeconfig',
            description: 'Update kubeconfig to connect to EKS cluster',
            commands: [
              `aws eks update-kubeconfig --name ${clusterName || 'CLUSTER_NAME'}${region ? ` --region ${region}` : ''}`
            ]
          },
          {
            step: 6,
            title: 'Verify Connection',
            description: 'Test kubectl connectivity',
            commands: [
              'kubectl get nodes',
              'kubectl cluster-info'
            ]
          }
        ],
        sshTunnel: `ssh -i your-key.pem -L 6443:${clusterName ? `${clusterName}.eks.amazonaws.com` : 'CLUSTER_ENDPOINT'}:443 -N ec2-user@BASTION_PUBLIC_IP`,
        tips: [
          'Use Session Manager instead of SSH for enhanced security',
          'Consider using a NAT Gateway for outbound internet access from private subnets',
          'Enable VPC Flow Logs for network troubleshooting'
        ]
      },
      azure: {
        title: 'Azure Bastion Host Setup Guide',
        description: 'Set up Azure Bastion to access private AKS clusters',
        prerequisites: [
          'Azure CLI configured',
          'VNet with AzureBastionSubnet',
          'AKS cluster with private endpoint'
        ],
        steps: [
          {
            step: 1,
            title: 'Create Bastion Subnet',
            commands: ['az network vnet subnet create --name AzureBastionSubnet --resource-group RG --vnet-name VNET --address-prefixes 10.0.1.0/26']
          },
          {
            step: 2,
            title: 'Deploy Azure Bastion',
            commands: ['az network bastion create --name MyBastion --resource-group RG --vnet-name VNET --public-ip-address BastionIP']
          },
          {
            step: 3,
            title: 'Connect via Bastion',
            commands: ['# Use Azure Portal to connect via Bastion']
          }
        ],
        sshTunnel: 'az network bastion tunnel --name MyBastion --resource-group RG --target-resource-id VM_ID --resource-port 22 --port 2022',
        tips: ['Azure Bastion provides seamless RDP/SSH without public IPs']
      },
      gcp: {
        title: 'GCP IAP Tunnel Setup Guide',
        description: 'Use Identity-Aware Proxy to access private GKE clusters',
        prerequisites: [
          'gcloud CLI configured',
          'IAP enabled for the project',
          'GKE cluster with private endpoint'
        ],
        steps: [
          {
            step: 1,
            title: 'Enable IAP',
            commands: ['gcloud services enable iap.googleapis.com']
          },
          {
            step: 2,
            title: 'Create Firewall Rule',
            commands: ['gcloud compute firewall-rules create allow-ssh-iap --allow tcp:22 --source-ranges 35.235.240.0/20']
          },
          {
            step: 3,
            title: 'SSH via IAP',
            commands: ['gcloud compute ssh VM_NAME --tunnel-through-iap --zone ZONE']
          }
        ],
        sshTunnel: 'gcloud compute ssh VM_NAME --tunnel-through-iap --zone ZONE -- -L 6443:CLUSTER_ENDPOINT:443 -N',
        tips: ['IAP provides secure access without external IPs']
      }
    };
    
    return guides[provider] || guides.aws;
  }

  /**
   * Generate kubectl proxy configuration
   */
  generateKubectlProxyConfig(clusterEndpoint, port = 8001) {
    return {
      command: `kubectl proxy --port=${port}`,
      endpoint: clusterEndpoint,
      localUrl: `http://localhost:${port}`,
      apiPath: `http://localhost:${port}/api/v1`,
      usage: {
        listPods: `curl http://localhost:${port}/api/v1/namespaces/default/pods`,
        listServices: `curl http://localhost:${port}/api/v1/namespaces/default/services`,
        listNodes: `curl http://localhost:${port}/api/v1/nodes`
      },
      tips: [
        'The proxy runs in the foreground - use a separate terminal or background it',
        'Access the Kubernetes dashboard at /api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/',
        'Use --accept-hosts to allow remote connections (security risk)'
      ]
    };
  }

  /**
   * Generate SSH tunnel command
   */
  generateSSHTunnelCommand(bastionHost, bastionUser = 'ec2-user', clusterEndpoint, localPort = 6443) {
    const host = clusterEndpoint ? clusterEndpoint.replace('https://', '').split(':')[0] : 'CLUSTER_ENDPOINT';
    const remotePort = 443;
    
    return {
      command: `ssh -i ~/.ssh/your-key.pem -L ${localPort}:${host}:${remotePort} -N ${bastionUser}@${bastionHost}`,
      socksProxy: `ssh -D 8888 -f -C -q -N -i ~/.ssh/your-key.pem ${bastionUser}@${bastionHost}`,
      explanation: {
        '-i': 'Path to your SSH private key',
        '-L': `Local port forwarding: localhost:${localPort} -> ${host}:${remotePort}`,
        '-D': 'Dynamic port forwarding (SOCKS proxy)',
        '-N': 'Do not execute remote commands',
        '-f': 'Run in background',
        '-C': 'Enable compression',
        '-q': 'Quiet mode'
      },
      kubeconfigUpdate: `
# After starting the SSH tunnel, update your kubeconfig:
kubectl config set-cluster my-cluster --server=https://localhost:${localPort} --insecure-skip-tls-verify=true

# Or use HTTPS_PROXY with SOCKS proxy:
export HTTPS_PROXY=socks5://127.0.0.1:8888
kubectl get nodes
`,
      tips: [
        'Keep the SSH tunnel running while using kubectl',
        'Use autossh for automatic reconnection',
        'Consider using AWS Session Manager for enhanced security'
      ]
    };
  }

  // ============================================================================
  // PHASE 5: PORT FORWARDING
  // ============================================================================

  /**
   * Start port forwarding
   */
  async startPortForward(resourceType, resourceName, namespace, localPort, remotePort, address = '127.0.0.1') {
    const id = `pf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      let resourcePrefix = '';
      switch (resourceType) {
        case 'pod':
          resourcePrefix = 'pod/';
          break;
        case 'service':
          resourcePrefix = 'svc/';
          break;
        case 'deployment':
          resourcePrefix = 'deploy/';
          break;
        default:
          resourcePrefix = '';
      }
      
      const cmd = `kubectl port-forward ${resourcePrefix}${resourceName} ${localPort}:${remotePort} -n ${namespace} --address=${address}`;
      
      // Start port-forward as a background process
      const process = spawn('kubectl', [
        'port-forward',
        `${resourcePrefix}${resourceName}`,
        `${localPort}:${remotePort}`,
        '-n', namespace,
        `--address=${address}`
      ], {
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe']
      });
      
      // Store the process reference
      if (!this.portForwards) {
        this.portForwards = new Map();
      }
      
      this.portForwards.set(id, {
        id,
        pid: process.pid,
        process,
        resourceType,
        resourceName,
        namespace,
        localPort,
        remotePort,
        address,
        command: cmd,
        startedAt: new Date().toISOString(),
        status: 'active'
      });
      
      // Handle process exit
      process.on('exit', (code) => {
        const pf = this.portForwards.get(id);
        if (pf) {
          pf.status = code === 0 ? 'stopped' : 'failed';
          pf.exitCode = code;
        }
      });
      
      return {
        success: true,
        id,
        message: `Port forward started: localhost:${localPort} -> ${resourceName}:${remotePort}`,
        command: cmd,
        accessUrl: `http://${address}:${localPort}`
      };
    } catch (error) {
      throw new Error(`Failed to start port forward: ${error.message}`);
    }
  }

  /**
   * Stop port forwarding
   */
  async stopPortForward(id) {
    try {
      if (!this.portForwards || !this.portForwards.has(id)) {
        throw new Error(`Port forward ${id} not found`);
      }
      
      const pf = this.portForwards.get(id);
      
      if (pf.process && !pf.process.killed) {
        pf.process.kill('SIGTERM');
      }
      
      // Also try to kill by PID as backup
      if (pf.pid) {
        try {
          process.kill(pf.pid, 'SIGTERM');
        } catch (e) {
          // Process may already be dead
        }
      }
      
      pf.status = 'stopped';
      pf.stoppedAt = new Date().toISOString();
      
      return {
        success: true,
        message: `Port forward ${id} stopped`
      };
    } catch (error) {
      throw new Error(`Failed to stop port forward: ${error.message}`);
    }
  }

  /**
   * List active port forwards
   */
  listActivePortForwards() {
    if (!this.portForwards) {
      return [];
    }
    
    const forwards = [];
    for (const [id, pf] of this.portForwards.entries()) {
      // Check if process is still running
      let isActive = false;
      if (pf.process && !pf.process.killed) {
        try {
          process.kill(pf.pid, 0); // Signal 0 just checks if process exists
          isActive = true;
        } catch (e) {
          isActive = false;
        }
      }
      
      forwards.push({
        id,
        resourceType: pf.resourceType,
        resourceName: pf.resourceName,
        namespace: pf.namespace,
        localPort: pf.localPort,
        remotePort: pf.remotePort,
        address: pf.address,
        status: isActive ? 'active' : 'stopped',
        startedAt: pf.startedAt,
        command: pf.command
      });
    }
    
    return forwards;
  }

  /**
   * Get port forward templates
   */
  getPortForwardTemplates() {
    return [
      {
        name: 'PostgreSQL',
        description: 'Forward PostgreSQL database port',
        resourceType: 'service',
        localPort: 5432,
        remotePort: 5432,
        icon: 'database'
      },
      {
        name: 'MySQL',
        description: 'Forward MySQL database port',
        resourceType: 'service',
        localPort: 3306,
        remotePort: 3306,
        icon: 'database'
      },
      {
        name: 'Redis',
        description: 'Forward Redis cache port',
        resourceType: 'service',
        localPort: 6379,
        remotePort: 6379,
        icon: 'memory'
      },
      {
        name: 'MongoDB',
        description: 'Forward MongoDB port',
        resourceType: 'service',
        localPort: 27017,
        remotePort: 27017,
        icon: 'database'
      },
      {
        name: 'Nginx/HTTP',
        description: 'Forward HTTP web server',
        resourceType: 'service',
        localPort: 8080,
        remotePort: 80,
        icon: 'web'
      },
      {
        name: 'HTTPS',
        description: 'Forward HTTPS port',
        resourceType: 'service',
        localPort: 8443,
        remotePort: 443,
        icon: 'lock'
      },
      {
        name: 'Grafana',
        description: 'Forward Grafana dashboard',
        resourceType: 'service',
        localPort: 3000,
        remotePort: 3000,
        icon: 'dashboard'
      },
      {
        name: 'Prometheus',
        description: 'Forward Prometheus metrics',
        resourceType: 'service',
        localPort: 9090,
        remotePort: 9090,
        icon: 'chart'
      },
      {
        name: 'Elasticsearch',
        description: 'Forward Elasticsearch API',
        resourceType: 'service',
        localPort: 9200,
        remotePort: 9200,
        icon: 'search'
      },
      {
        name: 'Kibana',
        description: 'Forward Kibana dashboard',
        resourceType: 'service',
        localPort: 5601,
        remotePort: 5601,
        icon: 'dashboard'
      },
      {
        name: 'Kafka',
        description: 'Forward Kafka broker',
        resourceType: 'service',
        localPort: 9092,
        remotePort: 9092,
        icon: 'stream'
      },
      {
        name: 'Zookeeper',
        description: 'Forward Zookeeper client port',
        resourceType: 'service',
        localPort: 2181,
        remotePort: 2181,
        icon: 'hub'
      }
    ];
  }

  // ---------------------------------------------------------------------------
  // Phase 6.2 — General command execution & container security scanning
  // ---------------------------------------------------------------------------

  /**
   * Execute a shell command and return stdout/stderr.
   * Thin wrapper around execAsync used by Helm methods and scanner.
   *
   * @param {string} command — shell command to run
   * @param {object} [options] — exec options (timeout, cwd, env, etc.)
   * @returns {{ stdout: string, stderr: string }}
   */
  async executeCommand(command, options = {}) {
    const defaults = { timeout: 120000, maxBuffer: 10 * 1024 * 1024 };
    const merged = { ...defaults, ...options };
    try {
      const { stdout, stderr } = await execAsync(command, merged);
      return { stdout, stderr };
    } catch (error) {
      logger.error(`[ContainerDeploy] Command failed: ${command}`, {
        error: error.message,
        stderr: error.stderr,
      });
      throw error;
    }
  }

  /**
   * Scan a container image for vulnerabilities using Grype.
   * Returns structured scan results.
   *
   * @param {string} imageTag — full image tag (e.g. 123.dkr.ecr.us-east-1.amazonaws.com/repo:v1)
   * @param {object} [opts]
   * @param {string} [opts.severity] — minimum severity filter (critical, high, medium, low)
   * @returns {{ vulnerabilities: Array, summary: object }}
   */
  async scanImage(imageTag, opts = {}) {
    const severity = opts.severity || 'medium';

    // Verify grype is available
    try {
      await this.executeCommand('grype version', { timeout: 10000 });
    } catch (_) {
      throw new Error(
        'Grype CLI is not installed. Install it with: curl -sSfL https://raw.githubusercontent.com/anchore/grype/main/install.sh | sh -s -- -b /usr/local/bin'
      );
    }

    // Run scan — JSON output for structured parsing
    const { stdout } = await this.executeCommand(
      `grype ${imageTag} -o json --fail-on ${severity}`,
      { timeout: 300000 } // image scan can be slow
    ).catch(err => {
      // grype returns non-zero when vulnerabilities exceed threshold —
      // that's an expected case, so still parse the JSON from stdout/stderr
      if (err.stdout) return { stdout: err.stdout };
      throw err;
    });

    let report;
    try {
      report = JSON.parse(stdout);
    } catch (_) {
      return {
        vulnerabilities: [],
        summary: { total: 0, raw: stdout.substring(0, 500) },
        scanTime: new Date().toISOString(),
      };
    }

    const matches = report.matches || [];
    const vulnerabilities = matches.map(m => ({
      id: m.vulnerability?.id,
      severity: m.vulnerability?.severity,
      package: m.artifact?.name,
      version: m.artifact?.version,
      fixedIn: m.vulnerability?.fix?.versions?.[0] || null,
      description: m.vulnerability?.description?.substring(0, 200),
    }));

    const summary = {
      total: vulnerabilities.length,
      critical: vulnerabilities.filter(v => v.severity === 'Critical').length,
      high: vulnerabilities.filter(v => v.severity === 'High').length,
      medium: vulnerabilities.filter(v => v.severity === 'Medium').length,
      low: vulnerabilities.filter(v => v.severity === 'Low').length,
    };

    return {
      imageTag,
      vulnerabilities,
      summary,
      scanTime: new Date().toISOString(),
    };
  }
}

module.exports = new ContainerDeploymentService();
