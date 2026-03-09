import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Tooltip,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Check as CheckIcon,
  Error as ErrorIcon,
  CloudQueue as CloudIcon,
  CheckCircle as ValidateIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { AWSIcon, AzureIcon, GCPIcon, DigitalOceanIcon, LinodeIcon } from '../components/CloudProviderIcons';
import api from '../services/api';
import AWSCredentialForm from '../components/CloudCredentialForm/AWSCredentialForm';
import AzureCredentialForm from '../components/CloudCredentialForm/AzureCredentialForm';
import GCPCredentialForm from '../components/CloudCredentialForm/GCPCredentialForm';
import DigitalOceanCredentialForm from '../components/CloudCredentialForm/DigitalOceanCredentialForm';
import LinodeCredentialForm from '../components/CloudCredentialForm/LinodeCredentialForm';
import PermissionsInfoScreen from '../components/CloudCredentialForm/PermissionsInfoScreen';

export default function CredentialsManager() {
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('aws');
  const [editingCredential, setEditingCredential] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [credentialToDelete, setCredentialToDelete] = useState(null);
  const [validating, setValidating] = useState({});
  const [validationResultOpen, setValidationResultOpen] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [dialogStep, setDialogStep] = useState(0); // 0 = permissions info, 1 = credential form

  useEffect(() => {
    fetchCredentials();
  }, []);

  const fetchCredentials = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/credentials');
      setCredentials(response.data.data.credentials || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      console.error('Failed to fetch credentials:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCredential = (provider) => {
    setSelectedProvider(provider);
    setEditingCredential(null);
    setDialogStep(0); // Start with permissions info screen
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setDialogStep(0);
  };

  const handleProceedToForm = () => {
    setDialogStep(1);
  };

  const handleSubmitCredential = async (values) => {
    try {
      setError(null);
      const payload = {
        ...values,
        cloudProvider: selectedProvider
      };

      if (editingCredential) {
        await api.put(`/credentials/${editingCredential.id}`, payload);
      } else {
        // Use multi-cloud endpoint for non-AWS providers
        const endpoint = selectedProvider === 'aws' ? '/credentials' : '/credentials/multi-cloud';
        await api.post(endpoint, payload);
      }

      handleCloseDialog();
      fetchCredentials();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save credential');
    }
  };

  const handleDeleteCredential = async () => {
    if (!credentialToDelete) return;
    
    try {
      await api.delete(`/credentials/${credentialToDelete.id}`);
      setDeleteDialogOpen(false);
      setCredentialToDelete(null);
      fetchCredentials();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete credential');
    }
  };

  const handleValidateCredential = async (credentialId) => {
    setValidating(prev => ({ ...prev, [credentialId]: true }));
    setValidationResult(null);
    
    try {
      const response = await api.post(`/credentials/${credentialId}/validate`);
      
      // Show success modal
      setValidationResult({
        success: true,
        isValid: response.data.data?.isValid || response.data.isValid,
        message: response.data.message || 'Credentials are valid and working correctly!',
        credentialId
      });
      setValidationResultOpen(true);
      
      // Refresh credentials to show updated status
      fetchCredentials();
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.response?.data?.error || 'Validation failed';
      
      // Show error modal
      setValidationResult({
        success: false,
        isValid: false,
        message: errorMsg,
        details: err.response?.data?.details || null,
        credentialId
      });
      setValidationResultOpen(true);
      
      setError(errorMsg);
    } finally {
      setValidating(prev => ({ ...prev, [credentialId]: false }));
    }
  };

  const handleCloseValidationResult = () => {
    setValidationResultOpen(false);
    setValidationResult(null);
  };

  const getProviderIcon = (provider) => {
    const providerLower = (provider || 'aws').toLowerCase();
    const colors = {
      aws: '#FF9900',
      azure: '#0078D4',
      gcp: '#4285F4',
      digitalocean: '#0080FF',
      linode: '#00A95C'
    };
    
    return (
      <CloudIcon 
        sx={{ 
          color: colors[providerLower] || '#666',
          fontSize: 24
        }} 
      />
    );
  };

  const getValidationStatus = (isValid) => {
    if (isValid === null) return <Chip label="Not Tested" size="small" />;
    if (isValid) return <Chip icon={<CheckIcon />} label="Valid" color="success" size="small" />;
    return <Chip icon={<ErrorIcon />} label="Invalid" color="error" size="small" />;
  };

  const renderCredentialForm = () => {
    const formProps = {
      onSubmit: handleSubmitCredential,
      initialValues: editingCredential || {}
    };

    switch (selectedProvider) {
      case 'aws':
        return <AWSCredentialForm {...formProps} />;
      case 'azure':
        return <AzureCredentialForm {...formProps} />;
      case 'gcp':
        return <GCPCredentialForm {...formProps} />;
      case 'digitalocean':
        return <DigitalOceanCredentialForm {...formProps} />;
      case 'linode':
        return <LinodeCredentialForm {...formProps} />;
      default:
        return <Typography>Unsupported provider</Typography>;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4">Cloud Credentials</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Manage your cloud provider credentials for deployments
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            startIcon={<AWSIcon />}
            onClick={() => handleAddCredential('aws')}
            sx={{ backgroundColor: '#0078D4', '&:hover': { backgroundColor: '#005a9e' } }}
          >
            Add AWS
          </Button>
          <Button
            variant="contained"
            startIcon={<AzureIcon />}
            onClick={() => handleAddCredential('azure')}
            sx={{ backgroundColor: '#0078D4', '&:hover': { backgroundColor: '#005a9e' } }}
          >
            Add Azure
          </Button>
          <Button
            variant="contained"
            startIcon={<GCPIcon />}
            onClick={() => handleAddCredential('gcp')}
            sx={{ backgroundColor: '#0078D4', '&:hover': { backgroundColor: '#005a9e' } }}
          >
            Add GCP
          </Button>
          <Button
            variant="contained"
            startIcon={<DigitalOceanIcon />}
            onClick={() => handleAddCredential('digitalocean')}
            sx={{ backgroundColor: '#0078D4', '&:hover': { backgroundColor: '#005a9e' } }}
          >
            Add DigitalOcean
          </Button>
          <Button
            variant="contained"
            startIcon={<LinodeIcon />}
            onClick={() => handleAddCredential('linode')}
            sx={{ backgroundColor: '#0078D4', '&:hover': { backgroundColor: '#005a9e' } }}
          >
            Add Linode
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          {credentials.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary" gutterBottom>
                No credentials configured yet.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Add cloud provider credentials to start deploying Kubernetes clusters.
              </Typography>
              <Button
                variant="contained"
                startIcon={<AWSIcon />}
                onClick={() => handleAddCredential('aws')}
                sx={{ backgroundColor: '#0078D4', '&:hover': { backgroundColor: '#005a9e' } }}
              >
                Add Your First Credential
              </Button>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)' }}>
                    <TableCell>Provider</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Region</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {credentials.map((cred) => (
                    <TableRow key={cred.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getProviderIcon(cred.cloudProvider)}
                          <Typography variant="body2" fontWeight="medium">
                            {(cred.cloudProvider || 'aws').toUpperCase()}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{cred.name}</Typography>
                        {cred.description && (
                          <Typography variant="caption" color="text.secondary">
                            {cred.description}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{cred.awsRegion || cred.region || 'N/A'}</TableCell>
                      <TableCell>{getValidationStatus(cred.isValid)}</TableCell>
                      <TableCell>
                        {new Date(cred.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Edit Credential">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => {
                              setSelectedProvider(cred.cloudProvider);
                              setEditingCredential(cred);
                              setDialogStep(1); // Skip permissions screen for edits
                              setOpenDialog(true);
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Validate Credentials">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleValidateCredential(cred.id)}
                            disabled={validating[cred.id]}
                          >
                            {validating[cred.id] ? (
                              <CircularProgress size={18} />
                            ) : (
                              <ValidateIcon fontSize="small" />
                            )}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              setCredentialToDelete(cred);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Credential Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="h6">
              {editingCredential ? 'Edit Credential' : `Add ${selectedProvider.toUpperCase()} Credential`}
            </Typography>
            {!editingCredential && (
              <Stepper activeStep={dialogStep} sx={{ pt: 1 }}>
                <Step>
                  <StepLabel>Review Permissions</StepLabel>
                </Step>
                <Step>
                  <StepLabel>Enter Credentials</StepLabel>
                </Step>
              </Stepper>
            )}
          </Box>
        </DialogTitle>
        <DialogContent>
          {dialogStep === 0 && !editingCredential ? (
            <PermissionsInfoScreen
              provider={selectedProvider}
              onContinue={handleProceedToForm}
              onCancel={handleCloseDialog}
            />
          ) : (
            <>
              {renderCredentialForm()}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
                {!editingCredential && dialogStep === 1 && (
                  <Button onClick={() => setDialogStep(0)}>
                    Back
                  </Button>
                )}
                <Button onClick={handleCloseDialog}>Cancel</Button>
                <Button 
                  type="submit"
                  variant="contained"
                  onClick={() => document.querySelector('form')?.requestSubmit()}
                >
                  {editingCredential ? 'Update' : 'Add Credential'}
                </Button>
              </Box>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete credential "{credentialToDelete?.name}"?
          </Typography>
          <Alert severity="warning" sx={{ mt: 2 }}>
            This action cannot be undone. Any deployments using this credential may fail.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteCredential} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Validation Result Dialog */}
      <Dialog 
        open={validationResultOpen} 
        onClose={handleCloseValidationResult}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          bgcolor: validationResult?.success ? 'success.light' : 'error.light'
        }}>
          {validationResult?.success ? (
            <>
              <CheckIcon color="success" />
              <Typography variant="h6" component="span">Validation Successful</Typography>
            </>
          ) : (
            <>
              <ErrorIcon color="error" />
              <Typography variant="h6" component="span">Validation Failed</Typography>
            </>
          )}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Alert severity={validationResult?.success ? 'success' : 'error'} sx={{ mb: 2 }}>
            {validationResult?.message}
          </Alert>
          
          {validationResult?.details && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                <strong>Details:</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {JSON.stringify(validationResult.details, null, 2)}
              </Typography>
            </Box>
          )}

          {validationResult?.success && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                ✓ Connection to cloud provider established<br/>
                ✓ Credentials authenticated successfully<br/>
                ✓ API access verified
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseValidationResult} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
