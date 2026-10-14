const fmt = (c: number) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** Equivalente mensal e desconto do ciclo (valores em centavos). Ex.: "R$ 39,90/mês • 33% off" */
export function cycleInfo(total: number, months: number, monthly: number): string | null {
  if (!(total > 0) || !(monthly > 0) || months < 2) return null;
  const per = total / months;
  const off = Math.round((1 - per / monthly) * 100);
  return `${fmt(per)}/mês${off > 0 ? ` • ${off}% off` : ''}`;
}