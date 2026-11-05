import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

export const cardCls = 'rounded-xl border border-slate-200 bg-white shadow-sm';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`${cardCls} ${className}`}>{children}</div>;
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-lg font-bold text-slate-900">{children}</h2>
      {right}
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-100 ${className}`} />;
}

export function ErrorBox({ message }: { message: string }) {
  return <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{message}</div>;
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 px-4 py-10 text-center">
      <Inbox className="h-8 w-8 text-slate-300" />
      <div className="text-sm font-medium text-slate-600">{title}</div>
      {hint && <div className="text-xs text-slate-400">{hint}</div>}
    </div>
  );
}

export function Badge({ children, tone = 'slate' }: { children: ReactNode; tone?: 'slate' | 'green' | 'red' | 'amber' | 'blue' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-600',
    green: 'bg-emerald-100 text-emerald-700',
    red: 'bg-red-100 text-red-700',
    amber: 'bg-amber-100 text-amber-700',
    blue: 'bg-blue-100 text-blue-700',
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

export function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
      <div className="mt-2 border-t border-slate-100 pt-2 text-xs text-slate-400">Sem dados anteriores</div>
    </Card>
  );
}

export type Period = 'hoje' | '7d' | '30d' | 'custom';
const periods: { id: Period; label: string }[] = [
  { id: 'hoje', label: 'Hoje' },
  { id: '7d', label: '7 dias' },
  { id: '30d', label: '30 dias' },
  { id: 'custom', label: 'Personalizado' },
];

export function PeriodSelector({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-sm">
      {periods.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onChange(p.id)}
          className={`rounded-md px-3 py-1 ${value === p.id ? 'bg-blue-600 font-medium text-white' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

export function HealthRing({ score }: { score: number | null }) {
  const r = 50;
  const c = 2 * Math.PI * r;
  const pct = score ?? 0;
  return (
    <svg viewBox="0 0 120 120" className="h-32 w-32">
      <circle cx="60" cy="60" r={r} fill="none" stroke="#e2e8f0" strokeWidth="12" />
      <circle
        cx="60" cy="60" r={r} fill="none" stroke="#2563eb" strokeWidth="12" strokeLinecap="round"
        strokeDasharray={`${(c * pct) / 100} ${c}`} transform="rotate(-90 60 60)"
      />
      <text x="60" y="68" textAnchor="middle" fontSize="28" fontWeight="700" fill="#0f172a">
        {score === null ? '--' : score}
      </text>
    </svg>
  );
}