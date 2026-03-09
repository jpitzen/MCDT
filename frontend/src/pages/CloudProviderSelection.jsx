import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Grid,
  Button,
  Card,
  CardContent,
  CardMedia,
  Typography,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const CloudProviderSelection = () => {
  const navigate = useNavigate();
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    fetchCloudProviders();
  }, []);

  const fetchCloudProviders = async () => {
    try {
      setLoading(true);
      // Backend API routes are placeholders - need implementation
      const response = await api.get('/api/deployments/providers');
      setProviders(response.data.data || getDefaultProviders());
      setError(null);
    } catch (err) {
      console.warn('Backend API not implemented - using default providers:', err);
      // Fall back to default providers if API fails
      setProviders(getDefaultProviders());
      setError(null); // Don't show error for unimplemented APIs
    } finally {
      setLoading(false);
    }
  };

  const getDefaultProviders = () => {
    return [
      {
        id: 'aws',
        name: 'Amazon Web Services',
        shortName: 'AWS',
        description: 'Deploy to AWS EKS (Elastic Kubernetes Service)',
        icon: '☁️',
        color: '#FF9900',
        features: ['Global infrastructure', 'Rich service ecosystem', 'Pay-as-you-go pricing'],
      },
      {
        id: 'azure',
        name: 'Microsoft Azure',
        shortName: 'Azure',
        description: 'Deploy to Azure AKS (Azure Kubernetes Service)',
        icon: '🔷',
        color: '#0078D4',
        features: ['Enterprise integration', 'Hybrid cloud support', 'Advanced security'],
      },
      {
        id: 'gcp',
        name: 'Google Cloud Platform',
        shortName: 'GCP',
        description: 'Deploy to Google GKE (Google Kubernetes Engine)',
        icon: '🔴',
        color: '#4285F4',
        features: ['Data analytics focus', 'ML/AI integration', 'Cost optimization'],
      },
      {
        id: 'digitalocean',
        name: 'DigitalOcean',
        shortName: 'DigitalOcean',
        description: 'Deploy to DigitalOcean Kubernetes (DOKS)',
        icon: '🌊',
        color: '#0080FF',
        features: ['Simple pricing', 'Developer-friendly', 'Easy management'],
      },
      {
        id: 'linode',
        name: 'Linode',
        shortName: 'Linode',
        description: 'Deploy to Linode Kubernetes Engine (LKE)',
        icon: '🔵',
        color: '#00B4A6',
        features: ['High performance', 'Transparent pricing', 'API-driven'],
      },
    ];
  };

  const handleProviderSelect = (provider) => {
    setSelectedProvider(provider);
    setShowDialog(true);
  };

  const handleConfirm = () => {
    if (selectedProvider) {
      // Navigate to credential form for selected provider
      navigate(`/credentials/add/${selectedProvider.id}`);
    }
    setShowDialog(false);
  };

  const handleCancel = () => {
    setShowDialog(false);
    setSelectedProvider(null);
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 8, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      {/* Header */}
      <Box sx={{ mb: 6, textAlign: 'center' }}>
        <Typography variant="h3" component="h1" sx={{ fontWeight: 'bold', mb: 2 }}>
          Select Your Cloud Provider
        </Typography>
        <Typography variant="subtitle1" color="textSecondary">
          Choose where you want to deploy your Kubernetes cluster
        </Typography>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="warning" sx={{ mb: 4 }}>
          {error}
        </Alert>
      )}

      {/* Provider Cards Grid */}
      <Grid container spacing={3} sx={{ mb: 6 }}>
        {providers.map((provider) => (
          <Grid item xs={12} sm={6} md={4} key={provider.id}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4,
                  borderColor: provider.color,
                },
                border: `2px solid transparent`,
              }}
              onClick={() => handleProviderSelect(provider)}
            >
              {/* Header with color accent */}
              <Box
                sx={{
                  height: 100,
                  background: `linear-gradient(135deg, ${provider.color}15 0%, ${provider.color}05 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '3rem',
                  borderBottom: `3px solid ${provider.color}`,
                }}
              >
                {provider.icon}
              </Box>

              {/* Content */}
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h6" component="h2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  {provider.shortName}
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  {provider.description}
                </Typography>

                {/* Features */}
                <Box sx={{ mt: 2 }}>
                  {provider.features.map((feature, idx) => (
                    <Typography key={idx} variant="caption" display="block" sx={{ mb: 0.5 }}>
                      ✓ {feature}
                    </Typography>
                  ))}
                </Box>
              </CardContent>

              {/* Button */}
              <Box sx={{ p: 2, pt: 0 }}>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={(e) => {
                    e.preventDefault();
                    handleProviderSelect(provider);
                  }}
                  sx={{
                    backgroundColor: provider.color,
                    '&:hover': {
                      backgroundColor: provider.color,
                      opacity: 0.9,
                    },
                  }}
                >
                  Get Started
                </Button>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Info Section */}
      <Paper sx={{ p: 4, backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)', borderRadius: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
          Why Multi-Cloud?
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="body2">
              <strong>Flexibility:</strong> Choose the provider that best fits your needs
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="body2">
              <strong>Cost Optimization:</strong> Leverage pricing advantages of different providers
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="body2">
              <strong>Redundancy:</strong> Distribute workloads across multiple clouds
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="body2">
              <strong>Zero Code Changes:</strong> Same deployment process for all clouds
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Confirmation Dialog */}
      <Dialog open={showDialog} onClose={handleCancel} maxWidth="sm" fullWidth>
        <DialogTitle>Confirm Cloud Provider</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            You've selected <strong>{selectedProvider?.name}</strong>
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Next, you'll need to provide your {selectedProvider?.shortName} credentials to create a deployment.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleConfirm} variant="contained" color="primary">
            Continue
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CloudProviderSelection;
