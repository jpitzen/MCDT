# Theme Customization Guide

ZL-MCDT supports visual theming so you can personalize the interface or match your organization's branding. Theme settings are saved to your user profile and persist across browser sessions.

---

## Accessing Theme Settings

There are two ways to change the theme:

### Quick Toggle — Display Mode

Click the **theme cycle icon** in the top-right of the app bar to cycle through display modes:
- ☀️ **Light** → 🌙 **Dark** → 🖥️ **System** → ☀️ Light …

### Full Customization — System Admin

1. Navigate to **System Admin** (gear icon in the sidebar)
2. Click the **Appearance** tab
3. All theme options are available in a single panel

> **Note**: Any user can access their own theme settings. Admin users see additional application-wide defaults.

---

## Display Mode

| Mode | Behavior |
|------|----------|
| **Light** | White/light backgrounds, dark text |
| **Dark** | Dark backgrounds, light text — easier on the eyes in low-light environments |
| **System** | Automatically matches your operating system's light/dark preference (via `prefers-color-scheme` media query) |

The current mode is reflected instantly — no page reload needed.

---

## Color Presets

ZL-MCDT ships with several built-in color presets. Select one to instantly apply a coordinated color scheme:

| Preset | Primary | Secondary | Notes |
|--------|---------|-----------|-------|
| **Default** | Blue (#1976d2) | Purple (#9c27b0) | Standard Material UI |
| **Ocean** | Teal | Cyan | Cool, calming palette |
| **Forest** | Green | Lime | Nature-inspired |
| **Sunset** | Orange | Deep Orange | Warm tones |
| **Corporate** | Indigo | Grey | Professional / understated |

Click on a preset tile to preview it. Changes are applied immediately and auto-saved.

---

## Custom Colors

For full control, use the custom color picker. You can customize:

| Property | What it affects |
|----------|----------------|
| **Primary Color** | Buttons, active tabs, links, primary actions |
| **Secondary Color** | Floating action buttons, secondary highlights, selected items |
| **Header Color** | App bar (top navigation bar) background |

### How to set a custom color

1. In the Appearance tab, choose **Custom** from the preset list
2. Click the color swatch next to any property
3. Use the color picker or paste a hex code (e.g. `#E53935`)
4. The UI updates in real-time — adjust until satisfied

### Tips

- Choose a **primary color** with enough contrast against white (light mode) and dark grey (dark mode) backgrounds
- Use [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) to verify accessibility
- If the header color is left unset, it defaults to the primary color

---

## Theme Persistence

Themes are stored per-user in the database:

- Settings persist across browsers and devices (tied to your account, not local storage)
- Changes save automatically — no "Save" button needed
- If you clear your browser or log in from a new machine, your theme is restored on login

### Reset to Defaults

To return to the default theme:
1. Go to System Admin → Appearance
2. Click the **Default** preset
3. Set display mode to **System**

---

## FAQ

**Q: Does my theme affect other users?**
No. Each user has their own theme settings. Changing your theme has no effect on other accounts.

**Q: Can an admin set a default theme for new users?**
Not currently. New users start with the Default preset in System display mode. They can customize from there.

**Q: I set a dark primary color and can't read the header text — what do I do?**
The header text is always white. Choose a primary/header color that contrasts well with white text. If the UI is unusable, log in from an incognito window (which starts with the default theme) and reset via System Admin → Appearance.

**Q: Does the theme apply to printed pages?**
Browser print typically uses its own styling. The theme primarily affects on-screen display.
