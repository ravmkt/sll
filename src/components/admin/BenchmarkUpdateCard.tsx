import { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

const sb: any = supabase;

type Issue = { sector: string; reason: string };
type Result = { updated: number; year: number; summary: string; failed: Issue[]; rejected: Issue[]; unchanged: string[] };

export default function BenchmarkUpdateCard() {
  const [last, setLast] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

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
      setResult(data as Result);
      if (data.updated > 0) toast.success(`Benchmarks atualizados: ${data.updated} setores.`);
      else toast.warning('Nenhum setor foi atualizado.');
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const issues = result ? [...result.failed, ...result.rejected] : [];

  return (
    <section className="space-y-3 rounded-2xl border border-slate-800 bg-[#111524] p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-bold text-yellow-300">Benchmarks de mercado por setor</h2>
          <p className="mt-0.5 text-[13px] text-slate-500">
            {count} {count === 1 ? 'setor' : 'setores'} · última atualização:{' '}
            {last ? new Date(last).toLocaleString('pt-BR') : 'nunca'} · a IA pesquisa fontes na web e valida os valores antes de gravar.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={run}
          className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#0094eb] px-4 py-2 text-[13px] font-bold text-white disabled:opacity-40"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {busy ? 'Pesquisando na web...' : 'Atualizar Benchmarks via IA'}
        </button>
      </div>

      {result && (
        <div className="space-y-2">
          <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-[13px] text-emerald-200">{result.summary}</p>
          {issues.length > 0 && (
            <details className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-[13px] text-amber-200">
              <summary className="cursor-pointer font-semibold">{issues.length} ponto(s) não aplicado(s) pela validação</summary>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {issues.map((i, n) => (
                  <li key={n}><strong>{i.sector}</strong>: {i.reason}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </section>
  );
}