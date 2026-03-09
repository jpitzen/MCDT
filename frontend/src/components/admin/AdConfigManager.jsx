import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
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
  Switch,
  FormControlLabel,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  Snackbar,
  Paper,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as ActiveIcon,
  Block as InactiveIcon,
  PlayArrow as TestIcon,
  Sync as SyncIcon,
  ExpandMore as ExpandMoreIcon,
  Visibility as ViewIcon,
  VisibilityOff as HideIcon,
  PowerSettingsNew as ActivateIcon,
} from '@mui/icons-material';
import api from '../../services/api';
import AdGroupBrowser from './AdGroupBrowser';

// ─── Default form values ───────────────────────────────────────────
const defaultConfig = {
  name: '',
  serverUrl: '',
  port: 389,
  useSsl: false,
  connectionTimeout: 5000,
  baseDn: '',
  bindDn: '',
  bindPassword: '',
  userSearchFilter: '(sAMAccountName={{username}})',
  userSearchBase: '',
  groupSearchFilter: '(objectClass=group)',
  groupSearchBase: '',
  emailAttribute: 'mail',
  displayNameAttribute: 'displayName',
  firstNameAttribute: 'givenName',
  lastNameAttribute: 'sn',
  groupAttribute: 'memberOf',
  uniqueIdAttribute: 'objectGUID',
  autoCreateUsers: true,
  defaultRole: 'viewer',
  syncIntervalMinutes: 60,
};

const defaultMapping = {
  adGroupDn: '',
  adGroupName: '',
  role: 'viewer',
  priority: 50,
  isActive: true,
};

// ─── Main Component ────────────────────────────────────────────────
const AdConfigManager = () => {
  // -- Configs state
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // -- Config editor dialog
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [configForm, setConfigForm] = useState({ ...defaultConfig });
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  // -- Role mappings
  const [selectedConfigId, setSelectedConfigId] = useState(null);
  const [mappings, setMappings] = useState([]);
  const [mappingsLoading, setMappingsLoading] = useState(false);
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState(null);
  const [mappingForm, setMappingForm] = useState({ ...defaultMapping });

  // -- Test role resolution
  const [testResolveOpen, setTestResolveOpen] = useState(false);
  const [testUsername, setTestUsername] = useState('');
  const [resolveResult, setResolveResult] = useState(null);
  const [resolving, setResolving] = useState(false);

  // -- User sync
  const [syncStatus, setSyncStatus] = useState(null);
  const [syncing, setSyncing] = useState(false);

  // ── Fetch configs ────────────────────────────────────────────────
  const fetchConfigs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.adConfig.list();
      setConfigs(res.data?.data?.configs || res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load AD configurations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConfigs(); }, [fetchConfigs]);

  // ── Fetch mappings for a config ──────────────────────────────────
  const fetchMappings = useCallback(async (configId) => {
    if (!configId) return;
    try {
      setMappingsLoading(true);
      const res = await api.adConfig.listMappings(configId);
      setMappings(res.data?.data?.mappings || res.data?.data || []);
    } catch (err) {
      showSnack('Failed to load role mappings', 'error');
    } finally {
      setMappingsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedConfigId) {
      fetchMappings(selectedConfigId);
      fetchSyncStatus(selectedConfigId);
    }
  }, [selectedConfigId, fetchMappings]);

  // ── Fetch sync status ────────────────────────────────────────────
  const fetchSyncStatus = async (configId) => {
    try {
      const res = await api.adConfig.getSyncStatus(configId);
      setSyncStatus(res.data?.data || null);
    } catch {
      setSyncStatus(null);
    }
  };

  // ── Helpers ──────────────────────────────────────────────────────
  const showSnack = (message, severity = 'success') =>
    setSnackbar({ open: true, message, severity });

  const closeSnack = () => setSnackbar((s) => ({ ...s, open: false }));

  // ── Config CRUD ──────────────────────────────────────────────────
  const openConfigEditor = (config = null) => {
    if (config) {
      setEditingConfig(config);
      setConfigForm({
        name: config.name || '',
        serverUrl: config.serverUrl || '',
        port: config.port || 389,
        useSsl: config.useSsl ?? false,
        connectionTimeout: config.connectionTimeout || 5000,
        baseDn: config.baseDn || '',
        bindDn: config.bindDn || '',
        bindPassword: '',
        userSearchFilter: config.userSearchFilter || defaultConfig.userSearchFilter,
        userSearchBase: config.userSearchBase || '',
        groupSearchFilter: config.groupSearchFilter || defaultConfig.groupSearchFilter,
        groupSearchBase: config.groupSearchBase || '',
        emailAttribute: config.emailAttribute || defaultConfig.emailAttribute,
        displayNameAttribute: config.displayNameAttribute || defaultConfig.displayNameAttribute,
        firstNameAttribute: config.firstNameAttribute || defaultConfig.firstNameAttribute,
        lastNameAttribute: config.lastNameAttribute || defaultConfig.lastNameAttribute,
        groupAttribute: config.groupAttribute || defaultConfig.groupAttribute,
        uniqueIdAttribute: config.uniqueIdAttribute || defaultConfig.uniqueIdAttribute,
        autoCreateUsers: config.autoCreateUsers ?? true,
        defaultRole: config.defaultRole || 'viewer',
        syncIntervalMinutes: config.syncIntervalMinutes || 60,
      });
    } else {
      setEditingConfig(null);
      setConfigForm({ ...defaultConfig });
    }
    setTestResult(null);
    setShowPassword(false);
    setEditorOpen(true);
  };

  const closeConfigEditor = () => {
    setEditorOpen(false);
    setEditingConfig(null);
    setConfigForm({ ...defaultConfig });
    setTestResult(null);
  };

  const handleSaveConfig = async () => {
    try {
      setSaving(true);
      const payload = { ...configForm };
      if (editingConfig && !payload.bindPassword) {
        delete payload.bindPassword; // keep existing password
      }
      if (editingConfig) {
        await api.adConfig.update(editingConfig.id, payload);
        showSnack('Configuration updated');
      } else {
        await api.adConfig.create(payload);
        showSnack('Configuration created');
      }
      closeConfigEditor();
      fetchConfigs();
    } catch (err) {
      showSnack(err.response?.data?.error || 'Failed to save configuration', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfig = async (id) => {
    if (!window.confirm('Delete this AD configuration? This cannot be undone.')) return;
    try {
      await api.adConfig.delete(id);
      showSnack('Configuration deleted');
      if (selectedConfigId === id) setSelectedConfigId(null);
      fetchConfigs();
    } catch (err) {
      showSnack(err.response?.data?.error || 'Failed to delete configuration', 'error');
    }
  };

  const handleActivate = async (id) => {
    try {
      await api.adConfig.activate(id);
      showSnack('Configuration activated');
      fetchConfigs();
    } catch (err) {
      showSnack(err.response?.data?.error || 'Failed to activate', 'error');
    }
  };

  const handleDeactivate = async (id) => {
    try {
      await api.adConfig.deactivate(id);
      showSnack('Configuration deactivated');
      fetchConfigs();
    } catch (err) {
      showSnack(err.response?.data?.error || 'Failed to deactivate', 'error');
    }
  };

  // ── Test connection ──────────────────────────────────────────────
  const handleTestConnection = async (id) => {
    try {
      setTesting(true);
      setTestResult(null);
      const res = await api.adConfig.testConnection(id);
      setTestResult({ success: true, ...(res.data?.data || {}) });
      showSnack('Connection successful');
    } catch (err) {
      setTestResult({ success: false, error: err.response?.data?.error || 'Connection failed' });
      showSnack('Connection failed', 'error');
    } finally {
      setTesting(false);
    }
  };

  const handleTestAdHoc = async () => {
    try {
      setTesting(true);
      setTestResult(null);
      const res = await api.adConfig.testAdHocConnection(configForm);
      setTestResult({ success: true, ...(res.data?.data || {}) });
      showSnack('Connection successful');
    } catch (err) {
      setTestResult({ success: false, error: err.response?.data?.error || 'Connection failed' });
    } finally {
      setTesting(false);
    }
  };

  // ── Role Mapping CRUD ────────────────────────────────────────────
  const openMappingDialog = (mapping = null) => {
    if (mapping) {
      setEditingMapping(mapping);
      setMappingForm({
        adGroupDn: mapping.adGroupDn || '',
        adGroupName: mapping.adGroupName || '',
        role: mapping.role || 'viewer',
        priority: mapping.priority ?? 50,
        isActive: mapping.isActive ?? true,
      });
    } else {
      setEditingMapping(null);
      setMappingForm({ ...defaultMapping });
    }
    setMappingDialogOpen(true);
  };

  const closeMappingDialog = () => {
    setMappingDialogOpen(false);
    setEditingMapping(null);
    setMappingForm({ ...defaultMapping });
  };

  const handleSaveMapping = async () => {
    try {
      if (editingMapping) {
        await api.adConfig.updateMapping(selectedConfigId, editingMapping.id, mappingForm);
        showSnack('Mapping updated');
      } else {
        await api.adConfig.createMapping(selectedConfigId, mappingForm);
        showSnack('Mapping created');
      }
      closeMappingDialog();
      fetchMappings(selectedConfigId);
    } catch (err) {
      showSnack(err.response?.data?.error || 'Failed to save mapping', 'error');
    }
  };

  const handleDeleteMapping = async (id) => {
    if (!window.confirm('Delete this role mapping?')) return;
    try {
      await api.adConfig.deleteMapping(selectedConfigId, id);
      showSnack('Mapping deleted');
      fetchMappings(selectedConfigId);
    } catch (err) {
      showSnack(err.response?.data?.error || 'Failed to delete mapping', 'error');
    }
  };

  // ── Test role resolution ─────────────────────────────────────────
  const handleTestResolve = async () => {
    if (!testUsername) return;
    try {
      setResolving(true);
      setResolveResult(null);
      const res = await api.adConfig.testRoleResolution(selectedConfigId, { username: testUsername });
      setResolveResult(res.data?.data || res.data);
    } catch (err) {
      setResolveResult({ error: err.response?.data?.error || 'Resolution failed' });
    } finally {
      setResolving(false);
    }
  };

  // ── Sync ─────────────────────────────────────────────────────────
  const handleSync = async () => {
    if (!selectedConfigId) return;
    try {
      setSyncing(true);
      const res = await api.adConfig.syncUsers(selectedConfigId);
      setSyncStatus(res.data?.data || null);
      showSnack('User sync completed');
    } catch (err) {
      showSnack(err.response?.data?.error || 'Sync failed', 'error');
    } finally {
      setSyncing(false);
    }
  };

  // ── Group select handler for mapping form ────────────────────────
  const handleGroupSelect = (group) => {
    setMappingForm((f) => ({
      ...f,
      adGroupDn: group.dn,
      adGroupName: group.name || group.cn || '',
    }));
  };

  // ═════════════════════════════════════════════════════════════════
  //  R E N D E R
  // ═════════════════════════════════════════════════════════════════

  // -- Config list
  const renderConfigList = () => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h6">AD / LDAP Configurations</Typography>
            <Typography variant="body2" color="text.secondary">
              Manage Active Directory and LDAP server connections
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => openConfigEditor()}>
            New Configuration
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : configs.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 2 }}>
            No AD/LDAP configurations yet. Click "New Configuration" to get started.
          </Typography>
        ) : (
          configs.map((cfg) => (
            <Paper
              key={cfg.id}
              variant="outlined"
              sx={{
                p: 2,
                mb: 1,
                cursor: 'pointer',
                bgcolor: selectedConfigId === cfg.id ? 'action.selected' : undefined,
                '&:hover': { bgcolor: 'action.hover' },
              }}
              onClick={() => setSelectedConfigId(cfg.id)}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {cfg.name}
                    </Typography>
                    <Chip
                      icon={cfg.isActive ? <ActiveIcon /> : <InactiveIcon />}
                      label={cfg.isActive ? 'Active' : 'Inactive'}
                      color={cfg.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {cfg.serverUrl}{cfg.port ? `:${cfg.port}` : ''}
                    {cfg.lastTestedAt && (
                      <> · Last tested: {new Date(cfg.lastTestedAt).toLocaleString()}</>
                    )}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5 }} onClick={(e) => e.stopPropagation()}>
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={() => openConfigEditor(cfg)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Test Connection">
                    <IconButton size="small" onClick={() => handleTestConnection(cfg.id)} disabled={testing}>
                      <TestIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {cfg.isActive ? (
                    <Tooltip title="Deactivate">
                      <IconButton size="small" onClick={() => handleDeactivate(cfg.id)}>
                        <InactiveIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  ) : (
                    <Tooltip title="Activate">
                      <IconButton size="small" color="success" onClick={() => handleActivate(cfg.id)}>
                        <ActivateIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Delete">
                    <IconButton size="small" color="error" onClick={() => handleDeleteConfig(cfg.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </Paper>
          ))
        )}
      </CardContent>
    </Card>
  );

  // -- Role mappings section
  const renderRoleMappings = () => {
    if (!selectedConfigId) return null;
    const cfg = configs.find((c) => c.id === selectedConfigId);
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="h6">
                Group → Role Mappings
                {cfg && (
                  <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                    ({cfg.name})
                  </Typography>
                )}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Map AD groups to ZL-MCDT roles. Higher priority wins when user belongs to multiple groups.
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button size="small" variant="outlined" onClick={() => setTestResolveOpen(true)}>
                Test Resolution
              </Button>
              <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => openMappingDialog()}>
                Add Mapping
              </Button>
            </Box>
          </Box>

          {mappingsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : mappings.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 2 }}>
              No role mappings configured. AD users will receive the default role.
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>AD Group</TableCell>
                    <TableCell>ZL-MCDT Role</TableCell>
                    <TableCell align="center">Priority</TableCell>
                    <TableCell align="center">Active</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {mappings
                    .sort((a, b) => (b.priority || 0) - (a.priority || 0))
                    .map((m) => (
                      <TableRow key={m.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>
                            {m.adGroupName || '—'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 300, display: 'block' }}>
                            {m.adGroupDn}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={m.role?.toUpperCase()}
                            size="small"
                            color={
                              m.role === 'admin' ? 'error' :
                              m.role === 'operator' ? 'warning' :
                              m.role === 'approver' ? 'secondary' :
                              'info'
                            }
                          />
                        </TableCell>
                        <TableCell align="center">{m.priority}</TableCell>
                        <TableCell align="center">
                          {m.isActive ? (
                            <ActiveIcon color="success" fontSize="small" />
                          ) : (
                            <InactiveIcon color="disabled" fontSize="small" />
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <IconButton size="small" onClick={() => openMappingDialog(m)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => handleDeleteMapping(m.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    );
  };

  // -- User sync section
  const renderUserSync = () => {
    if (!selectedConfigId) return null;
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>User Synchronization</Typography>

          {syncStatus && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Last sync: {syncStatus.lastSyncAt ? new Date(syncStatus.lastSyncAt).toLocaleString() : 'Never'}
              {syncStatus.totalUsers != null && <> · {syncStatus.totalUsers} users</>}
              {syncStatus.newUsers != null && <>, {syncStatus.newUsers} new</>}
              {syncStatus.errors != null && <>, {syncStatus.errors} errors</>}
            </Typography>
          )}

          <Button
            variant="outlined"
            startIcon={syncing ? <CircularProgress size={16} /> : <SyncIcon />}
            disabled={syncing}
            onClick={handleSync}
          >
            {syncing ? 'Syncing…' : 'Sync Now'}
          </Button>

          {syncStatus?.syncIntervalMinutes && (
            <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
              Interval: Every {syncStatus.syncIntervalMinutes} minutes
            </Typography>
          )}
        </CardContent>
      </Card>
    );
  };

  // ═══ DIALOGS ═════════════════════════════════════════════════════

  // -- Config editor dialog
  const renderConfigDialog = () => (
    <Dialog open={editorOpen} onClose={closeConfigEditor} maxWidth="md" fullWidth scroll="paper">
      <DialogTitle>{editingConfig ? 'Edit Configuration' : 'New AD/LDAP Configuration'}</DialogTitle>
      <DialogContent dividers>
        {/* Connection */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight={600}>Connection</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth label="Configuration Name" required
                value={configForm.name}
                onChange={(e) => setConfigForm((f) => ({ ...f, name: e.target.value }))}
              />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  fullWidth label="Server URL" required placeholder="ldap://ad.corp.com"
                  value={configForm.serverUrl}
                  onChange={(e) => setConfigForm((f) => ({ ...f, serverUrl: e.target.value }))}
                />
                <TextField
                  label="Port" type="number" sx={{ width: 120 }}
                  value={configForm.port}
                  onChange={(e) => setConfigForm((f) => ({ ...f, port: parseInt(e.target.value, 10) || 389 }))}
                />
              </Box>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={configForm.useSsl}
                      onChange={(e) => setConfigForm((f) => ({ ...f, useSsl: e.target.checked }))}
                    />
                  }
                  label="Use SSL/TLS"
                />
                <TextField
                  label="Timeout (ms)" type="number" sx={{ width: 150 }}
                  value={configForm.connectionTimeout}
                  onChange={(e) => setConfigForm((f) => ({ ...f, connectionTimeout: parseInt(e.target.value, 10) || 5000 }))}
                />
              </Box>
              {!configForm.useSsl && (
                <Alert severity="warning" variant="outlined">
                  SSL/TLS is disabled. Credentials will be transmitted in plaintext. Enable SSL for production environments.
                </Alert>
              )}
              <TextField
                fullWidth label="Base DN" required placeholder="DC=corp,DC=com"
                value={configForm.baseDn}
                onChange={(e) => setConfigForm((f) => ({ ...f, baseDn: e.target.value }))}
              />
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Service Account */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight={600}>Service Account</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth label="Bind DN" placeholder="CN=svc-ldap,OU=Service Accounts,DC=corp,DC=com"
                value={configForm.bindDn}
                onChange={(e) => setConfigForm((f) => ({ ...f, bindDn: e.target.value }))}
              />
              <TextField
                fullWidth
                label={editingConfig ? 'Bind Password (leave blank to keep current)' : 'Bind Password'}
                type={showPassword ? 'text' : 'password'}
                value={configForm.bindPassword}
                onChange={(e) => setConfigForm((f) => ({ ...f, bindPassword: e.target.value }))}
                InputProps={{
                  endAdornment: (
                    <IconButton size="small" onClick={() => setShowPassword((p) => !p)}>
                      {showPassword ? <HideIcon fontSize="small" /> : <ViewIcon fontSize="small" />}
                    </IconButton>
                  ),
                }}
              />
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Search Settings */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight={600}>Search Settings</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth label="User Search Filter" placeholder="(sAMAccountName={{username}})"
                value={configForm.userSearchFilter}
                onChange={(e) => setConfigForm((f) => ({ ...f, userSearchFilter: e.target.value }))}
                helperText="Use {{username}} as placeholder for the login username"
              />
              <TextField
                fullWidth label="User Search Base" placeholder="OU=Users,DC=corp,DC=com"
                value={configForm.userSearchBase}
                onChange={(e) => setConfigForm((f) => ({ ...f, userSearchBase: e.target.value }))}
              />
              <TextField
                fullWidth label="Group Search Filter" placeholder="(objectClass=group)"
                value={configForm.groupSearchFilter}
                onChange={(e) => setConfigForm((f) => ({ ...f, groupSearchFilter: e.target.value }))}
              />
              <TextField
                fullWidth label="Group Search Base" placeholder="OU=Groups,DC=corp,DC=com"
                value={configForm.groupSearchBase}
                onChange={(e) => setConfigForm((f) => ({ ...f, groupSearchBase: e.target.value }))}
              />
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Attribute Mapping */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight={600}>Attribute Mapping</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField label="Email" value={configForm.emailAttribute}
                onChange={(e) => setConfigForm((f) => ({ ...f, emailAttribute: e.target.value }))} />
              <TextField label="Display Name" value={configForm.displayNameAttribute}
                onChange={(e) => setConfigForm((f) => ({ ...f, displayNameAttribute: e.target.value }))} />
              <TextField label="First Name" value={configForm.firstNameAttribute}
                onChange={(e) => setConfigForm((f) => ({ ...f, firstNameAttribute: e.target.value }))} />
              <TextField label="Last Name" value={configForm.lastNameAttribute}
                onChange={(e) => setConfigForm((f) => ({ ...f, lastNameAttribute: e.target.value }))} />
              <TextField label="Group Membership" value={configForm.groupAttribute}
                onChange={(e) => setConfigForm((f) => ({ ...f, groupAttribute: e.target.value }))} />
              <TextField label="Unique ID" value={configForm.uniqueIdAttribute}
                onChange={(e) => setConfigForm((f) => ({ ...f, uniqueIdAttribute: e.target.value }))} />
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Behavior */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight={600}>Behavior</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={configForm.autoCreateUsers}
                    onChange={(e) => setConfigForm((f) => ({ ...f, autoCreateUsers: e.target.checked }))}
                  />
                }
                label="Auto-create users on first AD login"
              />
              <TextField
                select fullWidth label="Default Role"
                value={configForm.defaultRole}
                onChange={(e) => setConfigForm((f) => ({ ...f, defaultRole: e.target.value }))}
                helperText="Assigned to new AD users when no group-role mapping matches"
              >
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="approver">Approver</MenuItem>
                <MenuItem value="operator">Operator</MenuItem>
                <MenuItem value="viewer">Viewer</MenuItem>
              </TextField>
              <TextField
                label="Sync Interval (minutes)" type="number" sx={{ width: 200 }}
                value={configForm.syncIntervalMinutes}
                onChange={(e) => setConfigForm((f) => ({ ...f, syncIntervalMinutes: parseInt(e.target.value, 10) || 60 }))}
              />
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Test result */}
        {testResult && (
          <Alert severity={testResult.success ? 'success' : 'error'} sx={{ mt: 2 }}>
            {testResult.success
              ? `Connection successful${testResult.latency ? ` (${testResult.latency}ms)` : ''}`
              : testResult.error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleTestAdHoc} disabled={testing || !configForm.serverUrl} startIcon={testing ? <CircularProgress size={16} /> : <TestIcon />}>
          Test Connection
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={closeConfigEditor}>Cancel</Button>
        <Button onClick={handleSaveConfig} variant="contained" disabled={saving || !configForm.name || !configForm.serverUrl || !configForm.baseDn}>
          {saving ? 'Saving…' : editingConfig ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  // -- Mapping editor dialog
  const renderMappingDialog = () => (
    <Dialog open={mappingDialogOpen} onClose={closeMappingDialog} maxWidth="sm" fullWidth>
      <DialogTitle>{editingMapping ? 'Edit Role Mapping' : 'Add Role Mapping'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Typography variant="subtitle2">Select AD Group</Typography>
          <AdGroupBrowser
            configId={selectedConfigId}
            selected={mappingForm.adGroupDn}
            onSelect={handleGroupSelect}
          />
          <TextField
            fullWidth label="Group DN" required
            value={mappingForm.adGroupDn}
            onChange={(e) => setMappingForm((f) => ({ ...f, adGroupDn: e.target.value }))}
            helperText="Selected from browser above or enter manually"
          />
          <TextField
            fullWidth label="Group Display Name"
            value={mappingForm.adGroupName}
            onChange={(e) => setMappingForm((f) => ({ ...f, adGroupName: e.target.value }))}
          />
          <TextField
            select fullWidth label="ZL-MCDT Role" required
            value={mappingForm.role}
            onChange={(e) => setMappingForm((f) => ({ ...f, role: e.target.value }))}
          >
            <MenuItem value="admin">Admin</MenuItem>
            <MenuItem value="approver">Approver</MenuItem>
            <MenuItem value="operator">Operator</MenuItem>
            <MenuItem value="viewer">Viewer</MenuItem>
          </TextField>
          <TextField
            label="Priority" type="number" fullWidth
            value={mappingForm.priority}
            onChange={(e) => setMappingForm((f) => ({ ...f, priority: parseInt(e.target.value, 10) || 0 }))}
            helperText="Higher priority wins when user belongs to multiple groups (0–1000)"
          />
          <FormControlLabel
            control={
              <Switch
                checked={mappingForm.isActive}
                onChange={(e) => setMappingForm((f) => ({ ...f, isActive: e.target.checked }))}
              />
            }
            label="Active"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={closeMappingDialog}>Cancel</Button>
        <Button onClick={handleSaveMapping} variant="contained" disabled={!mappingForm.adGroupDn || !mappingForm.role}>
          {editingMapping ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  // -- Test role resolution dialog
  const renderTestResolveDialog = () => (
    <Dialog open={testResolveOpen} onClose={() => { setTestResolveOpen(false); setResolveResult(null); }} maxWidth="sm" fullWidth>
      <DialogTitle>Test Role Resolution</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Enter an AD username to see which groups match and what role would be assigned.
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <TextField
            fullWidth label="AD Username" size="small"
            value={testUsername}
            onChange={(e) => setTestUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleTestResolve()}
          />
          <Button variant="contained" onClick={handleTestResolve} disabled={resolving || !testUsername}>
            {resolving ? <CircularProgress size={20} /> : 'Test'}
          </Button>
        </Box>

        {resolveResult && (
          <Box>
            {resolveResult.error ? (
              <Alert severity="error">{resolveResult.error}</Alert>
            ) : (
              <>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Resolved role: <strong>{resolveResult.resolvedRole || resolveResult.role || '—'}</strong>
                </Alert>

                {resolveResult.matchedGroups && resolveResult.matchedGroups.length > 0 && (
                  <>
                    <Typography variant="subtitle2" gutterBottom>Matched Groups</Typography>
                    {resolveResult.matchedGroups.map((g, i) => (
                      <Chip key={i} label={g.name || g.dn || g} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                    ))}
                  </>
                )}

                {resolveResult.matchedMappings && resolveResult.matchedMappings.length > 0 && (
                  <>
                    <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>Matched Mappings</Typography>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Group</TableCell>
                            <TableCell>Role</TableCell>
                            <TableCell>Priority</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {resolveResult.matchedMappings.map((m, i) => (
                            <TableRow key={i}>
                              <TableCell>{m.adGroupName || m.adGroupDn}</TableCell>
                              <TableCell>{m.role}</TableCell>
                              <TableCell>{m.priority}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </>
                )}
              </>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => { setTestResolveOpen(false); setResolveResult(null); }}>Close</Button>
      </DialogActions>
    </Dialog>
  );

  // ═══ MAIN RETURN ═════════════════════════════════════════════════
  return (
    <Box>
      {renderConfigList()}

      {selectedConfigId && (
        <>
          <Divider sx={{ my: 2 }} />
          {renderRoleMappings()}
          {renderUserSync()}
        </>
      )}

      {/* Dialogs */}
      {renderConfigDialog()}
      {renderMappingDialog()}
      {renderTestResolveDialog()}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={closeSnack}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={closeSnack} severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdConfigManager;
