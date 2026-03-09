# ZL Application AWS EKS Deployment Plan
## Version: 20251222

---

## 🔴 IMAGE CHANGES (CRITICAL)

The following images have been updated with Kubernetes-specific optimizations:

| Component | Old Image | New Image | Changes Made |
|-----------|-----------|-----------|--------------|
| **ZLServer** | `zlserver:20251219` | `zlserver:k8s-20251222` | Java 21 pre-installed, K8s startup script with TIKA_HOST templating |
| **ZLTika** | `zltika:20251219` | `zltika:k8s-20251222` | Added nc/curl for health checks, preserves original `./zltikadiag.sh` entrypoint |
| **ZLZooKeeper** | `zlzookeeper:20251219` | `zlzookeeper:k8s-20251222` | Added netcat, auto-creates myid from StatefulSet hostname |

### Image Changes Summary

#### zlserver:k8s-20251222
- **Base**: Debian-based `zlserver:20251219`
- **Additions**: 
  - Java 21 OpenJDK pre-installed (`/usr/lib/jvm/java-21-openjdk-amd64`)
  - Custom startup script `/opt/ZipLip/ZLServer/bin/zlserver-startup-k8s.sh`
  - netcat, dnsutils, curl for networking/health checks
- **Startup Changes**:
  - Replaces `TIKA_HOST` placeholder in DocumentConversion.xml with actual Tika service hostname
  - Skips ZOO_SERVERS environment variable (K8s handles DNS resolution)
  - Calls original `/opt/ZipLip/ZLServer/bin/zlserver-startup.sh`

#### zltika:k8s-20251222
- **Base**: CentOS 7-based `zltika:20251219`
- **Additions**: nc, curl for health checks
- **Entrypoint**: Preserved original `./zltikadiag.sh` (CRITICAL - do not change)

#### zlzookeeper:k8s-20251222
- **Base**: Alpine-based `zlzookeeper:20251219`
- **Additions**: netcat-openbsd for health checks
- **Startup Changes**:
  - Custom script creates `/var/lib/zookeeper/data/myid` from StatefulSet hostname
  - Extracts ordinal from hostname (e.g., `zlzookeeper-0` → myid=1)
  - Calls original `/opt/ZipLip/ZLZooKeeper/bin/zlzookeeper-startup.sh`

---

## Prerequisites

### 1. AWS EKS Cluster
- EKS cluster running Kubernetes 1.28+
- kubectl configured with cluster access
- AWS CLI configured with appropriate IAM permissions

### 2. Container Registry (ECR)
```
ECR Repository: 995553364920.dkr.ecr.us-east-1.amazonaws.com/ue1-zlps-ecr-01
```

### 3. Required CSI Drivers
- **AWS EFS CSI Driver** - For shared storage (ReadWriteMany)
- **AWS EBS CSI Driver** - For ZooKeeper block storage (ReadWriteOnce)

### 4. Database
- SQL Server instance accessible from EKS cluster
- Database `ZLDB` created with `pfuser` credentials
- Network connectivity between EKS nodes and database

### 5. EFS Filesystem
- Create EFS filesystem in the same VPC as EKS
- Configure security groups to allow NFS traffic from EKS nodes
- Note the filesystem ID (e.g., `fs-0123456789abcdef0`)

---

## Deployment Files

| File | Purpose |
|------|---------|
| `namespace.yaml` | Optional dedicated namespace |
| `storage-classes.yaml` | EFS and EBS storage class definitions |
| `pvc.yaml` | Persistent volume claims (vault, logs, temp) |
| `zkclient-config.yaml` | ZooKeeper client configuration (includes tcdb.cfg with TrustServerCertificate=true) |
| `docconvert-config.yaml` | Tika/document conversion settings |
| `zlapp-config.yaml` | Application configuration |
| `db-config.yaml` | Database connection config and secrets |
| `services.yaml` | All service definitions (zk-hs, zk-cs, zltika, zlui, zlsearch, zlserver) |
| `zlzookeeper-statefulset.yaml` | ZooKeeper 3-node StatefulSet |
| `zltika-deployment.yaml` | Tika server deployment |
| `zlserver-deployment.yaml` | Main ZLServer (CLUSTER_NAME=MP) |
| `zlui-deployment.yaml` | UI server (CLUSTER_NAME=UI) |
| `zlsearch-deployment.yaml` | Search server (CLUSTER_NAME=SEARCH) |

---

## Deployment Steps

### Step 1: Push Images to ECR

```powershell
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 995553364920.dkr.ecr.us-east-1.amazonaws.com

# Tag images
docker tag zlserver:k8s-20251222 995553364920.dkr.ecr.us-east-1.amazonaws.com/ue1-zlps-ecr-01:zlserver-k8s-20251222
docker tag zltika:k8s-20251222 995553364920.dkr.ecr.us-east-1.amazonaws.com/ue1-zlps-ecr-01:zltika-k8s-20251222
docker tag zlzookeeper:k8s-20251222 995553364920.dkr.ecr.us-east-1.amazonaws.com/ue1-zlps-ecr-01:zlzookeeper-k8s-20251222

# Push images
docker push 995553364920.dkr.ecr.us-east-1.amazonaws.com/ue1-zlps-ecr-01:zlserver-k8s-20251222
docker push 995553364920.dkr.ecr.us-east-1.amazonaws.com/ue1-zlps-ecr-01:zltika-k8s-20251222
docker push 995553364920.dkr.ecr.us-east-1.amazonaws.com/ue1-zlps-ecr-01:zlzookeeper-k8s-20251222
```

### Step 2: Update EFS Filesystem ID

Edit `storage-classes.yaml` and replace `fs-XXXXXXXXX` with your actual EFS filesystem ID:

```yaml
parameters:
  fileSystemId: fs-0123456789abcdef0  # Your EFS ID
```

### Step 3: Update Image References in Deployments

Replace local image references with ECR URLs in all deployment files:

| File | Change From | Change To |
|------|-------------|-----------|
| `zlserver-deployment.yaml` | `zlserver:k8s-20251222` | `995553364920.dkr.ecr.us-east-1.amazonaws.com/ue1-zlps-ecr-01:zlserver-k8s-20251222` |
| `zlui-deployment.yaml` | `zlserver:k8s-20251222` | `995553364920.dkr.ecr.us-east-1.amazonaws.com/ue1-zlps-ecr-01:zlserver-k8s-20251222` |
| `zlsearch-deployment.yaml` | `zlserver:k8s-20251222` | `995553364920.dkr.ecr.us-east-1.amazonaws.com/ue1-zlps-ecr-01:zlserver-k8s-20251222` |
| `zltika-deployment.yaml` | `zltika:k8s-20251222` | `995553364920.dkr.ecr.us-east-1.amazonaws.com/ue1-zlps-ecr-01:zltika-k8s-20251222` |
| `zlzookeeper-statefulset.yaml` | `zlzookeeper:k8s-20251222` | `995553364920.dkr.ecr.us-east-1.amazonaws.com/ue1-zlps-ecr-01:zlzookeeper-k8s-20251222` |

### Step 4: Deploy in Order

```powershell
cd deployAWS20251222/yaml

# 1. Create namespace (optional)
kubectl apply -f namespace.yaml

# 2. Create storage classes
kubectl apply -f storage-classes.yaml

# 3. Create PVCs
kubectl apply -f pvc.yaml

# 4. Create ConfigMaps
kubectl apply -f zkclient-config.yaml
kubectl apply -f docconvert-config.yaml
kubectl apply -f zlapp-config.yaml
kubectl apply -f db-config.yaml

# 5. Create Services
kubectl apply -f services.yaml

# 6. Deploy ZooKeeper (wait for quorum)
kubectl apply -f zlzookeeper-statefulset.yaml
kubectl rollout status statefulset/zlzookeeper --timeout=300s

# 7. Initialize ZooKeeper (run zkutil -w on one of the ZK pods)
kubectl exec -it zlzookeeper-0 -- /opt/ZipLip/ZLZooKeeper/bin/zkutil -w

# 8. Deploy Tika
kubectl apply -f zltika-deployment.yaml
kubectl rollout status deployment/zltika --timeout=120s

# 9. Deploy ZLServer (main processing)
kubectl apply -f zlserver-deployment.yaml
kubectl rollout status deployment/zlserver --timeout=300s

# 10. Deploy ZLUI
kubectl apply -f zlui-deployment.yaml
kubectl rollout status deployment/zlui --timeout=300s

# 11. Deploy ZLSearch
kubectl apply -f zlsearch-deployment.yaml
kubectl rollout status deployment/zlsearch --timeout=300s
```

### Step 5: Create Vault Folder Structure

The vault mount point `/var/opt/zlvault/ZLVault/` must contain the following folder structure (matching DiskVolume table):

```powershell
# Execute on any pod with vault mount, or pre-create on EFS
kubectl exec -it zlserver-<pod-name> -- bash -c "
mkdir -p /var/opt/zlvault/ZLVault/{1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32}
"
```

---

## Verification Steps

### 1. Check All Pods Running

```powershell
kubectl get pods -o wide
```

Expected output:
```
NAME                        READY   STATUS    RESTARTS   AGE
zlzookeeper-0               1/1     Running   0          5m
zlzookeeper-1               1/1     Running   0          4m
zlzookeeper-2               1/1     Running   0          3m
zltika-xxxxxxxxx-xxxxx      1/1     Running   0          3m
zlserver-xxxxxxxxx-xxxxx    1/1     Running   0          2m
zlui-xxxxxxxxx-xxxxx        1/1     Running   0          1m
zlsearch-xxxxxxxxx-xxxxx    1/1     Running   0          1m
```

### 2. Verify ZooKeeper Quorum

```powershell
kubectl exec -it zlzookeeper-0 -- /opt/ZipLip/ZLZooKeeper/bin/zkutil -s
```

### 3. Verify Server Initialization

Check logs for "Done initalizing ZLServer" message:

```powershell
# Check zlserver
kubectl logs deployment/zlserver | Select-String "Done initalizing"

# Check zlui
kubectl logs deployment/zlui | Select-String "Done initalizing"

# Check zlsearch
kubectl logs deployment/zlsearch | Select-String "Done initalizing"
```

### 4. Verify CLUSTER_NAME Settings

```powershell
# Should show: CLUSTER_NAME=MP
kubectl exec -it deployment/zlserver -- printenv | Select-String "CLUSTER_NAME"

# Should show: CLUSTER_NAME=UI
kubectl exec -it deployment/zlui -- printenv | Select-String "CLUSTER_NAME"

# Should show: CLUSTER_NAME=SEARCH
kubectl exec -it deployment/zlsearch -- printenv | Select-String "CLUSTER_NAME"
```

### 5. Verify Vault Mount

```powershell
kubectl exec -it deployment/zlserver -- ls -la /var/opt/zlvault/ZLVault/
```

Should show folders 1-32.

### 6. Access UI

```powershell
# Get LoadBalancer URL
kubectl get svc zlui-service
```

Access the URL shown in EXTERNAL-IP column.

---

## Key Configuration Details

### CLUSTER_NAME Settings
| Pod | CLUSTER_NAME | Purpose |
|-----|--------------|---------|
| zlserver | MP | Main Processing server |
| zlui | UI | User Interface server |
| zlsearch | SEARCH | Search service |

### Java Configuration
- **Version**: Java 21
- **JAVA_HOME**: `/usr/lib/jvm/java-21-openjdk-amd64`

### Database Connection
- **JDBC URL**: `jdbc:sqlserver://mssql-service:1433;TrustServerCertificate=true`
- **Database**: ZLDB
- **User**: pfuser

### Vault Mount Path
- **Container Path**: `/var/opt/zlvault/ZLVault/`
- **Folder Structure**: 1-32 (matches DiskVolume table)
- **Access Mode**: ReadWriteMany (RWX) - shared across all server pods

### Tika Configuration
- **Service**: `zltika-service:9998`
- **TIKA_HOST**: Replaced at runtime by `zlserver-startup-k8s.sh`

---

## Troubleshooting

### Pod Won't Start - ImagePullBackOff
```powershell
# Check ECR login
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 995553364920.dkr.ecr.us-east-1.amazonaws.com

# Verify image exists
aws ecr describe-images --repository-name ue1-zlps-ecr-01 --image-ids imageTag=zlserver-k8s-20251222
```

### ZooKeeper Not Forming Quorum
```powershell
# Check myid files
kubectl exec zlzookeeper-0 -- cat /var/lib/zookeeper/data/myid
kubectl exec zlzookeeper-1 -- cat /var/lib/zookeeper/data/myid
kubectl exec zlzookeeper-2 -- cat /var/lib/zookeeper/data/myid

# Check DNS resolution
kubectl exec zlzookeeper-0 -- nslookup zlzookeeper-1.zk-hs.default.svc.cluster.local
```

### Server Not Initializing
```powershell
# Check full logs
kubectl logs deployment/zlserver --tail=200

# Common issues:
# - Database connectivity (check TrustServerCertificate in tcdb.cfg)
# - ZooKeeper not ready (wait for quorum)
# - Missing vault folders (create 1-32 structure)
```

### EFS Volume Not Mounting
```powershell
# Check PVC status
kubectl get pvc

# Check EFS CSI driver
kubectl get pods -n kube-system | Select-String efs

# Check storage class
kubectl describe sc efs-sc
```

---

## Rollback Procedure

If issues occur, rollback to previous images:

```powershell
# Update deployments to use original images
kubectl set image deployment/zlserver zlserver=zlserver:20251219
kubectl set image deployment/zlui zlui=zlserver:20251219
kubectl set image deployment/zlsearch zlsearch=zlserver:20251219
kubectl set image deployment/zltika zltika=zltika:20251219
kubectl set image statefulset/zlzookeeper zlzookeeper=zlzookeeper:20251219
```

---

## Files Changed Summary

| Category | Files |
|----------|-------|
| **Deployments** | `zlserver-deployment.yaml`, `zlui-deployment.yaml`, `zlsearch-deployment.yaml`, `zltika-deployment.yaml` |
| **StatefulSets** | `zlzookeeper-statefulset.yaml` |
| **Services** | `services.yaml` |
| **ConfigMaps** | `zkclient-config.yaml`, `docconvert-config.yaml`, `zlapp-config.yaml`, `db-config.yaml` |
| **Storage** | `storage-classes.yaml`, `pvc.yaml` |
| **Other** | `namespace.yaml` |

---

## Contact

For issues with this deployment, refer to:
- AWS EKS Documentation: https://docs.aws.amazon.com/eks/
- AWS EFS CSI Driver: https://docs.aws.amazon.com/eks/latest/userguide/efs-csi.html
- AWS EBS CSI Driver: https://docs.aws.amazon.com/eks/latest/userguide/ebs-csi.html
