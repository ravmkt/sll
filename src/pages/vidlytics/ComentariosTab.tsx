import React, { useState } from "react";
import { 
  ShieldCheck, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Trash2
} from "lucide-react";

interface CommentItem {
  id: string;
  author_name: string;
  author_email?: string;
  content: string;
  status: "approved" | "pending" | "rejected";
  created_at: string;
  video_title?: string;
  video_thumbnail?: string;
}

const DEMO_COMMENTS: CommentItem[] = [
  {
    id: "c-1",
    author_name: "Mariana Silva",
    author_email: "mariana.silva@email.com",
    content: "Adorei esse look! O tecido é fresquinho pro verão?",
    status: "approved",
    created_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    video_title: "Coleção Verão 2026 - Vestido Floral",
    video_thumbnail: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=120&auto=format&fit=crop&q=80"
  },
  {
    id: "c-2",
    author_name: "Carlos Eduardo",
    author_email: "carlos.ed@gmail.com",
    content: "Tem frete grátis para o interior de SP a partir de qual valor?",
    status: "pending",
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    video_title: "Top 5 Tênis Urbanos Confortáveis",
    video_thumbnail: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=120&auto=format&fit=crop&q=80"
  },
  {
    id: "c-3",
    author_name: "Ana Beatriz",
    author_email: "ana.bia@outlook.com",
    content: "Chegou super rápido, nota 10 no acabamento!",
    status: "approved",
    created_at: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    video_title: "Unboxing Jaqueta Couro Premium",
    video_thumbnail: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=120&auto=format&fit=crop&q=80"
  },
  {
    id: "c-4",
    author_name: "Usuário Anônimo",
    author_email: "promo123@spam.net",
    content: "Ganhe seguidores grátis acessando o link...",
    status: "rejected",
    created_at: new Date(Date.now() - 1000 * 60 * 720).toISOString(),
    video_title: "Coleção Verão 2026 - Vestido Floral",
    video_thumbnail: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=120&auto=format&fit=crop&q=80"
  }
];

export default function ComentariosTab() {
  const [autoApprove, setAutoApprove] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [comments, setComments] = useState<CommentItem[]>(DEMO_COMMENTS);

  const filteredComments = comments.filter((c) => {
    const matchesSearch =
      c.author_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleUpdateStatus = (id: string, newStatus: "approved" | "rejected") => {
    setComments((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
    );
  };

  const handleDelete = (id: string) => {
    setComments((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="space-y-5">
      {/* Título & Descrição */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Comentários</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Gerencie a interação dos clientes nos seus stories, responda dúvidas e modere comentários públicos.
        </p>
      </div>

      {/* Barra de Ações: Card de Moderação Compacto + Filtros */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
        {/* Card de Moderação bem mais discreto e estreito */}
        <div className="lg:col-span-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 text-[#0094eb] rounded-lg">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-200">
                Aprovação Automática
              </h4>
              <p className="text-[11px] text-gray-400">
                {autoApprove ? "Publicação imediata" : "Requer aprovação prévia"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAutoApprove(!autoApprove)}
            className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              autoApprove ? "bg-[#0094eb]" : "bg-gray-300 dark:bg-gray-600"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                autoApprove ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Filtros e Busca */}
        <div className="lg:col-span-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 shadow-sm flex flex-col sm:flex-row items-center gap-2.5">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Pesquisar autor ou texto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0094eb]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto px-2.5 py-1.5 text-xs sm:text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0094eb]"
            >
              <option value="all">Todos os Status</option>
              <option value="approved">Aprovados</option>
              <option value="pending">Pendentes</option>
              <option value="rejected">Rejeitados</option>
            </select>

            <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-[#0094eb] rounded-lg whitespace-nowrap">
              {filteredComments.length} {filteredComments.length === 1 ? "comentário" : "comentários"}
            </span>
          </div>
        </div>
      </div>

      {/* Tabela de Comentários */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th scope="col" className="px-5 py-3">Autor</th>
                <th scope="col" className="px-5 py-3">Conteúdo / Vídeo</th>
                <th scope="col" className="px-5 py-3 text-center">Status</th>
                <th scope="col" className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredComments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-gray-400 text-sm">
                    Nenhum comentário encontrado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredComments.map((comment) => (
                  <tr key={comment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors">
                    {/* Autor */}
                    <td className="px-5 py-3.5 align-top whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#0094eb] to-[#fd8539] flex items-center justify-center text-white font-semibold text-xs shadow-sm">
                          {comment.author_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-xs sm:text-sm text-gray-900 dark:text-white">
                            {comment.author_name}
                          </div>
                          {comment.author_email && (
                            <div className="text-[11px] text-gray-400">{comment.author_email}</div>
                          )}
                          <div className="text-[10px] text-gray-400 mt-0.5">
                            {new Date(comment.created_at).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Conteúdo e Vídeo */}
                    <td className="px-5 py-3.5 align-top">
                      <div className="space-y-1.5 max-w-xl">
                        <p className="text-gray-800 dark:text-gray-200 text-xs sm:text-sm leading-relaxed">
                          "{comment.content}"
                        </p>
                        {comment.video_title && (
                          <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700/50 text-[11px] text-gray-600 dark:text-gray-300">
                            {comment.video_thumbnail && (
                              <img
                                src={comment.video_thumbnail}
                                alt=""
                                className="w-4 h-4 rounded object-cover"
                              />
                            )}
                            <span className="truncate max-w-xs">{comment.video_title}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3.5 align-top text-center whitespace-nowrap">
                      {comment.status === "approved" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-3 h-3" /> Aprovado
                        </span>
                      )}
                      {comment.status === "pending" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                          Pendente
                        </span>
                      )}
                      {comment.status === "rejected" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                          <XCircle className="w-3 h-3" /> Rejeitado
                        </span>
                      )}
                    </td>

                    {/* Ações */}
                    <td className="px-5 py-3.5 align-top text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        {comment.status !== "approved" && (
                          <button
                            title="Aprovar Comentário"
                            onClick={() => handleUpdateStatus(comment.id, "approved")}
                            className="p-1 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition-colors"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        {comment.status !== "rejected" && (
                          <button
                            title="Rejeitar Comentário"
                            onClick={() => handleUpdateStatus(comment.id, "rejected")}
                            className="p-1 text-gray-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-lg transition-colors"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          title="Excluir Comentário"
                          onClick={() => handleDelete(comment.id)}
                          className="p-1 text-gray-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
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
  );
}
