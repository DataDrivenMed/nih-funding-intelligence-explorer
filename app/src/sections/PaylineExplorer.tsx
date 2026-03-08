import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import SectionShell from '../components/SectionShell';
import InsightPanel from '../components/InsightPanel';
import LoadingSpinner from '../components/LoadingSpinner';
import { useData } from '../hooks/useData';
import type { InstituteProfile } from '../types';

export default function PaylineExplorer() {
  const { data, loading } = useData<InstituteProfile[]>('institute_profiles.json');
  const [selectedIC, setSelectedIC] = useState('ALL NIH');

  if (loading || !data) return <LoadingSpinner />;

  const institutes = data.map(d => d.institute);
  const profile = data.find(d => d.institute === selectedIC);

  if (!profile) return null;

  const chartData = profile.history
    .filter(h => h.eep50 !== null)
    .map(h => ({
      year: h.year,
      'EEP80': h.eep80,
      'EEP50': h.eep50,
      'EEP20': h.eep20,
      'Opp. Width': h.ow,
    }));

  const bandRows = Object.entries(profile.bandRates2025).map(([band, v]) => ({
    band,
    rate: v.rate,
    total: v.total,
  }));

  return (
    <SectionShell
      title="Effective Payline Explorer"
      description="Modeled EEP80/EEP50/EEP20 thresholds per institute and year from weighted binomial logistic regression."
    >
      {/* IC Selector */}
      <div className="flex items-center gap-3 mb-6">
        <label className="text-sm font-medium text-gray-700">Select Institute:</label>
        <select
          value={selectedIC}
          onChange={e => setSelectedIC(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {institutes.map(ic => (
            <option key={ic} value={ic}>{ic}</option>
          ))}
        </select>
      </div>

      {/* FY2025 Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          { label: 'EEP80', value: profile.fy2025.eep80, desc: '80% funding probability', color: 'text-green-700' },
          { label: 'EEP50', value: profile.fy2025.eep50, desc: '50% — statistical payline', color: 'text-blue-700' },
          { label: 'EEP20', value: profile.fy2025.eep20, desc: '20% — outer edge', color: 'text-purple-700' },
          { label: 'Opp. Width', value: profile.fy2025.opportunityWidth, desc: 'EEP20 − EEP80 (pp)', color: 'text-gray-700' },
          { label: 'Funding Rate', value: profile.fy2025.overallFundingRate !== null ? +(profile.fy2025.overallFundingRate * 100).toFixed(1) : null, desc: 'Overall FY2025', color: 'text-red-700', suffix: '%' },
        ].map(item => (
          <div key={item.label} className="kpi-card text-center">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">{item.label}</p>
            <p className={`text-2xl font-bold ${item.color}`}>
              {item.value !== null && item.value !== undefined ? `${item.value.toFixed(1)}${item.suffix ?? ''}` : '—'}
            </p>
            <p className="text-xs text-gray-400 mt-1">{item.desc}</p>
          </div>
        ))}
      </div>

      {/* History chart */}
      <h3 className="text-lg font-semibold text-gray-800 mb-3">{selectedIC}: EEP Trend, FY2014–FY2025</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="year" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} label={{ value: 'Percentile', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }} />
            <Tooltip formatter={(val: number) => val?.toFixed(1) ?? 'N/A'} />
            <Legend />
            <ReferenceLine x={2025} stroke="#dc2626" strokeDasharray="4 4" />
            <Line type="monotone" dataKey="EEP80" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} connectNulls />
            <Line type="monotone" dataKey="EEP50" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
            <Line type="monotone" dataKey="EEP20" stroke="#9333ea" strokeWidth={2} dot={{ r: 3 }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Band rates table */}
      <h3 className="text-lg font-semibold text-gray-800 mb-3 mt-8">{selectedIC}: FY2025 Funding Rates by Band</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead>
            <tr className="bg-gray-50">
              {['Percentile Band', 'Applications', 'Funding Rate', 'Funded (est.)'].map(h => (
                <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {bandRows.map((r, i) => (
              <tr key={r.band} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-4 py-2 font-semibold">{r.band}</td>
                <td className="px-4 py-2 text-gray-700">{r.total}</td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-500 rounded-full h-2" style={{ width: `${(r.rate * 100).toFixed(0)}%` }}></div>
                    </div>
                    <span className="font-semibold text-blue-700">{(r.rate * 100).toFixed(1)}%</span>
                  </div>
                </td>
                <td className="px-4 py-2 text-gray-700">{Math.round(r.rate * r.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <InsightPanel
        insight="The ALL NIH EEP model fits are exceptionally precise: average McFadden pseudo-R² of 0.963. In FY2025, the three EEP thresholds are: EEP80 = 5.7 (80% funding probability), EEP50 = 11.1 (50% — statistical payline), and EEP20 = 16.5 (20% — bottom of the meaningful funding zone). The Opportunity Width of 10.8 pp is the narrowest in the 12-year dataset."
        interpretation="EEP values translate study section scores into concrete funding probability estimates. An application scored at the 8th percentile at ALL NIH in FY2025 has a modeled 69.1% funding probability. The same application scored at the 15th percentile has a 27.0% probability. At the 20th percentile, probability falls to 9.3%."
        leadershipImplication="Research development staff can use EEP values to provide probabilistic funding counseling. When an investigator asks whether to resubmit after a score of 14, the answer is IC-specific: at NHLBI (EEP50 14.6) that score sits near the 50% threshold; at NCI (EEP50 7.9) the same score is well above EEP20 and represents a low-probability outcome."
      />
    </SectionShell>
  );
}
