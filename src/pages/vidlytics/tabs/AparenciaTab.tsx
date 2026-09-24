import React from 'react';
import { Plus, Palette, Star, Pencil, Trash2 } from 'lucide-react';
import AparenciaModal from '../components/AparenciaModal';
import { useAppearanceLogic } from "../../../hooks/vidlytics/useAppearanceLogic";

const AparenciaTab: React.FC = () => {
  const {
    appearances, listLoading,
    isModalOpen, openNewStyle, openEditStyle, closeModal,
    deleteStyle, setAsDefault,
    styleName, setStyleName,
    isDefault, setIsDefault,
    isUnified, toggleUnified,
    formData, getConfig, setConfig,
    resetTab, saveStyle,
    isLoadingStyle, isSaving,
  } = useAppearanceLogic();

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Palette className="text-[#0094eb]" size={28} />
            Aparência
          </h2>
          <p className="text-slate-500 mt-1">Gerencie os estilos visuais dos seus widgets.</p>
        </div>
        <button
          onClick={openNewStyle}
          className="flex items-center gap-2 bg-[#0094eb] hover:bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
        >
          <Plus size={18} />
          Criar Novo Estilo
        </button>
      </div>

      {!listLoading && appearances.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 flex flex-col items-center justify-center text-center">
          <Palette className="w-16 h-16 text-slate-300 dark:text-slate-700 mb-4" />
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">Nenhum estilo criado</h3>
          <p className="text-slate-500 max-w-sm mb-6">Crie seu primeiro estilo para padronizar as cores, formatos e botões dos seus vídeos.</p>
          <button
            onClick={openNewStyle}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Plus size={18} />
            Adicionar Estilo
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800 text-xs font-bold uppercase text-slate-500">
              <tr>
                <th className="px-6 py-3">Estilo</th>
                <th className="px-6 py-3 text-center">Cor Principal</th>
                <th className="px-6 py-3 text-center">Status</th>
                <th className="px-6 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {appearances.map((app) => {
                const primaryColor = app.widget_style?.desktop?.floating_border_color || '#0094EB';
                return (
                  <tr key={app.id}>
                    <td className="px-6 py-4 font-bold text-slate-800 dark:text-white">{app.name}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: primaryColor }} />
                        {primaryColor}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {app.is_default ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase text-[#0094eb] bg-blue-50 px-3 py-1 rounded-full">
                          <Star size={12} className="fill-[#0094eb]" /> Padrão
                        </span>
                      ) : (
                        <button onClick={() => setAsDefault(app.id)} className="text-xs font-bold text-slate-400 hover:text-[#0094eb]">
                          Definir Padrão
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => openEditStyle(app.id)} className="p-2 text-slate-400 hover:text-[#0094eb]">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => deleteStyle(app.id)} className="p-2 text-slate-400 hover:text-red-500">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
      />
    </div>
  );
};

export default AparenciaTab;
