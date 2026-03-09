# Phase 1 — Terraform Environment Directories: Azure, GCP, DigitalOcean, Linode
## GAP-001 · Critical · Prerequisite for all other gap phases

**Priority**: P0 (blocking — non-AWS deployments fail at `terraform init` without these files)
**Effort**: 3–4 days
**Prerequisites**: None — must be completed before Phases 2–7

---

## Objective

Create Terraform environment directories and `.tf` files for all four non-AWS cloud providers. Currently only `terraform/environments/aws/` exists on disk. Any deployment to Azure, GCP, DigitalOcean, or Linode reaches `terraformExecutor.initTerraform()`, which tries to copy `terraform/environments/{provider}/` into the working directory and fails because none of these directories exist.

The structure must mirror `terraform/environments/aws/` in layout — `main.tf`, `variables.tf`, `outputs.tf`, `data-sources.tf` — while using each provider's native Terraform resources.

---

## Tasks

### 1.1 — Azure AKS (`terraform/environments/azure/`)
**Effort**: 1 day

#### 1.1.1 — `main.tf`

```hcl
terraform {
  required_version = ">= 1.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
  subscription_id = var.subscription_id
  client_id       = var.client_id
  client_secret   = var.client_secret
  tenant_id       = var.tenant_id
}

resource "azurerm_resource_group" "main" {
  name     = var.resource_group
  location = var.region
  tags     = var.common_tags
}

resource "azurerm_kubernetes_cluster" "main" {
  name                = var.cluster_name
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  dns_prefix          = var.cluster_name
  kubernetes_version  = var.kubernetes_version

  default_node_pool {
    name                = "default"
    node_count          = var.node_count
    vm_size             = var.node_vm_size
    min_count           = var.enable_autoscaling ? var.min_node_count : null
    max_count           = var.enable_autoscaling ? var.max_node_count : null
    enable_auto_scaling = var.enable_autoscaling
    os_disk_size_gb     = var.os_disk_size_gb
  }

  identity {
    type = "SystemAssigned"
  }

  network_profile {
    network_plugin    = var.network_plugin
    network_policy    = var.network_policy
    pod_cidr          = var.network_plugin == "kubenet" ? var.pod_cidr : null
    service_cidr      = var.service_cidr
    dns_service_ip    = var.dns_service_ip
  }

  tags = var.common_tags
}

# Azure Container Registry (if enabled)
resource "azurerm_container_registry" "main" {
  count               = var.enable_container_registry ? 1 : 0
  name                = replace(var.acr_name != "" ? var.acr_name : var.cluster_name, "-", "")
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = var.acr_sku
  admin_enabled       = var.acr_admin_enabled
  tags                = var.common_tags
}

# Attach ACR to AKS
resource "azurerm_role_assignment" "aks_acr" {
  count                            = var.enable_container_registry ? 1 : 0
  principal_id                     = azurerm_kubernetes_cluster.main.kubelet_identity[0].object_id
  role_definition_name             = "AcrPull"
  scope                            = azurerm_container_registry.main[0].id
  skip_service_principal_aad_check = true
}

# Azure Files (NFS) for persistent storage
resource "azurerm_storage_account" "main" {
  count                    = var.enable_file_storage ? 1 : 0
  name                     = replace("${var.cluster_name}storage", "-", "")
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  tags                     = var.common_tags
}

resource "azurerm_storage_share" "main" {
  count                = var.enable_file_storage ? 1 : 0
  name                 = "${var.cluster_name}-share"
  storage_account_name = azurerm_storage_account.main[0].name
  quota                = var.file_storage_quota_gb
}
```

#### 1.1.2 — `variables.tf` (key variables)

```hcl
variable "cluster_name"          { type = string }
variable "region"                { type = string; default = "East US" }
variable "kubernetes_version"    { type = string; default = "1.28" }
variable "node_count"            { type = number; default = 3 }
variable "node_vm_size"          { type = string; default = "Standard_D2s_v3" }
variable "min_node_count"        { type = number; default = 1 }
variable "max_node_count"        { type = number; default = 5 }
variable "enable_autoscaling"    { type = bool;   default = true }
variable "os_disk_size_gb"       { type = number; default = 50 }
variable "resource_group"        { type = string }
variable "subscription_id"       { type = string }
variable "client_id"             { type = string }
variable "client_secret"         { type = string; sensitive = true }
variable "tenant_id"             { type = string }
variable "network_plugin"        { type = string; default = "azure" }
variable "network_policy"        { type = string; default = "azure" }
variable "pod_cidr"              { type = string; default = "172.17.0.0/16" }
variable "service_cidr"          { type = string; default = "172.20.0.0/16" }
variable "dns_service_ip"        { type = string; default = "172.20.0.10" }
variable "enable_container_registry" { type = bool;   default = false }
variable "acr_name"              { type = string; default = "" }
variable "acr_sku"               { type = string; default = "Standard" }
variable "acr_admin_enabled"     { type = bool;   default = false }
variable "enable_file_storage"   { type = bool;   default = false }
variable "file_storage_quota_gb" { type = number; default = 100 }
variable "ssl_certificate_name"  { type = string; default = "" }
variable "common_tags"           { type = map(string); default = {} }
variable "environment"           { type = string; default = "production" }
```

#### 1.1.3 — `outputs.tf`

```hcl
output "cluster_name"          { value = azurerm_kubernetes_cluster.main.name }
output "cluster_endpoint"      { value = azurerm_kubernetes_cluster.main.kube_config[0].host }
output "cluster_ca_certificate" { value = azurerm_kubernetes_cluster.main.kube_config[0].cluster_ca_certificate; sensitive = true }
output "kube_config_raw"       { value = azurerm_kubernetes_cluster.main.kube_config_raw; sensitive = true }
output "node_resource_group"   { value = azurerm_kubernetes_cluster.main.node_resource_group }
output "acr_login_server"      { value = var.enable_container_registry ? azurerm_container_registry.main[0].login_server : "" }
output "storage_share_name"    { value = var.enable_file_storage ? azurerm_storage_share.main[0].name : "" }
```

---

### 1.2 — GCP GKE (`terraform/environments/gcp/`)
**Effort**: 0.5 days

#### 1.2.1 — `main.tf`

```hcl
terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project     = var.project_id
  region      = var.region
  credentials = var.service_account_key != "" ? var.service_account_key : null
}

resource "google_container_cluster" "main" {
  name     = var.cluster_name
  location = var.region

  remove_default_node_pool = true
  initial_node_count       = 1

  network    = var.gke_network
  subnetwork = var.gke_subnetwork

  logging_service    = var.enable_stackdriver_logging ? "logging.googleapis.com/kubernetes" : "none"
  monitoring_service = var.enable_stackdriver_monitoring ? "monitoring.googleapis.com/kubernetes" : "none"

  min_master_version = var.kubernetes_version
}

resource "google_container_node_pool" "main" {
  name       = "${var.cluster_name}-nodes"
  cluster    = google_container_cluster.main.name
  location   = var.region
  node_count = var.enable_autoscaling ? null : var.node_count

  dynamic "autoscaling" {
    for_each = var.enable_autoscaling ? [1] : []
    content {
      min_node_count = var.min_node_count
      max_node_count = var.max_node_count
    }
  }

  node_config {
    machine_type = var.machine_type
    disk_size_gb = var.disk_size_gb
    oauth_scopes = ["https://www.googleapis.com/auth/cloud-platform"]
    labels       = var.common_labels
  }
}

# GCS bucket for object storage
resource "google_storage_bucket" "main" {
  count         = var.enable_object_storage ? 1 : 0
  name          = var.gcs_bucket_name != "" ? var.gcs_bucket_name : "${var.project_id}-${var.cluster_name}-storage"
  location      = var.region
  force_destroy = var.gcs_force_destroy
  labels        = var.common_labels
}

# Artifact Registry (container images)
resource "google_artifact_registry_repository" "main" {
  count         = var.enable_container_registry ? 1 : 0
  location      = var.region
  repository_id = var.cluster_name
  format        = "DOCKER"
  labels        = var.common_labels
}
```

#### 1.2.2 — `variables.tf` (key variables)

```hcl
variable "cluster_name"                    { type = string }
variable "project_id"                      { type = string }
variable "region"                          { type = string; default = "us-central1" }
variable "kubernetes_version"              { type = string; default = "1.28" }
variable "node_count"                      { type = number; default = 3 }
variable "machine_type"                    { type = string; default = "e2-medium" }
variable "disk_size_gb"                    { type = number; default = 50 }
variable "min_node_count"                  { type = number; default = 1 }
variable "max_node_count"                  { type = number; default = 5 }
variable "enable_autoscaling"              { type = bool;   default = true }
variable "gke_network"                     { type = string; default = "default" }
variable "gke_subnetwork"                  { type = string; default = "default" }
variable "service_account_key"             { type = string; default = ""; sensitive = true }
variable "enable_stackdriver_logging"      { type = bool;   default = true }
variable "enable_stackdriver_monitoring"   { type = bool;   default = true }
variable "enable_object_storage"           { type = bool;   default = false }
variable "gcs_bucket_name"                 { type = string; default = "" }
variable "gcs_force_destroy"               { type = bool;   default = false }
variable "enable_container_registry"       { type = bool;   default = false }
variable "gcp_managed_certificate_name"    { type = string; default = "" }
variable "gcp_managed_certificate_domains" { type = list(string); default = [] }
variable "common_labels"                   { type = map(string); default = {} }
```

#### 1.2.3 — `outputs.tf`

```hcl
output "cluster_name"     { value = google_container_cluster.main.name }
output "cluster_endpoint" { value = google_container_cluster.main.endpoint; sensitive = true }
output "cluster_ca_certificate" { value = google_container_cluster.main.master_auth[0].cluster_ca_certificate; sensitive = true }
output "gcs_bucket_name"  { value = var.enable_object_storage ? google_storage_bucket.main[0].name : "" }
output "artifact_registry_url" { value = var.enable_container_registry ? "${var.region}-docker.pkg.dev/${var.project_id}/${var.cluster_name}" : "" }
```

---

### 1.3 — DigitalOcean DOKS (`terraform/environments/digitalocean/`)
**Effort**: 0.5 days

#### 1.3.1 — `main.tf`

```hcl
terraform {
  required_version = ">= 1.0"
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.0"
    }
  }
}

provider "digitalocean" {
  token = var.do_token
}

resource "digitalocean_kubernetes_cluster" "main" {
  name     = var.cluster_name
  region   = var.region
  version  = var.cluster_version

  node_pool {
    name       = "${var.cluster_name}-pool"
    size       = var.node_size
    node_count = var.enable_autoscaling ? null : var.node_count
    auto_scale = var.enable_autoscaling
    min_nodes  = var.enable_autoscaling ? var.min_node_count : null
    max_nodes  = var.enable_autoscaling ? var.max_node_count : null
    tags       = [for k, v in var.common_tags : "${k}:${v}"]
  }

  surge_upgrade = var.surge_upgrade
  tags          = [for k, v in var.common_tags : "${k}:${v}"]
}

# DigitalOcean Container Registry
resource "digitalocean_container_registry" "main" {
  count                  = var.enable_container_registry ? 1 : 0
  name                   = var.registry_name != "" ? var.registry_name : var.cluster_name
  subscription_tier_slug = var.registry_tier
  region                 = var.region
}

# Attach registry to cluster
resource "digitalocean_container_registry_docker_credentials" "main" {
  count         = var.enable_container_registry ? 1 : 0
  registry_name = digitalocean_container_registry.main[0].name
}

# DigitalOcean Spaces (S3-compatible object storage)
resource "digitalocean_spaces_bucket" "main" {
  count  = var.enable_object_storage ? 1 : 0
  name   = var.spaces_bucket_name != "" ? var.spaces_bucket_name : "${var.cluster_name}-storage"
  region = var.region
  acl    = "private"
}
```

#### 1.3.2 — `variables.tf` (key variables)

```hcl
variable "cluster_name"              { type = string }
variable "region"                    { type = string; default = "nyc1" }
variable "cluster_version"           { type = string; default = "1.28" }
variable "node_size"                 { type = string; default = "s-2vcpu-4gb" }
variable "node_count"                { type = number; default = 3 }
variable "min_node_count"            { type = number; default = 1 }
variable "max_node_count"            { type = number; default = 5 }
variable "enable_autoscaling"        { type = bool;   default = true }
variable "surge_upgrade"             { type = bool;   default = true }
variable "do_token"                  { type = string; sensitive = true }
variable "enable_container_registry" { type = bool;   default = true }
variable "registry_name"             { type = string; default = "" }
variable "registry_tier"             { type = string; default = "basic" }
variable "enable_object_storage"     { type = bool;   default = false }
variable "spaces_bucket_name"        { type = string; default = "" }
variable "do_spaces_access_key"      { type = string; default = ""; sensitive = true }
variable "do_spaces_secret_key"      { type = string; default = ""; sensitive = true }
variable "common_tags"               { type = map(string); default = {} }
```

#### 1.3.3 — `outputs.tf`

```hcl
output "cluster_name"      { value = digitalocean_kubernetes_cluster.main.name }
output "cluster_endpoint"  { value = digitalocean_kubernetes_cluster.main.endpoint; sensitive = true }
output "kube_config_raw"   { value = digitalocean_kubernetes_cluster.main.kube_config[0].raw_config; sensitive = true }
output "registry_endpoint" { value = var.enable_container_registry ? digitalocean_container_registry.main[0].server_url : "" }
output "spaces_bucket_name" { value = var.enable_object_storage ? digitalocean_spaces_bucket.main[0].name : "" }
```

---

### 1.4 — Linode LKE (`terraform/environments/linode/`)
**Effort**: 0.5 days

#### 1.4.1 — `main.tf`

```hcl
terraform {
  required_version = ">= 1.0"
  required_providers {
    linode = {
      source  = "linode/linode"
      version = "~> 2.0"
    }
  }
}

provider "linode" {
  token = var.linode_token
}

resource "linode_lke_cluster" "main" {
  label       = var.cluster_name
  region      = var.region
  k8s_version = var.cluster_version

  pool {
    type  = var.node_type
    count = var.node_count

    dynamic "autoscaler" {
      for_each = var.enable_autoscaling ? [1] : []
      content {
        min = var.min_node_count
        max = var.max_node_count
      }
    }
  }

  control_plane {
    high_availability = var.ha_controlplane
  }

  tags = [for k, v in var.common_tags : "${k}=${v}"]
}

# Linode Object Storage bucket
resource "linode_object_storage_bucket" "main" {
  count   = var.enable_object_storage ? 1 : 0
  cluster = "${var.region}-1"
  label   = var.object_bucket_name != "" ? var.object_bucket_name : "${var.cluster_name}-storage"
}

# Linode Object Storage key
resource "linode_object_storage_key" "main" {
  count  = var.enable_object_storage ? 1 : 0
  label  = "${var.cluster_name}-storage-key"
}
```

#### 1.4.2 — `variables.tf` (key variables)

```hcl
variable "cluster_name"           { type = string }
variable "region"                 { type = string; default = "us-east" }
variable "cluster_version"        { type = string; default = "1.28" }
variable "node_type"              { type = string; default = "g6-standard-2" }
variable "node_count"             { type = number; default = 3 }
variable "min_node_count"         { type = number; default = 1 }
variable "max_node_count"         { type = number; default = 5 }
variable "enable_autoscaling"     { type = bool;   default = true }
variable "ha_controlplane"        { type = bool;   default = true }
variable "linode_token"           { type = string; sensitive = true }
variable "enable_object_storage"  { type = bool;   default = false }
variable "object_bucket_name"     { type = string; default = "" }
variable "common_tags"            { type = map(string); default = {} }
```

#### 1.4.3 — `outputs.tf`

```hcl
output "cluster_name"        { value = linode_lke_cluster.main.label }
output "cluster_id"          { value = linode_lke_cluster.main.id }
output "kube_config_raw"     { value = linode_lke_cluster.main.kubeconfig; sensitive = true }
output "api_endpoints"       { value = linode_lke_cluster.main.api_endpoints }
output "object_bucket_name"  { value = var.enable_object_storage ? linode_object_storage_bucket.main[0].label : "" }
```

---

### 1.5 — Smoke Test: Verify Directory Detection
**Effort**: 0.5 days

Update the smoke test assertion in `e2eDeploymentSmoke.test.js` Suite 4 once directories are created:

```javascript
// terraform/environments/ — all 5 must exist
it('all 5 provider terraform/environments/ directories now exist', () => {
  const envPath = path.join(__dirname, '../../../../terraform/environments');
  const actualFs = jest.requireActual('fs');
  ['aws', 'azure', 'gcp', 'digitalocean', 'linode'].forEach(provider => {
    expect(actualFs.existsSync(path.join(envPath, provider))).toBe(true);
  });
});
```

---

## Files Created

| File | Purpose |
|------|---------|
| `terraform/environments/azure/main.tf` | AKS cluster + ACR + Azure Files |
| `terraform/environments/azure/variables.tf` | All Azure variables |
| `terraform/environments/azure/outputs.tf` | Cluster endpoint, kubeconfig, ACR URL |
| `terraform/environments/azure/data-sources.tf` | Existing VNets, subnets (optional) |
| `terraform/environments/gcp/main.tf` | GKE cluster + Artifact Registry + GCS |
| `terraform/environments/gcp/variables.tf` | All GCP variables |
| `terraform/environments/gcp/outputs.tf` | Cluster endpoint, kubeconfig |
| `terraform/environments/gcp/data-sources.tf` | Existing networks (optional) |
| `terraform/environments/digitalocean/main.tf` | DOKS + Container Registry + Spaces |
| `terraform/environments/digitalocean/variables.tf` | All DO variables |
| `terraform/environments/digitalocean/outputs.tf` | Cluster endpoint, kubeconfig |
| `terraform/environments/linode/main.tf` | LKE + Object Storage |
| `terraform/environments/linode/variables.tf` | All Linode variables |
| `terraform/environments/linode/outputs.tf` | Cluster kubeconfig |

---

## Verification Checklist

- [ ] `terraform init` completes without error in each new environment directory
- [ ] `terraform validate` passes for each provider (no required variable errors)
- [ ] `terraform plan` with a test `.tfvars` file produces a plan without syntax errors
- [ ] Smoke test Suite 4 updated and passing for all 5 directories
- [ ] `terraformExecutor.initTerraform()` successfully copies the new module directories into the working dir
