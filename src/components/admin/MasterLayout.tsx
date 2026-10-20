import type { ElementType, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFxRate } from '../../hooks/admin/useFxRate';
import { Bot, ArrowLeft, Layers, LayoutDashboard, Lightbulb, Megaphone, ShieldCheck, Store, Tag } from 'lucide-react';

export type MasterTab = 'dashboard' | 'lojas' | 'modulos' | 'precos' | 'marketing' | 'insights' | 'noah';

const ITEMS: { id: MasterTab; label: string; icon: ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'lojas', label: 'Lojas', icon: Store },
  { id: 'modulos', label: 'Módulos', icon: Layers },
  { id: 'precos', label: 'Preços', icon: Tag },
  { id: 'marketing', label: 'Marketing', icon: Megaphone },
  { id: 'insights', label: 'Insights', icon: Lightbulb },
  { id: 'noah', label: 'Suporte Noah', icon: Bot },
];

export function MasterLayout({ tab, onTab, children }: { tab: MasterTab; onTab: (t: MasterTab) => void; children: ReactNode }) {
  const navigate = useNavigate();
  const { rate, syncedAt } = useFxRate();

  return (
    <div className="flex min-h-screen bg-[#0b0e1a] font-sans text-slate-200">
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-slate-800 bg-[#0f1322]">
        <div className="flex h-16 items-center gap-2.5 border-b border-slate-800 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fd8539]/15">
            <ShieldCheck className="h-5 w-5 text-[#fd8539]" />
          </div>
          <div>
            <p className="text-[15px] font-black leading-tight text-white">SLL Master</p>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">SuperAdmin</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {ITEMS.map((it) => {
            const Icon = it.icon;
            const on = tab === it.id;
            return (
              <button
                key={it.id}
                type="button"
                onClick={() => onTab(it.id)}
                className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-3.5 py-2.5 text-left text-[15px] transition-colors ${
                  on ? 'bg-[#0094eb] font-semibold text-white shadow-md shadow-[#0094eb]/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon size={18} className="shrink-0 text-[#fd8539]" />
                {it.label}
              </button>
            );
          })}
        </nav>

        <div className="px-5 pb-3" title={syncedAt ? `Atualizado em ${new Date(syncedAt).toLocaleString('pt-BR')}` : undefined}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Cotação do dia</p>
          <p className="text-sm font-bold text-white">
            US$ 1 = {rate ? `R$ ${rate.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
          </p>
        </div>
        <div className="border-t border-slate-800 p-3">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3.5 py-2.5 text-[15px] text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft size={18} className="shrink-0 text-[#fd8539]" />
            Voltar ao SLL
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-6">{children}</main>
    </div>
  );
}

export default MasterLayout;