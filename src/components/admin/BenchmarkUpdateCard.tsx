import { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw, Save } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

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
type Cfg = { model: string; fallback_model: string; use_web_search: boolean; enabled: boolean };

const DEFAULT_CFG: Cfg = {
  model: 'gemini-flash-latest',
  fallback_model: 'gemini-3.1-flash-lite',
  use_web_search: true,
  enabled: true,
};

const selectCls = 'w-full rounded-lg border border-slate-700 bg-[#0b0e1a] px-3 py-2 text-[13px] text-slate-200';

export default function BenchmarkUpdateCard() {
  const [last, setLast] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [cfg, setCfg] = useState<Cfg>(DEFAULT_CFG);
  const [models, setModels] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await sb.from('sector_benchmarks').select('updated_at').order('updated_at', { ascending: false });
    const rows = (data as { updated_at: string }[]) || [];
    setCount(rows.length);
    setLast(rows[0]?.updated_at ?? null);
  }, []);

  const loadCfg = useCallback(async () => {
    const { data } = await sb
      .from('admin_ai_settings')
      .select('model, fallback_model, use_web_search, enabled')
      .eq('purpose', 'benchmarks')
      .maybeSingle();
    if (data) setCfg({ ...DEFAULT_CFG, ...data, fallback_model: data.fallback_model ?? '' });
  }, []);

  const loadModels = useCallback(async () => {
    const { data, error } = await sb.functions.invoke('update-sector-benchmarks', { body: { action: 'list_models' } });
    if (!error && Array.isArray(data?.models)) setModels(data.models as string[]);
  }, []);

  useEffect(() => { load(); loadCfg(); loadModels(); }, [load, loadCfg, loadModels]);

  const options = [...new Set([...models, cfg.model, cfg.fallback_model].filter(Boolean))];

  const saveCfg = async () => {
    setSaving(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await sb.from('admin_ai_settings').upsert(
        {
          purpose: 'benchmarks',
          provider: 'gemini',
          model: cfg.model,
          fallback_model: cfg.fallback_model || null,
          use_web_search: cfg.use_web_search,
          enabled: cfg.enabled,
          updated_at: new Date().toISOString(),
          updated_by: auth.user?.id ?? null,
        },
        { onConflict: 'purpose' },
      );
      if (error) throw new Error(error.message);
      toast.success('IA dos benchmarks atualizada.');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const run = async () => {
    setBusy(true);
    try {
      const { data, error } = await sb.functions.invoke('update-sector-benchmarks', { body: {} });
      if (error || data?.error) throw new Error(data?.error || error?.message || 'Falha ao atualizar.');
      setResult(data as Result);
      if (data.updated > 0) toast.success(`Benchmarks atualizados: ${data.updated} setores.`);
      else if (data.quota_exceeded) toast.error('Cota do Gemini excedida (429).');
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
          disabled={busy || !cfg.enabled}
          onClick={run}
          className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#0094eb] px-4 py-2 text-[13px] font-bold text-white disabled:opacity-40"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {busy ? 'Pesquisando na web...' : 'Atualizar Benchmarks via IA'}
        </button>
      </div>

      <div className="space-y-3 rounded-xl border border-slate-800 bg-[#0d1120] p-3">
        <h3 className="text-[13px] font-bold text-slate-200">IA dos benchmarks</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-[12px] text-slate-400">
            Modelo principal
            <select className={selectCls} value={cfg.model} onChange={(e) => setCfg({ ...cfg, model: e.target.value })}>
              {options.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-[12px] text-slate-400">
            Modelo de reserva
            <select className={selectCls} value={cfg.fallback_model} onChange={(e) => setCfg({ ...cfg, fallback_model: e.target.value })}>
              <option value="">Nenhum</option>
              {options.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4 text-[13px] text-slate-300">
            <label className="inline-flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={cfg.use_web_search} onChange={(e) => setCfg({ ...cfg, use_web_search: e.target.checked })} />
              Busca na web
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={cfg.enabled} onChange={(e) => setCfg({ ...cfg, enabled: e.target.checked })} />
              IA ativa
            </label>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={saveCfg}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-600 px-3 py-1.5 text-[13px] font-semibold text-slate-200 disabled:opacity-40"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Salvar
          </button>
        </div>
      </div>

      {result && (
        <div className="space-y-2">
          <p className={`rounded-xl border p-3 text-[13px] ${result.quota_exceeded ? 'border-red-500/30 bg-red-500/10 text-red-200' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'}`}>
            {result.summary}
          </p>
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