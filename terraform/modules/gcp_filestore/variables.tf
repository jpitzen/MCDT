# =============================================================================
# GCP Filestore Module Variables
# =============================================================================

variable "cluster_name" {
  description = "Name of the cluster (used for resource naming)"
  type        = string
}

variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "zone" {
  description = "GCP zone for the Filestore instance"
  type        = string
}

variable "filestore_tier" {
  description = "Filestore tier: BASIC_HDD, BASIC_SSD, HIGH_SCALE_SSD, ENTERPRISE"
  type        = string
  default     = "BASIC_HDD"
  validation {
    condition     = contains(["BASIC_HDD", "BASIC_SSD", "HIGH_SCALE_SSD", "ENTERPRISE"], var.filestore_tier)
    error_message = "filestore_tier must be one of: BASIC_HDD, BASIC_SSD, HIGH_SCALE_SSD, ENTERPRISE"
  }
}

variable "share_name" {
  description = "Name of the file share"
  type        = string
  default     = "zlaws_share"
}

variable "capacity_gb" {
  description = "Capacity of the file share in GB (min 1024 for BASIC, 2560 for HIGH_SCALE, 1024 for ENTERPRISE)"
  type        = number
  default     = 1024
}

variable "vpc_name" {
  description = "Name of the VPC network to attach to"
  type        = string
}

variable "reserved_ip_range" {
  description = "Reserved IP range for the Filestore instance (CIDR notation)"
  type        = string
  default     = ""
}

variable "enable_private_service_access" {
  description = "Use private service access connection mode"
  type        = bool
  default     = false
}

variable "nfs_export_options" {
  description = "NFS export options for the file share"
  type = object({
    ip_ranges   = list(string)
    access_mode = string
    squash_mode = string
  })
  default = null
}
