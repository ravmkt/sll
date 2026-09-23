import React, { useState } from 'react';
import { Palette, Check, RefreshCw, Layout, Eye, Sparkles } from 'lucide-react';

export default function AparenciaTab() {
  const [corPrimaria, setCorPrimaria] = useState('#0094eb');
  const [bordaArredondada, setBordaArredondada] = useState('rounded-xl');
  const [posicaoWidget, setPosicaoWidget] = useState('bottom-right');
  const [salvando, setSalvando] = useState(false);

  const salvarConfigs = () => {
    setSalvando(true);
    setTimeout(() => setSalvando(false), 800);
  };

  return (
    <div className="space-y-6">
      {/* CABEÇALHO PADRÃO RESULTADOS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Aparência do Widget</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Personalize as cores, posições e estilo visual dos <strong className="text-[#0094eb] font-semibold">Stories e Vídeos</strong> na sua loja.
          </p>
        </div>

        <button
          onClick={salvarConfigs}
          disabled={salvando}
          className="bg-[#0094eb] hover:bg-sky-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs flex-shrink-0 self-start sm:self-auto cursor-pointer"
        >
          {salvando ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* FORMULÁRIO DE CONFIGURAÇÕES */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
          <div className="space-y-3">
            <h3 className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              Identidade Visual & Cores
            </h3>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">Cor Principal de Destaque</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={corPrimaria}
                  onChange={(e) => setCorPrimaria(e.target.value)}
                  className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={corPrimaria}
                  onChange={(e) => setCorPrimaria(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-700 py-2.5 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0094eb]/20"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              Formato & Posição
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Arredondamento das Bordas</label>
                <select
                  value={bordaArredondada}
                  onChange={(e) => setBordaArredondada(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 py-2.5 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0094eb]/20 cursor-pointer"
                >
                  <option value="rounded-none">Reto (Sem borda)</option>
                  <option value="rounded-lg">Leve (8px)</option>
                  <option value="rounded-xl">Médio (12px)</option>
                  <option value="rounded-2xl">Arredondado (16px)</option>
                  <option value="rounded-full">Circular (Stories)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Posição na Tela do Visitante</label>
                <select
                  value={posicaoWidget}
                  onChange={(e) => setPosicaoWidget(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 py-2.5 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0094eb]/20 cursor-pointer"
                >
                  <option value="bottom-right">Canto Inferior Direito</option>
                  <option value="bottom-left">Canto Inferior Esquerdo</option>
                  <option value="top-bar">Carrossel Topo da Página</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* PRÉ-VISUALIZAÇÃO */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-800">Pré-visualização do Widget</h4>
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Tempo Real</span>
          </div>

          <div className="h-72 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 flex flex-col items-center justify-center relative overflow-hidden">
            <div 
              className={`p-3 text-white text-xs font-bold shadow-md flex items-center gap-2 ${bordaArredondada}`}
              style={{ backgroundColor: corPrimaria }}
            >
              <Sparkles className="w-4 h-4" />
              <span>Ver Stories da Loja</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-4 text-center">
              Assim o botão do widget será exibido para os clientes no seu e-commerce.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
