# Phase 4 — Provider-Specific Error Handling in `applyTerraform`
## GAP-004 · Medium · Actionable error messages for all providers

**Priority**: P2 (deployments fail with cryptic Terraform output; no actionable guidance for non-AWS errors)
**Effort**: 1.5 days
**Prerequisites**: Phase 1 (providers must be deployable before errors are observable)

---

## Objective

`terraformExecutor.applyTerraform()` contains rich error detection for AWS (quota exceeded, resource already exists, EIP limits, etc.) but does nothing provider-specific for Azure, GCP, DigitalOcean, or Linode. When these providers fail, the raw Terraform stderr is thrown as-is, with no user-friendly message or suggested remediation.

This phase adds provider-aware error detection blocks that:
1. Match provider-specific error strings from `result.stderr`
2. Emit a structured, human-readable `emitFailure` WebSocket event
3. Throw a clear error with remediation guidance

---

## Tasks

### 4.1 — Detect Cloud Provider from Deployment Record
**File**: `backend/src/services/terraformExecutor.js`
**Location**: `applyTerraform()` — beginning of the `if (result.exitCode !== 0)` block

The method currently has `deploymentId` and `deploymentDir` in scope. Add a helper to determine the active provider from the working directory path:

```javascript
// Infer provider from deploymentDir path (e.g. "aws-us-east-1-my-cluster" → 'aws')
_inferProviderFromDir(deploymentDir) {
  const segments = path.basename(deploymentDir).toLowerCase();
  if (segments.startsWith('aws')) return 'aws';
  if (segments.startsWith('azure')) return 'azure';
  if (segments.startsWith('gcp')) return 'gcp';
  if (segments.startsWith('digitalocean')) return 'digitalocean';
  if (segments.startsWith('linode')) return 'linode';
  return 'unknown';
}
```

Call this at the start of the error block:

```javascript
const provider = this._inferProviderFromDir(deploymentDir);
```

---

### 4.2 — Azure Error Patterns
**File**: `backend/src/services/terraformExecutor.js`
**Location**: `applyTerraform()` — inside `if (result.exitCode !== 0)`, after existing AWS quota checks

```javascript
// ── Azure-specific errors ──────────────────────────────────────────────
if (provider === 'azure') {
  const azureErrors = [
    {
      pattern: 'QuotaExceeded',
      message: 'Azure quota exceeded. Open a support request at https://portal.azure.com to increase vCPU or other limits.',
    },
    {
      pattern: 'ResourceGroupBeingDeleted',
      message: 'Azure resource group is still being deleted. Wait a few minutes and retry.',
    },
    {
      pattern: 'AuthorizationFailed',
      message: 'Azure authorization failed. Check that the Service Principal has Contributor role on the target subscription.',
    },
    {
      pattern: 'InvalidResourceLocation',
      message: 'Azure resource location mismatch. Ensure all resources are in the same region as the resource group.',
    },
    {
      pattern: 'SubscriptionNotRegistered',
      message: 'Azure resource provider not registered. Run: az provider register --namespace <provider> --subscription <id>',
    },
    {
      pattern: 'SKUNotAvailable',
      message: 'Azure VM SKU not available in this region. Choose a different VM size or region.',
    },
    {
      pattern: 'RequestDisallowedByPolicy',
      message: 'Azure Policy blocked this deployment. Contact your Azure administrator to review policy assignments.',
    },
  ];

  for (const azErr of azureErrors) {
    if (result.stderr.includes(azErr.pattern)) {
      logger.error(`[TerraformExecutor] Azure error: ${azErr.message}`, { deploymentId, pattern: azErr.pattern });
      websocketServer.emitFailure(deploymentId, azErr.message, { details: result.stderr, phase: 'terraform-apply', provider: 'azure' });
      throw new Error(azErr.message);
    }
  }
}
```

---

### 4.3 — GCP Error Patterns
**File**: `backend/src/services/terraformExecutor.js`
**Location**: `applyTerraform()` — after Azure block

```javascript
// ── GCP-specific errors ────────────────────────────────────────────────
if (provider === 'gcp') {
  const gcpErrors = [
    {
      pattern: 'QUOTA_EXCEEDED',
      message: 'GCP quota exceeded. Request increases at https://console.cloud.google.com/iam-admin/quotas.',
    },
    {
      pattern: 'PERMISSION_DENIED',
      message: 'GCP permission denied. Ensure the Service Account has "roles/container.admin" and "roles/compute.networkAdmin".',
    },
    {
      pattern: 'API_DISABLED',
      message: 'A required GCP API is disabled. Enable container.googleapis.com and compute.googleapis.com in the project.',
    },
    {
      pattern: 'billing account',
      message: 'GCP billing account not linked to this project. Enable billing at https://console.cloud.google.com/billing.',
    },
    {
      pattern: 'RESOURCE_ALREADY_EXISTS',
      message: 'GCP resource already exists. Use `terraform import` to bring it under management, or choose a different cluster name.',
    },
    {
      pattern: 'invalid_grant',
      message: 'GCP service account key is invalid or expired. Generate a new key in IAM & Admin → Service Accounts.',
    },
  ];

  for (const gcpErr of gcpErrors) {
    if (result.stderr.toLowerCase().includes(gcpErr.pattern.toLowerCase())) {
      logger.error(`[TerraformExecutor] GCP error: ${gcpErr.message}`, { deploymentId, pattern: gcpErr.pattern });
      websocketServer.emitFailure(deploymentId, gcpErr.message, { details: result.stderr, phase: 'terraform-apply', provider: 'gcp' });
      throw new Error(gcpErr.message);
    }
  }
}
```

---

### 4.4 — DigitalOcean Error Patterns
**File**: `backend/src/services/terraformExecutor.js`
**Location**: `applyTerraform()` — after GCP block

```javascript
// ── DigitalOcean-specific errors ───────────────────────────────────────
if (provider === 'digitalocean') {
  const doErrors = [
    {
      pattern: '422 Unprocessable Entity',
      message: 'DigitalOcean rejected the request (422). Check Kubernetes version availability and node pool size limits.',
    },
    {
      pattern: 'exhausted',
      message: 'DigitalOcean resource limit reached. Upgrade your account or destroy unused resources.',
    },
    {
      pattern: 'unauthorized',
      message: 'DigitalOcean API token is invalid or expired. Generate a new Personal Access Token with read/write scope.',
    },
    {
      pattern: 'not_found',
      message: 'DigitalOcean resource not found. Verify the region slug and Kubernetes version are valid.',
    },
    {
      pattern: 'too many requests',
      message: 'DigitalOcean API rate limit hit. Wait 60 seconds and retry.',
    },
  ];

  for (const doErr of doErrors) {
    if (result.stderr.toLowerCase().includes(doErr.pattern.toLowerCase())) {
      logger.error(`[TerraformExecutor] DigitalOcean error: ${doErr.message}`, { deploymentId, pattern: doErr.pattern });
      websocketServer.emitFailure(deploymentId, doErr.message, { details: result.stderr, phase: 'terraform-apply', provider: 'digitalocean' });
      throw new Error(doErr.message);
    }
  }
}
```

---

### 4.5 — Linode Error Patterns
**File**: `backend/src/services/terraformExecutor.js`
**Location**: `applyTerraform()` — after DigitalOcean block

```javascript
// ── Linode-specific errors ─────────────────────────────────────────────
if (provider === 'linode') {
  const linodeErrors = [
    {
      pattern: '401',
      message: 'Linode API token is invalid or expired. Generate a new token at https://cloud.linode.com/profile/tokens.',
    },
    {
      pattern: 'limit_exceeded',
      message: 'Linode account resource limit exceeded. Open a support ticket to increase limits.',
    },
    {
      pattern: 'not_found',
      message: 'Linode resource not found. Verify the region and Kubernetes version are available.',
    },
    {
      pattern: 'requested entity is currently being updated',
      message: 'Linode resource is locked (in progress). Wait and retry.',
    },
  ];

  for (const linodeErr of linodeErrors) {
    if (result.stderr.toLowerCase().includes(linodeErr.pattern.toLowerCase())) {
      logger.error(`[TerraformExecutor] Linode error: ${linodeErr.message}`, { deploymentId, pattern: linodeErr.pattern });
      websocketServer.emitFailure(deploymentId, linodeErr.message, { details: result.stderr, phase: 'terraform-apply', provider: 'linode' });
      throw new Error(linodeErr.message);
    }
  }
}
```

---

### 4.6 — Centralise Error Pattern Table
To keep `applyTerraform()` readable, extract all provider error maps into a constant at module scope:

```javascript
// backend/src/services/terraformExecutor.js — top of file, after requires

const PROVIDER_APPLY_ERRORS = {
  aws: [
    { pattern: 'AddressLimitExceeded', message: 'AWS Elastic IP address limit exceeded...' },
    { pattern: 'LimitExceeded', message: 'AWS resource limit exceeded...' },
    { pattern: 'RequestLimitExceeded', message: 'AWS request limit exceeded...' },
  ],
  azure: [
    { pattern: 'QuotaExceeded', message: '...' },
    // ... (same as §4.2)
  ],
  gcp: [ /* §4.3 */ ],
  digitalocean: [ /* §4.4 */ ],
  linode: [ /* §4.5 */ ],
};
```

Then replace all the per-block loops with a single generic handler:

```javascript
// Generic provider error check
const providerErrors = PROVIDER_APPLY_ERRORS[provider] || [];
for (const err of providerErrors) {
  if (result.stderr.includes(err.pattern) || result.stderr.toLowerCase().includes(err.pattern.toLowerCase())) {
    logger.error(`[TerraformExecutor] ${provider} apply error: ${err.message}`, { deploymentId });
    websocketServer.emitFailure(deploymentId, err.message, { details: result.stderr, phase: 'terraform-apply', provider });
    throw new Error(err.message);
  }
}
```

---

### 4.7 — Smoke Tests
**File**: `backend/src/services/__tests__/e2eDeploymentSmoke.test.js`

Add a new suite for error message routing:

```javascript
describe('TERRAFORM APPLY: Provider-specific error detection', () => {
  let terraformExecutor;

  beforeEach(() => {
    jest.isolateModules(() => {
      terraformExecutor = require('../terraformExecutor');
    });
  });

  it('_inferProviderFromDir returns correct provider from dir name', () => {
    expect(terraformExecutor._inferProviderFromDir('/tmp/zlaws/clusters/aws-us-east-1-cluster')).toBe('aws');
    expect(terraformExecutor._inferProviderFromDir('/tmp/zlaws/clusters/azure-eastus-cluster')).toBe('azure');
    expect(terraformExecutor._inferProviderFromDir('/tmp/zlaws/clusters/gcp-us-central1-cluster')).toBe('gcp');
    expect(terraformExecutor._inferProviderFromDir('/tmp/zlaws/clusters/digitalocean-nyc1-cluster')).toBe('digitalocean');
    expect(terraformExecutor._inferProviderFromDir('/tmp/zlaws/clusters/linode-us-east-cluster')).toBe('linode');
  });

  it('PROVIDER_APPLY_ERRORS covers all 5 providers', () => {
    const { PROVIDER_APPLY_ERRORS } = require('../terraformExecutor');
    ['aws', 'azure', 'gcp', 'digitalocean', 'linode'].forEach(p => {
      expect(PROVIDER_APPLY_ERRORS[p]).toBeDefined();
      expect(PROVIDER_APPLY_ERRORS[p].length).toBeGreaterThan(0);
    });
  });
});
```

---

## Files Modified

| File | Change |
|------|--------|
| `backend/src/services/terraformExecutor.js` | Add `_inferProviderFromDir()` helper; add `PROVIDER_APPLY_ERRORS` constant; replace inline AWS error checks with unified generic handler for all 5 providers |
| `backend/src/services/__tests__/e2eDeploymentSmoke.test.js` | Add Suite 16: provider error detection tests |

---

## Verification Checklist

- [ ] `_inferProviderFromDir` correctly identifies all 5 providers from directory path conventions
- [ ] Azure `QuotaExceeded` in stderr produces a user-friendly message (not raw Terraform output)
- [ ] GCP `PERMISSION_DENIED` produces a message with role recommendations
- [ ] DigitalOcean `unauthorized` produces a token guidance message
- [ ] Linode `401` produces a token refresh message
- [ ] Existing AWS quota and `alreadyExists` error paths still work unchanged
- [ ] All 56+ existing smoke tests still pass
