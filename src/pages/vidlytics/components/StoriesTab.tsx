import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Eye, 
  Edit2, 
  Trash2, 
  ArrowLeft, 
  Send, 
  Layout, 
  Grid, 
  Film, 
  MousePointer, 
  ExternalLink,
  Save,
  CheckCircle2,
  Layers
} from 'lucide-react';

interface StoryItem {
  id: string;
  name: string;
  type: 'flutuante' | 'carrossel' | 'grade' | 'carrossel_dinamico';
  videos_count: number;
  location: string;
  views: number;
  ctr: number;
  clicks: number;
  status: 'ativo' | 'inativo';
}

export const StoriesTab: React.FC = () => {
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'edit'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Estado do formulário de criação/edição
  const [formData, setFormData] = useState({
    name: '',
    status: true,
    layout: 'carrossel',
    scrollDirection: 'horizontal',
    visualStyle: 'default',
    cssSelector: '.breadcrumbs',
    position: 'above',
    urls: [] as string[]
  });

  // Mock inicial espelhando os dados do print
  const [stories, setStories] = useState<StoryItem[]>([
    {
      id: '1',
      name: 'TESTE',
      type: 'flutuante',
      videos_count: 2,
      location: 'Contém: /azul',
      views: 0,
      ctr: 0.0,
      clicks: 0,
      status: 'ativo'
    }
  ]);

  const handleOpenCreate = () => {
    setFormData({
      name: '',
      status: true,
      layout: 'carrossel',
      scrollDirection: 'horizontal',
      visualStyle: 'default',
      cssSelector: '.breadcrumbs',
      position: 'above',
      urls: []
    });
    setViewMode('create');
  };

  const handleSave = () => {
    if (viewMode === 'create') {
      const newStory: StoryItem = {
        id: String(Date.now()),
        name: formData.name || 'Novo Story',
        type: formData.layout as any,
        videos_count: 0,
        location: 'Todas as páginas',
        views: 0,
        ctr: 0.0,
        clicks: 0,
        status: formData.status ? 'ativo' : 'inativo'
      };
      setStories([newStory, ...stories]);
    }
    setViewMode('list');
  };

  // ==================== TELA 2: FORMULÁRIO DE CRIAÇÃO / EDIÇÃO ====================
  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <div className="w-full max-w-7xl mx-auto space-y-6 pb-16 animate-fadeIn">
        {/* Cabeçalho do Formulário */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setViewMode('list')}
              className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-600"
              title="Voltar para a lista"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Novo Story</h1>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">CRIAR NOVO STORY</p>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            {/* Toggle Status */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 tracking-wider">STATUS:</span>
              <button 
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, status: !prev.status }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  formData.status ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
              >
                <span 
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.status ? 'translate-x-6' : 'translate-x-1'
                  }`} 
                />
              </button>
              <span className={`text-xs font-bold ${formData.status ? 'text-emerald-600' : 'text-slate-400'}`}>
                {formData.status ? 'ATIVO' : 'INATIVO'}
              </span>
            </div>

            {/* Aviso Preview */}
            <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
              <Save className="w-3.5 h-3.5" />
              SALVE PARA HABILITAR O PREVIEW
            </div>

            {/* Botão Salvar Topo */}
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#0094eb] hover:bg-[#0082cf] text-white font-medium text-sm rounded-lg shadow-sm transition-all"
            >
              <Save className="w-4 h-4" />
              Salvar Alterações
            </button>
          </div>
        </div>

        {/* 1. Card Design e Formato */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-base border-b border-slate-100 pb-3">
            <Layout className="w-5 h-5 text-[#0094eb]" />
            <h2>DESIGN E FORMATO</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                NOME DO STORY
              </label>
              <input
                type="text"
                placeholder="Ex: Lançamentos"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0094eb]/20 focus:border-[#0094eb] text-sm text-slate-700 bg-slate-50/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                LAYOUT DE EXIBIÇÃO
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Flutuante */}
                <div 
                  onClick={() => setFormData({ ...formData, layout: 'flutuante' })}
                  className={`cursor-pointer rounded-xl border-2 p-5 flex flex-col items-center justify-center text-center gap-3 transition-all ${
                    formData.layout === 'flutuante' 
                      ? 'border-[#0094eb] bg-sky-50/20 shadow-sm' 
                      : 'border-slate-100 hover:border-slate-200 bg-white'
                  }`}
                >
                  <Send className={`w-6 h-6 ${formData.layout === 'flutuante' ? 'text-[#0094eb]' : 'text-slate-400'}`} />
                  <span className={`text-xs font-bold uppercase tracking-wider ${formData.layout === 'flutuante' ? 'text-[#0094eb]' : 'text-slate-600'}`}>
                    FLUTUANTE
                  </span>
                </div>

                {/* Carrossel */}
                <div 
                  onClick={() => setFormData({ ...formData, layout: 'carrossel' })}
                  className={`cursor-pointer rounded-xl border-2 p-5 flex flex-col items-center justify-center text-center gap-3 transition-all ${
                    formData.layout === 'carrossel' 
                      ? 'border-[#0094eb] bg-sky-50/20 shadow-sm' 
                      : 'border-slate-100 hover:border-slate-200 bg-white'
                  }`}
                >
                  <Layout className={`w-6 h-6 ${formData.layout === 'carrossel' ? 'text-[#0094eb]' : 'text-slate-400'}`} />
                  <span className={`text-xs font-bold uppercase tracking-wider ${formData.layout === 'carrossel' ? 'text-[#0094eb]' : 'text-slate-600'}`}>
                    CARROSSEL
                  </span>
                </div>

                {/* Grade */}
                <div 
                  onClick={() => setFormData({ ...formData, layout: 'grade' })}
                  className={`cursor-pointer rounded-xl border-2 p-5 flex flex-col items-center justify-center text-center gap-3 transition-all ${
                    formData.layout === 'grade' 
                      ? 'border-[#0094eb] bg-sky-50/20 shadow-sm' 
                      : 'border-slate-100 hover:border-slate-200 bg-white'
                  }`}
                >
                  <Grid className={`w-6 h-6 ${formData.layout === 'grade' ? 'text-[#0094eb]' : 'text-slate-400'}`} />
                  <span className={`text-xs font-bold uppercase tracking-wider ${formData.layout === 'grade' ? 'text-[#0094eb]' : 'text-slate-600'}`}>
                    GRADE
                  </span>
                </div>

                {/* Carrossel Dinâmico */}
                <div 
                  onClick={() => setFormData({ ...formData, layout: 'carrossel_dinamico' })}
                  className={`cursor-pointer rounded-xl border-2 p-5 flex flex-col items-center justify-center text-center gap-2 transition-all ${
                    formData.layout === 'carrossel_dinamico' 
                      ? 'border-[#0094eb] bg-sky-50/20 shadow-sm' 
                      : 'border-slate-100 hover:border-slate-200 bg-white'
                  }`}
                >
                  <Layers className={`w-6 h-6 ${formData.layout === 'carrossel_dinamico' ? 'text-[#0094eb]' : 'text-slate-400'}`} />
                  <span className={`text-xs font-bold uppercase tracking-wider ${formData.layout === 'carrossel_dinamico' ? 'text-[#0094eb]' : 'text-slate-600'}`}>
                    CARROSSEL DINÂMICO
                  </span>
                  <span className="text-[10px] text-slate-400">Adicione 3 vídeos</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  DIREÇÃO DE ROLAGEM
                </label>
                <select 
                  value={formData.scrollDirection}
                  onChange={(e) => setFormData({ ...formData, scrollDirection: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0094eb]/20 focus:border-[#0094eb] text-sm text-slate-700 bg-white"
                >
                  <option value="horizontal">Horizontal</option>
                  <option value="vertical">Vertical</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  ESTILO VISUAL / APARÊNCIA
                </label>
                <select 
                  value={formData.visualStyle}
                  onChange={(e) => setFormData({ ...formData, visualStyle: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0094eb]/20 focus:border-[#0094eb] text-sm text-slate-700 bg-white"
                >
                  <option value="default">Seguir Padrão do App</option>
                  <option value="custom">Personalizado</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Card Conteúdo Selecionado */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-base">
              <Film className="w-5 h-5 text-[#0094eb]" />
              <h2>CONTEÚDO SELECIONADO</h2>
            </div>
            <button 
              type="button"
              className="flex items-center gap-1.5 px-4 py-2 bg-[#0094eb] hover:bg-[#0082cf] text-white text-xs font-bold rounded-lg shadow-sm transition-all uppercase tracking-wider"
            >
              <Plus className="w-3.5 h-3.5" />
              ADICIONAR VÍDEOS
            </button>
          </div>

          <div className="border-2 border-dashed border-slate-200 rounded-xl p-10 flex flex-col items-center justify-center text-center space-y-3 bg-slate-50/50">
            <Film className="w-10 h-10 text-slate-300" />
            <span className="text-sm font-medium text-slate-400">Nenhum vídeo selecionado</span>
            <button 
              type="button"
              className="flex items-center gap-1.5 px-5 py-2.5 bg-[#0094eb] hover:bg-[#0082cf] text-white text-xs font-bold rounded-lg shadow-sm transition-all uppercase tracking-wider mt-2"
            >
              <Plus className="w-3.5 h-3.5" />
              ADICIONAR VÍDEOS
            </button>
          </div>
        </div>

        {/* 3. Card Local de Exibição */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-base border-b border-slate-100 pb-3">
            <MousePointer className="w-5 h-5 text-[#0094eb]" />
            <h2>LOCAL DE EXIBIÇÃO</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                SELETOR CSS
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={formData.cssSelector}
                  onChange={(e) => setFormData({ ...formData, cssSelector: e.target.value })}
                  placeholder=".breadcrumbs"
                  className="w-full pl-4 pr-28 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0094eb]/20 focus:border-[#0094eb] text-sm text-slate-700 bg-slate-50/50"
                />
                <button
                  type="button"
                  className="absolute right-2 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold text-[#0094eb] flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <MousePointer className="w-3 h-3 text-[#0094eb]" />
                  Selecionar
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                POSIÇÃO
              </label>
              <select 
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0094eb]/20 focus:border-[#0094eb] text-sm text-slate-700 bg-white"
              >
                <option value="above">Acima do elemento</option>
                <option value="below">Abaixo do elemento</option>
                <option value="inside_start">No início do elemento</option>
                <option value="inside_end">No final do elemento</option>
              </select>
            </div>
          </div>
        </div>

        {/* 4. Card Qual Página Irá Aparecer? */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-base">
            <ExternalLink className="w-5 h-5 text-[#0094eb]" />
            <h2>QUAL PÁGINA IRÁ APARECER?</h2>
          </div>
          <div>
            <button
              type="button"
              className="flex items-center gap-2 px-4 py-2.5 bg-[#0094eb] hover:bg-[#0082cf] text-white text-xs font-bold rounded-lg shadow-sm transition-all uppercase tracking-wider"
            >
              <Plus className="w-4 h-4" />
              ADICIONAR PÁGINA
            </button>
          </div>
        </div>

        {/* Botão Salvar Rodapé */}
        <div className="flex justify-end pt-2">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-3 bg-[#0094eb] hover:bg-[#0082cf] text-white font-semibold text-sm rounded-xl shadow-md transition-all"
          >
            <Save className="w-4 h-4" />
            Salvar Alterações
          </button>
        </div>
      </div>
    );
  }

  // ==================== TELA 1: LISTAGEM DE STORIES ====================
  const filteredStories = stories.filter(story => {
    const matchesSearch = story.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || story.status.toUpperCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-fadeIn pb-12">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Stories</h1>
          <p className="text-sm text-slate-500 mt-1">
            Gerencie as configurações de exibição e agrupamento de vídeos na sua loja.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#0094eb] hover:bg-[#0082cf] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          NOVO STORY
        </button>
      </div>

      {/* Card da Listagem */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Barra de Filtros */}
        <div className="p-5 flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome do story..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0094eb]/20 focus:border-[#0094eb] text-sm text-slate-700 placeholder-slate-400"
            />
          </div>

          <div className="w-full md:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full md:w-48 px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0094eb]/20 focus:border-[#0094eb] text-xs font-bold uppercase tracking-wider text-slate-600 bg-white"
            >
              <option value="ALL">TODOS STATUS</option>
              <option value="ATIVO">ATIVO</option>
              <option value="INATIVO">INATIVO</option>
            </select>
          </div>
        </div>

        {/* Faixa de Contagem */}
        <div className="bg-slate-50/80 px-6 py-2.5 border-y border-slate-100">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {filteredStories.length} STORY ENCONTRADO{filteredStories.length === 1 ? '' : 'S'}
          </span>
        </div>

        {/* Tabela de Stories */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-6">STORY / NOME</th>
                <th className="py-4 px-4 text-center">TIPO</th>
                <th className="py-4 px-4 text-center">VÍDEOS</th>
                <th className="py-4 px-4 text-center">LOCALIZAÇÃO</th>
                <th className="py-4 px-4 text-center">VISUALIZAÇÕES</th>
                <th className="py-4 px-4 text-center">CTR / CLIQUES</th>
                <th className="py-4 px-4 text-center">STATUS</th>
                <th className="py-4 px-6 text-center">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredStories.map((story) => (
                <tr key={story.id} className="hover:bg-slate-50/60 transition-colors group">
                  {/* Nome e Ícone */}
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-sky-50 text-[#0094eb] flex items-center justify-center flex-shrink-0">
                        <Send className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block font-bold text-slate-800 text-sm tracking-tight">
                          {story.name}
                        </span>
                        <span className="text-xs text-emerald-600 font-medium">
                          {story.status === 'ativo' ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Tipo */}
                  <td className="py-4 px-4 text-center">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-sky-50 text-[#0094eb] border border-sky-100">
                      <Send className="w-3 h-3" />
                      {story.type.charAt(0).toUpperCase() + story.type.slice(1)}
                    </span>
                  </td>

                  {/* Vídeos */}
                  <td className="py-4 px-4 text-center font-semibold text-slate-700">
                    {story.videos_count}
                  </td>

                  {/* Localização */}
                  <td className="py-4 px-4 text-center">
                    <span className="inline-block px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600">
                      {story.location}
                    </span>
                  </td>

                  {/* Visualizações */}
                  <td className="py-4 px-4 text-center font-medium text-slate-700">
                    {story.views}
                  </td>

                  {/* CTR / Cliques */}
                  <td className="py-4 px-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-rose-50 text-rose-500">
                        {story.ctr.toFixed(1)}%
                      </span>
                      <span className="text-[11px] text-slate-400 mt-0.5">
                        {story.clicks} cliques
                      </span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-4 px-4 text-center">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      story.status === 'ativo' 
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}>
                      {story.status}
                    </span>
                  </td>

                  {/* Ações */}
                  <td className="py-4 px-6 text-center">
                    <div className="flex items-center justify-center gap-2 text-slate-400">
                      <button 
                        className="p-1.5 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
                        title="Pré-visualizar"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => {
                          setFormData({
                            name: story.name,
                            status: story.status === 'ativo',
                            layout: story.type,
                            scrollDirection: 'horizontal',
                            visualStyle: 'default',
                            cssSelector: '.breadcrumbs',
                            position: 'above',
                            urls: []
                          });
                          setViewMode('edit');
                        }}
                        className="p-1.5 hover:text-[#0094eb] rounded-md hover:bg-slate-100 transition-colors"
                        title="Editar Story"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setStories(stories.filter(s => s.id !== story.id))}
                        className="p-1.5 hover:text-rose-500 rounded-md hover:bg-slate-100 transition-colors"
                        title="Excluir Story"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
