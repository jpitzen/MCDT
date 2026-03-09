import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { createTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { darkenHex, hexToRgba } from '../utils/colorHelpers';

// ─── Color Presets ───────────────────────────────────────────────────
export const COLOR_PRESETS = [
  { key: 'castle-red',    label: 'Castle Red',    primary: '#c62828', secondary: '#ff5252', headerBg: '#1a1a2e' },
  { key: 'ocean-blue',    label: 'Ocean Blue',    primary: '#1565c0', secondary: '#42a5f5', headerBg: '#0d1b2a' },
  { key: 'forest-green',  label: 'Forest Green',  primary: '#2e7d32', secondary: '#66bb6a', headerBg: '#1b2d1b' },
  { key: 'royal-purple',  label: 'Royal Purple',  primary: '#6a1b9a', secondary: '#ab47bc', headerBg: '#1a1a2e' },
  { key: 'midnight',      label: 'Midnight',      primary: '#263238', secondary: '#546e7a', headerBg: '#0d1117' },
  { key: 'sunset-orange', label: 'Sunset Orange', primary: '#e65100', secondary: '#ff9800', headerBg: '#1a120d' },
  { key: 'teal-wave',     label: 'Teal Wave',     primary: '#00695c', secondary: '#26a69a', headerBg: '#0d1b1a' },
  { key: 'neon-red',      label: 'Neon Red',      primary: '#d50000', secondary: '#ff1744', headerBg: '#1a0d0d' },
];

const DEFAULT_PREFERENCES = {
  mode: 'system',
  presetKey: 'ocean-blue',
  customPrimary: null,
  customSecondary: null,
  customHeaderBg: null,
};

const STORAGE_KEY = 'zl-mcdt-theme-prefs';

// ─── Helpers ─────────────────────────────────────────────────────────
function resolveColors(preferences) {
  if (preferences.presetKey === 'custom') {
    return {
      primary: preferences.customPrimary || '#1565c0',
      secondary: preferences.customSecondary || '#42a5f5',
      headerBg: preferences.customHeaderBg || '#0d1b2a',
    };
  }
  const preset = COLOR_PRESETS.find((p) => p.key === preferences.presetKey);
  if (!preset) {
    const fallback = COLOR_PRESETS[1]; // ocean-blue
    return { primary: fallback.primary, secondary: fallback.secondary, headerBg: fallback.headerBg };
  }
  return { primary: preset.primary, secondary: preset.secondary, headerBg: preset.headerBg };
}

function readFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_PREFERENCES, ...parsed };
    }
  } catch {
    // corrupt storage — fall through
  }
  return { ...DEFAULT_PREFERENCES };
}

function writeToStorage(prefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // quota exceeded — ignore
  }
}

// ─── Context ─────────────────────────────────────────────────────────
const ThemePreferencesContext = createContext(null);

export function useThemePreferences() {
  const ctx = useContext(ThemePreferencesContext);
  if (!ctx) {
    throw new Error('useThemePreferences must be used within ThemePreferencesProvider');
  }
  return ctx;
}

// ─── Provider ────────────────────────────────────────────────────────
export function ThemePreferencesProvider({ children }) {
  const prefersDarkOS = useMediaQuery('(prefers-color-scheme: dark)');
  const [preferences, setPreferencesState] = useState(readFromStorage);

  // Resolve effective display mode
  const effectiveMode = useMemo(() => {
    if (preferences.mode === 'system') {
      return prefersDarkOS ? 'dark' : 'light';
    }
    return preferences.mode;
  }, [preferences.mode, prefersDarkOS]);

  // Resolve active colors from preset / custom
  const colors = useMemo(() => resolveColors(preferences), [preferences]);

  // Build MUI theme
  const theme = useMemo(() => {
    const isDark = effectiveMode === 'dark';
    return createTheme({
      palette: {
        mode: effectiveMode,
        primary: {
          main: colors.primary,
          light: isDark ? colors.secondary : undefined,
          dark: darkenHex(colors.primary, 20),
        },
        secondary: {
          main: colors.secondary,
          dark: darkenHex(colors.secondary, 20),
        },
        background: {
          default: isDark ? '#121212' : '#f5f5f5',
          paper: isDark ? '#1e1e1e' : '#ffffff',
        },
        text: {
          primary: isDark ? '#ffffff' : 'rgba(0, 0, 0, 0.87)',
          secondary: isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
        },
      },
      typography: {
        fontFamily: [
          'Roboto', '-apple-system', 'BlinkMacSystemFont',
          '"Segoe UI"', 'Arial', 'sans-serif',
        ].join(','),
        h1: { fontSize: '2.5rem', fontWeight: 500 },
        h2: { fontSize: '2rem', fontWeight: 500 },
        h3: { fontSize: '1.75rem', fontWeight: 500 },
      },
      components: {
        MuiButton: {
          styleOverrides: { root: { textTransform: 'none', borderRadius: 8 } },
        },
        MuiCard: {
          styleOverrides: {
            root: {
              borderRadius: 12,
              boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.5)' : '0 2px 8px rgba(0,0,0,0.1)',
            },
          },
        },
        MuiTableHead: {
          styleOverrides: {
            root: {
              '& .MuiTableCell-head': {
                backgroundColor: hexToRgba(colors.primary, isDark ? 0.25 : 0.1),
                fontWeight: 600,
              },
            },
          },
        },
        MuiTableRow: {
          styleOverrides: {
            root: {
              '&:nth-of-type(even)': {
                backgroundColor: hexToRgba(colors.primary, isDark ? 0.05 : 0.03),
              },
            },
          },
        },
      },
    });
  }, [effectiveMode, colors]);

  // Set preferences — write to localStorage immediately
  const setPreferences = useCallback((update) => {
    setPreferencesState((prev) => {
      const next = typeof update === 'function' ? update(prev) : { ...prev, ...update };
      writeToStorage(next);
      return next;
    });
  }, []);

  // Persist to server (called after save)
  const persistToServer = useCallback(async () => {
    const token = localStorage.getItem('authToken');
    if (!token) return;
    try {
      const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      await fetch(`${baseUrl}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ themePreferences: preferences }),
      });
    } catch (err) {
      console.warn('[Theme] Failed to persist to server:', err.message);
    }
  }, [preferences]);

  // Load from server (called on login)
  const loadFromServer = useCallback(async () => {
    const token = localStorage.getItem('authToken');
    if (!token) return;
    try {
      const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${baseUrl}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        const serverPrefs = json?.data?.user?.themePreferences;
        if (serverPrefs && typeof serverPrefs === 'object') {
          const merged = { ...DEFAULT_PREFERENCES, ...serverPrefs };
          setPreferencesState(merged);
          writeToStorage(merged);
        }
      }
    } catch (err) {
      console.warn('[Theme] Failed to load from server:', err.message);
    }
  }, []);

  // On mount: try loading from server if user is authenticated
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      loadFromServer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const contextValue = useMemo(
    () => ({
      preferences,
      setPreferences,
      persistToServer,
      loadFromServer,
      colors,
      effectiveMode,
      theme,
    }),
    [preferences, setPreferences, persistToServer, loadFromServer, colors, effectiveMode, theme]
  );

  return (
    <ThemePreferencesContext.Provider value={contextValue}>
      {children}
    </ThemePreferencesContext.Provider>
  );
}
