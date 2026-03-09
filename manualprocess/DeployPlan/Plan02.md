# ZL Application Deployment Plan v2.0

## Executive Summary

This plan establishes a **repeatable, failure-resistant deployment process** for the ZL application stack on Minikube (local development) with a clear path to AWS EKS production deployment.

**Key Improvements from Plan v1:**
- Declarative YAML-based ZooKeeper authentication (no manual `zkutil.sh -k` required)
- ConfigMap-based application configuration (no manual file edits)
- Proper deployment ordering with dependency verification
- Automated health checks at each stage
- Clear rollback procedures

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      Kubernetes Cluster                          │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    ConfigMaps/Secrets                        │ │
│  │  • zk-config (ZooKeeper auth + quorum)                       │ │
│  │  • pmapp-config (Application config)                         │ │
│  │  • zlapp-config (Environment variables)                      │ │
│  │  • db-config/db-secret (Database credentials)               │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌───────────────┐    ┌───────────────┐    ┌───────────────────┐ │
│  │ zlzookeeper   │    │   zlserver    │    │      zlui         │ │
│  │ StatefulSet   │◄───│  Deployment   │◄───│   Deployment      │ │
│  │ (3 replicas)  │    │ (1 replica)   │    │  (1+ replicas)    │ │
│  └───────┬───────┘    └───────┬───────┘    └────────┬──────────┘ │
│          │                    │                      │            │
│  ┌───────▼───────┐    ┌───────▼───────┐    ┌────────▼──────────┐ │
│  │   zk-hs/cs    │    │   Internal    │    │   zlui Service    │ │
│  │   Services    │    │   Service     │    │  (LoadBalancer)   │ │
│  └───────────────┘    └───────────────┘    └───────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              Persistent Volume Claims (PVCs)                 │ │
│  │  • zlzkdata-* (ZooKeeper data - StatefulSet)                │ │
│  │  • zlserverlogs-pvc, zlservertemp-pvc                       │ │
│  │  • zluilogs-pvc, zltikatemp-pvc, zlvault-pvc               │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────┐    ┌─────────────────────────────────────┐ │
│  │    zltika       │    │         mssql-express               │ │
│  │   Deployment    │    │         Deployment                  │ │
│  │  (1 replica)    │    │         (Database)                  │ │
│  └─────────────────┘    └─────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Deployment Phases

### Phase 0: Prerequisites Verification

**Objective:** Ensure local environment is ready for deployment.

#### 0.1 Verify Minikube & Tools
```powershell
# Verify Minikube is running
minikube status

# Verify kubectl connectivity
kubectl cluster-info

# Verify Docker images are loaded
docker images | Select-String "zl"
```

**Expected Output:**
- Minikube: `host: Running`, `kubelet: Running`
- kubectl: Shows cluster-info
- Docker images: `zlserver`, `zlui`, `zlzookeeper`, `zltika`

#### 0.2 Load Docker Images (if not present)
```powershell
# Load local images into Minikube
minikube image load zlserver:zlserver11.1.0-b1140
minikube image load zlui:zlserver11.1.0-b1140
minikube image load zlzookeeper:zlzookeeper11.1.0-b1140
minikube image load zltika:zltika11.1.0-b1140
```

---

### Phase 1: ConfigMaps and Secrets

**Objective:** Deploy all configuration before any workloads.

**Order:** ConfigMaps MUST be deployed before any pods that reference them.

#### 1.1 ZooKeeper Configuration
```powershell
kubectl apply -f yaml/zk-config.yaml
kubectl apply -f yaml/zk-jaas-config.yaml
kubectl apply -f yaml/zkclient-config.yaml
```

**Verification:**
```powershell
kubectl get configmap zk-config -o yaml | Select-String "_zlzk.auth"
# Should show authentication key is configured
```

#### 1.2 Application Configuration
```powershell
kubectl apply -f yaml/zlapp-config.yaml
kubectl apply -f yaml/pmapp-config.yaml
kubectl apply -f yaml/docconvert-config.yaml
```

#### 1.3 Database Configuration
```powershell
kubectl apply -f yaml/db-config.yaml
kubectl apply -f yaml/db-secret.yaml
```

**Phase 1 Verification:**
```powershell
kubectl get configmap
kubectl get secret
# All ConfigMaps and Secrets should be present
```

---

### Phase 2: Services

**Objective:** Create service endpoints before pods (allows pods to resolve DNS on startup).

#### 2.1 Deploy Services
```powershell
# ZooKeeper Services (headless + client)
kubectl apply -f yaml/zk-hs.yaml
kubectl apply -f yaml/zk-cs.yaml

# Application Services
kubectl apply -f yaml/zltika-service.yaml
kubectl apply -f yaml/zlui-service.yaml
```

**Phase 2 Verification:**
```powershell
kubectl get svc
# Should show: zk-hs, zk-cs, zltika, zlui, kubernetes
```

---

### Phase 3: Database (Dependency Layer 1)

**Objective:** Database must be running before application pods start.

#### 3.1 Deploy Database (Minikube Only)
For local development using MS SQL Express:
```powershell
# Create PVC for database
kubectl apply -f yaml/mssql-pvc.yaml

# Deploy MS SQL Express
kubectl apply -f yaml/mssql-deployment.yaml
kubectl apply -f yaml/mssql-service.yaml
```

#### 3.2 Wait for Database Ready
```powershell
kubectl wait --for=condition=Ready pod -l app=mssql-express --timeout=120s
```

#### 3.3 Initialize Database Schema
```powershell
# Get pod name
$dbPod = kubectl get pod -l app=mssql-express -o jsonpath='{.items[0].metadata.name}'

# Copy and run SQL scripts (if needed)
kubectl cp zldbcreate/setupDB.sql ${dbPod}:/tmp/setupDB.sql
kubectl exec $dbPod -- /opt/mssql-tools18/bin/sqlcmd -S localhost -U SA -P 'YourPassword' -i /tmp/setupDB.sql -C
```

**Phase 3 Verification:**
```powershell
kubectl exec $dbPod -- /opt/mssql-tools18/bin/sqlcmd -S localhost -U SA -P 'YourPassword' -Q "SELECT name FROM sys.databases" -C
# Should show ZLDB database
```

---

### Phase 4: ZooKeeper Cluster (Dependency Layer 2)

**Objective:** ZooKeeper cluster must be fully initialized before applications connect.

#### 4.1 Deploy ZooKeeper StatefulSet
```powershell
kubectl apply -f yaml/zlzookeeper-statefulset.yaml
```

#### 4.2 Wait for All ZooKeeper Pods
```powershell
kubectl rollout status statefulset/zlzookeeper --timeout=300s

# Or manual wait
kubectl wait --for=condition=Ready pod/zlzookeeper-0 --timeout=120s
kubectl wait --for=condition=Ready pod/zlzookeeper-1 --timeout=120s
kubectl wait --for=condition=Ready pod/zlzookeeper-2 --timeout=120s
```

#### 4.3 Verify ZooKeeper Cluster Health
```powershell
# Check cluster status on each node
kubectl exec zlzookeeper-0 -- /opt/ZipLip/bin/zkstat.sh
kubectl exec zlzookeeper-1 -- /opt/ZipLip/bin/zkstat.sh
kubectl exec zlzookeeper-2 -- /opt/ZipLip/bin/zkstat.sh

# Verify leader election
kubectl exec zlzookeeper-0 -- cat /var/ZipLip/DATA/ZooKeeper/myid
```

#### 4.4 Initialize ZooKeeper Authentication (CRITICAL)
**This step is now automated via ConfigMap**, but verify:
```powershell
# Test ZooKeeper connectivity from any ZK pod
kubectl exec zlzookeeper-0 -- /opt/ZipLip/bin/zkutil.sh -s "ls /"
# Should return: [zookeeper]
```

**If authentication fails:**
```powershell
# Generate new authentication key
kubectl exec zlzookeeper-0 -- /opt/ZipLip/bin/zkutil.sh -g

# Update zk-config.yaml with new key, then:
kubectl apply -f yaml/zk-config.yaml
kubectl rollout restart statefulset/zlzookeeper
```

**Phase 4 Verification Checklist:**
- [ ] All 3 ZooKeeper pods Running
- [ ] Leader elected (one pod shows "leader", two show "follower")
- [ ] `zkutil.sh -s "ls /"` returns successfully
- [ ] Authentication configured (check `_zlzk.auth` in ConfigMap)

---

### Phase 5: Application Tier (Dependency Layer 3)

**Objective:** Deploy applications in correct order based on dependencies.

#### 5.1 Deploy ZL Server (Backend)
```powershell
kubectl apply -f yaml/zlserver-deployment.yaml
kubectl wait --for=condition=Ready pod -l app=zlserver --timeout=180s
```

#### 5.2 Deploy ZL Tika (Document Service)
```powershell
kubectl apply -f yaml/zltika-deployment.yaml
kubectl wait --for=condition=Ready pod -l app=zltika --timeout=120s
```

#### 5.3 Deploy ZL UI (Frontend)
```powershell
kubectl apply -f yaml/zlui-deployment.yaml
kubectl wait --for=condition=Ready pod -l app=zlui --timeout=180s
```

**Phase 5 Verification:**
```powershell
kubectl get pods
# All pods should show Running with READY 1/1

# Check application logs for startup errors
kubectl logs -l app=zlui --tail=50
kubectl logs -l app=zlserver --tail=50
```

---

### Phase 6: End-to-End Verification

**Objective:** Verify complete system functionality.

#### 6.1 Verify ZooKeeper Connectivity from Applications
```powershell
# Test from zlui pod
$uiPod = kubectl get pod -l app=zlui -o jsonpath='{.items[0].metadata.name}'
kubectl exec $uiPod -- /opt/ZipLip/bin/zkutil.sh -s "ls /"
```

#### 6.2 Verify Database Connectivity
```powershell
kubectl logs $uiPod | Select-String -Pattern "database|connection|DB"
# Should not show connection errors
```

#### 6.3 Test HTTP Endpoints
```powershell
# Port forward for local access
kubectl port-forward svc/zlui 8081:8081 &

# Test endpoint
curl -I http://localhost:8081/ps/app/home.jsp
# Should return HTTP 200 (or 302 redirect to login)
```

#### 6.4 Verify Internal Service Communication
```powershell
# Test from zlui to zltika
kubectl exec $uiPod -- curl -s http://zltika:9972/healthcheck

# Test from zlui to ZooKeeper
kubectl exec $uiPod -- curl -s http://zk-cs:2181
```

---

## Complete Deployment Script

Save as `deploy-all.ps1`:

```powershell
#!/usr/bin/env pwsh
# ZL Application Full Deployment Script
# Usage: .\deploy-all.ps1

$ErrorActionPreference = "Stop"

Write-Host "=== Phase 0: Prerequisites ===" -ForegroundColor Cyan
minikube status
if ($LASTEXITCODE -ne 0) { throw "Minikube not running" }

Write-Host "=== Phase 1: ConfigMaps & Secrets ===" -ForegroundColor Cyan
kubectl apply -f yaml/zk-config.yaml
kubectl apply -f yaml/zk-jaas-config.yaml
kubectl apply -f yaml/zkclient-config.yaml
kubectl apply -f yaml/zlapp-config.yaml
kubectl apply -f yaml/pmapp-config.yaml
kubectl apply -f yaml/docconvert-config.yaml
kubectl apply -f yaml/db-config.yaml
kubectl apply -f yaml/db-secret.yaml

Write-Host "=== Phase 2: Services ===" -ForegroundColor Cyan
kubectl apply -f yaml/zk-hs.yaml
kubectl apply -f yaml/zk-cs.yaml
kubectl apply -f yaml/zltika-service.yaml
kubectl apply -f yaml/zlui-service.yaml

Write-Host "=== Phase 3: Database ===" -ForegroundColor Cyan
# Uncomment if deploying fresh database
# kubectl apply -f yaml/mssql-deployment.yaml
# kubectl wait --for=condition=Ready pod -l app=mssql-express --timeout=120s

Write-Host "=== Phase 4: ZooKeeper ===" -ForegroundColor Cyan
kubectl apply -f yaml/zlzookeeper-statefulset.yaml
kubectl rollout status statefulset/zlzookeeper --timeout=300s

Write-Host "Waiting for ZooKeeper cluster to stabilize (30s)..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

Write-Host "=== Phase 5: Applications ===" -ForegroundColor Cyan
kubectl apply -f yaml/zlserver-deployment.yaml
kubectl wait --for=condition=Ready pod -l app=zlserver --timeout=180s

kubectl apply -f yaml/zltika-deployment.yaml
kubectl wait --for=condition=Ready pod -l app=zltika --timeout=120s

kubectl apply -f yaml/zlui-deployment.yaml
kubectl wait --for=condition=Ready pod -l app=zlui --timeout=180s

Write-Host "=== Phase 6: Verification ===" -ForegroundColor Cyan
kubectl get pods
kubectl get svc

Write-Host "=== Deployment Complete ===" -ForegroundColor Green
Write-Host "Access application at: http://localhost:8081 (after port-forward)" -ForegroundColor Green
Write-Host "Run: kubectl port-forward svc/zlui 8081:8081" -ForegroundColor Yellow
```

---

## Troubleshooting Guide

### Issue 1: ZooKeeper Authentication Failure
**Symptom:** `ZLZKAuth is not initialized!` in application logs

**Resolution:**
```powershell
# 1. Generate new auth key
kubectl exec zlzookeeper-0 -- /opt/ZipLip/bin/zkutil.sh -g

# 2. Copy output and update zk-config.yaml AND pmapp-config.yaml with SAME key

# 3. Apply changes
kubectl apply -f yaml/zk-config.yaml
kubectl apply -f yaml/pmapp-config.yaml

# 4. Restart all components
kubectl rollout restart statefulset/zlzookeeper
kubectl rollout restart deployment/zlserver
kubectl rollout restart deployment/zlui
```

### Issue 2: ConfigMap Changes Not Taking Effect
**Symptom:** Pod still using old configuration after `kubectl apply`

**Resolution:**
```powershell
# Force pod recreation
kubectl delete pod -l app=zlui
# OR
kubectl rollout restart deployment/zlui
```

### Issue 3: Application Cannot Connect to ZooKeeper
**Symptom:** Connection refused to ZooKeeper

**Resolution:**
```powershell
# 1. Verify ZooKeeper is running
kubectl get pods -l app=zlzookeeper

# 2. Test DNS resolution
kubectl exec -it <zlui-pod> -- nslookup zk-cs

# 3. Test port connectivity
kubectl exec -it <zlui-pod> -- nc -zv zk-cs 2181
```

### Issue 4: Database Connection Failure
**Symptom:** SQL connection errors in logs

**Resolution:**
```powershell
# 1. Verify database pod
kubectl get pod -l app=mssql-express

# 2. Check ConfigMap values
kubectl get configmap db-config -o yaml

# 3. Test connectivity
kubectl exec -it <zlui-pod> -- nc -zv mssql-service 1433
```

### Issue 5: Pods in CrashLoopBackOff
**Symptom:** Pod restarts repeatedly

**Resolution:**
```powershell
# 1. Check logs
kubectl logs <pod-name> --previous

# 2. Check events
kubectl describe pod <pod-name>

# 3. Common causes:
#    - Missing ConfigMap/Secret
#    - Image not found
#    - Resource limits too low
```

---

## Configuration Files Reference

| File | Purpose | Dependencies |
|------|---------|--------------|
| `zk-config.yaml` | ZooKeeper server config + auth key | None |
| `zk-jaas-config.yaml` | JAAS authentication | None |
| `zkclient-config.yaml` | Client connection config | None |
| `pmapp-config.yaml` | Application main config | Auth key from zk-config |
| `zlapp-config.yaml` | Environment variables | None |
| `db-config.yaml` | Database connection | None |
| `db-secret.yaml` | Database credentials | None |
| `zk-hs.yaml` | Headless service for peer discovery | None |
| `zk-cs.yaml` | Client service for app connections | None |
| `zlzookeeper-statefulset.yaml` | ZooKeeper cluster | zk-config, zk-hs |
| `zlserver-deployment.yaml` | Backend server | ConfigMaps, ZooKeeper |
| `zltika-deployment.yaml` | Document service | PVCs |
| `zlui-deployment.yaml` | Frontend UI | ConfigMaps, ZooKeeper, DB |

---

## Key Lessons Learned (from History)

1. **Authentication Keys Must Match:** The `_zlzk.auth` key in `zk-config.yaml` must EXACTLY match the key in `pmapp-config.yaml` or application config.

2. **Include Paths Must Be Relative:** In `pmapp.cfg`, include directives must use relative paths (`#include pmappIncludes.cfg`) not absolute paths.

3. **ConfigMap Updates Require Pod Restart:** Kubernetes does not automatically reload ConfigMaps in running pods.

4. **ZooKeeper Must Start Before Applications:** The application startup will fail if ZooKeeper is not fully operational.

5. **Service Accounts Matter:** Pods must reference existing service accounts (`zlapp-sa` or `default`).

6. **Image Tags Must Match:** Ensure deployment YAML image tags match the actual images loaded in Docker/Minikube.

---

## Migration to AWS EKS

When moving to AWS EKS, the following changes are required:

| Component | Minikube | AWS EKS |
|-----------|----------|---------|
| StorageClass | `standard` | `gp3` (EBS) or `efs-sc` (EFS) |
| Image Registry | Local Docker | ECR |
| LoadBalancer | `<pending>` | AWS ALB/NLB |
| Service Accounts | Default | IRSA-enabled |
| Database | Local MS SQL | RDS SQL Server |
| ZooKeeper Storage | hostPath | EBS gp3 |
| Application Storage | hostPath | EFS |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-16 | Initial plan |
| 2.0 | 2025-12-19 | YAML-based auth, improved ordering, troubleshooting guide |
