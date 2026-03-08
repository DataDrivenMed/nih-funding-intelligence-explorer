import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import SectionShell from '../components/SectionShell';
import InsightPanel from '../components/InsightPanel';
import LoadingSpinner from '../components/LoadingSpinner';
import { useData } from '../hooks/useData';
import type { InstituteProfile } from '../types';

const QUADRANT_COLORS: Record<string, string> = {
  sharpPayline: '#dc2626',
  competitiveProbabilistic: '#d97706',
  moderateFocused: '#2563eb',
  broadOpportunityWindow: '#16a34a',
};

export default function InstituteComparison() {
  const { data, loading } = useData<InstituteProfile[]>('institute_profiles.json');

  if (loading || !data) return <LoadingSpinner />;

  const ics = data.filter(d => !d.isAggregate && d.fy2025.eep50 !== null)
    .sort((a, b) => (a.fy2025.eep50 ?? 99) - (b.fy2025.eep50 ?? 99));

  const chartData = ics.map(d => ({
    institute: d.institute,
    'EEP50': d.fy2025.eep50,
    'EEP80': d.fy2025.eep80,
    'EEP20': d.fy2025.eep20,
    'OppWidth': d.fy2025.opportunityWidth,
    'FundingRate%': +(d.fy2025.overallFundingRate * 100).toFixed(1),
    quadrant: d.fy2025.typologyQuadrant,
    label: d.fy2025.typologyQuadrantLabel,
  }));

  return (
    <SectionShell
      title="Institute Comparison: FY2025 Competitiveness"
      description="All 19 NIH institutes ranked by EEP50 (modeled 50% funding probability threshold) with opportunity width and funding rate."
    >
      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-6">
        {Object.entries(QUADRANT_COLORS).map(([k, color]) => {
          const labels: Record<string, string> = {
            sharpPayline: 'Sharp Payline',
            competitiveProbabilistic: 'Competitive & Probabilistic',
            moderateFocused: 'Moderate & Focused',
            broadOpportunityWindow: 'Broad Opportunity Window',
          };
          return (
            <span key={k} className="flex items-center gap-1.5 text-xs text-gray-700">
              <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: color }}></span>
              {labels[k]}
            </span>
          );
        })}
      </div>

      {/* EEP50 Bar Chart */}
      <h3 className="text-lg font-semibold text-gray-800 mb-3">EEP50 by Institute (FY2025) — sorted most to least competitive</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="institute" tick={{ fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={50} />
            <YAxis tick={{ fontSize: 12 }} label={{ value: 'Percentile (EEP50)', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg text-xs">
                    <p className="font-bold text-gray-900 mb-1">{d.institute}</p>
                    <p>EEP50: <span className="font-semibold">{d.EEP50?.toFixed(1) ?? 'N/A'}</span></p>
                    <p>EEP80: <span className="font-semibold">{d.EEP80?.toFixed(1) ?? 'N/A'}</span></p>
                    <p>EEP20: <span className="font-semibold">{d.EEP20?.toFixed(1) ?? 'N/A'}</span></p>
                    <p>Opp. Width: <span className="font-semibold">{d.OppWidth?.toFixed(1) ?? 'N/A'} pp</span></p>
                    <p>Funding Rate: <span className="font-semibold">{d['FundingRate%']}%</span></p>
                    <p className="mt-1 text-gray-500">{d.label}</p>
                  </div>
                );
              }}
            />
            <Bar dataKey="EEP50" radius={[3, 3, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={QUADRANT_COLORS[entry.quadrant] ?? '#6b7280'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Opportunity Width Chart */}
      <h3 className="text-lg font-semibold text-gray-800 mb-3 mt-8">Opportunity Width (EEP20 − EEP80) by Institute — FY2025</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={[...chartData].sort((a, b) => (b.OppWidth ?? 0) - (a.OppWidth ?? 0))} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="institute" tick={{ fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={50} />
            <YAxis tick={{ fontSize: 12 }} label={{ value: 'Percentile Points', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }} />
            <Tooltip formatter={(val: number) => `${val.toFixed(1)} pp`} />
            <Bar dataKey="OppWidth" fill="#0ea5e9" radius={[3, 3, 0, 0]} name="Opportunity Width" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <h3 className="text-lg font-semibold text-gray-800 mb-3 mt-8">Full Institute Summary — FY2025</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead>
            <tr className="bg-gray-50">
              {['Institute', 'EEP80', 'EEP50', 'EEP20', 'Opp. Width', 'Funding Rate', 'Applications', 'YoY Change', 'Typology'].map(h => (
                <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {ics.map((d, i) => (
              <tr key={d.institute} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-3 py-2 font-semibold text-gray-900">{d.institute}</td>
                <td className="px-3 py-2 text-gray-700">{d.fy2025.eep80?.toFixed(1) ?? '—'}</td>
                <td className="px-3 py-2 font-semibold" style={{ color: QUADRANT_COLORS[d.fy2025.typologyQuadrant] ?? '#374151' }}>
                  {d.fy2025.eep50?.toFixed(1) ?? '—'}
                </td>
                <td className="px-3 py-2 text-gray-700">{d.fy2025.eep20?.toFixed(1) ?? '—'}</td>
                <td className="px-3 py-2 text-gray-700">{d.fy2025.opportunityWidth?.toFixed(1) ?? '—'}</td>
                <td className="px-3 py-2 text-gray-700">{(d.fy2025.overallFundingRate * 100).toFixed(1)}%</td>
                <td className="px-3 py-2 text-gray-700">{d.fy2025.totalApplications.toLocaleString()}</td>
                <td className={`px-3 py-2 font-medium ${d.fy2025.eep50YoYChange < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {d.fy2025.eep50YoYChange > 0 ? '+' : ''}{d.fy2025.eep50YoYChange.toFixed(1)}
                </td>
                <td className="px-3 py-2">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{
                    backgroundColor: `${QUADRANT_COLORS[d.fy2025.typologyQuadrant]}20`,
                    color: QUADRANT_COLORS[d.fy2025.typologyQuadrant] ?? '#374151'
                  }}>
                    {d.fy2025.typologyQuadrantLabel}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <InsightPanel
        insight="In FY2025, EEP50 spans from 3.0 at NIMHD to 17.0 at NIDCR — a 14.0-point spread. 6 institutes have EEP50 below 10 (NIMHD, NHGRI, NCI, NIGMS, NIA, NINDS), meaning the 50% funding threshold falls in the top decile of scores. Opportunity Width — the percentile span between EEP80 and EEP20 — ranges from 4.6 (NINDS) to 22.7 (NIAAA)."
        interpretation="The 14.0-point spread in EEP50 means that institutional strategy — not just scientific quality — has a material effect on funding probability. An application scoring at percentile 13 at NIMHD (EEP50 3.0) has near-zero funding probability, while the same score at NIDCR (EEP50 17.0) sits near the 50/50 threshold."
        leadershipImplication="Portfolio diversification across institutes with different typologies reduces institutional funding variance. Research development staff should apply IC-specific EEP benchmarks rather than a single NIH-wide cutoff when advising faculty on resubmission decisions."
      />
    </SectionShell>
  );
}
