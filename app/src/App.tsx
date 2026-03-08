import { useState } from 'react';
import Overview from './sections/Overview';
import InstituteComparison from './sections/InstituteComparison';
import FundingLandscape from './sections/FundingLandscape';
import PaylineExplorer from './sections/PaylineExplorer';
import CrossYearTrends from './sections/CrossYearTrends';
import ResubmissionMap from './sections/ResubmissionMap';
import InstituteTypology from './sections/InstituteTypology';
import Methods from './sections/Methods';

const SECTIONS = [
  { id: 'overview', label: 'Overview', component: Overview },
  { id: 'institute-comparison', label: 'Institute Comparison', component: InstituteComparison },
  { id: 'funding-landscape', label: 'Funding Landscape', component: FundingLandscape },
  { id: 'payline-explorer', label: 'Payline Explorer', component: PaylineExplorer },
  { id: 'cross-year-trends', label: 'Cross-Year Trends', component: CrossYearTrends },
  { id: 'resubmission-map', label: 'Resubmission Map', component: ResubmissionMap },
  { id: 'typology', label: 'Institute Typology', component: InstituteTypology },
  { id: 'methods', label: 'Methods', component: Methods },
];

export default function App() {
  const [active, setActive] = useState('overview');

  const ActiveSection = SECTIONS.find(s => s.id === active)?.component ?? Overview;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#003087] text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold leading-tight">NIH Funding Intelligence Explorer</h1>
              <p className="text-blue-200 text-xs">FY2014–FY2025 · Modeled Effective Expected Paylines · Research Leadership Edition</p>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full font-semibold">FY2025 PRELIMINARY</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="bg-[#002070] overflow-x-auto">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex gap-0.5 py-1">
              {SECTIONS.map(s => (
                <button
                  key={s.id}
                  onClick={() => setActive(s.id)}
                  className={`px-3 py-2 text-xs font-medium whitespace-nowrap rounded-md transition-colors ${
                    active === s.id
                      ? 'bg-white text-[#003087]'
                      : 'text-blue-100 hover:text-white hover:bg-[#003087]'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </nav>
      </header>

      {/* Data caution banner */}
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
        <div className="max-w-7xl mx-auto text-xs text-amber-800">
          <span className="font-semibold">FY2025 Caution:</span> Values are preliminary (extracted March 2026). All institutes showed EEP50 compression. Confirm final figures with NIH Data Book before official reporting.
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <ActiveSection />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-8">
        <div className="max-w-7xl mx-auto px-4 py-4 text-xs text-gray-500 flex flex-col md:flex-row justify-between gap-2">
          <span>NIH Funding Intelligence Explorer · Data vintage: FY2014–FY2025 · Source: NIH Data Book Report ID 302 (March 2026)</span>
          <span>QC: 68 passed | 0 failed | 11 warnings — cleared for production</span>
        </div>
      </footer>
    </div>
  );
}
