import React, { useState } from 'react';
import { Plus, Palette } from 'lucide-react';
import AparenciaModal from '../components/AparenciaModal';

const AparenciaTab: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

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
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-[#0094eb] hover:bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
        >
          <Plus size={18} />
          Criar Novo Estilo
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 flex flex-col items-center justify-center text-center">
        <Palette className="w-16 h-16 text-slate-300 dark:text-slate-700 mb-4" />
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">Nenhum estilo criado</h3>
        <p className="text-slate-500 max-w-sm mb-6">Crie seu primeiro estilo para padronizar as cores, formatos e botões dos seus vídeos.</p>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Plus size={18} />
          Adicionar Estilo
        </button>
      </div>

      <AparenciaModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
};

export default AparenciaTab;
