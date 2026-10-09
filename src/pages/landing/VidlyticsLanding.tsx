import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, PlayCircle, ShoppingBag, BarChart3, Zap, Upload, Link2, Code2 } from 'lucide-react';

const CTA = '/auth?mode=signup&module=vidlytics';
const MICRO = 'Instalação em 2 minutos • Não precisa de cartão de crédito • Cancele quando quiser';
const PLATFORMS = ['Nuvemshop', 'Shopify', 'Tray', 'WooCommerce', 'Vtex', 'Yampi'];

const FAQ: [string, React.ReactNode][] = [
  ['Vai deixar minha loja pesada ou lenta?', 'Não. O script carrega de forma assíncrona e é leve, então não trava a abertura da página. Os vídeos só são carregados quando entram em uso.'],
  ['Funciona na minha plataforma?', 'Funciona em Nuvemshop, Shopify, Tray, WooCommerce, Vtex e Yampi. A instalação é um script simples, válido para qualquer plataforma que aceite código no tema ou no Google Tag Manager.'],
  ['Preciso contratar um desenvolvedor?', 'Não. Você cola o código uma vez e pronto, em cerca de 2 minutos. Se travar em algum ponto, nosso suporte ajuda.'],
  ['Preciso colocar cartão de crédito para testar?', 'Não. Os 7 dias são grátis e sem cartão. Você só decide pagar se gostar.'],
  ['Que tipo de vídeo devo colocar?', 'Vídeos curtos e verticais gravados no celular: provador (peça no corpo, altura e tamanho da modelo), review e unboxing (textura e acabamento), detalhe e uso do produto, e respostas rápidas para as dúvidas mais comuns do WhatsApp.'],
  ['Como funciona o cancelamento?', 'Você cancela quando quiser, direto no painel, sem multa e sem burocracia.'],
];

function Cta({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <Link to={CTA} className="px-8 py-4 rounded-xl bg-[#0094eb] hover:bg-[#0082cf] text-white font-bold shadow-xl shadow-[#0094eb]/25 transition-all hover:scale-[1.02] active:scale-[0.98]">
        {label}
      </Link>
      <p className="text-xs text-slate-500 text-center">{MICRO}</p>
    </div>
  );
}

export default function VidlyticsLanding() {
  useEffect(() => { document.title = 'Vidlytics | Vídeos que vendem dentro da sua loja'; }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-100 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2 font-bold">
          <span className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#0094eb] to-cyan-400 text-white flex items-center justify-center text-sm">SLL</span>
          Vidlytics
        </div>
        <Link to="/auth" className="text-sm text-slate-500 hover:text-slate-900">Entrar</Link>
      </header>

      {/* 1. HERO */}
      <section className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <span className="inline-block px-3 py-1.5 rounded-full bg-[#0094eb]/10 text-[#0094eb] text-xs font-semibold mb-5">
            A experiência de compra que os seus clientes esperam
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight mb-5">
            Venda mais com o mesmo tráfego: coloque <span className="text-[#0094eb]">vídeos que vendem</span> dentro da sua loja
          </h1>
          <p className="text-lg text-slate-600 mb-8">
            Provadores, reviews e demonstrações interativas na sua loja virtual, com botão <b>“Compre no Vídeo”</b> em 1 clique. Seu cliente vê o caimento, a textura e o detalhe, e compra sem sair da página.
          </p>
          <div className="flex flex-col items-start gap-6">
            <Cta label="Testar Grátis por 7 Dias" />
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <span key={p} className="px-3 py-1 rounded-full border border-slate-200 text-xs text-slate-600">{p}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-center">
          <div className="w-64 h-[500px] rounded-[2.5rem] border-8 border-slate-900 bg-slate-100 relative overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-b from-slate-200 to-slate-300 flex items-center justify-center">
              <PlayCircle size={64} className="text-white drop-shadow" />
            </div>
            <div className="absolute bottom-4 left-4 right-4 rounded-xl bg-[#fd8539] text-white text-center text-sm font-bold py-3 shadow-lg flex items-center justify-center gap-2">
              <ShoppingBag size={16} /> Comprar agora
            </div>
          </div>
        </div>
      </section>

      {/* 2. DOR */}
      <section className="bg-slate-950 text-white">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-5">Seu cliente vive em vídeo. Sua loja ainda vive de foto.</h2>
          <p className="text-slate-300 mb-6">
            No Instagram e no TikTok, ele assiste, desliza e decide em segundos, tudo em vídeo vertical. Ao chegar na sua loja, encontra uma vitrine estática: foto parada, carrossel igual ao de 2015 e nenhuma resposta para as perguntas que pesam na compra.
          </p>
          <ul className="grid sm:grid-cols-2 gap-2 mb-6 text-slate-200">
            {['Como cai no corpo?', 'Qual o tamanho da modelo?', 'O tecido é como parece?', 'Vale o preço?'].map((q) => (
              <li key={q} className="px-4 py-3 rounded-lg bg-slate-900 border border-slate-800">{q}</li>
            ))}
          </ul>
          <p className="text-slate-300 mb-6">
            <b className="text-white">E cada clique custa mais.</b> Você paga Meta Ads e Google para trazer gente qualificada. Se a página não passa segurança de caimento e acabamento, esse tráfego vira abandono de carrinho, mensagem no WhatsApp e, quando compra, devolução.
          </p>
          <blockquote className="border-l-4 border-[#fd8539] pl-4 text-lg text-white">
            Se a conversão da sua loja está travada entre 1% e 2%, o problema raramente é o anúncio. É o que o cliente encontra depois do clique.
          </blockquote>
        </div>
      </section>

      {/* 3. MECANISMO */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-3">Três passos. Menos de 2 minutos para instalar.</h2>
        <div className="grid md:grid-cols-3 gap-5 mt-10">
          {[
            [Upload, '1. Suba seus vídeos', 'Stories, reels ou provadores gravados no celular. Não precisa de produção.'],
            [Link2, '2. Vincule os produtos', 'Escolha o produto e ative o botão de compra direto no vídeo, com 1 clique.'],
            [Code2, '3. Cole o código na loja', 'Um script simples, sem mexer em código complexo e sem desenvolvedor.'],
          ].map(([Icon, t, d]: any) => (
            <div key={t} className="p-6 rounded-2xl border border-slate-200">
              <Icon className="text-[#0094eb] mb-3" size={26} />
              <h3 className="font-bold mb-1">{t}</h3>
              <p className="text-sm text-slate-600">{d}</p>
            </div>
          ))}
        </div>
        <h3 className="text-xl font-bold text-center mt-14 mb-6">Três formatos, um só painel</h3>
        <div className="grid md:grid-cols-3 gap-5">
          {[
            ['Stories na Home', 'Topo da página inicial', 'Engaja logo na entrada e leva o visitante aos produtos.'],
            ['Widget flutuante', 'Qualquer página da loja', 'Mantém o vídeo e o botão de compra sempre à vista.'],
            ['Carrossel de Reels', 'Página de produto (PDP)', 'Mostra o produto em uso no momento da decisão.'],
          ].map(([t, w, d]) => (
            <div key={t} className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
              <h4 className="font-bold">{t}</h4>
              <p className="text-xs font-semibold text-[#0094eb] mb-2">{w}</p>
              <p className="text-sm text-slate-600">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. DIFERENCIAIS */}
      <section className="bg-slate-50">
        <div className="max-w-6xl mx-auto px-6 py-16 grid sm:grid-cols-2 gap-5">
          {[
            [Zap, 'Carregamento leve', 'O script carrega de forma assíncrona e ultraleve, pensado para não pesar na navegação da sua loja.'],
            [ShoppingBag, 'Botão “Compre no Vídeo”', 'O cliente avança para a compra sem quebrar a experiência de navegação.'],
            [BarChart3, 'Métricas reais', 'Dashboard com visualizações, retenção, cliques e vendas atribuídas a cada vídeo e produto. Repita o que funciona.'],
            [CheckCircle2, 'Menos dúvidas, menos trocas', 'Com o produto em movimento, o cliente pergunta menos “qual o tamanho da modelo?”. Isso alivia o suporte e ajuda a reduzir devoluções.'],
          ].map(([Icon, t, d]: any) => (
            <div key={t} className="p-6 rounded-2xl bg-white border border-slate-200">
              <Icon className="text-[#fd8539] mb-3" size={24} />
              <h3 className="font-bold mb-1">{t}</h3>
              <p className="text-sm text-slate-600">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. AUTORIDADE */}
      <section className="max-w-3xl mx-auto px-6 py-16 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-[#0094eb] mb-3">De lojista para lojista</p>
        <blockquote className="text-xl md:text-2xl font-semibold leading-snug">
          “Nós não somos uma agência teórica. Criamos o Vidlytics para resolver o gargalo de conversão da nossa própria marca de moda feminina, a Useane. É a ferramenta que usamos na nossa operação todos os dias.”
        </blockquote>
        <p className="text-sm text-slate-500 mt-4">Rodrigo Vicente, fundador da Useane e do Vidlytics, ao lado de Anne</p>
      </section>

      {/* 6. PREÇO */}
      <section className="bg-slate-950 text-white">
        <div className="max-w-md mx-auto px-6 py-16 text-center">
          <h2 className="text-3xl font-extrabold mb-8">Um plano. Tudo incluso.</h2>
          <div className="rounded-2xl bg-white text-slate-900 p-8 shadow-2xl">
            <p className="font-bold text-slate-500">Vidlytics Mensal</p>
            <p className="text-5xl font-extrabold my-2">R$ 59,90<span className="text-base font-semibold text-slate-500"> / mês</span></p>
            <p className="text-sm font-semibold text-[#0094eb] mb-6">Teste grátis por 7 dias. Cancele quando quiser.</p>
            <ul className="text-left text-sm space-y-2 mb-8">
              {['Stories, Widget flutuante e Carrossel de Reels', 'Botão “Compre no Vídeo”', 'Métricas de visualização, retenção, cliques e vendas atribuídas', 'Suporte humano', 'Instalação simplificada'].map((i) => (
                <li key={i} className="flex gap-2"><CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />{i}</li>
              ))}
            </ul>
            <Cta label="Iniciar Meu Teste Grátis de 7 Dias" />
          </div>
        </div>
      </section>

      {/* 7. FAQ */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-extrabold text-center mb-8">Perguntas frequentes</h2>
        <div className="space-y-3">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group rounded-xl border border-slate-200 p-4">
              <summary className="font-semibold cursor-pointer list-none flex justify-between">
                {q}<span className="text-[#0094eb] group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="text-sm text-slate-600 mt-3">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* 8. CTA FINAL */}
      <section className="bg-gradient-to-tr from-[#0094eb] to-cyan-500 text-white text-center">
        <div className="max-w-3xl mx-auto px-6 py-16">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Saia das fotos estáticas. Transforme visitantes em clientes.</h2>
          <p className="mb-8 text-white/90">Cada dia com a loja parada em foto é tráfego pago que não vira venda. Em 2 minutos você coloca o primeiro vídeo no ar.</p>
          <div className="flex flex-col items-center gap-3">
            <Link to={CTA} className="px-8 py-4 rounded-xl bg-white text-[#0082cf] font-bold shadow-xl hover:scale-[1.02] transition-all">Testar Grátis por 7 Dias</Link>
            <p className="text-xs text-white/80">{MICRO}</p>
          </div>
        </div>
      </section>

      <footer className="bg-slate-950 text-slate-400 text-xs text-center py-6 px-4">
        SLL Hub · RAV Marketing e Treinamento LTDA · CNPJ 62.894.336/0001-00
      </footer>
    </div>
  );
}