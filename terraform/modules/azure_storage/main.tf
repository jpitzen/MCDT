# =============================================================================
# Azure Storage Module
# Provisions Storage Account, Blob Container, Lifecycle Management
# Equivalent of AWS S3 module (terraform/modules/aws_s3/)
# =============================================================================

# -----------------------------------------------------------------------------
# Storage Account (foundation for Blob + Files)
# -----------------------------------------------------------------------------
resource "azurerm_storage_account" "main" {
  name                     = replace(substr("${var.cluster_name}stor", 0, 24), "-", "")
  resource_group_name      = var.resource_group_name
  location                 = var.region
  account_tier             = var.storage_tier
  account_replication_type = var.replication_type
  account_kind             = "StorageV2"
  access_tier              = "Hot"

  blob_properties {
    versioning_enabled = var.enable_versioning

    dynamic "delete_retention_policy" {
      for_each = var.blob_soft_delete_days > 0 ? [1] : []
      content {
        days = var.blob_soft_delete_days
      }
    }

    dynamic "container_delete_retention_policy" {
      for_each = var.container_soft_delete_days > 0 ? [1] : []
      content {
        days = var.container_soft_delete_days
      }
    }
  }

  tags = var.common_tags
}

# -----------------------------------------------------------------------------
# Blob Container (equivalent of S3 bucket)
# -----------------------------------------------------------------------------
resource "azurerm_storage_container" "main" {
  name                  = var.container_name != "" ? var.container_name : "${var.cluster_name}-data"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "private"
}

# Archive container for cold/archive storage
resource "azurerm_storage_container" "archive" {
  count                 = var.enable_archive_container ? 1 : 0
  name                  = "${var.cluster_name}-archive"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "private"
}

# -----------------------------------------------------------------------------
# Lifecycle Management Policy (equivalent of S3 lifecycle rules)
# -----------------------------------------------------------------------------
resource "azurerm_storage_management_policy" "main" {
  count              = var.enable_lifecycle_policy ? 1 : 0
  storage_account_id = azurerm_storage_account.main.id

  # Move to Cool tier after specified days
  rule {
    name    = "move-to-cool"
    enabled = true
    filters {
      blob_types   = ["blockBlob"]
      prefix_match = var.lifecycle_prefix_filter
    }
    actions {
      base_blob {
        tier_to_cool_after_days_since_modification_greater_than = var.days_to_cool_tier
      }
    }
  }

  # Move to Archive tier after specified days
  dynamic "rule" {
    for_each = var.days_to_archive_tier > 0 ? [1] : []
    content {
      name    = "move-to-archive"
      enabled = true
      filters {
        blob_types   = ["blockBlob"]
        prefix_match = var.lifecycle_prefix_filter
      }
      actions {
        base_blob {
          tier_to_archive_after_days_since_modification_greater_than = var.days_to_archive_tier
        }
      }
    }
  }

  # Delete after specified days
  dynamic "rule" {
    for_each = var.days_to_delete > 0 ? [1] : []
    content {
      name    = "delete-old-blobs"
      enabled = true
      filters {
        blob_types   = ["blockBlob"]
        prefix_match = var.lifecycle_prefix_filter
      }
      actions {
        base_blob {
          delete_after_days_since_modification_greater_than = var.days_to_delete
        }
      }
    }
  }
}

# -----------------------------------------------------------------------------
# Azure Files Share (equivalent of EFS — ReadWriteMany shared storage)
# -----------------------------------------------------------------------------
resource "azurerm_storage_share" "main" {
  count                = var.enable_file_share ? 1 : 0
  name                 = "${var.cluster_name}-share"
  storage_account_name = azurerm_storage_account.main.name
  quota                = var.file_share_quota_gb
  access_tier          = var.file_share_tier
}
