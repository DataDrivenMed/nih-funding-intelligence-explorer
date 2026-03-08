import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import SectionShell from '../components/SectionShell';
import InsightPanel from '../components/InsightPanel';
import LoadingSpinner from '../components/LoadingSpinner';
import { useData } from '../hooks/useData';

interface KpiSummary {
  allNihByYear: Array<{
    year: number;
    eep80: number;
    eep50: number;
    eep20: number;
    opportunityWidth: number;
    overallFundingRate: number;
    eep50YoYChange: number | null;
  }>;
  fy2025Headlines: Array<{
    id: string;
    label: string;
    displayValue: string;
    deltaLabel: string | null;
    trend: string;
    alert: boolean;
    context: string;
  }>;
}

export default function Overview() {
  const { data, loading } = useData<KpiSummary>('kpi_summary.json');

  if (loading || !data) return <LoadingSpinner />;

  const chartData = data.allNihByYear.map(d => ({
    year: d.year,
    'EEP80 (80% prob)': d.eep80,
    'EEP50 (Payline)': d.eep50,
    'EEP20 (20% prob)': d.eep20,
    'Funding Rate %': +(d.overallFundingRate * 100).toFixed(1),
  }));

  return (
    <SectionShell
      title="NIH Funding Landscape: 2014–2025 Overview"
      description="Twelve-year view of NIH funding competitiveness anchored by modeled Effective Expected Paylines (EEP) from weighted binomial regression."
    >
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
        {data.fy2025Headlines.map(h => (
          <div key={h.id} className={`kpi-card ${h.alert ? 'border-red-300 bg-red-50' : ''}`}>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">{h.label}</p>
            <p className={`text-2xl font-bold ${h.alert ? 'text-red-700' : 'text-gray-900'}`}>{h.displayValue}</p>
            {h.deltaLabel && (
              <p className={`text-xs mt-1 font-medium ${h.trend === 'down' ? 'text-red-600' : 'text-green-600'}`}>
                {h.deltaLabel}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-1 leading-tight">{h.context}</p>
          </div>
        ))}
      </div>

      {/* EEP Trend Chart */}
      <h3 className="text-lg font-semibold text-gray-800 mb-3">ALL NIH Effective Expected Paylines, FY2014–FY2025</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="year" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} label={{ value: 'Percentile', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }} />
            <Tooltip formatter={(val: number) => val.toFixed(1)} />
            <Legend />
            <ReferenceLine x={2025} stroke="#dc2626" strokeDasharray="4 4" label={{ value: 'FY2025', position: 'top', fontSize: 11, fill: '#dc2626' }} />
            <Line type="monotone" dataKey="EEP80 (80% prob)" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="EEP50 (Payline)" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="EEP20 (20% prob)" stroke="#9333ea" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Funding Rate Chart */}
      <h3 className="text-lg font-semibold text-gray-800 mb-3 mt-8">ALL NIH Overall Funding Rate (%)</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="year" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} unit="%" domain={[0, 50]} />
            <Tooltip formatter={(val: number) => `${val.toFixed(1)}%`} />
            <Line type="monotone" dataKey="Funding Rate %" stroke="#dc2626" strokeWidth={2.5} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <InsightPanel
        insight="From 2014 through 2023, the ALL NIH EEP50 held remarkably stable (18.4–20.1). FY2024 showed the first meaningful shift (16.8). FY2025 broke decisively: EEP50 fell to 11.1, a drop of 5.6 percentile points from 2024 — 5.8 standard deviations below the historical mean. The overall NIH funding rate fell from 38.4% (2019) to 22.0% (2025). All 20 institutes showed tighter paylines in 2025 — the first universal compression event in this dataset."
        interpretation="The NIH funding environment underwent two distinct shifts. The 2024 tightening (EEP50: 16.8) represents normal budget cycle variation. The 2025 compression is qualitatively different: an EEP50 of 11.1 means the statistical 50/50 funding threshold moved from the mid-teens to the low double digits. Applications historically considered 'near payline' at percentile 15–20 are now operating well outside the probabilistic funding zone."
        leadershipImplication="Research offices should recalibrate internal funding probability guidance. A score at percentile 15, which carried ~75% funding probability in 2019, now corresponds to ~30.5%. Portfolio planning models that treat a 15th-percentile score as a 'strong near-miss' require immediate revision."
        caution="FY2025 data was extracted from the NIH Data Book in March 2026 and should be treated as preliminary. Late-cycle pickup awards may improve rates in the 12–25 range when FY2025 is fully closed."
      />
    </SectionShell>
  );
}
