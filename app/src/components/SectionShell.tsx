import React from 'react';

interface Props {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export default function SectionShell({ title, description, children }: Props) {
  return (
    <div className="section-card">
      <div style={{ marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
        <h2 style={{
          fontFamily: '"DM Serif Display", Georgia, serif',
          fontSize: '1.625rem',
          fontWeight: 400,
          color: 'var(--text-primary)',
          letterSpacing: '-0.015em',
          lineHeight: 1.2,
          marginBottom: description ? '0.375rem' : 0,
        }}>
          {title}
        </h2>
        {description && (
          <p style={{
            fontSize: '13px',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            maxWidth: '72ch',
          }}>
            {description}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}
