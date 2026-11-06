import { supabase } from "@/lib/supabase";

export const COMBO_TAB = "combo";

export interface PlanOverride { hidden?: boolean; featured?: boolean; description?: string; features?: string[] }
export interface TabCfg { visible?: boolean; label?: string }
export interface LandingConfig {
  cards?: { vidlytics?: boolean; stream_sell?: boolean };
  tabs?: Record<string, TabCfg>;
  plans?: Record<string, PlanOverride>;
}
export interface PublicPlan {
  id: string; module_slug: string | null; plan_tier: string; plan_name: string; is_combo: boolean;
  price_monthly_cents: number; price_semiannual_cents: number; price_annual_cents: number;
  limits_config: Record<string, unknown> | null; is_recommended: boolean; sort_order: number;
}
export interface LandingData {
  config: LandingConfig;
  plans: PublicPlan[];
  combo_modules: { plan_id: string; module_slug: string; member_tier: string | null }[];
  modules: { slug: string; name: string }[];
}
export interface TabView { key: string; label: string; plans: PublicPlan[] }

export const EMPTY_LANDING: LandingData = { config: {}, plans: [], combo_modules: [], modules: [] };

let cache: Promise<LandingData> | null = null;
export function fetchLandingData(force = false): Promise<LandingData> {
  if (!cache || force) {
    const p = (async () => {
      const { data, error } = await supabase.rpc("landing_public_data", { p_slug: "sll-hub" });
      if (error) throw new Error(error.message);
      return { ...EMPTY_LANDING, ...((data ?? {}) as Partial<LandingData>) } as LandingData;
    })();
    p.catch(() => { cache = null; });
    cache = p;
  }
  return cache;
}

export function tabKeys(plans: { is_combo: boolean; module_slug: string | null }[]): string[] {
  const mods = Array.from(new Set(plans.filter((p) => !p.is_combo && p.module_slug).map((p) => p.module_slug as string)));
  return [COMBO_TAB, ...mods];
}

export function defaultTabLabel(key: string, modules: { slug: string; name: string }[]): string {
  if (key === COMBO_TAB) return "🔥 Combo SLL Hub";
  return `Módulo ${modules.find((m) => m.slug === key)?.name ?? key}`;
}

export function buildTabs(d: LandingData): TabView[] {
  const cfg = d.config ?? {};
  return tabKeys(d.plans).flatMap((key) => {
    const t = cfg.tabs?.[key];
    if (t?.visible === false) return [];
    const plans = d.plans
      .filter((p) => (key === COMBO_TAB ? p.is_combo : !p.is_combo && p.module_slug === key) && !cfg.plans?.[p.id]?.hidden)
      .sort((a, b) => a.sort_order - b.sort_order);
    if (!plans.length) return [];
    return [{ key, label: t?.label || defaultTabLabel(key, d.modules), plans }];
  });
}

export function featuredId(plans: PublicPlan[], cfg: LandingConfig): string | null {
  const manual = plans.find((p) => cfg.plans?.[p.id]?.featured);
  if (manual) return manual.id;
  const rec = plans.find((p) => p.is_recommended);
  if (rec) return rec.id;
  return plans.length === 3 ? plans[1].id : null;
}

export function planFeatures(p: PublicPlan, includes: string[], ov?: PlanOverride): string[] {
  if (ov?.features && ov.features.length) return ov.features;
  const out: string[] = [];
  if (p.is_combo && includes.length) out.push(`Inclui ${includes.join(" + ")}`);
  const l = (p.limits_config ?? {}) as Record<string, unknown>;
  const lim = (k: string, label: (n: number) => string, unlimited: string) => {
    if (!(k in l)) return;
    const v = l[k];
    if (v === null) out.push(unlimited);
    else if (typeof v === "number" && v > 0) out.push(label(v));
  };
  lim("views", (n) => `${n.toLocaleString("pt-BR")} visualizações/mês`, "Visualizações ilimitadas");
  lim("max_videos", (n) => `Até ${n} vídeos`, "Vídeos ilimitados");
  lim("max_pages", (n) => `Até ${n} páginas`, "Páginas ilimitadas");
  lim("storage_gb", (n) => `${n} GB de armazenamento`, "Armazenamento ilimitado");
  if (l.tracking) out.push("Rastreamento de conversão");
  if (l.badge_removable) out.push("Remoção do selo SLL");
  return out;
}
