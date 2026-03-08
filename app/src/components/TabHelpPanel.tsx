interface Props {
  what: string;
  why: string;
  how: string;
  controls?: string;
  tip: string;
}

export default function TabHelpPanel({ what, why, how, controls, tip }: Props) {
  return (
    <div className="tab-help-panel" style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <span style={{
          flexShrink: 0,
          width: '20px', height: '20px',
          borderRadius: '50%',
          background: 'rgba(14,165,233,0.2)',
          border: '1px solid rgba(14,165,233,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '11px', color: 'var(--accent)',
          fontFamily: '"DM Mono", monospace',
          marginTop: '1px',
        }}>i</span>

        <div style={{ flex: 1 }}>
          <p style={{
            fontFamily: '"DM Mono", monospace',
            fontSize: '10px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--accent)',
            fontWeight: 500,
            marginBottom: '10px',
          }}>How to Read This Tab</p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '8px 2rem',
          }}>
            {[
              { label: 'What this shows', text: what },
              { label: 'Why it matters', text: why },
              { label: 'How to read it', text: how },
              ...(controls ? [{ label: 'Using controls', text: controls }] : []),
            ].map(item => (
              <div key={item.label}>
                <span style={{
                  fontFamily: '"DM Mono", monospace',
                  fontSize: '10px',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  marginRight: '6px',
                }}>{item.label}:</span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{item.text}</span>
              </div>
            ))}
          </div>

          {tip && (
            <div style={{
              marginTop: '10px',
              paddingTop: '10px',
              borderTop: '1px solid rgba(14,165,233,0.15)',
            }}>
              <span style={{
                fontFamily: '"DM Mono", monospace',
                fontSize: '10px',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--accent)',
                marginRight: '8px',
              }}>Key Takeaway:</span>
              <span style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 500 }}>{tip}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
