# =============================================================================
# GCP VPC Module
# Provisions VPC, Subnets, Cloud Router, Cloud NAT, Firewall Rules
# Equivalent of AWS VPC inline networking in environments/aws/main.tf
# =============================================================================

# -----------------------------------------------------------------------------
# VPC Network
# -----------------------------------------------------------------------------
resource "google_compute_network" "main" {
  name                    = "${var.cluster_name}-vpc"
  project                 = var.project_id
  auto_create_subnetworks = false
}

# -----------------------------------------------------------------------------
# Subnets
# -----------------------------------------------------------------------------
resource "google_compute_subnetwork" "public" {
  name          = "${var.cluster_name}-public"
  project       = var.project_id
  region        = var.region
  network       = google_compute_network.main.id
  ip_cidr_range = var.public_subnet_cidr
}

resource "google_compute_subnetwork" "private" {
  name          = "${var.cluster_name}-private"
  project       = var.project_id
  region        = var.region
  network       = google_compute_network.main.id
  ip_cidr_range = var.private_subnet_cidr

  private_ip_google_access = true

  # Secondary ranges for GKE pods and services
  secondary_ip_range {
    range_name    = "${var.cluster_name}-pods"
    ip_cidr_range = var.pods_cidr
  }

  secondary_ip_range {
    range_name    = "${var.cluster_name}-services"
    ip_cidr_range = var.services_cidr
  }
}

# -----------------------------------------------------------------------------
# Cloud Router + Cloud NAT (outbound internet for private subnet)
# -----------------------------------------------------------------------------
resource "google_compute_router" "main" {
  count   = var.enable_cloud_nat ? 1 : 0
  name    = "${var.cluster_name}-router"
  project = var.project_id
  region  = var.region
  network = google_compute_network.main.id
}

resource "google_compute_router_nat" "main" {
  count  = var.enable_cloud_nat ? 1 : 0
  name   = "${var.cluster_name}-nat"
  router = google_compute_router.main[0].name
  region = var.region

  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "LIST_OF_SUBNETWORKS"

  subnetwork {
    name                    = google_compute_subnetwork.private.id
    source_ip_ranges_to_nat = ["ALL_IP_RANGES"]
  }

  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }
}

# -----------------------------------------------------------------------------
# Firewall Rules
# -----------------------------------------------------------------------------

# Allow internal traffic within VPC
resource "google_compute_firewall" "allow_internal" {
  name    = "${var.cluster_name}-allow-internal"
  project = var.project_id
  network = google_compute_network.main.id

  allow {
    protocol = "tcp"
    ports    = ["0-65535"]
  }

  allow {
    protocol = "udp"
    ports    = ["0-65535"]
  }

  allow {
    protocol = "icmp"
  }

  source_ranges = [var.public_subnet_cidr, var.private_subnet_cidr]
}

# Allow Google health check probes
resource "google_compute_firewall" "allow_health_checks" {
  name    = "${var.cluster_name}-allow-health-checks"
  project = var.project_id
  network = google_compute_network.main.id

  allow {
    protocol = "tcp"
  }

  # Google health check source ranges
  source_ranges = ["35.191.0.0/16", "130.211.0.0/22"]
  target_tags   = ["gke-node"]
}

# Deny all other ingress by default
resource "google_compute_firewall" "deny_all_ingress" {
  name     = "${var.cluster_name}-deny-all-ingress"
  project  = var.project_id
  network  = google_compute_network.main.id
  priority = 65534

  deny {
    protocol = "all"
  }

  source_ranges = ["0.0.0.0/0"]
}

# -----------------------------------------------------------------------------
# Private Service Access (for Cloud SQL, Filestore, etc.)
# -----------------------------------------------------------------------------
resource "google_compute_global_address" "private_services" {
  count         = var.enable_private_service_access ? 1 : 0
  name          = "${var.cluster_name}-private-services"
  project       = var.project_id
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.main.id
}

resource "google_service_networking_connection" "main" {
  count                   = var.enable_private_service_access ? 1 : 0
  network                 = google_compute_network.main.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_services[0].name]
}
