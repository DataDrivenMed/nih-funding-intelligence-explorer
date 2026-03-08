import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell, ReferenceLine, ResponsiveContainer,
} from 'recharts'
import type { Payline, Section } from '../types'
import TabHelpPanel from '../components/TabHelpPanel'
import MetricDefinitionsCard, { type TermDef } from '../components/MetricDefinitionsCard'
import InsightPanel from '../components/InsightPanel'
import { ChartCard, ControlRow, ExecSelect, ToggleGroup, Pill } from '../components/ui'
import { getQuadrant, QUADRANT_COLORS, QUADRANT_BG } from '../utils'
import { generateInstituteComparisonInsight } from '../narrativeHelpers'
import { GRID_PROPS, X_AXIS_PROPS, Y_AXIS_PROPS, TOOLTIP_STYLE, C } from '../theme'

interface InstituteComparisonProps {
  paylines: Payline[]
  section: Section
}

const YEAR_OPTS = [2025,2024,2023,2022,2021,2020,2019,2018,2017,2016,2015,2014].map((y) => ({
  value: y, label: `FY${y}`,
}))

const QUADRANT_ORDER = [
  'Sharp Payline',
  'Competitive & Probabilistic',
  'Moderate & Focused',
  'Broad Opportunity Window',
]

const IC_COMP_TERMS: TermDef[] = [
  {
    term: 'EEP50',
    meaning: 'The percentile score at which an application has a 50% modeled probability of funding.',
    whyItMatters: 'Lower EEP50 = more competitive IC. Sorted ascending in this chart — shortest bars are the most selective institutes.',
  },
  {
    term: 'Opportunity Width',
    meaning: 'The distance in percentile points between EEP80 (80% probability) and EEP20 (20% probability).',
    whyItMatters: 'Wider = more gradual funding cliff, supporting broader resubmission strategies. Narrower = steeper cliff, demanding score precision.',
  },
  {
    term: 'Sharp Payline',
    meaning: 'An institute with low EEP50 AND narrow Opportunity Width — both highly selective and cliff-like.',
    whyItMatters: 'Requires investigators to achieve very strong scores AND leaves almost no gray zone. The most demanding application environment.',
  },
  {
    term: 'Broad Opportunity Window',
    meaning: 'An institute with higher EEP50 AND wide Opportunity Width — both relatively permissive and gradual.',
    whyItMatters: 'Supports more flexible resubmission strategies. Near-miss applications have more meaningful residual probability.',
  },
]

export default function InstituteComparison({ paylines }: InstituteComparisonProps) {
  const [year,   setYear]   = useState(2025)
  const [metric, setMetric] = useState<'EEP50' | 'Opportunity_Width'>('EEP50')

  const allNih = paylines.find((p) => p.Year === year && p.Institute === 'ALL NIH')

  const data = paylines
    .filter((p) => p.Year === year && p.Institute !== 'ALL NIH' && p.EEP50 !== null)
    .map((p) => ({
      institute:         p.Institute,
      EEP50:             p.EEP50,
      Opportunity_Width: p.Opportunity_Width,
      quadrant:          getQuadrant(p.EEP50, p.Opportunity_Width),
    }))
    .sort((a, b) => {
      const av = (metric === 'EEP50' ? a.EEP50 : a.Opportunity_Width) ?? 0
      const bv = (metric === 'EEP50' ? b.EEP50 : b.Opportunity_Width) ?? 0
      return av - bv
    })

  function TooltipContent({ active, payload }: {
    active?: boolean
    payload?: { payload: typeof data[0] }[]
  }) {
    if (!active || !payload?.length) return null
    const d = payload[0].payload
    const q = d.quadrant
    return (
      <div style={{ ...TOOLTIP_STYLE }}>
        <div className="font-semibold text-gray-800 pb-1 mb-1 border-b border-gray-100">
          {d.institute} · FY{year}
        </div>
        <div className="space-y-0.5 text-xs">
          <div className="flex justify-between gap-5">
            <span className="text-gray-500">EEP50</span>
            <span className="font-semibold tabular-nums">{d.EEP50?.toFixed(1) ?? 'N/A'}</span>
          </div>
          <div className="flex justify-between gap-5">
            <span className="text-gray-500">Opp Width</span>
            <span className="font-semibold tabular-nums">{d.Opportunity_Width?.toFixed(1) ?? 'N/A'} pp</span>
          </div>
        </div>
        <div className={`mt-2 text-xs px-2 py-0.5 rounded-full border inline-block ${QUADRANT_BG[q]}`}>
          {q}
        </div>
      </div>
    )
  }

  const insight = useMemo(
    () => generateInstituteComparisonInsight(year, metric, data, allNih),
    [year, metric, data, allNih],
  )

  const contextLabel = `FY${year} · sorted by ${metric === 'EEP50' ? 'EEP50' : 'Opportunity Width'}`

  return (
    <div className="space-y-5">

      <TabHelpPanel
        what="A cross-institute comparison of either EEP50 (funding selectivity) or Opportunity Width (breadth of the funding gray zone) for all 19 individual NIH institutes in a selected fiscal year. Bars are sorted from most to least competitive."
        howTo="Use the Year dropdown to select any fiscal year. Use the toggle to switch between EEP50 and Opportunity Width views. The dashed line shows the ALL NIH benchmark. Color-coded quadrant labels identify each institute's typology. Hover bars for full detail."
        takeaway="In FY2025, most institutes shifted sharply left (lower EEP50), with many entering the Sharp Payline quadrant for the first time. Compare specific ICs to the ALL NIH reference line to gauge relative selectivity."
      />

      {/* Controls */}
      <ControlRow>
        <ExecSelect
          label="Year"
          value={year}
          onChange={(v) => setYear(Number(v))}
          options={YEAR_OPTS}
        />
        <ToggleGroup
          options={[
            { value: 'EEP50', label: 'EEP50 (payline)' },
            { value: 'Opportunity_Width', label: 'Opportunity Width' },
          ]}
          value={metric}
          onChange={setMetric}
        />
        <div className="flex flex-wrap gap-2 ml-auto">
          {QUADRANT_ORDER.map((q) => (
            <Pill key={q} label={q} className={QUADRANT_BG[q]} />
          ))}
        </div>
      </ControlRow>

      {/* Chart */}
      <ChartCard
        title={
          metric === 'EEP50'
            ? `EEP50 by Institute — FY${year} · Lower = more competitive`
            : `Opportunity Width by Institute — FY${year} · Higher = more probabilistic`
        }
        subtitle={
          metric === 'EEP50'
            ? 'The percentile at which an application has a 50% modeled funding probability · dashed = ALL NIH'
            : 'Percentile span between EEP20 and EEP80 — the width of the meaningful funding zone · dashed = ALL NIH'
        }
      >
        <ResponsiveContainer width="100%" height={420}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 56, left: 52, bottom: 4 }}
          >
            <CartesianGrid {...GRID_PROPS} horizontal={false} />
            <XAxis
              type="number"
              domain={[0, metric === 'EEP50' ? 24 : 28]}
              {...X_AXIS_PROPS}
              label={{
                value: metric === 'EEP50' ? 'Percentile' : 'Percentile points',
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
            <Tooltip content={<TooltipContent />} cursor={{ fill: '#F9FAFB' }} />

            {metric === 'EEP50' && allNih?.EEP50 != null && (
              <ReferenceLine
                x={allNih.EEP50}
                stroke="#94A3B8"
                strokeWidth={1}
                strokeDasharray="4 2"
                label={{ value: `ALL NIH ${allNih.EEP50.toFixed(1)}`, position: 'top', fontSize: 10, fill: '#9CA3AF' }}
              />
            )}
            {metric === 'Opportunity_Width' && allNih?.Opportunity_Width != null && (
              <ReferenceLine
                x={allNih.Opportunity_Width}
                stroke="#94A3B8"
                strokeWidth={1}
                strokeDasharray="4 2"
                label={{ value: `ALL NIH ${allNih.Opportunity_Width.toFixed(1)}`, position: 'top', fontSize: 10, fill: '#9CA3AF' }}
              />
            )}

            <Bar dataKey={metric} radius={[0, 3, 3, 0]}>
              {data.map((d) => (
                <Cell
                  key={d.institute}
                  fill={QUADRANT_COLORS[d.quadrant] ?? C.SLATE}
                  opacity={0.85}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Term definitions */}
      <MetricDefinitionsCard terms={IC_COMP_TERMS} title="Key Term Definitions" />

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
