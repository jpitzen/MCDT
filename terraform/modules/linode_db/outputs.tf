# =============================================================================
# Linode Managed Database Module Outputs
# =============================================================================

output "db_engine" {
  description = "Database engine type"
  value       = var.db_engine
}

output "db_id" {
  description = "The ID of the database"
  value       = local.db_instance != null ? local.db_instance.id : null
}

output "db_endpoint" {
  description = "Database host address"
  value       = local.db_instance != null ? local.db_instance.host_primary : null
}

output "db_secondary_endpoint" {
  description = "Database secondary/read host"
  value       = local.db_instance != null ? local.db_instance.host_secondary : null
}

output "db_port" {
  description = "Database port"
  value       = local.db_port_map[var.db_engine]
}

output "db_username" {
  description = "Database root username"
  value       = local.db_instance != null ? local.db_instance.root_username : null
}

output "db_password" {
  description = "Database root password"
  value       = local.db_instance != null ? local.db_instance.root_password : null
  sensitive   = true
}

output "db_ssl_cert" {
  description = "SSL CA certificate for database connections"
  value       = local.db_instance != null ? local.db_instance.ca_cert : null
  sensitive   = true
}

output "db_status" {
  description = "Current status of the database"
  value       = local.db_instance != null ? local.db_instance.status : null
}
