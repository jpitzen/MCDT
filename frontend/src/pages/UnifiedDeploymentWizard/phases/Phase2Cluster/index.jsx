import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  Alert,
  Collapse,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';
import StorageIcon from '@mui/icons-material/Storage';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useWizard } from '../../WizardContext';
import ClusterConfig from './ClusterConfig';
import NetworkConfig from './NetworkConfig';
import ContainerRegistry from './ContainerRegistry';

// Sub-step definitions for Phase 2
const CLUSTER_STEPS = [
  {
    key: 'config',
    label: 'Cluster Configuration',
    description: 'Configure cluster basics, Kubernetes version, and node settings',
    icon: <SettingsIcon />,
    component: ClusterConfig,
  },
  {
    key: 'networking',
    label: 'Networking',
    description: 'Configure VPC, subnets, and security groups',
    icon: <NetworkCheckIcon />,
    component: NetworkConfig,
  },
  {
    key: 'registry',
    label: 'Container Registry',
    description: 'Configure container registry for Docker images (ECR/ACR/GCR)',
    icon: <StorageIcon />,
    component: ContainerRegistry,
  },
];

function GuidedMode() {
  const { state, setSubStep } = useWizard();
  const [activeStep, setActiveStep] = useState(state.subStep || 0);

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
    const config = state.clusterConfig || {};
    const network = state.networkConfig || {};
    const registry = state.containerRegistry || {};
    if (stepKey === 'config') {
      // For existing clusters, just need the cluster name selected
      // For new clusters, need both cluster name and node type
      if (config.useExistingCluster) {
        return !!config.existingClusterName;
      }
      return !!(config.clusterName && config.nodeInstanceType);
    }
    if (stepKey === 'networking') {
      // For existing clusters, networking is already configured
      if (config.useExistingCluster) {
        return true;
      }
      return !!(network.vpcCidr || network.existingVpcId);
    }
    if (stepKey === 'registry') {
      // Registry is optional - consider complete if disabled or configured
      if (!registry.enabled) {
        return true;
      }
      // If enabled, check if configured properly
      if (registry.useExisting) {
        return !!registry.existingRegistryUrl;
      }
      return !!registry.name;
    }
    return false;
  };

  return (
    <Box>
      <Stepper activeStep={activeStep} orientation="vertical">
        {CLUSTER_STEPS.map((step, index) => {
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
                    {index === CLUSTER_STEPS.length - 1 ? 'Complete Phase' : 'Continue'}
                  </Button>
                </Box>
              </StepContent>
            </Step>
          );
        })}
      </Stepper>

      {activeStep === CLUSTER_STEPS.length && (
        <Alert severity="success" sx={{ mt: 3 }}>
          <Typography variant="subtitle1">Cluster Configuration Complete!</Typography>
          <Typography variant="body2">
            Your cluster and registry have been configured. Proceed to the next phase to set up database configuration.
          </Typography>
        </Alert>
      )}
    </Box>
  );
}

function ExpertMode() {
  const [expandedSections, setExpandedSections] = useState({
    config: true,
    networking: true,
    registry: true,
  });

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  return (
    <Box>
      {CLUSTER_STEPS.map((step) => {
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
                    <Typography variant="h6">{step.label}</Typography>
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
  );
}

export default function Phase2Cluster() {
  const { state } = useWizard();
  const { mode } = state;

  return (
    <Box>
      {/* Phase Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Phase 2: Cluster Configuration
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {mode === 'guided'
            ? 'Configure your Kubernetes cluster settings step by step.'
            : 'Configure all cluster settings. Expand sections as needed.'}
        </Typography>
      </Box>

      {/* Render based on mode */}
      {mode === 'guided' ? <GuidedMode /> : <ExpertMode />}
    </Box>
  );
}
