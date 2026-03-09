# =============================================================================
# GCP VPC Module Variables
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
  description = "Enable Cloud NAT for outbound internet from private subnet"
  type        = bool
  default     = true
}

variable "enable_private_service_access" {
  description = "Enable private service access for Cloud SQL, Filestore, etc."
  type        = bool
  default     = true
}
