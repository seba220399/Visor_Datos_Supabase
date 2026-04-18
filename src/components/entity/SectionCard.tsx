import type { ReactNode } from "react";

interface SectionCardProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  children: ReactNode;
}

export function SectionCard({
  title,
  description,
  actionLabel,
  onAction,
  children,
}: SectionCardProps) {
  const hasHeadingContent = Boolean(title || description);
  const hasAction = Boolean(actionLabel && onAction);

  return (
    <section className="card">
      {hasHeadingContent || hasAction ? (
        <div className={hasHeadingContent ? "card-header" : "card-header card-header-action-only"}>
          {hasHeadingContent ? (
            <div>
              {title ? <h2>{title}</h2> : null}
              {description ? <p className="card-description">{description}</p> : null}
            </div>
          ) : null}
          {hasAction ? (
          <button className="button button-primary" onClick={onAction} type="button">
            {actionLabel}
          </button>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
