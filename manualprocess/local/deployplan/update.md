# ZL Application Local Deployment Guide (Minikube)

**Last Updated:** December 21, 2025  
**Status:** ✅ Successfully Deployed and Verified

---

## Prerequisites

### 1. Minikube Running
```powershell
minikube status
# If not running:
minikube start --memory=8192 --cpus=4
```

### 2. Docker Images Loaded in Minikube
Ensure these images are available locally in minikube:
```powershell
minikube image ls | Select-String "zl"
```

Required images:
- `zlserver:zlserver11.1.0-b1140` (or ECR tag `zlserver20251219`)
- `zlui:zlui11.1.0-b1140` (or ECR tag `zlui20251219`)
- `zlzookeeper:zlzookeeper11.1.0-b1140` (or ECR tag `zlzookeeper20251219`)
- `zltika:zltika11.1.0-b1140`

If missing, load from ECR or local Docker:
```powershell
# Set minikube docker env
& minikube docker-env | Invoke-Expression

# Pull from ECR (if authenticated) or tag local images
docker pull 995553364920.dkr.ecr.us-east-1.amazonaws.com/ue1-zlps-ecr-01:zlserver20251219
# Or use local images:
minikube image load zlserver:zlserver11.1.0-b1140
```

---

## Deployment Order (Critical!)

Deploy in this **exact order** to ensure dependencies are met:

1. **Database (MSSQL)**
2. **PersistentVolumeClaims**
3. **ConfigMaps**
4. **Secrets**
5. **ZooKeeper StatefulSet + Services**
6. **ZLTika Deployment + Service**
7. **ZLServer Deployment**
8. **ZLUI Deployment + Service**

---

## Step 1: Database Setup

### 1.1 Deploy MSSQL Express
```powershell
kubectl apply -f local/yaml/mssql-deployment.yaml
kubectl apply -f local/yaml/mssql-service.yaml
kubectl rollout status deployment/mssql-express --timeout=120s
```

### 1.2 Create Database and User
```powershell
# Connect to MSSQL
kubectl exec -it deployment/mssql-express -- /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P 'YourStrong!Passw0rd' -C

# Run SQL:
CREATE DATABASE ZLDB;
GO
USE ZLDB;
GO
CREATE LOGIN pfuser WITH PASSWORD = 'Passw0rd2024';
CREATE USER pfuser FOR LOGIN pfuser;
CREATE SCHEMA pfuser AUTHORIZATION pfuser;
ALTER USER pfuser WITH DEFAULT_SCHEMA = pfuser;
EXEC sp_addrolemember 'db_owner', 'pfuser';
GO
```

### 1.3 Run Schema Scripts
Run the database setup scripts from `zldbcreate/` directory to create tables and sequences.

---

## Step 2: Create PersistentVolumeClaims

**Critical:** PVC names must end with `-pvc` suffix (not `-efs`):

```powershell
kubectl apply -f local/yaml/zlservertemp-pvc.yaml
kubectl apply -f local/yaml/zlserverlogs-pvc.yaml
kubectl apply -f local/yaml/zlvault-pvc.yaml
kubectl apply -f local/yaml/zltikatemp-pvc.yaml
kubectl apply -f local/yaml/zluilogs-pvc.yaml
```

Verify all PVCs are Bound:
```powershell
kubectl get pvc
# All should show STATUS: Bound
```

---

## Step 3: Create ConfigMaps

### 3.1 Database Config (db-config)
```yaml
# local/yaml/db-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: db-config
data:
  DB_TYPE: "mssql"
  DB_HOST: "mssql-service"    # K8s service name, NOT AWS RDS
  DB_PORT: "1433"
  DB_NAME: "ZLDB"
  DB_USER: "pfuser"
```

### 3.2 ZL App Config (zlapp-config)
**Important:** Do NOT include `ZOO_SERVERS` - it corrupts zkQuorum.cfg
```yaml
# local/yaml/zlapp-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: zlapp-config
data:
  # ZOO_SERVERS removed - using zkQuorum.cfg from zkclient-config ConfigMap
  TIKA_HOST: zltika
  TIKA_PORT: "9972"
  __tika.ZLTikaService.Host: zltika
  __tika.ZLTikaService.Port: "9972"
  DEFAULT_URL: ps/PmApp/zlp_dummy?mgc=1\&NextPage=/app/home.jsp\&domain=yourdomain.com\&la=en\&authMethod=ZipLipDB\&resId=trac_login
```

### 3.3 ZooKeeper Client Config (zkclient-config)
**Critical:** Contains zkQuorum.cfg and tcdb.cfg with correct values
```yaml
# local/yaml/zkclient-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: zkclient-config
data:
  zkQuorum.cfg: |
    #if !_ZK_SERVER_CONFIG_FILE_IS_INCLUDED
    #define _ZK_SERVER_CONFIG_FILE_IS_INCLUDED = true
    
    // ZooKeeper Authentication Key
    _zlzk.auth=#com.zlti.zlzookeeper.ZLZKAuth~~Zh2CX0aZm7f+tRNic77CKvCtYwrxz8Nt7QY1y1T6B5AV4tcMVWGBf4J2Lei/JSDU9KKPspAK2nYPUJF7mQmIVg==
    
    // ZooKeeper Quorum - MUST use full DNS names
    zkQuorum.0=0~~zlzookeeper-0.zk-hs.default.svc.cluster.local~~2181~~2888~~3888~~/var/ZipLip/DATA/ZooKeeper/zk0
    zkQuorum.1=1~~zlzookeeper-1.zk-hs.default.svc.cluster.local~~2181~~2888~~3888~~/var/ZipLip/DATA/ZooKeeper/zk1
    zkQuorum.2=2~~zlzookeeper-2.zk-hs.default.svc.cluster.local~~2181~~2888~~3888~~/var/ZipLip/DATA/ZooKeeper/zk2
    acv.zkQuorum=#wsi.config.AllConfigVariables~~@NAMES_THAT_START_WITH@~~zkQuorum.
    #endif

  tcdb.cfg: |
    // Database Configuration for ZooKeeper
    #define DB_MSSQL_DEFAULT    = true
    
    _db.param.user  = pfuser
    _db.password    = Passw0rd2024
    
    #if DB_MSSQL_DEFAULT
    _db.param.jdbcUrl=jdbc:sqlserver://mssql-service:1433;TrustServerCertificate=true
    _db.param.DatabaseName=ZLDB
    #endif
    
    // DO NOT EDIT BELOW THIS LINE
    acv.db=#wsi.config.AllConfigVariables~~@NAMES_THAT_START_WITH@~~_db.param.
    _db.KeyName = zltc/db
    _tcdb = #com.zlti.zlzookeeper.ZKProtectedKeyFactory~~@_db.KeyName@~~@_db.password@~~@acv.db@

  zkClient.cfg: |
    _zkCluster = /opt/ZipLip/ZLZooKeeper/config/zkQuorum.cfg
    __zk.main=#com.zlti.zlzookeeper.ZLZooKeeper~~@_zkCluster@~~3000~~true
```

### 3.4 Apply All ConfigMaps
```powershell
kubectl apply -f local/yaml/db-config.yaml
kubectl apply -f local/yaml/zlapp-config.yaml
kubectl apply -f local/yaml/zkclient-config.yaml
```

**Note:** Tika connection is configured via environment variables in zlapp-config (TIKA_HOST, TIKA_PORT). No separate DocumentConversion.xml ConfigMap is required.

---

## Step 4: Create Secrets

```yaml
# local/yaml/db-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-secret
type: Opaque
stringData:
  DB_PASSWORD: "Passw0rd2024"
```

```powershell
kubectl apply -f local/yaml/db-secret.yaml
```

---

## Step 5: Deploy ZooKeeper

### 5.1 Deploy Services First
```powershell
kubectl apply -f local/yaml/zk-hs.yaml   # Headless service
kubectl apply -f local/yaml/zk-cs.yaml   # Client service
```

### 5.2 Deploy StatefulSet
**Image:** Use local image tag, set `imagePullPolicy: IfNotPresent`
```powershell
kubectl apply -f local/yaml/zlzookeeper-statefulset.yaml
```

### 5.3 Wait for All 3 Pods
```powershell
kubectl rollout status statefulset/zlzookeeper --timeout=180s
kubectl get pods -l app=zlzookeeper
# All 3 should be Running
```

---

## Step 6: Deploy ZLTika

**Critical Points:**
- PVC name: `zltikatemp-pvc` (not `-efs`)
- Image: Use local tag (e.g., `zltika:zltika11.1.0-b1140`)
- `imagePullPolicy: IfNotPresent`

```powershell
kubectl apply -f local/yaml/zltika-service.yaml
kubectl apply -f local/yaml/zltika-deployment.yaml
kubectl rollout status deployment/zltika --timeout=120s
```

**Verify zltika is responding:**
```powershell
kubectl exec deployment/zltika -- echo "Connected"
```

---

## Step 7: Deploy ZLServer

### 7.1 Key Deployment Configuration
The zlserver-deployment.yaml must:
1. Mount ConfigMap files to `/opt/ZipLip/config-templates/`
2. Copy files to writable locations at startup (ConfigMaps are read-only)
3. Use `imagePullPolicy: IfNotPresent`

**Note:** Tika is configured via environment variables in zlapp-config (TIKA_HOST=zltika, TIKA_PORT=9972).

**Startup command:**
```yaml
args:
  - |
    apt-get update && apt-get install -y openjdk-21-jre-headless
    # Copy config files from ConfigMap templates to writable locations
    cp /opt/ZipLip/config-templates/tcdb.cfg /opt/ZipLip/bin/zk/tcdb.cfg
    cp /opt/ZipLip/config-templates/zkQuorum.cfg /opt/ZipLip/ZLZooKeeper/config/zkQuorum.cfg
    /opt/ZipLip/bin/zlserver-startup.sh
```

**Volume Mounts:**
```yaml
volumeMounts:
  - mountPath: /opt/ZipLip/config-templates/tcdb.cfg
    name: zkclient-config
    subPath: tcdb.cfg
  - mountPath: /opt/ZipLip/config-templates/zkQuorum.cfg
    name: zkclient-config
    subPath: zkQuorum.cfg
  # Tika configured via TIKA_HOST environment variable in zlapp-config
```

### 7.2 Deploy
```powershell
kubectl apply -f local/yaml/zlserver-deployment.yaml
kubectl rollout status deployment/zlserver --timeout=180s
```

### 7.3 Verify Initialization Success
**Wait ~2 minutes for full startup, then check logs:**
```powershell
kubectl logs deployment/zlserver | Select-String "Done init"
# Expected: "Done initalizing ZLServer"
```

If you see errors, check:
```powershell
# ZooKeeper connectivity
kubectl logs deployment/zlserver | Select-String "ZooKeeper|zkQuorum|Auth"

# Database connectivity  
kubectl logs deployment/zlserver | Select-String "Datasource|jdbc|database"

# Tika connectivity
kubectl logs deployment/zlserver | Select-String "Tika|BatchRemote|unable to connect"
```

---

## Step 8: Deploy ZLUI

Similar configuration to zlserver:
```powershell
kubectl apply -f local/yaml/zlui-service.yaml
kubectl apply -f local/yaml/zlui-deployment.yaml
kubectl rollout status deployment/zlui --timeout=180s
```

---

## Step 9: Verify Full Deployment

### 9.1 All Pods Running
```powershell
kubectl get pods
# Expected:
# mssql-express-xxx     1/1     Running
# zlserver-xxx          1/1     Running
# zltika-xxx            1/1     Running
# zlui-xxx              1/1     Running
# zlzookeeper-0         1/1     Running
# zlzookeeper-1         1/1     Running
# zlzookeeper-2         1/1     Running
```

### 9.2 ZLServer Initialized
```powershell
kubectl logs deployment/zlserver --tail=50 | Select-String "Done init"
# Must show: "Done initalizing ZLServer"
```

### 9.3 Access UI
```powershell
kubectl port-forward svc/zlui 8080:8081
# Open browser to http://localhost:8080/ps/app/home.jsp
```

---

## Common Issues & Fixes

### Issue 1: PVC Not Found
**Symptom:** Pod stuck in Pending, events show "persistentvolumeclaim not found"
**Fix:** Ensure PVC names in deployment match actual PVC names (use `-pvc` suffix, not `-efs`)

### Issue 2: Image Pull Error
**Symptom:** `ErrImagePull` or `ImagePullBackOff`
**Fix:** 
- Set `imagePullPolicy: IfNotPresent`
- Use local image tags that exist in minikube
- Or re-authenticate ECR and load images

### Issue 3: ZooKeeper Connection Failed
**Symptom:** "Unable to resolve address: zlzookeeper" or "ZLZKAuth is not initialized"
**Fixes:**
- Ensure zkQuorum.cfg uses full DNS names (`zlzookeeper-0.zk-hs.default.svc.cluster.local`)
- Do NOT set `ZOO_SERVERS` env var in zlapp-config
- Copy zkQuorum.cfg from ConfigMap to writable location at startup

### Issue 4: Database SSL Certificate Error
**Symptom:** "trustServerCertificate property is set to false"
**Fix:** Add `TrustServerCertificate=true` to JDBC URL in tcdb.cfg

### Issue 5: Tika Connection Failed  
**Symptom:** "Thread has already exited; Possibly unable to connect!" during Phase3
**Fixes:**
- Ensure zltika pod is Running BEFORE zlserver starts
- Verify zlapp-config contains TIKA_HOST=zltika and TIKA_PORT=9972 environment variables
- Verify: `kubectl exec deployment/zlserver -- bash -c "cat < /dev/tcp/zltika/9972"`

### Issue 6: Config Files Read-Only
**Symptom:** "sed: cannot rename ... Device or resource busy"
**Fix:** Mount ConfigMap files to a templates directory, then copy to target locations at startup

---

## Quick Restart Procedure

If you need to restart from scratch:

```powershell
# Delete all deployments
kubectl delete deployment zlserver zlui zltika
kubectl delete statefulset zlzookeeper

# Delete old pods
kubectl delete pods -l app=zlserver
kubectl delete pods -l app=zlui
kubectl delete pods -l app=zltika
kubectl delete pods -l app=zlzookeeper

# Redeploy in order
kubectl apply -f local/yaml/zk-hs.yaml
kubectl apply -f local/yaml/zk-cs.yaml
kubectl apply -f local/yaml/zlzookeeper-statefulset.yaml
kubectl rollout status statefulset/zlzookeeper --timeout=180s

kubectl apply -f local/yaml/zltika-deployment.yaml
kubectl rollout status deployment/zltika --timeout=120s

kubectl apply -f local/yaml/zlserver-deployment.yaml
kubectl rollout status deployment/zlserver --timeout=180s

kubectl apply -f local/yaml/zlui-deployment.yaml
kubectl rollout status deployment/zlui --timeout=120s

# Verify
kubectl logs deployment/zlserver | Select-String "Done init"
```

---

## File Reference

| File | Purpose |
|------|---------|
| `local/yaml/db-config.yaml` | Database connection env vars |
| `local/yaml/zlapp-config.yaml` | App config (NO ZOO_SERVERS, has TIKA_HOST) |
| `local/yaml/zkclient-config.yaml` | zkQuorum.cfg + tcdb.cfg |
| `local/yaml/zlserver-deployment.yaml` | ZLServer with config mounts |
| `local/yaml/zltika-deployment.yaml` | ZLTika with correct PVC |
| `local/yaml/zlui-deployment.yaml` | ZLUI deployment |
| `local/yaml/zlzookeeper-statefulset.yaml` | ZK 3-node cluster |

---

## Success Criteria

✅ All pods in Running state  
✅ ZooKeeper cluster healthy (3/3 pods)  
✅ `kubectl logs deployment/zlserver` shows "Done initalizing ZLServer"  
✅ No exceptions in zlserver logs during startup  
✅ UI accessible via port-forward  

---

**Document Version:** 2.0  
**Last Verified:** December 21, 2025
