# Phase 3 — AD/LDAP Backend API Routes

**Feature**: HTTP endpoints for AD authentication and AD configuration management  
**Priority**: High | **Complexity**: Medium-High | **Estimated Effort**: 4–6 days  
**Dependencies**: Phase 2 completed (models, ldapService, authService updates)  
**Reference**: `docs/For Reference/AD_Auth/AD-AUTH-INTEGRATION-GUIDE.md` §§ Auth Router, AD Config Router

---

## Rationale — Why Phase 3

Phase 2 built the data layer and LDAP client. This phase exposes that functionality through REST endpoints: the AD login flow, LDAP status checks, and the admin interface for managing AD configurations and role mappings. No frontend work yet — these endpoints can be tested with curl/Postman.

---

## Current State Analysis

| Component | Current State | Gap |
|-----------|--------------|-----|
| **Auth routes** | `POST /login`, `POST /register`, `GET /profile`, `PUT /profile`, `PUT /change-password`, `POST /logout` | No AD login, no refresh token endpoint, no LDAP status |
| **Admin routes** | None for AD config | Need full CRUD for AD configs + role mappings |
| **Rate limiters** | `authLimiter` (5/15min) on auth routes | AD login should share the same limiter |
| **server.js** | Routes mounted with appropriate limiters | Need to register new route files |

---

## Deliverables

### Step 3.1 — AD Authentication Endpoints

**File**: `backend/src/routes/auth.js` (extend existing)

Add the following endpoints to the existing auth router:

#### `POST /api/auth/ad-login`

Authenticates a user via Active Directory / LDAP.

```
Request:  { username: string, password: string }
Response: { accessToken, refreshToken, user: { id, email, role, authProvider, firstName, lastName } }
Errors:   AD_NOT_CONFIGURED, AD_AUTH_FAILED, AD_CONNECTION_ERROR, ACCOUNT_DISABLED, ACCOUNT_LOCKED
```

**Flow**:
1. Validate input (username required, password required)
2. Load active AD config — if none, return `AD_NOT_CONFIGURED`
3. Call `authService.authenticateWithAd(username, password)`
4. If user's `isActive === false`, return `ACCOUNT_DISABLED`
5. Check account lockout (same `loginAttemptTracker` as local login)
6. On success: clear lockout counter, log security event, return tokens + user
7. On failure: increment lockout counter, log security event, return structured error

**Middleware**: `authLimiter` (shares the 5/15min limit with local login)

#### `POST /api/auth/refresh`

Issues a new access token from a valid refresh token.

```
Request:  { refreshToken: string }
Response: { accessToken, refreshToken (rotated) }
Errors:   INVALID_REFRESH_TOKEN, TOKEN_EXPIRED, USER_NOT_FOUND
```

**Flow**:
1. Verify refresh token via `authService.verifyToken(refreshToken)`
2. Check `token.type === 'refresh'`
3. Look up user by `token.userId` — verify still active
4. Generate new access + refresh token pair (token rotation)
5. Return new pair

> **Note**: This endpoint benefits both local and AD users. It's being added here because AD sessions typically need shorter access token TTLs with refresh capability.

#### `GET /api/auth/ldap-status`

Returns whether AD/LDAP authentication is configured and available.

```
Request:  (none — public endpoint, no auth required)
Response: { configured: boolean, serverName?: string }
```

**Purpose**: Frontend Login page calls this on mount to decide whether to show the "Sign in with AD" option. No sensitive config details are exposed — only a boolean and a friendly display name.

### Step 3.2 — AD Configuration Admin Routes

**New file**: `backend/src/routes/adConfig.js`

A dedicated router for managing AD/LDAP configurations. All endpoints require `authenticate` + `authorize(['admin'])`.

#### Configuration CRUD

| Method | Path | Purpose |
|--------|------|---------|
| `GET /api/ad-config` | List all AD configurations (mask encrypted fields) |
| `POST /api/ad-config` | Create new AD configuration |
| `GET /api/ad-config/:id` | Get single configuration by ID |
| `PUT /api/ad-config/:id` | Update configuration |
| `DELETE /api/ad-config/:id` | Delete configuration (cascade deletes role mappings) |
| `POST /api/ad-config/:id/activate` | Set this config as the active one (deactivates others) |
| `POST /api/ad-config/:id/deactivate` | Deactivate this config |

#### Connection Testing

| Method | Path | Purpose |
|--------|------|---------|
| `POST /api/ad-config/:id/test-connection` | Test LDAP connectivity with stored config |
| `POST /api/ad-config/test-connection` | Test with ad-hoc config (for pre-save testing) |

**`test-connection` response**:
```json
{
  "success": true,
  "message": "Successfully connected and bound to LDAP server",
  "serverInfo": {
    "serverUrl": "ldaps://ad.example.com:636",
    "baseDn": "DC=example,DC=com",
    "useSsl": true
  },
  "latencyMs": 45
}
```

#### Service Account Management

| Method | Path | Purpose |
|--------|------|---------|
| `PUT /api/ad-config/:id/service-account` | Update bind DN and password (encrypts password) |
| `POST /api/ad-config/:id/verify-service-account` | Test bind with stored service account credentials |

**Input for service account update**:
```json
{
  "bindDn": "CN=svc-zlmcdt,OU=ServiceAccounts,DC=corp,DC=example,DC=com",
  "bindPassword": "plaintext-password-here"
}
```
Password is encrypted via `encryption.js` before storage. The plaintext is **never** logged or returned in any response.

#### Group Browsing

| Method | Path | Purpose |
|--------|------|---------|
| `GET /api/ad-config/:id/groups` | Search/list AD groups visible to the service account |
| `GET /api/ad-config/:id/groups/:groupDn/members` | List members of a specific AD group |

**`GET /groups` query params**: `?search=DevOps&limit=50`

These endpoints are essential for the frontend AD admin UI — they let administrators browse the AD tree to select groups for role mapping without leaving the application.

#### User Sync

| Method | Path | Purpose |
|--------|------|---------|
| `POST /api/ad-config/:id/sync` | Trigger manual AD user sync |
| `GET /api/ad-config/:id/sync/status` | Get last sync status and stats |

**Sync operation**:
1. Search all users matching `userSearchFilter` within `userSearchBase`
2. For each AD user: find-or-create local User record, update `adGroups`, `lastAdSync`
3. Resolve and update roles from current group memberships
4. Return `{ synced: 47, created: 3, updated: 44, errors: 0, duration: '2.3s' }`

**Note**: Sync is a potentially long operation. For v1, it runs synchronously within the request. Future enhancement: move to a background job with Socket.IO progress updates.

### Step 3.3 — Role Mapping Endpoints

**New file**: `backend/src/routes/adRoleMappings.js`

Nested under AD config: all endpoints require `authenticate` + `authorize(['admin'])`.

| Method | Path | Purpose |
|--------|------|---------|
| `GET /api/ad-config/:configId/role-mappings` | List all role mappings for a config |
| `POST /api/ad-config/:configId/role-mappings` | Create a new group→role mapping |
| `PUT /api/ad-config/:configId/role-mappings/:id` | Update mapping (change role, priority, active) |
| `DELETE /api/ad-config/:configId/role-mappings/:id` | Delete a mapping |
| `POST /api/ad-config/:configId/role-mappings/test` | Test role resolution for a given username |

**`POST /role-mappings` input**:
```json
{
  "adGroupDn": "CN=DevOps,OU=Groups,DC=corp,DC=example,DC=com",
  "adGroupName": "DevOps",
  "mappedRole": "operator",
  "priority": 10
}
```

**`POST /role-mappings/test` input/output**:
```json
// Input
{ "username": "jsmith" }

// Output
{
  "username": "jsmith",
  "adGroups": ["CN=DevOps,OU=Groups,...", "CN=Admins,OU=Groups,..."],
  "matchedMappings": [
    { "group": "DevOps", "role": "operator", "priority": 10 },
    { "group": "Admins", "role": "admin", "priority": 100 }
  ],
  "resolvedRole": "admin",
  "reason": "Highest priority mapping: Admins → admin (priority 100)"
}
```

### Step 3.4 — AD Config Service

**New file**: `backend/src/services/adConfigService.js`

Business logic extracted from routes (following project conventions):

| Method | Purpose |
|--------|---------|
| `listConfigs()` | Get all configs (mask bind password) |
| `getConfig(id)` | Get single config with role mappings |
| `createConfig(data, userId)` | Create and validate config |
| `updateConfig(id, data)` | Update config, re-encrypt password if changed |
| `deleteConfig(id)` | Delete with cascade |
| `activateConfig(id)` | Deactivate all others, activate this one |
| `testConnection(configOrId)` | Call `ldapService.testConnection()` |
| `updateServiceAccount(id, bindDn, password)` | Encrypt and store |
| `searchGroups(id, search, limit)` | Call `ldapService` group search |
| `getGroupMembers(id, groupDn)` | Call `ldapService` member search |
| `syncUsers(id)` | Full AD→local user sync |
| `getSyncStatus(id)` | Return last sync metadata |
| `resolveRole(groups, configId)` | Query mappings, return highest-priority match |
| `testRoleResolution(configId, username)` | Search user groups + resolve role |

### Step 3.5 — Input Validation

All endpoints use `express-validator` inline (project convention).

**Key validation rules**:
- `serverUrl`: must be valid URL starting with `ldap://` or `ldaps://`
- `baseDn`: required, non-empty string
- `port`: integer between 1 and 65535
- `bindDn`: required, must contain `=` (basic DN format check)
- `bindPassword`: required on create, optional on update (keep existing if omitted)
- `mappedRole`: must be one of `['admin', 'approver', 'operator', 'viewer']`
- `priority`: integer, 0–1000
- `userSearchFilter`: must contain `{username}` placeholder
- `*Attribute` fields: alphanumeric, 1–100 chars

### Step 3.6 — Register Routes in Server

**File**: `backend/src/server.js`

```javascript
const adConfigRoutes = require('./routes/adConfig');
const adRoleMappingRoutes = require('./routes/adRoleMappings');

// Mount with credential-level rate limiter (20/15min, admin use only)
app.use('/api/ad-config', credentialLimiter, adConfigRoutes);
```

Role mapping routes are nested inside `adConfig.js` router using `express.Router({ mergeParams: true })`.

### Step 3.7 — Audit Logging

All AD config operations should be logged to `audit_logs` table:

| Action | Details Logged |
|--------|---------------|
| `ad_config.create` | Config name, server URL, created by |
| `ad_config.update` | Changed fields (not passwords) |
| `ad_config.delete` | Config name, deleted by |
| `ad_config.activate` | Config name, activated by |
| `ad_config.test_connection` | Success/failure, latency |
| `ad_role_mapping.create` | Group name, mapped role |
| `ad_role_mapping.update` | Changed fields |
| `ad_role_mapping.delete` | Group name |
| `ad_sync.manual` | Sync stats (synced, created, errors) |
| `ad_login.success` | Username, resolved role |
| `ad_login.failure` | Username, error reason |

Use `logger.security()` for auth events and `logger.info()` for config changes.

---

## File Inventory

### New Files
| File | Purpose |
|------|---------|
| `backend/src/routes/adConfig.js` | AD configuration CRUD + testing + sync endpoints |
| `backend/src/routes/adRoleMappings.js` | Group→role mapping CRUD + test resolution |
| `backend/src/services/adConfigService.js` | Business logic for AD config management |

### Modified Files
| File | Changes |
|------|---------|
| `backend/src/routes/auth.js` | Add `POST /ad-login`, `POST /refresh`, `GET /ldap-status` |
| `backend/src/server.js` | Mount `adConfig` routes with rate limiter |
| `backend/src/services/index.js` | Export `adConfigService` |

---

## API Summary — All New Endpoints

| Method | Path | Auth | Rate Limit | Purpose |
|--------|------|------|-----------|---------|
| `POST` | `/api/auth/ad-login` | Public | `authLimiter` | AD/LDAP login |
| `POST` | `/api/auth/refresh` | Public | `authLimiter` | Token refresh |
| `GET` | `/api/auth/ldap-status` | Public | `generalLimiter` | Check if AD is configured |
| `GET` | `/api/ad-config` | Admin | `credentialLimiter` | List AD configs |
| `POST` | `/api/ad-config` | Admin | `credentialLimiter` | Create AD config |
| `GET` | `/api/ad-config/:id` | Admin | `credentialLimiter` | Get AD config |
| `PUT` | `/api/ad-config/:id` | Admin | `credentialLimiter` | Update AD config |
| `DELETE` | `/api/ad-config/:id` | Admin | `credentialLimiter` | Delete AD config |
| `POST` | `/api/ad-config/:id/activate` | Admin | `credentialLimiter` | Activate config |
| `POST` | `/api/ad-config/:id/deactivate` | Admin | `credentialLimiter` | Deactivate config |
| `POST` | `/api/ad-config/:id/test-connection` | Admin | `credentialLimiter` | Test LDAP connection |
| `POST` | `/api/ad-config/test-connection` | Admin | `credentialLimiter` | Test ad-hoc connection |
| `PUT` | `/api/ad-config/:id/service-account` | Admin | `credentialLimiter` | Update service account |
| `POST` | `/api/ad-config/:id/verify-service-account` | Admin | `credentialLimiter` | Verify service account |
| `GET` | `/api/ad-config/:id/groups` | Admin | `credentialLimiter` | Browse AD groups |
| `GET` | `/api/ad-config/:id/groups/:dn/members` | Admin | `credentialLimiter` | List group members |
| `POST` | `/api/ad-config/:id/sync` | Admin | `credentialLimiter` | Trigger user sync |
| `GET` | `/api/ad-config/:id/sync/status` | Admin | `credentialLimiter` | Get sync status |
| `GET` | `/api/ad-config/:cid/role-mappings` | Admin | `credentialLimiter` | List role mappings |
| `POST` | `/api/ad-config/:cid/role-mappings` | Admin | `credentialLimiter` | Create role mapping |
| `PUT` | `/api/ad-config/:cid/role-mappings/:id` | Admin | `credentialLimiter` | Update role mapping |
| `DELETE` | `/api/ad-config/:cid/role-mappings/:id` | Admin | `credentialLimiter` | Delete role mapping |
| `POST` | `/api/ad-config/:cid/role-mappings/test` | Admin | `credentialLimiter` | Test role resolution |

**Total: 23 new endpoints** (3 auth + 20 admin)

---

## Validation Criteria

- [ ] `POST /api/auth/ad-login` with valid AD credentials returns tokens + user with `authProvider: 'ad'`
- [ ] `POST /api/auth/ad-login` with invalid credentials returns structured error, increments lockout
- [ ] `POST /api/auth/ad-login` when no AD config exists returns `AD_NOT_CONFIGURED`
- [ ] `POST /api/auth/refresh` rotates tokens correctly
- [ ] `GET /api/auth/ldap-status` returns `{ configured: false }` when no active config
- [ ] `GET /api/auth/ldap-status` returns `{ configured: true, serverName: "..." }` when active
- [ ] All `/api/ad-config` endpoints return 403 for non-admin users
- [ ] `POST /api/ad-config` creates config with encrypted bind password
- [ ] `GET /api/ad-config` never returns plaintext bind password
- [ ] `POST /api/ad-config/:id/test-connection` returns success/failure with latency
- [ ] `POST /api/ad-config/:id/activate` deactivates all other configs
- [ ] Role mapping CRUD works with proper FK constraints
- [ ] `POST /role-mappings/test` shows complete resolution chain with reasons
- [ ] All operations are logged to audit_logs
- [ ] Existing local login (`POST /api/auth/login`) still works unchanged
- [ ] Rate limiters are applied correctly to all new endpoints
