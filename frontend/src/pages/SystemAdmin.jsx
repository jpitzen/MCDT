import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  Chip,
  IconButton,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as ActiveIcon,
  Block as InactiveIcon,
  Business as AdIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import api from '../services/api';
import CloudProviderInfo from '../components/CloudProviderInfo';
import ThemeCustomizer from '../components/ThemeCustomizer';
import AdConfigManager from '../components/admin/AdConfigManager';

const SystemAdmin = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Cleanup state
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [deployments, setDeployments] = useState([]);
  const [drafts, setDrafts] = useState([]);

  // User form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'viewer',
    isActive: true
  });

  // User filter state
  const [authProviderFilter, setAuthProviderFilter] = useState('all');

  useEffect(() => {
    fetchUsers();
    if (activeTab === 2) {
      fetchDeploymentsAndDrafts();
    }
  }, [activeTab]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/users');
      setUsers(response.data.data.users || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        password: '',
        role: user.role,
        isActive: user.isActive
      });
    } else {
      setEditingUser(null);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        role: 'viewer',
        isActive: true
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingUser(null);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      role: 'viewer',
      isActive: true
    });
  };

  const handleSaveUser = async () => {
    try {
      setError(null);
      setSuccess(null);

      if (editingUser) {
        // Update existing user
        const updateData = { ...formData };
        if (!updateData.password) {
          delete updateData.password; // Don't update password if not provided
        }
        await api.put(`/users/${editingUser.id}`, updateData);
        setSuccess('User updated successfully');
      } else {
        // Create new user
        await api.post('/auth/register', formData);
        setSuccess('User created successfully');
      }

      handleCloseDialog();
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save user');
    }
  };

  const handleDeleteClick = (user) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;

    try {
      setError(null);
      setSuccess(null);
      await api.delete(`/users/${userToDelete.id}`);
      setSuccess('User deleted successfully');
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete user');
      setDeleteDialogOpen(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setUserToDelete(null);
  };

  const getRoleBadge = (role) => {
    const roleColors = {
      admin: 'error',
      operator: 'warning',
      viewer: 'info'
    };
    return <Chip label={role.toUpperCase()} color={roleColors[role] || 'default'} size="small" />;
  };

  const fetchDeploymentsAndDrafts = async () => {
    try {
      setCleanupLoading(true);
      const [deploymentsRes, draftsRes] = await Promise.all([
        api.get('/deployments'),
        api.get('/deployment-drafts')
      ]);
      setDeployments(deploymentsRes.data.data?.deployments || []);
      setDrafts(draftsRes.data.data?.drafts || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load cleanup data');
    } finally {
      setCleanupLoading(false);
    }
  };

  const handleCleanupAllDeployments = async () => {
    if (!window.confirm('⚠️ WARNING: This will delete ALL deployment records! Continue?')) return;
    
    try {
      setCleanupLoading(true);
      await api.post('/admin/cleanup/deployments', { option: 'all' });
      setSuccess('All deployments deleted successfully');
      fetchDeploymentsAndDrafts();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to cleanup deployments');
    } finally {
      setCleanupLoading(false);
    }
  };

  const handleCleanupFailedDeployments = async () => {
    try {
      setCleanupLoading(true);
      await api.post('/admin/cleanup/deployments', { option: 'failed' });
      setSuccess('Failed deployments deleted successfully');
      fetchDeploymentsAndDrafts();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to cleanup deployments');
    } finally {
      setCleanupLoading(false);
    }
  };

  const handleCleanupOldDeployments = async () => {
    try {
      setCleanupLoading(true);
      await api.post('/admin/cleanup/deployments', { option: 'old', days: 30 });
      setSuccess('Old deployments deleted successfully');
      fetchDeploymentsAndDrafts();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to cleanup deployments');
    } finally {
      setCleanupLoading(false);
    }
  };

  const handleCleanupAllDrafts = async () => {
    if (!window.confirm('Delete all deployment drafts?')) return;
    
    try {
      setCleanupLoading(true);
      await api.post('/admin/cleanup/drafts');
      setSuccess('All drafts deleted successfully');
      fetchDeploymentsAndDrafts();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to cleanup drafts');
    } finally {
      setCleanupLoading(false);
    }
  };

  const handleDeleteDeployment = async (deploymentId) => {
    if (!window.confirm('Delete this deployment?')) return;
    
    try {
      setCleanupLoading(true);
      await api.delete(`/deployments/${deploymentId}`);
      setSuccess('Deployment deleted successfully');
      fetchDeploymentsAndDrafts();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete deployment');
    } finally {
      setCleanupLoading(false);
    }
  };

  const renderCleanup = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Database Cleanup
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Clean up deployment records and drafts from the database
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 4 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              color="error"
              onClick={handleCleanupAllDeployments}
              disabled={cleanupLoading}
            >
              Delete All Deployments
            </Button>
            <Button
              variant="outlined"
              color="warning"
              onClick={handleCleanupFailedDeployments}
              disabled={cleanupLoading}
            >
              Delete Failed Deployments
            </Button>
            <Button
              variant="outlined"
              onClick={handleCleanupOldDeployments}
              disabled={cleanupLoading}
            >
              Delete Old Deployments (&gt;30 days)
            </Button>
            <Button
              variant="outlined"
              color="warning"
              onClick={handleCleanupAllDrafts}
              disabled={cleanupLoading}
            >
              Delete All Drafts
            </Button>
          </Box>
        </Box>

        {cleanupLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              Deployments ({deployments.length})
            </Typography>
            {deployments.length === 0 ? (
              <Typography color="text.secondary">No deployments found</Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)' }}>
                      <TableCell>Cluster Name</TableCell>
                      <TableCell>Provider</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Progress</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {deployments.map((deployment) => (
                      <TableRow key={deployment.id} hover>
                        <TableCell>{deployment.clusterName}</TableCell>
                        <TableCell>{deployment.cloudProvider}</TableCell>
                        <TableCell>
                          <Chip 
                            label={deployment.status} 
                            color={deployment.status === 'failed' ? 'error' : deployment.status === 'completed' ? 'success' : 'default'} 
                            size="small" 
                          />
                        </TableCell>
                        <TableCell>{deployment.progress}%</TableCell>
                        <TableCell>{new Date(deployment.createdAt).toLocaleString()}</TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteDeployment(deployment.id)}
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
              Drafts ({drafts.length})
            </Typography>
            {drafts.length === 0 ? (
              <Typography color="text.secondary">No drafts found</Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)' }}>
                      <TableCell>Name</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Created</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {drafts.map((draft) => (
                      <TableRow key={draft.id} hover>
                        <TableCell>{draft.name}</TableCell>
                        <TableCell>
                          <Chip label={draft.status} size="small" />
                        </TableCell>
                        <TableCell>{new Date(draft.createdAt).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );


  const renderUserManagement = () => {
    const filteredUsers = authProviderFilter === 'all'
      ? users
      : users.filter((u) => (u.authProvider || 'local') === authProviderFilter);

    return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h6">User Management</Typography>
            <Typography variant="body2" color="text.secondary">
              Manage system users and their permissions
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField
              select
              size="small"
              value={authProviderFilter}
              onChange={(e) => setAuthProviderFilter(e.target.value)}
              sx={{ minWidth: 120 }}
            >
              <MenuItem value="all">All Users</MenuItem>
              <MenuItem value="local">Local Only</MenuItem>
              <MenuItem value="ad">AD Only</MenuItem>
            </TextField>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              Add User
            </Button>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : filteredUsers.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">No users found</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)' }}>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Auth Provider</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Last Login</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredUsers.map((user) => {
                  const isAdUser = user.authProvider && user.authProvider !== 'local';
                  return (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {user.firstName} {user.lastName}
                      </Typography>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {isAdUser ? (
                        <Chip icon={<AdIcon />} label="AD" size="small" color="secondary" variant="outlined" />
                      ) : (
                        <Chip icon={<PersonIcon />} label="Local" size="small" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell>
                      {getRoleBadge(user.role)}
                      {isAdUser && (
                        <Typography variant="caption" display="block" color="text.secondary">
                          via AD group
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.isActive ? (
                        <Chip icon={<ActiveIcon />} label="Active" color="success" size="small" />
                      ) : (
                        <Chip icon={<InactiveIcon />} label="Inactive" color="default" size="small" />
                      )}
                    </TableCell>
                    <TableCell>
                      {user.lastLogin
                        ? new Date(user.lastLogin).toLocaleDateString()
                        : 'Never'}
                      {isAdUser && user.lastAdSync && (
                        <Typography variant="caption" display="block" color="text.secondary">
                          AD sync: {new Date(user.lastAdSync).toLocaleDateString()}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(user)}
                        color="primary"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteClick(user)}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
    );
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 4 }}>
        System Admin
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="User Management" />
          <Tab label="Cloud Providers" />
          <Tab label="Cleanup" />
          <Tab label="Appearance" />
          <Tab label="AD / LDAP" icon={<AdIcon />} iconPosition="start" />
        </Tabs>
      </Box>

      <Box sx={{ mt: 3 }}>
        {activeTab === 0 && renderUserManagement()}
        {activeTab === 1 && <CloudProviderInfo />}
        {activeTab === 2 && renderCleanup()}
        {activeTab === 3 && <ThemeCustomizer />}
        {activeTab === 4 && <AdConfigManager />}
      </Box>

      {/* User Form Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingUser ? 'Edit User' : 'Add New User'}
          {editingUser?.authProvider && editingUser.authProvider !== 'local' && (
            <Chip icon={<AdIcon />} label="AD User" size="small" color="secondary" variant="outlined" sx={{ ml: 1 }} />
          )}
        </DialogTitle>
        <DialogContent>
          {editingUser?.authProvider && editingUser.authProvider !== 'local' && (
            <Alert severity="info" sx={{ mb: 2 }}>
              This user authenticates via Active Directory. Password and role are managed externally.
            </Alert>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              fullWidth
              label="First Name"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label="Last Name"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              disabled={!!editingUser}
            />
            <TextField
              fullWidth
              label={editingUser ? 'New Password (leave blank to keep current)' : 'Password'}
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required={!editingUser}
              disabled={editingUser?.authProvider && editingUser.authProvider !== 'local'}
              helperText={editingUser?.authProvider && editingUser.authProvider !== 'local' ? 'Password managed by Active Directory' : undefined}
            />
            <TextField
              fullWidth
              select
              label="Role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              disabled={editingUser?.authProvider && editingUser.authProvider !== 'local'}
              helperText={editingUser?.authProvider && editingUser.authProvider !== 'local' ? 'Role determined by AD group mappings' : undefined}
            >
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="approver">Approver</MenuItem>
              <MenuItem value="operator">Operator</MenuItem>
              <MenuItem value="viewer">Viewer</MenuItem>
            </TextField>
            <TextField
              fullWidth
              select
              label="Status"
              value={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'true' })}
            >
              <MenuItem value={true}>Active</MenuItem>
              <MenuItem value={false}>Inactive</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSaveUser}
            variant="contained"
            disabled={!formData.firstName || !formData.lastName || !formData.email || (!editingUser && !formData.password)}
          >
            {editingUser ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleCancelDelete}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete user "{userToDelete?.firstName} {userToDelete?.lastName}"?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SystemAdmin;
