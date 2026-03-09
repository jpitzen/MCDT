# Infrastructure Discovery and Reuse

## Overview

The AWS environment configuration now includes **automatic infrastructure discovery** to detect and reuse existing AWS resources. When deploying new clusters or resources, the system will:

1. **Detect existing VPCs** with proper tagging
2. **Discover existing RDS instances** and use their VPC/subnet configuration
3. **Find existing subnets** (public and private)
4. **Locate NAT gateways and Internet gateways**
5. **Identify existing EKS clusters** to avoid naming conflicts

This ensures that new deployments integrate seamlessly with existing infrastructure and use the same networking configuration.

---

## How It Works

### Resource Selection Priority

The system follows a priority order when selecting infrastructure:

#### 1. **VPC Selection**
```
Priority Order:
1. Newly created VPC (if create_vpc = true)
2. User-specified VPC ID (if vpc_id provided)
3. VPC from existing RDS instance (if enable_rds and RDS exists)
4. First discovered VPC with "ManagedBy=Terraform" tag
```

**Example Scenario:**
```hcl
# If you have an RDS instance named "us-east-1-myrds" in vpc-abc123
# New EKS cluster will automatically use vpc-abc123

variable "enable_rds" { value = true }
variable "create_vpc" { value = false }
variable "vpc_id" { value = "" }  # Not specified

# Result: System discovers existing RDS → uses its VPC (vpc-abc123)
```

#### 2. **Subnet Selection**

**Private Subnets (for EKS, RDS, EC2, EFS):**
```
Priority Order:
1. Newly created private subnets
2. User-specified subnets (aws_subnets variable)
3. Discovered private subnets (tagged with kubernetes.io/role/internal-elb = "1")
4. Subnets from existing RDS DB subnet group
5. All available subnets in VPC (fallback)
```

**Public Subnets (for ALB, NAT Gateway):**
```
Priority Order:
1. Newly created public subnets
2. Discovered public subnets (tagged with kubernetes.io/role/elb = "1")
3. Fall back to private subnets if no public subnets found
```

**RDS-Specific Subnets:**
```
When enable_rds = true:
- If RDS already exists in VPC → Use its exact subnet group
- Otherwise → Use standard private subnets
```

#### 3. **VPC CIDR Selection**
```
Priority Order:
1. Newly created VPC CIDR (aws_vpc_cidr variable)
2. User-specified VPC CIDR (vpc_cidr variable)
3. Discovered CIDR from selected VPC
4. Discovered CIDR from existing RDS VPC
5. Default fallback: 10.0.0.0/16
```

---

## Usage Examples

### Example 1: Deploy EKS into Existing RDS VPC

**Scenario:** You have RDS instance "prod-rds" running in us-east-1 with VPC vpc-123abc

```hcl
# terraform.tfvars
cluster_name    = "prod-eks-01"
create_vpc      = false      # Don't create new VPC
enable_rds      = true       # Enable RDS discovery
vpc_id          = ""         # Auto-discover from RDS
aws_region      = "us-east-1"

# The system will:
# 1. Find existing RDS instance "prod-rds"
# 2. Extract its VPC: vpc-123abc
# 3. Extract its subnets: [subnet-aaa, subnet-bbb, subnet-ccc]
# 4. Deploy EKS cluster in the same VPC and subnets
# Result: EKS can directly communicate with RDS over private network
```

### Example 2: Deploy into Specific VPC

```hcl
# terraform.tfvars
cluster_name    = "dev-eks-01"
create_vpc      = false
vpc_id          = "vpc-456def"
aws_subnets     = ["subnet-111", "subnet-222", "subnet-333"]

# The system will:
# 1. Use specified VPC: vpc-456def
# 2. Use specified subnets
# 3. Discover VPC CIDR automatically
# 4. Deploy all resources in specified network
```

### Example 3: Let System Auto-Discover Everything

```hcl
# terraform.tfvars
cluster_name    = "staging-eks-01"
create_vpc      = false
vpc_id          = ""         # Empty - let system discover
aws_subnets     = []         # Empty - let system discover
aws_region      = "us-west-2"

# The system will:
# 1. Search for VPCs with tag "ManagedBy=Terraform"
# 2. Select first found VPC
# 3. Find private subnets (tagged for internal-elb)
# 4. Find public subnets (tagged for elb)
# 5. Deploy EKS in discovered network
```

### Example 4: Create New VPC (Default Behavior)

```hcl
# terraform.tfvars
cluster_name    = "new-eks-01"
create_vpc      = true       # Create fresh VPC
aws_vpc_cidr    = "10.100.0.0/16"

# The system will:
# 1. Create new VPC with specified CIDR
# 2. Create public subnets (10.100.1.0/24, 10.100.2.0/24, ...)
# 3. Create private subnets (10.100.10.0/24, 10.100.11.0/24, ...)
# 4. Deploy all resources in new VPC
# 5. No discovery needed
```

---

## Subnet Tagging Requirements

For automatic discovery to work correctly, subnets should be tagged:

### Private Subnets (for EKS, RDS, EC2)
```hcl
tags = {
  "kubernetes.io/role/internal-elb" = "1"
  Name = "my-cluster-private-us-east-1a"
}
```

### Public Subnets (for ALB, NAT Gateway)
```hcl
tags = {
  "kubernetes.io/role/elb" = "1"
  Name = "my-cluster-public-us-east-1a"
}
```

### VPC Tagging (for discovery)
```hcl
tags = {
  "ManagedBy" = "Terraform"
  Name = "my-vpc"
}
```

---

## Discovery Output

After running `terraform plan` or `terraform apply`, you can see discovered infrastructure:

```hcl
output "discovered_infrastructure" {
  vpc_id                = "vpc-abc123"
  vpc_cidr              = "10.0.0.0/16"
  private_subnet_count  = 3
  public_subnet_count   = 3
  existing_rds_found    = true
  existing_rds_count    = 2
  existing_eks_clusters = ["cluster-01", "cluster-02"]
  nat_gateways_found    = 3
  using_existing_vpc    = true
}
```

---

## Network Connectivity Benefits

### Automatic VPC Peering
When deploying into existing infrastructure:

✅ **EKS → RDS:** Direct private network connection (no VPC peering needed)  
✅ **EKS → EC2 VMs:** Same VPC communication  
✅ **EKS → EFS:** Private mount targets accessible  
✅ **RDS → EC2:** Database accessible from VMs  
✅ **All resources:** Share NAT Gateway for outbound internet  

### Security Benefits

- **No Public IPs:** All backend resources use private IPs
- **Same Security Groups:** Can reference existing security groups
- **Network ACLs:** Inherited from existing VPC configuration
- **VPC Flow Logs:** Centralized logging for all resources

---

## Variables Reference

### Infrastructure Discovery Variables

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `create_vpc` | bool | `true` | Create new VPC (true) or use existing (false) |
| `vpc_id` | string | `""` | Specific VPC ID to use (empty = auto-discover) |
| `vpc_cidr` | string | `""` | VPC CIDR block (empty = auto-discover) |
| `aws_subnets` | list(string) | `[]` | Specific subnets (empty = auto-discover) |
| `enable_rds` | bool | `false` | Enable RDS discovery for VPC selection |
| `aws_region` | string | Required | Region to search for infrastructure |

### Discovery Control

```hcl
# Full Auto-Discovery (recommended for existing infra)
create_vpc  = false
vpc_id      = ""
aws_subnets = []

# Manual Specification (recommended for new deployments)
create_vpc  = true
aws_vpc_cidr = "10.0.0.0/16"

# Hybrid Approach (specify VPC, discover subnets)
create_vpc  = false
vpc_id      = "vpc-123abc"
aws_subnets = []  # Will auto-discover subnets in vpc-123abc
```

---

## Troubleshooting

### No VPC Found
```
Error: No VPC discovered and vpc_id not provided
```

**Solutions:**
1. Set `create_vpc = true` to create new VPC
2. Provide specific `vpc_id = "vpc-xxxxx"`
3. Ensure existing VPCs have tag `ManagedBy = "Terraform"`

### No Subnets Found
```
Error: No subnets found in VPC
```

**Solutions:**
1. Provide specific `aws_subnets = ["subnet-xxx", "subnet-yyy"]`
2. Ensure subnets have proper Kubernetes tags
3. Check that VPC has subnets in multiple AZs

### RDS in Different VPC
```
Warning: Existing RDS found in different VPC
```

**Solutions:**
1. Explicitly set `vpc_id` to RDS VPC ID
2. Set `enable_rds = false` to disable RDS discovery
3. Use VPC peering if resources must be in different VPCs

---

## Best Practices

### 1. Tag Everything
```hcl
common_tags = {
  ManagedBy   = "Terraform"
  Environment = "production"
  Project     = "eks-deployment"
  Owner       = "platform-team"
}
```

### 2. Use Naming Conventions
```
VPC:     {project}-{env}-vpc
Subnets: {project}-{env}-{type}-{az}
RDS:     {region}-{env}-{purpose}

Examples:
- myapp-prod-vpc
- myapp-prod-private-us-east-1a
- us-east-1-prod-postgres
```

### 3. Document Discovered Resources
```bash
# Run discovery and save output
terraform plan -out=plan.tfplan
terraform show -json plan.tfplan | jq '.values.outputs.discovered_infrastructure'
```

### 4. Validate Before Apply
```bash
# Check what will be reused vs created
terraform plan | grep -E "will be (created|read)"

# Expected output:
# data.aws_vpc.selected[0] will be read
# data.aws_subnets.private[0] will be read
# module.eks_cluster will be created
```

---

## Architecture Diagrams

### With Discovery Enabled

```
┌─────────────────────────────────────────────────────────────┐
│ EXISTING INFRASTRUCTURE (Discovered)                        │
│                                                              │
│  VPC: vpc-abc123 (10.0.0.0/16)                             │
│  ├── RDS: us-east-1-myrds (10.0.11.50)                     │
│  ├── Private Subnets: subnet-aaa, subnet-bbb, subnet-ccc   │
│  ├── Public Subnets: subnet-111, subnet-222, subnet-333    │
│  └── NAT Gateways: nat-xxx, nat-yyy, nat-zzz               │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐│
│  │ NEW DEPLOYMENT (Automatically Integrated)              ││
│  │                                                         ││
│  │  • EKS Cluster: my-new-cluster                        ││
│  │    └── Uses: subnet-aaa, subnet-bbb, subnet-ccc       ││
│  │  • EKS Nodes (10.0.11.100-150)                        ││
│  │    └── Can reach RDS at 10.0.11.50 ✅                 ││
│  │  • ALB: my-new-alb                                     ││
│  │    └── Uses: subnet-111, subnet-222, subnet-333       ││
│  └────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Without Discovery (New VPC)

```
┌─────────────────────────────────────────────────────────────┐
│ NEW VPC: vpc-new123 (10.100.0.0/16)                        │
│                                                              │
│  ├── Private Subnets: 10.100.10.0/24, 10.100.11.0/24       │
│  ├── Public Subnets: 10.100.1.0/24, 10.100.2.0/24          │
│  ├── Internet Gateway: igw-new                              │
│  ├── NAT Gateways: nat-new-1a, nat-new-1b                  │
│  │                                                           │
│  └── NEW RESOURCES:                                          │
│      • EKS Cluster: my-new-cluster                          │
│      • RDS: my-new-db                                        │
│      • EC2 VMs: my-vms-01, my-vms-02                        │
│      • EFS: my-shared-storage                               │
│                                                              │
│  ⚠️ Isolated from existing infrastructure                   │
│  (Requires VPC peering to connect to other VPCs)           │
└─────────────────────────────────────────────────────────────┘
```

---

## Migration Path

### Phase 1: Discovery (No Changes)
```bash
# Enable discovery without creating resources
terraform plan -var="create_vpc=false" -var="enable_rds=true"

# Review discovered_infrastructure output
# Verify correct VPC and subnets found
```

### Phase 2: Validation
```bash
# Test with small deployment
terraform apply -var="node_count=1" -auto-approve

# Verify connectivity
kubectl get nodes
aws rds describe-db-instances
```

### Phase 3: Full Deployment
```bash
# Deploy with full configuration
terraform apply -var="node_count=3" -auto-approve
```

---

## Support and Troubleshooting

### Debug Discovery
```bash
# Enable Terraform debug logging
export TF_LOG=DEBUG
terraform plan

# Check data source queries
terraform console
> data.aws_vpcs.existing
> data.aws_subnets.private
> local.infrastructure_summary
```

### Verify Network Connectivity
```bash
# From EKS pod to RDS
kubectl run -it --rm debug --image=busybox --restart=Never -- sh
nc -zv <rds-endpoint> 5432

# Check VPC peering (should not be needed)
aws ec2 describe-vpc-peering-connections --region us-east-1
```

---

**Last Updated:** November 26, 2025  
**Version:** 2.0  
**Status:** ✅ Infrastructure Discovery Enabled
