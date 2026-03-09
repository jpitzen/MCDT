variable "cluster_name" {
  description = "Name of the cluster (used for resource naming if repository_name not provided)"
  type        = string
}

# Repository Configuration
variable "repository_name" {
  description = "Name of the ECR repository (leave empty to use cluster name)"
  type        = string
  default     = ""
}

variable "image_tag_mutability" {
  description = "Tag mutability setting (MUTABLE or IMMUTABLE)"
  type        = string
  default     = "MUTABLE"

  validation {
    condition     = contains(["MUTABLE", "IMMUTABLE"], var.image_tag_mutability)
    error_message = "Image tag mutability must be either 'MUTABLE' or 'IMMUTABLE'."
  }
}

# Image Scanning
variable "scan_on_push" {
  description = "Enable image scanning on push"
  type        = bool
  default     = true
}

variable "enable_scan_logging" {
  description = "Enable CloudWatch logging for scan results"
  type        = bool
  default     = false
}

variable "scan_log_retention_days" {
  description = "Retention period for scan logs in days"
  type        = number
  default     = 7
}

# Encryption
variable "encryption_type" {
  description = "Encryption type (AES256 or KMS)"
  type        = string
  default     = "AES256"

  validation {
    condition     = contains(["AES256", "KMS"], var.encryption_type)
    error_message = "Encryption type must be either 'AES256' or 'KMS'."
  }
}

variable "kms_key_id" {
  description = "KMS key ID for encryption (required if encryption_type is KMS)"
  type        = string
  default     = ""
}

# Lifecycle Policy
variable "enable_lifecycle_policy" {
  description = "Enable lifecycle policy for automatic image cleanup"
  type        = bool
  default     = true
}

variable "lifecycle_policy_json" {
  description = "Custom lifecycle policy JSON (leave empty for default policy)"
  type        = string
  default     = ""
}

variable "keep_last_n_images" {
  description = "Number of images to keep (for default lifecycle policy)"
  type        = number
  default     = 30
}

variable "untagged_image_retention_days" {
  description = "Days to retain untagged images (for default lifecycle policy)"
  type        = number
  default     = 7
}

# Repository Policy
variable "repository_policy_json" {
  description = "Custom repository policy JSON (leave empty for default EKS access)"
  type        = string
  default     = ""
}

variable "allow_eks_access" {
  description = "Allow EKS cluster access to the repository"
  type        = bool
  default     = true
}

variable "eks_role_arns" {
  description = "List of EKS IAM role ARNs to grant access"
  type        = list(string)
  default     = []
}

# Replication
variable "enable_replication" {
  description = "Enable cross-region replication"
  type        = bool
  default     = false
}

variable "replication_destinations" {
  description = "List of replication destinations"
  type = list(object({
    region      = string
    registry_id = string
  }))
  default = []
}

# Pull Through Cache
variable "pull_through_cache_rules" {
  description = "Map of pull through cache rules for caching public registries"
  type = map(object({
    ecr_repository_prefix = string
    upstream_registry_url = string
  }))
  default = {}
}

# IAM Policy
variable "create_ecr_access_policy" {
  description = "Create IAM policy for ECR access"
  type        = bool
  default     = true
}

# Tags
variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}
