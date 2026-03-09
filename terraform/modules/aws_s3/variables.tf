variable "cluster_name" {
  description = "Name of the cluster (used for resource naming if bucket_name not provided)"
  type        = string
}

# Bucket Configuration
variable "bucket_name" {
  description = "Name of the S3 bucket (leave empty to use cluster name)"
  type        = string
  default     = ""
}

variable "force_destroy" {
  description = "Allow bucket deletion even when not empty (use with caution)"
  type        = bool
  default     = false
}

# Versioning
variable "enable_versioning" {
  description = "Enable versioning for the bucket"
  type        = bool
  default     = false
}

# Encryption
variable "encryption_type" {
  description = "Type of encryption (AES256 or aws:kms)"
  type        = string
  default     = "AES256"
}

variable "kms_key_id" {
  description = "KMS key ID for encryption (required if encryption_type is aws:kms)"
  type        = string
  default     = ""
}

# Public Access
variable "block_public_access" {
  description = "Block all public access to the bucket"
  type        = bool
  default     = true
}

# EKS Access
variable "allow_eks_access" {
  description = "Allow EKS cluster access to the bucket"
  type        = bool
  default     = true
}

variable "eks_role_arns" {
  description = "List of EKS IAM role ARNs to grant access"
  type        = list(string)
  default     = []
}

# Lifecycle Rules
variable "lifecycle_rules" {
  description = "List of lifecycle rules"
  type = list(object({
    id      = string
    enabled = bool

    transitions = list(object({
      days          = number
      storage_class = string
    }))

    expiration_days = optional(number)

    noncurrent_version_transitions = list(object({
      days          = number
      storage_class = string
    }))

    noncurrent_version_expiration_days = optional(number)

    filter_prefix = optional(string)
    filter_tags   = optional(map(string), {})
  }))
  default = []
}

# CORS Configuration
variable "cors_rules" {
  description = "List of CORS rules"
  type = list(object({
    allowed_headers = list(string)
    allowed_methods = list(string)
    allowed_origins = list(string)
    expose_headers  = list(string)
    max_age_seconds = number
  }))
  default = []
}

# Logging
variable "enable_logging" {
  description = "Enable access logging"
  type        = bool
  default     = false
}

variable "logging_target_bucket" {
  description = "Target bucket for logs (leave empty to use same bucket)"
  type        = string
  default     = ""
}

variable "logging_target_prefix" {
  description = "Prefix for log objects"
  type        = string
  default     = "logs/"
}

# Object Lock (WORM)
variable "enable_object_lock" {
  description = "Enable object lock for compliance"
  type        = bool
  default     = false
}

variable "object_lock_mode" {
  description = "Object lock mode (GOVERNANCE or COMPLIANCE)"
  type        = string
  default     = "GOVERNANCE"
}

variable "object_lock_retention_days" {
  description = "Default retention period in days"
  type        = number
  default     = 365
}

# Replication
variable "enable_replication" {
  description = "Enable cross-region replication"
  type        = bool
  default     = false
}

variable "replication_destination_bucket_arn" {
  description = "ARN of the destination bucket for replication"
  type        = string
  default     = ""
}

variable "replication_storage_class" {
  description = "Storage class for replicated objects"
  type        = string
  default     = "STANDARD"
}

# Tags
variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}
