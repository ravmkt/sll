import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  brl, fmtDate, getCustomer, getCustomerOrders, getCustomerProducts, saveCustomer,
  type CustomerFull, type CustomerOrder, type CustomerProduct,
} from '../services/clientes';
import { useGestorAccess } from '../hooks/useGestorAccess';

type Form = Omit<CustomerFull, 'id' | 'source_platform' | 'tags'> & { tagsText: string };

const EMPTY: Form = {
  name: '', email: '', phone: '', document: '', birth_date: '', zip: '', street: '', number: '', complement: '',
  district: '', city: '', state: '', tagsText: '', notes: '', accepts_marketing: false, accepts_whatsapp: false,
};

const inputCls = 'w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#0094eb]';

type Props = { storeId: string; customerId: string | null; open: boolean; onClose: () => void; onSaved: () => void };

export default function CustomerDialog({ storeId, customerId, open, onClose, onSaved }: Props) {
  const { can: allow } = useGestorAccess();
  const [cust, setCust] = useState<CustomerFull | null>(null);
  const [products, setProducts] = useState<CustomerProduct[]>([]);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [form, setForm] = useState<Form>(EMPTY);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const toForm = (c: CustomerFull): Form => ({
    name: c.name, email: c.email ?? '', phone: c.phone ?? '', document: c.document ?? '', birth_date: c.birth_date ?? '',
    zip: c.zip ?? '', street: c.street ?? '', number: c.number ?? '', complement: c.complement ?? '', district: c.district ?? '',
    city: c.city ?? '', state: c.state ?? '', tagsText: (c.tags ?? []).join(', '), notes: c.notes ?? '',
    accepts_marketing: c.accepts_marketing, accepts_whatsapp: c.accepts_whatsapp,
  });

  useEffect(() => {
    if (!open) return;
    setErr('');
    if (!customerId) { setCust(null); setProducts([]); setOrders([]); setForm(EMPTY); setEditing(true); return; }
    setEditing(false);
    (async () => {
      try {
        const [c, p, o] = await Promise.all([getCustomer(customerId), getCustomerProducts(customerId), getCustomerOrders(customerId)]);
        setCust(c); setProducts(p); setOrders(o); setForm(toForm(c));
      } catch (e: any) { setErr(e?.message ?? 'Erro ao carregar'); }
    })();
  }, [open, customerId]);

  const set = (k: keyof Form, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name.trim()) { setErr('Informe o nome.'); return; }
    setBusy(true); setErr('');
    try {
      const { tagsText, ...rest } = form;
      const tags = tagsText.split(',').map((t) => t.trim()).filter(Boolean);
      await saveCustomer(storeId, customerId, { ...rest, tags }, cust);
      onSaved(); onClose();
    } catch (e: any) { setErr(e?.message ?? 'Erro ao salvar'); }
    finally { setBusy(false); }
  };

  const field = (label: string, k: keyof Form, type = 'text', cls = '') => (
    <label className={'block text-xs font-medium text-slate-600 ' + cls}>
      {label}
      <input type={type} className={inputCls + ' mt-1 font-normal'} value={String(form[k] ?? '')} onChange={(e) => set(k, e.target.value)} />
    </label>
  );

  const addr = cust ? [cust.street, cust.number, cust.complement, cust.district, cust.city && cust.state ? cust.city + '/' + cust.state : cust.city, cust.zip].filter(Boolean).join(', ') : '';

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{customerId ? (editing ? 'Editar cliente' : cust?.name ?? 'Cliente') : 'Novo cliente'}</DialogTitle>
        </DialogHeader>

        {err && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}

        {editing ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {field('Nome *', 'name', 'text', 'sm:col-span-2')}
              {field('E-mail', 'email', 'email')}
              {field('Telefone / WhatsApp', 'phone')}
              {field('CPF / CNPJ', 'document')}
              {field('Nascimento', 'birth_date', 'date')}
              {field('CEP', 'zip')}
              {field('Rua', 'street')}
              {field('Numero', 'number')}
              {field('Complemento', 'complement')}
              {field('Bairro', 'district')}
              {field('Cidade', 'city')}
              {field('UF', 'state')}
              {field('Tags (separadas por virgula)', 'tagsText', 'text', 'sm:col-span-2')}
              <label className="block text-xs font-medium text-slate-600 sm:col-span-2">
                Observacoes
                <textarea className={inputCls + ' mt-1 font-normal'} rows={3} value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
              </label>
            </div>
            <div className="flex flex-col gap-2 rounded-md border border-slate-200 p-3 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.accepts_marketing} onChange={(e) => set('accepts_marketing', e.target.checked)} /> Aceita e-mail marketing</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.accepts_whatsapp} onChange={(e) => set('accepts_whatsapp', e.target.checked)} /> Aceita contato por WhatsApp</label>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => (customerId ? setEditing(false) : onClose())} className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">Cancelar</button>
              <button type="button" disabled={busy} onClick={submit} className="rounded-md bg-[#0094eb] px-4 py-2 text-sm font-medium text-white hover:bg-[#007bc4] disabled:opacity-60">
                {busy ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        ) : cust ? (
          <div className="space-y-5 text-sm">
            <div className="flex justify-end">
              <>{allow('clientes','editar') && (<button type="button" onClick={() => setEditing(true)} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-50">Editar</button>)}</>
            </div>
            <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
              <div><dt className="text-xs text-slate-500">E-mail</dt><dd>{cust.email ?? '-'}</dd></div>
              <div><dt className="text-xs text-slate-500">Telefone</dt><dd>{cust.phone ?? '-'}</dd></div>
              <div><dt className="text-xs text-slate-500">CPF / CNPJ</dt><dd>{cust.document ?? '-'}</dd></div>
              <div><dt className="text-xs text-slate-500">Nascimento</dt><dd>{fmtDate(cust.birth_date)}</dd></div>
              <div className="sm:col-span-2"><dt className="text-xs text-slate-500">Endereco cadastral</dt><dd>{addr || '-'}</dd></div>
              <div><dt className="text-xs text-slate-500">Origem</dt><dd>{cust.source_platform ?? '-'}</dd></div>
              <div><dt className="text-xs text-slate-500">Consentimento</dt><dd>{[cust.accepts_marketing && 'E-mail', cust.accepts_whatsapp && 'WhatsApp'].filter(Boolean).join(' + ') || 'Nenhum'}</dd></div>
              <div className="sm:col-span-2"><dt className="text-xs text-slate-500">Tags</dt><dd>{cust.tags?.length ? cust.tags.join(', ') : '-'}</dd></div>
              {cust.notes && <div className="sm:col-span-2"><dt className="text-xs text-slate-500">Observacoes</dt><dd className="whitespace-pre-wrap">{cust.notes}</dd></div>}
            </dl>

            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">O que ele compra</h3>
              {products.length === 0 ? <p className="text-slate-500">Nenhuma compra paga ainda.</p> : (
                <table className="w-full text-left">
                  <thead className="text-xs text-slate-500"><tr><th className="py-1">Produto</th><th>Qtd</th><th>Pedidos</th><th>Total</th><th>Ultima</th></tr></thead>
                  <tbody>
                    {products.map((p, i) => (
                      <tr key={(p.sku ?? '') + i} className="border-t border-slate-100">
                        <td className="py-1.5">{p.name}{p.sku && <span className="ml-1 text-xs text-slate-400">{p.sku}</span>}</td>
                        <td>{p.qty}</td><td>{p.orders_count}</td><td>{brl(p.total)}</td><td>{fmtDate(p.last_purchase_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Pedidos</h3>
              {orders.length === 0 ? <p className="text-slate-500">Sem pedidos.</p> : (
                <table className="w-full text-left">
                  <thead className="text-xs text-slate-500"><tr><th className="py-1">Pedido</th><th>Data</th><th>Status</th><th>Pagamento</th><th>Total</th></tr></thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id} className="border-t border-slate-100">
                        <td className="py-1.5">#{o.number ?? '-'}</td><td>{fmtDate(o.created_at)}</td>
                        <td>{o.canceled_at ? 'cancelado' : o.status ?? '-'}</td><td>{o.payment_status ?? '-'}</td><td>{brl(o.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </div>
        ) : !err ? <p className="text-sm text-slate-500">Carregando...</p> : null}
      </DialogContent>
    </Dialog>
  );
}
