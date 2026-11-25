import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Plus, Search, Trash2 } from 'lucide-react';
import { SllModal, sllBtnGhost, sllBtnPrimary } from '@/components/sll/SllModal';
import { SllField, sllFieldCls } from '@/components/sll/SllFilterBar';
import { supabase } from '@/lib/supabase';
import { showError, showSuccess } from '@/utils/toast';
import { listProducts } from '@/services/productsService';
import type { CatalogProduct } from '@/services/productsService';
import {
  PROPOSAL_STATUS_CLS, PROPOSAL_STATUS_LABEL, brl, calcTotals, canEditProposal, getProposal, itemTotal, saveProposal,
} from '../services/propostas';
import type { ProposalHeaderForm, ProposalItemForm, ProposalStatus } from '../services/propostas';

export type SellerOption = { id: string; label: string };
type Row = ProposalItemForm & { key: string };
type CustHit = { id: string; name: string; email: string | null; phone: string | null };

const sb: any = supabase;
const today = () => new Date().toLocaleDateString('sv-SE');
const plusDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString('sv-SE'); };
const msg = (e: unknown) => (e instanceof Error ? e.message : 'Erro inesperado.');

const emptyHeader = (seller: string | null): ProposalHeaderForm => ({
  customer_id: null, customer_name: '', customer_phone: '', customer_email: '', seller_id: seller,
  valid_until: plusDays(15), payment_terms: '', notes: '', discount: 0, shipping_cost: 0,
});

function Num({ value, onChange, disabled, step = '0.01', min = 0, className = '' }: {
  value: number; onChange: (v: number) => void; disabled?: boolean; step?: string; min?: number; className?: string;
}) {
  return (
    <input
      type="number" inputMode="decimal" min={min} step={step} disabled={disabled}
      value={Number.isFinite(value) ? value : 0}
      onChange={(e) => onChange(Number(e.target.value || 0))}
      className={`${sllFieldCls} ${className}`}
    />
  );
}

type Props = {
  storeId: string;
  proposalId: string | null;
  sellers: SellerOption[];
  defaultSellerId?: string | null;
  onClose: () => void;
  onSaved: (id: string) => void;
};

export default function ProposalModal({ storeId, proposalId, sellers, defaultSellerId = null, onClose, onSaved }: Props) {
  const [header, setHeader] = useState<ProposalHeaderForm>(() => emptyHeader(defaultSellerId));
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState<ProposalStatus>('draft');
  const [number, setNumber] = useState<number | null>(null);
  const [loading, setLoading] = useState(!!proposalId);
  const [busy, setBusy] = useState(false);
  const seq = useRef(0);
  const nextKey = () => `r${++seq.current}`;

  // cliente
  const [searchCust, setSearchCust] = useState(false);
  const [hits, setHits] = useState<CustHit[]>([]);

  // produtos
  const [products, setProducts] = useState<CatalogProduct[] | null>(null);
  const [pq, setPq] = useState('');
  const [pOpen, setPOpen] = useState(false);

  const readOnly = !!proposalId && !canEditProposal(status);
  const set = <K extends keyof ProposalHeaderForm>(k: K, v: ProposalHeaderForm[K]) => setHeader((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    if (!proposalId) return;
    let on = true;
    getProposal(proposalId)
      .then(({ proposal: p, items }) => {
        if (!on) return;
        setStatus(p.status);
        setNumber(p.number);
        setHeader({
          customer_id: p.customer_id, customer_name: p.customer_name,
          customer_phone: p.customer_phone || '', customer_email: p.customer_email || '',
          seller_id: p.seller_id, valid_until: p.valid_until || '', payment_terms: p.payment_terms || '',
          notes: p.notes || '', discount: p.discount, shipping_cost: p.shipping_cost,
        });
        setRows(items.map((i) => ({
          key: nextKey(), product_id: i.product_id, variant_id: i.variant_id, sku: i.sku || '',
          name: i.name, qty: i.qty, unit_price: i.unit_price, discount: i.discount,
        })));
      })
      .catch((e) => { showError(msg(e)); onClose(); })
      .finally(() => { if (on) setLoading(false); });
    return () => { on = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposalId]);

  // busca de cliente (so quando o usuario digita)
  useEffect(() => {
    const q = header.customer_name.trim();
    if (!searchCust || header.customer_id || q.length < 2) { setHits([]); return; }
    const t = setTimeout(async () => {
      const s = q.replace(/[%,()]/g, ' ');
      const { data } = await sb.from('customers').select('id,name,email,phone').eq('store_id', storeId)
        .or(`name.ilike.%${s}%,email.ilike.%${s}%,phone.ilike.%${s}%`).limit(8);
      setHits((data || []) as CustHit[]);
    }, 250);
    return () => clearTimeout(t);
  }, [header.customer_name, header.customer_id, searchCust, storeId]);

  const pickCustomer = (c: CustHit) => {
    setSearchCust(false);
    setHits([]);
    setHeader((s) => ({ ...s, customer_id: c.id, customer_name: c.name, customer_phone: c.phone || '', customer_email: c.email || '' }));
  };

  const loadProducts = () => {
    if (products) return;
    listProducts(storeId).then(setProducts).catch(() => { setProducts([]); showError('Erro ao carregar produtos.'); });
  };

  const found = useMemo(() => {
    const q = pq.trim().toLowerCase();
    if (!products || q.length < 2) return [];
    return products.filter((p) => p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q)).slice(0, 8);
  }, [products, pq]);

  const addProduct = (p: CatalogProduct) => {
    const price = Number((p as any).price ?? (p as any).sale_price ?? 0) || 0;
    setRows((r) => [...r, { key: nextKey(), product_id: p.id, variant_id: null, sku: p.sku || '', name: p.name, qty: 1, unit_price: price, discount: 0 }]);
    setPq('');
    setPOpen(false);
  };
  const addBlank = () => setRows((r) => [...r, { key: nextKey(), product_id: null, variant_id: null, sku: '', name: '', qty: 1, unit_price: 0, discount: 0 }]);
  const patch = (key: string, v: Partial<ProposalItemForm>) => setRows((r) => r.map((x) => (x.key === key ? { ...x, ...v } : x)));
  const remove = (key: string) => setRows((r) => r.filter((x) => x.key !== key));

  const totals = calcTotals(rows, header.discount, header.shipping_cost);

  const save = async () => {
    setBusy(true);
    try {
      const id = await saveProposal(storeId, proposalId, header, rows.map(({ key: _k, ...i }) => i));
      showSuccess(proposalId ? 'Proposta atualizada.' : 'Proposta criada.');
      onSaved(id);
      onClose();
    } catch (e) { showError(msg(e)); } finally { setBusy(false); }
  };

  const title = proposalId ? `Proposta #${number ?? ''}` : 'Nova proposta';
  const th = 'px-2 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500';

  return (
    <SllModal
      open
      onOpenChange={(o) => { if (!o && !busy) onClose(); }}
      size="xl"
      tall
      title={
        <span className="flex items-center gap-3">
          {title}
          {proposalId && <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${PROPOSAL_STATUS_CLS[status]}`}>{PROPOSAL_STATUS_LABEL[status]}</span>}
        </span>
      }
      footer={
        <>
          <button type="button" className={sllBtnGhost} disabled={busy} onClick={onClose}>{readOnly ? 'Fechar' : 'Cancelar'}</button>
          {!readOnly && (
            <button type="button" className={sllBtnPrimary} disabled={busy || loading} onClick={() => void save()}>
              {busy && <Loader2 size={15} className="animate-spin" />}Salvar proposta
            </button>
          )}
        </>
      }
    >
      {loading ? (
        <div className="py-16"><Loader2 className="mx-auto h-6 w-6 animate-spin text-[color:var(--sll-b-brand)]" /></div>
      ) : (
        <fieldset disabled={readOnly || busy} className="space-y-5">
          {readOnly && (
            <p className="rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
              Proposta {PROPOSAL_STATUS_LABEL[status].toLowerCase()}: somente leitura. Use "Reabrir" na lista para editar.
            </p>
          )}

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
            <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Cliente e condições</h3>
            <div className="grid gap-3 md:grid-cols-3">
              <SllField label="Cliente *" className="relative md:col-span-2">
                <input
                  value={header.customer_name}
                  onChange={(e) => { setSearchCust(true); setHeader((s) => ({ ...s, customer_name: e.target.value, customer_id: null })); }}
                  placeholder="Digite para buscar no cadastro ou informe um nome"
                  className={sllFieldCls}
                />
                {hits.length > 0 && (
                  <ul className="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
                    {hits.map((c) => (
                      <li key={c.id}>
                        <button type="button" onClick={() => pickCustomer(c)} className="flex w-full cursor-pointer flex-col px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700">
                          <b>{c.name}</b>
                          <span className="text-xs text-slate-500">{[c.email, c.phone].filter(Boolean).join(' · ')}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </SllField>
              <SllField label="Vendedor">
                <select value={header.seller_id || ''} onChange={(e) => set('seller_id', e.target.value || null)} className={`${sllFieldCls} cursor-pointer`}>
                  <option value="">Sem vendedor</option>
                  {sellers.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </SllField>
              <SllField label="WhatsApp / telefone">
                <input value={header.customer_phone} onChange={(e) => set('customer_phone', e.target.value)} className={sllFieldCls} />
              </SllField>
              <SllField label="E-mail">
                <input type="email" value={header.customer_email} onChange={(e) => set('customer_email', e.target.value)} className={sllFieldCls} />
              </SllField>
              <SllField label="Válida até">
                <input type="date" min={proposalId ? undefined : today()} value={header.valid_until} onChange={(e) => set('valid_until', e.target.value)} className={sllFieldCls} />
              </SllField>
              <SllField label="Condições de pagamento" className="md:col-span-3">
                <input value={header.payment_terms} onChange={(e) => set('payment_terms', e.target.value)} placeholder="Ex.: PIX à vista ou 3x sem juros no cartão" className={sllFieldCls} />
              </SllField>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Itens</h3>
              {!readOnly && (
                <div className="flex flex-1 items-center justify-end gap-2">
                  <div className="relative w-full max-w-sm">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={pq}
                      onFocus={() => { loadProducts(); setPOpen(true); }}
                      onChange={(e) => { setPq(e.target.value); setPOpen(true); }}
                      placeholder="Buscar produto ou SKU..."
                      className={`${sllFieldCls} pl-9`}
                    />
                    {pOpen && found.length > 0 && (
                      <ul className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
                        {found.map((p) => (
                          <li key={p.id}>
                            <button type="button" onClick={() => addProduct(p)} className="flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700">
                              <span className="truncate font-semibold">{p.name}</span>
                              <span className="shrink-0 font-mono text-xs text-slate-500">{p.sku}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <button type="button" onClick={addBlank} className={sllBtnGhost}><Plus size={15} />Item avulso</button>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs" style={{ minWidth: '46rem' }}>
                <thead className="border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className={th}>Item</th>
                    <th className={`${th} w-20 text-center`}>Qtd</th>
                    <th className={`${th} w-32 text-center`}>Unitário</th>
                    <th className={`${th} w-32 text-center`}>Desconto</th>
                    <th className={`${th} w-32 text-center`}>Total</th>
                    <th className={`${th} w-10`} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {rows.map((r) => (
                    <tr key={r.key} className="align-middle">
                      <td className="px-2 py-2">
                        <input value={r.name} onChange={(e) => patch(r.key, { name: e.target.value })} placeholder="Descrição" className={sllFieldCls} />
                        {r.sku && <span className="mt-0.5 block font-mono text-[10px] text-slate-400">{r.sku}</span>}
                      </td>
                      <td className="px-2 py-2"><Num value={r.qty} min={1} step="1" onChange={(v) => patch(r.key, { qty: Math.max(Math.floor(v), 1) })} className="text-center" /></td>
                      <td className="px-2 py-2"><Num value={r.unit_price} onChange={(v) => patch(r.key, { unit_price: v })} className="text-center" /></td>
                      <td className="px-2 py-2"><Num value={r.discount} onChange={(v) => patch(r.key, { discount: v })} className="text-center" /></td>
                      <td className="px-2 py-2 text-center text-sm font-bold">{brl(itemTotal(r))}</td>
                      <td className="px-2 py-2 text-center">
                        {!readOnly && (
                          <button type="button" title="Remover" onClick={() => remove(r.key)} className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-700">
                            <Trash2 size={15} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr><td colSpan={6} className="px-2 py-8 text-center text-sm font-medium text-slate-500">Busque um produto ou adicione um item avulso.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <div className="grid gap-4 md:grid-cols-2">
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
              <SllField label="Observações (aparecem para o cliente)">
                <textarea rows={5} value={header.notes} onChange={(e) => set('notes', e.target.value)} className={sllFieldCls} />
              </SllField>
            </section>
            <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
              <div className="grid grid-cols-2 gap-3">
                <SllField label="Desconto geral (R$)"><Num value={header.discount} onChange={(v) => set('discount', v)} /></SllField>
                <SllField label="Frete (R$)"><Num value={header.shipping_cost} onChange={(v) => set('shipping_cost', v)} /></SllField>
              </div>
              <dl className="space-y-1 border-t border-slate-200 pt-3 text-sm dark:border-slate-700">
                <div className="flex justify-between"><dt className="text-slate-500">Subtotal</dt><dd className="font-semibold">{brl(totals.subtotal)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Desconto</dt><dd className="font-semibold">- {brl(header.discount)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Frete</dt><dd className="font-semibold">{brl(header.shipping_cost)}</dd></div>
                <div className="flex justify-between border-t border-slate-200 pt-2 text-base dark:border-slate-700">
                  <dt className="font-bold">Total</dt><dd className="font-extrabold text-[color:var(--sll-b-brand)]">{brl(totals.total)}</dd>
                </div>
              </dl>
            </section>
          </div>
        </fieldset>
      )}
    </SllModal>
  );
}