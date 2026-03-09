/**
 * Local Deployment Service
 * 
 * Handles deploying applications to local Minikube cluster for testing.
 * This is an alternative to cloud-based Terraform deployments.
 */

const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');
const KubernetesManifestGenerator = require('./kubernetesManifestGenerator');
const websocketServer = require('../config/websocketServer');

const execAsync = promisify(exec);

class LocalDeploymentService {
  constructor() {
    this.manifestGenerator = new KubernetesManifestGenerator();
    this.workingDir = process.env.LOCAL_DEPLOYMENT_DIR || '/tmp/zlaws_local_deployments';
  }

  /**
   * Deploy application to local Minikube cluster
   * 
   * @param {Object} deploymentConfig - Deployment configuration from wizard
   * @param {string} deploymentId - Unique deployment identifier
   * @returns {Promise<Object>} Deployment result
   */
  async deploy(deploymentConfig, deploymentId) {
    const startTime = Date.now();
    
    try {
      // Emit deployment started
      this.emitProgress(deploymentId, 'started', 'Starting local deployment', 0);

      // Phase 1: Verify local environment
      await this.verifyEnvironment(deploymentId);

      // Phase 2: Generate Kubernetes manifests
      const manifests = await this.generateManifests(deploymentConfig, deploymentId);

      // Phase 3: Apply manifests to cluster
      const applyResult = await this.applyManifests(manifests, deploymentId);

      // Phase 4: Verify deployment
      const verifyResult = await this.verifyDeployment(deploymentConfig, deploymentId);

      const duration = (Date.now() - startTime) / 1000;
      
      this.emitProgress(deploymentId, 'completed', `Deployment completed in ${duration.toFixed(1)}s`, 100);

      return {
        success: true,
        deploymentId,
        duration,
        manifests: manifests.map(m => m.path),
        resources: applyResult.resources,
        endpoints: verifyResult.endpoints
      };

    } catch (error) {
      logger.error(`Local deployment failed for ${deploymentId}:`, error);
      this.emitProgress(deploymentId, 'failed', error.message, 0);
      
      return {
        success: false,
        deploymentId,
        error: error.message
      };
    }
  }

  /**
   * Verify local environment is ready for deployment
   */
  async verifyEnvironment(deploymentId) {
    this.emitProgress(deploymentId, 'verifying', 'Checking local environment', 5);

    // Check Minikube status
    try {
      const { stdout } = await execAsync('minikube status -o json');
      const status = JSON.parse(stdout);
      
      if (status.Host !== 'Running') {
        throw new Error('Minikube is not running. Start it with: minikube start');
      }
    } catch (error) {
      if (error.message.includes('not running')) {
        throw new Error('Minikube is not running. Start it with: minikube start');
      }
      throw error;
    }

    // Check kubectl context
    try {
      const { stdout } = await execAsync('kubectl config current-context');
      const context = stdout.trim();
      
      if (context !== 'minikube') {
        logger.warn(`kubectl context is '${context}', not minikube. Switching...`);
        await execAsync('kubectl config use-context minikube');
      }
    } catch (error) {
      throw new Error(`kubectl configuration error: ${error.message}`);
    }

    // Create working directory
    await fs.mkdir(this.workingDir, { recursive: true });

    this.emitProgress(deploymentId, 'verified', 'Environment verified', 10);
    logger.info(`Local environment verified for deployment ${deploymentId}`);
  }

  /**
   * Generate Kubernetes manifests from deployment configuration
   */
  async generateManifests(config, deploymentId) {
    this.emitProgress(deploymentId, 'generating', 'Generating Kubernetes manifests', 20);

    const deploymentDir = path.join(this.workingDir, deploymentId);
    await fs.mkdir(deploymentDir, { recursive: true });

    const manifests = [];

    // Generate namespace manifest
    if (config.namespace && config.namespace !== 'default') {
      const namespaceManifest = this.manifestGenerator.generateNamespace(config.namespace);
      const namespacePath = path.join(deploymentDir, '00-namespace.yaml');
      await fs.writeFile(namespacePath, namespaceManifest);
      manifests.push({ type: 'namespace', path: namespacePath });
    }

    // Generate deployment manifest
    const deploymentManifest = this.manifestGenerator.generateDeployment(config);
    const deploymentPath = path.join(deploymentDir, '01-deployment.yaml');
    await fs.writeFile(deploymentPath, deploymentManifest);
    manifests.push({ type: 'deployment', path: deploymentPath });

    // Generate service manifest
    const serviceManifest = this.manifestGenerator.generateService(config);
    const servicePath = path.join(deploymentDir, '02-service.yaml');
    await fs.writeFile(servicePath, serviceManifest);
    manifests.push({ type: 'service', path: servicePath });

    // Generate configmap if config provided
    if (config.configMap) {
      const configMapManifest = this.manifestGenerator.generateConfigMap(config);
      const configMapPath = path.join(deploymentDir, '03-configmap.yaml');
      await fs.writeFile(configMapPath, configMapManifest);
      manifests.push({ type: 'configmap', path: configMapPath });
    }

    // Generate secrets if provided
    if (config.secrets) {
      const secretsManifest = this.manifestGenerator.generateSecret(config);
      const secretsPath = path.join(deploymentDir, '04-secret.yaml');
      await fs.writeFile(secretsPath, secretsManifest);
      manifests.push({ type: 'secret', path: secretsPath });
    }

    // Generate ingress if enabled
    if (config.ingress?.enabled) {
      const ingressManifest = this.manifestGenerator.generateIngress(config);
      const ingressPath = path.join(deploymentDir, '05-ingress.yaml');
      await fs.writeFile(ingressPath, ingressManifest);
      manifests.push({ type: 'ingress', path: ingressPath });
    }

    this.emitProgress(deploymentId, 'generated', `Generated ${manifests.length} manifest(s)`, 40);
    logger.info(`Generated ${manifests.length} manifests for deployment ${deploymentId}`);

    return manifests;
  }

  /**
   * Apply Kubernetes manifests to cluster
   */
  async applyManifests(manifests, deploymentId) {
    this.emitProgress(deploymentId, 'applying', 'Applying manifests to cluster', 50);

    const resources = [];
    const namespace = manifests.find(m => m.type === 'namespace') 
      ? 'custom' 
      : 'default';

    for (let i = 0; i < manifests.length; i++) {
      const manifest = manifests[i];
      const progress = 50 + ((i + 1) / manifests.length) * 30;

      try {
        this.emitProgress(
          deploymentId, 
          'applying', 
          `Applying ${manifest.type}...`, 
          Math.round(progress)
        );

        const { stdout, stderr } = await execAsync(`kubectl apply -f ${manifest.path}`);
        
        // Parse kubectl output to get resource info
        const lines = stdout.trim().split('\n');
        lines.forEach(line => {
          const match = line.match(/^(.+?)\s+(created|configured|unchanged)$/);
          if (match) {
            resources.push({
              resource: match[1],
              status: match[2],
              type: manifest.type
            });
          }
        });

        if (stderr) {
          logger.warn(`Warning applying ${manifest.type}:`, stderr);
        }

      } catch (error) {
        logger.error(`Error applying ${manifest.type}:`, error);
        throw new Error(`Failed to apply ${manifest.type}: ${error.message}`);
      }
    }

    this.emitProgress(deploymentId, 'applied', `Applied ${resources.length} resource(s)`, 80);
    logger.info(`Applied ${resources.length} resources for deployment ${deploymentId}`);

    return { resources };
  }

  /**
   * Verify deployment is running successfully
   */
  async verifyDeployment(config, deploymentId) {
    this.emitProgress(deploymentId, 'verifying', 'Verifying deployment status', 85);

    const namespace = config.namespace || 'default';
    const deploymentName = config.name || config.clusterName;
    const endpoints = [];

    // Wait for deployment to be ready (with timeout)
    const maxAttempts = 30;
    const pollInterval = 2000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const { stdout } = await execAsync(
          `kubectl get deployment ${deploymentName} -n ${namespace} -o json`
        );
        const deployment = JSON.parse(stdout);
        
        const ready = deployment.status?.readyReplicas || 0;
        const desired = deployment.spec?.replicas || 1;

        const progress = 85 + ((attempt / maxAttempts) * 10);
        this.emitProgress(
          deploymentId, 
          'verifying', 
          `Waiting for pods: ${ready}/${desired} ready`, 
          Math.round(progress)
        );

        if (ready >= desired) {
          logger.info(`Deployment ${deploymentName} is ready: ${ready}/${desired} replicas`);
          break;
        }

        await new Promise(resolve => setTimeout(resolve, pollInterval));

      } catch (error) {
        logger.warn(`Attempt ${attempt + 1}/${maxAttempts}: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }

    // Get service endpoint
    try {
      const { stdout } = await execAsync(
        `kubectl get service ${deploymentName} -n ${namespace} -o json`
      );
      const service = JSON.parse(stdout);

      if (service.spec?.type === 'NodePort') {
        const nodePort = service.spec.ports?.[0]?.nodePort;
        const { stdout: minikubeIp } = await execAsync('minikube ip');
        endpoints.push({
          type: 'NodePort',
          url: `http://${minikubeIp.trim()}:${nodePort}`
        });
      } else if (service.spec?.type === 'LoadBalancer') {
        endpoints.push({
          type: 'LoadBalancer',
          note: 'Use "minikube tunnel" to expose LoadBalancer services'
        });
      }
    } catch (error) {
      logger.warn(`Could not get service endpoint: ${error.message}`);
    }

    this.emitProgress(deploymentId, 'verified', 'Deployment verified', 95);

    return { endpoints };
  }

  /**
   * Delete a local deployment
   */
  async delete(deploymentId, namespace = 'default') {
    try {
      logger.info(`Deleting local deployment ${deploymentId}`);

      const deploymentDir = path.join(this.workingDir, deploymentId);
      
      // Check if manifest directory exists
      try {
        await fs.access(deploymentDir);
        
        // Delete resources using saved manifests
        const { stdout } = await execAsync(`kubectl delete -f ${deploymentDir} --ignore-not-found=true`);
        logger.info(`Deleted resources: ${stdout}`);

        // Clean up manifest files
        await fs.rm(deploymentDir, { recursive: true, force: true });

      } catch (error) {
        // Directory doesn't exist, try to delete by name
        logger.warn(`No manifests found for ${deploymentId}, attempting delete by name`);
      }

      return { success: true, deploymentId };

    } catch (error) {
      logger.error(`Error deleting deployment ${deploymentId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get status of a local deployment
   */
  async getStatus(deploymentName, namespace = 'default') {
    try {
      const { stdout } = await execAsync(
        `kubectl get deployment ${deploymentName} -n ${namespace} -o json`
      );
      const deployment = JSON.parse(stdout);

      return {
        name: deployment.metadata.name,
        namespace: deployment.metadata.namespace,
        replicas: {
          desired: deployment.spec.replicas,
          ready: deployment.status.readyReplicas || 0,
          available: deployment.status.availableReplicas || 0
        },
        conditions: deployment.status.conditions,
        created: deployment.metadata.creationTimestamp
      };

    } catch (error) {
      if (error.message.includes('not found')) {
        return { exists: false };
      }
      throw error;
    }
  }

  /**
   * Emit progress update via WebSocket
   */
  emitProgress(deploymentId, phase, message, progress) {
    websocketServer.emitDeploymentUpdate(deploymentId, {
      phase,
      message,
      progress,
      timestamp: new Date().toISOString()
    });

    logger.deployment(deploymentId, phase, message, { progress });
  }
}

module.exports = new LocalDeploymentService();
