import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import SectionShell from '../components/SectionShell';
import InsightPanel from '../components/InsightPanel';
import LoadingSpinner from '../components/LoadingSpinner';
import TabHelpPanel from '../components/TabHelpPanel';
import InfoTooltip from '../components/InfoTooltip';
import { useData } from '../hooks/useData';

interface KpiSummary {
  allNihByYear: Array<{
    year: number;
    eep80: number;
    eep50: number;
    eep20: number;
    opportunityWidth: number;
    overallFundingRate: number;
    eep50YoYChange: number | null;
  }>;
  fy2025Headlines: Array<{
    id: string;
    label: string;
    displayValue: string;
    deltaLabel: string | null;
    trend: string;
    alert: boolean;
    context: string;
  }>;
}

const TERM_DEFS = [
  { term: 'EEP80', short: 'Percentile where funding probability ≈ 80%', why: 'High-confidence funding zone.' },
  { term: 'EEP50', short: 'Percentile where funding probability ≈ 50% — the statistical payline', why: 'The coin-flip funding threshold.' },
  { term: 'EEP20', short: 'Percentile where funding probability ≈ 20%', why: 'Lower edge of the meaningful funding zone.' },
  { term: 'Opportunity Width', short: 'Gap between EEP20 and EEP80 in percentile points', why: 'Wider = broader gray zone; narrower = steeper cliff.' },
  { term: 'Funding Rate', short: 'Fraction of scored applications receiving an award', why: 'Tracks overall competition intensity.' },
];

const TICK = { fill: 'var(--text-muted)', fontSize: 11, fontFamily: '"DM Mono", monospace' };
const GRID = 'rgba(255,255,255,0.05)';
const AXIS_LABEL = { fill: 'var(--text-muted)', fontSize: 11, fontFamily: '"DM Mono", monospace' };

export default function Overview() {
  const { data, loading } = useData<KpiSummary>('kpi_summary.json');
  if (loading || !data) return <LoadingSpinner />;

  const chartData = data.allNihByYear.map(d => ({
    year: d.year,
    'EEP80 (80%)': d.eep80,
    'EEP50 (Payline)': d.eep50,
    'EEP20 (20%)': d.eep20,
    'Funding Rate %': +(d.overallFundingRate * 100).toFixed(1),
  }));

  const TooltipContent = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string | number }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="chart-tooltip">
        <p style={{ fontFamily: '"DM Mono", monospace', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '6px', letterSpacing: '0.06em' }}>
          FY{label}
        </p>
        {payload.map(p => (
          <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', fontSize: '12px', marginBottom: '2px' }}>
            <span style={{ color: p.color }}>{p.name}</span>
            <span style={{ fontFamily: '"DM Mono", monospace', color: 'var(--text-primary)' }}>{typeof p.value === 'number' ? p.value.toFixed(1) : '—'}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <SectionShell
      title="NIH Funding Landscape: 2014–2025 Overview"
      description="Twelve-year view of NIH funding competitiveness anchored by modeled Effective Expected Paylines (EEP) from weighted binomial regression."
    >
      {/* VERSION CHECK */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        background: 'rgba(245,158,11,0.08)',
        border: '1px solid rgba(245,158,11,0.25)',
        borderRadius: '4px',
        padding: '3px 10px',
        marginBottom: '1rem',
        fontFamily: '"DM Mono", monospace',
        fontSize: '10px',
        letterSpacing: '0.08em',
        color: '#fcd34d',
      }}>
        UPDATED VERSION CHECK
      </div>

      <TabHelpPanel
        what="Twelve years of ALL NIH funding competitiveness measured by three modeled probability thresholds (EEP80, EEP50, EEP20) and the overall funding rate."
        why="These trends reveal whether NIH funding has tightened, stabilized, or eased — critical context for institutional portfolio planning."
        how="Read the EEP trend chart left to right (2014→2025). Lower percentile values = more competitive. A falling EEP50 means a tighter payline. The funding rate chart shows the overall fraction of scored applications that received awards."
        tip="FY2025 is a system-wide inflection: EEP50 dropped from 16.8 to 11.1 — all 20 institutes tightened simultaneously for the first time in this dataset."
      />

      {/* Key term definitions */}
      <div style={{ marginBottom: '1.5rem' }}>
        <p style={{
          fontFamily: '"DM Mono", monospace',
          fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase',
          color: 'var(--text-muted)', marginBottom: '10px',
        }}>Key Term Definitions</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
          {TERM_DEFS.map(t => (
            <div key={t.term} className="term-card">
              <p style={{ fontFamily: '"DM Mono", monospace', fontSize: '11px', fontWeight: 600, color: 'var(--accent)', marginBottom: '3px' }}>{t.term}</p>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '3px' }}>{t.short}</p>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.45 }}>↗ {t.why}</p>
            </div>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginBottom: '2rem' }}>
        {data.fy2025Headlines.map(h => (
          <div key={h.id} className="kpi-card" style={h.alert ? { borderColor: 'rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.07)' } : {}}>
            <p style={{
              fontFamily: '"DM Mono", monospace', fontSize: '9px',
              letterSpacing: '0.1em', textTransform: 'uppercase',
              color: h.alert ? '#fca5a5' : 'var(--text-muted)', marginBottom: '6px',
            }}>{h.label}</p>
            <p style={{
              fontFamily: '"DM Serif Display", Georgia, serif',
              fontSize: '1.75rem', fontWeight: 400,
              color: h.alert ? '#f87171' : 'var(--text-primary)',
              lineHeight: 1, marginBottom: '4px',
            }}>{h.displayValue}</p>
            {h.deltaLabel && (
              <p style={{
                fontSize: '11px', fontFamily: '"DM Mono", monospace',
                color: h.trend === 'down' ? '#f87171' : '#34d399', marginBottom: '3px',
              }}>{h.deltaLabel}</p>
            )}
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>{h.context}</p>
          </div>
        ))}
      </div>

      {/* EEP Trend Chart */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <h3 className="chart-heading">ALL NIH Effective Expected Paylines, FY2014–FY2025</h3>
        <InfoTooltip
          term="Effective Expected Payline (EEP)"
          definition="The percentile at which an application's modeled funding probability reaches a given threshold (80%, 50%, or 20%)."
          why="Translates study section scores into concrete funding probability estimates."
        />
      </div>
      <div style={{ height: '300px', marginBottom: '2rem' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis dataKey="year" tick={TICK} />
            <YAxis tick={TICK} label={{ ...AXIS_LABEL, value: 'Percentile', angle: -90, position: 'insideLeft' }} />
            <Tooltip content={<TooltipContent />} />
            <Legend wrapperStyle={{ fontSize: '11px', fontFamily: '"DM Mono", monospace', paddingTop: '8px' }} />
            <ReferenceLine x={2025} stroke="rgba(239,68,68,0.4)" strokeDasharray="4 4"
              label={{ value: 'FY2025', position: 'top', fontSize: 10, fill: '#f87171', fontFamily: '"DM Mono", monospace' }} />
            <Line type="monotone" dataKey="EEP80 (80%)" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#10b981' }} />
            <Line type="monotone" dataKey="EEP50 (Payline)" stroke="#0ea5e9" strokeWidth={2.5} dot={{ r: 3, fill: '#0ea5e9' }} />
            <Line type="monotone" dataKey="EEP20 (20%)" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3, fill: '#8b5cf6' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Funding Rate Chart */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <h3 className="chart-heading">ALL NIH Overall Funding Rate (%)</h3>
        <InfoTooltip
          term="Funding Rate"
          definition="The percentage of scored applications that received an award in a given fiscal year."
          why="A declining rate signals more applications competing for the same share of awards."
        />
      </div>
      <div style={{ height: '180px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis dataKey="year" tick={TICK} />
            <YAxis tick={TICK} unit="%" domain={[0, 50]} />
            <Tooltip content={<TooltipContent />} />
            <Line type="monotone" dataKey="Funding Rate %" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 3, fill: '#ef4444' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <InsightPanel
        contextLabel="Based on ALL NIH system-wide data, FY2014–FY2025"
        insight="From 2014 through 2023, the ALL NIH EEP50 held remarkably stable (18.4–20.1). FY2024 showed the first meaningful shift (16.8). FY2025 broke decisively: EEP50 fell to 11.1, a drop of 5.6 percentile points from 2024 — 5.8 standard deviations below the historical mean. The overall NIH funding rate fell from 38.4% (2019) to 22.0% (2025). All 20 institutes showed tighter paylines in 2025 — the first universal compression event in this dataset."
        interpretation="The NIH funding environment underwent two distinct shifts. The 2024 tightening (EEP50: 16.8) represents normal budget cycle variation. The 2025 compression is qualitatively different: an EEP50 of 11.1 means the statistical 50/50 funding threshold moved from the mid-teens to the low double digits. Applications historically considered 'near payline' at percentile 15–20 are now operating well outside the probabilistic funding zone."
        leadershipImplication="Research offices should recalibrate internal funding probability guidance. A score at percentile 15, which carried ~75% funding probability in 2019, now corresponds to ~30.5%. Portfolio planning models that treat a 15th-percentile score as a 'strong near-miss' require immediate revision."
        caution="FY2025 data was extracted from the NIH Data Book in March 2026 and should be treated as preliminary. Late-cycle pickup awards may improve rates in the 12–25 range when FY2025 is fully closed."
      />
    </SectionShell>
  );
}
