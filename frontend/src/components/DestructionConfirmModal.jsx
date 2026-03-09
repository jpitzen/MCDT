import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  TextField,
  Box,
  Alert,
  AlertTitle,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Divider,
  Chip,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import CloudIcon from '@mui/icons-material/Cloud';
import StorageIcon from '@mui/icons-material/Storage';
import DnsIcon from '@mui/icons-material/Dns';
import SecurityIcon from '@mui/icons-material/Security';
import FolderIcon from '@mui/icons-material/Folder';
import DataObjectIcon from '@mui/icons-material/DataObject';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';

/**
 * DestructionConfirmModal
 * A modal requiring the user to type the deployment name to confirm destruction.
 * 
 * Props:
 * - open: boolean - Whether the modal is open
 * - deployment: object - The deployment to destroy (requires id, clusterName, cloudProvider, status)
 * - onClose: function - Called when modal is closed
 * - onConfirm: function - Called when user confirms (receives deployment)
 * - onRequestDestruction: function - Called to initiate destruction request
 * - onExecuteDestruction: function - Called to execute terraform destroy
 * - destructionStatus: 'idle' | 'requesting' | 'confirming' | 'executing' | 'completed' | 'error'
 * - error: string - Error message if any
 */
export default function DestructionConfirmModal({
  open,
  deployment,
  onClose,
  onConfirm,
  onRequestDestruction,
  onExecuteDestruction,
  destructionStatus = 'idle',
  error = null,
}) {
  const [confirmationName, setConfirmationName] = useState('');
  const [isConfirmed, setIsConfirmed] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!open) {
      setConfirmationName('');
      setIsConfirmed(false);
    }
  }, [open]);

  // Check if confirmation name matches
  const nameMatches = deployment && confirmationName === deployment.clusterName;

  // Handle confirmation
  const handleConfirm = () => {
    if (nameMatches && onConfirm) {
      setIsConfirmed(true);
      onConfirm(deployment, confirmationName);
    }
  };

  // Handle execute destruction
  const handleExecute = () => {
    if (onExecuteDestruction) {
      onExecuteDestruction(deployment);
    }
  };

  // Provider-specific resource names for destruction list
  const provider = deployment?.cloudProvider || 'aws';
  const providerResources = {
    aws: {
      cluster: 'EKS Cluster (all pods and services)',
      database: 'RDS Database (ALL DATA WILL BE LOST!)',
      fileStorage: 'EFS File Storage',
      objectStorage: 'S3 Buckets',
      registry: 'ECR Repositories',
      networking: 'Networking (VPC, Subnets, Security Groups)',
    },
    azure: {
      cluster: 'AKS Cluster (all pods and services)',
      database: 'Azure SQL Database (ALL DATA WILL BE LOST!)',
      fileStorage: 'Azure Files Storage',
      objectStorage: 'Azure Blob Containers',
      registry: 'ACR Repositories',
      networking: 'Networking (VNet, Subnets, NSGs)',
    },
    gcp: {
      cluster: 'GKE Cluster (all pods and services)',
      database: 'Cloud SQL Database (ALL DATA WILL BE LOST!)',
      fileStorage: 'Filestore Storage',
      objectStorage: 'GCS Buckets',
      registry: 'Artifact Registry Repositories',
      networking: 'Networking (VPC, Subnets, Firewall Rules)',
    },
    digitalocean: {
      cluster: 'DOKS Cluster (all pods and services)',
      database: 'Managed Database (ALL DATA WILL BE LOST!)',
      fileStorage: 'Block Storage Volumes',
      objectStorage: 'Spaces Buckets',
      registry: 'Container Registry Repositories',
      networking: 'Networking (VPC, Firewall Rules)',
    },
    linode: {
      cluster: 'LKE Cluster (all pods and services)',
      database: 'Managed Database (ALL DATA WILL BE LOST!)',
      fileStorage: 'Block Storage Volumes',
      objectStorage: 'Object Storage Buckets',
      registry: 'Container Registry Repositories',
      networking: 'Networking (VPC, Firewall Rules)',
    },
  };
  const res = providerResources[provider] || providerResources.aws;

  // Resources that will be destroyed
  const destructionItems = [
    { icon: <CloudIcon color="error" />, text: res.cluster, time: '15-20 min' },
    { icon: <StorageIcon color="error" />, text: res.database, time: '5-10 min' },
    { icon: <FolderIcon color="error" />, text: res.fileStorage, time: '2-3 min' },
    { icon: <DataObjectIcon color="error" />, text: res.objectStorage, time: '1-2 min' },
    { icon: <DnsIcon color="error" />, text: res.registry, time: '1-2 min' },
    { icon: <SecurityIcon color="error" />, text: res.networking, time: '3-5 min' },
  ];

  const isLoading = ['requesting', 'confirming', 'executing'].includes(destructionStatus);
  const showDestroyButton = destructionStatus === 'idle' || deployment?.status === 'pending_destruction';

  return (
    <Dialog
      open={open}
      onClose={isLoading ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderTop: '4px solid', borderColor: 'error.main' }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <WarningAmberIcon color="error" />
        <Typography variant="h6" component="span">
          Destroy Deployment
        </Typography>
      </DialogTitle>

      <DialogContent>
        {/* Deployment Info */}
        <Box sx={{ mb: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Deployment
          </Typography>
          <Typography variant="h6">
            {deployment?.clusterName || 'Unknown'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            <Chip 
              label={deployment?.cloudProvider?.toUpperCase() || 'UNKNOWN'} 
              size="small" 
              color="primary"
            />
            <Chip 
              label={deployment?.status || 'unknown'} 
              size="small"
              color={deployment?.status === 'pending_destruction' ? 'warning' : 'default'}
            />
          </Box>
        </Box>

        {/* Warning Alert */}
        <Alert severity="error" icon={<DeleteForeverIcon />} sx={{ mb: 3 }}>
          <AlertTitle>This action is IRREVERSIBLE</AlertTitle>
          Destroying this deployment will permanently delete ALL AWS resources 
          including your database and all data. This process takes 15-30 minutes 
          and cannot be undone.
        </Alert>

        {/* Resources to be destroyed */}
        <Typography variant="subtitle2" gutterBottom>
          The following resources will be destroyed:
        </Typography>
        <List dense sx={{ mb: 3 }}>
          {destructionItems.map((item, index) => (
            <ListItem key={index} sx={{ py: 0.5 }}>
              <ListItemIcon sx={{ minWidth: 36 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.text}
                secondary={`Est. time: ${item.time}`}
                primaryTypographyProps={{ variant: 'body2' }}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
            </ListItem>
          ))}
        </List>

        <Divider sx={{ my: 2 }} />

        {/* Status Messages */}
        {destructionStatus === 'requesting' && (
          <Alert severity="info" icon={<CircularProgress size={20} />} sx={{ mb: 2 }}>
            Requesting destruction approval...
          </Alert>
        )}

        {destructionStatus === 'executing' && (
          <Alert severity="warning" icon={<HourglassEmptyIcon />} sx={{ mb: 2 }}>
            <AlertTitle>Destruction in Progress</AlertTitle>
            Terraform destroy is running. This will take 15-30 minutes.
            Do not close this window.
          </Alert>
        )}

        {destructionStatus === 'completed' && (
          <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mb: 2 }}>
            <AlertTitle>Destruction Initiated</AlertTitle>
            Terraform destroy has been started. You can monitor progress in the deployment logs.
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <AlertTitle>Error</AlertTitle>
            {error}
          </Alert>
        )}

        {/* Confirmation Input */}
        {showDestroyButton && !isConfirmed && (
          <Box>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
              To confirm destruction, type the deployment name:
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                mb: 2, 
                fontFamily: 'monospace', 
                bgcolor: 'action.hover',
                px: 1,
                py: 0.5,
                borderRadius: 1,
                display: 'inline-block'
              }}
            >
              {deployment?.clusterName || ''}
            </Typography>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Type deployment name to confirm"
              value={confirmationName}
              onChange={(e) => setConfirmationName(e.target.value)}
              disabled={isLoading}
              error={confirmationName.length > 0 && !nameMatches}
              helperText={
                confirmationName.length > 0 && !nameMatches
                  ? 'Name does not match'
                  : ' '
              }
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&.Mui-focused fieldset': {
                    borderColor: nameMatches ? 'success.main' : undefined,
                  },
                },
              }}
              InputProps={{
                endAdornment: nameMatches ? (
                  <CheckCircleIcon color="success" />
                ) : null,
              }}
            />
          </Box>
        )}

        {/* Ready to Execute */}
        {isConfirmed && deployment?.status === 'pending_destruction' && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <AlertTitle>Confirmation Complete</AlertTitle>
            Click "Execute Destruction" to begin terraform destroy.
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button 
          onClick={onClose} 
          disabled={isLoading || destructionStatus === 'executing'}
        >
          Cancel
        </Button>
        
        {/* Show appropriate button based on status */}
        {!isConfirmed && destructionStatus === 'idle' && (
          <Button
            variant="contained"
            color="error"
            disabled={!nameMatches || isLoading}
            onClick={handleConfirm}
            startIcon={isLoading ? <CircularProgress size={16} /> : <WarningAmberIcon />}
          >
            Confirm Destruction
          </Button>
        )}

        {(isConfirmed || deployment?.status === 'pending_destruction') && 
         destructionStatus !== 'executing' && 
         destructionStatus !== 'completed' && (
          <Button
            variant="contained"
            color="error"
            disabled={isLoading}
            onClick={handleExecute}
            startIcon={isLoading ? <CircularProgress size={16} /> : <DeleteForeverIcon />}
          >
            Execute Destruction
          </Button>
        )}

        {destructionStatus === 'completed' && (
          <Button
            variant="contained"
            onClick={onClose}
          >
            Close
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
