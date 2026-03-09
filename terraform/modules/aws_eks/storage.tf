# AWS EKS Storage Resources
# Creates Kubernetes StorageClasses for EBS and EFS

# =============================================================================
# Kubernetes Provider Configuration
# Uses the EKS cluster credentials for in-cluster resource creation
# =============================================================================

data "aws_eks_cluster_auth" "main" {
  name = aws_eks_cluster.main.name
}

provider "kubernetes" {
  host                   = aws_eks_cluster.main.endpoint
  cluster_ca_certificate = base64decode(aws_eks_cluster.main.certificate_authority[0].data)
  token                  = data.aws_eks_cluster_auth.main.token
}

# =============================================================================
# EBS Storage Class (gp3 - Recommended)
# =============================================================================

resource "kubernetes_storage_class_v1" "ebs_gp3" {
  count = var.enable_ebs_csi_driver && var.create_storage_classes ? 1 : 0

  metadata {
    name = "ebs-sc"
    annotations = {
      "storageclass.kubernetes.io/is-default-class" = var.ebs_default_storage_class ? "true" : "false"
    }
  }

  storage_provisioner    = "ebs.csi.aws.com"
  reclaim_policy         = "Delete"
  volume_binding_mode    = "WaitForFirstConsumer"
  allow_volume_expansion = true

  parameters = {
    type      = "gp3"
    fsType    = "ext4"
    encrypted = "true"
  }

  depends_on = [aws_eks_addon.ebs_csi]
}

# =============================================================================
# EFS Storage Class (for shared storage)
# =============================================================================

resource "kubernetes_storage_class_v1" "efs" {
  count = var.enable_efs_csi_driver && var.create_storage_classes ? 1 : 0

  metadata {
    name = "efs-sc"
  }

  storage_provisioner = "efs.csi.aws.com"
  reclaim_policy      = "Retain"

  parameters = {
    provisioningMode = "efs-ap"
    directoryPerms   = "700"
    # fileSystemId is set dynamically by the EFS module
  }

  depends_on = [aws_eks_addon.efs_csi]
}
