import { useEffect, useRef, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Crosshair } from 'lucide-react';

export type PlacementPosition = 'before' | 'after' | 'prepend' | 'append';
export interface Placement { selector: string; position: PlacementPosition; }

interface Props {
  supabase: SupabaseClient;
  storeId: string;
  storeUrl?: string;
  value: Placement;
  onChange: (v: Placement) => void;
}

const POSITIONS: { value: PlacementPosition; label: string }[] = [
  { value: 'before', label: 'Acima do elemento' },
  { value: 'after', label: 'Abaixo do elemento' },
  { value: 'prepend', label: 'Dentro, no início' },
  { value: 'append', label: 'Dentro, no fim' },
];

export default function WidgetPlacementPicker({ supabase, storeId, storeUrl, value, onChange }: Props) {
  const [waiting, setWaiting] = useState(false);
  const timer = useRef<number | null>(null);

  const stop = () => {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
    setWaiting(false);
  };
  useEffect(() => stop, []);

  async function pick() {
    const input = window.prompt('Informe a URL completa da página da sua loja para selecionar o elemento:', storeUrl || 'https://');
    if (!input) return;
    let url: URL;
    try { url = new URL(/^https?:\/\//i.test(input) ? input : 'https://' + input); }
    catch { alert('URL inválida.'); return; }

    const win = window.open('', '_blank');
    const token = 'sel_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
    const { error } = await supabase.rpc('widgets_selector_create', { p_store_id: storeId, p_token: token });
    if (error) { win?.close(); alert('Erro ao iniciar seleção: ' + error.message); return; }

    url.searchParams.set('sllPickToken', token);
    if (win) win.location.href = url.toString(); else window.location.href = url.toString();

    setWaiting(true);
    const started = Date.now();
    timer.current = window.setInterval(async () => {
      if (Date.now() - started > 5 * 60 * 1000) { stop(); return; }
      const { data } = await supabase.rpc('widgets_selector_poll', { p_token: token });
      if (typeof data === 'string' && data) {
        onChange({ ...value, selector: data });
        stop();
      }
    }, 2000);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_220px] gap-3 items-end">
      <label className="block">
        <span className="text-[10px] font-bold uppercase text-slate-400">Seletor CSS do elemento</span>
        <input
          type="text"
          value={value.selector}
          onChange={(e) => onChange({ ...value, selector: e.target.value })}
          placeholder=".banner"
          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
        />
      </label>
      <button
        type="button"
        onClick={pick}
        disabled={waiting}
        className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-bold text-sky-600 disabled:opacity-60"
      >
        <Crosshair className="h-4 w-4" />
        {waiting ? 'Aguardando...' : 'Selecionar'}
      </button>
      <label className="block">
        <span className="text-[10px] font-bold uppercase text-slate-400">Posição</span>
        <select
          value={value.position}
          onChange={(e) => onChange({ ...value, position: e.target.value as PlacementPosition })}
          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
        >
          {POSITIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </label>
    </div>
  );
}
