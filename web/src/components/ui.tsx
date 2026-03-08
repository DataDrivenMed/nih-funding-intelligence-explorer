/**
 * Shared executive UI primitives.
 * ChartCard, ControlRow, Pill, MetricCard, Divider, SectionHeader
 */
import type { ReactNode } from 'react'

// ── ChartCard ────────────────────────────────────────────────────────────────
interface ChartCardProps {
  title: string
  subtitle?: string
  footnote?: string
  legend?: ReactNode
  className?: string
  children: ReactNode
}

export function ChartCard({ title, subtitle, footnote, legend, className = '', children }: ChartCardProps) {
  return (
    <div className={`card ${className}`}>
      <div className="px-6 pt-6 pb-1">
        <div className="text-label">{title}</div>
        {subtitle && <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>}
        {legend && <div className="mt-3">{legend}</div>}
      </div>
      <div className="px-6 pt-3 pb-4">
        {children}
      </div>
      {footnote && (
        <div className="px-6 py-3 border-t border-gray-50 text-xs text-gray-400">
          {footnote}
        </div>
      )}
    </div>
  )
}

// ── ControlRow ───────────────────────────────────────────────────────────────
interface ControlRowProps {
  children: ReactNode
  className?: string
}

export function ControlRow({ children, className = '' }: ControlRowProps) {
  return (
    <div className={`flex flex-wrap items-center gap-4 ${className}`}>
      {children}
    </div>
  )
}

// ── ExecSelect ───────────────────────────────────────────────────────────────
interface ExecSelectProps {
  label: string
  value: string | number
  onChange: (v: string) => void
  options: { value: string | number; label: string }[]
}

export function ExecSelect({ label, value, onChange, options }: ExecSelectProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-gray-500 whitespace-nowrap">{label}</span>
      <select
        className="exec-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

// ── ToggleGroup ──────────────────────────────────────────────────────────────
interface ToggleGroupProps<T extends string> {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}

export function ToggleGroup<T extends string>({ options, value, onChange }: ToggleGroupProps<T>) {
  return (
    <div className="flex rounded-lg border border-gray-200 overflow-hidden bg-white">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 text-xs font-medium transition-colors ${
            value === o.value
              ? 'bg-gray-900 text-white'
              : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ── Pill ─────────────────────────────────────────────────────────────────────
interface PillProps {
  label: string
  className?: string
}

export function Pill({ label, className = '' }: PillProps) {
  return (
    <span className={`inline-block text-xs px-2 py-0.5 rounded-full border font-medium ${className}`}>
      {label}
    </span>
  )
}

// ── MetricCard ───────────────────────────────────────────────────────────────
interface MetricCardProps {
  label: string
  value: string
  delta?: string | null
  deltaDown?: boolean
  note?: string
  alert?: boolean
}

export function MetricCard({ label, value, delta, deltaDown, note, alert }: MetricCardProps) {
  return (
    <div className="card p-5">
      <div className="text-label mb-2">{label}</div>
      <div className={`text-2xl font-bold leading-none ${alert ? 'text-red-700' : 'text-gray-900'}`}>
        {value}
      </div>
      {delta && (
        <div className={`mt-1.5 text-xs font-medium ${deltaDown ? 'text-red-600' : 'text-emerald-600'}`}>
          {delta}
        </div>
      )}
      {note && <div className="mt-1 text-xs text-gray-400 leading-tight">{note}</div>}
    </div>
  )
}

// ── ChartLegend ──────────────────────────────────────────────────────────────
interface LegendItem {
  color: string
  label: string
  dashed?: boolean
}

interface ChartLegendProps {
  items: LegendItem[]
}

export function ChartLegend({ items }: ChartLegendProps) {
  return (
    <div className="flex flex-wrap gap-4">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <div className="flex items-center" style={{ width: 20, height: 12 }}>
            <svg width="20" height="12">
              <line
                x1="0" y1="6" x2="20" y2="6"
                stroke={item.color}
                strokeWidth={item.dashed ? 1.5 : 2}
                strokeDasharray={item.dashed ? '4 3' : undefined}
              />
            </svg>
          </div>
          <span className="text-xs text-gray-500">{item.label}</span>
        </div>
      ))}
    </div>
  )
}
