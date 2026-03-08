import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import SectionShell from '../components/SectionShell';
import InsightPanel from '../components/InsightPanel';
import LoadingSpinner from '../components/LoadingSpinner';
import { useData } from '../hooks/useData';
import type { InstituteProfile } from '../types';

const BANDS = ['1-5', '6-10', '11-15', '16-20', '21-25', '26+'] as const;

export default function FundingLandscape() {
  const { data, loading } = useData<InstituteProfile[]>('institute_profiles.json');

  if (loading || !data) return <LoadingSpinner />;

  const allNih = data.find(d => d.isAggregate);
  if (!allNih) return null;

  const bandChart2025 = BANDS.map(b => ({
    band: b,
    'Rate %': +(allNih.bandRates2025[b].rate * 100).toFixed(1),
    'Applications': allNih.bandRates2025[b].total,
  }));

  const comparison = [
    { band: '1–5', fy2019: 90.3, fy2024: 89.9, fy2025: 91.5 },
    { band: '6–10', fy2019: 82.0, fy2024: 72.9, fy2025: 71.9 },
    { band: '11–15', fy2019: 74.9, fy2024: 55.6, fy2025: 30.5 },
    { band: '16–20', fy2019: 53.5, fy2024: 31.3, fy2025: 12.8 },
    { band: '21–25', fy2019: 32.1, fy2024: 14.1, fy2025: 7.1 },
    { band: '26+', fy2019: 5.6, fy2024: 2.0, fy2025: 0.7 },
  ];

  return (
    <SectionShell
      title="Funding Landscape by Percentile Band"
      description="Funding rates by the six standard NIH percentile bands for ALL NIH, with comparison across FY2019, FY2024, and FY2025."
    >
      {/* Band rates 2025 */}
      <h3 className="text-lg font-semibold text-gray-800 mb-3">ALL NIH Band Funding Rates — FY2025</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={bandChart2025} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="band" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} unit="%" domain={[0, 100]} />
            <Tooltip formatter={(val: number) => `${val.toFixed(1)}%`} />
            <Bar dataKey="Rate %" fill="#2563eb" radius={[4, 4, 0, 0]} name="Funding Rate (FY2025)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Cross-year comparison */}
      <h3 className="text-lg font-semibold text-gray-800 mb-3 mt-8">Band Funding Rates: FY2019 vs FY2024 vs FY2025</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={comparison} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="band" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} unit="%" domain={[0, 100]} />
            <Tooltip formatter={(val: number) => `${val.toFixed(1)}%`} />
            <Legend />
            <Bar dataKey="fy2019" fill="#16a34a" radius={[3, 3, 0, 0]} name="FY2019" />
            <Bar dataKey="fy2024" fill="#d97706" radius={[3, 3, 0, 0]} name="FY2024" />
            <Bar dataKey="fy2025" fill="#dc2626" radius={[3, 3, 0, 0]} name="FY2025" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Applications by band */}
      <h3 className="text-lg font-semibold text-gray-800 mb-3 mt-8">Application Volume by Band — FY2025</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead>
            <tr className="bg-gray-50">
              {['Percentile Band', 'Applications', 'Funded', 'Rate (FY2025)', 'Rate (FY2019 est.)', 'Change'].map(h => (
                <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {BANDS.map((b, i) => {
              const row = allNih.bandRates2025[b];
              const comp = comparison[i];
              const change = comp ? +(comp.fy2025 - comp.fy2019).toFixed(1) : null;
              return (
                <tr key={b} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-2 font-semibold text-gray-900">{b}</td>
                  <td className="px-4 py-2 text-gray-700">{row.total.toLocaleString()}</td>
                  <td className="px-4 py-2 text-gray-700">{Math.round(row.rate * row.total)}</td>
                  <td className="px-4 py-2 font-semibold text-blue-700">{(row.rate * 100).toFixed(1)}%</td>
                  <td className="px-4 py-2 text-gray-500">{comp ? `${comp.fy2019.toFixed(1)}%` : '—'}</td>
                  <td className={`px-4 py-2 font-medium ${change !== null && change < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {change !== null ? `${change > 0 ? '+' : ''}${change} pp` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <InsightPanel
        insight="In FY2025, the ALL NIH funding rate by band shows a sharply bifurcated story. The 1–5 band retains a 91.5% rate. But the 11–15 band, which funded 74.9% of applications in 2019, now funds only 30.5%. The 16–20 band declined from 53.5% to 12.8%. The 21–25 band fell from 32.1% to 7.1%. The '26+' band rate dropped to 0.7% — effectively zero."
        interpretation="The 'gray zone' of probabilistic funding has contracted from the 11–25 percentile range to approximately the 8–16 range. Applications scoring in the 17–25 zone, which historically represented a productive resubmission investment, now face single-digit funding probabilities."
        leadershipImplication="Institutional resubmission policy should be revised. The prior guidance of 'resubmit anything within 5 percentile points of the payline' is no longer appropriate when the effective payline is near percentile 10–11. Scores in the 12–15 range remain viable resubmission candidates; scores above 20 should be evaluated for alternative strategies."
        caution="Band-level rates for individual institutes with fewer than 30 applications per band carry substantial statistical uncertainty. The ALL NIH figures here are highly reliable (hundreds to thousands of applications per band)."
      />
    </SectionShell>
  );
}
