# Private Networking Implementation Plan

## 🎯 Objective
Configure AWS infrastructure to use private subnets for all resources except Application Load Balancers, ensuring secure network isolation while maintaining external access through ALBs.

## 📋 Current State vs. Target State

### Current State ❌
```
┌─────────────────────────────────────────────────────────┐
│ VPC: 10.0.0.0/16                                        │
│                                                          │
│  ┌────────────────┐  ┌────────────────┐                │
│  │ Public Subnet  │  │ Public Subnet  │                │
│  │ 10.0.0.0/24    │  │ 10.0.1.0/24    │                │
│  │                │  │                │                │
│  │ - EKS Nodes    │  │ - EKS Nodes    │                │
│  │ - RDS          │  │ - EC2 VMs      │                │
│  │ - ALB          │  │ - EFS          │                │
│  │ (All Public)   │  │ (All Public)   │                │
│  └────────────────┘  └────────────────┘                │
│         │                    │                          │
│         └────────┬───────────┘                          │
│                  │                                       │
│          Internet Gateway                               │
└─────────────────────────────────────────────────────────┘
```

### Target State ✅
```
┌────────────────────────────────────────────────────────────────────┐
│ VPC: 10.0.0.0/16                                                   │
│                                                                     │
│  ┌──────────────────┐  ┌──────────────────┐                       │
│  │ Public Subnet    │  │ Public Subnet    │                       │
│  │ 10.0.1.0/24      │  │ 10.0.2.0/24      │                       │
│  │                  │  │                  │                       │
│  │ - ALB ✅         │  │ - ALB ✅         │                       │
│  │ - NAT Gateway    │  │ - NAT Gateway    │                       │
│  │ - Bastion (opt)  │  │ - Bastion (opt)  │                       │
│  └──────────────────┘  └──────────────────┘                       │
│          │                      │                                  │
│          └──────────┬───────────┘                                  │
│                     │                                               │
│             Internet Gateway                                        │
│                     │                                               │
│          ┌──────────┴───────────┐                                  │
│  ┌──────────────────┐  ┌──────────────────┐                       │
│  │ Private Subnet   │  │ Private Subnet   │                       │
│  │ 10.0.10.0/24     │  │ 10.0.11.0/24     │                       │
│  │                  │  │                  │                       │
│  │ - EKS Nodes 🔒   │  │ - EKS Nodes 🔒   │                       │
│  │ - RDS 🔒         │  │ - RDS 🔒         │                       │
│  │ - EC2 VMs 🔒     │  │ - EC2 VMs 🔒     │                       │
│  │ - EFS 🔒         │  │ - EFS 🔒         │                       │
│  └──────────────────┘  └──────────────────┘                       │
│          │                      │                                  │
│          └──────────┬───────────┘                                  │
│                     │                                               │
│                 NAT Gateway                                         │
│                     │                                               │
│             (Outbound only)                                         │
└────────────────────────────────────────────────────────────────────┘
```

## 🔧 Implementation Changes

### 1. Update VPC and Subnet Structure

**File**: `terraform/environments/aws/main.tf`

**Changes**:
- Create separate public and private subnets
- Public subnets: 10.0.1.0/24, 10.0.2.0/24 (small, for ALB/NAT)
- Private subnets: 10.0.10.0/24, 10.0.11.0/24 (large, for workloads)
- Add NAT Gateways in public subnets
- Create separate route tables for public/private

### 2. Update EKS Module

**File**: `terraform/modules/aws_eks/main.tf`

**Changes**:
- Deploy EKS control plane with private endpoint enabled
- Deploy worker nodes in private subnets
- Update security groups to allow traffic only from ALB

### 3. Update RDS Module

**File**: `terraform/modules/aws_rds/main.tf`

**Changes**:
- Already set to `publicly_accessible = false` ✅
- Ensure subnet group uses private subnets only
- Update security group to allow traffic only from EKS/EC2

### 4. Update EC2 Module

**File**: `terraform/modules/aws_ec2/main.tf`

**Changes**:
- Deploy EC2 instances in private subnets
- Remove public IP assignment
- Add optional bastion host in public subnet

### 5. Update EFS Module

**File**: `terraform/modules/aws_efs/main.tf`

**Changes**:
- Create mount targets in private subnets only
- Update security group to allow NFS only from EKS/EC2

### 6. Create ALB Module (Optional)

**File**: `terraform/modules/aws_alb/main.tf`

**Changes**:
- Deploy ALB in public subnets
- Create target groups for EKS services
- Configure security groups for internet-facing access

## 📝 Detailed Implementation

I'll proceed with updating the Terraform configuration to implement private networking.

**Priority Order**:
1. ✅ Update VPC/Subnet structure (public + private)
2. ✅ Add NAT Gateways
3. ✅ Update route tables
4. ✅ Update EKS to use private subnets
5. ✅ Update EC2 to use private subnets
6. ✅ Update EFS to use private subnets
7. ✅ Ensure RDS stays in private subnets
8. ✅ Update security groups for least privilege

## ⚠️ Important Considerations

1. **Cost Impact**: NAT Gateways cost ~$0.045/hour (~$33/month per AZ)
2. **Bastion Hosts**: Optional for SSH/RDP access to private resources
3. **VPC Endpoints**: Consider adding for AWS services (S3, ECR, etc.)
4. **Migration**: Existing deployments will need to be recreated
5. **Testing**: Thoroughly test connectivity after changes

## 🚀 Ready to Proceed?

I can now implement these changes. Shall I proceed with updating the Terraform files?
