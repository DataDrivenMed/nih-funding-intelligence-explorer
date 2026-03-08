import type { Section } from '../types'
import KeyStatGrid from './KeyStatGrid'
import CautionBanner from './CautionBanner'

interface InsightCardProps {
  section: Section
  hideStats?: boolean
}

export default function InsightCard({ section, hideStats }: InsightCardProps) {
  return (
    <div className="space-y-4">
      {!hideStats && section.key_stats.length > 0 && (
        <KeyStatGrid stats={section.key_stats} />
      )}

      {/* Three-column insight panel */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <span className="text-label">Analysis Notes</span>
        </div>
        <div className="flex divide-x divide-gray-100">
          {/* Data Insight */}
          <div className="insight-col">
            <div className="text-label mb-2">Data Insight</div>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
              {section.data_insight}
            </p>
          </div>

          {/* Interpretation */}
          <div className="insight-col">
            <div className="text-label mb-2" style={{ color: '#1E3A8A' }}>Interpretation</div>
            <p className="text-sm text-gray-600 leading-relaxed">
              {section.interpretation}
            </p>
          </div>

          {/* Leadership Implication */}
          <div className="insight-col">
            <div className="text-label mb-2" style={{ color: '#065F46' }}>Leadership Implication</div>
            <p className="text-sm text-gray-600 leading-relaxed">
              {section.leadership_implication}
            </p>
          </div>
        </div>

        {section.caution && (
          <div className="border-t border-gray-100 px-6 py-3">
            <CautionBanner text={section.caution} />
          </div>
        )}
      </div>
    </div>
  )
}
