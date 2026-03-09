import React, { useState } from 'react';
import {
  Box,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Divider,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import HistoryIcon from '@mui/icons-material/History';
import DeleteIcon from '@mui/icons-material/Delete';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { useWizard } from '../WizardContext';
import { deploymentDraftsApi } from '../../../services/api';

/**
 * DraftManager - Handles saving and loading deployment drafts
 */
export default function DraftManager() {
  const { state, saveDraft, loadDraft, setError, setSuccess } = useWizard();
  const { draftId, draftName, draftDescription, isDirty, lastSaved, loading } = state;

  const [anchorEl, setAnchorEl] = useState(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [drafts, setDrafts] = useState([]);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [newDraftName, setNewDraftName] = useState('');
  const [newDraftDescription, setNewDraftDescription] = useState('');

  const menuOpen = Boolean(anchorEl);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSaveClick = () => {
    handleMenuClose();
    if (draftId) {
      // Quick save existing draft
      saveDraft(draftName, draftDescription);
    } else {
      // Open dialog for new draft
      setNewDraftName('');
      setNewDraftDescription('');
      setSaveDialogOpen(true);
    }
  };

  const handleSaveAsClick = () => {
    handleMenuClose();
    setNewDraftName(draftName ? `${draftName} (copy)` : '');
    setNewDraftDescription(draftDescription);
    setSaveDialogOpen(true);
  };

  const handleSaveConfirm = async () => {
    if (!newDraftName.trim()) {
      setError('Draft name is required');
      return;
    }
    await saveDraft(newDraftName.trim(), newDraftDescription.trim());
    setSaveDialogOpen(false);
  };

  const handleLoadClick = async () => {
    handleMenuClose();
    setLoadingDrafts(true);
    try {
      const response = await deploymentDraftsApi.getAllDrafts();
      setDrafts(response.data.data?.drafts || response.data.drafts || []);
      setLoadDialogOpen(true);
    } catch (error) {
      setError('Failed to load drafts');
    } finally {
      setLoadingDrafts(false);
    }
  };

  const handleLoadDraft = (draft) => {
    loadDraft(draft.id);
    setLoadDialogOpen(false);
  };

  const handleDeleteDraft = async (draftId, event) => {
    event.stopPropagation();
    try {
      await deploymentDraftsApi.deleteDraft(draftId);
      setDrafts(drafts.filter((d) => d.id !== draftId));
      setSuccess('Draft deleted');
    } catch (error) {
      setError('Failed to delete draft');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString();
  };

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {isDirty && (
          <Chip
            label="Unsaved changes"
            size="small"
            color="warning"
            variant="outlined"
            sx={{ mr: 1 }}
          />
        )}
        {lastSaved && !isDirty && (
          <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
            Saved {formatDate(lastSaved)}
          </Typography>
        )}
        <Button
          variant="outlined"
          size="small"
          startIcon={<SaveIcon />}
          endIcon={<KeyboardArrowDownIcon />}
          onClick={handleMenuOpen}
          disabled={loading.global}
        >
          {draftName || 'Draft'}
        </Button>
      </Box>

      {/* Dropdown Menu */}
      <Menu anchorEl={anchorEl} open={menuOpen} onClose={handleMenuClose}>
        <MenuItem onClick={handleSaveClick} disabled={loading.global}>
          <ListItemIcon>
            <SaveIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>
            {draftId ? 'Save' : 'Save as new draft'}
          </ListItemText>
        </MenuItem>
        {draftId && (
          <MenuItem onClick={handleSaveAsClick} disabled={loading.global}>
            <ListItemIcon>
              <SaveIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Save as copy...</ListItemText>
          </MenuItem>
        )}
        <Divider />
        <MenuItem onClick={handleLoadClick} disabled={loadingDrafts}>
          <ListItemIcon>
            {loadingDrafts ? <CircularProgress size={20} /> : <FolderOpenIcon fontSize="small" />}
          </ListItemIcon>
          <ListItemText>Load draft...</ListItemText>
        </MenuItem>
      </Menu>

      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Save Deployment Draft</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Draft Name"
            fullWidth
            value={newDraftName}
            onChange={(e) => setNewDraftName(e.target.value)}
            placeholder="e.g., Production EKS Cluster"
          />
          <TextField
            margin="dense"
            label="Description (optional)"
            fullWidth
            multiline
            rows={3}
            value={newDraftDescription}
            onChange={(e) => setNewDraftDescription(e.target.value)}
            placeholder="Add notes about this deployment configuration..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSaveConfirm}
            variant="contained"
            startIcon={loading.global ? <CircularProgress size={16} /> : <SaveIcon />}
            disabled={loading.global || !newDraftName.trim()}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Load Dialog */}
      <Dialog open={loadDialogOpen} onClose={() => setLoadDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Load Deployment Draft</DialogTitle>
        <DialogContent>
          {drafts.length === 0 ? (
            <Alert severity="info" sx={{ mt: 1 }}>
              No saved drafts found. Create one by clicking "Save as new draft".
            </Alert>
          ) : (
            <Box sx={{ mt: 1 }}>
              {drafts.map((draft) => (
                <Box
                  key={draft.id}
                  onClick={() => handleLoadDraft(draft)}
                  sx={{
                    p: 2,
                    mb: 1,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                >
                  <Box>
                    <Typography variant="subtitle1" fontWeight={500}>
                      {draft.name}
                    </Typography>
                    {draft.description && (
                      <Typography variant="body2" color="text.secondary">
                        {draft.description}
                      </Typography>
                    )}
                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                      <Chip
                        icon={<HistoryIcon />}
                        label={formatDate(draft.updatedAt || draft.createdAt)}
                        size="small"
                        variant="outlined"
                      />
                      {draft.status && (
                        <Chip
                          label={draft.status}
                          size="small"
                          color={draft.status === 'approved' ? 'success' : 'default'}
                        />
                      )}
                    </Box>
                  </Box>
                  <Button
                    size="small"
                    color="error"
                    onClick={(e) => handleDeleteDraft(draft.id, e)}
                    sx={{ minWidth: 'auto' }}
                  >
                    <DeleteIcon fontSize="small" />
                  </Button>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLoadDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
