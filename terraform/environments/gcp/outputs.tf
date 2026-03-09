# =============================================================================
# GCP GKE Outputs
# =============================================================================

output "cluster_name" {
  description = "GKE cluster name"
  value       = google_container_cluster.main.name
}

output "cluster_endpoint" {
  description = "GKE cluster API server endpoint"
  value       = google_container_cluster.main.endpoint
  sensitive   = true
}

output "cluster_ca_certificate" {
  description = "GKE cluster CA certificate (base64)"
  value       = google_container_cluster.main.master_auth[0].cluster_ca_certificate
  sensitive   = true
}

output "gcs_bucket_name" {
  description = "GCS bucket name (empty if object storage is disabled)"
  value       = var.enable_object_storage ? google_storage_bucket.main[0].name : ""
}

output "artifact_registry_url" {
  description = "Artifact Registry Docker URL (empty if container registry is disabled)"
  value       = var.enable_container_registry ? "${var.region}-docker.pkg.dev/${var.project_id}/${var.cluster_name}" : ""
}

# =============================================================================
# VPC Outputs
# =============================================================================

output "vpc_name" {
  description = "VPC network name (empty if VPC not created)"
  value       = var.create_vpc ? module.vpc[0].vpc_name : ""
}

output "private_subnet_name" {
  description = "Private subnet name (GKE)"
  value       = var.create_vpc ? module.vpc[0].private_subnet_name : ""
}

# =============================================================================
# Database Outputs
# =============================================================================

output "db_endpoint" {
  description = "Database endpoint (empty if database is disabled)"
  value       = var.enable_database ? module.database[0].db_endpoint : ""
}

output "db_port" {
  description = "Database port (empty if database is disabled)"
  value       = var.enable_database ? module.database[0].db_port : ""
}

output "db_name" {
  description = "Database name (empty if database is disabled)"
  value       = var.enable_database ? module.database[0].db_name : ""
}

output "db_connection_name" {
  description = "Cloud SQL instance connection name for proxy (empty if database is disabled)"
  value       = var.enable_database ? module.database[0].db_instance_connection_name : ""
}

output "db_connection_string" {
  description = "Database connection string (empty if database is disabled)"
  value       = var.enable_database ? module.database[0].connection_string : ""
  sensitive   = true
}

# =============================================================================
# Filestore Outputs
# =============================================================================

output "filestore_ip" {
  description = "Filestore NFS IP address (empty if filestore is disabled)"
  value       = var.enable_filestore ? module.filestore[0].filestore_ip : ""
}

output "filestore_share_name" {
  description = "Filestore share name (empty if filestore is disabled)"
  value       = var.enable_filestore ? module.filestore[0].filestore_share_name : ""
}

output "nfs_mount_path" {
  description = "NFS mount path (empty if filestore is disabled)"
  value       = var.enable_filestore ? module.filestore[0].nfs_mount_path : ""
}
