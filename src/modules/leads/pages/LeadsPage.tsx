import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Search, Trash2, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import { useLoja } from '@/contexts/LojaContext';
import { deleteLead, listLeads, updateLead, STATUSES, STATUS_LABEL, type Lead, type LeadStatus } from '../services/leadsService';

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

function LeadDetail({ lead, onClose, onSaved }: { lead: Lead; onClose: () => void; onSaved: (l: Lead) => void }) {
  const [status, setStatus] = useState<LeadStatus>(lead.status);
  const [tags, setTags] = useState(lead.tags.join(', '));
  const [notes, setNotes] = useState(lead.notes || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const nextTags = Array.from(new Set(tags.split(',').map((t) => t.trim()).filter(Boolean)));
      await updateLead(lead.id, { status, tags: nextTags, notes: notes.trim() || null });
      onSaved({ ...lead, status, tags: nextTags, notes: notes.trim() || null });
      toast.success('Lead atualizado');
      onClose();
    } catch {
      toast.error('Não foi possível salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">{lead.name || 'Sem nome'}</h3>
            <p className="text-xs text-slate-500">{lead.email || '-'} · {lead.whatsapp || '-'}</p>
          </div>
          <button type="button" onClick={onClose} className="cursor-pointer text-slate-400 hover:text-slate-700"><X size={18} /></button>
        </div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Status</label>
        <select value={status} onChange={(e) => setStatus(e.target.value as LeadStatus)} className="mb-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <label className="mb-1 block text-xs font-medium text-slate-600">Tags (separadas por vírgula)</label>
        <input value={tags} onChange={(e) => setTags(e.target.value)} className="mb-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        <label className="mb-1 block text-xs font-medium text-slate-600">Notas</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className="mb-4 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="cursor-pointer rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">Cancelar</button>
          <button type="button" disabled={saving} onClick={save} className="cursor-pointer rounded-lg bg-[#0094eb] px-4 py-2 text-sm font-semibold text-white hover:bg-[#007bc4] disabled:opacity-60">
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LeadsPage() {
  const { storeId } = useLoja();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [source, setSource] = useState('');
  const [selected, setSelected] = useState<Lead | null>(null);

  const load = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      setLeads(await listLeads(storeId));
    } catch {
      toast.error('Erro ao carregar leads');
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => { void load(); }, [load]);

  const sources = useMemo(() => Array.from(new Set(leads.map((l) => l.source).filter(Boolean))) as string[], [leads]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    const digits = t.replace(/\D/g, '');
    return leads.filter((l) => {
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
  }, [leads, q, status, source]);

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

  const remove = async (l: Lead) => {
    if (!window.confirm('Excluir este lead?')) return;
    try {
      await deleteLead(l.id);
      setLeads((prev) => prev.filter((x) => x.id !== l.id));
      toast.success('Lead excluído');
    } catch {
      toast.error('Não foi possível excluir');
    }
  };

  if (!storeId) return <div className="p-6 text-sm text-slate-500">Selecione uma loja para ver os leads.</div>;

  return (
    <div className="mx-auto w-full max-w-6xl p-4 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0094eb]/10 text-[#0094eb]"><Users size={20} /></div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Leads</h1>
            <p className="text-xs text-slate-500">{filtered.length} de {leads.length} contatos captados</p>
          </div>
        </div>
        <button
          type="button"
          disabled={!filtered.length}
          onClick={() => exportCsv(filtered)}
          className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-[#0094eb] hover:text-[#0094eb] disabled:opacity-50"
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

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Contato</th>
              <th className="px-4 py-3">Origem</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Tags</th>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">Carregando...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">Nenhum lead encontrado.</td></tr>
            ) : (
              filtered.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50/60">
                  <td className="cursor-pointer px-4 py-3" onClick={() => setSelected(l)}>
                    <div className="font-medium text-slate-900">{l.name || 'Sem nome'}</div>
                    <div className="text-xs text-slate-500">{l.email || '-'}</div>
                    <div className="text-xs text-slate-500">{l.whatsapp || '-'}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{srcLabel(l.source)}</td>
                  <td className="px-4 py-3">
                    <select value={l.status} onChange={(e) => void changeStatus(l, e.target.value as LeadStatus)} className={`cursor-pointer rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_CLASS[l.status]}`}>
                      {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {l.tags.map((t) => <span key={t} className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{t}</span>)}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{fmtDate(l.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" title="Excluir" onClick={() => void remove(l)} className="cursor-pointer text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected ? <LeadDetail lead={selected} onClose={() => setSelected(null)} onSaved={patchLocal} /> : null}
    </div>
  );
}