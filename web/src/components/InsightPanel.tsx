/**
 * Dynamic insight panel — accepts pre-computed strings so content updates
 * when dropdowns or filters change (unlike the static InsightCard).
 */
import type { ReactNode } from 'react'

interface InsightPanelProps {
  dataInsight: string
  interpretation: string
  leadershipImplication: string
  caution?: string
  title?: string
  contextLabel?: string
  children?: ReactNode
}

export default function InsightPanel({
  dataInsight,
  interpretation,
  leadershipImplication,
  caution,
  title = 'Analysis Notes',
  contextLabel,
  children,
}: InsightPanelProps) {
  return (
    <div className="space-y-4">
      {children}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-baseline justify-between gap-4">
          <span className="text-label">{title}</span>
          {contextLabel && (
            <span className="text-xs text-gray-400 italic">{contextLabel}</span>
          )}
        </div>
        <div className="flex divide-x divide-gray-200" style={{ flexWrap: 'wrap' }}>
          <div className="insight-col">
            <div className="text-label mb-2">Data Insight</div>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {dataInsight}
            </p>
          </div>
          <div className="insight-col">
            <div className="text-label mb-2" style={{ color: '#1E3A8A' }}>
              Interpretation
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">{interpretation}</p>
          </div>
          <div className="insight-col">
            <div className="text-label mb-2" style={{ color: '#065F46' }}>
              Leadership Implication
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">{leadershipImplication}</p>
          </div>
        </div>
        {caution && (
          <div
            className="border-t px-6 py-3 text-xs leading-relaxed"
            style={{ borderColor: '#FDE68A', background: '#FFFBEB', color: '#92400E' }}
          >
            <span className="font-semibold">Caution: </span>
            {caution}
          </div>
        )}
      </div>
    </div>
  )
}
