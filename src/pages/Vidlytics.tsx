import React, { useState } from "react";
import { 
  Play, 
  ExternalLink, 
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
  Headphones
} from "lucide-react";

export default function Vidlytics() {
  const [activeTab, setActiveTab] = useState("overview");
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText("https://vidlytics.com.br/indique/useanny");
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

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
    { title: "Configurações da loja", desc: "Preencha os dados cadastrais, e-mail e integre seu canal de WhatsApp." },
    { title: "Instalação do script", desc: "Copie e instale o script de embed nas plataformas ou via GTM." },
    { title: "Vincular os produtos", desc: "Vincule produtos com preço para permitir compra direta através dos vídeos." },
    { title: "Subir vídeos", desc: "Suba seus vídeos verticais ou importe do Instagram/TikTok." },
    { title: "Criar coleção de Stories", desc: "Agrupe seus vídeos em coleções interativas." },
    { title: "Configurar a aparência", desc: "Personalize cores, fontes, bordas e botões do player de stories." },
  ];

  const activities = [
    { title: "Coleção de stories atualizada: TESTE", date: "16 de set. às 16:29" },
    { title: "Configurações da loja salvas: Use Anny Moda Feminina", date: "15 de set. às 13:57" },
    { title: "Configurações da loja salvas: Use Anny Moda Feminina", date: "15 de set. às 10:52" },
    { title: "Configurações da loja salvas: Use Anny Moda Feminina", date: "10 de set. às 08:30" },
    { title: "Coleção de stories atualizada: TESTE", date: "09 de set. às 16:50" },
    { title: "Aparência do player atualizada: USEANNY", date: "09 de set. às 16:23" },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 pb-12 relative">
      {/* Top Header do Módulo com Logo Vidlytics e Abas */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-6 py-3 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img 
              src="/assets/vidlytics-logo-wide.png" 
              alt="Vidlytics" 
              className="h-8 md:h-9 object-contain"
              onError={(e) => {
                // Fallback caso a imagem demore para carregar
                (e.target as HTMLElement).style.display = "none";
              }}
            />
            <span className="sr-only">Vidlytics</span>
          </div>

          {/* Navegação por Abas */}
          <nav className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
                    isActive
                      ? "bg-[#0094eb] text-white shadow-sm shadow-[#0094eb]/20"
                      : "bg-[#f1f5f9] text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        
        {/* Barra de Status Compacta e Fina */}
        <section className="bg-white rounded-xl px-5 py-2.5 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-extrabold text-slate-800 text-sm">Olá, Loja</span>
            <span className="h-3 w-px bg-slate-200" />
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-blue-50 text-[#0094eb] border border-blue-100">
              Plano Scale
            </span>
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-purple-50 text-purple-600 border border-purple-100">
              Acesso Vitalício
            </span>
          </div>

          <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50/80 border border-emerald-200/60 px-3 py-1 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
            <span className="font-bold text-[11px] uppercase tracking-wide">Aplicativo Ativado:</span>
            <span className="text-[11px] text-emerald-600 hidden md:inline">Seus vídeos estão online no seu e-commerce</span>
          </div>
        </section>

        {/* Promo Hero Banner */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#0f172a] text-white p-6 sm:p-8 shadow-md">
          <div className="relative z-10 max-w-2xl space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase bg-[#fd8539] text-white tracking-wide shadow-sm">
              ✨ Turbine seu E-commerce
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight">
              Transforme visitantes em clientes com Vídeos Curtos e Stories
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
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

        {/* Seção 1: Resultados de Vendas */}
        <div>
          <h2 className="text-xs font-bold tracking-wider uppercase text-slate-500 mb-3">
            Resultados de Vendas Vindas dos Vídeos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
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

            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
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

            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
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

        {/* Seção 2: Consumo do Plano */}
        <div>
          <h2 className="text-xs font-bold tracking-wider uppercase text-slate-500 mb-3">
            Consumo do Plano
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-3">
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
                  <div className="bg-[#0094eb] h-1.5 rounded-full" style={{ width: "1%" }} />
                </div>
              </div>
              <div className="text-[11px] text-slate-400 flex justify-between">
                <span>Quota do mês</span>
                <span>0%</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-3">
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
                  <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: "2%" }} />
                </div>
              </div>
              <div className="text-[11px] text-slate-400 flex justify-between">
                <span>Vídeos na nuvem</span>
                <span>0%</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-slate-500">Páginas com Vídeos</span>
                <FileText className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-slate-900">1</span>
                  <span className="text-xs text-slate-400">de 9999 ativas</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                  <div className="bg-[#fd8539] h-1.5 rounded-full" style={{ width: "5%" }} />
                </div>
              </div>
              <div className="text-[11px] text-slate-400 flex justify-between">
                <span>Locais de exibição</span>
                <span>0%</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-slate-500">Ciclo da Conta</span>
                <Calendar className="w-4 h-4 text-indigo-500" />
              </div>
              <div>
                <div className="text-[11px] uppercase font-bold text-slate-400">Status</div>
                <div className="text-xl font-black text-slate-900">Vitalício</div>
              </div>
              <div className="text-[11px] text-slate-400 flex justify-between">
                <span>Renovação:</span>
                <span>— (sem vencimento)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Seção 3: Checklist e Atividade Recente */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Checklist */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Checklist da Ativação da Loja</h3>
                <p className="text-xs text-slate-400">Conclua os passos para publicar seus stories.</p>
              </div>
              <span className="px-2.5 py-1 text-xs font-black rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                100%
              </span>
            </div>

            <div className="space-y-3 pt-2">
              {checklistItems.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/70 border border-slate-100">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white flex-shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-slate-800">{item.title}</h4>
                    <p className="text-[11px] text-slate-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Atividade Recente */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4 flex flex-col">
            <div>
              <h3 className="text-base font-bold text-slate-900">Atividade Recente (Log do Painel)</h3>
              <p className="text-xs text-slate-400">Histórico em tempo real de alterações e atividades do usuário.</p>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[380px] space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-200">
              {activities.map((act, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/70 border border-slate-100">
                  <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 flex-shrink-0">
                    <Clock className="w-4 h-4 text-purple-500" />
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

        {/* Seção 4: Banner Academy & Indique e Ganhe */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Vidlytics Academy */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center gap-5">
            <div className="relative w-full sm:w-44 h-28 rounded-xl overflow-hidden bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center flex-shrink-0 group cursor-pointer shadow-inner">
              <div className="w-10 h-10 rounded-full bg-white/90 text-[#0094eb] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Play className="w-5 h-5 fill-current ml-0.5" />
              </div>
            </div>
            <div className="space-y-2 text-center sm:text-left">
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

          {/* Indique e Ganhe */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-4">
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

        {/* Rodapé Institucional com sll-logotipo.png */}
        <footer className="pt-8 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© 2026 Vidlytics Stories. Todos os direitos reservados.</p>
          <div className="flex items-center gap-2.5">
            <span className="text-[11px] uppercase tracking-wider font-semibold">DESENVOLVIDO POR:</span>
            <img 
              src="/assets/sll-logotipo.png" 
              alt="Sistema Loja Lucrativa" 
              className="h-6 object-contain"
              onError={(e) => {
                // Fallback de texto se a imagem não for encontrada
                const target = e.target as HTMLElement;
                target.style.display = "none";
              }} 
            />
          </div>
        </footer>

      </main>

      {/* Ícone de Suporte Flutuante no Canto Inferior Direito */}
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
