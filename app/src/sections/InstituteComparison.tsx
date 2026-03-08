import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import SectionShell from '../components/SectionShell';
import InsightPanel from '../components/InsightPanel';
import LoadingSpinner from '../components/LoadingSpinner';
import TabHelpPanel from '../components/TabHelpPanel';
import InfoTooltip from '../components/InfoTooltip';
import { useData } from '../hooks/useData';
import { generateInstituteComparisonInsight } from '../narrativeHelpers';
import type { InstituteProfile } from '../types';

const QUADRANT_COLORS: Record<string, string> = {
  sharpPayline:             '#ef4444',
  competitiveProbabilistic: '#f59e0b',
  moderateFocused:          '#0ea5e9',
  broadOpportunityWindow:   '#10b981',
};

const TICK = { fill: 'var(--text-muted)', fontSize: 10, fontFamily: '"DM Mono", monospace' };
const GRID = 'rgba(255,255,255,0.05)';
const AXIS_LABEL = { fill: 'var(--text-muted)', fontSize: 10, fontFamily: '"DM Mono", monospace' };

export default function InstituteComparison() {
  const { data, loading } = useData<InstituteProfile[]>('institute_profiles.json');
  const [focusedIC, setFocusedIC] = useState<string | null>(null);

  if (loading || !data) return <LoadingSpinner />;

  const ics = data.filter(d => !d.isAggregate && d.fy2025.eep50 !== null)
    .sort((a, b) => (a.fy2025.eep50 ?? 99) - (b.fy2025.eep50 ?? 99));

  const chartData = ics.map(d => ({
    institute: d.institute,
    EEP50: d.fy2025.eep50,
    EEP80: d.fy2025.eep80,
    EEP20: d.fy2025.eep20,
    OppWidth: d.fy2025.opportunityWidth,
    'FundingRate%': +(d.fy2025.overallFundingRate * 100).toFixed(1),
    quadrant: d.fy2025.typologyQuadrant,
    label: d.fy2025.typologyQuadrantLabel,
  }));

  const focusedProfile = focusedIC ? ics.find(d => d.institute === focusedIC) : ics[0];
  const allMetrics = ics.map(d => ({
    institute: d.institute,
    eep80: d.fy2025.eep80, eep50: d.fy2025.eep50, eep20: d.fy2025.eep20,
    opportunityWidth: d.fy2025.opportunityWidth, overallFundingRate: d.fy2025.overallFundingRate,
    typologyQuadrantLabel: d.fy2025.typologyQuadrantLabel, eep50YoYChange: d.fy2025.eep50YoYChange,
    totalApplications: d.fy2025.totalApplications,
  }));

  const narrative = focusedProfile
    ? generateInstituteComparisonInsight({
        institute: focusedProfile.institute,
        eep80: focusedProfile.fy2025.eep80, eep50: focusedProfile.fy2025.eep50, eep20: focusedProfile.fy2025.eep20,
        opportunityWidth: focusedProfile.fy2025.opportunityWidth, overallFundingRate: focusedProfile.fy2025.overallFundingRate,
        typologyQuadrantLabel: focusedProfile.fy2025.typologyQuadrantLabel, eep50YoYChange: focusedProfile.fy2025.eep50YoYChange,
        totalApplications: focusedProfile.fy2025.totalApplications,
      }, allMetrics)
    : null;

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: {payload: typeof chartData[0]}[] }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="chart-tooltip">
        <p style={{ fontFamily: '"DM Mono", monospace', fontSize: '11px', fontWeight: 600, color: QUADRANT_COLORS[d.quadrant] ?? 'var(--text-primary)', marginBottom: '6px' }}>{d.institute}</p>
        {[['EEP80', d.EEP80], ['EEP50', d.EEP50], ['EEP20', d.EEP20]].map(([k, v]) => (
          <div key={k as string} style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', fontSize: '11px', marginBottom: '2px' }}>
            <span style={{ color: 'var(--text-muted)', fontFamily: '"DM Mono", monospace' }}>{k as string}</span>
            <span style={{ color: 'var(--text-primary)', fontFamily: '"DM Mono", monospace' }}>{(v as number)?.toFixed(1) ?? '—'}</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', fontSize: '11px', marginBottom: '2px' }}>
          <span style={{ color: 'var(--text-muted)', fontFamily: '"DM Mono", monospace' }}>Opp. Width</span>
          <span style={{ color: 'var(--text-primary)', fontFamily: '"DM Mono", monospace' }}>{d.OppWidth?.toFixed(1) ?? '—'} pp</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', fontSize: '11px', marginTop: '4px', paddingTop: '4px', borderTop: '1px solid var(--border)' }}>
          <span style={{ color: 'var(--text-muted)', fontFamily: '"DM Mono", monospace' }}>Rate</span>
          <span style={{ color: 'var(--text-primary)', fontFamily: '"DM Mono", monospace' }}>{d['FundingRate%']}%</span>
        </div>
        <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', fontStyle: 'italic' }}>{d.label}</p>
      </div>
    );
  };

  return (
    <SectionShell
      title="Institute Comparison: FY2025 Competitiveness"
      description="All 19 NIH institutes ranked by EEP50 (modeled 50% funding probability threshold) with opportunity width and funding rate."
    >
      <TabHelpPanel
        what="All 19 NIH institutes ranked by their FY2025 EEP50 — the percentile where funding probability reaches 50%."
        why="Different institutes have dramatically different funding thresholds. IC-specific paylines are essential for realistic resubmission counseling."
        how="Bars sorted left-to-right from most to least competitive. Lower EEP50 = tighter payline. Colors indicate typology quadrant. Hover bars for full metrics. Click bars or table rows to focus the narrative."
        controls="Use the 'Focus on Institute' dropdown or click any bar/row to drive the narrative panels for that specific institute."
        tip="In FY2025, EEP50 spans from 3.0 (NIMHD) to 17.0 (NIDCR) — a 14-point spread. The same score has very different odds depending on the receiving institute."
      />

      {/* Focus selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.25rem' }}>
        <label style={{ fontFamily: '"DM Mono", monospace', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          Focus Institute
        </label>
        <select
          value={focusedIC ?? ''}
          onChange={e => setFocusedIC(e.target.value || null)}
          className="form-select"
        >
          <option value="">(show all)</option>
          {ics.map(d => <option key={d.institute} value={d.institute}>{d.institute}</option>)}
        </select>
        {focusedIC && (
          <button onClick={() => setFocusedIC(null)}
            style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
            Clear
          </button>
        )}
      </div>

      {/* Quadrant legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '1.25rem' }}>
        {Object.entries(QUADRANT_COLORS).map(([k, color]) => {
          const labels: Record<string, string> = {
            sharpPayline: 'Sharp Payline', competitiveProbabilistic: 'Competitive & Probabilistic',
            moderateFocused: 'Moderate & Focused', broadOpportunityWindow: 'Broad Opportunity Window',
          };
          return (
            <span key={k} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)', fontFamily: '"DM Mono", monospace' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
              {labels[k]}
            </span>
          );
        })}
      </div>

      {/* EEP50 Bar Chart */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <h3 className="chart-heading">EEP50 by Institute (FY2025) — most to least competitive</h3>
        <InfoTooltip term="EEP50" definition="The percentile at which modeled funding probability reaches 50% — the statistical payline." why="Lower EEP50 = more competitive." />
      </div>
      <div style={{ height: '260px', marginBottom: '2rem' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis dataKey="institute" tick={{ ...TICK, fontSize: 9 }} interval={0} angle={-30} textAnchor="end" height={50} />
            <YAxis tick={TICK} label={{ ...AXIS_LABEL, value: 'EEP50 (Percentile)', angle: -90, position: 'insideLeft' }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="EEP50" radius={[3, 3, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={QUADRANT_COLORS[entry.quadrant] ?? '#6b7280'}
                  opacity={focusedIC && entry.institute !== focusedIC ? 0.2 : 0.9}
                  onClick={() => setFocusedIC(entry.institute === focusedIC ? null : entry.institute)}
                  style={{ cursor: 'pointer' }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Opportunity Width Chart */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <h3 className="chart-heading">Opportunity Width by Institute — FY2025</h3>
        <InfoTooltip term="Opportunity Width" definition="Gap between EEP20 and EEP80 in percentile points." why="Wider = broader gray zone; narrower = steeper funding cliff." />
      </div>
      <div style={{ height: '240px', marginBottom: '2rem' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={[...chartData].sort((a, b) => (b.OppWidth ?? 0) - (a.OppWidth ?? 0))} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis dataKey="institute" tick={{ ...TICK, fontSize: 9 }} interval={0} angle={-30} textAnchor="end" height={50} />
            <YAxis tick={TICK} label={{ ...AXIS_LABEL, value: 'Percentile Points', angle: -90, position: 'insideLeft' }} />
            <Tooltip formatter={(val: number) => `${val.toFixed(1)} pp`} contentStyle={{ background: 'var(--surface3)', border: '1px solid var(--border-md)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '12px' }} />
            <Bar dataKey="OppWidth" radius={[3, 3, 0, 0]} name="Opportunity Width">
              {[...chartData].sort((a, b) => (b.OppWidth ?? 0) - (a.OppWidth ?? 0)).map((entry, i) => (
                <Cell key={i} fill={focusedIC && entry.institute !== focusedIC ? 'rgba(14,165,233,0.15)' : 'var(--accent)'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <h3 className="chart-heading" style={{ marginBottom: '0.75rem' }}>Full Institute Summary — FY2025</h3>
      <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border)' }}>
        <table style={{ width: '100%' }}>
          <thead>
            <tr>
              {['Institute', 'EEP80', 'EEP50', 'EEP20', 'Opp. Width', 'Rate', 'Applications', 'YoY Δ', 'Typology'].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ics.map((d) => (
              <tr
                key={d.institute}
                onClick={() => setFocusedIC(d.institute === focusedIC ? null : d.institute)}
                style={{
                  cursor: 'pointer',
                  outline: focusedIC === d.institute ? '1px solid var(--accent)' : 'none',
                  outlineOffset: '-1px',
                }}
              >
                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{d.institute}</td>
                <td style={{ fontFamily: '"DM Mono", monospace' }}>{d.fy2025.eep80?.toFixed(1) ?? '—'}</td>
                <td style={{ fontFamily: '"DM Mono", monospace', fontWeight: 700, color: QUADRANT_COLORS[d.fy2025.typologyQuadrant] ?? 'var(--text-primary)' }}>
                  {d.fy2025.eep50?.toFixed(1) ?? '—'}
                </td>
                <td style={{ fontFamily: '"DM Mono", monospace' }}>{d.fy2025.eep20?.toFixed(1) ?? '—'}</td>
                <td style={{ fontFamily: '"DM Mono", monospace' }}>{d.fy2025.opportunityWidth?.toFixed(1) ?? '—'}</td>
                <td style={{ fontFamily: '"DM Mono", monospace' }}>{(d.fy2025.overallFundingRate * 100).toFixed(1)}%</td>
                <td style={{ fontFamily: '"DM Mono", monospace' }}>{d.fy2025.totalApplications.toLocaleString()}</td>
                <td style={{ fontFamily: '"DM Mono", monospace', fontWeight: 600, color: d.fy2025.eep50YoYChange < 0 ? '#f87171' : '#34d399' }}>
                  {d.fy2025.eep50YoYChange > 0 ? '+' : ''}{d.fy2025.eep50YoYChange.toFixed(1)}
                </td>
                <td>
                  <span className="quadrant-badge" style={{
                    background: `${QUADRANT_COLORS[d.fy2025.typologyQuadrant]}18`,
                    color: QUADRANT_COLORS[d.fy2025.typologyQuadrant] ?? 'var(--text-secondary)',
                    border: `1px solid ${QUADRANT_COLORS[d.fy2025.typologyQuadrant]}35`,
                  }}>
                    {d.fy2025.typologyQuadrantLabel}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', fontFamily: '"DM Mono", monospace' }}>
        Click a row or bar to focus the narrative on that institute
      </p>

      {narrative && (
        <InsightPanel
          contextLabel={focusedIC ? `For selected institute: ${focusedIC}` : `Showing most competitive IC: ${ics[0]?.institute}`}
          insight={narrative.insight}
          interpretation={narrative.interpretation}
          leadershipImplication={narrative.leadershipImplication}
          caution={narrative.caution}
        />
      )}
    </SectionShell>
  );
}
