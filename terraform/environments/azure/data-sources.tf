# =============================================================================
# Data Sources for Discovering Existing Azure Infrastructure
# =============================================================================
# These data sources allow the deployment to reference existing Azure resources
# (VNets, subnets, etc.) rather than always creating new ones.

# Discover existing Virtual Network (if deploying into an existing VNet)
# Uncomment and configure when using existing networking infrastructure.

# data "azurerm_virtual_network" "existing" {
#   count               = var.existing_vnet_name != "" ? 1 : 0
#   name                = var.existing_vnet_name
#   resource_group_name = var.existing_vnet_resource_group != "" ? var.existing_vnet_resource_group : var.resource_group
# }

# data "azurerm_subnet" "existing" {
#   count                = var.existing_subnet_name != "" ? 1 : 0
#   name                 = var.existing_subnet_name
#   virtual_network_name = data.azurerm_virtual_network.existing[0].name
#   resource_group_name  = data.azurerm_virtual_network.existing[0].resource_group_name
# }
