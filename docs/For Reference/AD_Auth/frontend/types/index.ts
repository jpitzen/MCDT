// User types
export type UserRole = 'admin' | 'professional_services' | 'sales' | 'approver' | 'reviewer' | 'auditor' | 'viewer';

export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: UserRole;
  all_roles?: UserRole[];  // All matched roles for additive permissions
  is_active: boolean;
  auth_source: 'ldap' | 'local';
  created_at: string;
  last_login?: string;
}

// Role permissions helper - supports additive permissions via all_roles
export const RolePermissions = {
  // Helper to check if user has a specific role (checks all_roles for additive permissions)
  hasRole: (user: User | null, role: UserRole): boolean => {
    if (!user) return false;
    if (user.all_roles && user.all_roles.includes(role)) return true;
    return user.role === role;
  },
  
  // Helper to check if user has any of the specified roles
  hasAnyRole: (user: User | null, roles: UserRole[]): boolean => {
    if (!user) return false;
    if (user.all_roles && user.all_roles.some(r => roles.includes(r))) return true;
    return roles.includes(user.role);
  },
  
  canEditConfig: (role: UserRole, allRoles?: UserRole[]) => {
    const roles = allRoles || [role];
    return roles.some(r => ['admin', 'professional_services'].includes(r));
  },
  canEditQuotes: (role: UserRole, allRoles?: UserRole[]) => {
    const roles = allRoles || [role];
    return roles.some(r => ['admin', 'professional_services', 'sales'].includes(r));
  },
  // ZL Licensing access is ONLY for sales and approver roles - admin does NOT get automatic access
  canAccessZLLicensing: (role: UserRole, allRoles?: UserRole[]) => {
    const roles = allRoles || [role];
    return roles.some(r => ['sales', 'approver'].includes(r));
  },
  // ZL Licensing edit is ONLY for sales role
  canEditZLLicensing: (role: UserRole, allRoles?: UserRole[]) => {
    const roles = allRoles || [role];
    return roles.some(r => r === 'sales');
  },
  canApproveQuotes: (role: UserRole, allRoles?: UserRole[]) => {
    const roles = allRoles || [role];
    return roles.some(r => ['admin', 'approver'].includes(r));
  },
  isAdmin: (role: UserRole) => role === 'admin',
};

// Pricing status types
export interface ProviderPricingStatus {
  status: string;
  last_update: string;
}

export interface PricingStatus {
  azure: ProviderPricingStatus;
  aws: ProviderPricingStatus;
  gcp: ProviderPricingStatus;
}

// Auth types
export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Quote types

// Module-specific inputs for the dynamic quote wizard (Phase 4)
export interface JournalModuleInputs {
  userCount: number;
  avgMailsPerHourPerUser: number;
  calculatedTotalMessagesPerDay?: number;
}

export interface EmailArchiveModuleInputs {
  userCount: number;
  avgMailboxSizeGB: number;
  avgMailboxSizeUnit: 'GB' | 'TB';
  avgEmailSizeKB: number;
  calculatedTotalEmails?: number;
}

export interface EDiscoveryModuleInputs {
  activeCasesPerMonth: number;
  avgExportVolumeGB: number;
  concurrentSearches: number;
}

export interface ComplianceModuleInputs {
  reviewerCount: number;
}

export interface FileArchivingModuleInputs {
  avgFileSizeMB: number;
  fileSystemSizeGB: number;
  fileSystemSizeUnit: 'GB' | 'TB' | 'PB';
}

export interface SharePointModuleInputs {
  sharePointType: 'online' | 'onprem';
  avgFileSizeMB: number;
  systemSizeGB: number;
  systemSizeUnit: 'GB' | 'TB' | 'PB';
  numberOfSites: number;
}

export interface MSTeamsModuleInputs {
  chatsPerHour: number;
}

export interface EFMModuleInputs {
  avgFileSizeMB: number;
  fileSystemSizeGB: number;
  fileSystemSizeUnit: 'GB' | 'TB' | 'PB';
  emailDataSizeGB: number;
  emailDataSizeUnit: 'GB' | 'TB' | 'PB';
}

export interface WorkspaceModuleInputs {
  avgFileSizeMB: number;
  fileSystemSizeGB: number;
  fileSystemSizeUnit: 'GB' | 'TB' | 'PB';
  emailDataSizeGB: number;
  emailDataSizeUnit: 'GB' | 'TB' | 'PB';
}

export interface RecordsManagementModuleInputs {
  avgFileSizeMB: number;
  fileSystemSizeGB: number;
  fileSystemSizeUnit: 'GB' | 'TB' | 'PB';
  emailDataSizeGB: number;
  emailDataSizeUnit: 'GB' | 'TB' | 'PB';
}

export interface UIServersModuleInputs {
  concurrentUsers: number;
}

export interface LargeTaskModuleInputs {
  serverCount: number;
}

export interface SmallTaskModuleInputs {
  serverCount: number;
}

export interface RetentionModuleInputs {
  retentionPeriods: Array<{ years: number; percentage: number; label?: string }>;
  emailSystemAgeYears: number;
  deletionTimeframeDays: number;
}

export interface MigrationModuleInputs {
  totalDataSizeGB: number;
  totalDataSizeUnit: 'GB' | 'TB' | 'PB';
  avgMessageSizeKB: number;
  calculatedMessagesToMigrate?: number;
}

// Combined module inputs
export interface ModuleSpecificInputs {
  journal?: JournalModuleInputs;
  email_archive?: EmailArchiveModuleInputs;
  ediscovery?: EDiscoveryModuleInputs;
  compliance?: ComplianceModuleInputs;
  file_archiving?: FileArchivingModuleInputs;
  sharepoint?: SharePointModuleInputs;
  ms_teams?: MSTeamsModuleInputs;
  udm?: EFMModuleInputs;
  workspace?: WorkspaceModuleInputs;
  records_management?: RecordsManagementModuleInputs;
  ui_servers?: UIServersModuleInputs;
  large_task?: LargeTaskModuleInputs;
  small_task?: SmallTaskModuleInputs;
  retention?: RetentionModuleInputs;
  migration?: MigrationModuleInputs;
}

export interface QuoteInputs {
  customer_name: string;
  users: number;
  cloud_providers: ('Azure' | 'AWS' | 'GCP')[];
  regions: {
    Azure?: string;
    AWS?: string;
    GCP?: string;
  };
  modules: string[];
  archive_mode: 'full' | 'in_place';
  msgs_per_day: number;
  avg_msg_kb: number;
  files_per_month: number;
  avg_file_mb: number;
  retention_years: number;
  pricing_model: 'PAYG' | '1-Year Reserved' | '3-Year Reserved';
  ha_enabled: boolean;
  geo_replication: boolean;
  // Multi-year scenario selection (1-10 years)
  selected_timeframes?: number[];
  // Storage configuration
  storage_class?: 'standard' | 'premium' | 'archive' | 'file_system';
  storage_redundancy?: 'LRS' | 'ZRS' | 'GRS' | 'GZRS';
  // Module-specific VM types (optional advanced config)
  module_vm_types?: {
    [moduleId: string]: {
      Azure?: string;
      AWS?: string;
      GCP?: string;
    };
  };
  // Phase 4: Module-specific inputs from dynamic wizard steps
  moduleInputs?: ModuleSpecificInputs;
}

export interface QuoteTotals {
  total_monthly: number;
  total_annual: number;
  software_monthly: number;
  infrastructure_monthly: number;
  pricing_model: string;
}

export interface QuoteStorage {
  total_raw_storage_gb: number;
  hot_tier_gb: number;
  warm_tier_gb: number;
  cold_tier_gb: number;
  db_storage_gb: number;
  index_storage_gb: number;
  final_monthly_cost: number;
}

export interface QuoteCompute {
  vm_count: number;
  vm_cost_per_server: number;
  base_monthly_cost: number;
  final_monthly_cost: number;
}

export interface QuoteDatabase {
  azure_sql_tier: string;
  azure_cost_monthly: number;
  aws_rds_sql_tier: string;
  aws_cost_monthly: number;
  gcp_cloudsql_tier: string;
  gcp_cost_monthly: number;
  total_iops_required: number;
  final_monthly_cost: number;
  explanation: string;
}

export interface QuoteBandwidth {
  total_egress_gb: number;
  standard_egress_gb: number;
  ediscovery_egress_gb: number;
  total_monthly_cost: number;
}

export interface QuoteSoftware {
  pricing_model: string;
  monthly_license: number;
  annual_license: number;
  annual_maintenance: number;
  implementation_cost: number;
  training_cost: number;
  first_year_total: number;
  annual_recurring: number;
  effective_rate: number;
}

// Kubernetes infrastructure requirements
export interface KubernetesInfrastructure {
  total_nodes: number;
  worker_nodes: number;
  system_nodes: number;
  total_pods: number;
  workload_pods: number;
  infra_pods: number;
  total_namespaces: number;
  service_accounts: number;
  persistent_volumes: number;
  ingress_controllers: number;
  config_maps: number;
  secrets: number;
  total_cpu_cores: number;
  total_memory_gb: number;
  pods_per_node: number;
  node_size: string;
}

export interface QuoteServers {
  total_servers: number;
  journal_servers: number;
  task_servers_small: number;
  task_servers_large: number;
  file_servers: number;
  export_servers: number;
  ui_servers: number;
  kubernetes?: KubernetesInfrastructure;
}

// Provider-specific result for comparison
export interface ProviderResult {
  region: string;
  database: QuoteDatabase;
  storage: QuoteStorage & { 
    effective_storage_gb: number;
    archive_mode: 'full' | 'in_place';
  };
  bandwidth: QuoteBandwidth;
  compute: QuoteCompute;
  software: QuoteSoftware;
  totals: QuoteTotals;
}

// Scenario result for multi-year analysis
export interface ScenarioResult {
  timeframe_years: number;
  totals: QuoteTotals;
  storage: QuoteStorage;
  compute: QuoteCompute;
  database: QuoteDatabase;
  bandwidth: QuoteBandwidth;
  software: QuoteSoftware;
  provider_comparison?: {
    Azure?: ProviderResult;
    AWS?: ProviderResult;
    GCP?: ProviderResult;
  };
}

export interface QuoteResults {
  success: boolean;
  customer_name: string;
  inputs: QuoteInputs;
  totals: QuoteTotals;
  storage: QuoteStorage;
  compute: QuoteCompute;
  database: QuoteDatabase;
  bandwidth: QuoteBandwidth;
  software: QuoteSoftware;
  servers: QuoteServers;
  warnings?: string;
  // Multi-provider comparison
  provider_comparison?: {
    Azure?: ProviderResult;
    AWS?: ProviderResult;
    GCP?: ProviderResult;
  };
  // Multi-scenario results (keyed by timeframe in years)
  scenario_results?: {
    [years: number]: ScenarioResult;
  };
}

export interface Quote {
  id: string;
  name: string;
  customer_name: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  inputs: QuoteInputs;
  results: QuoteResults;
  created_at: string;
  updated_at: string;
  created_by: string;
  last_updated_by: string;
  notes?: string;
  version_count: number;
}

export interface QuoteListItem {
  id: string;
  name: string;
  customer_name: string;
  status: string;
  inputs: QuoteInputs;
  results: QuoteResults;
  created_at: string;
  updated_at: string;
  created_by: string;
  last_updated_by: string;
  notes?: string;
  version_count: number;
}

export interface QuoteListResponse {
  items: QuoteListItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// Pricing types
export interface PricingResult {
  provider: string;
  service_type: string;
  region: string;
  sku: string;
  price_per_hour?: number;
  price_per_month?: number;
  price_per_gb?: number;
  currency: string;
  source: 'live' | 'cached' | 'estimated';
  cached_at?: string;
}

export interface PricingComparison {
  service_type: string;
  region: string;
  azure?: PricingResult;
  aws?: PricingResult;
  gcp?: PricingResult;
}

// Config types
export interface Region {
  code: string;
  name: string;
  provider: string;
}

export interface VmSku {
  name: string;
  vcpus: number;
  memory_gb: number;
  provider: string;
}

export interface ConfigDefaults {
  cloud_provider: string;
  region: string;
  pricing_model: string;
  retention_years: number;
  msgs_per_day: number;
  avg_msg_kb: number;
  files_per_month: number;
  avg_file_mb: number;
}

// Branding types
export interface BrandingAsset {
  asset_type: string;
  filename: string;
  content_type: string;
  file_size: number;
  uploaded_by: string;
  uploaded_at: string;
}

export interface BrandingAssetsResponse {
  assets: BrandingAsset[];
  asset_types: Record<string, string>;
}

// Export types
export interface ExportPreview {
  quote_id: string;
  quote_name: string;
  customer_name: string;
  status: string;
  has_results: boolean;
  branding: {
    export_logo_available: boolean;
    header_logo_available: boolean;
  };
  export_formats: string[];
  inputs_summary: Partial<QuoteInputs>;
  totals: QuoteTotals;
}

// API Response types
export interface ApiError {
  detail: string;
  status_code?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// Approval types
export type ApprovalStatus = 'pending' | 'approved' | 'denied' | 'expired';

export interface ApprovalResponse {
  id: string;
  quote_id: string;
  status: ApprovalStatus;
  approval_token: string;
  approval_url?: string;
  submitted_by: string;
  approver_username?: string;
  submission_notes?: string;
  feedback?: string;
  submitted_at: string;
  responded_at?: string;
  expires_at?: string;
}

export interface ApprovalPublicView {
  approval_id: string;
  quote_name: string;
  customer_name: string;
  status: ApprovalStatus;
  submitted_by: string;
  submission_notes?: string;
  submitted_at: string;
  expires_at?: string;
  summary?: {
    total_monthly_cost?: number;
    total_5_year_cost?: number;
    users?: number;
    cloud_providers?: string[];
  };
}

export interface QuoteApprovalHistory {
  quote_id: string;
  approvals: ApprovalResponse[];
}

export interface SubmitForApprovalRequest {
  submission_notes?: string;
  expires_in_days?: number;
}

// ZL Licensing types (Phase 5)
export type PricingUnit = 'per_user' | 'per_gb' | 'per_tb' | 'per_pb';

export interface ZLModuleLicensingConfig {
  id?: number;
  module_id: string;
  module_name: string;
  pricing_unit: PricingUnit;
  tier_1_up_to: number | null;
  tier_1_price: number;
  tier_2_up_to: number | null;
  tier_2_price: number;
  tier_3_price: number;
  default_user_count: number | null;
  default_data_gb: number | null;
  manual_price_override: number | null;
  use_manual_override: boolean;
  is_enabled: boolean;
  description: string | null;
  updated_at?: string;
  updated_by?: string;
}

export interface ZLGlobalSettings {
  id?: number;
  support_maintenance_pct: number;
  professional_services_per_user: number;
  training_per_user: number;
  default_pricing_model: string;
  notes: string | null;
  updated_at?: string;
  updated_by?: string;
}

export interface ZLModuleCost {
  module_name: string;
  quantity: number;
  pricing_unit: PricingUnit;
  monthly_cost: number;
  annual_cost: number;
  effective_rate: number;
  pricing_method: 'tiered' | 'manual_override';
}

export interface ZLLicensingCalculation {
  modules: Record<string, ZLModuleCost>;
  summary: {
    total_monthly_license: number;
    total_annual_license: number;
    annual_maintenance: number;
    implementation_cost: number;
    training_cost: number;
    first_year_total: number;
    annual_recurring: number;
  };
  global_settings: ZLGlobalSettings;
}

export interface ZLAccessCheck {
  has_access: boolean;
  can_edit: boolean;
  role: string;
  access_level: 'edit' | 'view' | 'none';
}

// ============ Alternate Licensing Types ============

export type AlternatePricingModelId = 'flat_per_user' | 'per_module' | 'tiered_bundle';
export type BundleTier = 'essential' | 'professional' | 'enterprise';

export interface AlternatePricingModel {
  id: AlternatePricingModelId;
  name: string;
  description: string;
  reasoning: string;
  best_for: string;
}

export interface AlternateModule {
  id: string;
  name: string;
  per_user: number;
  description: string;
  storage_gb_per_user: number;
}

export interface AlternateBundle {
  id: BundleTier;
  name: string;
  description: string;
  modules_included: string[];
  storage_gb_per_user: number;
  egress_gb_per_user: number;
}

export interface CompetitorPricing {
  price_range: string;
  notes: string;
}

export interface FlatPricingResult {
  model: 'flat_per_user';
  model_name: string;
  user_count: number;
  per_user_price: number;
  effective_tier: string;
  base_license_cost: number;
  included_storage_gb: number;
  included_egress_gb: number;
  actual_storage_gb: number;
  actual_egress_gb: number;
  storage_overage_gb: number;
  egress_overage_gb: number;
  storage_overage_cost: number;
  egress_overage_cost: number;
  total_overage_cost: number;
  total_monthly: number;
  effective_per_user: number;
  explanation: string;
}

export interface ModuleCost {
  per_user: number;
  total: number;
}

export interface PerModulePricingResult {
  model: 'per_module';
  model_name: string;
  user_count: number;
  base_platform_per_user: number;
  base_platform_cost: number;
  selected_modules: string[];
  module_count: number;
  module_costs: Record<string, ModuleCost>;
  total_module_cost: number;
  subtotal: number;
  module_discount_pct: number;
  user_discount_pct: number;
  total_discount_pct: number;
  discount_amount: number;
  discounted_total: number;
  included_storage_gb: number;
  included_egress_gb: number;
  actual_storage_gb: number;
  actual_egress_gb: number;
  storage_overage_gb: number;
  egress_overage_gb: number;
  storage_overage_cost: number;
  egress_overage_cost: number;
  total_overage_cost: number;
  total_monthly: number;
  effective_per_user: number;
  discount_description: string;
  explanation: string;
}

export interface BundlePricingResult {
  model: 'tiered_bundle';
  model_name: string;
  bundle_id: BundleTier;
  bundle_name: string;
  bundle_description: string;
  modules_included: string[];
  user_count: number;
  per_user_price: number;
  effective_tier: number | 'unlimited';
  base_license_cost: number;
  included_storage_gb: number;
  included_egress_gb: number;
  storage_gb_per_user: number;
  egress_gb_per_user: number;
  actual_storage_gb: number;
  actual_egress_gb: number;
  storage_overage_gb: number;
  egress_overage_gb: number;
  storage_overage_cost: number;
  egress_overage_cost: number;
  total_overage_cost: number;
  total_monthly: number;
  effective_per_user: number;
  explanation: string;
}

export type AlternatePricingResult = FlatPricingResult | PerModulePricingResult | BundlePricingResult;

export interface PricingComparison {
  model: string;
  name: string;
  monthly: number;
  per_user: number;
  modules_included?: string[];
}

export interface PricingRecommendation {
  model: string;
  reason: string;
  monthly_cost: number;
}

export interface AllModelsComparisonResult {
  user_count: number;
  selected_modules: string[];
  actual_storage_gb: number;
  actual_egress_gb: number;
  models: Record<string, AlternatePricingResult>;
  comparison: PricingComparison[];
  recommendation: PricingRecommendation;
}

export interface PricingExplanation {
  title: string;
  overview: string;
  benefits: string[];
  best_for: string[];
  considerations: string[];
  competitive_comparison: string;
}

