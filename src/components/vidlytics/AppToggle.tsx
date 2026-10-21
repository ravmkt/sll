import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useLoja } from '@/contexts/LojaContext';

const sb: any = supabase;

export default function AppToggle() {
  const { storeId } = useLoja() as { storeId: string | null };
  const [on, setOn] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!storeId) return;
    let alive = true;
    sb.rpc('get_store_settings_public', { p_store_id: storeId }).maybeSingle()
      .then(({ data }: any) => {
        if (!alive) return;
        setOn(data ? data.app_enabled !== false && data.widget_enabled !== false : true);
        setLoading(false);
      });
    return () => { alive = false; };
  }, [storeId]);

  const toggle = async () => {
    if (!storeId || saving) return;
    const next = !on;
    setOn(next);
    setSaving(true);
    setError(null);
    const patch = next ? { app_enabled: true, widget_enabled: true } : { app_enabled: false };
    const { data, error: err } = await sb.from('store_settings').update(patch).eq('store_id', storeId).select('store_id');
    setSaving(false);
    if (err || !data || data.length === 0) {
      setOn(!next);
      setError('Não foi possível salvar.');
      return;
    }
    window.dispatchEvent(new CustomEvent('vidlytics:app-enabled', { detail: next }));
  };

  return (
    <div
      title={error ?? (on ? 'Vídeos online na sua loja' : 'Vídeos ocultos na sua loja')}
      className={`flex items-center gap-2.5 rounded-xl border px-3 py-1.5 transition-colors ${
        error ? 'border-amber-300 bg-amber-50' : on ? 'border-emerald-200 bg-emerald-50/70' : 'border-rose-200 bg-rose-50/70'
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${on ? 'animate-pulse bg-emerald-500' : 'bg-rose-500'}`} />
      <span className={`hidden text-xs font-bold sm:inline ${on ? 'text-emerald-900' : 'text-rose-900'}`}>
        {on ? 'Aplicativo ativado' : 'Aplicativo desativado'}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label="Ativar ou desativar o aplicativo"
        disabled={loading || saving}
        onClick={toggle}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:cursor-wait disabled:opacity-50 ${on ? 'bg-emerald-500' : 'bg-slate-300'}`}
      >
        <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}