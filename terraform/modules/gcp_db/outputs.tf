# =============================================================================
# GCP Cloud SQL Module Outputs
# =============================================================================

output "db_engine" {
  description = "Database engine type"
  value       = var.db_engine
}

output "db_instance_name" {
  description = "Cloud SQL instance name"
  value       = google_sql_database_instance.main.name
}

output "db_instance_connection_name" {
  description = "Cloud SQL instance connection name (for Cloud SQL Proxy)"
  value       = google_sql_database_instance.main.connection_name
}

output "db_endpoint" {
  description = "Database IP address"
  value       = var.enable_private_ip ? google_sql_database_instance.main.private_ip_address : google_sql_database_instance.main.public_ip_address
}

output "db_name" {
  description = "Database name"
  value       = google_sql_database.main.name
}

output "db_port" {
  description = "Database port"
  value       = local.db_port_map[var.db_engine]
}

output "db_username" {
  description = "Database admin username"
  value       = google_sql_user.admin.name
}

output "db_password" {
  description = "Database admin password"
  value       = local.db_password
  sensitive   = true
}

output "connection_string" {
  description = "Database connection string"
  value = var.db_engine == "postgresql" ? (
    "postgresql://${google_sql_user.admin.name}:${local.db_password}@${var.enable_private_ip ? google_sql_database_instance.main.private_ip_address : google_sql_database_instance.main.public_ip_address}:5432/${google_sql_database.main.name}"
  ) : var.db_engine == "mysql" ? (
    "mysql://${google_sql_user.admin.name}:${local.db_password}@${var.enable_private_ip ? google_sql_database_instance.main.private_ip_address : google_sql_database_instance.main.public_ip_address}:3306/${google_sql_database.main.name}"
  ) : (
    "Server=${var.enable_private_ip ? google_sql_database_instance.main.private_ip_address : google_sql_database_instance.main.public_ip_address},1433;Database=${google_sql_database.main.name};User Id=${google_sql_user.admin.name};Password=${local.db_password};"
  )
  sensitive = true
}

output "db_self_link" {
  description = "Self link of the Cloud SQL instance"
  value       = google_sql_database_instance.main.self_link
}
