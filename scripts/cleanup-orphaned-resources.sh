#!/bin/bash

# ========================================
# AWS Resource Cleanup Script (Bash)
# Deployment: zlps-adt-k8s-01
# Purpose: Remove orphaned resources from failed deployment
# Date: November 25, 2025
# ========================================

set -e

CLUSTER_NAME="${1:-zlps-adt-k8s-01}"
REGION="${2:-us-east-2}"
DRY_RUN="${DRY_RUN:-false}"

echo "========================================"
echo "AWS Resource Cleanup Script"
echo "========================================"
echo ""
echo "Cluster Name: $CLUSTER_NAME"
echo "Region: $REGION"
echo "Dry Run: $DRY_RUN"
echo ""

export AWS_DEFAULT_REGION=$REGION

# Get account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# ========================================
# STEP 1: Check and Delete IAM Roles
# ========================================
echo "STEP 1: Checking IAM Roles..."

ROLES=(
    "${CLUSTER_NAME}-ec2-role"
    "${CLUSTER_NAME}-cluster-role"
    "${CLUSTER_NAME}-node-group-role"
)

for ROLE in "${ROLES[@]}"; do
    if aws iam get-role --role-name "$ROLE" &>/dev/null; then
        echo "  [FOUND] IAM Role: $ROLE"
        
        if [ "$DRY_RUN" = "false" ]; then
            # Detach all managed policies
            ATTACHED_POLICIES=$(aws iam list-attached-role-policies --role-name "$ROLE" --query 'AttachedPolicies[].PolicyArn' --output text)
            for POLICY_ARN in $ATTACHED_POLICIES; do
                echo "    Detaching policy: $POLICY_ARN"
                aws iam detach-role-policy --role-name "$ROLE" --policy-arn "$POLICY_ARN"
            done
            
            # Delete inline policies
            INLINE_POLICIES=$(aws iam list-role-policies --role-name "$ROLE" --query 'PolicyNames[]' --output text)
            for POLICY_NAME in $INLINE_POLICIES; do
                echo "    Deleting inline policy: $POLICY_NAME"
                aws iam delete-role-policy --role-name "$ROLE" --policy-name "$POLICY_NAME"
            done
            
            echo "  Deleting role: $ROLE"
            aws iam delete-role --role-name "$ROLE"
            echo "    ✓ Deleted"
        fi
    else
        echo "  [NOT FOUND] IAM Role: $ROLE"
    fi
done

# ========================================
# STEP 2: Check and Delete IAM Policies
# ========================================
echo ""
echo "STEP 2: Checking IAM Policies..."

POLICIES=(
    "${CLUSTER_NAME}-ecr-access-policy"
    "${CLUSTER_NAME}-efs-csi-policy"
)

for POLICY_NAME in "${POLICIES[@]}"; do
    POLICY_ARN="arn:aws:iam::${ACCOUNT_ID}:policy/${POLICY_NAME}"
    
    if aws iam get-policy --policy-arn "$POLICY_ARN" &>/dev/null; then
        echo "  [FOUND] IAM Policy: $POLICY_NAME"
        
        if [ "$DRY_RUN" = "false" ]; then
            # Detach from all entities
            ENTITIES=$(aws iam list-entities-for-policy --policy-arn "$POLICY_ARN" --query 'PolicyRoles[].RoleName' --output text)
            for ROLE in $ENTITIES; do
                echo "    Detaching from role: $ROLE"
                aws iam detach-role-policy --role-name "$ROLE" --policy-arn "$POLICY_ARN"
            done
            
            echo "  Deleting policy: $POLICY_NAME"
            aws iam delete-policy --policy-arn "$POLICY_ARN"
            echo "    ✓ Deleted"
        fi
    else
        echo "  [NOT FOUND] IAM Policy: $POLICY_NAME"
    fi
done

# ========================================
# STEP 3: Check and Delete S3 Buckets
# ========================================
echo ""
echo "STEP 3: Checking S3 Buckets..."

S3_BUCKET=$(echo "$CLUSTER_NAME" | sed 's/k8s/s3/')

if aws s3api head-bucket --bucket "$S3_BUCKET" 2>/dev/null; then
    echo "  [FOUND] S3 Bucket: $S3_BUCKET"
    
    OBJECT_COUNT=$(aws s3 ls "s3://${S3_BUCKET}" --recursive --summarize 2>/dev/null | grep "Total Objects:" | awk '{print $3}')
    if [ -n "$OBJECT_COUNT" ] && [ "$OBJECT_COUNT" -gt 0 ]; then
        echo "    WARNING: Bucket contains $OBJECT_COUNT objects"
    fi
    
    if [ "$DRY_RUN" = "false" ]; then
        echo "  Emptying bucket: $S3_BUCKET"
        aws s3 rm "s3://${S3_BUCKET}" --recursive
        
        echo "  Deleting bucket: $S3_BUCKET"
        aws s3api delete-bucket --bucket "$S3_BUCKET" --region "$REGION"
        echo "    ✓ Deleted"
    fi
else
    echo "  [NOT FOUND] S3 Bucket: $S3_BUCKET"
fi

# ========================================
# STEP 4: Check EKS Cluster
# ========================================
echo ""
echo "STEP 4: Checking EKS Cluster..."

if aws eks describe-cluster --name "$CLUSTER_NAME" --region "$REGION" &>/dev/null; then
    echo "  [FOUND] EKS Cluster: $CLUSTER_NAME"
    
    if [ "$DRY_RUN" = "false" ]; then
        # Delete node groups first
        NODE_GROUPS=$(aws eks list-nodegroups --cluster-name "$CLUSTER_NAME" --region "$REGION" --query 'nodegroups[]' --output text)
        for NG in $NODE_GROUPS; do
            echo "  Deleting node group: $NG"
            aws eks delete-nodegroup --cluster-name "$CLUSTER_NAME" --nodegroup-name "$NG" --region "$REGION"
            echo "    Waiting for node group deletion..."
            aws eks wait nodegroup-deleted --cluster-name "$CLUSTER_NAME" --nodegroup-name "$NG" --region "$REGION"
        done
        
        echo "  Deleting EKS cluster: $CLUSTER_NAME"
        aws eks delete-cluster --name "$CLUSTER_NAME" --region "$REGION"
        echo "    ✓ Cluster deletion initiated (async)"
    fi
else
    echo "  [NOT FOUND] EKS Cluster: $CLUSTER_NAME"
fi

# ========================================
# SUMMARY
# ========================================
echo ""
echo "========================================"
echo "CLEANUP SUMMARY"
echo "========================================"
echo ""

if [ "$DRY_RUN" = "true" ]; then
    echo "[DRY RUN MODE] No resources were deleted."
    echo "Run without DRY_RUN=true to perform actual deletion."
else
    echo "✓ Cleanup complete!"
    echo ""
    echo "Note: EKS cluster deletion is asynchronous and may take 10-15 minutes."
    echo "You can check status with:"
    echo "  aws eks describe-cluster --name $CLUSTER_NAME --region $REGION"
fi

echo ""
