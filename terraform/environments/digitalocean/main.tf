terraform {
  required_version = ">= 1.0"
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.0"
    }
  }
}

provider "digitalocean" {
  token = var.do_token
}

# =============================================================================
# VPC (conditional)
# =============================================================================
resource "digitalocean_vpc" "main" {
  count       = var.create_vpc ? 1 : 0
  name        = "${var.cluster_name}-vpc"
  region      = var.region
  ip_range    = var.vpc_cidr
  description = "VPC for ${var.cluster_name} DOKS cluster"
}

locals {
  vpc_id = var.create_vpc ? digitalocean_vpc.main[0].id : var.existing_vpc_id
}

# =============================================================================
# DOKS Cluster
# =============================================================================
resource "digitalocean_kubernetes_cluster" "main" {
  name    = var.cluster_name
  region  = var.region
  version = var.cluster_version
  vpc_uuid = local.vpc_id != "" ? local.vpc_id : null

  node_pool {
    name       = "${var.cluster_name}-pool"
    size       = var.node_size
    node_count = var.enable_autoscaling ? null : var.node_count
    auto_scale = var.enable_autoscaling
    min_nodes  = var.enable_autoscaling ? var.min_node_count : null
    max_nodes  = var.enable_autoscaling ? var.max_node_count : null
    tags       = [for k, v in var.common_tags : "${k}:${v}"]
  }

  surge_upgrade = var.surge_upgrade
  tags          = [for k, v in var.common_tags : "${k}:${v}"]
}

# DigitalOcean Container Registry
resource "digitalocean_container_registry" "main" {
  count                  = var.enable_container_registry ? 1 : 0
  name                   = var.registry_name != "" ? var.registry_name : var.cluster_name
  subscription_tier_slug = var.registry_tier
  region                 = var.region
}

# Registry Docker credentials for cluster integration
resource "digitalocean_container_registry_docker_credentials" "main" {
  count         = var.enable_container_registry ? 1 : 0
  registry_name = digitalocean_container_registry.main[0].name
}

# DigitalOcean Spaces (S3-compatible object storage)
resource "digitalocean_spaces_bucket" "main" {
  count  = var.enable_object_storage ? 1 : 0
  name   = var.spaces_bucket_name != "" ? var.spaces_bucket_name : "${var.cluster_name}-storage"
  region = var.region
  acl    = "private"
}

# DigitalOcean Managed SSL Certificate
resource "digitalocean_certificate" "main" {
  count  = var.enable_ssl_certificate && length(var.do_certificate_domains) > 0 ? 1 : 0
  name   = var.do_certificate_name != "" ? var.do_certificate_name : "${var.cluster_name}-cert"
  type   = var.do_certificate_type

  # For lets_encrypt type: domains is required, private_key/leaf_certificate not used
  domains = var.do_certificate_type == "lets_encrypt" ? var.do_certificate_domains : null
}

# =============================================================================
# Managed Database Module (conditional)
# =============================================================================
module "database" {
  source = "../../modules/do_db"
  count  = var.enable_database ? 1 : 0

  cluster_name           = var.cluster_name
  region                 = var.region
  db_engine              = var.db_engine
  db_name                = var.db_name
  db_version             = var.db_version
  db_size                = var.db_size
  db_node_count          = var.db_node_count
  db_username            = var.db_username
  vpc_id                 = local.vpc_id
  k8s_cluster_id         = digitalocean_kubernetes_cluster.main.id
  enable_connection_pool = var.enable_connection_pool
}
