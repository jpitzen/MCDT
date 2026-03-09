# Phase 2 — AD/LDAP Authentication Foundation

**Feature**: Active Directory / LDAP authentication backend — database schema, LDAP client, and auth service  
**Priority**: High | **Complexity**: High | **Estimated Effort**: 5–8 days  
**Dependencies**: Phase 1 completed (User model changes should be sequential)  
**Reference**: `docs/For Reference/AD_Auth/AD-AUTH-INTEGRATION-GUIDE.md`, `docs/For Reference/AD_Auth/backend/`  
**Key Adaptation**: Source is Python/FastAPI → must translate to Node.js/Express

---

## Rationale — Why Phase 2

This phase lays the database and service foundation that all subsequent AD Auth work depends on. No API routes or frontend are built here — only the data layer, the LDAP client wrapper, and the auth service modifications. This separation ensures the schema and core logic are solid before exposing them through HTTP endpoints.

---

## Current State Analysis

| Component | Current State | Gap |
|-----------|--------------|-----|
| **Auth service** | `authService.js` — local-only (bcrypt + JWT) | No LDAP bind/search, no `authProvider` dispatch |
| **User model** | `password` is `allowNull: false` | AD users won't have local passwords |
| **JWT tokens** | Payload: `{ userId, email, role, type }` | No `authProvider` claim |
| **Config** | `backend/.env` + `config/database.js` | No LDAP env vars |
| **Dependencies** | None LDAP-related | Need `ldapjs` (Node.js LDAP client) |
| **Encryption** | `credentialService.js` has AES-256 encryption | Can reuse for AD service account credentials |

---

## Deliverables

### Step 2.1 — Install Dependencies

```bash
cd backend
npm install ldapjs
```

`ldapjs` is the Node.js equivalent of Python's `ldap3`. It provides:
- LDAP client with bind, search, compare operations
- TLS/STARTTLS support
- Connection pooling
- Event-based API

No other new dependencies are needed — `jsonwebtoken`, `bcrypt`, and the AES encryption utilities already exist.

### Step 2.2 — Database Migrations

#### 2.2a — Extend Users Table

**New file**: `backend/src/migrations/YYYYMMDDHHMMSS-add-ad-auth-fields.js`  
**New file**: `backend/migrations/add-ad-auth-fields.sql`

```sql
-- Migration: add-ad-auth-fields
-- Date: 2025-XX-XX

-- Auth provider tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) DEFAULT 'local'
  CHECK (auth_provider IN ('local', 'ldap', 'ad'));

-- AD-specific fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS external_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS distinguished_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ad_groups JSONB DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_ad_sync TIMESTAMP WITH TIME ZONE;

-- Allow null password for AD users (currently NOT NULL)
ALTER TABLE users ALTER COLUMN password DROP NOT NULL;

-- Index for AD lookups
CREATE INDEX IF NOT EXISTS idx_users_external_id ON users(external_id);
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON users(auth_provider);

COMMENT ON COLUMN users.auth_provider IS 'Authentication source: local (bcrypt), ldap, or ad';
COMMENT ON COLUMN users.external_id IS 'AD objectGUID or LDAP uid for external identity linking';
COMMENT ON COLUMN users.distinguished_name IS 'Full AD/LDAP DN, e.g. CN=John,OU=Users,DC=corp,DC=example,DC=com';
COMMENT ON COLUMN users.ad_groups IS 'JSON array of AD group DNs the user belongs to';
```

#### 2.2b — AD Configuration Table

**New file**: `backend/src/migrations/YYYYMMDDHHMMSS-create-ad-configurations.js`  
**New file**: `backend/migrations/create-ad-configurations.sql`

```sql
-- Migration: create-ad-configurations
-- Date: 2025-XX-XX

CREATE TABLE IF NOT EXISTS ad_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT false,
  
  -- Connection settings
  server_url VARCHAR(500) NOT NULL,
  base_dn VARCHAR(500) NOT NULL,
  use_ssl BOOLEAN DEFAULT true,
  port INTEGER DEFAULT 636,
  connection_timeout INTEGER DEFAULT 10,
  
  -- Bind credentials (encrypted — reuse credentialService AES)
  bind_dn TEXT NOT NULL,
  bind_password_encrypted TEXT NOT NULL,
  
  -- Search settings
  user_search_filter VARCHAR(500) DEFAULT '(sAMAccountName={username})',
  user_search_base VARCHAR(500),
  group_search_filter VARCHAR(500) DEFAULT '(objectClass=group)',
  group_search_base VARCHAR(500),
  
  -- Attribute mapping
  email_attribute VARCHAR(100) DEFAULT 'mail',
  display_name_attribute VARCHAR(100) DEFAULT 'displayName',
  first_name_attribute VARCHAR(100) DEFAULT 'givenName',
  last_name_attribute VARCHAR(100) DEFAULT 'sn',
  group_attribute VARCHAR(100) DEFAULT 'memberOf',
  unique_id_attribute VARCHAR(100) DEFAULT 'objectGUID',
  
  -- Behavior
  auto_create_users BOOLEAN DEFAULT true,
  default_role VARCHAR(20) DEFAULT 'viewer',
  sync_interval_minutes INTEGER DEFAULT 60,
  
  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Only one active config at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_ad_config_active 
  ON ad_configurations(is_active) WHERE is_active = true;
```

#### 2.2c — AD Role Mappings Table

**New file**: `backend/src/migrations/YYYYMMDDHHMMSS-create-ad-role-mappings.js`  
**New file**: `backend/migrations/create-ad-role-mappings.sql`

```sql
-- Migration: create-ad-role-mappings
-- Date: 2025-XX-XX

CREATE TABLE IF NOT EXISTS ad_role_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_config_id UUID NOT NULL REFERENCES ad_configurations(id) ON DELETE CASCADE,
  ad_group_dn TEXT NOT NULL,
  ad_group_name VARCHAR(255) NOT NULL,
  mapped_role VARCHAR(20) NOT NULL CHECK (mapped_role IN ('admin', 'approver', 'operator', 'viewer')),
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(ad_config_id, ad_group_dn)
);

COMMENT ON COLUMN ad_role_mappings.priority IS 'Higher priority wins when user is in multiple groups. Admin=highest.';
```

### Step 2.3 — Sequelize Models

#### 2.3a — Update User Model

**File**: `backend/src/models/User.js`

Changes:
- Add fields: `authProvider` (ENUM: 'local', 'ldap', 'ad', default 'local'), `externalId` (STRING), `distinguishedName` (TEXT), `adGroups` (JSONB, default []), `lastAdSync` (DATE)
- Change `password` from `allowNull: false` to `allowNull: true`
- Update `beforeCreate`/`beforeUpdate` hooks: only hash password if `authProvider === 'local'` and password is provided
- Update `validatePassword()`: return false immediately if `authProvider !== 'local'`
- Update `toSafeObject()`: include `authProvider` (but NOT `externalId` or `distinguishedName` — those are internal)
- Add class method `findByExternalId(externalId)` for AD user lookups

#### 2.3b — New AdConfiguration Model

**New file**: `backend/src/models/AdConfiguration.js`

```
Fields: id, name, isActive, serverUrl, baseDn, useSsl, port, connectionTimeout,
        bindDn, bindPasswordEncrypted, userSearchFilter, userSearchBase,
        groupSearchFilter, groupSearchBase, emailAttribute, displayNameAttribute,
        firstNameAttribute, lastNameAttribute, groupAttribute, uniqueIdAttribute,
        autoCreateUsers, defaultRole, syncIntervalMinutes, createdBy
        
Associations: belongsTo(User, as: 'creator'), hasMany(AdRoleMapping)
Instance methods: getDecryptedBindPassword(), setBindPassword(plaintext)
```

The `setBindPassword()` and `getDecryptedBindPassword()` methods reuse the existing AES-256 encryption from `credentialService.js` (extract the encrypt/decrypt functions into a shared utility).

#### 2.3c — New AdRoleMapping Model

**New file**: `backend/src/models/AdRoleMapping.js`

```
Fields: id, adConfigId, adGroupDn, adGroupName, mappedRole, priority, isActive
Associations: belongsTo(AdConfiguration)
```

#### 2.3d — Register in Models Index

**File**: `backend/src/models/index.js`

- Import `AdConfiguration` and `AdRoleMapping`
- Define associations:
  - `AdConfiguration.hasMany(AdRoleMapping, { foreignKey: 'adConfigId', as: 'roleMappings' })`
  - `AdRoleMapping.belongsTo(AdConfiguration, { foreignKey: 'adConfigId' })`
  - `User.hasMany(AdConfiguration, { foreignKey: 'createdBy', as: 'adConfigs' })`
- Export from barrel

### Step 2.4 — Extract Encryption Utility

**New file**: `backend/src/utils/encryption.js`

Extract the AES-256-CBC encrypt/decrypt functions that currently live inside `credentialService.js` into a shared utility:

```javascript
// encrypt(plaintext, key?) → { encrypted, iv, tag }
// decrypt({ encrypted, iv, tag }, key?) → plaintext
// Key defaults to process.env.ENCRYPTION_KEY or derived from JWT_SECRET
```

Update `credentialService.js` to import from this utility instead of having its own copy. `AdConfiguration` will also use this for bind password encryption.

### Step 2.5 — LDAP Client Service

**New file**: `backend/src/services/ldapService.js`

A singleton service wrapping `ldapjs` with the following methods:

| Method | Signature | Purpose |
|--------|-----------|---------|
| `connect` | `(config: AdConfiguration) → client` | Create LDAP client with TLS options, bind with service account |
| `authenticate` | `(username, password, config?) → { success, user, groups }` | Bind as user to verify credentials, then search for attributes |
| `searchUser` | `(username, config?) → userEntry \| null` | Search for a single user by sAMAccountName or UPN |
| `searchGroups` | `(userDn, config?) → string[]` | Get all group DNs for a user (recursive if needed) |
| `testConnection` | `(config) → { success, message, serverInfo }` | Verify LDAP connectivity and bind without user auth |
| `disconnect` | `(client) → void` | Unbind and destroy client |

**Error handling**: Wrap all `ldapjs` errors into structured error objects:
- `LDAP_CONNECTION_FAILED` — server unreachable or TLS error
- `LDAP_BIND_FAILED` — invalid service account or user credentials
- `LDAP_SEARCH_FAILED` — search filter or base DN error
- `LDAP_USER_NOT_FOUND` — search returned 0 results
- `LDAP_TIMEOUT` — connection or operation timeout

**Connection flow**:
```
1. Load active AdConfiguration from DB
2. Decrypt bind password via encryption utility
3. Create ldapjs client with { url, tlsOptions, connectTimeout }
4. Bind with service account (bindDn + decrypted password)
5. Search for user using configured filter (replace {username} placeholder)
6. If found: attempt user bind with provided password
7. If user bind succeeds: search for group memberships
8. Return { success: true, user: { attributes }, groups: [DNs] }
```

**Config caching**: Cache the active `AdConfiguration` in memory with a 5-minute TTL. Invalidate on config update.

### Step 2.6 — Update Auth Service

**File**: `backend/src/services/authService.js`

Changes:

1. **Add `authenticateWithAd(username, password)` method**:
   ```
   - Call ldapService.authenticate(username, password)
   - If success: find or create User record
     - Find by externalId (AD objectGUID)
     - If not found: create new user with authProvider='ad', password=null
     - If found: update adGroups, lastAdSync, profile fields
   - Resolve role from AD groups using AdRoleMapping table (highest priority wins)
   - Generate JWT tokens (include authProvider in payload)
   - Return { user, accessToken, refreshToken }
   ```

2. **Update `generateToken()` payload**:
   ```javascript
   // Before: { userId, email, role, type }
   // After:  { userId, email, role, type, authProvider }
   ```

3. **Update `authenticateUser(email, password)` method**:
   - Check `user.authProvider` — if not 'local', reject with `USE_AD_LOGIN` error
   - Existing bcrypt flow unchanged for local users

4. **Add `resolveAdRole(groups, configId)` method**:
   ```
   - Query AdRoleMapping where adGroupDn IN (groups) AND isActive=true
   - Sort by priority DESC
   - Return highest-priority mapped role, or config.defaultRole if no match
   ```

### Step 2.7 — Register in Services Index

**File**: `backend/src/services/index.js`

- Import and export `ldapService`
- Encryption utility is a shared util, not a service

---

## File Inventory

### New Files
| File | Purpose |
|------|---------|
| `backend/src/migrations/YYYYMMDDHHMMSS-add-ad-auth-fields.js` | Sequelize migration — user AD fields |
| `backend/src/migrations/YYYYMMDDHHMMSS-create-ad-configurations.js` | Sequelize migration — AD config table |
| `backend/src/migrations/YYYYMMDDHHMMSS-create-ad-role-mappings.js` | Sequelize migration — role mapping table |
| `backend/migrations/add-ad-auth-fields.sql` | Raw SQL migration — user AD fields |
| `backend/migrations/create-ad-configurations.sql` | Raw SQL migration — AD config table |
| `backend/migrations/create-ad-role-mappings.sql` | Raw SQL migration — role mappings |
| `backend/src/models/AdConfiguration.js` | Sequelize model for AD/LDAP configs |
| `backend/src/models/AdRoleMapping.js` | Sequelize model for group→role mappings |
| `backend/src/services/ldapService.js` | LDAP client wrapper (ldapjs) |
| `backend/src/utils/encryption.js` | Shared AES-256 encrypt/decrypt |

### Modified Files
| File | Changes |
|------|---------|
| `backend/package.json` | Add `ldapjs` dependency |
| `backend/src/models/User.js` | AD fields, nullable password, `findByExternalId()` |
| `backend/src/models/index.js` | Register new models + associations |
| `backend/src/services/authService.js` | `authenticateWithAd()`, `resolveAdRole()`, updated JWT payload |
| `backend/src/services/index.js` | Export `ldapService` |
| `backend/src/services/credentialService.js` | Refactor to use shared `encryption.js` |

---

## Database Schema — Visual Reference

```
┌──────────────────────┐     ┌──────────────────────────┐
│       users           │     │   ad_configurations       │
├──────────────────────┤     ├──────────────────────────┤
│ id (PK)              │     │ id (PK)                  │
│ email                │     │ name                     │
│ password (nullable!) │     │ is_active (unique where)  │
│ role                 │     │ server_url               │
│ auth_provider ●NEW   │     │ base_dn                  │
│ external_id ●NEW     │     │ use_ssl, port            │
│ distinguished_name   │     │ bind_dn                  │
│ ad_groups (JSONB)    │     │ bind_password_encrypted  │
│ last_ad_sync         │     │ user_search_filter       │
│ theme_preferences    │     │ *_attribute (6 fields)   │
│ ...existing fields   │     │ auto_create_users        │
└──────────────────────┘     │ default_role             │
         ▲                   │ created_by (FK→users)    │
         │                   └──────────┬───────────────┘
         │                              │ hasMany
         │                   ┌──────────▼───────────────┐
         │                   │   ad_role_mappings        │
         │                   ├──────────────────────────┤
         │                   │ id (PK)                  │
         │                   │ ad_config_id (FK)        │
         │                   │ ad_group_dn              │
         │                   │ ad_group_name            │
         │                   │ mapped_role              │
         │                   │ priority                 │
         │                   │ is_active                │
         │                   └──────────────────────────┘
```

---

## Adaptation Notes — Python → Node.js

| Source (Python) | ZL-MCDT (Node.js) | Notes |
|-----------------|-------------------|-------|
| `ldap3` library | `ldapjs` | Different API style (event-based vs procedural) |
| `Fernet` (AES) encryption | AES-256-CBC from `credentialService.js` | Already exists, just extract to shared util |
| `python-jose` JWT | `jsonwebtoken` | Already in use |
| FastAPI `Depends()` | Express middleware chain | Same pattern, different syntax |
| SQLAlchemy models | Sequelize models | Same ORM pattern |
| Pydantic schemas | express-validator | Inline validation on routes |

---

## Validation Criteria

- [ ] All 3 migrations run without errors (`npm run db:migrate` + `node run-migrations.js`)
- [ ] `users` table has new columns: `auth_provider`, `external_id`, `distinguished_name`, `ad_groups`, `last_ad_sync`
- [ ] `users.password` is now nullable
- [ ] Existing local users still have `auth_provider = 'local'` (migration default)
- [ ] `ad_configurations` table exists with correct schema
- [ ] `ad_role_mappings` table exists with FK to `ad_configurations`
- [ ] Only one `ad_configurations` row can have `is_active = true` (unique partial index)
- [ ] `ldapService.testConnection()` returns structured success/error (test against a mock or real AD)
- [ ] `authService.authenticateUser()` still works for local users (no regression)
- [ ] `authService.authenticateWithAd()` creates a new user with `authProvider='ad'` and `password=null`
- [ ] JWT tokens now include `authProvider` claim
- [ ] `encryption.js` encrypt/decrypt roundtrips correctly
- [ ] `credentialService.js` still works after refactor to use shared encryption
