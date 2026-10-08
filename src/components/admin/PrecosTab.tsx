import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  listDynamicPlans, listPlanAddons, updateDynamicPlan, updatePlanAddon,
  type DynamicPlan, type PlanAddon,
} from '@/services/admin/plansAdmin';
import { createDynamicPlan, getPlanSubscribers } from '@/services/admin/pricingService';
import { listModules } from '@/services/admin/adminService';
import CouponsManager from '@/components/admin/CouponsManager';
import { CARD, INPUT, SELECT, brl, int } from '@/components/admin/moduleUi';

type Mod = { slug: string; name: string };
type Row = { key: string; kind: 'num' | 'bool'; val: string; on: boolean };

const LABEL = 'text-[10px] font-bold uppercase tracking-wider text-slate-500';
const TH = 'px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500';
const LIMIT_LABEL: Record<string, string> = {
  views: 'Plays por mês', max_videos: 'Vídeos', max_pages: 'Páginas', storage_gb: 'Storage (GB)',
  tracking: 'Tracking', badge_removable: 'Remove o selo',
};

const toReais = (c: number) => ((Number(c) || 0) / 100).toFixed(2).replace('.', ',');
const toCents = (v: string) => Math.round(Number(v.replace(',', '.')) * 100);

function splitLimits(lim: Record<string, unknown> | null | undefined) {
  const rows: Row[] = [];
  const extra: Record<string, unknown> = {};
  Object.entries(lim || {}).forEach(([key, v]) => {
    if (typeof v === 'boolean') rows.push({ key, kind: 'bool', val: '', on: v });
    else if (v === null || typeof v === 'number') rows.push({ key, kind: 'num', val: v === null ? '' : String(v), on: false });
    else extra[key] = v;
  });
  return { rows, extra };
}

function PlanDrawer({ plan, modules, defaultModule, onClose, onSaved }: {
  plan: DynamicPlan | null; modules: Mod[]; defaultModule: string; onClose: () => void; onSaved: () => void;
}) {
  const init = splitLimits(plan?.limits_config as Record<string, unknown> | null);
  const [slug, setSlug] = useState(plan?.module_slug || defaultModule || modules[0]?.slug || '');
  const [tier, setTier] = useState(plan?.plan_tier || '');
  const [name, setName] = useState(plan?.plan_name || '');
  const [pm, setPm] = useState(toReais(plan?.price_monthly_cents ?? 0));
  const [ps, setPs] = useState(toReais(plan?.price_semiannual_cents ?? 0));
  const [pa, setPa] = useState(toReais(plan?.price_annual_cents ?? 0));
  const [rows, setRows] = useState<Row[]>(init.rows);
  const [newKey, setNewKey] = useState('');
  const [rec, setRec] = useState(plan?.is_recommended ?? false);
  const [active, setActive] = useState(plan?.is_active ?? false);
  const [busy, setBusy] = useState(false);

  const setRow = (i: number, patch: Partial<Row>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const addRow = (kind: 'num' | 'bool') => {
    const key = newKey.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (!key) { toast.error('Informe o nome do limite (ex.: lives_por_mes).'); return; }
    if (rows.some((r) => r.key === key)) { toast.error('Esse limite já existe.'); return; }
    setRows((r) => [...r, { key, kind, val: '', on: false }]);
    setNewKey('');
  };

  const save = async () => {
    const cents = [toCents(pm), toCents(ps), toCents(pa)];
    if (!name.trim() || cents.some((c) => !Number.isFinite(c) || c < 0)) { toast.error('Confira o nome e os preços.'); return; }
    const limits: Record<string, unknown> = { ...init.extra };
    for (const r of rows) {
      if (r.kind === 'bool') { limits[r.key] = r.on; continue; }
      const t = r.val.trim();
      if (t === '') { limits[r.key] = null; continue; }
      const n = Number(t.replace(',', '.'));
      if (!Number.isFinite(n) || n < 0) { toast.error(`Valor inválido em "${LIMIT_LABEL[r.key] || r.key}".`); return; }
      limits[r.key] = n;
    }
    const payload = {
      plan_name: name.trim(),
      price_monthly_cents: cents[0], price_semiannual_cents: cents[1], price_annual_cents: cents[2],
      limits_config: limits, is_recommended: rec, is_active: active,
    };
    setBusy(true);
    try {
      if (plan) await updateDynamicPlan(plan.id, payload);
      else {
        const key = tier.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
        if (!key) { toast.error('Informe a chave do plano (ex.: starter).'); setBusy(false); return; }
        await createDynamicPlan({ ...payload, module_slug: slug, plan_tier: key });
      }
      toast.success(plan ? 'Plano salvo.' : 'Plano criado.');
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e?.message || 'Não foi possível salvar.');
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={onClose}>
      <div className="h-full w-full max-w-lg space-y-4 overflow-y-auto border-l border-slate-800 bg-[#0f1322] p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-white">{plan ? 'Editar plano' : 'Novo plano'}</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white"><X size={18} /></button>
        </div>
        <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-[11px] text-amber-300">Alterações não mudam assinaturas já ativas.</p>

        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className={LABEL}>Módulo</span>
            <select value={slug} onChange={(e) => setSlug(e.target.value)} disabled={!!plan} className={INPUT}>
              {modules.map((m) => <option key={m.slug} value={m.slug}>{m.name}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className={LABEL}>Chave do plano</span>
            <input value={plan ? plan.plan_tier : tier} onChange={(e) => setTier(e.target.value)} disabled={!!plan} placeholder="starter" className={INPUT} />
          </label>
        </div>
        <label className="block space-y-1">
          <span className={LABEL}>Nome</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className={INPUT} />
        </label>

        <div className="grid grid-cols-3 gap-3">
          <label className="space-y-1"><span className={LABEL}>Mensal (R$)</span><input value={pm} onChange={(e) => setPm(e.target.value)} className={INPUT} /></label>
          <label className="space-y-1"><span className={LABEL}>Semestral (R$)</span><input value={ps} onChange={(e) => setPs(e.target.value)} className={INPUT} /></label>
          <label className="space-y-1"><span className={LABEL}>Anual (R$)</span><input value={pa} onChange={(e) => setPa(e.target.value)} className={INPUT} /></label>
        </div>
        <p className="-mt-2 text-[10px] text-slate-600">Semestral e anual são o valor total cobrado no período.</p>

        <div className="space-y-2">
          <p className={LABEL}>Limites e recursos</p>
          {rows.length === 0 && <p className="text-xs text-slate-500">Nenhum limite. Adicione abaixo.</p>}
          {rows.map((r, i) => (
            <div key={r.key} className="flex items-center gap-2">
              <span className="w-40 shrink-0 truncate text-xs text-slate-300" title={r.key}>{LIMIT_LABEL[r.key] || r.key}</span>
              {r.kind === 'bool' ? (
                <label className="flex flex-1 items-center gap-2 text-xs text-slate-400">
                  <input type="checkbox" checked={r.on} onChange={(e) => setRow(i, { on: e.target.checked })} /> {r.on ? 'Sim' : 'Não'}
                </label>
              ) : (
                <input value={r.val} onChange={(e) => setRow(i, { val: e.target.value })} placeholder="vazio = ilimitado" className={`${INPUT} flex-1`} />
              )}
              <button type="button" onClick={() => setRows((x) => x.filter((_, j) => j !== i))} className="text-slate-600 hover:text-rose-300"><X size={14} /></button>
            </div>
          ))}
          <div className="flex items-center gap-2 pt-1">
            <input value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="novo limite (ex.: lives_por_mes)" className={`${INPUT} flex-1`} />
            <button type="button" onClick={() => addRow('num')} className="shrink-0 cursor-pointer rounded-lg bg-white/5 px-2.5 py-2 text-[11px] font-bold text-slate-200 hover:bg-white/10">+ Número</button>
            <button type="button" onClick={() => addRow('bool')} className="shrink-0 cursor-pointer rounded-lg bg-white/5 px-2.5 py-2 text-[11px] font-bold text-slate-200 hover:bg-white/10">+ Sim/Não</button>
          </div>
        </div>

        <div className="flex gap-5">
          <label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={rec} onChange={(e) => setRec(e.target.checked)} /> Recomendado</label>
          <label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Ativo (à venda)</label>
        </div>

        <button type="button" disabled={busy} onClick={save} className="w-full cursor-pointer rounded-lg bg-[#fd8539] px-4 py-2 text-xs font-bold text-white disabled:opacity-40">
          {busy ? 'Salvando…' : plan ? 'Salvar alterações' : 'Criar plano'}
        </button>
      </div>
    </div>
  );
}

function AddonRow({ a, onSaved }: { a: PlanAddon; onSaved: () => void }) {
  const [name, setName] = useState(a.name);
  const [price, setPrice] = useState(toReais(a.price_monthly_cents));
  const [active, setActive] = useState(a.is_active);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    const cents = toCents(price);
    if (!name.trim() || !Number.isFinite(cents) || cents < 0) { toast.error('Confira nome e preço.'); return; }
    setBusy(true);
    try { await updatePlanAddon(a.id, { name: name.trim(), price_monthly_cents: cents, is_active: active }); toast.success('Add-on salvo.'); onSaved(); }
    catch (e: any) { toast.error(e?.message || 'Erro ao salvar.'); }
    finally { setBusy(false); }
  };
  return (
    <tr>
      <td className="px-3 py-2 font-mono text-[10px] text-slate-500">{a.module_slug} · {a.key}</td>
      <td className="px-3 py-2"><input value={name} onChange={(e) => setName(e.target.value)} className={INPUT} /></td>
      <td className="w-32 px-3 py-2"><input value={price} onChange={(e) => setPrice(e.target.value)} className={INPUT} /></td>
      <td className="px-3 py-2"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /></td>
      <td className="px-3 py-2 text-right">
        <button type="button" disabled={busy} onClick={save} className="cursor-pointer rounded-lg bg-[#0094eb] px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-40">{busy ? '…' : 'Salvar'}</button>
      </td>
    </tr>
  );
}

export default function PrecosTab({ initialModule }: { initialModule: string | null }) {
  const [sub, setSub] = useState<'planos' | 'addons' | 'cupons'>('planos');
  const [filter, setFilter] = useState(initialModule || '');
  const [modules, setModules] = useState<Mod[]>([]);
  const [plans, setPlans] = useState<DynamicPlan[] | null>(null);
  const [addons, setAddons] = useState<PlanAddon[] | null>(null);
  const [subs, setSubs] = useState<Record<string, number>>({});
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<DynamicPlan | 'new' | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const [p, a, s, m] = await Promise.all([listDynamicPlans(), listPlanAddons(), getPlanSubscribers(), listModules()]);
      setPlans(p); setAddons(a); setSubs(s); setModules(m);
    } catch (e: any) { setError(e?.message || 'Erro ao carregar os preços.'); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const modName = useMemo(() => new Map(modules.map((m) => [m.slug, m.name])), [modules]);
  const list = (plans || []).filter((p) => !filter || p.module_slug === filter);
  const TABS: { id: typeof sub; label: string }[] = [{ id: 'planos', label: 'Planos' }, { id: 'addons', label: 'Add-ons' }, { id: 'cupons', label: 'Cupons' }];

  return (
    <div className="space-y-5">
      <div className="sticky top-0 z-20 -mx-6 -mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-[#0b0e1a] px-6 pb-3 pt-6">
        <div>
          <h1 className="text-xl font-black text-white">Preços</h1>
          <p className="text-xs text-slate-500">Planos, limites, add-ons e cupons de cada módulo.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-700 bg-[#0b0e1a] p-0.5">
            {TABS.map((t) => (
              <button key={t.id} type="button" onClick={() => setSub(t.id)}
                className={`cursor-pointer rounded-md px-3 py-1 text-xs font-semibold transition-colors ${sub === t.id ? 'bg-[#0094eb] text-white' : 'text-slate-400 hover:text-white'}`}>
                {t.label}
              </button>
            ))}
          </div>
          {sub === 'planos' && (
            <>
              <select value={filter} onChange={(e) => setFilter(e.target.value)} className={`${SELECT} cursor-pointer`}>
                <option value="">Todos os módulos</option>
                {modules.map((m) => <option key={m.slug} value={m.slug}>{m.name}</option>)}
              </select>
              <button type="button" onClick={() => setEditing('new')} className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#fd8539] px-3 py-1.5 text-xs font-bold text-white">
                <Plus size={14} /> Novo plano
              </button>
            </>
          )}
        </div>
      </div>

      {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>}

      {sub === 'planos' && (plans === null ? (
        <Loader2 className="h-4 w-4 animate-spin text-[#fd8539]" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-[#111524]">
          <table className="w-full min-w-[820px] text-xs">
            <thead className="border-b border-slate-800">
              <tr>
                <th className={TH}>Plano</th><th className={TH}>Módulo</th>
                <th className={`${TH} text-right`}>Mensal</th><th className={`${TH} text-right`}>Semestral</th><th className={`${TH} text-right`}>Anual</th>
                <th className={`${TH} text-right`}>Assinantes</th><th className={TH}>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {list.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-500">Nenhum plano. Clique em "Novo plano".</td></tr>}
              {list.map((p) => (
                <tr key={p.id} onClick={() => setEditing(p)} className="cursor-pointer hover:bg-white/5">
                  <td className="px-3 py-3">
                    <p className="font-bold text-white">{p.plan_name} {p.is_recommended && <span className="ml-1 rounded-full bg-[#fd8539]/15 px-1.5 py-0.5 text-[9px] text-[#fd8539]">Recomendado</span>}</p>
                    <p className="font-mono text-[10px] text-slate-600">{p.plan_tier}</p>
                  </td>
                  <td className="px-3 py-3 text-slate-300">{p.is_combo ? 'Combo' : modName.get(p.module_slug || '') || p.module_slug}</td>
                  <td className="px-3 py-3 text-right text-white">{brl(p.price_monthly_cents)}</td>
                  <td className="px-3 py-3 text-right text-slate-300">{brl(p.price_semiannual_cents)}</td>
                  <td className="px-3 py-3 text-right text-slate-300">{brl(p.price_annual_cents)}</td>
                  <td className="px-3 py-3 text-right font-semibold text-white">{int(subs[p.id])}</td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${p.is_active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-500/15 text-slate-400'}`}>{p.is_active ? 'Ativo' : 'Inativo'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {sub === 'addons' && (addons === null ? (
        <Loader2 className="h-4 w-4 animate-spin text-[#fd8539]" />
      ) : (
        <div className={`${CARD} overflow-x-auto`}>
          <table className="w-full min-w-[640px] text-xs">
            <thead className="border-b border-slate-800">
              <tr><th className={TH}>Chave</th><th className={TH}>Nome</th><th className={TH}>Mensal (R$)</th><th className={TH}>Ativo</th><th className={TH} /></tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {addons.length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-500">Nenhum add-on cadastrado.</td></tr>}
              {addons.map((a) => <AddonRow key={a.id} a={a} onSaved={load} />)}
            </tbody>
          </table>
        </div>
      ))}

      {sub === 'cupons' && <div className="overflow-hidden rounded-2xl bg-white"><CouponsManager /></div>}

      {editing && (
        <PlanDrawer
          key={editing === 'new' ? 'new' : editing.id}
          plan={editing === 'new' ? null : editing}
          modules={modules}
          defaultModule={filter}
          onClose={() => setEditing(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}