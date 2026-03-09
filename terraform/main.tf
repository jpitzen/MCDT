# Multi-Cloud Root Terraform Configuration
# This demonstrates how to use the multi-cloud module for any provider

terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.30"
    }
    linode = {
      source  = "linode/linode"
      version = "~> 2.0"
    }
  }
}

# AWS Provider
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = var.common_tags
  }
}

# Azure Provider
provider "azurerm" {
  features {}
  skip_provider_registration = true
}

# Google Cloud Provider
provider "google" {
  project = var.gcp_project_id
  region  = var.gcp_region
}

# DigitalOcean Provider
provider "digitalocean" {
  token = var.digitalocean_token
}

# Linode Provider
provider "linode" {
  token = var.linode_token
}

# Multi-Cloud Module
module "kubernetes_cluster" {
  source = "./modules/kubernetes_cluster"

  cloud_provider     = var.cloud_provider
  cluster_name       = var.cluster_name
  kubernetes_version = var.kubernetes_version
  node_count         = var.node_count
  min_node_count     = var.min_node_count
  max_node_count     = var.max_node_count
  enable_autoscaling = var.enable_autoscaling
  node_instance_type = var.node_instance_type
  enable_monitoring  = var.enable_monitoring
  enable_logging     = var.enable_logging

  # AWS-specific
  aws_subnets  = var.aws_subnets
  aws_vpc_cidr = var.aws_vpc_cidr

  # Azure-specific
  azure_location       = var.azure_location
  azure_resource_group = var.azure_resource_group
  azure_subnet_id      = var.azure_subnet_id
  azure_network_policy = var.azure_network_policy
  azure_pod_cidr       = var.azure_pod_cidr
  azure_service_cidr   = var.azure_service_cidr
  azure_dns_service_ip = var.azure_dns_service_ip

  # GCP-specific
  gcp_project_id      = var.gcp_project_id
  gcp_zone            = var.gcp_zone
  gcp_network         = var.gcp_network
  gcp_subnet          = var.gcp_subnet
  gcp_service_account = var.gcp_service_account

  # DigitalOcean-specific
  do_region        = var.do_region
  do_surge_upgrade = var.do_surge_upgrade

  # Linode-specific
  linode_region     = var.linode_region
  linode_tags       = var.linode_tags
  linode_node_pools = var.linode_node_pools

  common_tags = var.common_tags
}
