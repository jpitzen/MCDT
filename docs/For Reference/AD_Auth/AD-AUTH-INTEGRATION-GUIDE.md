# Active Directory Authentication Integration Guide

## For Developers Integrating AD/LDAP Auth Into Their Platform

**Source Project:** CloudEstimator (FastAPI + Next.js)
**Date:** February 2026
**Stack:** Python/FastAPI backend, Next.js/React/TypeScript frontend, PostgreSQL database

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [File Inventory](#2-file-inventory)
3. [Backend Implementation](#3-backend-implementation)
   - 3.1 [Database Schema](#31-database-schema)
   - 3.2 [Configuration](#32-configuration)
   - 3.3 [LDAP Authentication Module](#33-ldap-authentication-module)
   - 3.4 [JWT Token Management](#34-jwt-token-management)
   - 3.5 [Auth Router (Login/Logout/Refresh)](#35-auth-router)
   - 3.6 [AD Configuration Admin Router](#36-ad-configuration-admin-router)
   - 3.7 [AD Config Service](#37-ad-config-service)
   - 3.8 [Audit Logging](#38-audit-logging)
4. [Frontend Implementation](#4-frontend-implementation)
   - 4.1 [TypeScript Types](#41-typescript-types)
   - 4.2 [API Client Layer](#42-api-client-layer)
   - 4.3 [Auth State Store](#43-auth-state-store)
   - 4.4 [Login Modal Component](#44-login-modal-component)
   - 4.5 [Auth Guard / Protected Routes](#45-auth-guard--protected-routes)
   - 4.6 [Idle Timeout Hook](#46-idle-timeout-hook)
5. [Authentication Flow](#5-authentication-flow)
6. [Role-Based Access Control (RBAC)](#6-role-based-access-control-rbac)
7. [AD Group → Role Mapping](#7-ad-group--role-mapping)
8. [Service Account Management](#8-service-account-management)
9. [API Endpoints Reference](#9-api-endpoints-reference)
10. [Dependencies & Requirements](#10-dependencies--requirements)
11. [Environment Variables](#11-environment-variables)
12. [Database Migrations](#12-database-migrations)
13. [Security Considerations](#13-security-considerations)
14. [Step-by-Step Integration Checklist](#14-step-by-step-integration-checklist)
15. [Troubleshooting](#15-troubleshooting)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js)                      │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │ LoginModal   │  │  AuthGuard   │  │   authStore        │   │
│  │ (UI form)    │──│ (route prot) │──│  (Zustand state)   │   │
│  └──────┬───────┘  └──────────────┘  └─────────┬──────────┘   │
│         │                                       │               │
│         └───────────────┬───────────────────────┘               │
│                         │                                       │
│                   ┌─────▼──────┐                                │
│                   │  api.ts    │  (Axios + Bearer interceptor)  │
│                   └─────┬──────┘                                │
└─────────────────────────┼───────────────────────────────────────┘
                          │ HTTP (JWT Bearer tokens)
┌─────────────────────────┼───────────────────────────────────────┐
│                    BACKEND (FastAPI)                             │
│                         │                                       │
│              ┌──────────▼──────────┐                            │
│              │  auth.py (router)   │                            │
│              │  POST /auth/login   │                            │
│              │  POST /auth/refresh │                            │
│              │  GET  /auth/me      │                            │
│              └──────────┬──────────┘                            │
│                         │                                       │
│         ┌───────────────┼────────────────┐                      │
│         ▼               ▼                ▼                      │
│  ┌──────────────┐ ┌──────────────┐ ┌───────────────┐           │
│  │ ldap_auth.py │ │ jwt_utils.py │ │ ad_config_    │           │
│  │ (LDAP bind)  │ │ (JWT create/ │ │ service.py    │           │
│  │              │ │  decode/deps)│ │ (config CRUD) │           │
│  └──────┬───────┘ └──────────────┘ └───────┬───────┘           │
│         │                                   │                   │
│         ▼                                   ▼                   │
│  ┌──────────────┐                   ┌───────────────┐           │
│  │ Active       │                   │  PostgreSQL   │           │
│  │ Directory    │                   │  (config,     │           │
│  │ (LDAP/LDAPS) │                   │   users,      │           │
│  └──────────────┘                   │   mappings)   │           │
│                                     └───────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

**Key Design Decisions:**
- **Dual auth**: Local admin fallback + AD/LDAP for enterprise users
- **Runtime-configurable**: LDAP settings stored in DB, changeable via admin UI without restart
- **JWT-based sessions**: Stateless auth with access + refresh tokens
- **Group-to-role mapping**: AD groups map to application roles via configurable DB mappings
- **Service account**: Optional service account for group querying and user import
- **Encrypted credentials**: Service account passwords encrypted with Fernet (AES-128-CBC)

---

## 2. File Inventory

### Backend Files (Python/FastAPI)

| File | Purpose |
|------|---------|
| `backend/auth/__init__.py` | Auth package exports (re-exports JWT utilities) |
| `backend/auth/ldap_auth.py` | **Core LDAP module** — connection, bind, user search, group extraction, authentication |
| `backend/auth/jwt_utils.py` | **JWT utilities** — token creation, decoding, FastAPI dependencies for auth/roles |
| `backend/routers/auth.py` | **Auth API router** — `/auth/login`, `/auth/refresh`, `/auth/me`, `/auth/logout` endpoints |
| `backend/routers/ad_config.py` | **AD Config API router** — CRUD for LDAP config, service accounts, role mappings, group queries |
| `backend/models/ad_config.py` | **SQLAlchemy models** — `ADConfiguration`, `ADRoleMapping`, `ADGroupCache`, `ADUserSync` |
| `backend/models/user.py` | **User model** — `User` table with `role`, `is_ad_user`, `ad_groups`, `ad_distinguished_name` |
| `backend/services/ad_config_service.py` | **AD Config service** — business logic for config management, credential encryption, role mapping, user import |
| `backend/services/audit_service.py` | **Audit service** — logs auth events (login, logout, config changes) |
| `backend/config.py` | **App configuration** — Pydantic Settings with LDAP env var defaults |
| `backend/database.py` | **Database setup** — async SQLAlchemy engine and session factory |
| `backend/requirements.txt` | **Python dependencies** — includes `ldap3`, `python-jose`, `passlib`, `cryptography` |

### Frontend Files (TypeScript/Next.js/React)

| File | Purpose |
|------|---------|
| `frontend/components/auth/LoginModal.tsx` | **Login UI** — modal form for username/password with branding support |
| `frontend/components/auth/AuthGuard.tsx` | **Route protection** — redirects unauthenticated users, enforces role hierarchy |
| `frontend/components/auth/index.ts` | Barrel exports for auth components |
| `frontend/store/authStore.ts` | **Auth state** — Zustand store with login/logout/checkAuth, persisted to localStorage |
| `frontend/lib/api.ts` | **API client** — Axios instance with Bearer token interceptor, all auth + AD config API calls |
| `frontend/types/index.ts` | **TypeScript types** — `User`, `AuthToken`, `AuthState`, `UserRole`, `RolePermissions` |
| `frontend/hooks/useIdleTimeout.ts` | **Session timeout** — auto-logout on inactivity with configurable warning |

---

## 3. Backend Implementation

### 3.1 Database Schema

You need **4 tables** for the AD integration:

#### `users` Table
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255),
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'viewer' NOT NULL,
    is_ad_user BOOLEAN DEFAULT TRUE,
    ad_distinguished_name TEXT,
    ad_groups VARCHAR[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    is_locked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP
);
```

#### `ad_configurations` Table
```sql
CREATE TABLE ad_configurations (
    id SERIAL PRIMARY KEY,
    -- LDAP Connection Settings
    ldap_enabled BOOLEAN DEFAULT FALSE,
    ldap_server VARCHAR(500),          -- ldap://server:389 or ldaps://server:636
    ldap_port INTEGER DEFAULT 389,
    ldap_use_ssl BOOLEAN DEFAULT FALSE,
    ldap_base_dn VARCHAR(500),         -- DC=company,DC=local
    ldap_domain VARCHAR(200),          -- NetBIOS domain name (COMPANY)
    ldap_auth_method VARCHAR(20) DEFAULT 'SIMPLE',  -- SIMPLE or NTLM
    ldap_skip_tls_verify BOOLEAN DEFAULT FALSE,
    -- Service Account (encrypted)
    service_account_username VARCHAR(200),
    service_account_password_encrypted TEXT,  -- Fernet AES encrypted
    service_account_last_validated TIMESTAMP,
    service_account_valid BOOLEAN DEFAULT FALSE,
    -- Local Admin
    local_admin_enabled BOOLEAN DEFAULT TRUE,
    local_admin_username VARCHAR(100) DEFAULT 'admin',
    local_admin_password_hash TEXT,     -- bcrypt hash
    -- Login Requirements
    require_group_membership BOOLEAN DEFAULT FALSE,
    required_groups VARCHAR[] DEFAULT '{}',
    -- Metadata
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by VARCHAR(100)
);
```

#### `ad_role_mappings` Table
```sql
CREATE TABLE ad_role_mappings (
    id SERIAL PRIMARY KEY,
    ad_config_id INTEGER REFERENCES ad_configurations(id) ON DELETE CASCADE,
    ad_group_name VARCHAR(200) NOT NULL,     -- CN of the AD group
    ad_group_dn VARCHAR(500),                -- Full DN (optional)
    application_role VARCHAR(50) NOT NULL,    -- admin, reviewer, auditor, viewer, etc.
    priority INTEGER DEFAULT 100,             -- Lower = higher priority
    created_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(100)
);
```

#### `ad_group_cache` Table (optional, for admin UI autocomplete)
```sql
CREATE TABLE ad_group_cache (
    id SERIAL PRIMARY KEY,
    group_cn VARCHAR(200) NOT NULL,
    group_dn VARCHAR(500) NOT NULL,
    group_description TEXT,
    member_count INTEGER,
    last_synced TIMESTAMP DEFAULT NOW()
);
```

#### `ad_user_syncs` Table (optional, for tracking group sync)
```sql
CREATE TABLE ad_user_syncs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    ad_username VARCHAR(200) NOT NULL,
    ad_distinguished_name VARCHAR(500),
    ad_groups VARCHAR[] DEFAULT '{}',
    last_synced TIMESTAMP DEFAULT NOW(),
    sync_status VARCHAR(50) DEFAULT 'pending',
    sync_error TEXT
);
```

**Reference files:**
- `backend/models/ad_config.py` — SQLAlchemy ORM models
- `backend/models/user.py` — User model with AD fields

---

### 3.2 Configuration

**Environment variables** for LDAP (with sensible defaults for disabled state):

```bash
# Security
SECRET_KEY=<generate-a-64-char-random-string>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7

# Local Admin (for initial setup before AD is configured)
LOCAL_ADMIN_ENABLED=true
LOCAL_ADMIN_USERNAME=admin
LOCAL_ADMIN_PASSWORD=<strong-password>

# LDAP/Active Directory (defaults to disabled)
LDAP_ENABLED=false
LDAP_SERVER=                    # e.g., ldap://dc01.company.local:389
LDAP_BASE_DN=                   # e.g., DC=company,DC=local
LDAP_DOMAIN=                    # e.g., COMPANY (NetBIOS name)
LDAP_REQUIRED_GROUP=            # Leave empty to allow any authenticated user
LDAP_ADMIN_GROUPS=RFP-Admin,RFP-Admins
LDAP_GROUP_FILTER=RFP
LDAP_AUTH_METHOD=SIMPLE         # SIMPLE (UPN) or NTLM (DOMAIN\user)
LDAP_SKIP_TLS_VERIFY=false
```

**Key design:** Environment variables serve as bootstrap defaults. Once the admin configures LDAP via the UI, settings are stored in the `ad_configurations` database table and override env vars at runtime.

**Reference file:** `backend/config.py`

---

### 3.3 LDAP Authentication Module

**File:** `backend/auth/ldap_auth.py`

This is the core LDAP integration. Key components:

#### Data Classes & Exceptions
```python
@dataclass
class ADUser:
    username: str           # sAMAccountName
    display_name: str       # AD displayName
    email: Optional[str]    # AD mail attribute
    distinguished_name: str # Full DN
    groups: List[str]       # Group common names (CNs)
    raw_groups: List[str]   # Full group DNs

class LDAPAuthError(Exception): ...
class LDAPConnectionError(LDAPAuthError): ...
class LDAPInvalidCredentials(LDAPAuthError): ...
class LDAPUserNotInGroup(LDAPAuthError): ...
```

#### Runtime Settings Resolution
Settings are resolved in priority order:
1. `ADConfiguration` object (from database, passed explicitly)
2. `SettingsService` (legacy database settings)
3. Environment variable defaults

#### Connection & Authentication Flow
```
get_ldap_connection(username, password)
    ├── Parse username (strip DOMAIN\ prefix)
    ├── Configure TLS if LDAPS
    ├── Create ldap3 Server object
    ├── Bind with credentials:
    │   ├── NTLM: DOMAIN\username
    │   └── SIMPLE: username@domain.com (UPN)
    └── Return (Connection, bind_user)

search_user(conn, username)
    ├── Search by sAMAccountName
    ├── Return: cn, displayName, mail, distinguishedName, memberOf
    └── Return None if not found

authenticate_ad_user(username, password)
    ├── get_ldap_connection()  → validates credentials
    ├── search_user()          → gets attributes + groups
    ├── extract_group_names()  → CN from group DNs
    ├── check_group_membership() → optional required group
    └── Return ADUser object
```

#### Key Implementation Details
- **Username normalization**: Strips `DOMAIN\` prefix, converts to UPN for simple bind
- **UPN derivation**: Converts `DC=COMPANY,DC=LOCAL` → `COMPANY.LOCAL` for `user@COMPANY.LOCAL`
- **Group extraction**: Parses `CN=GroupName,OU=Groups,DC=...` → `GroupName`
- **TLS handling**: Supports LDAPS with optional certificate verification skip
- **Connection cleanup**: Always unbinds in `finally` block

---

### 3.4 JWT Token Management

**File:** `backend/auth/jwt_utils.py`

#### Token Structure

**Access Token Payload:**
```json
{
    "sub": "jsmith",
    "user_id": 42,
    "display_name": "John Smith",
    "email": "jsmith@company.com",
    "groups": ["RFP-Admins", "IT-Staff"],
    "role": "admin",
    "all_roles": ["admin", "sales"],
    "exp": 1708123456,
    "iat": 1708119856,
    "type": "access"
}
```

**Refresh Token Payload:**
```json
{
    "sub": "jsmith",
    "user_id": 42,
    "exp": 1708724656,
    "iat": 1708119856,
    "type": "refresh"
}
```

#### CurrentUser Model
The `CurrentUser` Pydantic model extracted from JWT provides permission-checking methods:

```python
class CurrentUser(BaseModel):
    user_id: Optional[int]
    username: str
    display_name: str
    email: Optional[str]
    groups: List[str]       # AD group names
    role: str               # Primary role (highest privilege)
    all_roles: List[str]    # ALL matched roles (additive permissions)

    def is_admin(self) -> bool: ...
    def has_group(self, group_name: str) -> bool: ...
    def has_role(self, role_name: str) -> bool: ...
    def has_any_role(self, role_names: List[str]) -> bool: ...
    # ... more permission helpers
```

#### FastAPI Dependencies (route guards)
```python
# Extract user from JWT — use on any authenticated endpoint
get_current_user = Depends(oauth2_scheme) → CurrentUser

# Role-specific guards — raise 403 if unauthorized
require_admin = Depends(get_current_user) → check is_admin()
require_roles(["admin", "reviewer"]) → factory for role lists
require_groups(["RFP-Admins"]) → factory for group membership
```

**Usage in routes:**
```python
@router.get("/admin-only")
async def admin_endpoint(user: CurrentUser = Depends(require_admin)):
    return {"message": f"Hello admin {user.username}"}

@router.get("/group-protected", dependencies=[Depends(require_groups(["RFP-Reviewers"]))])
async def group_endpoint():
    return {"message": "You're in the right group"}
```

---

### 3.5 Auth Router

**File:** `backend/routers/auth.py`

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/auth/login` | POST | No | Primary login (OAuth2 form: username + password) |
| `/auth/refresh` | POST | No | Refresh access token using refresh token |
| `/auth/me` | GET | Yes | Get current user info from JWT |
| `/auth/ldap/status` | GET | Admin | Test LDAP connectivity |
| `/auth/logout` | POST | Yes | Logout (client discards tokens, audit logged) |

#### Login Flow (POST `/auth/login`)
```
1. Try local admin credentials (if enabled)
   ├── Match username + password against config/DB
   ├── Create/find User record in DB
   └── Return JWT tokens with role="admin"

2. If local admin fails, check LDAP enabled
   ├── Read ADConfiguration from database
   └── Fall back to env var LDAP_ENABLED

3. Authenticate against Active Directory
   ├── authenticate_ad_user(username, password)
   ├── Bind with user credentials → validates password
   ├── Search user attributes + group memberships
   └── Returns ADUser object

4. Sync user to database
   ├── Find or create User record
   ├── Map AD groups → application role
   ├── Update user's email, display_name, groups, last_login
   └── Commit to database

5. Generate JWT tokens
   ├── Access token (60 min default) with groups + role + all_roles
   └── Refresh token (7 days default)

6. Audit log the login event

7. Return TokenResponse
   {
     "access_token": "eyJ...",
     "refresh_token": "eyJ...",
     "token_type": "bearer",
     "expires_in": 3600,
     "is_local_admin": false
   }
```

#### Error Responses
| Status | Error | Cause |
|--------|-------|-------|
| 401 | Invalid credentials | Wrong username/password (local or LDAP) |
| 403 | Access denied | User not in required AD group |
| 503 | Service unavailable | LDAP server unreachable |

---

### 3.6 AD Configuration Admin Router

**File:** `backend/routers/ad_config.py`

All endpoints require **admin** role.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/config/ad` | GET | Get current AD/LDAP configuration |
| `/config/ad` | PUT | Update AD/LDAP configuration |
| `/config/ad/service-account` | POST | Set & validate service account |
| `/config/ad/service-account/test` | POST | Test credentials without saving |
| `/config/ad/service-account` | DELETE | Clear service account |
| `/config/ad/local-admin` | PUT | Enable/disable local admin, change password |
| `/config/ad/local-admin/status` | GET | Check if local admin is enabled |
| `/config/ad/role-mappings` | GET | List all group→role mappings |
| `/config/ad/role-mappings` | POST | Create new mapping |
| `/config/ad/role-mappings/{id}` | PUT | Update mapping |
| `/config/ad/role-mappings/{id}` | DELETE | Delete mapping |
| `/config/ad/groups` | GET | Query AD groups (via service account) |
| `/config/ad/groups/sync` | POST | Sync groups to local cache |
| `/config/ad/users/sync` | POST | Sync all AD users' group memberships |
| `/config/ad/users/import` | POST | Import users from mapped AD groups |
| `/config/ad/users/{id}/sync` | POST | Sync specific user's groups |

---

### 3.7 AD Config Service

**File:** `backend/services/ad_config_service.py`

Business logic layer with these capabilities:

1. **Configuration CRUD** — read/write `ad_configurations` table
2. **Credential Encryption** — Fernet (AES) encryption for service account password storage
3. **Service Account Management** — set, test, validate, clear
4. **Local Admin Management** — enable/disable, password change (bcrypt hashed)
5. **Role Mapping** — CRUD for group→role mappings with priority ordering
6. **Role Resolution** — `get_role_for_groups(groups)` returns highest-privilege role; `get_all_roles_for_groups(groups)` returns all matched roles for additive permissions
7. **AD Group Querying** — Uses service account to query AD groups (for admin UI autocomplete)
8. **User Sync** — Sync individual or all users' group memberships from AD
9. **User Import** — Query AD groups with mappings, create/update User records

#### Role Hierarchy (lowest → highest)
```
viewer → auditor → reviewer → professional_services → approver → sales → admin
```

The **primary role** is the highest-privilege matched role (for general access control).
**All roles** are returned for additive permissions (e.g., a user in both admin and sales groups gets permissions from both).

---

### 3.8 Audit Logging

**File:** `backend/services/audit_service.py`

All auth events are logged with severity levels:

| Event | Severity | Details Logged |
|-------|----------|---------------|
| `LOGIN_SUCCESS` | INFO | username, role, auth_method, groups, IP |
| `LOGIN_FAILURE` | WARNING | username, reason, auth_method, IP |
| `LOGOUT` | INFO | username, role |
| `AD_CONFIG_UPDATE` | CRITICAL | changes made, admin username |
| `ROLE_MAPPING_CREATE/DELETE` | WARNING | group, role, admin username |

---

## 4. Frontend Implementation

### 4.1 TypeScript Types

**File:** `frontend/types/index.ts`

```typescript
type UserRole = 'admin' | 'professional_services' | 'sales' | 'approver' |
                'reviewer' | 'auditor' | 'viewer';

interface User {
    id: number;
    username: string;
    email: string;
    full_name: string;
    role: UserRole;
    all_roles?: UserRole[];    // Additive permissions
    is_active: boolean;
    auth_source: 'ldap' | 'local';
    created_at: string;
    last_login?: string;
}

interface AuthToken {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token?: string;
}

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}
```

The `RolePermissions` helper object provides permission-checking utilities:
```typescript
RolePermissions.hasRole(user, 'admin')        // checks all_roles
RolePermissions.hasAnyRole(user, ['admin', 'sales'])
RolePermissions.canEditConfig(role, allRoles)  // admin, professional_services
RolePermissions.isAdmin(role)                  // strict admin check
```

---

### 4.2 API Client Layer

**File:** `frontend/lib/api.ts`

Key patterns to replicate:

#### Axios Instance with Auth Interceptor
```typescript
// Request interceptor — attach Bearer token
client.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// Response interceptor — handle 401 (token expired)
client.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Don't trigger logout for login/logout endpoints
            if (!url.includes('/auth/login') && !url.includes('/auth/logout')) {
                localStorage.removeItem('access_token');
                window.dispatchEvent(new CustomEvent('auth:logout'));
            }
        }
        return Promise.reject(error);
    }
);
```

#### Auth API Functions
```typescript
authApi.login(username, password)    // POST form-urlencoded → stores tokens
authApi.logout()                     // POST → clears tokens
authApi.getCurrentUser()             // GET /auth/me → User
authApi.refreshToken()               // POST /auth/refresh
```

#### AD Config API Functions
```typescript
adConfigApi.getConfig()
adConfigApi.updateConfig(config)
adConfigApi.setServiceAccount(username, password)
adConfigApi.testServiceAccount(username, password)
adConfigApi.clearServiceAccount()
adConfigApi.updateLocalAdmin({ enabled, new_password })
adConfigApi.getRoleMappings()
adConfigApi.addRoleMapping({ ad_group_name, application_role, priority })
adConfigApi.deleteRoleMapping(mappingId)
adConfigApi.queryGroups(search, useCache)
adConfigApi.syncUsers()
adConfigApi.importUsers()
```

---

### 4.3 Auth State Store

**File:** `frontend/store/authStore.ts`

Uses **Zustand** with `persist` middleware (saves to localStorage):

```typescript
interface AuthStore {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login(username: string, password: string): Promise<void>;
    logout(): Promise<void>;
    checkAuth(): Promise<void>;
}
```

**Key behaviors:**
- `login()`: Calls `authApi.login()`, then `authApi.getCurrentUser()`, stores both
- `logout()`: Clears state first (prevents loops), then calls API logout
- `checkAuth()`: On app load, checks for stored token, validates by calling `/auth/me`
- Listens for `auth:logout` custom event from API interceptor (handles 401s globally)
- Persisted fields: `user`, `token`, `isAuthenticated`

---

### 4.4 Login Modal Component

**File:** `frontend/components/auth/LoginModal.tsx`

A modal dialog with:
- Username + password inputs
- Show/hide password toggle
- Loading state with spinner
- Error message display
- Customizable branding logo
- Backdrop click to close (with mousedown tracking to prevent autocomplete interference)

**Adaptable elements:**
- Replace CSS classes (`modal-overlay`, `modal-content`, `input-field`, `btn-primary`) with your design system
- The branding manifest check (`/branding/manifest.json`) is optional — replace with your logo logic
- Form submits username/password to the `login()` function from the auth store

---

### 4.5 Auth Guard / Protected Routes

**File:** `frontend/components/auth/AuthGuard.tsx`

Wraps protected pages:
```tsx
<AuthGuard requiredRole="admin">
    <AdminDashboard />
</AuthGuard>
```

**Behavior:**
1. Calls `checkAuth()` on mount
2. Shows loading spinner while checking
3. Redirects to `/?returnUrl=...` if not authenticated
4. Checks role hierarchy if `requiredRole` is specified
5. Redirects to `/dashboard` if insufficient role

---

### 4.6 Idle Timeout Hook

**File:** `frontend/hooks/useIdleTimeout.ts`

Auto-logout on inactivity:
- Configurable timeout (default 30 min) and warning period (default 5 min)
- Loads settings from backend (`/admin/settings`)
- Shows countdown warning before logout
- Resets on user activity (mousemove, keydown, click, scroll, touchstart)

---

## 5. Authentication Flow

### Initial Setup (No AD configured)
```
1. Deploy application
2. Login with local admin credentials (from env vars)
3. Navigate to Settings → AD Configuration
4. Enter LDAP server details (server, base DN, domain, auth method)
5. Set service account credentials
6. Create role mappings (AD Group → Application Role)
7. Enable LDAP authentication
8. Test with AD user credentials
9. Optionally disable local admin
```

### Normal Login Flow
```
User enters credentials
    │
    ├── Try local admin match
    │   ├── Yes → Create JWT → Return tokens
    │   └── No → Continue
    │
    ├── Check LDAP enabled (DB config → env var fallback)
    │   └── No → Return 401
    │
    ├── LDAP Bind (validates credentials)
    │   ├── Connection error → 503
    │   └── Invalid credentials → 401
    │
    ├── Search user in AD (sAMAccountName)
    │   └── Get: displayName, mail, memberOf, distinguishedName
    │
    ├── Extract group CNs from memberOf
    │
    ├── Check required group membership (if configured)
    │   └── Not in group → 403
    │
    ├── Map groups → roles (via ad_role_mappings table)
    │   ├── Primary role = highest privilege match
    │   └── All roles = every match (additive permissions)
    │
    ├── Create/update User record in database
    │
    ├── Generate JWT tokens
    │   ├── Access token (groups, role, all_roles in payload)
    │   └── Refresh token (minimal payload)
    │
    ├── Audit log: LOGIN_SUCCESS
    │
    └── Return { access_token, refresh_token, token_type, expires_in }
```

### Token Refresh Flow
```
Client sends expired/expiring access token
    │
    ├── POST /auth/refresh with refresh_token
    │
    ├── Decode refresh token
    │   └── Invalid → 401
    │
    ├── Look up user in database
    │   └── Not found or inactive → 401
    │
    ├── Re-resolve roles from stored AD groups
    │
    ├── Generate new access + refresh tokens
    │
    └── Return new TokenResponse
```

---

## 6. Role-Based Access Control (RBAC)

### Defined Roles

| Role | Level | Description |
|------|-------|-------------|
| `viewer` | 1 | Read-only access |
| `auditor` | 2 | View-only audit access |
| `reviewer` | 3 | Create/edit, review |
| `professional_services` | 4 | Edit configurations and existing items |
| `approver` | 5 | Approve/deny with feedback |
| `sales` | 6 | Full access to specific business features |
| `admin` | 7 | Full system access |

### Additive Permissions
A user can have **multiple roles** simultaneously. The system supports:
- **Primary role**: Highest-privilege role (used for general access hierarchy)
- **All roles**: Complete list of matched roles (used for feature-specific permissions)

Example: A user in both `CE-Admins` and `CE-Sales` AD groups gets `role="admin"` (primary) and `all_roles=["admin", "sales"]`.

### Permission Checks (Backend)
```python
# FastAPI dependency injection
@router.get("/endpoint")
async def handler(user: CurrentUser = Depends(require_admin)):
    ...

# Or inline check
if not current_user.can_edit_quotes():
    raise HTTPException(403, "Access denied")
```

### Permission Checks (Frontend)
```typescript
// In components
if (RolePermissions.canEditConfig(user.role, user.all_roles)) {
    // Show edit button
}

// Route guard
<AuthGuard requiredRole="admin">
    <AdminPage />
</AuthGuard>
```

---

## 7. AD Group → Role Mapping

Mappings are stored in `ad_role_mappings` and managed via the admin API.

### Example Mappings
| AD Group | Application Role | Priority |
|----------|-----------------|----------|
| `CE-Admins` | admin | 10 |
| `CE-Professional-Services` | professional_services | 20 |
| `CE-Sales` | sales | 30 |
| `CE-Approvers` | approver | 40 |
| `CE-Reviewers` | reviewer | 50 |
| `CE-Auditors` | auditor | 60 |

### Resolution Logic
1. Get user's AD group memberships
2. Match against all role mappings
3. **Primary role** = highest privilege match (by role hierarchy, not priority)
4. **All roles** = union of all matched roles
5. If no matches → default to `viewer`

### Fallback (No Mappings Configured)
When no custom mappings exist, a default algorithm is used:
- Groups containing "admin" → `admin`
- Groups containing "sales" → `sales`
- Groups containing "approver" → `approver`
- etc.

---

## 8. Service Account Management

A **service account** is an AD account used by the application (not a user) for:
- Querying AD groups (admin UI autocomplete)
- Importing users from AD groups
- Syncing user group memberships

### Storage
- Username stored in plaintext in `ad_configurations.service_account_username`
- Password encrypted with **Fernet** (AES-128-CBC) using a key derived from `SECRET_KEY`
- Encryption key: `SHA-256(SECRET_KEY)` → base64 → Fernet key

### Workflow
1. Admin enters service account credentials in UI
2. Backend tests credentials against AD (tries to bind)
3. If successful, encrypts password and stores in database
4. Auto-populates LDAP settings from server info if not already set

---

## 9. API Endpoints Reference

### Authentication Endpoints (No prefix needed)

```
POST   /api/v1/auth/login          # OAuth2 form login
POST   /api/v1/auth/refresh        # Refresh access token
GET    /api/v1/auth/me             # Get current user (requires auth)
POST   /api/v1/auth/logout         # Logout (requires auth)
GET    /api/v1/auth/ldap/status    # LDAP health check (admin only)
```

### AD Configuration Endpoints (Admin only)

```
GET    /api/v1/config/ad                          # Get AD config
PUT    /api/v1/config/ad                          # Update AD config
POST   /api/v1/config/ad/service-account          # Set service account
POST   /api/v1/config/ad/service-account/test     # Test service account
DELETE /api/v1/config/ad/service-account          # Clear service account
PUT    /api/v1/config/ad/local-admin              # Update local admin
GET    /api/v1/config/ad/local-admin/status       # Local admin status
GET    /api/v1/config/ad/role-mappings            # List role mappings
POST   /api/v1/config/ad/role-mappings            # Create role mapping
PUT    /api/v1/config/ad/role-mappings/{id}       # Update role mapping
DELETE /api/v1/config/ad/role-mappings/{id}       # Delete role mapping
GET    /api/v1/config/ad/groups?search=X          # Query AD groups
POST   /api/v1/config/ad/groups/sync              # Sync group cache
POST   /api/v1/config/ad/users/sync               # Sync all users
POST   /api/v1/config/ad/users/import             # Import from AD groups
POST   /api/v1/config/ad/users/{id}/sync          # Sync specific user
```

---

## 10. Dependencies & Requirements

### Python (Backend)
```
ldap3>=2.9.1                      # LDAP client library
python-jose[cryptography]>=3.3.0  # JWT encoding/decoding
passlib[bcrypt]>=1.7.4            # Password hashing (local admin)
cryptography                      # Fernet encryption (service account)
pydantic>=2.5.0                   # Data validation
pydantic-settings>=2.1.0         # Environment variable loading
fastapi>=0.109.0                  # Web framework
sqlalchemy[asyncio]>=2.0.0        # ORM (async)
asyncpg>=0.29.0                   # PostgreSQL async driver
```

### TypeScript/JavaScript (Frontend)
```json
{
    "axios": "^1.6.0",            // HTTP client
    "zustand": "^4.5.0",          // State management
    "next": "^14.0.0",            // React framework (or use any SPA framework)
    "lucide-react": "^0.300.0"    // Icons (optional)
}
```

### Infrastructure
- **PostgreSQL 14+** (with `ARRAY` type support)
- **Active Directory** (Windows Server 2012 R2+) or **OpenLDAP 2.4+**
- Network access: LDAP port 389 or LDAPS port 636

---

## 11. Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SECRET_KEY` | Yes | (insecure default) | JWT signing + credential encryption key |
| `ALGORITHM` | No | `HS256` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | `60` | Access token TTL |
| `REFRESH_TOKEN_EXPIRE_DAYS` | No | `7` | Refresh token TTL |
| `DATABASE_URL` | Yes | localhost | PostgreSQL connection string |
| `LOCAL_ADMIN_ENABLED` | No | `true` | Enable local admin fallback |
| `LOCAL_ADMIN_USERNAME` | No | `admin` | Local admin username |
| `LOCAL_ADMIN_PASSWORD` | Yes | (insecure default) | Local admin password |
| `LDAP_ENABLED` | No | `false` | Enable LDAP authentication |
| `LDAP_SERVER` | No | (empty) | LDAP server URL |
| `LDAP_BASE_DN` | No | (empty) | LDAP search base |
| `LDAP_DOMAIN` | No | (empty) | NetBIOS domain name |
| `LDAP_AUTH_METHOD` | No | `SIMPLE` | `SIMPLE` or `NTLM` |
| `LDAP_ADMIN_GROUPS` | No | `RFP-Admin,RFP-Admins` | Comma-separated admin groups |
| `LDAP_SKIP_TLS_VERIFY` | No | `false` | Skip TLS cert verification |
| `CORS_ORIGINS` | No | `localhost:3000,...` | Allowed CORS origins |

---

## 12. Database Migrations

When integrating, create migrations for these tables in order:

1. **`users`** table with AD fields (`is_ad_user`, `ad_groups`, `ad_distinguished_name`, `role`)
2. **`ad_configurations`** table (LDAP settings, service account, local admin)
3. **`ad_role_mappings`** table (group → role mappings)
4. **`ad_group_cache`** table (optional, for admin UI)
5. **`ad_user_syncs`** table (optional, for sync tracking)

Ensure your User model's `role` field supports all role values as strings (not enums in the DB — this project migrated from PostgreSQL enums to VARCHAR for flexibility).

---

## 13. Security Considerations

1. **Passwords never stored** — AD passwords are only used for LDAP bind, never persisted
2. **Service account encrypted** — Fernet (AES) encryption at rest, key derived from `SECRET_KEY`
3. **Local admin hashed** — bcrypt with salt for stored admin password
4. **JWT expiration** — Short-lived access tokens (60 min), longer refresh tokens (7 days)
5. **TLS support** — LDAPS on port 636 with certificate validation
6. **Constant-time comparison** — passlib handles timing-safe password verification
7. **Audit trail** — All auth events logged with IP, timestamp, severity
8. **401 handling** — Frontend clears tokens on 401 (except login/logout endpoints)
9. **CORS** — Restrict origins to known frontend URLs
10. **Rate limiting** — Consider adding rate limiting on `/auth/login` (not included, add per your framework)

---

## 14. Step-by-Step Integration Checklist

### Phase 1: Database & Models
- [ ] Create `users` table with AD fields
- [ ] Create `ad_configurations` table
- [ ] Create `ad_role_mappings` table
- [ ] Create `ad_group_cache` table (optional)
- [ ] Create `ad_user_syncs` table (optional)
- [ ] Define User model with role enum/string

### Phase 2: Backend Auth Core
- [ ] Install `ldap3`, `python-jose`, `passlib`, `cryptography`
- [ ] Implement `ldap_auth.py` (LDAP connection, search, authentication)
- [ ] Implement `jwt_utils.py` (token create/decode, `CurrentUser`, dependencies)
- [ ] Implement `config.py` with LDAP environment variables

### Phase 3: Backend API Routes
- [ ] Implement `/auth/login` endpoint (local admin + LDAP)
- [ ] Implement `/auth/refresh` endpoint
- [ ] Implement `/auth/me` endpoint
- [ ] Implement `/auth/logout` endpoint
- [ ] Register auth router in main app

### Phase 4: AD Config Management
- [ ] Implement `ad_config_service.py` (config CRUD, encryption, role mapping)
- [ ] Implement `/config/ad` endpoints
- [ ] Implement role mapping endpoints
- [ ] Implement service account endpoints
- [ ] Implement group query endpoints (optional)
- [ ] Implement user sync/import endpoints (optional)

### Phase 5: Frontend Auth
- [ ] Define TypeScript types (`User`, `AuthToken`, `AuthState`, `UserRole`)
- [ ] Implement API client with Bearer token interceptor
- [ ] Implement auth API functions (login, logout, getCurrentUser, refresh)
- [ ] Implement auth state store (login, logout, checkAuth, persist)
- [ ] Implement login UI component
- [ ] Implement route guard / auth wrapper

### Phase 6: Frontend Admin UI
- [ ] AD configuration settings page
- [ ] Service account management UI
- [ ] Role mapping management UI
- [ ] Group browser/search UI (optional)
- [ ] User import UI (optional)

### Phase 7: Polish
- [ ] Add audit logging for all auth events
- [ ] Add idle timeout with warning
- [ ] Add token refresh logic (before expiration)
- [ ] Test with actual AD server
- [ ] Security review (CORS, rate limiting, input sanitization)
- [ ] Update deployment docs with LDAP env vars

---

## 15. Troubleshooting

### LDAP Connection Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Cannot connect to LDAP server` | Wrong URL/port or firewall | Verify `LDAP_SERVER`, check port 389/636, test with `telnet` |
| `LDAP bind failed` | Wrong credentials or auth method | Try both SIMPLE and NTLM; ensure correct username format |
| `certificate verify failed` | Self-signed cert with LDAPS | Set `LDAP_SKIP_TLS_VERIFY=true` for testing only |
| `User not found in directory` | Wrong base DN or username format | Check `LDAP_BASE_DN` matches your AD structure |

### Group/Role Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| User gets wrong role | Incorrect mapping or group name | Check `ad_role_mappings` table; group names are case-insensitive |
| User gets `viewer` role | No matching mapping | Add role mapping for user's AD groups |
| Role not updating | Cached token | User must re-login to get updated role |

### Token Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| 401 on all requests | Expired token | Implement refresh token flow |
| Frontend logout loop | 401 on login endpoint triggering logout | Exclude login/logout URLs from 401 interceptor |

---

## File Reference Location

All source files referenced in this guide are available at:
```
For Reference/AD_Auth/
├── AD-AUTH-INTEGRATION-GUIDE.md   (this file)
├── backend/
│   ├── auth/
│   │   ├── __init__.py
│   │   ├── ldap_auth.py
│   │   └── jwt_utils.py
│   ├── routers/
│   │   ├── auth.py
│   │   └── ad_config.py
│   ├── models/
│   │   ├── ad_config.py
│   │   └── user.py
│   ├── services/
│   │   ├── ad_config_service.py
│   │   └── audit_service.py
│   ├── config.py
│   ├── database.py
│   └── requirements.txt
└── frontend/
    ├── components/auth/
    │   ├── LoginModal.tsx
    │   ├── AuthGuard.tsx
    │   └── index.ts
    ├── store/
    │   └── authStore.ts
    ├── lib/
    │   └── api.ts
    ├── types/
    │   └── index.ts
    └── hooks/
        └── useIdleTimeout.ts
```
