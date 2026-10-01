import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  Loader2,
  RefreshCw
} from 'lucide-react';
import { useLoja } from '@/contexts/LojaContext';
import { VidlyticsDatabaseService, VidlyticsComment, VidlyticsCommentReply } from '@/services/vidlytics/VidlyticsDatabaseService';
import { toast } from 'sonner';

interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface StoreBranding {
  name: string;
  replyDisplayName: string;
  logoUrl: string;
}

const abbreviateStoreName = (name: string): string => {
  if (!name) return 'Sua loja';
  const firstWord = name.trim().split(' ')[0];
  return firstWord.length > 15 ? firstWord.slice(0, 15) : firstWord;
};

const timeAgo = (dateStr: string | null): string => {
  if (!dateStr) return 'Agora';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Agora';
  if (diffMins < 60) return `Há ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
  if (diffHours < 24) return `Há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
  if (diffDays < 7) return `Há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
  return date.toLocaleDateString('pt-BR');
};

const getInitials = (name: string): string => {
  return name?.charAt(0).toUpperCase() || '?';
};

const commonEmojis = [
  '❤️', '👍', '😊', '😍', '🔥', '✅', '🙏', '🎉', '😉', '👏',
  '🌟', '💯', '🤗', '👋', '😎', '💪', '🌹', '🎁', '🛍️', '💕',
  '⭐', '😘', '🥰', '😂', '🤩', '👗', '👠', '👜', '💎', '🎀'
];

export const ComentariosTab: React.FC = () => {
  const { store, storeId, loading: storeLoading } = useLoja();

  const [autoApprove, setAutoApprove] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'PENDENTE' | 'APROVADO' | 'REJEITADO'>('TODOS');
  const [videoFilter, setVideoFilter] = useState<string>('TODOS');
  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [comments, setComments] = useState<VidlyticsComment[]>([]);
  const [replies, setReplies] = useState<Record<string, VidlyticsCommentReply[]>>({});
  const [videos, setVideos] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const storeBranding: StoreBranding = {
    name: store?.name || store?.store_name || 'Sua loja',
    replyDisplayName:
      store?.reply_display_name ||
      abbreviateStoreName(store?.name || store?.store_name || ''),
    logoUrl: store?.logo_url || '',
  };

  const showToast = (message: string, type: ToastItem['type'] = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  const loadComments = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const [videoRows, commentRows] = await Promise.all([
        VidlyticsDatabaseService.getVideos(storeId),
        VidlyticsDatabaseService.getComments(storeId),
      ]);

      const videoMap: Record<string, string> = {};
      (videoRows || []).forEach((v: any) => {
        videoMap[v.id] = v.title || v.name || 'Vídeo sem título';
      });
      setVideos(videoMap);

      setComments(commentRows);

      const commentIds = commentRows.map((c) => c.id);
      const replyRows = await VidlyticsDatabaseService.getCommentReplies(commentIds);
      const replyMap: Record<string, VidlyticsCommentReply[]> = {};
      commentIds.forEach((id) => (replyMap[id] = []));
      replyRows.forEach((r) => {
        if (!replyMap[r.comment_id]) replyMap[r.comment_id] = [];
        replyMap[r.comment_id].push(r);
      });
      setReplies(replyMap);
    } catch (err) {
      console.error('Erro ao carregar comentários:', err);
      toast.error('Erro ao carregar comentários.');
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    const saved = localStorage.getItem('vidlytics_auto_approve_comments');
    if (saved) setAutoApprove(saved === 'true');
  }, []);

  useEffect(() => {
    localStorage.setItem('vidlytics_auto_approve_comments', String(autoApprove));
  }, [autoApprove]);

  useEffect(() => {
    if (!storeLoading && storeId) loadComments();
  }, [storeLoading, storeId, loadComments]);

  const handleApprove = async (commentId: string) => {
    try {
      await VidlyticsDatabaseService.updateCommentStatus(commentId, 'APROVADO');
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, status: 'APROVADO' } : c))
      );
      showToast('Comentário aprovado com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao aprovar comentário.');
    }
  };

  const handleReject = async (commentId: string) => {
    try {
      await VidlyticsDatabaseService.updateCommentStatus(commentId, 'REJEITADO');
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, status: 'REJEITADO' } : c))
      );
      showToast('Comentário rejeitado.');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao rejeitar comentário.');
    }
  };

  const openDeleteModal = (commentId: string) => {
    setSelectedCommentId(commentId);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedCommentId) return;
    try {
      await VidlyticsDatabaseService.deleteComment(selectedCommentId);
      setComments((prev) => prev.filter((c) => c.id !== selectedCommentId));
      setDeleteModalOpen(false);
      setSelectedCommentId(null);
      showToast('Comentário excluído com sucesso.');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir comentário.');
    }
  };

  const openReplyModal = (commentId: string) => {
    setSelectedCommentId(commentId);
    setReplyText('');
    setShowEmojiPicker(false);
    setReplyModalOpen(true);
  };

  const selectedComment = comments.find((c) => c.id === selectedCommentId) || null;

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

  const handleSendReply = async () => {
    if (!selectedCommentId || !replyText.trim() || !storeId) return;

    setSaving(true);
    try {
      const reply = await VidlyticsDatabaseService.addCommentReply(
        selectedCommentId,
        storeId,
        storeBranding.replyDisplayName,
        replyText.trim()
      );

      setReplies((prev) => ({
        ...prev,
        [selectedCommentId]: [...(prev[selectedCommentId] || []), reply],
      }));

      setReplyModalOpen(false);
      setReplyText('');
      setShowEmojiPicker(false);
      showToast('Resposta publicada com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao publicar resposta.');
    } finally {
      setSaving(false);
    }
  };

  const filteredComments = comments.filter((item) => {
    const matchesSearch =
      (item.author_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'TODOS' || item.status === statusFilter;
    const matchesVideo = videoFilter === 'TODOS' || item.video_id === videoFilter;

    return matchesSearch && matchesStatus && matchesVideo;
  });

  const videoOptions = Object.entries(videos).map(([id, title]) => ({ id, title }));

  const getStatusBadge = (status: VidlyticsComment['status']) => {
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

      {/* Título */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Comentários</h2>
        <p className="text-sm text-slate-500 mt-1">
          Gerencie a interação dos clientes nos seus stories, responda dúvidas e modere comentários públicos.
        </p>
      </div>

      {/* Cards superiores */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
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

        <div className="lg:col-span-8 bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">
              Filtros & Busca
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadComments}
                disabled={loading}
                className="p-1.5 text-slate-400 hover:text-[#0094eb] hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                title="Recarregar comentários"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
              <span className="px-2.5 py-0.5 bg-blue-50 text-[#0094eb] text-[11px] font-bold rounded-full">
                {filteredComments.length} COMENTÁRIOS
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
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

            <div className="sm:col-span-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-[#0094eb] transition-colors cursor-pointer"
              >
                <option value="TODOS">Todos os Status</option>
                <option value="PENDENTE">Pendentes</option>
                <option value="APROVADO">Aprovados</option>
                <option value="REJEITADO">Rejeitados</option>
              </select>
            </div>

            <div className="sm:col-span-3">
              <select
                value={videoFilter}
                onChange={(e) => setVideoFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-[#0094eb] transition-colors cursor-pointer truncate"
              >
                <option value="TODOS">Todos os Vídeos</option>
                {videoOptions.map((v) => (
                  <option key={v.id} value={v.id}>{v.title}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mb-2" />
          <p className="text-xs">Carregando comentários...</p>
        </div>
      )}

      {/* Tabela */}
      {!loading && (
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
                      Nenhum comentário encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredComments.map((comment) => (
                    <React.Fragment key={comment.id}>
                      <tr className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-4 px-6 text-left align-top">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-[#0094eb] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
                              {getInitials(comment.author_name || 'Cliente')}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 text-sm leading-tight">
                                {comment.author_name || 'Cliente'}
                              </p>
                              <span className="text-[11px] text-slate-400 font-medium">
                                {timeAgo(comment.created_at)}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-4 text-left align-top">
                          <p className="text-slate-800 text-sm font-medium">
                            "{comment.content}"
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                              VÍDEO:
                            </span>
                            <span className="text-xs font-semibold text-[#0094eb] truncate max-w-[320px] md:max-w-md">
                              {videos[comment.video_id] || 'Vídeo não encontrado'}
                            </span>
                          </div>
                        </td>

                        <td className="py-4 px-4 text-center align-top">
                          <div className="flex justify-center">{getStatusBadge(comment.status || 'PENDENTE')}</div>
                        </td>

                        <td className="py-4 px-6 text-center align-top">
                          <div className="inline-flex items-center justify-center text-slate-400">
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

                            <div className="w-8 h-8 flex items-center justify-center">
                              <button
                                type="button"
                                title="Responder cliente"
                                onClick={() => openReplyModal(comment.id)}
                                className="p-1.5 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                              >
                                <MessageSquare size={16} />
                              </button>
                            </div>

                            <div className="w-8 h-8 flex items-center justify-center">
                              <button
                                type="button"
                                title="Excluir comentário"
                                onClick={() => openDeleteModal(comment.id)}
                                className="p-1.5 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>

                      {/* Respostas */}
                      {replies[comment.id] && replies[comment.id].length > 0 && (
                        <tr className="bg-slate-50/50">
                          <td colSpan={4} className="py-3 px-6">
                            <div className="space-y-3">
                              {replies[comment.id].map((reply) => (
                                <div key={reply.id} className="flex items-start gap-3 pl-12">
                                  <CornerDownRight size={16} className="text-slate-300 mt-0.5 shrink-0" />
                                  <div className="flex-1 bg-white border border-slate-100 rounded-xl p-3 shadow-sm">
                                    <div className="flex items-center gap-2.5 mb-1">
                                      <div
                                        className="w-7 h-7 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center shrink-0 border border-slate-100"
                                        title={reply.author_name}
                                      >
                                        {storeBranding.logoUrl ? (
                                          <img
                                            src={storeBranding.logoUrl}
                                            alt={reply.author_name}
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          <span className="text-[10px] font-bold text-slate-500">
                                            {getInitials(reply.author_name)}
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <p className="text-xs font-bold text-[#0094eb]" title={reply.author_name}>
                                          {reply.author_name}
                                        </p>
                                        <span className="px-1.5 py-0.5 bg-blue-50 text-[#0094eb] text-[9px] rounded-full">
                                          Resposta oficial
                                        </span>
                                      </div>
                                      <span className="text-[10px] text-slate-400 ml-auto">{timeAgo(reply.created_at)}</span>
                                    </div>
                                    <p className="text-sm text-slate-700">{reply.content}</p>
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
      )}

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
                <p className="text-xs text-slate-500 mb-1">
                  Comentário de <strong>{selectedComment.author_name || 'Cliente'}</strong>
                </p>
                <p className="text-sm text-slate-800">"{selectedComment.content}"</p>
              </div>

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
                      {getInitials(storeBranding.replyDisplayName)}
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
                  disabled={!replyText.trim() || saving}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0094eb] hover:bg-[#0083d1] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  {saving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Publicando...
                    </>
                  ) : (
                    <>
                      <Send size={14} /> Publicar resposta
                    </>
                  )}
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
                Você está prestes a excluir o comentário de <strong>{selectedComment.author_name || 'Cliente'}</strong>. Essa ação não poderá ser desfeita.
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
