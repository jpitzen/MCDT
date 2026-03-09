# Phase 6 — Pre-Destroy Cleanup for All Cloud Providers
## GAP-006 · Medium · Prevent stuck `terraform destroy` from orphaned resources

**Priority**: P3 (destroy works in happy path but fails when objects exist inside managed resources)
**Effort**: 2 days
**Prerequisites**: Phase 1 (know which storage and registry resources each provider creates)

---

## Objective

`terraformExecutor.destroyTerraform()` runs `terraform destroy -auto-approve` with no pre-flight cleanup. Terraform cannot destroy resources that still hold objects inside them:

| Provider | Blocker resource | Reason Terraform can't delete it |
|----------|-----------------|----------------------------------|
| AWS | S3 Bucket | Must be empty before deletion |
| AWS | ECR Repository | Must be empty before deletion |
| AWS | EFS Filesystem | Mount targets must be deleted first |
| Azure | Resource Group | Resource locks must be removed first |
| GCP | GKE Persistent Disks | Must be detached before node pool deletion |
| DigitalOcean | Spaces Bucket | Must be empty before destruction |
| Linode | Object Storage Bucket | Must be empty before destruction |

This phase adds a `_preDestroyCleanup()` private method to `terraformExecutor.js` that runs provider-specific cleanup using the cloud provider CLI before invoking `terraform destroy`.

---

## Tasks

### 6.1 — Add `_preDestroyCleanup()` to `terraformExecutor.js`
**File**: `backend/src/services/terraformExecutor.js`
**Location**: Add as a private method; call it at the start of `destroyTerraform()`

```javascript
/**
 * Run provider-specific pre-destroy cleanup to remove objects that block `terraform destroy`.
 * @param {string} deploymentId
 * @param {string} cloudProvider   - aws | azure | gcp | digitalocean | linode
 * @param {object} deploymentConfig - the deployment's config/credential data
 * @param {string} deploymentDir    - path to the active Terraform workspace
 * @param {Function} emitLog        - function(message) to stream log lines to the WebSocket
 */
async _preDestroyCleanup(deploymentId, cloudProvider, deploymentConfig, deploymentDir, emitLog) {
  emitLog(`[pre-destroy] Starting pre-destroy cleanup for provider: ${cloudProvider}`);

  try {
    switch (cloudProvider) {
      case 'aws':
        await this._preDestroyAws(deploymentId, deploymentConfig, emitLog);
        break;
      case 'azure':
        await this._preDestroyAzure(deploymentId, deploymentConfig, emitLog);
        break;
      case 'gcp':
        await this._preDestroyGcp(deploymentId, deploymentConfig, emitLog);
        break;
      case 'digitalocean':
        await this._preDestroyDo(deploymentId, deploymentConfig, emitLog);
        break;
      case 'linode':
        await this._preDestroyLinode(deploymentId, deploymentConfig, emitLog);
        break;
      default:
        emitLog(`[pre-destroy] Unknown provider '${cloudProvider}' — skipping cleanup.`);
    }
  } catch (err) {
    // Non-fatal: log and continue to terraform destroy
    logger.warn(`[TerraformExecutor] Pre-destroy cleanup failed (non-fatal): ${err.message}`, { deploymentId, cloudProvider });
    emitLog(`[pre-destroy] WARNING: cleanup step failed: ${err.message}. Proceeding with destroy anyway.`);
  }
}
```

---

### 6.2 — AWS Pre-Destroy: Empty S3, ECR, EFS
```javascript
async _preDestroyAws(deploymentId, config, emitLog) {
  const region  = config.region || 'us-east-1';
  const envVars = `AWS_ACCESS_KEY_ID="${config.accessKeyId}" AWS_SECRET_ACCESS_KEY="${config.secretAccessKey}" AWS_DEFAULT_REGION="${region}"`;

  // 1. Empty S3 buckets
  const buckets = [config.modelBucket, config.backupBucket, config.tfStateBucket].filter(Boolean);
  for (const bucket of buckets) {
    emitLog(`[pre-destroy][aws] Emptying S3 bucket: ${bucket}`);
    try {
      await execAsync(`${envVars} aws s3 rm s3://${bucket} --recursive --quiet`);
    } catch (e) {
      emitLog(`[pre-destroy][aws] Could not empty ${bucket} (may already be empty): ${e.message}`);
    }
  }

  // 2. Delete all ECR images
  const ecrRepos = [config.ecrRepository, config.modelEcrRepo].filter(Boolean);
  for (const repo of ecrRepos) {
    emitLog(`[pre-destroy][aws] Clearing ECR repo: ${repo}`);
    try {
      const listResult = await execAsync(
        `${envVars} aws ecr list-images --repository-name ${repo} --region ${region} --query "imageIds[*]" --output json`
      );
      const imageIds = JSON.parse(listResult.stdout || '[]');
      if (imageIds.length > 0) {
        const idsJson = JSON.stringify(imageIds);
        await execAsync(
          `${envVars} aws ecr batch-delete-image --repository-name ${repo} --region ${region} --image-ids '${idsJson}'`
        );
      }
    } catch (e) {
      emitLog(`[pre-destroy][aws] Could not clear ECR repo ${repo}: ${e.message}`);
    }
  }

  // 3. Delete EFS mount targets (must be gone before the filesystem can be deleted)
  if (config.efsId) {
    emitLog(`[pre-destroy][aws] Removing EFS mount targets for: ${config.efsId}`);
    try {
      const mtResult = await execAsync(
        `${envVars} aws efs describe-mount-targets --file-system-id ${config.efsId} --region ${region} --query "MountTargets[*].MountTargetId" --output json`
      );
      const mtIds = JSON.parse(mtResult.stdout || '[]');
      for (const mtId of mtIds) {
        await execAsync(`${envVars} aws efs delete-mount-target --mount-target-id ${mtId} --region ${region}`);
        emitLog(`[pre-destroy][aws] Deleted EFS mount target ${mtId}`);
      }
      // Brief wait for deletion propagation
      if (mtIds.length > 0) await new Promise(r => setTimeout(r, 10_000));
    } catch (e) {
      emitLog(`[pre-destroy][aws] Could not remove EFS mount targets: ${e.message}`);
    }
  }

  emitLog('[pre-destroy][aws] AWS pre-destroy cleanup complete.');
}
```

---

### 6.3 — Azure Pre-Destroy: Remove Resource Locks
```javascript
async _preDestroyAzure(deploymentId, config, emitLog) {
  const rg = config.resourceGroup;
  if (!rg) {
    emitLog('[pre-destroy][azure] No resource group in config — skipping lock removal.');
    return;
  }

  emitLog(`[pre-destroy][azure] Checking for resource locks on resource group: ${rg}`);
  try {
    // Login to Azure CLI using service principal
    await execAsync(
      `az login --service-principal -u "${config.clientId}" -p "${config.clientSecret}" --tenant "${config.tenantId}" --output none`
    );

    // List all locks on the resource group
    const lockResult = await execAsync(
      `az lock list --resource-group ${rg} --subscription ${config.subscriptionId} --query "[*].name" --output json`
    );
    const locks = JSON.parse(lockResult.stdout || '[]');

    for (const lock of locks) {
      emitLog(`[pre-destroy][azure] Removing lock: ${lock}`);
      await execAsync(
        `az lock delete --name "${lock}" --resource-group ${rg} --subscription ${config.subscriptionId}`
      );
    }

    // Empty storage containers if present
    if (config.storageAccountName && config.storageContainerName) {
      emitLog(`[pre-destroy][azure] Emptying blob container: ${config.storageContainerName}`);
      await execAsync(
        `az storage blob delete-batch --account-name ${config.storageAccountName} --source ${config.storageContainerName} --output none`
      );
    }
  } catch (e) {
    emitLog(`[pre-destroy][azure] Azure pre-destroy step failed: ${e.message}`);
  }

  emitLog('[pre-destroy][azure] Azure pre-destroy cleanup complete.');
}
```

---

### 6.4 — GCP Pre-Destroy: Detach Persistent Disks
```javascript
async _preDestroyGcp(deploymentId, config, emitLog) {
  const project = config.projectId;
  const zone    = config.zone || `${config.region}-a`;

  if (!project) {
    emitLog('[pre-destroy][gcp] No projectId in config — skipping disk detach.');
    return;
  }

  emitLog(`[pre-destroy][gcp] Listing persistent disks in project ${project}, zone ${zone}`);
  try {
    // Set active account via key file if provided
    if (config.gcpKeyFile) {
      await execAsync(`gcloud auth activate-service-account --key-file="${config.gcpKeyFile}" --project=${project}`);
    }

    // List disks created by this cluster
    const diskResult = await execAsync(
      `gcloud compute disks list --project=${project} --filter="zone:(${zone}) AND labels.gke-cluster=${config.clusterName}" --format="json(name,users)"`
    );
    const disks = JSON.parse(diskResult.stdout || '[]');

    for (const disk of disks) {
      const users = disk.users || [];
      for (const instance of users) {
        const instanceName = instance.split('/').pop();
        emitLog(`[pre-destroy][gcp] Detaching disk ${disk.name} from instance ${instanceName}`);
        await execAsync(
          `gcloud compute instances detach-disk ${instanceName} --disk=${disk.name} --zone=${zone} --project=${project} --quiet`
        );
      }
    }
  } catch (e) {
    emitLog(`[pre-destroy][gcp] GCP pre-destroy step failed (non-fatal): ${e.message}`);
  }

  emitLog('[pre-destroy][gcp] GCP pre-destroy cleanup complete.');
}
```

---

### 6.5 — DigitalOcean Pre-Destroy: Empty Spaces Bucket
```javascript
async _preDestroyDo(deploymentId, config, emitLog) {
  const bucket = config.spacesBucket;
  const region = config.region || 'nyc3';

  if (!bucket) {
    emitLog('[pre-destroy][digitalocean] No Spaces bucket in config — skipping.');
    return;
  }

  emitLog(`[pre-destroy][digitalocean] Emptying Spaces bucket: ${bucket}`);
  try {
    const envVars = `AWS_ACCESS_KEY_ID="${config.spacesAccessKey}" AWS_SECRET_ACCESS_KEY="${config.spacesSecretKey}"`;
    await execAsync(
      `${envVars} aws s3 rm s3://${bucket} --recursive --quiet --endpoint-url https://${region}.digitaloceanspaces.com`
    );
  } catch (e) {
    emitLog(`[pre-destroy][digitalocean] Could not empty Spaces bucket: ${e.message}`);
  }

  emitLog('[pre-destroy][digitalocean] DigitalOcean pre-destroy cleanup complete.');
}
```

---

### 6.6 — Linode Pre-Destroy: Empty Object Storage Bucket
```javascript
async _preDestroyLinode(deploymentId, config, emitLog) {
  const bucket = config.objectStorageBucket;
  const region = config.region || 'us-east-1';

  if (!bucket) {
    emitLog('[pre-destroy][linode] No Object Storage bucket in config — skipping.');
    return;
  }

  emitLog(`[pre-destroy][linode] Emptying Object Storage bucket: ${bucket}`);
  try {
    const envVars = `AWS_ACCESS_KEY_ID="${config.objectStorageKey}" AWS_SECRET_ACCESS_KEY="${config.objectStorageSecret}"`;
    await execAsync(
      `${envVars} aws s3 rm s3://${bucket} --recursive --quiet --endpoint-url https://${region}.linodeobjects.com`
    );
  } catch (e) {
    emitLog(`[pre-destroy][linode] Could not empty Object Storage bucket: ${e.message}`);
  }

  emitLog('[pre-destroy][linode] Linode pre-destroy cleanup complete.');
}
```

---

### 6.7 — Wire Into `destroyTerraform()`
**File**: `backend/src/services/terraformExecutor.js`
**Location**: `destroyTerraform()` — add cleanup call before `terraform destroy`

```javascript
async destroyTerraform(deploymentId, deploymentDir, cloudProvider, deploymentConfig) {
  logger.deployment(deploymentId, 'destroy', 'Starting Terraform destroy', { deploymentDir, cloudProvider });

  // Helper to stream logs to WebSocket
  const emitLog = (msg) => {
    websocketServer.emitDeploymentUpdate(deploymentId, 'log', { level: 'info', message: msg });
    logger.deployment(deploymentId, 'destroy', msg);
  };

  // ── Pre-destroy cleanup (non-fatal) ────────────────────────────────
  await this._preDestroyCleanup(deploymentId, cloudProvider, deploymentConfig, deploymentDir, emitLog);

  // ── terraform destroy ──────────────────────────────────────────────
  emitLog('[destroy] Running terraform destroy -auto-approve ...');
  const result = await this.runTerraform(
    deploymentId,
    ['destroy', '-auto-approve', '-no-color'],
    deploymentDir
  );

  if (result.exitCode !== 0) {
    const errorMsg = `Terraform destroy failed: ${result.stderr}`;
    logger.error(`[TerraformExecutor] ${errorMsg}`, { deploymentId });
    websocketServer.emitFailure(deploymentId, errorMsg, { phase: 'terraform-destroy' });
    throw new Error(errorMsg);
  }

  emitLog('[destroy] Terraform destroy completed successfully.');
  return result;
}
```

> **Note**: If `destroyTerraform` currently does not receive `cloudProvider` and `deploymentConfig`, update the callers in `multiCloudOrchestrator.js` to pass them. Typical call site:
> ```javascript
> await terraformExecutor.destroyTerraform(
>   deploymentId,
>   deploymentDir,
>   deployment.cloud_provider,   // add
>   deployment.config            // add
> );
> ```

---

### 6.8 — Smoke Tests
**File**: `backend/src/services/__tests__/e2eDeploymentSmoke.test.js`

```javascript
describe('destroyTerraform: Pre-destroy cleanup routing', () => {
  let executor;
  let cleanupSpy;

  beforeEach(() => {
    executor = new TerraformExecutor();
    cleanupSpy = jest.spyOn(executor, '_preDestroyCleanup').mockResolvedValue();
    jest.spyOn(executor, 'runTerraform').mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });
  });

  const providers = ['aws', 'azure', 'gcp', 'digitalocean', 'linode'];
  test.each(providers)('destroyTerraform calls _preDestroyCleanup for %s', async (provider) => {
    await executor.destroyTerraform('dep-1', '/tmp/dir', provider, {});
    expect(cleanupSpy).toHaveBeenCalledWith('dep-1', provider, {}, '/tmp/dir', expect.any(Function));
  });

  it('_preDestroyCleanup failure is non-fatal — destroy still proceeds', async () => {
    cleanupSpy.mockRejectedValue(new Error('cleanup boom'));
    jest.spyOn(executor, 'runTerraform').mockResolvedValue({ exitCode: 0, stdout: 'destroyed', stderr: '' });
    await expect(executor.destroyTerraform('dep-2', '/tmp/dir', 'aws', {})).resolves.not.toThrow();
  });
});
```

---

## Files Modified

| File | Change |
|------|--------|
| `backend/src/services/terraformExecutor.js` | Add `_preDestroyCleanup()` dispatcher and 5 provider-specific helpers (`_preDestroyAws`, `_preDestroyAzure`, `_preDestroyGcp`, `_preDestroyDo`, `_preDestroyLinode`); wire into `destroyTerraform()` |
| `backend/src/services/multiCloudOrchestrator.js` | Pass `deployment.cloud_provider` and `deployment.config` to `destroyTerraform()` call |
| `backend/src/services/__tests__/e2eDeploymentSmoke.test.js` | Add Suite 18: pre-destroy cleanup routing + non-fatal failure test |

---

## Verification Checklist

- [ ] `_preDestroyCleanup` dispatches to the correct provider method for all 5 providers
- [ ] A cleanup failure does not abort the destroy — Terraform destroy still runs
- [ ] AWS: S3 buckets are emptied; ECR images are removed; EFS mount targets are deleted
- [ ] Azure: resource locks are listed and removed before destroy
- [ ] GCP: persistent disks attached to cluster instances are detached
- [ ] DigitalOcean: Spaces bucket is emptied using S3-compatible CLI with endpoint override
- [ ] Linode: Object Storage bucket is emptied using S3-compatible CLI with endpoint override
- [ ] `destroyTerraform` callers in `multiCloudOrchestrator.js` pass `cloudProvider` and `deploymentConfig`
- [ ] All smoke tests pass (159+)
