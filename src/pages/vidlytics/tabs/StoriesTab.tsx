import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Eye, Pencil, Trash2, Send, TrendingUp, TrendingDown, Info } from 'lucide-react';
import { useLoja } from '../../../contexts/LojaContext';
import { VidlyticsDatabaseService } from '../../../services/vidlytics/VidlyticsDatabaseService';
import StoryDetailsView from '../components/StoryDetailsView';

interface StoryRow {
  id: string;
  name: string;
  layout: string;
  videosCount: number;
  cssSelector: string;
  pages: string[];
  views: number;
  ctr: number;
  clicks: number;
  status: 'ATIVO' | 'INATIVO';
}

const layoutLabel: Record<string, string> = {
  flutuante: 'Flutuante',
  carrossel: 'Carrossel',
  grade: 'Grade',
  dinamico: 'Carrossel Dinâmico',
  floating_widget: 'Flutuante',
  carousel: 'Carrossel',
  grid: 'Grade',
  dynamic_carousel: 'Carrossel Dinâmico',
};

export default function StoriesTab() {
  const { storeId } = useLoja();
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<'TODOS' | 'ATIVO' | 'INATIVO'>('TODOS');
  const [stories, setStories] = useState<StoryRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Controle de Visualização: Listagem vs Tela de Detalhes
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [editingStoryId, setEditingStoryId] = useState<string | null>(null);

  const loadStories = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const data = await VidlyticsDatabaseService.getStories(storeId);
      const mapped: StoryRow[] = data.map((s: any) => ({
        id: s.id,
        name: s.name || s.title || 'Sem título',
        layout: layoutLabel[s.layout] || layoutLabel[s.format] || s.layout || 'Carrossel',
        videosCount: s.videosCount || (s.video_ids ? s.video_ids.length : 0),
        cssSelector: s.cssSelector || s.selector || '—',
        pages: s.pages || (s.page_rules ? s.page_rules.map((r: any) => r.condition_type) : []),
        views: s.views || 0,
        ctr: s.ctr || 0,
        clicks: s.clicks || 0,
        status: s.status === 'active' || s.active === true ? 'ATIVO' : 'INATIVO',
      }));
      setStories(mapped);
    } catch (err) {
      console.error('Erro ao buscar stories:', err);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    loadStories();
  }, [loadStories]);

  const handleEdit = (storyId: string) => {
    setEditingStoryId(storyId);
    setIsDetailsOpen(true);
  };

  const handleNewStory = () => {
    setEditingStoryId(null);
    setIsDetailsOpen(true);
  };

  const handleBackToList = () => {
    setIsDetailsOpen(false);
    setEditingStoryId(null);
  };

  const handleSaved = async () => {
    setIsDetailsOpen(false);
    setEditingStoryId(null);
    await loadStories();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir o Story "${name}"?`)) return;
    try {
      await VidlyticsDatabaseService.deleteStory(storeId, id);
      await loadStories();
    } catch (err) {
      console.error('Erro ao excluir story:', err);
      alert('Erro ao excluir story.');
    }
  };

  const filtered = stories.filter((s) => {
    const matchBusca = s.name.toLowerCase().includes(busca.toLowerCase());
    const matchStatus = statusFiltro === 'TODOS' || s.status === statusFiltro;
    return matchBusca && matchStatus;
  });

  // Se o usuário clicou em Novo Story ou Editar, exibe a tela idêntica ao Print 1
  if (isDetailsOpen) {
    return (
      <StoryDetailsView
        storyId={editingStoryId}
        onBack={handleBackToList}
        onSaved={handleSaved}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Stories</h2>
          <p className="text-sm text-slate-500">
            Gerencie as réguas de Stories exibidas em sua loja virtual
          </p>
        </div>
        <button
          onClick={handleNewStory}
          className="flex items-center gap-2 rounded-xl bg-[#0094EB] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0080cb] transition"
        >
          <Plus size={18} />
          Novo Story
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome do story..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm outline-none focus:border-[#0094EB] focus:bg-white transition"
          />
        </div>
        <div className="flex gap-2">
          {(['TODOS', 'ATIVO', 'INATIVO'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFiltro(status)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                statusFiltro === status
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela de Stories */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="border-b border-slate-100 bg-slate-50/75 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-4">Story</th>
                <th className="px-6 py-4">Layout</th>
                <th className="px-6 py-4">Vídeos</th>
                <th className="px-6 py-4">Seletor CSS</th>
                <th className="px-6 py-4">Páginas</th>
                <th className="px-6 py-4 text-center">Visualizações</th>
                <th className="px-6 py-4 text-center">CTR / Cliques</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Carregando stories...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Nenhum story encontrado.
                  </td>
                </tr>
              ) : (
                filtered.map((story) => (
                  <tr key={story.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4 font-semibold text-slate-800">{story.name}</td>
                    <td className="px-6 py-4">
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                        {story.layout}
                      </span>
                    </td>
                    <td className="px-6 py-4">{story.videosCount} vídeos</td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">
                      {story.cssSelector}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {story.pages.length > 0 ? story.pages.join(', ') : 'Todas as páginas'}
                    </td>
                    <td className="px-6 py-4 text-center font-medium">{story.views}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-semibold text-slate-800">{story.ctr}%</span>
                      <span className="text-xs text-slate-400"> ({story.clicks})</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          story.status === 'ATIVO'
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {story.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(story.id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                          title="Editar Story"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(story.id, story.name)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                          title="Excluir Story"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
