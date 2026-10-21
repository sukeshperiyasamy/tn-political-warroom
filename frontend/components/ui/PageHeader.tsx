import React from "react";

interface PageHeaderProps {
  title: string;
  tamilTitle?: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, tamilTitle, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
      <div className="min-w-0">
        <h1 className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight text-ink">
          {title}
          {tamilTitle && (
            <span className="font-tamil text-base sm:text-lg font-medium text-ink-muted ml-3">
              {tamilTitle}
            </span>
          )}
        </h1>
        {description && <p className="mt-1.5 text-sm text-ink-muted max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
