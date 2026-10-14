import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Check, Lock, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLoja } from "@/contexts/LojaContext";
import { bumpTotal, useUpsells } from "@/components/checkout/OrderBumpCard";
import type { PlanCycle } from "@/components/planos/VidlyticsPlanCard";
import type { CatalogCombo } from "@/services/plans/getCatalogShowcase";
import { CYCLE_MONTHS, brl, cycleCents } from "@/components/planos/planosShared";
import { addonIcon } from "@/components/planos/addonIcon";

const CYCLES: { key: PlanCycle; label: string; note: string }[] = [
  { key: "monthly", label: "Mensal", note: "Cancele a qualquer momento, sem taxa." },
  { key: "semiannual", label: "Semestral", note: "Cobrança única a cada 6 meses." },
  { key: "yearly", label: "Anual", note: "Cobrança única por ano. O melhor preço." },
];

export default function ComboPlanoModal({
  combo, initialCycle, highlights, onClose,
}: { combo: CatalogCombo; initialCycle: PlanCycle; highlights: string[]; onClose: () => void }) {
  const navigate = useNavigate();
  const { storeId } = useLoja();
  const [cycle, setCycle] = useState<PlanCycle>(initialCycle);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const items = useUpsells(combo.modules.map((m) => m.slug));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const sumFor = (cy: PlanCycle) =>
    combo.modules.reduce((s, m) => s + (cy === "monthly" ? m.monthly_cents : cy === "semiannual" ? m.semiannual_cents : m.annual_cents), 0);

  const months = CYCLE_MONTHS[cycle];
  const planCents = cycleCents(combo, cycle);
  const addonsCents = Math.round(bumpTotal(items, sel, cycle) * 100);
  const total = planCents + addonsCents;
  const lines = useMemo(
    () => (highlights.length ? highlights : combo.modules.map((m) => `${m.name}${m.plan_name ? " · " + m.plan_name : ""}`)),
    [highlights, combo]
  );

  const toggle = (id: string) =>
    setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  function proceed() {
    if (!storeId) { toast.error("Nenhuma loja ativa encontrada."); return; }
    const qs = new URLSearchParams({ plan: combo.id, cycle, module: "bundle", mods: combo.modules.map((m) => m.slug).join(",") });
    if (sel.size > 0) qs.set("addons", Array.from(sel).join(","));
    navigate(`/dashboard/checkout?${qs.toString()}`);
  }

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-3 sm:p-5" onClick={onClose} role="dialog" aria-modal="true" aria-label={combo.plan_name}>
      <div className="relative grid max-h-[94vh] w-full max-w-[1100px] overflow-y-auto rounded-2xl bg-white shadow-2xl md:grid-cols-[1.7fr_1fr] md:overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onClose} aria-label="Fechar" className="absolute right-3 top-3 z-10 cursor-pointer rounded-full p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900">
          <X className="h-5 w-5" />
        </button>

        <div className="space-y-6 bg-slate-50 p-6 md:max-h-[94vh] md:overflow-y-auto">
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              {combo.modules.map((m) =>
                m.logo_url ? (
                  <img key={m.slug} src={m.logo_url} alt={m.name} className="h-12 w-12 rounded-xl object-contain" />
                ) : (
                  <span key={m.slug} className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0091ff]/10 text-lg font-black text-[#0091ff]">{m.name.charAt(0).toUpperCase()}</span>
                )
              )}
            </div>
            <h3 className="text-2xl font-black text-slate-900">{combo.plan_name}</h3>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-slate-500">O que está incluso</p>
            <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
              {lines.map((t) => (
                <li key={t} className="flex items-start gap-2 text-sm font-medium text-slate-700">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 stroke-[3] text-emerald-500" /> {t}
                </li>
              ))}
            </ul>
          </div>

          {items.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-slate-500">Turbine com add-ons (opcional)</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {items.map((a) => {
                  const on = sel.has(a.id);
                  const Icon = addonIcon(a);
                  return (
                    <button key={a.id} type="button" onClick={() => toggle(a.id)}
                      className={cn("flex cursor-pointer flex-col gap-2 rounded-2xl border-2 bg-white p-4 text-left transition-colors", on ? "border-[#fd8539] bg-[#fd8539]/5" : "border-slate-200 hover:border-[#fd8539]/60")}>
                      <span className="flex items-center justify-between">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fd8539]/10 text-[#fd8539]"><Icon size={18} /></span>
                        <span className={cn("flex h-5 w-5 items-center justify-center rounded border-2", on ? "border-[#fd8539] bg-[#fd8539] text-white" : "border-slate-300 bg-white")}>
                          {on && <Check size={12} strokeWidth={3} />}
                        </span>
                      </span>
                      <b className="text-sm text-slate-900">{a.upsell_headline || a.name}</b>
                      {a.description && <span className="text-[11px] leading-snug text-slate-500">{a.description}</span>}
                      <span className="mt-auto text-xs font-black text-[#c2571a]">+ {brl(Math.round(a.price_monthly * 100))}/mês</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 p-6 md:max-h-[94vh] md:overflow-y-auto">
          <p className="pr-8 text-sm font-black text-slate-900">Escolha uma assinatura</p>
          <div className="space-y-2">
            {CYCLES.map((c) => {
              const cents = cycleCents(combo, c.key);
              const m = CYCLE_MONTHS[c.key];
              const sum = sumFor(c.key);
              const pct = sum > cents ? Math.round(((sum - cents) / sum) * 100) : 0;
              const on = cycle === c.key;
              return (
                <button key={c.key} type="button" onClick={() => setCycle(c.key)}
                  className={cn("w-full cursor-pointer rounded-xl border-2 p-3 text-left transition-colors", on ? "border-[#3b63fb] bg-blue-50/40" : "border-slate-200 hover:border-slate-300")}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">{c.label}</span>
                    {pct > 0 && <span className="rounded bg-emerald-500 px-1.5 py-0.5 text-[9px] font-black uppercase text-white">Economize {pct}%</span>}
                  </div>
                  <p className="text-slate-900">
                    <span className="text-2xl font-black">{brl(Math.round(cents / m))}</span>
                    <span className="text-xs text-slate-500">/mês</span>
                  </p>
                  <p className="text-[11px] text-slate-500">{c.note}{c.key !== "monthly" ? ` Total ${brl(cents)}.` : ""}</p>
                </button>
              );
            })}
          </div>

          <div className="mt-auto space-y-3">
            <div className="space-y-1 rounded-xl bg-slate-50 p-3 text-xs">
              <div className="flex justify-between"><span className="text-slate-600">{combo.plan_name}</span><b>{brl(planCents)}</b></div>
              {items.filter((a) => sel.has(a.id)).map((a) => (
                <div key={a.id} className="flex justify-between"><span className="text-slate-600">{a.name}</span><b>{brl(Math.round(a.price_monthly * 100 * months))}</b></div>
              ))}
              <div className="flex justify-between border-t border-slate-200 pt-1.5 text-sm font-black text-slate-900"><span>Total</span><span>{brl(total)}</span></div>
              <p className="text-[10px] text-slate-400">Cupom e teste grátis no próximo passo.</p>
            </div>
            <button type="button" onClick={proceed} className="w-full cursor-pointer rounded-full bg-[#3b63fb] py-3 text-sm font-bold text-white hover:bg-[#2f52d6]">Continuar</button>
            <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500"><Lock className="h-3 w-3" /> Compra segura</p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}