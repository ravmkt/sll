import { Fragment, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Loader2, Mail, MessageCircle } from 'lucide-react';
import { listNpsResponses, type NpsResponse } from '@/services/admin/npsAdmin';

const col = (s: number | null) => (s == null ? '#64748b' : s >= 9 ? '#10b981' : s >= 7 ? '#f59e0b' : '#f43f5e');
const tag = (s: number | null) => (s == null ? 'Sem nota' : s >= 9 ? 'Promotor' : s >= 7 ? 'Neutro' : 'Detrator');
const TH = 'px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500';
const waLink = (raw: string) => {
  const d = raw.replace(/\D/g, '');
  return `https://wa.me/${d.length <= 11 ? `55${d}` : d}`;
};
const pick = (p: Record<string, unknown> | null, k: string) => {
  const v = p?.[k];
  return typeof v === 'string' && v.trim() ? v.trim() : null;
};

type Qa = { title: string; text: string; kind: string };

const answersOf = (r: NpsResponse, lp: Record<string, string>, lf: Record<string, string>): Qa[] => {
  const raw = r.payload?.answers;
  if (Array.isArray(raw)) {
    return raw.map((x: any) => {
      const kind = String(x?.type ?? 'text');
      let text = '';
      if (kind === 'single' || kind === 'multi') {
        text = (Array.isArray(x.labels) ? x.labels : []).join(', ');
        if (x.other) text += ` (${x.other})`;
      } else text = String(x?.value ?? '');
      return { title: String(x?.title ?? ''), text, kind };
    }).filter((a) => a.text);
  }
  const out: Qa[] = [];
  const pain = pick(r.payload, 'main_pain');
  const feat = pick(r.payload, 'top_feature');
  const other = pick(r.payload, 'main_pain_other');
  if (pain) out.push({ title: 'Maior dificuldade', text: (lp[pain] ?? pain) + (other ? ` (${other})` : ''), kind: 'single' });
  if (feat) out.push({ title: 'Funcionalidade favorita', text: lf[feat] ?? feat, kind: 'single' });
  if (r.comment) out.push({ title: 'Comentário', text: r.comment, kind: 'text' });
  return out;
};

export default function NpsResponses({ days, surveyId, labelsPain, labelsFeat }: {
  days: number; surveyId?: string | null; labelsPain?: Record<string, string>; labelsFeat?: Record<string, string>;
}) {
  const [rows, setRows] = useState<NpsResponse[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [group, setGroup] = useState<'all' | 'det' | 'pas' | 'pro'>('all');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    setRows(null); setErr(null);
    listNpsResponses(days, surveyId).then(setRows).catch((e: any) => setErr(e?.message ?? 'Erro ao carregar respostas'));
  }, [days, surveyId]);

  const lp = labelsPain ?? {};
  const lf = labelsFeat ?? {};

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (rows ?? []).filter((r) => {
      const s = r.score as number | null;
      if (group === 'det' && (s == null || s > 6)) return false;
      if (group === 'pas' && (s == null || s < 7 || s > 8)) return false;
      if (group === 'pro' && (s == null || s < 9)) return false;
      if (!term) return true;
      return [r.store_name, r.contact_name, r.email, r.comment, r.survey_name].some((v) => (v ?? '').toLowerCase().includes(term));
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
          <div className="overflow-x-auto rounded-2xl border border-slate-700/80 bg-slate-800/60">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-700/80">
                <tr>
                  <th className={`${TH} w-16 text-center`}>Nota</th>
                  <th className={TH}>Loja / contato</th>
                  <th className={TH}>Pesquisa</th>
                  <th className={TH}>Respostas</th>
                  <th className={TH}>Data</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {list.map((r) => {
                  const s = r.score as number | null;
                  const c = col(s);
                  const qa = answersOf(r, lp, lf);
                  const isOpen = open === r.id;
                  const summary = qa.filter((a) => a.kind !== 'nps').map((a) => a.text).join(' · ');
                  return (
                    <Fragment key={r.id}>
                      <tr onClick={() => setOpen(isOpen ? null : r.id)} className="cursor-pointer align-middle hover:bg-white/5">
                        <td className="px-3 py-2.5 text-center">
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm font-black" style={{ background: `${c}22`, color: c }}>{s ?? '—'}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          <p className="font-bold text-slate-100">{r.store_name ?? 'Loja'}</p>
                          <p className="text-[11px] text-slate-500">{r.contact_name ?? 'Contato não cadastrado'} · {tag(s)}</p>
                        </td>
                        <td className="px-3 py-2.5 text-slate-300">{r.survey_name ?? 'NPS'}</td>
                        <td className="max-w-[360px] px-3 py-2.5"><p className="truncate text-slate-300">{summary || '—'}</p></td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-slate-400">{new Date(r.created_at).toLocaleString('pt-BR')}</td>
                        <td className="px-2 text-slate-500">{isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-slate-900/50">
                          <td colSpan={6} className="space-y-3 px-4 py-3">
                            <dl className="grid gap-2 sm:grid-cols-2">
                              {qa.map((a, i) => (
                                <div key={i} className="rounded-lg bg-slate-800/80 p-2.5">
                                  <dt className="text-[11px] font-semibold text-slate-400">{a.title}</dt>
                                  <dd className="mt-0.5 whitespace-pre-wrap text-sm text-slate-100">{a.text}</dd>
                                </div>
                              ))}
                              {qa.length === 0 && <p className="text-slate-500">Sem respostas registradas.</p>}
                            </dl>
                            <div className="flex flex-wrap items-center gap-2 border-t border-slate-700 pt-3">
                              {r.email && <a href={`mailto:${r.email}`} onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 px-2.5 py-1.5 text-[11px] font-bold text-slate-200 hover:border-amber-500 hover:text-amber-400"><Mail className="h-3.5 w-3.5" />{r.email}</a>}
                              {r.whatsapp && <a href={waLink(r.whatsapp)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/10"><MessageCircle className="h-3.5 w-3.5" />{r.whatsapp}</a>}
                              {!r.email && !r.whatsapp && <span className="text-[11px] text-slate-500">Sem e-mail ou WhatsApp na loja</span>}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}