import React, { useState } from 'react';
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
  Collapse,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CloudIcon from '@mui/icons-material/Cloud';
import LockIcon from '@mui/icons-material/Lock';
import SpeedIcon from '@mui/icons-material/Speed';
import HistoryIcon from '@mui/icons-material/History';
import SecurityIcon from '@mui/icons-material/Security';
import InfoIcon from '@mui/icons-material/Info';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useWizard } from '../../WizardContext';

// Provider-aware storage terminology and options
const STORAGE_CONFIG = {
  aws: {
    serviceName: 'S3 Object Storage',
    bucketLabel: 'S3 Bucket',
    bucketLabelPlural: 'S3 buckets',
    addLabel: 'Add S3 Bucket',
    description: 'Configure S3 buckets for application data, backups, and file storage',
    regionNote: 'S3 buckets',
    mountNote: 'To mount these S3 buckets in Kubernetes pods, you need to configure IAM permissions.',
  },
  azure: {
    serviceName: 'Blob Storage',
    bucketLabel: 'Blob Container',
    bucketLabelPlural: 'blob containers',
    addLabel: 'Add Blob Container',
    description: 'Configure Azure Blob containers for application data, backups, and file storage',
    regionNote: 'Blob containers',
    mountNote: 'To mount blob containers in Kubernetes pods, configure Azure Identity permissions.',
  },
  gcp: {
    serviceName: 'Cloud Storage',
    bucketLabel: 'GCS Bucket',
    bucketLabelPlural: 'GCS buckets',
    addLabel: 'Add GCS Bucket',
    description: 'Configure Cloud Storage buckets for application data, backups, and file storage',
    regionNote: 'GCS buckets',
    mountNote: 'To mount GCS buckets in Kubernetes pods, configure Workload Identity permissions.',
  },
  digitalocean: {
    serviceName: 'Spaces Object Storage',
    bucketLabel: 'Space',
    bucketLabelPlural: 'Spaces',
    addLabel: 'Add Space',
    description: 'Configure DigitalOcean Spaces for application data, backups, and file storage',
    regionNote: 'Spaces',
    mountNote: 'To mount Spaces in Kubernetes pods, configure S3-compatible access keys.',
  },
  linode: {
    serviceName: 'Object Storage',
    bucketLabel: 'Bucket',
    bucketLabelPlural: 'buckets',
    addLabel: 'Add Bucket',
    description: 'Configure Linode Object Storage buckets for application data, backups, and file storage',
    regionNote: 'Object Storage buckets',
    mountNote: 'To mount buckets in Kubernetes pods, configure S3-compatible access keys.',
  },
};

// Provider-aware encryption options
const ENCRYPTION_OPTIONS = {
  aws: [
    { value: 'AES256', label: 'SSE-S3 (AES-256)' },
    { value: 'aws:kms', label: 'SSE-KMS (AWS KMS)' },
    { value: 'none', label: 'No Encryption' },
  ],
  azure: [
    { value: 'AES256', label: 'Microsoft-managed keys' },
    { value: 'cmk', label: 'Customer-managed keys (Key Vault)' },
  ],
  gcp: [
    { value: 'AES256', label: 'Google-managed keys' },
    { value: 'cmek', label: 'Customer-managed keys (Cloud KMS)' },
  ],
  digitalocean: [
    { value: 'AES256', label: 'Server-side encryption (default)' },
  ],
  linode: [
    { value: 'AES256', label: 'Server-side encryption (default)' },
  ],
};

// S3 bucket templates for common use cases
const S3_TEMPLATES = [
  {
    id: 'app-assets',
    name: 'Application Assets',
    description: 'Static assets, uploads, and media files',
    icon: <CloudIcon />,
    defaults: {
      versioning: false,
      encryption: 'AES256',
      publicAccess: false,
      lifecycleRules: [],
      corsEnabled: true,
    },
  },
  {
    id: 'backups',
    name: 'Backups & Archives',
    description: 'Database backups, logs, and archival data',
    icon: <HistoryIcon />,
    defaults: {
      versioning: true,
      encryption: 'aws:kms',
      publicAccess: false,
      lifecycleRules: [
        { name: 'archive-old', transitionDays: 30, storageClass: 'GLACIER' },
        { name: 'expire-ancient', expirationDays: 365 },
      ],
      corsEnabled: false,
    },
  },
  {
    id: 'data-lake',
    name: 'Data Lake / Analytics',
    description: 'Large datasets for analytics and ML workloads',
    icon: <SpeedIcon />,
    defaults: {
      versioning: false,
      encryption: 'aws:kms',
      publicAccess: false,
      lifecycleRules: [
        { name: 'intelligent-tiering', transitionDays: 0, storageClass: 'INTELLIGENT_TIERING' },
      ],
      corsEnabled: false,
      accelerationEnabled: true,
    },
  },
  {
    id: 'secure-documents',
    name: 'Secure Documents',
    description: 'Sensitive files requiring strict access control',
    icon: <SecurityIcon />,
    defaults: {
      versioning: true,
      encryption: 'aws:kms',
      publicAccess: false,
      objectLock: true,
      lifecycleRules: [],
      corsEnabled: false,
    },
  },
];

// S3 Storage Class options
const STORAGE_CLASSES = [
  { value: 'STANDARD', label: 'Standard', description: 'Frequent access' },
  { value: 'INTELLIGENT_TIERING', label: 'Intelligent Tiering', description: 'Auto-optimized' },
  { value: 'STANDARD_IA', label: 'Standard-IA', description: 'Infrequent access' },
  { value: 'ONEZONE_IA', label: 'One Zone-IA', description: 'Single AZ, lower cost' },
  { value: 'GLACIER', label: 'Glacier', description: 'Archive (mins-hours retrieval)' },
  { value: 'GLACIER_IR', label: 'Glacier Instant', description: 'Archive (ms retrieval)' },
  { value: 'DEEP_ARCHIVE', label: 'Deep Archive', description: 'Long-term archive (12+ hrs)' },
];

function S3BucketDialog({ open, onClose, onSave, editingBucket, clusterName, region }) {
  const [formData, setFormData] = useState(editingBucket || {
    name: '',
    purpose: '',
    versioning: false,
    encryption: 'AES256',
    publicAccess: false,
    corsEnabled: false,
    accelerationEnabled: false,
    objectLock: false,
    lifecycleRules: [],
    tags: {},
    // PV/PVC Mount Configuration
    enableK8sMount: false,
    pvName: '',
    pvcName: '',
    mountNamespace: 'default',
    storageSize: '100Gi',
    accessMode: 'ReadWriteMany',
    reclaimPolicy: 'Retain',
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [newLifecycleRule, setNewLifecycleRule] = useState({
    name: '',
    transitionDays: 30,
    storageClass: 'GLACIER',
    expirationDays: null,
  });

  const handleChange = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTemplateSelect = (template) => {
    setFormData(prev => ({
      ...prev,
      ...template.defaults,
      purpose: template.id,
    }));
  };

  const handleAddLifecycleRule = () => {
    if (newLifecycleRule.name) {
      setFormData(prev => ({
        ...prev,
        lifecycleRules: [...prev.lifecycleRules, { ...newLifecycleRule }],
      }));
      setNewLifecycleRule({
        name: '',
        transitionDays: 30,
        storageClass: 'GLACIER',
        expirationDays: null,
      });
    }
  };

  const handleRemoveLifecycleRule = (index) => {
    setFormData(prev => ({
      ...prev,
      lifecycleRules: prev.lifecycleRules.filter((_, i) => i !== index),
    }));
  };

  const handleSave = () => {
    // Generate bucket name if not provided
    const bucketName = formData.name || 
      `${clusterName}-${formData.purpose || 'bucket'}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    
    onSave({
      ...formData,
      name: bucketName,
      region: region,
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {editingBucket ? `Edit ${storageTerms.bucketLabel} Configuration` : storageTerms.addLabel}
      </DialogTitle>
      <DialogContent>
        {/* Template Selection */}
        {!editingBucket && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Quick Start Templates
            </Typography>
            <Grid container spacing={2}>
              {S3_TEMPLATES.map((template) => (
                <Grid item xs={6} md={3} key={template.id}>
                  <Card
                    sx={{
                      cursor: 'pointer',
                      border: formData.purpose === template.id ? 2 : 1,
                      borderColor: formData.purpose === template.id ? 'primary.main' : 'divider',
                      '&:hover': { borderColor: 'primary.light' },
                    }}
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <CardContent sx={{ textAlign: 'center', py: 2 }}>
                      <Box sx={{ color: formData.purpose === template.id ? 'primary.main' : 'text.secondary' }}>
                        {template.icon}
                      </Box>
                      <Typography variant="body2" fontWeight="medium">
                        {template.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {template.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Bucket Name"
              value={formData.name}
              onChange={handleChange('name')}
              helperText={`Will be created as: ${formData.name || `${clusterName}-[purpose]-[timestamp]`}`}
              placeholder={`${clusterName}-assets`}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Encryption</InputLabel>
              <Select
                value={formData.encryption}
                onChange={handleChange('encryption')}
                label="Encryption"
              >
                <MenuItem value="AES256">SSE-S3 (AES-256)</MenuItem>
                <MenuItem value="aws:kms">SSE-KMS (AWS Managed Key)</MenuItem>
                <MenuItem value="aws:kms:custom">SSE-KMS (Custom Key)</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.versioning}
                    onChange={handleChange('versioning')}
                  />
                }
                label="Versioning"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.corsEnabled}
                    onChange={handleChange('corsEnabled')}
                  />
                }
                label="CORS"
              />
            </Box>
          </Grid>

          {/* Advanced Options */}
          <Grid item xs={12}>
            <Button
              onClick={() => setShowAdvanced(!showAdvanced)}
              endIcon={showAdvanced ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              sx={{ mb: 1 }}
            >
              Advanced Options
            </Button>
            <Collapse in={showAdvanced}>
              <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.accelerationEnabled}
                          onChange={handleChange('accelerationEnabled')}
                        />
                      }
                      label="Transfer Acceleration"
                    />
                    <Typography variant="caption" display="block" color="text.secondary">
                      Faster uploads from distant locations (additional cost)
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.objectLock}
                          onChange={handleChange('objectLock')}
                        />
                      }
                      label="Object Lock (WORM)"
                    />
                    <Typography variant="caption" display="block" color="text.secondary">
                      Prevent object deletion (compliance)
                    </Typography>
                  </Grid>

                  {/* Lifecycle Rules */}
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom>
                      Lifecycle Rules
                    </Typography>
                    {formData.lifecycleRules.length > 0 && (
                      <Table size="small" sx={{ mb: 2 }}>
                        <TableHead>
                          <TableRow>
                            <TableCell>Rule Name</TableCell>
                            <TableCell>Transition</TableCell>
                            <TableCell>Expiration</TableCell>
                            <TableCell width={50}></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {formData.lifecycleRules.map((rule, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{rule.name}</TableCell>
                              <TableCell>
                                {rule.transitionDays && rule.storageClass
                                  ? `${rule.transitionDays}d → ${rule.storageClass}`
                                  : '-'}
                              </TableCell>
                              <TableCell>
                                {rule.expirationDays ? `${rule.expirationDays}d` : '-'}
                              </TableCell>
                              <TableCell>
                                <IconButton size="small" onClick={() => handleRemoveLifecycleRule(idx)}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                      <TextField
                        size="small"
                        label="Rule Name"
                        value={newLifecycleRule.name}
                        onChange={(e) => setNewLifecycleRule(prev => ({ ...prev, name: e.target.value }))}
                      />
                      <TextField
                        size="small"
                        type="number"
                        label="Days"
                        value={newLifecycleRule.transitionDays}
                        onChange={(e) => setNewLifecycleRule(prev => ({ ...prev, transitionDays: parseInt(e.target.value) }))}
                        sx={{ width: 80 }}
                      />
                      <FormControl size="small" sx={{ minWidth: 150 }}>
                        <InputLabel>Storage Class</InputLabel>
                        <Select
                          value={newLifecycleRule.storageClass}
                          onChange={(e) => setNewLifecycleRule(prev => ({ ...prev, storageClass: e.target.value }))}
                          label="Storage Class"
                        >
                          {STORAGE_CLASSES.map((sc) => (
                            <MenuItem key={sc.value} value={sc.value}>{sc.label}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <Button variant="outlined" size="small" onClick={handleAddLifecycleRule}>
                        Add
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            </Collapse>
          </Grid>

          {/* Kubernetes Mount Configuration */}
          <Grid item xs={12}>
            <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 2, mt: 1 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.enableK8sMount}
                    onChange={handleChange('enableK8sMount')}
                  />
                }
                label={
                  <Box>
                    <Typography variant="subtitle2">Enable Kubernetes Mount (PV/PVC)</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Create PersistentVolume and PersistentVolumeClaim to mount this bucket in pods
                    </Typography>
                  </Box>
                }
              />
            </Box>
            
            <Collapse in={formData.enableK8sMount}>
              <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
                <Typography variant="body2">
                  <strong>Requires:</strong> Mountpoint for S3 CSI Driver must be installed with IRSA configured.
                </Typography>
              </Alert>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="PersistentVolume Name"
                    value={formData.pvName}
                    onChange={handleChange('pvName')}
                    placeholder={`${formData.name || clusterName}-pv`}
                    helperText="Name for the PV resource"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="PersistentVolumeClaim Name"
                    value={formData.pvcName}
                    onChange={handleChange('pvcName')}
                    placeholder={`${formData.name || clusterName}-pvc`}
                    helperText="Name for the PVC resource"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Namespace"
                    value={formData.mountNamespace}
                    onChange={handleChange('mountNamespace')}
                    helperText="Kubernetes namespace for PVC"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Storage Size"
                    value={formData.storageSize}
                    onChange={handleChange('storageSize')}
                    helperText="e.g., 100Gi (nominal for S3)"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Access Mode</InputLabel>
                    <Select
                      value={formData.accessMode}
                      onChange={handleChange('accessMode')}
                      label="Access Mode"
                    >
                      <MenuItem value="ReadWriteMany">ReadWriteMany (RWX)</MenuItem>
                      <MenuItem value="ReadOnlyMany">ReadOnlyMany (ROX)</MenuItem>
                      <MenuItem value="ReadWriteOnce">ReadWriteOnce (RWO)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Reclaim Policy</InputLabel>
                    <Select
                      value={formData.reclaimPolicy}
                      onChange={handleChange('reclaimPolicy')}
                      label="Reclaim Policy"
                    >
                      <MenuItem value="Retain">Retain (keep bucket on PV delete)</MenuItem>
                      <MenuItem value="Delete">Delete (remove bucket on PV delete)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Collapse>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave}>
          {editingBucket ? 'Update' : 'Add Bucket'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function S3Storage() {
  const { state, updateStorageConfig } = useWizard();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBucket, setEditingBucket] = useState(null);

  const cloudProvider = state.selectedCredential?.cloudProvider || 'aws';
  const storageTerms = STORAGE_CONFIG[cloudProvider] || STORAGE_CONFIG.aws;
  const encryptionOptions = ENCRYPTION_OPTIONS[cloudProvider] || ENCRYPTION_OPTIONS.aws;

  const s3Buckets = state.storageConfig?.s3Buckets || [];
  const clusterName = state.clusterConfig?.clusterName || 'cluster';
  const region = state.clusterConfig?.region || 'us-east-1';

  const handleAddBucket = () => {
    setEditingBucket(null);
    setDialogOpen(true);
  };

  const handleEditBucket = (bucket) => {
    setEditingBucket(bucket);
    setDialogOpen(true);
  };

  const handleDeleteBucket = (bucketName) => {
    updateStorageConfig({
      s3Buckets: s3Buckets.filter(b => b.name !== bucketName),
    });
  };

  const handleSaveBucket = (bucketData) => {
    if (editingBucket) {
      updateStorageConfig({
        s3Buckets: s3Buckets.map(b => b.name === editingBucket.name ? bucketData : b),
      });
    } else {
      updateStorageConfig({
        s3Buckets: [...s3Buckets, bucketData],
      });
    }
  };

  const getTemplateInfo = (purpose) => {
    return S3_TEMPLATES.find(t => t.id === purpose);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h6">{storageTerms.serviceName}</Typography>
          <Typography variant="body2" color="text.secondary">
            {storageTerms.description}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddBucket}
        >
          {storageTerms.addLabel}
        </Button>
      </Box>

      {s3Buckets.length === 0 ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            No {storageTerms.bucketLabelPlural} configured. Add {storageTerms.bucketLabelPlural} for object storage needs like application assets, 
            backups, or data lakes.
          </Typography>
        </Alert>
      ) : (
        <Box>
          {s3Buckets.map((bucket) => {
            const template = getTemplateInfo(bucket.purpose);
            return (
              <Card key={bucket.name} sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 2,
                          backgroundColor: 'primary.light',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'primary.main',
                        }}
                      >
                        {template?.icon || <CloudIcon />}
                      </Box>
                      <Box>
                        <Typography variant="h6">{bucket.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {template?.name || 'Custom Bucket'} • {bucket.region}
                        </Typography>
                        <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          <Chip
                            size="small"
                            icon={<LockIcon />}
                            label={bucket.encryption === 'aws:kms' ? 'KMS Encrypted' : 'SSE-S3'}
                            variant="outlined"
                          />
                          {bucket.versioning && (
                            <Chip size="small" label="Versioning" variant="outlined" color="primary" />
                          )}
                          {bucket.corsEnabled && (
                            <Chip size="small" label="CORS" variant="outlined" />
                          )}
                          {bucket.accelerationEnabled && (
                            <Chip size="small" label="Accelerated" variant="outlined" color="secondary" />
                          )}
                          {bucket.objectLock && (
                            <Chip size="small" label="Object Lock" variant="outlined" color="warning" />
                          )}
                          {bucket.lifecycleRules?.length > 0 && (
                            <Chip
                              size="small"
                              label={`${bucket.lifecycleRules.length} Lifecycle Rules`}
                              variant="outlined"
                            />
                          )}
                          {bucket.enableK8sMount && (
                            <Chip
                              size="small"
                              label={`PV/PVC: ${bucket.pvcName || bucket.name + '-pvc'}`}
                              variant="outlined"
                              color="success"
                            />
                          )}
                        </Box>
                      </Box>
                    </Box>
                    <Box>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => handleEditBucket(bucket)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => handleDeleteBucket(bucket.name)}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}

      {/* Feature Info */}
      <Alert severity="info" icon={<InfoIcon />} sx={{ mt: 2 }}>
        <Typography variant="body2">
          <strong>{storageTerms.regionNote}</strong> will be created in the same region as your cluster ({region}). 
          Use lifecycle rules to automatically transition data to cheaper storage classes or expire old objects.
        </Typography>
      </Alert>

      {/* S3 CSI Driver IAM Configuration - show when buckets are configured */}
      {s3Buckets.length > 0 && (
        <Card sx={{ mt: 3, bgcolor: 'warning.light', border: 1, borderColor: 'warning.main' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              S3 CSI Driver IAM Configuration
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              To mount these S3 buckets in Kubernetes pods, you need to configure IAM permissions. 
              The following policy will be generated for Terraform to create:
            </Typography>
            
            <Typography variant="subtitle2" gutterBottom>Generated IAM Policy:</Typography>
            <Box
              component="pre"
              sx={{
                p: 2,
                bgcolor: 'grey.900',
                color: 'grey.100',
                borderRadius: 1,
                overflow: 'auto',
                fontSize: '0.75rem',
                maxHeight: 300,
              }}
            >
{`{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": [
${s3Buckets.map(b => `        "arn:aws:s3:::${b.name}",\n        "arn:aws:s3:::${b.name}/*"`).join(',\n')}
      ]
    }
  ]
}`}
            </Box>

            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Required:</strong> The Mountpoint for S3 CSI Driver must be installed with IRSA 
                (IAM Role for Service Account) configured. See the CSI Drivers section for setup instructions.
              </Typography>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* PV/PVC Configuration - show when any bucket has K8s mount enabled */}
      {s3Buckets.some(b => b.enableK8sMount) && (
        <Card sx={{ mt: 3, bgcolor: 'success.light', border: 1, borderColor: 'success.main' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Generated Kubernetes Manifests (PV/PVC)
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              The following PersistentVolume and PersistentVolumeClaim manifests will be created for S3-mounted buckets:
            </Typography>
            
            {s3Buckets.filter(b => b.enableK8sMount).map((bucket) => {
              const pvName = bucket.pvName || `${bucket.name}-pv`;
              const pvcName = bucket.pvcName || `${bucket.name}-pvc`;
              const namespace = bucket.mountNamespace || 'default';
              const storageSize = bucket.storageSize || '100Gi';
              const accessMode = bucket.accessMode || 'ReadWriteMany';
              const reclaimPolicy = bucket.reclaimPolicy || 'Retain';
              
              return (
                <Box key={bucket.name} sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" gutterBottom sx={{ color: 'success.dark' }}>
                    {bucket.name}
                  </Typography>
                  
                  <Typography variant="caption" display="block" gutterBottom>PersistentVolume:</Typography>
                  <Box
                    component="pre"
                    sx={{
                      p: 2,
                      bgcolor: 'grey.900',
                      color: 'grey.100',
                      borderRadius: 1,
                      overflow: 'auto',
                      fontSize: '0.7rem',
                      maxHeight: 200,
                      mb: 2,
                    }}
                  >
{`apiVersion: v1
kind: PersistentVolume
metadata:
  name: ${pvName}
spec:
  capacity:
    storage: ${storageSize}
  accessModes:
    - ${accessMode}
  persistentVolumeReclaimPolicy: ${reclaimPolicy}
  csi:
    driver: s3.csi.aws.com
    volumeHandle: ${pvName}
    volumeAttributes:
      bucketName: ${bucket.name}`}
                  </Box>
                  
                  <Typography variant="caption" display="block" gutterBottom>PersistentVolumeClaim:</Typography>
                  <Box
                    component="pre"
                    sx={{
                      p: 2,
                      bgcolor: 'grey.900',
                      color: 'grey.100',
                      borderRadius: 1,
                      overflow: 'auto',
                      fontSize: '0.7rem',
                      maxHeight: 200,
                      mb: 2,
                    }}
                  >
{`apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: ${pvcName}
  namespace: ${namespace}
spec:
  accessModes:
    - ${accessMode}
  storageClassName: ""
  resources:
    requests:
      storage: ${storageSize}
  volumeName: ${pvName}`}
                  </Box>
                  
                  <Typography variant="caption" display="block" gutterBottom>Example Pod Volume Mount:</Typography>
                  <Box
                    component="pre"
                    sx={{
                      p: 2,
                      bgcolor: 'grey.900',
                      color: 'grey.100',
                      borderRadius: 1,
                      overflow: 'auto',
                      fontSize: '0.7rem',
                      maxHeight: 200,
                    }}
                  >
{`# Add to your Deployment spec.template.spec:
volumes:
- name: s3-storage
  persistentVolumeClaim:
    claimName: ${pvcName}

# Add to containers[].volumeMounts:
volumeMounts:
- name: s3-storage
  mountPath: /mnt/s3/${bucket.name.replace(/[^a-z0-9]/gi, '-')}`}
                  </Box>
                </Box>
              );
            })}

            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Validation commands:</strong>
              </Typography>
              <Box component="pre" sx={{ mt: 1, fontSize: '0.75rem', bgcolor: 'transparent' }}>
{`kubectl get pv,pvc -n default
kubectl exec -it <pod-name> -- ls /mnt/s3/
aws s3 ls s3://<bucket-name>`}
              </Box>
            </Alert>
          </CardContent>
        </Card>
      )}

      <S3BucketDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSaveBucket}
        editingBucket={editingBucket}
        clusterName={clusterName}
        region={region}
      />
    </Box>
  );
}
