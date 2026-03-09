import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
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
  Tabs,
  Tab,
  Tooltip,
  Divider,
  Switch,
  FormControlLabel,
  Slider,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Collapse,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Card,
  CardContent,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Rocket as DeployIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
  Storage as StorageIcon,
  Cloud as CloudIcon,
  ViewInAr as ContainerIcon,
  Dns as ServiceIcon,
  Memory as PodIcon,
  Event as EventIcon,
  Terminal as TerminalIcon,
  Add as AddIcon,
  RestartAlt as RestartIcon,
  Info as InfoIcon,
  ContentCopy as CopyIcon,
  Close as CloseIcon,
  CheckCircle as SuccessIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Pending as PendingIcon,
  Image as ImageIcon,
  Layers as LayersIcon,
  CloudQueue as CloudProviderIcon,
  Link as LinkIcon,
  Download as DownloadIcon,
  VpnKey as CredentialIcon,
  Code as CodeIcon,
  Edit as EditIcon,
  Build as BuildIcon,
  Settings as SettingsIcon,
  OpenInNew as OpenInNewIcon,
  HelpOutline as HelpOutlineIcon,
  Sd as DiskIcon,
  DataArray as DataIcon,
  Security,
  LockOpen as PublicIcon,
  LockOpen,
  LockOutlined,
  Router,
  Speed as SpeedIcon,
  Scale as ScaleIcon,
  Visibility as VisibilityIcon,
  ContentCopy as ContentCopyIcon,
  PublicOff,
  Label,
  CloudDone,
  // Phase 5 Icons
  Extension as ExtensionIcon,
  Anchor as HelmIcon,
  Apps as StatefulSetIcon,
  VpnLock,
  Stop as StopIcon,
  History as HistoryIcon,
  Undo as RollbackIcon,
  Computer as BastionIcon,
} from '@mui/icons-material';
import yaml from 'js-yaml';
import api from '../services/api';

const statusColors = {
  Running: 'success',
  Pending: 'warning',
  Succeeded: 'success',
  Failed: 'error',
  Unknown: 'default',
  Active: 'success',
  Terminating: 'warning',
};

const podStatusIcons = {
  Running: <SuccessIcon color="success" fontSize="small" />,
  Pending: <PendingIcon color="warning" fontSize="small" />,
  Succeeded: <SuccessIcon color="success" fontSize="small" />,
  Failed: <ErrorIcon color="error" fontSize="small" />,
  Unknown: <WarningIcon color="disabled" fontSize="small" />,
};

function CloudDeploymentToolkit() {
  // ==========================================
  // STATE
  // ==========================================
  
  // Context & Navigation
  const [k8sContext, setK8sContext] = useState(null);
  const [selectedView, setSelectedView] = useState('setup'); // 'setup' | 'docker' | 'k8s' | 'cloud'
  
  // Prerequisites State
  const [prerequisites, setPrerequisites] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [prerequisitesLoading, setPrerequisitesLoading] = useState(false);
  
  // Docker Browser State
  const [localImages, setLocalImages] = useState([]);
  const [containers, setContainers] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [dockerInfo, setDockerInfo] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedContainer, setSelectedContainer] = useState(null);
  
  // K8s Browser State
  const [namespaces, setNamespaces] = useState([]);
  const [selectedNamespace, setSelectedNamespace] = useState('default');
  const [expandedNamespaces, setExpandedNamespaces] = useState(['default']);
  const [k8sDeployments, setK8sDeployments] = useState([]);
  const [k8sServices, setK8sServices] = useState([]);
  const [k8sPods, setK8sPods] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [k8sConfigMaps, setK8sConfigMaps] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [k8sSecrets, setK8sSecrets] = useState([]);
  const [k8sEvents, setK8sEvents] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [resourceUsage, setResourceUsage] = useState(null);
  
  // Storage Management State
  const [storageClasses, setStorageClasses] = useState([]);
  const [storageClassTemplates, setStorageClassTemplates] = useState({});
  const [pvcs, setPvcs] = useState([]);
  const [pvs, setPvs] = useState([]);
  const [csiDriverStatus, setCsiDriverStatus] = useState({ ebs: { installed: false }, efs: { installed: false } });
  const [createStorageClassOpen, setCreateStorageClassOpen] = useState(false);
  const [createPvcOpen, setCreatePvcOpen] = useState(false);
  const [newStorageClass, setNewStorageClass] = useState({
    name: '',
    provisioner: '',
    reclaimPolicy: 'Delete',
    volumeBindingMode: 'WaitForFirstConsumer',
    allowVolumeExpansion: true,
    isDefault: false,
    parameters: {},
  });
  const [newPvc, setNewPvc] = useState({
    name: '',
    namespace: 'default',
    storageClass: '',
    accessModes: ['ReadWriteOnce'],
    storage: '10Gi',
  });
  
  // Network & Cluster Config State
  const [clusterEndpointConfig, setClusterEndpointConfig] = useState(null);
  const [subnets, setSubnets] = useState([]);
  const [securityGroups, setSecurityGroups] = useState([]);
  const [loadBalancers, setLoadBalancers] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [vpcDetails, setVpcDetails] = useState(null);
  const [internalLbTemplates, setInternalLbTemplates] = useState({});
  // eslint-disable-next-line no-unused-vars
  const [selectedLbTemplate, setSelectedLbTemplate] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [endpointUpdatePending, setEndpointUpdatePending] = useState(false);
  
  // Phase 4: Operations State
  const [configMaps, setConfigMaps] = useState([]);
  const [secrets, setSecrets] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [selectedConfigMap, setSelectedConfigMap] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [selectedSecret, setSelectedSecret] = useState(null);
  const [metricsServerStatus, setMetricsServerStatus] = useState(null);
  const [clusterAutoscalerStatus, setClusterAutoscalerStatus] = useState(null);
  const [nodeMetrics, setNodeMetrics] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [podMetrics, setPodMetrics] = useState([]);
  const [nodeHealth, setNodeHealth] = useState([]);
  const [problematicPods, setProblematicPods] = useState([]);
  const [troubleshootingChecklist, setTroubleshootingChecklist] = useState([]);
  const [selectedTroubleshootingType, setSelectedTroubleshootingType] = useState('pod-not-starting');
  
  // Phase 5: Advanced Features State
  const [helmRepos, setHelmRepos] = useState([]);
  const [helmCharts, setHelmCharts] = useState([]);
  const [helmReleases, setHelmReleases] = useState([]);
  const [selectedHelmRelease, setSelectedHelmRelease] = useState(null);
  const [helmReleaseHistory, setHelmReleaseHistory] = useState([]);
  const [helmSearchKeyword, setHelmSearchKeyword] = useState('');
  const [addHelmRepoOpen, setAddHelmRepoOpen] = useState(false);
  const [installHelmChartOpen, setInstallHelmChartOpen] = useState(false);
  const [newHelmRepo, setNewHelmRepo] = useState({ name: '', url: '', username: '', password: '' });
  const [newHelmInstall, setNewHelmInstall] = useState({
    releaseName: '', chartName: '', namespace: 'default', version: '', values: '', createNamespace: true
  });
  const [statefulSets, setStatefulSets] = useState([]);
  const [statefulSetTemplates, setStatefulSetTemplates] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [selectedStatefulSet, setSelectedStatefulSet] = useState(null);
  const [createStatefulSetOpen, setCreateStatefulSetOpen] = useState(false);
  const [newStatefulSet, setNewStatefulSet] = useState({
    name: '', namespace: 'default', template: '', replicas: 3, storageSize: '10Gi', storageClass: ''
  });
  const [portForwards, setPortForwards] = useState([]);
  const [portForwardTemplates, setPortForwardTemplates] = useState([]);
  const [bastionGuide, setBastionGuide] = useState(null);
  const [createPortForwardOpen, setCreatePortForwardOpen] = useState(false);
  const [newPortForward, setNewPortForward] = useState({
    resourceType: 'pod', resourceName: '', namespace: 'default', localPort: 8080, remotePort: 8080
  });
  
  // Cloud Provider State
  const [credentials, setCredentials] = useState([]);
  const [selectedCredential, setSelectedCredential] = useState(null);
  const [availableRegions, setAvailableRegions] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState('');
  const [cloudRegistries, setCloudRegistries] = useState([]);
  const [cloudClusters, setCloudClusters] = useState([]);
  const [cloudRegistryImages, setCloudRegistryImages] = useState([]);
  const [selectedRegistry, setSelectedRegistry] = useState(null);
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [connectedToCloud, setConnectedToCloud] = useState(false);
  const [selectedCloudImage, setSelectedCloudImage] = useState(null);
  
  // Selected Resource for Detail View
  const [selectedResource, setSelectedResource] = useState(null);
  const [resourceDescription, setResourceDescription] = useState('');
  const [podLogs, setPodLogs] = useState('');
  
  // Dialogs
  const [quickDeployOpen, setQuickDeployOpen] = useState(false);
  const [createNamespaceOpen, setCreateNamespaceOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [portForwardOpen, setPortForwardOpen] = useState(false);
  const [createConfigMapOpen, setCreateConfigMapOpen] = useState(false);
  const [createSecretOpen, setCreateSecretOpen] = useState(false);
  const [newConfigMap, setNewConfigMap] = useState({ name: '', namespace: 'default', data: {} });
  const [newSecret, setNewSecret] = useState({ name: '', namespace: 'default', data: {}, type: 'Opaque' });
  const [configMapKeyValue, setConfigMapKeyValue] = useState({ key: '', value: '' });
  const [secretKeyValue, setSecretKeyValue] = useState({ key: '', value: '' });
  
  // YAML Customization
  const [deployMode, setDeployMode] = useState('form'); // 'form' | 'yaml'
  const [customYaml, setCustomYaml] = useState('');
  
  // Quick Deploy Form
  const [deployConfig, setDeployConfig] = useState({
    imageName: '',
    imageTag: 'latest',
    deploymentName: '',
    namespace: 'default',
    replicas: 1,
    containerPort: 8080,
    servicePort: 80,
    serviceType: 'ClusterIP',
    createService: true,
    envVars: [],
    resourceRequests: { cpu: '100m', memory: '128Mi' },
    resourceLimits: { cpu: '500m', memory: '512Mi' },
  });
  
  // New Namespace Form
  const [newNamespaceName, setNewNamespaceName] = useState('');
  
  // Port Forward Form (for future use)
  // eslint-disable-next-line no-unused-vars
  const [portForwardConfig, setPortForwardConfig] = useState({
    resourceType: 'pod',
    name: '',
    namespace: 'default',
    localPort: 8080,
    targetPort: 8080,
  });
  // eslint-disable-next-line no-unused-vars
  const [portForwardCommand, setPortForwardCommand] = useState('');

  // Generate YAML from deploy config
  const generateYamlFromConfig = useCallback((config) => {
    const name = config.deploymentName || config.imageName.split('/').pop().split(':')[0];
    const fullImage = config.imageName.includes(':') ? config.imageName : `${config.imageName}:${config.imageTag}`;
    
    const deployment = {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: {
        name,
        namespace: config.namespace,
        labels: { app: name, 'managed-by': 'eks-deployer' },
      },
      spec: {
        replicas: config.replicas,
        selector: { matchLabels: { app: name } },
        template: {
          metadata: { labels: { app: name } },
          spec: {
            containers: [{
              name,
              image: fullImage,
              imagePullPolicy: 'IfNotPresent',
              ports: [{ containerPort: config.containerPort }],
              env: config.envVars?.map(e => ({ name: e.name, value: e.value })) || [],
              resources: {
                requests: config.resourceRequests,
                limits: config.resourceLimits,
              },
            }],
          },
        },
      },
    };

    const manifests = [deployment];
    
    if (config.createService) {
      const service = {
        apiVersion: 'v1',
        kind: 'Service',
        metadata: {
          name: `${name}-svc`,
          namespace: config.namespace,
          labels: { app: name, 'managed-by': 'eks-deployer' },
        },
        spec: {
          type: config.serviceType,
          selector: { app: name },
          ports: [{
            port: config.servicePort,
            targetPort: config.containerPort,
            protocol: 'TCP',
          }],
        },
      };
      manifests.push(service);
    }

    return manifests.map(m => yaml.dump(m)).join('---\n');
  }, []);
  
  // Loading & Error
  const [loading, setLoading] = useState({});
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // ==========================================
  // DATA FETCHING
  // ==========================================

  const fetchPrerequisites = useCallback(async () => {
    try {
      setLoading(l => ({ ...l, prerequisites: true }));
      const response = await api.get('/container-deployments/prerequisites');
      setPrerequisites(response.data.data);
    } catch (err) {
      console.error('Failed to fetch prerequisites', err);
      setError('Failed to check prerequisites: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(l => ({ ...l, prerequisites: false }));
    }
  }, []);

  // Storage Fetch Functions
  const fetchStorageClasses = useCallback(async () => {
    try {
      setLoading(l => ({ ...l, storageClasses: true }));
      const response = await api.get('/container-deployments/storage/classes');
      setStorageClasses(response.data.data?.storageClasses || []);
    } catch (err) {
      console.error('Failed to fetch StorageClasses', err);
    } finally {
      setLoading(l => ({ ...l, storageClasses: false }));
    }
  }, []);

  const fetchStorageClassTemplates = useCallback(async () => {
    try {
      const response = await api.get('/container-deployments/storage/classes/templates');
      setStorageClassTemplates(response.data.data?.templates || {});
    } catch (err) {
      console.error('Failed to fetch StorageClass templates', err);
    }
  }, []);

  const fetchPVCs = useCallback(async (namespace = null) => {
    try {
      setLoading(l => ({ ...l, pvcs: true }));
      const url = namespace 
        ? `/container-deployments/storage/pvcs?namespace=${namespace}`
        : '/container-deployments/storage/pvcs';
      const response = await api.get(url);
      setPvcs(response.data.data?.pvcs || []);
    } catch (err) {
      console.error('Failed to fetch PVCs', err);
    } finally {
      setLoading(l => ({ ...l, pvcs: false }));
    }
  }, []);

  const fetchPVs = useCallback(async () => {
    try {
      setLoading(l => ({ ...l, pvs: true }));
      const response = await api.get('/container-deployments/storage/pvs');
      setPvs(response.data.data?.pvs || []);
    } catch (err) {
      console.error('Failed to fetch PVs', err);
    } finally {
      setLoading(l => ({ ...l, pvs: false }));
    }
  }, []);

  const fetchCSIDriverStatus = useCallback(async () => {
    try {
      setLoading(l => ({ ...l, csiDrivers: true }));
      const response = await api.get('/container-deployments/storage/csi-drivers');
      setCsiDriverStatus(response.data.data || { ebs: { installed: false }, efs: { installed: false } });
    } catch (err) {
      console.error('Failed to fetch CSI driver status', err);
    } finally {
      setLoading(l => ({ ...l, csiDrivers: false }));
    }
  }, []);

  // Network/Cluster Config Fetch Functions
  const fetchClusterEndpointConfig = useCallback(async () => {
    if (!selectedCredential || !selectedCluster) return;
    try {
      setLoading(l => ({ ...l, endpointConfig: true }));
      const response = await api.get(`/container-deployments/cluster/${selectedCredential}/endpoint-config`, {
        params: { clusterName: selectedCluster.name, region: selectedRegion }
      });
      setClusterEndpointConfig(response.data.data);
    } catch (err) {
      console.error('Failed to fetch cluster endpoint config', err);
    } finally {
      setLoading(l => ({ ...l, endpointConfig: false }));
    }
  }, [selectedCredential, selectedCluster, selectedRegion]);

  const fetchSubnets = useCallback(async (vpcId = null) => {
    if (!selectedCredential) return;
    try {
      setLoading(l => ({ ...l, subnets: true }));
      const params = { region: selectedRegion };
      if (vpcId) params.vpcId = vpcId;
      if (clusterEndpointConfig?.subnetIds) {
        params.subnetIds = clusterEndpointConfig.subnetIds.join(',');
      }
      const response = await api.get(`/container-deployments/vpc/${selectedCredential}/subnets`, { params });
      setSubnets(response.data.data?.subnets || []);
    } catch (err) {
      console.error('Failed to fetch subnets', err);
    } finally {
      setLoading(l => ({ ...l, subnets: false }));
    }
  }, [selectedCredential, selectedRegion, clusterEndpointConfig?.subnetIds]);

  const fetchSecurityGroups = useCallback(async (vpcId = null) => {
    if (!selectedCredential) return;
    try {
      setLoading(l => ({ ...l, securityGroups: true }));
      const params = { region: selectedRegion };
      if (vpcId) params.vpcId = vpcId;
      if (clusterEndpointConfig?.securityGroupIds) {
        params.securityGroupIds = [
          ...(clusterEndpointConfig.securityGroupIds || []),
          clusterEndpointConfig.clusterSecurityGroupId
        ].filter(Boolean).join(',');
      }
      const response = await api.get(`/container-deployments/vpc/${selectedCredential}/security-groups`, { params });
      setSecurityGroups(response.data.data?.securityGroups || []);
    } catch (err) {
      console.error('Failed to fetch security groups', err);
    } finally {
      setLoading(l => ({ ...l, securityGroups: false }));
    }
  }, [selectedCredential, selectedRegion, clusterEndpointConfig?.securityGroupIds, clusterEndpointConfig?.clusterSecurityGroupId]);

  const fetchLoadBalancers = useCallback(async (vpcId = null) => {
    if (!selectedCredential) return;
    try {
      setLoading(l => ({ ...l, loadBalancers: true }));
      const params = { region: selectedRegion };
      if (vpcId) params.vpcId = vpcId;
      const response = await api.get(`/container-deployments/vpc/${selectedCredential}/load-balancers`, { params });
      setLoadBalancers(response.data.data?.loadBalancers || []);
    } catch (err) {
      console.error('Failed to fetch load balancers', err);
    } finally {
      setLoading(l => ({ ...l, loadBalancers: false }));
    }
  }, [selectedCredential, selectedRegion]);

  // eslint-disable-next-line no-unused-vars
  const fetchVpcDetails = useCallback(async (vpcId) => {
    if (!selectedCredential || !vpcId) return;
    try {
      const response = await api.get(`/container-deployments/vpc/${selectedCredential}/details`, {
        params: { region: selectedRegion, vpcId }
      });
      setVpcDetails(response.data.data);
    } catch (err) {
      console.error('Failed to fetch VPC details', err);
    }
  }, [selectedCredential, selectedRegion]);

  const fetchInternalLbTemplates = useCallback(async () => {
    try {
      const response = await api.get('/container-deployments/templates/internal-lb');
      setInternalLbTemplates(response.data.data?.templates || {});
    } catch (err) {
      console.error('Failed to fetch internal LB templates', err);
    }
  }, []);

  // Phase 4: Operations Fetch Functions
  const fetchConfigMaps = useCallback(async (namespace = selectedNamespace) => {
    try {
      setLoading(l => ({ ...l, configMaps: true }));
      const response = await api.get('/container-deployments/k8s/configmaps', {
        params: { namespace }
      });
      setConfigMaps(response.data.data?.configMaps || []);
    } catch (err) {
      console.error('Failed to fetch ConfigMaps', err);
    } finally {
      setLoading(l => ({ ...l, configMaps: false }));
    }
  }, [selectedNamespace]);

  const fetchSecrets = useCallback(async (namespace = selectedNamespace) => {
    try {
      setLoading(l => ({ ...l, secrets: true }));
      const response = await api.get('/container-deployments/k8s/secrets', {
        params: { namespace }
      });
      setSecrets(response.data.data?.secrets || []);
    } catch (err) {
      console.error('Failed to fetch Secrets', err);
    } finally {
      setLoading(l => ({ ...l, secrets: false }));
    }
  }, [selectedNamespace]);

  const fetchMetricsServerStatus = useCallback(async () => {
    try {
      setLoading(l => ({ ...l, metricsServer: true }));
      const response = await api.get('/container-deployments/k8s/metrics-server/status');
      setMetricsServerStatus(response.data.data);
    } catch (err) {
      console.error('Failed to fetch Metrics Server status', err);
      setMetricsServerStatus({ installed: false, ready: false });
    } finally {
      setLoading(l => ({ ...l, metricsServer: false }));
    }
  }, []);

  const fetchClusterAutoscalerStatus = useCallback(async () => {
    try {
      setLoading(l => ({ ...l, clusterAutoscaler: true }));
      const response = await api.get('/container-deployments/k8s/cluster-autoscaler/status');
      setClusterAutoscalerStatus(response.data.data);
    } catch (err) {
      console.error('Failed to fetch Cluster Autoscaler status', err);
      setClusterAutoscalerStatus({ installed: false, ready: false });
    } finally {
      setLoading(l => ({ ...l, clusterAutoscaler: false }));
    }
  }, []);

  const fetchNodeMetrics = useCallback(async () => {
    try {
      setLoading(l => ({ ...l, nodeMetrics: true }));
      const response = await api.get('/container-deployments/k8s/metrics/nodes');
      setNodeMetrics(response.data.data?.metrics || []);
    } catch (err) {
      console.error('Failed to fetch node metrics', err);
    } finally {
      setLoading(l => ({ ...l, nodeMetrics: false }));
    }
  }, []);

  // eslint-disable-next-line no-unused-vars
  const fetchPodMetrics = useCallback(async (namespace = selectedNamespace) => {
    try {
      setLoading(l => ({ ...l, podMetrics: true }));
      const response = await api.get('/container-deployments/k8s/metrics/pods', {
        params: { namespace }
      });
      setPodMetrics(response.data.data?.metrics || []);
    } catch (err) {
      console.error('Failed to fetch pod metrics', err);
    } finally {
      setLoading(l => ({ ...l, podMetrics: false }));
    }
  }, [selectedNamespace]);

  const fetchNodeHealth = useCallback(async () => {
    try {
      setLoading(l => ({ ...l, nodeHealth: true }));
      const response = await api.get('/container-deployments/k8s/nodes/health');
      setNodeHealth(response.data.data?.nodes || []);
    } catch (err) {
      console.error('Failed to fetch node health', err);
    } finally {
      setLoading(l => ({ ...l, nodeHealth: false }));
    }
  }, []);

  const fetchProblematicPods = useCallback(async (namespace = 'all') => {
    try {
      setLoading(l => ({ ...l, problematicPods: true }));
      const response = await api.get('/container-deployments/k8s/pods/problematic', {
        params: { namespace }
      });
      setProblematicPods(response.data.data?.pods || []);
    } catch (err) {
      console.error('Failed to fetch problematic pods', err);
    } finally {
      setLoading(l => ({ ...l, problematicPods: false }));
    }
  }, []);

  const fetchTroubleshootingChecklist = useCallback(async (issueType) => {
    try {
      const response = await api.get(`/container-deployments/troubleshooting/${issueType}`);
      setTroubleshootingChecklist(response.data.data?.checklist || []);
    } catch (err) {
      console.error('Failed to fetch troubleshooting checklist', err);
    }
  }, []);

  // ==========================================
  // PHASE 5: ADVANCED FEATURES DATA FETCHING
  // ==========================================

  const fetchHelmRepos = useCallback(async () => {
    try {
      setLoading(l => ({ ...l, helmRepos: true }));
      const response = await api.get('/container-deployments/helm/repos');
      setHelmRepos(response.data.data?.repos || []);
    } catch (err) {
      console.error('Failed to fetch Helm repos', err);
    } finally {
      setLoading(l => ({ ...l, helmRepos: false }));
    }
  }, []);

  const searchHelmCharts = useCallback(async (keyword = '') => {
    try {
      setLoading(l => ({ ...l, helmCharts: true }));
      const response = await api.get('/container-deployments/helm/charts/search', {
        params: { keyword }
      });
      setHelmCharts(response.data.data?.charts || []);
    } catch (err) {
      console.error('Failed to search Helm charts', err);
    } finally {
      setLoading(l => ({ ...l, helmCharts: false }));
    }
  }, []);

  const fetchHelmReleases = useCallback(async (namespace = 'all') => {
    try {
      setLoading(l => ({ ...l, helmReleases: true }));
      const response = await api.get('/container-deployments/helm/releases', {
        params: { namespace }
      });
      setHelmReleases(response.data.data?.releases || []);
    } catch (err) {
      console.error('Failed to fetch Helm releases', err);
    } finally {
      setLoading(l => ({ ...l, helmReleases: false }));
    }
  }, []);

  const fetchHelmReleaseHistory = useCallback(async (releaseName, namespace) => {
    try {
      const response = await api.get(`/container-deployments/helm/releases/${releaseName}/history`, {
        params: { namespace }
      });
      setHelmReleaseHistory(response.data.data?.history || []);
    } catch (err) {
      console.error('Failed to fetch Helm release history', err);
    }
  }, []);

  const fetchStatefulSets = useCallback(async (namespace = 'default') => {
    try {
      setLoading(l => ({ ...l, statefulSets: true }));
      const response = await api.get('/container-deployments/k8s/statefulsets', {
        params: { namespace }
      });
      setStatefulSets(response.data.data?.statefulsets || []);
    } catch (err) {
      console.error('Failed to fetch StatefulSets', err);
    } finally {
      setLoading(l => ({ ...l, statefulSets: false }));
    }
  }, []);

  const fetchStatefulSetTemplates = useCallback(async () => {
    try {
      const response = await api.get('/container-deployments/k8s/statefulset-templates');
      setStatefulSetTemplates(response.data.data?.templates || []);
    } catch (err) {
      console.error('Failed to fetch StatefulSet templates', err);
    }
  }, []);

  const fetchPortForwards = useCallback(async () => {
    try {
      const response = await api.get('/container-deployments/port-forwards');
      setPortForwards(response.data.data?.forwards || []);
    } catch (err) {
      console.error('Failed to fetch port forwards', err);
    }
  }, []);

  const fetchPortForwardTemplates = useCallback(async () => {
    try {
      const response = await api.get('/container-deployments/port-forwards/templates');
      setPortForwardTemplates(response.data.data?.templates || []);
    } catch (err) {
      console.error('Failed to fetch port forward templates', err);
    }
  }, []);

  const fetchBastionGuide = useCallback(async (provider = 'aws') => {
    try {
      const params = { provider };
      if (selectedCluster) {
        params.clusterName = selectedCluster.name;
        params.region = selectedRegion;
      }
      const response = await api.get('/container-deployments/bastion/guide', { params });
      setBastionGuide(response.data.data?.guide || null);
    } catch (err) {
      console.error('Failed to fetch bastion guide', err);
    }
  }, [selectedCluster, selectedRegion]);

  const fetchK8sContext = useCallback(async () => {
    try {
      setLoading(l => ({ ...l, context: true }));
      const response = await api.get('/container-deployments/k8s/context');
      setK8sContext(response.data.data?.context);
    } catch (err) {
      console.error('Failed to fetch K8s context', err);
    } finally {
      setLoading(l => ({ ...l, context: false }));
    }
  }, []);

  const fetchLocalImages = useCallback(async () => {
    try {
      setLoading(l => ({ ...l, images: true }));
      const response = await api.get('/container-deployments/docker/local-images');
      setLocalImages(response.data.data?.images || []);
    } catch (err) {
      console.error('Failed to fetch local images', err);
    } finally {
      setLoading(l => ({ ...l, images: false }));
    }
  }, []);

  const fetchContainers = useCallback(async () => {
    try {
      setLoading(l => ({ ...l, containers: true }));
      const response = await api.get('/container-deployments/docker/containers');
      setContainers(response.data.data?.containers || []);
    } catch (err) {
      console.error('Failed to fetch containers', err);
    } finally {
      setLoading(l => ({ ...l, containers: false }));
    }
  }, []);

  const fetchDockerInfo = useCallback(async () => {
    try {
      const response = await api.get('/container-deployments/docker/info');
      setDockerInfo(response.data.data?.info);
    } catch (err) {
      console.error('Failed to fetch docker info', err);
    }
  }, []);

  const fetchNamespaces = useCallback(async () => {
    try {
      setLoading(l => ({ ...l, namespaces: true }));
      const response = await api.get('/container-deployments/k8s/namespaces');
      setNamespaces(response.data.data?.namespaces || []);
    } catch (err) {
      console.error('Failed to fetch namespaces', err);
    } finally {
      setLoading(l => ({ ...l, namespaces: false }));
    }
  }, []);

  const fetchNamespaceResources = useCallback(async (namespace) => {
    try {
      setLoading(l => ({ ...l, resources: true }));
      const [deploymentsRes, servicesRes, podsRes, configMapsRes, secretsRes, eventsRes] = await Promise.all([
        api.get(`/container-deployments/k8s/namespaces/${namespace}/deployments`),
        api.get(`/container-deployments/k8s/namespaces/${namespace}/services`),
        api.get(`/container-deployments/k8s/namespaces/${namespace}/pods`),
        api.get(`/container-deployments/k8s/namespaces/${namespace}/configmaps`),
        api.get(`/container-deployments/k8s/namespaces/${namespace}/secrets`),
        api.get(`/container-deployments/k8s/namespaces/${namespace}/events`),
      ]);
      
      setK8sDeployments(deploymentsRes.data.data?.deployments || []);
      setK8sServices(servicesRes.data.data?.services || []);
      setK8sPods(podsRes.data.data?.pods || []);
      setK8sConfigMaps(configMapsRes.data.data?.configmaps || []);
      setK8sSecrets(secretsRes.data.data?.secrets || []);
      setK8sEvents(eventsRes.data.data?.events || []);
    } catch (err) {
      console.error('Failed to fetch namespace resources', err);
    } finally {
      setLoading(l => ({ ...l, resources: false }));
    }
  }, []);

  const fetchResourceUsage = useCallback(async (namespace) => {
    try {
      const response = await api.get(`/container-deployments/k8s/namespaces/${namespace}/resources`);
      setResourceUsage(response.data.data);
    } catch (err) {
      console.error('Failed to fetch resource usage', err);
    }
  }, []);

  const fetchResourceDescription = async (resourceType, name, namespace) => {
    try {
      setLoading(l => ({ ...l, description: true }));
      const response = await api.post(`/container-deployments/k8s/namespaces/${namespace}/describe`, {
        resourceType,
        name,
      });
      setResourceDescription(response.data.data?.description || '');
    } catch (err) {
      setError('Failed to fetch resource description');
    } finally {
      setLoading(l => ({ ...l, description: false }));
    }
  };

  const fetchPodLogs = async (namespace, podName, options = {}) => {
    try {
      setLoading(l => ({ ...l, logs: true }));
      const params = new URLSearchParams({
        tail: options.tail || 200,
        ...(options.container && { container: options.container }),
        ...(options.previous && { previous: 'true' }),
      });
      const response = await api.get(`/container-deployments/k8s/namespaces/${namespace}/pods/${podName}/logs?${params}`);
      setPodLogs(response.data.data?.logs || '');
    } catch (err) {
      setPodLogs('Failed to fetch logs: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(l => ({ ...l, logs: false }));
    }
  };

  // Cloud Provider Data Fetching
  const fetchCredentials = useCallback(async () => {
    try {
      setLoading(l => ({ ...l, credentials: true }));
      const response = await api.get('/credentials');
      // Filter to only cloud provider credentials (aws, azure, gcp, digitalocean, linode)
      const cloudCredentials = (response.data.data?.credentials || []).filter(
        c => ['aws', 'azure', 'gcp', 'digitalocean', 'linode'].includes(c.cloudProvider)
      );
      setCredentials(cloudCredentials);
    } catch (err) {
      console.error('Failed to fetch credentials', err);
    } finally {
      setLoading(l => ({ ...l, credentials: false }));
    }
  }, []);

  const fetchRegions = useCallback(async (credentialId) => {
    if (!credentialId) return;
    try {
      setLoading(l => ({ ...l, regions: true }));
      const response = await api.get(`/container-deployments/cloud/regions/${credentialId}`);
      // Backend returns: { data: { regions: { provider, defaultRegion, configuredRegions, availableRegions: [{id, name}] } } }
      const regionData = response.data.data?.regions;
      const regions = regionData?.availableRegions || [];
      setAvailableRegions(regions);
      // Auto-select default region or first region if available
      if (regionData?.defaultRegion) {
        setSelectedRegion(regionData.defaultRegion);
      } else if (regions.length > 0) {
        setSelectedRegion(regions[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch regions', err);
      setAvailableRegions([]);
    } finally {
      setLoading(l => ({ ...l, regions: false }));
    }
  }, []);

  const fetchCloudRegistries = useCallback(async (credentialId, region) => {
    if (!credentialId) return;
    try {
      setLoading(l => ({ ...l, cloudRegistries: true }));
      const params = new URLSearchParams();
      if (region) params.append('region', region);
      const response = await api.get(`/container-deployments/cloud/registries/${credentialId}?${params}`);
      setCloudRegistries(response.data.data?.registries || []);
    } catch (err) {
      console.error('Failed to fetch cloud registries', err);
      setError('Failed to fetch cloud registries: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(l => ({ ...l, cloudRegistries: false }));
    }
  }, []);

  const fetchCloudClusters = useCallback(async (credentialId, region) => {
    if (!credentialId) return;
    try {
      setLoading(l => ({ ...l, cloudClusters: true }));
      const params = new URLSearchParams();
      if (region) params.append('region', region);
      const response = await api.get(`/container-deployments/cloud/clusters/${credentialId}?${params}`);
      setCloudClusters(response.data.data?.clusters || []);
    } catch (err) {
      console.error('Failed to fetch cloud clusters', err);
      setError('Failed to fetch cloud clusters: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(l => ({ ...l, cloudClusters: false }));
    }
  }, []);

  const fetchCloudRegistryImages = useCallback(async (credentialId, registryUri, options = {}) => {
    if (!credentialId || !registryUri) return;
    try {
      setLoading(l => ({ ...l, cloudImages: true }));
      const params = new URLSearchParams({
        registryUri,
        ...(options.region && { region: options.region }),
        ...(options.limit && { limit: options.limit }),
      });
      const response = await api.get(`/container-deployments/cloud/registries/${credentialId}/images?${params}`);
      setCloudRegistryImages(response.data.data?.images || []);
    } catch (err) {
      console.error('Failed to fetch registry images', err);
    } finally {
      setLoading(l => ({ ...l, cloudImages: false }));
    }
  }, []);

  // ==========================================
  // EFFECTS
  // ==========================================

  useEffect(() => {
    fetchPrerequisites();
    fetchK8sContext();
    fetchLocalImages();
    fetchContainers();
    fetchDockerInfo();
    fetchNamespaces();
    fetchCredentials();
  }, [fetchPrerequisites, fetchK8sContext, fetchLocalImages, fetchContainers, fetchDockerInfo, fetchNamespaces, fetchCredentials]);

  // Fetch storage data when storage tab is selected
  useEffect(() => {
    if (selectedView === 'storage') {
      fetchStorageClasses();
      fetchPVCs();
      fetchPVs();
      fetchCSIDriverStatus();
      fetchStorageClassTemplates();
    }
  }, [selectedView, fetchStorageClasses, fetchPVCs, fetchPVs, fetchCSIDriverStatus, fetchStorageClassTemplates]);

  useEffect(() => {
    if (selectedNamespace) {
      fetchNamespaceResources(selectedNamespace);
      fetchResourceUsage(selectedNamespace);
    }
  }, [selectedNamespace, fetchNamespaceResources, fetchResourceUsage]);

  // Fetch regions when credential is selected
  useEffect(() => {
    if (selectedCredential) {
      fetchRegions(selectedCredential);
      setSelectedRegion('');
      setCloudRegistries([]);
      setCloudClusters([]);
    } else {
      setAvailableRegions([]);
      setSelectedRegion('');
      setCloudRegistries([]);
      setCloudClusters([]);
    }
  }, [selectedCredential, fetchRegions]);

  // Fetch cloud resources when region is selected
  useEffect(() => {
    if (selectedCredential && selectedRegion) {
      fetchCloudRegistries(selectedCredential, selectedRegion);
      fetchCloudClusters(selectedCredential, selectedRegion);
    }
  }, [selectedCredential, selectedRegion, fetchCloudRegistries, fetchCloudClusters]);

  // Fetch registry images when a registry is selected
  useEffect(() => {
    if (selectedCredential && selectedRegistry) {
      fetchCloudRegistryImages(selectedCredential, selectedRegistry.uri, { region: selectedRegistry.region });
    } else {
      setCloudRegistryImages([]);
      setSelectedCloudImage(null);
    }
  }, [selectedCredential, selectedRegistry, fetchCloudRegistryImages]);

  // ==========================================
  // ACTIONS
  // ==========================================

  // Storage Actions
  const handleCreateStorageClass = async () => {
    try {
      setLoading(l => ({ ...l, createSc: true }));
      await api.post('/container-deployments/storage/classes', newStorageClass);
      setSuccess(`Created StorageClass: ${newStorageClass.name}`);
      setCreateStorageClassOpen(false);
      setNewStorageClass({
        name: '',
        provisioner: '',
        reclaimPolicy: 'Delete',
        volumeBindingMode: 'WaitForFirstConsumer',
        allowVolumeExpansion: true,
        isDefault: false,
        parameters: {},
      });
      fetchStorageClasses();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create StorageClass');
    } finally {
      setLoading(l => ({ ...l, createSc: false }));
    }
  };

  const handleDeleteStorageClass = async (name) => {
    if (!window.confirm(`Are you sure you want to delete StorageClass "${name}"?`)) return;
    try {
      setLoading(l => ({ ...l, deleteSc: true }));
      await api.delete(`/container-deployments/storage/classes/${name}`);
      setSuccess(`Deleted StorageClass: ${name}`);
      fetchStorageClasses();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete StorageClass');
    } finally {
      setLoading(l => ({ ...l, deleteSc: false }));
    }
  };

  const handleApplyTemplate = (templateKey) => {
    const template = storageClassTemplates[templateKey];
    if (template) {
      setNewStorageClass({
        name: template.name,
        provisioner: template.provisioner,
        reclaimPolicy: template.reclaimPolicy || 'Delete',
        volumeBindingMode: template.volumeBindingMode || 'WaitForFirstConsumer',
        allowVolumeExpansion: template.allowVolumeExpansion || false,
        isDefault: false,
        parameters: template.parameters || {},
      });
    }
  };

  const handleCreatePVC = async () => {
    try {
      setLoading(l => ({ ...l, createPvc: true }));
      await api.post('/container-deployments/storage/pvcs', newPvc);
      setSuccess(`Created PVC: ${newPvc.name} in ${newPvc.namespace}`);
      setCreatePvcOpen(false);
      setNewPvc({
        name: '',
        namespace: 'default',
        storageClass: '',
        accessModes: ['ReadWriteOnce'],
        storage: '10Gi',
      });
      fetchPVCs();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create PVC');
    } finally {
      setLoading(l => ({ ...l, createPvc: false }));
    }
  };

  const handleDeletePVC = async (name, namespace) => {
    if (!window.confirm(`Are you sure you want to delete PVC "${name}" from namespace "${namespace}"?`)) return;
    try {
      setLoading(l => ({ ...l, deletePvc: true }));
      await api.delete(`/container-deployments/storage/pvcs/${namespace}/${name}`);
      setSuccess(`Deleted PVC: ${name}`);
      fetchPVCs();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete PVC');
    } finally {
      setLoading(l => ({ ...l, deletePvc: false }));
    }
  };

  const handleInstallEBSCSI = async () => {
    if (!selectedCredential || !selectedCluster) {
      setError('Please select a credential and cluster first');
      return;
    }
    try {
      setLoading(l => ({ ...l, installEbs: true }));
      await api.post('/container-deployments/storage/addons/ebs-csi', {
        credentialId: selectedCredential,
        clusterName: selectedCluster.name,
        region: selectedRegion,
      });
      setSuccess('EBS CSI Driver installation initiated. This may take a few minutes.');
      setTimeout(fetchCSIDriverStatus, 30000); // Check again in 30 seconds
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to install EBS CSI Driver');
    } finally {
      setLoading(l => ({ ...l, installEbs: false }));
    }
  };

  const handleInstallEFSCSI = async () => {
    try {
      setLoading(l => ({ ...l, installEfs: true }));
      await api.post('/container-deployments/storage/addons/efs-csi');
      setSuccess('EFS CSI Driver installed successfully');
      fetchCSIDriverStatus();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to install EFS CSI Driver');
    } finally {
      setLoading(l => ({ ...l, installEfs: false }));
    }
  };

  // Network/Cluster Config Actions
  const handleUpdateEndpointConfig = async ({ publicAccess, privateAccess }) => {
    if (!selectedCredential || !selectedCluster) {
      setError('Please select a credential and cluster first');
      return;
    }
    
    // Warn if disabling public access
    if (!publicAccess && !window.confirm(
      'Warning: Disabling public endpoint access will make the cluster only accessible from within the VPC. ' +
      'Make sure you have a bastion host or VPN configured. Continue?'
    )) {
      return;
    }

    try {
      setEndpointUpdatePending(true);
      setLoading(l => ({ ...l, updateEndpoint: true }));
      await api.put(`/container-deployments/cluster/${selectedCredential}/endpoint-config`, {
        clusterName: selectedCluster.name,
        region: selectedRegion,
        endpointPublicAccess: publicAccess,
        endpointPrivateAccess: privateAccess,
      });
      setSuccess('Cluster endpoint configuration update initiated. This may take several minutes.');
      // Refresh after a delay
      setTimeout(() => {
        fetchClusterEndpointConfig();
        setEndpointUpdatePending(false);
      }, 30000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update endpoint configuration');
      setEndpointUpdatePending(false);
    } finally {
      setLoading(l => ({ ...l, updateEndpoint: false }));
    }
  };

  const handleToggleSubnetTag = async (subnetId, tagKey, currentValue) => {
    if (!selectedCredential) {
      setError('Please select a credential first');
      return;
    }

    try {
      setLoading(l => ({ ...l, subnetTags: true }));
      
      if (currentValue) {
        // Remove the tag
        await api.put(`/container-deployments/vpc/${selectedCredential}/subnets/${subnetId}/tags`, {
          region: selectedRegion,
          tagsToRemove: [tagKey],
        });
        setSuccess(`Removed tag ${tagKey} from subnet`);
      } else {
        // Add the tag with value "1"
        await api.put(`/container-deployments/vpc/${selectedCredential}/subnets/${subnetId}/tags`, {
          region: selectedRegion,
          tagsToAdd: { [tagKey]: '1' },
        });
        setSuccess(`Added tag ${tagKey} to subnet`);
      }
      
      // Refresh subnets
      fetchSubnets(clusterEndpointConfig?.vpcId);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update subnet tags');
    } finally {
      setLoading(l => ({ ...l, subnetTags: false }));
    }
  };

  // Phase 4: Operations Actions
  const handleCreateConfigMap = async () => {
    try {
      setLoading(l => ({ ...l, createConfigMap: true }));
      await api.post('/container-deployments/k8s/configmaps', newConfigMap);
      setSuccess(`ConfigMap ${newConfigMap.name} created`);
      setCreateConfigMapOpen(false);
      setNewConfigMap({ name: '', namespace: 'default', data: {} });
      fetchConfigMaps(newConfigMap.namespace);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create ConfigMap');
    } finally {
      setLoading(l => ({ ...l, createConfigMap: false }));
    }
  };

  const handleDeleteConfigMap = async (name, namespace) => {
    if (!window.confirm(`Delete ConfigMap "${name}"?`)) return;
    
    try {
      await api.delete(`/container-deployments/k8s/configmaps/${name}`, {
        params: { namespace }
      });
      setSuccess(`ConfigMap ${name} deleted`);
      fetchConfigMaps(namespace);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete ConfigMap');
    }
  };

  const handleCreateSecret = async () => {
    try {
      setLoading(l => ({ ...l, createSecret: true }));
      await api.post('/container-deployments/k8s/secrets', newSecret);
      setSuccess(`Secret ${newSecret.name} created`);
      setCreateSecretOpen(false);
      setNewSecret({ name: '', namespace: 'default', data: {}, type: 'Opaque' });
      fetchSecrets(newSecret.namespace);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create Secret');
    } finally {
      setLoading(l => ({ ...l, createSecret: false }));
    }
  };

  const handleDeleteSecret = async (name, namespace) => {
    if (!window.confirm(`Delete Secret "${name}"? This action cannot be undone.`)) return;
    
    try {
      await api.delete(`/container-deployments/k8s/secrets/${name}`, {
        params: { namespace }
      });
      setSuccess(`Secret ${name} deleted`);
      fetchSecrets(namespace);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete Secret');
    }
  };

  const handleInstallMetricsServer = async () => {
    try {
      setLoading(l => ({ ...l, installMetricsServer: true }));
      await api.post('/container-deployments/k8s/metrics-server/install');
      setSuccess('Metrics Server installation initiated. It may take a few minutes to become ready.');
      setTimeout(fetchMetricsServerStatus, 30000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to install Metrics Server');
    } finally {
      setLoading(l => ({ ...l, installMetricsServer: false }));
    }
  };

  const handleInstallClusterAutoscaler = async () => {
    if (!selectedCluster) {
      setError('Please select a cluster first');
      return;
    }
    
    try {
      setLoading(l => ({ ...l, installAutoscaler: true }));
      await api.post('/container-deployments/k8s/cluster-autoscaler/install', {
        clusterName: selectedCluster.name,
        region: selectedRegion,
      });
      setSuccess('Cluster Autoscaler installation initiated. Note: You need to configure IAM permissions.');
      setTimeout(fetchClusterAutoscalerStatus, 30000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to install Cluster Autoscaler');
    } finally {
      setLoading(l => ({ ...l, installAutoscaler: false }));
    }
  };

  const handleBulkDeletePods = async () => {
    if (problematicPods.length === 0) {
      setError('No problematic pods to delete');
      return;
    }
    
    if (!window.confirm(`Delete ${problematicPods.length} problematic pods? They will be recreated by their controllers if applicable.`)) {
      return;
    }
    
    try {
      setLoading(l => ({ ...l, bulkDelete: true }));
      const pods = problematicPods.map(p => ({ name: p.name, namespace: p.namespace }));
      const result = await api.post('/container-deployments/k8s/pods/bulk-delete', { pods });
      setSuccess(result.data.data?.message || 'Pods deleted');
      fetchProblematicPods();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete pods');
    } finally {
      setLoading(l => ({ ...l, bulkDelete: false }));
    }
  };

  // ==========================================
  // PHASE 5: ADVANCED FEATURES HANDLERS
  // ==========================================

  const handleAddHelmRepo = async () => {
    try {
      setLoading(l => ({ ...l, addHelmRepo: true }));
      await api.post('/container-deployments/helm/repos', newHelmRepo);
      setSuccess(`Added Helm repository: ${newHelmRepo.name}`);
      setAddHelmRepoOpen(false);
      setNewHelmRepo({ name: '', url: '', username: '', password: '' });
      fetchHelmRepos();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add Helm repository');
    } finally {
      setLoading(l => ({ ...l, addHelmRepo: false }));
    }
  };

  const handleRemoveHelmRepo = async (repoName) => {
    if (!window.confirm(`Remove Helm repository "${repoName}"?`)) return;
    
    try {
      await api.delete(`/container-deployments/helm/repos/${repoName}`);
      setSuccess(`Removed Helm repository: ${repoName}`);
      fetchHelmRepos();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove Helm repository');
    }
  };

  const handleInstallHelmChart = async () => {
    try {
      setLoading(l => ({ ...l, installHelmChart: true }));
      await api.post('/container-deployments/helm/releases', {
        ...newHelmInstall,
        values: newHelmInstall.values || undefined
      });
      setSuccess(`Installed Helm release: ${newHelmInstall.releaseName}`);
      setInstallHelmChartOpen(false);
      setNewHelmInstall({
        releaseName: '', chartName: '', namespace: 'default', version: '', values: '', createNamespace: true
      });
      fetchHelmReleases();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to install Helm chart');
    } finally {
      setLoading(l => ({ ...l, installHelmChart: false }));
    }
  };

  const handleUninstallHelmRelease = async (releaseName, namespace) => {
    if (!window.confirm(`Uninstall Helm release "${releaseName}"?`)) return;
    
    try {
      await api.delete(`/container-deployments/helm/releases/${releaseName}`, {
        params: { namespace }
      });
      setSuccess(`Uninstalled Helm release: ${releaseName}`);
      fetchHelmReleases();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to uninstall Helm release');
    }
  };

  const handleRollbackHelmRelease = async (releaseName, revision, namespace) => {
    if (!window.confirm(`Rollback "${releaseName}" to revision ${revision}?`)) return;
    
    try {
      await api.post(`/container-deployments/helm/releases/${releaseName}/rollback`, {
        revision,
        namespace
      });
      setSuccess(`Rolled back ${releaseName} to revision ${revision}`);
      fetchHelmReleases();
      if (selectedHelmRelease?.name === releaseName) {
        fetchHelmReleaseHistory(releaseName, namespace);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to rollback Helm release');
    }
  };

  const handleCreateStatefulSet = async () => {
    try {
      setLoading(l => ({ ...l, createStatefulSet: true }));
      await api.post('/container-deployments/k8s/statefulsets', newStatefulSet);
      setSuccess(`Created StatefulSet: ${newStatefulSet.name}`);
      setCreateStatefulSetOpen(false);
      setNewStatefulSet({
        name: '', namespace: 'default', template: '', replicas: 3, storageSize: '10Gi', storageClass: ''
      });
      fetchStatefulSets(selectedNamespace);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create StatefulSet');
    } finally {
      setLoading(l => ({ ...l, createStatefulSet: false }));
    }
  };

  const handleScaleStatefulSet = async (name, namespace, replicas) => {
    try {
      await api.put(`/container-deployments/k8s/statefulsets/${namespace}/${name}/scale`, { replicas });
      setSuccess(`Scaled StatefulSet ${name} to ${replicas} replicas`);
      fetchStatefulSets(namespace);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to scale StatefulSet');
    }
  };

  const handleDeleteStatefulSet = async (name, namespace, deletePVCs = false) => {
    if (!window.confirm(`Delete StatefulSet "${name}"?${deletePVCs ? ' This will also delete associated PVCs!' : ''}`)) return;
    
    try {
      await api.delete(`/container-deployments/k8s/statefulsets/${namespace}/${name}`, {
        params: { deletePVCs }
      });
      setSuccess(`Deleted StatefulSet: ${name}`);
      fetchStatefulSets(namespace);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete StatefulSet');
    }
  };

  const handleStartPortForward = async () => {
    try {
      setLoading(l => ({ ...l, startPortForward: true }));
      await api.post('/container-deployments/port-forwards', newPortForward);
      setSuccess(`Started port forward: localhost:${newPortForward.localPort} → ${newPortForward.resourceName}:${newPortForward.remotePort}`);
      setCreatePortForwardOpen(false);
      setNewPortForward({
        resourceType: 'pod', resourceName: '', namespace: 'default', localPort: 8080, remotePort: 8080
      });
      fetchPortForwards();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start port forward');
    } finally {
      setLoading(l => ({ ...l, startPortForward: false }));
    }
  };

  const handleStopPortForward = async (id) => {
    try {
      await api.delete(`/container-deployments/port-forwards/${id}`);
      setSuccess('Stopped port forward');
      fetchPortForwards();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to stop port forward');
    }
  };

  const handleQuickDeploy = async () => {
    try {
      setLoading(l => ({ ...l, deploy: true }));
      
      if (deployMode === 'yaml' && customYaml) {
        // Apply custom YAML
        await api.post('/container-deployments/k8s/apply-yaml', { 
          yamlContent: customYaml,
          namespace: deployConfig.namespace 
        });
        setSuccess(`Applied custom YAML to ${deployConfig.namespace}`);
      } else {
        // Standard quick deploy
        await api.post('/container-deployments/k8s/quick-deploy', deployConfig);
        setSuccess(`Deployed ${deployConfig.imageName} to ${deployConfig.namespace}`);
      }
      
      setQuickDeployOpen(false);
      fetchNamespaceResources(deployConfig.namespace);
      resetDeployConfig();
      setDeployMode('form');
      setCustomYaml('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to deploy');
    } finally {
      setLoading(l => ({ ...l, deploy: false }));
    }
  };

  const handleSwitchToYamlMode = () => {
    if (deployMode === 'form' && deployConfig.imageName) {
      setCustomYaml(generateYamlFromConfig(deployConfig));
    }
    setDeployMode('yaml');
  };

  const handleSwitchToFormMode = () => {
    setDeployMode('form');
  };

  const handleCreateNamespace = async () => {
    try {
      setLoading(l => ({ ...l, createNs: true }));
      await api.post('/container-deployments/k8s/namespaces', { name: newNamespaceName });
      setSuccess(`Created namespace: ${newNamespaceName}`);
      setCreateNamespaceOpen(false);
      setNewNamespaceName('');
      fetchNamespaces();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create namespace');
    } finally {
      setLoading(l => ({ ...l, createNs: false }));
    }
  };

  const handleDeleteNamespace = async (name) => {
    try {
      setLoading(l => ({ ...l, deleteNs: true }));
      await api.delete(`/container-deployments/k8s/namespaces/${name}`);
      setSuccess(`Deleted namespace: ${name}`);
      fetchNamespaces();
      if (selectedNamespace === name) {
        setSelectedNamespace('default');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete namespace');
    } finally {
      setLoading(l => ({ ...l, deleteNs: false }));
      setConfirmDeleteOpen(false);
    }
  };

  const handleDeleteDeployment = async (name, namespace) => {
    try {
      setLoading(l => ({ ...l, deleteDep: true }));
      await api.delete(`/container-deployments/k8s/namespaces/${namespace}/deployments/${name}`);
      setSuccess(`Deleted deployment: ${name}`);
      fetchNamespaceResources(namespace);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete deployment');
    } finally {
      setLoading(l => ({ ...l, deleteDep: false }));
      setConfirmDeleteOpen(false);
    }
  };

  const handleRestartDeployment = async (name, namespace) => {
    try {
      setLoading(l => ({ ...l, restart: true }));
      await api.post(`/container-deployments/k8s/namespaces/${namespace}/deployments/${name}/restart`);
      setSuccess(`Restarted deployment: ${name}`);
      fetchNamespaceResources(namespace);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to restart deployment');
    } finally {
      setLoading(l => ({ ...l, restart: false }));
    }
  };

  // Port forward command helper (for future use)
  // eslint-disable-next-line no-unused-vars
  const handleGetPortForwardCommand = async () => {
    try {
      const response = await api.post('/container-deployments/k8s/port-forward', portForwardConfig);
      setPortForwardCommand(response.data.data?.command || '');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to get port forward command');
    }
  };

  const handleSwitchContext = async (contextName) => {
    try {
      setLoading(l => ({ ...l, switchContext: true }));
      await api.post('/container-deployments/k8s/context', { contextName });
      await fetchK8sContext();
      await fetchNamespaces();
      setSuccess(`Switched to context: ${contextName}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to switch context');
    } finally {
      setLoading(l => ({ ...l, switchContext: false }));
    }
  };

  // Cloud Provider Actions
  const handleConnectToCluster = async (cluster) => {
    if (!selectedCredential) return;
    try {
      setLoading(l => ({ ...l, connectCluster: true }));
      await api.post(`/container-deployments/cloud/clusters/${selectedCredential}/connect`, {
        clusterName: cluster.name,
        region: cluster.region,
        zone: cluster.zone || cluster.location,
        resourceGroup: cluster.resourceGroup,
      });
      setConnectedToCloud(true);
      setSelectedCluster(cluster);
      await fetchK8sContext();
      await fetchNamespaces();
      setSuccess(`Connected to ${cluster.type?.toUpperCase()} cluster: ${cluster.name}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to connect to cluster');
    } finally {
      setLoading(l => ({ ...l, connectCluster: false }));
    }
  };

  const handleAuthenticateRegistry = async (registry) => {
    if (!selectedCredential) return;
    try {
      setLoading(l => ({ ...l, authRegistry: true }));
      await api.post(`/container-deployments/cloud/registries/${selectedCredential}/authenticate`, {
        registryUri: registry.uri,
      });
      setSuccess(`Authenticated to ${registry.type?.toUpperCase()} registry: ${registry.name}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to authenticate to registry');
    } finally {
      setLoading(l => ({ ...l, authRegistry: false }));
    }
  };

  const handlePullCloudImage = async (imageUri) => {
    if (!selectedCredential) return;
    try {
      setLoading(l => ({ ...l, pullImage: true }));
      await api.post(`/container-deployments/cloud/registries/${selectedCredential}/pull`, {
        imageUri,
      });
      setSuccess(`Pulled image: ${imageUri}`);
      fetchLocalImages();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to pull image');
    } finally {
      setLoading(l => ({ ...l, pullImage: false }));
    }
  };

  // eslint-disable-next-line no-unused-vars
  const handlePushToCloudRegistry = async (localImage, targetUri) => {
    if (!selectedCredential) return;
    try {
      setLoading(l => ({ ...l, pushImage: true }));
      await api.post(`/container-deployments/cloud/registries/${selectedCredential}/push`, {
        localImage,
        targetUri,
      });
      setSuccess(`Pushed image to: ${targetUri}`);
      if (selectedRegistry) {
        fetchCloudRegistryImages(selectedCredential, selectedRegistry.uri, { region: selectedRegistry.region });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to push image');
    } finally {
      setLoading(l => ({ ...l, pushImage: false }));
    }
  };

  const selectCloudImageForDeploy = (image) => {
    setDeployConfig({
      ...deployConfig,
      imageName: image.uri || `${image.name}:${image.tags?.[0] || image.tag || 'latest'}`,
      imageTag: image.tags?.[0] || image.tag || 'latest',
      deploymentName: (image.name || image.uri).split('/').pop().split(':')[0].replace(/[^a-z0-9-]/g, '-'),
      namespace: selectedNamespace || 'default',
    });
    setQuickDeployOpen(true);
  };

  const resetDeployConfig = () => {
    setDeployConfig({
      imageName: '',
      imageTag: 'latest',
      deploymentName: '',
      namespace: selectedNamespace || 'default',
      replicas: 1,
      containerPort: 8080,
      servicePort: 80,
      serviceType: 'ClusterIP',
      createService: true,
      envVars: [],
      resourceRequests: { cpu: '100m', memory: '128Mi' },
      resourceLimits: { cpu: '500m', memory: '512Mi' },
    });
  };

  const selectImageForDeploy = (image) => {
    setDeployConfig({
      ...deployConfig,
      imageName: image.Repository || image.ID,
      imageTag: image.Tag || 'latest',
      deploymentName: (image.Repository || image.ID).split('/').pop().replace(/[^a-z0-9-]/g, '-'),
      namespace: selectedNamespace || 'default',
    });
    setQuickDeployOpen(true);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard');
  };

  const toggleNamespace = (namespace) => {
    if (expandedNamespaces.includes(namespace)) {
      setExpandedNamespaces(expandedNamespaces.filter(n => n !== namespace));
    } else {
      setExpandedNamespaces([...expandedNamespaces, namespace]);
      setSelectedNamespace(namespace);
    }
  };

  const selectResource = (type, resource) => {
    setSelectedResource({ type, resource });
    fetchResourceDescription(type, resource.name, resource.namespace || selectedNamespace);
    if (type === 'pod') {
      fetchPodLogs(resource.namespace || selectedNamespace, resource.name);
    } else {
      setPodLogs('');
    }
  };

  // ==========================================
  // RENDER HELPERS
  // ==========================================

  const renderSetupTab = () => {
    // Helper to check if a tool is installed based on status
    const isInstalled = (tool) => tool.status === 'installed';
    
    return (
    <Box sx={{ p: 3, height: '100%', overflow: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BuildIcon color="primary" />
          Prerequisites & Setup
        </Typography>
        <Button
          variant="outlined"
          startIcon={loading.prerequisites ? <CircularProgress size={16} /> : <RefreshIcon />}
          onClick={fetchPrerequisites}
          disabled={loading.prerequisites}
        >
          Re-check
        </Button>
      </Box>

      {/* Overall Status */}
      {prerequisites?.summary && (
        <Alert 
          severity={prerequisites.summary.ready ? 'success' : 'warning'} 
          sx={{ mb: 3 }}
          icon={prerequisites.summary.ready ? <CheckCircleIcon /> : <WarningIcon />}
        >
          {prerequisites.summary.ready 
            ? `All ${prerequisites.summary.installed} prerequisites are installed. You are ready to deploy!`
            : `${prerequisites.summary.requiredMissing} required tool(s) missing. Please install the required tools below.`}
        </Alert>
      )}

      {/* Instructions Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HelpOutlineIcon color="info" />
            Getting Started
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            The Cloud Deployment Toolkit helps you deploy containerized applications to Kubernetes clusters 
            across multiple cloud providers (AWS, Azure, GCP, DigitalOcean, and Linode).
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>Required tools:</strong>
          </Typography>
          <Box component="ul" sx={{ pl: 2, mt: 1, mb: 0 }}>
            <Typography component="li" variant="body2" color="text.secondary">
              <strong>Docker</strong> - For building and managing container images locally
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              <strong>kubectl</strong> - Kubernetes command-line tool for cluster management
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              <strong>Cloud CLI</strong> - AWS CLI, Azure CLI, or gcloud depending on your target cloud
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Kubeconfig Status */}
      {prerequisites?.kubeconfig && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SettingsIcon color="primary" />
              Kubernetes Configuration
            </Typography>
            {prerequisites.kubeconfig.configured ? (
              <Box>
                <Alert severity="success" sx={{ mb: 2 }}>
                  Kubernetes context configured: <strong>{prerequisites.kubeconfig.currentContext}</strong>
                </Alert>
                <Typography variant="body2" color="text.secondary">
                  Available contexts: {prerequisites.kubeconfig.availableContexts?.join(', ') || 'None'}
                </Typography>
              </Box>
            ) : (
              <Alert severity="warning">
                No Kubernetes context configured. Run <code>kubectl config set-context</code> to configure a cluster.
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Prerequisites Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Tool Status
          </Typography>
          
          {loading.prerequisites ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : prerequisites?.prerequisites ? (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Tool</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Version</TableCell>
                    <TableCell>Required</TableCell>
                    <TableCell>Used For</TableCell>
                    <TableCell>Installation</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {prerequisites.prerequisites.map((tool, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {tool.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {tool.description}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {isInstalled(tool) ? (
                          <Chip 
                            size="small" 
                            icon={<CheckCircleIcon />} 
                            label="Installed" 
                            color="success" 
                            variant="outlined"
                          />
                        ) : (
                          <Chip 
                            size="small" 
                            icon={<ErrorIcon />} 
                            label="Missing" 
                            color={tool.required ? 'error' : 'warning'} 
                            variant="outlined"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {tool.version || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {tool.required ? (
                          <Chip size="small" label="Required" color="primary" variant="outlined" />
                        ) : (
                          <Chip size="small" label="Optional" variant="outlined" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {tool.requiredFor?.join(', ') || 'General use'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {!isInstalled(tool) && tool.installUrl && (
                          <Button
                            size="small"
                            variant="text"
                            href={tool.installUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Install Guide
                          </Button>
                        )}
                        {isInstalled(tool) && (
                          <Typography variant="caption" color="success.main">
                            ✓ Ready
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography color="text.secondary">
              Click "Re-check" to verify your environment
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Installation Instructions Accordion */}
      {prerequisites?.prerequisites?.filter(t => !isInstalled(t)).length > 0 && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Installation Instructions
            </Typography>
            {prerequisites.prerequisites.filter(t => !isInstalled(t)).map((tool, idx) => (
              <Accordion key={idx} sx={{ mb: 1 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ErrorIcon color={tool.required ? 'error' : 'warning'} fontSize="small" />
                    <Typography>{tool.name}</Typography>
                    {tool.required && <Chip size="small" label="Required" color="error" />}
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {tool.description}
                  </Typography>
                  {tool.installCommand && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>Quick Install Commands:</Typography>
                      {tool.installCommand.windows && (
                        <Box sx={{ mb: 1 }}>
                          <Typography variant="caption" color="text.secondary">Windows:</Typography>
                          <Box component="pre" sx={{ 
                            bgcolor: 'grey.100', 
                            p: 1, 
                            borderRadius: 1, 
                            fontSize: '0.75rem',
                            overflow: 'auto'
                          }}>
                            {tool.installCommand.windows}
                          </Box>
                        </Box>
                      )}
                      {tool.installCommand.mac && (
                        <Box sx={{ mb: 1 }}>
                          <Typography variant="caption" color="text.secondary">macOS:</Typography>
                          <Box component="pre" sx={{ 
                            bgcolor: 'grey.100', 
                            p: 1, 
                            borderRadius: 1, 
                            fontSize: '0.75rem',
                            overflow: 'auto'
                          }}>
                            {tool.installCommand.mac}
                          </Box>
                        </Box>
                      )}
                      {tool.installCommand.linux && (
                        <Box sx={{ mb: 1 }}>
                          <Typography variant="caption" color="text.secondary">Linux:</Typography>
                          <Box component="pre" sx={{ 
                            bgcolor: 'grey.100', 
                            p: 1, 
                            borderRadius: 1, 
                            fontSize: '0.75rem',
                            overflow: 'auto'
                          }}>
                            {tool.installCommand.linux}
                          </Box>
                        </Box>
                      )}
                    </Box>
                  )}
                  {tool.installUrl && (
                    <Button
                      variant="contained"
                      size="small"
                      href={tool.installUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      startIcon={<OpenInNewIcon />}
                    >
                      Open Installation Guide
                    </Button>
                  )}
                </AccordionDetails>
              </Accordion>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Next Steps */}
      {prerequisites?.summary?.ready && (
        <Card sx={{ mt: 3, bgcolor: 'success.main' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ color: 'white' }}>
              ✓ Ready to Deploy!
            </Typography>
            <Typography variant="body2" sx={{ color: 'white', mb: 2 }}>
              All required tools are installed. Follow these next steps to deploy your application:
            </Typography>
            <Box component="ol" sx={{ pl: 2, color: 'white', mb: 2 }}>
              <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                <strong>Configure Cloud Credentials:</strong> Go to Settings → Cloud Credentials to add your cloud provider credentials.
              </Typography>
              <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                <strong>Connect to a Cluster:</strong> Use the Cloud tab to select your region and connect to an existing Kubernetes cluster.
              </Typography>
              <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                <strong>Deploy Your Application:</strong> Use the Docker tab to select images and deploy them to your cluster.
              </Typography>
            </Box>
            <Button 
              variant="contained" 
              sx={{ bgcolor: 'white', color: 'success.main', '&:hover': { bgcolor: 'grey.100' } }}
              onClick={() => setSelectedView('docker')}
            >
              Go to Docker Images
            </Button>
          </CardContent>
        </Card>
      )}
    </Box>
  );
  };

  const renderStorageTab = () => (
    <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DiskIcon color="primary" />
          Storage Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => {
              fetchStorageClasses();
              fetchPVCs();
              fetchPVs();
              fetchCSIDriverStatus();
            }}
          >
            Refresh All
          </Button>
        </Box>
      </Box>

      {/* CSI Drivers Status Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SettingsIcon color="primary" />
            CSI Drivers
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Container Storage Interface (CSI) drivers are required for dynamic volume provisioning.
          </Typography>
          
          <Grid container spacing={2}>
            {/* EBS CSI Driver */}
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle1" fontWeight="medium">
                    AWS EBS CSI Driver
                  </Typography>
                  {csiDriverStatus.ebs?.installed ? (
                    <Chip 
                      size="small" 
                      icon={<CheckCircleIcon />} 
                      label={csiDriverStatus.ebs.healthy ? "Healthy" : "Installed"} 
                      color={csiDriverStatus.ebs.healthy ? "success" : "warning"} 
                    />
                  ) : (
                    <Chip size="small" icon={<WarningIcon />} label="Not Installed" color="warning" />
                  )}
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Required for dynamic EBS volume provisioning (gp2, gp3, io1, etc.)
                </Typography>
                {!csiDriverStatus.ebs?.installed && (
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleInstallEBSCSI}
                    disabled={loading.installEbs || !selectedCredential}
                    startIcon={loading.installEbs ? <CircularProgress size={16} /> : <AddIcon />}
                  >
                    Install via AWS EKS Addon
                  </Button>
                )}
                {csiDriverStatus.ebs?.pods?.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Pods: {csiDriverStatus.ebs.pods.map(p => p.name).join(', ')}
                    </Typography>
                  </Box>
                )}
              </Paper>
            </Grid>

            {/* EFS CSI Driver */}
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle1" fontWeight="medium">
                    AWS EFS CSI Driver
                  </Typography>
                  {csiDriverStatus.efs?.installed ? (
                    <Chip 
                      size="small" 
                      icon={<CheckCircleIcon />} 
                      label={csiDriverStatus.efs.healthy ? "Healthy" : "Installed"} 
                      color={csiDriverStatus.efs.healthy ? "success" : "warning"} 
                    />
                  ) : (
                    <Chip size="small" icon={<WarningIcon />} label="Not Installed" color="warning" />
                  )}
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Required for shared file storage with ReadWriteMany access mode.
                </Typography>
                {!csiDriverStatus.efs?.installed && (
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleInstallEFSCSI}
                    disabled={loading.installEfs}
                    startIcon={loading.installEfs ? <CircularProgress size={16} /> : <AddIcon />}
                  >
                    Install via Helm
                  </Button>
                )}
              </Paper>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* StorageClasses Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LayersIcon color="primary" />
              StorageClasses
            </Typography>
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => {
                fetchStorageClassTemplates();
                setCreateStorageClassOpen(true);
              }}
            >
              Create StorageClass
            </Button>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            StorageClasses define storage provisioners and their parameters for dynamic volume creation.
          </Typography>

          {loading.storageClasses ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : storageClasses.length === 0 ? (
            <Alert severity="info">
              No StorageClasses found. Create one to enable dynamic volume provisioning.
            </Alert>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Provisioner</TableCell>
                    <TableCell>Reclaim Policy</TableCell>
                    <TableCell>Volume Binding</TableCell>
                    <TableCell>Expansion</TableCell>
                    <TableCell>Default</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {storageClasses.map((sc) => (
                    <TableRow key={sc.name}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {sc.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                          {sc.provisioner}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          size="small" 
                          label={sc.reclaimPolicy} 
                          color={sc.reclaimPolicy === 'Retain' ? 'primary' : 'default'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {sc.volumeBindingMode}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {sc.allowVolumeExpansion ? (
                          <CheckCircleIcon color="success" fontSize="small" />
                        ) : (
                          <ErrorIcon color="disabled" fontSize="small" />
                        )}
                      </TableCell>
                      <TableCell>
                        {sc.isDefault && <Chip size="small" label="Default" color="primary" />}
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Delete StorageClass">
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => handleDeleteStorageClass(sc.name)}
                            disabled={sc.isDefault}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* PVCs Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <DataIcon color="primary" />
              PersistentVolumeClaims
            </Typography>
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setCreatePvcOpen(true)}
            >
              Create PVC
            </Button>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            PVCs request storage from StorageClasses for use by pods.
          </Typography>

          {loading.pvcs ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : pvcs.length === 0 ? (
            <Alert severity="info">
              No PersistentVolumeClaims found.
            </Alert>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Namespace</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>StorageClass</TableCell>
                    <TableCell>Capacity</TableCell>
                    <TableCell>Access Modes</TableCell>
                    <TableCell>Volume</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pvcs.map((pvc) => (
                    <TableRow key={`${pvc.namespace}/${pvc.name}`}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {pvc.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={pvc.namespace} variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          size="small" 
                          label={pvc.status} 
                          color={pvc.status === 'Bound' ? 'success' : pvc.status === 'Pending' ? 'warning' : 'error'}
                        />
                      </TableCell>
                      <TableCell>{pvc.storageClass || '-'}</TableCell>
                      <TableCell>{pvc.capacity || pvc.requestedStorage}</TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {pvc.accessModes?.join(', ')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                          {pvc.volume || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Delete PVC">
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => handleDeletePVC(pvc.name, pvc.namespace)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* PVs Card */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <DiskIcon color="primary" />
              PersistentVolumes
            </Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshIcon />}
              onClick={fetchPVs}
            >
              Refresh
            </Button>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            PVs are the actual storage resources provisioned by StorageClasses.
          </Typography>

          {loading.pvs ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : pvs.length === 0 ? (
            <Alert severity="info">
              No PersistentVolumes found. Create a PVC to provision storage.
            </Alert>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Capacity</TableCell>
                    <TableCell>Access Modes</TableCell>
                    <TableCell>Reclaim Policy</TableCell>
                    <TableCell>Claim</TableCell>
                    <TableCell>StorageClass</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pvs.map((pv) => (
                    <TableRow key={pv.name}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                          {pv.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          size="small" 
                          label={pv.status} 
                          color={pv.status === 'Bound' ? 'success' : pv.status === 'Available' ? 'info' : 'warning'}
                        />
                      </TableCell>
                      <TableCell>{pv.capacity}</TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {pv.accessModes?.join(', ')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          size="small" 
                          label={pv.reclaimPolicy} 
                          variant="outlined"
                          color={pv.reclaimPolicy === 'Retain' ? 'primary' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                          {pv.claim || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>{pv.storageClass || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Create StorageClass Dialog */}
      <Dialog open={createStorageClassOpen} onClose={() => setCreateStorageClassOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create StorageClass</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {/* Template Selection */}
            <Typography variant="subtitle2" gutterBottom>Quick Templates</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
              {Object.entries(storageClassTemplates).map(([key, template]) => (
                <Chip
                  key={key}
                  label={template.name}
                  onClick={() => handleApplyTemplate(key)}
                  clickable
                  variant="outlined"
                  color="primary"
                />
              ))}
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Name"
                  value={newStorageClass.name}
                  onChange={(e) => setNewStorageClass(s => ({ ...s, name: e.target.value }))}
                  required
                  helperText="Unique name for the StorageClass"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Provisioner"
                  value={newStorageClass.provisioner}
                  onChange={(e) => setNewStorageClass(s => ({ ...s, provisioner: e.target.value }))}
                  required
                  helperText="e.g., ebs.csi.aws.com, efs.csi.aws.com"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Reclaim Policy</InputLabel>
                  <Select
                    value={newStorageClass.reclaimPolicy}
                    label="Reclaim Policy"
                    onChange={(e) => setNewStorageClass(s => ({ ...s, reclaimPolicy: e.target.value }))}
                  >
                    <MenuItem value="Delete">Delete (volume deleted with PVC)</MenuItem>
                    <MenuItem value="Retain">Retain (manual cleanup required)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Volume Binding Mode</InputLabel>
                  <Select
                    value={newStorageClass.volumeBindingMode}
                    label="Volume Binding Mode"
                    onChange={(e) => setNewStorageClass(s => ({ ...s, volumeBindingMode: e.target.value }))}
                  >
                    <MenuItem value="WaitForFirstConsumer">WaitForFirstConsumer (recommended)</MenuItem>
                    <MenuItem value="Immediate">Immediate</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={newStorageClass.allowVolumeExpansion}
                      onChange={(e) => setNewStorageClass(s => ({ ...s, allowVolumeExpansion: e.target.checked }))}
                    />
                  }
                  label="Allow Volume Expansion"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={newStorageClass.isDefault}
                      onChange={(e) => setNewStorageClass(s => ({ ...s, isDefault: e.target.checked }))}
                    />
                  }
                  label="Set as Default StorageClass"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateStorageClassOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleCreateStorageClass}
            disabled={loading.createSc || !newStorageClass.name || !newStorageClass.provisioner}
          >
            {loading.createSc ? <CircularProgress size={20} /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create PVC Dialog */}
      <Dialog open={createPvcOpen} onClose={() => setCreatePvcOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create PersistentVolumeClaim</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Name"
                  value={newPvc.name}
                  onChange={(e) => setNewPvc(p => ({ ...p, name: e.target.value }))}
                  required
                  helperText="Unique name for the PVC"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Namespace</InputLabel>
                  <Select
                    value={newPvc.namespace}
                    label="Namespace"
                    onChange={(e) => setNewPvc(p => ({ ...p, namespace: e.target.value }))}
                  >
                    {namespaces.map(ns => (
                      <MenuItem key={ns} value={ns}>{ns}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>StorageClass</InputLabel>
                  <Select
                    value={newPvc.storageClass}
                    label="StorageClass"
                    onChange={(e) => setNewPvc(p => ({ ...p, storageClass: e.target.value }))}
                    required
                  >
                    {storageClasses.map(sc => (
                      <MenuItem key={sc.name} value={sc.name}>
                        {sc.name} {sc.isDefault && '(default)'}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Storage Size"
                  value={newPvc.storage}
                  onChange={(e) => setNewPvc(p => ({ ...p, storage: e.target.value }))}
                  required
                  helperText="e.g., 10Gi, 100Gi, 1Ti"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Access Mode</InputLabel>
                  <Select
                    value={newPvc.accessModes[0]}
                    label="Access Mode"
                    onChange={(e) => setNewPvc(p => ({ ...p, accessModes: [e.target.value] }))}
                  >
                    <MenuItem value="ReadWriteOnce">ReadWriteOnce (single node)</MenuItem>
                    <MenuItem value="ReadWriteMany">ReadWriteMany (multiple nodes)</MenuItem>
                    <MenuItem value="ReadOnlyMany">ReadOnlyMany (read-only, multiple)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreatePvcOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleCreatePVC}
            disabled={loading.createPvc || !newPvc.name || !newPvc.storageClass}
          >
            {loading.createPvc ? <CircularProgress size={20} /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );

  // Phase 3: Network & Cluster Configuration Tab
  const renderNetworkTab = () => (
    <Box sx={{ p: 3, height: '100%', overflow: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <VpnLock /> Network & Cluster Configuration
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => {
              if (selectedCluster) fetchClusterEndpointConfig();
              if (selectedCredential) {
                fetchSubnets();
                fetchSecurityGroups();
                fetchLoadBalancers();
              }
              fetchInternalLbTemplates();
            }}
            disabled={!selectedCredential}
          >
            Refresh All
          </Button>
        </Box>
      </Box>

      {/* Instructions Alert */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>Private Cluster Configuration</Typography>
        <Typography variant="body2">
          Configure your EKS cluster's network settings for private deployments. This includes:
          • <strong>Endpoint Access</strong>: Control API server accessibility (public/private)
          • <strong>Subnet Tags</strong>: Tag subnets for internal/external load balancers
          • <strong>Security Groups</strong>: View cluster security group configurations
          • <strong>Load Balancers</strong>: Monitor existing ALB/NLB deployments
        </Typography>
      </Alert>

      {/* Cluster Endpoint Configuration */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Security /> Cluster Endpoint Configuration
        </Typography>
        
        {!selectedCluster ? (
          <Alert severity="warning">
            Select a cluster from the left panel to configure endpoint access
          </Alert>
        ) : loading.endpointConfig ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : clusterEndpointConfig ? (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <PublicIcon color={clusterEndpointConfig.publicAccess ? 'success' : 'disabled'} />
                    <Typography variant="subtitle1">Public Endpoint</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Allow API server access from outside the VPC via the public internet
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Chip 
                      label={clusterEndpointConfig.publicAccess ? 'Enabled' : 'Disabled'} 
                      color={clusterEndpointConfig.publicAccess ? 'success' : 'default'}
                      size="small"
                    />
                    <Button
                      size="small"
                      variant="outlined"
                      color={clusterEndpointConfig.publicAccess ? 'warning' : 'primary'}
                      startIcon={clusterEndpointConfig.publicAccess ? <LockOutlined /> : <LockOpen />}
                      onClick={() => handleUpdateEndpointConfig({ 
                        publicAccess: !clusterEndpointConfig.publicAccess,
                        privateAccess: clusterEndpointConfig.privateAccess 
                      })}
                      disabled={loading.updateEndpoint}
                    >
                      {clusterEndpointConfig.publicAccess ? 'Disable' : 'Enable'}
                    </Button>
                  </Box>
                  {clusterEndpointConfig.publicAccessCidrs && clusterEndpointConfig.publicAccessCidrs.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="caption" color="text.secondary">Allowed CIDRs:</Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                        {clusterEndpointConfig.publicAccessCidrs.map((cidr, i) => (
                          <Chip key={i} label={cidr} size="small" variant="outlined" />
                        ))}
                      </Box>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <PublicOff color={clusterEndpointConfig.privateAccess ? 'success' : 'disabled'} />
                    <Typography variant="subtitle1">Private Endpoint</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Allow API server access from within the VPC only (recommended for production)
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Chip 
                      label={clusterEndpointConfig.privateAccess ? 'Enabled' : 'Disabled'} 
                      color={clusterEndpointConfig.privateAccess ? 'success' : 'default'}
                      size="small"
                    />
                    <Button
                      size="small"
                      variant="outlined"
                      color={clusterEndpointConfig.privateAccess ? 'warning' : 'primary'}
                      startIcon={clusterEndpointConfig.privateAccess ? <LockOutlined /> : <LockOpen />}
                      onClick={() => handleUpdateEndpointConfig({ 
                        publicAccess: clusterEndpointConfig.publicAccess,
                        privateAccess: !clusterEndpointConfig.privateAccess 
                      })}
                      disabled={loading.updateEndpoint || (!clusterEndpointConfig.publicAccess && clusterEndpointConfig.privateAccess)}
                    >
                      {clusterEndpointConfig.privateAccess ? 'Disable' : 'Enable'}
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            {!clusterEndpointConfig.publicAccess && clusterEndpointConfig.privateAccess && (
              <Grid item xs={12}>
                <Alert severity="warning">
                  <strong>Private-Only Mode Active:</strong> Your cluster API is only accessible from within the VPC. 
                  Ensure you have VPN, Direct Connect, or a bastion host configured for access.
                </Alert>
              </Grid>
            )}
          </Grid>
        ) : (
          <Alert severity="info">
            Click "Refresh All" to load endpoint configuration
          </Alert>
        )}
      </Paper>

      {/* Subnet Tags Management */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Label /> Subnet Tags for Load Balancers
        </Typography>
        
        <Alert severity="info" sx={{ mb: 2 }} icon={<InfoIcon />}>
          <Typography variant="body2">
            <strong>kubernetes.io/role/elb=1</strong>: Tag public subnets for internet-facing load balancers<br/>
            <strong>kubernetes.io/role/internal-elb=1</strong>: Tag private subnets for internal load balancers
          </Typography>
        </Alert>

        {!selectedCredential ? (
          <Alert severity="warning">Select a credential to view subnets</Alert>
        ) : loading.subnets ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>
        ) : subnets.length === 0 ? (
          <Alert severity="info">No subnets found. Click "Refresh All" to load subnets.</Alert>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Subnet ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>CIDR</TableCell>
                  <TableCell>AZ</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>ELB Tag</TableCell>
                  <TableCell>Internal ELB Tag</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {subnets.map((subnet) => (
                  <TableRow key={subnet.subnetId} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {subnet.subnetId}
                      </Typography>
                    </TableCell>
                    <TableCell>{subnet.name || '-'}</TableCell>
                    <TableCell>
                      <Chip label={subnet.cidrBlock} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>{subnet.availabilityZone}</TableCell>
                    <TableCell>
                      <Chip 
                        label={subnet.isPublic ? 'Public' : 'Private'} 
                        size="small"
                        color={subnet.isPublic ? 'primary' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={subnet.hasElbTag ? 'Tagged' : 'Not Tagged'}
                        size="small"
                        color={subnet.hasElbTag ? 'success' : 'default'}
                        icon={subnet.hasElbTag ? <CloudDone fontSize="small" /> : undefined}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={subnet.hasInternalElbTag ? 'Tagged' : 'Not Tagged'}
                        size="small"
                        color={subnet.hasInternalElbTag ? 'success' : 'default'}
                        icon={subnet.hasInternalElbTag ? <CloudDone fontSize="small" /> : undefined}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                        {subnet.isPublic && !subnet.hasElbTag && (
                          <Tooltip title="Add kubernetes.io/role/elb=1">
                            <IconButton 
                              size="small" 
                              color="primary"
                              onClick={() => handleToggleSubnetTag(subnet.subnetId, 'kubernetes.io/role/elb', false)}
                            >
                              <AddIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {subnet.hasElbTag && (
                          <Tooltip title="Remove kubernetes.io/role/elb">
                            <IconButton 
                              size="small" 
                              color="warning"
                              onClick={() => handleToggleSubnetTag(subnet.subnetId, 'kubernetes.io/role/elb', true)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {!subnet.isPublic && !subnet.hasInternalElbTag && (
                          <Tooltip title="Add kubernetes.io/role/internal-elb=1">
                            <IconButton 
                              size="small" 
                              color="primary"
                              onClick={() => handleToggleSubnetTag(subnet.subnetId, 'kubernetes.io/role/internal-elb', false)}
                            >
                              <AddIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {subnet.hasInternalElbTag && (
                          <Tooltip title="Remove kubernetes.io/role/internal-elb">
                            <IconButton 
                              size="small" 
                              color="warning"
                              onClick={() => handleToggleSubnetTag(subnet.subnetId, 'kubernetes.io/role/internal-elb', true)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Security Groups Overview */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Security /> Security Groups
        </Typography>
        
        {!selectedCredential ? (
          <Alert severity="warning">Select a credential to view security groups</Alert>
        ) : loading.securityGroups ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>
        ) : securityGroups.length === 0 ? (
          <Alert severity="info">No security groups found. Click "Refresh All" to load.</Alert>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Security Group ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>VPC</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Inbound Rules</TableCell>
                  <TableCell>Outbound Rules</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {securityGroups.map((sg) => (
                  <TableRow key={sg.groupId} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {sg.groupId}
                      </Typography>
                    </TableCell>
                    <TableCell>{sg.groupName}</TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                        {sg.description}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={sg.vpcId} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      {sg.isClusterSg && <Chip label="Cluster" size="small" color="primary" sx={{ mr: 0.5 }} />}
                      {sg.isNodeSg && <Chip label="Node" size="small" color="secondary" />}
                    </TableCell>
                    <TableCell>
                      <Chip label={sg.inboundRulesCount} size="small" />
                    </TableCell>
                    <TableCell>
                      <Chip label={sg.outboundRulesCount} size="small" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        
        <Alert severity="info" sx={{ mt: 2 }}>
          Security group rules should be managed via AWS Console or Terraform for safety. 
          Use the AWS Console to add rules for internal load balancer traffic if needed.
        </Alert>
      </Paper>

      {/* Load Balancers */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Router /> Active Load Balancers
        </Typography>
        
        {!selectedCredential ? (
          <Alert severity="warning">Select a credential to view load balancers</Alert>
        ) : loading.loadBalancers ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>
        ) : loadBalancers.length === 0 ? (
          <Alert severity="info">No load balancers found in this region.</Alert>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Scheme</TableCell>
                  <TableCell>DNS Name</TableCell>
                  <TableCell>State</TableCell>
                  <TableCell>AZs</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loadBalancers.map((lb) => (
                  <TableRow key={lb.arn} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {lb.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={lb.type.toUpperCase()} 
                        size="small" 
                        color={lb.type === 'application' ? 'primary' : 'secondary'}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={lb.scheme === 'internal' ? 'Internal' : 'Internet-Facing'} 
                        size="small"
                        color={lb.scheme === 'internal' ? 'default' : 'warning'}
                        icon={lb.scheme === 'internal' ? <PublicOff fontSize="small" /> : <PublicIcon fontSize="small" />}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }} noWrap>
                        {lb.dnsName}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={lb.state} 
                        size="small"
                        color={lb.state === 'active' ? 'success' : 'warning'}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {lb.availabilityZones?.map((az, i) => (
                          <Chip key={i} label={az} size="small" variant="outlined" />
                        ))}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Internal Load Balancer Templates */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <ContentCopyIcon /> Internal Load Balancer Templates
        </Typography>
        
        <Alert severity="info" sx={{ mb: 2 }}>
          Use these Kubernetes manifest templates to create internal (private) load balancers. 
          These templates use the AWS Load Balancer Controller annotations.
        </Alert>

        {Object.keys(internalLbTemplates).length === 0 ? (
          <Button 
            variant="outlined" 
            startIcon={<RefreshIcon />}
            onClick={fetchInternalLbTemplates}
          >
            Load Templates
          </Button>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {Object.entries(internalLbTemplates).map(([key, template]) => (
              <Accordion key={key}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="subtitle1">{template.name}</Typography>
                    <Chip label={key} size="small" variant="outlined" />
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {template.description}
                  </Typography>
                  <Box sx={{ position: 'relative' }}>
                    <IconButton
                      size="small"
                      sx={{ position: 'absolute', top: 8, right: 8 }}
                      onClick={() => {
                        navigator.clipboard.writeText(template.yaml);
                        setSuccess('Template copied to clipboard!');
                      }}
                    >
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                    <Box
                      component="pre"
                      sx={{
                        bgcolor: 'grey.100',
                        p: 2,
                        borderRadius: 1,
                        overflow: 'auto',
                        fontSize: '0.75rem',
                        fontFamily: 'monospace',
                        maxHeight: 300,
                      }}
                    >
                      {template.yaml}
                    </Box>
                  </Box>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        )}
      </Paper>
    </Box>
  );

  // Phase 4: Operations Tab
  const renderOperationsTab = () => (
    <Box sx={{ p: 3, height: '100%', overflow: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SettingsIcon /> Operations & Monitoring
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => {
              fetchMetricsServerStatus();
              fetchClusterAutoscalerStatus();
              fetchNodeHealth();
              fetchProblematicPods();
              if (metricsServerStatus?.ready) {
                fetchNodeMetrics();
              }
            }}
          >
            Refresh All
          </Button>
        </Box>
      </Box>

      {/* System Components Status */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>System Components</Typography>
        <Grid container spacing={2}>
          {/* Metrics Server Card */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SpeedIcon /> Metrics Server
                  </Typography>
                  {metricsServerStatus?.installed ? (
                    <Chip 
                      label={metricsServerStatus.ready ? 'Ready' : 'Installing'} 
                      color={metricsServerStatus.ready ? 'success' : 'warning'}
                      size="small"
                    />
                  ) : (
                    <Chip label="Not Installed" color="default" size="small" />
                  )}
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Required for resource usage metrics (kubectl top)
                </Typography>
                {!metricsServerStatus?.installed && (
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleInstallMetricsServer}
                    disabled={loading.installMetricsServer}
                    startIcon={loading.installMetricsServer ? <CircularProgress size={16} /> : <AddIcon />}
                  >
                    Install
                  </Button>
                )}
                {metricsServerStatus?.installed && (
                  <Typography variant="caption" color="text.secondary">
                    Replicas: {metricsServerStatus.readyReplicas}/{metricsServerStatus.replicas}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Cluster Autoscaler Card */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ScaleIcon /> Cluster Autoscaler
                  </Typography>
                  {clusterAutoscalerStatus?.installed ? (
                    <Chip 
                      label={clusterAutoscalerStatus.ready ? 'Ready' : 'Installing'} 
                      color={clusterAutoscalerStatus.ready ? 'success' : 'warning'}
                      size="small"
                    />
                  ) : (
                    <Chip label="Not Installed" color="default" size="small" />
                  )}
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Automatically adjusts cluster size based on pod resource requests
                </Typography>
                {!clusterAutoscalerStatus?.installed && selectedCluster && (
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleInstallClusterAutoscaler}
                    disabled={loading.installAutoscaler}
                    startIcon={loading.installAutoscaler ? <CircularProgress size={16} /> : <AddIcon />}
                  >
                    Install
                  </Button>
                )}
                {!selectedCluster && !clusterAutoscalerStatus?.installed && (
                  <Typography variant="caption" color="warning.main">
                    Select a cluster to install
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* Node Health */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Node Health</Typography>
          <IconButton size="small" onClick={fetchNodeHealth}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Box>
        
        {loading.nodeHealth ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>
        ) : nodeHealth.length === 0 ? (
          <Alert severity="info">Click refresh to load node health data</Alert>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Node</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Issues</TableCell>
                  <TableCell>Kubelet</TableCell>
                  <TableCell>CPU (Allocatable)</TableCell>
                  <TableCell>Memory (Allocatable)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {nodeHealth.map((node) => (
                  <TableRow key={node.name} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">{node.name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={node.ready ? 'Ready' : 'NotReady'} 
                        color={node.ready ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {node.issues.length === 0 ? (
                        <Chip label="Healthy" color="success" size="small" variant="outlined" />
                      ) : (
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {node.issues.map((issue, i) => (
                            <Chip key={i} label={issue} color="error" size="small" />
                          ))}
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">{node.nodeInfo?.kubeletVersion}</Typography>
                    </TableCell>
                    <TableCell>{node.allocatable?.cpu}</TableCell>
                    <TableCell>{node.allocatable?.memory}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Resource Metrics */}
      {metricsServerStatus?.ready && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Resource Usage</Typography>
            <IconButton size="small" onClick={fetchNodeMetrics}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Box>
          
          {loading.nodeMetrics ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>
          ) : nodeMetrics.error ? (
            <Alert severity="warning">{nodeMetrics.error}</Alert>
          ) : nodeMetrics.length === 0 ? (
            <Alert severity="info">Click refresh to load metrics</Alert>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Node</TableCell>
                    <TableCell>CPU Usage</TableCell>
                    <TableCell>CPU %</TableCell>
                    <TableCell>Memory Usage</TableCell>
                    <TableCell>Memory %</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {nodeMetrics.map((node) => (
                    <TableRow key={node.name} hover>
                      <TableCell>{node.name}</TableCell>
                      <TableCell>{node.cpuUsage}</TableCell>
                      <TableCell>
                        <Chip 
                          label={node.cpuPercent} 
                          size="small" 
                          color={parseInt(node.cpuPercent) > 80 ? 'error' : parseInt(node.cpuPercent) > 60 ? 'warning' : 'success'}
                        />
                      </TableCell>
                      <TableCell>{node.memoryUsage}</TableCell>
                      <TableCell>
                        <Chip 
                          label={node.memoryPercent} 
                          size="small"
                          color={parseInt(node.memoryPercent) > 80 ? 'error' : parseInt(node.memoryPercent) > 60 ? 'warning' : 'success'}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* Problematic Pods */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningIcon color="warning" /> Problematic Pods
            {problematicPods.length > 0 && (
              <Chip label={problematicPods.length} color="error" size="small" />
            )}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton size="small" onClick={() => fetchProblematicPods()}>
              <RefreshIcon fontSize="small" />
            </IconButton>
            {problematicPods.length > 0 && (
              <Button
                size="small"
                color="error"
                variant="outlined"
                startIcon={<DeleteIcon />}
                onClick={handleBulkDeletePods}
                disabled={loading.bulkDelete}
              >
                Delete All ({problematicPods.length})
              </Button>
            )}
          </Box>
        </Box>
        
        {loading.problematicPods ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>
        ) : problematicPods.length === 0 ? (
          <Alert severity="success">No problematic pods found</Alert>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Pod</TableCell>
                  <TableCell>Namespace</TableCell>
                  <TableCell>Issue</TableCell>
                  <TableCell>Restarts</TableCell>
                  <TableCell>Node</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {problematicPods.map((pod) => (
                  <TableRow key={`${pod.namespace}/${pod.name}`} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">{pod.name}</Typography>
                    </TableCell>
                    <TableCell>{pod.namespace}</TableCell>
                    <TableCell>
                      <Chip label={pod.issue} color="error" size="small" />
                    </TableCell>
                    <TableCell>{pod.restartCount}</TableCell>
                    <TableCell>
                      <Typography variant="caption">{pod.nodeName || '-'}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="View Logs">
                        <IconButton 
                          size="small"
                          onClick={() => {
                            setSelectedResource({ type: 'pod', name: pod.name, namespace: pod.namespace });
                          }}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* ConfigMaps & Secrets */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* ConfigMaps */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">ConfigMaps</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <IconButton size="small" onClick={() => fetchConfigMaps()}>
                  <RefreshIcon fontSize="small" />
                </IconButton>
                <Button size="small" startIcon={<AddIcon />} onClick={() => setCreateConfigMapOpen(true)}>
                  Create
                </Button>
              </Box>
            </Box>
            
            {loading.configMaps ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress size={24} /></Box>
            ) : configMaps.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No ConfigMaps in {selectedNamespace}</Typography>
            ) : (
              <List dense sx={{ maxHeight: 300, overflow: 'auto' }}>
                {configMaps.map((cm) => (
                  <ListItem 
                    key={cm.name}
                    secondaryAction={
                      <IconButton edge="end" size="small" onClick={() => handleDeleteConfigMap(cm.name, cm.namespace)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    }
                  >
                    <ListItemText 
                      primary={cm.name}
                      secondary={`${cm.dataCount} keys`}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Secrets */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Secrets</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <IconButton size="small" onClick={() => fetchSecrets()}>
                  <RefreshIcon fontSize="small" />
                </IconButton>
                <Button size="small" startIcon={<AddIcon />} onClick={() => setCreateSecretOpen(true)}>
                  Create
                </Button>
              </Box>
            </Box>
            
            {loading.secrets ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress size={24} /></Box>
            ) : secrets.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No Secrets in {selectedNamespace}</Typography>
            ) : (
              <List dense sx={{ maxHeight: 300, overflow: 'auto' }}>
                {secrets.map((secret) => (
                  <ListItem 
                    key={secret.name}
                    secondaryAction={
                      <IconButton edge="end" size="small" onClick={() => handleDeleteSecret(secret.name, secret.namespace)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    }
                  >
                    <ListItemText 
                      primary={secret.name}
                      secondary={`${secret.type} • ${secret.dataCount} keys`}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Troubleshooting Guide */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Troubleshooting Guide</Typography>
        
        <FormControl size="small" sx={{ minWidth: 250, mb: 2 }}>
          <InputLabel>Issue Type</InputLabel>
          <Select
            value={selectedTroubleshootingType}
            label="Issue Type"
            onChange={(e) => {
              setSelectedTroubleshootingType(e.target.value);
              fetchTroubleshootingChecklist(e.target.value);
            }}
          >
            <MenuItem value="pod-not-starting">Pod Not Starting</MenuItem>
            <MenuItem value="service-not-accessible">Service Not Accessible</MenuItem>
            <MenuItem value="persistent-volume">Persistent Volume Issues</MenuItem>
            <MenuItem value="node-issues">Node Issues</MenuItem>
            <MenuItem value="cluster-autoscaler">Cluster Autoscaler Issues</MenuItem>
          </Select>
        </FormControl>

        {troubleshootingChecklist.length > 0 && (
          <Box>
            {troubleshootingChecklist.map((step, idx) => (
              <Accordion key={idx} sx={{ mb: 1 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Chip label={`Step ${step.step}`} size="small" color="primary" />
                    <Typography>{step.title}</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {step.description}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      component="code"
                      sx={{ 
                        bgcolor: 'grey.100', 
                        p: 1, 
                        borderRadius: 1, 
                        fontSize: '0.85rem',
                        fontFamily: 'monospace',
                        flex: 1,
                      }}
                    >
                      {step.command}
                    </Box>
                    <IconButton 
                      size="small"
                      onClick={() => {
                        navigator.clipboard.writeText(step.command);
                        setSuccess('Command copied!');
                      }}
                    >
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        )}
        
        {troubleshootingChecklist.length === 0 && (
          <Alert severity="info">Select an issue type to see troubleshooting steps</Alert>
        )}
      </Paper>

      {/* Create ConfigMap Dialog */}
      <Dialog open={createConfigMapOpen} onClose={() => setCreateConfigMapOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create ConfigMap</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Name"
              value={newConfigMap.name}
              onChange={(e) => setNewConfigMap(p => ({ ...p, name: e.target.value }))}
              fullWidth
              required
            />
            <FormControl fullWidth>
              <InputLabel>Namespace</InputLabel>
              <Select
                value={newConfigMap.namespace}
                label="Namespace"
                onChange={(e) => setNewConfigMap(p => ({ ...p, namespace: e.target.value }))}
              >
                {namespaces.map(ns => (
                  <MenuItem key={ns} value={ns}>{ns}</MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <Divider />
            <Typography variant="subtitle2">Data</Typography>
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                label="Key"
                value={configMapKeyValue.key}
                onChange={(e) => setConfigMapKeyValue(p => ({ ...p, key: e.target.value }))}
                size="small"
                sx={{ flex: 1 }}
              />
              <TextField
                label="Value"
                value={configMapKeyValue.value}
                onChange={(e) => setConfigMapKeyValue(p => ({ ...p, value: e.target.value }))}
                size="small"
                sx={{ flex: 2 }}
              />
              <Button
                variant="outlined"
                onClick={() => {
                  if (configMapKeyValue.key) {
                    setNewConfigMap(p => ({
                      ...p,
                      data: { ...p.data, [configMapKeyValue.key]: configMapKeyValue.value }
                    }));
                    setConfigMapKeyValue({ key: '', value: '' });
                  }
                }}
              >
                Add
              </Button>
            </Box>
            
            {Object.keys(newConfigMap.data).length > 0 && (
              <Box sx={{ bgcolor: 'grey.50', p: 1, borderRadius: 1 }}>
                {Object.entries(newConfigMap.data).map(([k, v]) => (
                  <Box key={k} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2"><strong>{k}:</strong> {v}</Typography>
                    <IconButton 
                      size="small"
                      onClick={() => {
                        const { [k]: _, ...rest } = newConfigMap.data;
                        setNewConfigMap(p => ({ ...p, data: rest }));
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateConfigMapOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleCreateConfigMap}
            disabled={!newConfigMap.name || Object.keys(newConfigMap.data).length === 0 || loading.createConfigMap}
          >
            {loading.createConfigMap ? <CircularProgress size={20} /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Secret Dialog */}
      <Dialog open={createSecretOpen} onClose={() => setCreateSecretOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Secret</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Secret values will be base64 encoded automatically.
          </Alert>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Name"
              value={newSecret.name}
              onChange={(e) => setNewSecret(p => ({ ...p, name: e.target.value }))}
              fullWidth
              required
            />
            <FormControl fullWidth>
              <InputLabel>Namespace</InputLabel>
              <Select
                value={newSecret.namespace}
                label="Namespace"
                onChange={(e) => setNewSecret(p => ({ ...p, namespace: e.target.value }))}
              >
                {namespaces.map(ns => (
                  <MenuItem key={ns} value={ns}>{ns}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                value={newSecret.type}
                label="Type"
                onChange={(e) => setNewSecret(p => ({ ...p, type: e.target.value }))}
              >
                <MenuItem value="Opaque">Opaque (generic)</MenuItem>
                <MenuItem value="kubernetes.io/dockerconfigjson">Docker Registry</MenuItem>
                <MenuItem value="kubernetes.io/tls">TLS</MenuItem>
                <MenuItem value="kubernetes.io/basic-auth">Basic Auth</MenuItem>
              </Select>
            </FormControl>
            
            <Divider />
            <Typography variant="subtitle2">Data</Typography>
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                label="Key"
                value={secretKeyValue.key}
                onChange={(e) => setSecretKeyValue(p => ({ ...p, key: e.target.value }))}
                size="small"
                sx={{ flex: 1 }}
              />
              <TextField
                label="Value"
                type="password"
                value={secretKeyValue.value}
                onChange={(e) => setSecretKeyValue(p => ({ ...p, value: e.target.value }))}
                size="small"
                sx={{ flex: 2 }}
              />
              <Button
                variant="outlined"
                onClick={() => {
                  if (secretKeyValue.key) {
                    setNewSecret(p => ({
                      ...p,
                      data: { ...p.data, [secretKeyValue.key]: secretKeyValue.value }
                    }));
                    setSecretKeyValue({ key: '', value: '' });
                  }
                }}
              >
                Add
              </Button>
            </Box>
            
            {Object.keys(newSecret.data).length > 0 && (
              <Box sx={{ bgcolor: 'grey.50', p: 1, borderRadius: 1 }}>
                {Object.entries(newSecret.data).map(([k]) => (
                  <Box key={k} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2"><strong>{k}:</strong> ••••••••</Typography>
                    <IconButton 
                      size="small"
                      onClick={() => {
                        const { [k]: _, ...rest } = newSecret.data;
                        setNewSecret(p => ({ ...p, data: rest }));
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateSecretOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleCreateSecret}
            disabled={!newSecret.name || Object.keys(newSecret.data).length === 0 || loading.createSecret}
          >
            {loading.createSecret ? <CircularProgress size={20} /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );

  // Phase 5: Advanced Features Tab
  const renderAdvancedTab = () => (
    <Box sx={{ p: 3, height: '100%', overflow: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ExtensionIcon /> Advanced Features
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => {
              fetchHelmRepos();
              fetchHelmReleases();
              fetchStatefulSets(selectedNamespace);
              fetchPortForwards();
            }}
          >
            Refresh All
          </Button>
        </Box>
      </Box>

      {/* Helm Chart Management */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <HelmIcon /> Helm Chart Management
        </Typography>
        
        {/* Helm Repos */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1">Repositories</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton size="small" onClick={fetchHelmRepos}>
                <RefreshIcon fontSize="small" />
              </IconButton>
              <Button size="small" startIcon={<AddIcon />} onClick={() => setAddHelmRepoOpen(true)}>
                Add Repository
              </Button>
            </Box>
          </Box>
          
          {loading.helmRepos ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress size={24} /></Box>
          ) : helmRepos.length === 0 ? (
            <Alert severity="info">No Helm repositories configured. Add one to get started.</Alert>
          ) : (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {helmRepos.map((repo) => (
                <Chip
                  key={repo.name}
                  label={repo.name}
                  variant="outlined"
                  onDelete={() => handleRemoveHelmRepo(repo.name)}
                  onClick={() => searchHelmCharts('')}
                />
              ))}
            </Box>
          )}
        </Box>
        
        <Divider sx={{ my: 2 }} />
        
        {/* Chart Search */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>Search Charts</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              size="small"
              placeholder="Search for charts..."
              value={helmSearchKeyword}
              onChange={(e) => setHelmSearchKeyword(e.target.value)}
              sx={{ flex: 1 }}
            />
            <Button variant="outlined" onClick={() => searchHelmCharts(helmSearchKeyword)}>
              Search
            </Button>
          </Box>
          
          {loading.helmCharts ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress size={24} /></Box>
          ) : helmCharts.length > 0 && (
            <TableContainer sx={{ mt: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Chart</TableCell>
                    <TableCell>Version</TableCell>
                    <TableCell>App Version</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {helmCharts.slice(0, 10).map((chart) => (
                    <TableRow key={chart.name} hover>
                      <TableCell>{chart.name}</TableCell>
                      <TableCell>{chart.version}</TableCell>
                      <TableCell>{chart.appVersion || '-'}</TableCell>
                      <TableCell sx={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {chart.description}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          startIcon={<AddIcon />}
                          onClick={() => {
                            setNewHelmInstall(p => ({ ...p, chartName: chart.name, version: chart.version }));
                            setInstallHelmChartOpen(true);
                          }}
                        >
                          Install
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
        
        <Divider sx={{ my: 2 }} />
        
        {/* Installed Releases */}
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1">Installed Releases</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton size="small" onClick={() => fetchHelmReleases()}>
                <RefreshIcon fontSize="small" />
              </IconButton>
              <Button size="small" startIcon={<AddIcon />} onClick={() => setInstallHelmChartOpen(true)}>
                Install Chart
              </Button>
            </Box>
          </Box>
          
          {loading.helmReleases ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress size={24} /></Box>
          ) : helmReleases.length === 0 ? (
            <Alert severity="info">No Helm releases installed</Alert>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Release Name</TableCell>
                    <TableCell>Namespace</TableCell>
                    <TableCell>Chart</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Revision</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {helmReleases.map((release) => (
                    <TableRow 
                      key={`${release.namespace}-${release.name}`} 
                      hover
                      selected={selectedHelmRelease?.name === release.name}
                      onClick={() => {
                        setSelectedHelmRelease(release);
                        fetchHelmReleaseHistory(release.name, release.namespace);
                      }}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>{release.name}</TableCell>
                      <TableCell>{release.namespace}</TableCell>
                      <TableCell>{release.chart}</TableCell>
                      <TableCell>
                        <Chip 
                          label={release.status} 
                          color={release.status === 'deployed' ? 'success' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{release.revision}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="History">
                            <IconButton 
                              size="small" 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedHelmRelease(release);
                                fetchHelmReleaseHistory(release.name, release.namespace);
                              }}
                            >
                              <HistoryIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Uninstall">
                            <IconButton 
                              size="small" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUninstallHelmRelease(release.name, release.namespace);
                              }}
                            >
                              <DeleteIcon fontSize="small" color="error" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          
          {/* Release History */}
          {selectedHelmRelease && helmReleaseHistory.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Release History: {selectedHelmRelease.name}
              </Typography>
              <TableContainer sx={{ maxHeight: 200 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Revision</TableCell>
                      <TableCell>Updated</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Chart</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {helmReleaseHistory.map((h) => (
                      <TableRow key={h.revision}>
                        <TableCell>{h.revision}</TableCell>
                        <TableCell>{h.updated}</TableCell>
                        <TableCell>{h.status}</TableCell>
                        <TableCell>{h.chart}</TableCell>
                        <TableCell>
                          {h.revision !== selectedHelmRelease.revision && (
                            <Button
                              size="small"
                              startIcon={<RollbackIcon />}
                              onClick={() => handleRollbackHelmRelease(
                                selectedHelmRelease.name, 
                                h.revision, 
                                selectedHelmRelease.namespace
                              )}
                            >
                              Rollback
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </Box>
      </Paper>

      {/* StatefulSet Wizard */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <StatefulSetIcon /> StatefulSet Wizard
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Namespace</InputLabel>
              <Select
                value={selectedNamespace}
                label="Namespace"
                onChange={(e) => {
                  setSelectedNamespace(e.target.value);
                  fetchStatefulSets(e.target.value);
                }}
              >
                {namespaces.map(ns => (
                  <MenuItem key={ns} value={ns}>{ns}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <IconButton size="small" onClick={() => fetchStatefulSets(selectedNamespace)}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Box>
          <Button startIcon={<AddIcon />} onClick={() => {
            fetchStatefulSetTemplates();
            setCreateStatefulSetOpen(true);
          }}>
            Create StatefulSet
          </Button>
        </Box>
        
        {loading.statefulSets ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress size={24} /></Box>
        ) : statefulSets.length === 0 ? (
          <Alert severity="info">No StatefulSets in {selectedNamespace}</Alert>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Replicas</TableCell>
                  <TableCell>Ready</TableCell>
                  <TableCell>Age</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {statefulSets.map((ss) => (
                  <TableRow key={ss.name} hover>
                    <TableCell>{ss.name}</TableCell>
                    <TableCell>{ss.replicas}</TableCell>
                    <TableCell>
                      <Chip 
                        label={`${ss.readyReplicas || 0}/${ss.replicas}`}
                        color={ss.readyReplicas === ss.replicas ? 'success' : 'warning'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{ss.age}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="Scale Up">
                          <IconButton 
                            size="small"
                            onClick={() => handleScaleStatefulSet(ss.name, selectedNamespace, ss.replicas + 1)}
                          >
                            <AddIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Scale Down">
                          <IconButton 
                            size="small"
                            onClick={() => handleScaleStatefulSet(ss.name, selectedNamespace, Math.max(0, ss.replicas - 1))}
                            disabled={ss.replicas === 0}
                          >
                            <ExpandLessIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton 
                            size="small"
                            onClick={() => handleDeleteStatefulSet(ss.name, selectedNamespace, false)}
                          >
                            <DeleteIcon fontSize="small" color="error" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Port Forwarding & Bastion */}
      <Grid container spacing={2}>
        {/* Port Forwarding */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LinkIcon /> Port Forwarding
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <IconButton size="small" onClick={fetchPortForwards}>
                  <RefreshIcon fontSize="small" />
                </IconButton>
                <Button size="small" startIcon={<AddIcon />} onClick={() => {
                  fetchPortForwardTemplates();
                  setCreatePortForwardOpen(true);
                }}>
                  New Forward
                </Button>
              </Box>
            </Box>
            
            {portForwards.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No active port forwards</Typography>
            ) : (
              <List dense>
                {portForwards.map((pf) => (
                  <ListItem 
                    key={pf.id}
                    secondaryAction={
                      <IconButton edge="end" size="small" onClick={() => handleStopPortForward(pf.id)}>
                        <StopIcon fontSize="small" color="error" />
                      </IconButton>
                    }
                  >
                    <ListItemIcon>
                      <Chip 
                        label={pf.status} 
                        color={pf.status === 'active' ? 'success' : 'default'}
                        size="small"
                      />
                    </ListItemIcon>
                    <ListItemText 
                      primary={`localhost:${pf.localPort} → ${pf.resourceName}:${pf.remotePort}`}
                      secondary={`${pf.resourceType} in ${pf.namespace}`}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Bastion Host Guide */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BastionIcon /> Bastion Host Integration
              </Typography>
              <Button size="small" onClick={() => fetchBastionGuide('aws')}>
                Load Guide
              </Button>
            </Box>
            
            {bastionGuide ? (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>{bastionGuide.title}</Typography>
                <Alert severity="info" sx={{ mb: 2 }}>{bastionGuide.description}</Alert>
                
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="body2">SSH Tunnel Command</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box sx={{ 
                      bgcolor: 'grey.100', 
                      p: 1, 
                      borderRadius: 1, 
                      fontFamily: 'monospace', 
                      fontSize: '0.85rem',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {bastionGuide.sshTunnel}
                    </Box>
                    <IconButton 
                      size="small" 
                      onClick={() => navigator.clipboard.writeText(bastionGuide.sshTunnel)}
                      sx={{ mt: 1 }}
                    >
                      <CopyIcon fontSize="small" />
                    </IconButton>
                  </AccordionDetails>
                </Accordion>
                
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="body2">Prerequisites</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List dense>
                      {bastionGuide.prerequisites?.map((prereq, idx) => (
                        <ListItem key={idx}>
                          <ListItemIcon><CheckCircleIcon fontSize="small" color="primary" /></ListItemIcon>
                          <ListItemText primary={prereq} />
                        </ListItem>
                      ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Click "Load Guide" to see bastion host setup instructions
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Add Helm Repo Dialog */}
      <Dialog open={addHelmRepoOpen} onClose={() => setAddHelmRepoOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Helm Repository</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Repository Name"
              value={newHelmRepo.name}
              onChange={(e) => setNewHelmRepo(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g., bitnami"
              fullWidth
              required
            />
            <TextField
              label="Repository URL"
              value={newHelmRepo.url}
              onChange={(e) => setNewHelmRepo(p => ({ ...p, url: e.target.value }))}
              placeholder="e.g., https://charts.bitnami.com/bitnami"
              fullWidth
              required
            />
            <Typography variant="caption" color="text.secondary">
              Optional authentication for private repositories:
            </Typography>
            <TextField
              label="Username (optional)"
              value={newHelmRepo.username}
              onChange={(e) => setNewHelmRepo(p => ({ ...p, username: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Password (optional)"
              type="password"
              value={newHelmRepo.password}
              onChange={(e) => setNewHelmRepo(p => ({ ...p, password: e.target.value }))}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddHelmRepoOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleAddHelmRepo}
            disabled={!newHelmRepo.name || !newHelmRepo.url || loading.addHelmRepo}
          >
            {loading.addHelmRepo ? <CircularProgress size={20} /> : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Install Helm Chart Dialog */}
      <Dialog open={installHelmChartOpen} onClose={() => setInstallHelmChartOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Install Helm Chart</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Release Name"
              value={newHelmInstall.releaseName}
              onChange={(e) => setNewHelmInstall(p => ({ ...p, releaseName: e.target.value }))}
              placeholder="e.g., my-nginx"
              fullWidth
              required
            />
            <TextField
              label="Chart Name"
              value={newHelmInstall.chartName}
              onChange={(e) => setNewHelmInstall(p => ({ ...p, chartName: e.target.value }))}
              placeholder="e.g., bitnami/nginx"
              fullWidth
              required
            />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Namespace</InputLabel>
                  <Select
                    value={newHelmInstall.namespace}
                    label="Namespace"
                    onChange={(e) => setNewHelmInstall(p => ({ ...p, namespace: e.target.value }))}
                  >
                    {namespaces.map(ns => (
                      <MenuItem key={ns} value={ns}>{ns}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Version (optional)"
                  value={newHelmInstall.version}
                  onChange={(e) => setNewHelmInstall(p => ({ ...p, version: e.target.value }))}
                  placeholder="latest"
                  fullWidth
                />
              </Grid>
            </Grid>
            <FormControlLabel
              control={
                <Switch
                  checked={newHelmInstall.createNamespace}
                  onChange={(e) => setNewHelmInstall(p => ({ ...p, createNamespace: e.target.checked }))}
                />
              }
              label="Create namespace if it doesn't exist"
            />
            <TextField
              label="Custom Values (YAML)"
              value={newHelmInstall.values}
              onChange={(e) => setNewHelmInstall(p => ({ ...p, values: e.target.value }))}
              multiline
              rows={6}
              placeholder="# Custom values in YAML format"
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInstallHelmChartOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleInstallHelmChart}
            disabled={!newHelmInstall.releaseName || !newHelmInstall.chartName || loading.installHelmChart}
          >
            {loading.installHelmChart ? <CircularProgress size={20} /> : 'Install'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create StatefulSet Dialog */}
      <Dialog open={createStatefulSetOpen} onClose={() => setCreateStatefulSetOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create StatefulSet</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="StatefulSet Name"
              value={newStatefulSet.name}
              onChange={(e) => setNewStatefulSet(p => ({ ...p, name: e.target.value }))}
              fullWidth
              required
            />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Namespace</InputLabel>
                  <Select
                    value={newStatefulSet.namespace}
                    label="Namespace"
                    onChange={(e) => setNewStatefulSet(p => ({ ...p, namespace: e.target.value }))}
                  >
                    {namespaces.map(ns => (
                      <MenuItem key={ns} value={ns}>{ns}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth required>
                  <InputLabel>Template</InputLabel>
                  <Select
                    value={newStatefulSet.template}
                    label="Template"
                    onChange={(e) => setNewStatefulSet(p => ({ ...p, template: e.target.value }))}
                  >
                    {statefulSetTemplates.map(t => (
                      <MenuItem key={t.name} value={t.name}>{t.name} - {t.description}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <TextField
                  label="Replicas"
                  type="number"
                  value={newStatefulSet.replicas}
                  onChange={(e) => setNewStatefulSet(p => ({ ...p, replicas: parseInt(e.target.value) || 1 }))}
                  fullWidth
                  inputProps={{ min: 1 }}
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  label="Storage Size"
                  value={newStatefulSet.storageSize}
                  onChange={(e) => setNewStatefulSet(p => ({ ...p, storageSize: e.target.value }))}
                  placeholder="10Gi"
                  fullWidth
                />
              </Grid>
              <Grid item xs={4}>
                <FormControl fullWidth>
                  <InputLabel>Storage Class</InputLabel>
                  <Select
                    value={newStatefulSet.storageClass}
                    label="Storage Class"
                    onChange={(e) => setNewStatefulSet(p => ({ ...p, storageClass: e.target.value }))}
                  >
                    <MenuItem value="">Default</MenuItem>
                    {storageClasses.map(sc => (
                      <MenuItem key={sc.name} value={sc.name}>{sc.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            
            {newStatefulSet.template && statefulSetTemplates.find(t => t.name === newStatefulSet.template) && (
              <Alert severity="info">
                {statefulSetTemplates.find(t => t.name === newStatefulSet.template)?.description}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateStatefulSetOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleCreateStatefulSet}
            disabled={!newStatefulSet.name || !newStatefulSet.template || loading.createStatefulSet}
          >
            {loading.createStatefulSet ? <CircularProgress size={20} /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Port Forward Dialog */}
      <Dialog open={createPortForwardOpen} onClose={() => setCreatePortForwardOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Port Forward</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Resource Type</InputLabel>
              <Select
                value={newPortForward.resourceType}
                label="Resource Type"
                onChange={(e) => setNewPortForward(p => ({ ...p, resourceType: e.target.value }))}
              >
                <MenuItem value="pod">Pod</MenuItem>
                <MenuItem value="service">Service</MenuItem>
                <MenuItem value="deployment">Deployment</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Resource Name"
              value={newPortForward.resourceName}
              onChange={(e) => setNewPortForward(p => ({ ...p, resourceName: e.target.value }))}
              fullWidth
              required
            />
            <FormControl fullWidth>
              <InputLabel>Namespace</InputLabel>
              <Select
                value={newPortForward.namespace}
                label="Namespace"
                onChange={(e) => setNewPortForward(p => ({ ...p, namespace: e.target.value }))}
              >
                {namespaces.map(ns => (
                  <MenuItem key={ns} value={ns}>{ns}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Local Port"
                  type="number"
                  value={newPortForward.localPort}
                  onChange={(e) => setNewPortForward(p => ({ ...p, localPort: parseInt(e.target.value) || 8080 }))}
                  fullWidth
                  inputProps={{ min: 1, max: 65535 }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Remote Port"
                  type="number"
                  value={newPortForward.remotePort}
                  onChange={(e) => setNewPortForward(p => ({ ...p, remotePort: parseInt(e.target.value) || 8080 }))}
                  fullWidth
                  inputProps={{ min: 1, max: 65535 }}
                />
              </Grid>
            </Grid>
            
            {/* Port Forward Templates */}
            {portForwardTemplates.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Quick Templates</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {portForwardTemplates.map((template) => (
                    <Chip
                      key={template.name}
                      label={template.name}
                      variant="outlined"
                      onClick={() => setNewPortForward(p => ({
                        ...p,
                        localPort: template.localPort,
                        remotePort: template.remotePort
                      }))}
                    />
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreatePortForwardOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleStartPortForward}
            disabled={!newPortForward.resourceName || loading.startPortForward}
          >
            {loading.startPortForward ? <CircularProgress size={20} /> : 'Start'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );

  const renderDockerBrowser = () => (
    <Paper sx={{ height: '100%', overflow: 'auto' }}>
      <List dense subheader={
        <ListSubheader sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <StorageIcon fontSize="small" />
            Docker Images
          </Box>
          <IconButton size="small" onClick={fetchLocalImages}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </ListSubheader>
      }>
        {loading.images ? (
          <ListItem><CircularProgress size={20} /></ListItem>
        ) : localImages.length === 0 ? (
          <ListItem><ListItemText secondary="No images found" /></ListItem>
        ) : (
          localImages.map((img, idx) => (
            <ListItemButton
              key={idx}
              selected={selectedImage?.ID === img.ID}
              onClick={() => setSelectedImage(img)}
              sx={{ pl: 2 }}
            >
              <ListItemIcon><ImageIcon fontSize="small" /></ListItemIcon>
              <ListItemText
                primary={`${img.Repository}:${img.Tag}`}
                secondary={img.Size}
                primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
              <Tooltip title="Deploy to K8s">
                <IconButton size="small" onClick={(e) => { e.stopPropagation(); selectImageForDeploy(img); }}>
                  <DeployIcon fontSize="small" color="primary" />
                </IconButton>
              </Tooltip>
            </ListItemButton>
          ))
        )}
      </List>
      
      <Divider />
      
      <List dense subheader={
        <ListSubheader sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ContainerIcon fontSize="small" />
            Running Containers
          </Box>
          <IconButton size="small" onClick={fetchContainers}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </ListSubheader>
      }>
        {loading.containers ? (
          <ListItem><CircularProgress size={20} /></ListItem>
        ) : containers.length === 0 ? (
          <ListItem><ListItemText secondary="No containers running" /></ListItem>
        ) : (
          containers.map((c, idx) => (
            <ListItemButton
              key={idx}
              selected={selectedContainer?.ID === c.ID}
              onClick={() => setSelectedContainer(c)}
              sx={{ pl: 2 }}
            >
              <ListItemIcon>
                <Chip
                  size="small"
                  label={c.State}
                  color={c.State === 'running' ? 'success' : 'default'}
                  sx={{ minWidth: 60 }}
                />
              </ListItemIcon>
              <ListItemText
                primary={c.Names}
                secondary={c.Image}
                primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                secondaryTypographyProps={{ variant: 'caption', noWrap: true }}
              />
            </ListItemButton>
          ))
        )}
      </List>
    </Paper>
  );

  const renderK8sBrowser = () => (
    <Paper sx={{ height: '100%', overflow: 'auto' }}>
      <List dense subheader={
        <ListSubheader sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CloudIcon fontSize="small" />
            Kubernetes Cluster
          </Box>
          <Box>
            <Tooltip title="Create Namespace">
              <IconButton size="small" onClick={() => setCreateNamespaceOpen(true)}>
                <AddIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <IconButton size="small" onClick={fetchNamespaces}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Box>
        </ListSubheader>
      }>
        {loading.namespaces ? (
          <ListItem><CircularProgress size={20} /></ListItem>
        ) : (
          namespaces.map((ns) => (
            <React.Fragment key={ns.name}>
              <ListItemButton
                onClick={() => toggleNamespace(ns.name)}
                selected={selectedNamespace === ns.name}
              >
                <ListItemIcon>
                  {expandedNamespaces.includes(ns.name) ? <FolderOpenIcon /> : <FolderIcon />}
                </ListItemIcon>
                <ListItemText
                  primary={ns.name}
                  secondary={ns.status}
                  primaryTypographyProps={{ variant: 'body2' }}
                  secondaryTypographyProps={{ variant: 'caption' }}
                />
                <Chip size="small" label={ns.status} color={statusColors[ns.status] || 'default'} />
                {!['default', 'kube-system', 'kube-public', 'kube-node-lease'].includes(ns.name) && (
                  <Tooltip title="Delete Namespace">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget({ type: 'namespace', name: ns.name });
                        setConfirmDeleteOpen(true);
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                {expandedNamespaces.includes(ns.name) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </ListItemButton>
              
              <Collapse in={expandedNamespaces.includes(ns.name) && selectedNamespace === ns.name} timeout="auto">
                {loading.resources && selectedNamespace === ns.name ? (
                  <ListItem sx={{ pl: 4 }}><CircularProgress size={16} /></ListItem>
                ) : (
                  <>
                    {/* Deployments */}
                    <ListSubheader sx={{ pl: 4, py: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LayersIcon fontSize="small" />
                        Deployments ({k8sDeployments.length})
                      </Box>
                    </ListSubheader>
                    {k8sDeployments.map((dep) => (
                      <ListItemButton
                        key={dep.name}
                        sx={{ pl: 6 }}
                        selected={selectedResource?.resource?.name === dep.name && selectedResource?.type === 'deployment'}
                        onClick={() => selectResource('deployment', dep)}
                      >
                        <ListItemText
                          primary={dep.name}
                          secondary={`${dep.readyReplicas}/${dep.replicas} ready`}
                          primaryTypographyProps={{ variant: 'body2' }}
                          secondaryTypographyProps={{ variant: 'caption' }}
                        />
                        <Tooltip title="Restart">
                          <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleRestartDeployment(dep.name, ns.name); }}>
                            <RestartIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget({ type: 'deployment', name: dep.name, namespace: ns.name });
                            setConfirmDeleteOpen(true);
                          }}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </ListItemButton>
                    ))}
                    
                    {/* Services */}
                    <ListSubheader sx={{ pl: 4, py: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ServiceIcon fontSize="small" />
                        Services ({k8sServices.length})
                      </Box>
                    </ListSubheader>
                    {k8sServices.map((svc) => (
                      <ListItemButton
                        key={svc.name}
                        sx={{ pl: 6 }}
                        selected={selectedResource?.resource?.name === svc.name && selectedResource?.type === 'service'}
                        onClick={() => selectResource('service', svc)}
                      >
                        <ListItemText
                          primary={svc.name}
                          secondary={`${svc.type} - ${svc.clusterIP}`}
                          primaryTypographyProps={{ variant: 'body2' }}
                          secondaryTypographyProps={{ variant: 'caption' }}
                        />
                        <Chip size="small" label={svc.type} />
                      </ListItemButton>
                    ))}
                    
                    {/* Pods */}
                    <ListSubheader sx={{ pl: 4, py: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PodIcon fontSize="small" />
                        Pods ({k8sPods.length})
                      </Box>
                    </ListSubheader>
                    {k8sPods.map((pod) => (
                      <ListItemButton
                        key={pod.name}
                        sx={{ pl: 6 }}
                        selected={selectedResource?.resource?.name === pod.name && selectedResource?.type === 'pod'}
                        onClick={() => selectResource('pod', pod)}
                      >
                        <ListItemIcon sx={{ minWidth: 30 }}>
                          {podStatusIcons[pod.status] || <PendingIcon fontSize="small" />}
                        </ListItemIcon>
                        <ListItemText
                          primary={pod.name}
                          secondary={`${pod.status} - Restarts: ${pod.restarts}`}
                          primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                          secondaryTypographyProps={{ variant: 'caption' }}
                        />
                      </ListItemButton>
                    ))}
                  </>
                )}
              </Collapse>
            </React.Fragment>
          ))
        )}
      </List>
    </Paper>
  );

  const renderCloudBrowser = () => (
    <Paper sx={{ height: '100%', overflow: 'auto' }}>
      {/* Credential Selector */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <FormControl fullWidth size="small">
          <InputLabel>Cloud Credential</InputLabel>
          <Select
            value={selectedCredential || ''}
            label="Cloud Credential"
            onChange={(e) => setSelectedCredential(e.target.value)}
          >
            {credentials.map((cred) => (
              <MenuItem key={cred.id} value={cred.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip
                    size="small"
                    label={cred.cloudProvider?.toUpperCase()}
                    color={
                      cred.cloudProvider === 'aws' ? 'warning' :
                      cred.cloudProvider === 'azure' ? 'info' :
                      cred.cloudProvider === 'gcp' ? 'success' :
                      cred.cloudProvider === 'digitalocean' ? 'primary' :
                      cred.cloudProvider === 'linode' ? 'secondary' : 'default'
                    }
                    sx={{ minWidth: 50 }}
                  />
                  {cred.name}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        {/* Region Selector */}
        {selectedCredential && availableRegions.length > 0 && (
          <FormControl fullWidth size="small" sx={{ mt: 1 }}>
            <InputLabel>Region</InputLabel>
            <Select
              value={selectedRegion}
              label="Region"
              onChange={(e) => setSelectedRegion(e.target.value)}
            >
              {availableRegions.map((region) => (
                <MenuItem key={region.id} value={region.id}>
                  {region.name} ({region.id})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        
        {selectedCredential && loading.regions && (
          <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={16} />
            <Typography variant="body2" color="textSecondary">Loading regions...</Typography>
          </Box>
        )}
        
        {selectedCredential && selectedRegion && (
          <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => {
                fetchCloudRegistries(selectedCredential, selectedRegion);
                fetchCloudClusters(selectedCredential, selectedRegion);
              }}
            >
              Refresh
            </Button>
          </Box>
        )}
      </Box>

      {!selectedCredential ? (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <CloudProviderIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
          <Typography color="textSecondary">
            Select a cloud credential to browse registries and clusters
          </Typography>
        </Box>
      ) : !selectedRegion ? (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <CloudProviderIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
          <Typography color="textSecondary">
            Select a region to browse resources
          </Typography>
        </Box>
      ) : (
        <>
          {/* Cloud Clusters */}
          <List dense subheader={
            <ListSubheader sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CloudIcon fontSize="small" />
                K8s Clusters
              </Box>
              {loading.cloudClusters && <CircularProgress size={16} />}
            </ListSubheader>
          }>
            {cloudClusters.length === 0 && !loading.cloudClusters ? (
              <ListItem><ListItemText secondary="No clusters found" /></ListItem>
            ) : (
              cloudClusters.map((cluster, idx) => (
                <ListItemButton
                  key={idx}
                  selected={selectedCluster?.name === cluster.name}
                  onClick={() => setSelectedCluster(cluster)}
                >
                  <ListItemIcon>
                    <Chip
                      size="small"
                      label={cluster.type?.toUpperCase() || cluster.provider?.toUpperCase()}
                      color={
                        cluster.type === 'eks' ? 'warning' :
                        cluster.type === 'aks' ? 'info' :
                        cluster.type === 'gke' ? 'success' : 'default'
                      }
                      sx={{ minWidth: 40 }}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={cluster.name}
                    secondary={`${cluster.region || cluster.location || cluster.zone} • ${cluster.status || 'unknown'}`}
                    primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                  <Tooltip title="Connect to Cluster">
                    <IconButton
                      size="small"
                      onClick={(e) => { e.stopPropagation(); handleConnectToCluster(cluster); }}
                      disabled={loading.connectCluster}
                    >
                      {loading.connectCluster ? <CircularProgress size={16} /> : <LinkIcon fontSize="small" color="primary" />}
                    </IconButton>
                  </Tooltip>
                </ListItemButton>
              ))
            )}
          </List>

          <Divider />

          {/* Cloud Registries */}
          <List dense subheader={
            <ListSubheader sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <StorageIcon fontSize="small" />
                Container Registries
              </Box>
              {loading.cloudRegistries && <CircularProgress size={16} />}
            </ListSubheader>
          }>
            {cloudRegistries.length === 0 && !loading.cloudRegistries ? (
              <ListItem><ListItemText secondary="No registries found" /></ListItem>
            ) : (
              cloudRegistries.map((registry, idx) => (
                <ListItemButton
                  key={idx}
                  selected={selectedRegistry?.uri === registry.uri}
                  onClick={() => setSelectedRegistry(registry)}
                >
                  <ListItemIcon>
                    <Chip
                      size="small"
                      label={registry.type?.toUpperCase() || registry.provider?.toUpperCase()}
                      color={
                        registry.type === 'ecr' ? 'warning' :
                        registry.type === 'acr' ? 'info' :
                        registry.type === 'gcr' ? 'success' : 'default'
                      }
                      sx={{ minWidth: 40 }}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={registry.name}
                    secondary={registry.uri}
                    primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                    secondaryTypographyProps={{ variant: 'caption', noWrap: true }}
                  />
                  <Tooltip title="Authenticate Registry">
                    <IconButton
                      size="small"
                      onClick={(e) => { e.stopPropagation(); handleAuthenticateRegistry(registry); }}
                      disabled={loading.authRegistry}
                    >
                      <CredentialIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </ListItemButton>
              ))
            )}
          </List>

          {/* Registry Images (when registry selected) */}
          {selectedRegistry && (
            <>
              <Divider />
              <List dense subheader={
                <ListSubheader sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ImageIcon fontSize="small" />
                    Images in {selectedRegistry.name}
                  </Box>
                  {loading.cloudImages && <CircularProgress size={16} />}
                </ListSubheader>
              }>
                {cloudRegistryImages.length === 0 && !loading.cloudImages ? (
                  <ListItem><ListItemText secondary="No images found" /></ListItem>
                ) : (
                  cloudRegistryImages.map((image, idx) => (
                    <ListItemButton
                      key={idx}
                      sx={{ pl: 3 }}
                      selected={selectedCloudImage?.uri === image.uri || (selectedCloudImage?.name === image.name && selectedCloudImage?.tag === image.tag)}
                      onClick={() => setSelectedCloudImage(image)}
                    >
                      <ListItemIcon><LayersIcon fontSize="small" /></ListItemIcon>
                      <ListItemText
                        primary={image.uri || `${image.name}:${image.tags?.[0] || image.tag || 'latest'}`}
                        secondary={image.pushedAt || image.timestamp}
                        primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="Pull to Local">
                          <IconButton
                            size="small"
                            onClick={(e) => { e.stopPropagation(); handlePullCloudImage(image.uri); }}
                            disabled={loading.pullImage}
                          >
                            <DownloadIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Deploy to K8s">
                          <IconButton
                            size="small"
                            onClick={(e) => { e.stopPropagation(); selectCloudImageForDeploy(image); }}
                          >
                            <DeployIcon fontSize="small" color="primary" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </ListItemButton>
                  ))
                )}
              </List>
            </>
          )}
        </>
      )}
    </Paper>
  );

  const renderDetailPanel = () => {
    if (!selectedResource && !selectedImage && !selectedContainer && !selectedCloudImage) {
      return (
        <Paper sx={{ height: '100%', p: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography color="textSecondary">
            Select an image, container, or K8s resource to view details
          </Typography>
        </Paper>
      );
    }

    // Cloud Registry Image Details
    if (selectedCloudImage && selectedView === 'cloud') {
      const imageUri = selectedCloudImage.uri || `${selectedCloudImage.name}:${selectedCloudImage.tags?.[0] || selectedCloudImage.tag || 'latest'}`;
      return (
        <Paper sx={{ height: '100%', overflow: 'auto' }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Cloud Image Details</Typography>
            <Box>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                size="small"
                onClick={() => handlePullCloudImage(imageUri)}
                disabled={loading.pullImage}
                sx={{ mr: 1 }}
              >
                Pull to Local
              </Button>
              <Button
                variant="contained"
                startIcon={<DeployIcon />}
                size="small"
                onClick={() => selectCloudImageForDeploy(selectedCloudImage)}
              >
                Deploy to K8s
              </Button>
              <IconButton onClick={() => setSelectedCloudImage(null)} size="small" sx={{ ml: 1 }}>
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>
          <Box sx={{ p: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="caption" color="textSecondary">Image URI</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{imageUri}</Typography>
                  <IconButton size="small" onClick={() => copyToClipboard(imageUri)}>
                    <CopyIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Grid>
              {selectedCloudImage.name && (
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">Repository</Typography>
                  <Typography variant="body2">{selectedCloudImage.name}</Typography>
                </Grid>
              )}
              <Grid item xs={6}>
                <Typography variant="caption" color="textSecondary">Tag(s)</Typography>
                <Typography variant="body2">
                  {selectedCloudImage.tags?.join(', ') || selectedCloudImage.tag || 'latest'}
                </Typography>
              </Grid>
              {selectedCloudImage.digest && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="textSecondary">Digest</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                    {selectedCloudImage.digest}
                  </Typography>
                </Grid>
              )}
              {(selectedCloudImage.pushedAt || selectedCloudImage.timestamp) && (
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">Pushed At</Typography>
                  <Typography variant="body2">
                    {selectedCloudImage.pushedAt || selectedCloudImage.timestamp}
                  </Typography>
                </Grid>
              )}
              {selectedCloudImage.size && (
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">Size</Typography>
                  <Typography variant="body2">{selectedCloudImage.size}</Typography>
                </Grid>
              )}
              {selectedRegistry && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="textSecondary">Registry</Typography>
                  <Typography variant="body2">{selectedRegistry.name}</Typography>
                </Grid>
              )}
            </Grid>
          </Box>
        </Paper>
      );
    }

    // Docker Image Details
    if (selectedImage && selectedView === 'docker') {
      return (
        <Paper sx={{ height: '100%', overflow: 'auto' }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Image Details</Typography>
            <Box>
              <Button
                variant="contained"
                startIcon={<DeployIcon />}
                size="small"
                onClick={() => selectImageForDeploy(selectedImage)}
              >
                Deploy to K8s
              </Button>
              <IconButton onClick={() => setSelectedImage(null)} size="small" sx={{ ml: 1 }}>
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>
          <Box sx={{ p: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="caption" color="textSecondary">Repository</Typography>
                <Typography variant="body2">{selectedImage.Repository}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="textSecondary">Tag</Typography>
                <Typography variant="body2">{selectedImage.Tag}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="textSecondary">Size</Typography>
                <Typography variant="body2">{selectedImage.Size}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="textSecondary">Created</Typography>
                <Typography variant="body2">{selectedImage.CreatedSince}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="caption" color="textSecondary">Image ID</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{selectedImage.ID}</Typography>
                  <IconButton size="small" onClick={() => copyToClipboard(selectedImage.ID)}>
                    <CopyIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </Paper>
      );
    }

    // Docker Container Details
    if (selectedContainer && selectedView === 'docker') {
      return (
        <Paper sx={{ height: '100%', overflow: 'auto' }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Container Details</Typography>
            <IconButton onClick={() => setSelectedContainer(null)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
          <Box sx={{ p: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="caption" color="textSecondary">Name</Typography>
                <Typography variant="body2">{selectedContainer.Names}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="textSecondary">State</Typography>
                <Chip size="small" label={selectedContainer.State} color={selectedContainer.State === 'running' ? 'success' : 'default'} />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="caption" color="textSecondary">Image</Typography>
                <Typography variant="body2">{selectedContainer.Image}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="caption" color="textSecondary">Ports</Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{selectedContainer.Ports || 'None'}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="caption" color="textSecondary">Status</Typography>
                <Typography variant="body2">{selectedContainer.Status}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="caption" color="textSecondary">Container ID</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{selectedContainer.ID}</Typography>
                  <IconButton size="small" onClick={() => copyToClipboard(selectedContainer.ID)}>
                    <CopyIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </Paper>
      );
    }

    // K8s Resource Details
    if (selectedResource) {
      return (
        <Paper sx={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">{selectedResource.type.charAt(0).toUpperCase() + selectedResource.type.slice(1)}: {selectedResource.resource.name}</Typography>
            <IconButton onClick={() => setSelectedResource(null)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
          
          <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
            {/* Resource Summary */}
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2">Summary</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="textSecondary">Name</Typography>
                    <Typography variant="body2">{selectedResource.resource.name}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="textSecondary">Namespace</Typography>
                    <Typography variant="body2">{selectedResource.resource.namespace || selectedNamespace}</Typography>
                  </Grid>
                  {selectedResource.type === 'deployment' && (
                    <>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="textSecondary">Replicas</Typography>
                        <Typography variant="body2">{selectedResource.resource.readyReplicas}/{selectedResource.resource.replicas}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="textSecondary">Image</Typography>
                        <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>{selectedResource.resource.image}</Typography>
                      </Grid>
                    </>
                  )}
                  {selectedResource.type === 'service' && (
                    <>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="textSecondary">Type</Typography>
                        <Typography variant="body2">{selectedResource.resource.type}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="textSecondary">Cluster IP</Typography>
                        <Typography variant="body2">{selectedResource.resource.clusterIP}</Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="caption" color="textSecondary">Ports</Typography>
                        <Box>
                          {selectedResource.resource.ports?.map((p, i) => (
                            <Chip key={i} size="small" label={`${p.port}:${p.targetPort}/${p.protocol}`} sx={{ mr: 0.5, mb: 0.5 }} />
                          ))}
                        </Box>
                      </Grid>
                    </>
                  )}
                  {selectedResource.type === 'pod' && (
                    <>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="textSecondary">Status</Typography>
                        <Chip size="small" label={selectedResource.resource.status} color={statusColors[selectedResource.resource.status] || 'default'} />
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="textSecondary">Restarts</Typography>
                        <Typography variant="body2">{selectedResource.resource.restarts}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="textSecondary">Pod IP</Typography>
                        <Typography variant="body2">{selectedResource.resource.podIP}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="textSecondary">Node</Typography>
                        <Typography variant="body2">{selectedResource.resource.nodeName}</Typography>
                      </Grid>
                    </>
                  )}
                </Grid>
              </AccordionDetails>
            </Accordion>
            
            {/* Pod Logs */}
            {selectedResource.type === 'pod' && (
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TerminalIcon fontSize="small" />
                    <Typography variant="subtitle2">Logs</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                    <Button size="small" onClick={() => fetchPodLogs(selectedNamespace, selectedResource.resource.name)}>
                      Refresh
                    </Button>
                  </Box>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 1,
                      bgcolor: 'grey.900',
                      color: 'grey.300',
                      fontFamily: 'monospace',
                      fontSize: '12px',
                      whiteSpace: 'pre-wrap',
                      maxHeight: 300,
                      overflow: 'auto',
                    }}
                  >
                    {loading.logs ? 'Loading logs...' : (podLogs || 'No logs available')}
                  </Paper>
                </AccordionDetails>
              </Accordion>
            )}
            
            {/* Resource Description (kubectl describe) */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <InfoIcon fontSize="small" />
                  <Typography variant="subtitle2">Full Description</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1,
                    bgcolor: 'grey.100',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    whiteSpace: 'pre-wrap',
                    maxHeight: 400,
                    overflow: 'auto',
                  }}
                >
                  {loading.description ? 'Loading...' : (resourceDescription || 'No description available')}
                </Paper>
              </AccordionDetails>
            </Accordion>
          </Box>
        </Paper>
      );
    }

    return null;
  };

  const renderEventsPanel = () => (
    <Paper sx={{ height: 200, overflow: 'auto' }}>
      <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EventIcon fontSize="small" />
          <Typography variant="subtitle2">Events ({k8sEvents.length})</Typography>
        </Box>
        <IconButton size="small" onClick={() => fetchNamespaceResources(selectedNamespace)}>
          <RefreshIcon fontSize="small" />
        </IconButton>
      </Box>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Type</TableCell>
              <TableCell>Reason</TableCell>
              <TableCell>Object</TableCell>
              <TableCell>Message</TableCell>
              <TableCell>Time</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {k8sEvents.slice(0, 20).map((event, idx) => (
              <TableRow key={idx}>
                <TableCell>
                  <Chip
                    size="small"
                    label={event.type}
                    color={event.type === 'Warning' ? 'warning' : event.type === 'Error' ? 'error' : 'default'}
                  />
                </TableCell>
                <TableCell>{event.reason}</TableCell>
                <TableCell sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>{event.object}</TableCell>
                <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <Tooltip title={event.message}>
                    <span>{event.message}</span>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{new Date(event.lastTimestamp).toLocaleTimeString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );

  // ==========================================
  // MAIN RENDER
  // ==========================================

  return (
    <Box sx={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column', p: 2 }}>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h5">Kubernetes Deployment Assistant</Typography>
            <Typography variant="body2" color="textSecondary">
              Context: {k8sContext?.currentContext || 'Loading...'} | Namespace: {selectedNamespace}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {k8sContext?.availableContexts?.length > 1 && (
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Context</InputLabel>
                <Select
                  value={k8sContext?.currentContext || ''}
                  label="Context"
                  onChange={(e) => handleSwitchContext(e.target.value)}
                >
                  {k8sContext?.availableContexts?.map((ctx) => (
                    <MenuItem key={ctx} value={ctx}>{ctx}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            <Button
              variant="contained"
              startIcon={<DeployIcon />}
              onClick={() => {
                resetDeployConfig();
                setQuickDeployOpen(true);
              }}
            >
              Quick Deploy
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Alerts */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>
      )}
      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>{success}</Alert>
      )}

      {/* Main Content */}
      <Box sx={{ flex: 1, display: 'flex', gap: 2, overflow: 'hidden' }}>
        {/* Left Panel - Browser */}
        <Box sx={{ width: 380, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Tabs
            value={selectedView}
            onChange={(e, v) => setSelectedView(v)}
            sx={{ borderBottom: 1, borderColor: 'divider' }}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab value="setup" label="Setup" icon={<BuildIcon />} iconPosition="start" />
            <Tab value="storage" label="Storage" icon={<DiskIcon />} iconPosition="start" />
            <Tab value="network" label="Network" icon={<VpnLock />} iconPosition="start" />
            <Tab value="operations" label="Operations" icon={<SettingsIcon />} iconPosition="start" />
            <Tab value="advanced" label="Advanced" icon={<ExtensionIcon />} iconPosition="start" />
            <Tab value="docker" label="Docker" icon={<StorageIcon />} iconPosition="start" />
            <Tab value="k8s" label="K8s" icon={<CloudIcon />} iconPosition="start" />
            <Tab value="cloud" label="Cloud" icon={<CloudProviderIcon />} iconPosition="start" />
          </Tabs>
          <Box sx={{ flex: 1, overflow: 'hidden' }}>
            {selectedView === 'setup' && renderSetupTab()}
            {selectedView === 'storage' && renderStorageTab()}
            {selectedView === 'network' && renderNetworkTab()}
            {selectedView === 'operations' && renderOperationsTab()}
            {selectedView === 'advanced' && renderAdvancedTab()}
            {selectedView === 'docker' && renderDockerBrowser()}
            {selectedView === 'k8s' && renderK8sBrowser()}
            {selectedView === 'cloud' && renderCloudBrowser()}
          </Box>
        </Box>

        {/* Right Panel - Details */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden' }}>
          <Box sx={{ flex: 1, overflow: 'hidden' }}>
            {renderDetailPanel()}
          </Box>
          {(selectedView === 'k8s' || (selectedView === 'cloud' && connectedToCloud)) && renderEventsPanel()}
        </Box>
      </Box>

      {/* Quick Deploy Dialog */}
      <Dialog open={quickDeployOpen} onClose={() => setQuickDeployOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Quick Deploy to Kubernetes</span>
          <Box>
            <Tabs
              value={deployMode}
              onChange={(e, v) => v === 'yaml' ? handleSwitchToYamlMode() : handleSwitchToFormMode()}
              sx={{ minHeight: 36 }}
            >
              <Tab 
                value="form" 
                label="Form" 
                icon={<EditIcon fontSize="small" />} 
                iconPosition="start"
                sx={{ minHeight: 36, py: 0 }}
              />
              <Tab 
                value="yaml" 
                label="YAML" 
                icon={<CodeIcon fontSize="small" />} 
                iconPosition="start"
                sx={{ minHeight: 36, py: 0 }}
              />
            </Tabs>
          </Box>
        </DialogTitle>
        <DialogContent>
          {deployMode === 'form' ? (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Deploy a Docker image directly to your Kubernetes cluster. This will create a Deployment and optionally a Service.
                  <br />
                  <strong>Tip:</strong> Switch to YAML mode to customize the deployment manifest.
                </Alert>
              </Grid>
              <Grid item xs={8}>
                <TextField
                  fullWidth
                  label="Image Name"
                  value={deployConfig.imageName}
                  onChange={(e) => setDeployConfig({ ...deployConfig, imageName: e.target.value })}
                  helperText="e.g., nginx, myapp, registry.example.com/myapp"
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  fullWidth
                  label="Tag"
                  value={deployConfig.imageTag}
                  onChange={(e) => setDeployConfig({ ...deployConfig, imageTag: e.target.value })}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Deployment Name"
                  value={deployConfig.deploymentName}
                  onChange={(e) => setDeployConfig({ ...deployConfig, deploymentName: e.target.value })}
                  helperText="Leave empty to auto-generate from image name"
                />
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Namespace</InputLabel>
                  <Select
                    value={deployConfig.namespace}
                    label="Namespace"
                    onChange={(e) => setDeployConfig({ ...deployConfig, namespace: e.target.value })}
                  >
                    {namespaces.map((ns) => (
                      <MenuItem key={ns.name} value={ns.name}>{ns.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <Typography gutterBottom>Replicas: {deployConfig.replicas}</Typography>
                <Slider
                  value={deployConfig.replicas}
                  onChange={(e, v) => setDeployConfig({ ...deployConfig, replicas: v })}
                  min={1}
                  max={10}
                  marks
                  valueLabelDisplay="auto"
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Container Port"
                  value={deployConfig.containerPort}
                  onChange={(e) => setDeployConfig({ ...deployConfig, containerPort: parseInt(e.target.value) })}
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Service Port"
                  value={deployConfig.servicePort}
                  onChange={(e) => setDeployConfig({ ...deployConfig, servicePort: parseInt(e.target.value) })}
                  disabled={!deployConfig.createService}
                />
              </Grid>
              <Grid item xs={4}>
                <FormControl fullWidth>
                  <InputLabel>Service Type</InputLabel>
                  <Select
                    value={deployConfig.serviceType}
                    label="Service Type"
                    onChange={(e) => setDeployConfig({ ...deployConfig, serviceType: e.target.value })}
                    disabled={!deployConfig.createService}
                  >
                    <MenuItem value="ClusterIP">ClusterIP</MenuItem>
                    <MenuItem value="NodePort">NodePort</MenuItem>
                    <MenuItem value="LoadBalancer">LoadBalancer</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={deployConfig.createService}
                      onChange={(e) => setDeployConfig({ ...deployConfig, createService: e.target.checked })}
                    />
                  }
                  label="Create Service"
                />
              </Grid>
            </Grid>
          ) : (
            <Box sx={{ mt: 2 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                Customize the Kubernetes manifest YAML below. You can add environment variables, volumes, init containers, and more.
                <br />
                <strong>Note:</strong> Multiple resources can be separated with <code>---</code>
              </Alert>
              <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Namespace</InputLabel>
                  <Select
                    value={deployConfig.namespace}
                    label="Namespace"
                    onChange={(e) => setDeployConfig({ ...deployConfig, namespace: e.target.value })}
                  >
                    {namespaces.map((ns) => (
                      <MenuItem key={ns.name} value={ns.name}>{ns.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button 
                  size="small" 
                  onClick={() => setCustomYaml(generateYamlFromConfig(deployConfig))}
                  disabled={!deployConfig.imageName}
                  variant="outlined"
                >
                  Regenerate from Form
                </Button>
              </Box>
              <TextField
                fullWidth
                multiline
                rows={20}
                value={customYaml}
                onChange={(e) => setCustomYaml(e.target.value)}
                placeholder="Paste or edit your Kubernetes YAML manifest here..."
                sx={{ 
                  fontFamily: 'monospace',
                  '& .MuiInputBase-input': { 
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                    lineHeight: 1.4,
                  }
                }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setQuickDeployOpen(false); setDeployMode('form'); setCustomYaml(''); }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleQuickDeploy}
            disabled={(deployMode === 'form' && !deployConfig.imageName) || (deployMode === 'yaml' && !customYaml) || loading.deploy}
            startIcon={loading.deploy ? <CircularProgress size={16} /> : <DeployIcon />}
          >
            {deployMode === 'yaml' ? 'Apply YAML' : 'Deploy'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Namespace Dialog */}
      <Dialog open={createNamespaceOpen} onClose={() => setCreateNamespaceOpen(false)}>
        <DialogTitle>Create Namespace</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Namespace Name"
            value={newNamespaceName}
            onChange={(e) => setNewNamespaceName(e.target.value)}
            helperText="Lowercase letters, numbers, and hyphens only"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateNamespaceOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateNamespace}
            disabled={!newNamespaceName || loading.createNs}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <Dialog open={confirmDeleteOpen} onClose={() => setConfirmDeleteOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete {deleteTarget?.type} "{deleteTarget?.name}"?
            {deleteTarget?.type === 'namespace' && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Deleting a namespace will remove all resources within it!
              </Alert>
            )}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              if (deleteTarget?.type === 'namespace') {
                handleDeleteNamespace(deleteTarget.name);
              } else if (deleteTarget?.type === 'deployment') {
                handleDeleteDeployment(deleteTarget.name, deleteTarget.namespace);
              }
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default CloudDeploymentToolkit;
