import { useNavigate } from 'react-router-dom';
import { ArrowRight, Clock, Copy, DollarSign, GraduationCap, Gift, MousePointerClick, Package, Play, Radio, Eye, Layers, Trophy } from 'lucide-react';
import type { ElementType, ReactNode } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import MarketingBanner from '@/components/marketing/MarketingBanner';
import VidlyticsAcademy from '@/components/vidlytics/VidlyticsAcademy';
import DashboardTour from '@/components/dashboard/DashboardTour';
import { useDashboardData } from '@/components/dashboard/useDashboardData';
import { useLoja } from '@/contexts/LojaContext';
import { showSuccess } from '@/utils/toast';

const ROUTES: Record<string, string> = {
  vidlytics: '/dashboard/modules/vidlytics',
  live_commerce: '/dashboard/modules/live-commerce',
};
const ICONS: Record<string, ElementType> = { vidlytics: Play, live_commerce: Radio };

const int = (n: number) => (n || 0).toLocaleString('pt-BR');
const brl = (n: number) => (n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const pct = (n: number) => `${(n || 0).toFixed(1).replace('.', ',')}%`;

const TIERS = [
  { n: 100, name: 'Platinum' },
  { n: 50, name: 'Diamante' },
  { n: 25, name: 'Ouro' },
  { n: 10, name: 'Prata' },
];

const CARD = 'rounded-2xl border border-slate-200/80 bg-white shadow-sm';

function Kpi({ label, value, hint, icon: Icon }: { label: string; value: string; hint: string; icon: ElementType }) {
  return (
    <div className={`${CARD} flex items-start justify-between gap-3 p-4`}>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="mt-1 truncate text-2xl font-black text-slate-900">{value}</p>
        <p className="mt-0.5 text-[11px] text-slate-400">{hint}</p>
      </div>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0094eb]/10 text-[#0094eb]">
        <Icon className="h-4 w-4" />
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2 text-center">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-sm font-black text-slate-800">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</h2>
      {children}
    </section>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { store, storeId } = useLoja() as { store: any; storeId: string | null };
  const { data, loading } = useDashboardData(storeId);

  const referralLink = store?.referral_code ? `${window.location.origin}/?ref=${store.referral_code}` : '';
  const tier = TIERS.find((t) => data.referred >= t.n);
  const next = [...TIERS].reverse().find((t) => data.referred < t.n);

  const copy = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    showSuccess('Link copiado! Compartilhe com seus amigos.');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Mural de avisos (gerenciado em Master > Marketing) */}
        <div data-tour="modules">
          <MarketingBanner storeId={storeId} location="home" onActive={() => {}} />
        </div>

        {/* KPIs */}
        <div data-tour="kpis" className={`grid grid-cols-2 gap-3 xl:grid-cols-4 ${loading ? 'opacity-60' : ''}`}>
          <Kpi label="Produtos sincronizados" value={int(data.products)} hint="SKUs ativos na loja" icon={Package} />
          <Kpi label="Visualizações de vídeos" value={int(data.viewsMonth)} hint="Neste mês" icon={Eye} />
          <Kpi label="Cliques nos widgets" value={int(data.clicksMonth)} hint="Produto e WhatsApp, neste mês" icon={MousePointerClick} />
          <Kpi label="Vendas assistidas" value={brl(data.revenueMonth)} hint="Atribuídas aos vídeos, neste mês" icon={DollarSign} />
        </div>

        {/* Hub de módulos */}
        <Section title="Seus módulos">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {data.catalog.map((m) => {
              const owned = data.owned.includes(m.slug);
              const route = ROUTES[m.slug];
              const Icon = ICONS[m.slug] ?? Layers;
              const trial = data.trialDays[m.slug];
              const soon = m.status === 'coming_soon';

              if (owned) {
                return (
                  <div key={m.slug} className={`${CARD} space-y-4 p-5`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0094eb]/10 text-[#0094eb]"><Icon className="h-5 w-5" /></div>
                        <h3 className="text-base font-black text-slate-900">{m.name}</h3>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold uppercase text-emerald-700">No ar</span>
                        {trial && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#fd8539]"><Clock className="h-3 w-3" /> Teste: {trial} {trial === 1 ? 'dia' : 'dias'}</span>
                        )}
                      </div>
                    </div>
                    {m.slug === 'vidlytics' && (
                      <div className="grid grid-cols-3 gap-2">
                        <Mini label="Vídeos ativos" value={int(data.activeVideos)} />
                        <Mini label="Views hoje" value={int(data.viewsToday)} />
                        <Mini label="CTR do mês" value={pct(data.ctrMonth)} />
                      </div>
                    )}
                    {route && (
                      <button type="button" onClick={() => navigate(route)} className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#0094eb] px-4 py-2 text-xs font-bold text-white hover:bg-[#007fcc]">
                        Acessar painel <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              }

              return (
                <div key={m.slug} className={`${CARD} space-y-3 border-dashed p-5`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><Icon className="h-5 w-5" /></div>
                      <h3 className="text-base font-black text-slate-900">{m.name}</h3>
                    </div>
                    <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-[10px] font-bold uppercase text-violet-700">{soon ? 'Em breve' : 'Módulo disponível'}</span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-500">
                    {m.slug === 'live_commerce'
                      ? 'Faça transmissões ao vivo direto no seu e-commerce, com produtos vinculados e chat em tempo real.'
                      : 'Amplie as vendas da sua loja com este módulo do SLL Hub.'}
                  </p>
                  <button
                    type="button"
                    disabled={soon}
                    onClick={() => navigate(`/dashboard/planos?modulo=${m.slug}`)}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#fd8539] px-4 py-2 text-xs font-bold text-white hover:bg-[#e8742a] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {soon ? 'Em breve' : 'Ver planos'} {!soon && <ArrowRight className="h-3.5 w-3.5" />}
                  </button>
                </div>
              );
            })}
          </div>
        </Section>

        {/* Clube + Academy */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div data-tour="club" className={`${CARD} space-y-4 p-5`}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fd8539]/10 text-[#fd8539]"><Trophy className="h-5 w-5" /></div>
              <div>
                <h3 className="text-base font-black text-slate-900">Clube SLL: indique e ganhe todo mês</h3>
                <p className="text-xs text-slate-500">10% de comissão recorrente enquanto a loja indicada assinar.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-[#0094eb]/10 px-3 py-1 font-bold text-[#0094eb]">
                {tier ? `Parceiro ${tier.name}` : 'Início da jornada'}
              </span>
              <span className="text-slate-500">
                {int(data.referred)} {data.referred === 1 ? 'loja indicada' : 'lojas indicadas'}
                {next ? ` · faltam ${next.n - data.referred} para ${next.name}` : ''}
              </span>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="min-w-0 flex-1 truncate rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
                {referralLink || 'Gerando seu link...'}
              </div>
              <button type="button" onClick={copy} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#0094eb] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#007fcc]">
                <Copy className="h-3.5 w-3.5" /> Copiar link
              </button>
            </div>
            <button type="button" onClick={() => navigate('/dashboard/afiliados')} className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-[#fd8539] hover:underline">
              <Gift className="h-3.5 w-3.5" /> Ver ganhos e metas <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 px-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0094eb]/10 text-[#0094eb]"><GraduationCap className="h-5 w-5" /></div>
              <div>
                <h3 className="text-base font-black text-slate-900">SLL Academy: aulas práticas de operação</h3>
                <p className="text-xs text-slate-500">Aprenda a vender mais com método e visão de loja real.</p>
              </div>
            </div>
            <VidlyticsAcademy />
          </div>
        </div>
      </div>

      {storeId && <DashboardTour storeId={storeId} createdAt={store?.created_at} />}
    </DashboardLayout>
  );
}