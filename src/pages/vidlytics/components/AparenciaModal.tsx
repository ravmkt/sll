'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, Monitor, Smartphone, Check, Loader2, PlaySquare, Settings2, Save, LayoutGrid 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase'; // Ajuste o import conforme seu projeto
import { showSuccess, showError } from '@/utils/toast'; // Ajuste o import

// --- TIPAGENS (Baseadas no legado) ---
type DeviceType = 'desktop' | 'mobile';
type ModalTab = 'flutuante' | 'carrossel' | 'grid' | 'player';

// Tipagem base de aparência para o JSONB
interface AppearanceConfig {
  floating_config: {
    desktop: Record<string, any>;
    mobile: Record<string, any>;
  };
  carousel_config: {
    desktop: Record<string, any>;
    mobile: Record<string, any>;
  };
  grid_config: {
    desktop: Record<string, any>;
    mobile: Record<string, any>;
  };
  modal_config: Record<string, any>;
  use_global_appearance: boolean;
}

// Valores padrão Iniciais
const defaultAppearance: AppearanceConfig = {
  use_global_appearance: false,
  floating_config: {
    desktop: { shape: 'portrait', width: '80', border_color: '#0094EB', show_cta: false },
    mobile: { shape: 'portrait', width: '64', border_color: '#0094EB', show_cta: false }
  },
  carousel_config: {
    desktop: { visible_items: 4, shape: 'portrait', border_color: '#0094EB', auto_center: true },
    mobile: { visible_items: 2, shape: 'portrait', border_color: '#0094EB', auto_center: true }
  },
  grid_config: {
    desktop: { visible_items: 4, rows: 1, spacing: 16, border_color: '#0094EB' },
    mobile: { visible_items: 2, rows: 2, spacing: 12, border_color: '#0094EB' }
  },
  modal_config: {
    show_title: true,
    show_play_button: true,
    show_product: true,
    border_color: '#0094EB',
    border_radius: '12'
  }
};

export default function AparenciaModal({ 
  isOpen, 
  onClose,
  storeId 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  storeId: string;
}) {
  // --- ESTADOS DO COMPONENTE ---
  const [activeTab, setActiveTab] = useState<ModalTab>('flutuante');
  const [deviceTab, setDeviceTab] = useState<DeviceType>('desktop');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<AppearanceConfig>(defaultAppearance);

  // --- CARREGAR DADOS DO BANCO (Schema: vidlytics) ---
  useEffect(() => {
    if (isOpen && storeId) {
      loadAppearance();
    }
  }, [isOpen, storeId]);

  const loadAppearance = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .schema('vidlytics')
        .from('vid_appearances')
        .select('widget_style')
        .eq('store_id', storeId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // Ignora erro de não encontrado

      if (data?.widget_style) {
        // Faz o merge dos dados do banco com os valores padrão para não quebrar a tela
        setFormData({ ...defaultAppearance, ...(data.widget_style as any) });
      }
    } catch (err) {
      console.error('Erro ao carregar aparência:', err);
      showError('Erro ao carregar configurações de aparência.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- SALVAR DADOS NO BANCO (Schema: vidlytics) ---
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Usamos upsert para inserir ou atualizar baseado no store_id
      const { error } = await supabase
        .schema('vidlytics')
        .from('vid_appearances')
        .upsert({
          store_id: storeId,
          widget_style: formData,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'store_id' });

      if (error) throw error;

      showSuccess('Aparência salva com sucesso!');
      onClose();
    } catch (err) {
      console.error('Erro ao salvar aparência:', err);
      showError('Erro ao salvar configurações.');
    } finally {
      setIsSaving(false);
    }
  };

  // --- HELPERS DE MANIPULAÇÃO DE ESTADO ---
  
  // getC: Pega um valor da estrutura correta
  const getC = (key: string, moduleType?: keyof AppearanceConfig) => {
    if (!moduleType) return (formData as any)[key];
    if (moduleType === 'modal_config') return formData.modal_config[key];
    
    const config = formData[moduleType] as any;
    if (!config) return '';
    
    // Se "Usar visual Global" estiver ativo, sempre lê do desktop
    const targetDevice = formData.use_global_appearance ? 'desktop' : deviceTab;
    return config[targetDevice]?.[key] ?? '';
  };

  // setC: Salva um valor na estrutura correta
  const setC = (key: string, value: any, moduleType?: keyof AppearanceConfig) => {
    setFormData((prev) => {
      if (!moduleType) return { ...prev, [key]: value };
      if (moduleType === 'modal_config') {
        return { ...prev, modal_config: { ...prev.modal_config, [key]: value } };
      }

      const config = prev[moduleType] as any;
      const targetDevice = prev.use_global_appearance ? 'desktop' : deviceTab;
      
      return {
        ...prev,
        [moduleType]: {
          ...config,
          [targetDevice]: {
            ...config[targetDevice],
            [key]: value
          }
        }
      };
    });
  };

  // Botão switch base
  const Switch = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out",
        checked ? "bg-[#0094eb]" : "bg-slate-200 dark:bg-slate-700"
      )}
    >
      <span className={cn(
        "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
        checked ? "translate-x-4" : "translate-x-0"
      )} />
    </button>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-6xl bg-white dark:bg-[#0B0E17] rounded-2xl shadow-2xl flex flex-col h-[90vh] overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#111524]/50">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Aparência da Loja</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Personalize o design dos seus vídeos</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* NAVEGAÇÃO E CONTROLE RESPONSIVO */}
        <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-4 items-center justify-between bg-white dark:bg-[#0B0E17]">
          {/* Abas de Módulos */}
          <div className="flex space-x-1 bg-slate-100 dark:bg-[#111524] p-1 rounded-xl">
            {[
              { id: 'flutuante', label: 'Flutuante', icon: PlaySquare },
              { id: 'carrossel', label: 'Carrossel', icon: LayoutGrid },
              { id: 'grid', label: 'Mural (Grid)', icon: LayoutGrid },
              { id: 'player', label: 'Player Interno', icon: Settings2 },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ModalTab)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
                  activeTab === tab.id
                    ? "bg-white dark:bg-[#0B0E17] text-[#0094eb] shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Controle Responsivo */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Usar visual Global?</span>
              <Switch 
                checked={!!getC('use_global_appearance')} 
                onChange={(v) => setC('use_global_appearance', v)} 
              />
            </div>

            <div className="flex bg-slate-100 dark:bg-[#111524] p-1 rounded-xl opacity-100 transition-opacity">
              <button
                onClick={() => setDeviceTab('desktop')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
                  deviceTab === 'desktop'
                    ? "bg-[#0094eb] text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                <Monitor size={16} />
                Desktop
              </button>
              <button
                onClick={() => setDeviceTab('mobile')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
                  deviceTab === 'mobile'
                    ? "bg-[#0094eb] text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                <Smartphone size={16} />
                Mobile
              </button>
            </div>
          </div>
        </div>

        {/* ÁREA DE CONTEÚDO PRINCIPAL E PREVIEW */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Painel de Configurações (Esquerda) */}
          <div className="w-1/2 overflow-y-auto p-6 bg-slate-50/50 dark:bg-[#0B0E17] custom-scrollbar border-r border-slate-200 dark:border-slate-800">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 text-[#0094eb] animate-spin" />
              </div>
            ) : (
              <div className="space-y-6 max-w-xl">
                
                {activeTab === 'flutuante' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">Estilo do Widget Flutuante</h3>
                    
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Formato
                      </label>
                      <select 
                        className="w-full bg-white dark:bg-[#111524] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#0094eb] outline-none"
                        value={getC('shape', 'floating_config')}
                        onChange={(e) => setC('shape', e.target.value, 'floating_config')}
                      >
                        <option value="portrait">Retrato (9:16)</option>
                        <option value="circle">Círculo</option>
                        <option value="square">Quadrado</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Largura ({deviceTab})
                      </label>
                      <input 
                        type="number"
                        className="w-full bg-white dark:bg-[#111524] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#0094eb] outline-none"
                        value={getC('width', 'floating_config')}
                        onChange={(e) => setC('width', e.target.value, 'floating_config')}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-white dark:bg-[#111524] rounded-xl border border-slate-200 dark:border-slate-700">
                      <div>
                        <span className="text-sm font-bold block text-slate-800 dark:text-white">Mostrar Botão de Ação (CTA)</span>
                        <span className="text-xs text-slate-500">Exibe um botão animado junto ao widget</span>
                      </div>
                      <Switch 
                        checked={!!getC('show_cta', 'floating_config')} 
                        onChange={(v) => setC('show_cta', v, 'floating_config')} 
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'carrossel' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">Estilo do Carrossel</h3>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Itens Visíveis ({deviceTab})
                      </label>
                      <input 
                        type="number"
                        className="w-full bg-white dark:bg-[#111524] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#0094eb] outline-none"
                        value={getC('visible_items', 'carousel_config')}
                        onChange={(e) => setC('visible_items', e.target.value, 'carousel_config')}
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'player' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">Configurações do Player Modal</h3>
                    <div className="flex items-center justify-between p-4 bg-white dark:bg-[#111524] rounded-xl border border-slate-200 dark:border-slate-700">
                      <span className="text-sm font-bold text-slate-800 dark:text-white">Mostrar Nome do Produto</span>
                      <Switch 
                        checked={!!getC('show_product', 'modal_config')} 
                        onChange={(v) => setC('show_product', v, 'modal_config')} 
                      />
                    </div>
                  </div>
                )}
                
              </div>
            )}
          </div>

          {/* Área de Preview Visual (Direita) */}
          <div className="w-1/2 bg-slate-100 dark:bg-[#080B12] p-8 flex flex-col relative">
            <div className="absolute top-4 right-4 bg-white/80 dark:bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm z-10 flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
              <Check size={14} className="text-emerald-500" />
              PREVIEW EM TEMPO REAL
            </div>
            
            <div className="flex-1 border-4 border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden bg-white dark:bg-[#111524] relative shadow-2xl flex items-center justify-center">
              
              <div className="text-center space-y-4 text-slate-400 dark:text-slate-500 p-8">
                <LayoutGrid size={48} className="mx-auto opacity-20" />
                <p className="text-sm font-medium">O layout do <strong className="text-[#0094eb]">{activeTab}</strong> será renderizado aqui refletindo os dados do formulário.</p>
                <div className="mt-4 text-xs font-mono bg-slate-100 dark:bg-[#0B0E17] p-4 rounded-xl text-left overflow-hidden">
                  <span className="text-[#0094eb]">Valores de Teste:</span><br/>
                  - Device Ativo: {deviceTab}<br/>
                  - Formato Selecionado: {activeTab === 'flutuante' ? getC('shape', 'floating_config') : 'N/A'}
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* FOOTER - BOTÕES DE AÇÃO */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111524] flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="flex items-center gap-2 px-8 py-2.5 rounded-xl text-sm font-bold bg-[#0094eb] hover:bg-[#007acc] text-white shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {isSaving ? 'Salvando...' : 'Salvar Aparência'}
          </button>
        </div>

      </div>
    </div>
  );
}
