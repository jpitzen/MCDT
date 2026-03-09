# AWS ECR Module - Elastic Container Registry
# Provides private container image registry with scanning and lifecycle policies

# ECR Repository
resource "aws_ecr_repository" "main" {
  name                 = var.repository_name != "" ? var.repository_name : var.cluster_name
  image_tag_mutability = var.image_tag_mutability

  # Image scanning
  image_scanning_configuration {
    scan_on_push = var.scan_on_push
  }

  # Encryption
  encryption_configuration {
    encryption_type = var.encryption_type
    kms_key         = var.encryption_type == "KMS" ? var.kms_key_id : null
  }

  tags = merge(
    var.common_tags,
    {
      Name = var.repository_name != "" ? var.repository_name : var.cluster_name
    }
  )

  lifecycle {
    ignore_changes = [name]
  }
}

# ECR Lifecycle Policy
resource "aws_ecr_lifecycle_policy" "main" {
  count      = var.enable_lifecycle_policy ? 1 : 0
  repository = aws_ecr_repository.main.name

  policy = var.lifecycle_policy_json != "" ? var.lifecycle_policy_json : jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Remove untagged images older than ${var.untagged_image_retention_days} days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = var.untagged_image_retention_days
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Keep last ${var.keep_last_n_images} images"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = var.keep_last_n_images
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

# ECR Repository Policy (for cross-account or service access)
resource "aws_ecr_repository_policy" "main" {
  count      = var.repository_policy_json != "" || var.allow_eks_access ? 1 : 0
  repository = aws_ecr_repository.main.name

  policy = var.repository_policy_json != "" ? var.repository_policy_json : jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowEKSAccess"
        Effect = "Allow"
        Principal = {
          AWS = var.eks_role_arns
        }
        Action = [
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:BatchCheckLayerAvailability",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:DescribeRepositories",
          "ecr:GetRepositoryPolicy",
          "ecr:ListImages"
        ]
      }
    ]
  })
}

# ECR Replication Configuration (for cross-region replication)
resource "aws_ecr_replication_configuration" "main" {
  count = var.enable_replication ? 1 : 0

  replication_configuration {
    rule {
      dynamic "destination" {
        for_each = var.replication_destinations
        content {
          region      = destination.value.region
          registry_id = destination.value.registry_id
        }
      }
    }
  }
}

# ECR Pull Through Cache Rules (for caching public images)
resource "aws_ecr_pull_through_cache_rule" "main" {
  for_each = var.pull_through_cache_rules

  ecr_repository_prefix = each.value.ecr_repository_prefix
  upstream_registry_url = each.value.upstream_registry_url
}

# IAM Policy for EKS to access ECR
resource "aws_iam_policy" "ecr_access" {
  count = var.create_ecr_access_policy ? 1 : 0

  name        = "${var.cluster_name}-ecr-access-policy"
  description = "Policy for EKS to access ECR in ${var.cluster_name}"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:DescribeRepositories",
          "ecr:DescribeImages",
          "ecr:ListImages"
        ]
        Resource = aws_ecr_repository.main.arn
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload"
        ]
        Resource = aws_ecr_repository.main.arn
      }
    ]
  })

  tags = var.common_tags
}

# CloudWatch Log Group for ECR scanning
resource "aws_cloudwatch_log_group" "ecr_scan" {
  count = var.enable_scan_logging ? 1 : 0

  name              = "/aws/ecr/${aws_ecr_repository.main.name}/scan"
  retention_in_days = var.scan_log_retention_days

  tags = var.common_tags
}
