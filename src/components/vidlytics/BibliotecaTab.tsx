import React, { useState } from 'react';
import { 
  UploadCloud, 
  Link as LinkIcon, 
  Instagram, 
  Video, 
  Image as ImageIcon, 
  Search, 
  HardDrive, 
  Edit3, 
  Eye, 
  Download, 
  Trash2, 
  X, 
  CheckCircle2, 
  ChevronDown 
} from 'lucide-react';

interface MediaItem {
  id: string;
  name: string;
  type: 'video' | 'image';
  typeLabel: string;
  thumbnail: string;
  productName?: string;
  productThumb?: string;
  storyLinked?: string;
  size: string;
  status: 'DISPONÍVEL';
}

export default function BibliotecaTab() {
  const [filterType, setFilterType] = useState<'todos' | 'videos' | 'imagens'>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);

  // Estados do formulário do modal
  const [videoUrl, setVideoUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedMeasurement, setSelectedMeasurement] = useState('');

  // Lista mockada fiel aos prints
  const [medias, setMedias] = useState<MediaItem[]>([
    {
      id: '1',
      name: 'oculos-de-sol.mp4',
      type: 'video',
      typeLabel: 'VÍDEO MP4 (HOSPEDADO)',
      thumbnail: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=120&auto=format&fit=crop&q=60',
      storyLinked: 'TESTE',
      size: '8.3 MB',
      status: 'DISPONÍVEL'
    },
    {
      id: '2',
      name: 'Criação_de_Vídeo_Fashion_Edit...',
      type: 'video',
      typeLabel: 'VÍDEO MP4 (HOSPEDADO)',
      thumbnail: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=120&auto=format&fit=crop&q=60',
      productName: 'Blusa Confort - Verd...',
      productThumb: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=60&auto=format&fit=crop&q=60',
      storyLinked: 'TESTE',
      size: '2 MB',
      status: 'DISPONÍVEL'
    },
    {
      id: '3',
      name: 'LOGOTIPO_OFICIAL_LOJA.png',
      type: 'image',
      typeLabel: 'IMAGEM (HOSPEDADA)',
      thumbnail: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=120&auto=format&fit=crop&q=60',
      size: '132.4 KB',
      status: 'DISPONÍVEL'
    }
  ]);

  const filteredMedias = medias.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (filterType === 'videos') return item.type === 'video';
    if (filterType === 'imagens') return item.type === 'image';
    return true;
  });

  const handleAddMediaUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrl) return;

    const newMedia: MediaItem = {
      id: Date.now().toString(),
      name: videoTitle || videoUrl.split('/').pop() || 'Novo Vídeo Externo',
      type: 'video',
      typeLabel: 'VÍDEO EXTERNO',
      thumbnail: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=120&auto=format&fit=crop&q=60',
      productName: selectedProduct ? 'Produto Vinculado' : undefined,
      size: 'Externo',
      status: 'DISPONÍVEL'
    };

    setMedias([newMedia, ...medias]);
    setIsUrlModalOpen(false);
    setVideoUrl('');
    setVideoTitle('');
    setSelectedProduct('');
    setSelectedMeasurement('');
  };

  return (
    <div className="space-y-6">
      {/* 1. HEADER DA PÁGINA */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Biblioteca</h1>
          <p className="text-xs text-slate-500 mt-1">
            Gerencie os vídeos e imagens hospedados no seu plano e monitore o consumo de espaço.
          </p>
        </div>

        {/* BOTÕES DE AÇÃO SUPERIORES */}
        <div className="flex items-center flex-wrap gap-2.5">
          <button 
            type="button" 
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-xs"
          >
            <Instagram className="w-3.5 h-3.5 text-slate-600" />
            <span>INSTAGRAM</span>
          </button>

          <button 
            type="button" 
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-xs"
          >
            <svg className="w-3.5 h-3.5 fill-current text-slate-700" viewBox="0 0 24 24">
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 3 15.68 6.34 6.34 0 0 0 9.33 22a6.33 6.33 0 0 0 6.33-6.32V8.6a8.28 8.28 0 0 0 4.84 1.55V6.7a4.77 4.77 0 0 1-.91-.01z"/>
            </svg>
            <span>TIKTOK</span>
          </button>

          <button 
            type="button" 
            onClick={() => setIsUrlModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-xs"
          >
            <LinkIcon className="w-3.5 h-3.5 text-slate-600" />
            <span>URL EXTERNA</span>
          </button>

          <button 
            type="button" 
            className="flex items-center gap-1.5 px-4 py-2 bg-[#0094eb] hover:bg-[#0082cf] text-white rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <UploadCloud className="w-4 h-4" />
            <span>FAZER UPLOAD</span>
          </button>
        </div>
      </div>

      {/* 2. CARD DE CONSUMO DE ARMAZENAMENTO */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#0094eb] flex items-center justify-center text-white shadow-sm">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900 tracking-wide">SCALE</span>
                <span className="bg-sky-100 text-[#0094eb] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  50 GB LIMITE
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Uso atual: <strong className="text-slate-800 font-semibold">10.3 MB</strong> de 50 GB
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-lg font-extrabold text-emerald-500 tracking-tight">0.1%</div>
            <div className="text-[11px] text-slate-400 font-medium">Espaço Consumido</div>
          </div>
        </div>

        {/* Barra de Progresso */}
        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-5">
          <div 
            className="bg-[#0094eb] h-full rounded-full transition-all duration-500" 
            style={{ width: '0.1%' }} 
          />
        </div>
      </div>

      {/* 3. FILTROS E BUSCA */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar pelo nome do arquivo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#0094eb] focus:ring-1 focus:ring-[#0094eb] transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setFilterType('todos')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              filterType === 'todos'
                ? 'bg-[#0094eb] text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            TODOS
          </button>
          <button
            onClick={() => setFilterType('videos')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              filterType === 'videos'
                ? 'bg-[#0094eb] text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>VÍDEOS</span>
          </button>
          <button
            onClick={() => setFilterType('imagens')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              filterType === 'imagens'
                ? 'bg-[#0094eb] text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>IMAGENS</span>
          </button>
        </div>
      </div>

      {/* 4. BARRA DE CONTAGEM */}
      <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 uppercase tracking-wider">
        {filteredMedias.length} MÍDIAS LISTADAS
      </div>

      {/* 5. TABELA DE MÍDIAS */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">MÍDIA</th>
                <th className="py-3 px-4">NOME DO ARQUIVO</th>
                <th className="py-3 px-4">PRODUTO</th>
                <th className="py-3 px-4">STORY VINCULADO</th>
                <th className="py-3 px-4">TAMANHO</th>
                <th className="py-3 px-4 text-center">STATUS</th>
                <th className="py-3 px-4 text-right">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredMedias.map((media) => (
                <tr key={media.id} className="hover:bg-slate-50/50 transition-colors">
                  {/* Mídia Thumb */}
                  <td className="py-3.5 px-4">
                    <div className="w-11 h-11 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0 relative group">
                      <img 
                        src={media.thumbnail} 
                        alt={media.name} 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                  </td>

                  {/* Nome do Arquivo */}
                  <td className="py-3.5 px-4 font-medium text-slate-800">
                    <div>
                      <p className="font-semibold text-slate-900">{media.name}</p>
                      <p className="text-[10px] font-bold text-[#0094eb] uppercase tracking-wide mt-0.5">
                        {media.typeLabel}
                      </p>
                    </div>
                  </td>

                  {/* Produto */}
                  <td className="py-3.5 px-4">
                    {media.productName ? (
                      <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-full text-[11px] text-slate-700">
                        {media.productThumb && (
                          <img 
                            src={media.productThumb} 
                            alt="" 
                            className="w-4 h-4 rounded-full object-cover" 
                          />
                        )}
                        <span className="truncate max-w-[120px]">{media.productName}</span>
                      </div>
                    ) : (
                      <span className="inline-block px-2.5 py-0.5 bg-slate-100 text-slate-400 text-[11px] font-medium rounded-full">
                        Sem produto
                      </span>
                    )}
                  </td>

                  {/* Story Vinculado */}
                  <td className="py-3.5 px-4">
                    {media.storyLinked ? (
                      <span className="inline-block px-3 py-0.5 bg-sky-50 text-[#0094eb] border border-sky-200/60 text-[10px] font-bold rounded-full uppercase tracking-wider">
                        {media.storyLinked}
                      </span>
                    ) : (
                      <span className="text-slate-300 font-medium">—</span>
                    )}
                  </td>

                  {/* Tamanho */}
                  <td className="py-3.5 px-4 text-slate-600 font-medium text-xs">
                    {media.size}
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-200/60 rounded-full text-[10px] font-bold tracking-wider uppercase">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      DISPONÍVEL
                    </span>
                  </td>

                  {/* Ações */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5 text-slate-400">
                      <button 
                        title="Editar" 
                        className="p-1.5 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        title="Visualizar" 
                        className="p-1.5 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        title="Baixar" 
                        className="p-1.5 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        title="Excluir" 
                        className="p-1.5 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. MODAL: ADICIONAR VÍDEO POR URL */}
      {isUrlModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden transform transition-all">
            {/* Cabeçalho do Modal */}
            <div className="p-6 pb-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-[#0094eb]">
                  <LinkIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Adicionar Vídeo por URL</h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                    Insira links do Pinterest, YouTube, Panda Video, Bunny CDN ou link direto.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsUrlModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Formulário do Modal */}
            <form onSubmit={handleAddMediaUrl} className="p-6 pt-2 space-y-4">
              {/* Campo Link / URL */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Link / URL Externa do Vídeo <span className="text-rose-500">*</span>
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://pinterest.com/pin/... ou YouTube / Link direto"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50/60 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0094eb] focus:bg-white focus:ring-1 focus:ring-[#0094eb] transition-all"
                />
              </div>

              {/* Campo Título */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Título ou Identificação da Mídia
                </label>
                <input
                  type="text"
                  placeholder="Ex: REEL_PROMO_LANCAMENTO.mp4"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50/60 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0094eb] focus:bg-white focus:ring-1 focus:ring-[#0094eb] transition-all"
                />
              </div>

              {/* Campo Vincular a um Produto */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Vincular a um Produto (Opcional)
                </label>
                <div className="relative">
                  <select
                    value={selectedProduct}
                    onChange={(e) => setSelectedProduct(e.target.value)}
                    className="w-full appearance-none px-3.5 py-2.5 bg-slate-50/60 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-[#0094eb] focus:bg-white focus:ring-1 focus:ring-[#0094eb] transition-all cursor-pointer"
                  >
                    <option value="">Sem produto vinculado</option>
                    <option value="prod1">Blusa Confort - Verde M</option>
                    <option value="prod2">Óculos de Sol Classic Preto</option>
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Campo Vincular a um Modelo de Medidas */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Vincular a um Modelo de Medidas (Opcional)
                </label>
                <div className="relative">
                  <select
                    value={selectedMeasurement}
                    onChange={(e) => setSelectedMeasurement(e.target.value)}
                    className="w-full appearance-none px-3.5 py-2.5 bg-slate-50/60 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-[#0094eb] focus:bg-white focus:ring-1 focus:ring-[#0094eb] transition-all cursor-pointer"
                  >
                    <option value="">Sem modelo de medidas vinculado</option>
                    <option value="med1">Modelo Padrão Feminino</option>
                    <option value="med2">Modelo Padrão Masculino</option>
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Rodapé com Botões */}
              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsUrlModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#0094eb] hover:bg-[#0082cf] text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                >
                  CADASTRAR MÍDIA
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
