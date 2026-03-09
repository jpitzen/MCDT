# =============================================================================
# GCP Cloud SQL Module
# Multi-engine managed database: PostgreSQL, MySQL, SQL Server
# =============================================================================

terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

# -----------------------------------------------------------------------------
# Random password for database admin
# -----------------------------------------------------------------------------
resource "random_password" "db_password" {
  count   = var.db_password == "" ? 1 : 0
  length  = 24
  special = true
  override_special = "!@#$%^&*()-_=+"
}

locals {
  db_password = var.db_password != "" ? var.db_password : random_password.db_password[0].result
  db_version_map = {
    postgresql = var.db_version != "" ? var.db_version : "POSTGRES_15"
    mysql      = var.db_version != "" ? var.db_version : "MYSQL_8_0"
    sqlserver  = var.db_version != "" ? var.db_version : "SQLSERVER_2022_STANDARD"
  }
  db_tier_map = {
    postgresql = var.db_tier != "" ? var.db_tier : "db-custom-2-7680"
    mysql      = var.db_tier != "" ? var.db_tier : "db-custom-2-7680"
    sqlserver  = var.db_tier != "" ? var.db_tier : "db-custom-2-7680"
  }
  db_port_map = {
    postgresql = 5432
    mysql      = 3306
    sqlserver  = 1433
  }
}

# -----------------------------------------------------------------------------
# Cloud SQL Instance
# -----------------------------------------------------------------------------
resource "google_sql_database_instance" "main" {
  name                = "${var.cluster_name}-${var.db_engine}-db"
  project             = var.project_id
  region              = var.region
  database_version    = local.db_version_map[var.db_engine]
  deletion_protection = var.deletion_protection

  settings {
    tier              = local.db_tier_map[var.db_engine]
    disk_size         = var.db_disk_size_gb
    disk_type         = var.db_disk_type
    disk_autoresize   = true
    availability_type = var.db_high_availability ? "REGIONAL" : "ZONAL"

    backup_configuration {
      enabled                        = true
      start_time                     = "03:00"
      point_in_time_recovery_enabled = var.db_engine != "sqlserver" ? true : false
      transaction_log_retention_days = var.db_backup_retention_days
      backup_retention_settings {
        retained_backups = var.db_backup_retention_days
      }
    }

    ip_configuration {
      ipv4_enabled    = !var.enable_private_ip
      private_network = var.enable_private_ip ? var.vpc_self_link : null
      require_ssl     = var.require_ssl

      dynamic "authorized_networks" {
        for_each = var.authorized_networks
        content {
          name  = authorized_networks.value.name
          value = authorized_networks.value.cidr
        }
      }
    }

    maintenance_window {
      day          = 7  # Sunday
      hour         = 3
      update_track = "stable"
    }

    database_flags {
      name  = var.db_engine == "postgresql" ? "max_connections" : var.db_engine == "mysql" ? "max_connections" : "user connections"
      value = "200"
    }

    user_labels = {
      cluster     = var.cluster_name
      engine      = var.db_engine
      managed_by  = "zlaws"
    }
  }

  depends_on = [var.private_services_connection_id]
}

# -----------------------------------------------------------------------------
# Database
# -----------------------------------------------------------------------------
resource "google_sql_database" "main" {
  name     = var.db_name
  instance = google_sql_database_instance.main.name
  project  = var.project_id

  charset   = var.db_engine == "postgresql" ? "UTF8" : var.db_engine == "mysql" ? "utf8mb4" : null
  collation = var.db_engine == "postgresql" ? "en_US.UTF8" : var.db_engine == "mysql" ? "utf8mb4_general_ci" : null
}

# -----------------------------------------------------------------------------
# Database User
# -----------------------------------------------------------------------------
resource "google_sql_user" "admin" {
  name     = var.db_username
  instance = google_sql_database_instance.main.name
  project  = var.project_id
  password = local.db_password

  # SQL Server uses different auth
  type = var.db_engine == "sqlserver" ? "BUILT_IN" : null
}

# -----------------------------------------------------------------------------
# Store password in Secret Manager
# -----------------------------------------------------------------------------
resource "google_secret_manager_secret" "db_password" {
  count     = var.store_password_in_secret_manager ? 1 : 0
  secret_id = "${var.cluster_name}-db-password"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = {
    cluster    = var.cluster_name
    managed_by = "zlaws"
  }
}

resource "google_secret_manager_secret_version" "db_password" {
  count       = var.store_password_in_secret_manager ? 1 : 0
  secret      = google_secret_manager_secret.db_password[0].id
  secret_data = local.db_password
}
