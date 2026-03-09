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
import SyncAltIcon from '@mui/icons-material/SyncAlt';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import SecurityIcon from '@mui/icons-material/Security';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useWizard } from '../../WizardContext';
import PortForwarding from './PortForwarding';
import Monitoring from './Monitoring';
import AccessInfoCard from './AccessInfoCard';
import ScanResultsPanel from './ScanResultsPanel';

// Sub-step definitions for Phase 6
const OPERATIONS_STEPS = [
  {
    key: 'portforward',
    label: 'Port Forwarding',
    description: 'Set up local access to cluster services',
    icon: <SyncAltIcon />,
    component: PortForwarding,
  },
  {
    key: 'monitoring',
    label: 'Monitoring',
    description: 'View cluster health and resource usage',
    icon: <MonitorHeartIcon />,
    component: Monitoring,
  },
  {
    key: 'security',
    label: 'Security Scan',
    description: 'Scan container images for vulnerabilities',
    icon: <SecurityIcon />,
    component: ScanResultsPanel,
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

  // Operations steps are optional, always allow proceeding
  const isStepComplete = () => true;

  return (
    <Box>
      <Stepper activeStep={activeStep} orientation="vertical">
        {OPERATIONS_STEPS.map((step, index) => {
          const StepComponent = step.component;
          const complete = isStepComplete(step.key);

          return (
            <Step key={step.key} completed={complete}>
              <StepLabel
                optional={
                  <Typography variant="caption" color="text.secondary">
                    Optional
                  </Typography>
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
                  >
                    {index === OPERATIONS_STEPS.length - 1 ? 'Complete Setup' : 'Continue'}
                  </Button>
                </Box>
              </StepContent>
            </Step>
          );
        })}
      </Stepper>

      {activeStep === OPERATIONS_STEPS.length && (
        <Alert severity="success" sx={{ mt: 3 }}>
          <Typography variant="subtitle1">🎉 Setup Complete!</Typography>
          <Typography variant="body2">
            Your deployment is fully configured and operational. You can now use the monitoring
            dashboard to keep track of your applications.
          </Typography>
        </Alert>
      )}
    </Box>
  );
}

function ExpertMode() {
  const [expandedSections, setExpandedSections] = useState({
    portforward: true,
    monitoring: true,
    security: true,
  });

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  return (
    <Box>
      {OPERATIONS_STEPS.map((step) => {
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

export default function Phase6Operations() {
  const { state } = useWizard();
  const { mode } = state;

  return (
    <Box>
      {/* Phase Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Phase 6: Operations & Monitoring
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {mode === 'guided'
            ? 'Set up operational tools and monitor your deployment.'
            : 'Configure port forwarding and view monitoring data.'}
        </Typography>
      </Box>

      {/* Post-deploy access information card */}
      <AccessInfoCard />

      {/* Render based on mode */}
      {mode === 'guided' ? <GuidedMode /> : <ExpertMode />}
    </Box>
  );
}
