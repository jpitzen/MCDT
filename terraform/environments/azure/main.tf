terraform {
  required_version = ">= 1.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
  subscription_id = var.subscription_id
  client_id       = var.client_id
  client_secret   = var.client_secret
  tenant_id       = var.tenant_id
}

resource "azurerm_resource_group" "main" {
  name     = var.resource_group
  location = var.region
  tags     = var.common_tags
}

# =============================================================================
# VNet Module (conditional)
# =============================================================================
module "vnet" {
  source = "../../modules/azure_vnet"
  count  = var.create_vnet ? 1 : 0

  cluster_name        = var.cluster_name
  region              = var.region
  resource_group_name = azurerm_resource_group.main.name
  vnet_cidr           = var.vnet_cidr
  public_subnet_cidr  = var.public_subnet_cidr
  aks_subnet_cidr     = var.aks_subnet_cidr
  db_subnet_cidr      = var.db_subnet_cidr
  enable_nat_gateway  = var.enable_nat_gateway
}

locals {
  aks_subnet_id    = var.create_vnet ? module.vnet[0].aks_subnet_id : var.existing_aks_subnet_id
  db_subnet_id     = var.create_vnet ? module.vnet[0].db_subnet_id : var.existing_db_subnet_id
  public_subnet_id = var.create_vnet ? module.vnet[0].public_subnet_id : var.existing_public_subnet_id
  vnet_id          = var.create_vnet ? module.vnet[0].vnet_id : var.existing_vnet_id
}

# =============================================================================
# AKS Cluster
# =============================================================================
resource "azurerm_kubernetes_cluster" "main" {
  name                = var.cluster_name
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  dns_prefix          = var.cluster_name
  kubernetes_version  = var.kubernetes_version

  default_node_pool {
    name                = "default"
    node_count          = var.node_count
    vm_size             = var.node_vm_size
    min_count           = var.enable_autoscaling ? var.min_node_count : null
    max_count           = var.enable_autoscaling ? var.max_node_count : null
    enable_auto_scaling = var.enable_autoscaling
    os_disk_size_gb     = var.os_disk_size_gb
    vnet_subnet_id      = var.create_vnet || var.existing_aks_subnet_id != "" ? local.aks_subnet_id : null
  }

  identity {
    type = "SystemAssigned"
  }

  network_profile {
    network_plugin = var.network_plugin
    network_policy = var.network_policy
    pod_cidr       = var.network_plugin == "kubenet" ? var.pod_cidr : null
    service_cidr   = var.service_cidr
    dns_service_ip = var.dns_service_ip
  }

  tags = var.common_tags
}

# Azure Container Registry (if enabled)
resource "azurerm_container_registry" "main" {
  count               = var.enable_container_registry ? 1 : 0
  name                = replace(var.acr_name != "" ? var.acr_name : var.cluster_name, "-", "")
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = var.acr_sku
  admin_enabled       = var.acr_admin_enabled
  tags                = var.common_tags
}

# Attach ACR to AKS
resource "azurerm_role_assignment" "aks_acr" {
  count                            = var.enable_container_registry ? 1 : 0
  principal_id                     = azurerm_kubernetes_cluster.main.kubelet_identity[0].object_id
  role_definition_name             = "AcrPull"
  scope                            = azurerm_container_registry.main[0].id
  skip_service_principal_aad_check = true
}

# Azure Files (NFS) for persistent storage
resource "azurerm_storage_account" "main" {
  count                    = var.enable_file_storage && !var.enable_blob_storage ? 1 : 0
  name                     = replace("${var.cluster_name}storage", "-", "")
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  tags                     = var.common_tags
}

resource "azurerm_storage_share" "main" {
  count                = var.enable_file_storage && !var.enable_blob_storage ? 1 : 0
  name                 = "${var.cluster_name}-share"
  storage_account_name = azurerm_storage_account.main[0].name
  quota                = var.file_storage_quota_gb
}

# =============================================================================
# Storage Module (Blob + Files combined — replaces standalone when enabled)
# =============================================================================
module "storage" {
  source = "../../modules/azure_storage"
  count  = var.enable_blob_storage ? 1 : 0

  cluster_name        = var.cluster_name
  region              = var.region
  resource_group_name = azurerm_resource_group.main.name
  storage_tier        = var.storage_tier
  replication_type    = var.storage_replication_type
  container_name      = var.blob_container_name
  enable_versioning   = var.enable_blob_versioning
  enable_file_share   = var.enable_file_storage
  file_share_quota_gb = var.file_storage_quota_gb
}

# =============================================================================
# Database Module (conditional)
# =============================================================================
module "database" {
  source = "../../modules/azure_db"
  count  = var.enable_database ? 1 : 0

  cluster_name        = var.cluster_name
  region              = var.region
  resource_group_name = azurerm_resource_group.main.name
  db_engine           = var.db_engine
  db_name             = var.db_name
  db_version          = var.db_version
  db_sku_name         = var.db_sku_name
  db_storage_mb       = var.db_storage_mb
  db_username         = var.db_username
  db_password         = var.db_password
  db_backup_retention_days  = var.db_backup_retention_days
  db_geo_redundant_backup   = var.db_geo_redundant_backup
  db_subnet_id        = local.db_subnet_id
  aks_subnet_id       = local.aks_subnet_id
  vnet_id             = local.vnet_id
}

# Application Gateway for SSL termination (if enabled)
resource "azurerm_application_gateway" "main" {
  count               = var.ingress_application_gateway ? 1 : 0
  name                = var.app_gateway_name != "" ? var.app_gateway_name : "${var.cluster_name}-agw"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location

  sku {
    name = var.app_gateway_sku
    tier = var.app_gateway_sku
  }

  autoscale_configuration {
    min_capacity = var.app_gateway_min_capacity
    max_capacity = var.app_gateway_max_capacity
  }

  ssl_policy {
    policy_name = var.ssl_policy_name
    policy_type = "Predefined"
  }

  # frontend_ip_configuration, http_listener, backend_address_pool, etc.
  # are required but omitted here — implement with a submodule or data block
  # referencing the AKS ingress controller service IP.
  gateway_ip_configuration {
    name      = "gateway-ip-config"
    subnet_id = local.public_subnet_id
  }

  frontend_port {
    name = "https-port"
    port = 443
  }

  frontend_ip_configuration {
    name = "frontend-ip"
  }

  backend_address_pool {
    name = "aks-backend-pool"
  }

  backend_http_settings {
    name                  = "aks-http-settings"
    cookie_based_affinity = "Disabled"
    port                  = 80
    protocol              = "Http"
  }

  http_listener {
    name                           = "https-listener"
    frontend_ip_configuration_name = "frontend-ip"
    frontend_port_name             = "https-port"
    protocol                       = "Https"
  }

  request_routing_rule {
    name                       = "aks-routing"
    rule_type                  = "Basic"
    http_listener_name         = "https-listener"
    backend_address_pool_name  = "aks-backend-pool"
    backend_http_settings_name = "aks-http-settings"
    priority                   = 100
  }

  tags = var.common_tags
}
