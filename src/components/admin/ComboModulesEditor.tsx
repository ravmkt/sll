import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { listDynamicPlans, type DynamicPlan } from '@/services/admin/plansAdmin';
import { listComboModules, listHubModules, setComboModules, type HubModule } from '@/services/admin/combosAdmin';

const sb: any = supabase;

const LABELS: Record<string, string> = {
  views: 'Plays/mês',
  max_videos: 'Vídeos',
  max_pages: 'Páginas',
  storage_gb: 'Storage (GB)',
};
const label = (k: string) => LABELS[k] ?? k.replace(/_/g, ' ');
const numericKeys = (lim: Record<string, unknown>) =>
  Object.keys(lim).filter((k) => lim[k] === null || typeof lim[k] === 'number');
const fmt = (v: unknown) => (v === null ? 'ilimitado' : typeof v === 'number' ? v.toLocaleString('pt-BR') : '');

type Over = Record<string, Record<string, string>>;

export default function ComboModulesEditor({ combo, onClose, onSaved }: { combo: DynamicPlan; onClose: () => void; onSaved: () => void }) {
  const [modules, setModules] = useState<HubModule[]>([]);
  const [plans, setPlans] = useState<DynamicPlan[]>([]);
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [over, setOver] = useState<Over>({});
  const [discount, setDiscount] = useState<number | null>(null);
  const [recalc, setRecalc] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      listHubModules(),
      listDynamicPlans(),
      listComboModules(combo.id),
      sb.from('combo_modules').select('module_slug,limits_override').eq('plan_id', combo.id),
      sb.rpc('get_combo_discount'),
    ])
      .then(([m, p, cm, ov, disc]: any[]) => {
        setModules(m);
        setPlans(p.filter((x: DynamicPlan) => !x.is_combo));
        setPicked(Object.fromEntries(cm.map((r: any) => [r.module_slug, r.member_tier ?? ''])));
        const o: Over = {};
        (ov?.data || []).forEach((r: any) => {
          const lim = (r.limits_override || {}) as Record<string, unknown>;
          o[r.module_slug] = Object.fromEntries(Object.entries(lim).map(([k, v]) => [k, v === null ? '' : String(v)]));
        });
        setOver(o);
        if (disc && !disc.error && disc.data !== null) setDiscount(Number(disc.data));
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

  // Plano efetivo do modulo: o escolhido ou, se "padrao", o maior plano ativo
  const planFor = (slug: string, tier: string): DynamicPlan | null => {
    const list = tiersByModule[slug] ?? [];
    if (tier) return list.find((p) => p.plan_tier === tier) ?? null;
    const act = list.filter((p) => p.is_active);
    const base = act.length ? act : list;
    return base.reduce<DynamicPlan | null>((b, p) => (!b || p.price_monthly_cents > b.price_monthly_cents ? p : b), null);
  };

  const toggle = (slug: string, on: boolean) =>
    setPicked((prev) => {
      const next = { ...prev };
      if (on) next[slug] = next[slug] ?? '';
      else delete next[slug];
      return next;
    });

  const setOv = (slug: string, key: string, v: string) =>
    setOver((prev) => ({ ...prev, [slug]: { ...(prev[slug] ?? {}), [key]: v } }));

  const save = async () => {
    const slugs = Object.keys(picked);
    if (slugs.length < 2) { toast.error('Selecione ao menos 2 módulos.'); return; }

    const items = slugs.map((s) => {
      const clean: Record<string, number> = {};
      Object.entries(over[s] ?? {}).forEach(([k, v]) => {
        if (v.trim() === '') return;
        const n = Number(v.replace(',', '.'));
        if (Number.isFinite(n) && n >= 0) clean[k] = n;
      });
      return { module_slug: s, limits_override: clean };
    });

    setBusy(true);
    try {
      await setComboModules(combo.id, slugs.map((s) => ({ module_slug: s, member_tier: picked[s] || null })));
      const r1 = await sb.rpc('admin_set_combo_module_limits', { p_combo_id: combo.id, p_items: items });
      if (r1.error) throw new Error(r1.error.message);
      if (recalc) {
        const r2 = await sb.rpc('admin_apply_combo_discount', { p_combo_id: combo.id });
        if (r2.error) throw new Error(r2.error.message);
      }
      toast.success(recalc ? 'Módulos, limites e preço do combo salvos.' : 'Módulos e limites do combo salvos.');
      onSaved();
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-100">Módulos de {combo.plan_name}</h2>
          <button type="button" onClick={onClose} className="text-sm text-slate-400 hover:text-slate-200">Fechar</button>
        </div>
        <p className="rounded-md bg-amber-500/10 px-3 py-2 text-[11px] text-amber-300">Alterações não mudam assinaturas já ativas.</p>
        <p className="text-[11px] text-slate-500">
          Cada módulo mantém os limites do plano escolhido (não há soma entre módulos). Preencha um campo apenas para dar mais ou menos neste combo.
        </p>

        {loading ? (
          <p className="text-sm text-slate-400">Carregando...</p>
        ) : (
          <div className="space-y-2">
            {modules.map((m) => {
              const on = m.slug in picked;
              const plan = on ? planFor(m.slug, picked[m.slug]) : null;
              const lim = (plan?.limits_config ?? {}) as Record<string, unknown>;
              const keys = numericKeys(lim);
              return (
                <div key={m.slug} className="space-y-2 rounded-md border border-slate-800 px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
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
                        <option value="">Plano do módulo: maior ativo</option>
                        {(tiersByModule[m.slug] ?? []).map((t) => (
                          <option key={t.id} value={t.plan_tier}>{t.plan_name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  {on && !plan && <p className="text-[11px] text-rose-400">Este módulo ainda não tem planos cadastrados.</p>}
                  {on && plan && keys.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {keys.map((k) => (
                        <label key={k} className="block text-[11px] text-slate-400">
                          {label(k)}
                          <input
                            value={over[m.slug]?.[k] ?? ''}
                            onChange={(e) => setOv(m.slug, k, e.target.value)}
                            placeholder={fmt(lim[k])}
                            className="mt-0.5 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100"
                          />
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <label className="flex items-center gap-2 text-xs text-slate-300">
          <input type="checkbox" checked={recalc} onChange={(e) => setRecalc(e.target.checked)} />
          Recalcular o preço do combo: soma dos planos com {discount === null ? '—' : String(discount).replace('.', ',')}% de desconto
        </label>

        <button type="button" disabled={busy || loading} onClick={save} className="w-full rounded-lg bg-[#0094eb] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
          {busy ? 'Salvando...' : 'Salvar módulos'}
        </button>
      </div>
    </div>
  );
}