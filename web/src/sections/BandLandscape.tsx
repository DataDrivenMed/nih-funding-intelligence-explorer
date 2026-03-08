import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import type { BandSummary, Section } from '../types'
import TabHelpPanel from '../components/TabHelpPanel'
import MetricDefinitionsCard, { type TermDef } from '../components/MetricDefinitionsCard'
import InsightPanel from '../components/InsightPanel'
import { ChartCard, ControlRow, ExecSelect } from '../components/ui'
import { BAND_ORDER } from '../utils'
import { generateFundingLandscapeInsight } from '../narrativeHelpers'
import { GRID_PROPS, X_AXIS_PROPS, Y_AXIS_PROPS, TOOLTIP_STYLE } from '../theme'

interface BandLandscapeProps {
  bandSummary: BandSummary[]
  section: Section
}

const DEFAULT_YEARS = [2019, 2024, 2025]
const TOGGLE_YEARS  = [2014, 2016, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]

const EXEC_YEAR_COLORS: Record<number, string> = {
  2014: '#CBD5E1', 2015: '#CBD5E1', 2016: '#CBD5E1',
  2017: '#CBD5E1', 2018: '#CBD5E1',
  2019: '#94A3B8',
  2020: '#9CA3AF', 2021: '#9CA3AF',
  2022: '#64748B', 2023: '#64748B',
  2024: '#2563EB',
  2025: '#1E3A8A',
}

const BAND_TERMS: TermDef[] = [
  {
    term: 'Percentile Band',
    meaning: 'A grouped range of percentile scores (e.g., 1–5, 6–10, 11–15) used to aggregate applications for analysis.',
    whyItMatters: 'Bands reveal how funding rates change at each score tier — the steeper the drop from band to band, the sharper the funding cliff.',
  },
  {
    term: 'Funding Rate',
    meaning: 'The fraction of applications submitted in a percentile band that were actually funded — the observed proportion.',
    whyItMatters: 'The empirical ground truth of competitiveness. A 90% funding rate in the 1–5 band vs 15% in the 11–15 band quantifies the real cost of a marginal score difference.',
  },
  {
    term: 'Application Volume',
    meaning: 'The total number of applications submitted within a percentile band in a given fiscal year.',
    whyItMatters: 'High application volume in a band means more competition for a limited pool. Bands with few applications carry more statistical uncertainty in their funding rates.',
  },
  {
    term: 'Highly Selective',
    meaning: 'An environment where even the top bands (1–5, 6–10) show depressed funding rates, typically below 60% and 20% respectively.',
    whyItMatters: 'Signals that the overall funding environment is compressed — most funded applications cluster in only the highest-scoring tier.',
  },
  {
    term: 'More Permissive',
    meaning: 'An environment where funding rates remain above historical averages across multiple bands, and the drop-off is more gradual.',
    whyItMatters: 'A more permissive band profile means that near-payline applications (bands 11–15) still carry meaningful funding probability.',
  },
]

export default function BandLandscape({ bandSummary }: BandLandscapeProps) {
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
        {payload.map((p) =>
          p.value !== null && p.value !== undefined ? (
            <div key={p.name} className="flex justify-between gap-6 mt-0.5 text-xs">
              <span style={{ color: p.color }}>{p.name}</span>
              <span className="font-semibold tabular-nums">{(p.value as number).toFixed(1)}%</span>
            </div>
          ) : null,
        )}
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

  // Dynamic insight — updates when institute or selectedYears changes
  const insight = useMemo(
    () => generateFundingLandscapeInsight(institute, selectedYears, bandSummary),
    [institute, selectedYears, bandSummary],
  )

  const contextLabel = selectedYears.length > 0
    ? `${institute} · FY${selectedYears.join(', FY')}`
    : `${institute} · no years selected`

  return (
    <div className="space-y-5">

      <TabHelpPanel
        what="Funding rates (percent of applications funded) for each percentile band, for any institute and set of fiscal years. Bands are 1–5, 6–10, 11–15, 16–20, 21–25, and 26+. Higher bands (smaller percentile numbers) correspond to stronger applications."
        howTo="Use the Institute dropdown to select any IC. Toggle year buttons to add or remove fiscal years from the comparison. Hover over bars to see exact funding rates. Select FY2024 and FY2025 together to see the compression effect."
        takeaway="The steeper the funding rate drop between bands 1–5 and 6–10, the sharper the payline. FY2025 shows compressed rates even in the top bands for most institutes — a historically unusual pattern."
      />

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
        subtitle="Percentage of applications funded within each percentile band. Lower percentile numbers = stronger applications."
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
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8, color: '#6B7280' }} />
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

      {/* Term definitions */}
      <MetricDefinitionsCard terms={BAND_TERMS} title="Key Term Definitions" />

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
