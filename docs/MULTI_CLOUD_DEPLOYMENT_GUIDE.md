# Multi-Cloud Kubernetes Deployment Platform Architecture

## Overview

The automated multi-cloud deployment platform enables users to deploy fully-featured Kubernetes clusters on AWS, Azure, Google Cloud, DigitalOcean, or Linode with **zero code changes** and maximum automation.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       User Browser (React)                       │
│                    http://localhost:3000                         │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS + WebSocket
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend (React 18)                           │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  CloudProviderSelection (Landing page)                  │    │
│  │  CloudCredentialForm (AWS/Azure/GCP/DO/Linode)         │    │
│  │  DeploymentWizardMultiCloud (Unified form for all)     │    │
│  │  Dashboard (Real-time status + logs)                   │    │
│  └─────────────────────────────────────────────────────────┘    │
└──────────────────────────┬──────────────────────────────────────┘
                           │ REST API + WebSocket
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                Node.js/Express Backend (API)                    │
│  ┌──────────────────────────────────────────────────────┐       │
│  │  Routes: /api/deployments/providers                  │       │
│  │          /api/credentials (multi-cloud)             │       │
│  │          /api/deployments (multi-cloud)             │       │
│  └──────────────────────────────────────────────────────┘       │
│                                                                   │
│  ┌──────────────────────────────────────────────────────┐       │
│  │  MultiCloudOrchestrator Service                      │       │
│  │  ├─ Cloud provider routing                           │       │
│  │  ├─ Terraform variable generation                    │       │
│  │  ├─ Credential management                            │       │
│  │  └─ Deployment lifecycle orchestration               │       │
│  └──────────────────────────────────────────────────────┘       │
│                                                                   │
│  ┌──────────────────────────────────────────────────────┐       │
│  │  Secrets Services                                    │       │
│  │  ├─ AWSSecretsService (AWS Secrets Manager)         │       │
│  │  ├─ AzureKeyVaultService (Azure Key Vault)          │       │
│  │  ├─ GCPSecretManagerService (Google Secret Mgr)     │       │
│  │  └─ HashiCorpVaultService (Vault + DO + Linode)     │       │
│  └──────────────────────────────────────────────────────┘       │
└──────────────────────────┬──────────────────────────────────────┘
                           │ Calls Terraform & executes scripts
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Multi-Cloud Orchestrator                     │
│  ┌──────────────────────────────────────────────────────┐       │
│  │  scripts/multi-cloud-orchestrator.sh                 │       │
│  │  - Terraform init, plan, apply                       │       │
│  │  - Phase-by-phase execution                          │       │
│  │  - Real-time log streaming                           │       │
│  │  - Automatic rollback on failure                     │       │
│  └──────────────────────────────────────────────────────┘       │
│                                                                   │
│  ┌──────────────────────────────────────────────────────┐       │
│  │  terraform/environments/{aws|azure|gcp|do|linode}   │       │
│  │  ├─ main.tf (cloud-specific resources)              │       │
│  │  ├─ providers.tf (conditional provider blocks)      │       │
│  │  ├─ variables.tf (cloud-specific vars)              │       │
│  │  └─ outputs.tf (kubeconfig, endpoints, etc.)        │       │
│  └──────────────────────────────────────────────────────┘       │
│                                                                   │
│  ┌──────────────────────────────────────────────────────┐       │
│  │  terraform/modules/ (cloud-agnostic)                │       │
│  │  ├─ kubernetes_cluster/                             │       │
│  │  ├─ storage/ (block, file, object)                  │       │
│  │  ├─ database/ (RDS/CloudSQL/Azure Database)         │       │
│  │  ├─ monitoring/ (CloudWatch/Monitor/Stackdriver)    │       │
│  │  └─ networking/ (VPC/VNet/VPC equivalent)           │       │
│  └──────────────────────────────────────────────────────┘       │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                ┌──────────┼──────────┬────────────┬──────────┐
                ▼          ▼          ▼            ▼          ▼
            ┌────────┐ ┌──────┐ ┌─────┐  ┌──────┐  ┌─────┐
            │  AWS   │ │Azure │ │ GCP │  │  DO  │  │Linode│
            │  EKS   │ │ AKS  │ │ GKE │  │ DOKS │  │ LKE  │
            └────────┘ └──────┘ └─────┘  └──────┘  └─────┘
```

## Data Flow

### 1. User Selects Cloud Provider
- Frontend displays `CloudProviderSelection` component
- User clicks on cloud provider card
- Navigation to credential form for that provider

### 2. User Provides Credentials
- Credentials are submitted via frontend form
- Backend validates format (not connection yet)
- Backend routes to appropriate `secrets` service
- Credentials are **encrypted and stored in native cloud vault** (NOT in PostgreSQL)
- Database stores **reference ID** only

### 3. User Creates Deployment
- Frontend displays `DeploymentWizardMultiCloud`
- User selects cloud provider and credentials
- User configures deployment (cluster name, regions, features)
- Backend generates cloud-specific Terraform variables
- Deployment record created in database with `cloudProvider` field

### 4. Deployment Execution
- Backend calls `multiCloudOrchestrator.executeDeployment()`
- Orchestrator generates `terraform.tfvars` with variables
- Calls `scripts/multi-cloud-orchestrator.sh`
- Terraform initializes appropriate cloud provider
- Resources created (Kubernetes cluster, RDS, storage, monitoring)
- Logs streamed to frontend via WebSocket

### 5. Real-time Updates
- WebSocket connection established at `/deployments/:id/logs`
- Backend streams Terraform logs as they execute
- Frontend Dashboard updates progress bar and phase indicator
- User sees live output

## New Database Models

### Credential Model (Updated)
```javascript
{
  id: UUID (PK),
  userId: UUID (FK),
  cloudProvider: ENUM('aws', 'azure', 'gcp', 'digitalocean', 'linode'),
  vaultType: ENUM('aws-secrets', 'azure-kv', 'gcp-secrets', 'hashicorp-vault'),
  secretRefId: STRING (reference to secret in cloud vault),
  cloudAccountId: STRING (AWS account ID / Azure subscription / GCP project),
  cloudRegion: STRING (primary region),
  // Legacy fields for backward compatibility
  awsAccountId: STRING (nullable),
  encryptedAccessKeyId: TEXT (nullable),
  ...
}
```

### Deployment Model (Updated)
```javascript
{
  id: UUID (PK),
  credentialId: UUID (FK),
  userId: UUID (FK),
  cloudProvider: ENUM('aws', 'azure', 'gcp', 'digitalocean', 'linode'),
  clusterName: STRING,
  status: ENUM('pending', 'running', 'paused', 'completed', 'failed', 'rolled_back'),
  currentPhase: INTEGER (0-11),
  progress: INTEGER (0-100),
  configuration: JSONB (cloud-agnostic options),
  parameters: JSONB (cloud-specific parameters),
  ...
}
```

## Backend Services

### MultiCloudOrchestrator Service
**Location**: `backend/src/services/multiCloudOrchestrator.js`

**Key Methods**:
- `initializeCloudCredentials(cloudProvider, credentials)` - Initialize secret service
- `storeCloudCredentials(cloudProvider, deploymentId, credentials)` - Store in vault
- `retrieveCloudCredentials(cloudProvider, deploymentId)` - Get from vault
- `validateCloudCredentials(cloudProvider, credentials)` - Test access
- `getTerraformModulePath(cloudProvider)` - Get module for cloud
- `generateTerraformVars(cloudProvider, deploymentConfig)` - Generate tfvars
- `generateTfvarsContent(terraformVars)` - Generate HCL content
- `executeDeployment(deploymentId, cloudProvider, deploymentConfig)` - Run terraform
- `getSupportedProviders()` - List ['aws', 'azure', 'gcp', 'digitalocean', 'linode']
- `getProviderInfo(cloudProvider)` - Get provider metadata

### Secrets Services

#### AWSSecretsService
**Location**: `backend/src/services/secrets/awsSecrets.js`
- Stores credentials in **AWS Secrets Manager** (ARN format)
- Uses AWS SDK v2.x
- Automatic versioning and rotation support

#### AzureKeyVaultService
**Location**: `backend/src/services/secrets/azureKeyVault.js`
- Stores credentials in **Azure Key Vault**
- Supports ClientSecret and DefaultAzureCredential
- Async deletion (soft delete with recovery window)

#### GCPSecretManagerService
**Location**: `backend/src/services/secrets/gcpSecretManager.js`
- Stores credentials in **Google Secret Manager**
- Supports ADC and explicit key file
- Version management with secret history

#### HashiCorpVaultService
**Location**: `backend/src/services/secrets/hashicorpVault.js`
- Stores credentials in **HashiCorp Vault** (self-hosted or cloud)
- Supports token and AppRole authentication
- Audit logging via Vault
- Metadata tracking for all versions

## Frontend Components

### CloudProviderSelection
**Location**: `frontend/src/pages/CloudProviderSelection.jsx`
- Landing page with provider cards
- Displays provider information, features, and icons
- Fetches provider metadata from backend
- Routes to credential form on selection

**Props**: None (uses React Router)

### CloudCredentialForms
**Location**: `frontend/src/components/CloudCredentialForm/`

#### AWSCredentialForm.jsx
- Fields: name, accessKeyId, secretAccessKey, region, description
- Validation: AKIA format for access key, min 40 chars for secret
- Regions: 11 AWS regions supported

#### AzureCredentialForm.jsx
- Fields: name, subscriptionId, clientId, clientSecret, tenantId, vaultName, region
- Validation: UUID format for IDs, vault name (3-24 alphanumeric)
- Regions: 8 Azure regions supported

#### GCPCredentialForm.jsx
- Fields: name, projectId, serviceAccountKey (JSON), region
- Validation: Project ID format, valid JSON with service_account type
- Regions: 7 GCP regions supported

#### DigitalOceanCredentialForm.jsx
- Fields: name, apiToken, region, description
- Validation: Min 40 chars for token
- Regions: 11 DigitalOcean regions supported

#### LinodeCredentialForm.jsx
- Fields: name, apiToken, region, description
- Validation: Min 40 chars for token
- Regions: 10 Linode regions supported

### DeploymentWizardMultiCloud
**Location**: `frontend/src/pages/DeploymentWizardMultiCloud.jsx` (to be created)
- Multi-step wizard for deployment configuration
- Cloud-agnostic common options
- Cloud-specific advanced options
- Real-time validation

**Planned Steps**:
1. Select credential and cloud-specific settings
2. Configure cluster (name, Kubernetes version)
3. Configure nodes (count, instance type, autoscaling)
4. Configure storage (block, file, object)
5. Configure database (RDS/CloudSQL/Azure Database)
6. Configure monitoring and logging
7. Review and deploy

## Terraform Structure

### Multi-Provider Setup
**Location**: `terraform/providers.tf`
```hcl
# All providers declared conditionally
terraform {
  required_providers {
    aws = { source = "hashicorp/aws" }
    azurerm = { source = "hashicorp/azurerm" }
    google = { source = "hashicorp/google" }
  }
}

# Providers use count or conditional expressions
provider "aws" {
  count = var.cloud_provider == "aws" ? 1 : 0
  region = var.region
}

provider "azurerm" {
  count = var.cloud_provider == "azure" ? 1 : 0
  features {}
}

# Resources use count
resource "aws_eks_cluster" "cluster" {
  count = var.cloud_provider == "aws" ? 1 : 0
  # ...
}

resource "azurerm_kubernetes_cluster" "cluster" {
  count = var.cloud_provider == "azure" ? 1 : 0
  # ...
}
```

### Module Structure
**Location**: `terraform/modules/`

```
modules/
├── kubernetes_cluster/
│   ├── main.tf        # EKS/AKS/GKE resource definitions
│   ├── variables.tf   # Common cluster variables
│   └── outputs.tf     # kubeconfig, cluster endpoint
├── storage/
│   ├── block_storage/     # EBS/Azure Disk/Persistent Disk
│   ├── file_storage/      # EFS/Azure Files/Filestore
│   └── object_storage/    # S3/Blob Storage/GCS
├── database/
│   ├── rds/           # AWS RDS (PostgreSQL, MySQL)
│   ├── azure_db/      # Azure Database for PostgreSQL
│   ├── cloudsql/      # Google Cloud SQL
│   └── shared_vars.tf # Common database variables
├── monitoring/
│   ├── cloudwatch.tf      # AWS CloudWatch
│   ├── azure_monitor.tf   # Azure Monitor
│   ├── stackdriver.tf     # Google Stackdriver
│   └── shared_vars.tf
└── networking/
    ├── vpc.tf         # VPC/VNet/VPC equivalent
    └── security.tf    # Security groups, firewalls
```

### Environment-Specific Wrappers
**Location**: `terraform/environments/`

```
environments/
├── aws/
│   ├── main.tf     # Calls modules with AWS-specific values
│   ├── terraform.tfvars (generated)
│   └── provider_config.tf
├── azure/
│   ├── main.tf     # Calls modules with Azure-specific values
│   └── ...
├── gcp/
│   ├── main.tf     # Calls modules with GCP-specific values
│   └── ...
├── digitalocean/
│   ├── main.tf     # Uses Terraform DO provider
│   └── ...
└── linode/
    ├── main.tf     # Uses Terraform Linode provider
    └── ...
```

## API Endpoints

### New Multi-Cloud Endpoints

#### Get Supported Cloud Providers
```http
GET /api/deployments/providers
Response: {
  status: 'success',
  data: [
    {
      id: 'aws',
      name: 'Amazon Web Services',
      icon: '☁️',
      regions: ['us-east-1', ...],
      credentialsRequired: [...]
    },
    ...
  ]
}
```

#### Create Credential (Multi-Cloud)
```http
POST /api/credentials
Body: {
  name: string,
  cloudProvider: 'aws' | 'azure' | 'gcp' | 'digitalocean' | 'linode',
  // Cloud-specific fields based on provider
  awsAccessKeyId: string,     // for AWS
  azureSubscriptionId: string, // for Azure
  gcpServiceAccountKey: JSON,  // for GCP
  apiToken: string            // for DO/Linode
}
Response: {
  status: 'success',
  data: {
    id: UUID,
    cloudProvider: 'aws',
    vaultType: 'aws-secrets',
    secretRefId: 'arn:aws:secretsmanager:...',
    // Encrypted data NOT returned
  }
}
```

#### Create Deployment (Multi-Cloud)
```http
POST /api/deployments
Body: {
  credentialId: UUID,
  cloudProvider: 'aws' | 'azure' | 'gcp' | 'digitalocean' | 'linode',
  clusterName: string,
  kubernetesVersion: string,
  nodeCount: number,
  nodeInstanceType: string,
  enableAutoscaling: boolean,
  minNodeCount: number,
  maxNodeCount: number,
  enableMonitoring: boolean,
  enableRDS: boolean,
  enableStorage: boolean,
  // Cloud-specific options
  vpcCidr?: string, // AWS
  resourceGroup?: string, // Azure
  projectId?: string, // GCP
}
Response: {
  status: 'success',
  data: {
    id: UUID,
    cloudProvider: 'aws',
    status: 'pending',
    progress: 0,
    currentPhase: 0,
  }
}
```

#### WebSocket: Real-time Deployment Logs
```javascript
// Frontend connects to:
ws://localhost:3001/deployments/:id/logs

// Receives events like:
{
  type: 'log',
  phase: 3,
  message: 'Creating EKS cluster eks-prod-001...',
  timestamp: '2025-01-19T...'
}

{
  type: 'phase_complete',
  phase: 3,
  duration: 120,
  timestamp: '2025-01-19T...'
}

{
  type: 'progress',
  current: 30,
  total: 100,
  timestamp: '2025-01-19T...'
}

{
  type: 'complete' | 'error',
  status: 'completed' | 'failed',
  timestamp: '2025-01-19T...'
}
```

## Security

### Credential Storage
- ✅ **Credentials NEVER stored in PostgreSQL** in any form
- ✅ Only **reference IDs** stored (ARN, path, secret name)
- ✅ Credentials immediately written to cloud-native vaults
- ✅ Each cloud provider's native encryption used
- ✅ Audit logging for all credential access

### Access Control
- ✅ JWT-based authentication (unchanged)
- ✅ RBAC: admin/operator/viewer roles
- ✅ Credentials only accessible to owning user
- ✅ Deployments only accessible to owner + org members
- ✅ Audit trail for all operations

### Encryption in Transit
- ✅ HTTPS for all frontend ↔ backend communication
- ✅ WSS (WebSocket Secure) for log streaming
- ✅ TLS 1.3 minimum

## Deployment Phases (Cross-Cloud)

1. **Prepare Environment** - Install tools, set variables
2. **Create Network** - VPC/VNet/VPC equivalent
3. **Create Cluster** - EKS/AKS/GKE/DOKS/LKE
4. **Create Nodes** - Node pools/groups
5. **Install CNI** - Network plugin (Calico/Cilium)
6. **Create Storage** - Block + File + Object
7. **Create Database** - RDS/CloudSQL/Azure Database
8. **Configure RBAC** - Service accounts, roles
9. **Install Monitoring** - CloudWatch/Monitor/Stackdriver
10. **Install Logging** - Container logging
11. **Post-Deployment** - Validation, outputs

## Environment Variables

```bash
# Multi-Cloud
CLOUD_PROVIDER=aws|azure|gcp|digitalocean|linode
TERRAFORM_VERSION=1.5.0+
VAULT_ADDR=http://localhost:8200 (for DO/Linode)

# AWS
AWS_ACCESS_KEY_ID=***
AWS_SECRET_ACCESS_KEY=***
AWS_REGION=us-east-1

# Azure
AZURE_SUBSCRIPTION_ID=***
AZURE_CLIENT_ID=***
AZURE_CLIENT_SECRET=***
AZURE_TENANT_ID=***
AZURE_KEYVAULT_NAME=***

# GCP
GOOGLE_PROJECT_ID=***
GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json

# DigitalOcean / Linode
DIGITALOCEAN_TOKEN=*** or LINODE_TOKEN=***
```

## Development Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Terraform 1.5+
- Docker + Docker Compose
- Git

### Install & Run

```bash
# Clone repository
git clone <repo>
cd automated-multi-cloud-deployer

# Install dependencies
cd backend && npm install
cd ../frontend && npm install && cd ..

# Setup environment
cp .env.example .env
# Edit .env with your cloud credentials

# Start with Docker Compose
docker-compose up -d

# Run migrations
cd backend && npm run db:migrate && npm run db:seed

# Start development
npm run dev:backend
npm run dev:frontend
```

### Local Testing

```bash
# Test AWS credential storage
curl -X POST http://localhost:3001/api/credentials \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My AWS Creds",
    "cloudProvider": "aws",
    "accessKeyId": "AKIA...",
    "secretAccessKey": "..."
  }'

# Test deployment creation
curl -X POST http://localhost:3001/api/deployments \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "credentialId": "...",
    "cloudProvider": "aws",
    "clusterName": "test-cluster"
  }'
```

## Monitoring & Logging

### Backend Logs
- File: `backend/logs/combined.log`
- Format: JSON with timestamp, level, message, metadata
- Levels: error, warn, info, debug, trace

### Audit Logs
- Table: `audit_logs`
- Tracks: credential access, deployment lifecycle
- Immutable: Cannot be deleted

### Deployment Logs
- Stored in deployment results
- Includes Terraform output, phase durations
- Accessible via `/api/deployments/:id/logs`

## Troubleshooting

### Credential Validation Fails
1. Check cloud provider API token is correct
2. Verify IAM permissions (AWS) / Service Principal (Azure)
3. Ensure region is correct for that provider
4. Check network connectivity to cloud provider API

### Terraform Apply Fails
1. Check Terraform logs in deployment details
2. Verify resource quotas in cloud account
3. Check IAM permissions for resource creation
4. Review cloud provider documentation for error code

### WebSocket Logs Not Streaming
1. Check WebSocket connection: `ws://localhost:3001`
2. Verify JWT token still valid
3. Check browser console for connection errors
4. Ensure CORS headers are correct

## References

- Terraform AWS Provider: https://registry.terraform.io/providers/hashicorp/aws
- Terraform Azure Provider: https://registry.terraform.io/providers/hashicorp/azurerm
- Terraform Google Provider: https://registry.terraform.io/providers/hashicorp/google
- AWS Secrets Manager: https://aws.amazon.com/secrets-manager/
- Azure Key Vault: https://azure.microsoft.com/services/key-vault/
- Google Secret Manager: https://cloud.google.com/secret-manager
- HashiCorp Vault: https://www.vaultproject.io/
- Terraform Cloud: https://terraform.cloud/

## License

MIT License - See LICENSE file for details
