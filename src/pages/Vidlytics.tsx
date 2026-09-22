import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Play, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  Eye, 
  HardDrive, 
  FileText, 
  Calendar, 
  Share2, 
  Copy, 
  Check, 
  ShoppingBag, 
  MessageSquare, 
  Palette, 
  BarChart2, 
  FolderOpen, 
  Headphones, 
  ChevronDown, 
  Layers, 
  ArrowLeft,
  TrendingUp,
  MousePointerClick,
  Filter,
  ArrowUpRight,
  Sparkles
} from "lucide-react";

export default function Vidlytics() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("results");
  const [copiedLink, setCopiedLink] = useState(false);
  const [moduleMenuOpen, setModuleMenuOpen] = useState(false);
  const [periodFilter, setPeriodFilter] = useState("30d");

  const handleCopyLink = () => {
    navigator.clipboard.writeText("https://vidlytics.com.br/indique/useanny");
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const modules = [
    { name: "Vidlytics Stories", path: "/vidlytics", current: true },
    { name: "Live Commerce", path: "/live-commerce", current: false },
    { name: "Checkout Transparente", path: "/checkout", current: false },
    { name: "Consultor IA", path: "/consultor-ia", current: false },
    { name: "Prova Social", path: "/prova-social", current: false },
  ];

  const tabs = [
    { id: "overview", label: "Visão Geral", icon: BarChart2 },
    { id: "results", label: "Resultados", icon: DollarSign },
    { id: "stories", label: "Stories", icon: Play },
    { id: "library", label: "Biblioteca", icon: FolderOpen },
    { id: "products", label: "Produtos", icon: ShoppingBag },
    { id: "comments", label: "Comentários", icon: MessageSquare },
    { id: "appearance", label: "Aparência", icon: Palette },
  ];

  const checklistItems = [
    { title: "Configurações da loja", desc: "Preencha os dados cadastrais, e-mail e canais de contato." },
    { title: "Instalação do script", desc: "Copie o código e insira no seu e-commerce via GTM ou Head." },
    { title: "Vincular produtos", desc: "Vincule produtos à sua loja para conversão direta nos vídeos." },
    { title: "Subir vídeos", desc: "Adicione vídeos verticais ou importe por redes sociais." },
    { title: "Criar coleção", desc: "Agrupe seus vídeos em coleções interativas." },
    { title: "Aparência", desc: "Personalize cores, bordas e botões do player." },
  ];

  const activities = [
    { title: "Coleção de stories atualizada: TESTE", date: "16 de set. às 16:29" },
    { title: "Configurações da loja salvas: Use Anny", date: "15 de set. às 13:57" },
    { title: "Configurações da loja salvas: Use Anny", date: "15 de set. às 10:52" },
    { title: "Configurações da loja salvas: Use Anny", date: "10 de set. às 08:30" },
  ];

  // Mock de dados para a aba Resultados
  const topVideos = [
    {
      id: 1,
      title: "Vestido Midi Floral Primavera",
      thumbnail: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=150&q=80",
      views: "1.420",
      clicks: 342,
      orders: 28,
      revenue: "R$ 5.572,00",
      conversion: "8.18%"
    },
    {
      id: 2,
      title: "Conjunto Alfaiataria Elegance",
      thumbnail: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=150&q=80",
      views: "980",
      clicks: 210,
      orders: 19,
      revenue: "R$ 4.313,00",
      conversion: "9.04%"
    },
    {
      id: 3,
      title: "Bolsa Couro Legítimo Nude",
      thumbnail: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=150&q=80",
      views: "810",
      clicks: 145,
      orders: 12,
      revenue: "R$ 2.628,00",
      conversion: "8.27%"
    },
    {
      id: 4,
      title: "Blazer Casual Terracota",
      thumbnail: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
      views: "640",
      clicks: 98,
      orders: 7,
      revenue: "R$ 1.673,00",
      conversion: "7.14%"
    }
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 pb-12 relative flex flex-col justify-between">
      <div>
        {/* 1. BARRA GLOBAL SLL HUB */}
        <header className="bg-white border-b border-slate-200/90 sticky top-0 z-40 shadow-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between">
            <button 
              onClick={() => navigate("/")}
              className="flex items-center gap-2.5 group text-slate-600 hover:text-slate-900 transition-colors"
              title="Voltar ao Hub Central do SLL"
            >
              <img 
                src="/assets/sll-logotipo-ico.png" 
                alt="SLL" 
                className="h-8 w-8 object-contain transition-transform group-hover:scale-105"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <ArrowLeft className="w-3.5 h-3.5 text-slate-400 group-hover:-translate-x-0.5 transition-transform" />
                <span>Voltar ao Hub Central</span>
              </div>
            </button>

            <div className="relative">
              <button
                onClick={() => setModuleMenuOpen(!moduleMenuOpen)}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors shadow-xs"
              >
                <Layers className="w-3.5 h-3.5 text-[#0094eb]" />
                <span>Módulo: <strong>Vidlytics Stories</strong></span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
              </button>

              {moduleMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-1">
                  <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-400">Alternar Módulo SLL</div>
                  {modules.map((m, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setModuleMenuOpen(false);
                        if (!m.current) navigate(m.path);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                        m.current 
                          ? "bg-blue-50 text-[#0094eb] font-bold" 
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span>{m.name}</span>
                      {m.current && <span className="w-1.5 h-1.5 rounded-full bg-[#0094eb]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* CONTAINER PRINCIPAL */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-5">
          
          {/* 2. PROMO BANNER */}
          <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#0f172a] text-white p-6 sm:p-7 shadow-sm">
            <div className="relative z-10 max-w-2xl space-y-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold uppercase bg-[#fd8539] text-white tracking-wide shadow-sm">
                ✨ Turbine seu E-commerce
              </span>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold leading-tight">
                Transforme visitantes em clientes com Vídeos Curtos e Stories
              </h2>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                Seus produtos integrados diretamente nos vídeos interativos com conversão em tempo real.
              </p>
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-25 md:opacity-40 pointer-events-none hidden sm:block">
              <img 
                src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80" 
                alt="Dashboard Analytics" 
                className="h-full w-full object-cover object-left"
              />
            </div>
          </section>

          {/* 3. BARRA DO MÓDULO VIDLYTICS (Logo + Abas) */}
          <section className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-xs">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 pl-2">
                <img 
                  src="/assets/vidlytics-logo-wide.png" 
                  alt="Vidlytics" 
                  className="h-7 sm:h-8 object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              </div>

              {/* Abas */}
              <nav className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                        isActive
                          ? "bg-[#0094eb] text-white shadow-sm shadow-[#0094eb]/20"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>
          </section>

          {/* RENDERIZAÇÃO CONDICIONAL DAS ABAS */}
          {activeTab === "overview" && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Barra de Status Compacta */}
              <section className="bg-white rounded-xl px-4 py-2 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-bold text-slate-800 text-xs sm:text-sm">Olá, <strong>Use Anny</strong></span>
                  <span className="h-3 w-px bg-slate-200" />
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-blue-50 text-[#0094eb] border border-blue-100">
                    Plano Scale
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-purple-50 text-purple-600 border border-purple-100">
                    Acesso Vitalício
                  </span>
                </div>

                <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50/70 border border-emerald-200/60 px-2.5 py-0.5 rounded-md text-[11px]">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                  <span className="font-bold uppercase tracking-wider">Aplicativo Ativado:</span>
                  <span className="text-emerald-600 hidden md:inline">Seus vídeos estão online no seu e-commerce</span>
                </div>
              </section>

              {/* Seção Resultados de Vendas */}
              <div>
                <h2 className="text-[11px] font-bold tracking-wider uppercase text-slate-400 mb-2.5">
                  Resultados de Vendas Vindas dos Vídeos
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase text-slate-500">Vendas Pagas</span>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                          0 Pedidos
                        </span>
                      </div>
                      <div className="text-2xl font-black text-slate-900">R$ 0,00</div>
                      <div className="text-[11px] text-slate-400">Faturamento confirmado via vídeos</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase text-slate-500">Aguardando Pagamento</span>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-50 text-amber-600 border border-amber-100">
                          3 Pedidos
                        </span>
                      </div>
                      <div className="text-2xl font-black text-slate-900">R$ 378,39</div>
                      <div className="text-[11px] text-slate-400">Pix / Boleto pendente</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                      <Clock className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase text-slate-500">Faturamento Indicações</span>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-50 text-[#0094eb] border border-blue-100">
                          Comissões
                        </span>
                      </div>
                      <div className="text-2xl font-black text-slate-900">R$ 0,00</div>
                      <div className="text-[11px] text-slate-400">Ver detalhes no Indica & Ganha →</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-[#0094eb]">
                      <DollarSign className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Consumo do Plano */}
              <div>
                <h2 className="text-[11px] font-bold tracking-wider uppercase text-slate-400 mb-2.5">
                  Consumo do Plano
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-slate-500">Visualizações</span>
                      <Eye className="w-4 h-4 text-blue-500" />
                    </div>
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-slate-900">57</span>
                        <span className="text-xs text-slate-400">de 60.000</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                        <div className="bg-[#0094eb] h-1.5 rounded-full w-[1%]" />
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-400 flex justify-between">
                      <span>Quota do mês</span>
                      <span>1%</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-slate-500">Armazenamento</span>
                      <HardDrive className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-slate-900">10.3 MB</span>
                        <span className="text-xs text-slate-400">de 50 GB</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                        <div className="bg-emerald-500 h-1.5 rounded-full w-[2%]" />
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-400 flex justify-between">
                      <span>Vídeos na nuvem</span>
                      <span>2%</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-slate-500">Páginas com Vídeos</span>
                      <FileText className="w-4 h-4 text-amber-500" />
                    </div>
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-slate-900">1</span>
                        <span className="text-xs text-slate-400">de ilimitadas</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                        <div className="bg-[#fd8539] h-1.5 rounded-full w-[5%]" />
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-400 flex justify-between">
                      <span>Locais de exibição</span>
                      <span>Ativo</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-slate-500">Ciclo da Conta</span>
                      <Calendar className="w-4 h-4 text-indigo-500" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Status</div>
                      <div className="text-xl font-black text-slate-900">Vitalício</div>
                    </div>
                    <div className="text-[11px] text-slate-400 flex justify-between">
                      <span>Renovação:</span>
                      <span>— (sem vencimento)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Checklist e Atividade Recente */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900">Checklist da Ativação da Loja</h3>
                      <p className="text-xs text-slate-400">Conclua os passos para publicar seus stories.</p>
                    </div>
                    <span className="px-2.5 py-1 text-xs font-black rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                      100%
                    </span>
                  </div>

                  <div className="space-y-3 pt-1">
                    {checklistItems.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/70 border border-slate-100">
                        <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white flex-shrink-0 mt-0.5">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-bold text-slate-800">{item.title}</h4>
                          <p className="text-[11px] text-slate-500 leading-tight">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4 flex flex-col">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">Atividade Recente (Log do Painel)</h3>
                    <p className="text-xs text-slate-400">Histórico em tempo real de alterações e atividades do usuário.</p>
                  </div>

                  <div className="flex-1 overflow-y-auto max-h-[390px] space-y-2.5 pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                    {activities.map((act, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/70 border border-slate-100">
                        <div className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center text-purple-600 flex-shrink-0">
                          <Clock className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{act.title}</p>
                          <p className="text-[10px] text-slate-400">{act.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Academy e Indique e Ganhe */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center gap-5">
                  <div className="relative w-full sm:w-44 h-28 rounded-xl overflow-hidden bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center flex-shrink-0 group cursor-pointer shadow-inner">
                    <div className="w-10 h-10 rounded-full bg-white/90 text-[#0094eb] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </div>
                  </div>
                  <div className="space-y-1.5 text-center sm:text-left">
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                      💎 Vidlytics Academy
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">
                      Como dobrar suas conversões com vídeos em 3 passos
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Aprenda as melhores práticas de posicionamento e gatilhos de CTA para aumentar as vendas da sua loja.
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-blue-50 text-[#0094eb] flex items-center justify-center">
                          <DollarSign className="w-4 h-4" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900">Indique e Ganhe</h3>
                      </div>
                      <Share2 className="w-4 h-4 text-slate-400" />
                    </div>
                    <p className="text-xs text-slate-500">
                      Receba comissões e desbloqueie meses gratuitos ao indicar o Vidlytics para outros lojistas.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <button 
                      onClick={handleCopyLink}
                      className="w-full py-2.5 px-4 bg-[#0094eb] hover:bg-[#0082cf] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors shadow-sm shadow-[#0094eb]/20"
                    >
                      {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copiedLink ? "LINK COPIADO!" : "COPIAR MEU LINK DE INDICAÇÃO"}
                    </button>
                    <div className="text-center">
                      <button className="text-[11px] font-semibold text-slate-500 hover:text-[#0094eb] transition-colors">
                        Acessar painel de indicações →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* ABA 2: RESULTADOS (DETALHADO E ANALÍTICO) */}
          {/* ======================================================== */}
          {activeTab === "results" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Filtro de Período e Resumo Rápido */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-[#0094eb]" />
                    Desempenho de Vendas e Conversão
                  </h3>
                  <p className="text-xs text-slate-500">
                    Acompanhe o retorno sobre o investimento gerado diretamente pelos stories na sua loja.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                    <button 
                      onClick={() => setPeriodFilter("7d")}
                      className={`px-3 py-1 rounded-lg transition-all ${periodFilter === "7d" ? "bg-white text-slate-800 shadow-xs font-bold" : "text-slate-500 hover:text-slate-800"}`}
                    >
                      7 Dias
                    </button>
                    <button 
                      onClick={() => setPeriodFilter("30d")}
                      className={`px-3 py-1 rounded-lg transition-all ${periodFilter === "30d" ? "bg-white text-slate-800 shadow-xs font-bold" : "text-slate-500 hover:text-slate-800"}`}
                    >
                      30 Dias
                    </button>
                    <button 
                      onClick={() => setPeriodFilter("all")}
                      className={`px-3 py-1 rounded-lg transition-all ${periodFilter === "all" ? "bg-white text-slate-800 shadow-xs font-bold" : "text-slate-500 hover:text-slate-800"}`}
                    >
                      Total
                    </button>
                  </div>
                  <button className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600">
                    <Filter className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 1. KPIs DE CONVERSÃO & FATURAMENTO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Total Vendas Pagas */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-2">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-bold uppercase tracking-wider">Faturamento Gerado</span>
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <DollarSign className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-slate-900">R$ 14.186,00</div>
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>+18.4%</span>
                    <span className="text-slate-400 font-normal">vs. período anterior</span>
                  </div>
                </div>

                {/* Taxa de Conversão */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-2">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-bold uppercase tracking-wider">Taxa de Conversão</span>
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0094eb] flex items-center justify-center">
                      <Sparkles className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-[#0094eb]">8.42%</div>
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <span>Média geral do e-commerce: 1.8%</span>
                  </div>
                </div>

                {/* Cliques em Produtos (CTA) */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-2">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-bold uppercase tracking-wider">Cliques nos Produtos</span>
                    <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                      <MousePointerClick className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-slate-900">795</div>
                  <div className="flex items-center gap-1 text-xs text-purple-600 font-bold">
                    <span>20.6% de engajamento</span>
                  </div>
                </div>

                {/* Pedidos Confirmados */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-2">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-bold uppercase tracking-wider">Pedidos Concluídos</span>
                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-slate-900">66</div>
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <span>Ticket Médio: <strong className="text-slate-700">R$ 214,93</strong></span>
                  </div>
                </div>

              </div>

              {/* 2. GRÁFICOS VISUAIS: FATURAMENTO E FUNIL DE CONVERSÃO */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Gráfico Simulado de Vendas Semanais */}
                <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Faturamento Diário dos Vídeos</h4>
                      <p className="text-xs text-slate-400">Evolução de pedidos nos últimos dias</p>
                    </div>
                    <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                      Mês Corrente
                    </span>
                  </div>

                  {/* Barras do Gráfico */}
                  <div className="h-48 flex items-end gap-3 sm:gap-6 pt-6 px-2 justify-between border-b border-slate-100">
                    {[
                      { day: "Seg", val: "R$ 1.820", height: "45%" },
                      { day: "Ter", val: "R$ 2.450", height: "65%" },
                      { day: "Qua", val: "R$ 1.300", height: "35%" },
                      { day: "Qui", val: "R$ 3.890", height: "85%" },
                      { day: "Sex", val: "R$ 4.200", height: "95%" },
                      { day: "Sáb", val: "R$ 2.900", height: "70%" },
                      { day: "Dom", val: "R$ 1.626", height: "40%" },
                    ].map((bar, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer h-full justify-end">
                        <div className="opacity-0 group-hover:opacity-100 text-[10px] font-bold text-white bg-slate-800 px-2 py-0.5 rounded shadow-sm transition-opacity pointer-events-none whitespace-nowrap">
                          {bar.val}
                        </div>
                        <div 
                          className="w-full bg-blue-100 group-hover:bg-[#0094eb] rounded-t-lg transition-all duration-300 relative overflow-hidden" 
                          style={{ height: bar.height }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent" />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400 group-hover:text-slate-700">
                          {bar.day}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                    <span>* Conversões rastreadas através do parâmetro vidlytics_ref e checkout integrado.</span>
                    <span className="text-[#0094eb] font-bold flex items-center gap-1 cursor-pointer hover:underline">
                      Exportar Relatório <ArrowUpRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>

                {/* Funil Visual de Conversão */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-5 flex flex-col justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Funil de Conversão</h4>
                    <p className="text-xs text-slate-400">Jornada do espectador até a compra</p>
                  </div>

                  <div className="space-y-3.5">
                    {/* Passo 1 */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-600">1. Visualizações</span>
                        <span className="text-slate-900 font-bold">3.850</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div className="bg-slate-400 h-2 rounded-full w-full" />
                      </div>
                    </div>

                    {/* Passo 2 */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-600">2. Cliques no Produto</span>
                        <span className="text-slate-900 font-bold">795 (20.6%)</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div className="bg-[#0094eb] h-2 rounded-full w-[20.6%]" />
                      </div>
                    </div>

                    {/* Passo 3 */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-600">3. Vendas Realizadas</span>
                        <span className="text-emerald-600 font-bold">66 (8.42%)</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div className="bg-emerald-500 h-2 rounded-full w-[8.42%]" />
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl">
                    <p className="text-[11px] text-blue-900 leading-snug">
                      💡 <strong>Dica do Consultor:</strong> Seus stories com botão de CTA direto nos primeiros 5 segundos converteram <strong>42% a mais</strong>.
                    </p>
                  </div>
                </div>

              </div>

              {/* 3. RANKING DE VÍDEOS QUE MAIS VENDERAM */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Ranking: Stories Campeões de Venda</h3>
                    <p className="text-xs text-slate-400">Vídeos com maior receita e eficiência de conversão gerada.</p>
                  </div>
                  <span className="text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200/70 px-3 py-1 rounded-lg">
                    Ordenado por Faturamento
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/80 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-100">
                      <tr>
                        <th className="px-5 py-3.5">Posição & Vídeo</th>
                        <th className="px-4 py-3.5 text-center">Visualizações</th>
                        <th className="px-4 py-3.5 text-center">Cliques CTA</th>
                        <th className="px-4 py-3.5 text-center">Pedidos</th>
                        <th className="px-4 py-3.5 text-center">Conversão</th>
                        <th className="px-5 py-3.5 text-right">Faturamento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {topVideos.map((item, index) => (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-5 py-3 flex items-center gap-3">
                            <span className="w-5 text-center font-bold text-slate-400 text-xs">
                              #{index + 1}
                            </span>
                            <div className="relative w-10 h-14 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0 shadow-xs group cursor-pointer">
                              <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Play className="w-3.5 h-3.5 text-white fill-current" />
                              </div>
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-800 truncate text-xs">{item.title}</p>
                              <span className="text-[10px] text-slate-400">ID: VID-00{item.id}</span>
                            </div>
                          </td>

                          <td className="px-4 py-3 text-center text-slate-600 font-semibold">{item.views}</td>
                          <td className="px-4 py-3 text-center text-slate-600 font-semibold">{item.clicks}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-bold text-[11px] border border-emerald-100">
                              {item.orders} vendas
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-[#0094eb]">{item.conversion}</td>
                          <td className="px-5 py-3 text-right font-black text-slate-900 text-sm">{item.revenue}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* Placeholders limpos para as próximas abas */}
          {["stories", "library", "products", "comments", "appearance"].includes(activeTab) && (
            <div className="bg-white rounded-2xl p-12 border border-slate-200/80 shadow-xs text-center space-y-3 animate-in fade-in">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0094eb] mx-auto flex items-center justify-center">
                <FolderOpen className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                Aba "{tabs.find(t => t.id === activeTab)?.label}"
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Pronta para receber a interface visual nas próximas etapas.
              </p>
            </div>
          )}

        </main>
      </div>

      {/* 9. RODAPÉ INSTITUCIONAL */}
      <footer className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-10 mt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
        <p>© 2026 Vidlytics Stories. Todos os direitos reservados.</p>
        <div className="flex items-center gap-3">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">DESENVOLVIDO POR:</span>
          <img 
            src="/assets/sll-logotipo.png" 
            alt="Sistema Loja Lucrativa" 
            className="h-9 sm:h-10 object-contain hover:opacity-90 transition-opacity"
            onError={(e) => {
              const target = e.target as HTMLElement;
              target.style.display = "none";
            }} 
          />
        </div>
      </footer>

      {/* 10. SUPORTE FLUTUANTE */}
      <aside aria-label="Suporte" className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => alert("Canal de Suporte SLL")}
          className="w-12 h-12 rounded-full bg-[#0094eb] hover:bg-[#0082cf] text-white flex items-center justify-center shadow-lg shadow-[#0094eb]/30 transition-transform hover:scale-105 active:scale-95"
          title="Falar com o Suporte"
        >
          <Headphones className="w-6 h-6" />
        </button>
      </aside>
    </div>
  );
}
