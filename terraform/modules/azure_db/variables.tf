# =============================================================================
# Azure Database Module Variables
# =============================================================================

variable "cluster_name" {
  description = "Name of the cluster (used for resource naming)"
  type        = string
}

variable "region" {
  description = "Azure region"
  type        = string
}

variable "resource_group_name" {
  description = "Name of the Azure Resource Group"
  type        = string
}

variable "db_engine" {
  description = "Database engine: postgresql, mysql, or sqlserver"
  type        = string
  default     = "postgresql"

  validation {
    condition     = contains(["postgresql", "mysql", "sqlserver"], var.db_engine)
    error_message = "db_engine must be one of: postgresql, mysql, sqlserver"
  }
}

variable "db_name" {
  description = "Name of the application database"
  type        = string
  default     = "zlaws"
}

variable "db_version" {
  description = "Database engine version (empty for provider default)"
  type        = string
  default     = ""
}

variable "db_sku_name" {
  description = "Database SKU name (e.g., GP_Standard_D2s_v3 for Flexible Server, S0 for SQL)"
  type        = string
  default     = "GP_Standard_D2s_v3"
}

variable "db_storage_mb" {
  description = "Database storage in MB"
  type        = number
  default     = 32768
}

variable "db_username" {
  description = "Database administrator username"
  type        = string
  default     = "dbadmin"
}

variable "db_password" {
  description = "Database administrator password (empty to auto-generate)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "db_backup_retention_days" {
  description = "Backup retention period in days"
  type        = number
  default     = 7
}

variable "db_geo_redundant_backup" {
  description = "Enable geo-redundant backups"
  type        = bool
  default     = false
}

variable "db_availability_zone" {
  description = "Availability zone for the database server (empty for no preference)"
  type        = string
  default     = null
}

variable "db_subnet_id" {
  description = "Subnet ID for private access (delegated subnet for Flexible Server)"
  type        = string
  default     = ""
}

variable "aks_subnet_id" {
  description = "AKS subnet ID (used for SQL Server VNet rules)"
  type        = string
  default     = ""
}

variable "vnet_id" {
  description = "VNet ID for private DNS zone linking"
  type        = string
  default     = ""
}

variable "common_tags" {
  description = "Common tags applied to all resources"
  type        = map(string)
  default     = {}
}
