interface CautionBannerProps {
  text: string
  level?: 'warning' | 'info'
}

export default function CautionBanner({ text, level = 'warning' }: CautionBannerProps) {
  if (!text) return null

  const isWarning = level === 'warning'
  const wrapperClass = isWarning
    ? 'bg-amber-50 border-l-2 border-amber-400'
    : 'bg-blue-50 border-l-2 border-blue-400'
  const labelClass  = isWarning ? 'text-amber-700' : 'text-blue-700'
  const textClass   = isWarning ? 'text-amber-900' : 'text-blue-900'
  const labelText   = isWarning ? 'Preliminary data note' : 'Note'

  return (
    <div className={`rounded-lg px-4 py-3 ${wrapperClass}`}>
      <span className={`text-xs font-semibold uppercase tracking-wide ${labelClass}`}>
        {labelText}
      </span>
      <p className={`mt-0.5 text-xs leading-relaxed ${textClass}`}>{text}</p>
    </div>
  )
}
