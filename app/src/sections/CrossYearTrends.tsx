import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import SectionShell from '../components/SectionShell';
import InsightPanel from '../components/InsightPanel';
import LoadingSpinner from '../components/LoadingSpinner';
import TabHelpPanel from '../components/TabHelpPanel';
import InfoTooltip from '../components/InfoTooltip';
import { useData } from '../hooks/useData';
import { generateTrendInsight } from '../narrativeHelpers';
import type { InstituteProfile } from '../types';

const COLORS = [
  '#0ea5e9','#ef4444','#10b981','#f59e0b','#8b5cf6','#06b6d4',
  '#ec4899','#84cc16','#f97316','#7c3aed','#14b8a6','#ca8a04',
  '#6366f1','#e11d48','#16a34a','#c2410c','#7c3aed','#0284c7',
];

const TICK = { fill: 'var(--text-muted)', fontSize: 11, fontFamily: '"DM Mono", monospace' };
const GRID = 'rgba(255,255,255,0.05)';
const TOOLTIP_STYLE = { background: 'var(--surface3)', border: '1px solid var(--border-md)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '12px' };

export default function CrossYearTrends() {
  const { data, loading } = useData<InstituteProfile[]>('institute_profiles.json');
  const [selected, setSelected] = useState<string[]>(['ALL NIH', 'NCI', 'NHLBI', 'NIAID']);

  if (loading || !data) return <LoadingSpinner />;

  const allInstitutes = data.map(d => d.institute);
  const years = [2014,2015,2016,2017,2018,2019,2020,2021,2022,2023,2024,2025];

  const chartData = years.map(yr => {
    const row: Record<string, number | string | null> = { year: yr };
    data.forEach(profile => {
      if (selected.includes(profile.institute)) {
        const h = profile.history.find(x => x.year === yr);
        row[profile.institute] = h?.eep50 ?? null;
      }
    });
    return row;
  });

  const yoyData = data
    .filter(d => !d.isAggregate)
    .map(d => ({
      institute: d.institute,
      eep50_2024: d.history.find(h => h.year === 2024)?.eep50 ?? null,
      eep50_2025: d.fy2025.eep50,
      change: d.fy2025.eep50YoYChange,
    }))
    .filter(d => d.change !== null)
    .sort((a, b) => (a.change ?? 0) - (b.change ?? 0));

  const toggle = (ic: string) =>
    setSelected(prev => prev.includes(ic) ? prev.filter(x => x !== ic) : [...prev, ic]);

  const narrative = generateTrendInsight(selected, data.map(d => ({
    institute: d.institute,
    history: d.history,
    fy2025: { eep50: d.fy2025.eep50, eep50YoYChange: d.fy2025.eep50YoYChange },
  })));

  return (
    <SectionShell
      title="Cross-Year Funding Trends by Institute"
      description="Year-over-year movement in EEP50 across all 20 institutes from FY2014 to FY2025."
    >
      <TabHelpPanel
        what="Year-over-year EEP50 trends for selected institutes from FY2014 to FY2025, plus a table showing how much each institute's payline changed from FY2024 to FY2025."
        why="Comparing multiple institutes on the same chart reveals whether compression is system-wide or institute-specific — critical for distinguishing policy-level shifts from IC-specific changes."
        how="Each colored line = one institute's EEP50 over time. Falling lines = tighter paylines. Steeper FY2024–2025 drops = more compression. The table ranks all ICs by magnitude of FY2024→FY2025 change."
        controls="Toggle institute buttons to add or remove lines. The narrative updates to reflect the currently selected set."
        tip="In FY2025, all 20 institutes moved in the same direction (tighter). The magnitude varies enormously: NIA dropped 13.0 pp while NIDCR dropped only 1.0 pp."
      />

      {/* Institute selector */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <p style={{ fontFamily: '"DM Mono", monospace', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Select Institutes
          </p>
          <InfoTooltip term="EEP50 Trend" definition="The modeled 50% funding probability threshold for each institute, plotted year by year." why="Shows how competitive pressures have evolved at each institute." />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {allInstitutes.map((ic, i) => {
            const isActive = selected.includes(ic);
            return (
              <button
                key={ic}
                onClick={() => toggle(ic)}
                className="ic-pill"
                style={isActive ? {
                  backgroundColor: COLORS[i % COLORS.length],
                  borderColor: 'transparent',
                  color: '#fff',
                } : {}}
              >
                {ic}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ height: '300px', marginBottom: '2rem' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis dataKey="year" tick={TICK} />
            <YAxis tick={TICK} label={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: '"DM Mono", monospace', value: 'EEP50 (Percentile)', angle: -90, position: 'insideLeft' }} />
            <Tooltip formatter={(val: number) => val?.toFixed(1) ?? 'N/A'} contentStyle={TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: '11px', fontFamily: '"DM Mono", monospace', paddingTop: '8px' }} />
            {selected.map((ic, i) => (
              <Line
                key={ic}
                type="monotone"
                dataKey={ic}
                stroke={COLORS[allInstitutes.indexOf(ic) % COLORS.length]}
                strokeWidth={ic === 'ALL NIH' ? 3 : 1.5}
                dot={{ r: 2 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* YoY Change table */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
        <h3 className="chart-heading">EEP50 Change FY2024 → FY2025 (All ICs)</h3>
        <InfoTooltip term="YoY Change" definition="Year-over-year change in EEP50 from FY2024 to FY2025, in percentile points." why="Negative values = tighter paylines. Larger negative = more severe compression." />
      </div>
      <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border)' }}>
        <table style={{ width: '100%' }}>
          <thead>
            <tr>
              {['Institute', 'EEP50 (FY2024)', 'EEP50 (FY2025)', 'Change (pp)', 'Magnitude'].map(h => <th key={h}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {yoyData.map(d => (
              <tr
                key={d.institute}
                onClick={() => toggle(d.institute)}
                style={{ cursor: 'pointer' }}
              >
                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{d.institute}</td>
                <td style={{ fontFamily: '"DM Mono", monospace' }}>{d.eep50_2024?.toFixed(1) ?? '—'}</td>
                <td style={{ fontFamily: '"DM Mono", monospace' }}>{d.eep50_2025?.toFixed(1) ?? '—'}</td>
                <td style={{ fontFamily: '"DM Mono", monospace', fontWeight: 700, color: (d.change ?? 0) < 0 ? '#f87171' : '#34d399' }}>
                  {d.change !== null ? `${d.change > 0 ? '+' : ''}${d.change.toFixed(1)}` : '—'}
                </td>
                <td>
                  <div style={{ width: '100%', background: 'var(--surface3)', borderRadius: '99px', height: '4px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{
                      position: 'absolute', right: 0, top: 0, height: '4px',
                      borderRadius: '99px', background: '#ef4444',
                      width: `${Math.min(Math.abs((d.change ?? 0)) / 15 * 100, 100)}%`,
                    }} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', fontFamily: '"DM Mono", monospace' }}>
        Click a row to toggle that institute on the chart
      </p>

      <InsightPanel
        contextLabel={`Based on current selection: ${selected.join(', ')}`}
        insight={narrative.insight}
        interpretation={narrative.interpretation}
        leadershipImplication={narrative.leadershipImplication}
        caution={narrative.caution}
      />
    </SectionShell>
  );
}
