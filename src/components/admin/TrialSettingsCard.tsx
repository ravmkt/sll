import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { invalidateTrialDays } from '@/hooks/useTrialDays';

const sb: any = supabase;

export default function TrialSettingsCard() {
  const [days, setDays] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    sb.rpc('get_trial_days').then(({ data, error }: any) => {
      if (!error && data != null) setDays(String(data));
    });
  }, []);

  const save = async () => {
    const n = Number(days);
    if (!Number.isInteger(n) || n < 1 || n > 90) {
      setMsg({ ok: false, text: 'Informe um número inteiro entre 1 e 90.' });
      return;
    }
    setSaving(true);
    setMsg(null);
    const { error } = await sb.rpc('admin_set_trial_days', { p_days: n });
    setSaving(false);
    if (error) {
      setMsg({ ok: false, text: error.message });
      return;
    }
    invalidateTrialDays();
    setMsg({ ok: true, text: `Salvo. Os novos testes terão ${n} dias.` });
  };

  return (
    <div className="mb-6 rounded-2xl border border-slate-800 bg-[#111524] p-5">
      <h3 className="text-sm font-black text-white">Período de teste gratuito</h3>
      <p className="mt-1 text-xs text-slate-400">
        Vale para todos os módulos, landing, planos e cadastro. Só afeta testes novos: quem já está testando mantém a data original.
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Dias de teste</label>
          <input
            type="number"
            min={1}
            max={90}
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className="w-32 rounded-lg border border-slate-700 bg-[#0b0e1a] px-3 py-2 text-sm text-white outline-none focus:border-[#0094eb]"
          />
        </div>
        <button
          type="button"
          disabled={saving || !days}
          onClick={save}
          className="cursor-pointer rounded-lg bg-[#0094eb] px-4 py-2 text-xs font-bold text-white hover:bg-[#0082cf] disabled:opacity-50"
        >
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
        {msg && <span className={`text-xs font-bold ${msg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{msg.text}</span>}
      </div>
    </div>
  );
}