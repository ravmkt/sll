import React, { useState } from 'react';
import { 
  Palette, 
  Plus, 
  Pencil, 
  Trash2, 
  X, 
  SlidersHorizontal, 
  Tv, 
  Columns, 
  Sparkles, 
  LayoutGrid, 
  PlaySquare, 
  Smartphone, 
  Monitor, 
  ChevronDown, 
  ChevronUp, 
  Heart, 
  MessageSquare, 
  Share2, 
  Info,
  Check,
  Play
} from 'lucide-react';

interface StyleItem {
  id: string;
  name: string;
  type: string;
  primaryColor: string;
  isDefault: boolean;
}

type TabType = 'basico' | 'flutuante' | 'carrossel' | 'carrossel-dinamico' | 'grade' | 'player';

export const AparenciaTab: React.FC = () => {
  // Lista de estilos cadastrados
  const [stylesList, setStylesList] = useState<StyleItem[]>([
    {
      id: '1',
      name: 'USEANNY',
      type: 'IDENTIDADE VISUAL',
      primaryColor: '#0094EB',
      isDefault: true
    }
  ]);

  // Controle do Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [activeTab, setActiveTab] = useState<TabType>('basico');
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('mobile');

  // Estados dos formulários do estilo
  const [styleName, setStyleName] = useState('USEANNY');
  const [isDefaultStyle, setIsDefaultStyle] = useState(true);
  const [syncAllDevices, setSyncAllDevices] = useState(false);

  // Controle de accordions abertos
  const [openAccordions, setOpenAccordions] = useState<{ [key: string]: boolean }>({
    '1': false,
    '2': false,
    '3': false,
    '4': false,
    '5': false
  });

  const toggleAccordion = (key: string) => {
    setOpenAccordions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleOpenCreate = () => {
    setModalMode('create');
    setStyleName('');
    setIsDefaultStyle(false);
    setActiveTab('basico');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: StyleItem) => {
    setModalMode('edit');
    setStyleName(item.name);
    setIsDefaultStyle(item.isDefault);
    setActiveTab('basico');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* 1. TOPO DA PÁGINA */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Aparência</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Customize a identidade visual, widgets, carrosséis, grades e player da sua loja.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#0094eb] hover:bg-blue-600 text-white rounded-xl text-xs font-bold tracking-wider uppercase transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus size={16} />
          NOVO ESTILO
        </button>
      </div>

      {/* 2. CARD: ESTILOS CADASTRADOS */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
        {/* Header do Card */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0094eb] text-white flex items-center justify-center shadow-sm">
              <Palette size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Estilos Cadastrados</h3>
              <p className="text-xs text-slate-400">Templates e temas ativos configurados para a sua vitrine.</p>
            </div>
          </div>

          <span className="px-3 py-1 bg-blue-50 text-[#0094eb] rounded-full text-xs font-bold tracking-wider uppercase">
            {stylesList.length} {stylesList.length === 1 ? 'TEMA' : 'TEMAS'}
          </span>
        </div>

        {/* Tabela de Estilos */}
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-2 w-[40%]">TEMPLATE</th>
                <th className="py-4 px-4 text-center w-[25%]">COR PRINCIPAL</th>
                <th className="py-4 px-4 text-center w-[20%]">STATUS</th>
                <th className="py-4 px-4 text-right w-[15%]">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {stylesList.map((style) => (
                <tr key={style.id} className="hover:bg-slate-50/60 transition-colors">
                  {/* Template */}
                  <td className="py-4 px-2">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-8 h-8 rounded-lg shrink-0 shadow-sm"
                        style={{ backgroundColor: style.primaryColor }}
                      />
                      <div>
                        <p className="font-bold text-slate-800 text-sm leading-tight">{style.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold tracking-wider uppercase mt-0.5">
                          {style.type}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Cor Principal */}
                  <td className="py-4 px-4 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
                      <span 
                        className="w-2.5 h-2.5 rounded-full inline-block"
                        style={{ backgroundColor: style.primaryColor }}
                      />
                      <span className="text-xs font-bold text-slate-700">{style.primaryColor}</span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-4 px-4 text-center">
                    {style.isDefault && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-[#0094eb] rounded-full text-[11px] font-bold tracking-wide">
                        ★ PADRÃO
                      </span>
                    )}
                  </td>

                  {/* Ações */}
                  <td className="py-4 px-4 text-right">
                    <div className="inline-flex items-center justify-end gap-2 text-slate-400">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(style)}
                        className="p-1.5 hover:text-[#0094eb] hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar Estilo"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        className="p-1.5 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Excluir Estilo"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. MODAL COMPLETO DE ESTILOS (NOVO / EDITAR) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl flex flex-col h-[90vh] overflow-hidden border border-slate-100">
            {/* Topo do Modal */}
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              <h3 className="text-lg font-bold text-slate-800">
                {modalMode === 'create' ? 'Criar Novo Estilo' : 'Editar Estilo'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Menu de Abas Superior do Modal */}
            <div className="px-6 pb-4">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setActiveTab('basico')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
                    activeTab === 'basico'
                      ? 'bg-[#0094eb] text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <SlidersHorizontal size={13} />
                  Básico
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('flutuante')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
                    activeTab === 'flutuante'
                      ? 'bg-[#0094eb] text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <PlaySquare size={13} />
                  Flutuante
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('carrossel')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
                    activeTab === 'carrossel'
                      ? 'bg-[#0094eb] text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Columns size={13} />
                  Carrossel
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('carrossel-dinamico')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
                    activeTab === 'carrossel-dinamico'
                      ? 'bg-[#0094eb] text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Sparkles size={13} />
                  Carrossel Dinâmico
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('grade')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
                    activeTab === 'grade'
                      ? 'bg-[#0094eb] text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <LayoutGrid size={13} />
                  Grade
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('player')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
                    activeTab === 'player'
                      ? 'bg-[#0094eb] text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Tv size={13} />
                  Player
                </button>
              </div>
            </div>

            {/* Conteúdo Central: 2 Colunas (Configurações à Esquerda + Simulador à Direita) */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden border-t border-slate-100">
              
              {/* COLUNA ESQUERDA: Formulários e Controles */}
              <div className="md:col-span-5 p-5 overflow-y-auto border-r border-slate-100 bg-white space-y-4">
                
                {/* 1. ABA BÁSICO */}
                {activeTab === 'basico' && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">Dados Básicos</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Defina o nome do estilo e o comportamento global entre Desktop e Mobile.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Nome do Estilo</label>
                      <input
                        type="text"
                        value={styleName}
                        onChange={(e) => setStyleName(e.target.value)}
                        placeholder="Ex: Estilo padrão"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#0094eb]"
                      />
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                      <p className="text-xs font-bold text-slate-700 mb-1.5">Definir como padrão</p>
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600">
                        <input
                          type="checkbox"
                          checked={isDefaultStyle}
                          onChange={(e) => setIsDefaultStyle(e.target.checked)}
                          className="rounded text-[#0094eb] focus:ring-[#0094eb] w-4 h-4 cursor-pointer"
                        />
                        Definir como padrão da loja
                      </label>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                      <p className="text-xs font-bold text-slate-700 mb-1">Usar aparência em todos os dispositivos</p>
                      <label className="flex items-start gap-2 cursor-pointer text-xs text-slate-500 mt-1">
                        <input
                          type="checkbox"
                          checked={syncAllDevices}
                          onChange={(e) => setSyncAllDevices(e.target.checked)}
                          className="rounded text-[#0094eb] focus:ring-[#0094eb] w-4 h-4 mt-0.5 cursor-pointer"
                        />
                        <span>
                          Quando ativado, as configurações de Desktop serão aplicadas também no Mobile.
                        </span>
                      </label>
                    </div>
                  </div>
                )}

                {/* 2. DEMAIS ABAS (Flutuante, Carrossel, Carrossel Dinâmico, Grade, Player) */}
                {activeTab !== 'basico' && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">
                        {activeTab === 'flutuante' && 'Configurações do Flutuante'}
                        {activeTab === 'carrossel' && 'Configurações do Carrossel'}
                        {activeTab === 'carrossel-dinamico' && 'Configurações do Carrossel Dinâmico'}
                        {activeTab === 'grade' && 'Configurações da Grade'}
                        {activeTab === 'player' && 'Configurações do Player'}
                      </h4>
                    </div>

                    {/* Seletor Dispositivo */}
                    <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-xs font-bold text-slate-600">Dispositivo</span>
                      <div className="inline-flex p-1 bg-slate-200/60 rounded-lg text-xs font-bold">
                        <button
                          type="button"
                          onClick={() => setPreviewDevice('desktop')}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
                            previewDevice === 'desktop'
                              ? 'bg-white text-slate-800 shadow-xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          <Monitor size={12} />
                          Desktop
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewDevice('mobile')}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
                            previewDevice === 'mobile'
                              ? 'bg-[#0094eb] text-white shadow-xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          <Smartphone size={12} />
                          Mobile
                        </button>
                      </div>
                    </div>

                    {/* Acordeões de Customização */}
                    <div className="space-y-2">
                      {/* Acordeão 1 */}
                      <div className="border border-slate-100 rounded-xl overflow-hidden bg-slate-50/50">
                        <button
                          type="button"
                          onClick={() => toggleAccordion('1')}
                          className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100/60 transition-colors"
                        >
                          <span>
                            {activeTab === 'flutuante' && '1. Formato & Dimensões'}
                            {activeTab === 'player' && '1. Borda'}
                            {(activeTab === 'carrossel' || activeTab === 'carrossel-dinamico' || activeTab === 'grade') && '1. Layout & Dimensões'}
                          </span>
                          {openAccordions['1'] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                        {openAccordions['1'] && (
                          <div className="p-3 bg-white border-t border-slate-100 text-xs text-slate-500 space-y-2">
                            <p>Altura, largura e espaçamentos do componente.</p>
                          </div>
                        )}
                      </div>

                      {/* Acordeão 2 */}
                      <div className="border border-slate-100 rounded-xl overflow-hidden bg-slate-50/50">
                        <button
                          type="button"
                          onClick={() => toggleAccordion('2')}
                          className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100/60 transition-colors"
                        >
                          <span>
                            {activeTab === 'flutuante' && '2. Posição & Margens'}
                            {activeTab === 'player' && '2. Cores & Gradientes'}
                            {(activeTab === 'carrossel' || activeTab === 'carrossel-dinamico' || activeTab === 'grade') && '2. Bordas'}
                          </span>
                          {openAccordions['2'] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                        {openAccordions['2'] && (
                          <div className="p-3 bg-white border-t border-slate-100 text-xs text-slate-500 space-y-2">
                            <p>Configurações de bordas, espessuras e cantos arredondados.</p>
                          </div>
                        )}
                      </div>

                      {/* Acordeão 3 */}
                      <div className="border border-slate-100 rounded-xl overflow-hidden bg-slate-50/50">
                        <button
                          type="button"
                          onClick={() => toggleAccordion('3')}
                          className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100/60 transition-colors"
                        >
                          <span>
                            {activeTab === 'flutuante' && '3. Bordas'}
                            {(activeTab === 'player' || activeTab === 'carrossel' || activeTab === 'carrossel-dinamico' || activeTab === 'grade') && '3. Elementos Visíveis'}
                          </span>
                          {openAccordions['3'] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                        {openAccordions['3'] && (
                          <div className="p-3 bg-white border-t border-slate-100 text-xs text-slate-500 space-y-2">
                            <p>Exibir/ocultar títulos, badges e ícones de visualização.</p>
                          </div>
                        )}
                      </div>

                      {/* Acordeão 4 */}
                      <div className="border border-slate-100 rounded-xl overflow-hidden bg-slate-50/50">
                        <button
                          type="button"
                          onClick={() => toggleAccordion('4')}
                          className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100/60 transition-colors"
                        >
                          <span>
                            {activeTab === 'flutuante' && '4. Elementos Visíveis'}
                            {activeTab === 'carrossel-dinamico' && '4. Destaque de Vídeo'}
                            {(activeTab === 'player' || activeTab === 'carrossel' || activeTab === 'grade') && '4. Card de Produto'}
                          </span>
                          {openAccordions['4'] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                        {openAccordions['4'] && (
                          <div className="p-3 bg-white border-t border-slate-100 text-xs text-slate-500 space-y-2">
                            <p>Estilização do card de produto anexado ao vídeo.</p>
                          </div>
                        )}
                      </div>

                      {/* Acordeão 5 (específico do Carrossel Dinâmico) */}
                      {activeTab === 'carrossel-dinamico' && (
                        <div className="border border-slate-100 rounded-xl overflow-hidden bg-slate-50/50">
                          <button
                            type="button"
                            onClick={() => toggleAccordion('5')}
                            className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100/60 transition-colors"
                          >
                            <span>5. Card de Produto</span>
                            {openAccordions['5'] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                          {openAccordions['5'] && (
                            <div className="p-3 bg-white border-t border-slate-100 text-xs text-slate-500 space-y-2">
                              <p>Configuração dos produtos destacados no carrossel dinâmico.</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* COLUNA DIREITA: Preview Visual no Smartphone Mockup */}
              <div className="md:col-span-7 bg-slate-50/60 p-4 sm:p-6 flex flex-col items-center justify-center relative overflow-hidden">
                
                {/* Switch de Dispositivo no Canto Superior Direito do Preview */}
                <div className="absolute top-4 right-4 bg-slate-800 rounded-lg p-1 flex items-center gap-1 shadow-md z-20">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('desktop')}
                    className={`p-1.5 rounded-md transition-colors ${
                      previewDevice === 'desktop' ? 'bg-[#fd8539] text-white' : 'text-slate-400 hover:text-white'
                    }`}
                    title="Visualizar Desktop"
                  >
                    <Monitor size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('mobile')}
                    className={`p-1.5 rounded-md transition-colors ${
                      previewDevice === 'mobile' ? 'bg-[#fd8539] text-white' : 'text-slate-400 hover:text-white'
                    }`}
                    title="Visualizar Mobile"
                  >
                    <Smartphone size={14} />
                  </button>
                </div>

                {/* VISUALIZAÇÃO DA ABA BÁSICO: Identificação */}
                {activeTab === 'basico' ? (
                  <div className="w-full max-w-sm bg-white border border-slate-200/70 rounded-2xl p-8 text-center shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">IDENTIFICAÇÃO</p>
                    <h3 className="text-xl font-bold text-slate-800 mt-1 mb-8">
                      {styleName || 'Nome do Estilo'}
                    </h3>

                    {/* Diagrama Desktop <---> Mobile */}
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 mb-6">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col items-center gap-1.5">
                          <div className="w-12 h-10 border-2 border-slate-300 rounded-lg flex items-center justify-center bg-white shadow-xs">
                            <Monitor size={18} className="text-slate-400" />
                          </div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase">DESKTOP</span>
                        </div>

                        <div className="flex flex-col items-center">
                          <div className="border-t-2 border-dashed border-slate-300 w-16" />
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">SEPARADOS</span>
                        </div>

                        <div className="flex flex-col items-center gap-1.5">
                          <div className="w-8 h-10 border-2 border-slate-300 rounded-lg flex items-center justify-center bg-white shadow-xs">
                            <Smartphone size={16} className="text-slate-400" />
                          </div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase">MOBILE</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Configuração independente: Personalize aparências diferentes para Desktop e Mobile de forma isolada.
                    </p>
                  </div>
                ) : (
                  /* MOCKUP SMARTPHONE REALISTA */
                  <div className="relative w-[260px] h-[460px] bg-black rounded-[38px] p-2.5 shadow-2xl border-[6px] border-slate-800 flex flex-col justify-between">
                    {/* Speaker / Câmera Notch */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-3.5 bg-slate-900 rounded-full z-30" />

                    {/* TELA INTERNA DO SMARTPHONE */}
                    <div className="w-full h-full bg-slate-900 rounded-[28px] overflow-hidden relative flex flex-col justify-center">

                      {/* --- PREVIEW: FLUTUANTE --- */}
                      {activeTab === 'flutuante' && (
                        <div className="w-full h-full relative p-3">
                          {/* Mini widget flutuante no canto inferior direito */}
                          <div className="absolute bottom-4 right-4 w-16 h-24 rounded-xl border-2 border-[#0094eb] overflow-hidden shadow-xl bg-slate-800 flex items-center justify-center group cursor-pointer">
                            <img
                              src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=300&auto=format&fit=crop&q=80"
                              alt="Story"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                              <div className="w-6 h-6 rounded-full bg-white/90 text-slate-900 flex items-center justify-center shadow-md">
                                <Play size={10} fill="currentColor" className="ml-0.5" />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* --- PREVIEW: CARROSSEL --- */}
                      {activeTab === 'carrossel' && (
                        <div className="flex items-center gap-2 overflow-hidden px-3">
                          {/* Card 1 (Parcial) */}
                          <div className="w-14 h-48 rounded-xl bg-slate-800 opacity-40 shrink-0 overflow-hidden" />

                          {/* Card Central Destaque */}
                          <div className="w-36 h-56 rounded-2xl border-2 border-[#0094eb] overflow-hidden bg-slate-800 shrink-0 relative flex flex-col justify-between p-2 shadow-lg">
                            <img
                              src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=300&auto=format&fit=crop&q=80"
                              alt="Story"
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                              <div className="w-7 h-7 rounded-full bg-white/90 text-slate-900 flex items-center justify-center shadow-md">
                                <Play size={12} fill="currentColor" className="ml-0.5" />
                              </div>
                            </div>
                            {/* Card de produto na base */}
                            <div className="relative z-10 mt-auto bg-white rounded-lg p-1.5 shadow-md flex items-center gap-1.5">
                              <div className="w-6 h-6 rounded bg-slate-100 shrink-0 overflow-hidden">
                                <img
                                  src="https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=100&auto=format&fit=crop&q=80"
                                  alt="Produto"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[8px] font-bold text-slate-800 truncate leading-tight">Calça Confort</p>
                                <p className="text-[8px] font-bold text-[#0094eb] leading-tight">R$ 149,95</p>
                              </div>
                            </div>
                          </div>

                          {/* Card 3 (Parcial) */}
                          <div className="w-14 h-48 rounded-xl bg-slate-800 opacity-40 shrink-0 overflow-hidden" />
                        </div>
                      )}

                      {/* --- PREVIEW: CARROSSEL DINÂMICO --- */}
                      {activeTab === 'carrossel-dinamico' && (
                        <div className="flex items-center justify-center gap-2 overflow-hidden px-2">
                          <div className="w-12 h-44 rounded-xl bg-slate-800 opacity-30 shrink-0 overflow-hidden">
                            <img
                              src="https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=200&auto=format&fit=crop&q=80"
                              alt="Story"
                              className="w-full h-full object-cover"
                            />
                          </div>

                          {/* Card Maior Destaque Dinâmico */}
                          <div className="w-36 h-56 rounded-2xl border-2 border-[#0094eb] overflow-hidden bg-slate-800 shrink-0 relative flex flex-col justify-between p-2 shadow-xl">
                            <img
                              src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=300&auto=format&fit=crop&q=80"
                              alt="Story"
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/15 flex items-center justify-center">
                              <div className="w-7 h-7 rounded-full bg-white/90 text-slate-900 flex items-center justify-center shadow-md">
                                <Play size={12} fill="currentColor" className="ml-0.5" />
                              </div>
                            </div>
                            <div className="relative z-10 mt-auto bg-white rounded-lg p-1.5 shadow-md flex items-center gap-1.5">
                              <div className="w-6 h-6 rounded bg-slate-100 shrink-0 overflow-hidden">
                                <img
                                  src="https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=100&auto=format&fit=crop&q=80"
                                  alt="Produto"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[8px] font-bold text-slate-800 truncate leading-tight">Calça Confort</p>
                                <p className="text-[8px] font-bold text-[#0094eb] leading-tight">R$ 149,95</p>
                              </div>
                            </div>
                          </div>

                          <div className="w-12 h-44 rounded-xl bg-slate-800 opacity-30 shrink-0 overflow-hidden">
                            <img
                              src="https://images.unsplash.com/photo-1483985988355-763728e1935b?w=200&auto=format&fit=crop&q=80"
                              alt="Story"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>
                      )}

                      {/* --- PREVIEW: GRADE --- */}
                      {activeTab === 'grade' && (
                        <div className="grid grid-cols-2 gap-1.5 p-3">
                          {[
                            'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=200&auto=format&fit=crop&q=80',
                            'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=200&auto=format&fit=crop&q=80',
                            'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=200&auto=format&fit=crop&q=80',
                            'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=200&auto=format&fit=crop&q=80'
                          ].map((url, i) => (
                            <div key={i} className="h-24 rounded-xl overflow-hidden relative border border-[#0094eb]/70 bg-slate-800">
                              <img src={url} alt="Story" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                <div className="w-5 h-5 rounded-full bg-white/90 text-slate-900 flex items-center justify-center shadow-xs">
                                  <Play size={8} fill="currentColor" className="ml-0.5" />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* --- PREVIEW: PLAYER --- */}
                      {activeTab === 'player' && (
                        <div className="w-full h-full relative flex flex-col justify-between p-3 overflow-hidden">
                          <img
                            src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&auto=format&fit=crop&q=80"
                            alt="Story Player"
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70" />

                          {/* Topo do Player: Barra de progresso + Loja + Fechar */}
                          <div className="relative z-10 pt-3">
                            <div className="w-full h-1 bg-white/30 rounded-full overflow-hidden mb-2">
                              <div className="w-2/3 h-full bg-[#0094eb]" />
                            </div>
                            <div className="flex items-center justify-between text-white">
                              <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded-full border border-white/60 bg-white/20" />
                                <div>
                                  <p className="text-[9px] font-bold leading-tight">Calça Confort</p>
                                  <p className="text-[7px] text-white/70 leading-tight">Vidlytics Store</p>
                                </div>
                              </div>
                              <button className="text-white/80 hover:text-white">
                                <X size={12} />
                              </button>
                            </div>
                          </div>

                          {/* Lateral Direita: Ações (Like, Comentário, Compartilhar) */}
                          <div className="relative z-10 self-end flex flex-col items-center gap-2 mb-2 text-white">
                            <div className="flex flex-col items-center">
                              <div className="w-6 h-6 rounded-full bg-black/40 flex items-center justify-center">
                                <Heart size={11} fill="white" />
                              </div>
                              <span className="text-[8px] font-bold mt-0.5">1.2k</span>
                            </div>
                            <div className="flex flex-col items-center">
                              <div className="w-6 h-6 rounded-full bg-black/40 flex items-center justify-center">
                                <MessageSquare size={11} />
                              </div>
                              <span className="text-[8px] font-bold mt-0.5">48</span>
                            </div>
                            <div className="flex flex-col items-center">
                              <div className="w-6 h-6 rounded-full bg-black/40 flex items-center justify-center">
                                <Share2 size={11} />
                              </div>
                              <span className="text-[7px] font-bold mt-0.5">Enviar</span>
                            </div>
                          </div>

                          {/* Base: Card de Produto */}
                          <div className="relative z-10 bg-white rounded-xl p-2 shadow-lg flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                                <img
                                  src="https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=100&auto=format&fit=crop&q=80"
                                  alt="Produto"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div>
                                <p className="text-[9px] font-bold text-slate-800 leading-tight">Calça Confort ...</p>
                                <div className="flex items-center gap-1">
                                  <span className="text-[9px] font-bold text-[#0094eb]">R$ 149,95</span>
                                  <span className="text-[7px] text-slate-400 line-through">R$ 199,00</span>
                                </div>
                              </div>
                            </div>
                            <span className="text-slate-400 text-xs">›</span>
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Rodapé do Modal */}
            <div className="px-6 py-3.5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
              {/* Botão Resetar */}
              <button
                type="button"
                className="text-[11px] font-bold tracking-wider uppercase text-rose-500 hover:bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100 transition-colors self-start sm:self-auto"
              >
                RESETAR
              </button>

              {/* Aviso explicativo */}
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <Info size={13} className="text-[#0094eb] shrink-0" />
                <span>
                  Este painel é um <strong className="text-slate-600">preview meramente visual</strong>. Para testar cliques e interações, use o simulador na edição dos stories.
                </span>
              </div>

              {/* Botões Cancelar e Salvar */}
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  ✕ Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#0094eb] hover:bg-blue-600 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
                >
                  <Check size={14} />
                  Salvar
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default AparenciaTab;
