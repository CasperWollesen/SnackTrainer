import type { ReactNode } from 'react';

export interface SectionProps {
  title: string;
  count?: number;
  action?: ReactNode;
  children: ReactNode;
}

export function Section({ title, count, action, children }: SectionProps) {
  return (
    <section className="section">
      <div className="section__header">
        <h3 className="section__title">
          {title}
          {count !== undefined ? <span className="section__count">{count}</span> : null}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}
