import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ReferenceArea, ResponsiveContainer,
} from 'recharts'
import type { Payline, Section } from '../types'
import InsightCard from '../components/InsightCard'
import { MetricCard, ChartCard, ChartLegend } from '../components/ui'
import { C, GRID_PROPS, X_AXIS_PROPS, Y_AXIS_PROPS, TOOLTIP_STYLE, TOOLTIP_CURSOR } from '../theme'

interface OverviewProps {
  paylines: Payline[]
  section: Section
}

function TooltipContent({ active, payload, label }: {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: number
}) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ ...TOOLTIP_STYLE }}>
      <div className="font-semibold text-gray-700 mb-1 pb-1 border-b border-gray-100">
        FY{label} · ALL NIH
      </div>
      {payload.map((p) => (
        <div key={p.name} className="flex justify-between gap-6 mt-1">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-semibold text-gray-800 tabular-nums">{p.value}</span>
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
  const r19 = allNih.find((p) => p.Year === 2019)
  const hist = allNih.filter((p) => p.Year >= 2015 && p.Year <= 2024 && p.EEP50 !== null)
  const histMean = hist.reduce((s, p) => s + (p.EEP50 ?? 0), 0) / hist.length

  return (
    <div className="space-y-5">

      {/* Introductory context panel */}
      <div className="card overflow-hidden">
        <div className="flex divide-x divide-gray-100">

          <div className="p-5 flex-1" style={{ minWidth: 0 }}>
            <div className="text-label mb-2">About This Tool</div>
            <p className="text-sm text-gray-600 leading-relaxed">
              This dashboard applies weighted binomial logistic regression to NIH Data Book Report 302
              (FY2014–FY2025) to derive the <strong className="text-gray-700">Effective Expected Payline (EEP)</strong> —
              the percentile at which an R01-equivalent application carries a specified modeled probability of
              funding. Two GLM parameters (β₀, β₁) are fit per institute-year pair, enabling smooth probability
              curves and analytical EEP computation: EEP(q) = (logit(q) − β₀) / β₁.
              All 230 converged models pass 68 automated quality checks.
            </p>
          </div>

          <div className="p-5 flex-1" style={{ minWidth: 0 }}>
            <div className="text-label mb-2" style={{ color: '#1E3A8A' }}>Why It Matters</div>
            <p className="text-sm text-gray-600 leading-relaxed">
              NIH paylines are frequently interpreted as binary thresholds. In practice, funding probability
              transitions continuously across a range of 8–15 percentile points. The{' '}
              <strong className="text-gray-700">Opportunity Width</strong> metric (EEP20 − EEP80) quantifies
              how wide or narrow this window is across institutes and years — directly informing resubmission
              strategy, portfolio risk assessment, and faculty advising. The FY2025 compression to an
              ALL-NIH EEP50 of 11.1 represents a historically significant shift.
            </p>
          </div>

          <div className="p-5" style={{ minWidth: 200 }}>
            <div className="text-label mb-3">Data Provenance</div>
            <div className="space-y-1.5 text-xs text-gray-500">
              <div className="flex justify-between gap-4">
                <span>Source</span>
                <span className="font-medium text-gray-700">NIH Data Book Report 302</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Coverage</span>
                <span className="font-medium text-gray-700">FY2014–FY2025 · 20 ICs</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Models fit</span>
                <span className="font-medium text-gray-700">230 converged GLMs</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Mean R²</span>
                <span className="font-medium text-gray-700">0.806 (ALL NIH: 0.963)</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>QC checks</span>
                <span className="font-medium text-gray-700">68 passed · 0 failed</span>
              </div>
              <div
                className="mt-2 pt-2 border-t text-xs leading-relaxed"
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
        footnote="Shaded region (2019–2023): stable era, EEP50 range 18.4–19.4  ·  FY2025 marked in red"
        legend={
          <ChartLegend items={[
            { color: C.BLUE,     label: 'EEP50 (50% payline)' },
            { color: C.BLUE_LT,  label: 'EEP80 (80% prob)' },
            { color: C.SLATE_XLT,label: 'EEP20 (20% prob)', dashed: true },
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
                style: { fontSize: 11, fill: '#9CA3AF' },
              }}
            />
            <Tooltip content={<TooltipContent />} cursor={TOOLTIP_CURSOR} />

            {/* Stable era shading */}
            <ReferenceArea
              x1={2019} x2={2023}
              fill="#F0FDF4"
              fillOpacity={0.6}
              label={{ value: 'Stable 2019–2023', position: 'top', fontSize: 10, fill: '#6B7280' }}
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
              stroke="#E5E7EB"
              strokeWidth={1}
              strokeDasharray="6 3"
              label={{ value: `Hist. mean ${histMean.toFixed(1)}`, position: 'right', fontSize: 9, fill: '#9CA3AF' }}
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

      <InsightCard section={section} />
    </div>
  )
}
