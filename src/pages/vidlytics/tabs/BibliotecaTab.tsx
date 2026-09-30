import React, { useState } from 'react';
import {
  Search,
  UploadCloud,
  ExternalLink,
  Video,
  Image as ImageIcon,
  Pencil,
  Eye,
  Download,
  Trash2,
  CheckCircle2,
  X,
  Play,
  Save
} from 'lucide-react';

interface MediaItem {
  id: string;
  name: string;
  type: 'video' | 'image';
  typeLabel: string;
  thumbnail: string;
  url: string;
  product?: {
    name: string;
    image: string;
  };
  linkedStory?: string;
  size: string;
  status: 'DISPONÍVEL' | 'PROCESSANDO' | 'ERRO';
}

export const BibliotecaTab: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'TODOS' | 'VIDEOS' | 'IMAGENS'>('TODOS');

  // Mídias cadastradas
  const [mediaList, setMediaList] = useState<MediaItem[]>([
    {
      id: '1',
      name: 'oculos-de-sol.mp4',
      type: 'video',
      typeLabel: 'VÍDEO MP4 (HOSPEDADO)',
      thumbnail: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=150&auto=format&fit=crop&q=80',
      url: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&auto=format&fit=crop&q=80',
      linkedStory: 'TESTE',
      size: '8.3 MB',
      status: 'DISPONÍVEL',
    },
    {
      id: '2',
      name: 'Criação_de_Vídeo_Fashion_Edit...',
      type: 'video',
      typeLabel: 'VÍDEO MP4 (HOSPEDADO)',
      thumbnail: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=150&auto=format&fit=crop&q=80',
      url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&auto=format&fit=crop&q=80',
      product: {
        name: 'Blusa Confort - Verd...',
        image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=100&auto=format&fit=crop&q=80'
      },
      linkedStory: 'TESTE',
      size: '2 MB',
      status: 'DISPONÍVEL',
    },
    {
      id: '3',
      name: 'LOGOTIPO_OFICIAL_LOJA.png',
      type: 'image',
      typeLabel: 'IMAGEM (HOSPEDADA)',
      thumbnail: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=150&auto=format&fit=crop&q=80',
      url: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=800&auto=format&fit=crop&q=80',
      size: '132.4 KB',
      status: 'DISPONÍVEL',
    }
  ]);

  // Estados dos modais de ações
  const [viewingMedia, setViewingMedia] = useState<MediaItem | null>(null);
  const [editingMedia, setEditingMedia] = useState<MediaItem | null>(null);
  const [editName, setEditName] = useState('');
  const [deletingMedia, setDeletingMedia] = useState<MediaItem | null>(null);

  // Ação de Download real
  const handleDownload = async (media: MediaItem) => {
    try {
      const response = await fetch(media.url || media.thumbnail);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = media.name.endsWith('.mp4') || media.name.endsWith('.png') || media.name.endsWith('.jpg')
        ? media.name
        : `${media.name}.${media.type === 'video' ? 'mp4' : 'png'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      // Fallback
      window.open(media.url || media.thumbnail, '_blank');
    }
  };

  // Ação de Iniciar Edição
  const handleStartEdit = (media: MediaItem) => {
    setEditingMedia(media);
    setEditName(media.name);
  };

  // Salvar Edição
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMedia || !editName.trim()) return;

    setMediaList((prev) =>
      prev.map((item) =>
        item.id === editingMedia.id ? { ...item, name: editName.trim() } : item
      )
    );
    setEditingMedia(null);
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

      {/* 2. BARRA DE PESQUISA E FILTROS */}
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

      {/* 3. TABELA DE MÍDIAS COM ALINHAMENTOS RIGOROSOS DE COLUNAS */}
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

                  {/* AÇÕES: GRID RIGOROSA COM COLUNAS ALINHADAS VERTICALMENTE */}
                  <td className="py-3 px-6 text-center">
                    <div className="grid grid-cols-4 w-32 mx-auto justify-items-center items-center text-slate-400">
                      {/* 1. Coluna EDITAR */}
                      {media.type === 'video' ? (
                        <button
                          type="button"
                          onClick={() => handleStartEdit(media)}
                          className="p-1.5 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar"
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
                        className="p-1.5 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Visualizar"
                      >
                        <Eye size={15} />
                      </button>

                      {/* 3. Coluna BAIXAR */}
                      <button
                        type="button"
                        onClick={() => handleDownload(media)}
                        className="p-1.5 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Baixar"
                      >
                        <Download size={15} />
                      </button>

                      {/* 4. Coluna EXCLUIR */}
                      <button
                        type="button"
                        onClick={() => setDeletingMedia(media)}
                        className="p-1.5 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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

      {/* MODAL DE VISUALIZAÇÃO */}
      {viewingMedia && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
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
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 flex flex-col items-center justify-center bg-slate-900/5 min-h-[260px]">
              {viewingMedia.type === 'video' ? (
                <div className="relative w-full max-h-[360px] rounded-xl overflow-hidden bg-black flex items-center justify-center shadow-inner">
                  <img
                    src={viewingMedia.thumbnail}
                    alt={viewingMedia.name}
                    className="w-full h-auto max-h-[360px] object-contain opacity-80"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-white/90 text-slate-900 flex items-center justify-center shadow-lg">
                      <Play size={24} className="ml-1 text-[#0094eb]" />
                    </div>
                  </div>
                </div>
              ) : (
                <img
                  src={viewingMedia.thumbnail}
                  alt={viewingMedia.name}
                  className="w-full h-auto max-h-[360px] object-contain rounded-xl shadow-sm"
                />
              )}
            </div>

            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Tamanho: <strong className="text-slate-700">{viewingMedia.size}</strong></span>
              <button
                type="button"
                onClick={() => handleDownload(viewingMedia)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0094eb] hover:bg-[#0082cf] text-white rounded-lg font-bold transition-colors"
              >
                <Download size={13} />
                <span>Baixar Arquivo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO */}
      {editingMedia && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveEdit}
            className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800">Editar Mídia</h3>
              <button
                type="button"
                onClick={() => setEditingMedia(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Nome do Arquivo
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-[#0094eb]"
                placeholder="Ex: video_promocional.mp4"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingMedia(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 bg-[#0094eb] hover:bg-[#0082cf] text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
              >
                <Save size={14} />
                <span>Salvar Alterações</span>
              </button>
            </div>
          </form>
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
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
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
