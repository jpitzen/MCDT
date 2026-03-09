# =============================================================================
# Linode Managed Database Module
# Supports PostgreSQL and MySQL
# =============================================================================

terraform {
  required_providers {
    linode = {
      source  = "linode/linode"
      version = "~> 2.0"
    }
  }
}

# -----------------------------------------------------------------------------
# Managed Database — PostgreSQL
# -----------------------------------------------------------------------------
resource "linode_database_postgresql" "main" {
  count  = var.db_engine == "postgresql" ? 1 : 0
  label  = "${var.cluster_name}-pg-db"
  region = var.region
  type   = var.db_type

  engine_id       = "postgresql/${var.db_version != "" ? var.db_version : "16"}"
  cluster_size    = var.db_cluster_size
  encrypted       = var.db_encrypted
  ssl_connection  = var.require_ssl

  allow_list = var.allow_list

  updates {
    day_of_week   = "sunday"
    duration      = 3
    frequency     = "weekly"
    hour_of_day   = 3
  }
}

# -----------------------------------------------------------------------------
# Managed Database — MySQL
# -----------------------------------------------------------------------------
resource "linode_database_mysql" "main" {
  count  = var.db_engine == "mysql" ? 1 : 0
  label  = "${var.cluster_name}-mysql-db"
  region = var.region
  type   = var.db_type

  engine_id       = "mysql/${var.db_version != "" ? var.db_version : "8"}"
  cluster_size    = var.db_cluster_size
  encrypted       = var.db_encrypted
  ssl_connection  = var.require_ssl

  allow_list = var.allow_list

  updates {
    day_of_week   = "sunday"
    duration      = 3
    frequency     = "weekly"
    hour_of_day   = 3
  }
}

locals {
  # Unified outputs regardless of engine
  db_instance = var.db_engine == "postgresql" ? (
    length(linode_database_postgresql.main) > 0 ? linode_database_postgresql.main[0] : null
  ) : (
    length(linode_database_mysql.main) > 0 ? linode_database_mysql.main[0] : null
  )
  db_port_map = {
    postgresql = 5432
    mysql      = 3306
  }
}
