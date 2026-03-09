# AWS us-west-1 EKS Deployment How-To Guide
## Using the Cloud Deployment Toolkit

**Target Environment:** AWS us-west-1 (N. California)  
**AWS Account:** 995553364920  
**EKS Cluster:** ZLPS-AWS-01  
**Document Date:** November 30, 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Current Environment Status](#current-environment-status)
3. [Phase 1: Prerequisites & Setup](#phase-1-prerequisites--setup)
4. [Phase 2: Cluster Configuration (Private Endpoint)](#phase-2-cluster-configuration-private-endpoint)
5. [Phase 3: Storage Setup](#phase-3-storage-setup)
6. [Phase 4: Application Deployment](#phase-4-application-deployment)
7. [Phase 5: Operations & Monitoring](#phase-5-operations--monitoring)
8. [Quick Reference Commands](#quick-reference-commands)

---

## Overview

This guide maps the AWS Deploy.txt deployment phases to the **Cloud Deployment Toolkit** tabs, providing step-by-step instructions for deploying to the us-west-1 EKS environment.

### Toolkit Tabs → AWS Deploy Phases Mapping

| Toolkit Tab | AWS Deploy Phase | Purpose |
|-------------|------------------|---------|
| **Setup** | Phase 1: Prerequisites | Install/verify Docker, kubectl, AWS CLI |
| **Cloud** | Phase 1: Prerequisites | Configure AWS credentials for us-west-1 |
| **Network** | Phase 2: Cluster Config | Private endpoint, subnets, security groups, bastion |
| **Storage** | Phase 3: Storage Setup | EBS/EFS CSI drivers, StorageClasses, PVCs |
| **Docker** | Phase 4: App Deployment | Build/manage local images |
| **K8s** | Phase 4: App Deployment | Deploy to Kubernetes, manage pods/services |
| **Operations** | Phase 5: Operations | ConfigMaps, Secrets, Monitoring, Troubleshooting |
| **Advanced** | Phase 5: Operations | Helm, StatefulSets, Port Forwarding, Bastion Setup |

---

## Current Environment Status

Based on the application logs, the us-west-1 environment has the following configuration:

| Component | Value | Status |
|-----------|-------|--------|
| AWS Region | `us-west-1` | ✅ Configured |
| AWS Account ID | `995553364920` | ✅ Configured |
| Secrets Manager ARN | `arn:aws:secretsmanager:us-west-1:995553364920:secret:zlaws/ZLPS-AWS-01-*` | ✅ Created |
| Authentication | AWS Secrets Manager | ✅ Configured |
| EKS Cluster | Pending verification | ⏳ Verify |
| VPC/Subnets | Pending verification | ⏳ Verify |
| Storage (EBS/EFS) | Pending setup | ❌ Required |

---

## Phase 1: Prerequisites & Setup

### Step 1.1: Verify Prerequisites (Setup Tab)

1. **Open Cloud Deployment Toolkit**
   - Navigate to the application in your browser
   - Click **"Cloud Deployment Toolkit"** in the navigation menu

2. **Check Prerequisites Status**
   - The **Setup** tab displays automatically
   - Look for the status summary at the top:
     - ✅ Green checkmarks = Installed
     - ⚠️ Yellow warnings = Missing (needs installation)

3. **Required Tools Checklist**

   | Tool | Required | Installation Command |
   |------|----------|---------------------|
   | Docker | ✅ Yes | [Install Docker Desktop](https://www.docker.com/products/docker-desktop) |
   | kubectl | ✅ Yes | `winget install -e --id Kubernetes.kubectl` |
   | AWS CLI | ✅ Yes (for us-west-1) | `winget install -e --id Amazon.AWSCLI` |
   | Helm | Optional | `winget install -e --id Helm.Helm` |

4. **Verify AWS CLI Installation**
   ```powershell
   aws --version
   # Expected: aws-cli/2.x.x Python/3.x.x Windows/10 ...
   ```

### Step 1.2: Configure AWS Credentials (Cloud Tab)

1. **Switch to Cloud Tab**
   - Click the **Cloud** tab in the toolkit

2. **Add AWS Credentials**
   - Click **"Add Credentials"** or use existing credentials
   - Fill in:
     - **Name**: `ZLPS-AWS-01`
     - **Cloud Provider**: AWS
     - **Authentication Type**: AWS Secrets Manager
     - **AWS Account ID**: `995553364920`
     - **Region**: `us-west-1`
     - **Secrets Manager ARN**: `arn:aws:secretsmanager:us-west-1:995553364920:secret:zlaws/ZLPS-AWS-01`

3. **Verify Connection**
   - Click **"Test Connection"**
   - Confirm ✅ success message

### Step 1.3: Configure kubectl for EKS

1. **Update kubeconfig** (Run in terminal)
   ```powershell
   aws eks --region us-west-1 update-kubeconfig --name ZLPS-AWS-01
   ```

2. **Verify Connection** (Back in Setup tab)
   - Click **"Re-check"** button
   - Kubeconfig section should show:
     - ✅ Current Context: `arn:aws:eks:us-west-1:995553364920:cluster/ZLPS-AWS-01`
     - ✅ Connected to cluster

3. **Troubleshooting Kubeconfig**
   ```powershell
   # Check current context
   kubectl config current-context
   
   # List all contexts
   kubectl config get-contexts
   
   # Test connection
   kubectl get nodes
   ```

---

## Phase 2: Cluster Configuration (Private Endpoint)

### Step 2.1: Review Cluster Endpoint Configuration (Network Tab)

1. **Switch to Network Tab**
   - Click the **Network** tab

2. **View Endpoint Configuration**
   - The **Cluster Endpoint Config** section shows:
     - Public Access: Enabled/Disabled
     - Private Access: Enabled/Disabled

3. **Check Current State**
   | Setting | For Private Cluster | Your Status |
   |---------|---------------------|-------------|
   | Public Access | ❌ `false` | ⏳ Verify |
   | Private Access | ✅ `true` | ⏳ Verify |

4. **If Conversion to Private is Needed**
   - Toggle the switches in the UI, or
   - Run manually:
   ```powershell
   aws eks update-cluster-config `
     --region us-west-1 `
     --name ZLPS-AWS-01 `
     --resources-vpc-config endpointPublicAccess=false,endpointPrivateAccess=true
   ```

### Step 2.2: Configure Subnets for Internal Load Balancers (Network Tab)

1. **View Subnet Configuration**
   - In the **Network** tab, expand **Subnets** section
   - Look for the subnet tags:

   | Subnet Type | Required Tag | Purpose |
   |-------------|--------------|---------|
   | Private | `kubernetes.io/role/internal-elb=1` | Internal LBs |
   | Public | Remove `kubernetes.io/role/elb` | Prevent internet-facing LBs |

2. **Tag Private Subnets (if needed)**
   ```powershell
   # Get cluster subnets
   aws eks describe-cluster --name ZLPS-AWS-01 --region us-west-1 `
     --query "cluster.resourcesVpcConfig.subnetIds" --output text
   
   # Tag private subnets for internal ELB
   aws ec2 create-tags `
     --resources subnet-xxxxx subnet-yyyyy subnet-zzzzz `
     --tags Key=kubernetes.io/role/internal-elb,Value=1 `
     --region us-west-1
   ```

### Step 2.3: Configure Security Groups (Network Tab)

1. **View Security Groups**
   - In **Network** tab, expand **Security Groups** section
   - Verify the following groups exist:

   | Security Group | Purpose | Inbound Rules |
   |----------------|---------|---------------|
   | Bastion SG | RDP access to bastion | TCP 3389 from your IP |
   | Node SG | EKS worker nodes | TCP 30000-32767 from Bastion SG |
   | ELB SG | Load balancers | TCP 80/443 from VPC CIDR |

2. **Create Bastion Security Group (if needed)**
   ```powershell
   # Get VPC ID
   $VpcId = aws eks describe-cluster --name ZLPS-AWS-01 --region us-west-1 `
     --query "cluster.resourcesVpcConfig.vpcId" --output text
   
   # Create security group
   aws ec2 create-security-group `
     --region us-west-1 `
     --group-name ZLPS-Bastion-SG `
     --description "Allow RDP from specific IP only" `
     --vpc-id $VpcId
   
   # Add RDP rule (replace YOUR_IP)
   aws ec2 authorize-security-group-ingress `
     --region us-west-1 `
     --group-id sg-xxxxx `
     --protocol tcp `
     --port 3389 `
     --cidr YOUR_IP/32
   ```

### Step 2.4: Bastion Host Setup Guide (Advanced Tab)

1. **Switch to Advanced Tab**
   - Click the **Advanced** tab

2. **View Bastion Setup Guide**
   - Scroll to **Bastion & Private Cluster Access** section
   - Click **"Get Setup Guide"** button
   - The guide provides AWS-specific instructions for:
     - Creating a Windows bastion EC2 instance
     - Configuring security groups
     - Connecting via RDP
     - Running kubectl from bastion

3. **Key Bastion Requirements**
   - Must be in **same VPC** as EKS cluster
   - Must have **private subnet access**
   - AWS CLI and kubectl installed on bastion

---

## Phase 3: Storage Setup

### Step 3.1: Install CSI Drivers (Storage Tab)

1. **Switch to Storage Tab**
   - Click the **Storage** tab

2. **Check CSI Driver Status**
   - The **CSI Drivers** section shows:
     - EBS CSI Driver: ✅ Installed / ❌ Not Installed
     - EFS CSI Driver: ✅ Installed / ❌ Not Installed

3. **Install EBS CSI Driver (if needed)**
   ```powershell
   # Set variables
   $CLUSTER_NAME = "ZLPS-AWS-01"
   $AWS_ACCOUNT_ID = "995553364920"
   $REGION = "us-west-1"
   
   # Create IAM service account
   eksctl create iamserviceaccount `
     --name ebs-csi-controller-sa `
     --namespace kube-system `
     --cluster $CLUSTER_NAME `
     --attach-policy-arn arn:aws:iam::${AWS_ACCOUNT_ID}:policy/AmazonEBSCSIDriverPolicy `
     --approve `
     --role-name AmazonEKS_EBS_CSI_DriverRole
   
   # Install addon
   aws eks create-addon `
     --cluster-name $CLUSTER_NAME `
     --addon-name aws-ebs-csi-driver `
     --service-account-role-arn arn:aws:iam::${AWS_ACCOUNT_ID}:role/AmazonEKS_EBS_CSI_DriverRole `
     --region $REGION
   ```

4. **Install EFS CSI Driver (if needed)**
   ```powershell
   # Using Helm (from Advanced tab)
   helm repo add aws-efs-csi-driver https://kubernetes-sigs.github.io/aws-efs-csi-driver/
   helm repo update
   
   helm install aws-efs-csi-driver aws-efs-csi-driver/aws-efs-csi-driver `
     --namespace kube-system `
     --set controller.serviceAccount.create=true `
     --set controller.serviceAccount.name=efs-csi-controller-sa
   ```

### Step 3.2: Create Storage Classes (Storage Tab)

1. **View StorageClass Templates**
   - In **Storage** tab, click **"Create StorageClass"**
   - Select template: **AWS EBS gp3**

2. **Create EBS StorageClass**
   - Fill in the form:
     - **Name**: `ebs-sc`
     - **Provisioner**: `ebs.csi.aws.com`
     - **Reclaim Policy**: `Delete`
     - **Volume Binding Mode**: `WaitForFirstConsumer`
     - **Allow Expansion**: ✅ Yes
   - Click **"Create"**

3. **Create EFS StorageClass (for shared storage)**
   - Fill in the form:
     - **Name**: `efs-sc`
     - **Provisioner**: `efs.csi.aws.com`
     - **Reclaim Policy**: `Retain`
   - Click **"Create"**

### Step 3.3: Create PersistentVolumeClaims (Storage Tab)

1. **Create Zookeeper PVC**
   - Click **"Create PVC"**
   - Fill in:
     - **Name**: `zk-pvc`
     - **Namespace**: `default`
     - **StorageClass**: `ebs-sc`
     - **Access Mode**: `ReadWriteOnce`
     - **Storage**: `20Gi`
   - Click **"Create"**

2. **Create Shared EFS PVC (if needed)**
   - Click **"Create PVC"**
   - Fill in:
     - **Name**: `efs-pvc`
     - **Namespace**: `default`
     - **StorageClass**: `efs-sc`
     - **Access Mode**: `ReadWriteMany`
     - **Storage**: `5Gi`
   - Click **"Create"**

3. **Verify PVCs**
   - Check the PVC list shows status: **Bound**

---

## Phase 4: Application Deployment

### Step 4.1: Build Docker Images (Docker Tab)

1. **Switch to Docker Tab**
   - Click the **Docker** tab

2. **View Local Images**
   - The Docker browser shows all local images
   - Required images for deployment:
     - `zlaws-backend:v1`
     - `zlaws-postgres:v1`
     - `zlaws-nginx:v1`
     - Your application images

3. **Build Images (if needed)**
   ```powershell
   # Navigate to project root
   cd C:\Projects\ZLAWS\automated-eks-deployer
   
   # Build all images
   .\build-images.ps1
   ```

### Step 4.2: Push Images to ECR (Cloud Tab)

1. **Switch to Cloud Tab**
   - Click the **Cloud** tab
   - Select your **ZLPS-AWS-01** credentials

2. **Select Region**
   - Choose **us-west-1** from the dropdown

3. **View/Create ECR Repositories**
   - Click on **Container Registries** section
   - Create repositories if needed:
     - `zlaws-backend`
     - `zlaws-postgres`
     - `zlaws-nginx`

4. **Push Images**
   - Select a local image from Docker tab
   - Click **"Push to Registry"**
   - Select target ECR repository
   - Confirm push

   **Manual Push (if needed):**
   ```powershell
   # Authenticate Docker to ECR
   aws ecr get-login-password --region us-west-1 | `
     docker login --username AWS --password-stdin 995553364920.dkr.ecr.us-west-1.amazonaws.com
   
   # Tag and push
   docker tag zlaws-backend:v1 995553364920.dkr.ecr.us-west-1.amazonaws.com/zlaws-backend:v1
   docker push 995553364920.dkr.ecr.us-west-1.amazonaws.com/zlaws-backend:v1
   ```

### Step 4.3: Deploy to Kubernetes (K8s Tab)

1. **Switch to K8s Tab**
   - Click the **K8s** tab

2. **Create Namespace (if needed)**
   - Click **"Create Namespace"**
   - Name: `zlaws` or `zlui`

3. **Quick Deploy**
   - Select an image from your Docker/ECR list
   - Click **"Quick Deploy"**
   - Fill in deployment details:
     - **Deployment Name**: `zlui`
     - **Namespace**: `default`
     - **Replicas**: `2`
     - **Port**: `80`
     - **Create Service**: ✅ Yes
     - **Service Type**: `LoadBalancer`

4. **Add Internal LB Annotation**
   - Switch to **YAML** mode in Quick Deploy dialog
   - Add annotation to Service section:
   ```yaml
   metadata:
     annotations:
       service.beta.kubernetes.io/aws-load-balancer-internal: "true"
   ```

5. **Deploy StatefulSets (Advanced Tab)**
   - For Zookeeper and other stateful apps
   - Switch to **Advanced** tab → **StatefulSets** section
   - Select template: **Zookeeper**
   - Configure:
     - **Name**: `zlzookeeper`
     - **Replicas**: `3`
     - **Storage**: `20Gi`
     - **StorageClass**: `ebs-sc`
   - Click **"Create"**

### Step 4.4: Verify Deployment (K8s Tab)

1. **Check Pods**
   - Expand namespace in K8s browser
   - Verify all pods show: ✅ Running

2. **Check Services**
   - Click on a service to view details
   - Note the LoadBalancer DNS name (internal)

3. **Check Events**
   - Bottom panel shows Kubernetes events
   - Look for warnings or errors

---

## Phase 5: Operations & Monitoring

### Step 5.1: ConfigMaps & Secrets (Operations Tab)

1. **Switch to Operations Tab**
   - Click the **Operations** tab

2. **Create ConfigMaps**
   - Click **"Create ConfigMap"**
   - Add configuration key-value pairs:
     - **Name**: `zlui-config`
     - **Data**: Your application configuration

3. **Create Secrets**
   - Click **"Create Secret"**
   - Add sensitive data:
     - **Name**: `zlui-secrets`
     - **Type**: `Opaque`
     - **Data**: Base64-encoded secrets

### Step 5.2: Monitoring Setup (Operations Tab)

1. **Check Metrics Server**
   - In Operations tab, view **Cluster Health** section
   - Metrics Server status should be ✅ Installed

2. **Install Metrics Server (if needed)**
   ```powershell
   kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
   ```

3. **View Resource Usage**
   - **Node Metrics**: CPU/Memory per node
   - **Pod Metrics**: CPU/Memory per pod

### Step 5.3: Cluster Autoscaling (Operations Tab)

1. **View Autoscaler Status**
   - Check **Cluster Autoscaler** section
   - Status: ✅ Running / ❌ Not Installed

2. **Configure Autoscaling (if needed)**
   ```powershell
   # Create IAM policy and service account
   eksctl create iamserviceaccount `
     --name cluster-autoscaler `
     --namespace kube-system `
     --cluster ZLPS-AWS-01 `
     --attach-policy-arn arn:aws:iam::995553364920:policy/AmazonEKSClusterAutoscalerPolicy `
     --approve
   
   # Deploy autoscaler
   kubectl apply -f cluster-autoscaler.yaml
   ```

### Step 5.4: Troubleshooting (Operations Tab)

1. **Use Troubleshooting Workflow**
   - Select issue type from dropdown:
     - Pod Not Starting
     - Service Not Accessible
     - Volume Mount Error
     - Node Issues
   - Follow the step-by-step checklist

2. **Common Issues**
   | Issue | Check | Resolution |
   |-------|-------|------------|
   | Pod Pending | `kubectl describe pod <name>` | Check resources, node capacity |
   | ImagePullBackOff | ECR permissions | Verify IAM roles, image tag |
   | CrashLoopBackOff | Pod logs | Fix application errors |
   | LB not accessible | Security groups | Add bastion SG ingress |

### Step 5.5: Port Forwarding for Private Cluster (Advanced Tab)

1. **Switch to Advanced Tab**

2. **Create Port Forward**
   - Click **"Create Port Forward"**
   - Configure:
     - **Resource Type**: `pod` or `service`
     - **Resource Name**: Select from list
     - **Local Port**: `8080`
     - **Remote Port**: `80`
   - Click **"Start"**

3. **Access Application**
   - Open browser: `http://localhost:8080`

---

## Quick Reference Commands

### AWS CLI Commands
```powershell
# Update kubeconfig
aws eks --region us-west-1 update-kubeconfig --name ZLPS-AWS-01

# Describe cluster
aws eks describe-cluster --name ZLPS-AWS-01 --region us-west-1

# Check endpoint config
aws eks describe-cluster --name ZLPS-AWS-01 --region us-west-1 `
  --query "cluster.resourcesVpcConfig.{Public:endpointPublicAccess,Private:endpointPrivateAccess}"

# ECR login
aws ecr get-login-password --region us-west-1 | docker login --username AWS --password-stdin 995553364920.dkr.ecr.us-west-1.amazonaws.com
```

### kubectl Commands
```powershell
# Cluster info
kubectl cluster-info
kubectl get nodes -o wide

# Workloads
kubectl get pods -A
kubectl get deployments -A
kubectl get services -A

# Storage
kubectl get pv,pvc -A
kubectl get storageclass

# Logs & Debug
kubectl logs -f <pod-name>
kubectl describe pod <pod-name>
kubectl exec -it <pod-name> -- /bin/bash

# Events
kubectl get events -A --sort-by='.lastTimestamp'
```

### Docker Commands
```powershell
# List images
docker images

# Build
docker build -t zlaws-backend:v1 -f Dockerfile .

# Tag for ECR
docker tag zlaws-backend:v1 995553364920.dkr.ecr.us-west-1.amazonaws.com/zlaws-backend:v1

# Push to ECR
docker push 995553364920.dkr.ecr.us-west-1.amazonaws.com/zlaws-backend:v1
```

---

## Checklist Summary

### Pre-Deployment Checklist
- [ ] AWS CLI installed and configured
- [ ] kubectl installed and connected to cluster
- [ ] Docker Desktop running
- [ ] AWS credentials configured in Toolkit
- [ ] kubeconfig updated for us-west-1 cluster

### Cluster Configuration Checklist
- [ ] Endpoint configured (public/private as needed)
- [ ] Subnets tagged for internal ELB
- [ ] Security groups configured
- [ ] Bastion host accessible (for private cluster)

### Storage Checklist
- [ ] EBS CSI driver installed
- [ ] EFS CSI driver installed (if using shared storage)
- [ ] StorageClasses created (ebs-sc, efs-sc)
- [ ] PVCs created and bound

### Deployment Checklist
- [ ] Docker images built
- [ ] Images pushed to ECR
- [ ] Deployments created
- [ ] Services created with internal LB annotation
- [ ] Pods running
- [ ] Load balancers provisioned

### Operations Checklist
- [ ] ConfigMaps created
- [ ] Secrets created
- [ ] Metrics server installed
- [ ] Cluster autoscaler configured (optional)
- [ ] Monitoring dashboard accessible

---

## Support & Resources

- **AWS Deploy Reference**: `issues/AWS Deploy.txt`
- **API Documentation**: `docs/API_REFERENCE_COMPLETE.md`
- **Deployment Guide**: `docs/DEPLOYMENT_GUIDE.md`
- **Docker Images Guide**: `docs/DOCKER_IMAGES_GUIDE.md`
- **Troubleshooting**: Use Operations tab → Troubleshooting section

---

*Document generated for ZLPS-AWS-01 us-west-1 deployment using Cloud Deployment Toolkit*
