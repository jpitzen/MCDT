-- Migration: add-theme-preferences
-- Date: 2026-03-03
-- Phase 1: Theme Customization

ALTER TABLE users ADD COLUMN IF NOT EXISTS theme_preferences JSONB DEFAULT NULL;

COMMENT ON COLUMN users.theme_preferences IS 'Per-user theme settings: { mode, presetKey, customPrimary, customSecondary, customHeaderBg }';
