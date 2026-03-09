import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Card,
  CardContent,
  Typography,
  Alert,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  Collapse,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  CircularProgress,
  TextField,
  FormControl,
  FormHelperText,
  InputLabel,
  Select,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
  Radio,
  RadioGroup,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import BuildIcon from '@mui/icons-material/Build';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import SecurityIcon from '@mui/icons-material/Security';
import PolicyIcon from '@mui/icons-material/Policy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import InfoIcon from '@mui/icons-material/Info';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import CloudIcon from '@mui/icons-material/Cloud';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import { useWizard } from '../../WizardContext';
import ToolsCheck from './ToolsCheck';
import CredentialsSetup from './CredentialsSetup';
import api from '../../../../services/api';
import { 
  getRegionsForProvider, 
  getProviderInfo, 
  getDefaultRegion,
  getCloudTerminology 
} from '../../../../config/cloudProviders';

// Deployment Mode Selection Component
function DeploymentModeSetup() {
  const { state, updateClusterConfig, updateAzureConfig } = useWizard();
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [regionsLoading, setRegionsLoading] = useState(false);
  const [dynamicRegions, setDynamicRegions] = useState([]);
  const [regionsFromApi, setRegionsFromApi] = useState(false);

  const clusterMode = state.clusterConfig?.useExistingCluster ? 'existing' : 'new';
  const credentialId = state.selectedCredential?.id;
  const cloudProvider = state.selectedCredential?.cloudProvider || 'aws';
  const defaultRegion = getDefaultRegion(cloudProvider);
  const region = state.clusterConfig?.region || state.selectedCredential?.awsRegion || defaultRegion;
  
  // Get provider info for display
  const providerInfo = getProviderInfo(cloudProvider);
  
  // Get cloud-specific terminology
  const terms = getCloudTerminology(cloudProvider);
  
  // Fallback to static regions if API fails
  const staticRegions = getRegionsForProvider(cloudProvider, 'all');
  
  // Use dynamic regions from API if available, otherwise static fallback
  const availableRegions = dynamicRegions.length > 0 ? dynamicRegions : staticRegions;

  // Fetch regions dynamically from the cloud provider API
  const fetchRegions = useCallback(async () => {
    if (!credentialId) return;
    
    setRegionsLoading(true);
    try {
      const response = await api.get(`/container-deployments/cloud/regions/${credentialId}`);
      const data = response.data.data;
      
      if (data?.availableRegions?.length > 0) {
        // Convert API format { id, name } to dropdown format { value, label }
        const regions = data.availableRegions.map(r => ({
          value: r.id,
          label: r.name || r.id,
        }));
        setDynamicRegions(regions);
        setRegionsFromApi(data.fetchedFromApi || false);
        
        // If current region isn't in the list, update to default
        const regionValues = regions.map(r => r.value);
        if (region && !regionValues.includes(region) && data.defaultRegion) {
          updateClusterConfig({ region: data.defaultRegion });
        }
      }
    } catch (err) {
      console.warn('Failed to fetch regions from API, using static fallback:', err.message);
      setRegionsFromApi(false);
    } finally {
      setRegionsLoading(false);
    }
  }, [credentialId, region, updateClusterConfig]);

  // Fetch regions when credential changes
  useEffect(() => {
    if (credentialId) {
      fetchRegions();
    } else {
      setDynamicRegions([]);
      setRegionsFromApi(false);
    }
  }, [credentialId, fetchRegions]);

  // Fetch existing clusters when in existing mode
  const fetchClusters = useCallback(async () => {
    if (!credentialId || !region) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/container-deployments/cloud/clusters/${credentialId}`, {
        params: { region }
      });
      setClusters(response.data.data?.clusters || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch clusters');
      console.error('Failed to fetch clusters:', err);
    } finally {
      setLoading(false);
    }
  }, [credentialId, region]);

  useEffect(() => {
    if (clusterMode === 'existing' && credentialId && region) {
      fetchClusters();
    }
  }, [clusterMode, credentialId, region, fetchClusters]);

  const handleModeChange = (event, newMode) => {
    if (newMode !== null) {
      // When switching to existing mode, ensure region is set from credential
      const effectiveRegion = state.clusterConfig?.region || state.selectedCredential?.awsRegion || defaultRegion;
      updateClusterConfig({ 
        useExistingCluster: newMode === 'existing',
        existingClusterName: newMode === 'new' ? '' : state.clusterConfig?.existingClusterName,
        region: effectiveRegion,
      });
    }
  };

  const handleClusterSelect = (clusterName) => {
    // When selecting an existing cluster, also set the region from the credential
    const effectiveRegion = state.clusterConfig?.region || state.selectedCredential?.awsRegion || defaultRegion;
    updateClusterConfig({ 
      existingClusterName: clusterName,
      clusterName: clusterName,
      region: effectiveRegion,
    });
  };

  return (
    <Box>
      {/* Mode Selection */}
      <Card sx={{ mb: 3, bgcolor: 'rgba(25, 118, 210, 0.08)', border: 1, borderColor: 'primary.light' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Deployment Mode
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Choose whether to create new infrastructure or use existing resources
          </Typography>

          <ToggleButtonGroup
            value={clusterMode}
            exclusive
            onChange={handleModeChange}
            fullWidth
            sx={{ mb: 2 }}
          >
            <ToggleButton value="new" sx={{ py: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AddIcon />
                <Box sx={{ textAlign: 'left' }}>
                  <Typography variant="subtitle2">Create New</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Set up new cluster & resources
                  </Typography>
                </Box>
              </Box>
            </ToggleButton>
            <ToggleButton value="existing" sx={{ py: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CloudDoneIcon />
                <Box sx={{ textAlign: 'left' }}>
                  <Typography variant="subtitle2">Use Existing</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Deploy to existing cluster
                  </Typography>
                </Box>
              </Box>
            </ToggleButton>
          </ToggleButtonGroup>
        </CardContent>
      </Card>

      {/* Mode-specific content */}
      {clusterMode === 'new' ? (
        <Box>
          <Alert severity="info" icon={<CloudIcon />} sx={{ mb: 3 }}>
            <Typography variant="subtitle2">New Infrastructure Mode</Typography>
            <Typography variant="body2">
              The wizard will guide you through creating new {terms.iamRole}s, {terms.securityGroup}s, and a {terms.cluster}.
              Any existing resources with matching names will be detected and reused.
            </Typography>
          </Alert>

          {/* Cluster Name Input for New Cluster */}
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <span>{providerInfo.icon}</span> Cluster Name
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Enter a name for your new Kubernetes cluster
              </Typography>
              
              <TextField
                fullWidth
                label="Cluster Name"
                value={state.clusterConfig?.clusterName || ''}
                onChange={(e) => updateClusterConfig({ clusterName: e.target.value })}
                placeholder={terms.clusterPlaceholder}
                helperText={`This name will be used as a prefix for all ${terms.resourcePrefix}`}
                inputProps={{ maxLength: 40 }}
              />
            </CardContent>
          </Card>

          {/* Region Selector for New Cluster */}
          <Card variant="outlined">
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>{providerInfo.icon}</span> Target Region
                </Typography>
                {regionsLoading && <CircularProgress size={16} />}
                {!regionsLoading && regionsFromApi && (
                  <Chip size="small" label="Live from API" color="success" variant="outlined" />
                )}
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Select the {providerInfo.name} region where the new cluster will be created
              </Typography>
              
              <FormControl fullWidth disabled={regionsLoading}>
                <InputLabel>{providerInfo.name} Region</InputLabel>
                <Select
                  value={region || defaultRegion}
                  onChange={(e) => updateClusterConfig({ region: e.target.value })}
                  label={`${providerInfo.name} Region`}
                >
                  {availableRegions.map((r) => (
                    r.disabled ? (
                      <MenuItem key={r.value} value={r.value} disabled sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                        {r.label}
                      </MenuItem>
                    ) : (
                      <MenuItem key={r.value} value={r.value}>
                        {r.label} ({r.value})
                      </MenuItem>
                    )
                  ))}
                </Select>
                <FormHelperText>
                  This region will be used for all resources including {terms.vpc}, subnets, and the Kubernetes cluster
                </FormHelperText>
              </FormControl>
            </CardContent>
          </Card>

          {/* Azure Resource Group - only shown for Azure */}
          {cloudProvider === 'azure' && (
            <Card variant="outlined" sx={{ mt: 3 }}>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>{providerInfo.icon}</span> Resource Group
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Azure requires a Resource Group to organize all related resources. Enter a name for a new Resource Group or specify an existing one.
                </Typography>
                
                <TextField
                  fullWidth
                  label="Resource Group Name"
                  value={state.azureConfig?.resourceGroupName || ''}
                  onChange={(e) => updateAzureConfig({ resourceGroupName: e.target.value })}
                  placeholder="e.g., myapp-rg, aks-prod-rg"
                  helperText="The Resource Group will contain the AKS cluster and all associated resources"
                  inputProps={{ maxLength: 90 }}
                  sx={{ mb: 2 }}
                />
                
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={state.azureConfig?.useExistingResourceGroup || false}
                      onChange={(e) => updateAzureConfig({ useExistingResourceGroup: e.target.checked })}
                    />
                  }
                  label="Use existing Resource Group"
                />
                
                {state.azureConfig?.useExistingResourceGroup && (
                  <TextField
                    fullWidth
                    label="Existing Resource Group ID (optional)"
                    value={state.azureConfig?.existingResourceGroupId || ''}
                    onChange={(e) => updateAzureConfig({ existingResourceGroupId: e.target.value })}
                    placeholder="/subscriptions/.../resourceGroups/..."
                    helperText="If left empty, Terraform will look up the Resource Group by name"
                    sx={{ mt: 2 }}
                  />
                )}
              </CardContent>
            </Card>
          )}
        </Box>
      ) : (
        <Box>
          <Alert severity="info" icon={<CloudDoneIcon />} sx={{ mb: 2 }}>
            <Typography variant="subtitle2">Existing Infrastructure Mode</Typography>
            <Typography variant="body2">
              Select an existing cluster below. The wizard will verify roles and security configurations are properly set up.
            </Typography>
          </Alert>

          {!credentialId ? (
            <Alert severity="warning">
              Please select credentials first, then return here to choose an existing cluster.
            </Alert>
          ) : (
            <Card variant="outlined">
              <CardContent>
                {/* Region Selector for Existing Cluster Search */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2">Select Region</Typography>
                  {regionsLoading && <CircularProgress size={16} />}
                  {!regionsLoading && regionsFromApi && (
                    <Chip size="small" label="Live from API" color="success" variant="outlined" />
                  )}
                </Box>
                <FormControl fullWidth sx={{ mb: 3 }} disabled={regionsLoading}>
                  <InputLabel>{providerInfo.name} Region</InputLabel>
                  <Select
                    value={region || defaultRegion}
                    onChange={(e) => updateClusterConfig({ region: e.target.value })}
                    label={`${providerInfo.name} Region`}
                  >
                    {availableRegions.map((r) => (
                      r.disabled ? (
                        <MenuItem key={r.value} value={r.value} disabled sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                          {r.label}
                        </MenuItem>
                      ) : (
                        <MenuItem key={r.value} value={r.value}>
                          {r.label} ({r.value})
                        </MenuItem>
                      )
                    ))}
                  </Select>
                  <FormHelperText>
                    Select the region to search for existing clusters
                  </FormHelperText>
                </FormControl>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1">Available Clusters in {region || defaultRegion}</Typography>
                  <Button
                    size="small"
                    startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
                    onClick={fetchClusters}
                    disabled={loading || !region}
                  >
                    Refresh
                  </Button>
                </Box>

                {error && (
                  <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
                )}

                {loading ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2 }}>
                    <CircularProgress size={24} />
                    <Typography>Loading clusters...</Typography>
                  </Box>
                ) : clusters.length === 0 ? (
                  <Alert severity="info">
                    No clusters found in {region || defaultRegion}. You may need to create a new cluster or check another region.
                  </Alert>
                ) : (
                  <RadioGroup
                    value={state.clusterConfig?.existingClusterName || ''}
                    onChange={(e) => handleClusterSelect(e.target.value)}
                  >
                    {clusters.map((cluster) => (
                      <FormControlLabel
                        key={cluster.name}
                        value={cluster.name}
                        control={<Radio />}
                        label={
                          <Box>
                            <Typography variant="subtitle2">{cluster.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              Status: {cluster.status} • Version: {cluster.version}
                            </Typography>
                          </Box>
                        }
                        sx={{
                          border: 1,
                          borderColor: state.clusterConfig?.existingClusterName === cluster.name ? 'primary.main' : 'divider',
                          borderRadius: 1,
                          p: 1,
                          mb: 1,
                          bgcolor: state.clusterConfig?.existingClusterName === cluster.name ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
                          '&:hover': { bgcolor: 'action.hover' },
                        }}
                      />
                    ))}
                  </RadioGroup>
                )}
              </CardContent>
            </Card>
          )}
        </Box>
      )}
    </Box>
  );
}

// IAM Roles Setup Component with automatic creation
function IAMRolesSetup() {
  const { state } = useWizard();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Get cloud provider and terminology
  const cloudProvider = state.selectedCredential?.cloudProvider || 'aws';
  const terms = getCloudTerminology(cloudProvider);
  
  // Get cluster name directly from global state
  const defaultClusterName = cloudProvider === 'azure' ? 'aks' : cloudProvider === 'gcp' ? 'gke' : 'eks';
  const clusterName = state.clusterConfig?.useExistingCluster 
    ? state.clusterConfig?.existingClusterName 
    : (state.clusterConfig?.clusterName || defaultClusterName);

  const credentialId = state.selectedCredential?.id;
  const isExistingCluster = state.clusterConfig?.useExistingCluster;
  const region = state.clusterConfig?.region;

  const fetchRoleStatus = useCallback(async () => {
    if (!credentialId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/container-deployments/prerequisites/iam/${credentialId}`, {
        params: { clusterName }
      });
      console.log('IAM roles response:', response.data);
      const roles = response.data.data?.roles || [];
      console.log('Parsed roles:', roles);
      setRoles(roles);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to check IAM roles');
      console.error('Failed to check IAM roles:', err);
    } finally {
      setLoading(false);
    }
  }, [credentialId, clusterName]);

  useEffect(() => {
    if (credentialId && clusterName) {
      fetchRoleStatus();
    }
  }, [credentialId, clusterName, fetchRoleStatus]);

  // NOTE: Create functions removed - Terraform manages IAM role creation

  const getStatusIcon = (role) => {
    if (loading) {
      return <CircularProgress size={20} />;
    }
    if (role.status === 'exists' && role.allPoliciesAttached) {
      return <CheckCircleIcon color="success" />;
    }
    if (role.status === 'exists') {
      return <CheckCircleIcon color="warning" />;
    }
    if (role.status === 'error') {
      return <ErrorIcon color="error" />;
    }
    return <CheckCircleIcon color="disabled" />;
  };

  const getStatusChip = (role) => {
    if (role.status === 'exists' && role.allPoliciesAttached) {
      return <Chip label="Ready" size="small" color="success" />;
    }
    if (role.status === 'exists') {
      return <Chip label="Missing Policies" size="small" color="warning" />;
    }
    if (role.required) {
      return <Chip label="Required" size="small" color="error" variant="outlined" />;
    }
    return <Chip label={role.requiredFor || 'Optional'} size="small" variant="outlined" />;
  };

  const allRequiredReady = roles
    .filter(r => r.required)
    .every(r => r.status === 'exists' && r.allPoliciesAttached);

  const missingRoles = roles.filter(r => r.status !== 'exists');

  if (!credentialId) {
    return (
      <Alert severity="warning">
        Please select a credential first to check {terms.iamRole}s.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Configuration Summary - shows cluster name and region from Phase 1 */}
      <Alert severity="info" sx={{ mb: 2 }} icon={<InfoIcon />}>
        <Typography variant="body2">
          {isExistingCluster ? (
            <>Using existing cluster: <strong>{clusterName}</strong> in <strong>{region}</strong></>
          ) : (
            <>Creating new cluster: <strong>{clusterName || '(not set)'}</strong> in <strong>{region || '(not set)'}</strong></>
          )}
        </Typography>
        {!isExistingCluster && !clusterName && (
          <Typography variant="caption" color="error">
            Please set the cluster name in the Deployment Mode tab above.
          </Typography>
        )}
      </Alert>

      {/* Cluster Name Input removed - now set in DeploymentModeSetup */}

      {/* Terraform Info */}
      <Alert severity="info" sx={{ mb: 3 }} icon={<InfoIcon />}>
        <Typography variant="subtitle2">{terms.iamRole}s Managed by Terraform</Typography>
        <Typography variant="body2">
          {terms.iamRole}s will be automatically created by Terraform during deployment. This section shows what roles 
          are required and their current status for informational purposes only.
        </Typography>
      </Alert>

      {/* Status Summary */}
      {allRequiredReady ? (
        <Alert severity="success" sx={{ mb: 3 }}>
          <Typography variant="subtitle2">All Required {terms.iamRole}s Ready</Typography>
          <Typography variant="body2">
            All required {terms.iamRole}s already exist. Terraform will use or update these during deployment.
          </Typography>
        </Alert>
      ) : (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="subtitle2">{terms.iamRole}s Will Be Created</Typography>
          <Typography variant="body2">
            {missingRoles.length} role(s) do not exist yet. Terraform will create them during deployment.
          </Typography>
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Action Buttons - Check Status only */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Button
          variant="outlined"
          startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
          onClick={fetchRoleStatus}
          disabled={loading}
        >
          Check Status
        </Button>
      </Box>

      {/* Roles List */}
      {loading && roles.length === 0 ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2 }}>
          <CircularProgress size={24} />
          <Typography>Checking {terms.iamRole}s...</Typography>
        </Box>
      ) : roles.length === 0 ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          Click "Check Status" to verify {terms.iamRole}s for your cluster.
        </Alert>
      ) : null}
      
      {/* Group roles by category */}
      {roles.length > 0 && (
        <>
          {['Cluster', 'Storage', 'Networking', 'Scaling'].map((category) => {
            const categoryRoles = roles.filter(r => r.category === category);
            if (categoryRoles.length === 0) return null;
            
            return (
              <Box key={category} sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'medium', color: 'text.secondary' }}>
                  {category} Roles
                </Typography>
                <List disablePadding>
                  {categoryRoles.map((role) => (
                    <ListItem
                      key={role.id}
                      sx={{
                        border: 1,
                        borderColor: role.status === 'exists' ? 'success.light' : 'divider',
                        borderRadius: 1,
                        mb: 1,
                        bgcolor: role.status === 'exists' ? 'rgba(46, 125, 50, 0.08)' : 'transparent',
                      }}
                      secondaryAction={
                        role.status !== 'exists' && (
                          <Chip 
                            label="Will be created" 
                            size="small" 
                            color="info" 
                            variant="outlined"
                          />
                        )
                      }
                    >
                      <ListItemIcon>{getStatusIcon(role)}</ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle2">{role.name}</Typography>
                            {getStatusChip(role)}
                          </Box>
                        }
                        secondary={
                          <Box component="span" sx={{ display: 'block' }}>
                            <Typography component="span" variant="body2" color="text.secondary" sx={{ display: 'block' }}>
                              {role.description}
                            </Typography>
                            {role.status === 'exists' && role.arn && (
                              <Typography component="span" variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', display: 'block' }}>
                                {role.arn}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            );
          })}
          
          {/* Show uncategorized roles if any */}
          {roles.filter(r => !r.category).length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'medium', color: 'text.secondary' }}>
                Other Roles
              </Typography>
              <List disablePadding>
                {roles.filter(r => !r.category).map((role) => (
                  <ListItem
                    key={role.id}
                    sx={{
                      border: 1,
                      borderColor: role.status === 'exists' ? 'success.light' : 'divider',
                      borderRadius: 1,
                      mb: 1,
                      bgcolor: role.status === 'exists' ? 'rgba(46, 125, 50, 0.08)' : 'transparent',
                    }}
                    secondaryAction={
                      role.status !== 'exists' && (
                        <Chip 
                          label="Will be created" 
                          size="small" 
                          color="info" 
                          variant="outlined"
                        />
                      )
                    }
                  >
                    <ListItemIcon>{getStatusIcon(role)}</ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle2">{role.name}</Typography>
                          {getStatusChip(role)}
                        </Box>
                      }
                      secondary={
                        <Box component="span" sx={{ display: 'block' }}>
                          <Typography component="span" variant="body2" color="text.secondary" sx={{ display: 'block' }}>
                            {role.description}
                          </Typography>
                          {role.status === 'exists' && role.arn && (
                            <Typography component="span" variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', display: 'block' }}>
                              {role.arn}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </>
      )}

      {/* Info Box */}
      <Box sx={{ mt: 3, p: 2, bgcolor: 'rgba(25, 118, 210, 0.08)', borderRadius: 1, border: 1, borderColor: 'primary.light' }}>
        <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.primary' }}>
          <InfoIcon fontSize="small" color="primary" />
          About {terms.iamRole}s
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          <strong>Cluster Roles:</strong> Required for {terms.controlPlane} and {terms.workerNodes}.<br />
          <strong>Storage Roles:</strong> Enable CSI drivers for persistent volumes.<br />
          <strong>Networking Roles:</strong> Allow {terms.networkingRole} for load balancer ingress.<br />
          <strong>Scaling Roles:</strong> Enable Cluster Autoscaler for dynamic node scaling.
        </Typography>
      </Box>
    </Box>
  );
}

// Security Groups Setup Component - Status check only (Terraform creates these)
function SecurityGroupsSetup() {
  const { state, setSecurityGroups: saveSecurityGroups } = useWizard();
  const [securityGroups, setSecurityGroups] = useState([]);
  const [existingSecurityGroups, setExistingSecurityGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [vpcId, setVpcId] = useState('');
  const [vpcs, setVpcs] = useState([]);
  const [loadingVpcs, setLoadingVpcs] = useState(false);
  const [showExisting, setShowExisting] = useState(false);

  // Get cloud provider and terminology
  const cloudProvider = state.selectedCredential?.cloudProvider || 'aws';
  const terms = getCloudTerminology(cloudProvider);
  const defaultRegion = getDefaultRegion(cloudProvider);

  const credentialId = state.selectedCredential?.id;
  const region = state.clusterConfig?.region || defaultRegion;
  const isExistingCluster = state.clusterConfig?.useExistingCluster;
  
  // Get cluster name from existing selection or use new cluster name or default
  const defaultClusterName = cloudProvider === 'azure' ? 'aks' : cloudProvider === 'gcp' ? 'gke' : 'eks';
  const effectiveClusterName = isExistingCluster 
    ? state.clusterConfig?.existingClusterName 
    : state.clusterConfig?.clusterName;
  const [clusterName, setClusterName] = useState(effectiveClusterName || defaultClusterName);

  // Update clusterName when the effective name changes
  useEffect(() => {
    if (effectiveClusterName) {
      setClusterName(effectiveClusterName);
    }
  }, [effectiveClusterName]);

  // Fetch VPCs when region changes
  const fetchVpcs = useCallback(async () => {
    if (!credentialId || !region) return;
    
    setLoadingVpcs(true);
    try {
      const response = await api.get(`/container-deployments/vpc/${credentialId}/list`, {
        params: { region }
      });
      setVpcs(response.data.data?.vpcs || []);
    } catch (err) {
      console.error('Failed to fetch VPCs:', err);
    } finally {
      setLoadingVpcs(false);
    }
  }, [credentialId, region]);

  useEffect(() => {
    fetchVpcs();
  }, [fetchVpcs]);

  const fetchSecurityGroupStatus = useCallback(async () => {
    if (!credentialId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/container-deployments/prerequisites/security-groups/${credentialId}`, {
        params: { region, vpcId: vpcId || undefined, clusterName }
      });
      const fetchedSecurityGroups = response.data.data?.securityGroups || [];
      setSecurityGroups(fetchedSecurityGroups);
      setExistingSecurityGroups(response.data.data?.existingSecurityGroups || []);
      // Save to wizard context for use in Phase 2
      saveSecurityGroups(fetchedSecurityGroups);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to check security groups');
      console.error('Failed to check security groups:', err);
    } finally {
      setLoading(false);
    }
  }, [credentialId, region, vpcId, clusterName, saveSecurityGroups]);

  useEffect(() => {
    if (credentialId && vpcId) {
      fetchSecurityGroupStatus();
    }
  }, [credentialId, vpcId, fetchSecurityGroupStatus]);

  // NOTE: Create functions removed - Terraform manages security group creation

  const getStatusIcon = (sg) => {
    if (loading) {
      return <CircularProgress size={20} />;
    }
    if (sg.status === 'exists') {
      return <CheckCircleIcon color="success" />;
    }
    if (sg.status === 'error') {
      return <ErrorIcon color="error" />;
    }
    return <SecurityIcon color="disabled" />;
  };

  const getStatusChip = (sg) => {
    if (sg.status === 'exists') {
      return <Chip label="Ready" size="small" color="success" />;
    }
    if (sg.required) {
      return <Chip label="Required" size="small" color="error" variant="outlined" />;
    }
    return <Chip label={sg.requiredFor || 'Optional'} size="small" variant="outlined" />;
  };

  const allRequiredReady = securityGroups
    .filter(sg => sg.required)
    .every(sg => sg.status === 'exists');

  const missingSecurityGroups = securityGroups.filter(sg => sg.status !== 'exists');

  if (!credentialId) {
    return (
      <Alert severity="warning">
        Please select a credential first to manage security groups.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Mode indicator */}
      {isExistingCluster && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            Checking security groups for existing cluster: <strong>{clusterName}</strong>
          </Typography>
        </Alert>
      )}

      {/* Configuration Inputs */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <FormControl sx={{ minWidth: 300 }} size="small">
          <InputLabel>VPC</InputLabel>
          <Select
            value={vpcId}
            onChange={(e) => setVpcId(e.target.value)}
            label="VPC"
            disabled={loadingVpcs}
            endAdornment={loadingVpcs && <CircularProgress size={20} sx={{ mr: 3 }} />}
          >
            <MenuItem value="">
              <em>Select a VPC</em>
            </MenuItem>
            {vpcs.map((vpc) => (
              <MenuItem key={vpc.vpcId} value={vpc.vpcId}>
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="body2">
                    {vpc.name || vpc.vpcId}
                    {vpc.isDefault && ' (Default)'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {vpc.vpcId} • {vpc.cidrBlock}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
          <FormHelperText>Select VPC to check/create security groups</FormHelperText>
        </FormControl>
        {!isExistingCluster && (
          <TextField
            label="Cluster Name Prefix"
            value={clusterName}
            onChange={(e) => setClusterName(e.target.value)}
            size="small"
            helperText="Used as prefix for SG names"
            sx={{ minWidth: 200 }}
          />
        )}
        <TextField
          label="Region"
          value={region}
          size="small"
          disabled
          sx={{ minWidth: 150 }}
        />
      </Box>

      {/* Terraform Info */}
      <Alert severity="info" sx={{ mb: 3 }} icon={<InfoIcon />}>
        <Typography variant="subtitle2">Security Groups Managed by Terraform</Typography>
        <Typography variant="body2">
          Security groups will be automatically created by Terraform during deployment. This section shows what 
          security groups are required and their current status for informational purposes only.
        </Typography>
      </Alert>

      {/* Status Summary */}
      {vpcId && allRequiredReady ? (
        <Alert severity="success" sx={{ mb: 3 }}>
          <Typography variant="subtitle2">All Required Security Groups Ready</Typography>
          <Typography variant="body2">
            All required security groups already exist. Terraform will use or update these during deployment.
          </Typography>
        </Alert>
      ) : vpcId ? (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="subtitle2">Security Groups Will Be Created</Typography>
          <Typography variant="body2">
            {missingSecurityGroups.length} security group(s) do not exist yet. Terraform will create them during deployment.
          </Typography>
        </Alert>
      ) : (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="subtitle2">Select a VPC</Typography>
          <Typography variant="body2">
            Select a VPC from the dropdown to check existing security groups.
          </Typography>
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Action Buttons - Check Status only */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Button
          variant="outlined"
          startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
          onClick={fetchSecurityGroupStatus}
          disabled={loading || !vpcId}
        >
          Check Status
        </Button>
      </Box>

      {/* Loading/Empty state */}
      {loading && securityGroups.length === 0 && vpcId && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2 }}>
          <CircularProgress size={20} />
          <Typography color="text.secondary">Checking security groups...</Typography>
        </Box>
      )}
      {!vpcId && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Select a VPC to check security group status.
        </Alert>
      )}

      {/* Security Groups grouped by category */}
      {securityGroups.length > 0 && (
        <>
          {['Access', 'Cluster', 'Storage', 'Networking'].map((category) => {
            const categorySgs = securityGroups.filter(sg => sg.category === category);
            if (categorySgs.length === 0) return null;
            
            return (
              <Box key={category} sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'medium', color: 'text.secondary' }}>
                  {category} Security Groups
                </Typography>
                <List disablePadding>
                  {categorySgs.map((sg) => (
                    <ListItem
                      key={sg.id}
                      sx={{
                        border: 1,
                        borderColor: sg.status === 'exists' ? 'success.light' : 'divider',
                        borderRadius: 1,
                        mb: 1,
                        bgcolor: sg.status === 'exists' ? 'rgba(46, 125, 50, 0.08)' : 'transparent',
                      }}
                      secondaryAction={
                        sg.status !== 'exists' && vpcId && (
                          <Chip 
                            label="Will be created" 
                            size="small" 
                            color="info" 
                            variant="outlined"
                          />
                        )
                      }
                    >
                      <ListItemIcon>{getStatusIcon(sg)}</ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle2">{sg.name}</Typography>
                            {getStatusChip(sg)}
                          </Box>
                        }
                        secondary={
                          <Box component="span" sx={{ display: 'block' }}>
                            <Typography component="span" variant="body2" color="text.secondary" sx={{ display: 'block' }}>
                              {sg.description}
                            </Typography>
                            {sg.status === 'exists' && sg.groupId && (
                              <Typography component="span" variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', display: 'block' }}>
                                {sg.groupId}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            );
          })}
          
          {/* Show uncategorized security groups if any */}
          {securityGroups.filter(sg => !sg.category).length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'medium', color: 'text.secondary' }}>
                Other Security Groups
              </Typography>
              <List disablePadding>
                {securityGroups.filter(sg => !sg.category).map((sg) => (
                  <ListItem
                    key={sg.id}
                    sx={{
                      border: 1,
                      borderColor: sg.status === 'exists' ? 'success.light' : 'divider',
                      borderRadius: 1,
                      mb: 1,
                      bgcolor: sg.status === 'exists' ? 'rgba(46, 125, 50, 0.08)' : 'transparent',
                    }}
                    secondaryAction={
                      sg.status !== 'exists' && vpcId && (
                        <Chip 
                          label="Will be created" 
                          size="small" 
                          color="info" 
                          variant="outlined"
                        />
                      )
                    }
                  >
                    <ListItemIcon>{getStatusIcon(sg)}</ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle2">{sg.name}</Typography>
                          {getStatusChip(sg)}
                        </Box>
                      }
                      secondary={
                        <Box component="span" sx={{ display: 'block' }}>
                          <Typography component="span" variant="body2" color="text.secondary" sx={{ display: 'block' }}>
                            {sg.description}
                          </Typography>
                          {sg.status === 'exists' && sg.groupId && (
                            <Typography component="span" variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', display: 'block' }}>
                              {sg.groupId}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </>
      )}

      {/* Existing Security Groups in VPC */}
      {existingSecurityGroups.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Button
            onClick={() => setShowExisting(!showExisting)}
            endIcon={showExisting ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            sx={{ mb: 1 }}
          >
            {showExisting ? 'Hide' : 'Show'} Existing Security Groups ({existingSecurityGroups.length})
          </Button>
          <Collapse in={showExisting}>
            <List dense sx={{ bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
              {existingSecurityGroups.map((sg) => (
                <ListItem key={sg.groupId}>
                  <ListItemIcon>
                    <SecurityIcon color={sg.isEksClusterSg || sg.isEksNodeSg ? 'primary' : 'action'} fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2">{sg.name || sg.groupName}</Typography>
                        {sg.isEksClusterSg && <Chip label={`${terms.cluster}`} size="small" color="primary" variant="outlined" />}
                        {sg.isEksNodeSg && <Chip label={`${terms.nodeGroup}`} size="small" color="secondary" variant="outlined" />}
                      </Box>
                    }
                    secondary={
                      <Typography component="span" variant="caption" sx={{ fontFamily: 'monospace' }}>
                        {sg.groupId} • {sg.inboundRules?.length || 0} inbound, {sg.outboundRules?.length || 0} outbound rules
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Collapse>
        </Box>
      )}

      {/* Info Box */}
      <Box sx={{ mt: 3, p: 2, bgcolor: 'rgba(25, 118, 210, 0.08)', borderRadius: 1, border: 1, borderColor: 'primary.light' }}>
        <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.primary' }}>
          <InfoIcon fontSize="small" color="primary" />
          About {terms.securityGroup}s
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          <strong>Access:</strong> Secure node access without exposing SSH/RDP ports.<br />
          <strong>Cluster:</strong> Additional security rules for {terms.controlPlane} communication.<br />
          <strong>Storage:</strong> {terms.fileStorage} security rules for NFS traffic (port 2049).<br />
          <strong>Networking:</strong> {terms.lb} security rules for internal and external load balancers.
        </Typography>
      </Box>
    </Box>
  );
}

// Sub-step definitions for Phase 1 - dynamically generated based on cloud provider
const getPrerequisitesSteps = (cloudProvider) => {
  const terms = getCloudTerminology(cloudProvider);
  
  return [
    {
      key: 'tools',
      label: 'Verify Tools',
      description: 'Check that required CLI tools are installed and configured',
      icon: <BuildIcon />,
      component: ToolsCheck,
    },
    {
      key: 'credentials',
      label: 'Select Credentials',
      description: 'Choose cloud provider credentials for deployment',
      icon: <VpnKeyIcon />,
      component: CredentialsSetup,
    },
    {
      key: 'mode',
      label: 'Deployment Mode',
      description: 'Create new infrastructure or use existing resources',
      icon: <CloudIcon />,
      component: DeploymentModeSetup,
    },
    {
      key: 'iam',
      label: `${terms.iamRole}s & Policies`,
      description: `View required ${terms.iamRole.toLowerCase()}s (created by Terraform during deployment)`,
      icon: <PolicyIcon />,
      component: IAMRolesSetup,
      optional: true, // Terraform creates these automatically
    },
    {
      key: 'security',
      label: `${terms.securityGroup}s`,
      description: `View required ${terms.securityGroup.toLowerCase()}s (created by Terraform during deployment)`,
      icon: <SecurityIcon />,
      component: SecurityGroupsSetup,
      optional: true, // Terraform creates these during deployment
    },
  ];
};

function GuidedMode() {
  const { state, setSubStep } = useWizard();
  const [activeStep, setActiveStep] = useState(state.subStep || 0);
  
  // Get cloud provider from selected credential
  const cloudProvider = state.selectedCredential?.cloudProvider || 'aws';
  const prerequisitesSteps = getPrerequisitesSteps(cloudProvider);

  const handleNext = () => {
    const nextStep = activeStep + 1;
    setActiveStep(nextStep);
    setSubStep(nextStep);
  };

  const handleBack = () => {
    const prevStep = activeStep - 1;
    setActiveStep(prevStep);
    setSubStep(prevStep);
  };

  const isStepComplete = (stepKey) => {
    const prereqs = state.prerequisites || {};
    if (stepKey === 'tools') {
      // Check if prerequisites summary shows ready status
      return prereqs.summary?.ready === true || prereqs.toolsVerified === true;
    }
    if (stepKey === 'credentials') {
      return !!state.selectedCredential;
    }
    if (stepKey === 'mode') {
      // Mode is complete if either:
      // - New mode selected (default)
      // - Existing mode selected AND a cluster is chosen
      const config = state.clusterConfig || {};
      if (config.useExistingCluster) {
        return !!config.existingClusterName;
      }
      return true; // New mode is valid by default
    }
    // IAM and Security are optional/informational steps
    // Mark them complete once user has viewed them (or skip entirely)
    if (stepKey === 'iam' || stepKey === 'security') {
      return prereqs[`${stepKey}Reviewed`] === true || true; // Allow skipping for now
    }
    return false;
  };

  return (
    <Box>
      <Stepper activeStep={activeStep} orientation="vertical">
        {prerequisitesSteps.map((step, index) => {
          const StepComponent = step.component;
          const complete = isStepComplete(step.key);

          return (
            <Step key={step.key} completed={complete}>
              <StepLabel
                optional={
                  complete ? (
                    <Typography variant="caption" color="success.main">
                      Complete
                    </Typography>
                  ) : step.optional ? (
                    <Typography variant="caption" color="info.main">
                      Optional
                    </Typography>
                  ) : null
                }
                StepIconComponent={complete ? () => <CheckCircleIcon color="success" /> : undefined}
              >
                <Typography variant="subtitle1">{step.label}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {step.description}
                </Typography>
              </StepLabel>
              <StepContent>
                <Box sx={{ py: 2 }}>
                  <StepComponent />
                </Box>
                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                  <Button
                    disabled={index === 0}
                    onClick={handleBack}
                  >
                    Back
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    disabled={!complete}
                  >
                    {index === prerequisitesSteps.length - 1 ? 'Complete Phase' : 'Continue'}
                  </Button>
                </Box>
              </StepContent>
            </Step>
          );
        })}
      </Stepper>

      {activeStep === prerequisitesSteps.length && (
        <Alert severity="success" sx={{ mt: 3 }}>
          <Typography variant="subtitle1">Prerequisites Complete!</Typography>
          <Typography variant="body2">
            All prerequisite checks have passed. You can now proceed to cluster configuration.
          </Typography>
        </Alert>
      )}
    </Box>
  );
}

function ExpertMode() {
  const { state } = useWizard();
  const [activeTab, setActiveTab] = useState(0);
  const [expandedSections, setExpandedSections] = useState({
    tools: true,
    credentials: true,
    iam: false,
    security: false,
  });
  
  // Get cloud provider from selected credential
  const cloudProvider = state.selectedCredential?.cloudProvider || 'aws';
  const prerequisitesSteps = getPrerequisitesSteps(cloudProvider);

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  return (
    <Box>
      {/* Tabbed interface for expert mode */}
      <Tabs
        value={activeTab}
        onChange={(e, newValue) => setActiveTab(newValue)}
        sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
      >
        <Tab icon={<BuildIcon />} label="All Prerequisites" />
      </Tabs>

      {/* All sections visible with collapsible headers */}
      <Box>
        {prerequisitesSteps.map((step) => {
          const StepComponent = step.component;
          const expanded = expandedSections[step.key];

          return (
            <Card key={step.key} sx={{ mb: 2, bgcolor: 'rgba(25, 118, 210, 0.08)', border: 1, borderColor: 'primary.light' }}>
              <CardContent sx={{ pb: expanded ? 2 : '16px !important' }}>
                <Box
                  onClick={() => toggleSection(step.key)}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    '&:hover': { backgroundColor: 'action.hover' },
                    mx: -2,
                    px: 2,
                    py: 1,
                    borderRadius: 1,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        backgroundColor: 'primary.light',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'primary.main',
                      }}
                    >
                      {step.icon}
                    </Box>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="h6">{step.label}</Typography>
                        {step.optional && (
                          <Chip label="Optional" size="small" variant="outlined" color="info" />
                        )}
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {step.description}
                      </Typography>
                    </Box>
                  </Box>
                  {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </Box>

                <Collapse in={expanded}>
                  <Box sx={{ mt: 3 }}>
                    <StepComponent />
                  </Box>
                </Collapse>
              </CardContent>
            </Card>
          );
        })}
      </Box>
    </Box>
  );
}

export default function Phase1Prerequisites() {
  const { state } = useWizard();
  const { mode } = state;

  return (
    <Box>
      {/* Phase Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Phase 1: Prerequisites
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {mode === 'guided'
            ? 'Follow the steps below to verify your environment is ready for deployment.'
            : 'Review and configure all prerequisites. Expand sections as needed.'}
        </Typography>
      </Box>

      {/* Render based on mode */}
      {mode === 'guided' ? <GuidedMode /> : <ExpertMode />}
    </Box>
  );
}
