# Data Sources for Discovering Existing Infrastructure
# This file contains Terraform data sources to discover and reuse existing AWS infrastructure
# When deploying new resources, they will automatically use existing VPCs, subnets, and networking

# =============================================================================
# Discover Existing VPCs in Region
# =============================================================================

data "aws_vpcs" "existing" {
  # Only query if not creating a new VPC and no specific VPC ID provided
  count = !var.create_vpc && var.vpc_id == "" ? 1 : 0

  tags = {
    ManagedBy = "Terraform"
  }
}

data "aws_vpc" "selected" {
  # Use when a specific VPC ID is provided or discovered
  count = !var.create_vpc ? 1 : 0

  # Prefer user-provided VPC ID, fall back to first discovered VPC
  id = var.vpc_id != "" ? var.vpc_id : (
    length(data.aws_vpcs.existing) > 0 && length(data.aws_vpcs.existing[0].ids) > 0 ?
    data.aws_vpcs.existing[0].ids[0] :
    ""
  )
}

# =============================================================================
# Discover Existing Subnets in VPC
# =============================================================================

data "aws_subnets" "private" {
  # Query private subnets when using existing VPC
  count = !var.create_vpc ? 1 : 0

  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.selected[0].id]
  }

  # Look for private subnet tags
  tags = {
    "kubernetes.io/role/internal-elb" = "1"
  }
}

data "aws_subnets" "public" {
  # Query public subnets when using existing VPC
  count = !var.create_vpc ? 1 : 0

  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.selected[0].id]
  }

  # Look for public subnet tags
  tags = {
    "kubernetes.io/role/elb" = "1"
  }
}

# Fallback: All subnets if specific tags not found
data "aws_subnets" "all" {
  count = !var.create_vpc ? 1 : 0

  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.selected[0].id]
  }
}

# Get subnet details for CIDR blocks
data "aws_subnet" "private_details" {
  count = !var.create_vpc && length(local.discovered_private_subnets) > 0 ? length(local.discovered_private_subnets) : 0
  id    = local.discovered_private_subnets[count.index]
}

data "aws_subnet" "public_details" {
  count = !var.create_vpc && length(local.discovered_public_subnets) > 0 ? length(local.discovered_public_subnets) : 0
  id    = local.discovered_public_subnets[count.index]
}

# =============================================================================
# Discover Existing RDS Instances in Region
# =============================================================================

data "aws_db_instances" "existing" {
  # Query existing RDS instances to discover VPC/subnet configuration
  count = var.enable_rds ? 1 : 0

  filter {
    name   = "engine"
    values = ["postgres", "mysql", "mariadb", "sqlserver-ex", "sqlserver-se", "sqlserver-ee", "sqlserver-web", "oracle-se2", "oracle-ee"]
  }
}

# Get details of the first RDS instance if it exists
data "aws_db_instance" "existing_rds" {
  count = var.enable_rds && length(local.existing_rds_instances) > 0 ? 1 : 0

  db_instance_identifier = local.existing_rds_instances[0]
}

# =============================================================================
# Discover Existing EKS Clusters in Region
# =============================================================================

data "aws_eks_clusters" "existing" {
  # Discover existing EKS clusters to avoid conflicts
}

data "aws_eks_cluster" "existing" {
  # Get details of first existing cluster if any exist
  count = length(data.aws_eks_clusters.existing.names) > 0 ? 1 : 0
  name  = tolist(data.aws_eks_clusters.existing.names)[0]
}

# =============================================================================
# Discover Internet Gateways
# =============================================================================

data "aws_internet_gateway" "existing" {
  count = !var.create_vpc ? 1 : 0

  filter {
    name   = "attachment.vpc-id"
    values = [data.aws_vpc.selected[0].id]
  }
}

# =============================================================================
# Discover NAT Gateways
# =============================================================================

data "aws_nat_gateways" "existing" {
  count = !var.create_vpc ? 1 : 0

  vpc_id = data.aws_vpc.selected[0].id
}

data "aws_nat_gateway" "existing" {
  count = !var.create_vpc && length(local.existing_nat_gateway_ids) > 0 ? length(local.existing_nat_gateway_ids) : 0
  id    = local.existing_nat_gateway_ids[count.index]
}

# =============================================================================
# Discover Security Groups
# =============================================================================

data "aws_security_groups" "existing" {
  count = !var.create_vpc ? 1 : 0

  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.selected[0].id]
  }

  filter {
    name   = "group-name"
    values = ["*rds*", "*database*", "*eks*", "*cluster*"]
  }
}

# =============================================================================
# Discovery Helper Locals
# =============================================================================

locals {
  # RDS discovery
  existing_rds_instances = var.enable_rds && length(data.aws_db_instances.existing) > 0 ? data.aws_db_instances.existing[0].instance_identifiers : []
  has_existing_rds       = length(local.existing_rds_instances) > 0

  # Discovered subnets (with fallback logic)
  discovered_private_subnets = !var.create_vpc ? (
    length(data.aws_subnets.private) > 0 && length(data.aws_subnets.private[0].ids) > 0 ?
    data.aws_subnets.private[0].ids :
    data.aws_subnets.all[0].ids
  ) : []

  discovered_public_subnets = !var.create_vpc ? (
    length(data.aws_subnets.public) > 0 && length(data.aws_subnets.public[0].ids) > 0 ?
    data.aws_subnets.public[0].ids :
    []
  ) : []

  # VPC CIDR discovery
  discovered_vpc_cidr = !var.create_vpc && length(data.aws_vpc.selected) > 0 ? data.aws_vpc.selected[0].cidr_block : ""

  # NAT Gateway discovery
  existing_nat_gateway_ids = !var.create_vpc && length(data.aws_nat_gateways.existing) > 0 ? data.aws_nat_gateways.existing[0].ids : []

  # Infrastructure summary for logging
  infrastructure_summary = {
    vpc_id                = local.vpc_id
    vpc_cidr              = local.vpc_cidr
    private_subnets       = local.private_subnets
    public_subnets        = local.public_subnets
    has_existing_rds      = local.has_existing_rds
    existing_rds_vpc      = local.has_existing_rds ? data.aws_db_instance.existing_rds[0].db_subnet_group : null
    existing_eks_clusters = data.aws_eks_clusters.existing.names
    nat_gateway_count     = length(local.existing_nat_gateway_ids)
    using_existing_infra  = !var.create_vpc
  }
}

# =============================================================================
# Outputs for Discovery Information
# =============================================================================

output "discovered_infrastructure" {
  description = "Summary of discovered existing infrastructure"
  value = {
    vpc_id                = local.infrastructure_summary.vpc_id
    vpc_cidr              = local.infrastructure_summary.vpc_cidr
    private_subnet_count  = length(local.private_subnets)
    public_subnet_count   = length(local.public_subnets)
    existing_rds_found    = local.has_existing_rds
    existing_rds_count    = length(local.existing_rds_instances)
    existing_eks_clusters = local.infrastructure_summary.existing_eks_clusters
    nat_gateways_found    = local.infrastructure_summary.nat_gateway_count
    using_existing_vpc    = local.infrastructure_summary.using_existing_infra
  }
}
