import React from 'react';

interface Props {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export default function SectionShell({ title, description, children }: Props) {
  return (
    <div className="section-card">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">{title}</h2>
      {description && <p className="text-sm text-gray-500 mb-6">{description}</p>}
      {children}
    </div>
  );
}
