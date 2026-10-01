import React, { useEffect, useRef, useState } from 'react';
import { 
  ShieldCheck, 
  Search, 
  MessageSquare, 
  Trash2, 
  CheckCircle, 
  XCircle,
  CornerDownRight,
  X,
  Send,
  AlertTriangle,
  Smile,
  Loader2
} from 'lucide-react';
import { useLoja } from '@/contexts/LojaContext';

interface ReplyItem {
  id: string;
  authorName: string;
  authorRole: string;
  content: string;
  createdAt: string;
  storeLogoUrl?: string;
  storeFullName?: string;
}

interface CommentItem {
  id: string;
  authorName: string;
  authorRole: string;
  avatarBgColor?: string;
  content: string;
  videoTitle: string;
  status: 'PENDENTE' | 'APROVADO' | 'REJEITADO';
  createdAt: string;
  replies?: ReplyItem[];
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface StoreBranding {
  name: string;
  replyDisplayName: string;
  logoUrl: string;
}

// Abrevia o nome da loja automaticamente (primeira palavra, máx 15 chars)
const abbreviateStoreName = (name: string): string => {
  if (!name) return 'Sua loja';
  const firstWord = name.trim().split(' ')[0];
  return firstWord.length > 15 ? firstWord.slice(0, 15) : firstWord;
};

export const ComentariosTab: React.FC = () => {
  const { store, loading: storeLoading } = useLoja();

  const [autoApprove, setAutoApprove] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [videoFilter, setVideoFilter] = useState('TODOS');
  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedComment, setSelectedComment] = useState<CommentItem | null>(null);
  const [replyText, setReplyText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Dados reais da loja (vêm do LojaContext)
  const storeBranding: StoreBranding = {
    name: store?.name || store?.store_name || 'Sua loja',
    replyDisplayName:
      store?.reply_display_name ||
      abbreviateStoreName(store?.name || store?.store_name || ''),
    logoUrl: store?.logo_url || '',
  };

  const commonEmojis = [
    '❤️', '👍', '😊', '😍', '🔥', '✅', '🙏', '🎉', '😉', '👏',
    '🌟', '💯', '🤗', '👋', '😎', '💪', '🌹', '🎁', '🛍️', '💕',
    '⭐', '😘', '🥰', '😂', '🤩', '👗', '👠', '👜', '💎', '🎀'
  ];

  // Dados mockados robustos para visualização
  const [comments, setComments] = useState<CommentItem[]>([
    {
      id: '1',
      authorName: 'Rodrigo Cel',
      authorRole: 'Cliente',
      avatarBgColor: 'bg-[#0094eb]',
      content: 'Teste ❤️',
      videoTitle: 'Criação_de_Vídeo_Fashion_Editorial_Luxo.mp4',
      status: 'PENDENTE',
      createdAt: 'Há 10 minutos',
      replies: []
    },
    {
      id: '2',
      authorName: 'www',
      authorRole: 'Cliente',
      avatarBgColor: 'bg-[#0094eb]',
      content: 'eweewee',
      videoTitle: 'Criação_de_Vídeo_Fashion_Editorial_Luxo.mp4',
      status: 'PENDENTE',
      createdAt: 'Há 25 minutos',
      replies: []
    },
    {
      id: '3',
      authorName: 'Mariana Silva',
      authorRole: 'Cliente',
      avatarBgColor: 'bg-emerald-500',
      content: 'Tem previsão de reposição do tamanho M da blusa verde?',
      videoTitle: 'Blusa_Confort_Colecao_Primavera.mp4',
      status: 'APROVADO',
      createdAt: 'Há 2 horas',
      replies: [
        {
          id: 'r1',
          authorName: 'Use Anny',
          authorRole: 'Resposta oficial',
          content: 'Oi Mariana! Sim, teremos reposição na próxima semana. Te avisamos por e-mail, ok?',
          createdAt: 'Há 1 hora',
          storeFullName: 'Use Anny Moda Feminina Profissional'
        }
      ]
    },
    {
      id: '4',
      authorName: 'Carlos Eduardo',
      authorRole: 'Cliente',
      avatarBgColor: 'bg-[#fd8539]',
      content: 'Chegou super rápido aqui em Curitiba! Amei a qualidade do óculos!',
      videoTitle: 'oculos-de-sol.mp4',
      status: 'APROVADO',
      createdAt: 'Há 5 horas',
      replies: []
    },
    {
      id: '5',
      authorName: 'Fake User 99',
      authorRole: 'Cliente',
      avatarBgColor: 'bg-slate-400',
      content: 'Entre no link para ganhar cupons grátis bit.ly/spam-link',
      videoTitle: 'oculos-de-sol.mp4',
      status: 'REJEITADO',
      createdAt: 'Ontem',
      replies: []
    }
  ]);

  // Carrega preferências salvas
  useEffect(() => {
    const savedAutoApprove = localStorage.getItem('vidlytics_auto_approve_comments');
    if (savedAutoApprove) setAutoApprove(savedAutoApprove === 'true');
  }, []);

  // Salva auto-aprovação
  useEffect(() => {
    localStorage.setItem('vidlytics_auto_approve_comments', String(autoApprove));
  }, [autoApprove]);

  const showToast = (message: string, type: Toast['type'] = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  const handleApprove = (commentId: string) => {
    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, status: 'APROVADO' as const } : c))
    );
    showToast('Comentário aprovado com sucesso!');
  };

  const handleReject = (commentId: string) => {
    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, status: 'REJEITADO' as const } : c))
    );
    showToast('Comentário rejeitado.');
  };

  const openDeleteModal = (comment: CommentItem) => {
    setSelectedComment(comment);
    setDeleteModalOpen(true);
  };

  const handleDelete = () => {
    if (!selectedComment) return;
    setComments((prev) => prev.filter((c) => c.id !== selectedComment.id));
    setDeleteModalOpen(false);
    setSelectedComment(null);
    showToast('Comentário excluído com sucesso.');
  };

  const openReplyModal = (comment: CommentItem) => {
    setSelectedComment(comment);
    setReplyText('');
    setShowEmojiPicker(false);
    setReplyModalOpen(true);
  };

  const insertEmoji = (emoji: string) => {
    const el = textareaRef.current;
    if (!el) {
      setReplyText((prev) => prev + emoji);
      return;
    }
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const newText = replyText.slice(0, start) + emoji + replyText.slice(end);
    setReplyText(newText);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  };

  const handleSendReply = () => {
    if (!selectedComment || !replyText.trim()) return;

    const newReply: ReplyItem = {
      id: `r-${Date.now()}`,
      authorName: storeBranding.replyDisplayName,
      authorRole: 'Resposta oficial',
      content: replyText.trim(),
      createdAt: 'Agora',
      storeLogoUrl: storeBranding.logoUrl,
      storeFullName: storeBranding.name
    };

    setComments((prev) =>
      prev.map((c) =>
        c.id === selectedComment.id
          ? { ...c, replies: [...(c.replies || []), newReply] }
          : c
      )
    );

    setReplyModalOpen(false);
    setReplyText('');
    setShowEmojiPicker(false);
    showToast('Resposta publicada com sucesso!');
  };

  // Filtros aplicados
  const filteredComments = comments.filter((item) => {
    const matchesSearch = 
      item.authorName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'TODOS' || item.status === statusFilter;
    const matchesVideo = videoFilter === 'TODOS' || item.videoTitle === videoFilter;

    return matchesSearch && matchesStatus && matchesVideo;
  });

  const getStatusBadge = (status: CommentItem['status']) => {
    switch (status) {
      case 'APROVADO':
        return (
          <span className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-[11px] font-extrabold tracking-wide">
            APROVADO
          </span>
        );
      case 'REJEITADO':
        return (
          <span className="px-3 py-1 bg-rose-50 text-rose-500 border border-rose-100 rounded-full text-[11px] font-extrabold tracking-wide">
            REJEITADO
          </span>
        );
      case 'PENDENTE':
      default:
        return (
          <span className="px-3 py-1 bg-amber-50 text-amber-600 border border-amber-200/70 rounded-full text-[11px] font-extrabold tracking-wide">
            PENDENTE
          </span>
        );
    }
  };

  // Loading enquanto carrega a loja
  if (storeLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mb-3" />
        <p className="text-sm">Carregando dados da loja...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 relative">
      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white transform transition-all duration-300 ${
              toast.type === 'success' ? 'bg-emerald-500' :
              toast.type === 'error' ? 'bg-rose-500' : 'bg-[#0094eb]'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>

      {/* 1. TÍTULO E SUBTÍTULO */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Comentários</h2>
        <p className="text-sm text-slate-500 mt-1">
          Gerencie a interação dos clientes nos seus stories, responda dúvidas e modere comentários públicos.
        </p>
      </div>

      {/* 2. CARDS SUPERIORES COMPACTOS / DISCRETOS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Card: Moderação de Conteúdo (Compacto) */}
        <div className="lg:col-span-4 bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0094eb] flex items-center justify-center shrink-0">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-800 tracking-wider uppercase">
                Moderação de Conteúdo
              </h3>
              <p className="text-[11px] text-slate-400">Controle de publicação na loja</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-50">
            <div>
              <p className="text-xs font-semibold text-slate-700">
                {autoApprove ? 'Aprovação automática ativada' : 'Aprovação automática desativada'}
              </p>
              <p className="text-[10px] text-slate-400">
                {autoApprove ? 'Comentários vão direto para a loja' : 'Requer aprovação prévia manual'}
              </p>
            </div>

            {/* Toggle Switch */}
            <button
              type="button"
              onClick={() => setAutoApprove(!autoApprove)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                autoApprove ? 'bg-[#0094eb]' : 'bg-slate-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  autoApprove ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Card: Filtros & Busca (Compacto) */}
        <div className="lg:col-span-8 bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">
              Filtros & Busca
            </span>
            <span className="px-2.5 py-0.5 bg-blue-50 text-[#0094eb] text-[11px] font-bold rounded-full">
              {filteredComments.length} COMENTÁRIOS
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            {/* Input Busca */}
            <div className="sm:col-span-6 relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Pesquisar autor ou texto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#0094eb] transition-colors"
              />
            </div>

            {/* Select Status */}
            <div className="sm:col-span-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-[#0094eb] transition-colors cursor-pointer"
              >
                <option value="TODOS">Todos os Status</option>
                <option value="PENDENTE">Pendentes</option>
                <option value="APROVADO">Aprovados</option>
                <option value="REJEITADO">Rejeitados</option>
              </select>
            </div>

            {/* Select Vídeos */}
            <div className="sm:col-span-3">
              <select
                value={videoFilter}
                onChange={(e) => setVideoFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-[#0094eb] transition-colors cursor-pointer truncate"
              >
                <option value="TODOS">Todos os Vídeos</option>
                <option value="Criação_de_Vídeo_Fashion_Editorial_Luxo.mp4">Fashion Editorial</option>
                <option value="Blusa_Confort_Colecao_Primavera.mp4">Blusa Confort</option>
                <option value="oculos-de-sol.mp4">Óculos de Sol</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 3. TABELA DE COMENTÁRIOS */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 tracking-wider uppercase bg-slate-50/50">
                <th className="py-3.5 px-6 text-left w-64">AUTOR</th>
                <th className="py-3.5 px-4 text-left">CONTEÚDO / VÍDEO</th>
                <th className="py-3.5 px-4 text-center w-36">STATUS</th>
                <th className="py-3.5 px-6 text-center w-36">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredComments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400 text-xs">
                    Nenhum comentário encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredComments.map((comment) => (
                  <React.Fragment key={comment.id}>
                    <tr className="hover:bg-slate-50/70 transition-colors">
                      {/* Autor */}
                      <td className="py-4 px-6 text-left align-top">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full ${
                              comment.avatarBgColor || 'bg-[#0094eb]'
                            } text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm`}
                          >
                            {comment.authorName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-sm leading-tight">
                              {comment.authorName}
                            </p>
                            <span className="text-[11px] text-slate-400 font-medium">
                              {comment.authorRole} • {comment.createdAt}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Conteúdo / Vídeo */}
                      <td className="py-4 px-4 text-left align-top">
                        <p className="text-slate-800 text-sm font-medium">
                          "{comment.content}"
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                            VÍDEO:
                          </span>
                          <a
                            href="#ver-video"
                            className="text-xs font-semibold text-[#0094eb] hover:underline truncate max-w-[320px] md:max-w-md"
                          >
                            {comment.videoTitle}
                          </a>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 text-center align-top">
                        <div className="flex justify-center">
                          {getStatusBadge(comment.status)}
                        </div>
                      </td>

                      {/* Ações */}
                      <td className="py-4 px-6 text-center align-top">
                        <div className="inline-flex items-center justify-center text-slate-400">
                          {/* Aprovar */}
                          <div className="w-8 h-8 flex items-center justify-center">
                            {comment.status !== 'APROVADO' ? (
                              <button
                                type="button"
                                title="Aprovar comentário"
                                onClick={() => handleApprove(comment.id)}
                                className="p-1.5 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              >
                                <CheckCircle size={16} />
                              </button>
                            ) : (
                              <span className="w-7 h-7" aria-hidden="true" />
                            )}
                          </div>

                          {/* Rejeitar */}
                          <div className="w-8 h-8 flex items-center justify-center">
                            {comment.status !== 'REJEITADO' ? (
                              <button
                                type="button"
                                title="Rejeitar comentário"
                                onClick={() => handleReject(comment.id)}
                                className="p-1.5 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              >
                                <XCircle size={16} />
                              </button>
                            ) : (
                              <span className="w-7 h-7" aria-hidden="true" />
                            )}
                          </div>

                          {/* Responder */}
                          <div className="w-8 h-8 flex items-center justify-center">
                            <button
                              type="button"
                              title="Responder cliente"
                              onClick={() => openReplyModal(comment)}
                              className="p-1.5 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                              <MessageSquare size={16} />
                            </button>
                          </div>

                          {/* Excluir */}
                          <div className="w-8 h-8 flex items-center justify-center">
                            <button
                              type="button"
                              title="Excluir comentário"
                              onClick={() => openDeleteModal(comment)}
                              className="p-1.5 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>

                    {/* Respostas do lojista */}
                    {comment.replies && comment.replies.length > 0 && (
                      <tr className="bg-slate-50/50">
                        <td colSpan={4} className="py-3 px-6">
                          <div className="space-y-3">
                            {comment.replies.map((reply) => (
                              <div key={reply.id} className="flex items-start gap-3 pl-12">
                                <CornerDownRight size={16} className="text-slate-300 mt-0.5 shrink-0" />
                                <div className="flex-1 bg-white border border-slate-100 rounded-xl p-3 shadow-sm">
                                  <div className="flex items-center gap-2.5 mb-1">
                                    {/* Avatar com logo da loja */}
                                    <div 
                                      className="w-7 h-7 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center shrink-0 border border-slate-100"
                                      title={reply.storeFullName || reply.authorName}
                                    >
                                      {reply.storeLogoUrl ? (
                                        <img 
                                          src={reply.storeLogoUrl} 
                                          alt={reply.authorName} 
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <span className="text-[10px] font-bold text-slate-500">
                                          {reply.authorName.charAt(0).toUpperCase()}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <p 
                                        className="text-xs font-bold text-[#0094eb]"
                                        title={reply.storeFullName || reply.authorName}
                                      >
                                        {reply.authorName}
                                      </p>
                                      <span className="px-1.5 py-0.5 bg-blue-50 text-[#0094eb] text-[9px] rounded-full">
                                        {reply.authorRole}
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-slate-400 ml-auto">{reply.createdAt}</span>
                                  </div>
                                  <p className="text-sm text-slate-700 pl-9.5">{reply.content}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Responder */}
      {replyModalOpen && selectedComment && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">Responder comentário</h3>
              <button
                type="button"
                onClick={() => {
                  setReplyModalOpen(false);
                  setShowEmojiPicker(false);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <p className="text-xs text-slate-500 mb-1">Comentário de <strong>{selectedComment.authorName}</strong></p>
                <p className="text-sm text-slate-800">"{selectedComment.content}"</p>
              </div>

              {/* Preview da loja */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-white flex items-center justify-center shrink-0 border border-slate-200">
                  {storeBranding.logoUrl ? (
                    <img 
                      src={storeBranding.logoUrl} 
                      alt={storeBranding.replyDisplayName} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-bold text-slate-500">
                      {storeBranding.replyDisplayName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-700 truncate" title={storeBranding.name}>
                    {storeBranding.replyDisplayName}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Responder como {storeBranding.replyDisplayName}
                  </p>
                </div>
              </div>

              {/* Resposta com emoji picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Sua resposta
                </label>
                <div className="relative">
                  <textarea
                    ref={textareaRef}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Digite sua resposta ao cliente..."
                    rows={4}
                    className="w-full px-3 py-2 pr-10 bg-slate-50 border border-slate-200/80 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#0094eb] transition-colors resize-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="absolute right-2 top-2 p-1.5 text-slate-400 hover:text-[#0094eb] hover:bg-blue-50 rounded-lg transition-colors"
                    title="Inserir emoji"
                  >
                    <Smile size={18} />
                  </button>
                </div>

                {/* Emoji picker popup */}
                {showEmojiPicker && (
                  <div className="mt-2 p-2 bg-white border border-slate-200 rounded-xl shadow-lg">
                    <div className="grid grid-cols-10 gap-1">
                      {commonEmojis.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => insertEmoji(emoji)}
                          className="w-7 h-7 flex items-center justify-center text-base hover:bg-slate-100 rounded-md transition-colors"
                          title={emoji}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setReplyModalOpen(false);
                    setShowEmojiPicker(false);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSendReply}
                  disabled={!replyText.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0094eb] hover:bg-[#0083d1] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  <Send size={14} />
                  Publicar resposta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmar exclusão */}
      {deleteModalOpen && selectedComment && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-5 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1">Excluir comentário?</h3>
              <p className="text-sm text-slate-500">
                Você está prestes a excluir o comentário de <strong>{selectedComment.authorName}</strong>. Essa ação não poderá ser desfeita.
              </p>
            </div>
            <div className="flex gap-2 p-5 pt-0">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="flex-1 px-4 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 px-4 py-2.5 text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 rounded-xl transition-colors"
              >
                Sim, excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComentariosTab;

