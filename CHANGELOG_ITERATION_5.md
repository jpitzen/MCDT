# Changelog - Iteration 5

**Date:** November 26, 2025  
**Issue Reference:** DeploymentWizard-issues-202511261605.txt  
**Focus:** Deployment Mode Selection, Resource Groups, and All 5 Cloud Providers Support

---

## Summary

This iteration implements a comprehensive improvement to the deployment wizard, adding:
1. Deployment mode selection (New vs Adding to Existing infrastructure)
2. Resource group configuration for all 5 cloud providers
3. Full support for DigitalOcean and Linode in the Credentials Manager
4. Infrastructure discovery for existing deployments

---

## Files Modified

### Frontend

#### `frontend/src/pages/DeploymentWizardMultiCloud.jsx`

**Added Imports:**
- `Switch`, `FormControl`, `InputLabel`, `Select`, `MenuItem`, `Divider`, `AlertTitle` from MUI
- `AddCircleOutlineIcon`, `CloudSyncIcon` from MUI icons

**Updated Steps Array:**
```javascript
const steps = [
  'Deployment Mode',      // NEW - Step 0
  'Select Credentials',   // Was Step 0, now Step 1
  'Resource Group',       // NEW - Step 2
  'Cluster Configuration',
  'Compute Resources',
  'Networking Configuration',
  'Storage Configuration',
  'Database Configuration',
  'Database Scripts',
  'Monitoring & Logging',
  'Tags',
  'Review & Deploy',
];
```

**Added State Variables:**
- `discoveredInfrastructure` - Holds discovered VPCs, subnets, security groups
- `discoveryLoading` - Loading indicator for infrastructure discovery

**Added FormData Fields:**
```javascript
// Deployment Mode
deploymentMode: 'new',  // 'new' or 'existing'

// Resource Group Configuration
resourceGroupName: '',
resourceGroupDescription: '',
useExistingResourceGroup: false,
existingResourceGroupId: '',

// Infrastructure Discovery (for existing mode)
existingVpcId: '',
existingSubnetIds: [],
existingSecurityGroupIds: [],
```

**Added Functions:**
- `discoverInfrastructure()` - Calls `/infrastructure/discover/:credentialId` API

**Updated Functions:**
- `handleNext()` - Now async, triggers infrastructure discovery after credential selection in existing mode
- Deployment config now includes deployment mode and resource group fields

**Added Step Components:**
- **Step 0: Deployment Mode** - Visual card selection for New vs Existing
- **Step 2: Resource Group** - Resource group name/description, VPC selection for existing mode

---

#### `frontend/src/pages/CredentialsManager.jsx`

**Added Imports:**
- `DigitalOceanCredentialForm` from '../components/credentials/DigitalOceanCredentialForm'
- `LinodeCredentialForm` from '../components/credentials/LinodeCredentialForm'

**Added Provider Colors:**
```javascript
digitalocean: '#0080FF',
linode: '#00A95C',
```

**Added Form Switch Cases:**
- `case 'digitalocean':` returns `<DigitalOceanCredentialForm />`
- `case 'linode':` returns `<LinodeCredentialForm />`

**Added Buttons:**
- "Add DigitalOcean" button with DigitalOcean icon
- "Add Linode" button with Linode icon

---

### Documentation

#### `docs/ADDING_TO_EXISTING_INFRASTRUCTURE_FLOW.md` (Created)

Documents the current code execution path for adding resources to existing infrastructure, including:
- Component interaction flow
- Current implementation problems
- Proposed solutions

#### `docs/DEPLOYMENT_MODE_PROPOSAL.md` (Created)

Detailed proposal for deployment mode selection including:
- Mode selection (New vs Existing)
- Resource group configuration
- Infrastructure discovery API
- Resource group mechanisms per cloud provider

#### `docs/deployment-wizard-guide.md` (Updated to v16)

- Updated to 12-step wizard
- Added Step 1: Deployment Mode documentation
- Added Step 3: Resource Group Configuration documentation
- Added Step 9: Database Scripts documentation
- Added Step 11: Tags documentation
- Renumbered all existing steps (+2)
- Updated changelog with v16 features

---

## API Endpoints Required (Backend)

### Infrastructure Discovery

```
GET /api/infrastructure/discover/:credentialId
```

**Response:**
```json
{
  "vpcs": [
    { "id": "vpc-123", "name": "main-vpc", "cidr": "10.0.0.0/16" }
  ],
  "subnets": [
    { "id": "subnet-456", "name": "public-a", "cidr": "10.0.1.0/24", "type": "public" }
  ],
  "securityGroups": [
    { "id": "sg-789", "name": "default" }
  ],
  "resourceGroups": [
    { "id": "rg-001", "name": "production", "location": "us-east-1" }
  ]
}
```

**Note:** This endpoint needs to be implemented in the backend.

---

## Resource Group Mechanisms by Provider

| Provider | Mechanism | Tag/Label Key |
|----------|-----------|---------------|
| AWS | Resource Groups + Tags | `zlaws:ResourceGroup` |
| Azure | Resource Groups (native) | Resource Group name |
| GCP | Labels + Folders | `zlaws-resource-group` |
| DigitalOcean | Projects | Project name |
| Linode | Tags | `zlaws-resource-group:name` |

---

## Testing Notes

1. **Deployment Mode Selection:**
   - Default is "new" mode
   - Clicking cards should toggle between modes
   - "Existing" mode shows info alert about discovery

2. **Credential Selection:**
   - All 5 providers now have "Add" buttons
   - DigitalOcean and Linode forms should render

3. **Resource Group Step:**
   - Shows different helper text per cloud provider
   - Toggle for using existing vs creating new
   - VPC dropdown populated from discovered infrastructure

4. **Step Navigation:**
   - Steps now numbered 0-11 (12 total)
   - Validation updated for new step indices

---

## Known Limitations

1. **Backend API Not Yet Implemented:**
   - `/api/infrastructure/discover/:credentialId` needs implementation
   - Discovery will fail gracefully with empty data

2. **Resource Group CRUD:**
   - Backend endpoints for resource group management not yet created
   - Currently just passes data to deployment config

3. **Existing VPC Selection:**
   - Subnet and security group multi-select not yet implemented
   - Only VPC selection is available

---

## Next Steps

1. Implement backend infrastructure discovery API
2. Add multi-select for subnets in existing mode
3. Add resource group CRUD endpoints
4. Update Terraform templates to use existing resources
5. Add cost estimation for existing infrastructure (reduced costs)
