import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useFxRate } from '../../hooks/admin/useFxRate';
import AiLimitsCard from '@/components/admin/AiLimitsCard';
import BenchmarkUpdateCard from '@/components/admin/BenchmarkUpdateCard';

const sb: any = supabase;

type Cfg = { purpose: string; enabled: boolean; model: string; fallback_model: string; use_web_search: boolean };
type ModelRow = { model: string; label: string | null; input_usd: number; output_usd: number };
type Usage = { purpose: string; store_id: string | null; calls: number; tokens: number; cost_usd: number; cost_brl: number };

const DEFAULT_MODEL = 'gemini-3.1-flash-lite';

const PURPOSES: { key: string; label: string; desc: string; web: boolean }[] = [
  { key: 'support', label: 'Suporte Noah', desc: 'Chat de ajuda dentro do Hub. Desligada, o bal\u00e3o abre direto o WhatsApp de suporte. Ao esgotar a franquia do plano, o lojista segue para upgrade ou WhatsApp.', web: false },
  { key: 'insights', label: 'Insights personalizados', desc: 'Recomendações por loja a partir das métricas reais (em breve).', web: false },
  { key: 'feedback', label: 'Feedback pós-live', desc: 'Análise de cada live ao encerrar, comparada às anteriores (em breve).', web: false },
  { key: 'benchmarks', label: 'Benchmarks de mercado', desc: 'Atualização dos benchmarks por setor, com busca na web.', web: true },
];

const CARD = 'rounded-2xl border border-white/10 bg-white/5 p-5';
const INPUT = 'w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400';
const BTN = 'cursor-pointer rounded-lg px-4 py-2 text-[13px] font-bold disabled:opacity-40';

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 4 });
const nf = (n: number) => new Intl.NumberFormat('pt-BR').format(n);
const usd = (n: number) => 'US$ ' + Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 });

function Switch({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      title={label}
      onClick={onChange}
      className={'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ' + (on ? 'bg-emerald-500' : 'bg-slate-600')}
    >
      <span className={'inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ' + (on ? 'translate-x-[22px]' : 'translate-x-0.5')} />
    </button>
  );
}

export default function IaTab({ range }: { range: { from: Date; to: Date } }) {
  const [saved, setSaved] = useState<Record<string, Cfg>>({});
  const [draft, setDraft] = useState<Record<string, Cfg>>({});
  const [models, setModels] = useState<ModelRow[]>([]);
  const [usage, setUsage] = useState<Usage[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [wa, setWa] = useState({ number: '', message: '' });
  const [savedWa, setSavedWa] = useState({ number: '', message: '' });
  const { rate: dayRate } = useFxRate();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [usageErr, setUsageErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setUsageErr('');
    const from = range.from.toISOString();
    const to = range.to.toISOString();

    const [a, m, s, u] = await Promise.all([
      sb.from('admin_ai_settings').select('*'),
      sb.from('noah_models').select('model,label,input_usd,output_usd').order('model'),
      sb.from('noah_settings').select('ai_enabled, model, whatsapp_number, whatsapp_message').eq('id', 1).maybeSingle(),
      sb.schema('noah').rpc('admin_usage_summary', { p_from: from, p_to: to }),
    ]);

    if (a.error) toast.error(a.error.message);
    const cfgs: Record<string, Cfg> = {};
    for (const p of PURPOSES) {
      const r = ((a.data || []) as any[]).find((x) => x.purpose === p.key);
      cfgs[p.key] = {
        purpose: p.key,
        enabled: r ? !!r.enabled : false,
        model: r?.model || DEFAULT_MODEL,
        fallback_model: r?.fallback_model || '',
        use_web_search: r ? !!r.use_web_search : p.web,
      };
    }
    if (s.data && cfgs.support) {
      cfgs.support.enabled = !!s.data.ai_enabled;
      if (s.data.model) cfgs.support.model = s.data.model;
    }
    const present: Record<string, Cfg> = {};
    for (const x of (a.data || []) as any[]) present[x.purpose] = cfgs[x.purpose] ?? x;
    if (cfgs.support) present.support = { ...cfgs.support };
    setSaved(present);
    setDraft((d) => (Object.keys(d).length ? d : cfgs));

    if (m.error) toast.error(m.error.message);
    setModels((m.data || []) as ModelRow[]);
    const w = { number: String(s.data?.whatsapp_number || ''), message: String(s.data?.whatsapp_message || '') };
    setSavedWa(w);
    setWa(w);

    if (u.error) {
      setUsage([]);
      setUsageErr(u.error.message);
    } else {
      const rows = ((u.data || []) as any[]).map((r) => ({
        purpose: String(r.purpose),
        store_id: r.store_id ?? null,
        calls: Number(r.calls) || 0,
        tokens: Number(r.tokens) || 0,
        cost_usd: Number(r.cost_usd) || 0,
        cost_brl: Number(r.cost_brl) || 0,
      })) as Usage[];
      setUsage(rows);
      const ids = Array.from(new Set(rows.map((r) => r.store_id).filter(Boolean))) as string[];
      if (ids.length) {
        const st = await sb.from('stores').select('id,name').in('id', ids);
        const map: Record<string, string> = {};
        ((st.data || []) as any[]).forEach((x) => { map[x.id] = x.name; });
        setNames(map);
      }
    }
    setLoading(false);
  }, [range]);

  useEffect(() => { void load(); }, [load]);

  const priceOf = useMemo(() => {
    const map: Record<string, ModelRow> = {};
    models.forEach((m) => { map[m.model] = m; });
    return map;
  }, [models]);

  const modelOptions = (current: string) => {
    const list = models.map((m) => m.model);
    if (current && !list.includes(current)) list.unshift(current);
    return list;
  };

  const set = (p: string, patch: Partial<Cfg>) => setDraft((d) => ({ ...d, [p]: { ...d[p], ...patch } }));

  const dirty = (p: string) => {
    const a = draft[p], b = saved[p];
    if (!a) return false;
    if (!b) return true;
    const waChanged = p === 'support' && (wa.number !== savedWa.number || wa.message !== savedWa.message);
    return waChanged || a.enabled !== b.enabled || a.model !== b.model || a.fallback_model !== b.fallback_model || a.use_web_search !== b.use_web_search;
  };

  const save = async (p: string) => {
    const d = draft[p];
    if (!d) return;
    if (!d.model) { toast.error('Escolha o modelo principal.'); return; }
    const waDigits = wa.number.replace(/\D/g, '');
    if (p === 'support' && waDigits.length < 10) { toast.error('Informe o WhatsApp de suporte com DDI e DDD.'); return; }
    setBusy(p);
    try {
      const fields = {
        model: d.model,
        fallback_model: d.fallback_model || null,
        use_web_search: d.use_web_search,
        enabled: d.enabled,
      };
      const ex = await sb.from('admin_ai_settings').select('purpose').eq('purpose', p).maybeSingle();
      const r = ex.data
        ? await sb.from('admin_ai_settings').update(fields).eq('purpose', p)
        : await sb.from('admin_ai_settings').insert({ purpose: p, provider: 'gemini', ...fields });
      if (r.error) throw new Error(r.error.message);
      if (p === 'support') {
        const wm = wa.message.trim();
        const n = await sb.from('noah_settings').update({ ai_enabled: d.enabled, model: d.model, whatsapp_number: waDigits, whatsapp_message: wm }).eq('id', 1);
        if (n.error) throw new Error(n.error.message);
        setWa({ number: waDigits, message: wm });
        setSavedWa({ number: waDigits, message: wm });
      }
      toast.success('Configuração salva.');
      setSaved((s) => ({ ...s, [p]: { ...d } }));
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao salvar.');
    } finally {
      setBusy(null);
    }
  };

  const byPurpose = useMemo(() => {
    const map: Record<string, { calls: number; tokens: number; brl: number; usd: number }> = {};
    usage.forEach((r) => {
      const x = (map[r.purpose] = map[r.purpose] || { calls: 0, tokens: 0, brl: 0, usd: 0 });
      x.calls += r.calls; x.tokens += r.tokens; x.brl += r.cost_brl; x.usd += r.cost_usd;
    });
    return map;
  }, [usage]);

  const byStore = useMemo(() => {
    const map: Record<string, { calls: number; tokens: number; brl: number }> = {};
    usage.forEach((r) => {
      const k = r.store_id || '__platform';
      const x = (map[k] = map[k] || { calls: 0, tokens: 0, brl: 0 });
      x.calls += r.calls; x.tokens += r.tokens; x.brl += r.cost_brl;
    });
    return Object.entries(map).sort((a, b) => b[1].brl - a[1].brl).slice(0, 15);
  }, [usage]);

  const total = useMemo(
    () => Object.values(byPurpose).reduce((a, x) => ({ calls: a.calls + x.calls, tokens: a.tokens + x.tokens, brl: a.brl + x.brl, usd: a.usd + x.usd }), { calls: 0, tokens: 0, brl: 0, usd: 0 }),
    [byPurpose],
  );

  const labelOf = (k: string) => PURPOSES.find((p) => p.key === k)?.label || k;

  return (
    <div className="space-y-6 text-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold">{"Intelig\u00eancia Artificial"}</h2>
          <p className="text-sm text-slate-400">{"Uma configura\u00e7\u00e3o por finalidade e o custo real em R$ de cada uma."}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-300">
            {"US$ 1 = " + (dayRate ? brl(dayRate) : "\u2014")}
          </span>
          <button type="button" onClick={() => void load()} className={BTN + ' bg-white/10 hover:bg-white/15'}>Atualizar</button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { l: 'Custo no per\u00edodo', v: brl(total.brl) },
          { l: 'Custo em d\u00f3lar', v: usd(total.usd) },
          { l: 'Chamadas', v: nf(total.calls) },
          { l: 'Tokens', v: nf(total.tokens) },
        ].map((k) => (
          <div key={k.l} className={CARD}>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{k.l}</p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums">{loading ? '...' : k.v}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        {PURPOSES.map((p) => {
          const d = draft[p.key];
          if (!d) return null;
          const u = byPurpose[p.key];
          const price = priceOf[d.model];
          return (
            <section key={p.key} className={CARD + ' space-y-4'}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-extrabold">{p.label}</h3>
                  <p className="mt-0.5 text-xs text-slate-400">{p.desc}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={'text-[11px] font-bold ' + (d.enabled ? 'text-emerald-400' : 'text-slate-500')}>{d.enabled ? 'Ligada' : 'Desligada'}</span>
                  <Switch on={d.enabled} label={d.enabled ? 'Desligar' : 'Ligar'} onChange={() => set(p.key, { enabled: !d.enabled })} />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-xs text-slate-400">Modelo principal
                  <select className={INPUT} value={d.model} onChange={(e) => set(p.key, { model: e.target.value })}>
                    {modelOptions(d.model).map((m) => <option key={m} value={m} className="text-black">{m}</option>)}
                  </select>
                </label>
                <label className="space-y-1 text-xs text-slate-400">{"Modelo de reserva (opcional)"}
                  <select className={INPUT} value={d.fallback_model} onChange={(e) => set(p.key, { fallback_model: e.target.value })}>
                    <option value="" className="text-black">{"Nenhum"}</option>
                    {modelOptions(d.fallback_model).map((m) => <option key={m} value={m} className="text-black">{m}</option>)}
                  </select>
                </label>
              </div>

              <p className="text-[11px] text-slate-500">
                {price
                  ? 'Pre\u00e7o por 1 milh\u00e3o de tokens: entrada ' + usd(price.input_usd) + ' \u00b7 sa\u00edda ' + usd(price.output_usd)
                  : 'Modelo sem pre\u00e7o cadastrado. Cadastre em Suporte Noah > Modelos.'}
              </p>

              {p.key === 'support' && (
                <div className="space-y-3 border-t border-white/10 pt-3">
                  <label className="block space-y-1 text-xs text-slate-400">WhatsApp de suporte (DDI + DDD + número)
                    <input className={INPUT} value={wa.number} onChange={(e) => setWa({ ...wa, number: e.target.value })} />
                  </label>
                  <label className="block space-y-1 text-xs text-slate-400">Mensagem do WhatsApp (use {'{loja}'} e {'{id}'})
                    <textarea className={INPUT + ' min-h-[70px]'} maxLength={300} value={wa.message} onChange={(e) => setWa({ ...wa, message: e.target.value })} />
                  </label>
                </div>
              )}

              {p.web && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="accent-sky-500" checked={d.use_web_search} onChange={(e) => set(p.key, { use_web_search: e.target.checked })} />
                  {"Usar busca na web"}
                </label>
              )}

              {p.key === 'benchmarks' && <BenchmarkUpdateCard />}

              <div className="flex items-center justify-between border-t border-white/10 pt-3">
                <p className="text-xs text-slate-400">
                  {u ? nf(u.calls) + ' chamadas \u00b7 ' + nf(u.tokens) + ' tokens \u00b7 ' : 'Sem uso no per\u00edodo \u00b7 '}
                  <b className="text-slate-100">{brl(u?.brl || 0)}</b>
                </p>
                <button type="button" disabled={busy === p.key || !dirty(p.key)} onClick={() => void save(p.key)} className={BTN + ' bg-emerald-500 text-white hover:bg-emerald-600'}>
                  {busy === p.key ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </section>
          );
        })}
      </div>

      <AiLimitsCard />
      <section className={CARD + ' space-y-3'}>
        <h3 className="text-base font-extrabold">{"Custo por loja"}</h3>
        {usageErr && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
            {"N\u00e3o foi poss\u00edvel ler o uso: " + usageErr + ". Confira se o esquema noah est\u00e1 em Settings > API > Exposed schemas."}
          </p>
        )}
        {!usageErr && byStore.length === 0 && <p className="text-sm text-slate-500">{"Nenhum uso registrado no per\u00edodo."}</p>}
        {byStore.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="text-[11px] font-bold uppercase text-slate-400">
                <tr><th className="py-2">Loja</th><th className="py-2 text-right">Chamadas</th><th className="py-2 text-right">Tokens</th><th className="py-2 text-right">Custo</th></tr>
              </thead>
              <tbody>
                {byStore.map(([id, x]) => (
                  <tr key={id} className="border-t border-white/10">
                    <td className="py-2">{id === '__platform' ? 'Plataforma (sem loja)' : (names[id] || id.slice(0, 8))}</td>
                    <td className="py-2 text-right tabular-nums">{nf(x.calls)}</td>
                    <td className="py-2 text-right tabular-nums">{nf(x.tokens)}</td>
                    <td className="py-2 text-right font-semibold tabular-nums">{brl(x.brl)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {usage.length > 0 && (
          <p className="text-[11px] text-slate-500">
            {"Por finalidade: " + Object.entries(byPurpose).map(([k, x]) => labelOf(k) + " " + brl(x.brl)).join(" \u00b7 ")}
          </p>
        )}
      </section>
    </div>
  );
}