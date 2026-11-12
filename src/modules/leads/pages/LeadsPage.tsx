import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Download, Mail, MessageCircle, Pencil, Search, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import { useLoja } from '@/contexts/LojaContext';
import { deleteLead, listLeads, listTouchpoints, updateLead, STATUSES, STATUS_LABEL, type Lead, type LeadStatus } from '../services/leadsService';

const SOURCE_LABEL: Record<string, string> = { builder: 'Builder' };
const srcLabel = (s: string | null) => (s ? SOURCE_LABEL[s] || s : '-');
const fmtDate = (d: string) => new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

const STATUS_CLASS: Record<LeadStatus, string> = {
  new: 'bg-sky-50 text-sky-700 border-sky-200',
  contacted: 'bg-amber-50 text-amber-700 border-amber-200',
  qualified: 'bg-violet-50 text-violet-700 border-violet-200',
  converted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  lost: 'bg-slate-100 text-slate-600 border-slate-200',
};

type SortKey = 'contact' | 'source' | 'status' | 'tags' | 'date';
type Sort = { key: SortKey; dir: 'asc' | 'desc' };

function sortValue(l: Lead, k: SortKey): string | number {
  if (k === 'contact') return (l.name || l.email || l.whatsapp || '').toLowerCase();
  if (k === 'source') return srcLabel(l.source).toLowerCase();
  if (k === 'status') return STATUS_LABEL[l.status].toLowerCase();
  if (k === 'tags') return l.tags.join(' ').toLowerCase();
  return new Date(l.created_at).getTime();
}

function waLink(w: string | null): string | null {
  const d = (w || '').replace(/\D/g, '');
  if (d.length < 10) return null;
  return 'https://wa.me/' + (d.length <= 11 ? '55' + d : d);
}

function csvCell(v: unknown): string {
  let s = v == null ? '' : String(v);
  if (/^[=@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}

function exportCsv(rows: Lead[]) {
  const head = ['Nome', 'E-mail', 'WhatsApp', 'Origem', 'Status', 'Tags', 'Notas', 'Criado em'];
  const lines = rows.map((l) =>
    [l.name, l.email, l.whatsapp, srcLabel(l.source), STATUS_LABEL[l.status], l.tags.join('; '), l.notes, fmtDate(l.created_at)].map(csvCell).join(','),
  );
  const blob = new Blob(['\uFEFF' + [head.map(csvCell).join(','), ...lines].join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'leads-' + new Date().toISOString().slice(0, 10) + '.csv';
  a.click();
  URL.revokeObjectURL(url);
}

const fieldCls = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-[#0094eb] focus:outline-none';
const labelCls = 'mb-1 block text-xs font-medium text-slate-600';

function LeadEdit({ lead, onClose, onSaved }: { lead: Lead; onClose: () => void; onSaved: (l: Lead) => void }) {
  const [name, setName] = useState(lead.name || '');
  const [email, setEmail] = useState(lead.email || '');
  const [whatsapp, setWhatsapp] = useState(lead.whatsapp || '');
  const [status, setStatus] = useState<LeadStatus>(lead.status);
  const [tags, setTags] = useState(lead.tags.join(', '));
  const [notes, setNotes] = useState(lead.notes || '');
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<{ id: string; source: string | null; created_at: string }[]>([]);

  useEffect(() => {
    listTouchpoints(lead.id).then(setHistory).catch(() => setHistory([]));
  }, [lead.id]);

  const save = async () => {
    const em = email.trim().toLowerCase();
    const wa = whatsapp.trim();
    if (!em && !wa) {
      toast.error('Informe e-mail ou WhatsApp');
      return;
    }
    setSaving(true);
    try {
      const nextTags = Array.from(new Set(tags.split(',').map((t) => t.trim()).filter(Boolean)));
      const patch = { name: name.trim() || null, email: em || null, whatsapp: wa || null, status, tags: nextTags, notes: notes.trim() || null };
      await updateLead(lead.id, patch);
      onSaved({ ...lead, ...patch });
      toast.success('Lead atualizado');
      onClose();
    } catch (e) {
      const code = (e as { code?: string })?.code;
      toast.error(code === '23505' ? 'Este e-mail ou WhatsApp já pertence a outro lead' : 'Não foi possível salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between">
          <h3 className="text-lg font-bold text-slate-900">Editar lead</h3>
          <button type="button" onClick={onClose} className="cursor-pointer text-slate-400 hover:text-slate-700"><X size={18} /></button>
        </div>
        <label className={labelCls}>Nome</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className={fieldCls + ' mb-3'} />
        <label className={labelCls}>E-mail</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={fieldCls + ' mb-3'} />
        <label className={labelCls}>WhatsApp</label>
        <input type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className={fieldCls + ' mb-3'} />
        <label className={labelCls}>Status</label>
        <select value={status} onChange={(e) => setStatus(e.target.value as LeadStatus)} className={fieldCls + ' mb-3'}>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <label className={labelCls}>Tags (separadas por vírgula)</label>
        <input value={tags} onChange={(e) => setTags(e.target.value)} className={fieldCls + ' mb-3'} />
        <label className={labelCls}>Notas</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={fieldCls + ' mb-3'} />
        {history.length > 0 ? (
          <div className="mb-4 rounded-lg border border-slate-100 bg-slate-50 p-3">
            <p className="mb-1 text-xs font-medium text-slate-600">Histórico de cadastros ({history.length})</p>
            <ul className="max-h-28 space-y-0.5 overflow-y-auto text-xs text-slate-500">
              {history.map((h) => <li key={h.id}>{srcLabel(h.source)} · {fmtDate(h.created_at)}</li>)}
            </ul>
          </div>
        ) : null}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="cursor-pointer rounded-full px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">Cancelar</button>
          <button type="button" disabled={saving} onClick={save} className="cursor-pointer rounded-full bg-[#0094eb] px-5 py-2 text-sm font-semibold text-white hover:bg-[#007bc4] disabled:opacity-60">
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SortTh({ label, k, sort, onSort }: { label: string; k: SortKey; sort: Sort; onSort: (k: SortKey) => void }) {
  const active = sort.key === k;
  const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th className="px-4 py-3">
      <button
        type="button"
        onClick={() => onSort(k)}
        className={`inline-flex cursor-pointer items-center gap-1 text-[11px] font-bold uppercase tracking-wider ${active ? 'text-[#0094eb]' : 'text-slate-500 hover:text-slate-700'}`}
      >
        {label} <Icon size={12} />
      </button>
    </th>
  );
}

export default function LeadsPage() {
  const { storeId } = useLoja();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [source, setSource] = useState('');
  const [sort, setSort] = useState<Sort>({ key: 'date', dir: 'desc' });
  const [editing, setEditing] = useState<Lead | null>(null);
  const [del, setDel] = useState<Lead | null>(null);

  const load = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      setLeads(await listLeads(storeId));
    } catch (e) {
      console.error('[leads]', e);
      toast.error('Erro ao carregar leads: ' + ((e as { message?: string })?.message || ''));
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => { void load(); }, [load]);

  const sources = useMemo(() => Array.from(new Set(leads.map((l) => l.source).filter(Boolean))) as string[], [leads]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    const digits = t.replace(/\D/g, '');
    const list = leads.filter((l) => {
      if (status && l.status !== status) return false;
      if (source && l.source !== source) return false;
      if (!t) return true;
      return (
        (l.name || '').toLowerCase().includes(t) ||
        (l.email || '').toLowerCase().includes(t) ||
        l.tags.some((x) => x.toLowerCase().includes(t)) ||
        (digits.length > 0 && (l.whatsapp || '').replace(/\D/g, '').includes(digits))
      );
    });
    const mul = sort.dir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
      const x = sortValue(a, sort.key);
      const y = sortValue(b, sort.key);
      const r = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'pt-BR');
      return r * mul;
    });
  }, [leads, q, status, source, sort]);

  const onSort = (k: SortKey) =>
    setSort((s) => (s.key === k ? { key: k, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key: k, dir: 'asc' }));

  const patchLocal = (l: Lead) => setLeads((prev) => prev.map((x) => (x.id === l.id ? l : x)));

  const changeStatus = async (l: Lead, s: LeadStatus) => {
    const prev = l.status;
    patchLocal({ ...l, status: s });
    try {
      await updateLead(l.id, { status: s });
    } catch {
      patchLocal({ ...l, status: prev });
      toast.error('Não foi possível alterar o status');
    }
  };

  const confirmDelete = async () => {
    const l = del;
    if (!l) return;
    try {
      await deleteLead(l.id);
      setLeads((prev) => prev.filter((x) => x.id !== l.id));
      toast.success('Lead excluído');
    } catch {
      toast.error('Não foi possível excluir');
    } finally {
      setDel(null);
    }
  };

  if (!storeId) return <div className="p-6 text-sm text-slate-500">Selecione uma loja para ver os leads.</div>;

  const actionCls = 'inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-slate-400 transition-colors';

  return (
    <div className="mx-auto w-full max-w-6xl p-4 sm:p-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Leads</h1>
          <p className="mt-1 text-sm text-slate-500">{filtered.length} de {leads.length} contatos captados</p>
        </div>
        <button
          type="button"
          disabled={!filtered.length}
          onClick={() => exportCsv(filtered)}
          className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:border-[#0094eb] hover:text-[#0094eb] disabled:opacity-50"
        >
          <Download size={16} /> Exportar CSV
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome, e-mail, WhatsApp ou tag" className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm" />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
          <option value="">Todos os status</option>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <select value={source} onChange={(e) => setSource(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
          <option value="">Todas as origens</option>
          {sources.map((s) => <option key={s} value={s}>{srcLabel(s)}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              <SortTh label="Contato" k="contact" sort={sort} onSort={onSort} />
              <SortTh label="Origem" k="source" sort={sort} onSort={onSort} />
              <SortTh label="Status" k="status" sort={sort} onSort={onSort} />
              <SortTh label="Tags" k="tags" sort={sort} onSort={onSort} />
              <SortTh label="Data" k="date" sort={sort} onSort={onSort} />
              <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">Carregando...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">Nenhum lead encontrado.</td></tr>
            ) : (
              filtered.map((l) => {
                const wa = waLink(l.whatsapp);
                return (
                  <tr key={l.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{l.name || 'Sem nome'}</div>
                      <div className="text-xs text-slate-500">{l.email || '-'}</div>
                      <div className="text-xs text-slate-500">{l.whatsapp || '-'}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{srcLabel(l.source)}</td>
                    <td className="px-4 py-3">
                      <select value={l.status} onChange={(e) => void changeStatus(l, e.target.value as LeadStatus)} className={`cursor-pointer rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_CLASS[l.status]}`}>
                        {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {l.tags.map((t) => <span key={t} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">{t}</span>)}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{fmtDate(l.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {wa ? (
                          <a href={wa} target="_blank" rel="noopener noreferrer" title="Enviar WhatsApp" className={actionCls + ' hover:bg-emerald-50 hover:text-emerald-600'}><MessageCircle size={16} /></a>
                        ) : (
                          <span title="Sem WhatsApp" className={actionCls + ' cursor-not-allowed opacity-30'}><MessageCircle size={16} /></span>
                        )}
                        {l.email ? (
                          <button type="button" title="Enviar e-mail" onClick={() => window.open('https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(l.email || ''), '_blank', 'noopener,noreferrer')} className={actionCls + ' hover:bg-sky-50 hover:text-[#0094eb]'}><Mail size={16} /></button>
                        ) : (
                          <span title="Sem e-mail" className={actionCls + ' cursor-not-allowed opacity-30'}><Mail size={16} /></span>
                        )}
                        <button type="button" title="Editar" onClick={() => setEditing(l)} className={actionCls + ' hover:bg-slate-100 hover:text-slate-700'}><Pencil size={16} /></button>
                        <button type="button" title="Excluir" onClick={() => setDel(l)} className={actionCls + ' hover:bg-red-50 hover:text-red-600'}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDeleteDialog
        isOpen={!!del}
        title="Excluir lead"
        message={del ? 'Tem certeza que deseja excluir "' + (del.name || del.email || del.whatsapp || 'este lead') + '"? Esta ação não pode ser desfeita.' : ''}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDel(null)}
      />
      {editing ? <LeadEdit lead={editing} onClose={() => setEditing(null)} onSaved={patchLocal} /> : null}
    </div>
  );
}