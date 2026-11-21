import type { ReactNode } from "react";

type SllPageHeaderProps = { title: string; subtitle?: string; actions?: ReactNode };

export function SllPageHeader({ title, subtitle, actions }: SllPageHeaderProps) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--sll-text)]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-[var(--sll-text-muted)]">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}