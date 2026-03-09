# =============================================================================
# DigitalOcean Managed Database Module
# Supports PostgreSQL, MySQL, Redis, MongoDB
# =============================================================================

terraform {
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.0"
    }
  }
}

# -----------------------------------------------------------------------------
# Managed Database Cluster
# -----------------------------------------------------------------------------
resource "digitalocean_database_cluster" "main" {
  name                 = "${var.cluster_name}-${var.db_engine}-db"
  engine               = var.db_engine
  version              = local.db_version
  size                 = var.db_size
  region               = var.region
  node_count           = var.db_node_count
  private_network_uuid = var.vpc_id

  maintenance_window {
    day  = "sunday"
    hour = "03:00:00"
  }

  tags = ["zlaws", var.cluster_name, var.db_engine]
}

locals {
  db_version_defaults = {
    pg      = "16"
    mysql   = "8"
    redis   = "7"
    mongodb = "7"
  }
  db_version = var.db_version != "" ? var.db_version : local.db_version_defaults[var.db_engine]
  db_port_map = {
    pg      = 25060
    mysql   = 25060
    redis   = 25061
    mongodb = 27017
  }
}

# -----------------------------------------------------------------------------
# Database
# -----------------------------------------------------------------------------
resource "digitalocean_database_db" "main" {
  count      = var.db_engine != "redis" ? 1 : 0
  cluster_id = digitalocean_database_cluster.main.id
  name       = var.db_name
}

# -----------------------------------------------------------------------------
# Database User
# -----------------------------------------------------------------------------
resource "digitalocean_database_user" "admin" {
  count      = var.db_engine != "redis" ? 1 : 0
  cluster_id = digitalocean_database_cluster.main.id
  name       = var.db_username
}

# -----------------------------------------------------------------------------
# Database Firewall — restrict to DOKS cluster
# -----------------------------------------------------------------------------
resource "digitalocean_database_firewall" "main" {
  count      = var.k8s_cluster_id != "" ? 1 : 0
  cluster_id = digitalocean_database_cluster.main.id

  rule {
    type  = "k8s"
    value = var.k8s_cluster_id
  }
}

# -----------------------------------------------------------------------------
# Connection Pool (PostgreSQL only)
# -----------------------------------------------------------------------------
resource "digitalocean_database_connection_pool" "main" {
  count      = var.db_engine == "pg" && var.enable_connection_pool ? 1 : 0
  cluster_id = digitalocean_database_cluster.main.id
  name       = "${var.cluster_name}-pool"
  mode       = "transaction"
  size       = var.connection_pool_size
  db_name    = digitalocean_database_db.main[0].name
  user       = digitalocean_database_user.admin[0].name
}
