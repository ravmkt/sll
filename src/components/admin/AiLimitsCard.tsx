import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const sb: any = supabase;
const INPUT = 'h-9 w-28 rounded-lg border border-white/10 bg-[#0b0e1a] px-3 text-sm text-slate-100 outline-none focus:border-[#0094eb]';
const CHIP = 'cursor-pointer rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-slate-300 hover:bg-white/10';

export default function AiLimitsCard() {
  const [days, setDays] = useState('');
  const [saved, setSaved] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const r = await sb.from('admin_ai_settings').select('interval_days').eq('purpose', 'insights').maybeSingle();
    if (r.error) { setMsg({ ok: false, text: r.error.message }); return; }
    const v = String(r.data?.interval_days ?? 3);
    setSaved(v);
    setDays(v);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const save = async () => {
    const n = Number(days);
    if (!Number.isInteger(n) || n < 1 || n > 90) { setMsg({ ok: false, text: 'Informe de 1 a 90 dias.' }); return; }
    setBusy(true);
    setMsg(null);
    const r = await sb.from('admin_ai_settings').update({ interval_days: n }).eq('purpose', 'insights').select('purpose');
    setBusy(false);
    if (r.error) { setMsg({ ok: false, text: r.error.message }); return; }
    if (!r.data?.length) { setMsg({ ok: false, text: 'Finalidade insights n\u00e3o encontrada em admin_ai_settings.' }); return; }
    setSaved(String(n));
    setMsg({ ok: true, text: 'Intervalo salvo.' });
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-[#111524] p-5">
      <h3 className="text-base font-extrabold text-white">Insights personalizados</h3>
      <p className="mt-0.5 text-xs text-slate-400">Usado quando os Insights forem ativados. S&oacute; reanalisa se os dados da loja mudarem.</p>
      <div className="mt-4 space-y-2">
        <label className="block text-xs text-slate-400">Reanalisar a cada (dias)</label>
        <input className={INPUT} inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value.replace(/\D/g, ''))} />
        <div className="flex flex-wrap gap-2">
          {[1, 3, 5, 7].map((n) => (
            <button key={n} type="button" className={CHIP} onClick={() => setDays(String(n))}>{n} {n === 1 ? 'dia' : 'dias'}</button>
          ))}
        </div>
      </div>
      <div className="mt-4 flex items-center justify-end gap-3 border-t border-white/10 pt-3">
        {msg && <span className={`text-xs font-bold ${msg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{msg.text}</span>}
        <button type="button" disabled={busy || days === saved} onClick={() => void save()} className="cursor-pointer rounded-lg bg-emerald-500 px-4 py-2 text-[13px] font-bold text-white hover:bg-emerald-600 disabled:opacity-40">
          {busy ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </section>
  );
}