interface Props {
  insight: string;
  interpretation: string;
  caution?: string;
  leadershipImplication?: string;
  contextLabel?: string;
}

const LABEL_STYLE: React.CSSProperties = {
  fontFamily: '"DM Mono", monospace',
  fontSize: '10px',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  fontWeight: 500,
  marginBottom: '6px',
  display: 'block',
};

import React from 'react';

export default function InsightPanel({ insight, interpretation, caution, leadershipImplication, contextLabel }: Props) {
  return (
    <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {contextLabel && (
        <p style={{
          fontFamily: '"DM Mono", monospace',
          fontSize: '10px',
          letterSpacing: '0.06em',
          color: 'var(--text-muted)',
          marginBottom: '2px',
          fontStyle: 'italic',
        }}>
          {contextLabel}
        </p>
      )}

      {/* Data Insight */}
      <div className="insight-box">
        <span style={{ ...LABEL_STYLE, color: '#7dd3fc' }}>Data Insight</span>
        <p style={{ color: 'var(--text-primary)', lineHeight: 1.65, fontSize: '13px' }}>{insight}</p>
      </div>

      {/* Plain Language Interpretation */}
      <div className="interpretation-box">
        <span style={{ ...LABEL_STYLE, color: '#fcd34d' }}>Plain Language Interpretation</span>
        <p style={{ color: 'var(--text-primary)', lineHeight: 1.65, fontSize: '13px' }}>{interpretation}</p>
      </div>

      {/* Leadership Implication */}
      {leadershipImplication && (
        <div className="leadership-box">
          <span style={{ ...LABEL_STYLE, color: '#5eead4' }}>Leadership Implication</span>
          <p style={{ color: 'var(--text-primary)', lineHeight: 1.65, fontSize: '13px' }}>{leadershipImplication}</p>
        </div>
      )}

      {/* Caution */}
      {caution && (
        <div className="caution-box">
          <span style={{ ...LABEL_STYLE, color: '#fbbf24' }}>Caution</span>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.65, fontSize: '13px' }}>{caution}</p>
        </div>
      )}
    </div>
  );
}
