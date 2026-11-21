import type { ElementType, ReactNode } from 'react';

type Props = { icon: ElementType; title: string; subtitle?: string; actions?: ReactNode };

export default function PageHeader({ icon: Icon, title, subtitle, actions }: Props) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold text-slate-900 dark:text-white">
          <Icon className="h-6 w-6 text-[#0094EB]" />
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}