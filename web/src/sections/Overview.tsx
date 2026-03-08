import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ReferenceArea, ResponsiveContainer,
} from 'recharts'
import type { Payline, Section } from '../types'
import InsightCard from '../components/InsightCard'
import TabHelpPanel from '../components/TabHelpPanel'
import MetricDefinitionsCard, { type TermDef } from '../components/MetricDefinitionsCard'
import { MetricCard, ChartCard, ChartLegend } from '../components/ui'
import { C, GRID_PROPS, X_AXIS_PROPS, Y_AXIS_PROPS, TOOLTIP_STYLE, TOOLTIP_CURSOR } from '../theme'

interface OverviewProps {
  paylines: Payline[]
  section: Section
}

const OVERVIEW_TERMS: TermDef[] = [
  {
    term: 'EEP50',
    meaning:
      'The percentile score at which a submitted application has a 50% modeled probability of receiving funding — the "statistical payline."',
    whyItMatters:
      'The primary competitiveness benchmark: half of applications scoring at this percentile get funded, half don\'t. Track this across years to gauge how the funding environment is shifting.',
  },
  {
    term: 'EEP80',
    meaning:
      'The percentile score at which an application has an 80% modeled probability of funding — the safe-zone threshold.',
    whyItMatters:
      'Use as the conservative advising threshold. Applications scoring here are very likely funded. Scores below EEP80 are in the "high-confidence" zone.',
  },
  {
    term: 'EEP20',
    meaning:
      'The percentile score at which an application has only a 20% modeled probability of funding — the outer edge of meaningful funding probability.',
    whyItMatters:
      'Defines the limit of realistic resubmission territory. Scores above EEP20 have a less than 1-in-5 chance and generally should not be prioritized for resubmission.',
  },
  {
    term: 'Opportunity Width',
    meaning:
      'EEP20 minus EEP80 — the range of percentile scores over which funding probability transitions from 80% down to 20%.',
    whyItMatters:
      'Measures how "sharp" or "gradual" the funding cliff is. A wide window means resubmissions retain value across a broad score range; a narrow window means the payline is a hard cutoff.',
  },
  {
    term: 'Funding Rate',
    meaning:
      'The fraction of submitted applications in a percentile band that were awarded funding — the raw observed proportion funded.',
    whyItMatters:
      'The empirical ground truth underlying the model. Validates GLM predictions and reveals actual funding outcomes by score range.',
  },
]

function TooltipContent({ active, payload, label }: {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: number
}) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ ...TOOLTIP_STYLE }}>
      <div className="font-semibold text-gray-800 mb-1 pb-1 border-b border-gray-200">
        FY{label} · ALL NIH
      </div>
      {payload.map((p) => (
        <div key={p.name} className="flex justify-between gap-6 mt-1">
          <span style={{ color: p.color }} className="font-medium">{p.name}</span>
          <span className="font-semibold text-gray-900 tabular-nums">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function Overview({ paylines, section }: OverviewProps) {
  const allNih = paylines
    .filter((p) => p.Institute === 'ALL NIH')
    .sort((a, b) => a.Year - b.Year)

  const chartData = allNih
    .filter((p) => p.EEP50 !== null)
    .map((p) => ({
      year:  p.Year,
      EEP80: p.EEP80 !== null ? parseFloat(p.EEP80.toFixed(1)) : null,
      EEP50: p.EEP50 !== null ? parseFloat(p.EEP50.toFixed(1)) : null,
      EEP20: p.EEP20 !== null ? parseFloat(p.EEP20.toFixed(1)) : null,
    }))

  // KPI values
  const r25 = allNih.find((p) => p.Year === 2025)
  const r24 = allNih.find((p) => p.Year === 2024)
  const hist = allNih.filter((p) => p.Year >= 2015 && p.Year <= 2024 && p.EEP50 !== null)
  const histMean = hist.reduce((s, p) => s + (p.EEP50 ?? 0), 0) / hist.length

  return (
    <div className="space-y-5">

      {/* How to read this tab */}
      <TabHelpPanel
        what="A twelve-year view of NIH funding probability thresholds for ALL NIH (2014–2025). EEP50 is the percentile score at which an application has a 50% chance of funding, derived from a weighted logistic regression model fit to each fiscal year."
        howTo="This tab is informational — no dropdowns to configure. Hover over the chart to see exact EEP values for each year. Use the IC Comparison and Payline Explorer tabs to drill into individual institutes."
        takeaway="FY2025 shows a dramatic compression: the ALL NIH EEP50 dropped to 11.1 — its lowest in 12 years and more than 5 percentile points below FY2024. All 20 institutes declined simultaneously, suggesting a system-wide policy or budget shift."
      />

      {/* Introductory context panel */}
      <div className="card overflow-hidden">
        <div className="flex divide-x divide-gray-200">

          <div className="p-5 flex-1" style={{ minWidth: 0 }}>
            <div className="text-label mb-2">About This Tool</div>
            <p className="text-sm text-gray-700 leading-relaxed">
              This dashboard applies weighted binomial logistic regression to NIH Data Book Report 302
              (FY2014–FY2025) to derive the <strong className="text-gray-900">Effective Expected Payline (EEP)</strong> —
              the percentile at which an R01-equivalent application carries a specified modeled probability of
              funding. Two GLM parameters (β₀, β₁) are fit per institute-year pair, enabling smooth probability
              curves and analytical EEP computation: EEP(q) = (logit(q) − β₀) / β₁.
              All 230 converged models pass 68 automated quality checks.
            </p>
          </div>

          <div className="p-5 flex-1" style={{ minWidth: 0 }}>
            <div className="text-label mb-2" style={{ color: '#1E3A8A' }}>Why It Matters</div>
            <p className="text-sm text-gray-700 leading-relaxed">
              NIH paylines are frequently interpreted as binary thresholds. In practice, funding probability
              transitions continuously across a range of 8–15 percentile points. The{' '}
              <strong className="text-gray-900">Opportunity Width</strong> metric (EEP20 − EEP80) quantifies
              how wide or narrow this window is across institutes and years — directly informing resubmission
              strategy, portfolio risk assessment, and faculty advising. The FY2025 compression to an
              ALL-NIH EEP50 of 11.1 represents a historically significant shift.
            </p>
          </div>

          <div className="p-5" style={{ minWidth: 200 }}>
            <div className="text-label mb-3">Data Provenance</div>
            <div className="space-y-1.5 text-xs text-gray-600">
              <div className="flex justify-between gap-4">
                <span>Source</span>
                <span className="font-semibold text-gray-800">NIH Data Book Report 302</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Coverage</span>
                <span className="font-semibold text-gray-800">FY2014–FY2025 · 20 ICs</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Models fit</span>
                <span className="font-semibold text-gray-800">230 converged GLMs</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Mean R²</span>
                <span className="font-semibold text-gray-800">0.806 (ALL NIH: 0.963)</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>QC checks</span>
                <span className="font-semibold text-gray-800">68 passed · 0 failed</span>
              </div>
              <div
                className="mt-2 pt-2 border-t text-xs leading-relaxed font-medium"
                style={{ borderColor: '#FDE68A', color: '#92400E' }}
              >
                FY2025 is preliminary. Confirm before official reporting.
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="ALL NIH EEP50 — FY2025"
          value={r25?.EEP50?.toFixed(1) ?? 'N/A'}
          delta={r24?.EEP50 != null && r25?.EEP50 != null
            ? `${(r25.EEP50 - r24.EEP50).toFixed(1)} pp vs FY2024`
            : undefined}
          deltaDown
          alert
          note="Historical mean 2015–2024: ~18.9"
        />
        <MetricCard
          label="Opportunity Width — FY2025"
          value={r25?.Opportunity_Width != null ? `${r25.Opportunity_Width.toFixed(1)} pp` : 'N/A'}
          delta={r24?.Opportunity_Width != null && r25?.Opportunity_Width != null
            ? `${(r25.Opportunity_Width - r24.Opportunity_Width).toFixed(1)} pp vs FY2024`
            : undefined}
          deltaDown
          note="EEP20 − EEP80 · narrowest in 12-year dataset"
        />
        <MetricCard
          label="EEP80 — FY2025"
          value={r25?.EEP80?.toFixed(1) ?? 'N/A'}
          note="80% funding probability threshold"
        />
        <MetricCard
          label="EEP20 — FY2025"
          value={r25?.EEP20?.toFixed(1) ?? 'N/A'}
          note="20% probability · outer edge of meaningful zone"
        />
      </div>

      {/* Chart */}
      <ChartCard
        title="Effective Expected Paylines — ALL NIH, FY2014–2025"
        subtitle="EEP50 = 50% funding probability (statistical payline)  ·  EEP80 / EEP20 = outer probability bounds"
        footnote="Shaded region (2019–2023): stable era, EEP50 range 18.4–19.4  ·  FY2025 marked in red  ·  Grey dashed = historical mean (FY2015–2024)"
        legend={
          <ChartLegend items={[
            { color: C.BLUE,      label: 'EEP50 (50% payline)' },
            { color: C.BLUE_LT,   label: 'EEP80 (80% prob)' },
            { color: C.SLATE_XLT, label: 'EEP20 (20% prob)', dashed: true },
          ]} />
        }
      >
        <ResponsiveContainer width="100%" height={360}>
          <LineChart data={chartData} margin={{ top: 12, right: 32, left: 0, bottom: 8 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="year" {...X_AXIS_PROPS} tickFormatter={(v) => `FY${v}`} />
            <YAxis
              {...Y_AXIS_PROPS}
              domain={[0, 32]}
              label={{
                value: 'Percentile',
                angle: -90,
                position: 'insideLeft',
                offset: 12,
                style: { fontSize: 11, fill: '#4B5563' },
              }}
            />
            <Tooltip content={<TooltipContent />} cursor={TOOLTIP_CURSOR} />

            {/* Stable era shading */}
            <ReferenceArea
              x1={2019} x2={2023}
              fill="#F0FDF4"
              fillOpacity={0.6}
              label={{ value: 'Stable 2019–2023', position: 'top', fontSize: 10, fill: '#374151' }}
            />

            {/* FY2025 marker */}
            <ReferenceLine
              x={2025}
              stroke={C.RED}
              strokeWidth={1}
              strokeDasharray="4 3"
              label={{ value: 'FY2025', position: 'insideTopLeft', fontSize: 10, fill: C.RED }}
            />

            {/* Historical mean reference */}
            <ReferenceLine
              y={parseFloat(histMean.toFixed(1))}
              stroke="#9CA3AF"
              strokeWidth={1}
              strokeDasharray="6 3"
              label={{ value: `Hist. mean ${histMean.toFixed(1)}`, position: 'right', fontSize: 9, fill: '#6B7280' }}
            />

            <Line
              type="monotone" dataKey="EEP20"
              stroke={C.SLATE_XLT} strokeWidth={1.5} strokeDasharray="4 3"
              dot={false} name="EEP20"
            />
            <Line
              type="monotone" dataKey="EEP80"
              stroke={C.BLUE_LT} strokeWidth={1.5}
              dot={false} name="EEP80"
            />
            <Line
              type="monotone" dataKey="EEP50"
              stroke={C.BLUE} strokeWidth={2.5}
              dot={{ r: 3, fill: C.BLUE, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: C.BLUE, strokeWidth: 0 }}
              name="EEP50"
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Term definitions */}
      <MetricDefinitionsCard terms={OVERVIEW_TERMS} title="Key Term Definitions" />

      <InsightCard section={section} />
    </div>
  )
}
