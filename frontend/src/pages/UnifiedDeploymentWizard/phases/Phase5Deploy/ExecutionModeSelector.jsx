import React, { useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  Alert,
  Chip,
  Button,
  CircularProgress,
} from '@mui/material';
import CloudIcon from '@mui/icons-material/Cloud';
import PreviewIcon from '@mui/icons-material/Preview';
import ComputerIcon from '@mui/icons-material/Computer';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useWizard } from '../../WizardContext';

const EXECUTION_MODES = [
  {
    value: 'production',
    label: 'Production Deployment',
    description: 'Deploy to real cloud infrastructure (AWS/Azure/GCP)',
    icon: <CloudIcon />,
    color: 'primary',
    details: [
      'Creates real cloud resources',
      'Incurs cloud provider costs',
      'Requires valid cloud credentials',
    ],
  },
  {
    value: 'dryRun',
    label: 'Dry Run (Preview Only)',
    description: 'Validate configuration and preview changes without deploying',
    icon: <PreviewIcon />,
    color: 'info',
    details: [
      'Validates credentials',
      'Generates Terraform plan',
      'Shows estimated cost',
      'Creates NO resources',
    ],
  },
  {
    value: 'localTest',
    label: 'Local Test (Minikube)',
    description: 'Deploy to local Minikube cluster for testing',
    icon: <ComputerIcon />,
    color: 'success',
    details: [
      'Full deployment flow',
      'Tests K8s manifests locally',
      'No cloud costs',
      'Requires Minikube running',
    ],
  },
];

function LocalEnvironmentStatus({ localEnv, onRefresh, loading }) {
  if (!localEnv.checked) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        Click "Check Environment" to verify local setup
      </Alert>
    );
  }

  const getStatusIcon = (isOk) => {
    return isOk ? (
      <CheckCircleIcon color="success" fontSize="small" />
    ) : (
      <ErrorIcon color="error" fontSize="small" />
    );
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        Local Environment Status
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
        <Chip
          icon={getStatusIcon(localEnv.minikubeStatus === 'running')}
          label={`Minikube: ${localEnv.minikubeStatus || 'unknown'}`}
          size="small"
          variant="outlined"
          color={localEnv.minikubeStatus === 'running' ? 'success' : 'error'}
        />
        <Chip
          icon={getStatusIcon(localEnv.isMinikubeContext)}
          label={`Context: ${localEnv.kubectlContext || 'none'}`}
          size="small"
          variant="outlined"
          color={localEnv.isMinikubeContext ? 'success' : 'warning'}
        />
        <Chip
          icon={getStatusIcon(localEnv.dockerRunning)}
          label={`Docker: ${localEnv.dockerRunning ? 'running' : 'stopped'}`}
          size="small"
          variant="outlined"
          color={localEnv.dockerRunning ? 'success' : 'error'}
        />
      </Box>
      
      {localEnv.isReady ? (
        <Alert severity="success" sx={{ mt: 1 }}>
          Local environment is ready for testing
        </Alert>
      ) : (
        <Alert severity="warning" sx={{ mt: 1 }}>
          Local environment is not ready. 
          {localEnv.minikubeStatus !== 'running' && ' Start Minikube with: minikube start'}
          {!localEnv.isMinikubeContext && ' Switch context with: kubectl config use-context minikube'}
        </Alert>
      )}
      
      <Button
        size="small"
        startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
        onClick={onRefresh}
        disabled={loading}
        sx={{ mt: 1 }}
      >
        Refresh Status
      </Button>
    </Box>
  );
}

export default function ExecutionModeSelector() {
  const { 
    state, 
    setExecutionMode, 
    checkLocalEnvironment 
  } = useWizard();
  
  const { executionMode, localEnvironment } = state;
  const [checking, setChecking] = React.useState(false);

  const handleCheckEnvironment = useCallback(async () => {
    setChecking(true);
    try {
      await checkLocalEnvironment();
    } finally {
      setChecking(false);
    }
  }, [checkLocalEnvironment]);

  // Auto-check local environment when localTest mode is selected
  useEffect(() => {
    if (executionMode === 'localTest' && !localEnvironment.checked) {
      handleCheckEnvironment();
    }
  }, [executionMode, localEnvironment.checked, handleCheckEnvironment]);

  const handleModeChange = (event) => {
    setExecutionMode(event.target.value);
  };

  return (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Deployment Mode
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Choose how you want to execute this deployment
        </Typography>

        <RadioGroup value={executionMode} onChange={handleModeChange}>
          {EXECUTION_MODES.map((mode) => (
            <Card
              key={mode.value}
              variant="outlined"
              sx={{
                mb: 1,
                borderColor: executionMode === mode.value ? `${mode.color}.main` : 'divider',
                backgroundColor: executionMode === mode.value ? `${mode.color}.50` : 'transparent',
                transition: 'all 0.2s',
                '&:hover': {
                  borderColor: `${mode.color}.light`,
                },
              }}
            >
              <Box sx={{ p: 2 }}>
                <FormControlLabel
                  value={mode.value}
                  control={<Radio color={mode.color} />}
                  label={
                    <Box sx={{ ml: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {mode.icon}
                        <Typography variant="subtitle1" fontWeight="medium">
                          {mode.label}
                        </Typography>
                        {mode.value === 'dryRun' && (
                          <Chip label="Safe" size="small" color="info" />
                        )}
                        {mode.value === 'localTest' && (
                          <Chip label="Free" size="small" color="success" />
                        )}
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {mode.description}
                      </Typography>
                    </Box>
                  }
                  sx={{ width: '100%', m: 0 }}
                />
                
                {executionMode === mode.value && (
                  <Box sx={{ mt: 2, ml: 5 }}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {mode.details.map((detail, idx) => (
                        <Chip
                          key={idx}
                          label={detail}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.75rem' }}
                        />
                      ))}
                    </Box>
                    
                    {mode.value === 'localTest' && (
                      <LocalEnvironmentStatus
                        localEnv={localEnvironment}
                        onRefresh={handleCheckEnvironment}
                        loading={checking}
                      />
                    )}
                  </Box>
                )}
              </Box>
            </Card>
          ))}
        </RadioGroup>

        {executionMode === 'production' && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Production Mode:</strong> This will create real cloud resources and may incur costs.
              Make sure your configuration is correct before proceeding.
            </Typography>
          </Alert>
        )}

        {executionMode === 'dryRun' && (
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Dry Run Mode:</strong> This will validate your configuration and generate a Terraform plan.
              No resources will be created. You can review the plan before executing a production deployment.
            </Typography>
          </Alert>
        )}

        {executionMode === 'localTest' && !localEnvironment.isReady && localEnvironment.checked && (
          <Alert severity="error" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Local Test Mode:</strong> Your local environment is not ready.
              Please ensure Minikube is running and kubectl context is set to 'minikube'.
            </Typography>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
