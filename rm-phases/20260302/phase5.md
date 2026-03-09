# Phase 5 — Infrastructure Gaps
## S3 CSI, ALB Controller, Cluster Autoscaler, Database Schema

**Priority**: P1 (infrastructure completeness — can run in parallel with Phases 2–4)
**Effort**: 7 days
**Sprint**: Week 9–10
**Prerequisites**: None (these are Terraform/infrastructure changes independent of ZL manifest work)

---

## Objective

Close the remaining infrastructure automation gaps identified in the DG coverage heatmap. These are all Terraform module additions or extensions — they don't depend on the manifest generator work in Phases 1–4.

---

## Tasks

### 5.1 — S3 CSI Driver (DG Phase 5)
**Effort**: 1 day
**Current coverage**: 50% → **90%** after

**Gap**: S3 bucket and IAM role exist in Terraform, but the Mountpoint for Amazon S3 CSI driver addon is not installed.

**Files to modify**:
- `terraform/modules/kubernetes_cluster/main.tf` — Add `aws_eks_addon` for `aws-mountpoint-s3-csi-driver`
- `terraform/modules/kubernetes_cluster/aws.tf` — Add S3 CSI IRSA role (pattern: copy EBS CSI role block)
- `terraform/modules/kubernetes_cluster/variables.tf` — Add `enable_s3_csi` variable (default: `true`)

**Implementation pattern** (copy from existing EBS CSI addon):
```hcl
resource "aws_eks_addon" "s3_csi" {
  count = var.cloud_provider == "aws" && var.enable_s3_csi ? 1 : 0
  
  cluster_name                = aws_eks_cluster.main[0].name
  addon_name                  = "aws-mountpoint-s3-csi-driver"
  resolve_conflicts_on_create = "OVERWRITE"
  service_account_role_arn    = aws_iam_role.s3_csi_driver[0].arn
  
  depends_on = [aws_eks_node_group.main]
}
```

**Acceptance criteria**:
- [ ] S3 CSI addon installed via Terraform
- [ ] IRSA role with `s3:GetObject`, `s3:PutObject`, `s3:ListBucket` permissions
- [ ] Gated behind `enable_s3_csi` variable
- [ ] StorageClass for S3 added to `zlManifestTemplates` (optional, Phase 2 add-on)

---

### 5.2 — ALB Controller & Ingress (DG Phase 9)
**Effort**: 3 days
**Current coverage**: 15% → **80%** after

**Gap**: No AWS Load Balancer Controller installed. No Ingress resources generated.

**Sub-tasks**:

#### 5.2.1 — ALB Controller IAM Policy + IRSA Role (1 day)
**File**: `terraform/modules/kubernetes_cluster/aws.tf`

- Add IAM policy for AWS LB Controller (use official policy JSON from AWS docs)
- Add IRSA role for `aws-load-balancer-controller` service account
- Tag subnets for ALB auto-discovery: `kubernetes.io/cluster/${cluster_name}` = `shared`, `kubernetes.io/role/elb` = `1`

#### 5.2.2 — ALB Controller Helm Release (1 day)
**Option A**: Add Helm release via Terraform `helm_release` resource
**Option B**: Add as a `kubectl apply` step in the ZL deployment orchestrator

Recommend **Option A** (Terraform-managed lifecycle):
```hcl
resource "helm_release" "aws_lb_controller" {
  count = var.cloud_provider == "aws" && var.enable_alb_controller ? 1 : 0
  
  name       = "aws-load-balancer-controller"
  repository = "https://aws.github.io/eks-charts"
  chart      = "aws-load-balancer-controller"
  namespace  = "kube-system"
  
  set {
    name  = "clusterName"
    value = aws_eks_cluster.main[0].name
  }
  set {
    name  = "serviceAccount.create"
    value = "true"
  }
  set {
    name  = "serviceAccount.annotations.eks\\.amazonaws\\.com/role-arn"
    value = aws_iam_role.alb_controller[0].arn
  }
}
```

#### 5.2.3 — Ingress Generation (1 day)
**File**: `backend/src/services/kubernetesManifestGenerator.js`

Extend existing `generateIngress()` method to support AWS ALB annotations:
```javascript
generateIngress({
  // ... existing params ...
  annotations: {
    'kubernetes.io/ingress.class': 'alb',
    'alb.ingress.kubernetes.io/scheme': 'internet-facing',  // or 'internal'
    'alb.ingress.kubernetes.io/target-type': 'ip',
    'alb.ingress.kubernetes.io/certificate-arn': config.ssl.certArn,
    'alb.ingress.kubernetes.io/listen-ports': '[{"HTTPS":443}]',
    'alb.ingress.kubernetes.io/ssl-redirect': '443',
  }
})
```

**Note**: This is an **alternative** to the LoadBalancer service approach used in the current manual process. Both can coexist — LB Service for simple setups, Ingress for advanced path routing.

**Acceptance criteria**:
- [ ] ALB Controller installed via Terraform Helm release
- [ ] IRSA role with correct IAM policy
- [ ] Subnet tags for ALB auto-discovery
- [ ] Ingress generator supports AWS ALB annotations
- [ ] Works alongside existing LoadBalancer service approach

---

### 5.3 — Cluster Autoscaler Deployment (DG Phase 10)
**Effort**: 1 day
**Current coverage**: 65% → **95%** after

**Gap**: IAM role and ASG tags exist in Terraform, but the Cluster Autoscaler pod is never deployed.

**Implementation**: Add Helm release:
```hcl
resource "helm_release" "cluster_autoscaler" {
  count = var.cloud_provider == "aws" && var.enable_cluster_autoscaler ? 1 : 0
  
  name       = "cluster-autoscaler"
  repository = "https://kubernetes.github.io/autoscaler"
  chart      = "cluster-autoscaler"
  namespace  = "kube-system"
  
  set {
    name  = "autoDiscovery.clusterName"
    value = aws_eks_cluster.main[0].name
  }
  set {
    name  = "awsRegion"
    value = var.region
  }
  set {
    name  = "rbac.serviceAccount.annotations.eks\\.amazonaws\\.com/role-arn"
    value = aws_iam_role.cluster_autoscaler[0].arn
  }
}
```

**Files to modify**:
- `terraform/modules/kubernetes_cluster/main.tf` — Add Helm release
- `terraform/modules/kubernetes_cluster/variables.tf` — Add `enable_cluster_autoscaler` variable

**Acceptance criteria**:
- [ ] Autoscaler pod running in `kube-system`
- [ ] Uses existing IRSA role
- [ ] Auto-discovers node groups via ASG tags

---

### 5.4 — Database Schema Deployment (DG Phase 6)
**Effort**: 2 days
**Current coverage**: 60% → **85%** after

**Gap**: RDS instance created by Terraform, but no application database user, no schema, no K8s ConfigMap/Secret for DB connection.

**Sub-tasks**:

#### 5.4.1 — Post-RDS Schema Initialization (1 day)
Extend `databaseScriptExecutor.js` to run during deployment lifecycle:
- Create `zldb` database (if not exists)
- Create `pfuser` login (if not exists)
- Grant `db_owner` role

**Triggered by**: New deployment phase `database-init` (between `cluster-ready` and `zl-application-deploy`).

#### 5.4.2 — Generate K8s DB Config Artifacts (0.5 days)
This is handled by Phase 2 task 2.3 (`generateZLDBConfig`). This task ensures the **Terraform outputs** include RDS endpoint, port, and database name so the manifest generator can consume them.

**File**: `terraform/modules/kubernetes_cluster/outputs.tf`

```hcl
output "rds_endpoint" {
  value = var.cloud_provider == "aws" ? aws_db_instance.main[0].endpoint : null
}
output "rds_port" {
  value = var.cloud_provider == "aws" ? aws_db_instance.main[0].port : null
}
output "rds_database_name" {
  value = var.cloud_provider == "aws" ? aws_db_instance.main[0].db_name : null
}
```

#### 5.4.3 — SSM Port Forwarding for Private RDS (0.5 days)
For RDS instances in private subnets, add an SSM Session Manager port-forwarding utility:

```javascript
// In deploymentService or a new utility
async createRDSPortForward(deployment) {
  const rdsEndpoint = deployment.outputs.rds_endpoint;
  const bastionInstanceId = deployment.outputs.bastion_instance_id;
  
  // aws ssm start-session --target ${bastionInstanceId} 
  //   --document-name AWS-StartPortForwardingSessionToRemoteHost
  //   --parameters host="${rdsEndpoint}",portNumber="1433",localPortNumber="1433"
}
```

**Acceptance criteria**:
- [ ] `zldb` database and `pfuser` user created automatically
- [ ] RDS connection info available in Terraform outputs
- [ ] K8s ConfigMap/Secret generation consumes Terraform outputs
- [ ] SSM port forwarding available for private RDS access

---

## Files Created

| File | Purpose |
|------|---------|
| *(none — all changes to existing files)* | |

## Files Modified

| File | Change |
|------|--------|
| `terraform/modules/kubernetes_cluster/main.tf` | S3 CSI addon, ALB Helm, Autoscaler Helm |
| `terraform/modules/kubernetes_cluster/aws.tf` | IRSA roles for S3 CSI + ALB Controller |
| `terraform/modules/kubernetes_cluster/variables.tf` | Feature flags |
| `terraform/modules/kubernetes_cluster/outputs.tf` | RDS connection outputs |
| `backend/src/services/kubernetesManifestGenerator.js` | ALB Ingress annotations |
| `backend/src/services/databaseScriptExecutor.js` | Post-RDS schema init |
| `backend/src/services/deploymentService.js` | `database-init` phase |

---

## DG Coverage Impact

| Phase | Before | After |
|-------|:------:|:-----:|
| Phase 5 (S3 CSI) | 50% | **90%** |
| Phase 6 (Database) | 60% | **85%** |
| Phase 9 (Network/Ingress) | 65% | **80%** |
| Phase 10 (Autoscaler) | 65% | **95%** |
| **Weighted Average** | ~70% | **~80%** |
