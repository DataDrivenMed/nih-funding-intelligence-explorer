export default function LoadingSpinner() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      height: '200px', gap: '16px',
    }}>
      <div style={{
        width: '36px', height: '36px',
        borderRadius: '50%',
        border: '2px solid rgba(14,165,233,0.15)',
        borderTopColor: 'var(--accent)',
        animation: 'spin 0.8s linear infinite',
      }} />
      <span style={{
        fontFamily: '"DM Mono", monospace',
        fontSize: '10px',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: 'var(--text-muted)',
      }}>Loading data…</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
