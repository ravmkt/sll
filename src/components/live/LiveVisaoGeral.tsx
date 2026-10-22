import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Hourglass, CheckCircle2, DollarSign, Clock, Users, Globe, CalendarClock, ArrowRight,
  Eye, MessageSquare, MousePointerClick, Link2, Check, Share2, Radio, Trophy,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { supabaseLiveCommerce as lc } from '@/services/supabaseClients';
import { useLoja } from '@/contexts/LojaContext';
import { getActiveSubscriptions } from '@/services/subscriptions/getStoreSubscriptions';
import VidlyticsAcademy from '@/components/vidlytics/VidlyticsAcademy';
import { LiveOverview } from '@/components/live/LiveOverview';
import type { CommercialDateOccurrence } from '@/lib/commercialDates';

const CLUBE_PATH = '/dashboard/afiliados';

// Nomes dos eventos gravados em live_commerce.live_events (ajuste aqui se forem outros)
const EV = {
  view: ['view', 'live_view'],
  click: ['product_click', 'click'],
  paid: ['purchase', 'order_paid'],
  pending: ['order_pending', 'checkout_started'],
  whatsapp: ['whatsapp_click'],
};

type Periodo = 'today' | '7' | '30' | 'custom';
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

const sectionTitle = 'text-xs font-bold uppercase tracking-wider text-slate-400';
const card = 'bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm';

function Stat(props: { label: string; value: string; sub: string; icon: React.ElementType; tone: string; badge?: string; children?: React.ReactNode }) {
  const Icon = props.icon;
  return (
    <div className={card}>
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
    </div>
  );
}

function Meter(props: { label: string; value: string; of: string; pct: number | null; icon: React.ElementType; foot: string }) {
  const Icon = props.icon;
  return (
    <div className={card}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{props.label}</p>
        <Icon size={15} className="text-[#EA580C]" />
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
            <div className="h-full rounded-full bg-[#EA580C]" style={{ width: `${Math.min(100, props.pct)}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}

export function LiveVisaoGeral({ onCreateLive }: { onCreateLive: (occ: CommercialDateOccurrence) => void }) {
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
  const monthLives = lives.filter((l) => l.started_at && new Date(l.started_at).getTime() >= monthStart);
  const hours = monthLives.reduce((s, l) => {
    if (!l.started_at) return s;
    const end = l.ended_at ? new Date(l.ended_at).getTime() : Date.now();
    return s + Math.max(0, end - new Date(l.started_at).getTime()) / 3600000;
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

  const copyLink = () => {
    const code = (store as any)?.referral_code;
    navigator.clipboard.writeText(code ? `${window.location.origin}/?ref=${code}` : window.location.origin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div className="mx-auto max-w-6xl space-y-8 p-6 pb-4">
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
                    className={`cursor-pointer rounded-md px-3 py-1 text-xs font-semibold transition-colors ${periodo === p.key ? 'bg-[#EA580C] text-white shadow-sm' : 'text-slate-500 hover:text-[#EA580C]'}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Stat label="Aguardando pagamento" badge={`${pendingOrders} pedidos`} value={brl(pendingRevenue)} sub="Pix / Boleto em live" icon={Hourglass} tone="bg-amber-50 text-amber-500" />
            <Stat label="Vendas pagas" badge={`${paidOrders} pedidos`} value={brl(paidRevenue)} sub="Faturamento aprovado" icon={CheckCircle2} tone="bg-emerald-50 text-emerald-500" />
            <Stat label="Faturamento indicações" badge="Comissões" value={brl(0)} sub="" icon={DollarSign} tone="bg-sky-50 text-sky-500">
              <button type="button" onClick={() => navigate(CLUBE_PATH)} className="mt-2 rounded-md bg-sky-500 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-sky-600">
                Acessar o Clube SLL
              </button>
            </Stat>
          </div>
        </div>

        <div>
          <h3 className={`${sectionTitle} mb-3 px-1`}>Consumo do plano</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Meter label="Horas de transmissão" value={`${hours.toFixed(1).replace('.', ',')} h`} of="de —" pct={null} icon={Clock} foot="Neste mês" />
            <Meter label="Pico de espectadores" value={fmtInt(peak)} of="de —" pct={null} icon={Users} foot="Ao vivo" />
            <Meter label="Destinos ativos" value={String(1 + connected.length)} of="conectado(s)" pct={null} icon={Globe} foot={destLabel} />
            <div className={card}>
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Ciclo da conta</p>
                <CalendarClock size={15} className="text-[#EA580C]" />
              </div>
              <p className="mt-2 text-[10px] font-semibold uppercase text-slate-400">Status</p>
              <p className="text-xl font-extrabold text-slate-900">{cycle?.status || '—'}</p>
              <div className="mt-2 border-t border-slate-100 pt-2 text-[11px] text-slate-400">
                {cycle?.label || 'Renovação:'} {cycle?.date || '—'}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className={card}>
            <div className="mb-3 flex items-center gap-2">
              <Radio size={16} className="text-[#EA580C]" />
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-800">Próxima live</h3>
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
                  onClick={() => navigate(`/dashboard/modules/stream-sell/live/${next.id}/cockpit`)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#EA580C] py-2.5 text-xs font-bold text-white hover:bg-[#c2410c]"
                >
                  Abrir Cockpit da Live <ArrowRight size={14} />
                </button>
              </div>
            ) : (
              <div className="py-6 text-center text-sm text-slate-400">
                Nenhuma live agendada.
                <button type="button" onClick={() => navigate('/dashboard/modules/stream-sell', { state: { tab: 'lives' } })} className="mt-2 block w-full text-xs font-bold text-[#EA580C] hover:underline">
                  Criar uma live
                </button>
              </div>
            )}
          </div>

          <div className={card}>
            <div className="mb-3 flex items-center gap-2">
              <Trophy size={16} className="text-[#EA580C]" />
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-800">Engajamento das lives</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { l: 'Visualizações', v: viewsEv, i: Eye },
                { l: 'Mensagens no chat', v: chatCount, i: MessageSquare },
                { l: 'Cliques em produtos', v: clicksEv, i: MousePointerClick },
                { l: 'Cliques no WhatsApp', v: count(EV.whatsapp), i: MessageSquare },
              ].map((m) => (
                <div key={m.l} className="rounded-xl border border-slate-100 p-3">
                  <p className="flex items-center gap-1 text-[10px] font-semibold uppercase text-slate-500"><m.i size={12} />{m.l}</p>
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
          </div>
        </div>

        <div className="rounded-2xl border border-[#EA580C]/50 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold text-[#EA580C]">Clube SLL</h3>
            <Share2 size={16} className="text-slate-300" />
          </div>
          <p className="mt-2 text-xs text-slate-500">Receba comissões e benefícios ao indicar o StreamSell para outros lojistas.</p>
          <button type="button" onClick={copyLink} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#EA580C] py-2.5 text-xs font-bold uppercase text-white hover:bg-[#c2410c]">
            {copied ? <Check size={14} /> : <Link2 size={14} />}
            {copied ? 'Link copiado' : 'Copiar meu link de indicação'}
          </button>
          <button type="button" onClick={() => navigate(CLUBE_PATH)} className="mt-2 block w-full text-center text-[11px] text-slate-500 hover:text-[#EA580C]">
            Acessar painel de indicações →
          </button>
        </div>

        <VidlyticsAcademy />
      </div>

      <LiveOverview onCreateLive={onCreateLive} />
    </>
  );
}

export default LiveVisaoGeral;