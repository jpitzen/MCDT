# Phase 3 Startup Guide: Terraform Execution & Orchestration

**This document is for the developer starting Phase 3 of the multi-cloud deployment platform.**

---

## Quick Start

### Current State (Phase 2 Complete)
✅ Deployment wizard collects configuration  
✅ API routes accept deployment requests  
✅ Terraform modules ready to deploy  
❌ Terraform execution not yet integrated  

### Your Goal (Phase 3)
✅ Execute Terraform based on configuration  
✅ Track deployment progress  
✅ Stream logs in real-time  
✅ Handle errors and rollback  

### Estimated Duration
- Terraform execution: 2-3 days
- Terraform Cloud integration: 2-3 days
- Testing & refinement: 1-2 days
- **Total**: 5-8 days

---

## Architecture Overview

### Current Flow
```
User fills wizard
    ↓
POST /api/deployments
    ↓
Deployment created in database
    ↓
User sees deployment ID
    ↓
❌ Nothing happens next
```

### After Phase 3
```
User fills wizard
    ↓
POST /api/deployments
    ↓
Deployment created in database
    ↓
POST /api/deployments/:id/start
    ↓
multiCloudOrchestrator.initiateDeployment()
    ↓
Terraform workspace created
    ↓
tfvars generated and uploaded
    ↓
terraform plan executed
    ↓
terraform apply executed
    ↓
GET /api/deployments/:id/logs shows progress
    ↓
Deployment completes
```

---

## Key Files to Understand

### Frontend
**`frontend/src/pages/DeploymentWizardMultiCloud.jsx`** (580 lines)
- Collects all deployment configuration
- Calls `POST /api/deployments` on submit
- Redirects to `/deployments/:id` after creation

**`frontend/src/pages/DeploymentStatus.jsx`**
- Needs to be updated (next phase) to show real-time status
- Should poll `/api/deployments/:id/logs` for updates
- Needs WebSocket support (Phase 4)

### Backend
**`backend/src/routes/deployments.js`** (Updated, 280 lines)
- `POST /api/deployments/:id/start` - Entry point for execution
- Calls `multiCloudOrchestrator.initiateDeployment()`
- This is where you'll add Terraform execution

**`backend/src/services/multiCloudOrchestrator.js`** (Updated, 370+ lines)
- `initiateDeployment()` - Currently returns metadata only
- `executeDeployment()` - Stub method, needs implementation
- `generateTerraformVars()` - Already generates cloud-specific variables
- `generateTfvarsContent()` - Already generates HCL content

**`backend/src/services/deploymentService.js`**
- May need updates to track deployment phases
- Will need to persist Terraform run information

### Terraform
**`terraform/modules/kubernetes_cluster/`**
- Multi-provider module supporting all 5 clouds
- Uses `count` for conditional resource creation
- Ready to execute

**`terraform/environments/aws/main.tf`** (AWS example)
- Shows how to use the multi-cloud module
- Pattern can be replicated for other clouds

---

## Implementation Roadmap

### Task 1: Add Terraform Execution Service

**File**: `backend/src/services/terraformExecutor.js` (NEW, 200+ lines)

```javascript
class TerraformExecutor {
  /**
   * Initialize Terraform working directory
   */
  async initTerraform(deploymentId, cloudProvider) {
    // 1. Create deployment directory: /tmp/deployments/{deploymentId}
    // 2. Copy terraform module files to directory
    // 3. Run: terraform init
    // 4. Return result
  }

  /**
   * Generate and write tfvars file
   */
  async writeTfvars(deploymentId, terraformVars) {
    // 1. Generate tfvars content from variables
    // 2. Write to {deploymentId}/terraform.tfvars
    // 3. Log path for debugging
  }

  /**
   * Execute terraform validate
   */
  async validateTerraform(deploymentId) {
    // 1. Run: terraform validate
    // 2. Parse output for errors
    // 3. Return validation result
  }

  /**
   * Execute terraform plan
   */
  async planTerraform(deploymentId) {
    // 1. Run: terraform plan -out=tfplan
    // 2. Capture output
    // 3. Return plan summary
  }

  /**
   * Execute terraform apply
   */
  async applyTerraform(deploymentId) {
    // 1. Run: terraform apply -auto-approve tfplan
    // 2. Stream output to logs
    // 3. Extract outputs
    // 4. Return result
  }

  /**
   * Execute terraform destroy (rollback)
   */
  async destroyTerraform(deploymentId) {
    // 1. Run: terraform destroy -auto-approve
    // 2. Capture output
    // 3. Update deployment status
  }
}
```

**Key Methods Needed**:
- `initTerraform()` - Setup working directory
- `writeTfvars()` - Generate variables file
- `validateTerraform()` - Validate configuration
- `planTerraform()` - Generate plan
- `applyTerraform()` - Execute plan
- `destroyTerraform()` - Cleanup
- `getWorkingDirectory()` - Helper for path
- `runCommand()` - Execute shell commands

**Dependencies**:
```javascript
const { execSync, spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');
```

### Task 2: Update multiCloudOrchestrator

**File**: `backend/src/services/multiCloudOrchestrator.js` (Update)

```javascript
// Add to existing class:

/**
 * Execute full deployment workflow
 */
async executeDeployment(deploymentId, cloudProvider, config) {
  // 1. Call terraformExecutor.initTerraform()
  // 2. Call terraformExecutor.writeTfvars()
  // 3. Call terraformExecutor.validateTerraform()
  // 4. Update deployment status: "planning"
  // 5. Call terraformExecutor.planTerraform()
  // 6. Update deployment status: "applying"
  // 7. Call terraformExecutor.applyTerraform()
  // 8. Extract outputs and save
  // 9. Update deployment status: "completed"
  // 10. Return result
}

/**
 * Get deployment logs from Terraform
 */
async getDeploymentLogs(deploymentId) {
  // 1. Read log file from working directory
  // 2. Return logs array
}
```

### Task 3: Update Deployment Routes

**File**: `backend/src/routes/deployments.js` (Update)

```javascript
// In POST /:id/start endpoint:

router.post(
  '/:id/start',
  authorize(['admin', 'operator']),
  asyncHandler(async (req, res) => {
    // ... existing code ...

    try {
      // NEW: Call orchestrator to execute Terraform
      const executionResult = await multiCloudOrchestrator.executeDeployment(
        deployment.id,
        deployment.cloudProvider,
        {
          ...deployment.configuration,
          credentialSecretRefId: deployment.credential.secretRefId,
        }
      );

      // Update deployment status to "deploying"
      await deployment.update({
        status: 'deploying',
        currentPhase: 3,
      });

      sendSuccess(res, { data: executionResult }, 200);
    } catch (error) {
      // Update deployment status to "failed"
      await deployment.update({
        status: 'failed',
        currentPhase: 0,
      });
      sendError(res, error.message, 500, 'EXECUTION_ERROR');
    }
  })
);
```

### Task 4: Implement Deployment Service Updates

**File**: `backend/src/services/deploymentService.js` (Update)

```javascript
// Add phase tracking methods:

async updateDeploymentPhase(deploymentId, phase, status) {
  // Update deployment status and current phase
}

async addDeploymentLog(deploymentId, logEntry) {
  // Append log entry to deployment logs
  // Store in database or file system
}

async getDeploymentLogs(deploymentId) {
  // Retrieve all logs for deployment
}

async completeDeployment(deploymentId, outputs) {
  // Mark as completed
  // Store Terraform outputs
  // Extract connection info
}

async failDeployment(deploymentId, error) {
  // Mark as failed
  // Store error message
  // Allow rollback
}
```

### Task 5: Create Test Scripts

**File**: `scripts/test-terraform-local.sh` (NEW)

```bash
#!/bin/bash
# Test script to verify Terraform execution without cloud providers

DEPLOYMENT_ID="test-$(date +%s)"
CLOUD_PROVIDER="aws"

# 1. Test Terraform initialization
echo "Testing Terraform init..."
terraform -chdir=terraform init

# 2. Test validation
echo "Testing Terraform validate..."
terraform -chdir=terraform validate

# 3. Test plan
echo "Testing Terraform plan..."
terraform -chdir=terraform plan \
  -var="cloud_provider=$CLOUD_PROVIDER" \
  -var="cluster_name=test-cluster" \
  -out=tfplan

echo "✅ All tests passed!"
```

**File**: `scripts/test-execution.sh` (NEW)

```bash
#!/bin/bash
# Test the Terraform executor service

API_URL="http://localhost:3000/api"
CLUSTER_NAME="test-$(date +%s)"

# 1. Create credential (must exist first)
CREDENTIAL_ID="xxx-xxx-xxx"

# 2. Create deployment
DEPLOY_RESPONSE=$(curl -X POST "$API_URL/deployments" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "credentialId": "'$CREDENTIAL_ID'",
    "cloudProvider": "aws",
    "clusterName": "'$CLUSTER_NAME'",
    "kubernetesVersion": "1.27",
    "nodeCount": 3
  }')

DEPLOYMENT_ID=$(echo $DEPLOY_RESPONSE | jq -r '.data.id')
echo "Created deployment: $DEPLOYMENT_ID"

# 3. Start deployment
curl -X POST "$API_URL/deployments/$DEPLOYMENT_ID/start" \
  -H "Authorization: Bearer $TOKEN"

# 4. Poll for logs
for i in {1..30}; do
  sleep 10
  curl -X GET "$API_URL/deployments/$DEPLOYMENT_ID/logs" \
    -H "Authorization: Bearer $TOKEN"
  
  STATUS=$(curl -s -X GET "$API_URL/deployments/$DEPLOYMENT_ID" \
    -H "Authorization: Bearer $TOKEN" | jq -r '.data.status')
  
  echo "Status: $STATUS"
  
  if [ "$STATUS" = "completed" ] || [ "$STATUS" = "failed" ]; then
    break
  fi
done
```

---

## Integration Points

### Deployment Model Updates

The `Deployment` model needs additional fields:

```javascript
// In backend/src/models/Deployment.js, add:

terraformWorkingDir: STRING,      // Path to terraform directory
terraformStateId: STRING,          // Terraform state identifier
terraformOutputs: JSON,            // Cluster connection info
deploymentLogs: TEXT,              // Concatenated logs
startedAt: DATE,                   // When deployment started
completedAt: DATE,                 // When deployment finished
failureReason: TEXT,               // Error message if failed
```

### Environment Variables Needed

```bash
# Add to .env:
TERRAFORM_WORKING_DIR=/tmp/terraform-deployments
TERRAFORM_BINARY=/usr/local/bin/terraform
LOG_LEVEL=debug
DEPLOYMENT_TIMEOUT=3600  # 1 hour
```

### Error Handling

Key errors to handle:
- Terraform not found
- Invalid working directory
- Insufficient credentials
- Cloud provider errors
- Network timeouts
- Invalid configuration

```javascript
class TerraformError extends Error {
  constructor(message, code, details) {
    super(message);
    this.code = code;
    this.details = details;
  }
}
```

---

## Testing Checklist

### Unit Tests
- [ ] TerraformExecutor initialization
- [ ] tfvars file generation
- [ ] Command execution helpers
- [ ] Error handling
- [ ] Log parsing

### Integration Tests
- [ ] Full workflow execution
- [ ] Terraform error handling
- [ ] Deployment status updates
- [ ] Log persistence
- [ ] Cleanup on failure

### E2E Tests
- [ ] Create deployment via wizard
- [ ] Start deployment
- [ ] Monitor progress
- [ ] Verify logs
- [ ] Check outputs

### Manual Testing
- [ ] Test with AWS (terraform plan only)
- [ ] Test with Azure (terraform plan only)
- [ ] Test error scenarios
- [ ] Test network interruption
- [ ] Test timeout handling

---

## Security Considerations

### Credential Handling
✅ Retrieve credentials from vault before Terraform
✅ Pass credentials as environment variables (not files)
✅ Clear credentials after use
✅ Never log sensitive data

### Access Control
✅ Require auth token for all operations
✅ Verify user owns the deployment
✅ Check RBAC permissions
✅ Audit all operations

### Error Messages
⚠️ Don't expose credential details in errors
⚠️ Don't expose full terraform output in API
⚠️ Log full output server-side only
⚠️ Sanitize errors before returning

---

## Performance Optimization

### Async Processing
Consider making Terraform execution async:
```javascript
// Instead of waiting for Terraform:
router.post('/:id/start', async (req, res) => {
  // Start execution in background
  executeDeploymentAsync(deploymentId);
  
  // Return immediately
  res.json({ status: 'accepted', deploymentId });
});
```

### Parallel Execution
- Multiple deployments can run simultaneously
- Use separate working directories
- Lock file prevents conflicts
- Monitor resource usage

### Caching
- Cache provider plugins (terraform init is slow)
- Cache module downloads
- Consider shared cache across deployments

---

## Terraform Cloud Integration (Alternative)

Instead of local Terraform, you can use Terraform Cloud:

### Advantages
✅ No local state management
✅ Built-in plan/apply workflow
✅ Runs in Terraform Cloud infrastructure
✅ Better for team collaboration

### Implementation
1. Create Terraform Cloud organization
2. Create workspaces per cloud provider
3. Set API token in environment
4. Call Terraform Cloud API for runs
5. Stream logs from Terraform Cloud

### API Endpoint
```
POST https://app.terraform.io/api/v2/organizations/{org}/runs
```

---

## Next Steps

1. **Start**: Implement `TerraformExecutor` service
2. **Test**: Create test scripts
3. **Integrate**: Update routes and orchestrator
4. **Verify**: Run integration tests
5. **Document**: Update API docs
6. **Deploy**: Push to staging
7. **Monitor**: Watch real deployments

---

## Questions & Debugging

### Common Issues

**Issue**: Terraform not found
```bash
which terraform
export PATH=$PATH:/usr/local/bin
```

**Issue**: Working directory permissions
```bash
chmod 755 /tmp/terraform-deployments
```

**Issue**: State file conflicts
```bash
# Terraform locks state automatically
# If stuck, remove lock file:
rm -f .terraform.lock.hcl
```

**Issue**: Module download errors
```bash
# Clear terraform cache:
rm -rf .terraform
# Try init again:
terraform init
```

### Debug Mode

Enable debug logging:
```javascript
logger.level = 'debug';
process.env.TF_LOG = 'DEBUG';
```

---

## Estimated Task Breakdown

| Task | Hours | Difficulty |
|------|-------|-----------|
| TerraformExecutor service | 8 | Medium |
| Integration with routes | 4 | Easy |
| Test scripts | 4 | Easy |
| Database migrations | 2 | Easy |
| Documentation | 3 | Easy |
| Testing & debugging | 8 | Medium |
| **Total** | **29** | - |

---

## Success Criteria

✅ Terraform execution works for AWS (plan only)  
✅ Deployment status updates in real-time  
✅ Logs are captured and accessible  
✅ Errors are handled gracefully  
✅ API documentation updated  
✅ Test coverage > 80%  
✅ No secrets logged  

---

**Good luck with Phase 3! Ask questions if anything is unclear.**

**Key Contact Points**:
- Architecture questions → Check `MULTI_CLOUD_DEPLOYMENT_GUIDE.md`
- Implementation questions → Check `PHASE_2_COMPLETION.md`
- Code structure → Check existing services in `backend/src/services/`
- API contracts → Check `backend/src/routes/deployments.js`

