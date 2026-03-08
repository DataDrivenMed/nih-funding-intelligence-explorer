import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import SectionShell from '../components/SectionShell';
import InsightPanel from '../components/InsightPanel';
import LoadingSpinner from '../components/LoadingSpinner';
import { useData } from '../hooks/useData';
import type { InstituteProfile } from '../types';

const TRANSITIONS = [
  { key: '20to15' as const, label: '20→15', color: '#6b7280' },
  { key: '18to12' as const, label: '18→12', color: '#d97706' },
  { key: '15to10' as const, label: '15→10', color: '#2563eb' },
  { key: '12to8' as const, label: '12→8', color: '#16a34a' },
];

export default function ResubmissionMap() {
  const { data, loading } = useData<InstituteProfile[]>('institute_profiles.json');

  if (loading || !data) return <LoadingSpinner />;

  const ics = data.filter(d => !d.isAggregate).sort((a, b) => a.institute.localeCompare(b.institute));

  const transitionCharts = TRANSITIONS.map(t => ({
    ...t,
    data: ics.map(ic => ({
      institute: ic.institute,
      absGain: +(ic.resubmission2025[t.key].absGain * 100).toFixed(1),
      relGain: +ic.resubmission2025[t.key].relGainPct.toFixed(0),
      probFrom: +(ic.resubmission2025[t.key].probFrom * 100).toFixed(1),
      probTo: +(ic.resubmission2025[t.key].probTo * 100).toFixed(1),
    })).sort((a, b) => b.absGain - a.absGain),
  }));

  const allNih = data.find(d => d.isAggregate)!;
  const summaryRows = TRANSITIONS.map(t => {
    const g = allNih.resubmission2025[t.key];
    return {
      transition: t.label,
      from: `${(g.probFrom * 100).toFixed(1)}%`,
      to: `${(g.probTo * 100).toFixed(1)}%`,
      absGain: `+${(g.absGain * 100).toFixed(1)} pp`,
      relGain: `+${g.relGainPct.toFixed(0)}%`,
      color: t.color,
    };
  });

  return (
    <SectionShell
      title="Resubmission Opportunity Map"
      description="Modeled funding probability gains from score improvement at four clinically meaningful score transitions for every institute — FY2025."
    >
      {/* ALL NIH summary */}
      <h3 className="text-lg font-semibold text-gray-800 mb-3">ALL NIH: Probability Gain by Score Transition — FY2025</h3>
      <div className="overflow-x-auto mb-6">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead>
            <tr className="bg-gray-50">
              {['Score Transition', 'Prob. From', 'Prob. To', 'Absolute Gain', 'Relative Gain'].map(h => (
                <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {summaryRows.map((r, i) => (
              <tr key={r.transition} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-4 py-2 font-bold" style={{ color: r.color }}>{r.transition}</td>
                <td className="px-4 py-2 text-gray-700">{r.from}</td>
                <td className="px-4 py-2 text-gray-700">{r.to}</td>
                <td className="px-4 py-2 font-semibold text-blue-700">{r.absGain}</td>
                <td className="px-4 py-2 font-semibold text-green-700">{r.relGain}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Per-transition charts */}
      {transitionCharts.slice(0, 2).map(tc => (
        <div key={tc.key} className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            Score Transition {tc.label}: Absolute Probability Gain by Institute (FY2025)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tc.data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="institute" tick={{ fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 12 }} unit=" pp" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-white border border-gray-200 rounded-lg p-3 shadow text-xs">
                        <p className="font-bold">{d.institute}</p>
                        <p>From: {d.probFrom}% → To: {d.probTo}%</p>
                        <p>Gain: +{d.absGain} pp ({d.relGain}%)</p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="absGain" radius={[3,3,0,0]} name="Abs. Gain (pp)">
                  {tc.data.map((_entry, i) => (
                    <Cell key={i} fill={tc.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ))}

      <InsightPanel
        insight="In FY2025, the ALL NIH funding probability at a score of 20 is 9.3%. Improving to a score of 15 raises that to 27.0% — an absolute gain of +17.7 pp (191% relative). The steepest part of the curve is the 15→10 transition: probability jumps from 27.0% to 57.3%, a +30.2 pp gain. The 18→12 transition yields +29.9 pp (204% relative)."
        interpretation="The resubmission landscape under FY2025 conditions rewards score improvements in the 12–20 range more than at any point in the prior decade. An investigator moving from 18 to 12 triples their modeled funding probability. This creates a clear triage logic: resubmissions are most valuable when the investigator can credibly reach a score below 12."
        leadershipImplication="Grant development resources should be allocated proportionally to expected gain per resubmission dollar. Research offices should triage: full investment for applications with a realistic pathway to sub-12 score; selective investment for 12–15 range; strategic consultation for 16–20 range on whether mechanism, IC, or research strategy should be reconsidered."
        caution="Resubmission gains are modeled estimates from logistic curves fit to population-level data. Individual applications may have higher or lower probabilities based on scientific content and program officer interest not captured in percentile data."
      />
    </SectionShell>
  );
}
