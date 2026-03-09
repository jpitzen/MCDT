# ZooKeeper Deployment Guide - US East (us-east-1)

## Overview
This guide provides step-by-step instructions for deploying a ZooKeeper cluster in the US East (us-east-1) AWS region. This assumes you already have a working ZooKeeper deployment in US West (us-west-1) and want to create a completely separate environment.

## Prerequisites
- AWS CLI configured with appropriate permissions
- kubectl configured for both regions
- Existing EKS cluster in us-east-1 (use1-zlps-eks-01)
- ECR repository created in us-east-1 (ue1-zlps-ecr-01)
- ZooKeeper container image available in us-east-1 ECR

## Step 1: Verify Current Status
Check the current ZooKeeper deployment status in us-east-1:

```bash
# Switch to us-east-1 context
kubectl config current-context
aws eks update-kubeconfig --region us-east-1 --name use1-zlps-eks-01
kubectl config current-context

# Check pod status
kubectl get pods -l app=zlzookeeper
kubectl get pvc
```

Expected: Pods in Pending status, PVCs unbound.

## Step 2: Create EBS Storage Class
The ZooKeeper StatefulSet requires an EBS storage class that may not exist in the new region.

```bash
# Create the ebs-sc storage class
kubectl apply -f yaml/old/ebs-sc.yaml
kubectl get storageclass
```

## Step 3: Fix EBS CSI Driver Issues
The EBS CSI driver addon may have configuration conflicts or IAM issues in the new region.

### 3.1 Check Addon Status
```bash
aws eks list-addons --cluster-name use1-zlps-eks-01 --region us-east-1
aws eks describe-addon --cluster-name use1-zlps-eks-01 --addon-name aws-ebs-csi-driver --region us-east-1
```

### 3.2 Remove Conflicting Resources
If the addon is in CREATE_FAILED state due to conflicts:

```bash
# Delete conflicting service account
kubectl delete serviceaccount ebs-csi-controller-sa -n kube-system

# Delete and recreate the addon
aws eks delete-addon --cluster-name use1-zlps-eks-01 --addon-name aws-ebs-csi-driver --region us-east-1
```

### 3.3 Create Region-Specific IAM Role
Create IAM role for EBS CSI driver in us-east-1:

```bash
# Create trust policy file
# Save this as ebs-csi-trust-policy-us-east-1.json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::995553364920:oidc-provider/oidc.eks.us-east-1.amazonaws.com/id/031538AECE39BD60168E0E4D8162FF00"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "oidc.eks.us-east-1.amazonaws.com/id/031538AECE39BD60168E0E4D8162FF00:aud": "sts.amazonaws.com",
          "oidc.eks.us-east-1.amazonaws.com/id/031538AECE39BD60168E0E4D8162FF00:sub": "system:serviceaccount:kube-system:ebs-csi-controller-sa"
        }
      }
    }
  ]
}

# Create the role
aws iam create-role --role-name AmazonEKS_EBS_CSI_DriverRole_us-east-1 --assume-role-policy-document file://ebs-csi-trust-policy-us-east-1.json --region us-east-1

# Create the policy (if it doesn't exist)
aws iam create-policy --policy-name Amazon_EBS_CSI_Driver_Policy --policy-document file://policies/Amazon_EBS_CSI_Driver_Policy.json --region us-east-1

# Attach the policy
aws iam attach-role-policy --role-name AmazonEKS_EBS_CSI_DriverRole_us-east-1 --policy-arn arn:aws:iam::995553364920:policy/Amazon_EBS_CSI_Driver_Policy --region us-east-1
```

### 3.4 Install EBS CSI Driver Addon
```bash
aws eks create-addon --cluster-name use1-zlps-eks-01 --addon-name aws-ebs-csi-driver --service-account-role-arn arn:aws:iam::995553364920:role/AmazonEKS_EBS_CSI_DriverRole_us-east-1 --region us-east-1

# Wait for addon to be ACTIVE
aws eks describe-addon --cluster-name use1-zlps-eks-01 --addon-name aws-ebs-csi-driver --region us-east-1

# Verify CSI driver pods are running
kubectl get pods -n kube-system -l app.kubernetes.io/name=aws-ebs-csi-driver
```

## Step 4: Create Required Kubernetes Resources

### 4.1 Create Service Account
```bash
kubectl create serviceaccount zlapp-sa
```

### 4.2 Create Docker Registry Secret
```bash
# Get ECR token
aws ecr get-login-password --region us-east-1

# Create the secret (replace TOKEN with actual token)
kubectl create secret docker-registry docker-secret --docker-server=995553364920.dkr.ecr.us-east-1.amazonaws.com --docker-username=AWS --docker-password=TOKEN
```

### 4.3 Create ZooKeeper Configuration
Create the zkQuorum.cfg ConfigMap:

```bash
# Create config file
# Save this as zkQuorum.cfg
#if !_ZK_SERVER_CONFIG_FILE_IS_INCLUDED
#define _ZK_SERVER_CONFIG_FILE_IS_INCLUDED = true

//Replace below commented sample auth configuration with output from the command "zkauth -g" on the command line
_zlzk.auth=#com.zlti.zlzookeeper.ZLZKAuth~~/aIpFRJV+AkUAxTpiXuKbxggADMgJwSSbqk6eDR1mu+hzrO/H923Q/jbLTrNqXnGVt+DmJkd7B0BqsMBzCJWCA==

// id,machine,clientPort,peerPort,electionPort,dataDir,[hostname]
zkQuorum.1=1~~zlzookeeper-0~~2181~~2888~~3888~~/var/ZipLip/DATA/ZooKeeper/zk1_2888~~zlzookeeper-0.zk-hs.default.svc.cluster.local
zkQuorum.2=2~~zlzookeeper-1~~2181~~2888~~3888~~/var/ZipLip/DATA/ZooKeeper/zk2_2888~~zlzookeeper-1.zk-hs.default.svc.cluster.local
zkQuorum.3=3~~zlzookeeper-2~~2181~~2888~~3888~~/var/ZipLip/DATA/ZooKeeper/zk3_2888~~zlzookeeper-2.zk-hs.default.svc.cluster.local

acv.zkQuorum=#wsi.config.AllConfigVariables~~@NAMES_THAT_START_WITH@~~zkQuorum.

#endif

# Create ConfigMap
kubectl create configmap zk-quorum-config --from-file=zkQuorum.cfg=zkQuorum.cfg
```

## Step 5: Deploy ZooKeeper StatefulSet

### 5.1 Update StatefulSet Configuration
Modify the ZooKeeper StatefulSet for us-east-1:

```yaml
# Key changes needed in yaml/zlzookeeper-statefulset.yaml:
# 1. Update image to us-east-1 ECR
image: 995553364920.dkr.ecr.us-east-1.amazonaws.com/ue1-zlps-ecr-01:zlzookeeper11.1.0-b1140

# 2. Add init container for myid creation
initContainers:
- name: init-zookeeper
  image: busybox
  command:
    - sh
    - -c
    - echo $(( ${HOSTNAME##*-} + 1 )) > /var/ZipLip/DATA/ZooKeeper/myid
  volumeMounts:
    - name: zlzkdata
      mountPath: /var/ZipLip/DATA/ZooKeeper

# 3. Add config map volume mount
volumeMounts:
  - name: zk-quorum-config
    mountPath: /opt/ZipLip/ZLZooKeeper/config/zkQuorum.cfg
    subPath: zkQuorum.cfg

# 4. Add volumes section
volumes:
  - name: zk-quorum-config
    configMap:
      name: zk-quorum-config
```

### 5.2 Apply the StatefulSet
```bash
kubectl apply -f yaml/zlzookeeper-statefulset.yaml
```

## Step 6: Verify Deployment

### 6.1 Check Pod Status
```bash
kubectl get pods -l app=zlzookeeper
kubectl get pvc
```

Expected: All 3 pods Running, PVCs Bound.

### 6.2 Check Services
```bash
kubectl get svc zk-cs
kubectl get svc zk-hs
```

### 6.3 Verify ZooKeeper Logs
```bash
kubectl logs zlzookeeper-0
kubectl logs zlzookeeper-1
kubectl logs zlzookeeper-2
```

Look for: "Peer state changed: following/leading - broadcast"

## Step 7: Test ZooKeeper Connectivity

### 7.1 Test from within cluster
```bash
# Connect to a ZooKeeper pod
kubectl exec -it zlzookeeper-0 -- bash

# Test ZooKeeper client
/opt/ZipLip/ZLZooKeeper/bin/zkCli.sh -server localhost:2181
```

### 7.2 Test service connectivity
```bash
# Test client service
kubectl run test-zk --image=busybox --rm -it --restart=Never -- sh
# Inside container: telnet zk-cs 2181
```

## Troubleshooting

### Common Issues

1. **PVCs stuck in Pending**
   - Check storage class: `kubectl get storageclass`
   - Check CSI driver: `kubectl get pods -n kube-system -l app.kubernetes.io/name=aws-ebs-csi-driver`

2. **Pods in CrashLoopBackOff**
   - Check logs: `kubectl logs <pod-name>`
   - Verify config: `kubectl describe configmap zk-quorum-config`

3. **Image pull errors**
   - Check secret: `kubectl get secrets docker-secret`
   - Verify ECR access: `aws ecr list-images --repository-name ue1-zlps-ecr-01 --region us-east-1`

4. **IAM permission errors**
   - Check addon status: `aws eks describe-addon --cluster-name use1-zlps-eks-01 --addon-name aws-ebs-csi-driver --region us-east-1`
   - Verify role: `aws iam get-role --role-name AmazonEKS_EBS_CSI_DriverRole_us-east-1 --region us-east-1`

## Post-Deployment Tasks

1. **Update Application Configurations**
   - Point applications to `zk-cs.default.svc.cluster.local:2181`
   - Update any hardcoded ZooKeeper endpoints

2. **Configure Monitoring**
   - Set up alerts for ZooKeeper cluster health
   - Configure log aggregation

3. **Backup Strategy**
   - Implement regular PVC snapshots
   - Document restore procedures

4. **Documentation**
   - Update runbooks with us-east-1 specific information
   - Document region-specific configurations

## Summary

Following these steps will result in:
- ✅ 3-node ZooKeeper cluster in us-east-1
- ✅ EBS persistent storage configured
- ✅ Proper IAM roles and policies
- ✅ Region-specific ECR integration
- ✅ Isolated from us-west-1 environment

The deployment maintains complete separation between regions while providing identical functionality in each environment.</content>
<parameter name="filePath">c:\Projects\aws-zl\DG03\zookeeperEast.md