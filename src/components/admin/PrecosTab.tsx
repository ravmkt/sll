import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  listDynamicPlans, listPlanAddons, updateDynamicPlan, updatePlanAddon,
  type DynamicPlan, type PlanAddon,
} from '@/services/admin/plansAdmin';
import { createDynamicPlan, deleteDynamicPlan, getPlanSubscribers } from '@/services/admin/pricingService';
import { listModules } from '@/services/admin/adminService';
import CouponsManager from '@/components/admin/CouponsManager';
import ComboCreator from '@/components/admin/ComboCreator';
import { useConfirm } from '@/components/admin/ConfirmDialog';
import ComboModulesEditor from '@/components/admin/ComboModulesEditor';
import ComboDiscountCard from '@/components/admin/ComboDiscountCard';
import ComboPricing from '@/components/admin/ComboPricing';
import MarginBadge from '@/components/admin/MarginBadge';
import InfraCostsCard from '@/components/admin/InfraCostsCard';
import { usePricingCosts } from '@/hooks/admin/usePricingCosts';
import { listAllComboModules, type ComboModuleRow } from '@/services/admin/combosAdmin';
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
  const [slug, setSlug] = useState(plan ? (plan.module_slug || '') : (defaultModule || modules[0]?.slug || ''));
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl border border-slate-700 bg-[#0f1322] p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-white">{plan ? 'Editar plano' : 'Novo plano'}</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white"><X size={18} /></button>
        </div>
        <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-[11px] text-amber-300">Alterações não mudam assinaturas já ativas.</p>

        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className={LABEL}>Módulo</span>
            <select value={slug} onChange={(e) => setSlug(e.target.value)} disabled={!!plan} className={INPUT}>
              {plan?.is_combo && <option value="">Combo</option>}
              {modules.map((m) => <option key={m.slug} value={m.slug}>{m.name}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className={LABEL}>Chave do plano</span>
            <input value={plan ? plan.plan_tier : tier} onChange={(e) => setTier(e.target.value)} disabled={!!plan} placeholder="starter" className={INPUT} />
            <span className="block text-[10px] text-slate-600">{plan ? 'Identificador interno. Não pode ser alterado.' : 'Identificador interno, sem espaços. Depois de criada, não muda.'}</span>
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
  const [sub, setSub] = useState<'planos' | 'addons' | 'cupons' | 'custos'>('planos');
  const [filter, setFilter] = useState(initialModule || '');
  const [modules, setModules] = useState<Mod[]>([]);
  const [plans, setPlans] = useState<DynamicPlan[] | null>(null);
  const [addons, setAddons] = useState<PlanAddon[] | null>(null);
  const [subs, setSubs] = useState<Record<string, number>>({});
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<DynamicPlan | 'new' | null>(null);
  const [creatingCombo, setCreatingCombo] = useState(false);
  const [comboMods, setComboMods] = useState<ComboModuleRow[]>([]);
  const [editingMods, setEditingMods] = useState<DynamicPlan | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const { confirm, dialog } = useConfirm();
  const costs = usePricingCosts(plans, comboMods);

  const load = useCallback(async () => {
    setError('');
    try {
      const [p, a, s, m, cm] = await Promise.all([listDynamicPlans(), listPlanAddons(), getPlanSubscribers(), listModules(), listAllComboModules().catch(() => [] as ComboModuleRow[])]);
      setPlans(p); setAddons(a); setSubs(s); setModules(m); setComboMods(cm);
    } catch (e: any) { setError(e?.message || 'Erro ao carregar os preços.'); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const modName = useMemo(() => new Map(modules.map((m) => [m.slug, m.name])), [modules]);
  const filtered = (plans || []).filter((p) =>
    !filter || (p.is_combo ? comboMods.some((r) => r.plan_id === p.id && r.module_slug === filter) : p.module_slug === filter));
  const individuals = filtered.filter((p) => !p.is_combo);
  const combos = filtered.filter((p) => p.is_combo);
  const comboLine = (id: string) =>
    comboMods
      .filter((r) => r.plan_id === id)
      .map((r) => {
        const planName = r.member_tier
          ? (plans || []).find((x) => !x.is_combo && x.module_slug === r.module_slug && x.plan_tier === r.member_tier)?.plan_name
          : null;
        return planName || modName.get(r.module_slug) || r.module_slug;
      });
  const toggleActive = async (p: DynamicPlan) => {
    setTogglingId(p.id);
    try {
      await updateDynamicPlan(p.id, {
        plan_name: p.plan_name,
        price_monthly_cents: p.price_monthly_cents,
        price_semiannual_cents: p.price_semiannual_cents,
        price_annual_cents: p.price_annual_cents,
        limits_config: p.limits_config ?? {},
        is_recommended: p.is_recommended,
        is_active: !p.is_active,
      });
      toast.success(p.is_active ? 'Plano pausado.' : 'Plano ativado.');
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Não foi possível alterar o status.');
    } finally {
      setTogglingId(null);
    }
  };

  const removePlan = async (p: DynamicPlan) => {
    if (!(await confirm({
      title: p.is_combo ? 'Excluir combo' : 'Excluir plano',
      message: `"${p.plan_name}" será apagado e essa ação não pode ser desfeita.`,
      confirmLabel: 'Excluir',
    }))) return;
    setTogglingId(p.id);
    try {
      await deleteDynamicPlan(p.id);
      toast.success('Plano excluído.');
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Não foi possível excluir.');
    } finally {
      setTogglingId(null);
    }
  };

  const renderTable = (rows: DynamicPlan[], combo: boolean) => (
    <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-[#111524]">
      <table className="w-full min-w-[980px] text-xs">
        <thead className="border-b border-slate-800">
          <tr>
            <th className={TH}>Plano</th><th className={TH}>{combo ? 'Módulos incluídos' : 'Módulo'}</th>
            <th className={`${TH} text-center`}>Mensal</th><th className={`${TH} text-center`}>Semestral</th><th className={`${TH} text-center`}>Anual</th>
            <th className={`${TH} text-center`}>Margem</th><th className={`${TH} text-center`}>Assinantes</th><th className={`${TH} text-center`}>Status</th><th className={`${TH} text-center`}>Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {rows.length === 0 && <tr><td colSpan={9} className="px-3 py-8 text-center text-slate-500">{combo ? 'Nenhum combo. Clique em "Novo combo".' : 'Nenhum plano. Clique em "Novo plano".'}</td></tr>}
          {rows.map((p) => (
            <tr key={p.id} className={`hover:bg-white/5 ${combo ? 'shadow-[inset_4px_0_0_0_#facc15]' : ''}`}>
              <td className="px-3 py-3">
                <p className="font-bold text-white">{p.plan_name} {p.is_recommended && <span className="ml-1 rounded-full bg-[#fd8539]/15 px-1.5 py-0.5 text-[9px] text-[#fd8539]">Recomendado</span>}</p>
                <p className="font-mono text-[10px] text-slate-600">{p.plan_tier}</p>
              </td>
              <td className="px-3 py-3">
                {combo ? (
                  <div className="space-y-1">
                    <span className="rounded-full bg-yellow-400 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-900">Combo</span>
                    {comboLine(p.id).length > 0
                      ? <p className="text-[10px] leading-snug text-amber-200/80">{comboLine(p.id).join(' + ')}</p>
                      : <p className="text-[10px] text-rose-400">Sem módulos definidos</p>}
                    <button type="button" onClick={() => setEditingMods(p)} className="cursor-pointer text-[10px] font-semibold text-amber-300 hover:underline">Editar módulos</button>
                  </div>
                ) : (
                  <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-[10px] font-bold text-sky-300 ring-1 ring-sky-500/40">{modName.get(p.module_slug || '') || p.module_slug}</span>
                )}
              </td>
              <td className="px-3 py-3 text-center text-white">{brl(p.price_monthly_cents)}</td>
              <td className="px-3 py-3 text-center text-slate-300">{brl(p.price_semiannual_cents)}</td>
              <td className="px-3 py-3 text-center text-slate-300">{brl(p.price_annual_cents)}</td>
              <td className="px-3 py-3 text-center"><MarginBadge m={costs.marginOf(p)} /></td><td className="px-3 py-3 text-center font-semibold text-white">{int(subs[p.id])}</td>
              <td className="px-3 py-3 text-center">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${p.is_active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-500/15 text-slate-400'}`}>{p.is_active ? 'Ativo' : 'Pausado'}</span>
              </td>
              <td className="px-3 py-3">
                <div className="flex justify-center gap-1.5">
                  <button type="button" onClick={() => setEditing(p)} className="cursor-pointer rounded-md bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:bg-white/10">Editar</button>
                  <button type="button" disabled={togglingId === p.id} onClick={() => toggleActive(p)}
                    className={`cursor-pointer rounded-md px-2.5 py-1 text-[11px] font-semibold disabled:opacity-40 ${p.is_active ? 'bg-amber-500/15 text-amber-300 hover:bg-amber-500/25' : 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'}`}>
                    {p.is_active ? 'Pausar' : 'Ativar'}
                  </button>
                  <button type="button" disabled={togglingId === p.id || (subs[p.id] || 0) > 0} onClick={() => removePlan(p)}
                    title={(subs[p.id] || 0) > 0 ? 'Plano com assinantes: use Pausar' : 'Excluir plano'}
                    className="cursor-pointer rounded-md bg-rose-500/15 px-2.5 py-1 text-[11px] font-semibold text-rose-300 hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:opacity-30">Excluir</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const TABS: { id: typeof sub; label: string }[] = [{ id: 'planos', label: 'Planos' }, { id: 'addons', label: 'Add-ons' }, { id: 'cupons', label: 'Cupons' }, { id: 'custos', label: 'Custos' }];

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
              <button type="button" onClick={() => setCreatingCombo(true)} className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-yellow-400 px-3 py-1.5 text-xs font-bold text-slate-900">
                <Plus size={14} /> Novo combo
              </button>
            </>
          )}
        </div>
      </div>

      {costs.fx && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
          ⚠️ Alerta Cambial: o dólar subiu para {costs.fx.rate.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} (média de 30 dias: {costs.fx.avg.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}). As margens dos planos e combos foram recalculadas automaticamente com o novo câmbio.
        </div>
      )}

      {sub === 'planos' && costs.alerts.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
          <p className="font-bold">Atenção Rodrigo: {costs.alerts.length} {costs.alerts.length === 1 ? 'item está' : 'itens estão'} com margem abaixo de 50% no pior caso.</p>
          <ul className="mt-1 list-disc pl-4">
            {costs.alerts.slice(0, 6).map((a) => (
              <li key={a.plan.id}>{a.plan.plan_name}: {a.margin.worst === null ? '—' : `${(a.margin.worst * 100).toFixed(0)}%`}. Avalie ajustar os limites ou revisar o preço.</li>
            ))}
          </ul>
        </div>
      )}{error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>}

      {sub === 'planos' && (plans === null ? (
        <Loader2 className="h-4 w-4 animate-spin text-[#fd8539]" />
      ) : filter ? (
        <div className="space-y-4">
          <button type="button" onClick={() => setFilter('')} className="cursor-pointer text-xs font-semibold text-slate-400 hover:text-white">← Todos os módulos</button>
          <section className="space-y-2">
            <h2 className="text-sm font-bold text-sky-300">{modName.get(filter) || filter} <span className="ml-1 font-normal text-slate-500">({individuals.length} planos)</span></h2>
            {renderTable(individuals, false)}
          </section>
        </div>
      ) : (
        <div className="space-y-8">
          <section data-sec="modulo-cards" className="space-y-3">
            <h2 className="text-sm font-bold text-sky-300">Módulos</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {modules.map((m) => {
                const mp = (plans || []).filter((p) => !p.is_combo && p.module_slug === m.slug);
                const act = mp.filter((p) => p.is_active);
                const min = act.length ? Math.min(...act.map((p) => p.price_monthly_cents)) : null;
                const sc = mp.reduce((sum, p) => sum + (subs[p.id] || 0), 0);
                return (
                  <button key={m.slug} type="button" onClick={() => setFilter(m.slug)}
                    className="cursor-pointer rounded-2xl border border-slate-800 bg-[#111524] p-5 text-left transition-colors hover:border-sky-500/50 hover:bg-white/5">
                    <p className="text-base font-black text-white">{m.name}</p>
                    <p className="mt-1 text-[11px] text-slate-500">{mp.length === 0 ? 'Nenhum plano ainda' : `${mp.length} ${mp.length === 1 ? 'plano' : 'planos'} · ${act.length} ativos`}</p>
                    <div className="mt-4 flex items-end justify-between">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">A partir de</p>
                        <p className="text-lg font-black text-sky-300">{min === null ? '—' : brl(min)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Assinantes</p>
                        <p className="text-lg font-black text-white">{int(sc)}</p>
                      </div>
                    </div>
                    <p className="mt-4 text-[11px] font-semibold text-sky-300">Gerenciar planos →</p>
                  </button>
                );
              })}
            </div>
          </section>

          <ComboDiscountCard />

          <section className="space-y-3">
            <h2 className="text-sm font-bold text-yellow-300">Combos <span className="ml-1 font-normal text-slate-500">({combos.length})</span></h2>
            {combos.length === 0 ? (
              <p className="rounded-2xl border border-slate-800 bg-[#111524] px-4 py-8 text-center text-xs text-slate-500">Nenhum combo. Clique em "Novo combo".</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {combos.map((p) => {
                  const line = comboLine(p.id);
                  return (
                    <div key={p.id} onClick={() => setEditing(p)}
                      className="flex min-h-[270px] cursor-pointer flex-col rounded-2xl border border-slate-800 bg-[#111524] p-5 shadow-[inset_4px_0_0_0_#facc15] transition-colors hover:bg-white/5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-base font-black text-white">{p.plan_name}</p>
                          <p className="font-mono text-[10px] text-slate-600">{p.plan_tier}</p>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${p.is_active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-500/15 text-slate-400'}`}>{p.is_active ? 'Ativo' : 'Pausado'}</span>
                      </div>
                      <div className="mt-3 flex-1">
                        <span className="rounded-full bg-yellow-400 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-900">Combo</span>
                        {line.length > 0
                          ? <p className="mt-2 text-xs leading-snug text-amber-200/80">{line.join(' + ')}</p>
                          : <p className="mt-2 text-xs text-rose-400">Sem módulos definidos</p>}
                      </div>
                      <div onClick={(ev) => ev.stopPropagation()} className="mt-3 cursor-default">
                        <ComboPricing combo={p} list={costs.listPrices(p.id)} pct={costs.discounts[p.id] ?? 0} onChanged={() => { load(); costs.reload(); }} />
                      </div>
                      <div className="mt-2 flex items-center justify-center gap-2 text-[11px] text-slate-500"><span>Margem</span><MarginBadge m={costs.marginOf(p)} /></div>
                      <p className="mt-3 text-center text-[11px] text-slate-500">{int(subs[p.id])} assinantes</p>
                      <div className="mt-3 flex flex-wrap justify-center gap-1.5" onClick={(ev) => ev.stopPropagation()}>
                        <button type="button" onClick={() => setEditingMods(p)} className="cursor-pointer rounded-md bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-amber-300 hover:bg-white/10">Módulos</button>
                        <button type="button" disabled={togglingId === p.id} onClick={() => toggleActive(p)}
                          className={`cursor-pointer rounded-md px-2.5 py-1 text-[11px] font-semibold disabled:opacity-40 ${p.is_active ? 'bg-amber-500/15 text-amber-300 hover:bg-amber-500/25' : 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'}`}>
                          {p.is_active ? 'Pausar' : 'Ativar'}
                        </button>
                        <button type="button" disabled={togglingId === p.id || (subs[p.id] || 0) > 0} onClick={() => removePlan(p)}
                          title={(subs[p.id] || 0) > 0 ? 'Combo com assinantes: use Pausar' : 'Excluir combo'}
                          className="cursor-pointer rounded-md bg-rose-500/15 px-2.5 py-1 text-[11px] font-semibold text-rose-300 hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:opacity-30">Excluir</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      ))}

      {sub === 'custos' && <InfraCostsCard onChanged={costs.reload} />}

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

      {dialog}
      {creatingCombo && <ComboCreator onCreated={load} onClose={() => setCreatingCombo(false)} />}

      {editingMods && <ComboModulesEditor combo={editingMods} onClose={() => setEditingMods(null)} onSaved={load} />}

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