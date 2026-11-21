import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SllPageHeaderProps = { title: string; subtitle?: string; actions?: ReactNode; className?: string };

export function SllPageHeader({ title, subtitle, actions, className }: SllPageHeaderProps) {
  return (
    <div className={cn("mb-6 flex items-start justify-between gap-4", className)}>
      <div>
        <h1 className="text-xl font-semibold text-[color:var(--sll-text)]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-[color:var(--sll-text-muted)]">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}