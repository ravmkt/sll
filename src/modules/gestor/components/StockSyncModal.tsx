import { useMemo, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { Modal, primaryBtn } from '@/components/products/Modal';
import { CHANNEL_META } from '../services/canais';
import type { ChannelKey } from '../services/canais';
import ChannelFavicon from './ChannelFavicon';

const sb: any = supabase;

// Canais com integracao pronta. Para ligar outro: incluir a key aqui e tratar em pushOne().
const INTEGRATED = new Set<string>(['yampi']);

export type SyncVariant = { id: string; sku: string; stock: number; label: string };
export type SyncProduct = { id: string; name: string; channels: ChannelKey[]; variants: SyncVariant[] };

type Status = 'ok' | 'diverged' | 'skip' | 'error';
type Out = { channel: ChannelKey; sku: string; product: string; status: Status; message: string };

async function pushOne(channel: ChannelKey, storeId: string, v: SyncVariant): Promise<{ status: Status; message: string }> {
  if (channel !== 'yampi') return { status: 'error', message: 'Canal ainda não integrado.' };
  try {
    await sb.from('product_variants').update({ sync_hold_until: new Date(Date.now() + 60000).toISOString() }).eq('id', v.id);
  } catch { /* sem trava de eco: segue */ }
  try {
    const { data, error } = await supabase.functions.invoke('yampi-sync', {
      body: { action: 'push', store_id: storeId, sku: v.sku, stock: v.stock },
    });
    if (error) {
      let msg = '';
      try { msg = String((await (error as any).context.json())?.error || ''); } catch { /* sem corpo */ }
      msg = msg || error.message;
      if (/não conectada|sem external_id|external_id/i.test(msg)) return { status: 'skip', message: 'SKU ainda não existe na Yampi. Publique o produto no canal primeiro.' };
      return { status: 'error', message: msg };
    }
    const remote = Number((data as any)?.after?.total_in_stock);
    if (!Number.isFinite(remote)) return { status: 'error', message: 'A Yampi não devolveu o saldo para conferência.' };
    if (remote !== Math.floor(v.stock)) return { status: 'diverged', message: `Enviado ${v.stock}, a Yampi mostra ${remote}.` };
    return { status: 'ok', message: 'Confirmado.' };
  } catch (e) {
    return { status: 'error', message: e instanceof Error ? e.message : String(e) };
  }
}

type Props = {
  storeId: string;
  products: SyncProduct[];
  activeChannels: ChannelKey[];
  onClose: () => void;
  onDone: () => void;
};

export default function StockSyncModal({ storeId, products, activeChannels, onClose, onDone }: Props) {
  const eligible = (ch: ChannelKey) => products.filter((p) => p.channels.includes(ch));
  const usable = useMemo(
    () => activeChannels.filter((c) => INTEGRATED.has(c) && products.some((p) => p.channels.includes(c))),
    [activeChannels, products],
  );
  const [chosen, setChosen] = useState<Set<ChannelKey>>(new Set(usable));
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const [results, setResults] = useState<Out[] | null>(null);

  const total = useMemo(
    () => [...chosen].reduce((s, c) => s + eligible(c).reduce((a, p) => a + p.variants.length, 0), 0),
    [chosen, products],
  );
  const allOn = usable.length > 0 && usable.every((c) => chosen.has(c));
  const toggle = (c: ChannelKey) => setChosen((s) => { const n = new Set(s); if (n.has(c)) n.delete(c); else n.add(c); return n; });
  const toggleAll = () => setChosen(allOn ? new Set() : new Set(usable));

  const run = async () => {
    const jobs: { channel: ChannelKey; product: string; v: SyncVariant }[] = [];
    for (const c of chosen) for (const p of eligible(c)) for (const v of p.variants) jobs.push({ channel: c, product: p.name, v });
    if (!jobs.length) return;
    setBusy(true);
    setDone(0);
    const out: Out[] = [];
    let i = 0;
    const worker = async () => {
      while (i < jobs.length) {
        const j = jobs[i++];
        const r = await pushOne(j.channel, storeId, j.v);
        out.push({ channel: j.channel, sku: j.v.sku, product: j.v.label ? `${j.product} · ${j.v.label}` : j.product, ...r });
        setDone((d) => d + 1);
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
    setResults(out);
    setBusy(false);
    onDone();
  };

  const count = (s: Status) => (results ?? []).filter((r) => r.status === s).length;
  const problems = (results ?? []).filter((r) => r.status !== 'ok');

  return (
    <Modal title="Sincronizar estoque" onClose={() => { if (!busy) onClose(); }}>
      <div className="space-y-4 p-6">
        {!results ? (
          <>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              <strong>{products.length}</strong> produto(s) selecionado(s). Envia <strong>somente o saldo de estoque</strong>: nome, descrição, preço e imagens não são alterados.
            </p>

            <div className="space-y-2">
              {usable.length > 1 && (
                <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-[color:var(--sll-bg)] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <input type="checkbox" disabled={busy} checked={allOn} onChange={toggleAll} className="h-4 w-4 cursor-pointer accent-[color:var(--sll-b-brand)]" />
                  Todos os canais
                </label>
              )}
              {activeChannels.map((c) => {
                const ok = INTEGRATED.has(c);
                const prods = eligible(c);
                const vars = prods.reduce((s, p) => s + p.variants.length, 0);
                const ignored = products.length - prods.length;
                const can = ok && prods.length > 0;
                return (
                  <label
                    key={c}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border px-4 py-3',
                      can ? 'cursor-pointer border-slate-200 hover:border-[color:var(--sll-b-brand)] dark:border-slate-700' : 'cursor-not-allowed border-slate-100 opacity-60 dark:border-slate-800',
                    )}
                  >
                    <input type="checkbox" disabled={!can || busy} checked={chosen.has(c)} onChange={() => toggle(c)} className="h-4 w-4 cursor-pointer accent-[color:var(--sll-b-brand)]" />
                    <ChannelFavicon channel={c} size={24} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{CHANNEL_META[c].label}{!ok && ' (em breve)'}</p>
                      <p className="text-[11px] text-slate-400">
                        {!ok ? 'Integração ainda não disponível.'
                          : prods.length === 0 ? 'Nenhum produto selecionado está vinculado a este canal.'
                          : `${prods.length} produto(s) · ${vars} variação(ões)${ignored ? ` · ${ignored} sem vínculo (ignorado${ignored > 1 ? 's' : ''})` : ''}`}
                      </p>
                    </div>
                  </label>
                );
              })}
              {activeChannels.length === 0 && <p className="py-4 text-center text-sm text-slate-400">Nenhum canal ativo. Ative em Canais e depósitos.</p>}
            </div>

            {busy && <p className="text-xs font-semibold text-[color:var(--sll-b-brand)]">Enviando {done} de {total}...</p>}
            <p className="text-[11px] text-slate-400">Produtos desvinculados do canal são ignorados. Cada envio é conferido lendo o saldo de volta no canal.</p>
          </>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-2 text-center">
              {([['ok', 'confirmado', 'text-emerald-600'], ['diverged', 'divergente', 'text-amber-600'], ['skip', 'sem vínculo', 'text-slate-500'], ['error', 'erro', 'text-rose-600']] as const).map(([k, l, c]) => (
                <div key={k} className="rounded-xl bg-[color:var(--sll-bg)] p-3">
                  <p className={cn('text-2xl font-extrabold', c)}>{count(k)}</p>
                  <p className="text-[11px] font-semibold text-slate-500">{l}</p>
                </div>
              ))}
            </div>
            {problems.length === 0 && (
              <p className="flex items-center justify-center gap-2 text-sm font-semibold text-emerald-600"><CheckCircle2 size={16} /> Tudo confirmado nos canais.</p>
            )}
            {problems.length > 0 && (
              <div className="max-h-[35vh] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <ul className="divide-y divide-slate-100 text-xs dark:divide-slate-800">
                  {problems.slice(0, 150).map((r, i) => (
                    <li key={r.channel + r.sku + i} className="flex items-start gap-2 px-3 py-2">
                      <ChannelFavicon channel={r.channel} size={16} className="mt-0.5" />
                      <div className="min-w-0">
                        <p className="break-words font-semibold">{r.product} <span className="font-mono font-normal text-slate-400">{r.sku}</span></p>
                        <p className={r.status === 'diverged' ? 'text-amber-600' : r.status === 'skip' ? 'text-slate-500' : 'text-rose-500'}>{r.message}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" disabled={busy} onClick={onClose} className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold disabled:opacity-50 dark:border-slate-700">
            {results ? 'Fechar' : 'Cancelar'}
          </button>
          {!results && (
            <button type="button" disabled={busy || chosen.size === 0 || total === 0} onClick={() => void run()} className={primaryBtn + ' disabled:opacity-50'}>
              {busy && <Loader2 size={15} className="mr-2 inline animate-spin" />}
              {busy ? 'Enviando...' : `Sincronizar${total ? ` (${total})` : ''}`}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
