import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CatalogPlan } from "@/services/plans/getCatalogShowcase";

type Cell = string | boolean;
type Row = { label: string; v: [Cell, Cell, Cell] };
type Group = { title: string; rows: Row[] };

const TIERS = ["starter", "pro", "scale"];

// Recursos por modulo, na ordem Starter / Pro / Scale.
// Modulo sem entrada aqui nao mostra o comparativo.
const FEATURES: Record<string, Group[]> = {
  vidlytics: [
    {
      title: "Capacidade e consumo",
      rows: [
        { label: "Vídeos ativos simultâneos", v: ["5 vídeos", "20 vídeos", "50 vídeos"] },
        { label: "Franquia de views mensais", v: ["5.000", "25.000", "60.000"] },
        { label: "Todos os formatos (Flutuante, Stories, Carrossel, Grade)", v: [true, true, true] },
      ],
    },
    {
      title: "Conversão e inteligência",
      rows: [
        { label: "Botão Comprar via WhatsApp", v: [true, true, true] },
        { label: "Métricas básicas de views e cliques", v: [true, true, true] },
        { label: "Rastreamento de vendas e faturamento por vídeo", v: [false, true, true] },
        { label: "Player sem marca d'água (white-label)", v: [false, true, true] },
      ],
    },
    {
      title: "Atendimento",
      rows: [
        { label: "Suporte por e-mail", v: [true, true, true] },
        { label: "Suporte direto via WhatsApp com especialista", v: [false, true, true] },
      ],
    },
  ],
};

export default function ComparePlans({
  slug,
  plans,
  selectedId,
  onSelect,
  isCurrent,
}: {
  slug: string;
  plans: CatalogPlan[];
  selectedId: string;
  onSelect: (id: string) => void;
  isCurrent: (p: CatalogPlan) => boolean;
}) {
  const groups = FEATURES[slug];
  if (!groups || plans.length === 0) return null;

  const tierIdx = (p: CatalogPlan) => TIERS.indexOf(String(p.plan_tier || "").toLowerCase());

  const render = (c: Cell | undefined) => {
    if (c === true) return <Check className="mx-auto h-4 w-4 stroke-[3] text-emerald-500" />;
    if (c === false || c === undefined) return <Minus className="mx-auto h-4 w-4 text-slate-300" />;
    return <span className="font-bold text-slate-800">{c}</span>;
  };

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">Compare o que cada plano inclui</p>
      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-white">
              <th className="p-2" />
              {plans.map((p) => {
                const on = p.id === selectedId;
                const cur = isCurrent(p);
                return (
                  <th key={p.id} className={cn("p-1 text-center", on && "bg-[#0091ff]/5")}>
                    <button
                      type="button"
                      disabled={cur}
                      onClick={() => onSelect(p.id)}
                      className={cn(
                        "w-full rounded-lg px-1 py-1.5 text-[10px] font-black uppercase tracking-wider",
                        on ? "text-[#0091ff]" : "text-slate-500 hover:text-slate-800",
                        cur && "cursor-not-allowed opacity-50"
                      )}
                    >
                      {String(p.plan_tier || p.plan_name)}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <>
                <tr key={g.title} className="bg-slate-50">
                  <td colSpan={plans.length + 1} className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    {g.title}
                  </td>
                </tr>
                {g.rows.map((r) => (
                  <tr key={g.title + r.label} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-medium text-slate-700">{r.label}</td>
                    {plans.map((p) => (
                      <td key={p.id} className={cn("px-1 py-2 text-center", p.id === selectedId && "bg-[#0091ff]/5")}>
                        {render(r.v[tierIdx(p)])}
                      </td>
                    ))}
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}