# ZL Application AWS EKS Deployment Checklist

**Version:** 2.0  
**Last Updated:** December 2025  
**Status:** Production Ready

---

## Overview

This checklist provides step-by-step verification for deploying the ZL Application to AWS EKS. It incorporates critical fixes discovered during deployment testing.

---

## Pre-Deployment Verification

### Infrastructure Prerequisites

- [ ] EKS cluster is running and accessible
  ```bash
  aws eks describe-cluster --name <cluster-name> --region <region> --query 'cluster.status'
  kubectl get nodes
  ```

- [ ] Node groups are healthy with sufficient capacity
  ```bash
  aws eks describe-nodegroup --cluster-name <cluster-name> --nodegroup-name <nodegroup> --region <region>
  ```

- [ ] ECR repository contains required images
  ```bash
  aws ecr list-images --repository-name <repo-name> --region <region>
  ```

- [ ] Required images are available:
  - `zlserver20251219`
  - `zlui20251219`
  - `zlzookeeper20251219`
  - `zltika20251219`

### CSI Drivers

- [ ] EBS CSI Driver is ACTIVE
  ```bash
  aws eks describe-addon --cluster-name <cluster-name> --addon-name aws-ebs-csi-driver --region <region>
  kubectl get pods -n kube-system -l app.kubernetes.io/name=aws-ebs-csi-driver
  ```

- [ ] EFS CSI Driver is ACTIVE
  ```bash
  aws eks describe-addon --cluster-name <cluster-name> --addon-name aws-efs-csi-driver --region <region>
  kubectl get pods -n kube-system -l app.kubernetes.io/name=aws-efs-csi-driver
  ```

- [ ] Storage classes exist
  ```bash
  kubectl get storageclass ebs-sc
  kubectl get storageclass efs-sc
  ```

### Database

- [ ] RDS instance is available
  ```bash
  aws rds describe-db-instances --db-instance-identifier <instance-id> --region <region>
  ```

- [ ] Security groups allow traffic from EKS
- [ ] Database and user created
- [ ] Connection string tested

---

## Critical Configuration Checks ⚠️

### 1. zlapp-config ConfigMap

**CRITICAL:** Verify ZOO_SERVERS is NOT present

```bash
kubectl get configmap zlapp-config -o yaml | grep -i zoo
# Should return NOTHING
```

✅ Correct: No `ZOO_SERVERS` key  
❌ Wrong: Contains `ZOO_SERVERS: ...`

### 2. zkclient-config ConfigMap

**CRITICAL:** Verify zkQuorum.cfg uses FULL DNS names

```bash
kubectl get configmap zkclient-config -o yaml | grep zkQuorum
```

✅ Correct: `zlzookeeper-0.zk-hs.default.svc.cluster.local`  
❌ Wrong: `zlzookeeper-0` (short name)

### 3. Tika Environment Variables

**CRITICAL:** Verify zlapp-config contains Tika host settings

```bash
kubectl get configmap zlapp-config -o yaml | grep -i tika
```

✅ Correct: Contains `TIKA_HOST: zltika` and `__tika.ZLTikaService.Host: zltika`  
❌ Wrong: Missing or set to `localhost`

### 4. ZLServer Deployment

**CRITICAL:** Verify config file copy pattern in startup command

```bash
kubectl get deployment zlserver -o yaml | grep -A5 "args:"
```

✅ Correct: Contains `cp /opt/ZipLip/config-templates/tcdb.cfg ...`  
❌ Wrong: Directly mounts to target paths

### 5. PVC Names

**CRITICAL:** Verify PVC names match between resources and deployments

```bash
kubectl get pvc
kubectl get deployment zlserver -o yaml | grep claimName
```

✅ AWS: Use `-efs` suffix (e.g., `zlservertemp-efs`)

---

## Deployment Sequence

Deploy in this **exact order**:

### Phase 1: Base Resources

- [ ] Create namespace (if not default)
  ```bash
  kubectl create namespace zl-app  # Optional
  ```

- [ ] Create service account
  ```bash
  kubectl create serviceaccount zlapp-sa
  ```

- [ ] Create ECR pull secret
  ```bash
  aws ecr get-login-password --region <region> | kubectl create secret docker-registry docker-secret \
    --docker-server=<account>.dkr.ecr.<region>.amazonaws.com \
    --docker-username=AWS \
    --docker-password-stdin
  ```

### Phase 2: Storage

- [ ] Create EFS PVs and PVCs
  ```bash
  kubectl apply -f efs-pvs.yaml
  kubectl apply -f efs-pvcs.yaml
  kubectl get pvc  # All should be Bound
  ```

### Phase 3: Configuration

- [ ] Apply db-config ConfigMap
  ```bash
  kubectl apply -f aws/db-config.yaml
  ```

- [ ] Apply db-secret Secret
  ```bash
  kubectl apply -f aws/db-secret.yaml
  ```

- [ ] Apply zlapp-config ConfigMap (NO ZOO_SERVERS!)
  ```bash
  kubectl apply -f aws/zlapp-config.yaml
  ```

- [ ] Apply zkclient-config ConfigMap (with full DNS names)
  ```bash
  kubectl apply -f aws/zkclient-config.yaml
  ```

### Phase 4: ZooKeeper

- [ ] Deploy ZooKeeper services
  ```bash
  kubectl apply -f aws/zk-hs.yaml
  kubectl apply -f aws/zk-cs.yaml
  ```

- [ ] Deploy ZooKeeper StatefulSet
  ```bash
  kubectl apply -f aws/zlzookeeper-statefulset.yaml
  ```

- [ ] Wait for all 3 pods
  ```bash
  kubectl rollout status statefulset/zlzookeeper --timeout=300s
  kubectl get pods -l app=zlzookeeper
  # All 3 should be Running
  ```

- [ ] Verify leader election
  ```bash
  kubectl logs zlzookeeper-0 | grep -i "state changed"
  # Should show: "Peer state changed: following/leading - broadcast"
  ```

### Phase 5: Tika

- [ ] Deploy Tika
  ```bash
  kubectl apply -f aws/zltika-deployment.yaml
  kubectl rollout status deployment/zltika --timeout=120s
  ```

- [ ] Verify Tika is responding
  ```bash
  kubectl exec deployment/zltika -- echo "Tika is running"
  ```

### Phase 6: ZLServer

- [ ] Deploy ZLServer
  ```bash
  kubectl apply -f aws/zlserver-deployment.yaml
  ```

- [ ] Wait for initialization (2-3 minutes)
  ```bash
  kubectl logs deployment/zlserver -f
  ```

- [ ] **Verify successful initialization**
  ```bash
  kubectl logs deployment/zlserver | grep -i "done init"
  # MUST show: "Done initalizing ZLServer"
  ```

### Phase 7: ZLUI

- [ ] Deploy ZLUI
  ```bash
  kubectl apply -f aws/zlui-deployment.yaml
  kubectl apply -f aws/zlui-service.yaml
  ```

- [ ] Verify UI is running
  ```bash
  kubectl rollout status deployment/zlui --timeout=120s
  ```

---

## Post-Deployment Verification

### All Pods Running

```bash
kubectl get pods
```

Expected output:
```
NAME                        READY   STATUS    RESTARTS   AGE
zltika-xxxxxxxxxx-xxxxx     1/1     Running   0          10m
zlserver-xxxxxxxxxx-xxxxx   1/1     Running   0          8m
zlui-xxxxxxxxxx-xxxxx       1/1     Running   0          5m
zlzookeeper-0               1/1     Running   0          15m
zlzookeeper-1               1/1     Running   0          14m
zlzookeeper-2               1/1     Running   0          13m
```

### ZLServer Logs

```bash
kubectl logs deployment/zlserver | tail -100
```

✅ Success indicators:
- "Done initalizing ZLServer"
- No exceptions during Phase1, Phase2, Phase3

❌ Failure indicators:
- "Unable to resolve address"
- "ZLZKAuth is not initialized"
- "XML document structures must start and end"
- "trustServerCertificate property is set to false"

### Services

```bash
kubectl get services
```

Required services:
- `zk-cs` (ZooKeeper client)
- `zk-hs` (ZooKeeper headless)
- `zltika` (Document conversion)
- `zlui-service` or LoadBalancer

---

## Troubleshooting Quick Reference

| Issue | Symptom | Fix |
|-------|---------|-----|
| ZooKeeper connection fails | "Unable to resolve address" | Use full DNS names in zkQuorum.cfg |
| ZOO_SERVERS corruption | zkQuorum.cfg has wrong format | Remove ZOO_SERVERS from zlapp-config |
| Config read-only error | "sed: cannot rename" | Copy ConfigMap files at startup |
| DB SSL error | "trustServerCertificate" | Add TrustServerCertificate=true to JDBC URL |
| Tika connection fails | "Thread has already exited" | Ensure zlapp-config has TIKA_HOST=zltika |
| PVC not found | Pod Pending | Match PVC names with deployment references |

---

## File Reference

| File | Purpose | Critical Config |
|------|---------|-----------------|
| `aws/zlapp-config.yaml` | App env vars | NO ZOO_SERVERS, TIKA_HOST=zltika |
| `aws/zkclient-config.yaml` | ZK config files | Full DNS names |
| `aws/zlserver-deployment.yaml` | Server deployment | Config copy pattern |
| `aws/zltika-deployment.yaml` | Tika deployment | Correct PVC name |
| `aws/zlzookeeper-statefulset.yaml` | ZK cluster | zkQuorum.cfg mount |

---

## Success Criteria

✅ All pods in Running state  
✅ ZooKeeper cluster healthy (3/3 pods with leader elected)  
✅ `kubectl logs deployment/zlserver` shows "Done initalizing ZLServer"  
✅ No exceptions in zlserver logs during startup phases  
✅ ZLUI accessible via LoadBalancer or Ingress  

---

**Document Version:** 2.1  
**Based on:** Deployment testing December 2025

**Document Version:** 2.0  
**Based on:** Deployment testing December 2025
