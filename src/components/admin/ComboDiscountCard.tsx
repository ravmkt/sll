import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

const sb: any = supabase;

export default function ComboDiscountCard() {
  const [value, setValue] = useState('');
  const [saved, setSaved] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    sb.rpc('get_combo_discount').then(({ data, error }: any) => {
      if (error || data === null || data === undefined) return;
      setSaved(Number(data));
      setValue(String(data).replace('.', ','));
    });
  }, []);

  const save = async () => {
    const n = Number(value.replace(',', '.'));
    if (!Number.isFinite(n) || n < 0 || n > 90) {
      toast.error('Informe um desconto entre 0 e 90.');
      return;
    }
    setBusy(true);
    const { error } = await sb.rpc('admin_set_combo_discount', { p_percent: n });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSaved(n);
    toast.success('Desconto dos combos atualizado.');
  };

  const dirty = saved === null || Number(value.replace(',', '.')) !== saved;

  return (
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-[#111524] p-4">
      <div>
        <h2 className="text-sm font-bold text-yellow-300">Desconto dos combos</h2>
        <p className="mt-0.5 text-[11px] text-slate-500">
          Vale para combos fixos (ao recalcular o preço) e para o combo personalizado montado pelo cliente.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-9 w-20 rounded-lg border border-slate-700 bg-[#0b0e1a] px-2 text-right text-sm text-slate-100 outline-none focus:border-[#0094eb]"
        />
        <span className="text-sm text-slate-400">%</span>
        <button
          type="button"
          disabled={busy || !dirty}
          onClick={save}
          className="cursor-pointer rounded-lg bg-[#0094eb] px-4 py-2 text-xs font-bold text-white disabled:opacity-40"
        >
          {busy ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </section>
  );
}