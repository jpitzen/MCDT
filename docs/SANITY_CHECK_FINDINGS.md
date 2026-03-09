# Application Sanity Check - Findings Report
**Date:** November 26, 2025  
**Scope:** Routes, Models, Services, Database Schema  
**Status:** ⚠️ DISCREPANCIES FOUND

---

## 🔴 CRITICAL ISSUES

### 1. Missing Database Table: `alert_channel_configs`
**Severity:** HIGH  
**Impact:** Alert configuration features will fail at runtime

**Details:**
- **Model Defined:** `AlertChannelConfig` (`backend/src/models/AlertChannelConfig.js`)
- **Expected Table Name:** `alert_channel_configs` (line 240 in model)
- **Database Status:** ❌ Table does NOT exist
- **Routes Using This Model:**
  - `backend/src/routes/alerts.js` (8 references)
  - POST `/api/alerts` - Create alert channel
  - GET `/api/alerts` - List alert channels  
  - PUT `/api/alerts/:id` - Update alert channel
  - DELETE `/api/alerts/:id` - Delete alert channel
  - POST `/api/alerts/:id/test` - Test alert channel

**Foreign Keys Expected:**
- `user_id` → `users(id)` ON DELETE CASCADE

**Recommendation:**
Create the `alert_channel_configs` table with proper schema to match the model definition.

---

## ⚠️ MEDIUM ISSUES

### 2. Service Not Exported in Index: `databaseScriptExecutor`
**Severity:** MEDIUM  
**Impact:** Inconsistent service import patterns

**Details:**
- **Service File:** `backend/src/services/databaseScriptExecutor.js`
- **Export Status:** ✅ Exports singleton: `module.exports = new DatabaseScriptExecutor()`
- **Index Export:** ❌ NOT listed in `backend/src/services/index.js`
- **Current Usage:** Routes import directly (works but inconsistent)
  - `backend/src/routes/sqlScripts.js` (line 6)
  - `backend/src/routes/deployments.js` (line 414)

**Recommendation:**
Add to `services/index.js` for consistency:
```javascript
databaseScriptExecutor: require('./databaseScriptExecutor'),
```

---

### 3. Service Not Exported in Index: `costEstimationService`
**Severity:** MEDIUM  
**Impact:** Inconsistent service import patterns

**Details:**
- **Service File:** `backend/src/services/costEstimationService.js`
- **Export Status:** ✅ Exports singleton: `module.exports = new CostEstimationService()`
- **Index Export:** ❌ NOT listed in `backend/src/services/index.js`
- **Current Usage:** Routes import directly (works but inconsistent)
  - `backend/src/routes/deployment-drafts.js` (line 7)

**Recommendation:**
Add to `services/index.js` for consistency:
```javascript
costEstimationService: require('./costEstimationService'),
```

---

## ✅ VERIFIED CORRECT

### Database Tables ↔ Models Alignment
| Table Name | Model File | Model Class | Status |
|------------|-----------|-------------|---------|
| `users` | User.js | User | ✅ |
| `credentials` | Credential.js | Credential | ✅ |
| `deployments` | Deployment.js | Deployment | ✅ |
| `deployment_drafts` | deploymentDraft.js | DeploymentDraft | ✅ |
| `deployment_logs` | DeploymentLog.js | DeploymentLog | ✅ |
| `deployment_sql_scripts` | DeploymentSqlScript.js | DeploymentSqlScript | ✅ |
| `audit_logs` | AuditLog.js | AuditLog | ✅ |
| `teams` | Team.js | Team | ✅ |
| `team_members` | TeamMember.js | TeamMember | ✅ |
| `shared_resources` | SharedResource.js | SharedResource | ✅ |
| `alert_channel_configs` | AlertChannelConfig.js | AlertChannelConfig | ❌ MISSING |

### Foreign Key Relationships - All Verified ✅
**Database Foreign Keys (17 total):**
1. `audit_logs.user_id` → `users.id` ✅
2. `credentials.user_id` → `users.id` ✅
3. `deployment_drafts.approved_by` → `users.id` ✅
4. `deployment_drafts.credential_id` → `credentials.id` ✅
5. `deployment_drafts.deployment_id` → `deployments.id` ✅
6. `deployment_drafts.user_id` → `users.id` ✅
7. `deployment_logs.deployment_id` → `deployments.id` ✅
8. `deployment_sql_scripts.deployment_id` → `deployments.id` ✅
9. `deployment_sql_scripts.uploaded_by` → `users.id` ✅
10. `deployments.credential_id` → `credentials.id` ✅
11. `deployments.user_id` → `users.id` ✅
12. `shared_resources.shared_by` → `users.id` ✅
13. `shared_resources.team_id` → `teams.id` ✅
14. `team_members.invited_by` → `users.id` ✅
15. `team_members.team_id` → `teams.id` ✅
16. `team_members.user_id` → `users.id` ✅
17. `teams.owner_id` → `users.id` ✅

**All foreign keys match model associations in `models/index.js`**

### Route Registration - All Verified ✅
All 15 route files are properly registered in `server.js`:
1. `/api/auth` → authRoutes ✅
2. `/api/users` → usersRoutes ✅
3. `/api/credentials` → credentialsRoutes ✅
4. `/api/deployments` → deploymentsRoutes ✅
5. `/api/deployment-drafts` → deploymentDraftsRoutes ✅
6. `/api/deployments/:deploymentId/sql-scripts` → sqlScriptsRoutes ✅
7. `/api/clusters` → clustersRoutes ✅
8. `/api/status` → statusRoutes ✅
9. `/api/analytics` → analyticsRoutes ✅
10. `/api/alerts` → alertsRoutes ✅
11. `/api/logs` → logsRoutes ✅
12. `/api/templates` → templatesRoutes ✅
13. `/api/teams` → teamsRoutes ✅
14. `/api/cost` → costRoutes ✅
15. `/api/admin` → adminRoutes ✅

### Service Exports - Verified ✅
**Services properly exported in `services/index.js`:**
- authService ✅
- credentialService ✅
- deploymentService ✅
- awsService ✅
- logger ✅
- logService ✅
- metricsCollector ✅
- alertService ✅
- secureAlertService ✅
- secureCredentialService ✅
- deploymentTemplateService ✅
- costOptimizationService ✅
- multiCloudOrchestrator ✅
- terraformExecutor ✅
- websocketEmissionService ✅
- transactionHelper ✅

**Missing from index (but functional):**
- databaseScriptExecutor (imported directly)
- costEstimationService (imported directly)

### Model Associations - All Verified ✅
All Sequelize associations in `models/index.js` match database foreign keys.

---

## 📊 SUMMARY

| Category | Total | ✅ Correct | ⚠️ Issues |
|----------|-------|-----------|----------|
| Database Tables | 11 | 10 | 1 |
| Models | 11 | 11 | 0 |
| Foreign Keys | 17 | 17 | 0 |
| Routes | 15 | 15 | 0 |
| Services | 18 | 16 | 2 |

**Total Issues Found:** 3
- **Critical:** 1 (Missing table)
- **Medium:** 2 (Service index exports)

---

## 🔧 RECOMMENDED ACTIONS

1. **IMMEDIATE (Critical):**
   ```sql
   -- Create alert_channel_configs table
   CREATE TABLE alert_channel_configs (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     name VARCHAR(255) NOT NULL,
     channel_type VARCHAR(50) NOT NULL,
     is_active BOOLEAN DEFAULT true,
     -- Add remaining columns per AlertChannelConfig model
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```

2. **SOON (Medium Priority):**
   - Add `databaseScriptExecutor` to `services/index.js`
   - Add `costEstimationService` to `services/index.js`

3. **BEST PRACTICE:**
   - Consider creating a migration system for schema changes
   - Document any tables created manually outside of model sync

---

## 📝 NOTES

- The `deployment_drafts` table was created manually during this session (successfully)
- Database sync is disabled in production (`server.js` line 119)
- All manual table creations should be tracked via SequelizeMeta or migration files
- No missing routes or broken imports detected
- All model-to-database mappings are correct except for AlertChannelConfig table
