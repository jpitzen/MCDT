# AWS IAM roles and policies for EKS
# Terraform manages these resources idempotently - it will create if missing,
# update if changed, or do nothing if they already match the desired state.
#
# For re-deployments: Terraform state tracks these resources.
# If resources exist but aren't in state, use: terraform import

locals {
  cluster_role_name    = "${var.cluster_name}-cluster-role"
  node_group_role_name = "${var.cluster_name}-node-group-role"
}

# =============================================================================
# EKS Cluster IAM Role
# =============================================================================

resource "aws_iam_role" "eks_cluster" {
  name = local.cluster_role_name

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = [
        "sts:AssumeRole",
        "sts:TagSession"
      ]
      Effect = "Allow"
      Principal = {
        Service = "eks.amazonaws.com"
      }
    }]
  })

  tags = merge(
    var.common_tags,
    {
      Name = local.cluster_role_name
    }
  )

  lifecycle {
    # Prevent accidental deletion, allow updates
    prevent_destroy = false
    # Ignore tag changes from external sources
    ignore_changes = [tags]
  }
}

# Attach required AWS managed policies for EKS cluster
resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.eks_cluster.name
}

resource "aws_iam_role_policy_attachment" "eks_block_storage_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSBlockStoragePolicy"
  role       = aws_iam_role.eks_cluster.name
}

resource "aws_iam_role_policy_attachment" "eks_compute_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSComputePolicy"
  role       = aws_iam_role.eks_cluster.name
}

resource "aws_iam_role_policy_attachment" "eks_load_balancing_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSLoadBalancingPolicy"
  role       = aws_iam_role.eks_cluster.name
}

resource "aws_iam_role_policy_attachment" "eks_networking_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSNetworkingPolicy"
  role       = aws_iam_role.eks_cluster.name
}

# =============================================================================
# EKS Node Group IAM Role
# =============================================================================

resource "aws_iam_role" "eks_node_group" {
  name = local.node_group_role_name

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })

  tags = merge(
    var.common_tags,
    {
      Name = local.node_group_role_name
    }
  )

  lifecycle {
    prevent_destroy = false
    ignore_changes  = [tags]
  }
}

resource "aws_iam_role_policy_attachment" "eks_node_group_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
  role       = aws_iam_role.eks_node_group.name
}

resource "aws_iam_role_policy_attachment" "eks_cni_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  role       = aws_iam_role.eks_node_group.name
}

resource "aws_iam_role_policy_attachment" "eks_registry_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  role       = aws_iam_role.eks_node_group.name
}

# =============================================================================
# Output locals for use in main.tf
# =============================================================================

locals {
  cluster_role_arn = aws_iam_role.eks_cluster.arn
  node_role_arn    = aws_iam_role.eks_node_group.arn
  
  # OIDC provider ID for IRSA
  oidc_provider_id = replace(aws_eks_cluster.main.identity[0].oidc[0].issuer, "https://", "")
}

# =============================================================================
# EBS CSI Driver IAM Role (IRSA)
# =============================================================================

resource "aws_iam_role" "ebs_csi" {
  count = var.enable_ebs_csi_driver ? 1 : 0

  name = "${var.cluster_name}-ebs-csi-driver-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = aws_iam_openid_connect_provider.cluster.arn
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "${local.oidc_provider_id}:aud" = "sts.amazonaws.com"
          "${local.oidc_provider_id}:sub" = "system:serviceaccount:kube-system:ebs-csi-controller-sa"
        }
      }
    }]
  })

  tags = merge(
    var.common_tags,
    {
      Name = "${var.cluster_name}-ebs-csi-driver-role"
    }
  )
}

resource "aws_iam_role_policy_attachment" "ebs_csi" {
  count = var.enable_ebs_csi_driver ? 1 : 0

  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy"
  role       = aws_iam_role.ebs_csi[0].name
}

# =============================================================================
# EFS CSI Driver IAM Role (IRSA)
# =============================================================================

resource "aws_iam_role" "efs_csi" {
  count = var.enable_efs_csi_driver ? 1 : 0

  name = "${var.cluster_name}-efs-csi-driver-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = aws_iam_openid_connect_provider.cluster.arn
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "${local.oidc_provider_id}:aud" = "sts.amazonaws.com"
          "${local.oidc_provider_id}:sub" = "system:serviceaccount:kube-system:efs-csi-controller-sa"
        }
      }
    }]
  })

  tags = merge(
    var.common_tags,
    {
      Name = "${var.cluster_name}-efs-csi-driver-role"
    }
  )
}

resource "aws_iam_role_policy_attachment" "efs_csi" {
  count = var.enable_efs_csi_driver ? 1 : 0

  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEFSCSIDriverPolicy"
  role       = aws_iam_role.efs_csi[0].name
}

# =============================================================================
# Cluster Autoscaler IAM Role (IRSA)
# =============================================================================

resource "aws_iam_role" "cluster_autoscaler" {
  count = var.enable_cluster_autoscaler ? 1 : 0

  name = "${var.cluster_name}-cluster-autoscaler-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = aws_iam_openid_connect_provider.cluster.arn
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "${local.oidc_provider_id}:aud" = "sts.amazonaws.com"
          "${local.oidc_provider_id}:sub" = "system:serviceaccount:${var.autoscaler_namespace}:${var.autoscaler_service_account}"
        }
      }
    }]
  })

  tags = merge(
    var.common_tags,
    {
      Name = "${var.cluster_name}-cluster-autoscaler-role"
    }
  )
}

resource "aws_iam_policy" "cluster_autoscaler" {
  count = var.enable_cluster_autoscaler ? 1 : 0

  name        = "${var.cluster_name}-ClusterAutoscalerPolicy"
  description = "Policy for Kubernetes Cluster Autoscaler"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "autoscaling:DescribeAutoScalingGroups",
          "autoscaling:DescribeAutoScalingInstances",
          "autoscaling:DescribeLaunchConfigurations",
          "autoscaling:DescribeScalingActivities",
          "autoscaling:DescribeTags",
          "ec2:DescribeImages",
          "ec2:DescribeInstanceTypes",
          "ec2:DescribeLaunchTemplateVersions",
          "ec2:GetInstanceTypesFromInstanceRequirements",
          "eks:DescribeNodegroup"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "autoscaling:SetDesiredCapacity",
          "autoscaling:TerminateInstanceInAutoScalingGroup"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "aws:ResourceTag/k8s.io/cluster-autoscaler/${var.cluster_name}" = "owned"
          }
        }
      }
    ]
  })

  tags = var.common_tags
}

resource "aws_iam_role_policy_attachment" "cluster_autoscaler" {
  count = var.enable_cluster_autoscaler ? 1 : 0

  policy_arn = aws_iam_policy.cluster_autoscaler[0].arn
  role       = aws_iam_role.cluster_autoscaler[0].name
}
