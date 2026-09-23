import type { ReactNode } from 'react';

export interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  text?: string;
  children?: ReactNode;
}

export function EmptyState({ icon, title, text, children }: EmptyStateProps) {
  return (
    <div className="empty">
      <div className="empty__icon" aria-hidden="true">
        {icon}
      </div>
      <p className="empty__title">{title}</p>
      {text ? <p className="empty__text">{text}</p> : null}
      {children ? <div className="empty__actions">{children}</div> : null}
    </div>
  );
}
