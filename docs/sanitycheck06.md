# Sanity Check #6 - Fresh Application Review

**Date:** 2025-11-26  
**Reviewer:** Lead Developer (Fresh Look)  
**Purpose:** Identify cohesion issues, route/import/export alignment, and database consistency.  
**Status:** DISCREPANCIES ONLY - No changes applied.

---

## Executive Summary

This fresh review examines the application after fixes from sanitycheck05 were applied. **Database verification was performed against the actual running PostgreSQL container (`eks-deployer-postgres`).** Several previous issues are now resolved. Some items previously flagged as "missing migrations" are actually present in the database (created via other means). New discrepancies were identified between models and actual DB schema.

---

## 📊 ACTUAL DATABASE STATE (Verified via Docker)

### Tables Present in Database (12 tables)
```
Schema |          Name          | Type  |  Owner   
--------+------------------------+-------+----------
 public | SequelizeMeta          | table | eks_user
 public | alert_channel_configs  | table | eks_user  ← EXISTS
 public | audit_logs             | table | eks_user
 public | credentials            | table | eks_user
 public | deployment_drafts      | table | eks_user  ← EXISTS
 public | deployment_logs        | table | eks_user
 public | deployment_sql_scripts | table | eks_user
 public | deployments            | table | eks_user
 public | shared_resources       | table | eks_user
 public | team_members           | table | eks_user
 public | teams                  | table | eks_user
 public | users                  | table | eks_user
```

### Migrations Applied (8 migrations in SequelizeMeta)
1. `20250101000000-init.js`
2. `20250101000001-add-missing-tables.js`
3. `20251124212328-create-deployment-sql-scripts.js`
4. `20251124212329-add-database-phases-to-deployment.js`
5. `20251126000000-add-approver-role.js`
6. `20251126063400-add-cloud-provider-columns.js`
7. `20251126070000-add-composite-indexes.js`
8. `20251126100000-add-missing-deployment-columns.js`

**Note:** Tables `deployment_drafts` and `alert_channel_configs` exist but were created outside Sequelize migrations (likely via `sequelize.sync()` or SQL scripts in `database/migrations/008_create_deployment_drafts.sql`).

---

## ✅ ISSUES FIXED / VERIFIED

### 1. AnalyticsDashboard API Endpoints
- **Status:** ✅ FIXED
- `frontend/src/pages/AnalyticsDashboard.jsx` now correctly calls:
  - `/api/analytics/metrics`
  - `/api/analytics/trends`
  - `/api/analytics/cost`

### 2. Auth Token Storage Key
- **Status:** ✅ FIXED
- `DeploymentMonitor.jsx` now uses `localStorage.getItem('authToken')`

### 3. MetricsCollector Static Methods
- **Status:** ✅ FIXED
- `backend/src/services/metricsCollector.js` now has:
  - `static calculateAggregateMetrics(deployments)`
  - `static calculateTrends(deployments, metric, interval, days)`

### 4. Deployment Table Columns
- **Status:** ✅ VERIFIED IN DATABASE
- `metrics_data` column EXISTS (JSONB, default `'{}'::jsonb`)
- `terraform_working_dir` column EXISTS
- `terraform_state` column EXISTS (JSONB)
- `terraform_outputs` column EXISTS (JSONB)
- `deployment_phase` column EXISTS (ENUM)
- `terraform_version` column EXISTS
- `deployment_logs` column EXISTS (JSONB)

### 5. deployment_drafts Table
- **Status:** ✅ EXISTS IN DATABASE
- Created via `database/migrations/008_create_deployment_drafts.sql`
- Schema verified - matches model expectations

### 6. alert_channel_configs Table
- **Status:** ✅ EXISTS IN DATABASE
- Created via `sequelize.sync()` at some point
- Schema verified - matches model expectations

### 7. Logs Route Column Mapping
- **Status:** ✅ FIXED
- `log_type`, `log_level`, `data` columns verified in `deployment_logs` table

---

## 🚨 REMAINING DISCREPANCIES

### CRITICAL - Category 1: Model/Database Schema Mismatches

#### Issue 1.1: Deployment Model Missing metricsData Field Definition
- **Location:** `backend/src/models/Deployment.js`
- **Database:** Column `metrics_data` EXISTS (JSONB, default `'{}'::jsonb`)
- **Problem:** Model does NOT define `metricsData` field, but services use it
- **Evidence:** `metricsCollector.js` references `deployment.metricsData` 21+ times
- **Impact:** Sequelize won't map the column unless defined in model
- **Fix Required:** Add `metricsData` field definition to Deployment model

#### Issue 1.2: Credential Model Uses ENUM, Database Uses VARCHAR
- **Location:** `backend/src/models/Credential.js`
- **Model defines:**
  ```javascript
  cloudProvider: DataTypes.ENUM('aws', 'azure', 'gcp', 'digitalocean', 'linode')
  vaultType: DataTypes.ENUM('aws-secrets', 'azure-kv', 'gcp-secrets', 'hashicorp-vault')
  ```
- **Database has:** `character varying(255)` for both columns
- **Impact:** Model ENUM validation won't work; any string value accepted in DB
- **Recommendation:** Either update model to STRING or alter DB columns to ENUM

#### Issue 1.3: Cost.js Route Uses Non-Existent Model Fields
- **Location:** `backend/src/routes/cost.js`
- **Problem:** Routes reference fields that don't exist on Deployment model
- **Evidence:**
  ```javascript
  // Line 50, 87, 383 - 'name' doesn't exist on Deployment model
  deploymentName: deployment.name,  // Should be deployment.clusterName
  
  // Line 51, 88, 383 - 'provider' doesn't exist on Deployment model  
  provider: deployment.provider,    // Should be deployment.cloudProvider
  ```
- **Impact:** Cost analysis endpoints will return undefined values

### HIGH - Category 2: Frontend/Route Disconnection

#### Issue 2.1: AnalyticsDashboard Not Routed in App.jsx
- **Location:** `frontend/src/App.jsx`
- **Problem:** `AnalyticsDashboard.jsx` exists but has NO route in App.jsx
- **File exists:** `frontend/src/pages/AnalyticsDashboard.jsx` (564 lines)
- **Missing import & route:** Not imported, no `/analytics` route defined
- **Impact:** Analytics dashboard is inaccessible to users

#### Issue 2.2: DeploymentMonitor Not Routed in App.jsx
- **Location:** `frontend/src/App.jsx`
- **Problem:** `DeploymentMonitor.jsx` exists but has NO route in App.jsx
- **File exists:** `frontend/src/pages/DeploymentMonitor.jsx` (396 lines)
- **Missing import & route:** Not imported, no `/monitor` or similar route
- **Impact:** Real-time deployment monitoring is inaccessible

#### Issue 2.3: Navigation Missing Analytics/Monitor Links
- **Location:** `frontend/src/components/Layout.jsx`
- **Problem:** Sidebar navigation does not include links to analytics or monitoring pages
- **Current menu items:**
  - Dashboard, Credentials, New Deployment, Saved Deployments, Clusters, SQL Interface
- **Missing:** Analytics, Monitoring

### MEDIUM - Category 3: Status ENUM Mismatches

#### Issue 3.1: Clusters Route Uses Invalid Status Values
- **Location:** `backend/src/routes/clusters.js`
- **Database ENUM:** `enum_deployments_status` has values:
  ```
  pending, running, paused, completed, failed, rolled_back
  ```
- **Code uses:** `'updating'` (line 315) and `'deleting'` (line 361)
- **Impact:** Database will reject these status updates with ENUM violation error

### LOW - Category 4: Migration Hygiene

#### Issue 4.1: Missing Sequelize Migrations for Existing Tables
- **Tables without Sequelize migrations:**
  - `deployment_drafts` - Created via SQL file `database/migrations/008_create_deployment_drafts.sql`
  - `alert_channel_configs` - Created via `sequelize.sync()` (no migration file)
- **Impact:** Migration-based deployments may fail if tables don't exist
- **Recommendation:** Create Sequelize migrations for these tables for consistency

#### Issue 4.2: Orphaned SQL Migration Files
- **Location:** `database/migrations/008_create_deployment_drafts.sql`
- **Problem:** SQL migration exists outside Sequelize migration framework
- **Impact:** Won't be tracked in `SequelizeMeta`, may cause confusion

### LOW - Category 5: API Service Coverage Gaps

#### Issue 5.1: Frontend api.js Missing Endpoints
- **Location:** `frontend/src/services/api.js`
- **Missing endpoints for:**
  - Analytics (`/api/analytics/*`)
  - Cost (`/api/cost/*`)
  - Alerts (`/api/alerts/*`)
  - Teams (`/api/teams/*`)
  - Admin (`/api/admin/*`)
- **Impact:** Frontend components using these APIs must use raw axios calls

---

## Priority Ranking for Fixes

### P0 - Immediate (Application Breaking)
1. Add `metricsData` field to Deployment model (services depend on it)
2. Fix cost.js to use correct field names (`clusterName`, `cloudProvider`)
3. Fix clusters.js to use valid status ENUM values (`running` instead of `updating`)

### P1 - High Priority (Features Inaccessible)
4. Add AnalyticsDashboard route to App.jsx
5. Add DeploymentMonitor route to App.jsx
6. Add navigation links for Analytics and Monitor

### P2 - Medium Priority (Data Integrity)
7. Align Credential model types with database (STRING vs ENUM)
8. Create proper Sequelize migrations for `deployment_drafts` and `alert_channel_configs`

### P3 - Low Priority (Cleanup)
9. Add missing API methods to frontend api.js service
10. Remove or migrate orphaned SQL files

---

## Database Verification Commands Used

```powershell
# List all tables
docker exec eks-deployer-postgres psql -U eks_user -d eks_deployer -c "\dt"

# Inspect specific table structure
docker exec eks-deployer-postgres psql -U eks_user -d eks_deployer -c "\d deployments"

# List all ENUM types and values
docker exec eks-deployer-postgres psql -U eks_user -d eks_deployer -c \
  "SELECT typname, enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid 
   WHERE typname LIKE 'enum_%' ORDER BY typname, enumsortorder;"

# Check applied migrations
docker exec eks-deployer-postgres psql -U eks_user -d eks_deployer -c \
  'SELECT * FROM "SequelizeMeta" ORDER BY name;'
```

---

## Files Analyzed

| File | Lines | Status |
|------|-------|--------|
| `backend/src/server.js` | 215 | ✅ Routes correct |
| `backend/src/models/index.js` | 150 | ✅ 12 models associated |
| `backend/src/models/Deployment.js` | 165 | ❌ Missing metricsData field |
| `backend/src/models/Credential.js` | 125 | ⚠️ ENUM vs VARCHAR mismatch |
| `backend/src/models/DeploymentDraft.js` | 105 | ✅ Table exists in DB |
| `backend/src/models/AlertChannelConfig.js` | 350 | ✅ Table exists in DB |
| `backend/src/routes/analytics.js` | 375 | ✅ FIXED |
| `backend/src/routes/cost.js` | 410 | ❌ Wrong field names |
| `backend/src/routes/clusters.js` | 370 | ❌ Invalid status values |
| `backend/src/services/metricsCollector.js` | 420 | ✅ FIXED |
| `frontend/src/App.jsx` | 130 | ❌ Missing routes |
| `frontend/src/pages/AnalyticsDashboard.jsx` | 564 | ⚠️ No route access |
| `frontend/src/pages/DeploymentMonitor.jsx` | 396 | ⚠️ No route access |
| `frontend/src/services/api.js` | 115 | ⚠️ Missing API methods |

---

## Conclusion

**Previous Issues Verified as Fixed:** 7 items  
**Remaining Discrepancies:** 10 items

| Category | Count | Severity |
|----------|-------|----------|
| Model/Schema Mismatch | 3 | Critical/High |
| Frontend Routing | 3 | High |
| Status ENUM Issues | 1 | Medium |
| Migration Hygiene | 2 | Low |
| API Service Gaps | 1 | Low |

**Key Correction from Previous Analysis:** Tables `deployment_drafts` and `alert_channel_configs` DO exist in the database. They were created via alternative methods (SQL scripts and sync). The actual issue is the model/field definition for `metricsData` which is missing from `Deployment.js`.

Recommend addressing P0 issues before any deployment testing.
