# Theme Customization — Developer Implementation Guide

This guide walks through every layer of the FAI theme system so a new dev team can replicate it exactly. The system delivers:

- **8 built-in colour presets** plus a fully custom hex option
- **Light / Dark / System** display-mode toggle
- **Per-user persistence** — preferences saved to the database via JWT-authenticated API, with `localStorage` as an instant-load fallback
- **Zero-config dark mode** for all MUI components via the context-built theme
- **Live preview** before the user saves

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Database Migration](#2-database-migration)
3. [Backend — UserModel](#3-backend--usermodel)
4. [Backend — authRoutes (API endpoints)](#4-backend--authroutes-api-endpoints)
5. [Frontend — ThemeContext](#5-frontend--themecontext)
6. [Frontend — App.tsx Wiring](#6-frontend--apptsx-wiring)
7. [Frontend — ThemeCustomizer Component](#7-frontend--themecustomizer-component)
8. [Frontend — Navigation Integration](#8-frontend--navigation-integration)
9. [Consuming the Theme Hook in Any Component](#9-consuming-the-theme-hook-in-any-component)
10. [Adding a New Colour Preset](#10-adding-a-new-colour-preset)
11. [Colour Helper Utilities](#11-colour-helper-utilities)

---

## 1. Architecture Overview

```
ThemePreferencesProvider (ThemeContext.tsx)
│
│   Reads from: localStorage  →  DB via GET /api/auth/me on login
│   Writes to:  localStorage  →  DB via PATCH /api/auth/profile
│
├── builds MUI Theme object  (createTheme)
├── exposes:  theme, preferences, primaryColor, secondaryColor,
│             headerBgColor, effectiveMode, setPreferences,
│             persistToServer, loadFromServer
│
App.tsx
├── <ThemePreferencesProvider>          ← wraps everything
│   ├── <ThemeProvider theme={theme}>  ← MUI receives the built theme
│   └── <AuthProvider onUserLoaded={...}>
│         └── on login → loadFromServer(user.themePreferences)
│
SettingsPage.tsx
└── <ThemeCustomizer />   ← user-facing UI panel
      uses useThemePreferences()

Navigation.tsx            ← consumes primaryColor / secondaryColor / headerBgColor
Any page component        ← consumes theme via useMemo / sx prop
```

**Persistence priority (on load):**
1. If an authenticated user has `theme_preferences` in the DB → use that.
2. If `localStorage` has a saved preference → use that.
3. Otherwise → defaults (`system` mode, `castle-red` preset).

---

## 2. Database Migration

Run once against your PostgreSQL instance to add the `theme_preferences` JSONB column:

**File:** `init-theme-preferences.sql`

```sql
-- Migration: Add theme_preferences column to users table
-- Stores user-selected colour scheme and display mode as JSON.
-- Run: docker exec -i fai-postgres psql -U fai_user -d file_categorization < init-theme-preferences.sql

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'theme_preferences'
  ) THEN
    ALTER TABLE users ADD COLUMN theme_preferences JSONB DEFAULT NULL;
    RAISE NOTICE 'Added theme_preferences column to users table.';
  ELSE
    RAISE NOTICE 'theme_preferences column already exists — skipping.';
  END IF;
END $$;
```

The stored JSON shape:

```json
{
  "mode": "dark",
  "presetKey": "ocean-blue",
  "customPrimary": null,
  "customSecondary": null,
  "customHeaderBg": null
}
```

Or for a fully custom palette:

```json
{
  "mode": "light",
  "presetKey": "custom",
  "customPrimary": "#003366",
  "customSecondary": "#888888",
  "customHeaderBg": "#001a33"
}
```

---

## 3. Backend — UserModel

**File:** `backend/src/models/UserModel.ts`

Add the `ThemePreferences` interface and `themePreferences` field to your Sequelize model:

```typescript
import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from './sequelize';

export type UserRole = 'admin' | 'tagger' | 'viewer';

// ── Theme preferences shape (mirrors the frontend ThemePreferences type) ──
export interface ThemePreferences {
  mode: 'light' | 'dark' | 'system';
  presetKey: string;           // key from COLOR_PRESETS, or 'custom'
  customPrimary?: string;      // hex when presetKey === 'custom'
  customSecondary?: string;
  customHeaderBg?: string;
}

export interface UserAttributes {
  id: number;
  username: string;
  email: string | null;
  fullName: string | null;
  role: UserRole;
  isAdUser: boolean;
  adDistinguishedName: string | null;
  adGroups: string[];
  isActive: boolean;
  isLocked: boolean;
  themePreferences: ThemePreferences | null;  // ← add this
  createdAt: Date;
  updatedAt: Date;
  lastLogin: Date | null;
}

interface UserCreationAttributes extends Optional<
  UserAttributes,
  | 'id' | 'email' | 'fullName' | 'role' | 'isAdUser'
  | 'adDistinguishedName' | 'adGroups' | 'isActive'
  | 'isLocked' | 'themePreferences'                 // ← add here too
  | 'createdAt' | 'updatedAt' | 'lastLogin'
> {}

class User extends Model<UserAttributes, UserCreationAttributes>
  implements UserAttributes {
  // ... other declare fields ...
  declare themePreferences: ThemePreferences | null;  // ← add this
}

User.init(
  {
    // ... other fields ...

    // ── Theme preferences (JSONB) ──────────────────────────────────────
    themePreferences: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
      field: 'theme_preferences',
    },
  },
  {
    sequelize,
    tableName: 'users',
    timestamps: true,
    underscored: true,
  }
);

export { User };
export default User;
```

---

## 4. Backend — authRoutes (API endpoints)

**File:** `backend/src/routes/authRoutes.ts`

Two routes need to handle `themePreferences`:

### GET `/api/auth/me` — include preferences in the response

```typescript
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const currentUser = req.user as CurrentUser;
    const user = await User.findByPk(currentUser.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    return res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isAdUser: user.isAdUser,
      adGroups: user.adGroups,
      lastLogin: user.lastLogin,
      themePreferences: user.themePreferences,  // ← include this
    });
  } catch (err: any) {
    console.error('[Auth] /me error:', err);
    return res.status(500).json({ error: 'Failed to retrieve user info' });
  }
});
```

### PATCH `/api/auth/profile` — persist user preferences

```typescript
router.patch('/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    const currentUser = req.user as CurrentUser;
    const user = await User.findByPk(currentUser.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { themePreferences } = req.body;
    if (themePreferences !== undefined) {
      user.themePreferences = themePreferences;
    }

    await user.save();

    return res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isAdUser: user.isAdUser,
      adGroups: user.adGroups,
      lastLogin: user.lastLogin,
      themePreferences: user.themePreferences,  // ← return updated value
    });
  } catch (err: any) {
    console.error('[Auth] Profile update error:', err);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
});
```

> The PATCH body is `{ themePreferences: ThemePreferences }`. Other profile fields can be added alongside it — the handler is additive.

---

## 5. Frontend — ThemeContext

**File:** `frontend/src/context/ThemeContext.tsx`

This is the core of the system. Copy this file in its entirety:

```tsx
/**
 * ThemeContext — User-selectable colour schemes and dark/light mode.
 *
 * Persistence priority:
 *   1. Authenticated user → DB column `theme_preferences` (via PATCH /api/auth/profile)
 *   2. localStorage fallback for anonymous / fast-load on refresh
 *
 * The context exposes the resolved MUI Theme so App.tsx simply wraps with
 * <ThemeProvider theme={theme}>.
 */
import React, {
  createContext, useContext, useState, useEffect,
  useCallback, useMemo, ReactNode,
} from 'react';
import { createTheme, Theme, useMediaQuery } from '@mui/material';

// ── Colour-scheme presets ────────────────────────────────────────────────
export interface ColorPreset {
  key: string;
  label: string;
  primary: string;    // primary.main
  secondary: string;  // secondary.main
  headerBg: string;   // sidebar header background
  swatch: string[];   // preview colours shown in the picker card
}

export const COLOR_PRESETS: ColorPreset[] = [
  {
    key: 'castle-red',
    label: 'Castle Red',
    primary: '#981B1F',
    secondary: '#666666',
    headerBg: '#666666',
    swatch: ['#981B1F', '#666666', '#7a1519'],
  },
  {
    key: 'ocean-blue',
    label: 'Ocean Blue',
    primary: '#1565C0',
    secondary: '#546E7A',
    headerBg: '#37474F',
    swatch: ['#1565C0', '#546E7A', '#0D47A1'],
  },
  {
    key: 'forest-green',
    label: 'Forest Green',
    primary: '#2E7D32',
    secondary: '#5D4037',
    headerBg: '#3E2723',
    swatch: ['#2E7D32', '#5D4037', '#1B5E20'],
  },
  {
    key: 'royal-purple',
    label: 'Royal Purple',
    primary: '#6A1B9A',
    secondary: '#455A64',
    headerBg: '#37474F',
    swatch: ['#6A1B9A', '#455A64', '#4A148C'],
  },
  {
    key: 'midnight',
    label: 'Midnight',
    primary: '#1A237E',
    secondary: '#424242',
    headerBg: '#212121',
    swatch: ['#1A237E', '#424242', '#0D1642'],
  },
  {
    key: 'sunset-orange',
    label: 'Sunset Orange',
    primary: '#E65100',
    secondary: '#5D4037',
    headerBg: '#4E342E',
    swatch: ['#E65100', '#5D4037', '#BF360C'],
  },
  {
    key: 'teal-wave',
    label: 'Teal Wave',
    primary: '#00695C',
    secondary: '#546E7A',
    headerBg: '#37474F',
    swatch: ['#00695C', '#546E7A', '#004D40'],
  },
  {
    key: 'neon-red',
    label: 'Neon Red',
    primary: '#FF2D3B',
    secondary: '#616161',
    headerBg: '#424242',
    swatch: ['#FF2D3B', '#616161', '#D50000'],
  },
];

// ── Types ────────────────────────────────────────────────────────────────
export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemePreferences {
  mode: ThemeMode;
  presetKey: string;          // key from COLOR_PRESETS, or 'custom'
  customPrimary?: string;
  customSecondary?: string;
  customHeaderBg?: string;
}

// ── Defaults ─────────────────────────────────────────────────────────────
const DEFAULT_PREFS: ThemePreferences = {
  mode: 'system',
  presetKey: 'castle-red',
};

// ── localStorage key ──────────────────────────────────────────────────────
const LS_KEY = 'fai-theme-prefs';

function loadFromLocalStorage(): ThemePreferences {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch { /* corrupted — fall through */ }
  return { ...DEFAULT_PREFS };
}

function saveToLocalStorage(prefs: ThemePreferences) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(prefs));
  } catch { /* quota — ignore */ }
}

// ── Resolve colours from preferences ─────────────────────────────────────
function resolveColors(prefs: ThemePreferences) {
  if (prefs.presetKey === 'custom') {
    return {
      primary: prefs.customPrimary || '#981B1F',
      secondary: prefs.customSecondary || '#666666',
      headerBg: prefs.customHeaderBg || '#666666',
    };
  }
  const preset = COLOR_PRESETS.find(p => p.key === prefs.presetKey) || COLOR_PRESETS[0];
  return { primary: preset.primary, secondary: preset.secondary, headerBg: preset.headerBg };
}

// ── Context value type ────────────────────────────────────────────────────
export interface ThemeContextValue {
  /** The fully-built MUI theme, ready for <ThemeProvider>. */
  theme: Theme;
  /** Current preferences (mode + preset/custom colours). */
  preferences: ThemePreferences;
  /** Resolved primary colour hex (convenience). */
  primaryColor: string;
  /** Resolved secondary colour hex. */
  secondaryColor: string;
  /** Sidebar header background colour. */
  headerBgColor: string;
  /** Effective mode after resolving 'system'. */
  effectiveMode: 'light' | 'dark';
  /** Update preferences. Persists to localStorage immediately. */
  setPreferences: (prefs: ThemePreferences) => void;
  /** Push current preferences to the backend (call after setPreferences when authenticated). */
  persistToServer: () => Promise<void>;
  /** Load prefs from server response (called by AuthContext on login / checkAuth). */
  loadFromServer: (serverPrefs: ThemePreferences | null | undefined) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────────────────────
export function ThemePreferencesProvider({ children }: { children: ReactNode }) {
  const systemPrefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const [prefs, setPrefsState] = useState<ThemePreferences>(loadFromLocalStorage);

  const effectiveMode: 'light' | 'dark' =
    prefs.mode === 'system' ? (systemPrefersDark ? 'dark' : 'light') : prefs.mode;

  const { primary, secondary, headerBg } = useMemo(() => resolveColors(prefs), [prefs]);

  // Build MUI theme from current preferences
  const theme = useMemo(() => {
    const isDark = effectiveMode === 'dark';
    return createTheme({
      palette: {
        mode: effectiveMode,
        primary: { main: primary },
        secondary: { main: secondary },
        background: {
          default: isDark ? '#121212' : '#f5f5f5',
          paper: isDark ? '#1e1e1e' : '#ffffff',
        },
      },
      typography: {
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      },
      components: {
        // Table headers adopt the primary colour automatically
        MuiTableHead: {
          styleOverrides: {
            root: {
              backgroundColor: isDark ? darkenHex(primary, 0.6) : primary,
              '& .MuiTableCell-head': {
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '0.875rem',
                borderBottom: `2px solid ${isDark ? primary : darkenHex(primary, 0.15)}`,
              },
            },
          },
        },
        // Subtle alternating row tint derived from the primary colour
        MuiTableRow: {
          styleOverrides: {
            root: {
              '&:nth-of-type(even)': {
                backgroundColor: isDark
                  ? hexToRgba(primary, 0.04)
                  : hexToRgba(primary, 0.03),
              },
            },
          },
        },
      },
    });
  }, [effectiveMode, primary, secondary]);

  // ── Setters ───────────────────────────────────────────────────────────
  const setPreferences = useCallback((next: ThemePreferences) => {
    setPrefsState(next);
    saveToLocalStorage(next);
  }, []);

  const persistToServer = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;
      const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';
      await fetch(`${API_BASE_URL}/auth/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ themePreferences: prefs }),
      });
    } catch {
      // Best-effort — localStorage already saved
    }
  }, [prefs]);

  const loadFromServer = useCallback((serverPrefs: ThemePreferences | null | undefined) => {
    if (serverPrefs && serverPrefs.presetKey) {
      setPrefsState(serverPrefs);
      saveToLocalStorage(serverPrefs);
    }
  }, []);

  const value: ThemeContextValue = useMemo(
    () => ({
      theme,
      preferences: prefs,
      primaryColor: primary,
      secondaryColor: secondary,
      headerBgColor: headerBg,
      effectiveMode,
      setPreferences,
      persistToServer,
      loadFromServer,
    }),
    [theme, prefs, primary, secondary, headerBg, effectiveMode, setPreferences, persistToServer, loadFromServer],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// ── Hook ──────────────────────────────────────────────────────────────────
export function useThemePreferences(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemePreferences must be used within <ThemePreferencesProvider>');
  return ctx;
}

// ── Colour helpers ────────────────────────────────────────────────────────

/** Darken a hex colour by a fraction (0–1). */
function darkenHex(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.round(((num >> 16) & 0xff) * (1 - amount)));
  const g = Math.max(0, Math.round(((num >> 8) & 0xff) * (1 - amount)));
  const b = Math.max(0, Math.round((num & 0xff) * (1 - amount)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/** Convert hex to rgba string. */
function hexToRgba(hex: string, alpha: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default ThemeContext;
```

---

## 6. Frontend — App.tsx Wiring

**File:** `frontend/src/App.tsx`

The provider tree must be layered in this order so `ThemeProvider` wraps `AuthProvider`:

```tsx
import React, { useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Box, ThemeProvider, GlobalStyles } from '@mui/material';
import { AuthProvider } from './context/AuthContext';
import { ThemePreferencesProvider, useThemePreferences } from './context/ThemeContext';
import type { User } from './types/auth';
import type { ThemePreferences } from './context/ThemeContext';

const DRAWER_WIDTH = 240;

// ── Root: wrap everything in the theme provider first ──────────────────
export default function App() {
  return (
    <ThemePreferencesProvider>
      <ThemedApp />
    </ThemePreferencesProvider>
  );
}

// ── ThemedApp reads the built theme and wires MUI + Auth ───────────────
function ThemedApp() {
  const { theme, effectiveMode, loadFromServer, primaryColor } = useThemePreferences();

  // When auth resolves a logged-in user, sync their DB theme to the context
  const handleUserLoaded = useCallback(
    (user: User) => {
      if (user.themePreferences) {
        loadFromServer(user.themePreferences as ThemePreferences);
      }
    },
    [loadFromServer],
  );

  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles
        styles={{
          'html, body, #root': {
            margin: 0,
            padding: 0,
            width: '100%',
            height: '100%',
            overflow: 'hidden',
          },
          body: {
            backgroundColor: effectiveMode === 'dark' ? '#121212' : '#f5f5f5',
          },
        }}
      />
      <AuthProvider onUserLoaded={handleUserLoaded}>
        {/* your AuthGuard / router tree */}
        <AppContent primaryColor={primaryColor} />
      </AuthProvider>
    </ThemeProvider>
  );
}

// ── AppContent applies the primary colour to headings and bold list text ─
function AppContent({ primaryColor }: { primaryColor: string }) {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', maxHeight: '100vh', overflow: 'hidden' }}>
      {/* <Navigation drawerWidth={DRAWER_WIDTH} /> */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          backgroundColor: (theme) => theme.palette.background.default,
          minHeight: '100vh',
          maxHeight: '100vh',
          overflow: 'auto',
          p: 3,
          // Headings and bold list text always use the brand primary colour
          '& h1, & h2, & h3, & h4, & h5, & h6': {
            color: primaryColor,
          },
          '& ol, & ul': {
            '& li': {
              color: (theme) => theme.palette.text.primary,
              '& strong': { color: primaryColor },
            },
          },
        }}
      >
        <Routes>
          {/* your routes */}
        </Routes>
      </Box>
    </Box>
  );
}
```

> **Important:** `ThemePreferencesProvider` must be the outermost wrapper so the built `theme` object is available before `ThemeProvider` renders. `AuthProvider` sits inside so login events can call `loadFromServer`.

---

## 7. Frontend — ThemeCustomizer Component

**File:** `frontend/src/components/ThemeCustomizer.tsx`

Drop this component anywhere you want the user-facing theme picker (Settings page, Profile page, etc.):

```tsx
/**
 * ThemeCustomizer — UI for choosing colour presets, custom colours,
 * and dark/light mode. Embed inside SettingsPage or a Profile page.
 */
import React, { useState } from 'react';
import {
  Box, Card, CardContent, Typography, Grid,
  ToggleButtonGroup, ToggleButton, TextField, Button,
  Tooltip, Divider, Alert, CircularProgress,
} from '@mui/material';
import {
  LightMode as LightIcon,
  DarkMode as DarkIcon,
  SettingsBrightness as SystemIcon,
  Check as CheckIcon,
  Save as SaveIcon,
  Palette as PaletteIcon,
} from '@mui/icons-material';
import {
  useThemePreferences,
  COLOR_PRESETS,
  ThemeMode,
  ThemePreferences,
  ColorPreset,
} from '../context/ThemeContext';

const ThemeCustomizer: React.FC = () => {
  const {
    preferences, setPreferences, persistToServer, primaryColor, effectiveMode,
  } = useThemePreferences();

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Local draft for custom colours — edit without saving on every keystroke
  const [customPrimary,   setCustomPrimary]   = useState(preferences.customPrimary   || '#981B1F');
  const [customSecondary, setCustomSecondary] = useState(preferences.customSecondary || '#666666');
  const [customHeaderBg,  setCustomHeaderBg]  = useState(preferences.customHeaderBg  || '#666666');

  // ── Mode toggle ──────────────────────────────────────────────────────
  const handleModeChange = (_: React.MouseEvent<HTMLElement>, newMode: ThemeMode | null) => {
    if (!newMode) return;
    setPreferences({ ...preferences, mode: newMode });
  };

  // ── Preset selection ─────────────────────────────────────────────────
  const handlePresetSelect = (preset: ColorPreset) => {
    setPreferences({ ...preferences, presetKey: preset.key });
  };

  // ── Custom colour apply ──────────────────────────────────────────────
  const handleApplyCustom = () => {
    setPreferences({
      ...preferences,
      presetKey: 'custom',
      customPrimary,
      customSecondary,
      customHeaderBg,
    });
  };

  // ── Persist to server ────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    await persistToServer();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const isCustom = preferences.presetKey === 'custom';

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          <PaletteIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Appearance &amp; Theme
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Choose a colour scheme and display mode. Changes preview instantly;
          click Save to persist across sessions.
        </Typography>

        {/* ── Mode Toggle ──────────────────────────────────────────── */}
        <Typography variant="subtitle2" gutterBottom>Display Mode</Typography>
        <ToggleButtonGroup
          value={preferences.mode}
          exclusive
          onChange={handleModeChange}
          sx={{ mb: 3 }}
        >
          <ToggleButton value="light"><LightIcon sx={{ mr: 0.5 }} /> Light</ToggleButton>
          <ToggleButton value="system"><SystemIcon sx={{ mr: 0.5 }} /> System</ToggleButton>
          <ToggleButton value="dark"><DarkIcon sx={{ mr: 0.5 }} /> Dark</ToggleButton>
        </ToggleButtonGroup>

        <Divider sx={{ my: 2 }} />

        {/* ── Colour Scheme Presets ─────────────────────────────────── */}
        <Typography variant="subtitle2" gutterBottom>Colour Scheme</Typography>
        <Grid container spacing={1.5} sx={{ mb: 3 }}>
          {COLOR_PRESETS.map((preset) => {
            const isSelected = preferences.presetKey === preset.key;
            return (
              <Grid item xs={6} sm={4} md={3} key={preset.key}>
                <Tooltip title={preset.label} arrow>
                  <Box
                    onClick={() => handlePresetSelect(preset)}
                    sx={{
                      cursor: 'pointer',
                      border: isSelected ? `3px solid ${preset.primary}` : '2px solid transparent',
                      borderRadius: 2,
                      overflow: 'hidden',
                      transition: 'all 0.2s',
                      boxShadow: isSelected ? `0 0 8px ${preset.primary}44` : 1,
                      '&:hover': {
                        boxShadow: `0 0 12px ${preset.primary}66`,
                        transform: 'translateY(-2px)',
                      },
                    }}
                  >
                    {/* Colour swatch bar */}
                    <Box sx={{ display: 'flex', height: 32 }}>
                      {preset.swatch.map((color, i) => (
                        <Box key={i} sx={{ flex: 1, backgroundColor: color }} />
                      ))}
                    </Box>
                    {/* Label + check */}
                    <Box sx={{
                      p: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      bgcolor: 'background.paper',
                    }}>
                      <Typography variant="caption" fontWeight={isSelected ? 700 : 400} noWrap>
                        {preset.label}
                      </Typography>
                      {isSelected && <CheckIcon sx={{ fontSize: 16, color: preset.primary }} />}
                    </Box>
                  </Box>
                </Tooltip>
              </Grid>
            );
          })}
        </Grid>

        <Divider sx={{ my: 2 }} />

        {/* ── Custom Colours ────────────────────────────────────────── */}
        <Typography variant="subtitle2" gutterBottom>Custom Colours</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
          Enter hex values and click Apply to use a fully custom palette.
        </Typography>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          {[
            { label: 'Primary',        value: customPrimary,   setter: setCustomPrimary },
            { label: 'Secondary',      value: customSecondary, setter: setCustomSecondary },
            { label: 'Sidebar Header', value: customHeaderBg,  setter: setCustomHeaderBg },
          ].map(({ label, value, setter }) => (
            <Grid item xs={12} sm={4} key={label}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <input
                  type="color"
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  style={{ width: 36, height: 36, border: 'none', cursor: 'pointer', borderRadius: 4 }}
                />
                <TextField
                  label={label}
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  size="small"
                  fullWidth
                  inputProps={{ maxLength: 7 }}
                />
              </Box>
            </Grid>
          ))}
        </Grid>
        <Button
          variant={isCustom ? 'contained' : 'outlined'}
          size="small"
          onClick={handleApplyCustom}
          sx={{ mb: 3 }}
        >
          Apply Custom Colours
        </Button>

        {/* ── Live Preview ──────────────────────────────────────────── */}
        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle2" gutterBottom>Preview</Typography>
        <Box sx={{
          display: 'flex', borderRadius: 2, overflow: 'hidden',
          border: '1px solid', borderColor: 'divider', height: 56, mb: 3,
        }}>
          <Box sx={{ width: 80, bgcolor: primaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="caption" sx={{ color: '#fff', fontWeight: 700 }}>Primary</Typography>
          </Box>
          <Box sx={{ flex: 1, bgcolor: effectiveMode === 'dark' ? '#1e1e1e' : '#ffffff', display: 'flex', alignItems: 'center', px: 2 }}>
            <Typography variant="body2" sx={{ color: primaryColor, fontWeight: 600 }}>
              Sample heading text
            </Typography>
          </Box>
          <Box sx={{ width: 80, bgcolor: effectiveMode === 'dark' ? '#121212' : '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="caption" color="text.secondary">BG</Typography>
          </Box>
        </Box>

        {/* ── Save Button ───────────────────────────────────────────── */}
        {saved && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Theme preferences saved to your profile!
          </Alert>
        )}
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
          onClick={handleSave}
          disabled={saving}
          fullWidth
        >
          {saving ? 'Saving…' : 'Save Theme Preferences'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ThemeCustomizer;
```

To embed in the Settings page, import and render it inside the page's Grid:

```tsx
import ThemeCustomizer from '../components/ThemeCustomizer';

// Inside your page JSX:
<Grid item xs={12}>
  <ThemeCustomizer />
</Grid>
```

---

## 8. Frontend — Navigation Integration

**File:** `frontend/src/components/Navigation.tsx`

The sidebar reads the three resolved colour values directly from the hook. The key parts to replicate:

```tsx
import { useThemePreferences } from '../context/ThemeContext';

// Inside the Navigation component:
const { primaryColor, secondaryColor, headerBgColor } = useThemePreferences();

// ── Active nav item highlight ─────────────────────────────────────────
const activeItemBg = effectiveMode === 'dark'
  ? `${primaryColor}33`   // 20 % alpha  (append hex alpha to 6-digit hex)
  : `${primaryColor}1A`;  // 10 % alpha
const activeItemHoverBg = effectiveMode === 'dark'
  ? `${primaryColor}4D`   // 30 % alpha
  : `${primaryColor}26`;  // 15 % alpha

// Render each nav item:
<ListItemButton
  sx={{
    borderLeft: isActive ? `4px solid ${primaryColor}` : '4px solid transparent',
    backgroundColor: isActive ? activeItemBg : 'transparent',
    '&:hover': { backgroundColor: activeItemHoverBg },
  }}
>
  <ListItemIcon sx={{ color: isActive ? primaryColor : secondaryColor, minWidth: 36 }}>
    <YourIcon />
  </ListItemIcon>
  <ListItemText primary="Nav Label" sx={{ '& .MuiListItemText-primary': { color: primaryColor } }} />
</ListItemButton>

// ── Drawer header ─────────────────────────────────────────────────────
<Box sx={{ backgroundColor: headerBgColor, color: primaryColor }}>
  <Typography variant="h6" sx={{ color: primaryColor }}>App Name</Typography>
</Box>

// ── Sidebar border ────────────────────────────────────────────────────
<Drawer
  sx={{
    '& .MuiDrawer-paper': {
      borderRight: `1px solid ${primaryColor}`,
    },
  }}
/>

// ── User avatar ───────────────────────────────────────────────────────
<Avatar sx={{ bgcolor: primaryColor }}>
  {initials}
</Avatar>
```

---

## 9. Consuming the Theme Hook in Any Component

Once the providers are in place, any component in the tree can access theme values:

```tsx
import { useThemePreferences } from '../context/ThemeContext';

function MyComponent() {
  const { primaryColor, secondaryColor, effectiveMode } = useThemePreferences();

  return (
    <Box
      sx={{
        borderTop: `3px solid ${primaryColor}`,
        backgroundColor: effectiveMode === 'dark' ? '#1e1e1e' : '#ffffff',
      }}
    >
      <Typography sx={{ color: primaryColor }}>Dynamic heading</Typography>
    </Box>
  );
}
```

For standard MUI colour props, just use `color="primary"` — the theme resolves it:

```tsx
<Button variant="contained" color="primary">Primary Button</Button>
<Chip label="Active" color="primary" />
<Typography color="primary">Branded text</Typography>
<CircularProgress color="primary" />
```

For `sx` props that need to react to theme changes:

```tsx
sx={{ backgroundColor: (theme) => theme.palette.background.paper }}
sx={{ borderColor: (theme) => theme.palette.primary.main }}
```

---

## 10. Adding a New Colour Preset

Edit the `COLOR_PRESETS` array in `ThemeContext.tsx`. Each entry requires:

| Field | Type | Description |
|-------|------|-------------|
| `key` | `string` | Unique identifier stored in the DB (use kebab-case) |
| `label` | `string` | Display name shown in the picker |
| `primary` | `string` | Hex — used as `palette.primary.main` |
| `secondary` | `string` | Hex — used as `palette.secondary.main` |
| `headerBg` | `string` | Hex — used as the sidebar/header background |
| `swatch` | `string[]` | Array of 3 hex values shown as preview bars in the picker card |

Example — adding a "Cobalt Steel" preset:

```tsx
{
  key: 'cobalt-steel',
  label: 'Cobalt Steel',
  primary: '#0277BD',
  secondary: '#546E7A',
  headerBg: '#37474F',
  swatch: ['#0277BD', '#546E7A', '#01579B'],
},
```

No other code changes are needed. The picker, persistence, and theme resolution all pick up the new entry automatically.

> **Existing user data is safe.** The DB stores only the `key` string. If you rename a key, update it in both the `COLOR_PRESETS` array and the DB. Never remove a key that users may have saved — rename it or add a migration that maps old keys to new ones.

---

## 11. Colour Helper Utilities

Two pure functions are exported from `ThemeContext.tsx` (they can be moved to a shared `colorUtils.ts` if needed elsewhere):

### `darkenHex(hex, amount)`

Darkens a hex colour by a fractional amount (0 = no change, 1 = black).

```typescript
// Used internally for table header backgrounds in dark mode
darkenHex('#981B1F', 0.6)  // → '#3d0b0c'
darkenHex('#1565C0', 0.15) // → '#1156a2'
```

### `hexToRgba(hex, alpha)`

Converts a 6-digit hex colour to an `rgba()` string.

```typescript
// Used for alternating table row tints
hexToRgba('#981B1F', 0.04) // → 'rgba(152, 27, 31, 0.04)'
hexToRgba('#981B1F', 0.20) // → 'rgba(152, 27, 31, 0.2)'
```

A common pattern used in the navigation sidebar is appending hex alpha directly to a 6-digit colour string:

```typescript
// Hex alpha channel (2 hex digits appended to the 6-digit colour)
`${primaryColor}33`  // 33hex = 20% opacity
`${primaryColor}1A`  // 1Ahex = 10% opacity
`${primaryColor}4D`  // 4Dhex = 30% opacity
`${primaryColor}44`  // 44hex = 26% opacity (used for box-shadow glow)
`${primaryColor}66`  // 66hex = 40% opacity (used for hover glow)
```

---

## Quick-Start Checklist

| # | Step | File(s) |
|---|------|---------|
| 1 | Run the SQL migration | `init-theme-preferences.sql` |
| 2 | Add `ThemePreferences` interface + `themePreferences` field | `backend/src/models/UserModel.ts` |
| 3 | Return `themePreferences` from `GET /api/auth/me` | `backend/src/routes/authRoutes.ts` |
| 4 | Accept `themePreferences` in `PATCH /api/auth/profile` | `backend/src/routes/authRoutes.ts` |
| 5 | Add `ThemeContext.tsx` | `frontend/src/context/ThemeContext.tsx` |
| 6 | Wrap app in `<ThemePreferencesProvider>` and wire `onUserLoaded` | `frontend/src/App.tsx` |
| 7 | Add `ThemeCustomizer.tsx` | `frontend/src/components/ThemeCustomizer.tsx` |
| 8 | Embed `<ThemeCustomizer />` in Settings/Profile page | `frontend/src/pages/SettingsPage.tsx` |
| 9 | Consume `useThemePreferences()` in Navigation | `frontend/src/components/Navigation.tsx` |
