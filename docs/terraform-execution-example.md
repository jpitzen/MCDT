# Terraform Execution Example: End-to-End Kubernetes Deployment

**Date:** November 20, 2025  
**Use Case:** Production-grade Kubernetes cluster with Application Gateway, Load Balancer, Database, Storage  
**Cloud Provider:** AWS (EKS)  
**Components:** VPC, EKS Cluster, Node Group, RDS Database, Application Load Balancer, NAT Gateway, EBS Storage, CloudWatch Monitoring

---

## Overview

This document shows the complete flow of deploying a production Kubernetes cluster through the ZLAWS platform, including all inputs, Terraform transformations, and expected outputs.

---

## Step 1: User Input via Deployment Wizard

### Frontend Submission (DeploymentWizardMultiCloud.jsx)

```javascript
// User completes 8-step wizard and clicks "Deploy"
const deploymentConfig = {
  // Step 1: Credentials
  credentialId: "a1b2c3d4-5678-90ab-cdef-1234567890ab",
  cloudProvider: "aws",
  
  // Step 2: Cluster Configuration
  clusterName: "production-api-cluster",
  kubernetesVersion: "1.27",
  region: "us-east-1",
  
  // Step 3: Compute Resources
  nodeCount: 3,
  minNodeCount: 2,
  maxNodeCount: 8,
  nodeInstanceType: "t3.large",
  enableAutoscaling: true,
  diskSizeGB: 100,
  
  enableAdditionalVMs: false, // Not needed for this deployment
  
  // Step 4: Networking Configuration
  createNewVPC: true,
  vpcCIDR: "10.0.0.0/16",
  publicSubnets: ["10.0.1.0/24", "10.0.2.0/24"],
  privateSubnets: ["10.0.10.0/24", "10.0.11.0/24"],
  enableNATGateway: true,
  enableLoadBalancer: true,
  
  // Step 5: Storage Configuration
  enableBlockStorage: true,
  blockStorageSize: 200,
  blockStorageType: "gp3",
  enableFileStorage: false,
  enableObjectStorage: false,
  
  // Step 6: Database Configuration
  enableRDS: true,
  dbEngine: "postgres",
  dbVersion: "14.6",
  dbInstanceClass: "db.t3.medium",
  dbAllocatedStorage: 100,
  dbMultiAZ: true,
  dbBackupRetentionDays: 7,
  dbUsername: "appuser",
  
  // Step 7: Monitoring & Logging
  enableMonitoring: true,
  enableLogging: true,
  enableAlerts: true,
  alertEmail: "devops@company.com"
};

// POST to backend
axios.post('/api/deployments', deploymentConfig);
```

**Cost Estimate Shown to User:**
```
Compute (3x t3.large):      $182.40/month
Storage (200GB gp3):        $16.00/month
Database (db.t3.medium):    $99.28/month (Multi-AZ)
NAT Gateway:                $32.85/month
Application LB:             $18.25/month
Monitoring/Logging:         $15.00/month
──────────────────────────────────────
TOTAL ESTIMATED:            $363.78/month
```

---

## Step 2: Backend Processing (routes/deployments.js)

### Request Validation

```javascript
// Backend receives request and validates
POST /api/deployments

// Validation rules check:
✓ credentialId is valid UUID
✓ cloudProvider is 'aws' (valid)
✓ clusterName length 1-100 characters
✓ kubernetesVersion matches /^\d+\.\d+$/
✓ region is string
✓ nodeCount is integer 1-100
✓ vpcCIDR matches CIDR format
✓ dbAllocatedStorage is integer 20-65536
✓ alertEmail is valid email format

// Credential verification
const credential = await Credential.findOne({
  where: {
    id: "a1b2c3d4-5678-90ab-cdef-1234567890ab",
    userId: req.user.id,
    cloudProvider: "aws"
  }
});

// Credential found:
{
  id: "a1b2c3d4-5678-90ab-cdef-1234567890ab",
  name: "Production AWS Account",
  cloudProvider: "aws",
  awsRegion: "us-east-1",
  awsAccountId: "123456789012",
  secretRefId: "aws-secret-ref-12345",
  vaultType: "aws-secrets-manager",
  isValid: true,
  lastValidatedAt: "2025-11-19T22:30:00.000Z"
}
```

### Deployment Record Creation

```javascript
// Create deployment record
const deployment = await deploymentService.createDeployment({
  credentialId: "a1b2c3d4-5678-90ab-cdef-1234567890ab",
  userId: req.user.id,
  clusterName: "production-api-cluster",
  cloudProvider: "aws",
  configuration: {
    // All config parameters stored as JSON
    kubernetesVersion: "1.27",
    region: "us-east-1",
    nodeCount: 3,
    // ... (full config object)
  }
});

// Database record created:
{
  id: "d7e8f9a0-1234-5678-90ab-cdef12345678",
  userId: "u9876543-2109-8765-4321-fedcba098765",
  credentialId: "a1b2c3d4-5678-90ab-cdef-1234567890ab",
  clusterName: "production-api-cluster",
  cloudProvider: "aws",
  status: "pending",
  progress: 0,
  currentPhase: "pending",
  configuration: { /* full JSON */ },
  createdAt: "2025-11-20T10:30:00.000Z",
  updatedAt: "2025-11-20T10:30:00.000Z"
}
```

### Response to Frontend

```json
HTTP 201 Created

{
  "success": true,
  "message": "Deployment created successfully",
  "data": {
    "id": "d7e8f9a0-1234-5678-90ab-cdef12345678",
    "clusterName": "production-api-cluster",
    "cloudProvider": "aws",
    "status": "pending",
    "progress": 0,
    "currentPhase": "pending",
    "createdAt": "2025-11-20T10:30:00.000Z"
  }
}
```

---

## Step 3: Start Deployment Execution

### User Clicks "Start Deployment" or Auto-Start

```javascript
// Frontend triggers deployment start
POST /api/deployments/d7e8f9a0-1234-5678-90ab-cdef12345678/start

// Backend initiates Terraform execution
await deploymentService.startDeployment(deploymentId);
```

### Terraform Working Directory Setup

```javascript
// terraformExecutor.initTerraform() creates directory structure
const deploymentDir = "/tmp/zlaws_deployments/d7e8f9a0-1234-5678-90ab-cdef12345678";

// Directory structure created:
/tmp/zlaws_deployments/d7e8f9a0-1234-5678-90ab-cdef12345678/
├── main.tf                  (copied from terraform/environments/aws/)
├── variables.tf             (copied from terraform/environments/aws/)
├── outputs.tf               (copied from terraform/environments/aws/)
├── terraform.tfvars         (generated from user config)
└── modules/
    └── kubernetes_cluster/
        ├── main.tf
        ├── variables.tf
        ├── outputs.tf
        ├── aws.tf
        ├── azure.tf
        ├── gcp.tf
        ├── do.tf
        └── linode.tf

// Status updated:
status: "running"
currentPhase: "terraform-init"
progress: 10
```

---

## Step 4: Generate terraform.tfvars

### Terraform Variables File

```javascript
// terraformExecutor.writeTfvars() generates:

// File: /tmp/zlaws_deployments/d7e8f9a0-1234-.../terraform.tfvars
```

```hcl
# Generated Terraform Variables for Deployment: d7e8f9a0-1234-5678-90ab-cdef12345678
# Cluster: production-api-cluster
# Provider: AWS
# Region: us-east-1
# Generated: 2025-11-20T10:30:15.000Z

# ============================================================================
# Provider Configuration
# ============================================================================
cloud_provider = "aws"
aws_region     = "us-east-1"

# ============================================================================
# Cluster Configuration
# ============================================================================
cluster_name        = "production-api-cluster"
kubernetes_version  = "1.27"

# ============================================================================
# Compute Configuration
# ============================================================================
node_count          = 3
min_node_count      = 2
max_node_count      = 8
node_instance_type  = "t3.large"
enable_autoscaling  = true
disk_size_gb        = 100

# ============================================================================
# Networking Configuration
# ============================================================================
create_vpc          = true
vpc_cidr            = "10.0.0.0/16"
public_subnet_cidrs = ["10.0.1.0/24", "10.0.2.0/24"]
private_subnet_cidrs = ["10.0.10.0/24", "10.0.11.0/24"]
enable_nat_gateway  = true
enable_load_balancer = true

# Availability Zones (automatically selected based on region)
availability_zones = ["us-east-1a", "us-east-1b"]

# ============================================================================
# Storage Configuration
# ============================================================================
enable_block_storage = true
block_storage_size   = 200
block_storage_type   = "gp3"
block_storage_iops   = 3000  # Default for gp3
enable_file_storage  = false
enable_object_storage = false

# ============================================================================
# Database Configuration (RDS)
# ============================================================================
enable_rds                = true
db_engine                 = "postgres"
db_engine_version         = "14.6"
db_instance_class         = "db.t3.medium"
db_allocated_storage      = 100
db_storage_type           = "gp3"
db_multi_az               = true
db_backup_retention_days  = 7
db_backup_window          = "03:00-04:00"  # 3-4 AM UTC
db_maintenance_window     = "sun:04:00-sun:05:00"
db_username               = "appuser"
db_password               = "AUTO_GENERATED_BY_SECRETS_MANAGER"
db_publicly_accessible    = false
db_port                   = 5432

# Database parameter group
db_parameters = {
  "log_connections"          = "1"
  "log_disconnections"       = "1"
  "log_duration"             = "1"
  "log_statement"            = "ddl"
  "shared_preload_libraries" = "pg_stat_statements"
}

# ============================================================================
# Monitoring & Logging Configuration
# ============================================================================
enable_monitoring      = true
enable_logging         = true
enable_container_insights = true  # CloudWatch Container Insights
enable_alarms          = true
alarm_email            = "devops@company.com"

# CloudWatch Log Retention (days)
log_retention_days     = 7

# ============================================================================
# Security Configuration
# ============================================================================
enable_encryption_at_rest = true
enable_encryption_in_transit = true

# KMS Keys (auto-generated if not provided)
kms_key_id = ""  # Will create new KMS key for EKS

# Security Group Rules
allowed_cidr_blocks = ["0.0.0.0/0"]  # Public access to LB only
ssh_allowed_cidr_blocks = []  # No SSH access from internet

# ============================================================================
# Tags
# ============================================================================
common_tags = {
  Environment   = "production"
  Project       = "production-api-cluster"
  ManagedBy     = "ZLAWS"
  DeploymentId  = "d7e8f9a0-1234-5678-90ab-cdef12345678"
  Owner         = "DevOps Team"
  CostCenter    = "Engineering"
  CreatedAt     = "2025-11-20T10:30:00Z"
}
```

---

## Step 5: Terraform Init

### Command Execution

```bash
cd /tmp/zlaws_deployments/d7e8f9a0-1234-5678-90ab-cdef12345678
terraform init -input=false
```

### Terraform Init Output

```
Initializing the backend...

Initializing modules...
- kubernetes_cluster in modules/kubernetes_cluster

Initializing provider plugins...
- Finding hashicorp/aws versions matching "~> 5.0"...
- Installing hashicorp/aws v5.100.0...
- Installed hashicorp/aws v5.100.0 (signed by HashiCorp)

Terraform has created a lock file .terraform.lock.hcl to record the provider
selections it made above. Include this file in your version control repository
so that Terraform can guarantee to make the same selections by default when
you run "terraform init" in the future.

Terraform has been successfully initialized!

You may now begin working with Terraform. Try running "terraform plan" to see
any changes that are required for your infrastructure. All Terraform commands
should now work.

If you ever set or change modules or backend configuration for Terraform,
rerun this command to reinitialize your working directory. If you forget, other
commands will detect it and remind you to do so if necessary.
```

### Deployment Log Entry

```json
{
  "deploymentId": "d7e8f9a0-1234-5678-90ab-cdef12345678",
  "phase": "terraform-init",
  "level": "info",
  "message": "Terraform initialized successfully",
  "timestamp": "2025-11-20T10:30:25.000Z",
  "metadata": {
    "exitCode": 0,
    "providers": ["hashicorp/aws v5.100.0"],
    "modules": ["kubernetes_cluster"]
  }
}
```

**Status Update:**
```
status: "running"
currentPhase: "terraform-validate"
progress: 20
```

---

## Step 6: Terraform Validate

### Command Execution

```bash
terraform validate
```

### Terraform Validate Output

```
Success! The configuration is valid.
```

### Deployment Log Entry

```json
{
  "deploymentId": "d7e8f9a0-1234-5678-90ab-cdef12345678",
  "phase": "terraform-validate",
  "level": "info",
  "message": "Terraform configuration validated successfully",
  "timestamp": "2025-11-20T10:30:30.000Z"
}
```

**Status Update:**
```
status: "running"
currentPhase: "terraform-plan"
progress: 30
```

---

## Step 7: Terraform Plan

### Command Execution

```bash
terraform plan -out=tfplan -input=false
```

### Terraform Plan Output (Condensed)

```
Terraform used the selected providers to generate the following execution plan. Resource actions are indicated with the following symbols:
  + create

Terraform will perform the following actions:

  # module.kubernetes_cluster.aws_eks_cluster.main[0] will be created
  + resource "aws_eks_cluster" "main" {
      + arn                       = (known after apply)
      + certificate_authority     = (known after apply)
      + cluster_id                = (known after apply)
      + created_at                = (known after apply)
      + endpoint                  = (known after apply)
      + id                        = (known after apply)
      + identity                  = (known after apply)
      + name                      = "production-api-cluster"
      + platform_version          = (known after apply)
      + role_arn                  = (known after apply)
      + status                    = (known after apply)
      + version                   = "1.27"

      + enabled_cluster_log_types = [
          + "api",
          + "audit",
          + "authenticator",
          + "controllerManager",
          + "scheduler",
        ]

      + vpc_config {
          + cluster_security_group_id = (known after apply)
          + endpoint_private_access   = true
          + endpoint_public_access    = true
          + public_access_cidrs       = (known after apply)
          + security_group_ids        = (known after apply)
          + subnet_ids                = (known after apply)
          + vpc_id                    = (known after apply)
        }
    }

  # module.kubernetes_cluster.aws_eks_node_group.main[0] will be created
  + resource "aws_eks_node_group" "main" {
      + ami_type               = (known after apply)
      + arn                    = (known after apply)
      + capacity_type          = (known after apply)
      + cluster_name           = "production-api-cluster"
      + disk_size              = 100
      + id                     = (known after apply)
      + instance_types         = [
          + "t3.large",
        ]
      + node_group_name        = "production-api-cluster-node-group"
      + node_role_arn          = (known after apply)
      + release_version        = (known after apply)
      + remote_access_ec2_ssh_key = (known after apply)
      + resources              = (known after apply)
      + status                 = (known after apply)
      + subnet_ids             = (known after apply)
      + version                = (known after apply)

      + scaling_config {
          + desired_size = 3
          + max_size     = 8
          + min_size     = 2
        }

      + update_config {
          + max_unavailable_percentage = (known after apply)
        }
    }

  # aws_vpc.main will be created
  + resource "aws_vpc" "main" {
      + arn                              = (known after apply)
      + cidr_block                       = "10.0.0.0/16"
      + default_network_acl_id           = (known after apply)
      + default_route_table_id           = (known after apply)
      + default_security_group_id        = (known after apply)
      + dhcp_options_id                  = (known after apply)
      + enable_dns_hostnames             = true
      + enable_dns_support               = true
      + id                               = (known after apply)
      + instance_tenancy                 = "default"
      + ipv6_association_id              = (known after apply)
      + ipv6_cidr_block                  = (known after apply)
      + main_route_table_id              = (known after apply)
      + owner_id                         = (known after apply)
      + tags                             = {
          + "Name"         = "production-api-cluster-vpc"
          + "Environment"  = "production"
          + "ManagedBy"    = "ZLAWS"
        }
      + tags_all                         = (known after apply)
    }

  # aws_subnet.public[0] will be created
  + resource "aws_subnet" "public" {
      + arn                             = (known after apply)
      + assign_ipv6_address_on_creation = false
      + availability_zone               = "us-east-1a"
      + availability_zone_id            = (known after apply)
      + cidr_block                      = "10.0.1.0/24"
      + id                              = (known after apply)
      + ipv6_cidr_block                 = (known after apply)
      + ipv6_cidr_block_association_id  = (known after apply)
      + map_public_ip_on_launch         = true
      + owner_id                        = (known after apply)
      + tags                            = {
          + "Name"                          = "production-api-cluster-public-us-east-1a"
          + "kubernetes.io/role/elb"        = "1"
        }
      + vpc_id                          = (known after apply)
    }

  # aws_subnet.public[1] will be created (similar to above, us-east-1b)

  # aws_subnet.private[0] will be created
  + resource "aws_subnet" "private" {
      + arn                             = (known after apply)
      + assign_ipv6_address_on_creation = false
      + availability_zone               = "us-east-1a"
      + availability_zone_id            = (known after apply)
      + cidr_block                      = "10.0.10.0/24"
      + id                              = (known after apply)
      + map_public_ip_on_launch         = false
      + tags                            = {
          + "Name"                              = "production-api-cluster-private-us-east-1a"
          + "kubernetes.io/role/internal-elb"   = "1"
        }
      + vpc_id                          = (known after apply)
    }

  # aws_subnet.private[1] will be created (similar, us-east-1b)

  # aws_internet_gateway.main will be created
  + resource "aws_internet_gateway" "main" {
      + arn      = (known after apply)
      + id       = (known after apply)
      + owner_id = (known after apply)
      + tags     = {
          + "Name" = "production-api-cluster-igw"
        }
      + vpc_id   = (known after apply)
    }

  # aws_nat_gateway.main[0] will be created
  + resource "aws_nat_gateway" "main" {
      + allocation_id        = (known after apply)
      + connectivity_type    = "public"
      + id                   = (known after apply)
      + network_interface_id = (known after apply)
      + private_ip           = (known after apply)
      + public_ip            = (known after apply)
      + subnet_id            = (known after apply)
      + tags                 = {
          + "Name" = "production-api-cluster-nat-us-east-1a"
        }
    }

  # aws_nat_gateway.main[1] will be created (similar, us-east-1b)

  # aws_lb.application will be created
  + resource "aws_lb" "application" {
      + arn                        = (known after apply)
      + arn_suffix                 = (known after apply)
      + dns_name                   = (known after apply)
      + enable_deletion_protection = false
      + enable_http2               = true
      + id                         = (known after apply)
      + idle_timeout               = 60
      + internal                   = false
      + ip_address_type            = "ipv4"
      + load_balancer_type         = "application"
      + name                       = "production-api-cluster-alb"
      + security_groups            = (known after apply)
      + subnets                    = (known after apply)
      + tags                       = {
          + "Name" = "production-api-cluster-alb"
        }
      + vpc_id                     = (known after apply)
      + zone_id                    = (known after apply)
    }

  # aws_db_instance.main will be created
  + resource "aws_db_instance" "main" {
      + address                               = (known after apply)
      + allocated_storage                     = 100
      + arn                                   = (known after apply)
      + auto_minor_version_upgrade            = true
      + availability_zone                     = (known after apply)
      + backup_retention_period               = 7
      + backup_window                         = "03:00-04:00"
      + ca_cert_identifier                    = (known after apply)
      + db_name                               = "production_api_db"
      + db_subnet_group_name                  = (known after apply)
      + endpoint                              = (known after apply)
      + engine                                = "postgres"
      + engine_version                        = "14.6"
      + engine_version_actual                 = (known after apply)
      + hosted_zone_id                        = (known after apply)
      + id                                    = (known after apply)
      + identifier                            = "production-api-cluster-db"
      + instance_class                        = "db.t3.medium"
      + kms_key_id                            = (known after apply)
      + maintenance_window                    = "sun:04:00-sun:05:00"
      + monitoring_interval                   = 60
      + monitoring_role_arn                   = (known after apply)
      + multi_az                              = true
      + name                                  = (known after apply)
      + password                              = (sensitive value)
      + performance_insights_enabled          = true
      + performance_insights_kms_key_id       = (known after apply)
      + performance_insights_retention_period = 7
      + port                                  = 5432
      + publicly_accessible                   = false
      + resource_id                           = (known after apply)
      + status                                = (known after apply)
      + storage_encrypted                     = true
      + storage_type                          = "gp3"
      + username                              = "appuser"
      + vpc_security_group_ids                = (known after apply)
    }

  # aws_iam_role.eks_cluster will be created
  + resource "aws_iam_role" "eks_cluster" {
      + arn                   = (known after apply)
      + assume_role_policy    = jsonencode(...)
      + create_date           = (known after apply)
      + force_detach_policies = false
      + id                    = (known after apply)
      + name                  = "production-api-cluster-eks-cluster-role"
      + path                  = "/"
      + tags                  = {
          + "Name" = "production-api-cluster-eks-cluster-role"
        }
      + unique_id             = (known after apply)
    }

  # aws_iam_role.eks_node_group will be created (similar)

  # aws_security_group.eks_cluster will be created
  # aws_security_group.eks_nodes will be created
  # aws_security_group.alb will be created
  # aws_security_group.rds will be created

  # Additional resources for CloudWatch, KMS, EBS volumes, etc.

Plan: 47 to add, 0 to change, 0 to destroy.

Changes to Outputs:
  + cluster_endpoint          = (known after apply)
  + cluster_name              = "production-api-cluster"
  + cluster_security_group_id = (known after apply)
  + database_endpoint         = (known after apply)
  + load_balancer_dns         = (known after apply)
  + vpc_id                    = (known after apply)

──────────────────────────────────────────────────────────────────────────────

Saved the plan to: tfplan

To perform exactly these actions, run the following command to apply:
    terraform apply "tfplan"
```

### Resource Summary

```
Total Resources to Create: 47

Breakdown:
  VPC & Networking (15):
    - 1 VPC
    - 4 Subnets (2 public, 2 private)
    - 1 Internet Gateway
    - 2 NAT Gateways
    - 4 Route Tables
    - 3 Elastic IPs

  Kubernetes (10):
    - 1 EKS Cluster
    - 1 EKS Node Group
    - 3 IAM Roles
    - 5 IAM Role Policy Attachments

  Load Balancer (5):
    - 1 Application Load Balancer
    - 1 Target Group
    - 1 Listener
    - 2 Security Groups

  Database (8):
    - 1 RDS PostgreSQL Instance (Multi-AZ = 2 instances)
    - 1 DB Subnet Group
    - 1 DB Parameter Group
    - 1 Security Group
    - 3 CloudWatch Alarms

  Storage (3):
    - 1 EBS Storage Class (for K8s)
    - 1 EFS File System (optional, if file storage enabled)
    - 1 S3 Bucket (for backups/logs)

  Monitoring (6):
    - 1 CloudWatch Log Group (EKS control plane)
    - 1 CloudWatch Log Group (application logs)
    - 3 CloudWatch Metric Alarms
    - 1 SNS Topic (for alerts)
```

### Deployment Log Entry

```json
{
  "deploymentId": "d7e8f9a0-1234-5678-90ab-cdef12345678",
  "phase": "terraform-plan",
  "level": "info",
  "message": "Terraform plan completed: 47 resources to add",
  "timestamp": "2025-11-20T10:32:00.000Z",
  "metadata": {
    "resourcesToAdd": 47,
    "resourcesToChange": 0,
    "resourcesToDestroy": 0
  }
}
```

**Status Update:**
```
status: "running"
currentPhase: "terraform-apply"
progress: 50
```

---

## Step 8: Terraform Apply

### Command Execution

```bash
terraform apply tfplan
```

### Terraform Apply Output (Real-time Stream)

```
module.kubernetes_cluster.aws_iam_role.eks_cluster: Creating...
module.kubernetes_cluster.aws_iam_role.eks_node_group: Creating...
aws_vpc.main: Creating...

module.kubernetes_cluster.aws_iam_role.eks_cluster: Creation complete after 2s [id=production-api-cluster-eks-cluster-role]
module.kubernetes_cluster.aws_iam_role_policy_attachment.eks_cluster_policy: Creating...

aws_vpc.main: Still creating... [10s elapsed]
aws_vpc.main: Creation complete after 12s [id=vpc-0a1b2c3d4e5f6g7h8]

aws_internet_gateway.main: Creating...
aws_subnet.public[0]: Creating...
aws_subnet.public[1]: Creating...
aws_subnet.private[0]: Creating...
aws_subnet.private[1]: Creating...

aws_internet_gateway.main: Creation complete after 1s [id=igw-0a1b2c3d4e5f6g7h8]
aws_subnet.public[0]: Creation complete after 1s [id=subnet-0a1b2c3d4e5f6g7h8]
aws_subnet.public[1]: Creation complete after 1s [id=subnet-1b2c3d4e5f6g7h8i9]
aws_subnet.private[0]: Creation complete after 1s [id=subnet-2c3d4e5f6g7h8i9j0]
aws_subnet.private[1]: Creation complete after 1s [id=subnet-3d4e5f6g7h8i9j0k1]

aws_eip.nat[0]: Creating...
aws_eip.nat[1]: Creating...
aws_eip.nat[0]: Creation complete after 1s [id=eipalloc-0a1b2c3d4e5f6g7h8]
aws_eip.nat[1]: Creation complete after 1s [id=eipalloc-1b2c3d4e5f6g7h8i9]

aws_nat_gateway.main[0]: Creating...
aws_nat_gateway.main[1]: Creating...

aws_security_group.eks_cluster: Creating...
aws_security_group.eks_nodes: Creating...
aws_security_group.alb: Creating...
aws_security_group.rds: Creating...

aws_security_group.eks_cluster: Creation complete after 3s [id=sg-0a1b2c3d4e5f6g7h8]
aws_security_group.eks_nodes: Creation complete after 3s [id=sg-1b2c3d4e5f6g7h8i9]
aws_security_group.alb: Creation complete after 3s [id=sg-2c3d4e5f6g7h8i9j0]
aws_security_group.rds: Creation complete after 3s [id=sg-3d4e5f6g7h8i9j0k1]

aws_nat_gateway.main[0]: Still creating... [1m0s elapsed]
aws_nat_gateway.main[1]: Still creating... [1m0s elapsed]
aws_nat_gateway.main[0]: Creation complete after 1m30s [id=nat-0a1b2c3d4e5f6g7h8]
aws_nat_gateway.main[1]: Creation complete after 1m30s [id=nat-1b2c3d4e5f6g7h8i9]

aws_route_table.public: Creating...
aws_route_table.private[0]: Creating...
aws_route_table.private[1]: Creating...

aws_route_table.public: Creation complete after 1s [id=rtb-0a1b2c3d4e5f6g7h8]
aws_route_table.private[0]: Creation complete after 1s [id=rtb-1b2c3d4e5f6g7h8i9]
aws_route_table.private[1]: Creation complete after 1s [id=rtb-2c3d4e5f6g7h8i9j0]

aws_route_table_association.public[0]: Creating...
aws_route_table_association.public[1]: Creating...
aws_route_table_association.private[0]: Creating...
aws_route_table_association.private[1]: Creating...
[All route table associations complete]

module.kubernetes_cluster.aws_eks_cluster.main[0]: Creating...
module.kubernetes_cluster.aws_eks_cluster.main[0]: Still creating... [1m0s elapsed]
module.kubernetes_cluster.aws_eks_cluster.main[0]: Still creating... [2m0s elapsed]
module.kubernetes_cluster.aws_eks_cluster.main[0]: Still creating... [3m0s elapsed]
...
module.kubernetes_cluster.aws_eks_cluster.main[0]: Still creating... [9m0s elapsed]
module.kubernetes_cluster.aws_eks_cluster.main[0]: Creation complete after 9m23s [id=production-api-cluster]

module.kubernetes_cluster.aws_eks_node_group.main[0]: Creating...
module.kubernetes_cluster.aws_eks_node_group.main[0]: Still creating... [1m0s elapsed]
module.kubernetes_cluster.aws_eks_node_group.main[0]: Still creating... [2m0s elapsed]
...
module.kubernetes_cluster.aws_eks_node_group.main[0]: Still creating... [5m0s elapsed]
module.kubernetes_cluster.aws_eks_node_group.main[0]: Creation complete after 5m47s [id=production-api-cluster:production-api-cluster-node-group-20251120103845]

aws_db_subnet_group.main: Creating...
aws_db_subnet_group.main: Creation complete after 1s [id=production-api-cluster-db-subnet-group]

aws_db_instance.main: Creating...
aws_db_instance.main: Still creating... [1m0s elapsed]
aws_db_instance.main: Still creating... [2m0s elapsed]
aws_db_instance.main: Still creating... [3m0s elapsed]
...
aws_db_instance.main: Still creating... [7m0s elapsed]
aws_db_instance.main: Creation complete after 7m34s [id=production-api-cluster-db]

aws_lb.application: Creating...
aws_lb.application: Still creating... [1m0s elapsed]
aws_lb.application: Still creating... [2m0s elapsed]
aws_lb.application: Creation complete after 2m12s [id=arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/production-api-cluster-alb/abc123def456]

aws_lb_target_group.main: Creating...
aws_lb_target_group.main: Creation complete after 1s [id=arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/production-api-tg/xyz789]

aws_lb_listener.http: Creating...
aws_lb_listener.http: Creation complete after 1s [id=arn:aws:elasticloadbalancing:us-east-1:123456789012:listener/app/production-api-cluster-alb/abc123def456/xyz123]

aws_cloudwatch_log_group.eks_cluster: Creating...
aws_cloudwatch_log_group.application: Creating...
aws_cloudwatch_log_group.eks_cluster: Creation complete after 1s [id=/aws/eks/production-api-cluster/cluster]
aws_cloudwatch_log_group.application: Creation complete after 1s [id=/aws/containerinsights/production-api-cluster/application]

aws_sns_topic.alerts: Creating...
aws_sns_topic.alerts: Creation complete after 1s [id=arn:aws:sns:us-east-1:123456789012:production-api-cluster-alerts]

aws_sns_topic_subscription.email: Creating...
aws_sns_topic_subscription.email: Creation complete after 1s [id=arn:aws:sns:us-east-1:123456789012:production-api-cluster-alerts:abc-123-def-456]

aws_cloudwatch_metric_alarm.high_cpu: Creating...
aws_cloudwatch_metric_alarm.low_disk_space: Creating...
aws_cloudwatch_metric_alarm.pod_failures: Creating...
[All alarms created]

Apply complete! Resources: 47 added, 0 changed, 0 destroyed.

Outputs:

cluster_endpoint = "https://ABC123DEF456.gr7.us-east-1.eks.amazonaws.com"
cluster_name = "production-api-cluster"
cluster_security_group_id = "sg-0a1b2c3d4e5f6g7h8"
cluster_version = "1.27"
vpc_id = "vpc-0a1b2c3d4e5f6g7h8"
public_subnet_ids = [
  "subnet-0a1b2c3d4e5f6g7h8",
  "subnet-1b2c3d4e5f6g7h8i9",
]
private_subnet_ids = [
  "subnet-2c3d4e5f6g7h8i9j0",
  "subnet-3d4e5f6g7h8i9j0k1",
]
nat_gateway_ids = [
  "nat-0a1b2c3d4e5f6g7h8",
  "nat-1b2c3d4e5f6g7h8i9",
]
load_balancer_dns = "production-api-cluster-alb-1234567890.us-east-1.elb.amazonaws.com"
load_balancer_arn = "arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/production-api-cluster-alb/abc123def456"
database_endpoint = "production-api-cluster-db.xyz789.us-east-1.rds.amazonaws.com:5432"
database_address = "production-api-cluster-db.xyz789.us-east-1.rds.amazonaws.com"
database_name = "production_api_db"
kubeconfig_command = "aws eks update-kubeconfig --region us-east-1 --name production-api-cluster"
```

### Total Deployment Time

```
Terraform Init:     30 seconds
Terraform Validate: 5 seconds
Terraform Plan:     2 minutes
Terraform Apply:    18 minutes 45 seconds
──────────────────────────────────
TOTAL:              ~21 minutes
```

---

## Step 9: Capture Outputs & Update Deployment

### Terraform Output Extraction

```javascript
// terraformExecutor.captureOutputs() reads terraform output -json
const outputs = {
  cluster_endpoint: "https://ABC123DEF456.gr7.us-east-1.eks.amazonaws.com",
  cluster_name: "production-api-cluster",
  cluster_security_group_id: "sg-0a1b2c3d4e5f6g7h8",
  cluster_version: "1.27",
  vpc_id: "vpc-0a1b2c3d4e5f6g7h8",
  public_subnet_ids: ["subnet-0a1b2c3d4e5f6g7h8", "subnet-1b2c3d4e5f6g7h8i9"],
  private_subnet_ids: ["subnet-2c3d4e5f6g7h8i9j0", "subnet-3d4e5f6g7h8i9j0k1"],
  nat_gateway_ids: ["nat-0a1b2c3d4e5f6g7h8", "nat-1b2c3d4e5f6g7h8i9"],
  load_balancer_dns: "production-api-cluster-alb-1234567890.us-east-1.elb.amazonaws.com",
  load_balancer_arn: "arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/production-api-cluster-alb/abc123def456",
  database_endpoint: "production-api-cluster-db.xyz789.us-east-1.rds.amazonaws.com:5432",
  database_address: "production-api-cluster-db.xyz789.us-east-1.rds.amazonaws.com",
  database_name: "production_api_db",
  kubeconfig_command: "aws eks update-kubeconfig --region us-east-1 --name production-api-cluster"
};
```

### Generate Kubeconfig

```bash
# Command executed by backend
aws eks update-kubeconfig --region us-east-1 --name production-api-cluster

# Output:
# Added new context arn:aws:eks:us-east-1:123456789012:cluster/production-api-cluster to /root/.kube/config

# Kubeconfig content (base64 encoded and stored):
apiVersion: v1
clusters:
- cluster:
    certificate-authority-data: LS0tLS1CRUdJTi...
    server: https://ABC123DEF456.gr7.us-east-1.eks.amazonaws.com
  name: arn:aws:eks:us-east-1:123456789012:cluster/production-api-cluster
contexts:
- context:
    cluster: arn:aws:eks:us-east-1:123456789012:cluster/production-api-cluster
    user: arn:aws:eks:us-east-1:123456789012:cluster/production-api-cluster
  name: arn:aws:eks:us-east-1:123456789012:cluster/production-api-cluster
current-context: arn:aws:eks:us-east-1:123456789012:cluster/production-api-cluster
kind: Config
preferences: {}
users:
- name: arn:aws:eks:us-east-1:123456789012:cluster/production-api-cluster
  user:
    exec:
      apiVersion: client.authentication.k8s.io/v1beta1
      args:
      - --region
      - us-east-1
      - eks
      - get-token
      - --cluster-name
      - production-api-cluster
      command: aws
```

### Database Password Retrieval

```javascript
// Backend retrieves auto-generated password from AWS Secrets Manager
const secretArn = "arn:aws:secretsmanager:us-east-1:123456789012:secret:production-api-cluster-db-password-ABC123";

const dbCredentials = {
  username: "appuser",
  password: "aB3$xYz9*mN7pQ2", // Auto-generated secure password
  endpoint: "production-api-cluster-db.xyz789.us-east-1.rds.amazonaws.com",
  port: 5432,
  database: "production_api_db",
  connectionString: "postgresql://appuser:aB3$xYz9*mN7pQ2@production-api-cluster-db.xyz789.us-east-1.rds.amazonaws.com:5432/production_api_db"
};
```

---

## Step 10: Final Deployment Update

### Database Record Update

```javascript
await Deployment.update({
  status: "cluster-ready",
  currentPhase: "complete",
  progress: 100,
  clusterEndpoint: "https://ABC123DEF456.gr7.us-east-1.eks.amazonaws.com",
  kubeconfigData: "<base64-encoded-kubeconfig>",
  outputs: {
    vpc_id: "vpc-0a1b2c3d4e5f6g7h8",
    load_balancer_dns: "production-api-cluster-alb-1234567890.us-east-1.elb.amazonaws.com",
    database_endpoint: "production-api-cluster-db.xyz789.us-east-1.rds.amazonaws.com:5432",
    // ... all outputs
  },
  completedAt: "2025-11-20T10:51:45.000Z"
}, {
  where: { id: "d7e8f9a0-1234-5678-90ab-cdef12345678" }
});
```

### Final Deployment Log

```json
{
  "deploymentId": "d7e8f9a0-1234-5678-90ab-cdef12345678",
  "phase": "complete",
  "level": "info",
  "message": "Deployment completed successfully",
  "timestamp": "2025-11-20T10:51:45.000Z",
  "metadata": {
    "totalDuration": "21m 15s",
    "resourcesCreated": 47,
    "clusterEndpoint": "https://ABC123DEF456.gr7.us-east-1.eks.amazonaws.com",
    "loadBalancerDNS": "production-api-cluster-alb-1234567890.us-east-1.elb.amazonaws.com"
  }
}
```

---

## Step 11: Frontend Display

### Deployment Details Page

```javascript
// GET /api/deployments/d7e8f9a0-1234-5678-90ab-cdef12345678

{
  "id": "d7e8f9a0-1234-5678-90ab-cdef12345678",
  "clusterName": "production-api-cluster",
  "cloudProvider": "aws",
  "status": "cluster-ready",
  "progress": 100,
  "currentPhase": "complete",
  "clusterEndpoint": "https://ABC123DEF456.gr7.us-east-1.eks.amazonaws.com",
  "outputs": {
    "load_balancer_dns": "production-api-cluster-alb-1234567890.us-east-1.elb.amazonaws.com",
    "database_endpoint": "production-api-cluster-db.xyz789.us-east-1.rds.amazonaws.com:5432",
    "vpc_id": "vpc-0a1b2c3d4e5f6g7h8"
  },
  "createdAt": "2025-11-20T10:30:00.000Z",
  "completedAt": "2025-11-20T10:51:45.000Z",
  "duration": "21m 45s"
}
```

### User Actions Available

```
✓ Download Kubeconfig
✓ View Database Credentials
✓ Access Load Balancer (http://production-api-cluster-alb-1234567890.us-east-1.elb.amazonaws.com)
✓ View CloudWatch Logs
✓ Scale Node Group (2-8 nodes)
✓ View Resource Costs
✓ Delete Deployment (terraform destroy)
```

---

## Summary: Complete Resource Inventory

### Created AWS Resources (47 total)

**Networking (15 resources):**
- 1 VPC (10.0.0.0/16)
- 2 Public Subnets (10.0.1.0/24, 10.0.2.0/24)
- 2 Private Subnets (10.0.10.0/24, 10.0.11.0/24)
- 1 Internet Gateway
- 2 NAT Gateways
- 2 Elastic IPs (for NAT Gateways)
- 5 Route Tables

**Kubernetes/EKS (10 resources):**
- 1 EKS Control Plane
- 1 EKS Node Group (3 t3.large instances)
- 3 IAM Roles (cluster, nodes, monitoring)
- 5 IAM Policy Attachments

**Load Balancer (5 resources):**
- 1 Application Load Balancer
- 1 Target Group
- 1 HTTP Listener
- 2 Security Groups

**Database (8 resources):**
- 1 RDS PostgreSQL Multi-AZ Instance
- 1 DB Subnet Group
- 1 DB Parameter Group
- 1 Security Group
- 1 Secrets Manager Secret (password)
- 3 CloudWatch Alarms (CPU, storage, connections)

**Storage (3 resources):**
- 1 EBS GP3 Volume (200 GB)
- 1 S3 Bucket (logs/backups)
- 1 Storage Class (K8s integration)

**Monitoring (6 resources):**
- 2 CloudWatch Log Groups (EKS, application)
- 3 CloudWatch Metric Alarms
- 1 SNS Topic (alerts)

**Total Monthly Cost:** ~$363.78/month

---

## Next Steps After Deployment

1. **Configure kubectl:**
   ```bash
   aws eks update-kubeconfig --region us-east-1 --name production-api-cluster
   kubectl get nodes
   ```

2. **Deploy Application:**
   ```bash
   kubectl apply -f your-app-deployment.yaml
   kubectl apply -f your-app-service.yaml
   ```

3. **Configure Database:**
   ```bash
   psql -h production-api-cluster-db.xyz789.us-east-1.rds.amazonaws.com -U appuser -d production_api_db
   ```

4. **Access via Load Balancer:**
   - DNS: `production-api-cluster-alb-1234567890.us-east-1.elb.amazonaws.com`
   - Configure your application service to use LoadBalancer type
   - ALB automatically routes to healthy pods

5. **Monitor:**
   - CloudWatch Logs: `/aws/eks/production-api-cluster/cluster`
   - CloudWatch Metrics: Container Insights enabled
   - Alerts sent to: devops@company.com

---

**End of Terraform Execution Example**
