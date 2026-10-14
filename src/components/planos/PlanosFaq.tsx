import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const FAQ: { q: string; a: string }[] = [
  {
    q: "Posso assinar só um módulo e adicionar outro depois?",
    a: "Sim. Você pode começar por um módulo avulso e contratar os outros quando quiser, direto por esta página.",
  },
  {
    q: "Quando eu contrato outro módulo, tenho teste grátis?",
    a: "Quem já tem um plano pago ganha 7 dias de teste ao contratar um novo módulo avulso, uma vez por módulo. Combos não têm período de teste.",
  },
  {
    q: "Como funciona o upgrade de plano?",
    a: "Escolha o plano superior nesta página e conclua o checkout. Os limites do novo plano passam a valer após a confirmação do pagamento.",
  },
  {
    q: "Posso cancelar quando quiser?",
    a: "Sim. O cancelamento é feito em Minhas Assinaturas, sem multa.",
  },
  {
    q: "O que são os add-ons?",
    a: "Pacotes extras de capacidade, como mais vídeos ativos ou mais visualizações, cobrados junto com a sua assinatura. Você pode adicioná-los ao escolher o plano ou depois.",
  },
  {
    q: "Os preços incluem nota fiscal?",
    a: "A nota fiscal é emitida com os dados de faturamento que você informa no checkout. O pagamento é feito no ambiente seguro do Asaas.",
  },
];

export default function PlanosFaq() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section className="mx-auto max-w-3xl space-y-4 pt-4">
      <h2 className="text-center text-2xl font-black tracking-tight text-slate-900">Perguntas frequentes</h2>
      <div className="divide-y divide-slate-200 border-y border-slate-200">
        {FAQ.map((f, i) => (
          <div key={f.q}>
            <button
              type="button"
              onClick={() => setOpen(open === i ? null : i)}
              aria-expanded={open === i}
              className="flex w-full items-center justify-between gap-4 py-4 text-left text-sm font-bold text-slate-900"
            >
              {f.q}
              <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform", open === i && "rotate-180")} />
            </button>
            {open === i && <p className="pb-4 text-sm leading-relaxed text-slate-600">{f.a}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}