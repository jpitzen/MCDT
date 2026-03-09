import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Alert,
  Chip,
  Divider,
  Tooltip,
  IconButton,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import LockIcon from '@mui/icons-material/Lock';
import PublicIcon from '@mui/icons-material/Public';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useWizard } from '../../WizardContext';

/**
 * AccessInfoCard — displays post-deployment access information.
 *
 * Internal mode:  kubectl port-forward command + localhost URL.
 * External mode:  FQDN URL, DNS CNAME record to configure, SSL status.
 *
 * Data source: accessMode / externalDomain from WizardContext state,
 * ELB hostname from deployment outputs (when available).
 */
const AccessInfoCard = () => {
  const { state } = useWizard();
  const [copied, setCopied] = useState(false);

  const accessMode = state.accessMode || 'internal';
  const externalDomain = state.externalDomain || '';
  const deployConfig = state.deployConfig || {};
  const elbHostname = deployConfig.elbHostname || deployConfig.outputs?.elbHostname || '';

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // --- Internal Mode ---
  if (accessMode === 'internal') {
    const portForwardCmd = 'kubectl port-forward svc/zlui-service 8080:8080';

    return (
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <LockIcon color="info" />
            <Typography variant="h6">Access Information</Typography>
            <Chip label="Internal" size="small" color="info" variant="outlined" />
          </Box>

          <Divider sx={{ mb: 2 }} />

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This deployment is accessible only within the cluster, via VPN,
            or through a bastion host.
          </Typography>

          {/* Port forward command */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              bgcolor: 'grey.900',
              color: 'grey.100',
              borderRadius: 1,
              p: 1.5,
              mb: 2,
              fontFamily: 'monospace',
              fontSize: '0.875rem',
            }}
          >
            <Box sx={{ flex: 1, overflow: 'auto' }}>
              <code>{portForwardCmd}</code>
            </Box>
            <Tooltip title={copied ? 'Copied!' : 'Copy command'}>
              <IconButton
                size="small"
                onClick={() => handleCopy(portForwardCmd)}
                sx={{ color: 'grey.400' }}
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>

          <Typography variant="body2">
            URL:{' '}
            <Typography
              component="span"
              variant="body2"
              sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}
            >
              http://localhost:8080/ps
            </Typography>
          </Typography>
        </CardContent>
      </Card>
    );
  }

  // --- External Mode ---
  const accessUrl = externalDomain
    ? `https://${externalDomain}/ps`
    : '';

  return (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <PublicIcon color="success" />
          <Typography variant="h6">Access Information</Typography>
          <Chip label="External" size="small" color="success" variant="outlined" />
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* URL */}
        {accessUrl && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Application URL
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography
                variant="body1"
                sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}
              >
                {accessUrl}
              </Typography>
              <Tooltip title={copied ? 'Copied!' : 'Copy URL'}>
                <IconButton size="small" onClick={() => handleCopy(accessUrl)}>
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Open in browser">
                <IconButton
                  size="small"
                  onClick={() => window.open(accessUrl, '_blank')}
                >
                  <OpenInNewIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        )}

        {/* DNS Record */}
        {elbHostname && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              DNS Configuration
            </Typography>
            <Box
              sx={{
                bgcolor: 'grey.900',
                color: 'grey.100',
                borderRadius: 1,
                p: 1.5,
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                overflow: 'auto',
              }}
            >
              CNAME {externalDomain} → {elbHostname}
            </Box>
          </Box>
        )}

        {/* SSL Status */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            SSL:
          </Typography>
          <CheckCircleIcon fontSize="small" color="success" />
          <Typography variant="body2" color="success.main">
            Enabled ({state.sslMode === 'acm' ? 'ACM' : 'Uploaded Certificate'})
          </Typography>
        </Box>

        {/* DNS warning */}
        {!elbHostname && (
          <Alert severity="info" sx={{ mt: 1 }}>
            The load balancer hostname will appear here once the deployment
            completes and the service receives an external address.
          </Alert>
        )}

        {elbHostname && (
          <Alert severity="warning" sx={{ mt: 1 }}>
            Ensure a DNS CNAME record is configured pointing{' '}
            <strong>{externalDomain}</strong> to the load balancer hostname
            above before users try to access the application.
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default AccessInfoCard;
