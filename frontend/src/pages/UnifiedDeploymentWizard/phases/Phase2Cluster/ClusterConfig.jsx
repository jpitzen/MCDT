import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  Chip,
  Slider,
  FormControlLabel,
  Switch,
  CircularProgress,
} from '@mui/material';
import CloudIcon from '@mui/icons-material/Cloud';
import AddIcon from '@mui/icons-material/Add';
import { useWizard } from '../../WizardContext';
import api from '../../../../services/api';
import { 
  getRegionsForProvider, 
  getProviderInfo, 
  getDefaultRegion 
} from '../../../../config/cloudProviders';

// AWS EKS supported Kubernetes versions (as of Dec 2025)
// Standard support: 1.34, 1.33, 1.32, 1.31
// Extended support: 1.30, 1.29, 1.28
// See: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
const K8S_VERSIONS = [
  '1.34',  // Latest
  '1.33',
  '1.32',
  '1.31',
  '1.30',
  '1.29',
  '1.28',  // Extended support
];

// Instance type options by provider
const INSTANCE_TYPES = {
  aws: [
    { value: 't3.medium', label: 't3.medium (2 vCPU, 4 GB RAM)', cost: '~$0.0416/hr' },
    { value: 't3.large', label: 't3.large (2 vCPU, 8 GB RAM)', cost: '~$0.0832/hr' },
    { value: 'm5.large', label: 'm5.large (2 vCPU, 8 GB RAM)', cost: '~$0.096/hr' },
    { value: 'm5.xlarge', label: 'm5.xlarge (4 vCPU, 16 GB RAM)', cost: '~$0.192/hr' },
    { value: 'm5.2xlarge', label: 'm5.2xlarge (8 vCPU, 32 GB RAM)', cost: '~$0.384/hr' },
    { value: 'c5.large', label: 'c5.large (2 vCPU, 4 GB RAM)', cost: '~$0.085/hr' },
    { value: 'c5.xlarge', label: 'c5.xlarge (4 vCPU, 8 GB RAM)', cost: '~$0.17/hr' },
  ],
  azure: [
    { value: 'Standard_DS2_v2', label: 'Standard_DS2_v2 (2 vCPU, 7 GB RAM)', cost: '~$0.14/hr' },
    { value: 'Standard_DS3_v2', label: 'Standard_DS3_v2 (4 vCPU, 14 GB RAM)', cost: '~$0.28/hr' },
    { value: 'Standard_D2s_v3', label: 'Standard_D2s_v3 (2 vCPU, 8 GB RAM)', cost: '~$0.096/hr' },
    { value: 'Standard_D4s_v3', label: 'Standard_D4s_v3 (4 vCPU, 16 GB RAM)', cost: '~$0.192/hr' },
  ],
  gcp: [
    { value: 'n1-standard-2', label: 'n1-standard-2 (2 vCPU, 7.5 GB RAM)', cost: '~$0.095/hr' },
    { value: 'n1-standard-4', label: 'n1-standard-4 (4 vCPU, 15 GB RAM)', cost: '~$0.19/hr' },
    { value: 'e2-standard-2', label: 'e2-standard-2 (2 vCPU, 8 GB RAM)', cost: '~$0.067/hr' },
    { value: 'e2-standard-4', label: 'e2-standard-4 (4 vCPU, 16 GB RAM)', cost: '~$0.134/hr' },
  ],
  digitalocean: [
    { value: 's-2vcpu-4gb', label: 's-2vcpu-4gb (2 vCPU, 4 GB RAM)', cost: '~$24/mo' },
    { value: 's-4vcpu-8gb', label: 's-4vcpu-8gb (4 vCPU, 8 GB RAM)', cost: '~$48/mo' },
    { value: 's-8vcpu-16gb', label: 's-8vcpu-16gb (8 vCPU, 16 GB RAM)', cost: '~$96/mo' },
    { value: 'c-2', label: 'c-2 CPU-Optimized (2 vCPU, 4 GB RAM)', cost: '~$42/mo' },
    { value: 'c-4', label: 'c-4 CPU-Optimized (4 vCPU, 8 GB RAM)', cost: '~$84/mo' },
    { value: 'g-2vcpu-8gb', label: 'g-2vcpu-8gb General (2 vCPU, 8 GB RAM)', cost: '~$63/mo' },
  ],
  linode: [
    { value: 'g6-standard-2', label: 'Linode 4GB (2 vCPU, 4 GB RAM)', cost: '~$24/mo' },
    { value: 'g6-standard-4', label: 'Linode 8GB (4 vCPU, 8 GB RAM)', cost: '~$48/mo' },
    { value: 'g6-standard-6', label: 'Linode 16GB (6 vCPU, 16 GB RAM)', cost: '~$96/mo' },
    { value: 'g6-dedicated-2', label: 'Dedicated 4GB (2 vCPU, 4 GB RAM)', cost: '~$36/mo' },
    { value: 'g6-dedicated-4', label: 'Dedicated 8GB (4 vCPU, 8 GB RAM)', cost: '~$72/mo' },
  ],
};

// CSI driver labels per provider
const CSI_LABELS = {
  aws: { block: 'EBS CSI Driver (Recommended)', blockDesc: 'Dynamic provisioning of EBS volumes for persistent storage', file: 'EFS CSI Driver', fileDesc: 'Shared file storage with ReadWriteMany access across pods' },
  azure: { block: 'Azure Disk CSI Driver (Recommended)', blockDesc: 'Dynamic provisioning of Azure Managed Disks for persistent storage', file: 'Azure Files CSI Driver', fileDesc: 'Shared file storage with ReadWriteMany access via Azure Files' },
  gcp: { block: 'Persistent Disk CSI Driver (Recommended)', blockDesc: 'Dynamic provisioning of GCE Persistent Disks for storage', file: 'Filestore CSI Driver', fileDesc: 'Shared NFS file storage with ReadWriteMany access via Filestore' },
  digitalocean: { block: 'Block Storage CSI Driver (Recommended)', blockDesc: 'Dynamic provisioning of DO Block Storage volumes', file: 'DO Spaces CSI Driver', fileDesc: 'S3-compatible object storage via CSI FUSE mount' },
  linode: { block: 'Block Storage CSI Driver (Recommended)', blockDesc: 'Dynamic provisioning of Linode Block Storage volumes', file: 'Object Storage CSI Driver', fileDesc: 'S3-compatible object storage via CSI FUSE mount' },
};

export default function ClusterConfig() {
  const { state, updateClusterConfig } = useWizard();
  const { clusterConfig, selectedCredential } = state;
  
  const cloudProvider = selectedCredential?.cloudProvider || 'aws';
  const providerInfo = getProviderInfo(cloudProvider);
  const defaultRegion = getDefaultRegion(cloudProvider);
  const instanceTypes = INSTANCE_TYPES[cloudProvider] || INSTANCE_TYPES.aws;
  const csiLabels = CSI_LABELS[cloudProvider] || CSI_LABELS.aws;
  
  // Region is set in Phase 1 - use it directly from clusterConfig
  const region = clusterConfig.region || selectedCredential?.awsRegion || defaultRegion;
  
  // State for dynamic regions (for display purposes)
  const [dynamicRegions, setDynamicRegions] = useState([]);
  const [regionsLoading, setRegionsLoading] = useState(false);
  const staticRegions = getRegionsForProvider(cloudProvider, 'all');
  const availableRegions = dynamicRegions.length > 0 ? dynamicRegions : staticRegions;
  
  // Find the friendly name for the current region
  const regionDisplay = availableRegions.find(r => r.value === region)?.label || region;
  
  // Fetch regions for display (not for selection - that's done in Phase 1)
  const fetchRegions = useCallback(async () => {
    if (!selectedCredential?.id) return;
    
    setRegionsLoading(true);
    try {
      const response = await api.get(`/container-deployments/cloud/regions/${selectedCredential.id}`);
      const data = response.data.data;
      
      if (data?.availableRegions?.length > 0) {
        const regions = data.availableRegions.map(r => ({
          value: r.id,
          label: r.name || r.id,
        }));
        setDynamicRegions(regions);
      }
    } catch (err) {
      console.warn('Failed to fetch regions:', err.message);
    } finally {
      setRegionsLoading(false);
    }
  }, [selectedCredential?.id]);

  useEffect(() => {
    if (selectedCredential?.id) {
      fetchRegions();
    }
  }, [selectedCredential?.id, fetchRegions]);

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    updateClusterConfig({ [field]: value });
  };

  const handleSliderChange = (field) => (event, newValue) => {
    updateClusterConfig({ [field]: newValue });
  };

  const handleSwitchChange = (field) => (event) => {
    updateClusterConfig({ [field]: event.target.checked });
  };

  // Mode is now set in Phase 1 Prerequisites
  const isExistingMode = clusterConfig.useExistingCluster;

  return (
    <Box>
      {/* Mode Display - Shows what was selected in Phase 1 */}
      <Card sx={{ mb: 3, bgcolor: isExistingMode ? 'rgba(46, 125, 50, 0.08)' : 'rgba(25, 118, 210, 0.08)', border: 1, borderColor: isExistingMode ? 'success.light' : 'primary.light' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            {isExistingMode ? <CloudIcon color="success" /> : <AddIcon color="primary" />}
            <Typography variant="h6">
              {isExistingMode ? 'Using Existing Cluster' : 'Creating New Cluster'}
            </Typography>
          </Box>
          
          {isExistingMode && clusterConfig.existingClusterName ? (
            <Box>
              <Typography variant="body2" color="text.secondary">
                Deploying to: <strong>{clusterConfig.existingClusterName}</strong>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                (Change this in Phase 1: Prerequisites → Deployment Mode)
              </Typography>
            </Box>
          ) : isExistingMode ? (
            <Alert severity="warning" sx={{ mt: 1 }}>
              No cluster selected. Please go back to Phase 1 and select a cluster.
            </Alert>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Configure your new cluster settings below
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Region Display - Set in Phase 1, shown as read-only here */}
      {!isExistingMode && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" gutterBottom>
                <span>{providerInfo.icon}</span> Target Region
              </Typography>
              {regionsLoading && <CircularProgress size={16} />}
            </Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              Region is configured in Phase 1 Prerequisites. Go back to change it.
            </Alert>
            <Chip 
              label={`${regionDisplay} (${region})`}
              color="primary"
              variant="outlined"
              sx={{ fontSize: '1rem', py: 2 }}
            />
          </CardContent>
        </Card>
      )}

      {/* Existing Cluster Info */}
      {isExistingMode && clusterConfig.existingClusterName && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Cluster Details</Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Chip 
                label={`Cluster: ${clusterConfig.existingClusterName}`} 
                color="primary" 
                variant="outlined" 
              />
              {region && (
                <Chip 
                  label={`Region: ${regionDisplay} (${region})`} 
                  variant="outlined" 
                />
              )}
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              The cluster configuration is managed by the existing infrastructure.
              Continue to the next phase to configure storage and deployments.
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* New Cluster Configuration - Only shown when creating new */}
      {!isExistingMode && (
        <>
          {/* Cluster Basics */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Cluster Basics
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Configure the basic settings for your Kubernetes cluster
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Cluster Name"
                    value={clusterConfig.clusterName || ''}
                    InputProps={{
                      readOnly: true,
                    }}
                    helperText={
                      clusterConfig.clusterName 
                        ? "Set in Phase 1 Prerequisites. Go back to change it."
                        : "Please set the cluster name in Phase 1 Prerequisites."
                    }
                    error={!clusterConfig.clusterName}
                    required
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Kubernetes Version</InputLabel>
                    <Select
                      value={clusterConfig.kubernetesVersion || '1.34'}
                      onChange={handleChange('kubernetesVersion')}
                      label="Kubernetes Version"
                    >
                      {K8S_VERSIONS.map((version) => (
                        <MenuItem key={version} value={version}>
                          {version} {version === K8S_VERSIONS[0] && '(Latest)'}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

      {/* Node Configuration */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Node Configuration
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Configure the worker nodes for your cluster
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Instance Type</InputLabel>
                <Select
                  value={clusterConfig.nodeType || instanceTypes[0]?.value}
                  onChange={handleChange('nodeType')}
                  label="Instance Type"
                >
                  {instanceTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                        <span>{type.label}</span>
                        <Chip label={type.cost} size="small" sx={{ ml: 2 }} />
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography gutterBottom>
                Node Count: {clusterConfig.nodeCount || 2}
              </Typography>
              <Slider
                value={clusterConfig.nodeCount || 2}
                onChange={handleSliderChange('nodeCount')}
                min={1}
                max={10}
                step={1}
                marks={[
                  { value: 1, label: '1' },
                  { value: 3, label: '3' },
                  { value: 5, label: '5' },
                  { value: 10, label: '10' },
                ]}
                valueLabelDisplay="auto"
              />
              <Typography variant="caption" color="text.secondary">
                Minimum recommended: 2 nodes for high availability
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Node Group Name"
                value={clusterConfig.nodeGroupName || 'default-ng'}
                onChange={handleChange('nodeGroupName')}
                helperText="Name for the default node group"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={clusterConfig.spotInstances || false}
                    onChange={handleSwitchChange('spotInstances')}
                  />
                }
                label="Use Spot/Preemptible Instances"
              />
              <Typography variant="caption" color="text.secondary" display="block">
                Save up to 90% cost with interruptible instances
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Auto Scaling */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Auto Scaling
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Configure automatic scaling for your node groups
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={clusterConfig.autoScaling || false}
                    onChange={handleSwitchChange('autoScaling')}
                  />
                }
                label="Enable Auto Scaling"
              />
            </Grid>

            {clusterConfig.autoScaling && (
              <>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Minimum Nodes"
                    value={clusterConfig.minNodes || 1}
                    onChange={handleChange('minNodes')}
                    inputProps={{ min: 1, max: 100 }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Maximum Nodes"
                    value={clusterConfig.maxNodes || 10}
                    onChange={handleChange('maxNodes')}
                    inputProps={{ min: 1, max: 1000 }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={clusterConfig.enableClusterAutoscaler || false}
                        onChange={handleSwitchChange('enableClusterAutoscaler')}
                      />
                    }
                    label="Enable Cluster Autoscaler"
                  />
                  <Typography variant="caption" color="text.secondary" display="block">
                    Automatically adjusts cluster size based on workload demands (requires Helm deployment)
                  </Typography>
                </Grid>
              </>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* CSI Drivers & Storage */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            CSI Drivers
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Container Storage Interface drivers for persistent storage
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={clusterConfig.enableEbsCsiDriver !== false}
                    onChange={handleSwitchChange('enableEbsCsiDriver')}
                  />
                }
                label={csiLabels.block}
              />
              <Typography variant="caption" color="text.secondary" display="block">
                {csiLabels.blockDesc}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={clusterConfig.enableEfsCsiDriver || false}
                    onChange={handleSwitchChange('enableEfsCsiDriver')}
                  />
                }
                label={csiLabels.file}
              />
              <Typography variant="caption" color="text.secondary" display="block">
                {csiLabels.fileDesc}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Private Cluster Configuration */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Cluster Access
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Configure API endpoint access for your cluster
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={clusterConfig.endpointPublicAccess !== false}
                    onChange={handleSwitchChange('endpointPublicAccess')}
                  />
                }
                label="Public API Endpoint"
              />
              <Typography variant="caption" color="text.secondary" display="block">
                Allow kubectl access from internet (can be restricted with CIDR)
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={clusterConfig.endpointPrivateAccess !== false}
                    onChange={handleSwitchChange('endpointPrivateAccess')}
                  />
                }
                label="Private API Endpoint"
              />
              <Typography variant="caption" color="text.secondary" display="block">
                Allow kubectl access from within VPC only
              </Typography>
            </Grid>
            {!clusterConfig.endpointPublicAccess && clusterConfig.endpointPrivateAccess && (
              <Grid item xs={12}>
                <Alert severity="warning">
                  <Typography variant="subtitle2">Private Cluster Mode</Typography>
                  <Typography variant="body2">
                    With public endpoint disabled, you'll need a bastion host or VPN to access kubectl.
                    Consider deploying an SSM-enabled EC2 instance for secure access.
                  </Typography>
                </Alert>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>


      {/* Cost Estimate */}
      <Alert severity="info" sx={{ mt: 2 }}>
        <Typography variant="subtitle2">Estimated Monthly Cost</Typography>
        <Typography variant="body2">
          Based on your current configuration, estimated cost is approximately{' '}
          <strong>${((clusterConfig.nodeCount || 2) * 80).toFixed(2)}/month</strong>.
          This includes compute, storage, and networking costs.
        </Typography>
      </Alert>
        </>
      )}
    </Box>
  );
}
