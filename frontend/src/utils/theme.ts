import type { AccentColor, ThemeMode, UserPreferences } from '../types/auth'

// ---------------------------------------------------------------------------
// Accent palettes — dark and light variants
// ---------------------------------------------------------------------------

type AccentVars = { main: string; soft: string; border: string }

const ACCENTS: Record<AccentColor, { dark: AccentVars; light: AccentVars }> = {
  indigo: {
    dark:  { main: '#b9c4ff', soft: '#232632', border: '#2f3450' },
    light: { main: '#6366f1', soft: '#eef2ff', border: '#c7d2fe' },
  },
  emerald: {
    dark:  { main: '#6ee7b7', soft: '#1a2e25', border: '#1e3d2e' },
    light: { main: '#10b981', soft: '#ecfdf5', border: '#a7f3d0' },
  },
  amber: {
    dark:  { main: '#fcd34d', soft: '#2d2610', border: '#3d3413' },
    light: { main: '#f59e0b', soft: '#fffbeb', border: '#fde68a' },
  },
  rose: {
    dark:  { main: '#fda4af', soft: '#2e1a1e', border: '#3d1e24' },
    light: { main: '#f43f5e', soft: '#fff1f2', border: '#fecdd3' },
  },
  sky: {
    dark:  { main: '#7dd3fc', soft: '#1a2733', border: '#1e3340' },
    light: { main: '#0ea5e9', soft: '#f0f9ff', border: '#bae6fd' },
  },
  slate: {
    dark:  { main: '#94a3b8', soft: '#1e2430', border: '#252e3f' },
    light: { main: '#64748b', soft: '#f8fafc', border: '#cbd5e1' },
  },
}

// ---------------------------------------------------------------------------
// Base theme colours
// ---------------------------------------------------------------------------

const THEME_VARS: Record<ThemeMode, Record<string, string>> = {
  dark: {
    '--color-bg':           '#151515',
    '--color-panel':        '#1b1b1b',
    '--color-surface':      '#212121',
    '--color-border':       '#2b2b2b',
    '--color-text':         '#f1f1f1',
    '--color-muted':        '#a4a4a4',
    'color-scheme':         'dark',
  },
  light: {
    '--color-bg':           '#f0f0f2',
    '--color-panel':        '#ffffff',
    '--color-surface':      '#f5f5f7',
    '--color-border':       '#e2e2e7',
    '--color-text':         '#1a1a1a',
    '--color-muted':        '#6b7280',
    'color-scheme':         'light',
  },
}

// ---------------------------------------------------------------------------
// Apply theme to document root
// ---------------------------------------------------------------------------

export function applyTheme(prefs: Pick<UserPreferences, 'theme' | 'accent'>): void {
  const root = document.documentElement
  const { theme, accent } = prefs

  // Base colours
  const vars = THEME_VARS[theme] ?? THEME_VARS.dark
  for (const [key, value] of Object.entries(vars)) {
    if (key === 'color-scheme') {
      root.style.setProperty('color-scheme', value)
    } else {
      root.style.setProperty(key, value)
    }
  }

  // Accent colours
  const palette = (ACCENTS[accent] ?? ACCENTS.indigo)[theme] ?? (ACCENTS[accent] ?? ACCENTS.indigo).dark
  root.style.setProperty('--color-accent',        palette.main)
  root.style.setProperty('--color-accent-soft',   palette.soft)
  root.style.setProperty('--color-accent-border', palette.border)

  // Data attribute for any CSS selectors that need it
  root.setAttribute('data-theme', theme)
  root.setAttribute('data-accent', accent)
}

// ---------------------------------------------------------------------------
// Accent label map (for display)
// ---------------------------------------------------------------------------

export const ACCENT_LABELS: Record<AccentColor, string> = {
  indigo:  'Indigo',
  emerald: 'Emerald',
  amber:   'Amber',
  rose:    'Rose',
  sky:     'Sky',
  slate:   'Slate',
}

// Swatch preview colour (always the dark-mode main for consistency in swatches)
export const ACCENT_SWATCHES: Record<AccentColor, string> = {
  indigo:  '#b9c4ff',
  emerald: '#6ee7b7',
  amber:   '#fcd34d',
  rose:    '#fda4af',
  sky:     '#7dd3fc',
  slate:   '#94a3b8',
}
