# Sanity Check 05 - Application Cohesion Audit

**Date:** 2025-01-27  
**Scope:** Backend routes, services, models, frontend integration, database alignment  
**Purpose:** Identify discrepancies in routes, imports, exports, and database schema alignment  

---

## Executive Summary

This fresh sanity check identified **9 major discrepancies** that will cause runtime failures if not addressed. The issues range from frontend/backend API contract mismatches to missing database columns and method signature errors.

---

## Finding 1: Frontend AnalyticsDashboard Uses Non-Existent API Endpoints

**Severity:** Critical  
**Impact:** Analytics page will always fail to load data with 404 errors

### Files Affected
- `frontend/src/pages/AnalyticsDashboard.jsx` (lines 53-76)
- `backend/src/routes/analytics.js`
- `backend/src/server.js` (line 36)

### Problem
The `AnalyticsDashboard.jsx` component makes API calls to endpoints that don't exist:

```javascript
// AnalyticsDashboard.jsx lines 53-76
axios.get(`${API_BASE_URL}/metrics/aggregate`, ...)
axios.get(`${API_BASE_URL}/metrics/trends?days=30`, ...)
axios.get(`${API_BASE_URL}/metrics/cost-analysis`, ...)
```

But the backend only exposes routes under `/api/analytics/*`:
- `GET /api/analytics/metrics`
- `GET /api/analytics/trends`
- `GET /api/analytics/cost`

There is no `/api/metrics` route mounted in `server.js`.

### Evidence
- `server.js` line 36: `app.use('/api/analytics', require('./routes/analytics'));`
- No `metrics.js` route file exists in `backend/src/routes/`

---

## Finding 2: Token Storage Key Mismatch Between Components

**Severity:** Critical  
**Impact:** Authenticated users will get 401 errors on certain pages despite valid login

### Files Affected
- `frontend/src/services/api.js` (line 17): Uses `authToken`
- `frontend/src/contexts/AuthContext.jsx` (line 15): Uses `authToken`
- `frontend/src/pages/AnalyticsDashboard.jsx` (lines 60, 65, 70): Uses `auth_token`
- `frontend/src/pages/DeploymentMonitor.jsx` (lines 60, 161): Uses `auth_token`

### Problem
The main authentication flow stores the JWT as `authToken`:
```javascript
// api.js line 17
const token = localStorage.getItem('authToken');

// AuthContext.jsx line 15
const token = localStorage.getItem('authToken');
```

But several components read from `auth_token` (with underscore):
```javascript
// AnalyticsDashboard.jsx line 60
localStorage.getItem('auth_token')

// DeploymentMonitor.jsx line 60
localStorage.getItem('auth_token')
```

These components will never retrieve the token and all their API calls will fail with 401.

---

## Finding 3: MetricsCollector Method Signature Mismatch

**Severity:** High  
**Impact:** Analytics routes will throw runtime errors when called

### Files Affected
- `backend/src/routes/analytics.js` (lines 76, 129, 195)
- `backend/src/services/metricsCollector.js`

### Problem
The `analytics.js` route calls methods on `metricsCollector` that don't exist with the expected signatures:

```javascript
// analytics.js line 76
const metrics = metricsCollector.calculateAggregateMetrics(deployments);

// analytics.js line 129
const trends = metricsCollector.calculateTrends(deployments, metric, interval, daysNum);
```

But `MetricsCollector` only defines these as **static** methods:
- `MetricsCollector.getAggregateMetrics(options)` - takes options object, not deployments array
- `MetricsCollector.getDeploymentTrends(options)` - takes options object, not multiple params
- There is no `calculateAggregateMetrics` or `calculateTrends` method

The route imports `metricsCollector` as a class/module and calls instance methods that don't exist.

---

## Finding 4: Missing `metricsData` Column in Database

**Severity:** Critical  
**Impact:** Any operation that tries to save metrics data will fail with SQL error

### Files Affected
- `backend/src/models/Deployment.js` - references `metricsData` field
- `backend/src/services/metricsCollector.js` (lines 21-22, 53-54, 95-96, etc.)
- `backend/src/db/migrations/20250101000000-init.js` - no `metrics_data` column

### Problem
The `Deployment` model does not define a `metricsData` field, but `metricsCollector.js` extensively reads/writes to it:

```javascript
// metricsCollector.js line 21-22
deployment.metricsData = {
  ...deployment.metricsData,
  startTime: new Date().toISOString(),
  ...
};
await deployment.save();  // Will fail - column doesn't exist
```

Neither the Deployment model definition nor any migration creates a `metrics_data` column. Sequelize will throw when trying to save.

---

## Finding 5: Missing Terraform-Related Columns in Migrations

**Severity:** High  
**Impact:** Terraform deployments will fail when trying to save state

### Files Affected
- `backend/src/models/Deployment.js` (lines 95-132)
- `backend/src/db/migrations/20250101000000-init.js`
- All migration files

### Problem
The `Deployment` model defines these fields:
```javascript
terraformWorkingDir: { type: DataTypes.STRING, ... }
terraformState: { type: DataTypes.JSONB, ... }
terraformOutputs: { type: DataTypes.JSONB, ... }
deploymentPhase: { type: DataTypes.ENUM(...), ... }
terraformVersion: { type: DataTypes.STRING, ... }
deploymentLogs: { type: DataTypes.JSONB, ... }
```

But the init migration (`20250101000000-init.js`) does **not** create these columns. No subsequent migration adds them except `deploymentPhase` enum values (which assumes the column exists).

Columns missing from migrations:
- `terraform_working_dir`
- `terraform_state`
- `terraform_outputs`
- `deployment_phase`
- `terraform_version`
- `deployment_logs`
- `metrics_data`

---

## Finding 6: postgres.Dockerfile Schema Incompatible with Sequelize Models

**Severity:** High  
**Impact:** Docker-initialized database will not work with application

### Files Affected
- `postgres.Dockerfile` (lines 27-120)
- `backend/src/models/*.js`
- `backend/src/db/migrations/*.js`

### Problem
The `postgres.Dockerfile` creates tables with incompatible schema:

| postgres.Dockerfile | Sequelize Models/Migrations |
|---------------------|----------------------------|
| `id SERIAL PRIMARY KEY` | `id UUID PRIMARY KEY` |
| `user_id INTEGER` | `user_id UUID` |
| `password_hash VARCHAR(255)` | `password_hash TEXT` |
| No `cloud_provider` column | `cloud_provider ENUM(...)` required |
| No `vault_type` column | `vault_type ENUM(...)` required |

If using the Docker image with pre-seeded schema, foreign key constraints and data types will fail.

---

## Finding 7: Frontend Build Path Incorrect in server.js

**Severity:** Medium  
**Impact:** Production build won't serve frontend static files correctly

### Files Affected
- `backend/src/server.js` (lines 128-130)

### Problem
```javascript
// server.js lines 128-130
const frontendBuildPath = path.join(__dirname, '../frontend/build');
app.use(express.static(frontendBuildPath));
```

Since `__dirname` is `backend/src`, the path resolves to:
- `backend/src/../frontend/build` → `backend/frontend/build`

But frontend build output is at:
- `frontend/build` (at project root)

Correct path should be:
```javascript
const frontendBuildPath = path.join(__dirname, '../../frontend/build');
```

---

## Finding 8: Deployment Model Uses String for cloudProvider But Route Validates ENUM

**Severity:** Medium  
**Impact:** Inconsistent validation behavior

### Files Affected
- `backend/src/models/Deployment.js` (line 30)
- `backend/src/db/migrations/20251126063400-add-cloud-provider-columns.js` (line 13)
- `backend/src/routes/deployments.js` (line 14)

### Problem
The migration adds `cloud_provider` as `Sequelize.STRING`:
```javascript
// Migration line 13
type: Sequelize.STRING,
allowNull: false,
defaultValue: 'aws'
```

But the Deployment model defines it as ENUM:
```javascript
// Deployment.js line 30
cloudProvider: {
  type: DataTypes.ENUM('aws', 'azure', 'gcp', 'digitalocean', 'linode'),
  allowNull: false,
}
```

Sequelize will try to create/use an ENUM type that doesn't exist in the database (since migration created STRING), causing potential validation inconsistencies.

---

## Finding 9: DeploymentLog Model Uses Different Column Names

**Severity:** Medium  
**Impact:** Log queries may fail with column not found errors

### Files Affected
- `backend/src/routes/logs.js` (line 66-75)
- `backend/src/db/migrations/20250101000001-add-missing-tables.js` (lines 8-50)
- `backend/src/models/DeploymentLog.js`

### Problem
The logs route queries for columns that may not match migration:

```javascript
// logs.js line 66-75
logs: logs.rows.map(log => ({
  id: log.id,
  timestamp: log.createdAt,
  phase: log.phase,         // Migration has 'log_type', not 'phase'
  level: log.level,         // Migration has 'log_level'
  message: log.message,
  details: log.details,     // Migration has 'data'
  source: log.source,
}))
```

The migration creates:
- `log_level` (not `level`)
- `log_type` (not `phase`)
- `data` (not `details`)

Model/route expects different column names than what migration creates.

---

## Summary Table

| # | Finding | Severity | Category |
|---|---------|----------|----------|
| 1 | AnalyticsDashboard calls /api/metrics/* but backend exposes /api/analytics/* | Critical | API Mismatch |
| 2 | Token storage key mismatch (authToken vs auth_token) | Critical | Auth |
| 3 | MetricsCollector method signatures don't match route calls | High | Service |
| 4 | No metricsData column in database migrations | Critical | Database |
| 5 | Missing Terraform-related columns in migrations | High | Database |
| 6 | postgres.Dockerfile schema incompatible with models | High | Database |
| 7 | Frontend build path resolves incorrectly | Medium | Deployment |
| 8 | cloudProvider STRING in migration vs ENUM in model | Medium | Database |
| 9 | DeploymentLog column names don't match between route and migration | Medium | Database |

---

## Recommended Fix Priority

1. **Immediate (Critical):**
   - Fix token storage key consistency (Finding 2)
   - Add missing database columns via new migration (Findings 4, 5)
   - Fix AnalyticsDashboard API endpoints (Finding 1)

2. **High Priority:**
   - Fix MetricsCollector method signatures (Finding 3)
   - Update postgres.Dockerfile to match Sequelize schema (Finding 6)
   - Fix cloudProvider type mismatch (Finding 8)
   - Fix DeploymentLog column mappings (Finding 9)

3. **Medium Priority:**
   - Fix frontend build path (Finding 7)

---

## Files Requiring Changes (Summary)

### Backend
- `backend/src/server.js` - Fix frontend build path
- `backend/src/routes/analytics.js` - Fix metricsCollector method calls
- `backend/src/routes/logs.js` - Fix column name mappings
- `backend/src/services/metricsCollector.js` - Add missing methods or fix signatures

### Frontend
- `frontend/src/pages/AnalyticsDashboard.jsx` - Fix API endpoints and token key
- `frontend/src/pages/DeploymentMonitor.jsx` - Fix token key

### Database
- New migration needed for: `metrics_data`, `terraform_working_dir`, `terraform_state`, `terraform_outputs`, `deployment_phase`, `terraform_version`, `deployment_logs`

### Docker
- `postgres.Dockerfile` - Align schema with Sequelize models

---

*This report is for review only. No changes have been made to the codebase.*
