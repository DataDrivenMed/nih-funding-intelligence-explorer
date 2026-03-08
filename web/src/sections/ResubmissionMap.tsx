import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell, ResponsiveContainer,
} from 'recharts'
import type { ResubmissionOpp, Section } from '../types'
import InsightCard from '../components/InsightCard'
import { ChartCard, ControlRow, ExecSelect, ToggleGroup } from '../components/ui'
import { GRID_PROPS, X_AXIS_PROPS, Y_AXIS_PROPS, TOOLTIP_STYLE } from '../theme'

interface ResubmissionMapProps {
  resubmission: ResubmissionOpp[]
  section: Section
}

const TRANSITIONS = ['20→15', '18→12', '15→10', '12→8']
const TRANSITION_COLORS: Record<string, string> = {
  '20→15': '#CBD5E1',
  '18→12': '#93C5FD',
  '15→10': '#2563EB',
  '12→8':  '#1E3A8A',
}

const YEAR_OPTS = [2025, 2024, 2023, 2022, 2021, 2020, 2019].map((y) => ({
  value: y, label: `FY${y}`,
}))

export default function ResubmissionMap({ resubmission, section }: ResubmissionMapProps) {
  const [view,               setView]               = useState<'ic' | 'all'>('ic')
  const [institute,          setInstitute]          = useState('ALL NIH')
  const [year,               setYear]               = useState(2025)
  const [heatmapTransition,  setHeatmapTransition]  = useState('15→10')

  const institutes = [...new Set(resubmission.map((r) => r.Institute))].sort()

  // IC view: 4 transitions for selected IC × year
  const icData = TRANSITIONS.map((t) => {
    const rec = resubmission.find(
      (r) => r.Institute === institute && r.Year === year && r.Transition === t,
    )
    return {
      transition: t,
      absGain:  rec?.Absolute_Gain  != null ? parseFloat((rec.Absolute_Gain  * 100).toFixed(1)) : null,
      probFrom: rec?.Prob_From      != null ? parseFloat((rec.Prob_From      * 100).toFixed(1)) : null,
      probTo:   rec?.Prob_To        != null ? parseFloat((rec.Prob_To        * 100).toFixed(1)) : null,
      relGain:  rec?.Relative_Gain_Pct != null ? parseFloat(rec.Relative_Gain_Pct.toFixed(0))  : null,
    }
  })

  // All-ICs view: all institutes × selected transition for selected year
  const allData = institutes
    .filter((ic) => ic !== 'ALL NIH')
    .map((ic) => {
      const rec = resubmission.find(
        (r) => r.Institute === ic && r.Year === year && r.Transition === heatmapTransition,
      )
      return {
        institute: ic,
        absGain:  rec?.Absolute_Gain != null ? parseFloat((rec.Absolute_Gain * 100).toFixed(1)) : null,
        probFrom: rec?.Prob_From     != null ? parseFloat((rec.Prob_From     * 100).toFixed(1)) : null,
        probTo:   rec?.Prob_To       != null ? parseFloat((rec.Prob_To       * 100).toFixed(1)) : null,
      }
    })
    .filter((d) => d.absGain !== null)
    .sort((a, b) => (b.absGain ?? 0) - (a.absGain ?? 0))

  const maxGain = Math.max(...allData.map((d) => d.absGain ?? 0), 1)

  function ICTooltip({ active, payload, label }: {
    active?: boolean
    payload?: { value: number }[]
    label?: string
  }) {
    if (!active || !payload?.length) return null
    const d = icData.find((r) => r.transition === label)
    if (!d) return null
    return (
      <div style={{ ...TOOLTIP_STYLE }}>
        <div className="font-semibold text-gray-700 pb-1 mb-1 border-b border-gray-100">
          {label} · {institute} FY{year}
        </div>
        <div className="space-y-0.5 text-xs">
          <div className="flex justify-between gap-6">
            <span className="text-gray-500">From score</span>
            <span className="font-semibold tabular-nums">{d.probFrom ?? 'N/A'}%</span>
          </div>
          <div className="flex justify-between gap-6">
            <span className="text-gray-500">To score</span>
            <span className="font-semibold tabular-nums">{d.probTo ?? 'N/A'}%</span>
          </div>
          <div className="flex justify-between gap-6 mt-1">
            <span className="text-gray-500">Absolute gain</span>
            <span className="font-semibold tabular-nums" style={{ color: '#2563EB' }}>
              +{d.absGain ?? 'N/A'} pp
            </span>
          </div>
          {d.relGain !== null && (
            <div className="flex justify-between gap-6">
              <span className="text-gray-500">Relative gain</span>
              <span className="font-semibold tabular-nums">{d.relGain}%</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  function AllICTooltip({ active, payload, label }: {
    active?: boolean
    payload?: { value: number; payload: { probFrom: number | null; probTo: number | null } }[]
    label?: string
  }) {
    if (!active || !payload?.length) return null
    const d = payload[0]
    return (
      <div style={{ ...TOOLTIP_STYLE }}>
        <div className="font-semibold text-gray-700 pb-1 mb-1 border-b border-gray-100">
          {label} · {heatmapTransition} · FY{year}
        </div>
        <div className="space-y-0.5 text-xs">
          <div className="flex justify-between gap-6">
            <span className="text-gray-500">From</span>
            <span className="font-semibold tabular-nums">{d.payload.probFrom ?? 'N/A'}%</span>
          </div>
          <div className="flex justify-between gap-6">
            <span className="text-gray-500">To</span>
            <span className="font-semibold tabular-nums">{d.payload.probTo ?? 'N/A'}%</span>
          </div>
          <div className="flex justify-between gap-6 mt-1">
            <span className="text-gray-500">Abs. gain</span>
            <span className="font-semibold tabular-nums" style={{ color: '#2563EB' }}>
              +{d.value} pp
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Controls */}
      <ControlRow>
        <ToggleGroup
          options={[
            { value: 'ic',  label: 'By Institute' },
            { value: 'all', label: 'All ICs' },
          ]}
          value={view}
          onChange={setView}
        />
        <ExecSelect
          label="Year"
          value={year}
          onChange={(v) => setYear(Number(v))}
          options={YEAR_OPTS}
        />
        {view === 'ic' && (
          <ExecSelect
            label="Institute"
            value={institute}
            onChange={setInstitute}
            options={institutes.map((ic) => ({ value: ic, label: ic }))}
          />
        )}
        {view === 'all' && (
          <ExecSelect
            label="Transition"
            value={heatmapTransition}
            onChange={setHeatmapTransition}
            options={TRANSITIONS.map((t) => ({ value: t, label: t }))}
          />
        )}
      </ControlRow>

      {/* IC view */}
      {view === 'ic' && (
        <>
          <ChartCard
            title={`Absolute Probability Gain by Score Transition — ${institute} FY${year}`}
            subtitle="Improvement in modeled funding probability when a resubmission improves from one percentile tier to the next. Larger bars = more leverage from resubmission."
            footnote="Gains are estimated from the fitted logistic curve and are point-in-time. Cross-year projections are not valid given FY2025 payline compression."
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={icData} margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="transition" {...X_AXIS_PROPS} />
                <YAxis
                  {...Y_AXIS_PROPS}
                  domain={[0, 55]}
                  tickFormatter={(v) => `${v} pp`}
                  label={{
                    value: 'Absolute gain (pp)',
                    angle: -90,
                    position: 'insideLeft',
                    offset: 12,
                    style: { fontSize: 11, fill: '#9CA3AF' },
                  }}
                />
                <Tooltip content={<ICTooltip />} cursor={{ fill: '#F9FAFB' }} />
                <Bar dataKey="absGain" radius={[3, 3, 0, 0]}>
                  {icData.map((d) => (
                    <Cell key={d.transition} fill={TRANSITION_COLORS[d.transition] ?? '#CBD5E1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Before / after mini cards */}
          <div className="grid grid-cols-4 gap-3">
            {icData.map((d, i) => (
              <div key={d.transition} className="card p-4 text-center">
                <div
                  className="text-xs font-semibold mb-2"
                  style={{ color: TRANSITION_COLORS[d.transition] ?? '#9CA3AF' }}
                >
                  {d.transition}
                </div>
                <div className="text-sm text-gray-400 font-mono">{d.probFrom ?? 'N/A'}%</div>
                <div className="text-gray-200 text-xs my-0.5">↓</div>
                <div className="text-2xl font-bold" style={{ color: TRANSITION_COLORS[d.transition] ?? '#9CA3AF' }}>
                  {d.probTo ?? 'N/A'}%
                </div>
                {d.absGain !== null && (
                  <div className="mt-1.5 text-xs font-semibold" style={{ color: '#2563EB' }}>
                    +{d.absGain} pp
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* All-ICs ranked view */}
      {view === 'all' && (
        <ChartCard
          title={`${heatmapTransition} Absolute Gain — All ICs FY${year} · Ranked`}
          subtitle="Absolute probability gain (percentage points) from improving to the next score tier. Ranked descending — top institutes offer the most resubmission leverage."
          footnote="ICs with fewer than 8 observations or sparse transition zones are excluded. Only institutes with modeled logistic fits are shown."
        >
          <ResponsiveContainer width="100%" height={440}>
            <BarChart
              data={allData}
              layout="vertical"
              margin={{ top: 4, right: 64, left: 52, bottom: 4 }}
            >
              <CartesianGrid {...GRID_PROPS} horizontal={false} />
              <XAxis
                type="number"
                domain={[0, Math.ceil(maxGain / 5) * 5 + 5]}
                {...X_AXIS_PROPS}
                tickFormatter={(v) => `${v} pp`}
                label={{
                  value: 'Absolute gain (pp)',
                  position: 'insideBottom',
                  offset: -2,
                  style: { fontSize: 11, fill: '#9CA3AF' },
                }}
              />
              <YAxis
                type="category"
                dataKey="institute"
                width={52}
                tick={{ fontSize: 11, fill: '#6B7280' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<AllICTooltip />} cursor={{ fill: '#F9FAFB' }} />
              <Bar dataKey="absGain" radius={[0, 3, 3, 0]}>
                {allData.map((d) => {
                  const t = (d.absGain ?? 0) / maxGain
                  // Blue intensity ramp: light to dark
                  const opacity = 0.25 + t * 0.75
                  return (
                    <Cell key={d.institute} fill="#2563EB" fillOpacity={opacity} />
                  )
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      <InsightCard section={section} />
    </div>
  )
}
