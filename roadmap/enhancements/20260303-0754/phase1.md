# Phase 1 — Theme Customization

**Feature**: Per-user theme preferences with preset colors, dark/light/system modes, and backend persistence  
**Priority**: Medium | **Complexity**: Low-Medium | **Estimated Effort**: 3–5 days  
**Dependencies**: None (self-contained, no external libraries required)  
**Reference**: `docs/For Reference/themes/customization.md`

---

## Rationale — Why Phase 1

Theme customization is the simplest of the two planned features. It touches the fewest files, requires no external service integrations (unlike LDAP), and has zero impact on authentication or security. Shipping it first provides a visible UX win while the larger AD Auth feature is built in subsequent phases.

---

## Current State Analysis

| Component | Current State | Gap |
|-----------|--------------|-----|
| **Theme modes** | Dark/light/auto cycling exists in `index.jsx` | No user-selectable colors, no backend persistence |
| **ThemeContext** | Inline in `frontend/src/index.jsx` (~15 lines) | Not a standalone module, no color preset support |
| **User model** | No `theme_preferences` field | Need JSONB column on `users` table |
| **API endpoints** | `GET /api/auth/profile` / `PUT /api/auth/profile` exist | Neither reads/writes theme preferences |
| **Navigation** | `Layout.jsx` has hardcoded MUI palette colors | No dynamic sidebar/header coloring |
| **localStorage** | Stores `themeMode` only | Needs full preferences object |

---

## Deliverables

### Step 1.1 — Database Migration

**New file**: `backend/src/migrations/YYYYMMDDHHMMSS-add-theme-preferences.js`

```
users table:
  ADD COLUMN theme_preferences JSONB DEFAULT NULL
```

**Also create raw SQL version**: `backend/migrations/add-theme-preferences.sql`

```sql
-- Migration: add-theme-preferences
-- Date: 2025-XX-XX
ALTER TABLE users ADD COLUMN IF NOT EXISTS theme_preferences JSONB DEFAULT NULL;
COMMENT ON COLUMN users.theme_preferences IS 'Per-user theme settings: { mode, presetKey, customPrimary, customSecondary, customHeaderBg }';
```

**JSON shape stored in `theme_preferences`**:
```json
{
  "mode": "dark",
  "presetKey": "ocean-blue",
  "customPrimary": null,
  "customSecondary": null,
  "customHeaderBg": null
}
```

### Step 1.2 — Update User Model

**File**: `backend/src/models/User.js`

Changes:
- Add `themePreferences` field — `DataTypes.JSONB`, `allowNull: true`, `defaultValue: null`, field mapping `theme_preferences`
- Add to `toSafeObject()` return so it's included in API responses
- Add validation: if present, must be an object with valid keys

### Step 1.3 — Update Auth Profile Endpoints

**File**: `backend/src/routes/auth.js`

Changes to `GET /api/auth/profile`:
- Include `themePreferences` in response payload

Changes to `PUT /api/auth/profile`:
- Accept `themePreferences` in request body
- Validate shape: `mode` must be one of `['dark', 'light', 'system']`, `presetKey` must be one of the 8 valid preset keys or `'custom'`, color fields must be valid hex or null
- Persist to database

### Step 1.4 — Extract ThemeContext to Standalone Module

**New file**: `frontend/src/context/ThemeContext.jsx`

Move theme logic out of `frontend/src/index.jsx` into a dedicated context module.

The new ThemeContext must provide:

| Export | Type | Purpose |
|--------|------|---------|
| `ThemePreferencesProvider` | Component | Wraps app, creates MUI theme from preferences |
| `useThemePreferences` | Hook | Returns `{ preferences, setPreferences, persistToServer, loadFromServer, colors }` |
| `COLOR_PRESETS` | Constant | Array of 8 preset definitions |

**8 Color Presets** (from reference):

| Key | Primary | Secondary | Header BG |
|-----|---------|-----------|-----------|
| `castle-red` | `#c62828` | `#ff5252` | `#1a1a2e` |
| `ocean-blue` | `#1565c0` | `#42a5f5` | `#0d1b2a` |
| `forest-green` | `#2e7d32` | `#66bb6a` | `#1b2d1b` |
| `royal-purple` | `#6a1b9a` | `#ab47bc` | `#1a1a2e` |
| `midnight` | `#263238` | `#546e7a` | `#0d1117` |
| `sunset-orange` | `#e65100` | `#ff9800` | `#1a120d` |
| `teal-wave` | `#00695c` | `#26a69a` | `#0d1b1a` |
| `neon-red` | `#d50000` | `#ff1744` | `#1a0d0d` |

**Persistence strategy**:
1. On mount: read from `localStorage('zl-mcdt-theme-prefs')`
2. If user is authenticated: call `GET /api/auth/profile` → merge server prefs
3. On change: write to localStorage immediately (instant), debounce server persist
4. On login: `loadFromServer()` called by AuthContext
5. On logout: keep localStorage prefs (theme survives logout)

**MUI theme building**: Use `createTheme()` with resolved colors from preset or custom values. Apply component overrides for `MuiTableHead` (primary color headers) and `MuiTableRow` (alternating tint using `hexToRgba`).

### Step 1.5 — ThemeCustomizer Component

**New file**: `frontend/src/components/ThemeCustomizer.jsx`

A self-contained settings panel (can be embedded in SystemAdmin or rendered standalone).

**UI sections**:
1. **Display Mode** — Three-button toggle: Dark / Light / System
2. **Color Presets** — Grid of 8 cards, each showing a swatch bar (primary + secondary + header gradient), name label, radio-style selection
3. **Custom Colors** — Visible only when `presetKey === 'custom'`: three `<input type="color">` pickers for primary, secondary, header BG
4. **Live Preview** — Horizontal bar below the pickers showing AppBar + sidebar + card mockup in selected colors
5. **Save Button** — Calls `persistToServer()`, shows success snackbar

**Styling**: Use MUI `sx` prop exclusively (project convention — no CSS modules, minimal `styled()`).

### Step 1.6 — Navigation Integration

**File**: `frontend/src/components/Layout.jsx`

Changes:
- Import `useThemePreferences` from `context/ThemeContext`
- Replace hardcoded AppBar/Drawer colors with `colors.headerBg`, `colors.primary`, `colors.secondary`
- Active nav item uses `colors.primary` with 15% opacity background
- Drawer header gradient: `linear-gradient(135deg, colors.headerBg, darken(colors.headerBg, 20%))`
- Avatar background: `colors.primary`

### Step 1.7 — Wire into App

**File**: `frontend/src/index.jsx`

Changes:
- Remove inline ThemeContext definition and hardcoded `createTheme()`
- Import `ThemePreferencesProvider` from `context/ThemeContext`
- Provider tree order: `<ThemePreferencesProvider>` → `<AuthProvider>` → `<Router>` → ...
- Theme provider must wrap AuthProvider so the login page can already use the theme

### Step 1.8 — Add Settings Tab to SystemAdmin

**File**: `frontend/src/pages/SystemAdmin.jsx`

Changes:
- Add 4th tab: "Appearance"
- Tab content renders `<ThemeCustomizer />`
- Accessible to all authenticated users (personal preference, not admin-only)

---

## Color Helper Utilities

**New file**: `frontend/src/utils/colorHelpers.js`

```javascript
// darkenHex('#1565c0', 20) → darker hex
// hexToRgba('#1565c0', 0.15) → 'rgba(21, 101, 192, 0.15)'
```

Two pure functions used by ThemeContext and Layout for dynamic color manipulation.

---

## File Inventory

### New Files
| File | Purpose |
|------|---------|
| `backend/src/migrations/YYYYMMDDHHMMSS-add-theme-preferences.js` | Sequelize migration |
| `backend/migrations/add-theme-preferences.sql` | Raw SQL migration |
| `frontend/src/context/ThemeContext.jsx` | Theme preferences provider + hook |
| `frontend/src/components/ThemeCustomizer.jsx` | Theme settings UI |
| `frontend/src/utils/colorHelpers.js` | `darkenHex()`, `hexToRgba()` |

### Modified Files
| File | Changes |
|------|---------|
| `backend/src/models/User.js` | Add `themePreferences` JSONB field |
| `backend/src/routes/auth.js` | Read/write theme prefs in profile endpoints |
| `frontend/src/index.jsx` | Remove inline theme, wrap with `ThemePreferencesProvider` |
| `frontend/src/components/Layout.jsx` | Dynamic colors from theme context |
| `frontend/src/pages/SystemAdmin.jsx` | Add "Appearance" tab |

---

## Validation Criteria

- [ ] `npm run db:migrate` adds `theme_preferences` column without errors
- [ ] `GET /api/auth/profile` returns `themePreferences` field (null for existing users)
- [ ] `PUT /api/auth/profile` with `{ themePreferences: { mode: 'dark', presetKey: 'ocean-blue' } }` persists correctly
- [ ] Theme changes apply instantly in the browser (no page reload)
- [ ] Switching presets updates AppBar, Drawer, active nav items, and avatar
- [ ] Custom colors (when `presetKey: 'custom'`) use the user's hex values
- [ ] Theme persists across browser refresh (localStorage) and across devices (server sync)
- [ ] System mode correctly follows OS preference
- [ ] Logout preserves theme preference (localStorage stays)
- [ ] Login on a new device loads server-saved preferences
- [ ] ThemeCustomizer renders correctly in both dark and light modes
- [ ] No regressions in existing MUI component styling
