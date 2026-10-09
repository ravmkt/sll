import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, X, ArrowRight, Smartphone, Layers, LayoutGrid, PlayCircle, Sparkles } from 'lucide-react';

const CTA = '/auth?mode=signup&module=vidlytics';

type Cycle = 'mensal' | 'semestral' | 'anual';

const CYCLES: { id: Cycle; label: string; off?: string }[] = [
  { id: 'mensal', label: 'Mensal' },
  { id: 'semestral', label: 'Semestral', off: '17% OFF' },
  { id: 'anual', label: 'Anual', off: '33% OFF · 4 meses grátis' },
];

type PlanId = 'starter' | 'pro' | 'scale';
type Plan = {
  id: PlanId;
  name: string;
  tag: string;
  price: Record<Cycle, string>;
  billing: Record<Cycle, string>;
  features: string[];
  highlight?: boolean;
};

const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    tag: 'Para quem está começando',
    price: { mensal: '59,90', semestral: '49,90', anual: '39,90' },
    billing: {
      mensal: 'R$ 59,90 cobrado todo mês',
      semestral: 'R$ 299,40 a cada 6 meses',
      anual: 'R$ 478,80 por ano, em até 12x',
    },
    features: [
      'Até 5 vídeos ativos na loja',
      'Até 5.000 visualizações/mês',
      'Stories e Widget Flutuante',
      'Suporte padrão',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    tag: 'Operação ativa',
    highlight: true,
    price: { mensal: '97,00', semestral: '79,90', anual: '67,00' },
    billing: {
      mensal: 'R$ 97,00 cobrado todo mês',
      semestral: 'R$ 479,40 a cada 6 meses',
      anual: 'R$ 804,00 por ano, em até 12x',
    },
    features: [
      'Até 20 vídeos ativos na loja',
      'Até 25.000 visualizações/mês',
      'Stories, Widget e Carrossel na PDP',
      'Botão WhatsApp e Checkout direto',
      'Métricas completas',
    ],
  },
  {
    id: 'scale',
    name: 'Scale',
    tag: 'Grandes lojas e alto tráfego',
    price: { mensal: '197,00', semestral: '159,00', anual: '127,00' },
    billing: {
      mensal: 'R$ 197,00 cobrado todo mês',
      semestral: 'R$ 954,00 a cada 6 meses',
      anual: 'R$ 1.524,00 por ano, em até 12x',
    },
    features: [
      'Vídeos ilimitados',
      'Visualizações ilimitadas',
      'Todos os formatos liberados',
      'Carregamento em CDN dedicado',
      'Suporte prioritário via WhatsApp',
    ],
  },
];

const checkoutUrl = (plan: PlanId, cycle: Cycle) =>
  `${CTA}&plan=${plan}&cycle=${cycle}&checkout=1`;

const TRIAL_STEPS = [
  ['1', 'Cadastro em 30 segundos', 'Nome, e-mail e senha, ou direto com o Google. Sem cartão.'],
  ['2', 'Instale o script', 'Cole uma vez e veja o primeiro vídeo rodando na sua loja.'],
  ['3', 'Escolha o plano depois', 'Só quando o teste estiver perto de acabar, dentro do painel.'],
];

const FORMATS = [
  { icon: Smartphone, color: 'bg-indigo-100 text-indigo-600', t: 'Vídeo Flutuante', d: 'Um player estilo TikTok que acompanha o usuário pela tela, perfeito para retenção e avisos rápidos.' },
  { icon: Layers, color: 'bg-pink-100 text-pink-600', t: 'Carrossel Dinâmico', d: 'Exiba múltiplos vídeos em formato horizontal na sua home. Com autoplay inteligente para atrair cliques.' },
  { icon: LayoutGrid, color: 'bg-blue-100 text-blue-600', t: 'Grade de Vídeos', d: 'Ideal para galerias de produtos ou provas sociais (reviews de clientes) integrados diretamente na página.' },
  { icon: PlayCircle, color: 'bg-emerald-100 text-emerald-600', t: 'Player Tela Cheia', d: 'Ao clicar no widget, o vídeo expande com interações: Curtir, Comentar e botões de compra imediatos.' },
];

const DIFFS = [
  { c: 'bg-indigo-500/20 text-indigo-400', t: 'Insights de desempenho', d: 'O sistema analisa quais vídeos têm baixa retenção e sugere trocas estratégicas de conteúdo e posição dos widgets.' },
  { c: 'bg-pink-500/20 text-pink-400', t: 'Métricas de Receita Reais', d: 'Chega de métricas de vaidade. Veja exatamente o ROI e a "Receita Total Gerada por Vídeo" no seu dashboard.' },
  { c: 'bg-green-500/20 text-green-400', t: 'Conexão WhatsApp e "Ver Produto"', d: 'Botões interativos no player redirecionam seu cliente no momento de maior desejo da compra.' },
];

export default function VidlyticsLanding() {
  const [cycle, setCycle] = useState<Cycle>('anual');
  const [trialOpen, setTrialOpen] = useState(false);

  useEffect(() => {
    if (!trialOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setTrialOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [trialOpen]);
  useEffect(() => {
    document.title = 'Vidlytics by SLL Hub | Aumente suas Vendas com Vídeos';
    const prev = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => { document.documentElement.style.scrollBehavior = prev; };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 antialiased">
      {/* Navbar */}
      <nav className="fixed w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-20">
          <div className="flex items-center gap-2 font-bold">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 text-white flex items-center justify-center text-sm">SLL</span>
            Vidlytics
          </div>
          <div className="hidden md:flex space-x-8">
            <a href="#recursos" className="text-gray-600 hover:text-blue-600 transition font-medium">Recursos</a>
            <a href="#diferenciais" className="text-gray-600 hover:text-blue-600 transition font-medium">Diferenciais</a>
            <a href="#planos" className="text-gray-600 hover:text-blue-600 transition font-medium">Planos</a>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/auth" className="hidden sm:block text-sm text-gray-500 hover:text-gray-900">Entrar</Link>
            <Link to={CTA} className="bg-gray-900 hover:bg-blue-600 text-white px-6 py-2.5 rounded-full font-medium transition shadow-lg shadow-gray-900/20">
              Teste Grátis 7 Dias
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section
        className="pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden"
        style={{ backgroundImage: 'radial-gradient(circle at top right, rgba(37,99,235,0.1), transparent 40%), radial-gradient(circle at bottom left, rgba(249,115,22,0.1), transparent 40%)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-semibold mb-6">
              <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
              Sem cartão de crédito necessário
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8">
              Transforme visualizações em{' '}
              <span className="bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent">Vendas Reais</span>
            </h1>
            <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              Widgets de vídeo interativos para o seu e-commerce. Retenha a atenção do seu cliente, mostre o produto em ação e impulsione sua taxa de conversão em poucos cliques.
            </p>
            <Link to={CTA} className="inline-flex bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-full text-lg font-bold transition shadow-xl shadow-blue-600/30 items-center justify-center gap-2">
              Comece seu Teste Grátis de 7 Dias <ArrowRight className="w-5 h-5" />
            </Link>
            <p className="mt-4 text-sm text-gray-500">Instalação em 2 minutos. Sem fidelidade.</p>
          </div>

          {/* Mockup */}
          <div className="mt-20 relative mx-auto max-w-5xl">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-2xl p-2 overflow-hidden">
              <div className="bg-gray-100 rounded-xl h-[400px] md:h-[600px] w-full relative flex items-center justify-center overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-4 w-full px-12 opacity-80">
                  <div className="w-1/3 h-64 bg-gray-300 rounded-xl border-4 border-white shadow-lg" />
                  <div className="w-1/3 h-64 bg-gray-300 rounded-xl border-4 border-indigo-500 shadow-xl scale-105" />
                  <div className="w-1/3 h-64 bg-gray-300 rounded-xl border-4 border-white shadow-lg" />
                </div>
                <div className="absolute bottom-6 right-6 w-48 h-80 bg-black rounded-2xl shadow-2xl border-4 border-white overflow-hidden flex flex-col justify-end p-4 hover:scale-105 transition duration-300">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <div className="relative z-10">
                    <div className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded uppercase w-max mb-2">Ao vivo</div>
                    <h3 className="text-white font-bold text-sm leading-tight mb-2">Novo Tênis Esportivo Pro</h3>
                    <div className="w-full bg-white text-black font-bold py-2 rounded-lg text-xs text-center">Ver Produto</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Formatos */}
      <section id="recursos" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Widgets que se adaptam à sua loja</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">Vários formatos para exibir seus vídeos na vitrine, na página de produto ou no checkout.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {FORMATS.map(({ icon: Icon, color, t, d }) => (
              <div key={t} className="bg-gray-50 rounded-2xl p-8 border border-gray-100 hover:shadow-xl transition group">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition ${color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">{t}</h3>
                <p className="text-gray-600">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Diferenciais */}
      <section id="diferenciais" className="py-24 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Por que o Vidlytics supera a concorrência?</h2>
            <p className="text-xl text-gray-400 mb-8">Nós não apenas exibimos vídeos. Nós rastreamos até o último centavo que cada vídeo gera para o seu caixa.</p>
            <ul className="space-y-6">
              {DIFFS.map((x) => (
                <li key={x.t} className="flex gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${x.c}`}><Check className="w-5 h-5" /></div>
                  <div>
                    <h4 className="text-lg font-bold">{x.t}</h4>
                    <p className="text-gray-400">{x.d}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500 to-pink-500 rounded-2xl blur-lg opacity-30" />
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 relative">
              <div className="flex items-center justify-between mb-6 border-b border-gray-700 pb-4">
                <h3 className="font-bold">Dashboard de Performance</h3>
                <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded">Dados ilustrativos</span>
              </div>
              <div className="space-y-4">
                <div className="bg-gray-900 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-1">Receita Gerada por Vídeo</div>
                  <div className="text-2xl font-bold text-green-400">R$ 14.590,00 <span className="text-xs text-gray-500 font-normal">+12% vs mês ant.</span></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-900 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-1">Cliques no Produto</div>
                    <div className="text-xl font-bold">1.245</div>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-1">Redirecionamentos WPP</div>
                    <div className="text-xl font-bold text-indigo-400">389</div>
                  </div>
                </div>
                <div className="mt-6 p-4 bg-indigo-900/30 border border-indigo-500/30 rounded-lg flex gap-3">
                  <Sparkles className="w-4 h-4 text-indigo-400 mt-1 shrink-0" />
                  <div>
                    <div className="text-sm font-bold text-indigo-300">Insight de desempenho</div>
                    <div className="text-xs text-gray-400">O vídeo "Review Tênis Pro" apresenta queda de retenção aos 15s. Sugerimos ativar o botão "Comprar" aos 10s.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Escolha o plano ideal para sua loja</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Cadastre-se e ganhe 7 dias de Acesso Total (Plano Scale) para rodar na sua loja. Sem necessidade de cartão de crédito.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto mb-12">
            {TRIAL_STEPS.map(([n, t, d]) => (
              <div key={n} className="flex gap-4 bg-white border border-gray-200 rounded-2xl p-5">
                <span className="w-9 h-9 shrink-0 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center">{n}</span>
                <div>
                  <h3 className="font-bold">{t}</h3>
                  <p className="text-sm text-gray-600">{d}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center mb-14">
            <div role="tablist" className="inline-flex flex-wrap justify-center gap-1 p-1 rounded-full bg-white border border-gray-200 shadow-sm">
              {CYCLES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="tab"
                  aria-selected={cycle === c.id}
                  onClick={() => setCycle(c.id)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                    cycle === c.id ? 'bg-gray-900 text-white shadow' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {c.label}
                  {c.off && (
                    <span className={`ml-2 text-xs font-bold ${cycle === c.id ? 'text-orange-300' : 'text-green-600'}`}>{c.off}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-center">
            {PLANS.map((p) => (
              <div
                key={p.id}
                className={`rounded-2xl p-8 relative transition ${
                  p.highlight
                    ? 'bg-[#0f172a] text-white border border-blue-900 shadow-2xl md:-translate-y-4'
                    : 'bg-white border border-gray-200 shadow-sm hover:shadow-lg'
                }`}
              >
                {p.highlight && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-orange-500 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide whitespace-nowrap">
                    Mais Escolhido
                  </div>
                )}
                <h3 className={`text-2xl font-bold ${p.highlight ? 'text-blue-400' : ''}`}>{p.name}</h3>
                <p className={`text-sm mb-5 ${p.highlight ? 'text-gray-300' : 'text-gray-500'}`}>{p.tag}</p>
                <div>
                  <span className="text-sm font-semibold align-top">R$ </span>
                  <span className="text-5xl font-extrabold">{p.price[cycle]}</span>
                  <span className={p.highlight ? 'text-gray-400' : 'text-gray-500'}> /mês</span>
                </div>
                <p className={`text-sm font-semibold mt-2 mb-6 ${p.highlight ? 'text-gray-200' : 'text-gray-700'}`}>{p.billing[cycle]}</p>
                <ul className="space-y-3 mb-8 text-sm">
                  {p.features.map((txt) => (
                    <li key={txt} className="flex items-start gap-3">
                      <Check className={`w-5 h-5 shrink-0 ${p.highlight ? 'text-blue-400' : 'text-indigo-600'}`} />
                      {txt}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => setTrialOpen(true)}
                  className={`block w-full py-3 px-4 text-center font-bold rounded-xl transition ${
                    p.highlight ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                  }`}
                >
                  Testar 7 Dias Grátis
                </button>
                <p className={`text-xs text-center mt-3 ${p.highlight ? 'text-gray-400' : 'text-gray-500'}`}>
                  Já quer assinar?{' '}
                  <Link to={checkoutUrl(p.id, cycle)} className={`font-semibold underline ${p.highlight ? 'text-orange-300' : 'text-[#0094eb]'}`}>
                    Contratar agora
                  </Link>
                </p>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-gray-500 mt-10 max-w-2xl mx-auto">
            Depois do teste, pagamento por cartão de crédito ou Pix. A renovação é automática e você cancela quando quiser, direto no painel.
          </p>
        </div>

        {trialOpen && (
          <div
            className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4"
            onClick={() => setTrialOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Teste grátis por 7 dias"
          >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                aria-label="Fechar"
                onClick={() => setTrialOpen(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
              <span className="inline-block px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-bold mb-4">7 dias de Acesso Total · Plano Scale</span>
              <h3 className="text-2xl font-bold mb-2">Crie sua conta grátis</h3>
              <p className="text-sm text-gray-600 mb-5">
                Leva menos de 1 minuto. Você usa tudo do plano Scale por 7 dias para rodar na sua loja, sem cartão de crédito.
              </p>
              <ul className="space-y-2 text-sm mb-6">
                {['Vídeos e visualizações ilimitados', 'Todos os formatos liberados', 'Escolha o plano só no fim do teste'].map((x) => (
                  <li key={x} className="flex items-start gap-2"><Check className="w-4 h-4 mt-0.5 text-indigo-600 shrink-0" />{x}</li>
                ))}
              </ul>
              <Link to={`${CTA}&trial=1`} className="block w-full bg-orange-500 hover:bg-orange-600 text-white text-center font-bold py-4 rounded-xl transition shadow-lg">
                Criar minha conta grátis
              </Link>
              <p className="text-xs text-gray-500 text-center mt-3">Sem cartão de crédito. Cancele quando quiser.</p>
            </div>
          </div>
        )}
      </section>

      {/* CTA final */}
      <section className="py-20 bg-blue-700">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Pronto para aumentar suas conversões?</h2>
          <p className="text-xl text-indigo-100 mb-10">Crie sua conta em segundos. Não pedimos cartão de crédito. Risco zero para você testar na sua loja real.</p>
          <div className="max-w-md mx-auto bg-white p-6 rounded-2xl shadow-2xl text-left">
            <h3 className="font-bold text-gray-900 text-xl mb-2">Crie sua conta</h3>
            <p className="text-sm text-gray-600 mb-4">Leva menos de 1 minuto. Seu teste de 7 dias começa na hora, sem cartão.</p>
            <Link to={CTA} className="block w-full bg-orange-500 hover:bg-orange-600 text-white text-center font-bold py-4 rounded-xl transition shadow-lg">
              Iniciar Trial de 7 Dias
            </Link>
            <p className="text-xs text-gray-500 mt-3">
              Ao se cadastrar, você concorda com os <Link to="/termos" className="underline">Termos de Uso</Link> e a{' '}
              <Link to="/privacidade" className="underline">Política de Privacidade</Link>.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 font-bold text-white">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-400 text-white flex items-center justify-center text-xs">SLL</span>
              Vidlytics
            </div>
            <p className="text-sm mt-4">A plataforma definitiva de vídeos interativos para e-commerce. Aumente seu faturamento retendo a atenção do seu cliente.</p>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4">Plataforma</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#recursos" className="hover:text-white transition">Recursos</a></li>
              <li><a href="#planos" className="hover:text-white transition">Preços</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4">Suporte</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/termos" className="hover:text-white transition">Termos de Uso</Link></li>
              <li><Link to="/privacidade" className="hover:text-white transition">Política de Privacidade</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-8 border-t border-gray-800 text-xs text-center">
          SLL Hub · RAV Marketing e Treinamento LTDA · CNPJ 62.894.336/0001-00
        </div>
      </footer>
    </div>
  );
}