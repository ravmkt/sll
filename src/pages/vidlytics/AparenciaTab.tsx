import React, { useState } from "react";
import { 
  Palette, 
  Plus, 
  Edit3, 
  Trash2, 
  Star, 
  Check, 
  Layers 
} from "lucide-react";
import AppearanceModal from "./AppearanceModal";

interface AppearanceStyle {
  id: string;
  name: string;
  primary_color: string;
  is_default: boolean;
  created_at: string;
}

const DEFAULT_STYLES: AppearanceStyle[] = [
  {
    id: "style-useanny",
    name: "USEANNY",
    primary_color: "#0094EB",
    is_default: true,
    created_at: new Date().toISOString()
  }
];

export default function AparenciaTab() {
  const [styles, setStyles] = useState<AppearanceStyle[]>(DEFAULT_STYLES);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<AppearanceStyle | null>(null);

  const handleOpenCreate = () => {
    setSelectedStyle(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (style: AppearanceStyle) => {
    setSelectedStyle(style);
    setIsModalOpen(true);
  };

  const handleDeleteStyle = (id: string) => {
    setStyles(prev => prev.filter(s => s.id !== id));
  };

  const handleSaveModal = (data: any) => {
    if (selectedStyle) {
      setStyles(prev => prev.map(s => s.id === selectedStyle.id ? { ...s, ...data } : s));
    } else {
      const newStyle: AppearanceStyle = {
        id: `style-${Date.now()}`,
        name: data.name || "Novo Estilo",
        primary_color: data.primary_color || "#0094EB",
        is_default: data.is_default || false,
        created_at: new Date().toISOString()
      };
      setStyles(prev => [...prev, newStyle]);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Aparência</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Customize a identidade visual, widgets, carrosséis, grades e player da sua loja.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#0094eb] hover:bg-blue-600 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Novo Estilo
        </button>
      </div>

      {/* Card de Estilos Cadastrados */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm space-y-4">
        
        {/* Topo do Card */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 text-[#0094eb] rounded-xl">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Estilos Cadastrados</h3>
              <p className="text-xs text-gray-400">Templates e temas ativos configurados para a sua vitrine.</p>
            </div>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-[#0094eb] rounded-lg">
            {styles.length} {styles.length === 1 ? "TEMA" : "TEMAS"}
          </span>
        </div>

        {/* Tabela de Estilos */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] uppercase tracking-wider text-gray-400 border-b border-gray-100 dark:border-gray-700">
              <tr>
                <th className="py-3 px-2 font-semibold">Template</th>
                <th className="py-3 px-2 font-semibold">Cor Principal</th>
                <th className="py-3 px-2 font-semibold text-center">Status</th>
                <th className="py-3 px-2 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
              {styles.map((style) => (
                <tr key={style.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors">
                  {/* Template */}
                  <td className="py-4 px-2">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-xs"
                        style={{ backgroundColor: style.primary_color }}
                      >
                        {style.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 dark:text-white">{style.name}</div>
                        <div className="text-[10px] text-gray-400 uppercase tracking-wider">Identidade Visual</div>
                      </div>
                    </div>
                  </td>

                  {/* Cor Principal */}
                  <td className="py-4 px-2">
                    <div className="flex items-center gap-2">
                      <span 
                        className="w-2.5 h-2.5 rounded-full" 
                        style={{ backgroundColor: style.primary_color }} 
                      />
                      <span className="font-mono text-gray-700 dark:text-gray-300 font-semibold">{style.primary_color}</span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-4 px-2 text-center">
                    {style.is_default ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-[#0094eb] dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
                        <Star className="w-3 h-3 fill-current" /> PADRÃO
                      </span>
                    ) : (
                      <span className="text-gray-400 text-[11px]">Personalizado</span>
                    )}
                  </td>

                  {/* Ações */}
                  <td className="py-4 px-2 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(style)}
                        title="Editar Estilo"
                        className="p-1.5 text-gray-400 hover:text-[#0094eb] hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteStyle(style.id)}
                        title="Excluir Estilo"
                        className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Customização com Mockup de Celular */}
      <AppearanceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveModal}
        initialData={selectedStyle}
      />
    </div>
  );
}
