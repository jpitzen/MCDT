# AWS EKS Kubernetes Cluster Module
# Creates AWS EKS cluster with managed node groups
# Supports AWS Commercial and GovCloud regions

resource "aws_eks_cluster" "main" {
  name     = var.cluster_name
  version  = var.kubernetes_version
  role_arn = local.cluster_role_arn

  vpc_config {
    subnet_ids              = var.subnets
    endpoint_private_access = var.endpoint_private_access
    endpoint_public_access  = var.endpoint_public_access
  }

  enabled_cluster_log_types = var.enable_logging ? [
    "api",
    "audit",
    "authenticator",
    "controllerManager",
    "scheduler"
  ] : []

  tags = merge(
    var.common_tags,
    {
      Provider = "EKS"
      Name     = var.cluster_name
    }
  )

  # Only depend on policy attachments if creating new roles
  depends_on = [
    aws_iam_role_policy_attachment.eks_cluster_policy
  ]

  lifecycle {
    ignore_changes = [tags]
  }
}

resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "${var.cluster_name}-node-group"
  node_role_arn   = local.node_role_arn
  subnet_ids      = var.subnets
  instance_types  = [var.node_instance_type]

  scaling_config {
    desired_size = var.node_count
    max_size     = var.enable_autoscaling ? var.max_node_count : var.node_count
    min_size     = var.enable_autoscaling ? var.min_node_count : var.node_count
  }

  tags = merge(
    var.common_tags,
    {
      NodeGroup = "${var.cluster_name}-node-group"
      Name      = "${var.cluster_name}-node-group"
    }
  )

  depends_on = [
    aws_iam_role_policy_attachment.eks_node_group_policy,
    aws_iam_role_policy_attachment.eks_cni_policy,
    aws_iam_role_policy_attachment.eks_registry_policy
  ]

  lifecycle {
    ignore_changes = [tags]
  }
}

# OIDC Provider for EKS cluster
# Enables IAM roles for service accounts (IRSA)
data "tls_certificate" "cluster" {
  url = aws_eks_cluster.main.identity[0].oidc[0].issuer
}

resource "aws_iam_openid_connect_provider" "cluster" {
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.cluster.certificates[0].sha1_fingerprint]
  url             = aws_eks_cluster.main.identity[0].oidc[0].issuer

  tags = merge(
    var.common_tags,
    {
      Name = "${var.cluster_name}-oidc-provider"
    }
  )
}

# =============================================================================
# EBS CSI Driver Addon
# =============================================================================

resource "aws_eks_addon" "ebs_csi" {
  count = var.enable_ebs_csi_driver ? 1 : 0

  cluster_name             = aws_eks_cluster.main.name
  addon_name               = "aws-ebs-csi-driver"
  addon_version            = var.ebs_csi_driver_version != "" ? var.ebs_csi_driver_version : null
  service_account_role_arn = aws_iam_role.ebs_csi[0].arn
  resolve_conflicts_on_create = "OVERWRITE"
  resolve_conflicts_on_update = "OVERWRITE"

  tags = merge(
    var.common_tags,
    {
      Name = "${var.cluster_name}-ebs-csi-driver"
    }
  )

  depends_on = [
    aws_eks_node_group.main,
    aws_iam_role_policy_attachment.ebs_csi
  ]
}

# =============================================================================
# EFS CSI Driver Addon
# =============================================================================

resource "aws_eks_addon" "efs_csi" {
  count = var.enable_efs_csi_driver ? 1 : 0

  cluster_name             = aws_eks_cluster.main.name
  addon_name               = "aws-efs-csi-driver"
  addon_version            = var.efs_csi_driver_version != "" ? var.efs_csi_driver_version : null
  service_account_role_arn = aws_iam_role.efs_csi[0].arn
  resolve_conflicts_on_create = "OVERWRITE"
  resolve_conflicts_on_update = "OVERWRITE"

  tags = merge(
    var.common_tags,
    {
      Name = "${var.cluster_name}-efs-csi-driver"
    }
  )

  depends_on = [
    aws_eks_node_group.main,
    aws_iam_role_policy_attachment.efs_csi
  ]
}

# =============================================================================
# Cluster Autoscaler ASG Tags
# Tag the Auto Scaling Group to enable cluster autoscaler discovery
# =============================================================================

resource "aws_autoscaling_group_tag" "cluster_autoscaler_enabled" {
  count = var.enable_cluster_autoscaler ? 1 : 0

  autoscaling_group_name = aws_eks_node_group.main.resources[0].autoscaling_groups[0].name

  tag {
    key                 = "k8s.io/cluster-autoscaler/enabled"
    value               = "true"
    propagate_at_launch = true
  }
}

resource "aws_autoscaling_group_tag" "cluster_autoscaler_owned" {
  count = var.enable_cluster_autoscaler ? 1 : 0

  autoscaling_group_name = aws_eks_node_group.main.resources[0].autoscaling_groups[0].name

  tag {
    key                 = "k8s.io/cluster-autoscaler/${var.cluster_name}"
    value               = "owned"
    propagate_at_launch = true
  }
}
