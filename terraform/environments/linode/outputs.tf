# =============================================================================
# Linode LKE Outputs
# =============================================================================

output "cluster_name" {
  description = "LKE cluster label"
  value       = linode_lke_cluster.main.label
}

output "cluster_id" {
  description = "LKE cluster numeric ID"
  value       = linode_lke_cluster.main.id
}

output "kube_config_raw" {
  description = "Raw kubeconfig for the LKE cluster (base64)"
  value       = linode_lke_cluster.main.kubeconfig
  sensitive   = true
}

output "api_endpoints" {
  description = "LKE API server endpoints"
  value       = linode_lke_cluster.main.api_endpoints
}

output "object_bucket_name" {
  description = "Object Storage bucket label (empty if object storage is disabled)"
  value       = var.enable_object_storage ? linode_object_storage_bucket.main[0].label : ""
}

# =============================================================================
# VPC Outputs
# =============================================================================

output "vpc_id" {
  description = "VPC ID (empty if VPC not created)"
  value       = var.create_vpc ? linode_vpc.main[0].id : ""
}

output "vpc_subnet_id" {
  description = "VPC subnet ID (empty if VPC not created)"
  value       = var.create_vpc ? linode_vpc_subnet.main[0].id : ""
}

# =============================================================================
# Database Outputs
# =============================================================================

output "db_endpoint" {
  description = "Database host address (empty if database is disabled)"
  value       = var.enable_database ? module.database[0].db_endpoint : ""
}

output "db_port" {
  description = "Database port (empty if database is disabled)"
  value       = var.enable_database ? module.database[0].db_port : ""
}

output "db_username" {
  description = "Database username (empty if database is disabled)"
  value       = var.enable_database ? module.database[0].db_username : ""
}

output "db_status" {
  description = "Database status (empty if database is disabled)"
  value       = var.enable_database ? module.database[0].db_status : ""
}
