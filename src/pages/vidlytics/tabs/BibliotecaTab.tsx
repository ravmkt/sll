import React, { useState, useRef } from 'react';
import { 
  Upload, 
  ExternalLink, 
  Search, 
  Filter, 
  Trash2, 
  MoreVertical, 
  Play, 
  Clock, 
  Eye, 
  CheckCircle2, 
  AlertCircle,
  Video,
  Image as ImageIcon,
  FolderPlus
} from 'lucide-react';
import AddVideoUrlModal from '../components/AddVideoUrlModal';

interface MediaItem {
  id: string;
  title: string;
  url: string;
  thumbnail?: string;
  type: 'video' | 'image';
  duration?: string;
  views?: number;
  createdAt: string;
  source: 'upload' | 'external';
}

export const BibliotecaTab: React.FC = () => {
  const [filterType, setFilterType] = useState<'all' | 'video' | 'image'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lista mockada/inicial para testes visuais enquanto sincroniza com o banco
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const isVideo = file.type.startsWith('video');
      const newMedia: MediaItem = {
        id: Date.now().toString(),
        title: file.name,
        url: URL.createObjectURL(file),
        type: isVideo ? 'video' : 'image',
        createdAt: new Date().toLocaleDateString('pt-BR'),
        source: 'upload'
      };
      setMediaList(prev => [newMedia, ...prev]);
    }
  };

  const handleVideoAdded = (videoData: any) => {
    const newMedia: MediaItem = {
      id: Date.now().toString(),
      title: videoData.title || 'Vídeo Externo',
      url: videoData.url,
      thumbnail: videoData.thumbnail,
      type: 'video',
      createdAt: new Date().toLocaleDateString('pt-BR'),
      source: 'external'
    };
    setMediaList(prev => [newMedia, ...prev]);
    setIsUrlModalOpen(false);
  };

  const filteredMedia = mediaList.filter(item => {
    const matchesType = filterType === 'all' || item.type === filterType;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Input de Arquivo Oculto */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="video/*,image/*" 
        className="hidden" 
      />

      {/* Header com Ações */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Biblioteca de Mídias</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Gerencie os vídeos e criativos importados para os seus widgets e stories.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Botão URL EXTERNA */}
          <button
            type="button"
            onClick={() => setIsUrlModalOpen(true)}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium text-sm transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <ExternalLink className="w-4 h-4 text-[#0094eb]" />
            <span>URL EXTERNA</span>
          </button>

          {/* Botão FAZER UPLOAD */}
          <button
            type="button"
            onClick={handleUploadClick}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0094eb] hover:bg-[#007cc7] text-white font-medium text-sm transition-all cursor-pointer shadow-md shadow-[#0094eb]/20 active:scale-95"
          >
            <Upload className="w-4 h-4" />
            <span>Fazer Upload</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Filtros por Tipo */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60 w-full md:w-auto">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer select-none ${
              filterType === 'all'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
            }`}
          >
            <span>Todos</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300">
              {mediaList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterType('video')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer select-none ${
              filterType === 'video'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
            }`}
          >
            <Video className="w-4 h-4 text-[#0094eb]" />
            <span>Vídeos</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterType('image')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer select-none ${
              filterType === 'image'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
            }`}
          >
            <ImageIcon className="w-4 h-4 text-[#fd8539]" />
            <span>Imagens</span>
          </button>
        </div>

        {/* Input de Busca */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por título..."
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0094eb]/30 focus:border-[#0094eb] text-slate-800 dark:text-slate-200"
          />
        </div>
      </div>

      {/* Grid de Cards ou Empty State */}
      {filteredMedia.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center">
          <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-4 text-slate-400">
            <Video className="w-8 h-8" />
          </div>
          <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-1">
            Nenhuma mídia encontrada
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6">
            Você ainda não possui vídeos ou imagens na biblioteca. Importe um link externo ou faça o upload direto.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setIsUrlModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              <ExternalLink className="w-4 h-4 text-[#0094eb]" />
              URL Externa
            </button>
            <button
              type="button"
              onClick={handleUploadClick}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0094eb] hover:bg-[#007cc7] text-white text-sm font-medium transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              Upload de Arquivo
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredMedia.map((item) => (
            <div 
              key={item.id} 
              className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden hover:shadow-lg transition-all"
            >
              <div className="aspect-[9/16] bg-slate-100 dark:bg-slate-800 relative flex items-center justify-center overflow-hidden">
                {item.type === 'video' ? (
                  item.thumbnail ? (
                    <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <video src={item.url} className="w-full h-full object-cover" />
                  )
                ) : (
                  <img src={item.url} alt={item.title} className="w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button 
                    type="button"
                    className="p-2 bg-white/90 rounded-full hover:bg-white text-slate-800 cursor-pointer transition-transform hover:scale-110"
                  >
                    <Play className="w-4 h-4 fill-current" />
                  </button>
                  <button 
                    type="button"
                    onClick={() => setMediaList(prev => prev.filter(m => m.id !== item.id))}
                    className="p-2 bg-red-600/90 rounded-full hover:bg-red-600 text-white cursor-pointer transition-transform hover:scale-110"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-3">
                <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate" title={item.title}>
                  {item.title}
                </p>
                <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400">
                  <span>{item.createdAt}</span>
                  <span className="uppercase text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                    {item.source}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Adicionar URL Externa */}
      <AddVideoUrlModal
        isOpen={isUrlModalOpen}
        onClose={() => setIsUrlModalOpen(false)}
        onSuccess={handleVideoAdded}
      />
    </div>
  );
};

export default BibliotecaTab;
