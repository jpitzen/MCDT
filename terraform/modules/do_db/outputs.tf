# =============================================================================
# DigitalOcean Managed Database Module Outputs
# =============================================================================

output "db_engine" {
  description = "Database engine type"
  value       = var.db_engine
}

output "db_cluster_id" {
  description = "The ID of the database cluster"
  value       = digitalocean_database_cluster.main.id
}

output "db_endpoint" {
  description = "Database hostname"
  value       = digitalocean_database_cluster.main.host
}

output "db_private_endpoint" {
  description = "Database private hostname"
  value       = digitalocean_database_cluster.main.private_host
}

output "db_port" {
  description = "Database port"
  value       = digitalocean_database_cluster.main.port
}

output "db_name" {
  description = "Database name"
  value       = var.db_engine != "redis" ? digitalocean_database_db.main[0].name : ""
}

output "db_username" {
  description = "Database admin username"
  value       = var.db_engine != "redis" ? digitalocean_database_user.admin[0].name : ""
}

output "db_password" {
  description = "Database admin password"
  value       = digitalocean_database_cluster.main.password
  sensitive   = true
}

output "db_uri" {
  description = "Database connection URI"
  value       = digitalocean_database_cluster.main.uri
  sensitive   = true
}

output "db_private_uri" {
  description = "Database private connection URI"
  value       = digitalocean_database_cluster.main.private_uri
  sensitive   = true
}

output "connection_pool_uri" {
  description = "Connection pool URI (PostgreSQL only)"
  value       = var.db_engine == "pg" && var.enable_connection_pool ? digitalocean_database_connection_pool.main[0].uri : ""
  sensitive   = true
}
