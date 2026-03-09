# AWS CLI Cleanup Quick Reference
# Deployment: zlps-adt-k8s-01
# Date: November 25, 2025

## OPTION 1: Use the PowerShell Script (Recommended)

### Dry Run (check what will be deleted):
```powershell
cd C:\Projects\ZLAWS\automated-eks-deployer
.\scripts\cleanup-orphaned-resources.ps1 -DryRun
```

### Delete resources (with confirmation):
```powershell
.\scripts\cleanup-orphaned-resources.ps1
```

### Force delete (skip confirmation):
```powershell
.\scripts\cleanup-orphaned-resources.ps1 -Force
```

### Custom cluster name and region:
```powershell
.\scripts\cleanup-orphaned-resources.ps1 -ClusterName "zlps-adt-k8s-01" -Region "us-east-2"
```

---

## OPTION 2: Manual AWS CLI Commands

### Step 1: Delete IAM Roles
```bash
# List and delete EC2 role
aws iam list-attached-role-policies --role-name zlps-adt-k8s-01-ec2-role
aws iam detach-role-policy --role-name zlps-adt-k8s-01-ec2-role --policy-arn <POLICY_ARN>
aws iam delete-role --role-name zlps-adt-k8s-01-ec2-role

# List and delete EKS cluster role
aws iam list-attached-role-policies --role-name zlps-adt-k8s-01-cluster-role
aws iam detach-role-policy --role-name zlps-adt-k8s-01-cluster-role --policy-arn <POLICY_ARN>
aws iam delete-role --role-name zlps-adt-k8s-01-cluster-role

# List and delete EKS node group role
aws iam list-attached-role-policies --role-name zlps-adt-k8s-01-node-group-role
aws iam detach-role-policy --role-name zlps-adt-k8s-01-node-group-role --policy-arn <POLICY_ARN>
aws iam delete-role --role-name zlps-adt-k8s-01-node-group-role
```

### Step 2: Delete IAM Policies
```bash
# Get your account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Delete ECR access policy
aws iam list-entities-for-policy --policy-arn arn:aws:iam::${ACCOUNT_ID}:policy/zlps-adt-k8s-01-ecr-access-policy
aws iam delete-policy --policy-arn arn:aws:iam::${ACCOUNT_ID}:policy/zlps-adt-k8s-01-ecr-access-policy

# Delete EFS CSI policy
aws iam delete-policy --policy-arn arn:aws:iam::${ACCOUNT_ID}:policy/zlps-adt-k8s-01-efs-csi-policy
```

### Step 3: Delete S3 Bucket
```bash
# Empty the bucket first
aws s3 rm s3://zlps-adt-s3-01 --recursive --region us-east-2

# Delete the bucket
aws s3api delete-bucket --bucket zlps-adt-s3-01 --region us-east-2
```

### Step 4: Check for EKS Cluster
```bash
# Check if cluster exists
aws eks describe-cluster --name zlps-adt-k8s-01 --region us-east-2

# If it exists, delete node groups first
aws eks list-nodegroups --cluster-name zlps-adt-k8s-01 --region us-east-2
aws eks delete-nodegroup --cluster-name zlps-adt-k8s-01 --nodegroup-name <NODE_GROUP_NAME> --region us-east-2

# Wait for node group deletion
aws eks wait nodegroup-deleted --cluster-name zlps-adt-k8s-01 --nodegroup-name <NODE_GROUP_NAME> --region us-east-2

# Delete cluster
aws eks delete-cluster --name zlps-adt-k8s-01 --region us-east-2
```

### Step 5: Check for VPC Resources (if created)
```bash
# List VPCs with cluster tag
aws ec2 describe-vpcs --filters "Name=tag:Name,Values=zlps-adt-k8s-01*" --region us-east-2

# List security groups
aws ec2 describe-security-groups --filters "Name=tag:Name,Values=zlps-adt-k8s-01*" --region us-east-2

# Delete security groups (replace with actual IDs)
aws ec2 delete-security-group --group-id <SG_ID> --region us-east-2

# List and delete subnets
aws ec2 describe-subnets --filters "Name=tag:Name,Values=zlps-adt-k8s-01*" --region us-east-2
aws ec2 delete-subnet --subnet-id <SUBNET_ID> --region us-east-2

# Detach and delete internet gateway
aws ec2 describe-internet-gateways --filters "Name=tag:Name,Values=zlps-adt-k8s-01*" --region us-east-2
aws ec2 detach-internet-gateway --internet-gateway-id <IGW_ID> --vpc-id <VPC_ID> --region us-east-2
aws ec2 delete-internet-gateway --internet-gateway-id <IGW_ID> --region us-east-2

# Delete VPC
aws ec2 delete-vpc --vpc-id <VPC_ID> --region us-east-2
```

---

## OPTION 3: Quick One-Liner Commands

### Check what exists:
```bash
# IAM Roles
aws iam list-roles --query 'Roles[?contains(RoleName, `zlps-adt-k8s-01`)].RoleName' --output table

# IAM Policies
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
aws iam list-policies --query "Policies[?contains(PolicyName, 'zlps-adt-k8s-01')].PolicyName" --output table

# S3 Buckets
aws s3 ls | grep zlps-adt-s3-01

# EKS Clusters
aws eks list-clusters --region us-east-2 --query 'clusters[?contains(@, `zlps-adt-k8s-01`)]'
```

---

## Verification After Cleanup

### Verify all resources are deleted:
```bash
# Check IAM roles
aws iam get-role --role-name zlps-adt-k8s-01-ec2-role 2>&1 | grep NoSuchEntity

# Check IAM policies
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
aws iam get-policy --policy-arn arn:aws:iam::${ACCOUNT_ID}:policy/zlps-adt-k8s-01-ecr-access-policy 2>&1 | grep NoSuchEntity

# Check S3 bucket
aws s3api head-bucket --bucket zlps-adt-s3-01 2>&1 | grep "404\|Not Found"

# Check EKS cluster
aws eks describe-cluster --name zlps-adt-k8s-01 --region us-east-2 2>&1 | grep "ResourceNotFoundException"
```

---

## Troubleshooting

### If IAM role deletion fails with "DeleteConflict":
```bash
# List and detach ALL policies first
aws iam list-attached-role-policies --role-name zlps-adt-k8s-01-ec2-role
aws iam list-role-policies --role-name zlps-adt-k8s-01-ec2-role

# Detach managed policies
aws iam detach-role-policy --role-name zlps-adt-k8s-01-ec2-role --policy-arn <POLICY_ARN>

# Delete inline policies
aws iam delete-role-policy --role-name zlps-adt-k8s-01-ec2-role --policy-name <POLICY_NAME>

# Try deletion again
aws iam delete-role --role-name zlps-adt-k8s-01-ec2-role
```

### If S3 bucket deletion fails with "BucketNotEmpty":
```bash
# List all objects including versions
aws s3api list-object-versions --bucket zlps-adt-s3-01 --region us-east-2

# Delete all versions and delete markers
aws s3api delete-objects --bucket zlps-adt-s3-01 --region us-east-2 \
  --delete "$(aws s3api list-object-versions --bucket zlps-adt-s3-01 --region us-east-2 \
  --query='{Objects: Versions[].{Key:Key,VersionId:VersionId}}')"

# Try deletion again
aws s3api delete-bucket --bucket zlps-adt-s3-01 --region us-east-2
```

### If VPC deletion fails with "DependencyViolation":
```bash
# Check for ENIs (Elastic Network Interfaces)
aws ec2 describe-network-interfaces --filters "Name=vpc-id,Values=<VPC_ID>" --region us-east-2

# Delete ENIs if found
aws ec2 delete-network-interface --network-interface-id <ENI_ID> --region us-east-2

# Check for NAT gateways
aws ec2 describe-nat-gateways --filter "Name=vpc-id,Values=<VPC_ID>" --region us-east-2

# Delete NAT gateways if found
aws ec2 delete-nat-gateway --nat-gateway-id <NAT_ID> --region us-east-2
```

---

## Expected Output

### Successful deletion should show:
```
✓ IAM Role zlps-adt-k8s-01-ec2-role deleted
✓ IAM Role zlps-adt-k8s-01-cluster-role deleted
✓ IAM Role zlps-adt-k8s-01-node-group-role deleted
✓ IAM Policy zlps-adt-k8s-01-ecr-access-policy deleted
✓ IAM Policy zlps-adt-k8s-01-efs-csi-policy deleted
✓ S3 Bucket zlps-adt-s3-01 deleted
✓ No EKS cluster found
✓ No VPC resources found
```

---

## Next Steps After Cleanup

1. Verify all resources deleted (see verification commands above)
2. Update deployment draft with new cluster name (optional): `zlps-adt-k8s-02`
3. Check S3 region configuration in Terraform before retry
4. Create new deployment through UI
5. Monitor deployment progress in real-time

---

## Notes

- **EKS Cluster deletion is asynchronous** - takes 10-15 minutes
- **S3 bucket names must be globally unique** - if bucket exists in different region, rename required
- **IAM policies must be detached before deletion** - script handles this automatically
- **VPC resources have dependency order** - delete in sequence: ENIs → Subnets → IGW → Route Tables → VPC
- **Always use dry-run first** to see what will be deleted

---

## Quick Start (Recommended)

```powershell
# Navigate to project directory
cd C:\Projects\ZLAWS\automated-eks-deployer

# Run dry-run to see what exists
.\scripts\cleanup-orphaned-resources.ps1 -DryRun

# Review the output, then delete if everything looks correct
.\scripts\cleanup-orphaned-resources.ps1

# Type "DELETE" when prompted to confirm
```
