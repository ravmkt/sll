import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Layers, 
  ChevronDown, 
  Radio, 
  Gamepad2, 
  Store, 
  Check, 
  Sparkles 
} from 'lucide-react';

export interface ModuleItem {
  id: string;
  name: string;
  category: string;
  path: string;
  icon: React.ElementType;
  active: boolean;
  isCurrent?: boolean;
}

export function ModuleSelectorDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Lista dos módulos liberados para o lojista
  const modules: ModuleItem[] = [
    {
      id: 'vidlytics',
      name: 'Vidlytics Stories',
      category: 'Vídeos Interativos',
      path: '/dashboard/modules/vidlytics',
      icon: Layers,
      active: true,
      isCurrent: true,
    },
    {
      id: 'live-commerce',
      name: 'Live E-commerce',
      category: 'Transmissões Ao Vivo',
      path: '/dashboard/modules/live-commerce',
      icon: Radio,
      active: true,
      isCurrent: false,
    },
    {
      id: 'gamificacao',
      name: 'Gamificação',
      category: 'Engajamento & Prêmios',
      path: '/dashboard/modules',
      icon: Gamepad2,
      active: true,
      isCurrent: false,
    },
    {
      id: 'pdv',
      name: 'PDV Omnichannel',
      category: 'Frente de Caixa',
      path: '/dashboard/modules',
      icon: Store,
      active: true,
      isCurrent: false,
    },
  ];

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentModule = modules.find((m) => m.isCurrent) || modules[0];
  const CurrentIcon = currentModule.icon;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botão de expansão do seletor */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2.5 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl px-3.5 py-1.5 text-xs text-slate-700 font-medium shadow-2xs hover:border-slate-300 transition-all cursor-pointer"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <CurrentIcon className="w-4 h-4 text-[#0094eb]" />
        <span className="font-semibold text-slate-800">{currentModule.name}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-slate-700' : ''
          }`}
        />
      </button>

      {/* Menu Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-3.5 py-2 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Seus Módulos Contratados
            </span>
            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" /> Acesso Total
            </span>
          </div>

          <div className="p-1.5 space-y-1">
            {modules.map((mod) => {
              const Icon = mod.icon;
              return (
                <button
                  key={mod.id}
                  onClick={() => {
                    setIsOpen(false);
                    if (mod.path) {
                      navigate(mod.path);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                    mod.isCurrent
                      ? 'bg-blue-50/80 text-[#0094eb]'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        mod.isCurrent
                          ? 'bg-[#0094eb] text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-semibold truncate leading-tight">
                        {mod.name}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {mod.category}
                      </p>
                    </div>
                  </div>

                  {mod.isCurrent && (
                    <Check className="w-4 h-4 text-[#0094eb] shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}