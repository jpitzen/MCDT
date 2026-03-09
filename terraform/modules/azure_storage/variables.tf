# =============================================================================
# Azure Storage Module Variables
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

variable "storage_tier" {
  description = "Storage account tier (Standard or Premium)"
  type        = string
  default     = "Standard"
}

variable "replication_type" {
  description = "Storage replication type (LRS, GRS, ZRS, GZRS)"
  type        = string
  default     = "LRS"
}

variable "container_name" {
  description = "Blob container name (empty to derive from cluster_name)"
  type        = string
  default     = ""
}

variable "enable_versioning" {
  description = "Enable blob versioning"
  type        = bool
  default     = false
}

variable "blob_soft_delete_days" {
  description = "Days for blob soft delete retention (0 to disable)"
  type        = number
  default     = 7
}

variable "container_soft_delete_days" {
  description = "Days for container soft delete retention (0 to disable)"
  type        = number
  default     = 7
}

variable "enable_archive_container" {
  description = "Create a separate archive blob container"
  type        = bool
  default     = false
}

variable "enable_lifecycle_policy" {
  description = "Enable blob lifecycle management policy"
  type        = bool
  default     = true
}

variable "lifecycle_prefix_filter" {
  description = "Blob prefix filter for lifecycle rules"
  type        = list(string)
  default     = []
}

variable "days_to_cool_tier" {
  description = "Days before moving blobs to Cool tier"
  type        = number
  default     = 30
}

variable "days_to_archive_tier" {
  description = "Days before moving blobs to Archive tier (0 to disable)"
  type        = number
  default     = 90
}

variable "days_to_delete" {
  description = "Days before deleting blobs (0 to disable)"
  type        = number
  default     = 365
}

variable "enable_file_share" {
  description = "Create an Azure Files share for ReadWriteMany storage"
  type        = bool
  default     = true
}

variable "file_share_quota_gb" {
  description = "Azure Files share quota in GB"
  type        = number
  default     = 100
}

variable "file_share_tier" {
  description = "Azure Files share access tier (Hot, Cool, TransactionOptimized, Premium)"
  type        = string
  default     = "Hot"
}

variable "common_tags" {
  description = "Common tags applied to all resources"
  type        = map(string)
  default     = {}
}
