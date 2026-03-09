import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Tooltip,
  Snackbar,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useWizard } from '../../WizardContext';
import { useStorage } from '../../hooks';

// Cloud-specific storage class configurations
const getStorageClassConfig = (cloudProvider) => {
  const configs = {
    aws: {
      provisioners: [
        { value: 'ebs.csi.aws.com', label: 'AWS EBS CSI', type: 'block' },
        { value: 'efs.csi.aws.com', label: 'AWS EFS CSI', type: 'file' },
      ],
      volumeTypes: [
        { value: 'gp3', label: 'gp3 (General Purpose SSD)' },
        { value: 'gp2', label: 'gp2 (Legacy General Purpose)' },
        { value: 'io2', label: 'io2 (Provisioned IOPS SSD)' },
        { value: 'io1', label: 'io1 (Legacy Provisioned IOPS)' },
        { value: 'st1', label: 'st1 (Throughput Optimized HDD)' },
        { value: 'sc1', label: 'sc1 (Cold HDD)' },
      ],
      defaultVolumeType: 'gp3',
      iopsRange: { min: 3000, max: 64000 },
      throughputRange: { min: 125, max: 1000 },
      templates: [
        {
          name: 'gp3-default',
          provisioner: 'ebs.csi.aws.com',
          volumeType: 'gp3',
          iops: 3000,
          throughput: 125,
          encrypted: true,
          reclaimPolicy: 'Delete',
          allowVolumeExpansion: true,
          default: true,
          description: 'General purpose SSD with 3000 IOPS baseline',
        },
        {
          name: 'gp3-high-iops',
          provisioner: 'ebs.csi.aws.com',
          volumeType: 'gp3',
          iops: 16000,
          throughput: 1000,
          encrypted: true,
          reclaimPolicy: 'Delete',
          allowVolumeExpansion: true,
          description: 'High performance SSD for databases',
        },
        {
          name: 'io2-extreme',
          provisioner: 'ebs.csi.aws.com',
          volumeType: 'io2',
          iops: 64000,
          encrypted: true,
          reclaimPolicy: 'Retain',
          allowVolumeExpansion: true,
          description: 'Extreme performance for critical workloads',
        },
        {
          name: 'efs-shared',
          provisioner: 'efs.csi.aws.com',
          performanceMode: 'generalPurpose',
          throughputMode: 'bursting',
          encrypted: true,
          reclaimPolicy: 'Delete',
          description: 'Shared file storage for ReadWriteMany',
        },
      ],
    },
    azure: {
      provisioners: [
        { value: 'disk.csi.azure.com', label: 'Azure Disk CSI', type: 'block' },
        { value: 'file.csi.azure.com', label: 'Azure Files CSI', type: 'file' },
      ],
      volumeTypes: [
        { value: 'Premium_LRS', label: 'Premium SSD (LRS)' },
        { value: 'Premium_ZRS', label: 'Premium SSD (ZRS)' },
        { value: 'StandardSSD_LRS', label: 'Standard SSD (LRS)' },
        { value: 'StandardSSD_ZRS', label: 'Standard SSD (ZRS)' },
        { value: 'Standard_LRS', label: 'Standard HDD (LRS)' },
        { value: 'UltraSSD_LRS', label: 'Ultra SSD (LRS)' },
      ],
      defaultVolumeType: 'Premium_LRS',
      iopsRange: { min: 120, max: 160000 },
      throughputRange: { min: 25, max: 2000 },
      templates: [
        {
          name: 'azure-premium-default',
          provisioner: 'disk.csi.azure.com',
          volumeType: 'Premium_LRS',
          encrypted: true,
          reclaimPolicy: 'Delete',
          allowVolumeExpansion: true,
          default: true,
          description: 'Premium SSD with locally redundant storage',
        },
        {
          name: 'azure-premium-zrs',
          provisioner: 'disk.csi.azure.com',
          volumeType: 'Premium_ZRS',
          encrypted: true,
          reclaimPolicy: 'Delete',
          allowVolumeExpansion: true,
          description: 'Premium SSD with zone-redundant storage',
        },
        {
          name: 'azure-ultra-high-iops',
          provisioner: 'disk.csi.azure.com',
          volumeType: 'UltraSSD_LRS',
          iops: 64000,
          throughput: 1000,
          encrypted: true,
          reclaimPolicy: 'Retain',
          allowVolumeExpansion: true,
          description: 'Ultra SSD for I/O-intensive workloads',
        },
        {
          name: 'azure-files-shared',
          provisioner: 'file.csi.azure.com',
          skuName: 'Premium_LRS',
          encrypted: true,
          reclaimPolicy: 'Delete',
          description: 'Azure Files share for ReadWriteMany',
        },
      ],
    },
    gcp: {
      provisioners: [
        { value: 'pd.csi.storage.gke.io', label: 'GCP Persistent Disk CSI', type: 'block' },
        { value: 'filestore.csi.storage.gke.io', label: 'GCP Filestore CSI', type: 'file' },
      ],
      volumeTypes: [
        { value: 'pd-ssd', label: 'SSD Persistent Disk' },
        { value: 'pd-balanced', label: 'Balanced Persistent Disk' },
        { value: 'pd-standard', label: 'Standard Persistent Disk' },
        { value: 'pd-extreme', label: 'Extreme Persistent Disk' },
      ],
      defaultVolumeType: 'pd-ssd',
      iopsRange: { min: 100, max: 120000 },
      throughputRange: { min: 100, max: 2400 },
      templates: [
        {
          name: 'gcp-ssd-default',
          provisioner: 'pd.csi.storage.gke.io',
          volumeType: 'pd-ssd',
          encrypted: true,
          reclaimPolicy: 'Delete',
          allowVolumeExpansion: true,
          default: true,
          description: 'SSD persistent disk for general workloads',
        },
        {
          name: 'gcp-balanced',
          provisioner: 'pd.csi.storage.gke.io',
          volumeType: 'pd-balanced',
          encrypted: true,
          reclaimPolicy: 'Delete',
          allowVolumeExpansion: true,
          description: 'Balanced performance and cost',
        },
        {
          name: 'gcp-extreme-high-iops',
          provisioner: 'pd.csi.storage.gke.io',
          volumeType: 'pd-extreme',
          iops: 100000,
          encrypted: true,
          reclaimPolicy: 'Retain',
          allowVolumeExpansion: true,
          description: 'Extreme performance for critical databases',
        },
        {
          name: 'gcp-filestore-shared',
          provisioner: 'filestore.csi.storage.gke.io',
          tier: 'BASIC_HDD',
          encrypted: true,
          reclaimPolicy: 'Delete',
          description: 'Filestore share for ReadWriteMany',
        },
      ],
    },
    digitalocean: {
      provisioners: [
        { value: 'dobs.csi.digitalocean.com', label: 'DigitalOcean Block Storage CSI', type: 'block' },
      ],
      volumeTypes: [
        { value: 'ssd', label: 'SSD Block Storage' },
      ],
      defaultVolumeType: 'ssd',
      iopsRange: { min: 5000, max: 7500 },
      throughputRange: { min: 200, max: 300 },
      templates: [
        {
          name: 'do-block-default',
          provisioner: 'dobs.csi.digitalocean.com',
          volumeType: 'ssd',
          encrypted: true,
          reclaimPolicy: 'Delete',
          allowVolumeExpansion: true,
          default: true,
          description: 'SSD-based block storage volumes',
        },
        {
          name: 'do-block-retain',
          provisioner: 'dobs.csi.digitalocean.com',
          volumeType: 'ssd',
          encrypted: true,
          reclaimPolicy: 'Retain',
          allowVolumeExpansion: true,
          description: 'Block storage with Retain policy for databases',
        },
      ],
    },
    linode: {
      provisioners: [
        { value: 'linodebs.csi.linode.com', label: 'Linode Block Storage CSI', type: 'block' },
      ],
      volumeTypes: [
        { value: 'nvme', label: 'NVMe Block Storage' },
      ],
      defaultVolumeType: 'nvme',
      iopsRange: { min: 8000, max: 10000 },
      throughputRange: { min: 350, max: 500 },
      templates: [
        {
          name: 'linode-block-default',
          provisioner: 'linodebs.csi.linode.com',
          volumeType: 'nvme',
          encrypted: true,
          reclaimPolicy: 'Delete',
          allowVolumeExpansion: true,
          default: true,
          description: 'NVMe-based block storage volumes',
        },
        {
          name: 'linode-block-retain',
          provisioner: 'linodebs.csi.linode.com',
          volumeType: 'nvme',
          encrypted: true,
          reclaimPolicy: 'Retain',
          allowVolumeExpansion: true,
          description: 'Block storage with Retain policy for databases',
        },
      ],
    },
  };
  return configs[cloudProvider] || configs.aws;
};

function StorageClassDialog({ open, onClose, onSave, editingClass, cloudProvider }) {
  const config = useMemo(() => getStorageClassConfig(cloudProvider), [cloudProvider]);
  const defaultProvisioner = config.provisioners[0]?.value || '';
  
  const [formData, setFormData] = useState(editingClass || {
    name: '',
    provisioner: defaultProvisioner,
    volumeType: config.defaultVolumeType,
    iops: config.iopsRange.min,
    throughput: config.throughputRange.min,
    encrypted: true,
    reclaimPolicy: 'Delete',
    allowVolumeExpansion: true,
    default: false,
  });

  // Update form data when cloud provider changes
  useEffect(() => {
    if (!editingClass) {
      setFormData(prev => ({
        ...prev,
        provisioner: config.provisioners[0]?.value || '',
        volumeType: config.defaultVolumeType,
        iops: config.iopsRange.min,
        throughput: config.throughputRange.min,
      }));
    }
  }, [cloudProvider, config, editingClass]);

  const handleChange = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  const selectedProvisioner = config.provisioners.find(p => p.value === formData.provisioner);
  const isBlockStorage = selectedProvisioner?.type === 'block';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {editingClass ? 'Edit Storage Class' : 'Create Storage Class'}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Storage Class Name"
              value={formData.name}
              onChange={handleChange('name')}
              helperText="Lowercase, alphanumeric, hyphens only"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Provisioner</InputLabel>
              <Select
                value={formData.provisioner}
                onChange={handleChange('provisioner')}
                label="Provisioner"
              >
                {config.provisioners.map(p => (
                  <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {isBlockStorage && (
            <>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Volume Type</InputLabel>
                  <Select
                    value={formData.volumeType}
                    onChange={handleChange('volumeType')}
                    label="Volume Type"
                  >
                    {config.volumeTypes.map(vt => (
                      <MenuItem key={vt.value} value={vt.value}>{vt.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  type="number"
                  label="IOPS"
                  value={formData.iops}
                  onChange={handleChange('iops')}
                  inputProps={{ min: config.iopsRange.min, max: config.iopsRange.max }}
                  helperText={`${config.iopsRange.min}-${config.iopsRange.max}`}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  type="number"
                  label="Throughput (MB/s)"
                  value={formData.throughput}
                  onChange={handleChange('throughput')}
                  inputProps={{ min: config.throughputRange.min, max: config.throughputRange.max }}
                  helperText={`${config.throughputRange.min}-${config.throughputRange.max}`}
                />
              </Grid>
            </>
          )}

          {!isBlockStorage && (
            <>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Performance Mode</InputLabel>
                  <Select
                    value={formData.performanceMode || 'generalPurpose'}
                    onChange={handleChange('performanceMode')}
                    label="Performance Mode"
                  >
                    <MenuItem value="generalPurpose">General Purpose</MenuItem>
                    <MenuItem value="maxIO">Max I/O</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Throughput Mode</InputLabel>
                  <Select
                    value={formData.throughputMode || 'bursting'}
                    onChange={handleChange('throughputMode')}
                    label="Throughput Mode"
                  >
                    <MenuItem value="bursting">Bursting</MenuItem>
                    <MenuItem value="provisioned">Provisioned</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </>
          )}

          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Reclaim Policy</InputLabel>
              <Select
                value={formData.reclaimPolicy}
                onChange={handleChange('reclaimPolicy')}
                label="Reclaim Policy"
              >
                <MenuItem value="Delete">Delete (remove volume when PVC deleted)</MenuItem>
                <MenuItem value="Retain">Retain (keep volume for manual cleanup)</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.encrypted}
                    onChange={handleChange('encrypted')}
                  />
                }
                label="Enable Encryption"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.allowVolumeExpansion}
                    onChange={handleChange('allowVolumeExpansion')}
                  />
                }
                label="Allow Volume Expansion"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.default}
                    onChange={handleChange('default')}
                  />
                }
                label="Set as Default Storage Class"
              />
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={!formData.name}>
          {editingClass ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function StorageClasses() {
  const { state, updateStorageConfig } = useWizard();
  const { 
    storageClasses: existingClasses, 
    fetchStorageClasses, 
    loading 
  } = useStorage();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [notification, setNotification] = useState({ open: false, message: '' });

  // Get cloud provider from selected credential
  const cloudProvider = state.selectedCredential?.cloudProvider || 'aws';
  
  // Get cloud-specific storage class configuration
  const storageConfig = useMemo(() => getStorageClassConfig(cloudProvider), [cloudProvider]);
  const STORAGE_CLASS_TEMPLATES = storageConfig.templates;

  const storageClasses = state.storageConfig?.storageClasses || [];

  // Load existing storage classes on mount
  useEffect(() => {
    fetchStorageClasses().catch(() => {
      setNotification({ open: true, message: 'Using local storage class templates' });
    });
  }, [fetchStorageClasses]);

  const handleAddFromTemplate = (template) => {
    const newClass = { ...template, id: Date.now() };
    updateStorageConfig({
      storageClasses: [...storageClasses, newClass],
    });
  };

  const handleSaveClass = (classData) => {
    if (editingClass) {
      const updated = storageClasses.map(sc =>
        sc.id === editingClass.id ? { ...classData, id: sc.id } : sc
      );
      updateStorageConfig({ storageClasses: updated });
    } else {
      updateStorageConfig({
        storageClasses: [...storageClasses, { ...classData, id: Date.now() }],
      });
    }
    setEditingClass(null);
  };

  const handleDelete = (id) => {
    updateStorageConfig({
      storageClasses: storageClasses.filter(sc => sc.id !== id),
    });
  };

  const handleEdit = (storageClass) => {
    setEditingClass(storageClass);
    setDialogOpen(true);
  };

  return (
    <Box>
      {/* Templates */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Quick Start Templates
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Add pre-configured storage classes for common use cases
          </Typography>
          <Grid container spacing={2}>
            {STORAGE_CLASS_TEMPLATES.map((template) => (
              <Grid item xs={12} sm={6} md={3} key={template.name}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent sx={{ pb: 1 }}>
                    <Typography variant="subtitle2">{template.name}</Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                      {template.description}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                      <Chip label={template.volumeType || 'EFS'} size="small" />
                      {template.iops && <Chip label={`${template.iops} IOPS`} size="small" variant="outlined" />}
                      {template.encrypted && <Chip label="Encrypted" size="small" color="success" />}
                    </Box>
                    <Button
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => handleAddFromTemplate(template)}
                      disabled={storageClasses.some(sc => sc.name === template.name)}
                    >
                      Add
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Configured Storage Classes */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="h6">Configured Storage Classes</Typography>
              <Typography variant="body2" color="text.secondary">
                Storage classes that will be created in your cluster
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => { setEditingClass(null); setDialogOpen(true); }}
            >
              Custom Class
            </Button>
          </Box>

          {storageClasses.length === 0 ? (
            <Alert severity="info">
              No storage classes configured. Add from templates above or create a custom one.
            </Alert>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Provisioner</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Reclaim</TableCell>
                  <TableCell>Features</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {storageClasses.map((sc) => (
                  <TableRow key={sc.id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {sc.name}
                        {sc.default && <Chip label="Default" size="small" color="primary" />}
                      </Box>
                    </TableCell>
                    <TableCell>{sc.provisioner}</TableCell>
                    <TableCell>{sc.volumeType || 'EFS'}</TableCell>
                    <TableCell>{sc.reclaimPolicy}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {sc.encrypted && <Chip label="Encrypted" size="small" />}
                        {sc.allowVolumeExpansion && <Chip label="Expandable" size="small" />}
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => handleEdit(sc)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => handleDelete(sc.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <StorageClassDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingClass(null); }}
        onSave={handleSaveClass}
        editingClass={editingClass}
        cloudProvider={cloudProvider}
      />

      {/* Existing Classes from Cluster */}
      {existingClasses.length > 0 && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography variant="h6">Existing Cluster Storage Classes</Typography>
                <Typography variant="body2" color="text.secondary">
                  Storage classes already configured in your cluster
                </Typography>
              </Box>
              <IconButton 
                onClick={() => fetchStorageClasses()} 
                disabled={loading.storageClasses}
                size="small"
              >
                {loading.storageClasses ? <CircularProgress size={20} /> : <RefreshIcon />}
              </IconButton>
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Provisioner</TableCell>
                  <TableCell>Reclaim</TableCell>
                  <TableCell>Features</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {existingClasses.map((sc, index) => (
                  <TableRow key={sc.name || index}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {sc.name || sc.metadata?.name}
                        {sc.isDefault && <Chip label="Default" size="small" color="primary" />}
                      </Box>
                    </TableCell>
                    <TableCell>{sc.provisioner}</TableCell>
                    <TableCell>{sc.reclaimPolicy}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {sc.allowVolumeExpansion && <Chip label="Expandable" size="small" />}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Notification */}
      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={() => setNotification({ ...notification, open: false })}
        message={notification.message}
      />
    </Box>
  );
}
