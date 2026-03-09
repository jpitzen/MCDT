/**
 * useDeployment Hook
 * 
 * Handles Kubernetes deployment operations including:
 * - Docker images management
 * - K8s deployments, services, pods
 * - Container registry operations
 * - Image push/pull
 * 
 * Migrated from CloudDeploymentToolkit.jsx
 */

import { useState, useCallback } from 'react';
import api from '../../../services/api';

export function useDeployment() {
  const [localImages, setLocalImages] = useState([]);
  const [containers, setContainers] = useState([]);
  const [deployments, setDeployments] = useState([]);
  const [services, setServices] = useState([]);
  const [pods, setPods] = useState([]);
  const [namespaces, setNamespaces] = useState(['default']);
  const [registries, setRegistries] = useState([]);
  const [loading, setLoading] = useState({
    images: false,
    containers: false,
    deployments: false,
    services: false,
    pods: false,
    namespaces: false,
    deploying: false,
  });
  const [error, setError] = useState(null);

  // ==========================================
  // DOCKER OPERATIONS
  // ==========================================

  /**
   * Fetch local Docker images
   */
  const fetchLocalImages = useCallback(async () => {
    setLoading(prev => ({ ...prev, images: true }));
    
    try {
      const response = await api.get('/container-deployments/docker/images');
      const images = response.data.data?.images || [];
      setLocalImages(images);
      return images;
    } catch (err) {
      console.error('Failed to fetch local images:', err);
      return [];
    } finally {
      setLoading(prev => ({ ...prev, images: false }));
    }
  }, []);

  /**
   * Fetch running containers
   */
  const fetchContainers = useCallback(async () => {
    setLoading(prev => ({ ...prev, containers: true }));
    
    try {
      const response = await api.get('/container-deployments/docker/containers');
      const containerList = response.data.data?.containers || [];
      setContainers(containerList);
      return containerList;
    } catch (err) {
      console.error('Failed to fetch containers:', err);
      return [];
    } finally {
      setLoading(prev => ({ ...prev, containers: false }));
    }
  }, []);

  /**
   * Tag a Docker image
   */
  const tagImage = useCallback(async (imageId, newTag) => {
    try {
      const response = await api.post('/container-deployments/docker/images/tag', {
        imageId,
        newTag,
      });
      await fetchLocalImages();
      return { success: true, data: response.data.data };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.message || 'Failed to tag image',
      };
    }
  }, [fetchLocalImages]);

  /**
   * Push image to registry
   */
  const pushImage = useCallback(async (imageTag, registryUrl) => {
    try {
      const response = await api.post('/container-deployments/docker/images/push', {
        imageTag,
        registryUrl,
      });
      return { success: true, data: response.data.data };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.message || 'Failed to push image',
      };
    }
  }, []);

  // ==========================================
  // KUBERNETES OPERATIONS
  // ==========================================

  /**
   * Fetch namespaces
   */
  const fetchNamespaces = useCallback(async () => {
    setLoading(prev => ({ ...prev, namespaces: true }));
    
    try {
      const response = await api.get('/container-deployments/k8s/namespaces');
      const nsList = response.data.data?.namespaces || ['default'];
      setNamespaces(nsList);
      return nsList;
    } catch (err) {
      console.error('Failed to fetch namespaces:', err);
      return ['default'];
    } finally {
      setLoading(prev => ({ ...prev, namespaces: false }));
    }
  }, []);

  /**
   * Create a namespace
   */
  const createNamespace = useCallback(async (name) => {
    try {
      const response = await api.post('/container-deployments/k8s/namespaces', { name });
      await fetchNamespaces();
      return { success: true, data: response.data.data };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.message || 'Failed to create namespace',
      };
    }
  }, [fetchNamespaces]);

  /**
   * Fetch deployments
   */
  const fetchDeployments = useCallback(async (namespace = 'default') => {
    setLoading(prev => ({ ...prev, deployments: true }));
    
    try {
      const response = await api.get(`/container-deployments/k8s/deployments/${namespace}`);
      const depList = response.data.data?.deployments || [];
      setDeployments(depList);
      return depList;
    } catch (err) {
      console.error('Failed to fetch deployments:', err);
      return [];
    } finally {
      setLoading(prev => ({ ...prev, deployments: false }));
    }
  }, []);

  /**
   * Create a deployment
   */
  const createDeployment = useCallback(async (config) => {
    setLoading(prev => ({ ...prev, deploying: true }));
    setError(null);
    
    try {
      const response = await api.post('/container-deployments/k8s/deployments', config);
      await fetchDeployments(config.namespace || 'default');
      return { success: true, data: response.data.data };
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to create deployment';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(prev => ({ ...prev, deploying: false }));
    }
  }, [fetchDeployments]);

  /**
   * Scale a deployment
   */
  const scaleDeployment = useCallback(async (name, namespace, replicas) => {
    try {
      const response = await api.post(`/container-deployments/k8s/deployments/${namespace}/${name}/scale`, {
        replicas,
      });
      await fetchDeployments(namespace);
      return { success: true, data: response.data.data };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.message || 'Failed to scale deployment',
      };
    }
  }, [fetchDeployments]);

  /**
   * Delete a deployment
   */
  const deleteDeployment = useCallback(async (name, namespace = 'default') => {
    try {
      await api.delete(`/container-deployments/k8s/deployments/${namespace}/${name}`);
      setDeployments(prev => prev.filter(d => d.name !== name));
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.message || 'Failed to delete deployment',
      };
    }
  }, []);

  /**
   * Restart a deployment
   */
  const restartDeployment = useCallback(async (name, namespace = 'default') => {
    try {
      const response = await api.post(`/container-deployments/k8s/deployments/${namespace}/${name}/restart`);
      await fetchDeployments(namespace);
      return { success: true, data: response.data.data };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.message || 'Failed to restart deployment',
      };
    }
  }, [fetchDeployments]);

  /**
   * Fetch services
   */
  const fetchServices = useCallback(async (namespace = 'default') => {
    setLoading(prev => ({ ...prev, services: true }));
    
    try {
      const response = await api.get(`/container-deployments/k8s/services/${namespace}`);
      const svcList = response.data.data?.services || [];
      setServices(svcList);
      return svcList;
    } catch (err) {
      console.error('Failed to fetch services:', err);
      return [];
    } finally {
      setLoading(prev => ({ ...prev, services: false }));
    }
  }, []);

  /**
   * Create a service
   */
  const createService = useCallback(async (config) => {
    try {
      const response = await api.post('/container-deployments/k8s/services', config);
      await fetchServices(config.namespace || 'default');
      return { success: true, data: response.data.data };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.message || 'Failed to create service',
      };
    }
  }, [fetchServices]);

  /**
   * Delete a service
   */
  const deleteService = useCallback(async (name, namespace = 'default') => {
    try {
      await api.delete(`/container-deployments/k8s/services/${namespace}/${name}`);
      setServices(prev => prev.filter(s => s.name !== name));
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.message || 'Failed to delete service',
      };
    }
  }, []);

  /**
   * Fetch pods
   */
  const fetchPods = useCallback(async (namespace = 'default') => {
    setLoading(prev => ({ ...prev, pods: true }));
    
    try {
      const response = await api.get(`/container-deployments/k8s/pods/${namespace}`);
      const podList = response.data.data?.pods || [];
      setPods(podList);
      return podList;
    } catch (err) {
      console.error('Failed to fetch pods:', err);
      return [];
    } finally {
      setLoading(prev => ({ ...prev, pods: false }));
    }
  }, []);

  /**
   * Get pod logs
   */
  const getPodLogs = useCallback(async (name, namespace = 'default', options = {}) => {
    try {
      const params = {
        tailLines: options.tailLines || 100,
        container: options.container,
      };
      const response = await api.get(`/container-deployments/k8s/pods/${namespace}/${name}/logs`, { params });
      return {
        success: true,
        logs: response.data.data?.logs || '',
      };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.message || 'Failed to get pod logs',
      };
    }
  }, []);

  /**
   * Delete a pod
   */
  const deletePod = useCallback(async (name, namespace = 'default') => {
    try {
      await api.delete(`/container-deployments/k8s/pods/${namespace}/${name}`);
      setPods(prev => prev.filter(p => p.name !== name));
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.message || 'Failed to delete pod',
      };
    }
  }, []);

  // ==========================================
  // REGISTRY OPERATIONS
  // ==========================================

  /**
   * Fetch ECR repositories
   */
  const fetchECRRepositories = useCallback(async (credentialId, region) => {
    try {
      const response = await api.get(`/container-deployments/ecr/${credentialId}/repositories`, {
        params: { region }
      });
      const repos = response.data.data?.repositories || [];
      setRegistries(repos);
      return repos;
    } catch (err) {
      console.error('Failed to fetch ECR repositories:', err);
      return [];
    }
  }, []);

  /**
   * Create ECR repository
   */
  const createECRRepository = useCallback(async (credentialId, name, region) => {
    try {
      const response = await api.post(`/container-deployments/ecr/${credentialId}/repositories`, {
        name,
        region,
      });
      await fetchECRRepositories(credentialId, region);
      return { success: true, data: response.data.data };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.message || 'Failed to create ECR repository',
      };
    }
  }, [fetchECRRepositories]);

  /**
   * Get ECR login command
   */
  const getECRLogin = useCallback(async (credentialId, region) => {
    try {
      const response = await api.get(`/container-deployments/ecr/${credentialId}/login`, {
        params: { region }
      });
      return {
        success: true,
        command: response.data.data?.command,
        token: response.data.data?.token,
      };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.message || 'Failed to get ECR login',
      };
    }
  }, []);

  // ==========================================
  // DEPLOYMENT HELPERS
  // ==========================================

  /**
   * Deploy full stack (deployment + service)
   */
  const deployFullStack = useCallback(async (config) => {
    setLoading(prev => ({ ...prev, deploying: true }));
    setError(null);
    
    try {
      // Create deployment
      const deployResult = await createDeployment({
        name: config.deploymentName,
        namespace: config.namespace,
        image: `${config.imageName}:${config.imageTag}`,
        replicas: config.replicas,
        containerPort: config.containerPort,
        labels: config.labels || {},
        env: config.env || [],
      });
      
      if (!deployResult.success) {
        throw new Error(deployResult.error);
      }
      
      // Create service if requested
      if (config.createService) {
        const serviceResult = await createService({
          name: `${config.deploymentName}-svc`,
          namespace: config.namespace,
          type: config.serviceType,
          port: config.servicePort,
          targetPort: config.containerPort,
          selector: { app: config.deploymentName },
          annotations: config.internalLoadBalancer ? {
            'service.beta.kubernetes.io/aws-load-balancer-internal': 'true',
          } : {},
        });
        
        if (!serviceResult.success) {
          console.warn('Deployment created but service creation failed:', serviceResult.error);
        }
      }
      
      return { success: true };
    } catch (err) {
      const errorMsg = err.message || 'Deployment failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(prev => ({ ...prev, deploying: false }));
    }
  }, [createDeployment, createService]);

  /**
   * Get deployment status summary
   */
  const getDeploymentSummary = useCallback(() => {
    const running = pods.filter(p => p.status?.phase === 'Running').length;
    const pending = pods.filter(p => p.status?.phase === 'Pending').length;
    const failed = pods.filter(p => p.status?.phase === 'Failed').length;
    
    return {
      totalDeployments: deployments.length,
      totalServices: services.length,
      totalPods: pods.length,
      podsRunning: running,
      podsPending: pending,
      podsFailed: failed,
      healthy: failed === 0 && pending === 0 && running > 0,
    };
  }, [deployments, services, pods]);

  return {
    // State
    localImages,
    containers,
    deployments,
    services,
    pods,
    namespaces,
    registries,
    loading,
    error,
    
    // Docker Actions
    fetchLocalImages,
    fetchContainers,
    tagImage,
    pushImage,
    
    // K8s Actions
    fetchNamespaces,
    createNamespace,
    fetchDeployments,
    createDeployment,
    scaleDeployment,
    deleteDeployment,
    restartDeployment,
    fetchServices,
    createService,
    deleteService,
    fetchPods,
    getPodLogs,
    deletePod,
    
    // ECR Actions
    fetchECRRepositories,
    createECRRepository,
    getECRLogin,
    
    // Helpers
    deployFullStack,
    getDeploymentSummary,
  };
}

export default useDeployment;
