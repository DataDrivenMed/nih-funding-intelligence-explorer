import SectionShell from '../components/SectionShell';

const statsRows = [
  { label: 'Source', value: 'NIH Data Book Report ID 302 (exported March 2026)', note: 'FY2014–FY2025, 20 institutes' },
  { label: 'Source files processed', value: '238 xlsx files', note: 'One per Year × Institute' },
  { label: 'Master dataset rows', value: '13,294', note: 'One row per Year × Institute × Percentile (1–50)' },
  { label: 'R56 suppression (IC-level)', value: '4,534 rows (34%)', note: 'Funded_Total uses R01-eq only for these rows' },
  { label: 'GLM convergence rate', value: '230/238 (96.6%)', note: '8 sparse small-IC combos skipped; EEP values NULL' },
  { label: 'Model quality (pseudo-R²)', value: '0.223 – 0.969', note: 'Mean 0.806; ALL NIH avg 0.9625' },
  { label: 'QC result', value: '68 passed | 0 failed | 11 warnings', note: 'All warnings are documented NIH data characteristics' },
  { label: 'Data vintage', value: 'FY2014 – FY2025', note: 'FY2025 is preliminary (extracted March 2026)' },
];

export default function Methods() {
  return (
    <SectionShell
      title="Methods, Data Sources & Caveats"
      description="Technical documentation of the data pipeline, statistical methodology, and known limitations."
    >
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Data Pipeline</h3>
          <p className="text-sm text-gray-700 leading-relaxed">
            Data source: NIH Data Book Report ID 302 (Funding Patterns by Institute or Center), exported March 6, 2026.
            The archive contained 238 Excel files covering FY2014–FY2025 across 20 institutes (ALL NIH plus 19 ICs).
            84 of 238 files contained suppressed R56 bridge award counts ('D' values) — 4,534 rows in the master dataset (34%)
            have NaN R56_Awards. Funded_Total for these rows is derived from R01-equivalent awards only,
            slightly understating true funding rates at the IC level.
          </p>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Statistical Model</h3>
          <p className="text-sm text-gray-700 leading-relaxed">
            Weighted binomial GLM (logit link, statsmodels v0.14.6) fit per Year × Institute using percentiles 1–50 as
            predictors and (Funded_Total, Not_Awarded) as the response. EEP values obtained by inverting the fitted curve:
            EEP(q) = (logit(q) − β₀) / β₁. McFadden pseudo-R² ranges from 0.223 to 0.969 across converged fits,
            mean 0.806. ALL NIH models average R² = 0.9625 — near-perfect logistic fit.
          </p>
        </div>
      </div>

      {/* Stats table */}
      <h3 className="font-semibold text-gray-900 mb-3">Technical Summary</h3>
      <div className="overflow-x-auto mb-8">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead>
            <tr className="bg-gray-50">
              {['Parameter', 'Value', 'Note'].map(h => (
                <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {statsRows.map((r, i) => (
              <tr key={r.label} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-4 py-2 font-semibold text-gray-900">{r.label}</td>
                <td className="px-4 py-2 text-blue-700 font-medium">{r.value}</td>
                <td className="px-4 py-2 text-gray-500">{r.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Caveats */}
      <h3 className="font-semibold text-gray-900 mb-3">Known Limitations & Caveats</h3>
      <div className="space-y-3">
        {[
          { n: 1, text: 'FY2025 data is preliminary — confirm against final NIH Data Book before official reporting.' },
          { n: 2, text: 'EEP values are modeled estimates from population-level data; individual application probabilities depend on scientific content and program officer priorities not captured here.' },
          { n: 3, text: "'Funded_Total' at the IC level underestimates true awards by the number of suppressed R56 awards; the direction of bias is consistent (downward) and affects 17 of 19 ICs." },
          { n: 4, text: 'Resubmission gain estimates assume the logistic curve shape is stable between the current score and the target score — a reasonable assumption within a single year but not across years given the FY2025 compression.' },
          { n: 5, text: 'EEP estimates for small ICs (NIMHD, NINR, NLM, NHGRI) with pseudo-R² < 0.70 should be interpreted directionally, not as precise point estimates.' },
        ].map(c => (
          <div key={c.n} className="flex gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <span className="flex-shrink-0 w-6 h-6 bg-orange-400 text-white rounded-full flex items-center justify-center text-xs font-bold">{c.n}</span>
            <p className="text-sm text-orange-900">{c.text}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">Audience & Intended Use</h3>
        <p className="text-sm text-blue-800">
          This dashboard is designed for medical school research leadership, Deans of Research, Vice Chancellors for Research,
          Research Development Offices, and Department Chairs. EEP values for ALL NIH and large ICs (NIAID, NHLBI, NCI, NIDDK,
          NINDS, NIGMS, NIMH, NIA) are sufficiently precise for quantitative decision-making. Small-IC values should be used
          directionally. Any value shown as '—' represents a combination where the model could not reliably estimate the threshold,
          not a data entry error.
        </p>
      </div>
    </SectionShell>
  );
}
