import React, { useState } from 'react';
import { Plus, Search, Eye, Pencil, Trash2, Send } from 'lucide-react';

interface StoryItem {
  id: string;
  name: string;
  thumbnail: string;
  type: string;
  videosCount: number;
  location: string;
  views: number;
  ctr: number;
  clicks: number;
  status: 'ATIVO' | 'INATIVO';
}

export default function StoriesTab() {
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<'TODOS' | 'ATIVO' | 'INATIVO'>('TODOS');

  // Dados mockados fiéis ao padrão
  const stories: StoryItem[] = [
    {
      id: '1',
      name: 'TESTE',
      thumbnail: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=200&auto=format&fit=crop&q=80',
      type: 'Flutuante',
      videosCount: 2,
      location: 'Contém: /azul',
      views: 0,
      ctr: 0.0,
      clicks: 0,
      status: 'ATIVO',
    },
    {
      id: '2',
      name: 'Coleção Verão 2026',
      thumbnail: 'https://images.unsplash.com/photo-1508296695146-257a814070b4?w=200&auto=format&fit=crop&q=80',
      type: 'Carrossel',
      videosCount: 1,
      location: 'Todas as páginas',
      views: 1240,
      ctr: 4.8,
      clicks: 60,
      status: 'ATIVO',
    }
  ];

  const storiesFiltrados = stories.filter((story) => {
    const matchBusca = story.name.toLowerCase().includes(busca.toLowerCase());
    const matchStatus = statusFiltro === 'TODOS' || story.status === statusFiltro;
    return matchBusca && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* CABEÇALHO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Stories</h2>
          <p className="text-xs text-slate-500 mt-1">
            Gerencie as configurações de exibição e agrupamento de vídeos na sua loja.
          </p>
        </div>

        <button className="bg-[#0094eb] hover:bg-[#0082cf] text-white font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer self-start sm:self-auto">
          <Plus className="w-4 h-4" />
          <span>Novo Story</span>
        </button>
      </div>

      {/* CARD PRINCIPAL COM FILTROS E TABELA */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* BARRA DE PESQUISA E FILTRO */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nome do story..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full bg-slate-50/70 border border-slate-200/80 text-xs text-slate-700 py-2.5 pl-10 pr-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0094eb]/20 focus:bg-white transition-all placeholder:text-slate-400"
            />
          </div>

          <div className="w-full sm:w-auto">
            <select
              value={statusFiltro}
              onChange={(e) => setStatusFiltro(e.target.value as any)}
              className="w-full sm:w-44 bg-slate-50/70 border border-slate-200/80 text-xs font-semibold text-slate-600 py-2.5 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0094eb]/20 cursor-pointer"
            >
              <option value="TODOS">TODOS STATUS</option>
              <option value="ATIVO">ATIVO</option>
              <option value="INATIVO">INATIVO</option>
            </select>
          </div>
        </div>

        {/* CONTADOR DE ITENS */}
        <div className="px-5 py-2.5 bg-slate-50/50 border-b border-slate-100">
          <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
            {storiesFiltrados.length} {storiesFiltrados.length === 1 ? 'STORY ENCONTRADO' : 'STORIES ENCONTRADOS'}
          </span>
        </div>

        {/* TABELA DE STORIES */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-white text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                <th className="py-3 px-5">Story / Nome</th>
                <th className="py-3 px-4 text-center">Tipo</th>
                <th className="py-3 px-4 text-center">Vídeos</th>
                <th className="py-3 px-4 text-center">Localização</th>
                <th className="py-3 px-4 text-center">Visualizações</th>
                <th className="py-3 px-4 text-center">CTR / Cliques</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {storiesFiltrados.map((story) => (
                <tr key={story.id} className="hover:bg-slate-50/60 transition-colors">
                  {/* STORY / NOME */}
                  <td className="py-3 px-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-[#0094eb] flex-shrink-0">
                        <Send className="w-4 h-4 transform rotate-12" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-800 block text-xs tracking-tight">
                          {story.name}
                        </span>
                        <span className="text-[10px] font-medium text-emerald-600">
                          {story.status === 'ATIVO' ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* TIPO */}
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-sky-50/80 text-[#0094eb] border border-sky-100">
                      <Send className="w-3 h-3 rotate-45" />
                      {story.type}
                    </span>
                  </td>

                  {/* VÍDEOS */}
                  <td className="py-3 px-4 text-center font-semibold text-slate-700">
                    {story.videosCount}
                  </td>

                  {/* LOCALIZAÇÃO */}
                  <td className="py-3 px-4 text-center">
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[11px] font-medium">
                      {story.location}
                    </span>
                  </td>

                  {/* VISUALIZAÇÕES */}
                  <td className="py-3 px-4 text-center font-bold text-slate-800">
                    {story.views.toLocaleString('pt-BR')}
                  </td>

                  {/* CTR / CLIQUES */}
                  <td className="py-3 px-4 text-center">
                    <div>
                      <span className="font-bold text-rose-500 block text-xs">
                        {story.ctr.toFixed(1)}%
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {story.clicks} cliques
                      </span>
                    </div>
                  </td>

                  {/* STATUS */}
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase ${
                        story.status === 'ATIVO'
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}
                    >
                      {story.status}
                    </span>
                  </td>

                  {/* AÇÕES */}
                  <td className="py-3 px-5 text-right">
                    <div className="flex items-center justify-end gap-1.5 text-slate-400">
                      <button
                        title="Visualizar"
                        className="p-1.5 hover:text-[#0094eb] hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        title="Editar"
                        className="p-1.5 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        title="Excluir"
                        className="p-1.5 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {storiesFiltrados.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-slate-400">
                    Nenhum story encontrado com os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
