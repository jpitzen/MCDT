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
import LayersIcon from '@mui/icons-material/Layers';
import CloudIcon from '@mui/icons-material/Cloud';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useWizard } from '../../WizardContext';
import CSIDrivers from './CSIDrivers';
import StorageClasses from './StorageClasses';
import S3Storage from './S3Storage';

// Provider-specific object storage labels
const OBJECT_STORAGE_LABELS = {
  aws: { label: 'S3 Object Storage', description: 'Configure S3 buckets for application data, backups, and files' },
  azure: { label: 'Blob Storage', description: 'Configure Azure Blob containers for application data, backups, and files' },
  gcp: { label: 'Cloud Storage', description: 'Configure GCS buckets for application data, backups, and files' },
  digitalocean: { label: 'Spaces Object Storage', description: 'Configure Spaces buckets for application data, backups, and files' },
  linode: { label: 'Object Storage', description: 'Configure Linode Object Storage buckets for application data, backups, and files' },
};

// Sub-step definitions for Phase 4 (function to support provider-specific labels)
const getStorageSteps = (cloudProvider) => {
  const objStorage = OBJECT_STORAGE_LABELS[cloudProvider] || OBJECT_STORAGE_LABELS.aws;
  return [
    {
      key: 'csi',
      label: 'CSI Drivers',
      description: 'Install Container Storage Interface drivers for dynamic provisioning',
      icon: <StorageIcon />,
      component: CSIDrivers,
    },
    {
      key: 'classes',
      label: 'Storage Classes',
      description: 'Configure storage classes for different workload requirements',
      icon: <LayersIcon />,
      component: StorageClasses,
    },
    {
      key: 's3',
      label: objStorage.label,
      description: objStorage.description,
      icon: <CloudIcon />,
      component: S3Storage,
    },
  ];
};

function GuidedMode() {
  const { state, setSubStep } = useWizard();
  const [activeStep, setActiveStep] = useState(state.subStep || 0);
  const cloudProvider = state.cloudProvider || 'aws';
  const STORAGE_STEPS = getStorageSteps(cloudProvider);

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
    const storage = state.storageConfig || {};
    if (stepKey === 'csi') {
      return storage.csiDriversChecked === true;
    }
    if (stepKey === 'classes') {
      return (storage.storageClasses || []).length > 0;
    }
    if (stepKey === 's3') {
      // Object storage is optional, so it's "complete" once viewed (or has buckets)
      return storage.s3Visited === true || (storage.s3Buckets || []).length > 0;
    }
    return false;
  };

  return (
    <Box>
      <Stepper activeStep={activeStep} orientation="vertical">
        {STORAGE_STEPS.map((step, index) => {
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
                    {index === STORAGE_STEPS.length - 1 ? 'Complete Phase' : 'Continue'}
                  </Button>
                </Box>
              </StepContent>
            </Step>
          );
        })}
      </Stepper>

      {activeStep === STORAGE_STEPS.length && (
        <Alert severity="success" sx={{ mt: 3 }}>
          <Typography variant="subtitle1">Storage Configuration Complete!</Typography>
          <Typography variant="body2">
            CSI drivers and storage classes are configured. Proceed to deploy your application.
          </Typography>
        </Alert>
      )}
    </Box>
  );
}

function ExpertMode() {
  const { state } = useWizard();
  const cloudProvider = state.cloudProvider || 'aws';
  const STORAGE_STEPS = getStorageSteps(cloudProvider);
  const [expandedSections, setExpandedSections] = useState({
    csi: true,
    classes: true,
    s3: true,
  });

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  return (
    <Box>
      {STORAGE_STEPS.map((step) => {
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

export default function Phase4Storage() {
  const { state } = useWizard();
  const { mode } = state;

  return (
    <Box>
      {/* Phase Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Phase 4: Storage
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {mode === 'guided'
            ? 'Configure storage drivers and classes for persistent data.'
            : 'Configure all storage settings. Expand sections as needed.'}
        </Typography>
      </Box>

      {/* Render based on mode */}
      {mode === 'guided' ? <GuidedMode /> : <ExpertMode />}
    </Box>
  );
}
