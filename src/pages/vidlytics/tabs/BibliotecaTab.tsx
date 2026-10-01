import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  Check,
  Loader2,
  Link2
} from 'lucide-react';
import { useLoja } from '../../../contexts/LojaContext';
import { supabase } from '../../../lib/supabase';

interface MediaItem {
  id: string;
  name: string;
  type: 'video' | 'image';
  typeLabel: string;
  thumbnail: string;
  videoUrl?: string;
  product?: {
    id?: string;
    name: string;
    image: string;
  };
  modelId?: string | null;
  linkedStory?: string;
  size: string;
  sizeBytes: number;
  status: 'DISPONÍVEL' | 'PROCESSANDO' | 'ERRO';
  origin?: string;
  activeStatus?: 'Ativo' | 'Inativo';
}

interface ProductOption {
  id: string;
  title: string;
  image_url?: string;
}

interface ModelOption {
  id: string;
  name: string;
}

export const BibliotecaTab: React.FC = () => {
  const { storeId } = useLoja();

  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'TODOS' | 'VIDEOS' | 'IMAGENS'>('TODOS');
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);

  // Produtos e Modelos para os selects
  const [availableProducts, setAvailableProducts] = useState<ProductOption[]>([]);
  const [availableModels, setAvailableModels] = useState<ModelOption[]>([]);

  // Modais de controle
  const [viewingMedia, setViewingMedia] = useState<MediaItem | null>(null);
  const [editingMedia, setEditingMedia] = useState<MediaItem | null>(null);
  const [deletingMedia, setDeletingMedia] = useState<MediaItem | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modal URL Externa
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [externalUrl, setExternalUrl] = useState('');
  const [externalTitle, setExternalTitle] = useState('');
  const [externalProductId, setExternalProductId] = useState('');
  const [externalModelId, setExternalModelId] = useState('');
  const [isSubmittingUrl, setIsSubmittingUrl] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  // Upload direto de arquivo
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados da tela de edição
  const [editTitle, setEditTitle] = useState('');
  const [editOrigin, setEditOrigin] = useState('Upload de vídeo');
  const [editThumbnail, setEditThumbnail] = useState('');
  const [editProductId, setEditProductId] = useState<string>('');
  const [editModelId, setEditModelId] = useState<string>('');
  const [editStatus, setEditStatus] = useState<'Ativo' | 'Inativo'>('Ativo');

  // Formatação de bytes para KB / MB / GB
  const formatBytes = (bytes: number): string => {
    if (!bytes || bytes <= 0) return '0 KB';
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  // Carregar produtos e modelos da loja ativa
  const loadAuxiliaryData = async () => {
    if (!storeId) return;
    try {
      // 1. Produtos
      const { data: prodData } = await supabase
        .from('products')
        .select('id, title, image_url')
        .eq('store_id', storeId)
        .order('title', { ascending: true });

      if (prodData) {
        setAvailableProducts(prodData.map((p: any) => ({
          id: p.id,
          title: p.title || 'Produto sem título',
          image_url: p.image_url || ''
        })));
      }

      // 2. Modelos de Medidas
      const { data: modelData } = await supabase
        .from('sizing_models')
        .select('id, name')
        .eq('store_id', storeId)
        .order('name', { ascending: true });

      if (modelData) {
        setAvailableModels(modelData.map((m: any) => ({
          id: m.id,
          name: m.name || 'Modelo'
        })));
      }
    } catch (err) {
      console.warn('[BibliotecaTab] Erro ao carregar dados auxiliares:', err);
    }
  };

  // Carregar lista de vídeos da loja ativa
  const fetchMediaList = async () => {
    if (!storeId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Tenta carregar do schema vidlytics, com fallback para o schema public
      let videosData: any[] | null = null;
      let fetchErr: any = null;

      try {
        const res = await supabase
          .schema('vidlytics')
          .from('vid_videos')
          .select(`
            id,
            title,
            video_url,
            thumbnail_url,
            video_source_type,
            source_type,
            file_size,
            status,
            active,
            product_id,
            model_id,
            created_at
          `)
          .eq('store_id', storeId)
          .order('created_at', { ascending: false });

        videosData = res.data;
        fetchErr = res.error;
      } catch {
        // Fallback para schema public caso schema vidlytics não esteja exposto
        const resFallback = await supabase
          .from('vid_videos')
          .select('*')
          .eq('store_id', storeId)
          .order('created_at', { ascending: false });

        videosData = resFallback.data;
        fetchErr = resFallback.error;
      }

      if (fetchErr) {
        console.warn('[BibliotecaTab] Erro ao buscar vídeos:', fetchErr);
      }

      if (videosData && videosData.length > 0) {
        // Mapear produtos
        const prodMap = new Map<string, ProductOption>();
        availableProducts.forEach(p => prodMap.set(p.id, p));

        const mapped: MediaItem[] = videosData.map((item: any) => {
          const isImg = (item.video_source_type === 'image' || item.source_type === 'image');
          const isUrl = (item.video_source_type === 'url' || item.source_type === 'url');
          const pInfo = item.product_id ? prodMap.get(item.product_id) : undefined;
          const bytes = Number(item.file_size) || 0;

          return {
            id: item.id,
            name: item.title || (isUrl ? 'Vídeo Externo' : 'Mídia'),
            type: isImg ? 'image' : 'video',
            typeLabel: isImg
              ? 'IMAGEM (HOSPEDADA)'
              : isUrl
              ? 'VÍDEO EXTERNO (URL)'
              : 'VÍDEO MP4 (HOSPEDADO)',
            thumbnail: item.thumbnail_url || 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=300&auto=format&fit=crop&q=80',
            videoUrl: item.video_url || undefined,
            product: pInfo
              ? { id: pInfo.id, name: pInfo.title, image: pInfo.image_url || '' }
              : undefined,
            modelId: item.model_id || null,
            linkedStory: undefined,
            size: formatBytes(bytes),
            sizeBytes: bytes,
            status: item.status === 'error' ? 'ERRO' : 'DISPONÍVEL',
            origin: isUrl ? 'URL externa' : 'Upload de vídeo',
            activeStatus: item.active !== false ? 'Ativo' : 'Inativo'
          };
        });

        setMediaList(mapped);
      } else {
        setMediaList([]);
      }
    } catch (err) {
      console.error('[BibliotecaTab] Exceção ao carregar mídias:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuxiliaryData();
  }, [storeId]);

  useEffect(() => {
    fetchMediaList();
  }, [storeId, availableProducts.length]);

  // CÁLCULO DINÂMICO E REAL DO ESPAÇO CONSUMIDO
  const TOTAL_LIMIT_BYTES = 50 * 1024 * 1024 * 1024; // 50 GB

  const { totalUsedFormatted, percentageUsed } = useMemo(() => {
    const totalBytes = mediaList.reduce((acc, curr) => acc + curr.sizeBytes, 0);

    let formatted = '0 MB';
    if (totalBytes >= 1024 * 1024 * 1024) {
      formatted = `${(totalBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    } else if (totalBytes >= 1024 * 1024) {
      formatted = `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`;
    } else if (totalBytes > 0) {
      formatted = `${(totalBytes / 1024).toFixed(1)} KB`;
    }

    const pct = (totalBytes / TOTAL_LIMIT_BYTES) * 100;
    const formattedPct = pct < 0.01 && pct > 0 ? '0.1%' : `${pct.toFixed(1)}%`;

    return {
      totalUsedFormatted: formatted,
      percentageUsed: formattedPct
    };
  }, [mediaList]);

  // 1. CADASTRAR VÍDEO POR URL EXTERNA
  const handleSaveExternalUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!externalUrl.trim()) {
      setUrlError('Informe a URL do vídeo.');
      return;
    }
    if (!storeId) {
      setUrlError('Nenhuma loja ativa selecionada.');
      return;
    }

    setIsSubmittingUrl(true);
    setUrlError(null);

    const title = externalTitle.trim() || `VÍDEO_EXTERNO_${Date.now().toString().slice(-4)}`;
    const defaultThumbnail = 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=300&auto=format&fit=crop&q=80';

    const payload = {
      store_id: storeId,
      title: title,
      video_source_type: 'url',
      source_type: 'url',
      video_url: externalUrl.trim(),
      thumbnail_url: defaultThumbnail,
      thumbnail_source_type: 'auto',
      product_id: externalProductId || null,
      model_id: externalModelId || null,
      file_size: 0,
      thumbnail_file_size: 0,
      status: 'active',
      active: true,
      created_at: new Date().toISOString()
    };

    try {
      let insertErr: any = null;
      try {
        const { error } = await supabase
          .schema('vidlytics')
          .from('vid_videos')
          .insert(payload);
        insertErr = error;
      } catch {
        const { error } = await supabase
          .from('vid_videos')
          .insert(payload);
        insertErr = error;
      }

      if (insertErr) {
        throw new Error(insertErr.message || 'Erro ao salvar vídeo externo');
      }

      // Limpar formulário e fechar modal
      setExternalUrl('');
      setExternalTitle('');
      setExternalProductId('');
      setExternalModelId('');
      setShowUrlModal(false);

      // Recarregar lista
      await fetchMediaList();
    } catch (err: any) {
      console.error('[BibliotecaTab] Erro ao cadastrar mídia externa:', err);
      setUrlError(err.message || 'Falha ao salvar URL externa');
    } finally {
      setIsSubmittingUrl(false);
    }
  };

  // 2. UPLOAD DIRETO DE ARQUIVO (VÍDEO OU IMAGEM)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !storeId) return;

    // Limite de 30MB
    if (file.size > 30 * 1024 * 1024) {
      setUploadError('O arquivo excede o limite máximo permitido de 30 MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const isImage = file.type.startsWith('image/');
      const fileExt = file.name.split('.').pop();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${storeId}/${Date.now()}_${sanitizedName}`;

      // Upload para Supabase Storage
      let uploadRes = await supabase.storage
        .from('videos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadRes.error) {
        // Tenta bucket 'media' como alternativa
        uploadRes = await supabase.storage
          .from('media')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true
          });
      }

      if (uploadRes.error) {
        throw new Error(uploadRes.error.message || 'Erro no envio do arquivo para o Storage');
      }

      // Obter URL pública
      const { data: publicUrlData } = supabase.storage
        .from(uploadRes.data.fullPath.split('/')[0] || 'videos')
        .getPublicUrl(uploadRes.data.path || filePath);

      const finalUrl = publicUrlData?.publicUrl || '';
      const defaultThumb = isImage
        ? finalUrl
        : 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=300&auto=format&fit=crop&q=80';

      const payload = {
        store_id: storeId,
        title: file.name,
        video_source_type: isImage ? 'image' : 'upload',
        source_type: isImage ? 'image' : 'upload',
        video_url: finalUrl,
        thumbnail_url: defaultThumb,
        thumbnail_source_type: isImage ? 'upload' : 'auto',
        file_size: file.size,
        thumbnail_file_size: 0,
        status: 'active',
        active: true,
        created_at: new Date().toISOString()
      };

      let insertErr: any = null;
      try {
        const { error } = await supabase
          .schema('vidlytics')
          .from('vid_videos')
          .insert(payload);
        insertErr = error;
      } catch {
        const { error } = await supabase
          .from('vid_videos')
          .insert(payload);
        insertErr = error;
      }

      if (insertErr) {
        throw new Error(insertErr.message || 'Erro ao registrar vídeo no banco de dados');
      }

      await fetchMediaList();
    } catch (err: any) {
      console.error('[BibliotecaTab] Falha no upload:', err);
      setUploadError(err.message || 'Erro ao realizar upload do arquivo.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Abrir página de Edição de Vídeo
  const handleOpenEdit = (media: MediaItem) => {
    setEditingMedia(media);
    setEditTitle(media.name);
    setEditOrigin(media.origin || 'Upload de vídeo');
    setEditThumbnail(media.thumbnail);
    setEditProductId(media.product?.id || '');
    setEditModelId(media.modelId || '');
    setEditStatus(media.activeStatus || 'Ativo');
    setSaveSuccess(false);
  };

  // Salvar Edição
  const handleSaveVideoEdit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingMedia || !storeId) return;

    try {
      const selectedProd = availableProducts.find(p => p.id === editProductId);

      const updatePayload: any = {
        title: editTitle.trim(),
        product_id: editProductId || null,
        model_id: editModelId || null,
        active: editStatus === 'Ativo'
      };

      if (editThumbnail.trim()) {
        updatePayload.thumbnail_url = editThumbnail.trim();
      }

      let updErr: any = null;
      try {
        const { error } = await supabase
          .schema('vidlytics')
          .from('vid_videos')
          .update(updatePayload)
          .eq('id', editingMedia.id)
          .eq('store_id', storeId);
        updErr = error;
      } catch {
        const { error } = await supabase
          .from('vid_videos')
          .update(updatePayload)
          .eq('id', editingMedia.id)
          .eq('store_id', storeId);
        updErr = error;
      }

      if (updErr) {
        console.warn('[BibliotecaTab] Erro ao atualizar no banco:', updErr);
      }

      // Atualiza localmente
      setMediaList((prev) =>
        prev.map((item) => {
          if (item.id === editingMedia.id) {
            return {
              ...item,
              name: editTitle,
              origin: editOrigin,
              thumbnail: editThumbnail || item.thumbnail,
              activeStatus: editStatus,
              product: selectedProd
                ? { id: selectedProd.id, name: selectedProd.title, image: selectedProd.image_url || '' }
                : undefined,
              modelId: editModelId || null
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
    } catch (err) {
      console.error('[BibliotecaTab] Falha ao salvar edição:', err);
    }
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

  // Confirmar Exclusão com Remoção no Banco de Dados
  const handleConfirmDelete = async () => {
    if (!deletingMedia || !storeId) return;

    setIsDeleting(true);
    try {
      let delErr: any = null;
      try {
        const { error } = await supabase
          .schema('vidlytics')
          .from('vid_videos')
          .delete()
          .eq('id', deletingMedia.id)
          .eq('store_id', storeId);
        delErr = error;
      } catch {
        const { error } = await supabase
          .from('vid_videos')
          .delete()
          .eq('id', deletingMedia.id)
          .eq('store_id', storeId);
        delErr = error;
      }

      if (delErr) {
        console.warn('[BibliotecaTab] Erro ao deletar no banco:', delErr);
      }

      setMediaList((prev) => prev.filter((item) => item.id !== deletingMedia.id));
      setDeletingMedia(null);
    } catch (err) {
      console.error('[BibliotecaTab] Falha ao excluir mídia:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredMedia = mediaList.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (filterType === 'VIDEOS') return matchesSearch && item.type === 'video';
    if (filterType === 'IMAGENS') return matchesSearch && item.type === 'image';
    return matchesSearch;
  });

  // Tela completa de Edição de Vídeo
  if (editingMedia) {
    return (
      <div className="space-y-6 pb-12">
        {/* Barra superior de Ação da Edição */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setEditingMedia(null)}
            className="flex items-center gap-2 text-slate-800 hover:text-slate-600 font-bold text-lg transition-colors cursor-pointer"
          >
            <div className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50">
              <ArrowLeft size={18} />
            </div>
            <span>Editar Vídeo</span>
          </button>

          <button
            type="button"
            onClick={() => handleSaveVideoEdit()}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#0094eb] hover:bg-[#0082cf] text-white rounded-xl text-xs font-bold tracking-wider transition-all shadow-md shadow-blue-500/20 cursor-pointer"
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

            <div className="flex items-center gap-2 p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-700 font-medium">
              <AlertTriangle size={15} className="shrink-0 text-amber-500" />
              <span>O arquivo de vídeo deve ter no <strong>máximo 30 MB</strong>. Formatos aceitos: MP4, MOV e WEBM.</span>
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
                <input
                  type="text"
                  placeholder="Cole a URL da capa"
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
              value={editProductId}
              onChange={(e) => setEditProductId(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-[#0094eb] transition-colors"
            >
              <option value="">Nenhum produto vinculado</option>
              {availableProducts.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>

          {/* MODELO/MEDIDA VINCULADO (OPCIONAL) */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              MODELO/MEDIDA VINCULADO (OPCIONAL)
            </label>
            <select
              value={editModelId}
              onChange={(e) => setEditModelId(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-[#0094eb] transition-colors"
            >
              <option value="">Nenhum</option>
              {availableModels.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
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

          {/* BOTÃO SALVAR INFERIOR */}
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-3 bg-[#0094eb] hover:bg-[#0082cf] text-white rounded-xl text-xs font-bold tracking-wider transition-all shadow-md shadow-blue-500/20 cursor-pointer"
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
      {/* Input de Arquivo oculto para Upload Direto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm,image/*"
        onChange={handleFileChange}
        className="hidden"
      />

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
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-700 tracking-wider transition-colors shadow-sm whitespace-nowrap shrink-0 cursor-pointer"
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
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-700 tracking-wider transition-colors shadow-sm whitespace-nowrap shrink-0 cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 fill-current text-slate-700" viewBox="0 0 24 24">
              <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
            </svg>
            <span>TIKTOK</span>
          </button>

          {/* BOTÃO URL EXTERNA */}
          <button
            type="button"
            onClick={() => {
              setUrlError(null);
              setShowUrlModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-700 tracking-wider transition-colors shadow-sm whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ExternalLink size={14} className="text-slate-600" />
            <span>URL EXTERNA</span>
          </button>

          {/* BOTÃO FAZER UPLOAD */}
          <button
            type="button"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-[#0094eb] hover:bg-[#0082cf] text-white rounded-xl text-xs font-bold tracking-wider transition-colors shadow-md shadow-blue-500/20 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
          >
            {isUploading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>ENVIANDO...</span>
              </>
            ) : (
              <>
                <UploadCloud size={16} />
                <span>FAZER UPLOAD</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Alerta de erro de upload */}
      {uploadError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
          <AlertTriangle size={15} className="shrink-0 text-red-500" />
          <span>{uploadError}</span>
        </div>
      )}

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
                Uso atual: <strong className="text-slate-700 font-semibold">{totalUsedFormatted}</strong> de 50 GB
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xl font-bold text-emerald-500">{percentageUsed}</span>
            <p className="text-[11px] text-slate-400 font-medium">Espaço Consumido</p>
          </div>
        </div>

        {/* Barra de Progresso Real */}
        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-[#0094eb] h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.max(0.1, parseFloat(percentageUsed))}%` }}
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
            className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wider transition-colors cursor-pointer ${
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
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold tracking-wider transition-colors cursor-pointer ${
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
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold tracking-wider transition-colors cursor-pointer ${
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
        <div className="px-6 py-3.5 bg-slate-50/60 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-extrabold text-slate-700 tracking-wider">
            {filteredMedia.length} MÍDIAS LISTADAS
          </span>
          {loading && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Loader2 size={13} className="animate-spin text-[#0094eb]" />
              <span>Sincronizando...</span>
            </div>
          )}
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
              {filteredMedia.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    Nenhuma mídia encontrada. Clique em <strong>FAZER UPLOAD</strong> ou <strong>URL EXTERNA</strong> para adicionar.
                  </td>
                </tr>
              )}

              {filteredMedia.map((media) => (
                <tr key={media.id} className="hover:bg-slate-50/80 transition-colors">
                  {/* Mídia Thumbnail */}
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

                  {/* Nome do Arquivo */}
                  <td className="py-3 px-4 text-left">
                    <p className="font-bold text-slate-800 text-sm truncate max-w-[240px]">
                      {media.name}
                    </p>
                    <p className="text-[11px] font-semibold text-[#0094eb] mt-0.5">
                      {media.typeLabel}
                    </p>
                  </td>

                  {/* Produto */}
                  <td className="py-3 px-4 text-center">
                    <div className="flex justify-center items-center">
                      {media.product ? (
                        <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-full text-xs text-slate-700">
                          {media.product.image && (
                            <img
                              src={media.product.image}
                              alt={media.product.name}
                              className="w-4 h-4 rounded-full object-cover"
                            />
                          )}
                          <span className="font-medium max-w-[130px] truncate">{media.product.name}</span>
                        </div>
                      ) : (
                        <span className="inline-block px-3 py-1 bg-slate-50 border border-slate-200 rounded-full text-xs text-slate-400 font-medium">
                          Sem produto
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Story Vinculado */}
                  <td className="py-3 px-4 text-center">
                    {media.linkedStory ? (
                      <span className="inline-block px-3 py-1 bg-blue-50 text-[#0094eb] text-xs font-bold rounded-full">
                        {media.linkedStory}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-bold">—</span>
                    )}
                  </td>

                  {/* Tamanho */}
                  <td className="py-3 px-4 text-center text-xs font-semibold text-slate-600">
                    {media.size}
                  </td>

                  {/* Status */}
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-full">
                      <CheckCircle2 size={13} />
                      <span>{media.status}</span>
                    </span>
                  </td>

                  {/* AÇÕES: GRID ALINHADO */}
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

      {/* MODAL 1: ADICIONAR VÍDEO POR URL EXTERNA */}
      {showUrlModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Header Modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0094eb] flex items-center justify-center">
                  <Link2 size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Adicionar Vídeo por URL</h3>
                  <p className="text-[11px] text-slate-500">Cole a URL direta ou streaming do vídeo</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowUrlModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Formulário URL Externa */}
            <form onSubmit={handleSaveExternalUrl} className="p-6 space-y-4">
              {urlError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">
                  {urlError}
                </div>
              )}

              {/* URL DO VÍDEO */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                  URL DO VÍDEO *
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://exemplo.com/video.mp4 ou streaming"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0094eb] transition-colors"
                />
              </div>

              {/* TÍTULO DO VÍDEO */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                  TÍTULO DO VÍDEO (OPCIONAL)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Demonstração do Produto"
                  value={externalTitle}
                  onChange={(e) => setExternalTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0094eb] transition-colors"
                />
              </div>

              {/* PRODUTO VINCULADO */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                  PRODUTO VINCULADO (OPCIONAL)
                </label>
                <select
                  value={externalProductId}
                  onChange={(e) => setExternalProductId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#0094eb] transition-colors"
                >
                  <option value="">Nenhum produto vinculado</option>
                  {availableProducts.map((p) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>

              {/* MODELO / MEDIDA */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                  MODELO/MEDIDA VINCULADO (OPCIONAL)
                </label>
                <select
                  value={externalModelId}
                  onChange={(e) => setExternalModelId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#0094eb] transition-colors"
                >
                  <option value="">Nenhum</option>
                  {availableModels.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              {/* BOTÕES DE AÇÃO */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUrlModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingUrl}
                  className="flex items-center gap-2 px-5 py-2 bg-[#0094eb] hover:bg-[#0082cf] text-white rounded-xl text-xs font-bold tracking-wider transition-colors shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-60"
                >
                  {isSubmittingUrl ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>SALVANDO...</span>
                    </>
                  ) : (
                    <span>CADASTRAR MÍDIA</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: VISUALIZAÇÃO COM VÍDEO REAL HTML5 */}
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

      {/* MODAL 3: CONFIRMAÇÃO DE EXCLUSÃO */}
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
                disabled={isDeleting}
                onClick={() => setDeletingMedia(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer disabled:opacity-60"
              >
                {isDeleting && <Loader2 size={13} className="animate-spin" />}
                <span>Sim, Excluir</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BibliotecaTab;
