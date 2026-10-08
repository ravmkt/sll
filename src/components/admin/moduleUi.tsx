import type { ReactNode } from 'react';

export const CARD = 'rounded-2xl border border-slate-800 bg-[#111524] p-4';
export const INPUT = 'h-9 w-full rounded-lg border border-slate-700 bg-[#0b0e1a] px-3 text-xs text-slate-200 outline-none focus:border-[#0094eb]';
export const SELECT = 'h-8 rounded-lg border border-slate-700 bg-[#0b0e1a] px-2 text-xs text-slate-200 outline-none focus:border-[#0094eb]';

export const STATUS_LABEL: Record<string, string> = { active: 'Ativo', coming_soon: 'Em breve' };
export const SUB_LABEL: Record<string, string> = { active: 'Ativa', trialing: 'Trial', past_due: 'Em atraso', lifetime: 'Vitalícia' };
export const CYCLE_LABEL: Record<string, string> = { monthly: 'Mensal', semiannual: 'Semestral', annual: 'Anual' };

export const int = (n: number | null | undefined) => (Number(n) || 0).toLocaleString('pt-BR');
export const brl = (cents: number | null | undefined) => ((Number(cents) || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const bytes = (b: number | null | undefined) => {
  const mb = (Number(b) || 0) / 1048576;
  return mb < 1024 ? `${mb.toFixed(1).replace('.', ',')} MB` : `${(mb / 1024).toFixed(2).replace('.', ',')} GB`;
};

export function Kpi({ label, value, tone }: { label: string; value: ReactNode; tone?: string }) {
  return (
    <div className="rounded-xl bg-white/[0.03] px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-0.5 text-lg font-black ${tone || 'text-white'}`}>{value}</p>
    </div>
  );
}

export function ModuleLogo({ url, name, size = 40 }: { url: string | null; name: string; size?: number }) {
  const style = { width: size, height: size };
  return url ? (
    <img src={url} alt={name} style={style} className="shrink-0 rounded-xl bg-white object-contain p-1" />
  ) : (
    <div style={style} className="flex shrink-0 items-center justify-center rounded-xl bg-[#fd8539]/15 text-sm font-black text-[#fd8539]">
      {(name || '?').charAt(0).toUpperCase()}
    </div>
  );
}