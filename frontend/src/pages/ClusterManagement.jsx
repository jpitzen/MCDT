import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  OpenInFull as ScaleIcon,
  Visibility as VisibilityIcon,
  CloudQueue as CloudIcon,
  Upgrade as UpgradeIcon,
  ListAlt as NodesIcon
} from '@mui/icons-material';
import api from '../services/api';

export default function ClusterManagement() {
  const navigate = useNavigate();
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scaleDialogOpen, setScaleDialogOpen] = useState(false);
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [nodesDialogOpen, setNodesDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [newNodeCount, setNewNodeCount] = useState(3);
  const [newK8sVersion, setNewK8sVersion] = useState('');
  const [clusterNodes, setClusterNodes] = useState([]);

  useEffect(() => {
    fetchClusters();
  }, []);

  const fetchClusters = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/clusters');
      setClusters(response.data.clusters || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      console.error('Failed to fetch clusters:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleScale = async () => {
    if (!selectedCluster) return;

    try {
      await api.clusters.scale(selectedCluster.clusterId, {
        nodeCount: newNodeCount
      });
      setScaleDialogOpen(false);
      setSelectedCluster(null);
      fetchClusters();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to scale cluster');
    }
  };

  const handleUpgrade = async () => {
    if (!selectedCluster) return;

    try {
      await api.clusters.upgrade(selectedCluster.clusterId, {
        kubernetesVersion: newK8sVersion
      });
      setUpgradeDialogOpen(false);
      setSelectedCluster(null);
      setNewK8sVersion('');
      fetchClusters();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upgrade cluster');
    }
  };

  const handleViewNodes = async (cluster) => {
    try {
      setSelectedCluster(cluster);
      const response = await api.clusters.getNodes(cluster.clusterId);
      setClusterNodes(response.data.nodes || []);
      setNodesDialogOpen(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch cluster nodes');
    }
  };

  const handleDelete = async () => {
    if (!selectedCluster) return;

    try {
      await api.delete(`/clusters/${selectedCluster.clusterId}`);
      setDeleteDialogOpen(false);
      setSelectedCluster(null);
      fetchClusters();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete cluster');
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
      case 'COMPLETED':
        return 'success';
      case 'UPDATING':
      case 'IN_PROGRESS':
        return 'info';
      case 'FAILED':
      case 'DELETING':
        return 'error';
      case 'PENDING':
        return 'warning';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4">Kubernetes Clusters</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Manage your deployed Kubernetes clusters across all cloud providers
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchClusters} color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            onClick={() => navigate('/wizard-multicloud')}
          >
            Deploy New Cluster
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          {clusters.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary" gutterBottom>
                No clusters deployed yet.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Deploy your first Kubernetes cluster to get started.
              </Typography>
              <Button
                variant="contained"
                onClick={() => navigate('/wizard-multicloud')}
              >
                Deploy Cluster
              </Button>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)' }}>
                    <TableCell>Cluster Name</TableCell>
                    <TableCell>Provider</TableCell>
                    <TableCell>Region</TableCell>
                    <TableCell>K8s Version</TableCell>
                    <TableCell>Nodes</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {clusters.map((cluster) => (
                    <TableRow key={cluster.clusterId} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {cluster.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CloudIcon fontSize="small" />
                          <Typography variant="body2">
                            {cluster.cloudProvider?.toUpperCase()}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{cluster.region}</TableCell>
                      <TableCell>{cluster.kubernetesVersion}</TableCell>
                      <TableCell>
                        <Chip
                          label={`${cluster.totalNodes} nodes`}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={cluster.status}
                          color={getStatusColor(cluster.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(cluster.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/deployment/${cluster.clusterId}`)}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="View Nodes">
                          <IconButton
                            size="small"
                            onClick={() => handleViewNodes(cluster)}
                          >
                            <NodesIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Scale Cluster">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedCluster(cluster);
                              setNewNodeCount(cluster.totalNodes);
                              setScaleDialogOpen(true);
                            }}
                          >
                            <ScaleIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Upgrade Kubernetes">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedCluster(cluster);
                              setNewK8sVersion(cluster.kubernetesVersion);
                              setUpgradeDialogOpen(true);
                            }}
                          >
                            <UpgradeIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Cluster">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              setSelectedCluster(cluster);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Scale Dialog */}
      <Dialog open={scaleDialogOpen} onClose={() => setScaleDialogOpen(false)}>
        <DialogTitle>Scale Cluster</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography gutterBottom>
              Cluster: <strong>{selectedCluster?.name}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Current nodes: {selectedCluster?.totalNodes}
            </Typography>
            <TextField
              fullWidth
              label="New Node Count"
              type="number"
              value={newNodeCount}
              onChange={(e) => setNewNodeCount(parseInt(e.target.value))}
              inputProps={{ min: 1, max: 100 }}
              sx={{ mt: 2 }}
            />
            <Alert severity="info" sx={{ mt: 2 }}>
              Scaling will take several minutes to complete. The cluster will remain available during the operation.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScaleDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleScale} variant="contained">
            Scale Cluster
          </Button>
        </DialogActions>
      </Dialog>

      {/* Upgrade Dialog */}
      <Dialog open={upgradeDialogOpen} onClose={() => setUpgradeDialogOpen(false)}>
        <DialogTitle>Upgrade Kubernetes Version</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography gutterBottom>
              Cluster: <strong>{selectedCluster?.name}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Current version: {selectedCluster?.kubernetesVersion}
            </Typography>
            <TextField
              fullWidth
              label="New Kubernetes Version"
              value={newK8sVersion}
              onChange={(e) => setNewK8sVersion(e.target.value)}
              placeholder="e.g., 1.28"
              sx={{ mt: 2 }}
              helperText="Enter the target Kubernetes version"
            />
            <Alert severity="warning" sx={{ mt: 2 }}>
              Upgrading Kubernetes version may cause temporary service disruption. 
              Ensure your applications are compatible with the new version.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUpgradeDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleUpgrade} variant="contained" color="warning">
            Upgrade
          </Button>
        </DialogActions>
      </Dialog>

      {/* Nodes Dialog */}
      <Dialog 
        open={nodesDialogOpen} 
        onClose={() => setNodesDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Cluster Nodes - {selectedCluster?.name}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {clusterNodes.length === 0 ? (
              <Typography color="text.secondary">No nodes found</Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Node Name</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Instance Type</TableCell>
                      <TableCell>CPU</TableCell>
                      <TableCell>Memory</TableCell>
                      <TableCell>Age</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {clusterNodes.map((node, index) => (
                      <TableRow key={index}>
                        <TableCell>{node.name}</TableCell>
                        <TableCell>
                          <Chip 
                            label={node.status} 
                            color={node.status === 'Ready' ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{node.instanceType}</TableCell>
                        <TableCell>{node.cpu}</TableCell>
                        <TableCell>{node.memory}</TableCell>
                        <TableCell>{node.age}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNodesDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete cluster <strong>{selectedCluster?.name}</strong>?
          </Typography>
          <Alert severity="error" sx={{ mt: 2 }}>
            This action cannot be undone. All resources in the cluster will be permanently deleted.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete Cluster
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
