import React, { Suspense, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from '@mui/material';
import { WizardProvider, useWizard } from './WizardContext';
import PhaseNavigation from './components/PhaseNavigation';
import ModeToggle from './components/ModeToggle';
import DraftManager from './components/DraftManager';

// Phase Components - lazy loaded for better performance
const Phase1Prerequisites = React.lazy(() => import('./phases/Phase1Prerequisites'));
const Phase2Cluster = React.lazy(() => import('./phases/Phase2Cluster'));
const Phase3Database = React.lazy(() => import('./phases/Phase3Database'));
const Phase4Storage = React.lazy(() => import('./phases/Phase4Storage'));
const Phase5Deploy = React.lazy(() => import('./phases/Phase5Deploy'));
const Phase6Operations = React.lazy(() => import('./phases/Phase6Operations'));

// Phase mapping
const PHASE_COMPONENTS = {
  1: Phase1Prerequisites,
  2: Phase2Cluster,
  3: Phase3Database,
  4: Phase4Storage,
  5: Phase5Deploy,
  6: Phase6Operations,
};

// Loading fallback
function PhaseLoader() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 300,
        gap: 2,
      }}
    >
      <CircularProgress />
      <Typography color="text.secondary">Loading phase...</Typography>
    </Box>
  );
}

// Placeholder for unimplemented phases
function PhasePlaceholder({ phase }) {
  const phaseNames = {
    2: 'Cluster Configuration',
    3: 'Database Configuration',
    4: 'Storage',
    5: 'Deploy Application',
    6: 'Operations & Monitoring',
  };

  return (
    <Box sx={{ textAlign: 'center', py: 6 }}>
      <Typography variant="h5" gutterBottom>
        Phase {phase}: {phaseNames[phase]}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        This phase is under development. Complete Phase 1 to proceed.
      </Typography>
      <Alert severity="info" sx={{ display: 'inline-flex' }}>
        Coming soon in the Unified Deployment Wizard
      </Alert>
    </Box>
  );
}

// Main wizard content
function WizardContent() {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { state, nextPhase, prevPhase, setPhase, canProceedToNextPhase, submitForReview, loadDraft } = useWizard();
  const { currentPhase, error, draftId, draftName } = state;
  
  // Check if we're in edit mode (coming from Saved Deployments with draft data)
  const editState = location.state;
  const isEditMode = editState?.editMode && editState?.draftId;
  
  // Load draft on mount if in edit mode
  useEffect(() => {
    if (isEditMode && editState.draftId) {
      loadDraft(editState.draftId);
    }
  }, [isEditMode, editState?.draftId, loadDraft]);
  
  // Submit for review dialog state
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [deploymentName, setDeploymentName] = useState('');
  const [deploymentDescription, setDeploymentDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Get the component for current phase
  const PhaseComponent = PHASE_COMPONENTS[currentPhase];

  // Navigation handlers
  const handlePhaseClick = (phase) => {
    // Only allow navigation to completed phases or next available phase
    if (phase <= currentPhase) {
      setPhase(phase);
    }
  };

  const handleNext = () => {
    if (canProceedToNextPhase()) {
      nextPhase();
    }
  };

  const handlePrevious = () => {
    prevPhase();
  };

  const handleSubmitForReview = async () => {
    setSubmitting(true);
    try {
      await submitForReview(
        deploymentName || `Deployment - ${new Date().toLocaleDateString()}`,
        deploymentDescription || 'Submitted via deployment wizard'
      );
      setShowSubmitDialog(false);
      setSubmitted(true);
      // Navigate to Saved Deployments (Drafts) page after successful submission
      navigate('/deployment-drafts');
    } catch (error) {
      console.error('Failed to submit for review:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
          <Box>
            <Typography variant="h4" gutterBottom>
              {draftId || isEditMode ? `Edit Deployment${draftName ? `: ${draftName}` : ''}` : 'New Deployment'}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {draftId || isEditMode 
                ? 'Modify your saved deployment configuration.'
                : 'Configure and deploy your application to the cloud with guided steps or expert mode.'}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <ModeToggle />
            <DraftManager />
          </Box>
        </Box>
      </Box>

      {/* Phase Navigation */}
      <PhaseNavigation
        currentPhase={currentPhase}
        onPhaseClick={handlePhaseClick}
      />

      {/* Error display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => {}}>
          {error}
        </Alert>
      )}

      {/* Main Content Area */}
      <Paper
        elevation={2}
        sx={{
          p: 4,
          minHeight: 500,
          backgroundColor: theme.palette.background.paper,
        }}
      >
        <Suspense fallback={<PhaseLoader />}>
          {PhaseComponent ? (
            <PhaseComponent />
          ) : (
            <PhasePlaceholder phase={currentPhase} />
          )}
        </Suspense>
      </Paper>

      {/* Navigation Footer */}
      <Box
        sx={{
          mt: 3,
          pt: 3,
          borderTop: 1,
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Box>
          <Typography variant="body2" color="text.secondary">
            Phase {currentPhase} of 5
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <button
            onClick={handlePrevious}
            disabled={currentPhase === 1}
            style={{
              padding: '8px 24px',
              fontSize: '14px',
              cursor: currentPhase === 1 ? 'not-allowed' : 'pointer',
              opacity: currentPhase === 1 ? 0.5 : 1,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: '4px',
              backgroundColor: 'transparent',
              color: theme.palette.text.primary,
            }}
          >
            Previous Phase
          </button>
          {currentPhase === 5 ? (
            <button
              onClick={() => setShowSubmitDialog(true)}
              disabled={submitted}
              style={{
                padding: '8px 24px',
                fontSize: '14px',
                cursor: submitted ? 'not-allowed' : 'pointer',
                opacity: submitted ? 0.5 : 1,
                border: 'none',
                borderRadius: '4px',
                backgroundColor: theme.palette.primary.main,
                color: theme.palette.primary.contrastText,
              }}
            >
              {submitted ? 'Submitted' : 'Submit for Review'}
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={!canProceedToNextPhase()}
              style={{
                padding: '8px 24px',
                fontSize: '14px',
                cursor: !canProceedToNextPhase() ? 'not-allowed' : 'pointer',
                opacity: !canProceedToNextPhase() ? 0.5 : 1,
                border: 'none',
                borderRadius: '4px',
                backgroundColor: theme.palette.primary.main,
                color: theme.palette.primary.contrastText,
              }}
            >
              Next Phase
            </button>
          )}
        </Box>
      </Box>

      {/* Submit for Review Dialog */}
      <Dialog open={showSubmitDialog} onClose={() => !submitting && setShowSubmitDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Submit Deployment for Review</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Your deployment configuration will be saved and submitted for approval. 
            Once approved, Terraform files will be generated for the infrastructure.
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Deployment Name"
            fullWidth
            value={deploymentName}
            onChange={(e) => setDeploymentName(e.target.value)}
            placeholder={`Deployment - ${new Date().toLocaleDateString()}`}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description (optional)"
            fullWidth
            multiline
            rows={3}
            value={deploymentDescription}
            onChange={(e) => setDeploymentDescription(e.target.value)}
            placeholder="Describe this deployment..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSubmitDialog(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmitForReview}
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : 'Submit for Review'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

// Wrapper with provider
export default function UnifiedDeploymentWizard() {
  return (
    <WizardProvider>
      <WizardContent />
    </WizardProvider>
  );
}
