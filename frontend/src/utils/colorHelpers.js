/**
 * Color helper utilities for theme customization.
 * Pure functions for dynamic color manipulation.
 */

/**
 * Darken a hex color by a given percentage.
 * @param {string} hex - Hex color string (e.g. '#1565c0')
 * @param {number} amount - Percentage to darken (0-100)
 * @returns {string} Darkened hex color
 */
export function darkenHex(hex, amount) {
  const num = parseInt(hex.replace('#', ''), 16);
  const factor = 1 - amount / 100;
  const r = Math.max(0, Math.round(((num >> 16) & 0xff) * factor));
  const g = Math.max(0, Math.round(((num >> 8) & 0xff) * factor));
  const b = Math.max(0, Math.round((num & 0xff) * factor));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/**
 * Convert a hex color to an rgba() string.
 * @param {string} hex - Hex color string (e.g. '#1565c0')
 * @param {number} alpha - Opacity (0-1)
 * @returns {string} CSS rgba() string
 */
export function hexToRgba(hex, alpha = 1) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Lighten a hex color by a given percentage.
 * @param {string} hex - Hex color string
 * @param {number} amount - Percentage to lighten (0-100)
 * @returns {string} Lightened hex color
 */
export function lightenHex(hex, amount) {
  const num = parseInt(hex.replace('#', ''), 16);
  const factor = amount / 100;
  const r = Math.min(255, Math.round(((num >> 16) & 0xff) + (255 - ((num >> 16) & 0xff)) * factor));
  const g = Math.min(255, Math.round(((num >> 8) & 0xff) + (255 - ((num >> 8) & 0xff)) * factor));
  const b = Math.min(255, Math.round((num & 0xff) + (255 - (num & 0xff)) * factor));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/**
 * Determine if a color is light or dark (for contrast decisions).
 * @param {string} hex - Hex color string
 * @returns {boolean} true if the color is considered "light"
 */
export function isLightColor(hex) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  // Relative luminance approximation
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}
