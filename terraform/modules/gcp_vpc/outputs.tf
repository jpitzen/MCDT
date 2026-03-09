# =============================================================================
# GCP VPC Module Outputs
# =============================================================================

output "vpc_id" {
  description = "The ID of the VPC network"
  value       = google_compute_network.vpc.id
}

output "vpc_name" {
  description = "The name of the VPC network"
  value       = google_compute_network.vpc.name
}

output "vpc_self_link" {
  description = "The self link of the VPC network"
  value       = google_compute_network.vpc.self_link
}

output "public_subnet_id" {
  description = "The ID of the public subnet"
  value       = google_compute_subnetwork.public.id
}

output "public_subnet_name" {
  description = "The name of the public subnet"
  value       = google_compute_subnetwork.public.name
}

output "private_subnet_id" {
  description = "The ID of the private subnet (GKE)"
  value       = google_compute_subnetwork.private.id
}

output "private_subnet_name" {
  description = "The name of the private subnet (GKE)"
  value       = google_compute_subnetwork.private.name
}

output "pods_range_name" {
  description = "The name of the pods secondary IP range"
  value       = google_compute_subnetwork.private.secondary_ip_range[0].range_name
}

output "services_range_name" {
  description = "The name of the services secondary IP range"
  value       = google_compute_subnetwork.private.secondary_ip_range[1].range_name
}

output "router_id" {
  description = "The ID of the Cloud Router"
  value       = var.enable_cloud_nat ? google_compute_router.router[0].id : null
}

output "nat_id" {
  description = "The ID of the Cloud NAT"
  value       = var.enable_cloud_nat ? google_compute_router_nat.nat[0].id : null
}

output "private_services_connection_id" {
  description = "The ID of the private services connection"
  value       = var.enable_private_service_access ? google_service_networking_connection.private_service[0].id : null
}
