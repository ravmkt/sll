import { useMemo, useState } from 'react';
import type { ElementType, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, ArrowRight, Check, Clock, Copy, DollarSign, Eye, GraduationCap, Gift, Lightbulb,
  MousePointerClick, Package, Play, Radio, Shirt, Trophy, Users,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import DashboardNotice from '@/components/dashboard/DashboardNotice';
import VidlyticsAcademy from '@/components/vidlytics/VidlyticsAcademy';
import DashboardTour from '@/components/dashboard/DashboardTour';
import { joinWaitlist, useDashboardData, usePulse, type DashData } from '@/components/dashboard/useDashboardData';
import { useLoja } from '@/contexts/LojaContext';
import { showError, showSuccess } from '@/utils/toast';

// dash-v2-master
type Periodo = 'today' | '7' | '30' | 'month' | 'custom';

const PERIODOS: { key: Periodo; label: string }[] = [
  { key: 'today', label: 'Hoje' },
  { key: '7', label: '7 dias' },
  { key: '30', label: '30 dias' },
  { key: 'month', label: 'Mês atual' },
  { key: 'custom', label: 'Personalizado' },
];

const ICONS: Record<string, ElementType> = { vidlytics: Play, live_commerce: Radio, provador: Shirt };
const ROUTES: Record<string, string> = { vidlytics: '/dashboard/modules/vidlytics', live_commerce: '/dashboard/modules/live-commerce' };
const ACADEMY_URL = (import.meta.env.VITE_ACADEMY_CHANNEL_URL as string | undefined) || 'https://www.youtube.com';

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const int = (n: number) => (n || 0).toLocaleString('pt-BR');
const brl = (n: number) => (n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const pct = (n: number) => `${(n || 0).toFixed(1).replace('.', ',')}%`;

const TIERS = [
  { n: 100, name: 'Platinum' },
  { n: 50, name: 'Diamante' },
  { n: 25, name: 'Ouro' },
  { n: 10, name: 'Prata' },
];

const CARD = 'rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md';
const DATE_IN = 'h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none focus:border-[#0094eb]';

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
    <div className="rounded-xl bg-slate-50 px-3 py-3 text-center">
      <p className="text-[11px] font-bold leading-tight text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-900">{value}</p>
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

function buildInsight(d: DashData, hasVid: boolean): { title: string; text: string } {
  if (hasVid && d.totalVideos === 0) {
    return {
      title: 'Suba seu primeiro vídeo',
      text: 'Sua loja ainda não tem vídeos interativos. Suba um vídeo de 15 a 30 segundos mostrando os detalhes da sua peça mais vendida para destravar as primeiras vendas assistidas.',
    };
  }
  if (hasVid && d.viewsRange >= 30 && d.ctrRange < 2) {
    return {
      title: 'Muitas views, poucos cliques',
      text: 'Seus vídeos estão sendo vistos, mas poucos clicam no produto. Ajuste o botão de compra para aparecer logo nos primeiros segundos do vídeo e deixe o CTA mais direto.',
    };
  }
  if (hasVid && d.topVideo) {
    return {
      title: 'Destaque seu vídeo campeão',
      text: `O vídeo "${d.topVideo.title}" é o que mais converte no período. Que tal usá-lo em destaque também na página inicial da loja?`,
    };
  }
  if (d.referred === 0) {
    return {
      title: 'Indique lojistas e ganhe todo mês',
      text: 'Cada loja que você indica e que assina te paga 10% de comissão recorrente. Compartilhe seu link exclusivo do Clube SLL.',
    };
  }
  if (d.products === 0) {
    return {
      title: 'Sincronize seus produtos',
      text: 'Importe ou cadastre seus produtos para poder vincular vídeos e liberar a compra direta pelo conteúdo.',
    };
  }
  return {
    title: 'Acompanhe seus números toda semana',
    text: 'Compare períodos no filtro acima e repita o formato dos vídeos que geram mais cliques e vendas.',
  };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { store, storeId } = useLoja() as { store: any; storeId: string | null };

  const [periodo, setPeriodo] = useState<Periodo>('30');
  const [cs, setCs] = useState(() => ymd(addDays(new Date(), -29)));
  const [ce, setCe] = useState(() => ymd(new Date()));
  const [joined, setJoined] = useState<Set<string>>(new Set());
  const [busySlug, setBusySlug] = useState<string | null>(null);

  const range = useMemo(() => {
    const now = new Date();
    if (periodo === 'custom') return { start: cs, end: ce };
    if (periodo === 'today') return { start: ymd(now), end: ymd(now) };
    if (periodo === 'month') return { start: ymd(new Date(now.getFullYear(), now.getMonth(), 1)), end: ymd(now) };
    return { start: ymd(addDays(now, -(Number(periodo) - 1))), end: ymd(now) };
  }, [periodo, cs, ce]);

  const { data, loading } = useDashboardData(storeId, range);
  const pulse = usePulse(storeId);

  const referralLink = store?.referral_code ? `${window.location.origin}/?ref=${store.referral_code}` : '';
  const tier = TIERS.find((t) => data.referred >= t.n);
  const next = [...TIERS].reverse().find((t) => data.referred < t.n);
  const hasVid = data.owned.includes('vidlytics');
  const total = data.assistedRevenue + data.clubCommission;
  const insight = buildInsight(data, hasVid);

  const copy = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    showSuccess('Link copiado! Compartilhe com seus amigos.');
  };

  const onWait = async (slug: string) => {
    if (!storeId) return;
    setBusySlug(slug);
    const ok = await joinWaitlist(storeId, slug);
    setBusySlug(null);
    if (ok) {
      setJoined((p) => new Set(p).add(slug));
      showSuccess('Você entrou na lista de espera. Avisaremos quando abrir.');
    } else {
      showError('Não foi possível entrar na lista agora. Tente novamente.');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Banner gerenciado pelo Master */}
        <DashboardNotice storeId={storeId} />

        {/* Resultados com filtro de periodo */}
        <div data-tour="kpis" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900">Resultados da sua loja</h2>
              <p className="text-xs text-slate-500">O que o SLL Hub gerou no período escolhido.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {periodo === 'custom' && (
                <>
                  <input type="date" value={cs} max={ce} onChange={(e) => setCs(e.target.value)} className={DATE_IN} />
                  <span className="text-xs text-slate-400">até</span>
                  <input type="date" value={ce} min={cs} onChange={(e) => setCe(e.target.value)} className={DATE_IN} />
                </>
              )}
              <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
                {PERIODOS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setPeriodo(p.key)}
                    className={`cursor-pointer rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                      periodo === p.key ? 'bg-[#0094eb] text-white shadow-sm' : 'text-slate-500 hover:text-[#0094eb]'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className={`grid grid-cols-1 gap-3 xl:grid-cols-4 ${loading ? 'opacity-60' : ''}`}>
            <div className={`${CARD} flex flex-col justify-between bg-gradient-to-br from-[#0094eb]/5 to-white p-6 xl:col-span-2`}>
              <div className="flex items-start justify-between gap-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Impacto financeiro total</p>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0094eb]/10 text-[#0094eb]">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-4xl font-black text-slate-900">{brl(total)}</p>
                <p className="mt-2 text-sm font-medium text-slate-600">
                  {brl(data.assistedRevenue)} em vendas na loja + {brl(data.clubCommission)} em comissões do Clube
                </p>
                <p className="mt-1 text-[11px] text-slate-400">Vendas atribuídas aos módulos e comissões geradas no período.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 xl:col-span-2">
              <Kpi label="Produtos sincronizados" value={int(data.products)} hint="SKUs ativos na loja" icon={Package} />
              {hasVid ? (
                <>
                  <Kpi label="Visualizações" value={int(data.viewsRange)} hint="Vídeos no período" icon={Eye} />
                  <Kpi label="Cliques nos widgets" value={int(data.clicksRange)} hint="Produto e WhatsApp" icon={MousePointerClick} />
                  <Kpi label="CTR" value={pct(data.ctrRange)} hint="Cliques ÷ visualizações" icon={Activity} />
                </>
              ) : (
                <Kpi label="Lojas indicadas" value={int(data.referred)} hint="No Clube SLL" icon={Users} />
              )}
            </div>
          </div>
        </div>

        {/* Pulso de hoje + dica */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className={`${CARD} space-y-4 p-5`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                </span>
                <h3 className="text-base font-black text-slate-900">Pulso da sua loja hoje</h3>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Atualiza a cada minuto</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Mini label="Pessoas que interagiram" value={pulse ? int(pulse.interactions) : '—'} />
              <Mini label="Cliques em comprar" value={pulse ? int(pulse.buyClicks) : '—'} />
              <Mini label="Sessões com vídeo engajado" value={pulse ? int(pulse.engaged) : '—'} />
            </div>
            <p className="text-xs text-slate-500">Os módulos trabalham no piloto automático enquanto você cuida do resto.</p>
          </div>

          <div className={`${CARD} flex flex-col gap-3 p-5`}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fd8539]/10 text-[#fd8539]">
                <Lightbulb className="h-5 w-5" />
              </div>
              <h3 className="text-base font-black text-slate-900">Dica do especialista</h3>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-800">{insight.title}</p>
              <p className="mt-1 text-sm font-medium leading-relaxed text-slate-600">{insight.text}</p>
            </div>
            <button
              type="button"
              onClick={() => window.open(ACADEMY_URL, '_blank', 'noopener')}
              className="inline-flex w-fit cursor-pointer items-center gap-1.5 text-xs font-bold text-[#0094eb] hover:underline"
            >
              Ver mais dicas e insights <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Modulos vindos do Master */}
        <div data-tour="modules">
          <Section title="Seus módulos">
            {data.modules.length === 0 && !loading && (
              <p className="text-sm text-slate-500">Nenhum módulo disponível no momento.</p>
            )}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {data.modules.map((m) => {
                const owned = data.owned.includes(m.slug);
                if (m.status === 'hidden' && !owned) return null;

                const maint = m.status === 'maintenance';
                const soon = m.status === 'coming_soon' && !owned;
                const trial = data.trialDays[m.slug];
                const Icon = ICONS[m.slug] ?? Package;
                const route = m.route_path || ROUTES[m.slug];
                const isJoined = joined.has(m.slug) || data.waitlist.includes(m.slug);

                return (
                  <div key={m.slug} className={`${CARD} flex flex-col gap-4 p-5 ${owned ? '' : 'border-dashed'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#0094eb]/15 to-[#0094eb]/5 ring-1 ring-[#0094eb]/15">
                          {m.logo_url
                            ? <img src={m.logo_url} alt={m.name} className="h-11 w-11 object-contain" />
                            : <Icon className="h-6 w-6 text-[#0094eb]" />}
                        </div>
                        <h3 className="text-lg font-black text-slate-900">{m.name}</h3>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {maint ? (
                          <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold uppercase text-amber-700">Em manutenção</span>
                        ) : owned ? (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold uppercase text-emerald-700">● Ativo</span>
                        ) : soon ? (
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-slate-500">Em breve</span>
                        ) : (
                          <span className="rounded-full bg-[#0094eb]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase text-[#0094eb]">Disponível</span>
                        )}
                        {owned && trial && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                            <Clock className="h-3 w-3" /> Teste: {trial} {trial === 1 ? 'dia' : 'dias'}
                          </span>
                        )}
                      </div>
                    </div>

                    {m.description && <p className="text-sm font-medium leading-relaxed text-slate-600">{m.description}</p>}

                    {owned && m.slug === 'vidlytics' ? (
                      <div className="grid grid-cols-3 gap-2">
                        <Mini label="Vídeos cadastrados" value={int(data.totalVideos)} />
                        <Mini label="Views no período" value={int(data.viewsRange)} />
                        <Mini label="CTR do período" value={pct(data.ctrRange)} />
                      </div>
                    ) : owned ? (
                      <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
                        {trial ? `Em período de teste: ${trial} ${trial === 1 ? 'dia restante' : 'dias restantes'}` : 'Módulo ativo na sua loja.'}
                      </div>
                    ) : (
                      m.benefits.length > 0 && (
                        <ul className="space-y-2">
                          {m.benefits.map((b) => (
                            <li key={b} className="flex items-start gap-2 text-sm font-medium text-slate-700">
                              <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#0094eb]" /> {b}
                            </li>
                          ))}
                        </ul>
                      )
                    )}

                    <div className="mt-auto pt-1">
                      {maint ? (
                        <button type="button" disabled className="inline-flex w-full cursor-not-allowed items-center justify-center rounded-xl bg-slate-200 px-4 py-2.5 text-xs font-bold text-slate-500">
                          Em manutenção
                        </button>
                      ) : owned ? (
                        route ? (
                          <button type="button" onClick={() => navigate(route)} className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#0094eb] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#007fcc]">
                            Acessar painel <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        ) : null
                      ) : soon ? (
                        <button
                          type="button"
                          disabled={isJoined || busySlug === m.slug}
                          onClick={() => onWait(m.slug)}
                          className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold ${
                            isJoined ? 'cursor-default bg-emerald-50 text-emerald-700' : 'cursor-pointer bg-[#0094eb] text-white hover:bg-[#007fcc] disabled:opacity-60'
                          }`}
                        >
                          {isJoined ? <><Check className="h-3.5 w-3.5" /> Você está na lista</> : busySlug === m.slug ? 'Entrando...' : 'Entrar na lista de espera'}
                        </button>
                      ) : (
                        <button type="button" onClick={() => navigate(`/dashboard/planos?modulo=${m.slug}`)} className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#0094eb] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#007fcc]">
                          Ativar módulo <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      )}
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