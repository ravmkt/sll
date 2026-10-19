import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { NpsComment } from '@/services/admin/npsAdmin';

const TH = 'px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500';
const col = (s: number | null) => (s == null ? '#64748b' : s >= 9 ? '#10b981' : s >= 7 ? '#f59e0b' : '#f43f5e');
const tag = (s: number | null) => (s == null ? 'Sem nota' : s >= 9 ? 'Promotor' : s >= 7 ? 'Neutro' : 'Detrator');

export default function NpsVoice({ comments }: { comments: NpsComment[] | null }) {
  const [q, setQ] = useState('');

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (comments ?? []).filter((c) =>
      !term || [c.store, c.comment, c.pain_other].some((v) => (v ?? '').toLowerCase().includes(term)));
  }, [comments, q]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-bold text-slate-100">Voz do cliente {comments ? `(${list.length})` : ''}</h4>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar loja ou comentário"
          className="h-9 w-56 rounded-lg border border-slate-700 bg-slate-900 px-3 text-xs text-slate-100 outline-none focus:border-amber-500" />
      </div>
      {!comments ? <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        : list.length === 0 ? <div className="rounded-2xl border border-slate-700/80 bg-slate-800/60 p-5 text-center text-sm text-slate-500">Nenhum comentário no período.</div>
        : (
          <div className="overflow-x-auto rounded-2xl border border-slate-700/80 bg-slate-800/60">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-700/80">
                <tr>
                  <th className={`${TH} w-16 text-center`}>Nota</th>
                  <th className={TH}>Loja</th>
                  <th className={TH}>Comentário</th>
                  <th className={TH}>Outra dor</th>
                  <th className={TH}>Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {list.map((c, i) => {
                  const s = c.score as number | null;
                  const color = col(s);
                  return (
                    <tr key={i} className="align-top hover:bg-white/5">
                      <td className="px-3 py-2.5 text-center">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm font-black" style={{ background: `${color}22`, color }} title={tag(s)}>{s ?? '—'}</span>
                      </td>
                      <td className="px-3 py-2.5 font-bold text-slate-100">{c.store ?? 'Loja'}</td>
                      <td className="max-w-[420px] whitespace-pre-wrap px-3 py-2.5 text-slate-200">{c.comment ?? '—'}</td>
                      <td className="max-w-[220px] px-3 py-2.5 text-slate-400">{c.pain_other ?? '—'}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-slate-400">{new Date(c.created_at).toLocaleDateString('pt-BR')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}