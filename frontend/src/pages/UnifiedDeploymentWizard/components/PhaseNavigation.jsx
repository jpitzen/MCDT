import React from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  StepConnector,
  Typography,
  Tooltip,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import BuildIcon from '@mui/icons-material/Build';
import CloudIcon from '@mui/icons-material/Cloud';
import StorageIcon from '@mui/icons-material/Storage';
import DataObjectIcon from '@mui/icons-material/DataObject';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import SettingsIcon from '@mui/icons-material/Settings';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { useWizard } from '../WizardContext';

// ==========================================
// PHASE DEFINITIONS
// ==========================================

const phases = [
  {
    id: 1,
    label: 'Prerequisites',
    shortLabel: 'Setup',
    icon: BuildIcon,
    description: 'Install tools, configure credentials, verify connectivity',
  },
  {
    id: 2,
    label: 'Cluster Config',
    shortLabel: 'Cluster',
    icon: CloudIcon,
    description: 'Network, security groups, cluster settings, container registry',
  },
  {
    id: 3,
    label: 'Database',
    shortLabel: 'Database',
    icon: DataObjectIcon,
    description: 'Managed database service, SQL scripts, migrations',
  },
  {
    id: 4,
    label: 'Storage',
    shortLabel: 'Storage',
    icon: StorageIcon,
    description: 'CSI drivers, storage classes, persistent volumes',
  },
  {
    id: 5,
    label: 'Deployment',
    shortLabel: 'Deploy',
    icon: RocketLaunchIcon,
    description: 'Docker images, registry, Kubernetes resources',
  },
  {
    id: 6,
    label: 'Operations',
    shortLabel: 'Ops',
    icon: SettingsIcon,
    description: 'Monitoring, Helm, port forwarding, troubleshooting',
  },
];

// ==========================================
// STYLED COMPONENTS
// ==========================================

const CustomConnector = styled(StepConnector)(({ theme }) => ({
  '& .MuiStepConnector-line': {
    borderTopWidth: 3,
    borderRadius: 1,
    borderColor: theme.palette.divider,
  },
  '&.Mui-active .MuiStepConnector-line': {
    borderColor: theme.palette.primary.main,
  },
  '&.Mui-completed .MuiStepConnector-line': {
    borderColor: theme.palette.success.main,
  },
}));

const PhaseIconContainer = styled('div')(({ theme, active, completed, hasError }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 44,
  height: 44,
  borderRadius: '50%',
  backgroundColor: completed
    ? theme.palette.success.main
    : active
    ? theme.palette.primary.main
    : theme.palette.action.disabledBackground,
  color: completed || active ? theme.palette.common.white : theme.palette.text.disabled,
  transition: 'all 0.3s ease',
  cursor: 'pointer',
  position: 'relative',
  '&:hover': {
    transform: 'scale(1.1)',
    boxShadow: theme.shadows[4],
  },
  ...(hasError && {
    backgroundColor: theme.palette.error.main,
    color: theme.palette.common.white,
  }),
}));

const StatusBadge = styled('div')(({ theme, status }) => ({
  position: 'absolute',
  top: -4,
  right: -4,
  width: 18,
  height: 18,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor:
    status === 'completed'
      ? theme.palette.success.main
      : status === 'error'
      ? theme.palette.error.main
      : 'transparent',
  border: `2px solid ${theme.palette.background.paper}`,
  '& svg': {
    fontSize: 12,
    color: theme.palette.common.white,
  },
}));

// ==========================================
// PHASE ICON COMPONENT
// ==========================================

function PhaseIcon({ phase, active, completed, hasError, onClick }) {
  const Icon = phase.icon;

  return (
    <Tooltip title={phase.description} arrow placement="bottom">
      <PhaseIconContainer
        active={active}
        completed={completed}
        hasError={hasError}
        onClick={onClick}
      >
        <Icon sx={{ fontSize: 24 }} />
        {completed && !hasError && (
          <StatusBadge status="completed">
            <CheckCircleIcon />
          </StatusBadge>
        )}
        {hasError && (
          <StatusBadge status="error">
            <ErrorIcon />
          </StatusBadge>
        )}
      </PhaseIconContainer>
    </Tooltip>
  );
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function PhaseNavigation({ compact = false }) {
  const { state, setPhase, validatePhase } = useWizard();
  const { currentPhase, phaseValidation } = state;

  const handlePhaseClick = (phaseId) => {
    // Allow navigation to any phase that's before or equal to highest completed + 1
    const highestCompleted = Object.entries(phaseValidation)
      .filter(([_, v]) => v.completed)
      .map(([k]) => parseInt(k))
      .reduce((max, k) => Math.max(max, k), 0);

    if (phaseId <= highestCompleted + 1) {
      // Validate current phase before leaving
      if (phaseId !== currentPhase) {
        validatePhase(currentPhase);
      }
      setPhase(phaseId);
    }
  };

  if (compact) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
        {phases.map((phase, index) => {
          const isActive = phase.id === currentPhase;
          const isCompleted = phaseValidation[phase.id]?.completed;
          const hasError = phaseValidation[phase.id]?.errors?.length > 0;
          const Icon = phase.icon;

          return (
            <React.Fragment key={phase.id}>
              <Tooltip title={`${phase.label}: ${phase.description}`} arrow>
                <Box
                  onClick={() => handlePhaseClick(phase.id)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 2,
                    cursor: 'pointer',
                    backgroundColor: isActive
                      ? 'primary.main'
                      : isCompleted
                      ? 'success.light'
                      : 'action.hover',
                    color: isActive ? 'common.white' : isCompleted ? 'success.dark' : 'text.secondary',
                    transition: 'all 0.2s',
                    '&:hover': {
                      backgroundColor: isActive ? 'primary.dark' : 'action.selected',
                    },
                  }}
                >
                  <Icon sx={{ fontSize: 18 }} />
                  <Typography variant="caption" fontWeight={isActive ? 600 : 400}>
                    {phase.shortLabel}
                  </Typography>
                  {isCompleted && <CheckCircleIcon sx={{ fontSize: 14, ml: 0.5 }} />}
                  {hasError && <ErrorIcon sx={{ fontSize: 14, ml: 0.5, color: 'error.main' }} />}
                </Box>
              </Tooltip>
              {index < phases.length - 1 && (
                <Box
                  sx={{
                    width: 20,
                    height: 2,
                    backgroundColor: isCompleted ? 'success.main' : 'divider',
                    borderRadius: 1,
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', py: 2 }}>
      <Stepper
        activeStep={currentPhase - 1}
        alternativeLabel
        connector={<CustomConnector />}
      >
        {phases.map((phase) => {
          const isActive = phase.id === currentPhase;
          const isCompleted = phaseValidation[phase.id]?.completed;
          const hasError = phaseValidation[phase.id]?.errors?.length > 0;

          return (
            <Step key={phase.id} completed={isCompleted}>
              <StepLabel
                StepIconComponent={() => (
                  <PhaseIcon
                    phase={phase}
                    active={isActive}
                    completed={isCompleted}
                    hasError={hasError}
                    onClick={() => handlePhaseClick(phase.id)}
                  />
                )}
              >
                <Typography
                  variant="body2"
                  fontWeight={isActive ? 600 : 400}
                  color={isActive ? 'primary.main' : isCompleted ? 'success.main' : 'text.secondary'}
                >
                  {phase.label}
                </Typography>
              </StepLabel>
            </Step>
          );
        })}
      </Stepper>
    </Box>
  );
}

export { phases };
