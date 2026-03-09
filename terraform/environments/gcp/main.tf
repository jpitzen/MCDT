terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project     = var.project_id
  region      = var.region
  credentials = var.service_account_key != "" ? var.service_account_key : null
}

# =============================================================================
# VPC Module (conditional)
# =============================================================================
module "vpc" {
  source = "../../modules/gcp_vpc"
  count  = var.create_vpc ? 1 : 0

  cluster_name                  = var.cluster_name
  project_id                    = var.project_id
  region                        = var.region
  public_subnet_cidr            = var.public_subnet_cidr
  private_subnet_cidr           = var.private_subnet_cidr
  pods_cidr                     = var.pods_cidr
  services_cidr                 = var.services_cidr
  enable_cloud_nat              = var.enable_cloud_nat
  enable_private_service_access = var.enable_private_service_access
}

locals {
  network    = var.create_vpc ? module.vpc[0].vpc_name : var.gke_network
  subnetwork = var.create_vpc ? module.vpc[0].private_subnet_name : var.gke_subnetwork
  vpc_self_link = var.create_vpc ? module.vpc[0].vpc_self_link : ""
}

# =============================================================================
# GKE Cluster
# =============================================================================
resource "google_container_cluster" "main" {
  name     = var.cluster_name
  location = var.region

  remove_default_node_pool = true
  initial_node_count       = 1

  network    = local.network
  subnetwork = local.subnetwork

  dynamic "ip_allocation_policy" {
    for_each = var.create_vpc ? [1] : []
    content {
      cluster_secondary_range_name  = module.vpc[0].pods_range_name
      services_secondary_range_name = module.vpc[0].services_range_name
    }
  }

  logging_service    = var.enable_stackdriver_logging ? "logging.googleapis.com/kubernetes" : "none"
  monitoring_service = var.enable_stackdriver_monitoring ? "monitoring.googleapis.com/kubernetes" : "none"

  min_master_version = var.kubernetes_version
}

resource "google_container_node_pool" "main" {
  name       = "${var.cluster_name}-nodes"
  cluster    = google_container_cluster.main.name
  location   = var.region
  node_count = var.enable_autoscaling ? null : var.node_count

  dynamic "autoscaling" {
    for_each = var.enable_autoscaling ? [1] : []
    content {
      min_node_count = var.min_node_count
      max_node_count = var.max_node_count
    }
  }

  node_config {
    machine_type = var.machine_type
    disk_size_gb = var.disk_size_gb
    oauth_scopes = ["https://www.googleapis.com/auth/cloud-platform"]
    labels       = var.common_labels
  }
}

# GCS bucket for object storage
resource "google_storage_bucket" "main" {
  count         = var.enable_object_storage ? 1 : 0
  name          = var.gcs_bucket_name != "" ? var.gcs_bucket_name : "${var.project_id}-${var.cluster_name}-storage"
  location      = var.region
  force_destroy = var.gcs_force_destroy
  labels        = var.common_labels
}

# Artifact Registry (container images)
resource "google_artifact_registry_repository" "main" {
  count         = var.enable_container_registry ? 1 : 0
  location      = var.region
  repository_id = var.cluster_name
  format        = "DOCKER"
  labels        = var.common_labels
}

# GCP Managed SSL Certificate
resource "google_compute_managed_ssl_certificate" "main" {
  count = var.enable_managed_certificate ? 1 : 0
  name  = var.gcp_managed_certificate_name != "" ? var.gcp_managed_certificate_name : "${var.cluster_name}-cert"

  managed {
    domains = var.gcp_managed_certificate_domains
  }
}

# =============================================================================
# Cloud SQL Database Module (conditional)
# =============================================================================
module "database" {
  source = "../../modules/gcp_db"
  count  = var.enable_database ? 1 : 0

  cluster_name                   = var.cluster_name
  project_id                     = var.project_id
  region                         = var.region
  db_engine                      = var.db_engine
  db_name                        = var.db_name
  db_version                     = var.db_version
  db_tier                        = var.db_tier
  db_disk_size_gb                = var.db_disk_size_gb
  db_username                    = var.db_username
  db_password                    = var.db_password
  db_backup_retention_days       = var.db_backup_retention_days
  db_high_availability           = var.db_high_availability
  enable_private_ip              = var.enable_private_service_access
  vpc_self_link                  = local.vpc_self_link
  private_services_connection_id = var.create_vpc && var.enable_private_service_access ? module.vpc[0].private_services_connection_id : ""
  deletion_protection            = var.db_deletion_protection
}

# =============================================================================
# Filestore Module (conditional)
# =============================================================================
module "filestore" {
  source = "../../modules/gcp_filestore"
  count  = var.enable_filestore ? 1 : 0

  cluster_name                  = var.cluster_name
  project_id                    = var.project_id
  zone                          = "${var.region}-a"
  filestore_tier                = var.filestore_tier
  share_name                    = var.filestore_share_name
  capacity_gb                   = var.filestore_capacity_gb
  vpc_name                      = var.create_vpc ? module.vpc[0].vpc_name : var.gke_network
  enable_private_service_access = var.enable_private_service_access
}
