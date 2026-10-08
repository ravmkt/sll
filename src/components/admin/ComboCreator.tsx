import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { listDynamicPlans, type DynamicPlan } from '@/services/admin/plansAdmin';
import { createCombo, listHubModules, type HubModule } from '@/services/admin/combosAdmin';

const sb: any = supabase;
const inputCls = 'w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100';
const brl = (c: number) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const after = (v: number, pct: number) => Math.round(v * (1 - pct / 100));

const bestPlan = (list: DynamicPlan[]): DynamicPlan | null => {
  const act = list.filter((p) => p.is_active);
  const base = act.length ? act : list;
  return base.reduce<DynamicPlan | null>((b, p) => (!b || p.price_monthly_cents > b.price_monthly_cents ? p : b), null);
};

export default function ComboCreator({ onCreated, onClose }: { onCreated: () => void; onClose: () => void }) {
  const [modules, setModules] = useState<HubModule[]>([]);
  const [plans, setPlans] = useState<DynamicPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [tier, setTier] = useState('');
  const [disc, setDisc] = useState('10');
  const [rec, setRec] = useState(false);
  const [active, setActive] = useState(false);
  const [picked, setPicked] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([listHubModules(), listDynamicPlans(), sb.rpc('get_combo_discount')])
      .then(([m, p, d]: any[]) => {
        setModules(m);
        setPlans(p.filter((x: DynamicPlan) => !x.is_combo));
        if (d && !d.error && d.data !== null && d.data !== undefined) setDisc(String(d.data).replace('.', ','));
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const tiersByModule = useMemo(() => {
    const map: Record<string, DynamicPlan[]> = {};
    plans.forEach((p) => { if (p.module_slug) (map[p.module_slug] ??= []).push(p); });
    return map;
  }, [plans]);

  const list = useMemo(() => {
    const slugs = Object.keys(picked);
    if (slugs.length < 2) return null;
    const sel = slugs.map((s) => {
      const l = tiersByModule[s] ?? [];
      return l.find((p) => p.plan_tier === picked[s]) ?? bestPlan(l);
    });
    if (sel.some((p) => !p)) return null;
    return {
      m: sel.reduce((t, p) => t + p!.price_monthly_cents, 0),
      s: sel.reduce((t, p) => t + p!.price_semiannual_cents, 0),
      a: sel.reduce((t, p) => t + p!.price_annual_cents, 0),
    };
  }, [picked, tiersByModule]);

  const d = Number(disc.replace(',', '.'));
  const dOk = Number.isFinite(d) && d >= 0 && d <= 90;

  const toggle = (slug: string, on: boolean) =>
    setPicked((prev) => {
      const next = { ...prev };
      if (on) next[slug] = bestPlan(tiersByModule[slug] ?? [])?.plan_tier ?? '';
      else delete next[slug];
      return next;
    });

  async function save() {
    const slugs = Object.keys(picked);
    if (!name.trim() || !tier.trim()) return setError('Informe nome e chave do combo.');
    if (slugs.length < 2) return setError('Selecione ao menos 2 módulos.');
    if (!list) return setError('Todos os módulos escolhidos precisam ter plano cadastrado.');
    if (!dOk) return setError('Desconto deve estar entre 0 e 90.');
    setError(null);
    setSaving(true);
    try {
      const id = await createCombo({
        plan_name: name.trim(),
        plan_tier: tier.trim().toLowerCase(),
        price_monthly_cents: after(list.m, d),
        price_semiannual_cents: after(list.s, d),
        price_annual_cents: after(list.a, d),
        limits_config: {},
        is_recommended: rec,
        is_active: active,
        modules: slugs.map((s) => ({ module_slug: s, member_tier: picked[s] || null })),
      });
      const r = await sb.rpc('admin_set_combo_discount_pct', { p_id: id, p_pct: d, p_recalc: true });
      if (r.error) throw new Error(r.error.message);
      onCreated();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-100">Novo combo</h2>
          <button type="button" onClick={onClose} className="text-sm text-slate-400 hover:text-slate-200">Fechar</button>
        </div>

        {error && <p className="rounded-md bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}

        {loading ? (
          <p className="text-sm text-slate-400">Carregando...</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs text-slate-400">Nome
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Combo Master" className={inputCls} />
              </label>
              <label className="block text-xs text-slate-400">Chave (única)
                <input value={tier} onChange={(e) => setTier(e.target.value)} placeholder="master" className={inputCls} />
              </label>
            </div>

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Módulos do combo (mínimo 2)</p>
              <div className="space-y-2">
                {modules.map((m) => {
                  const on = m.slug in picked;
                  const tiers = tiersByModule[m.slug] ?? [];
                  return (
                    <div key={m.slug} className="flex items-center justify-between gap-3 rounded-md border border-slate-800 px-3 py-2">
                      <label className="flex items-center gap-2 text-xs text-slate-300">
                        <input type="checkbox" checked={on} onChange={(e) => toggle(m.slug, e.target.checked)} />
                        {m.name}{m.status !== 'active' ? ` (${m.status})` : ''}
                      </label>
                      {on && (tiers.length > 0 ? (
                        <select value={picked[m.slug]} onChange={(e) => setPicked((p) => ({ ...p, [m.slug]: e.target.value }))}
                          className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100">
                          {tiers.map((t) => <option key={t.id} value={t.plan_tier}>{t.plan_name}</option>)}
                        </select>
                      ) : (
                        <span className="text-[11px] text-rose-400">Sem planos cadastrados</span>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3 rounded-xl bg-white/5 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Preço do combo</p>
                <label className="flex items-center gap-2 text-xs text-slate-300">
                  Desconto
                  <input value={disc} onChange={(e) => setDisc(e.target.value)}
                    className="h-7 w-14 rounded-md border border-slate-700 bg-slate-950 px-2 text-right text-xs text-slate-100" />
                  %
                </label>
              </div>
              {list ? (
                <div className="grid grid-cols-3 gap-3 text-center">
                  {([['Mensal', list.m], ['Semestral', list.s], ['Anual', list.a]] as [string, number][]).map(([t, v]) => (
                    <div key={t}>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{t}</p>
                      <p className="text-xs text-slate-500 line-through">{brl(v)}</p>
                      <p className="text-sm font-bold text-white">{dOk ? brl(after(v, d)) : '—'}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-500">Escolha 2 ou mais módulos com plano para ver o preço cheio e o preço com desconto.</p>
              )}
              <p className="text-[10px] text-slate-600">Cada módulo mantém os limites do plano escolhido. Ajustes por módulo ficam em "Módulos" no card do combo.</p>
            </div>

            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={rec} onChange={(e) => setRec(e.target.checked)} /> Recomendado</label>
              <label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Ativo (visível para venda)</label>
            </div>

            <button type="button" onClick={save} disabled={saving}
              className="rounded-lg bg-[#0094eb] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
              {saving ? 'Criando...' : 'Criar combo'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}