import React, { useState, useEffect } from 'react';
import {
  X, Monitor, Smartphone, Settings2, PlaySquare, Layout,
  LayoutGrid, MonitorPlay, Save, Loader2, CheckCircle2
} from 'lucide-react';
import { useLoja } from '../../context/LojaContext';

import {
  createAppearance,
  updateAppearance
} from '../../services/vidlytics/VidlyticsDatabaseService';

interface AparenciaModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialStyle?: any | null;
}

const inputClass = "w-full py-2 px-3 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0094eb] focus:border-transparent dark:bg-slate-800 dark:text-white transition-shadow bg-white";

export default function AparenciaModal({ isOpen, onClose, initialStyle }: AparenciaModalProps) {
  const { storeId: activeStoreId, store } = useLoja();
  const resolvedStoreId = activeStoreId || store?.id || localStorage.getItem('sll_store_id');

  const [activeTab, setActiveTab] = useState('basico');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('mobile');
  const [localSaving, setLocalSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [styleName, setStyleName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#0094EB');

  useEffect(() => {
    if (isOpen) {
      setActiveTab('basico');
      setPreviewDevice('mobile');
      setShowSuccessModal(false);

      if (initialStyle) {
        setStyleName(initialStyle.widget_style?.name || 'Estilo Editado');
        setPrimaryColor(initialStyle.widget_style?.primary_color || '#0094EB');
      } else {
        setStyleName('');
        setPrimaryColor('#0094EB');
      }
    }
  }, [isOpen, initialStyle]);

  const handleSave = async () => {
    try {
      setLocalSaving(true);
      const targetName = styleName.trim() || (initialStyle ? 'Estilo Editado' : 'Novo Estilo Customizado');

      const payload: any = {
        store_id: resolvedStoreId || '',
        widget_style: {
          ...(initialStyle?.widget_style || {}),
          name: targetName,
          primary_color: primaryColor,
          updated_at: new Date().toISOString()
        }
      };

      if (initialStyle?.id) {
        payload.id = initialStyle.id;
        await updateAppearance(payload);
      } else {
        await createAppearance(payload);
      }

      window.dispatchEvent(new CustomEvent('vidlytics:appearance_saved'));
      
      setShowSuccessModal(true);
      setTimeout(() => {
        setShowSuccessModal(false);
        onClose();
      }, 1400);

    } catch (e) {
      console.error('Erro ao salvar estilo:', e);
      alert('Erro ao salvar as alterações.');
    } finally {
      setLocalSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] relative">
        
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {initialStyle ? `Editar: ${initialStyle.widget_style?.name || 'Estilo'}` : 'Criar Novo Estilo Visual'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Ajuste os parâmetros visuais do seu widget</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 gap-2 overflow-x-auto">
          {[
            { id: 'basico', label: 'Básico', icon: Settings2 },
            { id: 'flutuante', label: 'Flutuante', icon: PlaySquare },
            { id: 'carrossel', label: 'Carrossel', icon: Layout },
            { id: 'grade', label: 'Grade', icon: LayoutGrid },
            { id: 'player', label: 'Player', icon: MonitorPlay }
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  active
                    ? 'border-[#0094eb] text-[#0094eb]'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'basico' && (
            <div className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Nome do Estilo:
                </label>
                <input
                  type="text"
                  value={styleName}
                  onChange={(e) => setStyleName(e.target.value)}
                  placeholder="Ex: Estilo Black Friday"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Cor Principal:
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-slate-200 dark:border-slate-700 bg-transparent"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className={`${inputClass} font-mono uppercase`}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab !== 'basico' && (
            <div className="p-8 text-center text-slate-500 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
              <p className="text-sm">Configurações de {activeTab} prontas para personalização.</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex gap-2">
            <button
              onClick={() => setPreviewDevice('desktop')}
              className={`p-2 rounded-lg border text-xs flex items-center gap-1.5 font-medium transition-colors ${
                previewDevice === 'desktop' ? 'border-[#0094eb] text-[#0094eb] bg-blue-50 dark:bg-blue-950/40' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              <Monitor size={14} /> Desktop
            </button>
            <button
              onClick={() => setPreviewDevice('mobile')}
              className={`p-2 rounded-lg border text-xs flex items-center gap-1.5 font-medium transition-colors ${
                previewDevice === 'mobile' ? 'border-[#0094eb] text-[#0094eb] bg-blue-50 dark:bg-blue-950/40' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              <Smartphone size={14} /> Mobile
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors">
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={localSaving}
              className="px-5 py-2 bg-[#0094eb] hover:bg-blue-600 text-white text-sm font-bold rounded-xl transition-colors flex items-center gap-2 shadow-md shadow-blue-500/20 disabled:opacity-50"
            >
              {localSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {initialStyle ? 'Salvar Alterações' : 'Criar Estilo'}
            </button>
          </div>
        </div>

        {showSuccessModal && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-xs w-full text-center shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-500">
                <CheckCircle2 size={36} strokeWidth={2.5} />
              </div>
              <div>
                <h4 className="text-xl font-black text-slate-900 dark:text-white">Salvo com sucesso!</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Estilo atualizado com sucesso.</p>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
                <div className="bg-emerald-500 h-full w-full animate-pulse"></div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
