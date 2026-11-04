import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const sb: any = supabase;
const INPUT = 'h-9 w-28 rounded-lg border border-white/10 bg-[#0b0e1a] px-3 text-sm text-slate-100 outline-none focus:border-[#0094eb]';
const CHIP = 'cursor-pointer rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-slate-300 hover:bg-white/10';

const startOfToday = () =>
  new Date(`${new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })}T00:00:00-03:00`);

export default function AiLimitsCard() {
  const [daily, setDaily] = useState('');
  const [days, setDays] = useState('');
  const [saved, setSaved] = useState({ daily: '', days: '' });
  const [peak, setPeak] = useState<{ today: number; week: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const r = await sb
      .from('admin_ai_settings')
      .select('purpose, daily_limit_per_store, interval_days')
      .in('purpose', ['support', 'insights']);
    if (r.error) { setMsg({ ok: false, text: r.error.message }); return; }
    const rows: any[] = r.data || [];
    const s = rows.find((x) => x.purpose === 'support');
    const i = rows.find((x) => x.purpose === 'insights');
    const v = { daily: String(s?.daily_limit_per_store ?? 0), days: String(i?.interval_days ?? 3) };
    setSaved(v); setDaily(v.daily); setDays(v.days);

    const now = new Date();
    const [t, w] = await Promise.all([
      sb.schema('noah').rpc('admin_usage_summary', { p_from: startOfToday().toISOString(), p_to: now.toISOString() }),
      sb.schema('noah').rpc('admin_usage_summary', { p_from: new Date(now.getTime() - 7 * 86400000).toISOString(), p_to: now.toISOString() }),
    ]);
    const maxCalls = (res: any) =>
      Math.max(0, ...((res.data || []) as any[]).filter((x) => x.purpose === 'support' && x.store_id).map((x) => Number(x.calls) || 0));
    setPeak({ today: maxCalls(t), week: maxCalls(w) });
  }, []);

  useEffect(() => { void load(); }, [load]);

  const dirty = daily !== saved.daily || days !== saved.days;

  const save = async () => {
    const d = Number(daily);
    const n = Number(days);
    if (!Number.isInteger(d) || d < 0 || d > 100000) { setMsg({ ok: false, text: 'Perguntas por dia: informe um número inteiro (0 = sem limite).' }); return; }
    if (!Number.isInteger(n) || n < 1 || n > 90) { setMsg({ ok: false, text: 'Intervalo dos Insights: informe de 1 a 90 dias.' }); return; }
    setBusy(true);
    setMsg(null);
    const a = await sb.from('admin_ai_settings').update({ daily_limit_per_store: d }).eq('purpose', 'support').select('purpose');
    const b = await sb.from('admin_ai_settings').update({ interval_days: n }).eq('purpose', 'insights').select('purpose');
    setBusy(false);
    const err = a.error || b.error;
    if (err) { setMsg({ ok: false, text: err.message }); return; }
    if (!a.data?.length || !b.data?.length) { setMsg({ ok: false, text: 'Finalidade não encontrada em admin_ai_settings (support/insights).' }); return; }
    setSaved({ daily: String(d), days: String(n) });
    setMsg({ ok: true, text: 'Limites salvos.' });
  };

  const dailyNum = Number(saved.daily) || 0;

  return (
    <section className="rounded-2xl border border-white/10 bg-[#111524] p-5">
      <h3 className="text-base font-extrabold text-white">Limites de uso da IA</h3>
      <p className="mt-0.5 text-xs text-slate-400">Ajuste conforme o consumo real. As mudanças valem na próxima pergunta, sem novo deploy.</p>

      <div className="mt-4 grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-xs text-slate-400">Suporte Noah: perguntas por loja, por dia (0 = sem limite)</label>
          <input className={INPUT} inputMode="numeric" value={daily} onChange={(e) => setDaily(e.target.value.replace(/\D/g, ''))} />
          <p className="text-xs text-slate-500">
            {dailyNum > 0 ? `Ao passar de ${dailyNum} perguntas no dia, o chat orienta a voltar amanhã ou chamar o WhatsApp.` : 'Sem limite diário (vale só a franquia do plano).'}
          </p>
          {peak && (
            <p className="text-xs text-slate-500">
              Maior uso de uma loja: <b className="text-slate-300">{peak.today}</b> hoje e <b className="text-slate-300">{peak.week}</b> nos últimos 7 dias
              (média de <b className="text-slate-300">{(peak.week / 7).toFixed(1).replace('.', ',')}</b> por dia).
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-xs text-slate-400">Insights personalizados: reanalisar a cada (dias)</label>
          <input className={INPUT} inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value.replace(/\D/g, ''))} />
          <div className="flex flex-wrap gap-2">
            {[1, 3, 5, 7].map((n) => (
              <button key={n} type="button" className={CHIP} onClick={() => setDays(String(n))}>{n} {n === 1 ? 'dia' : 'dias'}</button>
            ))}
          </div>
          <p className="text-xs text-slate-500">Usado quando os Insights forem ativados. Só reanalisa se os dados da loja mudarem.</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-3 border-t border-white/10 pt-3">
        {msg && <span className={`text-xs font-bold ${msg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{msg.text}</span>}
        <button
          type="button"
          disabled={busy || !dirty}
          onClick={() => void save()}
          className="cursor-pointer rounded-lg bg-emerald-500 px-4 py-2 text-[13px] font-bold text-white hover:bg-emerald-600 disabled:opacity-40"
        >
          {busy ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </section>
  );
}