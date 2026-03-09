# Outputs for AWS EKS module

output "cluster_id" {
  description = "EKS cluster ID"
  value       = aws_eks_cluster.main.id
}

output "cluster_name" {
  description = "EKS cluster name"
  value       = aws_eks_cluster.main.name
}

output "cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = aws_eks_cluster.main.endpoint
}

output "cluster_version" {
  description = "EKS cluster Kubernetes version"
  value       = aws_eks_cluster.main.version
}

output "cluster_arn" {
  description = "EKS cluster ARN"
  value       = aws_eks_cluster.main.arn
}

output "cluster_certificate_authority_data" {
  description = "Base64 encoded certificate data for cluster authentication"
  value       = aws_eks_cluster.main.certificate_authority[0].data
  sensitive   = true
}

output "node_group_id" {
  description = "EKS node group ID"
  value       = aws_eks_node_group.main.id
}

output "node_group_arn" {
  description = "EKS node group ARN"
  value       = aws_eks_node_group.main.arn
}

output "node_group_status" {
  description = "EKS node group status"
  value       = aws_eks_node_group.main.status
}

output "cluster_security_group_id" {
  description = "Security group ID attached to the EKS cluster"
  value       = aws_eks_cluster.main.vpc_config[0].cluster_security_group_id
}

output "platform_version" {
  description = "EKS platform version"
  value       = aws_eks_cluster.main.platform_version
}

output "cluster_iam_role_arn" {
  description = "IAM role ARN of the EKS cluster"
  value       = local.cluster_role_arn
}

output "node_iam_role_arn" {
  description = "IAM role ARN of the EKS node group"
  value       = local.node_role_arn
}

output "oidc_provider_arn" {
  description = "ARN of the OIDC provider for the EKS cluster"
  value       = aws_iam_openid_connect_provider.cluster.arn
}

output "oidc_provider_url" {
  description = "URL of the OIDC provider for the EKS cluster"
  value       = aws_eks_cluster.main.identity[0].oidc[0].issuer
}

# =============================================================================
# CSI Driver Outputs
# =============================================================================

output "ebs_csi_driver_addon_version" {
  description = "Version of the EBS CSI driver addon"
  value       = var.enable_ebs_csi_driver ? aws_eks_addon.ebs_csi[0].addon_version : null
}

output "ebs_csi_driver_role_arn" {
  description = "IAM role ARN for EBS CSI driver"
  value       = var.enable_ebs_csi_driver ? aws_iam_role.ebs_csi[0].arn : null
}

output "efs_csi_driver_addon_version" {
  description = "Version of the EFS CSI driver addon"
  value       = var.enable_efs_csi_driver ? aws_eks_addon.efs_csi[0].addon_version : null
}

output "efs_csi_driver_role_arn" {
  description = "IAM role ARN for EFS CSI driver"
  value       = var.enable_efs_csi_driver ? aws_iam_role.efs_csi[0].arn : null
}

# =============================================================================
# Cluster Autoscaler Outputs
# =============================================================================

output "cluster_autoscaler_role_arn" {
  description = "IAM role ARN for Cluster Autoscaler"
  value       = var.enable_cluster_autoscaler ? aws_iam_role.cluster_autoscaler[0].arn : null
}

output "cluster_autoscaler_policy_arn" {
  description = "IAM policy ARN for Cluster Autoscaler"
  value       = var.enable_cluster_autoscaler ? aws_iam_policy.cluster_autoscaler[0].arn : null
}

# =============================================================================
# Endpoint Configuration
# =============================================================================

output "endpoint_public_access" {
  description = "Whether the EKS cluster endpoint is publicly accessible"
  value       = var.endpoint_public_access
}

output "endpoint_private_access" {
  description = "Whether the EKS cluster endpoint is privately accessible"
  value       = var.endpoint_private_access
}

output "node_group_asg_name" {
  description = "Name of the Auto Scaling Group for the node group"
  value       = aws_eks_node_group.main.resources[0].autoscaling_groups[0].name
}
