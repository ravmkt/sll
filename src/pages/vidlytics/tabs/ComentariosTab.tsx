import React, { useState } from 'react';
import { 
  MessageCircle, Heart, Trash2, CheckCircle2, 
  Search, Filter, ShieldCheck, ChevronDown
} from 'lucide-react';

export default function ComentariosTab() {
  const [statusFiltro, setStatusFiltro] = useState('todos');
  const [busca, setBusca] = useState('');

  return (
    <div className="space-y-6">
      {/* CABEÇALHO PADRÃO RESULTADOS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Comentários</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Moderação e gerenciamento das interações dos clientes deixadas nos seus <strong className="text-[#0094eb] font-semibold">Stories</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="relative inline-block">
            <select
              value={statusFiltro}
              onChange={(e) => setStatusFiltro(e.target.value)}
              className="appearance-none bg-white border border-slate-200 text-xs font-semibold text-slate-700 py-2 pl-3.5 pr-8 rounded-xl shadow-xs hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0094eb]/20 cursor-pointer"
            >
              <option value="todos">Todos os status</option>
              <option value="aprovados">Aprovados</option>
              <option value="pendentes">Pendentes</option>
              <option value="bloqueados">Bloqueados</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* CARDS DE RESUMO */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Total Recebidos</span>
            <p className="text-2xl font-bold text-slate-800">0</p>
            <p className="text-xs text-slate-400">Em todos os vídeos ativos</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-[#0094eb] flex items-center justify-center border border-sky-100 flex-shrink-0">
            <MessageCircle className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Aprovados</span>
            <p className="text-2xl font-bold text-emerald-500">0</p>
            <p className="text-xs text-slate-400">Visíveis para o público</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center border border-emerald-100 flex-shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Moderação Automática</span>
            <p className="text-2xl font-bold text-slate-800">Ativa</p>
            <p className="text-xs text-slate-400">Filtro anti-spam ligado</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 flex-shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* BARRA DE BUSCA */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Buscar por comentário, cliente ou vídeo..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full bg-white border border-slate-200 text-xs text-slate-700 py-3 pl-10 pr-4 rounded-xl shadow-xs focus:outline-none focus:ring-2 focus:ring-[#0094eb]/20"
        />
      </div>

      {/* EMPTY STATE PADRÃO RESULTADOS */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-16 text-center space-y-3">
        <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 mx-auto">
          <MessageCircle className="w-8 h-8" />
        </div>
        <h4 className="text-sm font-bold text-slate-700">Nenhum comentário para exibir</h4>
        <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
          Os comentários e perguntas deixados pelos visitantes durante os Stories serão listados aqui para aprovação e resposta rápida.
        </p>
      </div>
    </div>
  );
}
