terraform {
  required_version = ">= 1.0"
  required_providers {
    linode = {
      source  = "linode/linode"
      version = "~> 2.0"
    }
  }
}

provider "linode" {
  token = var.linode_token
}

# =============================================================================
# VPC (conditional)
# =============================================================================
resource "linode_vpc" "main" {
  count       = var.create_vpc ? 1 : 0
  label       = "${var.cluster_name}-vpc"
  region      = var.region
  description = "VPC for ${var.cluster_name} LKE cluster"
}

resource "linode_vpc_subnet" "main" {
  count  = var.create_vpc ? 1 : 0
  vpc_id = linode_vpc.main[0].id
  label  = "${var.cluster_name}-subnet"
  ipv4   = var.vpc_subnet_cidr
}

# =============================================================================
# LKE Cluster
# =============================================================================
resource "linode_lke_cluster" "main" {
  label       = var.cluster_name
  region      = var.region
  k8s_version = var.cluster_version

  pool {
    type  = var.node_type
    count = var.node_count

    dynamic "autoscaler" {
      for_each = var.enable_autoscaling ? [1] : []
      content {
        min = var.min_node_count
        max = var.max_node_count
      }
    }
  }

  control_plane {
    high_availability = var.ha_controlplane
  }

  tags = [for k, v in var.common_tags : "${k}=${v}"]
}

# Linode Object Storage bucket
resource "linode_object_storage_bucket" "main" {
  count   = var.enable_object_storage ? 1 : 0
  cluster = "${var.region}-1"
  label   = var.object_bucket_name != "" ? var.object_bucket_name : "${var.cluster_name}-storage"
}

# Linode Object Storage key
resource "linode_object_storage_key" "main" {
  count = var.enable_object_storage ? 1 : 0
  label = "${var.cluster_name}-storage-key"
}

# =============================================================================
# Managed Database Module (conditional)
# =============================================================================
module "database" {
  source = "../../modules/linode_db"
  count  = var.enable_database ? 1 : 0

  cluster_name     = var.cluster_name
  region           = var.region
  db_engine        = var.db_engine
  db_version       = var.db_version
  db_type          = var.db_type
  db_cluster_size  = var.db_cluster_size
  db_encrypted     = var.db_encrypted
  require_ssl      = var.db_require_ssl
  allow_list       = var.db_allow_list
}
