import { useEffect, useMemo, useState } from 'react';
import { Loader2, Mail, MessageCircle } from 'lucide-react';
import { listNpsResponses, type NpsResponse } from '@/services/admin/npsAdmin';

const col = (s: number) => (s >= 9 ? '#10b981' : s >= 7 ? '#f59e0b' : '#f43f5e');
const tag = (s: number) => (s >= 9 ? 'Promotor' : s >= 7 ? 'Neutro' : 'Detrator');
const pick = (p: Record<string, unknown> | null, ...keys: string[]) => {
  for (const k of keys) { const v = p?.[k]; if (typeof v === 'string' && v.trim()) return v.trim(); }
  return null;
};
const waLink = (raw: string) => {
  const d = raw.replace(/\D/g, '');
  return `https://wa.me/${d.length <= 11 ? `55${d}` : d}`;
};

export default function NpsResponses({ days, labelsPain, labelsFeat }: { days: number; labelsPain: Record<string, string>; labelsFeat: Record<string, string> }) {
  const [rows, setRows] = useState<NpsResponse[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [group, setGroup] = useState<'all' | 'det' | 'pas' | 'pro'>('all');
  const [q, setQ] = useState('');

  useEffect(() => {
    setRows(null); setErr(null);
    listNpsResponses(days).then(setRows).catch((e: any) => setErr(e?.message ?? 'Erro ao carregar respostas'));
  }, [days]);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (rows ?? []).filter((r) => {
      if (group === 'det' && r.score > 6) return false;
      if (group === 'pas' && (r.score < 7 || r.score > 8)) return false;
      if (group === 'pro' && r.score < 9) return false;
      if (!term) return true;
      return [r.store_name, r.contact_name, r.email, r.comment].some((v) => (v ?? '').toLowerCase().includes(term));
    });
  }, [rows, group, q]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-bold text-slate-100">Respostas detalhadas e contato {rows ? `(${list.length})` : ''}</h4>
        <div className="flex items-center gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar loja, nome ou e-mail"
            className="h-9 w-56 rounded-lg border border-slate-700 bg-slate-900 px-3 text-xs text-slate-100 outline-none focus:border-amber-500" />
          <select value={group} onChange={(e) => setGroup(e.target.value as typeof group)}
            className="h-9 rounded-lg border border-slate-700 bg-slate-900 px-2 text-xs text-slate-200">
            <option value="all">Todas as notas</option>
            <option value="det">Detratores (0-6)</option>
            <option value="pas">Neutros (7-8)</option>
            <option value="pro">Promotores (9-10)</option>
          </select>
        </div>
      </div>

      {err ? <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4 text-sm text-rose-300">{err}</div>
        : !rows ? <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        : list.length === 0 ? <div className="rounded-2xl border border-slate-700/80 bg-slate-800/60 p-5 text-center text-sm text-slate-500">Nenhuma resposta encontrada.</div>
        : (
          <div className="grid gap-3 lg:grid-cols-2">
            {list.map((r) => {
              const pain = pick(r.payload, 'main_pain', 'mainPain', 'pain');
              const feature = pick(r.payload, 'top_feature', 'topFeature', 'feature');
              const painOther = pick(r.payload, 'main_pain_other', 'mainPainOther', 'pain_other');
              const color = col(r.score);
              return (
                <article key={r.id} className="rounded-2xl border border-slate-700/80 bg-slate-800/60 p-4" style={{ borderLeft: `4px solid ${color}` }}>
                  <div className="flex items-start gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl font-black" style={{ background: `${color}22`, color }}>{r.score}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-100">{r.store_name ?? 'Loja'}</p>
                      <p className="text-[11px] text-slate-400">{tag(r.score)} · {new Date(r.created_at).toLocaleString('pt-BR')}</p>
                    </div>
                  </div>
                  <dl className="mt-3 space-y-1.5 text-xs">
                    {pain && <div><dt className="inline font-semibold text-slate-400">Maior dificuldade: </dt><dd className="inline text-slate-200">{labelsPain[pain] ?? pain}{painOther ? ` — ${painOther}` : ''}</dd></div>}
                    {feature && <div><dt className="inline font-semibold text-slate-400">Funcionalidade favorita: </dt><dd className="inline text-slate-200">{labelsFeat[feature] ?? feature}</dd></div>}
                    {r.comment && <div><dt className="font-semibold text-slate-400">Comentário</dt><dd className="mt-0.5 rounded-lg bg-slate-900/60 p-2 text-sm leading-relaxed text-slate-200">{r.comment}</dd></div>}
                    {!pain && !feature && r.payload && Object.keys(r.payload).length > 0 && (
                      <pre className="overflow-x-auto rounded bg-slate-900/60 p-2 text-[10px] text-slate-400">{JSON.stringify(r.payload)}</pre>
                    )}
                  </dl>
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-700 pt-3">
                    <span className="mr-auto text-xs font-semibold text-slate-300">{r.contact_name ?? 'Contato não cadastrado'}</span>
                    {r.email && <a href={`mailto:${r.email}`} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 px-2.5 py-1.5 text-[11px] font-bold text-slate-200 hover:border-amber-500 hover:text-amber-400"><Mail className="h-3.5 w-3.5" />{r.email}</a>}
                    {r.whatsapp && <a href={waLink(r.whatsapp)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/10"><MessageCircle className="h-3.5 w-3.5" />{r.whatsapp}</a>}
                    {!r.email && !r.whatsapp && <span className="text-[11px] text-slate-500">Sem e-mail ou WhatsApp na loja</span>}
                  </div>
                </article>
              );
            })}
          </div>
        )}
    </div>
  );
}