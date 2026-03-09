# =============================================================================
# DigitalOcean DOKS Outputs
# =============================================================================

output "cluster_name" {
  description = "DOKS cluster name"
  value       = digitalocean_kubernetes_cluster.main.name
}

output "cluster_endpoint" {
  description = "DOKS cluster API server endpoint"
  value       = digitalocean_kubernetes_cluster.main.endpoint
  sensitive   = true
}

output "kube_config_raw" {
  description = "Raw kubeconfig for the DOKS cluster"
  value       = digitalocean_kubernetes_cluster.main.kube_config[0].raw_config
  sensitive   = true
}

output "registry_endpoint" {
  description = "Container registry server URL (empty if registry is disabled)"
  value       = var.enable_container_registry ? digitalocean_container_registry.main[0].server_url : ""
}

output "spaces_bucket_name" {
  description = "Spaces bucket name (empty if object storage is disabled)"
  value       = var.enable_object_storage ? digitalocean_spaces_bucket.main[0].name : ""
}

# =============================================================================
# VPC Outputs
# =============================================================================

output "vpc_id" {
  description = "VPC UUID (empty if VPC not created)"
  value       = var.create_vpc ? digitalocean_vpc.main[0].id : ""
}

output "vpc_urn" {
  description = "VPC URN (empty if VPC not created)"
  value       = var.create_vpc ? digitalocean_vpc.main[0].urn : ""
}

# =============================================================================
# Database Outputs
# =============================================================================

output "db_endpoint" {
  description = "Database hostname (empty if database is disabled)"
  value       = var.enable_database ? module.database[0].db_endpoint : ""
}

output "db_private_endpoint" {
  description = "Database private hostname (empty if database is disabled)"
  value       = var.enable_database ? module.database[0].db_private_endpoint : ""
}

output "db_port" {
  description = "Database port (empty if database is disabled)"
  value       = var.enable_database ? module.database[0].db_port : ""
}

output "db_name" {
  description = "Database name (empty if database is disabled)"
  value       = var.enable_database ? module.database[0].db_name : ""
}

output "db_uri" {
  description = "Database connection URI (empty if database is disabled)"
  value       = var.enable_database ? module.database[0].db_uri : ""
  sensitive   = true
}
