import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Loader2, Package, Radio, Square, Tag, Activity, Gift,
  Eye, TrendingUp, MessageSquare, Send, Clock, Signal,
} from 'lucide-react';
import { useLiveCockpit } from '@/hooks/useLiveCockpit';
import {
  addCoupon, getStudioInfo, getStudioStats, listStudioChat, sendStudioChat,
  setAdvantageActive, setCouponActive, setLiveStatus, setProductOnAir,
} from '@/services/streamSell/streamSellService';
import type { StudioChatMessage, StudioInfo } from '@/services/streamSell/streamSellService';

const EVENT_LABEL: Record<string, string> = {
  'live.start': 'Live iniciada', 'live.end': 'Live encerrada',
  'product.show': 'Produto no ar', 'product.hide': 'Produto retirado',
  'coupon.activate': 'Cupom ativado', 'coupon.deactivate': 'Cupom desativado',
  'advantage.activate': 'Benef\u00edcio no ar', 'advantage.deactivate': 'Benef\u00edcio retirado',
  'banner.show': 'Banner no ar', 'banner.hide': 'Banner retirado',
  product_click: 'Clique em produto', view: 'Visualiza\u00e7\u00e3o', page_view: 'Visualiza\u00e7\u00e3o',
};
const brl = (v: number | null) =>
  v == null ? '' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

type Level = 'ok' | 'warn' | 'bad' | 'off';
const DOT: Record<Level, string> = {
  ok: 'bg-emerald-500', warn: 'bg-amber-400', bad: 'bg-rose-500', off: 'bg-slate-300',
};
const p2 = (n: number) => String(n).padStart(2, '0');
function fmtDur(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${p2(Math.floor(s / 3600))}:${p2(Math.floor((s % 3600) / 60))}:${p2(s % 60)}`;
}
function ytId(i: StudioInfo | null) {
  if (!i) return '';
  if (i.youtube_video_id) return String(i.youtube_video_id);
  const m = /(?:v=|youtu\.be\/|embed\/|live\/)([\w-]{11})/.exec(i.youtube_url || '');
  return m ? m[1] : '';
}

function Metric({ icon, label, value, level, children }: {
  icon: ReactNode; label: string; value: string; level: Level; children?: ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-3">
      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
        <span className="flex items-center gap-1.5">{icon}{label}</span>
        <span className={`w-2.5 h-2.5 rounded-full ${DOT[level]}`} />
      </div>
      <p className="text-xl font-extrabold text-slate-900 mt-1 leading-none">{value}</p>
      {children}
    </div>
  );
}

function Spark({ points }: { points: number[] }) {
  if (points.length < 2) return <p className="text-[10px] text-slate-400 mt-1">Coletando...</p>;
  const w = 160, h = 36, max = Math.max(...points, 1);
  const d = points
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${(i / (points.length - 1)) * w},${h - (v / max) * (h - 4) - 2}`)
    .join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-9 mt-1">
      <path d={d} fill="none" stroke="#e11d48" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

export default function LiveEstudio() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, events, loading, error, reload } = useLiveCockpit(id);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [percent, setPercent] = useState('10');
  const [info, setInfo] = useState<StudioInfo | null>(null);
  const [stats, setStats] = useState({ current: 0, peak: 0 });
  const [series, setSeries] = useState<number[]>([]);
  const [chat, setChat] = useState<StudioChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [now, setNow] = useState(Date.now());
  const chatBox = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    getStudioInfo(id).then(setInfo).catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    const tick = async () => {
      try {
        const s = await getStudioStats(id);
        if (!alive) return;
        setStats(s);
        setSeries((p) => [...p, s.current].slice(-60));
      } catch (_e) { /* mantem o ultimo valor */ }
    };
    tick();
    const t = setInterval(tick, 10000);
    return () => { alive = false; clearInterval(t); };
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    const load = () => listStudioChat(id).then((r) => { if (alive) setChat(r); }).catch(() => {});
    load();
    const t = setInterval(load, 3000);
    return () => { alive = false; clearInterval(t); };
  }, [id]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const el = chatBox.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat.length]);

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    setMsg(null);
    try {
      await fn();
      await reload();
    } catch (e: any) {
      setMsg(e?.message ?? 'Falha na a\u00e7\u00e3o');
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  }
  if (error || !data) {
    return <div className="p-6 text-sm text-rose-600">{error ?? 'Live n\u00e3o encontrada.'}</div>;
  }

  const { live, products, coupons } = data;
  const isLive = live.status === 'live';
  const finished = live.status === 'finished' || live.status === 'ended';

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    setMsg(null);
    try {
      await sendStudioChat(live.id, text);
      setText('');
      setChat(await listStudioChat(live.id));
    } catch (err: any) {
      setMsg(err?.message ?? 'Falha ao enviar a mensagem');
    } finally {
      setSending(false);
    }
  };

  const startMs = info?.started_at ? new Date(info.started_at).getTime() : 0;
  const dur = isLive && startMs ? fmtDur(now - startMs) : '--:--:--';
  const recent = series.slice(-30);
  const top = Math.max(0, ...recent);
  const drop = isLive && top >= 5 ? 1 - stats.current / top : 0;
  const trend: Level = !isLive ? 'off' : drop >= 0.5 ? 'bad' : drop >= 0.2 ? 'warn' : 'ok';
  const trendText = !isLive ? '--' : drop >= 0.05 ? `-${Math.round(drop * 100)}%` : 'Est\u00e1vel';
  const perMin = chat.filter((m) => !m.is_from_store && now - new Date(m.created_at).getTime() < 60000).length;
  const chatLevel: Level = !isLive ? 'off' : perMin > 0 ? 'ok' : 'warn';
  const viewLevel: Level = !isLive ? 'off' : stats.current > 0 ? 'ok' : 'warn';
  const vid = ytId(info);

  const onAir = products.find((p) => p.isOnAir) ?? null;
  const activeCoupon = coupons.find((c) => c.isActive) ?? null;
  const activeAdv = live.activeAdvantageIdx != null ? live.advantages[live.activeAdvantageIdx] : null;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button type="button" onClick={() => navigate('/dashboard/modules/stream-sell')} className="p-2 rounded-lg hover:bg-slate-100">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{"Est\u00fadio da Live"}</p>
            <h1 className="text-base font-bold text-slate-900 truncate">{live.title}</h1>
            <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
              isLive ? 'bg-rose-100 text-rose-600' : finished ? 'bg-slate-100 text-slate-500' : 'bg-amber-100 text-amber-700'
            }`}>
              <Radio className="w-3 h-3" />{isLive ? 'AO VIVO' : finished ? 'Encerrada' : 'Agendada'}
            </span>
          </div>
        </div>
        {!finished && (
          <button
            type="button"
            disabled={busy === 'status'}
            onClick={() => run('status', () => setLiveStatus(live, isLive ? 'finished' : 'live'))}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-60 ${
              isLive ? 'bg-slate-800 hover:bg-slate-900' : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            {busy === 'status' ? <Loader2 className="w-4 h-4 animate-spin" /> : isLive ? <Square className="w-4 h-4" /> : <Radio className="w-4 h-4" />}
            {isLive ? 'Encerrar live' : 'Iniciar live'}
          </button>
        )}
      </div>

      {msg && <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">{msg}</p>}

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <Metric icon={<Eye className="w-3.5 h-3.5" />} label="Espectadores agora" value={String(stats.current)} level={viewLevel} />
        <Metric icon={<TrendingUp className="w-3.5 h-3.5" />} label={"Tend\u00eancia"} value={trendText} level={trend}>
          <Spark points={series} />
        </Metric>
        <Metric icon={<Activity className="w-3.5 h-3.5" />} label="Pico" value={String(stats.peak)} level={isLive ? 'ok' : 'off'} />
        <Metric icon={<MessageSquare className="w-3.5 h-3.5" />} label="Mensagens/min" value={String(perMin)} level={chatLevel} />
        <Metric icon={<Clock className="w-3.5 h-3.5" />} label="Tempo no ar" value={dur} level={isLive ? 'ok' : 'off'} />
      </div>
      <div className="flex items-center gap-2 text-[11px] text-slate-400">
        <Signal className="w-3.5 h-3.5" />
        <span>{"Sinal (bitrate e atraso): indispon\u00edvel at\u00e9 conectar a API do YouTube."}</span>
        <span className="ml-auto flex items-center gap-2">
          <i className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />ok
          <i className="w-2 h-2 rounded-full bg-amber-400 inline-block" />{"aten\u00e7\u00e3o"}
          <i className="w-2 h-2 rounded-full bg-rose-500 inline-block" />{"cr\u00edtico"}
        </span>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-5 space-y-3">
          <div className="bg-black rounded-2xl overflow-hidden aspect-video flex items-center justify-center">
            {vid ? (
              <iframe
                title="Player da live"
                className="w-full h-full"
                src={`https://www.youtube.com/embed/${encodeURIComponent(vid)}?autoplay=1&mute=1&rel=0&modestbranding=1`}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <p className="text-xs text-slate-400 px-4 text-center">{"Esta live n\u00e3o tem v\u00eddeo do YouTube vinculado."}</p>
            )}
          </div>
          <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
            <h2 className="text-sm font-bold">No ar agora</h2>
            <div className="grid gap-2 sm:grid-cols-3 text-xs">
              <div className={`rounded-xl border p-2 ${onAir ? 'border-emerald-400 bg-emerald-50' : 'border-slate-100'}`}>
                <p className="text-[10px] font-bold uppercase text-slate-400">Produto</p>
                <p className="font-semibold truncate">{onAir ? onAir.name : 'Nenhum'}</p>
                {onAir && <p className="text-[11px] text-slate-500">{brl(onAir.price)}</p>}
              </div>
              <div className={`rounded-xl border p-2 ${activeCoupon ? 'border-emerald-400 bg-emerald-50' : 'border-slate-100'}`}>
                <p className="text-[10px] font-bold uppercase text-slate-400">Cupom</p>
                <p className="font-semibold truncate">{activeCoupon ? activeCoupon.code : 'Nenhum'}</p>
                {activeCoupon && <p className="text-[11px] text-slate-500">{activeCoupon.discountPercent ?? 0}% OFF</p>}
              </div>
              <div className={`rounded-xl border p-2 ${activeAdv ? 'border-emerald-400 bg-emerald-50' : 'border-slate-100'}`}>
                <p className="text-[10px] font-bold uppercase text-slate-400">{"Benef\u00edcio"}</p>
                <p className="font-semibold truncate">{activeAdv ? activeAdv.title : 'Nenhum'}</p>
                {activeAdv && <p className="text-[11px] text-slate-500 truncate">{activeAdv.description}</p>}
              </div>
            </div>
          </section>
        </div>

        <div className="xl:col-span-4 space-y-4">
          <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <h2 className="text-sm font-bold flex items-center gap-2"><Package className="w-4 h-4" />Produtos</h2>
            {products.length === 0 && <p className="text-xs text-slate-400">Nenhum produto vinculado a esta live.</p>}
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {products.map((p) => (
                <div key={p.id} className={`flex items-center gap-3 p-2 rounded-xl border ${p.isOnAir ? 'border-emerald-400 bg-emerald-50' : 'border-slate-100'}`}>
                  <span className="w-7 h-7 shrink-0 rounded-lg bg-slate-900 text-white text-xs font-bold flex items-center justify-center">{p.code ?? '-'}</span>
                  {p.image && <img src={p.image} alt="" className="w-10 h-10 rounded-lg object-cover" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold truncate">{p.name}</p>
                    <p className="text-[11px] text-slate-500">{brl(p.price)}</p>
                  </div>
                  <button
                    type="button"
                    disabled={!!busy}
                    onClick={() => run(`p-${p.id}`, () => setProductOnAir(live, p.isOnAir ? null : p))}
                    className={`text-[11px] font-bold px-3 py-1.5 rounded-lg disabled:opacity-60 ${
                      p.isOnAir ? 'bg-slate-800 text-white' : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                  >
                    {busy === `p-${p.id}` ? '...' : p.isOnAir ? 'Tirar do ar' : 'Colocar no ar'}
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <h2 className="text-sm font-bold flex items-center gap-2"><Tag className="w-4 h-4" />Cupons</h2>
            {coupons.length === 0 && <p className="text-xs text-slate-400">Nenhum cupom. Crie um abaixo.</p>}
            {coupons.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-2 p-2 rounded-xl border border-slate-100">
                <div>
                  <p className="text-xs font-bold">{c.code}</p>
                  <p className="text-[11px] text-slate-500">{c.discountPercent ?? 0}% {"\u00b7"} usos {c.usedCount}{c.maxUses ? `/${c.maxUses}` : ''}</p>
                </div>
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() => run(`c-${c.id}`, () => setCouponActive(live, c, !c.isActive))}
                  className={`text-[11px] font-bold px-3 py-1.5 rounded-lg disabled:opacity-60 ${
                    c.isActive ? 'bg-slate-800 text-white' : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  {c.isActive ? 'Desativar' : 'Ativar'}
                </button>
              </div>
            ))}
            <form
              className="flex gap-2 pt-1"
              onSubmit={(e) => {
                e.preventDefault();
                run('add-coupon', async () => { await addCoupon(live, code, Number(percent)); setCode(''); });
              }}
            >
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder={"C\u00d3DIGO"} className="min-w-0 flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-xs uppercase" />
              <input value={percent} onChange={(e) => setPercent(e.target.value)} type="number" min={1} max={100} className="w-16 border border-slate-200 rounded-lg px-2 py-1.5 text-xs" />
              <button type="submit" disabled={!!busy} className="text-[11px] font-bold px-3 rounded-lg bg-slate-900 text-white disabled:opacity-60">Criar</button>
            </form>
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <h2 className="text-sm font-bold flex items-center gap-2"><Gift className="w-4 h-4" />{"Benef\u00edcios"}</h2>
            {live.advantages.length === 0 && <p className="text-xs text-slate-400">{"Nenhum benef\u00edcio cadastrado nesta live."}</p>}
            {live.advantages.map((a, i) => {
              const on = live.activeAdvantageIdx === i;
              return (
                <div key={a.id} className={`flex items-center justify-between gap-2 p-2 rounded-xl border ${on ? 'border-emerald-400 bg-emerald-50' : 'border-slate-100'}`}>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">{a.title}</p>
                    <p className="text-[11px] text-slate-500 truncate">{a.description}</p>
                  </div>
                  <button
                    type="button"
                    disabled={!!busy}
                    onClick={() => run(`a-${a.id}`, () => setAdvantageActive(live, on ? null : i))}
                    className={`text-[11px] font-bold px-3 py-1.5 rounded-lg disabled:opacity-60 ${
                      on ? 'bg-slate-800 text-white' : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                  >
                    {busy === `a-${a.id}` ? '...' : on ? 'Tirar do ar' : 'Ativar'}
                  </button>
                </div>
              );
            })}
          </section>
        </div>

        <div className="xl:col-span-3 space-y-4">
          <section className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col">
            <h2 className="text-sm font-bold flex items-center gap-2 mb-3"><MessageSquare className="w-4 h-4" />Chat da live</h2>
            <div ref={chatBox} className="h-80 overflow-y-auto space-y-1.5 pr-1">
              {chat.length === 0 && <p className="text-xs text-slate-400">Nenhuma mensagem ainda.</p>}
              {chat.map((m) => (
                <div key={m.id} className={`max-w-[90%] rounded-xl px-3 py-1.5 text-xs break-words ${
                  m.is_from_store ? 'ml-auto bg-sky-600 text-white' : 'bg-slate-100 text-slate-800'
                }`}>
                  <b className={`block text-[10px] ${m.is_from_store ? 'text-sky-100' : 'text-slate-500'}`}>{m.author_name || 'Visitante'}</b>
                  {m.message}
                </div>
              ))}
            </div>
            <form onSubmit={send} className="flex gap-2 pt-3">
              <input
                value={text}
                maxLength={500}
                onChange={(e) => setText(e.target.value)}
                placeholder="Responder como loja..."
                className="min-w-0 flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-xs"
              />
              <button type="submit" disabled={sending || !text.trim()} className="px-3 rounded-lg bg-sky-600 text-white disabled:opacity-60">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <h2 className="text-sm font-bold flex items-center gap-2"><Activity className="w-4 h-4" />Eventos em tempo real</h2>
            {events.length === 0 && <p className="text-xs text-slate-400">Aguardando eventos...</p>}
            <ul className="space-y-1.5 max-h-72 overflow-y-auto">
              {events.map((e) => (
                <li key={e.id} className="flex items-center justify-between text-xs border-b border-slate-50 pb-1.5">
                  <span className="font-medium text-slate-700">{EVENT_LABEL[e.event_type] ?? e.event_type}</span>
                  <span className="text-[11px] text-slate-400">{new Date(e.created_at).toLocaleTimeString('pt-BR')}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}