import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { listDynamicPlans, type DynamicPlan } from '@/services/admin/plansAdmin';
import { listComboModules, listHubModules, setComboModules, type HubModule } from '@/services/admin/combosAdmin';

export default function ComboModulesEditor({ combo, onClose, onSaved }: { combo: DynamicPlan; onClose: () => void; onSaved: () => void }) {
  const [modules, setModules] = useState<HubModule[]>([]);
  const [plans, setPlans] = useState<DynamicPlan[]>([]);
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([listHubModules(), listDynamicPlans(), listComboModules(combo.id)])
      .then(([m, p, cm]) => {
        setModules(m);
        setPlans(p.filter((x) => !x.is_combo));
        setPicked(Object.fromEntries(cm.map((r) => [r.module_slug, r.member_tier ?? ''])));
      })
      .catch((e) => toast.error((e as Error).message))
      .finally(() => setLoading(false));
  }, [combo.id]);

  const tiersByModule = useMemo(() => {
    const map: Record<string, DynamicPlan[]> = {};
    plans.forEach((p) => {
      if (p.module_slug) (map[p.module_slug] ??= []).push(p);
    });
    return map;
  }, [plans]);

  const toggle = (slug: string, on: boolean) =>
    setPicked((prev) => {
      const next = { ...prev };
      if (on) next[slug] = next[slug] ?? '';
      else delete next[slug];
      return next;
    });

  const save = async () => {
    const slugs = Object.keys(picked);
    if (slugs.length < 2) { toast.error('Selecione ao menos 2 módulos.'); return; }
    setBusy(true);
    try {
      await setComboModules(combo.id, slugs.map((s) => ({ module_slug: s, member_tier: picked[s] || null })));
      toast.success('Módulos do combo salvos.');
      onSaved();
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-lg space-y-4 rounded-xl border border-slate-700 bg-slate-900 p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-100">Módulos de {combo.plan_name}</h2>
          <button type="button" onClick={onClose} className="text-sm text-slate-400 hover:text-slate-200">Fechar</button>
        </div>
        <p className="rounded-md bg-amber-500/10 px-3 py-2 text-[11px] text-amber-300">Alterações não mudam assinaturas já ativas.</p>
        {loading ? (
          <p className="text-sm text-slate-400">Carregando...</p>
        ) : (
          <div className="space-y-2">
            {modules.map((m) => {
              const on = m.slug in picked;
              return (
                <div key={m.slug} className="flex items-center justify-between gap-3 rounded-md border border-slate-800 px-3 py-2">
                  <label className="flex items-center gap-2 text-xs text-slate-300">
                    <input type="checkbox" checked={on} onChange={(e) => toggle(m.slug, e.target.checked)} />
                    {m.name}{m.status !== 'active' ? ` (${m.status})` : ''}
                  </label>
                  {on && (
                    <select
                      value={picked[m.slug]}
                      onChange={(e) => setPicked((p) => ({ ...p, [m.slug]: e.target.value }))}
                      className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100"
                    >
                      <option value="">Plano do módulo: padrão</option>
                      {(tiersByModule[m.slug] ?? []).map((t) => (
                        <option key={t.id} value={t.plan_tier}>{t.plan_name}</option>
                      ))}
                    </select>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <button type="button" disabled={busy || loading} onClick={save} className="w-full rounded-lg bg-[#0094eb] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
          {busy ? 'Salvando...' : 'Salvar módulos'}
        </button>
      </div>
    </div>
  );
}