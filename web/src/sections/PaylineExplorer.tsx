import { useState, useMemo } from 'react'
import {
  ComposedChart, Line, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ReferenceArea, ResponsiveContainer,
} from 'recharts'
import type { Payline, BandSummary, Section } from '../types'
import InsightCard from '../components/InsightCard'
import { ChartCard, ControlRow, ExecSelect, MetricCard } from '../components/ui'
import { generateCurve, logisticProb, BAND_MIDPOINTS, fmt } from '../utils'
import { GRID_PROPS, X_AXIS_PROPS, Y_AXIS_PROPS, TOOLTIP_STYLE, C } from '../theme'

interface PaylineExplorerProps {
  paylines:    Payline[]
  bandSummary: BandSummary[]
  section:     Section
}

function TooltipContent({ active, payload }: {
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
              <div className="font-medium text-gray-700">
                Percentile {p.payload?.percentile?.toFixed(1)}
              </div>
              <div className="text-gray-500 mt-0.5">
                Funding probability: <span className="font-semibold text-gray-800">{p.value?.toFixed(1)}%</span>
              </div>
            </>
          )}
          {p.name === 'Actual' && (
            <>
              <div className="font-medium text-gray-700">Band {p.payload?.band}</div>
              <div className="text-gray-500 mt-0.5">
                Observed rate: <span className="font-semibold text-gray-800">{p.value}%</span>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  )
}

export default function PaylineExplorer({ paylines, bandSummary, section }: PaylineExplorerProps) {
  const [institute, setInstitute] = useState('ALL NIH')
  const [year,      setYear]      = useState(2025)
  const [myScore,   setMyScore]   = useState<number | null>(null)

  const institutes = [...new Set(paylines.map((p) => p.Institute))].sort()
  const years      = [...new Set(paylines.map((p) => p.Year))].sort((a, b) => b - a)

  const plRow = paylines.find((p) => p.Institute === institute && p.Year === year)
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
        <ExecSelect
          label="Year"
          value={year}
          onChange={(v) => setYear(Number(v))}
          options={years.map((y) => ({ value: y, label: `FY${y}` }))}
        />
        {hasModel && (
          <div className="flex items-center gap-3 ml-auto">
            <span className="text-xs font-medium text-gray-500">My score:</span>
            <span className="text-sm font-bold text-gray-800 w-6 text-right">{myScore ?? '—'}</span>
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
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
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
          <MetricCard label="EEP80" value={fmt(plRow.EEP80)} note="80% funding probability" />
          <MetricCard label="EEP50 — Statistical Payline" value={fmt(plRow.EEP50)} note="50% probability" alert={plRow.EEP50 !== null && plRow.EEP50 < 12} />
          <MetricCard label="EEP20" value={fmt(plRow.EEP20)} note="20% probability · outer edge" />
          <MetricCard
            label="Opportunity Width"
            value={plRow.Opportunity_Width !== null ? `${fmt(plRow.Opportunity_Width)} pp` : 'N/A'}
            note={`R² = ${plRow.Pseudo_R2?.toFixed(3) ?? 'N/A'} · model fit quality`}
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
            <div className="font-semibold text-gray-800">Modeled funding probability</div>
            <div className="text-sm text-gray-500 mt-0.5">
              Score {myScore} · {institute} · FY{year}
              {plRow?.Pseudo_R2 != null && (
                <span className="ml-2 text-gray-400">
                  (model R² = {plRow.Pseudo_R2.toFixed(3)})
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      <ChartCard
        title={`Logistic Funding Probability Curve — ${institute} FY${year}`}
        subtitle="Smooth curve from fitted GLM (β₀, β₁) · Orange dots = observed band-level rates · Shaded region = opportunity window"
        footnote="Blue curve represents P(funded | percentile) = 1 / (1 + exp(−(β₀ + β₁ × pct))). R² > 0.95 for ALL NIH across all years."
      >
        {!hasModel ? (
          <div className="flex items-center justify-center h-48 text-sm text-gray-400">
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
                  style: { fontSize: 11, fill: '#9CA3AF' },
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
                  style: { fontSize: 11, fill: '#9CA3AF' },
                }}
              />
              <Tooltip content={<TooltipContent />} cursor={{ stroke: '#F3F4F6', strokeWidth: 2 }} />

              {/* Opportunity window shading */}
              {plRow!.EEP80 !== null && plRow!.EEP20 !== null && (
                <ReferenceArea
                  x1={plRow!.EEP80!}
                  x2={plRow!.EEP20!}
                  fill="#DBEAFE"
                  fillOpacity={0.35}
                />
              )}

              {/* EEP reference lines */}
              {plRow!.EEP80 !== null && (
                <ReferenceLine x={plRow!.EEP80!} stroke="#93C5FD" strokeWidth={1} strokeDasharray="3 2"
                  label={{ value: `EEP80 ${fmt(plRow!.EEP80)}`, position: 'insideTopLeft', fontSize: 9, fill: '#93C5FD' }} />
              )}
              {plRow!.EEP50 !== null && (
                <ReferenceLine x={plRow!.EEP50!} stroke={C.BLUE} strokeWidth={1.5}
                  label={{ value: `EEP50 ${fmt(plRow!.EEP50)}`, position: 'insideTopLeft', fontSize: 9, fill: C.BLUE }} />
              )}
              {plRow!.EEP20 !== null && (
                <ReferenceLine x={plRow!.EEP20!} stroke="#CBD5E1" strokeWidth={1} strokeDasharray="3 2"
                  label={{ value: `EEP20 ${fmt(plRow!.EEP20)}`, position: 'insideTopLeft', fontSize: 9, fill: '#94A3B8' }} />
              )}

              {/* User score */}
              {myScore !== null && (
                <ReferenceLine
                  x={myScore}
                  stroke="#DC2626"
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                  label={{ value: `Score ${myScore} → ${myProb}%`, position: 'top', fontSize: 10, fill: '#DC2626' }}
                />
              )}

              {/* Smooth modeled curve */}
              <Line
                data={curveData}
                type="monotone"
                dataKey="prob"
                stroke={C.BLUE}
                strokeWidth={2}
                dot={false}
                name="Modeled"
              />

              {/* Actual band dots */}
              <Scatter
                data={dots}
                dataKey="actualRate"
                fill="#D97706"
                name="Actual"
                shape="circle"
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <InsightCard section={section} />
    </div>
  )
}
