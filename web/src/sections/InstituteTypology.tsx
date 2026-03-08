import { useState } from 'react'
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts'
import type { Payline, Section } from '../types'
import InsightCard from '../components/InsightCard'
import { ChartCard, ControlRow, ExecSelect, Pill } from '../components/ui'
import { getQuadrant, QUADRANT_COLORS, QUADRANT_BG } from '../utils'
import { GRID_PROPS, X_AXIS_PROPS, Y_AXIS_PROPS, TOOLTIP_STYLE } from '../theme'

interface InstituteTypologyProps {
  paylines: Payline[]
  section: Section
}

const EEP50_MED = 10.7
const OW_MED    = 9.7

const QUADRANT_ORDER = [
  'Sharp Payline',
  'Competitive & Probabilistic',
  'Moderate & Focused',
  'Broad Opportunity Window',
] as const

const YEAR_OPTS = [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014].map(
  (y) => ({ value: y, label: `FY${y}` }),
)

export default function InstituteTypology({ paylines, section }: InstituteTypologyProps) {
  const [year,        setYear]        = useState(2025)
  const [highlighted, setHighlighted] = useState<string | null>(null)

  const data = paylines
    .filter((p) => p.Year === year && p.Institute !== 'ALL NIH' && p.EEP50 !== null && p.Opportunity_Width !== null)
    .map((p) => ({
      institute: p.Institute,
      EEP50:     parseFloat((p.EEP50 as number).toFixed(2)),
      OW:        parseFloat((p.Opportunity_Width as number).toFixed(2)),
      quadrant:  getQuadrant(p.EEP50, p.Opportunity_Width),
    }))

  const byQuadrant = QUADRANT_ORDER.reduce<Record<string, typeof data>>((acc, q) => {
    acc[q] = data.filter((d) => d.quadrant === q)
    return acc
  }, {})

  // Custom dot with IC label
  const CustomDot = (props: {
    cx?: number
    cy?: number
    payload?: (typeof data)[0]
  }) => {
    const { cx, cy, payload } = props
    if (cx === undefined || cy === undefined || !payload) return null
    const isHL  = highlighted === payload.institute
    const color = QUADRANT_COLORS[payload.quadrant] ?? '#9CA3AF'
    const fade  = highlighted !== null && !isHL
    return (
      <g
        style={{ cursor: 'pointer' }}
        onClick={() => setHighlighted(isHL ? null : payload.institute)}
      >
        <circle
          cx={cx} cy={cy}
          r={isHL ? 9 : 6}
          fill={color}
          opacity={fade ? 0.25 : 0.85}
          stroke="white"
          strokeWidth={isHL ? 2 : 1}
        />
        <text
          x={cx} y={cy - 10}
          textAnchor="middle"
          fontSize={isHL ? 11 : 9}
          fontWeight={isHL ? 700 : 500}
          fill={fade ? '#CBD5E1' : '#374151'}
        >
          {payload.institute}
        </text>
      </g>
    )
  }

  function TooltipContent({ active, payload }: {
    active?: boolean
    payload?: { payload: (typeof data)[0] }[]
  }) {
    if (!active || !payload?.length) return null
    const d = payload[0].payload
    return (
      <div style={{ ...TOOLTIP_STYLE }}>
        <div className="font-semibold text-gray-800 pb-1 mb-1 border-b border-gray-100">
          {d.institute} · FY{year}
        </div>
        <div className="space-y-0.5 text-xs">
          <div className="flex justify-between gap-5">
            <span className="text-gray-500">EEP50</span>
            <span className="font-semibold tabular-nums">{d.EEP50}</span>
          </div>
          <div className="flex justify-between gap-5">
            <span className="text-gray-500">Opp Width</span>
            <span className="font-semibold tabular-nums">{d.OW} pp</span>
          </div>
        </div>
        <div className={`mt-2 text-xs px-2 py-0.5 rounded-full border inline-block ${QUADRANT_BG[d.quadrant]}`}>
          {d.quadrant}
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
          onChange={(v) => { setYear(Number(v)); setHighlighted(null) }}
          options={YEAR_OPTS}
        />
        <div className="flex flex-wrap gap-2 ml-auto">
          {QUADRANT_ORDER.map((q) => (
            <Pill key={q} label={q} className={QUADRANT_BG[q]} />
          ))}
        </div>
      </ControlRow>

      {/* Scatter chart */}
      <ChartCard
        title={`IC Payline Typology — FY${year}`}
        subtitle="X: EEP50 (lower = more competitive)  ·  Y: Opportunity Width (higher = more probabilistic)  ·  Click a dot to highlight"
        footnote={`Quadrant reference lines at FY2025 IC medians (EEP50 = ${EEP50_MED}, OW = ${OW_MED} pp). ICs with null Opportunity Width are excluded from the scatter.`}
      >
        <ResponsiveContainer width="100%" height={460}>
          <ScatterChart margin={{ top: 28, right: 32, left: 0, bottom: 28 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis
              type="number"
              dataKey="EEP50"
              name="EEP50"
              domain={[0, 22]}
              {...X_AXIS_PROPS}
              label={{
                value: 'EEP50 — lower is more competitive',
                position: 'insideBottom',
                offset: -14,
                style: { fontSize: 11, fill: '#9CA3AF' },
              }}
            />
            <YAxis
              type="number"
              dataKey="OW"
              name="Opportunity Width"
              domain={[0, 28]}
              {...Y_AXIS_PROPS}
              label={{
                value: 'Opportunity Width (pp)',
                angle: -90,
                position: 'insideLeft',
                offset: 12,
                style: { fontSize: 11, fill: '#9CA3AF' },
              }}
            />
            <Tooltip content={<TooltipContent />} cursor={false} />

            {/* Quadrant dividers */}
            <ReferenceLine
              x={EEP50_MED}
              stroke="#E5E7EB"
              strokeWidth={1}
              strokeDasharray="4 3"
              label={{ value: `EEP50 ${EEP50_MED}`, position: 'top', fontSize: 9, fill: '#9CA3AF' }}
            />
            <ReferenceLine
              y={OW_MED}
              stroke="#E5E7EB"
              strokeWidth={1}
              strokeDasharray="4 3"
              label={{ value: `OW ${OW_MED}`, position: 'right', fontSize: 9, fill: '#9CA3AF' }}
            />

            <Scatter data={data} shape={<CustomDot />} name="Institute" />
          </ScatterChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Quadrant summary grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {QUADRANT_ORDER.map((q) => {
          const color = QUADRANT_COLORS[q]
          const ics   = byQuadrant[q] ?? []
          return (
            <div key={q} className="card p-4">
              <div
                className="text-xs font-semibold uppercase tracking-wide mb-1"
                style={{ color }}
              >
                {q}
              </div>
              <div className="text-3xl font-bold text-gray-800 mb-3">{ics.length}</div>
              <div className="flex flex-wrap gap-1">
                {ics.map((d) => (
                  <button
                    key={d.institute}
                    onClick={() => setHighlighted(highlighted === d.institute ? null : d.institute)}
                    className="text-xs px-1.5 py-0.5 rounded font-mono transition-all border"
                    style={{
                      borderColor:  highlighted === d.institute ? color : '#E5E7EB',
                      background:   highlighted === d.institute ? color + '18' : '#F9FAFB',
                      color:        highlighted === d.institute ? color : '#6B7280',
                    }}
                  >
                    {d.institute}
                    <span className="ml-1 opacity-60">({d.EEP50})</span>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <InsightCard section={section} />
    </div>
  )
}
