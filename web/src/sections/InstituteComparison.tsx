import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell, ReferenceLine, ResponsiveContainer,
} from 'recharts'
import type { Payline, Section } from '../types'
import InsightCard from '../components/InsightCard'
import { ChartCard, ControlRow, ExecSelect, ToggleGroup, Pill } from '../components/ui'
import { getQuadrant, QUADRANT_COLORS, QUADRANT_BG } from '../utils'
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

export default function InstituteComparison({ paylines, section }: InstituteComparisonProps) {
  const [year, setYear]     = useState(2025)
  const [metric, setMetric] = useState<'EEP50' | 'Opportunity_Width'>('EEP50')

  const allNih = paylines.find((p) => p.Year === year && p.Institute === 'ALL NIH')

  const data = paylines
    .filter((p) => p.Year === year && p.Institute !== 'ALL NIH' && p.EEP50 !== null)
    .map((p) => ({
      institute: p.Institute,
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

  return (
    <div className="space-y-5">
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
        {/* Quadrant legend */}
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
            ? 'The percentile at which an application has a 50% modeled funding probability'
            : 'Percentile span between EEP20 and EEP80 — the width of the meaningful funding zone'
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

            {/* ALL NIH reference */}
            {metric === 'EEP50' && allNih?.EEP50 != null && (
              <ReferenceLine
                x={allNih.EEP50}
                stroke="#94A3B8"
                strokeWidth={1}
                strokeDasharray="4 2"
                label={{
                  value: `ALL NIH ${allNih.EEP50.toFixed(1)}`,
                  position: 'top',
                  fontSize: 10,
                  fill: '#9CA3AF',
                }}
              />
            )}
            {metric === 'Opportunity_Width' && allNih?.Opportunity_Width != null && (
              <ReferenceLine
                x={allNih.Opportunity_Width}
                stroke="#94A3B8"
                strokeWidth={1}
                strokeDasharray="4 2"
                label={{
                  value: `ALL NIH ${allNih.Opportunity_Width.toFixed(1)}`,
                  position: 'top',
                  fontSize: 10,
                  fill: '#9CA3AF',
                }}
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

      <InsightCard section={section} />
    </div>
  )
}
