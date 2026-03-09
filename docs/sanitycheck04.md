# Sanity Check 04 Findings

## 1. Frontend Build Path Is Wrong
- `backend/src/server.js` sets `const frontendBuildPath = path.join(__dirname, '../frontend/build')`, which actually points to `backend/frontend/build` (a path that does not exist). Non-API GET requests therefore fall through to the 404 handler instead of serving the built React app in `frontend/build`.

## 2. API Response Contracts Do Not Match Frontend Expectations
- `backend/src/middleware/errorHandler.js` wraps all successful responses inside `{ status, message, data: { … } }`, but several UIs read top-level fields.
  - `frontend/src/pages/ClusterManagement.jsx` expects `response.data.clusters`, yet `/api/clusters` returns `{ data: { clusters, pagination } }`, so `clusters` is always `undefined`.
  - `frontend/src/pages/DeploymentMonitor.jsx` expects `response.data.deployments`, but `/api/deployments` responds with `{ data: { data: deployments, pagination } }`, breaking the monitor/poller logic.
  - `frontend/src/pages/DatabaseQueryInterface.jsx` filters `response.data.data.deployments` after calling `/deployments`; the backend payload nests the array at `response.data.data.data`, so the database dropdown is empty.

## 3. Analytics Dashboard Calls Missing Endpoints
- `frontend/src/pages/AnalyticsDashboard.jsx` hits `/api/metrics/aggregate`, `/api/metrics/trends`, and `/api/metrics/cost-analysis`, but the backend only exposes `/api/analytics/metrics`, `/api/analytics/trends`, `/api/analytics/cost`, etc. (`backend/src/routes/analytics.js`). These requests always 404, so analytics never render.

## 4. Authentication Token Storage Is Inconsistent
- Shared auth contexts/pages store tokens under `localStorage.setItem('authToken', …)` and the axios interceptor in `frontend/src/services/api.js` reads `authToken`.
- Several pages/components still send `Authorization: Bearer ${localStorage.getItem('auth_token')}` (e.g., `DeploymentMonitor.jsx`, `AnalyticsDashboard.jsx`, `components/AlertSettings.jsx`). Those requests never include the JWT and are rejected with 401 responses despite a valid login.

## 5. Deployment Model Columns Are Missing In The Database
- `backend/src/models/Deployment.js` and downstream services (`deploymentService`, `databaseScriptExecutor`) read/write `terraformWorkingDir`, `terraformState`, `terraformOutputs`, `deploymentPhase`, `terraformVersion`, `deploymentLogs`, and `metricsData`.
- None of the migrations under `backend/src/db/migrations/` create these columns (only `cloud_provider` was added). Runtime logs already show `column "terraform_working_dir" does not exist` (see `issues/backend-console-log.txt`). Any deployment read/write fails when Sequelize touches these fields, which also means database automation cannot access Terraform outputs.

## 6. Analytics Metrics Can’t Persist
- `backend/src/services/metricsCollector.js` stores derived analytics under `deployment.metricsData`, and analytics routes expect that field. The `Deployment` model includes `metricsData`, but there is no `metrics_data` column created in any migration, so Sequelize throws when saving and analytics always show zeroed stats.

## 7. Dockerized Postgres Schema Doesn’t Match ORM Models
- `postgres.Dockerfile` still provisions legacy tables with `SERIAL` IDs and simplified columns (e.g., `deployments` only has `name`, `status`, etc.; `alert_channel_configs` is `{ id SERIAL, user_id INTEGER, config JSONB }`).
- The current Sequelize models expect UUID primary keys, enums, JSONB columns, encrypted credential fields, and additional relations (DeploymentDrafts, AlertChannelConfig encrypted fields, etc.). Bootstrapping the database with this Dockerfile yields a schema incompatible with the application, so imports/associations fail immediately.
