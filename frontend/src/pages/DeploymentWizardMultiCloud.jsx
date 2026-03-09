import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Stepper,
  Step,
  StepLabel,
  Button,
  Card,
  CardContent,
  TextField,
  FormControlLabel,
  Checkbox,
  Switch,
  Grid,
  Typography,
  Alert,
  AlertTitle,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { deploymentDraftsApi } from '../services/api';
import SqlScriptUploader from '../components/SqlScriptUploader';
import { getCloudTerminology } from '../config/cloudProviders';

const steps = [
  'Deployment Mode',
  'Select Credentials',
  'Resource Group',
  'Cluster Configuration',
  'Compute Resources',
  'Networking Configuration',
  'Storage Configuration',
  'Database Configuration',
  'Database Scripts',
  'Monitoring & Logging',
  'Tags',
  'Review & Deploy',
];

const DeploymentWizardMultiCloud = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeStep, setActiveStep] = useState(0);
  const [credentials, setCredentials] = useState([]);
  const [selectedCredential, setSelectedCredential] = useState(null);
  const [cloudProvider, setCloudProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState(false);
  const [deploymentId, setDeploymentId] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSaveDraft, setShowSaveDraft] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitForApproval, setSubmitForApproval] = useState(false);
  
  // Edit mode state
  const [editMode, setEditMode] = useState(false);
  const [editDraftId, setEditDraftId] = useState(null);
  
  // Infrastructure discovery state
  const [discoveredInfrastructure, setDiscoveredInfrastructure] = useState(null);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    // Deployment Mode
    deploymentMode: 'new', // 'new' or 'add_to_existing'
    // Resource Group
    resourceGroupName: '',
    resourceGroupDescription: '',
    environment: 'development',
    costCenter: '',
    project: '',
    // Discovered Infrastructure (for add_to_existing mode)
    discoveredVpcs: [],
    discoveredSubnets: [],
    discoveredClusters: [],
    selectedVpcId: '',
    selectedSubnetIds: [],
    // Cluster Config
    clusterName: '',
    kubernetesVersion: '1.34',
    region: '',
    // Compute/Node Config
    nodeCount: 3,
    minNodeCount: 1,
    maxNodeCount: 5,
    nodeGroupName: '',
    nodeInstanceType: 't3.medium',
    enableAutoscaling: true,
    diskSizeGB: 100,
    // Additional Compute (VMs)
    enableAdditionalVMs: false,
    vmCount: 0,
    vmBaseName: '',
    vmInstanceType: 't3.medium',
    vmOperatingSystem: 'Ubuntu 22.04 LTS',
    // Networking
    createNewVPC: true,
    vpcName: '',
    vpcCIDR: '10.0.0.0/16',
    existingVPCId: '',
    publicSubnets: ['10.0.1.0/24', '10.0.2.0/24'],
    privateSubnets: ['10.0.10.0/24', '10.0.11.0/24'],
    enableNATGateway: true,
    enableLoadBalancer: true,
    // Storage
    enableBlockStorage: true,
    blockStorageSize: 100,
    blockStorageType: 'gp3', // AWS: gp3, Azure: Premium_LRS, GCP: pd-ssd
    enableFileStorage: false,
    fileStorageSize: 100,
    fileStorageName: '',
    enableObjectStorage: false,
    objectStorageBucket: '',
    // Container Registry
    enableContainerRegistry: true,
    containerRegistryName: '',
    // Database
    enableRDS: false,
    dbEngine: 'postgres',
    dbVersion: '14.6',
    dbInstanceClass: 'db.t3.micro',
    dbAllocatedStorage: 20,
    dbMultiAZ: false,
    dbBackupRetentionDays: 7,
    dbName: '',
    dbUsername: 'admin',
    dbPassword: '',
    // Database Scripts
    sqlScripts: [],
    // Monitoring
    enableMonitoring: true,
    enableLogging: true,
    enableAlerts: false,
    alertEmail: '',
    // Tags
    tags: [],
  });

  useEffect(() => {
    fetchCredentials();
    
    // Check if we're in edit mode
    if (location.state?.editMode && location.state?.draftData) {
      const draft = location.state.draftData;
      setEditMode(true);
      setEditDraftId(draft.id);
      setDraftName(draft.name || '');
      setDraftDescription(draft.description || '');
      
      // Set selected credential
      if (draft.credentialId) {
        // Will be set once credentials are loaded
        setTimeout(() => {
          const cred = credentials.find(c => c.id === draft.credentialId);
          if (cred) {
            setSelectedCredential(cred);
            setCloudProvider(cred.cloudProvider);
          }
        }, 500);
      }
      
      // Populate form with draft configuration
      if (draft.configuration) {
        setFormData(prev => ({
          ...prev,
          ...draft.configuration,
          clusterName: draft.clusterName || prev.clusterName,
        }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);
  
  // Update selected credential when credentials are loaded in edit mode
  useEffect(() => {
    if (editMode && location.state?.draftData?.credentialId && credentials.length > 0) {
      const cred = credentials.find(c => c.id === location.state.draftData.credentialId);
      if (cred && !selectedCredential) {
        setSelectedCredential(cred);
        setCloudProvider(cred.cloudProvider);
      }
    }
  }, [credentials, editMode, location.state, selectedCredential]);

  const fetchCredentials = async () => {
    try {
      setLoading(true);
      const response = await api.get('/credentials');
      // API returns nested structure: { status, message, data: { credentials: [...] } }
      setCredentials(response.data.data?.credentials || response.data.credentials || []);
    } catch (error) {
      console.error('Failed to fetch credentials:', error);
    } finally {
      setLoading(false);
    }
  };

  // Discover existing infrastructure for the selected credential
  const discoverInfrastructure = async () => {
    if (!selectedCredential || formData.deploymentMode !== 'existing') {
      return;
    }
    
    try {
      setDiscoveryLoading(true);
      const response = await api.get(`/infrastructure/discover/${selectedCredential.id}`);
      const discovered = response.data.data || response.data;
      setDiscoveredInfrastructure(discovered);
      
      // Auto-select resource group if only one exists
      if (discovered.resourceGroups?.length === 1) {
        handleFormChange('existingResourceGroupId', discovered.resourceGroups[0].id);
        handleFormChange('useExistingResourceGroup', true);
      }
    } catch (error) {
      console.error('Failed to discover infrastructure:', error);
      // Don't fail the wizard, just show empty discovered infrastructure
      setDiscoveredInfrastructure({ vpcs: [], subnets: [], securityGroups: [], resourceGroups: [] });
    } finally {
      setDiscoveryLoading(false);
    }
  };

  const handleCredentialSelect = (credentialId) => {
    const cred = credentials.find((c) => c.id === credentialId);
    if (cred) {
      setSelectedCredential(cred);
      setCloudProvider(cred.cloudProvider);
    }
  };

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleNext = async () => {
    // Step 0: Deployment Mode - validate Azure resource group if Azure is selected
    if (activeStep === 0 && cloudProvider === 'azure' && formData.deploymentMode === 'new') {
      if (!formData.resourceGroupName || formData.resourceGroupName.trim() === '') {
        alert('Please enter an Azure Resource Group name');
        return;
      }
    }
    
    // Step 1: Credential Selection
    if (activeStep === 1 && !selectedCredential) {
      alert('Please select a credential');
      return;
    }
    
    // After credential selection, discover infrastructure if in existing mode
    if (activeStep === 1 && selectedCredential && formData.deploymentMode === 'existing') {
      await discoverInfrastructure();
    }
    
    // Step 2: Resource Group - optional but recommended
    // No blocking validation
    
    // Step 3: Cluster Configuration
    if (activeStep === 3 && !formData.clusterName) {
      alert('Please enter a cluster name');
      return;
    }
    
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleDeploy = async () => {
    try {
      setDeploying(true);

      // Validate credential is selected
      if (!selectedCredential || !selectedCredential.id) {
        throw new Error('No credential selected');
      }

      // Validate cloud provider is set
      if (!cloudProvider) {
        throw new Error('Cloud provider not set. Please go back and select a credential.');
      }

      const deploymentConfig = {
        credentialId: selectedCredential.id,
        cloudProvider,
        clusterName: formData.clusterName,
        kubernetesVersion: formData.kubernetesVersion,
        region: formData.region,
        
        // Deployment Mode (NEW)
        deploymentMode: formData.deploymentMode,
        
        // Resource Group Configuration (NEW)
        resourceGroupName: formData.resourceGroupName,
        resourceGroupDescription: formData.resourceGroupDescription,
        useExistingResourceGroup: formData.useExistingResourceGroup,
        existingResourceGroupId: formData.existingResourceGroupId,
        
        // Existing Infrastructure IDs (for 'existing' mode)
        ...(formData.deploymentMode === 'existing' && {
          existingVpcId: formData.existingVpcId,
          existingSubnetIds: formData.existingSubnetIds,
          existingSecurityGroupIds: formData.existingSecurityGroupIds,
        }),
        
        // Compute configuration
        nodeCount: formData.nodeCount,
        minNodeCount: formData.minNodeCount,
        maxNodeCount: formData.maxNodeCount,
        nodeGroupName: formData.nodeGroupName,
        nodeInstanceType: formData.nodeInstanceType,
        enableAutoscaling: formData.enableAutoscaling,
        diskSizeGB: formData.diskSizeGB,
        
        // Additional VMs
        enableAdditionalVMs: formData.enableAdditionalVMs,
        ...(formData.enableAdditionalVMs && {
          vmCount: formData.vmCount,
          vmBaseName: formData.vmBaseName,
          vmInstanceType: formData.vmInstanceType,
          vmOperatingSystem: formData.vmOperatingSystem,
        }),
        
        // Networking
        createNewVPC: formData.createNewVPC,
        vpcName: formData.vpcName,
        vpcCIDR: formData.vpcCIDR,
        existingVPCId: formData.existingVPCId,
        publicSubnets: formData.publicSubnets,
        privateSubnets: formData.privateSubnets,
        enableNATGateway: formData.enableNATGateway,
        enableLoadBalancer: formData.enableLoadBalancer,
        
        // Storage
        enableBlockStorage: formData.enableBlockStorage,
        ...(formData.enableBlockStorage && {
          blockStorageSize: formData.blockStorageSize,
          blockStorageType: formData.blockStorageType,
        }),
        enableFileStorage: formData.enableFileStorage,
        ...(formData.enableFileStorage && {
          fileStorageSize: formData.fileStorageSize,
          fileStorageName: formData.fileStorageName,
        }),
        enableObjectStorage: formData.enableObjectStorage,
        ...(formData.enableObjectStorage && {
          objectStorageBucket: formData.objectStorageBucket,
        }),
        enableContainerRegistry: formData.enableContainerRegistry,
        ...(formData.enableContainerRegistry && {
          containerRegistryName: formData.containerRegistryName,
        }),
        
        // Database
        enableRDS: formData.enableRDS,
        ...(formData.enableRDS && {
          dbEngine: formData.dbEngine,
          dbVersion: formData.dbVersion,
          dbInstanceClass: formData.dbInstanceClass,
          dbAllocatedStorage: formData.dbAllocatedStorage,
          dbMultiAZ: formData.dbMultiAZ,
          dbBackupRetentionDays: formData.dbBackupRetentionDays,
          dbName: formData.dbName,
          dbUsername: formData.dbUsername,
          dbPassword: formData.dbPassword,
        }),
        
        // Monitoring & Logging
        enableMonitoring: formData.enableMonitoring,
        enableLogging: formData.enableLogging,
        enableAlerts: formData.enableAlerts,
        ...(formData.enableAlerts && {
          alertEmail: formData.alertEmail,
        }),
        
        // Tags
        tags: formData.tags || [],
      };

      const response = await api.post('/deployments', deploymentConfig);
      const deployment = response.data.data || response.data;
      setDeploymentId(deployment.id);

      // Upload SQL scripts if RDS is enabled and scripts exist
      if (formData.enableRDS && formData.sqlScripts && formData.sqlScripts.length > 0) {
        try {
          await api.post(`/deployments/${deployment.id}/sql-scripts`, {
            scripts: formData.sqlScripts.map(script => ({
              scriptName: script.name,
              scriptContent: script.content,
              executionOrder: script.executionOrder,
              haltOnError: script.haltOnError,
              runInTransaction: script.runInTransaction,
              timeoutSeconds: script.timeoutSeconds,
            })),
          });
          console.log('SQL scripts uploaded successfully');
        } catch (scriptError) {
          console.error('Failed to upload SQL scripts:', scriptError);
          // Non-blocking - continue with deployment even if scripts fail to upload
        }
      }

      // Redirect to deployment status page after 2 seconds
      setTimeout(() => {
        navigate(`/deployment/${deployment.id}`);
      }, 2000);
    } catch (error) {
      console.error('Deployment failed:', error);
      console.error('Error details:', {
        response: error.response?.data,
        status: error.response?.status,
        message: error.message,
      });
      
      const errorMessage = error.response?.data?.message 
        || error.response?.data?.error 
        || error.message 
        || 'Unknown error occurred';
      
      alert(`Deployment failed: ${errorMessage}`);
    } finally {
      setDeploying(false);
    }
  };

  const handleSaveDraft = async (submitForApproval = false) => {
    try {
      setSavingDraft(true);

      // Validate credential is selected
      if (!selectedCredential || !selectedCredential.id) {
        throw new Error('No credential selected');
      }

      // Validate cloud provider is set
      if (!cloudProvider) {
        throw new Error('Cloud provider not set. Please go back and select a credential.');
      }

      const draftConfig = {
        name: draftName || `${formData.clusterName} Draft`,
        description: draftDescription,
        credentialId: selectedCredential.id,
        cloudProvider,
        clusterName: formData.clusterName,
        status: submitForApproval ? 'pending_approval' : 'draft',
        configuration: {
          kubernetesVersion: formData.kubernetesVersion,
          region: formData.region,
          
          // Compute configuration
          nodeCount: formData.nodeCount,
          minNodeCount: formData.minNodeCount,
          maxNodeCount: formData.maxNodeCount,
          nodeInstanceType: formData.nodeInstanceType,
          enableAutoscaling: formData.enableAutoscaling,
          diskSizeGB: formData.diskSizeGB,
          
          // Additional VMs
          enableAdditionalVMs: formData.enableAdditionalVMs,
          ...(formData.enableAdditionalVMs && {
            vmCount: formData.vmCount,
            vmBaseName: formData.vmBaseName,
            vmInstanceType: formData.vmInstanceType,
            vmOperatingSystem: formData.vmOperatingSystem,
          }),
          
          // Networking
          createNewVPC: formData.createNewVPC,
          vpcCIDR: formData.vpcCIDR,
          existingVPCId: formData.existingVPCId,
          publicSubnets: formData.publicSubnets,
          privateSubnets: formData.privateSubnets,
          enableNATGateway: formData.enableNATGateway,
          enableLoadBalancer: formData.enableLoadBalancer,
          
          // Storage
          enableBlockStorage: formData.enableBlockStorage,
          ...(formData.enableBlockStorage && {
            blockStorageSize: formData.blockStorageSize,
            blockStorageType: formData.blockStorageType,
          }),
          enableFileStorage: formData.enableFileStorage,
          ...(formData.enableFileStorage && {
            fileStorageSize: formData.fileStorageSize,
            fileStorageName: formData.fileStorageName,
          }),
          enableObjectStorage: formData.enableObjectStorage,
          ...(formData.enableObjectStorage && {
            objectStorageBucket: formData.objectStorageBucket,
          }),
          enableContainerRegistry: formData.enableContainerRegistry,
          ...(formData.enableContainerRegistry && {
            containerRegistryName: formData.containerRegistryName,
          }),
          
          // Database
          enableRDS: formData.enableRDS,
          ...(formData.enableRDS && {
            dbEngine: formData.dbEngine,
            dbVersion: formData.dbVersion,
            dbInstanceClass: formData.dbInstanceClass,
            dbAllocatedStorage: formData.dbAllocatedStorage,
            dbMultiAZ: formData.dbMultiAZ,
            dbBackupRetentionDays: formData.dbBackupRetentionDays,
            dbName: formData.dbName,
            dbUsername: formData.dbUsername,
            dbPassword: formData.dbPassword,
            // Include SQL scripts in draft configuration
            ...(formData.sqlScripts && formData.sqlScripts.length > 0 && {
              sqlScripts: formData.sqlScripts,
            }),
          }),
          
          // Monitoring & Logging
          enableMonitoring: formData.enableMonitoring,
          enableLogging: formData.enableLogging,
          enableAlerts: formData.enableAlerts,
          ...(formData.enableAlerts && {
            alertEmail: formData.alertEmail,
          }),
          
          // Tags
          tags: formData.tags || [],
        },
      };

      let response;
      if (editMode && editDraftId) {
        // Update existing draft
        response = await deploymentDraftsApi.update(editDraftId, draftConfig);
        alert(`Draft updated successfully!${submitForApproval ? ' Submitted for approval.' : ''}`);
      } else {
        // Create new draft
        response = await api.post('/deployment-drafts', draftConfig);
        const draft = response.data.data || response.data;
        const message = submitForApproval 
          ? `Draft submitted for approval! Estimated monthly cost: $${draft.estimatedMonthlyCost || 'calculating...'}`
          : `Draft saved successfully! Estimated monthly cost: $${draft.estimatedMonthlyCost || 'calculating...'}`;
        alert(message);
      }
      
      // Redirect to deployment drafts page
      setTimeout(() => {
        navigate('/deployment-drafts');
      }, 1500);
    } catch (error) {
      console.error('Save draft failed:', error);
      
      const errorMessage = error.response?.data?.message 
        || error.response?.data?.error 
        || error.message 
        || 'Unknown error occurred';
      
      alert(`Failed to save draft: ${errorMessage}`);
    } finally {
      setSavingDraft(false);
      setShowSaveDraft(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 8, display: 'flex', justifyContent: 'left' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <>
      <Box sx={{ display: 'flex', minHeight: '100vh', justifyContent: 'flex-start', alignItems: 'flex-start', ml: 0, pl: 0 }}>
        {/* Vertical Stepper - Left Side */}
        <Box sx={{ minWidth: 200, maxWidth: 220, flexShrink: 0, pt: 1, pl: 0, ml: 0 }}>
          <Stepper activeStep={activeStep} orientation="vertical">
            {steps.map((label, index) => (
              <Step key={label}>
                <StepLabel
                  sx={{
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                      borderRadius: 1,
                    },
                  }}
                  onClick={() => {
                    // Allow navigation to previous steps or current step
                    if (index <= activeStep) {
                      setActiveStep(index);
                  }
                }}
              >
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontWeight: index === activeStep ? 'bold' : 'normal',
                    fontSize: '0.875rem',
                    wordBreak: 'break-word',
                  }}
                >
                  {label}
                </Typography>
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      {/* Main Content Area - Right Side */}
      <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden', pt: 1, pl: 1 }}>
        {/* Header - Now inside content area */}
        <Box sx={{ mb: 1 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
            Deploy Cloud Services
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Multi-Cloud Deployment Wizard
          </Typography>
        </Box>

        {/* Step Content */}
        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ 
            wordBreak: 'break-word', 
            overflowWrap: 'break-word',
            '& *': {
              maxWidth: '100%',
              overflowWrap: 'break-word'
            }
          }}>
              {/* Step 0: Deployment Mode Selection */}
              {activeStep === 0 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Deployment Mode
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                    Choose whether to create a new infrastructure or add resources to an existing infrastructure.
                  </Typography>
                  
                  <Grid container spacing={3} justifyContent="center">
                    <Grid item xs={12} md={5}>
                      <Card 
                        variant="outlined"
                        sx={{ 
                          cursor: 'pointer',
                          border: formData.deploymentMode === 'new' ? '2px solid' : '1px solid',
                          borderColor: formData.deploymentMode === 'new' ? 'primary.main' : 'divider',
                          bgcolor: formData.deploymentMode === 'new' ? 'action.selected' : 'background.paper',
                          '&:hover': { borderColor: 'primary.main' }
                        }}
                        onClick={() => handleFormChange('deploymentMode', 'new')}
                      >
                        <CardContent sx={{ textAlign: 'center', py: 4 }}>
                          <AddCircleOutlineIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                          <Typography variant="h5" gutterBottom>New Deployment</Typography>
                          <Typography variant="body2" color="textSecondary">
                            Create a complete new infrastructure including VPC, subnets, security groups, and all resources.
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} md={5}>
                      <Card 
                        variant="outlined"
                        sx={{ 
                          cursor: 'pointer',
                          border: formData.deploymentMode === 'existing' ? '2px solid' : '1px solid',
                          borderColor: formData.deploymentMode === 'existing' ? 'success.main' : 'divider',
                          bgcolor: formData.deploymentMode === 'existing' ? 'action.selected' : 'background.paper',
                          '&:hover': { borderColor: 'success.main' }
                        }}
                        onClick={() => handleFormChange('deploymentMode', 'existing')}
                      >
                        <CardContent sx={{ textAlign: 'center', py: 4 }}>
                          <CloudSyncIcon sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
                          <Typography variant="h5" gutterBottom>Add to Existing</Typography>
                          <Typography variant="body2" color="textSecondary">
                            Deploy new resources into an existing infrastructure. Reuse VPC, subnets, and other resources.
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>

                  {formData.deploymentMode === 'existing' && (
                    <Alert severity="info" sx={{ mt: 3 }}>
                      <AlertTitle>Existing Infrastructure Mode</AlertTitle>
                      After selecting your cloud credentials, we will discover your existing infrastructure and allow you to select which resources to reuse.
                    </Alert>
                  )}

                  {/* Azure Resource Group - shown when Azure credential is selected and New Deployment mode */}
                  {cloudProvider === 'azure' && formData.deploymentMode === 'new' && (
                    <Box sx={{ mt: 4 }}>
                      <Divider sx={{ mb: 3 }} />
                      <Typography variant="h6" gutterBottom>
                        Azure Resource Group
                      </Typography>
                      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                        All Azure resources will be created within this Resource Group.
                      </Typography>
                      <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            required
                            label="Resource Group Name"
                            value={formData.resourceGroupName}
                            onChange={(e) => handleFormChange('resourceGroupName', e.target.value)}
                            helperText="Name for the Azure Resource Group (e.g., rg-myapp-prod)"
                            placeholder="rg-myapp-prod"
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            label="Description"
                            value={formData.resourceGroupDescription}
                            onChange={(e) => handleFormChange('resourceGroupDescription', e.target.value)}
                            helperText="Optional description for the resource group"
                          />
                        </Grid>
                      </Grid>
                    </Box>
                  )}
                </Box>
              )}

              {/* Step 1: Credential Selection */}
              {activeStep === 1 && (
                <StepCredentialSelection
                  credentials={credentials}
                  selectedCredential={selectedCredential}
                  onSelect={handleCredentialSelect}
                />
              )}

              {/* Step 2: Resource Group Configuration */}
              {activeStep === 2 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Resource Group Configuration
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                    {cloudProvider === 'azure' 
                      ? 'Configure the Azure Resource Group for organizing your resources.'
                      : cloudProvider === 'gcp'
                      ? 'Configure labels and optional GCP folder for organizing your resources.'
                      : cloudProvider === 'digitalocean'
                      ? 'Configure the DigitalOcean Project for organizing your resources.'
                      : 'Configure resource grouping and tagging for your infrastructure.'}
                  </Typography>

                  {discoveryLoading && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                      <CircularProgress size={24} sx={{ mr: 2 }} />
                      <Typography>Discovering existing infrastructure...</Typography>
                    </Box>
                  )}

                  <Grid container spacing={3}>
                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={formData.useExistingResourceGroup}
                            onChange={(e) => handleFormChange('useExistingResourceGroup', e.target.checked)}
                            disabled={formData.deploymentMode !== 'existing'}
                          />
                        }
                        label="Use existing resource group"
                      />
                    </Grid>

                    {formData.useExistingResourceGroup && discoveredInfrastructure?.resourceGroups?.length > 0 ? (
                      <Grid item xs={12}>
                        <FormControl fullWidth>
                          <InputLabel>Select Resource Group</InputLabel>
                          <Select
                            value={formData.existingResourceGroupId}
                            onChange={(e) => handleFormChange('existingResourceGroupId', e.target.value)}
                            label="Select Resource Group"
                          >
                            {discoveredInfrastructure.resourceGroups.map((rg) => (
                              <MenuItem key={rg.id} value={rg.id}>
                                {rg.name} {rg.location && `(${rg.location})`}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                    ) : (
                      <>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            label="Resource Group Name"
                            value={formData.resourceGroupName}
                            onChange={(e) => handleFormChange('resourceGroupName', e.target.value)}
                            helperText={
                              cloudProvider === 'azure' 
                                ? 'Azure Resource Group name'
                                : cloudProvider === 'digitalocean'
                                ? 'DigitalOcean Project name'
                                : 'Resource group identifier (used as tag value)'
                            }
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            label="Description"
                            value={formData.resourceGroupDescription}
                            onChange={(e) => handleFormChange('resourceGroupDescription', e.target.value)}
                            helperText="Optional description for the resource group"
                          />
                        </Grid>
                      </>
                    )}
                  </Grid>

                  {formData.deploymentMode === 'existing' && discoveredInfrastructure && (
                    <Box sx={{ mt: 4 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        Discovered Infrastructure
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                      
                      {discoveredInfrastructure.vpcs?.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" fontWeight="bold">VPCs/VNets:</Typography>
                          <FormControl fullWidth sx={{ mt: 1 }}>
                            <InputLabel>Select VPC</InputLabel>
                            <Select
                              value={formData.existingVpcId}
                              onChange={(e) => handleFormChange('existingVpcId', e.target.value)}
                              label="Select VPC"
                            >
                              {discoveredInfrastructure.vpcs.map((vpc) => (
                                <MenuItem key={vpc.id} value={vpc.id}>
                                  {vpc.name || vpc.id} ({vpc.cidr})
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Box>
                      )}

                      {discoveredInfrastructure.subnets?.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" fontWeight="bold">Subnets:</Typography>
                          <Typography variant="caption" color="textSecondary">
                            {discoveredInfrastructure.subnets.length} subnet(s) available
                          </Typography>
                        </Box>
                      )}

                      {discoveredInfrastructure.securityGroups?.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" fontWeight="bold">Security Groups:</Typography>
                          <Typography variant="caption" color="textSecondary">
                            {discoveredInfrastructure.securityGroups.length} security group(s) available
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  )}
                </Box>
              )}

              {/* Step 3: Cluster Configuration */}
              {activeStep === 3 && (
                <StepClusterConfig
                  formData={formData}
                  cloudProvider={cloudProvider}
                  onChange={handleFormChange}
                />
              )}

              {/* Step 4: Compute Configuration */}
              {activeStep === 4 && (
                <StepComputeConfig
                  formData={formData}
                  cloudProvider={cloudProvider}
                  onChange={handleFormChange}
                />
              )}

              {/* Step 5: Networking Configuration */}
              {activeStep === 5 && (
                <StepNetworkingConfig
                  formData={formData}
                  cloudProvider={cloudProvider}
                  onChange={handleFormChange}
                />
              )}

              {/* Step 6: Storage Configuration */}
              {activeStep === 6 && (
                <StepStorageConfig
                  formData={formData}
                  cloudProvider={cloudProvider}
                  onChange={handleFormChange}
                />
              )}

              {/* Step 7: Database Configuration */}
              {activeStep === 7 && (
                <StepDatabaseConfig
                  formData={formData}
                  cloudProvider={cloudProvider}
                  onChange={handleFormChange}
                />
              )}

              {/* Step 8: SQL Scripts Upload */}
              {activeStep === 8 && (
                <SqlScriptUploader
                  scripts={formData.sqlScripts}
                  onChange={(scripts) => handleFormChange('sqlScripts', scripts)}
                  dbEngine={formData.dbEngine}
                />
              )}

              {/* Step 9: Monitoring Configuration */}
              {activeStep === 9 && (
                <StepMonitoringConfig
                  formData={formData}
                  cloudProvider={cloudProvider}
                  onChange={handleFormChange}
                />
              )}

              {/* Step 10: Tags */}
              {activeStep === 10 && (
                <StepTags
                  formData={formData}
                  cloudProvider={cloudProvider}
                  onChange={handleFormChange}
                />
              )}

              {/* Step 11: Review */}
              {activeStep === 11 && (
                <StepReview
                  credential={selectedCredential}
                  formData={formData}
                  cloudProvider={cloudProvider}
                />
              )}
            </CardContent>
          </Card>

          {/* Navigation Buttons */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
            <Button
              disabled={activeStep === 0 || deploying}
              onClick={handleBack}
            >
              Back
            </Button>

            <Box sx={{ display: 'flex', gap: 2 }}>
              {activeStep === steps.length - 1 ? (
                <>
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={() => { setShowSaveDraft(true); setSubmitForApproval(false); }}
                    disabled={savingDraft}
                  >
                    {savingDraft ? <CircularProgress size={24} /> : 'Save'}
                  </Button>
                  <Button
                    variant="contained"
                    color="success"
                    onClick={() => { setShowSaveDraft(true); setSubmitForApproval(true); }}
                    disabled={savingDraft}
                  >
                    {savingDraft ? <CircularProgress size={24} /> : 'Save and Submit for Approval'}
                  </Button>
                </>
              ) : (
                <Button
                  variant="contained"
                  onClick={handleNext}
                >
                  Next
                </Button>
              )}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirm} onClose={() => setShowConfirm(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Confirm Deployment</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" sx={{ mb: 2 }}>
            You're about to deploy a Kubernetes cluster on{' '}
            <strong>{selectedCredential?.name}</strong> ({cloudProvider?.toUpperCase()}).
          </Typography>
          <Typography variant="body2" color="warning.main" sx={{ mb: 2 }}>
            ⚠️ This action will create cloud resources and incur charges.
          </Typography>
          <Typography variant="body2">
            Cluster: <strong>{formData.clusterName}</strong>
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirm(false)}>Cancel</Button>
          <Button onClick={handleDeploy} variant="contained" color="error">
            Yes, Deploy
          </Button>
        </DialogActions>
      </Dialog>

      {/* Deployment Started Dialog */}
      <Dialog open={Boolean(deploymentId)} onClose={() => {}} maxWidth="sm" fullWidth>
        <DialogTitle>Deployment Started</DialogTitle>
        <DialogContent sx={{ pt: 2, textAlign: 'center' }}>
          <CircularProgress sx={{ mb: 2 }} />
          <Typography variant="body2">
            Your deployment has been created. Redirecting to status page...
          </Typography>
          <Typography variant="caption" display="block" sx={{ mt: 2 }}>
            Deployment ID: {deploymentId}
          </Typography>
        </DialogContent>
      </Dialog>

      {/* Save Draft Dialog */}
      <Dialog open={showSaveDraft} onClose={() => !savingDraft && setShowSaveDraft(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editMode 
            ? 'Update Deployment Draft' 
            : (submitForApproval ? 'Submit Deployment for Approval' : 'Save Deployment Draft')}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" sx={{ mb: 3 }}>
            {editMode 
              ? 'Update this deployment configuration and resubmit for approval.' 
              : (submitForApproval 
                ? 'Save and submit this deployment for approval. Once approved, it can be deployed from Saved Deployments.'
                : 'Save this deployment configuration as a draft. You can edit and submit it for approval later.')}
          </Typography>
          
          <TextField
            autoFocus
            fullWidth
            label="Draft Name"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            placeholder={`${formData.clusterName} Draft`}
            sx={{ mb: 2 }}
            helperText="A descriptive name for this deployment draft"
          />
          
          <TextField
            fullWidth
            label="Description (Optional)"
            value={draftDescription}
            onChange={(e) => setDraftDescription(e.target.value)}
            multiline
            rows={3}
            placeholder="Add notes about this deployment configuration..."
            helperText="Optional: Add context or notes for reviewers"
          />
          
          <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
            The system will calculate estimated monthly costs automatically.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSaveDraft(false)} disabled={savingDraft}>
            Cancel
          </Button>
          <Button 
            onClick={() => handleSaveDraft(submitForApproval)} 
            variant="contained" 
            color="primary"
            disabled={savingDraft}
          >
            {savingDraft ? <CircularProgress size={24} /> : (editMode ? 'Update' : (submitForApproval ? 'Submit for Approval' : 'Save Draft'))}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

// Step 1: Credential Selection
const StepCredentialSelection = ({ credentials, selectedCredential, onSelect }) => {
  const getProviderDisplay = (provider) => {
    const providers = {
      aws: 'AWS',
      azure: 'Azure',
      gcp: 'Google Cloud',
      digitalocean: 'DigitalOcean',
      linode: 'Linode',
    };
    return providers[provider] || provider?.toUpperCase();
  };

  const getProviderIcon = (provider) => {
    const icons = {
      aws: '☁️',
      azure: '🔷',
      gcp: '🌐',
      digitalocean: '🌊',
      linode: '🔧',
    };
    return icons[provider] || '☁️';
  };

  const maskAccountNumber = (account) => {
    if (!account || account === 'N/A' || account === 'API Token') {
      return account;
    }
    // Mask all but last 4 characters
    if (account.length <= 4) {
      return '****';
    }
    return '****' + account.slice(-4);
  };

  const getCredentialInfo = (cred) => {
    // Return provider-specific credential information
    let account = '';
    switch (cred.cloudProvider) {
      case 'aws':
        account = cred.awsAccountId || 'N/A';
        break;
      case 'azure':
        account = cred.subscriptionId || 'N/A';
        break;
      case 'gcp':
        account = cred.projectId || 'N/A';
        break;
      case 'digitalocean':
      case 'linode':
        account = 'API Token';
        break;
      default:
        account = 'N/A';
    }
    return {
      region: cred.awsRegion || cred.azureRegion || cred.gcpRegion || cred.region || 'N/A',
      account: maskAccountNumber(account),
    };
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
        Select Cloud Credentials
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        Choose which cloud provider credentials to use for this deployment. 
        The selected credential determines which cloud platform and region will host your cluster.
      </Typography>

      {credentials.length === 0 ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          No credentials found. Please add credentials in the Credentials page before creating a deployment.
        </Alert>
      ) : (
        <TextField
          fullWidth
          select
          label="Select Credential"
          value={selectedCredential?.id || ''}
          onChange={(e) => onSelect(e.target.value)}
          SelectProps={{ native: true }}
          helperText="Select the cloud credentials to use for this deployment"
        >
          <option value="">-- Select a credential --</option>
          {credentials.map((cred) => {
            const info = getCredentialInfo(cred);
            const provider = getProviderDisplay(cred.cloudProvider);
            const icon = getProviderIcon(cred.cloudProvider);
            const validationStatus = cred.isValid === true ? '✓' : cred.isValid === false ? '✗' : '';
            return (
              <option key={cred.id} value={cred.id}>
                {icon} {cred.name} - {provider} ({info.region}) [{info.account}] {validationStatus}
              </option>
            );
          })}
        </TextField>
      )}

      {selectedCredential && (
        <Card sx={{ mt: 3, backgroundColor: 'action.hover' }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
              Selected Credential Details
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="h5" sx={{ mr: 1 }}>
                {getProviderIcon(selectedCredential.cloudProvider)}
              </Typography>
              <Typography variant="h6">
                {selectedCredential.name}
              </Typography>
            </Box>
            <Typography variant="body2" color="textSecondary">
              <strong>Provider:</strong> {getProviderDisplay(selectedCredential.cloudProvider)}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              <strong>Region:</strong> {getCredentialInfo(selectedCredential).region}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              <strong>Account:</strong> {getCredentialInfo(selectedCredential).account}
            </Typography>
            {selectedCredential.description && (
              <Typography variant="caption" display="block" sx={{ mt: 1, fontStyle: 'italic' }}>
                {selectedCredential.description}
              </Typography>
            )}
            {selectedCredential.isValid === true && (
              <Typography variant="caption" color="success.main" display="block" sx={{ mt: 1, fontWeight: 'bold' }}>
                ✓ Credentials Validated
              </Typography>
            )}
            {selectedCredential.isValid === false && (
              <Typography variant="caption" color="error.main" display="block" sx={{ mt: 1, fontWeight: 'bold' }}>
                ✗ Validation Failed - Please validate credentials before deploying
              </Typography>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

// Step 2: Cluster Configuration
const StepClusterConfig = ({ formData, cloudProvider, onChange }) => {
  const terms = getCloudTerminology(cloudProvider);
  
  // EKS supported versions (as of Dec 2025)
  // Standard: 1.34, 1.33, 1.32, 1.31 | Extended: 1.30, 1.29, 1.28
  const k8sVersions = ['1.28', '1.29', '1.30', '1.31', '1.32', '1.33', '1.34'];

  const getRegions = () => {
    const regions = {
      aws: [
        { value: 'us-east-1', label: 'US East (N. Virginia) - us-east-1' },
        { value: 'us-east-2', label: 'US East (Ohio) - us-east-2' },
        { value: 'us-west-1', label: 'US West (N. California) - us-west-1' },
        { value: 'us-west-2', label: 'US West (Oregon) - us-west-2' },
        { value: 'eu-west-1', label: 'Europe (Ireland) - eu-west-1' },
        { value: 'eu-central-1', label: 'Europe (Frankfurt) - eu-central-1' },
        { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore) - ap-southeast-1' },
        { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo) - ap-northeast-1' },
      ],
      azure: [
        { value: 'eastus', label: 'East US (Virginia)' },
        { value: 'westus', label: 'West US (California)' },
        { value: 'northeurope', label: 'North Europe (Ireland)' },
        { value: 'westeurope', label: 'West Europe (Netherlands)' },
        { value: 'southeastasia', label: 'Southeast Asia (Singapore)' },
      ],
      gcp: [
        { value: 'us-central1', label: 'us-central1 (Iowa)' },
        { value: 'us-east1', label: 'us-east1 (South Carolina)' },
        { value: 'europe-west1', label: 'europe-west1 (Belgium)' },
        { value: 'asia-east1', label: 'asia-east1 (Taiwan)' },
      ],
      digitalocean: [
        { value: 'nyc1', label: 'New York City 1' },
        { value: 'nyc3', label: 'New York City 3' },
        { value: 'sfo3', label: 'San Francisco 3' },
        { value: 'ams3', label: 'Amsterdam 3' },
        { value: 'sgp1', label: 'Singapore 1' },
      ],
      linode: [
        { value: 'us-east', label: 'US East (Newark, NJ)' },
        { value: 'us-west', label: 'US West (Fremont, CA)' },
        { value: 'eu-west', label: 'EU West (London, UK)' },
        { value: 'ap-south', label: 'AP South (Singapore)' },
      ],
    };
    return regions[cloudProvider] || regions.aws;
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>
        {terms.cluster} Configuration
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        Set the fundamental properties of your {terms.clusterService} cluster. The cluster name identifies your deployment,
        the version determines available features and APIs, and the {terms.region.toLowerCase()} affects latency and compliance requirements.
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label={`${terms.cluster} Name`}
            value={formData.clusterName}
            onChange={(e) => onChange('clusterName', e.target.value)}
            placeholder="production-app-cluster"
            helperText={`Unique name for your ${terms.clusterService} cluster (1-100 characters, alphanumeric and hyphens only)`}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            select
            label="Kubernetes Version"
            value={formData.kubernetesVersion}
            onChange={(e) => onChange('kubernetesVersion', e.target.value)}
            SelectProps={{ native: true }}
            helperText="Use latest stable version unless you have compatibility requirements"
          >
            {k8sVersions.map((v) => (
              <option key={v} value={v}>
                v{v} {v === '1.34' ? '(Latest)' : v === '1.33' || v === '1.32' ? '(Stable)' : ''}
              </option>
            ))}
          </TextField>
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            select
            label={terms.region}
            value={formData.region || getRegions()[0].value}
            onChange={(e) => onChange('region', e.target.value)}
            SelectProps={{ native: true }}
            helperText={`Choose ${terms.region.toLowerCase()} closest to your users for best performance`}
          >
            {getRegions().map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </TextField>
        </Grid>
      </Grid>

      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
          💡 {terms.cluster} Configuration Tips
        </Typography>
        <Typography variant="caption" component="div">
          • Use descriptive names (e.g., 'prod-api-cluster', 'staging-web-cluster')<br />
          • Kubernetes 1.30+ recommended for latest features and security patches<br />
          • Choose {terms.region.toLowerCase()} based on data residency requirements and user proximity<br />
          • Cluster name cannot be changed after creation
        </Typography>
      </Alert>
    </Box>
  );
};

// Step 3: Compute/Node Configuration
const StepComputeConfig = ({ formData, cloudProvider, onChange }) => {
  const terms = getCloudTerminology(cloudProvider);
  
  const getInstanceTypes = () => {
    const types = {
      aws: [
        // T3 - General Purpose (Intel)
        { value: 't3.nano', label: 't3.nano (2 vCPU, 0.5GB RAM) - $0.0052/hr', cost: 0.0052, family: 'T3', category: 'General Purpose' },
        { value: 't3.micro', label: 't3.micro (2 vCPU, 1GB RAM) - $0.0104/hr', cost: 0.0104, family: 'T3', category: 'General Purpose' },
        { value: 't3.small', label: 't3.small (2 vCPU, 2GB RAM) - $0.0208/hr', cost: 0.0208, family: 'T3', category: 'General Purpose' },
        { value: 't3.medium', label: 't3.medium (2 vCPU, 4GB RAM) - $0.0416/hr', cost: 0.0416, family: 'T3', category: 'General Purpose' },
        { value: 't3.large', label: 't3.large (2 vCPU, 8GB RAM) - $0.0832/hr', cost: 0.0832, family: 'T3', category: 'General Purpose' },
        { value: 't3.xlarge', label: 't3.xlarge (4 vCPU, 16GB RAM) - $0.1664/hr', cost: 0.1664, family: 'T3', category: 'General Purpose' },
        { value: 't3.2xlarge', label: 't3.2xlarge (8 vCPU, 32GB RAM) - $0.3328/hr', cost: 0.3328, family: 'T3', category: 'General Purpose' },
        
        // T3a - General Purpose AMD (Lower Cost)
        { value: 't3a.nano', label: 't3a.nano (2 vCPU, 0.5GB RAM) - $0.0047/hr', cost: 0.0047, family: 'T3a', category: 'General Purpose' },
        { value: 't3a.micro', label: 't3a.micro (2 vCPU, 1GB RAM) - $0.0094/hr', cost: 0.0094, family: 'T3a', category: 'General Purpose' },
        { value: 't3a.small', label: 't3a.small (2 vCPU, 2GB RAM) - $0.0188/hr', cost: 0.0188, family: 'T3a', category: 'General Purpose' },
        { value: 't3a.medium', label: 't3a.medium (2 vCPU, 4GB RAM) - $0.0376/hr', cost: 0.0376, family: 'T3a', category: 'General Purpose' },
        { value: 't3a.large', label: 't3a.large (2 vCPU, 8GB RAM) - $0.0752/hr', cost: 0.0752, family: 'T3a', category: 'General Purpose' },
        { value: 't3a.xlarge', label: 't3a.xlarge (4 vCPU, 16GB RAM) - $0.1504/hr', cost: 0.1504, family: 'T3a', category: 'General Purpose' },
        { value: 't3a.2xlarge', label: 't3a.2xlarge (8 vCPU, 32GB RAM) - $0.3008/hr', cost: 0.3008, family: 'T3a', category: 'General Purpose' },
        
        // T4g - General Purpose ARM Graviton (Best Price/Performance)
        { value: 't4g.nano', label: 't4g.nano (2 vCPU, 0.5GB RAM, ARM) - $0.0042/hr', cost: 0.0042, family: 'T4g', category: 'General Purpose ARM' },
        { value: 't4g.micro', label: 't4g.micro (2 vCPU, 1GB RAM, ARM) - $0.0084/hr', cost: 0.0084, family: 'T4g', category: 'General Purpose ARM' },
        { value: 't4g.small', label: 't4g.small (2 vCPU, 2GB RAM, ARM) - $0.0168/hr', cost: 0.0168, family: 'T4g', category: 'General Purpose ARM' },
        { value: 't4g.medium', label: 't4g.medium (2 vCPU, 4GB RAM, ARM) - $0.0336/hr', cost: 0.0336, family: 'T4g', category: 'General Purpose ARM' },
        { value: 't4g.large', label: 't4g.large (2 vCPU, 8GB RAM, ARM) - $0.0672/hr', cost: 0.0672, family: 'T4g', category: 'General Purpose ARM' },
        { value: 't4g.xlarge', label: 't4g.xlarge (4 vCPU, 16GB RAM, ARM) - $0.1344/hr', cost: 0.1344, family: 'T4g', category: 'General Purpose ARM' },
        { value: 't4g.2xlarge', label: 't4g.2xlarge (8 vCPU, 32GB RAM, ARM) - $0.2688/hr', cost: 0.2688, family: 'T4g', category: 'General Purpose ARM' },
        
        // M5 - General Purpose (Intel - Balanced)
        { value: 'm5.large', label: 'm5.large (2 vCPU, 8GB RAM) - $0.096/hr', cost: 0.096, family: 'M5', category: 'General Purpose' },
        { value: 'm5.xlarge', label: 'm5.xlarge (4 vCPU, 16GB RAM) - $0.192/hr', cost: 0.192, family: 'M5', category: 'General Purpose' },
        { value: 'm5.2xlarge', label: 'm5.2xlarge (8 vCPU, 32GB RAM) - $0.384/hr', cost: 0.384, family: 'M5', category: 'General Purpose' },
        { value: 'm5.4xlarge', label: 'm5.4xlarge (16 vCPU, 64GB RAM) - $0.768/hr', cost: 0.768, family: 'M5', category: 'General Purpose' },
        { value: 'm5.8xlarge', label: 'm5.8xlarge (32 vCPU, 128GB RAM) - $1.536/hr', cost: 1.536, family: 'M5', category: 'General Purpose' },
        { value: 'm5.12xlarge', label: 'm5.12xlarge (48 vCPU, 192GB RAM) - $2.304/hr', cost: 2.304, family: 'M5', category: 'General Purpose' },
        { value: 'm5.16xlarge', label: 'm5.16xlarge (64 vCPU, 256GB RAM) - $3.072/hr', cost: 3.072, family: 'M5', category: 'General Purpose' },
        { value: 'm5.24xlarge', label: 'm5.24xlarge (96 vCPU, 384GB RAM) - $4.608/hr', cost: 4.608, family: 'M5', category: 'General Purpose' },
        
        // M5a - General Purpose AMD (Lower Cost)
        { value: 'm5a.large', label: 'm5a.large (2 vCPU, 8GB RAM, AMD) - $0.086/hr', cost: 0.086, family: 'M5a', category: 'General Purpose' },
        { value: 'm5a.xlarge', label: 'm5a.xlarge (4 vCPU, 16GB RAM, AMD) - $0.172/hr', cost: 0.172, family: 'M5a', category: 'General Purpose' },
        { value: 'm5a.2xlarge', label: 'm5a.2xlarge (8 vCPU, 32GB RAM, AMD) - $0.344/hr', cost: 0.344, family: 'M5a', category: 'General Purpose' },
        { value: 'm5a.4xlarge', label: 'm5a.4xlarge (16 vCPU, 64GB RAM, AMD) - $0.688/hr', cost: 0.688, family: 'M5a', category: 'General Purpose' },
        { value: 'm5a.8xlarge', label: 'm5a.8xlarge (32 vCPU, 128GB RAM, AMD) - $1.376/hr', cost: 1.376, family: 'M5a', category: 'General Purpose' },
        { value: 'm5a.12xlarge', label: 'm5a.12xlarge (48 vCPU, 192GB RAM, AMD) - $2.064/hr', cost: 2.064, family: 'M5a', category: 'General Purpose' },
        { value: 'm5a.16xlarge', label: 'm5a.16xlarge (64 vCPU, 256GB RAM, AMD) - $2.752/hr', cost: 2.752, family: 'M5a', category: 'General Purpose' },
        { value: 'm5a.24xlarge', label: 'm5a.24xlarge (96 vCPU, 384GB RAM, AMD) - $4.128/hr', cost: 4.128, family: 'M5a', category: 'General Purpose' },
        
        // M6i - General Purpose (Intel - 3rd Gen)
        { value: 'm6i.large', label: 'm6i.large (2 vCPU, 8GB RAM, Intel 3rd Gen) - $0.096/hr', cost: 0.096, family: 'M6i', category: 'General Purpose' },
        { value: 'm6i.xlarge', label: 'm6i.xlarge (4 vCPU, 16GB RAM, Intel 3rd Gen) - $0.192/hr', cost: 0.192, family: 'M6i', category: 'General Purpose' },
        { value: 'm6i.2xlarge', label: 'm6i.2xlarge (8 vCPU, 32GB RAM, Intel 3rd Gen) - $0.384/hr', cost: 0.384, family: 'M6i', category: 'General Purpose' },
        { value: 'm6i.4xlarge', label: 'm6i.4xlarge (16 vCPU, 64GB RAM, Intel 3rd Gen) - $0.768/hr', cost: 0.768, family: 'M6i', category: 'General Purpose' },
        { value: 'm6i.8xlarge', label: 'm6i.8xlarge (32 vCPU, 128GB RAM, Intel 3rd Gen) - $1.536/hr', cost: 1.536, family: 'M6i', category: 'General Purpose' },
        { value: 'm6i.12xlarge', label: 'm6i.12xlarge (48 vCPU, 192GB RAM, Intel 3rd Gen) - $2.304/hr', cost: 2.304, family: 'M6i', category: 'General Purpose' },
        { value: 'm6i.16xlarge', label: 'm6i.16xlarge (64 vCPU, 256GB RAM, Intel 3rd Gen) - $3.072/hr', cost: 3.072, family: 'M6i', category: 'General Purpose' },
        { value: 'm6i.24xlarge', label: 'm6i.24xlarge (96 vCPU, 384GB RAM, Intel 3rd Gen) - $4.608/hr', cost: 4.608, family: 'M6i', category: 'General Purpose' },
        { value: 'm6i.32xlarge', label: 'm6i.32xlarge (128 vCPU, 512GB RAM, Intel 3rd Gen) - $6.144/hr', cost: 6.144, family: 'M6i', category: 'General Purpose' },
        
        // M6a - General Purpose AMD (3rd Gen)
        { value: 'm6a.large', label: 'm6a.large (2 vCPU, 8GB RAM, AMD 3rd Gen) - $0.0864/hr', cost: 0.0864, family: 'M6a', category: 'General Purpose' },
        { value: 'm6a.xlarge', label: 'm6a.xlarge (4 vCPU, 16GB RAM, AMD 3rd Gen) - $0.1728/hr', cost: 0.1728, family: 'M6a', category: 'General Purpose' },
        { value: 'm6a.2xlarge', label: 'm6a.2xlarge (8 vCPU, 32GB RAM, AMD 3rd Gen) - $0.3456/hr', cost: 0.3456, family: 'M6a', category: 'General Purpose' },
        { value: 'm6a.4xlarge', label: 'm6a.4xlarge (16 vCPU, 64GB RAM, AMD 3rd Gen) - $0.6912/hr', cost: 0.6912, family: 'M6a', category: 'General Purpose' },
        { value: 'm6a.8xlarge', label: 'm6a.8xlarge (32 vCPU, 128GB RAM, AMD 3rd Gen) - $1.3824/hr', cost: 1.3824, family: 'M6a', category: 'General Purpose' },
        { value: 'm6a.12xlarge', label: 'm6a.12xlarge (48 vCPU, 192GB RAM, AMD 3rd Gen) - $2.0736/hr', cost: 2.0736, family: 'M6a', category: 'General Purpose' },
        { value: 'm6a.16xlarge', label: 'm6a.16xlarge (64 vCPU, 256GB RAM, AMD 3rd Gen) - $2.7648/hr', cost: 2.7648, family: 'M6a', category: 'General Purpose' },
        { value: 'm6a.24xlarge', label: 'm6a.24xlarge (96 vCPU, 384GB RAM, AMD 3rd Gen) - $4.1472/hr', cost: 4.1472, family: 'M6a', category: 'General Purpose' },
        { value: 'm6a.32xlarge', label: 'm6a.32xlarge (128 vCPU, 512GB RAM, AMD 3rd Gen) - $5.5296/hr', cost: 5.5296, family: 'M6a', category: 'General Purpose' },
        { value: 'm6a.48xlarge', label: 'm6a.48xlarge (192 vCPU, 768GB RAM, AMD 3rd Gen) - $8.2944/hr', cost: 8.2944, family: 'M6a', category: 'General Purpose' },
        
        // M7i - General Purpose (Intel 4th Gen - Latest)
        { value: 'm7i.large', label: 'm7i.large (2 vCPU, 8GB RAM, Intel 4th Gen) - $0.1008/hr', cost: 0.1008, family: 'M7i', category: 'General Purpose' },
        { value: 'm7i.xlarge', label: 'm7i.xlarge (4 vCPU, 16GB RAM, Intel 4th Gen) - $0.2016/hr', cost: 0.2016, family: 'M7i', category: 'General Purpose' },
        { value: 'm7i.2xlarge', label: 'm7i.2xlarge (8 vCPU, 32GB RAM, Intel 4th Gen) - $0.4032/hr', cost: 0.4032, family: 'M7i', category: 'General Purpose' },
        { value: 'm7i.4xlarge', label: 'm7i.4xlarge (16 vCPU, 64GB RAM, Intel 4th Gen) - $0.8064/hr', cost: 0.8064, family: 'M7i', category: 'General Purpose' },
        { value: 'm7i.8xlarge', label: 'm7i.8xlarge (32 vCPU, 128GB RAM, Intel 4th Gen) - $1.6128/hr', cost: 1.6128, family: 'M7i', category: 'General Purpose' },
        { value: 'm7i.12xlarge', label: 'm7i.12xlarge (48 vCPU, 192GB RAM, Intel 4th Gen) - $2.4192/hr', cost: 2.4192, family: 'M7i', category: 'General Purpose' },
        { value: 'm7i.16xlarge', label: 'm7i.16xlarge (64 vCPU, 256GB RAM, Intel 4th Gen) - $3.2256/hr', cost: 3.2256, family: 'M7i', category: 'General Purpose' },
        { value: 'm7i.24xlarge', label: 'm7i.24xlarge (96 vCPU, 384GB RAM, Intel 4th Gen) - $4.8384/hr', cost: 4.8384, family: 'M7i', category: 'General Purpose' },
        { value: 'm7i.48xlarge', label: 'm7i.48xlarge (192 vCPU, 768GB RAM, Intel 4th Gen) - $9.6768/hr', cost: 9.6768, family: 'M7i', category: 'General Purpose' },
        
        // C5 - Compute Optimized (Intel)
        { value: 'c5.large', label: 'c5.large (2 vCPU, 4GB RAM, Compute) - $0.085/hr', cost: 0.085, family: 'C5', category: 'Compute Optimized' },
        { value: 'c5.xlarge', label: 'c5.xlarge (4 vCPU, 8GB RAM, Compute) - $0.17/hr', cost: 0.17, family: 'C5', category: 'Compute Optimized' },
        { value: 'c5.2xlarge', label: 'c5.2xlarge (8 vCPU, 16GB RAM, Compute) - $0.34/hr', cost: 0.34, family: 'C5', category: 'Compute Optimized' },
        { value: 'c5.4xlarge', label: 'c5.4xlarge (16 vCPU, 32GB RAM, Compute) - $0.68/hr', cost: 0.68, family: 'C5', category: 'Compute Optimized' },
        { value: 'c5.9xlarge', label: 'c5.9xlarge (36 vCPU, 72GB RAM, Compute) - $1.53/hr', cost: 1.53, family: 'C5', category: 'Compute Optimized' },
        { value: 'c5.12xlarge', label: 'c5.12xlarge (48 vCPU, 96GB RAM, Compute) - $2.04/hr', cost: 2.04, family: 'C5', category: 'Compute Optimized' },
        { value: 'c5.18xlarge', label: 'c5.18xlarge (72 vCPU, 144GB RAM, Compute) - $3.06/hr', cost: 3.06, family: 'C5', category: 'Compute Optimized' },
        { value: 'c5.24xlarge', label: 'c5.24xlarge (96 vCPU, 192GB RAM, Compute) - $4.08/hr', cost: 4.08, family: 'C5', category: 'Compute Optimized' },
        
        // C5a - Compute Optimized AMD
        { value: 'c5a.large', label: 'c5a.large (2 vCPU, 4GB RAM, Compute AMD) - $0.077/hr', cost: 0.077, family: 'C5a', category: 'Compute Optimized' },
        { value: 'c5a.xlarge', label: 'c5a.xlarge (4 vCPU, 8GB RAM, Compute AMD) - $0.154/hr', cost: 0.154, family: 'C5a', category: 'Compute Optimized' },
        { value: 'c5a.2xlarge', label: 'c5a.2xlarge (8 vCPU, 16GB RAM, Compute AMD) - $0.308/hr', cost: 0.308, family: 'C5a', category: 'Compute Optimized' },
        { value: 'c5a.4xlarge', label: 'c5a.4xlarge (16 vCPU, 32GB RAM, Compute AMD) - $0.616/hr', cost: 0.616, family: 'C5a', category: 'Compute Optimized' },
        { value: 'c5a.8xlarge', label: 'c5a.8xlarge (32 vCPU, 64GB RAM, Compute AMD) - $1.232/hr', cost: 1.232, family: 'C5a', category: 'Compute Optimized' },
        { value: 'c5a.12xlarge', label: 'c5a.12xlarge (48 vCPU, 96GB RAM, Compute AMD) - $1.848/hr', cost: 1.848, family: 'C5a', category: 'Compute Optimized' },
        { value: 'c5a.16xlarge', label: 'c5a.16xlarge (64 vCPU, 128GB RAM, Compute AMD) - $2.464/hr', cost: 2.464, family: 'C5a', category: 'Compute Optimized' },
        { value: 'c5a.24xlarge', label: 'c5a.24xlarge (96 vCPU, 192GB RAM, Compute AMD) - $3.696/hr', cost: 3.696, family: 'C5a', category: 'Compute Optimized' },
        
        // C6i - Compute Optimized (Intel 3rd Gen)
        { value: 'c6i.large', label: 'c6i.large (2 vCPU, 4GB RAM, Intel 3rd Gen) - $0.085/hr', cost: 0.085, family: 'C6i', category: 'Compute Optimized' },
        { value: 'c6i.xlarge', label: 'c6i.xlarge (4 vCPU, 8GB RAM, Intel 3rd Gen) - $0.17/hr', cost: 0.17, family: 'C6i', category: 'Compute Optimized' },
        { value: 'c6i.2xlarge', label: 'c6i.2xlarge (8 vCPU, 16GB RAM, Intel 3rd Gen) - $0.34/hr', cost: 0.34, family: 'C6i', category: 'Compute Optimized' },
        { value: 'c6i.4xlarge', label: 'c6i.4xlarge (16 vCPU, 32GB RAM, Intel 3rd Gen) - $0.68/hr', cost: 0.68, family: 'C6i', category: 'Compute Optimized' },
        { value: 'c6i.8xlarge', label: 'c6i.8xlarge (32 vCPU, 64GB RAM, Intel 3rd Gen) - $1.36/hr', cost: 1.36, family: 'C6i', category: 'Compute Optimized' },
        { value: 'c6i.12xlarge', label: 'c6i.12xlarge (48 vCPU, 96GB RAM, Intel 3rd Gen) - $2.04/hr', cost: 2.04, family: 'C6i', category: 'Compute Optimized' },
        { value: 'c6i.16xlarge', label: 'c6i.16xlarge (64 vCPU, 128GB RAM, Intel 3rd Gen) - $2.72/hr', cost: 2.72, family: 'C6i', category: 'Compute Optimized' },
        { value: 'c6i.24xlarge', label: 'c6i.24xlarge (96 vCPU, 192GB RAM, Intel 3rd Gen) - $4.08/hr', cost: 4.08, family: 'C6i', category: 'Compute Optimized' },
        { value: 'c6i.32xlarge', label: 'c6i.32xlarge (128 vCPU, 256GB RAM, Intel 3rd Gen) - $5.44/hr', cost: 5.44, family: 'C6i', category: 'Compute Optimized' },
        
        // C7i - Compute Optimized (Intel 4th Gen - Latest)
        { value: 'c7i.large', label: 'c7i.large (2 vCPU, 4GB RAM, Intel 4th Gen) - $0.0893/hr', cost: 0.0893, family: 'C7i', category: 'Compute Optimized' },
        { value: 'c7i.xlarge', label: 'c7i.xlarge (4 vCPU, 8GB RAM, Intel 4th Gen) - $0.1785/hr', cost: 0.1785, family: 'C7i', category: 'Compute Optimized' },
        { value: 'c7i.2xlarge', label: 'c7i.2xlarge (8 vCPU, 16GB RAM, Intel 4th Gen) - $0.357/hr', cost: 0.357, family: 'C7i', category: 'Compute Optimized' },
        { value: 'c7i.4xlarge', label: 'c7i.4xlarge (16 vCPU, 32GB RAM, Intel 4th Gen) - $0.714/hr', cost: 0.714, family: 'C7i', category: 'Compute Optimized' },
        { value: 'c7i.8xlarge', label: 'c7i.8xlarge (32 vCPU, 64GB RAM, Intel 4th Gen) - $1.428/hr', cost: 1.428, family: 'C7i', category: 'Compute Optimized' },
        { value: 'c7i.12xlarge', label: 'c7i.12xlarge (48 vCPU, 96GB RAM, Intel 4th Gen) - $2.142/hr', cost: 2.142, family: 'C7i', category: 'Compute Optimized' },
        { value: 'c7i.16xlarge', label: 'c7i.16xlarge (64 vCPU, 128GB RAM, Intel 4th Gen) - $2.856/hr', cost: 2.856, family: 'C7i', category: 'Compute Optimized' },
        { value: 'c7i.24xlarge', label: 'c7i.24xlarge (96 vCPU, 192GB RAM, Intel 4th Gen) - $4.284/hr', cost: 4.284, family: 'C7i', category: 'Compute Optimized' },
        { value: 'c7i.48xlarge', label: 'c7i.48xlarge (192 vCPU, 384GB RAM, Intel 4th Gen) - $8.568/hr', cost: 8.568, family: 'C7i', category: 'Compute Optimized' },
        
        // R5 - Memory Optimized (Intel)
        { value: 'r5.large', label: 'r5.large (2 vCPU, 16GB RAM, Memory) - $0.126/hr', cost: 0.126, family: 'R5', category: 'Memory Optimized' },
        { value: 'r5.xlarge', label: 'r5.xlarge (4 vCPU, 32GB RAM, Memory) - $0.252/hr', cost: 0.252, family: 'R5', category: 'Memory Optimized' },
        { value: 'r5.2xlarge', label: 'r5.2xlarge (8 vCPU, 64GB RAM, Memory) - $0.504/hr', cost: 0.504, family: 'R5', category: 'Memory Optimized' },
        { value: 'r5.4xlarge', label: 'r5.4xlarge (16 vCPU, 128GB RAM, Memory) - $1.008/hr', cost: 1.008, family: 'R5', category: 'Memory Optimized' },
        { value: 'r5.8xlarge', label: 'r5.8xlarge (32 vCPU, 256GB RAM, Memory) - $2.016/hr', cost: 2.016, family: 'R5', category: 'Memory Optimized' },
        { value: 'r5.12xlarge', label: 'r5.12xlarge (48 vCPU, 384GB RAM, Memory) - $3.024/hr', cost: 3.024, family: 'R5', category: 'Memory Optimized' },
        { value: 'r5.16xlarge', label: 'r5.16xlarge (64 vCPU, 512GB RAM, Memory) - $4.032/hr', cost: 4.032, family: 'R5', category: 'Memory Optimized' },
        { value: 'r5.24xlarge', label: 'r5.24xlarge (96 vCPU, 768GB RAM, Memory) - $6.048/hr', cost: 6.048, family: 'R5', category: 'Memory Optimized' },
        
        // R6i - Memory Optimized (Intel 3rd Gen)
        { value: 'r6i.large', label: 'r6i.large (2 vCPU, 16GB RAM, Intel 3rd Gen) - $0.126/hr', cost: 0.126, family: 'R6i', category: 'Memory Optimized' },
        { value: 'r6i.xlarge', label: 'r6i.xlarge (4 vCPU, 32GB RAM, Intel 3rd Gen) - $0.252/hr', cost: 0.252, family: 'R6i', category: 'Memory Optimized' },
        { value: 'r6i.2xlarge', label: 'r6i.2xlarge (8 vCPU, 64GB RAM, Intel 3rd Gen) - $0.504/hr', cost: 0.504, family: 'R6i', category: 'Memory Optimized' },
        { value: 'r6i.4xlarge', label: 'r6i.4xlarge (16 vCPU, 128GB RAM, Intel 3rd Gen) - $1.008/hr', cost: 1.008, family: 'R6i', category: 'Memory Optimized' },
        { value: 'r6i.8xlarge', label: 'r6i.8xlarge (32 vCPU, 256GB RAM, Intel 3rd Gen) - $2.016/hr', cost: 2.016, family: 'R6i', category: 'Memory Optimized' },
        { value: 'r6i.12xlarge', label: 'r6i.12xlarge (48 vCPU, 384GB RAM, Intel 3rd Gen) - $3.024/hr', cost: 3.024, family: 'R6i', category: 'Memory Optimized' },
        { value: 'r6i.16xlarge', label: 'r6i.16xlarge (64 vCPU, 512GB RAM, Intel 3rd Gen) - $4.032/hr', cost: 4.032, family: 'R6i', category: 'Memory Optimized' },
        { value: 'r6i.24xlarge', label: 'r6i.24xlarge (96 vCPU, 768GB RAM, Intel 3rd Gen) - $6.048/hr', cost: 6.048, family: 'R6i', category: 'Memory Optimized' },
        { value: 'r6i.32xlarge', label: 'r6i.32xlarge (128 vCPU, 1024GB RAM, Intel 3rd Gen) - $8.064/hr', cost: 8.064, family: 'R6i', category: 'Memory Optimized' },
      ],
      azure: [
        { value: 'Standard_B2s', label: 'Standard_B2s (2 vCPU, 4GB RAM) - $0.0416/hr', cost: 0.0416 },
        { value: 'Standard_B2ms', label: 'Standard_B2ms (2 vCPU, 8GB RAM) - $0.0832/hr', cost: 0.0832 },
        { value: 'Standard_D2s_v3', label: 'Standard_D2s_v3 (2 vCPU, 8GB RAM) - $0.096/hr', cost: 0.096 },
        { value: 'Standard_D4s_v3', label: 'Standard_D4s_v3 (4 vCPU, 16GB RAM) - $0.192/hr', cost: 0.192 },
      ],
      gcp: [
        { value: 'e2-small', label: 'e2-small (2 vCPU, 2GB RAM) - $0.0201/hr', cost: 0.0201 },
        { value: 'e2-medium', label: 'e2-medium (2 vCPU, 4GB RAM) - $0.0402/hr', cost: 0.0402 },
        { value: 'e2-standard-2', label: 'e2-standard-2 (2 vCPU, 8GB RAM) - $0.0804/hr', cost: 0.0804 },
        { value: 'n2-standard-2', label: 'n2-standard-2 (2 vCPU, 8GB RAM) - $0.097/hr', cost: 0.097 },
      ],
      digitalocean: [
        { value: 's-2vcpu-2gb', label: 's-2vcpu-2gb (2 vCPU, 2GB RAM) - $0.0268/hr', cost: 0.0268 },
        { value: 's-2vcpu-4gb', label: 's-2vcpu-4gb (2 vCPU, 4GB RAM) - $0.0536/hr', cost: 0.0536 },
        { value: 's-4vcpu-8gb', label: 's-4vcpu-8gb (4 vCPU, 8GB RAM) - $0.107/hr', cost: 0.107 },
      ],
      linode: [
        { value: 'g6-standard-1', label: 'Linode 2GB (1 vCPU, 2GB RAM) - $0.015/hr', cost: 0.015 },
        { value: 'g6-standard-2', label: 'Linode 4GB (2 vCPU, 4GB RAM) - $0.030/hr', cost: 0.030 },
        { value: 'g6-standard-4', label: 'Linode 8GB (4 vCPU, 8GB RAM) - $0.060/hr', cost: 0.060 },
      ],
    };
    return types[cloudProvider] || types.aws;
  };

  const getOSOptions = () => {
    const osOptions = {
      aws: ['Amazon Linux 2', 'Ubuntu 22.04 LTS', 'Ubuntu 20.04 LTS', 'Windows Server 2022 Datacenter', 'Windows Server 2019 Datacenter', 'Red Hat Enterprise Linux 8'],
      azure: ['Ubuntu 22.04 LTS', 'Ubuntu 20.04 LTS', 'Windows Server 2022', 'Windows Server 2019', 'Red Hat Enterprise Linux 8'],
      gcp: ['Ubuntu 22.04 LTS', 'Debian 11', 'CentOS 8', 'Windows Server 2022', 'Windows Server 2019'],
      digitalocean: ['Ubuntu 22.04', 'Ubuntu 20.04', 'Debian 11', 'Rocky Linux 9'],
      linode: ['Ubuntu 22.04 LTS', 'Debian 11', 'Alpine Linux', 'CentOS Stream 9'],
    };
    return osOptions[cloudProvider] || osOptions.aws;
  };

  const calculateMonthlyCost = () => {
    const instance = getInstanceTypes().find(t => t.value === formData.nodeInstanceType);
    const costPerHour = instance ? instance.cost : 0;
    const hoursPerMonth = 730; // Average hours in a month
    const nodeCost = costPerHour * hoursPerMonth * formData.nodeCount;
    
    let vmCost = 0;
    if (formData.enableAdditionalVMs) {
      const vmInstance = getInstanceTypes().find(t => t.value === formData.vmInstanceType);
      const vmCostPerHour = vmInstance ? vmInstance.cost : 0;
      vmCost = vmCostPerHour * hoursPerMonth * formData.vmCount;
    }
    
    return (nodeCost + vmCost).toFixed(2);
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>
        {terms.providerName} Compute Resources Configuration
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        Configure the compute resources for your {terms.clusterService} cluster. Worker nodes run your containerized applications,
        while additional {terms.vm}s can be used for auxiliary services, databases, or other workloads.
      </Typography>

      {/* Kubernetes Node Pool */}
      <Box sx={{ mb: 4, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
          {terms.clusterService} Worker Nodes
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          Worker nodes host your Kubernetes pods and run your containerized applications.
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label={`${terms.nodeGroup} Name`}
              value={formData.nodeGroupName}
              onChange={(e) => onChange('nodeGroupName', e.target.value)}
              placeholder={`e.g., ${formData.clusterName ? formData.clusterName + '-node-group' : 'my-node-group'}`}
              helperText={`Custom name for your ${terms.nodeGroup.toLowerCase()}. Leave empty to auto-generate from cluster name.`}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              label={`${terms.nodeGroup} Count`}
              value={formData.nodeCount}
              onChange={(e) => onChange('nodeCount', parseInt(e.target.value) || 1)}
              inputProps={{ min: 1, max: 100 }}
              helperText={`Number of worker nodes in your ${terms.cluster.toLowerCase()} (1-100)`}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Autocomplete
              fullWidth
              options={getInstanceTypes()}
              value={getInstanceTypes().find(t => t.value === formData.nodeInstanceType) || null}
              onChange={(e, newValue) => onChange('nodeInstanceType', newValue?.value || 't3.medium')}
              getOptionLabel={(option) => option.label}
              groupBy={(option) => option.category}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={`${terms.providerName} Instance Type`}
                  helperText={`Search by name, vCPU, RAM, or category for ${terms.vm}`}
                  placeholder="Search instances..."
                />
              )}
              renderOption={(props, option) => (
                <li {...props} key={option.value}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                    <Typography variant="body2">{option.label}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {option.family} • {option.category}
                    </Typography>
                  </Box>
                </li>
              )}
              isOptionEqualToValue={(option, value) => option.value === value.value}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              label="Disk Size (GB)"
              value={formData.diskSizeGB}
              onChange={(e) => onChange('diskSizeGB', parseInt(e.target.value) || 20)}
              inputProps={{ min: 20, max: 1000 }}
              helperText="Root disk size for each node (minimum 20GB)"
            />
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.enableAutoscaling}
                  onChange={(e) => onChange('enableAutoscaling', e.target.checked)}
                />
              }
              label="Enable Auto-Scaling (Recommended)"
            />
            <Typography variant="caption" display="block" color="textSecondary" sx={{ ml: 4 }}>
              Automatically adjust node count based on workload demand to optimize costs
            </Typography>
          </Grid>

          {formData.enableAutoscaling && (
            <>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Minimum Nodes"
                  value={formData.minNodeCount}
                  onChange={(e) => onChange('minNodeCount', parseInt(e.target.value) || 1)}
                  inputProps={{ min: 1, max: formData.nodeCount }}
                  helperText="Scale down to this many nodes during low usage"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Maximum Nodes"
                  value={formData.maxNodeCount}
                  onChange={(e) => onChange('maxNodeCount', parseInt(e.target.value) || 1)}
                  inputProps={{ min: formData.nodeCount, max: 100 }}
                  helperText="Scale up to this many nodes during high demand"
                />
              </Grid>
            </>
          )}
        </Grid>
      </Box>

      {/* Additional Virtual Machines */}
      <Box sx={{ mb: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={formData.enableAdditionalVMs}
              onChange={(e) => onChange('enableAdditionalVMs', e.target.checked)}
            />
          }
          label={<Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Add Additional {terms.vm}s (Optional)</Typography>}
        />
        <Typography variant="body2" color="textSecondary" sx={{ ml: 4, mb: 2 }}>
          Deploy standalone {terms.vm}s for databases, caching layers, monitoring tools, or other services that don't run in Kubernetes
        </Typography>

        {formData.enableAdditionalVMs && (
          <Grid container spacing={3} sx={{ ml: 2 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label={`${terms.vm} Count`}
                value={formData.vmCount}
                onChange={(e) => onChange('vmCount', parseInt(e.target.value) || 0)}
                inputProps={{ min: 0, max: 20 }}
                helperText={`How many ${terms.vm}s do you need? (0-20)`}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={`${terms.vm} Base Name`}
                value={formData.vmBaseName}
                onChange={(e) => onChange('vmBaseName', e.target.value)}
                placeholder="e.g., zlps-adt-app"
                helperText={`Base name for ${terms.vm}s (will add -01, -02, etc.)`}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Autocomplete
                fullWidth
                options={getInstanceTypes()}
                value={getInstanceTypes().find(t => t.value === formData.vmInstanceType) || null}
                onChange={(e, newValue) => onChange('vmInstanceType', newValue?.value || 't3.medium')}
                getOptionLabel={(option) => option.label}
                groupBy={(option) => option.category}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={`${terms.vm} Instance Type`}
                    helperText="Search by name, vCPU, RAM, or category"
                    placeholder="Search instances..."
                  />
                )}
                renderOption={(props, option) => (
                  <li {...props} key={option.value}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                      <Typography variant="body2">{option.label}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {option.family} • {option.category}
                      </Typography>
                    </Box>
                  </li>
                )}
                isOptionEqualToValue={(option, value) => option.value === value.value}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                select
                label="Operating System"
                value={formData.vmOperatingSystem}
                onChange={(e) => onChange('vmOperatingSystem', e.target.value)}
                SelectProps={{ native: true }}
                helperText="Select the OS for your VMs"
              >
                {getOSOptions().map((os) => (
                  <option key={os} value={os}>
                    {os}
                  </option>
                ))}
              </TextField>
              
              {formData.vmOperatingSystem && formData.vmOperatingSystem.includes('Windows Server') && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <strong>Windows Server Licensing:</strong> Windows Server VMs include Microsoft licensing costs. 
                  Datacenter edition supports unlimited VMs and containers. Additional costs apply compared to Linux VMs.
                </Alert>
              )}
            </Grid>
          </Grid>
        )}
      </Box>

      {/* Cost Estimation */}
      <Alert severity="info" sx={{ mt: 2 }}>
        <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
          💰 Estimated Monthly Cost: ${calculateMonthlyCost()}
        </Typography>
        <Typography variant="caption">
          This is an estimate for compute resources only. Additional costs for storage, networking, and data transfer will apply.
          Actual costs may vary based on usage patterns and regional pricing.
        </Typography>
      </Alert>
    </Box>
  );
};

// Step 4: Networking Configuration
const StepNetworkingConfig = ({ formData, cloudProvider, onChange }) => {
  const terms = getCloudTerminology(cloudProvider);

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>
        Networking Configuration
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        Configure the network infrastructure for your deployment. A {terms.vpc} provides isolated networking,
        subnets organize resources by access level, and gateways enable secure internet connectivity.
      </Typography>

      {/* VPC Configuration */}
      <Box sx={{ mb: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
          {terms.vpc} Configuration
        </Typography>

        <FormControlLabel
          control={
            <Checkbox
              checked={formData.createNewVPC}
              onChange={(e) => onChange('createNewVPC', e.target.checked)}
            />
          }
          label={`Create New ${terms.vpc} (Recommended)`}
        />
        <Typography variant="caption" display="block" color="textSecondary" sx={{ ml: 4, mb: 2 }}>
          Creates an isolated network with best-practice security defaults
        </Typography>

        {formData.createNewVPC ? (
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={`${terms.vpc} Name`}
                value={formData.vpcName}
                onChange={(e) => onChange('vpcName', e.target.value)}
                placeholder={`e.g., ${formData.clusterName ? formData.clusterName + '-vpc' : 'my-vpc'}`}
                helperText="Custom name for your VPC. Leave empty to auto-generate from cluster name."
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={`${terms.vpc} CIDR Block`}
                value={formData.vpcCIDR}
                onChange={(e) => onChange('vpcCIDR', e.target.value)}
                placeholder="10.0.0.0/16"
                helperText="IPv4 CIDR block for the VPC (e.g., 10.0.0.0/16 provides 65,536 IP addresses)"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Public Subnet 1 CIDR"
                value={formData.publicSubnets[0] || ''}
                onChange={(e) => {
                  const newSubnets = [...formData.publicSubnets];
                  newSubnets[0] = e.target.value;
                  onChange('publicSubnets', newSubnets);
                }}
                placeholder="10.0.1.0/24"
                helperText="Subnet for resources with internet access (load balancers, bastion hosts)"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Public Subnet 2 CIDR"
                value={formData.publicSubnets[1] || ''}
                onChange={(e) => {
                  const newSubnets = [...formData.publicSubnets];
                  newSubnets[1] = e.target.value;
                  onChange('publicSubnets', newSubnets);
                }}
                placeholder="10.0.2.0/24"
                helperText={`Second public subnet in different ${terms.availabilityZone.toLowerCase()} (for high availability)`}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Private Subnet 1 CIDR"
                value={formData.privateSubnets[0] || ''}
                onChange={(e) => {
                  const newSubnets = [...formData.privateSubnets];
                  newSubnets[0] = e.target.value;
                  onChange('privateSubnets', newSubnets);
                }}
                placeholder="10.0.10.0/24"
                helperText="Subnet for internal resources (Kubernetes nodes, databases)"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Private Subnet 2 CIDR"
                value={formData.privateSubnets[1] || ''}
                onChange={(e) => {
                  const newSubnets = [...formData.privateSubnets];
                  newSubnets[1] = e.target.value;
                  onChange('privateSubnets', newSubnets);
                }}
                placeholder="10.0.11.0/24"
                helperText={`Second private subnet in different ${terms.availabilityZone.toLowerCase()}`}
              />
            </Grid>
          </Grid>
        ) : (
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={`Existing ${terms.vpc} ID`}
                value={formData.existingVPCId}
                onChange={(e) => onChange('existingVPCId', e.target.value)}
                placeholder={cloudProvider === 'aws' ? 'vpc-1234567890abcdef0' : 'Enter VPC ID'}
                helperText={`ID of the existing ${terms.vpc} to use`}
              />
            </Grid>
          </Grid>
        )}
      </Box>

      {/* Network Features */}
      <Box sx={{ mb: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
          Network Features
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.enableNATGateway}
                  onChange={(e) => onChange('enableNATGateway', e.target.checked)}
                />
              }
              label={`Enable ${terms.gateway} (Recommended for Production)`}
            />
            <Typography variant="caption" display="block" color="textSecondary" sx={{ ml: 4 }}>
              Allows private subnet resources to access the internet for updates and external APIs.
              Cost: ~$0.045/hour + data processing charges.
            </Typography>
          </Box>

          <Box>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.enableLoadBalancer}
                  onChange={(e) => onChange('enableLoadBalancer', e.target.checked)}
                />
              }
              label={`Enable ${terms.lb}`}
            />
            <Typography variant="caption" display="block" color="textSecondary" sx={{ ml: 4 }}>
              Distributes incoming traffic across multiple nodes for high availability and scalability.
              Essential for production applications.
            </Typography>
          </Box>
        </Box>
      </Box>

      <Alert severity="info">
        <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
          📡 Networking Best Practices
        </Typography>
        <Typography variant="caption" component="div">
          • Use multiple subnets across {terms.availabilityZone.toLowerCase()}s for high availability<br />
          • Keep databases and application servers in private subnets<br />
          • Enable {terms.gateway} for private subnet internet access<br />
          • Use {terms.lb} to distribute traffic and enable auto-scaling
        </Typography>
      </Alert>
    </Box>
  );
};

// Step 5: Storage Configuration
const StepStorageConfig = ({ formData, cloudProvider, onChange }) => {
  const terms = getCloudTerminology(cloudProvider);
  
  const getStorageTypes = () => {
    const types = {
      aws: [
        { value: 'gp3', label: 'General Purpose SSD (gp3) - Balanced price/performance', cost: 0.08 },
        { value: 'gp2', label: 'General Purpose SSD (gp2) - Previous generation', cost: 0.10 },
        { value: 'io2', label: 'Provisioned IOPS SSD (io2) - High performance', cost: 0.125 },
        { value: 'st1', label: 'Throughput Optimized HDD (st1) - Low cost, high throughput', cost: 0.045 },
      ],
      azure: [
        { value: 'Premium_LRS', label: 'Premium SSD (LRS) - High performance', cost: 0.135 },
        { value: 'StandardSSD_LRS', label: 'Standard SSD (LRS) - Balanced', cost: 0.075 },
        { value: 'Standard_LRS', label: 'Standard HDD (LRS) - Low cost', cost: 0.04 },
      ],
      gcp: [
        { value: 'pd-ssd', label: 'SSD Persistent Disk - High performance', cost: 0.17 },
        { value: 'pd-balanced', label: 'Balanced Persistent Disk - Cost-effective', cost: 0.10 },
        { value: 'pd-standard', label: 'Standard Persistent Disk - Low cost', cost: 0.04 },
      ],
      digitalocean: [
        { value: 'ssd', label: 'Block Storage SSD - High performance', cost: 0.10 },
      ],
      linode: [
        { value: 'block-storage', label: 'Block Storage - Standard SSD', cost: 0.10 },
      ],
    };
    return types[cloudProvider] || types.aws;
  };

  const calculateStorageCost = () => {
    let cost = 0;
    
    if (formData.enableBlockStorage) {
      const storageType = getStorageTypes().find(t => t.value === formData.blockStorageType);
      const costPerGB = storageType ? storageType.cost : 0.08;
      cost += costPerGB * formData.blockStorageSize;
    }
    
    if (formData.enableFileStorage) {
      const fileCostPerGB = 0.30; // EFS/Azure Files average
      cost += fileCostPerGB * formData.fileStorageSize;
    }
    
    if (formData.enableObjectStorage) {
      cost += 0.023 * 100; // S3 standard storage, estimated 100GB
    }
    
    return cost.toFixed(2);
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>
        {terms.providerName} Storage Configuration
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        Configure storage for your applications. {terms.blockStorage} is for databases and persistent data,
        {terms.fileStorage} for shared files, and {terms.objectStorage} for backups, logs, and media files.
      </Typography>

      {/* Block Storage */}
      <Box sx={{ mb: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={formData.enableBlockStorage}
              onChange={(e) => onChange('enableBlockStorage', e.target.checked)}
            />
          }
          label={<Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{terms.blockStorage} (Recommended)</Typography>}
        />
        <Typography variant="body2" color="textSecondary" sx={{ ml: 4, mb: 2 }}>
          Persistent {terms.blockStorage.toLowerCase()}s for databases, stateful applications, and data that needs to survive pod restarts
        </Typography>

        {formData.enableBlockStorage && (
          <Grid container spacing={3} sx={{ ml: 2 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Storage Size (GB)"
                value={formData.blockStorageSize}
                onChange={(e) => onChange('blockStorageSize', parseInt(e.target.value) || 0)}
                inputProps={{ min: 1, max: 16000 }}
                helperText="Total block storage capacity (1-16,000 GB)"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Storage Type"
                value={formData.blockStorageType}
                onChange={(e) => onChange('blockStorageType', e.target.value)}
                SelectProps={{ native: true }}
                helperText="Choose based on performance needs"
              >
                {getStorageTypes().map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </TextField>
            </Grid>
          </Grid>
        )}
      </Box>

      {/* File Storage */}
      <Box sx={{ mb: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={formData.enableFileStorage}
              onChange={(e) => onChange('enableFileStorage', e.target.checked)}
            />
          }
          label={<Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{terms.fileStorage}</Typography>}
        />
        <Typography variant="body2" color="textSecondary" sx={{ ml: 4, mb: 2 }}>
          Shared file system accessible by multiple pods simultaneously. Ideal for shared configuration files, content management systems, and shared data
        </Typography>

        {formData.enableFileStorage && (
          <Grid container spacing={3} sx={{ ml: 2 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={`${terms.fileStorage} Name (Optional)`}
                value={formData.fileStorageName}
                onChange={(e) => onChange('fileStorageName', e.target.value)}
                placeholder="Leave empty to use cluster name"
                helperText={`Custom name for your ${terms.fileStorage}`}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Storage Size (GB)"
                value={formData.fileStorageSize}
                onChange={(e) => onChange('fileStorageSize', parseInt(e.target.value) || 0)}
                inputProps={{ min: 1, max: 10000 }}
                helperText={`Initial ${terms.fileStorage.toLowerCase()} capacity`}
              />
            </Grid>
          </Grid>
        )}
      </Box>

      {/* Object Storage */}
      <Box sx={{ mb: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={formData.enableObjectStorage}
              onChange={(e) => onChange('enableObjectStorage', e.target.checked)}
            />
          }
          label={<Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{terms.objectStorage}</Typography>}
        />
        <Typography variant="body2" color="textSecondary" sx={{ ml: 4, mb: 2 }}>
          Scalable object storage for backups, logs, media files, and static website content. Pay only for what you use
        </Typography>

        {formData.enableObjectStorage && (
          <Grid container spacing={3} sx={{ ml: 2 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={`${terms.objectStorage} Name`}
                value={formData.objectStorageBucket}
                onChange={(e) => onChange('objectStorageBucket', e.target.value)}
                placeholder="my-app-storage"
                helperText={`Globally unique name for your ${terms.objectStorage.toLowerCase()} (lowercase, no spaces)`}
              />
            </Grid>
          </Grid>
        )}
      </Box>

      {/* Container Registry */}
      <Box sx={{ mb: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={formData.enableContainerRegistry}
              onChange={(e) => onChange('enableContainerRegistry', e.target.checked)}
            />
          }
          label={<Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{terms.containerRegistry}</Typography>}
        />
            <Typography variant="body2" color="textSecondary" sx={{ ml: 4, mb: 2 }}>
              Private container registry for storing and managing Docker images. Includes vulnerability scanning and lifecycle policies.
            </Typography>        {formData.enableContainerRegistry && (
          <Grid container spacing={3} sx={{ ml: 2 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={`${terms.containerRegistry} Name (Optional)`}
                value={formData.containerRegistryName}
                onChange={(e) => onChange('containerRegistryName', e.target.value)}
                placeholder="Leave empty to use cluster name"
                helperText={`Custom name for your ${terms.containerRegistry.toLowerCase()} (lowercase, alphanumeric, hyphens)`}
              />
            </Grid>
          </Grid>
        )}
      </Box>

      <Alert severity="info">
        <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
          💾 Estimated Monthly Storage Cost: ${calculateStorageCost()}
        </Typography>
        <Typography variant="caption" component="div">
          • Block Storage: Best for databases and persistent application data<br />
          • File Storage: Best for shared files accessed by multiple pods<br />
          • Object Storage: Best for backups, logs, and static content (pay per GB)<br />
          • Container Registry: Stores Docker images with automatic scanning (~$1-2/month for small usage)
        </Typography>
      </Alert>
    </Box>
  );
};

// Step 6: Database Configuration
const StepDatabaseConfig = ({ formData, cloudProvider, onChange }) => {
  const terms = getCloudTerminology(cloudProvider);
  
  const getDatabaseEngines = () => {
    const engines = {
      aws: [
        { value: 'postgres', label: 'PostgreSQL', versions: ['14.6', '13.9', '12.13'] },
        { value: 'mysql', label: 'MySQL', versions: ['8.0.32', '5.7.40'] },
        { value: 'mariadb', label: 'MariaDB', versions: ['10.6.11', '10.5.18'] },
        { value: 'aurora-postgresql', label: 'Aurora PostgreSQL', versions: ['14.6', '13.9'] },
        { value: 'aurora-mysql', label: 'Aurora MySQL', versions: ['8.0.mysql_aurora.3.02.0'] },
        { value: 'sqlserver-ex', label: 'SQL Server Express Edition (Free)', versions: ['15.00.4236.7.v1', '14.00.3421.10.v1'] },
        { value: 'sqlserver-se', label: 'SQL Server Standard Edition', versions: ['15.00.4236.7.v1', '14.00.3421.10.v1'] },
        { value: 'sqlserver-ee', label: 'SQL Server Enterprise Edition', versions: ['15.00.4236.7.v1', '14.00.3421.10.v1'] },
      ],
      azure: [
        { value: 'postgres', label: 'Azure Database for PostgreSQL', versions: ['14', '13', '12'] },
        { value: 'mysql', label: 'Azure Database for MySQL', versions: ['8.0', '5.7'] },
        { value: 'mariadb', label: 'Azure Database for MariaDB', versions: ['10.3', '10.2'] },
        { value: 'sqlserver', label: 'Azure SQL Database', versions: ['12.0'] },
      ],
      gcp: [
        { value: 'postgres', label: 'Cloud SQL for PostgreSQL', versions: ['14', '13', '12'] },
        { value: 'mysql', label: 'Cloud SQL for MySQL', versions: ['8.0', '5.7'] },
        { value: 'sqlserver', label: 'Cloud SQL for SQL Server', versions: ['2019', '2017'] },
      ],
      digitalocean: [
        { value: 'postgres', label: 'Managed PostgreSQL', versions: ['14', '13', '12'] },
        { value: 'mysql', label: 'Managed MySQL', versions: ['8'] },
        { value: 'redis', label: 'Managed Redis', versions: ['7', '6'] },
      ],
      linode: [
        { value: 'postgres', label: 'Managed PostgreSQL', versions: ['14.6', '13.9'] },
        { value: 'mysql', label: 'Managed MySQL', versions: ['8.0'] },
      ],
    };
    return engines[cloudProvider] || engines.aws;
  };

  const getInstanceClasses = () => {
    const classes = {
      aws: [
        { value: 'db.t3.micro', label: 'db.t3.micro (1 vCPU, 1GB RAM) - Dev/Test', cost: 0.017 },
        { value: 'db.t3.small', label: 'db.t3.small (2 vCPU, 2GB RAM) - Light workloads', cost: 0.034 },
        { value: 'db.t3.medium', label: 'db.t3.medium (2 vCPU, 4GB RAM) - Small apps', cost: 0.068 },
        { value: 'db.m5.large', label: 'db.m5.large (2 vCPU, 8GB RAM) - Production', cost: 0.192 },
        { value: 'db.r5.large', label: 'db.r5.large (2 vCPU, 16GB RAM) - Memory intensive', cost: 0.24 },
      ],
      azure: [
        { value: 'B_Gen5_1', label: 'Basic (1 vCore) - Dev/Test', cost: 0.025 },
        { value: 'GP_Gen5_2', label: 'General Purpose (2 vCores) - Small apps', cost: 0.228 },
        { value: 'GP_Gen5_4', label: 'General Purpose (4 vCores) - Production', cost: 0.456 },
        { value: 'MO_Gen5_2', label: 'Memory Optimized (2 vCores)', cost: 0.295 },
      ],
      gcp: [
        { value: 'db-f1-micro', label: 'Shared Core (0.6GB RAM) - Dev/Test', cost: 0.0150 },
        { value: 'db-g1-small', label: 'Shared Core (1.7GB RAM) - Light', cost: 0.0500 },
        { value: 'db-n1-standard-1', label: 'Standard (1 vCPU, 3.75GB RAM)', cost: 0.1104 },
        { value: 'db-n1-standard-2', label: 'Standard (2 vCPU, 7.5GB RAM)', cost: 0.2208 },
      ],
      digitalocean: [
        { value: 'db-s-1vcpu-1gb', label: '1 vCPU, 1GB RAM - Dev/Test', cost: 0.0208 },
        { value: 'db-s-1vcpu-2gb', label: '1 vCPU, 2GB RAM - Light', cost: 0.0298 },
        { value: 'db-s-2vcpu-4gb', label: '2 vCPU, 4GB RAM - Production', cost: 0.0893 },
      ],
      linode: [
        { value: 'g6-nanode-1', label: 'Nanode (1GB RAM) - Dev/Test', cost: 0.0075 },
        { value: 'g6-standard-1', label: 'Standard (2GB RAM) - Light', cost: 0.015 },
        { value: 'g6-standard-2', label: 'Standard (4GB RAM) - Production', cost: 0.030 },
      ],
    };
    
    // Add SQL Server specific instance classes for AWS
    if (formData.dbEngine && formData.dbEngine.startsWith('sqlserver')) {
      // SQL Server Express - Free tier with smaller instances
      if (formData.dbEngine === 'sqlserver-ex') {
        return [
          { value: 'db.t3.micro', label: 'db.t3.micro (1 vCPU, 1GB RAM) - Dev/Test (Free tier eligible)', cost: 0.017 },
          { value: 'db.t3.small', label: 'db.t3.small (2 vCPU, 2GB RAM) - Small workloads', cost: 0.034 },
          { value: 'db.t3.medium', label: 'db.t3.medium (2 vCPU, 4GB RAM) - Light production', cost: 0.068 },
        ];
      }
      // SQL Server Standard/Enterprise - Larger instances
      return [
        { value: 'db.t3.small', label: 'db.t3.small (2 vCPU, 2GB RAM) - Dev/Test', cost: 0.068 },
        { value: 'db.t3.medium', label: 'db.t3.medium (2 vCPU, 4GB RAM) - Small apps', cost: 0.136 },
        { value: 'db.m5.large', label: 'db.m5.large (2 vCPU, 8GB RAM) - Production', cost: 0.384 },
        { value: 'db.m5.xlarge', label: 'db.m5.xlarge (4 vCPU, 16GB RAM) - Large apps', cost: 0.768 },
        { value: 'db.m5.2xlarge', label: 'db.m5.2xlarge (8 vCPU, 32GB RAM) - Enterprise', cost: 1.536 },
      ];
    }
    
    // SQL Server instance classes for Azure
    if (formData.dbEngine === 'sqlserver' && cloudProvider === 'azure') {
      return [
        { value: 'GP_Gen5_2', label: 'General Purpose (2 vCores) - Small apps', cost: 0.456 },
        { value: 'GP_Gen5_4', label: 'General Purpose (4 vCores) - Production', cost: 0.912 },
        { value: 'GP_Gen5_8', label: 'General Purpose (8 vCores) - Large apps', cost: 1.824 },
        { value: 'BC_Gen5_2', label: 'Business Critical (2 vCores) - High performance', cost: 1.164 },
        { value: 'BC_Gen5_4', label: 'Business Critical (4 vCores) - Enterprise', cost: 2.328 },
      ];
    }
    
    // SQL Server instance classes for GCP
    if (formData.dbEngine === 'sqlserver' && cloudProvider === 'gcp') {
      return [
        { value: 'db-custom-2-7680', label: 'Custom (2 vCPU, 7.68GB RAM) - Small apps', cost: 0.2208 },
        { value: 'db-custom-4-15360', label: 'Custom (4 vCPU, 15.36GB RAM) - Production', cost: 0.4416 },
        { value: 'db-custom-8-30720', label: 'Custom (8 vCPU, 30.72GB RAM) - Large apps', cost: 0.8832 },
        { value: 'db-custom-16-61440', label: 'Custom (16 vCPU, 61.44GB RAM) - Enterprise', cost: 1.7664 },
      ];
    }
    
    return classes[cloudProvider] || classes.aws;
  };

  const selectedEngine = getDatabaseEngines().find(e => e.value === formData.dbEngine);
  
  const calculateDatabaseCost = () => {
    if (!formData.enableRDS) return '0.00';
    
    const instance = getInstanceClasses().find(c => c.value === formData.dbInstanceClass);
    const costPerHour = instance ? instance.cost : 0.068;
    const hoursPerMonth = 730;
    let cost = costPerHour * hoursPerMonth;
    
    // Multi-AZ doubles the cost
    if (formData.dbMultiAZ) {
      cost *= 2;
    }
    
    // Storage cost
    const storageCostPerGB = 0.115; // Average RDS storage cost
    cost += storageCostPerGB * formData.dbAllocatedStorage;
    
    return cost.toFixed(2);
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>
        {terms.database} Configuration
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        Deploy a fully managed {terms.database} service. Managed databases handle backups, updates, monitoring, and scaling automatically,
        freeing you from database administration tasks.
      </Typography>

      <Box sx={{ mb: 3 }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={formData.enableRDS}
              onChange={(e) => onChange('enableRDS', e.target.checked)}
            />
          }
          label={<Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Deploy {terms.database}</Typography>}
        />
        <Typography variant="body2" color="textSecondary" sx={{ ml: 4 }}>
          Recommended for production applications requiring reliable, scalable database infrastructure
        </Typography>
      </Box>

      {formData.enableRDS && (
        <Box>
          {/* Database Engine */}
          <Box sx={{ mb: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
              Database Engine
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Engine Type"
                  value={formData.dbEngine}
                  onChange={(e) => {
                    onChange('dbEngine', e.target.value);
                    const engine = getDatabaseEngines().find(eng => eng.value === e.target.value);
                    if (engine && engine.versions.length > 0) {
                      onChange('dbVersion', engine.versions[0]);
                    }
                  }}
                  SelectProps={{ native: true }}
                  helperText="Choose your preferred database engine"
                >
                  {getDatabaseEngines().map((engine) => (
                    <option key={engine.value} value={engine.value}>
                      {engine.label}
                    </option>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Engine Version"
                  value={formData.dbVersion}
                  onChange={(e) => onChange('dbVersion', e.target.value)}
                  SelectProps={{ native: true }}
                  helperText="Select version (latest recommended)"
                >
                  {selectedEngine?.versions.map((version) => (
                    <option key={version} value={version}>
                      {version}
                    </option>
                  ))}
                </TextField>
              </Grid>
              
              {formData.dbEngine && (formData.dbEngine.startsWith('sqlserver') || formData.dbEngine === 'sqlserver') && (
                <Grid item xs={12}>
                  <Alert severity="info" sx={{ mt: 1 }}>
                    <strong>SQL Server Licensing:</strong> {formData.dbEngine === 'sqlserver-ex' 
                      ? 'Express Edition is FREE with no licensing costs (limited to 10GB database size, 1GB memory, 4 cores). Perfect for development and small applications.' 
                      : 'SQL Server instances include Microsoft licensing costs. Standard Edition is suitable for most applications. Enterprise Edition includes advanced features like unlimited virtualization, in-memory OLTP, and advanced analytics.'
                    }
                  </Alert>
                </Grid>
              )}
            </Grid>
          </Box>

          {/* Instance Configuration */}
          <Box sx={{ mb: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
              Instance Configuration
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  select
                  label="Instance Class"
                  value={formData.dbInstanceClass}
                  onChange={(e) => onChange('dbInstanceClass', e.target.value)}
                  SelectProps={{ native: true }}
                  helperText="Choose instance size based on workload"
                >
                  {getInstanceClasses().map((cls) => (
                    <option key={cls.value} value={cls.value}>
                      {cls.label}
                    </option>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Storage Size (GB)"
                  value={formData.dbAllocatedStorage}
                  onChange={(e) => onChange('dbAllocatedStorage', parseInt(e.target.value) || 20)}
                  inputProps={{ min: 20, max: 65536 }}
                  helperText="Database storage capacity (20-65,536 GB)"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Database Name/Identifier"
                  value={formData.dbName}
                  onChange={(e) => onChange('dbName', e.target.value)}
                  placeholder="myappdb"
                  helperText="Database instance identifier (lowercase, alphanumeric, hyphens)"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Master Username"
                  value={formData.dbUsername}
                  onChange={(e) => onChange('dbUsername', e.target.value)}
                  placeholder="admin"
                  helperText="Database master username (not 'root' or 'admin' on some providers)"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="password"
                  label="Master Password"
                  value={formData.dbPassword}
                  onChange={(e) => onChange('dbPassword', e.target.value)}
                  placeholder="Enter secure password (min 8 characters)"
                  helperText="Must be 8-128 characters. Include uppercase, lowercase, numbers, and symbols."
                  required={formData.enableRDS}
                />
              </Grid>
            </Grid>
          </Box>

          {/* High Availability & Backup */}
          <Box sx={{ mb: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
              High Availability & Backup
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
              <Box>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.dbMultiAZ}
                      onChange={(e) => onChange('dbMultiAZ', e.target.checked)}
                    />
                  }
                  label={`Enable ${terms.multiAZ} Deployment (Recommended for Production)`}
                />
                <Typography variant="caption" display="block" color="textSecondary" sx={{ ml: 4 }}>
                  {terms.multiAZDesc}
                  Provides automatic failover and high availability SLA. Cost: 2x instance price.
                </Typography>
              </Box>
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="number"
                  label="Backup Retention Period (Days)"
                  value={formData.dbBackupRetentionDays}
                  onChange={(e) => onChange('dbBackupRetentionDays', parseInt(e.target.value) || 7)}
                  inputProps={{ min: 0, max: 35 }}
                  helperText="How many days to retain automated backups (0-35). 7 days recommended for production."
                />
              </Grid>
            </Grid>
          </Box>

          <Alert severity="info">
            <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
              💰 Estimated Monthly Database Cost: ${calculateDatabaseCost()}
            </Typography>
            <Typography variant="caption" component="div">
              • Managed databases include automated backups, patching, and monitoring<br />
              • {terms.multiAZ} deployment doubles cost but provides high availability<br />
              • Consider instance class based on CPU and memory requirements<br />
              • Store master password securely - it cannot be retrieved later
            </Typography>
          </Alert>
        </Box>
      )}
    </Box>
  );
};

// Step 7: Monitoring Configuration
const StepMonitoringConfig = ({ formData, cloudProvider, onChange }) => {
  const terms = getCloudTerminology(cloudProvider);
  
  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>
        {terms.providerName} Monitoring & Logging Configuration
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        Enable monitoring and logging to track {terms.cluster.toLowerCase()} health, application performance, and troubleshoot issues.
        These services integrate with {terms.providerName}'s native monitoring solutions.
      </Typography>

      <Box sx={{ mb: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={formData.enableMonitoring}
              onChange={(e) => onChange('enableMonitoring', e.target.checked)}
            />
          }
          label={<Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Enable {terms.cluster} Monitoring (Recommended)</Typography>}
        />
        <Typography variant="body2" color="textSecondary" sx={{ ml: 4, mb: 1 }}>
          Collects metrics about {terms.cluster.toLowerCase()} health, resource usage (CPU, memory, disk), and pod performance
        </Typography>
        <Typography variant="caption" color="textSecondary" sx={{ ml: 4 }} component="div">
          • AWS: CloudWatch Container Insights (~$0.30/GB ingested + storage)<br />
          • Azure: Azure Monitor for Containers (~$0.25/GB ingested)<br />
          • GCP: Cloud Monitoring (free tier available, then ~$0.258/MB ingested)<br />
          • DigitalOcean: Built-in monitoring (free)<br />
          • Linode: Prometheus/Grafana stack integration
        </Typography>
      </Box>

      <Box sx={{ mb: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={formData.enableLogging}
              onChange={(e) => onChange('enableLogging', e.target.checked)}
            />
          }
          label={<Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Enable Centralized Logging (Recommended)</Typography>}
        />
        <Typography variant="body2" color="textSecondary" sx={{ ml: 4, mb: 1 }}>
          Aggregates logs from all pods and nodes into a centralized location for easy searching and troubleshooting
        </Typography>
        <Typography variant="caption" color="textSecondary" sx={{ ml: 4 }} component="div">
          • AWS: CloudWatch Logs (~$0.50/GB ingested + $0.03/GB storage)<br />
          • Azure: Log Analytics (~$2.30/GB ingested, first 5GB/month free)<br />
          • GCP: Cloud Logging (first 50GB/month free, then ~$0.50/GB)<br />
          • DigitalOcean: Log forwarding to external services<br />
          • Linode: ELK or Loki stack integration
        </Typography>
      </Box>

      <Box sx={{ mb: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={formData.enableAlerts}
              onChange={(e) => onChange('enableAlerts', e.target.checked)}
            />
          }
          label={<Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Enable Automated Alerts (Optional)</Typography>}
        />
        <Typography variant="body2" color="textSecondary" sx={{ ml: 4, mb: 2 }}>
          Get notified when cluster resources reach critical thresholds (high CPU, low disk space, pod failures)
        </Typography>

        {formData.enableAlerts && (
          <Grid container spacing={2} sx={{ ml: 2 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Alert Email Address"
                value={formData.alertEmail}
                onChange={(e) => onChange('alertEmail', e.target.value)}
                placeholder="alerts@example.com"
                helperText="Email address to receive critical alerts"
                type="email"
              />
            </Grid>
          </Grid>
        )}
      </Box>

      <Alert severity="warning" sx={{ mb: 2 }}>
        <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
          ⚠️ Monitoring & Logging Costs
        </Typography>
        <Typography variant="caption">
          Monitoring and logging services charge based on data ingestion and storage. A typical small cluster (3 nodes) generates
          5-10 GB of logs and metrics per month (~$5-15/month). Production clusters with verbose logging can generate significantly more.
        </Typography>
      </Alert>

      <Alert severity="info">
        <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
          📊 What You'll Get
        </Typography>
        <Typography variant="caption" component="div">
          • Real-time cluster health dashboard with key metrics<br />
          • Pod and node resource utilization tracking<br />
          • Application log aggregation and search<br />
          • Automated alerts for critical issues<br />
          • Performance trends and historical data<br />
          • Integration with your cloud provider's native tools
        </Typography>
      </Alert>
    </Box>
  );
};

// Step 8: Tags Configuration
const StepTags = ({ formData, cloudProvider, onChange }) => {
  const terms = getCloudTerminology(cloudProvider);
  
  const [tagKey, setTagKey] = useState('');
  const [tagValue, setTagValue] = useState('');
  const [tagError, setTagError] = useState('');

  const handleAddTag = () => {
    // Validation
    if (!tagKey.trim()) {
      setTagError('Tag key is required');
      return;
    }
    if (!tagValue.trim()) {
      setTagError('Tag value is required');
      return;
    }
    
    // Check for duplicate keys
    if (formData.tags.some(tag => tag.key === tagKey.trim())) {
      setTagError('Tag key already exists');
      return;
    }

    // Add tag
    const newTag = { key: tagKey.trim(), value: tagValue.trim() };
    onChange('tags', [...formData.tags, newTag]);
    
    // Clear inputs
    setTagKey('');
    setTagValue('');
    setTagError('');
  };

  const handleDeleteTag = (keyToDelete) => {
    onChange('tags', formData.tags.filter(tag => tag.key !== keyToDelete));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>
        {terms.providerName} Resource Tags
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        Add tags to organize and identify your {terms.providerName} resources. Tags will be applied to all resources created by this deployment
        ({terms.vpc}, subnets, security groups, {terms.vm}s, databases, storage, etc.).
      </Typography>

      {/* Add Tag Form */}
      <Box sx={{ mb: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
          Add New Tag
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={5}>
            <TextField
              fullWidth
              label="Tag Key"
              value={tagKey}
              onChange={(e) => {
                setTagKey(e.target.value);
                setTagError('');
              }}
              onKeyPress={handleKeyPress}
              placeholder="Environment"
              helperText="e.g., Environment, Project, Owner, CostCenter"
            />
          </Grid>
          <Grid item xs={12} sm={5}>
            <TextField
              fullWidth
              label="Tag Value"
              value={tagValue}
              onChange={(e) => {
                setTagValue(e.target.value);
                setTagError('');
              }}
              onKeyPress={handleKeyPress}
              placeholder="Production"
              helperText="e.g., Production, MyApp, John Doe, Finance"
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <Button
              fullWidth
              variant="contained"
              onClick={handleAddTag}
              sx={{ height: '56px' }}
            >
              Add Tag
            </Button>
          </Grid>
          {tagError && (
            <Grid item xs={12}>
              <Alert severity="error">{tagError}</Alert>
            </Grid>
          )}
        </Grid>
      </Box>

      {/* Tags List */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
          Current Tags ({formData.tags.length})
        </Typography>
        {formData.tags.length === 0 ? (
          <Alert severity="info">
            No tags added yet. Tags are optional but recommended for resource organization and cost tracking.
          </Alert>
        ) : (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {formData.tags.map((tag) => (
              <Chip
                key={tag.key}
                label={`${tag.key}: ${tag.value}`}
                onDelete={() => handleDeleteTag(tag.key)}
                color="primary"
                variant="outlined"
              />
            ))}
          </Box>
        )}
      </Box>

      {/* Common Tags Examples */}
      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
          💡 Common Tag Examples
        </Typography>
        <Typography variant="caption" component="div">
          <strong>Environment:</strong> Production, Staging, Development, QA<br />
          <strong>Project:</strong> WebApp, MobileBackend, Analytics, DataPipeline<br />
          <strong>Owner:</strong> Engineering, DevOps, DataTeam, john.doe@company.com<br />
          <strong>CostCenter:</strong> Engineering, Marketing, Sales, IT<br />
          <strong>Application:</strong> Frontend, Backend, Database, Cache<br />
          <strong>ManagedBy:</strong> Terraform, CloudFormation, Manual
        </Typography>
      </Alert>

      <Alert severity="warning">
        <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
          📋 Tagging Best Practices
        </Typography>
        <Typography variant="caption" component="div">
          • Use consistent tag naming conventions across your organization<br />
          • Always include Environment and Owner/Contact tags<br />
          • Use tags for cost allocation and billing reports<br />
          • Avoid sensitive information (passwords, API keys) in tag values<br />
          • Cloud providers have limits (AWS: 50 tags/resource, Azure: 50, GCP: 64)
        </Typography>
      </Alert>
    </Box>
  );
};

// Step 9: Review
const StepReview = ({ credential, formData, cloudProvider }) => {
  const terms = getCloudTerminology(cloudProvider);
  
  const calculateTotalCost = () => {
    let total = 0;
    
    // Compute costs
    const hoursPerMonth = 730;
    const nodeCost = 0.0416 * hoursPerMonth * formData.nodeCount; // Approximate
    total += nodeCost;
    
    if (formData.enableAdditionalVMs) {
      total += 0.0416 * hoursPerMonth * formData.vmCount;
    }
    
    // Storage costs
    if (formData.enableBlockStorage) {
      total += 0.08 * formData.blockStorageSize;
    }
    if (formData.enableFileStorage) {
      total += 0.30 * formData.fileStorageSize;
    }
    if (formData.enableObjectStorage) {
      total += 2.30; // Estimated
    }
    
    // Database costs
    if (formData.enableRDS) {
      total += 0.068 * hoursPerMonth;
      if (formData.dbMultiAZ) {
        total += 0.068 * hoursPerMonth;
      }
      total += 0.115 * formData.dbAllocatedStorage;
    }
    
    // Networking costs
    if (formData.enableNATGateway) {
      total += 0.045 * hoursPerMonth;
    }
    if (formData.enableLoadBalancer) {
      total += 0.025 * hoursPerMonth;
    }
    
    // Monitoring/Logging
    if (formData.enableMonitoring || formData.enableLogging) {
      total += 10; // Estimated
    }
    
    return total.toFixed(2);
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>
        Review Your {terms.providerName} Deployment Configuration
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        Please review all settings before deploying your {terms.clusterService} cluster. You can go back to any step to make changes.
      </Typography>

      {/* Cloud Provider & Cluster */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, color: 'primary.main' }}>
          🌐 {terms.providerName} - {terms.cluster}
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Card sx={{ backgroundColor: 'background.default' }}>
              <CardContent>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  Provider
                </Typography>
                <Typography variant="body2">{credential?.name}</Typography>
                <Typography variant="caption" color="textSecondary">
                  {terms.providerName} • {formData.region}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Card sx={{ backgroundColor: 'background.default' }}>
              <CardContent>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  {terms.cluster}
                </Typography>
                <Typography variant="body2">{formData.clusterName}</Typography>
                <Typography variant="caption" color="textSecondary">
                  Kubernetes v{formData.kubernetesVersion}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Resource Naming Convention */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, color: 'primary.main' }}>
          🏷️ Resource Names
        </Typography>
        <Alert severity="info">
          <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
            Resources will be created with the following names:
          </Typography>
          <Typography variant="caption" component="div" sx={{ mb: 0.5 }}>
            • <strong>{terms.cluster}:</strong> {formData.clusterName}
          </Typography>
          <Typography variant="caption" component="div" sx={{ mb: 0.5 }}>
            • <strong>{terms.nodeGroup}:</strong> {formData.nodeGroupName || `${formData.clusterName}-node-group`}
          </Typography>
          <Typography variant="caption" component="div" sx={{ mb: 0.5 }}>
            • <strong>{terms.vpc}:</strong> {formData.vpcName || `${formData.clusterName}-vpc`}
          </Typography>
          {formData.enableRDS && (
            <Typography variant="caption" component="div" sx={{ mb: 0.5 }}>
              • <strong>{terms.database}:</strong> {formData.dbName || `${formData.clusterName}-db`}
            </Typography>
          )}
          {formData.enableFileStorage && (
            <Typography variant="caption" component="div" sx={{ mb: 0.5 }}>
              • <strong>{terms.fileStorage}:</strong> {formData.fileStorageName || `${formData.clusterName}-efs`}
            </Typography>
          )}
          {formData.enableObjectStorage && (
            <Typography variant="caption" component="div" sx={{ mb: 0.5 }}>
              • <strong>{terms.objectStorage}:</strong> {formData.objectStorageBucket || `${formData.clusterName}-bucket`}
            </Typography>
          )}
          {formData.enableContainerRegistry && (
            <Typography variant="caption" component="div" sx={{ mb: 0.5 }}>
              • <strong>{terms.containerRegistry}:</strong> {formData.containerRegistryName || formData.clusterName}
            </Typography>
          )}
          {formData.enableAdditionalVMs && formData.vmBaseName && (
            <Typography variant="caption" component="div">
              • <strong>Additional {terms.vm}s:</strong> {formData.vmBaseName}-01, {formData.vmBaseName}-02, etc.
            </Typography>
          )}
        </Alert>
      </Box>

      {/* Compute Resources */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, color: 'primary.main' }}>
          💻 Compute Resources
        </Typography>
        <Card sx={{ backgroundColor: 'background.default' }}>
          <CardContent>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              <strong>Worker Nodes:</strong> {formData.nodeCount}x {formData.nodeInstanceType}
              {formData.enableAutoscaling && ` (Auto-scaling: ${formData.minNodeCount}-${formData.maxNodeCount})`}
            </Typography>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              <strong>Node Disk:</strong> {formData.diskSizeGB} GB per node
            </Typography>
            {formData.enableAdditionalVMs && (
              <>
                <Typography variant="body2" sx={{ mb: 0.5, mt: 1 }}>
                  <strong>Additional VMs:</strong> {formData.vmCount}x {formData.vmInstanceType}
                </Typography>
                {formData.vmBaseName && (
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    <strong>VM Base Name:</strong> {formData.vmBaseName} (will create {formData.vmBaseName}-01, {formData.vmBaseName}-02, etc.)
                  </Typography>
                )}
                <Typography variant="body2">
                  <strong>OS:</strong> {formData.vmOperatingSystem}
                </Typography>
              </>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Networking */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, color: 'primary.main' }}>
          📡 Networking
        </Typography>
        <Card sx={{ backgroundColor: 'background.default' }}>
          <CardContent>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              <strong>{terms.vpc}:</strong> {formData.createNewVPC ? `New ${terms.vpc} (${formData.vpcCIDR})` : `Existing (${formData.existingVPCId})`}
            </Typography>
            {formData.createNewVPC && (
              <>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  <strong>Public Subnets:</strong> {formData.publicSubnets.join(', ')}
                </Typography>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  <strong>Private Subnets:</strong> {formData.privateSubnets.join(', ')}
                </Typography>
              </>
            )}
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              <strong>{terms.gateway}:</strong> {formData.enableNATGateway ? '✓ Enabled' : '✗ Disabled'}
            </Typography>
            <Typography variant="body2">
              <strong>{terms.lb}:</strong> {formData.enableLoadBalancer ? '✓ Enabled' : '✗ Disabled'}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Storage */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, color: 'primary.main' }}>
          💾 Storage
        </Typography>
        <Card sx={{ backgroundColor: 'background.default' }}>
          <CardContent>
            {formData.enableBlockStorage && (
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                ✓ Block Storage: {formData.blockStorageSize} GB ({formData.blockStorageType})
              </Typography>
            )}
            {formData.enableFileStorage && (
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                ✓ File Storage: {formData.fileStorageSize} GB{formData.fileStorageName ? ` (${formData.fileStorageName})` : ''}
              </Typography>
            )}
            {formData.enableObjectStorage && (
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                ✓ Object Storage: {formData.objectStorageBucket}
              </Typography>
            )}
            {formData.enableContainerRegistry && (
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                ✓ Container Registry: {formData.containerRegistryName || 'Using cluster name'}
              </Typography>
            )}
            {!formData.enableBlockStorage && !formData.enableFileStorage && !formData.enableObjectStorage && !formData.enableContainerRegistry && (
              <Typography variant="body2" color="textSecondary">
                No additional storage configured
              </Typography>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Database */}
      {formData.enableRDS && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, color: 'primary.main' }}>
            🗄️ Database
          </Typography>
          <Card sx={{ backgroundColor: 'background.default' }}>
            <CardContent>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                <strong>Engine:</strong> {formData.dbEngine.toUpperCase()} v{formData.dbVersion}
              </Typography>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                <strong>Database Name:</strong> {formData.dbName || 'Using cluster name'}
              </Typography>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                <strong>Instance:</strong> {formData.dbInstanceClass}
              </Typography>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                <strong>Storage:</strong> {formData.dbAllocatedStorage} GB
              </Typography>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                <strong>{terms.multiAZ}:</strong> {formData.dbMultiAZ ? '✓ Enabled (High Availability)' : '✗ Disabled'}
              </Typography>
              <Typography variant="body2">
                <strong>Backup Retention:</strong> {formData.dbBackupRetentionDays} days
              </Typography>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Database Scripts */}
      {formData.enableRDS && formData.sqlScripts && formData.sqlScripts.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, color: 'primary.main' }}>
            📝 Database Scripts
          </Typography>
          <Card sx={{ backgroundColor: 'background.default' }}>
            <CardContent>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Total Scripts:</strong> {formData.sqlScripts.length}
              </Typography>
              <Box component="ul" sx={{ pl: 2, mb: 0 }}>
                {formData.sqlScripts.map((script, idx) => (
                  <Typography key={script.id} variant="caption" component="li" sx={{ mb: 0.5 }}>
                    {idx + 1}. {script.name} ({(script.size / 1024).toFixed(1)} KB)
                    {script.haltOnError && ' • Halt on error'}
                    {script.runInTransaction && ' • Transactional'}
                  </Typography>
                ))}
              </Box>
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="caption">
                  Scripts will execute after the database instance is validated as accessible.
                  Execution order: {formData.sqlScripts.map((_, idx) => idx + 1).join(' → ')}
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Monitoring & Logging */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, color: 'primary.main' }}>
          📊 Monitoring & Logging
        </Typography>
        <Card sx={{ backgroundColor: 'background.default' }}>
          <CardContent>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              <strong>Monitoring:</strong> {formData.enableMonitoring ? '✓ Enabled' : '✗ Disabled'}
            </Typography>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              <strong>Logging:</strong> {formData.enableLogging ? '✓ Enabled' : '✗ Disabled'}
            </Typography>
            {formData.enableAlerts && (
              <Typography variant="body2">
                <strong>Alerts:</strong> ✓ Enabled ({formData.alertEmail})
              </Typography>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Tags */}
      {formData.tags && formData.tags.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, color: 'primary.main' }}>
            🏷️ Resource Tags
          </Typography>
          <Card sx={{ backgroundColor: 'background.default' }}>
            <CardContent>
              <Typography variant="body2" sx={{ mb: 2 }}>
                <strong>{formData.tags.length}</strong> tag{formData.tags.length !== 1 ? 's' : ''} will be applied to all resources:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {formData.tags.map((tag) => (
                  <Chip
                    key={tag.key}
                    label={`${tag.key}: ${tag.value}`}
                    color="primary"
                    variant="outlined"
                    size="small"
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Cost Estimate */}
      <Alert severity="warning" sx={{ mb: 2 }}>
        <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
          💰 Estimated Monthly Cost: ${calculateTotalCost()}
        </Typography>
        <Typography variant="caption">
          This is a rough estimate based on current configuration and standard pricing. Actual costs may vary based on:
          • Data transfer and bandwidth usage<br />
          • Actual resource utilization vs provisioned capacity<br />
          • Regional pricing differences<br />
          • Additional services and features used<br />
          • Spot/reserved instance discounts (if applicable)
        </Typography>
      </Alert>

      <Alert severity="error">
        <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
          ⚠️ Important: Review Before Deploying
        </Typography>
        <Typography variant="caption" component="div">
          • Cloud resources will be created immediately upon deployment<br />
          • Billing starts as soon as resources are provisioned<br />
          • Some resources (like {terms.gateway}s and databases) have hourly charges<br />
          • Deletion/cleanup must be done manually if deployment fails<br />
          • Master database password will be auto-generated and stored securely
        </Typography>
      </Alert>
    </Box>
  );
};

export default DeploymentWizardMultiCloud;
