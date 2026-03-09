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
import StorageIcon from '@mui/icons-material/Storage';
import CodeIcon from '@mui/icons-material/Code';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useWizard } from '../../WizardContext';
import DatabaseConfig from './DatabaseConfig';
import SqlScripts from './SqlScripts';

// Sub-step definitions for Phase 3
const DATABASE_STEPS = [
  {
    key: 'config',
    label: 'Database Configuration',
    description: 'Configure managed database service for your cloud provider',
    icon: <StorageIcon />,
    component: DatabaseConfig,
  },
  {
    key: 'scripts',
    label: 'SQL Scripts',
    description: 'Upload and manage initialization and migration scripts',
    icon: <CodeIcon />,
    component: SqlScripts,
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
    const dbConfig = state.databaseConfig || {};
    
    if (stepKey === 'config') {
      // Database is optional - complete if disabled or properly configured
      if (!dbConfig.enabled) {
        return true;
      }
      return !!(dbConfig.engine && dbConfig.instanceClass && dbConfig.dbName);
    }
    if (stepKey === 'scripts') {
      // SQL scripts are optional - always considered complete
      return true;
    }
    return false;
  };

  return (
    <Box>
      <Stepper activeStep={activeStep} orientation="vertical">
        {DATABASE_STEPS.map((step, index) => {
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
                    {index === DATABASE_STEPS.length - 1 ? 'Complete Phase' : 'Continue'}
                  </Button>
                </Box>
              </StepContent>
            </Step>
          );
        })}
      </Stepper>

      {activeStep === DATABASE_STEPS.length && (
        <Alert severity="success" sx={{ mt: 3 }}>
          <Typography variant="subtitle1">Database Configuration Complete!</Typography>
          <Typography variant="body2">
            Your database has been configured. Proceed to the next phase to set up storage.
          </Typography>
        </Alert>
      )}
    </Box>
  );
}

function ExpertMode() {
  const [expandedSections, setExpandedSections] = useState({
    config: true,
    scripts: true,
  });

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  return (
    <Box>
      {DATABASE_STEPS.map((step) => {
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

export default function Phase3Database() {
  const { state } = useWizard();
  const { mode } = state;

  return (
    <Box>
      {/* Phase Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Phase 3: Database Configuration
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {mode === 'guided'
            ? 'Configure your managed database service and initialization scripts step by step.'
            : 'Configure database settings and SQL scripts. Expand sections as needed.'}
        </Typography>
      </Box>

      {/* Render based on mode */}
      {mode === 'guided' ? <GuidedMode /> : <ExpertMode />}
    </Box>
  );
}
