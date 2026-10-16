import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const inputCls =
  'w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-[15px] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500';
const labelCls = 'block text-[13px] font-semibold uppercase tracking-wide text-slate-400 mb-1';

export const INTERNAL_LINKS = [
  { label: 'Sem link', url: '' },
  { label: 'Planos', url: '/dashboard/planos' },
  { label: 'Minhas assinaturas', url: '/dashboard/assinaturas' },
  { label: 'Módulos', url: '/dashboard/modules' },
  { label: 'Vidlytics', url: '/dashboard/modules/vidlytics' },
  { label: 'Stream Sell', url: '/dashboard/modules/live-commerce' },
  { label: 'Integração', url: '/dashboard/integracao' },
  { label: 'Produtos', url: '/dashboard/produtos' },
  { label: 'Métricas', url: '/dashboard/metricas' },
  { label: 'Dicas', url: '/dashboard/dicas' },
  { label: 'Afiliados', url: '/dashboard/afiliados' },
  { label: 'Configurações', url: '/dashboard/settings' },
];

export function LinkPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const known = INTERNAL_LINKS.find((l) => l.url === value);
  const [custom, setCustom] = useState(!!value && !known);
  const sel = custom ? '__custom' : known ? known.url : '';
  return (
    <div className="space-y-2">
      <select
        className={inputCls}
        value={sel}
        onChange={(e) => {
          if (e.target.value === '__custom') { setCustom(true); return; }
          setCustom(false);
          onChange(e.target.value);
        }}
      >
        {INTERNAL_LINKS.map((l) => <option key={l.url || 'none'} value={l.url}>{l.label}</option>)}
        <option value="__custom">Link personalizado...</option>
      </select>
      {custom && (
        <input className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} placeholder="/precos ou https://..." />
      )}
    </div>
  );
}

type StoreRow = { id: string; contact_name: string | null; owner_contact_email: string | null };

export function StorePicker({ value, onChange }: { value: string | null | undefined; onChange: (id: string | null) => void }) {
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (supabase as any)
      .from('stores')
      .select('id,contact_name,owner_contact_email')
      .order('contact_name', { ascending: true })
      .limit(1000)
      .then(({ data, error }: any) => {
        if (error) setErr(error.message);
        else setStores((data ?? []) as StoreRow[]);
      });
  }, []);

  return (
    <div className="md:col-span-2">
      <label className={labelCls}>Loja que vai receber</label>
      <select className={inputCls} value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">Selecione a loja...</option>
        {stores.map((s) => (
          <option key={s.id} value={s.id}>
            {(s.contact_name || 'Sem nome') + (s.owner_contact_email ? ' (' + s.owner_contact_email + ')' : '')}
          </option>
        ))}
      </select>
      {err && <p className="mt-1 text-[13px] text-rose-400">{err}</p>}
    </div>
  );
}