# =============================================================================
# GCP Cloud SQL Module Variables
# =============================================================================

variable "cluster_name" {
  description = "Name of the cluster (used for resource naming)"
  type        = string
}

variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
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
  description = "Name of the database to create"
  type        = string
  default     = "zlaws_db"
}

variable "db_version" {
  description = "Database version (e.g., POSTGRES_15, MYSQL_8_0, SQLSERVER_2022_STANDARD). Empty = auto-select."
  type        = string
  default     = ""
}

variable "db_tier" {
  description = "Cloud SQL machine tier (e.g., db-custom-2-7680). Empty = auto-select."
  type        = string
  default     = ""
}

variable "db_disk_size_gb" {
  description = "Disk size in GB"
  type        = number
  default     = 20
}

variable "db_disk_type" {
  description = "Disk type: PD_SSD or PD_HDD"
  type        = string
  default     = "PD_SSD"
}

variable "db_username" {
  description = "Database admin username"
  type        = string
  default     = "zlaws_admin"
}

variable "db_password" {
  description = "Database admin password. Empty = auto-generate."
  type        = string
  default     = ""
  sensitive   = true
}

variable "db_backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 7
}

variable "db_high_availability" {
  description = "Enable high availability (REGIONAL)"
  type        = bool
  default     = false
}

variable "deletion_protection" {
  description = "Enable deletion protection on Cloud SQL instance"
  type        = bool
  default     = true
}

variable "enable_private_ip" {
  description = "Enable private IP for Cloud SQL (requires VPC)"
  type        = bool
  default     = true
}

variable "vpc_self_link" {
  description = "Self link of the VPC network for private IP"
  type        = string
  default     = ""
}

variable "private_services_connection_id" {
  description = "ID of the private services connection (for dependency ordering)"
  type        = string
  default     = ""
}

variable "require_ssl" {
  description = "Require SSL connections to the database"
  type        = bool
  default     = true
}

variable "authorized_networks" {
  description = "List of authorized networks for public IP access"
  type = list(object({
    name = string
    cidr = string
  }))
  default = []
}

variable "store_password_in_secret_manager" {
  description = "Store the database password in GCP Secret Manager"
  type        = bool
  default     = true
}
