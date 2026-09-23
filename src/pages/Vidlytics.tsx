import React, { useState } from 'react';
import { Sparkles, ChevronDown, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import VisaoGeralTab from './vidlytics/tabs/VisaoGeralTab';
import ResultadosTab from './vidlytics/tabs/ResultadosTab';
import StoriesTab from './vidlytics/tabs/StoriesTab';
import BibliotecaTab from '../components/vidlytics/BibliotecaTab';

export type VidlyticsTab = 'visao-geral' | 'resultados' | 'stories' | 'biblioteca' | 'produtos' | 'comentarios' | 'aparencia';

export default function Vidlytics() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<VidlyticsTab>('visao-geral');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">

      {/* 1. TOPBAR DO SLL */}
      <header className="bg-white border-b border-slate-200/80 px-6 py-3 flex items-center justify-between sticky top-0 z-40">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
        >
          <img
            src="/assets/sll-logotipo-ico.png"
            alt="SLL"
            className="h-8 w-auto object-contain"
          />
          <span className="text-slate-500 font-normal">←</span>
          <span>Voltar ao Hub Central</span>
        </button>

        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/90 rounded-xl px-3 py-1.5 text-xs text-slate-600 font-medium shadow-2xs hover:bg-slate-100/70 transition-colors cursor-pointer">
          <Layers className="w-3.5 h-3.5 text-[#0094eb]" />
          <span>Módulo: <strong className="text-slate-800">Vidlytics Stories</strong></span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">

        {/* BANNER PROMO */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 shadow-md border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl z-10">
            <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-[#fd8539] to-orange-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
              <Sparkles className="w-3 h-3" /> Turbine seu E-commerce
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Transforme visitantes em clientes com Vídeos Curtos e Stories
            </h2>
            <p className="text-sm text-slate-300">
              Seus produtos integrados diretamente nos vídeos interativos com conversão em tempo real.
            </p>
          </div>

          <div className="hidden lg:block w-72 h-28 bg-slate-800/80 rounded-xl border border-slate-700/60 p-3 shadow-inner relative overflow-hidden backdrop-blur-sm">
            <div className="text-[10px] text-slate-400 font-mono flex justify-between">
              <span>USERS: LAST 7 DAYS</span>
              <span className="text-emerald-400">+57.1%</span>
            </div>
            <div className="mt-2 flex items-end gap-1 h-16">
              {[40, 65, 30, 80, 55, 90, 75, 45, 95, 85, 60, 100].map((h, i) => (
                <div key={i} className="flex-1 bg-gradient-to-t from-[#0094eb]/30 to-[#0094eb] rounded-t-sm" style={{ height: `${h}%` }}></div>
              ))}
            </div>
          </div>
        </div>

        {/* 2. BARRA DE ABAS COM LOGO */}
        <div className="bg-white rounded-xl p-2.5 shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center pl-2">
            <img
              src="/assets/vidlytics-logo-wide.png"
              alt="Vidlytics"
              className="h-8 w-auto object-contain"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto py-1">
            {[
              { id: 'visao-geral', label: 'Visão Geral' },
              { id: 'resultados', label: 'Resultados' },
              { id: 'stories', label: 'Stories' },
              { id: 'biblioteca', label: 'Biblioteca' },
              { id: 'produtos', label: 'Produtos' },
              { id: 'comentarios', label: 'Comentários' },
              { id: 'aparencia', label: 'Aparência' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as VidlyticsTab)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-[#0094eb] text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* RENDERIZAÇÃO MODULAR DAS ABAS */}
        {activeTab === 'visao-geral' && <VisaoGeralTab />}
        {activeTab === 'resultados' && <ResultadosTab />}
        {activeTab === 'stories' && <StoriesTab />}
          {activeTab === 'biblioteca' && <BibliotecaTab />}

        {/* Próximas abas isoladas */}
        {!['visao-geral', 'resultados', 'stories', 'biblioteca'].includes(activeTab) && (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
            <h3 className="text-base font-bold text-slate-700 capitalize">Módulo: {activeTab}</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Esta aba terá seu próprio arquivo isolado em <code>src/pages/vidlytics/tabs/</code>.
            </p>
          </div>
        )}

      </main>

      {/* 3. RODAPÉ */}
      <footer className="bg-white border-t border-slate-200/80 px-6 py-4 mt-auto text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p>© 2026 Vidlytics. Todos os direitos reservados.</p>
        <div className="flex items-center gap-2.5">
          <span className="font-semibold text-slate-400 text-[10px] uppercase tracking-wider">DESENVOLVIDO POR:</span>
          <img
            src="/assets/sll-logotipo.png"
            alt="Sistema Loja Lucrativa"
            className="h-8 w-auto object-contain"
          />
        </div>
      </footer>
    </div>
  );
}
