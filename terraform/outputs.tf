# Multi-cloud root outputs

output "cluster_id" {
  description = "Kubernetes cluster ID"
  value       = module.kubernetes_cluster.cluster_id
}

output "cluster_name" {
  description = "Kubernetes cluster name"
  value       = module.kubernetes_cluster.cluster_name
}

output "cloud_provider" {
  description = "Cloud provider used"
  value       = module.kubernetes_cluster.cloud_provider
}

output "cluster_endpoint" {
  description = "Kubernetes API endpoint"
  value       = module.kubernetes_cluster.cluster_endpoint
  sensitive   = true
}

output "cluster_ca_certificate" {
  description = "Cluster CA certificate (base64 encoded)"
  value       = module.kubernetes_cluster.cluster_ca_certificate
  sensitive   = true
}

output "kubeconfig" {
  description = "Kubeconfig content"
  value       = module.kubernetes_cluster.kubeconfig
  sensitive   = true
}

output "node_pool_info" {
  description = "Node pool configuration"
  value       = module.kubernetes_cluster.node_pool_info
}

output "provider_specific_info" {
  description = "Provider-specific cluster information"
  value       = module.kubernetes_cluster.provider_specific_info
}

output "connection_info" {
  description = "Information needed to connect to the cluster"
  value = {
    cloud_provider = module.kubernetes_cluster.cloud_provider
    cluster_name   = module.kubernetes_cluster.cluster_name
    endpoint       = module.kubernetes_cluster.cluster_endpoint
    message        = "Use the kubeconfig output to configure kubectl access"
  }
  sensitive = false
}
