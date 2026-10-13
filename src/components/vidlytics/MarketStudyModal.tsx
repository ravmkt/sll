import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { X, TrendingUp, ShoppingCart, Receipt, Rocket, ExternalLink, Lightbulb, AlertTriangle, CheckCircle2, MinusCircle, Sparkles } from 'lucide-react';

type Kpi = { label: string; value: string; note: string; icon: 'conv' | 'ticket' | 'cart' | 'growth' };
type Study = {
  period: string;
  kpis: Kpi[];
  insights: string[];
  sources: { name: string; url: string }[];
};

const norm = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

const STUDIES: Record<string, Study> = {
  'moda e acessorios': {
    period: 'Mercado brasileiro, 2024 a 2026',
    kpis: [
      { label: 'Taxa de conversão', value: '1,5% a 2,5%', note: 'Média do e-commerce de moda no Brasil. Meta ideal: acima de 3%.', icon: 'conv' },
      { label: 'Ticket médio', value: 'R$ 271 a R$ 296', note: 'Acessórios R$ 271 e vestuário R$ 296 (Nuvemshop, jun/2026).', icon: 'ticket' },
      { label: 'Abandono de carrinho', value: '70% a 80%', note: 'Média do setor. Meta ideal: abaixo de 65%.', icon: 'cart' },
      { label: 'Crescimento do faturamento', value: '+49%', note: 'Vestuário e acessórios na 1ª semana de inverno vs. 2025. Mesmas lojas: +24,9%.', icon: 'growth' },
    ],
    insights: [
      'Sudeste e Sul concentram cerca de 76% dos pedidos de moda na Nuvemshop. O Centro-Oeste é a região que mais cresce (+70,7%).',
      'No inverno o ticket sobe, porque o consumidor compra peças de maior valor, como casacos, calçados e malharia.',
      'Dúvida de tamanho e ajuste gera devolução. Vídeos mostrando caimento e uso ajudam a reduzir essa insegurança (recomendação SLL).',
      'Moda feminina converte em média 1,8% a 2,2% e moda masculina 1,5% a 2,0%.',
    ],
    sources: [
      { name: 'Folha / Nuvemshop (jul/2026)', url: 'https://www1.folha.uol.com.br/colunas/painelsa/2026/07/faturamento-de-lojas-virtuais-de-vestuario-cresce-49-no-inicio-do-inverno-diz-nuvemshop.shtml' },
      { name: 'Provei.AI, benchmarks de conversão (abr/2026)', url: 'https://provei.ai/blog/taxa-de-conversao-ecommerce-moda-benchmarks/' },
      { name: 'Painel10, KPIs de e-commerce de moda (ago/2024)', url: 'https://painel10.com.br/dicas-de-commerce/veja-quais-sao-os-valores-ideais-para-os-principais-kpis-de-um-e-commerce-de-moda/' },
    ],
  },
};

const ICONS = { conv: TrendingUp, ticket: Receipt, cart: ShoppingCart, growth: Rocket };

type SectorRow = { key: string; name: string; conv: string; ctr: string; ret: string; cart: string; ticket: string };

const SECTOR_ROWS: SectorRow[] = [
  { key: 'moda', name: 'Moda & Acessórios', conv: '1,4% a 2,2%', ctr: '4,5% a 7,2%', ret: '48% a 62%', cart: '6,0% a 9,5%', ticket: 'R$ 220 - R$ 380' },
  { key: 'beleza', name: 'Beleza & Cosméticos', conv: '1,8% a 2,8%', ctr: '5,0% a 8,5%', ret: '52% a 68%', cart: '7,0% a 11,0%', ticket: 'R$ 160 - R$ 280' },
  { key: 'eletro', name: 'Eletrônicos & Informática', conv: '0,9% a 1,5%', ctr: '3,0% a 5,2%', ret: '38% a 50%', cart: '3,8% a 6,0%', ticket: 'R$ 450 - R$ 1.200' },
  { key: 'casa', name: 'Casa & Decoração', conv: '1,1% a 1,8%', ctr: '3,8% a 6,0%', ret: '42% a 55%', cart: '4,5% a 7,2%', ticket: 'R$ 320 - R$ 650' },
  { key: 'saude', name: 'Saúde & Suplementos', conv: '1,6% a 2,5%', ctr: '4,2% a 6,8%', ret: '45% a 58%', cart: '5,5% a 8,5%', ticket: 'R$ 180 - R$ 320' },
  { key: 'infantil', name: 'Infantil & Brinquedos', conv: '1,3% a 2,0%', ctr: '4,0% a 6,5%', ret: '44% a 56%', cart: '5,0% a 8,0%', ticket: 'R$ 190 - R$ 310' },
  { key: 'geral', name: 'Geral / Outros Setores', conv: '1,2% a 1,8%', ctr: '3,5% a 5,5%', ret: '40% a 52%', cart: '4,2% a 6,5%', ticket: 'R$ 210 - R$ 350' },
];

const rowKeyFor = (sector: string): string => {
  const n = norm(sector);
  if (/moda|joia|semijoia|acessor|vestuario|calcado|roupa/.test(n)) return 'moda';
  if (/beleza|cosmet|perfum|maquiagem/.test(n)) return 'beleza';
  if (/eletron|informatica|celular|game/.test(n)) return 'eletro';
  if (/casa|decor|movel|moveis|utilidade/.test(n)) return 'casa';
  if (/saude|suplement|farmac|fitness/.test(n)) return 'saude';
  if (/infantil|brinquedo|bebe|crianca/.test(n)) return 'infantil';
  return 'geral';
};

const DIAG = [
  {
    tone: 'red' as const,
    title: 'Abaixo da média',
    icon: AlertTriangle,
    items: [
      ['Retenção baixa (< 40%)', 'O início dos vídeos está lento. Troque os primeiros 3 segundos por um gancho mais dinâmico ou mostre o produto em uso de imediato.'],
      ['CTR baixo (< 3%)', 'O cliente assiste, mas não clica. Deixe o produto vinculado visível mais cedo ou destaque preço e condição.'],
      ['Pouco Add to Cart', 'A página do produto ou a oferta não passa confiança, ou o frete assusta no cálculo final.'],
    ],
  },
  {
    tone: 'amber' as const,
    title: 'Na média de mercado',
    icon: MinusCircle,
    items: [['Operação equilibrada', 'Teste mais criativos de vídeo na Home e nas páginas de produto mais visitadas para aumentar a amostragem.']],
  },
  {
    tone: 'green' as const,
    title: 'Acima da média',
    icon: CheckCircle2,
    items: [['Parabéns!', 'Seu conteúdo gera desejo e conexão. É o momento de acelerar o tráfego pago para essas páginas e escalar o faturamento.']],
  },
];

const TONES = {
  red: 'border-rose-200 bg-rose-50/60 text-rose-700',
  amber: 'border-amber-200 bg-amber-50/60 text-amber-700',
  green: 'border-emerald-200 bg-emerald-50/60 text-emerald-700',
};

const GLOSSARY = [
  ['Conversão Geral', '% de visitantes do site que finalizam o pedido.'],
  ['CTR no Vídeo', '% de pessoas que assistiram ao vídeo e clicaram no card do produto.'],
  ['Retenção (> 5s)', '% de usuários que continuam assistindo após os 5 segundos iniciais. Mede a força do gancho.'],
  ['Add to Cart no Vídeo', '% de pessoas que adicionaram o produto à sacola pela interação com o vídeo.'],
];

export default function MarketStudyModal({
  open,
  onClose,
  sector,
}: {
  open: boolean;
  onClose: () => void;
  sector: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  const study = STUDIES[norm(sector)];
  const myKey = rowKeyFor(sector);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-xl border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 p-5 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <div>
            <h3 className="text-base font-bold text-slate-800">Benchmark do Setor: como sua loja se compara com o mercado</h3>
            <p className="text-xs text-slate-500 mt-0.5">Faixas de referência de lojas do mesmo segmento para guiar suas decisões e otimizações.</p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="px-2 py-0.5 rounded-full bg-sky-50 text-[#0094eb] text-[10px] font-bold uppercase">Referências de e-commerce no Brasil</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase">Seu setor: {sector}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          <p className="text-xs text-slate-600 leading-relaxed">
            Cada nicho tem comportamento de compra, ciclo de decisão e retenção diferentes. Use as faixas abaixo como régua para saber se o seu funil está saudável ou se há gargalos na operação.
          </p>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="text-left font-bold px-3 py-2.5">Setor</th>
                  <th className="text-center font-bold px-3 py-2.5">Conversão geral</th>
                  <th className="text-center font-bold px-3 py-2.5">CTR no vídeo</th>
                  <th className="text-center font-bold px-3 py-2.5">Retenção (&gt; 5s)</th>
                  <th className="text-center font-bold px-3 py-2.5">Add to Cart</th>
                  <th className="text-center font-bold px-3 py-2.5">Ticket médio</th>
                </tr>
              </thead>
              <tbody>
                {SECTOR_ROWS.map((r) => {
                  const mine = r.key === myKey;
                  return (
                    <tr key={r.key} className={`border-t border-slate-100 ${mine ? 'bg-sky-50 text-slate-900 font-semibold' : 'text-slate-600'}`}>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {r.name}
                        {mine && <span className="ml-2 px-1.5 py-0.5 rounded-full bg-[#0094eb] text-white text-[9px] font-bold uppercase">Seu setor</span>}
                      </td>
                      <td className="px-3 py-2.5 text-center whitespace-nowrap">{r.conv}</td>
                      <td className="px-3 py-2.5 text-center whitespace-nowrap">{r.ctr}</td>
                      <td className="px-3 py-2.5 text-center whitespace-nowrap">{r.ret}</td>
                      <td className="px-3 py-2.5 text-center whitespace-nowrap">{r.cart}</td>
                      <td className="px-3 py-2.5 text-center whitespace-nowrap">{r.ticket}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div>
            <p className="text-sm font-bold text-slate-800 mb-2">Como interpretar os seus resultados</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {DIAG.map((d) => {
                const Icon = d.icon;
                return (
                  <div key={d.title} className={`rounded-xl border p-3 space-y-2 ${TONES[d.tone]}`}>
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase">
                      <Icon className="w-4 h-4" /> {d.title}
                    </div>
                    {d.items.map(([t, txt]) => (
                      <p key={t} className="text-[11px] leading-relaxed text-slate-600">
                        <strong className="text-slate-800">{t}:</strong> {txt}
                      </p>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          {study && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-bold text-slate-800">Dados do setor com fonte</p>
                <p className="text-xs text-slate-400">{study.period}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {study.kpis.map((k) => {
                  const Icon = ICONS[k.icon];
                  return (
                    <div key={k.label} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                        <Icon className="w-4 h-4 text-[#0094eb]" />
                        {k.label}
                      </div>
                      <p className="text-xl font-bold text-slate-800 mt-1.5">{k.value}</p>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{k.note}</p>
                    </div>
                  );
                })}
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  O que isso significa para a sua loja
                </div>
                <ul className="space-y-2">
                  {study.insights.map((i) => (
                    <li key={i} className="text-xs text-slate-600 leading-relaxed pl-3 border-l-2 border-sky-200">
                      {i}
                    </li>
                  ))}
                </ul>
              </div>
              <ul className="space-y-1">
                {study.sources.map((s) => (
                  <li key={s.url}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-[#0094eb] hover:underline">
                      {s.name}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100">
            <p className="text-[11px] font-semibold text-slate-500 mb-1.5">Glossário</p>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
              {GLOSSARY.map(([t, d]) => (
                <div key={t} className="text-[11px] text-slate-500 leading-relaxed">
                  <dt className="inline font-bold text-slate-700">{t}: </dt>
                  <dd className="inline">{d}</dd>
                </div>
              ))}
            </dl>
            <p className="text-[10px] text-slate-400 mt-3">
              Faixas de referência consolidadas de fontes públicas e estimativas de mercado. Variam conforme a fonte, o período e o porte da loja.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
          <p className="text-xs text-slate-500">Quer melhorar seus indicadores? Veja as recomendações práticas nas Dicas do Noah.</p>
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors">
              Fechar
            </button>
            <Link
              to="/dashboard/dicas"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0094eb] hover:bg-[#0082d0] text-white text-xs font-bold transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" /> Ver Dicas para o meu Setor →
            </Link>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}