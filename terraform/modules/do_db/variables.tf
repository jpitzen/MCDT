# =============================================================================
# DigitalOcean Managed Database Module Variables
# =============================================================================

variable "cluster_name" {
  description = "Name of the cluster (used for resource naming)"
  type        = string
}

variable "region" {
  description = "DigitalOcean region slug (e.g., nyc1, sfo3)"
  type        = string
}

variable "db_engine" {
  description = "Database engine: pg, mysql, redis, or mongodb"
  type        = string
  default     = "pg"
  validation {
    condition     = contains(["pg", "mysql", "redis", "mongodb"], var.db_engine)
    error_message = "db_engine must be one of: pg, mysql, redis, mongodb"
  }
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
  description = "Database droplet size slug (e.g., db-s-1vcpu-1gb, db-s-2vcpu-4gb)"
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

variable "vpc_id" {
  description = "UUID of the VPC for private networking"
  type        = string
  default     = ""
}

variable "k8s_cluster_id" {
  description = "DOKS cluster ID for firewall allow rule"
  type        = string
  default     = ""
}

variable "enable_connection_pool" {
  description = "Enable connection pool (PostgreSQL only)"
  type        = bool
  default     = false
}

variable "connection_pool_size" {
  description = "Connection pool size"
  type        = number
  default     = 22
}
