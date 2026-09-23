import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, 
  Search, 
  MessageSquare, 
  Trash2, 
  ChevronDown,
  X,
  Send
} from 'lucide-react';
import { supabase } from '../../../../lib/supabase';

interface CommentItem {
  id: string;
  store_id?: string;
  video_id?: string;
  user_name: string;
  text: string;
  status: 'pending' | 'approved' | 'rejected' | string;
  reply_content?: string | null;
  reply_status?: string | null;
  created_at?: string;
  video_title?: string;
}

interface VideoOption {
  id: string;
  title: string;
  video_url?: string;
  thumbnail_url?: string;
}

export default function ComentariosTab() {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [videos, setVideos] = useState<VideoOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [storeId, setStoreId] = useState<string | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [videoFilter, setVideoFilter] = useState('ALL');

  // Moderação
  const [autoApprove, setAutoApprove] = useState(false);
  const [autoApproveLoading, setAutoApproveLoading] = useState(false);

  // Modais de Ação
  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [selectedComment, setSelectedComment] = useState<CommentItem | null>(null);
  const [replyText, setReplyText] = useState('');
  const [viewingVideo, setViewingVideo] = useState<VideoOption | null>(null);

  useEffect(() => {
    async function fetchActiveStore() {
      try {
        const { data: stores } = await supabase
          .from('stores')
          .select('id')
          .limit(1);

        if (stores && stores.length > 0) {
          setStoreId(stores[0].id);
        }
      } catch (err) {
        console.error('Erro ao identificar loja:', err);
      }
    }
    fetchActiveStore();
  }, []);

  const loadData = async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const { data: settings } = await supabase
        .from('store_settings')
        .select('auto_approve_comments')
        .eq('store_id', storeId)
        .maybeSingle();

      if (settings) {
        setAutoApprove(!!settings.auto_approve_comments);
      }

      const { data: vids } = await supabase
        .schema('vidlytics')
        .from('videos')
        .select('id, title, video_url, thumbnail_url')
        .eq('store_id', storeId);

      const videosList = vids || [];
      setVideos(videosList);

      const { data: comms } = await supabase
        .schema('vidlytics')
        .from('comments')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });

      if (comms && comms.length > 0) {
        const mapped = comms.map((c: any) => {
          const matchedVid = videosList.find((v) => v.id === c.video_id);
          return {
            ...c,
            video_title: matchedVid?.title || 'Vídeo Desconhecido'
          };
        });
        setComments(mapped);
      } else {
        setComments([
          {
            id: 'mock-1',
            user_name: 'Rodrigo Cel',
            text: 'Teste ❤️',
            video_title: 'Criação_de_Vídeo_Fashion_Editorial_Luxo.mp4',
            status: 'pending'
          },
          {
            id: 'mock-2',
            user_name: 'www',
            text: 'eweewee',
            video_title: 'Criação_de_Vídeo_Fashion_Editorial_Luxo.mp4',
            status: 'pending'
          }
        ]);
      }
    } catch (err) {
      console.error('Erro ao buscar dados de comentários:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (storeId) {
      loadData();
    }
  }, [storeId]);

  const handleToggleAutoApprove = async () => {
    if (!storeId || autoApproveLoading) return;
    const nextVal = !autoApprove;
    setAutoApprove(nextVal);
    setAutoApproveLoading(true);

    try {
      await supabase
        .from('store_settings')
        .upsert(
          { store_id: storeId, auto_approve_comments: nextVal, updated_at: new Date().toISOString() },
          { onConflict: 'store_id' }
        );
    } catch (err) {
      console.error('Erro ao salvar auto approve:', err);
      setAutoApprove(!nextVal);
    } finally {
      setAutoApproveLoading(false);
    }
  };

  const handleStatusChange = async (commentId: string, newStatus: string) => {
    try {
      await supabase
        .schema('vidlytics')
        .from('comments')
        .update({ status: newStatus })
        .eq('id', commentId);

      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, status: newStatus } : c))
      );
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Deseja realmente excluir este comentário?')) return;
    try {
      await supabase
        .schema('vidlytics')
        .from('comments')
        .delete()
        .eq('id', commentId);

      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      console.error('Erro ao excluir comentário:', err);
    }
  };

  const handleSubmitReply = async () => {
    if (!selectedComment || !replyText.trim()) return;
    try {
      await supabase
        .schema('vidlytics')
        .from('comments')
        .update({
          reply_content: replyText.trim(),
          reply_status: 'replied',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedComment.id);

      setComments((prev) =>
        prev.map((c) =>
          c.id === selectedComment.id
            ? { ...c, reply_content: replyText.trim(), reply_status: 'replied' }
            : c
        )
      );
      setReplyModalOpen(false);
      setReplyText('');
      setSelectedComment(null);
    } catch (err) {
      console.error('Erro ao responder comentário:', err);
    }
  };

  const filteredComments = useMemo(() => {
    return comments.filter((c) => {
      const matchSearch =
        (c.user_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.text || '').toLowerCase().includes(searchTerm.toLowerCase());

      const st = (c.status || '').toLowerCase();
      let matchStatus = true;
      if (statusFilter === 'PENDENTE') matchStatus = st === 'pending' || st === 'pendente';
      if (statusFilter === 'APROVADO') matchStatus = st === 'approved' || st === 'aprovado';
      if (statusFilter === 'REJEITADO') matchStatus = st === 'rejected' || st === 'rejeitado';

      const matchVideo = videoFilter === 'ALL' || c.video_id === videoFilter || c.video_title === videoFilter;

      return matchSearch && matchStatus && matchVideo;
    });
  }, [comments, searchTerm, statusFilter, videoFilter]);

  const uniqueVideos = Array.from(new Set(comments.map((c) => c.video_title).filter(Boolean)));

  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'approved' || s === 'aprovado') {
      return (
        <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-emerald-50 text-emerald-600 border border-emerald-200">
          APROVADO
        </span>
      );
    }
    if (s === 'rejected' || s === 'rejeitado') {
      return (
        <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-rose-50 text-rose-600 border border-rose-200">
          REJEITADO
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-amber-50 text-amber-600 border border-amber-300">
        PENDENTE
      </span>
    );
  };

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Comentários</h1>
        <p className="text-sm text-slate-500 mt-1">
          Gerencie a interação dos clientes nos seus stories, responda dúvidas e modere comentários públicos.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#0094eb]/10 text-[#0094eb] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-[#0094eb]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 tracking-wide uppercase">
                Moderação de Conteúdo
              </h2>
              <p className="text-xs text-slate-400">Controle de publicação na loja.</p>
            </div>
          </div>

          <div className="bg-slate-50/80 rounded-xl p-4 flex items-center justify-between border border-slate-200/60">
            <div>
              <p className="text-xs font-semibold text-slate-700">
                {autoApprove ? 'Aprovação automática ativada' : 'Aprovação automática desativada'}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {autoApprove ? 'Comentários vão ao ar de imediato.' : 'Requer aprovação prévia.'}
              </p>
            </div>

            <button
              type="button"
              onClick={handleToggleAutoApprove}
              disabled={autoApproveLoading}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out focus:outline-none ${
                autoApprove ? 'bg-[#0094eb]' : 'bg-slate-300'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                  autoApprove ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-slate-400 tracking-wider uppercase">
              Filtros & Busca
            </h2>
            <span className="text-xs font-bold text-[#0094eb] bg-sky-50 px-3 py-1 rounded-full border border-sky-100">
              {filteredComments.length} {filteredComments.length === 1 ? 'COMENTÁRIO' : 'COMENTÁRIOS'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mt-2">
            <div className="relative md:col-span-5">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Pesquisar autor ou texto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#0094eb] text-slate-700 placeholder-slate-400"
              />
            </div>

            <div className="relative md:col-span-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full appearance-none pl-3 pr-8 py-2 bg-slate-50 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#0094eb] text-slate-700 font-medium cursor-pointer"
              >
                <option value="ALL">Todos os Status</option>
                <option value="PENDENTE">Pendente</option>
                <option value="APROVADO">Aprovado</option>
                <option value="REJEITADO">Rejeitado</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <div className="relative md:col-span-4">
              <select
                value={videoFilter}
                onChange={(e) => setVideoFilter(e.target.value)}
                className="w-full appearance-none pl-3 pr-8 py-2 bg-slate-50 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#0094eb] text-slate-700 font-medium cursor-pointer truncate"
              >
                <option value="ALL">Todos os Vídeos</option>
                {uniqueVideos.map((video) => (
                  <option key={video} value={video}>
                    {video}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-6 w-1/4">Autor</th>
                <th className="py-4 px-6 w-1/2">Conteúdo / Vídeo</th>
                <th className="py-4 px-6 text-center">Status</th>
                <th className="py-4 px-6 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredComments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400 text-xs">
                    {loading ? 'Carregando comentários...' : 'Nenhum comentário encontrado.'}
                  </td>
                </tr>
              ) : (
                filteredComments.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 align-middle">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#0094eb] text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                          {(item.user_name || 'C').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-800">
                            {item.user_name || 'Cliente'}
                          </div>
                          <div className="text-[11px] text-slate-400 font-normal">
                            Cliente
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-6 align-middle">
                      <div className="space-y-1">
                        <div className="text-xs font-semibold text-slate-800">
                          &quot;{item.text}&quot;
                        </div>

                        {item.reply_content && (
                          <div className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200/60 rounded-lg p-2 mt-1">
                            <span className="font-bold text-[#0094eb]">Resposta da Loja: </span>
                            {item.reply_content}
                          </div>
                        )}

                        <div 
                          onClick={() => {
                            const found = videos.find((v) => v.id === item.video_id);
                            if (found) setViewingVideo(found);
                          }}
                          className="text-[11px] text-[#0094eb] font-medium hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <span className="text-slate-400 uppercase text-[10px] font-semibold">VÍDEO:</span>
                          <span>{item.video_title}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-6 align-middle text-center">
                      <button
                        type="button"
                        onClick={() => {
                          const s = (item.status || '').toLowerCase();
                          const nextStatus = s === 'approved' || s === 'aprovado' ? 'rejected' : s === 'rejected' || s === 'rejeitado' ? 'pending' : 'approved';
                          handleStatusChange(item.id, nextStatus);
                        }}
                        title="Clique para alternar o status"
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                      >
                        {getStatusBadge(item.status)}
                      </button>
                    </td>

                    <td className="py-4 px-6 align-middle text-center">
                      <div className="flex items-center justify-center gap-3 text-slate-400">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedComment(item);
                            setReplyText(item.reply_content || '');
                            setReplyModalOpen(true);
                          }}
                          className="hover:text-slate-600 transition-colors p-1"
                          title="Responder Comentário"
                        >
                          <MessageSquare className="w-4 h-4 stroke-[1.75]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteComment(item.id)}
                          className="hover:text-rose-500 transition-colors p-1"
                          title="Excluir Comentário"
                        >
                          <Trash2 className="w-4 h-4 stroke-[1.75]" />
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

      {replyModalOpen && selectedComment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                Responder Comentário
              </h3>
              <button
                type="button"
                onClick={() => setReplyModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Pergunta de {selectedComment.user_name}
                </span>
                <p className="text-xs text-slate-700 font-medium italic">
                  &quot;{selectedComment.text}&quot;
                </p>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                  Sua Resposta Pública
                </label>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={4}
                  placeholder="Escreva a resposta da loja..."
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#0094eb] text-slate-800 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReplyModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSubmitReply}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#0094eb] hover:bg-sky-600 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" /> Enviar Resposta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewingVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-800 truncate">{viewingVideo.title}</h3>
              <button
                type="button"
                onClick={() => setViewingVideo(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-4 rounded-xl overflow-hidden aspect-[9/16] bg-black">
              {viewingVideo.video_url ? (
                <video
                  src={viewingVideo.video_url}
                  controls
                  autoPlay
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                  Vídeo sem URL direta
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
