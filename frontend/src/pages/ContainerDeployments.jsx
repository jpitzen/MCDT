import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  LinearProgress,
  Alert,
  Tabs,
  Tab,
  Tooltip,
  Divider,
  Switch,
  FormControlLabel,
  Slider,
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  CloudUpload as PushIcon,
  Build as BuildIcon,
  Rocket as DeployIcon,
  Undo as RollbackIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Pending as PendingIcon,
  ScaleOutlined as ScaleIcon,
  ContentCopy as CopyIcon,
  Folder as FolderIcon,
} from '@mui/icons-material';
import api from '../services/api';

const statusColors = {
  pending: 'default',
  building: 'info',
  built: 'primary',
  pushing: 'info',
  pushed: 'primary',
  deploying: 'warning',
  deployed: 'success',
  failed: 'error',
  rolled_back: 'secondary',
};

const phaseIcons = {
  init: <PendingIcon />,
  build: <BuildIcon />,
  tag: <FolderIcon />,
  push: <PushIcon />,
  deploy: <DeployIcon />,
  verify: <SuccessIcon />,
  completed: <SuccessIcon color="success" />,
  failed: <ErrorIcon color="error" />,
};

function ContainerDeployments() {
  const [deployments, setDeployments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [scaleDialogOpen, setScaleDialogOpen] = useState(false);
  const [dockerBrowserOpen, setDockerBrowserOpen] = useState(false);
  const [selectedDeployment, setSelectedDeployment] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [dockerTabValue, setDockerTabValue] = useState(0);
  const [credentials, setCredentials] = useState([]);
  const [clusterDeployments, setClusterDeployments] = useState([]);
  const [localImages, setLocalImages] = useState([]);
  const [containers, setContainers] = useState([]);
  const [dockerInfo, setDockerInfo] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedContainer, setSelectedContainer] = useState(null);
  const [containerLogs, setContainerLogs] = useState('');

  // Form state for new deployment
  const [newDeployment, setNewDeployment] = useState({
    name: '',
    sourceType: 'dockerfile',
    deploymentTarget: 'both', // 'local', 'registry', or 'both'
    imageName: '',
    imageTag: 'latest',
    registryType: 'ecr',
    credentialId: '',
    deploymentId: '',
    dockerfilePath: './Dockerfile',
    buildContext: '.',
    gitRepoUrl: '',
    gitBranch: 'main',
    registryUrl: '',
    repositoryName: '',
    registryRegion: 'us-east-1',
    k8sNamespace: 'default',
    k8sDeploymentName: '',
    k8sServiceName: '',
    k8sServiceType: 'ClusterIP',
    k8sReplicas: 2,
    k8sContainerPort: 8080,
    k8sServicePort: 80,
    k8sResourceRequests: { cpu: '100m', memory: '128Mi' },
    k8sResourceLimits: { cpu: '500m', memory: '512Mi' },
    k8sEnvironmentVars: [],
    k8sHealthCheck: {
      enabled: true,
      path: '/health',
      port: 8080,
      initialDelaySeconds: 30,
      periodSeconds: 10,
    },
    buildArgs: {},
    buildPlatform: 'linux/amd64',
    noCache: false,
  });

  const [activeStep, setActiveStep] = useState(0);
  const [scaleValue, setScaleValue] = useState(1);

  const fetchDeployments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/container-deployments');
      setDeployments(response.data.data?.deployments || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch container deployments');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCredentials = useCallback(async () => {
    try {
      const response = await api.get('/credentials');
      setCredentials(response.data.data?.credentials || []);
    } catch (err) {
      console.error('Failed to fetch credentials', err);
    }
  }, []);

  const fetchClusterDeployments = useCallback(async () => {
    try {
      const response = await api.get('/deployments');
      setClusterDeployments(response.data.data?.deployments?.filter(d => d.status === 'completed') || []);
    } catch (err) {
      console.error('Failed to fetch cluster deployments', err);
    }
  }, []);

  const fetchLocalImages = useCallback(async () => {
    try {
      const response = await api.get('/container-deployments/docker/local-images');
      setLocalImages(response.data.data?.images || []);
    } catch (err) {
      console.error('Failed to fetch local images', err);
    }
  }, []);

  const fetchContainers = useCallback(async () => {
    try {
      const response = await api.get('/container-deployments/docker/containers?all=true');
      setContainers(response.data.data?.containers || []);
    } catch (err) {
      console.error('Failed to fetch containers', err);
    }
  }, []);

  const fetchDockerInfo = useCallback(async () => {
    try {
      const response = await api.get('/container-deployments/docker/info');
      setDockerInfo(response.data.data || null);
    } catch (err) {
      console.error('Failed to fetch docker info', err);
    }
  }, []);

  const fetchContainerLogs = async (containerId) => {
    try {
      const response = await api.get(`/container-deployments/docker/containers/${containerId}/logs?tail=200`);
      setContainerLogs(response.data.data?.logs || '');
    } catch (err) {
      console.error('Failed to fetch container logs', err);
    }
  };

  const inspectImage = async (imageId) => {
    try {
      const response = await api.get(`/container-deployments/docker/images/${encodeURIComponent(imageId)}/inspect`);
      setSelectedImage(response.data.data?.image || null);
    } catch (err) {
      console.error('Failed to inspect image', err);
    }
  };

  const inspectContainer = async (containerId) => {
    try {
      const response = await api.get(`/container-deployments/docker/containers/${containerId}/inspect`);
      setSelectedContainer(response.data.data?.container || null);
    } catch (err) {
      console.error('Failed to inspect container', err);
    }
  };

  useEffect(() => {
    fetchDeployments();
    fetchCredentials();
    fetchClusterDeployments();
    fetchLocalImages();
  }, [fetchDeployments, fetchCredentials, fetchClusterDeployments, fetchLocalImages]);

  const openDockerBrowser = () => {
    fetchLocalImages();
    fetchContainers();
    fetchDockerInfo();
    setDockerBrowserOpen(true);
  };

  const handleCreateDeployment = async () => {
    try {
      const response = await api.post('/container-deployments', newDeployment);
      setDeployments([response.data.data.deployment, ...deployments]);
      setCreateDialogOpen(false);
      resetNewDeployment();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create deployment');
    }
  };

  const handleStartPipeline = async (id, options = {}) => {
    try {
      await api.post(`/container-deployments/${id}/start`, options);
      fetchDeployments();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start pipeline');
    }
  };

  const handleBuildOnly = async (id) => {
    try {
      await api.post(`/container-deployments/${id}/build`);
      fetchDeployments();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to build image');
    }
  };

  const handlePushOnly = async (id) => {
    try {
      await api.post(`/container-deployments/${id}/push`);
      fetchDeployments();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to push image');
    }
  };

  const handleDeployOnly = async (id) => {
    try {
      await api.post(`/container-deployments/${id}/deploy`);
      fetchDeployments();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to deploy to K8s');
    }
  };

  const handleRollback = async (id) => {
    try {
      await api.post(`/container-deployments/${id}/rollback`);
      fetchDeployments();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to rollback');
    }
  };

  const handleScale = async () => {
    if (!selectedDeployment) return;
    try {
      await api.post(`/container-deployments/${selectedDeployment.id}/scale`, {
        replicas: scaleValue,
      });
      fetchDeployments();
      setScaleDialogOpen(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to scale deployment');
    }
  };

  const handleCancel = async (id) => {
    try {
      await api.post(`/container-deployments/${id}/cancel`);
      fetchDeployments();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this container deployment?')) return;
    try {
      await api.delete(`/container-deployments/${id}?deleteFromK8s=true`);
      setDeployments(deployments.filter(d => d.id !== id));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete deployment');
    }
  };

  const resetNewDeployment = () => {
    setNewDeployment({
      name: '',
      sourceType: 'dockerfile',
      deploymentTarget: 'both', // 'local', 'registry', or 'both'
      imageName: '',
      imageTag: 'latest',
      registryType: 'ecr',
      credentialId: '',
      deploymentId: '',
      dockerfilePath: './Dockerfile',
      buildContext: '.',
      gitRepoUrl: '',
      gitBranch: 'main',
      registryUrl: '',
      repositoryName: '',
      registryRegion: 'us-east-1',
      k8sNamespace: 'default',
      k8sDeploymentName: '',
      k8sServiceName: '',
      k8sServiceType: 'ClusterIP',
      k8sReplicas: 2,
      k8sContainerPort: 8080,
      k8sServicePort: 80,
      k8sResourceRequests: { cpu: '100m', memory: '128Mi' },
      k8sResourceLimits: { cpu: '500m', memory: '512Mi' },
      k8sEnvironmentVars: [],
      k8sHealthCheck: {
        enabled: true,
        path: '/health',
        port: 8080,
        initialDelaySeconds: 30,
        periodSeconds: 10,
      },
      buildArgs: {},
      buildPlatform: 'linux/amd64',
      noCache: false,
    });
    setActiveStep(0);
  };

  const openViewDialog = (deployment) => {
    setSelectedDeployment(deployment);
    setViewDialogOpen(true);
  };

  const openScaleDialog = (deployment) => {
    setSelectedDeployment(deployment);
    setScaleValue(deployment.k8sReplicas);
    setScaleDialogOpen(true);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  // Dynamic steps based on deployment target
  const getSteps = () => {
    const baseSteps = [{ label: 'Source Configuration', description: 'Configure the image source and target' }];
    
    if (newDeployment.deploymentTarget === 'registry' || newDeployment.deploymentTarget === 'both') {
      baseSteps.push({ label: 'Registry Settings', description: 'Configure container registry' });
    }
    
    if (newDeployment.deploymentTarget === 'local' || newDeployment.deploymentTarget === 'both') {
      baseSteps.push({ label: 'Kubernetes Config', description: 'Configure K8s deployment' });
    }
    
    baseSteps.push({ label: 'Review', description: 'Review and create' });
    return baseSteps;
  };

  const steps = getSteps();

  const renderStepContent = (stepIndex) => {
    const currentStepLabel = steps[stepIndex]?.label;
    
    // Source Configuration Step
    if (currentStepLabel === 'Source Configuration') {
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Deployment Name"
                value={newDeployment.name}
                onChange={(e) => setNewDeployment({ ...newDeployment, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Source Type</InputLabel>
                <Select
                  value={newDeployment.sourceType}
                  label="Source Type"
                  onChange={(e) => setNewDeployment({ ...newDeployment, sourceType: e.target.value })}
                >
                  <MenuItem value="dockerfile">Dockerfile</MenuItem>
                  <MenuItem value="docker-compose">Docker Compose</MenuItem>
                  <MenuItem value="local-image">Local Image</MenuItem>
                  <MenuItem value="git-repo">Git Repository</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Deployment Target</InputLabel>
                <Select
                  value={newDeployment.deploymentTarget}
                  label="Deployment Target"
                  onChange={(e) => {
                    setNewDeployment({ ...newDeployment, deploymentTarget: e.target.value });
                    setActiveStep(0); // Reset to step 0 when target changes
                  }}
                >
                  <MenuItem value="local">Local Only (Build → Deploy to Local K8s)</MenuItem>
                  <MenuItem value="registry">Registry Only (Build → Push to Registry)</MenuItem>
                  <MenuItem value="both">Full Pipeline (Build → Push → Deploy)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Image Name"
                value={newDeployment.imageName}
                onChange={(e) => setNewDeployment({ ...newDeployment, imageName: e.target.value })}
                required
                helperText="e.g., my-app, my-org/my-app"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Image Tag"
                value={newDeployment.imageTag}
                onChange={(e) => setNewDeployment({ ...newDeployment, imageTag: e.target.value })}
                helperText="e.g., latest, v1.0.0"
              />
            </Grid>
            {newDeployment.sourceType === 'dockerfile' && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Dockerfile Path"
                    value={newDeployment.dockerfilePath}
                    onChange={(e) => setNewDeployment({ ...newDeployment, dockerfilePath: e.target.value })}
                    helperText="e.g., ./Dockerfile, ./docker/Dockerfile.prod"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Build Context"
                    value={newDeployment.buildContext}
                    onChange={(e) => setNewDeployment({ ...newDeployment, buildContext: e.target.value })}
                    helperText="e.g., ., ./app"
                  />
                </Grid>
              </>
            )}
            {newDeployment.sourceType === 'git-repo' && (
              <>
                <Grid item xs={12} sm={8}>
                  <TextField
                    fullWidth
                    label="Git Repository URL"
                    value={newDeployment.gitRepoUrl}
                    onChange={(e) => setNewDeployment({ ...newDeployment, gitRepoUrl: e.target.value })}
                    helperText="e.g., https://github.com/org/repo.git"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Branch"
                    value={newDeployment.gitBranch}
                    onChange={(e) => setNewDeployment({ ...newDeployment, gitBranch: e.target.value })}
                  />
                </Grid>
              </>
            )}
            {newDeployment.sourceType === 'local-image' && (
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Select Local Image</InputLabel>
                  <Select
                    value={newDeployment.imageName}
                    label="Select Local Image"
                    onChange={(e) => {
                      const img = localImages.find(i => `${i.Repository}:${i.Tag}` === e.target.value);
                      if (img) {
                        setNewDeployment({
                          ...newDeployment,
                          imageName: img.Repository,
                          imageTag: img.Tag,
                        });
                      }
                    }}
                  >
                    {localImages.map((img, idx) => (
                      <MenuItem key={idx} value={`${img.Repository}:${img.Tag}`}>
                        {img.Repository}:{img.Tag} ({img.Size})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Build Platform</InputLabel>
                <Select
                  value={newDeployment.buildPlatform}
                  label="Build Platform"
                  onChange={(e) => setNewDeployment({ ...newDeployment, buildPlatform: e.target.value })}
                >
                  <MenuItem value="linux/amd64">Linux AMD64</MenuItem>
                  <MenuItem value="linux/arm64">Linux ARM64</MenuItem>
                  <MenuItem value="linux/arm/v7">Linux ARM v7</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={newDeployment.noCache}
                    onChange={(e) => setNewDeployment({ ...newDeployment, noCache: e.target.checked })}
                  />
                }
                label="No Cache (force rebuild)"
              />
            </Grid>
          </Grid>
        );
    }
    
    // Registry Settings Step
    if (currentStepLabel === 'Registry Settings') {
        return (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Registry Type</InputLabel>
                <Select
                  value={newDeployment.registryType}
                  label="Registry Type"
                  onChange={(e) => setNewDeployment({ ...newDeployment, registryType: e.target.value })}
                >
                  <MenuItem value="ecr">AWS ECR</MenuItem>
                  <MenuItem value="acr">Azure ACR</MenuItem>
                  <MenuItem value="gcr">Google GCR</MenuItem>
                  <MenuItem value="docker-hub">Docker Hub</MenuItem>
                  <MenuItem value="private">Private Registry</MenuItem>
                  <MenuItem value="local">Local Registry</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Cloud Credential</InputLabel>
                <Select
                  value={newDeployment.credentialId}
                  label="Cloud Credential"
                  onChange={(e) => setNewDeployment({ ...newDeployment, credentialId: e.target.value })}
                >
                  <MenuItem value="">None (for local/public registries)</MenuItem>
                  {credentials.map((cred) => (
                    <MenuItem key={cred.id} value={cred.id}>
                      {cred.name} ({cred.cloudProvider})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {newDeployment.registryType !== 'local' && (
              <>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Registry URL"
                    value={newDeployment.registryUrl}
                    onChange={(e) => setNewDeployment({ ...newDeployment, registryUrl: e.target.value })}
                    helperText="e.g., 123456789.dkr.ecr.us-east-1.amazonaws.com"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Repository Name"
                    value={newDeployment.repositoryName}
                    onChange={(e) => setNewDeployment({ ...newDeployment, repositoryName: e.target.value })}
                    helperText="Name of the repository in the registry"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Region"
                    value={newDeployment.registryRegion}
                    onChange={(e) => setNewDeployment({ ...newDeployment, registryRegion: e.target.value })}
                  />
                </Grid>
              </>
            )}
            {newDeployment.registryType === 'local' && (
              <Grid item xs={12}>
                <Alert severity="info">
                  Local registry mode: Images will be stored in your local Docker environment only.
                  No remote registry authentication required.
                </Alert>
              </Grid>
            )}
          </Grid>
        );
    }
    
    // Kubernetes Config Step
    if (currentStepLabel === 'Kubernetes Config') {
        return (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Target Cluster</InputLabel>
                <Select
                  value={newDeployment.deploymentId}
                  label="Target Cluster"
                  onChange={(e) => setNewDeployment({ ...newDeployment, deploymentId: e.target.value })}
                >
                  <MenuItem value="">Local K8s (minikube/kind/docker-desktop)</MenuItem>
                  {clusterDeployments.map((d) => (
                    <MenuItem key={d.id} value={d.id}>
                      {d.clusterName} ({d.cloudProvider})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Namespace"
                value={newDeployment.k8sNamespace}
                onChange={(e) => setNewDeployment({ ...newDeployment, k8sNamespace: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="K8s Deployment Name"
                value={newDeployment.k8sDeploymentName || newDeployment.imageName}
                onChange={(e) => setNewDeployment({ ...newDeployment, k8sDeploymentName: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="K8s Service Name"
                value={newDeployment.k8sServiceName}
                onChange={(e) => setNewDeployment({ ...newDeployment, k8sServiceName: e.target.value })}
                helperText="Leave empty for no service"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Service Type</InputLabel>
                <Select
                  value={newDeployment.k8sServiceType}
                  label="Service Type"
                  onChange={(e) => setNewDeployment({ ...newDeployment, k8sServiceType: e.target.value })}
                >
                  <MenuItem value="ClusterIP">ClusterIP</MenuItem>
                  <MenuItem value="NodePort">NodePort</MenuItem>
                  <MenuItem value="LoadBalancer">LoadBalancer</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Container Port"
                value={newDeployment.k8sContainerPort}
                onChange={(e) => setNewDeployment({ ...newDeployment, k8sContainerPort: parseInt(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Service Port"
                value={newDeployment.k8sServicePort}
                onChange={(e) => setNewDeployment({ ...newDeployment, k8sServicePort: parseInt(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography gutterBottom>Replicas: {newDeployment.k8sReplicas}</Typography>
              <Slider
                value={newDeployment.k8sReplicas}
                onChange={(e, value) => setNewDeployment({ ...newDeployment, k8sReplicas: value })}
                min={1}
                max={10}
                marks
                valueLabelDisplay="auto"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={newDeployment.k8sHealthCheck.enabled}
                    onChange={(e) => setNewDeployment({
                      ...newDeployment,
                      k8sHealthCheck: { ...newDeployment.k8sHealthCheck, enabled: e.target.checked }
                    })}
                  />
                }
                label="Enable Health Checks"
              />
            </Grid>
            {newDeployment.k8sHealthCheck.enabled && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Health Check Path"
                    value={newDeployment.k8sHealthCheck.path}
                    onChange={(e) => setNewDeployment({
                      ...newDeployment,
                      k8sHealthCheck: { ...newDeployment.k8sHealthCheck, path: e.target.value }
                    })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Health Check Port"
                    value={newDeployment.k8sHealthCheck.port}
                    onChange={(e) => setNewDeployment({
                      ...newDeployment,
                      k8sHealthCheck: { ...newDeployment.k8sHealthCheck, port: parseInt(e.target.value) }
                    })}
                  />
                </Grid>
              </>
            )}
          </Grid>
        );
    }
    
    // Review Step
    if (currentStepLabel === 'Review') {
        return (
          <Box>
            <Typography variant="h6" gutterBottom>Review Configuration</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">Source</Typography>
                <Typography>{newDeployment.sourceType}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">Image</Typography>
                <Typography>{newDeployment.imageName}:{newDeployment.imageTag}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">Deployment Target</Typography>
                <Typography>
                  {newDeployment.deploymentTarget === 'local' && 'Local Only (K8s)'}
                  {newDeployment.deploymentTarget === 'registry' && 'Registry Only'}
                  {newDeployment.deploymentTarget === 'both' && 'Full Pipeline'}
                </Typography>
              </Grid>
              {(newDeployment.deploymentTarget === 'registry' || newDeployment.deploymentTarget === 'both') && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Registry</Typography>
                  <Typography>{newDeployment.registryType.toUpperCase()}</Typography>
                </Grid>
              )}
              {(newDeployment.deploymentTarget === 'local' || newDeployment.deploymentTarget === 'both') && (
                <>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="textSecondary">Target Cluster</Typography>
                    <Typography>
                      {clusterDeployments.find(d => d.id === newDeployment.deploymentId)?.clusterName || 'Local K8s'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="textSecondary">Namespace</Typography>
                    <Typography>{newDeployment.k8sNamespace}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="textSecondary">Replicas</Typography>
                    <Typography>{newDeployment.k8sReplicas}</Typography>
                  </Grid>
                </>
              )}
            </Grid>
          </Box>
        );
    }
    
    return null;
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 1400, p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Container Deployments</Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={openDockerBrowser}
            sx={{ mr: 2 }}
          >
            Docker Browser
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchDeployments}
            sx={{ mr: 2 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            New Container Deployment
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <LinearProgress />
      ) : deployments.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="textSecondary">
            No container deployments yet
          </Typography>
          <Typography color="textSecondary" sx={{ mb: 2 }}>
            Create your first container deployment to push images to a registry and deploy to K8s
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Create Container Deployment
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {deployments.map((deployment) => (
            <Grid item xs={12} md={6} lg={4} key={deployment.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="h6" noWrap sx={{ maxWidth: '70%' }}>
                      {deployment.name}
                    </Typography>
                    <Chip
                      label={deployment.status}
                      color={statusColors[deployment.status]}
                      size="small"
                    />
                  </Box>
                  
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                    {deployment.imageName}:{deployment.imageTag}
                  </Typography>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    {phaseIcons[deployment.currentPhase]}
                    <Typography variant="body2">
                      Phase: {deployment.currentPhase}
                    </Typography>
                  </Box>

                  {deployment.progress > 0 && deployment.progress < 100 && (
                    <Box sx={{ mb: 1 }}>
                      <LinearProgress variant="determinate" value={deployment.progress} />
                      <Typography variant="caption">{deployment.progress}%</Typography>
                    </Box>
                  )}

                  <Typography variant="caption" display="block" color="textSecondary">
                    Registry: {deployment.registryType.toUpperCase()}
                  </Typography>
                  
                  {deployment.k8sNamespace && (
                    <Typography variant="caption" display="block" color="textSecondary">
                      K8s: {deployment.k8sNamespace}/{deployment.k8sDeploymentName}
                    </Typography>
                  )}

                  {deployment.pushedImageUri && (
                    <Tooltip title="Click to copy">
                      <Typography
                        variant="caption"
                        display="block"
                        color="primary"
                        sx={{ cursor: 'pointer', mt: 1 }}
                        onClick={() => copyToClipboard(deployment.pushedImageUri)}
                      >
                        📋 {deployment.pushedImageUri.substring(0, 40)}...
                      </Typography>
                    </Tooltip>
                  )}
                </CardContent>
                <CardActions>
                  {deployment.status === 'pending' && (
                    <>
                      <Button size="small" startIcon={<StartIcon />} onClick={() => handleStartPipeline(deployment.id)}>
                        Start
                      </Button>
                      <Button size="small" startIcon={<BuildIcon />} onClick={() => handleBuildOnly(deployment.id)}>
                        Build
                      </Button>
                    </>
                  )}
                  {deployment.status === 'built' && (
                    <Button size="small" startIcon={<PushIcon />} onClick={() => handlePushOnly(deployment.id)}>
                      Push
                    </Button>
                  )}
                  {deployment.status === 'pushed' && deployment.deploymentId && (
                    <Button size="small" startIcon={<DeployIcon />} onClick={() => handleDeployOnly(deployment.id)}>
                      Deploy
                    </Button>
                  )}
                  {['building', 'pushing', 'deploying'].includes(deployment.status) && (
                    <Button size="small" color="warning" startIcon={<StopIcon />} onClick={() => handleCancel(deployment.id)}>
                      Cancel
                    </Button>
                  )}
                  {deployment.status === 'deployed' && deployment.rollbackAvailable && (
                    <Button size="small" startIcon={<RollbackIcon />} onClick={() => handleRollback(deployment.id)}>
                      Rollback
                    </Button>
                  )}
                  {deployment.status === 'deployed' && (
                    <IconButton size="small" onClick={() => openScaleDialog(deployment)}>
                      <ScaleIcon />
                    </IconButton>
                  )}
                  <IconButton size="small" onClick={() => openViewDialog(deployment)}>
                    <ViewIcon />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete(deployment.id)}>
                    <DeleteIcon />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create Container Deployment</DialogTitle>
        <DialogContent>
          <Stepper activeStep={activeStep} orientation="vertical" sx={{ mt: 2 }}>
            {steps.map((step, index) => (
              <Step key={step.label}>
                <StepLabel>{step.label}</StepLabel>
                <StepContent>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                    {step.description}
                  </Typography>
                  {renderStepContent(index)}
                  <Box sx={{ mt: 2 }}>
                    <Button
                      variant="contained"
                      onClick={() => {
                        if (index === steps.length - 1) {
                          handleCreateDeployment();
                        } else {
                          setActiveStep(index + 1);
                        }
                      }}
                      sx={{ mr: 1 }}
                    >
                      {index === steps.length - 1 ? 'Create' : 'Continue'}
                    </Button>
                    {index > 0 && (
                      <Button onClick={() => setActiveStep(index - 1)}>
                        Back
                      </Button>
                    )}
                  </Box>
                </StepContent>
              </Step>
            ))}
          </Stepper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setCreateDialogOpen(false); resetNewDeployment(); }}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          {selectedDeployment?.name}
          <Chip
            label={selectedDeployment?.status}
            color={statusColors[selectedDeployment?.status]}
            size="small"
            sx={{ ml: 2 }}
          />
        </DialogTitle>
        <DialogContent>
          <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 2 }}>
            <Tab label="Details" />
            <Tab label="Logs" />
            <Tab label="K8s Status" />
          </Tabs>

          {tabValue === 0 && selectedDeployment && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">Image</Typography>
                <Typography>{selectedDeployment.imageName}:{selectedDeployment.imageTag}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">Source Type</Typography>
                <Typography>{selectedDeployment.sourceType}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">Registry</Typography>
                <Typography>{selectedDeployment.registryType}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">Registry URL</Typography>
                <Typography>{selectedDeployment.registryUrl || '-'}</Typography>
              </Grid>
              {selectedDeployment.pushedImageUri && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="textSecondary">Pushed Image URI</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ wordBreak: 'break-all' }}>{selectedDeployment.pushedImageUri}</Typography>
                    <IconButton size="small" onClick={() => copyToClipboard(selectedDeployment.pushedImageUri)}>
                      <CopyIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Grid>
              )}
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="h6">Kubernetes Configuration</Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="subtitle2" color="textSecondary">Namespace</Typography>
                <Typography>{selectedDeployment.k8sNamespace}</Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="subtitle2" color="textSecondary">Deployment</Typography>
                <Typography>{selectedDeployment.k8sDeploymentName}</Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="subtitle2" color="textSecondary">Replicas</Typography>
                <Typography>{selectedDeployment.k8sReplicas}</Typography>
              </Grid>
            </Grid>
          )}

          {tabValue === 1 && selectedDeployment && (
            <Box sx={{ maxHeight: 400, overflow: 'auto', bgcolor: 'grey.900', p: 2, borderRadius: 1 }}>
              {(selectedDeployment.logs || []).map((log, idx) => (
                <Typography
                  key={idx}
                  variant="body2"
                  sx={{
                    fontFamily: 'monospace',
                    color: log.type === 'error' ? 'error.main' :
                           log.type === 'success' ? 'success.main' :
                           log.type === 'warn' ? 'warning.main' : 'common.white',
                    mb: 0.5,
                  }}
                >
                  [{new Date(log.timestamp).toLocaleTimeString()}] {log.message}
                </Typography>
              ))}
              {(!selectedDeployment.logs || selectedDeployment.logs.length === 0) && (
                <Typography color="textSecondary">No logs available</Typography>
              )}
            </Box>
          )}

          {tabValue === 2 && (
            <Typography color="textSecondary">
              K8s status information will be available when deployment is complete.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Scale Dialog */}
      <Dialog open={scaleDialogOpen} onClose={() => setScaleDialogOpen(false)}>
        <DialogTitle>Scale Deployment</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Adjust the number of replicas for {selectedDeployment?.k8sDeploymentName}
          </Typography>
          <Typography gutterBottom>Replicas: {scaleValue}</Typography>
          <Slider
            value={scaleValue}
            onChange={(e, value) => setScaleValue(value)}
            min={0}
            max={20}
            marks
            valueLabelDisplay="auto"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScaleDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleScale}>Scale</Button>
        </DialogActions>
      </Dialog>

      {/* Docker Browser Dialog */}
      <Dialog open={dockerBrowserOpen} onClose={() => setDockerBrowserOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          Docker Browser
          <IconButton
            onClick={() => { fetchLocalImages(); fetchContainers(); fetchDockerInfo(); }}
            sx={{ ml: 2 }}
            size="small"
          >
            <RefreshIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Tabs value={dockerTabValue} onChange={(e, v) => setDockerTabValue(v)} sx={{ mb: 2 }}>
            <Tab label={`Images (${localImages.length})`} />
            <Tab label={`Containers (${containers.length})`} />
            <Tab label="System Info" />
          </Tabs>

          {/* Images Tab */}
          {dockerTabValue === 0 && (
            <Box>
              {localImages.length === 0 ? (
                <Typography color="textSecondary">No local images found</Typography>
              ) : (
                <Grid container spacing={2}>
                  {localImages.map((img, idx) => (
                    <Grid item xs={12} sm={6} md={4} key={idx}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle1" noWrap title={img.Repository}>
                            {img.Repository === '<none>' ? '(untagged)' : img.Repository}
                          </Typography>
                          <Chip label={img.Tag || 'latest'} size="small" color="primary" sx={{ mr: 1 }} />
                          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                            Size: {img.Size}
                          </Typography>
                          <Typography variant="caption" color="textSecondary" display="block">
                            Created: {img.CreatedSince}
                          </Typography>
                          <Typography variant="caption" color="textSecondary" display="block" noWrap title={img.ID}>
                            ID: {img.ID?.substring(0, 12)}
                          </Typography>
                        </CardContent>
                        <CardActions>
                          <Button 
                            size="small" 
                            onClick={() => inspectImage(img.ID)}
                          >
                            Inspect
                          </Button>
                          <Tooltip title="Copy full image name">
                            <IconButton 
                              size="small" 
                              onClick={() => copyToClipboard(`${img.Repository}:${img.Tag}`)}
                            >
                              <CopyIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </CardActions>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}

              {/* Image Inspect Details */}
              {selectedImage && (
                <Box sx={{ mt: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">Image Details</Typography>
                    <Button size="small" onClick={() => setSelectedImage(null)}>Close</Button>
                  </Box>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="textSecondary">ID</Typography>
                      <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                        {selectedImage.Id}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="textSecondary">Created</Typography>
                      <Typography variant="body2">
                        {new Date(selectedImage.Created).toLocaleString()}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="textSecondary">Architecture</Typography>
                      <Typography variant="body2">{selectedImage.Architecture}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="textSecondary">OS</Typography>
                      <Typography variant="body2">{selectedImage.Os}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="textSecondary">Tags</Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(selectedImage.RepoTags || []).map((tag, i) => (
                          <Chip key={i} label={tag} size="small" />
                        ))}
                      </Box>
                    </Grid>
                    {selectedImage.Config?.Env && (
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" color="textSecondary">Environment Variables</Typography>
                        <Box sx={{ maxHeight: 150, overflow: 'auto', bgcolor: 'grey.900', p: 1, borderRadius: 1, mt: 1 }}>
                          {selectedImage.Config.Env.map((env, i) => (
                            <Typography key={i} variant="caption" display="block" sx={{ fontFamily: 'monospace', color: 'common.white' }}>
                              {env}
                            </Typography>
                          ))}
                        </Box>
                      </Grid>
                    )}
                  </Grid>
                </Box>
              )}
            </Box>
          )}

          {/* Containers Tab */}
          {dockerTabValue === 1 && (
            <Box>
              {containers.length === 0 ? (
                <Typography color="textSecondary">No containers found</Typography>
              ) : (
                <Grid container spacing={2}>
                  {containers.map((container, idx) => (
                    <Grid item xs={12} sm={6} key={idx}>
                      <Card variant="outlined">
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="subtitle1" noWrap sx={{ maxWidth: '60%' }} title={container.Names}>
                              {container.Names}
                            </Typography>
                            <Chip 
                              label={container.State} 
                              size="small" 
                              color={container.State === 'running' ? 'success' : 'default'}
                            />
                          </Box>
                          <Typography variant="body2" color="textSecondary" noWrap title={container.Image}>
                            Image: {container.Image}
                          </Typography>
                          <Typography variant="caption" color="textSecondary" display="block">
                            Status: {container.Status}
                          </Typography>
                          <Typography variant="caption" color="textSecondary" display="block">
                            Ports: {container.Ports || 'none'}
                          </Typography>
                          <Typography variant="caption" color="textSecondary" display="block" noWrap>
                            ID: {container.ID?.substring(0, 12)}
                          </Typography>
                        </CardContent>
                        <CardActions>
                          <Button 
                            size="small" 
                            onClick={() => { 
                              inspectContainer(container.ID); 
                              fetchContainerLogs(container.ID); 
                            }}
                          >
                            Inspect
                          </Button>
                          <Button 
                            size="small" 
                            onClick={() => fetchContainerLogs(container.ID)}
                          >
                            Logs
                          </Button>
                        </CardActions>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}

              {/* Container Inspect Details */}
              {selectedContainer && (
                <Box sx={{ mt: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">Container Details: {selectedContainer.Name}</Typography>
                    <Button size="small" onClick={() => { setSelectedContainer(null); setContainerLogs(''); }}>Close</Button>
                  </Box>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="textSecondary">ID</Typography>
                      <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                        {selectedContainer.Id}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="textSecondary">Image</Typography>
                      <Typography variant="body2">{selectedContainer.Config?.Image}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="textSecondary">State</Typography>
                      <Typography variant="body2">
                        {selectedContainer.State?.Status} (Running: {selectedContainer.State?.Running ? 'Yes' : 'No'})
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="textSecondary">Started At</Typography>
                      <Typography variant="body2">
                        {selectedContainer.State?.StartedAt ? new Date(selectedContainer.State.StartedAt).toLocaleString() : 'N/A'}
                      </Typography>
                    </Grid>
                  </Grid>

                  {containerLogs && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" color="textSecondary" gutterBottom>Logs</Typography>
                      <Box sx={{ maxHeight: 300, overflow: 'auto', bgcolor: 'grey.900', p: 2, borderRadius: 1 }}>
                        <Box component="pre" sx={{ m: 0, color: 'common.white', fontSize: '12px', whiteSpace: 'pre-wrap' }}>
                          {containerLogs}
                        </Box>
                      </Box>
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          )}

          {/* System Info Tab */}
          {dockerTabValue === 2 && dockerInfo && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Docker Engine</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="primary">{dockerInfo.info?.containers || 0}</Typography>
                  <Typography variant="body2" color="textSecondary">Total Containers</Typography>
                </Paper>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main">{dockerInfo.info?.containersRunning || 0}</Typography>
                  <Typography variant="body2" color="textSecondary">Running</Typography>
                </Paper>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="warning.main">{dockerInfo.info?.containersStopped || 0}</Typography>
                  <Typography variant="body2" color="textSecondary">Stopped</Typography>
                </Paper>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="info.main">{dockerInfo.info?.images || 0}</Typography>
                  <Typography variant="body2" color="textSecondary">Images</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">Server Version</Typography>
                <Typography>{dockerInfo.version?.server || dockerInfo.info?.serverVersion}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">Operating System</Typography>
                <Typography>{dockerInfo.info?.operatingSystem}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">Architecture</Typography>
                <Typography>{dockerInfo.info?.architecture}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">CPUs</Typography>
                <Typography>{dockerInfo.info?.cpus}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">Memory</Typography>
                <Typography>{dockerInfo.info?.memory ? `${(dockerInfo.info.memory / 1024 / 1024 / 1024).toFixed(2)} GB` : 'N/A'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">Storage Driver</Typography>
                <Typography>{dockerInfo.info?.driver}</Typography>
              </Grid>
            </Grid>
          )}

          {dockerTabValue === 2 && !dockerInfo && (
            <Typography color="textSecondary">Loading Docker system information...</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDockerBrowserOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ContainerDeployments;
