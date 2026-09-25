import React, { useState, useEffect } from 'react';
import {
  X, Monitor, Smartphone, Settings2, PlaySquare, Layout,
  LayoutGrid, MonitorPlay, Save, Loader2
} from 'lucide-react';
import { useLoja } from '../../context/LojaContext';

import * as VidlyticsModule from '../../services/vidlytics/VidlyticsDatabaseService';
const VidlyticsDatabaseService = (VidlyticsModule as any).VidlyticsDatabaseService || (VidlyticsModule as any).default || {};

interface AparenciaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const selectClass = "w-full py-2 px-3 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0094eb] focus:border-transparent dark:bg-slate-800 dark:text-white transition-shadow bg-white cursor-pointer";
const inputClass = "w-full py-2 px-3 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0094eb] focus:border-transparent dark:bg-slate-800 dark:text-white transition-shadow bg-white";

export default function AparenciaModal({ isOpen, onClose }: AparenciaModalProps) {
  const { storeId: activeStoreId, store } = useLoja();
  const [activeTab, setActiveTab] = useState('basico');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('mobile');
  const [localSaving, setLocalSaving] = useState(false);
  
  const [selectedStyleId, setSelectedStyleId] = useState<string>('VIDLYTICS_DEFAULT');
  const [availableStyles, setAvailableStyles] = useState<any[]>([]);

  const [showNameModal, setShowNameModal] = useState(false);
  const [modalInputName, setModalInputName] = useState('');

  const resolvedStoreId = activeStoreId || store?.id || localStorage.getItem('sll_store_id');

  const loadStylesList = async () => {
    try {
      if (!resolvedStoreId || typeof VidlyticsDatabaseService.getAppearances !== 'function') return;
      const data = await VidlyticsDatabaseService.getAppearances(resolvedStoreId);
      setAvailableStyles(data || []);
    } catch (e) {
      console.warn('Erro ao carregar lista de estilos:', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setActiveTab('basico');
      setPreviewDevice('mobile');
      loadStylesList();
    }
  }, [isOpen, resolvedStoreId]);

  const handleSelectStyle = (id: string) => {
    setSelectedStyleId(id);
  };

  const handleSave = async () => {
    try {
      setLocalSaving(true);

      const isSystemDefault = !selectedStyleId || selectedStyleId === 'VIDLYTICS_DEFAULT' || selectedStyleId === 'default';

      if (isSystemDefault) {
        // Se for o estilo padrão, pede o nome para criar um NOVO
        setShowNameModal(true);
        setLocalSaving(false);
        return;
      }

      // Se for um estilo customizado selecionado, ATUALIZA (UPDATE)
      if (typeof VidlyticsDatabaseService.updateAppearance === 'function') {
        const currentStyleObj = availableStyles.find(s => s.id === selectedStyleId);
        await VidlyticsDatabaseService.updateAppearance({
          id: selectedStyleId,
          store_id: resolvedStoreId || '',
          widget_style: {
            ...(currentStyleObj?.widget_style || {}),
            updated_at: new Date().toISOString()
          }
        });
      }

      window.dispatchEvent(new CustomEvent('vidlytics:appearance_saved'));
      onClose();
    } catch (e) {
      console.error('Erro ao atualizar estilo:', e);
    } finally {
      setLocalSaving(false);
    }
  };

  const handleConfirmCreateNew = async () => {
    if (!modalInputName.trim()) return;

    try {
      setLocalSaving(true);

      if (typeof VidlyticsDatabaseService.createAppearance === 'function') {
        const created = await VidlyticsDatabaseService.createAppearance({
          store_id: resolvedStoreId || '',
          widget_style: {
            name: modalInputName,
            created_at: new Date().toISOString()
          }
        });

        if (created?.id) {
          setSelectedStyleId(created.id);
        }
      }

      window.dispatchEvent(new CustomEvent('vidlytics:appearance_saved'));
      setShowNameModal(false);
      setModalInputName('');
      onClose();
    } catch (e) {
      console.error('Erro ao criar estilo:', e);
    } finally {
      setLocalSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
        
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Aparência do Widget Vidlytics</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Configure o visual dos vídeos e stories exibidos na sua loja</p>
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
            <div className="space-y-4">
              <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                Selecione o Estilo Ativo:
              </label>
              <select
                value={selectedStyleId}
                onChange={(e) => handleSelectStyle(e.target.value)}
                className={selectClass}
              >
                <option value="VIDLYTICS_DEFAULT">Vidlytics (Padrão do Sistema)</option>
                {availableStyles.map((style) => (
                  <option key={style.id} value={style.id}>
                    {style.widget_style?.name || `Estilo Customizado (${style.id.slice(0, 8)})`}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500">
                {selectedStyleId === 'VIDLYTICS_DEFAULT'
                  ? 'Ao salvar o padrão do sistema, um novo estilo customizado será criado.'
                  : 'As alterações atualizarão o estilo selecionado (UPDATE).'}
              </p>
            </div>
          )}

          {activeTab !== 'basico' && (
            <div className="p-8 text-center text-slate-500 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
              <p className="text-sm">Configurações visuais de {activeTab} ativas.</p>
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
              Salvar Alterações
            </button>
          </div>
        </div>
      </div>

      {showNameModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl w-full max-w-md space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h4 className="text-lg font-bold text-slate-900 dark:text-white">Nome do Novo Estilo</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">Insira um nome para identificar este estilo customizado no sistema.</p>
            <input
              type="text"
              value={modalInputName}
              onChange={(e) => setModalInputName(e.target.value)}
              placeholder="Ex: Estilo Promoções"
              className={inputClass}
              autoFocus
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowNameModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmCreateNew}
                disabled={!modalInputName.trim() || localSaving}
                className="px-4 py-2 bg-[#0094eb] text-white text-xs font-bold rounded-lg disabled:opacity-50"
              >
                Criar Estilo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
