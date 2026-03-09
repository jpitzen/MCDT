/**
 * useClusterConfig Hook
 * 
 * Handles cluster configuration and discovery including:
 * - EKS/K8s cluster discovery
 * - Region management
 * - Node group configuration
 * - Kubernetes version management
 * 
 * Migrated from CloudDeploymentToolkit.jsx
 */

import { useState, useCallback } from 'react';
import api from '../../../services/api';

// Kubernetes versions per provider (as of early 2026)
const K8S_VERSIONS = {
  aws: ['1.34', '1.33', '1.32', '1.31', '1.30', '1.29', '1.28'],
  azure: ['1.31', '1.30', '1.29', '1.28', '1.27'],
  gcp: ['1.31', '1.30', '1.29', '1.28', '1.27'],
  digitalocean: ['1.31', '1.30', '1.29', '1.28'],
  linode: ['1.31', '1.30', '1.29', '1.28'],
};

// Instance/VM types per provider
const INSTANCE_TYPES_BY_PROVIDER = {
  aws: [
    { value: 't3.micro', label: 't3.micro (2 vCPU, 1 GB)', category: 'General Purpose' },
    { value: 't3.small', label: 't3.small (2 vCPU, 2 GB)', category: 'General Purpose' },
    { value: 't3.medium', label: 't3.medium (2 vCPU, 4 GB)', category: 'General Purpose' },
    { value: 't3.large', label: 't3.large (2 vCPU, 8 GB)', category: 'General Purpose' },
    { value: 't3.xlarge', label: 't3.xlarge (4 vCPU, 16 GB)', category: 'General Purpose' },
    { value: 'm5.large', label: 'm5.large (2 vCPU, 8 GB)', category: 'General Purpose' },
    { value: 'm5.xlarge', label: 'm5.xlarge (4 vCPU, 16 GB)', category: 'General Purpose' },
    { value: 'c5.large', label: 'c5.large (2 vCPU, 4 GB)', category: 'Compute Optimized' },
    { value: 'c5.xlarge', label: 'c5.xlarge (4 vCPU, 8 GB)', category: 'Compute Optimized' },
    { value: 'r5.large', label: 'r5.large (2 vCPU, 16 GB)', category: 'Memory Optimized' },
    { value: 'r5.xlarge', label: 'r5.xlarge (4 vCPU, 32 GB)', category: 'Memory Optimized' },
  ],
  azure: [
    { value: 'Standard_B2s', label: 'B2s (2 vCPU, 4 GB)', category: 'Burstable' },
    { value: 'Standard_D2s_v3', label: 'D2s v3 (2 vCPU, 8 GB)', category: 'General Purpose' },
    { value: 'Standard_D4s_v3', label: 'D4s v3 (4 vCPU, 16 GB)', category: 'General Purpose' },
    { value: 'Standard_D8s_v3', label: 'D8s v3 (8 vCPU, 32 GB)', category: 'General Purpose' },
    { value: 'Standard_F2s_v2', label: 'F2s v2 (2 vCPU, 4 GB)', category: 'Compute Optimized' },
    { value: 'Standard_F4s_v2', label: 'F4s v2 (4 vCPU, 8 GB)', category: 'Compute Optimized' },
    { value: 'Standard_E2s_v3', label: 'E2s v3 (2 vCPU, 16 GB)', category: 'Memory Optimized' },
    { value: 'Standard_E4s_v3', label: 'E4s v3 (4 vCPU, 32 GB)', category: 'Memory Optimized' },
  ],
  gcp: [
    { value: 'e2-small', label: 'e2-small (2 vCPU, 2 GB)', category: 'General Purpose' },
    { value: 'e2-medium', label: 'e2-medium (2 vCPU, 4 GB)', category: 'General Purpose' },
    { value: 'e2-standard-2', label: 'e2-standard-2 (2 vCPU, 8 GB)', category: 'General Purpose' },
    { value: 'e2-standard-4', label: 'e2-standard-4 (4 vCPU, 16 GB)', category: 'General Purpose' },
    { value: 'n2-standard-2', label: 'n2-standard-2 (2 vCPU, 8 GB)', category: 'General Purpose' },
    { value: 'n2-standard-4', label: 'n2-standard-4 (4 vCPU, 16 GB)', category: 'General Purpose' },
    { value: 'c2-standard-4', label: 'c2-standard-4 (4 vCPU, 16 GB)', category: 'Compute Optimized' },
    { value: 'n2-highmem-2', label: 'n2-highmem-2 (2 vCPU, 16 GB)', category: 'Memory Optimized' },
  ],
  digitalocean: [
    { value: 's-1vcpu-2gb', label: 's-1vcpu-2gb (1 vCPU, 2 GB)', category: 'Basic' },
    { value: 's-2vcpu-4gb', label: 's-2vcpu-4gb (2 vCPU, 4 GB)', category: 'Basic' },
    { value: 's-4vcpu-8gb', label: 's-4vcpu-8gb (4 vCPU, 8 GB)', category: 'Basic' },
    { value: 'g-2vcpu-8gb', label: 'g-2vcpu-8gb (2 vCPU, 8 GB)', category: 'General Purpose' },
    { value: 'g-4vcpu-16gb', label: 'g-4vcpu-16gb (4 vCPU, 16 GB)', category: 'General Purpose' },
    { value: 'c-2', label: 'c-2 (2 vCPU, 4 GB)', category: 'CPU-Optimized' },
  ],
  linode: [
    { value: 'g6-standard-1', label: 'Linode 2GB (1 vCPU, 2 GB)', category: 'Shared' },
    { value: 'g6-standard-2', label: 'Linode 4GB (2 vCPU, 4 GB)', category: 'Shared' },
    { value: 'g6-standard-4', label: 'Linode 8GB (4 vCPU, 8 GB)', category: 'Shared' },
    { value: 'g6-dedicated-2', label: 'Dedicated 4GB (2 vCPU, 4 GB)', category: 'Dedicated' },
    { value: 'g6-dedicated-4', label: 'Dedicated 8GB (4 vCPU, 8 GB)', category: 'Dedicated' },
  ],
};

// Cloud regions per provider
const REGIONS_BY_PROVIDER = {
  aws: [
    { value: 'us-east-1', label: 'US East (N. Virginia)' },
    { value: 'us-east-2', label: 'US East (Ohio)' },
    { value: 'us-west-1', label: 'US West (N. California)' },
    { value: 'us-west-2', label: 'US West (Oregon)' },
    { value: 'eu-west-1', label: 'Europe (Ireland)' },
    { value: 'eu-west-2', label: 'Europe (London)' },
    { value: 'eu-central-1', label: 'Europe (Frankfurt)' },
    { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)' },
    { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
    { value: 'ap-southeast-2', label: 'Asia Pacific (Sydney)' },
  ],
  azure: [
    { value: 'eastus', label: 'East US' },
    { value: 'eastus2', label: 'East US 2' },
    { value: 'westus2', label: 'West US 2' },
    { value: 'westus3', label: 'West US 3' },
    { value: 'centralus', label: 'Central US' },
    { value: 'northeurope', label: 'North Europe' },
    { value: 'westeurope', label: 'West Europe' },
    { value: 'uksouth', label: 'UK South' },
    { value: 'southeastasia', label: 'Southeast Asia' },
    { value: 'australiaeast', label: 'Australia East' },
  ],
  gcp: [
    { value: 'us-central1', label: 'US Central (Iowa)' },
    { value: 'us-east1', label: 'US East (South Carolina)' },
    { value: 'us-west1', label: 'US West (Oregon)' },
    { value: 'europe-west1', label: 'Europe West (Belgium)' },
    { value: 'europe-west2', label: 'Europe West (London)' },
    { value: 'asia-east1', label: 'Asia East (Taiwan)' },
    { value: 'asia-southeast1', label: 'Asia Southeast (Singapore)' },
    { value: 'australia-southeast1', label: 'Australia Southeast (Sydney)' },
  ],
  digitalocean: [
    { value: 'nyc1', label: 'New York 1' },
    { value: 'nyc3', label: 'New York 3' },
    { value: 'sfo3', label: 'San Francisco 3' },
    { value: 'ams3', label: 'Amsterdam 3' },
    { value: 'sgp1', label: 'Singapore 1' },
    { value: 'lon1', label: 'London 1' },
    { value: 'fra1', label: 'Frankfurt 1' },
    { value: 'blr1', label: 'Bangalore 1' },
    { value: 'syd1', label: 'Sydney 1' },
  ],
  linode: [
    { value: 'us-east', label: 'Newark, NJ' },
    { value: 'us-central', label: 'Dallas, TX' },
    { value: 'us-west', label: 'Fremont, CA' },
    { value: 'eu-west', label: 'London, UK' },
    { value: 'eu-central', label: 'Frankfurt, DE' },
    { value: 'ap-south', label: 'Singapore' },
    { value: 'ap-northeast', label: 'Tokyo, JP' },
    { value: 'ap-southeast', label: 'Sydney, AU' },
  ],
};

export function useClusterConfig() {
  const [clusters, setClusters] = useState([]);
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [clusterDetails, setClusterDetails] = useState(null);
  const [nodeGroups, setNodeGroups] = useState([]);
  const [loading, setLoading] = useState({
    clusters: false,
    details: false,
    nodeGroups: false,
    creating: false,
  });
  const [error, setError] = useState(null);

  /**
   * Fetch EKS clusters for a credential and region
   */
  const fetchClusters = useCallback(async (credentialId, region) => {
    if (!credentialId || !region) return [];
    
    setLoading(prev => ({ ...prev, clusters: true }));
    setError(null);
    
    try {
      const response = await api.get(`/container-deployments/cloud/clusters/${credentialId}`, {
        params: { region }
      });
      const clusterList = response.data.data?.clusters || response.data.clusters || [];
      setClusters(clusterList);
      return clusterList;
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch clusters';
      setError(errorMsg);
      console.error('Failed to fetch clusters:', err);
      return [];
    } finally {
      setLoading(prev => ({ ...prev, clusters: false }));
    }
  }, []);

  /**
   * Get detailed cluster information
   */
  const fetchClusterDetails = useCallback(async (credentialId, clusterName, region) => {
    if (!credentialId || !clusterName) return null;
    
    setLoading(prev => ({ ...prev, details: true }));
    
    try {
      const response = await api.get(`/container-deployments/eks/${credentialId}/cluster/${clusterName}`, {
        params: { region }
      });
      const details = response.data.data || response.data;
      setClusterDetails(details);
      return details;
    } catch (err) {
      console.error('Failed to fetch cluster details:', err);
      return null;
    } finally {
      setLoading(prev => ({ ...prev, details: false }));
    }
  }, []);

  /**
   * Fetch node groups for a cluster
   */
  const fetchNodeGroups = useCallback(async (credentialId, clusterName, region) => {
    if (!credentialId || !clusterName) return [];
    
    setLoading(prev => ({ ...prev, nodeGroups: true }));
    
    try {
      const response = await api.get(`/container-deployments/eks/${credentialId}/cluster/${clusterName}/nodegroups`, {
        params: { region }
      });
      const groups = response.data.data?.nodeGroups || [];
      setNodeGroups(groups);
      return groups;
    } catch (err) {
      console.error('Failed to fetch node groups:', err);
      return [];
    } finally {
      setLoading(prev => ({ ...prev, nodeGroups: false }));
    }
  }, []);

  /**
   * Get Kubernetes context for cluster
   */
  const getKubeContext = useCallback(async (credentialId, clusterName, region) => {
    try {
      const response = await api.post(`/container-deployments/eks/${credentialId}/cluster/${clusterName}/context`, {
        region
      });
      return response.data.data || response.data;
    } catch (err) {
      console.error('Failed to get kube context:', err);
      return null;
    }
  }, []);

  /**
   * Create a new EKS cluster
   */
  const createCluster = useCallback(async (credentialId, config) => {
    setLoading(prev => ({ ...prev, creating: true }));
    setError(null);
    
    try {
      const response = await api.post(`/container-deployments/eks/${credentialId}/cluster`, config);
      return {
        success: true,
        data: response.data.data || response.data,
      };
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to create cluster';
      setError(errorMsg);
      return {
        success: false,
        error: errorMsg,
      };
    } finally {
      setLoading(prev => ({ ...prev, creating: false }));
    }
  }, []);

  /**
   * Scale a node group
   */
  const scaleNodeGroup = useCallback(async (credentialId, clusterName, nodeGroupName, desiredSize, region) => {
    try {
      const response = await api.post(`/container-deployments/eks/${credentialId}/cluster/${clusterName}/nodegroups/${nodeGroupName}/scale`, {
        desiredSize,
        region,
      });
      return {
        success: true,
        data: response.data.data,
      };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.message || 'Failed to scale node group',
      };
    }
  }, []);

  /**
   * Get cluster endpoint configuration
   */
  const fetchEndpointConfig = useCallback(async (credentialId, clusterName, region) => {
    try {
      const response = await api.get(`/container-deployments/cluster/${credentialId}/endpoint-config`, {
        params: { clusterName, region }
      });
      return response.data.data;
    } catch (err) {
      console.error('Failed to fetch endpoint config:', err);
      return null;
    }
  }, []);

  /**
   * Select a cluster and load its details
   */
  const selectCluster = useCallback(async (cluster, credentialId, region) => {
    setSelectedCluster(cluster);
    if (cluster && credentialId) {
      await Promise.all([
        fetchClusterDetails(credentialId, cluster.name, region),
        fetchNodeGroups(credentialId, cluster.name, region),
      ]);
    }
  }, [fetchClusterDetails, fetchNodeGroups]);

  return {
    // State
    clusters,
    selectedCluster,
    clusterDetails,
    nodeGroups,
    loading,
    error,
    
    // Actions
    fetchClusters,
    fetchClusterDetails,
    fetchNodeGroups,
    getKubeContext,
    createCluster,
    scaleNodeGroup,
    fetchEndpointConfig,
    selectCluster,
    
    // Constants — provider-aware
    K8S_VERSIONS,
    INSTANCE_TYPES_BY_PROVIDER,
    REGIONS_BY_PROVIDER,
    // Legacy aliases for backwards compat
    EKS_VERSIONS: K8S_VERSIONS.aws,
    INSTANCE_TYPES: INSTANCE_TYPES_BY_PROVIDER.aws,
    AWS_REGIONS: REGIONS_BY_PROVIDER.aws,
  };
}

export default useClusterConfig;
