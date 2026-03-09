# AWS IAM roles and policies (AWS-specific)
# Terraform manages these idempotently - creates if missing, updates if changed

locals {
  is_aws               = var.cloud_provider == "aws"
  cluster_role_name    = "${var.cluster_name}-cluster-role"
  node_group_role_name = "${var.cluster_name}-node-group-role"
}

# Create cluster role for AWS deployments
resource "aws_iam_role" "eks_cluster" {
  count = local.is_aws ? 1 : 0

  name = local.cluster_role_name

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "eks.amazonaws.com"
      }
    }]
  })

  tags = merge(var.common_tags, { Name = local.cluster_role_name })

  lifecycle {
    prevent_destroy = false
    ignore_changes  = [tags]
  }
}

resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  count = local.is_aws ? 1 : 0

  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.eks_cluster[0].name
}

# Create node group role for AWS deployments
resource "aws_iam_role" "eks_node_group" {
  count = local.is_aws ? 1 : 0

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

  tags = merge(var.common_tags, { Name = local.node_group_role_name })

  lifecycle {
    prevent_destroy = false
    ignore_changes  = [tags]
  }
}

resource "aws_iam_role_policy_attachment" "eks_node_group_policy" {
  count = local.is_aws ? 1 : 0

  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
  role       = aws_iam_role.eks_node_group[0].name
}

resource "aws_iam_role_policy_attachment" "eks_cni_policy" {
  count = local.is_aws ? 1 : 0

  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  role       = aws_iam_role.eks_node_group[0].name
}

resource "aws_iam_role_policy_attachment" "eks_registry_policy" {
  count = local.is_aws ? 1 : 0

  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  role       = aws_iam_role.eks_node_group[0].name
}

# Outputs for role ARNs
locals {
  eks_cluster_role_arn    = local.is_aws ? aws_iam_role.eks_cluster[0].arn : ""
  eks_node_group_role_arn = local.is_aws ? aws_iam_role.eks_node_group[0].arn : ""
}

# ============================================================================
# OIDC Provider for IRSA (IAM Roles for Service Accounts)
# ============================================================================

data "tls_certificate" "cluster" {
  count = local.is_aws ? 1 : 0
  url   = aws_eks_cluster.main[0].identity[0].oidc[0].issuer
}

resource "aws_iam_openid_connect_provider" "cluster" {
  count = local.is_aws ? 1 : 0

  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.cluster[0].certificates[0].sha1_fingerprint]
  url             = aws_eks_cluster.main[0].identity[0].oidc[0].issuer

  tags = merge(
    var.common_tags,
    {
      Name = "${var.cluster_name}-oidc-provider"
    }
  )
}

locals {
  oidc_provider_id  = local.is_aws ? replace(aws_eks_cluster.main[0].identity[0].oidc[0].issuer, "https://", "") : ""
  oidc_provider_arn = local.is_aws ? aws_iam_openid_connect_provider.cluster[0].arn : ""
}

# ============================================================================
# S3 CSI Driver IAM Role (IRSA) — Task 5.1
# ============================================================================

resource "aws_iam_role" "s3_csi_driver" {
  count = local.is_aws && var.enable_s3_csi ? 1 : 0

  name = "${var.cluster_name}-s3-csi-driver-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = local.oidc_provider_arn
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "${local.oidc_provider_id}:aud" = "sts.amazonaws.com"
          "${local.oidc_provider_id}:sub" = "system:serviceaccount:kube-system:s3-csi-driver-sa"
        }
      }
    }]
  })

  tags = merge(var.common_tags, { Name = "${var.cluster_name}-s3-csi-driver-role" })
}

resource "aws_iam_policy" "s3_csi_driver" {
  count = local.is_aws && var.enable_s3_csi ? 1 : 0

  name        = "${var.cluster_name}-S3CSIDriverPolicy"
  description = "Policy for Mountpoint for Amazon S3 CSI Driver"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket",
          "s3:DeleteObject",
          "s3:GetBucketLocation",
          "s3:AbortMultipartUpload",
          "s3:ListMultipartUploadParts"
        ]
        Resource = "*"
      }
    ]
  })

  tags = var.common_tags
}

resource "aws_iam_role_policy_attachment" "s3_csi_driver" {
  count = local.is_aws && var.enable_s3_csi ? 1 : 0

  policy_arn = aws_iam_policy.s3_csi_driver[0].arn
  role       = aws_iam_role.s3_csi_driver[0].name
}

# ============================================================================
# ALB Controller IAM Role (IRSA) — Task 5.2
# ============================================================================

resource "aws_iam_role" "alb_controller" {
  count = local.is_aws && var.enable_alb_controller ? 1 : 0

  name = "${var.cluster_name}-alb-controller-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = local.oidc_provider_arn
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "${local.oidc_provider_id}:aud" = "sts.amazonaws.com"
          "${local.oidc_provider_id}:sub" = "system:serviceaccount:kube-system:aws-load-balancer-controller"
        }
      }
    }]
  })

  tags = merge(var.common_tags, { Name = "${var.cluster_name}-alb-controller-role" })
}

resource "aws_iam_policy" "alb_controller" {
  count = local.is_aws && var.enable_alb_controller ? 1 : 0

  name        = "${var.cluster_name}-AWSLoadBalancerControllerPolicy"
  description = "Policy for AWS Load Balancer Controller"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "iam:CreateServiceLinkedRole"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "iam:AWSServiceName" = "elasticloadbalancing.amazonaws.com"
          }
        }
      },
      {
        Effect = "Allow"
        Action = [
          "ec2:DescribeAccountAttributes",
          "ec2:DescribeAddresses",
          "ec2:DescribeAvailabilityZones",
          "ec2:DescribeInternetGateways",
          "ec2:DescribeVpcs",
          "ec2:DescribeVpcPeeringConnections",
          "ec2:DescribeSubnets",
          "ec2:DescribeSecurityGroups",
          "ec2:DescribeInstances",
          "ec2:DescribeNetworkInterfaces",
          "ec2:DescribeTags",
          "ec2:DescribeCoipPools",
          "ec2:GetCoipPoolUsage",
          "elasticloadbalancing:DescribeLoadBalancers",
          "elasticloadbalancing:DescribeLoadBalancerAttributes",
          "elasticloadbalancing:DescribeListeners",
          "elasticloadbalancing:DescribeListenerCertificates",
          "elasticloadbalancing:DescribeSSLPolicies",
          "elasticloadbalancing:DescribeRules",
          "elasticloadbalancing:DescribeTargetGroups",
          "elasticloadbalancing:DescribeTargetGroupAttributes",
          "elasticloadbalancing:DescribeTargetHealth",
          "elasticloadbalancing:DescribeTags",
          "elasticloadbalancing:DescribeTrustStores"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "cognito-idp:DescribeUserPoolClient",
          "acm:ListCertificates",
          "acm:DescribeCertificate",
          "iam:ListServerCertificates",
          "iam:GetServerCertificate",
          "waf-regional:GetWebACL",
          "waf-regional:GetWebACLForResource",
          "waf-regional:AssociateWebACL",
          "waf-regional:DisassociateWebACL",
          "wafv2:GetWebACL",
          "wafv2:GetWebACLForResource",
          "wafv2:AssociateWebACL",
          "wafv2:DisassociateWebACL",
          "shield:GetSubscriptionState",
          "shield:DescribeProtection",
          "shield:CreateProtection",
          "shield:DeleteProtection"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ec2:AuthorizeSecurityGroupIngress",
          "ec2:RevokeSecurityGroupIngress",
          "ec2:CreateSecurityGroup",
          "ec2:DeleteSecurityGroup",
          "ec2:CreateTags",
          "ec2:DeleteTags"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "elasticloadbalancing:CreateLoadBalancer",
          "elasticloadbalancing:CreateTargetGroup",
          "elasticloadbalancing:CreateListener",
          "elasticloadbalancing:CreateRule",
          "elasticloadbalancing:DeleteLoadBalancer",
          "elasticloadbalancing:DeleteTargetGroup",
          "elasticloadbalancing:DeleteListener",
          "elasticloadbalancing:DeleteRule",
          "elasticloadbalancing:ModifyLoadBalancerAttributes",
          "elasticloadbalancing:ModifyTargetGroup",
          "elasticloadbalancing:ModifyTargetGroupAttributes",
          "elasticloadbalancing:ModifyListener",
          "elasticloadbalancing:ModifyRule",
          "elasticloadbalancing:AddTags",
          "elasticloadbalancing:RemoveTags",
          "elasticloadbalancing:RegisterTargets",
          "elasticloadbalancing:DeregisterTargets",
          "elasticloadbalancing:SetWebACL",
          "elasticloadbalancing:SetIpAddressType",
          "elasticloadbalancing:SetSecurityGroups",
          "elasticloadbalancing:SetSubnets",
          "elasticloadbalancing:AddListenerCertificates",
          "elasticloadbalancing:RemoveListenerCertificates"
        ]
        Resource = "*"
      }
    ]
  })

  tags = var.common_tags
}

resource "aws_iam_role_policy_attachment" "alb_controller" {
  count = local.is_aws && var.enable_alb_controller ? 1 : 0

  policy_arn = aws_iam_policy.alb_controller[0].arn
  role       = aws_iam_role.alb_controller[0].name
}

# ============================================================================
# Cluster Autoscaler IAM Role (IRSA) — Task 5.3
# ============================================================================

resource "aws_iam_role" "cluster_autoscaler" {
  count = local.is_aws && var.enable_cluster_autoscaler ? 1 : 0

  name = "${var.cluster_name}-cluster-autoscaler-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = local.oidc_provider_arn
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "${local.oidc_provider_id}:aud" = "sts.amazonaws.com"
          "${local.oidc_provider_id}:sub" = "system:serviceaccount:kube-system:cluster-autoscaler"
        }
      }
    }]
  })

  tags = merge(var.common_tags, { Name = "${var.cluster_name}-cluster-autoscaler-role" })
}

resource "aws_iam_policy" "cluster_autoscaler" {
  count = local.is_aws && var.enable_cluster_autoscaler ? 1 : 0

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
  count = local.is_aws && var.enable_cluster_autoscaler ? 1 : 0

  policy_arn = aws_iam_policy.cluster_autoscaler[0].arn
  role       = aws_iam_role.cluster_autoscaler[0].name
}

# ---------------------------------------------------------------------------
# Phase 6.2 — Amazon Inspector v2 (ECR image scanning)
# ---------------------------------------------------------------------------

resource "aws_inspector2_enabler" "ecr_scanning" {
  count = local.is_aws && var.enable_security_scanning ? 1 : 0

  account_ids    = [data.aws_caller_identity.current[0].account_id]
  resource_types = ["ECR"]
}

data "aws_caller_identity" "current" {
  count = local.is_aws ? 1 : 0
}

# ---------------------------------------------------------------------------
# Phase 6.4 — Deployment IAM user (programmatic access for CI/CD)
# ---------------------------------------------------------------------------

resource "aws_iam_user" "deployment" {
  count = local.is_aws && var.create_iam_user ? 1 : 0

  name = "${var.cluster_name}-deployer"
  path = "/zlaws/"

  tags = merge(var.common_tags, {
    Purpose = "ZLAWS deployment automation"
  })
}

resource "aws_iam_user_policy" "deployment" {
  count = local.is_aws && var.create_iam_user ? 1 : 0

  name = "${var.cluster_name}-deployer-policy"
  user = aws_iam_user.deployment[0].name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "EKSAccess"
        Effect = "Allow"
        Action = [
          "eks:DescribeCluster",
          "eks:ListClusters",
          "eks:AccessKubernetesApi"
        ]
        Resource = aws_eks_cluster.main[0].arn
      },
      {
        Sid    = "ECRAccess"
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload"
        ]
        Resource = "*"
      },
      {
        Sid    = "S3ModelAccess"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "aws:ResourceTag/Project" = "zlaws"
          }
        }
      }
    ]
  })
}

resource "aws_iam_access_key" "deployment" {
  count = local.is_aws && var.create_iam_user ? 1 : 0
  user  = aws_iam_user.deployment[0].name
}
