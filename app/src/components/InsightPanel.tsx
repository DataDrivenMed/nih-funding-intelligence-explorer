interface Props {
  insight: string;
  interpretation: string;
  caution?: string;
  leadershipImplication?: string;
}

export default function InsightPanel({ insight, interpretation, caution, leadershipImplication }: Props) {
  return (
    <div className="space-y-3 mt-6">
      <div className="insight-box">
        <p className="font-semibold text-blue-800 mb-1 text-xs uppercase tracking-wide">Data Insight</p>
        <p>{insight}</p>
      </div>
      <div className="interpretation-box">
        <p className="font-semibold text-amber-800 mb-1 text-xs uppercase tracking-wide">Plain Language Interpretation</p>
        <p>{interpretation}</p>
      </div>
      {leadershipImplication && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-lg text-sm text-emerald-900">
          <p className="font-semibold text-emerald-800 mb-1 text-xs uppercase tracking-wide">Leadership Implication</p>
          <p>{leadershipImplication}</p>
        </div>
      )}
      {caution && (
        <div className="caution-box">
          <p className="font-semibold text-orange-800 mb-1 text-xs uppercase tracking-wide">Caution</p>
          <p>{caution}</p>
        </div>
      )}
    </div>
  );
}
