import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Props {
  storeId: string;
  enabled: boolean | null;
  onChanged: () => void;
}

export default function EnabledSwitch({ storeId, enabled, onChanged }: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const on = enabled === true;

  const toggle = async () => {
    setBusy(true);
    setErr(null);
    const { error } = await (supabase as any).rpc('tryon_admin_set_enabled', {
      p_store_id: storeId,
      p_enabled: !on,
    });
    setBusy(false);
    if (error) setErr(error.message);
    else onChanged();
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <div>
        <p className="text-sm font-semibold text-slate-900">Exibir botão na loja</p>
        <p className="text-xs text-slate-500">
          {on ? 'O botão aparece nas páginas de produto.' : 'O botão está oculto para os visitantes.'}
        </p>
        {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        disabled={busy}
        onClick={() => void toggle()}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60 ${on ? 'bg-[color:var(--sll-b-brand)]' : 'bg-slate-300'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </div>
  );
}