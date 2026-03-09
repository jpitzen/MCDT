/**
 * useStorage Hook
 * 
 * Handles storage configuration including:
 * - CSI driver management (provider-aware: EBS/EFS for AWS, Azure Disk/Files for Azure, etc.)
 * - Storage classes
 * - PVCs and PVs
 * 
 * Migrated from CloudDeploymentToolkit.jsx
 */

import { useState, useCallback } from 'react';
import api from '../../../services/api';

// Provider-specific storage class templates
const getStorageClassTemplates = (cloudProvider) => {
  switch (cloudProvider) {
    case 'azure':
      return {
        'azure-premium-default': {
          name: 'azure-premium-default',
          provisioner: 'disk.csi.azure.com',
          volumeBindingMode: 'WaitForFirstConsumer',
          reclaimPolicy: 'Delete',
          parameters: {
            skuName: 'Premium_LRS',
          },
          description: 'Default Premium SSD storage class for general workloads',
        },
        'azure-standard-ssd': {
          name: 'azure-standard-ssd',
          provisioner: 'disk.csi.azure.com',
          volumeBindingMode: 'WaitForFirstConsumer',
          reclaimPolicy: 'Retain',
          parameters: {
            skuName: 'StandardSSD_LRS',
          },
          description: 'Standard SSD with retained volumes',
        },
        'azure-premium-zrs': {
          name: 'azure-premium-zrs',
          provisioner: 'disk.csi.azure.com',
          volumeBindingMode: 'WaitForFirstConsumer',
          reclaimPolicy: 'Retain',
          parameters: {
            skuName: 'Premium_ZRS',
          },
          description: 'Zone-redundant Premium SSD for databases',
        },
        'azure-files-shared': {
          name: 'azure-files-shared',
          provisioner: 'file.csi.azure.com',
          volumeBindingMode: 'Immediate',
          reclaimPolicy: 'Retain',
          parameters: {
            skuName: 'Premium_LRS',
          },
          description: 'Azure Files share for multi-pod access',
        },
      };
    case 'gcp':
      return {
        'gcp-ssd-default': {
          name: 'gcp-ssd-default',
          provisioner: 'pd.csi.storage.gke.io',
          volumeBindingMode: 'WaitForFirstConsumer',
          reclaimPolicy: 'Delete',
          parameters: {
            type: 'pd-ssd',
          },
          description: 'Default SSD persistent disk for general workloads',
        },
        'gcp-balanced': {
          name: 'gcp-balanced',
          provisioner: 'pd.csi.storage.gke.io',
          volumeBindingMode: 'WaitForFirstConsumer',
          reclaimPolicy: 'Retain',
          parameters: {
            type: 'pd-balanced',
          },
          description: 'Balanced performance and cost',
        },
        'gcp-filestore-shared': {
          name: 'gcp-filestore-shared',
          provisioner: 'filestore.csi.storage.gke.io',
          volumeBindingMode: 'Immediate',
          reclaimPolicy: 'Retain',
          parameters: {
            tier: 'standard',
          },
          description: 'Filestore share for multi-pod access',
        },
      };
    case 'aws':
    default:
      return {
        'gp3-default': {
          name: 'gp3-default',
          provisioner: 'ebs.csi.aws.com',
          volumeBindingMode: 'WaitForFirstConsumer',
          reclaimPolicy: 'Delete',
          parameters: {
            type: 'gp3',
            encrypted: 'true',
          },
          description: 'Default GP3 storage class for general workloads',
        },
        'gp3-encrypted': {
          name: 'gp3-encrypted',
          provisioner: 'ebs.csi.aws.com',
          volumeBindingMode: 'WaitForFirstConsumer',
          reclaimPolicy: 'Retain',
          parameters: {
            type: 'gp3',
            encrypted: 'true',
            iops: '3000',
            throughput: '125',
          },
          description: 'Encrypted GP3 with retained volumes',
        },
        'io1-high-iops': {
          name: 'io1-high-iops',
          provisioner: 'ebs.csi.aws.com',
          volumeBindingMode: 'WaitForFirstConsumer',
          reclaimPolicy: 'Retain',
          parameters: {
            type: 'io1',
            iopsPerGB: '50',
            encrypted: 'true',
          },
          description: 'High IOPS IO1 storage for databases',
        },
        'efs-shared': {
          name: 'efs-shared',
          provisioner: 'efs.csi.aws.com',
          volumeBindingMode: 'Immediate',
          reclaimPolicy: 'Retain',
          parameters: {
            provisioningMode: 'efs-ap',
            fileSystemId: '', // To be filled
            directoryPerms: '700',
          },
          description: 'Shared EFS storage for multi-pod access',
        },
      };
  }
};

// Provider-specific CSI driver status key names
const getCSIDriverKeys = (cloudProvider) => {
  switch (cloudProvider) {
    case 'azure':
      return { block: 'azureDisk', file: 'azureFile', blockLabel: 'Azure Disk', fileLabel: 'Azure Files' };
    case 'gcp':
      return { block: 'gcpPd', file: 'gcpFilestore', blockLabel: 'GCP PD', fileLabel: 'GCP Filestore' };
    case 'digitalocean':
      return { block: 'doBlock', file: null, blockLabel: 'DO Block Storage', fileLabel: null };
    case 'linode':
      return { block: 'linodeBlock', file: null, blockLabel: 'Linode Block', fileLabel: null };
    case 'aws':
    default:
      return { block: 'ebs', file: 'efs', blockLabel: 'EBS', fileLabel: 'EFS' };
  }
};

export function useStorage(cloudProvider = 'aws') {
  const driverKeys = getCSIDriverKeys(cloudProvider);
  const [csiDriverStatus, setCsiDriverStatus] = useState({
    [driverKeys.block]: { installed: false, loading: false },
    ...(driverKeys.file ? { [driverKeys.file]: { installed: false, loading: false } } : {}),
  });
  const [storageClasses, setStorageClasses] = useState([]);
  const [storageClassTemplates, setStorageClassTemplates] = useState(getStorageClassTemplates(cloudProvider));
  const [pvcs, setPvcs] = useState([]);
  const [pvs, setPvs] = useState([]);
  const [loading, setLoading] = useState({
    csiDrivers: false,
    storageClasses: false,
    pvcs: false,
    pvs: false,
  });
  // eslint-disable-next-line no-unused-vars
  const [error, setError] = useState(null);

  /**
   * Fetch CSI driver status
   */
  const fetchCSIDriverStatus = useCallback(async () => {
    setLoading(prev => ({ ...prev, csiDrivers: true }));
    
    try {
      const response = await api.get('/container-deployments/storage/csi-drivers');
      const data = response.data.data || {};
      
      // Map response to provider-appropriate keys
      // The API may return generic keys (ebs/efs) or provider-specific keys
      const blockStatus = data[driverKeys.block] || data.ebs || { installed: false };
      const fileStatus = driverKeys.file ? (data[driverKeys.file] || data.efs || { installed: false }) : null;
      
      const newStatus = {
        [driverKeys.block]: { installed: blockStatus.installed || false, version: blockStatus.version },
        ...(driverKeys.file ? { [driverKeys.file]: { installed: fileStatus?.installed || false, version: fileStatus?.version } } : {}),
      };
      setCsiDriverStatus(newStatus);
      return data;
    } catch (err) {
      console.error('Failed to fetch CSI driver status:', err);
      return null;
    } finally {
      setLoading(prev => ({ ...prev, csiDrivers: false }));
    }
  }, [driverKeys]);

  /**
   * Install CSI driver
   */
  const installCSIDriver = useCallback(async (driverType, options = {}) => {
    setCsiDriverStatus(prev => ({
      ...prev,
      [driverType]: { ...prev[driverType], loading: true },
    }));
    
    try {
      const response = await api.post(`/container-deployments/storage/csi-drivers/${driverType}/install`, options);
      
      setCsiDriverStatus(prev => ({
        ...prev,
        [driverType]: { installed: true, loading: false, version: response.data.data?.version },
      }));
      
      return { success: true, data: response.data.data };
    } catch (err) {
      setCsiDriverStatus(prev => ({
        ...prev,
        [driverType]: { ...prev[driverType], loading: false },
      }));
      
      return {
        success: false,
        error: err.response?.data?.message || `Failed to install ${driverType} CSI driver`,
      };
    }
  }, []);

  /**
   * Fetch storage classes
   */
  const fetchStorageClasses = useCallback(async () => {
    setLoading(prev => ({ ...prev, storageClasses: true }));
    
    try {
      const response = await api.get('/container-deployments/storage/classes');
      const classes = response.data.data?.storageClasses || [];
      setStorageClasses(classes);
      return classes;
    } catch (err) {
      console.error('Failed to fetch storage classes:', err);
      return [];
    } finally {
      setLoading(prev => ({ ...prev, storageClasses: false }));
    }
  }, []);

  /**
   * Fetch storage class templates from server
   */
  const fetchStorageClassTemplates = useCallback(async () => {
    try {
      const response = await api.get('/container-deployments/storage/classes/templates');
      const templates = response.data.data?.templates || {};
      const defaults = getStorageClassTemplates(cloudProvider);
      setStorageClassTemplates({ ...defaults, ...templates });
      return templates;
    } catch (err) {
      console.error('Failed to fetch storage class templates:', err);
      return getStorageClassTemplates(cloudProvider);
    }
  }, [cloudProvider]);

  /**
   * Create a storage class
   */
  const createStorageClass = useCallback(async (config) => {
    try {
      const response = await api.post('/container-deployments/storage/classes', config);
      
      // Refresh storage classes
      await fetchStorageClasses();
      
      return { success: true, data: response.data.data };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.message || 'Failed to create storage class',
      };
    }
  }, [fetchStorageClasses]);

  /**
   * Delete a storage class
   */
  const deleteStorageClass = useCallback(async (name) => {
    try {
      await api.delete(`/container-deployments/storage/classes/${name}`);
      setStorageClasses(prev => prev.filter(sc => sc.name !== name));
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.message || 'Failed to delete storage class',
      };
    }
  }, []);

  /**
   * Fetch PVCs
   */
  const fetchPVCs = useCallback(async (namespace = null) => {
    setLoading(prev => ({ ...prev, pvcs: true }));
    
    try {
      const url = namespace
        ? `/container-deployments/storage/pvcs?namespace=${namespace}`
        : '/container-deployments/storage/pvcs';
      const response = await api.get(url);
      const pvcList = response.data.data?.pvcs || [];
      setPvcs(pvcList);
      return pvcList;
    } catch (err) {
      console.error('Failed to fetch PVCs:', err);
      return [];
    } finally {
      setLoading(prev => ({ ...prev, pvcs: false }));
    }
  }, []);

  /**
   * Fetch PVs
   */
  const fetchPVs = useCallback(async () => {
    setLoading(prev => ({ ...prev, pvs: true }));
    
    try {
      const response = await api.get('/container-deployments/storage/pvs');
      const pvList = response.data.data?.pvs || [];
      setPvs(pvList);
      return pvList;
    } catch (err) {
      console.error('Failed to fetch PVs:', err);
      return [];
    } finally {
      setLoading(prev => ({ ...prev, pvs: false }));
    }
  }, []);

  /**
   * Create a PVC
   */
  const createPVC = useCallback(async (config) => {
    try {
      const response = await api.post('/container-deployments/storage/pvcs', config);
      await fetchPVCs(config.namespace);
      return { success: true, data: response.data.data };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.message || 'Failed to create PVC',
      };
    }
  }, [fetchPVCs]);

  /**
   * Delete a PVC
   */
  const deletePVC = useCallback(async (name, namespace = 'default') => {
    try {
      await api.delete(`/container-deployments/storage/pvcs/${namespace}/${name}`);
      setPvcs(prev => prev.filter(pvc => pvc.name !== name || pvc.namespace !== namespace));
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.message || 'Failed to delete PVC',
      };
    }
  }, []);

  /**
   * Get storage summary
   */
  const getStorageSummary = useCallback(() => {
    const blockKey = driverKeys.block;
    const fileKey = driverKeys.file;
    return {
      blockStorageInstalled: csiDriverStatus[blockKey]?.installed || false,
      fileStorageInstalled: fileKey ? (csiDriverStatus[fileKey]?.installed || false) : false,
      // Legacy aliases for backward compatibility
      ebsInstalled: csiDriverStatus[blockKey]?.installed || false,
      efsInstalled: fileKey ? (csiDriverStatus[fileKey]?.installed || false) : false,
      storageClassCount: storageClasses.length,
      pvcCount: pvcs.length,
      pvCount: pvs.length,
      totalStorageGB: pvcs.reduce((sum, pvc) => {
        const capacity = pvc.status?.capacity?.storage || '0Gi';
        const gb = parseInt(capacity.replace(/[^0-9]/g, '')) || 0;
        return sum + gb;
      }, 0),
    };
  }, [csiDriverStatus, storageClasses, pvcs, pvs, driverKeys]);

  return {
    // State
    csiDriverStatus,
    storageClasses,
    storageClassTemplates,
    pvcs,
    pvs,
    loading,
    error,
    
    // Actions
    fetchCSIDriverStatus,
    installCSIDriver,
    fetchStorageClasses,
    fetchStorageClassTemplates,
    createStorageClass,
    deleteStorageClass,
    fetchPVCs,
    fetchPVs,
    createPVC,
    deletePVC,
    
    // Helpers
    getStorageSummary,
    driverKeys,
  };
}

export default useStorage;
