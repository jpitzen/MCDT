/**
 * usePrerequisites Hook
 * 
 * Handles all prerequisite checking logic including:
 * - Tool availability (kubectl, eksctl, aws, docker, helm)
 * - AWS CLI configuration
 * - Kubernetes context
 * - Docker daemon status
 * 
 * Migrated from CloudDeploymentToolkit.jsx
 */

import { useState, useCallback } from 'react';
import api from '../../../services/api';

// Tool definitions with expected outputs
const REQUIRED_TOOLS = [
  { id: 'kubectl', name: 'kubectl', command: 'kubectl version --client', required: true },
  { id: 'eksctl', name: 'eksctl', command: 'eksctl version', required: false },
  { id: 'aws', name: 'AWS CLI', command: 'aws --version', required: true },
  { id: 'docker', name: 'Docker', command: 'docker --version', required: false },
  { id: 'helm', name: 'Helm', command: 'helm version --short', required: false },
];

export function usePrerequisites() {
  const [prerequisites, setPrerequisites] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toolStatus, setToolStatus] = useState({});

  /**
   * Fetch prerequisites from backend API
   * This checks all tools and configurations server-side
   */
  const fetchPrerequisites = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get('/container-deployments/prerequisites');
      const data = response.data.data || response.data;
      
      setPrerequisites(data);
      
      // Extract individual tool statuses
      if (data.tools) {
        const status = {};
        data.tools.forEach(tool => {
          status[tool.name?.toLowerCase() || tool.id] = {
            installed: tool.installed || tool.available,
            version: tool.version,
            path: tool.path,
          };
        });
        setToolStatus(status);
      }
      
      return data;
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to check prerequisites';
      setError(errorMsg);
      console.error('Prerequisites check failed:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Check a single tool's availability
   */
  const checkTool = useCallback(async (toolId) => {
    try {
      const response = await api.get(`/container-deployments/prerequisites/tool/${toolId}`);
      const data = response.data.data || response.data;
      
      setToolStatus(prev => ({
        ...prev,
        [toolId]: {
          installed: data.installed || data.available,
          version: data.version,
          path: data.path,
          checking: false,
        },
      }));
      
      return data;
    } catch (err) {
      setToolStatus(prev => ({
        ...prev,
        [toolId]: {
          installed: false,
          error: err.message,
          checking: false,
        },
      }));
      return null;
    }
  }, []);

  /**
   * Check Kubernetes context
   */
  const checkKubeContext = useCallback(async () => {
    try {
      const response = await api.get('/container-deployments/k8s/context');
      return response.data.data || response.data;
    } catch (err) {
      console.error('Failed to check kube context:', err);
      return null;
    }
  }, []);

  /**
   * Check Docker daemon status
   */
  const checkDockerStatus = useCallback(async () => {
    try {
      const response = await api.get('/container-deployments/docker/info');
      return {
        running: true,
        data: response.data.data || response.data,
      };
    } catch (err) {
      return {
        running: false,
        error: err.message,
      };
    }
  }, []);

  /**
   * Check AWS configuration
   */
  const checkAwsConfig = useCallback(async () => {
    try {
      const response = await api.get('/container-deployments/aws/config');
      return response.data.data || response.data;
    } catch (err) {
      console.error('Failed to check AWS config:', err);
      return null;
    }
  }, []);

  /**
   * Get summary status
   */
  const getSummary = useCallback(() => {
    if (!prerequisites) return null;
    
    const summary = prerequisites.summary || {};
    const tools = prerequisites.tools || [];
    
    const requiredTools = tools.filter(t => t.required !== false);
    const installedRequired = requiredTools.filter(t => t.installed || t.available);
    
    return {
      ready: summary.ready ?? (installedRequired.length === requiredTools.length),
      totalTools: tools.length,
      installedTools: tools.filter(t => t.installed || t.available).length,
      requiredTools: requiredTools.length,
      installedRequired: installedRequired.length,
      missingRequired: requiredTools.filter(t => !t.installed && !t.available).map(t => t.name),
    };
  }, [prerequisites]);

  return {
    // State
    prerequisites,
    loading,
    error,
    toolStatus,
    
    // Actions
    fetchPrerequisites,
    checkTool,
    checkKubeContext,
    checkDockerStatus,
    checkAwsConfig,
    
    // Helpers
    getSummary,
    REQUIRED_TOOLS,
  };
}

export default usePrerequisites;
