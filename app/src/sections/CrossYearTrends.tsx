import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import SectionShell from '../components/SectionShell';
import InsightPanel from '../components/InsightPanel';
import LoadingSpinner from '../components/LoadingSpinner';
import { useData } from '../hooks/useData';
import type { InstituteProfile } from '../types';

const COLORS = [
  '#2563eb','#dc2626','#16a34a','#d97706','#9333ea','#0891b2',
  '#db2777','#65a30d','#ea580c','#7c3aed','#0d9488','#b45309',
  '#4f46e5','#be123c','#15803d','#c2410c','#6d28d9','#0369a1',
];

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

  const toggle = (ic: string) => {
    setSelected(prev => prev.includes(ic) ? prev.filter(x => x !== ic) : [...prev, ic]);
  };

  return (
    <SectionShell
      title="Cross-Year Funding Trends by Institute"
      description="Year-over-year movement in EEP50 across all 20 institutes from FY2014 to FY2025."
    >
      {/* Institute selector */}
      <div className="mb-4">
        <p className="text-sm font-medium text-gray-600 mb-2">Select institutes to display:</p>
        <div className="flex flex-wrap gap-2">
          {allInstitutes.map((ic, i) => (
            <button
              key={ic}
              onClick={() => toggle(ic)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                selected.includes(ic)
                  ? 'text-white border-transparent'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
              }`}
              style={selected.includes(ic) ? { backgroundColor: COLORS[i % COLORS.length] } : {}}
            >
              {ic}
            </button>
          ))}
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="year" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} label={{ value: 'EEP50 (Percentile)', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }} />
            <Tooltip formatter={(val: number) => val?.toFixed(1) ?? 'N/A'} />
            <Legend />
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
      <h3 className="text-lg font-semibold text-gray-800 mb-3 mt-8">EEP50 Change FY2024 → FY2025 (All ICs)</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead>
            <tr className="bg-gray-50">
              {['Institute', 'EEP50 (FY2024)', 'EEP50 (FY2025)', 'Change (pp)', 'Direction'].map(h => (
                <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {yoyData.map((d, i) => (
              <tr key={d.institute} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-4 py-2 font-semibold text-gray-900">{d.institute}</td>
                <td className="px-4 py-2 text-gray-700">{d.eep50_2024?.toFixed(1) ?? '—'}</td>
                <td className="px-4 py-2 text-gray-700">{d.eep50_2025?.toFixed(1) ?? '—'}</td>
                <td className={`px-4 py-2 font-bold ${(d.change ?? 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {d.change !== null ? `${d.change > 0 ? '+' : ''}${d.change.toFixed(1)}` : '—'}
                </td>
                <td className="px-4 py-2">
                  <div className="w-full bg-gray-100 rounded-full h-2 relative">
                    <div
                      className="absolute right-0 top-0 h-2 rounded-full bg-red-400"
                      style={{ width: `${Math.min(Math.abs((d.change ?? 0)) / 15 * 100, 100)}%` }}
                    ></div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <InsightPanel
        insight="The 2019–2023 ALL NIH EEP50 ranged within a 0.8-point band (mean 19.0, σ = 0.4), indicating structural stability over five years. FY2024 introduced the first significant break (−2.4 pp to 16.8). FY2025 accelerated with a further −5.6 pp decline to 11.1. The three most compressed ICs (2024→2025): NIA (−13.0 pp), NIMHD (−11.9 pp), NINR (−10.5 pp). Least compressed: NIDCR (−1.0 pp), NIAMS (−1.6 pp). No institute showed any loosening."
        interpretation="The universal direction (all negative) combined with highly variable magnitude signals a two-layer phenomenon: a system-wide constraint plus IC-specific factors (mission expansions, council actions, set-aside programs) producing differential compression."
        leadershipImplication="Institutional benchmarking should be conducted against IC-specific historical trends. An investigator at NIA whose score moved from 22 to 19 between resubmissions appears to have improved — but if NIA's EEP50 dropped 13 points simultaneously, their competitive position may have worsened."
      />
    </SectionShell>
  );
}
