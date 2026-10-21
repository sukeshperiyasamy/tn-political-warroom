import React from "react";
import { FileQuestion, Loader2 } from "lucide-react";

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      role="status"
      className="grid place-items-center gap-2 rounded-xl border border-line bg-surface py-16 text-ink-muted"
    >
      <Loader2 className="w-6 h-6 animate-spin" aria-hidden="true" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function EmptyState({ title, description, children }: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-line-strong bg-surface px-6 py-14 text-center">
      <FileQuestion className="w-9 h-9 text-ink-muted mx-auto mb-3" aria-hidden="true" />
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      {description && <p className="mt-1 text-sm text-ink-muted max-w-md mx-auto">{description}</p>}
      {children && <div className="mt-4 flex items-center justify-center gap-2">{children}</div>}
    </div>
  );
}
