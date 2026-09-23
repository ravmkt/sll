import React, { useState } from 'react';
import { 
  Eye, MousePointerClick, TrendingUp, DollarSign, 
  Sparkles, CheckCircle2, ChevronDown, Layers, ArrowUpRight
} from 'lucide-react';

export default function VisaoGeralTab() {
  const [periodo, setPeriodo] = useState('30 dias');

  return (
    <div className="space-y-6">
      {/* CABEÇALHO PADRÃO RESULTADOS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Visão Geral</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Resumo consolidado de engajamento, conversões e faturamento do módulo <strong className="text-[#0094eb] font-semibold">Vidlytics</strong>.
          </p>
        </div>

        <div className="relative inline-block self-start sm:self-auto">
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className="appearance-none bg-white border border-slate-200 text-xs font-semibold text-slate-700 py-2 pl-3.5 pr-8 rounded-xl shadow-xs hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0094eb]/20 cursor-pointer"
          >
            <option value="7 dias">7 dias</option>
            <option value="15 dias">15 dias</option>
            <option value="30 dias">30 dias</option>
            <option value="90 dias">90 dias</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* SEÇÃO PRINCIPAIS INDICADORES */}
      <div className="space-y-3">
        <h3 className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
          Principais Indicadores
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Visualizações</span>
              <p className="text-2xl font-bold text-slate-800">0</p>
              <p className="text-xs text-slate-400">Total de exibições</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-[#0094eb] flex items-center justify-center border border-sky-100 flex-shrink-0">
              <Eye className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Taxa de Cliques (CTR)</span>
              <p className="text-2xl font-bold text-slate-800">0,0%</p>
              <p className="text-xs text-slate-400">Interações nos produtos</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#fd8539] flex items-center justify-center border border-orange-100 flex-shrink-0">
              <MousePointerClick className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Taxa de Conversão</span>
              <p className="text-2xl font-bold text-slate-800">0,0%</p>
              <p className="text-xs text-slate-400">Vendas geradas / sessões</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center border border-emerald-100 flex-shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Receita Atribuída</span>
              <p className="text-2xl font-bold text-[#0094eb]">R$ 0,00</p>
              <p className="text-xs text-slate-400">Vendas concluídas</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#0094eb] text-white flex items-center justify-center shadow-xs flex-shrink-0">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* CARD GUIA DE INÍCIO RÁPIDO */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#0094eb]" />
          <h4 className="text-sm font-bold text-slate-800">Status da Configuração do Módulo</h4>
        </div>
        <p className="text-xs text-slate-400">Acompanhe as etapas necessárias para ativar os Stories na sua loja.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-xl border border-slate-200/60 bg-slate-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">1. Subir Vídeos</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-xs text-slate-400">Envie seus vídeos verticais (formato 9:16) na Biblioteca.</p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200/60 bg-slate-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">2. Criar Grupo de Stories</span>
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            </div>
            <p className="text-xs text-slate-400">Organize os vídeos em coleções e vincule aos seus produtos.</p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200/60 bg-slate-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">3. Injetar Widget na Loja</span>
              <span className="w-2 h-2 rounded-full bg-slate-300"></span>
            </div>
            <p className="text-xs text-slate-400">Publique via GTM ou script direto para exibir aos visitantes.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
