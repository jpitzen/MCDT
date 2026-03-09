variable "cluster_name" {
  description = "Name of the cluster (used for resource naming)"
  type        = string
}

variable "efs_name" {
  description = "Name for the EFS file system (if empty, uses cluster_name-efs)"
  type        = string
  default     = ""
}

variable "vpc_id" {
  description = "ID of the VPC where EFS will be deployed"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block of the VPC for security group rules"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs for EFS mount targets"
  type        = list(string)
}

# Performance Configuration
variable "performance_mode" {
  description = "Performance mode for the file system (generalPurpose or maxIO)"
  type        = string
  default     = "generalPurpose"

  validation {
    condition     = contains(["generalPurpose", "maxIO"], var.performance_mode)
    error_message = "Performance mode must be either 'generalPurpose' or 'maxIO'."
  }
}

variable "throughput_mode" {
  description = "Throughput mode (bursting, provisioned, or elastic)"
  type        = string
  default     = "bursting"

  validation {
    condition     = contains(["bursting", "provisioned", "elastic"], var.throughput_mode)
    error_message = "Throughput mode must be 'bursting', 'provisioned', or 'elastic'."
  }
}

variable "provisioned_throughput_in_mibps" {
  description = "Provisioned throughput in MiB/s (required if throughput_mode is provisioned)"
  type        = number
  default     = null
}

# Encryption
variable "kms_key_id" {
  description = "KMS key ID for encryption (leave empty for AWS managed key)"
  type        = string
  default     = ""
}

# Lifecycle Management
variable "transition_to_ia_days" {
  description = "Number of days after which to transition files to Infrequent Access storage (7, 14, 30, 60, 90, or null to disable)"
  type        = number
  default     = null

  validation {
    condition     = var.transition_to_ia_days == null || contains([7, 14, 30, 60, 90], var.transition_to_ia_days)
    error_message = "Transition to IA must be null or one of: 7, 14, 30, 60, 90 days."
  }
}

variable "transition_to_archive_days" {
  description = "Number of days after which to transition files to Archive storage (90, 180, 270, 365, or null to disable)"
  type        = number
  default     = null

  validation {
    condition     = var.transition_to_archive_days == null || contains([90, 180, 270, 365], var.transition_to_archive_days)
    error_message = "Transition to Archive must be null or one of: 90, 180, 270, 365 days."
  }
}

# Backups
variable "enable_automatic_backups" {
  description = "Enable automatic backups using AWS Backup"
  type        = bool
  default     = true
}

# Access Points
variable "access_points" {
  description = "List of EFS access points to create"
  type = list(object({
    posix_user = object({
      gid = number
      uid = number
    })
    root_directory = object({
      path = string
      creation_info = object({
        owner_gid   = number
        owner_uid   = number
        permissions = string
      })
    })
  }))
  default = []
}

# EKS Integration
variable "create_efs_csi_policy" {
  description = "Create IAM policy for EFS CSI driver"
  type        = bool
  default     = true
}

# File System Policy
variable "file_system_policy" {
  description = "JSON policy document for file system resource-based policy (leave empty for no policy)"
  type        = string
  default     = ""
}

# Tags
variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}
