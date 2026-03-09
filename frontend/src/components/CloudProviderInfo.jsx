import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Cloud as CloudIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import api from '../services/api';

export default function CloudProviderInfo() {
  const [providerInfo, setProviderInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProviderInfo();
  }, []);

  const fetchProviderInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.deployments.getProvidersInfo();
      setProviderInfo(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch provider information');
      console.error('Failed to fetch provider info:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!providerInfo) {
    return null;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">
          <CloudIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Cloud Provider Information
        </Typography>
        <Tooltip title="Refresh">
          <IconButton onClick={fetchProviderInfo} color="primary">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Grid container spacing={3}>
        {/* AWS Info */}
        {providerInfo.aws && (
          <Grid item xs={12} md={6} lg={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Amazon Web Services</Typography>
                  <Chip
                    icon={providerInfo.aws.available ? <CheckIcon /> : <CancelIcon />}
                    label={providerInfo.aws.available ? 'Available' : 'Unavailable'}
                    color={providerInfo.aws.available ? 'success' : 'default'}
                    size="small"
                  />
                </Box>
                <Divider sx={{ my: 2 }} />
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="Supported Regions"
                      secondary={providerInfo.aws.regions?.length || 0}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Default Region"
                      secondary={providerInfo.aws.defaultRegion || 'N/A'}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="K8s Versions"
                      secondary={providerInfo.aws.kubernetesVersions?.join(', ') || 'N/A'}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Active Credentials"
                      secondary={providerInfo.aws.credentialsCount || 0}
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Azure Info */}
        {providerInfo.azure && (
          <Grid item xs={12} md={6} lg={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Microsoft Azure</Typography>
                  <Chip
                    icon={providerInfo.azure.available ? <CheckIcon /> : <CancelIcon />}
                    label={providerInfo.azure.available ? 'Available' : 'Unavailable'}
                    color={providerInfo.azure.available ? 'success' : 'default'}
                    size="small"
                  />
                </Box>
                <Divider sx={{ my: 2 }} />
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="Supported Regions"
                      secondary={providerInfo.azure.regions?.length || 0}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Default Region"
                      secondary={providerInfo.azure.defaultRegion || 'N/A'}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="K8s Versions"
                      secondary={providerInfo.azure.kubernetesVersions?.join(', ') || 'N/A'}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Active Credentials"
                      secondary={providerInfo.azure.credentialsCount || 0}
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* GCP Info */}
        {providerInfo.gcp && (
          <Grid item xs={12} md={6} lg={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Google Cloud Platform</Typography>
                  <Chip
                    icon={providerInfo.gcp.available ? <CheckIcon /> : <CancelIcon />}
                    label={providerInfo.gcp.available ? 'Available' : 'Unavailable'}
                    color={providerInfo.gcp.available ? 'success' : 'default'}
                    size="small"
                  />
                </Box>
                <Divider sx={{ my: 2 }} />
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="Supported Regions"
                      secondary={providerInfo.gcp.regions?.length || 0}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Default Region"
                      secondary={providerInfo.gcp.defaultRegion || 'N/A'}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="K8s Versions"
                      secondary={providerInfo.gcp.kubernetesVersions?.join(', ') || 'N/A'}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Active Credentials"
                      secondary={providerInfo.gcp.credentialsCount || 0}
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Summary Card */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Summary
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <Typography variant="body2" color="text.secondary">
                Total Providers
              </Typography>
              <Typography variant="h5">
                {Object.keys(providerInfo).length}
              </Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="body2" color="text.secondary">
                Available Providers
              </Typography>
              <Typography variant="h5">
                {Object.values(providerInfo).filter(p => p.available).length}
              </Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="body2" color="text.secondary">
                Total Regions
              </Typography>
              <Typography variant="h5">
                {Object.values(providerInfo).reduce((sum, p) => sum + (p.regions?.length || 0), 0)}
              </Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="body2" color="text.secondary">
                Total Credentials
              </Typography>
              <Typography variant="h5">
                {Object.values(providerInfo).reduce((sum, p) => sum + (p.credentialsCount || 0), 0)}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}
