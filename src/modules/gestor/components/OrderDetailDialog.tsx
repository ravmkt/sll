import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { showError, showSuccess } from '@/utils/toast';
import { pushStockToYampi } from '../services/gestor';
import {
  FULFILLMENT_LABEL,
  OrderDetail,
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
import { useGestorAccess } from '../hooks/useGestorAccess';

interface Props {
  storeId: string;
  orderId: string | null;
  onClose: () => void;
  onChanged: () => void;
}

const STEPS = ['pending', 'separating', 'shipped', 'delivered'];

export default function OrderDetailDialog({ storeId, orderId, onClose, onChanged }: Props) {
  const { can: allow } = useGestorAccess();
  const [data, setData] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tracking, setTracking] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [note, setNote] = useState('');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [restock, setRestock] = useState(true);
  const [reason, setReason] = useState('');

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

  useEffect(() => { load(); }, [load]);

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

  return (
    <Dialog open={!!orderId} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto bg-white text-slate-900 [&_input]:bg-white [&_input]:text-slate-900 [&_textarea]:bg-white [&_textarea]:text-slate-900 [&_label]:text-slate-700">
        <DialogHeader>
          <DialogTitle>Pedido {o ? `#${pick(o, 'number', 'external_id') ?? ''}` : ''}</DialogTitle>
        </DialogHeader>

        {loading || !data || !o ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={canceled ? 'destructive' : 'secondary'}>{FULFILLMENT_LABEL[state] || state}</Badge>
              <Badge variant="outline">{PAYMENT_LABEL[o.payment_status] || o.payment_status || 'Sem pagamento'}</Badge>
              {o.channel && <Badge variant="outline">{o.channel}</Badge>}
              <span className="ml-auto text-lg font-semibold">{brl(o.total)}</span>
            </div>

            <section className="grid grid-cols-2 gap-3 rounded-md border p-3">
              <div>
                <p className="text-xs text-muted-foreground">Cliente</p>
                <p className="font-medium">{customerName(o, data.customer)}</p>
                <p className="text-xs text-muted-foreground">
                  {[pick(data.customer, 'email'), pick(data.customer, 'phone', 'whatsapp')].filter(Boolean).join(' · ')}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pagamento</p>
                <p className="font-medium">{o.payment_method || '-'}</p>
                <p className="text-xs text-muted-foreground">Criado em {fmtDate(pick(o, 'created_at', 'ordered_at'))}</p>
              </div>
            </section>

            <section>
              <p className="mb-1 font-medium">Itens</p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="py-1 font-medium">Produto</th>
                    <th className="py-1 font-medium">SKU</th>
                    <th className="py-1 text-right font-medium">Qtd</th>
                    <th className="py-1 text-right font-medium">Unitário</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((i, idx) => (
                    <tr key={i.id || idx} className="border-t">
                      <td className="py-1.5">{pick(i, 'name', 'title', 'product_name') || '-'}</td>
                      <td className="py-1.5 text-muted-foreground">{i.sku || '-'}</td>
                      <td className="py-1.5 text-right">{i.qty}</td>
                      <td className="py-1.5 text-right">{brl(pick(i, 'unit_price', 'price'))}</td>
                    </tr>
                  ))}
                  {data.items.length === 0 && (
                    <tr><td colSpan={4} className="py-2 text-muted-foreground">Sem itens.</td></tr>
                  )}
                </tbody>
              </table>
            </section>

            <section className="space-y-1 rounded-md border p-3 text-xs">
              <p className="mb-1 text-sm font-medium">Linha do tempo</p>
              <p>Criado: {fmtDate(pick(o, 'created_at', 'ordered_at'))}</p>
              {o.shipped_at && <p>Enviado: {fmtDate(o.shipped_at)}</p>}
              {o.delivered_at && <p>Entregue: {fmtDate(o.delivered_at)}</p>}
              {o.canceled_at && <p className="text-rose-600">Cancelado: {fmtDate(o.canceled_at)}{o.restocked_at ? ' · itens devolvidos ao estoque' : ''}</p>}
            </section>

            {!canceled && (
              <>{allow('pedidos','editar') && (<section className="space-y-3 rounded-md border p-3">
                <p className="font-medium">Expedição</p>
                <div className="flex flex-wrap gap-2">
                  {STEPS.map((s) => (
                    <Button key={s} size="sm" variant={state === s ? 'default' : 'outline'} disabled={busy || state === s} onClick={() => changeStatus(s)}>
                      {FULFILLMENT_LABEL[s]}
                    </Button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium">Código de rastreio</label>
                    <Input value={tracking} onChange={(e) => setTracking(e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium">Link de rastreio</label>
                    <Input value={trackingUrl} onChange={(e) => setTrackingUrl(e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <label className="mb-1 block text-xs font-medium">Observação interna</label>
                    <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Rastreio e observação são gravados ao clicar em um dos status acima.</p>
              </section>)}</>
            )}

            {!canceled && (
              <>{allow('pedidos','excluir') && (<section className="rounded-md border border-rose-200 p-3">
                {!cancelOpen ? (
                  <Button variant="outline" className="text-rose-600" onClick={() => setCancelOpen(true)}>Cancelar pedido</Button>
                ) : (
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={restock} disabled={!!o.restocked_at} onChange={(e) => setRestock(e.target.checked)} />
                      Devolver os itens ao estoque
                    </label>
                    <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo (opcional)" />
                    <div className="flex gap-2">
                      <Button variant="destructive" disabled={busy} onClick={confirmCancel}>
                        {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirmar cancelamento
                      </Button>
                      <Button variant="outline" onClick={() => setCancelOpen(false)}>Voltar</Button>
                    </div>
                  </div>
                )}
              </section>)}</>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}