import { useMemo, useState } from "react";
import { X, Check } from "lucide-react";

export type Cycle = "monthly" | "semiannual" | "annual";

export interface ComboModalData {
  name: string;
  description?: string;
  includes: string[];
  priceMonthly: number;
  priceSemiannual: number; // total do período
  priceAnnual: number;     // total do período
}
export interface ComboAddon { id: string; name: string; description?: string; priceMonthly: number; }

interface Props {
  open: boolean;
  combo: ComboModalData;
  addons: ComboAddon[];
  onClose: () => void;
  onContinue: (cycle: Cycle, addonIds: string[]) => void;
}

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function ComboModal({ open, combo, addons, onClose, onContinue }: Props) {
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const [selected, setSelected] = useState<string[]>([]);

  const cycles = useMemo(() => {
    const m = combo.priceMonthly;
    const off = (per: number) => (m > 0 ? Math.max(0, Math.round((1 - per / m) * 100)) : 0);
    const sPer = combo.priceSemiannual / 6;
    const aPer = combo.priceAnnual / 12;
    return [
      { key: "monthly" as Cycle, label: "Mensal", per: m, total: m, months: 1, off: 0, hint: "Cancele a qualquer momento, sem taxa." },
      { key: "semiannual" as Cycle, label: "Semestral", per: sPer, total: combo.priceSemiannual, months: 6, off: off(sPer), hint: `Cobrança única a cada 6 meses. Total ${brl(combo.priceSemiannual)}.` },
      { key: "annual" as Cycle, label: "Anual", per: aPer, total: combo.priceAnnual, months: 12, off: off(aPer), hint: `Cobrança única por ano. Total ${brl(combo.priceAnnual)}.` },
    ];
  }, [combo]);

  const current = cycles.find((c) => c.key === cycle)!;
  const addonsTotal = addons.filter((a) => selected.includes(a.id)).reduce((s, a) => s + a.priceMonthly * current.months, 0);
  const total = current.total + addonsTotal;

  if (!open) return null;

  const toggle = (id: string) => setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="relative grid max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl md:grid-cols-[1.6fr_1fr]" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-4 top-4 z-10 text-slate-500 hover:text-slate-900" aria-label="Fechar"><X size={20} /></button>

        <div className="overflow-y-auto p-8">
          <h2 className="text-2xl font-extrabold">{combo.name}</h2>
          {combo.description && <p className="mt-3 text-slate-600">{combo.description}</p>}
          <ul className="mt-5 space-y-2">
            {combo.includes.map((t, i) => (
              <li key={i} className="flex items-start gap-2 text-sm"><Check size={16} className="mt-0.5 shrink-0 text-emerald-600" />{t}</li>
            ))}
          </ul>

          {addons.length > 0 && (
            <>
              <h3 className="mt-8 text-xs font-bold uppercase tracking-wide text-slate-500">Turbine com add-ons (opcional)</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {addons.map((a) => (
                  <label key={a.id} className={`cursor-pointer rounded-xl border-2 p-4 ${selected.includes(a.id) ? "border-blue-600 bg-blue-50" : "border-slate-200"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold">{a.name}</span>
                      <input type="checkbox" checked={selected.includes(a.id)} onChange={() => toggle(a.id)} className="mt-1 h-4 w-4" />
                    </div>
                    {a.description && <p className="mt-1 text-xs text-slate-500">{a.description}</p>}
                    <p className="mt-2 text-sm font-bold text-orange-600">+ {brl(a.priceMonthly)}/mês</p>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex flex-col border-l border-slate-200 bg-white p-6">
          <h3 className="text-sm font-bold">Escolha uma assinatura</h3>
          <div className="mt-4 space-y-3">
            {cycles.map((c) => (
              <button key={c.key} onClick={() => setCycle(c.key)} className={`relative w-full rounded-xl border-2 p-4 text-left ${cycle === c.key ? "border-blue-600" : "border-slate-200"}`}>
                {c.off > 0 && <span className="absolute right-3 top-3 rounded bg-emerald-500 px-2 py-0.5 text-[10px] font-extrabold uppercase text-white">Economize {c.off}%</span>}
                <div className="text-sm font-semibold">{c.label}</div>
                <div className="mt-1"><span className="text-2xl font-extrabold">{brl(c.per)}</span><span className="text-xs text-slate-500">/mês</span></div>
                <div className="mt-1 text-xs text-slate-500">{c.hint}</div>
              </button>
            ))}
          </div>

          <div className="mt-auto pt-6">
            <div className="rounded-lg bg-slate-50 p-3 text-sm">
              <div className="flex justify-between"><span>{combo.name} ({current.label})</span><span>{brl(current.total)}</span></div>
              {addons.filter((a) => selected.includes(a.id)).map((a) => (
                <div key={a.id} className="flex justify-between text-slate-600"><span>{a.name}</span><span>{brl(a.priceMonthly * current.months)}</span></div>
              ))}
              <div className="mt-2 flex justify-between border-t pt-2 font-bold"><span>Total</span><span>{brl(total)}</span></div>
            </div>
            <button onClick={() => onContinue(cycle, selected)} className="mt-4 w-full rounded-full bg-blue-600 py-3 font-bold text-white hover:bg-blue-700">Continuar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
