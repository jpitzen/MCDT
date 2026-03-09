# Phase 4 — Wizard Integration & Access Mode UX
## Frontend Access Mode Step + Backend Wiring + DB Migration

**Priority**: P2 (user-facing feature, can partially proceed in parallel with Phase 2–3)
**Effort**: 4 days (2d frontend + 1d backend + 1d migration/integration)
**Sprint**: Week 7–8
**Prerequisites**: Phase 2 task 2.7 (access mode config templates), Phase 3 (deploy orchestrator)

---

## Objective

Add an "Access Mode" configuration step to the UnifiedDeploymentWizard's Phase 5 (Deploy), persist the choice in the database, and wire it through to the ZL manifest template engine so that generated manifests correctly branch between internal-only and external access configurations.

---

## Current Wizard Structure

```
UnifiedDeploymentWizard/
├── phases/
│   ├── Phase1Prerequisites/    ← Credentials + tools check
│   ├── Phase2Cluster/          ← Cluster config, network, container registry
│   ├── Phase3Database/         ← DB config + SQL scripts
│   ├── Phase4Storage/          ← StorageClasses, CSI drivers, S3
│   ├── Phase5Deploy/           ← Terraform preview, K8s deployment, verification
│   │   ├── index.jsx
│   │   ├── TerraformPreviewStep.jsx
│   │   ├── K8sDeployment.jsx
│   │   ├── ExecutionModeSelector.jsx
│   │   └── DeploymentVerification.jsx
│   └── Phase6Operations/       ← Port forwarding, monitoring
```

**WizardContext action naming convention**: `UPPER_SNAKE_CASE` with `SET_`/`UPDATE_`/`RESET_` prefixes, defined on `ACTION_TYPES` object.

---

## Tasks

### 4.1 — Database Migration: Add access mode fields to `deployments` table
**Effort**: 0.5 days

**File**: `backend/migrations/add-access-mode-fields.sql`

```sql
-- Migration: add-access-mode-fields
-- Date: 2026-03-XX

-- Access mode: internal (ClusterIP only) or external (LoadBalancer + SSL + DNS)
ALTER TABLE deployments ADD COLUMN IF NOT EXISTS access_mode VARCHAR(10) DEFAULT 'internal';

-- External access configuration (nullable, used when access_mode = 'external')
ALTER TABLE deployments ADD COLUMN IF NOT EXISTS external_domain VARCHAR(255);
ALTER TABLE deployments ADD COLUMN IF NOT EXISTS ssl_mode VARCHAR(10);       -- 'acm' | 'upload'
ALTER TABLE deployments ADD COLUMN IF NOT EXISTS ssl_cert_arn VARCHAR(255);  -- ACM certificate ARN

-- Add CHECK constraint for valid access_mode values
ALTER TABLE deployments ADD CONSTRAINT IF NOT EXISTS chk_access_mode 
  CHECK (access_mode IN ('internal', 'external'));
```

**Also update Sequelize model** (`backend/src/models/Deployment.js`):

Add fields at model definition level (after existing `configuration` field, ~line 70):
```javascript
access_mode: {
  type: DataTypes.STRING(10),
  defaultValue: 'internal',
  validate: { isIn: [['internal', 'external']] }
},
external_domain: {
  type: DataTypes.STRING(255),
  allowNull: true,
},
ssl_mode: {
  type: DataTypes.STRING(10),
  allowNull: true,
  validate: { isIn: [['acm', 'upload']] }
},
ssl_cert_arn: {
  type: DataTypes.STRING(255),
  allowNull: true,
},
```

**Acceptance criteria**:
- [ ] Migration is idempotent (uses `IF NOT EXISTS`)
- [ ] Follows existing migration naming convention (`backend/migrations/`)
- [ ] Sequelize model matches migration columns
- [ ] Default value `'internal'` ensures backward compatibility

---

### 4.2 — Frontend: Create `AccessModeConfig.jsx` component
**Effort**: 1 day

**File**: `frontend/src/pages/UnifiedDeploymentWizard/phases/Phase5Deploy/AccessModeConfig.jsx`

**Component structure**:
```jsx
import React from 'react';
import {
  Box, Typography, RadioGroup, Radio, FormControlLabel,
  TextField, Button, Alert, Collapse, Paper
} from '@mui/material';
import { useWizard, ACTION_TYPES } from '../../WizardContext';

const AccessModeConfig = () => {
  const { state, dispatch } = useWizard();
  
  const accessMode = state.accessMode || 'internal';
  const externalDomain = state.externalDomain || '';
  const sslMode = state.sslMode || 'acm';
  
  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6">Access Mode</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Choose how users will access this ZL deployment.
      </Typography>
      
      <RadioGroup
        value={accessMode}
        onChange={(e) => dispatch({ type: ACTION_TYPES.SET_ACCESS_MODE, payload: e.target.value })}
      >
        <Paper variant="outlined" sx={{ p: 2, mb: 1 }}>
          <FormControlLabel value="internal" control={<Radio />}
            label={
              <Box>
                <Typography variant="subtitle2">Internal Only</Typography>
                <Typography variant="caption" color="text.secondary">
                  Accessible within the cluster and via VPN/bastion only. No public DNS or SSL required.
                </Typography>
              </Box>
            }
          />
        </Paper>
        
        <Paper variant="outlined" sx={{ p: 2 }}>
          <FormControlLabel value="external" control={<Radio />}
            label={
              <Box>
                <Typography variant="subtitle2">External Access</Typography>
                <Typography variant="caption" color="text.secondary">
                  Publicly accessible via custom domain with SSL/TLS termination.
                </Typography>
              </Box>
            }
          />
        </Paper>
      </RadioGroup>
      
      <Collapse in={accessMode === 'external'}>
        <Box sx={{ mt: 2, pl: 4 }}>
          <TextField
            label="Domain Name"
            placeholder="zlpsaws.zlpsonline.com"
            value={externalDomain}
            onChange={(e) => dispatch({ type: ACTION_TYPES.SET_EXTERNAL_DOMAIN, payload: e.target.value })}
            fullWidth
            required
            helperText="FQDN that will resolve to this deployment"
            sx={{ mb: 2 }}
          />
          
          {/* SSL mode selection + cert upload fields */}
          {/* ... ACM ARN field or file upload buttons ... */}
        </Box>
      </Collapse>
      
      {accessMode === 'internal' && (
        <Alert severity="info" sx={{ mt: 2 }}>
          After deployment, use <code>kubectl port-forward svc/zlui-service 8080:8080</code> to access the application.
        </Alert>
      )}
    </Box>
  );
};

export default AccessModeConfig;
```

**Styling**: MUI v5 `sx` prop only (project convention — no CSS modules, no `styled()`).

**Acceptance criteria**:
- [ ] Radio group with Internal/External options
- [ ] External: domain field, SSL mode radio (ACM/Upload), conditional cert upload
- [ ] Internal: info Alert showing kubectl port-forward command
- [ ] All state managed via WizardContext dispatch
- [ ] Follows MUI v5 `sx` prop convention

---

### 4.3 — WizardContext: Add access mode action types and state
**Effort**: 0.5 days

**File**: `frontend/src/pages/UnifiedDeploymentWizard/WizardContext.jsx`

**New action types** (add to `ACTION_TYPES` object, ~line 260+):
```javascript
// Access Mode (Phase 5)
SET_ACCESS_MODE: 'SET_ACCESS_MODE',             // 'internal' | 'external'
SET_EXTERNAL_DOMAIN: 'SET_EXTERNAL_DOMAIN',     // string (FQDN)
SET_SSL_MODE: 'SET_SSL_MODE',                   // 'acm' | 'upload'
SET_SSL_CERT_ARN: 'SET_SSL_CERT_ARN',           // string (ACM ARN)
SET_SSL_CERT_FILE: 'SET_SSL_CERT_FILE',         // File object
SET_SSL_KEY_FILE: 'SET_SSL_KEY_FILE',           // File object
```

**New reducer cases** (add to `wizardReducer` switch):
```javascript
case ACTION_TYPES.SET_ACCESS_MODE:
  return { ...state, accessMode: action.payload };
case ACTION_TYPES.SET_EXTERNAL_DOMAIN:
  return { ...state, externalDomain: action.payload };
case ACTION_TYPES.SET_SSL_MODE:
  return { ...state, sslMode: action.payload };
case ACTION_TYPES.SET_SSL_CERT_ARN:
  return { ...state, sslCertArn: action.payload };
case ACTION_TYPES.SET_SSL_CERT_FILE:
  return { ...state, sslCertFile: action.payload };
case ACTION_TYPES.SET_SSL_KEY_FILE:
  return { ...state, sslKeyFile: action.payload };
```

**Initial state additions**:
```javascript
accessMode: 'internal',
externalDomain: '',
sslMode: 'acm',
sslCertArn: '',
sslCertFile: null,
sslKeyFile: null,
```

**Acceptance criteria**:
- [ ] 6 new action types follow `UPPER_SNAKE_CASE` convention
- [ ] Reducer handles all 6 new cases
- [ ] Initial state includes defaults
- [ ] `RESET_WIZARD` action clears access mode state

---

### 4.4 — Wire `AccessModeConfig` into Phase5Deploy
**Effort**: 0.25 days

**File**: `frontend/src/pages/UnifiedDeploymentWizard/phases/Phase5Deploy/index.jsx`

Import and render `AccessModeConfig` between `ExecutionModeSelector` (or `TerraformPreviewStep`) and `K8sDeployment`:

```jsx
import AccessModeConfig from './AccessModeConfig';

// In the phase's step flow:
// Step 1: TerraformPreviewStep (existing)
// Step 2: ExecutionModeSelector (existing)
// Step 3: AccessModeConfig (NEW)
// Step 4: K8sDeployment (existing)
// Step 5: DeploymentVerification (existing)
```

**Acceptance criteria**:
- [ ] `AccessModeConfig` renders in correct position within Phase 5
- [ ] Lazy-loaded (consistent with other phase components)
- [ ] Expert mode shows all fields; guided mode shows simplified version

---

### 4.5 — Backend: Accept access mode in deployment creation API
**Effort**: 0.5 days

**File**: `backend/src/routes/deployments.js`

Add validation for new fields in the `POST /` route validators (alongside existing `clusterName`, `cloudProvider`, etc.):

```javascript
body('accessMode')
  .optional()
  .isIn(['internal', 'external'])
  .withMessage('accessMode must be internal or external'),
body('externalDomain')
  .optional()
  .isFQDN()
  .withMessage('externalDomain must be a valid FQDN'),
body('sslMode')
  .optional()
  .isIn(['acm', 'upload'])
  .withMessage('sslMode must be acm or upload'),
body('sslCertArn')
  .optional()
  .matches(/^arn:aws:acm:/)
  .withMessage('sslCertArn must be a valid ACM ARN'),
```

**In the route handler**: Pass new fields to `deploymentService.createDeployment()` and persist to the model.

**Conditional validation**: When `accessMode === 'external'`, require `externalDomain`. When `sslMode === 'acm'`, require `sslCertArn`.

**Acceptance criteria**:
- [ ] Validation via `express-validator` inline (project pattern)
- [ ] Conditional validation (external requires domain)
- [ ] Persisted to deployment record
- [ ] Backward compatible (existing deployments default to `'internal'`)

---

### 4.6 — Backend: Pass access mode to ZL manifest config
**Effort**: 0.25 days

**File**: `backend/src/services/deploymentService.js` or `zlDeploymentOrchestrator.js`

When building the ZL manifest `config` object (from Phase 2), pull access mode fields from the deployment record:

```javascript
const zlConfig = {
  // ... other fields from deployment.configuration ...
  accessMode: deployment.access_mode || 'internal',
  externalDomain: deployment.external_domain,
  ssl: {
    mode: deployment.ssl_mode,
    certArn: deployment.ssl_cert_arn,
    // cert/key from uploaded files (stored in vault or filesystem)
  },
};
```

**Acceptance criteria**:
- [ ] Access mode flows from DB record → config object → manifest generator
- [ ] Single source of truth: `deployment.access_mode` determines all branching

---

### 4.7 — Phase 6 Operations: Post-deploy access information
**Effort**: 1 day

**File**: `frontend/src/pages/UnifiedDeploymentWizard/phases/Phase6Operations/index.jsx`

After deployment completes, display access instructions based on mode:

**Internal mode card**:
```
┌─ Access Information ──────────────────────────────┐
│ Mode: Internal Only                                │
│                                                    │
│ kubectl port-forward svc/zlui-service 8080:8080    │
│ URL: http://localhost:8080/ps                      │
│                                                    │
│ [Copy Command]                                     │
│                                                    │
│ ⓘ Accessible only via kubectl, VPN, or bastion     │
└────────────────────────────────────────────────────┘
```

**External mode card**:
```
┌─ Access Information ──────────────────────────────┐
│ Mode: External Access                              │
│                                                    │
│ URL: https://zlpsaws.zlpsonline.com/ps             │
│ DNS: CNAME zlpsaws.zlpsonline.com →                │
│      a0f6d05f1-xxxx.us-east-1.elb.amazonaws.com   │
│ SSL: Valid ✅                                       │
│                                                    │
│ [Open in Browser]  [Copy URL]                      │
│                                                    │
│ ⚠ Ensure DNS CNAME record is configured            │
└────────────────────────────────────────────────────┘
```

**Data source**: ELB hostname from `deployment.outputs` (populated by Phase 3 orchestrator after `zlui-service` LoadBalancer gets an external IP).

**Acceptance criteria**:
- [ ] Card displayed in Phase 6 after successful deployment
- [ ] Internal mode: shows kubectl command with copy button
- [ ] External mode: shows URL, DNS record, SSL status
- [ ] External mode: ELB hostname pulled from deployment outputs

---

## Files Created

| File | Purpose |
|------|---------|
| `frontend/src/pages/UnifiedDeploymentWizard/phases/Phase5Deploy/AccessModeConfig.jsx` | Access mode configuration component |
| `backend/migrations/add-access-mode-fields.sql` | DB migration for access mode columns |

## Files Modified

| File | Change |
|------|--------|
| `frontend/src/pages/UnifiedDeploymentWizard/WizardContext.jsx` | 6 new action types + reducer cases + initial state |
| `frontend/src/pages/UnifiedDeploymentWizard/phases/Phase5Deploy/index.jsx` | Import + render AccessModeConfig |
| `frontend/src/pages/UnifiedDeploymentWizard/phases/Phase6Operations/index.jsx` | Access info card |
| `backend/src/models/Deployment.js` | 4 new columns |
| `backend/src/routes/deployments.js` | Validation for new fields |
| `backend/src/services/deploymentService.js` | Pass access mode to ZL config |

---

## UX Mockup — Full Flow

```
Phase 5 Deploy
━━━━━━━━━━━━━━

  ✅ Step 1: Terraform Plan Preview
  ✅ Step 2: Execution Mode (production / dryRun / localTest)
  
  ▶ Step 3: Access Mode                    ← NEW
     ┌──────────────────────────────────┐
     │ ○ Internal Only                  │
     │ ● External Access                │
     │                                  │
     │ Domain: zlpsaws.zlpsonline.com   │
     │ SSL:    ● ACM  ○ Upload          │
     │ ARN:    arn:aws:acm:us-east-1:...│
     └──────────────────────────────────┘

  ○ Step 4: Deploy ZL Application
  ○ Step 5: Verify Deployment Health
```

---

## DG Coverage Impact

| Phase | Before | After |
|-------|:------:|:-----:|
| Phase 9 (Network/Ingress) | 40% | **65%** (access mode + services) |
