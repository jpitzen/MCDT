import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  AlertTitle,
  Divider,
  Collapse,
  LinearProgress,
  CircularProgress,
} from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import EditIcon from '@mui/icons-material/Edit';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RefreshIcon from '@mui/icons-material/Refresh';
import PreviewIcon from '@mui/icons-material/Preview';
import { useWizard } from '../../WizardContext';
import api from '../../../../services/api';

/**
 * TerraformPreviewStep
 * Allows users to run a terraform plan preview before actually deploying.
 * Shows what resources will be created, modified, or destroyed.
 */
export default function TerraformPreviewStep() {
  const { state, updateDeployConfig } = useWizard();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(state.deployConfig?.terraformPreview || null);
  const [error, setError] = useState(null);
  const [showRawOutput, setShowRawOutput] = useState(false);

  const deploymentId = state.deploymentId;
  const hasPreview = preview && preview.summary;

  const runPreview = useCallback(async () => {
    if (!deploymentId) {
      setError('No deployment ID found. Please ensure you have created a deployment draft.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.deployments.preview(deploymentId);
      const previewData = response.data?.data || response.data;
      
      setPreview(previewData);
      updateDeployConfig({ 
        terraformPreview: previewData,
        previewedAt: new Date().toISOString()
      });
      
    } catch (err) {
      console.error('Failed to run terraform preview:', err);
      setError(err.response?.data?.message || 'Failed to run terraform preview. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [deploymentId, updateDeployConfig]);

  if (loading) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Running Terraform Plan...
        </Typography>
        <LinearProgress sx={{ mb: 2 }} />
        <Alert severity="info">
          <AlertTitle>Analyzing Infrastructure</AlertTitle>
          Terraform is analyzing your configuration and calculating what changes need to be made.
          This may take 2-5 minutes depending on the complexity of your infrastructure.
        </Alert>
      </Box>
    );
  }

  if (!hasPreview) {
    return (
      <Box>
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <PreviewIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Terraform Plan Preview
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Run a preview to see what resources will be created, modified, or destroyed
            <strong> before actually making any changes</strong> to your cloud infrastructure.
          </Typography>
          
          <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
            <AlertTitle>Why Preview?</AlertTitle>
            <Typography variant="body2">
              • Validates your configuration for errors<br />
              • Shows exactly what resources will be created<br />
              • Identifies potential issues before deployment<br />
              • No actual changes are made to your cloud account
            </Typography>
          </Alert>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {!deploymentId && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <AlertTitle>No Deployment Found</AlertTitle>
              You need to create a deployment draft first before you can run a preview.
              Please complete the previous phases and submit for approval.
            </Alert>
          )}

          <Button
            variant="contained"
            size="large"
            startIcon={<PlayArrowIcon />}
            onClick={runPreview}
            disabled={!deploymentId}
          >
            Run Preview
          </Button>
        </Paper>
      </Box>
    );
  }

  const { summary, rawOutput, previewedAt } = preview;
  const hasChanges = summary.toAdd > 0 || summary.toChange > 0 || summary.toDestroy > 0;
  const isNoChanges = summary.valid && !hasChanges;

  return (
    <Box>
      {/* Header with timestamp */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Terraform Plan Results
        </Typography>
        {previewedAt && (
          <Typography variant="caption" color="text.secondary">
            Previewed: {new Date(previewedAt).toLocaleString()}
          </Typography>
        )}
      </Box>

      {/* Summary Chips */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Chip
          icon={<AddCircleIcon />}
          label={`${summary.toAdd} to add`}
          color={summary.toAdd > 0 ? 'success' : 'default'}
          variant={summary.toAdd > 0 ? 'filled' : 'outlined'}
        />
        <Chip
          icon={<EditIcon />}
          label={`${summary.toChange} to change`}
          color={summary.toChange > 0 ? 'warning' : 'default'}
          variant={summary.toChange > 0 ? 'filled' : 'outlined'}
        />
        <Chip
          icon={<RemoveCircleIcon />}
          label={`${summary.toDestroy} to destroy`}
          color={summary.toDestroy > 0 ? 'error' : 'default'}
          variant={summary.toDestroy > 0 ? 'filled' : 'outlined'}
        />
      </Box>

      {/* No Changes Message */}
      {isNoChanges && (
        <Alert severity="info" icon={<CheckCircleIcon />} sx={{ mb: 2 }}>
          <AlertTitle>No Changes Required</AlertTitle>
          Your infrastructure matches the current configuration. No resources need to be created, 
          modified, or destroyed.
        </Alert>
      )}

      {/* Success Message */}
      {summary.valid && hasChanges && summary.toDestroy === 0 && (
        <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mb: 2 }}>
          <AlertTitle>Preview Successful</AlertTitle>
          Terraform plan is valid. The deployment will create {summary.toAdd} resource(s).
        </Alert>
      )}

      {/* Destruction Warning */}
      {summary.toDestroy > 0 && (
        <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 2 }}>
          <AlertTitle>Resources Will Be Destroyed</AlertTitle>
          This plan will destroy {summary.toDestroy} resource(s). Please review carefully before applying.
        </Alert>
      )}

      {/* Resource List */}
      {summary.resources && summary.resources.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Resource Changes ({summary.resources.length}):
          </Typography>
          <Paper variant="outlined" sx={{ maxHeight: 300, overflow: 'auto' }}>
            <List dense>
              {summary.resources.map((resource, index) => (
                <ListItem key={index} divider={index < summary.resources.length - 1}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {resource.action === 'created' && <AddCircleIcon color="success" fontSize="small" />}
                    {resource.action === 'updated' && <EditIcon color="warning" fontSize="small" />}
                    {resource.action === 'destroyed' && <RemoveCircleIcon color="error" fontSize="small" />}
                  </ListItemIcon>
                  <ListItemText
                    primary={resource.name}
                    secondary={`will be ${resource.action}`}
                    primaryTypographyProps={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                    secondaryTypographyProps={{ fontSize: '0.75rem' }}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Divider sx={{ my: 2 }} />

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
            maxHeight: 400,
            fontSize: '0.75rem',
            fontFamily: 'monospace',
          }}
        >
          {rawOutput || 'No output available'}
        </Box>
      </Collapse>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
        <Button
          variant="outlined"
          startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
          onClick={runPreview}
          disabled={loading}
        >
          Re-run Preview
        </Button>
      </Box>

      {/* Next Steps */}
      <Alert severity="info" sx={{ mt: 3 }}>
        <AlertTitle>Next Steps</AlertTitle>
        Your terraform configuration has been validated. When you submit for approval and the deployment 
        starts, these changes will be applied to your cloud infrastructure.
      </Alert>
    </Box>
  );
}
