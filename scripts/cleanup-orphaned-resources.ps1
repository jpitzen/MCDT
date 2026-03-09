# ========================================
# AWS Resource Cleanup Script
# Deployment: zlps-adt-k8s-01
# Purpose: Remove orphaned resources from failed deployment
# Date: November 25, 2025
# ========================================

param(
    [string]$ClusterName = "zlps-adt-k8s-01",
    [string]$Region = "us-east-2",
    [switch]$DryRun = $false,
    [switch]$Force = $false
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "AWS Resource Cleanup Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Cluster Name: $ClusterName" -ForegroundColor Yellow
Write-Host "Region: $Region" -ForegroundColor Yellow
Write-Host "Dry Run: $DryRun" -ForegroundColor Yellow
Write-Host ""

# Set AWS region
$env:AWS_DEFAULT_REGION = $Region

# Track what we find and delete
$resourcesFound = @{
    IAMRoles = @()
    IAMPolicies = @()
    S3Buckets = @()
    SecurityGroups = @()
    VPCs = @()
    Subnets = @()
    InternetGateways = @()
    RouteTables = @()
    EKSClusters = @()
}

$errorsEncountered = @()

# ========================================
# STEP 1: Identify IAM Roles
# ========================================
Write-Host "STEP 1: Checking for IAM Roles..." -ForegroundColor Green

$roleNames = @(
    "$ClusterName-ec2-role",
    "$ClusterName-cluster-role",
    "$ClusterName-node-group-role"
)

foreach ($roleName in $roleNames) {
    try {
        $role = aws iam get-role --role-name $roleName 2>$null | ConvertFrom-Json
        if ($role) {
            Write-Host "  [FOUND] IAM Role: $roleName" -ForegroundColor Yellow
            $resourcesFound.IAMRoles += $roleName
        }
    }
    catch {
        Write-Host "  [NOT FOUND] IAM Role: $roleName" -ForegroundColor Gray
    }
}

# ========================================
# STEP 2: Identify IAM Policies
# ========================================
Write-Host "`nSTEP 2: Checking for IAM Policies..." -ForegroundColor Green

$policyPatterns = @(
    "$ClusterName-ecr-access-policy",
    "$ClusterName-efs-csi-policy"
)

# Get account ID for policy ARNs
$accountId = aws sts get-caller-identity --query Account --output text

foreach ($policyPattern in $policyPatterns) {
    try {
        $policyArn = "arn:aws:iam::${accountId}:policy/$policyPattern"
        $policy = aws iam get-policy --policy-arn $policyArn 2>$null | ConvertFrom-Json
        if ($policy) {
            Write-Host "  [FOUND] IAM Policy: $policyPattern" -ForegroundColor Yellow
            $resourcesFound.IAMPolicies += @{
                Name = $policyPattern
                Arn = $policyArn
            }
        }
    }
    catch {
        Write-Host "  [NOT FOUND] IAM Policy: $policyPattern" -ForegroundColor Gray
    }
}

# ========================================
# STEP 3: Identify S3 Buckets
# ========================================
Write-Host "`nSTEP 3: Checking for S3 Buckets..." -ForegroundColor Green

$s3BucketName = $ClusterName.Replace("k8s", "s3")

try {
    $bucket = aws s3api head-bucket --bucket $s3BucketName 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [FOUND] S3 Bucket: $s3BucketName" -ForegroundColor Yellow
        $resourcesFound.S3Buckets += $s3BucketName
        
        # Check if bucket has objects
        $objectCount = aws s3 ls s3://$s3BucketName --recursive --summarize 2>$null | Select-String "Total Objects:" | ForEach-Object { $_ -replace '.*Total Objects:\s*', '' }
        if ($objectCount -and [int]$objectCount -gt 0) {
            Write-Host "    WARNING: Bucket contains $objectCount objects" -ForegroundColor Red
        }
    }
}
catch {
    Write-Host "  [NOT FOUND] S3 Bucket: $s3BucketName" -ForegroundColor Gray
}

# ========================================
# STEP 4: Identify EKS Cluster
# ========================================
Write-Host "`nSTEP 4: Checking for EKS Cluster..." -ForegroundColor Green

try {
    $cluster = aws eks describe-cluster --name $ClusterName --region $Region 2>$null | ConvertFrom-Json
    if ($cluster) {
        Write-Host "  [FOUND] EKS Cluster: $ClusterName" -ForegroundColor Yellow
        $resourcesFound.EKSClusters += $ClusterName
        
        # Check for node groups
        $nodeGroups = aws eks list-nodegroups --cluster-name $ClusterName --region $Region 2>$null | ConvertFrom-Json
        if ($nodeGroups.nodegroups) {
            Write-Host "    Node Groups: $($nodeGroups.nodegroups -join ', ')" -ForegroundColor Yellow
        }
    }
}
catch {
    Write-Host "  [NOT FOUND] EKS Cluster: $ClusterName" -ForegroundColor Gray
}

# ========================================
# STEP 5: Identify Security Groups
# ========================================
Write-Host "`nSTEP 5: Checking for Security Groups..." -ForegroundColor Green

try {
    $securityGroups = aws ec2 describe-security-groups --filters "Name=tag:Name,Values=$ClusterName*" --region $Region 2>$null | ConvertFrom-Json
    if ($securityGroups.SecurityGroups) {
        foreach ($sg in $securityGroups.SecurityGroups) {
            Write-Host "  [FOUND] Security Group: $($sg.GroupId) - $($sg.GroupName)" -ForegroundColor Yellow
            $resourcesFound.SecurityGroups += @{
                Id = $sg.GroupId
                Name = $sg.GroupName
            }
        }
    } else {
        Write-Host "  [NOT FOUND] Security Groups with tag: $ClusterName" -ForegroundColor Gray
    }
}
catch {
    Write-Host "  [ERROR] Failed to check Security Groups: $($_.Exception.Message)" -ForegroundColor Red
}

# ========================================
# STEP 6: Identify VPC Resources
# ========================================
Write-Host "`nSTEP 6: Checking for VPC Resources..." -ForegroundColor Green

try {
    $vpcs = aws ec2 describe-vpcs --filters "Name=tag:Name,Values=$ClusterName*" --region $Region 2>$null | ConvertFrom-Json
    if ($vpcs.Vpcs) {
        foreach ($vpc in $vpcs.Vpcs) {
            Write-Host "  [FOUND] VPC: $($vpc.VpcId)" -ForegroundColor Yellow
            $resourcesFound.VPCs += $vpc.VpcId
            
            # Check for subnets
            $subnets = aws ec2 describe-subnets --filters "Name=vpc-id,Values=$($vpc.VpcId)" --region $Region | ConvertFrom-Json
            if ($subnets.Subnets) {
                foreach ($subnet in $subnets.Subnets) {
                    Write-Host "    [FOUND] Subnet: $($subnet.SubnetId)" -ForegroundColor Yellow
                    $resourcesFound.Subnets += $subnet.SubnetId
                }
            }
            
            # Check for internet gateways
            $igws = aws ec2 describe-internet-gateways --filters "Name=attachment.vpc-id,Values=$($vpc.VpcId)" --region $Region | ConvertFrom-Json
            if ($igws.InternetGateways) {
                foreach ($igw in $igws.InternetGateways) {
                    Write-Host "    [FOUND] Internet Gateway: $($igw.InternetGatewayId)" -ForegroundColor Yellow
                    $resourcesFound.InternetGateways += @{
                        Id = $igw.InternetGatewayId
                        VpcId = $vpc.VpcId
                    }
                }
            }
            
            # Check for route tables
            $routeTables = aws ec2 describe-route-tables --filters "Name=vpc-id,Values=$($vpc.VpcId)" --region $Region | ConvertFrom-Json
            if ($routeTables.RouteTables) {
                foreach ($rt in $routeTables.RouteTables) {
                    if (-not $rt.Associations.Main) {
                        Write-Host "    [FOUND] Route Table: $($rt.RouteTableId)" -ForegroundColor Yellow
                        $resourcesFound.RouteTables += $rt.RouteTableId
                    }
                }
            }
        }
    } else {
        Write-Host "  [NOT FOUND] VPCs with tag: $ClusterName" -ForegroundColor Gray
    }
}
catch {
    Write-Host "  [ERROR] Failed to check VPC Resources: $($_.Exception.Message)" -ForegroundColor Red
}

# ========================================
# SUMMARY
# ========================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "RESOURCE SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$totalResources = 0
$totalResources += $resourcesFound.IAMRoles.Count
$totalResources += $resourcesFound.IAMPolicies.Count
$totalResources += $resourcesFound.S3Buckets.Count
$totalResources += $resourcesFound.EKSClusters.Count
$totalResources += $resourcesFound.SecurityGroups.Count
$totalResources += $resourcesFound.VPCs.Count
$totalResources += $resourcesFound.Subnets.Count
$totalResources += $resourcesFound.InternetGateways.Count
$totalResources += $resourcesFound.RouteTables.Count

Write-Host "`nIAM Roles: $($resourcesFound.IAMRoles.Count)" -ForegroundColor Yellow
Write-Host "IAM Policies: $($resourcesFound.IAMPolicies.Count)" -ForegroundColor Yellow
Write-Host "S3 Buckets: $($resourcesFound.S3Buckets.Count)" -ForegroundColor Yellow
Write-Host "EKS Clusters: $($resourcesFound.EKSClusters.Count)" -ForegroundColor Yellow
Write-Host "Security Groups: $($resourcesFound.SecurityGroups.Count)" -ForegroundColor Yellow
Write-Host "VPCs: $($resourcesFound.VPCs.Count)" -ForegroundColor Yellow
Write-Host "Subnets: $($resourcesFound.Subnets.Count)" -ForegroundColor Yellow
Write-Host "Internet Gateways: $($resourcesFound.InternetGateways.Count)" -ForegroundColor Yellow
Write-Host "Route Tables: $($resourcesFound.RouteTables.Count)" -ForegroundColor Yellow
Write-Host "`nTotal Resources: $totalResources" -ForegroundColor Cyan

if ($totalResources -eq 0) {
    Write-Host "`n✓ No orphaned resources found. Nothing to clean up." -ForegroundColor Green
    exit 0
}

# ========================================
# DRY RUN CHECK
# ========================================
if ($DryRun) {
    Write-Host "`n[DRY RUN MODE] No resources will be deleted." -ForegroundColor Magenta
    Write-Host "Run without -DryRun to perform actual deletion." -ForegroundColor Magenta
    exit 0
}

# ========================================
# CONFIRMATION
# ========================================
if (-not $Force) {
    Write-Host "`n" -NoNewline
    Write-Host "WARNING: " -ForegroundColor Red -NoNewline
    Write-Host "This will permanently delete $totalResources AWS resources!" -ForegroundColor Yellow
    Write-Host ""
    $confirmation = Read-Host "Type 'DELETE' to confirm deletion, or anything else to cancel"
    
    if ($confirmation -ne "DELETE") {
        Write-Host "`nDeletion cancelled by user." -ForegroundColor Yellow
        exit 0
    }
}

# ========================================
# DELETION PROCESS
# ========================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "DELETING RESOURCES" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# DELETE EKS CLUSTERS (must be done first)
if ($resourcesFound.EKSClusters.Count -gt 0) {
    Write-Host "`nDeleting EKS Clusters..." -ForegroundColor Green
    foreach ($clusterName in $resourcesFound.EKSClusters) {
        try {
            # Delete node groups first
            $nodeGroups = aws eks list-nodegroups --cluster-name $clusterName --region $Region | ConvertFrom-Json
            foreach ($ng in $nodeGroups.nodegroups) {
                Write-Host "  Deleting node group: $ng" -ForegroundColor Yellow
                aws eks delete-nodegroup --cluster-name $clusterName --nodegroup-name $ng --region $Region
                Write-Host "    Waiting for node group deletion..." -ForegroundColor Gray
                aws eks wait nodegroup-deleted --cluster-name $clusterName --nodegroup-name $ng --region $Region
            }
            
            Write-Host "  Deleting EKS cluster: $clusterName" -ForegroundColor Yellow
            aws eks delete-cluster --name $clusterName --region $Region
            Write-Host "    ✓ Cluster deletion initiated (async)" -ForegroundColor Green
        }
        catch {
            Write-Host "    ✗ Error deleting EKS cluster: $($_.Exception.Message)" -ForegroundColor Red
            $errorsEncountered += "EKS Cluster: $clusterName - $($_.Exception.Message)"
        }
    }
}

# DELETE S3 BUCKETS
if ($resourcesFound.S3Buckets.Count -gt 0) {
    Write-Host "`nDeleting S3 Buckets..." -ForegroundColor Green
    foreach ($bucketName in $resourcesFound.S3Buckets) {
        try {
            # Empty bucket first
            Write-Host "  Emptying bucket: $bucketName" -ForegroundColor Yellow
            aws s3 rm s3://$bucketName --recursive
            
            Write-Host "  Deleting bucket: $bucketName" -ForegroundColor Yellow
            aws s3api delete-bucket --bucket $bucketName --region $Region
            Write-Host "    ✓ Deleted" -ForegroundColor Green
        }
        catch {
            Write-Host "    ✗ Error deleting S3 bucket: $($_.Exception.Message)" -ForegroundColor Red
            $errorsEncountered += "S3 Bucket: $bucketName - $($_.Exception.Message)"
        }
    }
}

# DELETE IAM POLICIES (must be done before roles)
if ($resourcesFound.IAMPolicies.Count -gt 0) {
    Write-Host "`nDeleting IAM Policies..." -ForegroundColor Green
    foreach ($policy in $resourcesFound.IAMPolicies) {
        try {
            # Detach from all roles first
            $policyArn = $policy.Arn
            Write-Host "  Checking attachments for: $($policy.Name)" -ForegroundColor Yellow
            
            $entities = aws iam list-entities-for-policy --policy-arn $policyArn | ConvertFrom-Json
            
            foreach ($role in $entities.PolicyRoles) {
                Write-Host "    Detaching from role: $($role.RoleName)" -ForegroundColor Gray
                aws iam detach-role-policy --role-name $role.RoleName --policy-arn $policyArn
            }
            
            Write-Host "  Deleting policy: $($policy.Name)" -ForegroundColor Yellow
            aws iam delete-policy --policy-arn $policyArn
            Write-Host "    ✓ Deleted" -ForegroundColor Green
        }
        catch {
            Write-Host "    ✗ Error deleting IAM policy: $($_.Exception.Message)" -ForegroundColor Red
            $errorsEncountered += "IAM Policy: $($policy.Name) - $($_.Exception.Message)"
        }
    }
}

# DELETE IAM ROLES
if ($resourcesFound.IAMRoles.Count -gt 0) {
    Write-Host "`nDeleting IAM Roles..." -ForegroundColor Green
    foreach ($roleName in $resourcesFound.IAMRoles) {
        try {
            # Detach all policies first
            Write-Host "  Checking attached policies for: $roleName" -ForegroundColor Yellow
            $attachedPolicies = aws iam list-attached-role-policies --role-name $roleName | ConvertFrom-Json
            
            foreach ($policy in $attachedPolicies.AttachedPolicies) {
                Write-Host "    Detaching policy: $($policy.PolicyName)" -ForegroundColor Gray
                aws iam detach-role-policy --role-name $roleName --policy-arn $policy.PolicyArn
            }
            
            # Delete inline policies
            $inlinePolicies = aws iam list-role-policies --role-name $roleName | ConvertFrom-Json
            foreach ($policyName in $inlinePolicies.PolicyNames) {
                Write-Host "    Deleting inline policy: $policyName" -ForegroundColor Gray
                aws iam delete-role-policy --role-name $roleName --policy-name $policyName
            }
            
            Write-Host "  Deleting role: $roleName" -ForegroundColor Yellow
            aws iam delete-role --role-name $roleName
            Write-Host "    ✓ Deleted" -ForegroundColor Green
        }
        catch {
            Write-Host "    ✗ Error deleting IAM role: $($_.Exception.Message)" -ForegroundColor Red
            $errorsEncountered += "IAM Role: $roleName - $($_.Exception.Message)"
        }
    }
}

# DELETE SECURITY GROUPS
if ($resourcesFound.SecurityGroups.Count -gt 0) {
    Write-Host "`nDeleting Security Groups..." -ForegroundColor Green
    foreach ($sg in $resourcesFound.SecurityGroups) {
        try {
            Write-Host "  Deleting security group: $($sg.Name)" -ForegroundColor Yellow
            aws ec2 delete-security-group --group-id $sg.Id --region $Region
            Write-Host "    ✓ Deleted" -ForegroundColor Green
        }
        catch {
            Write-Host "    ✗ Error deleting security group: $($_.Exception.Message)" -ForegroundColor Red
            $errorsEncountered += "Security Group: $($sg.Name) - $($_.Exception.Message)"
        }
    }
}

# DELETE SUBNETS
if ($resourcesFound.Subnets.Count -gt 0) {
    Write-Host "`nDeleting Subnets..." -ForegroundColor Green
    foreach ($subnetId in $resourcesFound.Subnets) {
        try {
            Write-Host "  Deleting subnet: $subnetId" -ForegroundColor Yellow
            aws ec2 delete-subnet --subnet-id $subnetId --region $Region
            Write-Host "    ✓ Deleted" -ForegroundColor Green
        }
        catch {
            Write-Host "    ✗ Error deleting subnet: $($_.Exception.Message)" -ForegroundColor Red
            $errorsEncountered += "Subnet: $subnetId - $($_.Exception.Message)"
        }
    }
}

# DELETE INTERNET GATEWAYS
if ($resourcesFound.InternetGateways.Count -gt 0) {
    Write-Host "`nDeleting Internet Gateways..." -ForegroundColor Green
    foreach ($igw in $resourcesFound.InternetGateways) {
        try {
            Write-Host "  Detaching IGW: $($igw.Id) from VPC: $($igw.VpcId)" -ForegroundColor Yellow
            aws ec2 detach-internet-gateway --internet-gateway-id $igw.Id --vpc-id $igw.VpcId --region $Region
            
            Write-Host "  Deleting IGW: $($igw.Id)" -ForegroundColor Yellow
            aws ec2 delete-internet-gateway --internet-gateway-id $igw.Id --region $Region
            Write-Host "    ✓ Deleted" -ForegroundColor Green
        }
        catch {
            Write-Host "    ✗ Error deleting internet gateway: $($_.Exception.Message)" -ForegroundColor Red
            $errorsEncountered += "Internet Gateway: $($igw.Id) - $($_.Exception.Message)"
        }
    }
}

# DELETE ROUTE TABLES
if ($resourcesFound.RouteTables.Count -gt 0) {
    Write-Host "`nDeleting Route Tables..." -ForegroundColor Green
    foreach ($rtId in $resourcesFound.RouteTables) {
        try {
            Write-Host "  Deleting route table: $rtId" -ForegroundColor Yellow
            aws ec2 delete-route-table --route-table-id $rtId --region $Region
            Write-Host "    ✓ Deleted" -ForegroundColor Green
        }
        catch {
            Write-Host "    ✗ Error deleting route table: $($_.Exception.Message)" -ForegroundColor Red
            $errorsEncountered += "Route Table: $rtId - $($_.Exception.Message)"
        }
    }
}

# DELETE VPCs
if ($resourcesFound.VPCs.Count -gt 0) {
    Write-Host "`nDeleting VPCs..." -ForegroundColor Green
    foreach ($vpcId in $resourcesFound.VPCs) {
        try {
            Write-Host "  Deleting VPC: $vpcId" -ForegroundColor Yellow
            aws ec2 delete-vpc --vpc-id $vpcId --region $Region
            Write-Host "    ✓ Deleted" -ForegroundColor Green
        }
        catch {
            Write-Host "    ✗ Error deleting VPC: $($_.Exception.Message)" -ForegroundColor Red
            $errorsEncountered += "VPC: $vpcId - $($_.Exception.Message)"
        }
    }
}

# ========================================
# FINAL SUMMARY
# ========================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "CLEANUP COMPLETE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if ($errorsEncountered.Count -gt 0) {
    Write-Host "`nErrors encountered during deletion:" -ForegroundColor Red
    foreach ($error in $errorsEncountered) {
        Write-Host "  - $error" -ForegroundColor Red
    }
    Write-Host "`nSome resources may require manual cleanup." -ForegroundColor Yellow
} else {
    Write-Host "`n✓ All resources successfully deleted!" -ForegroundColor Green
}

Write-Host "`nYou can now retry the deployment with a fresh start." -ForegroundColor Cyan
Write-Host ""
