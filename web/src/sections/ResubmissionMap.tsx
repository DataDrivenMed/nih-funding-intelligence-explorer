import { useState, useMemo } from 'react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell, ResponsiveContainer, Legend,
} from 'recharts'
import type { ResubmissionOpp, Section } from '../types'
import TabHelpPanel from '../components/TabHelpPanel'
import MetricDefinitionsCard, { type TermDef } from '../components/MetricDefinitionsCard'
import InsightPanel from '../components/InsightPanel'
import { ChartCard, ControlRow, ExecSelect, ToggleGroup, ChartLegend } from '../components/ui'
import { generateResubmissionInsight } from '../narrativeHelpers'
import { GRID_PROPS, X_AXIS_PROPS, Y_AXIS_PROPS, TOOLTIP_STYLE, C } from '../theme'

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
const ALL_YEARS = [2014,2015,2016,2017,2018,2019,2020,2021,2022,2023,2024,2025]

const YEAR_OPTS = [2025, 2024, 2023, 2022, 2021, 2020, 2019].map((y) => ({
  value: y, label: `FY${y}`,
}))

const RESUB_TERMS: TermDef[] = [
  {
    term: 'Score Transition',
    meaning: 'A move from one percentile range to a better (lower) percentile range — e.g., 18→12 means improving from ~18th percentile to ~12th percentile.',
    whyItMatters: 'Represents the score improvement a resubmitted application would need to achieve. Each transition maps to an absolute probability gain.',
  },
  {
    term: 'Absolute Probability Gain',
    meaning: 'The increase in modeled funding probability (in percentage points) from improving by a given score transition.',
    whyItMatters: 'A +25 pp gain means that improving from, say, the 18th to 12th percentile increases funding probability by 25 percentage points — directly quantifying resubmission value.',
  },
  {
    term: 'Probability Gain',
    meaning: 'The overall increase in funding probability from a score improvement, expressed in percentage points.',
    whyItMatters: 'Higher gain = more leverage from resubmission. Compare across institutes to identify where near-miss applications benefit most from score improvement.',
  },
  {
    term: 'Resubmission Opportunity',
    meaning: 'An estimate of how much funding probability an application can gain by improving its score through resubmission.',
    whyItMatters: 'Guides where to focus resubmission investment. Institutes with high gains in near-payline transitions offer the strongest resubmission ROI.',
  },
  {
    term: 'High Resubmission Payoff',
    meaning: 'An institute whose mean 18→12 transition gain is at or above the 75th percentile across all institutes.',
    whyItMatters: 'Signals that near-miss applications at this institute benefit substantially from a modest score improvement — strong candidates for resubmission support.',
  },
  {
    term: 'Stable Pattern',
    meaning: 'Year-to-year variability in resubmission gains is low (coefficient of variation < 20%), indicating a predictable resubmission environment.',
    whyItMatters: 'Stable patterns support reliable strategic planning; volatile patterns require more caution and case-by-case assessment.',
  },
]

export default function ResubmissionMap({ resubmission }: ResubmissionMapProps) {
  const [view,              setView]              = useState<'ic' | 'all'>('ic')
  const [institute,         setInstitute]         = useState('ALL NIH')
  const [year,              setYear]              = useState(2025)
  const [heatmapTransition, setHeatmapTransition] = useState('15→10')

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

  // 2014-2025 trend: one line per transition for selected institute
  const trendData = useMemo(() => {
    return ALL_YEARS.map((yr) => {
      const row: Record<string, number | string | null> = { year: yr }
      for (const t of TRANSITIONS) {
        const rec = resubmission.find(
          (r) => r.Institute === institute && r.Year === yr && r.Transition === t,
        )
        row[t] = rec?.Absolute_Gain != null
          ? parseFloat((rec.Absolute_Gain * 100).toFixed(1))
          : null
      }
      return row
    })
  }, [institute, resubmission])

  // Dynamic insight
  const insight = useMemo(
    () => generateResubmissionInsight(institute, year, resubmission),
    [institute, year, resubmission],
  )

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
            <span className="font-semibold tabular-nums" style={{ color: '#2563EB' }}>+{d.absGain ?? 'N/A'} pp</span>
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
            <span className="font-semibold tabular-nums" style={{ color: '#2563EB' }}>+{d.value} pp</span>
          </div>
        </div>
      </div>
    )
  }

  function TrendTooltip({ active, payload, label }: {
    active?: boolean
    payload?: { name: string; value: number | null; color: string }[]
    label?: number
  }) {
    if (!active || !payload?.length) return null
    const items = payload.filter((p) => p.value !== null)
    return (
      <div style={{ ...TOOLTIP_STYLE }}>
        <div className="font-semibold text-gray-700 pb-1 mb-1 border-b border-gray-100">
          FY{label} · {institute}
        </div>
        {items.map((p) => (
          <div key={p.name} className="flex justify-between gap-6 mt-0.5 text-xs">
            <span style={{ color: p.color }}>{p.name}</span>
            <span className="font-semibold tabular-nums">+{(p.value as number).toFixed(1)} pp</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-5">

      <TabHelpPanel
        what="Modeled probability gains from score improvements at each NIH institute. A 'score transition' (e.g., 18→12) represents an application moving from one percentile to a better one. The absolute gain is how many percentage points of funding probability that improvement is worth."
        howTo="Use the Institute dropdown (By Institute view) to see 4 score transitions for the selected IC and year. The trend chart below shows how gains in the 18→12 transition have changed from FY2014 to FY2025. Switch to 'All ICs' view to compare all institutes for one transition."
        takeaway="Higher absolute gains signal that near-miss applications at a given institute benefit substantially from score improvement. Institutes with both high gains and stable year-to-year patterns are the strongest candidates for targeted resubmission investment."
      />

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
          {/* Bar chart: 4 transitions for selected IC × year */}
          <ChartCard
            title={`Absolute Probability Gain by Score Transition — ${institute} FY${year}`}
            subtitle="Improvement in modeled funding probability when a resubmission improves from one percentile tier to the next. Larger bars = more leverage from resubmission."
            footnote="Gains are estimated from the fitted logistic curve and are point-in-time. FY2025 payline compression affects gain magnitudes."
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
            {icData.map((d) => (
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

          {/* Trend chart: 2014-2025 absolute gain by transition for selected IC */}
          <ChartCard
            title={`Absolute Gain Trend — ${institute}, FY2014–2025`}
            subtitle="One line per score transition. Shows how the resubmission payoff for each score improvement has changed over 12 years."
            footnote="Gaps indicate years where insufficient data was available to fit the transition. FY2025 marked in red."
            legend={
              <ChartLegend items={TRANSITIONS.map((t) => ({
                color: TRANSITION_COLORS[t],
                label: t,
              }))} />
            }
          >
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData} margin={{ top: 12, right: 32, left: 0, bottom: 8 }}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="year" {...X_AXIS_PROPS} tickFormatter={(v) => `FY${v}`} />
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
                <Tooltip content={<TrendTooltip />} cursor={{ stroke: '#F3F4F6', strokeWidth: 2 }} />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 8, color: '#6B7280' }}
                  formatter={(value) => <span style={{ color: TRANSITION_COLORS[value] ?? '#9CA3AF' }}>{value}</span>}
                />
                {TRANSITIONS.map((t) => (
                  <Line
                    key={t}
                    type="monotone"
                    dataKey={t}
                    stroke={TRANSITION_COLORS[t]}
                    strokeWidth={t === '18→12' ? 2.5 : 1.5}
                    dot={t === '18→12' ? { r: 3, fill: TRANSITION_COLORS[t], strokeWidth: 0 } : false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                    connectNulls={false}
                    name={t}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}

      {/* All-ICs ranked view */}
      {view === 'all' && (
        <ChartCard
          title={`${heatmapTransition} Absolute Gain — All ICs FY${year} · Ranked`}
          subtitle="Absolute probability gain (percentage points) from improving to the next score tier. Ranked descending — top institutes offer the most resubmission leverage."
          footnote="ICs with fewer than 8 observations or sparse transition zones are excluded."
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
                  return (
                    <Cell key={d.institute} fill="#2563EB" fillOpacity={0.25 + t * 0.75} />
                  )
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Term definitions */}
      <MetricDefinitionsCard terms={RESUB_TERMS} title="Key Term Definitions" />

      {/* Dynamic insight panel — only shown in IC view */}
      {view === 'ic' && (
        <InsightPanel
          dataInsight={insight.dataInsight}
          interpretation={insight.interpretation}
          leadershipImplication={insight.leadershipImplication}
          caution={insight.caution}
          contextLabel={`${institute} · FY${year} · 18→12 focal transition`}
        />
      )}

      {/* Static description for All-ICs view */}
      {view === 'all' && (
        <div className="card px-6 py-5">
          <div className="text-label mb-2">How to Read This View</div>
          <p className="text-sm text-gray-700 leading-relaxed">
            This ranked view shows how much funding probability each institute offers for the selected score transition in FY{year}.
            Institutes at the top offer the most resubmission leverage — a score improvement to the target percentile yields the largest probability gain.
            Switch to <strong>By Institute</strong> view and select a specific IC to see its 12-year trend and detailed narrative analysis.
          </p>
        </div>
      )}
    </div>
  )
}
