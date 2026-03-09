# =============================================================================
# GCP GKE Variables
# =============================================================================

variable "cluster_name" {
  description = "Name of the GKE cluster"
  type        = string
}

variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region for the cluster"
  type        = string
  default     = "us-central1"
}

variable "kubernetes_version" {
  description = "Kubernetes version for the GKE cluster"
  type        = string
  default     = "1.28"
}

variable "node_count" {
  description = "Number of nodes per zone in the node pool"
  type        = number
  default     = 3
}

variable "machine_type" {
  description = "GCE machine type for nodes"
  type        = string
  default     = "e2-medium"
}

variable "disk_size_gb" {
  description = "Boot disk size in GB for nodes"
  type        = number
  default     = 50
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

# =============================================================================
# Networking
# =============================================================================

variable "create_vpc" {
  description = "Create a new VPC with subnets, Cloud NAT, and firewall rules"
  type        = bool
  default     = true
}

variable "public_subnet_cidr" {
  description = "CIDR for the public subnet"
  type        = string
  default     = "10.2.1.0/24"
}

variable "private_subnet_cidr" {
  description = "CIDR for the private subnet (GKE nodes)"
  type        = string
  default     = "10.2.10.0/24"
}

variable "pods_cidr" {
  description = "Secondary CIDR for GKE pods"
  type        = string
  default     = "10.4.0.0/14"
}

variable "services_cidr" {
  description = "Secondary CIDR for GKE services"
  type        = string
  default     = "10.8.0.0/20"
}

variable "enable_cloud_nat" {
  description = "Enable Cloud NAT for outbound internet"
  type        = bool
  default     = true
}

variable "enable_private_service_access" {
  description = "Enable private service access for Cloud SQL, Filestore, etc."
  type        = bool
  default     = true
}

variable "gke_network" {
  description = "VPC network for the GKE cluster"
  type        = string
  default     = "default"
}

variable "gke_subnetwork" {
  description = "VPC subnetwork for the GKE cluster"
  type        = string
  default     = "default"
}

# =============================================================================
# Authentication
# =============================================================================

variable "service_account_key" {
  description = "GCP service account key JSON (empty to use application default credentials)"
  type        = string
  default     = ""
  sensitive   = true
}

# =============================================================================
# Monitoring
# =============================================================================

variable "enable_stackdriver_logging" {
  description = "Enable Stackdriver/Cloud Logging integration"
  type        = bool
  default     = true
}

variable "enable_stackdriver_monitoring" {
  description = "Enable Stackdriver/Cloud Monitoring integration"
  type        = bool
  default     = true
}

# =============================================================================
# Object Storage
# =============================================================================

variable "enable_object_storage" {
  description = "Enable GCS bucket creation"
  type        = bool
  default     = false
}

variable "gcs_bucket_name" {
  description = "GCS bucket name (if empty, derived from project_id and cluster_name)"
  type        = string
  default     = ""
}

variable "gcs_force_destroy" {
  description = "Allow Terraform to delete the GCS bucket even if it contains objects"
  type        = bool
  default     = false
}

# =============================================================================
# Container Registry
# =============================================================================

variable "enable_container_registry" {
  description = "Enable Artifact Registry for Docker images"
  type        = bool
  default     = false
}

# =============================================================================
# SSL / Certificates
# =============================================================================

variable "enable_managed_certificate" {
  description = "Enable GCP Managed SSL Certificate"
  type        = bool
  default     = false
}

variable "gcp_managed_certificate_name" {
  description = "Name for the GCP Managed SSL Certificate (empty to skip)"
  type        = string
  default     = ""
}

variable "gcp_managed_certificate_domains" {
  description = "Domains for the GCP Managed SSL Certificate"
  type        = list(string)
  default     = []
}

# =============================================================================
# Metadata
# =============================================================================

variable "common_labels" {
  description = "Common labels applied to all resources"
  type        = map(string)
  default     = {}
}

# =============================================================================
# Database (Cloud SQL)
# =============================================================================

variable "enable_database" {
  description = "Enable Cloud SQL managed database"
  type        = bool
  default     = false
}

variable "db_engine" {
  description = "Database engine: postgresql, mysql, or sqlserver"
  type        = string
  default     = "postgresql"
}

variable "db_name" {
  description = "Name of the database to create"
  type        = string
  default     = "zlaws_db"
}

variable "db_version" {
  description = "Cloud SQL database version (e.g., POSTGRES_15). Empty = auto-select."
  type        = string
  default     = ""
}

variable "db_tier" {
  description = "Cloud SQL machine tier (e.g., db-custom-2-7680). Empty = auto-select."
  type        = string
  default     = ""
}

variable "db_disk_size_gb" {
  description = "Database disk size in GB"
  type        = number
  default     = 20
}

variable "db_username" {
  description = "Database admin username"
  type        = string
  default     = "zlaws_admin"
}

variable "db_password" {
  description = "Database admin password (empty = auto-generate)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "db_backup_retention_days" {
  description = "Number of days to retain database backups"
  type        = number
  default     = 7
}

variable "db_high_availability" {
  description = "Enable high availability (REGIONAL)"
  type        = bool
  default     = false
}

variable "db_deletion_protection" {
  description = "Enable deletion protection on Cloud SQL instance"
  type        = bool
  default     = true
}

# =============================================================================
# Filestore
# =============================================================================

variable "enable_filestore" {
  description = "Enable GCP Filestore for NFS storage"
  type        = bool
  default     = false
}

variable "filestore_tier" {
  description = "Filestore tier: BASIC_HDD, BASIC_SSD, HIGH_SCALE_SSD, ENTERPRISE"
  type        = string
  default     = "BASIC_HDD"
}

variable "filestore_share_name" {
  description = "File share name"
  type        = string
  default     = "zlaws_share"
}

variable "filestore_capacity_gb" {
  description = "Filestore capacity in GB (min 1024)"
  type        = number
  default     = 1024
}
