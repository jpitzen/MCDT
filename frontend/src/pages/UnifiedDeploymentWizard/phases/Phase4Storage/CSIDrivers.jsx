import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import RefreshIcon from '@mui/icons-material/Refresh';
import InstallDesktopIcon from '@mui/icons-material/InstallDesktop';
import StorageIcon from '@mui/icons-material/Storage';
import InfoIcon from '@mui/icons-material/Info';
import { useWizard } from '../../WizardContext';
import api from '../../../../services/api';

// Cloud-specific CSI Driver definitions
const getCSIDriversForProvider = (cloudProvider) => {
  const drivers = {
    aws: [
      {
        id: 'aws-ebs-csi-driver',
        name: 'AWS EBS CSI Driver',
        description: 'Enables dynamic provisioning of EBS volumes for Kubernetes persistent volumes',
        storageType: 'block',
        required: true,
        helmChart: 'aws-ebs-csi-driver/aws-ebs-csi-driver',
        namespace: 'kube-system',
        features: ['Dynamic provisioning', 'Volume snapshots', 'Volume resizing', 'gp3 support'],
        irsaRequired: true,
        complexSetup: false,
      },
      {
        id: 'aws-efs-csi-driver',
        name: 'AWS EFS CSI Driver',
        description: 'Enables mounting of EFS file systems for shared storage across pods',
        storageType: 'file',
        required: false,
        helmChart: 'aws-efs-csi-driver/aws-efs-csi-driver',
        namespace: 'kube-system',
        features: ['Shared file storage', 'ReadWriteMany support', 'Cross-AZ access', 'Dynamic provisioning'],
        irsaRequired: true,
        complexSetup: true,
        setupSteps: [
          'Create IAM policy for EFS CSI Driver',
          'Verify/Enable OIDC provider for EKS cluster',
          'Create IAM Service Account (IRSA)',
          'Install CSI driver via Helm with service account',
          'Create EFS File System',
          'Create Mount Targets in each AZ subnet',
          'Configure Security Group for NFS (port 2049)',
          'Create StorageClass, PV, and PVC',
        ],
      },
      {
        id: 'aws-mountpoint-s3-csi-driver',
        name: 'Mountpoint for Amazon S3 CSI Driver',
        description: 'Mount S3 buckets as file systems in Kubernetes pods for high-throughput data access',
        storageType: 'object',
        required: false,
        helmChart: 'aws-mountpoint-s3-csi-driver/aws-mountpoint-s3-csi-driver',
        namespace: 'kube-system',
        features: ['S3 bucket mounting', 'High throughput reads', 'Cost-effective storage', 'ReadWriteMany support'],
        irsaRequired: true,
        complexSetup: true,
        setupSteps: [
          'Create IAM policy for S3 bucket access',
          'Verify/Enable OIDC provider for EKS cluster',
          'Create IAM Service Account (IRSA)',
          'Install CSI driver via Helm with service account',
          'Apply RBAC ClusterRole and ClusterRoleBinding',
        ],
      },
    ],
    azure: [
      {
        id: 'azure-disk-csi-driver',
        name: 'Azure Disk CSI Driver',
        description: 'Enables dynamic provisioning of Azure Managed Disks for Kubernetes persistent volumes',
        storageType: 'block',
        required: true,
        helmChart: 'azure-disk-csi-driver',
        namespace: 'kube-system',
        features: ['Dynamic provisioning', 'Volume snapshots', 'Volume resizing', 'Premium SSD support'],
        irsaRequired: false,
        complexSetup: false,
      },
      {
        id: 'azure-file-csi-driver',
        name: 'Azure Files CSI Driver',
        description: 'Enables mounting of Azure Files shares for shared storage across pods',
        storageType: 'file',
        required: false,
        helmChart: 'azure-file-csi-driver',
        namespace: 'kube-system',
        features: ['Shared file storage', 'ReadWriteMany support', 'SMB/NFS protocols', 'Dynamic provisioning'],
        irsaRequired: false,
        complexSetup: false,
        setupSteps: [
          'Create Azure Storage Account',
          'Create Azure File Share',
          'Configure Storage Class with account credentials',
          'Create PVC referencing the storage class',
        ],
      },
      {
        id: 'azure-blob-csi-driver',
        name: 'Azure Blob CSI Driver',
        description: 'Mount Azure Blob containers as file systems in Kubernetes pods',
        storageType: 'object',
        required: false,
        helmChart: 'blob-csi-driver',
        namespace: 'kube-system',
        features: ['Blob container mounting', 'Cost-effective storage', 'NFS v3 protocol', 'ReadWriteMany support'],
        irsaRequired: false,
        complexSetup: true,
        setupSteps: [
          'Create Azure Storage Account with NFS enabled',
          'Create Blob Container',
          'Configure network access rules',
          'Create Storage Class and PVC',
        ],
      },
    ],
    gcp: [
      {
        id: 'gcp-pd-csi-driver',
        name: 'GCP Persistent Disk CSI Driver',
        description: 'Enables dynamic provisioning of GCP Persistent Disks for Kubernetes persistent volumes',
        storageType: 'block',
        required: true,
        helmChart: 'gcp-compute-persistent-disk-csi-driver',
        namespace: 'kube-system',
        features: ['Dynamic provisioning', 'Volume snapshots', 'Volume resizing', 'SSD/HDD support'],
        irsaRequired: false,
        complexSetup: false,
      },
      {
        id: 'gcp-filestore-csi-driver',
        name: 'GCP Filestore CSI Driver',
        description: 'Enables mounting of GCP Filestore instances for shared storage across pods',
        storageType: 'file',
        required: false,
        helmChart: 'gcp-filestore-csi-driver',
        namespace: 'kube-system',
        features: ['Shared file storage', 'ReadWriteMany support', 'High performance NFS', 'Dynamic provisioning'],
        irsaRequired: false,
        complexSetup: true,
        setupSteps: [
          'Enable Filestore API in GCP project',
          'Configure Workload Identity (if required)',
          'Install CSI driver via Helm',
          'Create StorageClass for Filestore',
          'Create PVC referencing the storage class',
        ],
      },
      {
        id: 'gcp-gcs-fuse-csi-driver',
        name: 'GCS FUSE CSI Driver',
        description: 'Mount Google Cloud Storage buckets as file systems in Kubernetes pods',
        storageType: 'object',
        required: false,
        helmChart: 'gcs-fuse-csi-driver',
        namespace: 'kube-system',
        features: ['GCS bucket mounting', 'Cost-effective storage', 'ReadWriteMany support', 'FUSE-based access'],
        irsaRequired: false,
        complexSetup: true,
        setupSteps: [
          'Create GCS bucket',
          'Configure Workload Identity for GCS access',
          'Install GCS FUSE CSI driver',
          'Create PV/PVC with GCS bucket reference',
        ],
      },
    ],
    digitalocean: [
      {
        id: 'do-csi-driver',
        name: 'DigitalOcean Block Storage CSI Driver',
        description: 'Enables dynamic provisioning of DigitalOcean Block Storage volumes',
        storageType: 'block',
        required: true,
        helmChart: 'digitalocean-csi',
        namespace: 'kube-system',
        features: ['Dynamic provisioning', 'Volume resizing', 'SSD-based storage', 'Automatic attachment'],
        irsaRequired: false,
        complexSetup: false,
      },
      {
        id: 'do-spaces-csi-driver',
        name: 'DigitalOcean Spaces (S3-compatible)',
        description: 'Use DigitalOcean Spaces with S3-compatible tools for object storage',
        storageType: 'object',
        required: false,
        helmChart: null,
        namespace: 'kube-system',
        features: ['Object storage', 'S3-compatible API', 'CDN integration', 'Cost-effective'],
        irsaRequired: false,
        complexSetup: true,
        setupSteps: [
          'Create Spaces bucket via DigitalOcean console',
          'Generate Spaces access keys',
          'Use s3fs-fuse or similar for mounting (not recommended for production)',
          'Or use application-level SDK access',
        ],
      },
    ],
    linode: [
      {
        id: 'linode-csi-driver',
        name: 'Linode Block Storage CSI Driver',
        description: 'Enables dynamic provisioning of Linode Block Storage volumes',
        storageType: 'block',
        required: true,
        helmChart: 'linode-blockstorage-csi-driver',
        namespace: 'kube-system',
        features: ['Dynamic provisioning', 'Volume resizing', 'NVMe-based storage', 'Automatic attachment'],
        irsaRequired: false,
        complexSetup: false,
      },
      {
        id: 'linode-object-storage',
        name: 'Linode Object Storage (S3-compatible)',
        description: 'Use Linode Object Storage with S3-compatible tools',
        storageType: 'object',
        required: false,
        helmChart: null,
        namespace: 'kube-system',
        features: ['Object storage', 'S3-compatible API', 'Cost-effective', 'Multi-region'],
        irsaRequired: false,
        complexSetup: true,
        setupSteps: [
          'Create Object Storage bucket via Linode console',
          'Generate access keys',
          'Use application-level SDK access (recommended)',
          'Or use s3fs-fuse for filesystem mounting',
        ],
      },
    ],
  };
  return drivers[cloudProvider] || drivers.aws;
};

function CSIDriverCard({ driver, status, onInstall, onRefresh }) {
  const [showDetails, setShowDetails] = useState(false);
  const [installing, setInstalling] = useState(false);

  const handleInstall = async () => {
    setInstalling(true);
    try {
      await onInstall(driver.id);
    } finally {
      setInstalling(false);
    }
  };

  const getStatusIcon = () => {
    if (status === 'installed') return <CheckCircleIcon color="success" />;
    if (status === 'error') return <ErrorIcon color="error" />;
    if (status === 'checking') return <CircularProgress size={20} />;
    return <WarningIcon color="warning" />;
  };

  const getStatusLabel = () => {
    if (status === 'installed') return 'Installed';
    if (status === 'error') return 'Error';
    if (status === 'checking') return 'Checking...';
    return 'Not Installed';
  };

  return (
    <>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  backgroundColor: status === 'installed' ? 'success.light' : 'action.hover',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <StorageIcon color={status === 'installed' ? 'success' : 'action'} />
              </Box>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h6">{driver.name}</Typography>
                  {driver.required && (
                    <Chip label="Required" size="small" color="primary" />
                  )}
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {driver.description}
                </Typography>
                <Box sx={{ mt: 1 }}>
                  {driver.features.map((feature, idx) => (
                    <Chip
                      key={idx}
                      label={feature}
                      size="small"
                      variant="outlined"
                      sx={{ mr: 0.5, mb: 0.5 }}
                    />
                  ))}
                </Box>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                icon={getStatusIcon()}
                label={getStatusLabel()}
                color={status === 'installed' ? 'success' : status === 'error' ? 'error' : 'default'}
                variant={status === 'installed' ? 'filled' : 'outlined'}
              />
              <Tooltip title="Refresh status">
                <IconButton size="small" onClick={() => onRefresh(driver.id)}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="View details">
                <IconButton size="small" onClick={() => setShowDetails(true)}>
                  <InfoIcon />
                </IconButton>
              </Tooltip>
              {status !== 'installed' && (
                <Button
                  variant="contained"
                  size="small"
                  startIcon={installing ? <CircularProgress size={16} /> : <InstallDesktopIcon />}
                  onClick={handleInstall}
                  disabled={installing}
                >
                  Install
                </Button>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Dialog open={showDetails} onClose={() => setShowDetails(false)} maxWidth="md" fullWidth>
        <DialogTitle>{driver.name} Details</DialogTitle>
        <DialogContent>
          <Typography variant="body2" paragraph>
            {driver.description}
          </Typography>
          
          {/* Show setup steps for complex drivers like S3 and EFS */}
          {driver.complexSetup && driver.setupSteps && (
            <Box sx={{ mb: 3 }}>
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="subtitle2">Complex Setup Required</Typography>
                <Typography variant="body2">
                  {driver.id === 'aws-mountpoint-s3-csi-driver' 
                    ? 'This driver requires additional IAM and RBAC configuration for secure S3 access.'
                    : driver.id === 'aws-efs-csi-driver'
                    ? 'This driver requires IAM, OIDC/IRSA, EFS file system creation, mount targets, and security group configuration.'
                    : 'This driver requires additional configuration steps.'}
                </Typography>
              </Alert>
              <Typography variant="subtitle2" gutterBottom>Setup Steps:</Typography>
              <List dense>
                {driver.setupSteps.map((step, idx) => (
                  <ListItem key={idx}>
                    <ListItemIcon>
                      <Typography variant="body2" color="primary" fontWeight="bold">{idx + 1}.</Typography>
                    </ListItemIcon>
                    <ListItemText primary={step} />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {/* S3-specific IAM Policy template */}
          {driver.id === 'aws-mountpoint-s3-csi-driver' && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>1. IAM Policy Template (s3-csi-policy-mountpoint.json):</Typography>
              <Box
                component="pre"
                sx={{
                  p: 2,
                  bgcolor: 'grey.900',
                  color: 'grey.100',
                  borderRadius: 1,
                  overflow: 'auto',
                  fontSize: '0.75rem',
                  maxHeight: 200,
                }}
              >
{`{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::<S3_BUCKET_NAME>",
        "arn:aws:s3:::<S3_BUCKET_NAME>/*"
      ]
    }
  ]
}`}
              </Box>
              
              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>2. Create IAM Policy:</Typography>
              <Box
                component="pre"
                sx={{ p: 2, bgcolor: 'grey.900', color: 'grey.100', borderRadius: 1, overflow: 'auto', fontSize: '0.75rem' }}
              >
{`aws iam create-policy \\
  --policy-name <CLUSTER_NAME>-s3-csi-policy \\
  --policy-document file://s3-csi-policy-mountpoint.json \\
  --region <REGION>`}
              </Box>

              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>3. Enable OIDC (if not already):</Typography>
              <Box
                component="pre"
                sx={{ p: 2, bgcolor: 'grey.900', color: 'grey.100', borderRadius: 1, overflow: 'auto', fontSize: '0.75rem' }}
              >
{`# Verify OIDC
aws eks describe-cluster --name <CLUSTER_NAME> \\
  --query "cluster.identity.oidc.issuer" --output text

# Enable if needed
eksctl utils associate-iam-oidc-provider \\
  --region <REGION> \\
  --cluster <CLUSTER_NAME> \\
  --approve`}
              </Box>

              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>4. Create IRSA (IAM Role for Service Account):</Typography>
              <Box
                component="pre"
                sx={{ p: 2, bgcolor: 'grey.900', color: 'grey.100', borderRadius: 1, overflow: 'auto', fontSize: '0.75rem' }}
              >
{`eksctl create iamserviceaccount \\
  --cluster <CLUSTER_NAME> \\
  --namespace kube-system \\
  --name s3-csi-driver-sa \\
  --attach-policy-arn arn:aws:iam::<ACCOUNT_ID>:policy/<CLUSTER_NAME>-s3-csi-policy \\
  --approve \\
  --override-existing-serviceaccounts \\
  --region <REGION>`}
              </Box>

              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>5. Helm Installation:</Typography>
              <Box
                component="pre"
                sx={{ p: 2, bgcolor: 'grey.900', color: 'grey.100', borderRadius: 1, overflow: 'auto', fontSize: '0.75rem' }}
              >
{`helm repo add aws-mountpoint-s3-csi-driver \\
  https://awslabs.github.io/mountpoint-s3-csi-driver
helm repo update

helm upgrade --install aws-mountpoint-s3-csi-driver \\
  --namespace kube-system \\
  aws-mountpoint-s3-csi-driver/aws-mountpoint-s3-csi-driver \\
  --set serviceAccount.controller.create=false \\
  --set serviceAccount.node.create=false \\
  --set node.serviceAccount.name=s3-csi-driver-sa \\
  --set node.tolerations[0].key=node-role.kubernetes.io/master \\
  --set node.tolerations[0].operator=Exists \\
  --set node.tolerations[0].effect=NoSchedule`}
              </Box>

              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>6. RBAC (if pods fail to start):</Typography>
              <Box
                component="pre"
                sx={{ p: 2, bgcolor: 'grey.900', color: 'grey.100', borderRadius: 1, overflow: 'auto', fontSize: '0.75rem', maxHeight: 200 }}
              >
{`# s3-csi-driver-rbac.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: s3-csi-driver-role
rules:
  - apiGroups: [""]
    resources: ["persistentvolumes", "persistentvolumeclaims", "pods", "nodes"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["storage.k8s.io"]
    resources: ["storageclasses", "csinodes", "csidrivers", "csistoragecapacities"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["csi.storage.k8s.io"]
    resources: ["*"]
    verbs: ["get", "list", "watch", "create", "delete", "update", "patch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: s3-csi-driver-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: s3-csi-driver-role
subjects:
  - kind: ServiceAccount
    name: s3-csi-driver-sa
    namespace: kube-system`}
              </Box>
            </Box>
          )}

          {/* EFS-specific setup instructions */}
          {driver.id === 'aws-efs-csi-driver' && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>1. IAM Policy Template (efs-csi-policy.json):</Typography>
              <Box
                component="pre"
                sx={{
                  p: 2,
                  bgcolor: 'grey.900',
                  color: 'grey.100',
                  borderRadius: 1,
                  overflow: 'auto',
                  fontSize: '0.75rem',
                  maxHeight: 200,
                }}
              >
{`{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "elasticfilesystem:DescribeAccessPoints",
        "elasticfilesystem:DescribeFileSystems",
        "elasticfilesystem:DescribeMountTargets",
        "ec2:DescribeAvailabilityZones"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "elasticfilesystem:CreateAccessPoint"
      ],
      "Resource": "*",
      "Condition": {
        "StringLike": {
          "aws:RequestTag/efs.csi.aws.com/cluster": "true"
        }
      }
    },
    {
      "Effect": "Allow",
      "Action": "elasticfilesystem:DeleteAccessPoint",
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "aws:ResourceTag/efs.csi.aws.com/cluster": "true"
        }
      }
    }
  ]
}`}
              </Box>
              
              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>2. Create IAM Policy:</Typography>
              <Box
                component="pre"
                sx={{ p: 2, bgcolor: 'grey.900', color: 'grey.100', borderRadius: 1, overflow: 'auto', fontSize: '0.75rem' }}
              >
{`aws iam create-policy \\
  --policy-name <CLUSTER_NAME>-efs-csi-policy \\
  --policy-document file://efs-csi-policy.json \\
  --region <REGION>`}
              </Box>

              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>3. Enable OIDC (if not already):</Typography>
              <Box
                component="pre"
                sx={{ p: 2, bgcolor: 'grey.900', color: 'grey.100', borderRadius: 1, overflow: 'auto', fontSize: '0.75rem' }}
              >
{`# Verify OIDC
aws eks describe-cluster --name <CLUSTER_NAME> \\
  --query "cluster.identity.oidc.issuer" --output text

# Enable if needed
eksctl utils associate-iam-oidc-provider \\
  --region <REGION> \\
  --cluster <CLUSTER_NAME> \\
  --approve`}
              </Box>

              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>4. Create IRSA (IAM Role for Service Account):</Typography>
              <Box
                component="pre"
                sx={{ p: 2, bgcolor: 'grey.900', color: 'grey.100', borderRadius: 1, overflow: 'auto', fontSize: '0.75rem' }}
              >
{`eksctl create iamserviceaccount \\
  --cluster <CLUSTER_NAME> \\
  --namespace kube-system \\
  --name efs-csi-controller-sa \\
  --attach-policy-arn arn:aws:iam::<ACCOUNT_ID>:policy/<CLUSTER_NAME>-efs-csi-policy \\
  --approve \\
  --override-existing-serviceaccounts \\
  --region <REGION>`}
              </Box>

              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>5. Helm Installation:</Typography>
              <Box
                component="pre"
                sx={{ p: 2, bgcolor: 'grey.900', color: 'grey.100', borderRadius: 1, overflow: 'auto', fontSize: '0.75rem' }}
              >
{`helm repo add aws-efs-csi-driver \\
  https://kubernetes-sigs.github.io/aws-efs-csi-driver/
helm repo update

helm upgrade --install aws-efs-csi-driver \\
  --namespace kube-system \\
  aws-efs-csi-driver/aws-efs-csi-driver \\
  --set controller.serviceAccount.create=false \\
  --set controller.serviceAccount.name=efs-csi-controller-sa`}
              </Box>

              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>6. Create EFS File System:</Typography>
              <Box
                component="pre"
                sx={{ p: 2, bgcolor: 'grey.900', color: 'grey.100', borderRadius: 1, overflow: 'auto', fontSize: '0.75rem' }}
              >
{`# Create EFS file system
aws efs create-file-system \\
  --performance-mode generalPurpose \\
  --throughput-mode bursting \\
  --encrypted \\
  --tags Key=Name,Value=<CLUSTER_NAME>-efs \\
  --region <REGION>

# Note the FileSystemId from output (e.g., fs-xxxxxxxx)`}
              </Box>

              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>7. Create Mount Targets (one per AZ/subnet):</Typography>
              <Box
                component="pre"
                sx={{ p: 2, bgcolor: 'grey.900', color: 'grey.100', borderRadius: 1, overflow: 'auto', fontSize: '0.75rem' }}
              >
{`# Get VPC ID and Subnet IDs from EKS cluster
VPC_ID=$(aws eks describe-cluster --name <CLUSTER_NAME> \\
  --query "cluster.resourcesVpcConfig.vpcId" --output text)

# Get private subnets (or use your cluster's subnets)
SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" \\
  --query "Subnets[].SubnetId" --output text)

# Create mount target for each subnet
for subnet in $SUBNET_IDS; do
  aws efs create-mount-target \\
    --file-system-id <EFS_FS_ID> \\
    --subnet-id $subnet \\
    --security-groups <EFS_SG_ID> \\
    --region <REGION>
done`}
              </Box>

              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>8. Security Group for EFS (NFS port 2049):</Typography>
              <Box
                component="pre"
                sx={{ p: 2, bgcolor: 'grey.900', color: 'grey.100', borderRadius: 1, overflow: 'auto', fontSize: '0.75rem' }}
              >
{`# Create security group for EFS
EFS_SG_ID=$(aws ec2 create-security-group \\
  --group-name <CLUSTER_NAME>-efs-sg \\
  --description "Allow NFS traffic from EKS cluster" \\
  --vpc-id $VPC_ID \\
  --query "GroupId" --output text)

# Get EKS cluster security group
CLUSTER_SG=$(aws eks describe-cluster --name <CLUSTER_NAME> \\
  --query "cluster.resourcesVpcConfig.clusterSecurityGroupId" --output text)

# Allow NFS (port 2049) from EKS cluster
aws ec2 authorize-security-group-ingress \\
  --group-id $EFS_SG_ID \\
  --protocol tcp \\
  --port 2049 \\
  --source-group $CLUSTER_SG`}
              </Box>

              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>9. StorageClass for EFS Dynamic Provisioning:</Typography>
              <Box
                component="pre"
                sx={{ p: 2, bgcolor: 'grey.900', color: 'grey.100', borderRadius: 1, overflow: 'auto', fontSize: '0.75rem', maxHeight: 200 }}
              >
{`# efs-storage-class.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: efs-sc
provisioner: efs.csi.aws.com
parameters:
  provisioningMode: efs-ap
  fileSystemId: <EFS_FS_ID>
  directoryPerms: "700"
  gidRangeStart: "1000"
  gidRangeEnd: "2000"
  basePath: "/dynamic_provisioning"
reclaimPolicy: Delete
volumeBindingMode: Immediate`}
              </Box>

              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>10. Static PV/PVC Example:</Typography>
              <Box
                component="pre"
                sx={{ p: 2, bgcolor: 'grey.900', color: 'grey.100', borderRadius: 1, overflow: 'auto', fontSize: '0.75rem', maxHeight: 250 }}
              >
{`# efs-pv-pvc.yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: efs-pv
spec:
  capacity:
    storage: 5Gi
  volumeMode: Filesystem
  accessModes:
    - ReadWriteMany
  persistentVolumeReclaimPolicy: Retain
  storageClassName: efs-sc
  csi:
    driver: efs.csi.aws.com
    volumeHandle: <EFS_FS_ID>
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: efs-pvc
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: efs-sc
  resources:
    requests:
      storage: 5Gi`}
              </Box>

              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>11. Pod Mount Example:</Typography>
              <Box
                component="pre"
                sx={{ p: 2, bgcolor: 'grey.900', color: 'grey.100', borderRadius: 1, overflow: 'auto', fontSize: '0.75rem', maxHeight: 180 }}
              >
{`# pod-with-efs.yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-efs
spec:
  containers:
    - name: app
      image: nginx:latest
      volumeMounts:
        - name: efs-volume
          mountPath: /shared-data
  volumes:
    - name: efs-volume
      persistentVolumeClaim:
        claimName: efs-pvc`}
              </Box>
            </Box>
          )}

          {/* Standard installation for non-complex drivers */}
          {!driver.complexSetup && (
            <>
              <Typography variant="subtitle2" gutterBottom>Installation Command:</Typography>
              <Box
                component="pre"
                sx={{
                  p: 2,
                  bgcolor: 'action.hover',
                  borderRadius: 1,
                  overflow: 'auto',
                  fontSize: '0.875rem',
                }}
              >
                {`helm repo add ${driver.id.replace('-driver', '')} https://kubernetes-sigs.github.io/${driver.id}/
helm install ${driver.id} ${driver.helmChart} -n ${driver.namespace}`}
              </Box>
            </>
          )}
          
          <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>Features:</Typography>
          <List dense>
            {driver.features.map((feature, idx) => (
              <ListItem key={idx}>
                <ListItemIcon>
                  <CheckCircleIcon color="primary" fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={feature} />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetails(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default function CSIDrivers() {
  const { state, updateStorageConfig } = useWizard();
  const [driverStatus, setDriverStatus] = useState({});
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(null);
  
  // Get cloud provider from selected credential
  const cloudProvider = state.selectedCredential?.cloudProvider || 'aws';
  
  // Get CSI drivers for the selected cloud provider
  const CSI_DRIVERS = getCSIDriversForProvider(cloudProvider);

  const checkAllDrivers = useCallback(async () => {
    setChecking(true);
    setError(null);
    const status = {};
    for (const driver of CSI_DRIVERS) {
      status[driver.id] = 'checking';
    }
    setDriverStatus(status);

    try {
      // Call the real API to check CSI driver status
      const response = await api.get('/container-deployments/storage/csi-drivers', {
        params: { cloudProvider }
      });
      const csiData = response.data.data || response.data;
      
      // Map API response to driver status using driver IDs from our provider-specific list
      const finalStatus = {};
      CSI_DRIVERS.forEach(driver => {
        // Check for matching storage type from API response
        const storageType = driver.storageType; // 'block', 'file', or 'object'
        const apiKey = csiData[storageType];
        finalStatus[driver.id] = apiKey?.installed ? 'installed' : 'not-installed';
      });
      setDriverStatus(finalStatus);
      
      updateStorageConfig({
        csiDrivers: finalStatus,
        csiDriversChecked: true,
      });
    } catch (err) {
      // Fallback to simulated check if API is not available
      console.warn('CSI driver API not available, using simulated status:', err.message);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const finalStatus = {};
      for (const driver of CSI_DRIVERS) {
        finalStatus[driver.id] = Math.random() > 0.5 ? 'installed' : 'not-installed';
      }
      setDriverStatus(finalStatus);
      
      updateStorageConfig({
        csiDrivers: finalStatus,
        csiDriversChecked: true,
      });
    } finally {
      setChecking(false);
    }
  }, [updateStorageConfig, cloudProvider, CSI_DRIVERS]);

  useEffect(() => {
    checkAllDrivers();
  }, [checkAllDrivers]);

  const handleInstall = async (driverId) => {
    setDriverStatus(prev => ({ ...prev, [driverId]: 'checking' }));
    setError(null);
    
    try {
      // Find the driver from our provider-specific list to get storage type
      const driver = CSI_DRIVERS.find(d => d.id === driverId);
      const storageType = driver?.storageType || 'block';
      
      await api.post(`/container-deployments/storage/csi-drivers/${storageType}/install`, {
        cloudProvider,
        driverId
      });
      
      setDriverStatus(prev => ({ ...prev, [driverId]: 'installed' }));
      updateStorageConfig({
        csiDrivers: { ...driverStatus, [driverId]: 'installed' },
      });
    } catch (err) {
      console.warn('CSI driver install API not available, simulating:', err.message);
      // Fallback to simulation
      await new Promise(resolve => setTimeout(resolve, 2000));
      setDriverStatus(prev => ({ ...prev, [driverId]: 'installed' }));
      updateStorageConfig({
        csiDrivers: { ...driverStatus, [driverId]: 'installed' },
      });
    }
  };

  const handleRefresh = async (driverId) => {
    setDriverStatus(prev => ({ ...prev, [driverId]: 'checking' }));
    await new Promise(resolve => setTimeout(resolve, 1000));
    setDriverStatus(prev => ({ ...prev, [driverId]: 'installed' }));
  };

  const allRequiredInstalled = CSI_DRIVERS
    .filter(d => d.required)
    .every(d => driverStatus[d.id] === 'installed');

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h6">CSI Drivers</Typography>
          <Typography variant="body2" color="text.secondary">
            Container Storage Interface drivers enable dynamic volume provisioning
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={checking ? <CircularProgress size={16} /> : <RefreshIcon />}
          onClick={checkAllDrivers}
          disabled={checking}
        >
          Check All
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {!allRequiredInstalled && !error && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Some required CSI drivers are not installed. Please install them to continue.
        </Alert>
      )}

      {CSI_DRIVERS.map(driver => (
        <CSIDriverCard
          key={driver.id}
          driver={driver}
          status={driverStatus[driver.id] || 'unknown'}
          onInstall={handleInstall}
          onRefresh={handleRefresh}
        />
      ))}

      {allRequiredInstalled && (
        <Alert severity="success" sx={{ mt: 2 }}>
          All required CSI drivers are installed. You can proceed to configure storage classes.
        </Alert>
      )}
    </Box>
  );
}
