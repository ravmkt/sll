import React from 'react';
import { 
  LayoutDashboard, 
  TrendingUp, 
  Film, 
  FolderKanban, 
  MessageSquare, 
  Palette, 
  ArrowLeft, 
  PanelLeftClose, 
  PanelLeftOpen,
  Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export type VidlyticsTab = 'visao-geral' | 'resultados' | 'stories' | 'biblioteca' | 'comentarios' | 'aparencia';

interface VidlyticsSidebarProps {
  activeTab: VidlyticsTab;
  onTabChange: (tab: VidlyticsTab) => void;
  isCollapsed: boolean;
  onToggle: () => void;
}

export function VidlyticsSidebar({
  activeTab,
  onTabChange,
  isCollapsed,
  onToggle,
}: VidlyticsSidebarProps) {
  const navigate = useNavigate();
  const isExpanded = !isCollapsed;

  const menuItems: { id: VidlyticsTab; label: string; icon: React.ElementType }[] = [
    { id: 'visao-geral', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'resultados', label: 'Resultados & Métricas', icon: TrendingUp },
    { id: 'stories', label: 'Stories & Vídeos', icon: Film },
    { id: 'biblioteca', label: 'Biblioteca de Mídia', icon: FolderKanban },
    { id: 'comentarios', label: 'Comentários', icon: MessageSquare },
    { id: 'aparencia', label: 'Aparência & Widget', icon: Palette },
  ];

  return (
    <aside
      className={`h-screen sticky top-0 border-r border-slate-200/90 bg-white transition-all duration-300 ease-in-out flex flex-col z-30 select-none shadow-xs shrink-0 ${
        isExpanded ? 'w-64' : 'w-20'
      }`}
    >
      {/* 1. TOPO DA SIDEBAR: LOGO VIDLYTICS + TOGGLE */}
      <div className="h-20 px-4 border-b border-slate-100 flex items-center justify-between">
        {isExpanded ? (
          <div className="flex items-center gap-2 overflow-hidden">
            <img
              src="/assets/vidlytics-logo-wide.png"
              alt="Vidlytics"
              className="h-8 w-auto object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        ) : (
          <div className="w-full flex justify-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0094eb] to-blue-600 flex items-center justify-center text-white font-black text-sm shadow-sm">
              V
            </div>
          </div>
        )}

        <button
          onClick={onToggle}
          title={isExpanded ? 'Recolher menu' : 'Expandir menu'}
          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
        >
          {isExpanded ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
        </button>
      </div>

      {/* 2. BOTÃO VOLTAR AO HUB CENTRAL */}
      <div className="p-3 border-b border-slate-100">
        <button
          onClick={() => navigate('/dashboard/modules')}
          title="Voltar ao Hub Central SLL"
          className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100/90 border border-slate-200/80 rounded-xl transition-all cursor-pointer ${
            !isExpanded ? 'justify-center px-0' : ''
          }`}
        >
          <ArrowLeft size={16} className="text-slate-500 shrink-0" />
          {isExpanded && <span className="truncate">Voltar ao Hub Central</span>}
        </button>
      </div>

      {/* 3. LISTA DE ABAS DE NAVEGAÇÃO */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        {isExpanded && (
          <div className="px-3 pt-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Navegação do Módulo
          </div>
        )}

        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              title={!isExpanded ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#0094eb] text-white shadow-sm shadow-[#0094eb]/30'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              } ${!isExpanded ? 'justify-center px-0' : ''}`}
            >
              <Icon
                size={18}
                className={`shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`}
              />
              {isExpanded && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* 4. RODAPÉ DA SIDEBAR: SLL BRANDING */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/70">
        {isExpanded ? (
          <div className="flex flex-col gap-1.5 px-2 py-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <Sparkles size={11} className="text-[#fd8539]" />
              <span>Ecossistema SLL</span>
            </div>
            <img
              src="/assets/sll-logotipo.png"
              alt="Sistema Loja Lucrativa"
              className="h-8 w-auto object-contain object-left"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        ) : (
          <div className="flex justify-center py-1">
            <img
              src="/assets/sll-logotipo-ico.png"
              alt="SLL"
              className="h-6 w-auto object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        )}
      </div>
    </aside>
  );
}