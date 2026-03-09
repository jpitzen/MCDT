# Phase 4 — AD/LDAP Frontend Integration

**Feature**: Frontend AD login, auth context updates, route guards, and AD admin configuration UI  
**Priority**: High | **Complexity**: Medium-High | **Estimated Effort**: 5–7 days  
**Dependencies**: Phase 3 completed (all backend API endpoints available)  
**Reference**: `docs/For Reference/AD_Auth/AD-AUTH-INTEGRATION-GUIDE.md` §§ Frontend, `docs/For Reference/AD_Auth/frontend/`

---

## Rationale — Why Phase 4

With the backend fully functional (Phases 2–3), this phase wires the frontend to support AD login alongside local login, updates the auth context for multi-provider sessions, adds role-based route protection, and builds the admin UI for managing AD configurations. This is the phase where the feature becomes user-visible.

---

## Current State Analysis

| Component | Current State | Gap |
|-----------|--------------|-----|
| **Login page** | Email + password only, `pages/Login.jsx` | No "Sign in with AD" option |
| **AuthContext** | Minimal — stores decoded JWT, no role utils | No `authProvider` awareness, no token refresh |
| **ProtectedRoute** | Inline in `index.jsx`, checks `localStorage('authToken')` only | No role-based protection, no expiry check |
| **API client** | `services/api.js` — no AD namespace | Need `api.adConfig.*` methods |
| **SystemAdmin** | 3 tabs: Users, Cloud Providers, Cleanup | No AD Configuration tab |
| **Layout** | Shows all nav items to all users | No role-based menu filtering |

---

## Deliverables

### Step 4.1 — Update AuthContext

**File**: `frontend/src/context/AuthContext.jsx`

Expand from ~55 lines to a full-featured auth context:

**New state**:
```javascript
{
  user: {
    id, email, role, firstName, lastName,
    authProvider,      // NEW: 'local' | 'ad' | 'ldap'
    themePreferences   // From Phase 1
  },
  isAuthenticated: boolean,
  isLoading: boolean,   // NEW: true during initial token validation
  adEnabled: boolean    // NEW: from GET /api/auth/ldap-status
}
```

**New methods**:
| Method | Purpose |
|--------|---------|
| `loginLocal(email, password)` | Existing login, renamed for clarity |
| `loginAd(username, password)` | Calls `POST /api/auth/ad-login` |
| `logout()` | Clear tokens, reset state, navigate to `/login` |
| `refreshToken()` | Calls `POST /api/auth/refresh`, updates stored tokens |
| `checkAdStatus()` | Calls `GET /api/auth/ldap-status`, sets `adEnabled` |
| `hasRole(role)` | Check if user has a specific role |
| `hasAnyRole(roles[])` | Check if user has any of the specified roles |

**Token refresh logic**:
- Store refresh token in `localStorage('refreshToken')` (separate from access token)
- On mount: validate access token expiry. If expired but refresh token exists, call `refreshToken()`
- Set up interval to refresh access token 5 minutes before expiry
- On 401 response (interceptor): attempt one refresh before redirecting to login

**On mount sequence**:
```
1. Check localStorage for authToken
2. If exists: decode, check expiry
3. If expired: try refreshToken() from stored refreshToken
4. If valid: set user state, call checkAdStatus()
5. If no token: just call checkAdStatus() (for login page AD button)
6. Set isLoading = false
```

### Step 4.2 — Update API Client

**File**: `frontend/src/services/api.js`

Add AD-related namespaces:

```javascript
const adConfigApi = {
  list: ()                    => apiClient.get('/ad-config'),
  get: (id)                   => apiClient.get(`/ad-config/${id}`),
  create: (data)              => apiClient.post('/ad-config', data),
  update: (id, data)          => apiClient.put(`/ad-config/${id}`, data),
  delete: (id)                => apiClient.delete(`/ad-config/${id}`),
  activate: (id)              => apiClient.post(`/ad-config/${id}/activate`),
  deactivate: (id)            => apiClient.post(`/ad-config/${id}/deactivate`),
  testConnection: (id)        => apiClient.post(`/ad-config/${id}/test-connection`),
  testAdHocConnection: (data) => apiClient.post('/ad-config/test-connection', data),
  updateServiceAccount: (id, data) => apiClient.put(`/ad-config/${id}/service-account`, data),
  verifyServiceAccount: (id)  => apiClient.post(`/ad-config/${id}/verify-service-account`),
  searchGroups: (id, params)  => apiClient.get(`/ad-config/${id}/groups`, { params }),
  getGroupMembers: (id, dn)   => apiClient.get(`/ad-config/${id}/groups/${encodeURIComponent(dn)}/members`),
  syncUsers: (id)             => apiClient.post(`/ad-config/${id}/sync`),
  getSyncStatus: (id)         => apiClient.get(`/ad-config/${id}/sync/status`),
  // Role mappings
  listMappings: (configId)         => apiClient.get(`/ad-config/${configId}/role-mappings`),
  createMapping: (configId, data)  => apiClient.post(`/ad-config/${configId}/role-mappings`, data),
  updateMapping: (configId, id, data) => apiClient.put(`/ad-config/${configId}/role-mappings/${id}`, data),
  deleteMapping: (configId, id)    => apiClient.delete(`/ad-config/${configId}/role-mappings/${id}`),
  testRoleResolution: (configId, data) => apiClient.post(`/ad-config/${configId}/role-mappings/test`, data),
};

const authApi = {
  login: (data)      => apiClient.post('/auth/login', data),
  adLogin: (data)    => apiClient.post('/auth/ad-login', data),       // NEW
  refresh: (data)    => apiClient.post('/auth/refresh', data),         // NEW
  ldapStatus: ()     => apiClient.get('/auth/ldap-status'),            // NEW
  register: (data)   => apiClient.post('/auth/register', data),
  profile: ()        => apiClient.get('/auth/profile'),
  updateProfile: (d) => apiClient.put('/auth/profile', d),
  changePassword: (d)=> apiClient.put('/auth/change-password', d),
  logout: ()         => apiClient.post('/auth/logout'),
};
```

Update the `api` default export to include `adConfig: adConfigApi` and update `auth` namespace.

Also update the 401 response interceptor to attempt token refresh before clearing auth state:
```javascript
// On 401:
// 1. If refresh token exists and this isn't already a refresh request:
//    → Try POST /auth/refresh
//    → If success: retry original request with new token
//    → If fail: clear auth, redirect to /login
// 2. If no refresh token: clear auth, redirect to /login
```

### Step 4.3 — Update Login Page

**File**: `frontend/src/pages/Login.jsx`

Transform from a simple email/password form into a dual-auth login page:

**Layout changes**:
```
┌─────────────────────────────────┐
│         ZL-MCDT Login           │
│                                 │
│  [Tab: Local]  [Tab: AD/LDAP]   │  ← Only show AD tab if adEnabled
│                                 │
│  ┌─ Local Tab ────────────────┐ │
│  │ Email: [_______________]   │ │
│  │ Password: [____________]   │ │
│  │ [Login]                    │ │
│  │ Don't have an account?     │ │
│  │ Register                   │ │
│  └────────────────────────────┘ │
│                                 │
│  ┌─ AD Tab ───────────────────┐ │
│  │ Username: [____________]   │ │  ← sAMAccountName, not email
│  │ Password: [____________]   │ │
│  │ [Sign in with AD]          │ │
│  │                            │ │
│  │ Uses your corporate        │ │
│  │ Active Directory account   │ │
│  └────────────────────────────┘ │
└─────────────────────────────────┘
```

**Behavior**:
- On mount: call `checkAdStatus()` from AuthContext → sets `adEnabled`
- If `adEnabled === false`: don't show tabs, just show local login form (unchanged UX)
- If `adEnabled === true`: show MUI `Tabs` with "Local" and "AD/LDAP"
- Local tab: existing email+password flow → `loginLocal()`
- AD tab: username+password → `loginAd()`
- Both tabs show loading spinner during auth, error snackbar on failure
- On success: both paths redirect to `/dashboard`
- Account lockout messaging: "Too many failed attempts. Try again in X minutes."

**Registration link**: Only show "Register" on the Local tab (AD users don't self-register).

### Step 4.4 — Role-Based Route Protection

**File**: `frontend/src/index.jsx` (or extract to `components/ProtectedRoute.jsx`)

Replace the inline ProtectedRoute with a configurable component:

```jsx
// Usage:
<ProtectedRoute>                           // Any authenticated user
<ProtectedRoute roles={['admin']}>          // Admin only
<ProtectedRoute roles={['admin', 'operator']}>  // Admin or Operator
```

**Implementation**:
```
1. Check isLoading from AuthContext → show spinner if true
2. Check isAuthenticated → redirect to /login if false
3. Check token expiry → attempt refresh if expired
4. If roles prop provided: check user.role against allowed roles
5. If role not allowed: show 403 "Access Denied" page (NOT redirect to login)
6. Otherwise: render children
```

**New component**: `frontend/src/pages/AccessDenied.jsx` — simple "You don't have permission" page with a "Go Back" button.

### Step 4.5 — Role-Based Navigation

**File**: `frontend/src/components/Layout.jsx`

Add role-based filtering to the sidebar navigation:

```javascript
const navItems = [
  { label: 'Dashboard',     path: '/dashboard',     icon: DashboardIcon,  roles: ['admin', 'approver', 'operator', 'viewer'] },
  { label: 'Deployments',   path: '/deployments',   icon: CloudIcon,      roles: ['admin', 'approver', 'operator', 'viewer'] },
  { label: 'New Deployment', path: '/deploy',        icon: AddIcon,        roles: ['admin', 'operator'] },
  { label: 'Credentials',   path: '/credentials',   icon: KeyIcon,        roles: ['admin', 'operator'] },
  { label: 'System Admin',  path: '/settings',      icon: SettingsIcon,   roles: ['admin'] },
];

// Filter based on user.role from AuthContext
const visibleItems = navItems.filter(item => item.roles.includes(user?.role));
```

Also update the sidebar footer/user info section:
- Show `user.firstName user.lastName` instead of hardcoded "A"
- Show role badge (chip)
- Show auth provider indicator: small icon or text showing "Local" or "AD" next to the user name

### Step 4.6 — AD Configuration Admin Tab

**File**: `frontend/src/pages/SystemAdmin.jsx`

Add 5th tab: "AD / LDAP" (only visible if user is admin).

**New component**: `frontend/src/components/admin/AdConfigManager.jsx`

This is a complex component with multiple sub-sections:

#### Section 1 — Configuration List & Editor

```
┌─ AD/LDAP Configurations ─────────────────────────────────────┐
│ [+ New Configuration]                                         │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐  │
│ │ Corp AD Server          Active ●    [Edit] [Test] [Del] │  │
│ │ ldaps://ad.corp.com:636  Last tested: 2 min ago ✓      │  │
│ └─────────────────────────────────────────────────────────┘  │
│ ┌─────────────────────────────────────────────────────────┐  │
│ │ Dev AD Server           Inactive ○  [Edit] [Activate]   │  │
│ │ ldap://dev-ad.corp.com:389                              │  │
│ └─────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

#### Section 2 — Configuration Editor (Dialog/Drawer)

When creating/editing a configuration:

| Field Group | Fields |
|-------------|--------|
| **Connection** | Name, Server URL, Port, Use SSL toggle, Connection Timeout, Base DN |
| **Service Account** | Bind DN, Bind Password (masked), [Verify] button |
| **Search Settings** | User Search Filter, User Search Base, Group Search Filter, Group Search Base |
| **Attribute Mapping** | Email, Display Name, First Name, Last Name, Group, Unique ID attribute names |
| **Behavior** | Auto-create users toggle, Default role dropdown, Sync interval |
| **Actions** | [Test Connection], [Save], [Cancel] |

**Test Connection button**: Calls the test endpoint, shows success/failure with latency in a snackbar.

#### Section 3 — Role Mappings

```
┌─ Group → Role Mappings ──────────────────────────────────────┐
│ [+ Add Mapping]  [Test Resolution]                            │
│                                                               │
│ AD Group              → ZL-MCDT Role    Priority  Active      │
│ ─────────────────────────────────────────────────────────      │
│ CN=Admins,OU=Groups   → Admin           100       ✓  [✎][🗑] │
│ CN=DevOps,OU=Groups   → Operator        50        ✓  [✎][🗑] │
│ CN=QA,OU=Groups       → Viewer          10        ✓  [✎][🗑] │
└───────────────────────────────────────────────────────────────┘
```

**Add Mapping dialog**:
- AD Group: text input with autocomplete (calls `GET /groups?search=...`)
- Role: dropdown (admin, approver, operator, viewer)
- Priority: number input (0–1000)

**Test Resolution dialog**:
- Username input → calls `POST /role-mappings/test`
- Shows full resolution chain: matched groups, matched mappings, final resolved role

#### Section 4 — User Sync

```
┌─ User Synchronization ───────────────────────────────────────┐
│ Last sync: 2025-03-03 07:30 UTC (47 users, 3 new, 0 errors) │
│                                                               │
│ [Sync Now]   Interval: Every 60 minutes                      │
└───────────────────────────────────────────────────────────────┘
```

### Step 4.7 — AD Group Browser Component

**New file**: `frontend/src/components/admin/AdGroupBrowser.jsx`

Reusable component for browsing and selecting AD groups (used in role mapping creation):

- Search input with debounced API call to `GET /groups?search=...`
- Results shown in a scrollable list with group name and DN
- Clicking a group selects it and populates the mapping form
- Optional: expand to show group members

### Step 4.8 — User Management Updates

**File**: `frontend/src/pages/SystemAdmin.jsx` (User Management tab)

Update the existing user list/table:
- Add "Auth Provider" column showing `Local` or `AD` badge
- AD users: disable password fields, disable role dropdown (role comes from AD group mapping)
- AD users: show "Last AD Sync" timestamp
- Add filter dropdown: "All Users" / "Local Only" / "AD Only"
- AD users cannot be created through the UI (they come from sync or first login)

---

## File Inventory

### New Files
| File | Purpose |
|------|---------|
| `frontend/src/components/admin/AdConfigManager.jsx` | AD configuration management UI |
| `frontend/src/components/admin/AdGroupBrowser.jsx` | AD group search/browse component |
| `frontend/src/pages/AccessDenied.jsx` | 403 "Access Denied" page |

### Modified Files
| File | Changes |
|------|---------|
| `frontend/src/context/AuthContext.jsx` | Multi-provider login, token refresh, role utils, `adEnabled` state |
| `frontend/src/services/api.js` | `adConfig` + `auth` namespaces, refresh interceptor |
| `frontend/src/pages/Login.jsx` | Dual-auth tabs (Local + AD), conditional on `adEnabled` |
| `frontend/src/index.jsx` | Role-based `ProtectedRoute`, apply roles to routes |
| `frontend/src/components/Layout.jsx` | Role-based nav filtering, user info display, auth provider badge |
| `frontend/src/pages/SystemAdmin.jsx` | Add "AD / LDAP" tab, update User Management for AD users |

---

## Route-Level Role Configuration

Apply role-based protection in `index.jsx` route definitions:

| Route | Allowed Roles |
|-------|--------------|
| `/login` | Public |
| `/register` | Public |
| `/dashboard` | All authenticated |
| `/deployments` | All authenticated |
| `/deployments/:id` | All authenticated |
| `/deploy` | admin, operator |
| `/credentials` | admin, operator |
| `/settings` | admin |

---

## Validation Criteria

- [ ] Login page shows only local form when AD is not configured
- [ ] Login page shows Local + AD tabs when AD is configured
- [ ] AD login with valid credentials succeeds and redirects to dashboard
- [ ] AD login shows meaningful errors (wrong password, account locked, server unreachable)
- [ ] Token refresh works transparently — user doesn't get logged out on access token expiry
- [ ] `viewer` role users cannot see "New Deployment", "Credentials", or "System Admin" in nav
- [ ] `operator` role users cannot see "System Admin" in nav
- [ ] Navigating to `/settings` as non-admin shows Access Denied page
- [ ] AD Configuration tab appears in System Admin for admin users
- [ ] Creating/editing/testing AD connections works through the UI
- [ ] Role mapping CRUD works with group autocomplete
- [ ] Test Role Resolution shows complete chain with resolved role
- [ ] Manual sync triggers and shows results
- [ ] User Management table shows auth provider and disables password fields for AD users
- [ ] Sidebar shows user name, role badge, and auth provider indicator
- [ ] 401 interceptor retries with refreshed token before logging out
- [ ] No regressions in existing local login flow
