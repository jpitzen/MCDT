# =============================================================================
# Data Sources for Discovering Existing GCP Infrastructure
# =============================================================================
# These data sources allow the deployment to reference existing GCP resources
# (VPC networks, subnetworks, etc.) rather than always creating new ones.

# Discover existing VPC network (if deploying into an existing network)
# Uncomment and configure when using existing networking infrastructure.

# data "google_compute_network" "existing" {
#   count   = var.existing_network_name != "" ? 1 : 0
#   name    = var.existing_network_name
#   project = var.project_id
# }

# data "google_compute_subnetwork" "existing" {
#   count   = var.existing_subnetwork_name != "" ? 1 : 0
#   name    = var.existing_subnetwork_name
#   region  = var.region
#   project = var.project_id
# }
