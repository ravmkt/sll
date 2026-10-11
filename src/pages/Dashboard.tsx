import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Clock, Copy, DollarSign, GraduationCap, Gift, MousePointerClick, Package, Play, Radio, Eye, Shirt, Trophy } from 'lucide-react';
import type { ElementType, ReactNode } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import DashboardNotice from '@/components/dashboard/DashboardNotice';
import VidlyticsAcademy from '@/components/vidlytics/VidlyticsAcademy';
import DashboardTour from '@/components/dashboard/DashboardTour';
import { useDashboardData } from '@/components/dashboard/useDashboardData';
import { useLoja } from '@/contexts/LojaContext';
import { showSuccess } from '@/utils/toast';

interface ModuleCard {
  slug: string;
  name: string;
  icon: ElementType;
  route?: string;
  desc: string;
  bullets: string[];
  forceSoon?: boolean;
}

const MODULES: ModuleCard[] = [
  {
    slug: 'vidlytics',
    name: 'Vidlytics',
    icon: Play,
    route: '/dashboard/modules/vidlytics',
    desc: 'Vídeos interativos que vendem dentro da sua loja.',
    bullets: ['Stories em vídeo no site', 'Vídeos flutuantes e carrossel de reels', 'Botão "Compre no Vídeo" em 1 clique', 'Carregamento leve e assíncrono'],
  },
  {
    slug: 'live_commerce',
    name: 'Live Commerce',
    icon: Radio,
    route: '/dashboard/modules/live-commerce',
    desc: 'Transmissões ao vivo direto no seu e-commerce.',
    bullets: ['Lives com produtos vinculados', 'Chat em tempo real', 'Tudo na página da sua loja'],
  },
  {
    slug: 'provador',
    name: 'Provador Virtual',
    icon: Shirt,
    desc: 'Ajude o cliente a escolher o tamanho certo.',
    bullets: ['Recomendação de tamanho', 'Menos trocas e devoluções'],
    forceSoon: true,
  },
];

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
        {/* Mural de avisos nativo */}
        <DashboardNotice />

        {/* KPIs */}
        <div data-tour="kpis" className={`grid grid-cols-2 gap-3 xl:grid-cols-4 ${loading ? 'opacity-60' : ''}`}>
          <Kpi label="Produtos sincronizados" value={int(data.products)} hint="SKUs ativos na loja" icon={Package} />
          <Kpi label="Visualizações de vídeos" value={int(data.viewsMonth)} hint="Neste mês" icon={Eye} />
          <Kpi label="Cliques nos widgets" value={int(data.clicksMonth)} hint="Produto e WhatsApp, neste mês" icon={MousePointerClick} />
          <Kpi label="Vendas assistidas" value={brl(data.revenueMonth)} hint="Atribuídas aos vídeos, neste mês" icon={DollarSign} />
        </div>

        {/* Ecossistema de módulos */}
        <div data-tour="modules">
          <Section title="Seus módulos">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {MODULES.map((m) => {
                const info = data.catalog.find((c) => c.slug === m.slug);
                const owned = data.owned.includes(m.slug);
                const soon = !!m.forceSoon || info?.status === 'coming_soon';
                const trial = data.trialDays[m.slug];
                const Icon = m.icon;

                return (
                  <div key={m.slug} className={`${CARD} flex flex-col gap-4 p-5 ${owned ? '' : 'border-dashed'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${owned ? 'bg-[#0094eb]/10 text-[#0094eb]' : 'bg-slate-100 text-slate-500'}`}><Icon className="h-5 w-5" /></div>
                        <h3 className="text-base font-black text-slate-900">{m.name}</h3>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {owned ? (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold uppercase text-emerald-700">Ativo</span>
                        ) : soon ? (
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-slate-500">Em breve</span>
                        ) : (
                          <span className="rounded-full bg-[#0094eb]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase text-[#0094eb]">Módulo disponível</span>
                        )}
                        {owned && trial && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500"><Clock className="h-3 w-3" /> Teste: {trial} {trial === 1 ? 'dia' : 'dias'}</span>
                        )}
                      </div>
                    </div>

                    <p className="text-xs leading-relaxed text-slate-500">{m.desc}</p>

                    {m.slug === 'vidlytics' && owned && (
                      <div className="grid grid-cols-3 gap-2">
                        <Mini label="Vídeos ativos" value={int(data.activeVideos)} />
                        <Mini label="Views hoje" value={int(data.viewsToday)} />
                        <Mini label="CTR do mês" value={pct(data.ctrMonth)} />
                      </div>
                    )}

                    <ul className="space-y-1.5">
                      {m.bullets.map((b) => (
                        <li key={b} className="flex items-start gap-2 text-xs text-slate-600">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0094eb]" /> {b}
                        </li>
                      ))}
                    </ul>

                    <div className="mt-auto pt-1">
                      {soon ? (
                        <button type="button" disabled className="inline-flex w-full cursor-not-allowed items-center justify-center rounded-xl bg-slate-200 px-4 py-2.5 text-xs font-bold text-slate-500">
                          Em breve
                        </button>
                      ) : owned && m.route ? (
                        <button type="button" onClick={() => navigate(m.route as string)} className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#0094eb] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#007fcc]">
                          Acessar painel <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      ) : !owned ? (
                        <button type="button" onClick={() => navigate(`/dashboard/planos?modulo=${m.slug}`)} className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#0094eb] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#007fcc]">
                          Ativar {m.name} <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        </div>

        {/* Clube + Academy */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div data-tour="club" className={`${CARD} space-y-4 p-5`}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0094eb]/10 text-[#0094eb]"><Trophy className="h-5 w-5" /></div>
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
            <button type="button" onClick={() => navigate('/dashboard/afiliados')} className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-[#0094eb] hover:underline">
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