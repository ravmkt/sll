import React from 'react';
import { CalendarDays, Hourglass, Percent, Wallet } from 'lucide-react';
import { buildClubeRules, type ClubeSettings } from './clubeTerms';

const brl = (n: number) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function ClubeRulesContent({ settings }: { settings: ClubeSettings }) {
  const sections = buildClubeRules(settings);
  const highlights = [
    { icon: Percent, label: 'Comissão', value: '10% recorrente' },
    { icon: Hourglass, label: 'Carência', value: `${settings.grace_days} dias` },
    { icon: CalendarDays, label: 'Pagamento', value: `Todo dia ${settings.payout_day}` },
    { icon: Wallet, label: 'Saque mínimo', value: brl(settings.min_withdrawal) },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {highlights.map((h) => (
          <div key={h.label} className="rounded-xl border border-[#fd8539]/30 bg-[#fd8539]/10 p-3">
            <h.icon className="mb-1 h-4 w-4 text-[#fd8539]" />
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{h.label}</p>
            <p className="text-sm font-black text-slate-900 dark:text-white">{h.value}</p>
          </div>
        ))}
      </div>

      {sections.map((sec, i) => (
        <section key={sec.id} className="space-y-1.5">
          <h4 className="text-sm font-black text-slate-900 dark:text-white">
            {i + 1}. {sec.title}
          </h4>
          <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {sec.items.map((it, j) => (
              <li key={j}>{it}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}