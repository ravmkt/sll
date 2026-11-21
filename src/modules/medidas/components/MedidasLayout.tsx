import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MousePointerClick, Palette, Ruler } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';

export type MedidasTab = 'botao' | 'aparencia';

const ITEMS: { id: MedidasTab; label: string; icon: typeof Palette }[] = [
  { id: 'botao', label: 'Botão', icon: MousePointerClick },
  { id: 'aparencia', label: 'Aparência do modal', icon: Palette },
];

export default function MedidasLayout({ children }: { children: (tab: MedidasTab) => ReactNode }) {
  const [tab, setTab] = useState<MedidasTab>('botao');

  return (
    <div className="min-h-screen bg-slate-50">
      <TopBar />
      <div className="flex">
        <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white md:block" style={{ minHeight: 'calc(100vh - 56px)' }}>
          <div className="flex items-center gap-2 px-5 py-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--sll-b-brand-soft)] text-[color:var(--sll-b-brand)]">
              <Ruler size={20} />
            </div>
            <span className="text-lg font-extrabold text-slate-900">Medidas</span>
          </div>
          <nav className="flex flex-col gap-1 px-3">
            {ITEMS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition ' +
                  (tab === id ? 'bg-[color:var(--sll-b-brand)] text-white' : 'text-slate-600 hover:bg-slate-100')
                }
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
            <Link
              to="/dashboard/medidas"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              <Ruler size={18} />
              Tabelas de medidas
            </Link>
          </nav>
          <div className="mt-8 border-t border-slate-200 px-3 pt-4">
            <Link to="/dashboard" className="flex items-center gap-2 px-3 py-2 text-xs text-slate-500 hover:text-slate-800">
              <ArrowLeft size={14} /> Voltar ao SLL
            </Link>
          </div>
        </aside>
        <main className="min-w-0 flex-1">{children(tab)}</main>
      </div>
    </div>
  );
}