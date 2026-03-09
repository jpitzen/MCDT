# =============================================================================
# Azure AKS Variables
# =============================================================================

variable "cluster_name" {
  description = "Name of the AKS cluster"
  type        = string
}

variable "region" {
  description = "Azure region for the resources"
  type        = string
  default     = "East US"
}

variable "kubernetes_version" {
  description = "Kubernetes version for the AKS cluster"
  type        = string
  default     = "1.28"
}

variable "node_count" {
  description = "Number of nodes in the default node pool"
  type        = number
  default     = 3
}

variable "node_vm_size" {
  description = "VM size for the default node pool"
  type        = string
  default     = "Standard_D2s_v3"
}

variable "min_node_count" {
  description = "Minimum number of nodes when autoscaling is enabled"
  type        = number
  default     = 1
}

variable "max_node_count" {
  description = "Maximum number of nodes when autoscaling is enabled"
  type        = number
  default     = 5
}

variable "enable_autoscaling" {
  description = "Enable cluster autoscaling"
  type        = bool
  default     = true
}

variable "os_disk_size_gb" {
  description = "OS disk size in GB for nodes"
  type        = number
  default     = 50
}

# =============================================================================
# Azure Authentication
# =============================================================================

variable "resource_group" {
  description = "Azure resource group name"
  type        = string
}

variable "subscription_id" {
  description = "Azure subscription ID"
  type        = string
}

variable "client_id" {
  description = "Azure Service Principal client ID"
  type        = string
}

variable "client_secret" {
  description = "Azure Service Principal client secret"
  type        = string
  sensitive   = true
}

variable "tenant_id" {
  description = "Azure tenant ID"
  type        = string
}

# =============================================================================
# Networking
# =============================================================================

variable "create_vnet" {
  description = "Create a new VNet with subnets and NSGs"
  type        = bool
  default     = true
}

variable "vnet_cidr" {
  description = "CIDR block for the VNet"
  type        = string
  default     = "10.1.0.0/16"
}

variable "public_subnet_cidr" {
  description = "CIDR block for the public subnet"
  type        = string
  default     = "10.1.1.0/24"
}

variable "aks_subnet_cidr" {
  description = "CIDR block for the AKS subnet"
  type        = string
  default     = "10.1.10.0/24"
}

variable "db_subnet_cidr" {
  description = "CIDR block for the database subnet"
  type        = string
  default     = "10.1.20.0/24"
}

variable "enable_nat_gateway" {
  description = "Enable NAT Gateway for outbound internet from AKS subnet"
  type        = bool
  default     = true
}

variable "existing_vnet_id" {
  description = "ID of an existing VNet (used when create_vnet = false)"
  type        = string
  default     = ""
}

variable "existing_aks_subnet_id" {
  description = "ID of an existing AKS subnet (used when create_vnet = false)"
  type        = string
  default     = ""
}

variable "existing_db_subnet_id" {
  description = "ID of an existing database subnet (used when create_vnet = false)"
  type        = string
  default     = ""
}

variable "existing_public_subnet_id" {
  description = "ID of an existing public subnet (used when create_vnet = false)"
  type        = string
  default     = ""
}

variable "network_plugin" {
  description = "Network plugin for AKS (azure or kubenet)"
  type        = string
  default     = "azure"
}

variable "network_policy" {
  description = "Network policy provider (azure or calico)"
  type        = string
  default     = "azure"
}

variable "pod_cidr" {
  description = "Pod CIDR range (used when network_plugin is kubenet)"
  type        = string
  default     = "172.17.0.0/16"
}

variable "service_cidr" {
  description = "Service CIDR range"
  type        = string
  default     = "172.20.0.0/16"
}

variable "dns_service_ip" {
  description = "DNS service IP (must be within service_cidr)"
  type        = string
  default     = "172.20.0.10"
}

# =============================================================================
# Container Registry
# =============================================================================

variable "enable_container_registry" {
  description = "Enable Azure Container Registry"
  type        = bool
  default     = false
}

variable "acr_name" {
  description = "ACR name (if empty, derived from cluster_name)"
  type        = string
  default     = ""
}

variable "acr_sku" {
  description = "ACR SKU tier (Basic, Standard, Premium)"
  type        = string
  default     = "Standard"
}

variable "acr_admin_enabled" {
  description = "Enable ACR admin user"
  type        = bool
  default     = false
}

# =============================================================================
# File Storage
# =============================================================================

variable "enable_file_storage" {
  description = "Enable Azure Files storage share"
  type        = bool
  default     = false
}

variable "file_storage_quota_gb" {
  description = "Azure Files share quota in GB"
  type        = number
  default     = 100
}

# =============================================================================
# Blob Storage (via azure_storage module)
# =============================================================================

variable "enable_blob_storage" {
  description = "Enable full storage module with Blob containers, lifecycle, and optional Files"
  type        = bool
  default     = false
}

variable "blob_container_name" {
  description = "Name of the blob container"
  type        = string
  default     = "zlaws-data"
}

variable "storage_tier" {
  description = "Storage account tier (Standard or Premium)"
  type        = string
  default     = "Standard"
}

variable "storage_replication_type" {
  description = "Storage replication type (LRS, GRS, ZRS, RAGRS)"
  type        = string
  default     = "LRS"
}

variable "enable_blob_versioning" {
  description = "Enable blob versioning"
  type        = bool
  default     = true
}

# =============================================================================
# Database
# =============================================================================

variable "enable_database" {
  description = "Enable managed database provisioning"
  type        = bool
  default     = false
}

variable "db_engine" {
  description = "Database engine: postgresql, mysql, or sqlserver"
  type        = string
  default     = "postgresql"
}

variable "db_name" {
  description = "Name of the database to create"
  type        = string
  default     = "zlaws_db"
}

variable "db_version" {
  description = "Database engine version"
  type        = string
  default     = ""
}

variable "db_sku_name" {
  description = "Azure DB SKU name (e.g., B_Standard_B1ms, GP_Standard_D2s_v3)"
  type        = string
  default     = "B_Standard_B1ms"
}

variable "db_storage_mb" {
  description = "Database storage size in MB"
  type        = number
  default     = 32768
}

variable "db_username" {
  description = "Database admin username"
  type        = string
  default     = "zlaws_admin"
}

variable "db_password" {
  description = "Database admin password (empty = auto-generate)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "db_backup_retention_days" {
  description = "Number of days to retain database backups"
  type        = number
  default     = 7
}

variable "db_geo_redundant_backup" {
  description = "Enable geo-redundant database backups"
  type        = bool
  default     = false
}

# =============================================================================
# SSL / Certificates / Application Gateway
# =============================================================================

variable "ssl_certificate_name" {
  description = "Name of the SSL certificate for Application Gateway (empty to skip)"
  type        = string
  default     = ""
}

variable "ingress_application_gateway" {
  description = "Enable Azure Application Gateway as ingress controller"
  type        = bool
  default     = false
}

variable "app_gateway_name" {
  description = "Application Gateway name (if empty, derived from cluster_name)"
  type        = string
  default     = ""
}

variable "app_gateway_sku" {
  description = "Application Gateway SKU tier (Standard_v2, WAF_v2)"
  type        = string
  default     = "WAF_v2"
}

variable "app_gateway_min_capacity" {
  description = "Minimum capacity for Application Gateway autoscaling"
  type        = number
  default     = 1
}

variable "app_gateway_max_capacity" {
  description = "Maximum capacity for Application Gateway autoscaling"
  type        = number
  default     = 3
}

variable "ssl_policy_name" {
  description = "Predefined SSL policy for Application Gateway"
  type        = string
  default     = "AppGwSslPolicy20220101"
}

# =============================================================================
# Metadata
# =============================================================================

variable "common_tags" {
  description = "Common tags applied to all resources"
  type        = map(string)
  default     = {}
}

variable "environment" {
  description = "Deployment environment (e.g. production, staging)"
  type        = string
  default     = "production"
}
