import type { Section } from '../types'
import InsightCard from '../components/InsightCard'

interface MethodsCaveatsProps {
  section: Section
}

const STEPS = [
  {
    n: '1',
    title: 'Source Data',
    desc: 'NIH Data Book Report ID 302 (Funding Patterns by IC), exported March 6, 2026. 238 Excel files, FY2014–FY2025, 20 institutes.',
  },
  {
    n: '2',
    title: 'Cleaning',
    desc: "All 238 files parsed in-memory. 'D' (suppressed) R56 values → NaN. Percentile = 0 rows dropped. Funded_Total = R01-equivalent + R56 (NaN-safe).",
  },
  {
    n: '3',
    title: 'Model Fitting',
    desc: 'Weighted binomial GLM (logit link) fit per Year × Institute. Predictors: percentile 1–50. Response: (Funded_Total, Not_Awarded). Minimum 8 observations, 3 in transition zone required.',
  },
  {
    n: '4',
    title: 'EEP Computation',
    desc: 'EEP(q) = (logit(q) − β₀) / β₁. Clamped to [0.5, 60.0]. Opportunity Width = EEP20 − EEP80. All values are model estimates, not simple payline thresholds.',
  },
  {
    n: '5',
    title: 'Quality Control',
    desc: '68 checks passed · 0 failed · 11 warnings. All warnings are documented NIH data characteristics (R56 suppression, sparse small ICs, administrative non-award patterns).',
  },
  {
    n: '6',
    title: 'FY2025 Status',
    desc: 'Data extracted March 2026. FY2025 is preliminary — late-cycle pickup awards may not be reflected. Confirm against final NIH Data Book before official reporting.',
  },
]

const CAVEATS = [
  'EEP values are modeled estimates, not administrative paylines. Individual grant outcomes depend on scientific content, program officer priorities, and council actions not captured in percentile data.',
  'Funded_Total at the IC level understates true awards by the number of suppressed R56 bridge awards. The bias direction is consistent (downward) across all affected ICs.',
  'The logistic model assumes a smooth sigmoidal funding probability curve. For small ICs with sparse data (<8 observations or <3 in the transition zone), EEP values are suppressed as unreliable.',
  'Resubmission gain estimates assume the logistic curve shape is stable between the current score and the target score — reasonable within one year, but not valid for cross-year projections given FY2025 compression.',
  'NIMHD is absent from FY2014 and FY2015 because it was not independently tracked in NIH Data Book Report 302 until FY2016.',
]

export default function MethodsCaveats({ section }: MethodsCaveatsProps) {
  return (
    <div className="space-y-5">

      {/* Pipeline steps */}
      <div className="card p-6">
        <div className="text-label mb-5">Data Pipeline</div>
        <div className="space-y-5">
          {STEPS.map(({ n, title, desc }) => (
            <div key={n} className="flex gap-4">
              <div
                className="flex-shrink-0 w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center"
                style={{ background: 'var(--accent)' }}
              >
                {n}
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-700">{title}</div>
                <div className="text-sm text-gray-500 mt-0.5 leading-relaxed">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Statistical model */}
      <div className="card p-6">
        <div className="text-label mb-4">Statistical Model</div>
        <div
          className="rounded-lg p-4 font-mono text-sm space-y-1.5"
          style={{ background: '#F8FAFC', border: '1px solid #E5E7EB' }}
        >
          <div className="text-gray-700">
            P(funded | percentile) = 1 / (1 + exp(−(β₀ + β₁ × percentile)))
          </div>
          <div className="text-gray-400">EEP(q) = (logit(q) − β₀) / β₁</div>
          <div className="text-gray-400">Opportunity Width = EEP(0.20) − EEP(0.80)</div>
        </div>
        <p className="mt-4 text-sm text-gray-500 leading-relaxed">
          The logistic model is appropriate for this data structure: funding probability declines
          sigmoidally from near 1.0 at percentile 1 toward near 0 above percentile 30–40.
          McFadden pseudo-R² ranges from 0.223 to 0.969 across 230 converged fits (mean 0.806).
          ALL NIH models average R² = 0.963 — near-perfect logistic fit.
        </p>
      </div>

      {/* Known limitations */}
      <div className="card p-6">
        <div className="text-label mb-4">Known Limitations</div>
        <ul className="space-y-3">
          {CAVEATS.map((c, i) => (
            <li key={i} className="flex gap-3 text-sm text-gray-600 leading-relaxed">
              <span
                className="flex-shrink-0 w-5 h-5 rounded-full text-xs font-semibold flex items-center justify-center mt-0.5"
                style={{ background: '#FEF3C7', color: '#92400E' }}
              >
                {i + 1}
              </span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </div>

      <InsightCard section={section} />
    </div>
  )
}
