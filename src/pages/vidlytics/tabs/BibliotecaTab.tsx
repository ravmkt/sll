import React, { useState } from 'react';
import { 
  Search, 
  UploadCloud, 
  Instagram, 
  ExternalLink, 
  HardDrive, 
  Video, 
  Image as ImageIcon, 
  Pencil, 
  Eye, 
  Download, 
  Trash2,
  CheckCircle2
} from 'lucide-react';

interface MediaItem {
  id: string;
  name: string;
  type: 'video' | 'image';
  typeLabel: string;
  thumbnail: string;
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

  // Dados mockados fiéis ao exemplo da imagem
  const [mediaList] = useState<MediaItem[]>([
    {
      id: '1',
      name: 'oculos-de-sol.mp4',
      type: 'video',
      typeLabel: 'VÍDEO MP4 (HOSPEDADO)',
      thumbnail: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=150&auto=format&fit=crop&q=80',
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
      size: '132.4 KB',
      status: 'DISPONÍVEL',
    }
  ]);

  const filteredMedia = mediaList.filter(item => {
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
            Gerencie os vídeos e imagens hospedados no seu plano e monitore o consumo de espaço.
          </p>
        </div>

        {/* Botões de Ação */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button 
            type="button" 
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-700 tracking-wider transition-colors shadow-sm"
          >
            <Instagram size={14} className="text-slate-600" />
            <span>INSTAGRAM</span>
          </button>

          <button 
            type="button" 
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-700 tracking-wider transition-colors shadow-sm"
          >
            {/* Ícone TikTok customizado */}
            <svg className="w-3.5 h-3.5 fill-current text-slate-700" viewBox="0 0 24 24">
              <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
            </svg>
            <span>TIKTOK</span>
          </button>

          <button 
            type="button" 
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-700 tracking-wider transition-colors shadow-sm"
          >
            <ExternalLink size={14} className="text-slate-600" />
            <span>URL EXTERNA</span>
          </button>

          <button 
            type="button" 
            className="flex items-center gap-2 px-4 py-2 bg-[#0094eb] hover:bg-[#0082cf] text-white rounded-xl text-xs font-bold tracking-wider transition-colors shadow-md shadow-blue-500/20"
          >
            <UploadCloud size={16} />
            <span>FAZER UPLOAD</span>
          </button>
        </div>
      </div>

      {/* 2. CARD DE CONSUMO DE ARMAZENAMENTO */}
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

      {/* 4. TABELA DE MÍDIAS */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        {/* Sub-header do card com contagem */}
        <div className="px-6 py-3.5 bg-slate-50/60 border-b border-slate-100">
          <span className="text-xs font-extrabold text-slate-700 tracking-wider">
            {filteredMedia.length} MÍDIAS LISTADAS
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 tracking-wider uppercase">
                <th className="py-3.5 px-6">MÍDIA</th>
                <th className="py-3.5 px-4">NOME DO ARQUIVO</th>
                <th className="py-3.5 px-4">PRODUTO</th>
                <th className="py-3.5 px-4">STORY VINCULADO</th>
                <th className="py-3.5 px-4">TAMANHO</th>
                <th className="py-3.5 px-4 text-center">STATUS</th>
                <th className="py-3.5 px-6 text-right">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredMedia.map((media) => (
                <tr key={media.id} className="hover:bg-slate-50/80 transition-colors">
                  {/* Mídia Thumbnail */}
                  <td className="py-3 px-6">
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
                  </td>

                  {/* Nome do Arquivo */}
                  <td className="py-3 px-4">
                    <p className="font-bold text-slate-800 text-sm truncate max-w-[240px]">
                      {media.name}
                    </p>
                    <p className="text-[11px] font-semibold text-[#0094eb] mt-0.5">
                      {media.typeLabel}
                    </p>
                  </td>

                  {/* Produto */}
                  <td className="py-3 px-4">
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
                      <span className="inline-block px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-full text-xs text-slate-400 font-medium">
                        Sem produto
                      </span>
                    )}
                  </td>

                  {/* Story Vinculado */}
                  <td className="py-3 px-4">
                    {media.linkedStory ? (
                      <span className="inline-block px-3 py-1 bg-blue-50 text-[#0094eb] text-xs font-bold rounded-full">
                        {media.linkedStory}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-bold ml-3">—</span>
                    )}
                  </td>

                  {/* Tamanho */}
                  <td className="py-3 px-4 text-xs font-semibold text-slate-600">
                    {media.size}
                  </td>

                  {/* Status */}
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-full">
                      <CheckCircle2 size={13} />
                      <span>{media.status}</span>
                    </span>
                  </td>

                  {/* Ações */}
                  <td className="py-3 px-6 text-right">
                    <div className="inline-flex items-center justify-end gap-1 text-slate-400">
                      {media.type === 'video' && (
                        <button 
                          type="button"
                          className="p-1.5 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Pencil size={15} />
                        </button>
                      )}
                      <button 
                        type="button"
                        className="p-1.5 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Visualizar"
                      >
                        <Eye size={15} />
                      </button>
                      <button 
                        type="button"
                        className="p-1.5 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Baixar"
                      >
                        <Download size={15} />
                      </button>
                      <button 
                        type="button"
                        className="p-1.5 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
    </div>
  );
};

export default BibliotecaTab;
