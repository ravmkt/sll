import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

const sb: any = supabase;

/** RPCs que ja aceitam p_store_id. Sera preenchido na migration da etapa 2. */
export const LOJA_RPCS = new Set<string>(['admin_streamsell_metrics', 'admin_vidlytics_metrics']);

export type LojaOpt = { id: string; label: string };
type LojaCtx = { storeId: string | null; setStoreId: (id: string | null) => void; stores: LojaOpt[] };

const Ctx = createContext<LojaCtx | null>(null);

export function LojaProvider({ children }: { children: ReactNode }) {
  const [storeId, setStoreId] = useState<string | null>(null);
  const [stores, setStores] = useState<LojaOpt[]>([]);

  useEffect(() => {
    let alive = true;
    sb.from('stores').select('*').limit(1000).then(({ data }: any) => {
      if (!alive || !data) return;
      const list: LojaOpt[] = (data as any[])
        .map((s) => ({ id: String(s.id), label: String(s.name ?? s.store_name ?? s.url ?? s.id) }))
        .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
      setStores(list);
    });
    return () => { alive = false; };
  }, []);

  const value = useMemo(() => ({ storeId, setStoreId, stores }), [storeId, stores]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMetricasLoja(): LojaCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useMetricasLoja fora do LojaProvider');
  return v;
}

/** Acrescenta p_store_id apenas nas RPCs que ja suportam o filtro. */
export const withStore = (fn: string, args: Record<string, unknown>, storeId: string | null) =>
  storeId && LOJA_RPCS.has(fn) ? { ...args, p_store_id: storeId } : args;

export function LojaBar({ rpcs }: { rpcs: string[] }) {
  const { storeId, setStoreId, stores } = useMetricasLoja();
  const pronto = rpcs.length > 0 && rpcs.every((r) => LOJA_RPCS.has(r));
  const atual = storeId ? stores.find((s) => s.id === storeId)?.label ?? 'Selecionada' : 'Todas as lojas';
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-500/50 bg-[#111524] px-4 py-3">
      <p className="text-[13px] text-slate-400">
        {'Loja: '}<b className="text-slate-200">{atual}</b>
        {storeId && !pronto && <span className="ml-2 text-amber-400">{'Esta vis\u00e3o ainda mostra todas as lojas.'}</span>}
      </p>
      <select
        value={storeId ?? ''}
        onChange={(e) => setStoreId(e.target.value || null)}
        className="max-w-[320px] cursor-pointer rounded-md border border-slate-700 bg-[#0b0e1a] px-2 py-1.5 text-[13px] text-slate-200 outline-none [color-scheme:dark]"
      >
        <option value="">Todas as lojas</option>
        {stores.map((s) => (
          <option key={s.id} value={s.id}>{s.label}</option>
        ))}
      </select>
    </div>
  );
}