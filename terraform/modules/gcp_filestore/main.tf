# =============================================================================
# GCP Filestore Module
# Managed NFS file storage for GKE workloads
# =============================================================================

terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

# -----------------------------------------------------------------------------
# Filestore Instance
# -----------------------------------------------------------------------------
resource "google_filestore_instance" "main" {
  name     = "${var.cluster_name}-filestore"
  project  = var.project_id
  location = var.zone
  tier     = var.filestore_tier

  file_shares {
    name       = var.share_name
    capacity_gb = var.capacity_gb

    dynamic "nfs_export_options" {
      for_each = var.nfs_export_options != null ? [var.nfs_export_options] : []
      content {
        ip_ranges   = nfs_export_options.value.ip_ranges
        access_mode = nfs_export_options.value.access_mode
        squash_mode = nfs_export_options.value.squash_mode
      }
    }
  }

  networks {
    network           = var.vpc_name
    modes             = ["MODE_IPV4"]
    reserved_ip_range = var.reserved_ip_range
    connect_mode      = var.enable_private_service_access ? "PRIVATE_SERVICE_ACCESS" : "DIRECT_PEERING"
  }

  labels = {
    cluster    = var.cluster_name
    managed_by = "zlaws"
  }
}
