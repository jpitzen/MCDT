# =============================================================================
# Azure Storage Module Outputs
# =============================================================================

output "storage_account_id" {
  description = "Storage Account ID"
  value       = azurerm_storage_account.main.id
}

output "storage_account_name" {
  description = "Storage Account name"
  value       = azurerm_storage_account.main.name
}

output "primary_blob_endpoint" {
  description = "Primary Blob endpoint URL"
  value       = azurerm_storage_account.main.primary_blob_endpoint
}

output "primary_file_endpoint" {
  description = "Primary File endpoint URL"
  value       = azurerm_storage_account.main.primary_file_endpoint
}

output "primary_access_key" {
  description = "Primary access key for the storage account"
  value       = azurerm_storage_account.main.primary_access_key
  sensitive   = true
}

output "container_name" {
  description = "Blob container name"
  value       = azurerm_storage_container.main.name
}

output "archive_container_name" {
  description = "Archive blob container name (empty if disabled)"
  value       = var.enable_archive_container ? azurerm_storage_container.archive[0].name : ""
}

output "file_share_name" {
  description = "Azure Files share name (empty if disabled)"
  value       = var.enable_file_share ? azurerm_storage_share.main[0].name : ""
}

output "file_share_url" {
  description = "Azure Files share URL (empty if disabled)"
  value       = var.enable_file_share ? azurerm_storage_share.main[0].url : ""
}
