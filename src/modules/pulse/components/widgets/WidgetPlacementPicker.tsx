import { useEffect, useRef, useState } from 'react';
import { Crosshair, Loader2 } from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';

export type Position = 'before' | 'after' | 'prepend' | 'append';
export type PageRule = 'auto' | 'home' | 'all_pages' | 'url_contains' | 'url_not_contains' | 'url_not_equals';
export interface Placement { selector: string; position: Position; rule?: PageRule; rule_value?: string; }

const POSITIONS: { v: Position; label: string }[] = [
  { v: 'before', label: 'Acima do elemento' },
  { v: 'after', label: 'Abaixo do elemento' },
  { v: 'prepend', label: 'Dentro, no início' },
  { v: 'append', label: 'Dentro, no fim' },
];
const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#0094EB]';

interface Props {
  supabase: SupabaseClient;
  storeId: string;
  storeUrl?: string;
  value: Placement;
  onChange: (p: Placement) => void;
}

export default function WidgetPlacementPicker({ supabase, storeId, storeUrl, value, onChange }: Props) {
  const [waiting, setWaiting] = useState(false);
  const [err, setErr] = useState('');
  const timer = useRef<number | null>(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  const stop = () => {
    if (timer.current) { window.clearInterval(timer.current); timer.current = null; }
    setWaiting(false);
  };
  useEffect(() => stop, []);

  async function start() {
    setErr('');
    let base = (storeUrl || '').trim();
    if (!base) { setErr('URL da loja não encontrada.'); return; }
    if (!/^https?:\/\//i.test(base)) base = 'https://' + base;

    const win = window.open('', '_blank');
    try {
      const { data, error } = await supabase.rpc('widgets_selector_create', { p_store_id: storeId });
      if (error || !data) throw new Error(error?.message || 'Falha ao criar token.');
      const token = data as string;
      const url = new URL(base);
      url.searchParams.set('sllPickToken', token);
      if (win) win.location.href = url.toString(); else window.open(url.toString(), '_blank');

      setWaiting(true);
      const startedAt = Date.now();
      stop();
      setWaiting(true);
      timer.current = window.setInterval(async () => {
        if (Date.now() - startedAt > 5 * 60 * 1000) { stop(); setErr('Tempo esgotado. Tente novamente.'); return; }
        const r = await supabase.rpc('widgets_selector_poll', { p_store_id: storeId, p_token: token });
        if (!r.error && r.data) {
          stop();
          onChange({ ...valueRef.current, selector: r.data as string });
        }
      }, 2000);
    } catch (e) {
      win?.close();
      setErr(e instanceof Error ? e.message : 'Erro ao abrir a loja.');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={start} disabled={waiting}
          className="inline-flex items-center gap-2 rounded-xl bg-[#0094EB] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">
          {waiting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
          {waiting ? 'Aguardando seleção na loja...' : 'Selecionar elemento na loja'}
        </button>
        {waiting && <button type="button" onClick={stop} className="text-xs font-semibold text-slate-500 underline">Cancelar</button>}
      </div>
      <p className="text-xs text-slate-500">
        Uma aba da loja será aberta. Passe o mouse, clique no elemento desejado (ex.: banner) e confirme.
      </p>
      {err && <p className="text-xs font-semibold text-red-600">{err}</p>}

      <label className="block">
        <span className="mb-1 block text-[10px] font-bold uppercase text-slate-400">Seletor CSS</span>
        <input className={inputCls + ' font-mono'} value={value.selector} placeholder="#banner-principal"
          onChange={(e) => onChange({ ...value, selector: e.target.value })} />
      </label>

      <div className="grid grid-cols-2 gap-2">
        {POSITIONS.map((p) => (
          <button key={p.v} type="button" onClick={() => onChange({ ...value, position: p.v })}
            className={`rounded-xl border px-3 py-2.5 text-sm font-semibold ${value.position === p.v
              ? 'border-[#0094EB] bg-sky-50 text-[#0094EB]' : 'border-slate-200 text-slate-600'}`}>
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
