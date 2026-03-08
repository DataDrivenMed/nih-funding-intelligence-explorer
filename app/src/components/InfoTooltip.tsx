import { useState } from 'react';

interface Props {
  term: string;
  definition: string;
  why?: string;
}

export default function InfoTooltip({ term, definition, why }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <span style={{ position: 'relative', display: 'inline-block', marginLeft: '4px', verticalAlign: 'middle' }}>
      <button
        type="button"
        aria-label={`Definition of ${term}`}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '15px', height: '15px',
          borderRadius: '50%',
          background: 'rgba(14,165,233,0.12)',
          border: '1px solid rgba(14,165,233,0.25)',
          color: 'var(--accent)',
          fontSize: '9px',
          fontFamily: '"DM Mono", monospace',
          fontWeight: 600,
          cursor: 'help',
          lineHeight: 1,
          flexShrink: 0,
          transition: 'background 0.15s, border-color 0.15s',
        }}
      >
        i
      </button>

      {open && (
        <span
          role="tooltip"
          style={{
            position: 'absolute',
            zIndex: 100,
            left: '50%',
            transform: 'translateX(-50%)',
            bottom: 'calc(100% + 8px)',
            width: '240px',
            background: 'var(--surface3)',
            border: '1px solid var(--border-md)',
            borderRadius: '8px',
            padding: '10px 13px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
            pointerEvents: 'none',
          }}
        >
          <strong style={{
            display: 'block',
            fontFamily: '"DM Mono", monospace',
            fontSize: '10px',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--accent)',
            marginBottom: '5px',
          }}>{term}</strong>
          <span style={{ fontSize: '12px', color: 'var(--text-primary)', lineHeight: 1.55, display: 'block' }}>
            {definition}
          </span>
          {why && (
            <span style={{
              display: 'block',
              fontSize: '11px',
              color: 'var(--text-muted)',
              marginTop: '6px',
              paddingTop: '6px',
              borderTop: '1px solid var(--border)',
              lineHeight: 1.5,
            }}>
              Why it matters: {why}
            </span>
          )}
          {/* Arrow */}
          <span style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%) rotate(45deg)',
            bottom: '-5px',
            width: '8px', height: '8px',
            background: 'var(--surface3)',
            borderRight: '1px solid var(--border-md)',
            borderBottom: '1px solid var(--border-md)',
          }} />
        </span>
      )}
    </span>
  );
}
