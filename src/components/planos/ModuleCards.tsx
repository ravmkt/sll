import { Check } from "lucide-react";
import type { CatalogModule, CatalogPlan } from "@/services/plans/getCatalogShowcase";
import { brl } from "@/components/planos/planosShared";

type Props = {
  byModule: [string, CatalogPlan[]][];
  mods: CatalogModule[];
  onOpen: (slug: string) => void;
};

export default function ModuleCards({ byModule, mods, onOpen }: Props) {
  if (byModule.length === 0) return null;
  const bySlug = new Map(mods.map((m) => [m.slug, m]));

  return (
    <section className="max-w-5xl mx-auto space-y-5">
      <div className="text-center space-y-1">
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Escolha o módulo</h2>
        <p className="text-sm font-medium text-slate-500">Clique em Comprar agora para comparar os planos e escolher o ciclo de cobrança.</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {byModule.map(([slug, list]) => {
          const mod = bySlug.get(slug) as any;
          const priced = list.filter((p) => p.price_monthly_cents > 0);
          const starter = priced.find((p) => String(p.plan_tier).toLowerCase() === "starter");
          const base = starter ?? [...priced].sort((a, b) => a.price_monthly_cents - b.price_monthly_cents)[0];
          const name = mod?.name || slug;
          const desc: string = mod?.description || "";
          const feats: string[] = (Array.isArray(mod?.features) ? mod.features : Array.isArray(mod?.benefits) ? mod.benefits : []).slice(0, 3);

          return (
            <div key={slug} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-lg">
              {mod?.logo_url ? (
                <img src={mod.logo_url} alt={name} className="mb-1 h-20 max-w-[240px] self-start object-contain object-left" />
              ) : (
                <h3 className="text-xl font-black text-slate-900">{name}</h3>
              )}

              {base ? (
                <div className="mt-1">
                  <p className="text-[11px] font-semibold text-slate-500">A partir de</p>
                  <p className="text-slate-900">
                    <span className="text-2xl font-black tracking-tight">{brl(base.price_monthly_cents)}</span>
                    <span className="text-sm font-bold text-slate-500">/mês</span>
                  </p>
                  <p className="text-xs italic text-slate-500">Plano {base.plan_name}, cobrado mensalmente</p>
                </div>
              ) : (
                <p className="mt-2 text-sm font-semibold text-slate-400">Preço em breve</p>
              )}

              {desc && <p className="mt-3 text-sm leading-relaxed text-slate-600">{desc}</p>}
              {feats.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {feats.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs font-medium text-slate-700">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 stroke-[3] text-emerald-500" /> {f}
                    </li>
                  ))}
                </ul>
              )}

              <button type="button" onClick={() => onOpen(slug)} className="mt-3 w-fit cursor-pointer text-left text-xs font-semibold text-[#0091ff] underline hover:text-[#0070f3]">
                Veja todos os planos e detalhes de preços
              </button>

              <div className="mt-auto pt-5">
                <button
                  type="button"
                  disabled={!base}
                  onClick={() => onOpen(slug)}
                  className="w-full cursor-pointer rounded-full bg-[#3b63fb] py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#2f52d6] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Comprar agora
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}