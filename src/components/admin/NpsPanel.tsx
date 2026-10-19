import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  getNpsConfig, getNpsResults, resetNpsStore, saveNpsConfig,
  type NpsConfig, type NpsResults,
} from '@/services/admin/npsAdmin';

const LABELS: Record<string, string> = {
  dificuldade_instalacao: 'Dificuldade na instalação',
  poucos_recursos: 'Faltam funcionalidades',
  preco: 'Preço',
  desempenho: 'Desempenho / lentidão',
  suporte: 'Suporte',
  outro: 'Outro',
  vidlytics: 'Vidlytics (vídeos)',
  live_commerce: 'Live Commerce',
  analytics: 'Analytics',
  noah: 'Noah (assistente)',
  widgets: 'Widgets',
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const INPUT = 'h-9 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none focus:border-amber-500';
const CARD = 'rounded-xl border border-slate-700 bg-slate-800/60 p-4';

function Num({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <label className="block text-xs font-semibold text-slate-400">
      {label}
      <input type="number" min={0} className={`${INPUT} mt-1`} value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))} />
    </label>
  );
}

function Bars({ items }: { items: { key: string; count: number }[] }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  if (!items.length) return <p className="text-sm text-slate-500">Sem dados no período.</p>;
  return (
    <div className="space-y-2">
      {items.map((i) => (
        <div key={i.key}>
          <div className="flex justify-between text-xs text-slate-300">
            <span>{LABELS[i.key] ?? i.key}</span><span className="tabular-nums">{i.count}</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-slate-700">
            <div className="h-2 rounded-full bg-amber-500" style={{ width: `${(i.count / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function NpsPanel() {
  const [cfg, setCfg] = useState<NpsConfig | null>(null);
  const [idsText, setIdsText] = useState('');
  const [res, setRes] = useState<NpsResults | null>(null);
  const [days, setDays] = useState(90);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [resetId, setResetId] = useState('');

  const loadResults = useCallback(async () => {
    try { setRes(await getNpsResults(days)); } catch (e: any) { setErr(e?.message ?? 'Erro ao carregar resultados'); }
  }, [days]);

  useEffect(() => {
    getNpsConfig()
      .then((c) => { setCfg(c); setIdsText((c.store_ids ?? []).join('\n')); })
      .catch((e: any) => setErr(e?.message ?? 'Erro ao carregar configuração'));
  }, []);
  useEffect(() => { void loadResults(); }, [loadResults]);

  const save = async () => {
    if (!cfg) return;
    setErr(null); setMsg(null);
    const ids = idsText.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);
    const bad = ids.find((i) => !UUID.test(i));
    if (cfg.target === 'stores' && bad) { setErr(`ID inválido: ${bad}`); return; }
    if (cfg.target === 'stores' && ids.length === 0) { setErr('Informe ao menos uma loja ou escolha "Todas as lojas".'); return; }
    setSaving(true);
    try {
      await saveNpsConfig({ ...cfg, store_ids: ids });
      setMsg('Configuração salva.');
    } catch (e: any) { setErr(e?.message ?? 'Erro ao salvar'); }
    setSaving(false);
  };

  const reset = async () => {
    setErr(null); setMsg(null);
    if (!UUID.test(resetId.trim())) { setErr('Informe o ID (UUID) da loja.'); return; }
    if (!window.confirm('Apagar as respostas e dispensas de NPS desta loja? Não dá para desfazer.')) return;
    try {
      const n = await resetNpsStore(resetId.trim());
      setMsg(`NPS reiniciado: ${n} resposta(s) removida(s).`);
      void loadResults();
    } catch (e: any) { setErr(e?.message ?? 'Erro ao reiniciar'); }
  };

  if (!cfg) return <div className="flex items-center gap-2 text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>;

  const npsColor = res?.nps == null ? 'text-slate-400' : res.nps >= 50 ? 'text-emerald-400' : res.nps >= 0 ? 'text-amber-400' : 'text-rose-400';

  return (
    <div className="space-y-6">
      {(err || msg) && (
        <div className={`rounded-lg px-3 py-2 text-sm ${err ? 'bg-rose-500/10 text-rose-300' : 'bg-emerald-500/10 text-emerald-300'}`}>{err ?? msg}</div>
      )}

      <section className={CARD}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-100">Configuração do NPS</h3>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={cfg.enabled} onChange={(e) => setCfg({ ...cfg, enabled: e.target.checked })} />
            {cfg.enabled ? 'Ligado' : 'Desligado'}
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Num label="Dias mínimos após o cadastro" value={cfg.min_days_after_signup} onChange={(n) => setCfg({ ...cfg, min_days_after_signup: n })} />
          <Num label="Intervalo entre respostas (dias)" value={cfg.cooldown_days} onChange={(n) => setCfg({ ...cfg, cooldown_days: n })} />
          <Num label="Se dispensar, voltar em (dias)" value={cfg.dismiss_days} onChange={(n) => setCfg({ ...cfg, dismiss_days: n })} />
        </div>
        <div className="mt-3 space-y-2">
          <label className="block text-xs font-semibold text-slate-400">
            Público
            <select className={`${INPUT} mt-1`} value={cfg.target} onChange={(e) => setCfg({ ...cfg, target: e.target.value as NpsConfig['target'] })}>
              <option value="all">Todas as lojas</option>
              <option value="stores">Apenas lojas específicas</option>
            </select>
          </label>
          {cfg.target === 'stores' && (
            <textarea className={`${INPUT} h-24 py-2 font-mono text-xs`} placeholder="Um ID de loja (UUID) por linha"
              value={idsText} onChange={(e) => setIdsText(e.target.value)} />
          )}
        </div>
        <button type="button" onClick={() => void save()} disabled={saving}
          className="mt-4 inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-amber-500 px-4 text-sm font-bold text-slate-900 hover:bg-amber-400 disabled:opacity-50">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
        </button>
      </section>

      <section className={CARD}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-100">Resultados</h3>
          <select className="h-8 rounded-lg border border-slate-700 bg-slate-900 px-2 text-xs text-slate-200" value={days} onChange={(e) => setDays(Number(e.target.value))}>
            {[30, 90, 180, 365].map((d) => <option key={d} value={d}>Últimos {d} dias</option>)}
          </select>
        </div>
        {!res ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <div className="rounded-lg bg-slate-900 p-3 text-center"><div className={`text-3xl font-black ${npsColor}`}>{res.nps ?? '—'}</div><div className="text-[11px] text-slate-400">NPS</div></div>
              <div className="rounded-lg bg-slate-900 p-3 text-center"><div className="text-2xl font-black text-slate-100">{res.total}</div><div className="text-[11px] text-slate-400">Respostas</div></div>
              <div className="rounded-lg bg-slate-900 p-3 text-center"><div className="text-2xl font-black text-emerald-400">{res.promoters}</div><div className="text-[11px] text-slate-400">Promotores (9-10)</div></div>
              <div className="rounded-lg bg-slate-900 p-3 text-center"><div className="text-2xl font-black text-amber-400">{res.passives}</div><div className="text-[11px] text-slate-400">Neutros (7-8)</div></div>
              <div className="rounded-lg bg-slate-900 p-3 text-center"><div className="text-2xl font-black text-rose-400">{res.detractors}</div><div className="text-[11px] text-slate-400">Detratores (0-6)</div></div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold text-slate-400">Distribuição das notas</p>
              <Bars items={res.distribution.map((d) => ({ key: String(d.score), count: d.count }))} />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div><p className="mb-2 text-xs font-semibold text-slate-400">Maior dor</p><Bars items={res.pains} /></div>
              <div><p className="mb-2 text-xs font-semibold text-slate-400">Funcionalidade preferida</p><Bars items={res.features} /></div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold text-slate-400">Comentários</p>
              {res.comments.length === 0 ? <p className="text-sm text-slate-500">Nenhum comentário no período.</p> : (
                <ul className="space-y-2">
                  {res.comments.map((c, i) => (
                    <li key={i} className="rounded-lg bg-slate-900 p-3 text-sm text-slate-200">
                      <div className="mb-1 flex justify-between text-[11px] text-slate-400">
                        <span>{c.store ?? 'Loja'} · nota {c.score}</span>
                        <span>{new Date(c.created_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                      {c.comment}{c.pain_other ? <span className="block text-slate-400">Outro: {c.pain_other}</span> : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </section>

      <section className={CARD}>
        <h3 className="mb-1 text-sm font-bold text-slate-100">Reiniciar NPS de uma loja (teste)</h3>
        <p className="mb-3 text-xs text-slate-400">Apaga as respostas e dispensas da loja, e o convite volta a aparecer.</p>
        <div className="flex gap-2">
          <input className={INPUT} placeholder="ID da loja (UUID)" value={resetId} onChange={(e) => setResetId(e.target.value)} />
          <button type="button" onClick={() => void reset()}
            className="h-9 shrink-0 cursor-pointer rounded-lg border border-rose-500/50 px-4 text-sm font-bold text-rose-300 hover:bg-rose-500/10">Reiniciar</button>
        </div>
      </section>
    </div>
  );
}