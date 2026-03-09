# Phase 3 — Deployment Pipeline & Orchestration
## Ordered Apply, Health Checks, Rollback

**Priority**: P0 (connects manifest generation to live cluster)
**Effort**: 3 days
**Sprint**: Week 5–6
**Prerequisites**: Phase 1 complete, Phase 2 at least tasks 2.8–2.13 complete

---

## Objective

Create the orchestration layer that takes the ordered manifest array from `zlManifestTemplates.generateAllZLManifests()` and applies it to a live Kubernetes cluster with dependency-aware ordering, health gate waits, progress reporting via Socket.IO, and rollback on failure.

---

## Architecture

```
deploymentService.createDeployment()
       │
       ▼
multiCloudOrchestrator.js          ← existing: Terraform lifecycle
       │
       │  (NEW: post-terraform hook)
       ▼
┌──────────────────────────────┐
│  zlDeploymentOrchestrator.js  │  ← THIS PHASE
│                               │
│  1. generateAllZLManifests()  │
│  2. for each manifest:        │
│     a. kubectl apply -f       │
│     b. wait for readiness     │
│     c. emit progress via WS   │
│  3. health verification       │
│  4. rollback on failure       │
└──────────────────────────────┘
       │
       ▼
  WebSocket: deployment:phase-update, deployment:progress-update
```

---

## Tasks

### 3.1 — Create `zlDeploymentOrchestrator.js` — core apply loop
**Effort**: 1 day

**File**: `backend/src/services/zlDeploymentOrchestrator.js`

```javascript
class ZLDeploymentOrchestrator {
  constructor() {
    this.manifestTemplates = new (require('./zlManifestTemplates'))();
    this.logger = require('./logger');
  }

  /**
   * Deploy the full ZL application stack to a Kubernetes cluster.
   * @param {string} deploymentId — for logging and WebSocket progress
   * @param {object} config — ZL manifest config (see Phase 2 config spec)
   * @param {string} kubeconfig — path to kubeconfig file or context name
   * @returns {object} { success, appliedManifests[], failedAt?, rollbackResult? }
   */
  async deployZLApplication(deploymentId, config, kubeconfig) { ... }
}
```

**Apply loop logic**:
```
manifests = generateAllZLManifests(config)
appliedStack = []

for manifest in manifests (ordered):
  try:
    emit('deployment:phase-update', { phase: `applying-${manifest.kind}`, order: manifest.order })
    
    // Write YAML to temp file
    tmpFile = writeTempYaml(manifest.yaml)
    
    // Apply
    result = exec(`kubectl apply -f ${tmpFile} --kubeconfig=${kubeconfig}`)
    appliedStack.push(manifest)
    
    emit('deployment:progress-update', {
      progress: (manifest.order / manifests.length) * 100,
      message: `Applied ${manifest.kind}: ${manifest.name}`
    })
    
    // Wait gate (if manifest has waitFor)
    if manifest.waitFor === 'zk-quorum':
      await waitForZKQuorum(kubeconfig, config.namespace, config.zk.replicas)
    
  catch error:
    emit('deployment:failed', { failedAt: manifest.kind, error: error.message })
    rollbackResult = await rollback(appliedStack, kubeconfig)
    return { success: false, failedAt: manifest, rollbackResult }

return { success: true, appliedManifests: appliedStack }
```

**Acceptance criteria**:
- [ ] Applies manifests in strict order from `generateAllZLManifests()` output
- [ ] Each apply step writes YAML to temp file, runs `kubectl apply -f`
- [ ] Progress events emitted via `websocketServer.emitDeploymentUpdate()` (3-arg signature)
- [ ] On failure, stops immediately and begins rollback
- [ ] Returns structured result object

---

### 3.2 — ZooKeeper quorum health gate
**Effort**: 0.5 days

After the ZK StatefulSet is applied, the orchestrator must **wait** for the quorum to become healthy before deploying application pods.

**Health check logic**:
```javascript
async waitForZKQuorum(kubeconfig, namespace, replicas, timeoutMs = 180000) {
  const startTime = Date.now();
  const pollInterval = 5000; // 5 seconds
  
  while (Date.now() - startTime < timeoutMs) {
    // Check all ZK pods are Ready
    const pods = exec(`kubectl get pods -l app=zlzookeeper -n ${namespace} --kubeconfig=${kubeconfig} -o json`);
    const readyPods = pods.items.filter(p => 
      p.status.conditions?.find(c => c.type === 'Ready' && c.status === 'True')
    );
    
    if (readyPods.length >= replicas) {
      // Verify quorum via ruok command
      const ruok = exec(`kubectl exec zlzookeeper-0 -n ${namespace} --kubeconfig=${kubeconfig} -- sh -c "echo ruok | nc localhost 2181"`);
      if (ruok.trim() === 'imok') {
        logger.deployment(deploymentId, 'zk-health', `ZK quorum healthy: ${readyPods.length}/${replicas} pods ready`);
        return true;
      }
    }
    
    await sleep(pollInterval);
  }
  
  throw new Error(`ZK quorum not healthy after ${timeoutMs}ms`);
}
```

**Acceptance criteria**:
- [ ] Polls ZK pod readiness every 5 seconds
- [ ] Verifies quorum via `ruok` four-letter command
- [ ] Times out after 3 minutes with descriptive error
- [ ] Logs progress via `logger.deployment()`

---

### 3.3 — Application pod readiness verification
**Effort**: 0.5 days

After all Deployments are applied, verify each pod is Running and Ready.

**Check each deployment**:
```javascript
async waitForDeploymentReady(name, namespace, kubeconfig, timeoutMs = 120000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    const result = exec(`kubectl rollout status deployment/${name} -n ${namespace} --kubeconfig=${kubeconfig} --timeout=10s`);
    if (result.includes('successfully rolled out')) {
      return true;
    }
    await sleep(5000);
  }
  
  throw new Error(`Deployment ${name} not ready after ${timeoutMs}ms`);
}
```

**Ordered verification** (after all kubectl applies):
1. `zltika` — verify port 9972 accepting connections
2. `zlserver` — verify pod Running
3. `zlsearch` — verify pod Running
4. `zlui` — verify pod Running; if external, verify LB has external IP

**Acceptance criteria**:
- [ ] Each deployment checked via `kubectl rollout status`
- [ ] Timeout per deployment: 2 minutes
- [ ] Results aggregated and emitted as final progress event
- [ ] If external mode, capture ELB hostname from `zlui-service` and return in result

---

### 3.4 — Rollback on failure
**Effort**: 1 day

If any apply step fails, delete resources **in reverse order** from the applied stack.

```javascript
async rollback(appliedStack, kubeconfig) {
  const results = [];
  
  // Reverse order: delete workloads first, then configs, then storage
  for (const manifest of [...appliedStack].reverse()) {
    try {
      const tmpFile = writeTempYaml(manifest.yaml);
      exec(`kubectl delete -f ${tmpFile} --kubeconfig=${kubeconfig} --ignore-not-found`);
      results.push({ kind: manifest.kind, status: 'deleted' });
    } catch (err) {
      results.push({ kind: manifest.kind, status: 'delete-failed', error: err.message });
    }
  }
  
  return { rolledBack: results.filter(r => r.status === 'deleted').length, total: appliedStack.length, details: results };
}
```

**Acceptance criteria**:
- [ ] Deletes in reverse apply order
- [ ] Uses `--ignore-not-found` to avoid errors on partial resources
- [ ] PVCs with `reclaimPolicy: Retain` are NOT deleted (data preservation)
- [ ] Returns structured rollback result
- [ ] Emits `deployment:rollback-completed` via WebSocket

---

## Files Created

| File | Purpose | Est. Lines |
|------|---------|:----------:|
| `backend/src/services/zlDeploymentOrchestrator.js` | Deploy orchestration, health checks, rollback | ~400 |

## Files Modified

| File | Change |
|------|--------|
| `backend/src/services/index.js` | Export `zlDeploymentOrchestrator` |
| `backend/src/services/multiCloudOrchestrator.js` | Add post-terraform hook to call ZL orchestrator when `cluster-ready` phase completes |
| `backend/src/services/deploymentService.js` | Add `deployment_phase: 'zl-application-deploy'` to lifecycle phases |

---

## Integration Point

In `multiCloudOrchestrator.js`, after the `cluster-ready` phase, add:

```javascript
// After terraform apply succeeds and cluster is ready:
if (deployment.configuration?.deployZLApplication) {
  const zlOrchestrator = require('./zlDeploymentOrchestrator');
  await zlOrchestrator.deployZLApplication(
    deployment.id,
    deployment.configuration.zlConfig,
    kubeconfigPath
  );
}
```

This is the bridge between infrastructure provisioning (Terraform) and application deployment (kubectl).

---

## WebSocket Events Emitted

| Event | Data | When |
|-------|------|------|
| `deployment:phase-update` | `{ phase: 'applying-StorageClass', order: 1 }` | Before each manifest apply |
| `deployment:progress-update` | `{ progress: 42, message: 'Applied ConfigMap: zkclient-config' }` | After each successful apply |
| `deployment:log` | `{ message: 'ZK quorum healthy: 3/3 pods ready' }` | During health checks |
| `deployment:completed` | `{ elbHostname: '...', accessUrl: 'https://...' }` | All resources deployed and verified |
| `deployment:failed` | `{ failedAt: 'StatefulSet', error: '...' }` | On any apply failure |
| `deployment:rollback-completed` | `{ rolledBack: 8, total: 10 }` | After rollback finishes |

---

## DG Coverage Impact

| Phase | Before | After |
|-------|:------:|:-----:|
| Phase 7 (ZooKeeper) | 90% (after Ph2) | **95%** (+ health verification) |
| Phase 8 (App Deployment) | 85% (after Ph2) | **90%** (+ readiness checks) |
| Phase 11 (Post-Deployment) | 0% | **20%** (basic health verification only) |
