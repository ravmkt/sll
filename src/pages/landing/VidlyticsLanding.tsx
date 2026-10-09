import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Check, ArrowRight, Smartphone, Layers, LayoutGrid, PlayCircle, Sparkles } from 'lucide-react';

const CTA = '/auth?mode=signup&module=vidlytics';

type Plan = {
  name: string;
  price: string;
  billing: string;
  note: string;
  off?: string;
  badge?: string;
  highlight?: boolean;
};

// Tabela oficial: Mensal R$ 59,90 | Semestral R$ 299,40 (49,90/mes) | Anual R$ 478,80 (39,90/mes)
const PLANS: Plan[] = [
  {
    name: 'Mensal',
    price: '59,90',
    billing: 'Cobrado R$ 59,90 todo mês',
    note: 'Flexibilidade total, sem desconto.',
  },
  {
    name: 'Semestral',
    price: '49,90',
    billing: 'R$ 299,40 a cada 6 meses',
    note: 'Pague 5, leve 6.',
    off: '17% OFF',
  },
  {
    name: 'Anual',
    price: '39,90',
    billing: 'R$ 478,80 por ano, em até 12x',
    note: '4 meses grátis.',
    off: 'Economize 33%',
    badge: 'Mais Popular',
    highlight: true,
  },
];

const INCLUDED = [
  'Vídeo Flutuante, Carrossel, Grade e Player Tela Cheia',
  'Botões "Ver Produto" e WhatsApp direto',
  'Métricas de visualização, cliques e vendas por vídeo',
  'Insights de desempenho dos seus vídeos',
  'Suporte humano e instalação simplificada',
];

const TRIAL_STEPS = [
  ['1', 'Cadastro em 30 segundos', 'Nome, e-mail, WhatsApp e nome da loja. Sem cartão.'],
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
  { c: 'bg-indigo-500/20 text-indigo-400', t: 'Motor de Insights de IA', d: 'O sistema analisa quais vídeos têm baixa retenção e sugere trocas estratégicas de conteúdo e posição dos widgets.' },
  { c: 'bg-pink-500/20 text-pink-400', t: 'Métricas de Receita Reais', d: 'Chega de métricas de vaidade. Veja exatamente o ROI e a "Receita Total Gerada por Vídeo" no seu dashboard.' },
  { c: 'bg-green-500/20 text-green-400', t: 'Conexão WhatsApp e "Ver Produto"', d: 'Botões interativos no player redirecionam seu cliente no momento de maior desejo da compra.' },
];

export default function VidlyticsLanding() {
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
                    <div className="text-sm font-bold text-indigo-300">Insight de IA</div>
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
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Teste grátis por 7 dias. Escolha o plano depois.</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Acesso completo a todas as funcionalidades, sem cartão de crédito. Todos os ciclos incluem os mesmos recursos: muda só o quanto você economiza.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto mb-14">
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-center">
            {PLANS.map((p) => (
              <div
                key={p.name}
                className={`rounded-2xl p-8 relative transition ${
                  p.highlight
                    ? 'bg-[#0f172a] text-white border border-blue-900 shadow-2xl md:-translate-y-4'
                    : 'bg-white border border-gray-200 shadow-sm hover:shadow-lg'
                }`}
              >
                {p.badge && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-orange-500 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide whitespace-nowrap">
                    {p.badge}
                  </div>
                )}
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-2xl font-bold ${p.highlight ? 'text-blue-400' : ''}`}>{p.name}</h3>
                  {p.off && (
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${p.highlight ? 'bg-orange-500/20 text-orange-300' : 'bg-green-100 text-green-700'}`}>
                      {p.off}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-sm font-semibold align-top">R$ </span>
                  <span className="text-5xl font-extrabold">{p.price}</span>
                  <span className={p.highlight ? 'text-gray-400' : 'text-gray-500'}> /mês</span>
                </div>
                <p className={`text-sm font-semibold mt-2 ${p.highlight ? 'text-gray-200' : 'text-gray-700'}`}>{p.billing}</p>
                <p className={`text-sm mb-6 ${p.highlight ? 'text-orange-300' : 'text-[#0094eb]'}`}>{p.note}</p>
                <ul className="space-y-3 mb-8 text-sm">
                  {INCLUDED.map((txt) => (
                    <li key={txt} className="flex items-start gap-3">
                      <Check className={`w-5 h-5 shrink-0 ${p.highlight ? 'text-blue-400' : 'text-indigo-600'}`} />
                      {txt}
                    </li>
                  ))}
                </ul>
                <Link
                  to={CTA}
                  className={`block w-full py-3 px-4 text-center font-bold rounded-xl transition ${
                    p.highlight ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                  }`}
                >
                  Testar Grátis por 7 Dias
                </Link>
                <p className={`text-xs text-center mt-3 ${p.highlight ? 'text-gray-400' : 'text-gray-500'}`}>Sem cartão de crédito</p>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-gray-500 mt-10 max-w-2xl mx-auto">
            Depois do teste, pagamento por cartão de crédito ou Pix. A renovação é automática e você cancela quando quiser, direto no painel.
          </p>
        </div>
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