# Phase 6 — Hardening & Post-Deployment Automation
## Security Scanning, EC2 EFS, Phase 0 Completeness, Post-Deploy Tasks

**Priority**: P3 (hardening — no new features, closes remaining coverage gaps)
**Effort**: 6 days
**Sprint**: Week 11–12
**Prerequisites**: Phases 1–3 complete (manifest engine + deploy pipeline operational)

---

## Objective

Close the remaining DG coverage gaps in Phases 0, 11, 12, and 13 — primarily post-deployment automation, security scanning, and EC2/EFS mounting. These tasks harden the platform but don't block core deployment functionality.

---

## Tasks

### 6.1 — Post-Deployment Automation (DG Phase 11)
**Effort**: 3 days
**Current coverage**: 20% (basic health verification from Phase 3) → **70%** after

DG Phase 11 covers 5 post-deployment tasks. These are ZL-application-specific operations that run after all pods are healthy.

#### 6.1.1 — Vault Directory Initialization (0.5 days)

After pods are running, create the vault directory structure on the shared EFS volume.

```javascript
async initVaultDirectories(kubeconfig, namespace) {
  // Exec into any app pod that mounts zlvault-efs
  const vaultPod = 'zlserver-0'; // or any pod with /var/opt/zlvault mount
  
  const commands = [
    'mkdir -p /var/opt/zlvault/keys',
    'mkdir -p /var/opt/zlvault/certs',
    'mkdir -p /var/opt/zlvault/config',
    'chmod -R 700 /var/opt/zlvault',
  ];
  
  for (const cmd of commands) {
    await exec(`kubectl exec ${vaultPod} -n ${namespace} --kubeconfig=${kubeconfig} -- sh -c "${cmd}"`);
  }
}
```

**Acceptance criteria**:
- [ ] Vault directories created on EFS via `kubectl exec`
- [ ] Correct permissions (700)
- [ ] Runs after zlserver deployment is Ready

#### 6.1.2 — Database Path Update (0.5 days)

Execute SQL scripts to update database paths to match the Kubernetes mount paths.

```javascript
async updateDatabasePaths(kubeconfig, namespace, dbConfig) {
  // Use kubectl port-forward to access RDS, then run SQL
  // Or exec into a pod with DB connectivity
  const sqlCommands = [
    `UPDATE ZL_CONFIG SET config_value = '/var/opt/zlvault' WHERE config_key = 'VAULT_PATH'`,
    `UPDATE ZL_CONFIG SET config_value = '/opt/ZipLip/logs' WHERE config_key = 'LOG_PATH'`,
  ];
  // Execute via databaseScriptExecutor or kubectl exec
}
```

**Acceptance criteria**:
- [ ] DB paths updated to match K8s volume mount paths
- [ ] Runs after database is accessible from within the cluster

#### 6.1.3 — Model Upload Mechanism (1 day)

Upload NIST and ZL models to the EFS-backed vault.

**Options**:
1. **S3 → EFS sync**: Upload models to S3, then use a Kubernetes Job to `aws s3 sync` to EFS
2. **Direct upload**: `kubectl cp` from local filesystem
3. **Init container**: Add init container to zlserver that downloads models on startup

**Recommended**: Option 1 (S3 → EFS sync via Job) — most reliable, supports large files.

```javascript
generateModelUploadJob(config) {
  return {
    apiVersion: 'batch/v1',
    kind: 'Job',
    metadata: { name: 'model-upload', namespace: config.namespace },
    spec: {
      template: {
        spec: {
          containers: [{
            name: 'model-sync',
            image: 'amazon/aws-cli:latest',
            command: ['sh', '-c', `aws s3 sync s3://${config.modelBucket}/models/ /var/opt/zlvault/models/`],
            volumeMounts: [{ name: 'zlvault', mountPath: '/var/opt/zlvault' }],
          }],
          volumes: [{ name: 'zlvault', persistentVolumeClaim: { claimName: 'zlvault-efs' } }],
          restartPolicy: 'Never',
          serviceAccountName: config.serviceAccount.name,
        }
      },
      backoffLimit: 3,
    }
  };
}
```

**Acceptance criteria**:
- [ ] Models uploaded to EFS vault via S3 sync Job
- [ ] Job uses IRSA for S3 access (no embedded credentials)
- [ ] Configurable model bucket name

#### 6.1.4 — Rolling Restart Orchestration (0.5 days)

After config changes (model upload, vault init, DB path updates), perform ordered rolling restarts.

```javascript
async rollingRestart(kubeconfig, namespace) {
  const order = ['zltika', 'zlserver', 'zlsearch', 'zlui'];
  for (const name of order) {
    await exec(`kubectl rollout restart deployment/${name} -n ${namespace} --kubeconfig=${kubeconfig}`);
    await this.waitForDeploymentReady(name, namespace, kubeconfig);
  }
}
```

#### 6.1.5 — Application Health Verification Endpoint (0.5 days)

Create a backend API endpoint that checks ZL application health from outside the cluster.

**File**: `backend/src/routes/deployments.js` (add to existing route file)

```javascript
router.get('/:id/health',
  authorize(['admin', 'operator', 'viewer']),
  asyncHandler(async (req, res) => {
    const deployment = await Deployment.findByPk(req.params.id);
    
    // Check each component
    const health = await zlDeploymentOrchestrator.checkHealth(deployment);
    // Returns: { zookeeper: 'healthy', zltika: 'healthy', zlserver: 'healthy', zlsearch: 'healthy', zlui: 'healthy', database: 'connected' }
    
    sendSuccess(res, health, 200, 'Health check complete');
  })
);
```

---

### 6.2 — Security Scanning (DG Phase 13)
**Effort**: 1.5 days
**Current coverage**: 5% → **50%** after

#### 6.2.1 — Enable AWS Inspector for ECR (0.5 days)
**File**: `terraform/modules/kubernetes_cluster/aws.tf`

```hcl
resource "aws_inspector2_enabler" "ecr" {
  count = var.cloud_provider == "aws" && var.enable_security_scanning ? 1 : 0
  
  account_ids    = [data.aws_caller_identity.current.account_id]
  resource_types = ["ECR"]
}
```

#### 6.2.2 — Integrate Grype CLI for Pre-Push Scanning (0.5 days)
**File**: `backend/src/services/containerDeploymentService.js`

Add pre-push scan step to the image build pipeline:

```javascript
async scanImage(imageTag) {
  const result = await this.executeCommand(`grype ${imageTag} --output json --fail-on high`);
  const findings = JSON.parse(result.stdout);
  return {
    vulnerabilities: findings.matches.length,
    critical: findings.matches.filter(m => m.vulnerability.severity === 'Critical').length,
    high: findings.matches.filter(m => m.vulnerability.severity === 'High').length,
    passed: findings.matches.filter(m => ['Critical', 'High'].includes(m.vulnerability.severity)).length === 0,
  };
}
```

#### 6.2.3 — Scan Results API + Frontend (0.5 days)

**Backend**: New model `ScanResult` and API endpoint `GET /api/deployments/:id/scans`
**Frontend**: Scan results panel in Phase6Operations (table of vulnerabilities, severity badges)

**Acceptance criteria**:
- [ ] AWS Inspector enabled for ECR via Terraform
- [ ] Grype scan runs before image push
- [ ] Scan results stored and viewable in UI
- [ ] High/Critical findings block push (configurable)

---

### 6.3 — EC2 EFS Mounting (DG Phase 12)
**Effort**: 0.5 days
**Current coverage**: 55% → **65%** after

**Gap**: EC2 instance created by Terraform but EFS not mounted.

**File**: `terraform/modules/kubernetes_cluster/aws.tf` (EC2 user_data)

```hcl
resource "aws_instance" "bastion" {
  # ... existing config ...
  
  user_data = templatefile("${path.module}/templates/bastion-userdata.sh", {
    efs_id     = aws_efs_file_system.main[0].id
    efs_mount  = "/mnt/efs"
    region     = var.region
  })
}
```

**Template** `bastion-userdata.sh`:
```bash
#!/bin/bash
yum install -y amazon-efs-utils
mkdir -p /mnt/efs
echo "${efs_id}:/ /mnt/efs efs _netdev,tls,iam 0 0" >> /etc/fstab
mount -a
```

**Acceptance criteria**:
- [ ] EFS mounted on bastion EC2 at `/mnt/efs`
- [ ] Uses TLS + IAM auth
- [ ] Persistent via `/etc/fstab`

---

### 6.4 — Phase 0 Completeness
**Effort**: 1 day
**Current coverage**: 60% → **70%** after

#### 6.4.1 — Optional IAM User Creation (0.5 days)
**File**: `terraform/modules/kubernetes_cluster/aws.tf`

```hcl
resource "aws_iam_user" "deployment_user" {
  count = var.cloud_provider == "aws" && var.create_iam_user ? 1 : 0
  name  = "${var.cluster_name}-deploy-user"
}

resource "aws_iam_user_policy_attachment" "deployment_user" {
  count      = var.cloud_provider == "aws" && var.create_iam_user ? 1 : 0
  user       = aws_iam_user.deployment_user[0].name
  policy_arn = aws_iam_policy.deployment_policy[0].arn
}
```

#### 6.4.2 — kubectl Context Configuration (0.5 days)

Add automatic `kubeconfig` generation after cluster creation:

```hcl
resource "null_resource" "update_kubeconfig" {
  count = var.cloud_provider == "aws" ? 1 : 0
  
  provisioner "local-exec" {
    command = "aws eks update-kubeconfig --name ${aws_eks_cluster.main[0].name} --region ${var.region}"
  }
  
  depends_on = [aws_eks_cluster.main]
}
```

---

## Files Created

| File | Purpose |
|------|---------|
| `terraform/modules/kubernetes_cluster/templates/bastion-userdata.sh` | EC2 bootstrap script |
| `backend/src/models/ScanResult.js` | Vulnerability scan result model (optional) |

## Files Modified

| File | Change |
|------|--------|
| `terraform/modules/kubernetes_cluster/aws.tf` | Inspector, IAM user, EC2 user_data, kubeconfig |
| `terraform/modules/kubernetes_cluster/variables.tf` | Feature flags for scanning, IAM user |
| `backend/src/services/containerDeploymentService.js` | Grype scan integration |
| `backend/src/services/zlDeploymentOrchestrator.js` | Post-deployment tasks (vault init, DB paths, model upload, rolling restart) |
| `backend/src/routes/deployments.js` | Health check endpoint |
| `frontend/src/pages/UnifiedDeploymentWizard/phases/Phase6Operations/index.jsx` | Scan results panel |

---

## DG Coverage Impact

| Phase | Before | After |
|-------|:------:|:-----:|
| Phase 0 (AWS Config) | 60% | **70%** |
| Phase 11 (Post-Deploy) | 20% | **70%** |
| Phase 12 (EC2) | 55% | **65%** |
| Phase 13 (Security) | 5% | **50%** |
| **Weighted Average** | ~80% | **~87%** |
