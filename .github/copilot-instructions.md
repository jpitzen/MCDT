# ZLAWS - Multi-Cloud Kubernetes Deployment Platform

## Architecture

Full-stack platform: React frontend → Express API → Terraform → 5 cloud K8s providers (AWS EKS, Azure AKS, GCP GKE, DigitalOcean DOKS, Linode LKE).

**Core data flow**: User configures deployment in `UnifiedDeploymentWizard` (6-phase wizard) → saves `DeploymentDraft` → approval triggers `deploymentService.createDeployment()` → `multiCloudOrchestrator` runs **fire-and-forget** terraform lifecycle (init → validate → plan → apply) → real-time progress via Socket.IO WebSocket → logs stored in `DeploymentLog`.

**Single-container production model**: Backend serves pre-built frontend static files (`Dockerfile` copies `frontend/build/` into the backend image). Nginx handles reverse proxy.

## Development

```powershell
# Full local stack (from root) — postgres auto-migrates on boot
docker-compose up -d

# Or manual:
docker-compose up -d postgres vault redis   # Infrastructure (vault dev token: myroot)
cd backend && npm run db:migrate && npm run dev   # API on :5000
cd frontend && npm start                          # React on :3000 (proxies to :5000)

# Minikube
.\scripts\deploy-to-minikube.ps1
```

## Backend Conventions (`backend/src/`)

### Route pattern (see `routes/deployments.js`)
```javascript
const router = express.Router();
router.use(authenticate);  // Auth applied at router level, NOT in server.js

router.post('/',
  authorize(['admin', 'operator']),     // RBAC: 'admin' has wildcard, 'operator' has deploy/creds, 'viewer' read-only
  [ body('clusterName').trim().isLength({ min: 1, max: 100 }) ],  // express-validator inline
  asyncHandler(async (req, res) => {    // asyncHandler from middleware/errorHandler.js
    // ... business logic ...
    sendSuccess(res, data, 201, 'Created');  // Structured JSON: { status, message, data, timestamp }
  })
);
```

### Key conventions
- **Import services via barrel**: `const { deploymentService, logger } = require('../services')` — see `services/index.js`
- **Import models directly**: `const { Deployment, Credential } = require('../models')` — associations in `models/index.js`
- **Logger**: `logger.deployment(deploymentId, phase, 'message', { metadata })` for deployment-scoped logs; `logger.security()` for auth events
- **Error responses**: Structured codes like `MISSING_AUTH_HEADER`, `TOKEN_EXPIRED`, `INVALID_TOKEN`. Stack traces only in `NODE_ENV=development`
- **WebSocket emissions**: `websocketServer.emitDeploymentUpdate(deploymentId, eventType, data)` — `eventType` is `'log'`/`'phase-update'`/`'progress-update'`/`'completed'`/`'failed'`; clients join room `deployment:${id}`
- **Rate limiters**: `generalLimiter` (100/15min) on all `/api/`, `authLimiter` (5/15min, skips success), `deploymentLimiter` (10/hr user-keyed), `credentialLimiter` (20/15min user-keyed). Applied at mount in `server.js`, auth applied inside route files.
- **Auth middleware** (`middleware/auth.js`): `authenticate` (required JWT), `optionalAuth` (soft, no 401), `authorize(['admin'])` (simple role-array check). JWT payload has `{ userId, email, role }` → mapped to `req.user.id`.
- **Extended RBAC** (`middleware/rbac.js`) — **4 additional middleware**, separate from `authorize`:
  - `checkPermission('deployment:create')` — colon-delimited permission strings; checks global role map first, falls through to team-based `member.hasPermission()` if `teamId` is in params/body
  - `authorizeTeam(['admin', 'operator'])` — requires `teamId`, checks team membership role
  - `authorizeResource('write')` — checks `SharedResource` permission (read/write/delete/admin) for team+resource pair
  - `authorizeTeamAdmin()` — team owner or admin-role member only
- **Sequelize `sync()` is disabled** — tables managed via migrations only. `sequelize.authenticate()` runs at startup.

### Migrations — two systems coexist
- **Sequelize CLI** (`npm run db:migrate` → `sequelize-cli db:migrate`): standard JS migrations in `backend/src/migrations/`
- **Raw SQL** (`node backend/run-migrations.js`): idempotent SQL files in `backend/migrations/` with `IF NOT EXISTS`/`IF EXISTS` guards
```sql
-- Migration: add-destruction-workflow-fields
-- Date: 2025-01-15
ALTER TABLE deployments ADD COLUMN IF NOT EXISTS destruction_requested_at TIMESTAMP WITH TIME ZONE;
```

### Adding an API endpoint
1. Create `backend/src/routes/myRoute.js` — apply `authenticate` at router level
2. Add `express-validator` chains inline on route definitions
3. Use `asyncHandler`, `sendSuccess`, `sendError` from `middleware/errorHandler.js`
4. Import and register in `backend/src/server.js` with appropriate rate limiter
5. Export service logic from `services/index.js` barrel

## Frontend Conventions (`frontend/src/`)

### Structure
- **Pages** (`pages/`): Flat files, one per route. Only `UnifiedDeploymentWizard/` has its own subdirectory with local components/hooks/context.
- **Components** (`components/`): Shared UI — `Layout.jsx` (AppBar + Drawer shell), `LogViewer.jsx`, `ErrorBoundary.jsx`
- **Styling**: MUI v5 with `sx` prop predominantly (rare `styled()` in wizard's `PhaseNavigation.jsx`; no CSS modules). Theme in `index.jsx` with dark/light/auto cycling via `ThemeContext`.
- **No global state library**: Auth via `AuthContext`, wizard via `WizardContext` (useReducer, ~80 action types), everything else is component-local `useState`.

### Auth flow
- Token stored in `localStorage('authToken')` — `ProtectedRoute` checks it directly (not via context)
- Axios interceptor in `services/api.js` attaches `Bearer` token; 401 response clears token and redirects to `/login`

### API client (`services/api.js`) — dual interface
The `api` object exposes **both** namespaced methods and raw Axios passthrough. Prefer namespaced:
```jsx
// ✅ Preferred — namespaced
import api from '../services/api';        // or: import { deploymentsApi } from '../services/api';
api.deployments.create(data);              // deploymentsApi.create(data)
api.credentials.validate(id);

// ⚠️ Legacy — raw Axios passthrough (exists for backwards compat)
api.get('/deployments', { params });       // works, but bypasses namespacing
api.post('/credentials', data);
```
All methods share the same `apiClient` Axios instance (same interceptors, same auth header injection).

### WebSocket — TWO hooks exist (not interchangeable)
- `useWebSocket` — Socket.IO built-in reconnection, events: `deployment:log`, `deployment:phase-update`, `deployment:progress-update`, `deployment:completed`, `deployment:failed`
- `useDeploymentSocket` — manual exponential backoff, events: `deployment:completion` (different name from `completed`!), `deployment:terraform-output`, `deployment:error`, `deployment:failure`, `deployment:rollback-completed`

### UnifiedDeploymentWizard (`pages/UnifiedDeploymentWizard/`)
6-phase lazy-loaded wizard with `WizardContext` (useReducer). Phases: Phase1Prerequisites → Phase2ClusterConfig → Phase3Database → Phase4Storage → Phase5Deploy → Phase6Operations. Supports `guided` vs `expert` mode. Saves drafts to backend. Domain hooks in `hooks/` encapsulate API calls per phase.

## Terraform (`terraform/`)

### Multi-cloud via conditional `count`
```hcl
# terraform/modules/kubernetes_cluster/main.tf
resource "aws_eks_cluster" "main" {
  count = var.cloud_provider == "aws" ? 1 : 0
  # ...
}
```
All 5 providers in one module, outputs normalized via `locals` block. Only AWS has supplementary modules (ECR, EFS, RDS, S3, EC2). Only `terraform/environments/aws/` exists.

### State keying
Terraform state dirs use `{provider}-{region}-{clusterName}` (NOT deployment ID), so state persists across re-deployments of the same cluster.

## Database Schema

| Table | Key fields |
|-------|-----------|
| `users` | bcrypt passwords, `role` (admin/operator/viewer) |
| `credentials` | Encrypted cloud provider creds, linked to user |
| `deployments` | status, `cloud_provider`, terraform `outputs` JSON, linked to user + credential |
| `deployment_drafts` | Pre-approval configs, `approvedBy` FK |
| `deployment_logs` | Per-phase terraform output, linked to deployment |
| `teams` / `team_members` | Team-based RBAC with `hasPermission()` model method |
| `audit_logs` | Request/action audit trail |
| `alert_channel_configs` | Notification channel settings |
| `container_deployments` | Container-level deployment tracking |
| `database_credentials` | DB connection info for SQL script execution |
| `deployment_sql_scripts` | SQL scripts linked to deployments |
| `shared_resources` | Team-resource permission mappings |

## Environment Variables

Copy `.env.example` to `.env`. Critical: `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `TERRAFORM_WORKING_DIR` (default: `/tmp/zlaws_deployments`).

## Debugging Deployments

- Backend logs: `backend/logs/` (Winston, also `logger.deployment()` method)
- DB: query `deployment_logs` table or `GET /api/logs/:deploymentId`
- Browser: WebSocket events prefixed `[WebSocket]` in console
- Terraform: state in `TERRAFORM_WORKING_DIR/{provider}-{region}-{cluster}/`
