# =============================================================================
# GCP Filestore Module Outputs
# =============================================================================

output "filestore_id" {
  description = "The ID of the Filestore instance"
  value       = google_filestore_instance.main.id
}

output "filestore_name" {
  description = "The name of the Filestore instance"
  value       = google_filestore_instance.main.name
}

output "filestore_ip" {
  description = "The IP address of the Filestore instance"
  value       = google_filestore_instance.main.networks[0].ip_addresses[0]
}

output "filestore_share_name" {
  description = "The name of the file share"
  value       = var.share_name
}

output "nfs_mount_path" {
  description = "NFS mount path for the Filestore share"
  value       = "${google_filestore_instance.main.networks[0].ip_addresses[0]}:/${var.share_name}"
}

output "filestore_tier" {
  description = "The tier of the Filestore instance"
  value       = google_filestore_instance.main.tier
}

output "filestore_capacity_gb" {
  description = "The capacity of the Filestore instance in GB"
  value       = var.capacity_gb
}
