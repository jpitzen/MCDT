import axios from 'axios';

// Use relative path since frontend and backend are served from same origin
const API_URL = process.env.REACT_APP_API_URL || '/api';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor for authentication
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor with token refresh support
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      // Don't retry refresh or login requests
      if (
        originalRequest.url?.includes('/auth/refresh') ||
        originalRequest.url?.includes('/auth/login') ||
        originalRequest.url?.includes('/auth/ad-login')
      ) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        localStorage.removeItem('authToken');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await apiClient.post('/auth/refresh', { refreshToken });
        const data = res.data?.data || res.data;
        if (data.token) {
          localStorage.setItem('authToken', data.token);
          if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
          apiClient.defaults.headers.common.Authorization = `Bearer ${data.token}`;
          processQueue(null, data.token);
          originalRequest.headers.Authorization = `Bearer ${data.token}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

const api = {
  // Auth endpoints
  auth: {
    login: (email, password) => apiClient.post('/auth/login', { email, password }),
    adLogin: (data) => apiClient.post('/auth/ad-login', data),
    refresh: (data) => apiClient.post('/auth/refresh', data),
    ldapStatus: () => apiClient.get('/auth/ldap-status'),
    register: (userData) => apiClient.post('/auth/register', userData),
    logout: () => apiClient.post('/auth/logout'),
    getProfile: () => apiClient.get('/auth/profile'),
    updateProfile: (data) => apiClient.put('/auth/profile', data),
    changePassword: (data) => apiClient.post('/auth/change-password', data),
  },

  // AD Configuration endpoints (admin only)
  adConfig: {
    list: () => apiClient.get('/ad-config'),
    get: (id) => apiClient.get(`/ad-config/${id}`),
    create: (data) => apiClient.post('/ad-config', data),
    update: (id, data) => apiClient.put(`/ad-config/${id}`, data),
    delete: (id) => apiClient.delete(`/ad-config/${id}`),
    activate: (id) => apiClient.post(`/ad-config/${id}/activate`),
    deactivate: (id) => apiClient.post(`/ad-config/${id}/deactivate`),
    testConnection: (id) => apiClient.post(`/ad-config/${id}/test-connection`),
    testAdHocConnection: (data) => apiClient.post('/ad-config/test-connection', data),
    updateServiceAccount: (id, data) => apiClient.put(`/ad-config/${id}/service-account`, data),
    verifyServiceAccount: (id) => apiClient.post(`/ad-config/${id}/verify-service-account`),
    searchGroups: (id, params) => apiClient.get(`/ad-config/${id}/groups`, { params }),
    getGroupMembers: (id, dn) => apiClient.get(`/ad-config/${id}/groups/${encodeURIComponent(dn)}/members`),
    syncUsers: (id) => apiClient.post(`/ad-config/${id}/sync`),
    getSyncStatus: (id) => apiClient.get(`/ad-config/${id}/sync/status`),
    // Role mappings
    listMappings: (configId) => apiClient.get(`/ad-config/${configId}/role-mappings`),
    createMapping: (configId, data) => apiClient.post(`/ad-config/${configId}/role-mappings`, data),
    updateMapping: (configId, id, data) => apiClient.put(`/ad-config/${configId}/role-mappings/${id}`, data),
    deleteMapping: (configId, id) => apiClient.delete(`/ad-config/${configId}/role-mappings/${id}`),
    testRoleResolution: (configId, data) => apiClient.post(`/ad-config/${configId}/role-mappings/test`, data),
  },

  // Credentials endpoints
  credentials: {
    list: (params) => apiClient.get('/credentials', { params }),
    get: (id) => apiClient.get(`/credentials/${id}`),
    create: (data) => apiClient.post('/credentials', data),
    update: (id, data) => apiClient.put(`/credentials/${id}`, data),
    delete: (id) => apiClient.delete(`/credentials/${id}`),
    validate: (id) => apiClient.post(`/credentials/${id}/validate`),
    rotate: (id) => apiClient.put(`/credentials/${id}/rotate`)
  },

  // Deployments endpoints
  deployments: {
    list: (params) => apiClient.get('/deployments', { params }),
    get: (id) => apiClient.get(`/deployments/${id}`),
    create: (data) => apiClient.post('/deployments', data),
    start: (id) => apiClient.post(`/deployments/${id}/start`),
    getLogs: (id, params) => apiClient.get(`/deployments/${id}/logs`, { params }),
    pause: (id) => apiClient.post(`/deployments/${id}/pause`),
    resume: (id) => apiClient.post(`/deployments/${id}/resume`),
    rollback: (id, data) => apiClient.post(`/deployments/${id}/rollback`, data),
    cancel: (id) => apiClient.post(`/deployments/${id}/cancel`),
    delete: (id) => apiClient.delete(`/deployments/${id}`),
    getProvidersInfo: () => apiClient.get('/deployments/providers/info'),
    // Terraform preview (dry-run before apply)
    preview: (id) => apiClient.post(`/deployments/${id}/preview`),
    // Destruction workflow
    requestDestroy: (id) => apiClient.post(`/deployments/${id}/request-destroy`),
    confirmDestroy: (id, confirmationName) => apiClient.post(`/deployments/${id}/confirm-destroy`, { confirmationName }),
    executeDestroy: (id) => apiClient.post(`/deployments/${id}/execute-destroy`),
    cancelDestroy: (id) => apiClient.post(`/deployments/${id}/cancel-destroy`),
    deletePermanent: (id) => apiClient.delete(`/deployments/${id}/permanent`)
  },

  // Clusters endpoints
  clusters: {
    list: (params) => apiClient.get('/clusters', { params }),
    get: (id) => apiClient.get(`/clusters/${id}`),
    getStatus: (id) => apiClient.get(`/clusters/${id}/status`),
    getNodes: (id) => apiClient.get(`/clusters/${id}/nodes`),
    scale: (id, data) => apiClient.post(`/clusters/${id}/scale`, data),
    upgrade: (id, data) => apiClient.post(`/clusters/${id}/upgrade`, data),
    delete: (id) => apiClient.delete(`/clusters/${id}`)
  },

  // Deployment Drafts endpoints
  deploymentDrafts: {
    list: (params) => apiClient.get('/deployment-drafts', { params }),
    get: (id) => apiClient.get(`/deployment-drafts/${id}`),
    create: (data) => apiClient.post('/deployment-drafts', data),
    update: (id, data) => apiClient.put(`/deployment-drafts/${id}`, data),
    delete: (id) => apiClient.delete(`/deployment-drafts/${id}`),
    test: (id) => apiClient.post(`/deployment-drafts/${id}/test`),
    submitApproval: (id) => apiClient.post(`/deployment-drafts/${id}/submit-approval`),
    approve: (id, data) => apiClient.post(`/deployment-drafts/${id}/approve`, data),
    reject: (id, data) => apiClient.post(`/deployment-drafts/${id}/reject`, data),
    deploy: (id) => apiClient.post(`/deployment-drafts/${id}/deploy`),
    reset: (id) => apiClient.post(`/deployment-drafts/${id}/reset`),
    savePreview: (id, previewResults) => apiClient.post(`/deployment-drafts/${id}/save-preview`, { previewResults })
  },

  // Status endpoints
  status: {
    getOverall: () => apiClient.get('/status'),
    getServices: () => apiClient.get('/status/services')
  },

  // Analytics endpoints
  analytics: {
    getMetrics: (params) => apiClient.get('/analytics/metrics', { params }),
    getTrends: (params) => apiClient.get('/analytics/trends', { params }),
    getCostAnalysis: (params) => apiClient.get('/analytics/cost', { params }),
    getUsageStats: (params) => apiClient.get('/analytics/usage', { params })
  },

  // Cost endpoints
  cost: {
    getEstimate: (data) => apiClient.post('/cost/estimate', data),
    getOptimizations: (id) => apiClient.get(`/cost/optimizations/${id}`),
    getReport: (params) => apiClient.get('/cost/report', { params }),
    compareProviders: (data) => apiClient.post('/cost/compare', data)
  },

  // Alerts endpoints
  alerts: {
    listChannels: (params) => apiClient.get('/alerts/channels', { params }),
    getChannel: (id) => apiClient.get(`/alerts/channels/${id}`),
    createChannel: (data) => apiClient.post('/alerts/channels', data),
    updateChannel: (id, data) => apiClient.put(`/alerts/channels/${id}`, data),
    deleteChannel: (id) => apiClient.delete(`/alerts/channels/${id}`),
    testChannel: (id) => apiClient.post(`/alerts/channels/${id}/test`)
  },

  // Teams endpoints
  teams: {
    list: (params) => apiClient.get('/teams', { params }),
    get: (id) => apiClient.get(`/teams/${id}`),
    create: (data) => apiClient.post('/teams', data),
    update: (id, data) => apiClient.put(`/teams/${id}`, data),
    delete: (id) => apiClient.delete(`/teams/${id}`),
    addMember: (id, data) => apiClient.post(`/teams/${id}/members`, data),
    removeMember: (id, memberId) => apiClient.delete(`/teams/${id}/members/${memberId}`),
    updateMemberRole: (id, memberId, data) => apiClient.put(`/teams/${id}/members/${memberId}`, data)
  },

  // Admin endpoints
  admin: {
    getUsers: (params) => apiClient.get('/admin/users', { params }),
    getUser: (id) => apiClient.get(`/admin/users/${id}`),
    updateUserRole: (id, data) => apiClient.put(`/admin/users/${id}/role`, data),
    suspendUser: (id) => apiClient.post(`/admin/users/${id}/suspend`),
    reactivateUser: (id) => apiClient.post(`/admin/users/${id}/reactivate`),
    getSystemStats: () => apiClient.get('/admin/stats'),
    getAuditLogs: (params) => apiClient.get('/admin/audit-logs', { params })
  },

  // Logs endpoints
  logs: {
    list: (params) => apiClient.get('/logs', { params }),
    getByDeployment: (deploymentId, params) => apiClient.get(`/logs/deployment/${deploymentId}`, { params }),
    search: (data) => apiClient.post('/logs/search', data),
    export: (params) => apiClient.get('/logs/export', { params, responseType: 'blob' })
  },

  // Templates endpoints
  templates: {
    list: (params) => apiClient.get('/templates', { params }),
    get: (id) => apiClient.get(`/templates/${id}`),
    create: (data) => apiClient.post('/templates', data),
    update: (id, data) => apiClient.put(`/templates/${id}`, data),
    delete: (id) => apiClient.delete(`/templates/${id}`),
    validate: (id, data) => apiClient.post(`/templates/${id}/validate`, data),
    deploy: (id, data) => apiClient.post(`/templates/${id}/deploy`, data)
  },

  // Direct axios methods for backwards compatibility
  get: (url, config) => apiClient.get(url, config),
  post: (url, data, config) => apiClient.post(url, data, config),
  put: (url, data, config) => apiClient.put(url, data, config),
  delete: (url, config) => apiClient.delete(url, config),
  patch: (url, data, config) => apiClient.patch(url, data, config)
};

export default api;

// Named exports for convenience
export const authApi = api.auth;
export const adConfigApi = api.adConfig;
export const credentialsApi = api.credentials;
export const deploymentsApi = api.deployments;
export const clustersApi = api.clusters;
export const deploymentDraftsApi = api.deploymentDrafts;
export const statusApi = api.status;
export const analyticsApi = api.analytics;
export const costApi = api.cost;
export const alertsApi = api.alerts;
export const teamsApi = api.teams;
export const adminApi = api.admin;
export const logsApi = api.logs;
export const templatesApi = api.templates;

