import { uploadVideoToBunny } from "@/services/vidlytics/bunnyUpload";
import HlsPlayer from "@/components/vidlytics/HlsPlayer";
import PageTour from '@/components/tour/PageTour';
import TourTagger from '@/tours/TourTagger';
import { BIBLIOTECA_TOUR, BIBLIOTECA_TAGS } from '@/tours/vidlyticsTabsTours';
import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Search,
  UploadCloud,
  Globe,
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
  Save, List, LayoutGrid, MoreHorizontal
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import ConfirmDeleteModal from "@/components/common/ConfirmDeleteModal";
import { checkQuota, quotaErrorKind, type QuotaState } from "@/services/quotaService";
import { useQuotaGuard } from "@/hooks/useQuotaGuard";
import QuotaUpgradeModal from "@/components/QuotaUpgradeModal";
import TikTokImportModal from "@/components/vidlytics/TikTokImportModal";
import InstagramImportModal from "@/components/vidlytics/InstagramImportModal";

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
  folder_id?: string | null;
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

const GB_BYTES = 1024 * 1024 * 1024;

const fmtDuration = (s?: number | null) => {
  const n = Math.round(Number(s) || 0);
  if (!n) return "—";
  const m = Math.floor(n / 60);
  const r = n % 60;
  return m ? `${m}min ${String(r).padStart(2, "0")}s` : `${r}s`;
};

const fmtMB = (b?: number | null) => {
  const n = Number(b) || 0;
  if (!n) return "—";
  return n >= GB_BYTES ? `${(n / GB_BYTES).toFixed(2)} GB` : `${(n / 1048576).toFixed(2)} MB`;
};

const statusInfo = (st?: string) => {
  if (st === "failed") return { label: "FALHOU", cls: "bg-rose-50 text-rose-600 border-rose-100" };
  if (st && ["processing", "uploading", "queued", "transcoding"].includes(st))
    return { label: "PROCESSANDO", cls: "bg-amber-50 text-amber-600 border-amber-100" };
  return { label: "DISPONÍVEL", cls: "bg-emerald-50 text-emerald-600 border-emerald-100" };
};
const BUCKET_NAME = "videos";
const MAX_FILE_BYTES = 30 * 1024 * 1024;

const vidlyticsDb = (supabase as any).schema 
  ? (supabase as any).schema("vidlytics") 
  : supabase;

// Utilitário para extrair ID do YouTube (suporta /shorts/, /watch?v=, youtu.be/)
export const extractYouTubeId = (url: string): string | null => {
  if (!url) return null;
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = url.match(regExp);
  return match && match[1] ? match[1] : null;
};

// Gerador de thumbnail capturando frame do vídeo via Canvas no navegador
const captureVideoThumbnail = (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    const url = URL.createObjectURL(file);
    video.src = url;

    video.onloadeddata = () => {
      // Avança para 0.5s para evitar primeiro frame preto
      video.currentTime = Math.min(0.5, (video.duration || 1) / 2);
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 720;
        canvas.height = video.videoHeight || 1280;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error("Canvas context não disponível"));
          return;
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url);
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Falha ao converter canvas para blob"));
            }
          },
          "image/jpeg",
          0.85
        );
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível carregar vídeo para extração de thumbnail"));
    };
  });
};

const IconInstagram: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="sll-ig-grad" x1="2" y1="22" x2="22" y2="2" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#FEDA75" />
        <stop offset="0.3" stopColor="#FA7E1E" />
        <stop offset="0.55" stopColor="#D62976" />
        <stop offset="0.8" stopColor="#962FBF" />
        <stop offset="1" stopColor="#4F5BD5" />
      </linearGradient>
    </defs>
    <rect x="3" y="3" width="18" height="18" rx="5" stroke="url(#sll-ig-grad)" strokeWidth="2" />
    <circle cx="12" cy="12" r="4" stroke="url(#sll-ig-grad)" strokeWidth="2" />
    <circle cx="17.5" cy="6.5" r="1.3" fill="url(#sll-ig-grad)" />
  </svg>
);

const IconTikTok: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
  </svg>
);
const isExternalMedia = (v: VidVideo): boolean =>
  v.video_source_type === 'external' || /youtube\.com|youtu\.be/i.test(v.video_url || '');

const downloadMedia = async (v: VidVideo): Promise<void> => {
  const url = v.video_url;
  if (!url) return;
  const ext = (url.split('?')[0].match(/\.([a-z0-9]{2,4})$/i)?.[1] || 'mp4').toLowerCase();
  const base = (v.title || 'arquivo').replace(/[\\/:*?"<>|]+/g, '').trim() || 'arquivo';
  const name = base.toLowerCase().endsWith('.' + ext) ? base : `${base}.${ext}`;

  // Download direto (Supabase Storage responde com Content-Disposition: attachment)
  const direct = () => {
    const a = document.createElement('a');
    a.href = url + (url.includes('?') ? '&' : '?') + 'download=' + encodeURIComponent(name);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const picker = (window as any).showSaveFilePicker;
  if (!picker) {
    direct();
    return;
  }
  try {
    const handle = await picker({ suggestedName: name });
    const res = await fetch(url);
    if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
    const writable = await handle.createWritable();
    await res.body.pipeTo(writable);
  } catch (err: any) {
    if (err?.name === 'AbortError') return;
    console.error('[Biblioteca] Falha no seletor de pasta, usando download direto:', err);
    direct();
  }
};
type ProductOpt = { id: string; label: string; image?: string; price?: number | null };

const toProductOpt = (p: any): ProductOpt => ({
  id: String(p.id),
  label: p.name || p.title || "Produto sem nome",
  image: p.thumbnail || p.image_url || p.image || undefined,
  price: p.price != null && p.price !== "" ? Number(p.price) : null
});

const brl = (n?: number | null) =>
  n == null || Number.isNaN(n) ? "" : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Lembra qual filtro funcionou (a coluna sku pode não existir em todas as bases)
let productFilterIdx = 0;

const ProductThumb: React.FC<{ src?: string }> = ({ src }) =>
  src ? (
    <img src={src} alt="" className="w-9 h-9 rounded-lg object-cover border border-slate-200 flex-shrink-0" />
  ) : (
    <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex-shrink-0" />
  );

const ProductSearchSelect: React.FC<{
  storeId: string;
  value: string;
  onChange: (id: string) => void;
  seed?: ProductItem[];
}> = ({ storeId, value, onChange, seed = [] }) => {
  const [selected, setSelected] = useState<ProductOpt | null>(null);
  const [changing, setChanging] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductOpt[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const reqRef = useRef(0);

  // Resolve o produto já vinculado (mesmo que esteja fora da lista carregada)
  useEffect(() => {
    if (!value) { setSelected(null); return; }
    if (selected?.id === String(value)) return;
    const local = seed.find((p) => String(p.id) === String(value));
    if (local) { setSelected(toProductOpt(local)); return; }
    let cancelled = false;
    (supabase as any)
      .from("products")
      .select("*")
      .eq("id", value)
      .maybeSingle()
      .then(({ data }: any) => {
        if (!cancelled) setSelected(data ? toProductOpt(data) : { id: String(value), label: "Produto não encontrado" });
      });
    return () => { cancelled = true; };
  }, [value, seed]);

  const runSearch = async (raw: string) => {
    const reqId = ++reqRef.current;
    setLoading(true);
    const q = raw.replace(/[,()%*\\]/g, " ").trim();
    const filters = q
      ? [
          `name.ilike.%${q}%,title.ilike.%${q}%,sku.ilike.%${q}%`,
          `name.ilike.%${q}%,title.ilike.%${q}%`,
          `name.ilike.%${q}%`,
          `title.ilike.%${q}%`
        ]
      : [""];
    let rows: any[] | null = null;
    for (let i = q ? productFilterIdx : 0; i < filters.length; i++) {
      let qb = (supabase as any).from("products").select("*").eq("store_id", storeId).limit(20);
      if (q) qb = qb.or(filters[i]);
      const { data, error } = await qb;
      if (!error) {
        rows = data || [];
        if (q) productFilterIdx = i;
        break;
      }
    }
    if (reqId !== reqRef.current) return;
    setResults((rows || []).map(toProductOpt));
    setActive(0);
    setLoading(false);
  };

  // Busca no servidor com debounce de 300 ms
  useEffect(() => {
    if (!open || !storeId) return;
    const timer = setTimeout(() => runSearch(query), query ? 300 : 0);
    return () => clearTimeout(timer);
  }, [query, open, storeId]);

  // Fecha ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const choose = (o: ProductOpt) => {
    setSelected(o);
    onChange(o.id);
    setOpen(false);
    setChanging(false);
    setQuery("");
  };

  const clear = () => {
    setSelected(null);
    onChange("");
    setChanging(false);
    setQuery("");
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, Math.max(results.length - 1, 0))); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (open && results[active]) choose(results[active]); }
    else if (e.key === "Escape") { setOpen(false); }
  };

  return (
    <div ref={boxRef} className="space-y-2">
      {selected && !changing ? (
        <div className="flex items-center gap-3 px-3 py-2.5 bg-sky-50/60 border border-sky-100 rounded-2xl">
          <ProductThumb src={selected.image} />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-slate-800 truncate">{selected.label}</div>
            {selected.price != null && <div className="text-[11px] font-semibold text-slate-500">{brl(selected.price)}</div>}
          </div>
          <button
            type="button"
            onClick={() => { setChanging(true); setOpen(true); }}
            className="text-[11px] font-bold text-[#0088ff] hover:underline cursor-pointer"
          >
            TROCAR
          </button>
          <button
            type="button"
            onClick={clear}
            title="Desvincular produto"
            className="p-1 text-slate-400 hover:text-red-600 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              onKeyDown={onKeyDown}
              placeholder="Buscar produto por nome ou SKU..."
              className="w-full pl-11 pr-10 py-2.5 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-[#0088ff] placeholder:text-slate-400"
            />
            {loading && <RefreshCw className="w-4 h-4 text-slate-400 animate-spin absolute right-4 top-1/2 -translate-y-1/2" />}
          </div>

          {open && (
            <div className="max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-sm">
              {!loading && results.length === 0 ? (
                <div className="px-4 py-5 text-center text-xs text-slate-400">Nenhum produto encontrado.</div>
              ) : (
                results.map((o, i) => (
                  <button
                    key={o.id}
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => choose(o)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left cursor-pointer border-b border-slate-100 last:border-b-0 ${
                      i === active ? "bg-sky-50" : "bg-white"
                    }`}
                  >
                    <ProductThumb src={o.image} />
                    <span className="flex-1 min-w-0 text-sm font-semibold text-slate-700 truncate">{o.label}</span>
                    {o.price != null && <span className="text-[11px] font-bold text-slate-500 flex-shrink-0">{brl(o.price)}</span>}
                  </button>
                ))
              )}
              {results.length >= 20 && (
                <div className="px-4 py-2 text-[10px] text-slate-400 bg-slate-50 border-t border-slate-100">
                  Mostrando 20 resultados. Digite para refinar a busca.
                </div>
              )}
            </div>
          )}

          {selected && changing && (
            <button
              type="button"
              onClick={() => { setChanging(false); setOpen(false); setQuery(""); }}
              className="text-[11px] font-bold text-slate-500 hover:underline cursor-pointer"
            >
              Cancelar
            </button>
          )}
        </>
      )}
    </div>
  );
};
export const BibliotecaTab: React.FC<BibliotecaTabProps> = ({ storeId: initialStoreId }) => {
  const [storeId, setStoreId] = useState<string>(initialStoreId || "");
  const [allVideos, setVideos] = useState<VidVideo[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<"TODOS" | "VIDEOS" | "IMAGENS">("TODOS");
  const [viewMode, setViewMode] = useState<"list" | "grid">(() => {
    try { return localStorage.getItem("vid_biblioteca_view") === "grid" ? "grid" : "list"; } catch { return "list"; }
  });
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [viewsMap, setViewsMap] = useState<Record<string, number>>({});
  useEffect(() => {
    try { localStorage.setItem("vid_biblioteca_view", viewMode); } catch {}
  }, [viewMode]);
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await (supabase as any).from("daily_video_metrics").select("video_id, views_count");
      if (!alive || error || !data) return;
      const m: Record<string, number> = {};
      for (const r of data as any[]) if (r.video_id) m[r.video_id] = (m[r.video_id] || 0) + (Number(r.views_count) || 0);
      setViewsMap(m);
    })();
    return () => { alive = false; };
  }, [videos.length]);

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

  // Edição
  const [editTitle, setEditTitle] = useState<string>("");
  const [editSourceType, setEditSourceType] = useState<string>("upload");
  const [editVideoUrl, setEditVideoUrl] = useState<string>("");
  const [editFileSize, setEditFileSize] = useState<number | null>(null);
  const [editThumbnailUrl, setEditThumbnailUrl] = useState<string>("");
  const [editProductId, setEditProductId] = useState<string>("");
  const [editModelId, setEditModelId] = useState<string>("");
  const [sizingModels, setSizingModels] = useState<{ id: string; name: string; type?: string }[]>([]);
  useEffect(() => {
    if (!storeId) { setSizingModels([]); return; }
    (supabase as any)
      .from("sizing_models")
      .select("id,name,type")
      .eq("store_id", storeId)
      .order("name", { ascending: true })
      .then(({ data }: any) => setSizingModels(data || []));
  }, [storeId]);
  const [editStatus, setEditStatus] = useState<string>("active");
  const [editHlsUrl, setEditHlsUrl] = useState<string>("");
  const [editStoryTitle, setEditStoryTitle] = useState<string>("");
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  // Inputs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editVideoFileRef = useRef<HTMLInputElement>(null);
  const editThumbFileRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [tiktokOpen, setTiktokOpen] = useState<boolean>(false);
  const [instagramOpen, setInstagramOpen] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState<boolean>(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState<boolean>(false);

  // Pastas
  const [folders, setFolders] = useState<{ id: string; name: string }[]>([]);
  const [activeFolder, setActiveFolder] = useState<string>("ALL");
  const [newFolderName, setNewFolderName] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const activeFolderId = activeFolder !== "ALL" && activeFolder !== "NONE" ? activeFolder : null;

  const videos = useMemo(
    () =>
      allVideos.filter((v) =>
        activeFolder === "ALL" ? true : activeFolder === "NONE" ? !v.folder_id : v.folder_id === activeFolder
      ),
    [allVideos, activeFolder]
  );

  const loadFolders = async () => {
    if (!storeId) return;
    const { data } = await vidlyticsDb.from("vid_folders").select("id,name").eq("store_id", storeId).order("name", { ascending: true });
    setFolders(data || []);
  };
  useEffect(() => { loadFolders(); }, [storeId]);

  const createFolder = async () => {
    const name = newFolderName.trim();
    if (!name || !storeId) return;
    const { data, error } = await vidlyticsDb.from("vid_folders").insert([{ store_id: storeId, name }]).select("id,name").single();
    if (error) {
      setErrorMsg(error.code === "23505" ? "Já existe uma pasta com esse nome." : error.message);
      return;
    }
    setFolders((p) => [...p, data].sort((a, b) => a.name.localeCompare(b.name)));
    setNewFolderName("");
    setActiveFolder(data.id);
    setSuccessMsg(`Pasta "${name}" criada.`);
  };

  const deleteFolder = async (f: { id: string; name: string }) => {
    if (!window.confirm(`Excluir a pasta "${f.name}"? Os arquivos NÃO serão apagados, apenas ficarão sem pasta.`)) return;
    const { error } = await vidlyticsDb.from("vid_folders").delete().eq("id", f.id);
    if (error) { setErrorMsg(error.message); return; }
    setFolders((p) => p.filter((x) => x.id !== f.id));
    setVideos((p) => p.map((v) => (v.folder_id === f.id ? { ...v, folder_id: null } : v)));
    if (activeFolder === f.id) setActiveFolder("ALL");
  };

  const moveSelected = async (folderId: string) => {
    const ids = videos.filter((v) => selectedIds.has(v.id)).map((v) => v.id);
    if (ids.length === 0) return;
    const target = folderId === "NONE" ? null : folderId;
    try {
      for (let i = 0; i < ids.length; i += 100) {
        const { error } = await vidlyticsDb.from("vid_videos").update({ folder_id: target }).in("id", ids.slice(i, i + 100));
        if (error) throw new Error(error.message);
      }
      setVideos((p) => p.map((v) => (ids.includes(v.id) ? { ...v, folder_id: target } : v)));
      setSelectedIds(new Set());
      setSuccessMsg(`${ids.length} ${ids.length === 1 ? "arquivo movido" : "arquivos movidos"} com sucesso!`);
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao mover arquivos.");
    }
  };

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
          .select("*")
          .eq("store_id", storeId)
          .limit(100);

        if (data) setProducts(data);
      } catch {
        // silencioso
      }
    }
    fetchProducts();
  }, [storeId]);

  // Garante que produtos vinculados fora dos 100 primeiros apareçam na tabela
  useEffect(() => {
    if (!storeId || allVideos.length === 0) return;
    const known = new Set(products.map((p) => String(p.id)));
    const missing = Array.from(
      new Set(
        allVideos
          .map((v) => v.product_id)
          .filter((id): id is string => !!id && !known.has(String(id)))
      )
    );
    if (missing.length === 0) return;
    let cancelled = false;
    (async () => {
      const extra: ProductItem[] = [];
      for (let i = 0; i < missing.length; i += 100) {
        const { data } = await (supabase as any)
          .from("products")
          .select("*")
          .eq("store_id", storeId)
          .in("id", missing.slice(i, i + 100));
        if (data) extra.push(...(data as ProductItem[]));
      }
      if (cancelled || extra.length === 0) return;
      setProducts((prev) => {
        const have = new Set(prev.map((p) => String(p.id)));
        return [...prev, ...extra.filter((p) => !have.has(String(p.id)))];
      });
    })();
    return () => { cancelled = true; };
  }, [allVideos, storeId, products]);
  // Carregar Mídias
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
        setVideos((data || []).map((v: any) => ({ ...v, video_url: v.video_url || v.hls_url || "", thumbnail_url: v.thumbnail_url || v.thumb_url || "" })));
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

  // Atualiza a lista enquanto houver vídeo em processamento no Bunny
  useEffect(() => {
    if (!storeId) return;
    const pending = allVideos.some((v) => v.status === "processing" || v.status === "uploading");
    if (!pending) return;
    const timer = setInterval(async () => {
      const { data } = await vidlyticsDb
        .from("vid_videos")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false });
      if (data) {
        setVideos(data.map((v: any) => ({
          ...v,
          video_url: v.video_url || v.hls_url || "",
          thumbnail_url: v.thumbnail_url || v.thumb_url || ""
        })));
      }
    }, 10000);
    return () => clearInterval(timer);
  }, [allVideos, storeId]);
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
    return allVideos.reduce((acc, item) => acc + (Number(item.file_size_bytes) || 0), 0);
  }, [allVideos]);

  const usedMB = (totalBytesUsed / (1024 * 1024)).toFixed(1);
  const [storageQuota, setStorageQuota] = useState<QuotaState | null>(null);
  useEffect(() => {
    if (!storeId) return;
    checkQuota(storeId, "storage").then(setStorageQuota).catch(() => setStorageQuota(null));
  }, [storeId, allVideos]);
  const { guard, blocked, showBlocked, close } = useQuotaGuard(storeId);
  const limitBytes = storageQuota?.limit ?? null;
  const limitLabel = !storageQuota
    ? "..."
    : limitBytes
      ? `${(limitBytes / GB_BYTES).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} GB`
      : "Ilimitado";
  const percentUsed = (limitBytes ? Math.min(100, (totalBytesUsed / limitBytes) * 100) : 0).toFixed(1);

  // Upload multiplo (ate 30 MB por arquivo) com validacao de cota do lote
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (files.length === 0) return;

    const tooBig = files.filter((f) => f.type.startsWith("image/") && f.size > MAX_FILE_BYTES);
    if (tooBig.length > 0) {
      setErrorMsg(`Limite de 30 MB por imagem. Excedem: ${tooBig.map((f) => f.name).join(", ")}`);
      return;
    }

    const batchBytes = files.reduce((a, f) => a + f.size, 0);
    const videoCount = files.filter((f) => !f.type.startsWith("image/")).length;
    if (!(await guard("storage", batchBytes))) return;
    if (videoCount > 0 && !(await guard("videos", videoCount))) return;

    setIsUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const targetStoreId = storeId || "00000000-0000-0000-0000-000000000000";
    let ok = 0;
    const failed: string[] = [];
    let quotaKind: string | null = null;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress(`${i + 1}/${files.length}`);
      const uploaded: string[] = [];
          try {
            if (file.type.startsWith("video/") && storeId) {
              const videoId = await uploadVideoToBunny(storeId, file, (pct) => setUploadProgress(`${i + 1}/${files.length} · ${pct}%`));
              if (activeFolderId) await vidlyticsDb.from("vid_videos").update({ folder_id: activeFolderId }).eq("bunny_video_id", videoId);
              ok++;
              continue;
            }
        const fileExt = file.name.split(".").pop();
        const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const fileName = `${targetStoreId}/${uniqueId}.${fileExt}`;

        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(fileName, file, { cacheControl: "3600", upsert: true });
        if (uploadErr) throw new Error(uploadErr.message);
        uploaded.push(uploadData.path);

        const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(uploadData.path);
        const publicUrl = urlData.publicUrl;

        let finalThumbnailUrl = publicUrl;
        let totalBytes = file.size;
        const isVideo = file.type.startsWith("video/") || ["mp4", "mov", "webm"].includes((fileExt || "").toLowerCase());

        if (isVideo) {
          try {
            const thumbBlob = await captureVideoThumbnail(file);
            const thumbFileName = `${targetStoreId}/thumbnails/${uniqueId}_thumb.jpg`;
            const { data: thumbData, error: thumbErr } = await supabase.storage
              .from(BUCKET_NAME)
              .upload(thumbFileName, thumbBlob, { contentType: "image/jpeg", upsert: true });
            if (!thumbErr && thumbData) {
              uploaded.push(thumbData.path);
              const { data: thumbUrlObj } = supabase.storage.from(BUCKET_NAME).getPublicUrl(thumbData.path);
              finalThumbnailUrl = thumbUrlObj.publicUrl;
              totalBytes += thumbBlob.size;
            }
          } catch (thumbGenErr) {
            console.warn("[BibliotecaTab] Não foi possível extrair thumbnail automática:", thumbGenErr);
          }
        }

        const payload: any = {
          store_id: storeId || null,
          title: file.name,
          video_url: publicUrl,
          thumbnail_url: finalThumbnailUrl,
          status: "active",
          active: true,
          file_size_bytes: totalBytes,
          video_source_type: isVideo ? "upload" : "image"
        };
        if (activeFolderId) payload.folder_id = activeFolderId;

        const { error: insertErr } = await vidlyticsDb.from("vid_videos").insert([payload]);
        if (insertErr) {
          const qk = quotaErrorKind(insertErr);
          if (qk) { quotaKind = qk as string; throw new Error("Cota excedida"); }
          throw new Error(insertErr.message);
        }
        ok++;
      } catch (err: any) {
        console.error("[BibliotecaTab] Falha no upload:", file.name, err);
        if (uploaded.length > 0) {
          await supabase.storage.from(BUCKET_NAME).remove(uploaded);
        }
        failed.push(file.name + (err?.message ? ` (${err.message})` : ""));
        if (quotaKind) break;
      }
    }

    setIsUploading(false);
    setUploadProgress("");
    if (ok > 0) setSuccessMsg(`${ok} ${ok === 1 ? "mídia enviada" : "mídias enviadas"} com sucesso!`);
    if (failed.length > 0 && !quotaKind) setErrorMsg(`Falha ao enviar: ${failed.join(", ")}`);
    await fetchVideos();
    if (quotaKind) showBlocked(quotaKind as any);
  };

  // Cadastrar URL Externa (YouTube Shorts, YouTube Normal ou MP4 externo)
  const handleSaveExternal = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = externalUrl.trim();
    if (!cleanUrl) return;

    try {
      if (!(await guard("videos", 1))) return;
        setIsSavingExternal(true);
      setErrorMsg(null);

      const ytId = extractYouTubeId(cleanUrl);
      let calculatedThumb = "";
      let sourceType = "external";

      if (ytId) {
        sourceType = "youtube";
        // Thumbnail de alta resolução oficial do YouTube
        calculatedThumb = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
      }

      const finalTitle = externalTitle.trim() || (ytId ? `YouTube Shorts ${ytId}` : `Mídia_${Date.now()}`);

      const payload: any = {
        store_id: storeId || null,
        title: finalTitle,
        video_url: cleanUrl,
        thumbnail_url: calculatedThumb,
        status: "active",
        active: true,
        file_size_bytes: 0,
        video_source_type: sourceType
      };

      if (activeFolderId) payload.folder_id = activeFolderId;
      if (externalProduct) payload.product_id = externalProduct;
      if (externalModel) payload.model_id = externalModel;

      const { error: insertErr } = await vidlyticsDb.from("vid_videos").insert([payload]);
      if (insertErr) {
          const qk = quotaErrorKind(insertErr);
          if (qk) { showBlocked(qk as any); return; }
          throw new Error(insertErr.message);
        }

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

  // Selecao multipla
  const selectedCount = videos.filter((v) => selectedIds.has(v.id)).length;

  const isAllSelected = () => filteredVideos.length > 0 && filteredVideos.every((v) => selectedIds.has(v.id));

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleSelectAll = () =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (filteredVideos.length > 0 && filteredVideos.every((v) => next.has(v.id))) {
        filteredVideos.forEach((v) => next.delete(v.id));
      } else {
        filteredVideos.forEach((v) => next.add(v.id));
      }
      return next;
    });

  const handleConfirmBulkDelete = async () => {
    const ids = videos.filter((v) => selectedIds.has(v.id)).map((v) => v.id);
    if (ids.length === 0) return;
    try {
      setIsBulkDeleting(true);
      setErrorMsg(null);
      for (let i = 0; i < ids.length; i += 100) {
        const { error } = await vidlyticsDb.from("vid_videos").delete().in("id", ids.slice(i, i + 100));
        if (error) throw new Error(error.message);
      }
      setVideos((prev) => prev.filter((v) => !ids.includes(v.id)));
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
      setSuccessMsg(`${ids.length} ${ids.length === 1 ? 'arquivo excluído' : 'arquivos excluídos'} com sucesso!`);
    } catch (err: any) {
      console.error("[BibliotecaTab] Erro ao excluir em massa:", err);
      setErrorMsg(err.message || "Erro ao excluir arquivos.");
      fetchVideos();
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Abrir Página de Edição (Print 3)
  const openEditPage = (video: VidVideo) => {
    setEditingVideo(video);
    setEditTitle(video.title || "");
    setEditSourceType(video.video_source_type || "upload");
    setEditVideoUrl(video.video_url || ""); setEditHlsUrl((video as any).hls_url || "");
    setEditFileSize(null);

    const ytId = extractYouTubeId(video.video_url);
    const fallbackThumb = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : "";
    setEditThumbnailUrl(video.thumbnail_url || fallbackThumb);

    setEditProductId(video.product_id || "");
    setEditModelId(video.model_id || "");
    setEditStatus(video.status || "active");
    setEditStoryTitle(video.story_title || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Upload de novo vídeo na página de edição
  const handleEditVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target) { alert("Para trocar o video, envie um novo na biblioteca e exclua o antigo."); e.target.value = ""; return; }
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 30 * 1024 * 1024) {
      alert("O arquivo de vídeo deve ter no máximo 30 MB.");
      return;
    }

    const diffBytes = Math.max(0, file.size - (Number(editingVideo?.file_size_bytes) || 0));
    if (diffBytes > 0 && !(await guard("storage", diffBytes))) {
      e.target.value = "";
      return;
    }

    try {
      const targetStoreId = storeId || "00000000-0000-0000-0000-000000000000";
      const fileExt = file.name.split(".").pop();
      const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const fileName = `${targetStoreId}/${uniqueId}.${fileExt}`;

      const { data, error } = await supabase.storage.from(BUCKET_NAME).upload(fileName, file, { upsert: true });
      if (error) throw error;

      const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(data.path);
      setEditVideoUrl(urlData.publicUrl);
      setEditSourceType("upload"); setEditHlsUrl("");
      setEditFileSize(file.size);

      // Gerar nova thumb
      try {
        const thumbBlob = await captureVideoThumbnail(file);
        const thumbFileName = `${targetStoreId}/thumbnails/${uniqueId}_thumb.jpg`;
        const { data: tData } = await supabase.storage.from(BUCKET_NAME).upload(thumbFileName, thumbBlob, {
          contentType: "image/jpeg",
          upsert: true
        });
        if (tData) {
          const { data: tUrl } = supabase.storage.from(BUCKET_NAME).getPublicUrl(tData.path);
          setEditThumbnailUrl(tUrl.publicUrl);
        }
      } catch (tErr) {
        console.warn("Falha ao gerar frame na edição:", tErr);
      }
    } catch (err: any) {
      alert(`Falha ao subir novo vídeo: ${err.message}`);
    }
  };

  // Upload de thumbnail customizada na página de edição
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

  // Salvar Alterações da Edição
  const handleSavePageEdit = async () => {
    if (!editingVideo) return;

    try {
      setIsSavingEdit(true);
      setErrorMsg(null);

      const ytId = extractYouTubeId(editVideoUrl);
      let finalThumb = editThumbnailUrl;
      if (!finalThumb && ytId) {
        finalThumb = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
      }

      const payload: any = {
        title: editTitle.trim(),
        video_source_type: ytId ? "youtube" : editSourceType,
        video_url: editVideoUrl.trim(),
        thumbnail_url: finalThumb.trim(),
        product_id: editProductId || null,
        model_id: editModelId || null,
        status: editStatus,
        updated_at: new Date().toISOString()
      };

      if (editFileSize !== null) payload.file_size_bytes = editFileSize;
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
    const ytId = extractYouTubeId(editVideoUrl);

    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-16">
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
              <option value="youtube">YouTube / YouTube Shorts</option>
              <option value="external">URL Externa</option>
              {editSourceType === "tiktok" && <option value="tiktok">TikTok (embed)</option>}
            </select>
          </div>

          {/* ARQUIVO DE VÍDEO */}
          <div>
            <label className="block text-[11px] font-extrabold text-slate-400 mb-2 uppercase tracking-wider">
              ARQUIVO DE VÍDEO / URL
            </label>
            {editSourceType === "tiktok" && (
              <div className="p-3.5 bg-sky-50/70 border border-sky-200/70 rounded-2xl text-xs text-sky-900 mb-4">
                Este vídeo usa o player do TikTok (com ícones nativos). Para o nosso player limpo, baixe o vídeo no app do TikTok (Salvar vídeo) e envie o MP4 em <strong>Escolher arquivo</strong>.
              </div>
            )}

            {!ytId && (
              <div className="p-3.5 bg-amber-50/70 border border-amber-200/70 rounded-2xl flex items-center gap-2.5 text-xs text-amber-900 mb-4">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>
                  O arquivo de vídeo deve ter no <strong>máximo 30 MB</strong>. Formatos aceitos: MP4, MOV e WEBM.
                </span>
              </div>
            )}

            <div className="space-y-4">
              {!ytId && (
                <>
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
                    <span className="text-xs text-slate-400">Trocar arquivo de vídeo</span>
                  </div>
                </>
              )}

              {/* Preview no card de edição */}
              <div className="w-36 aspect-[9/16] rounded-2xl bg-black overflow-hidden relative border border-slate-200 shadow-sm flex items-center justify-center">
                {ytId ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${ytId}`}
                    title={editTitle}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : isImg ? (
                  <img src={editVideoUrl} alt="" className="w-full h-full object-cover" />
                ) : (editSourceType === "tiktok" || /tiktok\.com\/(player|embed)/i.test(editVideoUrl)) ? (
                  <iframe
                    src={editVideoUrl}
                    title={editTitle}
                    className="w-full h-full border-0"
                    allow="autoplay; fullscreen; encrypted-media"
                    allowFullScreen
                  />
                ) : (
                  editHlsUrl ? (
                      <HlsPlayer src={editHlsUrl} poster={editThumbnailUrl} className="w-full h-full object-cover" />
                    ) : (
                      <video src={editVideoUrl} poster={editThumbnailUrl} controls className="w-full h-full object-cover" />
                    )
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
              <div className="w-20 h-28 rounded-2xl bg-slate-900 border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                {editThumbnailUrl ? (
                  <img
                    src={editThumbnailUrl}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback se a imagem der erro
                      if (ytId) {
                        (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
                      }
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500 text-[10px] text-center p-1">
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
                  <span className="text-xs text-slate-400">Trocar imagem da capa</span>
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
            <ProductSearchSelect storeId={storeId} value={editProductId} onChange={setEditProductId} seed={products} />
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
{sizingModels.map((m) => (<option key={m.id} value={m.id}>{m.name} ({m.type === "objeto" ? "Objeto" : "Humano"})</option>))}
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
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <PageTour tourKey="vidlytics-biblioteca" steps={BIBLIOTECA_TOUR} />
        <TourTagger rules={BIBLIOTECA_TAGS} />
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Biblioteca</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Gerencie os vídeos e imagens hospedados no seu plano e monitore o consumo de espaço.
          </p>
        </div>

        <div data-tour="bi-acoes" className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full xl:w-auto xl:flex-shrink-0">
          <button
            type="button"
            className="h-10 w-full xl:w-[140px] px-3 bg-white border border-slate-200 text-slate-700 rounded-2xl hover:bg-slate-50 hover:border-slate-300 text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition whitespace-nowrap cursor-pointer"
            onClick={async () => { if (await guard("videos", 1)) setInstagramOpen(true); }}
          >
            <IconInstagram className="w-4 h-4 flex-shrink-0" />
            INSTAGRAM
          </button>

          <>
<button
            type="button"
            className="h-10 w-full xl:w-[140px] px-3 bg-white border border-slate-200 text-slate-700 rounded-2xl hover:bg-slate-50 hover:border-slate-300 text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition whitespace-nowrap cursor-pointer"
            onClick={async () => { if (await guard("videos", 1)) setTiktokOpen(true); }}
          >
            <IconTikTok className="w-4 h-4 flex-shrink-0 text-slate-900" />
            TIKTOK
          </button>
<QuotaUpgradeModal state={blocked} onClose={close} onManage={close} />
{tiktokOpen && (<TikTokImportModal storeId={storeId} onClose={() => { setTiktokOpen(false); fetchVideos(); }} />)}
{instagramOpen && (<InstagramImportModal storeId={storeId} onClose={() => { setInstagramOpen(false); fetchVideos(); }} />)}
</>

          <button
            type="button"
            onClick={() => setIsUrlModalOpen(true)}
            className="h-10 w-full xl:w-[140px] px-3 bg-white border border-slate-200 text-slate-700 rounded-2xl hover:bg-slate-50 hover:border-slate-300 text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition whitespace-nowrap cursor-pointer"
          >
            <Globe className="w-4 h-4 flex-shrink-0 text-sky-500" />
            URL EXTERNA
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/webm,image/*"
            className="hidden"
            multiple
            onChange={handleFileUpload}
          />

          <button
            type="button"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="h-10 w-full xl:w-[160px] px-3 bg-[#0088ff] hover:bg-[#0077e6] text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm shadow-sky-200 transition whitespace-nowrap disabled:opacity-50 cursor-pointer"
          >
            {isUploading ? (
              <RefreshCw className="w-4 h-4 flex-shrink-0 animate-spin" />
            ) : (
              <UploadCloud className="w-4 h-4 flex-shrink-0" />
            )}
            {isUploading ? `ENVIANDO ${uploadProgress}` : "FAZER UPLOAD"}
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
                  {limitLabel} LIMITE
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Uso atual: <span className="font-bold text-slate-800">{usedMB} MB</span> de {limitLabel}
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

      {/* Pastas */}
      <div className="p-4 bg-white border border-slate-200/80 rounded-3xl shadow-sm space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {[{ id: "ALL", name: "Todas" }, { id: "NONE", name: "Sem pasta" }, ...folders].map((f) => {
            const real = f.id !== "ALL" && f.id !== "NONE";
            const count =
              f.id === "ALL"
                ? allVideos.length
                : f.id === "NONE"
                ? allVideos.filter((v) => !v.folder_id).length
                : allVideos.filter((v) => v.folder_id === f.id).length;
            const on = activeFolder === f.id;
            return (
              <span
                key={f.id}
                onClick={() => { setActiveFolder(f.id); setSelectedIds(new Set()); }}
                className={`inline-flex items-center gap-1.5 pl-3.5 pr-2 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition ${
                  on ? "bg-[#0088ff] text-white shadow-sm" : "bg-slate-100/70 text-slate-600 hover:text-slate-900"
                }`}
              >
                {f.name}
                <span className="opacity-70">{count}</span>
                {real ? (
                  <button
                    type="button"
                    title="Excluir pasta"
                    onClick={(ev) => { ev.stopPropagation(); deleteFolder(f); }}
                    className="p-0.5 opacity-70 hover:opacity-100 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                ) : (
                  <span className="w-1" />
                )}
              </span>
            );
          })}

          <form
            onSubmit={(ev) => { ev.preventDefault(); createFolder(); }}
            className="inline-flex items-center gap-1.5 ml-auto"
          >
            <input
              value={newFolderName}
              onChange={(ev) => setNewFolderName(ev.target.value)}
              maxLength={60}
              placeholder="Nova pasta (ex.: Óculos)"
              className="w-48 px-3 py-1.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-[#0088ff]"
            />
            <button
              type="submit"
              disabled={!newFolderName.trim()}
              className="px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold disabled:opacity-40 cursor-pointer"
            >
              CRIAR
            </button>
          </form>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-slate-400">
            Novos uploads vão para: <b className="text-slate-600">{activeFolderId ? folders.find((f) => f.id === activeFolderId)?.name : "Sem pasta"}</b>
            {" "}· máx. 30 MB por arquivo · você pode selecionar vários arquivos de uma vez
          </p>
          {selectedCount > 0 && (
            <select
              value=""
              onChange={(ev) => { if (ev.target.value) moveSelected(ev.target.value); }}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
            >
              <option value="">Mover {selectedCount} selecionado(s) para…</option>
              <option value="NONE">Sem pasta</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>
      {/* Busca e Abas Filtros */}
      <div className="p-4 bg-white border border-slate-200/80 rounded-3xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-[480px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            data-tour="bi-pesquisa" placeholder="Pesquisar pelo nome do arquivo..."
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
      <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {filteredVideos.length} MÍDIAS LISTADAS
            <label className="ml-4 inline-flex items-center gap-2 cursor-pointer normal-case font-semibold">
              <input type="checkbox" checked={isAllSelected()} onChange={toggleSelectAll} className="h-4 w-4 cursor-pointer accent-[#0094eb]" />
              Selecionar todos
            </label>
            {selectedCount > 0 && (
              <button
                type="button"
                onClick={() => setBulkDeleteOpen(true)}
                className="ml-3 inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1 text-xs font-bold normal-case text-white hover:bg-rose-700 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Excluir selecionados ({selectedCount})
              </button>
            )}
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchVideos}
              disabled={loading}
              className="text-xs text-[#0088ff] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </button>
            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                title="Grade"
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg cursor-pointer transition ${viewMode === "grid" ? "bg-white text-[#0088ff] shadow-sm" : "text-slate-400 hover:text-slate-700"}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                title="Lista"
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-lg cursor-pointer transition ${viewMode === "list" ? "bg-white text-[#0088ff] shadow-sm" : "text-slate-400 hover:text-slate-700"}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {(() => {
          if (loading) {
            return (
              <div className="py-20 text-center">
                <RefreshCw className="w-8 h-8 animate-spin text-[#0088ff] mx-auto mb-2" />
                <p className="text-sm text-slate-500">Carregando mídias...</p>
              </div>
            );
          }
          if (filteredVideos.length === 0) {
            return (
              <div className="py-20 text-center p-6">
                <UploadCloud className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-700">Nenhuma mídia encontrada</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Faça upload ou adicione mídias por URL externa para começar.
                </p>
              </div>
            );
          }

          const meta = (v: any) => {
            const isImg = isImageFile(v.video_url);
            const ytId = extractYouTubeId(v.video_url);
            const thumb: string =
              v.thumbnail_url || v.thumb_url || (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : "") || (isImg ? v.video_url : "");
            const type = ytId
              ? "YOUTUBE SHORTS"
              : isImg
              ? "IMAGEM (HOSPEDADA)"
              : v.video_source_type === "external"
              ? "VÍDEO (URL EXTERNA)"
              : v.video_source_type === "tiktok"
              ? "TIKTOK"
              : v.video_source_type === "instagram" || /\/ig_\d+\.mp4/.test(String(v.video_url || ""))
              ? "INSTAGRAM"
              : "VÍDEO MP4 (HOSPEDADO)";
            return {
              isImg,
              thumb,
              type,
              views: viewsMap[v.id] ?? 0,
              dur: fmtDuration(v.duration_seconds),
              size: fmtMB(v.size_bytes ?? v.file_size_bytes),
              st: statusInfo(v.status),
              product: products.find((p) => p.id === v.product_id),
            };
          };

          const renderThumb = (v: any, m: any, cls: string) => (
            <div className={`${cls} bg-slate-900 overflow-hidden relative flex items-center justify-center flex-shrink-0`}>
              {m.thumb ? (
                <img src={m.thumb} alt={v.title} loading="lazy" className="w-full h-full object-cover" />
              ) : (
                <Play className="w-4 h-4 text-white" />
              )}
              {!m.isImg && m.thumb && (
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none">
                  <Play className="w-3.5 h-3.5 text-white fill-white" />
                </div>
              )}
            </div>
          );

          if (viewMode === "list") {
            return (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/60 border-b border-slate-100 text-slate-400 font-extrabold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 pl-6 pr-0 w-8"><input type="checkbox" checked={isAllSelected()} onChange={toggleSelectAll} className="h-4 w-4 cursor-pointer accent-[#0094eb]" /></th>
                      <th className="py-3.5 px-4">NOME DO ARQUIVO</th>
                      <th className="py-3.5 px-4">PRODUTO</th>
                      <th className="py-3.5 px-4">STORY VINCULADO</th>
                      <th className="py-3.5 px-4">DURAÇÃO</th>
                      <th className="py-3.5 px-4">TAMANHO</th>
                      <th className="py-3.5 px-4">VIEWS</th>
                      <th className="py-3.5 px-4">STATUS</th>
                      <th className="py-3.5 px-6 text-right">AÇÕES</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredVideos.map((video) => {
                      const m = meta(video);
                      return (
                        <tr key={video.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 pl-6 pr-0 w-8">
                            <input type="checkbox" checked={selectedIds.has(video.id)} onChange={() => toggleSelect(video.id)} className="h-4 w-4 cursor-pointer accent-[#0094eb]" />
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              {renderThumb(video, m, "w-16 h-10 rounded-lg border border-slate-200/60")}
                              <div className="min-w-0">
                                <div className="font-bold text-slate-800 text-[13px] line-clamp-1 max-w-[280px]" title={video.title}>{video.title}</div>
                                <div className="text-[10px] font-bold text-[#0088ff] uppercase tracking-wider mt-0.5">{m.type}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {m.product ? (
                              <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-slate-700 text-xs font-medium max-w-[180px]">
                                {m.product.thumbnail || m.product.image_url ? (
                                  <img src={m.product.thumbnail || m.product.image_url} alt="" className="w-4 h-4 rounded-full object-cover" />
                                ) : null}
                                <span className="truncate">{m.product.name || m.product.title}</span>
                              </div>
                            ) : (
                              <span className="inline-block px-3 py-1 bg-slate-100 rounded-full text-slate-400 text-[11px] font-medium">Sem produto</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {video.story_title ? (
                              <span className="inline-block px-3 py-0.5 bg-sky-50 text-[#0088ff] border border-sky-100 rounded-full text-[11px] font-bold uppercase">{video.story_title}</span>
                            ) : (
                              <span className="text-slate-300 font-bold text-sm">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-600">{m.dur}</td>
                          <td className="py-3 px-4 font-semibold text-slate-600">{m.size}</td>
                          <td className="py-3 px-4 font-semibold text-slate-600">{m.views.toLocaleString("pt-BR")}</td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 border rounded-full text-[11px] font-bold ${m.st.cls}`}>
                              <CheckCircle className="w-3.5 h-3.5" />
                              {m.st.label}
                            </span>
                          </td>
                          <td className="py-3 px-6 text-right">
                            <div className="inline-flex items-center gap-2 text-slate-400">
                              <button onClick={() => openEditPage(video)} className="p-1 hover:text-slate-700 transition cursor-pointer" title="Editar">
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button onClick={() => setPreviewMedia(video)} className="p-1 hover:text-slate-700 transition cursor-pointer" title="Visualizar">
                                <Eye className="w-4 h-4" />
                              </button>
                              {video.video_url && (
                                isExternalMedia(video) ? (
                                  <a href={video.video_url} target="_blank" rel="noreferrer" className="p-1 hover:text-slate-700 transition" title="Abrir link">
                                    <Download className="w-4 h-4" />
                                  </a>
                                ) : (
                                  <button type="button" onClick={() => downloadMedia(video)} className="p-1 hover:text-slate-700 transition cursor-pointer" title="Baixar arquivo">
                                    <Download className="w-4 h-4" />
                                  </button>
                                )
                              )}
                              <button onClick={() => openDeleteModal(video)} className="p-1 hover:text-red-600 transition cursor-pointer" title="Excluir">
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
            );
          }

          return (
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredVideos.map((video) => {
                const m = meta(video);
                const open = menuOpenId === video.id;
                const menuItem = "w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer text-left";
                return (
                  <div key={video.id} className={`relative bg-white border rounded-2xl shadow-sm ${selectedIds.has(video.id) ? "border-[#0094eb] ring-2 ring-sky-100" : "border-slate-200/80"}`}>
                    <div className="relative">
                      {renderThumb(video, m, "w-full aspect-video rounded-t-2xl")}
                      <div className="absolute top-2 left-2 flex items-center gap-1.5">
                        <span className="bg-white/90 rounded-md p-1 flex">
                          <input type="checkbox" checked={selectedIds.has(video.id)} onChange={() => toggleSelect(video.id)} className="h-3.5 w-3.5 cursor-pointer accent-[#0094eb]" />
                        </span>
                        <span className="bg-white/90 text-slate-700 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                          {m.views.toLocaleString("pt-BR")} views
                        </span>
                      </div>
                      <div className="absolute top-2 right-2">
                        <button
                          type="button"
                          onClick={() => setMenuOpenId(open ? null : video.id)}
                          className="bg-white/90 hover:bg-white rounded-full w-7 h-7 flex items-center justify-center text-slate-600 cursor-pointer"
                          title="Ações"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        {open && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setMenuOpenId(null)} />
                            <div className="absolute right-0 top-9 z-20 w-40 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                              <button className={menuItem} onClick={() => { setMenuOpenId(null); openEditPage(video); }}>
                                <Edit2 className="w-3.5 h-3.5" /> Editar
                              </button>
                              <button className={menuItem} onClick={() => { setMenuOpenId(null); setPreviewMedia(video); }}>
                                <Eye className="w-3.5 h-3.5" /> Visualizar
                              </button>
                              {video.video_url && (
                                isExternalMedia(video) ? (
                                  <a href={video.video_url} target="_blank" rel="noreferrer" className={menuItem} onClick={() => setMenuOpenId(null)}>
                                    <Download className="w-3.5 h-3.5" /> Abrir link
                                  </a>
                                ) : (
                                  <button className={menuItem} onClick={() => { setMenuOpenId(null); downloadMedia(video); }}>
                                    <Download className="w-3.5 h-3.5" /> Baixar
                                  </button>
                                )
                              )}
                              <button className={`${menuItem} text-red-600 hover:bg-red-50`} onClick={() => { setMenuOpenId(null); openDeleteModal(video); }}>
                                <Trash2 className="w-3.5 h-3.5" /> Excluir
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="p-3 space-y-2">
                      <div className="font-bold text-[13px] text-[#0b5fc4] line-clamp-2 min-h-[2.5rem]" title={video.title}>{video.title}</div>
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                        <span>{m.dur}</span>
                        <span>{m.size}</span>
                        <span className={`px-2 py-0.5 border rounded-full text-[10px] font-bold ${m.st.cls}`}>{m.st.label}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-block px-2.5 py-0.5 bg-slate-100 rounded-full text-slate-500 text-[10px] font-medium max-w-full truncate">
                          {m.product ? (m.product.name || m.product.title) : "Sem produto"}
                        </span>
                        {video.story_title && (
                          <span className="inline-block px-2.5 py-0.5 bg-sky-50 text-[#0088ff] border border-sky-100 rounded-full text-[10px] font-bold uppercase max-w-full truncate">
                            {video.story_title}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* ========================================================= */}
      {/* MODAL: PLAYER DE PREVIEW COM SUPORTE A YOUTUBE E MP4      */}
      {/* ========================================================= */}
      {previewMedia && (() => {
        const ytId = extractYouTubeId(previewMedia.video_url);
        const isImg = isImageFile(previewMedia.video_url);
        const isTT = previewMedia.video_source_type === "tiktok" || /tiktok\.com\/(player|embed)/i.test(previewMedia.video_url || "");

        return (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-[32px] max-w-sm w-full p-6 shadow-2xl relative border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
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

              {/* Player 9:16 Responsivo */}
              <div className="aspect-[9/16] w-full rounded-[24px] bg-black overflow-hidden relative border border-slate-900 shadow-inner flex items-center justify-center mb-5">
                {ytId ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${ytId}?autoplay=1&playsinline=1&rel=0`}
                    title={previewMedia.title}
                    className="w-full h-full border-0 rounded-[24px]"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : isImg ? (
                  <img
                    src={previewMedia.video_url}
                    alt={previewMedia.title}
                    className="w-full h-full object-cover"
                  />
                ) : isTT ? (
                  <iframe
                    src={previewMedia.video_url}
                    title={previewMedia.title}
                    className="w-full h-full border-0 rounded-[24px]"
                    allow="autoplay; fullscreen; encrypted-media"
                    allowFullScreen
                  />
                ) : (
                  (previewMedia as any).hls_url ? (
                      <HlsPlayer src={(previewMedia as any).hls_url} poster={previewMedia.thumbnail_url} autoPlay className="w-full h-full object-cover" />
                    ) : (
                      <video src={previewMedia.video_url} poster={previewMedia.thumbnail_url} controls autoPlay playsInline className="w-full h-full object-cover" />
                    )
                )}
              </div>

              <button
                onClick={() => setPreviewMedia(null)}
                className="w-full py-3.5 bg-[#0088ff] hover:bg-[#0077e6] text-white font-extrabold text-xs tracking-wider uppercase rounded-2xl shadow-sm shadow-sky-200 transition cursor-pointer"
              >
                FECHAR
              </button>
            </div>
          </div>
        );
      })()}

      {/* MODAL: ADICIONAR VÍDEO POR URL */}
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
                  placeholder="https://youtube.com/shorts/... ou https://youtu.be/... ou MP4 direto"
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
                <ProductSearchSelect storeId={storeId} value={externalProduct} onChange={setExternalProduct} seed={products} />
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
{sizingModels.map((m) => (<option key={m.id} value={m.id}>{m.name} ({m.type === "objeto" ? "Objeto" : "Humano"})</option>))}
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

      <ConfirmDeleteModal
        isOpen={bulkDeleteOpen}
        onClose={() => { if (!isBulkDeleting) setBulkDeleteOpen(false); }}
        onConfirm={handleConfirmBulkDelete}
        title="EXCLUIR ARQUIVOS SELECIONADOS"
        itemName={`${selectedCount} ${selectedCount === 1 ? 'arquivo selecionado' : 'arquivos selecionados'}`}
        isDeleting={isBulkDeleting}
      />

      {/* MODAL GLOBAL DE EXCLUSÃO */}
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

