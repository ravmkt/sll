import { Check, Loader2, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type PlanCycle = "monthly" | "semiannual" | "yearly";

const SUBTITLE: Record<string, string> = {
  starter: "Para lojas iniciando a estratégia com vídeos",
  pro: "Para lojas com tráfego e vendas ativas",
  scale: "Para marcas consolidadas e alto volume",
};

const FEATURES: Record<string, string[]> = {
  starter: [
    "Até 5 vídeos ativos",
    "Até 5.000 visualizações/mês",
    "Todos os formatos (Flutuante, Carrossel, Carrossel Dinâmico e Grade)",
    "Botão de compra direta pelo WhatsApp",
    "Métricas básicas de views e cliques",
    "Suporte via E-mail",
  ],
  pro: [
    "Até 20 vídeos ativos",
    "Até 25.000 visualizações/mês",
    "Todos os formatos liberados",
    "Botão de compra direta pelo WhatsApp",
    "Rastreamento de conversão e receita gerada por vídeo",
    "Remoção da marca d'água Vidlytics",
    "Suporte direto via WhatsApp",
  ],
  scale: [
    "Até 150 vídeos ativos",
    "Até 180.000 visualizações/mês",
    "Todos os formatos liberados",
    "Botão de compra direta pelo WhatsApp",
    "Rastreamento de conversão e receita gerada por vídeo",
    "Remoção da marca d'água Vidlytics",
    "Suporte direto via WhatsApp",
  ],
};

const MONTHS: Record<PlanCycle, number> = { monthly: 1, semiannual: 6, yearly: 12 };
const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type Props = {
  tier: string;
  title: string;
  moduleName: string;
  logoUrl: string | null;
  monthlyCents: number;
  semiannualCents: number;
  annualCents: number;
  cycle: PlanCycle;
  isPopular?: boolean;
  contactUrl?: string;
  isLoading?: boolean;
  onSelect: () => void;
};

export function VidlyticsPlanCard({
  tier, title, moduleName, logoUrl, monthlyCents, semiannualCents, annualCents,
  cycle, isPopular, contactUrl, isLoading, onSelect,
}: Props) {
  const total = cycle === "yearly" ? annualCents : cycle === "semiannual" ? semiannualCents : monthlyCents;
  const perMonth = Math.round(total / MONTHS[cycle]);
  const yearSaving = monthlyCents * 12 - annualCents;
  const features = FEATURES[tier] ?? [];

  return (
    <div
      className={cn(
        "relative flex flex-col justify-between rounded-3xl border bg-white p-6 sm:p-7 transition-all duration-300 hover:-translate-y-1.5 shadow-sm",
        isPopular ? "border-[#0091ff] shadow-lg shadow-blue-500/10 ring-1 ring-[#0091ff]/30" : "border-slate-200"
      )}
    >
      {isPopular && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[#0091ff] px-3.5 py-1 text-[10px] font-black uppercase tracking-widest text-white shadow-md">
          Mais popular
        </div>
      )}

      <div>
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
          {logoUrl ? (
            <img src={logoUrl} alt={moduleName} className="h-10 w-10 shrink-0 rounded-xl bg-white object-contain p-1 border border-slate-100" />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0091ff]/10 text-sm font-black text-[#0091ff]">
              {moduleName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{moduleName}</p>
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight leading-tight">{title}</h3>
          </div>
        </div>

        {SUBTITLE[tier] && <p className="text-xs font-medium text-slate-500 mb-4">{SUBTITLE[tier]}</p>}

        {cycle === "yearly" && monthlyCents > perMonth && (
          <p className="text-xs font-bold text-slate-400 line-through">De {brl(monthlyCents)}/mês</p>
        )}
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-black text-slate-900 tracking-tight">{brl(perMonth)}</span>
          <span className="text-xs font-bold text-slate-400">/mês</span>
        </div>
        {cycle !== "monthly" && (
          <span className="text-[10px] font-bold text-slate-500 mt-1 block">
            Total cobrado: {brl(total)} {cycle === "yearly" ? "por ano" : "a cada 6 meses"}
          </span>
        )}
        {cycle === "yearly" && yearSaving > 0 && (
          <span className="mt-1 inline-block rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-black text-emerald-700">
            Você economiza {brl(yearSaving)} por ano
          </span>
        )}

        <ul className="mt-5 space-y-2.5 border-t border-slate-100 pt-4">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-xs font-bold text-slate-700">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#0091ff] text-white">
                <Check size={11} className="stroke-[3]" />
              </span>
              <span>{f}</span>
            </li>
          ))}
          {tier === "scale" && contactUrl && (
            <li className="flex items-start gap-2.5 text-xs font-bold">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                <MessageCircle size={10} />
              </span>
              <a href={contactUrl} target="_blank" rel="noreferrer" className="text-emerald-600 hover:underline">
                Precisa de algo maior? Fale conosco e monte um plano sob medida
              </a>
            </li>
          )}
        </ul>
      </div>

      <div className="mt-7 pt-4 border-t border-slate-100">
        <button
          type="button"
          disabled={isLoading}
          onClick={onSelect}
          className="w-full rounded-2xl bg-[#0091ff] hover:bg-[#0070f3] text-white shadow-lg hover:scale-[1.02] py-3 px-4 text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2"
        >
          {isLoading ? <Loader2 size={14} className="animate-spin" /> : "Assinar"}
        </button>
      </div>
    </div>
  );
}