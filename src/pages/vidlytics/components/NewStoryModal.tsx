import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Save, 
  Layout, 
  Send, 
  Columns3, 
  Grid3X3, 
  Layers, 
  Film, 
  MapPin, 
  Globe, 
  Plus,
  X
} from 'lucide-react';

interface NewStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (storyData: any) => void;
}

export default function NewStoryModal({ isOpen, onClose, onSave }: NewStoryModalProps) {
  const [isActive, setIsActive] = useState(true);
  const [storyName, setStoryName] = useState('');
  const [selectedLayout, setSelectedLayout] = useState<'flutuante' | 'carrossel' | 'grade' | 'dinamico'>('carrossel');
  const [scrollDirection, setScrollDirection] = useState('Horizontal');
  const [visualStyle, setVisualStyle] = useState('Seguir Padrão do App');
  const [cssSelector, setCssSelector] = useState('.breadcrumbs');
  const [position, setPosition] = useState('Acima do elemento');

  if (!isOpen) return null;

  const handleSave = () => {
    if (onSave) {
      onSave({
        name: storyName,
        active: isActive,
        layout: selectedLayout,
        scrollDirection,
        visualStyle,
        cssSelector,
        position
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="bg-[#f8fafc] dark:bg-slate-900 w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 my-auto overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="bg-white dark:bg-slate-900 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-600 dark:text-slate-300 cursor-pointer"
              title="Voltar"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white leading-tight">Novo Story</h2>
              <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">CRIAR NOVO STORY</p>
            </div>
          </div>

          {/* Lado direito: Status colado ao Salvar + Fechar */}
          <div className="flex items-center gap-3">
            {/* Status Switch */}
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 rounded-xl border border-slate-200/80 dark:border-slate-700">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300 tracking-tight">
                STATUS: <span className={isActive ? "text-emerald-500 font-extrabold" : "text-slate-400"}>{isActive ? 'ATIVO' : 'INATIVO'}</span>
              </span>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isActive ? 'translate-x-4' : 'translate-x-0'}`}
                />
              </button>
            </div>

            {/* Save CTA */}
            <button 
              onClick={handleSave}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#0094eb] hover:bg-[#0082cf] text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Alterações</span>
            </button>

            {/* Fechar Modal */}
            <button 
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* CARD 1: DESIGN E FORMATO */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center gap-2 pb-5 border-b border-slate-100 dark:border-slate-800 text-[#0094eb]">
              <Layout className="w-5 h-5" />
              <h3 className="text-sm font-bold tracking-wide uppercase text-slate-800 dark:text-slate-100">Design e Formato</h3>
            </div>

            <div className="pt-5 space-y-6">
              {/* Nome do Story */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Nome do Story
                </label>
                <input 
                  type="text"
                  value={storyName}
                  onChange={(e) => setStoryName(e.target.value)}
                  placeholder="Ex: Lançamentos"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0094eb]"
                />
              </div>

              {/* Layout de Exibição */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Layout de Exibição
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Flutuante */}
                  <button
                    type="button"
                    onClick={() => setSelectedLayout('flutuante')}
                    className={`flex flex-col items-center justify-center p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                      selectedLayout === 'flutuante' 
                        ? 'border-[#0094eb] bg-sky-50/50 dark:bg-sky-950/20 text-[#0094eb]' 
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800'
                    }`}
                  >
                    <Send className="w-6 h-6 mb-2" />
                    <span className="text-[11px] font-bold tracking-wider uppercase">Flutuante</span>
                  </button>

                  {/* Carrossel */}
                  <button
                    type="button"
                    onClick={() => setSelectedLayout('carrossel')}
                    className={`flex flex-col items-center justify-center p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                      selectedLayout === 'carrossel' 
                        ? 'border-[#0094eb] bg-sky-50/50 dark:bg-sky-950/20 text-[#0094eb]' 
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800'
                    }`}
                  >
                    <Columns3 className="w-6 h-6 mb-2" />
                    <span className="text-[11px] font-bold tracking-wider uppercase">Carrossel</span>
                  </button>

                  {/* Grade */}
                  <button
                    type="button"
                    onClick={() => setSelectedLayout('grade')}
                    className={`flex flex-col items-center justify-center p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                      selectedLayout === 'grade' 
                        ? 'border-[#0094eb] bg-sky-50/50 dark:bg-sky-950/20 text-[#0094eb]' 
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800'
                    }`}
                  >
                    <Grid3X3 className="w-6 h-6 mb-2" />
                    <span className="text-[11px] font-bold tracking-wider uppercase">Grade</span>
                  </button>

                  {/* Carrossel Dinâmico */}
                  <button
                    type="button"
                    disabled
                    className="flex flex-col items-center justify-center p-5 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-800/40 text-slate-400"
                  >
                    <Layers className="w-6 h-6 mb-1 text-slate-400" />
                    <span className="text-[11px] font-bold tracking-wider uppercase">Carrossel Dinâmico</span>
                    <span className="text-[9px] text-slate-400 mt-1">Adicione 3 vídeos</span>
                  </button>
                </div>
              </div>

              {/* Direção de Rolagem */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Direção de Rolagem
                </label>
                <select
                  value={scrollDirection}
                  onChange={(e) => setScrollDirection(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0094eb]"
                >
                  <option value="Horizontal">Horizontal</option>
                  <option value="Vertical">Vertical</option>
                </select>
              </div>

              {/* Estilo Visual / Aparência */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Estilo Visual / Aparência
                </label>
                <select
                  value={visualStyle}
                  onChange={(e) => setVisualStyle(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0094eb]"
                >
                  <option value="Seguir Padrão do App">Seguir Padrão do App</option>
                  <option value="Customizado">Customizado</option>
                </select>
              </div>
            </div>
          </div>

          {/* CARD 2: CONTEÚDO SELECIONADO */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between pb-5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-[#0094eb]">
                <Film className="w-5 h-5" />
                <h3 className="text-sm font-bold tracking-wide uppercase text-slate-800 dark:text-slate-100">Conteúdo Selecionado</h3>
              </div>
              <button 
                type="button"
                className="flex items-center gap-1.5 px-4 py-2 bg-[#0094eb] hover:bg-[#0082cf] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>ADICIONAR VÍDEOS</span>
              </button>
            </div>

            <div className="pt-6">
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-10 flex flex-col items-center justify-center text-center bg-slate-50/50 dark:bg-slate-800/20">
                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
                  <Film className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Nenhum vídeo selecionado</p>
                <button 
                  type="button"
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-[#0094eb] hover:bg-[#0082cf] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>ADICIONAR VÍDEOS</span>
                </button>
              </div>
            </div>
          </div>

          {/* CARD 3: LOCAL DE EXIBIÇÃO */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center gap-2 pb-5 border-b border-slate-100 dark:border-slate-800 text-[#0094eb]">
              <MapPin className="w-5 h-5" />
              <h3 className="text-sm font-bold tracking-wide uppercase text-slate-800 dark:text-slate-100">Local de Exibição</h3>
            </div>

            <div className="pt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Seletor CSS */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Seletor CSS
                </label>
                <div className="relative flex items-center">
                  <input 
                    type="text"
                    value={cssSelector}
                    onChange={(e) => setCssSelector(e.target.value)}
                    placeholder=".breadcrumbs"
                    className="w-full pl-4 pr-32 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0094eb]"
                  />
                  {/* Botão Selecionar com o ícone de alvo avermelhado idêntico ao print */}
                  <button 
                    type="button"
                    className="absolute right-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200/70 dark:border-slate-700 text-[#0094eb] text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    <span className="text-sm leading-none select-none">🎯</span>
                    <span>Selecionar</span>
                  </button>
                </div>
              </div>

              {/* Posição */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Posição
                </label>
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0094eb]"
                >
                  <option value="Acima do elemento">Acima do elemento</option>
                  <option value="Abaixo do elemento">Abaixo do elemento</option>
                  <option value="Dentro do elemento (início)">Dentro do elemento (início)</option>
                  <option value="Dentro do elemento (fim)">Dentro do elemento (fim)</option>
                </select>
              </div>
            </div>
          </div>

          {/* CARD 4: QUAL PÁGINA IRÁ APARECER? */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center gap-2 pb-5 border-b border-slate-100 dark:border-slate-800 text-[#0094eb]">
              <Globe className="w-5 h-5" />
              <h3 className="text-sm font-bold tracking-wide uppercase text-slate-800 dark:text-slate-100">Qual página irá aparecer?</h3>
            </div>

            <div className="pt-5">
              <button 
                type="button"
                className="flex items-center gap-1.5 px-4 py-2.5 bg-[#0094eb] hover:bg-[#0082cf] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>ADICIONAR PÁGINA</span>
              </button>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-white dark:bg-slate-900 px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button 
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#0094eb] hover:bg-[#0082cf] text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Salvar Alterações</span>
          </button>
        </div>

      </div>
    </div>
  );
}
