# Phase 2 — Expand Non-AWS Provider Terraform Variables
## GAP-002 · High · Parity with AWS 100+ tfvars

**Priority**: P1 (non-AWS providers deploy with minimal configuration, causing missing infrastructure)
**Effort**: 3 days
**Prerequisites**: Phase 1 (terraform environment directories must exist)

---

## Objective

The `generateCloudSpecificVars()` method in `multiCloudOrchestrator.js` returns fewer than 10 variables for Azure, GCP, DigitalOcean, and Linode, compared to 100+ for AWS. This means non-AWS clusters are deployed with no networking configuration, no node pool sizing, no monitoring, no storage, and no registry settings — the Terraform plan simply uses all defaults.

This phase adds full variable sets to match what the Phase 1 `.tf` files actually declare, closing the gap between what the wizard collects and what Terraform receives.

---

## Tasks

### 2.1 — Azure `generateCloudSpecificVars` Expansion
**File**: `backend/src/services/multiCloudOrchestrator.js`
**Location**: `generateCloudSpecificVars()` — `case 'azure':`

Replace the current 9-variable block with the full set:

```javascript
case 'azure':
  return {
    // Core
    resource_group: deploymentConfig.resourceGroup || `rg-${deploymentConfig.clusterName}`,
    environment: deploymentConfig.environment || 'production',

    // Node pool
    node_vm_size: deploymentConfig.nodeInstanceType || 'Standard_D2s_v3',
    os_disk_size_gb: deploymentConfig.osDiskSizeGb || 50,

    // Networking
    network_plugin: deploymentConfig.networkPlugin || 'azure',
    network_policy: deploymentConfig.networkPolicy || 'azure',
    pod_cidr: deploymentConfig.podCidr || '172.17.0.0/16',
    service_cidr: deploymentConfig.serviceCidr || '172.20.0.0/16',
    dns_service_ip: deploymentConfig.dnsServiceIp || '172.20.0.10',

    // Auth
    subscription_id: credentials?.subscriptionId || '',
    client_id: credentials?.clientId || '',
    client_secret: credentials?.clientSecret || '',
    tenant_id: credentials?.tenantId || '',

    // Container Registry
    enable_container_registry: deploymentConfig.enableContainerRegistry || false,
    acr_name: deploymentConfig.acrName || '',
    acr_sku: deploymentConfig.acrSku || 'Standard',
    acr_admin_enabled: deploymentConfig.acrAdminEnabled || false,

    // File Storage (Azure Files)
    enable_file_storage: deploymentConfig.enableFileStorage || false,
    file_storage_quota_gb: deploymentConfig.fileStorageQuotaGb || 100,

    // Object Storage (Blob)
    enable_object_storage: deploymentConfig.enableObjectStorage || false,
    storage_account_name: deploymentConfig.storageAccountName || '',
    storage_container_name: deploymentConfig.storageContainerName || '',

    // SSL / Ingress
    ssl_certificate_name: deploymentConfig.sslCertificateName || '',
    ingress_application_gateway: deploymentConfig.ingressApplicationGateway || false,

    // Tags
    common_tags: deploymentConfig.tags ? (() => {
      const obj = {};
      (Array.isArray(deploymentConfig.tags) ? deploymentConfig.tags : []).forEach(t => {
        if (t.key) obj[t.key] = t.value || '';
      });
      return obj;
    })() : {},
  };
```

---

### 2.2 — GCP `generateCloudSpecificVars` Expansion
**File**: `backend/src/services/multiCloudOrchestrator.js`
**Location**: `generateCloudSpecificVars()` — `case 'gcp':`

Replace the current 5-variable block:

```javascript
case 'gcp':
  return {
    // Core
    project_id: deploymentConfig.projectId || credentials?.projectId || '',
    kubernetes_version: deploymentConfig.kubernetesVersion || '1.28',

    // Node pool
    machine_type: deploymentConfig.machineType || 'e2-medium',
    disk_size_gb: deploymentConfig.diskSizeGb || 50,

    // Networking
    gke_network: deploymentConfig.gkeNetwork || 'default',
    gke_subnetwork: deploymentConfig.gkeSubnetwork || 'default',

    // Auth
    service_account_key: credentials?.serviceAccountKey || '',

    // Autoscaling
    enable_autoscaling: deploymentConfig.enableAutoscaling !== false,
    min_node_count: deploymentConfig.minNodeCount || 1,
    max_node_count: deploymentConfig.maxNodeCount || 5,

    // Observability
    enable_stackdriver_logging: deploymentConfig.enableStackdriverLogging !== false,
    enable_stackdriver_monitoring: deploymentConfig.enableStackdriverMonitoring !== false,

    // Container Registry (Artifact Registry)
    enable_container_registry: deploymentConfig.enableContainerRegistry || false,

    // Object Storage (GCS)
    enable_object_storage: deploymentConfig.enableObjectStorage || false,
    gcs_bucket_name: deploymentConfig.gcsBucketName || '',
    gcs_force_destroy: deploymentConfig.gcsForceDestroy || false,

    // SSL (GCP Managed Certificate)
    gcp_managed_certificate_name: deploymentConfig.gcpManagedCertificateName || '',
    gcp_managed_certificate_domains: deploymentConfig.gcpManagedCertificateDomains || [],

    // Labels
    common_labels: deploymentConfig.tags ? (() => {
      const obj = {};
      (Array.isArray(deploymentConfig.tags) ? deploymentConfig.tags : []).forEach(t => {
        if (t.key) obj[t.key.toLowerCase()] = (t.value || '').toLowerCase().replace(/[^a-z0-9-_]/g, '-');
      });
      return obj;
    })() : {},
  };
```

---

### 2.3 — DigitalOcean `generateCloudSpecificVars` Expansion
**File**: `backend/src/services/multiCloudOrchestrator.js`
**Location**: `generateCloudSpecificVars()` — `case 'digitalocean':`

Replace the current 4-variable block:

```javascript
case 'digitalocean':
  return {
    // Core
    cluster_version: deploymentConfig.kubernetesVersion || '1.28',
    node_size: deploymentConfig.nodeInstanceType || 's-2vcpu-4gb',
    node_count: deploymentConfig.nodeCount || 3,
    min_node_count: deploymentConfig.minNodeCount || 1,
    max_node_count: deploymentConfig.maxNodeCount || 5,
    enable_autoscaling: deploymentConfig.enableAutoscaling !== false,
    surge_upgrade: deploymentConfig.surgeUpgrade !== false,

    // Auth
    do_token: credentials?.apiToken || '',

    // Container Registry (DO Container Registry)
    enable_container_registry: deploymentConfig.enableContainerRegistry !== false,
    registry_name: deploymentConfig.registryName || '',
    registry_tier: deploymentConfig.registryTier || 'basic',

    // Object Storage (DO Spaces — S3-compatible)
    enable_object_storage: deploymentConfig.enableObjectStorage || false,
    spaces_bucket_name: deploymentConfig.spacesBucketName || '',
    do_spaces_access_key: credentials?.spacesAccessKey || '',
    do_spaces_secret_key: credentials?.spacesSecretKey || '',

    // Tags
    common_tags: deploymentConfig.tags ? (() => {
      const obj = {};
      (Array.isArray(deploymentConfig.tags) ? deploymentConfig.tags : []).forEach(t => {
        if (t.key) obj[t.key] = t.value || '';
      });
      return obj;
    })() : {},
  };
```

---

### 2.4 — Linode `generateCloudSpecificVars` Expansion
**File**: `backend/src/services/multiCloudOrchestrator.js`
**Location**: `generateCloudSpecificVars()` — `case 'linode':`

Replace the current 4-variable block:

```javascript
case 'linode':
  return {
    // Core
    cluster_version: deploymentConfig.kubernetesVersion || '1.28',
    node_type: deploymentConfig.nodeInstanceType || 'g6-standard-2',
    node_count: deploymentConfig.nodeCount || 3,
    min_node_count: deploymentConfig.minNodeCount || 1,
    max_node_count: deploymentConfig.maxNodeCount || 5,
    enable_autoscaling: deploymentConfig.enableAutoscaling !== false,
    ha_controlplane: deploymentConfig.haControlplane !== false,

    // Auth
    linode_token: credentials?.apiToken || '',

    // Object Storage (Linode Object Storage — S3-compatible)
    enable_object_storage: deploymentConfig.enableObjectStorage || false,
    object_bucket_name: deploymentConfig.objectBucketName || '',

    // Tags
    common_tags: deploymentConfig.tags ? (() => {
      const obj = {};
      (Array.isArray(deploymentConfig.tags) ? deploymentConfig.tags : []).forEach(t => {
        if (t.key) obj[t.key] = t.value || '';
      });
      return obj;
    })() : {},
  };
```

---

### 2.5 — Extract Tag Conversion Helper
**File**: `backend/src/services/multiCloudOrchestrator.js`

The tag array→object conversion is repeated 4 times. Extract it as a private method to avoid duplication:

```javascript
/**
 * Convert tags array [{ key, value }] to a plain object { key: value }.
 * Invalid entries (no key) are silently skipped.
 * @param {Array|object} tags - Tags from deploymentConfig
 * @returns {object} Tag map
 */
_normalizeTags(tags) {
  if (!tags) return {};
  if (!Array.isArray(tags)) return typeof tags === 'object' ? tags : {};
  const obj = {};
  tags.forEach(t => { if (t && t.key) obj[t.key] = t.value || ''; });
  return obj;
}
```

Then replace all inline tag conversions in `generateCloudSpecificVars()` with `this._normalizeTags(deploymentConfig.tags)`.

---

### 2.6 — Update `generateTerraformVars` for Non-AWS Credential Injection
**File**: `backend/src/services/multiCloudOrchestrator.js`
**Location**: `generateTerraformVars()` — after `retrieveCredentials` call

The current `generateTerraformVars` only passes credentials to `generateCloudSpecificVars` for AWS (where the credential fields are directly embedded in `awsVars`). Non-AWS providers receive the `credentials` object as the second argument to `generateCloudSpecificVars`. Verify the call site passes it correctly:

```javascript
// generateCloudSpecificVars(cloudProvider, deploymentConfig, credentials)
const cloudSpecificVars = this.generateCloudSpecificVars(
  cloudProvider,
  deploymentConfig,
  retrievedCredentials  // ← ensure this is passed for all providers
);
```

---

### 2.7 — Smoke Tests
**File**: `backend/src/services/__tests__/e2eDeploymentSmoke.test.js`

Update Suite 3 GAP test (Azure/GCP/DO/Linode tfvars count) to reflect new minimums:

```javascript
it('IMPROVED: Non-AWS providers now have expanded tfvars', () => {
  const azureVars = multiCloudOrchestrator.generateCloudSpecificVars('azure', makeConfig('azure'), makeCredential('azure'));
  const gcpVars   = multiCloudOrchestrator.generateCloudSpecificVars('gcp', makeConfig('gcp'), makeCredential('gcp'));
  const doVars    = multiCloudOrchestrator.generateCloudSpecificVars('digitalocean', makeConfig('digitalocean'), makeCredential('digitalocean'));
  const linodeVars = multiCloudOrchestrator.generateCloudSpecificVars('linode', makeConfig('linode'), makeCredential('linode'));

  expect(Object.keys(azureVars).length).toBeGreaterThan(15);
  expect(Object.keys(gcpVars).length).toBeGreaterThan(15);
  expect(Object.keys(doVars).length).toBeGreaterThan(12);
  expect(Object.keys(linodeVars).length).toBeGreaterThan(10);
});

it('Azure vars include auth credentials', () => {
  const vars = multiCloudOrchestrator.generateCloudSpecificVars('azure', makeConfig('azure'), makeCredential('azure'));
  expect(vars.subscription_id).toBe('sub-123');
  expect(vars.client_id).toBe('c-123');
  expect(vars.tenant_id).toBe('t-123');
  expect(vars.client_secret).toBeDefined();
});

it('GCP vars include service account key and project_id', () => {
  const vars = multiCloudOrchestrator.generateCloudSpecificVars('gcp', makeConfig('gcp'), makeCredential('gcp'));
  expect(vars.project_id).toBe('my-gcp-project');
  expect(vars.machine_type).toBeDefined();
  expect(vars.gke_network).toBeDefined();
});

it('DigitalOcean vars include do_token and registry settings', () => {
  const vars = multiCloudOrchestrator.generateCloudSpecificVars('digitalocean', makeConfig('digitalocean'), makeCredential('digitalocean'));
  expect(vars.do_token).toBe('do-token-abc');
  expect(vars.node_size).toBeDefined();
  expect(vars.enable_container_registry).toBeDefined();
});

it('Linode vars include linode_token and ha_controlplane', () => {
  const vars = multiCloudOrchestrator.generateCloudSpecificVars('linode', makeConfig('linode'), makeCredential('linode'));
  expect(vars.linode_token).toBe('linode-token-xyz');
  expect(vars.ha_controlplane).toBe(true);
  expect(vars.node_type).toBeDefined();
});
```

---

## Files Modified

| File | Change |
|------|--------|
| `backend/src/services/multiCloudOrchestrator.js` | Expand all 4 non-AWS `generateCloudSpecificVars` cases; add `_normalizeTags()` helper |
| `backend/src/services/__tests__/e2eDeploymentSmoke.test.js` | Update Suite 3 GAP test thresholds + add per-provider assertions |

---

## Verification Checklist

- [ ] All 4 non-AWS provider `generateCloudSpecificVars` return > 10 variables
- [ ] Azure vars include `subscription_id`, `client_id`, `tenant_id`, `client_secret`
- [ ] GCP vars include `project_id`, `service_account_key`
- [ ] DO vars include `do_token`, `node_size`, `enable_container_registry`
- [ ] Linode vars include `linode_token`, `ha_controlplane`, `node_type`
- [ ] Each provider's tfvars match what `terraform/environments/{provider}/variables.tf` declares (no unknown variable warnings)
- [ ] `_normalizeTags()` handles array, plain object, and null/undefined inputs
- [ ] All 56 existing smoke tests still pass
