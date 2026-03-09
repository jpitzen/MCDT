# =============================================================================
# Azure VNet Module Outputs
# =============================================================================

output "vnet_id" {
  description = "Virtual Network ID"
  value       = azurerm_virtual_network.main.id
}

output "vnet_name" {
  description = "Virtual Network name"
  value       = azurerm_virtual_network.main.name
}

output "public_subnet_id" {
  description = "Public subnet ID"
  value       = azurerm_subnet.public.id
}

output "aks_subnet_id" {
  description = "AKS private subnet ID"
  value       = azurerm_subnet.aks.id
}

output "db_subnet_id" {
  description = "Database private subnet ID"
  value       = azurerm_subnet.database.id
}

output "aks_nsg_id" {
  description = "AKS Network Security Group ID"
  value       = azurerm_network_security_group.aks.id
}

output "db_nsg_id" {
  description = "Database Network Security Group ID"
  value       = azurerm_network_security_group.database.id
}

output "nat_gateway_id" {
  description = "NAT Gateway ID (empty if disabled)"
  value       = var.enable_nat_gateway ? azurerm_nat_gateway.main[0].id : ""
}

output "nat_public_ip" {
  description = "NAT Gateway public IP address (empty if disabled)"
  value       = var.enable_nat_gateway ? azurerm_public_ip.nat[0].ip_address : ""
}

output "route_table_id" {
  description = "Private route table ID"
  value       = azurerm_route_table.private.id
}
