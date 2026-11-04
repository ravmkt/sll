import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { DollarSign, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getCostSettings, saveCostSettings, syncFx } from '@/services/admin/costsAdmin';
import { notifyFxUpdated } from '@/hooks/admin/useFxRate';

const sb: any = supabase;
const fmt4 = (v: number) => v.toFixed(4).replace('.', ',');
const INPUT = 'h-9 w-36 rounded-lg border border-slate-700 bg-[#0b0e1a] px-3 text-right text-sm font-bold text-white outline-none focus:border-[#0094eb]';
const BTN = 'inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg px-4 text-[13px] font-bold disabled:opacity-40';

export default function FxRateCard() {
  const [rate, setRate] = useState<number | null>(null);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [auto, setAuto] = useState(true);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState<'sync' | 'save' | 'auto' | null>(null);

  const load = useCallback(async () => {
    try {
      const s = await getCostSettings();
      if (!s) return;
      setRate(s.usd_to_brl_rate);
      setSyncedAt(s.last_currency_sync_at);
      setAuto(!!s.auto_sync_currency);
      setValue(fmt4(s.usd_to_brl_rate));
    } catch (e: any) {
      toast.error(e?.message || 'N\u00e3o foi poss\u00edvel carregar a cota\u00e7\u00e3o.');
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Mantem o custo da IA (noah_settings.usd_brl) igual a cotacao global
  const mirror = async (v: number) => {
    const r = await sb.from('noah_settings').update({ usd_brl: v }).eq('id', 1);
    if (r.error) toast.warning('Cota\u00e7\u00e3o salva, mas o custo da IA n\u00e3o foi sincronizado: ' + r.error.message);
  };

  const online = async () => {
    setBusy('sync');
    try {
      const s = await syncFx();
      await mirror(s.usd_to_brl_rate);
      notifyFxUpdated();
      await load();
      toast.success('Cota\u00e7\u00e3o atualizada: R$ ' + fmt4(s.usd_to_brl_rate));
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao atualizar a cota\u00e7\u00e3o.');
    } finally {
      setBusy(null);
    }
  };

  const manual = async () => {
    const v = Number(value.replace(',', '.'));
    if (!Number.isFinite(v) || v <= 0 || v > 100) { toast.error('Informe uma cota\u00e7\u00e3o v\u00e1lida.'); return; }
    setBusy('save');
    try {
      const now = new Date().toISOString();
      const r = await sb.from('infrastructure_cost_settings').update({ usd_to_brl_rate: v, last_currency_sync_at: now, updated_at: now }).eq('id', 1);
      if (r.error) throw new Error(r.error.message);
      await mirror(v);
      notifyFxUpdated();
      await load();
      toast.success('Cota\u00e7\u00e3o salva: R$ ' + fmt4(v));
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao salvar a cota\u00e7\u00e3o.');
    } finally {
      setBusy(null);
    }
  };

  const toggleAuto = async () => {
    const next = !auto;
    setBusy('auto');
    try {
      await saveCostSettings({ auto_sync_currency: next });
      setAuto(next);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao salvar.');
    } finally {
      setBusy(null);
    }
  };

  const parsed = Number(value.replace(',', '.'));
  const changed = rate !== null && Number.isFinite(parsed) && Math.abs(parsed - rate) > 0.00001;

  return (
    <section className="rounded-2xl border border-emerald-500/50 bg-[#111524] p-4">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
        <div className="flex min-w-[260px] flex-1 items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400"><DollarSign className="h-4 w-4" /></div>
          <div>
            <h2 className="text-[15px] font-bold text-white">{'Cota\u00e7\u00e3o do d\u00f3lar'}</h2>
            <p className="mt-0.5 text-[13px] text-slate-500">
              {'Vale para todo o SLL: custos, pre\u00e7os e IA. A "Cota\u00e7\u00e3o do dia" da barra lateral l\u00ea este valor.'}
            </p>
          </div>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{'Cota\u00e7\u00e3o atual'}</p>
          <p className="text-2xl font-black text-white">{rate ? 'US$ 1 = R$ ' + fmt4(rate) : '\u2014'}</p>
          <p className="text-[12px] text-slate-500">{syncedAt ? 'Atualizada em ' + new Date(syncedAt).toLocaleString('pt-BR') : 'Sem atualiza\u00e7\u00e3o registrada'}</p>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <label className="space-y-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            {'Valor manual (R$)'}
            <input className={INPUT + ' block'} value={value} onChange={(e) => setValue(e.target.value)} />
          </label>
          <button type="button" disabled={busy !== null || !changed} onClick={() => void manual()} className={BTN + ' bg-emerald-500 text-white hover:bg-emerald-600'}>
            {busy === 'save' ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Salvar
          </button>
          <button type="button" disabled={busy !== null} onClick={() => void online()} className={BTN + ' bg-[#0094eb] text-white hover:bg-[#0082cf]'}>
            {busy === 'sync' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} {'Atualizar cota\u00e7\u00e3o'}
          </button>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-[13px] text-slate-300">
          <input type="checkbox" className="accent-sky-500" checked={auto} disabled={busy !== null} onChange={() => void toggleAuto()} />
          {'Atualizar sozinho todo dia'}
        </label>
      </div>
    </section>
  );
}