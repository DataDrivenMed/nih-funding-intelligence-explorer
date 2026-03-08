/**
 * Shared chart styling constants and color palette.
 * Import from any section component for consistent chart appearance.
 */

// ── Color palette ────────────────────────────────────────────────────────────
export const C = {
  // Primary accent
  BLUE:       '#2563EB',
  BLUE_LT:    '#93C5FD',
  BLUE_BG:    '#EFF6FF',

  // Neutral
  SLATE:      '#64748B',
  SLATE_LT:   '#94A3B8',
  SLATE_XLT:  '#CBD5E1',

  // Status
  RED:        '#DC2626',
  AMBER:      '#D97706',
  GREEN:      '#059669',

  // Additional series (for multi-line charts)
  INDIGO:     '#4F46E5',
  TEAL:       '#0D9488',

  // Nav / header
  NAVY:       '#1E2D4E',
} as const

// ── Year series colors (for multi-year band charts) ──────────────────────────
export const YEAR_COLORS: Record<number, string> = {
  2014: '#D1D5DB',
  2015: '#D1D5DB',
  2016: '#D1D5DB',
  2017: '#D1D5DB',
  2018: '#D1D5DB',
  2019: '#94A3B8',   // baseline reference
  2020: '#9CA3AF',
  2021: '#9CA3AF',
  2022: '#6B7280',
  2023: '#6B7280',
  2024: '#2563EB',   // recent
  2025: '#DC2626',   // current / alert
}

// ── Quadrant palette (muted, professional) ───────────────────────────────────
export const QUADRANT_COLORS: Record<string, string> = {
  'Sharp Payline':             '#991B1B',
  'Competitive & Probabilistic': '#92400E',
  'Moderate & Focused':        '#1E3A8A',
  'Broad Opportunity Window':  '#065F46',
  'Unknown':                   '#6B7280',
}

export const QUADRANT_PILL: Record<string, string> = {
  'Sharp Payline':             'bg-red-50 text-red-800 border-red-200',
  'Competitive & Probabilistic': 'bg-amber-50 text-amber-800 border-amber-200',
  'Moderate & Focused':        'bg-blue-50 text-blue-800 border-blue-200',
  'Broad Opportunity Window':  'bg-emerald-50 text-emerald-800 border-emerald-200',
  'Unknown':                   'bg-gray-50 text-gray-600 border-gray-200',
}

// ── Recharts axis & grid defaults (spread onto components) ──────────────────
export const GRID_PROPS = {
  vertical: false,
  stroke: '#F3F4F6',
  strokeDasharray: '0',
} as const

export const X_AXIS_PROPS = {
  tick: { fontSize: 11, fill: '#9CA3AF' },
  axisLine: { stroke: '#E5E7EB' },
  tickLine: false,
} as const

export const Y_AXIS_PROPS = {
  tick: { fontSize: 11, fill: '#9CA3AF' },
  axisLine: false,
  tickLine: false,
} as const

/** Spread onto <Tooltip contentStyle={...} /> */
export const TOOLTIP_STYLE = {
  background: '#ffffff',
  border: '1px solid #E5E7EB',
  borderRadius: '8px',
  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
  fontSize: '12px',
  padding: '10px 14px',
  lineHeight: '1.6',
} as const

/** Cursor line style for line/bar charts */
export const TOOLTIP_CURSOR = {
  stroke: '#F3F4F6',
  strokeWidth: 2,
} as const
