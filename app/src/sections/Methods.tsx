import SectionShell from '../components/SectionShell';
import TabHelpPanel from '../components/TabHelpPanel';

const statsRows = [
  { label: 'Source', value: 'NIH Data Book Report ID 302 (March 2026)', note: 'FY2014–FY2025, 20 institutes' },
  { label: 'Source files processed', value: '238 xlsx files', note: 'One per Year × Institute' },
  { label: 'Master dataset rows', value: '13,294', note: 'One row per Year × Institute × Percentile (1–50)' },
  { label: 'R56 suppression (IC-level)', value: '4,534 rows (34%)', note: 'Funded_Total uses R01-eq only for these rows' },
  { label: 'GLM convergence rate', value: '230/238 (96.6%)', note: '8 sparse small-IC combos skipped; EEP values NULL' },
  { label: 'Model quality (pseudo-R²)', value: '0.223 – 0.969', note: 'Mean 0.806; ALL NIH avg 0.9625' },
  { label: 'QC result', value: '68 passed | 0 failed | 11 warnings', note: 'All warnings are documented NIH data characteristics' },
  { label: 'Data vintage', value: 'FY2014 – FY2025', note: 'FY2025 is preliminary (extracted March 2026)' },
];

const caveats = [
  'FY2025 data is preliminary — confirm against final NIH Data Book before official reporting.',
  'EEP values are modeled estimates from population-level data; individual application probabilities depend on scientific content and program officer priorities not captured here.',
  '\'Funded_Total\' at the IC level underestimates true awards by the number of suppressed R56 awards; the direction of bias is consistent (downward) and affects 17 of 19 ICs.',
  'Resubmission gain estimates assume the logistic curve shape is stable between the current score and the target score — a reasonable assumption within a single year but not across years given FY2025 compression.',
  'EEP estimates for small ICs (NIMHD, NINR, NLM, NHGRI) with pseudo-R² < 0.70 should be interpreted directionally, not as precise point estimates.',
];

export default function Methods() {
  return (
    <SectionShell
      title="Methods, Data Sources & Caveats"
      description="Technical documentation of the data pipeline, statistical methodology, and known limitations."
    >
      <TabHelpPanel
        what="Technical documentation of how this dashboard was built: data sources, statistical models, QC results, and known limitations."
        why="Understanding the methodology helps contextualize all values — particularly which estimates are highly reliable vs. directional."
        how="Read the Data Pipeline and Statistical Model sections for methodology. The Technical Summary table gives QC stats. The caveats list important limitations for communicating findings."
        tip="ALL NIH and large-IC EEP values (NIAID, NHLBI, NCI, NIDDK, NINDS, NIGMS, NIMH, NIA) are sufficiently precise for quantitative guidance. Small-IC values should be used directionally."
      />

      {/* Two-column explainer */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '1.25rem' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '10px' }}>Data Pipeline</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
            Data source: NIH Data Book Report ID 302 (Funding Patterns by Institute or Center), exported March 6, 2026.
            The archive contained 238 Excel files covering FY2014–FY2025 across 20 institutes (ALL NIH plus 19 ICs).
            84 of 238 files contained suppressed R56 bridge award counts — 4,534 rows have NaN R56_Awards.
            Funded_Total for these rows is derived from R01-equivalent awards only, slightly understating true funding rates.
          </p>
        </div>
        <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '1.25rem' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '10px' }}>Statistical Model</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
            Weighted binomial GLM (logit link, statsmodels v0.14.6) fit per Year × Institute using percentiles 1–50 as
            predictors and (Funded_Total, Not_Awarded) as the response. EEP values obtained by inverting the fitted curve:
            EEP(q) = (logit(q) − β₀) / β₁. McFadden pseudo-R² ranges from 0.223 to 0.969,
            mean 0.806. ALL NIH models average R² = 0.9625 — near-perfect logistic fit.
          </p>
        </div>
      </div>

      {/* Stats table */}
      <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>Technical Summary</h3>
      <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '2rem' }}>
        <table style={{ width: '100%' }}>
          <thead>
            <tr>
              {['Parameter', 'Value', 'Note'].map(h => <th key={h}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {statsRows.map(r => (
              <tr key={r.label}>
                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.label}</td>
                <td style={{ fontFamily: '"DM Mono", monospace', color: 'var(--accent)', fontWeight: 600 }}>{r.value}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{r.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Caveats */}
      <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>Known Limitations & Caveats</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '2rem' }}>
        {caveats.map((c, i) => (
          <div key={i} style={{
            display: 'flex', gap: '12px', padding: '12px 14px',
            background: 'rgba(245,158,11,0.06)',
            border: '1px solid rgba(245,158,11,0.15)',
            borderRadius: '8px',
          }}>
            <span style={{
              flexShrink: 0, width: '22px', height: '22px',
              borderRadius: '50%',
              background: 'rgba(245,158,11,0.15)',
              border: '1px solid rgba(245,158,11,0.3)',
              color: '#fbbf24',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '10px', fontFamily: '"DM Mono", monospace', fontWeight: 700,
            }}>{i + 1}</span>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{c}</p>
          </div>
        ))}
      </div>

      {/* Audience callout */}
      <div style={{
        padding: '1.25rem 1.5rem',
        background: 'rgba(14,165,233,0.06)',
        border: '1px solid rgba(14,165,233,0.18)',
        borderRadius: '10px',
      }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--accent)', marginBottom: '8px' }}>Audience & Intended Use</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
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
