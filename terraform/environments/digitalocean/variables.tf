# =============================================================================
# DigitalOcean DOKS Variables
# =============================================================================

variable "cluster_name" {
  description = "Name of the DOKS cluster"
  type        = string
}

variable "region" {
  description = "DigitalOcean region slug"
  type        = string
  default     = "nyc1"
}

variable "cluster_version" {
  description = "Kubernetes version prefix (e.g. 1.28)"
  type        = string
  default     = "1.28"
}

variable "node_size" {
  description = "Droplet size slug for nodes"
  type        = string
  default     = "s-2vcpu-4gb"
}

variable "node_count" {
  description = "Number of nodes in the default pool"
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

variable "surge_upgrade" {
  description = "Enable surge upgrades for zero-downtime upgrades"
  type        = bool
  default     = true
}

# =============================================================================
# Authentication
# =============================================================================

variable "do_token" {
  description = "DigitalOcean Personal Access Token"
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

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.3.0.0/16"
}

variable "existing_vpc_id" {
  description = "UUID of an existing VPC (used when create_vpc = false)"
  type        = string
  default     = ""
}

# =============================================================================
# Container Registry
# =============================================================================

variable "enable_container_registry" {
  description = "Enable DigitalOcean Container Registry"
  type        = bool
  default     = true
}

variable "registry_name" {
  description = "Container registry name (if empty, derived from cluster_name)"
  type        = string
  default     = ""
}

variable "registry_tier" {
  description = "Registry subscription tier (starter, basic, professional)"
  type        = string
  default     = "basic"
}

# =============================================================================
# Object Storage (Spaces)
# =============================================================================

variable "enable_object_storage" {
  description = "Enable DigitalOcean Spaces bucket"
  type        = bool
  default     = false
}

variable "spaces_bucket_name" {
  description = "Spaces bucket name (if empty, derived from cluster_name)"
  type        = string
  default     = ""
}

variable "do_spaces_access_key" {
  description = "DigitalOcean Spaces access key"
  type        = string
  default     = ""
  sensitive   = true
}

variable "do_spaces_secret_key" {
  description = "DigitalOcean Spaces secret key"
  type        = string
  default     = ""
  sensitive   = true
}

# =============================================================================
# SSL / Certificates
# =============================================================================

variable "enable_ssl_certificate" {
  description = "Enable DigitalOcean managed SSL certificate"
  type        = bool
  default     = false
}

variable "do_certificate_name" {
  description = "Certificate name (if empty, derived from cluster_name)"
  type        = string
  default     = ""
}

variable "do_certificate_type" {
  description = "Certificate type (lets_encrypt or custom)"
  type        = string
  default     = "lets_encrypt"
}

variable "do_certificate_domains" {
  description = "Domains for the SSL certificate"
  type        = list(string)
  default     = []
}

# =============================================================================
# Metadata
# =============================================================================

variable "common_tags" {
  description = "Common tags applied to all resources (map converted to DO tag format)"
  type        = map(string)
  default     = {}
}

# =============================================================================
# Database
# =============================================================================

variable "enable_database" {
  description = "Enable DigitalOcean Managed Database"
  type        = bool
  default     = false
}

variable "db_engine" {
  description = "Database engine: pg, mysql, redis, or mongodb"
  type        = string
  default     = "pg"
}

variable "db_name" {
  description = "Name of the database to create"
  type        = string
  default     = "zlaws_db"
}

variable "db_version" {
  description = "Database engine version. Empty = latest stable."
  type        = string
  default     = ""
}

variable "db_size" {
  description = "Database droplet size slug"
  type        = string
  default     = "db-s-1vcpu-2gb"
}

variable "db_node_count" {
  description = "Number of database nodes (1 = standalone, 2+ = HA)"
  type        = number
  default     = 1
}

variable "db_username" {
  description = "Database admin username"
  type        = string
  default     = "zlaws_admin"
}

variable "enable_connection_pool" {
  description = "Enable connection pool (PostgreSQL only)"
  type        = bool
  default     = false
}
