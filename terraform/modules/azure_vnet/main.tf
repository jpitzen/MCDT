# =============================================================================
# Azure Virtual Network Module
# Provisions VNet, Subnets, NSGs, NAT Gateway, Route Table
# Equivalent of AWS VPC inline networking in environments/aws/main.tf
# =============================================================================

# -----------------------------------------------------------------------------
# Virtual Network
# -----------------------------------------------------------------------------
resource "azurerm_virtual_network" "main" {
  name                = "${var.cluster_name}-vnet"
  location            = var.region
  resource_group_name = var.resource_group_name
  address_space       = [var.vnet_cidr]
  tags                = var.common_tags
}

# -----------------------------------------------------------------------------
# Subnets
# -----------------------------------------------------------------------------
resource "azurerm_subnet" "public" {
  name                 = "${var.cluster_name}-public"
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [var.public_subnet_cidr]
}

resource "azurerm_subnet" "aks" {
  name                 = "${var.cluster_name}-aks"
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [var.aks_subnet_cidr]
}

resource "azurerm_subnet" "database" {
  name                 = "${var.cluster_name}-db"
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [var.db_subnet_cidr]

  delegation {
    name = "fs-delegation"
    service_delegation {
      name    = "Microsoft.DBforPostgreSQL/flexibleServers"
      actions = ["Microsoft.Network/virtualNetworks/subnets/join/action"]
    }
  }
}

# -----------------------------------------------------------------------------
# Network Security Groups
# -----------------------------------------------------------------------------
resource "azurerm_network_security_group" "aks" {
  name                = "${var.cluster_name}-aks-nsg"
  location            = var.region
  resource_group_name = var.resource_group_name
  tags                = var.common_tags

  security_rule {
    name                       = "AllowHTTPS"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "AllowHTTP"
    priority                   = 110
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "80"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "AllowVNetInternal"
    priority                   = 200
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "VirtualNetwork"
    destination_address_prefix = "VirtualNetwork"
  }
}

resource "azurerm_network_security_group" "database" {
  name                = "${var.cluster_name}-db-nsg"
  location            = var.region
  resource_group_name = var.resource_group_name
  tags                = var.common_tags

  # Allow PostgreSQL from AKS subnet
  security_rule {
    name                       = "AllowPostgreSQL"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "5432"
    source_address_prefix      = var.aks_subnet_cidr
    destination_address_prefix = "*"
  }

  # Allow MySQL from AKS subnet
  security_rule {
    name                       = "AllowMySQL"
    priority                   = 110
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "3306"
    source_address_prefix      = var.aks_subnet_cidr
    destination_address_prefix = "*"
  }

  # Allow SQL Server from AKS subnet
  security_rule {
    name                       = "AllowSQLServer"
    priority                   = 120
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "1433"
    source_address_prefix      = var.aks_subnet_cidr
    destination_address_prefix = "*"
  }

  # Deny all other inbound
  security_rule {
    name                       = "DenyAllInbound"
    priority                   = 4096
    direction                  = "Inbound"
    access                     = "Deny"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }
}

# -----------------------------------------------------------------------------
# NSG Associations
# -----------------------------------------------------------------------------
resource "azurerm_subnet_network_security_group_association" "aks" {
  subnet_id                 = azurerm_subnet.aks.id
  network_security_group_id = azurerm_network_security_group.aks.id
}

resource "azurerm_subnet_network_security_group_association" "database" {
  subnet_id                 = azurerm_subnet.database.id
  network_security_group_id = azurerm_network_security_group.database.id
}

# -----------------------------------------------------------------------------
# NAT Gateway (outbound internet for private subnets)
# -----------------------------------------------------------------------------
resource "azurerm_public_ip" "nat" {
  count               = var.enable_nat_gateway ? 1 : 0
  name                = "${var.cluster_name}-nat-pip"
  location            = var.region
  resource_group_name = var.resource_group_name
  allocation_method   = "Static"
  sku                 = "Standard"
  tags                = var.common_tags
}

resource "azurerm_nat_gateway" "main" {
  count               = var.enable_nat_gateway ? 1 : 0
  name                = "${var.cluster_name}-nat"
  location            = var.region
  resource_group_name = var.resource_group_name
  sku_name            = "Standard"
  tags                = var.common_tags
}

resource "azurerm_nat_gateway_public_ip_association" "main" {
  count                = var.enable_nat_gateway ? 1 : 0
  nat_gateway_id       = azurerm_nat_gateway.main[0].id
  public_ip_address_id = azurerm_public_ip.nat[0].id
}

resource "azurerm_subnet_nat_gateway_association" "aks" {
  count          = var.enable_nat_gateway ? 1 : 0
  subnet_id      = azurerm_subnet.aks.id
  nat_gateway_id = azurerm_nat_gateway.main[0].id
}

resource "azurerm_subnet_nat_gateway_association" "database" {
  count          = var.enable_nat_gateway ? 1 : 0
  subnet_id      = azurerm_subnet.database.id
  nat_gateway_id = azurerm_nat_gateway.main[0].id
}

# -----------------------------------------------------------------------------
# Route Table (custom routing for private subnets)
# -----------------------------------------------------------------------------
resource "azurerm_route_table" "private" {
  name                = "${var.cluster_name}-private-rt"
  location            = var.region
  resource_group_name = var.resource_group_name
  tags                = var.common_tags

  route {
    name           = "default-route"
    address_prefix = "0.0.0.0/0"
    next_hop_type  = "Internet"
  }
}

resource "azurerm_subnet_route_table_association" "aks" {
  subnet_id      = azurerm_subnet.aks.id
  route_table_id = azurerm_route_table.private.id
}
