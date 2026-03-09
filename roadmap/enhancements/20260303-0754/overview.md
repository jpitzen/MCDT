# Enhancement Roadmap — Theme Customization & AD/LDAP Authentication

**Created**: 2026-03-03 07:54  
**Scope**: Two features — per-user theme customization and Active Directory / LDAP authentication  
**Reference Material**: `docs/For Reference/themes/customization.md`, `docs/For Reference/AD_Auth/AD-AUTH-INTEGRATION-GUIDE.md`  
**Target Platform**: ZL-MCDT (Node.js/Express backend + React/MUI frontend + PostgreSQL)

---

## Executive Summary

This roadmap adds two features to ZL-MCDT:

1. **Theme Customization** — Users can choose from 8 color presets or define custom colors, switch between dark/light/system modes, and have their preferences persisted to the database. This is a self-contained, low-risk enhancement.

2. **AD/LDAP Authentication** — Enterprise users can sign in with their corporate Active Directory credentials. Admins configure LDAP connection settings, map AD groups to ZL-MCDT roles, and optionally sync users on a schedule. Local admin login is always available as a fallback.

The work is organized into **5 sequential phases**, with Phase 1 (themes) deliverable independently and Phases 2–5 (AD auth) forming a dependent chain.

---

## Phase Overview

| Phase | Title | Focus | Effort | Dependencies |
|-------|-------|-------|--------|-------------|
| [Phase 1](phase1.md) | Theme Customization | DB migration, ThemeContext, ThemeCustomizer UI, navigation integration | 3–5 days | None |
| [Phase 2](phase2.md) | AD Auth Foundation | User model AD fields, `ad_configurations` + `ad_role_mappings` tables, `ldapjs` LDAP client, auth service updates | 5–8 days | Phase 1 |
| [Phase 3](phase3.md) | AD Auth Backend API | AD login endpoint, token refresh, LDAP status check, AD config CRUD (23 new endpoints), role mapping management | 4–6 days | Phase 2 |
| [Phase 4](phase4.md) | AD Auth Frontend | Dual-auth login, AuthContext overhaul, role-based routes/nav, AD config admin UI, group browser | 5–7 days | Phase 3 |
| [Phase 5](phase5.md) | Integration & Hardening | Idle timeout, scheduled sync, audit trail, security hardening, edge cases, documentation | 3–5 days | Phase 4 |

**Total estimated effort**: 20–31 days

---

## Dependency Graph

```
Phase 1 (Themes)
    │
    ▼
Phase 2 (AD Foundation)  ─── ldapjs install, DB schema, LDAP client
    │
    ▼
Phase 3 (AD Backend API) ─── 23 REST endpoints, adConfigService
    │
    ▼
Phase 4 (AD Frontend)    ─── Login UI, AuthContext, Admin UI
    │
    ▼
Phase 5 (Hardening)      ─── Security review, idle timeout, sync job, docs
```

**Phase 1 can ship independently.** It has no dependency on AD auth and provides immediate user value.

**Phases 2–5 must be sequential.** Each phase depends on the deliverables of the previous phase.

---

## File Impact Summary

### New Files (across all phases)

| File | Phase | Purpose |
|------|-------|---------|
| `backend/src/migrations/*-add-theme-preferences.js` | 1 | Theme JSONB column |
| `backend/migrations/add-theme-preferences.sql` | 1 | Raw SQL migration |
| `frontend/src/context/ThemeContext.jsx` | 1 | Theme provider + hook |
| `frontend/src/components/ThemeCustomizer.jsx` | 1 | Theme settings UI |
| `frontend/src/utils/colorHelpers.js` | 1 | Color utility functions |
| `backend/src/migrations/*-add-ad-auth-fields.js` | 2 | User AD columns |
| `backend/src/migrations/*-create-ad-configurations.js` | 2 | AD config table |
| `backend/src/migrations/*-create-ad-role-mappings.js` | 2 | Role mapping table |
| `backend/migrations/add-ad-auth-fields.sql` | 2 | Raw SQL migration |
| `backend/migrations/create-ad-configurations.sql` | 2 | Raw SQL migration |
| `backend/migrations/create-ad-role-mappings.sql` | 2 | Raw SQL migration |
| `backend/src/models/AdConfiguration.js` | 2 | Sequelize model |
| `backend/src/models/AdRoleMapping.js` | 2 | Sequelize model |
| `backend/src/services/ldapService.js` | 2 | LDAP client wrapper |
| `backend/src/utils/encryption.js` | 2 | Shared AES encryption |
| `backend/src/routes/adConfig.js` | 3 | AD config endpoints |
| `backend/src/routes/adRoleMappings.js` | 3 | Role mapping endpoints |
| `backend/src/services/adConfigService.js` | 3 | AD config business logic |
| `frontend/src/components/admin/AdConfigManager.jsx` | 4 | AD config admin UI |
| `frontend/src/components/admin/AdGroupBrowser.jsx` | 4 | AD group browser |
| `frontend/src/pages/AccessDenied.jsx` | 4 | 403 page |
| `frontend/src/hooks/useIdleTimeout.js` | 5 | Idle session timeout |
| `backend/src/jobs/adSyncJob.js` | 5 | Scheduled sync |
| `backend/src/services/auditService.js` | 5 | Audit logging |
| `docs/AD_LDAP_SETUP_GUIDE.md` | 5 | Admin documentation |
| `docs/THEME_CUSTOMIZATION_GUIDE.md` | 5 | User documentation |

**Total: 26 new files**

### Modified Files (across all phases)

| File | Phases | Changes |
|------|--------|---------|
| `backend/src/models/User.js` | 1, 2 | `themePreferences` JSONB, AD fields, nullable password |
| `backend/src/models/index.js` | 2 | Register new models + associations |
| `backend/src/routes/auth.js` | 1, 3 | Theme in profile, AD login, refresh, LDAP status |
| `backend/src/services/authService.js` | 2 | `authenticateWithAd()`, updated JWT payload |
| `backend/src/services/credentialService.js` | 2 | Refactor to use shared encryption |
| `backend/src/services/index.js` | 2, 3 | Export new services |
| `backend/src/server.js` | 3, 5 | Mount AD routes, start sync job |
| `backend/package.json` | 2, 5 | `ldapjs`, `node-cron` |
| `frontend/src/index.jsx` | 1, 4 | ThemeProvider, role-based ProtectedRoute |
| `frontend/src/context/AuthContext.jsx` | 4 | Multi-provider auth, token refresh, role utils |
| `frontend/src/services/api.js` | 4 | `adConfig` + `auth` namespaces, refresh interceptor |
| `frontend/src/pages/Login.jsx` | 4 | Dual-auth tabs |
| `frontend/src/pages/SystemAdmin.jsx` | 1, 4 | Appearance tab, AD/LDAP tab, user table updates |
| `frontend/src/components/Layout.jsx` | 1, 4, 5 | Dynamic theme colors, role nav, idle timeout |
| `.env.example` | 5 | New env vars documented |

**Total: 15 modified files**

---

## Database Schema Changes

### Phase 1 — Theme
```
users:
  + theme_preferences  JSONB  DEFAULT NULL
```

### Phase 2 — AD Auth
```
users:
  + auth_provider       VARCHAR(20)  DEFAULT 'local'
  + external_id         VARCHAR(255)
  + distinguished_name  TEXT
  + ad_groups           JSONB  DEFAULT '[]'
  + last_ad_sync        TIMESTAMPTZ
  ~ password            (change from NOT NULL to NULL)

ad_configurations:      NEW TABLE  (22 columns)
ad_role_mappings:       NEW TABLE  (8 columns)
```

---

## New Dependencies

| Package | Version | Phase | Purpose |
|---------|---------|-------|---------|
| `ldapjs` | ^3.x | 2 | LDAP protocol client for Node.js |
| `node-cron` | ^3.x | 5 | Scheduled AD sync (optional — can use `setInterval`) |

Both packages are well-maintained, widely used, and have no known security advisories.

---

## Technology Adaptation — Source → ZL-MCDT

The reference implementations are from a different tech stack. Key translations:

| Source (Python/FastAPI/Next.js) | ZL-MCDT (Node.js/Express/React) |
|--------------------------------|--------------------------------|
| `ldap3` (Python LDAP) | `ldapjs` (Node.js LDAP) |
| `cryptography.Fernet` (AES) | `crypto.createCipheriv` (AES-256-CBC) — already in use |
| `python-jose` (JWT) | `jsonwebtoken` — already in use |
| FastAPI `Depends()` | Express middleware chain |
| Pydantic validation | `express-validator` inline on routes |
| SQLAlchemy ORM | Sequelize ORM |
| Zustand state management | React Context (`useReducer` / `useState`) |
| Next.js TypeScript components | React CRA JavaScript components |
| FastAPI BackgroundTasks | `node-cron` or `setInterval` |

---

## Role System Alignment

The reference doc defines 7 roles (viewer → admin). ZL-MCDT currently has 4 roles.

**Decision**: Keep ZL-MCDT's 4-role system (`admin`, `approver`, `operator`, `viewer`). The AD group→role mappings map to these 4 roles. If the reference doc's additional roles (auditor, reviewer, professional_services, sales) are needed later, they can be added as a separate enhancement.

| ZL-MCDT Role | Permissions |
|-------------|-------------|
| `admin` | Full access — all features + System Admin |
| `approver` | Deployment approval workflows |
| `operator` | Create/manage deployments + credentials |
| `viewer` | Read-only access to deployments |

---

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|-----------|
| LDAP server unavailable | AD users can't login | Medium | Local admin fallback always works; clear error messaging |
| Password nullable breaks existing login | Auth regression | Low | Migration sets default `'local'`; bcrypt hooks check `authProvider` |
| Token refresh introduces session bugs | Users get logged out unexpectedly | Medium | Thorough testing matrix in Phase 5; 401 retry with backoff |
| Large AD user sync times out | Sync fails partway | Low | Paginated LDAP search; progress logging; future: background job |
| Theme preferences corrupt MUI rendering | Broken UI | Low | Validation on save; fallback to defaults if parse fails |
| Encryption key rotation | Lose access to encrypted AD passwords | Medium | Document rotation process; dual-key transition window |

---

## Implementation Order Recommendation

```
Week 1:  Phase 1 (Theme Customization) → Ship independently ✓
Week 2:  Phase 2 (AD Foundation)
Week 3:  Phase 3 (AD Backend API)
Week 4:  Phase 4 (AD Frontend)
Week 5:  Phase 5 (Hardening + Documentation) → Ship AD Auth ✓
```

**Checkpoints**:
- End of Week 1: Theme feature fully functional, demo-able
- End of Week 3: All AD API endpoints testable via curl/Postman
- End of Week 5: Full AD auth flow working end-to-end, security reviewed

---

## Folder Structure Reference

All new files follow the existing project structure:

```
backend/
  src/
    jobs/                          ← NEW directory
      adSyncJob.js                 ← Phase 5
    migrations/
      *-add-theme-preferences.js   ← Phase 1
      *-add-ad-auth-fields.js      ← Phase 2
      *-create-ad-configurations.js← Phase 2
      *-create-ad-role-mappings.js ← Phase 2
    models/
      User.js                      ← Modified (Phases 1, 2)
      AdConfiguration.js           ← Phase 2
      AdRoleMapping.js             ← Phase 2
      index.js                     ← Modified (Phase 2)
    routes/
      auth.js                      ← Modified (Phases 1, 3)
      adConfig.js                  ← Phase 3
      adRoleMappings.js            ← Phase 3
    services/
      authService.js               ← Modified (Phase 2)
      credentialService.js          ← Modified (Phase 2)
      ldapService.js               ← Phase 2
      adConfigService.js           ← Phase 3
      auditService.js              ← Phase 5
      index.js                     ← Modified (Phases 2, 3)
    utils/                         ← NEW directory
      encryption.js                ← Phase 2
    server.js                      ← Modified (Phases 3, 5)
  migrations/                      ← Raw SQL migrations
    add-theme-preferences.sql      ← Phase 1
    add-ad-auth-fields.sql         ← Phase 2
    create-ad-configurations.sql   ← Phase 2
    create-ad-role-mappings.sql    ← Phase 2

frontend/
  src/
    components/
      admin/                       ← NEW directory
        AdConfigManager.jsx        ← Phase 4
        AdGroupBrowser.jsx         ← Phase 4
      Layout.jsx                   ← Modified (Phases 1, 4, 5)
      ThemeCustomizer.jsx          ← Phase 1
    context/
      AuthContext.jsx              ← Modified (Phase 4)
      ThemeContext.jsx             ← Phase 1
    hooks/
      useIdleTimeout.js            ← Phase 5
    pages/
      AccessDenied.jsx             ← Phase 4
      Login.jsx                    ← Modified (Phase 4)
      SystemAdmin.jsx              ← Modified (Phases 1, 4)
    services/
      api.js                       ← Modified (Phase 4)
    utils/
      colorHelpers.js              ← Phase 1

docs/
  AD_LDAP_SETUP_GUIDE.md           ← Phase 5
  THEME_CUSTOMIZATION_GUIDE.md     ← Phase 5
```
