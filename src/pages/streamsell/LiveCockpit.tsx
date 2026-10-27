import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Loader2, Package, Radio, Square, Tag, Activity, Gift,
  Eye, TrendingUp, MessageSquare, Send, Clock, Signal,
} from 'lucide-react';
import { useLiveCockpit } from '@/hooks/useLiveCockpit';
import {
  addAdvantage, addCoupon, getStudioInfo, getStudioStats, listStudioChat, sendStudioChat,
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

function Chip({ icon, label, value, level, children }: {
  icon: ReactNode; label: string; value: string; level: Level; children?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 px-3 py-1.5 min-w-0">
      <span className={`w-2 h-2 rounded-full shrink-0 ${DOT[level]}`} />
      <span className="text-slate-400 shrink-0">{icon}</span>
      <span className="text-[11px] text-slate-500 truncate">{label}</span>
      <span className="text-sm font-extrabold text-slate-900 ml-auto">{value}</span>
      {children}
    </div>
  );
}

function Spark({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const w = 56, h = 18, max = Math.max(...points, 1);
  const d = points
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${(i / (points.length - 1)) * w},${h - (v / max) * (h - 3) - 1.5}`)
    .join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-14 h-[18px] shrink-0">
      <path d={d} fill="none" stroke="#e11d48" strokeWidth="1.8" strokeLinejoin="round" />
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
  const [advTitle, setAdvTitle] = useState('');
  const [advDesc, setAdvDesc] = useState('');
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

  const card = 'bg-white rounded-2xl border border-slate-200 p-3';
  const input = 'min-w-0 border border-slate-200 rounded-lg px-2 py-1.5 text-xs';

  return (
    <div className="p-3 md:p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button type="button" onClick={() => navigate('/dashboard/modules/stream-sell')} className="p-2 rounded-lg hover:bg-slate-100">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0 flex items-center gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{"Est\u00fadio da Live"}</p>
              <h1 className="text-base font-bold text-slate-900 truncate">{live.title}</h1>
            </div>
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

      <div className="grid gap-2 grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        <Chip icon={<Eye className="w-3.5 h-3.5" />} label="Agora" value={String(stats.current)} level={viewLevel} />
        <Chip icon={<TrendingUp className="w-3.5 h-3.5" />} label={"Tend\u00eancia"} value={trendText} level={trend}>
          <Spark points={series} />
        </Chip>
        <Chip icon={<Activity className="w-3.5 h-3.5" />} label="Pico" value={String(stats.peak)} level={isLive ? 'ok' : 'off'} />
        <Chip icon={<MessageSquare className="w-3.5 h-3.5" />} label="Msgs/min" value={String(perMin)} level={chatLevel} />
        <Chip icon={<Clock className="w-3.5 h-3.5" />} label="No ar" value={dur} level={isLive ? 'ok' : 'off'} />
      </div>
      <div className="flex items-center gap-2 text-[10px] text-slate-400">
        <Signal className="w-3 h-3" />
        <span>{"Sinal (bitrate e atraso) indispon\u00edvel at\u00e9 conectar a API do YouTube."}</span>
        <span className="ml-auto flex items-center gap-2">
          <i className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />ok
          <i className="w-2 h-2 rounded-full bg-amber-400 inline-block" />{"aten\u00e7\u00e3o"}
          <i className="w-2 h-2 rounded-full bg-rose-500 inline-block" />{"cr\u00edtico"}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_minmax(0,1.05fr)] items-start">
        <div className="space-y-3">
          <div className="bg-black rounded-2xl overflow-hidden aspect-[9/16] w-full max-w-[340px] mx-auto flex items-center justify-center">
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
          <section className={`${card} space-y-1.5 max-w-[340px] mx-auto`}>
            <h2 className="text-xs font-bold">No ar agora</h2>
            <div className="text-[11px] space-y-1">
              <p className="flex justify-between gap-2"><span className="text-slate-400">Produto</span><b className={`truncate ${onAir ? 'text-emerald-600' : 'text-slate-500'}`}>{onAir ? onAir.name : 'Nenhum'}</b></p>
              <p className="flex justify-between gap-2"><span className="text-slate-400">Cupom</span><b className={`truncate ${activeCoupon ? 'text-emerald-600' : 'text-slate-500'}`}>{activeCoupon ? `${activeCoupon.code} (${activeCoupon.discountPercent ?? 0}%)` : 'Nenhum'}</b></p>
              <p className="flex justify-between gap-2"><span className="text-slate-400">{"Benef\u00edcio"}</span><b className={`truncate ${activeAdv ? 'text-emerald-600' : 'text-slate-500'}`}>{activeAdv ? activeAdv.title : 'Nenhum'}</b></p>
            </div>
          </section>
        </div>

        <div className="space-y-3 min-w-0">
          <section className={`${card} flex flex-col h-[480px] xl:h-[560px]`}>
            <h2 className="text-sm font-bold flex items-center gap-2 mb-2"><MessageSquare className="w-4 h-4" />Chat da live</h2>
            <div ref={chatBox} className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
              {chat.length === 0 && <p className="text-xs text-slate-400">Nenhuma mensagem ainda.</p>}
              {chat.map((m) => (
                <div key={m.id} className={`max-w-[92%] rounded-xl px-3 py-2 text-[13px] break-words ${
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
                className={`${input} flex-1 !py-2 !text-sm`}
              />
              <button type="submit" disabled={sending || !text.trim()} className="px-4 rounded-lg bg-sky-600 text-white disabled:opacity-60">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          </section>

          <section className={`${card} space-y-2`}>
            <h2 className="text-xs font-bold flex items-center gap-2"><Activity className="w-3.5 h-3.5" />Eventos em tempo real</h2>
            {events.length === 0 && <p className="text-xs text-slate-400">Aguardando eventos...</p>}
            <ul className="space-y-1 max-h-36 overflow-y-auto">
              {events.map((e) => (
                <li key={e.id} className="flex items-center justify-between text-[11px] border-b border-slate-50 pb-1">
                  <span className="font-medium text-slate-700">{EVENT_LABEL[e.event_type] ?? e.event_type}</span>
                  <span className="text-slate-400">{new Date(e.created_at).toLocaleTimeString('pt-BR')}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="space-y-3 min-w-0 md:col-span-2 xl:col-span-1">
          <section className={`${card} space-y-2`}>
            <h2 className="text-sm font-bold flex items-center gap-2"><Package className="w-4 h-4" />Produtos</h2>
            {products.length === 0 && <p className="text-xs text-slate-400">Nenhum produto vinculado a esta live.</p>}
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
              {products.map((p) => (
                <div key={p.id} className={`flex items-center gap-2 p-1.5 rounded-xl border ${p.isOnAir ? 'border-emerald-400 bg-emerald-50' : 'border-slate-100'}`}>
                  <span className="w-6 h-6 shrink-0 rounded-md bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center">{p.code ?? '-'}</span>
                  {p.image && <img src={p.image} alt="" className="w-9 h-9 rounded-lg object-cover" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold truncate">{p.name}</p>
                    <p className="text-[11px] text-slate-500">{brl(p.price)}</p>
                  </div>
                  <button
                    type="button"
                    disabled={!!busy}
                    onClick={() => run(`p-${p.id}`, () => setProductOnAir(live, p.isOnAir ? null : p))}
                    className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg disabled:opacity-60 whitespace-nowrap ${
                      p.isOnAir ? 'bg-slate-800 text-white' : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                  >
                    {busy === `p-${p.id}` ? '...' : p.isOnAir ? 'Tirar do ar' : 'Colocar no ar'}
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className={`${card} space-y-2`}>
            <h2 className="text-sm font-bold flex items-center gap-2"><Tag className="w-4 h-4" />Cupons</h2>
            {coupons.length === 0 && <p className="text-xs text-slate-400">Nenhum cupom. Crie um abaixo.</p>}
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {coupons.map((c) => (
                <div key={c.id} className={`flex items-center justify-between gap-2 p-1.5 rounded-xl border ${c.isActive ? 'border-emerald-400 bg-emerald-50' : 'border-slate-100'}`}>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">{c.code}</p>
                    <p className="text-[11px] text-slate-500">{c.discountPercent ?? 0}% {"\u00b7"} usos {c.usedCount}{c.maxUses ? `/${c.maxUses}` : ''}</p>
                  </div>
                  <button
                    type="button"
                    disabled={!!busy}
                    onClick={() => run(`c-${c.id}`, () => setCouponActive(live, c, !c.isActive))}
                    className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg disabled:opacity-60 ${
                      c.isActive ? 'bg-slate-800 text-white' : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                  >
                    {c.isActive ? 'Desativar' : 'Ativar'}
                  </button>
                </div>
              ))}
            </div>
            <form
              className="flex gap-2 pt-1 border-t border-slate-100"
              onSubmit={(e) => {
                e.preventDefault();
                run('add-coupon', async () => { await addCoupon(live, code, Number(percent)); setCode(''); });
              }}
            >
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder={"C\u00d3DIGO"} className={`${input} flex-1 uppercase`} />
              <input value={percent} onChange={(e) => setPercent(e.target.value)} type="number" min={1} max={100} className={`${input} w-14`} />
              <button type="submit" disabled={!!busy} className="text-[11px] font-bold px-3 rounded-lg bg-slate-900 text-white disabled:opacity-60">
                {busy === 'add-coupon' ? '...' : 'Criar'}
              </button>
            </form>
          </section>

          <section className={`${card} space-y-2`}>
            <h2 className="text-sm font-bold flex items-center gap-2"><Gift className="w-4 h-4" />{"Benef\u00edcios"}</h2>
            {live.advantages.length === 0 && <p className="text-xs text-slate-400">{"Nenhum benef\u00edcio cadastrado nesta live."}</p>}
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {live.advantages.map((a, i) => {
                const on = live.activeAdvantageIdx === i;
                return (
                  <div key={a.id} className={`flex items-center justify-between gap-2 p-1.5 rounded-xl border ${on ? 'border-emerald-400 bg-emerald-50' : 'border-slate-100'}`}>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">{a.title}</p>
                      <p className="text-[11px] text-slate-500 truncate">{a.description}</p>
                    </div>
                    <button
                      type="button"
                      disabled={!!busy}
                      onClick={() => run(`a-${a.id}`, () => setAdvantageActive(live, on ? null : i))}
                      className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg disabled:opacity-60 whitespace-nowrap ${
                        on ? 'bg-slate-800 text-white' : 'bg-emerald-600 text-white hover:bg-emerald-700'
                      }`}
                    >
                      {busy === `a-${a.id}` ? '...' : on ? 'Tirar do ar' : 'Ativar'}
                    </button>
                  </div>
                );
              })}
            </div>
            <form
              className="grid gap-2 pt-1 border-t border-slate-100 grid-cols-[1fr_auto]"
              onSubmit={(e) => {
                e.preventDefault();
                run('add-adv', async () => { await addAdvantage(live, advTitle, advDesc); setAdvTitle(''); setAdvDesc(''); });
              }}
            >
              <input value={advTitle} onChange={(e) => setAdvTitle(e.target.value)} placeholder={"T\u00edtulo (ex.: FRETE GR\u00c1TIS)"} className={input} />
              <button type="submit" disabled={!!busy || !advTitle.trim()} className="row-span-2 text-[11px] font-bold px-3 rounded-lg bg-slate-900 text-white disabled:opacity-60">
                {busy === 'add-adv' ? '...' : 'Criar'}
              </button>
              <input value={advDesc} onChange={(e) => setAdvDesc(e.target.value)} placeholder={"Descri\u00e7\u00e3o (ex.: Acima de R$ 300,00)"} className={input} />
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}