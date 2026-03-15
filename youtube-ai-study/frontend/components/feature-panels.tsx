import { ReactNode } from "react";

export function SectionCard({
  title,
  actions,
  children,
  className = "",
  contentClassName = "",
}: {
  title: string | ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <section className={`section-card ${className}`.trim()}>
      <div className="section-card-head">
        <h2>{title}</h2>
        {actions ? <div className="section-card-actions">{actions}</div> : null}
      </div>
      <div className={contentClassName}>{children}</div>
    </section>
  );
}

export function SkeletonLines({ count = 4 }: { count?: number }) {
  return (
    <div className="skeleton-wrap">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-line" />
      ))}
    </div>
  );
}
