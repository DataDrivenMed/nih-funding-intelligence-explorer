import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import SectionShell from '../components/SectionShell';
import InsightPanel from '../components/InsightPanel';
import LoadingSpinner from '../components/LoadingSpinner';
import TabHelpPanel from '../components/TabHelpPanel';
import InfoTooltip from '../components/InfoTooltip';
import { useData } from '../hooks/useData';
import { generateFundingLandscapeInsight } from '../narrativeHelpers';
import type { InstituteProfile } from '../types';

const BANDS = ['1-5', '6-10', '11-15', '16-20', '21-25', '26+'] as const;

const ALL_NIH_COMPARISON = [
  { band: '1–5', fy2019: 90.3, fy2024: 89.9, fy2025: 91.5 },
  { band: '6–10', fy2019: 82.0, fy2024: 72.9, fy2025: 71.9 },
  { band: '11–15', fy2019: 74.9, fy2024: 55.6, fy2025: 30.5 },
  { band: '16–20', fy2019: 53.5, fy2024: 31.3, fy2025: 12.8 },
  { band: '21–25', fy2019: 32.1, fy2024: 14.1, fy2025: 7.1 },
  { band: '26+', fy2019: 5.6, fy2024: 2.0, fy2025: 0.7 },
];

const TICK = { fill: 'var(--text-muted)', fontSize: 11, fontFamily: '"DM Mono", monospace' };
const GRID = 'rgba(255,255,255,0.05)';
const TOOLTIP_STYLE = { background: 'var(--surface3)', border: '1px solid var(--border-md)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '12px' };

export default function FundingLandscape() {
  const { data, loading } = useData<InstituteProfile[]>('institute_profiles.json');
  const [selectedIC, setSelectedIC] = useState('ALL NIH');

  if (loading || !data) return <LoadingSpinner />;

  const allInstitutes = data.map(d => d.institute);
  const profile = data.find(d => d.institute === selectedIC);
  const allNih = data.find(d => d.isAggregate);
  if (!profile || !allNih) return null;

  const isAggregate = profile.isAggregate;

  const bandChart = BANDS.map(b => ({
    band: b,
    'Rate %': +((profile.bandRates2025[b]?.rate ?? 0) * 100).toFixed(1),
    Applications: profile.bandRates2025[b]?.total ?? 0,
  }));

  const narrative = generateFundingLandscapeInsight(selectedIC, profile.bandRates2025, isAggregate);

  return (
    <SectionShell
      title="Funding Landscape by Percentile Band"
      description="Funding rates by the six standard NIH percentile bands. Select an institute to explore its specific band landscape."
    >
      <TabHelpPanel
        what="Funding rates and application volumes broken down by six percentile bands (1–5 through 26+) for a selected institute."
        why="Band-level rates show where the funding cliff is sharpest and how competition differs across score ranges."
        how="Each bar shows the % of applications in that band that received an award. Higher bars = more funded. The cross-year comparison (ALL NIH only) shows how band rates shifted from FY2019 to FY2025."
        controls="Use the Institute dropdown to switch between ALL NIH and individual institutes. All charts, table, and narrative update automatically."
        tip="The sharpest drop in FY2025 was in the 11–15 and 16–20 bands — historically productive resubmission zones now face dramatically lower funding odds."
      />

      {/* Institute Selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
        <label style={{ fontFamily: '"DM Mono", monospace', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          Select Institute
        </label>
        <select value={selectedIC} onChange={e => setSelectedIC(e.target.value)} className="form-select">
          {allInstitutes.map(ic => <option key={ic} value={ic}>{ic}</option>)}
        </select>
      </div>

      {/* Band rates chart */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <h3 className="chart-heading">{selectedIC}: Band Funding Rates — FY2025</h3>
        <InfoTooltip term="Percentile Band" definition="A range of percentile scores grouped into a 5-point window (e.g., 1–5, 6–10)." why="Bands reveal where the funding probability cliff is sharpest." />
      </div>
      <div style={{ height: '240px', marginBottom: '2rem' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={bandChart} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis dataKey="band" tick={TICK} />
            <YAxis tick={TICK} unit="%" domain={[0, 100]} />
            <Tooltip formatter={(val: number) => `${val.toFixed(1)}%`} contentStyle={TOOLTIP_STYLE} />
            <Bar dataKey="Rate %" fill="var(--accent)" radius={[4, 4, 0, 0]} name="Funding Rate (FY2025)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Cross-year comparison — ALL NIH only */}
      {isAggregate && (
        <>
          <h3 className="chart-heading" style={{ marginBottom: '12px' }}>ALL NIH Band Funding Rates: FY2019 vs FY2024 vs FY2025</h3>
          <div style={{ height: '260px', marginBottom: '2rem' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ALL_NIH_COMPARISON} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                <XAxis dataKey="band" tick={TICK} />
                <YAxis tick={TICK} unit="%" domain={[0, 100]} />
                <Tooltip formatter={(val: number) => `${val.toFixed(1)}%`} contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: '11px', fontFamily: '"DM Mono", monospace', paddingTop: '8px' }} />
                <Bar dataKey="fy2019" fill="#10b981" radius={[3, 3, 0, 0]} name="FY2019" />
                <Bar dataKey="fy2024" fill="#f59e0b" radius={[3, 3, 0, 0]} name="FY2024" />
                <Bar dataKey="fy2025" fill="#ef4444" radius={[3, 3, 0, 0]} name="FY2025" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* Application Volume by Band table */}
      <h3 className="chart-heading" style={{ marginBottom: '0.75rem' }}>{selectedIC}: Application Volume by Band — FY2025</h3>
      <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border)' }}>
        <table style={{ width: '100%' }}>
          <thead>
            <tr>
              {['Percentile Band', 'Applications', 'Funded (est.)', 'Rate (FY2025)',
                ...(isAggregate ? ['Rate (FY2019)', 'Δ vs 2019'] : [])
              ].map(h => <th key={h}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {BANDS.map((b, i) => {
              const row = profile.bandRates2025[b];
              const comp = isAggregate ? ALL_NIH_COMPARISON[i] : null;
              const change = comp ? +(comp.fy2025 - comp.fy2019).toFixed(1) : null;
              return (
                <tr key={b}>
                  <td style={{ fontWeight: 700, color: 'var(--text-primary)', fontFamily: '"DM Mono", monospace' }}>{b}</td>
                  <td style={{ fontFamily: '"DM Mono", monospace' }}>{row?.total.toLocaleString() ?? '—'}</td>
                  <td style={{ fontFamily: '"DM Mono", monospace' }}>{row ? Math.round(row.rate * row.total) : '—'}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className="rate-bar-track">
                        <div className="rate-bar-fill" style={{ width: `${row ? Math.min(row.rate * 100, 100) : 0}%` }} />
                      </div>
                      <span style={{ fontFamily: '"DM Mono", monospace', fontSize: '12px', fontWeight: 600, color: 'var(--accent)' }}>
                        {row ? `${(row.rate * 100).toFixed(1)}%` : '—'}
                      </span>
                    </div>
                  </td>
                  {isAggregate && (
                    <>
                      <td style={{ fontFamily: '"DM Mono", monospace', color: 'var(--text-secondary)' }}>{comp ? `${comp.fy2019.toFixed(1)}%` : '—'}</td>
                      <td style={{ fontFamily: '"DM Mono", monospace', fontWeight: 600, color: change !== null && change < 0 ? '#f87171' : '#34d399' }}>
                        {change !== null ? `${change > 0 ? '+' : ''}${change} pp` : '—'}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <InsightPanel
        contextLabel={`Based on current selection: ${selectedIC}`}
        insight={narrative.insight}
        interpretation={narrative.interpretation}
        leadershipImplication={narrative.leadershipImplication}
        caution={narrative.caution}
      />
    </SectionShell>
  );
}
