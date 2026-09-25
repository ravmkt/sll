import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit2, Trash2, Star, Loader2, Sparkles, AlertTriangle, X 
} from 'lucide-react';
import { useLoja } from '../../context/LojaContext';
import AparenciaModal from '../../components/vidlytics/AparenciaModal';

import {
  getAppearances,
  deleteAppearance
} from '../../services/vidlytics/VidlyticsDatabaseService';

export default function Vidlytics() {
  const { storeId: activeStoreId, store } = useLoja();
  const resolvedStoreId = activeStoreId || store?.id || localStorage.getItem('sll_store_id');

  const [appearances, setAppearances] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingStyle, setEditingStyle] = useState<any | null>(null);

  const [deleteModalItem, setDeleteModalItem] = useState<any | null>(null);
  const [deletingLoading, setDeletingLoading] = useState<boolean>(false);

  const fetchAppearances = async () => {
    try {
      setLoading(true);
      if (resolvedStoreId) {
        const data = await getAppearances(resolvedStoreId);
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

  const handleConfirmDelete = async () => {
    if (!deleteModalItem?.id) return;

    try {
      setDeletingLoading(true);
      await deleteAppearance(deleteModalItem.id);
      setDeleteModalItem(null);
      await fetchAppearances();
    } catch (err) {
      console.error('Erro ao excluir estilo:', err);
      alert('Não foi possível excluir este estilo.');
    } finally {
      setDeletingLoading(false);
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
                            onClick={() => setDeleteModalItem(item)}
                            title="Excluir estilo"
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
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

      {deleteModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="p-6 pb-2 flex items-center justify-between">
              <h3 className="text-base font-black tracking-wide text-slate-900 dark:text-white uppercase">
                EXCLUIR ARQUIVO
              </h3>
              <button
                onClick={() => setDeleteModalItem(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="px-6 py-4 flex flex-col items-center text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-500">
                <AlertTriangle size={42} strokeWidth={1.8} />
              </div>

              <div className="w-full bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/50 rounded-2xl p-4 text-left flex items-start gap-3">
                <AlertTriangle size={20} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 leading-relaxed">
                  Esta ação é irreversível. O item <span className="font-bold text-[#0094eb]">"{deleteModalItem.widget_style?.name || 'Estilo'}"</span> será removido permanentemente.
                </p>
              </div>
            </div>

            <div className="px-6 pb-6 pt-2 grid grid-cols-2 gap-3">
              <button
                onClick={() => setDeleteModalItem(null)}
                disabled={deletingLoading}
                className="py-3 px-4 rounded-full border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deletingLoading}
                className="py-3 px-4 rounded-full bg-[#0094eb] hover:bg-blue-600 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 disabled:opacity-50"
              >
                {deletingLoading ? <Loader2 size={16} className="animate-spin" /> : 'Excluir'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
