import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Row = Record<string, unknown>;
interface Props { open: boolean; onClose: () => void; sector?: string | null; }

const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const pick = (r: Row, keys: string[]): number | null => {
  for (const k of keys) {
    const v = r[k];
    if (v !== null && v !== undefined && v !== '' && !Number.isNaN(Number(v))) return Number(v);
  }
  return null;
};
const pct = (v: number | null) => (v === null ? 'Sem dados' : `${v.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`);
const brl = (v: number | null) => (v === null ? 'Sem dados' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));

export function MarketStudyModal({ open, onClose, sector }: Props) {
  const [row, setRow] = useState<Row | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    (async () => {
      const { data } = await supabase.from('sector_benchmarks').select('*');
      if (!alive) return;
      const target = norm(sector || '');
      const found = (data as Row[] | null)?.find((r) =>
        Object.values(r).some((v) => typeof v === 'string' && target && (norm(v) === target || norm(v).includes(target) || target.includes(norm(v)) && norm(v).length > 3))
      ) ?? null;
      setRow(found);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [open, sector]);

  if (!open) return null;

  const items: { label: string; value: string }[] = row
    ? [
        { label: 'Taxa de conversão', value: pct(pick(row, ['avg_conversion_rate', 'conversion_rate', 'conversion'])) },
        { label: 'Ticket médio', value: brl(pick(row, ['avg_ticket', 'ticket_medio', 'avg_ticket_brl', 'ticket'])) },
        { label: 'CTR médio', value: pct(pick(row, ['avg_ctr', 'ctr'])) },
        { label: 'Abandono de carrinho', value: pct(pick(row, ['avg_cart_abandonment', 'cart_abandonment', 'abandono_carrinho'])) },
      ]
    : [];
  const updated = row && typeof row.updated_at === 'string' ? new Date(row.updated_at).toLocaleDateString('pt-BR') : null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Estudo de mercado</h2>
            <p className="text-sm text-slate-500">{sector || 'Setor não definido'}</p>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        {loading ? (
          <p className="py-8 text-center text-sm text-slate-500">Carregando...</p>
        ) : !row ? (
          <p className="py-8 text-center text-sm text-slate-500">Ainda não há benchmark para este setor.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {items.map((i) => (
                <div key={i.label} className="rounded-xl border border-slate-200 p-3">
                  <p className="text-xs text-slate-500">{i.label}</p>
                  <p className="mt-1 text-base font-bold text-slate-900">{i.value}</p>
                </div>
              ))}
            </div>
            {updated && <p className="mt-4 text-xs text-slate-400">Atualizado em {updated}</p>}
          </>
        )}
      </div>
    </div>
  );
}

export default MarketStudyModal;