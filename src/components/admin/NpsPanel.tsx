import { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Frown, Loader2, Meh, MessageSquareQuote, Plus, RotateCcw, Settings, Search, Smile, X } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  getNpsConfig, getNpsResults, listNpsOptions, listNpsStores, resetNpsStore, saveNpsConfig, saveNpsOptions, saveNpsTexts,
  type NpsOptionRow, type NpsStoreRow,
  type NpsConfig, type NpsCount, type NpsResults,
} from '@/services/admin/npsAdmin';
import { getNpsTexts, NPS_TEXT_DEFAULTS, NPS_TEXT_FIELDS } from '@/services/feedback';

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
const CARD = 'rounded-2xl border border-slate-700/80 bg-slate-800/60 p-5';
const RED = '#f43f5e';
const YEL = '#f59e0b';
const GRN = '#10b981';

const scoreColor = (s: number) => (s >= 9 ? GRN : s >= 7 ? YEL : RED);
const scoreLabel = (s: number) => (s >= 9 ? 'Promotor' : s >= 7 ? 'Neutro' : 'Detrator');
const pctOf = (n: number, t: number) => (t > 0 ? Math.round((n / t) * 100) : 0);

function zone(nps: number | null) {
  if (nps == null) return { label: 'Sem dados', color: '#64748b' };
  if (nps >= 75) return { label: 'Zona de excelência', color: GRN };
  if (nps >= 50) return { label: 'Zona de qualidade', color: '#34d399' };
  if (nps >= 0) return { label: 'Zona de aperfeiçoamento', color: YEL };
  return { label: 'Zona crítica', color: RED };
}

function Num({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <label className="block text-xs font-semibold text-slate-400">
      {label}
      <input type="number" min={0} className={`${INPUT} mt-1`} value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))} />
    </label>
  );
}

function Gauge({ nps }: { nps: number | null }) {
  const z = zone(nps);
  const len = Math.PI * 80;
  const ratio = nps == null ? 0 : (Math.max(-100, Math.min(100, nps)) + 100) / 200;
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 118" className="w-full max-w-[260px]" role="img" aria-label={`NPS ${nps ?? 'sem dados'}`}>
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#334155" strokeWidth="16" strokeLinecap="round" />
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke={z.color} strokeWidth="16" strokeLinecap="round"
          strokeDasharray={`${len * ratio} ${len}`} style={{ transition: 'stroke-dasharray .6s ease' }} />
        <text x="100" y="88" textAnchor="middle" fill="#f1f5f9" fontSize="38" fontWeight="900">{nps ?? '—'}</text>
        <text x="20" y="116" textAnchor="middle" fill="#64748b" fontSize="9">-100</text>
        <text x="180" y="116" textAnchor="middle" fill="#64748b" fontSize="9">100</text>
      </svg>
      <span className="mt-1 rounded-full px-3 py-1 text-[11px] font-bold" style={{ background: `${z.color}22`, color: z.color }}>{z.label}</span>
    </div>
  );
}

function Kpi({ icon, label, range, value, pct, color }: { icon: React.ReactNode; label: string; range: string; value: number; pct: number; color: string }) {
  return (
    <div className={CARD} style={{ borderColor: `${color}55` }}>
      <div className="flex items-center justify-between">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: `${color}22`, color }}>{icon}</span>
        <span className="text-xs font-bold" style={{ color }}>{pct}%</span>
      </div>
      <div className="mt-3 text-3xl font-black text-slate-100">{value}</div>
      <div className="text-xs font-semibold text-slate-300">{label}</div>
      <div className="text-[11px] text-slate-500">{range}</div>
    </div>
  );
}

function Ranking({ title, items, labels, color, emptyText }: { title: string; items: NpsCount[]; labels: Record<string, string>; color: string; emptyText: string }) {
  const total = items.reduce((s, i) => s + i.count, 0);
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <div className={CARD}>
      <h4 className="mb-4 text-sm font-bold text-slate-100">{title}</h4>
      {items.length === 0 ? <p className="text-sm text-slate-500">{emptyText}</p> : (
        <ol className="space-y-3">
          {items.map((i, idx) => (
            <li key={i.key} className="flex items-center gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black" style={{ background: `${color}22`, color }}>{idx + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="truncate font-semibold text-slate-200">{labels[i.key] ?? LABELS[i.key] ?? i.key}</span>
                  <span className="shrink-0 tabular-nums text-slate-400">{i.count} · {pctOf(i.count, total)}%</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-slate-700">
                  <div className="h-1.5 rounded-full" style={{ width: `${(i.count / max) * 100}%`, background: color }} />
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function StorePicker({ stores, error, value, onChange }: { stores: NpsStoreRow[]; error: string | null; value: string; onChange: (v: string) => void }) {
  const [q, setQ] = useState('');
  const selected = value.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);
  const chosen = new Set(selected);
  const term = q.trim().toLowerCase();
  const list = term
    ? stores.filter((s) => (s.name ?? '').toLowerCase().includes(term) || s.id.toLowerCase().includes(term))
    : stores;
  const known = new Set(stores.map((s) => s.id));
  const unknown = stores.length ? selected.filter((id) => !known.has(id)) : [];
  const emit = (ids: string[]) => onChange(ids.join('\n'));
  const toggle = (id: string) => emit(chosen.has(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
        <input className={`${INPUT} pl-8`} placeholder="Buscar loja por nome" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
        <span>{selected.length} selecionada(s) de {stores.length}</span>
        <span className="flex gap-3">
          <button type="button" className="cursor-pointer font-bold text-amber-400 hover:text-amber-300"
            onClick={() => emit(Array.from(new Set([...selected, ...list.map((s) => s.id)])))}>Marcar listadas</button>
          <button type="button" className="cursor-pointer font-bold text-slate-400 hover:text-slate-200" onClick={() => emit([])}>Limpar</button>
        </span>
      </div>
      {error ? (
        <p className="mt-2 text-xs text-rose-300">{error}</p>
      ) : stores.length === 0 ? (
        <p className="mt-2 flex items-center gap-2 text-xs text-slate-400"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando lojas...</p>
      ) : (
        <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto pr-1">
          {list.map((s) => (
            <li key={s.id}>
              <label className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${chosen.has(s.id) ? 'border-amber-500/60 bg-amber-500/10 text-amber-200' : 'border-slate-700 text-slate-200 hover:border-slate-500'}`}>
                <input type="checkbox" className="h-4 w-4 shrink-0 cursor-pointer" checked={chosen.has(s.id)} onChange={() => toggle(s.id)} />
                <span className="min-w-0 flex-1 truncate">{s.name || 'Loja sem nome'}</span>
                <span className="shrink-0 font-mono text-[10px] text-slate-500">{s.id.slice(0, 8)}</span>
              </label>
            </li>
          ))}
          {list.length === 0 && <li className="py-2 text-center text-xs text-slate-500">Nenhuma loja encontrada.</li>}
        </ul>
      )}
      {unknown.length > 0 && (
        <p className="mt-2 text-[11px] text-slate-400">
          {unknown.length} ID(s) salvo(s) não aparecem na lista.{' '}
          <button type="button" className="cursor-pointer font-bold text-rose-300 hover:text-rose-200"
            onClick={() => emit(selected.filter((id) => known.has(id)))}>Remover</button>
        </p>
      )}
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
  const [drawer, setDrawer] = useState(false);
  const [opts, setOpts] = useState<NpsOptionRow[]>([]);
  const [savingOpts, setSavingOpts] = useState(false);
  const [stores, setStores] = useState<NpsStoreRow[]>([]);
  const [texts, setTexts] = useState<Record<string, string>>(NPS_TEXT_DEFAULTS);
  const [savingTexts, setSavingTexts] = useState(false);
  const [storesErr, setStoresErr] = useState<string | null>(null);

  const loadResults = useCallback(async () => {
    try { setRes(await getNpsResults(days)); } catch (e: any) { setErr(e?.message ?? 'Erro ao carregar resultados'); }
  }, [days]);

  useEffect(() => {
    getNpsConfig()
      .then((c) => { setCfg(c); setIdsText((c.store_ids ?? []).join('\n')); })
      .catch((e: any) => setErr(e?.message ?? 'Erro ao carregar configuração'));
  }, []);
  useEffect(() => { void loadResults(); }, [loadResults]);
  useEffect(() => {
    if (!drawer || cfg?.target !== 'stores') return;
    listNpsStores()
      .then((r) => { setStores(r); setStoresErr(null); })
      .catch((e: any) => setStoresErr(e?.message ?? 'Erro ao carregar lojas'));
  }, [drawer, cfg?.target]);
  useEffect(() => { getNpsTexts().then((t) => setTexts({ ...NPS_TEXT_DEFAULTS, ...t })).catch(() => { /* padrão */ }); }, []);
  useEffect(() => { listNpsOptions().then(setOpts).catch(() => { /* usa rótulos padrão */ }); }, []);

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
      setDrawer(false);
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
      setResetId('');
      void loadResults();
    } catch (e: any) { setErr(e?.message ?? 'Erro ao reiniciar'); }
  };

  if (!cfg) return <div className="flex items-center gap-2 text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>;

  const total = res?.total ?? 0;

  const toMap = (kind: 'pain' | 'feature') =>
    opts.reduce<Record<string, string>>((m, o) => { if (o.kind === kind) m[o.key] = o.label; return m; }, {});
  const labelsPain = toMap('pain');
  const labelsFeat = toMap('feature');

  const slug = (s: string) =>
    s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);

  const updateOpt = (kind: 'pain' | 'feature', key: string, patch: Partial<NpsOptionRow>) =>
    setOpts(opts.map((o) => (o.kind === kind && o.key === key ? { ...o, ...patch } : o)));

  const addOpt = (kind: 'pain' | 'feature') => {
    const n = opts.filter((o) => o.kind === kind).length;
    setOpts([...opts, { kind, key: `novo_${Date.now().toString(36)}`, label: '', sort_order: n + 1, active: true, isNew: true }]);
  };

  const moveOpt = (kind: 'pain' | 'feature', key: string, dir: -1 | 1) => {
    const list = opts.filter((o) => o.kind === kind).sort((a, b) => a.sort_order - b.sort_order);
    const i = list.findIndex((o) => o.key === key);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    setOpts([...opts.filter((o) => o.kind !== kind), ...list.map((o, n) => ({ ...o, sort_order: n + 1 }))]);
  };

  const saveTexts = async () => {
    setErr(null); setMsg(null);
    const payload: Record<string, string> = {};
    for (const f of NPS_TEXT_FIELDS) {
      const v = (texts[f.key] ?? '').trim();
      payload[f.key] = v === f.def ? '' : v;
    }
    setSavingTexts(true);
    try {
      await saveNpsTexts(payload);
      setTexts({ ...NPS_TEXT_DEFAULTS, ...(await getNpsTexts()) });
      setMsg('Textos salvos.');
    } catch (e: any) { setErr(e?.message ?? 'Erro ao salvar textos'); }
    setSavingTexts(false);
  };

  const saveOpts = async () => {
    setErr(null); setMsg(null);
    const out: NpsOptionRow[] = [];
    for (const kind of ['pain', 'feature'] as const) {
      const used = new Set(opts.filter((o) => !o.isNew && o.kind === kind).map((o) => o.key));
      let n = 0;
      for (const o of opts.filter((x) => x.kind === kind).sort((a, b) => a.sort_order - b.sort_order)) {
        const label = o.label.trim();
        if (!label) {
          if (o.isNew) continue;
          setErr('Há uma opção sem rótulo. Preencha ou desative.'); return;
        }
        let key = o.key;
        if (o.isNew) {
          const base = slug(label) || 'opcao';
          key = base;
          let k = 2;
          while (used.has(key)) key = `${base}_${k++}`.slice(0, 40);
          used.add(key);
        }
        n += 1;
        out.push({ kind, key, label: label.slice(0, 60), sort_order: n, active: o.active });
      }
      if (!out.some((o) => o.kind === kind && o.active)) {
        setErr('Mantenha ao menos uma opção ativa em cada lista.'); return;
      }
    }
    setSavingOpts(true);
    try {
      await saveNpsOptions(out);
      setOpts(await listNpsOptions());
      setMsg('Opções salvas.');
    } catch (e: any) { setErr(e?.message ?? 'Erro ao salvar opções'); }
    setSavingOpts(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-100">NPS dos lojistas</h2>
          <p className="flex items-center gap-2 text-xs text-slate-400">
            <span className={`h-2 w-2 rounded-full ${cfg.enabled ? 'bg-emerald-400' : 'bg-slate-500'}`} />
            {cfg.enabled ? 'Pesquisa ligada' : 'Pesquisa desligada'} · {cfg.target === 'all' ? 'todas as lojas' : `${cfg.store_ids.length} loja(s)`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select className="h-9 rounded-lg border border-slate-700 bg-slate-900 px-2 text-xs text-slate-200" value={days} onChange={(e) => setDays(Number(e.target.value))}>
            {[30, 90, 180, 365].map((d) => <option key={d} value={d}>Últimos {d} dias</option>)}
          </select>
          <button type="button" onClick={() => setDrawer(true)}
            className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-3 text-xs font-bold text-slate-100 hover:border-amber-500 hover:text-amber-400">
            <Settings className="h-4 w-4" /> Configurações
          </button>
        </div>
      </div>

      {(err || msg) && (
        <div className={`rounded-lg px-3 py-2 text-sm ${err ? 'bg-rose-500/10 text-rose-300' : 'bg-emerald-500/10 text-emerald-300'}`}>{err ?? msg}</div>
      )}

      {!res ? <Loader2 className="h-5 w-5 animate-spin text-slate-400" /> : (
        <>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_repeat(3,minmax(0,1fr))]">
            <div className={`${CARD} flex flex-col items-center justify-center`}>
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">NPS · {total} resposta(s)</p>
              <Gauge nps={res.nps} />
            </div>
            <Kpi icon={<Smile className="h-5 w-5" />} label="Promotores" range="Notas 9 e 10" value={res.promoters} pct={pctOf(res.promoters, total)} color={GRN} />
            <Kpi icon={<Meh className="h-5 w-5" />} label="Neutros" range="Notas 7 e 8" value={res.passives} pct={pctOf(res.passives, total)} color={YEL} />
            <Kpi icon={<Frown className="h-5 w-5" />} label="Detratores" range="Notas 0 a 6" value={res.detractors} pct={pctOf(res.detractors, total)} color={RED} />
          </div>

          <div className={CARD}>
            <h4 className="mb-4 text-sm font-bold text-slate-100">Distribuição das notas</h4>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={res.distribution} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="score" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#ffffff10' }}
                    contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#e2e8f0' }}
                    labelFormatter={(s) => `Nota ${s}`}
                    formatter={(v: number) => [`${v} resposta(s)`, '']} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={44}>
                    {res.distribution.map((d) => <Cell key={d.score} fill={scoreColor(d.score)} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Ranking title="Maiores dores" items={res.pains} labels={labelsPain} color={RED} emptyText="Nenhuma dor registrada no período." />
            <Ranking title="Funcionalidades preferidas" items={res.features} labels={labelsFeat} color={GRN} emptyText="Nenhuma preferência registrada no período." />
          </div>

          <div>
            <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-100">
              <MessageSquareQuote className="h-4 w-4 text-amber-400" /> Voz do cliente
            </h4>
            {res.comments.length === 0 ? (
              <div className={`${CARD} text-center text-sm text-slate-500`}>Nenhum comentário no período.</div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {res.comments.map((c, i) => (
                  <article key={i} className="flex flex-col rounded-2xl border border-slate-700/80 bg-slate-800/60 p-4" style={{ borderTop: `3px solid ${scoreColor(c.score)}` }}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold" style={{ background: `${scoreColor(c.score)}22`, color: scoreColor(c.score) }}>
                        Nota {c.score} · {scoreLabel(c.score)}
                      </span>
                      <span className="text-[11px] text-slate-500">{new Date(c.created_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                    {c.comment && <p className="mt-3 text-sm leading-relaxed text-slate-200">“{c.comment}”</p>}
                    {c.pain_other && <p className="mt-2 text-xs text-slate-400">Outra dor: {c.pain_other}</p>}
                    <p className="mt-auto pt-3 text-[11px] font-semibold text-slate-400">{c.store ?? 'Loja'}</p>
                  </article>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {drawer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <button type="button" aria-label="Fechar configurações" className="absolute inset-0 cursor-pointer bg-black/60" onClick={() => setDrawer(false)} />
          <aside role="dialog" aria-modal="true" className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-base font-black text-slate-100">Configurações do NPS</h3>
              <button type="button" aria-label="Fechar" onClick={() => setDrawer(false)} className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <label className="mb-5 flex cursor-pointer items-center justify-between rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-sm font-semibold text-slate-200">
              Pesquisa {cfg.enabled ? 'ligada' : 'desligada'}
              <input type="checkbox" className="h-4 w-4 cursor-pointer" checked={cfg.enabled} onChange={(e) => setCfg({ ...cfg, enabled: e.target.checked })} />
            </label>

            <div className="space-y-3">
              <Num label="Dias mínimos após o cadastro" value={cfg.min_days_after_signup} onChange={(n) => setCfg({ ...cfg, min_days_after_signup: n })} />
              <Num label="Intervalo entre respostas (dias)" value={cfg.cooldown_days} onChange={(n) => setCfg({ ...cfg, cooldown_days: n })} />
              <Num label="Se dispensar, voltar em (dias)" value={cfg.dismiss_days} onChange={(n) => setCfg({ ...cfg, dismiss_days: n })} />
              <label className="block text-xs font-semibold text-slate-400">
                Público
                <select className={`${INPUT} mt-1`} value={cfg.target} onChange={(e) => setCfg({ ...cfg, target: e.target.value as NpsConfig['target'] })}>
                  <option value="all">Todas as lojas</option>
                  <option value="stores">Apenas lojas específicas</option>
                </select>
              </label>
              {cfg.target === 'stores' && (
                <StorePicker stores={stores} error={storesErr}
                  value={idsText} onChange={setIdsText} />
              )}
            </div>

            <button type="button" onClick={() => void save()} disabled={saving}
              className="mt-5 inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-amber-500 text-sm font-bold text-slate-900 hover:bg-amber-400 disabled:opacity-50">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Salvar configurações
            </button>

            <div className="mt-8">
              <h4 className="mb-1 text-sm font-bold text-slate-100">Textos das perguntas</h4>
              <p className="mb-3 text-[11px] text-slate-500">Deixe em branco para voltar ao texto padrão.</p>
              <div className="space-y-3">
                {NPS_TEXT_FIELDS.map((f) => (
                  <label key={f.key} className="block text-xs font-semibold text-slate-400">
                    {f.label}
                    <input className={`${INPUT} mt-1`} maxLength={f.max} value={texts[f.key] ?? ''} placeholder={f.def}
                      onChange={(e) => setTexts({ ...texts, [f.key]: e.target.value })} />
                  </label>
                ))}
              </div>
              <button type="button" onClick={() => void saveTexts()} disabled={savingTexts}
                className="mt-3 inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-amber-500 text-sm font-bold text-amber-400 hover:bg-amber-500/10 disabled:opacity-50">
                {savingTexts && <Loader2 className="h-4 w-4 animate-spin" />} Salvar textos
              </button>
            </div>

            {(['pain', 'feature'] as const).map((kind) => (
              <div key={kind} className="mt-8">
                <h4 className="mb-1 text-sm font-bold text-slate-100">
                  {kind === 'pain' ? 'Opções de "Maior dificuldade"' : 'Opções de "Funcionalidade favorita"'}
                </h4>
                {kind === 'pain' && <p className="mb-2 text-[11px] text-slate-500">A opção com chave "outro" abre um campo de texto para o lojista.</p>}
                <ul className="space-y-2">
                  {opts.filter((o) => o.kind === kind).sort((a, b) => a.sort_order - b.sort_order).map((o, idx, arr) => (
                    <li key={o.key} className={`flex items-center gap-1.5 ${o.active ? '' : 'opacity-50'}`}>
                      <input className={INPUT} maxLength={60} value={o.label} placeholder="Rótulo da opção"
                        onChange={(e) => updateOpt(kind, o.key, { label: e.target.value })} />
                      <button type="button" aria-label="Subir" disabled={idx === 0} onClick={() => moveOpt(kind, o.key, -1)}
                        className="cursor-pointer rounded p-1.5 text-slate-400 hover:bg-slate-800 disabled:cursor-default disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                      <button type="button" aria-label="Descer" disabled={idx === arr.length - 1} onClick={() => moveOpt(kind, o.key, 1)}
                        className="cursor-pointer rounded p-1.5 text-slate-400 hover:bg-slate-800 disabled:cursor-default disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                      <input type="checkbox" title="Ativa" className="h-4 w-4 shrink-0 cursor-pointer" checked={o.active}
                        onChange={(e) => updateOpt(kind, o.key, { active: e.target.checked })} />
                    </li>
                  ))}
                </ul>
                <button type="button" onClick={() => addOpt(kind)}
                  className="mt-2 inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300">
                  <Plus className="h-4 w-4" /> Adicionar opção
                </button>
              </div>
            ))}
            <button type="button" onClick={() => void saveOpts()} disabled={savingOpts}
              className="mt-4 inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-amber-500 text-sm font-bold text-amber-400 hover:bg-amber-500/10 disabled:opacity-50">
              {savingOpts && <Loader2 className="h-4 w-4 animate-spin" />} Salvar opções
            </button>

            <div className="mt-8 rounded-xl border border-rose-500/30 bg-rose-500/5 p-4">
              <h4 className="mb-1 flex items-center gap-2 text-sm font-bold text-rose-300"><RotateCcw className="h-4 w-4" /> Reiniciar NPS de uma loja</h4>
              <p className="mb-3 text-xs text-slate-400">Apaga respostas e dispensas da loja, e o convite volta a aparecer. Use para testes.</p>
              <div className="flex gap-2">
                <input className={INPUT} placeholder="ID da loja (UUID)" value={resetId} onChange={(e) => setResetId(e.target.value)} />
                <button type="button" onClick={() => void reset()}
                  className="h-9 shrink-0 cursor-pointer rounded-lg border border-rose-500/50 px-3 text-sm font-bold text-rose-300 hover:bg-rose-500/10">Reiniciar</button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}