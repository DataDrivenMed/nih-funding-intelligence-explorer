interface TabHelpPanelProps {
  what: string
  howTo: string
  takeaway: string
}

export default function TabHelpPanel({ what, howTo, takeaway }: TabHelpPanelProps) {
  return (
    <div
      className="card overflow-hidden"
      style={{ borderLeft: '4px solid var(--accent)' }}
    >
      <div className="px-6 py-4">
        <div className="text-label mb-3" style={{ color: 'var(--accent)' }}>
          How to Read This Tab
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-3">
          <div>
            <div className="text-xs font-bold text-gray-800 mb-1 uppercase tracking-wide">
              What This Shows
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">{what}</p>
          </div>
          <div>
            <div className="text-xs font-bold text-gray-800 mb-1 uppercase tracking-wide">
              How to Interact
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">{howTo}</p>
          </div>
          <div>
            <div className="text-xs font-bold text-gray-800 mb-1 uppercase tracking-wide">
              Main Takeaway
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">{takeaway}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
