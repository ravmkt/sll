import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Row = { id: string; code: string; times_used: number; subs: number; stores: number; by_status: Record<string, number> };

export default function CouponRanking() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (supabase as any).rpc('admin_coupon_stats').then(({ data, error }: any) => {
      if (error) { setErr(error.message || 'Erro ao carregar o ranking'); setRows([]); return; }
      setRows(((data || []) as any[]).map((r) => ({
        ...r, times_used: Number(r.times_used) || 0, subs: Number(r.subs) || 0, stores: Number(r.stores) || 0, by_status: r.by_status || {},
      })));
    });
  }, []);

  const max = Math.max(1, ...(rows ?? []).map((r) => r.subs));

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <h3 className="text-[15px] font-bold text-slate-100">Ranking de cupons</h3>
      <p className="mb-3 text-[12px] text-slate-500">Assinaturas e lojas que usaram cada cupom. Receita e desconto em R$ entram na próxima etapa.</p>
      {err && <p className="mb-2 text-sm text-rose-400">{err}</p>}
      {!rows ? (
        <p className="text-sm text-slate-500">Carregando...</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhum cupom criado.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-2 py-2">#</th>
                <th className="px-2 py-2">Cupom</th>
                <th className="px-2 py-2">Assinaturas</th>
                <th className="px-2 py-2">Lojas</th>
                <th className="px-2 py-2">Status das assinaturas</th>
                <th className="px-2 py-2 text-right">Contador de usos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {rows.map((r, n) => (
                <tr key={r.id}>
                  <td className="px-2 py-2 text-slate-500">{n + 1}</td>
                  <td className="px-2 py-2 font-bold tracking-wider text-slate-100">{r.code}</td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 tabular-nums text-slate-200">{r.subs}</span>
                      <div className="h-1.5 w-24 rounded-full bg-slate-800">
                        <div className="h-1.5 rounded-full bg-[#fd8539]" style={{ width: (r.subs / max) * 100 + '%' }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-2 tabular-nums text-slate-300">{r.stores}</td>
                  <td className="px-2 py-2 text-slate-400">
                    {Object.keys(r.by_status).length === 0 ? '—' : Object.entries(r.by_status).map(([k, v]) => k + ': ' + v).join(' · ')}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-slate-400">{r.times_used}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}