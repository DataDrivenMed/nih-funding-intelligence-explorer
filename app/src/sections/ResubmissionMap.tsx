import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, Legend, ReferenceLine } from 'recharts';
import SectionShell from '../components/SectionShell';
import InsightPanel from '../components/InsightPanel';
import LoadingSpinner from '../components/LoadingSpinner';
import TabHelpPanel from '../components/TabHelpPanel';
import InfoTooltip from '../components/InfoTooltip';
import { useData } from '../hooks/useData';
import { generateResubmissionInsight } from '../narrativeHelpers';
import type { InstituteProfile } from '../types';

type TransitionKey = '20to15' | '18to12' | '15to10' | '12to8';

interface ResubSummary {
  transitions: { id: string; label: string; from: number; to: number; description: string }[];
  byYear: Record<string, Record<string, Record<TransitionKey, { probFrom: number; probTo: number; absGain: number; relGainPct: number }>>>;
  fy2025Ranked: unknown[];
}

const TRANSITIONS: { key: TransitionKey; label: string; color: string }[] = [
  { key: '20to15', label: '20→15', color: '#64748b' },
  { key: '18to12', label: '18→12', color: '#f59e0b' },
  { key: '15to10', label: '15→10', color: '#0ea5e9' },
  { key: '12to8',  label: '12→8',  color: '#10b981' },
];

const TERM_DEFS = [
  { term: 'Probability Gain', def: 'The increase in modeled funding probability from improving a score.', why: 'Estimates the resubmission upside — how much a score improvement is worth.' },
  { term: 'Score Transition', def: 'A defined improvement in percentile score, e.g., 18→12 means moving from the 18th to 12th percentile.', why: 'Shows concrete realistic improvement scenarios and their expected payoff.' },
  { term: 'Absolute Prob. Gain', def: 'The raw percentage-point increase in funding probability.', why: 'A direct, intuitive measure of resubmission value.' },
  { term: 'Resubmission Opportunity', def: 'The potential funding probability gain from improving an application\'s score.', why: 'Helps prioritize which applications are most worth resubmitting.' },
];

const TICK = { fill: 'var(--text-muted)', fontSize: 10, fontFamily: '"DM Mono", monospace' };
const GRID = 'rgba(255,255,255,0.05)';
const TOOLTIP_STYLE = { background: 'var(--surface3)', border: '1px solid var(--border-md)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '12px' };

export default function ResubmissionMap() {
  const { data, loading } = useData<InstituteProfile[]>('institute_profiles.json');
  const { data: resubData, loading: resubLoading } = useData<ResubSummary>('resubmission_summary.json');
  const [selectedIC, setSelectedIC] = useState('ALL NIH');

  if (loading || resubLoading || !data || !resubData) return <LoadingSpinner />;

  const allInstituteNames = data.map(d => d.institute);
  const profile = data.find(d => d.institute === selectedIC);
  if (!profile) return null;

  const gains2025 = TRANSITIONS.map(t => {
    const g = profile.resubmission2025[t.key];
    return {
      transition: t.label, key: t.key, color: t.color,
      from: g ? `${(g.probFrom * 100).toFixed(1)}%` : '—',
      to: g ? `${(g.probTo * 100).toFixed(1)}%` : '—',
      absGain: g ? `+${(g.absGain * 100).toFixed(1)} pp` : '—',
      relGain: g ? `+${g.relGainPct.toFixed(0)}%` : '—',
      absGainNum: g ? +(g.absGain * 100).toFixed(1) : 0,
    };
  });

  const years = Object.keys(resubData.byYear).map(Number).sort((a, b) => a - b);
  const trendData = years.map(yr => {
    const yrStr = String(yr);
    const icData = resubData.byYear[yrStr]?.[selectedIC];
    const row: Record<string, number | string | null> = { year: yr };
    TRANSITIONS.forEach(t => {
      row[t.label] = icData?.[t.key]?.absGain !== undefined ? +(icData[t.key].absGain * 100).toFixed(1) : null;
    });
    return row;
  });

  const allIcs2025 = data
    .filter(d => !d.isAggregate)
    .map(d => ({
      institute: d.institute,
      absGain: d.resubmission2025['18to12'] ? +(d.resubmission2025['18to12'].absGain * 100).toFixed(1) : 0,
      highlight: d.institute === selectedIC,
    }))
    .sort((a, b) => b.absGain - a.absGain);

  const narrative = generateResubmissionInsight(selectedIC, resubData.byYear, allInstituteNames);

  return (
    <SectionShell
      title="Resubmission Opportunity Map"
      description="Modeled funding probability gains from score improvement at four clinically meaningful score transitions — institute-driven and historically tracked."
    >
      <TabHelpPanel
        what="Modeled probability gains from improving a grant's score across four transitions (20→15, 18→12, 15→10, 12→8), for a selected institute over FY2014–FY2025."
        why="Probability gain shows how much a score improvement is worth at a specific institute. Different institutes have very different resubmission payoffs due to their unique funding curve shapes."
        how="The summary table shows FY2025 gains. Higher absolute gain = more resubmission upside. The trend chart shows whether gains have grown, shrunk, or remained stable over 12 years."
        controls="Use the Institute dropdown to switch between institutes. All tables, charts, and narrative update automatically."
        tip="The 18→12 transition (moving from mid-zone to near-payline) is typically the most impactful improvement. A gain of +30 pp means tripling the funding probability."
      />

      {/* Term definitions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px', marginBottom: '1.5rem' }}>
        {TERM_DEFS.map(t => (
          <div key={t.term} className="term-card">
            <p style={{ fontFamily: '"DM Mono", monospace', fontSize: '10px', fontWeight: 600, color: 'var(--accent)', marginBottom: '3px', letterSpacing: '0.04em' }}>{t.term}</p>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '3px' }}>{t.def}</p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>↗ {t.why}</p>
          </div>
        ))}
      </div>

      {/* Institute Selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
        <label style={{ fontFamily: '"DM Mono", monospace', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          Select Institute
        </label>
        <select value={selectedIC} onChange={e => setSelectedIC(e.target.value)} className="form-select">
          {allInstituteNames.map(ic => <option key={ic} value={ic}>{ic}</option>)}
        </select>
      </div>

      {/* FY2025 Probability Gain Summary Table */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
        <h3 className="chart-heading">{selectedIC}: Probability Gain by Score Transition — FY2025</h3>
        <InfoTooltip term="Absolute Probability Gain" definition="The percentage-point increase in funding probability when a score improves from one value to another." why="Larger gains = more valuable resubmission." />
      </div>
      <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '2rem' }}>
        <table style={{ width: '100%' }}>
          <thead>
            <tr>
              {['Score Transition', 'Prob. From', 'Prob. To', 'Absolute Gain', 'Relative Gain'].map(h => <th key={h}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {gains2025.map(r => (
              <tr key={r.transition}>
                <td style={{ fontWeight: 700, fontFamily: '"DM Mono", monospace', color: r.color }}>{r.transition}</td>
                <td style={{ fontFamily: '"DM Mono", monospace', color: 'var(--text-secondary)' }}>{r.from}</td>
                <td style={{ fontFamily: '"DM Mono", monospace', color: 'var(--text-secondary)' }}>{r.to}</td>
                <td style={{ fontFamily: '"DM Mono", monospace', fontWeight: 700, color: 'var(--accent)' }}>{r.absGain}</td>
                <td style={{ fontFamily: '"DM Mono", monospace', fontWeight: 600, color: '#10b981' }}>{r.relGain}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* FY2025 absolute gain bar */}
      <h3 className="chart-heading" style={{ marginBottom: '12px' }}>{selectedIC}: Gain by Transition — FY2025</h3>
      <div style={{ height: '200px', marginBottom: '2rem' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={gains2025} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis dataKey="transition" tick={TICK} />
            <YAxis tick={TICK} unit=" pp" label={{ fill: 'var(--text-muted)', fontSize: 9, fontFamily: '"DM Mono", monospace', value: 'Abs. Gain (pp)', angle: -90, position: 'insideLeft' }} />
            <Tooltip formatter={(val: number) => `+${val.toFixed(1)} pp`} contentStyle={TOOLTIP_STYLE} />
            <Bar dataKey="absGainNum" radius={[4, 4, 0, 0]} name="Abs. Gain (pp)">
              {gains2025.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* All-institute 18→12 comparison */}
      <h3 className="chart-heading" style={{ marginBottom: '4px' }}>All Institutes: 18→12 Absolute Gain — FY2025</h3>
      <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: '"DM Mono", monospace', marginBottom: '12px' }}>Highlighted = {selectedIC}</p>
      <div style={{ height: '240px', marginBottom: '2rem' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={allIcs2025} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis dataKey="institute" tick={{ ...TICK, fontSize: 9 }} interval={0} angle={-30} textAnchor="end" height={50} />
            <YAxis tick={TICK} unit=" pp" />
            <Tooltip formatter={(val: number) => `+${val.toFixed(1)} pp`} contentStyle={TOOLTIP_STYLE} />
            <Bar dataKey="absGain" radius={[3, 3, 0, 0]} name="Abs. Gain (18→12)">
              {allIcs2025.map((entry, i) => (
                <Cell key={i} fill={entry.highlight ? '#f59e0b' : 'rgba(14,165,233,0.3)'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Historical trend */}
      <h3 className="chart-heading" style={{ marginBottom: '4px' }}>{selectedIC}: Absolute Gain Trend, FY2014–FY2025</h3>
      <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: '"DM Mono", monospace', marginBottom: '12px' }}>One line per score transition. Shows whether resubmission payoff has grown or shrunk over time.</p>
      <div style={{ height: '260px', marginBottom: '2rem' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trendData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis dataKey="year" tick={TICK} />
            <YAxis tick={TICK} unit=" pp" label={{ fill: 'var(--text-muted)', fontSize: 9, fontFamily: '"DM Mono", monospace', value: 'Abs. Gain (pp)', angle: -90, position: 'insideLeft' }} />
            <Tooltip formatter={(val: unknown) => typeof val === 'number' ? `+${val.toFixed(1)} pp` : 'N/A'} contentStyle={TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: '11px', fontFamily: '"DM Mono", monospace', paddingTop: '8px' }} />
            <ReferenceLine x={2025} stroke="rgba(239,68,68,0.35)" strokeDasharray="4 4" />
            {TRANSITIONS.map(t => (
              <Line
                key={t.key}
                type="monotone"
                dataKey={t.label}
                stroke={t.color}
                strokeWidth={t.key === '18to12' ? 2.5 : 1.5}
                dot={{ r: 3 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <InsightPanel
        contextLabel={`For selected institute: ${selectedIC} · Based on current selection`}
        insight={narrative.insight}
        interpretation={narrative.interpretation}
        leadershipImplication={narrative.leadershipImplication}
        caution={narrative.caution}
      />
    </SectionShell>
  );
}
