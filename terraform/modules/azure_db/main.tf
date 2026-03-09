# =============================================================================
# Azure Database Module
# Provisions PostgreSQL/MySQL Flexible Server or Azure SQL Database
# Equivalent of AWS RDS module (terraform/modules/aws_rds/)
# =============================================================================

# -----------------------------------------------------------------------------
# Random password for database admin
# -----------------------------------------------------------------------------
resource "random_password" "db" {
  length  = 16
  special = true
}

# -----------------------------------------------------------------------------
# Private DNS Zone for Flexible Server private access
# -----------------------------------------------------------------------------
resource "azurerm_private_dns_zone" "db" {
  count               = var.db_engine != "sqlserver" && var.db_subnet_id != "" ? 1 : 0
  name                = var.db_engine == "postgresql" ? "${var.cluster_name}.private.postgres.database.azure.com" : "${var.cluster_name}.private.mysql.database.azure.com"
  resource_group_name = var.resource_group_name
  tags                = var.common_tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "db" {
  count                 = var.db_engine != "sqlserver" && var.db_subnet_id != "" && var.vnet_id != "" ? 1 : 0
  name                  = "${var.cluster_name}-db-dns-link"
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.db[0].name
  virtual_network_id    = var.vnet_id
}

# -----------------------------------------------------------------------------
# PostgreSQL Flexible Server
# -----------------------------------------------------------------------------
resource "azurerm_postgresql_flexible_server" "main" {
  count               = var.db_engine == "postgresql" ? 1 : 0
  name                = "${var.cluster_name}-pg"
  resource_group_name = var.resource_group_name
  location            = var.region
  version             = var.db_version != "" ? var.db_version : "15"

  administrator_login    = var.db_username
  administrator_password = var.db_password != "" ? var.db_password : random_password.db.result

  sku_name   = var.db_sku_name
  storage_mb = var.db_storage_mb

  delegated_subnet_id = var.db_subnet_id != "" ? var.db_subnet_id : null
  private_dns_zone_id = var.db_subnet_id != "" ? azurerm_private_dns_zone.db[0].id : null

  backup_retention_days        = var.db_backup_retention_days
  geo_redundant_backup_enabled = var.db_geo_redundant_backup

  zone = var.db_availability_zone

  tags = var.common_tags

  depends_on = [azurerm_private_dns_zone_virtual_network_link.db]
}

resource "azurerm_postgresql_flexible_server_database" "main" {
  count     = var.db_engine == "postgresql" ? 1 : 0
  name      = var.db_name
  server_id = azurerm_postgresql_flexible_server.main[0].id
  charset   = "UTF8"
  collation = "en_US.utf8"
}

# -----------------------------------------------------------------------------
# MySQL Flexible Server
# -----------------------------------------------------------------------------
resource "azurerm_mysql_flexible_server" "main" {
  count               = var.db_engine == "mysql" ? 1 : 0
  name                = "${var.cluster_name}-mysql"
  resource_group_name = var.resource_group_name
  location            = var.region
  version             = var.db_version != "" ? var.db_version : "8.0.21"

  administrator_login    = var.db_username
  administrator_password = var.db_password != "" ? var.db_password : random_password.db.result

  sku_name   = var.db_sku_name
  delegated_subnet_id = var.db_subnet_id != "" ? var.db_subnet_id : null
  private_dns_zone_id = var.db_subnet_id != "" ? azurerm_private_dns_zone.db[0].id : null

  backup_retention_days        = var.db_backup_retention_days
  geo_redundant_backup_enabled = var.db_geo_redundant_backup

  zone = var.db_availability_zone

  tags = var.common_tags

  depends_on = [azurerm_private_dns_zone_virtual_network_link.db]
}

resource "azurerm_mysql_flexible_server_database" "main" {
  count     = var.db_engine == "mysql" ? 1 : 0
  name      = var.db_name
  server_id = azurerm_mysql_flexible_server.main[0].id
  charset   = "utf8mb4"
  collation = "utf8mb4_unicode_ci"
}

# -----------------------------------------------------------------------------
# Azure SQL Server (MSSQL)
# -----------------------------------------------------------------------------
resource "azurerm_mssql_server" "main" {
  count                        = var.db_engine == "sqlserver" ? 1 : 0
  name                         = "${var.cluster_name}-sqlserver"
  resource_group_name          = var.resource_group_name
  location                     = var.region
  version                      = var.db_version != "" ? var.db_version : "12.0"
  administrator_login          = var.db_username
  administrator_login_password = var.db_password != "" ? var.db_password : random_password.db.result
  minimum_tls_version          = "1.2"
  tags                         = var.common_tags
}

resource "azurerm_mssql_database" "main" {
  count     = var.db_engine == "sqlserver" ? 1 : 0
  name      = var.db_name
  server_id = azurerm_mssql_server.main[0].id
  sku_name  = var.db_sku_name != "" ? var.db_sku_name : "S0"

  max_size_gb = ceil(var.db_storage_mb / 1024)

  tags = var.common_tags
}

# Allow AKS subnet access to SQL Server
resource "azurerm_mssql_virtual_network_rule" "aks" {
  count     = var.db_engine == "sqlserver" && var.aks_subnet_id != "" ? 1 : 0
  name      = "${var.cluster_name}-aks-access"
  server_id = azurerm_mssql_server.main[0].id
  subnet_id = var.aks_subnet_id
}
