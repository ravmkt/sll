import React, { useState } from 'react';
import { BarChart3, Film, CheckSquare, Sparkles, HelpCircle, Hourglass, CheckCircle2, DollarSign, Wallet, Eye, MousePointerClick, Heart, MessageCircle, Percent, ArrowUpRight, TrendingDown, Compass, RefreshCw, Zap, Search, ChevronDown, Clock, Flame, LogOut, Volume2, Maximize2, Play, Share2, TrendingUp, TrendingDown, Info } from 'lucide-react';

type SubTab = 'visao-geral' | 'videos' | 'retencao' | 'insights';


function TrendBadge({ value, isPositive = true }: { value: string; isPositive?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
        isPositive ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
      }`}
      title={`${isPositive ? '+' : '-'}${value} vs últimos 7 dias`}
    >
      {isPositive ? (
        <TrendingUp className="w-2.5 h-2.5 text-emerald-600" />
      ) : (
        <TrendingDown className="w-2.5 h-2.5 text-rose-500" />
      )}
      <span>{isPositive ? '+' : ''}{value}</span>
    </span>
  );
}

export default function ResultadosTab() {
  const [subTab, setSubTab] = useState<SubTab>('visao-geral');
  const [periodo, setPeriodo] = useState('30 dias');
  const [searchVideo, setSearchVideo] = useState('');
  const [selectedVideo, setSelectedVideo] = useState('oculos-de-sol.mp4');
  const [filtroFinanceiro, setFiltroFinanceiro] = useState('Todas Juntas');
  const [filtroEngajamento, setFiltroEngajamento] = useState('Todas Juntas');

  return (
    <div className="space-y-6">
      
      {/* CABEÇALHO DA PÁGINA DE RESULTADOS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Resultados</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Métricas reais de <strong className="text-[#0094eb] font-semibold">Joias e Semijoias</strong> comparadas aos benchmarks nacionais de 2026.
          </p>
        </div>

        {/* Seletor de Período */}
        <div className="relative inline-block self-start sm:self-auto">
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className="appearance-none bg-white border border-slate-200 text-xs font-semibold text-slate-700 py-2 pl-3.5 pr-8 rounded-xl shadow-xs hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0094eb]/20 cursor-pointer"
          >
            <option value="7 dias">7 dias</option>
            <option value="15 dias">15 dias</option>
            <option value="30 dias">30 dias</option>
            <option value="90 dias">90 dias</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* PÍLULAS DE SUB-ABAS INTERNAS */}
      <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl w-fit border border-slate-200/60">
        <button
          onClick={() => setSubTab('visao-geral')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            subTab === 'visao-geral' 
              ? 'bg-[#0094eb] text-white shadow-xs' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Visão Geral</span>
        </button>

        <button
          onClick={() => setSubTab('videos')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            subTab === 'videos' 
              ? 'bg-[#0094eb] text-white shadow-xs' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Film className="w-3.5 h-3.5" />
          <span>Vídeos</span>
        </button>

        <button
          onClick={() => setSubTab('retencao')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            subTab === 'retencao' 
              ? 'bg-[#0094eb] text-white shadow-xs' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5" />
          <span>Retenção</span>
        </button>

        <button
          onClick={() => setSubTab('insights')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            subTab === 'insights' 
              ? 'bg-[#0094eb] text-white shadow-xs' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-pink-400" />
          <span>Insights</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* 1. SUB-ABA: VISÃO GERAL */}
      {/* ========================================================= */}
      {subTab === 'visao-geral' && (
        <div className="space-y-6">
          
          {/* SEÇÃO RESULTADOS FINANCEIROS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                Resultados Financeiros
              </h3>
              <span className="text-[11px] text-slate-400 font-medium">Período: Últimos 30 dias</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Aguardando Pagamento */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Aguardando Pagamento</span>
                    <HelpCircle className="w-3 h-3 text-slate-300 cursor-help" />
                  </div>
                  <p className="text-2xl font-bold text-amber-500">R$ 378,39</p>
                  <p className="text-xs text-slate-400">3 pedidos em aberto</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center border border-amber-100 flex-shrink-0">
                  <Hourglass className="w-4 h-4" />
                </div>
              </div>

              {/* Vendas Pagas */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Vendas Pagas</span>
                    <HelpCircle className="w-3 h-3 text-slate-300 cursor-help" />
                  </div>
                  <p className="text-2xl font-bold text-emerald-500">R$ 0,00</p>
                  <p className="text-xs text-slate-400">0 pedidos confirmados</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center border border-emerald-100 flex-shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>

              {/* Indicações */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Indicações</span>
                    <HelpCircle className="w-3 h-3 text-slate-300 cursor-help" />
                  </div>
                  <p className="text-2xl font-bold text-purple-600">R$ 0,00</p>
                  <p className="text-xs text-slate-400">Comissões disponíveis</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 flex-shrink-0">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>

              {/* Total Gerado */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Total Gerado</span>
                    <HelpCircle className="w-3 h-3 text-slate-300 cursor-help" />
                  </div>
                  <p className="text-2xl font-bold text-[#0094eb]">R$ 0,00</p>
                  <p className="text-xs text-slate-400">Vendas Pagas + Indicações</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#0094eb] text-white flex items-center justify-center shadow-xs flex-shrink-0">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          {/* GRÁFICO EVOLUÇÃO FINANCEIRA */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-slate-700" />
                  <h4 className="text-sm font-bold text-slate-800">Evolução Financeira Diária (R$)</h4>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">Monitore faturamento aprovado, boletos/Pix em aberto e receitas por dia.</p>
              </div>

              <div className="flex items-center gap-1 overflow-x-auto text-xs font-semibold">
                {['Todas Juntas', 'Aguardando', 'Vendas Pagas', 'Indicações', 'Total Gerado'].map((item) => (
                  <button
                    key={item}
                    onClick={() => setFiltroFinanceiro(item)}
                    className={`px-2.5 py-1 rounded-lg transition-colors ${
                      filtroFinanceiro === item ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            {/* Canvas Mock do Gráfico Financeiro */}
            <div className="w-full h-56 relative pt-4">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 900 180" preserveAspectRatio="none">
                {/* Linhas de Grade e Valores */}
                <line x1="40" y1="20" x2="880" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                <text x="5" y="24" fill="#94a3b8" fontSize="10">R$ 200</text>

                <line x1="40" y1="60" x2="880" y2="60" stroke="#f1f5f9" strokeWidth="1" />
                <text x="5" y="64" fill="#94a3b8" fontSize="10">R$ 150</text>

                <line x1="40" y1="100" x2="880" y2="100" stroke="#f1f5f9" strokeWidth="1" />
                <text x="5" y="104" fill="#94a3b8" fontSize="10">R$ 100</text>

                <line x1="40" y1="140" x2="880" y2="140" stroke="#f1f5f9" strokeWidth="1" />
                <text x="5" y="144" fill="#94a3b8" fontSize="10">R$ 50</text>

                <line x1="40" y1="170" x2="880" y2="170" stroke="#e2e8f0" strokeWidth="1" />
                <text x="5" y="174" fill="#94a3b8" fontSize="10">R$ 0</text>

                {/* Curva de Aguardando (Picos Amarelos) */}
                <path
                  d="M 50 170 L 520 170 Q 540 170 545 40 Q 550 170 570 170 L 730 170 Q 750 170 755 45 Q 760 170 780 170 L 870 170"
                  fill="none"
                  stroke="#eab308"
                  strokeWidth="2"
                />

                {/* Linhas Zeradas (Azul / Verde / Roxo) na base */}
                <path d="M 50 170 L 870 170" fill="none" stroke="#0094eb" strokeWidth="1.5" />
              </svg>

              {/* Datas no eixo X */}
              <div className="flex justify-between text-[9px] text-slate-400 font-mono mt-2 px-10">
                <span>23/08</span><span>25/08</span><span>27/08</span><span>29/08</span><span>31/08</span>
                <span>02/09</span><span>04/09</span><span>06/09</span><span>08/09</span><span>10/09</span>
                <span>12/09</span><span>14/09</span><span>16/09</span><span>18/09</span><span>20/09</span><span>22/09</span>
              </div>
            </div>

            {/* Legenda */}
            <div className="flex flex-wrap items-center justify-center gap-6 pt-3 text-[11px] text-slate-500 font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span>Aguardando Pagamento</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span>Vendas Pagas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                <span>Indicações</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0094eb]"></span>
                <span>Total Gerado</span>
              </div>
            </div>
          </div>

          {/* SEÇÃO PERFORMANCE DOS VÍDEOS & INTERAÇÃO DO PÚBLICO */}
          <div className="space-y-3">
            <h3 className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              Performance dos Vídeos & Interação do Público
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Visualizações */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Visualizações</span>
                    <HelpCircle className="w-3 h-3 text-slate-300 cursor-help" />
                  </div>
                  <p className="text-2xl font-bold text-slate-800">0</p>
                  <p className="text-xs text-slate-400">Sessões de stories abertas</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-[#0094eb] flex items-center justify-center border border-sky-100 flex-shrink-0">
                  <Eye className="w-4 h-4" />
                </div>
              </div>

              {/* Cliques em CTA */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Cliques em CTA</span>
                    <HelpCircle className="w-3 h-3 text-slate-300 cursor-help" />
                  </div>
                  <p className="text-2xl font-bold text-slate-800">0</p>
                  <p className="text-xs text-slate-400">Cliques no card/botão de compra</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#fd8539] flex items-center justify-center border border-orange-100 flex-shrink-0">
                  <MousePointerClick className="w-4 h-4" />
                </div>
              </div>

              {/* Engajamento Social */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Engajamento Social</span>
                    <HelpCircle className="w-3 h-3 text-slate-300 cursor-help" />
                  </div>
                  <div className="flex items-center gap-4 pt-0.5">
                    <div>
                      <p className="text-xl font-bold text-rose-500">0</p>
                      <p className="text-[10px] text-slate-400 font-medium">Curtidas</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-[#0094eb]">0</p>
                      <p className="text-[10px] text-slate-400 font-medium">Comentários</p>
                    </div>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center border border-rose-100 flex-shrink-0">
                  <Heart className="w-4 h-4" />
                </div>
              </div>

              {/* CTR (Taxa de Cliques) */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">CTR (Taxa de Cliques)</span>
                    <HelpCircle className="w-3 h-3 text-slate-300 cursor-help" />
                  </div>
                  <p className="text-2xl font-bold text-slate-800">0.0%</p>
                  <p className="text-xs text-slate-400">Cliques sobre visualizações</p>
                  <div className="inline-flex items-center gap-1 bg-rose-50 text-rose-600 text-[10px] font-semibold px-1.5 py-0.5 rounded">
                    <span>↘ -3.9% vs Setor</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center border border-emerald-100 flex-shrink-0">
                  <Percent className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          {/* GRÁFICO EVOLUÇÃO DIÁRIA DE ENGAJAMENTO & FUNIL */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-slate-700" />
                  <h4 className="text-sm font-bold text-slate-800">Evolução Diária de Engajamento & Funil de Vídeos</h4>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">Acompanhe o volume de visualizações, cliques nos produtos, reações e a taxa de CTR ao longo do tempo.</p>
              </div>

              <div className="flex items-center gap-1 overflow-x-auto text-xs font-semibold">
                {['Todas Juntas', 'Visualizações', 'Cliques CTA', 'Engajamento', 'CTR (%)'].map((item) => (
                  <button
                    key={item}
                    onClick={() => setFiltroEngajamento(item)}
                    className={`px-2.5 py-1 rounded-lg transition-colors ${
                      filtroEngajamento === item ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            {/* Canvas Mock do Gráfico de Funil */}
            <div className="w-full h-44 relative pt-4">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 900 140" preserveAspectRatio="none">
                <line x1="40" y1="20" x2="880" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                <text x="15" y="24" fill="#94a3b8" fontSize="10">4</text>

                <line x1="40" y1="55" x2="880" y2="55" stroke="#f1f5f9" strokeWidth="1" />
                <text x="15" y="59" fill="#94a3b8" fontSize="10">3</text>

                <line x1="40" y1="90" x2="880" y2="90" stroke="#f1f5f9" strokeWidth="1" />
                <text x="15" y="94" fill="#94a3b8" fontSize="10">2</text>

                <line x1="40" y1="125" x2="880" y2="125" stroke="#f1f5f9" strokeWidth="1" />
                <text x="15" y="129" fill="#94a3b8" fontSize="10">1</text>

                <line x1="40" y1="135" x2="880" y2="135" stroke="#e2e8f0" strokeWidth="1" />
                <text x="15" y="139" fill="#94a3b8" fontSize="10">0</text>

                {/* Linha zerada no eixo X com pontos */}
                <path d="M 50 135 L 870 135" fill="none" stroke="#0094eb" strokeWidth="1.5" />
              </svg>

              <div className="flex justify-between text-[9px] text-slate-400 font-mono mt-2 px-10">
                <span>23/08</span><span>25/08</span><span>27/08</span><span>29/08</span><span>31/08</span>
                <span>02/09</span><span>04/09</span><span>06/09</span><span>08/09</span><span>10/09</span>
                <span>12/09</span><span>14/09</span><span>16/09</span><span>18/09</span><span>20/09</span><span>22/09</span>
              </div>
            </div>

            {/* Legenda */}
            <div className="flex flex-wrap items-center justify-center gap-6 pt-3 text-[11px] text-slate-500 font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0094eb]"></span>
                <span>Visualizações</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span>Cliques em CTA</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                <span>Engajamento Social</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span>Taxa de Cliques (CTR %)</span>
              </div>
            </div>
          </div>

          {/* BANNER BENCHMARK DO SETOR */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-[#0094eb] flex items-center justify-center border border-sky-100 flex-shrink-0">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-slate-800">Como funciona o benchmark do setor?</h5>
                <p className="text-xs text-slate-400 mt-0.5 max-w-2xl leading-relaxed">
                  As metas de comparação do setor de <strong>Joias e Semijoias</strong> são baseadas em pesquisas consolidadas de mercado nacional de 2026 (Ebit/Nielsen, Neotrust e Social Commerce global).
                </p>
              </div>
            </div>

            <button className="bg-[#0094eb] hover:bg-sky-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs flex-shrink-0">
              Ver Estudo de Mercado
            </button>
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* 2. SUB-ABA: VÍDEOS */}
      {/* ========================================================= */}
      {subTab === 'videos' && (
        <div className="space-y-6">
          {/* CARDS MÉTRICAS DE VÍDEOS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Total de Visualizações</span>
                  <HelpCircle className="w-3 h-3 text-slate-300 cursor-help" />
                </div>
                <p className="text-2xl font-bold text-slate-800">0</p>
                <p className="text-xs text-slate-400">Média de <strong>0</strong> por vídeo</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-[#0094eb] flex items-center justify-center border border-sky-100">
                <Eye className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">CTR Médio Geral</span>
                  <HelpCircle className="w-3 h-3 text-slate-300 cursor-help" />
                </div>
                <p className="text-2xl font-bold text-slate-800">0,0%</p>
                <p className="text-xs text-slate-400">Em 2 vídeos analisados</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center border border-emerald-100">
                <Percent className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Conversões Atribuídas</span>
                  <HelpCircle className="w-3 h-3 text-slate-300 cursor-help" />
                </div>
                <p className="text-2xl font-bold text-slate-800">0</p>
                <p className="text-xs text-emerald-600 font-medium">Receita: R$ 0,00</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#fd8539] flex items-center justify-center border border-orange-100">
                <Wallet className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Engajamento Total</span>
                  <HelpCircle className="w-3 h-3 text-slate-300 cursor-help" />
                </div>
                <div className="flex items-center gap-4 pt-0.5">
                  <div>
                    <p className="text-xl font-bold text-rose-500">3</p>
                    <p className="text-[10px] text-slate-400 font-medium">Curtidas</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-[#0094eb]">0</p>
                    <p className="text-[10px] text-slate-400 font-medium">Comentários</p>
                  </div>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center border border-rose-100">
                <Heart className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* BUSCA */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por título do vídeo..."
              value={searchVideo}
              onChange={(e) => setSearchVideo(e.target.value)}
              className="w-full bg-white border border-slate-200 text-xs text-slate-700 py-3 pl-10 pr-4 rounded-xl shadow-xs focus:outline-none focus:ring-2 focus:ring-[#0094eb]/20"
            />
          </div>

          {/* TABELA DE VÍDEOS */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-3 px-4">Vídeo</th>
                    <th className="py-3 px-4 text-center">Visualizações ↓</th>
                    <th className="py-3 px-4 text-center">CTR</th>
                    <th className="py-3 px-4 text-center">Conversões</th>
                    <th className="py-3 px-4 text-center">Receita</th>
                    <th className="py-3 px-4 text-center">Engajamento</th>
                    <th className="py-3 px-4 text-center">Duração</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200/80 overflow-hidden flex-shrink-0 flex items-center justify-center">
  <Eye className="w-4 h-4 text-slate-400" />
</div>
                      <div>
                        <p className="font-bold text-slate-800">oculos-de-sol.mp4</p>
                        <span className="text-[10px] text-emerald-600 font-medium">Ativo</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-700">0</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="bg-rose-50 text-rose-600 text-[10px] font-bold px-2 py-0.5 rounded-full">0,0%</span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-700">0</td>
                    <td className="py-3.5 px-4 text-center text-slate-400">—</td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
  <div className="inline-flex items-center justify-center gap-3 text-xs font-semibold">
    <span className="inline-flex items-center gap-1 text-rose-400" title="Curtidas">
      <Heart className="w-3.5 h-3.5 stroke-rose-400 fill-rose-50" />
      <span className="text-slate-600">1</span>
    </span>
    <span className="inline-flex items-center gap-1 text-emerald-500" title="Comentários">
      <MessageCircle className="w-3.5 h-3.5 stroke-emerald-500 fill-emerald-50" />
      <span className="text-slate-600">0</span>
    </span>
    <span className="inline-flex items-center gap-1 text-[#fd8539]" title="Compartilhamentos">
      <Share2 className="w-3.5 h-3.5 stroke-[#fd8539]" />
      <span className="text-slate-600">0</span>
    </span>
  </div>
</td>
                    <td className="py-3.5 px-4 text-center text-slate-400">—</td>
                  </tr>

                  <tr className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200/80 overflow-hidden flex-shrink-0 flex items-center justify-center">
  <img 
    src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=150&auto=format&fit=crop&q=80" 
    alt="Criação_de_Vídeo_Fashion_..." 
    className="w-full h-full object-cover"
    onError={(e) => {
      (e.target as HTMLElement).style.display = 'none';
    }}
  />
</div>
                      <div>
                        <p className="font-bold text-slate-800">Criação_de_Vídeo_Fashion_...</p>
                        <span className="text-[10px] text-emerald-600 font-medium">Ativo</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-700">0</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="bg-rose-50 text-rose-600 text-[10px] font-bold px-2 py-0.5 rounded-full">0,0%</span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-700">0</td>
                    <td className="py-3.5 px-4 text-center text-slate-400">—</td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
  <div className="inline-flex items-center justify-center gap-3 text-xs font-semibold">
    <span className="inline-flex items-center gap-1 text-rose-400" title="Curtidas">
      <Heart className="w-3.5 h-3.5 stroke-rose-400 fill-rose-50" />
      <span className="text-slate-600">2</span>
    </span>
    <span className="inline-flex items-center gap-1 text-emerald-500" title="Comentários">
      <MessageCircle className="w-3.5 h-3.5 stroke-emerald-500 fill-emerald-50" />
      <span className="text-slate-600">0</span>
    </span>
    <span className="inline-flex items-center gap-1 text-[#fd8539]" title="Compartilhamentos">
      <Share2 className="w-3.5 h-3.5 stroke-[#fd8539]" />
      <span className="text-slate-600">0</span>
    </span>
  </div>
</td>
                    <td className="py-3.5 px-4 text-center text-slate-400">—</td>
                    </tr>
                </tbody>
              </table>
              <div className="px-4 py-2.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <div className="flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-[#0094eb]" />
                  <span>As setas e porcentagens representam o comparativo de desempenho em relação aos <strong>últimos 7 dias</strong>.</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1 text-emerald-700">
                    <TrendingUp className="w-3 h-3 text-emerald-600" /> Alta
                  </span>
                  <span className="inline-flex items-center gap-1 text-rose-700">
                    <TrendingDown className="w-3 h-3 text-rose-500" /> Baixa
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. SUB-ABA: RETENÇÃO */}
      {/* ========================================================= */}
      {subTab === 'retencao' && (
        <div className="space-y-6">
          {/* CARDS SUPERIORES DE RETENÇÃO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Taxa de Conclusão</span>
                <p className="text-2xl font-bold text-slate-800">0%</p>
                <p className="text-xs text-slate-400">Assistiram até o último segundo</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center border border-emerald-100">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Tempo Médio</span>
                <p className="text-2xl font-bold text-slate-800">0s <span className="text-xs font-normal text-slate-400">de 15s</span></p>
                <p className="text-xs text-slate-400">0% da duração total</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-[#0094eb] flex items-center justify-center border border-sky-100">
                <Clock className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Maior Queda</span>
                <p className="text-2xl font-bold text-slate-800">12s</p>
                <p className="text-xs text-slate-400">Momento com maior evasão do público</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center border border-amber-100">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Taxa de Evasão</span>
                <p className="text-2xl font-bold text-slate-800">100%</p>
                <p className="text-xs text-slate-400">Saíram antes do final</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center border border-rose-100">
                <LogOut className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* VÍDEO ANALISADO DROPDOWN */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Vídeo Analisado</h4>
              <p className="text-xs text-slate-400">Selecione qual vídeo você quer inspecionar</p>
            </div>

            <div className="relative inline-block w-full sm:w-72">
              <select
                value={selectedVideo}
                onChange={(e) => setSelectedVideo(e.target.value)}
                className="w-full appearance-none bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 py-2.5 pl-3.5 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0094eb]/20 cursor-pointer"
              >
                <option value="oculos-de-sol.mp4">oculos-de-sol.mp4</option>
                <option value="criacao-video-fashion.mp4">Criação_de_Vídeo_Fashion_...</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* GRID: CURVA DE RETENÇÃO (ESQ) & PLAYER PREVIEW (DIR) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Curva de Retenção */}
            <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Curva de Retenção (Segundo a Segundo)</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Acompanhe onde a audiência perde o interesse ou onde fica engajada</p>
                </div>
                <HelpCircle className="w-4 h-4 text-slate-300 cursor-help" />
              </div>

              {/* Área do Gráfico */}
              <div className="w-full h-64 relative pt-4">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 600 200" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="retentionGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#0094eb" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#0094eb" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>

                  {/* Linhas de Grade */}
                  <line x1="40" y1="20" x2="580" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                  <text x="5" y="24" fill="#94a3b8" fontSize="10">100%</text>

                  <line x1="40" y1="70" x2="580" y2="70" stroke="#f1f5f9" strokeWidth="1" />
                  <text x="5" y="74" fill="#94a3b8" fontSize="10">75%</text>

                  <line x1="40" y1="120" x2="580" y2="120" stroke="#f1f5f9" strokeWidth="1" />
                  <text x="5" y="124" fill="#94a3b8" fontSize="10">50%</text>

                  <line x1="40" y1="170" x2="580" y2="170" stroke="#f1f5f9" strokeWidth="1" />
                  <text x="5" y="174" fill="#94a3b8" fontSize="10">25%</text>

                  <line x1="40" y1="195" x2="580" y2="195" stroke="#e2e8f0" strokeWidth="1" />
                  <text x="5" y="198" fill="#94a3b8" fontSize="10">0%</text>

                  {/* Linha Tracejada Vermelha Maior Queda (12s aprox X=470) */}
                  <line x1="470" y1="15" x2="470" y2="195" stroke="#f43f5e" strokeWidth="1" strokeDasharray="3 3" />

                  {/* Área e Linha de Retenção */}
                  <path
                    d="M 40 20 L 470 20 Q 520 30 580 80 L 580 195 L 40 195 Z"
                    fill="url(#retentionGradient)"
                  />
                  <path
                    d="M 40 20 L 470 20 Q 520 30 580 80"
                    fill="none"
                    stroke="#0094eb"
                    strokeWidth="2.5"
                  />
                </svg>

                {/* Eixo de segundos */}
                <div className="flex justify-between text-[9px] text-slate-400 font-mono mt-2 px-6">
                  <span>0s</span><span>1s</span><span>2s</span><span>3s</span><span>4s</span>
                  <span>5s</span><span>6s</span><span>7s</span><span>8s</span><span>9s</span>
                  <span>10s</span><span>11s</span><span className="text-rose-500 font-bold">12s</span><span>13s</span><span>14s</span><span>15s</span>
                </div>
              </div>

              {/* Card Diagnóstico Inteligente */}
              <div className="p-3.5 rounded-xl bg-sky-50/70 border border-sky-100 flex items-center gap-2.5 text-xs text-sky-900">
                <Sparkles className="w-4 h-4 text-[#0094eb] flex-shrink-0" />
                <p>
                  <strong>Diagnóstico Inteligente:</strong> Boa retenção inicial. A maior parte da audiência permaneceu além dos primeiros segundos de exibição.
                </p>
              </div>
            </div>

            {/* Visualização do Vídeo (Mock Player) */}
            <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
              <div>
                <h4 className="text-sm font-bold text-slate-800">Visualização</h4>
                <p className="text-xs text-slate-400 truncate">{selectedVideo}</p>
              </div>

              <div className="relative aspect-[9/16] max-h-[460px] mx-auto rounded-2xl overflow-hidden bg-slate-900 shadow-md group">
                <img
                  src="https://images.unsplash.com/photo-1508296695146-257a814070b4?w=600&auto=format&fit=crop&q=80"
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none"></div>

                {/* Controles Mock do Player */}
                <div className="absolute bottom-0 inset-x-0 p-4 space-y-2">
                  <div className="w-full bg-white/30 h-1 rounded-full overflow-hidden">
                    <div className="bg-[#0094eb] h-full w-3/4 rounded-full"></div>
                  </div>
                  <div className="flex items-center justify-between text-white text-xs">
                    <div className="flex items-center gap-3">
                      <Play className="w-3.5 h-3.5 fill-white cursor-pointer" />
                      <Volume2 className="w-3.5 h-3.5 cursor-pointer" />
                    </div>
                    <Maximize2 className="w-3.5 h-3.5 cursor-pointer" />
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. SUB-ABA: INSIGHTS */}
      {/* ========================================================= */}
      {subTab === 'insights' && (
        <div className="space-y-6">
          {/* TOPO: VIDLYTICS AI INSIGHTS */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-[#0094eb] flex items-center justify-center border border-sky-100 flex-shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">Vidlytics AI Insights</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Análise inteligente do comportamento dos seus Stories nos últimos <strong>30 dias</strong>.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs">
                <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                <span>Atualizar</span>
              </button>
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-50 text-[#0094eb] border border-sky-100 text-xs font-bold">
                <Zap className="w-3.5 h-3.5 fill-[#0094eb]" />
                <span>Motor de Regras Ativo</span>
              </div>
            </div>
          </div>

          {/* EMPTY STATE ELEGANTE */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-16 text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 mx-auto">
              <Film className="w-8 h-8" />
            </div>
            <h4 className="text-sm font-bold text-slate-700">Sem insights para este período</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              Precisamos de mais dados de visualizações e interações para gerar análises confiáveis. Volte em breve ou clique em "Atualizar".
            </p>
          </div>
        </div>
      )}

    </div>
  );
}


