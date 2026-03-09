import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  AlertTitle,
  Divider,
  Collapse,
  Button,
  LinearProgress,
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

/**
 * TerraformPreview Component
 * Displays terraform plan results before applying
 * 
 * Props:
 * - preview: object - The preview data { summary: { toAdd, toChange, toDestroy, resources }, rawOutput }
 * - loading: boolean - Whether preview is loading
 * - onRunPreview: function - Called to run a new preview
 * - onApply: function - Called when user wants to apply the plan
 * - showApplyButton: boolean - Whether to show the apply button (default true)
 */
export default function TerraformPreview({
  preview,
  loading = false,
  onRunPreview,
  onApply,
  showApplyButton = true,
  error = null,
}) {
  const [showRawOutput, setShowRawOutput] = React.useState(false);

  if (loading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Running Terraform Plan...
        </Typography>
        <LinearProgress sx={{ mb: 2 }} />
        <Typography variant="body2" color="text.secondary">
          This may take a few minutes. Terraform is analyzing your configuration 
          and calculating what changes need to be made.
        </Typography>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 3 }}>
        <Alert severity="error">
          <AlertTitle>Preview Failed</AlertTitle>
          {error}
        </Alert>
        {onRunPreview && (
          <Button
            startIcon={<RefreshIcon />}
            onClick={onRunPreview}
            sx={{ mt: 2 }}
          >
            Retry Preview
          </Button>
        )}
      </Paper>
    );
  }

  if (!preview) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom>
          Terraform Plan Preview
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Run a preview to see what resources will be created, modified, or destroyed
          before actually making any changes.
        </Typography>
        {onRunPreview && (
          <Button
            variant="contained"
            startIcon={<PlayArrowIcon />}
            onClick={onRunPreview}
          >
            Run Preview
          </Button>
        )}
      </Paper>
    );
  }

  const { summary, rawOutput, previewedAt } = preview;
  const hasChanges = summary.toAdd > 0 || summary.toChange > 0 || summary.toDestroy > 0;
  const isNoChanges = summary.valid && !hasChanges;

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Terraform Plan Preview
        </Typography>
        {previewedAt && (
          <Typography variant="caption" color="text.secondary">
            Previewed: {new Date(previewedAt).toLocaleString()}
          </Typography>
        )}
      </Box>

      {/* Summary Chips */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
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
            Resource Changes:
          </Typography>
          <List dense sx={{ bgcolor: 'action.hover', borderRadius: 1 }}>
            {summary.resources.map((resource, index) => (
              <ListItem key={index}>
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
        </Box>
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
        {onRunPreview && (
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={onRunPreview}
          >
            Re-run Preview
          </Button>
        )}
        {showApplyButton && onApply && hasChanges && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<PlayArrowIcon />}
            onClick={onApply}
          >
            Apply Changes
          </Button>
        )}
      </Box>
    </Paper>
  );
}
