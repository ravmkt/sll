import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Package, Radio, Square, Tag, Activity } from 'lucide-react';
import { useLiveCockpit } from '@/hooks/useLiveCockpit';
import {
  addCoupon, setCouponActive, setLiveStatus, setProductOnAir,
} from '@/services/streamSell/streamSellService';

const EVENT_LABEL: Record<string, string> = {
  'live.start': 'Live iniciada', 'live.end': 'Live encerrada',
  'product.show': 'Produto no ar', 'product.hide': 'Produto retirado',
  'coupon.activate': 'Cupom ativado', 'coupon.deactivate': 'Cupom desativado',
  'banner.show': 'Banner no ar', 'banner.hide': 'Banner retirado',
  product_click: 'Clique em produto', view: 'Visualização', page_view: 'Visualização',
};
const brl = (v: number | null) =>
  v == null ? '' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function LiveCockpit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, events, loading, error, reload } = useLiveCockpit(id);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [percent, setPercent] = useState('10');

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    setMsg(null);
    try {
      await fn();
      await reload();
    } catch (e: any) {
      setMsg(e?.message ?? 'Falha na ação');
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  }
  if (error || !data) {
    return <div className="p-6 text-sm text-rose-600">{error ?? 'Live não encontrada.'}</div>;
  }

  const { live, products, coupons } = data;
  const isLive = live.status === 'live';
  const finished = live.status === 'finished' || live.status === 'ended';

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button type="button" onClick={() => navigate('/stream-sell')} className="p-2 rounded-lg hover:bg-slate-100">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
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

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <h2 className="text-sm font-bold flex items-center gap-2"><Package className="w-4 h-4" />Produtos</h2>
          {products.length === 0 && <p className="text-xs text-slate-400">Nenhum produto vinculado a esta live.</p>}
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
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <h2 className="text-sm font-bold flex items-center gap-2"><Tag className="w-4 h-4" />Cupons</h2>
          {coupons.length === 0 && <p className="text-xs text-slate-400">Nenhum cupom. Crie um abaixo.</p>}
          {coupons.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-2 p-2 rounded-xl border border-slate-100">
              <div>
                <p className="text-xs font-bold">{c.code}</p>
                <p className="text-[11px] text-slate-500">{c.discountPercent ?? 0}% · usos {c.usedCount}{c.maxUses ? `/${c.maxUses}` : ''}</p>
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
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="CÓDIGO" className="min-w-0 flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-xs uppercase" />
            <input value={percent} onChange={(e) => setPercent(e.target.value)} type="number" min={1} max={100} className="w-16 border border-slate-200 rounded-lg px-2 py-1.5 text-xs" />
            <button type="submit" disabled={!!busy} className="text-[11px] font-bold px-3 rounded-lg bg-slate-900 text-white disabled:opacity-60">Criar</button>
          </form>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <h2 className="text-sm font-bold flex items-center gap-2"><Activity className="w-4 h-4" />Eventos em tempo real</h2>
          {events.length === 0 && <p className="text-xs text-slate-400">Aguardando eventos...</p>}
          <ul className="space-y-1.5 max-h-96 overflow-y-auto">
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
  );
}