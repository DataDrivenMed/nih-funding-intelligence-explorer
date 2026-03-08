import type { KeyStat } from '../types'

interface KeyStatGridProps {
  stats: KeyStat[]
}

export default function KeyStatGrid({ stats }: KeyStatGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {stats.map((s) => (
        <div key={s.label} className="card p-4">
          <div className="text-label mb-2" style={{ fontSize: 10 }}>{s.label}</div>
          <div className="text-lg font-bold text-gray-900 leading-snug">{s.value}</div>
          {s.note && (
            <div className="mt-1 text-xs text-gray-400 leading-tight">{s.note}</div>
          )}
        </div>
      ))}
    </div>
  )
}
