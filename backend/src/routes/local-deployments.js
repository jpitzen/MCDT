/**
 * Local Deployments Route
 * 
 * Provides endpoints for local Minikube/Docker deployment testing.
 * Includes status checks and local deployment execution.
 */

const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const { promisify } = require('util');
const logger = require('../services/logger');

const execAsync = promisify(exec);

/**
 * Check if a command exists and is executable
 */
async function checkCommand(command, args = ['--version']) {
  try {
    const { stdout } = await execAsync(`${command} ${args.join(' ')}`);
    return {
      available: true,
      version: stdout.trim().split('\n')[0]
    };
  } catch (error) {
    return {
      available: false,
      error: error.message
    };
  }
}

/**
 * Get Minikube status
 */
async function getMinikubeStatus() {
  try {
    const { stdout } = await execAsync('minikube status -o json');
    const status = JSON.parse(stdout);
    return {
      available: true,
      running: status.Host === 'Running' && status.Kubelet === 'Running',
      host: status.Host,
      kubelet: status.Kubelet,
      apiserver: status.APIServer,
      kubeconfig: status.Kubeconfig
    };
  } catch (error) {
    // If minikube is not running, status command fails
    if (error.message.includes('not running') || error.message.includes('Stopped')) {
      return {
        available: true,
        running: false,
        error: 'Minikube is stopped'
      };
    }
    return {
      available: false,
      running: false,
      error: error.message
    };
  }
}

/**
 * Get current kubectl context
 */
async function getKubectlContext() {
  try {
    const { stdout: currentContext } = await execAsync('kubectl config current-context');
    const { stdout: clusterInfo } = await execAsync('kubectl cluster-info --request-timeout=5s');
    
    return {
      available: true,
      context: currentContext.trim(),
      isMinikube: currentContext.trim().toLowerCase() === 'minikube',
      clusterInfo: clusterInfo.trim().split('\n')[0]
    };
  } catch (error) {
    return {
      available: false,
      error: error.message
    };
  }
}

/**
 * Check Docker status
 */
async function getDockerStatus() {
  try {
    const { stdout: version } = await execAsync('docker version --format "{{.Server.Version}}"');
    const { stdout: info } = await execAsync('docker info --format "{{.ContainersRunning}} containers running"');
    
    return {
      available: true,
      running: true,
      version: version.trim(),
      info: info.trim()
    };
  } catch (error) {
    if (error.message.includes('Cannot connect') || error.message.includes('Is the docker daemon running')) {
      return {
        available: true,
        running: false,
        error: 'Docker daemon is not running'
      };
    }
    return {
      available: false,
      running: false,
      error: error.message
    };
  }
}

/**
 * @route   GET /api/local-deployments/status
 * @desc    Get local environment status (Minikube, Docker, kubectl)
 * @access  Public (could be protected in production)
 */
router.get('/status', async (req, res) => {
  try {
    logger.info('Checking local deployment environment status');

    // Run all checks in parallel
    const [minikube, docker, kubectl] = await Promise.all([
      getMinikubeStatus(),
      getDockerStatus(),
      getKubectlContext()
    ]);

    // Determine overall readiness
    const ready = minikube.running && docker.running && kubectl.available && kubectl.isMinikube;

    const status = {
      ready,
      timestamp: new Date().toISOString(),
      components: {
        minikube: {
          ...minikube,
          status: minikube.running ? 'running' : minikube.available ? 'stopped' : 'not-installed'
        },
        docker: {
          ...docker,
          status: docker.running ? 'running' : docker.available ? 'stopped' : 'not-installed'
        },
        kubectl: {
          ...kubectl,
          status: kubectl.available ? 'ready' : 'not-configured',
          warning: kubectl.available && !kubectl.isMinikube 
            ? `Context is set to '${kubectl.context}', not minikube. Run 'kubectl config use-context minikube'`
            : null
        }
      },
      recommendations: []
    };

    // Add recommendations based on status
    if (!minikube.available) {
      status.recommendations.push({
        component: 'minikube',
        action: 'Install Minikube: https://minikube.sigs.k8s.io/docs/start/'
      });
    } else if (!minikube.running) {
      status.recommendations.push({
        component: 'minikube',
        action: 'Start Minikube: minikube start'
      });
    }

    if (!docker.available) {
      status.recommendations.push({
        component: 'docker',
        action: 'Install Docker Desktop: https://www.docker.com/products/docker-desktop'
      });
    } else if (!docker.running) {
      status.recommendations.push({
        component: 'docker',
        action: 'Start Docker Desktop'
      });
    }

    if (!kubectl.available) {
      status.recommendations.push({
        component: 'kubectl',
        action: 'Install kubectl: https://kubernetes.io/docs/tasks/tools/'
      });
    } else if (!kubectl.isMinikube) {
      status.recommendations.push({
        component: 'kubectl',
        action: `Switch to minikube context: kubectl config use-context minikube (current: ${kubectl.context})`
      });
    }

    logger.info('Local environment status check complete', { ready, components: Object.keys(status.components) });

    res.json(status);
  } catch (error) {
    logger.error('Error checking local environment status:', error);
    res.status(500).json({
      ready: false,
      error: 'Failed to check local environment status',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/local-deployments/start-minikube
 * @desc    Start Minikube cluster if not running
 * @access  Public (could be protected in production)
 */
router.post('/start-minikube', async (req, res) => {
  try {
    logger.info('Starting Minikube cluster');

    // Check if already running
    const status = await getMinikubeStatus();
    if (status.running) {
      return res.json({
        success: true,
        message: 'Minikube is already running',
        status
      });
    }

    // Start Minikube
    const { stdout, stderr } = await execAsync('minikube start', {
      timeout: 300000 // 5 minute timeout
    });

    logger.info('Minikube started successfully');

    res.json({
      success: true,
      message: 'Minikube started successfully',
      output: stdout,
      warnings: stderr || null
    });
  } catch (error) {
    logger.error('Error starting Minikube:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start Minikube',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/local-deployments/switch-context
 * @desc    Switch kubectl context to minikube
 * @access  Public (could be protected in production)
 */
router.post('/switch-context', async (req, res) => {
  try {
    logger.info('Switching kubectl context to minikube');

    const { stdout } = await execAsync('kubectl config use-context minikube');

    // Verify the switch
    const context = await getKubectlContext();

    res.json({
      success: true,
      message: 'Switched to minikube context',
      output: stdout.trim(),
      context
    });
  } catch (error) {
    logger.error('Error switching kubectl context:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to switch kubectl context',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/local-deployments/namespaces
 * @desc    List available Kubernetes namespaces
 * @access  Public
 */
router.get('/namespaces', async (req, res) => {
  try {
    const { stdout } = await execAsync('kubectl get namespaces -o json');
    const data = JSON.parse(stdout);
    
    const namespaces = data.items.map(ns => ({
      name: ns.metadata.name,
      status: ns.status.phase,
      created: ns.metadata.creationTimestamp
    }));

    res.json({ namespaces });
  } catch (error) {
    logger.error('Error listing namespaces:', error);
    res.status(500).json({
      error: 'Failed to list namespaces',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/local-deployments/pods
 * @desc    List pods in a namespace
 * @access  Public
 */
router.get('/pods', async (req, res) => {
  try {
    const namespace = req.query.namespace || 'default';
    const { stdout } = await execAsync(`kubectl get pods -n ${namespace} -o json`);
    const data = JSON.parse(stdout);
    
    const pods = data.items.map(pod => ({
      name: pod.metadata.name,
      namespace: pod.metadata.namespace,
      status: pod.status.phase,
      ready: pod.status.containerStatuses?.every(c => c.ready) || false,
      restarts: pod.status.containerStatuses?.reduce((sum, c) => sum + c.restartCount, 0) || 0,
      created: pod.metadata.creationTimestamp
    }));

    res.json({ namespace, pods });
  } catch (error) {
    logger.error('Error listing pods:', error);
    res.status(500).json({
      error: 'Failed to list pods',
      message: error.message
    });
  }
});

module.exports = router;
