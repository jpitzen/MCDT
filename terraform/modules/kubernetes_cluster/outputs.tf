# Output values from multi-cloud Kubernetes cluster module

output "cluster_id" {
  description = "The ID of the created Kubernetes cluster"
  value = var.cloud_provider == "aws" ? aws_eks_cluster.main[0].id : (
    var.cloud_provider == "azure" ? azurerm_kubernetes_cluster.main[0].id : (
      var.cloud_provider == "gcp" ? google_container_cluster.main[0].id : (
        var.cloud_provider == "digitalocean" ? digitalocean_kubernetes_cluster.main[0].id : (
          var.cloud_provider == "linode" ? linode_lke_cluster.main[0].id : ""
        )
      )
    )
  )
}

output "cluster_name" {
  description = "Name of the Kubernetes cluster"
  value       = var.cluster_name
}

output "cloud_provider" {
  description = "Cloud provider used for the cluster"
  value       = var.cloud_provider
}

output "cluster_endpoint" {
  description = "The API endpoint of the Kubernetes cluster"
  value       = local.cluster_endpoint
  sensitive   = true
}

output "cluster_ca_certificate" {
  description = "Base64 encoded cluster CA certificate"
  value       = local.cluster_ca_certificate
  sensitive   = true
}

output "kubeconfig" {
  description = "Kubernetes config to connect to the cluster"
  value = var.cloud_provider == "aws" ? aws_eks_cluster.main[0].id : (
    var.cloud_provider == "azure" ? azurerm_kubernetes_cluster.main[0].kube_config_raw : (
      var.cloud_provider == "gcp" ? base64encode(jsonencode(google_container_cluster.main[0].master_auth)) : (
        var.cloud_provider == "digitalocean" ? digitalocean_kubernetes_cluster.main[0].kube_config[0].raw_config : (
          var.cloud_provider == "linode" ? linode_lke_cluster.main[0].kubeconfig : ""
        )
      )
    )
  )
  sensitive = true
}

output "node_pool_info" {
  description = "Information about the node pool(s)"
  value = {
    cloud_provider = var.cloud_provider
    node_count     = var.node_count
    instance_type  = var.node_instance_type
    autoscaling = {
      enabled   = var.enable_autoscaling
      min_nodes = var.min_node_count
      max_nodes = var.max_node_count
    }
  }
}

output "provider_specific_info" {
  description = "Provider-specific cluster information"
  value = var.cloud_provider == "aws" ? {
    cluster_arn      = aws_eks_cluster.main[0].arn
    platform_version = aws_eks_cluster.main[0].platform_version
    role_arn         = aws_eks_cluster.main[0].role_arn
    } : (
    var.cloud_provider == "azure" ? {
      resource_group = azurerm_kubernetes_cluster.main[0].resource_group_name
      principal_id   = azurerm_kubernetes_cluster.main[0].identity[0].principal_id
      tenant_id      = azurerm_kubernetes_cluster.main[0].identity[0].tenant_id
      } : (
      var.cloud_provider == "gcp" ? {
        project_id = google_container_cluster.main[0].project
        location   = google_container_cluster.main[0].location
        } : (
        var.cloud_provider == "digitalocean" ? {
          urn    = digitalocean_kubernetes_cluster.main[0].urn
          status = digitalocean_kubernetes_cluster.main[0].status
          } : (
          var.cloud_provider == "linode" ? {
            label         = linode_lke_cluster.main[0].label
            api_endpoints = linode_lke_cluster.main[0].api_endpoints
          } : {}
        )
      )
    )
  )
}

# ============================================================================
# OIDC Provider Outputs
# ============================================================================

output "oidc_provider_arn" {
  description = "ARN of the OIDC provider (AWS only)"
  value       = var.cloud_provider == "aws" ? aws_iam_openid_connect_provider.cluster[0].arn : null
}

output "oidc_provider_url" {
  description = "URL of the OIDC provider (AWS only)"
  value       = var.cloud_provider == "aws" ? aws_eks_cluster.main[0].identity[0].oidc[0].issuer : null
}

# ============================================================================
# RDS Connection Outputs (Task 5.4)
# Consumed by zlManifestTemplates.generateZLDBConfig()
# ============================================================================

variable "rds_endpoint" {
  type        = string
  description = "RDS endpoint (passed from aws_rds module output)"
  default     = ""
}

variable "rds_port" {
  type        = number
  description = "RDS port (passed from aws_rds module output)"
  default     = 5432
}

variable "rds_database_name" {
  type        = string
  description = "RDS database name (passed from aws_rds module output)"
  default     = ""
}

output "rds_endpoint" {
  description = "RDS endpoint for application database"
  value       = var.rds_endpoint != "" ? var.rds_endpoint : null
}

output "rds_port" {
  description = "RDS port for application database"
  value       = var.rds_endpoint != "" ? var.rds_port : null
}

output "rds_database_name" {
  description = "RDS database name"
  value       = var.rds_database_name != "" ? var.rds_database_name : null
}

# ---------------------------------------------------------------------------
# Phase 6 — Security & IAM outputs
# ---------------------------------------------------------------------------

output "inspector_status" {
  description = "Whether Amazon Inspector v2 ECR scanning is enabled"
  value       = var.enable_security_scanning ? "enabled" : "disabled"
}

output "deployer_iam_user_arn" {
  description = "ARN of the CI/CD deployment IAM user"
  value       = var.create_iam_user && local.is_aws ? aws_iam_user.deployment[0].arn : null
}

output "deployer_access_key_id" {
  description = "Access key ID for the deployment IAM user"
  value       = var.create_iam_user && local.is_aws ? aws_iam_access_key.deployment[0].id : null
  sensitive   = true
}

output "deployer_secret_access_key" {
  description = "Secret access key for the deployment IAM user"
  value       = var.create_iam_user && local.is_aws ? aws_iam_access_key.deployment[0].secret : null
  sensitive   = true
}
