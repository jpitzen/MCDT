terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = merge(
      var.common_tags,
      {
        Environment = var.environment
        ManagedBy   = "Terraform"
        Cloud       = "AWS"
      }
    )
  }
}

# ============================================================================
# AWS Resource Group - Created FIRST to group all resources
# ============================================================================
module "resource_group" {
  count  = var.create_resource_group ? 1 : 0
  source = "../../modules/aws_resource_group"

  resource_group_name = var.resource_group_name != "" ? var.resource_group_name : var.cluster_name
  description         = var.resource_group_description
  environment         = var.environment
  cost_center         = var.cost_center
  project             = var.project

  common_tags = merge(var.common_tags, {
    "zlaws:ResourceGroup" = var.resource_group_name != "" ? var.resource_group_name : var.cluster_name
  })
}

# Local for resource group tag to apply to all resources
locals {
  resource_group_tags = var.create_resource_group ? {
    "zlaws:ResourceGroup" = var.resource_group_name != "" ? var.resource_group_name : var.cluster_name
  } : {}
}

# AWS VPC (if not using existing subnets)
resource "aws_vpc" "main" {
  count = var.create_vpc ? 1 : 0

  cidr_block           = var.aws_vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(
    var.common_tags,
    {
      Name = "${var.cluster_name}-vpc"
    }
  )
}

# Public Subnets (for ALB, NAT Gateway, Bastion)
resource "aws_subnet" "public" {
  count = var.create_vpc ? length(var.aws_availability_zones) : 0

  vpc_id                  = aws_vpc.main[0].id
  cidr_block              = "10.0.${count.index + 1}.0/24"
  availability_zone       = var.aws_availability_zones[count.index]
  map_public_ip_on_launch = true

  tags = merge(
    var.common_tags,
    {
      Name                                        = "${var.cluster_name}-public-${var.aws_availability_zones[count.index]}"
      "kubernetes.io/role/elb"                    = "1"
      "kubernetes.io/cluster/${var.cluster_name}" = "shared"
    }
  )
}

# Private Subnets (for EKS, RDS, EC2, EFS)
resource "aws_subnet" "private" {
  count = var.create_vpc ? length(var.aws_availability_zones) : 0

  vpc_id                  = aws_vpc.main[0].id
  cidr_block              = "10.0.${count.index + 10}.0/24"
  availability_zone       = var.aws_availability_zones[count.index]
  map_public_ip_on_launch = false

  tags = merge(
    var.common_tags,
    {
      Name                                        = "${var.cluster_name}-private-${var.aws_availability_zones[count.index]}"
      "kubernetes.io/role/internal-elb"           = "1"
      "kubernetes.io/cluster/${var.cluster_name}" = "shared"
    }
  )
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  count = var.create_vpc ? 1 : 0

  vpc_id = aws_vpc.main[0].id

  tags = merge(
    var.common_tags,
    {
      Name = "${var.cluster_name}-igw"
    }
  )
}

# Elastic IPs for NAT Gateways
resource "aws_eip" "nat" {
  count = var.create_vpc ? length(var.aws_availability_zones) : 0

  domain = "vpc"

  tags = merge(
    var.common_tags,
    {
      Name = "${var.cluster_name}-nat-eip-${var.aws_availability_zones[count.index]}"
    }
  )

  depends_on = [aws_internet_gateway.main]
}

# NAT Gateways (one per AZ for high availability)
resource "aws_nat_gateway" "main" {
  count = var.create_vpc ? length(var.aws_availability_zones) : 0

  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = merge(
    var.common_tags,
    {
      Name = "${var.cluster_name}-nat-${var.aws_availability_zones[count.index]}"
    }
  )

  depends_on = [aws_internet_gateway.main]
}

# Public Route Table
resource "aws_route_table" "public" {
  count = var.create_vpc ? 1 : 0

  vpc_id = aws_vpc.main[0].id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main[0].id
  }

  tags = merge(
    var.common_tags,
    {
      Name = "${var.cluster_name}-public-rt"
    }
  )
}

# Private Route Tables (one per AZ for NAT Gateway routing)
resource "aws_route_table" "private" {
  count = var.create_vpc ? length(var.aws_availability_zones) : 0

  vpc_id = aws_vpc.main[0].id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[count.index].id
  }

  tags = merge(
    var.common_tags,
    {
      Name = "${var.cluster_name}-private-rt-${var.aws_availability_zones[count.index]}"
    }
  )
}

# Public Subnet Route Table Associations
resource "aws_route_table_association" "public" {
  count = var.create_vpc ? length(var.aws_availability_zones) : 0

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public[0].id
}

# Private Subnet Route Table Associations
resource "aws_route_table_association" "private" {
  count = var.create_vpc ? length(var.aws_availability_zones) : 0

  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

# Local values - Enhanced with Infrastructure Discovery
locals {
  # VPC Selection Priority:
  # 1. Newly created VPC (if create_vpc = true)
  # 2. User-specified VPC ID (if vpc_id provided)
  # 3. Discovered VPC (from VPC discovery - handles RDS VPC lookup via subnets)
  # 4. First discovered VPC with Terraform tags
  vpc_id = var.create_vpc ? aws_vpc.main[0].id : (
    var.vpc_id != "" ? var.vpc_id : (
      length(data.aws_vpc.selected) > 0 ? data.aws_vpc.selected[0].id : ""
    )
  )

  # VPC CIDR Selection Priority:
  # 1. Newly created VPC CIDR
  # 2. User-specified VPC CIDR
  # 3. Discovered VPC CIDR from selected VPC
  # 4. Discovered VPC CIDR from RDS
  vpc_cidr = var.create_vpc ? var.aws_vpc_cidr : (
    var.vpc_cidr != "" ? var.vpc_cidr : (
      local.discovered_vpc_cidr != "" ? local.discovered_vpc_cidr : (
        local.has_existing_rds && length(data.aws_db_instance.existing_rds) > 0 ?
        data.aws_vpc.selected[0].cidr_block : "10.0.0.0/16"
      )
    )
  )

  # Private Subnets Selection Priority:
  # 1. Newly created private subnets
  # 2. User-specified subnets (aws_subnets variable)
  # 3. Discovered private subnets (tagged for internal ELB)
  # 4. Subnets from existing RDS DB subnet group
  private_subnets = var.create_vpc ? aws_subnet.private[*].id : (
    length(var.aws_subnets) > 0 ? var.aws_subnets : (
      length(local.discovered_private_subnets) > 0 ? local.discovered_private_subnets : (
        local.has_existing_rds && length(data.aws_db_instance.existing_rds) > 0 ?
        data.aws_db_instance.existing_rds[0].db_subnet_group != "" ?
        [for s in data.aws_subnet.private_details : s.id] : [] : []
      )
    )
  )

  # Public Subnets Selection Priority:
  # 1. Newly created public subnets
  # 2. Discovered public subnets (tagged for ELB)
  # 3. Fall back to private subnets if no public subnets found
  public_subnets = var.create_vpc ? aws_subnet.public[*].id : (
    length(local.discovered_public_subnets) > 0 ? local.discovered_public_subnets :
    local.private_subnets
  )

  # EKS subnets - Always use private subnets for EKS nodes
  eks_subnets = local.private_subnets

  # RDS Subnet Selection
  # If RDS already exists in this VPC, use its subnet group to ensure connectivity
  rds_subnets = local.has_existing_rds && length(data.aws_db_instance.existing_rds) > 0 ? (
    # Extract subnets from existing RDS DB subnet group
    local.private_subnets
  ) : local.private_subnets
}

# EKS Cluster Module
module "eks_cluster" {
  source = "../../modules/aws_eks"

  cluster_name       = var.cluster_name
  kubernetes_version = var.kubernetes_version
  node_count         = var.node_count
  min_node_count     = var.min_node_count
  max_node_count     = var.max_node_count
  enable_autoscaling = var.enable_autoscaling
  node_instance_type = var.node_instance_type
  enable_monitoring  = var.enable_monitoring
  enable_logging     = var.enable_logging

  # AWS-specific: subnet IDs (use created subnets OR user-provided)
  subnets = local.eks_subnets

  # Private cluster configuration
  endpoint_public_access  = var.endpoint_public_access
  endpoint_private_access = var.endpoint_private_access

  # CSI Driver configuration
  enable_ebs_csi_driver  = var.enable_ebs_csi_driver
  enable_efs_csi_driver  = var.enable_efs_csi_driver
  ebs_csi_driver_version = var.ebs_csi_driver_version
  efs_csi_driver_version = var.efs_csi_driver_version

  # Cluster Autoscaler configuration
  enable_cluster_autoscaler  = var.enable_cluster_autoscaler
  autoscaler_namespace       = var.autoscaler_namespace
  autoscaler_service_account = var.autoscaler_service_account

  common_tags = var.common_tags
}

# RDS Module (conditional) - Uses discovered or created private subnets
# Will automatically use existing RDS VPC/subnets if available
module "rds" {
  count  = var.enable_rds ? 1 : 0
  source = "../../modules/aws_rds"

  cluster_name                      = var.cluster_name
  db_identifier                     = var.db_identifier
  vpc_id                            = local.vpc_id
  vpc_cidr                          = local.vpc_cidr
  subnet_ids                        = local.rds_subnets # Uses discovered RDS subnets when available
  db_engine                         = var.db_engine
  db_version                        = var.db_version
  db_instance_class                 = var.db_instance_class
  db_allocated_storage              = var.db_allocated_storage
  db_storage_type                   = var.db_storage_type
  db_name                           = var.db_name
  db_username                       = var.db_username
  db_password                       = var.db_password
  db_port                           = var.db_port
  db_multi_az                       = var.db_multi_az
  db_backup_retention_days          = var.db_backup_retention_days
  db_backup_window                  = var.db_backup_window
  db_maintenance_window             = var.db_maintenance_window
  enable_enhanced_monitoring        = var.db_enable_enhanced_monitoring
  enable_performance_insights       = var.db_enable_performance_insights
  enable_cloudwatch_logs            = var.db_enable_cloudwatch_logs
  db_cloudwatch_log_exports         = var.db_cloudwatch_log_exports
  deletion_protection               = var.db_deletion_protection
  skip_final_snapshot               = var.db_skip_final_snapshot
  store_password_in_secrets_manager = var.db_store_password_in_secrets_manager

  common_tags = var.common_tags
}

# EC2 Module (conditional) - Uses private subnets
module "ec2_vms" {
  count  = var.enable_additional_vms ? 1 : 0
  source = "../../modules/aws_ec2"

  cluster_name                      = var.cluster_name
  vm_base_name                      = var.vm_base_name
  vpc_id                            = local.vpc_id
  vpc_cidr                          = local.vpc_cidr
  subnet_ids                        = local.private_subnets
  vm_count                          = var.vm_count
  vm_instance_type                  = var.vm_instance_type
  vm_operating_system               = var.vm_operating_system
  create_key_pair                   = var.vm_create_key_pair
  existing_key_name                 = var.vm_existing_key_name
  store_key_in_secrets_manager      = var.vm_store_key_in_secrets_manager
  windows_admin_password            = var.vm_windows_admin_password
  store_password_in_secrets_manager = var.vm_store_password_in_secrets_manager
  windows_user_data_script          = var.vm_windows_user_data_script
  linux_user_data_script            = var.vm_linux_user_data_script
  root_volume_type                  = var.vm_root_volume_type
  root_volume_size                  = var.vm_root_volume_size
  additional_ebs_volumes            = var.vm_additional_ebs_volumes
  allow_rdp                         = var.vm_allow_rdp
  rdp_cidr_blocks                   = var.vm_rdp_cidr_blocks
  allow_ssh                         = var.vm_allow_ssh
  ssh_cidr_blocks                   = var.vm_ssh_cidr_blocks
  custom_ingress_rules              = var.vm_custom_ingress_rules

  common_tags = var.common_tags
}

# S3 Module (conditional)
module "s3_bucket" {
  count  = var.enable_object_storage ? 1 : 0
  source = "../../modules/aws_s3"

  cluster_name                       = var.cluster_name
  bucket_name                        = var.object_storage_bucket
  force_destroy                      = var.s3_force_destroy
  enable_versioning                  = var.s3_enable_versioning
  encryption_type                    = var.s3_encryption_type
  kms_key_id                         = var.s3_kms_key_id
  block_public_access                = var.s3_block_public_access
  allow_eks_access                   = var.s3_allow_eks_access
  eks_role_arns                      = [module.eks_cluster.node_iam_role_arn]
  lifecycle_rules                    = var.s3_lifecycle_rules
  cors_rules                         = var.s3_cors_rules
  enable_logging                     = var.s3_enable_logging
  logging_target_bucket              = var.s3_logging_target_bucket
  logging_target_prefix              = var.s3_logging_target_prefix
  enable_object_lock                 = var.s3_enable_object_lock
  object_lock_mode                   = var.s3_object_lock_mode
  object_lock_retention_days         = var.s3_object_lock_retention_days
  enable_replication                 = var.s3_enable_replication
  replication_destination_bucket_arn = var.s3_replication_destination_bucket_arn
  replication_storage_class          = var.s3_replication_storage_class

  common_tags = var.common_tags
}

# EFS Module (conditional) - Uses private subnets
module "efs" {
  count  = var.enable_file_storage ? 1 : 0
  source = "../../modules/aws_efs"

  cluster_name                    = var.cluster_name
  efs_name                        = var.efs_name
  vpc_id                          = local.vpc_id
  vpc_cidr                        = local.vpc_cidr
  subnet_ids                      = local.private_subnets # Private subnets only
  performance_mode                = var.efs_performance_mode
  throughput_mode                 = var.efs_throughput_mode
  provisioned_throughput_in_mibps = var.efs_provisioned_throughput_in_mibps
  kms_key_id                      = var.efs_kms_key_id
  transition_to_ia_days           = var.efs_transition_to_ia_days
  transition_to_archive_days      = var.efs_transition_to_archive_days
  enable_automatic_backups        = var.efs_enable_automatic_backups
  access_points                   = var.efs_access_points
  create_efs_csi_policy           = var.efs_create_csi_policy
  file_system_policy              = var.efs_file_system_policy

  common_tags = var.common_tags
}

# ECR Module (always create for container deployments)
module "ecr" {
  source = "../../modules/aws_ecr"

  cluster_name                  = var.cluster_name
  repository_name               = var.ecr_repository_name
  image_tag_mutability          = var.ecr_image_tag_mutability
  scan_on_push                  = var.ecr_scan_on_push
  enable_scan_logging           = var.ecr_enable_scan_logging
  scan_log_retention_days       = var.ecr_scan_log_retention_days
  encryption_type               = var.ecr_encryption_type
  kms_key_id                    = var.ecr_kms_key_id
  enable_lifecycle_policy       = var.ecr_enable_lifecycle_policy
  lifecycle_policy_json         = var.ecr_lifecycle_policy_json
  keep_last_n_images            = var.ecr_keep_last_n_images
  untagged_image_retention_days = var.ecr_untagged_image_retention_days
  repository_policy_json        = var.ecr_repository_policy_json
  allow_eks_access              = var.ecr_allow_eks_access
  eks_role_arns                 = [module.eks_cluster.node_iam_role_arn]
  enable_replication            = var.ecr_enable_replication
  replication_destinations      = var.ecr_replication_destinations
  pull_through_cache_rules      = var.ecr_pull_through_cache_rules
  create_ecr_access_policy      = var.ecr_create_access_policy

  common_tags = var.common_tags
}
