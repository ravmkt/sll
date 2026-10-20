import { useEffect, useMemo, useState } from 'react';
import { Lightbulb, Mail, MessageCircle, ThumbsUp } from 'lucide-react';
import type { NpsResponse } from '@/services/admin/npsAdmin';
import { STATUS_LABEL, adminList, type AdminRow } from '@/services/requests';

const CARD = 'rounded-2xl border border-slate-700/80 bg-slate-800/60 p-5';

const waLink = (raw: string) => {
  const d = raw.replace(/\D/g, '');
  return `https://wa.me/${d.length <= 11 ? `55${d}` : d}`;
};

const reasonOf = (r: NpsResponse): string => {
  if (r.comment && r.comment.trim()) return r.comment.trim();
  const a = r.payload?.answers;
  if (Array.isArray(a)) {
    for (const x of a as any[]) {
      if (x?.type === 'text') {
        const v = String(x.value ?? '').trim();
        if (v) return v;
      }
    }
    for (const x of a as any[]) {
      if ((x?.type === 'single' || x?.type === 'multi') && Array.isArray(x.labels) && x.labels.length) return x.labels.join(', ');
    }
  }
  return '';
};

export function NpsRadar({ rows }: { rows: NpsResponse[] | null }) {
  const list = useMemo(
    () =>
      (rows ?? [])
        .filter((r) => r.score != null && r.score <= 6)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [rows],
  );
  return (
    <div className={CARD}>
      <h4 className="text-sm font-bold text-slate-100">Radar de detratores</h4>
      <p className="mb-4 text-[11px] text-slate-500">Notas de 0 a 6. Fale com eles antes que cancelem.</p>
      {!rows ? (
        <p className="text-sm text-slate-500">Carregando...</p>
      ) : list.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhum detrator no período. Ótimo sinal.</p>
      ) : (
        <ul className="space-y-3">
          {list.slice(0, 6).map((r) => {
            const why = reasonOf(r);
            return (
              <li key={r.id} className="flex items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-500/5 p-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/20 text-sm font-black text-rose-300">{r.score}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-100">{r.store_name ?? 'Loja'}</p>
                  <p className="text-[11px] text-slate-500">
                    {r.contact_name ?? 'Contato não cadastrado'} · {new Date(r.created_at).toLocaleDateString('pt-BR')}
                  </p>
                  {why && <p className="mt-1 line-clamp-2 text-xs text-slate-300">{why}</p>}
                </div>
                {r.whatsapp ? (
                  <a href={waLink(r.whatsapp)} target="_blank" rel="noreferrer"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-500 px-2.5 py-1.5 text-[11px] font-bold text-slate-900 hover:bg-emerald-400">
                    <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                  </a>
                ) : r.email ? (
                  <a href={`mailto:${r.email}`}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-600 px-2.5 py-1.5 text-[11px] font-bold text-slate-200 hover:border-amber-500 hover:text-amber-400">
                    <Mail className="h-3.5 w-3.5" /> E-mail
                  </a>
                ) : (
                  <span className="shrink-0 text-[10px] text-slate-500">Sem contato</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {list.length > 6 && <p className="mt-3 text-[11px] text-slate-500">+ {list.length - 6} na aba Respostas do NPS (filtro Detratores).</p>}
    </div>
  );
}

export function TopIdeas() {
  const [rows, setRows] = useState<AdminRow[] | null>(null);
  useEffect(() => {
    adminList().then((l) => setRows(l.filter((x) => !x.hidden))).catch(() => setRows([]));
  }, []);
  const top = useMemo(() => [...(rows ?? [])].sort((a, b) => b.votes - a.votes).slice(0, 5), [rows]);
  return (
    <div className={CARD}>
      <h4 className="flex items-center gap-2 text-sm font-bold text-slate-100"><Lightbulb className="h-4 w-4 text-amber-400" /> Ideias mais pedidas</h4>
      <p className="mb-4 text-[11px] text-slate-500">Vêm do card de sugestões e do quadro de votação dos lojistas.</p>
      {!rows ? (
        <p className="text-sm text-slate-500">Carregando...</p>
      ) : top.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhuma ideia registrada ainda.</p>
      ) : (
        <ol className="space-y-3">
          {top.map((i, n) => (
            <li key={i.id} className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-[11px] font-black text-amber-400">{n + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-xs font-semibold text-slate-200">{i.title}</p>
                <p className="text-[10px] text-slate-500">{i.module} · {STATUS_LABEL[i.status]}</p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-700 px-2 py-0.5 text-[11px] font-black text-slate-100">
                <ThumbsUp className="h-3 w-3" /> {i.votes}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}