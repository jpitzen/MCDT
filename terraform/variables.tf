# Multi-cloud root variables

variable "cloud_provider" {
  type        = string
  description = "Cloud provider to deploy to (aws, azure, gcp, digitalocean, linode)"
  validation {
    condition     = contains(["aws", "azure", "gcp", "digitalocean", "linode"], var.cloud_provider)
    error_message = "cloud_provider must be one of: aws, azure, gcp, digitalocean, linode"
  }
}

variable "cluster_name" {
  type        = string
  description = "Name of the Kubernetes cluster"
}

variable "kubernetes_version" {
  type        = string
  description = "Kubernetes version"
  default     = "1.34"
}

variable "node_count" {
  type        = number
  description = "Initial number of nodes"
  default     = 3
}

variable "min_node_count" {
  type        = number
  description = "Minimum nodes (autoscaling)"
  default     = 1
}

variable "max_node_count" {
  type        = number
  description = "Maximum nodes (autoscaling)"
  default     = 5
}

variable "enable_autoscaling" {
  type        = bool
  description = "Enable autoscaling"
  default     = true
}

variable "node_instance_type" {
  type        = string
  description = "Instance type for nodes"
  default     = "t3.medium"
}

variable "enable_monitoring" {
  type        = bool
  description = "Enable monitoring"
  default     = true
}

variable "enable_logging" {
  type        = bool
  description = "Enable logging"
  default     = true
}

# AWS-specific
variable "aws_region" {
  type        = string
  description = "AWS region"
  default     = "us-east-1"
}

variable "aws_subnets" {
  type        = list(string)
  description = "AWS subnet IDs"
  default     = []
}

variable "aws_vpc_cidr" {
  type        = string
  description = "AWS VPC CIDR"
  default     = "10.0.0.0/16"
}

# Azure-specific
variable "azure_location" {
  type        = string
  description = "Azure region"
  default     = "eastus"
}

variable "azure_resource_group" {
  type        = string
  description = "Azure resource group"
  default     = ""
}

variable "azure_subnet_id" {
  type        = string
  description = "Azure subnet ID"
  default     = ""
}

variable "azure_network_policy" {
  type        = string
  description = "Azure network policy"
  default     = "azure"
}

variable "azure_pod_cidr" {
  type        = string
  description = "Pod CIDR for Azure"
  default     = "10.244.0.0/16"
}

variable "azure_service_cidr" {
  type        = string
  description = "Service CIDR for Azure"
  default     = "10.0.0.0/16"
}

variable "azure_dns_service_ip" {
  type        = string
  description = "DNS service IP for Azure"
  default     = "10.0.0.10"
}

# GCP-specific
variable "gcp_project_id" {
  type        = string
  description = "GCP project ID"
  default     = ""
}

variable "gcp_region" {
  type        = string
  description = "GCP region"
  default     = "us-central1"
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

variable "gcp_service_account" {
  type        = string
  description = "GCP service account"
  default     = ""
}

# DigitalOcean-specific
variable "do_region" {
  type        = string
  description = "DigitalOcean region"
  default     = "nyc3"
}

variable "do_surge_upgrade" {
  type        = bool
  description = "Enable surge upgrade"
  default     = true
}

variable "digitalocean_token" {
  type        = string
  description = "DigitalOcean API token"
  sensitive   = true
  default     = ""
}

# Linode-specific
variable "linode_region" {
  type        = string
  description = "Linode region"
  default     = "us-east"
}

variable "linode_tags" {
  type        = list(string)
  description = "Linode tags"
  default     = []
}

variable "linode_node_pools" {
  type = list(object({
    type  = string
    count = number
  }))
  description = "Linode node pools"
  default = [
    {
      type  = "g6-standard-2"
      count = 3
    }
  ]
}

variable "linode_token" {
  type        = string
  description = "Linode API token"
  sensitive   = true
  default     = ""
}

# Common
variable "common_tags" {
  type        = map(string)
  description = "Common tags"
  default     = {}
}
