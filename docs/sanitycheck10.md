# Sanity Check 10 - Fresh Comprehensive Database and Application Flow Analysis
**Date:** November 26, 2025
**Purpose:** Complete verification of database schema, model alignment, route-to-API cohesion

---

## 1. Executive Summary

| Category | Status | Details |
|----------|--------|---------|
| Database Tables | ⚠️ | 12 tables present, but **NO clusters, cluster_metrics, deployment_templates** tables |
| SequelizeMeta | ✅ | 12 migrations applied |
| Backend Models | ⚠️ | Model ENUM values don't match database ENUMs |
| Route Registration | ✅ | 15 routes registered in server.js |
| Frontend API | ⚠️ | Multiple endpoints calling non-existent backend routes |
| Admin Routes | ❌ | **Frontend expects endpoints that don't exist in backend** |

---

## 2. Database Schema Analysis

### 2.1 Tables Present in Database (12 total)
```
✅ SequelizeMeta          - Migration tracking
✅ alert_channel_configs  - Alert notification channels
✅ audit_logs             - System audit logs
✅ credentials            - Cloud credentials
✅ deployment_drafts      - Draft deployments
✅ deployment_logs        - Deployment log entries
✅ deployment_sql_scripts - SQL scripts for deployments
✅ deployments            - Main deployment records
✅ shared_resources       - Team resource sharing
✅ team_members           - Team membership
✅ teams                  - User teams
✅ users                  - User accounts
```

### 2.2 Tables MISSING from Database (Previously documented as existing)
| Table | sanitycheck09 Status | Actual Status | Impact |
|-------|----------------------|---------------|--------|
| `clusters` | Listed as present | **NOT FOUND** | Clusters are derived from deployments - OK by design |
| `cluster_metrics` | Listed as present | **NOT FOUND** | Missing table - no cluster metrics storage |
| `deployment_templates` | Listed as present | **NOT FOUND** | Templates stored in-memory in service |
| `team_memberships` | Listed as present | Uses `team_members` | Naming discrepancy |

---

## 3. ENUM Type Discrepancies

### 3.1 Database ENUM Values (Actual)
```sql
enum_deployments_status: pending, running, paused, completed, failed, rolled_back
enum_users_role: admin, operator, viewer, approver
enum_team_members_role: admin, operator, viewer, custom
enum_deployment_logs_log_level: debug, info, warn, error, fatal
```

### 3.2 Model ENUM Values (Defined in Code)

#### **P1-A: Deployment.status ENUM Mismatch**
| Location | `backend/src/models/Deployment.js` line 46 |
|----------|---------------------------------------------|
| **Model defines:** | `'pending', 'running', 'paused', 'completed', 'failed', 'rolled_back'` |
| **Database has:** | `pending, running, paused, completed, failed, rolled_back` |
| **Status:** | ✅ **ALIGNED** |

#### **P1-B: Deployment.cloudProvider Model vs Database**
| Location | `backend/src/models/Deployment.js` line 29 |
|----------|---------------------------------------------|
| **Model defines:** | `DataTypes.ENUM('aws', 'azure', 'gcp', 'digitalocean', 'linode')` |
| **Database column:** | `character varying(255)` NOT NULL DEFAULT 'aws' |
| **Status:** | ⚠️ **MISMATCH** - Model uses ENUM, DB uses VARCHAR |
| **Impact:** | Model validation may reject valid values not in ENUM |

#### **P1-C: User.role ENUM Order Difference**
| Location | `backend/src/models/User.js` line 35 |
|----------|--------------------------------------|
| **Model defines:** | `ENUM('admin', 'approver', 'operator', 'viewer')` |
| **Database has:** | `admin, operator, viewer, approver` |
| **Status:** | ⚠️ Order differs (cosmetic, functionally OK) |

#### **P1-D: TeamMember Model Uses ENUM, DB Uses ENUM**
| Model | `backend/src/models/TeamMember.js` |
|-------|-----------------------------------|
| **Model defines:** | `ENUM('admin', 'operator', 'viewer', 'custom')` |
| **Database has:** | `enum_team_members_role: admin, operator, viewer, custom` |
| **Status:** | ✅ **ALIGNED** |

---

## 4. Model/Database Column Discrepancies

### 4.1 Credential Model vs Database

| Field | Model (`Credential.js`) | Database | Status |
|-------|------------------------|----------|--------|
| `cloudProvider` | `DataTypes.STRING` | `VARCHAR(255) NOT NULL DEFAULT 'aws'` | ✅ |
| `vaultType` | `DataTypes.STRING` | `VARCHAR(255) NOT NULL DEFAULT 'aws-secrets'` | ✅ |
| `secretRefId` | `allowNull: false, unique: true` | `NOT NULL, UNIQUE` | ✅ |
| `cloudAccountId` | `allowNull: false` | `NOT NULL` | ✅ |
| `cloudRegion` | `allowNull: false, defaultValue: 'us-east-1'` | `NOT NULL DEFAULT 'us-east-1'` | ✅ |

### 4.2 Deployment Model vs Database

| Field | Model | Database | Status |
|-------|-------|----------|--------|
| `cloudProvider` | `ENUM(...)` | `VARCHAR(255) NOT NULL` | ⚠️ Mismatch |
| `status` | `ENUM(...)` | `enum_deployments_status` | ✅ |
| `deploymentPhase` | `ENUM(...)` | `enum_deployments_deployment_phase` | ✅ |

---

## 5. Frontend-to-Backend Route Discrepancies

### 5.1 Admin API - **MAJOR ISSUE**
| Frontend API (`api.js`) | Expected Backend Route | Actual Backend Route | Status |
|------------------------|------------------------|---------------------|--------|
| `admin.getUsers()` | `GET /admin/users` | **NOT EXISTS** | ❌ |
| `admin.getUser(id)` | `GET /admin/users/:id` | **NOT EXISTS** | ❌ |
| `admin.updateUserRole(id)` | `PUT /admin/users/:id/role` | **NOT EXISTS** | ❌ |
| `admin.suspendUser(id)` | `POST /admin/users/:id/suspend` | **NOT EXISTS** | ❌ |
| `admin.reactivateUser(id)` | `POST /admin/users/:id/reactivate` | **NOT EXISTS** | ❌ |
| `admin.getSystemStats()` | `GET /admin/stats` | **NOT EXISTS** | ❌ |
| `admin.getAuditLogs()` | `GET /admin/audit-logs` | **NOT EXISTS** | ❌ |

**Actual Admin Routes (backend/src/routes/admin.js):**
- `POST /api/admin/cleanup/deployments` - Delete deployments
- `POST /api/admin/cleanup/drafts` - Delete drafts

### 5.2 Cost API Mismatch
| Frontend API | Expected Route | Backend Route | Status |
|-------------|----------------|---------------|--------|
| `cost.getEstimate(data)` | `POST /cost/estimate` | **NOT EXISTS** | ❌ |
| `cost.getOptimizations(id)` | `GET /cost/optimizations/:id` | **NOT EXISTS** | ❌ |
| `cost.getReport(params)` | `GET /cost/report` | `GET /cost/report` | ✅ |
| `cost.compareProviders(data)` | `POST /cost/compare` | `POST /cost/compare` | ✅ |

**Actual Cost Routes:**
- `GET /cost/deployment/:deploymentId` - Cost for specific deployment
- `GET /cost/deployments` - Cost for all deployments
- `GET /cost/opportunities` - Cost optimization opportunities
- `GET /cost/trends/:deploymentId` - Cost trends
- `POST /cost/compare` - Compare providers
- `GET /cost/report` - Cost report
- `GET /cost/export` - Export costs
- `POST /cost/budget` - Set budget
- `GET /cost/providers` - Provider costs

### 5.3 Analytics API Mismatch
| Frontend API | Expected Route | Backend Route | Status |
|-------------|----------------|---------------|--------|
| `analytics.getMetrics(params)` | `GET /analytics/metrics` | Need to verify | ⚠️ |
| `analytics.getTrends(params)` | `GET /analytics/trends` | Need to verify | ⚠️ |
| `analytics.getCostAnalysis(params)` | `GET /analytics/cost` | Need to verify | ⚠️ |
| `analytics.getUsageStats(params)` | `GET /analytics/usage` | Need to verify | ⚠️ |

---

## 6. Missing Database Tables

### 6.1 deployment_templates - Templates in Memory Only
**Location:** `backend/src/services/deploymentTemplateService.js`
**Status:** Templates stored in memory as JavaScript objects
**Database Table:** Does NOT exist

**Impact:**
- Custom templates cannot be persisted
- Restarting server loses custom templates
- SharedResource model references 'template' as resource_type but no templates table

**Recommendation:** Create `deployment_templates` table or document that templates are code-based only

### 6.2 clusters / cluster_metrics Tables Missing
**Status:** Clusters are derived from deployments table
**Impact:** 
- No dedicated cluster metrics storage
- Cluster status is calculated from deployment status

---

## 7. Route Registration Analysis

### 7.1 Server.js Route Mounts (15 routes)
```javascript
✅ /api/auth              → authRoutes
✅ /api/users             → usersRoutes
✅ /api/credentials       → credentialsRoutes
✅ /api/deployments       → deploymentsRoutes
✅ /api/deployment-drafts → deploymentDraftsRoutes
✅ /api/deployments/:deploymentId/sql-scripts → sqlScriptsRoutes
✅ /api/clusters          → clustersRoutes
✅ /api/status            → statusRoutes
✅ /api/analytics         → analyticsRoutes
✅ /api/alerts            → alertsRoutes
✅ /api/logs              → logsRoutes
✅ /api/templates         → templatesRoutes
✅ /api/teams             → teamsRoutes
✅ /api/cost              → costRoutes
✅ /api/admin             → adminRoutes
```

### 7.2 Route Files Present (15 files)
```
✅ admin.js
✅ alerts.js
✅ analytics.js
✅ auth.js
✅ clusters.js
✅ cost.js
✅ credentials.js
✅ deployment-drafts.js
✅ deployments.js
✅ logs.js
✅ sqlScripts.js
✅ status.js
✅ teams.js
✅ templates.js
✅ users.js
```

---

## 8. Model Association Analysis

### 8.1 Models Exported from `models/index.js`
```javascript
✅ User
✅ Credential
✅ Deployment
✅ DeploymentDraft
✅ AuditLog
✅ DeploymentLog (factory function)
✅ AlertChannelConfig
✅ Team (factory function)
✅ TeamMember (factory function)
✅ SharedResource (factory function)
✅ DeploymentSqlScript (factory function)
```

### 8.2 Missing Models
| Model | Status | Impact |
|-------|--------|--------|
| `Cluster` | NOT EXISTS | By design - clusters derived from deployments |
| `ClusterMetrics` | NOT EXISTS | No metrics persistence |
| `DeploymentTemplate` | NOT EXISTS | Templates in-memory only |

---

## 9. Priority Action Items

### P0 - Critical (Blocking)
| # | Issue | Impact | Recommended Fix |
|---|-------|--------|-----------------|
| 1 | Admin API endpoints don't exist | Frontend SystemAdmin page broken | Create admin routes OR update frontend |

### P1 - High (Should Fix)
| # | Issue | Impact | Recommended Fix |
|---|-------|--------|-----------------|
| 2 | Deployment.cloudProvider uses ENUM in model but VARCHAR in DB | Potential runtime errors | Align model to use STRING |
| 3 | Cost API frontend/backend mismatch | Some cost features broken | Add missing endpoints or update frontend |
| 4 | No deployment_templates table | Custom templates not persisted | Create table or document limitation |

### P2 - Medium (Should Address)
| # | Issue | Impact | Recommended Fix |
|---|-------|--------|-----------------|
| 5 | sanitycheck09 listed tables that don't exist | Documentation inaccuracy | Update documentation |
| 6 | team_memberships vs team_members naming | Confusion | Consistent naming |

### P3 - Low (Nice to Have)
| # | Issue | Impact | Recommended Fix |
|---|-------|--------|-----------------|
| 7 | User role ENUM order difference | None functional | Cosmetic only |

---

## 10. Applied Migrations (12)
```
20250101000000-init.js
20250101000001-add-missing-tables.js
20251124212328-create-deployment-sql-scripts.js
20251124212329-add-database-phases-to-deployment.js
20251126000000-add-approver-role.js
20251126063400-add-cloud-provider-columns.js
20251126070000-add-composite-indexes.js
20251126100000-add-missing-deployment-columns.js
20251126120000-fix-credential-secret-ref-id-constraints.js
20251126121000-create-deployment-drafts.js
20251126122000-create-alert-channel-configs.js
20251126123000-add-credential-not-null-constraints.js
```

---

## 11. Conclusion

**Overall Health: ⚠️ REQUIRES ATTENTION**

The application has several critical misalignments:

1. **Admin functionality is completely broken** - Frontend expects 7+ admin endpoints that don't exist
2. **Cost API partial mismatch** - Some endpoints exist, others don't
3. **Templates are memory-only** - No database persistence for custom templates
4. **Model/DB type differences** - Deployment.cloudProvider uses ENUM in code but VARCHAR in DB

**Recommended Priority:**
1. Fix Admin routes (P0 - SystemAdmin page non-functional)
2. Align Deployment.cloudProvider to STRING (P1)
3. Add missing Cost endpoints or update frontend (P1)
4. Document templates as code-based only (P1)

---

*Generated by sanitycheck10 fresh analysis*
