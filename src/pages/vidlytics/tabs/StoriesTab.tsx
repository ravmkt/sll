import React, { useState } from 'react';
import NewStoryModal from '../components/NewStoryModal';
import { Plus, Search, Eye, Pencil, Trash2, Send, TrendingUp, TrendingDown, Info } from 'lucide-react';

interface StoryRow {
  id: string;
  name: string;
  type: string;
  videosCount: number;
  location: string;
  views: number;
  viewsChange: number; // Porcentagem
  ctr: number;
  ctrChange: number;   // Porcentagem
  clicks: number;
  status: 'ATIVO' | 'INATIVO';
}

export default function StoriesTab() {
    const [isNewStoryOpen, setIsNewStoryOpen] = useState(false);
const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<'TODOS' | 'ATIVO' | 'INATIVO'>('TODOS');

  // Dados mockados no padrão do layout
  const stories: StoryRow[] = [
    {
      id: '1',
      name: 'Teste',
      type: 'Flutuante',
      videosCount: 2,
      location: 'Contém: /azul',
      views: 0,
      viewsChange: 0.0,
      ctr: 0.0,
      ctrChange: 0.0,
      clicks: 0,
      status: 'ATIVO',
    },
    {
      id: '2',
      name: 'Coleção Verão 2026',
      type: 'Carrossel',
      videosCount: 1,
      location: 'Todas as páginas',
      views: 1420,
      viewsChange: 15.4,
      ctr: 14.8,
      ctrChange: 2.2,
      clicks: 60,
      status: 'ATIVO',
    },
    {
      id: '3',
      name: 'Novidades Acessórios',
      type: 'Carrossel',
      videosCount: 3,
      location: 'Home',
      views: 890,
      viewsChange: -3.8,
      ctr: 9.4,
      ctrChange: -1.1,
      clicks: 34,
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

        {/* BOTÃO PADRÃO COM APENAS UM ÍCONE DE + */}
        <button onClick={() => setIsNewStoryOpen(true)} className="bg-[#0094eb] hover:bg-[#0082cf] text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer self-start sm:self-auto">
          <Plus className="w-4 h-4" />
          <span>Novo Story</span>
        </button>
      </div>

      {/* CONTAINER PRINCIPAL */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* BARRA DE FILTROS */}
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row gap-3 items-center justify-between border-b border-slate-100">
          <div className="relative w-full sm:flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nome do story..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full bg-slate-50/70 border border-slate-200/80 text-xs text-slate-700 py-2.5 pl-10 pr-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0094eb]/20"
            />
          </div>

          <div className="w-full sm:w-auto">
            <select
              value={statusFiltro}
              onChange={(e) => setStatusFiltro(e.target.value as 'TODOS' | 'ATIVO' | 'INATIVO')}
              className="w-full sm:w-44 bg-slate-50/70 border border-slate-200/80 text-xs font-semibold text-slate-600 py-2.5 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0094eb]/20 cursor-pointer"
            >
              <option value="TODOS">TODOS STATUS</option>
              <option value="ATIVO">ATIVO</option>
              <option value="INATIVO">INATIVO</option>
            </select>
          </div>
        </div>

        {/* CONTADOR */}
        <div className="px-5 py-2.5 bg-slate-50/50 border-b border-slate-100">
          <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
            {storiesFiltrados.length} {storiesFiltrados.length === 1 ? 'STORY ENCONTRADO' : 'STORIES ENCONTRADOS'}
          </span>
        </div>

        {/* TABELA */}
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
                <th className="py-3 px-5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {storiesFiltrados.map((story) => (
                <tr key={story.id} className="hover:bg-slate-50/60 transition-colors">
                  {/* Story / Nome */}
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-[#0094eb] flex-shrink-0">
                        <Send className="w-4 h-4 transform rotate-12" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-800 block text-xs">{story.name}</span>
                        <span className={`text-[10px] font-medium ${story.status === 'ATIVO' ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {story.status}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Tipo */}
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-sky-50/80 text-[#0094eb] border border-sky-100">
                      <Send className="w-3 h-3 rotate-45" />
                      {story.type}
                    </span>
                  </td>

                  {/* Vídeos */}
                  <td className="py-3.5 px-4 text-center font-semibold text-slate-700">
                    {story.videosCount}
                  </td>

                  {/* Localização */}
                  <td className="py-3.5 px-4 text-center">
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[11px] font-medium">
                      {story.location}
                    </span>
                  </td>

                  {/* Visualizações com Badge Comparativo */}
                  <td className="py-3.5 px-4 text-center">
                    <div className="inline-flex items-center justify-center gap-2">
                      <span className="font-bold text-slate-800 text-xs">
                        {story.views.toLocaleString('pt-BR')}
                      </span>
                      {story.viewsChange !== 0 && (
                        <span
                          className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                            story.viewsChange > 0
                              ? 'bg-emerald-50 text-emerald-600'
                              : 'bg-rose-50 text-rose-500'
                          }`}
                        >
                          {story.viewsChange > 0 ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          {story.viewsChange > 0 ? `+${story.viewsChange}%` : `${story.viewsChange}%`}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* CTR / Cliques com Badge Comparativo */}
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex flex-col items-center">
                      <div className="inline-flex items-center justify-center gap-1.5">
                        <span className="font-bold text-slate-800 text-xs">
                          {story.ctr.toFixed(1)}%
                        </span>
                        {story.ctrChange !== 0 && (
                          <span
                            className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                              story.ctrChange > 0
                                ? 'bg-emerald-50 text-emerald-600'
                                : 'bg-rose-50 text-rose-500'
                            }`}
                          >
                            {story.ctrChange > 0 ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : (
                              <TrendingDown className="w-3 h-3" />
                            )}
                            {story.ctrChange > 0 ? `+${story.ctrChange}%` : `${story.ctrChange}%`}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 mt-0.5">{story.clicks} cliques</span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4 text-center">
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

                  {/* Ações (Centralizadas em relação à coluna) */}
                  <td className="py-3.5 px-5 text-center">
                    <div className="flex items-center justify-center gap-1.5 text-slate-400">
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

        {/* NOTA DE RODAPÉ COMPARATIVO DE 7 DIAS */}
        <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Info className="w-4 h-4 text-[#0094eb]" />
            <span>As setas e porcentagens representam o comparativo de desempenho em relação aos <strong>últimos 7 dias</strong>.</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-semibold">
            <span className="flex items-center gap-1 text-emerald-600">
              <TrendingUp className="w-3.5 h-3.5" /> Alta
            </span>
            <span className="flex items-center gap-1 text-rose-500">
              <TrendingDown className="w-3.5 h-3.5" /> Baixa
            </span>
          </div>
        </div>
      </div>

      {/* Modal Novo Story */}
      <NewStoryModal isOpen={isNewStoryOpen} onClose={() => setIsNewStoryOpen(false)} />
    </div>
  );
}



