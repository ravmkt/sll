import React from 'react';
import { 
  LayoutDashboard, 
  TrendingUp, 
  Film, 
  FolderKanban, 
  MessageSquare, 
  Palette, 
  PanelLeftClose, 
  PanelLeftOpen 
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
      {/* 1. TOPO DA SIDEBAR: LOGO VIDLYTICS CENTRALIZADO + TOGGLE */}
      <div className="relative h-20 px-4 border-b border-slate-100 flex items-center justify-center">
        <div className="flex items-center justify-center overflow-hidden">
          {isExpanded ? (
            <img
              src="/assets/vidlytics-logo-wide.png"
              alt="Vidlytics"
              className="h-8 w-auto object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <img
              src="/assets/vidlytics-logo-ico.png"
              alt="Vidlytics"
              className="h-8 w-auto object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          )}
        </div>

        {/* Botão de Toggle fixado na direita se expandido ou no canto */}
        <button
          onClick={onToggle}
          title={isExpanded ? 'Recolher menu' : 'Expandir menu'}
          className={`text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg p-1.5 transition-colors cursor-pointer ${
            isExpanded ? 'absolute right-3' : 'absolute -right-3.5 top-7 bg-white border border-slate-200 shadow-sm rounded-full'
          }`}
        >
          {isExpanded ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={14} />}
        </button>
      </div>

      {/* 2. LISTA DE ABAS DE NAVEGAÇÃO */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
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

      {/* 3. RODAPÉ DA SIDEBAR: LOGO SLL CENTRALIZADO (CLICÁVEL PARA DASHBOARD) */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-center">
        <button
          onClick={() => navigate('/dashboard')}
          title="Voltar ao Dashboard SLL"
          className="flex items-center justify-center hover:opacity-80 transition-opacity cursor-pointer w-full py-1"
        >
          {isExpanded ? (
            <img
              src="/assets/sll-logotipo.png"
              alt="Sistema Loja Lucrativa"
              className="h-8 w-auto object-contain mx-auto"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <img
              src="/assets/sll-logotipo-ico.png"
              alt="SLL"
              className="h-7 w-auto object-contain mx-auto"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          )}
        </button>
      </div>
    </aside>
  );
}