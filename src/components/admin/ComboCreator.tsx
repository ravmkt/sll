/* SLL-PRECO-EDITAVEL */
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { listDynamicPlans, type DynamicPlan } from '@/services/admin/plansAdmin';
import { createCombo, listHubModules, type HubModule } from '@/services/admin/combosAdmin';
import { cycleInfo } from '@/components/admin/cycleInfo';

const sb: any = supabase;
const inputCls = 'w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[15px] text-slate-100';
const brl = (c: number) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const after = (v: number, pct: number) => Math.round(v * (1 - pct / 100));
const fmt = (c: number) => (c / 100).toFixed(2).replace('.', ',');
const parse = (s: string) => {
  const n = Number(String(s).replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
};

type K = 'm' | 's' | 'a';
const CYCLES: [K, string, number][] = [['m', 'Mensal', 1], ['s', 'Semestral', 6], ['a', 'Anual', 12]];

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
  const [ov, setOv] = useState<Partial<Record<K, string>>>({});

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

  const sug = (k: K) => (list ? after(list[k], d) : NaN);
  const fin = (k: K) => (ov[k] !== undefined ? parse(ov[k]!) : sug(k));
  const val = (k: K) => ov[k] ?? (list && dOk ? fmt(sug(k)) : '');
  const pctOf = (k: K) => (list && Number.isFinite(fin(k)) ? (1 - fin(k) / list[k]) * 100 : NaN);
  const edited = Object.keys(ov).length > 0;

  const roundAll = (mode: 'int' | '90') => {
    if (!list) return;
    const next: Partial<Record<K, string>> = {};
    CYCLES.forEach(([k]) => {
      const f = fin(k);
      if (!Number.isFinite(f) || f <= 0) return;
      const r = mode === 'int' ? Math.round(f / 100) * 100 : Math.round((f + 10) / 100) * 100 - 10;
      next[k] = fmt(Math.max(r, 100));
    });
    setOv(next);
  };

  const toggle = (slug: string, on: boolean) => {
    setOv({});
    setPicked((prev) => {
      const next = { ...prev };
      if (on) next[slug] = bestPlan(tiersByModule[slug] ?? [])?.plan_tier ?? '';
      else delete next[slug];
      return next;
    });
  };

  async function save() {
    const slugs = Object.keys(picked);
    if (!name.trim() || !tier.trim()) return setError('Informe nome e chave do combo.');
    if (slugs.length < 2) return setError('Selecione ao menos 2 m\u00f3dulos.');
    if (!list) return setError('Todos os m\u00f3dulos escolhidos precisam ter plano cadastrado.');
    if (!edited && !dOk) return setError('Desconto deve estar entre 0 e 90.');
    const fm = fin('m'), fs = fin('s'), fa = fin('a');
    if (![fm, fs, fa].every((v) => Number.isFinite(v) && v > 0)) return setError('Preencha os tr\u00eas pre\u00e7os com valores v\u00e1lidos.');
    const eff = Math.round((1 - fm / list.m) * 10000) / 100;
    if (eff < 0) return setError('O pre\u00e7o mensal do combo n\u00e3o pode ser maior que a soma dos planos avulsos.');
    if (eff > 90) return setError('O desconto efetivo n\u00e3o pode passar de 90%.');
    setError(null);
    setSaving(true);
    try {
      const id = await createCombo({
        plan_name: name.trim(),
        plan_tier: tier.trim().toLowerCase(),
        price_monthly_cents: fm,
        price_semiannual_cents: fs,
        price_annual_cents: fa,
        limits_config: {},
        is_recommended: rec,
        is_active: active,
        modules: slugs.map((s) => ({ module_slug: s, member_tier: picked[s] || null })),
      });
      const r = await sb.rpc('admin_set_combo_discount_pct', { p_id: id, p_pct: eff, p_recalc: false });
      if (r.error) throw new Error(r.error.message);
      onCreated();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const effM = pctOf('m');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-100">Novo combo</h2>
          <button type="button" onClick={onClose} className="text-[15px] text-slate-400 hover:text-slate-200">Fechar</button>
        </div>

        {error && <p className="rounded-md bg-red-950 px-3 py-2 text-[15px] text-red-300">{error}</p>}

        {loading ? (
          <p className="text-[15px] text-slate-400">Carregando...</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-[13px] text-slate-400">Nome
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Combo Master" className={inputCls} />
              </label>
              <label className="block text-[13px] text-slate-400">{"Chave (\u00fanica)"}
                <input value={tier} onChange={(e) => setTier(e.target.value)} placeholder="master" className={inputCls} />
              </label>
            </div>

            <div>
              <p className="mb-2 text-[13px] font-bold uppercase tracking-wider text-slate-500">{"M\u00f3dulos do combo (m\u00ednimo 2)"}</p>
              <div className="space-y-2">
                {modules.filter((m) => m.status === 'active' || m.slug in picked).map((m) => {
                  const on = m.slug in picked;
                  const tiers = tiersByModule[m.slug] ?? [];
                  return (
                    <div key={m.slug} className="flex items-center justify-between gap-3 rounded-md border border-slate-800 px-3 py-2">
                      <label className="flex items-center gap-2 text-[13px] text-slate-300">
                        <input type="checkbox" checked={on} onChange={(e) => toggle(m.slug, e.target.checked)} />
                        {m.name}{m.status !== 'active' ? ` (${m.status})` : ''}
                      </label>
                      {on && (tiers.length > 0 ? (
                        <select value={picked[m.slug]} onChange={(e) => { setOv({}); setPicked((p) => ({ ...p, [m.slug]: e.target.value })); }}
                          className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[13px] text-slate-100">
                          {tiers.map((t) => <option key={t.id} value={t.plan_tier}>{t.plan_name}</option>)}
                        </select>
                      ) : (
                        <span className="text-[13px] text-rose-400">Sem planos cadastrados</span>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3 rounded-xl bg-white/5 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[13px] font-bold uppercase tracking-wider text-slate-500">{"Pre\u00e7o do combo"}</p>
                <label className="flex items-center gap-2 text-[13px] text-slate-300">
                  {"Desconto sugerido"}
                  <input value={disc} onChange={(e) => { setDisc(e.target.value); setOv({}); }}
                    className="h-7 w-14 rounded-md border border-slate-700 bg-slate-950 px-2 text-right text-[13px] text-slate-100" />
                  %
                </label>
              </div>

              {list ? (
                <>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    {CYCLES.map(([k, t, months]) => {
                      const f = fin(k);
                      const p = pctOf(k);
                      const info = k !== 'm' && Number.isFinite(f) && Number.isFinite(fin('m')) ? cycleInfo(f, months, fin('m')) : null;
                      return (
                        <div key={k}>
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{t}</p>
                          <p className="text-[13px] text-slate-500 line-through">{brl(list[k])}</p>
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-[13px] text-slate-400">R$</span>
                            <input
                              value={val(k)}
                              inputMode="decimal"
                              onChange={(e) => setOv((o) => ({ ...o, [k]: e.target.value }))}
                              className="h-8 w-28 rounded-md border border-slate-700 bg-slate-950 px-2 text-right text-[15px] font-bold text-white"
                            />
                          </div>
                          <p className="text-xs text-emerald-400">{Number.isFinite(p) ? p.toFixed(1).replace('.', ',') + '% off' : ''}</p>
                          {info && <p className="text-xs text-emerald-400">{info}</p>}
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => roundAll('int')} className="rounded-md border border-slate-700 px-3 py-1 text-[13px] text-slate-200 hover:bg-slate-800">{"Arredondar (R$ inteiro)"}</button>
                    <button type="button" onClick={() => roundAll('90')} className="rounded-md border border-slate-700 px-3 py-1 text-[13px] text-slate-200 hover:bg-slate-800">{"Terminar em ,90"}</button>
                    {edited && (
                      <button type="button" onClick={() => setOv({})} className="rounded-md px-3 py-1 text-[13px] text-sky-400 hover:underline">{"Voltar \u00e0 sugest\u00e3o do desconto"}</button>
                    )}
                  </div>

                  <p className="text-[13px] text-slate-300">
                    {"Soma dos planos avulsos: "}<b>{brl(list.m)}</b>{"/m\u00eas \u2022 Pre\u00e7o final: "}
                    <b>{Number.isFinite(fin('m')) ? brl(fin('m')) : '\u2014'}</b>{"/m\u00eas"}
                    {Number.isFinite(effM) && <> {"\u2022 Desconto efetivo: "}<b>{effM.toFixed(1).replace('.', ',')}%</b></>}
                  </p>
                  <p className="text-xs text-slate-500">{"O desconto \u00e9 s\u00f3 o ponto de partida. Edite qualquer pre\u00e7o (ex.: 126,90 vira 127,00); o desconto efetivo \u00e9 recalculado pelo mensal."}</p>
                </>
              ) : (
                <p className="text-[13px] text-slate-500">{"Escolha 2 ou mais m\u00f3dulos com plano para ver o pre\u00e7o cheio e o pre\u00e7o com desconto."}</p>
              )}
              <p className="text-xs text-slate-600">{"Cada m\u00f3dulo mant\u00e9m os limites do plano escolhido. Ajustes por m\u00f3dulo ficam em \"M\u00f3dulos\" no card do combo."}</p>
            </div>

            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-[13px] text-slate-300"><input type="checkbox" checked={rec} onChange={(e) => setRec(e.target.checked)} /> Recomendado</label>
              <label className="flex items-center gap-2 text-[13px] text-slate-300"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> {"Ativo (vis\u00edvel para venda)"}</label>
            </div>

            <button type="button" onClick={save} disabled={saving}
              className="rounded-lg bg-[#0094eb] px-4 py-2 text-[15px] font-semibold text-white disabled:opacity-40">
              {saving ? 'Criando...' : 'Criar combo'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}