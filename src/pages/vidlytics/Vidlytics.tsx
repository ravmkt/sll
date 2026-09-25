import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit2, Trash2, CheckCircle2, Star, Loader2, Sparkles 
} from 'lucide-react';
import { useLoja } from '../../context/LojaContext';
import AparenciaModal from '../../components/vidlytics/AparenciaModal';

import * as VidlyticsModule from '../../services/vidlytics/VidlyticsDatabaseService';
const VidlyticsDatabaseService = (VidlyticsModule as any).VidlyticsDatabaseService || (VidlyticsModule as any).default || {};

export default function Vidlytics() {
  const { storeId: activeStoreId, store } = useLoja();
  const resolvedStoreId = activeStoreId || store?.id || localStorage.getItem('sll_store_id');

  const [appearances, setAppearances] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingStyle, setEditingStyle] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchAppearances = async () => {
    try {
      setLoading(true);
      if (resolvedStoreId && typeof VidlyticsDatabaseService.getAppearances === 'function') {
        const data = await VidlyticsDatabaseService.getAppearances(resolvedStoreId);
        setAppearances(data || []);
      }
    } catch (err) {
      console.error('Erro ao buscar aparências:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppearances();

    const handleSaved = () => fetchAppearances();
    window.addEventListener('vidlytics:appearance_saved', handleSaved);
    return () => window.removeEventListener('vidlytics:appearance_saved', handleSaved);
  }, [resolvedStoreId]);

  const handleOpenCreateModal = () => {
    setEditingStyle(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (style: any) => {
    setEditingStyle(style);
    setIsModalOpen(true);
  };

  const handleDeleteStyle = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este estilo?')) return;

    try {
      setDeletingId(id);
      if (typeof VidlyticsDatabaseService.deleteAppearance === 'function') {
        await VidlyticsDatabaseService.deleteAppearance(id);
      } else if (typeof VidlyticsDatabaseService.deleteStyle === 'function') {
        await VidlyticsDatabaseService.deleteStyle(id);
      }
      await fetchAppearances();
    } catch (err) {
      console.error('Erro ao excluir estilo:', err);
      alert('Não foi possível excluir este estilo.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="text-[#0094eb]" size={24} /> Aparência
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Gerencie os estilos visuais dos seus widgets.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="px-4 py-2.5 bg-[#0094eb] hover:bg-blue-600 text-white font-medium text-sm rounded-xl transition-all shadow-md flex items-center gap-2"
        >
          <Plus size={18} />
          Criar Novo Estilo
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center items-center text-slate-400 gap-2">
            <Loader2 className="animate-spin" size={20} /> Carregando estilos...
          </div>
        ) : appearances.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-slate-500 dark:text-slate-400 text-sm">Nenhum estilo customizado encontrado.</p>
            <button
              onClick={handleOpenCreateModal}
              className="text-[#0094eb] hover:underline text-sm font-semibold"
            >
              Criar o seu primeiro estilo
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase text-[11px] font-semibold tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-3.5">Estilo</th>
                  <th className="px-6 py-3.5">Cor Principal</th>
                  <th className="px-6 py-3.5 text-center">Status</th>
                  <th className="px-6 py-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {appearances.map((item) => {
                  const name = item.widget_style?.name || `Estilo (${item.id.slice(0, 6)})`;
                  const color = item.widget_style?.primary_color || '#0094EB';
                  const isDefault = item.is_default || false;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">
                        {name}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="w-3.5 h-3.5 rounded-full border border-black/10" style={{ backgroundColor: color }} />
                          <span className="text-slate-600 dark:text-slate-400 font-mono text-xs uppercase">{color}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {isDefault ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-[#0094eb] dark:bg-blue-950/50 dark:text-blue-400">
                            <Star size={12} fill="currentColor" /> PADRÃO
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Definir Padrão</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            title="Editar estilo"
                            className="p-1.5 text-slate-400 hover:text-[#0094eb] hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteStyle(item.id)}
                            disabled={deletingId === item.id}
                            title="Excluir estilo"
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {deletingId === item.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
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

      <AparenciaModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingStyle(null);
        }}
        initialStyle={editingStyle}
      />
    </div>
  );
}
