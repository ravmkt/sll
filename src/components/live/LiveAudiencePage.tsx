import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, MessageCircle, RefreshCw, Search, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type Lead = {
  id: string;
  live_id: string | null;
  name: string;
  email: string;
  whatsapp: string;
  source: string;
  created_at: string;
};

const T = {
  title: 'Audi\u00eancia',
  sub: 'Pessoas que se cadastraram para ser avisadas das pr\u00f3ximas lives.',
  search: 'Buscar por nome, e-mail ou WhatsApp',
  csv: 'Exportar CSV',
  reload: 'Atualizar',
  empty: 'Nenhum cadastro encontrado.',
  err: 'N\u00e3o foi poss\u00edvel carregar os cadastros. Verifique a permiss\u00e3o de leitura (policy live_leads_select_owner).',
  cols: ['Nome', 'E-mail', 'WhatsApp', 'Live de origem', 'Data'],
};

function fmtPhone(v: string): string {
  const d = String(v || '').replace(/\D/g, '');
  if (d.length === 11) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
  if (d.length === 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
  return d;
}

function fmtDate(v: string): string {
  const d = new Date(v);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function waLink(v: string): string {
  const d = String(v || '').replace(/\D/g, '');
  return 'https://wa.me/' + (d.length <= 11 ? '55' + d : d);
}

function csvCell(v: string): string {
  return '"' + String(v ?? '').replace(/"/g, '""') + '"';
}

export default function LiveAudiencePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const db = (supabase as any).schema('live_commerce');
      const [l, v] = await Promise.all([
        db.from('live_leads').select('id,live_id,name,email,whatsapp,source,created_at').order('created_at', { ascending: false }).limit(5000),
        db.from('lives').select('id,title'),
      ]);
      if (l.error) throw l.error;
      setLeads((l.data || []) as Lead[]);
      const map: Record<string, string> = {};
      ((v.data || []) as Array<{ id: string; title: string }>).forEach((x) => { map[x.id] = x.title; });
      setTitles(map);
    } catch (e) {
      console.error('[Audiencia]', e);
      setError(T.err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    const sd = s.replace(/\D/g, '');
    if (!s) return leads;
    return leads.filter((r) =>
      r.name.toLowerCase().includes(s) ||
      r.email.toLowerCase().includes(s) ||
      (sd.length > 0 && r.whatsapp.includes(sd)) ||
      (r.live_id ? (titles[r.live_id] || '').toLowerCase().includes(s) : false)
    );
  }, [leads, q, titles]);

  const exportCsv = () => {
    const head = T.cols.map(csvCell).join(';');
    const body = rows.map((r) => [
      r.name, r.email, fmtPhone(r.whatsapp), r.live_id ? (titles[r.live_id] || '') : '', fmtDate(r.created_at),
    ].map(csvCell).join(';'));
    const blob = new Blob(['\ufeff' + [head, ...body].join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'audiencia-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <Users className="h-5 w-5 text-rose-600" /> {T.title}
          </h2>
          <p className="text-sm text-slate-500">{T.sub}</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <RefreshCw className={'h-4 w-4 ' + (loading ? 'animate-spin' : '')} /> {T.reload}
          </button>
          <button type="button" onClick={exportCsv} disabled={rows.length === 0} className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50">
            <Download className="h-4 w-4" /> {T.csv}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={T.search} className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-rose-400" />
        </div>
        <span className="text-sm text-slate-500">{rows.length} / {leads.length}</span>
      </div>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>{T.cols.map((c) => <th key={c} className="px-4 py-2.5 font-semibold">{c}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-2.5 font-medium text-slate-800">{r.name}</td>
                <td className="px-4 py-2.5 text-slate-600">{r.email}</td>
                <td className="px-4 py-2.5">
                  <a href={waLink(r.whatsapp)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-emerald-700 hover:underline">
                    <MessageCircle className="h-4 w-4" /> {fmtPhone(r.whatsapp)}
                  </a>
                </td>
                <td className="px-4 py-2.5 text-slate-600">{r.live_id ? (titles[r.live_id] || '-') : '-'}</td>
                <td className="px-4 py-2.5 text-slate-500">{fmtDate(r.created_at)}</td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">{T.empty}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}