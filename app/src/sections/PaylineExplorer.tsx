import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import SectionShell from '../components/SectionShell';
import InsightPanel from '../components/InsightPanel';
import LoadingSpinner from '../components/LoadingSpinner';
import TabHelpPanel from '../components/TabHelpPanel';
import InfoTooltip from '../components/InfoTooltip';
import { useData } from '../hooks/useData';
import { generatePaylineInsight } from '../narrativeHelpers';
import type { InstituteProfile, BandLandscape } from '../types';

const TICK = { fill: 'var(--text-muted)', fontSize: 11, fontFamily: '"DM Mono", monospace' };
const GRID = 'rgba(255,255,255,0.05)';
const TOOLTIP_STYLE = { background: 'var(--surface3)', border: '1px solid var(--border-md)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '12px' };

export default function PaylineExplorer() {
  const { data, loading } = useData<InstituteProfile[]>('institute_profiles.json');
  const { data: bandData } = useData<BandLandscape>('band_landscape.json');
  const [selectedIC, setSelectedIC] = useState('ALL NIH');

  if (loading || !data) return <LoadingSpinner />;

  const institutes = data.map(d => d.institute);
  const profile = data.find(d => d.institute === selectedIC);
  if (!profile) return null;

  const eepChartData = profile.history
    .filter(h => h.eep50 !== null)
    .map(h => ({ year: h.year, 'EEP80': h.eep80, 'EEP50': h.eep50, 'EEP20': h.eep20 }));

  const rateChartData = profile.history
    .filter(h => h.overallRate !== null)
    .map(h => ({ year: h.year, 'Funding Rate %': +((h.overallRate as number) * 100).toFixed(1) }));

  type BandEntry = Record<string, { rate: number; total: number }>;
  const volumeChartData: Array<{ year: number; Applications: number; Funded: number }> = [];
  if (bandData?.byInstitute?.[selectedIC]) {
    const icBandsByYear = bandData.byInstitute[selectedIC] as Record<string, BandEntry>;
    Object.entries(icBandsByYear)
      .sort(([a], [b]) => Number(a) - Number(b))
      .forEach(([yr, bands]) => {
        const totalApps = Object.values(bands).reduce((s, b) => s + (b.total ?? 0), 0);
        const totalFunded = Object.values(bands).reduce((s, b) => s + Math.round((b.rate ?? 0) * (b.total ?? 0)), 0);
        volumeChartData.push({ year: Number(yr), Applications: totalApps, Funded: totalFunded });
      });
  }

  const bandRows = Object.entries(profile.bandRates2025).map(([band, v]) => ({ band, rate: v.rate, total: v.total }));

  const narrative = generatePaylineInsight({
    institute: selectedIC, eep80: profile.fy2025.eep80, eep50: profile.fy2025.eep50,
    eep20: profile.fy2025.eep20, opportunityWidth: profile.fy2025.opportunityWidth,
    overallFundingRate: profile.fy2025.overallFundingRate, eep50YoYChange: profile.fy2025.eep50YoYChange,
    history: profile.history,
  });

  const EEP_TERMS = [
    { term: 'EEP80', def: '~80% funding probability threshold', color: '#10b981' },
    { term: 'EEP50', def: '~50% — statistical payline', color: 'var(--accent)' },
    { term: 'EEP20', def: '~20% — outer edge of meaningful odds', color: '#8b5cf6' },
    { term: 'Opp. Width', def: 'EEP20 − EEP80 (gray zone size)', color: 'var(--text-secondary)' },
  ];

  const KPI_ITEMS = [
    { label: 'EEP80', value: profile.fy2025.eep80, color: '#10b981', tip: 'Percentile where funding probability reaches 80%.', why: 'High-confidence funding zone.' },
    { label: 'EEP50', value: profile.fy2025.eep50, color: 'var(--accent)', tip: 'Percentile where funding probability is ~50% — the statistical payline.', why: 'Coin-flip threshold.' },
    { label: 'EEP20', value: profile.fy2025.eep20, color: '#8b5cf6', tip: 'Percentile where funding probability drops to ~20%.', why: 'Lower bound of meaningful funding zone.' },
    { label: 'Opp. Width', value: profile.fy2025.opportunityWidth, color: 'var(--text-secondary)', suffix: ' pp', tip: 'Gap between EEP20 and EEP80.', why: 'Wider = broader gray zone.' },
    { label: 'Funding Rate', value: profile.fy2025.overallFundingRate !== null ? +(profile.fy2025.overallFundingRate * 100).toFixed(1) : null, color: '#ef4444', suffix: '%', tip: 'Fraction of scored applications receiving an award.', why: 'Overall competitiveness indicator.' },
  ];

  return (
    <SectionShell
      title="Effective Payline Explorer"
      description="Modeled EEP80/EEP50/EEP20 thresholds per institute and year from weighted binomial logistic regression."
    >
      <TabHelpPanel
        what="Three modeled funding probability thresholds (EEP80, EEP50, EEP20) and application/funding volume trends for a selected institute over FY2014–FY2025."
        why="EEP values translate raw percentile scores into concrete funding probability estimates. IC-specific EEPs are more actionable than a single NIH-wide average."
        how="EEP trend chart: falling lines mean tighter paylines. Volume chart: rising applications + flat/falling funded = more competition. Funding rate trend shows the overall trajectory."
        controls="Select an institute from the dropdown. All charts, metric cards, band table, and narrative update automatically."
        tip="EEP50 is the statistical payline — the percentile where half of applications are funded. An application at EEP20 has only a ~20% chance."
      />

      {/* EEP term definitions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', marginBottom: '1.5rem', padding: '1rem', background: 'var(--surface2)', borderRadius: '8px', border: '1px solid var(--border)' }}>
        {EEP_TERMS.map(t => (
          <div key={t.term}>
            <p style={{ fontFamily: '"DM Mono", monospace', fontSize: '11px', fontWeight: 600, color: t.color, marginBottom: '2px' }}>{t.term}</p>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{t.def}</p>
          </div>
        ))}
      </div>

      {/* IC Selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
        <label style={{ fontFamily: '"DM Mono", monospace', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          Select Institute
        </label>
        <select value={selectedIC} onChange={e => setSelectedIC(e.target.value)} className="form-select">
          {institutes.map(ic => <option key={ic} value={ic}>{ic}</option>)}
        </select>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '2rem' }}>
        {KPI_ITEMS.map(item => (
          <div key={item.label} className="kpi-card" style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '4px' }}>
              <p style={{ fontFamily: '"DM Mono", monospace', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                {item.label}
              </p>
              <InfoTooltip term={item.label} definition={item.tip} why={item.why} />
            </div>
            <p style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontSize: '1.75rem', fontWeight: 400, color: item.color, lineHeight: 1, marginBottom: '4px' }}>
              {item.value !== null && item.value !== undefined ? `${typeof item.value === 'number' ? item.value.toFixed(1) : item.value}${item.suffix ?? ''}` : '—'}
            </p>
          </div>
        ))}
      </div>

      {/* EEP Trend */}
      <h3 className="chart-heading" style={{ marginBottom: '12px' }}>{selectedIC}: EEP Trend, FY2014–FY2025</h3>
      <div style={{ height: '260px', marginBottom: '2rem' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={eepChartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis dataKey="year" tick={TICK} />
            <YAxis tick={TICK} label={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: '"DM Mono", monospace', value: 'Percentile', angle: -90, position: 'insideLeft' }} />
            <Tooltip formatter={(val: number) => val?.toFixed(1) ?? 'N/A'} contentStyle={TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: '11px', fontFamily: '"DM Mono", monospace', paddingTop: '8px' }} />
            <ReferenceLine x={2025} stroke="rgba(239,68,68,0.35)" strokeDasharray="4 4" />
            <Line type="monotone" dataKey="EEP80" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#10b981' }} connectNulls />
            <Line type="monotone" dataKey="EEP50" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 3, fill: '#0ea5e9' }} connectNulls />
            <Line type="monotone" dataKey="EEP20" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3, fill: '#8b5cf6' }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Applications & Funded trend */}
      {volumeChartData.length > 0 && (
        <>
          <h3 className="chart-heading" style={{ marginBottom: '12px' }}>{selectedIC}: Applications & Funded Awards, FY2014–FY2025</h3>
          <div style={{ height: '220px', marginBottom: '2rem' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={volumeChartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                <XAxis dataKey="year" tick={TICK} />
                <YAxis tick={TICK} label={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: '"DM Mono", monospace', value: 'Count', angle: -90, position: 'insideLeft' }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: '11px', fontFamily: '"DM Mono", monospace', paddingTop: '8px' }} />
                <ReferenceLine x={2025} stroke="rgba(239,68,68,0.35)" strokeDasharray="4 4" />
                <Line type="monotone" dataKey="Applications" stroke="#64748b" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Funded" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#10b981' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* Funding Rate trend */}
      <h3 className="chart-heading" style={{ marginBottom: '12px' }}>{selectedIC}: Overall Funding Rate, FY2014–FY2025</h3>
      <div style={{ height: '180px', marginBottom: '2rem' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rateChartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis dataKey="year" tick={TICK} />
            <YAxis tick={TICK} unit="%" domain={[0, 60]} />
            <Tooltip formatter={(val: number) => `${val.toFixed(1)}%`} contentStyle={TOOLTIP_STYLE} />
            <ReferenceLine x={2025} stroke="rgba(239,68,68,0.35)" strokeDasharray="4 4" />
            <Line type="monotone" dataKey="Funding Rate %" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 3, fill: '#ef4444' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Band rates table */}
      <h3 className="chart-heading" style={{ marginBottom: '0.75rem' }}>{selectedIC}: FY2025 Funding Rates by Band</h3>
      <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border)' }}>
        <table style={{ width: '100%' }}>
          <thead>
            <tr>
              {['Percentile Band', 'Applications', 'Funding Rate', 'Funded (est.)'].map(h => <th key={h}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {bandRows.map(r => (
              <tr key={r.band}>
                <td style={{ fontWeight: 700, fontFamily: '"DM Mono", monospace' }}>{r.band}</td>
                <td style={{ fontFamily: '"DM Mono", monospace' }}>{r.total.toLocaleString()}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="rate-bar-track">
                      <div className="rate-bar-fill" style={{ width: `${Math.min(r.rate * 100, 100)}%` }} />
                    </div>
                    <span style={{ fontFamily: '"DM Mono", monospace', fontSize: '12px', fontWeight: 600, color: 'var(--accent)' }}>
                      {(r.rate * 100).toFixed(1)}%
                    </span>
                  </div>
                </td>
                <td style={{ fontFamily: '"DM Mono", monospace' }}>{Math.round(r.rate * r.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <InsightPanel
        contextLabel={`For selected institute: ${selectedIC}`}
        insight={narrative.insight}
        interpretation={narrative.interpretation}
        leadershipImplication={narrative.leadershipImplication}
        caution={narrative.caution}
      />
    </SectionShell>
  );
}
