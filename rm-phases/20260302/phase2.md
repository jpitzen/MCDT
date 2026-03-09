# Phase 2 — ZL Application Manifest Templates
## ZL-Specific Template Layer on Top of Generic Generator

**Priority**: P0 (core deliverable — produces the actual deployment artifacts)
**Effort**: 7.5 days
**Sprint**: Week 3–4
**Prerequisites**: Phase 1 complete (all generator extensions)

---

## Objective

Create `backend/src/services/zlManifestTemplates.js` — a ZL application-specific template service that calls the generic `KubernetesManifestGenerator` methods with the exact parameters, mount paths, port numbers, ConfigMap structures, and resource limits defined in the DG03/aws reference manifests. After this phase, calling `generateAllZLManifests(config)` produces the complete set of 29 Kubernetes resources needed to deploy the ZL application stack.

---

## Architecture

```
User Config (wizard)
       │
       ▼
┌─────────────────────────┐
│  zlManifestTemplates.js  │  ← ZL-specific knowledge (this phase)
│  - ZL mount paths        │
│  - ZL port numbers       │
│  - ZL ConfigMap formats  │
│  - Access mode branching │
└───────────┬─────────────┘
            │  calls
            ▼
┌─────────────────────────────────┐
│  kubernetesManifestGenerator.js  │  ← Generic K8s resource generator (Phase 1)
│  - generateStatefulSet()         │
│  - generateDeployment()          │
│  - generateService()             │
│  - generateConfigMap()           │
│  - generateStorageClass()        │
│  - generateSecret()              │
│  - generatePVC()                 │
│  - generateServiceAccount()      │
└─────────────────────────────────┘
            │  outputs
            ▼
    YAML strings (ordered array)
```

---

## Input Configuration Object

All ZL template functions accept a single `config` object. The orchestrator `generateAllZLManifests()` receives the full config; individual template functions receive relevant subsets.

```javascript
const config = {
  // Cloud & cluster
  cloudProvider: 'aws',                    // 'aws' | 'azure' | 'gcp' | 'digitalocean' | 'linode'
  namespace: 'default',

  // ECR / Container registry
  registryUrl: '995553364920.dkr.ecr.us-east-1.amazonaws.com',
  repositoryName: 'ue1-zlps-ecr-01',
  imageTags: {
    zlzookeeper: 'zlzookeeper11.1.0-b1140',
    zltika: 'zltika11.1.0-b1140',
    zlserver: 'zlserver-k8s-20251222',     // shared by zlserver, zlsearch, zlui
  },

  // Storage (AWS-specific)
  efsFileSystemId: 'fs-0a2b69e49fe46c1f6', // required for efs-sc StorageClass

  // Database
  db: {
    host: 'use1-zlps-msexpsql-01-eks.cqhaqqqiwngv.us-east-1.rds.amazonaws.com',
    port: 1433,
    name: 'zldb',
    user: 'pfuser',
    password: 'LJZ-wkVv@t_!d*PiM2tbx3TZ4h',
    type: 'mssql',
  },

  // ZooKeeper
  zk: {
    replicas: 3,                           // always 3 (quorum minimum)
    authKey: 'Zh2CX0aZm7f+tRNic77CKvCtYwrxz8Nt7QY1y1T6B5AV4tcMVWGBf4J2Lei/JSDU9KKPspAK2nYPUJF7mQmIVg==',
  },

  // Access mode (from Phase 4 wizard step)
  accessMode: 'external',                  // 'internal' | 'external'
  externalDomain: 'zlpsaws.zlpsonline.com', // required when accessMode === 'external'
  ssl: {
    mode: 'upload',                        // 'acm' | 'upload'
    certArn: null,                         // ACM ARN (when mode === 'acm')
    cert: '-----BEGIN CERTIFICATE-----...', // PEM cert (when mode === 'upload')
    key: '-----BEGIN PRIVATE KEY-----...',  // PEM key (when mode === 'upload')
  },

  // Application tuning (defaults provided)
  app: {
    threadPool: { core: 10, max: 50, queue: 100 },
    memory: { min: '512m', max: '4g' },
    logLevel: 'INFO',
    executors: { initial: 5, service: 3, managed: 3 },
  },

  // Docker registry auth (for imagePullSecrets)
  dockerAuth: {
    server: 'https://995553364920.dkr.ecr.us-east-1.amazonaws.com',
    username: 'AWS',
    password: '<ecr-auth-token>',
  },

  // Service account
  serviceAccount: {
    name: 'zlapp-sa',
    irsaRoleArn: 'arn:aws:iam::995553364920:role/...',  // AWS IRSA
  },
};
```

---

## Tasks

### 2.1 — `generateZLStorageClasses(config)` → 2 StorageClasses
**Effort**: 0.5 days

Produces `ebs-sc` (gp3, default) and `efs-sc` (EFS AP with `config.efsFileSystemId`).

**Fixed values**: provisioner names, gp3 type, fsType ext4, reclaimPolicy, bindingMode
**Parameterized**: `efsFileSystemId` from config

**Reference**: `manualprocess/DG03/aws/storage-classes.yaml`

**Acceptance criteria**:
- [ ] Produces 2 YAML documents
- [ ] `ebs-sc` has `storageclass.kubernetes.io/is-default-class: "true"` annotation
- [ ] `efs-sc` has `fileSystemId` from config
- [ ] YAML matches DG03 reference when given same inputs

---

### 2.2 — `generateZLPVCs(config)` → 5 PVCs
**Effort**: 0.5 days

Produces the **minimal effective set** (excludes orphaned PVCs identified in gap analysis):

| PVC | StorageClass | AccessMode | Size |
|-----|-------------|-----------|------|
| `zluilogs-efs` | `efs-sc` | ReadWriteMany | 10Gi |
| `zlvault-efs` | `efs-sc` | ReadWriteMany | 10Gi |
| `zlserverlogs-efs` | `efs-sc` | ReadWriteMany | 10Gi |

**Note**: `zlservertemp-efs` and `zltikatemp-efs` are NOT generated (manual process uses emptyDir). ZK EBS PVCs come from StatefulSet VCT, not standalone PVCs.

**Parameterized**: `namespace`
**Fixed**: Names, sizes, access modes, storage class names

**Reference**: `manualprocess/DG03/aws/pvc.yaml` (filtering out unused PVCs)

**Acceptance criteria**:
- [ ] Produces 3 PVC YAML documents (not 5 — exclude orphans)
- [ ] All use `efs-sc` StorageClass with `ReadWriteMany`

---

### 2.3 — `generateZLDBConfig(config)` → ConfigMap + Secret
**Effort**: 0.25 days

**ConfigMap `db-config`**:
```yaml
data:
  DB_HOST: ${config.db.host}
  DB_PORT: "${config.db.port}"
  DB_NAME: ${config.db.name}
  DB_TYPE: ${config.db.type}
  DB_USER: ${config.db.user}
```

**Secret `db-secret`**:
```yaml
stringData:
  DB_PASSWORD: ${config.db.password}
```

**Reference**: `manualprocess/DG03/aws/db-config.yaml`, `db-secret.yaml`

**Acceptance criteria**:
- [ ] ConfigMap has all 5 DB keys
- [ ] Secret uses `stringData` (not pre-encoded `data`)
- [ ] Password value comes from same `config.db.password` used in task 2.5

---

### 2.4 — `generateZLAppConfig(config)` → ConfigMap
**Effort**: 0.5 days

Produces `zlapp-config` ConfigMap with `ZLApp.cfg` as a multi-line data value.

**Template** (multi-line string interpolation):
```cfg
_zkClientConfig=/opt/ZipLip/ZLZooKeeper/config/zkClient.cfg
_cfg.site.name=K8S
_cfg.threadpool.core=${config.app.threadPool.core}
_cfg.threadpool.max=${config.app.threadPool.max}
_cfg.threadpool.queue=${config.app.threadPool.queue}
_cfg.memory.min=${config.app.memory.min}
_cfg.memory.max=${config.app.memory.max}
_cfg.log.level=${config.app.logLevel}
_cfg.log.dir=/var/opt/zlserverlogs
```

**Reference**: `manualprocess/DG03/aws/zlapp-config.yaml`

**Acceptance criteria**:
- [ ] ConfigMap data key is `ZLApp.cfg` (file-like key, not flat env var)
- [ ] Content is multi-line, rendered as YAML block scalar
- [ ] Fixed paths (`_zkClientConfig`, `_cfg.log.dir`) are hardcoded
- [ ] Tuning values (`threadpool`, `memory`, `logLevel`) come from config

---

### 2.5 — `generateZKClientConfig(config)` → ConfigMap ⭐ MOST COMPLEX
**Effort**: 1.0 day

Produces `zkclient-config` ConfigMap with **4 embedded `.cfg` files**:

| Data Key | Content | Parameterized Values |
|----------|---------|---------------------|
| `tc.cfg` | Site/cluster config | `executors` from config |
| `tcdb.cfg` | Database JDBC connection | `db.host`, `db.user`, `db.password`, `db.name` — **plaintext password** |
| `zkClient.cfg` | ZK client bootstrap | Fixed paths only |
| `zkQuorum.cfg` | ZK ensemble addresses | `namespace`, `zk.authKey` |

**Critical**: `tcdb.cfg` contains the DB password in **plaintext** (not base64). This must be the same value as `db-secret`. The template function takes it from the single `config.db.password` source.

**`zkQuorum.cfg` template** (3-node quorum, namespace-parameterized):
```cfg
server.0=zlzookeeper-0.zk-hs.${ns}.svc.cluster.local:2181:2888:3888:/var/ZipLip/DATA/ZooKeeper/zk0
server.1=zlzookeeper-1.zk-hs.${ns}.svc.cluster.local:2181:2888:3888:/var/ZipLip/DATA/ZooKeeper/zk1
server.2=zlzookeeper-2.zk-hs.${ns}.svc.cluster.local:2181:2888:3888:/var/ZipLip/DATA/ZooKeeper/zk2
zookeeper.auth.key=${config.zk.authKey}
```

**Reference**: `manualprocess/DG03/aws/zkclient-config.yaml`

**Acceptance criteria**:
- [ ] ConfigMap has exactly 4 data keys: `tc.cfg`, `tcdb.cfg`, `zkClient.cfg`, `zkQuorum.cfg`
- [ ] All 4 are multi-line block scalars
- [ ] `tcdb.cfg` JDBC URL includes `config.db.host` and port 1433
- [ ] `tcdb.cfg` password matches `config.db.password` exactly
- [ ] `zkQuorum.cfg` uses `config.namespace` in FQDN
- [ ] `zkQuorum.cfg` auth key matches `config.zk.authKey`

---

### 2.6 — `generateZKServerConfig(config)` → ConfigMap
**Effort**: 0.5 days

Produces `zk-config` ConfigMap with `zk.cfg` and `zkQuorum.cfg` (server-side ZK config).

**`zk.cfg` template** (all fixed values):
```cfg
clientPort=2181
tickTime=2000
initLimit=10
syncLimit=5
autopurge.snapRetainCount=3
autopurge.purgeInterval=1
admin.log.level=24
app.zk.name=ZLZK
app.zk.id=17
```

**`zkQuorum.cfg`**: Same quorum entries as `zkclient-config` but with both short hostname and FQDN format for server-side resolution.

**Reference**: `manualprocess/DG03/aws/zk-config.yaml`

**Acceptance criteria**:
- [ ] ConfigMap has 2 data keys: `zk.cfg`, `zkQuorum.cfg`
- [ ] `zk.cfg` values are all fixed (no parameterization)
- [ ] `zkQuorum.cfg` matches the zkclient version for quorum addresses

---

### 2.7 — `generateAccessModeConfigs(config)` → 2 ConfigMaps ⭐ ACCESS-MODE-DEPENDENT
**Effort**: 0.5 days

Produces `pmappurl-config` and `tomcat-server-config` with values branching on `config.accessMode`.

**Internal mode**:
```cfg
# pmappurl-config → pmappURL.cfg
HAS_SSL=false
web.server.URL=
ps.prefix=/ps
selfLocation=true
```
```xml
<!-- tomcat-server-config → server.xml -->
<Connector port="80" protocol="HTTP/1.1"
           connectionTimeout="20000"
           redirectPort="8443" />
```

**External mode**:
```cfg
# pmappurl-config → pmappURL.cfg
HAS_SSL=true
web.server.URL=${config.externalDomain}
ps.prefix=/ps
selfLocation=true
```
```xml
<!-- tomcat-server-config → server.xml -->
<Connector port="80" protocol="HTTP/1.1"
           connectionTimeout="20000"
           redirectPort="8443"
           proxyName="${config.externalDomain}"
           proxyPort="443"
           scheme="https"
           secure="true" />
```

**Reference**: `manualprocess/DG03/aws/pmappurl-config.yaml`, `tomcat-server-config.yaml`

**Acceptance criteria**:
- [ ] Internal mode: `HAS_SSL=false`, blank `web.server.URL`, no `proxyName` in server.xml
- [ ] External mode: `HAS_SSL=true`, domain in both ConfigMaps
- [ ] Domain comes from single `config.externalDomain` source (no duplication)

---

### 2.8 — `generateZLServices(config)` → 7 Services
**Effort**: 0.5 days

Produces the **minimal effective set** (excludes redundant services):

| Service | Type | Ports | Selector |
|---------|------|-------|----------|
| `zk-hs` | Headless (`clusterIP: None`) | 2181, 2888, 3888 | `app: zlzookeeper` |
| `zk-cs` | ClusterIP | 2181 | `app: zlzookeeper` |
| `zlserver-service` | ClusterIP | 8080→8080 | `app: zlserver` |
| `zlsearch-service` | ClusterIP | 8080→8080 | `app: zlsearch` |
| `zltika-service` | ClusterIP | 9972→9972 | `app: zltika` |
| `zlui-service` | ClusterIP **or** LoadBalancer | 8080→80, 8443→8443 | `app: zlui` |

**Access mode branching**: `zlui-service` type is `ClusterIP` when `config.accessMode === 'internal'`, `LoadBalancer` when `external`.

**Excluded** (redundant): `zlui` (port 8081), `zltika` (duplicate of `zltika-service`), `zlsearch` (port 80, duplicate)

**Reference**: `manualprocess/DG03/aws/services.yaml`

**Acceptance criteria**:
- [ ] 7 Service YAML documents (6 fixed + 1 access-mode-branched)
- [ ] `zk-hs` has `clusterIP: None`
- [ ] `zlui-service` type changes based on `config.accessMode`

---

### 2.9 — `generateZKStatefulSet(config)` → StatefulSet
**Effort**: 1.0 day

Produces `zlzookeeper` StatefulSet with full ZL-specific configuration.

**Key parameters** (all from config):
- Image: `${config.registryUrl}/${config.repositoryName}:${config.imageTags.zlzookeeper}`
- Replicas: `config.zk.replicas` (always 3)
- serviceName: `zk-hs`
- serviceAccountName: `config.serviceAccount.name`
- imagePullSecrets: `docker-secret`

**Init container** (fixed):
```yaml
- name: init-myid
  image: busybox:1.36
  command: ['sh', '-c', 'ORDINAL=${HOSTNAME##*-} && echo $((ORDINAL)) > /data/myid']
  volumeMounts:
    - name: zlzkdata
      mountPath: /data
```

**Volume mounts**:
- `zlzkdata` (from VCT) → `/var/ZipLip/DATA/ZooKeeper`
- `zk-config` (ConfigMap) → subPath mounts for `zk.cfg` and `zkQuorum.cfg`

**Resources**: requests 250m/512Mi, limits 500m/1Gi
**Probes**: liveness TCP 2181 (delay 30s), readiness TCP 2181 (delay 10s)
**VCT**: `zlzkdata` 10Gi on `ebs-sc` (ReadWriteOnce)

**Reference**: `manualprocess/DG03/aws/zlzookeeper-statefulset.yaml`

**Acceptance criteria**:
- [ ] Image uses ECR registry from config
- [ ] Init container computes myid from hostname ordinal
- [ ] ConfigMap volume for `zk-config` with subPath mounts
- [ ] VolumeClaimTemplate with `ebs-sc` StorageClass
- [ ] Probes on port 2181

---

### 2.10 — `generateZLDeployments(config)` → 4 Deployments
**Effort**: 1.0 day

Produces `zltika`, `zlserver`, `zlsearch`, `zlui` Deployments.

**Common pattern** (zlserver, zlsearch, zlui share same image):
- Image: `${config.registryUrl}/${config.repositoryName}:${config.imageTags.zlserver}`
- `imagePullSecrets: [{ name: 'docker-secret' }]`
- `serviceAccountName: config.serviceAccount.name`
- `envFrom: [{ configMapRef: 'zlapp-config' }, { configMapRef: 'db-config' }, { secretRef: 'db-secret' }]`
- Volume: `zkclient-config` ConfigMap → subPath `tcdb.cfg` + `zkQuorum.cfg`
- Volume: `zlvault` PVC → `/var/opt/zlvault`

**Per-deployment differences**:

| Deployment | CLUSTER_NAME | Extra Volumes | Extra ConfigMap Mounts | Resources |
|-----------|-------------|--------------|----------------------|-----------|
| `zltika` | *(none)* | None | None | 250m/512Mi → 500m/1Gi |
| `zlserver` | `MP` | `zlserverlogs-efs` PVC, `emptyDir` temp | `zkclient-config` (tcdb.cfg, zkQuorum.cfg) | 500m/1Gi → 1000m/2Gi |
| `zlsearch` | `SEARCH` | `emptyDir` logs, `emptyDir` temp | `zkclient-config` (tcdb.cfg, zkQuorum.cfg) | 500m/1Gi → 1000m/2Gi |
| `zlui` | `UI` | `zluilogs-efs` PVC, `emptyDir` temp | `zkclient-config` + `pmappurl-config` + `tomcat-server-config` | 500m/1Gi → 1000m/2Gi |

**zltika special**: Uses different image tag, has custom `command` override (`cd /opt/ZipLip/ZLTikaConvertor/bin && ./zltikadiag.sh ZLTika /tmp/ZLTika & sleep infinity`), port 9972.

**zlui special**: Only pod with `pmappurl-config` and `tomcat-server-config` volume mounts (access-mode-dependent).

**Reference**: `manualprocess/DG03/aws/zltika-deployment.yaml`, `zlserver-deployment.yaml`, `zlsearch-deployment.yaml`, `zlui-deployment-fixed.yaml`

**Acceptance criteria**:
- [ ] 4 Deployment YAML documents
- [ ] All have `strategy: Recreate`
- [ ] `zltika` has command override and different image tag
- [ ] `zlserver`, `zlsearch`, `zlui` share same image, differ by `CLUSTER_NAME`
- [ ] `zlui` has `pmappurl-config` and `tomcat-server-config` subPath mounts
- [ ] All app pods have `zkclient-config` subPath mounts for `tcdb.cfg` and `zkQuorum.cfg`
- [ ] `zlvault-efs` PVC shared across all 3 app pods

---

### 2.11 — `generateZLSecrets(config)` → 1–3 Secrets
**Effort**: 0.5 days

| Secret | Always Created | Content |
|--------|:-:|---------|
| `db-secret` | ✅ | `DB_PASSWORD` from `config.db.password` |
| `docker-secret` | ✅ | ECR pull credentials from `config.dockerAuth` |
| `zlui-ssl-cert` | Only when `config.accessMode === 'external' && config.ssl.mode === 'upload'` | TLS cert + key from `config.ssl.cert` / `config.ssl.key` |

**Acceptance criteria**:
- [ ] `db-secret` always produced
- [ ] `docker-secret` is `kubernetes.io/dockerconfigjson` type
- [ ] `zlui-ssl-cert` only produced for external access with uploaded certs
- [ ] `zlui-ssl-cert` is `kubernetes.io/tls` type with `tls.crt` and `tls.key`

---

### 2.12 — `generateZLServiceAccount(config)` → ServiceAccount
**Effort**: 0.25 days

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: zlapp-sa
  namespace: ${config.namespace}
  annotations:
    eks.amazonaws.com/role-arn: ${config.serviceAccount.irsaRoleArn}
```

**Cloud branching**: Only include IRSA annotation for AWS. Azure uses workload identity, GCP uses Workload Identity Federation. For now, implement AWS only; stub annotation map for other providers.

---

### 2.13 — `generateAllZLManifests(config)` → Ordered YAML Array
**Effort**: 0.5 days

**Orchestrator** that calls all 12 template functions above and returns an ordered array:

```javascript
async generateAllZLManifests(config) {
  const manifests = [];
  
  // 1. Foundation
  manifests.push({ order: 1, kind: 'StorageClass', yaml: this.generateZLStorageClasses(config) });
  manifests.push({ order: 2, kind: 'PVC', yaml: this.generateZLPVCs(config) });
  
  // 2. Identity
  manifests.push({ order: 3, kind: 'ServiceAccount', yaml: this.generateZLServiceAccount(config) });
  manifests.push({ order: 4, kind: 'Secret', yaml: this.generateZLSecrets(config) });
  
  // 3. Configuration
  manifests.push({ order: 5, kind: 'ConfigMap', yaml: this.generateZLDBConfig(config) });
  manifests.push({ order: 6, kind: 'ConfigMap', yaml: this.generateZLAppConfig(config) });
  manifests.push({ order: 7, kind: 'ConfigMap', yaml: this.generateZKClientConfig(config) });
  manifests.push({ order: 8, kind: 'ConfigMap', yaml: this.generateZKServerConfig(config) });
  manifests.push({ order: 9, kind: 'ConfigMap', yaml: this.generateAccessModeConfigs(config) });
  
  // 4. Networking
  manifests.push({ order: 10, kind: 'Service', yaml: this.generateZLServices(config) });
  
  // 5. Workloads (strict order: ZK first, then Tika, then app pods)
  manifests.push({ order: 11, kind: 'StatefulSet', yaml: this.generateZKStatefulSet(config), waitFor: 'zk-quorum' });
  manifests.push({ order: 12, kind: 'Deployment', yaml: this.generateZLDeployments(config) });
  
  return manifests;
}
```

**Return format**: Array of `{ order, kind, yaml, waitFor? }` — consumed by Phase 3 deployment orchestrator.

**Acceptance criteria**:
- [ ] Returns ordered array, not a single concatenated string
- [ ] Each element has `order`, `kind`, `yaml` properties
- [ ] `waitFor: 'zk-quorum'` tag on StatefulSet element (Phase 3 uses this)
- [ ] Total YAML count: 2 SC + 3 PVC + 1 SA + 2–3 Secrets + 6 CM + 7 Svc + 1 SS + 4 Deploy = **26–27 resources**

---

## Files Created

| File | Purpose |
|------|---------|
| `backend/src/services/zlManifestTemplates.js` | ZL-specific template class (~500–700 lines) |

## Files Modified

| File | Change |
|------|--------|
| `backend/src/services/index.js` | Export `zlManifestTemplates` from barrel |

---

## Validation Strategy

For each template function, compare generated YAML against the DG03 reference YAML using a diff tool. Create a validation script:

```bash
# Generate manifests with DG03-equivalent config
node scripts/validate-zl-manifests.js --config=dg03-reference-config.json --output=generated/

# Diff against manual reference
diff -r generated/ manualprocess/DG03/aws/ --ignore-blank-lines
```

Expected diffs should be **only**:
1. Label additions (`zlaws.io/managed-by`)
2. Removed orphan resources
3. Formatting/ordering differences in YAML

---

## DG Coverage Impact

| Phase | Before | After |
|-------|:------:|:-----:|
| Phase 7 (ZooKeeper) | 15% | **90%** |
| Phase 8 (App Deployment) | 10% | **85%** |
| Phase 9 (Network/Ingress) | 15% | **40%** (services only; ALB in Phase 5) |
| **Weighted Average** | 52% | **~68%** |
