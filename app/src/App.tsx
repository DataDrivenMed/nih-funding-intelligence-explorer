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
  { id: 'overview',             label: 'Overview',           component: Overview },
  { id: 'institute-comparison', label: 'IC Comparison',      component: InstituteComparison },
  { id: 'funding-landscape',    label: 'Funding Landscape',  component: FundingLandscape },
  { id: 'payline-explorer',     label: 'Payline Explorer',   component: PaylineExplorer },
  { id: 'cross-year-trends',    label: 'Cross-Year Trends',  component: CrossYearTrends },
  { id: 'resubmission-map',     label: 'Resubmission Map',   component: ResubmissionMap },
  { id: 'typology',             label: 'IC Typology',        component: InstituteTypology },
  { id: 'methods',              label: 'Methods',            component: Methods },
];

export default function App() {
  const [active, setActive] = useState('overview');
  const ActiveSection = SECTIONS.find(s => s.id === active)?.component ?? Overview;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)' }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        backgroundColor: 'rgba(11,15,24,0.92)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>

            {/* Logo / wordmark */}
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                <span style={{
                  fontFamily: '"DM Serif Display", Georgia, serif',
                  fontSize: '1.25rem',
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.01em',
                }}>NIH Funding Intelligence</span>
                <span style={{
                  fontFamily: '"DM Mono", monospace',
                  fontSize: '10px',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--accent)',
                  opacity: 0.85,
                }}>Explorer</span>
              </div>
              <div style={{
                fontFamily: '"DM Mono", monospace',
                fontSize: '10px',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                marginTop: '1px',
              }}>
                FY2014–2025 · Modeled Effective Expected Paylines · Research Leadership Edition
              </div>
            </div>

            {/* Status badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontFamily: '"DM Mono", monospace',
                fontSize: '10px',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                padding: '3px 10px',
                borderRadius: '4px',
                background: 'rgba(239,68,68,0.12)',
                color: '#fca5a5',
                border: '1px solid rgba(239,68,68,0.25)',
              }}>FY2025 Preliminary</span>
            </div>
          </div>
        </div>

        {/* ── Navigation ─────────────────────────────────────────────── */}
        <nav style={{
          backgroundColor: 'rgba(17,24,39,0.6)',
          borderTop: '1px solid var(--border)',
          overflowX: 'auto',
        }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1.5rem' }}>
            <div style={{ display: 'flex', gap: '2px', padding: '6px 0' }}>
              {SECTIONS.map(s => (
                <button
                  key={s.id}
                  onClick={() => setActive(s.id)}
                  style={{
                    padding: '7px 14px',
                    fontSize: '11px',
                    fontFamily: '"DM Mono", monospace',
                    letterSpacing: '0.04em',
                    fontWeight: 500,
                    borderRadius: '6px',
                    whiteSpace: 'nowrap',
                    border: active === s.id ? '1px solid rgba(14,165,233,0.3)' : '1px solid transparent',
                    background: active === s.id ? 'rgba(14,165,233,0.1)' : 'transparent',
                    color: active === s.id ? '#7dd3fc' : 'var(--text-muted)',
                    cursor: 'pointer',
                    transition: 'all 0.18s',
                  }}
                  onMouseEnter={e => {
                    if (active !== s.id) {
                      (e.target as HTMLButtonElement).style.color = 'var(--text-secondary)';
                      (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (active !== s.id) {
                      (e.target as HTMLButtonElement).style.color = 'var(--text-muted)';
                      (e.target as HTMLButtonElement).style.background = 'transparent';
                    }
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </nav>
      </header>

      {/* ── FY2025 caution banner ───────────────────────────────────────── */}
      <div style={{
        backgroundColor: 'rgba(245,158,11,0.06)',
        borderBottom: '1px solid rgba(245,158,11,0.15)',
        padding: '7px 1.5rem',
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <span style={{
            fontFamily: '"DM Mono", monospace',
            fontSize: '11px',
            color: '#fbbf24',
            letterSpacing: '0.02em',
          }}>
            <span style={{ fontWeight: 600 }}>FY2025 Caution:</span>{' '}
            Values are preliminary (extracted March 2026). All institutes showed EEP50 compression. Confirm final figures with NIH Data Book before official reporting.
          </span>
        </div>
      </div>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem 1.5rem 3rem' }}>
        <ActiveSection />
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer style={{
        backgroundColor: 'rgba(17,24,39,0.5)',
        borderTop: '1px solid var(--border)',
        padding: '1rem 1.5rem',
        marginTop: '1rem',
      }}>
        <div style={{
          maxWidth: '1280px', margin: '0 auto',
          display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '8px',
          fontFamily: '"DM Mono", monospace', fontSize: '10px', letterSpacing: '0.04em',
          color: 'var(--text-muted)',
        }}>
          <span>NIH Funding Intelligence Explorer · Data vintage: FY2014–FY2025 · Source: NIH Data Book Report ID 302 (March 2026)</span>
          <span>QC: 68 passed · 0 failed · 11 warnings — cleared for production</span>
        </div>
      </footer>
    </div>
  );
}
