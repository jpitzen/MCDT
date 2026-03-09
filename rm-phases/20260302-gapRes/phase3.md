# Phase 3 — SSL / Certificate tfvars for Non-AWS Providers
## GAP-005 · Medium · External access mode support

**Priority**: P2 (required for external access mode deployments on non-AWS)
**Effort**: 1.5 days
**Prerequisites**: Phase 1 (terraform dirs), Phase 2 (expanded tfvars)

---

## Objective

AWS has `ssl_cert_arn` (ACM ARN) injected into tfvars when `accessMode = 'external'`. Non-AWS providers have no equivalent, meaning external-facing ZL deployments on Azure/GCP/DO/Linode launch with no TLS termination configured. Each provider uses a different certificate mechanism:

| Provider | Mechanism | Terraform Resource |
|----------|-----------|--------------------|
| Azure | App Gateway / cert name | `azurerm_application_gateway`, `azurerm_key_vault_certificate` |
| GCP | GCP Managed Certificate | `google_compute_managed_ssl_certificate` |
| DigitalOcean | cert-manager + Let's Encrypt via annotation | `digitalocean_certificate` |
| Linode | NodeBalancer SSL termination | `linode_nodebalancer_config` |

---

## Tasks

### 3.1 — Azure SSL Variables
**File**: `backend/src/services/multiCloudOrchestrator.js`
**Location**: `generateCloudSpecificVars()` Azure case (after Phase 2 expansion)

Add to the Azure vars (already has `ssl_certificate_name` stub from Phase 2):

```javascript
// SSL / Ingress (Azure App Gateway or nginx-ingress)
ssl_certificate_name: deploymentConfig.sslCertificateName || '',
ingress_application_gateway: deploymentConfig.ingressApplicationGateway || false,
app_gateway_name: deploymentConfig.appGatewayName || '',
app_gateway_sku: deploymentConfig.appGatewaySku || 'WAF_v2',
app_gateway_min_capacity: deploymentConfig.appGatewayMinCapacity || 1,
app_gateway_max_capacity: deploymentConfig.appGatewayMaxCapacity || 3,
ssl_policy_name: deploymentConfig.sslPolicyName || 'AppGwSslPolicy20220101',
```

**File**: `terraform/environments/azure/variables.tf`

Add new variables:

```hcl
variable "ingress_application_gateway" { type = bool;   default = false }
variable "app_gateway_name"            { type = string; default = "" }
variable "app_gateway_sku"             { type = string; default = "WAF_v2" }
variable "app_gateway_min_capacity"    { type = number; default = 1 }
variable "app_gateway_max_capacity"    { type = number; default = 3 }
variable "ssl_certificate_name"        { type = string; default = "" }
variable "ssl_policy_name"             { type = string; default = "AppGwSslPolicy20220101" }
```

**File**: `terraform/environments/azure/main.tf`

Add conditional Application Gateway block:

```hcl
resource "azurerm_application_gateway" "main" {
  count               = var.ingress_application_gateway ? 1 : 0
  name                = var.app_gateway_name != "" ? var.app_gateway_name : "${var.cluster_name}-agw"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location

  sku {
    name     = var.app_gateway_sku
    tier     = var.app_gateway_sku
  }

  autoscale_configuration {
    min_capacity = var.app_gateway_min_capacity
    max_capacity = var.app_gateway_max_capacity
  }

  ssl_policy {
    policy_name = var.ssl_policy_name
    policy_type = "Predefined"
  }

  # frontend_ip_configuration, http_listener, backend_address_pool, etc.
  # are required but omitted here — implement with a submodule or data block
  # referencing the AKS ingress controller service IP.
}
```

---

### 3.2 — GCP SSL Variables
**File**: `backend/src/services/multiCloudOrchestrator.js`
**Location**: `generateCloudSpecificVars()` GCP case

Add (already has stub from Phase 2):

```javascript
// SSL (GCP Managed Certificate)
gcp_managed_certificate_name: deploymentConfig.gcpManagedCertificateName || '',
gcp_managed_certificate_domains: deploymentConfig.gcpManagedCertificateDomains ||
  (deploymentConfig.externalDomain ? [deploymentConfig.externalDomain] : []),
enable_managed_certificate: !!(deploymentConfig.gcpManagedCertificateDomains?.length ||
  deploymentConfig.externalDomain),
```

**File**: `terraform/environments/gcp/variables.tf`

```hcl
variable "enable_managed_certificate"        { type = bool;         default = false }
variable "gcp_managed_certificate_name"      { type = string;       default = "" }
variable "gcp_managed_certificate_domains"   { type = list(string); default = [] }
```

**File**: `terraform/environments/gcp/main.tf`

```hcl
resource "google_compute_managed_ssl_certificate" "main" {
  count = var.enable_managed_certificate ? 1 : 0
  name  = var.gcp_managed_certificate_name != "" ? var.gcp_managed_certificate_name : "${var.cluster_name}-cert"

  managed {
    domains = var.gcp_managed_certificate_domains
  }
}
```

---

### 3.3 — DigitalOcean SSL Variables
**File**: `backend/src/services/multiCloudOrchestrator.js`
**Location**: `generateCloudSpecificVars()` DigitalOcean case

```javascript
// SSL (DigitalOcean Certificate + cert-manager annotation on ingress)
enable_ssl_certificate: deploymentConfig.enableSslCertificate ||
  deploymentConfig.accessMode === 'external',
do_certificate_name: deploymentConfig.doCertificateName || '',
do_certificate_type: deploymentConfig.doCertificateType || 'lets_encrypt',
do_certificate_domains: deploymentConfig.doCertificateDomains ||
  (deploymentConfig.externalDomain ? [deploymentConfig.externalDomain] : []),
```

**File**: `terraform/environments/digitalocean/variables.tf`

```hcl
variable "enable_ssl_certificate"   { type = bool;         default = false }
variable "do_certificate_name"      { type = string;       default = "" }
variable "do_certificate_type"      { type = string;       default = "lets_encrypt" }
variable "do_certificate_domains"   { type = list(string); default = [] }
```

**File**: `terraform/environments/digitalocean/main.tf`

```hcl
resource "digitalocean_certificate" "main" {
  count  = var.enable_ssl_certificate && length(var.do_certificate_domains) > 0 ? 1 : 0
  name   = var.do_certificate_name != "" ? var.do_certificate_name : "${var.cluster_name}-cert"
  type   = var.do_certificate_type

  # For lets_encrypt type: domains is required, private_key/leaf_certificate not used
  domains = var.do_certificate_type == "lets_encrypt" ? var.do_certificate_domains : null
}
```

---

### 3.4 — Linode SSL Variables
**File**: `backend/src/services/multiCloudOrchestrator.js`
**Location**: `generateCloudSpecificVars()` Linode case

```javascript
// SSL (Linode NodeBalancer SSL termination)
enable_ssl: deploymentConfig.enableSsl || deploymentConfig.accessMode === 'external',
ssl_cert: deploymentConfig.sslCert || '',     // PEM-encoded certificate
ssl_key: deploymentConfig.sslKey || '',       // PEM-encoded private key
```

**File**: `terraform/environments/linode/variables.tf`

```hcl
variable "enable_ssl"  { type = bool;   default = false }
variable "ssl_cert"    { type = string; default = ""; sensitive = true }
variable "ssl_key"     { type = string; default = ""; sensitive = true }
```

> **Note**: Linode NodeBalancer SSL is provisioned outside LKE (via `linode_nodebalancer_config` resource) and attached to the LoadBalancer service. The `ssl_cert` / `ssl_key` variables are passed as tfvars only when `accessMode = 'external'` and keys are provided via secrets vault.

---

### 3.5 — `generateTerraformVars` Access Mode Injection
**File**: `backend/src/services/multiCloudOrchestrator.js`
**Location**: `generateTerraformVars()` — after `generateCloudSpecificVars` call

Currently `accessMode`, `externalDomain`, and SSL fields are stored in the deployment config but never injected into non-AWS tfvars. Add an access mode overlay for all providers:

```javascript
// Inject access mode fields for all providers
if (deploymentConfig.accessMode === 'external') {
  const accessModeOverrides = {
    access_mode: 'external',
    external_domain: deploymentConfig.externalDomain || '',
  };

  // AWS-specific: ACM cert ARN already handled in generateCloudSpecificVars
  // Non-AWS: append provider-specific SSL vars
  if (cloudProvider !== 'aws' && deploymentConfig.sslMode) {
    accessModeOverrides.ssl_mode = deploymentConfig.sslMode;
  }

  Object.assign(cloudSpecificVars, accessModeOverrides);
}
```

---

### 3.6 — Smoke Tests
**File**: `backend/src/services/__tests__/e2eDeploymentSmoke.test.js`

Update Suite 15 (Access Mode) and add new provider SSL assertions:

```javascript
it('Azure external access vars include ssl_certificate_name and app gateway flags', async () => {
  const config = makeConfig('azure', {
    accessMode: 'external',
    externalDomain: 'app.example.com',
    sslCertificateName: 'my-azure-cert',
    ingressApplicationGateway: true,
  });
  const vars = await multiCloudOrchestrator.generateTerraformVars(
    'dep-az-ssl', 'azure', 'ref-az', 'aws-secrets', config
  );
  expect(vars.ssl_certificate_name).toBe('my-azure-cert');
  expect(vars.ingress_application_gateway).toBe(true);
  expect(vars.external_domain).toBe('app.example.com');
});

it('GCP external access vars populate managed certificate domains from externalDomain', async () => {
  const config = makeConfig('gcp', {
    accessMode: 'external',
    externalDomain: 'app.example.com',
  });
  const vars = await multiCloudOrchestrator.generateTerraformVars(
    'dep-gcp-ssl', 'gcp', 'ref-gcp', 'aws-secrets', config
  );
  expect(vars.enable_managed_certificate).toBe(true);
  expect(vars.gcp_managed_certificate_domains).toContain('app.example.com');
});

it('DigitalOcean external access vars set enable_ssl_certificate and domains', async () => {
  const config = makeConfig('digitalocean', {
    accessMode: 'external',
    externalDomain: 'app.example.com',
    doCertificateType: 'lets_encrypt',
  });
  const vars = await multiCloudOrchestrator.generateTerraformVars(
    'dep-do-ssl', 'digitalocean', 'ref-do', 'aws-secrets', config
  );
  expect(vars.enable_ssl_certificate).toBe(true);
  expect(vars.do_certificate_domains).toContain('app.example.com');
});
```

---

## Files Modified

| File | Change |
|------|--------|
| `backend/src/services/multiCloudOrchestrator.js` | Add SSL vars to Azure/GCP/DO/Linode cases; access mode overlay in `generateTerraformVars` |
| `terraform/environments/azure/main.tf` | Add conditional `azurerm_application_gateway` block |
| `terraform/environments/azure/variables.tf` | Add SSL/App Gateway variables |
| `terraform/environments/gcp/main.tf` | Add `google_compute_managed_ssl_certificate` |
| `terraform/environments/gcp/variables.tf` | Add managed cert variables |
| `terraform/environments/digitalocean/main.tf` | Add `digitalocean_certificate` |
| `terraform/environments/digitalocean/variables.tf` | Add certificate variables |
| `terraform/environments/linode/variables.tf` | Add `enable_ssl`, `ssl_cert`, `ssl_key` |
| `backend/src/services/__tests__/e2eDeploymentSmoke.test.js` | Add SSL assertions to Suite 15 |

---

## Verification Checklist

- [ ] Azure external deployment tfvars include `ssl_certificate_name` and `ingress_application_gateway`
- [ ] GCP external deployment tfvars include `enable_managed_certificate = true` and domain list
- [ ] DigitalOcean external deployment tfvars include `enable_ssl_certificate = true` and `do_certificate_domains`
- [ ] Linode external deployment tfvars include `enable_ssl`, `ssl_cert`, `ssl_key` when provided
- [ ] Internal mode deployments for all providers do **not** include SSL vars (or they are all falsy/empty)
- [ ] `access_mode = "external"` and `external_domain` appear in all non-AWS external tfvars
- [ ] Smoke test Suite 15 passes for Azure, GCP, DO
