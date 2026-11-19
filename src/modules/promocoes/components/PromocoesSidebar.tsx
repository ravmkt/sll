import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut, Megaphone, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import SidebarTourSlot from '@/components/layout/SidebarTourSlot';
import { PROMOCOES_SECTIONS, type PromocoesTab } from './promocoesNav';

function BrandLogo({ expanded }: { expanded: boolean }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="flex items-center gap-2">
        <Megaphone size={expanded ? 28 : 26} className="text-[#0094eb]" />
        {expanded && (
          <span className="text-xl font-bold text-[#1E4FA3]">
            Promo<span className="text-[#FF7A1A]">ções</span>
          </span>
        )}
      </div>
    );
  }
  return expanded ? (
    <img src="/assets/promocoes-logo-wide-transp.png" alt="Promoções" onError={() => setFailed(true)} className="h-14 w-auto max-w-full object-contain" />
  ) : (
    <img src="/assets/promocoes-logo-ico.png" alt="Promoções" onError={() => setFailed(true)} className="h-11 w-11 object-contain" />
  );
}

export function PromocoesSidebar({
  activeTab, onTabChange, isCollapsed, onToggle,
}: { activeTab: PromocoesTab; onTabChange: (t: PromocoesTab) => void; isCollapsed: boolean; onToggle: () => void }) {
  const navigate = useNavigate();
  const { signOut } = useAuth() as { signOut: () => Promise<unknown> | void };
  const isExpanded = !isCollapsed;

  return (
    <aside
      className={`sticky top-[calc(var(--trial-h,0px)_+_3.5rem)] h-[calc(100vh_-_var(--trial-h,0px)_-_3.5rem)] shrink-0 self-start border-r border-slate-200 bg-white transition-all duration-300 ease-in-out flex flex-col z-20 ${
        isExpanded ? 'w-64' : 'w-20'
      }`}
    >
      <div className="flex h-24 items-center justify-center gap-3 border-b border-slate-200 p-4">
        <BrandLogo expanded={isExpanded} />
      </div>

      <div className="px-4 pt-3">
        <button
          type="button"
          onClick={onToggle}
          title={isExpanded ? 'Recolher menu' : 'Expandir menu'}
          className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
            isExpanded ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-[#0094eb] text-white hover:bg-[#007bc4]'
          }`}
        >
          {isCollapsed ? (
            <PanelLeftOpen size={16} className="shrink-0" />
          ) : (
            <>
              <PanelLeftClose size={16} className="shrink-0" />
              <span>Recolher</span>
            </>
          )}
        </button>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4 [&::-webkit-scrollbar]:hidden">
        {PROMOCOES_SECTIONS.map((section, idx) => (
          <div key={section.title} className={idx > 0 ? 'mt-4' : ''}>
            {isExpanded ? (
              <p className="mb-1 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">{section.title}</p>
            ) : (
              idx > 0 && <div className="mx-2 mb-2 border-t border-slate-200" />
            )}
            <div className="flex flex-col gap-1">
              {section.items.map((it) => {
                const Icon = it.icon;
                const active = activeTab === it.id;
                return (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => onTabChange(it.id)}
                    title={!isExpanded ? it.label : undefined}
                    className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-4 py-2.5 text-left text-sm transition-all duration-200 ${
                      !isExpanded ? 'justify-center' : ''
                    } ${
                      active
                        ? 'bg-[#0094eb] font-medium text-white shadow-md shadow-[#0094eb]/20'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-[#0094eb]'
                    }`}
                  >
                    <Icon size={20} className="shrink-0" />
                    {isExpanded && <span className="whitespace-nowrap">{it.label}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="pb-4"><SidebarTourSlot isExpanded={isExpanded} /></div>

      <div className="space-y-2 border-t border-slate-200 px-4 pb-4 pt-3">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          title={!isExpanded ? 'Voltar ao SLL' : undefined}
          className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-4 py-2 text-xs text-slate-500 transition-colors hover:bg-slate-100 hover:text-[#0094eb] ${
            !isExpanded ? 'justify-center' : 'justify-start'
          }`}
        >
          <ArrowLeft size={18} className="shrink-0" />
          {isExpanded && <span className="whitespace-nowrap">Voltar ao SLL</span>}
        </button>
        <button
          type="button"
          onClick={() => void signOut()}
          title={!isExpanded ? 'Sair da Plataforma' : undefined}
          className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-4 py-2 text-xs text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 ${
            !isExpanded ? 'justify-center' : 'justify-start'
          }`}
        >
          <LogOut size={18} className="shrink-0" />
          {isExpanded && <span>Sair da Plataforma</span>}
        </button>
      </div>
    </aside>
  );
}

export default PromocoesSidebar;