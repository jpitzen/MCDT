import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import type {
  AuthToken,
  User,
  Quote,
  QuoteListResponse,
  QuoteInputs,
  QuoteResults,
  PricingResult,
  PricingComparison,
  PricingStatus,
  ConfigDefaults,
  Region,
  BrandingAssetsResponse,
  ExportPreview,
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_PREFIX = '/api/v1';

// Token storage helpers
const getStoredToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
};

const setStoredToken = (token: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('access_token', token);
};

const removeStoredToken = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
};

// Create axios instance
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: `${API_BASE_URL}${API_PREFIX}`,
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  });

  // Request interceptor - add auth token
  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = getStoredToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor - handle errors
  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      if (error.response?.status === 401) {
        // Don't trigger logout for login/logout endpoints to prevent infinite loops
        const url = error.config?.url || '';
        if (!url.includes('/auth/login') && !url.includes('/auth/logout')) {
          removeStoredToken();
          // Redirect to login if on client side
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('auth:logout'));
          }
        }
      }
      return Promise.reject(error);
    }
  );

  return client;
};

const apiClient = createApiClient();

// ============ Auth API ============
export const authApi = {
  login: async (username: string, password: string): Promise<AuthToken> => {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    const response = await apiClient.post<AuthToken>('/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    if (response.data.access_token) {
      setStoredToken(response.data.access_token);
      if (response.data.refresh_token) {
        localStorage.setItem('refresh_token', response.data.refresh_token);
      }
    }

    return response.data;
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      removeStoredToken();
    }
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  },

  refreshToken: async (): Promise<AuthToken> => {
    const refreshToken = localStorage.getItem('refresh_token');
    const response = await apiClient.post<AuthToken>('/auth/refresh', null, {
      headers: { Authorization: `Bearer ${refreshToken}` },
    });

    if (response.data.access_token) {
      setStoredToken(response.data.access_token);
    }

    return response.data;
  },
};

// ============ Quotes API ============
export const quotesApi = {
  list: async (
    page: number = 1,
    pageSize: number = 20,
    status?: string,
    search?: string
  ): Promise<QuoteListResponse> => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('page_size', pageSize.toString());
    if (status) params.append('status', status);
    if (search) params.append('search', search);

    const response = await apiClient.get<QuoteListResponse>(`/quotes/?${params}`);
    return response.data;
  },

  get: async (quoteId: string): Promise<Quote> => {
    const response = await apiClient.get<Quote>(`/quotes/${quoteId}`);
    return response.data;
  },

  create: async (data: {
    name: string;
    inputs: QuoteInputs;
    notes?: string;
  }): Promise<Quote> => {
    // Backend requires customer_name at top level
    const payload = {
      ...data,
      customer_name: data.inputs.customer_name,
    };
    const response = await apiClient.post<Quote>('/quotes/', payload);
    return response.data;
  },

  update: async (
    quoteId: string,
    data: Partial<{ name: string; inputs: QuoteInputs; notes: string }>
  ): Promise<Quote> => {
    const response = await apiClient.put<Quote>(`/quotes/${quoteId}`, data);
    return response.data;
  },

  delete: async (quoteId: string): Promise<void> => {
    await apiClient.delete(`/quotes/${quoteId}`);
  },

  calculate: async (inputs: QuoteInputs): Promise<QuoteResults> => {
    const response = await apiClient.post<QuoteResults>('/quotes/calculate', inputs);
    return response.data;
  },

  recalculate: async (quoteId: string): Promise<Quote> => {
    const response = await apiClient.post<Quote>(`/quotes/${quoteId}/recalculate`);
    return response.data;
  },

  duplicate: async (quoteId: string, newName?: string): Promise<Quote> => {
    const response = await apiClient.post<Quote>(`/quotes/${quoteId}/duplicate`, {
      new_name: newName,
    });
    return response.data;
  },

  submit: async (quoteId: string): Promise<Quote> => {
    const response = await apiClient.post<Quote>(`/quotes/${quoteId}/submit`);
    return response.data;
  },

  approve: async (quoteId: string): Promise<Quote> => {
    const response = await apiClient.post<Quote>(`/quotes/${quoteId}/approve`);
    return response.data;
  },
};

// ============ Pricing API ============
export const pricingApi = {
  getStatus: async (): Promise<PricingStatus> => {
    const response = await apiClient.get<PricingStatus>('/pricing/status');
    return response.data;
  },

  getProviderPricing: async (
    provider: 'azure' | 'aws' | 'gcp',
    serviceType: string,
    region: string
  ): Promise<PricingResult[]> => {
    const params = new URLSearchParams();
    params.append('service_type', serviceType);
    params.append('region', region);

    const response = await apiClient.get<PricingResult[]>(`/pricing/${provider}?${params}`);
    return response.data;
  },

  compare: async (
    serviceType: string,
    region: string
  ): Promise<PricingComparison> => {
    const response = await apiClient.get<PricingComparison>(
      `/pricing/compare/${serviceType}?region=${region}`
    );
    return response.data;
  },

  refreshCache: async (provider?: string): Promise<void> => {
    const params = provider ? `?provider=${provider}` : '';
    await apiClient.post(`/pricing/refresh${params}`);
  },
};

// ============ Config API ============
export const configApi = {
  getDefaults: async (): Promise<ConfigDefaults> => {
    const response = await apiClient.get<ConfigDefaults>('/config/defaults');
    return response.data;
  },

  getRegions: async (provider?: string): Promise<Region[]> => {
    const params = provider ? `?provider=${provider}` : '';
    const response = await apiClient.get<Region[]>(`/config/regions${params}`);
    return response.data;
  },

  getModules: async (): Promise<string[]> => {
    const response = await apiClient.get<string[]>('/config/modules');
    return response.data;
  },

  getPricingModels: async (): Promise<string[]> => {
    const response = await apiClient.get<string[]>('/config/pricing-models');
    return response.data;
  },

  getCurrencies: async (): Promise<string[]> => {
    const response = await apiClient.get<string[]>('/config/currencies');
    return response.data;
  },
};

// ============ Branding API ============
export const brandingApi = {
  getAssets: async (): Promise<BrandingAssetsResponse> => {
    const response = await apiClient.get<BrandingAssetsResponse>('/branding/assets');
    return response.data;
  },

  // Get static URLs for branding assets (no auth required)
  getStaticUrls: async (): Promise<{ urls: Record<string, string | null>; default_logo: string }> => {
    const response = await apiClient.get<{ urls: Record<string, string | null>; default_logo: string }>('/branding/static-urls');
    return response.data;
  },

  // Get the static URL for a specific asset type
  // Falls back to default logo if asset doesn't exist
  getStaticLogoUrl: (assetType: string, staticUrls?: Record<string, string | null>): string => {
    if (staticUrls && staticUrls[assetType]) {
      // Add cache buster to static URL
      return `${staticUrls[assetType]}?v=${Date.now()}`;
    }
    // Default fallback
    return '/castle-logo.svg';
  },

  // Legacy: API-based logo URL (requires auth, used for export functionality)
  getLogoUrl: (assetType: string): string => {
    return `${API_BASE_URL}${API_PREFIX}/branding/logo/${assetType}`;
  },

  uploadLogo: async (assetType: string, file: File): Promise<{ static_url: string }> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<{ static_url: string }>(`/branding/logo/${assetType}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  deleteLogo: async (assetType: string): Promise<void> => {
    await apiClient.delete(`/branding/logo/${assetType}`);
  },
};

// ============ Admin API ============
export interface SystemSettings {
  session_timeout_minutes: number;
  session_warning_minutes: number;
}

export const adminApi = {
  getSettings: async (): Promise<SystemSettings> => {
    const response = await apiClient.get<SystemSettings>('/admin/settings');
    return response.data;
  },

  updateSettings: async (settings: Partial<SystemSettings>): Promise<SystemSettings> => {
    const response = await apiClient.put<SystemSettings>('/admin/settings', settings);
    return response.data;
  },

  getAuditLogs: async (params: {
    page?: number;
    page_size?: number;
    action?: string;
    resource_type?: string;
    username?: string;
    days?: number;
  } = {}) => {
    const response = await apiClient.get('/admin/audit-logs', { params });
    return response.data;
  },
};

// ============ Exports API ============
export const exportsApi = {
  getPreview: async (quoteId: string): Promise<ExportPreview> => {
    const response = await apiClient.get<ExportPreview>(`/exports/${quoteId}/preview`);
    return response.data;
  },

  downloadWord: async (quoteId: string, includeHeaderLogo: boolean = true): Promise<Blob> => {
    const response = await apiClient.get(
      `/exports/${quoteId}/word?include_header_logo=${includeHeaderLogo}`,
      { responseType: 'blob' }
    );
    return response.data;
  },

  downloadExcel: async (quoteId: string): Promise<Blob> => {
    const response = await apiClient.get(`/exports/${quoteId}/excel`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Helper to trigger file download
  triggerDownload: (blob: Blob, filename: string): void => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};

// ============ Users API ============
export const usersApi = {
  getUsers: async (params?: { role?: string; active_only?: boolean }) => {
    const searchParams = new URLSearchParams();
    if (params?.role) searchParams.append('role', params.role);
    if (params?.active_only !== undefined) searchParams.append('active_only', String(params.active_only));
    const queryString = searchParams.toString();
    const response = await apiClient.get(`/users${queryString ? `?${queryString}` : ''}`);
    return response.data;
  },

  getUser: async (userId: number) => {
    const response = await apiClient.get(`/users/${userId}`);
    return response.data;
  },
};

// ============ AD Config API ============
export const adConfigApi = {
  getConfig: async () => {
    const response = await apiClient.get('/config/ad');
    return response.data;
  },

  updateConfig: async (config: Record<string, unknown>) => {
    const response = await apiClient.put('/config/ad', config);
    return response.data;
  },

  setServiceAccount: async (username: string, password: string) => {
    const response = await apiClient.post('/config/ad/service-account', { username, password });
    return response.data;
  },

  testServiceAccount: async (username: string, password: string) => {
    const response = await apiClient.post('/config/ad/service-account/test', { username, password });
    return response.data;
  },

  clearServiceAccount: async () => {
    await apiClient.delete('/config/ad/service-account');
  },

  updateLocalAdmin: async (data: { enabled?: boolean; new_password?: string }) => {
    const response = await apiClient.put('/config/ad/local-admin', data);
    return response.data;
  },

  getRoleMappings: async () => {
    const response = await apiClient.get('/config/ad/role-mappings');
    return response.data;
  },

  addRoleMapping: async (mapping: { ad_group_name: string; application_role: string; priority: number }) => {
    const response = await apiClient.post('/config/ad/role-mappings', mapping);
    return response.data;
  },

  deleteRoleMapping: async (mappingId: number) => {
    await apiClient.delete(`/config/ad/role-mappings/${mappingId}`);
  },

  queryGroups: async (search?: string, useCache = false) => {
    const params = new URLSearchParams({ use_cache: useCache.toString() });
    if (search) params.append('search', search);
    const response = await apiClient.get(`/config/ad/groups?${params}`);
    return response.data;
  },

  syncUsers: async () => {
    const response = await apiClient.post('/config/ad/users/sync');
    return response.data;
  },

  importUsers: async () => {
    const response = await apiClient.post('/config/ad/users/import');
    return response.data;
  },
};

// ============ Approval API ============
export const approvalApi = {
  // Submit quote for approval
  submitForApproval: async (quoteId: string, data?: { submission_notes?: string; expires_in_days?: number }) => {
    const response = await apiClient.post(`/quotes/${quoteId}/submit-for-approval`, data || {});
    return response.data;
  },

  // Get approval history for a quote
  getApprovalHistory: async (quoteId: string) => {
    const response = await apiClient.get(`/quotes/${quoteId}/approvals`);
    return response.data;
  },

  // Cancel pending approval
  cancelPendingApproval: async (quoteId: string) => {
    const response = await apiClient.delete(`/quotes/${quoteId}/approvals/pending`);
    return response.data;
  },

  // Assign users to a quote
  assignUsers: async (quoteId: string, usernames: string[]) => {
    const response = await apiClient.post(`/quotes/${quoteId}/assign-users`, { usernames });
    return response.data;
  },

  // Remove assigned users
  removeAssignedUsers: async (quoteId: string, usernames: string[]) => {
    const response = await apiClient.delete(`/quotes/${quoteId}/assigned-users`, { data: { usernames } });
    return response.data;
  },

  // Public: Get approval details (no auth required)
  getPublicApproval: async (token: string) => {
    const response = await axios.get(`${API_BASE_URL}${API_PREFIX}/approvals/${token}`);
    return response.data;
  },

  // Public: Respond to approval (no auth required)
  respondToApproval: async (token: string, action: 'approve' | 'deny', feedback?: string) => {
    const response = await axios.post(`${API_BASE_URL}${API_PREFIX}/approvals/${token}/respond`, {
      action, feedback,
    });
    return response.data;
  },

  // Authenticated: Get approval details
  getApprovalAuthenticated: async (token: string) => {
    const response = await apiClient.get(`/approvals/${token}/authenticated`);
    return response.data;
  },

  // Authenticated: Respond to approval
  respondToApprovalAuthenticated: async (token: string, action: 'approve' | 'deny', feedback?: string) => {
    const response = await apiClient.post(`/approvals/${token}/respond/authenticated`, { action, feedback });
    return response.data;
  },
};

// ============ ZL Licensing API ============
export const licensingApi = {
  // Get all module licensing configurations
  getAllModuleConfigs: async () => {
    const response = await apiClient.get('/licensing/modules');
    return response.data;
  },

  // Get specific module configuration
  getModuleConfig: async (moduleId: string) => {
    const response = await apiClient.get(`/licensing/modules/${moduleId}`);
    return response.data;
  },

  // Update module configuration (sales role required)
  updateModuleConfig: async (moduleId: string, data: Record<string, unknown>) => {
    const response = await apiClient.put(`/licensing/modules/${moduleId}`, data);
    return response.data;
  },

  // Get global licensing settings
  getGlobalSettings: async () => {
    const response = await apiClient.get('/licensing/global');
    return response.data;
  },

  // Update global licensing settings (sales role required)
  updateGlobalSettings: async (data: Record<string, unknown>) => {
    const response = await apiClient.put('/licensing/global', data);
    return response.data;
  },

  // Calculate licensing costs
  calculateLicensing: async (moduleQuantities: Record<string, number>, totalUsers: number) => {
    const response = await apiClient.post('/licensing/calculate', {
      module_quantities: moduleQuantities,
      total_users: totalUsers,
    });
    return response.data;
  },

  // Check user's ZL Licensing access level
  checkAccess: async () => {
    const response = await apiClient.get('/licensing/access-check');
    return response.data;
  },
};

// ============ Alternate Licensing API ============
export const alternateLicensingApi = {
  // Get available pricing models
  getModels: async () => {
    const response = await apiClient.get('/alternate-licensing/models');
    return response.data;
  },

  // Get available modules for per-module pricing
  getModules: async () => {
    const response = await apiClient.get('/alternate-licensing/modules');
    return response.data;
  },

  // Get bundle options
  getBundles: async () => {
    const response = await apiClient.get('/alternate-licensing/bundles');
    return response.data;
  },

  // Get competitive comparison data
  getCompetitiveComparison: async () => {
    const response = await apiClient.get('/alternate-licensing/competitive-comparison');
    return response.data;
  },

  // Get pricing model explanation
  getExplanation: async (modelId: string) => {
    const response = await apiClient.get(`/alternate-licensing/explanation/${modelId}`);
    return response.data;
  },

  // Calculate flat per-user pricing
  calculateFlat: async (data: {
    user_count: number;
    actual_storage_gb?: number;
    actual_egress_gb?: number;
    selected_modules?: string[];
  }) => {
    const response = await apiClient.post('/alternate-licensing/calculate/flat', data);
    return response.data;
  },

  // Calculate per-module pricing
  calculatePerModule: async (data: {
    user_count: number;
    selected_modules: string[];
    actual_storage_gb?: number;
    actual_egress_gb?: number;
  }) => {
    const response = await apiClient.post('/alternate-licensing/calculate/per-module', data);
    return response.data;
  },

  // Calculate bundle pricing
  calculateBundle: async (data: {
    user_count: number;
    bundle_id: string;
    actual_storage_gb?: number;
    actual_egress_gb?: number;
  }) => {
    const response = await apiClient.post('/alternate-licensing/calculate/bundle', data);
    return response.data;
  },

  // Compare all pricing models
  compareAll: async (data: {
    user_count: number;
    selected_modules: string[];
    actual_storage_gb?: number;
    actual_egress_gb?: number;
  }) => {
    const response = await apiClient.post('/alternate-licensing/compare', data);
    return response.data;
  },

  // Quick estimate
  quickEstimate: async (params: {
    user_count: number;
    modules?: number;
    storage_tb?: number;
    egress_gb?: number;
  }) => {
    const response = await apiClient.get('/alternate-licensing/quick-estimate', { params });
    return response.data;
  },
};

// Export the client for custom requests
export { apiClient, getStoredToken, setStoredToken, removeStoredToken };
