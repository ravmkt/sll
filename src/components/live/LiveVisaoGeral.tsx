import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Hourglass, CheckCircle2, DollarSign, Clock, Users, Globe, CalendarClock, ArrowRight,
  Eye, MessageSquare, MousePointerClick, Link2, Check, Share2, Radio, Trophy, Plus, UserPlus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { supabaseLiveCommerce as lc } from '@/services/supabaseClients';
import { useLoja } from '@/contexts/LojaContext';
import { getActiveSubscriptions } from '@/services/subscriptions/getStoreSubscriptions';
import VidlyticsAcademy from '@/components/vidlytics/VidlyticsAcademy';
import { listScopedTips, pickTip, plainText, type ScopedTip } from '@/services/scopedTips';
import { getSeasonalTip, type SeasonalTip } from '@/services/seasonalTips';
import ModuleHeader from '@/components/layout/ModuleHeader';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { CommercialDateOccurrence } from '@/lib/commercialDates';

const CLUBE_PATH = '/dashboard/afiliados';

// Nomes dos eventos gravados em live_commerce.live_events (ajuste aqui se forem outros)
const EV = {
  view: ['view', 'live_view'],
  click: ['product_click', 'click'],
  paid: ['purchase', 'order_paid'],
  pending: ['order_pending', 'checkout_started'],
  signup: ['signup_click', 'group_click', 'whatsapp_click'],
};

type Periodo = 'today' | '7' | '30' | 'custom';

const fmtTempo = (h: number) => {
  const t = Math.round(h * 3600);
  const hh = Math.floor(t / 3600);
  const mm = Math.floor((t % 3600) / 60);
  const ss = t % 60;
  return `${hh}h ${String(mm).padStart(2, '0')}min ${String(ss).padStart(2, '0')}s`;
};
const PERIODOS: { key: Periodo; label: string }[] = [
  { key: 'today', label: 'Hoje' },
  { key: '7', label: '7 dias' },
  { key: '30', label: '30 dias' },
  { key: 'custom', label: 'Personalizado' },
];

interface LiveRow {
  id: string;
  title: string;
  status: string | null;
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  youtube_thumbnail_url: string | null;
  peak_viewers: number | null;
  views_count: number | null;
  featured_product_ids: string[] | null;
}
interface EventRow {
  event_type: string;
  product_id: string | null;
  metadata: Record<string, unknown> | null;
}

interface SaleRow {
  order_id: string | null;
  total: number | null;
  status: string | null;
  module: string | null;
  source_id: string | null;
}

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtInt = (n: number) => (n || 0).toLocaleString('pt-BR');
const money = (e: EventRow) => {
  const md = e.metadata || {};
  return Number((md as any).value ?? (md as any).amount ?? (md as any).total ?? 0) || 0;
};

const sectionTitle = 'text-xl font-bold leading-tight text-slate-900';
const card = 'bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm';

const LIVE_TIPS: Record<number, { title: string; text: string }> = {
  0: { title: 'Liquidação ao vivo', text: 'Faça uma live de início de ano com 3 produtos-chave e um cupom exclusivo para quem assistir até o fim.' },
  1: { title: 'Carnaval e Dia da Mulher', text: 'Apresente kits de festa e de presente ao vivo, mostrando o produto em uso e o preço na tela.' },
  2: { title: 'Dia da Mulher e Páscoa', text: 'Monte uma live de presentes por faixa de preço e fixe o link do produto no chat.' },
  3: { title: 'Aquecimento do Dia das Mães', text: 'Agende a live com antecedência, divulgue por WhatsApp e destaque o prazo de entrega.' },
  4: { title: 'Dia das Mães e Namorados', text: 'Responda dúvidas de presente no chat e use o WhatsApp como apoio para fechar a compra.' },
  5: { title: 'Dia dos Namorados', text: 'Lives curtas de 30 minutos com kits para casais costumam reter mais. Mostre 3 opções por faixa de preço.' },
  6: { title: 'Preparação para o Dia dos Pais', text: 'Programe a live uma semana antes e deixe os produtos do cupom já vinculados à transmissão.' },
  7: { title: 'Dia dos Pais', text: 'Comece a live pelo produto mais vendido e repita o cupom a cada 10 minutos para quem entrou depois.' },
  8: { title: 'Dia do Cliente e Dia das Crianças', text: 'Use o Dia do Cliente para uma live de recompra com oferta só para quem já comprou.' },
  9: { title: 'Dia das Crianças e Black Friday', text: 'Faça uma live-teste de Black Friday agora: treine o cockpit, o chat e a troca de produtos em destaque.' },
  10: { title: 'Black Friday', text: 'Poucos produtos, ofertas claras e contagem regressiva. Avise a data da live com antecedência.' },
  11: { title: 'Natal e Réveillon', text: 'Mostre prazos de entrega ao vivo e priorize produtos de pronta-entrega.' },
};

function Tip({ text, children }: { text?: string; children: React.ReactElement }) {
  if (!text) return children;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="top" className="max-w-[260px] rounded-lg border-0 bg-slate-900 px-3 py-2 text-xs leading-snug text-white shadow-lg">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

function Stat(props: { label: string; value: string; sub: string; icon: React.ElementType; tone: string; badge?: string; tip?: string; children?: React.ReactNode }) {
  const Icon = props.icon;
  return (
    <Tip text={props.tip}><div className={card}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{props.label}</p>
            {props.badge && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">{props.badge}</span>}
          </div>
          <p className="mt-1 text-2xl font-extrabold text-slate-900">{props.value}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">{props.sub}</p>
          {props.children}
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${props.tone}`}>
          <Icon size={18} />
        </div>
      </div>
    </div></Tip>
  );
}

function Meter(props: { label: string; value: string; of: string; pct: number | null; icon: React.ElementType; foot: string; tip?: string }) {
  const Icon = props.icon;
  return (
    <Tip text={props.tip}><div className={card}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{props.label}</p>
        <Icon size={15} className="text-[#DC2626]" />
      </div>
      <p className="mt-2 text-2xl font-extrabold text-slate-900">
        {props.value} <span className="text-xs font-medium text-slate-400">{props.of}</span>
      </p>
      <div className="mt-2 border-t border-slate-100 pt-2">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>{props.foot}</span>
          <span>{props.pct === null ? '—' : `${Math.round(props.pct)}%`}</span>
        </div>
        {props.pct !== null && (
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-[#DC2626]" style={{ width: `${Math.min(100, props.pct)}%` }} />
          </div>
        )}
      </div>
    </div></Tip>
  );
}

export function LiveVisaoGeral(_props: { onCreateLive?: (occ: CommercialDateOccurrence) => void }) {
  const navigate = useNavigate();
  const { storeId, store } = useLoja();

  const [periodo, setPeriodo] = useState<Periodo>('30');
  const [cs, setCs] = useState(() => ymd(new Date(Date.now() - 29 * 86400000)));
  const [ce, setCe] = useState(() => ymd(new Date()));
  const [lives, setLives] = useState<LiveRow[]>([]);
  const [dests, setDests] = useState<{ platform: string; status: string }[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [chatCount, setChatCount] = useState(0);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [cycle, setCycle] = useState<{ status: string; label: string; date: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const { startIso, endIso } = useMemo(() => {
    let s: string;
    const e = periodo === 'custom' ? ce : ymd(new Date());
    if (periodo === 'custom') s = cs;
    else {
      const d = new Date();
      if (periodo !== 'today') d.setDate(d.getDate() - (Number(periodo) - 1));
      s = ymd(d);
    }
    if (!s || !e || s > e) return { startIso: '', endIso: '' };
    return {
      startIso: new Date(`${s}T00:00:00`).toISOString(),
      endIso: new Date(`${e}T23:59:59.999`).toISOString(),
    };
  }, [periodo, cs, ce]);

  useEffect(() => {
    if (!storeId) return;
    let alive = true;
    lc.from('lives')
      .select('id,title,status,scheduled_at,started_at,ended_at,youtube_thumbnail_url,peak_viewers,views_count,featured_product_ids')
      .eq('store_id', storeId)
      .order('scheduled_at', { ascending: true })
      .then(({ data }) => { if (alive) setLives((data || []) as unknown as LiveRow[]); });
    lc.from('live_destinations')
      .select('platform,status')
      .eq('store_id', storeId)
      .then(({ data }) => { if (alive) setDests((data || []) as { platform: string; status: string }[]); });
    return () => { alive = false; };
  }, [storeId]);

  useEffect(() => {
    if (!storeId || !startIso) return;
    let alive = true;
    lc.from('live_events')
      .select('event_type,product_id,metadata')
      .eq('store_id', storeId)
      .gte('created_at', startIso)
      .lte('created_at', endIso)
      .limit(5000)
      .then(({ data }) => { if (alive) setEvents((data || []) as unknown as EventRow[]); });
    lc.from('live_chat_messages')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', storeId)
      .gte('created_at', startIso)
      .lte('created_at', endIso)
      .then(({ count }) => { if (alive) setChatCount(count ?? 0); });
    supabase
      .from('sll_conversions')
      .select('order_id,total,status,module,source_id')
      .eq('store_id', storeId)
      .gte('created_at', startIso)
      .lte('created_at', endIso)
      .limit(5000)
      .then(({ data }) => { if (alive) setSales((data || []) as unknown as SaleRow[]); });
    return () => { alive = false; };
  }, [storeId, startIso, endIso]);

  useEffect(() => {
    if (!storeId) return;
    let alive = true;
    const st = store as any;
    getActiveSubscriptions(storeId)
      .then((subs: any[]) => {
        if (!alive) return;
        const sub = (subs || []).find((s) => s.module_key === 'live_commerce' || (s.plan?.modules ?? []).includes('live_commerce'));
        if (sub) {
          const map: Record<string, string> = { active: 'Ativo', trialing: 'Período de teste', past_due: 'Em atraso', canceled: 'Cancelado' };
          setCycle({
            status: map[String(sub.status)] || 'Ativo',
            label: 'Renovação:',
            date: sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString('pt-BR') : '—',
          });
          return;
        }
        const trialEnd = st?.trial_ends_at ? new Date(st.trial_ends_at) : null;
        if (trialEnd && trialEnd.getTime() > Date.now()) setCycle({ status: 'Período de teste', label: 'Teste até:', date: trialEnd.toLocaleDateString('pt-BR') });
        else setCycle({ status: 'Sem assinatura ativa', label: 'Renovação:', date: '—' });
      })
      .catch(() => { if (alive) setCycle({ status: '—', label: 'Renovação:', date: '—' }); });
    return () => { alive = false; };
  }, [storeId, store]);

  const count = (types: string[]) => events.filter((e) => types.includes(e.event_type)).length;
  const sum = (types: string[]) => events.filter((e) => types.includes(e.event_type)).reduce((s, e) => s + money(e), 0);
  const liveIds = new Set(lives.map((l) => l.id));
  const liveSales = sales.filter((s) => liveIds.has(String(s.source_id || '').replace(/^live_/, '')) || ['live_commerce', 'stream_sell'].includes(String(s.module || '')));
  const paidSales = liveSales.filter((s) => s.status === 'paid');
  const pendingSales = liveSales.filter((s) => s.status === 'pending');
  const salesSum = (rows: SaleRow[]) => rows.reduce((t, s) => t + Number(s.total || 0), 0);
  const paidRevenue = paidSales.length ? salesSum(paidSales) : sum(EV.paid);
  const paidOrders = paidSales.length || count(EV.paid);
  const pendingRevenue = pendingSales.length ? salesSum(pendingSales) : sum(EV.pending);
  const pendingOrders = pendingSales.length || count(EV.pending);
  const viewsEv = count(EV.view);
  const clicksEv = count(EV.click);

  const topProducts = useMemo(() => {
    const acc = new Map<string, number>();
    events.filter((e) => EV.click.includes(e.event_type)).forEach((e) => {
      const pid = e.product_id || String((e.metadata as any)?.product_id || '');
      if (pid) acc.set(pid, (acc.get(pid) || 0) + 1);
    });
    return [...acc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [events]);

  useEffect(() => {
    const ids = topProducts.map(([id]) => id).filter((id) => !names[id]);
    if (!ids.length) return;
    let alive = true;
    supabase.from('products').select('id,name').in('id', ids).then(({ data }) => {
      if (!alive || !data) return;
      setNames((prev) => ({ ...prev, ...Object.fromEntries((data as any[]).map((p) => [p.id, p.name])) }));
    });
    return () => { alive = false; };
  }, [topProducts, names]);

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const fromMs = (() => {
    if (periodo === 'custom' && cs) return new Date(String(cs).slice(0, 10) + 'T00:00:00').getTime();
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    if (periodo !== 'today' && periodo !== 'custom') d.setDate(d.getDate() - (Number(periodo) - 1));
    return d.getTime();
  })();
  const toMs = periodo === 'custom' && ce ? new Date(String(ce).slice(0, 10) + 'T23:59:59.999').getTime() : Date.now();
  const periodLives = lives.filter((l) => {
    if (!l.started_at) return false;
    const st = new Date(l.started_at).getTime();
    const en = l.ended_at ? new Date(l.ended_at).getTime() : Date.now();
    return st <= toMs && en >= fromMs;
  });
  void monthStart;
  const hours = periodLives.reduce((s, l) => {
    if (!l.started_at) return s;
    const end = l.ended_at ? new Date(l.ended_at).getTime() : Date.now();
    const stClip = Math.max(new Date(l.started_at).getTime(), fromMs);
    return s + Math.max(0, Math.min(end, toMs) - stClip) / 3600000;
  }, 0);
  const peak = lives.reduce((m, l) => Math.max(m, l.peak_viewers || 0), 0);
  const connected = dests.filter((d) => d.status === 'connected').map((d) => d.platform);
  const destLabel = ['Site', ...connected.map((p) => p.charAt(0).toUpperCase() + p.slice(1))].join(', ');

  const next = useMemo(() => {
    const now = Date.now();
    const onAir = lives.find((l) => l.status === 'live');
    if (onAir) return onAir;
    return lives.find((l) => l.status === 'scheduled' && l.scheduled_at && new Date(l.scheduled_at).getTime() >= now - 3600000) || null;
  }, [lives]);

  const [liveTips, setLiveTips] = useState<ScopedTip[]>([]);
  const [sectorId, setSectorId] = useState<string | null | undefined>((store as any)?.sector_id);
  const [seasonal, setSeasonal] = useState<SeasonalTip | null>(null);

  useEffect(() => {
    let alive = true;
    listScopedTips('live_commerce').then((l) => { if (alive) setLiveTips(l); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const sid = (store as any)?.sector_id;
    if (sid !== undefined) { setSectorId(sid); return; }
    if (!storeId) return;
    let alive = true;
    supabase.from('stores').select('sector_id').eq('id', storeId).maybeSingle()
      .then(({ data }) => { if (alive) setSectorId(((data as any)?.sector_id as string | null) ?? null); });
    return () => { alive = false; };
  }, [store, storeId]);

  useEffect(() => {
    if (!storeId || sectorId === undefined) return;
    let alive = true;
    getSeasonalTip(sectorId, 'live_commerce').then((s) => { if (alive) setSeasonal(s); });
    return () => { alive = false; };
  }, [storeId, sectorId]);

  const liveTip = pickTip(liveTips, { sectorId, niche: String((store as any)?.store_niche || '') }, {
    views: viewsEv, clicks: clicksEv, ctr: viewsEv > 0 ? (clicksEv / viewsEv) * 100 : 0,
  }, 0);
  const noahTip = seasonal
    ? { title: seasonal.title, text: seasonal.text }
    : liveTip
      ? { title: liveTip.title, text: plainText(liveTip.content) }
      : LIVE_TIPS[new Date().getMonth()];

  const copyLink = () => {
    const code = (store as any)?.referral_code;
    navigator.clipboard.writeText(code ? `${window.location.origin}/?ref=${code}` : window.location.origin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div className="mx-auto max-w-7xl space-y-6 p-6 pb-4">
        <ModuleHeader module="live" />
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-1">
            <h3 className={sectionTitle}>Faturamento das lives</h3>
            <div className="flex flex-wrap items-center gap-2">
              {periodo === 'custom' && (
                <>
                  <input type="date" value={cs} max={ce} onChange={(e) => setCs(e.target.value)} className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700" />
                  <span className="text-xs text-slate-400">até</span>
                  <input type="date" value={ce} min={cs} onChange={(e) => setCe(e.target.value)} className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700" />
                </>
              )}
              <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
                {PERIODOS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setPeriodo(p.key)}
                    className={`cursor-pointer rounded-md px-3 py-1 text-xs font-semibold transition-colors ${periodo === p.key ? 'bg-[#DC2626] text-white shadow-sm' : 'text-slate-500 hover:text-[#DC2626]'}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Stat label="Aguardando pagamento" badge={`${pendingOrders} pedidos`} value={brl(pendingRevenue)} sub="Pix / Boleto em live" icon={Hourglass} tone="bg-red-50 text-[#DC2626]" tip={"Pedidos gerados nas lives (Pix ou boleto) que ainda aguardam a confirma\u00e7\u00e3o do pagamento."} />
            <Stat label="Vendas pagas" badge={`${paidOrders} pedidos`} value={brl(paidRevenue)} sub="Faturamento aprovado" icon={CheckCircle2} tone="bg-red-50 text-[#DC2626]" tip={"Pedidos das lives com pagamento aprovado no per\u00edodo selecionado."} />
            <Stat label="Faturamento indicações" badge="Comissões" value={brl(0)} sub="" icon={DollarSign} tone="bg-red-50 text-[#DC2626]" tip={"Comiss\u00f5es recebidas de lojistas que voc\u00ea indicou pelo Clube SLL."}>
              <button type="button" onClick={() => navigate(CLUBE_PATH)} className="mt-2 cursor-pointer rounded-md bg-[#DC2626] px-2.5 py-1 text-[11px] font-bold text-white transition-colors hover:bg-[#B91C1C]">
                Acessar o Clube SLL
              </button>
            </Stat>
          </div>
        </div>

        <div>
          <h3 className={`${sectionTitle} mb-3 px-1`}>Consumo do plano</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Meter label={"Tempo de transmiss\u00e3o"} value={fmtTempo(hours)} of="" pct={null} icon={Clock} tip={"Tempo total transmitido ao vivo no per\u00edodo selecionado."} foot={periodo === 'today' ? 'Hoje' : periodo === '7' ? '\u00daltimos 7 dias' : periodo === '30' ? '\u00daltimos 30 dias' : String(cs).slice(0, 10).split('-').reverse().join('/') + ' a ' + String(ce).slice(0, 10).split('-').reverse().join('/')} />
            <Meter label="Pico de espectadores" value={fmtInt(peak)} of="de —" pct={null} icon={Users} tip={"Maior n\u00famero de espectadores simult\u00e2neos j\u00e1 registrado em uma live."} foot="Ao vivo" />
            <Meter label="Destinos ativos" value={String(1 + connected.length)} of="conectado(s)" pct={null} icon={Globe} tip={"Canais onde suas lives s\u00e3o exibidas: seu site e as plataformas conectadas."} foot={destLabel} />
            <Tip text={"Situa\u00e7\u00e3o da assinatura do m\u00f3dulo e a data da pr\u00f3xima renova\u00e7\u00e3o."}><div className={card}>
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Ciclo da conta</p>
                <CalendarClock size={15} className="text-[#DC2626]" />
              </div>
              <p className="mt-2 text-[10px] font-semibold uppercase text-slate-400">Status</p>
              <p className="text-xl font-extrabold text-slate-900">{cycle?.status || '—'}</p>
              <div className="mt-2 border-t border-slate-100 pt-2 text-[11px] text-slate-400">
                {cycle?.label || 'Renovação:'} {cycle?.date || '—'}
              </div>
            </div></Tip>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Tip text={"Live ao vivo ou a pr\u00f3xima agendada, com atalho para abrir o Est\u00fadio."}><div className={card}>
            <div className="mb-3 flex items-center gap-2">
              <Radio size={16} className="text-[#DC2626]" />
              <h3 className="text-base font-black text-slate-900">Próxima live</h3>
            </div>
            {next ? (
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="flex h-20 w-32 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                    {next.youtube_thumbnail_url ? (
                      <img src={next.youtube_thumbnail_url} alt={next.title} className="h-full w-full object-cover" />
                    ) : (
                      <Radio className="text-slate-300" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${next.status === 'live' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-700'}`}>
                      {next.status === 'live' ? 'Ao vivo' : 'Agendada'}
                    </span>
                    <p className="mt-1 truncate text-sm font-bold text-slate-900">{next.title}</p>
                    {next.scheduled_at && (
                      <p className="text-xs text-slate-500">
                        {new Date(next.scheduled_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                    <p className="text-xs text-slate-400">{(next.featured_product_ids || []).length} produto(s) vinculado(s)</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/dashboard/modules/stream-sell/live/${next.id}/estudio`)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#DC2626] py-2.5 text-xs font-bold text-white hover:bg-[#B91C1C]"
                >
                  Abrir Estúdio da Live <ArrowRight size={14} />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <p className="text-sm text-slate-400">Nenhuma live agendada.</p>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new Event('live:go-create'))}
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#DC2626] px-8 py-3 text-sm font-bold text-white shadow-md shadow-red-200 transition hover:bg-[#B91C1C] active:scale-[0.98]"
                >
                  <Plus size={16} /> Criar live
                </button>
              </div>
            )}
          </div></Tip>

          <Tip text={"Visualiza\u00e7\u00f5es, mensagens e cliques gerados pelas suas lives no per\u00edodo."}><div className={card}>
            <div className="mb-3 flex items-center gap-2">
              <Trophy size={16} className="text-[#DC2626]" />
              <h3 className="text-base font-black text-slate-900">Engajamento das lives</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { l: 'Visualizações', v: viewsEv, i: Eye },
                { l: 'Mensagens no chat', v: chatCount, i: MessageSquare },
                { l: 'Cliques em produtos', v: clicksEv, i: MousePointerClick },
                { l: 'Cliques em cadastro/grupo', v: count(EV.signup), i: UserPlus },
              ].map((m) => (
                <div key={m.l} className="rounded-xl border border-slate-100 p-3">
                  <p className="flex items-center gap-1 text-[10px] font-semibold uppercase text-slate-500"><m.i size={12} className="text-[#DC2626]" />{m.l}</p>
                  <p className="mt-1 text-xl font-extrabold text-slate-900">{fmtInt(m.v)}</p>
                </div>
              ))}
            </div>
            <p className="mb-1 mt-4 text-[11px] font-bold uppercase tracking-wide text-slate-500">Produtos mais clicados</p>
            {topProducts.length === 0 ? (
              <p className="text-xs text-slate-400">Nenhum clique registrado no período.</p>
            ) : (
              <ol className="space-y-1">
                {topProducts.map(([id, n], i) => (
                  <li key={id} className="flex items-center justify-between text-xs text-slate-700">
                    <span className="truncate">{i + 1}. {names[id] || 'Produto'}</span>
                    <span className="font-bold text-slate-900">{fmtInt(n)}</span>
                  </li>
                ))}
              </ol>
            )}
          </div></Tip>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="flex h-full flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <img src="/assets/dica-do-noah-logo-wide.png" alt="Dica do Noah" className="h-auto w-[180px] shrink-0 object-contain object-left" />
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-800">{noahTip.title}</p>
              <p className="mt-1 text-sm font-medium leading-relaxed text-slate-700">{noahTip.text}</p>
            </div>
          </div>

          <div className="flex h-full flex-col justify-between space-y-4 rounded-2xl border border-[#DC2626]/60 bg-white p-5 shadow-sm transition-all hover:border-[#DC2626]">
            <div className="flex items-center justify-between">
              <img src="/assets/clube-sll-logo-wide.png" alt="Clube SLL" className="h-auto w-[140px] shrink-0 object-contain object-left" />
              <Share2 className="h-4 w-4 text-slate-400" />
            </div>
            <p className="text-xs leading-relaxed text-slate-500">
              Receba comissões e benefícios ao indicar o StreamSell para outros lojistas.
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={copyLink}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#DC2626] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#B91C1C] active:scale-[0.99]"
              >
                {copied ? (<><Check className="h-4 w-4" />LINK COPIADO!</>) : (<><Link2 className="h-4 w-4" />COPIAR MEU LINK DE INDICAÇÃO</>)}
              </button>
              <div className="text-center">
                <a
                  href={CLUBE_PATH}
                  onClick={(e) => { e.preventDefault(); navigate(CLUBE_PATH); }}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 transition-colors hover:text-[#DC2626]"
                >
                  Acessar painel de indicações →
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full [&>*]:!w-full [&>*]:!max-w-none">
          <VidlyticsAcademy variant="vidlytics" />
        </div>
      </div>
    </TooltipProvider>
  );
}

export default LiveVisaoGeral;