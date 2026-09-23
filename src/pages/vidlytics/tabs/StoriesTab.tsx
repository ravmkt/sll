import React, { useState } from 'react';
import { Plus, Eye, Film, Search, MoreVertical, Play, ChevronDown, CheckCircle2 } from 'lucide-react';

export default function StoriesTab() {
  const [busca, setBusca] = useState('');

  return (
    <div className="space-y-6">
      {/* CABEÇALHO PADRÃO RESULTADOS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Stories Ativos</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Gerencie os grupos de stories, produtos tagueados e posições de exibição na loja.
          </p>
        </div>

        <button className="bg-[#0094eb] hover:bg-sky-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs flex items-center gap-2 flex-shrink-0 self-start sm:self-auto cursor-pointer">
          <Plus className="w-4 h-4" />
          <span>Criar Grupo de Stories</span>
        </button>
      </div>

      {/* CARDS DE RESUMO */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Grupos de Stories</span>
            <p className="text-2xl font-bold text-slate-800">2</p>
            <p className="text-xs text-slate-400">Coleções configuradas</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-[#0094eb] flex items-center justify-center border border-sky-100 flex-shrink-0">
            <Film className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Produtos Vinculados</span>
            <p className="text-2xl font-bold text-emerald-500">4</p>
            <p className="text-xs text-slate-400">Com botão direto de compra</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center border border-emerald-100 flex-shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Status do Widget</span>
            <p className="text-2xl font-bold text-slate-800">Publicado</p>
            <p className="text-xs text-slate-400">Exibindo em todas as páginas</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#fd8539] flex items-center justify-center border border-orange-100 flex-shrink-0">
            <Eye className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* BUSCA */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Buscar por grupo de stories..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full bg-white border border-slate-200 text-xs text-slate-700 py-3 pl-10 pr-4 rounded-xl shadow-xs focus:outline-none focus:ring-2 focus:ring-[#0094eb]/20"
        />
      </div>

      {/* LISTA DE GRUPOS DE STORIES */}
      <div className="space-y-3">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full ring-2 ring-[#0094eb] p-0.5 overflow-hidden flex-shrink-0">
              <img
                src="https://images.unsplash.com/photo-1508296695146-257a814070b4?w=200&auto=format&fit=crop&q=80"
                alt="Óculos de Sol"
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-800">Coleção Verão 2026</h4>
                <span className="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2 py-0.5 rounded-full">Ativo</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">1 vídeo • 2 produtos marcados</p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
              Editar
            </button>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full ring-2 ring-[#0094eb] p-0.5 overflow-hidden flex-shrink-0">
              <img
                src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=200&auto=format&fit=crop&q=80"
                alt="Fashion"
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-800">Novidades Joias & Acessórios</h4>
                <span className="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2 py-0.5 rounded-full">Ativo</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">1 vídeo • 2 produtos marcados</p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
              Editar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
