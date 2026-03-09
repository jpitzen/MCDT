# Phase 5 — Multi-Cloud Model Upload in `triggerModelUpload`
## GAP-003 · Medium · Replace hardcoded AWS S3 with provider-aware object storage

**Priority**: P2 (model uploads silently fail or error for non-AWS deployments)
**Effort**: 1.5 days
**Prerequisites**: Phase 1 (terraform dirs confirm object storage resource names per provider), Phase 2 (tfvars include bucket/container names)

---

## Objective

`zlDeploymentOrchestrator.triggerModelUpload()` always launches a Kubernetes Job with:
- `image: 'amazon/aws-cli:latest'`
- `command: ['aws', 's3', 'sync', 's3://${config.modelBucket}/models/', '/vault/models/']`

This hardcodes AWS S3 for all five providers. Non-AWS deployments either:
- Error out (`NoCredentialProviders` when AWS creds are absent)
- Silently no-op (the Job runs but syncs nothing)

This phase replaces the hardcoded block with a `_buildModelSyncContainer()` private method that selects the correct image, command, and environment variables per provider.

**Design decision — S3-compatible reuse**: DigitalOcean Spaces and Linode Object Storage are S3-compatible APIs. Both can use `amazon/aws-cli:latest` with a custom `--endpoint-url`, avoiding extra container images. Azure and GCP require their own CLI containers.

---

## Tasks

### 5.1 — Add `_buildModelSyncContainer()` to `zlDeploymentOrchestrator.js`
**File**: `backend/src/services/zlDeploymentOrchestrator.js`
**Location**: Add as a new private method after `triggerModelUpload()`

```javascript
/**
 * Build the Kubernetes container spec for syncing model files from object storage.
 * @param {string} cloudProvider - One of aws | azure | gcp | digitalocean | linode
 * @param {object} config - Deployment config (bucket, account, container, region, credentials)
 * @returns {{ image: string, command: string[], env: Array<{name:string, value:string}> }}
 */
_buildModelSyncContainer(cloudProvider, config) {
  switch (cloudProvider) {
    // ── AWS S3 ──────────────────────────────────────────────────────────
    case 'aws':
      return {
        image: 'amazon/aws-cli:latest',
        command: [
          'aws', 's3', 'sync',
          `s3://${config.modelBucket}/models/`,
          '/vault/models/',
          '--no-progress',
        ],
        env: [
          { name: 'AWS_ACCESS_KEY_ID',     value: config.accessKeyId     || '' },
          { name: 'AWS_SECRET_ACCESS_KEY', value: config.secretAccessKey || '' },
          { name: 'AWS_DEFAULT_REGION',    value: config.region          || 'us-east-1' },
        ],
      };

    // ── Azure Blob Storage ──────────────────────────────────────────────
    case 'azure':
      return {
        image: 'mcr.microsoft.com/azure-cli:latest',
        command: [
          'azcopy', 'sync',
          `https://${config.storageAccountName}.blob.core.windows.net/${config.storageContainerName}/models/`,
          '/vault/models/',
          '--recursive=true',
        ],
        env: [
          { name: 'AZCOPY_SPA_CLIENT_SECRET', value: config.clientSecret   || '' },
          { name: 'AZURE_CLIENT_ID',           value: config.clientId       || '' },
          { name: 'AZURE_TENANT_ID',           value: config.tenantId       || '' },
          { name: 'AZURE_SUBSCRIPTION_ID',     value: config.subscriptionId || '' },
        ],
      };

    // ── GCP Cloud Storage ───────────────────────────────────────────────
    case 'gcp':
      return {
        image: 'gcr.io/google.com/cloudsdktool/google-cloud-cli:slim',
        command: [
          'gsutil', '-m', 'rsync',
          '-d', '-r',
          `gs://${config.modelBucket}/models/`,
          '/vault/models/',
        ],
        env: [
          { name: 'GOOGLE_APPLICATION_CREDENTIALS', value: '/var/secrets/google/key.json' },
          // Key file must be mounted via a Kubernetes secret volume named 'gcp-sa-key'
        ],
      };

    // ── DigitalOcean Spaces (S3-compatible) ─────────────────────────────
    case 'digitalocean':
      return {
        image: 'amazon/aws-cli:latest',
        command: [
          'aws', 's3', 'sync',
          `s3://${config.spacesBucket}/models/`,
          '/vault/models/',
          '--no-progress',
          '--endpoint-url', `https://${config.region}.digitaloceanspaces.com`,
        ],
        env: [
          { name: 'AWS_ACCESS_KEY_ID',     value: config.spacesAccessKey || '' },
          { name: 'AWS_SECRET_ACCESS_KEY', value: config.spacesSecretKey || '' },
        ],
      };

    // ── Linode Object Storage (S3-compatible) ────────────────────────────
    case 'linode':
      return {
        image: 'amazon/aws-cli:latest',
        command: [
          'aws', 's3', 'sync',
          `s3://${config.objectStorageBucket}/models/`,
          '/vault/models/',
          '--no-progress',
          '--endpoint-url', `https://${config.region}.linodeobjects.com`,
        ],
        env: [
          { name: 'AWS_ACCESS_KEY_ID',     value: config.objectStorageKey    || '' },
          { name: 'AWS_SECRET_ACCESS_KEY', value: config.objectStorageSecret || '' },
        ],
      };

    default:
      logger.warn(`[ZLDeploymentOrchestrator] Unknown cloud provider '${cloudProvider}' for model sync; skipping.`, { cloudProvider });
      return null;
  }
}
```

---

### 5.2 — Update `triggerModelUpload()` to Use the Helper
**File**: `backend/src/services/zlDeploymentOrchestrator.js`
**Location**: `triggerModelUpload()` method — replace the hardcoded container spec

Current code (to replace):
```javascript
async triggerModelUpload(deployment, kubeConfig) {
  // ... existing setup code ...
  const containerSpec = {
    image: 'amazon/aws-cli:latest',
    command: ['aws', 's3', 'sync', `s3://${config.modelBucket}/models/`, '/vault/models/'],
    env: [
      { name: 'AWS_ACCESS_KEY_ID', value: config.accessKeyId },
      { name: 'AWS_SECRET_ACCESS_KEY', value: config.secretAccessKey },
    ],
  };
  // ...
}
```

Replace with:
```javascript
async triggerModelUpload(deployment, kubeConfig) {
  const cloudProvider = deployment.cloud_provider || 'aws';
  const config = deployment.config || {};

  // Build provider-aware sync container spec
  const containerSpec = this._buildModelSyncContainer(cloudProvider, config);
  if (!containerSpec) {
    logger.warn(`[ZLDeploymentOrchestrator] No model sync container available for provider '${cloudProvider}'; skipping model upload.`, { deploymentId: deployment.id });
    return;
  }

  logger.deployment(deployment.id, 'model-upload', `Syncing models via ${cloudProvider} storage`, { image: containerSpec.image });

  // Build the Kubernetes Job manifest using containerSpec
  const jobManifest = {
    apiVersion: 'batch/v1',
    kind: 'Job',
    metadata: {
      name: `model-upload-${deployment.id}`,
      namespace: config.namespace || 'default',
    },
    spec: {
      ttlSecondsAfterFinished: 300,
      template: {
        spec: {
          restartPolicy: 'OnFailure',
          containers: [
            {
              name: 'model-sync',
              image: containerSpec.image,
              command: containerSpec.command,
              env: containerSpec.env,
              volumeMounts: [
                { name: 'vault-models', mountPath: '/vault/models' },
                // GCP only: mount the service account key secret
                ...(cloudProvider === 'gcp' ? [{ name: 'gcp-sa-key', mountPath: '/var/secrets/google', readOnly: true }] : []),
              ],
            },
          ],
          volumes: [
            { name: 'vault-models', emptyDir: {} },
            ...(cloudProvider === 'gcp' ? [{ name: 'gcp-sa-key', secret: { secretName: 'gcp-sa-key' } }] : []),
          ],
        },
      },
    },
  };

  // Apply the Job to the cluster
  const k8sClient = await this._getKubernetesClient(kubeConfig);
  await k8sClient.createNamespacedJob(config.namespace || 'default', jobManifest);

  logger.deployment(deployment.id, 'model-upload', 'Model sync Job created successfully', { provider: cloudProvider });
}
```

---

### 5.3 — Expose Config Fields for Non-AWS Providers
**File**: `backend/src/services/multiCloudOrchestrator.js`
**Location**: `generateCloudSpecificVars()` — ensure the deployment config returned includes all fields `_buildModelSyncContainer` expects.

Confirm or add the following mappings per provider (these should already exist after Phase 2):

| Provider | Config field | Source |
|----------|-------------|--------|
| `azure` | `storageAccountName` | `credential.storage_account_name` |
| `azure` | `storageContainerName` | `credential.storage_container_name` or `config.storageContainerName` |
| `azure` | `clientId`, `clientSecret`, `tenantId`, `subscriptionId` | `credential.*` |
| `gcp` | `modelBucket` | `config.gcsBucket` |
| `digitalocean` | `spacesBucket`, `spacesAccessKey`, `spacesSecretKey`, `region` | `credential.*` |
| `linode` | `objectStorageBucket`, `objectStorageKey`, `objectStorageSecret`, `region` | `credential.*` |

If any of these fields are missing, add them to the credential-mapping logic in `generateTerraformVars()`.

---

### 5.4 — GCP Service Account Secret Pre-requisite
**File**: `backend/src/services/zlDeploymentOrchestrator.js`
**Location**: Before the `triggerModelUpload` call in the deployment pipeline

GCP requires a Kubernetes Secret containing the service account JSON key before the Job runs:

```javascript
/**
 * Ensure the GCP service account key secret exists in the cluster before model upload.
 * Called only when cloudProvider === 'gcp'.
 */
async _ensureGcpSaKeySecret(deployment, kubeConfig, gcpKeyJson) {
  const namespace = deployment.config?.namespace || 'default';
  const k8sClient = await this._getKubernetesClient(kubeConfig);

  const secretManifest = {
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: { name: 'gcp-sa-key', namespace },
    type: 'Opaque',
    data: {
      'key.json': Buffer.from(gcpKeyJson).toString('base64'),
    },
  };

  try {
    await k8sClient.createNamespacedSecret(namespace, secretManifest);
  } catch (err) {
    if (err.response?.statusCode === 409) {
      // Already exists — replace
      await k8sClient.replaceNamespacedSecret('gcp-sa-key', namespace, secretManifest);
    } else {
      throw err;
    }
  }
}
```

---

### 5.5 — Smoke Tests
**File**: `backend/src/services/__tests__/e2eDeploymentSmoke.test.js`

```javascript
describe('triggerModelUpload: _buildModelSyncContainer per provider', () => {
  let orchestrator;

  beforeEach(() => {
    orchestrator = new ZLDeploymentOrchestrator();
  });

  const cases = [
    {
      provider: 'aws',
      config: { modelBucket: 'my-bucket', accessKeyId: 'AK', secretAccessKey: 'SK', region: 'us-east-1' },
      expectedImage: 'amazon/aws-cli:latest',
      expectedCommandIncludes: ['s3', 'sync', 's3://my-bucket/models/'],
    },
    {
      provider: 'azure',
      config: { storageAccountName: 'myaccount', storageContainerName: 'models', clientId: 'cid', clientSecret: 'cs', tenantId: 'tid', subscriptionId: 'sub' },
      expectedImage: 'mcr.microsoft.com/azure-cli:latest',
      expectedCommandIncludes: ['azcopy', 'sync', 'https://myaccount.blob.core.windows.net/models/models/'],
    },
    {
      provider: 'gcp',
      config: { modelBucket: 'gcp-bucket' },
      expectedImage: 'gcr.io/google.com/cloudsdktool/google-cloud-cli:slim',
      expectedCommandIncludes: ['gsutil', '-m', 'rsync', 'gs://gcp-bucket/models/'],
    },
    {
      provider: 'digitalocean',
      config: { spacesBucket: 'do-bucket', spacesAccessKey: 'dak', spacesSecretKey: 'dsk', region: 'nyc1' },
      expectedImage: 'amazon/aws-cli:latest',
      expectedCommandIncludes: ['--endpoint-url', 'https://nyc1.digitaloceanspaces.com'],
    },
    {
      provider: 'linode',
      config: { objectStorageBucket: 'li-bucket', objectStorageKey: 'lak', objectStorageSecret: 'lsk', region: 'us-east' },
      expectedImage: 'amazon/aws-cli:latest',
      expectedCommandIncludes: ['--endpoint-url', 'https://us-east.linodeobjects.com'],
    },
  ];

  test.each(cases)('$provider: correct image and command', ({ provider, config, expectedImage, expectedCommandIncludes }) => {
    const spec = orchestrator._buildModelSyncContainer(provider, config);
    expect(spec).not.toBeNull();
    expect(spec.image).toBe(expectedImage);
    expectedCommandIncludes.forEach(part => {
      expect(spec.command.join(' ')).toContain(part);
    });
  });

  it('unknown provider returns null without throwing', () => {
    const spec = orchestrator._buildModelSyncContainer('unknown', {});
    expect(spec).toBeNull();
  });
});
```

---

## Files Modified

| File | Change |
|------|--------|
| `backend/src/services/zlDeploymentOrchestrator.js` | Add `_buildModelSyncContainer(cloudProvider, config)` private method; refactor `triggerModelUpload()` to call it; add `_ensureGcpSaKeySecret()` helper |
| `backend/src/services/multiCloudOrchestrator.js` | Verify credential fields `storageAccountName`, `spacesBucket`, `objectStorageBucket`, etc. are included in the deployment config map |
| `backend/src/services/__tests__/e2eDeploymentSmoke.test.js` | Add Suite 17: `_buildModelSyncContainer` unit tests (5 provider cases + null case = 6 assertions) |

---

## Verification Checklist

- [ ] `_buildModelSyncContainer('aws', ...)` returns `amazon/aws-cli:latest` with S3 sync command
- [ ] `_buildModelSyncContainer('azure', ...)` returns `mcr.microsoft.com/azure-cli:latest` with `azcopy sync` to correct blob URL
- [ ] `_buildModelSyncContainer('gcp', ...)` returns `google-cloud-cli:slim` with `gsutil rsync` from GCS bucket
- [ ] `_buildModelSyncContainer('digitalocean', ...)` returns `amazon/aws-cli:latest` with DigitalOcean Spaces endpoint URL
- [ ] `_buildModelSyncContainer('linode', ...)` returns `amazon/aws-cli:latest` with Linode Object Storage endpoint URL
- [ ] Unknown provider returns `null` without throwing (graceful skip)
- [ ] GCP path: `_ensureGcpSaKeySecret` creates the K8s Secret before the Job is submitted
- [ ] All smoke tests pass (159+)
