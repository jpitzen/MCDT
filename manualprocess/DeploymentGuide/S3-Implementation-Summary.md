# S3 Integration Complete - Implementation Summary

## Environment Details
- **Cluster**: usw1-zlps-eks-01
- **Region**: us-west-1
- **Account**: 995553364920
- **S3 Bucket**: usw1-zlps-app-storage
- **CSI Driver**: Mountpoint for Amazon S3 v2.2.1

---

## ✅ Completed Phases

### Phase 1: S3 Bucket Setup
- Bucket created: `usw1-zlps-app-storage`
- Region: us-west-1
- Versioning: Enabled (recommended for data protection)

### Phase 2: IAM Policy
- **Policy Name**: ZLPS_S3_CSI_Driver_Policy
- **Policy ARN**: arn:aws:iam::995553364920:policy/ZLPS_S3_CSI_Driver_Policy
- **Permissions**: ListBucket, GetObject, PutObject, DeleteObject
- **Policy File**: C:\Projects\aws-zl\policies\S3-CSI-Driver-Policy.json

### Phase 3: IAM Service Account (IRSA)
- **Service Account**: s3-csi-controller-sa (namespace: kube-system)
- **IAM Role**: eksctl-usw1-zlps-eks-01-addon-iamserviceaccou-Role1-bFTIIAIpDdYp
- **OIDC Provider**: Already associated (reused from EBS/EFS setup)

### Phase 4: S3 CSI Driver Installation
- **Method**: Helm chart deployment
- **Chart Version**: aws-mountpoint-s3-csi-driver v2.2.1
- **Components**:
  - Controller: 1 pod (s3-csi-controller-xxxxx)
  - Node DaemonSet: 2 pods (one per worker node)
- **Critical Fix Applied**: Attached S3 policy to node group IAM role
  - Node Role: eksctl-usw1-zlps-eks-01-nodegroup--NodeInstanceRole-ekzJtOX3o2UN
  - Required for mount operations

### Phase 5: Storage Resources
- **PersistentVolume**: s3-pv-archive (100Gi, ReadWriteMany)
- **PersistentVolumeClaim**: s3-archive-pvc (Bound status)
- **StorageClass**: None (static provisioning)
- **YAML Files**:
  - C:\Projects\aws-zl\yaml\s3-pv-archive.yaml
  - C:\Projects\aws-zl\yaml\s3-pvc-archive.yaml

### Phase 6: Verification & Testing
✅ All tests passed:
- Write test: Successfully created test-file.txt (41 bytes)
- S3 visibility: File confirmed in S3 bucket
- Read test: Content matches from both mount and S3 CLI
- Mount verification: mountpoint-s3 filesystem with 8.0E capacity

---

## Critical Implementation Details

### Key Learning: Dual IAM Configuration Required
The Mountpoint S3 CSI driver requires BOTH:
1. **Service Account with IRSA** - For pod-level S3 authentication
2. **Node Group IAM Role with S3 Policy** - For mount operations

**Error without node role permissions:**
```
MountVolume.SetUp failed: User arn:aws:sts::995553364920:assumed-role/.../
i-xxx is not authorized to perform: s3:ListBucket
```

**Solution:**
```powershell
aws iam attach-role-policy \
  --role-name eksctl-usw1-zlps-eks-01-nodegroup--NodeInstanceRole-ekzJtOX3o2UN \
  --policy-arn arn:aws:iam::995553364920:policy/ZLPS_S3_CSI_Driver_Policy
```

### Helm Installation Fix
Original command failed because eksctl-created service account couldn't be imported by Helm.

**Failed approach:**
```powershell
--set serviceAccount.controller.create=false
--set serviceAccount.node.create=false
--set node.serviceAccount.name=s3-csi-controller-sa
```

**Working approach:**
```powershell
# Let Helm create service accounts and annotate with IAM role
--set node.serviceAccount.annotations."eks\.amazonaws\.com/role-arn"="arn:aws:iam::995553364920:role/eksctl-usw1-zlps-eks-01-addon-iamserviceaccou-Role1-bFTIIAIpDdYp"
```

---

## Current Storage Landscape

### EFS Storage (Active in Production)
| PVC Name | Size | Mount Path | Usage |
|----------|------|------------|-------|
| zltikatemp-efs | 10Gi | /opt/ZipLip/zlserver/WEB-INF/tmp | Shared temp (zltika + zlui) |
| zluilogs-efs | 10Gi | /opt/ZipLip/logs | Shared logs (zlui replicas) |
| zlvault-efs | 10Gi | /var/ZipLip/Vault | Vault storage (zlui) |

### S3 Storage (Available)
| PVC Name | Size | Bucket | Usage |
|----------|------|--------|-------|
| s3-archive-pvc | 100Gi | usw1-zlps-app-storage | Archive/backup storage |

---

## Storage Decision Matrix

| Requirement | Use EFS | Use S3 |
|-------------|---------|--------|
| Shared file system with POSIX compliance | ✅ | ❌ |
| Concurrent multi-pod write access | ✅ | ⚠️ |
| Low latency file operations | ✅ | ❌ |
| Archive/backup storage | ❌ | ✅ |
| Cost-effective large file storage | ❌ | ✅ |
| Integration with S3-native AWS services | ❌ | ✅ |

**Cost Comparison:**
- EFS: $0.30/GB-month
- S3 Standard: $0.023/GB-month (13x cheaper)
- S3 Glacier: $0.004/GB-month (75x cheaper)

---

## Next Steps & Recommendations

### Option 1: Keep S3 for Archive/Backup (Recommended)
Use S3 for:
- Long-term archive of old logs
- Database backups
- Document archival
- Disaster recovery storage

**Example Integration:**
```yaml
# Add to zlui-deployment.yaml
volumeMounts:
  - mountPath: /opt/ZipLip/archive
    name: s3-archive
volumes:
  - name: s3-archive
    persistentVolumeClaim:
      claimName: s3-archive-pvc
```

### Option 2: Remove S3 if Not Needed
If you only need active file system storage (already covered by EFS):
```powershell
# Cleanup commands in C:\Projects\aws-zl\commands\s3-deployment-commands.txt
helm uninstall aws-mountpoint-s3-csi-driver -n kube-system
kubectl delete pvc s3-archive-pvc -n default
kubectl delete pv s3-pv-archive
```

---

## Files Created

1. **C:\Projects\aws-zl\policies\S3-CSI-Driver-Policy.json** - IAM policy document
2. **C:\Projects\aws-zl\yaml\s3-pv-archive.yaml** - S3 PersistentVolume
3. **C:\Projects\aws-zl\yaml\s3-pvc-archive.yaml** - S3 PersistentVolumeClaim
4. **C:\Projects\aws-zl\yaml\s3-test-pod.yaml** - Test pod for validation
5. **C:\Projects\aws-zl\commands\s3-deployment-commands.txt** - Complete deployment guide

---

## Verification Commands

**Check S3 CSI driver:**
```powershell
kubectl get pods -n kube-system | Select-String "s3"
kubectl get csidrivers | Select-String "s3"
```

**Check storage:**
```powershell
kubectl get pv,pvc -n default | Select-String "s3"
aws s3 ls s3://usw1-zlps-app-storage/
```

**Test S3 mount in any pod:**
```powershell
kubectl exec -it <POD_NAME> -n default -- df -h | Select-String "s3-data"
```

---

## Troubleshooting

**Issue**: FailedMount with "Forbidden: not authorized to perform s3:ListBucket"
**Solution**: Verify node group role has S3 policy attached
```powershell
aws iam list-attached-role-policies --role-name eksctl-usw1-zlps-eks-01-nodegroup--NodeInstanceRole-ekzJtOX3o2UN
```

**Issue**: Helm install fails with "invalid ownership metadata"
**Solution**: Let Helm create its own service accounts instead of reusing eksctl-created ones

**Issue**: Pod stuck in ContainerCreating
**Check**:
```powershell
kubectl describe pod <POD_NAME> -n default
kubectl logs -n mount-s3 -l app.kubernetes.io/name=aws-mountpoint-s3-csi-driver
```

---

## Status Summary

✅ **Phase 4 Resolution**: Fixed Helm installation conflict
✅ **Critical Fix**: Attached S3 policy to node group IAM role  
✅ **All Tests**: Write, read, S3 verification successful
✅ **Storage Ready**: S3 PV/PVC available for application use

**Deployment Status**: S3 integration fully operational and tested
**Next Decision**: Determine specific use case for S3 storage (archive, backup, etc.)
