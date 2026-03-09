import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import api from '../../services/api';
import { deploymentDraftsApi } from '../../services/api';

// ==========================================
// INITIAL STATE
// ==========================================

const initialState = {
  // Mode & Navigation
  mode: 'guided', // 'guided' | 'expert'
  currentPhase: 1,
  currentStep: 0,
  phaseValidation: {
    1: { valid: false, completed: false, errors: [] },
    2: { valid: false, completed: false, errors: [] },
    3: { valid: false, completed: false, errors: [] },
    4: { valid: false, completed: false, errors: [] },
    5: { valid: false, completed: false, errors: [] },
    6: { valid: false, completed: false, errors: [] },
  },

  // Loading & Status
  loading: {
    global: false,
    prerequisites: false,
    credentials: false,
    discovery: false,
    deployment: false,
    validation: false,
  },
  error: null,
  success: null,

  // Phase 1: Prerequisites
  prerequisites: null,
  credentials: [],
  selectedCredential: null,
  cloudProvider: null,
  kubeContext: null,
  connectivity: {
    cloud: { tested: false, success: false, message: '' },
    kubernetes: { tested: false, success: false, message: '' },
  },

  // Phase 2: Cluster Configuration
  deploymentMode: 'new', // 'new' | 'existing'
  discoveredInfrastructure: null,
  networkConfig: {
    createNewVPC: true,
    vpcName: '',
    vpcCIDR: '10.0.0.0/16',
    existingVPCId: '',
    publicSubnets: ['10.0.1.0/24', '10.0.2.0/24'],
    privateSubnets: ['10.0.10.0/24', '10.0.11.0/24'],
    enableNATGateway: true,
    enablePrivateEndpoint: true,
    enablePublicEndpoint: false,
  },
  securityGroups: [],
  // Private cluster access configuration
  // Provider-specific: AWS SSM, Azure Bastion, GCP IAP, etc.
  privateAccessConfig: {
    method: '', // '' (auto-detect per provider) | 'ssm' | 'bastion' | 'vpn' | 'azure-bastion' | 'iap'
    ssmEnabled: false,
    // Port forwarding for DB access, K8s API, etc.
    ssmPortForwarding: {
      enabled: true,
      defaultPorts: [
        { name: 'PostgreSQL', localPort: 5433, remotePort: 5432 },
        { name: 'K8s API', localPort: 6443, remotePort: 443 },
        { name: 'Redis', localPort: 6379, remotePort: 6379 },
      ],
    },
    // Legacy bastion config
    bastionConfig: {
      enabled: false,
      instanceType: '',
      securityGroupId: '',
    },
    // Private endpoints (AWS VPC Endpoints, Azure Private Link, GCP Private Service Connect)
    vpcEndpoints: {
      enabled: true,
      endpoints: [],
    },
  },
  clusterConfig: {
    clusterName: '',
    kubernetesVersion: '1.34',
    region: '',
    nodeCount: 3,
    minNodeCount: 1,
    maxNodeCount: 5,
    nodeGroupName: 'default-ng',
    nodeInstanceType: '',
    enableAutoscaling: true,
    diskSizeGB: 100,
    useExistingCluster: false,
    existingClusterName: '',
  },
  
  // Azure-specific configuration (only used when cloudProvider is 'azure')
  azureConfig: {
    resourceGroupName: '',
    useExistingResourceGroup: false,
    existingResourceGroupId: '',
    location: '', // Azure region (e.g., 'eastus', 'westus2')
  },

  // Container Registry Configuration
  containerRegistry: {
    enabled: true,
    useExisting: false,
    name: '',
    existingRegistryUrl: '',
    region: '',
  },

  // Phase 3: Storage
  csiDrivers: {
    ebs: { installed: false, loading: false },
    efs: { installed: false, loading: false },
  },
  storageClasses: [],
  storageClassTemplates: {},
  pvcs: [],
  pvs: [],

  // Phase 4: Deployment
  localImages: [],
  containers: [],
  selectedImage: null,
  registries: [],
  selectedRegistry: null,
  deployments: [],
  services: [],
  pods: [],
  namespaces: ['default'],
  selectedNamespace: 'default',
  deployConfig: {
    imageName: '',
    imageTag: 'latest',
    deploymentName: '',
    namespace: 'default',
    replicas: 1,
    containerPort: 80,
    createService: true,
    serviceType: 'ClusterIP',
    servicePort: 80,
    internalLoadBalancer: true,
  },
  databaseConfig: {
    enabled: false,
    engine: 'postgres',
    version: '14.6',
    instanceClass: '',
    allocatedStorage: 20,
    multiAZ: false,
    dbName: '',
    dbUsername: 'admin',
    dbPassword: '',
  },
  sqlScripts: [],

  // Phase 5: Operations
  configMaps: [],
  secrets: [],
  metricsServerStatus: null,
  clusterAutoscalerStatus: null,
  nodeMetrics: [],
  podMetrics: [],
  portForwards: [],
  helmRepos: [],
  helmCharts: [],
  helmReleases: [],
  statefulSets: [],

  // Draft Management
  draftId: null,
  draftName: '',
  draftDescription: '',
  isDirty: false,
  lastSaved: null,

  // Approval Workflow
  submitForApproval: false,
  approvalStatus: null,

  // Execution Mode (Dry Run / Local Test)
  executionMode: 'production', // 'production' | 'dryRun' | 'localTest'
  localEnvironment: {
    checked: false,
    minikubeStatus: null,      // 'running' | 'stopped' | 'not-installed'
    kubectlContext: null,       // Current context name
    isMinikubeContext: false,
    dockerRunning: false,
    isReady: false,
  },

  // Access Mode (Phase 5 — Deploy)
  accessMode: 'internal',       // 'internal' | 'external'
  externalDomain: '',
  sslMode: 'managed',            // 'managed' (provider cert service) | 'upload'
  sslCertArn: '',                  // AWS ACM ARN, Azure Key Vault ID, or GCP cert name
  sslCertFile: null,
  sslKeyFile: null,
};

// ==========================================
// ACTION TYPES
// ==========================================

const ActionTypes = {
  // Mode & Navigation
  SET_MODE: 'SET_MODE',
  SET_PHASE: 'SET_PHASE',
  SET_STEP: 'SET_STEP',
  VALIDATE_PHASE: 'VALIDATE_PHASE',
  COMPLETE_PHASE: 'COMPLETE_PHASE',

  // Loading & Status
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  SET_SUCCESS: 'SET_SUCCESS',
  CLEAR_MESSAGES: 'CLEAR_MESSAGES',

  // Phase 1: Prerequisites
  SET_PREREQUISITES: 'SET_PREREQUISITES',
  SET_CREDENTIALS: 'SET_CREDENTIALS',
  SELECT_CREDENTIAL: 'SELECT_CREDENTIAL',
  SET_KUBE_CONTEXT: 'SET_KUBE_CONTEXT',
  SET_CONNECTIVITY: 'SET_CONNECTIVITY',

  // Phase 2: Cluster Configuration
  SET_DEPLOYMENT_MODE: 'SET_DEPLOYMENT_MODE',
  SET_DISCOVERED_INFRASTRUCTURE: 'SET_DISCOVERED_INFRASTRUCTURE',
  UPDATE_NETWORK_CONFIG: 'UPDATE_NETWORK_CONFIG',
  SET_SECURITY_GROUPS: 'SET_SECURITY_GROUPS',
  UPDATE_BASTION_CONFIG: 'UPDATE_BASTION_CONFIG',
  UPDATE_PRIVATE_ACCESS_CONFIG: 'UPDATE_PRIVATE_ACCESS_CONFIG',
  UPDATE_CLUSTER_CONFIG: 'UPDATE_CLUSTER_CONFIG',
  UPDATE_CONTAINER_REGISTRY: 'UPDATE_CONTAINER_REGISTRY',
  UPDATE_AZURE_CONFIG: 'UPDATE_AZURE_CONFIG',

  // Phase 3: Storage
  SET_CSI_DRIVERS: 'SET_CSI_DRIVERS',
  SET_STORAGE_CLASSES: 'SET_STORAGE_CLASSES',
  SET_STORAGE_CLASS_TEMPLATES: 'SET_STORAGE_CLASS_TEMPLATES',
  UPDATE_STORAGE_CONFIG: 'UPDATE_STORAGE_CONFIG',
  SET_PVCS: 'SET_PVCS',
  SET_PVS: 'SET_PVS',

  // Phase 4: Deployment
  SET_LOCAL_IMAGES: 'SET_LOCAL_IMAGES',
  SET_CONTAINERS: 'SET_CONTAINERS',
  SELECT_IMAGE: 'SELECT_IMAGE',
  SET_REGISTRIES: 'SET_REGISTRIES',
  SELECT_REGISTRY: 'SELECT_REGISTRY',
  SET_DEPLOYMENTS: 'SET_DEPLOYMENTS',
  SET_SERVICES: 'SET_SERVICES',
  SET_PODS: 'SET_PODS',
  SET_NAMESPACES: 'SET_NAMESPACES',
  SELECT_NAMESPACE: 'SELECT_NAMESPACE',
  UPDATE_DEPLOY_CONFIG: 'UPDATE_DEPLOY_CONFIG',
  UPDATE_DATABASE_CONFIG: 'UPDATE_DATABASE_CONFIG',
  SET_SQL_SCRIPTS: 'SET_SQL_SCRIPTS',

  // Phase 5: Operations
  SET_CONFIG_MAPS: 'SET_CONFIG_MAPS',
  SET_SECRETS: 'SET_SECRETS',
  SET_METRICS_SERVER_STATUS: 'SET_METRICS_SERVER_STATUS',
  SET_CLUSTER_AUTOSCALER_STATUS: 'SET_CLUSTER_AUTOSCALER_STATUS',
  SET_NODE_METRICS: 'SET_NODE_METRICS',
  SET_POD_METRICS: 'SET_POD_METRICS',
  SET_PORT_FORWARDS: 'SET_PORT_FORWARDS',
  SET_HELM_REPOS: 'SET_HELM_REPOS',
  SET_HELM_CHARTS: 'SET_HELM_CHARTS',
  SET_HELM_RELEASES: 'SET_HELM_RELEASES',
  SET_STATEFULSETS: 'SET_STATEFULSETS',

  // Access Mode (Phase 5 — Deploy)
  SET_ACCESS_MODE: 'SET_ACCESS_MODE',
  SET_EXTERNAL_DOMAIN: 'SET_EXTERNAL_DOMAIN',
  SET_SSL_MODE: 'SET_SSL_MODE',
  SET_SSL_CERT_ARN: 'SET_SSL_CERT_ARN',
  SET_SSL_CERT_FILE: 'SET_SSL_CERT_FILE',
  SET_SSL_KEY_FILE: 'SET_SSL_KEY_FILE',

  // Draft Management
  LOAD_DRAFT: 'LOAD_DRAFT',
  SET_DRAFT_INFO: 'SET_DRAFT_INFO',
  MARK_DIRTY: 'MARK_DIRTY',
  MARK_SAVED: 'MARK_SAVED',

  // Execution Mode
  SET_EXECUTION_MODE: 'SET_EXECUTION_MODE',
  SET_LOCAL_ENVIRONMENT: 'SET_LOCAL_ENVIRONMENT',

  // Bulk Updates
  RESET_STATE: 'RESET_STATE',
  HYDRATE_STATE: 'HYDRATE_STATE',
};

// ==========================================
// REDUCER
// ==========================================

function wizardReducer(state, action) {
  switch (action.type) {
    // Mode & Navigation
    case ActionTypes.SET_MODE:
      return { ...state, mode: action.payload, isDirty: true };

    case ActionTypes.SET_PHASE:
      return { ...state, currentPhase: action.payload, currentStep: 0 };

    case ActionTypes.SET_STEP:
      return { ...state, currentStep: action.payload };

    case ActionTypes.VALIDATE_PHASE:
      return {
        ...state,
        phaseValidation: {
          ...state.phaseValidation,
          [action.payload.phase]: {
            ...state.phaseValidation[action.payload.phase],
            valid: action.payload.valid,
            errors: action.payload.errors || [],
          },
        },
      };

    case ActionTypes.COMPLETE_PHASE:
      return {
        ...state,
        phaseValidation: {
          ...state.phaseValidation,
          [action.payload]: {
            ...state.phaseValidation[action.payload],
            completed: true,
          },
        },
      };

    // Loading & Status
    case ActionTypes.SET_LOADING:
      return {
        ...state,
        loading: { ...state.loading, [action.payload.key]: action.payload.value },
      };

    case ActionTypes.SET_ERROR:
      return { ...state, error: action.payload };

    case ActionTypes.SET_SUCCESS:
      return { ...state, success: action.payload };

    case ActionTypes.CLEAR_MESSAGES:
      return { ...state, error: null, success: null };

    // Phase 1: Prerequisites
    case ActionTypes.SET_PREREQUISITES:
      return { ...state, prerequisites: action.payload };

    case ActionTypes.SET_CREDENTIALS:
      return { ...state, credentials: action.payload };

    case ActionTypes.SELECT_CREDENTIAL:
      return {
        ...state,
        selectedCredential: action.payload,
        cloudProvider: action.payload?.cloudProvider || null,
        isDirty: true,
      };

    case ActionTypes.SET_KUBE_CONTEXT:
      return { ...state, kubeContext: action.payload };

    case ActionTypes.SET_CONNECTIVITY:
      return {
        ...state,
        connectivity: { ...state.connectivity, [action.payload.type]: action.payload.result },
      };

    // Phase 2: Cluster Configuration
    case ActionTypes.SET_DEPLOYMENT_MODE:
      return { ...state, deploymentMode: action.payload, isDirty: true };

    case ActionTypes.SET_DISCOVERED_INFRASTRUCTURE:
      return { ...state, discoveredInfrastructure: action.payload };

    case ActionTypes.UPDATE_NETWORK_CONFIG:
      return {
        ...state,
        networkConfig: { ...state.networkConfig, ...action.payload },
        isDirty: true,
      };

    case ActionTypes.SET_SECURITY_GROUPS:
      return { ...state, securityGroups: action.payload };

    case ActionTypes.UPDATE_BASTION_CONFIG:
      // Legacy - updates bastionConfig within privateAccessConfig
      return {
        ...state,
        privateAccessConfig: {
          ...state.privateAccessConfig,
          bastionConfig: { ...state.privateAccessConfig?.bastionConfig, ...action.payload },
        },
        isDirty: true,
      };

    case ActionTypes.UPDATE_PRIVATE_ACCESS_CONFIG:
      return {
        ...state,
        privateAccessConfig: { ...state.privateAccessConfig, ...action.payload },
        isDirty: true,
      };

    case ActionTypes.UPDATE_CLUSTER_CONFIG:
      return {
        ...state,
        clusterConfig: { ...state.clusterConfig, ...action.payload },
        isDirty: true,
      };

    case ActionTypes.UPDATE_CONTAINER_REGISTRY:
      return {
        ...state,
        containerRegistry: { ...state.containerRegistry, ...action.payload },
        isDirty: true,
      };

    case ActionTypes.UPDATE_AZURE_CONFIG:
      return {
        ...state,
        azureConfig: { ...state.azureConfig, ...action.payload },
        isDirty: true,
      };

    // Phase 3: Storage
    case ActionTypes.SET_CSI_DRIVERS:
      return { ...state, csiDrivers: action.payload };

    case ActionTypes.SET_STORAGE_CLASSES:
      return { ...state, storageClasses: action.payload };

    case ActionTypes.SET_STORAGE_CLASS_TEMPLATES:
      return { ...state, storageClassTemplates: action.payload };

    case ActionTypes.UPDATE_STORAGE_CONFIG:
      return {
        ...state,
        storageConfig: { ...(state.storageConfig || {}), ...action.payload },
        isDirty: true,
      };

    case ActionTypes.SET_PVCS:
      return { ...state, pvcs: action.payload };

    case ActionTypes.SET_PVS:
      return { ...state, pvs: action.payload };

    // Phase 4: Deployment
    case ActionTypes.SET_LOCAL_IMAGES:
      return { ...state, localImages: action.payload };

    case ActionTypes.SET_CONTAINERS:
      return { ...state, containers: action.payload };

    case ActionTypes.SELECT_IMAGE:
      return { ...state, selectedImage: action.payload };

    case ActionTypes.SET_REGISTRIES:
      return { ...state, registries: action.payload };

    case ActionTypes.SELECT_REGISTRY:
      return { ...state, selectedRegistry: action.payload };

    case ActionTypes.SET_DEPLOYMENTS:
      return { ...state, deployments: action.payload };

    case ActionTypes.SET_SERVICES:
      return { ...state, services: action.payload };

    case ActionTypes.SET_PODS:
      return { ...state, pods: action.payload };

    case ActionTypes.SET_NAMESPACES:
      return { ...state, namespaces: action.payload };

    case ActionTypes.SELECT_NAMESPACE:
      return { ...state, selectedNamespace: action.payload };

    case ActionTypes.UPDATE_DEPLOY_CONFIG:
      return {
        ...state,
        deployConfig: { ...state.deployConfig, ...action.payload },
        isDirty: true,
      };

    case ActionTypes.UPDATE_DATABASE_CONFIG:
      return {
        ...state,
        databaseConfig: { ...state.databaseConfig, ...action.payload },
        isDirty: true,
      };

    case ActionTypes.SET_SQL_SCRIPTS:
      return { ...state, sqlScripts: action.payload, isDirty: true };

    // Phase 5: Operations
    case ActionTypes.SET_CONFIG_MAPS:
      return { ...state, configMaps: action.payload };

    case ActionTypes.SET_SECRETS:
      return { ...state, secrets: action.payload };

    case ActionTypes.SET_METRICS_SERVER_STATUS:
      return { ...state, metricsServerStatus: action.payload };

    case ActionTypes.SET_CLUSTER_AUTOSCALER_STATUS:
      return { ...state, clusterAutoscalerStatus: action.payload };

    case ActionTypes.SET_NODE_METRICS:
      return { ...state, nodeMetrics: action.payload };

    case ActionTypes.SET_POD_METRICS:
      return { ...state, podMetrics: action.payload };

    case ActionTypes.SET_PORT_FORWARDS:
      return { ...state, portForwards: action.payload };

    case ActionTypes.SET_HELM_REPOS:
      return { ...state, helmRepos: action.payload };

    case ActionTypes.SET_HELM_CHARTS:
      return { ...state, helmCharts: action.payload };

    case ActionTypes.SET_HELM_RELEASES:
      return { ...state, helmReleases: action.payload };

    case ActionTypes.SET_STATEFULSETS:
      return { ...state, statefulSets: action.payload };

    // Execution Mode
    case ActionTypes.SET_EXECUTION_MODE:
      return { ...state, executionMode: action.payload, isDirty: true };

    case ActionTypes.SET_LOCAL_ENVIRONMENT:
      return { ...state, localEnvironment: { ...state.localEnvironment, ...action.payload } };

    // Draft Management
    case ActionTypes.LOAD_DRAFT:
      return {
        ...state,
        ...action.payload.configuration,
        draftId: action.payload.id,
        draftName: action.payload.name,
        draftDescription: action.payload.description,
        isDirty: false,
        lastSaved: action.payload.updatedAt,
      };

    case ActionTypes.SET_DRAFT_INFO:
      return {
        ...state,
        draftName: action.payload.name ?? state.draftName,
        draftDescription: action.payload.description ?? state.draftDescription,
      };

    case ActionTypes.MARK_DIRTY:
      return { ...state, isDirty: true };

    case ActionTypes.MARK_SAVED:
      return {
        ...state,
        isDirty: false,
        lastSaved: new Date().toISOString(),
        draftId: action.payload?.id ?? state.draftId,
      };

    // Bulk Updates
    case ActionTypes.RESET_STATE:
      return { ...initialState };

    // Access Mode
    case ActionTypes.SET_ACCESS_MODE:
      return { ...state, accessMode: action.payload, isDirty: true };
    case ActionTypes.SET_EXTERNAL_DOMAIN:
      return { ...state, externalDomain: action.payload, isDirty: true };
    case ActionTypes.SET_SSL_MODE:
      return { ...state, sslMode: action.payload, isDirty: true };
    case ActionTypes.SET_SSL_CERT_ARN:
      return { ...state, sslCertArn: action.payload, isDirty: true };
    case ActionTypes.SET_SSL_CERT_FILE:
      return { ...state, sslCertFile: action.payload, isDirty: true };
    case ActionTypes.SET_SSL_KEY_FILE:
      return { ...state, sslKeyFile: action.payload, isDirty: true };

    case ActionTypes.HYDRATE_STATE:
      return { ...state, ...action.payload };

    default:
      return state;
  }
}

// ==========================================
// CONTEXT
// ==========================================

const WizardContext = createContext(null);

export function WizardProvider({ children }) {
  const [state, dispatch] = useReducer(wizardReducer, initialState);

  // ==========================================
  // NAVIGATION ACTIONS
  // ==========================================

  const setMode = useCallback((mode) => {
    dispatch({ type: ActionTypes.SET_MODE, payload: mode });
    localStorage.setItem('wizardMode', mode);
  }, []);

  const setPhase = useCallback((phase) => {
    dispatch({ type: ActionTypes.SET_PHASE, payload: phase });
  }, []);

  const setStep = useCallback((step) => {
    dispatch({ type: ActionTypes.SET_STEP, payload: step });
  }, []);

  const nextPhase = useCallback(() => {
    if (state.currentPhase < 6) {
      dispatch({ type: ActionTypes.COMPLETE_PHASE, payload: state.currentPhase });
      dispatch({ type: ActionTypes.SET_PHASE, payload: state.currentPhase + 1 });
    }
  }, [state.currentPhase]);

  const prevPhase = useCallback(() => {
    if (state.currentPhase > 1) {
      dispatch({ type: ActionTypes.SET_PHASE, payload: state.currentPhase - 1 });
    }
  }, [state.currentPhase]);

  const nextStep = useCallback(() => {
    dispatch({ type: ActionTypes.SET_STEP, payload: state.currentStep + 1 });
  }, [state.currentStep]);

  const prevStep = useCallback(() => {
    if (state.currentStep > 0) {
      dispatch({ type: ActionTypes.SET_STEP, payload: state.currentStep - 1 });
    }
  }, [state.currentStep]);

  // Sub-step navigation (alias for setStep with clearer semantic meaning for within-phase navigation)
  const setSubStep = useCallback((subStep) => {
    dispatch({ type: ActionTypes.SET_STEP, payload: subStep });
  }, []);

  // ==========================================
  // DATA FETCHING ACTIONS
  // ==========================================

  const fetchPrerequisites = useCallback(async () => {
    dispatch({ type: ActionTypes.SET_LOADING, payload: { key: 'prerequisites', value: true } });
    try {
      const response = await api.get('/container-deployments/prerequisites');
      dispatch({ type: ActionTypes.SET_PREREQUISITES, payload: response.data.data || response.data });
    } catch (error) {
      dispatch({ type: ActionTypes.SET_ERROR, payload: 'Failed to check prerequisites' });
    } finally {
      dispatch({ type: ActionTypes.SET_LOADING, payload: { key: 'prerequisites', value: false } });
    }
  }, []);

  const fetchCredentials = useCallback(async () => {
    dispatch({ type: ActionTypes.SET_LOADING, payload: { key: 'credentials', value: true } });
    try {
      const response = await api.get('/credentials');
      const creds = response.data.data?.credentials || response.data.credentials || [];
      dispatch({ type: ActionTypes.SET_CREDENTIALS, payload: creds });
    } catch (error) {
      dispatch({ type: ActionTypes.SET_ERROR, payload: 'Failed to fetch credentials' });
    } finally {
      dispatch({ type: ActionTypes.SET_LOADING, payload: { key: 'credentials', value: false } });
    }
  }, []);

  const discoverInfrastructure = useCallback(async () => {
    if (!state.selectedCredential) return;
    dispatch({ type: ActionTypes.SET_LOADING, payload: { key: 'discovery', value: true } });
    try {
      const response = await api.get(`/infrastructure/discover/${state.selectedCredential.id}`);
      dispatch({
        type: ActionTypes.SET_DISCOVERED_INFRASTRUCTURE,
        payload: response.data.data || response.data,
      });
    } catch (error) {
      dispatch({
        type: ActionTypes.SET_DISCOVERED_INFRASTRUCTURE,
        payload: { vpcs: [], subnets: [], securityGroups: [], clusters: [] },
      });
    } finally {
      dispatch({ type: ActionTypes.SET_LOADING, payload: { key: 'discovery', value: false } });
    }
  }, [state.selectedCredential]);

  const fetchStorageClasses = useCallback(async () => {
    try {
      const response = await api.get('/container-deployments/storage/classes');
      dispatch({ type: ActionTypes.SET_STORAGE_CLASSES, payload: response.data.data?.storageClasses || [] });
    } catch (error) {
      console.error('Failed to fetch storage classes:', error);
    }
  }, []);

  const fetchStorageClassTemplates = useCallback(async () => {
    try {
      const response = await api.get('/container-deployments/storage/classes/templates');
      dispatch({ type: ActionTypes.SET_STORAGE_CLASS_TEMPLATES, payload: response.data.data?.templates || {} });
    } catch (error) {
      console.error('Failed to fetch storage class templates:', error);
    }
  }, []);

  const fetchPVCs = useCallback(async () => {
    try {
      const response = await api.get('/container-deployments/storage/pvcs');
      dispatch({ type: ActionTypes.SET_PVCS, payload: response.data.data?.pvcs || [] });
    } catch (error) {
      console.error('Failed to fetch PVCs:', error);
    }
  }, []);

  const fetchLocalImages = useCallback(async () => {
    try {
      const response = await api.get('/container-deployments/docker/images');
      dispatch({ type: ActionTypes.SET_LOCAL_IMAGES, payload: response.data.data?.images || [] });
    } catch (error) {
      console.error('Failed to fetch local images:', error);
    }
  }, []);

  const fetchNamespaces = useCallback(async () => {
    try {
      const response = await api.get('/container-deployments/k8s/namespaces');
      dispatch({ type: ActionTypes.SET_NAMESPACES, payload: response.data.data?.namespaces || ['default'] });
    } catch (error) {
      console.error('Failed to fetch namespaces:', error);
    }
  }, []);

  const fetchDeployments = useCallback(async (namespace = 'default') => {
    try {
      const response = await api.get(`/container-deployments/k8s/deployments/${namespace}`);
      dispatch({ type: ActionTypes.SET_DEPLOYMENTS, payload: response.data.data?.deployments || [] });
    } catch (error) {
      console.error('Failed to fetch deployments:', error);
    }
  }, []);

  const fetchServices = useCallback(async (namespace = 'default') => {
    try {
      const response = await api.get(`/container-deployments/k8s/services/${namespace}`);
      dispatch({ type: ActionTypes.SET_SERVICES, payload: response.data.data?.services || [] });
    } catch (error) {
      console.error('Failed to fetch services:', error);
    }
  }, []);

  const fetchPods = useCallback(async (namespace = 'default') => {
    try {
      const response = await api.get(`/container-deployments/k8s/pods/${namespace}`);
      dispatch({ type: ActionTypes.SET_PODS, payload: response.data.data?.pods || [] });
    } catch (error) {
      console.error('Failed to fetch pods:', error);
    }
  }, []);

  // ==========================================
  // DRAFT MANAGEMENT
  // ==========================================

  const saveDraft = useCallback(async (name, description) => {
    dispatch({ type: ActionTypes.SET_LOADING, payload: { key: 'global', value: true } });
    try {
      const configuration = {
        mode: state.mode,
        currentPhase: state.currentPhase,
        deploymentMode: state.deploymentMode,
        networkConfig: state.networkConfig,
        privateAccessConfig: state.privateAccessConfig,
        clusterConfig: state.clusterConfig,
        containerRegistry: state.containerRegistry,
        storageConfig: state.storageConfig,
        deployConfig: state.deployConfig,
        databaseConfig: state.databaseConfig,
        sqlScripts: state.sqlScripts,
      };

      let response;
      if (state.draftId) {
        response = await deploymentDraftsApi.updateDraft(state.draftId, {
          name: name || state.draftName,
          description: description || state.draftDescription,
          configuration,
        });
      } else {
        response = await deploymentDraftsApi.createDraft({
          name,
          description,
          credentialId: state.selectedCredential?.id,
          cloudProvider: state.selectedCredential?.cloudProvider || 'aws',
          clusterName: state.clusterConfig.clusterName || state.existingClusterName || 'unnamed-cluster',
          configuration,
        });
      }

      dispatch({
        type: ActionTypes.MARK_SAVED,
        payload: { id: response.data.data?.id || response.data.id },
      });
      dispatch({ type: ActionTypes.SET_SUCCESS, payload: 'Draft saved successfully' });
    } catch (error) {
      console.error('Failed to save draft:', error.response?.data || error.message);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to save draft';
      dispatch({ type: ActionTypes.SET_ERROR, payload: errorMessage });
    } finally {
      dispatch({ type: ActionTypes.SET_LOADING, payload: { key: 'global', value: false } });
    }
  }, [state]);

  const loadDraft = useCallback(async (draftId) => {
    dispatch({ type: ActionTypes.SET_LOADING, payload: { key: 'global', value: true } });
    try {
      const response = await deploymentDraftsApi.get(draftId);
      const draft = response.data.data || response.data;
      dispatch({ type: ActionTypes.LOAD_DRAFT, payload: draft });
      dispatch({ type: ActionTypes.SET_SUCCESS, payload: 'Draft loaded successfully' });
    } catch (error) {
      console.error('Failed to load draft:', error);
      dispatch({ type: ActionTypes.SET_ERROR, payload: 'Failed to load draft' });
    } finally {
      dispatch({ type: ActionTypes.SET_LOADING, payload: { key: 'global', value: false } });
    }
  }, []);

  /**
   * Submit the current draft for review/approval
   * First saves the draft if needed, then submits for approval
   */
  const submitForReview = useCallback(async (name, description) => {
    dispatch({ type: ActionTypes.SET_LOADING, payload: { key: 'global', value: true } });
    try {
      let draftId = state.draftId;
      
      // If no draft exists, save it first
      if (!draftId) {
        const configuration = {
          mode: state.mode,
          currentPhase: state.currentPhase,
          deploymentMode: state.deploymentMode,
          networkConfig: state.networkConfig,
          privateAccessConfig: state.privateAccessConfig,
          clusterConfig: state.clusterConfig,
          containerRegistry: state.containerRegistry,
          storageConfig: state.storageConfig,
          deployConfig: state.deployConfig,
          databaseConfig: state.databaseConfig,
          sqlScripts: state.sqlScripts,
        };

        const response = await deploymentDraftsApi.create({
          name: name || 'Deployment Draft',
          description: description || 'Submitted for review',
          credentialId: state.selectedCredential?.id,
          cloudProvider: state.selectedCredential?.cloudProvider || 'aws',
          clusterName: state.clusterConfig.clusterName || state.existingClusterName || 'unnamed-cluster',
          configuration,
        });

        draftId = response.data.data?.id || response.data.id;
        dispatch({
          type: ActionTypes.MARK_SAVED,
          payload: { id: draftId },
        });
      } else {
        // Update existing draft first
        await saveDraft(name, description);
      }

      // Now submit for approval
      await deploymentDraftsApi.submitApproval(draftId);
      dispatch({ type: ActionTypes.SET_SUCCESS, payload: 'Deployment submitted for review successfully' });
      return draftId;
    } catch (error) {
      console.error('Failed to submit for review:', error.response?.data || error.message);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to submit for review';
      dispatch({ type: ActionTypes.SET_ERROR, payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: ActionTypes.SET_LOADING, payload: { key: 'global', value: false } });
    }
  }, [state, saveDraft]);

  // ==========================================
  // VALIDATION
  // ==========================================

  const validatePhase = useCallback((phase) => {
    const errors = [];
    let valid = true;

    switch (phase) {
      case 1:
        if (!state.prerequisites?.summary?.ready) {
          errors.push('Some prerequisites are missing');
          valid = false;
        }
        if (!state.selectedCredential) {
          errors.push('No cloud credential selected');
          valid = false;
        }
        break;

      case 2:
        if (!state.clusterConfig.clusterName) {
          errors.push('Cluster name is required');
          valid = false;
        }
        if (!state.clusterConfig.region) {
          errors.push('Region is required');
          valid = false;
        }
        break;

      case 3:
        // Database is optional, always valid
        break;

      case 4:
        // Storage is optional, always valid
        break;

      case 5:
        // Deployment phase - check if there's something to deploy
        break;

      case 6:
        // Operations phase - always accessible
        break;

      default:
        break;
    }

    dispatch({
      type: ActionTypes.VALIDATE_PHASE,
      payload: { phase, valid, errors },
    });

    return valid;
  }, [state]);

  const canProceedToNextPhase = useCallback(() => {
    // Phase 6 is the last phase
    if (state.currentPhase >= 6) return false;

    const { clusterConfig, selectedCredential, currentPhase } = state;

    // Check if current phase has minimum requirements
    switch (currentPhase) {
      case 1:
        // Phase 1: Need credentials selected (prerequisites check is optional)
        return !!selectedCredential;
      case 2:
        // Phase 2: Need cluster name (new or existing) and region
        const hasClusterName = clusterConfig.useExistingCluster 
          ? !!clusterConfig.existingClusterName 
          : !!clusterConfig.clusterName;
        return !!(hasClusterName && clusterConfig.region);
      case 3:
        // Phase 3: Database is optional, can always proceed
        return true;
      case 4:
        // Phase 4: Storage is optional, can always proceed
        return true;
      case 5:
        // Phase 5: Deployment config - can always proceed to operations
        return true;
      default:
        return true;
    }
  }, [state]);

  // ==========================================
  // SIMPLE SETTERS
  // ==========================================

  const selectCredential = useCallback((credential) => {
    dispatch({ type: ActionTypes.SELECT_CREDENTIAL, payload: credential });
  }, []);

  const setDeploymentMode = useCallback((mode) => {
    dispatch({ type: ActionTypes.SET_DEPLOYMENT_MODE, payload: mode });
  }, []);

  const updateNetworkConfig = useCallback((updates) => {
    dispatch({ type: ActionTypes.UPDATE_NETWORK_CONFIG, payload: updates });
  }, []);

  const updateBastionConfig = useCallback((updates) => {
    dispatch({ type: ActionTypes.UPDATE_BASTION_CONFIG, payload: updates });
  }, []);

  const updatePrivateAccessConfig = useCallback((updates) => {
    dispatch({ type: ActionTypes.UPDATE_PRIVATE_ACCESS_CONFIG, payload: updates });
  }, []);

  const updateClusterConfig = useCallback((updates) => {
    dispatch({ type: ActionTypes.UPDATE_CLUSTER_CONFIG, payload: updates });
  }, []);

  const updateContainerRegistry = useCallback((updates) => {
    dispatch({ type: ActionTypes.UPDATE_CONTAINER_REGISTRY, payload: updates });
  }, []);

  const updateAzureConfig = useCallback((updates) => {
    dispatch({ type: ActionTypes.UPDATE_AZURE_CONFIG, payload: updates });
  }, []);

  const updateStorageConfig = useCallback((updates) => {
    dispatch({ type: ActionTypes.UPDATE_STORAGE_CONFIG, payload: updates });
  }, []);

  const updateDeployConfig = useCallback((updates) => {
    dispatch({ type: ActionTypes.UPDATE_DEPLOY_CONFIG, payload: updates });
  }, []);

  const updateDatabaseConfig = useCallback((updates) => {
    dispatch({ type: ActionTypes.UPDATE_DATABASE_CONFIG, payload: updates });
  }, []);

  const selectImage = useCallback((image) => {
    dispatch({ type: ActionTypes.SELECT_IMAGE, payload: image });
  }, []);

  const selectNamespace = useCallback((namespace) => {
    dispatch({ type: ActionTypes.SELECT_NAMESPACE, payload: namespace });
  }, []);

  const setError = useCallback((error) => {
    dispatch({ type: ActionTypes.SET_ERROR, payload: error });
  }, []);

  const setSuccess = useCallback((success) => {
    dispatch({ type: ActionTypes.SET_SUCCESS, payload: success });
  }, []);

  const setSecurityGroups = useCallback((securityGroups) => {
    dispatch({ type: ActionTypes.SET_SECURITY_GROUPS, payload: securityGroups });
  }, []);

  const clearMessages = useCallback(() => {
    dispatch({ type: ActionTypes.CLEAR_MESSAGES });
  }, []);

  const resetState = useCallback(() => {
    dispatch({ type: ActionTypes.RESET_STATE });
  }, []);

  // Execution Mode setters
  const setExecutionMode = useCallback((mode) => {
    dispatch({ type: ActionTypes.SET_EXECUTION_MODE, payload: mode });
  }, []);

  const setLocalEnvironment = useCallback((envData) => {
    dispatch({ type: ActionTypes.SET_LOCAL_ENVIRONMENT, payload: envData });
  }, []);

  // Check local environment status (Minikube, kubectl, Docker)
  const checkLocalEnvironment = useCallback(async () => {
    try {
      const response = await api.get('/api/local-deployments/status');
      const envData = {
        checked: true,
        minikubeStatus: response.data.minikube?.status || 'not-installed',
        kubectlContext: response.data.kubectl?.context || null,
        isMinikubeContext: response.data.kubectl?.isMinikube || false,
        dockerRunning: response.data.docker?.running || false,
        isReady: response.data.isReady || false,
      };
      dispatch({ type: ActionTypes.SET_LOCAL_ENVIRONMENT, payload: envData });
      return envData;
    } catch (error) {
      // API not available, set default values
      const envData = {
        checked: true,
        minikubeStatus: 'unknown',
        kubectlContext: null,
        isMinikubeContext: false,
        dockerRunning: false,
        isReady: false,
        error: error.message,
      };
      dispatch({ type: ActionTypes.SET_LOCAL_ENVIRONMENT, payload: envData });
      return envData;
    }
  }, []);

  // ==========================================
  // INITIALIZE MODE FROM STORAGE
  // ==========================================

  useEffect(() => {
    const savedMode = localStorage.getItem('wizardMode');
    if (savedMode && (savedMode === 'guided' || savedMode === 'expert')) {
      dispatch({ type: ActionTypes.SET_MODE, payload: savedMode });
    }
  }, []);

  // ==========================================
  // CONTEXT VALUE
  // ==========================================

  const value = {
    state,
    dispatch,

    // Navigation
    setMode,
    setPhase,
    setStep,
    setSubStep,
    nextPhase,
    prevPhase,
    nextStep,
    prevStep,

    // Data Fetching
    fetchPrerequisites,
    fetchCredentials,
    discoverInfrastructure,
    fetchStorageClasses,
    fetchStorageClassTemplates,
    fetchPVCs,
    fetchLocalImages,
    fetchNamespaces,
    fetchDeployments,
    fetchServices,
    fetchPods,

    // Draft Management
    saveDraft,
    loadDraft,
    submitForReview,

    // Validation
    validatePhase,
    canProceedToNextPhase,

    // Setters
    selectCredential,
    setDeploymentMode,
    updateNetworkConfig,
    updateBastionConfig,
    updatePrivateAccessConfig,
    updateClusterConfig,
    updateContainerRegistry,
    updateAzureConfig,
    updateStorageConfig,
    updateDeployConfig,
    updateDatabaseConfig,
    selectImage,
    selectNamespace,
    setError,
    setSuccess,
    setSecurityGroups,
    clearMessages,
    resetState,
    setExecutionMode,
    setLocalEnvironment,
    checkLocalEnvironment,
  };

  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>;
}

export function useWizard() {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error('useWizard must be used within a WizardProvider');
  }
  return context;
}

export { ActionTypes };
export default WizardContext;
