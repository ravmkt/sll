import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2, Save, Star } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { listDynamicPlans, updateDynamicPlan, type DynamicPlan } from "@/services/admin/plansAdmin";
import { listAllComboModules, listHubModules, type ComboModuleRow, type HubModule } from "@/services/admin/combosAdmin";
import { COMBO_TAB, defaultTabLabel, fetchLandingData, planFeatures, tabKeys, type LandingConfig, type PlanOverride, type PublicPlan } from "@/lib/landingConfig";

const inp = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100";
const msgOf = (e: unknown) => (e instanceof Error ? e.message : (e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "Erro inesperado"));
const brl = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? "bg-emerald-500" : "bg-slate-300"}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

interface Edit { name: string; price: string; active: boolean }

export default function LandpageTab() {
  const [plans, setPlans] = useState<DynamicPlan[]>([]);
  const [combos, setCombos] = useState<ComboModuleRow[]>([]);
  const [mods, setMods] = useState<HubModule[]>([]);
  const [rowId, setRowId] = useState<string | null>(null);
  const [cfg, setCfg] = useState<LandingConfig>({});
  const [edits, setEdits] = useState<Record<string, Edit>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const flash = (m: string) => { setNotice(m); setTimeout(() => setNotice(null), 3000); };

  const load = useCallback(async () => {
    try {
      const [pl, cm, hm, lp] = await Promise.all([
        listDynamicPlans(), listAllComboModules(), listHubModules(),
        supabase.from("landing_pages").select("id,config").eq("slug", "sll-hub").maybeSingle(),
      ]);
      if (lp.error) throw lp.error;
      if (!lp.data) throw new Error("Landing 'sll-hub' não encontrada. Rode a migration 20261106160000_landpage.sql.");
      setPlans(pl); setCombos(cm); setMods(hm);
      setRowId(lp.data.id as string);
      setCfg((lp.data.config ?? {}) as LandingConfig);
      setEdits(Object.fromEntries(pl.map((p) => [p.id, { name: p.plan_name, price: String(p.price_monthly_cents / 100), active: p.is_active }])));
      setError(null);
    } catch (e) { setError(msgOf(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const keys = useMemo(() => tabKeys(plans), [plans]);
  const groupPlans = (key: string) =>
    plans.filter((p) => (key === COMBO_TAB ? p.is_combo : !p.is_combo && p.module_slug === key)).sort((a, b) => a.sort_order - b.sort_order);
  const includesOf = (id: string) =>
    combos.filter((c) => c.plan_id === id).map((c) => mods.find((m) => m.slug === c.module_slug)?.name ?? c.module_slug);

  const setPlanOv = (id: string, patch: Partial<PlanOverride>) =>
    setCfg((c) => ({ ...c, plans: { ...c.plans, [id]: { ...c.plans?.[id], ...patch } } }));
  const setFeatured = (key: string, id: string, on: boolean) =>
    setCfg((c) => {
      const next = { ...(c.plans ?? {}) };
      groupPlans(key).forEach((p) => { next[p.id] = { ...next[p.id], featured: false }; });
      if (on) next[id] = { ...next[id], featured: true };
      return { ...c, plans: next };
    });
  const setTab = (key: string, patch: { visible?: boolean; label?: string }) =>
    setCfg((c) => ({ ...c, tabs: { ...c.tabs, [key]: { ...c.tabs?.[key], ...patch } } }));

  const saveConfig = async () => {
    if (!rowId) return;
    setBusy("cfg");
    const { error: e } = await supabase.from("landing_pages").update({ config: cfg, updated_at: new Date().toISOString() }).eq("id", rowId);
    setBusy(null);
    if (e) { setError(msgOf(e)); return; }
    fetchLandingData(true).catch(() => undefined);
    setError(null); flash("Configurações da landing salvas.");
  };

  const savePlan = async (p: DynamicPlan) => {
    const ed = edits[p.id];
    const price = Number(ed.price.replace(",", "."));
    if (!ed.name.trim() || !Number.isFinite(price) || price < 0) { setError("Informe nome e preço válidos."); return; }
    setBusy(p.id);
    try {
      await updateDynamicPlan(p.id, { plan_name: ed.name.trim(), price_monthly_cents: Math.round(price * 100), is_active: ed.active });
      await load(); fetchLandingData(true).catch(() => undefined); flash("Plano atualizado.");
    } catch (e) { setError(msgOf(e)); }
    finally { setBusy(null); }
  };

  if (loading) return <div className="grid h-64 place-items-center text-slate-500"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Landpage · SLL Hub</h1>
          <p className="text-sm text-slate-500">Planos, preços, abas e módulos exibidos em app.sllhub.com.br</p>
        </div>
        <div className="flex gap-2">
          <a href="/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
            Ver página <ExternalLink className="h-4 w-4" />
          </a>
          <button onClick={saveConfig} disabled={busy === "cfg"} className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700 disabled:opacity-60">
            {busy === "cfg" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar landing
          </button>
        </div>
      </div>

      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {notice && <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Cards de módulos</h2>
        <p className="mb-4 text-sm text-slate-500">Seção "Dois módulos que se completam".</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {([["vidlytics", "Vidlytics"], ["stream_sell", "Stream Sell"]] as const).map(([k, l]) => (
            <div key={k} className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
              <span className="font-semibold text-slate-800">{l}</span>
              <Switch label={l} on={cfg.cards?.[k] !== false} onChange={(v) => setCfg((c) => ({ ...c, cards: { ...c.cards, [k]: v } }))} />
            </div>
          ))}
        </div>
      </section>

      {keys.map((key) => {
        const list = groupPlans(key);
        if (!list.length && key !== COMBO_TAB) return null;
        return (
          <section key={key} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <Switch label="Aba visível" on={cfg.tabs?.[key]?.visible !== false} onChange={(v) => setTab(key, { visible: v })} />
              <input className={`${inp} max-w-md flex-1`} value={cfg.tabs?.[key]?.label ?? defaultTabLabel(key, mods)} onChange={(e) => setTab(key, { label: e.target.value })} aria-label="Nome da aba" />
              <span className="text-xs text-slate-400">aba de preços · {list.length} plano(s)</span>
            </div>
            {list.length === 0 && <p className="text-sm text-slate-400">Nenhum combo cadastrado. Crie na aba Preços.</p>}
            <div className="grid gap-4 lg:grid-cols-3">
              {list.map((p) => {
                const ed = edits[p.id]; const ov = cfg.plans?.[p.id] ?? {};
                const auto = planFeatures(p as unknown as PublicPlan, includesOf(p.id));
                return (
                  <div key={p.id} className={`space-y-3 rounded-xl border p-4 ${ed.active ? "border-slate-200" : "border-slate-200 bg-slate-50 opacity-75"}`}>
                    <div className="grid grid-cols-[1fr_110px] gap-2">
                      <label className="block text-xs font-semibold text-slate-500">Nome
                        <input className={inp} value={ed.name} onChange={(e) => setEdits((s) => ({ ...s, [p.id]: { ...ed, name: e.target.value } }))} /></label>
                      <label className="block text-xs font-semibold text-slate-500">R$/mês
                        <input className={inp} inputMode="decimal" value={ed.price} onChange={(e) => setEdits((s) => ({ ...s, [p.id]: { ...ed, price: e.target.value } }))} /></label>
                    </div>
                    <p className="text-[11px] text-slate-400">Semestral {brl(p.price_semiannual_cents)} · Anual {brl(p.price_annual_cents)} (edite na aba Preços)</p>
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                      <span className="flex items-center gap-2"><Switch label="Plano ativo" on={ed.active} onChange={(v) => setEdits((s) => ({ ...s, [p.id]: { ...ed, active: v } }))} /> Ativo</span>
                      <button onClick={() => savePlan(p)} disabled={busy === p.id} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-white hover:bg-emerald-600 disabled:opacity-60">
                        {busy === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Salvar plano
                      </button>
                    </div>
                    <hr className="border-slate-100" />
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                      <span className="flex items-center gap-2"><Switch label="Mostrar na landing" on={!ov.hidden} onChange={(v) => setPlanOv(p.id, { hidden: !v })} /> Na landing</span>
                      <span className="flex items-center gap-2"><Switch label="Mais escolhido" on={!!ov.featured} onChange={(v) => setFeatured(key, p.id, v)} /><Star className="h-3.5 w-3.5 text-amber-500" /> Destaque</span>
                    </div>
                    <label className="block text-xs font-semibold text-slate-500">Descrição (landing)
                      <input className={inp} value={ov.description ?? ""} onChange={(e) => setPlanOv(p.id, { description: e.target.value })} /></label>
                    <label className="block text-xs font-semibold text-slate-500">Recursos (um por linha; vazio = automático)
                      <textarea rows={5} className={inp} value={(ov.features ?? []).join("\n")} placeholder={auto.join("\n")}
                        onChange={(e) => setPlanOv(p.id, { features: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })} /></label>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
