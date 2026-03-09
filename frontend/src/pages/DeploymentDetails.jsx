import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  LinearProgress,
  Alert,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  ArrowBack as BackIcon,
  SignalCellularAlt,
  Cancel as CancelIcon
} from '@mui/icons-material';
import api from '../services/api';
import useWebSocket from '../hooks/useWebSocket';
import LogViewer from '../components/LogViewer';
import SqlScriptStatus from '../components/SqlScriptStatus';

export default function DeploymentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [deployment, setDeployment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sqlScripts, setSqlScripts] = useState([]);

  // WebSocket integration for real-time updates
  const {
    isConnected,
    logs,
    clearLogs,
  } = useWebSocket(id, {
    autoConnect: true,
    onPhaseUpdate: (newPhase) => {
      console.log('Phase updated:', newPhase);
      // Update deployment phase in real-time (don't update progress here - it has its own handler)
      setDeployment(prev => prev ? { ...prev, deploymentPhase: newPhase } : null);
    },
    onProgressUpdate: (newProgress) => {
      console.log('Progress updated:', newProgress);
      // Update deployment progress in real-time
      setDeployment(prev => prev ? { ...prev, progress: newProgress } : null);
    },
    onCompleted: (outputs) => {
      console.log('Deployment completed:', outputs);
      // Update deployment status and outputs
      setDeployment(prev => prev ? {
        ...prev,
        status: 'cluster-ready',
        deploymentPhase: 'complete',
        progress: 100,
        outputs
      } : null);
    },
    onFailed: (errorMessage) => {
      console.error('Deployment failed:', errorMessage);
      // Update deployment with error
      setDeployment(prev => prev ? {
        ...prev,
        status: 'failed',
        errorMessage
      } : null);
      setError(errorMessage);
    },
  });

  const fetchDeployment = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/deployments/${id}`);
      setDeployment(response.data.deployment || response.data);
      
      // Fetch SQL scripts if RDS is enabled
      const deploymentData = response.data.deployment || response.data;
      if (deploymentData.enableRDS) {
        fetchSqlScripts();
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      console.error('Failed to fetch deployment:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchSqlScripts = useCallback(async () => {
    try {
      const response = await api.get(`/deployments/${id}/sql-scripts`);
      setSqlScripts(response.data.data?.scripts || response.data.scripts || []);
    } catch (err) {
      console.error('Failed to fetch SQL scripts:', err);
      // Non-blocking - scripts section will show empty if failed
    }
  }, [id]);

  useEffect(() => {
    fetchDeployment();
    // No interval needed - WebSocket provides real-time updates
  }, [fetchDeployment, fetchSqlScripts]);

  const handleStart = async () => {
    try {
      setActionLoading(true);
      await api.post(`/deployments/${id}/start`);
      await fetchDeployment();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start deployment');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePause = async () => {
    try {
      setActionLoading(true);
      await api.post(`/deployments/${id}/pause`);
      await fetchDeployment();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to pause deployment');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    try {
      setActionLoading(true);
      await api.deployments.cancel(id);
      await fetchDeployment();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to cancel deployment');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setActionLoading(true);
      await api.delete(`/deployments/${id}`);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete deployment');
      setActionLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED':
        return 'success';
      case 'IN_PROGRESS':
        return 'info';
      case 'FAILED':
        return 'error';
      case 'PENDING':
        return 'warning';
      case 'PAUSED':
        return 'default';
      default:
        return 'default';
    }
  };

  const getProgressPercentage = () => {
    if (!deployment) return 0;
    return deployment.progress || 0;
  };

  if (loading && !deployment) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !deployment) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/dashboard')} sx={{ mt: 2 }}>
          Back to Dashboard
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/dashboard')}>
            <BackIcon />
          </IconButton>
          <Box>
            <Typography variant="h4">{deployment?.clusterName}</Typography>
            <Typography variant="body2" color="text.secondary">
              Deployment ID: {id}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchDeployment} color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          {deployment?.status === 'PENDING' && (
            <Button
              variant="contained"
              startIcon={<PlayIcon />}
              onClick={handleStart}
              disabled={actionLoading}
            >
              Start
            </Button>
          )}
          {deployment?.status === 'IN_PROGRESS' && (
            <>
              <Button
                variant="outlined"
                startIcon={<PauseIcon />}
                onClick={handlePause}
                disabled={actionLoading}
              >
                Pause
              </Button>
              <Button
                variant="outlined"
                color="warning"
                startIcon={<CancelIcon />}
                onClick={handleCancel}
                disabled={actionLoading}
              >
                Cancel
              </Button>
            </>
          )}
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => setDeleteDialogOpen(true)}
            disabled={actionLoading}
          >
            Delete
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Status Card */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Deployment Status
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Chip
                    label={deployment?.status || 'UNKNOWN'}
                    color={getStatusColor(deployment?.status)}
                  />
                  <Typography variant="body2" color="text.secondary">
                    {getProgressPercentage()}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={getProgressPercentage()}
                  sx={{ height: 10, borderRadius: 5 }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Current Phase: {deployment?.currentPhase || 'N/A'}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Cloud Provider
                  </Typography>
                  <Typography variant="body2">
                    {(deployment?.cloudProvider || 'aws').toUpperCase()}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Region
                  </Typography>
                  <Typography variant="body2">
                    {deployment?.region || deployment?.awsRegion || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Kubernetes Version
                  </Typography>
                  <Typography variant="body2">
                    {deployment?.kubernetesVersion || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Node Count
                  </Typography>
                  <Typography variant="body2">
                    {deployment?.nodeCount || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Created
                  </Typography>
                  <Typography variant="body2">
                    {deployment?.createdAt ? new Date(deployment.createdAt).toLocaleString() : 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Updated
                  </Typography>
                  <Typography variant="body2">
                    {deployment?.updatedAt ? new Date(deployment.updatedAt).toLocaleString() : 'N/A'}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Configuration Card */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Configuration
              </Typography>
              <List dense>
                {deployment?.enableAutoscaling && (
                  <ListItem>
                    <ListItemText
                      primary="Autoscaling"
                      secondary={`Min: ${deployment.minNodeCount || 1}, Max: ${deployment.maxNodeCount || 5}`}
                    />
                  </ListItem>
                )}
                {deployment?.enableRDS && (
                  <ListItem>
                    <ListItemText
                      primary="Database (RDS)"
                      secondary={`${deployment.dbEngine || 'postgres'} ${deployment.dbVersion || '14.6'}`}
                    />
                  </ListItem>
                )}
                {deployment?.enableMonitoring && (
                  <ListItem>
                    <ListItemText primary="Monitoring" secondary="Enabled" />
                  </ListItem>
                )}
                {deployment?.enableLogging && (
                  <ListItem>
                    <ListItemText primary="Logging" secondary="Enabled" />
                  </ListItem>
                )}
                {deployment?.nodeInstanceType && (
                  <ListItem>
                    <ListItemText primary="Instance Type" secondary={deployment.nodeInstanceType} />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* SQL Scripts Status - Show if RDS is enabled */}
        {deployment?.enableRDS && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <SqlScriptStatus
                  deploymentId={id}
                  scripts={sqlScripts}
                  onRefresh={fetchSqlScripts}
                />
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Deployment Logs with Real-time WebSocket Updates */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Typography variant="h6">
              Live Deployment Logs
            </Typography>
            <Chip
              icon={<SignalCellularAlt />}
              label={isConnected ? 'Connected' : 'Disconnected'}
              size="small"
              color={isConnected ? 'success' : 'error'}
              variant="outlined"
            />
          </Box>
          <LogViewer
            logs={logs}
            isLive={isConnected && deployment?.status === 'running'}
            onClear={clearLogs}
            maxHeight={500}
          />
        </Grid>
      </Grid>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this deployment? This action cannot be undone.
          </Typography>
          <Alert severity="warning" sx={{ mt: 2 }}>
            Any cloud resources created by this deployment must be manually cleaned up.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={actionLoading}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
