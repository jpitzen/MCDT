# Phase 1 — Manifest Generator Foundation
## Core Extensions to `kubernetesManifestGenerator.js`

**Priority**: P0 (must complete before any ZL-specific work)
**Effort**: 5.5 days
**Sprint**: Week 1–2
**Prerequisites**: None

---

## Objective

Extend the existing `KubernetesManifestGenerator` class (494 lines, 9 methods) with the missing Kubernetes resource types and container features required to express the full ZL application stack. After this phase, the generator can produce *any* Kubernetes resource type needed — but not yet with ZL-specific knowledge.

---

## Current State

**File**: `backend/src/services/kubernetesManifestGenerator.js`
**Class**: `KubernetesManifestGenerator` (singleton export)
**Existing methods**: `generateNamespace`, `generateDeployment`, `generateService`, `generateConfigMap`, `generateSecret`, `generateIngress`, `generateHPA`, `generatePVC`, `generateAllManifests`

**Not in services barrel**: The generator is `require()`-ed directly by `localDeploymentService.js` (line ~30), not exported from `services/index.js`.

---

## Tasks

### 1.1 — Add `generateStatefulSet()` method
**Effort**: 2 days

Add a new method to the class that produces StatefulSet YAML with full feature support.

**Signature**:
```javascript
generateStatefulSet({
  name,                    // string — e.g. 'zlzookeeper'
  namespace = 'default',
  labels = {},
  replicas = 3,
  serviceName,             // string — headless service name (required)
  podManagementPolicy = 'Parallel',  // 'Parallel' | 'OrderedReady'
  image,
  imagePullSecrets = [],   // [{ name: 'docker-secret' }]
  serviceAccountName,      // string — e.g. 'zlapp-sa'
  ports = [],              // [{ name, containerPort, protocol }]
  env = [],                // [{ name, value }] or [{ name, valueFrom: {...} }]
  envFrom = [],            // [{ configMapRef }, { secretRef }]
  command,                 // string[] — optional container command override
  args,                    // string[] — optional container args
  volumes = [],            // [{ name, configMap/pvc/emptyDir }]
  volumeMounts = [],       // [{ name, mountPath, subPath }]
  initContainers = [],     // full container spec objects
  resources = {},          // { requests: {cpu, memory}, limits: {cpu, memory} }
  livenessProbe,           // probe spec object
  readinessProbe,          // probe spec object
  volumeClaimTemplates = [], // [{ name, accessModes, storageClassName, storage }]
})
```

**Output structure**:
```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: ${name}
  namespace: ${namespace}
  labels: ...
spec:
  replicas: ${replicas}
  serviceName: ${serviceName}
  podManagementPolicy: ${podManagementPolicy}
  selector:
    matchLabels: ...
  template:
    metadata:
      labels: ...
    spec:
      serviceAccountName: ${serviceAccountName}
      imagePullSecrets: [...]
      initContainers: [...]
      containers:
        - name: ${name}
          image: ${image}
          command: [...]
          args: [...]
          ports: [...]
          env: [...]
          envFrom: [...]
          resources: ...
          volumeMounts: [...]
          livenessProbe: ...
          readinessProbe: ...
      volumes: [...]
  volumeClaimTemplates:
    - metadata:
        name: ${vctName}
      spec:
        accessModes: [...]
        storageClassName: ${storageClass}
        resources:
          requests:
            storage: ${storage}
```

**Acceptance criteria**:
- [ ] Method exists on `KubernetesManifestGenerator` class
- [ ] Produces valid YAML parseable by `js-yaml`
- [ ] Supports `volumeClaimTemplates` (VCT) — the defining feature of StatefulSets
- [ ] Supports `initContainers` array
- [ ] Supports `command`/`args` override on main container
- [ ] Supports `serviceName` (link to headless service)
- [ ] Supports `podManagementPolicy`
- [ ] Labels include `zlaws.io/managed-by: zlaws` (existing pattern)

---

### 1.2 — Add `generateStorageClass()` method
**Effort**: 0.5 days

**Signature**:
```javascript
generateStorageClass({
  name,                    // 'ebs-sc', 'efs-sc'
  provisioner,             // 'ebs.csi.aws.com', 'efs.csi.aws.com'
  parameters = {},         // { type: 'gp3', fsType: 'ext4' } or { provisioningMode: 'efs-ap', fileSystemId: '...' }
  reclaimPolicy = 'Delete',
  volumeBindingMode = 'WaitForFirstConsumer',
  allowVolumeExpansion = true,
  isDefault = false,       // sets storageclass.kubernetes.io/is-default-class annotation
})
```

**Acceptance criteria**:
- [ ] Method produces valid StorageClass YAML
- [ ] Supports `isDefault` annotation
- [ ] Supports arbitrary `parameters` passthrough (cloud-specific)

---

### 1.3 — Add `generateServiceAccount()` method
**Effort**: 0.5 days

**Signature**:
```javascript
generateServiceAccount({
  name,                    // 'zlapp-sa'
  namespace = 'default',
  annotations = {},        // { 'eks.amazonaws.com/role-arn': '...' } for IRSA
  labels = {},
})
```

**Acceptance criteria**:
- [ ] Produces valid ServiceAccount YAML
- [ ] Supports IRSA annotations for AWS EKS

---

### 1.4 — Extend `generateService()` — headless + multi-port
**Effort**: 0.5 days

**Current signature** (line ~185): `generateService({ name, namespace, port, targetPort, serviceType, nodePort })`

**Changes needed**:
1. Add `clusterIP` parameter — when set to `'None'`, produces a headless Service
2. Change `port`/`targetPort` to accept either a single value (backward-compat) OR an array of port objects: `ports: [{ name, port, targetPort, protocol }]`

**Backward compatibility**: If `port`/`targetPort` are provided as numbers (existing callers), wrap them into the array format internally.

**Acceptance criteria**:
- [ ] `{ clusterIP: 'None' }` produces headless service
- [ ] `{ ports: [{ name: 'client', port: 2181 }, { name: 'peer', port: 2888 }] }` works
- [ ] Existing callers (`localDeploymentService.js` line ~188) still work unchanged

---

### 1.5 — Extend `generateDeployment()` — command, initContainers, imagePullSecrets
**Effort**: 0.75 days

**Current signature** (line ~84): `generateDeployment({ name, namespace, image, replicas, port, ... })`

**Add these parameters**:
```javascript
command,                   // string[] — container command override
args,                      // string[] — container args
initContainers = [],       // full container spec objects
imagePullSecrets = [],     // [{ name: 'docker-secret' }]
serviceAccountName,        // string
```

**Acceptance criteria**:
- [ ] `command: ['sh', '-c', 'cd /opt && ./start.sh & sleep infinity']` renders in container spec
- [ ] `initContainers` array renders before main container
- [ ] `imagePullSecrets` renders at pod spec level
- [ ] Existing callers still work (all new params optional)

---

### 1.6 — Extend `generateDeployment()` — ConfigMap volume projections + per-key env
**Effort**: 1.0 day

**Current volumes support**: Only PVC volumes (line ~140+).

**Add two volume types to existing `volumes` parameter**:

```javascript
// Type 1: ConfigMap volume with items (for subPath mounting)
volumes: [{
  name: 'zkclient-config',
  configMap: {
    name: 'zkclient-config',
    items: [
      { key: 'tcdb.cfg', path: 'tcdb.cfg' },
      { key: 'zkQuorum.cfg', path: 'zkQuorum.cfg' },
    ]
  }
}]

// Type 2: emptyDir volume
volumes: [{
  name: 'tmp-dir',
  emptyDir: {}
}]
```

**Add per-key `configMapKeyRef` / `secretKeyRef` to env**:

Currently only supports `envFrom` (bulk injection). Add support for individual key references:

```javascript
env: [
  { name: 'DB_HOST', valueFrom: { configMapKeyRef: { name: 'db-config', key: 'DB_HOST' } } },
  { name: 'DB_PASSWORD', valueFrom: { secretKeyRef: { name: 'db-secret', key: 'DB_PASSWORD' } } },
  { name: 'CLUSTER_NAME', value: 'MP' },  // plain value (already works)
]
```

**Acceptance criteria**:
- [ ] ConfigMap-projected volumes render correctly with `items` for subPath mounting
- [ ] emptyDir volumes render correctly
- [ ] Per-key `configMapKeyRef` renders in container env block
- [ ] Per-key `secretKeyRef` renders in container env block
- [ ] Plain `{ name, value }` env vars still work (existing behavior)
- [ ] `envFrom` (existing) still works alongside per-key `env`

---

### 1.7 — Extend `generateConfigMap()` — multi-file content blocks
**Effort**: 0.25 days

**Current**: `generateConfigMap({ name, namespace, data })` where `data` is `{ KEY: 'simple-value' }`.

**Needed**: Support multi-line file content in `data` values. This technically already works if the value is a multi-line string — `js-yaml.dump()` will use block scalar style. **Verify** this works and add a test case:

```javascript
generateConfigMap({
  name: 'zkclient-config',
  namespace: 'default',
  data: {
    'tc.cfg': 'tc.machine=tc/K8S\ntc.initial_executors=5\n...',
    'tcdb.cfg': 'DB_MSSQL_DEFAULT=true\nDB_MSSQL_USERID=pfuser\n...',
    'zkClient.cfg': 'zkQuorum.cfg.file=/opt/ZipLip/...\n...',
    'zkQuorum.cfg': 'server.0=zlzookeeper-0.zk-hs...\n...',
  }
})
```

**Acceptance criteria**:
- [ ] Multi-line string values render as YAML block scalars (`|` or `|-`)
- [ ] File-like keys (with `.cfg` extension) work as data keys
- [ ] Output is valid K8s ConfigMap that `kubectl apply` accepts

---

### 1.8 — Add `generateDockerRegistrySecret()` method
**Effort**: 0.25 days

For ECR `imagePullSecrets`:

```javascript
generateDockerRegistrySecret({
  name,                    // 'docker-secret'
  namespace = 'default',
  server,                  // 'https://995553364920.dkr.ecr.us-east-1.amazonaws.com'
  username,                // 'AWS'
  password,                // ECR auth token
  email = '',
})
```

Produces `kubernetes.io/dockerconfigjson` type Secret.

**Acceptance criteria**:
- [ ] Output has `type: kubernetes.io/dockerconfigjson`
- [ ] `.dockerconfigjson` data is properly base64-encoded JSON

---

## Files Modified

| File | Action |
|------|--------|
| `backend/src/services/kubernetesManifestGenerator.js` | Add 3 new methods, extend 3 existing methods |
| `backend/src/services/index.js` | Export `kubernetesManifestGenerator` from barrel |

## Files Created

*None in this phase — all work is on the existing generator.*

---

## Verification

After all tasks complete:

```bash
# Manual verification: generate sample YAML for each new/modified method
node -e "
  const KMG = require('./backend/src/services/kubernetesManifestGenerator');
  const gen = new KMG();
  
  // StatefulSet
  console.log(gen.generateStatefulSet({ name: 'test-ss', serviceName: 'test-hs', image: 'zk:3.8', replicas: 3, volumeClaimTemplates: [{ name: 'data', storage: '10Gi', storageClassName: 'ebs-sc' }] }));
  
  // Headless Service
  console.log(gen.generateService({ name: 'test-hs', clusterIP: 'None', ports: [{ name: 'client', port: 2181 }, { name: 'peer', port: 2888 }] }));
  
  // StorageClass
  console.log(gen.generateStorageClass({ name: 'ebs-sc', provisioner: 'ebs.csi.aws.com', parameters: { type: 'gp3' }, isDefault: true }));
  
  // Deployment with command + initContainers + configMap volumes
  console.log(gen.generateDeployment({ name: 'test-app', image: 'app:1.0', command: ['sh', '-c', 'start.sh'], initContainers: [{ name: 'init', image: 'busybox:1.36' }], volumes: [{ name: 'cfg', configMap: { name: 'my-config', items: [{ key: 'app.cfg', path: 'app.cfg' }] } }] }));
"
```

Pipe each output through `kubectl apply --dry-run=client -f -` to validate.

---

## Blocks

- **Phase 2** (ZL Templates) is entirely blocked on this phase
- **Phase 3** (Deploy Pipeline) is partially blocked — ordering logic can start, but apply steps need generated manifests
- **Phase 4** (Wizard) can proceed in parallel for UX design, but backend wiring needs Phase 2

---

## DG Coverage Impact

No direct DG coverage change — this phase is foundational infrastructure. Coverage improvements come when Phase 2 consumes these methods.
