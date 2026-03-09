# AWS EFS Module - Elastic File System for shared storage
# Provides scalable, elastic NFS file system for use with EKS and EC2

# Security Group for EFS
resource "aws_security_group" "efs" {
  name        = "${var.cluster_name}-efs-sg"
  description = "Security group for EFS mount targets"
  vpc_id      = var.vpc_id

  # NFS access from VPC
  ingress {
    from_port   = 2049
    to_port     = 2049
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
    description = "NFS access from VPC"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = merge(
    var.common_tags,
    {
      Name = "${var.cluster_name}-efs-sg"
    }
  )
}

# EFS File System
resource "aws_efs_file_system" "main" {
  creation_token = var.efs_name != "" ? var.efs_name : "${var.cluster_name}-efs"

  # Performance configuration
  performance_mode = var.performance_mode
  throughput_mode  = var.throughput_mode

  # Provisioned throughput (only if throughput_mode is "provisioned")
  provisioned_throughput_in_mibps = var.throughput_mode == "provisioned" ? var.provisioned_throughput_in_mibps : null

  # Encryption
  encrypted  = true
  kms_key_id = var.kms_key_id != "" ? var.kms_key_id : null

  # Lifecycle policy
  dynamic "lifecycle_policy" {
    for_each = var.transition_to_ia_days != null ? [1] : []
    content {
      transition_to_ia = "AFTER_${var.transition_to_ia_days}_DAYS"
    }
  }

  # Transition to Archive (if specified)
  dynamic "lifecycle_policy" {
    for_each = var.transition_to_archive_days != null ? [1] : []
    content {
      transition_to_archive = "AFTER_${var.transition_to_archive_days}_DAYS"
    }
  }

  # Automatic backups
  dynamic "lifecycle_policy" {
    for_each = var.enable_automatic_backups ? [1] : []
    content {
      transition_to_primary_storage_class = "AFTER_1_ACCESS"
    }
  }

  tags = merge(
    var.common_tags,
    {
      Name = "${var.cluster_name}-efs"
    }
  )
}

# EFS Mount Targets (one per subnet)
resource "aws_efs_mount_target" "main" {
  count = length(var.subnet_ids)

  file_system_id  = aws_efs_file_system.main.id
  subnet_id       = var.subnet_ids[count.index]
  security_groups = [aws_security_group.efs.id]
}

# EFS Backup Policy
resource "aws_efs_backup_policy" "main" {
  file_system_id = aws_efs_file_system.main.id

  backup_policy {
    status = var.enable_automatic_backups ? "ENABLED" : "DISABLED"
  }
}

# EFS Access Points (optional, for fine-grained access control)
resource "aws_efs_access_point" "main" {
  count = length(var.access_points)

  file_system_id = aws_efs_file_system.main.id

  posix_user {
    gid = var.access_points[count.index].posix_user.gid
    uid = var.access_points[count.index].posix_user.uid
  }

  root_directory {
    path = var.access_points[count.index].root_directory.path

    creation_info {
      owner_gid   = var.access_points[count.index].root_directory.creation_info.owner_gid
      owner_uid   = var.access_points[count.index].root_directory.creation_info.owner_uid
      permissions = var.access_points[count.index].root_directory.creation_info.permissions
    }
  }

  tags = merge(
    var.common_tags,
    {
      Name = "${var.cluster_name}-efs-ap-${count.index + 1}"
    }
  )
}

# IAM Policy for EKS access to EFS
resource "aws_iam_policy" "efs_csi" {
  count = var.create_efs_csi_policy ? 1 : 0

  name        = "${var.cluster_name}-efs-csi-policy"
  description = "Policy for EFS CSI driver in ${var.cluster_name}"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "elasticfilesystem:DescribeAccessPoints",
          "elasticfilesystem:DescribeFileSystems",
          "elasticfilesystem:DescribeMountTargets",
          "ec2:DescribeAvailabilityZones"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "elasticfilesystem:CreateAccessPoint"
        ]
        Resource = "*"
        Condition = {
          StringLike = {
            "aws:RequestTag/efs.csi.aws.com/cluster" = "true"
          }
        }
      },
      {
        Effect = "Allow"
        Action = [
          "elasticfilesystem:DeleteAccessPoint"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "aws:ResourceTag/efs.csi.aws.com/cluster" = "true"
          }
        }
      }
    ]
  })

  tags = var.common_tags
}

# File System Policy (for resource-based access control)
resource "aws_efs_file_system_policy" "main" {
  count = var.file_system_policy != "" ? 1 : 0

  file_system_id = aws_efs_file_system.main.id
  policy         = var.file_system_policy
}
