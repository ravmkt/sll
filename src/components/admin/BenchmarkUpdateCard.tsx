import { useCallback, useEffect, useState } from 'react';
import { CalendarClock, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { BENCHMARKS_UPDATED_EVENT } from '@/components/admin/BenchmarkAlerts';

const sb: any = supabase;

type Issue = { sector: string; reason: string };
type Result = {
  updated: number;
  year: number;
  summary: string;
  failed: Issue[];
  rejected: Issue[];
  unchanged: string[];
  quota_exceeded?: boolean;
};

function nextAuto(): Date {
  const n = Date.now();
  const y = new Date().getUTCFullYear();
  const c = [Date.UTC(y, 0, 2, 9), Date.UTC(y, 6, 1, 9), Date.UTC(y + 1, 0, 2, 9)];
  return new Date(c.find((t) => t > n) ?? c[2]);
}

export default function BenchmarkUpdateCard() {
  const [last, setLast] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [progress, setProgress] = useState('');

  const load = useCallback(async () => {
    const { data } = await sb.from('sector_benchmarks').select('updated_at').order('updated_at', { ascending: false });
    const rows = (data as { updated_at: string }[]) || [];
    setCount(rows.length);
    setLast(rows[0]?.updated_at ?? null);
  }, []);

  const loadCfg = useCallback(async () => {
    const { data } = await sb.from('admin_ai_settings').select('enabled').eq('purpose', 'benchmarks').maybeSingle();
    if (data) setEnabled(!!data.enabled);
  }, []);

  useEffect(() => { void load(); void loadCfg(); }, [load, loadCfg]);

  const next = nextAuto();

  const run = async (dry = false) => {
    setBusy(true);
    const LIMIT = 1;
    const PAUSE_S = 10;
    const RETRY_WAIT_S = 60;
    const MAX_RETRY = 2;
    const wait = async (s: number, label: string) => {
      for (let i = s; i > 0; i--) {
        setProgress(`${label} ${i}s...`);
        await new Promise((r) => setTimeout(r, 1000));
      }
    };
    const acc: any = { updated: 0, unchanged: [], failed: [], rejected: [], quota_exceeded: false, dry_run: dry, year: new Date().getFullYear(), models: [], web_search: false };
    try {
      let offset = 0;
      let total = 0;
      for (let round = 1; round <= 20; round++) {
        const tag = `Rodada ${round}${total ? ` de ${Math.ceil(total / LIMIT)}` : ''}`;
        let data: any = null;
        let callError = '';
        for (let attempt = 0; attempt <= MAX_RETRY; attempt++) {
          setProgress(`${tag}${attempt ? ` (tentativa ${attempt + 1})` : ''}...`);
          const res = await sb.functions.invoke('update-sector-benchmarks', { body: { offset, limit: LIMIT, ...(dry ? { dry_run: true } : {}) } });
          if (res.error || res.data?.error) {
            callError = res.data?.error || res.error?.message || 'Falha na chamada.';
            data = null;
            break;
          }
          data = res.data;
          if (!data.quota_exceeded) break;
          if (attempt < MAX_RETRY) await wait(RETRY_WAIT_S, `${tag}: cota atingida, aguardando`);
        }
        if (!data) {
          acc.failed.push({ sector: `Rodada ${round}`, reason: callError });
          break;
        }
        acc.updated += data.updated ?? 0;
        acc.unchanged.push(...(data.unchanged ?? []));
        acc.failed.push(...(data.failed ?? []));
        acc.rejected.push(...(data.rejected ?? []));
        acc.year = data.year ?? acc.year;
        total = data.total ?? total;
        if (data.quota_exceeded) { acc.quota_exceeded = true; break; }
        const nx = data.next_offset ?? (total && offset + LIMIT < total ? offset + LIMIT : null);
        if (nx == null || nx <= offset) break;
        offset = nx;
        await wait(PAUSE_S, `${tag} conclu\u00edda. Pr\u00f3xima em`);
      }
      const label = dry ? 'simulados' : 'atualizados';
      acc.summary = acc.quota_exceeded && acc.updated === 0
        ? 'A cota do Gemini foi excedida (429).'
        : `Benchmarks ${acc.year} ${label}: ${acc.updated} de ${total || '?'} setores.`;
      setResult(acc as Result);
      if (acc.quota_exceeded) toast.error('Cota do Gemini excedida (429) mesmo ap\u00f3s novas tentativas.');
      else if (dry) toast.success(`Simula\u00e7\u00e3o: ${acc.updated} setores teriam sido atualizados. Nada foi gravado.`);
      else if (acc.updated > 0) toast.success(`Benchmarks atualizados: ${acc.updated} setores.`);
      else toast.warning('Nenhum setor foi atualizado.');
      await load();
      window.dispatchEvent(new Event(BENCHMARKS_UPDATED_EVENT));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      setProgress('');
    }
  };

  const issues = result ? [...result.failed, ...result.rejected] : [];

  return (
    <div className="space-y-3 border-t border-white/10 pt-3">
      <div className="space-y-1 text-xs text-slate-400">
        <p>
          {count} {count === 1 ? 'setor' : 'setores'} {'\u00b7'} {'\u00fa'}ltima atualiza{'\u00e7\u00e3'}o: {last ? new Date(last).toLocaleString('pt-BR') : 'nunca'}
        </p>
        <p className="flex items-center gap-1.5">
          <CalendarClock className="h-3.5 w-3.5" />
          {'Pr\u00f3xima atualiza\u00e7\u00e3o autom\u00e1tica: ' + next.toLocaleDateString('pt-BR') + ' \u00e0s 06:00 (Bras\u00edlia)'}
        </p>
        {!enabled && <p className="font-bold text-amber-300">{'A IA de benchmarks est\u00e1 desligada. Ligue e salve acima para atualizar.'}</p>}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || !enabled}
          onClick={() => void run(false)}
          className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#0094eb] px-4 py-2 text-[13px] font-bold text-white disabled:opacity-40"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {busy ? (progress || 'Pesquisando na web...') : 'Atualizar Benchmarks via IA'}
        </button>
        <button
          type="button"
          disabled={busy || !enabled}
          onClick={() => void run(true)}
          className="cursor-pointer rounded-lg border border-slate-600 px-4 py-2 text-[13px] font-bold text-slate-200 hover:bg-white/10 disabled:opacity-40"
        >
          Simular (sem gravar)
        </button>
      </div>

      {result && (
        <div className="space-y-2">
          <p className={`rounded-xl border p-3 text-[13px] ${result.quota_exceeded ? 'border-red-500/30 bg-red-500/10 text-red-200' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'}`}>
            {result.summary}
          </p>
          {issues.length > 0 && (
            <details className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-[13px] text-amber-200">
              <summary className="cursor-pointer font-semibold">{issues.length} ponto(s) n{'\u00e3'}o aplicado(s) pela valida{'\u00e7\u00e3'}o</summary>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {issues.map((i, n) => (
                  <li key={n}><strong>{i.sector}</strong>: {i.reason}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}