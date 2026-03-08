// Logistic probability from GLM parameters
export function logisticProb(percentile: number, beta0: number, beta1: number): number {
  return 1 / (1 + Math.exp(-(beta0 + beta1 * percentile)))
}

// Generate smooth curve points for the payline explorer
export function generateCurve(
  beta0: number,
  beta1: number,
  min = 1,
  max = 35,
  steps = 120,
): { percentile: number; prob: number }[] {
  const points = []
  for (let i = 0; i <= steps; i++) {
    const p = min + ((max - min) * i) / steps
    const prob = logisticProb(p, beta0, beta1) * 100
    points.push({ percentile: parseFloat(p.toFixed(2)), prob: parseFloat(prob.toFixed(2)) })
  }
  return points
}

// EEP50 median thresholds for FY2025 quadrant classification
const EEP50_MED = 10.7
const OW_MED = 9.7

export type Quadrant =
  | 'Sharp Payline'
  | 'Competitive & Probabilistic'
  | 'Moderate & Focused'
  | 'Broad Opportunity Window'

export function getQuadrant(eep50: number | null, ow: number | null): Quadrant | 'Unknown' {
  if (eep50 === null || ow === null) return 'Unknown'
  if (eep50 < EEP50_MED && ow < OW_MED) return 'Sharp Payline'
  if (eep50 < EEP50_MED && ow >= OW_MED) return 'Competitive & Probabilistic'
  if (eep50 >= EEP50_MED && ow < OW_MED) return 'Moderate & Focused'
  return 'Broad Opportunity Window'
}

export const QUADRANT_COLORS: Record<string, string> = {
  'Sharp Payline': '#dc2626',
  'Competitive & Probabilistic': '#ea580c',
  'Moderate & Focused': '#2563eb',
  'Broad Opportunity Window': '#059669',
  Unknown: '#9ca3af',
}

export const QUADRANT_BG: Record<string, string> = {
  'Sharp Payline': 'bg-red-100 text-red-800 border-red-300',
  'Competitive & Probabilistic': 'bg-orange-100 text-orange-800 border-orange-300',
  'Moderate & Focused': 'bg-blue-100 text-blue-800 border-blue-300',
  'Broad Opportunity Window': 'bg-emerald-100 text-emerald-800 border-emerald-300',
  Unknown: 'bg-gray-100 text-gray-600 border-gray-300',
}

// Band midpoints for plotting
export const BAND_MIDPOINTS: Record<string, number> = {
  '1-5': 3,
  '6-10': 8,
  '11-15': 13,
  '16-20': 18,
  '21-25': 23,
  '26+': 30,
}

export const BAND_ORDER = ['1-5', '6-10', '11-15', '16-20', '21-25', '26+']

// Format helpers
export function fmt(n: number | null | undefined, decimals = 1): string {
  if (n === null || n === undefined) return 'N/A'
  return n.toFixed(decimals)
}

export function fmtPct(n: number | null | undefined, decimals = 1): string {
  if (n === null || n === undefined) return 'N/A'
  return `${(n * 100).toFixed(decimals)}%`
}

export function fmtSign(n: number | null | undefined, decimals = 1): string {
  if (n === null || n === undefined) return 'N/A'
  return n >= 0 ? `+${n.toFixed(decimals)}` : n.toFixed(decimals)
}

// Color ramp for heatmap-style encoding
export function redGreenColor(value: number, min: number, max: number): string {
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)))
  // Red (low) → yellow → green (high)
  const r = Math.round(220 - t * 170)
  const g = Math.round(80 + t * 120)
  const b = Math.round(70)
  return `rgb(${r},${g},${b})`
}

// All institutes in display order (exclude ALL NIH for IC-level views)
export const ALL_INSTITUTES = [
  'NCI', 'NEI', 'NHGRI', 'NHLBI', 'NIA', 'NIAAA', 'NIAID', 'NIAMS',
  'NICHD', 'NIDA', 'NIDCD', 'NIDCR', 'NIDDK', 'NIGMS', 'NIMH',
  'NIMHD', 'NINDS', 'NINR', 'NLM',
]

export const ALL_YEARS = [2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]

// Recharts Y-axis tick formatter
export function pctTick(v: number) {
  return `${v}%`
}
