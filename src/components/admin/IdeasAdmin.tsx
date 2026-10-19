import { useCallback, useEffect, useMemo, useState } from 'react';
import { Lightbulb, Loader2, ThumbsUp } from 'lucide-react';
import { listAdminIdeas, setAdminIdea, type AdminIdea } from '@/services/admin/ideasAdmin';
import { IDEA_STATUS, type IdeaStatus } from '@/services/ideas';

const TH = 'px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500';
const ORDER: IdeaStatus[] = ['received', 'analysis', 'planned', 'in_progress', 'done', 'hidden'];

export default function IdeasAdmin() {
  const [rows, setRows] = useState<AdminIdea[] | null>(null);
  const [filter, setFilter] = useState<'all' | IdeaStatus>('all');
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    try { setRows(await listAdminIdeas()); } catch (e: any) { setErr(e?.message ?? 'Erro ao carregar ideias'); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const update = async (r: AdminIdea, patch: { status?: IdeaStatus; title?: string }) => {
    const status = patch.status ?? r.status;
    const title = patch.title ?? r.public_title ?? '';
    setErr('');
    setRows((prev) => (prev ?? []).map((x) => (x.id === r.id ? { ...x, status, public_title: title.trim() || null } : x)));
    try { await setAdminIdea(r.id, status, title); }
    catch (e: any) { setErr(e?.message ?? 'Erro ao salvar'); void load(); }
  };

  const list = useMemo(() => (rows ?? []).filter((r) => filter === 'all' || r.status === filter), [rows, filter]);

  return (
    <section className="mt-8 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="flex items-center gap-2 text-sm font-bold text-slate-100">
          <Lightbulb className="h-4 w-4 text-amber-400" /> Ideias dos lojistas {rows ? `(${list.length})` : ''}
        </h4>
        <select value={filter} onChange={(e) => setFilter(e.target.value as 'all' | IdeaStatus)}
          className="h-9 rounded-lg border border-slate-700 bg-slate-900 px-2 text-xs text-slate-200">
          <option value="all">Todos os status</option>
          {ORDER.map((s) => <option key={s} value={s}>{IDEA_STATUS[s].label}</option>)}
        </select>
      </div>
      {err && <p className="text-sm font-semibold text-rose-400">{err}</p>}

      {!rows ? <Loader2 className="h-5 w-5 animate-spin text-slate-400" /> : (
        <div className="overflow-x-auto rounded-2xl border border-slate-700/80 bg-slate-800/60">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-700/80">
              <tr>
                <th className={`${TH} w-16 text-center`}>Votos</th>
                <th className={TH}>Ideia</th>
                <th className={TH}>Categoria</th>
                <th className={TH}>Loja</th>
                <th className={TH}>Data</th>
                <th className={TH}>Título público</th>
                <th className={TH}>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60">
              {list.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-500">Nenhuma ideia.</td></tr>}
              {list.map((r) => (
                <tr key={r.id} className="align-middle hover:bg-white/5">
                  <td className="px-3 py-2.5 text-center">
                    <span className="inline-flex items-center gap-1 font-black text-amber-400"><ThumbsUp className="h-3.5 w-3.5" />{r.votes}</span>
                  </td>
                  <td className="max-w-[280px] px-3 py-2.5 text-slate-200">{r.body}</td>
                  <td className="px-3 py-2.5 text-slate-400">{r.category}</td>
                  <td className="px-3 py-2.5 text-slate-300">{r.store_name ?? '—'}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-slate-400">{new Date(r.created_at).toLocaleDateString('pt-BR')}</td>
                  <td className="px-3 py-2.5">
                    <input key={`${r.id}-${r.public_title ?? ''}`} defaultValue={r.public_title ?? ''} maxLength={120} placeholder="Igual ao texto original"
                      onBlur={(e) => { if (e.target.value.trim() !== (r.public_title ?? '')) void update(r, { title: e.target.value }); }}
                      className="h-8 w-52 rounded-lg border border-slate-700 bg-slate-900 px-2 text-xs text-slate-100 outline-none focus:border-amber-500" />
                  </td>
                  <td className="px-3 py-2.5">
                    <select value={r.status} onChange={(e) => void update(r, { status: e.target.value as IdeaStatus })}
                      className="h-8 rounded-lg border border-slate-700 bg-slate-900 px-2 text-xs text-slate-200">
                      {ORDER.map((s) => <option key={s} value={s}>{IDEA_STATUS[s].label}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}