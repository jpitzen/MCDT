import React from 'react';
import {
  Box,
  Typography,
  RadioGroup,
  Radio,
  FormControlLabel,
  TextField,
  Alert,
  Collapse,
  Paper,
  Divider,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import PublicIcon from '@mui/icons-material/Public';
import SecurityIcon from '@mui/icons-material/Security';
import { useWizard, ActionTypes } from '../../WizardContext';

/**
 * AccessModeConfig — Choose between internal-only (ClusterIP)
 * and external (LoadBalancer + SSL + DNS) access for the ZL deployment.
 *
 * State lives in WizardContext; dispatches SET_ACCESS_MODE, SET_EXTERNAL_DOMAIN,
 * SET_SSL_MODE, SET_SSL_CERT_ARN.
 */
const AccessModeConfig = () => {
  const { state, dispatch } = useWizard();

  const accessMode = state.accessMode || 'internal';
  const externalDomain = state.externalDomain || '';
  const cloudProvider = state.cloudProvider || 'aws';
  const sslMode = state.sslMode || 'managed';
  const sslCertArn = state.sslCertArn || '';

  // Provider-specific certificate service labels
  const certServiceLabels = {
    aws: { name: 'AWS Certificate Manager (ACM)', placeholder: 'arn:aws:acm:us-east-1:123456789012:certificate/abc-def-ghi', inputLabel: 'ACM Certificate ARN', helperText: 'ARN of the ACM certificate for SSL termination on the load balancer' },
    azure: { name: 'Azure Key Vault Certificate', placeholder: 'https://myvault.vault.azure.net/certificates/my-cert/version', inputLabel: 'Key Vault Certificate ID', helperText: 'URI of the certificate in Azure Key Vault' },
    gcp: { name: 'Google-managed Certificate', placeholder: 'projects/my-project/locations/global/certificates/my-cert', inputLabel: 'Certificate Resource Name', helperText: 'Resource name of the Google-managed SSL certificate' },
    digitalocean: { name: 'DigitalOcean Certificate', placeholder: 'cert-id-from-digitalocean', inputLabel: 'Certificate ID', helperText: 'ID of the SSL certificate uploaded to DigitalOcean' },
    linode: { name: 'NodeBalancer SSL Certificate', placeholder: 'Upload certificate via NodeBalancer settings', inputLabel: 'Certificate', helperText: 'SSL certificate for Linode NodeBalancer' },
  };
  const certLabels = certServiceLabels[cloudProvider] || certServiceLabels.aws;

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Access Mode
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Choose how users will access this ZL deployment. This determines whether
        the UI service is exposed via a public load balancer or kept internal to the cluster.
      </Typography>

      <RadioGroup
        value={accessMode}
        onChange={(e) =>
          dispatch({ type: ActionTypes.SET_ACCESS_MODE, payload: e.target.value })
        }
      >
        {/* Internal option */}
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            mb: 1,
            borderColor: accessMode === 'internal' ? 'primary.main' : 'divider',
            borderWidth: accessMode === 'internal' ? 2 : 1,
          }}
        >
          <FormControlLabel
            value="internal"
            control={<Radio />}
            label={
              <Box sx={{ ml: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LockIcon fontSize="small" color="action" />
                  <Typography variant="subtitle2">Internal Only</Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Accessible within the cluster and via VPN/bastion only.
                  No public DNS or SSL required.
                </Typography>
              </Box>
            }
            sx={{ alignItems: 'flex-start', m: 0 }}
          />
        </Paper>

        {/* External option */}
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            borderColor: accessMode === 'external' ? 'primary.main' : 'divider',
            borderWidth: accessMode === 'external' ? 2 : 1,
          }}
        >
          <FormControlLabel
            value="external"
            control={<Radio />}
            label={
              <Box sx={{ ml: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PublicIcon fontSize="small" color="action" />
                  <Typography variant="subtitle2">External Access</Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Publicly accessible via custom domain with SSL/TLS termination.
                  Creates a LoadBalancer service with SSL annotations.
                </Typography>
              </Box>
            }
            sx={{ alignItems: 'flex-start', m: 0 }}
          />
        </Paper>
      </RadioGroup>

      {/* External configuration panel */}
      <Collapse in={accessMode === 'external'}>
        <Box sx={{ mt: 2, pl: 4 }}>
          <Divider sx={{ mb: 2 }} />

          <TextField
            label="Domain Name"
            placeholder="zlpsaws.zlpsonline.com"
            value={externalDomain}
            onChange={(e) =>
              dispatch({ type: ActionTypes.SET_EXTERNAL_DOMAIN, payload: e.target.value })
            }
            fullWidth
            required
            helperText="Fully qualified domain name that will resolve to this deployment"
            sx={{ mb: 3 }}
          />

          {/* SSL Mode */}
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <SecurityIcon fontSize="small" color="action" />
              <Typography variant="subtitle2">SSL/TLS Certificate</Typography>
            </Box>

            <RadioGroup
              value={sslMode}
              onChange={(e) =>
                dispatch({ type: ActionTypes.SET_SSL_MODE, payload: e.target.value })
              }
              row
            >
              <FormControlLabel
                value="managed"
                control={<Radio size="small" />}
                label={
                  <Typography variant="body2">
                    {certLabels.name}
                  </Typography>
                }
              />
              <FormControlLabel
                value="upload"
                control={<Radio size="small" />}
                label={
                  <Typography variant="body2">Upload Certificate</Typography>
                }
              />
            </RadioGroup>
          </Box>

          {/* Managed certificate input */}
          <Collapse in={sslMode === 'managed'}>
            <TextField
              label={certLabels.inputLabel}
              placeholder={certLabels.placeholder}
              value={sslCertArn}
              onChange={(e) =>
                dispatch({ type: ActionTypes.SET_SSL_CERT_ARN, payload: e.target.value })
              }
              fullWidth
              required
              helperText={certLabels.helperText}
              sx={{ mb: 2 }}
            />
          </Collapse>

          {/* Upload mode info */}
          <Collapse in={sslMode === 'upload'}>
            <Alert severity="info" sx={{ mb: 2 }}>
              Certificate upload creates a Kubernetes TLS Secret. You will need to
              provide the certificate and private key files during deployment.
            </Alert>
          </Collapse>
        </Box>
      </Collapse>

      {/* Internal mode info */}
      {accessMode === 'internal' && (
        <Alert severity="info" sx={{ mt: 2 }}>
          After deployment, use{' '}
          <Typography component="code" variant="body2" sx={{ fontFamily: 'monospace' }}>
            kubectl port-forward svc/zlui-service 8080:8080
          </Typography>{' '}
          to access the application locally.
        </Alert>
      )}
    </Box>
  );
};

export default AccessModeConfig;
