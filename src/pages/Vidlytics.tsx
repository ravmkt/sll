import React, { useState } from 'react';
import { 
  Settings, Sparkles, Copy, Check, DollarSign, Share2, Eye, 
  Clock, HardDrive, FileText, CheckCircle2, Play,
  Edit3, Palette
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Vidlytics() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'visao-geral' | 'resultados' | 'stories' | 'biblioteca' | 'produtos' | 'comentarios' | 'aparencia'>('visao-geral');
  const [copiedLink, setCopiedLink] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  
  // Controle de Ativação do Aplicativo com Toggle
  const [appActivated, setAppActivated] = useState(true);

  const referralLink = "https://vidlytics.com.br/indique/useanny";

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      
      {/* 1. TOPBAR ORIGINAL (Mantida com engrenagem SLL e módulo à direita) */}
      <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => navigate('/')} 
            className="flex items-center space-x-2 text-sm font-semibold text-slate-700 hover:text-[#0094eb] transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-200/70 flex items-center justify-center text-[#fd8539] shadow-xs">
              <Settings className="w-4 h-4 text-[#fd8539]" />
            </div>
            <span>Voltar ao Hub Central</span>
          </button>
        </div>

        <div className="flex items-center space-x-3">
          <div className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 flex items-center text-xs font-semibold text-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
            Módulo: <span className="ml-1 text-[#0094eb]">Vidlytics Stories</span>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        
        {/* Banner Global (Cross-sell / Promo) */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 shadow-md border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl z-10">
            <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-[#fd8539] to-orange-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
              <Sparkles className="w-3 h-3" /> Turbine seu E-commerce
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Transforme visitantes em clientes com Vídeos Curtos e Stories
            </h2>
            <p className="text-sm text-slate-300">
              Seus produtos integrados diretamente nos vídeos interativos com conversão em tempo real.
            </p>
          </div>

          <div className="hidden lg:block w-72 h-28 bg-slate-800/80 rounded-xl border border-slate-700/60 p-3 shadow-inner relative overflow-hidden backdrop-blur-sm">
            <div className="text-[10px] text-slate-400 font-mono flex justify-between">
              <span>USERS: LAST 7 DAYS</span>
              <span className="text-emerald-400">+57.1%</span>
            </div>
            <div className="mt-2 flex items-end gap-1 h-16">
              {[40, 65, 30, 80, 55, 90, 75, 45, 95, 85, 60, 100].map((h, i) => (
                <div key={i} className="flex-1 bg-gradient-to-t from-[#0094eb]/30 to-[#0094eb] rounded-t-sm" style={{ height: `${h}%` }}></div>
              ))}
            </div>
          </div>
        </div>

        {/* 2. BARRA DE ABAS COM LOGOTIPO ORIGINAL */}
        <div className="bg-white rounded-xl p-2 shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2 pl-2">
            <img 
              src="/vidlytics-logo.svg" 
              alt="Vidlytics" 
              className="h-6 w-auto"
              onError={(e) => {
                // Fallback caso a extensão seja png ou svg
                const target = e.currentTarget;
                if (!target.src.endsWith('.png')) {
                  target.src = '/vidlytics-logo.png';
                }
              }} 
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto py-1">
            {[
              { id: 'visao-geral', label: 'Visão Geral' },
              { id: 'resultados', label: 'Resultados' },
              { id: 'stories', label: 'Stories' },
              { id: 'biblioteca', label: 'Biblioteca' },
              { id: 'produtos', label: 'Produtos' },
              { id: 'comentarios', label: 'Comentários' },
              { id: 'aparencia', label: 'Aparência' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-[#0094eb] text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ================= ABA: VISÃO GERAL ================= */}
        {activeTab === 'visao-geral' && (
          <div className="space-y-6">
            
            {/* Bloco de Boas-Vindas + Card de Status Discreto com Toggle */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="bg-sky-100 text-[#0094eb] font-bold text-[10px] tracking-wider px-2 py-0.5 rounded uppercase">
                    Plano Scale
                  </span>
                  <span className="bg-purple-100 text-purple-600 font-bold text-[10px] tracking-wider px-2 py-0.5 rounded uppercase">
                    Acesso Vitalício
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-slate-800">Olá, Loja</h2>
              </div>

              {/* Card Estreito de Status do Aplicativo com Toggle */}
              <div className={`p-3.5 px-4 rounded-2xl border transition-all flex items-center justify-between gap-4 shadow-sm max-w-md w-full ${
                appActivated ? 'bg-emerald-50/70 border-emerald-200' : 'bg-slate-100 border-slate-300'
              }`}>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${appActivated ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                    <span className={`text-[11px] font-bold uppercase tracking-wider ${appActivated ? 'text-emerald-800' : 'text-slate-600'}`}>
                      {appActivated ? 'Aplicativo Ativado' : 'Aplicativo Pausado'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    {appActivated 
                      ? 'Seus vídeos estão online e sendo transmitidos publicamente no seu e-commerce.' 
                      : 'Seus vídeos estão temporariamente pausados na loja.'}
                  </p>
                </div>

                {/* Switch Toggle */}
                <button
                  type="button"
                  onClick={() => setAppActivated(!appActivated)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    appActivated ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                  role="switch"
                  aria-checked={appActivated}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      appActivated ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* SEÇÃO 1: RESULTADOS DE VENDAS VINDAS DOS VÍDEOS */}
            <div className="space-y-2">
              <h3 className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                Resultados de vendas vindas dos vídeos
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Vendas Pagas */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Vendas Pagas</span>
                      <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                        0 Pedidos
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-slate-800">R$ 0,00</p>
                    <a href="#pedidos" className="text-xs text-slate-400 hover:text-[#0094eb] transition-colors inline-flex items-center gap-0.5">
                      Faturamento confirmado &rarr;
                    </a>
                  </div>
                  <div className="w-10 h-10 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-500 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>

                {/* Aguardando Pagamento */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Aguardando Pagamento</span>
                      <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                        3 Pedidos
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-slate-800">R$ 378,39</p>
                    <a href="#pendentes" className="text-xs text-slate-400 hover:text-[#0094eb] transition-colors inline-flex items-center gap-0.5">
                      Pix / Boleto pendente &rarr;
                    </a>
                  </div>
                  <div className="w-10 h-10 rounded-full border border-amber-200 bg-amber-50 text-amber-500 flex items-center justify-center">
                    <Clock className="w-5 h-5" />
                  </div>
                </div>

                {/* Faturamento Indicações */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Faturamento Indicações</span>
                      <span className="bg-sky-100 text-[#0094eb] text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                        Comissões
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-slate-800">R$ 0,00</p>
                    <a href="#indica" className="text-xs text-slate-400 hover:text-[#0094eb] transition-colors inline-flex items-center gap-0.5">
                      Ver detalhes no Indica & Ganha &rarr;
                    </a>
                  </div>
                  <div className="w-10 h-10 rounded-full border border-sky-200 bg-sky-50 text-[#0094eb] flex items-center justify-center font-bold">
                    $
                  </div>
                </div>
              </div>
            </div>

            {/* SEÇÃO 2: CONSUMO DO PLANO */}
            <div className="space-y-2">
              <h3 className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                Consumo do Plano
              </h3>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Visualizações */}
                  <div className="space-y-2 border-b sm:border-b-0 sm:border-r border-slate-100 pb-4 sm:pb-0 sm:pr-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Visualizações</span>
                      <Eye className="w-3.5 h-3.5 text-[#0094eb]" />
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-xl font-bold text-slate-800">57</span>
                      <span className="text-xs text-slate-400">de 60.000</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                      <span>Quota do mês</span>
                      <span className="font-semibold text-slate-600">0%</span>
                    </div>
                  </div>

                  {/* Armazenamento */}
                  <div className="space-y-2 border-b lg:border-b-0 lg:border-r border-slate-100 pb-4 sm:pb-0 sm:pr-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Armazenamento</span>
                      <HardDrive className="w-3.5 h-3.5 text-[#0094eb]" />
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-xl font-bold text-slate-800">10.3 MB</span>
                      <span className="text-xs text-slate-400">de 50 GB</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                      <span>Vídeos na nuvem</span>
                      <span className="font-semibold text-slate-600">0%</span>
                    </div>
                  </div>

                  {/* Páginas com Vídeos */}
                  <div className="space-y-2 border-b sm:border-b-0 sm:border-r border-slate-100 pb-4 sm:pb-0 sm:pr-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Páginas com Vídeos</span>
                      <FileText className="w-3.5 h-3.5 text-[#0094eb]" />
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-xl font-bold text-slate-800">1</span>
                      <span className="text-xs text-slate-400">de 9999 ativas</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                      <span>Locais de exibição</span>
                      <span className="font-semibold text-slate-600">0%</span>
                    </div>
                  </div>

                  {/* Ciclo da Conta */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Ciclo da Conta</span>
                      <Clock className="w-3.5 h-3.5 text-[#0094eb]" />
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs font-semibold text-slate-400 uppercase">Status</span>
                      <span className="text-base font-bold text-slate-800">Vitalício</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                      <span>Renovação:</span>
                      <span className="font-semibold text-slate-600">— (sem vencimento)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SEÇÃO 3: CHECKLIST + LOG DE ATIVIDADES */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              
              {/* Card: Checklist da Ativação da Loja */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Checklist da Ativação da Loja</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Conclua os passos para publicar seus stories.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full w-full"></div>
                    </div>
                    <span className="text-xs font-bold text-emerald-600">100%</span>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  {[
                    { title: 'Configurações da loja', desc: 'Preencha os dados cadastrais, e-mail e integre seu canal de WhatsApp.' },
                    { title: 'Instalação do script', desc: 'Copie e instale o script de embed nas plataformas ou via GTM.' },
                    { title: 'Vincular os produtos', desc: 'Vincule produtos com preço para permitir compra direta através dos vídeos.' },
                    { title: 'Subir vídeos', desc: 'Suba seus vídeos verticais ou importe do Instagram/TikTok.' },
                    { title: 'Criar coleção de Stories', desc: 'Agrupe seus vídeos em coleções interativas.' },
                    { title: 'Configurar a aparência', desc: 'Personalize cores, fontes, bordas e botões do player de stories.' }
                  ].map((step, idx) => (
                    <div key={idx} className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-700 line-through decoration-slate-400">{step.title}</p>
                        <p className="text-[11px] text-slate-400 truncate">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card: Atividade Recente (Log do Painel) */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Atividade Recente (Log do Painel)</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Histórico em tempo real de alterações e atividades do usuário.</p>
                </div>

                <div className="max-h-[380px] overflow-y-auto space-y-3 pr-2 scrollbar-thin">
                  {[
                    { icon: Edit3, color: 'text-purple-500 bg-purple-50', text: 'Coleção de stories atualizada: TESTE', time: '16 de set. às 16:29' },
                    { icon: Settings, color: 'text-amber-500 bg-amber-50', text: 'Configurações da loja salvas: Use Anny Moda Feminina', time: '15 de set. às 13:57' },
                    { icon: Settings, color: 'text-amber-500 bg-amber-50', text: 'Configurações da loja salvas: Use Anny Moda Feminina', time: '15 de set. às 10:52' },
                    { icon: Settings, color: 'text-amber-500 bg-amber-50', text: 'Configurações da loja salvas: Use Anny Moda Feminina', time: '10 de set. às 08:30' },
                    { icon: Edit3, color: 'text-purple-500 bg-purple-50', text: 'Coleção de stories atualizada: TESTE', time: '09 de set. às 16:50' },
                    { icon: Palette, color: 'text-sky-500 bg-sky-50', text: 'Aparência do player atualizada: USEANNY', time: '09 de set. às 16:23' }
                  ].map((log, idx) => {
                    const IconComponent = log.icon;
                    return (
                      <div key={idx} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${log.color}`}>
                          <IconComponent className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">{log.text}</p>
                          <p className="text-[11px] text-slate-400">{log.time}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* SEÇÃO 4: VIDLYTICS ACADEMY + INDIQUE E GANHE */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              
              {/* Card 1: Vidlytics Academy (7 colunas) */}
              <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-center">
                <div className="flex flex-col sm:flex-row items-center gap-5">
                  <div 
                    onClick={() => setShowVideoModal(true)}
                    className="relative w-full sm:w-44 h-28 rounded-xl overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-sky-400 flex items-center justify-center cursor-pointer group shadow-sm flex-shrink-0"
                  >
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>
                    <div className="w-10 h-10 rounded-full bg-[#0094eb] group-hover:scale-110 text-white flex items-center justify-center shadow-lg transition-transform z-10 border border-white/30">
                      <Play className="w-4 h-4 fill-white ml-0.5" />
                    </div>
                  </div>

                  <div className="flex-1 space-y-1.5 text-center sm:text-left">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 tracking-wider uppercase bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100">
                      <Play className="w-2.5 h-2.5 fill-sky-600" /> Vidlytics Academy
                    </span>
                    <h4 className="text-base font-bold text-slate-900 leading-snug">
                      Como dobrar suas conversões com vídeos em 3 passos
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Aprenda as melhores práticas de posicionamento e gatilhos de CTA para aumentar as vendas da sua loja.
                    </p>
                  </div>
                </div>
              </div>

              {/* Card 2: Indique e Ganhe (5 colunas) */}
              <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-sky-100 text-[#0094eb] flex items-center justify-center font-bold text-sm">
                        $
                      </div>
                      <h4 className="text-base font-bold text-slate-900">Indique e Ganhe</h4>
                    </div>
                    <button 
                      onClick={handleCopyLink} 
                      className="text-slate-400 hover:text-slate-600 transition-colors"
                      title="Compartilhar link"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed mb-4">
                    Receba comissões e desbloqueie meses gratuitos ao indicar o Vidlytics para outros lojistas.
                  </p>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={handleCopyLink}
                    className="w-full bg-[#0094eb] hover:bg-sky-600 active:scale-[0.99] text-white py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Link Copiado com Sucesso!</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-4 h-4" />
                        <span>Copiar Meu Link de Indicação</span>
                      </>
                    )}
                  </button>

                  <div className="text-center">
                    <a
                      href="#indica-ganha"
                      onClick={(e) => { e.preventDefault(); alert("Abrindo painel completo de indicações..."); }}
                      className="text-xs font-medium text-slate-500 hover:text-[#0094eb] transition-colors inline-flex items-center gap-1"
                    >
                      Acessar painel de indicações <span>&rarr;</span>
                    </a>
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* Placeholders das demais abas */}
        {activeTab !== 'visao-geral' && (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
            <h3 className="text-base font-bold text-slate-700 capitalize">Módulo: {activeTab}</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Visualização e controles ativos da aba selecionada.
            </p>
          </div>
        )}

      </main>

      {/* Modal de Tutorial Vidlytics Academy */}
      {showVideoModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl overflow-hidden max-w-2xl w-full shadow-2xl border border-slate-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-800">Vidlytics Academy: Primeiros Passos</span>
              <button 
                onClick={() => setShowVideoModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-semibold px-2 py-1"
              >
                ✕ Fechar
              </button>
            </div>
            <div className="aspect-video bg-slate-900 flex items-center justify-center text-white">
              <div className="text-center p-6 space-y-3">
                <Play className="w-12 h-12 text-[#0094eb] mx-auto" />
                <p className="text-sm font-medium">Player de Vídeo do Tutorial</p>
                <p className="text-xs text-slate-400">Insira a URL do vídeo de demonstração quando estiver pronto.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. RODAPÉ ORIGINAL */}
      <footer className="bg-white border-t border-slate-200 px-6 py-4 mt-auto text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p>© 2026 Vidlytics Stories. Todos os direitos reservados.</p>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-500 text-[11px] uppercase tracking-wider">Desenvolvido por:</span>
          <img 
            src="/sll-logo.svg" 
            alt="Sistema Loja Lucrativa" 
            className="h-5 w-auto"
            onError={(e) => {
              const target = e.currentTarget;
              if (!target.src.endsWith('.png')) {
                target.src = '/sll-logo.png';
              }
            }}
          />
        </div>
      </footer>
    </div>
  );
}
