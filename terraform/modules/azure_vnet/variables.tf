# =============================================================================
# Azure VNet Module Variables
# =============================================================================

variable "cluster_name" {
  description = "Name of the cluster (used for resource naming)"
  type        = string
}

variable "region" {
  description = "Azure region"
  type        = string
}

variable "resource_group_name" {
  description = "Name of the Azure Resource Group"
  type        = string
}

variable "vnet_cidr" {
  description = "CIDR block for the Virtual Network"
  type        = string
  default     = "10.1.0.0/16"
}

variable "public_subnet_cidr" {
  description = "CIDR block for the public subnet"
  type        = string
  default     = "10.1.1.0/24"
}

variable "aks_subnet_cidr" {
  description = "CIDR block for the AKS private subnet"
  type        = string
  default     = "10.1.10.0/24"
}

variable "db_subnet_cidr" {
  description = "CIDR block for the database private subnet"
  type        = string
  default     = "10.1.20.0/24"
}

variable "enable_nat_gateway" {
  description = "Enable NAT Gateway for outbound internet from private subnets"
  type        = bool
  default     = true
}

variable "common_tags" {
  description = "Common tags applied to all resources"
  type        = map(string)
  default     = {}
}
