import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DragEvent } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { listDynamicPlans, updateDynamicPlan, type DynamicPlan } from '@/services/admin/plansAdmin';
import { deleteDynamicPlan, getPlanSubscribers } from '@/services/admin/pricingService';
import { listAllComboModules, listHubModules, type ComboModuleRow, type HubModule } from '@/services/admin/combosAdmin';
import { getComboStats, reorderCombos, type ComboStat, type ModulesRevenue } from '@/services/admin/modulesRevenue';
import { usePricingCosts } from '@/hooks/admin/usePricingCosts';
import { useConfirm } from '@/components/admin/ConfirmDialog';
import { PlanDrawer } from '@/components/admin/PrecosTab';
import ComboCreator from '@/components/admin/ComboCreator';
import ComboModulesEditor from '@/components/admin/ComboModulesEditor';
import ComboPricing from '@/components/admin/ComboPricing';
import MarginBadge from '@/components/admin/MarginBadge';
import ItemCard, { BTN } from '@/components/admin/ItemCard';
import { CARD } from '@/components/admin/moduleUi';

const sortOf = (p: DynamicPlan) => ((p as any).sort_order ?? 999) as number;

export default function ComboSection({ rev, logos, store }: { rev: ModulesRevenue | null; logos: Record<string, string | null>; store: string }) {
  const [plans, setPlans] = useState<DynamicPlan[] | null>(null);
  const [comboMods, setComboMods] = useState<ComboModuleRow[]>([]);
  const [mods, setMods] = useState<HubModule[]>([]);
  const [stats, setStats] = useState<Record<string, ComboStat>>({});
  const [subs, setSubs] = useState<Record<string, number>>({});
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<DynamicPlan | null>(null);
  const [editingMods, setEditingMods] = useState<DynamicPlan | null>(null);
  const [pricing, setPricing] = useState<DynamicPlan | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const { confirm, dialog } = useConfirm();
  const costs = usePricingCosts(plans, comboMods);

  const load = useCallback(async () => {
    const [p, cm, m, st, s] = await Promise.all([
      listDynamicPlans(),
      listAllComboModules().catch(() => [] as ComboModuleRow[]),
      listHubModules().catch(() => [] as HubModule[]),
      getComboStats(store || null).catch(() => ({} as Record<string, ComboStat>)),
      getPlanSubscribers().catch(() => ({} as Record<string, number>)),
    ]);
    setPlans(p); setComboMods(cm); setMods(m); setStats(st); setSubs(s);
  }, [store]);

  useEffect(() => { load().catch(() => setPlans([])); }, [load]);

  const modName = useMemo(() => new Map(mods.map((m) => [m.slug, m.name])), [mods]);
  const combos = useMemo(() => (plans || []).filter((p) => p.is_combo).sort((a, b) => sortOf(a) - sortOf(b)), [plans]);

  const slugsOf = (id: string) => comboMods.filter((r) => r.plan_id === id).map((r) => r.module_slug);
  const line = (id: string) => slugsOf(id).map((s) => modName.get(s) || s).join(' + ') || 'Nenhum módulo definido';
  const revOf = (id: string) => Number(rev?.items.find((i) => i.item_key === `combo:${id}`)?.cents) || 0;

  const refresh = () => { load(); costs.reload(); };

  const toggleActive = async (p: DynamicPlan) => {
    setBusyId(p.id);
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
      toast.success(p.is_active ? 'Combo pausado.' : 'Combo ativado.');
      refresh();
    } catch (e: any) {
      toast.error(e?.message || 'Não foi possível alterar o status.');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (p: DynamicPlan) => {
    if (!(await confirm({ title: 'Excluir combo', message: `"${p.plan_name}" será apagado e essa ação não pode ser desfeita.`, confirmLabel: 'Excluir' }))) return;
    setBusyId(p.id);
    try {
      await deleteDynamicPlan(p.id);
      toast.success('Combo excluído.');
      refresh();
    } catch (e: any) {
      toast.error(e?.message || 'Não foi possível excluir.');
    } finally {
      setBusyId(null);
    }
  };

  const dropOn = async (target: DynamicPlan) => {
    const src = combos.find((x) => x.id === dragId);
    setOverId(null);
    if (!src || src.id === target.id) return;
    const arr = [...combos];
    const from = arr.findIndex((x) => x.id === src.id);
    const to = arr.findIndex((x) => x.id === target.id);
    const [moved] = arr.splice(from, 1);
    arr.splice(to, 0, moved);
    setPlans((plans || []).map((p) => {
      const i = arr.findIndex((x) => x.id === p.id);
      return i >= 0 ? ({ ...p, sort_order: i + 1 } as any) : p;
    }));
    try {
      await reorderCombos(arr.map((x) => x.id));
      toast.success('Ordem dos combos atualizada.');
    } catch (e: any) {
      toast.error(e?.message || 'Não foi possível salvar a ordem.');
      load();
    }
  };

  const live = pricing ? ((plans || []).find((x) => x.id === pricing.id) ?? pricing) : null;

  const dnd = (p: DynamicPlan) => ({
    draggable: true,
    onDragStart: (e: DragEvent<HTMLDivElement>) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', p.id); setDragId(p.id); },
    onDragOver: (e: DragEvent<HTMLDivElement>) => { if (!dragId) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (overId !== p.id) setOverId(p.id); },
    onDrop: (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); dropOn(p); },
    onDragEnd: () => { setDragId(null); setOverId(null); },
  });

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        <h2 className="text-[15px] font-black uppercase tracking-wider text-white">Combos</h2>
        <button type="button" onClick={() => setCreating(true)} className="flex cursor-pointer items-center gap-1 text-[13px] font-bold text-[#fd8539] hover:opacity-80">
          <Plus size={14} /> Combo
        </button>
      </div>

      {plans === null ? (
        <Loader2 className="h-4 w-4 animate-spin text-[#fd8539]" />
      ) : combos.length === 0 ? (
        <div className={CARD}><p className="text-[13px] text-slate-500">Nenhum combo cadastrado. Clique em "+ Combo".</p></div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {combos.map((p) => {
            const st = stats[p.id];
            return (
              <ItemCard
                key={p.id}
                kind="combo"
                dot={p.is_active
                  ? { color: 'green', tip: 'Ativo: visível e disponível para contratação.' }
                  : { color: 'gray', tip: 'Pausado: oculto para novas contratações.' }}
                logos={slugsOf(p.id).map((s) => ({ url: logos[s] ?? null, name: modName.get(s) || s }))}
                title={p.plan_name}
                subtitle={line(p.id)}
                stats={{ total: Number(st?.total) || 0, trial: Number(st?.trial) || 0, paying: Number(st?.paying) || 0 }}
                revenue={revOf(p.id)}
                dnd={dnd(p)}
                dim={dragId === p.id}
                highlight={!!dragId && dragId !== p.id && overId === p.id}
                actions={
                  <>
                    <button type="button" onClick={() => setEditing(p)} className={`${BTN} bg-white/5 text-slate-200 hover:bg-white/10`}>Editar</button>
                    <button type="button" onClick={() => setEditingMods(p)} className={`${BTN} bg-white/5 text-amber-300 hover:bg-white/10`}>Módulos</button>
                    <button type="button" onClick={() => setPricing(p)} className={`${BTN} bg-white/5 text-sky-300 hover:bg-white/10`}>Preço</button>
                    <button type="button" disabled={busyId === p.id} onClick={() => toggleActive(p)}
                      className={`${BTN} ${p.is_active ? 'bg-amber-500/15 text-amber-300 hover:bg-amber-500/25' : 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'}`}>
                      {p.is_active ? 'Pausar' : 'Ativar'}
                    </button>
                    <button type="button" disabled={busyId === p.id || (subs[p.id] || 0) > 0} onClick={() => remove(p)}
                      title={(subs[p.id] || 0) > 0 ? 'Combo com assinantes: use Pausar' : 'Excluir combo'}
                      className={`${BTN} bg-rose-500/15 text-rose-300 hover:bg-rose-500/25`}>Excluir</button>
                  </>
                }
              />
            );
          })}
        </div>
      )}

      {pricing && live && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={() => setPricing(null)}>
          <div className={`${CARD} w-full max-w-md space-y-3`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="text-[15px] font-bold text-white">Preço de {live.plan_name}</p>
              <button type="button" onClick={() => setPricing(null)} className="cursor-pointer text-[13px] text-slate-400 hover:text-white">Fechar</button>
            </div>
            <ComboPricing combo={live} list={costs.listPrices(pricing.id)} pct={costs.discounts[pricing.id] ?? 0} onChanged={refresh} />
            <div className="flex items-center justify-center gap-2 text-[13px] text-slate-500"><span>Margem</span><MarginBadge m={costs.marginOf(live)} /></div>
          </div>
        </div>
      )}

      {creating && <ComboCreator onCreated={refresh} onClose={() => setCreating(false)} />}
      {editingMods && <ComboModulesEditor combo={editingMods} onClose={() => setEditingMods(null)} onSaved={refresh} />}
      {editing && <PlanDrawer key={editing.id} plan={editing} modules={mods} defaultModule="" onClose={() => setEditing(null)} onSaved={refresh} />}
      {dialog}
    </section>
  );
}