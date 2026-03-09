# =============================================================================
# Linode LKE Variables
# =============================================================================

variable "cluster_name" {
  description = "Name (label) of the LKE cluster"
  type        = string
}

variable "region" {
  description = "Linode region slug"
  type        = string
  default     = "us-east"
}

variable "cluster_version" {
  description = "Kubernetes version for the LKE cluster"
  type        = string
  default     = "1.28"
}

variable "node_type" {
  description = "Linode instance type for nodes"
  type        = string
  default     = "g6-standard-2"
}

variable "node_count" {
  description = "Number of nodes in the pool"
  type        = number
  default     = 3
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

variable "ha_controlplane" {
  description = "Enable high-availability control plane"
  type        = bool
  default     = true
}

# =============================================================================
# Authentication
# =============================================================================

variable "linode_token" {
  description = "Linode Personal Access Token"
  type        = string
  sensitive   = true
}

# =============================================================================
# VPC
# =============================================================================

variable "create_vpc" {
  description = "Create a new VPC for the cluster"
  type        = bool
  default     = true
}

variable "vpc_subnet_cidr" {
  description = "CIDR block for the VPC subnet"
  type        = string
  default     = "10.4.0.0/20"
}

# =============================================================================
# Object Storage
# =============================================================================

variable "enable_object_storage" {
  description = "Enable Linode Object Storage bucket"
  type        = bool
  default     = false
}

variable "object_bucket_name" {
  description = "Object Storage bucket label (if empty, derived from cluster_name)"
  type        = string
  default     = ""
}

# =============================================================================
# SSL / Certificates
# =============================================================================

variable "enable_ssl" {
  description = "Enable SSL termination on NodeBalancer"
  type        = bool
  default     = false
}

variable "ssl_cert" {
  description = "PEM-encoded SSL certificate"
  type        = string
  default     = ""
  sensitive   = true
}

variable "ssl_key" {
  description = "PEM-encoded SSL private key"
  type        = string
  default     = ""
  sensitive   = true
}

# =============================================================================
# Metadata
# =============================================================================

variable "common_tags" {
  description = "Common tags applied to all resources (map converted to Linode tag format)"
  type        = map(string)
  default     = {}
}

# =============================================================================
# Database
# =============================================================================

variable "enable_database" {
  description = "Enable Linode Managed Database"
  type        = bool
  default     = false
}

variable "db_engine" {
  description = "Database engine: postgresql or mysql"
  type        = string
  default     = "postgresql"
}

variable "db_version" {
  description = "Database engine version. Empty = latest stable."
  type        = string
  default     = ""
}

variable "db_type" {
  description = "Linode database plan type (e.g., g6-nanode-1, g6-standard-1)"
  type        = string
  default     = "g6-nanode-1"
}

variable "db_cluster_size" {
  description = "Number of database nodes (1 = standalone, 3 = HA)"
  type        = number
  default     = 1
}

variable "db_encrypted" {
  description = "Enable encryption at rest"
  type        = bool
  default     = true
}

variable "db_require_ssl" {
  description = "Require SSL connections"
  type        = bool
  default     = true
}

variable "db_allow_list" {
  description = "List of IPs/CIDRs allowed to connect"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}
