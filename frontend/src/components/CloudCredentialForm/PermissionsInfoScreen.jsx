import React from 'react';
import {
  Box,
  Typography,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Alert,
  Divider,
  Link,
  Tabs,
  Tab,
  Paper,
  IconButton,
  Tooltip,
  Snackbar,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Check as CheckIcon,
  Security as SecurityIcon,
  CloudQueue as CloudIcon,
  VpnKey as KeyIcon,
  Info as InfoIcon,
  OpenInNew as OpenInNewIcon,
  ContentCopy as CopyIcon,
  Terminal as TerminalIcon,
} from '@mui/icons-material';

// Permission requirements for each cloud provider
const PROVIDER_PERMISSIONS = {
  aws: {
    name: 'Amazon Web Services (AWS)',
    color: '#FF9900',
    accountType: 'IAM User or IAM Role',
    description: 'ZL MCDT creates EKS clusters with managed node groups, requiring permissions for EKS, EC2, IAM, and VPC resources.',
    docUrl: 'https://docs.aws.amazon.com/eks/latest/userguide/security-iam.html',
    credentialsNeeded: [
      'Access Key ID',
      'Secret Access Key',
      'AWS Account ID (12-digit)',
    ],
    minimumPolicies: [
      {
        name: 'AmazonEKSClusterPolicy',
        type: 'AWS Managed',
        description: 'Allows EKS to manage clusters on your behalf',
      },
      {
        name: 'AmazonEKSWorkerNodePolicy',
        type: 'AWS Managed',
        description: 'Allows EKS worker nodes to connect to the cluster',
      },
      {
        name: 'AmazonEKS_CNI_Policy',
        type: 'AWS Managed',
        description: 'Allows the VPC CNI plugin to manage networking',
      },
      {
        name: 'AmazonEC2ContainerRegistryReadOnly',
        type: 'AWS Managed',
        description: 'Allows pulling container images from ECR',
      },
    ],
    iamPermissions: [
      'eks:CreateCluster',
      'eks:DeleteCluster',
      'eks:DescribeCluster',
      'eks:ListClusters',
      'eks:UpdateClusterConfig',
      'eks:CreateNodegroup',
      'eks:DeleteNodegroup',
      'eks:DescribeNodegroup',
      'ec2:CreateVpc',
      'ec2:DeleteVpc',
      'ec2:CreateSubnet',
      'ec2:DeleteSubnet',
      'ec2:CreateSecurityGroup',
      'ec2:DeleteSecurityGroup',
      'ec2:AuthorizeSecurityGroupIngress',
      'ec2:AuthorizeSecurityGroupEgress',
      'ec2:DescribeVpcs',
      'ec2:DescribeSubnets',
      'ec2:DescribeSecurityGroups',
      'ec2:DescribeInstances',
      'ec2:DescribeNetworkInterfaces',
      'ec2:CreateTags',
      'iam:CreateRole',
      'iam:DeleteRole',
      'iam:AttachRolePolicy',
      'iam:DetachRolePolicy',
      'iam:GetRole',
      'iam:PassRole',
      'iam:CreateServiceLinkedRole',
      'sts:GetCallerIdentity',
    ],
    recommendations: [
      'Use an IAM user with programmatic access only (no console access)',
      'Consider using IAM roles with temporary credentials for production',
      'Enable MFA for the AWS account root user',
      'Store credentials securely - ZL MCDT encrypts them at rest',
    ],
    verificationScripts: {
      bash: `# AWS - Verify Permissions & Get Credentials
# This script retrieves credentials and tests permissions

ZLMCDT_USER="<your IAM user name>"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
USER_ARN="arn:aws:iam::\${AWS_ACCOUNT_ID}:user/\${ZLMCDT_USER}"

echo "============================================"
echo "STEP 1: Retrieve IAM User Information"
echo "============================================"

# Check if user exists
if ! aws iam get-user --user-name "\${ZLMCDT_USER}" > /dev/null 2>&1; then
  echo "❌ IAM User '\${ZLMCDT_USER}' not found!"
  echo "   Run the creation script first."
  exit 1
fi

echo ""
echo "✅ IAM User Found!"
echo ""
echo "AWS Account ID: \${AWS_ACCOUNT_ID}"
echo "User ARN:       \${USER_ARN}"
echo ""

echo "============================================"
echo "STEP 2: List Existing Access Keys"
echo "============================================"
echo ""
echo "Current Access Keys for \${ZLMCDT_USER}:"
aws iam list-access-keys --user-name "\${ZLMCDT_USER}" --query 'AccessKeyMetadata[*].[AccessKeyId,Status,CreateDate]' --output table

echo ""
echo "============================================"
echo "STEP 3: Generate New Access Keys"
echo "============================================"
echo ""
echo "To create a new Access Key, run:"
echo ""
echo "  aws iam create-access-key --user-name \${ZLMCDT_USER}"
echo ""
echo "⚠️  The Secret Access Key is only shown ONCE - copy it immediately!"
echo ""
echo "To delete an old key first (if at limit of 2 keys):"
echo ""
echo "  aws iam delete-access-key --user-name \${ZLMCDT_USER} --access-key-id <OLD_KEY_ID>"
echo ""

# Uncomment below to generate keys automatically
# echo "Generating new access key..."
# aws iam create-access-key --user-name "\${ZLMCDT_USER}"

echo "============================================"
echo "STEP 4: Verify API Permissions"
echo "============================================"

# List of required actions to verify
REQUIRED_ACTIONS=(
  "eks:CreateCluster"
  "eks:DeleteCluster"
  "eks:DescribeCluster"
  "eks:ListClusters"
  "eks:UpdateClusterConfig"
  "eks:CreateNodegroup"
  "eks:DeleteNodegroup"
  "eks:DescribeNodegroup"
  "ec2:CreateVpc"
  "ec2:DeleteVpc"
  "ec2:CreateSubnet"
  "ec2:DeleteSubnet"
  "ec2:CreateSecurityGroup"
  "ec2:DeleteSecurityGroup"
  "ec2:AuthorizeSecurityGroupIngress"
  "ec2:AuthorizeSecurityGroupEgress"
  "ec2:DescribeVpcs"
  "ec2:DescribeSubnets"
  "ec2:DescribeSecurityGroups"
  "ec2:DescribeInstances"
  "ec2:DescribeNetworkInterfaces"
  "ec2:CreateTags"
  "iam:CreateRole"
  "iam:DeleteRole"
  "iam:AttachRolePolicy"
  "iam:DetachRolePolicy"
  "iam:GetRole"
  "iam:PassRole"
  "iam:CreateServiceLinkedRole"
  "sts:GetCallerIdentity"
)

echo ""
echo "Testing \${#REQUIRED_ACTIONS[@]} permissions..."
echo ""

# Simulate each action
for action in "\${REQUIRED_ACTIONS[@]}"; do
  result=$(aws iam simulate-principal-policy \\
    --policy-source-arn "\${USER_ARN}" \\
    --action-names "\${action}" \\
    --query 'EvaluationResults[0].EvalDecision' \\
    --output text 2>/dev/null)
  
  if [ "\$result" == "allowed" ]; then
    echo "✅ \${action}"
  else
    echo "❌ \${action} - DENIED or ERROR"
  fi
done

echo ""
echo "============================================"
echo "SUMMARY - Copy these to ZL MCDT:"
echo "============================================"
echo "AWS Account ID:    \${AWS_ACCOUNT_ID}"
echo "Access Key ID:     <from access key list above>"
echo "Secret Access Key: <run create-access-key command above>"
echo "============================================"`,
      powershell: `# AWS - Verify Permissions & Get Credentials (PowerShell)
# This script retrieves credentials and tests permissions

$ZLMCDT_USER = "<your IAM user name>"
$AWS_ACCOUNT_ID = aws sts get-caller-identity --query Account --output text
$USER_ARN = "arn:aws:iam::" + $AWS_ACCOUNT_ID + ":user/" + $ZLMCDT_USER

Write-Host "============================================"
Write-Host "STEP 1: Retrieve IAM User Information"
Write-Host "============================================"

# Check if user exists
try {
  $userInfo = aws iam get-user --user-name $ZLMCDT_USER 2>$null | ConvertFrom-Json
  if (-not $userInfo) { throw "User not found" }
} catch {
  Write-Host "❌ IAM User '$ZLMCDT_USER' not found!" -ForegroundColor Red
  Write-Host "   Run the creation script first."
  exit 1
}

Write-Host ""
Write-Host "✅ IAM User Found!" -ForegroundColor Green
Write-Host ""
Write-Host "AWS Account ID: $AWS_ACCOUNT_ID"
Write-Host "User ARN:       $USER_ARN"
Write-Host ""

Write-Host "============================================"
Write-Host "STEP 2: List Existing Access Keys"
Write-Host "============================================"
Write-Host ""
Write-Host "Current Access Keys for $ZLMCDT_USER :"
aws iam list-access-keys --user-name $ZLMCDT_USER --output table

Write-Host ""
Write-Host "============================================"
Write-Host "STEP 3: Generate New Access Keys"
Write-Host "============================================"
Write-Host ""
Write-Host "To create a new Access Key, run:"
Write-Host ""
Write-Host "  aws iam create-access-key --user-name $ZLMCDT_USER" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  The Secret Access Key is only shown ONCE - copy it immediately!" -ForegroundColor Yellow
Write-Host ""
Write-Host "To delete an old key first (if at limit of 2 keys):"
Write-Host ""
Write-Host "  aws iam delete-access-key --user-name $ZLMCDT_USER --access-key-id <OLD_KEY_ID>" -ForegroundColor Cyan
Write-Host ""

Write-Host "============================================"
Write-Host "STEP 4: Verify API Permissions"
Write-Host "============================================"

# List of required actions to verify
$REQUIRED_ACTIONS = @(
  "eks:CreateCluster",
  "eks:DeleteCluster",
  "eks:DescribeCluster",
  "eks:ListClusters",
  "eks:UpdateClusterConfig",
  "eks:CreateNodegroup",
  "eks:DeleteNodegroup",
  "eks:DescribeNodegroup",
  "ec2:CreateVpc",
  "ec2:DeleteVpc",
  "ec2:CreateSubnet",
  "ec2:DeleteSubnet",
  "ec2:CreateSecurityGroup",
  "ec2:DeleteSecurityGroup",
  "ec2:AuthorizeSecurityGroupIngress",
  "ec2:AuthorizeSecurityGroupEgress",
  "ec2:DescribeVpcs",
  "ec2:DescribeSubnets",
  "ec2:DescribeSecurityGroups",
  "ec2:DescribeInstances",
  "ec2:DescribeNetworkInterfaces",
  "ec2:CreateTags",
  "iam:CreateRole",
  "iam:DeleteRole",
  "iam:AttachRolePolicy",
  "iam:DetachRolePolicy",
  "iam:GetRole",
  "iam:PassRole",
  "iam:CreateServiceLinkedRole",
  "sts:GetCallerIdentity"
)

Write-Host ""
Write-Host "Testing $($REQUIRED_ACTIONS.Count) permissions..."
Write-Host ""

foreach ($action in $REQUIRED_ACTIONS) {
  try {
    $result = aws iam simulate-principal-policy \`
      --policy-source-arn $USER_ARN \`
      --action-names $action \`
      --query 'EvaluationResults[0].EvalDecision' \`
      --output text 2>$null
    
    if ($result -eq "allowed") {
      Write-Host "✅ $action" -ForegroundColor Green
    } else {
      Write-Host "❌ $action - DENIED" -ForegroundColor Red
    }
  } catch {
    Write-Host "❌ $action - ERROR" -ForegroundColor Red
  }
}

Write-Host ""
Write-Host "============================================"
Write-Host "SUMMARY - Copy these to ZL MCDT:"
Write-Host "============================================"
Write-Host "AWS Account ID:    $AWS_ACCOUNT_ID" -ForegroundColor Cyan
Write-Host "Access Key ID:     <from access key list above>" -ForegroundColor Yellow
Write-Host "Secret Access Key: <run create-access-key command above>" -ForegroundColor Yellow
Write-Host "============================================"`,
    },
    creationScripts: {
      bash: `# AWS CLI - Create IAM User for ZL MCDT
# Prerequisites: AWS CLI installed and configured with admin credentials

# Set variables
ZLMCDT_USER="<your IAM user name>"
ZLMCDT_POLICY="<your policy name>"

# Create custom policy with required permissions
cat > /tmp/zlmcdt-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "EKSFullAccess",
      "Effect": "Allow",
      "Action": [
        "eks:*"
      ],
      "Resource": "*"
    },
    {
      "Sid": "EC2ForEKS",
      "Effect": "Allow",
      "Action": [
        "ec2:CreateVpc",
        "ec2:DeleteVpc",
        "ec2:CreateSubnet",
        "ec2:DeleteSubnet",
        "ec2:CreateSecurityGroup",
        "ec2:DeleteSecurityGroup",
        "ec2:AuthorizeSecurityGroup*",
        "ec2:RevokeSecurityGroup*",
        "ec2:Describe*",
        "ec2:CreateTags",
        "ec2:DeleteTags",
        "ec2:CreateInternetGateway",
        "ec2:DeleteInternetGateway",
        "ec2:AttachInternetGateway",
        "ec2:DetachInternetGateway",
        "ec2:CreateRouteTable",
        "ec2:DeleteRouteTable",
        "ec2:CreateRoute",
        "ec2:DeleteRoute",
        "ec2:AssociateRouteTable",
        "ec2:DisassociateRouteTable",
        "ec2:AllocateAddress",
        "ec2:ReleaseAddress",
        "ec2:CreateNatGateway",
        "ec2:DeleteNatGateway",
        "ec2:ModifyVpcAttribute"
      ],
      "Resource": "*"
    },
    {
      "Sid": "IAMForEKS",
      "Effect": "Allow",
      "Action": [
        "iam:CreateRole",
        "iam:DeleteRole",
        "iam:AttachRolePolicy",
        "iam:DetachRolePolicy",
        "iam:PutRolePolicy",
        "iam:DeleteRolePolicy",
        "iam:GetRole",
        "iam:GetRolePolicy",
        "iam:ListRolePolicies",
        "iam:ListAttachedRolePolicies",
        "iam:PassRole",
        "iam:CreateServiceLinkedRole",
        "iam:CreateInstanceProfile",
        "iam:DeleteInstanceProfile",
        "iam:AddRoleToInstanceProfile",
        "iam:RemoveRoleFromInstanceProfile",
        "iam:GetInstanceProfile",
        "iam:TagRole",
        "iam:UntagRole"
      ],
      "Resource": "*"
    },
    {
      "Sid": "STSAccess",
      "Effect": "Allow",
      "Action": [
        "sts:GetCallerIdentity",
        "sts:AssumeRole"
      ],
      "Resource": "*"
    },
    {
      "Sid": "AutoScalingForEKS",
      "Effect": "Allow",
      "Action": [
        "autoscaling:*"
      ],
      "Resource": "*"
    },
    {
      "Sid": "CloudFormation",
      "Effect": "Allow",
      "Action": [
        "cloudformation:*"
      ],
      "Resource": "*"
    }
  ]
}
EOF

# Create the IAM policy
aws iam create-policy \\
  --policy-name \${ZLMCDT_POLICY} \\
  --policy-document file:///tmp/zlmcdt-policy.json \\
  --description "Policy for ZL MCDT EKS deployments"

# Get AWS Account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Create IAM user
aws iam create-user --user-name \${ZLMCDT_USER}

# Attach the custom policy
aws iam attach-user-policy \\
  --user-name \${ZLMCDT_USER} \\
  --policy-arn arn:aws:iam::\${AWS_ACCOUNT_ID}:policy/\${ZLMCDT_POLICY}

# Attach AWS managed policies for EKS
aws iam attach-user-policy \\
  --user-name \${ZLMCDT_USER} \\
  --policy-arn arn:aws:iam::aws:policy/AmazonEKSClusterPolicy

# Create access keys
aws iam create-access-key --user-name \${ZLMCDT_USER}

# Output will contain AccessKeyId and SecretAccessKey
# Save these securely - they will only be shown once!

echo "Done! Save the Access Key ID and Secret Access Key above."
echo "AWS Account ID: \${AWS_ACCOUNT_ID}"`,
      powershell: `# AWS CLI (PowerShell) - Create IAM User for ZL MCDT
# Prerequisites: AWS CLI installed and configured with admin credentials

# Set variables
$ZLMCDT_USER = "<your IAM user name>"
$ZLMCDT_POLICY = "<your policy name>"

# Create policy document
$policyDocument = @'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "EKSFullAccess",
      "Effect": "Allow",
      "Action": ["eks:*"],
      "Resource": "*"
    },
    {
      "Sid": "EC2ForEKS",
      "Effect": "Allow",
      "Action": [
        "ec2:CreateVpc", "ec2:DeleteVpc", "ec2:CreateSubnet", "ec2:DeleteSubnet",
        "ec2:CreateSecurityGroup", "ec2:DeleteSecurityGroup",
        "ec2:AuthorizeSecurityGroup*", "ec2:RevokeSecurityGroup*",
        "ec2:Describe*", "ec2:CreateTags", "ec2:DeleteTags",
        "ec2:CreateInternetGateway", "ec2:DeleteInternetGateway",
        "ec2:AttachInternetGateway", "ec2:DetachInternetGateway",
        "ec2:CreateRouteTable", "ec2:DeleteRouteTable",
        "ec2:CreateRoute", "ec2:DeleteRoute",
        "ec2:AssociateRouteTable", "ec2:DisassociateRouteTable",
        "ec2:AllocateAddress", "ec2:ReleaseAddress",
        "ec2:CreateNatGateway", "ec2:DeleteNatGateway", "ec2:ModifyVpcAttribute"
      ],
      "Resource": "*"
    },
    {
      "Sid": "IAMForEKS",
      "Effect": "Allow",
      "Action": [
        "iam:CreateRole", "iam:DeleteRole", "iam:AttachRolePolicy",
        "iam:DetachRolePolicy", "iam:PutRolePolicy", "iam:DeleteRolePolicy",
        "iam:GetRole", "iam:GetRolePolicy", "iam:ListRolePolicies",
        "iam:ListAttachedRolePolicies", "iam:PassRole",
        "iam:CreateServiceLinkedRole", "iam:CreateInstanceProfile",
        "iam:DeleteInstanceProfile", "iam:AddRoleToInstanceProfile",
        "iam:RemoveRoleFromInstanceProfile", "iam:GetInstanceProfile",
        "iam:TagRole", "iam:UntagRole"
      ],
      "Resource": "*"
    },
    {
      "Sid": "STSAccess",
      "Effect": "Allow",
      "Action": ["sts:GetCallerIdentity", "sts:AssumeRole"],
      "Resource": "*"
    },
    {
      "Sid": "AutoScalingForEKS",
      "Effect": "Allow",
      "Action": ["autoscaling:*"],
      "Resource": "*"
    },
    {
      "Sid": "CloudFormation",
      "Effect": "Allow",
      "Action": ["cloudformation:*"],
      "Resource": "*"
    }
  ]
}
'@

# Save policy to temp file
$policyDocument | Out-File -FilePath "$env:TEMP\\zlmcdt-policy.json" -Encoding UTF8

# Create the IAM policy
aws iam create-policy \`
  --policy-name $ZLMCDT_POLICY \`
  --policy-document "file://$env:TEMP\\zlmcdt-policy.json" \`
  --description "Policy for ZL MCDT EKS deployments"

# Get AWS Account ID
$AWS_ACCOUNT_ID = aws sts get-caller-identity --query Account --output text

# Create IAM user
aws iam create-user --user-name $ZLMCDT_USER

# Attach the custom policy
aws iam attach-user-policy \`
  --user-name $ZLMCDT_USER \`
  --policy-arn "arn:aws:iam::$($AWS_ACCOUNT_ID):policy/$ZLMCDT_POLICY"

# Attach AWS managed policies
aws iam attach-user-policy \`
  --user-name $ZLMCDT_USER \`
  --policy-arn "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"

# Create access keys
$keys = aws iam create-access-key --user-name $ZLMCDT_USER | ConvertFrom-Json

Write-Host "============================================"
Write-Host "SAVE THESE CREDENTIALS - SHOWN ONLY ONCE!"
Write-Host "============================================"
Write-Host "AWS Account ID: $AWS_ACCOUNT_ID"
Write-Host "Access Key ID: $($keys.AccessKey.AccessKeyId)"
Write-Host "Secret Access Key: $($keys.AccessKey.SecretAccessKey)"`,
    },
  },
  azure: {
    name: 'Microsoft Azure',
    color: '#0078D4',
    accountType: 'Service Principal',
    description: 'ZL MCDT creates AKS clusters with system-assigned managed identities for secure, credential-less node pool management.',
    docUrl: 'https://learn.microsoft.com/en-us/azure/aks/concepts-identity',
    credentialsNeeded: [
      'Subscription ID',
      'Tenant ID (Directory ID)',
      'Client ID (Application ID)',
      'Client Secret',
    ],
    minimumPolicies: [
      {
        name: 'Contributor',
        type: 'Azure Built-in Role',
        description: 'Full access to manage resources, but not assign roles',
      },
      {
        name: 'User Access Administrator',
        type: 'Azure Built-in Role (Optional)',
        description: 'Required only if assigning RBAC roles to AKS identity',
      },
    ],
    iamPermissions: [
      'Microsoft.ContainerService/managedClusters/read',
      'Microsoft.ContainerService/managedClusters/write',
      'Microsoft.ContainerService/managedClusters/delete',
      'Microsoft.ContainerService/managedClusters/listClusterUserCredential/action',
      'Microsoft.Resources/subscriptions/resourceGroups/read',
      'Microsoft.Resources/subscriptions/resourceGroups/write',
      'Microsoft.Network/virtualNetworks/read',
      'Microsoft.Network/virtualNetworks/write',
      'Microsoft.Network/virtualNetworks/subnets/join/action',
      'Microsoft.Network/publicIPAddresses/read',
      'Microsoft.Network/publicIPAddresses/write',
      'Microsoft.Network/loadBalancers/read',
      'Microsoft.Network/loadBalancers/write',
      'Microsoft.Compute/virtualMachineScaleSets/read',
      'Microsoft.Compute/virtualMachineScaleSets/write',
    ],
    recommendations: [
      'Create a dedicated Service Principal for ZL MCDT deployments',
      'Limit the scope to specific resource groups when possible',
      'Use client certificate authentication for higher security',
      'Rotate client secrets regularly (ZL MCDT supports secret rotation)',
    ],
    verificationScripts: {
      bash: `# Azure - Verify Permissions & Get Credentials
# This script checks permissions and retrieves Client ID/Secret
# NOTE: This works for Service Principals (App Registrations) only.
#       Managed Identities do not have client secrets.

SP_NAME="<your service principal name>"
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
TENANT_ID=$(az account show --query tenantId -o tsv)

echo "============================================"
echo "STEP 1: Retrieve Service Principal Credentials"
echo "============================================"

# Get the Client ID (Application ID)
CLIENT_ID=$(az ad sp list --display-name "\${SP_NAME}" --query "[0].appId" -o tsv)

if [ -z "\${CLIENT_ID}" ]; then
  echo "❌ Service Principal '\${SP_NAME}' not found!"
  echo "   Run the creation script first."
  exit 1
fi

echo ""
echo "✅ Service Principal Found!"
echo ""
echo "Subscription ID: \${SUBSCRIPTION_ID}"
echo "Tenant ID:       \${TENANT_ID}"
echo "Client ID:       \${CLIENT_ID}"
echo ""

# Get the service principal's object ID (needed for other operations)
SP_OBJECT_ID=$(az ad sp list --display-name "\${SP_NAME}" --query "[0].id" -o tsv)

echo "============================================"
echo "STEP 2: Generate New Client Secret"
echo "============================================"
echo ""

echo "To generate a new Client Secret, run:"
echo ""
echo "  az ad sp credential reset --id \${CLIENT_ID} --append"
echo ""
echo "Or to create a secret with specific expiry (2 years):"
echo ""
echo "  az ad sp credential reset --id \${CLIENT_ID} --years 2 --append"
echo ""
echo "⚠️  The secret is only shown ONCE - copy it immediately!"

echo ""
echo "============================================"
echo "STEP 3: Verify API Permissions"
echo "============================================"

# Required Azure permissions for ZL MCDT
REQUIRED_PERMISSIONS=(
  "Microsoft.ContainerService/managedClusters/read"
  "Microsoft.ContainerService/managedClusters/write"
  "Microsoft.ContainerService/managedClusters/delete"
  "Microsoft.ContainerService/managedClusters/listClusterUserCredential/action"
  "Microsoft.Resources/subscriptions/resourceGroups/read"
  "Microsoft.Resources/subscriptions/resourceGroups/write"
  "Microsoft.Network/virtualNetworks/read"
  "Microsoft.Network/virtualNetworks/write"
  "Microsoft.Network/virtualNetworks/subnets/join/action"
  "Microsoft.Network/publicIPAddresses/read"
  "Microsoft.Network/publicIPAddresses/write"
  "Microsoft.Network/loadBalancers/read"
  "Microsoft.Network/loadBalancers/write"
  "Microsoft.Compute/virtualMachineScaleSets/read"
  "Microsoft.Compute/virtualMachineScaleSets/write"
)

# Get all actions from assigned roles
echo ""
echo "Fetching assigned roles..."
ROLES=$(az role assignment list --assignee "\${SP_OBJECT_ID}" --query "[].roleDefinitionName" -o tsv)

# Get all actions from the Contributor role (or other assigned roles)
ALL_ACTIONS=$(az role definition list --name "Contributor" --query "[0].permissions[0].actions" -o tsv)

echo ""
echo "Assigned Roles: \${ROLES}"
echo ""
echo "Checking specific permissions..."
echo ""

for perm in "\${REQUIRED_PERMISSIONS[@]}"; do
  # Check if permission matches (including wildcards like *)
  if echo "\${ALL_ACTIONS}" | grep -qE "^\*$|^\${perm%/*}/\*$|\${perm}"; then
    echo "✅ \${perm}"
  else
    echo "❌ \${perm} - Not found in assigned roles"
  fi
done

echo ""
echo "============================================"
echo "SUMMARY - Copy these to ZL MCDT:"
echo "============================================"
echo "Subscription ID: \${SUBSCRIPTION_ID}"
echo "Tenant ID:       \${TENANT_ID}"
echo "Client ID:       \${CLIENT_ID}"
echo "Client Secret:   <run the command above to generate>"
echo "============================================"`,
      powershell: `# Azure - Verify Permissions & Get Credentials (PowerShell)
# This script checks permissions and retrieves Client ID/Secret
# NOTE: This works for Service Principals (App Registrations) only.
#       Managed Identities do not have client secrets.

$SP_NAME = "<your service principal name>"
$SUBSCRIPTION_ID = az account show --query id -o tsv
$TENANT_ID = az account show --query tenantId -o tsv

Write-Host "============================================"
Write-Host "STEP 1: Retrieve Service Principal Credentials"
Write-Host "============================================"

# Get the Client ID (Application ID)
$CLIENT_ID = az ad sp list --display-name $SP_NAME --query "[0].appId" -o tsv

if (-not $CLIENT_ID) {
  Write-Host "❌ Service Principal '$SP_NAME' not found!" -ForegroundColor Red
  Write-Host "   Run the creation script first."
  exit 1
}

Write-Host ""
Write-Host "✅ Service Principal Found!" -ForegroundColor Green
Write-Host ""
Write-Host "Subscription ID: $SUBSCRIPTION_ID"
Write-Host "Tenant ID:       $TENANT_ID"
Write-Host "Client ID:       $CLIENT_ID"
Write-Host ""

# Get the service principal's object ID
$SP_OBJECT_ID = az ad sp list --display-name $SP_NAME --query "[0].id" -o tsv

Write-Host "============================================"
Write-Host "STEP 2: Generate New Client Secret"
Write-Host "============================================"
Write-Host ""

Write-Host "To generate a new Client Secret, run:"
Write-Host ""
Write-Host "  az ad sp credential reset --id $CLIENT_ID --append" -ForegroundColor Cyan
Write-Host ""
Write-Host "Or to create a secret with specific expiry (2 years):"
Write-Host ""
Write-Host "  az ad sp credential reset --id $CLIENT_ID --years 2 --append" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  The secret is only shown ONCE - copy it immediately!" -ForegroundColor Yellow

Write-Host ""
Write-Host "============================================"
Write-Host "STEP 3: Verify API Permissions"
Write-Host "============================================"

# Required Azure permissions for ZL MCDT
$REQUIRED_PERMISSIONS = @(
  "Microsoft.ContainerService/managedClusters/read",
  "Microsoft.ContainerService/managedClusters/write",
  "Microsoft.ContainerService/managedClusters/delete",
  "Microsoft.ContainerService/managedClusters/listClusterUserCredential/action",
  "Microsoft.Resources/subscriptions/resourceGroups/read",
  "Microsoft.Resources/subscriptions/resourceGroups/write",
  "Microsoft.Network/virtualNetworks/read",
  "Microsoft.Network/virtualNetworks/write",
  "Microsoft.Network/virtualNetworks/subnets/join/action",
  "Microsoft.Network/publicIPAddresses/read",
  "Microsoft.Network/publicIPAddresses/write",
  "Microsoft.Network/loadBalancers/read",
  "Microsoft.Network/loadBalancers/write",
  "Microsoft.Compute/virtualMachineScaleSets/read",
  "Microsoft.Compute/virtualMachineScaleSets/write"
)

# Get assigned roles
Write-Host ""
Write-Host "Fetching assigned roles..."
$assignments = az role assignment list --assignee $SP_OBJECT_ID | ConvertFrom-Json
$roleNames = $assignments | ForEach-Object { $_.roleDefinitionName }

Write-Host ""
Write-Host "Assigned Roles: $($roleNames -join ', ')"
Write-Host ""

# Get actions from Contributor role
$contributorDef = az role definition list --name "Contributor" | ConvertFrom-Json
$allActions = $contributorDef[0].permissions[0].actions

Write-Host "Checking specific permissions..."
Write-Host ""

foreach ($perm in $REQUIRED_PERMISSIONS) {
  $found = $false
  foreach ($action in $allActions) {
    if ($action -eq "*" -or $action -eq $perm -or ($action.EndsWith("/*") -and $perm.StartsWith($action.TrimEnd("/*")))) {
      $found = $true
      break
    }
  }
  
  if ($found) {
    Write-Host "✅ $perm" -ForegroundColor Green
  } else {
    Write-Host "❌ $perm - Not found" -ForegroundColor Red
  }
}

Write-Host ""
Write-Host "============================================"
Write-Host "SUMMARY - Copy these to ZL MCDT:"
Write-Host "============================================"
Write-Host "Subscription ID: $SUBSCRIPTION_ID" -ForegroundColor Cyan
Write-Host "Tenant ID:       $TENANT_ID" -ForegroundColor Cyan
Write-Host "Client ID:       $CLIENT_ID" -ForegroundColor Cyan
Write-Host "Client Secret:   <run the command above to generate>" -ForegroundColor Yellow
Write-Host "============================================"`,
    },
    creationScripts: {
      bash: `# Azure CLI - Create Service Principal for ZL MCDT
# Prerequisites: Azure CLI installed and logged in (az login)

# Set variables
SP_NAME="<your service principal name>"
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

# Create the service principal with Contributor role
# This command outputs the credentials - save them!
az ad sp create-for-rbac \\
  --name "\${SP_NAME}" \\
  --role "Contributor" \\
  --scopes "/subscriptions/\${SUBSCRIPTION_ID}" \\
  --years 2

# The output will show:
# {
#   "appId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",      <- Client ID
#   "displayName": "<your-sp-name>",
#   "password": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",   <- Client Secret
#   "tenant": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"      <- Tenant ID
# }

# Get Tenant ID separately if needed
TENANT_ID=$(az account show --query tenantId -o tsv)

echo "============================================"
echo "Subscription ID: \${SUBSCRIPTION_ID}"
echo "Tenant ID: \${TENANT_ID}"
echo "============================================"

# Optional: Add User Access Administrator role if you need to assign RBAC roles
# az role assignment create \\
#   --assignee "\${SP_NAME}" \\
#   --role "User Access Administrator" \\
#   --scope "/subscriptions/\${SUBSCRIPTION_ID}"

# Verify the service principal (use display-name filter)
az ad sp list --display-name "\${SP_NAME}" --query "[0].{appId:appId, displayName:displayName}"`,
      powershell: `# Azure CLI (PowerShell) - Create Service Principal for ZL MCDT
# Prerequisites: Azure CLI installed and logged in (az login)

# Set variables
$SP_NAME = "<your service principal name>"
$SUBSCRIPTION_ID = az account show --query id -o tsv

# Create the service principal with Contributor role
$spOutput = az ad sp create-for-rbac \`
  --name $SP_NAME \`
  --role "Contributor" \`
  --scopes "/subscriptions/$SUBSCRIPTION_ID" \`
  --years 2 | ConvertFrom-Json

# Get Tenant ID
$TENANT_ID = az account show --query tenantId -o tsv

Write-Host "============================================"
Write-Host "SAVE THESE CREDENTIALS - SHOWN ONLY ONCE!"
Write-Host "============================================"
Write-Host "Subscription ID: $SUBSCRIPTION_ID"
Write-Host "Tenant ID: $TENANT_ID"
Write-Host "Client ID (appId): $($spOutput.appId)"
Write-Host "Client Secret: $($spOutput.password)"
Write-Host "============================================"

# Optional: Add User Access Administrator role if you need to assign RBAC roles
# az role assignment create \`
#   --assignee $SP_NAME \`
#   --role "User Access Administrator" \`
#   --scope "/subscriptions/$SUBSCRIPTION_ID"

# Verify the service principal using the appId from the output
az ad sp show --id $($spOutput.appId) --query "{appId:appId, displayName:displayName}"`,
    },
  },
  gcp: {
    name: 'Google Cloud Platform (GCP)',
    color: '#4285F4',
    accountType: 'Service Account',
    description: 'ZL MCDT creates GKE clusters with configurable node pools and Workload Identity support.',
    docUrl: 'https://cloud.google.com/kubernetes-engine/docs/concepts/access-control',
    credentialsNeeded: [
      'Project ID',
      'Service Account JSON Key File',
    ],
    minimumPolicies: [
      {
        name: 'Kubernetes Engine Admin',
        type: 'GCP Predefined Role',
        description: 'Full management of GKE clusters and their Kubernetes API objects',
      },
      {
        name: 'Compute Admin',
        type: 'GCP Predefined Role',
        description: 'Full control of Compute Engine resources (for node pools)',
      },
      {
        name: 'Service Account User',
        type: 'GCP Predefined Role',
        description: 'Run operations as the service account',
      },
    ],
    iamPermissions: [
      'container.clusters.create',
      'container.clusters.delete',
      'container.clusters.get',
      'container.clusters.list',
      'container.clusters.update',
      'container.operations.get',
      'container.operations.list',
      'compute.networks.get',
      'compute.networks.create',
      'compute.subnetworks.get',
      'compute.subnetworks.create',
      'compute.subnetworks.use',
      'compute.instances.create',
      'compute.instances.delete',
      'compute.disks.create',
      'iam.serviceAccounts.actAs',
    ],
    recommendations: [
      'Create a dedicated service account for ZL MCDT',
      'Download the JSON key and upload it securely',
      'Consider Workload Identity for production clusters',
      'Enable audit logging for the GCP project',
    ],
    verificationScripts: {
      bash: `# GCP - Verify Specific API Permissions
# This script checks each required permission for the service account

SA_NAME="<your service account name>"
PROJECT_ID=$(gcloud config get-value project)
SA_EMAIL="\${SA_NAME}@\${PROJECT_ID}.iam.gserviceaccount.com"

# Required GCP permissions for ZL MCDT
REQUIRED_PERMISSIONS=(
  "container.clusters.create"
  "container.clusters.delete"
  "container.clusters.get"
  "container.clusters.list"
  "container.clusters.update"
  "container.operations.get"
  "container.operations.list"
  "compute.networks.get"
  "compute.networks.create"
  "compute.subnetworks.get"
  "compute.subnetworks.create"
  "compute.subnetworks.use"
  "compute.instances.create"
  "compute.instances.delete"
  "compute.disks.create"
  "iam.serviceAccounts.actAs"
)

echo "============================================"
echo "Verifying permissions for: \${SA_EMAIL}"
echo "============================================"

# Get all roles assigned to the service account
echo "Fetching assigned roles..."
ROLES=$(gcloud projects get-iam-policy \${PROJECT_ID} \\
  --flatten="bindings[].members" \\
  --filter="bindings.members:serviceAccount:\${SA_EMAIL}" \\
  --format="value(bindings.role)")

echo ""
echo "Assigned Roles:"
echo "\${ROLES}"
echo ""
echo "Checking specific permissions..."
echo ""

# For each role, get its permissions and check against required
ALL_PERMS=""
for role in \${ROLES}; do
  role_perms=$(gcloud iam roles describe \${role} --format="value(includedPermissions)" 2>/dev/null || echo "")
  ALL_PERMS="\${ALL_PERMS} \${role_perms}"
done

for perm in "\${REQUIRED_PERMISSIONS[@]}"; do
  if echo "\${ALL_PERMS}" | grep -q "\${perm}"; then
    echo "✅ \${perm}"
  else
    echo "❌ \${perm} - Not found in assigned roles"
  fi
done

echo ""
echo "============================================"
echo "Verification complete!"
echo "============================================"`,
      powershell: `# GCP - Verify Specific API Permissions (PowerShell)
# This script checks each required permission for the service account

$SA_NAME = "<your service account name>"
$PROJECT_ID = gcloud config get-value project
$SA_EMAIL = "$SA_NAME@$PROJECT_ID.iam.gserviceaccount.com"

# Required GCP permissions for ZL MCDT
$REQUIRED_PERMISSIONS = @(
  "container.clusters.create",
  "container.clusters.delete",
  "container.clusters.get",
  "container.clusters.list",
  "container.clusters.update",
  "container.operations.get",
  "container.operations.list",
  "compute.networks.get",
  "compute.networks.create",
  "compute.subnetworks.get",
  "compute.subnetworks.create",
  "compute.subnetworks.use",
  "compute.instances.create",
  "compute.instances.delete",
  "compute.disks.create",
  "iam.serviceAccounts.actAs"
)

Write-Host "============================================"
Write-Host "Verifying permissions for: $SA_EMAIL"
Write-Host "============================================"

# Get all roles assigned to the service account
Write-Host "Fetching assigned roles..."
$rolesOutput = gcloud projects get-iam-policy $PROJECT_ID \`
  --flatten="bindings[].members" \`
  --filter="bindings.members:serviceAccount:$SA_EMAIL" \`
  --format="value(bindings.role)"

$roles = $rolesOutput -split "\\n" | Where-Object { $_ }

Write-Host ""
Write-Host "Assigned Roles:"
$roles | ForEach-Object { Write-Host "  $_" }
Write-Host ""

# Collect all permissions from assigned roles
$allPerms = @()
foreach ($role in $roles) {
  try {
    $rolePerms = gcloud iam roles describe $role --format="value(includedPermissions)" 2>$null
    $allPerms += $rolePerms -split ";"
  } catch {}
}

Write-Host "Checking specific permissions..."
Write-Host ""

foreach ($perm in $REQUIRED_PERMISSIONS) {
  if ($allPerms -contains $perm) {
    Write-Host "✅ $perm" -ForegroundColor Green
  } else {
    Write-Host "❌ $perm - Not found" -ForegroundColor Red
  }
}

Write-Host ""
Write-Host "============================================"
Write-Host "Verification complete!"
Write-Host "============================================"`,
    },
    creationScripts: {
      bash: `# Google Cloud CLI - Create Service Account for ZL MCDT
# Prerequisites: gcloud CLI installed and authenticated (gcloud auth login)

# Set variables
SA_NAME="<your service account name>"
PROJECT_ID=$(gcloud config get-value project)
SA_EMAIL="\${SA_NAME}@\${PROJECT_ID}.iam.gserviceaccount.com"

# Create the service account
gcloud iam service-accounts create \${SA_NAME} \\
  --display-name="ZL MCDT Kubernetes Deployer" \\
  --description="Service account for ZL MCDT GKE cluster deployments"

# Grant required roles
echo "Granting Kubernetes Engine Admin role..."
gcloud projects add-iam-policy-binding \${PROJECT_ID} \\
  --member="serviceAccount:\${SA_EMAIL}" \\
  --role="roles/container.admin"

echo "Granting Compute Admin role..."
gcloud projects add-iam-policy-binding \${PROJECT_ID} \\
  --member="serviceAccount:\${SA_EMAIL}" \\
  --role="roles/compute.admin"

echo "Granting Service Account User role..."
gcloud projects add-iam-policy-binding \${PROJECT_ID} \\
  --member="serviceAccount:\${SA_EMAIL}" \\
  --role="roles/iam.serviceAccountUser"

echo "Granting Storage Admin role (for terraform state if using GCS)..."
gcloud projects add-iam-policy-binding \${PROJECT_ID} \\
  --member="serviceAccount:\${SA_EMAIL}" \\
  --role="roles/storage.admin"

# Create and download JSON key
KEY_FILE="./zlaws-\${PROJECT_ID}-key.json"
gcloud iam service-accounts keys create \${KEY_FILE} \\
  --iam-account=\${SA_EMAIL}

echo "============================================"
echo "Service Account Created Successfully!"
echo "============================================"
echo "Project ID: \${PROJECT_ID}"
echo "Service Account Email: \${SA_EMAIL}"
echo "Key File: \${KEY_FILE}"
echo "============================================"
echo ""
echo "IMPORTANT: Store the key file securely!"
echo "Upload the JSON key file contents to ZL MCDT."`,
      powershell: `# Google Cloud CLI (PowerShell) - Create Service Account for ZL MCDT
# Prerequisites: gcloud CLI installed and authenticated (gcloud auth login)

# Set variables
$SA_NAME = "<your service account name>"
$PROJECT_ID = gcloud config get-value project
$SA_EMAIL = "$SA_NAME@$PROJECT_ID.iam.gserviceaccount.com"

# Create the service account
gcloud iam service-accounts create $SA_NAME \`
  --display-name="ZL MCDT Kubernetes Deployer" \`
  --description="Service account for ZL MCDT GKE cluster deployments"

# Grant required roles
Write-Host "Granting Kubernetes Engine Admin role..."
gcloud projects add-iam-policy-binding $PROJECT_ID \`
  --member="serviceAccount:$SA_EMAIL" \`
  --role="roles/container.admin"

Write-Host "Granting Compute Admin role..."
gcloud projects add-iam-policy-binding $PROJECT_ID \`
  --member="serviceAccount:$SA_EMAIL" \`
  --role="roles/compute.admin"

Write-Host "Granting Service Account User role..."
gcloud projects add-iam-policy-binding $PROJECT_ID \`
  --member="serviceAccount:$SA_EMAIL" \`
  --role="roles/iam.serviceAccountUser"

Write-Host "Granting Storage Admin role (for terraform state if using GCS)..."
gcloud projects add-iam-policy-binding $PROJECT_ID \`
  --member="serviceAccount:$SA_EMAIL" \`
  --role="roles/storage.admin"

# Create and download JSON key
$KEY_FILE = "./zlaws-$PROJECT_ID-key.json"
gcloud iam service-accounts keys create $KEY_FILE \`
  --iam-account=$SA_EMAIL

Write-Host "============================================"
Write-Host "Service Account Created Successfully!"
Write-Host "============================================"
Write-Host "Project ID: $PROJECT_ID"
Write-Host "Service Account Email: $SA_EMAIL"
Write-Host "Key File: $KEY_FILE"
Write-Host "============================================"
Write-Host ""
Write-Host "IMPORTANT: Store the key file securely!"
Write-Host "Upload the JSON key file contents to ZL MCDT."`,
    },
  },
  digitalocean: {
    name: 'DigitalOcean',
    color: '#0080FF',
    accountType: 'Personal Access Token',
    description: 'ZL MCDT creates DOKS (DigitalOcean Kubernetes Service) clusters with managed node pools.',
    docUrl: 'https://docs.digitalocean.com/reference/api/api-reference/',
    credentialsNeeded: [
      'Personal Access Token (with read/write scope)',
    ],
    minimumPolicies: [
      {
        name: 'Read/Write Access Token',
        type: 'API Token',
        description: 'Full access to manage Kubernetes clusters and droplets',
      },
    ],
    iamPermissions: [
      'kubernetes:create',
      'kubernetes:read',
      'kubernetes:update',
      'kubernetes:delete',
      'droplet:create',
      'droplet:read',
      'droplet:delete',
      'vpc:read',
      'vpc:create',
      'load_balancer:read',
      'load_balancer:create',
      'load_balancer:delete',
    ],
    recommendations: [
      'Generate a dedicated token for ZL MCDT (not your main account token)',
      'Use read/write scope - read-only tokens cannot create clusters',
      'Tokens do not expire - rotate them periodically for security',
      'Consider using DigitalOcean Spaces for Terraform state',
    ],
    verificationScripts: {
      bash: `# DigitalOcean - Verify Token Permissions
# Uses doctl CLI to verify your token has the required access

# Prerequisites: doctl installed and authenticated
# Install: https://docs.digitalocean.com/reference/doctl/how-to/install/

echo "============================================"
echo "Verifying DigitalOcean Token Permissions"
echo "============================================"

# Verify account access
echo ""
echo "Testing account access..."
if doctl account get > /dev/null 2>&1; then
  echo "✅ Account access verified"
  doctl account get --format Email,Status
else
  echo "❌ Account access failed - check your token"
  exit 1
fi

# Test Kubernetes permissions
echo ""
echo "Testing Kubernetes permissions..."
if doctl kubernetes cluster list > /dev/null 2>&1; then
  echo "✅ kubernetes:read - Can list clusters"
else
  echo "❌ kubernetes:read - Cannot list clusters"
fi

# Test Droplet permissions
echo ""
echo "Testing Droplet permissions..."
if doctl compute droplet list > /dev/null 2>&1; then
  echo "✅ droplet:read - Can list droplets"
else
  echo "❌ droplet:read - Cannot list droplets"
fi

# Test VPC permissions
echo ""
echo "Testing VPC permissions..."
if doctl vpc list > /dev/null 2>&1; then
  echo "✅ vpc:read - Can list VPCs"
else
  echo "❌ vpc:read - Cannot list VPCs"
fi

# Test Load Balancer permissions
echo ""
echo "Testing Load Balancer permissions..."
if doctl compute load-balancer list > /dev/null 2>&1; then
  echo "✅ load_balancer:read - Can list load balancers"
else
  echo "❌ load_balancer:read - Cannot list load balancers"
fi

echo ""
echo "============================================"
echo "Note: Write permissions can only be verified"
echo "by attempting to create resources."
echo "============================================"
echo ""
echo "If all read tests pass with a Read/Write token,"
echo "write permissions should also be available."
echo "============================================"`,
      powershell: `# DigitalOcean - Verify Token Permissions (PowerShell)
# Uses doctl CLI to verify your token has the required access

# Prerequisites: doctl installed and authenticated
# Install: scoop install doctl  OR  choco install doctl

Write-Host "============================================"
Write-Host "Verifying DigitalOcean Token Permissions"
Write-Host "============================================"

# Verify account access
Write-Host ""
Write-Host "Testing account access..."
try {
  $account = doctl account get --format Email,Status --no-header 2>$null
  if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Account access verified" -ForegroundColor Green
    Write-Host "   $account"
  } else {
    throw "Failed"
  }
} catch {
  Write-Host "❌ Account access failed - check your token" -ForegroundColor Red
  exit 1
}

# Test Kubernetes permissions
Write-Host ""
Write-Host "Testing Kubernetes permissions..."
try {
  doctl kubernetes cluster list 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ kubernetes:read - Can list clusters" -ForegroundColor Green
  } else { throw }
} catch {
  Write-Host "❌ kubernetes:read - Cannot list clusters" -ForegroundColor Red
}

# Test Droplet permissions
Write-Host ""
Write-Host "Testing Droplet permissions..."
try {
  doctl compute droplet list 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ droplet:read - Can list droplets" -ForegroundColor Green
  } else { throw }
} catch {
  Write-Host "❌ droplet:read - Cannot list droplets" -ForegroundColor Red
}

# Test VPC permissions
Write-Host ""
Write-Host "Testing VPC permissions..."
try {
  doctl vpc list 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ vpc:read - Can list VPCs" -ForegroundColor Green
  } else { throw }
} catch {
  Write-Host "❌ vpc:read - Cannot list VPCs" -ForegroundColor Red
}

# Test Load Balancer permissions
Write-Host ""
Write-Host "Testing Load Balancer permissions..."
try {
  doctl compute load-balancer list 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ load_balancer:read - Can list load balancers" -ForegroundColor Green
  } else { throw }
} catch {
  Write-Host "❌ load_balancer:read - Cannot list load balancers" -ForegroundColor Red
}

Write-Host ""
Write-Host "============================================"
Write-Host "Note: Write permissions can only be verified"
Write-Host "by attempting to create resources."
Write-Host "============================================"`,
    },
    creationScripts: {
      bash: `# DigitalOcean - Personal Access Token Creation
# DigitalOcean tokens must be created via the web console

# Step-by-Step Instructions:
# 1. Log in to https://cloud.digitalocean.com
# 2. Click on "API" in the left sidebar
# 3. Click "Generate New Token"
# 4. Name: "<your token name>"
# 5. Select "Read" AND "Write" scopes
# 6. Click "Generate Token"
# 7. COPY THE TOKEN IMMEDIATELY - it will only be shown once!

# Optional: Verify token with doctl CLI
# Install doctl: https://docs.digitalocean.com/reference/doctl/how-to/install/

# Authenticate with your new token
doctl auth init
# Enter your token when prompted

# Verify authentication
doctl account get

# List available Kubernetes options
doctl kubernetes options regions
doctl kubernetes options sizes
doctl kubernetes options versions

echo "============================================"
echo "Token verified successfully!"
echo "Copy your token to ZL MCDT credentials."
echo "============================================"`,
      powershell: `# DigitalOcean - Personal Access Token Creation
# DigitalOcean tokens must be created via the web console

# Step-by-Step Instructions:
# 1. Log in to https://cloud.digitalocean.com
# 2. Click on "API" in the left sidebar
# 3. Click "Generate New Token"
# 4. Name: "<your token name>"
# 5. Select "Read" AND "Write" scopes
# 6. Click "Generate Token"
# 7. COPY THE TOKEN IMMEDIATELY - it will only be shown once!

# Optional: Verify token with doctl CLI
# Install doctl: https://docs.digitalocean.com/reference/doctl/how-to/install/
# Windows: scoop install doctl  OR  choco install doctl

# Authenticate with your new token
doctl auth init
# Enter your token when prompted

# Verify authentication
doctl account get

# List available Kubernetes options
doctl kubernetes options regions
doctl kubernetes options sizes
doctl kubernetes options versions

Write-Host "============================================"
Write-Host "Token verified successfully!"
Write-Host "Copy your token to ZL MCDT credentials."
Write-Host "============================================"`,
    },
  },
  linode: {
    name: 'Linode (Akamai)',
    color: '#00A95C',
    accountType: 'Personal Access Token',
    description: 'ZL MCDT creates LKE (Linode Kubernetes Engine) clusters with high-availability control planes.',
    docUrl: 'https://www.linode.com/docs/api/',
    credentialsNeeded: [
      'Personal Access Token (with Kubernetes and Linodes scopes)',
    ],
    minimumPolicies: [
      {
        name: 'Kubernetes Read/Write',
        type: 'API Token Scope',
        description: 'Manage LKE clusters',
      },
      {
        name: 'Linodes Read/Write',
        type: 'API Token Scope',
        description: 'Manage Linode instances for node pools',
      },
    ],
    iamPermissions: [
      'lke:read_write (Kubernetes)',
      'linodes:read_write (Linodes)',
      'nodebalancers:read_write (NodeBalancers)',
      'volumes:read_write (Block Storage)',
      'ips:read_only (Networking)',
    ],
    recommendations: [
      'Generate a token with minimum required scopes',
      'Set token expiry (recommended: 6 months)',
      'Use a separate token for each deployment environment',
      'Enable two-factor authentication on your Linode account',
    ],
    verificationScripts: {
      bash: `# Linode - Verify Token Permissions
# Uses linode-cli to verify your token has the required scopes

# Prerequisites: linode-cli installed and configured
# Install: pip install linode-cli

echo "============================================"
echo "Verifying Linode Token Permissions"
echo "============================================"

# Verify account access
echo ""
echo "Testing account access..."
if linode-cli account view > /dev/null 2>&1; then
  echo "✅ Account access verified"
  linode-cli account view --format "email,balance"
else
  echo "❌ Account access failed - check your token"
  exit 1
fi

# Test Kubernetes (LKE) permissions
echo ""
echo "Testing Kubernetes (LKE) permissions..."
if linode-cli lke clusters-list > /dev/null 2>&1; then
  echo "✅ lke:read_write - Can list LKE clusters"
else
  echo "❌ lke:read_write - Cannot access LKE"
fi

# Test Linodes permissions
echo ""
echo "Testing Linodes permissions..."
if linode-cli linodes list > /dev/null 2>&1; then
  echo "✅ linodes:read_write - Can list Linodes"
else
  echo "❌ linodes:read_write - Cannot access Linodes"
fi

# Test NodeBalancers permissions
echo ""
echo "Testing NodeBalancers permissions..."
if linode-cli nodebalancers list > /dev/null 2>&1; then
  echo "✅ nodebalancers:read_write - Can list NodeBalancers"
else
  echo "❌ nodebalancers:read_write - Cannot access NodeBalancers"
fi

# Test Volumes permissions
echo ""
echo "Testing Volumes permissions..."
if linode-cli volumes list > /dev/null 2>&1; then
  echo "✅ volumes:read_write - Can list Volumes"
else
  echo "❌ volumes:read_write - Cannot access Volumes"
fi

# Test Networking/IPs permissions
echo ""
echo "Testing Networking permissions..."
if linode-cli networking ips-list > /dev/null 2>&1; then
  echo "✅ ips:read_only - Can list IPs"
else
  echo "❌ ips:read_only - Cannot access Networking"
fi

echo ""
echo "============================================"
echo "Token Scope Summary"
echo "============================================"

# Show token scopes if available
linode-cli profile tokens-list --format "label,scopes,expiry" 2>/dev/null || echo "Cannot list token details"

echo ""
echo "============================================"
echo "Verification complete!"
echo "============================================"`,
      powershell: `# Linode - Verify Token Permissions (PowerShell)
# Uses linode-cli to verify your token has the required scopes

# Prerequisites: linode-cli installed and configured
# Install: pip install linode-cli

Write-Host "============================================"
Write-Host "Verifying Linode Token Permissions"
Write-Host "============================================"

# Verify account access
Write-Host ""
Write-Host "Testing account access..."
try {
  $account = linode-cli account view --format "email" --no-headers 2>$null
  if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Account access verified" -ForegroundColor Green
    Write-Host "   Email: $account"
  } else { throw }
} catch {
  Write-Host "❌ Account access failed - check your token" -ForegroundColor Red
  exit 1
}

# Test Kubernetes (LKE) permissions
Write-Host ""
Write-Host "Testing Kubernetes (LKE) permissions..."
try {
  linode-cli lke clusters-list 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ lke:read_write - Can list LKE clusters" -ForegroundColor Green
  } else { throw }
} catch {
  Write-Host "❌ lke:read_write - Cannot access LKE" -ForegroundColor Red
}

# Test Linodes permissions
Write-Host ""
Write-Host "Testing Linodes permissions..."
try {
  linode-cli linodes list 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ linodes:read_write - Can list Linodes" -ForegroundColor Green
  } else { throw }
} catch {
  Write-Host "❌ linodes:read_write - Cannot access Linodes" -ForegroundColor Red
}

# Test NodeBalancers permissions
Write-Host ""
Write-Host "Testing NodeBalancers permissions..."
try {
  linode-cli nodebalancers list 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ nodebalancers:read_write - Can list NodeBalancers" -ForegroundColor Green
  } else { throw }
} catch {
  Write-Host "❌ nodebalancers:read_write - Cannot access NodeBalancers" -ForegroundColor Red
}

# Test Volumes permissions
Write-Host ""
Write-Host "Testing Volumes permissions..."
try {
  linode-cli volumes list 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ volumes:read_write - Can list Volumes" -ForegroundColor Green
  } else { throw }
} catch {
  Write-Host "❌ volumes:read_write - Cannot access Volumes" -ForegroundColor Red
}

# Test Networking/IPs permissions
Write-Host ""
Write-Host "Testing Networking permissions..."
try {
  linode-cli networking ips-list 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ ips:read_only - Can list IPs" -ForegroundColor Green
  } else { throw }
} catch {
  Write-Host "❌ ips:read_only - Cannot access Networking" -ForegroundColor Red
}

Write-Host ""
Write-Host "============================================"
Write-Host "Verification complete!"
Write-Host "============================================"`,
    },
    creationScripts: {
      bash: `# Linode (Akamai) - Personal Access Token Creation
# Linode tokens must be created via the Cloud Manager

# Step-by-Step Instructions:
# 1. Log in to https://cloud.linode.com
# 2. Click your username in the top right
# 3. Select "API Tokens"
# 4. Click "Create a Personal Access Token"
# 5. Label: "<your token label>"
# 6. Set Expiry: 6 months recommended
# 7. Set the following scopes to "Read/Write":
#    - Kubernetes (required)
#    - Linodes (required)
#    - NodeBalancers (for load balancers)
#    - Volumes (for persistent storage)
# 8. Click "Create Token"
# 9. COPY THE TOKEN IMMEDIATELY - it will only be shown once!

# Optional: Verify token with Linode CLI
# Install: pip install linode-cli

# Configure CLI with your token
linode-cli configure
# Select "Paste a Token" option and enter your token

# Verify authentication
linode-cli account view

# List available LKE options
linode-cli lke versions-list
linode-cli regions list --format "id,label,capabilities" | grep Kubernetes

echo "============================================"
echo "Token verified successfully!"
echo "Copy your token to ZL MCDT credentials."
echo "============================================"`,
      powershell: `# Linode (Akamai) - Personal Access Token Creation
# Linode tokens must be created via the Cloud Manager

# Step-by-Step Instructions:
# 1. Log in to https://cloud.linode.com
# 2. Click your username in the top right
# 3. Select "API Tokens"
# 4. Click "Create a Personal Access Token"
# 5. Label: "<your token label>"
# 6. Set Expiry: 6 months recommended
# 7. Set the following scopes to "Read/Write":
#    - Kubernetes (required)
#    - Linodes (required)
#    - NodeBalancers (for load balancers)
#    - Volumes (for persistent storage)
# 8. Click "Create Token"
# 9. COPY THE TOKEN IMMEDIATELY - it will only be shown once!

# Optional: Verify token with Linode CLI
# Install: pip install linode-cli

# Configure CLI with your token
linode-cli configure
# Select "Paste a Token" option and enter your token

# Verify authentication
linode-cli account view

# List available LKE options
linode-cli lke versions-list
linode-cli regions list --format "id,label,capabilities" | Select-String "Kubernetes"

Write-Host "============================================"
Write-Host "Token verified successfully!"
Write-Host "Copy your token to ZL MCDT credentials."
Write-Host "============================================"`,
    },
  },
};

export default function PermissionsInfoScreen({ provider, onContinue, onCancel }) {
  const providerInfo = PROVIDER_PERMISSIONS[provider] || PROVIDER_PERMISSIONS.aws;
  const [expanded, setExpanded] = React.useState('panel-policies');
  const [scriptTab, setScriptTab] = React.useState(0);
  const [verifyTab, setVerifyTab] = React.useState(0);
  const [copySnackbar, setCopySnackbar] = React.useState(false);

  const handleChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

  const handleCopyScript = (type = 'creation') => {
    let script;
    if (type === 'verification') {
      script = verifyTab === 0 
        ? providerInfo.verificationScripts?.bash 
        : providerInfo.verificationScripts?.powershell;
    } else {
      script = scriptTab === 0 
        ? providerInfo.creationScripts?.bash 
        : providerInfo.creationScripts?.powershell;
    }
    if (script) {
      navigator.clipboard.writeText(script);
      setCopySnackbar(true);
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <CloudIcon sx={{ fontSize: 40, color: providerInfo.color }} />
        <Box>
          <Typography variant="h6">{providerInfo.name}</Typography>
          <Chip 
            label={providerInfo.accountType} 
            size="small" 
            icon={<KeyIcon />}
            sx={{ mt: 0.5 }}
          />
        </Box>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {providerInfo.description}
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          Before adding credentials, ensure your account has the required permissions listed below.
        </Typography>
      </Alert>

      {/* What You'll Need */}
      <Accordion expanded={expanded === 'panel-creds'} onChange={handleChange('panel-creds')}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <KeyIcon color="primary" />
            <Typography fontWeight="medium">What You'll Need</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <List dense>
            {providerInfo.credentialsNeeded.map((cred, idx) => (
              <ListItem key={idx}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <CheckIcon color="success" fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={cred} />
              </ListItem>
            ))}
          </List>
        </AccordionDetails>
      </Accordion>

      {/* Required Policies/Roles */}
      <Accordion expanded={expanded === 'panel-policies'} onChange={handleChange('panel-policies')}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SecurityIcon color="primary" />
            <Typography fontWeight="medium">Required Policies / Roles</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <List dense>
            {providerInfo.minimumPolicies.map((policy, idx) => (
              <ListItem key={idx} sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <CheckIcon color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontWeight="medium">{policy.name}</Typography>
                        <Chip label={policy.type} size="small" variant="outlined" />
                      </Box>
                    }
                    secondary={policy.description}
                  />
                </Box>
              </ListItem>
            ))}
          </List>
        </AccordionDetails>
      </Accordion>

      {/* Detailed IAM Permissions */}
      <Accordion expanded={expanded === 'panel-iam'} onChange={handleChange('panel-iam')}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <InfoIcon color="primary" />
            <Typography fontWeight="medium">Detailed Permissions ({providerInfo.iamPermissions.length})</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            These are the specific API permissions required:
          </Typography>
          <Box sx={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: 0.5,
            maxHeight: 200,
            overflow: 'auto',
            p: 1,
            bgcolor: 'background.default',
            borderRadius: 1,
          }}>
            {providerInfo.iamPermissions.map((perm, idx) => (
              <Chip 
                key={idx} 
                label={perm} 
                size="small" 
                variant="outlined"
                sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}
              />
            ))}
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Recommendations */}
      <Accordion expanded={expanded === 'panel-recs'} onChange={handleChange('panel-recs')}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckIcon color="primary" />
            <Typography fontWeight="medium">Security Recommendations</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <List dense>
            {providerInfo.recommendations.map((rec, idx) => (
              <ListItem key={idx}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <CheckIcon color="info" fontSize="small" />
                </ListItemIcon>
                <ListItemText 
                  primary={rec} 
                  primaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
            ))}
          </List>
        </AccordionDetails>
      </Accordion>

      {/* Creation Scripts */}
      {providerInfo.creationScripts && (
        <Accordion expanded={expanded === 'panel-scripts'} onChange={handleChange('panel-scripts')}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TerminalIcon color="primary" />
              <Typography fontWeight="medium">Account/Token Creation Scripts</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              Use these scripts to create the required service account or API token. Copy and run in your terminal.
            </Typography>
            
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
              <Tabs value={scriptTab} onChange={(e, v) => setScriptTab(v)} aria-label="script tabs">
                <Tab label="Bash / Linux / macOS" />
                <Tab label="PowerShell / Windows" />
              </Tabs>
            </Box>

            <Paper 
              elevation={0} 
              sx={{ 
                position: 'relative',
                bgcolor: '#1e1e1e', 
                borderRadius: 1,
                overflow: 'hidden',
              }}
            >
              <Box sx={{ 
                position: 'absolute', 
                top: 8, 
                right: 8, 
                zIndex: 1,
              }}>
                <Tooltip title="Copy to clipboard">
                  <IconButton 
                    onClick={() => handleCopyScript('creation')}
                    size="small"
                    sx={{ 
                      color: '#fff',
                      bgcolor: 'rgba(255,255,255,0.1)',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
                    }}
                  >
                    <CopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              <Box
                component="pre"
                sx={{
                  m: 0,
                  p: 2,
                  pt: 3,
                  color: '#d4d4d4',
                  fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                  fontSize: '0.75rem',
                  lineHeight: 1.5,
                  overflow: 'auto',
                  maxHeight: 400,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {scriptTab === 0 
                  ? providerInfo.creationScripts.bash 
                  : providerInfo.creationScripts.powershell}
              </Box>
            </Paper>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Verification Scripts */}
      {providerInfo.verificationScripts && (
        <Accordion expanded={expanded === 'panel-verify'} onChange={handleChange('panel-verify')}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SecurityIcon color="warning" />
              <Typography fontWeight="medium">Verify Permissions Script</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              Run this script to verify your account has each specific API permission required by ZL MCDT.
            </Typography>
            
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
              <Tabs value={verifyTab} onChange={(e, v) => setVerifyTab(v)} aria-label="verification script tabs">
                <Tab label="Bash / Linux / macOS" />
                <Tab label="PowerShell / Windows" />
              </Tabs>
            </Box>

            <Paper 
              elevation={0} 
              sx={{ 
                position: 'relative',
                bgcolor: '#1e1e1e', 
                borderRadius: 1,
                overflow: 'hidden',
              }}
            >
              <Box sx={{ 
                position: 'absolute', 
                top: 8, 
                right: 8, 
                zIndex: 1,
              }}>
                <Tooltip title="Copy to clipboard">
                  <IconButton 
                    onClick={() => handleCopyScript('verification')}
                    size="small"
                    sx={{ 
                      color: '#fff',
                      bgcolor: 'rgba(255,255,255,0.1)',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
                    }}
                  >
                    <CopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              <Box
                component="pre"
                sx={{
                  m: 0,
                  p: 2,
                  pt: 3,
                  color: '#d4d4d4',
                  fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                  fontSize: '0.75rem',
                  lineHeight: 1.5,
                  overflow: 'auto',
                  maxHeight: 400,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {verifyTab === 0 
                  ? providerInfo.verificationScripts.bash 
                  : providerInfo.verificationScripts.powershell}
              </Box>
            </Paper>
          </AccordionDetails>
        </Accordion>
      )}

      <Divider sx={{ my: 3 }} />

      {/* Documentation Link */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
        <Link 
          href={providerInfo.docUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
        >
          View {providerInfo.name} Documentation
          <OpenInNewIcon fontSize="small" />
        </Link>
      </Box>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          variant="contained" 
          onClick={onContinue}
          sx={{ backgroundColor: providerInfo.color, '&:hover': { backgroundColor: providerInfo.color, filter: 'brightness(0.9)' } }}
        >
          I Have These Permissions - Continue
        </Button>
      </Box>

      {/* Copy Snackbar */}
      <Snackbar
        open={copySnackbar}
        autoHideDuration={2000}
        onClose={() => setCopySnackbar(false)}
        message="Script copied to clipboard!"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}
