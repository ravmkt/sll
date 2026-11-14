import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { ArrowLeft, LayoutGrid, Palette, Ruler } from 'lucide-react';
import WidgetsOverviewPage from './WidgetsOverviewPage';
import WidgetsRulerPage from './WidgetsRulerPage';
import WidgetsAppearancePage from './WidgetsAppearancePage';
import type { WidgetsCtx } from '../../types/widgets';

export default function WidgetsModule({ ctx }: { ctx: WidgetsCtx }) {
  const base = ctx.basePath ?? '/widgets';
  const items = [
    { to: base, label: 'Visão Geral', icon: LayoutGrid, end: true },
    { to: `${base}/ruler`, label: 'Régua', icon: Ruler, end: false },
    { to: `${base}/appearance`, label: 'Aparência', icon: Palette, end: false },
  ];
  return (
    <div className="flex min-h-[calc(100vh-56px)] bg-slate-50">
      <aside className="flex w-[248px] shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-6 py-6 text-2xl font-extrabold text-[#0094EB]">
          Wid<span className="text-orange-500">gets</span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {items.map((i) => (
            <NavLink key={i.to} to={i.to} end={i.end}
              className={({ isActive }) => `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold ${
                isActive ? 'bg-[#0094EB] text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}>
              <i.icon className="h-5 w-5" /> {i.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-100 p-4">
          <NavLink to="/" className="flex items-center gap-2 text-xs text-slate-500"><ArrowLeft className="h-4 w-4" /> Voltar ao SLL</NavLink>
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        <Routes>
          <Route index element={<WidgetsOverviewPage ctx={ctx} />} />
          <Route path="ruler" element={<WidgetsRulerPage ctx={ctx} />} />
          <Route path="appearance" element={<WidgetsAppearancePage ctx={ctx} />} />
          <Route path="*" element={<Navigate to={base} replace />} />
        </Routes>
      </main>
    </div>
  );
}
