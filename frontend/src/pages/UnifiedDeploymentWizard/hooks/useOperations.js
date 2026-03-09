/**
 * useOperations Hook
 * 
 * Handles day-2 operations including:
 * - Port forwarding
 * - Metrics and monitoring
 * - ConfigMaps and Secrets
 * - Helm operations
 * - Troubleshooting
 * 
 * Migrated from CloudDeploymentToolkit.jsx
 */

import { useState, useCallback } from 'react';
import api from '../../../services/api';

export function useOperations() {
  // Monitoring State
  const [metricsServerStatus, setMetricsServerStatus] = useState(null);
  const [clusterAutoscalerStatus, setClusterAutoscalerStatus] = useState(null);
  const [nodeMetrics, setNodeMetrics] = useState([]);
  const [podMetrics, setPodMetrics] = useState([]);
  const [nodeHealth, setNodeHealth] = useState([]);
  
  // Config State
  const [configMaps, setConfigMaps] = useState([]);
  const [secrets, setSecrets] = useState([]);
  
  // Port Forwarding State
  const [portForwards, setPortForwards] = useState([]);
  
  // Helm State
  const [helmRepos, setHelmRepos] = useState([]);
  const [helmCharts, setHelmCharts] = useState([]);
  const [helmReleases, setHelmReleases] = useState([]);
  
  // Troubleshooting State
  const [problematicPods, setProblematicPods] = useState([]);
  const [troubleshootingChecklist, setTroubleshootingChecklist] = useState([]);
  
  const [loading, setLoading] = useState({
    metrics: false,
    configMaps: false,
    secrets: false,
    portForwards: false,
    helm: false,
  });

  // ==========================================
  // METRICS & MONITORING
  // ==========================================

  /**
   * Fetch metrics server status
   */
  const fetchMetricsServerStatus = useCallback(async () => {
    setLoading(prev => ({ ...prev, metrics: true }));
    
    try {
      const response = await api.get('/container-deployments/k8s/metrics-server/status');
      const status = response.data.data || { installed: false, ready: false };
      setMetricsServerStatus(status);
      return status;
    } catch (err) {
      setMetricsServerStatus({ installed: false, ready: false });
      return null;
    } finally {
      setLoading(prev => ({ ...prev, metrics: false }));
    }
  }, []);

  /**
   * Install metrics server
   */
  const installMetricsServer = useCallback(async () => {
    try {
      const response = await api.post('/container-deployments/k8s/metrics-server/install');
      await fetchMetricsServerStatus();
      return { success: true, data: response.data.data };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.message || 'Failed to install metrics server',
      };
    }
  }, [fetchMetricsServerStatus]);

  /**
   * Fetch cluster autoscaler status
   */
  const fetchClusterAutoscalerStatus = useCallback(async () => {
    try {
      const response = await api.get('/container-deployments/k8s/cluster-autoscaler/status');
      const status = response.data.data || { installed: false, ready: false };
      setClusterAutoscalerStatus(status);
      return status;
    } catch (err) {
      setClusterAutoscalerStatus({ installed: false, ready: false });
      return null;
    }
  }, []);

  /**
   * Fetch node metrics
   */
  const fetchNodeMetrics = useCallback(async () => {
    try {
      const response = await api.get('/container-deployments/k8s/metrics/nodes');
      const metrics = response.data.data?.metrics || [];
      setNodeMetrics(metrics);
      return metrics;
    } catch (err) {
      console.error('Failed to fetch node metrics:', err);
      return [];
    }
  }, []);

  /**
   * Fetch pod metrics
   */
  const fetchPodMetrics = useCallback(async (namespace = 'default') => {
    try {
      const response = await api.get('/container-deployments/k8s/metrics/pods', {
        params: { namespace }
      });
      const metrics = response.data.data?.metrics || [];
      setPodMetrics(metrics);
      return metrics;
    } catch (err) {
      console.error('Failed to fetch pod metrics:', err);
      return [];
    }
  }, []);

  /**
   * Fetch node health
   */
  const fetchNodeHealth = useCallback(async () => {
    try {
      const response = await api.get('/container-deployments/k8s/nodes/health');
      const health = response.data.data?.nodes || [];
      setNodeHealth(health);
      return health;
    } catch (err) {
      console.error('Failed to fetch node health:', err);
      return [];
    }
  }, []);

  // ==========================================
  // CONFIGMAPS & SECRETS
  // ==========================================

  /**
   * Fetch ConfigMaps
   */
  const fetchConfigMaps = useCallback(async (namespace = 'default') => {
    setLoading(prev => ({ ...prev, configMaps: true }));
    
    try {
      const response = await api.get('/container-deployments/k8s/configmaps', {
        params: { namespace }
      });
      const cms = response.data.data?.configMaps || [];
      setConfigMaps(cms);
      return cms;
    } catch (err) {
      console.error('Failed to fetch ConfigMaps:', err);
      return [];
    } finally {
      setLoading(prev => ({ ...prev, configMaps: false }));
    }
  }, []);

  /**
   * Create ConfigMap
   */
  const createConfigMap = useCallback(async (config) => {
    try {
      const response = await api.post('/container-deployments/k8s/configmaps', config);
      await fetchConfigMaps(config.namespace || 'default');
      return { success: true, data: response.data.data };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.message || 'Failed to create ConfigMap',
      };
    }
  }, [fetchConfigMaps]);

  /**
   * Delete ConfigMap
   */
  const deleteConfigMap = useCallback(async (name, namespace = 'default') => {
    try {
      await api.delete(`/container-deployments/k8s/configmaps/${namespace}/${name}`);
      setConfigMaps(prev => prev.filter(cm => cm.name !== name));
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.message || 'Failed to delete ConfigMap',
      };
    }
  }, []);

  /**
   * Fetch Secrets
   */
  const fetchSecrets = useCallback(async (namespace = 'default') => {
    setLoading(prev => ({ ...prev, secrets: true }));
    
    try {
      const response = await api.get('/container-deployments/k8s/secrets', {
        params: { namespace }
      });
      const secretList = response.data.data?.secrets || [];
      setSecrets(secretList);
      return secretList;
    } catch (err) {
      console.error('Failed to fetch Secrets:', err);
      return [];
    } finally {
      setLoading(prev => ({ ...prev, secrets: false }));
    }
  }, []);

  /**
   * Create Secret
   */
  const createSecret = useCallback(async (config) => {
    try {
      const response = await api.post('/container-deployments/k8s/secrets', config);
      await fetchSecrets(config.namespace || 'default');
      return { success: true, data: response.data.data };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.message || 'Failed to create Secret',
      };
    }
  }, [fetchSecrets]);

  /**
   * Delete Secret
   */
  const deleteSecret = useCallback(async (name, namespace = 'default') => {
    try {
      await api.delete(`/container-deployments/k8s/secrets/${namespace}/${name}`);
      setSecrets(prev => prev.filter(s => s.name !== name));
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.message || 'Failed to delete Secret',
      };
    }
  }, []);

  // ==========================================
  // PORT FORWARDING
  // ==========================================

  /**
   * Start port forward
   */
  const startPortForward = useCallback(async (config) => {
    try {
      const response = await api.post('/container-deployments/k8s/port-forward', config);
      const forward = response.data.data;
      setPortForwards(prev => [...prev, {
        id: forward.id || `${config.namespace}-${config.podName}-${config.localPort}`,
        ...config,
        status: 'active',
        startedAt: new Date().toISOString(),
      }]);
      return { success: true, data: forward };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.message || 'Failed to start port forward',
      };
    }
  }, []);

  /**
   * Stop port forward
   */
  const stopPortForward = useCallback(async (forwardId) => {
    try {
      await api.delete(`/container-deployments/k8s/port-forward/${forwardId}`);
      setPortForwards(prev => prev.filter(pf => pf.id !== forwardId));
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.message || 'Failed to stop port forward',
      };
    }
  }, []);

  /**
   * Stop all port forwards
   */
  const stopAllPortForwards = useCallback(async () => {
    try {
      await api.delete('/container-deployments/k8s/port-forward');
      setPortForwards([]);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.message || 'Failed to stop port forwards',
      };
    }
  }, []);

  // ==========================================
  // HELM OPERATIONS
  // ==========================================

  /**
   * Fetch Helm repos
   */
  const fetchHelmRepos = useCallback(async () => {
    setLoading(prev => ({ ...prev, helm: true }));
    
    try {
      const response = await api.get('/container-deployments/helm/repos');
      const repos = response.data.data?.repos || [];
      setHelmRepos(repos);
      return repos;
    } catch (err) {
      console.error('Failed to fetch Helm repos:', err);
      return [];
    } finally {
      setLoading(prev => ({ ...prev, helm: false }));
    }
  }, []);

  /**
   * Add Helm repo
   */
  const addHelmRepo = useCallback(async (name, url) => {
    try {
      const response = await api.post('/container-deployments/helm/repos', { name, url });
      await fetchHelmRepos();
      return { success: true, data: response.data.data };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.message || 'Failed to add Helm repo',
      };
    }
  }, [fetchHelmRepos]);

  /**
   * Search Helm charts
   */
  const searchHelmCharts = useCallback(async (keyword = '') => {
    try {
      const response = await api.get('/container-deployments/helm/charts/search', {
        params: { keyword }
      });
      const charts = response.data.data?.charts || [];
      setHelmCharts(charts);
      return charts;
    } catch (err) {
      console.error('Failed to search Helm charts:', err);
      return [];
    }
  }, []);

  /**
   * Install Helm chart
   */
  const installHelmChart = useCallback(async (config) => {
    try {
      const response = await api.post('/container-deployments/helm/install', config);
      return { success: true, data: response.data.data };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.message || 'Failed to install Helm chart',
      };
    }
  }, []);

  /**
   * Fetch Helm releases
   */
  const fetchHelmReleases = useCallback(async (namespace = 'default') => {
    try {
      const response = await api.get('/container-deployments/helm/releases', {
        params: { namespace }
      });
      const releases = response.data.data?.releases || [];
      setHelmReleases(releases);
      return releases;
    } catch (err) {
      console.error('Failed to fetch Helm releases:', err);
      return [];
    }
  }, []);

  /**
   * Uninstall Helm release
   */
  const uninstallHelmRelease = useCallback(async (releaseName, namespace = 'default') => {
    try {
      await api.delete(`/container-deployments/helm/releases/${namespace}/${releaseName}`);
      setHelmReleases(prev => prev.filter(r => r.name !== releaseName));
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.message || 'Failed to uninstall Helm release',
      };
    }
  }, []);

  // ==========================================
  // TROUBLESHOOTING
  // ==========================================

  /**
   * Fetch problematic pods
   */
  const fetchProblematicPods = useCallback(async (namespace = 'all') => {
    try {
      const response = await api.get('/container-deployments/k8s/pods/problematic', {
        params: { namespace }
      });
      const pods = response.data.data?.pods || [];
      setProblematicPods(pods);
      return pods;
    } catch (err) {
      console.error('Failed to fetch problematic pods:', err);
      return [];
    }
  }, []);

  /**
   * Fetch troubleshooting checklist
   */
  const fetchTroubleshootingChecklist = useCallback(async (issueType) => {
    try {
      const response = await api.get(`/container-deployments/troubleshooting/${issueType}`);
      const checklist = response.data.data?.checklist || [];
      setTroubleshootingChecklist(checklist);
      return checklist;
    } catch (err) {
      console.error('Failed to fetch troubleshooting checklist:', err);
      return [];
    }
  }, []);

  /**
   * Get cluster health summary
   */
  const getClusterHealthSummary = useCallback(() => {
    const healthyNodes = nodeHealth.filter(n => n.status === 'Ready').length;
    const unhealthyNodes = nodeHealth.filter(n => n.status !== 'Ready').length;
    
    return {
      metricsServerReady: metricsServerStatus?.ready || false,
      autoscalerReady: clusterAutoscalerStatus?.ready || false,
      totalNodes: nodeHealth.length,
      healthyNodes,
      unhealthyNodes,
      problematicPodCount: problematicPods.length,
      portForwardCount: portForwards.length,
      helmReleaseCount: helmReleases.length,
    };
  }, [metricsServerStatus, clusterAutoscalerStatus, nodeHealth, problematicPods, portForwards, helmReleases]);

  return {
    // Metrics State
    metricsServerStatus,
    clusterAutoscalerStatus,
    nodeMetrics,
    podMetrics,
    nodeHealth,
    
    // Config State
    configMaps,
    secrets,
    
    // Port Forward State
    portForwards,
    
    // Helm State
    helmRepos,
    helmCharts,
    helmReleases,
    
    // Troubleshooting State
    problematicPods,
    troubleshootingChecklist,
    
    loading,
    
    // Metrics Actions
    fetchMetricsServerStatus,
    installMetricsServer,
    fetchClusterAutoscalerStatus,
    fetchNodeMetrics,
    fetchPodMetrics,
    fetchNodeHealth,
    
    // Config Actions
    fetchConfigMaps,
    createConfigMap,
    deleteConfigMap,
    fetchSecrets,
    createSecret,
    deleteSecret,
    
    // Port Forward Actions
    startPortForward,
    stopPortForward,
    stopAllPortForwards,
    
    // Helm Actions
    fetchHelmRepos,
    addHelmRepo,
    searchHelmCharts,
    installHelmChart,
    fetchHelmReleases,
    uninstallHelmRelease,
    
    // Troubleshooting Actions
    fetchProblematicPods,
    fetchTroubleshootingChecklist,
    
    // Helpers
    getClusterHealthSummary,
  };
}

export default useOperations;
