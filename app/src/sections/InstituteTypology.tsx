import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import SectionShell from '../components/SectionShell';
import InsightPanel from '../components/InsightPanel';
import LoadingSpinner from '../components/LoadingSpinner';
import { useData } from '../hooks/useData';
import type { TypologyData } from '../types';

const QUADRANT_COLORS: Record<string, string> = {
  sharpPayline: '#dc2626',
  competitiveProbabilistic: '#d97706',
  moderateFocused: '#2563eb',
  broadOpportunityWindow: '#16a34a',
};

export default function InstituteTypology() {
  const { data, loading } = useData<TypologyData>('typology.json');

  if (loading || !data) return <LoadingSpinner />;

  const { thresholds, institutes, quadrants } = data;

  const scatterData = institutes
    .filter(d => d.eep50 !== null && d.opportunityWidth !== null)
    .map(d => ({
      x: d.eep50,
      y: d.opportunityWidth,
      name: d.institute,
      quadrant: d.typologyQuadrant,
      label: d.typologyQuadrantLabel,
      rate: d.overallFundingRate,
    }));

  const CustomDot = (props: { cx?: number; cy?: number; payload?: { name: string; quadrant: string } }) => {
    const { cx, cy, payload } = props;
    if (cx === undefined || cy === undefined || !payload) return null;
    const color = QUADRANT_COLORS[payload.quadrant] ?? '#6b7280';
    return (
      <g>
        <circle cx={cx} cy={cy} r={7} fill={color} fillOpacity={0.85} />
        <text x={cx + 9} y={cy + 4} fontSize={9} fill="#374151">{payload.name}</text>
      </g>
    );
  };

  return (
    <SectionShell
      title="Institute Typology: Payline Structure"
      description="Two-dimensional classification of NIH institutes by EEP50 (competitive position) and Opportunity Width (funding zone spread) for FY2025."
    >
      {/* Quadrant summary cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {Object.entries(quadrants).map(([key, q]) => (
          <div key={key} className="rounded-lg border p-3" style={{ borderColor: QUADRANT_COLORS[key], backgroundColor: `${QUADRANT_COLORS[key]}08` }}>
            <p className="font-semibold text-sm mb-1" style={{ color: QUADRANT_COLORS[key] }}>{q.label}</p>
            <p className="text-xs text-gray-600 mb-2">{q.description}</p>
            <div className="flex flex-wrap gap-1">
              {q.institutes.map(ic => (
                <span key={ic} className="text-xs px-2 py-0.5 rounded-full font-medium text-white" style={{ backgroundColor: QUADRANT_COLORS[key] }}>{ic}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Scatter plot */}
      <h3 className="text-lg font-semibold text-gray-800 mb-1">Typology Scatter: EEP50 vs Opportunity Width — FY2025</h3>
      <p className="text-xs text-gray-500 mb-3">Dashed lines mark the IC medians: EEP50 = {thresholds.eep50Median}, Opp. Width = {thresholds.owMedian} pp</p>
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 60, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              type="number"
              dataKey="x"
              name="EEP50"
              label={{ value: 'EEP50 (Percentile)', position: 'insideBottom', offset: -10, style: { fontSize: 11 } }}
              tick={{ fontSize: 11 }}
              domain={[0, 20]}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Opp. Width"
              label={{ value: 'Opportunity Width (pp)', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }}
              tick={{ fontSize: 11 }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-white border border-gray-200 rounded-lg p-3 shadow text-xs">
                    <p className="font-bold text-gray-900 mb-1">{d.name}</p>
                    <p>EEP50: {d.x?.toFixed(1)}</p>
                    <p>Opp. Width: {d.y?.toFixed(1)} pp</p>
                    <p>Funding Rate: {(d.rate * 100).toFixed(1)}%</p>
                    <p className="mt-1" style={{ color: QUADRANT_COLORS[d.quadrant] }}>{d.label}</p>
                  </div>
                );
              }}
            />
            <ReferenceLine x={thresholds.eep50Median} stroke="#9ca3af" strokeDasharray="5 5" />
            <ReferenceLine y={thresholds.owMedian} stroke="#9ca3af" strokeDasharray="5 5" />
            <Scatter data={scatterData} shape={<CustomDot />}>
              {scatterData.map((_entry, i) => (
                <Cell key={i} fill={QUADRANT_COLORS[scatterData[i].quadrant] ?? '#6b7280'} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <h3 className="text-lg font-semibold text-gray-800 mb-3 mt-6">Full Typology Classification — FY2025</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead>
            <tr className="bg-gray-50">
              {['Institute', 'EEP50', 'Opp. Width', 'Funding Rate', 'Typology', 'YoY Change'].map(h => (
                <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {[...institutes].sort((a, b) => a.typologyQuadrant.localeCompare(b.typologyQuadrant) || (a.eep50 ?? 99) - (b.eep50 ?? 99)).map((d, i) => (
              <tr key={d.institute} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-3 py-2 font-semibold text-gray-900">{d.institute}</td>
                <td className="px-3 py-2 text-gray-700">{d.eep50?.toFixed(1) ?? '—'}</td>
                <td className="px-3 py-2 text-gray-700">{d.opportunityWidth?.toFixed(1) ?? '—'}</td>
                <td className="px-3 py-2 text-gray-700">{(d.overallFundingRate * 100).toFixed(1)}%</td>
                <td className="px-3 py-2">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium text-white" style={{ backgroundColor: QUADRANT_COLORS[d.typologyQuadrant] ?? '#6b7280' }}>
                    {d.typologyQuadrantLabel}
                  </span>
                </td>
                <td className={`px-3 py-2 font-medium ${d.eep50YoYChange < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {d.eep50YoYChange > 0 ? '+' : ''}{d.eep50YoYChange.toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <InsightPanel
        insight="Using FY2025 EEP50 (median 10.7) and Opportunity Width (median 9.7) as thresholds, the 19 ICs fall into four quadrants. Sharp Payline (5 ICs): NCI, NHGRI, NIA, NIDDK, NINDS. Competitive & Probabilistic (1 IC): NIMH. Moderate & Focused (3 ICs): NHLBI, NIAMS, NLM. Broad Opportunity Window (7 ICs): NEI, NIAAA, NIAID, NICHD, NIDA, NIDCD, NIDCR."
        interpretation="The typology reveals that institute selection is a strategic variable. Investigators submitting to Sharp Payline institutes must reach a very specific score target or face near-zero probability. Broad Opportunity Window institutes are structurally more forgiving — a score at the 18th percentile at NIAAA (EEP20 24.1) is still inside the meaningful funding zone, while the same score at NCI is well outside it."
        leadershipImplication="Departments should map their faculty's funding portfolio against this typology annually. Heavy concentration in Sharp Payline ICs creates high-variance outcomes. For early-stage investigators, the typology provides a framework for IC selection: a slightly lower-scoring first submission to a Broad Window IC may yield a higher-probability outcome than a higher-scoring submission to a Sharp Payline IC, if scientific fit allows."
      />
    </SectionShell>
  );
}
