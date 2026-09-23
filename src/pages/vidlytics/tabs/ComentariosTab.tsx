import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Search, 
  MessageSquare, 
  Trash2, 
  CheckCircle, 
  XCircle,
  CornerDownRight
} from 'lucide-react';

interface CommentItem {
  id: string;
  authorName: string;
  authorRole: string;
  avatarBgColor?: string;
  content: string;
  videoTitle: string;
  status: 'PENDENTE' | 'APROVADO' | 'REJEITADO';
  createdAt: string;
}

export const ComentariosTab: React.FC = () => {
  const [autoApprove, setAutoApprove] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [videoFilter, setVideoFilter] = useState('TODOS');

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
      createdAt: 'Há 10 minutos'
    },
    {
      id: '2',
      authorName: 'www',
      authorRole: 'Cliente',
      avatarBgColor: 'bg-[#0094eb]',
      content: 'eweewee',
      videoTitle: 'Criação_de_Vídeo_Fashion_Editorial_Luxo.mp4',
      status: 'PENDENTE',
      createdAt: 'Há 25 minutos'
    },
    {
      id: '3',
      authorName: 'Mariana Silva',
      authorRole: 'Cliente',
      avatarBgColor: 'bg-emerald-500',
      content: 'Tem previsão de reposição do tamanho M da blusa verde?',
      videoTitle: 'Blusa_Confort_Colecao_Primavera.mp4',
      status: 'APROVADO',
      createdAt: 'Há 2 horas'
    },
    {
      id: '4',
      authorName: 'Carlos Eduardo',
      authorRole: 'Cliente',
      avatarBgColor: 'bg-[#fd8539]',
      content: 'Chegou super rápido aqui em Curitiba! Amei a qualidade do óculos!',
      videoTitle: 'oculos-de-sol.mp4',
      status: 'APROVADO',
      createdAt: 'Há 5 horas'
    },
    {
      id: '5',
      authorName: 'Fake User 99',
      authorRole: 'Cliente',
      avatarBgColor: 'bg-slate-400',
      content: 'Entre no link para ganhar cupons grátis bit.ly/spam-link',
      videoTitle: 'oculos-de-sol.mp4',
      status: 'REJEITADO',
      createdAt: 'Ontem'
    }
  ]);

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

  return (
    <div className="space-y-5">
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
                  <tr key={comment.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Autor */}
                    <td className="py-4 px-6 text-left">
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
                    <td className="py-4 px-4 text-left">
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
                    <td className="py-4 px-4 text-center">
                      <div className="flex justify-center">
                        {getStatusBadge(comment.status)}
                      </div>
                    </td>

                    {/* Ações */}
                    <td className="py-4 px-6 text-center">
                      <div className="inline-flex items-center justify-center gap-1.5 text-slate-400">
                        {/* Aprovar rápida (se pendente ou rejeitado) */}
                        {comment.status !== 'APROVADO' && (
                          <button
                            type="button"
                            title="Aprovar comentário"
                            className="p-1.5 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          >
                            <CheckCircle size={16} />
                          </button>
                        )}

                        {/* Rejeitar rápido (se pendente ou aprovado) */}
                        {comment.status !== 'REJEITADO' && (
                          <button
                            type="button"
                            title="Rejeitar comentário"
                            className="p-1.5 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          >
                            <XCircle size={16} />
                          </button>
                        )}

                        {/* Responder */}
                        <button
                          type="button"
                          title="Responder cliente"
                          className="p-1.5 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <MessageSquare size={16} />
                        </button>

                        {/* Excluir */}
                        <button
                          type="button"
                          title="Excluir comentário"
                          className="p-1.5 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
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
};

export default ComentariosTab;
