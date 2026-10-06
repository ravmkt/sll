import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, TrendingUp, ShoppingCart, Receipt, Rocket, ExternalLink, Lightbulb } from 'lucide-react';

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

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-xl border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 p-5 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl">
          <div>
            <h3 className="text-base font-bold text-slate-800">Estudo de Mercado: {sector}</h3>
            {study && <p className="text-xs text-slate-400 mt-0.5">{study.period}</p>}
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

        {!study ? (
          <div className="p-8 text-center text-sm text-slate-500">
            O estudo de mercado do setor <strong>{sector}</strong> ainda está em preparação.
          </div>
        ) : (
          <div className="p-5 space-y-5">
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

            <div className="pt-3 border-t border-slate-100">
              <p className="text-[11px] font-semibold text-slate-500 mb-1.5">Fontes</p>
              <ul className="space-y-1">
                {study.sources.map((s) => (
                  <li key={s.url}>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-[#0094eb] hover:underline"
                    >
                      {s.name}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                ))}
              </ul>
              <p className="text-[10px] text-slate-400 mt-2">
                Valores de referência de fontes públicas. Variam conforme a fonte, o período e o porte da loja.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}