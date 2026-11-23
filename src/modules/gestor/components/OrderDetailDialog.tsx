import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { FileText, Loader2, Plus } from 'lucide-react';
import { SllModal, sllBtnGhost, sllBtnPrimary } from '@/components/sll/SllModal';
import { SllField, sllFieldCls } from '@/components/sll/SllFilterBar';
import { SllTable } from '@/components/sll/SllTable';
import type { SllColumn } from '@/components/sll/SllTable';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { showError, showSuccess } from '@/utils/toast';
import { pushStockToYampi } from '../services/gestor';
import {
  FULFILLMENT_LABEL,
  PAYMENT_LABEL,
  brl,
  cancelOrder,
  customerName,
  fmtDate,
  fulfillmentOf,
  getOrder,
  pick,
  setFulfillment,
} from '../services/pedidos';
import type { OrderDetail } from '../services/pedidos';
import { fmtNumber } from '../services/notas';
import type { NfNota } from '../services/notas';
import { useGestorAccess } from '../hooks/useGestorAccess';
import OrderStatusBadge from './OrderStatusBadge';
import { NotaDetailModal, NotaRegisterModal, StatusBadge } from './NotasModals';

const sb: any = supabase;

interface Props {
  storeId: string;
  orderId: string | null;
  onClose: () => void;
  onChanged: () => void;
}

type Item = OrderDetail['items'][number];

const STEPS = ['pending', 'separating', 'shipped', 'delivered'];
const stepBtn = '!px-3 !py-1.5 !text-xs';

const Card = ({ title, children, tone }: { title: string; children: ReactNode; tone?: 'danger' }) => (
  <section
    className={cn(
      'rounded-xl border bg-white p-4 shadow-sm dark:bg-slate-800/50',
      tone === 'danger' ? 'border-red-300 dark:border-red-500/50' : 'border-slate-200 dark:border-slate-700',
    )}
  >
    <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">{title}</h3>
    <div className="space-y-3">{children}</div>
  </section>
);

const Pill = ({ children }: { children: ReactNode }) => (
  <span className="inline-flex rounded-full border border-slate-300 px-2.5 py-0.5 text-[11px] font-bold text-slate-600 dark:border-slate-600 dark:text-slate-300">{children}</span>
);

export default function OrderDetailDialog({ storeId, orderId, onClose, onChanged }: Props) {
  const { can: allow } = useGestorAccess();
  const [data, setData] = useState<OrderDetail | null>(null);
  const [nota, setNota] = useState<NfNota | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tracking, setTracking] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [note, setNote] = useState('');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [restock, setRestock] = useState(true);
  const [reason, setReason] = useState('');
  const [nfRegister, setNfRegister] = useState(false);
  const [nfView, setNfView] = useState<string | null>(null);

  const canSeeNf = allow('notas_fiscais', 'ver');
  const canCreateNf = allow('notas_fiscais', 'criar');
  const canEditNf = allow('notas_fiscais', 'editar');

  const loadNota = useCallback(async () => {
    if (!orderId || !canSeeNf) { setNota(null); return; }
    try {
      const { data: r } = await sb
        .from('gestor_nf_notas')
        .select('*')
        .eq('order_id', orderId)
        .neq('status', 'cancelada')
        .order('created_at', { ascending: false })
        .limit(1);
      setNota((r && r[0]) || null);
    } catch {
      setNota(null);
    }
  }, [orderId, canSeeNf]);

  const load = useCallback(async () => {
    if (!orderId) { setData(null); return; }
    setLoading(true);
    try {
      const d = await getOrder(orderId);
      setData(d);
      setTracking(d.order.tracking_code || '');
      setTrackingUrl(d.order.tracking_url || '');
      setNote(d.order.internal_note || '');
      setCancelOpen(false);
      setRestock(!d.order.restocked_at);
      setReason('');
    } catch (e) {
      showError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void loadNota(); }, [loadNota]);

  async function changeStatus(status: string) {
    if (!orderId) return;
    setBusy(true);
    try {
      await setFulfillment(orderId, status, tracking, trackingUrl, note);
      showSuccess(`Pedido: ${FULFILLMENT_LABEL[status]}.`);
      await load();
      onChanged();
    } catch (e) {
      showError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function confirmCancel() {
    if (!orderId) return;
    setBusy(true);
    try {
      const items = await cancelOrder(orderId, restock, reason);
      const results = await Promise.all(items.map((i) => pushStockToYampi(storeId, i.sku, i.balance)));
      const falhou = results.includes('erro');
      showSuccess(
        `Pedido cancelado${items.length ? ` · ${items.length} item(ns) devolvido(s) ao estoque` : ''}${falhou ? ' · ERP salvo, mas o envio à Yampi falhou' : ''}`,
      );
      await load();
      onChanged();
    } catch (e) {
      showError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const o = data?.order;
  const state = o ? fulfillmentOf(o) : 'pending';
  const canceled = state === 'canceled';
  const num = o ? String(pick(o, 'number', 'external_id') ?? '') : '';

  const itemCols: SllColumn<Item>[] = [
    { key: 'p', header: 'Produto', align: 'left', render: (i) => String(pick(i, 'name', 'title', 'product_name') ?? '-') },
    { key: 'sku', header: 'SKU', render: (i) => <span className="font-mono text-xs">{i.sku || '-'}</span> },
    { key: 'q', header: 'Qtd', render: (i) => i.qty },
    { key: 'u', header: 'Unitário', render: (i) => brl(pick(i, 'unit_price', 'price')) },
  ];

  return (
    <>
      <SllModal
        open={!!orderId}
        onOpenChange={(v) => { if (!v && !busy) onClose(); }}
        size="lg"
        title={`Pedido ${o ? '#' + num : ''}`}
        footer={<button type="button" className={sllBtnGhost} onClick={onClose}>Fechar</button>}
      >
        {loading || !data || !o ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-[color:var(--sll-b-brand)]" /></div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <OrderStatusBadge status={state} />
              <Pill>{PAYMENT_LABEL[o.payment_status] || o.payment_status || 'Sem pagamento'}</Pill>
              {o.channel && <Pill>{o.channel}</Pill>}
              <span className="ml-auto text-lg font-extrabold text-slate-800 dark:text-white">{brl(o.total)}</span>
            </div>

            <Card title="Cliente e pagamento">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Cliente</div>
                  <div className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-slate-100">{customerName(o, data.customer)}</div>
                  <div className="text-xs text-slate-500">
                    {[pick(data.customer, 'email'), pick(data.customer, 'phone', 'whatsapp')].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Pagamento</div>
                  <div className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-slate-100">{o.payment_method || '-'}</div>
                  <div className="text-xs text-slate-500">Criado em {fmtDate(pick(o, 'created_at', 'ordered_at'))}</div>
                </div>
              </div>
            </Card>

            <Card title="Itens">
              <SllTable columns={itemCols} rows={data.items} rowKey={(i) => String(i.id ?? i.sku ?? '')} empty="Sem itens." minWidth="30rem" />
            </Card>

            {canSeeNf && (
              <Card title="Nota fiscal">
                {nota ? (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-bold text-slate-800 dark:text-white">{fmtNumber(nota)}</span>
                      <StatusBadge s={nota.status} />
                    </div>
                    <button type="button" className={sllBtnGhost} onClick={() => setNfView(nota.id)}>
                      <FileText size={15} /> Ver nota
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-sm text-slate-500">Este pedido ainda não tem nota fiscal.</span>
                    {canCreateNf && !canceled && (
                      <button type="button" className={sllBtnPrimary} onClick={() => setNfRegister(true)}>
                        <Plus size={15} /> Registrar nota
                      </button>
                    )}
                  </div>
                )}
              </Card>
            )}

            <Card title="Linha do tempo">
              <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                <p>Criado: {fmtDate(pick(o, 'created_at', 'ordered_at'))}</p>
                {o.shipped_at && <p>Enviado: {fmtDate(o.shipped_at)}</p>}
                {o.delivered_at && <p>Entregue: {fmtDate(o.delivered_at)}</p>}
                {o.canceled_at && <p className="text-red-600">Cancelado: {fmtDate(o.canceled_at)}{o.restocked_at ? ' · itens devolvidos ao estoque' : ''}</p>}
              </div>
            </Card>

            {!canceled && allow('pedidos', 'editar') && (
              <Card title="Expedição">
                <div className="flex flex-wrap gap-2">
                  {STEPS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={busy || state === s}
                      onClick={() => void changeStatus(s)}
                      className={cn(state === s ? sllBtnPrimary : sllBtnGhost, stepBtn, 'disabled:cursor-not-allowed')}
                    >
                      {FULFILLMENT_LABEL[s]}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <SllField label="Código de rastreio">
                    <input value={tracking} onChange={(e) => setTracking(e.target.value)} className={sllFieldCls} />
                  </SllField>
                  <SllField label="Link de rastreio">
                    <input value={trackingUrl} onChange={(e) => setTrackingUrl(e.target.value)} className={sllFieldCls} />
                  </SllField>
                </div>
                <SllField label="Observação interna">
                  <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} className={sllFieldCls} />
                </SllField>
                <p className="text-xs text-slate-500">Rastreio e observação são gravados ao clicar em um dos status acima.</p>
              </Card>
            )}

            {!canceled && allow('pedidos', 'excluir') && (
              <Card title="Cancelamento" tone="danger">
                {!cancelOpen ? (
                  <button
                    type="button"
                    onClick={() => setCancelOpen(true)}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-red-300 bg-white px-5 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-500/50 dark:bg-transparent dark:hover:bg-red-500/10"
                  >
                    Cancelar pedido
                  </button>
                ) : (
                  <div className="space-y-3">
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                      <input
                        type="checkbox"
                        className="h-4 w-4 cursor-pointer accent-[color:var(--sll-b-brand)]"
                        checked={restock}
                        disabled={!!o.restocked_at}
                        onChange={(e) => setRestock(e.target.checked)}
                      />
                      Devolver os itens ao estoque
                    </label>
                    <SllField label="Motivo (opcional)">
                      <input value={reason} onChange={(e) => setReason(e.target.value)} className={sllFieldCls} />
                    </SllField>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void confirmCancel()}
                        className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {busy && <Loader2 size={15} className="animate-spin" />}Confirmar cancelamento
                      </button>
                      <button type="button" className={sllBtnGhost} disabled={busy} onClick={() => setCancelOpen(false)}>Voltar</button>
                    </div>
                  </div>
                )}
              </Card>
            )}
          </div>
        )}
      </SllModal>

      {nfRegister && o && data && (
        <NotaRegisterModal
          storeId={storeId}
          order={{
            id: o.id as string,
            label: `#${num}`,
            name: customerName(o, data.customer),
            document: String(pick(data.customer, 'document', 'cpf_cnpj', 'cpf', 'tax_id') ?? ''),
            total: Number(o.total ?? 0),
            channel: String(o.channel ?? ''),
          }}
          onClose={() => setNfRegister(false)}
          onSaved={() => { void loadNota(); onChanged(); }}
        />
      )}
      {nfView && <NotaDetailModal notaId={nfView} canEdit={canEditNf} onClose={() => setNfView(null)} onChanged={() => { void loadNota(); onChanged(); }} />}
    </>
  );
}