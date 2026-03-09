# ZL Application AWS EKS Deployment Guide

**Version:** 1.0  
**Last Updated:** December 10, 2025  
**Cluster:** usw1-zlps-eks-01  
**Region:** us-west-1  

---

## EXECUTIVE SUMMARY

### About This Document
This document provides a comprehensive guide for deploying the ZL Application on Amazon Elastic Kubernetes Service (EKS). It captures all steps taken during the initial deployment, including AWS resource provisioning, Kubernetes configuration, storage setup, and application deployment.

### Purpose
- Serve as a reference for the deployed ZL application infrastructure
- Enable reproducibility for future deployments or disaster recovery
- Document architectural decisions and configurations
- Provide troubleshooting guidance for common issues

### Deployment Overview
The ZL Application is deployed as a containerized microservices architecture:

```
  ┌─────────────────────────────────────────────────────────────────────┐
  │                        AWS EKS Cluster                              │
  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────────────────┐ │
  │  │  zlui   │  │zlserver │  │ zltika  │  │ zlzookeeper (x3 pods)   │ │
  │  │  (UI)   │  │(Backend)│  │ (Docs)  │  │ (Coordination)          │ │
  │  └────┬────┘  └────┬────┘  └────┬────┘  └────────────┬────────────┘ │
  │       │            │            │                    │              │
  │       └────────────┴────────────┴────────────────────┘              │
  │                              │                                      │
  │  ┌───────────────────────────┴───────────────────────────────────┐  │
  │  │                    Shared EFS Storage                         │  │
  │  │   /zlvault  /zluilogs  /zltikatemp  /zlserverlogs             │  │
  │  └───────────────────────────────────────────────────────────────┘  │
  └─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │   RDS SQL Server (ZLDB)       │
                    │   usw1-zlps-msexpsql-01-eks   │
                    └───────────────────────────────┘
```

### Key Components

| Component          | Technology              | Purpose                        |
|--------------------|-------------------------|--------------------------------|
| Container Runtime  | AWS EKS 1.34            | Kubernetes orchestration       |
| Worker Nodes       | m5.xlarge (2-5 nodes)   | Application compute            |
| Container Registry | AWS ECR                 | Docker image storage           |
| Shared Storage     | AWS EFS                 | Logs, temp files, vault data   |
| Block Storage      | AWS EBS (gp3)           | ZooKeeper persistent data      |
| Database           | AWS RDS SQL Server      | Application database           |
| Load Balancer      | AWS ALB                 | Public internet access         |
| DNS                | Kubernetes internal DNS | Service discovery              |

### Access Information

| Resource           | Endpoint/URL                                                    |
|--------------------|-----------------------------------------------------------------|
| Application URL    | http://k8s-default-zluiingr-e9951b35c2-755748288.us-west-1.elb.amazonaws.com |
| EKS Cluster        | usw1-zlps-eks-01 (us-west-1)                                    |
| Database           | usw1-zlps-msexpsql-01-eks.c5s06occm2dn.us-west-1.rds.amazonaws.com:1433 |
| ECR Repository     | 995553364920.dkr.ecr.us-west-1.amazonaws.com/uw1-zlps-ecr-01    |

### Document Structure
- **Phases 1-11:** Step-by-step deployment commands with explanations
- **Appendix A:** Complete YAML file contents for all Kubernetes resources
- **Appendix B:** EFS access points and Vault directory structure
- **Appendix C:** ConfigMaps and Secrets configuration
- **Appendix D:** Services and networking architecture

---

## Shell/Terminal Compatibility Reference

| Shell             | OS           | Line Continuation | Variable Substitution |
|-------------------|--------------|-------------------|----------------------|
| PowerShell        | Windows      | ` (backtick)      | `$VAR` or `$env:VAR` |
| CMD               | Windows      | ^ (caret)         | `%VAR%`              |
| Bash              | Linux/macOS  | \ (backslash)     | `$VAR` or `${VAR}`   |

**Important Notes:**
- "All Shells" means the command works identically in PowerShell, CMD, and Bash
- kubectl and eksctl commands generally work the same across all shells
- AWS CLI commands may need different quoting/escaping per shell
- Commands that run inside containers (kubectl exec) use bash regardless of host shell
- When in doubt, use the shell-specific example provided

**Quick Reference:**
- **PowerShell:** Use backticks (`) for line continuation, `$()` for command substitution  
- **CMD:** Single-line commands preferred, or use `^` for continuation  
- **Bash:** Use backslash (`\`) for line continuation, `$()` for command substitution

---

## Table of Contents

1. [Environment Overview](#1-environment-overview)
2. [Phase 1: EKS Cluster Creation](#2-phase-1-eks-cluster-creation)
3. [Phase 2: ECR Setup and Image Management](#3-phase-2-ecr-setup-and-image-management)
4. [Phase 3: EBS CSI Driver Installation](#4-phase-3-ebs-csi-driver-installation)
5. [Phase 4: EFS CSI Driver and Storage](#5-phase-4-efs-csi-driver-and-storage)
6. [Phase 5: S3 CSI Driver (Optional)](#6-phase-5-s3-csi-driver-optional)
7. [Phase 6: Database Configuration](#7-phase-6-database-configuration)
8. [Phase 7: ZooKeeper Deployment](#8-phase-7-zookeeper-deployment)
9. [Phase 8: Application Deployment](#9-phase-8-application-deployment-zltika-zlserver-zlui)
10. [Phase 9: Network and Ingress Configuration](#10-phase-9-network-and-ingress-configuration)
11. [Phase 10: Cluster Autoscaling](#11-phase-10-cluster-autoscaling)
12. [Phase 11: Post-Deployment Configuration](#12-phase-11-post-deployment-configuration)
13. [Troubleshooting](#13-troubleshooting)

**Appendices:**
- [Appendix A: YAML File Reference](#appendix-a-yaml-file-reference)
- [Appendix B: EFS Access Points and Vault Mount Structure](#appendix-b-efs-access-points-and-vault-mount-structure)
- [Appendix C: ConfigMaps and Secrets](#appendix-c-configmaps-and-secrets)
- [Appendix D: Services and Networking](#appendix-d-services-and-networking)

---

## 1. Environment Overview

### AWS Resources Created

| Resource Type          | Name/ID                                            | Purpose                    |
|------------------------|----------------------------------------------------|----------------------------|
| EKS Cluster            | usw1-zlps-eks-01                                   | Kubernetes control plane   |
| Node Group             | uw1-zlps-ng-01                                     | Worker nodes (m5.xlarge)   |
| VPC                    | vpc-07644cdd0224da4f3                              | Network isolation          |
| ECR Repository         | uw1-zlps-ecr-01                                    | Container image storage    |
| EFS File System        | fs-0a4ec87cd91178047 (usw1-zlps-efs-01)            | Shared persistent storage  |
| RDS Instance           | usw1-zlps-msexpsql-01-eks                          | SQL Server database        |
| S3 Bucket              | usw1-zlps-app-storage                              | Archive storage            |
| ALB                    | k8s-default-zluiingr-e9951b35c2                    | Public load balancer       |

### Network Configuration

| Subnet ID                   | Type    | Availability Zone | CIDR             |
|-----------------------------|---------|-------------------|------------------|
| subnet-01c24772a882a3a1b    | Public  | us-west-1a        | 192.168.0.0/19   |
| subnet-06eb80d784d985109    | Public  | us-west-1c        | 192.168.32.0/19  |
| subnet-0c861c54ffa4ddbe6    | Private | us-west-1a        | 192.168.64.0/19  |
| subnet-039bd7f435475c3dc    | Private | us-west-1c        | 192.168.96.0/19  |

### Security Groups

| Group ID                | Name                                                    | Purpose              |
|-------------------------|---------------------------------------------------------|----------------------|
| sg-0afb0a3f0c30ba84d    | eksctl-usw1-zlps-eks-01-cluster-ClusterSharedNodeSG     | Node communication   |
| sg-07a77dc047e9fb6fe    | eks-cluster-sg-usw1-zlps-eks-01-6457660                 | Cluster SG           |

### Docker Images

| Image Tag                    | Purpose                           |
|------------------------------|-----------------------------------|
| zlserver-11.0.1-b123         | ZL Server application             |
| zltika-11.0.1-b123           | Document conversion service       |
| zlzookeeper-11.0.1-b123      | ZooKeeper coordination service    |

---

## 2. PHASE 1: EKS Cluster Creation

### STEP 1: Create EKS Cluster

#### Explanation
Creates a managed Amazon EKS (Elastic Kubernetes Service) cluster with an associated node group for running containerized workloads.

#### What It Does
- Provisions a fully managed Kubernetes control plane in AWS
- Creates a managed node group with EC2 instances as worker nodes
- Sets up networking, IAM roles, and security groups automatically
- Configures kubectl context for cluster access

#### Why It's Needed
EKS provides the foundation for running the ZL Application. Without a Kubernetes cluster, there is no platform to deploy containers, manage scaling, or orchestrate the application services.

#### Prerequisite Tasks
- AWS CLI configured with appropriate credentials
- eksctl installed on local machine
- IAM user/role with permissions to create EKS clusters
- Sufficient AWS service quotas for EC2 instances

#### Dependent Tasks
- Step 2: Associate OIDC Provider (requires cluster to exist)
- Step 3: Get Cluster OIDC Issuer
- Step 4: Get Cluster VPC Information
- All subsequent phases depend on cluster availability

#### Code Block

**PowerShell:**
```powershell
eksctl create cluster `
  --name usw1-zlps-eks-01 `
  --version 1.34 `
  --region us-west-1 `
  --nodegroup-name uw1-zlps-ng-01 `
  --node-type m5.xlarge `
  --nodes 2 `
  --nodes-min 1 `
  --nodes-max 2 `
  --managed
```

**Bash:**
```bash
eksctl create cluster \
  --name usw1-zlps-eks-01 \
  --version 1.34 \
  --region us-west-1 \
  --nodegroup-name uw1-zlps-ng-01 \
  --node-type m5.xlarge \
  --nodes 2 \
  --nodes-min 1 \
  --nodes-max 2 \
  --managed
```

**Windows CMD:**
```cmd
eksctl create cluster --name usw1-zlps-eks-01 --version 1.34 --region us-west-1 --nodegroup-name uw1-zlps-ng-01 --node-type m5.xlarge --nodes 2 --nodes-min 1 --nodes-max 2 --managed
```

**Parameter Details:**
| Parameter | Value | Description |
|-----------|-------|-------------|
| `--name` | usw1-zlps-eks-01 | Unique cluster name following naming convention |
| `--version` | 1.34 | Kubernetes version |
| `--region` | us-west-1 | AWS region for deployment |
| `--nodegroup-name` | uw1-zlps-ng-01 | Worker node group identifier |
| `--node-type` | m5.xlarge | EC2 instance type (4 vCPU, 16GB RAM) |
| `--nodes` | 2 | Initial number of worker nodes |
| `--nodes-min` | 1 | Minimum nodes for autoscaling |
| `--nodes-max` | 2 | Maximum nodes for autoscaling |
| `--managed` | - | Use AWS-managed node group |

---

### STEP 2: Associate OIDC Provider

#### Explanation
Associates an IAM OpenID Connect (OIDC) identity provider with the EKS cluster to enable IAM roles for Kubernetes service accounts.

#### What It Does
- Creates an IAM OIDC identity provider linked to the cluster
- Enables Kubernetes service accounts to assume IAM roles
- Establishes trust relationship between Kubernetes and AWS IAM

#### Why It's Needed
Without OIDC association, Kubernetes pods cannot use IAM roles for AWS service access. This is required for:
- EBS CSI Driver to create/attach EBS volumes
- EFS CSI Driver to mount EFS file systems
- S3 CSI Driver to access S3 buckets
- Any pod needing AWS API access

#### Prerequisite Tasks
- Step 1: EKS Cluster must be created and active

#### Dependent Tasks
- Step 13: Create IAM Service Account for EBS CSI Driver
- Step 17: Create IAM Service Account for EFS CSI Driver
- All CSI driver installations

#### Code Block

**All Shells (PowerShell, Bash, CMD):**
```bash
eksctl utils associate-iam-oidc-provider --region us-west-1 --cluster usw1-zlps-eks-01 --approve
```

---

### STEP 3: Get Cluster OIDC Issuer

#### Explanation
Retrieves the OIDC issuer URL from the EKS cluster, which is needed for creating IAM trust policies.

#### What It Does
- Queries the EKS cluster for its OIDC issuer endpoint
- Returns the URL used in IAM role trust policies
- Provides the identity provider identifier

#### Why It's Needed
The OIDC issuer URL is required when creating IAM roles that Kubernetes service accounts can assume. Trust policies must reference this exact URL.

#### Prerequisite Tasks
- Step 1: EKS Cluster created
- Step 2: OIDC Provider associated

#### Dependent Tasks
- Creating trust policies for IAM roles (EBS, EFS, S3 CSI drivers)

#### Code Block

**All Shells (PowerShell, Bash, CMD):**
```bash
aws eks describe-cluster --name usw1-zlps-eks-01 --region us-west-1 --query "cluster.identity.oidc.issuer" --output text
```

**Expected Output:**
```
https://oidc.eks.us-west-1.amazonaws.com/id/C0CA93DEA5736D0F19AC427D5A0A123E
```

---

### STEP 4: Get Cluster VPC Information

#### Explanation
Retrieves the VPC ID and subnet IDs associated with the EKS cluster for configuring additional AWS resources.

#### What It Does
- Queries cluster configuration for networking details
- Returns VPC ID where cluster is deployed
- Lists all subnet IDs (public and private)

#### Why It's Needed
Additional AWS resources (EFS, RDS, security groups) must be deployed in the same VPC as the EKS cluster. The subnet and VPC information is required for:
- Creating EFS mount targets in each subnet
- Configuring RDS database connectivity
- Setting up security group rules

#### Prerequisite Tasks
- Step 1: EKS Cluster created

#### Dependent Tasks
- Step 19: Create EFS File System
- Step 20: Create EFS Mount Targets
- RDS database configuration (Phase 6)

#### Code Block

**All Shells (PowerShell, Bash, CMD):**
```bash
aws eks describe-cluster --name usw1-zlps-eks-01 --query "cluster.resourcesVpcConfig.{VPC: vpcId, Subnets: subnetIds}" --output table
```

**Expected Output:**
```
--------------------------------------------------
|               DescribeCluster                  |
+-------+----------------------------------------+
|  VPC  |  vpc-07644cdd0224da4f3                 |
+-------+----------------------------------------+
||                   Subnets                    ||
|+----------------------------------------------+|
||  subnet-01c24772a882a3a1b                    ||
||  subnet-06eb80d784d985109                    ||
||  subnet-0c861c54ffa4ddbe6                    ||
||  subnet-039bd7f435475c3dc                    ||
|+----------------------------------------------+|
```

---

## 3. PHASE 2: ECR Setup and Image Management

### Overview

Amazon Elastic Container Registry (ECR) is AWS's private Docker image registry. This phase sets up the container registry where your application images are stored and creates the necessary credentials for EKS to pull these images.

### Why ECR Is Needed
- Provides secure, private storage for your proprietary container images
- Integrates natively with AWS IAM for access control
- Eliminates need to manage your own Docker registry infrastructure
- Images are stored close to your EKS cluster for fast pulls
- Supports image scanning for security vulnerabilities

### Images Stored In This Repository

| Image Tag                | Size    | Purpose                              |
|--------------------------|---------|--------------------------------------|
| zlserver-11.0.1-b123     | ~800MB  | ZL Server/UI application             |
| zltika-11.0.1-b123       | ~600MB  | Document conversion (Apache Tika)    |
| zlzookeeper-11.0.1-b123  | ~400MB  | ZooKeeper coordination service       |

---

### STEP 5: Create ECR Repository

#### Explanation
Creates a private Amazon Elastic Container Registry repository to store Docker images for the ZL Application.

#### What It Does
- Provisions a private Docker registry in your AWS account
- Enables automatic vulnerability scanning on image push
- Generates a unique repository URI for image references

#### Why It's Needed
EKS pods need to pull container images from a registry. Public registries like Docker Hub have rate limits and expose images publicly. ECR provides:
1. Unlimited pulls within AWS (no rate limiting)
2. Private storage (only your AWS account can access)
3. IAM-based security (integrates with AWS permissions)
4. Regional storage (fast pulls from same region as EKS)

#### Prerequisite Tasks
- AWS CLI configured with ECR permissions
- Step 1-4: EKS cluster created (though ECR can be created independently)

#### Dependent Tasks
- Step 6: Verify ECR Repository
- Step 7: Authenticate Docker to ECR
- Step 8: Push Images to ECR
- All application deployments reference this repository

#### Code Block

**All Shells (PowerShell, Bash, CMD):**
```bash
aws ecr create-repository --repository-name uw1-zlps-ecr-01 --region us-west-1 --image-scanning-configuration scanOnPush=true
```

**Expected Output:**
```json
{
    "repository": {
        "repositoryArn": "arn:aws:ecr:us-west-1:995553364920:repository/uw1-zlps-ecr-01",
        "repositoryUri": "995553364920.dkr.ecr.us-west-1.amazonaws.com/uw1-zlps-ecr-01",
        "registryId": "995553364920",
        "repositoryName": "uw1-zlps-ecr-01"
    }
}
```

**Key Values:**
| Field | Value | Usage |
|-------|-------|-------|
| repositoryUri | 995553364920.dkr.ecr.us-west-1.amazonaws.com/uw1-zlps-ecr-01 | Used in all deployment YAML files |

---

### STEP 6: Verify ECR Repository

#### Explanation
Confirms the ECR repository exists and is accessible before proceeding with image operations.

#### What It Does
- Validates repository creation was successful
- Returns repository details including URI
- Confirms IAM permissions are correct

#### Why It's Needed
Before pushing images or deploying pods, verify the repository exists. This catches configuration errors early rather than debugging "image not found" errors later.

#### Prerequisite Tasks
- Step 5: ECR Repository created

#### Dependent Tasks
- Step 7: Authenticate Docker to ECR

#### Code Block

**All Shells (PowerShell, Bash, CMD):**
```bash
aws ecr describe-repositories --repository-names uw1-zlps-ecr-01 --region us-west-1
```

---

### STEP 7: Authenticate Docker to ECR

#### Explanation
Logs Docker into ECR so you can push container images to the private repository.

#### What It Does
- Generates a temporary authentication token (valid 12 hours)
- Authenticates the local Docker client with ECR
- Enables `docker push` commands to the ECR registry

#### Why It's Needed
ECR is a private registry that requires authentication. Without logging in first, `docker push` commands will fail with "unauthorized" errors.

#### Prerequisite Tasks
- Step 5: ECR Repository created
- Docker installed and running locally

#### Dependent Tasks
- Step 8: Push Images to ECR

#### Code Block

**PowerShell:**
```powershell
aws ecr get-login-password --region us-west-1 | docker login --username AWS --password-stdin 995553364920.dkr.ecr.us-west-1.amazonaws.com
```

**Bash:**
```bash
aws ecr get-login-password --region us-west-1 | docker login --username AWS --password-stdin 995553364920.dkr.ecr.us-west-1.amazonaws.com
```

**Windows CMD:**
```cmd
aws ecr get-login-password --region us-west-1 > ecr-password.txt
set /p ECR_PASSWORD=<ecr-password.txt
docker login --username AWS --password %ECR_PASSWORD% 995553364920.dkr.ecr.us-west-1.amazonaws.com
del ecr-password.txt
```

**Expected Output:**
```
Login Succeeded
```

---

### STEP 8: Push Images to ECR

#### Explanation
Uploads the ZL Application container images from your local machine to ECR.

#### What It Does
- Tags local Docker images with the ECR repository URI
- Uploads image layers to ECR storage
- Makes images available for EKS pods to pull

#### Why It's Needed
Container images must exist in ECR before EKS can deploy them. The deployment YAML files reference these exact image URIs.

#### Prerequisite Tasks
- Step 7: Docker authenticated to ECR
- Local Docker images built (zlserver, zltika, zlzookeeper)

#### Dependent Tasks
- Step 9: Verify images uploaded
- Step 32-37: Application deployments

#### Code Block

**All Shells (PowerShell, Bash, CMD):**
```bash
# Tag local images for ECR
docker tag zlserver:11.0.1-b123 995553364920.dkr.ecr.us-west-1.amazonaws.com/uw1-zlps-ecr-01:zlserver-11.0.1-b123
docker tag zltika:11.0.1-b123 995553364920.dkr.ecr.us-west-1.amazonaws.com/uw1-zlps-ecr-01:zltika-11.0.1-b123
docker tag zlzookeeper:11.0.1-b123 995553364920.dkr.ecr.us-west-1.amazonaws.com/uw1-zlps-ecr-01:zlzookeeper-11.0.1-b123

# Push images to ECR
docker push 995553364920.dkr.ecr.us-west-1.amazonaws.com/uw1-zlps-ecr-01:zlserver-11.0.1-b123
docker push 995553364920.dkr.ecr.us-west-1.amazonaws.com/uw1-zlps-ecr-01:zltika-11.0.1-b123
docker push 995553364920.dkr.ecr.us-west-1.amazonaws.com/uw1-zlps-ecr-01:zlzookeeper-11.0.1-b123
```

---

### STEP 9: List Images in ECR

#### Explanation
Verifies all container images were uploaded successfully to ECR.

#### What It Does
- Lists all images stored in the repository
- Shows image tags, sizes, and push dates
- Displays image digest (SHA) for version identification

#### Why It's Needed
Verification step to ensure all three required images are present before attempting deployments.

#### Prerequisite Tasks
- Step 8: Images pushed to ECR

#### Dependent Tasks
- None (verification step)

#### Code Block

**All Shells (PowerShell, Bash, CMD):**
```bash
aws ecr describe-images --repository-name uw1-zlps-ecr-01 --region us-west-1
```

---

### STEP 10: Create ECR Pull Secret in kube-system

#### Explanation
Creates a Kubernetes Secret containing ECR credentials in the kube-system namespace, allowing system components to pull images.

#### What It Does
- Creates a docker-registry type Secret in kube-system namespace
- Stores ECR authentication credentials
- Enables CSI drivers and system pods to pull images from private ECR

#### Why It's Needed
Kubernetes pods cannot pull from private registries without credentials. This secret is referenced in deployment YAML files with `imagePullSecrets`.

#### Prerequisite Tasks
- Step 5-9: ECR setup complete
- EKS cluster accessible via kubectl

#### Dependent Tasks
- CSI driver installations (EBS, EFS, S3)

#### Code Block

**PowerShell:**
```powershell
kubectl create secret docker-registry docker-secret `
  --docker-server=995553364920.dkr.ecr.us-west-1.amazonaws.com/uw1-zlps-ecr-01 `
  --docker-username=AWS `
  --docker-password="$(aws ecr get-login-password --region us-west-1)" `
  --namespace kube-system
```

**Bash:**
```bash
kubectl create secret docker-registry docker-secret \
  --docker-server=995553364920.dkr.ecr.us-west-1.amazonaws.com/uw1-zlps-ecr-01 \
  --docker-username=AWS \
  --docker-password="$(aws ecr get-login-password --region us-west-1)" \
  --namespace kube-system
```

**Windows CMD:**
```cmd
aws ecr get-login-password --region us-west-1 > ecr-password.txt
set /p ECR_PASSWORD=<ecr-password.txt
kubectl create secret docker-registry docker-secret --docker-server=995553364920.dkr.ecr.us-west-1.amazonaws.com/uw1-zlps-ecr-01 --docker-username=AWS --docker-password=%ECR_PASSWORD% --namespace kube-system
del ecr-password.txt
```

---

### STEP 11: Create ECR Pull Secret in default namespace

#### Explanation
Creates a Kubernetes Secret containing ECR credentials in the default namespace, allowing application pods to pull images.

#### What It Does
- Creates a docker-registry type Secret in default namespace
- Stores ECR authentication credentials
- Enables ZL Application pods to pull images from private ECR

#### Why It's Needed
The default namespace is where all ZL application pods run (zlui, zlserver, zltika, zlzookeeper). Secrets are namespace-scoped, so you need one in each namespace that pulls images. Without this secret, pods will fail with "ImagePullBackOff".

#### Prerequisite Tasks
- Step 5-9: ECR setup complete
- Step 10: kube-system secret created (optional but recommended)

#### Dependent Tasks
| Step | Deployment        | Image Referenced                        |
|------|-------------------|-----------------------------------------|
| 32   | zlzookeeper       | uw1-zlps-ecr-01:zlzookeeper-11.0.1-b123 |
| 35   | zltika            | uw1-zlps-ecr-01:zltika-11.0.1-b123      |
| 36   | zlserver          | uw1-zlps-ecr-01:zlserver-11.0.1-b123    |
| 37   | zlui              | uw1-zlps-ecr-01:zlserver-11.0.1-b123    |

#### Code Block

**PowerShell:**
```powershell
kubectl create secret docker-registry docker-secret `
  --docker-server=995553364920.dkr.ecr.us-west-1.amazonaws.com/uw1-zlps-ecr-01 `
  --docker-username=AWS `
  --docker-password="$(aws ecr get-login-password --region us-west-1)" `
  --namespace default
```

**Bash:**
```bash
kubectl create secret docker-registry docker-secret \
  --docker-server=995553364920.dkr.ecr.us-west-1.amazonaws.com/uw1-zlps-ecr-01 \
  --docker-username=AWS \
  --docker-password="$(aws ecr get-login-password --region us-west-1)" \
  --namespace default
```

**Windows CMD:**
```cmd
aws ecr get-login-password --region us-west-1 > ecr-password.txt
set /p ECR_PASSWORD=<ecr-password.txt
kubectl create secret docker-registry docker-secret --docker-server=995553364920.dkr.ecr.us-west-1.amazonaws.com/uw1-zlps-ecr-01 --docker-username=AWS --docker-password=%ECR_PASSWORD% --namespace default
del ecr-password.txt
```

---

### ⚠️ IMPORTANT: ECR Token Expiration

ECR authentication tokens expire after **12 hours**. If pods fail to start with "ImagePullBackOff" errors after the cluster has been running for a while, recreate the secrets:

**PowerShell Example:**
```powershell
# Delete existing secrets
kubectl delete secret docker-secret -n default
kubectl delete secret docker-secret -n kube-system

# Re-run STEP 10 and STEP 11 to recreate with fresh tokens
```

---

## 4. PHASE 3: EBS CSI Driver Installation

### Overview

The Amazon EBS CSI (Container Storage Interface) Driver enables Kubernetes to manage EBS volumes for persistent storage. This is essential for stateful applications like ZooKeeper that require data persistence across pod restarts.

### Why EBS CSI Driver Is Needed
- Provides block storage for stateful workloads
- Enables dynamic volume provisioning via StorageClass
- Supports volume snapshots for backup/recovery
- Required for ZooKeeper's persistent data storage
- Managed lifecycle through Kubernetes PVC/PV

---

### STEP 12: Create EBS CSI Driver IAM Policy

#### Explanation
Creates an IAM policy that grants the EBS CSI Driver permissions to manage EBS volumes on behalf of Kubernetes.

#### What It Does
- Creates a custom IAM policy from a JSON file
- Grants permissions to create, attach, detach, and delete EBS volumes
- Allows volume snapshot operations
- Returns a policy ARN for attachment to service accounts

#### Why It's Needed
The EBS CSI Driver runs as pods in the cluster and needs AWS API permissions to manage EBS volumes. Without this policy, the driver cannot provision storage for pods.

#### Prerequisite Tasks
- Step 1-4: EKS Cluster created with OIDC provider
- `Amazon_EBS_CSI_Driver_Policy.json` file exists in policies/ directory

#### Dependent Tasks
- Step 13: Create IAM Service Account for EBS CSI Driver

#### Code Block

**All Shells (PowerShell, Bash, CMD):**
```bash
aws iam create-policy --policy-name AmazonEBSCSIDriverPolicy --policy-document file://policies/Amazon_EBS_CSI_Driver_Policy.json
```

**Expected Output:**
```
Policy ARN: arn:aws:iam::995553364920:policy/AmazonEBSCSIDriverPolicy
```

---

### STEP 13: Create IAM Service Account for EBS CSI Driver

#### Explanation
Creates a Kubernetes service account linked to an IAM role, allowing the EBS CSI Driver to assume AWS permissions.

#### What It Does
- Creates a Kubernetes ServiceAccount in kube-system namespace
- Creates an IAM role with trust policy for the EKS OIDC provider
- Attaches the EBS CSI policy to the role
- Links the ServiceAccount to the IAM role via annotations

#### Why It's Needed
This implements IAM Roles for Service Accounts (IRSA), allowing the EBS CSI controller pods to securely access AWS APIs without embedding credentials.

#### Prerequisite Tasks
- Step 2: OIDC Provider associated with cluster
- Step 12: EBS CSI Driver IAM Policy created

#### Dependent Tasks
- Step 14/15: EBS CSI Driver installation

#### Code Block

**All Shells (PowerShell, Bash, CMD):**
```bash
eksctl create iamserviceaccount --name ebs-csi-controller-sa --namespace kube-system --cluster usw1-zlps-eks-01 --attach-policy-arn arn:aws:iam::995553364920:policy/AmazonEBSCSIDriverPolicy --approve --role-name AmazonEKS_EBS_CSI_DriverRole
```

---

### STEP 14: Install EBS CSI Driver (kubectl method)

#### Explanation
Installs the EBS CSI Driver using kubectl with kustomize overlays from the official GitHub repository.

#### What It Does
- Downloads and applies Kubernetes manifests from GitHub
- Deploys ebs-csi-controller (manages volume lifecycle)
- Deploys ebs-csi-node DaemonSet (handles volume attach/mount)
- Creates necessary RBAC and CSIDriver resources

#### Why It's Needed
The CSI Driver provides the interface between Kubernetes and AWS EBS. This method installs from source and may require manual updates.

#### Prerequisite Tasks
- Step 13: IAM Service Account created

#### Dependent Tasks
- Step 16: Verify EBS CSI Driver Installation
- Step 17: Create EBS StorageClass

#### Code Block

**All Shells (PowerShell, Bash, CMD):**
```bash
kubectl apply -k "github.com/kubernetes-sigs/aws-ebs-csi-driver/deploy/kubernetes/overlays/stable/ecr/?ref=release-1.53"
```

> **Note:** Step 15 (EKS Add-on method) is recommended over this method for production deployments.

---

### STEP 15: Install EBS CSI Driver as EKS Add-on (Recommended)

#### Explanation
Installs the EBS CSI Driver as a managed EKS add-on, which AWS maintains and updates automatically.

#### What It Does
- Enables AWS-managed EBS CSI Driver add-on
- Links to the IAM role created in Step 13
- AWS handles driver updates and patches
- Integrates with EKS add-on lifecycle management

#### Why It's Needed
Using the managed add-on provides:
1. Automatic security patches
2. Version compatibility with EKS cluster
3. AWS support coverage
4. Simplified upgrade path

#### Prerequisite Tasks
- Step 13: IAM Service Account and Role created

#### Dependent Tasks
- Step 16: Verify EBS CSI Driver Installation
- Step 17: Create EBS StorageClass

#### Code Block

**All Shells (PowerShell, Bash, CMD):**
```bash
aws eks create-addon --cluster-name usw1-zlps-eks-01 --addon-name aws-ebs-csi-driver --service-account-role-arn arn:aws:iam::995553364920:role/AmazonEKS_EBS_CSI_DriverRole --region us-west-1
```

---

### STEP 16: Verify EBS CSI Driver Installation

#### Explanation
Confirms the EBS CSI Driver pods are running and healthy in the cluster.

#### What It Does
- Lists controller pods in kube-system namespace
- Shows pod status (Running/Pending/Error)
- Displays replica count and restart history

#### Why It's Needed
Verification ensures the driver is operational before creating storage resources. Failed driver pods will prevent volume provisioning.

#### Prerequisite Tasks
- Step 14 or 15: EBS CSI Driver installed

#### Dependent Tasks
- Step 17: Create EBS StorageClass (can proceed once pods are Running)

#### Code Block

**All Shells (PowerShell, Bash, CMD):**
```bash
kubectl get pods -n kube-system -l app=ebs-csi-controller
```

**Expected Output:**
```
NAME                                  READY   STATUS    RESTARTS   AGE
ebs-csi-controller-54b57d7767-xxxxx   6/6     Running   0          5m
ebs-csi-controller-54b57d7767-yyyyy   6/6     Running   0          5m
```

---

### STEP 17: Create EBS StorageClass

#### Explanation
Deploys a Kubernetes StorageClass that defines how EBS volumes are dynamically provisioned.

#### What It Does
- Creates StorageClass resource referencing EBS CSI provisioner
- Defines volume type (gp3), IOPS, and throughput
- Enables dynamic provisioning via PersistentVolumeClaims
- Sets reclaim policy (Delete or Retain)

#### Why It's Needed
StorageClass is required for dynamic volume provisioning. ZooKeeper's StatefulSet uses volumeClaimTemplates that reference this StorageClass to automatically create EBS volumes.

#### Prerequisite Tasks
- Step 14/15: EBS CSI Driver installed
- Step 16: Driver verified as running
- `yaml/ebs-sc.yaml` file exists

#### Dependent Tasks
- Step 35: ZooKeeper StatefulSet deployment (uses this StorageClass)

#### Code Block

**All Shells (PowerShell, Bash, CMD):**
```bash
kubectl apply -f yaml/ebs-sc.yaml
```

**Verify StorageClass:**
```bash
kubectl get storageclass ebs-sc
```

> See **Appendix A** for complete `ebs-sc.yaml` content.

---

## 5. PHASE 4: EFS CSI Driver and Storage

### Overview

The Amazon EFS CSI Driver enables Kubernetes pods to use Amazon Elastic File System for shared, persistent storage. Unlike EBS (block storage), EFS provides network-attached storage that can be accessed by multiple pods simultaneously.

### Why EFS Is Needed
- **Shared Storage:** Multiple pods can read/write the same files
- **Persistence:** Data survives pod restarts and rescheduling
- **Scalability:** Automatically scales with usage
- **Use Cases in ZL Application:**
  - `/zlvault` - Main application vault (shared across all pods)
  - `/zluilogs` - UI log files
  - `/zlserverlogs` - Server log files  
  - `/zltikatemp` - Tika temporary file processing

### EFS Access Points Created

| Access Point Name | Access Point ID        | Mount Path      | Purpose                    |
|-------------------|------------------------|-----------------|----------------------------|
| zlvault-ap        | fsap-070de74811e8c461f | /zlvault        | Main application vault     |
| zluilogs-ap       | fsap-06e5e523915353e85 | /zluilogs       | UI logs                    |
| zlserverlogs-ap   | fsap-0e3cf05f6ae8f8a82 | /zlserverlogs   | Server logs                |
| zltikatemp-ap     | fsap-08c3382b23a64f7fd | /zltikatemp     | Tika temp files            |

---

### STEP 18: Create EFS IAM Policy

#### Explanation
Creates an IAM policy that grants permissions for the EFS CSI Driver to interact with Amazon EFS.

#### What It Does
- Creates custom IAM policy from JSON file
- Grants permissions to describe, create, and delete EFS access points
- Allows mount target operations
- Returns policy ARN for service account attachment

#### Why It's Needed
The EFS CSI Driver needs AWS API permissions to manage EFS resources. This policy enables dynamic provisioning and access point management.

#### Prerequisite Tasks
- `policies/EFS-IAM-policy.json` file exists
- AWS CLI configured

#### Dependent Tasks
- Step 19: Create IAM Service Account for EFS CSI Driver

#### Code Block

**All Shells (PowerShell, Bash, CMD):**
```bash
aws iam create-policy --policy-name ZLEFSPolicy --policy-document file://policies/EFS-IAM-policy.json
```

**Expected Output:**
```
Policy ARN: arn:aws:iam::995553364920:policy/ZLEFSPolicy
```

---

### STEP 19: Create IAM Service Account for EFS CSI Driver

#### Explanation
Creates a Kubernetes service account with IAM role permissions for the EFS CSI Driver.

#### What It Does
- Creates ServiceAccount `efs-csi-controller-sa` in kube-system
- Creates IAM role with OIDC trust policy
- Attaches AWS-managed EFS CSI policy
- Enables IRSA (IAM Roles for Service Accounts)

#### Why It's Needed
Allows EFS CSI controller pods to assume IAM permissions securely without embedded credentials.

#### Prerequisite Tasks
- Step 2: OIDC Provider associated
- Step 18: EFS IAM Policy created (optional - uses AWS managed policy)

#### Dependent Tasks
- Step 20: Install EFS CSI Driver

#### Code Block

**All Shells (PowerShell, Bash, CMD):**
```bash
eksctl create iamserviceaccount --cluster usw1-zlps-eks-01 --namespace kube-system --name efs-csi-controller-sa --attach-policy-arn arn:aws:iam::aws:policy/service-role/AmazonEFSCSIDriverPolicy --approve --role-name AmazonEKS_EFS_CSI_DriverRole
```

> **Note:** This uses the AWS-managed policy `AmazonEFSCSIDriverPolicy` rather than the custom policy from Step 18.

---

### STEP 20: Install EFS CSI Driver as EKS Add-on

#### Explanation
Installs the EFS CSI Driver as a managed EKS add-on for AWS-managed updates and support.

#### What It Does
- Enables AWS-managed EFS CSI Driver add-on
- Links to IAM role from Step 19
- Deploys efs-csi-controller and efs-csi-node pods
- AWS handles driver updates automatically

#### Why It's Needed
The EFS CSI Driver provides the interface between Kubernetes and Amazon EFS, enabling pods to mount EFS file systems.

#### Prerequisite Tasks
- Step 19: IAM Service Account created

#### Dependent Tasks
- Step 21: Create EFS File System
- Step 24: Deploy EFS StorageClass and PVs

#### Code Block

**All Shells (PowerShell, Bash, CMD):**
```bash
aws eks create-addon --cluster-name usw1-zlps-eks-01 --addon-name aws-efs-csi-driver --service-account-role-arn arn:aws:iam::995553364920:role/AmazonEKS_EFS_CSI_DriverRole --region us-west-1
```

**Verify Installation:**
```bash
kubectl get pods -n kube-system -l app=efs-csi-controller
```

---

### STEP 21: Create EFS File System

#### Explanation
Creates an Amazon EFS file system that will provide shared storage for the ZL Application pods.

#### What It Does
- Creates a new EFS file system in the specified region
- Configures performance mode (generalPurpose for most workloads)
- Sets throughput mode (bursting scales with storage size)
- Tags the file system for identification

#### Why It's Needed
EFS is the shared storage backend where all application data (vault, logs, temp files) is stored. Multiple pods can mount this same file system simultaneously.

#### Prerequisite Tasks
- Step 20: EFS CSI Driver installed

#### Dependent Tasks
- Step 22: Create Mount Targets
- Step 23: Create Access Points

#### Code Block

**All Shells (PowerShell, Bash, CMD):**
```bash
aws efs create-file-system --region us-west-1 --performance-mode generalPurpose --throughput-mode bursting --tags Key=Name,Value=usw1-zlps-efs-01
```

**Expected Output:**
```
File System ID: fs-0a4ec87cd91178047
```

> **Important:** Save the File System ID - it's required for all subsequent EFS operations.

---

### STEP 22: Create Mount Targets (One Per Availability Zone)

#### Explanation
Creates EFS mount targets in each availability zone where EKS nodes run, enabling network connectivity to EFS.

#### What It Does
- Creates NFS mount endpoints in specified subnets
- Associates security groups for network access
- Enables pods on nodes in that AZ to mount EFS
- Creates DNS entries for mount resolution

#### Why It's Needed
Mount targets provide the network interface for EFS. Without mount targets in each AZ, pods in that zone cannot access EFS storage.

#### Prerequisite Tasks
- Step 21: EFS File System created
- Step 4: VPC/Subnet information available
- Security group allows NFS (port 2049)

#### Dependent Tasks
- Step 23: Create Access Points
- Step 24: Deploy PVs (need mount targets to function)

#### Code Block

**For us-west-1a (All Shells):**
```bash
aws efs create-mount-target --file-system-id fs-0a4ec87cd91178047 --subnet-id subnet-01c24772a882a3a1b --security-groups sg-0afb0a3f0c30ba84d --region us-west-1
```

**For us-west-1c (All Shells):**
```bash
aws efs create-mount-target --file-system-id fs-0a4ec87cd91178047 --subnet-id subnet-06eb80d784d985109 --security-groups sg-0afb0a3f0c30ba84d --region us-west-1
```

**Verify Mount Targets:**
```bash
aws efs describe-mount-targets --file-system-id fs-0a4ec87cd91178047 --region us-west-1
```

---

### STEP 23: Create EFS Access Points

#### Explanation
Creates access points that provide application-specific entry points into the EFS file system with enforced user identity and root directory isolation.

#### What It Does
- Creates isolated mount points within the EFS file system
- Enforces POSIX user/group identity (UID/GID 1000)
- Creates root directory with specified permissions
- Returns unique access point ID for each mount

#### Why It's Needed
Access points provide:
1. **Isolation:** Each application directory is isolated
2. **Security:** Enforced user identity prevents privilege escalation
3. **Simplicity:** Pods mount their specific directory without seeing the entire filesystem
4. **Permissions:** Automatic directory creation with correct ownership

#### Prerequisite Tasks
- Step 21: EFS File System created
- Step 22: Mount Targets created

#### Dependent Tasks
- Step 24: Deploy PVs (reference these access point IDs)

#### Code Block

**Create zltikatemp Access Point (Tika temporary files):**

**PowerShell:**
```powershell
aws efs create-access-point --file-system-id fs-0a4ec87cd91178047 --posix-user Uid=1000,Gid=1000 --root-directory "Path=/zltikatemp,CreationInfo={OwnerUid=1000,OwnerGid=1000,Permissions=755}" --tags Key=Name,Value=zltikatemp-ap --region us-west-1
```

**Bash:**
```bash
aws efs create-access-point --file-system-id fs-0a4ec87cd91178047 --posix-user Uid=1000,Gid=1000 --root-directory 'Path=/zltikatemp,CreationInfo={OwnerUid=1000,OwnerGid=1000,Permissions=755}' --tags Key=Name,Value=zltikatemp-ap --region us-west-1
```

**Output:** `fsap-08c3382b23a64f7fd`

---

**Create zluilogs Access Point (UI logs):**

**All Shells:**
```bash
aws efs create-access-point --file-system-id fs-0a4ec87cd91178047 --posix-user Uid=1000,Gid=1000 --root-directory "Path=/zluilogs,CreationInfo={OwnerUid=1000,OwnerGid=1000,Permissions=755}" --tags Key=Name,Value=zluilogs-ap --region us-west-1
```

**Output:** `fsap-06e5e523915353e85`

---

**Create zlvault Access Point (Main application vault):**

**All Shells:**
```bash
aws efs create-access-point --file-system-id fs-0a4ec87cd91178047 --posix-user Uid=1000,Gid=1000 --root-directory "Path=/zlvault,CreationInfo={OwnerUid=1000,OwnerGid=1000,Permissions=755}" --tags Key=Name,Value=zlvault-ap --region us-west-1
```

**Output:** `fsap-070de74811e8c461f`

---

**Create zlserverlogs Access Point (Server logs):**

**All Shells:**
```bash
aws efs create-access-point --file-system-id fs-0a4ec87cd91178047 --posix-user Uid=1000,Gid=1000 --root-directory "Path=/zlserverlogs,CreationInfo={OwnerUid=1000,OwnerGid=1000,Permissions=755}" --tags Key=Name,Value=zlserverlogs-ap --region us-west-1
```

**Output:** `fsap-0e3cf05f6ae8f8a82`

---

### Access Point Summary

| Access Point | ID                     | Path           | Used By                |
|--------------|------------------------|----------------|------------------------|
| zltikatemp   | fsap-08c3382b23a64f7fd | /zltikatemp    | zltika, zlserver, zlui |
| zluilogs     | fsap-06e5e523915353e85 | /zluilogs      | zlui                   |
| zlvault      | fsap-070de74811e8c461f | /zlvault       | zlserver, zlui         |
| zlserverlogs | fsap-0e3cf05f6ae8f8a82 | /zlserverlogs  | zlserver               |

---

### STEP 24: Deploy EFS StorageClass and PVs

#### Explanation
Creates the Kubernetes storage resources (StorageClass, PersistentVolumes, PersistentVolumeClaims) that map EFS access points to pod mounts.

#### What It Does
- Creates EFS StorageClass for the EFS CSI provisioner
- Creates PersistentVolume for each access point (static provisioning)
- Creates PersistentVolumeClaim to bind pods to volumes
- Maps access point IDs to Kubernetes volume resources

#### Why It's Needed
Kubernetes requires PV/PVC resources to mount external storage. These YAML files connect the EFS access points (AWS resource) to pod volume mounts (Kubernetes resource).

#### Prerequisite Tasks
- Step 20: EFS CSI Driver installed
- Step 21-23: EFS File System, Mount Targets, and Access Points created
- YAML files exist in yaml/ directory

#### Dependent Tasks
- Step 38-40: Application deployments (reference these PVCs)

#### Code Block

**All Shells (PowerShell, Bash, CMD):**
```bash
# StorageClass
kubectl apply -f yaml/efs-sc.yaml

# PersistentVolumes
kubectl apply -f yaml/efs-pv-zltikatemp.yaml
kubectl apply -f yaml/efs-pv-zluilogs.yaml
kubectl apply -f yaml/efs-pv-zlvault.yaml

# PersistentVolumeClaims
kubectl apply -f yaml/efs-pvc-zltikatemp.yaml
kubectl apply -f yaml/efs-pvc-zluilogs.yaml
kubectl apply -f yaml/efs-pvc-zlvault.yaml
```

**Verify PV/PVC Status:**
```bash
kubectl get pv
kubectl get pvc
```

**Expected Output:**
```
NAME                 CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS   CLAIM
efs-pv-zltikatemp    10Gi       RWX            Retain           Bound    default/efs-pvc-zltikatemp
efs-pv-zluilogs      10Gi       RWX            Retain           Bound    default/efs-pvc-zluilogs
efs-pv-zlvault       100Gi      RWX            Retain           Bound    default/efs-pvc-zlvault
```

> See **Appendix A** for complete YAML file contents.

---

## 6. PHASE 5: S3 CSI Driver (Optional - For Archive Storage)

### Overview

The S3 CSI Driver (Mountpoint for Amazon S3) enables Kubernetes pods to mount S3 buckets as file systems. This is optional and used for archive storage where cost-effective, scalable object storage is preferred over block/file storage.

### Why S3 Storage May Be Needed
- **Cost Effective:** S3 is significantly cheaper than EBS/EFS for large datasets
- **Scalability:** Unlimited storage capacity
- **Durability:** 99.999999999% (11 9's) durability
- **Archive Use Cases:** Long-term retention, compliance archives, cold data

### Limitations
- Higher latency than EBS/EFS
- Not suitable for databases or random I/O workloads
- Read-heavy workloads perform best

---

### STEP 25: Create S3 Bucket

#### Explanation
Creates an S3 bucket for storing application archive data with regional placement.

#### What It Does
- Creates a new S3 bucket in the specified region
- Configures location constraint for regional bucket
- Returns bucket name for subsequent operations

#### Why It's Needed
The S3 bucket serves as the backend storage for archived data. The ZL Application can use this for long-term storage of processed documents and compliance archives.

#### Prerequisite Tasks
- AWS CLI configured with S3 permissions
- Unique bucket name (globally unique across all AWS accounts)

#### Dependent Tasks
- Step 26: Enable Versioning
- Step 27: Create S3 CSI Driver IAM Policy
- Step 28: Install S3 CSI Driver

#### Code Block

**All Shells (PowerShell, Bash, CMD):**
```bash
aws s3api create-bucket --bucket usw1-zlps-app-storage --region us-west-1 --create-bucket-configuration LocationConstraint=us-west-1
```

**Verify Bucket:**
```bash
aws s3 ls | grep usw1-zlps-app-storage
```

---

### STEP 26: Enable Versioning

#### Explanation
Enables versioning on the S3 bucket to protect against accidental deletion and enable point-in-time recovery.

#### What It Does
- Activates version tracking for all objects
- Preserves previous versions when objects are overwritten
- Enables recovery of deleted objects

#### Why It's Needed
Versioning provides data protection for archived content. Compliance requirements often mandate version history for audit purposes.

#### Prerequisite Tasks
- Step 25: S3 Bucket created

#### Dependent Tasks
- None (configuration step)

#### Code Block

**All Shells (PowerShell, Bash, CMD):**
```bash
aws s3api put-bucket-versioning --bucket usw1-zlps-app-storage --versioning-configuration Status=Enabled --region us-west-1
```

**Verify Versioning:**
```bash
aws s3api get-bucket-versioning --bucket usw1-zlps-app-storage --region us-west-1
```

---

### STEP 27: Create S3 CSI Driver IAM Policy

#### Explanation
Creates an IAM policy that grants the S3 CSI Driver permissions to access the S3 bucket.

#### What It Does
- Creates custom IAM policy from JSON file
- Grants permissions for S3 GetObject, PutObject, ListBucket
- Scopes permissions to specific bucket(s)
- Returns policy ARN for service account attachment

#### Why It's Needed
The S3 CSI Driver (Mountpoint) needs AWS API permissions to read/write objects in S3 buckets on behalf of pods.

#### Prerequisite Tasks
- Step 25: S3 Bucket created
- `policies/S3-CSI-Driver-Policy.json` file exists

#### Dependent Tasks
- Step 28: Install S3 CSI Driver via Helm

#### Code Block

**All Shells (PowerShell, Bash, CMD):**
```bash
aws iam create-policy --policy-name ZLPS_S3_CSI_Driver_Policy --policy-document file://policies/S3-CSI-Driver-Policy.json --region us-west-1
```

---

### STEP 28: Install S3 CSI Driver via Helm

#### Explanation
Installs the Mountpoint for Amazon S3 CSI Driver using Helm charts for simplified deployment and management.

#### What It Does
- Adds AWS S3 CSI Helm repository
- Updates Helm repository cache
- Installs/upgrades the S3 CSI driver in kube-system namespace
- Deploys driver pods for S3 mount operations

#### Why It's Needed
The Mountpoint CSI Driver enables pods to mount S3 buckets as POSIX-compatible file systems, allowing applications to read/write S3 using standard file operations.

#### Prerequisite Tasks
- Helm installed and in PATH
- Step 27: S3 CSI IAM Policy created
- kubectl configured for cluster access

#### Dependent Tasks
- Creating S3-backed PV/PVC resources (not covered in base deployment)

#### Code Block

**All Shells (PowerShell, Bash, CMD):**
```bash
# Add Helm repository
helm repo add aws-s3-csi https://awslabs.github.io/mountpoint-s3-csi-driver

# Update repository cache
helm repo update

# Install/upgrade the driver
helm upgrade --install aws-mountpoint-s3-csi-driver --namespace kube-system aws-s3-csi/aws-mountpoint-s3-csi-driver
```

**Verify Installation:**
```bash
kubectl get pods -n kube-system -l app.kubernetes.io/name=aws-mountpoint-s3-csi-driver
```

---

## 7. PHASE 6: Database Configuration

### Overview

The ZL Application uses Amazon RDS SQL Server as its database backend. This phase configures Kubernetes resources to connect to the RDS instance and provides methods for secure database access.

### RDS SQL Server Details

| Property    | Value                                                                   |
|-------------|-------------------------------------------------------------------------|
| Endpoint    | usw1-zlps-msexpsql-01-eks.c5s06occm2dn.us-west-1.rds.amazonaws.com      |
| Port        | 1433                                                                    |
| Engine      | sqlserver-ex (SQL Server Express)                                       |
| Database    | ZLDB                                                                    |
| User        | pfuser (db_owner role)                                                  |

### Why Separate ConfigMap and Secret
- **ConfigMap:** Non-sensitive configuration (host, port, database name)
- **Secret:** Sensitive data (passwords) - base64 encoded and access-controlled
- **Separation:** Allows updating connection info without exposing credentials

---

### STEP 29: Create Database ConfigMap

#### Explanation
Creates a Kubernetes ConfigMap containing non-sensitive database connection parameters.

#### What It Does
- Stores database host, port, and database name
- Makes configuration available to pods via environment variables
- Allows changing connection info without rebuilding containers

#### Why It's Needed
Application pods need to know where the database is located. ConfigMaps provide a Kubernetes-native way to inject configuration without hardcoding in images.

#### Prerequisite Tasks
- RDS instance created and accessible
- `yaml/zldb-config.yaml` file exists with correct endpoint

#### Dependent Tasks
- Step 38-40: Application deployments (reference this ConfigMap)

#### Code Block

**All Shells (PowerShell, Bash, CMD):**
```bash
kubectl apply -f yaml/zldb-config.yaml
```

**Verify ConfigMap:**
```bash
kubectl get configmap db-config -o yaml
```

> See **Appendix C** for complete `zldb-config.yaml` content.

---

### STEP 30: Create Database Secret

#### Explanation
Creates a Kubernetes Secret containing the database password in base64-encoded format.

#### What It Does
- Stores database password securely
- Encrypts at rest (if cluster encryption enabled)
- Restricts access via RBAC policies
- Injects password as environment variable in pods

#### Why It's Needed
Passwords should never be stored in ConfigMaps (which are not encrypted) or in container images. Secrets provide secure storage with access controls.

#### Prerequisite Tasks
- Step 29: Database ConfigMap created
- Database password known
- `yaml/zldb-secret.yaml` file exists (update password before applying)

#### Dependent Tasks
- Step 38-40: Application deployments (reference this Secret)

#### Code Block

**All Shells (PowerShell, Bash, CMD):**
```bash
kubectl apply -f yaml/zldb-secret.yaml
```

**Verify Secret (shows metadata only, not values):**
```bash
kubectl get secret db-secret
```

> ⚠️ **Important:** Update `zldb-secret.yaml` with the actual database password before applying. The password must be base64 encoded.

**To encode a password:**

**PowerShell:**
```powershell
[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("YourPassword"))
```

**Bash:**
```bash
echo -n "YourPassword" | base64
```

---

### STEP 31: SSM Port Forwarding for Database Access

#### Explanation
Establishes a secure tunnel through AWS Systems Manager to access the RDS database from your local machine without exposing the database to the internet.

#### What It Does
- Creates an encrypted tunnel through SSM Session Manager
- Forwards local port 1433 to RDS endpoint
- Enables SSMS/sqlcmd access from localhost
- No need for VPN or bastion host

#### Why It's Needed
RDS instances in private subnets are not directly accessible from the internet. SSM port forwarding provides secure access for database administration without opening inbound firewall rules.

#### Prerequisite Tasks
- AWS SSM agent installed on an EC2 instance in the VPC
- SSM Session Manager plugin installed locally
- EC2 instance (i-05f0a52e05bddf73b) running with SSM access

#### Dependent Tasks
- Database schema deployment (via SSMS)
- Step 53: Update Database Disk Volume Paths

#### Code Block

**PowerShell:**
```powershell
aws ssm start-session --target i-05f0a52e05bddf73b --document-name AWS-StartPortForwardingSessionToRemoteHost --parameters "{`"host`":[`"usw1-zlps-msexpsql-01-eks.c5s06occm2dn.us-west-1.rds.amazonaws.com`"],`"portNumber`":[`"1433`"],`"localPortNumber`":[`"1433`"]}"
```

**Bash:**
```bash
aws ssm start-session --target i-05f0a52e05bddf73b --document-name AWS-StartPortForwardingSessionToRemoteHost --parameters '{"host":["usw1-zlps-msexpsql-01-eks.c5s06occm2dn.us-west-1.rds.amazonaws.com"],"portNumber":["1433"],"localPortNumber":["1433"]}'
```

**Windows CMD:**
```cmd
aws ssm start-session --target i-05f0a52e05bddf73b --document-name AWS-StartPortForwardingSessionToRemoteHost --parameters "{\"host\":[\"usw1-zlps-msexpsql-01-eks.c5s06occm2dn.us-west-1.rds.amazonaws.com\"],\"portNumber\":[\"1433\"],\"localPortNumber\":[\"1433\"]}"
```

**Expected Output:**
```
Starting session with SessionId: user-0abc123def456
Port 1433 opened for sessionId user-0abc123def456
Waiting for connections...
```

**Connect via SSMS:**
- Server: `localhost,1433`
- Authentication: SQL Server Authentication
- Login: `pfuser`
- Password: (your database password)

---

## 8. PHASE 7: ZooKeeper Deployment

### Overview

Apache ZooKeeper provides distributed coordination services for the ZL Application. It manages cluster state, leader election, and configuration synchronization across application instances.

### Why ZooKeeper Is Needed
- **Cluster Coordination:** Manages which ZL server instance handles specific tasks
- **Leader Election:** Ensures single-writer for critical operations
- **Configuration Management:** Centralizes application settings
- **Service Discovery:** Enables pods to find each other

### ZooKeeper Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    ZooKeeper Ensemble (3 nodes)                 │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐         │
│  │ zlzookeeper-0 │ │ zlzookeeper-1 │ │ zlzookeeper-2 │         │
│  │   (Leader)    │ │  (Follower)   │ │  (Follower)   │         │
│  └───────┬───────┘ └───────┬───────┘ └───────┬───────┘         │
│          │                 │                 │                  │
│          └────────────┬────┴─────────────────┘                  │
│                       │                                         │
│              ┌────────┴────────┐                                │
│              │  zk-cs Service  │  ← Client connections          │
│              │  (ClusterIP)    │    (port 2181)                 │
│              └─────────────────┘                                │
└─────────────────────────────────────────────────────────────────┘
```

---

### STEP 32: Create ZL Application Service Account

#### Explanation
Creates a Kubernetes ServiceAccount for the ZL Application pods, providing identity and enabling RBAC controls.

#### What It Does
- Creates ServiceAccount `zlapp-sa` in default namespace
- Provides pod identity for API access
- Enables future RBAC policy attachments
- Can be linked to IAM roles via IRSA if needed

#### Why It's Needed
Service accounts provide identity for pods and enable:
- RBAC-based access control
- Audit logging of pod actions
- IAM role association for AWS access
- Separation of privileges between applications

#### Prerequisite Tasks
- EKS cluster accessible via kubectl

#### Dependent Tasks
- Step 35: ZooKeeper StatefulSet (uses this service account)
- Step 38-40: Application deployments (use this service account)

#### Code Block

**All Shells (PowerShell, Bash, CMD):**
```bash
kubectl create serviceaccount zlapp-sa -n default
```

**Verify:**
```bash
kubectl get serviceaccount zlapp-sa
```

---

### STEP 33: Deploy ZooKeeper Services

#### Explanation
Creates Kubernetes Services that provide network access to ZooKeeper pods - both for client connections and internal pod-to-pod communication.

#### What It Does
- **zk-cs (Client Service):** ClusterIP service for application connections on port 2181
- **zk-hs (Headless Service):** Enables StatefulSet DNS for pod-to-pod communication

#### Why It's Needed
- **Client Service:** Applications (zlserver, zlui) connect to ZooKeeper via this service
- **Headless Service:** ZooKeeper pods need stable DNS names to form a quorum (zlzookeeper-0.zk-hs, zlzookeeper-1.zk-hs, etc.)

#### Prerequisite Tasks
- EKS cluster accessible via kubectl
- `yaml/zk-cs.yaml` and `yaml/zk-hs.yaml` files exist

#### Dependent Tasks
- Step 35: ZooKeeper StatefulSet deployment

#### Code Block

**All Shells (PowerShell, Bash, CMD):**
```bash
# Client service (for application connections)
kubectl apply -f yaml/zk-cs.yaml

# Headless service (for pod-to-pod communication)
kubectl apply -f yaml/zk-hs.yaml
```

**Verify Services:**
```bash
kubectl get services zk-cs zk-hs
```

**Expected Output:**
```
NAME    TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)             AGE
zk-cs   ClusterIP   10.100.xxx.xxx   <none>        2181/TCP            1m
zk-hs   ClusterIP   None             <none>        2888/TCP,3888/TCP   1m
```

> See **Appendix A** for complete YAML file contents.

---

### STEP 34: Deploy Application ConfigMap

#### Explanation
Creates a ConfigMap containing ZL Application configuration including ZooKeeper connection settings.

#### What It Does
- Stores ZOO_SERVERS environment variable with ZooKeeper endpoints
- Contains application-specific configuration parameters
- Injected into pods as environment variables

#### Why It's Needed
Application pods need to know how to connect to ZooKeeper. This ConfigMap provides the ZooKeeper connection string that all ZL pods reference.

#### Prerequisite Tasks
- Step 33: ZooKeeper services created
- `yaml/zlapp-config.yaml` file exists

#### Dependent Tasks
- Step 35: ZooKeeper StatefulSet (references this ConfigMap)
- Step 38-40: Application deployments (reference this ConfigMap)

#### Code Block

**All Shells (PowerShell, Bash, CMD):**
```bash
kubectl apply -f yaml/zlapp-config.yaml
```

**Verify ConfigMap:**
```bash
kubectl get configmap zlapp-config -o yaml
```

**Key Configuration:**
```yaml
ZOO_SERVERS: "zlzookeeper-0.zk-hs.default.svc.cluster.local:2181,zlzookeeper-1.zk-hs.default.svc.cluster.local:2181,zlzookeeper-2.zk-hs.default.svc.cluster.local:2181"
```

> See **Appendix C** for complete ConfigMap content.

---

### STEP 35: Deploy ZooKeeper StatefulSet

#### Explanation
Deploys a 3-node ZooKeeper ensemble as a Kubernetes StatefulSet with persistent storage.

#### What It Does
- Creates 3 ZooKeeper replicas (zlzookeeper-0, -1, -2)
- Provisions EBS volumes for each replica via volumeClaimTemplate
- Configures ZooKeeper cluster settings (myid, server list)
- Uses headless service for stable DNS identities

#### Why It's Needed
ZooKeeper requires:
- **Odd number of nodes:** For quorum voting (3 nodes tolerates 1 failure)
- **Stable identities:** StatefulSet provides predictable pod names
- **Persistent storage:** EBS volumes survive pod restarts
- **Ordered deployment:** Pods start sequentially (0, then 1, then 2)

#### Prerequisite Tasks
- Step 17: EBS StorageClass created
- Step 32: Service Account created
- Step 33: ZooKeeper services deployed
- Step 34: Application ConfigMap deployed
- Step 11: ECR pull secret in default namespace

#### Dependent Tasks
- Step 36: Verify ZooKeeper Deployment
- Step 38-40: Application deployments (depend on healthy ZooKeeper)

#### Code Block

**All Shells (PowerShell, Bash, CMD):**
```bash
kubectl apply -f yaml/zlzookeeper-statefulset.yaml
```

**Watch Pod Creation:**
```bash
kubectl get pods -l app=zlzookeeper -w
```

> See **Appendix A** for complete StatefulSet YAML.

---

### STEP 36: Verify ZooKeeper Deployment

#### Explanation
Confirms all ZooKeeper pods are running and their persistent volumes are bound.

#### What It Does
- Lists ZooKeeper pods and their status
- Shows PersistentVolumeClaims and binding status
- Verifies all 3 replicas are Running

#### Why It's Needed
ZooKeeper must be healthy before deploying application pods. Applications will fail to initialize if they cannot connect to ZooKeeper.

#### Prerequisite Tasks
- Step 35: ZooKeeper StatefulSet deployed

#### Dependent Tasks
- Step 38-40: Application deployments (proceed when ZooKeeper is healthy)

#### Code Block

**All Shells (PowerShell, Bash, CMD):**
```bash
# Check pods
kubectl get pods -l app=zlzookeeper

# Check persistent volume claims
kubectl get pvc -l app=zlzookeeper
```

**Expected Pod Output:**
```
NAME            READY   STATUS    RESTARTS   AGE
zlzookeeper-0   1/1     Running   0          5m
zlzookeeper-1   1/1     Running   0          4m
zlzookeeper-2   1/1     Running   0          3m
```

**Expected PVC Output:**
```
NAME                     STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS
data-zlzookeeper-0       Bound    pvc-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx   10Gi       RWO            ebs-sc
data-zlzookeeper-1       Bound    pvc-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx   10Gi       RWO            ebs-sc
data-zlzookeeper-2       Bound    pvc-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx   10Gi       RWO            ebs-sc
```

**Test ZooKeeper Connectivity:**
```bash
kubectl exec zlzookeeper-0 -- zkCli.sh -server localhost:2181 ls /
```

---

## 9. PHASE 8: Application Deployment (zltika, zlserver, zlui)

### Overview

This phase deploys the three main ZL Application components:
- **zltika:** Apache Tika-based document conversion service
- **zlserver:** Backend application server
- **zlui:** Web frontend user interface

### Application Architecture

```
                    ┌─────────────────────────────────────┐
                    │          External Users             │
                    └─────────────────┬───────────────────┘
                                      │
                    ┌─────────────────▼───────────────────┐
                    │         ALB (Ingress)               │
                    │    k8s-default-zluiingr-e9951b35c2  │
                    └─────────────────┬───────────────────┘
                                      │
                    ┌─────────────────▼───────────────────┐
                    │           zlui Service              │
                    │         (Web Frontend)              │
                    └───────────────┬─┬───────────────────┘
                                    │ │
              ┌─────────────────────┘ └─────────────────────┐
              │                                             │
┌─────────────▼─────────────┐             ┌─────────────────▼─────────────┐
│      zlserver Service     │             │       zltika Service          │
│    (Backend Processing)   │◄───────────►│   (Document Conversion)       │
└─────────────┬─────────────┘             └───────────────────────────────┘
              │
              │
┌─────────────▼─────────────┐
│    ZooKeeper Ensemble     │
│   (Cluster Coordination)  │
└─────────────┬─────────────┘
              │
┌─────────────▼─────────────┐
│    RDS SQL Server         │
│        (ZLDB)             │
└───────────────────────────┘
```

### Deployment Order
1. **Step 37:** Document Conversion ConfigMap (Tika hostname override)
2. **Step 38:** zltika deployment and service
3. **Step 39:** zlserver deployment
4. **Step 40:** zlui deployment and service
5. **Step 41-42:** Verification

---

### STEP 37: Deploy Document Conversion ConfigMap

#### Explanation
Creates a ConfigMap containing the DocumentConversion.xml configuration file that overrides the Tika service hostname from localhost to the Kubernetes service name.

#### What It Does
- Stores DocumentConversion.xml content in a ConfigMap
- Overrides `__tika.ZLTikaService.Host` from `localhost` to `zltika`
- Mounted as a file in zlserver and zlui containers
- Enables containers to connect to Tika via Kubernetes DNS

#### Why It's Needed
In Docker/Kubernetes, each container has its own localhost. The ZL Application defaults to connecting to Tika on localhost, which doesn't work when Tika runs in a separate pod. This ConfigMap overrides the hostname to use Kubernetes service discovery.

#### Prerequisite Tasks
- `yaml/docconvert-configmap.yaml` file exists
- Correct Tika service name configured (`zltika`)

#### Dependent Tasks
- Step 38: Tika deployment (ConfigMap should exist first)
- Step 39-40: zlserver and zlui deployments (mount this ConfigMap)

#### Code Block

**All Shells (PowerShell, Bash, CMD):**
```bash
kubectl apply -f yaml/docconvert-configmap.yaml
```

**Verify ConfigMap:**
```bash
kubectl get configmap docconvert-config -o yaml
```

**Key Content:**
```xml
<ZLTikaService>
  <Host>zltika</Host>
  <Port>9998</Port>
</ZLTikaService>
```

> See **Appendix C** for complete ConfigMap content.

---

### STEP 38: Deploy Tika Service

#### Explanation
Deploys the Apache Tika document conversion service that processes documents for text extraction and format conversion.

#### What It Does
- Creates Deployment with Tika container image
- Creates ClusterIP Service on port 9998
- Mounts EFS volume for temporary file storage
- Configures resource limits (CPU/memory)

#### Why It's Needed
Tika provides document conversion capabilities:
- Extracts text from PDF, Office documents, images (OCR)
- Converts between document formats
- Required for document processing workflows
- Must be accessible via Kubernetes service DNS

#### Prerequisite Tasks
- Step 11: ECR pull secret in default namespace
- Step 24: EFS PVCs created (zltikatemp)
- Step 37: Document Conversion ConfigMap deployed

#### Dependent Tasks
- Step 39: zlserver deployment (connects to Tika)
- Step 40: zlui deployment (connects to Tika)

#### Code Block

**All Shells (PowerShell, Bash, CMD):**
```bash
# Deploy Tika pod
kubectl apply -f yaml/zltika-deployment.yaml

# Create Tika service
kubectl apply -f yaml/zltika-service.yaml
```

**Verify Deployment:**
```bash
kubectl get deployment zltika
kubectl get service zltika
```

**Expected Output:**
```
NAME     READY   UP-TO-DATE   AVAILABLE   AGE
zltika   1/1     1            1           1m

NAME     TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)    AGE
zltika   ClusterIP   10.100.xxx.xxx   <none>        9998/TCP   1m
```

> See **Appendix A** for complete YAML file contents.

---

### STEP 39: Deploy ZL Server

#### Explanation
Deploys the ZL Server backend application that handles business logic, database operations, and application services.

#### What It Does
- Creates Deployment with zlserver container image
- Configures environment variables from ConfigMaps and Secrets
- Mounts EFS volumes for vault and logs
- Mounts DocumentConversion.xml ConfigMap
- Configures ZooKeeper connection

#### Why It's Needed
ZL Server is the core application backend:
- Processes business logic and workflows
- Connects to SQL Server database
- Coordinates with ZooKeeper for clustering
- Provides API services for the UI

#### Prerequisite Tasks
- Step 11: ECR pull secret in default namespace
- Step 24: EFS PVCs created (zlvault, zlserverlogs)
- Step 29-30: Database ConfigMap and Secret
- Step 34: Application ConfigMap (ZooKeeper settings)
- Step 35-36: ZooKeeper running and healthy
- Step 37: Document Conversion ConfigMap
- Step 38: Tika service deployed

#### Dependent Tasks
- Step 40: zlui deployment (UI connects to server)
- Step 41-42: Verification steps

#### Code Block

**All Shells (PowerShell, Bash, CMD):**
```bash
kubectl apply -f yaml/zlserver-deployment.yaml
```

**Watch Pod Startup:**
```bash
kubectl get pods -l app=zlserver -w
```

**Check Logs for Initialization:**
```bash
kubectl logs deployment/zlserver -f
```

**Expected Log Message:**
```
Done initalizing ZLServer
```

> See **Appendix A** for complete YAML file contents.

---

### STEP 40: Deploy ZL UI

#### Explanation
Deploys the ZL UI web frontend that provides the user interface for the application.

#### What It Does
- Creates Deployment with zlui container (same image as zlserver)
- Creates ClusterIP Service on port 8080
- Configures environment variables for UI mode
- Mounts EFS volumes for vault, logs, and Tika temp
- Mounts DocumentConversion.xml ConfigMap

#### Why It's Needed
ZL UI provides:
- Web-based user interface
- User authentication and session management
- Document upload and viewing
- Search interface and results display
- Must be accessible via load balancer for external users

#### Prerequisite Tasks
- Step 11: ECR pull secret in default namespace
- Step 24: EFS PVCs created
- Step 29-30: Database ConfigMap and Secret
- Step 34: Application ConfigMap
- Step 35-36: ZooKeeper running
- Step 37: Document Conversion ConfigMap
- Step 38: Tika service deployed
- Step 39: zlserver deployed

#### Dependent Tasks
- Step 41-42: Verification steps
- Step 44: Ingress configuration (exposes UI externally)

#### Code Block

**All Shells (PowerShell, Bash, CMD):**
```bash
# Deploy UI pod
kubectl apply -f yaml/zlui-deployment.yaml

# Create UI service
kubectl apply -f yaml/zlui-service.yaml
```

**Verify Deployment:**
```bash
kubectl get deployment zlui
kubectl get service zlui-service
```

**Expected Output:**
```
NAME   READY   UP-TO-DATE   AVAILABLE   AGE
zlui   1/1     1            1           1m

NAME           TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)    AGE
zlui-service   ClusterIP   10.100.xxx.xxx   <none>        8080/TCP   1m
```

> See **Appendix A** for complete YAML file contents.

---

### STEP 41: Verify All Pods Running

#### Explanation
Confirms all application pods are running and ready before proceeding with network configuration.

#### What It Does
- Lists all pods in default namespace
- Shows pod status, readiness, and restart count
- Identifies any pods in error state

#### Why It's Needed
All pods must be Running before:
- Configuring Ingress (can't route to non-existent pods)
- Testing application functionality
- Proceeding to post-deployment configuration

#### Prerequisite Tasks
- Steps 35-40: All deployments completed

#### Dependent Tasks
- Step 42: Verify application initialization
- Step 44: Create Ingress

#### Code Block

**All Shells (PowerShell, Bash, CMD):**
```bash
kubectl get pods -n default
```

**Expected Output:**
```
NAME                        READY   STATUS    RESTARTS   AGE
zltika-xxxxxxxxxx-xxxxx     1/1     Running   0          10m
zlserver-xxxxxxxxxx-xxxxx   1/1     Running   0          8m
zlui-xxxxxxxxxx-xxxxx       1/1     Running   0          5m
zlzookeeper-0               1/1     Running   0          20m
zlzookeeper-1               1/1     Running   0          19m
zlzookeeper-2               1/1     Running   0          18m
```

**Check for Issues:**
```bash
# Pods not in Running state
kubectl get pods --field-selector=status.phase!=Running

# Describe pod for troubleshooting
kubectl describe pod <pod-name>
```

---

### STEP 42: Verify Application Initialization

#### Explanation
Checks application logs to confirm the ZL Application has fully initialized and is ready to serve requests.

#### What It Does
- Reads deployment logs for initialization messages
- Confirms ZooKeeper connection successful
- Verifies database connectivity
- Confirms "Done initializing" message appears

#### Why It's Needed
Pods may show "Running" status but the application inside may still be initializing. The application must complete initialization before it can serve user requests.

#### Prerequisite Tasks
- Step 41: All pods running

#### Dependent Tasks
- Step 44: Create Ingress (application ready for traffic)

#### Code Block

**Bash:**
```bash
kubectl logs deployment/zlui | grep -i "initializing\|done"
```

**PowerShell:**
```powershell
kubectl logs deployment/zlui | Select-String -Pattern "initializing|done"
```

**Windows CMD:**
```cmd
kubectl logs deployment/zlui | findstr /i "initializing done"
```

**Success Indicator:**
```
Done initalizing ZLServer
```

**Check All Logs:**
```bash
# zlui logs
kubectl logs deployment/zlui --tail=100

# zlserver logs
kubectl logs deployment/zlserver --tail=100

# zltika logs
kubectl logs deployment/zltika --tail=100
```

---

## 10. PHASE 9: Network and Ingress Configuration

### Overview

This phase configures the AWS Load Balancer Controller and creates an Ingress resource to expose the ZL Application to external users via an Application Load Balancer (ALB).

### Why ALB Ingress Is Needed
- **External Access:** Makes the application accessible from the internet
- **SSL/TLS Termination:** Can handle HTTPS traffic (with ACM certificates)
- **Load Balancing:** Distributes traffic across multiple UI pods
- **Health Checks:** Automatically routes away from unhealthy pods
- **AWS Integration:** Native integration with AWS networking

### Network Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Internet                                        │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Application Load Balancer (ALB)                          │
│    k8s-default-zluiingr-e9951b35c2-755748288.us-west-1.elb.amazonaws.com    │
│                          (Port 80 / 443)                                    │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Kubernetes Ingress                                  │
│                          (zlui-ingress)                                     │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          zlui-service                                       │
│                        (ClusterIP:8080)                                     │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            zlui Pods                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### STEP 43: Install AWS Load Balancer Controller

#### Explanation
Installs the AWS Load Balancer Controller, which watches for Kubernetes Ingress resources and provisions AWS ALBs automatically.

#### What It Does
- Downloads and creates IAM policy for ALB management
- Creates IAM service account with ALB permissions
- Installs cert-manager for certificate handling
- Deploys AWS Load Balancer Controller via Helm

#### Why It's Needed
The AWS Load Balancer Controller is required to:
- Automatically provision ALBs when Ingress resources are created
- Manage ALB target groups and listeners
- Configure health checks and routing rules
- Handle ALB lifecycle (create, update, delete)

#### Prerequisite Tasks
- Step 2: OIDC Provider associated
- Helm installed and in PATH
- Steps 38-42: Application deployed and running

#### Dependent Tasks
- Step 44: Create Ingress (requires controller to process)
- Step 45: Verify Ingress and ALB

#### Code Block

**Download IAM Policy:**

**Bash:**
```bash
curl -o iam-policy-alb.json https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v2.11.0/docs/install/iam_policy.json
```

**PowerShell:**
```powershell
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v2.11.0/docs/install/iam_policy.json" -OutFile "iam-policy-alb.json"
```

---

**Create IAM Policy (All Shells):**
```bash
aws iam create-policy --policy-name AWSLoadBalancerControllerIAMPolicy --policy-document file://iam-policy-alb.json --region us-west-1
```

---

**Create Service Account (All Shells):**
```bash
eksctl create iamserviceaccount --cluster=usw1-zlps-eks-01 --namespace=kube-system --name=aws-load-balancer-controller --attach-policy-arn=arn:aws:iam::995553364920:policy/AWSLoadBalancerControllerIAMPolicy --override-existing-serviceaccounts --approve --region us-west-1
```

---

**Install cert-manager (All Shells):**
```bash
kubectl apply --validate=false -f https://github.com/jetstack/cert-manager/releases/download/v1.13.3/cert-manager.yaml
```

---

**Add Helm Repository (All Shells):**
```bash
helm repo add eks https://aws.github.io/eks-charts
helm repo update
```

---

**Install Controller via Helm:**

**PowerShell:**
```powershell
helm install aws-load-balancer-controller eks/aws-load-balancer-controller `
  -n kube-system `
  --set clusterName=usw1-zlps-eks-01 `
  --set serviceAccount.create=false `
  --set serviceAccount.name=aws-load-balancer-controller `
  --set region=us-west-1 `
  --set vpcId=vpc-07644cdd0224da4f3
```

**Bash:**
```bash
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=usw1-zlps-eks-01 \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller \
  --set region=us-west-1 \
  --set vpcId=vpc-07644cdd0224da4f3
```

**Windows CMD:**
```cmd
helm install aws-load-balancer-controller eks/aws-load-balancer-controller -n kube-system --set clusterName=usw1-zlps-eks-01 --set serviceAccount.create=false --set serviceAccount.name=aws-load-balancer-controller --set region=us-west-1 --set vpcId=vpc-07644cdd0224da4f3
```

---

**Verify Controller Installation:**
```bash
kubectl get deployment -n kube-system aws-load-balancer-controller
```

---

### STEP 44: Create Ingress for Public Access

#### Explanation
Creates a Kubernetes Ingress resource that defines how external traffic should be routed to the zlui service.

#### What It Does
- Creates Ingress resource with ALB annotations
- Configures ALB as internet-facing load balancer
- Routes all HTTP traffic to zlui-service on port 8080
- Triggers ALB creation by the Load Balancer Controller

#### Why It's Needed
The Ingress resource tells Kubernetes (and the ALB Controller) to:
- Create an internet-facing ALB
- Configure listener on port 80
- Create target group pointing to zlui pods
- Set up health checks

#### Prerequisite Tasks
- Step 43: AWS Load Balancer Controller installed
- Step 40: zlui service created
- Step 41-42: Application pods running

#### Dependent Tasks
- Step 45: Verify Ingress and ALB

#### Code Block

**All Shells (PowerShell, Bash, CMD):**
```bash
kubectl apply -f yaml/zlui-ingress.yaml
```

**Verify Ingress Created:**
```bash
kubectl get ingress zlui-ingress
```

> See **Appendix A** for complete `zlui-ingress.yaml` content.

---

### STEP 45: Verify Ingress and ALB

#### Explanation
Confirms the Ingress resource was created and the ALB was provisioned with a public DNS name.

#### What It Does
- Retrieves Ingress resource details
- Shows ALB DNS name (ADDRESS field)
- Confirms routing is configured

#### Why It's Needed
The ALB DNS name is required to access the application. ALB provisioning takes 2-5 minutes, so this step confirms the load balancer is ready.

#### Prerequisite Tasks
- Step 44: Ingress created

#### Dependent Tasks
- Application access via browser

#### Code Block

**All Shells (PowerShell, Bash, CMD):**
```bash
kubectl get ingress zlui-ingress
```

**Expected Output:**
```
NAME           CLASS   HOSTS   ADDRESS                                                                 PORTS   AGE
zlui-ingress   alb     *       k8s-default-zluiingr-e9951b35c2-755748288.us-west-1.elb.amazonaws.com   80      5m
```

**Access URL:**
```
http://k8s-default-zluiingr-e9951b35c2-755748288.us-west-1.elb.amazonaws.com
```

**Verify ALB in AWS Console:**
```bash
aws elbv2 describe-load-balancers --region us-west-1 --query "LoadBalancers[?contains(LoadBalancerName, 'k8s-default-zluiingr')]"
```

> **Note:** It may take 2-5 minutes for the ALB to become active and DNS to propagate.

---

## 11. PHASE 10: Cluster Autoscaling (Optional)

### Overview

Cluster Autoscaler automatically adjusts the number of nodes in your EKS node group based on pod resource requests. When pods can't be scheduled due to insufficient resources, the autoscaler adds nodes. When nodes are underutilized, it removes them.

### Why Autoscaling Is Needed
- **Cost Optimization:** Scale down during low usage periods
- **Availability:** Scale up when demand increases
- **Automation:** No manual intervention required
- **Resource Efficiency:** Match capacity to actual workload

---

### STEP 46: Create Cluster Autoscaler IAM Policy

#### Explanation
Creates an IAM policy that grants the Cluster Autoscaler permissions to modify Auto Scaling Groups.

#### What It Does
- Creates custom IAM policy from JSON file
- Grants permissions to describe and modify ASG settings
- Allows EC2 instance termination for scale-down
- Returns policy ARN for service account attachment

#### Why It's Needed
The Cluster Autoscaler runs as a pod and needs AWS API permissions to:
- Query current ASG state
- Increase/decrease desired capacity
- Terminate instances during scale-down

#### Prerequisite Tasks
- `policies/ClusterAutoscalerPolicy.json` file exists
- AWS CLI configured

#### Dependent Tasks
- Step 47: Create Service Account for Autoscaler

#### Code Block

**All Shells (PowerShell, Bash, CMD):**
```bash
aws iam create-policy --policy-name AmazonEKSClusterAutoscalerPolicy --policy-document file://policies/ClusterAutoscalerPolicy.json --region us-west-1
```

---

### STEP 47: Create Service Account for Autoscaler

#### Explanation
Creates a Kubernetes service account with IAM role permissions for the Cluster Autoscaler.

#### What It Does
- Creates ServiceAccount `cluster-autoscaler` in kube-system
- Creates IAM role with OIDC trust policy
- Attaches Cluster Autoscaler policy
- Enables IRSA for secure AWS access

#### Why It's Needed
The Cluster Autoscaler pod needs IAM permissions to modify ASG settings. IRSA provides secure, scoped access without embedding credentials.

#### Prerequisite Tasks
- Step 2: OIDC Provider associated
- Step 46: Cluster Autoscaler IAM Policy created

#### Dependent Tasks
- Step 48: Tag ASG for discovery
- Step 50: Deploy Cluster Autoscaler

#### Code Block

**All Shells (PowerShell, Bash, CMD):**
```bash
eksctl create iamserviceaccount --cluster usw1-zlps-eks-01 --region us-west-1 --namespace kube-system --name cluster-autoscaler --attach-policy-arn arn:aws:iam::995553364920:policy/AmazonEKSClusterAutoscalerPolicy --approve --override-existing-serviceaccounts
```

---

### STEP 48: Tag ASG for Cluster Autoscaler Discovery

#### Explanation
Adds tags to the Auto Scaling Group that enable the Cluster Autoscaler to discover and manage it.

#### What It Does
- Adds `k8s.io/cluster-autoscaler/enabled` tag
- Adds cluster-specific ownership tag
- Enables autoscaler to identify which ASGs to manage

#### Why It's Needed
The Cluster Autoscaler uses these tags to discover which ASGs belong to the cluster. Without proper tags, the autoscaler won't know which node groups to scale.

#### Prerequisite Tasks
- Node group ASG exists
- ASG name/ID known (from EKS console or CLI)

#### Dependent Tasks
- Step 50: Deploy Cluster Autoscaler

#### Code Block

**PowerShell:**
```powershell
aws autoscaling create-or-update-tags --region us-west-1 --tags `
  Key=k8s.io/cluster-autoscaler/enabled,Value=true,PropagateAtLaunch=true,ResourceId=eks-uw1-zlps-ng-01-d0cd73a2-abab-6472-fbab-1083d5c5570b,ResourceType=auto-scaling-group `
  Key=k8s.io/cluster-autoscaler/usw1-zlps-eks-01,Value=owned,PropagateAtLaunch=true,ResourceId=eks-uw1-zlps-ng-01-d0cd73a2-abab-6472-fbab-1083d5c5570b,ResourceType=auto-scaling-group
```

**Bash:**
```bash
aws autoscaling create-or-update-tags --region us-west-1 --tags \
  Key=k8s.io/cluster-autoscaler/enabled,Value=true,PropagateAtLaunch=true,ResourceId=eks-uw1-zlps-ng-01-d0cd73a2-abab-6472-fbab-1083d5c5570b,ResourceType=auto-scaling-group \
  Key=k8s.io/cluster-autoscaler/usw1-zlps-eks-01,Value=owned,PropagateAtLaunch=true,ResourceId=eks-uw1-zlps-ng-01-d0cd73a2-abab-6472-fbab-1083d5c5570b,ResourceType=auto-scaling-group
```

**Windows CMD:**
```cmd
aws autoscaling create-or-update-tags --region us-west-1 --tags Key=k8s.io/cluster-autoscaler/enabled,Value=true,PropagateAtLaunch=true,ResourceId=eks-uw1-zlps-ng-01-d0cd73a2-abab-6472-fbab-1083d5c5570b,ResourceType=auto-scaling-group Key=k8s.io/cluster-autoscaler/usw1-zlps-eks-01,Value=owned,PropagateAtLaunch=true,ResourceId=eks-uw1-zlps-ng-01-d0cd73a2-abab-6472-fbab-1083d5c5570b,ResourceType=auto-scaling-group
```

> **Note:** Replace the ASG ResourceId with your actual ASG name from the EKS console.

---

### STEP 49: Update Node Group Scaling Limits

#### Explanation
Updates the node group's minimum and maximum node counts to allow the autoscaler to scale within the desired range.

#### What It Does
- Sets minimum nodes (floor for scale-down)
- Sets maximum nodes (ceiling for scale-up)
- Sets current desired count
- Updates both EKS node group and underlying ASG

#### Why It's Needed
The autoscaler can only scale within the limits defined on the node group. This step increases the maximum to allow scaling up during high demand.

#### Prerequisite Tasks
- Node group exists
- Step 47-48: Autoscaler IAM and tags configured

#### Dependent Tasks
- Step 50: Deploy Cluster Autoscaler

#### Code Block

**All Shells (PowerShell, Bash, CMD):**
```bash
eksctl scale nodegroup --cluster usw1-zlps-eks-01 --name uw1-zlps-ng-01 --nodes-min 2 --nodes-max 5 --nodes 2 --region us-west-1
```

**Verify:**
```bash
eksctl get nodegroup --cluster usw1-zlps-eks-01 --region us-west-1
```

---

### STEP 50: Deploy Cluster Autoscaler

#### Explanation
Deploys the Cluster Autoscaler as a Kubernetes Deployment that monitors pod scheduling and adjusts node count.

#### What It Does
- Deploys autoscaler pod in kube-system namespace
- Configures cluster name and region
- Uses service account from Step 47
- Starts monitoring for unschedulable pods

#### Why It's Needed
The Cluster Autoscaler is the component that:
- Monitors pending pods that can't be scheduled
- Calculates required node capacity
- Triggers ASG scale-up/scale-down
- Respects PodDisruptionBudgets during scale-down

#### Prerequisite Tasks
- Steps 46-49: IAM, service account, tags, and limits configured
- `yaml/cluster-autoscaler.yaml` file exists

#### Dependent Tasks
- None (autoscaler runs continuously)

#### Code Block

**All Shells (PowerShell, Bash, CMD):**
```bash
kubectl apply -f yaml/cluster-autoscaler.yaml
```

**Verify Deployment:**
```bash
kubectl get deployment cluster-autoscaler -n kube-system
kubectl logs -n kube-system deployment/cluster-autoscaler --tail=50
```

---

## 12. PHASE 11: Post-Deployment Configuration

### Overview

This phase completes the deployment by creating required directory structures in the vault, updating database configurations, and restarting deployments to apply changes.

---

### STEP 51: Create Vault Directory Structure

#### Explanation
Creates all required subdirectories in the EFS-mounted vault with correct naming (case-sensitive).

#### What It Does
- Executes mkdir commands inside the zlui container
- Creates 31+ directories for various application functions
- Sets correct permissions via EFS access point (UID/GID 1000)

#### Why It's Needed
The ZL Application expects specific directories to exist in the vault:
- Document storage directories
- Search index directories
- Log event directories
- Compliance and case management directories

#### Prerequisite Tasks
- Step 40: zlui deployment running
- Step 24: zlvault EFS PVC mounted

#### Dependent Tasks
- Step 52: Verify Vault Structure
- Step 53: Update Database Disk Volume Paths

#### Code Block

**All Shells (runs bash inside Linux container):**
```bash
kubectl exec deployment/zlui -- bash -c 'mkdir -p /var/ZipLip/Vault/{resource,secureResource,zlreport,zlexport,zlperiodic,staging,zlSecureMail,zlArchiveMail,zlArchiveAttach,zlJournalMail,zlJournalAttach,zlSearch,zlSearchMaster,zlSearchOther,zlFileRegular,zlFileSearch,zlFileSearchMaster,zlFileSearchOther,zlCompliance,zlCaseMgmt,zlCcPackage,zlRecord,zlTextDBTemp,zlTextDBMaster,zlBigDBApps,zlLogEvent,zlLogEventSearchMaster,zlLogEventSearch,zlInPlaceWorkspaceIndex,zlInPlaceMailContent,zlInPlaceFileRegular}'
```

---

### STEP 52: Verify Vault Structure

#### Explanation
Confirms all vault directories were created with correct names and permissions.

#### What It Does
- Lists contents of vault directory
- Shows directory count and names
- Verifies case-sensitive naming

#### Why It's Needed
Linux is case-sensitive. Directory names must exactly match what the application expects. This verification catches naming errors before they cause application failures.

#### Prerequisite Tasks
- Step 51: Vault directories created

#### Dependent Tasks
- Step 53: Update Database Disk Volume Paths

#### Code Block

**All Shells (runs inside Linux container):**
```bash
kubectl exec deployment/zlui -- ls -la /var/ZipLip/Vault/
```

**Expected Output:**
```
drwxr-xr-x  2 1000 1000 6144 Dec 13 10:00 resource
drwxr-xr-x  2 1000 1000 6144 Dec 13 10:00 secureResource
drwxr-xr-x  2 1000 1000 6144 Dec 13 10:00 staging
drwxr-xr-x  2 1000 1000 6144 Dec 13 10:00 zlArchiveAttach
drwxr-xr-x  2 1000 1000 6144 Dec 13 10:00 zlArchiveMail
... (31 directories total)
```

**Count Directories:**
```bash
kubectl exec deployment/zlui -- bash -c 'ls -d /var/ZipLip/Vault/*/ | wc -l'
```

---

### STEP 53: Update Database Disk Volume Paths

#### Explanation
Updates the diskvolume table in the database to reflect the new EFS mount paths used in Kubernetes.

#### What It Does
- Connects to RDS via SSM tunnel (Step 31) or directly
- Updates dvpath column in diskvolume table
- Changes paths from on-premises format to Kubernetes EFS format

#### Why It's Needed
The database contains paths to vault directories. When migrating to Kubernetes with EFS, these paths change from the original installation paths to the new mount point (`/var/ZipLip/Vault/`).

#### Prerequisite Tasks
- Step 31: Database access via SSM tunnel
- Step 51-52: Vault directories created
- Database connection (SSMS, sqlcmd, or application)

#### Dependent Tasks
- Step 54: Restart deployments to use new paths

#### Code Block

**SQL (run via SSMS or sqlcmd):**
```sql
-- View current paths
SELECT dvid, dvpath FROM diskvolume WHERE dvpath LIKE '%ZLVault%';

-- Update paths to new mount point
UPDATE diskvolume 
SET dvpath = REPLACE(dvpath, '/zlvault/Archive_Vault/ZLVault/', '/var/ZipLip/Vault/')
WHERE dvpath LIKE '/zlvault/Archive_Vault/ZLVault/%';

-- Verify update
SELECT dvid, dvpath FROM diskvolume;
```

> **Note:** Adjust the source path pattern to match your original installation paths.

---

### STEP 54: Restart Deployments After Configuration Changes

#### Explanation
Restarts all application deployments to ensure they pick up the latest configuration changes and reconnect to updated resources.

#### What It Does
- Triggers rolling restart of specified deployments
- Pods are terminated and recreated one at a time
- New pods mount fresh volume connections
- Ensures configuration changes take effect

#### Why It's Needed
After making configuration changes (vault paths, database settings, etc.), existing pods may have cached old configuration. A rolling restart ensures all pods run with the current settings.

#### Prerequisite Tasks
- Steps 51-53: Configuration changes completed
- All deployments in Running state

#### Dependent Tasks
- Final verification of application functionality

#### Code Block

**All Shells (PowerShell, Bash, CMD):**
```bash
kubectl rollout restart deployment zlserver zltika zlui
```

**Watch Rollout Status:**
```bash
kubectl rollout status deployment zlui
kubectl rollout status deployment zlserver
kubectl rollout status deployment zltika
```

**Verify All Pods Running:**
```bash
kubectl get pods -n default
```

---

## 13. Troubleshooting

### Overview

This section provides solutions for common issues encountered during ZL Application deployment on AWS EKS. Each issue includes symptoms, root cause analysis, and resolution steps.

---

### Issue 1: Tika Connectivity Error

#### Symptoms
- Error message: `"Unable to connect!"` or `"Thread has already exited"`
- Document conversion fails
- zlserver/zlui logs show Tika connection timeout

#### Root Cause
The ZL Application is configured to connect to Tika on `localhost`, but in Kubernetes each pod has its own localhost. The DocumentConversion.xml ConfigMap must override the hostname to use the Kubernetes service name.

#### Resolution

**Step 1: Verify ConfigMap exists:**
```bash
kubectl get configmap docconvert-config
```

**Step 2: Apply ConfigMap if missing:**
```bash
kubectl apply -f yaml/docconvert-configmap.yaml
```

**Step 3: Verify ConfigMap is mounted in deployments:**
```bash
kubectl describe deployment zlui | grep -A5 "Mounts:"
kubectl describe deployment zlserver | grep -A5 "Mounts:"
```

**Step 4: Restart deployments:**
```bash
kubectl rollout restart deployment zlserver zlui
```

**Step 5: Verify Tika service is accessible:**
```bash
kubectl exec deployment/zlui -- curl -s http://zltika:9998/tika
```

---

### Issue 2: Database Connection Issues

#### Symptoms
- Error message: `"Login failed for user"`
- Application fails to start
- zlui shows 500 error on login

#### Root Cause
Database credentials are incorrect, or the RDS endpoint is unreachable from the EKS cluster.

#### Resolution

**Step 1: Verify database ConfigMap:**
```bash
kubectl get configmap db-config -o yaml
```

**Step 2: Verify database Secret exists:**
```bash
kubectl get secret db-secret
```

**Step 3: Test database connectivity from a pod:**
```bash
kubectl exec deployment/zlui -- bash -c 'nc -zv usw1-zlps-msexpsql-01-eks.c5s06occm2dn.us-west-1.rds.amazonaws.com 1433'
```

**Step 4: Verify pfuser exists in database:**
```sql
-- Run via SSMS (use SSM tunnel from Step 31)
SELECT name, type_desc FROM sys.database_principals WHERE name = 'pfuser';
```

**Step 5: Reset password if needed:**
```sql
ALTER LOGIN pfuser WITH PASSWORD = 'NewPassword';
```

**Step 6: Update Kubernetes secret and restart:**
```bash
# Update yaml/zldb-secret.yaml with new base64-encoded password
kubectl apply -f yaml/zldb-secret.yaml
kubectl rollout restart deployment zlserver zlui
```

---

### Issue 3: ZooKeeper Not Ready

#### Symptoms
- Error message: `"null instance"` in zlui logs
- Application shows 404 error
- ZooKeeper pods not all Running

#### Root Cause
ZooKeeper ensemble is not healthy, or the application cannot connect to ZooKeeper services.

#### Resolution

**Step 1: Check ZooKeeper pod status:**
```bash
kubectl get pods -l app=zlzookeeper
```

**Step 2: Check ZooKeeper logs:**
```bash
kubectl logs zlzookeeper-0
kubectl logs zlzookeeper-1
kubectl logs zlzookeeper-2
```

**Step 3: Verify ZooKeeper service endpoints:**
```bash
kubectl get endpoints zk-cs
```

**Expected Output:**
```
NAME    ENDPOINTS                                                     AGE
zk-cs   10.0.x.x:2181,10.0.y.y:2181,10.0.z.z:2181                    1d
```

**Step 4: Verify zlapp-config has correct ZOO_SERVERS:**
```bash
kubectl get configmap zlapp-config -o yaml | grep ZOO_SERVERS
```

**Step 5: Test ZooKeeper connectivity:**
```bash
kubectl exec zlzookeeper-0 -- zkCli.sh -server localhost:2181 ls /
```

**Step 6: If ZooKeeper data is corrupted, delete PVCs and redeploy:**
```bash
# WARNING: This deletes ZooKeeper data!
kubectl delete statefulset zlzookeeper
kubectl delete pvc -l app=zlzookeeper
kubectl apply -f yaml/zlzookeeper-statefulset.yaml
```

---

### Issue 4: Image Pull Errors

#### Symptoms
- Pod status: `ImagePullBackOff` or `ErrImagePull`
- Error: `unauthorized: authentication required`
- New pods fail to start

#### Root Cause
ECR authentication tokens expire after 12 hours. The docker-secret needs to be refreshed.

#### Resolution

**PowerShell:**
```powershell
# Delete existing secrets
kubectl delete secret docker-secret -n default
kubectl delete secret docker-secret -n kube-system

# Recreate with fresh token
$ECR_PASSWORD = aws ecr get-login-password --region us-west-1

kubectl create secret docker-registry docker-secret `
  --docker-server=995553364920.dkr.ecr.us-west-1.amazonaws.com/uw1-zlps-ecr-01 `
  --docker-username=AWS `
  --docker-password=$ECR_PASSWORD `
  --namespace default

kubectl create secret docker-registry docker-secret `
  --docker-server=995553364920.dkr.ecr.us-west-1.amazonaws.com/uw1-zlps-ecr-01 `
  --docker-username=AWS `
  --docker-password=$ECR_PASSWORD `
  --namespace kube-system
```

**Bash:**
```bash
# Delete existing secrets
kubectl delete secret docker-secret -n default
kubectl delete secret docker-secret -n kube-system

# Recreate with fresh token
kubectl create secret docker-registry docker-secret \
  --docker-server=995553364920.dkr.ecr.us-west-1.amazonaws.com/uw1-zlps-ecr-01 \
  --docker-username=AWS \
  --docker-password="$(aws ecr get-login-password --region us-west-1)" \
  --namespace default

kubectl create secret docker-registry docker-secret \
  --docker-server=995553364920.dkr.ecr.us-west-1.amazonaws.com/uw1-zlps-ecr-01 \
  --docker-username=AWS \
  --docker-password="$(aws ecr get-login-password --region us-west-1)" \
  --namespace kube-system
```

**Restart affected pods:**
```bash
kubectl rollout restart deployment zlui zlserver zltika
```

---

### Issue 5: EFS Mount Failures

#### Symptoms
- Pod status: `ContainerCreating` for extended time
- Error: `MountVolume.SetUp failed`
- Events show `mount.nfs: Connection timed out`

#### Root Cause
EFS mount targets don't exist in the node's availability zone, or security groups block NFS traffic (port 2049).

#### Resolution

**Step 1: Verify mount targets exist:**
```bash
aws efs describe-mount-targets --file-system-id fs-0a4ec87cd91178047 --region us-west-1
```

**Step 2: Check mount target availability zones:**
Both `us-west-1a` and `us-west-1c` should have mount targets.

**Step 3: Create missing mount target:**
```bash
# For us-west-1a
aws efs create-mount-target --file-system-id fs-0a4ec87cd91178047 --subnet-id subnet-01c24772a882a3a1b --security-groups sg-0afb0a3f0c30ba84d --region us-west-1

# For us-west-1c
aws efs create-mount-target --file-system-id fs-0a4ec87cd91178047 --subnet-id subnet-06eb80d784d985109 --security-groups sg-0afb0a3f0c30ba84d --region us-west-1
```

**Step 4: Verify security group allows NFS:**
```bash
aws ec2 describe-security-groups --group-ids sg-0afb0a3f0c30ba84d --query "SecurityGroups[].IpPermissions[?FromPort==\`2049\`]" --region us-west-1
```

**Step 5: Add NFS rule if missing:**
```bash
aws ec2 authorize-security-group-ingress --group-id sg-0afb0a3f0c30ba84d --protocol tcp --port 2049 --source-group sg-0afb0a3f0c30ba84d --region us-west-1
```

**Step 6: Verify PV access point IDs match:**
```bash
kubectl get pv -o yaml | grep -A2 "volumeHandle"
```

---

### Issue 6: 404 Error on Application

#### Symptoms
- Browser shows `404 - Page not found`
- Application loads but routes fail
- Login page not displayed

#### Root Cause
ZooKeeper bootstrap has not completed, or the application hasn't fully initialized.

#### Resolution

**Step 1: Check ZooKeeper status:**
```bash
kubectl get pods -l app=zlzookeeper
```

All 3 pods should be `Running` with `1/1` ready.

**Step 2: Check zlui initialization logs:**

**PowerShell:**
```powershell
kubectl logs deployment/zlui | Select-String -Pattern "initializing|done|error" -Context 0,2
```

**Bash:**
```bash
kubectl logs deployment/zlui | grep -i "initializing\|done\|error"
```

**Step 3: Wait for initialization (can take 2-5 minutes on first start)**

**Step 4: Restart zlui if stuck:**
```bash
kubectl rollout restart deployment zlui
```

**Step 5: Check for database initialization:**
```bash
kubectl logs deployment/zlui | grep -i "database\|connection"
```

---

### Issue 7: 500 Access Denied Error

#### Symptoms
- Error: `500 - Internal Server Error`
- Message from `ZLJspFilter`
- Application partially loads then fails

#### Root Cause
Application not fully initialized, or database permissions issue.

#### Resolution

**Step 1: Check all pods are running:**
```bash
kubectl get pods -n default
```

**Step 2: Verify database connectivity:**
```bash
kubectl logs deployment/zlui | grep -i "database\|connection\|error"
```

**Step 3: Check pfuser has db_owner role:**
```sql
-- Run via SSMS
EXEC sp_helpuser 'pfuser';
-- Should show db_owner role
```

**Step 4: Grant db_owner if missing:**
```sql
USE ZLDB;
EXEC sp_addrolemember 'db_owner', 'pfuser';
```

**Step 5: Restart application:**
```bash
kubectl rollout restart deployment zlui zlserver
```

---

### Issue 8: Pods Stuck in Pending State

#### Symptoms
- Pod status: `Pending`
- Events show: `FailedScheduling`
- Message: `Insufficient cpu` or `Insufficient memory`

#### Root Cause
Not enough node resources to schedule the pod, or node group has reached maximum capacity.

#### Resolution

**Step 1: Check pod events:**
```bash
kubectl describe pod <pod-name> | grep -A10 Events
```

**Step 2: Check node resources:**
```bash
kubectl describe nodes | grep -A5 "Allocated resources"
```

**Step 3: Scale node group:**
```bash
eksctl scale nodegroup --cluster usw1-zlps-eks-01 --name uw1-zlps-ng-01 --nodes 3 --region us-west-1
```

**Step 4: If autoscaler is configured, check its logs:**
```bash
kubectl logs -n kube-system deployment/cluster-autoscaler --tail=50
```

---

### Issue 9: ALB Not Created / Ingress Has No Address

#### Symptoms
- `kubectl get ingress` shows empty ADDRESS field
- ALB not visible in AWS console
- External access not working

#### Root Cause
AWS Load Balancer Controller is not running, or Ingress annotations are incorrect.

#### Resolution

**Step 1: Check Load Balancer Controller:**
```bash
kubectl get deployment -n kube-system aws-load-balancer-controller
kubectl logs -n kube-system deployment/aws-load-balancer-controller --tail=50
```

**Step 2: Check Ingress events:**
```bash
kubectl describe ingress zlui-ingress
```

**Step 3: Verify Ingress annotations:**
```bash
kubectl get ingress zlui-ingress -o yaml | grep -A10 annotations
```

Required annotations:
```yaml
annotations:
  kubernetes.io/ingress.class: alb
  alb.ingress.kubernetes.io/scheme: internet-facing
  alb.ingress.kubernetes.io/target-type: ip
```

**Step 4: Reinstall Load Balancer Controller if needed (see Step 43)**

---

### Issue 10: Data Written to Container Instead of EFS

#### Symptoms
- Files disappear after pod restart
- Logs show files created but not visible after restart
- Vault directories empty after pod recreation

#### Root Cause
Volume mounts are not configured in the deployment YAML, so data is written to the container's ephemeral filesystem instead of the persistent EFS volume.

#### Resolution

**Step 1: Verify volume mounts in deployment:**
```bash
kubectl describe deployment zlui | grep -A20 "Mounts:"
kubectl describe deployment zlserver | grep -A20 "Mounts:"
```

**Step 2: Check PVC is bound:**
```bash
kubectl get pvc
```

All PVCs should show `Bound` status.

**Step 3: Verify volumeMounts in YAML:**

Deployments should have:
```yaml
volumeMounts:
  - name: zlvault-efs
    mountPath: /var/ZipLip/Vault
```

And corresponding:
```yaml
volumes:
  - name: zlvault-efs
    persistentVolumeClaim:
      claimName: efs-pvc-zlvault
```

**Step 4: Update deployment YAML and reapply:**
```bash
kubectl apply -f yaml/zlui-deployment.yaml
kubectl apply -f yaml/zlserver-deployment.yaml
```

> ⚠️ **Warning:** Data written to container storage before the mount was configured is NOT recoverable. Always verify mounts before processing important data.

---

### Quick Reference: Useful Diagnostic Commands

```bash
# Pod status and events
kubectl get pods -n default
kubectl describe pod <pod-name>

# Deployment logs
kubectl logs deployment/zlui --tail=100
kubectl logs deployment/zlserver --tail=100
kubectl logs deployment/zltika --tail=100

# ZooKeeper logs
kubectl logs zlzookeeper-0 --tail=100

# Check all services
kubectl get services

# Check endpoints
kubectl get endpoints

# Check PV/PVC status
kubectl get pv
kubectl get pvc

# Check ConfigMaps
kubectl get configmaps

# Check Secrets
kubectl get secrets

# Node status
kubectl get nodes
kubectl describe nodes

# Resource usage
kubectl top pods
kubectl top nodes
```

---

## Appendix A: YAML File Reference

### Overview

This appendix contains the complete YAML files used in the ZL Application deployment. All files are located in the `yaml/` directory.

### Volume Mount Summary

All ZL pods require access to specific EFS volumes for proper operation:

| Pod       | Vault Access | Logs Access      | Temp Access      | DocConvert ConfigMap |
|-----------|--------------|------------------|------------------|----------------------|
| zlui      | ✅ zlvault    | ✅ zluilogs      | ✅ zltikatemp    | ✅ Yes               |
| zlserver  | ✅ zlvault    | ✅ zlserverlogs  | ✅ zlservertemp  | ✅ Yes               |
| zltika    | ❌ No         | ❌ No            | ✅ zltikatemp    | ❌ No                |
| zookeeper | ❌ No         | ❌ No            | ❌ No            | ❌ No (uses EBS)     |

---

### A.1 zlui-deployment.yaml - ZL UI Application

**Purpose:** Deploys the web UI for ZL application  
**Image:** zlserver-11.0.1-b123 (shared with zlserver)  
**Replicas:** 1

**Volume Mounts:**
- `/opt/ZipLip/zlserver/WEB-INF/tmp` → zltikatemp-efs (shared temp)
- `/opt/ZipLip/logs` → zluilogs-efs (UI logs)
- `/var/ZipLip/Vault` → zlvault-efs (main vault storage)
- `DocumentConversion.xml` → docconvert-config (Tika hostname override)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    name: zlui
  name: zlui
spec:
  replicas: 1
  selector:
    matchLabels:
      app: zlui
  strategy:
    type: Recreate
  template:
    metadata:
      labels:
        app: zlui
    spec:
      serviceAccountName: zlapp-sa
      imagePullSecrets:
        - name: docker-secret
      containers:
        - name: zlui
          image: 995553364920.dkr.ecr.us-west-1.amazonaws.com/uw1-zlps-ecr-01:zlserver-11.0.1-b123
          imagePullPolicy: Always
          resources:
            limits:
              cpu: 500m
              memory: 1Gi
            requests:
              cpu: 500m
              memory: 1Gi
          env:
            - name: CLUSTER_NAME
              value: ZLUI
            - name: INITIAL_EXECUTORS
              value: "5"
            - name: SERVICE_EXECUTORS
              value: "5"
            - name: MANAGED_EXECUTORS
              value: "5"
          envFrom:
            - configMapRef:
                name: zlapp-config
            - configMapRef:
                name: db-config
            - secretRef:
                name: db-secret
          volumeMounts:
            - mountPath: /opt/ZipLip/zlserver/WEB-INF/tmp
              name: zltikatemp
            - mountPath: /opt/ZipLip/logs
              name: zluilogs
            - mountPath: /var/ZipLip/Vault
              name: zlvault
            - mountPath: /opt/ZipLip/zlserver/WEB-INF/config/app/sheet/DocumentConversion.xml
              name: docconvert-config
              subPath: DocumentConversion.xml
      restartPolicy: Always
      volumes:
        - name: zltikatemp
          persistentVolumeClaim:
            claimName: zltikatemp-efs
        - name: zluilogs
          persistentVolumeClaim:
            claimName: zluilogs-efs
        - name: zlvault
          persistentVolumeClaim:
            claimName: zlvault-efs
        - name: docconvert-config
          configMap:
            name: docconvert-config
```

---

### A.2 zlserver-deployment.yaml - ZL Server Backend

**Purpose:** Backend processing server  
**Image:** zlserver-11.0.1-b123  
**Replicas:** 1

**Volume Mounts:**
- `/opt/ZipLip/zlserver/WEB-INF/tmp` → zlservertemp-efs (temp files)
- `/opt/ZipLip/logs` → zlserverlogs-efs (server logs)
- `/var/ZipLip/Vault` → zlvault-efs (shared vault storage)
- `DocumentConversion.xml` → docconvert-config (Tika hostname override)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    name: zlserver
  name: zlserver
spec:
  replicas: 1
  selector:
    matchLabels:
      app: zlserver
  strategy:
    type: Recreate
  template:
    metadata:
      labels:
        app: zlserver
    spec:
      serviceAccountName: zlapp-sa
      imagePullSecrets:
        - name: docker-secret
      containers:
        - name: zlserver
          image: 995553364920.dkr.ecr.us-west-1.amazonaws.com/uw1-zlps-ecr-01:zlserver-11.0.1-b123
          imagePullPolicy: Always
          resources:
            limits:
              cpu: 250m
              memory: 500Mi
            requests:
              cpu: 100m
              memory: 256Mi
          ports:
            - containerPort: 9972
          envFrom:
            - configMapRef:
                name: db-config
            - configMapRef:
                name: zlapp-config
            - secretRef:
                name: db-secret
          volumeMounts:
            - mountPath: /opt/ZipLip/zlserver/WEB-INF/tmp
              name: zlservertemp
            - mountPath: /opt/ZipLip/zlserver/WEB-INF/config/app/sheet/DocumentConversion.xml
              name: docconvert-config
              subPath: DocumentConversion.xml
            - mountPath: /opt/ZipLip/logs
              name: zlserverlogs
            - mountPath: /var/ZipLip/Vault
              name: zlvault
      volumes:
        - name: zlservertemp
          persistentVolumeClaim:
            claimName: zlservertemp-efs
        - name: docconvert-config
          configMap:
            name: docconvert-config
        - name: zlserverlogs
          persistentVolumeClaim:
            claimName: zlserverlogs-efs
        - name: zlvault
          persistentVolumeClaim:
            claimName: zlvault-efs
```

---

### A.3 zltika-deployment.yaml - Document Conversion Service

**Purpose:** Apache Tika-based document conversion for indexing and viewing  
**Image:** zltika-11.0.1-b123  
**Replicas:** 1

**Volume Mounts:**
- `/opt/ZipLip/zlserver/WEB-INF/tmp` → zltikatemp-efs (shared temp for document processing)

> **Note:** zltika only needs access to the temp directory where documents are staged for conversion. It does not need vault or log access.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    name: zltika
  name: zltika
spec:
  replicas: 1
  selector:
    matchLabels:
      app: zltika
  strategy:
    type: Recreate
  template:
    metadata:
      labels:
        app: zltika
    spec:
      serviceAccountName: zlapp-sa
      imagePullSecrets:
        - name: docker-secret
      containers:
        - name: zltika
          image: 995553364920.dkr.ecr.us-west-1.amazonaws.com/uw1-zlps-ecr-01:zltika-11.0.1-b123
          imagePullPolicy: Always
          resources:
            limits:
              cpu: 250m
              memory: 500Mi
            requests:
              cpu: 100m
              memory: 256Mi
          ports:
            - containerPort: 9972
          volumeMounts:
            - mountPath: /opt/ZipLip/zlserver/WEB-INF/tmp
              name: zltikatemp
      volumes:
        - name: zltikatemp
          persistentVolumeClaim:
            claimName: zltikatemp-efs
```

---

### A.4 zltika-service.yaml - Tika Service

**Purpose:** Exposes Tika pod for internal cluster access  
**Type:** ClusterIP  
**Port:** 9972

```yaml
apiVersion: v1
kind: Service
metadata:
  labels:
    app: zltika
  name: zltika
spec:
  ports:
    - name: "9972"
      port: 9972
      targetPort: 9972
  selector:
    app: zltika
```

---

### A.5 zlzookeeper-statefulset.yaml - ZooKeeper Cluster

**Purpose:** Distributed coordination service for cluster state management  
**Image:** zlzookeeper-11.0.1-b123  
**Replicas:** 3 (for quorum)

**Storage:** Uses EBS volumes (not EFS) via volumeClaimTemplates for performance and data isolation.

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: zlzookeeper
  labels:
    app: zlzookeeper
spec:
  serviceName: zk-hs
  replicas: 3
  selector:
    matchLabels:
      app: zlzookeeper
  template:
    metadata:
      labels:
        app: zlzookeeper
    spec:
      serviceAccountName: zlapp-sa
      imagePullSecrets:
        - name: docker-secret
      containers:
        - name: zlzookeeper
          image: 995553364920.dkr.ecr.us-west-1.amazonaws.com/uw1-zlps-ecr-01:zlzookeeper-11.0.1-b123
          imagePullPolicy: Always
          envFrom:
            - configMapRef:
                name: zlapp-config
          ports:
            - containerPort: 2181
              name: client
            - containerPort: 2888
              name: peer
            - containerPort: 3888
              name: election
          resources:
            limits:
              cpu: 500m
              memory: 2Gi
            requests:
              cpu: 200m
              memory: 500Mi
          volumeMounts:
            - name: zlzkdata
              mountPath: /var/ZipLip/DATA/ZooKeeper
      restartPolicy: Always
  volumeClaimTemplates:
    - metadata:
        name: zlzkdata
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: ebs-sc
        resources:
          requests:
            storage: 10Gi
```

---

### A.6 ZooKeeper Services

#### zk-cs.yaml - ZooKeeper Client Service

**Purpose:** Client connections from application pods  
**Type:** ClusterIP  
**Port:** 2181

```yaml
apiVersion: v1
kind: Service
metadata:
  name: zk-cs
  labels:
    app: zlzookeeper
spec:
  ports:
  - port: 2181
    name: client
  selector:
    app: zlzookeeper
```

#### zk-hs.yaml - ZooKeeper Headless Service

**Purpose:** StatefulSet peer discovery and stable DNS  
**Type:** Headless (clusterIP: None)  
**Ports:** 2888 (peer), 3888 (election)

```yaml
apiVersion: v1
kind: Service
metadata:
  labels:
    app: zlzookeeper
  name: zk-hs
spec:
  ports:
  - port: 2888
    name: server
  - port: 3888
    name: leader-election
  clusterIP: None
  selector:
    app: zlzookeeper
```

---

### A.7 zlui-service.yaml - UI Service

**Purpose:** Internal load balancer for UI access  
**Type:** LoadBalancer (internal)  
**Ports:** 80, 8000, 9975, 9970

```yaml
apiVersion: v1
kind: Service
metadata:
  name: zlui
  labels:
    app: zlui
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-scheme: internal
spec:
  type: LoadBalancer
  ports:
    - name: "80"
      port: 80
      protocol: TCP
      targetPort: 80
    - name: "8000"
      port: 8000
      protocol: TCP
      targetPort: 8000
    - name: "9975"
      port: 9975
      protocol: TCP
      targetPort: 9975
    - name: "9970"
      port: 9970
      protocol: TCP
      targetPort: 9970
  selector:
    app: zlui
```

---

### A.8 zlui-ingress.yaml - Public ALB Ingress

**Purpose:** Expose ZL UI via internet-facing Application Load Balancer  
**Type:** Ingress with ALB IngressClass

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: zlui-ingress
  annotations:
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/subnets: subnet-01c24772a882a3a1b,subnet-06eb80d784d985109
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTP": 80}]'
    alb.ingress.kubernetes.io/healthcheck-path: /
    alb.ingress.kubernetes.io/healthcheck-protocol: HTTP
    alb.ingress.kubernetes.io/healthcheck-port: traffic-port
spec:
  ingressClassName: alb
  rules:
  - http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: zlui
            port:
              number: 80
```

---

### A.9 EFS StorageClass

**Purpose:** Defines how EFS volumes are dynamically provisioned  
**Provisioner:** efs.csi.aws.com

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: efs-sc
provisioner: efs.csi.aws.com
parameters:
  provisioningMode: efs-ap
  fileSystemId: fs-0a4ec87cd91178047
  directoryPerms: "755"
  gidRangeStart: "1000"
  gidRangeEnd: "2000"
  basePath: "/dynamic_provisioning"
```

---

### A.10 EBS StorageClass

**Purpose:** Defines how EBS volumes are dynamically provisioned (used by ZooKeeper)  
**Provisioner:** ebs.csi.aws.com

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ebs-sc
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  fsType: ext4
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
```

---

### A.11 EFS PersistentVolumes

Each EFS access point requires a PersistentVolume and PersistentVolumeClaim pair.

#### efs-pv-zlvault.yaml

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: efs-pv-zlvault
spec:
  capacity:
    storage: 100Gi
  volumeMode: Filesystem
  accessModes:
    - ReadWriteMany
  persistentVolumeReclaimPolicy: Retain
  storageClassName: efs-sc
  csi:
    driver: efs.csi.aws.com
    volumeHandle: fs-0a4ec87cd91178047::fsap-070de74811e8c461f
```

#### efs-pv-zluilogs.yaml

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: efs-pv-zluilogs
spec:
  capacity:
    storage: 10Gi
  volumeMode: Filesystem
  accessModes:
    - ReadWriteMany
  persistentVolumeReclaimPolicy: Retain
  storageClassName: efs-sc
  csi:
    driver: efs.csi.aws.com
    volumeHandle: fs-0a4ec87cd91178047::fsap-06e5e523915353e85
```

#### efs-pv-zlserverlogs.yaml

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: efs-pv-zlserverlogs
spec:
  capacity:
    storage: 10Gi
  volumeMode: Filesystem
  accessModes:
    - ReadWriteMany
  persistentVolumeReclaimPolicy: Retain
  storageClassName: efs-sc
  csi:
    driver: efs.csi.aws.com
    volumeHandle: fs-0a4ec87cd91178047::fsap-0e3cf05f6ae8f8a82
```

#### efs-pv-zltikatemp.yaml

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: efs-pv-zltikatemp
spec:
  capacity:
    storage: 10Gi
  volumeMode: Filesystem
  accessModes:
    - ReadWriteMany
  persistentVolumeReclaimPolicy: Retain
  storageClassName: efs-sc
  csi:
    driver: efs.csi.aws.com
    volumeHandle: fs-0a4ec87cd91178047::fsap-08c3382b23a64f7fd
```

#### efs-pv-zlservertemp.yaml

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: efs-pv-zlservertemp
spec:
  capacity:
    storage: 10Gi
  volumeMode: Filesystem
  accessModes:
    - ReadWriteMany
  persistentVolumeReclaimPolicy: Retain
  storageClassName: efs-sc
  csi:
    driver: efs.csi.aws.com
    volumeHandle: fs-0a4ec87cd91178047::fsap-08c3382b23a64f7fd
```

> **Note:** zlservertemp can share the same zltikatemp access point since both are temp directories.

---

### A.12 EFS PersistentVolumeClaims

#### efs-pvc-zlvault.yaml

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: zlvault-efs
  namespace: default
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: efs-sc
  resources:
    requests:
      storage: 100Gi
  volumeName: efs-pv-zlvault
```

#### efs-pvc-zluilogs.yaml

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: zluilogs-efs
  namespace: default
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: efs-sc
  resources:
    requests:
      storage: 10Gi
  volumeName: efs-pv-zluilogs
```

#### efs-pvc-zlserverlogs.yaml

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: zlserverlogs-efs
  namespace: default
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: efs-sc
  resources:
    requests:
      storage: 10Gi
  volumeName: efs-pv-zlserverlogs
```

#### efs-pvc-zltikatemp.yaml

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: zltikatemp-efs
  namespace: default
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: efs-sc
  resources:
    requests:
      storage: 10Gi
  volumeName: efs-pv-zltikatemp
```

#### efs-pvc-zlservertemp.yaml

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: zlservertemp-efs
  namespace: default
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: efs-sc
  resources:
    requests:
      storage: 10Gi
  volumeName: efs-pv-zlservertemp
```

---

### EFS Access Points Summary

| Access Point ID          | Name            | Path           | PV Name               | PVC Name          |
|--------------------------|-----------------|----------------|-----------------------|-------------------|
| fsap-070de74811e8c461f   | zlvault-ap      | /zlvault       | efs-pv-zlvault        | zlvault-efs       |
| fsap-06e5e523915353e85   | zluilogs-ap     | /zluilogs      | efs-pv-zluilogs       | zluilogs-efs      |
| fsap-0e3cf05f6ae8f8a82   | zlserverlogs-ap | /zlserverlogs  | efs-pv-zlserverlogs   | zlserverlogs-efs  |
| fsap-08c3382b23a64f7fd   | zltikatemp-ap   | /zltikatemp    | efs-pv-zltikatemp     | zltikatemp-efs    |

---

## Appendix B: EFS Access Points and Vault Mount Structure

### B.1 EFS File System Details

| Property        | Value                                    |
|-----------------|------------------------------------------|
| File System ID  | fs-0a4ec87cd91178047                     |
| Name            | usw1-zlps-efs-01                         |
| Region          | us-west-1                                |
| Performance     | General Purpose                          |
| Throughput      | Bursting                                 |

---

### B.2 EFS Access Points

| Access Point ID          | Name            | Root Path      | UID/GID   | Permissions | Used By                |
|--------------------------|-----------------|----------------|-----------|-------------|------------------------|
| fsap-070de74811e8c461f   | zlvault-ap      | /zlvault       | 1000/1000 | 755         | zlui, zlserver         |
| fsap-06e5e523915353e85   | zluilogs-ap     | /zluilogs      | 1000/1000 | 755         | zlui                   |
| fsap-0e3cf05f6ae8f8a82   | zlserverlogs-ap | /zlserverlogs  | 1000/1000 | 755         | zlserver               |
| fsap-08c3382b23a64f7fd   | zltikatemp-ap   | /zltikatemp    | 1000/1000 | 755         | zltika, zlui, zlserver |

---

### B.3 EFS Mount Targets

| Mount Target ID          | Availability Zone | Subnet ID                   | Security Group         |
|--------------------------|-------------------|-----------------------------|-----------------------|
| fsmt-xxxxxxxxxxxxxxxxx   | us-west-1a        | subnet-01c24772a882a3a1b    | sg-0afb0a3f0c30ba84d  |
| fsmt-yyyyyyyyyyyyyyyyy   | us-west-1c        | subnet-06eb80d784d985109    | sg-0afb0a3f0c30ba84d  |

---

### B.4 Volume Mount Mapping

| Pod        | Container Mount Path                                        | EFS Access Point | PVC Name          |
|------------|-------------------------------------------------------------|------------------|-------------------|
| zlui       | /opt/ZipLip/zlserver/WEB-INF/tmp                            | zltikatemp-ap    | zltikatemp-efs    |
| zlui       | /opt/ZipLip/logs                                            | zluilogs-ap      | zluilogs-efs      |
| zlui       | /var/ZipLip/Vault                                           | zlvault-ap       | zlvault-efs       |
| zlserver   | /opt/ZipLip/zlserver/WEB-INF/tmp                            | zltikatemp-ap    | zlservertemp-efs  |
| zlserver   | /opt/ZipLip/logs                                            | zlserverlogs-ap  | zlserverlogs-efs  |
| zlserver   | /var/ZipLip/Vault                                           | zlvault-ap       | zlvault-efs       |
| zltika     | /opt/ZipLip/zlserver/WEB-INF/tmp                            | zltikatemp-ap    | zltikatemp-efs    |

---

### B.5 Vault Directory Structure

The following directories must exist in `/var/ZipLip/Vault/` with exact case-sensitive naming:

```
/var/ZipLip/Vault/
├── resource/                 # General resources
├── secureResource/           # Secure resources
├── staging/                  # Processing staging area
├── zlreport/                 # Report generation
├── zlexport/                 # Data export
├── zlperiodic/               # Periodic processing
├── zlSecureMail/             # Secure mail storage
├── zlArchiveMail/            # Archived email messages
├── zlArchiveAttach/          # Archived email attachments
├── zlJournalMail/            # Journal email messages
├── zlJournalAttach/          # Journal email attachments
├── zlSearch/                 # Search index data
├── zlSearchMaster/           # Master search index
├── zlSearchOther/            # Additional search data
├── zlFileRegular/            # Regular file storage
├── zlFileSearch/             # File search index
├── zlFileSearchMaster/       # Master file search index
├── zlFileSearchOther/        # Additional file search data
├── zlCompliance/             # Compliance data
├── zlCaseMgmt/               # Case management files
├── zlCcPackage/              # CC package storage
├── zlRecord/                 # Records management
├── zlTextDBTemp/             # Temporary text database
├── zlTextDBMaster/           # Master text database
├── zlBigDBApps/              # Large database applications
├── zlLogEvent/               # Log event storage
├── zlLogEventSearchMaster/   # Log event search master index
├── zlLogEventSearch/         # Log event search index
├── zlInPlaceWorkspaceIndex/  # In-place workspace indexing
├── zlInPlaceMailContent/     # In-place mail content
└── zlInPlaceFileRegular/     # In-place regular files
```

**Total: 31 directories**

> ⚠️ **Important:** Directory names are case-sensitive on Linux/EFS! Names must match exactly.

---

### B.6 Create Vault Directories Command

```bash
kubectl exec deployment/zlui -- bash -c 'mkdir -p /var/ZipLip/Vault/{resource,secureResource,zlreport,zlexport,zlperiodic,staging,zlSecureMail,zlArchiveMail,zlArchiveAttach,zlJournalMail,zlJournalAttach,zlSearch,zlSearchMaster,zlSearchOther,zlFileRegular,zlFileSearch,zlFileSearchMaster,zlFileSearchOther,zlCompliance,zlCaseMgmt,zlCcPackage,zlRecord,zlTextDBTemp,zlTextDBMaster,zlBigDBApps,zlLogEvent,zlLogEventSearchMaster,zlLogEventSearch,zlInPlaceWorkspaceIndex,zlInPlaceMailContent,zlInPlaceFileRegular}'
```

---

## Appendix C: ConfigMaps and Secrets

### C.1 zlapp-config - Application Configuration

**Purpose:** ZooKeeper connection settings and Tika service configuration  
**Used By:** zlui, zlserver, zlzookeeper

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: zlapp-config
  namespace: default
data:
  ZOO_SERVERS: zlzookeeper-0.zk-hs.default.svc.cluster.local:2181,zlzookeeper-1.zk-hs.default.svc.cluster.local:2181,zlzookeeper-2.zk-hs.default.svc.cluster.local:2181
  TIKA_HOST: zltika
  TIKA_PORT: "9972"
  __tika.ZLTikaService.Host: zltika
  __tika.ZLTikaService.Port: "9972"
  DEFAULT_URL: ps/PmApp/zlp_dummy?mgc=1&NextPage=/app/home.jsp&domain=yourdomain.com&la=en&authMethod=ZipLipDB&resId=trac_login
```

**Key Settings:**

| Variable                    | Value                                           | Purpose                              |
|-----------------------------|-------------------------------------------------|--------------------------------------|
| ZOO_SERVERS                 | zlzookeeper-{0,1,2}.zk-hs...                    | ZooKeeper ensemble connection string |
| TIKA_HOST                   | zltika                                          | Kubernetes service name for Tika     |
| TIKA_PORT                   | 9972                                            | Tika service port                    |
| __tika.ZLTikaService.Host   | zltika                                          | Override for DocumentConversion.xml  |
| __tika.ZLTikaService.Port   | 9972                                            | Override for DocumentConversion.xml  |

---

### C.2 db-config - Database Configuration

**Purpose:** RDS SQL Server connection settings (non-sensitive)  
**Used By:** zlui, zlserver

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: db-config
  namespace: default
data:
  DB_HOST: "usw1-zlps-msexpsql-01-eks.c5s06occm2dn.us-west-1.rds.amazonaws.com"
  DB_NAME: ZLDB
  DB_PORT: "1433"
  DB_TYPE: mssql
  DB_USER: pfuser
```

**Key Settings:**

| Variable  | Value                                                        | Purpose             |
|-----------|--------------------------------------------------------------|---------------------|
| DB_HOST   | usw1-zlps-msexpsql-01-eks.c5s06occm2dn.us-west-1.rds.amazonaws.com | RDS endpoint |
| DB_NAME   | ZLDB                                                         | Database name       |
| DB_PORT   | 1433                                                         | SQL Server port     |
| DB_TYPE   | mssql                                                        | Database type       |
| DB_USER   | pfuser                                                       | Database username   |

---

### C.3 db-secret - Database Credentials

**Purpose:** Secure storage of database password  
**Used By:** zlui, zlserver

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-secret
  namespace: default
type: Opaque
data:
  DB_PASSWORD: <BASE64_ENCODED_PASSWORD>
```

**To encode a password:**

**PowerShell:**
```powershell
[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("YourActualPassword"))
```

**Bash:**
```bash
echo -n "YourActualPassword" | base64
```

**To decode and verify:**

**PowerShell:**
```powershell
[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String("BASE64_STRING"))
```

**Bash:**
```bash
echo "BASE64_STRING" | base64 -d
```

---

### C.4 docconvert-config - Document Conversion Settings

**Purpose:** Override DocumentConversion.xml to use Kubernetes service name for Tika  
**Used By:** zlui, zlserver (mounted as file)

**Key Override:**
```xml
<Bean>
  <BeanName>__tika.ZLTikaService.Host</BeanName>
  <BeanValue>zltika</BeanValue>  <!-- Changed from localhost -->
</Bean>

<Bean>
  <BeanName>__tika.ZLTikaService.Port</BeanName>
  <BeanValue>9972</BeanValue>
</Bean>
```

**Mount Configuration:**
```yaml
volumeMounts:
  - mountPath: /opt/ZipLip/zlserver/WEB-INF/config/app/sheet/DocumentConversion.xml
    name: docconvert-config
    subPath: DocumentConversion.xml

volumes:
  - name: docconvert-config
    configMap:
      name: docconvert-config
```

> **Why This Is Critical:** In Kubernetes, each pod has its own localhost. Without this override, zlui/zlserver would try to connect to Tika on localhost (themselves) instead of the zltika service.

---

### C.5 docker-secret - ECR Pull Credentials

**Purpose:** Authenticate Kubernetes to pull images from private ECR repository  
**Used By:** All deployments (via imagePullSecrets)

**Create Command (PowerShell):**
```powershell
kubectl create secret docker-registry docker-secret `
  --docker-server=995553364920.dkr.ecr.us-west-1.amazonaws.com/uw1-zlps-ecr-01 `
  --docker-username=AWS `
  --docker-password="$(aws ecr get-login-password --region us-west-1)" `
  --namespace default
```

**Create Command (Bash):**
```bash
kubectl create secret docker-registry docker-secret \
  --docker-server=995553364920.dkr.ecr.us-west-1.amazonaws.com/uw1-zlps-ecr-01 \
  --docker-username=AWS \
  --docker-password="$(aws ecr get-login-password --region us-west-1)" \
  --namespace default
```

> ⚠️ **Token Expiration:** ECR tokens expire after 12 hours. Recreate this secret if pods show `ImagePullBackOff` errors.

---

## Appendix D: Services and Networking

### D.1 Kubernetes Services Summary

| Service Name | Type         | Ports                  | Selector        | Purpose                      |
|--------------|--------------|------------------------|-----------------|------------------------------|
| zk-cs        | ClusterIP    | 2181                   | app=zlzookeeper | ZooKeeper client connections |
| zk-hs        | Headless     | 2888, 3888             | app=zlzookeeper | ZooKeeper peer discovery     |
| zltika       | ClusterIP    | 9972                   | app=zltika      | Document conversion service  |
| zlui         | LoadBalancer | 80, 8000, 9975, 9970   | app=zlui        | UI access (internal LB)      |

---

### D.2 Network Architecture Diagram

```
                              INTERNET
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Application Load Balancer (ALB)                          │
│              k8s-default-zluiingr-e9951b35c2-755748288                       │
│                    (internet-facing, Port 80)                               │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Kubernetes Ingress                                   │
│                         (zlui-ingress)                                      │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         zlui Service                                        │
│                    (ClusterIP → zlui pods)                                  │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                   │
              ▼                   ▼                   ▼
┌─────────────────────┐ ┌─────────────────┐ ┌─────────────────────┐
│      zlui Pod       │ │   zlserver Pod  │ │    zltika Pod       │
│  (Web Frontend)     │ │   (Backend)     │ │ (Doc Conversion)    │
│                     │ │                 │ │                     │
│  Port: 80           │ │  Port: 9972     │ │  Port: 9972         │
└─────────┬───────────┘ └────────┬────────┘ └──────────┬──────────┘
          │                      │                     │
          │         ┌────────────┴─────────────────────┘
          │         │
          ▼         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       zltika Service (ClusterIP)                            │
│                            Port: 9972                                       │
└─────────────────────────────────────────────────────────────────────────────┘
          │
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     ZooKeeper Ensemble (StatefulSet)                        │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐                    │
│  │ zlzookeeper-0 │  │ zlzookeeper-1 │  │ zlzookeeper-2 │                    │
│  │   (Leader)    │  │  (Follower)   │  │  (Follower)   │                    │
│  └───────────────┘  └───────────────┘  └───────────────┘                    │
│                                                                             │
│  zk-cs (ClusterIP:2181) - Client connections                                │
│  zk-hs (Headless) - Peer discovery                                          │
└─────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        RDS SQL Server                                       │
│     usw1-zlps-msexpsql-01-eks.c5s06occm2dn.us-west-1.rds.amazonaws.com     │
│                          Port: 1433                                         │
│                        Database: ZLDB                                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### D.3 DNS Resolution

Kubernetes DNS automatically resolves service names within the cluster:

| DNS Name                                        | Resolves To                     |
|-------------------------------------------------|---------------------------------|
| zltika                                          | zltika service ClusterIP        |
| zltika.default.svc.cluster.local                | zltika service ClusterIP (FQDN) |
| zlui                                            | zlui service ClusterIP          |
| zk-cs                                           | ZooKeeper client service IP     |
| zlzookeeper-0.zk-hs.default.svc.cluster.local   | ZooKeeper pod 0 IP (stable)     |
| zlzookeeper-1.zk-hs.default.svc.cluster.local   | ZooKeeper pod 1 IP (stable)     |
| zlzookeeper-2.zk-hs.default.svc.cluster.local   | ZooKeeper pod 2 IP (stable)     |

---

### D.4 Port Reference

| Service/Pod  | Port  | Protocol | Purpose                          |
|--------------|-------|----------|----------------------------------|
| zlui         | 80    | HTTP     | Web UI access                    |
| zlui         | 8000  | TCP      | Additional UI port               |
| zlui         | 9975  | TCP      | File Connector                   |
| zlui         | 9970  | TCP      | SharePoint                       |
| zlserver     | 9972  | TCP      | Backend service                  |
| zltika       | 9972  | TCP      | Document conversion              |
| zlzookeeper  | 2181  | TCP      | Client connections               |
| zlzookeeper  | 2888  | TCP      | Peer communication               |
| zlzookeeper  | 3888  | TCP      | Leader election                  |
| RDS          | 1433  | TCP      | SQL Server                       |
| EFS          | 2049  | NFS      | File system mount                |

---

### D.5 Security Groups

| Security Group ID    | Name                                                | Purpose                    |
|----------------------|-----------------------------------------------------|----------------------------|
| sg-0afb0a3f0c30ba84d | eksctl-usw1-zlps-eks-01-cluster-ClusterSharedNodeSG | Node-to-node communication |
| sg-07a77dc047e9fb6fe | eks-cluster-sg-usw1-zlps-eks-01-6457660             | Cluster security group     |

**Required Inbound Rules:**

| Port  | Protocol | Source                  | Purpose            |
|-------|----------|-------------------------|--------------------|
| 2049  | TCP      | sg-0afb0a3f0c30ba84d    | EFS NFS access     |
| 1433  | TCP      | sg-0afb0a3f0c30ba84d    | RDS SQL Server     |
| All   | All      | sg-0afb0a3f0c30ba84d    | Node communication |

---

### D.6 External Access URLs

| Resource        | URL/Endpoint                                                                    |
|-----------------|---------------------------------------------------------------------------------|
| Application     | http://k8s-default-zluiingr-e9951b35c2-755748288.us-west-1.elb.amazonaws.com    |
| EKS Cluster     | usw1-zlps-eks-01.us-west-1.eks.amazonaws.com                                    |
| ECR Repository  | 995553364920.dkr.ecr.us-west-1.amazonaws.com/uw1-zlps-ecr-01                    |
| RDS Database    | usw1-zlps-msexpsql-01-eks.c5s06occm2dn.us-west-1.rds.amazonaws.com:1433         |

---

## Document Revision History

| Version | Date           | Author | Changes                                      |
|---------|----------------|--------|----------------------------------------------|
| 1.0     | Dec 10, 2025   | -      | Initial deployment documentation             |
| 1.1     | Dec 13, 2025   | -      | Added comprehensive formatting, all steps    |

---

## End of Document

**Document:** ZL Application AWS EKS Deployment Guide  
**Version:** 1.1  
**Last Updated:** December 13, 2025  
**Cluster:** usw1-zlps-eks-01  
**Region:** us-west-1

