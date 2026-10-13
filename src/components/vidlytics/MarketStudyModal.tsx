import { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

const sb: any = supabase;

export default function BenchmarkUpdateCard() {
  const [last, setLast] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await sb.from('sector_benchmarks').select('updated_at').order('updated_at', { ascending: false });
    const rows = (data as { updated_at: string }[]) || [];
    setCount(rows.length);
    setLast(rows[0]?.updated_at ?? null);
  }, []);

  useEffect(() => { load(); }, [load]);

  const run = async () => {
    setBusy(true);
    try {
      const { data, error } = await sb.functions.invoke('update-sector-benchmarks', { body: {} });
      if (error || data?.error) throw new Error(data?.error || error?.message || 'Falha ao atualizar.');
      const miss = (data?.missing as string[] | undefined) ?? [];
      toast.success(`Benchmarks atualizados: ${data.updated} setores.`);
      if (miss.length) toast.warning(`Setores sem correspondência: ${miss.join(', ')}`);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-[#111524] p-4">
      <div>
        <h2 className="text-sm font-bold text-yellow-300">Benchmarks de mercado por setor</h2>
        <p className="mt-0.5 text-[11px] text-slate-500">
          {count} {count === 1 ? 'setor' : 'setores'} · última atualização:{' '}
          {last ? new Date(last).toLocaleString('pt-BR') : 'nunca'} · rotina automática em 1º de janeiro e 1º de julho.
        </p>
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={run}
        className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#0094eb] px-4 py-2 text-xs font-bold text-white disabled:opacity-40"
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
        Atualizar Benchmarks de Mercado
      </button>
    </section>
  );
}
