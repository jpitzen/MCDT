import React, { useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  LinearProgress,
  Typography,
  Alert,
  Chip,
  Divider,
  Paper,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Grid,
} from '@mui/material';
import { format } from 'date-fns';
import useDeploymentSocket from '../../hooks/useDeploymentSocket';

/**
 * DeploymentStatusViewer Component
 * Real-time display of deployment status, logs, and progress
 *
 * @component
 * @param {string} deploymentId - The deployment ID to monitor
 * @param {function} onDeploymentComplete - Callback when deployment completes
 * @param {object} additionalOptions - Additional WebSocket options
 */
const DeploymentStatusViewer = ({
  deploymentId,
  onDeploymentComplete,
  additionalOptions = {},
}) => {
  const logsEndRef = useRef(null);

  // Initialize WebSocket connection with event handlers
  const {
    status,
    logs,
    currentPhase,
    progress,
    deploymentStatus,
    outputs,
    connectionError,
    isConnected,
    getDeploymentStatus,
    getDeploymentLogs,
    ping,
  } = useDeploymentSocket(deploymentId, {
    onCompletion: (data) => {
      if (onDeploymentComplete) {
        onDeploymentComplete(data);
      }
    },
    ...additionalOptions,
  });

  /**
   * Auto-scroll logs to bottom when new logs arrive
   */
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  /**
   * Load initial logs and status when connection established
   */
  useEffect(() => {
    if (isConnected && logs.length === 0) {
      getDeploymentLogs((response) => {
        if (response?.logs) {
          console.log('Loaded initial logs:', response.logs);
        }
      });
    }
  }, [isConnected, logs.length, getDeploymentLogs]);

  /**
   * Load deployment status on mount and when connected
   */
  useEffect(() => {
    if (isConnected) {
      getDeploymentStatus((response) => {
        console.log('Loaded deployment status:', response);
        if (response?.success && response?.status) {
          const status = response.status;
          // The status comes from the database, so use it to initialize state
          if (status.progress !== undefined && status.progress !== null) {
            console.log('Initializing progress from status:', status.progress);
          }
          if (status.deploymentPhase) {
            console.log('Initializing phase from status:', status.deploymentPhase);
          }
        }
      });
    }
  }, [isConnected, getDeploymentStatus]);

  /**
   * Get status color based on deployment status
   */
  const getStatusColor = (stat) => {
    switch (stat) {
      case 'completed':
        return 'success';
      case 'failed':
      case 'error':
        return 'error';
      case 'running':
      case 'in-progress':
        return 'info';
      case 'rolled_back':
        return 'warning';
      default:
        return 'default';
    }
  };

  /**
   * Get WebSocket connection status color
   */
  const getConnectionStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'success';
      case 'connecting':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  /**
   * Get phase label from phase string
   */
  const getPhaseLabel = (phase) => {
    if (!phase) return 'Initializing';
    return phase
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  /**
   * Filter and display logs
   */
  const displayLogs = logs.slice(-50); // Show last 50 logs

  return (
    <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto', p: 2 }}>
      {/* Header Section */}
      <Card sx={{ mb: 2 }}>
        <CardHeader
          title={`Deployment Monitor: ${deploymentId}`}
          subheader={`Created: ${format(new Date(), 'MMM dd, yyyy HH:mm:ss')}`}
          action={
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              {/* WebSocket Connection Status */}
              <Chip
                label={`${isConnected ? '✓' : '✗'} ${status}`}
                color={getConnectionStatusColor()}
                size="small"
              />

              {/* Deployment Status */}
              {deploymentStatus && (
                <Chip
                  label={deploymentStatus}
                  color={getStatusColor(deploymentStatus)}
                  size="small"
                />
              )}
            </Box>
          }
        />
      </Card>

      {/* Error Messages */}
      {connectionError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Connection Error: {connectionError}
        </Alert>
      )}

      {/* Progress Section */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography color="textSecondary" gutterBottom>
                Deployment Progress
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Box sx={{ flex: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={progress}
                    sx={{ height: 10, borderRadius: 5 }}
                  />
                </Box>
                <Typography variant="body2" sx={{ minWidth: 60 }}>
                  {progress}%
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography color="textSecondary" gutterBottom>
                Current Phase
              </Typography>
              <Chip
                label={getPhaseLabel(currentPhase)}
                color="primary"
                size="medium"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Logs Section */}
      <Card sx={{ mb: 2 }}>
        <CardHeader title="Deployment Logs" />
        <Divider />
        <CardContent>
          {!isConnected && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress />
            </Box>
          )}

          {isConnected && logs.length === 0 && (
            <Alert severity="info">
              No logs yet. Deployment will show updates here.
            </Alert>
          )}

          {logs.length > 0 && (
            <Paper
              variant="outlined"
              sx={{
                maxHeight: 400,
                overflow: 'auto',
                backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                p: 1,
              }}
            >
              <List dense>
                {displayLogs.map((log, index) => (
                  <React.Fragment key={`${log.timestamp}-${index}`}>
                    <ListItem disableGutters>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <Typography
                              variant="caption"
                              sx={{
                                fontWeight: 'bold',
                                minWidth: 100,
                                color:
                                  log.type === 'error'
                                    ? 'error.main'
                                    : log.type === 'warning'
                                    ? 'warning.main'
                                    : 'primary.main',
                              }}
                            >
                              [{log.type.toUpperCase()}]
                            </Typography>
                            <Typography variant="body2" sx={{ flex: 1 }}>
                              {log.message}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Typography variant="caption" color="textSecondary">
                            {format(
                              new Date(log.timestamp),
                              'HH:mm:ss'
                            )}
                          </Typography>
                        }
                      />
                    </ListItem>
                    {index < displayLogs.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
              <div ref={logsEndRef} />
            </Paper>
          )}
        </CardContent>
      </Card>

      {/* Outputs Section */}
      {outputs && Object.keys(outputs).length > 0 && (
        <Card>
          <CardHeader title="Deployment Outputs" />
          <Divider />
          <CardContent>
            <Paper variant="outlined" sx={{ p: 2, backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)' }}>
              {Object.entries(outputs).map(([key, value]) => (
                <Box key={key} sx={{ mb: 2, pb: 1, borderBottom: (theme) => `1px solid ${theme.palette.divider}` }}>
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 'bold', color: 'primary.main' }}
                  >
                    {key}:
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      mt: 0.5,
                      p: 1,
                      backgroundColor: (theme) => theme.palette.background.paper,
                      borderRadius: 1,
                      fontFamily: 'monospace',
                      wordBreak: 'break-all',
                    }}
                  >
                    {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                  </Typography>
                </Box>
              ))}
            </Paper>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default DeploymentStatusViewer;
