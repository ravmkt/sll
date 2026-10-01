import React, { useState } from 'react';
import { Plus, Palette, Star, Pencil, Trash2, Eye } from 'lucide-react';
import AparenciaModal from '../components/AparenciaModal';
import { useAppearanceLogic } from "../../../hooks/vidlytics/useAppearanceLogic";
import { DEFAULT_APPEARANCES, isDefaultAppearance } from '../../../data/defaultAppearances';
import ConfirmDeleteModal from '../../../components/common/ConfirmDeleteModal';

const StyleRow: React.FC<{
  app: any;
  onEdit: (id: string) => void;
  onOpenDelete?: (id: string, name: string) => void;
  onSetDefault: (id: string) => void;
  isTemplate?: boolean;
}> = ({ app, onEdit, onOpenDelete, onSetDefault, isTemplate }) => {
  const primaryColor = app.widget_style?.desktop?.floating_border_color || '#0094EB';
  return (
    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
      <td className="px-6 py-4">
        <div className="font-bold text-slate-800 dark:text-white">{app.name}</div>
        {app.description && (
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-sm">{app.description}</div>
        )}
      </td>
      <td className="px-6 py-4 text-center">
        <span className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: primaryColor }} />
          {primaryColor}
        </span>
      </td>
      <td className="px-6 py-4 text-center">
        {app.is_default ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase text-[#0094eb] bg-blue-50 px-3 py-1 rounded-full">
            <Star size={12} className="fill-[#0094eb]" /> Padrão
          </span>
        ) : (
          <button onClick={() => onSetDefault(app.id)} className="text-xs font-bold text-slate-400 hover:text-[#0094eb]">
            Definir Padrão
          </button>
        )}
      </td>
      <td className="px-6 py-4 text-right">
        <button
          onClick={() => onEdit(app.id)}
          className="p-2 text-slate-400 hover:text-[#0094eb] transition-colors"
          title={isTemplate ? 'Visualizar e usar como base' : 'Editar estilo'}
        >
          {isTemplate ? <Eye size={16} /> : <Pencil size={16} />}
        </button>
        {!isTemplate && onOpenDelete && (
          <button onClick={() => onOpenDelete(app.id, app.name)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
            <Trash2 size={16} />
          </button>
        )}
      </td>
    </tr>
  );
};

const StyleTable: React.FC<{ children: React.ReactNode; empty?: boolean }> = ({ children, empty }) => (
  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
    {empty ? (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">Nenhum estilo personalizado criado ainda.</div>
    ) : (
      <table className="w-full text-left">
        <thead className="bg-slate-50 dark:bg-slate-800 text-xs font-bold uppercase text-slate-500">
          <tr>
            <th className="px-6 py-3">Estilo</th>
            <th className="px-6 py-3 text-center">Cor Principal</th>
            <th className="px-6 py-3 text-center">Status</th>
            <th className="px-6 py-3 text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{children}</tbody>
      </table>
    )}
  </div>
);

const AparenciaTab: React.FC = () => {
  const {
    customAppearances, defaultAppearances, listLoading,
    editingId, isDefaultEditing,
    isModalOpen, openNewStyle, openEditStyle, closeModal,
    deleteStyle, setAsDefault,
    styleName, setStyleName,
    isDefault, setIsDefault,
    isUnified, toggleUnified,
    formData, getConfig, setConfig,
    resetTab, saveStyle,
    isLoadingStyle, isSaving,
  } = useAppearanceLogic();

  // ─────────── Modal de confirmação de exclusão ───────────
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleOpenDelete = (id: string, name: string) => setDeleteTarget({ id, name });
  const handleCloseDelete = () => setDeleteTarget(null);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteStyle(deleteTarget.id);
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="p-6 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Palette className="text-[#0094eb]" size={28} />
            Aparência
          </h2>
          <p className="text-slate-500 mt-1">Gerencie os estilos visuais dos seus widgets.</p>
        </div>
      </div>

      {listLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-slate-200 border-t-[#0094eb] rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* CARD 1: ESTILOS PADRÕES (TEMPLATES) */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Estilos Padrões</h3>
                <p className="text-sm text-slate-500">Templates prontos. Visualize, personalize e salve como um novo estilo.</p>
              </div>
            </div>
            <StyleTable>
              {defaultAppearances.map((app) => (
                <StyleRow key={app.id} app={app} onEdit={openEditStyle} onSetDefault={setAsDefault} isTemplate />
              ))}
            </StyleTable>
          </section>

          {/* CARD 2: SEUS ESTILOS */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Seus Estilos</h3>
                <p className="text-sm text-slate-500">Estilos criados e salvos por você.</p>
              </div>
              <button
                onClick={openNewStyle}
                className="flex items-center gap-2 bg-[#0094eb] hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm text-sm"
              >
                <Plus size={16} />
                Criar Novo Estilo
              </button>
            </div>

            {customAppearances.length === 0 ? (
              <StyleTable empty />
            ) : (
              <StyleTable>
                {customAppearances.map((app) => (
                  <StyleRow key={app.id} app={app} onEdit={openEditStyle} onOpenDelete={handleOpenDelete} onSetDefault={setAsDefault} />
                ))}
              </StyleTable>
            )}
          </section>
        </>
      )}

      <AparenciaModal
        isOpen={isModalOpen}
        onClose={closeModal}
        styleName={styleName}
        setStyleName={setStyleName}
        isDefault={isDefault}
        setIsDefault={setIsDefault}
        isUnified={isUnified}
        toggleUnified={toggleUnified}
        formData={formData}
        getConfig={getConfig}
        setConfig={setConfig}
        resetTab={resetTab}
        saveStyle={saveStyle}
        isLoadingStyle={isLoadingStyle}
        isSaving={isSaving}
        editingId={editingId}
        isDefaultEditing={isDefaultEditing}
      />

      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        onClose={handleCloseDelete}
        onConfirm={handleConfirmDelete}
        title="EXCLUIR ESTILO"
        itemName={deleteTarget?.name ?? ""}
        isDeleting={isDeleting}
      />
    </div>
  );
};

export default AparenciaTab;

