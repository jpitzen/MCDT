import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardActionArea,
  CardContent,
  Button,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Snackbar,
  Alert,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  DarkMode as DarkIcon,
  LightMode as LightIcon,
  SettingsBrightness as SystemIcon,
  Check as CheckIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { useThemePreferences, COLOR_PRESETS } from '../contexts/ThemeContext';
import { darkenHex } from '../utils/colorHelpers';

function SwatchBar({ primary, secondary, headerBg }) {
  return (
    <Box sx={{ display: 'flex', height: 32, borderRadius: 1, overflow: 'hidden' }}>
      <Box sx={{ flex: 1, bgcolor: headerBg }} />
      <Box sx={{ flex: 1, bgcolor: primary }} />
      <Box sx={{ flex: 1, bgcolor: secondary }} />
    </Box>
  );
}

export default function ThemeCustomizer() {
  const { preferences, setPreferences, persistToServer, colors } = useThemePreferences();
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Local draft state for custom colors (only committed on preset change or save)
  const [customPrimary, setCustomPrimary] = useState(preferences.customPrimary || '#1565c0');
  const [customSecondary, setCustomSecondary] = useState(preferences.customSecondary || '#42a5f5');
  const [customHeaderBg, setCustomHeaderBg] = useState(preferences.customHeaderBg || '#0d1b2a');

  const isCustom = preferences.presetKey === 'custom';

  // Preview colors: what the user will see before saving
  const previewColors = useMemo(() => {
    if (isCustom) {
      return { primary: customPrimary, secondary: customSecondary, headerBg: customHeaderBg };
    }
    return colors;
  }, [isCustom, customPrimary, customSecondary, customHeaderBg, colors]);

  const handleModeChange = (_event, newMode) => {
    if (newMode !== null) {
      setPreferences({ mode: newMode });
    }
  };

  const handlePresetSelect = (presetKey) => {
    if (presetKey === 'custom') {
      setPreferences({
        presetKey: 'custom',
        customPrimary: customPrimary,
        customSecondary: customSecondary,
        customHeaderBg: customHeaderBg,
      });
    } else {
      setPreferences({ presetKey });
    }
  };

  const handleCustomColorChange = (field, value) => {
    if (field === 'customPrimary') setCustomPrimary(value);
    if (field === 'customSecondary') setCustomSecondary(value);
    if (field === 'customHeaderBg') setCustomHeaderBg(value);

    // Live-update if already in custom mode
    if (isCustom) {
      setPreferences({ [field]: value });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await persistToServer();
      setSnackbar({ open: true, message: 'Theme preferences saved!', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Failed to save theme preferences', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 800 }}>
      {/* ── Display Mode ─────────────────────────────────────────── */}
      <Typography variant="h6" gutterBottom>
        Display Mode
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Choose how the application appears. "System" follows your operating system preference.
      </Typography>
      <ToggleButtonGroup
        value={preferences.mode}
        exclusive
        onChange={handleModeChange}
        sx={{ mb: 4 }}
      >
        <ToggleButton value="light" sx={{ px: 3 }}>
          <LightIcon sx={{ mr: 1 }} /> Light
        </ToggleButton>
        <ToggleButton value="dark" sx={{ px: 3 }}>
          <DarkIcon sx={{ mr: 1 }} /> Dark
        </ToggleButton>
        <ToggleButton value="system" sx={{ px: 3 }}>
          <SystemIcon sx={{ mr: 1 }} /> System
        </ToggleButton>
      </ToggleButtonGroup>

      <Divider sx={{ my: 3 }} />

      {/* ── Color Presets ────────────────────────────────────────── */}
      <Typography variant="h6" gutterBottom>
        Color Theme
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Select a color preset or define custom colors below.
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {COLOR_PRESETS.map((preset) => {
          const selected = preferences.presetKey === preset.key;
          return (
            <Grid item xs={6} sm={4} md={3} key={preset.key}>
              <Card
                variant={selected ? 'elevation' : 'outlined'}
                sx={{
                  border: selected ? `2px solid ${preset.primary}` : undefined,
                  position: 'relative',
                }}
              >
                <CardActionArea onClick={() => handlePresetSelect(preset.key)}>
                  <CardContent sx={{ p: 1.5 }}>
                    <SwatchBar primary={preset.primary} secondary={preset.secondary} headerBg={preset.headerBg} />
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                      {selected && <CheckIcon color="primary" sx={{ fontSize: 16, mr: 0.5 }} />}
                      <Typography variant="caption" noWrap>{preset.label}</Typography>
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          );
        })}
        {/* Custom option */}
        <Grid item xs={6} sm={4} md={3}>
          <Card
            variant={isCustom ? 'elevation' : 'outlined'}
            sx={{
              border: isCustom ? `2px solid ${customPrimary}` : undefined,
            }}
          >
            <CardActionArea onClick={() => handlePresetSelect('custom')}>
              <CardContent sx={{ p: 1.5 }}>
                <SwatchBar primary={customPrimary} secondary={customSecondary} headerBg={customHeaderBg} />
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                  {isCustom && <CheckIcon color="primary" sx={{ fontSize: 16, mr: 0.5 }} />}
                  <Typography variant="caption">Custom</Typography>
                </Box>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>
      </Grid>

      {/* ── Custom Colors (visible when custom is selected) ────── */}
      {isCustom && (
        <Box sx={{ mb: 4, p: 2, borderRadius: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>Custom Colors</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Tooltip title="Click to pick color">
                  <input
                    type="color"
                    value={customPrimary}
                    onChange={(e) => handleCustomColorChange('customPrimary', e.target.value)}
                    style={{ width: 40, height: 40, border: 'none', cursor: 'pointer', borderRadius: 4 }}
                  />
                </Tooltip>
                <TextField
                  size="small"
                  label="Primary"
                  value={customPrimary}
                  onChange={(e) => handleCustomColorChange('customPrimary', e.target.value)}
                  inputProps={{ maxLength: 7 }}
                  sx={{ flex: 1 }}
                />
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Tooltip title="Click to pick color">
                  <input
                    type="color"
                    value={customSecondary}
                    onChange={(e) => handleCustomColorChange('customSecondary', e.target.value)}
                    style={{ width: 40, height: 40, border: 'none', cursor: 'pointer', borderRadius: 4 }}
                  />
                </Tooltip>
                <TextField
                  size="small"
                  label="Secondary"
                  value={customSecondary}
                  onChange={(e) => handleCustomColorChange('customSecondary', e.target.value)}
                  inputProps={{ maxLength: 7 }}
                  sx={{ flex: 1 }}
                />
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Tooltip title="Click to pick color">
                  <input
                    type="color"
                    value={customHeaderBg}
                    onChange={(e) => handleCustomColorChange('customHeaderBg', e.target.value)}
                    style={{ width: 40, height: 40, border: 'none', cursor: 'pointer', borderRadius: 4 }}
                  />
                </Tooltip>
                <TextField
                  size="small"
                  label="Header BG"
                  value={customHeaderBg}
                  onChange={(e) => handleCustomColorChange('customHeaderBg', e.target.value)}
                  inputProps={{ maxLength: 7 }}
                  sx={{ flex: 1 }}
                />
              </Box>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* ── Live Preview ─────────────────────────────────────────── */}
      <Typography variant="subtitle2" sx={{ mb: 1 }}>Preview</Typography>
      <Box
        sx={{
          display: 'flex',
          borderRadius: 2,
          overflow: 'hidden',
          height: 48,
          mb: 4,
          boxShadow: 1,
        }}
      >
        <Box
          sx={{
            width: 200,
            background: `linear-gradient(135deg, ${previewColors.headerBg}, ${darkenHex(previewColors.headerBg, 20)})`,
            display: 'flex',
            alignItems: 'center',
            px: 2,
          }}
        >
          <Typography variant="caption" sx={{ color: '#fff', fontWeight: 600 }}>Sidebar</Typography>
        </Box>
        <Box
          sx={{
            flex: 1,
            bgcolor: previewColors.primary,
            display: 'flex',
            alignItems: 'center',
            px: 2,
          }}
        >
          <Typography variant="caption" sx={{ color: '#fff', fontWeight: 600 }}>App Bar</Typography>
        </Box>
        <Box
          sx={{
            width: 120,
            bgcolor: previewColors.secondary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography variant="caption" sx={{ color: '#fff', fontWeight: 600 }}>Accent</Typography>
        </Box>
      </Box>

      {/* ── Save Button ──────────────────────────────────────────── */}
      <Button
        variant="contained"
        startIcon={<SaveIcon />}
        onClick={handleSave}
        disabled={saving}
        size="large"
      >
        {saving ? 'Saving...' : 'Save Theme Preferences'}
      </Button>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        Theme changes apply instantly. Saving persists your preferences to the server so they sync across devices.
      </Typography>

      {/* ── Snackbar ─────────────────────────────────────────────── */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
