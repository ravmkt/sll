import { useEffect, useState } from 'react';
import { Bot, Loader2 } from 'lucide-react';
import { getNoahCredits, type NoahCredits } from '@/services/admin/noahCreditsService';

const int = (n: number) => (Number(n) || 0).toLocaleString('pt-BR');
const renov = (d: string | null) => {
  const m = String(d ?? '').match(/^\d{4}-(\d{2})-(\d{2})/);
  return m ? `${m[2]}/${m[1]}` : '';
};
const tone = (pct: number) => (pct >= 90 ? 'bg-rose-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500');

export function AiCredits({ c }: { c?: NoahCredits }) {
  if (!c) return <span className="text-slate-600">—</span>;
  if (c.credits_total <= 0) return <span className="text-slate-500">Sem plano</span>;
  const pct = Math.min(100, Math.round((c.credits_used / c.credits_total) * 100));
  return (
    <div className="min-w-[120px]">
      <p className="font-bold text-slate-200">{int(c.credits_used)} / {int(c.credits_total)} msgs</p>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800">
        <div className={`h-full rounded-full ${tone(pct)}`} style={{ width: `${Math.max(pct, c.credits_used > 0 ? 4 : 0)}%` }} />
      </div>
      <p className="mt-0.5 text-xs text-slate-500">
        {c.credits_extra > 0 ? `+${int(c.credits_extra)} extras · ` : ''}{renov(c.renewal_date) ? `renova ${renov(c.renewal_date)}` : 'sem uso no mês'}
      </p>
    </div>
  );
}

export default function StoreAiCreditsCard({ storeId }: { storeId: string }) {
  const [c, setC] = useState<NoahCredits | undefined>();
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    getNoahCredits(storeId)
      .then((l) => { if (alive) setC(l[0]); })
      .catch(() => { if (alive) setC(undefined); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [storeId]);

  return (
    <div className="rounded-2xl border border-white/10 bg-[#111524] p-4">
      <div className="mb-3 flex items-center gap-2">
        <Bot className="h-4 w-4 text-sky-400" />
        <h3 className="text-[15px] font-bold text-white">Mensagens do Noah (IA)</h3>
      </div>
      {loading ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : <AiCredits c={c} />}
    </div>
  );
}