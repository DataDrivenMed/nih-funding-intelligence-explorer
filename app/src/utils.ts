/** Logistic probability: P(x) = 1 / (1 + exp(-(b0 + b1*x))) */
export function logisticProb(x: number, beta0: number, beta1: number): number {
  return 1 / (1 + Math.exp(-(beta0 + beta1 * x)))
}

/** Generate curve points [1..50] from GLM parameters */
export function generateCurve(
  beta0: number,
  beta1: number,
): { percentile: number; probability: number }[] {
  const pts = []
  for (let x = 0.5; x <= 50; x += 0.5) {
    pts.push({ percentile: x, probability: Math.round(logisticProb(x, beta0, beta1) * 1000) / 10 })
  }
  return pts
}

export function fmt1(v: number | null | undefined): string {
  if (v == null) return 'N/A'
  return v.toFixed(1)
}

export function fmtPct(v: number | null | undefined): string {
  if (v == null) return 'N/A'
  return (v * 100).toFixed(1) + '%'
}

export function fmtDelta(v: number | null | undefined, suffix = ' pp'): string {
  if (v == null) return '—'
  const sign = v > 0 ? '+' : ''
  return `${sign}${v.toFixed(1)}${suffix}`
}

export const QUADRANT_CONFIG = {
  sharpPayline: {
    label: 'Sharp Payline',
    color: '#DC2626',
    bg: '#FEF2F2',
    border: '#FCA5A5',
    dot: '#DC2626',
  },
  competitiveProbabilistic: {
    label: 'Competitive & Probabilistic',
    color: '#D97706',
    bg: '#FFFBEB',
    border: '#FCD34D',
    dot: '#D97706',
  },
  moderateFocused: {
    label: 'Moderate & Focused',
    color: '#2563EB',
    bg: '#EFF6FF',
    border: '#93C5FD',
    dot: '#2563EB',
  },
  broadOpportunityWindow: {
    label: 'Broad Opportunity Window',
    color: '#059669',
    bg: '#ECFDF5',
    border: '#6EE7B7',
    dot: '#059669',
  },
} as const

export type QuadrantKey = keyof typeof QUADRANT_CONFIG

export const BANDS = ['1-5', '6-10', '11-15', '16-20', '21-25', '26+']

export const TRANSITION_LABELS: Record<string, string> = {
  '20to15': '20→15',
  '18to12': '18→12',
  '15to10': '15→10',
  '12to8': '12→8',
}

export const YEAR_COLORS: Record<number, string> = {
  2019: '#94A3B8',
  2021: '#60A5FA',
  2023: '#3B82F6',
  2024: '#1D4ED8',
  2025: '#DC2626',
}

// Chart style constants
export const GRID_PROPS = {
  strokeDasharray: '3 3',
  stroke: '#E2E8F0',
  vertical: false,
}

export const TOOLTIP_STYLE: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #E2E8F0',
  borderRadius: 6,
  padding: '10px 14px',
  fontSize: 12,
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
}

export const AXIS_STYLE = {
  tick: { fontSize: 11, fill: '#94A3B8' },
}

import type React from 'react'
