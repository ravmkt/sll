import React, { useState } from 'react';
import { Sparkles, ChevronDown, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import VisaoGeralTab from './vidlytics/tabs/VisaoGeralTab';
import ResultadosTab from './vidlytics/tabs/ResultadosTab';
import StoriesTab from './vidlytics/tabs/StoriesTab';
import BibliotecaTab from '../components/vidlytics/BibliotecaTab';
import ComentariosTab from './vidlytics/tabs/ComentariosTab';
import AparenciaTab from './vidlytics/AparenciaTab';

export type VidlyticsTab = 'visao-geral' | 'resultados' | 'stories' | 'biblioteca' | 'comentarios' | 'aparencia';

export default function Vidlytics() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<VidlyticsTab>('stories');

  const tabs: { id: VidlyticsTab; label: string }[] = [
    { id: 'visao-geral', label: 'Visão Geral' },
    { id: 'resultados', label: 'Resultados' },
    { id: 'stories', label: 'Stories' },
    { id: 'biblioteca', label: 'Biblioteca' },
    { id: 'comentarios', label: 'Comentários' },
    { id: 'aparencia', label: 'Aparência' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* 1. TOPBAR DO SLL */}
      <header className="bg-white border-b border-slate-200/80 px-6 py-3 flex items-center justify-between sticky top-0 z-40">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <img
            src="/assets/sll-logotipo-ico.png"
            alt="SLL"
            className="h-7 w-auto object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = 'none';
            }}
          />
          <span className="text-slate-500 font-normal">←</span>
          <span>Voltar ao Hub Central</span>
        </button>

        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-600 font-medium shadow-xs hover:bg-slate-50 transition-colors cursor-pointer">
          <Layers className="w-3.5 h-3.5 text-[#0094eb]" />
          <span>Módulo: <strong className="text-slate-800">Vidlytics Stories</strong></span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* BANNER PROMO */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-[#0a192f] to-slate-950 text-white p-7 shadow-md border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl z-10">
            <span className="inline-flex items-center gap-1.5 bg-[#fd8539] text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-xs">
              <Sparkles className="w-3 h-3" /> TURBINE SEU E-COMMERCE
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-white leading-snug">
              Transforme visitantes em clientes com Vídeos Curtos e Stories
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Seus produtos integrados diretamente nos vídeos interativos com conversão em tempo real.
            </p>
          </div>

          {/* Gráfico decorativo do banner */}
          <div className="hidden lg:flex flex-col bg-slate-900/80 border border-slate-800/80 rounded-xl p-3.5 w-64 shadow-inner">
            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-2 font-mono">
              <span>USERS: LAST 7 DAYS</span>
              <span className="text-emerald-400 font-semibold">+57.1%</span>
            </div>
            <div className="flex items-end gap-1.5 h-12 pt-2">
              <div className="flex-1 bg-[#0094eb]/40 rounded-t h-4"></div>
              <div className="flex-1 bg-[#0094eb]/60 rounded-t h-7"></div>
              <div className="flex-1 bg-[#0094eb]/40 rounded-t h-5"></div>
              <div className="flex-1 bg-[#0094eb]/80 rounded-t h-10"></div>
              <div className="flex-1 bg-[#0094eb]/90 rounded-t h-8"></div>
              <div className="flex-1 bg-[#0094eb] rounded-t h-12 shadow-[0_0_8px_rgba(0,148,235,0.4)]"></div>
              <div className="flex-1 bg-[#0094eb]/70 rounded-t h-9"></div>
              <div className="flex-1 bg-[#0094eb]/85 rounded-t h-11"></div>
            </div>
          </div>
        </div>

        {/* BARRA DE NAVEGAÇÃO DE ABAS COM LOGOTIPO VIDLYTICS */}
        <div className="bg-white px-6 py-3.5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          {/* Logotipo Vidlytics */}
          <div className="flex items-center gap-2">
            <div className="flex items-center">
              <span className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-1.5">
                <svg className="w-6 h-6" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7 6L16 26L25 6" stroke="#0094eb" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M14 6L23 26" stroke="#fd8539" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Vid<span className="text-[#fd8539]">lytics</span></span>
              </span>
            </div>
          </div>

          {/* Abas */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#0094eb] text-white shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* RENDERIZAÇÃO MODULAR DAS ABAS */}
        <div>
          {activeTab === 'visao-geral' && <VisaoGeralTab />}
          {activeTab === 'resultados' && <ResultadosTab />}
          {activeTab === 'stories' && <StoriesTab />}
          {activeTab === 'biblioteca' && <BibliotecaTab />}
          {activeTab === 'comentarios' && <ComentariosTab />}
          {activeTab === 'aparencia' && <AparenciaTab />}
        </div>
      </main>

      {/* RODAPÉ FIEL AO PRINT */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 Vidlytics. Todos os direitos reservados.</p>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">DESENVOLVIDO POR:</span>
            <img
              src="/assets/sll-logotipo.png"
              alt="Sistema Loja Lucrativa"
              className="h-6 w-auto object-contain"
              onError={(e) => {
                // Fallback elegante caso a imagem principal esteja em outro caminho
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent && !parent.querySelector('.sll-text-fallback')) {
                  const span = document.createElement('span');
                  span.className = 'sll-text-fallback font-bold text-xs text-[#0094eb] flex items-center gap-1';
                  span.innerHTML = '🛒 Sistema <span style="color:#fd8539">Loja Lucrativa</span>';
                  parent.appendChild(span);
                }
              }}
            />
          </div>
        </div>
      </footer>
    </div>
  );
}
