# Deployment Deletion Feature - Implementation Roadmap

**Status**: ✅ Implemented  
**Priority**: Medium  
**Estimated Effort**: 6-8 hours  
**Last Updated**: January 28, 2025  
**Implemented By**: GitHub Copilot

---

## 🎯 Overview

Implement a comprehensive deployment deletion feature that allows users to fully remove deployments, including:
- Database records cleanup
- AWS infrastructure destruction via Terraform
- Working directory cleanup
- Deployment logs removal
- Associated draft unlinking

## ✅ Implementation Summary

### Backend Implementation

1. **Deployment Model Updated** (`backend/src/models/Deployment.js`)
   - Added new statuses: `pending_destruction`, `destroying`, `destroyed`, `destroy_failed`
   - Added new phases: `destruction-pending`, `destruction-started`, `destruction-complete`
   - Added tracking fields: `destructionRequestedAt`, `destructionConfirmedAt`, `destroyedAt`

2. **DeploymentService Extended** (`backend/src/services/deploymentService.js`)
   - `requestDestruction(deploymentId)` - Initiate destruction request
   - `confirmDestruction(deploymentId, confirmationName)` - Verify name and confirm
   - `startDestruction(deploymentId)` - Begin terraform destroy
   - `completeDestruction(deploymentId)` - Mark as destroyed
   - `failDestruction(deploymentId, error)` - Handle failure
   - `cancelDestruction(deploymentId)` - Cancel pending request
   - `deleteDeploymentCompletely(deploymentId)` - Full cleanup

3. **New API Endpoints** (`backend/src/routes/deployments.js`)
   - `POST /api/deployments/:id/preview` - Terraform plan preview (dry-run)
   - `POST /api/deployments/:id/request-destroy` - Request destruction
   - `POST /api/deployments/:id/confirm-destroy` - Confirm with name
   - `POST /api/deployments/:id/execute-destroy` - Execute terraform destroy
   - `POST /api/deployments/:id/cancel-destroy` - Cancel pending destruction
   - `DELETE /api/deployments/:id/permanent` - Delete database records

4. **Database Migration** (`backend/migrations/add-destruction-workflow-fields.sql`)
   - Adds new ENUM values for status and deployment_phase
   - Adds destruction tracking columns

### Frontend Implementation

1. **DestructionConfirmModal** (`frontend/src/components/DestructionConfirmModal.jsx`)
   - Warning display with list of resources to be destroyed
   - Name confirmation input (must type exact deployment name)
   - Multi-step workflow: Confirm → Execute
   - Status indicators and error handling

2. **TerraformPreview** (`frontend/src/components/TerraformPreview.jsx`)
   - Displays terraform plan results
   - Shows resources to add/change/destroy
   - Raw output toggle

3. **TerraformPreviewStep** (`frontend/src/pages/UnifiedDeploymentWizard/phases/Phase5Deploy/TerraformPreviewStep.jsx`)
   - Integrated into Phase 5 of deployment wizard
   - Runs terraform plan before actual deployment
   - Validates configuration without making changes

4. **DeploymentStatus Page Updated** (`frontend/src/pages/DeploymentStatus.jsx`)
   - Added "Destroy Deployment" button for completed/failed deployments
   - Status-specific alerts for destruction workflow
   - Integration with DestructionConfirmModal

5. **API Service Updated** (`frontend/src/services/api.js`)
   - Added destruction workflow methods
   - Added preview method

---

## 📊 Current State Analysis

### ✅ What Already Exists

1. **Terraform Destroy Method**
   - Location: `backend/src/services/terraformExecutor.js`
   - Method: `destroyTerraform(deploymentId)`
   - Status: ✅ Fully implemented
   - Runs: `terraform destroy -auto-approve`
   - Cleanup: All AWS resources (EKS, RDS, EFS, S3, ECR, EC2)

2. **Automatic Rollback System**
   - Triggers on deployment failure
   - Calls `destroyTerraform()` automatically
   - Updates status to `rolled_back`

3. **Basic DELETE Endpoint**
   - Endpoint: `DELETE /api/deployments/:id`
   - Location: `backend/src/routes/deployments.js:537`
   - Current Behavior: Only deletes `failed` or `rolled_back` deployments
   - **Limitation**: Does NOT destroy active infrastructure

4. **Cleanup Helper Method**
   - Method: `cleanupDeployment(deploymentId, keepState)`
   - Removes temporary files
   - Can optionally preserve Terraform state

### ❌ What's Missing

1. **Infrastructure Destruction for Active Deployments**
   - No way to destroy `completed` or `deploying` deployments
   - Users must manually destroy AWS resources via console

2. **Multi-Step Deletion Workflow**
   - No status tracking for deletion process
   - No async handling of long-running destruction

3. **Frontend UI**
   - No "Delete" button in DeploymentStatus page
   - No confirmation dialog with safeguards
   - No real-time progress tracking

4. **Cascade Deletion**
   - Deployment logs not automatically removed
   - Associated drafts not unlinked
   - Working directories not cleaned up

5. **New Deployment Statuses**
   - Need: `destroying` status
   - Need: `destroy_failed` status

---

## 🏗️ Architecture Design

### Deletion Flow

```
User Clicks "Delete Deployment"
    ↓
Frontend: Show confirmation dialog
    ↓
User types cluster name to confirm
    ↓
Frontend: POST /api/deployments/:id/destroy
    ↓
Backend: Check deployment status
    ↓
┌─────────────────────────────────────────┐
│ Status = failed | rolled_back           │
│   → Direct database deletion            │
│   → Clean working directory             │
│   → Return success                      │
└─────────────────────────────────────────┘
    OR
┌─────────────────────────────────────────┐
│ Status = completed | deploying          │
│   → Update status to 'destroying'       │
│   → Trigger async destruction           │
│   → Return "deletion initiated"         │
└─────────────────────────────────────────┘
    ↓
Async Destruction Process:
    ↓
    1. Run terraform destroy (15-30 min)
    ↓
    2. Monitor progress via WebSocket
    ↓
    3. On success:
       - Delete deployment logs
       - Unlink from draft (if any)
       - Delete deployment record
       - Clean working directory
    ↓
    4. On failure:
       - Set status to 'destroy_failed'
       - Log error details
       - Keep records for manual cleanup
    ↓
Frontend: Real-time updates via WebSocket
    ↓
User sees deletion progress/completion
```

---

## 📋 Implementation Plan

### Phase 1: Safe Deletion (Failed Deployments Only)
**Effort**: 2-3 hours  
**Risk**: Low  
**Value**: Immediate database cleanup

#### Backend Tasks

**1.1 Add New Deployment Statuses** (15 min)
- File: `backend/src/models/Deployment.js`
- Add to status ENUM: `destroying`, `destroy_failed`
- Migration needed: ✅ Yes

**1.2 Create Cascade Deletion Service Method** (30 min)
- File: `backend/src/services/deploymentService.js`
- New method: `deleteDeploymentCompletely(deploymentId)`
- Tasks:
  ```javascript
  async deleteDeploymentCompletely(deploymentId) {
    // 1. Delete all deployment logs
    await DeploymentLog.destroy({ where: { deploymentId } });
    
    // 2. Unlink from draft (set deploymentId = null)
    await DeploymentDraft.update(
      { deploymentId: null, status: 'approved' },
      { where: { deploymentId } }
    );
    
    // 3. Delete deployment record
    await Deployment.destroy({ where: { id: deploymentId } });
    
    // 4. Clean working directory
    await terraformExecutor.cleanupDeployment(deploymentId, false);
    
    logger.info(`Deployment ${deploymentId} completely deleted`);
  }
  ```

**1.3 Update DELETE Endpoint** (30 min)
- File: `backend/src/routes/deployments.js`
- Current endpoint: Lines 537-580
- Enhancement: Use new service method
- Add admin-only middleware

#### Frontend Tasks

**1.4 Add Delete Button to DeploymentStatus Page** (30 min)
- File: `frontend/src/pages/DeploymentStatus.jsx`
- Location: In actions section
- Button:
  ```jsx
  {(deployment.status === 'failed' || deployment.status === 'rolled_back') && (
    <Button
      variant="outlined"
      color="error"
      startIcon={<DeleteIcon />}
      onClick={() => setShowDeleteConfirm(true)}
    >
      Delete Deployment
    </Button>
  )}
  ```

**1.5 Create Confirmation Dialog** (45 min)
- File: `frontend/src/pages/DeploymentStatus.jsx`
- Features:
  - Warning message about permanent deletion
  - Type cluster name to confirm
  - Show what will be deleted:
    - ✓ Deployment record
    - ✓ All logs (XXX entries)
    - ✓ Working directory
- Validation: Input must match cluster name

**1.6 Implement Delete API Call** (15 min)
- Call: `DELETE /api/deployments/:id`
- Error handling
- Success redirect to deployments list

#### Testing Phase 1

- [ ] Create a test deployment
- [ ] Force it to fail
- [ ] Verify "Delete" button appears
- [ ] Test confirmation dialog
- [ ] Verify cascade deletion works
- [ ] Check logs table is empty
- [ ] Verify working directory removed

---

### Phase 2: Active Deployment Destruction
**Effort**: 3-4 hours  
**Risk**: Medium (long-running operations)  
**Value**: Full lifecycle management

#### Backend Tasks

**2.1 Create Async Destruction Function** (1 hour)
- File: `backend/src/routes/deployments.js`
- New function: `startTerraformDestruction(deployment)`
- Pattern: Similar to `startTerraformExecution()`
- Tasks:
  ```javascript
  async function startTerraformDestruction(deployment) {
    const { terraformExecutor, deploymentService } = require('../services');
    
    try {
      // Update status
      await deployment.update({ 
        status: 'destroying',
        deploymentPhase: 'terraform-destroy'
      });
      
      // Log start
      await deploymentService.addDeploymentLog(
        deployment.id,
        'terraform-destroy',
        'Starting infrastructure destruction'
      );
      
      // Run terraform destroy (15-30 minutes)
      const result = await terraformExecutor.destroyTerraform(deployment.id);
      
      // Complete deletion
      await deploymentService.deleteDeploymentCompletely(deployment.id);
      
      logger.info(`Deployment ${deployment.id} destroyed successfully`);
      
    } catch (error) {
      logger.error(`Destruction failed for ${deployment.id}`, error);
      
      await deployment.update({
        status: 'destroy_failed',
        errorMessage: error.message
      });
      
      await deploymentService.addDeploymentLog(
        deployment.id,
        'error',
        `Destruction failed: ${error.message}`
      );
    }
  }
  ```

**2.2 Create New Destroy Endpoint** (30 min)
- Endpoint: `POST /api/deployments/:id/destroy`
- Reason for POST: Initiates long-running operation
- Logic:
  ```javascript
  router.post('/:id/destroy', 
    authenticate,
    requireRole(['admin']),
    async (req, res) => {
      const deployment = await Deployment.findByPk(req.params.id);
      
      if (!deployment) {
        return sendError(res, 'Deployment not found', 404);
      }
      
      // Check if destroyable
      if (!['completed', 'failed', 'rolled_back'].includes(deployment.status)) {
        return sendError(res, 'Deployment cannot be destroyed in current state', 400);
      }
      
      // Quick deletion for failed/rolled_back
      if (['failed', 'rolled_back'].includes(deployment.status)) {
        await deploymentService.deleteDeploymentCompletely(deployment.id);
        return sendSuccess(res, { message: 'Deployment deleted' });
      }
      
      // Async destruction for completed
      if (deployment.status === 'completed') {
        startTerraformDestruction(deployment);
        return sendSuccess(res, { 
          message: 'Destruction initiated',
          status: 'destroying'
        });
      }
    }
  );
  ```

**2.3 Add Destruction Progress WebSocket Events** (30 min)
- File: `backend/src/services/terraformExecutor.js`
- Method: `destroyTerraform()`
- Add progress emissions:
  - On start: `emitPhaseUpdate('terraform-destroy', { status: 'starting' })`
  - During: Stream destroy output logs
  - On complete: `emitPhaseUpdate('terraform-destroy', { status: 'completed' })`
  - On error: `emitFailure()`

#### Frontend Tasks

**2.4 Update Delete Button Logic** (15 min)
- Show for: `completed`, `failed`, `rolled_back`, `destroy_failed`
- Change text based on status:
  - `completed`: "Delete Deployment (Destroys AWS Resources)"
  - `failed/rolled_back`: "Delete Deployment"
  - `destroy_failed`: "Retry Deletion" + "Delete Record Only"

**2.5 Enhanced Confirmation Dialog** (45 min)
- Show different warnings based on status:
  - **Completed**: 
    ```
    ⚠️ WARNING: This will destroy ALL AWS resources:
    ✓ EKS Cluster (15-20 min)
    ✓ RDS Database (all data will be lost!)
    ✓ EFS File Storage
    ✓ S3 Buckets
    ✓ ECR Repositories
    ✓ EC2 Instances
    ✓ Networking (VPC, Subnets, Security Groups)
    
    This process takes 15-30 minutes and CANNOT be undone.
    
    Type the cluster name to confirm: ___________
    ```
  - **Failed**: Standard deletion warning

**2.6 Real-Time Destruction Progress** (1 hour)
- File: `frontend/src/pages/DeploymentStatus.jsx`
- Show destruction phase when `status === 'destroying'`
- WebSocket subscription:
  ```javascript
  useEffect(() => {
    if (deployment.status === 'destroying') {
      const socket = connectWebSocket(deployment.id);
      
      socket.on('log', (log) => {
        // Append to destruction logs
      });
      
      socket.on('phase-update', (phase) => {
        if (phase.phase === 'terraform-destroy' && phase.status === 'completed') {
          // Redirect to deployments list
        }
      });
      
      return () => socket.disconnect();
    }
  }, [deployment.status]);
  ```

**2.7 Add Destruction Logs Section** (30 min)
- Show live Terraform destroy output
- Format similar to deployment logs
- Color code: Red/orange theme for destruction

#### Testing Phase 2

- [ ] Create test deployment
- [ ] Deploy successfully
- [ ] Click "Delete Deployment"
- [ ] Verify warning dialog shows AWS resources
- [ ] Type cluster name and confirm
- [ ] Verify status changes to `destroying`
- [ ] Watch real-time destruction logs
- [ ] Verify deployment deleted after completion
- [ ] Check AWS console - resources removed
- [ ] Test failure scenario (network interruption)
- [ ] Verify `destroy_failed` status set correctly

---

### Phase 3: Enhanced UX & Error Recovery
**Effort**: 1-2 hours  
**Risk**: Low  
**Value**: Production-ready robustness

#### Features

**3.1 Manual Cleanup Guide** (30 min)
- For `destroy_failed` status
- Show modal with steps:
  ```
  Automatic destruction failed. Manual cleanup required:
  
  1. Login to AWS Console
  2. Delete EKS Cluster: {cluster-name}
  3. Delete RDS Instance: {db-identifier}
  4. Delete EFS File System: {efs-name}
  5. Delete S3 Bucket: {bucket-name}
  6. Delete ECR Repository: {repository-name}
  7. Delete VPC: {vpc-id} (if custom VPC)
  
  After manual cleanup, click "Mark as Deleted" to remove from system.
  ```

**3.2 "Force Delete" Option** (30 min)
- Admin-only
- For `destroy_failed` deployments
- Deletes database record without Terraform destroy
- Adds warning: "AWS resources may still exist"

**3.3 Deployment List Enhancements** (30 min)
- File: `frontend/src/pages/Deployments.jsx`
- Show `destroying` status badge (orange, animated)
- Show `destroy_failed` status badge (red)
- Add bulk delete option (admin-only)
- Filter: Show/hide deleted deployments

**3.4 Audit Logging** (30 min)
- Log all deletion requests
- Store:
  - Who requested deletion
  - When
  - What resources were destroyed
  - Success/failure
- Location: New table `deployment_audit_log`

---

## 🚨 Risk Assessment

### High-Risk Scenarios

1. **Partial Destruction Failures**
   - **Risk**: Some AWS resources fail to delete (dependencies)
   - **Example**: VPC can't delete if ENIs still attached
   - **Mitigation**: 
     - Manual cleanup guide
     - Retry logic with exponential backoff
     - Force delete option

2. **Terraform State Corruption**
   - **Risk**: State file doesn't match AWS reality
   - **Mitigation**:
     - Always backup state before destroy
     - Provide "Manual Cleanup" guide
     - Add `terraform refresh` before destroy

3. **User Accidentally Deletes Wrong Deployment**
   - **Risk**: Production cluster destroyed by mistake
   - **Mitigation**:
     - Require typing exact cluster name
     - Admin-only permission
     - Add "deployment.critical" flag (prevents deletion)
     - Confirmation email for production deployments

4. **WebSocket Disconnection During Destroy**
   - **Risk**: User loses progress visibility
   - **Mitigation**:
     - Auto-reconnect logic
     - Poll for status updates as fallback
     - Show "Destruction in progress..." even without WebSocket

### Medium-Risk Scenarios

1. **Long Destroy Times (30+ min)**
   - AWS sometimes takes longer than expected
   - User might close browser
   - **Mitigation**: Background processing continues

2. **Concurrent Deletion Attempts**
   - Multiple admins try to delete same deployment
   - **Mitigation**: Row-level locking on deployment record

---

## 📝 Database Schema Changes

### New Deployment Statuses

```sql
-- Migration: Add new statuses to deployment enum
ALTER TYPE deployment_status ADD VALUE 'destroying';
ALTER TYPE deployment_status ADD VALUE 'destroy_failed';
```

### New Audit Table (Phase 3)

```sql
CREATE TABLE deployment_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id UUID REFERENCES deployments(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL, -- 'delete_initiated', 'destroy_started', 'destroy_completed', 'destroy_failed'
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  cluster_name VARCHAR(255) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_deployment ON deployment_audit_log(deployment_id);
CREATE INDEX idx_audit_user ON deployment_audit_log(user_id);
CREATE INDEX idx_audit_created ON deployment_audit_log(created_at);
```

---

## 🧪 Testing Strategy

### Unit Tests

1. **Backend Service Tests**
   - `deleteDeploymentCompletely()` cascades correctly
   - Terraform destroy called with correct args
   - Error handling for failed destroy

2. **API Endpoint Tests**
   - DELETE only allowed for correct statuses
   - Admin-only enforcement
   - Async destruction returns immediately

### Integration Tests

1. **Full Deletion Flow**
   - Create → Deploy → Delete → Verify AWS cleanup
   - Use test AWS account with real resources

2. **Failure Scenarios**
   - Terraform destroy fails (simulate network error)
   - Verify `destroy_failed` status set
   - Test retry logic

### Manual QA Checklist

- [ ] Delete failed deployment (instant)
- [ ] Delete completed deployment (async)
- [ ] Watch destruction logs in real-time
- [ ] Close browser during destroy, reopen, verify status
- [ ] Test as non-admin (should fail)
- [ ] Test with invalid cluster name confirmation
- [ ] Verify AWS console shows resources deleted
- [ ] Test force delete after failed destroy
- [ ] Verify audit logs created

---

## 📊 Success Metrics

- ✅ Users can delete failed deployments in < 5 seconds
- ✅ Active deployments destroyed in 15-30 minutes
- ✅ 100% of AWS resources cleaned up (no orphans)
- ✅ Real-time progress visible via WebSocket
- ✅ Manual cleanup guide provided for failures
- ✅ Zero accidental production deletions

---

## 🗓️ Timeline

| Phase | Tasks | Duration | Dependencies |
|-------|-------|----------|--------------|
| **Phase 1** | Safe deletion (failed only) | 2-3 hours | None |
| **Phase 2** | Active deployment destruction | 3-4 hours | Phase 1 complete |
| **Phase 3** | UX enhancements | 1-2 hours | Phase 2 complete |
| **Testing** | Integration & QA | 2 hours | All phases |
| **Total** | | **8-11 hours** | |

---

## 🔗 Related Files

### Backend
- `backend/src/routes/deployments.js` - DELETE endpoint
- `backend/src/services/terraformExecutor.js` - `destroyTerraform()`
- `backend/src/services/deploymentService.js` - Cascade deletion
- `backend/src/models/Deployment.js` - Status enum

### Frontend
- `frontend/src/pages/DeploymentStatus.jsx` - Delete UI
- `frontend/src/pages/Deployments.jsx` - List view
- `frontend/src/services/api.js` - API calls

### Terraform
- `terraform/modules/*/main.tf` - Resource definitions

---

## 📌 Next Steps

1. **Review this roadmap** with team
2. **Prioritize phases** based on business needs
3. **Create tickets** in project management tool
4. **Assign developers** to each phase
5. **Schedule** implementation sprint

---

## 💡 Future Enhancements (Post-MVP)

- [ ] Scheduled deletion (delete at specific time)
- [ ] Soft delete (mark as deleted, cleanup later)
- [ ] Resource tagging before destroy (for accounting)
- [ ] Cost report before deletion ("You're about to save $XXX/month")
- [ ] Backup/snapshot creation before destroy
- [ ] Multi-deployment bulk delete
- [ ] Deployment lifecycle policies (auto-delete after 30 days)

---

**Document Owner**: Development Team  
**Review Frequency**: After each phase completion  
**Last Review**: November 24, 2025
