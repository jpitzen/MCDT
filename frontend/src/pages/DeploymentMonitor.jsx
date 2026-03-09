import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Chip,
  LinearProgress,
  Alert,
  CircularProgress,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
} from '@mui/material';
import {
  Info as InfoIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  PowerSettingsNew as DestroyIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { format } from 'date-fns';
import DeploymentStatusViewer from '../components/DeploymentStatus/DeploymentStatusViewer';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/**
 * DeploymentMonitor Page
 * Real-time monitoring dashboard for all active deployments
 * Shows deployment status, progress, and allows viewing individual deployment details
 *
 * @component
 */
const DeploymentMonitor = () => {
  const [deployments, setDeployments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDeployment, setSelectedDeployment] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  /**
   * Fetch all deployments from API
   */
  const fetchDeployments = async () => {
    try {
      setError(null);
      const response = await axios.get(`${API_BASE_URL}/deployments`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      // Handle response structure: { status, data: { data: [...], pagination } }
      if (response.data && response.data.data && response.data.data.data) {
        setDeployments(response.data.data.data);
      } else if (response.data && response.data.data) {
        // Fallback for direct data array
        setDeployments(Array.isArray(response.data.data) ? response.data.data : []);
      } else if (response.data && response.data.deployments) {
        // Legacy format
        setDeployments(response.data.deployments);
      }
    } catch (err) {
      console.error('Failed to fetch deployments:', err);
      setError(err.response?.data?.message || 'Failed to fetch deployments');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Refresh deployments on mount and periodically
   */
  useEffect(() => {
    fetchDeployments();

    if (autoRefresh) {
      const interval = setInterval(fetchDeployments, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  /**
   * Get status color
   */
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'running':
      case 'in-progress':
        return 'info';
      case 'pending':
        return 'warning';
      case 'rolled_back':
        return 'warning';
      default:
        return 'default';
    }
  };

  /**
   * Handle deployment selection to view details
   */
  const handleViewDetails = (deployment) => {
    setSelectedDeployment(deployment);
    setDetailsOpen(true);
  };

  /**
   * Close details dialog
   */
  const handleCloseDetails = () => {
    setDetailsOpen(false);
    setSelectedDeployment(null);
  };

  /**
   * Handle deployment completion
   */
  const handleDeploymentComplete = (deploymentId, data) => {
    console.log('Deployment completed:', deploymentId, data);
    // Update the deployment in the list
    setDeployments((prev) =>
      prev.map((d) =>
        d.id === deploymentId
          ? {
              ...d,
              status: 'completed',
              progress: 100,
              completedAt: new Date(),
              outputs: data.results,
            }
          : d
      )
    );
  };

  /**
   * Handle request to destroy infrastructure
   */
  const handleRequestDestroy = async (deploymentId, deploymentName, event) => {
    if (event) {
      event.stopPropagation();
    }

    const clusterNameInput = window.prompt(
      `To destroy the cluster "${deploymentName}", please type the cluster name to confirm:\n\n${deploymentName}`
    );

    if (clusterNameInput !== deploymentName) {
      if (clusterNameInput !== null) {
        setError('Cluster name did not match. Destruction cancelled.');
      }
      return;
    }

    try {
      // Step 1: Request destroy
      await axios.post(`${API_BASE_URL}/deployments/${deploymentId}/request-destroy`, {}, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      // Step 2: Confirm destroy
      await axios.post(`${API_BASE_URL}/deployments/${deploymentId}/confirm-destroy`, 
        { confirmationName: deploymentName },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
        }
      );

      // Step 3: Execute destroy
      await axios.post(`${API_BASE_URL}/deployments/${deploymentId}/execute-destroy`, {}, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      // Update UI
      setDeployments((prev) =>
        prev.map((d) =>
          d.id === deploymentId ? { ...d, status: 'destroying' } : d
        )
      );

      setError(null);
      console.log('Destruction initiated for:', deploymentId);
    } catch (err) {
      console.error('Failed to initiate destruction:', err);
      const errorMsg = err.response?.data?.message || err.message;
      setError(`Failed to initiate destruction: ${errorMsg}`);
    }
  };

  /**
   * Handle delete failed deployment
   */
  const handleDeleteDeployment = async (deploymentId, deploymentName, event) => {
    // Prevent card click event
    if (event) {
      event.stopPropagation();
    }

    if (!window.confirm(`Are you sure you want to permanently delete the failed deployment "${deploymentName}"? This cannot be undone.`)) {
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/deployments/${deploymentId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      // Remove from UI immediately
      setDeployments((prev) => prev.filter((d) => d.id !== deploymentId));

      console.log('Deployment deleted successfully:', deploymentId);
    } catch (err) {
      console.error('Failed to delete deployment:', err);
      const errorMsg = err.response?.data?.message || err.message;
      setError(`Failed to delete deployment: ${errorMsg}`);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Deployment Monitor
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Real-time monitoring of all active deployments
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchDeployments}
              disabled={loading}
            >
              Refresh
            </Button>
            <Chip
              label={autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
              color={autoRefresh ? 'success' : 'default'}
              onClick={() => setAutoRefresh(!autoRefresh)}
            />
          </Box>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Loading State */}
      {loading && !deployments.length && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Empty State */}
      {!loading && deployments.length === 0 && (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="h6" gutterBottom>
              No Deployments Found
            </Typography>
            <Typography color="textSecondary">
              Start a new deployment to see it here in real-time
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Deployments Grid */}
      {deployments.length > 0 && (
        <Grid container spacing={2}>
          {deployments.map((deployment) => (
            <Grid item xs={12} sm={6} md={4} key={deployment.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: 4,
                    transform: 'translateY(-2px)',
                  },
                }}
                onClick={() => handleViewDetails(deployment)}
              >
                <CardHeader
                  title={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle1" sx={{ flex: 1 }}>
                        {deployment.clusterName || 'Unnamed'}
                      </Typography>
                      <Chip
                        label={deployment.status}
                        color={getStatusColor(deployment.status)}
                        size="small"
                      />
                    </Box>
                  }
                  subheader={
                    <Typography variant="caption" color="textSecondary">
                      ID: {deployment.id.substring(0, 8)}...
                    </Typography>
                  }
                  action={
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {deployment.status === 'completed' && (
                        <IconButton
                          size="small"
                          color="warning"
                          onClick={(e) => handleRequestDestroy(deployment.id, deployment.clusterName, e)}
                          title="Destroy infrastructure (terraform destroy)"
                        >
                          <DestroyIcon fontSize="small" />
                        </IconButton>
                      )}
                      {deployment.status === 'failed' && (
                        <IconButton
                          size="small"
                          color="error"
                          onClick={(e) => handleDeleteDeployment(deployment.id, deployment.clusterName, e)}
                          title="Delete failed deployment"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetails(deployment);
                        }}
                      >
                        <InfoIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  }
                />

                <CardContent sx={{ flex: 1 }}>
                  {/* Provider */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="textSecondary">
                      Provider
                    </Typography>
                    <Typography variant="body2">
                      {deployment.cloudProvider?.toUpperCase() || 'Unknown'}
                    </Typography>
                  </Box>

                  {/* Progress */}
                  <Box sx={{ mb: 2 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 1,
                      }}
                    >
                      <Typography variant="caption" color="textSecondary">
                        Progress
                      </Typography>
                      <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                        {deployment.progress || 0}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={deployment.progress || 0}
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                  </Box>

                  {/* Phase */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="textSecondary">
                      Current Phase
                    </Typography>
                    <Typography variant="body2">
                      {deployment.deploymentPhase?.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Initializing'}
                    </Typography>
                  </Box>

                  {/* Timestamps */}
                  {deployment.createdAt && (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="caption" color="textSecondary">
                        Started: {format(new Date(deployment.createdAt), 'HH:mm:ss')}
                      </Typography>
                    </Box>
                  )}

                  {deployment.completedAt && (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="caption" color="textSecondary">
                        Completed: {format(new Date(deployment.completedAt), 'HH:mm:ss')}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Deployment Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={handleCloseDetails}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            Deployment Details
          </Typography>
          <IconButton onClick={handleCloseDetails} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ p: 0 }}>
          {selectedDeployment && (
            <DeploymentStatusViewer
              deploymentId={selectedDeployment.id}
              onDeploymentComplete={(data) =>
                handleDeploymentComplete(selectedDeployment.id, data)
              }
            />
          )}
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default DeploymentMonitor;
