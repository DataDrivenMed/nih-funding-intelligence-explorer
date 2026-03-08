import { useState, useMemo } from 'react'
import {
  ComposedChart, Line, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ReferenceArea, ResponsiveContainer,
  LineChart,
} from 'recharts'
import type { Payline, BandSummary, Section } from '../types'
import TabHelpPanel from '../components/TabHelpPanel'
import MetricDefinitionsCard, { type TermDef } from '../components/MetricDefinitionsCard'
import InsightPanel from '../components/InsightPanel'
import { ChartCard, ControlRow, ExecSelect, MetricCard, ChartLegend } from '../components/ui'
import { generateCurve, logisticProb, BAND_MIDPOINTS, fmt } from '../utils'
import { generatePaylineInsight } from '../narrativeHelpers'
import { GRID_PROPS, X_AXIS_PROPS, Y_AXIS_PROPS, TOOLTIP_STYLE, C } from '../theme'

interface PaylineExplorerProps {
  paylines:    Payline[]
  bandSummary: BandSummary[]
  section:     Section
}

const PAYLINE_TERMS: TermDef[] = [
  {
    term: 'EEP80',
    meaning: 'The percentile at which an application has an 80% modeled probability of funding — the "high-confidence funding zone."',
    whyItMatters: 'Applications scoring at or below EEP80 are very likely funded. This is the conservative advising threshold — the lower bound of the safe zone.',
  },
  {
    term: 'EEP50',
    meaning: 'The percentile at which an application has a 50% modeled probability of funding — the "approximate coin-flip" statistical payline.',
    whyItMatters: 'The primary competitiveness benchmark. Scores at or below EEP50 have better-than-even odds. Scores above EEP50 are in the uncertain zone.',
  },
  {
    term: 'EEP20',
    meaning: 'The percentile at which an application has only a 20% modeled probability of funding — the lower edge of meaningful funding probability.',
    whyItMatters: 'Defines the practical limit for resubmission consideration. Scores beyond EEP20 carry very low probability and typically should not be prioritized.',
  },
  {
    term: 'Opportunity Width',
    meaning: 'The distance in percentile points between EEP20 and EEP80 (EEP20 − EEP80).',
    whyItMatters: 'A wider width means a broader gray zone — more flexibility in the competitive range. A narrower width means a steeper funding cliff where small score differences matter greatly.',
  },
  {
    term: 'Percentile Band',
    meaning: 'A grouped range of percentile scores (e.g., 1–5, 6–10, 11–15) used to aggregate applications.',
    whyItMatters: 'Orange dots on the chart show observed band-level funding rates, which validate the smooth GLM curve. Close alignment = good model fit (high R²).',
  },
  {
    term: 'Funding Rate',
    meaning: 'The fraction of applications submitted in a percentile band that were actually funded.',
    whyItMatters: 'The empirical ground truth. When orange dots closely follow the blue curve, the model fit is good.',
  },
  {
    term: 'Steep Cliff',
    meaning: 'A funding curve where probability drops sharply from high to low over a narrow percentile range (Opportunity Width < 6 pp).',
    whyItMatters: 'Steep cliffs leave little room for error — applications just above the payline face dramatically lower odds. Score precision is critical.',
  },
  {
    term: 'Broader Gray Zone',
    meaning: 'A funding curve where probability transitions gradually across a wide percentile range (Opportunity Width > 12 pp).',
    whyItMatters: 'Gray zones support broader resubmission investment — applications in the middle range retain meaningful probability worth strategic consideration.',
  },
  {
    term: 'Highly Selective',
    meaning: 'An IC or year with a very low EEP50 (typically < 12), meaning only applications with very strong scores have a meaningful chance.',
    whyItMatters: 'Highly selective environments require investigators to target significantly better scores before resubmitting.',
  },
  {
    term: 'More Permissive',
    meaning: 'An IC or year with a higher EEP50 (typically > 18), indicating that a broader range of scores is competitive for funding.',
    whyItMatters: 'More permissive environments support larger applicant pools and broader resubmission strategies.',
  },
]

function CurveTooltip({ active, payload }: {
  active?: boolean
  payload?: { name?: string; value?: number; payload?: { percentile?: number; band?: string } }[]
}) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ ...TOOLTIP_STYLE }}>
      {payload.map((p, i) => (
        <div key={i}>
          {p.name === 'Modeled' && (
            <>
              <div className="font-semibold text-gray-800">Percentile {p.payload?.percentile?.toFixed(1)}</div>
              <div className="text-gray-600 mt-0.5">
                Funding probability: <span className="font-bold text-gray-900">{p.value?.toFixed(1)}%</span>
              </div>
            </>
          )}
          {p.name === 'Actual' && (
            <>
              <div className="font-semibold text-gray-800">Band {p.payload?.band}</div>
              <div className="text-gray-600 mt-0.5">
                Observed rate: <span className="font-bold text-gray-900">{p.value}%</span>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  )
}

function TrendTooltip({ active, payload, label }: {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: number
}) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ ...TOOLTIP_STYLE }}>
      <div className="font-semibold text-gray-800 mb-1 pb-1 border-b border-gray-200">FY{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex justify-between gap-5 mt-0.5 text-xs">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-semibold tabular-nums">
            {p.name === 'Funding Rate' ? `${p.value.toFixed(1)}%` : p.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function PaylineExplorer({ paylines, bandSummary }: PaylineExplorerProps) {
  const [institute, setInstitute] = useState('ALL NIH')
  const [year,      setYear]      = useState(2025)
  const [myScore,   setMyScore]   = useState<number | null>(null)

  const institutes = [...new Set(paylines.map((p) => p.Institute))].sort()
  const years      = [...new Set(paylines.map((p) => p.Year))].sort((a, b) => b - a)

  const plRow    = paylines.find((p) => p.Institute === institute && p.Year === year)
  const hasModel = !!(plRow?.Beta0 != null && plRow?.Beta1 != null)

  const curveData = useMemo(() => {
    if (!hasModel) return []
    return generateCurve(plRow!.Beta0!, plRow!.Beta1!, 1, 34, 140)
  }, [hasModel, plRow])

  const dots = useMemo(() =>
    bandSummary
      .filter((b) => b.Institute === institute && b.Year === year && b.Funding_Rate !== null)
      .map((b) => ({
        percentile: BAND_MIDPOINTS[b.Percentile_Band] ?? null,
        actualRate: parseFloat(((b.Funding_Rate ?? 0) * 100).toFixed(1)),
        band:       b.Percentile_Band,
      }))
      .filter((d) => d.percentile !== null),
    [institute, year, bandSummary],
  )

  const myProb = useMemo(() => {
    if (myScore == null || !hasModel) return null
    return (logisticProb(myScore, plRow!.Beta0!, plRow!.Beta1!) * 100).toFixed(1)
  }, [myScore, hasModel, plRow])

  // Aggregate band data into yearly trend for selected institute
  const trendData = useMemo(() => {
    const yearSet = [...new Set(
      bandSummary.filter((b) => b.Institute === institute).map((b) => b.Year),
    )].sort((a, b) => a - b)

    return yearSet.map((yr) => {
      const bands = bandSummary.filter((b) => b.Institute === institute && b.Year === yr)
      const apps   = bands.reduce((s, b) => s + (b.Applications_Total ?? 0), 0)
      const funded = bands.reduce((s, b) => s + (b.Funded_Total ?? 0), 0)
      const rate   = apps > 0 ? parseFloat(((funded / apps) * 100).toFixed(1)) : null
      return { year: yr, applications: apps, funded, rate }
    })
  }, [institute, bandSummary])

  // Dynamic insight
  const insight = useMemo(
    () => generatePaylineInsight(institute, year, plRow),
    [institute, year, plRow],
  )

  return (
    <div className="space-y-5">

      <TabHelpPanel
        what="An interactive logistic probability curve showing how funding probability changes with percentile score for any NIH institute and fiscal year. The smooth blue curve is derived from a weighted GLM model; orange dots are observed band-level funding rates."
        howTo="Use the Institute and Year dropdowns to select any IC + FY combination. Drag the 'My score' slider to see the modeled probability for a specific percentile. The shaded blue region marks the opportunity window (EEP80–EEP20). Scroll down for the trend chart showing historical applications and funding rates."
        takeaway="Look at EEP50 to gauge overall competitiveness, Opportunity Width to assess the funding cliff steepness, and the curve shape to understand resubmission strategy. Narrow windows demand precise scores; broad windows allow more flexibility."
      />

      {/* Controls */}
      <ControlRow>
        <ExecSelect
          label="Institute"
          value={institute}
          onChange={setInstitute}
          options={institutes.map((ic) => ({ value: ic, label: ic }))}
        />
        <ExecSelect
          label="Year"
          value={year}
          onChange={(v) => setYear(Number(v))}
          options={years.map((y) => ({ value: y, label: `FY${y}` }))}
        />
        {hasModel && (
          <div className="flex items-center gap-3 ml-auto">
            <span className="text-xs font-semibold text-gray-700">My score:</span>
            <span className="text-sm font-bold text-gray-900 w-6 text-right">{myScore ?? '—'}</span>
            <input
              type="range" min={1} max={30}
              value={myScore ?? 15}
              onChange={(e) => setMyScore(Number(e.target.value))}
              className="w-28"
              style={{ accentColor: 'var(--accent)' }}
            />
            {myScore !== null && (
              <button
                onClick={() => setMyScore(null)}
                className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </ControlRow>

      {/* EEP snapshot cards */}
      {plRow && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MetricCard label="EEP80 — High-Confidence Zone" value={fmt(plRow.EEP80)} note="80% funding probability · safe zone" />
          <MetricCard
            label="EEP50 — Statistical Payline"
            value={fmt(plRow.EEP50)}
            note="50% probability · coin-flip threshold"
            alert={plRow.EEP50 !== null && plRow.EEP50 < 12}
          />
          <MetricCard label="EEP20 — Outer Funding Edge" value={fmt(plRow.EEP20)} note="20% probability · lower bound" />
          <MetricCard
            label="Opportunity Width"
            value={plRow.Opportunity_Width !== null ? `${fmt(plRow.Opportunity_Width)} pp` : 'N/A'}
            note={`R² = ${plRow.Pseudo_R2?.toFixed(3) ?? 'N/A'} · EEP20 − EEP80`}
          />
        </div>
      )}

      {/* Live probability result */}
      {myScore !== null && myProb !== null && (
        <div
          className="card flex items-center gap-5 px-6 py-5"
          style={{ borderColor: '#BFDBFE', background: '#EFF6FF' }}
        >
          <div className="text-4xl font-bold" style={{ color: C.BLUE }}>{myProb}%</div>
          <div>
            <div className="font-bold text-gray-900">Modeled funding probability</div>
            <div className="text-sm text-gray-600 mt-0.5">
              Score {myScore} · {institute} · FY{year}
              {plRow?.Pseudo_R2 != null && (
                <span className="ml-2 text-gray-500">(model R² = {plRow.Pseudo_R2.toFixed(3)})</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Logistic curve chart */}
      <ChartCard
        title={`Logistic Funding Probability Curve — ${institute} FY${year}`}
        subtitle="Smooth curve from fitted GLM (β₀, β₁) · Orange dots = observed band-level rates · Shaded region = opportunity window (EEP80 to EEP20)"
        footnote="P(funded | percentile) = 1 / (1 + exp(−(β₀ + β₁ × pct))). R² > 0.95 for ALL NIH across all years."
      >
        {!hasModel ? (
          <div className="flex items-center justify-center h-48 text-sm text-gray-600">
            Insufficient data to fit model for {institute} FY{year}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={380}>
            <ComposedChart margin={{ top: 12, right: 32, left: 0, bottom: 12 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis
                dataKey="percentile"
                type="number"
                domain={[0, 35]}
                {...X_AXIS_PROPS}
                label={{
                  value: 'Percentile Score',
                  position: 'insideBottom',
                  offset: -6,
                  style: { fontSize: 11, fill: '#4B5563' },
                }}
              />
              <YAxis
                {...Y_AXIS_PROPS}
                domain={[0, 105]}
                tickFormatter={(v) => `${v}%`}
                label={{
                  value: 'Funding Probability',
                  angle: -90,
                  position: 'insideLeft',
                  offset: 12,
                  style: { fontSize: 11, fill: '#4B5563' },
                }}
              />
              <Tooltip content={<CurveTooltip />} cursor={{ stroke: '#E5E7EB', strokeWidth: 2 }} />

              {plRow!.EEP80 !== null && plRow!.EEP20 !== null && (
                <ReferenceArea x1={plRow!.EEP80!} x2={plRow!.EEP20!} fill="#DBEAFE" fillOpacity={0.35} />
              )}
              {plRow!.EEP80 !== null && (
                <ReferenceLine
                  x={plRow!.EEP80!} stroke="#60A5FA" strokeWidth={1} strokeDasharray="3 2"
                  label={{ value: `EEP80 ${fmt(plRow!.EEP80)}`, position: 'insideTopLeft', fontSize: 9, fill: '#2563EB' }}
                />
              )}
              {plRow!.EEP50 !== null && (
                <ReferenceLine
                  x={plRow!.EEP50!} stroke={C.BLUE} strokeWidth={1.5}
                  label={{ value: `EEP50 ${fmt(plRow!.EEP50)}`, position: 'insideTopLeft', fontSize: 9, fill: C.BLUE }}
                />
              )}
              {plRow!.EEP20 !== null && (
                <ReferenceLine
                  x={plRow!.EEP20!} stroke="#94A3B8" strokeWidth={1} strokeDasharray="3 2"
                  label={{ value: `EEP20 ${fmt(plRow!.EEP20)}`, position: 'insideTopLeft', fontSize: 9, fill: '#4B5563' }}
                />
              )}
              {myScore !== null && (
                <ReferenceLine
                  x={myScore} stroke="#DC2626" strokeWidth={1.5} strokeDasharray="4 2"
                  label={{ value: `Score ${myScore} → ${myProb}%`, position: 'top', fontSize: 10, fill: '#DC2626' }}
                />
              )}

              <Line
                data={curveData} type="monotone" dataKey="prob"
                stroke={C.BLUE} strokeWidth={2} dot={false} name="Modeled"
              />
              <Scatter data={dots} dataKey="actualRate" fill="#D97706" name="Actual" shape="circle" />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* Historical trend chart for selected institute */}
      <ChartCard
        title={`Applications & Funding Rate Trend — ${institute}, FY2014–2025`}
        subtitle="Total applications (left axis) and overall funding rate (right axis) across all percentile bands."
        footnote="Funding rate computed from sum of funded / sum of applications across all percentile bands for the selected institute."
        legend={
          <ChartLegend items={[
            { color: C.BLUE,    label: 'Applications' },
            { color: '#059669', label: 'Funded' },
            { color: '#D97706', label: 'Funding Rate (%)' },
          ]} />
        }
      >
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trendData} margin={{ top: 12, right: 56, left: 0, bottom: 8 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="year" {...X_AXIS_PROPS} tickFormatter={(v) => `FY${v}`} />
            <YAxis
              yAxisId="left"
              {...Y_AXIS_PROPS}
              label={{
                value: 'Count',
                angle: -90,
                position: 'insideLeft',
                offset: 12,
                style: { fontSize: 11, fill: '#4B5563' },
              }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              {...Y_AXIS_PROPS}
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              label={{
                value: 'Funding Rate',
                angle: 90,
                position: 'insideRight',
                offset: 8,
                style: { fontSize: 11, fill: '#4B5563' },
              }}
            />
            <Tooltip content={<TrendTooltip />} cursor={{ stroke: '#E5E7EB', strokeWidth: 2 }} />
            <ReferenceLine
              x={2025} yAxisId="left" stroke={C.RED}
              strokeWidth={1} strokeDasharray="4 3"
              label={{ value: 'FY2025', position: 'top', fontSize: 10, fill: C.RED }}
            />
            <Line
              yAxisId="left"
              type="monotone" dataKey="applications"
              stroke={C.BLUE} strokeWidth={1.5}
              dot={false} name="Applications"
            />
            <Line
              yAxisId="left"
              type="monotone" dataKey="funded"
              stroke="#059669" strokeWidth={1.5}
              dot={false} name="Funded"
            />
            <Line
              yAxisId="right"
              type="monotone" dataKey="rate"
              stroke="#D97706" strokeWidth={2}
              dot={{ r: 3, fill: '#D97706', strokeWidth: 0 }}
              activeDot={{ r: 4, fill: '#D97706', strokeWidth: 0 }}
              name="Funding Rate"
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Term definitions */}
      <MetricDefinitionsCard terms={PAYLINE_TERMS} title="Key Term Definitions" />

      {/* Dynamic insight panel */}
      <InsightPanel
        dataInsight={insight.dataInsight}
        interpretation={insight.interpretation}
        leadershipImplication={insight.leadershipImplication}
        caution={insight.caution}
        contextLabel={`${institute} · FY${year}`}
      />
    </div>
  )
}
