import React, { useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  LinearProgress,
  Alert,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Link,
  CircularProgress,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useWizard } from '../../WizardContext';

// Tool installation links
const installLinks = {
  docker: 'https://www.docker.com/products/docker-desktop',
  kubectl: 'https://kubernetes.io/docs/tasks/tools/',
  aws: 'https://aws.amazon.com/cli/',
  azure: 'https://docs.microsoft.com/en-us/cli/azure/install-azure-cli',
  gcloud: 'https://cloud.google.com/sdk/docs/install',
  helm: 'https://helm.sh/docs/intro/install/',
  eksctl: 'https://eksctl.io/installation/',
};

// Windows installation commands
const installCommands = {
  docker: 'winget install -e --id Docker.DockerDesktop',
  kubectl: 'winget install -e --id Kubernetes.kubectl',
  aws: 'winget install -e --id Amazon.AWSCLI',
  azure: 'winget install -e --id Microsoft.AzureCLI',
  gcloud: 'winget install -e --id Google.CloudSDK',
  helm: 'winget install -e --id Helm.Helm',
  eksctl: 'choco install eksctl',
};

// Normalize tool name to match lookup keys (e.g., "AWS CLI" -> "aws", "Docker" -> "docker")
const normalizeToolName = (name) => {
  const nameMap = {
    'docker': 'docker',
    'kubectl': 'kubectl',
    'aws cli': 'aws',
    'azure cli': 'azure',
    'google cloud cli': 'gcloud',
    'helm': 'helm',
    'eksctl': 'eksctl',
    'terraform': 'terraform',
  };
  return nameMap[name?.toLowerCase()] || name?.toLowerCase().replace(/\s+/g, '');
};

function ToolItem({ tool, onRefresh }) {
  const isInstalled = tool.status === 'installed';
  const isOptional = !tool.required;
  const toolKey = normalizeToolName(tool.name);

  // Colors for better readability
  const installedColor = '#39FF14'; // Neon green
  const missingRequiredColor = '#d32f2f'; // Bright red
  const missingOptionalColor = '#e53935'; // Brighter red for optional missing

  return (
    <ListItem
      sx={{
        border: 1,
        borderColor: isInstalled ? '#39FF14' : isOptional ? '#bdbdbd' : '#ef5350',
        borderRadius: 1,
        mb: 1,
        bgcolor: isInstalled ? 'rgba(57, 255, 20, 0.08)' : isOptional ? 'rgba(0, 0, 0, 0.02)' : 'rgba(244, 67, 54, 0.06)',
      }}
    >
      <ListItemIcon>
        {isInstalled ? (
          <CheckCircleIcon sx={{ color: installedColor }} />
        ) : isOptional ? (
          <WarningIcon sx={{ color: missingOptionalColor }} />
        ) : (
          <ErrorIcon sx={{ color: missingRequiredColor }} />
        )}
      </ListItemIcon>
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography 
              fontWeight={700} 
              sx={{ color: isInstalled ? installedColor : isOptional ? missingOptionalColor : missingRequiredColor }}
            >
              {tool.name}
            </Typography>
            {isOptional && (
              <Chip 
                label="Optional" 
                size="small" 
                variant="outlined" 
                sx={{ 
                  borderColor: isInstalled ? '#39FF14' : '#ef5350', 
                  color: isInstalled ? '#39FF14' : '#d32f2f',
                  fontWeight: 500,
                }} 
              />
            )}
            {tool.version && (
              <Chip 
                label={`v${tool.version}`} 
                size="small" 
                variant="outlined" 
                sx={{ 
                  borderColor: '#39FF14', 
                  color: '#39FF14',
                  fontWeight: 500,
                }} 
              />
            )}
          </Box>
        }
        secondary={
          <Typography 
            variant="body2" 
            sx={{ 
              color: isInstalled ? '#39FF14' : isOptional ? '#e53935' : '#d32f2f',
              fontWeight: isInstalled ? 500 : 400,
            }}
          >
            {isInstalled
              ? tool.path || tool.description || 'Installed and ready'
              : `Not installed - ${tool.installHint || tool.description || 'Installation required'}`}
          </Typography>
        }
      />
      {!isInstalled && (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title={`Install command: ${installCommands[toolKey] || 'See docs'}`}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<DownloadIcon />}
              component={Link}
              href={tool.installUrl || installLinks[toolKey] || '#'}
              target="_blank"
              rel="noopener"
            >
              Install
            </Button>
          </Tooltip>
        </Box>
      )}
    </ListItem>
  );
}

export default function ToolsCheck() {
  const { state, fetchPrerequisites } = useWizard();
  const { prerequisites, loading } = state;

  useEffect(() => {
    if (!prerequisites) {
      fetchPrerequisites();
    }
  }, [prerequisites, fetchPrerequisites]);

  const handleRefresh = () => {
    fetchPrerequisites();
  };

  if (loading.prerequisites) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2 }} color="text.secondary" align="center">
          Checking installed tools...
        </Typography>
      </Box>
    );
  }

  // Backend returns { prerequisites: [...], summary: {...} }
  // The 'prerequisites' field is the array of tools
  const tools = prerequisites?.prerequisites || prerequisites?.tools || [];
  const summary = prerequisites?.summary || { installed: 0, total: 0, ready: false };

  // Group tools by category
  const requiredTools = tools.filter((t) => t.required);
  const optionalTools = tools.filter((t) => !t.required);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h6">Prerequisites Check</Typography>
          <Typography variant="body2" color="text.secondary">
            Verify that all required tools are installed on your system
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={loading.prerequisites ? <CircularProgress size={16} /> : <RefreshIcon />}
          onClick={handleRefresh}
          disabled={loading.prerequisites}
        >
          Re-check
        </Button>
      </Box>

      {/* Summary */}
      <Alert
        severity={summary.ready ? 'success' : 'warning'}
        icon={summary.ready ? <CheckCircleIcon /> : <WarningIcon />}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="body1" sx={{ fontWeight: 500, mb: 1 }}>
            {summary.ready
              ? `All ${summary.installed} required prerequisites are installed. You're ready to proceed!`
              : `${summary.requiredMissing || 0} required tool(s) missing. Please install them to continue.`}
          </Typography>
          
          {/* Tool Checklist */}
          <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
            {requiredTools.map((tool) => {
              const isInstalled = tool.status === 'installed';
              const textColor = isInstalled ? '#1b5e20' : '#c62828'; // Dark green / Dark red
              return (
                <Box 
                  key={tool.id || tool.name} 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 0.5,
                  }}
                >
                  {isInstalled ? (
                    <CheckCircleIcon sx={{ fontSize: 18, color: textColor }} />
                  ) : (
                    <ErrorIcon sx={{ fontSize: 18, color: textColor }} />
                  )}
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontWeight: 600,
                      color: textColor,
                    }}
                  >
                    {tool.name}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </Box>
      </Alert>

      {/* Required Tools */}
      <Card sx={{ mb: 3, bgcolor: 'rgba(25, 118, 210, 0.08)', border: 1, borderColor: 'primary.light' }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2, color: 'text.primary' }}>
            Required Tools
          </Typography>
          <List disablePadding>
            {requiredTools.map((tool) => (
              <ToolItem key={tool.id || tool.name} tool={tool} onRefresh={handleRefresh} />
            ))}
          </List>
        </CardContent>
      </Card>

      {/* Optional Tools */}
      {optionalTools.length > 0 && (
        <Card sx={{ bgcolor: 'rgba(25, 118, 210, 0.08)', border: 1, borderColor: 'primary.light' }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2, color: 'text.primary' }}>
              Optional Tools
            </Typography>
            <List disablePadding>
              {optionalTools.map((tool) => (
                <ToolItem key={tool.id || tool.name} tool={tool} onRefresh={handleRefresh} />
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* Getting Help */}
      <Box sx={{ mt: 3, p: 2, bgcolor: 'rgba(25, 118, 210, 0.08)', borderRadius: 1, border: 1, borderColor: 'primary.light' }}>
        <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, color: 'text.primary' }}>
          <HelpOutlineIcon fontSize="small" color="primary" />
          Need Help?
        </Typography>
        <Typography variant="body2" color="text.secondary">
          If you're having trouble installing tools, check the{' '}
          <Link href="/docs/prerequisites" target="_blank">
            Prerequisites Guide
          </Link>{' '}
          or run the following in PowerShell:
        </Typography>
        <Box
          component="pre"
          sx={{
            mt: 1,
            p: 1,
            backgroundColor: 'grey.900',
            color: 'grey.100',
            borderRadius: 1,
            fontSize: '0.85rem',
            overflow: 'auto',
          }}
        >
          {`# Install all required tools on Windows
winget install -e --id Docker.DockerDesktop
winget install -e --id Kubernetes.kubectl
winget install -e --id Amazon.AWSCLI`}
        </Box>
      </Box>
    </Box>
  );
}
