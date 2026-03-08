import { useState } from 'react'

export interface TermDef {
  term: string
  meaning: string
  whyItMatters: string
}

interface MetricDefinitionsCardProps {
  terms: TermDef[]
  title?: string
}

export default function MetricDefinitionsCard({
  terms,
  title = 'Key Term Definitions',
}: MetricDefinitionsCardProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-3.5 text-left hover:bg-gray-50 transition-colors"
        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        aria-expanded={open}
      >
        <span className="text-label">{title}</span>
        <span className="text-xs font-semibold text-gray-600 flex items-center gap-1">
          {open ? (
            <>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 7L5 4l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Hide
            </>
          ) : (
            <>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Show definitions
            </>
          )}
        </span>
      </button>

      {open && (
        <div className="border-t border-gray-200 px-6 py-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {terms.map((def) => (
              <div
                key={def.term}
                className="rounded-lg p-3.5"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
              >
                <div className="font-bold text-gray-900 text-sm">{def.term}</div>
                <div className="text-sm text-gray-700 mt-1 leading-relaxed">{def.meaning}</div>
                <div
                  className="text-xs mt-2 leading-relaxed pt-2"
                  style={{ borderTop: '1px solid var(--border)', color: '#4B5563' }}
                >
                  <span className="font-semibold">Why it matters: </span>
                  {def.whyItMatters}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
