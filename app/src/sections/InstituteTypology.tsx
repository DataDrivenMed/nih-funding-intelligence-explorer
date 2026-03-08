import { useState } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import SectionShell from '../components/SectionShell';
import InsightPanel from '../components/InsightPanel';
import LoadingSpinner from '../components/LoadingSpinner';
import TabHelpPanel from '../components/TabHelpPanel';
import InfoTooltip from '../components/InfoTooltip';
import { useData } from '../hooks/useData';
import { generateTypologyInsight } from '../narrativeHelpers';
import type { TypologyData } from '../types';

const QUADRANT_COLORS: Record<string, string> = {
  sharpPayline:             '#ef4444',
  competitiveProbabilistic: '#f59e0b',
  moderateFocused:          '#0ea5e9',
  broadOpportunityWindow:   '#10b981',
};

const TICK = { fill: 'var(--text-muted)', fontSize: 10, fontFamily: '"DM Mono", monospace' };
const GRID = 'rgba(255,255,255,0.05)';

export default function InstituteTypology() {
  const { data, loading } = useData<TypologyData>('typology.json');
  const [selectedIC, setSelectedIC] = useState<string | null>(null);

  if (loading || !data) return <LoadingSpinner />;

  const { thresholds, institutes, quadrants } = data;

  const scatterData = institutes
    .filter(d => d.eep50 !== null && d.opportunityWidth !== null)
    .map(d => ({
      x: d.eep50, y: d.opportunityWidth,
      name: d.institute, quadrant: d.typologyQuadrant,
      label: d.typologyQuadrantLabel, rate: d.overallFundingRate,
    }));

  const narrative = generateTypologyInsight(
    selectedIC,
    institutes.map(d => ({
      institute: d.institute, eep50: d.eep50, opportunityWidth: d.opportunityWidth,
      overallFundingRate: d.overallFundingRate, typologyQuadrant: d.typologyQuadrant,
      typologyQuadrantLabel: d.typologyQuadrantLabel, eep50YoYChange: d.eep50YoYChange,
    })),
    thresholds,
  );

  const CustomDot = (props: { cx?: number; cy?: number; payload?: { name: string; quadrant: string } }) => {
    const { cx, cy, payload } = props;
    if (cx === undefined || cy === undefined || !payload) return null;
    const color = QUADRANT_COLORS[payload.quadrant] ?? '#6b7280';
    const isSelected = payload.name === selectedIC;
    return (
      <g style={{ cursor: 'pointer' }} onClick={() => setSelectedIC(payload.name === selectedIC ? null : payload.name)}>
        <circle cx={cx} cy={cy} r={isSelected ? 10 : 7}
          fill={color} fillOpacity={selectedIC && payload.name !== selectedIC ? 0.15 : 0.85}
          stroke={isSelected ? '#fff' : 'none'} strokeWidth={isSelected ? 2 : 0}
        />
        <text x={cx + 11} y={cy + 4} fontSize={9}
          fill={selectedIC && payload.name !== selectedIC ? 'var(--text-muted)' : 'var(--text-secondary)'}>
          {payload.name}
        </text>
      </g>
    );
  };

  return (
    <SectionShell
      title="Institute Typology: Payline Structure"
      description="Two-dimensional classification of NIH institutes by EEP50 (competitive position) and Opportunity Width (funding zone spread) for FY2025."
    >
      <TabHelpPanel
        what="A two-dimensional scatter plot classifying all 19 NIH institutes by their FY2025 EEP50 (how competitive) and Opportunity Width (how broad the gray zone is), grouped into four typology quadrants."
        why="The typology reveals that institute selection is a strategic variable — not just scientific fit. An application at the same score has very different odds at a Sharp Payline vs. a Broad Opportunity Window institute."
        how="Each dot = one institute. X-axis = EEP50 (lower = more competitive). Y-axis = Opportunity Width (higher = broader gray zone). Dashed lines show IC medians dividing the four quadrants."
        controls="Click any dot, table row, or quadrant badge to focus the narrative on that institute. Use the dropdown or click again to deselect."
        tip="Sharp Payline institutes require near-perfect scores. Broad Opportunity Window institutes offer meaningful odds across a wider score range — key for early-stage investigator IC alignment."
      />

      {/* IC selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
        <label style={{ fontFamily: '"DM Mono", monospace', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          Focus Institute
        </label>
        <select value={selectedIC ?? ''} onChange={e => setSelectedIC(e.target.value || null)} className="form-select">
          <option value="">(show all)</option>
          {institutes.map(d => <option key={d.institute} value={d.institute}>{d.institute}</option>)}
        </select>
        {selectedIC && (
          <button onClick={() => setSelectedIC(null)}
            style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
            Clear
          </button>
        )}
      </div>

      {/* Quadrant summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px', marginBottom: '1.5rem' }}>
        {Object.entries(quadrants).map(([key, q]) => (
          <div key={key} style={{
            borderRadius: '10px',
            border: `1px solid ${QUADRANT_COLORS[key]}30`,
            background: `${QUADRANT_COLORS[key]}08`,
            padding: '14px 16px',
          }}>
            <p style={{ fontFamily: '"DM Mono", monospace', fontSize: '11px', fontWeight: 600, color: QUADRANT_COLORS[key], marginBottom: '4px', letterSpacing: '0.03em' }}>
              {q.label}
            </p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '10px', lineHeight: 1.4 }}>{q.description}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {q.institutes.map(ic => (
                <span
                  key={ic}
                  onClick={() => setSelectedIC(ic === selectedIC ? null : ic)}
                  style={{
                    fontSize: '10px', padding: '2px 8px', borderRadius: '4px', fontFamily: '"DM Mono", monospace',
                    fontWeight: 500, cursor: 'pointer', transition: 'opacity 0.15s',
                    background: `${QUADRANT_COLORS[key]}20`,
                    color: QUADRANT_COLORS[key],
                    border: `1px solid ${QUADRANT_COLORS[key]}35`,
                    outline: selectedIC === ic ? `1px solid ${QUADRANT_COLORS[key]}` : 'none',
                  }}
                >
                  {ic}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Scatter plot */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
        <h3 className="chart-heading">Typology Scatter: EEP50 vs Opportunity Width — FY2025</h3>
        <InfoTooltip term="Opportunity Width" definition="The gap between EEP20 and EEP80 in percentile points." why="Wide width = more scoring flexibility; narrow width = small score differences have outsized impact." />
      </div>
      <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: '"DM Mono", monospace', marginBottom: '14px' }}>
        IC medians: EEP50 = {thresholds.eep50Median} · Opp. Width = {thresholds.owMedian} pp · Click dots to focus narrative
      </p>
      <div style={{ height: '380px', marginBottom: '2rem' }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 60, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis type="number" dataKey="x" name="EEP50"
              label={{ value: 'EEP50 (Percentile)', position: 'insideBottom', offset: -10, fill: 'var(--text-muted)', fontSize: 10, fontFamily: '"DM Mono", monospace' }}
              tick={TICK} domain={[0, 20]}
            />
            <YAxis type="number" dataKey="y" name="Opp. Width"
              label={{ value: 'Opportunity Width (pp)', angle: -90, position: 'insideLeft', fill: 'var(--text-muted)', fontSize: 10, fontFamily: '"DM Mono", monospace' }}
              tick={TICK}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="chart-tooltip">
                    <p style={{ fontFamily: '"DM Mono", monospace', fontSize: '11px', fontWeight: 600, color: QUADRANT_COLORS[d.quadrant] ?? 'var(--text-primary)', marginBottom: '6px' }}>{d.name}</p>
                    <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>EEP50: <strong style={{ color: 'var(--text-primary)', fontFamily: '"DM Mono", monospace' }}>{d.x?.toFixed(1)}</strong></span>
                      <span style={{ color: 'var(--text-secondary)' }}>Opp. Width: <strong style={{ color: 'var(--text-primary)', fontFamily: '"DM Mono", monospace' }}>{d.y?.toFixed(1)} pp</strong></span>
                      <span style={{ color: 'var(--text-secondary)' }}>Funding Rate: <strong style={{ color: 'var(--text-primary)', fontFamily: '"DM Mono", monospace' }}>{(d.rate * 100).toFixed(1)}%</strong></span>
                    </div>
                    <p style={{ fontSize: '10px', color: QUADRANT_COLORS[d.quadrant] ?? 'var(--text-muted)', marginTop: '4px', fontFamily: '"DM Mono", monospace' }}>{d.label}</p>
                    <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', fontStyle: 'italic' }}>Click to focus narrative</p>
                  </div>
                );
              }}
            />
            <ReferenceLine x={thresholds.eep50Median} stroke="rgba(255,255,255,0.12)" strokeDasharray="5 5" />
            <ReferenceLine y={thresholds.owMedian} stroke="rgba(255,255,255,0.12)" strokeDasharray="5 5" />
            <Scatter data={scatterData} shape={<CustomDot />}>
              {scatterData.map((_entry, i) => (
                <Cell key={i} fill={QUADRANT_COLORS[scatterData[i].quadrant] ?? '#6b7280'} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <h3 className="chart-heading" style={{ marginBottom: '0.75rem' }}>Full Typology Classification — FY2025</h3>
      <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border)' }}>
        <table style={{ width: '100%' }}>
          <thead>
            <tr>
              {['Institute', 'EEP50', 'Opp. Width', 'Funding Rate', 'Typology', 'YoY Δ'].map(h => <th key={h}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {[...institutes].sort((a, b) => a.typologyQuadrant.localeCompare(b.typologyQuadrant) || (a.eep50 ?? 99) - (b.eep50 ?? 99)).map(d => (
              <tr
                key={d.institute}
                onClick={() => setSelectedIC(d.institute === selectedIC ? null : d.institute)}
                style={{ cursor: 'pointer', outline: selectedIC === d.institute ? '1px solid var(--accent)' : 'none', outlineOffset: '-1px' }}
              >
                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{d.institute}</td>
                <td style={{ fontFamily: '"DM Mono", monospace' }}>{d.eep50?.toFixed(1) ?? '—'}</td>
                <td style={{ fontFamily: '"DM Mono", monospace' }}>{d.opportunityWidth?.toFixed(1) ?? '—'}</td>
                <td style={{ fontFamily: '"DM Mono", monospace' }}>{(d.overallFundingRate * 100).toFixed(1)}%</td>
                <td>
                  <span className="quadrant-badge" style={{
                    background: `${QUADRANT_COLORS[d.typologyQuadrant]}18`,
                    color: QUADRANT_COLORS[d.typologyQuadrant] ?? 'var(--text-secondary)',
                    border: `1px solid ${QUADRANT_COLORS[d.typologyQuadrant]}35`,
                  }}>
                    {d.typologyQuadrantLabel}
                  </span>
                </td>
                <td style={{ fontFamily: '"DM Mono", monospace', fontWeight: 600, color: d.eep50YoYChange < 0 ? '#f87171' : '#34d399' }}>
                  {d.eep50YoYChange > 0 ? '+' : ''}{d.eep50YoYChange.toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', fontFamily: '"DM Mono", monospace' }}>
        Click a row or scatter dot to focus the narrative on that institute
      </p>

      <InsightPanel
        contextLabel={selectedIC ? `For selected institute: ${selectedIC}` : 'Showing system-wide typology overview'}
        insight={narrative.insight}
        interpretation={narrative.interpretation}
        leadershipImplication={narrative.leadershipImplication}
        caution={narrative.caution}
      />
    </SectionShell>
  );
}
