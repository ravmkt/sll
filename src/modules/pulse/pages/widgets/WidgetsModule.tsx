import { useState } from 'react';
import { LayoutGrid, Palette, Ruler } from 'lucide-react';
import WidgetsOverviewPage from './WidgetsOverviewPage';
import WidgetsRulerPage from './WidgetsRulerPage';
import WidgetsAppearancePage from './WidgetsAppearancePage';
import type { WidgetsCtx } from '../../types/widgets';

type Sub = 'overview' | 'ruler' | 'appearance';

const SUBS: { id: Sub; label: string; icon: typeof LayoutGrid }[] = [
  { id: 'overview', label: 'Visão Geral', icon: LayoutGrid },
  { id: 'ruler', label: 'Régua', icon: Ruler },
  { id: 'appearance', label: 'Aparência', icon: Palette },
];

export default function WidgetsModule({ ctx }: { ctx: WidgetsCtx }) {
  const [sub, setSub] = useState<Sub>('overview');
  return (
    <div className="space-y-5">
      <nav className="flex flex-wrap gap-2">
        {SUBS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSub(s.id)}
            className={`inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              sub === s.id ? 'bg-[#0094eb] text-white shadow' : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            <s.icon className="h-4 w-4" /> {s.label}
          </button>
        ))}
      </nav>
      {sub === 'overview' && <WidgetsOverviewPage ctx={ctx} />}
      {sub === 'ruler' && <WidgetsRulerPage ctx={ctx} />}
      {sub === 'appearance' && <WidgetsAppearancePage ctx={ctx} />}
    </div>
  );
}