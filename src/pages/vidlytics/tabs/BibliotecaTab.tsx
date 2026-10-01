import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Search,
  UploadCloud,
  Globe,
  Share2,
  Trash2,
  Edit2,
  Download,
  HardDrive,
  Film,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  X,
  Play
} from "lucide-react";
import { supabase } from "@/lib/supabase";

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
  created_at: string;
  updated_at?: string;
}

interface BibliotecaTabProps {
  storeId?: string;
}

const STORAGE_LIMIT_BYTES = 50 * 1024 * 1024 * 1024; // 50 GB
const BUCKET_NAME = "videos";

// Cliente direcionado ao schema vidlytics
const vidlyticsDb = (supabase as any).schema 
  ? (supabase as any).schema("vidlytics") 
  : supabase;

export const BibliotecaTab: React.FC<BibliotecaTabProps> = ({ storeId: initialStoreId }) => {
  const [storeId, setStoreId] = useState<string>(initialStoreId || "");
  const [videos, setVideos] = useState<VidVideo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<"TODOS" | "VIDEOS" | "IMAGENS">("TODOS");

  // Modais
  const [isUrlModalOpen, setIsUrlModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [selectedVideo, setSelectedVideo] = useState<VidVideo | null>(null);

  // Form states URL Externa
  const [externalUrl, setExternalUrl] = useState<string>("");
  const [externalTitle, setExternalTitle] = useState<string>("");
  const [externalProduct, setExternalProduct] = useState<string>("");
  const [externalModel, setExternalModel] = useState<string>("");
  const [isSavingExternal, setIsSavingExternal] = useState<boolean>(false);

  // Form states Edição
  const [editTitle, setEditTitle] = useState<string>("");
  const [editThumbnail, setEditThumbnail] = useState<string>("");
  const [editStatus, setEditStatus] = useState<string>("active");
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  // Upload
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  // Carregar Vídeos do schema vidlytics
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

  // Métricas de Armazenamento
  const totalBytesUsed = useMemo(() => {
    return videos.reduce((acc, item) => acc + (Number(item.file_size_bytes) || 0), 0);
  }, [videos]);

  const usedMB = (totalBytesUsed / (1024 * 1024)).toFixed(1);
  const percentUsed = Math.min(100, (totalBytesUsed / STORAGE_LIMIT_BYTES) * 100).toFixed(1);

  // Upload Direto
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
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true
        });

      if (uploadErr) {
        throw new Error(uploadErr.message);
      }

      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(uploadData.path);

      const publicUrl = urlData.publicUrl;
      const cleanTitle = file.name.replace(/\.[^/.]+$/, "");

      const payload: any = {
        store_id: storeId || null,
        title: cleanTitle,
        video_url: publicUrl,
        thumbnail_url: publicUrl,
        status: "active",
        active: true,
        file_size_bytes: file.size,
        video_source_type: "upload"
      };

      const { error: insertErr } = await vidlyticsDb
        .from("vid_videos")
        .insert([payload]);

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

      const finalTitle = externalTitle.trim() || `Vídeo ${new Date().toLocaleDateString("pt-BR")}`;

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

      const { error: insertErr } = await vidlyticsDb
        .from("vid_videos")
        .insert([payload]);

      if (insertErr) throw new Error(insertErr.message);

      setSuccessMsg("Vídeo cadastrado com sucesso!");
      setIsUrlModalOpen(false);
      setExternalUrl("");
      setExternalTitle("");
      setExternalProduct("");
      setExternalModel("");
      await fetchVideos();
    } catch (err: any) {
      console.error("[BibliotecaTab] Erro ao cadastrar URL:", err);
      setErrorMsg(err.message || "Erro ao salvar vídeo externo.");
    } finally {
      setIsSavingExternal(false);
    }
  };

  // Excluir Mídia
  const handleDeleteVideo = async (video: VidVideo) => {
    if (!confirm(`Deseja remover o vídeo "${video.title}"?`)) return;

    try {
      setErrorMsg(null);
      const { error } = await vidlyticsDb
        .from("vid_videos")
        .delete()
        .eq("id", video.id);

      if (error) throw new Error(error.message);

      setSuccessMsg("Mídia removida com sucesso!");
      setVideos((prev) => prev.filter((v) => v.id !== video.id));
    } catch (err: any) {
      console.error("[BibliotecaTab] Erro ao deletar:", err);
      setErrorMsg(err.message || "Erro ao deletar mídia.");
    }
  };

  // Modal Edição
  const openEditModal = (video: VidVideo) => {
    setSelectedVideo(video);
    setEditTitle(video.title || "");
    setEditThumbnail(video.thumbnail_url || "");
    setEditStatus(video.status || "active");
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVideo) return;

    try {
      setIsSavingEdit(true);
      const { error } = await vidlyticsDb
        .from("vid_videos")
        .update({
          title: editTitle,
          thumbnail_url: editThumbnail,
          status: editStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", selectedVideo.id);

      if (error) throw new Error(error.message);

      setSuccessMsg("Mídia atualizada com sucesso!");
      setIsEditModalOpen(false);
      setSelectedVideo(null);
      await fetchVideos();
    } catch (err: any) {
      console.error("[BibliotecaTab] Erro ao atualizar:", err);
      setErrorMsg(err.message || "Erro ao salvar alterações.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Filtragem da lista
  const filteredVideos = useMemo(() => {
    return videos.filter((item) => {
      const matchSearch = item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.video_url?.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchSearch) return false;

      const isImg = item.video_url?.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i);
      if (activeFilter === "VIDEOS" && isImg) return false;
      if (activeFilter === "IMAGENS" && !isImg) return false;

      return true;
    });
  }, [videos, searchTerm, activeFilter]);

  return (
    <div className="space-y-6">
      {/* Notificações */}
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center justify-between shadow-sm">
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
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-500" />
            <span className="text-sm font-medium">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header & Ações */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Biblioteca</h1>
          <p className="text-sm text-slate-500 mt-1">
            Gerencie os vídeos e imagens hospedados e monitore o consumo de espaço.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 text-xs font-semibold flex items-center gap-2 shadow-sm transition"
            onClick={() => alert("Módulo Instagram em breve.")}
          >
            <Share2 className="w-4 h-4 text-pink-600" />
            INSTAGRAM
          </button>

          <button
            type="button"
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 text-xs font-semibold flex items-center gap-2 shadow-sm transition"
            onClick={() => alert("Módulo TikTok em breve.")}
          >
            <Film className="w-4 h-4 text-slate-900" />
            TIKTOK
          </button>

          <button
            type="button"
            onClick={() => setIsUrlModalOpen(true)}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 text-xs font-semibold flex items-center gap-2 shadow-sm transition cursor-pointer"
          >
            <Globe className="w-4 h-4 text-sky-600" />
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
            className="px-5 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm shadow-sky-200 transition disabled:opacity-50 cursor-pointer"
          >
            {isUploading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <UploadCloud className="w-4 h-4" />
            )}
            {isUploading ? "ENVIANDO..." : "FAZER UPLOAD"}
          </button>
        </div>
      </div>

      {/* Cartão de Espaço */}
      <div className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center shadow-sm">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 text-sm">SCALE</span>
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 bg-sky-50 text-sky-600 border border-sky-100 rounded-md font-semibold">
                  50 GB LIMITE
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Uso atual: <span className="font-semibold text-slate-700">{usedMB} MB</span> de 50 GB
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-emerald-600">{percentUsed}%</div>
            <div className="text-[11px] text-slate-400">Espaço Consumido</div>
          </div>
        </div>

        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
          <div
            className="bg-sky-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.max(1, Number(percentUsed))}%` }}
          />
        </div>
      </div>

      {/* Busca e Filtros */}
      <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Pesquisar pelo nome do arquivo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full md:w-auto">
          {(["TODOS", "VIDEOS", "IMAGENS"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                activeFilter === filter
                  ? "bg-sky-500 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {filter === "VIDEOS" && <Film className="w-3.5 h-3.5" />}
              {filter === "IMAGENS" && <ImageIcon className="w-3.5 h-3.5" />}
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Listagem */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold text-slate-400 tracking-wider uppercase">
            {filteredVideos.length} Mídias Listadas
          </h2>
          <button
            onClick={fetchVideos}
            disabled={loading}
            className="text-xs text-sky-600 hover:text-sky-700 flex items-center gap-1 font-medium cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </button>
        </div>

        {loading ? (
          <div className="py-20 text-center bg-white border border-slate-200/80 rounded-2xl">
            <RefreshCw className="w-8 h-8 animate-spin text-sky-500 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Carregando mídias da loja...</p>
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="py-20 text-center bg-white border border-slate-200/80 rounded-2xl p-6">
            <div className="w-12 h-12 bg-sky-50 text-sky-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <UploadCloud className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">Nenhuma mídia encontrada</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              Envie seus arquivos de vídeo ou cadastre links externos para começar a usar no Vidlytics.
            </p>
            <button
              onClick={() => setIsUrlModalOpen(true)}
              className="px-4 py-2 bg-sky-500 text-white text-xs font-semibold rounded-xl hover:bg-sky-600 transition cursor-pointer"
            >
              Adicionar Primeiro Vídeo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredVideos.map((video) => {
              const isImg = video.video_url?.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i);
              return (
                <div
                  key={video.id}
                  className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition flex flex-col group"
                >
                  <div className="aspect-[9/16] bg-slate-900 relative overflow-hidden flex items-center justify-center">
                    {isImg ? (
                      <img
                        src={video.video_url}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <video
                        src={video.video_url}
                        poster={video.thumbnail_url}
                        className="w-full h-full object-cover"
                        controls={false}
                        muted
                        playsInline
                        onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
                        onMouseLeave={(e) => {
                          e.currentTarget.pause();
                          e.currentTarget.currentTime = 0;
                        }}
                      />
                    )}

                    {!isImg && (
                      <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white px-2 py-0.5 rounded-md text-[10px] font-semibold flex items-center gap-1 pointer-events-none">
                        <Play className="w-2.5 h-2.5 fill-white" /> VÍDEO
                      </div>
                    )}

                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button
                        onClick={() => openEditModal(video)}
                        className="w-8 h-8 rounded-lg bg-white/90 text-slate-700 flex items-center justify-center hover:bg-white transition shadow-sm cursor-pointer"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteVideo(video)}
                        className="w-8 h-8 rounded-lg bg-red-500/90 text-white flex items-center justify-center hover:bg-red-600 transition shadow-sm cursor-pointer"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="p-3.5 flex flex-col flex-1 justify-between">
                    <div>
                      <h4 className="font-semibold text-slate-800 text-sm line-clamp-1" title={video.title}>
                        {video.title || "Sem título"}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {video.created_at ? new Date(video.created_at).toLocaleDateString("pt-BR") : "Recente"}
                      </p>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <span className="capitalize">{video.status || "Ativo"}</span>
                      {video.video_url && (
                        <a
                          href={video.video_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sky-600 hover:text-sky-700 flex items-center gap-1 font-medium"
                        >
                          <Download className="w-3.5 h-3.5" /> Abrir
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: URL Externa */}
      {isUrlModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Adicionar Vídeo por URL</h3>
                  <p className="text-xs text-slate-400">Cole a URL direta ou streaming do vídeo</p>
                </div>
              </div>
              <button
                onClick={() => setIsUrlModalOpen(false)}
                className="w-8 h-8 rounded-xl text-slate-400 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExternal} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
                  URL DO VÍDEO *
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://exemplo.com/video.mp4"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
                  TÍTULO DO VÍDEO (OPCIONAL)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Demonstração do Produto"
                  value={externalTitle}
                  onChange={(e) => setExternalTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsUrlModalOpen(false)}
                  className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingExternal}
                  className="px-6 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50 cursor-pointer"
                >
                  {isSavingExternal ? "Salvando..." : "CADASTRAR MÍDIA"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edição */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-base">Editar Detalhes da Mídia</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="w-8 h-8 rounded-xl text-slate-400 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
                  TÍTULO
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
                  STATUS
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                >
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                  <option value="draft">Rascunho</option>
                </select>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-6 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50 cursor-pointer"
                >
                  {isSavingEdit ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BibliotecaTab;
