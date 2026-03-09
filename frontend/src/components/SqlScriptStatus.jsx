import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Collapse,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Paper,
  Typography,
  Alert,
} from '@mui/material';
import {
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Schedule as PendingIcon,
  PlayArrow as RunningIcon,
  ExpandMore as ExpandIcon,
  Timer as TimerIcon,
  TableRows as RowsIcon,
} from '@mui/icons-material';

const SqlScriptStatus = ({ deploymentId, scripts = [], onRefresh }) => {
  const [expandedScript, setExpandedScript] = useState(null);
  const [pollingInterval, setPollingInterval] = useState(null);

  useEffect(() => {
    // Auto-refresh if any scripts are pending or running
    const hasActiveScripts = scripts.some(
      s => s.status === 'pending' || s.status === 'running'
    );

    if (hasActiveScripts && !pollingInterval) {
      const interval = setInterval(() => {
        if (onRefresh) onRefresh();
      }, 3000); // Poll every 3 seconds
      setPollingInterval(interval);
    } else if (!hasActiveScripts && pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }

    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [scripts, onRefresh, pollingInterval]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <SuccessIcon color="success" />;
      case 'error':
        return <ErrorIcon color="error" />;
      case 'running':
        return <RunningIcon color="primary" />;
      case 'pending':
      default:
        return <PendingIcon color="disabled" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      case 'running':
        return 'primary';
      case 'pending':
      default:
        return 'default';
    }
  };

  const formatDuration = (ms) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleString();
  };

  const handleToggleExpand = (scriptId) => {
    setExpandedScript(expandedScript === scriptId ? null : scriptId);
  };

  const calculateProgress = () => {
    if (scripts.length === 0) return 0;
    const completed = scripts.filter(s => s.status === 'success' || s.status === 'error').length;
    return (completed / scripts.length) * 100;
  };

  const getOverallStatus = () => {
    if (scripts.length === 0) return 'No scripts';
    
    const hasRunning = scripts.some(s => s.status === 'running');
    if (hasRunning) return 'Executing...';
    
    const hasError = scripts.some(s => s.status === 'error');
    const allComplete = scripts.every(s => s.status === 'success' || s.status === 'error');
    
    if (allComplete && !hasError) return 'All scripts completed successfully';
    if (allComplete && hasError) return 'Completed with errors';
    
    return 'Pending execution';
  };

  if (scripts.length === 0) {
    return (
      <Alert severity="info">
        <Typography variant="body2">
          No database scripts configured for this deployment.
        </Typography>
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
        Database Script Execution
      </Typography>

      {/* Overall Progress */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              {getOverallStatus()}
            </Typography>
            <Chip
              label={`${scripts.filter(s => s.status === 'success').length}/${scripts.length} Complete`}
              color={calculateProgress() === 100 ? 'success' : 'primary'}
              size="small"
            />
          </Box>
          <LinearProgress
            variant="determinate"
            value={calculateProgress()}
            sx={{ height: 8, borderRadius: 1 }}
          />
          <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
            {Math.round(calculateProgress())}% complete
          </Typography>
        </CardContent>
      </Card>

      {/* Scripts List */}
      <List sx={{ bgcolor: 'background.paper', borderRadius: 1 }}>
        {scripts.map((script, index) => (
          <Card key={script.id} sx={{ mb: 2 }}>
            <ListItem
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                cursor: 'pointer',
                '&:hover': { bgcolor: 'action.hover' },
              }}
              onClick={() => handleToggleExpand(script.id)}
            >
              <Box sx={{ mr: 2, mt: 0.5 }}>
                {getStatusIcon(script.status)}
              </Box>

              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                      {index + 1}. {script.scriptName}
                    </Typography>
                    <Chip
                      label={script.status}
                      color={getStatusColor(script.status)}
                      size="small"
                    />
                  </Box>
                }
                secondary={
                  <Box sx={{ mt: 0.5 }}>
                    <Typography variant="caption" component="div" color="textSecondary">
                      Order: {script.executionOrder} | 
                      {script.executedAt && ` Executed: ${formatTimestamp(script.executedAt)} | `}
                      {script.executionDurationMs && ` Duration: ${formatDuration(script.executionDurationMs)} | `}
                      {script.rowsAffected !== null && ` Rows: ${script.rowsAffected}`}
                    </Typography>
                  </Box>
                }
              />

              <IconButton
                size="small"
                sx={{
                  transform: expandedScript === script.id ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s',
                }}
              >
                <ExpandIcon />
              </IconButton>
            </ListItem>

            <Collapse in={expandedScript === script.id} timeout="auto" unmountOnExit>
              <CardContent sx={{ pt: 0, bgcolor: 'background.default' }}>
                {/* Script Details */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    Script Configuration
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Chip
                      icon={<TimerIcon />}
                      label={`Timeout: ${script.timeoutSeconds}s`}
                      size="small"
                      variant="outlined"
                    />
                    {script.haltOnError && (
                      <Chip label="Halt on error" size="small" variant="outlined" color="warning" />
                    )}
                    {script.runInTransaction && (
                      <Chip label="Transactional" size="small" variant="outlined" color="info" />
                    )}
                  </Box>
                </Box>

                {/* Execution Stats */}
                {script.status !== 'pending' && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                      Execution Details
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      {script.executionDurationMs && (
                        <Chip
                          icon={<TimerIcon />}
                          label={`${formatDuration(script.executionDurationMs)}`}
                          size="small"
                          color="primary"
                        />
                      )}
                      {script.rowsAffected !== null && (
                        <Chip
                          icon={<RowsIcon />}
                          label={`${script.rowsAffected} rows affected`}
                          size="small"
                          color="success"
                        />
                      )}
                    </Box>
                  </Box>
                )}

                {/* Error Display */}
                {script.status === 'error' && script.errorMessage && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                      Error Message:
                    </Typography>
                    <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                      {script.errorMessage}
                    </Typography>
                  </Alert>
                )}

                {/* Script Content Preview */}
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    Script Content (first 10 lines)
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: 'action.hover', maxHeight: 200, overflow: 'auto' }}>
                    <Typography
                      variant="caption"
                      component="pre"
                      sx={{
                        fontFamily: 'monospace',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        margin: 0,
                      }}
                    >
                      {script.scriptContent ? 
                        script.scriptContent.split('\n').slice(0, 10).join('\n') + 
                        (script.scriptContent.split('\n').length > 10 ? '\n...' : '')
                        : 'Script content not available'}
                    </Typography>
                  </Paper>
                </Box>
              </CardContent>
            </Collapse>
          </Card>
        ))}
      </List>

      {/* Status Legend */}
      <Alert severity="info" sx={{ mt: 2 }}>
        <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
          Status Guide:
        </Typography>
        <Typography variant="caption" component="div">
          • <strong>Pending:</strong> Script queued for execution<br />
          • <strong>Running:</strong> Script currently executing<br />
          • <strong>Success:</strong> Script completed without errors<br />
          • <strong>Error:</strong> Script failed with an error
        </Typography>
      </Alert>
    </Box>
  );
};

export default SqlScriptStatus;
