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
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import VerifiedIcon from '@mui/icons-material/Verified';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useWizard } from '../../WizardContext';
import AccessModeConfig from './AccessModeConfig';
import K8sDeployment from './K8sDeployment';
import DeploymentVerification from './DeploymentVerification';
import ExecutionModeSelector from './ExecutionModeSelector';

// Sub-step definitions for Phase 5
// Note: Terraform Preview is available on the Saved Deployments page after the draft is approved
const DEPLOY_STEPS = [
  {
    key: 'accessMode',
    label: 'Access Mode',
    description: 'Choose internal or external access for the ZL application',
    icon: <RocketLaunchIcon />,
    component: AccessModeConfig,
  },
  {
    key: 'k8s',
    label: 'Kubernetes Deployment Configuration',
    description: 'Configure your applications for Kubernetes deployment',
    icon: <RocketLaunchIcon />,
    component: K8sDeployment,
  },
  {
    key: 'verify',
    label: 'Review & Verify',
    description: 'Review configuration and run verification checks',
    icon: <VerifiedIcon />,
    component: DeploymentVerification,
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
    const deploy = state.deployConfig || {};
    if (stepKey === 'accessMode') {
      // Internal is always valid; external needs a domain
      if (state.accessMode === 'external') {
        return (state.externalDomain || '').length > 0;
      }
      return true;
    }
    if (stepKey === 'k8s') {
      return (deploy.deployments || []).length > 0;
    }
    if (stepKey === 'verify') {
      // Mark as complete when user has deployments configured
      return (deploy.deployments || []).length > 0;
    }
    return false;
  };

  return (
    <Box>
      <Stepper activeStep={activeStep} orientation="vertical">
        {DEPLOY_STEPS.map((step, index) => {
          const StepComponent = step.component;
          const complete = isStepComplete(step.key);
          const isLastStep = index === DEPLOY_STEPS.length - 1;

          return (
            <Step key={step.key} completed={complete && activeStep > index}>
              <StepLabel
                optional={
                  complete && activeStep > index ? (
                    <Typography variant="caption" color="success.main">
                      Complete
                    </Typography>
                  ) : null
                }
                StepIconComponent={complete && activeStep > index ? () => <CheckCircleIcon color="success" /> : undefined}
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
                  {!isLastStep && (
                    <Button
                      variant="contained"
                      onClick={handleNext}
                      disabled={!complete}
                    >
                      Continue
                    </Button>
                  )}
                </Box>
              </StepContent>
            </Step>
          );
        })}
      </Stepper>

      {activeStep === DEPLOY_STEPS.length && (
        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="subtitle1">Configuration Complete</Typography>
          <Typography variant="body2">
            Use the "Submit for Review" button at the bottom of the page to submit your deployment for approval.
          </Typography>
        </Alert>
      )}
    </Box>
  );
}

function ExpertMode() {
  const [expandedSections, setExpandedSections] = useState({
    accessMode: true,
    k8s: true,
    verify: true,
  });

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  return (
    <Box>
      {DEPLOY_STEPS.map((step) => {
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

export default function Phase5Deploy() {
  const { state } = useWizard();
  const { mode } = state;

  return (
    <Box>
      {/* Phase Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Phase 5: Deploy Application
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {mode === 'guided'
            ? 'Deploy your applications and verify they are running correctly.'
            : 'Configure deployments and run verification checks.'}
        </Typography>
      </Box>

      {/* Execution Mode Selector - Choose Production/DryRun/LocalTest */}
      <ExecutionModeSelector />

      {/* Render based on mode */}
      {mode === 'guided' ? <GuidedMode /> : <ExpertMode />}
    </Box>
  );
}
