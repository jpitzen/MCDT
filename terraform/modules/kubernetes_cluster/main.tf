# Multi-Cloud Kubernetes Cluster Module
# Supports AWS EKS, Azure AKS, Google GKE, DigitalOcean, and Linode LKE
# Uses count to conditionally create provider-specific resources
#
# NOTE: Provider requirements are declared in environment-specific configurations
# (terraform/environments/aws, terraform/environments/azure, etc.)
# This allows each environment to only declare and configure the provider it uses.

# ============================================================================
# AWS EKS Cluster
# ============================================================================

resource "aws_eks_cluster" "main" {
  count = var.cloud_provider == "aws" ? 1 : 0

  name     = var.cluster_name
  version  = var.kubernetes_version
  role_arn = local.eks_cluster_role_arn

  vpc_config {
    subnet_ids              = var.aws_subnets
    endpoint_private_access = true
    endpoint_public_access  = true
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
    }
  )

  # Only depend on policy attachments if creating new roles
  dynamic "timeouts" {
    for_each = local.create_aws_roles ? [1] : []
    content {
      create = "30m"
      delete = "30m"
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.eks_cluster_policy
  ]

  lifecycle {
    ignore_changes = [tags]
  }
}

resource "aws_eks_node_group" "main" {
  count = var.cloud_provider == "aws" ? 1 : 0

  cluster_name    = aws_eks_cluster.main[0].name
  node_group_name = "${var.cluster_name}-node-group"
  node_role_arn   = local.eks_node_group_role_arn
  subnet_ids      = var.aws_subnets
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
    }
  )

  depends_on = [
    aws_iam_role_policy_attachment.eks_node_group_policy
  ]

  lifecycle {
    ignore_changes = [tags]
  }
}

# ============================================================================
# AWS EKS Addons — S3 CSI Driver (Task 5.1)
# ============================================================================

resource "aws_eks_addon" "s3_csi" {
  count = var.cloud_provider == "aws" && var.enable_s3_csi ? 1 : 0

  cluster_name                = aws_eks_cluster.main[0].name
  addon_name                  = "aws-mountpoint-s3-csi-driver"
  resolve_conflicts_on_create = "OVERWRITE"
  resolve_conflicts_on_update = "OVERWRITE"
  service_account_role_arn    = aws_iam_role.s3_csi_driver[0].arn

  tags = merge(
    var.common_tags,
    {
      Name = "${var.cluster_name}-s3-csi-driver"
    }
  )

  depends_on = [aws_eks_node_group.main]
}

# ============================================================================
# AWS ALB Controller — Helm Release (Task 5.2)
# ============================================================================

resource "helm_release" "aws_lb_controller" {
  count = var.cloud_provider == "aws" && var.enable_alb_controller ? 1 : 0

  name       = "aws-load-balancer-controller"
  repository = "https://aws.github.io/eks-charts"
  chart      = "aws-load-balancer-controller"
  namespace  = "kube-system"
  version    = var.alb_controller_chart_version

  set {
    name  = "clusterName"
    value = aws_eks_cluster.main[0].name
  }

  set {
    name  = "serviceAccount.create"
    value = "true"
  }

  set {
    name  = "serviceAccount.name"
    value = "aws-load-balancer-controller"
  }

  set {
    name  = "serviceAccount.annotations.eks\\.amazonaws\\.com/role-arn"
    value = aws_iam_role.alb_controller[0].arn
  }

  set {
    name  = "region"
    value = var.aws_region
  }

  set {
    name  = "vpcId"
    value = var.aws_vpc_id
  }

  depends_on = [aws_eks_node_group.main]
}

# ============================================================================
# Cluster Autoscaler — Helm Release (Task 5.3)
# ============================================================================

resource "helm_release" "cluster_autoscaler" {
  count = var.cloud_provider == "aws" && var.enable_cluster_autoscaler ? 1 : 0

  name       = "cluster-autoscaler"
  repository = "https://kubernetes.github.io/autoscaler"
  chart      = "cluster-autoscaler"
  namespace  = "kube-system"
  version    = var.cluster_autoscaler_chart_version

  set {
    name  = "autoDiscovery.clusterName"
    value = aws_eks_cluster.main[0].name
  }

  set {
    name  = "awsRegion"
    value = var.aws_region
  }

  set {
    name  = "rbac.serviceAccount.create"
    value = "true"
  }

  set {
    name  = "rbac.serviceAccount.name"
    value = "cluster-autoscaler"
  }

  set {
    name  = "rbac.serviceAccount.annotations.eks\\.amazonaws\\.com/role-arn"
    value = aws_iam_role.cluster_autoscaler[0].arn
  }

  set {
    name  = "extraArgs.balance-similar-node-groups"
    value = "true"
  }

  set {
    name  = "extraArgs.skip-nodes-with-system-pods"
    value = "false"
  }

  depends_on = [aws_eks_node_group.main]
}

# ============================================================================
# Azure AKS Cluster
# ============================================================================

resource "azurerm_kubernetes_cluster" "main" {
  count = var.cloud_provider == "azure" ? 1 : 0

  name                = var.cluster_name
  location            = var.azure_location
  resource_group_name = var.azure_resource_group
  kubernetes_version  = var.kubernetes_version

  dns_prefix = var.cluster_name

  default_node_pool {
    name                = "default"
    node_count          = var.node_count
    vm_size             = var.node_instance_type
    vnet_subnet_id      = var.azure_subnet_id
    enable_auto_scaling = var.enable_autoscaling
    min_count           = var.enable_autoscaling ? var.min_node_count : null
    max_count           = var.enable_autoscaling ? var.max_node_count : null
  }

  network_profile {
    network_plugin     = "azure"
    network_policy     = var.azure_network_policy
    dns_service_ip     = var.azure_dns_service_ip
    service_cidr       = var.azure_service_cidr
    pod_cidr           = var.azure_pod_cidr
    docker_bridge_cidr = "172.17.0.1/16"
  }

  identity {
    type = "SystemAssigned"
  }

  tags = merge(
    var.common_tags,
    {
      Provider = "AKS"
    }
  )
}

# ============================================================================
# Google GKE Cluster
# ============================================================================

resource "google_container_cluster" "main" {
  count = var.cloud_provider == "gcp" ? 1 : 0

  name     = var.cluster_name
  project  = var.gcp_project_id
  location = var.gcp_zone

  initial_node_count = var.node_count

  enable_autopilot = false

  logging_service    = var.enable_logging ? "logging.googleapis.com/kubernetes" : "none"
  monitoring_service = var.enable_monitoring ? "monitoring.googleapis.com/kubernetes" : "none"

  node_pool {
    name               = "default-pool"
    initial_node_count = var.node_count

    node_config {
      machine_type    = var.node_instance_type
      oauth_scopes    = var.gcp_oauth_scopes
      service_account = var.gcp_service_account

      disk_size_gb = 100
    }

    autoscaling {
      min_node_count = var.enable_autoscaling ? var.min_node_count : var.node_count
      max_node_count = var.enable_autoscaling ? var.max_node_count : var.node_count
    }

    management {
      auto_repair  = true
      auto_upgrade = true
    }
  }

  network    = var.gcp_network
  subnetwork = var.gcp_subnet

  resource_labels = merge(
    var.common_tags,
    {
      provider = "gke"
    }
  )
}

# ============================================================================
# DigitalOcean Kubernetes Cluster
# ============================================================================

resource "digitalocean_kubernetes_cluster" "main" {
  count = var.cloud_provider == "digitalocean" ? 1 : 0

  name          = var.cluster_name
  region        = var.do_region
  version       = "1.${var.kubernetes_version}"
  auto_upgrade  = true
  surge_upgrade = var.do_surge_upgrade

  node_pool {
    name       = "${var.cluster_name}-node-pool"
    size       = var.node_instance_type
    node_count = var.node_count
    auto_scale = var.enable_autoscaling
    min_nodes  = var.enable_autoscaling ? var.min_node_count : null
    max_nodes  = var.enable_autoscaling ? var.max_node_count : null
  }

  tags = keys({
    for tag in concat(
      [for k, v in var.common_tags : "${k}:${v}"]
    ) : tag => true
  })
}

# ============================================================================
# Linode LKE Cluster
# ============================================================================

resource "linode_lke_cluster" "main" {
  count = var.cloud_provider == "linode" ? 1 : 0

  label       = var.cluster_name
  region      = var.linode_region
  k8s_version = var.kubernetes_version

  control_plane {
    high_availability = true
  }

  dynamic "pool" {
    for_each = var.linode_node_pools
    content {
      type  = pool.value.type
      count = pool.value.count
    }
  }

  tags = var.linode_tags
}

# ============================================================================
# Cluster Outputs - Provider-agnostic
# ============================================================================

locals {
  cluster_endpoint = var.cloud_provider == "aws" ? aws_eks_cluster.main[0].endpoint : (
    var.cloud_provider == "azure" ? azurerm_kubernetes_cluster.main[0].kube_config[0].host : (
      var.cloud_provider == "gcp" ? "https://${google_container_cluster.main[0].endpoint}" : (
        var.cloud_provider == "digitalocean" ? digitalocean_kubernetes_cluster.main[0].endpoint : (
          var.cloud_provider == "linode" ? linode_lke_cluster.main[0].api_endpoints[0] : ""
        )
      )
    )
  )

  cluster_ca_certificate = base64encode(
    var.cloud_provider == "aws" ? aws_eks_cluster.main[0].certificate_authority[0].data : (
      var.cloud_provider == "azure" ? azurerm_kubernetes_cluster.main[0].kube_config[0].cluster_ca_certificate : (
        var.cloud_provider == "gcp" ? google_container_cluster.main[0].master_auth[0].cluster_ca_certificate : (
          var.cloud_provider == "digitalocean" ? digitalocean_kubernetes_cluster.main[0].kube_config[0].cluster_ca_certificate : (
            var.cloud_provider == "linode" ? linode_lke_cluster.main[0].kubeconfig : ""
          )
        )
      )
    )
  )
}

# ============================================================================
# Phase 6.4 — Auto-update kubeconfig after EKS cluster creation
# ============================================================================

resource "null_resource" "update_kubeconfig" {
  count = var.cloud_provider == "aws" ? 1 : 0

  triggers = {
    cluster_name = aws_eks_cluster.main[0].name
    endpoint     = aws_eks_cluster.main[0].endpoint
  }

  provisioner "local-exec" {
    command = "aws eks update-kubeconfig --region ${var.aws_region} --name ${aws_eks_cluster.main[0].name} --kubeconfig ${path.module}/kubeconfig_${aws_eks_cluster.main[0].name}"
  }

  depends_on = [aws_eks_node_group.main]
}
