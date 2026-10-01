import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Search,
  UploadCloud,
  Globe,
  Share2,
  Trash2,
  Edit2,
  Eye,
  Download,
  HardDrive,
  Film,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  X,
  Play,
  Link2,
  ArrowLeft,
  AlertTriangle,
  Save
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import ConfirmDeleteModal from "@/components/common/ConfirmDeleteModal";

interface VidVideo {
  id: string;
  store_id: string;
  title: string;
  video_url: string;
  thumbnail_url?: string;
  status?: string;
  position?: number;
  active?: boolean;
  video_source_type?: string;
  file_size_bytes?: number;
  product_id?: string;
  model_id?: string;
  story_title?: string;
  created_at: string;
  updated_at?: string;
}

interface ProductItem {
  id: string;
  title?: string;
  name?: string;
  thumbnail?: string;
  image_url?: string;
  price?: number;
}

interface BibliotecaTabProps {
  storeId?: string;
}

const STORAGE_LIMIT_BYTES = 50 * 1024 * 1024 * 1024; // 50 GB
const BUCKET_NAME = "videos";

const vidlyticsDb = (supabase as any).schema 
  ? (supabase as any).schema("vidlytics") 
  : supabase;

export const BibliotecaTab: React.FC<BibliotecaTabProps> = ({ storeId: initialStoreId }) => {
  const [storeId, setStoreId] = useState<string>(initialStoreId || "");
  const [videos, setVideos] = useState<VidVideo[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<"TODOS" | "VIDEOS" | "IMAGENS">("TODOS");

  // Visualização e Subpáginas
  const [previewMedia, setPreviewMedia] = useState<VidVideo | null>(null);
  const [editingVideo, setEditingVideo] = useState<VidVideo | null>(null);

  // Modal Exclusão Padrão (Print 5)
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [videoToDelete, setVideoToDelete] = useState<VidVideo | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Modal URL Externa
  const [isUrlModalOpen, setIsUrlModalOpen] = useState<boolean>(false);
  const [externalUrl, setExternalUrl] = useState<string>("");
  const [externalTitle, setExternalTitle] = useState<string>("");
  const [externalProduct, setExternalProduct] = useState<string>("");
  const [externalModel, setExternalModel] = useState<string>("");
  const [isSavingExternal, setIsSavingExternal] = useState<boolean>(false);

  // Estados da Página de Edição (Print 3)
  const [editTitle, setEditTitle] = useState<string>("");
  const [editSourceType, setEditSourceType] = useState<string>("upload");
  const [editVideoUrl, setEditVideoUrl] = useState<string>("");
  const [editThumbnailUrl, setEditThumbnailUrl] = useState<string>("");
  const [editProductId, setEditProductId] = useState<string>("");
  const [editModelId, setEditModelId] = useState<string>("");
  const [editStatus, setEditStatus] = useState<string>("active");
  const [editStoryTitle, setEditStoryTitle] = useState<string>("");
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  // Inputs de arquivo
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editVideoFileRef = useRef<HTMLInputElement>(null);
  const editThumbFileRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Resolver store_id
  useEffect(() => {
    if (initialStoreId) {
      setStoreId(initialStoreId);
      return;
    }

    async function resolveStoreId() {
      try {
        const stored = localStorage.getItem("current_store_id") || localStorage.getItem("store_id");
        if (stored) {
          setStoreId(stored);
          return;
        }

        const { data: stores } = await supabase.from("stores").select("id").limit(1);
        if (stores && stores.length > 0) {
          setStoreId(stores[0].id);
        } else {
          setLoading(false);
        }
      } catch (e) {
        console.warn("[BibliotecaTab] Falha ao resolver storeId:", e);
        setLoading(false);
      }
    }

    resolveStoreId();
  }, [initialStoreId]);

  // Carregar produtos da loja
  useEffect(() => {
    async function fetchProducts() {
      if (!storeId) return;
      try {
        const { data } = await supabase
          .from("products")
          .select("id, name, title, image_url, thumbnail, price")
          .eq("store_id", storeId)
          .limit(100);

        if (data) setProducts(data);
      } catch {
        // silencioso
      }
    }
    fetchProducts();
  }, [storeId]);

  // Carregar mídias
  const fetchVideos = async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      let query = vidlyticsDb.from("vid_videos").select("*");
      if (storeId) {
        query = query.eq("store_id", storeId);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) {
        console.error("[BibliotecaTab] Erro ao buscar vídeos:", error);
        setErrorMsg(error.message);
      } else {
        setVideos(data || []);
      }
    } catch (err: any) {
      console.error("[BibliotecaTab] Catch fetchVideos:", err);
      setErrorMsg(err.message || "Falha ao carregar mídias.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (storeId) {
      fetchVideos();
    }
  }, [storeId]);

  // Helpers
  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes === 0) return "—";
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImageFile = (url?: string) => {
    if (!url) return false;
    return !!url.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i);
  };

  const totalBytesUsed = useMemo(() => {
    return videos.reduce((acc, item) => acc + (Number(item.file_size_bytes) || 0), 0);
  }, [videos]);

  const usedMB = (totalBytesUsed / (1024 * 1024)).toFixed(1);
  const percentUsed = Math.min(100, (totalBytesUsed / STORAGE_LIMIT_BYTES) * 100).toFixed(1);

  // Upload Direto da Biblioteca
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      setErrorMsg("O arquivo excede o limite máximo permitido de 50 MB.");
      return;
    }

    try {
      setIsUploading(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const targetStoreId = storeId || "00000000-0000-0000-0000-000000000000";
      const fileExt = file.name.split(".").pop();
      const fileName = `${targetStoreId}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, file, { cacheControl: "3600", upsert: true });

      if (uploadErr) throw new Error(uploadErr.message);

      const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(uploadData.path);
      const publicUrl = urlData.publicUrl;

      const payload: any = {
        store_id: storeId || null,
        title: file.name,
        video_url: publicUrl,
        thumbnail_url: publicUrl,
        status: "active",
        active: true,
        file_size_bytes: file.size,
        video_source_type: "upload"
      };

      const { error: insertErr } = await vidlyticsDb.from("vid_videos").insert([payload]);
      if (insertErr) throw new Error(insertErr.message);

      setSuccessMsg("Mídia enviada com sucesso!");
      await fetchVideos();
    } catch (err: any) {
      console.error("[BibliotecaTab] Falha no upload:", err);
      setErrorMsg(`Falha no upload: ${err.message}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Cadastrar URL Externa
  const handleSaveExternal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!externalUrl.trim()) return;

    try {
      setIsSavingExternal(true);
      setErrorMsg(null);

      const finalTitle = externalTitle.trim() || `Mídia_${Date.now()}`;
      const payload: any = {
        store_id: storeId || null,
        title: finalTitle,
        video_url: externalUrl.trim(),
        thumbnail_url: "",
        status: "active",
        active: true,
        video_source_type: "external"
      };

      if (externalProduct) payload.product_id = externalProduct;
      if (externalModel) payload.model_id = externalModel;

      const { error: insertErr } = await vidlyticsDb.from("vid_videos").insert([payload]);
      if (insertErr) throw new Error(insertErr.message);

      setSuccessMsg("Mídia externa cadastrada com sucesso!");
      setIsUrlModalOpen(false);
      setExternalUrl("");
      setExternalTitle("");
      setExternalProduct("");
      setExternalModel("");
      await fetchVideos();
    } catch (err: any) {
      console.error("[BibliotecaTab] Erro ao cadastrar:", err);
      setErrorMsg(err.message || "Erro ao salvar vídeo por URL.");
    } finally {
      setIsSavingExternal(false);
    }
  };

  // Abrir Exclusão (Print 5)
  const openDeleteModal = (video: VidVideo) => {
    setVideoToDelete(video);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!videoToDelete) return;

    try {
      setIsDeleting(true);
      setErrorMsg(null);

      const { error } = await vidlyticsDb.from("vid_videos").delete().eq("id", videoToDelete.id);
      if (error) throw new Error(error.message);

      setSuccessMsg(`O arquivo "${videoToDelete.title}" foi excluído com sucesso!`);
      setVideos((prev) => prev.filter((v) => v.id !== videoToDelete.id));
      setDeleteModalOpen(false);
      setVideoToDelete(null);
    } catch (err: any) {
      console.error("[BibliotecaTab] Erro ao excluir:", err);
      setErrorMsg(err.message || "Erro ao excluir arquivo.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Abrir Subpágina de Edição (Print 3)
  const openEditPage = (video: VidVideo) => {
    setEditingVideo(video);
    setEditTitle(video.title || "");
    setEditSourceType(video.video_source_type || "upload");
    setEditVideoUrl(video.video_url || "");
    setEditThumbnailUrl(video.thumbnail_url || "");
    setEditProductId(video.product_id || "");
    setEditModelId(video.model_id || "");
    setEditStatus(video.status || "active");
    setEditStoryTitle(video.story_title || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Upload de novo vídeo na página de edição
  const handleEditVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 30 * 1024 * 1024) {
      alert("O arquivo de vídeo deve ter no máximo 30 MB.");
      return;
    }

    try {
      const targetStoreId = storeId || "00000000-0000-0000-0000-000000000000";
      const fileExt = file.name.split(".").pop();
      const fileName = `${targetStoreId}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

      const { data, error } = await supabase.storage.from(BUCKET_NAME).upload(fileName, file, { upsert: true });
      if (error) throw error;

      const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(data.path);
      setEditVideoUrl(urlData.publicUrl);
    } catch (err: any) {
      alert(`Falha ao subir novo vídeo: ${err.message}`);
    }
  };

  // Upload de nova thumbnail na página de edição
  const handleEditThumbUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 350 * 1024) {
      alert("A capa deve ter no máximo 350 KB.");
      return;
    }

    try {
      const targetStoreId = storeId || "00000000-0000-0000-0000-000000000000";
      const fileExt = file.name.split(".").pop();
      const fileName = `${targetStoreId}/thumbnails/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

      const { data, error } = await supabase.storage.from(BUCKET_NAME).upload(fileName, file, { upsert: true });
      if (error) throw error;

      const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(data.path);
      setEditThumbnailUrl(urlData.publicUrl);
    } catch (err: any) {
      alert(`Falha ao subir nova thumbnail: ${err.message}`);
    }
  };

  // Salvar Alterações da Página de Edição (Print 3)
  const handleSavePageEdit = async () => {
    if (!editingVideo) return;

    try {
      setIsSavingEdit(true);
      setErrorMsg(null);

      const payload: any = {
        title: editTitle.trim(),
        video_source_type: editSourceType,
        video_url: editVideoUrl.trim(),
        thumbnail_url: editThumbnailUrl.trim(),
        product_id: editProductId || null,
        model_id: editModelId || null,
        status: editStatus,
        updated_at: new Date().toISOString()
      };

      const { error } = await vidlyticsDb.from("vid_videos").update(payload).eq("id", editingVideo.id);
      if (error) throw new Error(error.message);

      setSuccessMsg("Vídeo atualizado com sucesso!");
      setEditingVideo(null);
      await fetchVideos();
    } catch (err: any) {
      console.error("[BibliotecaTab] Erro ao salvar edição:", err);
      setErrorMsg(err.message || "Erro ao salvar alterações do vídeo.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Filtragem da Lista
  const filteredVideos = useMemo(() => {
    return videos.filter((item) => {
      const matchSearch = item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.video_url?.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchSearch) return false;

      const isImg = isImageFile(item.video_url);
      if (activeFilter === "VIDEOS" && isImg) return false;
      if (activeFilter === "IMAGENS" && !isImg) return false;

      return true;
    });
  }, [videos, searchTerm, activeFilter]);

  // ==========================================
  // RENDERIZAÇÃO: PÁGINA DE EDIÇÃO (PRINT 3)
  // ==========================================
  if (editingVideo) {
    const isImg = isImageFile(editVideoUrl);
    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-16">
        {/* Topo da Edição com Botão Voltar e Botão Superior */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setEditingVideo(null)}
            className="flex items-center gap-2 text-slate-800 hover:text-slate-950 font-extrabold text-lg transition cursor-pointer"
          >
            <div className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm">
              <ArrowLeft className="w-5 h-5 text-slate-700" />
            </div>
            <span>Editar Vídeo</span>
          </button>

          <button
            onClick={handleSavePageEdit}
            disabled={isSavingEdit}
            className="px-6 py-2.5 bg-[#0088ff] hover:bg-[#0077e6] text-white rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm shadow-sky-200 transition disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {isSavingEdit ? "SALVANDO..." : "SALVAR ALTERAÇÕES"}
          </button>
        </div>

        {/* Card Principal de Formulário */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-sm space-y-7">
          {/* TÍTULO DO VÍDEO */}
          <div>
            <label className="block text-[11px] font-extrabold text-slate-400 mb-2 uppercase tracking-wider">
              TÍTULO DO VÍDEO
            </label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-[#0088ff]"
            />
          </div>

          {/* ORIGEM DO VÍDEO */}
          <div>
            <label className="block text-[11px] font-extrabold text-slate-400 mb-2 uppercase tracking-wider">
              ORIGEM DO VÍDEO
            </label>
            <select
              value={editSourceType}
              onChange={(e) => setEditSourceType(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-[#0088ff]"
            >
              <option value="upload">Upload de vídeo</option>
              <option value="external">URL Externa</option>
            </select>
          </div>

          {/* ARQUIVO DE VÍDEO */}
          <div>
            <label className="block text-[11px] font-extrabold text-slate-400 mb-2 uppercase tracking-wider">
              ARQUIVO DE VÍDEO
            </label>

            {/* Aviso Amarelo 30MB */}
            <div className="p-3.5 bg-amber-50/70 border border-amber-200/70 rounded-2xl flex items-center gap-2.5 text-xs text-amber-900 mb-4">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>
                O arquivo de vídeo deve ter no <strong>máximo 30 MB</strong>. Formatos aceitos: MP4, MOV e WEBM.
              </span>
            </div>

            <div className="space-y-4">
              <input
                ref={editVideoFileRef}
                type="file"
                accept="video/mp4,video/quicktime,video/webm"
                className="hidden"
                onChange={handleEditVideoUpload}
              />

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => editVideoFileRef.current?.click()}
                  className="px-4 py-2 bg-sky-50 hover:bg-sky-100 text-[#0088ff] border border-sky-100 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Escolher arquivo
                </button>
                <span className="text-xs text-slate-400">Nenhum arquivo escolhido</span>
              </div>

              {/* Player do Vídeo Atual */}
              <div className="w-36 aspect-[9/16] rounded-2xl bg-black overflow-hidden relative border border-slate-200 shadow-sm">
                {isImg ? (
                  <img src={editVideoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <video
                    src={editVideoUrl}
                    poster={editThumbnailUrl}
                    controls
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            </div>
          </div>

          {/* CAPA DO VÍDEO (THUMBNAIL) */}
          <div>
            <label className="block text-[11px] font-extrabold text-slate-400 mb-2 uppercase tracking-wider">
              CAPA DO VÍDEO (THUMBNAIL)
            </label>

            <div className="flex items-start gap-4">
              <div className="w-20 h-28 rounded-2xl bg-slate-900 border border-slate-200 overflow-hidden flex-shrink-0">
                {editThumbnailUrl ? (
                  <img src={editThumbnailUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500 text-[10px]">
                    Sem capa
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2">
                <input
                  ref={editThumbFileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleEditThumbUpload}
                />

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => editThumbFileRef.current?.click()}
                    className="px-4 py-2 bg-sky-50 hover:bg-sky-100 text-[#0088ff] border border-sky-100 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Escolher arquivo
                  </button>
                  <span className="text-xs text-slate-400">Nenhum arquivo escolhido</span>
                </div>

                <input
                  type="text"
                  value={editThumbnailUrl}
                  onChange={(e) => setEditThumbnailUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-mono text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-[#0088ff]"
                />

                <p className="text-[11px] text-slate-400">
                  JPG, PNG ou WEBP. Máx. 350 KB. Se deixado em branco, um frame do vídeo será usado automaticamente.
                </p>
              </div>
            </div>
          </div>

          {/* PRODUTO VINCULADO (OPCIONAL) */}
          <div>
            <label className="block text-[11px] font-extrabold text-slate-400 mb-2 uppercase tracking-wider">
              PRODUTO VINCULADO (OPCIONAL)
            </label>
            <select
              value={editProductId}
              onChange={(e) => setEditProductId(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-[#0088ff]"
            >
              <option value="">Nenhum produto vinculado</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name || p.title} {p.price ? `- R$ ${Number(p.price).toFixed(2)}` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* MODELO/MEDIDA VINCULADO (OPCIONAL) */}
          <div>
            <label className="block text-[11px] font-extrabold text-slate-400 mb-2 uppercase tracking-wider">
              MODELO/MEDIDA VINCULADO (OPCIONAL)
            </label>
            <select
              value={editModelId}
              onChange={(e) => setEditModelId(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-[#0088ff]"
            >
              <option value="">Sem modelo vinculado</option>
              <option value="Clara">Clara (1.70m / 60kg - Vestindo M)</option>
              <option value="Julia">Julia (1.65m / 55kg - Vestindo P)</option>
              <option value="Mariana">Mariana (1.75m / 75kg - Vestindo G)</option>
            </select>
          </div>

          {/* STATUS */}
          <div>
            <label className="block text-[11px] font-extrabold text-slate-400 mb-2 uppercase tracking-wider">
              STATUS
            </label>
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-[#0088ff]"
            >
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
              <option value="draft">Rascunho</option>
            </select>
          </div>

          {/* USADO EM STORIES */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-extrabold text-slate-400 uppercase tracking-wider">USADO EM STORIES</span>
              <span className="font-bold text-slate-800">{editStoryTitle ? "Sim" : "Não"}</span>
            </div>
            {editStoryTitle && (
              <div className="mt-2 text-xs text-slate-500">
                <span className="font-semibold text-slate-600">Stories vinculados:</span>
                <ul className="list-disc list-inside mt-1 ml-1 font-bold text-slate-800">
                  <li>{editStoryTitle}</li>
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Botão Inferior Salvar */}
        <div className="flex justify-end">
          <button
            onClick={handleSavePageEdit}
            disabled={isSavingEdit}
            className="px-7 py-3 bg-[#0088ff] hover:bg-[#0077e6] text-white rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm shadow-sky-200 transition disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {isSavingEdit ? "SALVANDO..." : "SALVAR ALTERAÇÕES"}
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDERIZAÇÃO: LISTA PRINCIPAL DA TABELA
  // ==========================================
  return (
    <div className="space-y-6">
      {/* Notificações */}
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
            <span className="text-sm font-medium">{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-500" />
            <span className="text-sm font-medium">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Topo com Ações */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Biblioteca</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Gerencie os vídeos e imagens hospedados no seu plano e monitore o consumo de espaço.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-2xl hover:bg-slate-50 text-xs font-bold flex items-center gap-2 shadow-sm transition"
            onClick={() => alert("Módulo Instagram em breve.")}
          >
            <Share2 className="w-3.5 h-3.5 text-pink-600" />
            INSTAGRAM
          </button>

          <button
            type="button"
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-2xl hover:bg-slate-50 text-xs font-bold flex items-center gap-2 shadow-sm transition"
            onClick={() => alert("Módulo TikTok em breve.")}
          >
            <Film className="w-3.5 h-3.5 text-slate-900" />
            TIKTOK
          </button>

          <button
            type="button"
            onClick={() => setIsUrlModalOpen(true)}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-2xl hover:bg-slate-50 text-xs font-bold flex items-center gap-2 shadow-sm transition cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-sky-500" />
            URL EXTERNA
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/webm,image/*"
            className="hidden"
            onChange={handleFileUpload}
          />

          <button
            type="button"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="px-5 py-2 bg-[#0088ff] hover:bg-[#0077e6] text-white rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm shadow-sky-200 transition disabled:opacity-50 cursor-pointer"
          >
            {isUploading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <UploadCloud className="w-3.5 h-3.5" />
            )}
            {isUploading ? "ENVIANDO..." : "FAZER UPLOAD"}
          </button>
        </div>
      </div>

      {/* Card SCALE */}
      <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#0088ff] text-white flex items-center justify-center shadow-sm">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-800 text-sm">SCALE</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-sky-50 text-[#0088ff] border border-sky-100 rounded-md">
                  50 GB LIMITE
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Uso atual: <span className="font-bold text-slate-800">{usedMB} MB</span> de 50 GB
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-emerald-500">{percentUsed}%</div>
            <div className="text-[11px] text-slate-400">Espaço Consumido</div>
          </div>
        </div>

        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-emerald-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.max(0.5, Number(percentUsed))}%` }}
          />
        </div>
      </div>

      {/* Busca e Abas Filtros */}
      <div className="p-4 bg-white border border-slate-200/80 rounded-3xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-[480px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Pesquisar pelo nome do arquivo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-[#0088ff] placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100/70 p-1 rounded-2xl w-full md:w-auto">
          {(["TODOS", "VIDEOS", "IMAGENS"] as const).map((filter) => {
            const isSelected = activeFilter === filter;
            const label = filter === "VIDEOS" ? "VÍDEOS" : filter;
            return (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`flex-1 md:flex-none px-5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                  isSelected
                    ? "bg-[#0088ff] text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {filter === "VIDEOS" && <Film className="w-3.5 h-3.5" />}
                {filter === "IMAGENS" && <ImageIcon className="w-3.5 h-3.5" />}
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabela de Mídias */}
      <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {filteredVideos.length} MÍDIAS LISTADAS
          </span>
          <button
            onClick={fetchVideos}
            disabled={loading}
            className="text-xs text-[#0088ff] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </button>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-[#0088ff] mx-auto mb-2" />
            <p className="text-sm text-slate-500">Carregando mídias...</p>
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="py-20 text-center p-6">
            <UploadCloud className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700">Nenhuma mídia encontrada</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Faça upload ou adicione mídias por URL externa para começar.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/60 border-b border-slate-100 text-slate-400 font-extrabold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-6">MÍDIA</th>
                  <th className="py-3.5 px-6">NOME DO ARQUIVO</th>
                  <th className="py-3.5 px-6">PRODUTO</th>
                  <th className="py-3.5 px-6">STORY VINCULADO</th>
                  <th className="py-3.5 px-6">TAMANHO</th>
                  <th className="py-3.5 px-6">STATUS</th>
                  <th className="py-3.5 px-6 text-right">AÇÕES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVideos.map((video) => {
                  const isImg = isImageFile(video.video_url);
                  const matchedProduct = products.find((p) => p.id === video.product_id);

                  return (
                    <tr key={video.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Thumbnail Mídia */}
                      <td className="py-3.5 px-6">
                        <div className="w-12 h-12 rounded-xl bg-slate-900 overflow-hidden relative flex items-center justify-center border border-slate-200/60 flex-shrink-0">
                          {isImg ? (
                            <img
                              src={video.video_url}
                              alt={video.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <>
                              <video
                                src={video.video_url}
                                poster={video.thumbnail_url}
                                className="w-full h-full object-cover"
                                muted
                                playsInline
                              />
                              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                <Play className="w-3.5 h-3.5 text-white fill-white" />
                              </div>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Nome do Arquivo */}
                      <td className="py-3.5 px-6">
                        <div className="font-bold text-slate-800 text-[13px] line-clamp-1 max-w-[280px]" title={video.title}>
                          {video.title}
                        </div>
                        <div className="text-[10px] font-bold text-[#0088ff] uppercase tracking-wider mt-0.5">
                          {isImg ? "IMAGEM (HOSPEDADA)" : "VÍDEO MP4 (HOSPEDADO)"}
                        </div>
                      </td>

                      {/* Produto Vinculado */}
                      <td className="py-3.5 px-6">
                        {matchedProduct ? (
                          <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-slate-700 text-xs font-medium max-w-[180px]">
                            {matchedProduct.thumbnail || matchedProduct.image_url ? (
                              <img
                                src={matchedProduct.thumbnail || matchedProduct.image_url}
                                alt=""
                                className="w-4 h-4 rounded-full object-cover"
                              />
                            ) : null}
                            <span className="truncate">{matchedProduct.name || matchedProduct.title}</span>
                          </div>
                        ) : (
                          <span className="inline-block px-3 py-1 bg-slate-100 rounded-full text-slate-400 text-[11px] font-medium">
                            Sem produto
                          </span>
                        )}
                      </td>

                      {/* Story Vinculado */}
                      <td className="py-3.5 px-6">
                        {video.story_title ? (
                          <span className="inline-block px-3 py-0.5 bg-sky-50 text-[#0088ff] border border-sky-100 rounded-full text-[11px] font-bold uppercase">
                            {video.story_title}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-bold text-sm">—</span>
                        )}
                      </td>

                      {/* Tamanho */}
                      <td className="py-3.5 px-6 font-semibold text-slate-600 text-xs">
                        {formatFileSize(video.file_size_bytes)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-6">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-[11px] font-bold">
                          <CheckCircle className="w-3.5 h-3.5" />
                          DISPONÍVEL
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-6 text-right">
                        <div className="inline-flex items-center gap-2 text-slate-400">
                          <button
                            onClick={() => openEditPage(video)}
                            className="p-1 hover:text-slate-700 transition cursor-pointer"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setPreviewMedia(video)}
                            className="p-1 hover:text-slate-700 transition cursor-pointer"
                            title="Visualizar"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {video.video_url && (
                            <a
                              href={video.video_url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 hover:text-slate-700 transition"
                              title="Download / Link"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          )}
                          <button
                            onClick={() => openDeleteModal(video)}
                            className="p-1 hover:text-red-600 transition cursor-pointer"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL: PLAYER DE PREVIEW IDÊNTICO AO PRINT 1              */}
      {/* ========================================================= */}
      {previewMedia && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] max-w-sm w-full p-6 shadow-2xl relative border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            {/* Cabeçalho */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-50 text-[#0088ff] flex items-center justify-center flex-shrink-0">
                  <Eye className="w-5 h-5" />
                </div>
                <div className="max-w-[200px]">
                  <h3 className="font-extrabold text-slate-900 text-sm truncate leading-snug">
                    {previewMedia.title}
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                    VISUALIZAÇÃO DE MÍDIA
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPreviewMedia(null)}
                className="w-7 h-7 rounded-full text-slate-400 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Container 9:16 do Vídeo com bordas pretas suaves */}
            <div className="aspect-[9/16] w-full rounded-[24px] bg-black overflow-hidden relative border border-slate-900 shadow-inner flex items-center justify-center mb-5">
              {isImageFile(previewMedia.video_url) ? (
                <img
                  src={previewMedia.video_url}
                  alt={previewMedia.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <video
                  src={previewMedia.video_url}
                  controls
                  autoPlay
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            {/* Botão FECHAR ocupando toda a largura (Print 1) */}
            <button
              onClick={() => setPreviewMedia(null)}
              className="w-full py-3.5 bg-[#0088ff] hover:bg-[#0077e6] text-white font-extrabold text-xs tracking-wider uppercase rounded-2xl shadow-sm shadow-sky-200 transition cursor-pointer"
            >
              FECHAR
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADICIONAR VÍDEO POR URL                           */}
      {/* ========================================================= */}
      {isUrlModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between p-6 pb-4">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-sky-50 text-[#0088ff] flex items-center justify-center flex-shrink-0">
                  <Link2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base leading-snug">
                    Adicionar Vídeo por URL
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Insira links do Pinterest, YouTube, Panda Video, Bunny CDN ou link direto.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsUrlModalOpen(false)}
                className="w-8 h-8 rounded-full text-slate-400 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveExternal} className="p-6 pt-2 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Link / URL Externa do Vídeo <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://pinterest.com/pin/... ou YouTube / Link direto"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-[#0088ff] placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Título ou Identificação da Mídia
                </label>
                <input
                  type="text"
                  placeholder="Ex: REEL_PROMO_LANCAMENTO.mp4"
                  value={externalTitle}
                  onChange={(e) => setExternalTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-[#0088ff] placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Vincular a um Produto (Opcional)
                </label>
                <select
                  value={externalProduct}
                  onChange={(e) => setExternalProduct(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-[#0088ff] text-slate-700"
                >
                  <option value="">Sem produto vinculado</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name || p.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Vincular a um Modelo de Medidas (Opcional)
                </label>
                <select
                  value={externalModel}
                  onChange={(e) => setExternalModel(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-[#0088ff] text-slate-700"
                >
                  <option value="">Sem modelo de medidas vinculado</option>
                  <option value="p">Modelo P (1.65m / 55kg)</option>
                  <option value="m">Modelo M (1.70m / 65kg)</option>
                  <option value="g">Modelo G (1.75m / 78kg)</option>
                </select>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsUrlModalOpen(false)}
                  className="px-5 py-2.5 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingExternal}
                  className="px-6 py-2.5 bg-[#0088ff] hover:bg-[#0077e6] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition disabled:opacity-50 cursor-pointer shadow-sm shadow-sky-200"
                >
                  {isSavingExternal ? "SALVANDO..." : "CADASTRAR MÍDIA"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL GLOBAL DE EXCLUSÃO PADRÃO SLL (PRINT 5)            */}
      {/* ========================================================= */}
      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="EXCLUIR ARQUIVO"
        itemName={videoToDelete?.title || ""}
        isDeleting={isDeleting}
      />
    </div>
  );
};

export default BibliotecaTab;
