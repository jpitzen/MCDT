# Input variables for multi-cloud Kubernetes cluster module

variable "cloud_provider" {
  type        = string
  description = "Cloud provider (aws, azure, gcp, digitalocean, linode)"
  validation {
    condition     = contains(["aws", "azure", "gcp", "digitalocean", "linode"], var.cloud_provider)
    error_message = "cloud_provider must be one of: aws, azure, gcp, digitalocean, linode"
  }
}

variable "cluster_name" {
  type        = string
  description = "Name of the Kubernetes cluster"
  validation {
    condition     = length(var.cluster_name) >= 1 && length(var.cluster_name) <= 100
    error_message = "cluster_name must be between 1 and 100 characters"
  }
}

variable "kubernetes_version" {
  type        = string
  description = "Kubernetes version (e.g., 1.31, 1.32, 1.33, 1.34)"
  default     = "1.34"
}

variable "node_count" {
  type        = number
  description = "Initial number of nodes"
  default     = 3
  validation {
    condition     = var.node_count >= 1 && var.node_count <= 100
    error_message = "node_count must be between 1 and 100"
  }
}

variable "min_node_count" {
  type        = number
  description = "Minimum number of nodes (when autoscaling enabled)"
  default     = 1
}

variable "max_node_count" {
  type        = number
  description = "Maximum number of nodes (when autoscaling enabled)"
  default     = 5
}

variable "enable_autoscaling" {
  type        = bool
  description = "Enable cluster autoscaling"
  default     = true
}

variable "node_instance_type" {
  type        = string
  description = "Instance type for worker nodes (cloud-specific)"
  default     = "t3.medium"
}

variable "enable_monitoring" {
  type        = bool
  description = "Enable monitoring and metrics collection"
  default     = true
}

variable "enable_logging" {
  type        = bool
  description = "Enable centralized logging"
  default     = true
}

variable "common_tags" {
  type        = map(string)
  description = "Common tags to apply to all resources"
  default     = {}
}

# ============================================================================
# AWS-specific variables
# ============================================================================

variable "aws_subnets" {
  type        = list(string)
  description = "AWS subnet IDs for the cluster"
  default     = []
}

variable "aws_vpc_cidr" {
  type        = string
  description = "CIDR block for AWS VPC"
  default     = "10.0.0.0/16"
}

variable "aws_region" {
  type        = string
  description = "AWS region for EKS cluster"
  default     = "us-east-1"
}

variable "aws_vpc_id" {
  type        = string
  description = "AWS VPC ID (required for ALB Controller)"
  default     = ""
}

# S3 CSI Driver (Task 5.1)
variable "enable_s3_csi" {
  type        = bool
  description = "Enable Mountpoint for Amazon S3 CSI Driver addon"
  default     = true
}

# ALB Controller (Task 5.2)
variable "enable_alb_controller" {
  type        = bool
  description = "Enable AWS Load Balancer Controller via Helm"
  default     = false
}

variable "alb_controller_chart_version" {
  type        = string
  description = "Helm chart version for AWS Load Balancer Controller"
  default     = "1.7.2"
}

# Cluster Autoscaler (Task 5.3)
variable "enable_cluster_autoscaler" {
  type        = bool
  description = "Enable Cluster Autoscaler Helm deployment"
  default     = false
}

variable "cluster_autoscaler_chart_version" {
  type        = string
  description = "Helm chart version for Cluster Autoscaler"
  default     = "9.37.0"
}

# ============================================================================
# Azure-specific variables
# ============================================================================

variable "azure_location" {
  type        = string
  description = "Azure region/location"
  default     = "eastus"
}

variable "azure_resource_group" {
  type        = string
  description = "Azure resource group name"
  default     = ""
}

variable "azure_subnet_id" {
  type        = string
  description = "Azure subnet ID"
  default     = ""
}

variable "azure_network_policy" {
  type        = string
  description = "Azure network policy (azure or calico)"
  default     = "azure"
}

variable "azure_pod_cidr" {
  type        = string
  description = "CIDR for pod networking"
  default     = "10.244.0.0/16"
}

variable "azure_service_cidr" {
  type        = string
  description = "CIDR for service networking"
  default     = "10.0.0.0/16"
}

variable "azure_dns_service_ip" {
  type        = string
  description = "DNS service IP"
  default     = "10.0.0.10"
}

# ============================================================================
# GCP-specific variables
# ============================================================================

variable "gcp_project_id" {
  type        = string
  description = "GCP project ID"
  default     = ""
}

variable "gcp_zone" {
  type        = string
  description = "GCP zone"
  default     = "us-central1-a"
}

variable "gcp_network" {
  type        = string
  description = "GCP VPC network"
  default     = "default"
}

variable "gcp_subnet" {
  type        = string
  description = "GCP subnet"
  default     = ""
}

variable "gcp_oauth_scopes" {
  type        = list(string)
  description = "GCP OAuth scopes for nodes"
  default = [
    "https://www.googleapis.com/auth/compute",
    "https://www.googleapis.com/auth/devstorage.read_only",
    "https://www.googleapis.com/auth/logging.write",
    "https://www.googleapis.com/auth/monitoring",
  ]
}

variable "gcp_service_account" {
  type        = string
  description = "GCP service account for nodes"
  default     = ""
}

# ============================================================================
# DigitalOcean-specific variables
# ============================================================================

variable "do_region" {
  type        = string
  description = "DigitalOcean region"
  default     = "nyc3"
}

variable "do_surge_upgrade" {
  type        = bool
  description = "Enable surge upgrade for DigitalOcean"
  default     = true
}

# ============================================================================
# Linode-specific variables
# ============================================================================

variable "linode_region" {
  type        = string
  description = "Linode region"
  default     = "us-east"
}

variable "linode_tags" {
  type        = list(string)
  description = "Tags for Linode resources"
  default     = []
}

variable "linode_node_pools" {
  type = list(object({
    type  = string
    count = number
  }))
  description = "Linode node pool configuration"
  default = [
    {
      type  = "g6-standard-2"
      count = 3
    }
  ]
}

# ---------------------------------------------------------------------------
# Phase 6 — Security & IAM
# ---------------------------------------------------------------------------

variable "enable_security_scanning" {
  type        = bool
  description = "Enable Amazon Inspector v2 for ECR image scanning"
  default     = false
}

variable "create_iam_user" {
  type        = bool
  description = "Create an IAM user with least-privilege EKS/ECR/S3 permissions for CI/CD"
  default     = false
}
