import { useCallback, useEffect, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { useLoja } from '@/contexts/LojaContext';
import CustomerDialog from '../components/CustomerDialog';
import { PAGE_SIZE, brl, fmtDate, listCustomers, maskDoc, type CustomerRow, type SortKey } from '../services/clientes';
import { useGestorAccess } from '../hooks/useGestorAccess';

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'total_spent', label: 'Maior total gasto' },
  { value: 'last_order_at', label: 'Ultima compra' },
  { value: 'created_at', label: 'Cadastro mais recente' },
  { value: 'name', label: 'Nome (A-Z)' },
];

export default function CustomersPage() {
  const { can: allow } = useGestorAccess();
  const ctx: any = useLoja();
  const storeId: string | null = ctx?.loja?.id ?? ctx?.store?.id ?? ctx?.storeId ?? ctx?.lojaId ?? null;

  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [tag, setTag] = useState('');
  const [sort, setSort] = useState<SortKey>('total_spent');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search); setPage(0); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    if (!storeId) return;
    setLoading(true); setErr('');
    try {
      const r = await listCustomers({ storeId, search: debounced, tag, sort, page });
      setRows(r.rows); setTotal(r.total);
    } catch (e: any) { setErr(e?.message ?? 'Erro ao carregar clientes'); }
    finally { setLoading(false); }
  }, [storeId, debounced, tag, sort, page]);

  useEffect(() => { void load(); }, [load]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const open = (id: string | null) => { setOpenId(id); setDialogOpen(true); };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Clientes</h1>
          <p className="text-sm text-slate-500">{total} cliente(s). Total gasto considera so pedidos pagos e nao cancelados.</p>
        </div>
        <>{allow('clientes','criar') && (<button type="button" onClick={() => open(null)} className="inline-flex items-center gap-2 rounded-lg bg-[color:var(--sll-b-brand)] px-4 py-2 text-sm font-medium text-white hover:bg-[color:var(--sll-b-brand-hover)]">
          <Plus size={16} /> Novo cliente
        </button>)}</>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[16rem] flex-1">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome, e-mail, telefone ou documento"
            className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-[color:var(--sll-b-brand)]" />
        </div>
        <input value={tag} onChange={(e) => { setTag(e.target.value); setPage(0); }} placeholder="Filtrar por tag"
          className="w-40 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[color:var(--sll-b-brand)]" />
        <select value={sort} onChange={(e) => { setSort(e.target.value as SortKey); setPage(0); }}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[color:var(--sll-b-brand)]">
          {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {err && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[56rem] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Cliente</th><th className="px-3 py-2">Documento</th><th className="px-3 py-2">Cidade/UF</th>
              <th className="px-3 py-2 text-right">Pedidos</th><th className="px-3 py-2 text-right">Total gasto</th>
              <th className="px-3 py-2 text-right">Ticket medio</th><th className="px-3 py-2">Ultima compra</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.customer_id} onClick={() => open(r.customer_id)} className="cursor-pointer border-t border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-2">
                  <div className="font-medium text-slate-900">{r.name}</div>
                  <div className="text-xs text-slate-500">{r.email ?? r.phone ?? '-'}</div>
                  {r.tags?.length > 0 && <div className="mt-0.5 flex flex-wrap gap-1">{r.tags.map((t) => <span key={t} className="rounded bg-slate-100 px-1.5 text-[10px] text-slate-600">{t}</span>)}</div>}
                </td>
                <td className="px-3 py-2 font-mono text-xs">{maskDoc(r.document)}</td>
                <td className="px-3 py-2">{[r.city, r.state].filter(Boolean).join('/') || '-'}</td>
                <td className="px-3 py-2 text-right">{r.orders_count}</td>
                <td className="px-3 py-2 text-right font-medium">{brl(r.total_spent)}</td>
                <td className="px-3 py-2 text-right">{brl(r.avg_ticket)}</td>
                <td className="px-3 py-2">{fmtDate(r.last_order_at)}{r.days_since_last != null && <span className="ml-1 text-xs text-slate-400">({r.days_since_last}d)</span>}</td>
              </tr>
            ))}
            {!loading && rows.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-500">Nenhum cliente encontrado.</td></tr>}
            {loading && <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-400">Carregando...</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>Pagina {page + 1} de {pages}</span>
        <div className="flex gap-2">
          <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="rounded-md border border-slate-300 px-3 py-1.5 disabled:opacity-40">Anterior</button>
          <button type="button" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)} className="rounded-md border border-slate-300 px-3 py-1.5 disabled:opacity-40">Proxima</button>
        </div>
      </div>

      {storeId && <CustomerDialog storeId={storeId} customerId={openId} open={dialogOpen} onClose={() => setDialogOpen(false)} onSaved={() => void load()} />}
    </div>
  );
}
