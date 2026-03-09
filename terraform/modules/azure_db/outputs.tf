# =============================================================================
# Azure Database Module Outputs
# =============================================================================

output "db_engine" {
  description = "Database engine type"
  value       = var.db_engine
}

output "db_endpoint" {
  description = "Database server FQDN"
  value = (
    var.db_engine == "postgresql" ? azurerm_postgresql_flexible_server.main[0].fqdn :
    var.db_engine == "mysql" ? azurerm_mysql_flexible_server.main[0].fqdn :
    var.db_engine == "sqlserver" ? azurerm_mssql_server.main[0].fully_qualified_domain_name :
    ""
  )
}

output "db_name" {
  description = "Database name"
  value       = var.db_name
}

output "db_port" {
  description = "Database port"
  value = (
    var.db_engine == "postgresql" ? 5432 :
    var.db_engine == "mysql" ? 3306 :
    var.db_engine == "sqlserver" ? 1433 :
    0
  )
}

output "db_username" {
  description = "Database administrator username"
  value       = var.db_username
  sensitive   = true
}

output "db_password" {
  description = "Database administrator password"
  value       = var.db_password != "" ? var.db_password : random_password.db.result
  sensitive   = true
}

output "connection_string" {
  description = "Full database connection string"
  sensitive   = true
  value = (
    var.db_engine == "postgresql" ? "postgresql://${var.db_username}:${var.db_password != "" ? var.db_password : random_password.db.result}@${azurerm_postgresql_flexible_server.main[0].fqdn}:5432/${var.db_name}?sslmode=require" :
    var.db_engine == "mysql" ? "mysql://${var.db_username}:${var.db_password != "" ? var.db_password : random_password.db.result}@${azurerm_mysql_flexible_server.main[0].fqdn}:3306/${var.db_name}?ssl=true" :
    var.db_engine == "sqlserver" ? "Server=tcp:${azurerm_mssql_server.main[0].fully_qualified_domain_name},1433;Database=${var.db_name};User ID=${var.db_username};Password=${var.db_password != "" ? var.db_password : random_password.db.result};Encrypt=true;TrustServerCertificate=false" :
    ""
  )
}

output "db_server_id" {
  description = "Database server resource ID"
  value = (
    var.db_engine == "postgresql" ? azurerm_postgresql_flexible_server.main[0].id :
    var.db_engine == "mysql" ? azurerm_mysql_flexible_server.main[0].id :
    var.db_engine == "sqlserver" ? azurerm_mssql_server.main[0].id :
    ""
  )
}
