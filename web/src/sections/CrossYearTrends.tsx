import { useState, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts'
import type { Payline, Section } from '../types'
import TabHelpPanel from '../components/TabHelpPanel'
import MetricDefinitionsCard, { type TermDef } from '../components/MetricDefinitionsCard'
import InsightPanel from '../components/InsightPanel'
import { ChartCard, ControlRow } from '../components/ui'
import { ALL_INSTITUTES } from '../utils'
import { generateTrendInsight } from '../narrativeHelpers'
import { GRID_PROPS, X_AXIS_PROPS, Y_AXIS_PROPS, TOOLTIP_STYLE, C } from '../theme'

interface CrossYearTrendsProps {
  paylines: Payline[]
  section:  Section
}

const IC_PALETTE = [
  '#1E40AF','#0D9488','#7C3AED','#0369A1','#047857',
  '#9A3412','#B91C1C','#6D28D9','#0891B2','#065F46',
  '#92400E','#1D4ED8','#1E3A8A','#4338CA','#0F766E',
  '#155E75','#064E3B','#831843','#1C1917',
]

const ALL_ICS_LIST = ['ALL NIH', ...ALL_INSTITUTES]
const YEARS = [2014,2015,2016,2017,2018,2019,2020,2021,2022,2023,2024,2025]

function getIcColor(ic: string, idx: number): string {
  if (ic === 'ALL NIH') return C.BLUE
  return IC_PALETTE[(idx - 1) % IC_PALETTE.length]
}

function TooltipContent({ active, payload, label }: {
  active?: boolean
  payload?: { name: string; value: number | null; color: string }[]
  label?: number
}) {
  if (!active || !payload?.length) return null
  const items = [...payload]
    .filter((p) => p.value !== null)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
  return (
    <div style={{ ...TOOLTIP_STYLE, maxHeight: 240, overflowY: 'auto' }}>
      <div className="font-semibold text-gray-700 pb-1 mb-1 border-b border-gray-100">
        FY{label} · EEP50
      </div>
      {items.map((p) => (
        <div key={p.name} className="flex justify-between gap-6 mt-0.5 text-xs">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-semibold tabular-nums">{(p.value as number).toFixed(1)}</span>
        </div>
      ))}
    </div>
  )
}

const TREND_TERMS: TermDef[] = [
  {
    term: 'EEP50',
    meaning: 'The percentile score at which an application has a 50% modeled probability of funding.',
    whyItMatters: 'Tracking EEP50 over time reveals whether a funding environment is tightening (declining EEP50) or easing (rising EEP50).',
  },
  {
    term: 'YoY Change',
    meaning: 'The year-over-year change in EEP50 — positive means the environment eased; negative means it tightened.',
    whyItMatters: 'Negative YoY changes signal that applications must score better to achieve the same odds. A −5.7 pp change (ALL NIH FY2024→2025) is historically extreme.',
  },
  {
    term: 'Stable Era',
    meaning: 'A multi-year period where EEP50 shows minimal variation (typically within ±1 pp), as seen for ALL NIH from FY2019–2023.',
    whyItMatters: 'Stable eras allow reliable benchmarking; departures signal environmental regime changes that require strategic recalibration.',
  },
]

export default function CrossYearTrends({ paylines }: CrossYearTrendsProps) {
  const [selected, setSelected] = useState<string[]>(['ALL NIH'])

  const toggleIC = (ic: string) =>
    setSelected((prev) =>
      prev.includes(ic) ? prev.filter((i) => i !== ic) : [...prev, ic],
    )

  const data = YEARS.map((yr) => {
    const row: Record<string, number | string | null> = { year: yr }
    for (const ic of selected) {
      const rec = paylines.find((p) => p.Year === yr && p.Institute === ic)
      row[ic] = rec?.EEP50 ?? null
    }
    return row
  })

  const changeRows = selected
    .map((ic) => {
      const r25 = paylines.find((p) => p.Institute === ic && p.Year === 2025)
      const r24 = paylines.find((p) => p.Institute === ic && p.Year === 2024)
      const delta =
        r25?.EEP50 != null && r24?.EEP50 != null
          ? r25.EEP50 - r24.EEP50
          : null
      return { ic, eep2024: r24?.EEP50, eep2025: r25?.EEP50, delta }
    })
    .sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0))

  const insight = useMemo(
    () => generateTrendInsight(selected, paylines),
    [selected, paylines],
  )

  const contextLabel =
    selected.length === 0
      ? 'No institutes selected'
      : selected.length === 1
        ? `For ${selected[0]} · FY2014–2025`
        : `For ${selected.length} selected institutes · FY2014–2025`

  return (
    <div className="space-y-5">

      <TabHelpPanel
        what="Year-over-year EEP50 trend lines for any combination of NIH institutes from FY2014 to FY2025. EEP50 is the percentile score at which an application has a 50% modeled probability of funding — lower values mean a more competitive environment."
        howTo="Click institute buttons below the panel to add or remove institutes from the chart. ALL NIH is shown in blue as a reference. Hover over chart lines to see exact EEP50 values. The YoY change table below the chart ranks declines from FY2024 to FY2025."
        takeaway="All 20 institutes declined in FY2025 simultaneously — a system-wide pattern with no precedent in the 12-year dataset. Use the trend lines to identify which institutes experienced the sharpest compression."
      />

      {/* IC selector panel */}
      <div className="card p-5">
        <div className="text-label mb-3">Select institutes to compare</div>
        <div className="flex flex-wrap gap-1.5">
          {ALL_ICS_LIST.map((ic, i) => {
            const color  = getIcColor(ic, i)
            const active = selected.includes(ic)
            return (
              <button
                key={ic}
                onClick={() => toggleIC(ic)}
                className="text-xs px-2.5 py-1 rounded-full border font-medium transition-all"
                style={{
                  background:  active ? color : '#fff',
                  borderColor: active ? color : '#E5E7EB',
                  color:       active ? '#fff' : '#6B7280',
                }}
              >
                {ic}
              </button>
            )
          })}
        </div>
        {selected.length === 0 && (
          <p className="mt-2 text-xs text-gray-400">Select at least one institute above</p>
        )}
      </div>

      {/* Chart */}
      <ChartCard
        title="EEP50 Trend by Institute — FY2014–2025"
        subtitle="Year-over-year movement in the 50% funding probability threshold. ALL NIH in blue; individual ICs in muted palette."
        footnote="Null values (NIMHD 2014–2015) appear as gaps. All series share the same Y axis."
      >
        <ResponsiveContainer width="100%" height={420}>
          <LineChart data={data} margin={{ top: 12, right: 32, left: 0, bottom: 8 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="year" {...X_AXIS_PROPS} tickFormatter={(v) => `FY${v}`} />
            <YAxis
              {...Y_AXIS_PROPS}
              domain={[0, 30]}
              label={{
                value: 'EEP50 (Percentile)',
                angle: -90,
                position: 'insideLeft',
                offset: 12,
                style: { fontSize: 11, fill: '#9CA3AF' },
              }}
            />
            <Tooltip content={<TooltipContent />} cursor={{ stroke: '#F3F4F6', strokeWidth: 2 }} />
            <ReferenceLine
              x={2025}
              stroke="#E5E7EB"
              strokeWidth={1}
              label={{ value: 'FY2025', position: 'top', fontSize: 10, fill: '#9CA3AF' }}
            />
            {selected.map((ic, i) => {
              const color = getIcColor(ic, i)
              return (
                <Line
                  key={ic}
                  type="monotone"
                  dataKey={ic}
                  stroke={color}
                  strokeWidth={ic === 'ALL NIH' ? 2.5 : 1.5}
                  dot={ic === 'ALL NIH' ? { r: 3, fill: color, strokeWidth: 0 } : false}
                  activeDot={{ r: 4, fill: color, strokeWidth: 0 }}
                  connectNulls
                  name={ic}
                />
              )
            })}
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* YoY change table */}
      {selected.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <span className="text-label">EEP50 Change — FY2024 to FY2025</span>
            <span className="ml-3 text-xs text-gray-400 italic">Sorted by largest decline first</span>
          </div>
          <div className="divide-y divide-gray-50">
            {changeRows.map(({ ic, eep2024, eep2025, delta }, i) => {
              const color = getIcColor(ic, ALL_ICS_LIST.indexOf(ic))
              const severe = delta !== null && delta < -5
              return (
                <div
                  key={ic}
                  className="flex items-center px-6 py-2.5 text-sm"
                  style={{ background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full mr-3 flex-shrink-0" style={{ background: color }} />
                  <span className="w-24 font-medium text-gray-700">{ic}</span>
                  <span className="w-16 font-mono text-gray-400 text-xs">{eep2024?.toFixed(1) ?? 'N/A'}</span>
                  <span className="text-gray-300 mx-2 text-xs">→</span>
                  <span className="w-16 font-mono font-semibold text-gray-800 text-xs">{eep2025?.toFixed(1) ?? 'N/A'}</span>
                  <span
                    className={`ml-auto font-mono font-semibold text-xs ${
                      delta === null ? 'text-gray-400' :
                      severe        ? 'text-red-600'  :
                      delta < -2    ? 'text-amber-600' : 'text-gray-500'
                    }`}
                  >
                    {delta !== null ? (delta >= 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)) : 'N/A'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Term definitions */}
      <MetricDefinitionsCard terms={TREND_TERMS} title="Key Term Definitions" />

      {/* Dynamic insight panel */}
      <InsightPanel
        dataInsight={insight.dataInsight}
        interpretation={insight.interpretation}
        leadershipImplication={insight.leadershipImplication}
        caution={insight.caution}
        contextLabel={contextLabel}
      />
    </div>
  )
}
