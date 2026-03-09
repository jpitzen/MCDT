# ============================================================================
# Resource Group Outputs
# ============================================================================

output "resource_group_arn" {
  description = "ARN of the AWS Resource Group"
  value       = var.create_resource_group && length(module.resource_group) > 0 ? module.resource_group[0].resource_group_arn : null
}

output "resource_group_name" {
  description = "Name of the AWS Resource Group"
  value       = var.create_resource_group && length(module.resource_group) > 0 ? module.resource_group[0].resource_group_name : null
}

# ============================================================================
# EKS Cluster Outputs
# ============================================================================

output "cluster_id" {
  description = "EKS cluster ID"
  value       = module.eks_cluster.cluster_id
}

output "cluster_name" {
  description = "EKS cluster name"
  value       = module.eks_cluster.cluster_name
}

output "cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = module.eks_cluster.cluster_endpoint
  sensitive   = true
}

output "cluster_ca_certificate" {
  description = "EKS cluster CA certificate"
  value       = module.eks_cluster.cluster_certificate_authority_data
  sensitive   = true
}

output "cluster_arn" {
  description = "EKS cluster ARN"
  value       = module.eks_cluster.cluster_arn
}

output "cluster_version" {
  description = "EKS cluster version"
  value       = module.eks_cluster.cluster_version
}

output "node_group_id" {
  description = "EKS node group ID"
  value       = module.eks_cluster.node_group_id
}

output "cluster_security_group_id" {
  description = "EKS cluster security group ID"
  value       = module.eks_cluster.cluster_security_group_id
}

# =============================================================================
# CSI Driver Outputs
# =============================================================================

output "ebs_csi_driver_addon_version" {
  description = "Version of the EBS CSI driver addon"
  value       = var.enable_ebs_csi_driver ? module.eks_cluster.ebs_csi_driver_addon_version : null
}

output "ebs_csi_driver_role_arn" {
  description = "IAM role ARN for EBS CSI driver"
  value       = var.enable_ebs_csi_driver ? module.eks_cluster.ebs_csi_driver_role_arn : null
}

output "efs_csi_driver_addon_version" {
  description = "Version of the EFS CSI driver addon"
  value       = var.enable_efs_csi_driver ? module.eks_cluster.efs_csi_driver_addon_version : null
}

output "efs_csi_driver_role_arn" {
  description = "IAM role ARN for EFS CSI driver"
  value       = var.enable_efs_csi_driver ? module.eks_cluster.efs_csi_driver_role_arn : null
}

# =============================================================================
# Cluster Autoscaler Outputs
# =============================================================================

output "cluster_autoscaler_role_arn" {
  description = "IAM role ARN for Cluster Autoscaler"
  value       = var.enable_cluster_autoscaler ? module.eks_cluster.cluster_autoscaler_role_arn : null
}

output "cluster_autoscaler_policy_arn" {
  description = "IAM policy ARN for Cluster Autoscaler"
  value       = var.enable_cluster_autoscaler ? module.eks_cluster.cluster_autoscaler_policy_arn : null
}

output "node_group_asg_name" {
  description = "Name of the Auto Scaling Group for the node group"
  value       = module.eks_cluster.node_group_asg_name
}

# =============================================================================
# Private Cluster Outputs
# =============================================================================

output "endpoint_public_access" {
  description = "Whether the EKS cluster endpoint is publicly accessible"
  value       = module.eks_cluster.endpoint_public_access
}

output "endpoint_private_access" {
  description = "Whether the EKS cluster endpoint is privately accessible"
  value       = module.eks_cluster.endpoint_private_access
}

output "vpc_id" {
  description = "VPC ID"
  value       = var.create_vpc ? aws_vpc.main[0].id : var.vpc_id
}

output "public_subnets" {
  description = "Public Subnet IDs (for ALB, NAT Gateway)"
  value       = var.create_vpc ? aws_subnet.public[*].id : []
}

output "private_subnets" {
  description = "Private Subnet IDs (for EKS, RDS, EC2, EFS)"
  value       = var.create_vpc ? aws_subnet.private[*].id : var.aws_subnets
}

output "subnets" {
  description = "All Subnet IDs (deprecated - use public_subnets or private_subnets)"
  value       = var.create_vpc ? concat(aws_subnet.public[*].id, aws_subnet.private[*].id) : var.aws_subnets
}

output "nat_gateway_ids" {
  description = "NAT Gateway IDs"
  value       = var.create_vpc ? aws_nat_gateway.main[*].id : []
}

output "nat_gateway_public_ips" {
  description = "NAT Gateway Public IPs"
  value       = var.create_vpc ? aws_eip.nat[*].public_ip : []
}

# =============================================================================
# RDS Outputs
# =============================================================================

output "db_endpoint" {
  description = "RDS database endpoint"
  value       = var.enable_rds ? module.rds[0].db_endpoint : null
}

output "db_address" {
  description = "RDS database address"
  value       = var.enable_rds ? module.rds[0].db_address : null
}

output "db_port" {
  description = "RDS database port"
  value       = var.enable_rds ? module.rds[0].db_port : null
}

output "db_name" {
  description = "RDS database name"
  value       = var.enable_rds ? module.rds[0].db_name : null
}

output "db_username" {
  description = "RDS master username"
  value       = var.enable_rds ? module.rds[0].db_username : null
  sensitive   = true
}

output "db_password" {
  description = "RDS master password"
  value       = var.enable_rds ? module.rds[0].db_password : null
  sensitive   = true
}

output "db_connection_string" {
  description = "RDS connection string"
  value       = var.enable_rds ? module.rds[0].connection_string : null
  sensitive   = true
}

# =============================================================================
# EC2 Outputs
# =============================================================================

output "vm_instance_ids" {
  description = "EC2 instance IDs"
  value       = var.enable_additional_vms ? module.ec2_vms[0].instance_ids : []
}

output "vm_private_ips" {
  description = "EC2 private IP addresses"
  value       = var.enable_additional_vms ? module.ec2_vms[0].instance_private_ips : []
}

output "vm_public_ips" {
  description = "EC2 public IP addresses"
  value       = var.enable_additional_vms ? module.ec2_vms[0].instance_public_ips : []
}

output "vm_private_key" {
  description = "SSH private key (if created)"
  value       = var.enable_additional_vms ? module.ec2_vms[0].private_key_pem : null
  sensitive   = true
}

output "vm_windows_password" {
  description = "Windows Administrator password"
  value       = var.enable_additional_vms ? module.ec2_vms[0].windows_admin_password : null
  sensitive   = true
}

# =============================================================================
# S3 Outputs
# =============================================================================

output "s3_bucket_name" {
  description = "S3 bucket name"
  value       = var.enable_object_storage ? module.s3_bucket[0].bucket_name : null
}

output "s3_bucket_arn" {
  description = "S3 bucket ARN"
  value       = var.enable_object_storage ? module.s3_bucket[0].bucket_arn : null
}

output "s3_bucket_domain_name" {
  description = "S3 bucket domain name"
  value       = var.enable_object_storage ? module.s3_bucket[0].bucket_domain_name : null
}

# =============================================================================
# EFS Outputs
# =============================================================================

output "efs_file_system_id" {
  description = "EFS file system ID"
  value       = var.enable_file_storage ? module.efs[0].file_system_id : null
}

output "efs_file_system_dns_name" {
  description = "EFS file system DNS name"
  value       = var.enable_file_storage ? module.efs[0].file_system_dns_name : null
}

output "efs_mount_command" {
  description = "EFS mount command"
  value       = var.enable_file_storage ? module.efs[0].mount_command : null
}

# =============================================================================
# ECR Outputs
# =============================================================================

output "ecr_repository_url" {
  description = "ECR repository URL"
  value       = module.ecr.repository_url
}

output "ecr_repository_arn" {
  description = "ECR repository ARN"
  value       = module.ecr.repository_arn
}

output "ecr_docker_login_command" {
  description = "Docker login command for ECR"
  value       = module.ecr.docker_login_command
  sensitive   = true
}
