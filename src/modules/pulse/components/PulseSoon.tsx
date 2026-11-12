import type { PulseTab } from './PulseSidebar';

const INFO: Partial<Record<PulseTab, { title: string; desc: string }>> = {
  cronograma: { title: 'Cronograma', desc: 'Orquestre a campanha por fases (teaser, pré-venda, abertura e últimas horas), com segmentação, teste A/B e métricas.' },
  alertas: { title: 'Alertas', desc: 'Web push, banners e avisos de abertura da campanha. E-mails são disparados pelo Email Mkt.' },
  gatilhos: { title: 'Gatilhos', desc: 'Contagem regressiva, "restam X unidades", barra de estoque e avisos de últimas horas.' },
  social: { title: 'Social Proof', desc: 'Compras recentes, pessoas vendo agora e contadores de vendas e avaliações.' },
  boost: { title: 'Boost', desc: 'Upsell, cross-sell e barras de oferta para aumentar o ticket médio. Descontos calculados pelo módulo Promoções.' },
};

export default function PulseSoon({ tab }: { tab: PulseTab }) {
  const info = INFO[tab];
  return (
    <div className="mx-auto max-w-2xl p-8">
      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">Em breve</span>
      <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900">{info?.title ?? 'Pulse'}</h1>
      <p className="mt-2 text-sm text-slate-600">{info?.desc}</p>
    </div>
  );
}