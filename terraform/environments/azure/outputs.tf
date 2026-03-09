# =============================================================================
# Azure AKS Outputs
# =============================================================================

output "cluster_name" {
  description = "AKS cluster name"
  value       = azurerm_kubernetes_cluster.main.name
}

output "cluster_endpoint" {
  description = "AKS cluster API server endpoint"
  value       = azurerm_kubernetes_cluster.main.kube_config[0].host
  sensitive   = true
}

output "cluster_ca_certificate" {
  description = "AKS cluster CA certificate (base64)"
  value       = azurerm_kubernetes_cluster.main.kube_config[0].cluster_ca_certificate
  sensitive   = true
}

output "kube_config_raw" {
  description = "Raw kubeconfig for the AKS cluster"
  value       = azurerm_kubernetes_cluster.main.kube_config_raw
  sensitive   = true
}

output "node_resource_group" {
  description = "Auto-generated resource group for AKS node resources"
  value       = azurerm_kubernetes_cluster.main.node_resource_group
}

output "acr_login_server" {
  description = "ACR login server URL (empty if ACR is disabled)"
  value       = var.enable_container_registry ? azurerm_container_registry.main[0].login_server : ""
}

output "storage_share_name" {
  description = "Azure Files share name (empty if file storage is disabled)"
  value       = var.enable_file_storage && !var.enable_blob_storage ? azurerm_storage_share.main[0].name : var.enable_blob_storage && var.enable_file_storage ? module.storage[0].file_share_name : ""
}

# =============================================================================
# VNet Outputs
# =============================================================================

output "vnet_id" {
  description = "VNet ID (empty if VNet not created)"
  value       = var.create_vnet ? module.vnet[0].vnet_id : ""
}

output "aks_subnet_id" {
  description = "AKS subnet ID"
  value       = local.aks_subnet_id
}

output "db_subnet_id" {
  description = "Database subnet ID"
  value       = local.db_subnet_id
}

# =============================================================================
# Database Outputs
# =============================================================================

output "db_endpoint" {
  description = "Database server endpoint (empty if database is disabled)"
  value       = var.enable_database ? module.database[0].db_endpoint : ""
}

output "db_port" {
  description = "Database port (empty if database is disabled)"
  value       = var.enable_database ? module.database[0].db_port : ""
}

output "db_name" {
  description = "Database name (empty if database is disabled)"
  value       = var.enable_database ? module.database[0].db_name : ""
}

output "db_connection_string" {
  description = "Database connection string (empty if database is disabled)"
  value       = var.enable_database ? module.database[0].connection_string : ""
  sensitive   = true
}

# =============================================================================
# Blob Storage Outputs
# =============================================================================

output "storage_account_name" {
  description = "Storage account name (empty if blob storage is disabled)"
  value       = var.enable_blob_storage ? module.storage[0].storage_account_name : ""
}

output "blob_endpoint" {
  description = "Primary blob endpoint (empty if blob storage is disabled)"
  value       = var.enable_blob_storage ? module.storage[0].primary_blob_endpoint : ""
}
