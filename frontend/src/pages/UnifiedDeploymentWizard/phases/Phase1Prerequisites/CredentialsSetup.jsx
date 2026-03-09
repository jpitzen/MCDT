import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useWizard } from '../../WizardContext';
import { useCredentials } from '../../hooks';
import { useNavigate } from 'react-router-dom';
import { getProviderInfo } from '../../../../config/cloudProviders';

function CredentialCard({ credential, selected, onSelect, onTest }) {
  const provider = getProviderInfo(credential.cloudProvider);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const handleTest = async (e) => {
    e.stopPropagation();
    setTesting(true);
    try {
      const result = await onTest(credential.id);
      setTestResult(result);
    } catch (error) {
      setTestResult({ success: false, message: error.message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card
      onClick={() => onSelect(credential)}
      sx={{
        mb: 2,
        cursor: 'pointer',
        border: 2,
        borderColor: selected ? 'primary.main' : 'primary.light',
        backgroundColor: selected ? 'rgba(25, 118, 210, 0.15)' : 'rgba(25, 118, 210, 0.08)',
        transition: 'all 0.2s',
        '&:hover': {
          borderColor: 'primary.main',
          backgroundColor: 'rgba(25, 118, 210, 0.12)',
        },
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                backgroundColor: provider.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
              }}
            >
              {provider.icon}
            </Box>
            <Box>
              <Typography variant="h6">{credential.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {provider.name} • {credential.awsRegion || credential.region || 'No region set'}
              </Typography>
              {credential.description && (
                <Typography variant="caption" color="text.secondary">
                  {credential.description}
                </Typography>
              )}
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {selected && (
              <Chip
                icon={<CheckCircleIcon />}
                label="Selected"
                color="primary"
                size="small"
              />
            )}
            <Button
              size="small"
              variant="outlined"
              onClick={handleTest}
              disabled={testing}
              startIcon={testing ? <CircularProgress size={16} /> : <RefreshIcon />}
            >
              Test
            </Button>
          </Box>
        </Box>

        {testResult && (
          <Alert
            severity={testResult.success ? 'success' : 'error'}
            sx={{ mt: 2 }}
            icon={testResult.success ? <CheckCircleIcon /> : <ErrorIcon />}
          >
            {testResult.message || (testResult.success ? 'Connection successful!' : 'Connection failed')}
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

export default function CredentialsSetup() {
  const navigate = useNavigate();
  const { state, fetchCredentials, selectCredential, updateClusterConfig } = useWizard();
  const { validateCredential } = useCredentials();
  const { credentials, selectedCredential, loading } = state;

  useEffect(() => {
    if (credentials.length === 0) {
      fetchCredentials();
    }
  }, [credentials.length, fetchCredentials]);

  const handleSelect = (credential) => {
    selectCredential(credential);
    // Auto-set region in cluster config
    if (credential.awsRegion || credential.region) {
      updateClusterConfig({ region: credential.awsRegion || credential.region });
    }
  };

  const handleTest = async (credentialId) => {
    // Use the real validation API from useCredentials hook
    const result = await validateCredential(credentialId);
    return {
      success: result.success && result.isValid,
      message: result.message || (result.isValid ? 'Connection verified successfully' : 'Connection failed'),
    };
  };

  const handleAddCredential = () => {
    navigate('/credentials');
  };

  if (loading.credentials) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }} color="text.secondary">
          Loading credentials...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h6">Cloud Credentials</Typography>
          <Typography variant="body2" color="text.secondary">
            Select the cloud provider credentials to use for this deployment
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddCredential}
        >
          Add Credential
        </Button>
      </Box>

      {/* No credentials */}
      {credentials.length === 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          No cloud credentials found. Please add credentials to continue with the deployment.
        </Alert>
      )}

      {/* Credentials list */}
      {credentials.length > 0 && (
        <Box>
          {credentials.map((credential) => (
            <CredentialCard
              key={credential.id}
              credential={credential}
              selected={selectedCredential?.id === credential.id}
              onSelect={handleSelect}
              onTest={handleTest}
            />
          ))}
        </Box>
      )}

      {/* Selected credential summary */}
      {selectedCredential && (
        <Card sx={{ mt: 3, backgroundColor: 'rgba(46, 125, 50, 0.12)', border: 1, borderColor: 'success.main' }}>
          <CardContent>
            <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.primary' }}>
              <CheckCircleIcon color="success" />
              Ready to proceed
            </Typography>
            <Typography variant="body2" color="text.primary">
              You've selected <strong>{selectedCredential.name}</strong> for{' '}
              {getProviderInfo(selectedCredential.cloudProvider).name}.
              Click "Next" to continue configuring your deployment.
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
