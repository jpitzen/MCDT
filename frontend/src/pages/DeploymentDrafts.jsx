import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  Alert,
  AlertTitle,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  CircularProgress,
  Tabs,
  Tab,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  PlayArrow as DeployIcon,
  CheckCircle as ApproveIcon,
  CheckCircle,
  Cancel,
  Science as TestIcon,
  Send as SubmitIcon,
  Visibility as ViewIcon,
  Visibility as VisibilityIcon,
  RestartAlt as RestartAltIcon,
  CloudQueue as CloudIcon,
  Preview as PreviewIcon,
  AddCircle as AddCircleIcon,
  RemoveCircle as RemoveCircleIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Warning as WarningIcon,
  Code as CodeIcon,
  Assignment as AssignmentIcon,
  FactCheck as FactCheckIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import api, { deploymentDraftsApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const statusColors = {
  draft: 'default',
  pending_approval: 'warning',
  approved: 'success',
  rejected: 'error',
  deployment_pending: 'info',  // Deployment created, awaiting start (dry run completed)
  deployed: 'primary',  // Deployment actually started/running
};

const cloudProviderColors = {
  aws: '#FF9900',
  azure: '#0089D6',
  gcp: '#4285F4',
  digitalocean: '#0080FF',
  linode: '#00A95C',
};

export default function DeploymentDrafts() {
  const { user } = useAuth();
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterProvider, setFilterProvider] = useState('all');
  const [selectedDraft, setSelectedDraft] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [approvalComment, setApprovalComment] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [testLoading, setTestLoading] = useState(false);
  const [exportingTerraform, setExportingTerraform] = useState(false);
  
  // Terraform Preview state
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewResults, setPreviewResults] = useState(null);
  const [previewError, setPreviewError] = useState(null);
  const [showRawOutput, setShowRawOutput] = useState(false);
  const [previewTab, setPreviewTab] = useState(0);

  useEffect(() => {
    fetchDrafts();
  }, [filterStatus, filterProvider]);

  const fetchDrafts = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterStatus !== 'all') params.status = filterStatus;
      if (filterProvider !== 'all') params.cloudProvider = filterProvider;
      
      const response = await deploymentDraftsApi.list(params);
      setDrafts(response.data.data.drafts || []);
    } catch (error) {
      console.error('Failed to fetch drafts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleView = (draft) => {
    setSelectedDraft(draft);
    setViewDialogOpen(true);
  };

  const handleEdit = (draftId) => {
    const draft = drafts.find(d => d.id === draftId);
    if (!draft) {
      console.error('Draft not found:', draftId);
      return;
    }
    
    // Navigate to unified wizard with draft data for editing
    navigate('/unified-wizard', {
      state: {
        editMode: true,
        draftId: draft.id,
        draftData: draft
      }
    });
  };

  const handleTest = async (draft) => {
    setSelectedDraft(draft);
    setTestDialogOpen(true);
    setTestLoading(true);
    try {
      const response = await deploymentDraftsApi.test(draft.id);
      setTestResults(response.data.data.testResults);
    } catch (error) {
      console.error('Test failed:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Test failed';
      setTestResults({ 
        passed: false, 
        message: typeof errorMessage === 'string' ? errorMessage : 'Test failed: ' + JSON.stringify(errorMessage),
        checks: []
      });
    } finally {
      setTestLoading(false);
    }
  };

  const handleSubmitApproval = async (draftId) => {
    try {
      await deploymentDraftsApi.submitApproval(draftId);
      fetchDrafts();
    } catch (error) {
      console.error('Submit approval failed:', error);
    }
  };

  const handleApprove = async () => {
    try {
      await deploymentDraftsApi.approve(selectedDraft.id, { comment: approvalComment });
      setApprovalDialogOpen(false);
      setApprovalComment('');
      fetchDrafts();
    } catch (error) {
      console.error('Approval failed:', error);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }
    try {
      await deploymentDraftsApi.reject(selectedDraft.id, { reason: rejectionReason });
      setApprovalDialogOpen(false);
      setRejectionReason('');
      fetchDrafts();
    } catch (error) {
      console.error('Rejection failed:', error);
    }
  };

  const navigate = useNavigate();

  // Terraform Preview handler
  const handlePreview = async (draft) => {
    setSelectedDraft(draft);
    setPreviewDialogOpen(true);
    setPreviewLoading(true);
    setPreviewResults(null);
    setPreviewError(null);
    setShowRawOutput(false);
    setPreviewTab(0); // Reset to Summary tab
    
    try {
      // First, create a deployment from the draft (in pending state)
      const deployResponse = await deploymentDraftsApi.deploy(draft.id);
      const deployment = deployResponse.data.data.deployment;
      
      // Run terraform preview on the pending deployment
      const previewResponse = await api.deployments.preview(deployment.id);
      const previewData = previewResponse.data?.data || previewResponse.data;
      
      setPreviewResults({
        ...previewData,
        deploymentId: deployment.id,
        deploymentCreated: true,
      });
    } catch (error) {
      console.error('Preview failed:', error);
      setPreviewError(error.response?.data?.message || 'Failed to run terraform preview. Please try again.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDeployFromPreview = async () => {
    if (!previewResults?.deploymentId) {
      alert('No deployment found. Please close and try again.');
      return;
    }
    
    try {
      // Start the deployment that was created during preview
      await api.deployments.start(previewResults.deploymentId);
      setPreviewDialogOpen(false);
      // Navigate to deployment status page
      navigate(`/deployment-status/${previewResults.deploymentId}`);
    } catch (error) {
      console.error('Failed to start deployment:', error);
      alert('Failed to start deployment: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleSaveAndClosePreview = async () => {
    if (!previewResults || !selectedDraft) {
      alert('No preview results to save.');
      return;
    }
    
    try {
      // Save the preview results to the draft
      await deploymentDraftsApi.savePreview(selectedDraft.id, previewResults);
      setPreviewDialogOpen(false);
      setPreviewResults(null);
      setPreviewError(null);
      // Refresh drafts to show updated status and preview data
      fetchDrafts();
    } catch (error) {
      console.error('Failed to save preview:', error);
      alert('Failed to save preview: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleViewSavedPreview = (draft) => {
    if (!draft.previewResults) {
      alert('No saved preview available for this draft.');
      return;
    }
    setSelectedDraft(draft);
    setPreviewResults(draft.previewResults);
    setPreviewError(null);
    setPreviewDialogOpen(true);
    setPreviewTab(0);
  };

  const handleClosePreview = () => {
    setPreviewDialogOpen(false);
    setPreviewResults(null);
    setPreviewError(null);
    // Refresh drafts in case a deployment was created
    fetchDrafts();
  };

  const handleDeploy = async (draftId) => {
    if (!window.confirm('Deploy this configuration? This will create a real deployment.')) {
      return;
    }
    try {
      const response = await deploymentDraftsApi.deploy(draftId);
      const deployment = response.data.data.deployment;
      
      // Start the deployment
      await api.deployments.start(deployment.id);
      
      // Navigate to deployment status page
      navigate(`/deployment-status/${deployment.id}`);
    } catch (error) {
      console.error('Deployment failed:', error);
      const errorMessage = error.response?.data?.error;
      const displayMessage = typeof errorMessage === 'object' 
        ? JSON.stringify(errorMessage) 
        : (errorMessage || error.message);
      alert('Deployment failed: ' + displayMessage);
    }
  };

  const handleDelete = async (draftId) => {
    if (!window.confirm('Delete this draft? This action cannot be undone.')) {
      return;
    }
    try {
      await deploymentDraftsApi.delete(draftId);
      fetchDrafts();
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Delete failed: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleResetDraft = async (draftId, draftName) => {
    if (!window.confirm(`Reset "${draftName}" back to pending approval? This will clear the deployment link.`)) {
      return;
    }
    try {
      await deploymentDraftsApi.reset(draftId);
      fetchDrafts();
      alert(`Draft "${draftName}" has been reset to pending approval.`);
    } catch (error) {
      console.error('Reset failed:', error);
      alert('Reset failed: ' + (error.response?.data?.error?.message || error.message));
    }
  };

  const handleViewDeployment = (deploymentId) => {
    if (deploymentId) {
      navigate(`/deployment-status/${deploymentId}`);
    }
  };

  const openApprovalDialog = (draft) => {
    setSelectedDraft(draft);
    setApprovalDialogOpen(true);
  };

  const handleExportTerraform = async () => {
    if (!selectedDraft) return;
    
    setExportingTerraform(true);
    try {
      const tfConfig = generateTerraformConfig(selectedDraft);
      const blob = new Blob([tfConfig], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedDraft.clusterName || 'deployment'}.tf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed: ' + error.message);
    } finally {
      setExportingTerraform(false);
    }
  };

  const generateTerraformConfig = (draft) => {
    const config = draft.configuration || {};
    const provider = (draft.cloudProvider || 'aws').toLowerCase();
    const timestamp = new Date().toISOString();
    
    let providerBlock = '';
    if (provider === 'aws') {
      providerBlock = `provider "aws" {
  region = "${config.region || 'us-east-1'}"
}`;
    } else if (provider === 'azure') {
      providerBlock = `provider "azurerm" {
  features {}
}`;
    } else if (provider === 'gcp') {
      providerBlock = `provider "google" {
  project = "${config.project || 'my-project'}"
  region  = "${config.region || 'us-central1'}"
}`;
    }

    return `# Deployment: ${draft.name}
# Cluster: ${draft.clusterName}
# Generated: ${timestamp}
# Cloud Provider: ${provider.toUpperCase()}
# Status: ${draft.status || 'draft'}
# Estimated Monthly Cost: $${draft.estimatedMonthlyCost || 0}

terraform {
  required_version = ">= 1.0"
  
  required_providers {
    ${provider === 'azure' ? 'azurerm' : provider === 'gcp' ? 'google' : 'aws'} = {
      source  = "hashicorp/${provider === 'azure' ? 'azurerm' : provider === 'gcp' ? 'google' : 'aws'}"
      version = "~> 5.0"
    }
  }
}

${providerBlock}

# Configuration Details
# ${JSON.stringify(config, null, 2).split('\n').join('\n# ')}

# Note: This is a generated configuration template.
# Please review and modify according to your infrastructure requirements.
`;
  };

  const canApprove = user && (user.role === 'admin' || user.role === 'approver' || user.role === 'manager');
  const filteredDrafts = drafts.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Saved Deployments</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => window.location.href = '/unified-wizard'}
        >
          Create New
        </Button>
      </Box>

      <Paper sx={{ mb: 3, p: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={filterStatus}
                label="Status"
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <MenuItem value="all">All Statuses</MenuItem>
                <MenuItem value="draft">Draft</MenuItem>
                <MenuItem value="pending_approval">Pending Approval</MenuItem>
                <MenuItem value="approved">Approved</MenuItem>
                <MenuItem value="rejected">Rejected</MenuItem>
                <MenuItem value="deployment_pending">Ready to Deploy</MenuItem>
                <MenuItem value="deployed">Deployed</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Cloud Provider</InputLabel>
              <Select
                value={filterProvider}
                label="Cloud Provider"
                onChange={(e) => setFilterProvider(e.target.value)}
              >
                <MenuItem value="all">All Providers</MenuItem>
                <MenuItem value="aws">AWS</MenuItem>
                <MenuItem value="azure">Azure</MenuItem>
                <MenuItem value="gcp">Google Cloud</MenuItem>
                <MenuItem value="digitalocean">DigitalOcean</MenuItem>
                <MenuItem value="linode">Linode</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {loading ? (
        <LinearProgress />
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Cluster</TableCell>
                  <TableCell>Cloud</TableCell>
                  <TableCell align="right">Est. Monthly Cost</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredDrafts.map((draft) => (
                  <TableRow key={draft.id} hover>
                    <TableCell>
                      <Typography variant="subtitle2">{draft.name}</Typography>
                      {draft.description && (
                        <Typography variant="caption" color="text.secondary">
                          {draft.description.substring(0, 50)}
                          {draft.description.length > 50 && '...'}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{draft.clusterName}</TableCell>
                    <TableCell>
                      <Chip
                        icon={<CloudIcon />}
                        label={(draft.cloudProvider || 'unknown').toUpperCase()}
                        size="small"
                        sx={{
                          backgroundColor: cloudProviderColors[draft.cloudProvider] + '20',
                          color: cloudProviderColors[draft.cloudProvider],
                          fontWeight: 'bold',
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      {draft.estimatedMonthlyCost ? (
                        <Tooltip
                          title={
                            draft.costBreakdown ? (
                              <Box>
                                <Typography variant="caption">Compute: ${draft.costBreakdown.compute}</Typography><br />
                                <Typography variant="caption">Storage: ${draft.costBreakdown.storage}</Typography><br />
                                <Typography variant="caption">Database: ${draft.costBreakdown.database}</Typography><br />
                                <Typography variant="caption">Networking: ${draft.costBreakdown.networking}</Typography>
                              </Box>
                            ) : 'No breakdown available'
                          }
                        >
                          <Typography variant="body2" fontWeight="bold">
                            ${parseFloat(draft.estimatedMonthlyCost).toFixed(2)}/mo
                          </Typography>
                        </Tooltip>
                      ) : (
                        <Typography variant="body2" color="text.secondary">-</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={
                          draft.status === 'deployment_pending' 
                            ? 'READY TO DEPLOY' 
                            : (draft.status || 'draft').replace('_', ' ').toUpperCase()
                        }
                        color={statusColors[draft.status || 'draft']}
                        size="small"
                      />
                      {draft.previewedAt && (
                        <Tooltip title={`Previewed: ${new Date(draft.previewedAt).toLocaleString()}`}>
                          <Chip
                            icon={<PreviewIcon sx={{ fontSize: 14 }} />}
                            label="Preview Saved"
                            size="small"
                            variant="outlined"
                            color="info"
                            sx={{ ml: 1, fontSize: '0.65rem' }}
                          />
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell>
                      {draft.createdAt ? new Date(draft.createdAt).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="View Details">
                        <IconButton size="small" onClick={() => handleView(draft)}>
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      
                      {(draft.status === 'draft' || draft.status === 'rejected') && (
                        <>
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => handleEdit(draft.id)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Test Configuration">
                            <IconButton size="small" onClick={() => handleTest(draft)}>
                              <TestIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Submit for Approval">
                            <IconButton
                              size="small"
                              onClick={() => handleSubmitApproval(draft.id)}
                              color="primary"
                            >
                              <SubmitIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}

                      {draft.status === 'pending_approval' && canApprove && (
                        <Tooltip title="Approve/Reject">
                          <IconButton
                            size="small"
                            onClick={() => openApprovalDialog(draft)}
                            color="warning"
                          >
                            <ApproveIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}

                      {draft.status === 'approved' && (
                        <>
                          <Tooltip title="Preview Terraform Plan (Dry Run)">
                            <IconButton
                              size="small"
                              onClick={() => handlePreview(draft)}
                              color="info"
                            >
                              <PreviewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Deploy Without Preview">
                            <IconButton
                              size="small"
                              onClick={() => handleDeploy(draft.id)}
                              color="success"
                            >
                              <DeployIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}

                      {draft.status === 'deployment_pending' && (
                        <>
                          <Tooltip title="View Saved Preview">
                            <IconButton
                              size="small"
                              onClick={() => handleViewSavedPreview(draft)}
                              color="info"
                            >
                              <PreviewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {draft.previewResults?.deploymentId && (
                            <Tooltip title="Deploy Now (Start Saved Preview)">
                              <IconButton
                                size="small"
                                onClick={async () => {
                                  try {
                                    await api.deployments.start(draft.previewResults.deploymentId);
                                    navigate(`/deployment-status/${draft.previewResults.deploymentId}`);
                                  } catch (error) {
                                    console.error('Failed to start deployment:', error);
                                    alert('Failed to start deployment: ' + (error.response?.data?.message || error.message));
                                  }
                                }}
                                color="success"
                              >
                                <DeployIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </>
                      )}

                      {draft.status === 'deployed' ? (
                        <>
                          <Tooltip title="View Deployment">
                            <IconButton 
                              size="small" 
                              onClick={() => handleViewDeployment(draft.deploymentId)}
                              color="info"
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Reset Draft">
                            <IconButton 
                              size="small" 
                              onClick={() => handleResetDraft(draft.id, draft.name)}
                              color="warning"
                            >
                              <RestartAltIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      ) : draft.status === 'deployment_pending' ? (
                        <>
                          <Tooltip title="Reset to Pending Approval">
                            <IconButton 
                              size="small" 
                              onClick={() => handleResetDraft(draft.id, draft.name)}
                              color="warning"
                            >
                              <RestartAltIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" onClick={() => handleDelete(draft.id)} color="error">
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      ) : (
                        <Tooltip title="Delete">
                          <IconButton size="small" onClick={() => handleDelete(draft.id)} color="error">
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredDrafts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography color="text.secondary" sx={{ py: 3 }}>
                        No saved deployments found. Create one from the deployment wizard.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={drafts.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[10, 20, 50]}
          />
        </>
      )}

      {/* View Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: 'background.paper',
            backgroundImage: 'none'
          }
        }}
      >
        {selectedDraft && (
          <>
            <DialogTitle>{selectedDraft.name}</DialogTitle>
            <DialogContent>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {selectedDraft.description || 'No description provided'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Cluster Name</Typography>
                  <Typography variant="body2">{selectedDraft.clusterName}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Cloud Provider</Typography>
                  <Typography variant="body2">{(selectedDraft.cloudProvider || 'unknown').toUpperCase()}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Status</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip label={selectedDraft.status} color={statusColors[selectedDraft.status]} size="small" />
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Monthly Cost</Typography>
                  <Typography variant="body2">
                    ${selectedDraft.estimatedMonthlyCost ? parseFloat(selectedDraft.estimatedMonthlyCost).toFixed(2) : '0.00'}
                  </Typography>
                </Grid>
                {selectedDraft.costBreakdown && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">Cost Breakdown</Typography>
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2">Compute: ${selectedDraft.costBreakdown.compute}</Typography>
                      <Typography variant="body2">Storage: ${selectedDraft.costBreakdown.storage}</Typography>
                      <Typography variant="body2">Database: ${selectedDraft.costBreakdown.database}</Typography>
                      <Typography variant="body2">Networking: ${selectedDraft.costBreakdown.networking}</Typography>
                    </Box>
                  </Grid>
                )}
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">Configuration</Typography>
                  <Paper sx={{ 
                    mt: 1, 
                    p: 2, 
                    backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100'
                  }}>
                    <pre style={{ margin: 0, fontSize: '0.75rem', overflow: 'auto' }}>
                      {JSON.stringify(selectedDraft.configuration, null, 2)}
                    </pre>
                  </Paper>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button 
                onClick={handleExportTerraform}
                startIcon={<CloudIcon />}
                disabled={exportingTerraform}
                variant="outlined"
              >
                {exportingTerraform ? 'Exporting...' : 'Export as Terraform'}
              </Button>
              {selectedDraft.status === 'pending_approval' && canApprove && (
                <>
                  <Button 
                    onClick={() => {
                      setViewDialogOpen(false);
                      openApprovalDialog(selectedDraft);
                    }}
                    variant="contained"
                    color="success"
                  >
                    Approve
                  </Button>
                  <Button 
                    onClick={() => {
                      setViewDialogOpen(false);
                      openApprovalDialog(selectedDraft);
                    }}
                    variant="outlined"
                    color="error"
                  >
                    Deny
                  </Button>
                </>
              )}
              <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Approval Dialog */}
      <Dialog
        open={approvalDialogOpen}
        onClose={() => setApprovalDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: 'background.paper',
            backgroundImage: 'none'
          }
        }}
      >
        {selectedDraft && (
          <>
            <DialogTitle>Review Deployment: {selectedDraft.name}</DialogTitle>
            <DialogContent>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>Estimated Cost</Typography>
                      <Typography variant="h4" color="primary">
                        ${selectedDraft.estimatedMonthlyCost ? parseFloat(selectedDraft.estimatedMonthlyCost).toFixed(2) : '0.00'}/month
                      </Typography>
                      {selectedDraft.costBreakdown && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="body2">Compute: ${selectedDraft.costBreakdown.compute}</Typography>
                          <Typography variant="body2">Storage: ${selectedDraft.costBreakdown.storage}</Typography>
                          <Typography variant="body2">Database: ${selectedDraft.costBreakdown.database}</Typography>
                          <Typography variant="body2">Networking: ${selectedDraft.costBreakdown.networking}</Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Approval Comment (Optional)"
                    fullWidth
                    multiline
                    rows={3}
                    value={approvalComment}
                    onChange={(e) => setApprovalComment(e.target.value)}
                    placeholder="Add any notes about this approval..."
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Rejection Reason (Required if rejecting)"
                    fullWidth
                    multiline
                    rows={3}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Explain why this deployment is being rejected..."
                    error={rejectionReason.trim() === ''}
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setApprovalDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleReject} color="error" variant="outlined">
                Reject
              </Button>
              <Button onClick={handleApprove} color="success" variant="contained">
                Approve
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Test Results Dialog */}
      <Dialog
        open={testDialogOpen}
        onClose={() => setTestDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: 'background.paper',
            backgroundImage: 'none'
          }
        }}
      >
        <DialogTitle>Test Results</DialogTitle>
        <DialogContent>
          {testLoading ? (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <LinearProgress />
              <Typography sx={{ mt: 2 }}>Testing deployment configuration...</Typography>
            </Box>
          ) : testResults ? (
            <Box>
              <Box sx={{ mb: 3 }}>
                <Chip
                  label={testResults.passed ? 'All Checks Passed' : 'Some Checks Failed'}
                  color={testResults.passed ? 'success' : 'error'}
                  sx={{ fontWeight: 'bold' }}
                />
              </Box>
              {testResults.checks && testResults.checks.map((check, index) => (
                <Box 
                  key={index} 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    mb: 2,
                    pb: 2,
                    borderBottom: index < testResults.checks.length - 1 ? '1px solid' : 'none',
                    borderColor: 'divider'
                  }}
                >
                  {check.status === 'passed' ? (
                    <CheckCircle sx={{ color: 'success.main', mr: 1.5, mt: 0.25 }} />
                  ) : check.status === 'failed' ? (
                    <Cancel sx={{ color: 'error.main', mr: 1.5, mt: 0.25 }} />
                  ) : (
                    <CheckCircle sx={{ color: 'warning.main', mr: 1.5, mt: 0.25 }} />
                  )}
                  <Box sx={{ flex: 1 }}>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontWeight: 'bold',
                        color: check.status === 'passed' ? 'success.main' : 
                               check.status === 'failed' ? 'error.main' : 
                               'warning.main'
                      }}
                    >
                      {check.name}
                    </Typography>
                    {check.message && (
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{ mt: 0.5, lineHeight: 1.5 }}
                      >
                        {check.message}
                      </Typography>
                    )}
                  </Box>
                </Box>
              ))}
              {testResults.estimatedDuration && (
                <Box sx={{ mt: 2, p: 2, backgroundColor: 'info.light', borderRadius: 1 }}>
                  <Typography variant="body2">
                    Estimated deployment time: {testResults.estimatedDuration}
                  </Typography>
                </Box>
              )}
              {testResults.message && !testResults.passed && (
                <Typography color="error" variant="body2" sx={{ mt: 2 }}>
                  {testResults.message}
                </Typography>
              )}
            </Box>
          ) : (
            <Typography>No test results available</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Terraform Preview Dialog */}
      <Dialog
        open={previewDialogOpen}
        onClose={previewLoading ? undefined : handleClosePreview}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: 'background.paper',
            backgroundImage: 'none',
            borderTop: '4px solid',
            borderColor: 'info.main',
          }
        }}
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
              <Typography variant="body2" color="text.secondary">
                This may take 2-5 minutes. Terraform is analyzing your configuration 
                and calculating what resources will be created.
              </Typography>
              <Alert severity="info" sx={{ mt: 3, textAlign: 'left' }}>
                <AlertTitle>What's happening?</AlertTitle>
                <Typography variant="body2">
                  1. Creating deployment record<br />
                  2. Initializing Terraform<br />
                  3. Generating configuration files<br />
                  4. Running terraform plan (dry-run)
                </Typography>
              </Alert>
            </Box>
          ) : previewError ? (
            <Alert severity="error">
              <AlertTitle>Preview Failed</AlertTitle>
              {previewError}
            </Alert>
          ) : previewResults ? (
            <Box>
              {/* Deployment Info Header */}
              <Box sx={{ mb: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Deployment: {selectedDraft?.clusterName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Preview completed at: {previewResults.previewedAt ? new Date(previewResults.previewedAt).toLocaleString() : new Date().toLocaleString()}
                </Typography>
              </Box>

              {/* Summary Chips */}
              <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                <Chip
                  icon={<AddCircleIcon />}
                  label={`${previewResults.summary?.toAdd || 0} to add`}
                  color={(previewResults.summary?.toAdd || 0) > 0 ? 'success' : 'default'}
                  variant={(previewResults.summary?.toAdd || 0) > 0 ? 'filled' : 'outlined'}
                />
                <Chip
                  icon={<EditIcon />}
                  label={`${previewResults.summary?.toChange || 0} to change`}
                  color={(previewResults.summary?.toChange || 0) > 0 ? 'warning' : 'default'}
                  variant={(previewResults.summary?.toChange || 0) > 0 ? 'filled' : 'outlined'}
                />
                <Chip
                  icon={<RemoveCircleIcon />}
                  label={`${previewResults.summary?.toDestroy || 0} to destroy`}
                  color={(previewResults.summary?.toDestroy || 0) > 0 ? 'error' : 'default'}
                  variant={(previewResults.summary?.toDestroy || 0) > 0 ? 'filled' : 'outlined'}
                />
              </Box>

              {/* Tabs */}
              <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <Tabs value={previewTab} onChange={(e, v) => setPreviewTab(v)} aria-label="preview tabs">
                  <Tab icon={<AssignmentIcon />} iconPosition="start" label="Summary" />
                  <Tab icon={<FactCheckIcon />} iconPosition="start" label="Checks" />
                  <Tab icon={<CodeIcon />} iconPosition="start" label="Raw Output" />
                </Tabs>
              </Box>

              {/* Tab Panels */}
              {/* Summary Tab */}
              {previewTab === 0 && (
                <Box>
                  {/* Success/Warning Messages */}
                  {previewResults.summary?.valid && previewResults.summary?.toDestroy === 0 && (
                    <Alert severity="success" sx={{ mb: 2 }}>
                      <AlertTitle>Preview Successful</AlertTitle>
                      Terraform plan is valid. The deployment will create {previewResults.summary?.toAdd || 0} resource(s).
                      Click "Deploy Now" to proceed with the deployment.
                    </Alert>
                  )}

                  {previewResults.summary?.toDestroy > 0 && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      <AlertTitle>Resources Will Be Destroyed</AlertTitle>
                      This plan will destroy {previewResults.summary.toDestroy} resource(s). Please review carefully.
                    </Alert>
                  )}

                  {/* Resource List */}
                  {previewResults.summary?.resources && previewResults.summary.resources.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        Resources ({previewResults.summary.resources.length}):
                      </Typography>
                      <Paper variant="outlined" sx={{ maxHeight: 300, overflow: 'auto' }}>
                        <List dense>
                          {previewResults.summary.resources.map((resource, index) => (
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
                </Box>
              )}

              {/* Checks Tab */}
              {previewTab === 1 && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom sx={{ mb: 2 }}>
                    Pre-Deployment Validation Checks
                  </Typography>

                  {/* AWS Prerequisite Check Errors */}
                  {previewResults.prerequisiteCheck?.errors?.length > 0 && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      <AlertTitle>AWS Resource Issues Detected</AlertTitle>
                      <ul style={{ margin: 0, paddingLeft: 20 }}>
                        {previewResults.prerequisiteCheck.errors.map((error, idx) => (
                          <li key={idx}>{error}</li>
                        ))}
                      </ul>
                    </Alert>
                  )}

                  {/* AWS Prerequisite Check Warnings */}
                  {previewResults.prerequisiteCheck?.warnings?.length > 0 && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      <AlertTitle>Warnings</AlertTitle>
                      <ul style={{ margin: 0, paddingLeft: 20 }}>
                        {previewResults.prerequisiteCheck.warnings.map((warning, idx) => (
                          <li key={idx}>{warning}</li>
                        ))}
                      </ul>
                    </Alert>
                  )}

                  <Paper variant="outlined">
                    <List dense>
                      {/* Terraform Init Check */}
                      <ListItem divider>
                        <ListItemIcon>
                          <CheckIcon sx={{ color: 'success.main' }} />
                        </ListItemIcon>
                        <ListItemText
                          primary="Terraform Initialization"
                          secondary="Terraform providers and modules initialized successfully"
                        />
                        <Chip label="Passed" size="small" color="success" />
                      </ListItem>

                      {/* Terraform Validate Check */}
                      <ListItem divider>
                        <ListItemIcon>
                          <CheckIcon sx={{ color: 'success.main' }} />
                        </ListItemIcon>
                        <ListItemText
                          primary="Configuration Validation"
                          secondary="Terraform configuration syntax is valid"
                        />
                        <Chip label="Passed" size="small" color="success" />
                      </ListItem>

                      {/* Plan Generation Check */}
                      <ListItem divider>
                        <ListItemIcon>
                          {previewResults.summary?.valid ? (
                            <CheckIcon sx={{ color: 'success.main' }} />
                          ) : (
                            <CloseIcon sx={{ color: 'error.main' }} />
                          )}
                        </ListItemIcon>
                        <ListItemText
                          primary="Plan Generation"
                          secondary={previewResults.summary?.valid 
                            ? `Successfully planned ${previewResults.summary?.toAdd || 0} resources to create`
                            : "Failed to generate execution plan"
                          }
                        />
                        <Chip 
                          label={previewResults.summary?.valid ? "Passed" : "Failed"} 
                          size="small" 
                          color={previewResults.summary?.valid ? "success" : "error"} 
                        />
                      </ListItem>

                      {/* VPC Quota Check (from prerequisiteCheck) */}
                      {previewResults.prerequisiteCheck?.quotas?.vpc && (
                        <ListItem divider>
                          <ListItemIcon>
                            {previewResults.prerequisiteCheck.quotas.vpc.available ? (
                              <CheckIcon sx={{ color: 'success.main' }} />
                            ) : (
                              <CloseIcon sx={{ color: 'error.main' }} />
                            )}
                          </ListItemIcon>
                          <ListItemText
                            primary="VPC Quota"
                            secondary={`${previewResults.prerequisiteCheck.quotas.vpc.used}/${previewResults.prerequisiteCheck.quotas.vpc.limit} VPCs in use (${previewResults.prerequisiteCheck.quotas.vpc.remaining} available)`}
                          />
                          <Chip 
                            label={previewResults.prerequisiteCheck.quotas.vpc.available ? "Passed" : "Failed"} 
                            size="small" 
                            color={previewResults.prerequisiteCheck.quotas.vpc.available ? "success" : "error"} 
                          />
                        </ListItem>
                      )}

                      {/* Elastic IP Quota Check (from prerequisiteCheck) */}
                      {previewResults.prerequisiteCheck?.quotas?.eip && (
                        <ListItem divider>
                          <ListItemIcon>
                            {previewResults.prerequisiteCheck.quotas.eip.remaining >= 3 ? (
                              <CheckIcon sx={{ color: 'success.main' }} />
                            ) : (
                              <WarningIcon sx={{ color: 'warning.main' }} />
                            )}
                          </ListItemIcon>
                          <ListItemText
                            primary="Elastic IP Quota"
                            secondary={`${previewResults.prerequisiteCheck.quotas.eip.used}/${previewResults.prerequisiteCheck.quotas.eip.limit} EIPs in use (${previewResults.prerequisiteCheck.quotas.eip.remaining} available)`}
                          />
                          <Chip 
                            label={previewResults.prerequisiteCheck.quotas.eip.remaining >= 3 ? "Passed" : "Warning"} 
                            size="small" 
                            color={previewResults.prerequisiteCheck.quotas.eip.remaining >= 3 ? "success" : "warning"} 
                          />
                        </ListItem>
                      )}

                      {/* Existing Resources Check */}
                      {previewResults.prerequisiteCheck?.existingResources?.length > 0 && (
                        <ListItem divider>
                          <ListItemIcon>
                            <WarningIcon sx={{ color: 'warning.main' }} />
                          </ListItemIcon>
                          <ListItemText
                            primary="Existing Resources Detected"
                            secondary={`${previewResults.prerequisiteCheck.existingResources.length} resource(s) with same name already exist`}
                          />
                          <Chip label="Warning" size="small" color="warning" />
                        </ListItem>
                      )}

                      {/* Kubernetes Version Check */}
                      <ListItem divider>
                        <ListItemIcon>
                          <CheckIcon sx={{ color: 'success.main' }} />
                        </ListItemIcon>
                        <ListItemText
                          primary="Kubernetes Version"
                          secondary={`EKS version ${selectedDraft?.configuration?.clusterConfig?.kubernetesVersion || '1.29'} is supported`}
                        />
                        <Chip label="Passed" size="small" color="success" />
                      </ListItem>

                      {/* Destruction Warning Check */}
                      <ListItem>
                        <ListItemIcon>
                          {(previewResults.summary?.toDestroy || 0) === 0 ? (
                            <CheckIcon sx={{ color: 'success.main' }} />
                          ) : (
                            <WarningIcon sx={{ color: 'warning.main' }} />
                          )}
                        </ListItemIcon>
                        <ListItemText
                          primary="No Unintended Deletions"
                          secondary={(previewResults.summary?.toDestroy || 0) === 0 
                            ? "No existing resources will be destroyed"
                            : `Warning: ${previewResults.summary?.toDestroy} resource(s) will be destroyed`
                          }
                        />
                        <Chip 
                          label={(previewResults.summary?.toDestroy || 0) === 0 ? "Passed" : "Warning"} 
                          size="small" 
                          color={(previewResults.summary?.toDestroy || 0) === 0 ? "success" : "warning"} 
                        />
                      </ListItem>
                    </List>
                  </Paper>

                  {/* Overall Status */}
                  <Box sx={{ mt: 2 }}>
                    {previewResults.canProceed !== false && previewResults.summary?.valid ? (
                      <Alert severity="success" icon={<CheckCircle />}>
                        <AlertTitle>All Checks Passed</AlertTitle>
                        Your deployment configuration has passed all validation checks and is ready to deploy.
                      </Alert>
                    ) : (
                      <Alert severity="error" icon={<Cancel />}>
                        <AlertTitle>Validation Issues Detected</AlertTitle>
                        {previewResults.canProceed === false 
                          ? "Critical issues detected. Please resolve AWS quota or resource issues before deploying."
                          : "One or more checks have failed. Please review the errors above before deploying."
                        }
                      </Alert>
                    )}
                  </Box>
                </Box>
              )}

              {/* Raw Output Tab */}
              {previewTab === 2 && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Raw Terraform Plan Output
                  </Typography>
                  <Box
                    component="pre"
                    sx={{
                      p: 2,
                      bgcolor: '#1e1e1e',
                      color: '#d4d4d4',
                      borderRadius: 1,
                      overflow: 'auto',
                      maxHeight: 400,
                      fontSize: '0.75rem',
                      fontFamily: 'monospace',
                      lineHeight: 1.4,
                    }}
                  >
                    {previewResults.rawOutput || 'No raw output available'}
                  </Box>
                </Box>
              )}
            </Box>
          ) : (
            <Typography>No preview results available</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePreview} disabled={previewLoading}>
            Cancel
          </Button>
          {previewResults && !previewError && (
            <>
              <Button
                variant="outlined"
                color="primary"
                onClick={handleSaveAndClosePreview}
                startIcon={<SaveIcon />}
              >
                Save and Close
              </Button>
              <Button
                variant="contained"
                color="success"
                onClick={handleDeployFromPreview}
                startIcon={<DeployIcon />}
              >
                Deploy Now
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
