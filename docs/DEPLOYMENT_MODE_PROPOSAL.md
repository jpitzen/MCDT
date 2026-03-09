# Deployment Mode Proposal: New Infrastructure vs. Add to Existing

## Executive Summary

This proposal addresses three major gaps in the current deployment wizard:

1. **No "deployment mode" choice** - Users can't easily indicate new vs. existing infrastructure
2. **No resource group/tagging strategy** - Resources are scattered without logical grouping
3. **Missing cloud providers** - DigitalOcean and Linode aren't available in credential management

---

## 1. Deployment Mode Selection

### Current Problem
Users must manually set `createVpc: false` and provide VPC IDs. There's no clear UX distinction between creating new infrastructure and adding to existing.

### Proposed Solution: Two-Mode Wizard

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      DEPLOYMENT MODE SELECTION                              │
│                         (New Step 1 in Wizard)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────┐    ┌─────────────────────────────────┐    │
│  │                             │    │                                 │    │
│  │     🆕 NEW DEPLOYMENT       │    │  ➕ ADD TO EXISTING             │    │
│  │                             │    │                                 │    │
│  │  Create new infrastructure  │    │  Deploy into existing           │    │
│  │  from scratch including:    │    │  infrastructure:                │    │
│  │                             │    │                                 │    │
│  │  • New VPC/VNet/VPC         │    │  • Use existing VPC             │    │
│  │  • New Subnets              │    │  • Use existing subnets         │    │
│  │  • New Gateways             │    │  • Add to resource group        │    │
│  │  • New Resource Group       │    │  • Discover existing resources  │    │
│  │                             │    │                                 │    │
│  │  [SELECT]                   │    │  [SELECT]                       │    │
│  └─────────────────────────────┘    └─────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### "Add to Existing" Flow

When user selects "Add to Existing":

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DISCOVER EXISTING INFRASTRUCTURE                         │
│                         (Runs AWS/Azure/GCP API)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Region: [us-west-1 ▼]        [🔍 DISCOVER]                                │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│  DISCOVERED RESOURCES                                                       │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  VPCs Found:                                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ○ vpc-12345678  │ 10.0.0.0/16  │ prod-vpc      │ 4 subnets        │   │
│  │ ○ vpc-87654321  │ 172.16.0.0/16│ dev-vpc       │ 2 subnets        │   │
│  │ ● vpc-abcdef12  │ 10.1.0.0/16  │ staging-vpc   │ 6 subnets ✓      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Subnets in vpc-abcdef12:                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ☑ subnet-111  │ 10.1.1.0/24 │ us-west-1a │ Private │ Available    │   │
│  │ ☑ subnet-222  │ 10.1.2.0/24 │ us-west-1c │ Private │ Available    │   │
│  │ ☐ subnet-333  │ 10.1.3.0/24 │ us-west-1a │ Public  │ In Use       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Existing EKS Clusters:                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ⚠ prod-cluster  │ v1.28 │ Running │ (name conflict warning)       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Existing RDS Instances:                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ℹ prod-db  │ postgres 15.4 │ db.r5.large │ Same VPC ✓             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│                                           [CONTINUE WITH SELECTED →]        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Resource Groups / Tagging Strategy

### Cloud-Specific Resource Grouping

| Cloud | Resource Grouping Mechanism | Tag Key |
|-------|----------------------------|---------|
| **AWS** | Resource Groups + Tags | `zlaws:ResourceGroup` |
| **Azure** | Native Resource Groups | N/A (built-in) |
| **GCP** | Labels + Folders | `zlaws-resource-group` |
| **DigitalOcean** | Tags + Projects | `zlaws-resource-group` |
| **Linode** | Tags | `zlaws-resource-group` |

### Proposed Data Model

```javascript
// New field in DeploymentDraft and Deployment models
{
  resourceGroup: {
    name: "prod-k8s-cluster-01",           // User-defined name
    description: "Production EKS cluster", 
    cloudResourceGroupId: "rg-12345",      // Cloud-specific ID (Azure)
    tags: {
      "zlaws:ResourceGroup": "prod-k8s-cluster-01",
      "zlaws:Environment": "production",
      "zlaws:ManagedBy": "zlaws-deployer",
      "zlaws:CreatedAt": "2025-11-27T12:00:00Z"
    }
  }
}
```

### AWS Resource Group Creation

```hcl
# New file: terraform/modules/aws_resource_group/main.tf

resource "aws_resourcegroups_group" "deployment" {
  name        = var.resource_group_name
  description = var.description

  resource_query {
    query = jsonencode({
      ResourceTypeFilters = ["AWS::AllSupported"]
      TagFilters = [
        {
          Key    = "zlaws:ResourceGroup"
          Values = [var.resource_group_name]
        }
      ]
    })
  }

  tags = merge(var.common_tags, {
    "zlaws:ResourceGroup" = var.resource_group_name
  })
}
```

### Resource Group in Wizard

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        RESOURCE GROUP CONFIGURATION                         │
│                           (New Step in Wizard)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Deployment Mode: [New Infrastructure]                                      │
│                                                                             │
│  ══════════════════════════════════════════════════════════════════════    │
│  RESOURCE GROUP                                                             │
│  ══════════════════════════════════════════════════════════════════════    │
│                                                                             │
│  ○ Create New Resource Group                                                │
│    Name: [prod-eks-cluster-01_____________]                                 │
│    Description: [Production EKS cluster with RDS and EFS_______________]   │
│                                                                             │
│  ○ Use Existing Resource Group (Add to Existing mode only)                  │
│    [Select existing group ▼]                                                │
│                                                                             │
│  ══════════════════════════════════════════════════════════════════════    │
│  AUTOMATIC TAGS (Applied to all resources)                                  │
│  ══════════════════════════════════════════════════════════════════════    │
│                                                                             │
│  ┌──────────────────────┬──────────────────────────────────────────────┐   │
│  │ Key                  │ Value                                        │   │
│  ├──────────────────────┼──────────────────────────────────────────────┤   │
│  │ zlaws:ResourceGroup  │ prod-eks-cluster-01 (auto)                   │   │
│  │ zlaws:Environment    │ [production ▼]                               │   │
│  │ zlaws:Owner          │ [jpitzen@zlti.com] (from user)               │   │
│  │ zlaws:CostCenter     │ [______________] (optional)                  │   │
│  │ zlaws:Project        │ [______________] (optional)                  │   │
│  └──────────────────────┴──────────────────────────────────────────────┘   │
│                                                                             │
│  [+ Add Custom Tag]                                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Missing Cloud Providers in Credentials

### Current State

**CloudProviderSelection.jsx** - Has all 5 providers ✅
**CredentialsManager.jsx** - Only shows AWS, Azure, GCP ❌

### Fix Required

```jsx
// frontend/src/pages/CredentialsManager.jsx
// Current (lines ~150-170) - Only 3 providers

// NEEDED: Add DigitalOcean and Linode
import { DigitalOceanCredentialForm, LinodeCredentialForm } from '../components/CloudCredentialForm';

const cloudProviders = [
  { id: 'aws', name: 'Amazon Web Services', icon: '🔶', color: '#FF9900' },
  { id: 'azure', name: 'Microsoft Azure', icon: '🔷', color: '#0078D4' },
  { id: 'gcp', name: 'Google Cloud Platform', icon: '🔴', color: '#4285F4' },
  { id: 'digitalocean', name: 'DigitalOcean', icon: '🔵', color: '#0080FF' },  // ADD
  { id: 'linode', name: 'Linode', icon: '🟢', color: '#00A95C' },              // ADD
];

// In renderCredentialForm():
const renderCredentialForm = () => {
  switch (selectedProvider) {
    case 'aws': return <AWSCredentialForm onSubmit={handleSubmitCredential} />;
    case 'azure': return <AzureCredentialForm onSubmit={handleSubmitCredential} />;
    case 'gcp': return <GCPCredentialForm onSubmit={handleSubmitCredential} />;
    case 'digitalocean': return <DigitalOceanCredentialForm onSubmit={handleSubmitCredential} />;
    case 'linode': return <LinodeCredentialForm onSubmit={handleSubmitCredential} />;
    default: return null;
  }
};
```

---

## 4. Implementation Plan

### Phase 1: Fix Missing Providers (Quick Win)
- [ ] Update `CredentialsManager.jsx` to include DigitalOcean and Linode
- [ ] Verify credential forms work for all 5 providers
- [ ] Update backend validation for all providers

### Phase 2: Deployment Mode Selection
- [ ] Create `DeploymentModeSelection.jsx` component
- [ ] Add "New" vs "Add to Existing" choice as Step 0
- [ ] Update wizard navigation flow

### Phase 3: Infrastructure Discovery Service
- [ ] Create `backend/src/services/infrastructureDiscovery.js`
- [ ] AWS: Query VPCs, Subnets, EKS, RDS via AWS SDK
- [ ] Azure: Query VNets, Subnets, AKS, SQL via Azure SDK
- [ ] GCP: Query VPCs, Subnets, GKE, Cloud SQL via GCP SDK
- [ ] Create `/api/discover/:provider/:region` endpoint

### Phase 4: Resource Groups
- [ ] Create `terraform/modules/aws_resource_group/`
- [ ] Update deployment configuration model
- [ ] Add resource group to wizard
- [ ] Apply tags to all created resources

### Phase 5: Smart Defaults
- [ ] Auto-detect when region has existing ZLAWS resources
- [ ] Suggest "Add to Existing" when infrastructure found
- [ ] Pre-populate VPC/subnet selections

---

## 5. API Design for Infrastructure Discovery

### New Endpoints

```
GET /api/infrastructure/discover/:provider/:region
Authorization: Bearer <token>
X-Credential-Id: <credential-id>

Response:
{
  "success": true,
  "data": {
    "vpcs": [
      {
        "id": "vpc-12345678",
        "name": "prod-vpc",
        "cidr": "10.0.0.0/16",
        "isDefault": false,
        "tags": { "Environment": "production" },
        "subnets": [
          {
            "id": "subnet-111",
            "cidr": "10.0.1.0/24",
            "availabilityZone": "us-west-1a",
            "type": "private",
            "availableIps": 251
          }
        ]
      }
    ],
    "kubernetes": [
      {
        "name": "prod-cluster",
        "version": "1.28",
        "status": "ACTIVE",
        "vpcId": "vpc-12345678",
        "nodeCount": 3
      }
    ],
    "databases": [
      {
        "identifier": "prod-db",
        "engine": "postgres",
        "version": "15.4",
        "vpcId": "vpc-12345678",
        "status": "available"
      }
    ],
    "resourceGroups": [
      {
        "name": "prod-k8s-resources",
        "resourceCount": 15,
        "tags": { "zlaws:ResourceGroup": "prod-k8s-resources" }
      }
    ]
  }
}
```

---

## 6. Database Schema Changes

```sql
-- Add resource_group to deployment_drafts
ALTER TABLE deployment_drafts ADD COLUMN resource_group JSONB DEFAULT '{}';

-- Add resource_group to deployments
ALTER TABLE deployments ADD COLUMN resource_group JSONB DEFAULT '{}';

-- Add deployment_mode to deployment_drafts
ALTER TABLE deployment_drafts ADD COLUMN deployment_mode VARCHAR(20) 
  DEFAULT 'new' CHECK (deployment_mode IN ('new', 'add_to_existing'));

-- Add discovered_infrastructure to deployment_drafts (cache)
ALTER TABLE deployment_drafts ADD COLUMN discovered_infrastructure JSONB DEFAULT NULL;
```

---

## 7. Terraform Variable Changes

```hcl
# variables.tf additions

variable "deployment_mode" {
  type        = string
  description = "Whether this is a new deployment or adding to existing infrastructure"
  default     = "new"
  validation {
    condition     = contains(["new", "add_to_existing"], var.deployment_mode)
    error_message = "deployment_mode must be 'new' or 'add_to_existing'"
  }
}

variable "resource_group_name" {
  type        = string
  description = "Name for the resource group (AWS Resource Groups, Azure RG, etc.)"
  default     = ""
}

variable "resource_group_tags" {
  type        = map(string)
  description = "Additional tags to apply to all resources in the group"
  default     = {}
}

variable "existing_vpc_id" {
  type        = string
  description = "ID of existing VPC to use (when deployment_mode = add_to_existing)"
  default     = ""
}

variable "existing_subnet_ids" {
  type        = list(string)
  description = "IDs of existing subnets to use"
  default     = []
}
```

---

## 8. Updated Wizard Flow

```
CURRENT FLOW:
1. Select Credential → 2. Configure Cluster → 3. Review → 4. Deploy

NEW FLOW:
1. Select Credential
2. Deployment Mode (NEW)
   ├─ "New Infrastructure" → Continue to step 3
   └─ "Add to Existing" → Discover → Select Resources → Continue to step 3
3. Resource Group Configuration (NEW)
4. Configure Cluster
5. Configure Add-ons (RDS, VMs, etc.)
6. Review (shows resource group, mode, selected infrastructure)
7. Deploy
```

---

## 9. Benefits

| Benefit | Description |
|---------|-------------|
| **Clarity** | Users clearly understand whether they're creating new or adding to existing |
| **Discovery** | No more guessing VPC IDs - the system discovers and presents options |
| **Organization** | Resources are grouped logically with consistent tagging |
| **Cost Tracking** | Resource groups enable better cost allocation |
| **Cleanup** | Easy to find and destroy all resources in a deployment |
| **Multi-Cloud** | Same UX pattern works across all 5 cloud providers |

---

## 10. Immediate Actions

### Priority 1 (This Week)
1. Fix `CredentialsManager.jsx` to show all 5 providers
2. Add `deployment_mode` field to draft creation

### Priority 2 (Next Sprint)
3. Create infrastructure discovery service
4. Build VPC/subnet selection UI

### Priority 3 (Following Sprint)
5. Implement resource groups
6. Add tagging strategy
