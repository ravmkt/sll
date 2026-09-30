import React, { useState } from 'react';
import {
  Search,
  UploadCloud,
  ExternalLink,
  HardDrive,
  Video,
  Image as ImageIcon,
  Pencil,
  Eye,
  Download,
  Trash2,
  CheckCircle2,
  X,
  ArrowLeft,
  AlertTriangle,
  Save,
  Check
} from 'lucide-react';

interface MediaItem {
  id: string;
  name: string;
  type: 'video' | 'image';
  typeLabel: string;
  thumbnail: string;
  videoUrl?: string;
  product?: {
    name: string;
    image: string;
  };
  linkedStory?: string;
  size: string;
  status: 'DISPONÍVEL' | 'PROCESSANDO' | 'ERRO';
  origin?: string;
  activeStatus?: 'Ativo' | 'Inativo';
}

export const BibliotecaTab: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'TODOS' | 'VIDEOS' | 'IMAGENS'>('TODOS');

  // Mídias cadastradas com vídeos reais funcionais (MP4)
  const [mediaList, setMediaList] = useState<MediaItem[]>([
    {
      id: '1',
      name: 'oculos-de-sol.mp4',
      type: 'video',
      typeLabel: 'VÍDEO MP4 (HOSPEDADO)',
      thumbnail: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=300&auto=format&fit=crop&q=80',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      linkedStory: 'TESTE',
      size: '8.3 MB',
      status: 'DISPONÍVEL',
      origin: 'Upload de vídeo',
      activeStatus: 'Ativo'
    },
    {
      id: '2',
      name: 'Criação_de_Vídeo_Fashion_Edit...',
      type: 'video',
      typeLabel: 'VÍDEO MP4 (HOSPEDADO)',
      thumbnail: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=300&auto=format&fit=crop&q=80',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
      product: {
        name: 'Blusa Confort - Verd...',
        image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=100&auto=format&fit=crop&q=80'
      },
      linkedStory: 'TESTE',
      size: '2 MB',
      status: 'DISPONÍVEL',
      origin: 'Upload de vídeo',
      activeStatus: 'Ativo'
    },
    {
      id: '3',
      name: 'LOGOTIPO_OFICIAL_LOJA.png',
      type: 'image',
      typeLabel: 'IMAGEM (HOSPEDADA)',
      thumbnail: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=300&auto=format&fit=crop&q=80',
      size: '132.4 KB',
      status: 'DISPONÍVEL',
      activeStatus: 'Ativo'
    }
  ]);

  // Modais e navegação interna de Edição
  const [viewingMedia, setViewingMedia] = useState<MediaItem | null>(null);
  const [editingMedia, setEditingMedia] = useState<MediaItem | null>(null);
  const [deletingMedia, setDeletingMedia] = useState<MediaItem | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Estados do formulário de edição de vídeo (Print 3)
  const [editTitle, setEditTitle] = useState('');
  const [editOrigin, setEditOrigin] = useState('Upload de vídeo');
  const [editThumbnail, setEditThumbnail] = useState('');
  const [editProduct, setEditProduct] = useState('Nenhum produto vinculado');
  const [editModel, setEditModel] = useState('Nenhum');
  const [editStatus, setEditStatus] = useState<'Ativo' | 'Inativo'>('Ativo');

  // Abrir página de Edição de Vídeo
  const handleOpenEdit = (media: MediaItem) => {
    setEditingMedia(media);
    setEditTitle(media.name);
    setEditOrigin(media.origin || 'Upload de vídeo');
    setEditThumbnail(media.thumbnail);
    setEditProduct(media.product ? media.product.name : 'Nenhum produto vinculado');
    setEditStatus(media.activeStatus || 'Ativo');
    setSaveSuccess(false);
  };

  // Salvar Edição
  const handleSaveVideoEdit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingMedia) return;

    setMediaList((prev) =>
      prev.map((item) => {
        if (item.id === editingMedia.id) {
          return {
            ...item,
            name: editTitle,
            origin: editOrigin,
            thumbnail: editThumbnail || item.thumbnail,
            activeStatus: editStatus,
            product: editProduct === 'Nenhum produto vinculado' ? undefined : item.product
          };
        }
        return item;
      })
    );

    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setEditingMedia(null);
    }, 900);
  };

  // Download real do arquivo
  const handleDownload = async (media: MediaItem) => {
    const fileUrl = media.videoUrl || media.thumbnail;
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = media.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(fileUrl, '_blank');
    }
  };

  // Confirmar Exclusão
  const handleConfirmDelete = () => {
    if (!deletingMedia) return;
    setMediaList((prev) => prev.filter((item) => item.id !== deletingMedia.id));
    setDeletingMedia(null);
  };

  const filteredMedia = mediaList.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (filterType === 'VIDEOS') return matchesSearch && item.type === 'video';
    if (filterType === 'IMAGENS') return matchesSearch && item.type === 'image';
    return matchesSearch;
  });

  // Se estiver editando um vídeo, renderiza a tela completa de "Editar Vídeo" (Print 3)
  if (editingMedia) {
    return (
      <div className="space-y-6 pb-12">
        {/* Barra superior de Ação da Edição */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setEditingMedia(null)}
            className="flex items-center gap-2 text-slate-800 hover:text-slate-600 font-bold text-lg transition-colors"
          >
            <div className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50">
              <ArrowLeft size={18} />
            </div>
            <span>Editar Vídeo</span>
          </button>

          <button
            type="button"
            onClick={() => handleSaveVideoEdit()}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#0094eb] hover:bg-[#0082cf] text-white rounded-xl text-xs font-bold tracking-wider transition-all shadow-md shadow-blue-500/20"
          >
            {saveSuccess ? (
              <>
                <Check size={16} />
                <span>SALVO COM SUCESSO!</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>SALVAR ALTERAÇÕES</span>
              </>
            )}
          </button>
        </div>

        {/* Card do Formulário de Edição */}
        <form onSubmit={handleSaveVideoEdit} className="bg-white border border-slate-100 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          {/* TÍTULO DO VÍDEO */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              TÍTULO DO VÍDEO
            </label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-[#0094eb] transition-colors"
            />
          </div>

          {/* ORIGEM DO VÍDEO */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              ORIGEM DO VÍDEO
            </label>
            <select
              value={editOrigin}
              onChange={(e) => setEditOrigin(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-[#0094eb] transition-colors"
            >
              <option value="Upload de vídeo">Upload de vídeo</option>
              <option value="Instagram">Instagram</option>
              <option value="TikTok">TikTok</option>
              <option value="URL externa">URL externa</option>
            </select>
          </div>

          {/* ARQUIVO DE VÍDEO */}
          <div className="space-y-3">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              ARQUIVO DE VÍDEO
            </label>

            {/* Alerta de tamanho */}
            <div className="flex items-center gap-2 p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-700 font-medium">
              <AlertTriangle size={15} className="shrink-0 text-amber-500" />
              <span>O arquivo de vídeo deve ter no <strong>máximo 30 MB</strong>. Formatos aceitos: MP4, MOV e WEBM.</span>
            </div>

            <div className="flex items-center gap-3">
              <label className="cursor-pointer px-4 py-2 bg-blue-50 hover:bg-blue-100 text-[#0094eb] rounded-xl text-xs font-bold transition-colors">
                Escolher arquivo
                <input type="file" accept="video/mp4,video/quicktime,video/webm" className="hidden" />
              </label>
              <span className="text-xs text-slate-400">Nenhum arquivo escolhido</span>
            </div>

            {/* Preview do Vídeo */}
            <div className="w-36 h-56 rounded-2xl overflow-hidden bg-black border border-slate-200 shadow-sm relative group">
              {editingMedia.videoUrl ? (
                <video
                  src={editingMedia.videoUrl}
                  controls
                  className="w-full h-full object-cover"
                />
              ) : (
                <img
                  src={editingMedia.thumbnail}
                  alt={editingMedia.name}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
          </div>

          {/* CAPA DO VÍDEO (THUMBNAIL) */}
          <div className="space-y-3 pt-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              CAPA DO VÍDEO (THUMBNAIL)
            </label>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-16 h-20 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0 shadow-sm">
                <img
                  src={editThumbnail || editingMedia.thumbnail}
                  alt="Capa"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 w-full space-y-2">
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer px-4 py-2 bg-blue-50 hover:bg-blue-100 text-[#0094eb] rounded-xl text-xs font-bold transition-colors">
                    Escolher arquivo
                    <input type="file" accept="image/*" className="hidden" />
                  </label>
                  <span className="text-xs text-slate-400">Nenhum arquivo escolhido</span>
                </div>

                <input
                  type="text"
                  placeholder="Ou cole a URL da capa"
                  value={editThumbnail}
                  onChange={(e) => setEditThumbnail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#0094eb]"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              JPG, PNG ou WEBP. Máx. 350 KB. Se deixado em branco, um frame do vídeo será usado automaticamente.
            </p>
          </div>

          {/* PRODUTO VINCULADO (OPCIONAL) */}
          <div className="space-y-2 pt-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              PRODUTO VINCULADO (OPCIONAL)
            </label>
            <select
              value={editProduct}
              onChange={(e) => setEditProduct(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-[#0094eb] transition-colors"
            >
              <option value="Nenhum produto vinculado">Nenhum produto vinculado</option>
              {editingMedia.product && (
                <option value={editingMedia.product.name}>{editingMedia.product.name}</option>
              )}
            </select>
          </div>

          {/* MODELO/MEDIDA VINCULADO (OPCIONAL) */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              MODELO/MEDIDA VINCULADO (OPCIONAL)
            </label>
            <select
              value={editModel}
              onChange={(e) => setEditModel(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-[#0094eb] transition-colors"
            >
              <option value="Nenhum">Nenhum</option>
              <option value="Padrão">Padrão</option>
            </select>
          </div>

          {/* STATUS */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              STATUS
            </label>
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as 'Ativo' | 'Inativo')}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-[#0094eb] transition-colors"
            >
              <option value="Ativo">Ativo</option>
              <option value="Inativo">Inativo</option>
            </select>
          </div>

          {/* USADO EM STORIES */}
          <div className="space-y-2 pt-3 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-1.5 text-slate-600">
              <span className="font-bold text-slate-700">USADO EM STORIES:</span>
              <span className="font-semibold">{editingMedia.linkedStory ? 'Sim' : 'Não'}</span>
            </div>
            {editingMedia.linkedStory && (
              <div className="space-y-1 pt-1">
                <span className="text-slate-400 font-medium">Stories vinculados:</span>
                <ul className="list-disc pl-5 text-slate-700 font-semibold">
                  <li>{editingMedia.linkedStory}</li>
                </ul>
              </div>
            )}
          </div>

          {/* BOTÃO SALVAR INFERIOR */}
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-3 bg-[#0094eb] hover:bg-[#0082cf] text-white rounded-xl text-xs font-bold tracking-wider transition-all shadow-md shadow-blue-500/20"
            >
              {saveSuccess ? (
                <>
                  <Check size={16} />
                  <span>SALVO COM SUCESSO!</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>SALVAR ALTERAÇÕES</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. CABEÇALHO */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Biblioteca</h2>
          <p className="text-sm text-slate-500 mt-1">
            Gerencie os vídeos e imagens hospedados e monitore o consumo de espaço.
          </p>
        </div>

        {/* Botões de Ação lado a lado */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-1 md:pb-0 flex-nowrap shrink-0">
          <button
            type="button"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-700 tracking-wider transition-colors shadow-sm whitespace-nowrap shrink-0"
          >
            <svg
              className="w-3.5 h-3.5 text-slate-700"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
            </svg>
            <span>INSTAGRAM</span>
          </button>

          <button
            type="button"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-700 tracking-wider transition-colors shadow-sm whitespace-nowrap shrink-0"
          >
            <svg className="w-3.5 h-3.5 fill-current text-slate-700" viewBox="0 0 24 24">
              <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
            </svg>
            <span>TIKTOK</span>
          </button>

          <button
            type="button"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-700 tracking-wider transition-colors shadow-sm whitespace-nowrap shrink-0"
          >
            <ExternalLink size={14} className="text-slate-600" />
            <span>URL EXTERNA</span>
          </button>

          <button
            type="button"
            className="flex items-center gap-2 px-4 py-2 bg-[#0094eb] hover:bg-[#0082cf] text-white rounded-xl text-xs font-bold tracking-wider transition-colors shadow-md shadow-blue-500/20 whitespace-nowrap shrink-0"
          >
            <UploadCloud size={16} />
            <span>FAZER UPLOAD</span>
          </button>
        </div>
      </div>

      {/* 2. CARD DE CONSUMO DE ARMAZENAMENTO RESTAURADO */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#0094eb] flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
              <HardDrive size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-800 text-sm tracking-wide">SCALE</span>
                <span className="px-2 py-0.5 bg-blue-50 text-[#0094eb] text-[10px] font-bold rounded-full">
                  50 GB LIMITE
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Uso atual: <strong className="text-slate-700 font-semibold">10.3 MB</strong> de 50 GB
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xl font-bold text-emerald-500">0.1%</span>
            <p className="text-[11px] text-slate-400 font-medium">Espaço Consumido</p>
          </div>
        </div>

        {/* Barra de Progresso */}
        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-[#0094eb] h-full rounded-full transition-all duration-500"
            style={{ width: '0.1%' }}
          />
        </div>
      </div>

      {/* 3. BARRA DE PESQUISA E FILTROS */}
      <div className="bg-white border border-slate-100 rounded-2xl p-2.5 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar pelo nome do arquivo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-transparent text-sm text-slate-700 placeholder-slate-400 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setFilterType('TODOS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wider transition-colors ${
              filterType === 'TODOS'
                ? 'bg-[#0094eb] text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            TODOS
          </button>

          <button
            type="button"
            onClick={() => setFilterType('VIDEOS')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold tracking-wider transition-colors ${
              filterType === 'VIDEOS'
                ? 'bg-[#0094eb] text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Video size={14} />
            <span>VÍDEOS</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterType('IMAGENS')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold tracking-wider transition-colors ${
              filterType === 'IMAGENS'
                ? 'bg-[#0094eb] text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <ImageIcon size={14} />
            <span>IMAGENS</span>
          </button>
        </div>
      </div>

      {/* 4. TABELA DE MÍDIAS COM ALINHAMENTOS RIGOROSOS DE COLUNAS */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        {/* Sub-header do card com contagem */}
        <div className="px-6 py-3.5 bg-slate-50/60 border-b border-slate-100">
          <span className="text-xs font-extrabold text-slate-700 tracking-wider">
            {filteredMedia.length} MÍDIAS LISTADAS
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 tracking-wider uppercase">
                <th className="py-3.5 px-6 text-center w-20">MÍDIA</th>
                <th className="py-3.5 px-4 text-left">NOME DO ARQUIVO</th>
                <th className="py-3.5 px-4 text-center">PRODUTO</th>
                <th className="py-3.5 px-4 text-center">STORY VINCULADO</th>
                <th className="py-3.5 px-4 text-center">TAMANHO</th>
                <th className="py-3.5 px-4 text-center">STATUS</th>
                <th className="py-3.5 px-6 text-center w-40">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredMedia.map((media) => (
                <tr key={media.id} className="hover:bg-slate-50/80 transition-colors">
                  {/* Mídia Thumbnail (Centralizado) */}
                  <td className="py-3 px-6 text-center">
                    <div className="flex justify-center">
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                        <img
                          src={media.thumbnail}
                          alt={media.name}
                          className="w-full h-full object-cover"
                        />
                        {media.type === 'video' && (
                          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                            <div className="w-5 h-5 rounded-full bg-black/40 flex items-center justify-center text-white">
                              <span className="text-[9px] font-bold">▶</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Nome do Arquivo (Alinhado à Esquerda) */}
                  <td className="py-3 px-4 text-left">
                    <p className="font-bold text-slate-800 text-sm truncate max-w-[240px]">
                      {media.name}
                    </p>
                    <p className="text-[11px] font-semibold text-[#0094eb] mt-0.5">
                      {media.typeLabel}
                    </p>
                  </td>

                  {/* Produto (Centralizado) */}
                  <td className="py-3 px-4 text-center">
                    <div className="flex justify-center items-center">
                      {media.product ? (
                        <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-full text-xs text-slate-700">
                          <img
                            src={media.product.image}
                            alt={media.product.name}
                            className="w-4 h-4 rounded-full object-cover"
                          />
                          <span className="font-medium max-w-[130px] truncate">{media.product.name}</span>
                        </div>
                      ) : (
                        <span className="inline-block px-3 py-1 bg-slate-50 border border-slate-200 rounded-full text-xs text-slate-400 font-medium">
                          Sem produto
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Story Vinculado (Centralizado) */}
                  <td className="py-3 px-4 text-center">
                    {media.linkedStory ? (
                      <span className="inline-block px-3 py-1 bg-blue-50 text-[#0094eb] text-xs font-bold rounded-full">
                        {media.linkedStory}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-bold">—</span>
                    )}
                  </td>

                  {/* Tamanho (Centralizado) */}
                  <td className="py-3 px-4 text-center text-xs font-semibold text-slate-600">
                    {media.size}
                  </td>

                  {/* Status (Centralizado) */}
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-full">
                      <CheckCircle2 size={13} />
                      <span>{media.status}</span>
                    </span>
                  </td>

                  {/* AÇÕES: GRID COM COLUNAS RIGOROSAMENTE ALINHADAS */}
                  <td className="py-3 px-6 text-center">
                    <div className="grid grid-cols-4 w-32 mx-auto justify-items-center items-center text-slate-400">
                      {/* 1. Coluna EDITAR */}
                      {media.type === 'video' ? (
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(media)}
                          className="p-1.5 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Editar Vídeo"
                        >
                          <Pencil size={15} />
                        </button>
                      ) : (
                        <div className="w-[27px] h-[27px]" />
                      )}

                      {/* 2. Coluna VISUALIZAR */}
                      <button
                        type="button"
                        onClick={() => setViewingMedia(media)}
                        className="p-1.5 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="Visualizar"
                      >
                        <Eye size={15} />
                      </button>

                      {/* 3. Coluna BAIXAR */}
                      <button
                        type="button"
                        onClick={() => handleDownload(media)}
                        className="p-1.5 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                        title="Baixar"
                      >
                        <Download size={15} />
                      </button>

                      {/* 4. Coluna EXCLUIR */}
                      <button
                        type="button"
                        onClick={() => setDeletingMedia(media)}
                        className="p-1.5 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Excluir"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE VISUALIZAÇÃO COM VÍDEO REAL HTML5 REPRODUZINDO COM SOM E CONTROLES */}
      {viewingMedia && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 text-sm truncate max-w-[280px]">
                  {viewingMedia.name}
                </span>
                <span className="px-2 py-0.5 bg-blue-50 text-[#0094eb] text-[10px] font-bold rounded-full">
                  {viewingMedia.type === 'video' ? 'VÍDEO' : 'IMAGEM'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setViewingMedia(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 flex flex-col items-center justify-center bg-black min-h-[300px]">
              {viewingMedia.type === 'video' && viewingMedia.videoUrl ? (
                <video
                  src={viewingMedia.videoUrl}
                  controls
                  autoPlay
                  playsInline
                  className="w-full max-h-[460px] rounded-xl object-contain shadow-md"
                />
              ) : (
                <img
                  src={viewingMedia.thumbnail}
                  alt={viewingMedia.name}
                  className="w-full max-h-[460px] object-contain rounded-xl shadow-md"
                />
              )}
            </div>

            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Tamanho: <strong className="text-slate-700">{viewingMedia.size}</strong></span>
              <button
                type="button"
                onClick={() => handleDownload(viewingMedia)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0094eb] hover:bg-[#0082cf] text-white rounded-lg font-bold transition-colors cursor-pointer"
              >
                <Download size={14} />
                <span>Baixar Arquivo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {deletingMedia && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Excluir Mídia</h3>
                <p className="text-xs text-slate-500 mt-0.5">Esta ação não pode ser desfeita.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
              Tem certeza que deseja excluir o arquivo <strong className="text-slate-800">{deletingMedia.name}</strong>?
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeletingMedia(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BibliotecaTab;
