import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import type { BandSummary, Section } from '../types'
import InsightCard from '../components/InsightCard'
import { ChartCard, ControlRow, ExecSelect } from '../components/ui'
import { BAND_ORDER } from '../utils'
import { GRID_PROPS, X_AXIS_PROPS, Y_AXIS_PROPS, TOOLTIP_STYLE } from '../theme'

interface BandLandscapeProps {
  bandSummary: BandSummary[]
  section: Section
}

const DEFAULT_YEARS = [2019, 2024, 2025]
const TOGGLE_YEARS  = [2014, 2016, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]

// Refined year colors for executive palette
const EXEC_YEAR_COLORS: Record<number, string> = {
  2014: '#CBD5E1', 2015: '#CBD5E1', 2016: '#CBD5E1',
  2017: '#CBD5E1', 2018: '#CBD5E1',
  2019: '#94A3B8',  // baseline
  2020: '#9CA3AF', 2021: '#9CA3AF',
  2022: '#64748B', 2023: '#64748B',
  2024: '#2563EB',  // recent
  2025: '#1E3A8A',  // current (darker blue — alert without using red in bars)
}


export default function BandLandscape({ bandSummary, section }: BandLandscapeProps) {
  const [institute,     setInstitute]     = useState('ALL NIH')
  const [selectedYears, setSelectedYears] = useState<number[]>(DEFAULT_YEARS)

  function TooltipContent({ active, payload, label }: {
    active?: boolean
    payload?: { name: string; value: number | null; color: string }[]
    label?: string
  }) {
    if (!active || !payload?.length) return null
    return (
      <div style={{ ...TOOLTIP_STYLE }}>
        <div className="font-semibold text-gray-700 pb-1 mb-1 border-b border-gray-100">
          Band {label} · {institute}
        </div>
        {payload.map((p) => (
          p.value !== null && p.value !== undefined && (
            <div key={p.name} className="flex justify-between gap-6 mt-0.5 text-xs">
              <span style={{ color: p.color }}>{p.name}</span>
              <span className="font-semibold tabular-nums">{(p.value as number).toFixed(1)}%</span>
            </div>
          )
        ))}
      </div>
    )
  }

  const institutes = [...new Set(bandSummary.map((b) => b.Institute))].sort()

  const data = BAND_ORDER.map((band) => {
    const row: Record<string, string | number | null> = { band }
    for (const yr of selectedYears) {
      const rec = bandSummary.find(
        (b) => b.Institute === institute && b.Year === yr && b.Percentile_Band === band,
      )
      row[`FY${yr}`] =
        rec?.Funding_Rate !== null && rec?.Funding_Rate !== undefined
          ? parseFloat((rec.Funding_Rate * 100).toFixed(1))
          : null
    }
    return row
  })

  const toggleYear = (yr: number) =>
    setSelectedYears((prev) =>
      prev.includes(yr) ? prev.filter((y) => y !== yr) : [...prev, yr].sort(),
    )

  return (
    <div className="space-y-5">
      {/* Controls */}
      <ControlRow>
        <ExecSelect
          label="Institute"
          value={institute}
          onChange={setInstitute}
          options={institutes.map((ic) => ({ value: ic, label: ic }))}
        />
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500">Compare years:</span>
          <div className="flex flex-wrap gap-1">
            {TOGGLE_YEARS.map((yr) => {
              const active = selectedYears.includes(yr)
              const color  = EXEC_YEAR_COLORS[yr] ?? '#94A3B8'
              return (
                <button
                  key={yr}
                  onClick={() => toggleYear(yr)}
                  className="text-xs px-2 py-1 rounded border transition-all font-medium"
                  style={{
                    background:  active ? color : '#fff',
                    borderColor: active ? color : '#E5E7EB',
                    color:       active ? '#fff' : '#6B7280',
                  }}
                >
                  {yr}
                </button>
              )
            })}
          </div>
        </div>
      </ControlRow>

      {/* Chart */}
      <ChartCard
        title={`Funding Rate by Percentile Band — ${institute}`}
        subtitle="Percentage of applications funded within each percentile band. Collapse in 11–20 bands reveals FY2025 payline compression."
        footnote="Bands with fewer than 30 applications carry statistical uncertainty and should not be used for IC-specific planning in isolation."
      >
        <ResponsiveContainer width="100%" height={380}>
          <BarChart data={data} margin={{ top: 12, right: 24, left: 0, bottom: 8 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis
              dataKey="band"
              {...X_AXIS_PROPS}
              label={{
                value: 'Percentile Band',
                position: 'insideBottom',
                offset: -4,
                style: { fontSize: 11, fill: '#9CA3AF' },
              }}
            />
            <YAxis
              {...Y_AXIS_PROPS}
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              label={{
                value: 'Funding Rate',
                angle: -90,
                position: 'insideLeft',
                offset: 12,
                style: { fontSize: 11, fill: '#9CA3AF' },
              }}
            />
            <Tooltip content={<TooltipContent />} cursor={{ fill: '#F9FAFB' }} />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 8, color: '#6B7280' }}
            />
            {selectedYears.map((yr) => (
              <Bar
                key={yr}
                dataKey={`FY${yr}`}
                name={`FY${yr}`}
                fill={EXEC_YEAR_COLORS[yr] ?? '#94A3B8'}
                radius={[2, 2, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <InsightCard section={section} />
    </div>
  )
}
