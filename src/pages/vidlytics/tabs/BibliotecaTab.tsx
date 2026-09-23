import React, { useState } from 'react';
import { 
  Film, UploadCloud, Search, Plus, Trash2, 
  Play, Eye, Clock, CheckCircle2, ChevronDown
} from 'lucide-react';

export default function BibliotecaTab() {
  const [busca, setBusca] = useState('');

  return (
    <div className="space-y-6">
      {/* CABEÇALHO PADRÃO RESULTADOS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Biblioteca de Vídeos</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Gerencie o acervo de vídeos verticais enviados para uso nos seus <strong className="text-[#0094eb] font-semibold">Stories e Produtos</strong>.
          </p>
        </div>

        <button className="bg-[#0094eb] hover:bg-sky-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs flex items-center gap-2 flex-shrink-0 self-start sm:self-auto cursor-pointer">
          <UploadCloud className="w-4 h-4" />
          <span>Enviar Novo Vídeo</span>
        </button>
      </div>

      {/* CARDS DE RESUMO */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Total de Vídeos</span>
            <p className="text-2xl font-bold text-slate-800">2</p>
            <p className="text-xs text-slate-400">Vídeos vertical 9:16</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-[#0094eb] flex items-center justify-center border border-sky-100 flex-shrink-0">
            <Film className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Vídeos em Uso</span>
            <p className="text-2xl font-bold text-emerald-500">2</p>
            <p className="text-xs text-slate-400">Vinculados a Stories ativos</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center border border-emerald-100 flex-shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Espaço Utilizado</span>
            <p className="text-2xl font-bold text-slate-800">18.4 MB</p>
            <p className="text-xs text-slate-400">Armazenamento em nuvem</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 flex-shrink-0">
            <Clock className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* BUSCA */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Buscar por nome do arquivo ou título..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full bg-white border border-slate-200 text-xs text-slate-700 py-3 pl-10 pr-4 rounded-xl shadow-xs focus:outline-none focus:ring-2 focus:ring-[#0094eb]/20"
        />
      </div>

      {/* LISTA / GRID DE VÍDEOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card Vídeo 1 */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden group">
          <div className="relative aspect-[9/16] bg-slate-900 overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1508296695146-257a814070b4?w=600&auto=format&fit=crop&q=80"
              alt="oculos-de-sol.mp4"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors"></div>
            <span className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded-md">
              0:15
            </span>
          </div>
          <div className="p-3.5 space-y-1">
            <p className="text-xs font-bold text-slate-800 truncate">oculos-de-sol.mp4</p>
            <p className="text-[10px] text-slate-400">Ativo • 8.2 MB</p>
          </div>
        </div>

        {/* Card Vídeo 2 */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden group">
          <div className="relative aspect-[9/16] bg-slate-900 overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&auto=format&fit=crop&q=80"
              alt="Criação_de_Vídeo_Fashion_..."
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors"></div>
            <span className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded-md">
              0:20
            </span>
          </div>
          <div className="p-3.5 space-y-1">
            <p className="text-xs font-bold text-slate-800 truncate">Criação_de_Vídeo_Fashion_...</p>
            <p className="text-[10px] text-slate-400">Ativo • 10.2 MB</p>
          </div>
        </div>
      </div>
    </div>
  );
}
