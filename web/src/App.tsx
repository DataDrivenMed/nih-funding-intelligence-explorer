import { useState, useMemo } from 'react'
import type { Payline, BandSummary, ResubmissionOpp, InsightCards } from './types'

import paylinesRaw      from './data/paylines.json'
import bandSummaryRaw   from './data/band_summary.json'
import resubmissionRaw  from './data/resubmission.json'
import insightCardsRaw  from './data/insight_cards.json'

import Overview            from './sections/Overview'
import InstituteComparison from './sections/InstituteComparison'
import BandLandscape       from './sections/BandLandscape'
import PaylineExplorer     from './sections/PaylineExplorer'
import CrossYearTrends     from './sections/CrossYearTrends'
import ResubmissionMap     from './sections/ResubmissionMap'
import InstituteTypology   from './sections/InstituteTypology'
import MethodsCaveats      from './sections/MethodsCaveats'

const paylines     = paylinesRaw     as Payline[]
const bandSummary  = bandSummaryRaw  as BandSummary[]
const resubmission = resubmissionRaw as ResubmissionOpp[]
const insightCards = insightCardsRaw as InsightCards

const NAV = [
  { id: 'overview',            label: 'Overview',          icon: '○' },
  { id: 'institute_comparison',label: 'IC Comparison',     icon: '○' },
  { id: 'band_landscape',      label: 'Band Landscape',    icon: '○' },
  { id: 'payline_explorer',    label: 'Payline Explorer',  icon: '○' },
  { id: 'cross_year_trends',   label: 'Cross-Year Trends', icon: '○' },
  { id: 'resubmission_map',    label: 'Resubmission Map',  icon: '○' },
  { id: 'institute_typology',  label: 'IC Typology',       icon: '○' },
  { id: 'methods_caveats',     label: 'Methods & Caveats', icon: '○' },
]


export default function App() {
  const [activeTab, setActiveTab] = useState('overview')

  const sectionMap = useMemo(
    () => Object.fromEntries(insightCards.sections.map((s) => [s.id, s])),
    [],
  )

  const section = sectionMap[activeTab]

  const renderSection = () => {
    switch (activeTab) {
      case 'overview':
        return <Overview paylines={paylines} section={sectionMap['overview']} />
      case 'institute_comparison':
        return <InstituteComparison paylines={paylines} section={sectionMap['institute_comparison']} />
      case 'band_landscape':
        return <BandLandscape bandSummary={bandSummary} section={sectionMap['band_landscape']} />
      case 'payline_explorer':
        return <PaylineExplorer paylines={paylines} bandSummary={bandSummary} section={sectionMap['payline_explorer']} />
      case 'cross_year_trends':
        return <CrossYearTrends paylines={paylines} section={sectionMap['cross_year_trends']} />
      case 'resubmission_map':
        return <ResubmissionMap resubmission={resubmission} section={sectionMap['resubmission_map']} />
      case 'institute_typology':
        return <InstituteTypology paylines={paylines} section={sectionMap['institute_typology']} />
      case 'methods_caveats':
        return <MethodsCaveats section={sectionMap['methods_caveats']} />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>

      {/* ── Fixed header ─────────────────────────────────────────────────── */}
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6"
        style={{ background: 'var(--navy)', height: 56 }}
      >
        <div className="flex items-baseline gap-3">
          <div>
            <div className="text-white font-semibold text-base tracking-tight leading-tight">
              NIH Funding Intelligence Explorer
            </div>
            <div className="text-xs hidden sm:block" style={{ color: '#93AACF' }}>
              Effective Expected Payline Analysis · 20 Institutes · {insightCards.meta.data_vintage}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6 text-xs hidden sm:flex" style={{ color: '#93AACF' }}>
          <span>{insightCards.meta.source.split('(')[0].trim()}</span>
          <span
            className="px-2 py-1 rounded-md text-xs font-medium"
            style={{ background: 'rgba(37,99,235,0.25)', color: '#93C5FD' }}
          >
            {insightCards.meta.qc_status.split('—')[0].trim()}
          </span>
        </div>
      </header>

      {/* ── Body (below header) ──────────────────────────────────────────── */}
      <div className="flex" style={{ paddingTop: 56, minHeight: '100vh' }}>

        {/* ── Sidebar ────────────────────────────────────────────────────── */}
        <aside
          className="fixed z-40 overflow-y-auto border-r"
          style={{
            top: 56,
            left: 0,
            bottom: 0,
            width: 224,
            background: 'var(--surface)',
            borderColor: 'var(--border)',
          }}
        >
          {/* FY2025 caution strip */}
          <div
            className="px-4 py-3 border-b text-xs leading-relaxed"
            style={{ borderColor: 'var(--border)', background: '#FFFBEB', color: '#92400E' }}
          >
            <span className="font-semibold block mb-0.5">FY2025 Preliminary</span>
            Extracted March 2026. Confirm before official reporting.
          </div>

          {/* Nav links */}
          <nav className="p-3">
            <div className="text-label px-2 mb-2 mt-1">Analysis Sections</div>
            {NAV.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{
                    background: activeTab === item.id ? 'var(--accent)' : 'var(--border)',
                  }}
                />
                {item.label}
              </button>
            ))}
          </nav>

          {/* Bottom meta */}
          <div
            className="absolute bottom-0 left-0 right-0 px-4 py-3 border-t text-xs"
            style={{ borderColor: 'var(--border)', color: 'var(--text-faint)' }}
          >
            <div>NIH Data Book Report 302</div>
            <div className="mt-0.5">Generated {insightCards.meta.generated}</div>
          </div>
        </aside>

        {/* ── Main content ────────────────────────────────────────────────── */}
        <main className="flex-1" style={{ marginLeft: 224 }}>
          <div className="mx-auto px-8 py-8" style={{ maxWidth: 1280 }}>

            {/* Section title */}
            {section && (
              <div className="mb-7">
                <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {section.title}
                </h1>
                <p
                  className="mt-2 text-sm leading-relaxed max-w-3xl"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {section.description}
                </p>
              </div>
            )}

            {/* Section content */}
            <div className="section-enter" key={activeTab}>
              {renderSection()}
            </div>
          </div>

          {/* Footer */}
          <footer
            className="border-t text-xs px-8 py-5"
            style={{
              borderColor: 'var(--border)',
              background: 'var(--surface)',
              color: 'var(--text-faint)',
            }}
          >
            <div>
              {insightCards.meta.source} · For research leadership use only
            </div>
            <div className="mt-1">
              Audience: {insightCards.meta.audience.join(' · ')}
            </div>
          </footer>
        </main>
      </div>
    </div>
  )
}

