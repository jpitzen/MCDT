import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
  Grid,
  Alert,
  Chip,
  InputAdornment,
  CircularProgress,
  Switch,
  List,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Skeleton,
} from '@mui/material';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import StorageIcon from '@mui/icons-material/Storage';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useWizard } from '../../WizardContext';
import api from '../../../../services/api';

/**
 * ContainerRegistry - Configures container registry (ECR/ACR/GCR)
 * Part of Phase 2: Cluster Configuration
 */
function ContainerRegistry() {
  const { state, updateContainerRegistry } = useWizard();
  const { containerRegistry = {}, cloudProvider, clusterConfig, selectedCredential } = state;
  
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [existingRegistries, setExistingRegistries] = useState([]);
  const [loadingRegistries, setLoadingRegistries] = useState(false);
  const [registriesError, setRegistriesError] = useState(null);

  // Get registry service name based on cloud provider
  const getRegistryServiceName = () => {
    const serviceNames = {
      aws: 'Amazon ECR (Elastic Container Registry)',
      azure: 'Azure Container Registry (ACR)',
      gcp: 'Google Container Registry (GCR)',
      digitalocean: 'DigitalOcean Container Registry',
      linode: 'Linode Container Registry',
    };
    return serviceNames[cloudProvider] || 'Container Registry';
  };

  // Get registry URL format hint
  const getRegistryUrlHint = () => {
    const hints = {
      aws: '<account-id>.dkr.ecr.<region>.amazonaws.com',
      azure: '<registry-name>.azurecr.io',
      gcp: 'gcr.io/<project-id> or <region>-docker.pkg.dev/<project-id>',
      digitalocean: 'registry.digitalocean.com/<registry-name>',
      linode: 'registry.<region>.linode.com/<namespace>',
    };
    return hints[cloudProvider] || '<registry-url>';
  };

  const handleEnableChange = (event) => {
    updateContainerRegistry({ enabled: event.target.checked });
  };

  const handleUseExistingChange = (event) => {
    const useExisting = event.target.value === 'existing';
    updateContainerRegistry({ 
      useExisting,
      // Reset fields when switching
      name: '',
      existingRegistryUrl: '',
      selectedRegistry: null,
    });
    setValidationResult(null);
    
    // Fetch existing registries when switching to "existing"
    if (useExisting && selectedCredential?.id) {
      fetchExistingRegistries();
    }
  };

  // Fetch existing ECR registries from AWS
  const fetchExistingRegistries = async () => {
    if (!selectedCredential?.id) {
      setRegistriesError('No credential selected. Please select a credential first.');
      return;
    }

    setLoadingRegistries(true);
    setRegistriesError(null);

    try {
      // Try the infrastructure discovery endpoint first
      const response = await api.get(`/infrastructure/container-registries/${selectedCredential.id}`);
      const registries = response.data?.data?.registries || [];
      setExistingRegistries(registries);
      
      if (registries.length === 0) {
        setRegistriesError('No existing container registries found in this region.');
      }
    } catch (error) {
      console.error('Failed to fetch existing registries:', error);
      
      // Fallback to ECR endpoint
      try {
        const ecrResponse = await api.get(`/container-deployments/ecr/${selectedCredential.id}/repositories`, {
          params: { region: clusterConfig?.region }
        });
        const repos = ecrResponse.data?.data?.repositories || [];
        setExistingRegistries(repos);
        
        if (repos.length === 0) {
          setRegistriesError('No existing container registries found in this region.');
        }
      } catch (ecrError) {
        setRegistriesError(error.response?.data?.message || 'Failed to fetch existing registries. Please ensure your credentials have ECR access.');
      }
    } finally {
      setLoadingRegistries(false);
    }
  };

  const handleSelectExistingRegistry = (registry) => {
    updateContainerRegistry({
      selectedRegistry: registry,
      existingRegistryUrl: registry.uri || registry.repositoryUri,
      name: registry.name || registry.repositoryName,
    });
    setValidationResult({
      valid: true,
      message: `Selected: ${registry.name || registry.repositoryName}`,
    });
  };

  const handleNameChange = (event) => {
    const name = event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    updateContainerRegistry({ name });
  };

  const handleExistingUrlChange = (event) => {
    updateContainerRegistry({ existingRegistryUrl: event.target.value });
    setValidationResult(null);
  };

  // Auto-generate registry name from cluster name if empty
  useEffect(() => {
    if (!containerRegistry.useExisting && !containerRegistry.name && clusterConfig.clusterName) {
      updateContainerRegistry({ name: `${clusterConfig.clusterName}-registry`.toLowerCase().replace(/[^a-z0-9-]/g, '') });
    }
  }, [clusterConfig.clusterName, containerRegistry.useExisting, containerRegistry.name, updateContainerRegistry]);

  // Auto-fetch existing registries when "Use Existing" is selected
  useEffect(() => {
    if (containerRegistry.useExisting && selectedCredential?.id && existingRegistries.length === 0 && !loadingRegistries) {
      fetchExistingRegistries();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRegistry.useExisting, selectedCredential?.id]);

  // Simulated validation for existing registry
  const validateExistingRegistry = async () => {
    if (!containerRegistry.existingRegistryUrl) return;
    
    setValidating(true);
    try {
      // Simulate API call to validate registry exists
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Basic URL format validation
      const url = containerRegistry.existingRegistryUrl;
      const isValidFormat = url.includes('.') && !url.includes(' ');
      
      setValidationResult({
        valid: isValidFormat,
        message: isValidFormat 
          ? 'Registry URL format looks valid' 
          : 'Invalid registry URL format',
      });
    } catch (error) {
      setValidationResult({
        valid: false,
        message: 'Failed to validate registry',
      });
    } finally {
      setValidating(false);
    }
  };

  const enabled = containerRegistry.enabled !== false;
  const useExisting = containerRegistry.useExisting || false;

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <StorageIcon color="primary" />
        Container Registry
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Configure a private container registry for storing and managing Docker images. 
        {getRegistryServiceName()} provides secure image storage with vulnerability scanning.
      </Typography>

      {/* Enable/Disable Toggle */}
      <Box sx={{ mb: 3, p: 2, backgroundColor: 'action.hover', borderRadius: 1 }}>
        <FormControlLabel
          control={
            <Switch
              checked={enabled}
              onChange={handleEnableChange}
              color="primary"
            />
          }
          label={
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                Enable Container Registry
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Required for pushing and pulling Docker images
              </Typography>
            </Box>
          }
        />
      </Box>

      {enabled && (
        <>
          {/* New or Existing Selection */}
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <FormControl component="fieldset">
                <FormLabel component="legend" sx={{ mb: 2, fontWeight: 'bold' }}>
                  Registry Type
                </FormLabel>
                <RadioGroup
                  value={useExisting ? 'existing' : 'new'}
                  onChange={handleUseExistingChange}
                >
                  <FormControlLabel
                    value="new"
                    control={<Radio />}
                    label={
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          Create New Registry
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Provision a new {getRegistryServiceName()} for this deployment
                        </Typography>
                      </Box>
                    }
                  />
                  <FormControlLabel
                    value="existing"
                    control={<Radio />}
                    label={
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          Use Existing Registry
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Connect to an existing container registry in your account
                        </Typography>
                      </Box>
                    }
                  />
                </RadioGroup>
              </FormControl>
            </CardContent>
          </Card>

          {/* Configuration based on selection */}
          <Card variant="outlined">
            <CardContent>
              {!useExisting ? (
                // New Registry Configuration
                <Box>
                  <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                    New Registry Configuration
                  </Typography>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Registry Name"
                        value={containerRegistry.name || ''}
                        onChange={handleNameChange}
                        placeholder="my-app-registry"
                        helperText="Lowercase letters, numbers, and hyphens only"
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <CloudQueueIcon color="action" />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Region"
                        value={clusterConfig.region || ''}
                        disabled
                        helperText="Uses cluster region by default"
                      />
                    </Grid>
                  </Grid>

                  <Alert severity="info" sx={{ mt: 3 }}>
                    <Typography variant="body2">
                      <strong>What gets created:</strong>
                    </Typography>
                    <Typography variant="body2" component="ul" sx={{ pl: 2, mb: 0 }}>
                      <li>Private container registry with lifecycle policies</li>
                      <li>Image vulnerability scanning enabled</li>
                      <li>IAM roles for EKS nodes to pull images</li>
                      <li>Estimated cost: ~$0.10/GB/month for storage</li>
                    </Typography>
                  </Alert>
                </Box>
              ) : (
                // Existing Registry Configuration
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                      Select Existing Registry
                    </Typography>
                    <Chip
                      icon={<RefreshIcon />}
                      label="Refresh"
                      size="small"
                      onClick={fetchExistingRegistries}
                      disabled={loadingRegistries}
                      sx={{ cursor: 'pointer' }}
                    />
                  </Box>

                  {/* Existing Registries List */}
                  {loadingRegistries ? (
                    <Box sx={{ py: 2 }}>
                      <Skeleton variant="rectangular" height={60} sx={{ mb: 1, borderRadius: 1 }} />
                      <Skeleton variant="rectangular" height={60} sx={{ mb: 1, borderRadius: 1 }} />
                      <Skeleton variant="rectangular" height={60} sx={{ borderRadius: 1 }} />
                    </Box>
                  ) : registriesError ? (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      {registriesError}
                    </Alert>
                  ) : existingRegistries.length > 0 ? (
                    <List sx={{ bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider', mb: 2 }}>
                      {existingRegistries.map((registry, index) => (
                        <ListItemButton
                          key={registry.arn || registry.name || index}
                          selected={containerRegistry.selectedRegistry?.name === registry.name}
                          onClick={() => handleSelectExistingRegistry(registry)}
                          sx={{
                            borderBottom: index < existingRegistries.length - 1 ? 1 : 0,
                            borderColor: 'divider',
                            '&.Mui-selected': {
                              bgcolor: 'action.selected',
                              borderLeft: 3,
                              borderLeftColor: 'primary.main',
                            },
                          }}
                        >
                          <ListItemIcon>
                            {containerRegistry.selectedRegistry?.name === registry.name ? (
                              <CheckCircleIcon color="primary" />
                            ) : (
                              <StorageIcon color="action" />
                            )}
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body1" fontWeight={500}>
                                  {registry.name || registry.repositoryName}
                                </Typography>
                                {registry.imageCount > 0 && (
                                  <Chip
                                    label={`${registry.imageCount} images`}
                                    size="small"
                                    variant="outlined"
                                  />
                                )}
                              </Box>
                            }
                            secondary={
                              <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                                {registry.uri || registry.repositoryUri}
                              </Typography>
                            }
                          />
                        </ListItemButton>
                      ))}
                    </List>
                  ) : (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      Click "Refresh" to load existing container registries from your AWS account.
                    </Alert>
                  )}

                  {/* Manual URL Input as fallback */}
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Or enter registry URL manually:
                  </Typography>
                  <Grid container spacing={3}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Registry URL"
                        value={containerRegistry.existingRegistryUrl || ''}
                        onChange={handleExistingUrlChange}
                        onBlur={validateExistingRegistry}
                        placeholder={getRegistryUrlHint()}
                        helperText={`Format: ${getRegistryUrlHint()}`}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <CloudQueueIcon color="action" />
                            </InputAdornment>
                          ),
                          endAdornment: validating ? (
                            <InputAdornment position="end">
                              <CircularProgress size={20} />
                            </InputAdornment>
                          ) : validationResult ? (
                            <InputAdornment position="end">
                              {validationResult.valid ? (
                                <CheckCircleIcon color="success" />
                              ) : (
                                <WarningIcon color="warning" />
                              )}
                            </InputAdornment>
                          ) : null,
                        }}
                      />
                    </Grid>
                  </Grid>

                  {validationResult && !containerRegistry.selectedRegistry && (
                    <Alert 
                      severity={validationResult.valid ? 'success' : 'warning'} 
                      sx={{ mt: 2 }}
                    >
                      {validationResult.message}
                    </Alert>
                  )}

                  <Alert severity="info" sx={{ mt: 3 }}>
                    <Typography variant="body2">
                      <strong>Requirements:</strong>
                    </Typography>
                    <Typography variant="body2" component="ul" sx={{ pl: 2, mb: 0 }}>
                      <li>EKS nodes must have permission to pull from this registry</li>
                      <li>For cross-account access, ensure proper IAM policies are in place</li>
                      <li>Registry must be accessible from your VPC</li>
                    </Typography>
                  </Alert>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Status Summary */}
          <Box sx={{ mt: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip 
              icon={enabled ? <CheckCircleIcon /> : <WarningIcon />}
              label={enabled ? 'Registry Enabled' : 'Registry Disabled'}
              color={enabled ? 'success' : 'default'}
              size="small"
            />
            {enabled && (
              <Chip 
                label={useExisting ? 'Using Existing' : 'Creating New'}
                color="primary"
                variant="outlined"
                size="small"
              />
            )}
            {enabled && !useExisting && containerRegistry.name && (
              <Chip 
                label={`Name: ${containerRegistry.name}`}
                variant="outlined"
                size="small"
              />
            )}
          </Box>
        </>
      )}
    </Box>
  );
}

export default ContainerRegistry;
