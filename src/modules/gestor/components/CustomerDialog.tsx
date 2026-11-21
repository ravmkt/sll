import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { SllModal, sllBtnGhost, sllBtnPrimary } from '@/components/sll/SllModal';
import { SllField, sllFieldCls } from '@/components/sll/SllFilterBar';
import { SllTable } from '@/components/sll/SllTable';
import type { SllColumn } from '@/components/sll/SllTable';
import {
  brl, fmtDate, getCustomer, getCustomerOrders, getCustomerProducts, saveCustomer,
} from '../services/clientes';
import type { CustomerFull, CustomerOrder, CustomerProduct } from '../services/clientes';
import { useGestorAccess } from '../hooks/useGestorAccess';

type Form = Omit<CustomerFull, 'id' | 'source_platform' | 'tags'> & { tagsText: string };

const EMPTY: Form = {
  name: '', email: '', phone: '', document: '', birth_date: '', zip: '', street: '', number: '', complement: '',
  district: '', city: '', state: '', tagsText: '', notes: '', accepts_marketing: false, accepts_whatsapp: false,
};

const toForm = (c: CustomerFull): Form => ({
  name: c.name, email: c.email ?? '', phone: c.phone ?? '', document: c.document ?? '', birth_date: c.birth_date ?? '',
  zip: c.zip ?? '', street: c.street ?? '', number: c.number ?? '', complement: c.complement ?? '', district: c.district ?? '',
  city: c.city ?? '', state: c.state ?? '', tagsText: (c.tags ?? []).join(', '), notes: c.notes ?? '',
  accepts_marketing: c.accepts_marketing, accepts_whatsapp: c.accepts_whatsapp,
});

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
      <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">{title}</h3>
      {children}
    </section>
  );
}

function Info({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <dt className="text-[11px] font-bold text-slate-400">{label}</dt>
      <dd className="text-sm text-slate-800 dark:text-slate-100">{children}</dd>
    </div>
  );
}

const PRODUCT_COLS: SllColumn<CustomerProduct>[] = [
  {
    key: 'p', header: 'Produto',
    render: (p) => (
      <>
        <span className="font-bold text-slate-800 dark:text-white">{p.name}</span>
        {p.sku && <span className="ml-1 text-[11px] text-slate-400">{p.sku}</span>}
      </>
    ),
  },
  { key: 'q', header: 'Qtd', align: 'right', render: (p) => <span className="font-mono">{p.qty}</span> },
  { key: 'o', header: 'Pedidos', align: 'right', render: (p) => <span className="font-mono">{p.orders_count}</span> },
  { key: 't', header: 'Total', align: 'right', render: (p) => <span className="font-mono font-bold">{brl(p.total)}</span> },
  { key: 'u', header: 'Última', render: (p) => <span className="text-slate-500">{fmtDate(p.last_purchase_at)}</span> },
];

const ORDER_COLS: SllColumn<CustomerOrder>[] = [
  { key: 'n', header: 'Pedido', render: (o) => <span className="font-bold">#{o.number ?? '-'}</span> },
  { key: 'd', header: 'Data', render: (o) => <span className="text-slate-500">{fmtDate(o.created_at)}</span> },
  { key: 's', header: 'Status', render: (o) => <span>{o.canceled_at ? 'cancelado' : o.status ?? '-'}</span> },
  { key: 'pg', header: 'Pagamento', render: (o) => <span className="text-slate-500">{o.payment_status ?? '-'}</span> },
  { key: 't', header: 'Total', align: 'right', render: (o) => <span className="font-mono font-bold">{brl(o.total)}</span> },
];

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

  useEffect(() => {
    if (!open) return;
    setErr('');
    if (!customerId) { setCust(null); setProducts([]); setOrders([]); setForm(EMPTY); setEditing(true); return; }
    setEditing(false);
    setCust(null);
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

  const input = (label: string, k: keyof Form, type = 'text', cls = '') => (
    <SllField label={label} className={cls}>
      <input type={type} className={sllFieldCls} value={String(form[k] ?? '')} onChange={(e) => set(k, e.target.value)} />
    </SllField>
  );

  const addr = cust
    ? [cust.street, cust.number, cust.complement, cust.district, cust.city && cust.state ? cust.city + '/' + cust.state : cust.city, cust.zip].filter(Boolean).join(', ')
    : '';

  const title = customerId ? (editing ? 'Editar cliente' : cust?.name ?? 'Cliente') : 'Novo cliente';
  const check = 'h-4 w-4 cursor-pointer accent-[color:var(--sll-b-brand)]';

  const footer = editing ? (
    <>
      <button type="button" disabled={busy} onClick={() => (customerId ? setEditing(false) : onClose())} className={sllBtnGhost}>Cancelar</button>
      <button type="button" disabled={busy} onClick={() => void submit()} className={sllBtnPrimary}>
        {busy && <Loader2 size={15} className="animate-spin" />}{busy ? 'Salvando...' : 'Salvar'}
      </button>
    </>
  ) : (
    <>
      <button type="button" onClick={onClose} className={sllBtnGhost}>Fechar</button>
      {cust && allow('clientes', 'editar') && (
        <button type="button" onClick={() => setEditing(true)} className={sllBtnPrimary}>Editar</button>
      )}
    </>
  );

  return (
    <SllModal open={open} onOpenChange={(v) => { if (!v) onClose(); }} title={title} size="lg" footer={footer}>
      <div className="space-y-4">
        {err && <p className="rounded-xl bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700">{err}</p>}

        {editing ? (
          <>
            <Card title="Dados">
              <div className="grid gap-3 sm:grid-cols-2">
                {input('Nome *', 'name', 'text', 'sm:col-span-2')}
                {input('E-mail', 'email', 'email')}
                {input('Telefone / WhatsApp', 'phone')}
                {input('CPF / CNPJ', 'document')}
                {input('Nascimento', 'birth_date', 'date')}
              </div>
            </Card>
            <Card title="Endereço">
              <div className="grid gap-3 sm:grid-cols-2">
                {input('CEP', 'zip')}
                {input('Rua', 'street')}
                {input('Número', 'number')}
                {input('Complemento', 'complement')}
                {input('Bairro', 'district')}
                {input('Cidade', 'city')}
                {input('UF', 'state')}
              </div>
            </Card>
            <Card title="Classificação">
              <div className="grid gap-3">
                {input('Tags (separadas por vírgula)', 'tagsText')}
                <SllField label="Observações">
                  <textarea className={sllFieldCls} rows={3} value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
                </SllField>
              </div>
            </Card>
            <Card title="Consentimento">
              <div className="flex flex-col gap-2 text-sm">
                <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" className={check} checked={form.accepts_marketing} onChange={(e) => set('accepts_marketing', e.target.checked)} /> Aceita e-mail marketing</label>
                <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" className={check} checked={form.accepts_whatsapp} onChange={(e) => set('accepts_whatsapp', e.target.checked)} /> Aceita contato por WhatsApp</label>
              </div>
            </Card>
          </>
        ) : cust ? (
          <>
            <Card title="Dados do cliente">
              <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                <Info label="E-mail">{cust.email ?? '-'}</Info>
                <Info label="Telefone">{cust.phone ?? '-'}</Info>
                <Info label="CPF / CNPJ">{cust.document ?? '-'}</Info>
                <Info label="Nascimento">{fmtDate(cust.birth_date)}</Info>
                <Info label="Endereço cadastral" wide>{addr || '-'}</Info>
                <Info label="Origem">{cust.source_platform ?? '-'}</Info>
                <Info label="Consentimento">{[cust.accepts_marketing && 'E-mail', cust.accepts_whatsapp && 'WhatsApp'].filter(Boolean).join(' + ') || 'Nenhum'}</Info>
                <Info label="Tags" wide>{cust.tags?.length ? cust.tags.join(', ') : '-'}</Info>
                {cust.notes && <Info label="Observações" wide><span className="whitespace-pre-wrap">{cust.notes}</span></Info>}
              </dl>
            </Card>
            <div>
              <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">O que ele compra</h3>
              <SllTable columns={PRODUCT_COLS} rows={products} rowKey={(p) => (p.sku ?? '') + p.name} empty="Nenhuma compra paga ainda." minWidth="32rem" />
            </div>
            <div>
              <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">Pedidos</h3>
              <SllTable columns={ORDER_COLS} rows={orders} rowKey={(o) => o.id} empty="Sem pedidos." minWidth="32rem" />
            </div>
          </>
        ) : !err ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-[color:var(--sll-b-brand)]" /></div>
        ) : null}
      </div>
    </SllModal>
  );
}