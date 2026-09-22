import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  BarChart2,
  DollarSign,
  Play,
  FolderOpen,
  ShoppingBag,
  MessageSquare,
  Palette,
  ArrowLeft,
  Layers,
  ChevronDown,
  Search,
  UploadCloud,
  Link2,
  Video,
  Image as ImageIcon,
  Edit2,
  Eye,
  Download,
  Trash2,
  ShieldCheck,
  CheckCircle,
  X,
  Headphones,
  Check
} from "lucide-react";

// Ícones SVG para marcas sociais (evita incompatibilidades de pacotes)
const InstagramIcon = () => (
  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

const TikTokIcon = () => (
  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-1.01-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
  </svg>
);

export default function Vidlytics() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("comments"); // Inicial padrão em Comentários para visualização imediata
  const [moduleMenuOpen, setModuleMenuOpen] = useState(false);

  // Estados - Aba Biblioteca
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const [libraryType, setLibraryType] = useState<"all" | "videos" | "images">("all");
  const [searchMedia, setSearchMedia] = useState("");
  const storageUsage = { used: 10.3, total: 50 };
  const [mediaItems, setMediaItems] = useState([
    {
      id: "med-1",
      name: "oculos-de-sol.mp4",
      format: "VÍDEO MP4 (HOSPEDADO)",
      thumb: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=120&q=80",
      product: null,
      story: null,
      size: "8.3 MB",
      status: "DISPONÍVEL"
    },
    {
      id: "med-2",
      name: "Criação_de_Vídeo_Fashion_Editorial_Luxo.mp4",
      format: "VÍDEO MP4 (HOSPEDADO)",
      thumb: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=120&q=80",
      product: { name: "Blusa Confort - Verde", thumb: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=80&q=80" },
      story: "TESTE",
      size: "2.0 MB",
      status: "DISPONÍVEL"
    }
  ]);
  const [externalUrl, setExternalUrl] = useState("");
  const [mediaTitle, setMediaTitle] = useState("");
  const [linkedProduct, setLinkedProduct] = useState("Sem produto vinculado");
  const [linkedMeasureModel, setLinkedMeasureModel] = useState("Sem modelo de medidas vinculado");

  // Estados - Aba Comentários
  const [autoApprove, setAutoApprove] = useState(false);
  const [commentSearch, setCommentSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [videoFilter, setVideoFilter] = useState("all");
  const [commentsList, setCommentsList] = useState([
    {
      id: "c-1",
      author: "Rodrigo Cel",
      role: "Cliente",
      avatarBg: "bg-[#0094eb]",
      avatarLetter: "R",
      content: "Teste❤️",
      videoName: "Criação_de_Vídeo_Fashion_Editorial_Luxo.mp4",
      status: "PENDENTE"
    },
    {
      id: "c-2",
      author: "www",
      role: "Cliente",
      avatarBg: "bg-[#0094eb]",
      avatarLetter: "W",
      content: "eweewee",
      videoName: "Criação_de_Vídeo_Fashion_Editorial_Luxo.mp4",
      status: "PENDENTE"
    }
  ]);

  const handleAddExternalUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!externalUrl) {
      alert("Preencha a URL externa");
      return;
    }
    const newMedia = {
      id: "med-" + Date.now(),
      name: mediaTitle || "Vídeo Externo",
      format: "VÍDEO EXTERNO",
      thumb: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=120&q=80",
      product: linkedProduct !== "Sem produto vinculado" ? { name: linkedProduct, thumb: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=80&q=80" } : null,
      story: null,
      size: "URL Externa",
      status: "DISPONÍVEL"
    };
    setMediaItems([newMedia, ...mediaItems]);
    setIsUrlModalOpen(false);
    setExternalUrl("");
    setMediaTitle("");
  };

  const handleDeleteComment = (id: string) => {
    setCommentsList(commentsList.filter(c => c.id !== id));
  };

  const handleApproveComment = (id: string) => {
    setCommentsList(commentsList.map(c => c.id === id ? { ...c, status: "APROVADO" } : c));
  };

  const filteredComments = commentsList.filter(c => {
    const matchText = c.content.toLowerCase().includes(commentSearch.toLowerCase()) || 
                      c.author.toLowerCase().includes(commentSearch.toLowerCase());
    const matchStatus = statusFilter === "all" ? true : c.status.toLowerCase() === statusFilter.toLowerCase();
    const matchVideo = videoFilter === "all" ? true : c.videoName === videoFilter;
    return matchText && matchStatus && matchVideo;
  });

  const storagePercent = ((storageUsage.used / storageUsage.total) * 100).toFixed(1);

  const filteredMedia = mediaItems.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(searchMedia.toLowerCase());
    const matchType =
      libraryType === "all" ? true :
      libraryType === "videos" ? item.format.includes("VÍDEO") :
      item.format.includes("IMAGEM");
    return matchSearch && matchType;
  });

  const modules = [
    { name: "Vidlytics Stories", path: "/vidlytics", current: true },
    { name: "Live Commerce", path: "/live-commerce", current: false },
    { name: "Checkout Transparente", path: "/checkout", current: false },
    { name: "Consultor IA", path: "/consultor-ia", current: false },
    { name: "Prova Social", path: "/prova-social", current: false },
  ];

  const tabs = [
    { id: "overview", label: "Visão Geral", icon: BarChart2 },
    { id: "results", label: "Resultados", icon: DollarSign },
    { id: "stories", label: "Stories", icon: Play },
    { id: "library", label: "Biblioteca", icon: FolderOpen },
    { id: "products", label: "Produtos", icon: ShoppingBag },
    { id: "comments", label: "Comentários", icon: MessageSquare },
    { id: "appearance", label: "Aparência", icon: Palette },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-between font-sans">
      {/* HEADER FIXO SUPERIOR */}
      <header className="sticky top-0 z-40 bg-white shadow-xs border-b border-slate-200/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between">
          <button 
            onClick={() => navigate("/")}
            className="flex items-center gap-2.5 text-slate-600 hover:text-slate-900 transition-colors"
            title="Voltar ao Hub Central"
          >
            <img src="/assets/sll-logotipo-ico.png" alt="SLL" className="h-8 w-8 object-contain" onError={(e) => {(e.target as any).style.display='none';}} />
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
              <span>Voltar ao Hub Central</span>
            </div>
          </button>

          <div className="relative">
            <button
              onClick={() => setModuleMenuOpen(!moduleMenuOpen)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold hover:bg-slate-100 transition-colors"
            >
              <Layers className="w-3.5 h-3.5 text-[#0094eb]" />
              <span>Módulo: <strong>Vidlytics Stories</strong></span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
            </button>
            {moduleMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 z-50 py-1">
                {modules.map((m, i) => (
                  <button
                    key={i}
                    onClick={() => { setModuleMenuOpen(false); if (!m.current) navigate(m.path); }}
                    className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition-colors ${
                      m.current ? "bg-blue-50 text-[#0094eb] font-bold" : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span>{m.name}</span>
                    {m.current && <span className="w-1.5 h-1.5 rounded-full bg-[#0094eb]" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* BARRA DE NAVEGAÇÃO DE ABAS */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 overflow-x-auto">
          <nav className="flex space-x-2 border-t border-slate-100 pt-1 pb-0.5">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                    isActive 
                      ? "border-[#0094eb] text-[#0094eb]" 
                      : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full space-y-6">

        {/* ABA: COMENTÁRIOS */}
        {activeTab === "comments" && (
          <div className="space-y-6">
            {/* Título & Descrição */}
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Comentários</h1>
              <p className="text-xs text-slate-500 mt-1">
                Gerencie a interação dos clientes nos seus stories, responda dúvidas e modere comentários públicos.
              </p>
            </div>

            {/* Top Cards: Moderação & Filtros */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Card 1: Moderação de Conteúdo */}
              <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0094eb] flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">Moderação de Conteúdo</h2>
                    <p className="text-[11px] text-slate-400">Controle de publicação na loja.</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      {autoApprove ? "Aprovação automática ativada" : "Aprovação automática desativada"}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {autoApprove ? "Comentários entram na loja direto." : "Requer aprovação prévia."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAutoApprove(!autoApprove)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      autoApprove ? "bg-[#0094eb]" : "bg-slate-200"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        autoApprove ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Card 2: Filtros & Busca */}
              <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Filtros & Busca</span>
                  <span className="px-3 py-1 bg-blue-50 text-[#0094eb] rounded-full text-[11px] font-bold uppercase tracking-wider">
                    {filteredComments.length} Comentários
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                  <div className="relative sm:col-span-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Pesquisar autor ou texto..."
                      value={commentSearch}
                      onChange={(e) => setCommentSearch(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0094eb]/20"
                    />
                  </div>
                  <div>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0094eb]/20"
                    >
                      <option value="all">Todos os Status</option>
                      <option value="pendente">Pendente</option>
                      <option value="aprovado">Aprovado</option>
                    </select>
                  </div>
                  <div>
                    <select
                      value={videoFilter}
                      onChange={(e) => setVideoFilter(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0094eb]/20"
                    >
                      <option value="all">Todos os Vídeos</option>
                      <option value="Criação_de_Vídeo_Fashion_Editorial_Luxo.mp4">Criação_de_Vídeo_Fashion...</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabela de Comentários */}
            <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/70 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-3.5">Autor</th>
                      <th className="px-6 py-3.5">Conteúdo / Vídeo</th>
                      <th className="px-6 py-3.5 text-center">Status</th>
                      <th className="px-6 py-3.5 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredComments.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-10 text-slate-400 text-xs">
                          Nenhum comentário encontrado para os filtros selecionados.
                        </td>
                      </tr>
                    ) : (
                      filteredComments.map((comment) => (
                        <tr key={comment.id} className="hover:bg-slate-50/60 transition-colors">
                          {/* Coluna Autor */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-full ${comment.avatarBg} text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs`}>
                                {comment.avatarLetter}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 leading-tight">{comment.author}</p>
                                <span className="text-[10px] text-slate-400">{comment.role}</span>
                              </div>
                            </div>
                          </td>

                          {/* Coluna Conteúdo / Vídeo */}
                          <td className="px-6 py-4 space-y-1">
                            <p className="text-slate-800 font-medium">
                              "{comment.content}"
                            </p>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                              VÍDEO: <span className="text-[#0094eb] lowercase">{comment.videoName}</span>
                            </p>
                          </td>

                          {/* Coluna Status */}
                          <td className="px-6 py-4 text-center">
                            {comment.status === "PENDENTE" ? (
                              <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-amber-50 text-amber-600 border border-amber-200/70">
                                PENDENTE
                              </span>
                            ) : (
                              <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-50 text-emerald-600 border border-emerald-200/70">
                                APROVADO
                              </span>
                            )}
                          </td>

                          {/* Coluna Ações */}
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2 text-slate-400">
                              {comment.status === "PENDENTE" && (
                                <button
                                  onClick={() => handleApproveComment(comment.id)}
                                  title="Aprovar Comentário"
                                  className="p-1.5 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => alert(`Responder comentário de ${comment.author}`)}
                                title="Responder / Detalhes"
                                className="p-1.5 hover:text-[#0094eb] hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                <MessageSquare className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                title="Excluir Comentário"
                                className="p-1.5 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ABA: BIBLIOTECA */}
        {activeTab === "library" && (
          <div className="space-y-5">
            {/* Cabeçalho da página */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-slate-900">Biblioteca</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Gerencie seus vídeos e mídias hospedadas no plano.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 shadow-xs" onClick={() => alert("Conectar Instagram")}>
                  <InstagramIcon />
                  <span>INSTAGRAM</span>
                </button>
                <button className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 shadow-xs" onClick={() => alert("Conectar TikTok")}>
                  <TikTokIcon />
                  <span>TIKTOK</span>
                </button>
                <button onClick={() => setIsUrlModalOpen(true)} className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 shadow-xs">
                  <Link2 className="w-3.5 h-3.5 text-[#0094eb]" />
                  <span>URL EXTERNA</span>
                </button>
                <button className="px-4 py-2 bg-[#0094eb] hover:bg-[#0082cf] text-white uppercase text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-colors" onClick={() => alert("Upload de Arquivos")}>
                  <UploadCloud className="w-4 h-4" />
                  <span>FAZER UPLOAD</span>
                </button>
              </div>
            </div>

            {/* Card Armazenamento */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-4 w-full max-w-xl">
                <div className="w-12 h-12 bg-[#0094eb] text-white rounded-xl flex flex-col items-center justify-center shadow-xs font-bold leading-tight">
                  <span className="text-[10px] tracking-wider uppercase">SCALE</span>
                  <span className="text-[9px] opacity-80">50GB</span>
                </div>
                <div className="flex-1 space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                    <span>{storageUsage.used} MB de {storageUsage.total} GB</span>
                    <span className="text-[#0094eb]">{storagePercent}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="bg-[#0094eb] h-full rounded-full transition-all" style={{ width: `${storagePercent}%` }} />
                  </div>
                  <p className="text-[10px] text-slate-400">Espaço total do seu plano contratado.</p>
                </div>
              </div>
            </div>

            {/* Filtros e Tabela de Biblioteca */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Pesquisar pelo nome do arquivo..."
                  value={searchMedia}
                  onChange={(e) => setSearchMedia(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0094eb]/20"
                />
              </div>
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  onClick={() => setLibraryType("all")}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                    libraryType === "all" ? "bg-[#0094eb] text-white shadow-xs" : "text-slate-600 hover:bg-slate-200/60"
                  }`}
                >
                  TODOS
                </button>
                <button
                  onClick={() => setLibraryType("videos")}
                  className={`flex items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                    libraryType === "videos" ? "bg-[#0094eb] text-white shadow-xs" : "text-slate-600 hover:bg-slate-200/60"
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>VÍDEOS</span>
                </button>
                <button
                  onClick={() => setLibraryType("images")}
                  className={`flex items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                    libraryType === "images" ? "bg-[#0094eb] text-white shadow-xs" : "text-slate-600 hover:bg-slate-200/60"
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>IMAGENS</span>
                </button>
              </div>
            </div>

            {/* Contador */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-[11px] font-black uppercase tracking-wider text-slate-600">
              {filteredMedia.length} Mídias Listadas
            </div>

            {/* Tabela de Mídias */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/70 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3">Mídia</th>
                      <th className="px-4 py-3">Nome</th>
                      <th className="px-4 py-3 text-center">Produto</th>
                      <th className="px-4 py-3 text-center">Story Vinc.</th>
                      <th className="px-4 py-3 text-center">Tamanho</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredMedia.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center border border-slate-200">
                            <img src={m.thumb} alt={m.name} className="w-full h-full object-cover" />
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-bold text-slate-800">{m.name}</p>
                          <span className="text-[10px] text-slate-400 font-semibold">{m.format}</span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {m.product ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                              <img src={m.product.thumb} className="w-3.5 h-3.5 rounded-full object-cover" alt="" />
                              {m.product.name}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {m.story ? (
                            <span className="inline-block px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0094eb] font-semibold text-[11px] border border-blue-100">{m.story}</span>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-center text-slate-600">{m.size}</td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold border border-emerald-100">{m.status}</span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5 text-slate-400">
                            <button title="Editar" className="p-1.5 hover:text-[#0094eb]"><Edit2 className="w-3.5 h-3.5" /></button>
                            <button title="Visualizar" className="p-1.5 hover:text-[#0094eb]"><Eye className="w-3.5 h-3.5" /></button>
                            <button title="Download" className="p-1.5 hover:text-[#0094eb]"><Download className="w-3.5 h-3.5" /></button>
                            <button title="Excluir" className="p-1.5 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* OUTRAS ABAS (EM CONSTRUÇÃO OU PRÓXIMAS ETAPAS) */}
        {!["comments", "library"].includes(activeTab) && (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
            <h2 className="text-lg font-bold text-slate-800 capitalize">Módulo: {activeTab}</h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Esta seção está pronta para receber seus componentes na sequência de migração.
            </p>
          </div>
        )}

      </main>

      {/* MODAL: URL EXTERNA (BIBLIOTECA) */}
      {isUrlModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-xl p-6 relative">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-[#0094eb] shadow-xs">
                  <Link2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Adicionar Vídeo por URL</h3>
                  <p className="text-xs text-slate-400">Pinterest, YouTube, Panda Video, Bunny CDN ou Link Direto</p>
                </div>
              </div>
              <button onClick={() => setIsUrlModalOpen(false)} className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 text-slate-400 rounded-full">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddExternalUrl} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">Link / URL Externa *</label>
                <input
                  type="text"
                  required
                  placeholder="https://..."
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0094eb]/20"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">Título ou Identificação</label>
                <input
                  type="text"
                  placeholder="Ex: Reels Coleção Verão"
                  value={mediaTitle}
                  onChange={(e) => setMediaTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0094eb]/20"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">Vincular a um Produto</label>
                <select
                  value={linkedProduct}
                  onChange={(e) => setLinkedProduct(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0094eb]/20"
                >
                  <option>Sem produto vinculado</option>
                  <option>Blusa Confort - Verde</option>
                  <option>Óculos de Sol Vintage</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">Vincular a um Modelo de Medidas</label>
                <select
                  value={linkedMeasureModel}
                  onChange={(e) => setLinkedMeasureModel(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0094eb]/20"
                >
                  <option>Sem modelo de medidas vinculado</option>
                  <option>Tabela Geral Vestuário Feminino</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsUrlModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 bg-[#0094eb] hover:bg-[#0082cf] text-white text-xs font-bold uppercase rounded-xl flex items-center gap-2 shadow-sm">
                  <UploadCloud className="w-4 h-4" />
                  <span>Cadastrar Mídia</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 py-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
        <p>© 2026 Vidlytics Stories. Todos os direitos reservados.</p>
        <div className="flex items-center gap-3">
          <span className="text-[11px] uppercase tracking-wider font-semibold">DESENVOLVIDO POR:</span>
          <img src="/assets/sll-logotipo.png" alt="Sistema Loja Lucrativa" className="h-9 sm:h-10 object-contain hover:opacity-90 transition-opacity" />
        </div>
      </footer>

      {/* BOTÃO FLUTUANTE DE SUPORTE */}
      <aside className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => alert("Canal de Atendimento e Suporte SLL")}
          className="w-12 h-12 bg-[#0094eb] hover:bg-[#0082cf] text-white rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95"
          title="Suporte"
        >
          <Headphones className="w-6 h-6" />
        </button>
      </aside>
    </div>
  );
}
