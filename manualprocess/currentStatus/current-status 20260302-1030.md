# ZipLip AWS Deployment — Current Status

**Date:** March 2, 2026 10:30 AM  
**Author:** Deployment Team  
**Status:** ✅ OPERATIONAL  
**Application URL:** https://zlpsaws.zlpsonline.com

---

## 1. AWS Account & Identity

| Item | Value |
|---|---|
| AWS Account ID | `995553364920` |
| IAM User | `zlpsmsa` |
| IAM ARN | `arn:aws:iam::995553364920:user/zlpsmsa` |
| Region | `us-east-1` |

---

## 2. EKS Cluster

| Item | Value |
|---|---|
| Cluster Name | `use1-zlps-eks-01` |
| Kubernetes Version | `1.34` |
| Platform Version | `eks.13` |
| Status | `ACTIVE` |
| API Endpoint | `https://031538AECE39BD60168E0E4D8162FF00.gr7.us-east-1.eks.amazonaws.com` |

### Node Group

| Item | Value |
|---|---|
| Name | `ue1-zlps-ng-01` |
| Instance Type | `m5.xlarge` |
| AMI | `AL2023_x86_64_STANDARD` |
| Desired / Min / Max | 2 / 1 / 2 |
| Container Runtime | `containerd://2.1.5` |
| Kernel | `6.12.58-82.121.amzn2023.x86_64` |
| Node Age | 76 days |

### Nodes

| Node | Internal IP | External IP | Status |
|---|---|---|---|
| `ip-192-168-48-88.ec2.internal` | 192.168.48.88 | 54.235.16.217 | Ready |
| `ip-192-168-6-31.ec2.internal` | 192.168.6.31 | 54.166.218.95 | Ready |

---

## 3. Container Images (ECR)

**Registry:** `995553364920.dkr.ecr.us-east-1.amazonaws.com/ue1-zlps-ecr-01`

| Image Tag | Used By |
|---|---|
| `zlserver-k8s-20251222` | zlui, zlserver, zlsearch deployments |
| `zltika11.1.0-b1140` | zltika deployment |
| `zlzookeeper11.1.0-b1140` | zlzookeeper statefulset |
| `zlserver11.1.0-b1140` | _(available, not actively deployed)_ |
| `zltika-k8s-20251222` | _(available, not actively deployed)_ |
| `zlzookeeper-k8s-20251222` | _(available, not actively deployed)_ |

---

## 4. Running Workloads

### Pods (all Running ✅)

| Pod | App | Age | Node | IP |
|---|---|---|---|---|
| `zlui-75f456b9f8-62cfh` | zlui | 4d19h | ip-192-168-6-31 | 192.168.0.104 |
| `zlserver-79d57fc9c6-q8n76` | zlserver | 5d16h | ip-192-168-48-88 | 192.168.38.173 |
| `zlsearch-577bf4db9b-r95gs` | zlsearch | 5d16h | ip-192-168-48-88 | 192.168.43.152 |
| `zltika-69f8c5567d-t9hdb` | zltika | 5d16h | ip-192-168-6-31 | 192.168.16.215 |
| `zlzookeeper-0` | zlzookeeper | 69d | ip-192-168-48-88 | 192.168.40.197 |
| `zlzookeeper-1` | zlzookeeper | 69d | ip-192-168-6-31 | 192.168.8.167 |
| `zlzookeeper-2` | zlzookeeper | 69d | ip-192-168-6-31 | 192.168.15.88 |

### Deployments (all 1/1 ✅)

| Deployment | Replicas | Image Tag | Strategy |
|---|---|---|---|
| `zlui` | 1/1 | `zlserver-k8s-20251222` | Recreate |
| `zlserver` | 1/1 | `zlserver-k8s-20251222` | Recreate |
| `zlsearch` | 1/1 | `zlserver-k8s-20251222` | Recreate |
| `zltika` | 1/1 | `zltika11.1.0-b1140` | Recreate |

### StatefulSet

| StatefulSet | Replicas | Image Tag |
|---|---|---|
| `zlzookeeper` | 3/3 | `zlzookeeper11.1.0-b1140` |

---

## 5. Services & Networking

### Services

| Service | Type | Cluster IP | External Endpoint | Ports |
|---|---|---|---|---|
| `zlui-service` | LoadBalancer | 10.100.192.68 | `ac166d88759e1439f96e3ae0fe11dc55-2121894636.us-east-1.elb.amazonaws.com` | 80, 443 → 80 |
| `zlui` | LoadBalancer | 10.100.53.30 | `a6af2c39cd6784a4ebe0cb94176f6bc5-748792917.us-east-1.elb.amazonaws.com` | 8081, 8000, 9975, 9970 |
| `zlsearch-internal-lb` | LoadBalancer | 10.100.254.133 | `a42cbe519bb804638be6b2b647d4972e-ef8110c9c9910e79.elb.us-east-1.amazonaws.com` | 8080 |
| `zlserver-service` | ClusterIP | 10.100.149.10 | — | 8080 |
| `zlsearch-service` | ClusterIP | 10.100.82.195 | — | 8080 |
| `zlsearch` | ClusterIP | 10.100.57.122 | — | 80 |
| `zltika-service` | ClusterIP | 10.100.161.9 | — | 9972 |
| `zltika` | ClusterIP | 10.100.68.188 | — | 9972 |
| `zk-hs` | ClusterIP (Headless) | None | — | 2181, 2888, 3888 |
| `zk-cs` | ClusterIP | 10.100.94.28 | — | 2181 |

### DNS / Application Access

| Item | Value |
|---|---|
| Application URL | `https://zlpsaws.zlpsonline.com` |
| DNS CNAME Target | `ac166d88759e1439f96e3ae0fe11dc55-2121894636.us-east-1.elb.amazonaws.com` |
| SSL Termination | At the Load Balancer (`zlui-service`, port 443) |

### Ingress

| Name | Class | Hosts | Status |
|---|---|---|---|
| `zlui-ingress` | alb | * | No external address assigned (not actively used) |

---

## 6. Storage

### Storage Classes

| Name | Provisioner | Reclaim | Binding | Default |
|---|---|---|---|---|
| `ebs-sc` | `ebs.csi.aws.com` | Delete | WaitForFirstConsumer | ✅ Yes |
| `efs-sc` | `efs.csi.aws.com` | Retain | Immediate | No |
| `gp2` | `kubernetes.io/aws-ebs` | Delete | WaitForFirstConsumer | No |

### PersistentVolumeClaims (all Bound ✅)

| PVC | Capacity | Access | Storage Class | Used By |
|---|---|---|---|---|
| `zluilogs-efs` | 10Gi | RWX | efs-sc | zlui (logs) |
| `zlvault-efs` | 10Gi | RWX | efs-sc | zlui (vault) |
| `zlserverlogs-efs` | 10Gi | RWX | efs-sc | zlserver (logs) |
| `zlservertemp-efs` | 10Gi | RWX | efs-sc | zlserver (temp) |
| `zltikatemp-efs` | 10Gi | RWX | efs-sc | zltika (temp) |
| `zlzkdata-zlzookeeper-0` | 10Gi | RWO | ebs-sc | zlzookeeper-0 |
| `zlzkdata-zlzookeeper-1` | 10Gi | RWO | ebs-sc | zlzookeeper-1 |
| `zlzkdata-zlzookeeper-2` | 10Gi | RWO | ebs-sc | zlzookeeper-2 |

### EFS File System

| Item | Value |
|---|---|
| Name | `use1-zlps-efs-01` |
| ID | `fs-0a2b69e49fe46c1f6` |
| Size | ~62 GB |
| State | available |

---

## 7. Database (RDS)

| Item | Value |
|---|---|
| Instance ID | `use1-zlps-msexpsql-01-eks` |
| Engine | SQL Server Express |
| Instance Class | `db.t3.small` |
| Storage | 20 GB |
| Endpoint | `use1-zlps-msexpsql-01-eks.cqhaqqqiwngv.us-east-1.rds.amazonaws.com` |
| Port | 1433 |
| Database Name | `zldb` |
| Database User | `pfuser` |
| Status | available |

---

## 8. ConfigMaps

| ConfigMap | Keys | Purpose |
|---|---|---|
| `zlapp-config` | `ZLApp.cfg` | Application startup config (site name, thread pools, memory, logging) |
| `db-config` | `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_TYPE` | Database connection parameters |
| `zkclient-config` | `tc.cfg`, `tcdb.cfg`, `zkClient.cfg`, `zkQuorum.cfg` | ZooKeeper client & cluster topology |
| `zk-config` | _(2 keys)_ | ZooKeeper server configuration |
| `pmappurl-config` | `pmappURL.cfg` | **URL routing & SSL config** — sets `web.server.URL = zlpsaws.zlpsonline.com`, `HAS_SSL = true`, `selfLocation = true` |
| `tomcat-server-config` | `server.xml` | **Tomcat proxy config** — sets `proxyName="zlpsaws.zlpsonline.com"`, `proxyPort="443"`, `scheme="https"`, `secure="true"` |
| `zlui-nginx-config` | _(1 key)_ | Nginx config (for zlui-service SSL) |

### Secrets

| Secret | Type | Purpose |
|---|---|---|
| `db-secret` | Opaque | Database password (`DB_PASSWORD`) |
| `docker-secret` | dockerconfigjson | ECR pull credentials |
| `zlui-ssl-cert` | kubernetes.io/tls | TLS certificate for zlui-service |

---

## 9. Critical Fix Applied (Feb 25, 2026)

### Problem
Accessing the app via `https://zlpsaws.zlpsonline.com` resulted in:
- **404** with URL path containing literal `null`: `/ps/app/null/PmApp/zlp_dummy`
- After initial fix attempt with `selfLocation=false`: **500 Internal Server Error** on `home.jsp`

### Root Cause
1. `JspUtil.selfLocation = true` auto-detects hostname from `HttpServletRequest.getServerName()`
2. Behind an AWS Classic Load Balancer (Layer 4/TCP), Tomcat's default Connector does not know the proxy hostname
3. `request.getServerName()` returned `null` → URL became `/ps/app/null/PmApp/...`
4. Setting `selfLocation=false` triggered an unsupported code path in this app version → 500 error

### Solution (Permanent)
Two ConfigMaps mounted into the zlui pod via `subPath`:

1. **`tomcat-server-config`** → `/usr/local/tomcat/conf/server.xml`
   - Added `proxyName="zlpsaws.zlpsonline.com"`, `proxyPort="443"`, `scheme="https"`, `secure="true"` to the Connector
   - Makes `request.getServerName()` return the correct domain

2. **`pmappurl-config`** → `/opt/ZipLip/config/pmappURL.cfg`
   - `selfLocation = true` (uses the well-tested auto-detection path)
   - `web.server.URL = zlpsaws.zlpsonline.com` (fallback)
   - `HAS_SSL = true`

### Why It Survives
- ConfigMaps persist in etcd, independent of pod lifecycle
- `subPath` mounts override image-baked files on every pod start
- Deployment YAML (`zlui-deployment-fixed.yaml`) includes the mounts

---

## 10. Deployment YAML Inventory

**Directory:** `DG03/aws/`

### Apply Order for Full Deployment

```
# 1. Storage
kubectl apply -f storage-classes.yaml
kubectl apply -f pvc.yaml

# 2. Secrets & ConfigMaps
kubectl apply -f db-secret.yaml
kubectl apply -f db-config.yaml
kubectl apply -f zlapp-config.yaml
kubectl apply -f zkclient-config.yaml
kubectl apply -f zk-config.yaml
kubectl apply -f pmappurl-config.yaml
kubectl apply -f tomcat-server-config.yaml
kubectl apply -f docconvert-config.yaml

# 3. Services
kubectl apply -f services.yaml

# 4. ZooKeeper (must be running before app pods)
kubectl apply -f zlzookeeper-statefulset.yaml
# Wait for all 3 ZK pods to be Ready:
kubectl rollout status statefulset/zlzookeeper --timeout=300s

# 5. Application Deployments
kubectl apply -f zltika-deployment.yaml
kubectl apply -f zlserver-deployment.yaml
kubectl apply -f zlsearch-deployment.yaml
kubectl apply -f zlui-deployment-fixed.yaml    # ⚠️ USE THIS, NOT the -DO-NOT-USE version
```

### File Reference (with Created/Modified Dates)

All files are located in `DG03/aws/`. Dates shown as `YYYY-MM-DD HH:MM`.

| File | Size | Created | Modified | Resource | Notes |
|---|---:|---|---|---|---|
| `db-config.yaml` | 696 | 2025-12-22 16:42 | 2025-12-22 16:42 | ConfigMap/db-config | DB_HOST, DB_PORT, DB_NAME, DB_USER |
| `db-secret.yaml` | 540 | 2025-12-22 16:43 | 2025-12-22 16:43 | Secret/db-secret | DB password (base64 encoded) |
| `docconvert-config.yaml` | 5,900 | 2025-12-22 16:42 | 2025-12-22 16:42 | ConfigMap | Document conversion settings |
| `pmappurl-config.yaml` | 2,090 | 2026-02-25 15:04 | 2026-02-25 15:24 | ConfigMap/pmappurl-config | **URL routing** (domain, SSL, selfLocation) |
| `pvc.yaml` | 8,442 | 2025-12-22 12:26 | 2025-12-22 16:42 | PVCs (8 total) | EFS + EBS persistent volumes |
| `services.yaml` | 10,561 | 2025-12-22 12:26 | 2025-12-22 16:42 | Services (all) | ClusterIP + LoadBalancer services |
| `storage-classes.yaml` | 2,339 | 2025-12-22 12:26 | 2025-12-22 16:42 | StorageClass (ebs-sc, efs-sc) | EBS for ZK, EFS for app logs/temp |
| `tomcat-server-config.yaml` | 2,509 | 2026-02-25 15:23 | 2026-02-25 15:24 | ConfigMap/tomcat-server-config | **Tomcat server.xml** (proxyName, proxyPort, scheme) |
| `zk-config.yaml` | 4,187 | 2025-12-22 16:42 | 2025-12-22 16:42 | ConfigMap/zk-config | ZK server config |
| `zkclient-config.yaml` | 5,773 | 2025-12-20 21:22 | 2025-12-22 16:42 | ConfigMap/zkclient-config | ZK client config (tc.cfg, tcdb.cfg, zkClient.cfg, zkQuorum.cfg) |
| `zlapp-config.yaml` | 1,981 | 2025-12-20 21:21 | 2025-12-22 16:42 | ConfigMap/zlapp-config | ZLApp.cfg (site, threading, memory) |
| `zlsearch-deployment.yaml` | 5,682 | 2025-12-22 12:26 | 2025-12-22 16:42 | Deployment/zlsearch | ZL search server |
| `zlserver-deployment.yaml` | 5,598 | 2025-12-20 21:22 | 2025-12-22 16:42 | Deployment/zlserver | Main ZL processing server |
| `zltika-deployment.yaml` | 3,507 | 2025-12-20 21:22 | 2025-12-22 16:42 | Deployment/zltika | Tika doc conversion service |
| `zlui-deployment-fixed.yaml` | 3,217 | 2026-02-25 15:05 | 2026-02-25 15:24 | Deployment/zlui | **UI server** — includes pmappurl-config + tomcat-server-config mounts |
| `zlzookeeper-statefulset.yaml` | 5,994 | 2025-12-20 21:22 | 2025-12-22 16:42 | StatefulSet/zlzookeeper | 3-replica ZK ensemble with EBS volumes |
| ~~`zlui-deployment-DO-NOT-USE.yaml`~~ | 5,428 | 2025-12-22 12:26 | 2025-12-22 16:42 | ~~Deployment/zlui~~ | ❌ **DEPRECATED** — missing ConfigMap mounts, causes null redirect |

### File Timeline Summary

| Phase | Date | Files |
|---|---|---|
| **Initial Build** | 2025-12-20 to 2025-12-22 | 14 files — full infrastructure, configs, and deployments |
| **URL Fix (CR-001)** | 2026-02-25 | 3 files — `pmappurl-config.yaml`, `tomcat-server-config.yaml`, `zlui-deployment-fixed.yaml` |

---

## 11. Key Configuration Inside Pods

### zlui Pod Volume Mounts

| Mount Path | Source | Type |
|---|---|---|
| `/opt/ZipLip/zlserver/WEB-INF/tmp` | `zltikatemp` (emptyDir) | Temp storage |
| `/opt/ZipLip/logs` | `zluilogs-efs` (EFS PVC) | Persistent logs |
| `/var/opt/zlvault` | `zlvault-efs` (EFS PVC) | Vault data |
| `/opt/ZipLip/bin/zk/tcdb.cfg` | `zkclient-config` (subPath) | DB connection for ZK |
| `/opt/ZipLip/ZLZooKeeper/config/zkQuorum.cfg` | `zkclient-config` (subPath) | ZK quorum topology |
| `/opt/ZipLip/config/pmappURL.cfg` | `pmappurl-config` (subPath) | URL routing config |
| `/usr/local/tomcat/conf/server.xml` | `tomcat-server-config` (subPath) | Tomcat proxy settings |

### Application Stack

| Component | Version |
|---|---|
| Apache Tomcat | 9.0.76 |
| Java | OpenJDK 21.0.7+6 (Ubuntu) |
| OS (container) | Ubuntu (Linux) |
| Context Path | `/ps` (via `/usr/local/tomcat/conf/Catalina/localhost/ps.xml`) |
| App Root | `/opt/ZipLip/zlserver` |

---

## 12. Environment Variables (zlui Pod)

| Variable | Value | Source |
|---|---|---|
| `CLUSTER_NAME` | `UI` | Deployment spec |
| `INITIAL_EXECUTORS` | `5` | Deployment spec |
| `SERVICE_EXECUTORS` | `5` | Deployment spec |
| `MANAGED_EXECUTORS` | `5` | Deployment spec |
| `JAVA_HOME` | `/usr/lib/jvm/java-21-openjdk-amd64` | Deployment spec |
| `TIKA_HOST` | `zltika-service` | Deployment spec |
| `KAFKA_OPTS` | `-Djava.security.auth.login.config=...zookeeper_jaas.conf` | Deployment spec |
| `DB_HOST` | `use1-zlps-msexpsql-01-eks.cqhaqqqiwngv...` | ConfigMap/db-config |
| `DB_PORT` | `1433` | ConfigMap/db-config |
| `DB_NAME` | `zldb` | ConfigMap/db-config |
| `DB_USER` | `pfuser` | ConfigMap/db-config |
| `DB_PASSWORD` | _(secret)_ | Secret/db-secret |

---

## 13. Prerequisites for Repeatable Deployment

### Before Applying YAMLs

1. **AWS CLI** configured with `zlpsmsa` credentials (`aws configure`)
2. **kubectl** configured for the cluster:
   ```
   aws eks update-kubeconfig --name use1-zlps-eks-01 --region us-east-1
   ```
3. **ECR login** (for image pulls):
   ```
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 995553364920.dkr.ecr.us-east-1.amazonaws.com
   ```
4. **docker-secret** must exist for pod image pulls:
   ```
   kubectl create secret docker-registry docker-secret \
     --docker-server=995553364920.dkr.ecr.us-east-1.amazonaws.com \
     --docker-username=AWS \
     --docker-password=$(aws ecr get-login-password --region us-east-1)
   ```
5. **EFS CSI driver** and **EBS CSI driver** installed in the cluster
6. **Service Account** `zlapp-sa` must exist
7. **DNS** CNAME `zlpsaws.zlpsonline.com` → zlui-service LB hostname
8. **TLS certificate** loaded as `zlui-ssl-cert` secret

### If Changing the Domain

Update **two** ConfigMaps:
1. `pmappurl-config.yaml` → change `web.server.URL = <new-domain>`
2. `tomcat-server-config.yaml` → change `proxyName="<new-domain>"`

Then re-apply both and restart zlui:
```
kubectl apply -f pmappurl-config.yaml
kubectl apply -f tomcat-server-config.yaml
kubectl rollout restart deployment/zlui
```

---

## 14. Verification Checklist

After deployment, verify:

- [ ] All 7 pods in `Running` state: `kubectl get pods`
- [ ] ZooKeeper quorum healthy: `kubectl exec zlzookeeper-0 -- bash -c "echo ruok | nc localhost 2181"` → `imok`
- [ ] Access `https://zlpsaws.zlpsonline.com` — login page loads (no `null` in URL, no 500 error)
- [ ] Check zlui ConfigDebug.out: `web.server.URL` expanded to `zlpsaws.zlpsonline.com`
- [ ] Check zlui access log: `home.jsp` returns 200 (not 404/500)
- [ ] Check Tomcat Connector: `proxyName` shows `zlpsaws.zlpsonline.com` in catalina log
