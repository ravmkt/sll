import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { showError, showSuccess } from '@/utils/toast';
import { ExpRow, dispatchOrder, isPickup } from '../services/expedicao';

interface Props {
  row: ExpRow | null;
  onClose: () => void;
  onDone: () => void;
}

const PROVIDERS = ['Correios', 'Jadlog', 'Loggi', 'Melhor Envio', 'Total Express', 'Entrega própria', 'Retirada na loja'];

export default function DispatchDialog({ row, onClose, onDone }: Props) {
  const [provider, setProvider] = useState('');
  const [service, setService] = useState('');
  const [tracking, setTracking] = useState('');
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!row) return;
    setProvider(row.shipping_provider || (isPickup(row.shipping_service) ? 'Retirada na loja' : ''));
    setService(row.shipping_service || '');
    setTracking(row.tracking_code || '');
    setUrl(row.tracking_url || '');
  }, [row]);

  async function save() {
    if (!row) return;
    if (!provider.trim()) { showError('Informe a transportadora.'); return; }
    setSaving(true);
    try {
      await dispatchOrder(row.id, provider, service, tracking, url);
      showSuccess(`Pedido #${row.number} marcado como enviado.`);
      onDone();
      onClose();
    } catch (e) {
      showError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!row} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md bg-white text-slate-900 [&_input]:bg-white [&_input]:text-slate-900 [&_label]:text-slate-700">
        <DialogHeader><DialogTitle>Enviar pedido #{row?.number}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Transportadora *</label>
            <Input list="exp-providers" value={provider} onChange={(e) => setProvider(e.target.value)} />
            <datalist id="exp-providers">{PROVIDERS.map((p) => <option key={p} value={p} />)}</datalist>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Serviço</label>
            <Input value={service} onChange={(e) => setService(e.target.value)} placeholder="Ex.: SEDEX, PAC" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Código de rastreio</label>
            <Input value={tracking} onChange={(e) => setTracking(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Link de rastreio</label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />
          </div>
          <p className="text-xs text-muted-foreground">Retirada na loja e entrega própria podem ficar sem rastreio.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirmar envio</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}