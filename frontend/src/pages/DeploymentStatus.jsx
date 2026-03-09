import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Alert,
  AlertTitle,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import StopIcon from '@mui/icons-material/Stop';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import PreviewIcon from '@mui/icons-material/Preview';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import EditIcon from '@mui/icons-material/Edit';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import DeploymentStatusViewer from '../components/DeploymentStatus/DeploymentStatusViewer';
import DestructionConfirmModal from '../components/DestructionConfirmModal';
import api from '../services/api';

export default function DeploymentStatus() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [deployment, setDeployment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  
  // Destruction state
  const [showDestructionModal, setShowDestructionModal] = useState(false);
  const [destructionStatus, setDestructionStatus] = useState('idle');
  const [destructionError, setDestructionError] = useState(null);
  
  // Preview state
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewResults, setPreviewResults] = useState(null);
  const [previewError, setPreviewError] = useState(null);
  const [showRawOutput, setShowRawOutput] = useState(false);

  useEffect(() => {
    const fetchDeployment = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/deployments/${id}`);
        setDeployment(response.data.data || response.data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch deployment:', err);
        setError(err.response?.data?.message || 'Failed to load deployment');
      } finally {
        setLoading(false);
      }
    };

    if (id && id !== 'undefined') {
      fetchDeployment();
    } else {
      setError('Invalid deployment ID');
      setLoading(false);
    }
  }, [id]);

  const handleCancelDeployment = async () => {
    try {
      setCancelling(true);
      await api.post(`/deployments/${id}/cancel`);
      alert('Deployment cancelled successfully');
      setShowCancelDialog(false);
      
      // Refresh deployment data
      const response = await api.get(`/deployments/${id}`);
      setDeployment(response.data.data || response.data);
    } catch (err) {
      console.error('Failed to cancel deployment:', err);
      alert(`Failed to cancel deployment: ${err.response?.data?.message || err.message}`);
    } finally {
      setCancelling(false);
    }
  };

  const handleDeploymentComplete = (data) => {
    console.log('Deployment completed:', data);
    // Refresh deployment data
    if (id && id !== 'undefined') {
      api.get(`/deployments/${id}`)
        .then(response => {
          setDeployment(response.data.data || response.data);
        })
        .catch(err => {
          console.error('Failed to refresh deployment:', err);
        });
    }
  };

  // Destruction handlers
  const handleRequestDestruction = () => {
    setShowDestructionModal(true);
    setDestructionStatus('idle');
    setDestructionError(null);
  };

  const handleConfirmDestruction = async (dep, confirmationName) => {
    try {
      setDestructionStatus('requesting');
      
      // First request destruction
      await api.deployments.requestDestroy(dep.id);
      
      // Then confirm with the name
      setDestructionStatus('confirming');
      await api.deployments.confirmDestroy(dep.id, confirmationName);
      
      // Update local state
      setDeployment(prev => ({ ...prev, status: 'pending_destruction' }));
      
    } catch (err) {
      console.error('Failed to confirm destruction:', err);
      setDestructionError(err.response?.data?.message || 'Failed to confirm destruction');
      setDestructionStatus('error');
    }
  };

  const handleExecuteDestruction = async (dep) => {
    try {
      setDestructionStatus('executing');
      
      await api.deployments.executeDestroy(dep.id);
      
      setDestructionStatus('completed');
      
      // Refresh deployment data
      const response = await api.get(`/deployments/${dep.id}`);
      setDeployment(response.data.data || response.data);
      
    } catch (err) {
      console.error('Failed to execute destruction:', err);
      setDestructionError(err.response?.data?.message || 'Failed to execute destruction');
      setDestructionStatus('error');
    }
  };

  const handleCloseDestructionModal = () => {
    if (destructionStatus !== 'executing') {
      setShowDestructionModal(false);
      setDestructionStatus('idle');
      setDestructionError(null);
    }
  };

  // Preview handlers
  const handleRunPreview = async () => {
    setShowPreviewDialog(true);
    setPreviewLoading(true);
    setPreviewResults(null);
    setPreviewError(null);
    setShowRawOutput(false);
    
    try {
      const response = await api.deployments.preview(id);
      const previewData = response.data?.data || response.data;
      setPreviewResults(previewData);
    } catch (err) {
      console.error('Preview failed:', err);
      setPreviewError(err.response?.data?.message || 'Failed to run terraform preview. Please try again.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleStartDeployment = async () => {
    try {
      await api.deployments.start(id);
      setShowPreviewDialog(false);
      // Refresh deployment data
      const response = await api.get(`/deployments/${id}`);
      setDeployment(response.data.data || response.data);
    } catch (err) {
      console.error('Failed to start deployment:', err);
      alert('Failed to start deployment: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleClosePreviewDialog = () => {
    if (!previewLoading) {
      setShowPreviewDialog(false);
      setPreviewResults(null);
      setPreviewError(null);
    }
  };

  const canCancel = deployment && ['running', 'pending', 'in-progress'].includes(deployment.status);
  const canDestroy = deployment && ['completed', 'failed', 'rolled_back', 'destroy_failed', 'pending_destruction'].includes(deployment.status);
  const canPreview = deployment && deployment.status === 'pending';

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'running': return 'info';
      case 'failed': return 'error';
      case 'pending_destruction': return 'warning';
      case 'destroying': return 'warning';
      case 'destroyed': return 'default';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 4, mb: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error || !id || id === 'undefined') {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 4, mb: 4 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/deployments')}
            sx={{ mb: 2 }}
          >
            Back to Deployments
          </Button>
          <Alert severity="error">
            <Typography variant="h6" gutterBottom>
              {error || 'Invalid Deployment ID'}
            </Typography>
            <Typography variant="body2">
              {id === 'undefined' 
                ? 'The deployment ID is undefined. This usually means there was an error creating the deployment.'
                : 'Could not load deployment details. The deployment may not exist or you may not have permission to view it.'}
            </Typography>
            <Button 
              variant="outlined" 
              onClick={() => navigate('/deployments')} 
              sx={{ mt: 2 }}
            >
              View All Deployments
            </Button>
          </Alert>
        </Box>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/deployments')}
          >
            Back to Deployments
          </Button>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            {canPreview && (
              <>
                <Button
                  variant="outlined"
                  color="info"
                  onClick={handleRunPreview}
                  startIcon={<PreviewIcon />}
                >
                  Preview (Dry Run)
                </Button>
                <Button
                  variant="contained"
                  color="success"
                  onClick={handleStartDeployment}
                  startIcon={<PlayArrowIcon />}
                >
                  Start Deployment
                </Button>
              </>
            )}
            
            {canCancel && (
              <Button
                variant="outlined"
                color="error"
                onClick={() => setShowCancelDialog(true)}
                disabled={cancelling}
                startIcon={<StopIcon />}
              >
                Stop Deployment
              </Button>
            )}
            
            {canDestroy && (
              <Button
                variant="contained"
                color="error"
                onClick={handleRequestDestruction}
                startIcon={<DeleteForeverIcon />}
              >
                {deployment?.status === 'pending_destruction' ? 'Continue Destruction' : 'Destroy Deployment'}
              </Button>
            )}
          </Box>
        </Box>

        {deployment && (
          <Paper sx={{ p: 2, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="h5" gutterBottom>
                  {deployment.clusterName}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Cloud Provider: {deployment.cloudProvider?.toUpperCase()} • 
                  Region: {deployment.configuration?.clusterConfig?.region || deployment.configuration?.region || 'N/A'}
                </Typography>
              </Box>
              <Chip 
                label={deployment.status?.replace(/_/g, ' ').toUpperCase()} 
                color={getStatusColor(deployment.status)}
                size="small"
              />
            </Box>
            
            {/* Status-specific alerts */}
            {deployment.status === 'pending_destruction' && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Destruction has been requested for this deployment. Click "Continue Destruction" to execute terraform destroy.
              </Alert>
            )}
            
            {deployment.status === 'destroying' && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Terraform destroy is in progress. This may take 15-30 minutes.
              </Alert>
            )}
            
            {deployment.status === 'destroyed' && (
              <Alert severity="success" sx={{ mt: 2 }}>
                This deployment has been destroyed. All AWS resources have been removed.
              </Alert>
            )}
            
            {deployment.status === 'destroy_failed' && (
              <Alert severity="error" sx={{ mt: 2 }}>
                Destruction failed. You may need to manually clean up remaining resources.
              </Alert>
            )}
          </Paper>
        )}

        <DeploymentStatusViewer
          deploymentId={id}
          onDeploymentComplete={handleDeploymentComplete}
        />
        
        {/* Cancel Confirmation Dialog */}
        <Dialog
          open={showCancelDialog}
          onClose={() => !cancelling && setShowCancelDialog(false)}
        >
          <DialogTitle>Cancel Deployment?</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to stop deployment "{deployment?.clusterName}"?
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
              This will halt the deployment process. Any resources already created may need to be cleaned up manually.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => setShowCancelDialog(false)} 
              disabled={cancelling}
            >
              Keep Running
            </Button>
            <Button 
              onClick={handleCancelDeployment} 
              color="error" 
              variant="contained"
              disabled={cancelling}
              startIcon={cancelling ? <CircularProgress size={20} /> : <StopIcon />}
            >
              {cancelling ? 'Stopping...' : 'Stop Deployment'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Destruction Confirmation Modal */}
        <DestructionConfirmModal
          open={showDestructionModal}
          deployment={deployment}
          onClose={handleCloseDestructionModal}
          onConfirm={handleConfirmDestruction}
          onExecuteDestruction={handleExecuteDestruction}
          destructionStatus={destructionStatus}
          error={destructionError}
        />

        {/* Terraform Preview Dialog */}
        <Dialog
          open={showPreviewDialog}
          onClose={previewLoading ? undefined : handleClosePreviewDialog}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PreviewIcon color="info" />
            Terraform Plan Preview
          </DialogTitle>
          <DialogContent>
            {previewLoading ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <CircularProgress sx={{ mb: 2 }} />
                <Typography variant="h6" gutterBottom>Running Terraform Plan...</Typography>
                <LinearProgress sx={{ my: 2 }} />
                <Typography variant="body2" color="text.secondary">
                  This may take 2-5 minutes. Terraform is analyzing your configuration.
                </Typography>
              </Box>
            ) : previewError ? (
              <Alert severity="error">
                <AlertTitle>Preview Failed</AlertTitle>
                {previewError}
              </Alert>
            ) : previewResults ? (
              <Box>
                {/* Summary Chips */}
                <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                  <Chip
                    icon={<AddCircleIcon />}
                    label={`${previewResults.summary?.toAdd || 0} to add`}
                    color={(previewResults.summary?.toAdd || 0) > 0 ? 'success' : 'default'}
                  />
                  <Chip
                    icon={<EditIcon />}
                    label={`${previewResults.summary?.toChange || 0} to change`}
                    color={(previewResults.summary?.toChange || 0) > 0 ? 'warning' : 'default'}
                  />
                  <Chip
                    icon={<RemoveCircleIcon />}
                    label={`${previewResults.summary?.toDestroy || 0} to destroy`}
                    color={(previewResults.summary?.toDestroy || 0) > 0 ? 'error' : 'default'}
                  />
                </Box>

                {previewResults.summary?.valid && (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    <AlertTitle>Preview Successful</AlertTitle>
                    Terraform plan is valid. Click "Start Deployment" to proceed.
                  </Alert>
                )}

                {/* Resource List */}
                {previewResults.summary?.resources && previewResults.summary.resources.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Resources ({previewResults.summary.resources.length}):
                    </Typography>
                    <Paper variant="outlined" sx={{ maxHeight: 200, overflow: 'auto' }}>
                      <List dense>
                        {previewResults.summary.resources.slice(0, 15).map((resource, index) => (
                          <ListItem key={index} divider>
                            <ListItemIcon sx={{ minWidth: 36 }}>
                              {resource.action === 'created' && <AddCircleIcon color="success" fontSize="small" />}
                              {resource.action === 'updated' && <EditIcon color="warning" fontSize="small" />}
                              {resource.action === 'destroyed' && <RemoveCircleIcon color="error" fontSize="small" />}
                            </ListItemIcon>
                            <ListItemText
                              primary={resource.name}
                              secondary={`will be ${resource.action}`}
                              primaryTypographyProps={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Paper>
                  </Box>
                )}

                {/* Raw Output Toggle */}
                <Button
                  size="small"
                  onClick={() => setShowRawOutput(!showRawOutput)}
                  startIcon={showRawOutput ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                >
                  {showRawOutput ? 'Hide' : 'Show'} Raw Output
                </Button>
                <Collapse in={showRawOutput}>
                  <Box
                    component="pre"
                    sx={{
                      mt: 2,
                      p: 2,
                      bgcolor: '#1e1e1e',
                      color: '#d4d4d4',
                      borderRadius: 1,
                      overflow: 'auto',
                      maxHeight: 250,
                      fontSize: '0.7rem',
                    }}
                  >
                    {previewResults.rawOutput || 'No output available'}
                  </Box>
                </Collapse>
              </Box>
            ) : null}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClosePreviewDialog} disabled={previewLoading}>
              Close
            </Button>
            {previewResults && !previewError && (
              <Button
                variant="contained"
                color="success"
                onClick={handleStartDeployment}
                startIcon={<PlayArrowIcon />}
              >
                Start Deployment
              </Button>
            )}
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
}
