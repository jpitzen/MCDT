# =============================================================================
# Linode Managed Database Module Variables
# =============================================================================

variable "cluster_name" {
  description = "Name of the cluster (used for resource naming)"
  type        = string
}

variable "region" {
  description = "Linode region (e.g., us-east, us-central, eu-west)"
  type        = string
}

variable "db_engine" {
  description = "Database engine: postgresql or mysql"
  type        = string
  default     = "postgresql"
  validation {
    condition     = contains(["postgresql", "mysql"], var.db_engine)
    error_message = "db_engine must be one of: postgresql, mysql"
  }
}

variable "db_version" {
  description = "Database engine version. Empty = latest stable."
  type        = string
  default     = ""
}

variable "db_type" {
  description = "Linode database plan type (e.g., g6-nanode-1, g6-standard-1, g6-dedicated-2)"
  type        = string
  default     = "g6-nanode-1"
}

variable "db_cluster_size" {
  description = "Number of nodes (1 = standalone, 3 = HA)"
  type        = number
  default     = 1
  validation {
    condition     = contains([1, 3], var.db_cluster_size)
    error_message = "db_cluster_size must be 1 (standalone) or 3 (high availability)"
  }
}

variable "db_encrypted" {
  description = "Enable encryption at rest"
  type        = bool
  default     = true
}

variable "require_ssl" {
  description = "Require SSL connections"
  type        = bool
  default     = true
}

variable "allow_list" {
  description = "List of IP addresses/CIDRs allowed to connect"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}
