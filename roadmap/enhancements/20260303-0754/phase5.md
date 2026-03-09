# Phase 5 — Integration Testing, Security Hardening & Polish

**Feature**: End-to-end validation, security review, idle timeout, scheduled sync, and operational polish  
**Priority**: High | **Complexity**: Medium | **Estimated Effort**: 3–5 days  
**Dependencies**: Phases 1–4 completed  
**Reference**: `docs/For Reference/AD_Auth/AD-AUTH-INTEGRATION-GUIDE.md` §§ Security, Troubleshooting

---

## Rationale — Why Phase 5

Phases 1–4 deliver all functional code. This phase ensures it's production-ready: idle session timeout, scheduled AD sync, comprehensive audit logging, security hardening, edge case handling, and documentation. No new features — only resilience and polish.

---

## Deliverables

### Step 5.1 — Idle Session Timeout

**New file**: `frontend/src/hooks/useIdleTimeout.js`

A custom hook that logs users out after a configurable period of inactivity.

**Behavior**:
- Track mouse movement, keyboard, scroll, and touch events
- Default timeout: 30 minutes (configurable per role — admin may want longer)
- At 5 minutes remaining: show a warning dialog: "Your session will expire in 5 minutes. [Stay Signed In] [Logout]"
- "Stay Signed In" resets the timer and calls `refreshToken()`
- If no interaction: call `logout()` and redirect to `/login` with `?reason=idle`
- Login page shows "Your session expired due to inactivity" when `reason=idle`

**Integration point**: Wrap in `Layout.jsx` so it's active on all authenticated pages.

**AD-specific consideration**: AD sessions should respect the same idle timeout. No difference in behavior between local and AD users.

### Step 5.2 — Scheduled AD User Sync

**New file**: `backend/src/jobs/adSyncJob.js`

A background job that periodically synchronizes AD users:

**Implementation**:
```javascript
const cron = require('node-cron');  // or use setInterval for simplicity

class AdSyncJob {
  start() {
    // Load active AD config
    // If config exists and sync_interval_minutes > 0:
    //   Schedule recurring sync
    // Log each sync result
  }
  
  async runSync(configId) {
    // Same logic as POST /api/ad-config/:id/sync endpoint
    // But runs unattended — logs only, no HTTP response
  }
  
  stop() {
    // Cancel scheduled job
  }
}
```

**Startup integration**: In `backend/src/server.js`, after DB connection is verified:
```javascript
const adSyncJob = new AdSyncJob();
adSyncJob.start();
```

**Config change handling**: When an AD config is activated/deactivated/updated via API, restart the sync job with new settings.

**Dependency decision**: Use `node-cron` for production-quality scheduling, or a simple `setInterval` for MVP. The reference doc uses a Python-style scheduler — either approach works for Node.js.

### Step 5.3 — Comprehensive Audit Trail

Ensure all security-relevant operations are logged to the `audit_logs` table.

**Audit events to verify coverage**:

| Category | Event | Logged Fields |
|----------|-------|---------------|
| **Auth** | Local login success | userId, email, IP, userAgent |
| **Auth** | Local login failure | email, IP, reason, lockout status |
| **Auth** | AD login success | userId, username, resolvedRole, adGroups |
| **Auth** | AD login failure | username, IP, reason (bind fail, user not found, etc.) |
| **Auth** | Token refresh | userId, IP |
| **Auth** | Logout | userId, authProvider |
| **Auth** | Session idle timeout | userId, lastActivity |
| **Auth** | Account locked | email/username, attempt count |
| **AD Config** | Config created | configId, name, serverUrl, createdBy |
| **AD Config** | Config updated | configId, changedFields (never passwords) |
| **AD Config** | Config activated | configId, deactivatedConfigId |
| **AD Config** | Config deleted | configId, name, deletedBy |
| **AD Config** | Connection tested | configId, success, latencyMs |
| **AD Config** | Service account verified | configId, success |
| **AD Sync** | Manual sync triggered | configId, triggeredBy |
| **AD Sync** | Sync completed | configId, synced, created, updated, errors, duration |
| **AD Sync** | Scheduled sync | configId, same stats |
| **Role Mapping** | Mapping created | configId, groupDn, mappedRole |
| **Role Mapping** | Mapping updated | mappingId, changedFields |
| **Role Mapping** | Mapping deleted | mappingId, groupDn |
| **Theme** | Theme preferences updated | userId, presetKey, mode |

**Implementation**: Use existing `logger.security()` for auth events and create a dedicated `auditService.log(category, event, details, userId)` method that writes to both Winston logs and the `audit_logs` table.

### Step 5.4 — Security Hardening Checklist

Review and harden all Phase 1–4 code against these security requirements:

#### Authentication Security
- [ ] **Bind password never logged**: Verify `logger` calls in `ldapService.js` and `adConfigService.js` never include plaintext passwords
- [ ] **Bind password never in API responses**: All `GET /ad-config` responses mask the password field (`"********"` or omit entirely)
- [ ] **Token rotation**: Refresh tokens are single-use — each refresh issues a new refresh token and invalidates the old one
- [ ] **Token expiry alignment**: Access token TTL ≤ 1 hour, refresh token TTL ≤ 7 days
- [ ] **LDAPS preferred**: Default SSL to `true`, show warning in UI when `useSsl === false`
- [ ] **Certificate validation**: In production, `ldapjs` client must validate server certificates (no `rejectUnauthorized: false`)
- [ ] **Account lockout applies to AD**: Same 5-attempt / 15-minute lockout for AD login attempts
- [ ] **Rate limiting applied**: All new endpoints have appropriate rate limiters

#### Data Security
- [ ] **Encryption key rotation plan**: Document how to rotate the AES encryption key without losing existing encrypted credentials
- [ ] **SQL injection**: All Sequelize queries use parameterized queries (no raw string interpolation)
- [ ] **XSS prevention**: All user-provided strings (group names, config names) are sanitized before rendering
- [ ] **CSRF**: Verify token-based auth is sufficient (no cookie-based sessions to protect)

#### Operational Security
- [ ] **Error messages don't leak internals**: LDAP errors (wrong DN, invalid filter) return generic user-facing messages with detailed logs server-side only
- [ ] **Failed login doesn't reveal user existence**: "Invalid credentials" for both wrong username and wrong password
- [ ] **Password field cleared on failed login**: Frontend clears password input, keeps username
- [ ] **Idle timeout cannot be bypassed**: Client-side timer backed by server-side token expiry

### Step 5.5 — Error Handling & Edge Cases

Test and handle these edge cases:

| Scenario | Expected Behavior |
|----------|------------------|
| AD server goes down mid-session | Active AD sessions continue until token expires; new AD logins fail with `AD_CONNECTION_ERROR`; local admin login still works |
| AD config deleted while users are logged in | Active sessions continue; new AD logins return `AD_NOT_CONFIGURED` |
| User removed from all AD groups | On next sync or login: role resolves to `config.defaultRole` (e.g., viewer) |
| User disabled in AD | On next login: LDAP bind fails; existing session continues until token expires |
| Multiple AD configs exist | Only one can be active (DB constraint); UI shows which is active |
| AD user tries to change password | Backend returns error: "Password changes must be made through your organization's Active Directory" |
| AD user exists locally with same email | Match by `externalId` first, email second; prompt admin to merge if conflict |
| Sync finds 1000+ users | Paginate LDAP search (500 per page); log progress; don't timeout |
| Network timeout during LDAP bind | Respect `connectionTimeout`; return structured error with retry suggestion |
| Invalid LDAP search filter | Catch `ldapjs` filter parse error; return helpful message to admin |

### Step 5.6 — Environment Variable Documentation

**File**: `.env.example` (update)

Add new AD-related environment variables with documentation:

```bash
# ─── AD/LDAP Authentication (Optional) ───
# AD configuration is stored in the database (ad_configurations table)
# and managed through the System Admin UI. These env vars are for
# overrides and defaults only.

# Encryption key for AD service account passwords
# If not set, derives from JWT_SECRET (not recommended for production)
ENCRYPTION_KEY=your-32-char-encryption-key-here

# Default token expiry (can be overridden in AD config)
ACCESS_TOKEN_EXPIRY=1h
REFRESH_TOKEN_EXPIRY=7d

# Idle session timeout (minutes)
SESSION_IDLE_TIMEOUT=30

# AD sync schedule (cron expression, empty to disable)
AD_SYNC_SCHEDULE=*/60 * * * *
```

### Step 5.7 — Backend Health Check Update

**File**: `backend/src/routes/health.js` (or equivalent)

Add AD connectivity to the health check response:

```json
{
  "status": "healthy",
  "database": "connected",
  "adLdap": {
    "configured": true,
    "lastConnectionTest": "2025-03-03T07:30:00Z",
    "lastTestResult": "success"
  }
}
```

### Step 5.8 — Documentation

**New file**: `docs/AD_LDAP_SETUP_GUIDE.md`

User-facing documentation covering:
1. Prerequisites (AD service account, network access to LDAP port)
2. Initial setup walkthrough (with screenshots placeholder references)
3. Configuring LDAP connection settings
4. Setting up service account
5. Creating role mappings
6. Testing the configuration
7. Enabling AD login
8. Troubleshooting common errors
9. Security recommendations

**New file**: `docs/THEME_CUSTOMIZATION_GUIDE.md`

User-facing documentation covering:
1. Accessing theme settings
2. Choosing a color preset
3. Creating custom colors
4. Display mode (dark/light/system)
5. Theme persistence behavior

---

## File Inventory

### New Files
| File | Purpose |
|------|---------|
| `frontend/src/hooks/useIdleTimeout.js` | Idle session timeout with warning dialog |
| `backend/src/jobs/adSyncJob.js` | Scheduled AD user synchronization |
| `backend/src/services/auditService.js` | Structured audit logging to DB + Winston |
| `docs/AD_LDAP_SETUP_GUIDE.md` | Admin setup documentation |
| `docs/THEME_CUSTOMIZATION_GUIDE.md` | User documentation |

### Modified Files
| File | Changes |
|------|---------|
| `backend/package.json` | Add `node-cron` (if using cron scheduling) |
| `backend/src/server.js` | Start `adSyncJob` on boot |
| `backend/src/services/index.js` | Export `auditService` |
| `frontend/src/components/Layout.jsx` | Integrate `useIdleTimeout` hook |
| `frontend/src/pages/Login.jsx` | Show idle timeout message when `?reason=idle` |
| `.env.example` | Add AD/encryption/session env vars |

---

## Testing Matrix

### Unit Tests

| Module | Test Cases |
|--------|-----------|
| `encryption.js` | Encrypt/decrypt roundtrip, key derivation, invalid input handling |
| `ldapService.js` | Mock `ldapjs` — test connect, bind, search, error mapping |
| `authService.js` | Local auth unchanged, AD auth creates user, role resolution |
| `adConfigService.js` | CRUD operations, activation constraint, password encryption |
| `useIdleTimeout.js` | Timer reset on activity, warning dialog trigger, logout on expiry |

### Integration Tests

| Scenario | Steps |
|----------|-------|
| Local login regression | POST /auth/login → verify tokens + user |
| AD login happy path | Create AD config → activate → POST /auth/ad-login → verify user created |
| AD login with role mapping | Create config + mappings → AD login → verify resolved role |
| Token refresh | Login → wait → POST /auth/refresh → verify new tokens |
| AD config CRUD | Create → update → test-connection → activate → delete |
| Role mapping CRUD | Create mapping → update priority → test resolution → delete |
| User sync | Create config → POST /sync → verify users created/updated |
| Theme persistence | PUT /profile with theme → GET /profile → verify theme returned |
| Idle timeout | Login → simulate idle → verify logout triggered |

### Manual Testing Checklist

- [ ] Full AD login flow with a real AD server (or LDAP test server like `forumsys.com`)
- [ ] Theme changes visible immediately across all pages
- [ ] Role-based nav filtering works for all 4 roles
- [ ] Admin can create, test, and activate AD configuration
- [ ] Role mapping resolution produces expected results
- [ ] Idle timeout warning appears at correct time
- [ ] Browser refresh preserves theme and auth state
- [ ] Multi-browser: login on browser A, change theme, see it on browser B after login

---

## Validation Criteria

- [ ] Zero security audit findings on the hardening checklist
- [ ] All edge cases from §5.5 have explicit handling (no unhandled exceptions)
- [ ] Audit trail captures all events from §5.3 table
- [ ] Idle timeout fires correctly and shows warning dialog
- [ ] Scheduled AD sync runs at configured interval
- [ ] Health check includes AD status
- [ ] Both documentation files are complete and accurate
- [ ] `.env.example` has all new variables documented
- [ ] No regressions in existing functionality (local auth, deployments, credentials)
- [ ] All integration test scenarios pass
