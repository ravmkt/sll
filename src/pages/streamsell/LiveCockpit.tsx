import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Loader2, Package, Radio, Square, Tag, Activity, Gift, Eye, TrendingUp,
  MessageSquare, Send, Clock, Signal, RefreshCw, Volume2, VolumeX, ExternalLink, Search,
  Plus, Pin, Trash2, ChevronDown, Link2, Truck, X,
} from 'lucide-react';
import { useLiveCockpit } from '@/hooks/useLiveCockpit';
import {
  addAdvantage, addCoupon, deleteStudioChat, getStudioInfo, getStudioStats, linkProduct,
  listStudioChat, searchCatalog, sendStudioChat, setAdvantageActive, setCouponActive,
  setLiveStatus, setProductOnAir,
} from '@/services/streamSell/streamSellService';
import type { CatalogProduct, StudioChatMessage, StudioInfo } from '@/services/streamSell/streamSellService';

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
const QUESTION = /\?|\b(tem|qual|quais|quanto|tamanho|cor|pre\u00e7o|preco|frete|estoque|parcela|entrega)\b/i;

type Level = 'ok' | 'warn' | 'bad' | 'off';
const DOT: Record<Level, string> = { ok: 'bg-emerald-500', warn: 'bg-amber-400', bad: 'bg-red-500', off: 'bg-slate-300' };

function Chip({ icon, label, value, level, children }: {
  icon: ReactNode; label: string; value: string; level: Level; children?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 px-3 py-1.5 min-w-0">
      <span className={`w-2 h-2 rounded-full shrink-0 ${DOT[level]}`} />
      <span className="text-slate-400 shrink-0">{icon}</span>
      <span className="text-[11px] text-slate-500 truncate">{label}</span>
      <span className="text-sm font-extrabold text-slate-900 ml-auto whitespace-nowrap">{value}</span>
      {children}
    </div>
  );
}

function Spark({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const w = 48, h = 16, max = Math.max(...points, 1);
  const d = points.map((v, i) => `${i === 0 ? 'M' : 'L'}${(i / (points.length - 1)) * w},${h - (v / max) * (h - 3) - 1.5}`).join(' ');
  return <svg viewBox={`0 0 ${w} ${h}`} className="w-12 h-4 shrink-0"><path d={d} fill="none" stroke="#dc2626" strokeWidth="1.8" strokeLinejoin="round" /></svg>;
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
  const [muted, setMuted] = useState(true);
  const [syncKey, setSyncKey] = useState(0);
  const [pinId, setPinId] = useState<string | null>(null);
  const [evOpen, setEvOpen] = useState(false);
  const [q, setQ] = useState('');
  const [found, setFound] = useState<CatalogProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const chatBox = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const storeId = data?.live.storeId;

  useEffect(() => { if (id) getStudioInfo(id).then(setInfo).catch(() => {}); }, [id]);

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

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  useEffect(() => { const el = chatBox.current; if (el) el.scrollTop = el.scrollHeight; }, [chat.length]);

  useEffect(() => {
    if (!storeId || q.trim().length < 2) { setFound([]); return; }
    let alive = true;
    setSearching(true);
    const t = setTimeout(() => {
      searchCatalog(storeId, q)
        .then((r) => { if (alive) setFound(r); })
        .catch(() => { if (alive) setFound([]); })
        .finally(() => { if (alive) setSearching(false); });
    }, 350);
    return () => { alive = false; clearTimeout(t); };
  }, [q, storeId]);

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    setMsg(null);
    try { await fn(); await reload(); }
    catch (e: any) { setMsg(e?.message ?? 'Falha na a\u00e7\u00e3o'); }
    finally { setBusy(null); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  if (error || !data) return <div className="p-6 text-sm text-red-600">{error ?? 'Live n\u00e3o encontrada.'}</div>;

  const { live, products, coupons } = data;
  const isLive = live.status === 'live';
  const finished = live.status === 'finished' || live.status === 'ended';
  const vid = ytId(info);

  const onAir = products.find((p) => p.isOnAir) ?? null;
  const activeCoupon = coupons.find((c) => c.isActive) ?? null;
  const activeAdv = live.activeAdvantageIdx != null ? live.advantages[live.activeAdvantageIdx] : null;

  const cmd = (func: string, args: unknown[] = []) =>
    frame.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), '*');
  const toggleMute = () => {
    if (muted) { cmd('unMute'); cmd('setVolume', [100]); } else cmd('mute');
    setMuted(!muted);
  };
  const resync = () => { setMuted(true); setSyncKey((k) => k + 1); };

  const post = async (t: string) => {
    const clean = t.trim();
    if (!clean || sending) return;
    setSending(true);
    setMsg(null);
    try {
      await sendStudioChat(live.id, clean);
      setText('');
      setChat(await listStudioChat(live.id));
    } catch (err: any) { setMsg(err?.message ?? 'Falha ao enviar a mensagem'); }
    finally { setSending(false); }
  };
  const send = (e: FormEvent) => { e.preventDefault(); post(text); };

  const startMs = info?.started_at ? new Date(info.started_at).getTime() : 0;
  const dur = isLive && startMs ? fmtDur(now - startMs) : '--:--:--';
  const last = series[series.length - 1] ?? 0;
  const prev = series[series.length - 2] ?? last;
  const arrow = !isLive ? '' : last > prev ? '\u25b2 ' : last < prev ? '\u25bc ' : '';
  const top = Math.max(0, ...series.slice(-30));
  const drop = isLive && top >= 5 ? 1 - stats.current / top : 0;
  const trend: Level = !isLive ? 'off' : drop >= 0.5 ? 'bad' : drop >= 0.2 ? 'warn' : 'ok';
  const perMin = chat.filter((m) => !m.is_from_store && now - new Date(m.created_at).getTime() < 60000).length;
  const pinned = pinId ? chat.find((m) => m.id === pinId) ?? null : null;
  const nextCode = Math.max(0, ...products.map((p) => Number(p.code) || 0)) + 1;

  const card = 'bg-white rounded-2xl border border-slate-200 p-3';
  const input = 'min-w-0 border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white';
  const btnOn = 'bg-red-600 hover:bg-red-700 text-white';
  const btnOff = 'bg-emerald-600 hover:bg-emerald-700 text-white';
  const btnMute = 'bg-slate-100 hover:bg-slate-200 text-slate-700';

  const chips: { label: string; icon: ReactNode; text: string; ok: boolean }[] = [
    { label: 'Link na tela', icon: <Link2 className="w-3 h-3" />, text: 'O link de compra est\u00e1 na tela, \u00e9 s\u00f3 tocar em Comprar!', ok: true },
    { label: 'Frete gr\u00e1tis ativo', icon: <Truck className="w-3 h-3" />, text: activeAdv ? `${activeAdv.title} ${activeAdv.description}`.trim() : '', ok: !!activeAdv },
    { label: activeCoupon ? `Use o cupom ${activeCoupon.code}` : 'Use o cupom', icon: <Tag className="w-3 h-3" />, text: activeCoupon ? `Use o cupom ${activeCoupon.code} e ganhe ${activeCoupon.discountPercent ?? 0}% de desconto!` : '', ok: !!activeCoupon },
  ];

  return (
    <div className="min-h-full bg-[#F8FAFC] p-3 md:p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button type="button" onClick={() => navigate('/dashboard/modules/stream-sell')} className="p-2 rounded-lg hover:bg-slate-100">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{"Est\u00fadio da Live"}</p>
            <h1 className="text-base font-bold text-slate-900 truncate">{live.title}</h1>
          </div>
          <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
            isLive ? 'bg-red-600 text-white animate-pulse' : finished ? 'bg-slate-200 text-slate-600' : 'bg-amber-100 text-amber-700'
          }`}>
            <Radio className="w-3 h-3" />{isLive ? 'AO VIVO' : finished ? 'Encerrada' : 'Agendada'}
          </span>
        </div>
        {!finished && (
          <button
            type="button"
            disabled={busy === 'status'}
            onClick={() => run('status', () => setLiveStatus(live, isLive ? 'finished' : 'live'))}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-60 ${btnOn}`}
          >
            {busy === 'status' ? <Loader2 className="w-4 h-4 animate-spin" /> : isLive ? <Square className="w-4 h-4" /> : <Radio className="w-4 h-4" />}
            {isLive ? 'Encerrar live' : 'Iniciar live'}
          </button>
        )}
      </div>

      {msg && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{msg}</p>}

      <div className="grid gap-2 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        <Chip icon={<Eye className="w-3.5 h-3.5" />} label="Agora" value={`${arrow}${stats.current}`} level={!isLive ? 'off' : stats.current > 0 ? 'ok' : 'warn'}>
          <Spark points={series} />
        </Chip>
        <Chip icon={<TrendingUp className="w-3.5 h-3.5" />} label="Pico" value={String(stats.peak)} level={trend} />
        <Chip icon={<Clock className="w-3.5 h-3.5" />} label="No ar" value={dur} level={isLive ? 'ok' : 'off'} />
        <Chip icon={<MessageSquare className="w-3.5 h-3.5" />} label="Msgs/min" value={String(perMin)} level={!isLive ? 'off' : perMin > 0 ? 'ok' : 'warn'} />
        <Chip icon={<Signal className="w-3.5 h-3.5" />} label="Sinal" value={"indispon\u00edvel"} level="off" />
        <button type="button" onClick={resync} title={"Recarrega s\u00f3 o player deste painel, sem interromper a transmiss\u00e3o"}
          className="flex items-center justify-center gap-2 bg-white rounded-xl border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">
          <RefreshCw className="w-3.5 h-3.5" />{"Ressincronizar player"}
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)_minmax(0,1fr)] items-start">
        {/* ESQUERDA: espelho do cliente */}
        <div className="space-y-3">
          <div className="relative mx-auto w-full max-w-[340px] aspect-[9/16] rounded-2xl overflow-hidden bg-black border border-slate-200" style={{ containerType: 'size' }}>
            {vid ? (
              <iframe
                key={syncKey}
                ref={frame}
                title="Player da live"
                className="absolute top-0 left-1/2 h-full -translate-x-1/2 border-0 pointer-events-none"
                style={{ width: 'calc(100cqh * 16 / 9)', maxWidth: 'none' }}
                src={`https://www.youtube.com/embed/${encodeURIComponent(vid)}?autoplay=1&mute=1&controls=0&disablekb=1&modestbranding=1&rel=0&playsinline=1&enablejsapi=1`}
                allow="autoplay; encrypted-media; picture-in-picture"
              />
            ) : (
              <p className="absolute inset-0 flex items-center justify-center text-xs text-slate-400 px-4 text-center">{"Esta live n\u00e3o tem v\u00eddeo do YouTube vinculado."}</p>
            )}
            {(activeCoupon || activeAdv) && (
              <div className="absolute top-2 left-2 right-2 flex flex-wrap gap-1.5">
                {activeCoupon && (
                  <span className="rounded-lg bg-white/95 px-2 py-1 text-[11px] font-extrabold text-slate-900 shadow">
                    <Tag className="inline w-3 h-3 mr-1 text-red-600" />{activeCoupon.code} {"\u00b7"} {activeCoupon.discountPercent ?? 0}% OFF
                  </span>
                )}
                {activeAdv && (
                  <span className="rounded-lg bg-emerald-600 px-2 py-1 text-[11px] font-extrabold text-white shadow">
                    <Gift className="inline w-3 h-3 mr-1" />{activeAdv.title}{activeAdv.description ? ` \u00b7 ${activeAdv.description}` : ''}
                  </span>
                )}
              </div>
            )}
            {onAir && (
              <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2 rounded-xl bg-white/95 p-1.5 shadow-lg">
                {onAir.image && <img src={onAir.image} alt="" className="w-11 h-11 rounded-lg object-cover shrink-0" />}
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold text-slate-900 line-clamp-2 leading-tight">{onAir.name}</p>
                  <p className="text-[11px] font-bold text-emerald-700">{brl(onAir.price)}</p>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-600 px-3 py-1 text-[10px] font-bold text-white">Comprar</span>
              </div>
            )}
          </div>

          <div className="flex gap-2 max-w-[340px] mx-auto">
            <button type="button" onClick={toggleMute} className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-bold ${btnMute}`}>
              {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}{muted ? 'Ativar som local' : 'Silenciar'}
            </button>
            {vid && (
              <a href={`https://www.youtube.com/watch?v=${encodeURIComponent(vid)}`} target="_blank" rel="noopener noreferrer"
                className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-bold ${btnMute}`}>
                <ExternalLink className="w-3.5 h-3.5" />Abrir no YouTube
              </a>
            )}
          </div>

          <section className={`${card} space-y-1.5 max-w-[340px] mx-auto`}>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">No ar agora</h2>
            {([
              ['Produto', onAir?.name, () => setProductOnAir(live, null), 'rm-p'],
              ['Cupom', activeCoupon ? `${activeCoupon.code} (${activeCoupon.discountPercent ?? 0}%)` : undefined, () => setCouponActive(live, activeCoupon!, false), 'rm-c'],
              ['Benef\u00edcio', activeAdv?.title, () => setAdvantageActive(live, null), 'rm-a'],
            ] as [string, string | undefined, () => Promise<unknown>, string][]).map(([label, val, fn, key]) => (
              <div key={key} className="flex items-center gap-2 text-[11px]">
                <span className="w-16 shrink-0 text-slate-400">{label}</span>
                <b className={`flex-1 truncate ${val ? 'text-emerald-600' : 'text-slate-400'}`}>{val ?? 'Nenhum'}</b>
                {val && (
                  <button type="button" disabled={!!busy} onClick={() => run(key, fn)} className="text-[10px] font-bold text-red-600 hover:underline disabled:opacity-50">
                    {"Remover destaque"}
                  </button>
                )}
              </div>
            ))}
          </section>
        </div>

        {/* CENTRO: vitrine e gatilhos */}
        <div className="space-y-3 min-w-0">
          <section className={`${card} space-y-2`}>
            <h2 className="text-sm font-bold flex items-center gap-2"><Package className="w-4 h-4" />{"Produtos da live"}</h2>
            <div className="relative">
              <Search className="absolute left-2 top-2 w-3.5 h-3.5 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={"+ Buscar e vincular produto do cat\u00e1logo..."} className={`${input} w-full pl-7 !py-2`} />
              {(searching || found.length > 0) && q.trim().length >= 2 && (
                <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
                  {searching && <p className="p-2 text-xs text-slate-400">Buscando...</p>}
                  {found.map((p) => (
                    <button key={p.id} type="button" disabled={!!busy}
                      onClick={() => run('link', async () => { await linkProduct(live, p.id, nextCode); setQ(''); setFound([]); })}
                      className="w-full flex items-center gap-2 p-2 text-left hover:bg-slate-50 disabled:opacity-60">
                      {p.image_url && <img src={p.image_url} alt="" className="w-8 h-8 rounded-md object-cover" />}
                      <span className="flex-1 min-w-0 text-xs font-medium truncate">{p.name}</span>
                      <span className="text-[11px] text-slate-500">{brl(p.price)}</span>
                      <Plus className="w-4 h-4 text-emerald-600" />
                    </button>
                  ))}
                  {!searching && found.length === 0 && <p className="p-2 text-xs text-slate-400">{"Nenhum produto encontrado."}</p>}
                </div>
              )}
            </div>
            {products.length === 0 && <p className="text-xs text-slate-400">Nenhum produto vinculado a esta live.</p>}
            <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
              {products.map((p) => (
                <div key={p.id} className={`flex items-center gap-2 p-1.5 rounded-xl border ${p.isOnAir ? 'border-red-400 bg-red-50' : 'border-slate-100'}`}>
                  <span className="w-6 h-6 shrink-0 rounded-md bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center">{p.code ?? '-'}</span>
                  {p.image && <img src={p.image} alt="" className="w-10 h-10 rounded-lg object-cover" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold truncate">{p.name}</p>
                    <p className="text-[11px] text-slate-500">{brl(p.price)}</p>
                  </div>
                  <button type="button" disabled={!!busy}
                    onClick={() => run(`p-${p.id}`, () => setProductOnAir(live, p.isOnAir ? null : p))}
                    className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg disabled:opacity-60 whitespace-nowrap ${p.isOnAir ? btnOn : btnOff}`}>
                    {busy === `p-${p.id}` ? '...' : p.isOnAir ? 'EM DESTAQUE \u00b7 retirar' : 'Colocar no ar'}
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className={`${card} space-y-2`}>
            <h2 className="text-sm font-bold flex items-center gap-2"><Tag className="w-4 h-4" />{"Cupons e benef\u00edcios rel\u00e2mpago"}</h2>
            {coupons.length === 0 && <p className="text-xs text-slate-400">Nenhum cupom. Crie um abaixo.</p>}
            {coupons.map((c) => (
              <div key={c.id} className={`flex items-center justify-between gap-2 p-1.5 rounded-xl border ${c.isActive ? 'border-red-400 bg-red-50' : 'border-slate-100'}`}>
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate">{c.code}</p>
                  <p className="text-[11px] text-slate-500">{c.discountPercent ?? 0}% {"\u00b7"} usos {c.usedCount}{c.maxUses ? `/${c.maxUses}` : ''}</p>
                </div>
                <button type="button" disabled={!!busy} onClick={() => run(`c-${c.id}`, () => setCouponActive(live, c, !c.isActive))}
                  className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg disabled:opacity-60 ${c.isActive ? btnOn : btnOff}`}>
                  {c.isActive ? 'Desativar cupom' : 'Ativar cupom'}
                </button>
              </div>
            ))}
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); run('add-coupon', async () => { await addCoupon(live, code, Number(percent)); setCode(''); }); }}>
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder={"C\u00d3DIGO"} className={`${input} flex-1 uppercase`} />
              <input value={percent} onChange={(e) => setPercent(e.target.value)} type="number" min={1} max={100} className={`${input} w-14`} />
              <button type="submit" disabled={!!busy || !code.trim()} className="text-[11px] font-bold px-3 rounded-lg bg-slate-900 text-white disabled:opacity-60">Criar</button>
            </form>

            <div className="border-t border-slate-100 pt-2 space-y-1.5">
              {live.advantages.length === 0 && <p className="text-xs text-slate-400">{"Nenhum benef\u00edcio cadastrado nesta live."}</p>}
              {live.advantages.map((a, i) => {
                const on = live.activeAdvantageIdx === i;
                return (
                  <div key={a.id} className={`flex items-center justify-between gap-2 p-1.5 rounded-xl border ${on ? 'border-red-400 bg-red-50' : 'border-slate-100'}`}>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">{a.title}</p>
                      <p className="text-[11px] text-slate-500 truncate">{a.description}</p>
                    </div>
                    <button type="button" disabled={!!busy} onClick={() => run(`a-${a.id}`, () => setAdvantageActive(live, on ? null : i))}
                      className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg disabled:opacity-60 whitespace-nowrap ${on ? btnOn : btnOff}`}>
                      {busy === `a-${a.id}` ? '...' : on ? 'Tirar do ar' : 'Ativar'}
                    </button>
                  </div>
                );
              })}
              <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); run('add-adv', async () => { await addAdvantage(live, advTitle, advDesc); setAdvTitle(''); setAdvDesc(''); }); }}>
                <input value={advTitle} onChange={(e) => setAdvTitle(e.target.value)} placeholder={"T\u00edtulo do benef\u00edcio"} className={`${input} flex-1`} />
                <input value={advDesc} onChange={(e) => setAdvDesc(e.target.value)} placeholder={"Descri\u00e7\u00e3o (opcional)"} className={`${input} flex-1`} />
                <button type="submit" disabled={!!busy || !advTitle.trim()} className="text-[11px] font-bold px-3 rounded-lg bg-slate-900 text-white disabled:opacity-60">Adicionar</button>
              </form>
            </div>
          </section>
        </div>

        {/* DIREITA: atendimento */}
        <section className={`${card} flex flex-col h-[calc(100vh-250px)] min-h-[460px] lg:col-span-2 xl:col-span-1`}>
          <h2 className="text-sm font-bold flex items-center gap-2 mb-2"><MessageSquare className="w-4 h-4" />Chat da live</h2>
          {pinned && (
            <div className="mb-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs">
              <Pin className="w-3.5 h-3.5 mt-0.5 text-amber-600 shrink-0" />
              <span className="flex-1 break-words"><b>{pinned.author_name || 'Visitante'}:</b> {pinned.message}</span>
              <button type="button" onClick={() => setPinId(null)}><X className="w-3.5 h-3.5 text-slate-400" /></button>
            </div>
          )}
          <div ref={chatBox} className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
            {chat.length === 0 && <p className="text-xs text-slate-400">Nenhuma mensagem ainda.</p>}
            {chat.map((m) => {
              const question = !m.is_from_store && QUESTION.test(m.message);
              return (
                <div key={m.id} className={`group relative max-w-[92%] rounded-xl px-3 py-2 text-[13px] break-words ${
                  m.is_from_store ? 'ml-auto bg-sky-600 text-white' : question ? 'bg-amber-50 border border-amber-300 text-slate-800' : 'bg-slate-100 text-slate-800'
                }`}>
                  <b className={`block text-[10px] ${m.is_from_store ? 'text-sky-100' : 'text-slate-500'}`}>{m.author_name || 'Visitante'}{question ? ' \u00b7 d\u00favida' : ''}</b>
                  {m.message}
                  <span className="absolute -top-2 right-1 hidden group-hover:flex gap-1 rounded-md bg-white border border-slate-200 shadow px-1 py-0.5">
                    <button type="button" title="Fixar no topo" onClick={() => setPinId(m.id)} className="text-slate-500 hover:text-amber-600"><Pin className="w-3.5 h-3.5" /></button>
                    <button type="button" title="Apagar" onClick={() => run(`d-${m.id}`, async () => { await deleteStudioChat(m.id); setChat((c) => c.filter((x) => x.id !== m.id)); })} className="text-slate-500 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-1.5 pt-2">
            {chips.map((c) => (
              <button key={c.label} type="button" disabled={!c.ok || sending} onClick={() => post(c.text)}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40">
                {c.icon}{c.label}
              </button>
            ))}
          </div>
          <form onSubmit={send} className="flex gap-2 pt-2">
            <input value={text} maxLength={500} onChange={(e) => setText(e.target.value)} placeholder="Responder como loja..." className={`${input} flex-1 !py-2 !text-sm`} />
            <button type="submit" disabled={sending || !text.trim()} className="px-4 rounded-lg bg-sky-600 text-white disabled:opacity-60">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
          <p className="pt-1 text-[10px] text-slate-400">Enviando como: Loja</p>
          <div className="mt-2 border-t border-slate-100 pt-2">
            <button type="button" onClick={() => setEvOpen((v) => !v)} className="w-full flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-2"><Activity className="w-3.5 h-3.5" />{"Hist\u00f3rico de eventos recentes"}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${evOpen ? 'rotate-180' : ''}`} />
            </button>
            {evOpen && (
              <ul className="mt-2 space-y-1 max-h-36 overflow-y-auto">
                {events.length === 0 && <li className="text-xs text-slate-400">Aguardando eventos...</li>}
                {events.map((e) => (
                  <li key={e.id} className="flex items-center justify-between text-[11px] border-b border-slate-50 pb-1">
                    <span className="font-medium text-slate-700">{EVENT_LABEL[e.event_type] ?? e.event_type}</span>
                    <span className="text-slate-400">{new Date(e.created_at).toLocaleTimeString('pt-BR')}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}