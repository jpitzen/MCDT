import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Button,
  Alert,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useWizard } from '../../WizardContext';

// Deployment templates
const DEPLOYMENT_TEMPLATES = {
  webApp: {
    name: 'Web Application',
    replicas: 2,
    image: 'nginx:latest',
    port: 80,
    resources: { cpu: '100m', memory: '128Mi' },
    serviceType: 'LoadBalancer',
  },
  api: {
    name: 'API Server',
    replicas: 3,
    image: 'node:18-alpine',
    port: 3000,
    resources: { cpu: '200m', memory: '256Mi' },
    serviceType: 'ClusterIP',
  },
  worker: {
    name: 'Background Worker',
    replicas: 1,
    image: 'python:3.11-slim',
    resources: { cpu: '500m', memory: '512Mi' },
    serviceType: 'None',
  },
};

function DeploymentForm({ deployment, onChange, onDelete, index }) {
  const handleChange = (field) => (event) => {
    onChange(index, { ...deployment, [field]: event.target.value });
  };

  const handleResourceChange = (resource) => (event) => {
    onChange(index, {
      ...deployment,
      resources: { ...deployment.resources, [resource]: event.target.value },
    });
  };

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Deployment #{index + 1}</Typography>
          <IconButton color="error" onClick={() => onDelete(index)} size="small">
            <DeleteIcon />
          </IconButton>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Deployment Name"
              value={deployment.name || ''}
              onChange={handleChange('name')}
              helperText="Kubernetes deployment name"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Container Image"
              value={deployment.image || ''}
              onChange={handleChange('image')}
              placeholder="nginx:latest"
              helperText="Docker image to deploy"
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <TextField
              fullWidth
              type="number"
              label="Replicas"
              value={deployment.replicas || 1}
              onChange={handleChange('replicas')}
              inputProps={{ min: 1, max: 100 }}
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <TextField
              fullWidth
              type="number"
              label="Container Port"
              value={deployment.port || ''}
              onChange={handleChange('port')}
              placeholder="80"
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <TextField
              fullWidth
              label="CPU Request"
              value={deployment.resources?.cpu || '100m'}
              onChange={handleResourceChange('cpu')}
              helperText="e.g., 100m, 0.5"
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <TextField
              fullWidth
              label="Memory Request"
              value={deployment.resources?.memory || '128Mi'}
              onChange={handleResourceChange('memory')}
              helperText="e.g., 128Mi, 1Gi"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Service Type</InputLabel>
              <Select
                value={deployment.serviceType || 'ClusterIP'}
                onChange={handleChange('serviceType')}
                label="Service Type"
              >
                <MenuItem value="None">No Service</MenuItem>
                <MenuItem value="ClusterIP">ClusterIP (Internal only)</MenuItem>
                <MenuItem value="NodePort">NodePort (Node access)</MenuItem>
                <MenuItem value="LoadBalancer">LoadBalancer (External)</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Namespace"
              value={deployment.namespace || 'default'}
              onChange={handleChange('namespace')}
            />
          </Grid>
        </Grid>

        {/* Environment Variables */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Environment Variables
          </Typography>
          {(deployment.envVars || []).map((env, envIndex) => (
            <Box key={envIndex} sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField
                size="small"
                label="Name"
                value={env.name}
                onChange={(e) => {
                  const envVars = [...(deployment.envVars || [])];
                  envVars[envIndex] = { ...env, name: e.target.value };
                  onChange(index, { ...deployment, envVars });
                }}
                sx={{ flex: 1 }}
              />
              <TextField
                size="small"
                label="Value"
                value={env.value}
                onChange={(e) => {
                  const envVars = [...(deployment.envVars || [])];
                  envVars[envIndex] = { ...env, value: e.target.value };
                  onChange(index, { ...deployment, envVars });
                }}
                sx={{ flex: 2 }}
              />
              <IconButton
                size="small"
                color="error"
                onClick={() => {
                  const envVars = (deployment.envVars || []).filter((_, i) => i !== envIndex);
                  onChange(index, { ...deployment, envVars });
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={() => {
              const envVars = [...(deployment.envVars || []), { name: '', value: '' }];
              onChange(index, { ...deployment, envVars });
            }}
          >
            Add Variable
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}

function YAMLEditor({ deployments }) {
  const generateYAML = () => {
    return deployments.map(dep => `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${dep.name || 'my-app'}
  namespace: ${dep.namespace || 'default'}
spec:
  replicas: ${dep.replicas || 1}
  selector:
    matchLabels:
      app: ${dep.name || 'my-app'}
  template:
    metadata:
      labels:
        app: ${dep.name || 'my-app'}
    spec:
      containers:
      - name: ${dep.name || 'my-app'}
        image: ${dep.image || 'nginx:latest'}
        ports:
        - containerPort: ${dep.port || 80}
        resources:
          requests:
            cpu: ${dep.resources?.cpu || '100m'}
            memory: ${dep.resources?.memory || '128Mi'}
${dep.envVars?.length ? `        env:\n${dep.envVars.map(e => `        - name: ${e.name}\n          value: "${e.value}"`).join('\n')}` : ''}
---
${dep.serviceType && dep.serviceType !== 'None' ? `apiVersion: v1
kind: Service
metadata:
  name: ${dep.name || 'my-app'}-svc
  namespace: ${dep.namespace || 'default'}
spec:
  type: ${dep.serviceType}
  selector:
    app: ${dep.name || 'my-app'}
  ports:
  - port: ${dep.port || 80}
    targetPort: ${dep.port || 80}` : ''}`).join('\n---\n');
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Generated YAML</Typography>
        <Tooltip title="Copy to clipboard">
          <IconButton onClick={() => navigator.clipboard.writeText(generateYAML())}>
            <ContentCopyIcon />
          </IconButton>
        </Tooltip>
      </Box>
      <Box
        component="pre"
        sx={{
          p: 2,
          backgroundColor: 'grey.900',
          color: 'grey.100',
          borderRadius: 1,
          overflow: 'auto',
          maxHeight: 500,
          fontSize: '0.8rem',
          fontFamily: 'monospace',
        }}
      >
        {generateYAML()}
      </Box>
    </Box>
  );
}

export default function K8sDeployment() {
  const { state, updateDeployConfig } = useWizard();
  const [activeTab, setActiveTab] = useState(0);
  
  const deployments = useMemo(() => 
    state.deployConfig?.deployments || [], 
    [state.deployConfig?.deployments]
  );

  const handleAddDeployment = (template = null) => {
    const newDeployment = template
      ? { ...DEPLOYMENT_TEMPLATES[template], id: Date.now() }
      : { id: Date.now(), name: '', image: '', replicas: 1, serviceType: 'ClusterIP' };
    
    updateDeployConfig({
      deployments: [...deployments, newDeployment],
    });
  };

  const handleUpdateDeployment = (index, updated) => {
    const newDeployments = [...deployments];
    newDeployments[index] = updated;
    updateDeployConfig({ deployments: newDeployments });
  };

  const handleDeleteDeployment = (index) => {
    updateDeployConfig({
      deployments: deployments.filter((_, i) => i !== index),
    });
  };

  return (
    <Box>
      <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 3 }}>
        <Tab label="Form Mode" />
        <Tab label="YAML Preview" />
      </Tabs>

      {activeTab === 0 && (
        <>
          {/* Quick Templates */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Start Templates
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {Object.entries(DEPLOYMENT_TEMPLATES).map(([key, template]) => (
                  <Button
                    key={key}
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => handleAddDeployment(key)}
                  >
                    {template.name}
                  </Button>
                ))}
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => handleAddDeployment()}
                >
                  Blank Deployment
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* Deployments */}
          {deployments.length === 0 ? (
            <Alert severity="info">
              No deployments configured. Add a deployment using the templates above.
            </Alert>
          ) : (
            deployments.map((dep, index) => (
              <DeploymentForm
                key={dep.id}
                deployment={dep}
                index={index}
                onChange={handleUpdateDeployment}
                onDelete={handleDeleteDeployment}
              />
            ))
          )}
        </>
      )}

      {activeTab === 1 && (
        <YAMLEditor deployments={deployments} />
      )}

      {deployments.length > 0 && (
        <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
          <Alert severity="info" sx={{ flex: 1 }} icon={<PlayArrowIcon />}>
            <Typography variant="subtitle2">
              {deployments.length} application(s) configured
            </Typography>
            <Typography variant="body2">
              Review your configuration and proceed to verification. Deployment will be saved for review and approval.
            </Typography>
          </Alert>
        </Box>
      )}
    </Box>
  );
}
