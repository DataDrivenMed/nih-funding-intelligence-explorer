import type { ReactNode } from 'react'

// ── MetricCard ────────────────────────────────────────────────────────────────
interface MetricCardProps {
  label: string
  value: string
  delta?: string
  deltaDown?: boolean
  note?: string
  alert?: boolean
  wide?: boolean
}

export function MetricCard({ label, value, delta, deltaDown, note, alert }: MetricCardProps) {
  return (
    <div className={`card p-4 ${alert ? 'border-l-4 border-l-red-500' : ''}`}>
      <div className="text-label mb-1">{label}</div>
      <div className={`text-2xl font-bold tabular-nums ${alert ? 'text-red-600' : 'text-slate-800'}`}>
        {value}
      </div>
      {delta && (
        <div className={`text-xs font-medium mt-1 ${deltaDown ? 'text-red-500' : 'text-emerald-600'}`}>
          {delta}
        </div>
      )}
      {note && <div className="text-xs text-slate-400 mt-1">{note}</div>}
    </div>
  )
}

// ── ChartCard ─────────────────────────────────────────────────────────────────
interface ChartCardProps {
  title: string
  subtitle?: string
  footnote?: string
  controls?: ReactNode
  children: ReactNode
}

export function ChartCard({ title, subtitle, footnote, controls, children }: ChartCardProps) {
  return (
    <div className="card overflow-hidden">
      <div className="px-5 pt-4 pb-3 border-b border-slate-100">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="font-semibold text-slate-800 text-sm">{title}</div>
            {subtitle && <div className="text-xs text-slate-400 mt-0.5">{subtitle}</div>}
          </div>
          {controls && <div className="flex items-center gap-2 flex-shrink-0">{controls}</div>}
        </div>
      </div>
      <div className="p-4">{children}</div>
      {footnote && (
        <div className="px-5 pb-3 text-xs text-slate-400">{footnote}</div>
      )}
    </div>
  )
}

// ── InsightPanel ──────────────────────────────────────────────────────────────
interface InsightPanelProps {
  dataInsight: string
  interpretation: string
  leadershipImplication: string
  caution?: string
}

export function InsightPanel({
  dataInsight,
  interpretation,
  leadershipImplication,
  caution,
}: InsightPanelProps) {
  return (
    <div className="space-y-3">
      <div className="card p-5 border-l-4 border-l-blue-600">
        <div className="text-label mb-2 text-blue-600">Data Insight</div>
        <p className="text-sm text-slate-700 leading-relaxed">{dataInsight}</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="card p-4 border-l-4 border-l-slate-300">
          <div className="text-label mb-2">Interpretation</div>
          <p className="text-sm text-slate-600 leading-relaxed">{interpretation}</p>
        </div>
        <div className="card p-4 border-l-4 border-l-blue-900">
          <div className="text-label mb-2 text-blue-900">Leadership Implication</div>
          <p className="text-sm text-slate-600 leading-relaxed">{leadershipImplication}</p>
        </div>
      </div>
      {caution && (
        <div
          className="card p-4 text-sm leading-relaxed"
          style={{ borderLeft: '4px solid #D97706', color: '#92400E', background: '#FFFBEB' }}
        >
          <span className="font-semibold">Caution: </span>{caution}
        </div>
      )}
    </div>
  )
}

// ── KeyStatsGrid ──────────────────────────────────────────────────────────────
interface KeyStat { label: string; value: string; note: string }
export function KeyStatsGrid({ stats }: { stats: KeyStat[] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      {stats.map((s) => (
        <div key={s.label} className="card p-3">
          <div className="text-label mb-1">{s.label}</div>
          <div className="text-base font-bold text-slate-800 tabular-nums">{s.value}</div>
          <div className="text-xs text-slate-400 mt-0.5">{s.note}</div>
        </div>
      ))}
    </div>
  )
}

// ── SectionHeader ─────────────────────────────────────────────────────────────
export function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-lg font-bold text-slate-800">{title}</h2>
      <p className="text-sm text-slate-500 mt-1 leading-relaxed max-w-4xl">{description}</p>
    </div>
  )
}

// ── ChartLegend ───────────────────────────────────────────────────────────────
interface LegendItem { color: string; label: string; dashed?: boolean }
export function ChartLegend({ items }: { items: LegendItem[] }) {
  return (
    <div className="flex flex-wrap gap-4">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <div
            style={{
              width: 24,
              height: 2,
              background: item.dashed ? 'none' : item.color,
              borderTop: item.dashed ? `2px dashed ${item.color}` : 'none',
            }}
          />
          <span className="text-xs text-slate-500">{item.label}</span>
        </div>
      ))}
    </div>
  )
}

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner() {
  return (
    <div className="flex items-center justify-center h-40">
      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  )
}
