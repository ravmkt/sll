import { useState } from 'react';
import { Copy, ExternalLink, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Modal } from '@/components/admin/StoreModals';

type Docs = {
  invoice_url: string | null;
  receipt_url: string | null;
  nf: { number: string | null; status: string | null; pdf_url: string | null; xml_url: string | null } | null;
  nf_checked: boolean;
  has_payment: boolean;
};

const NF_STATUS: Record<string, string> = {
  AUTHORIZED: 'Emitida', SCHEDULED: 'Agendada', SYNCHRONIZED: 'Sincronizada', PROCESSING_CANCELLATION: 'Cancelando',
  CANCELED: 'Cancelada', ERROR: 'Com erro', CANCELLATION_DENIED: 'Cancelamento negado',
};

function Row({ label, url }: { label: string; url: string | null }) {
  const copy = () =>
    navigator.clipboard.writeText(url as string).then(() => toast.success('Link copiado.')).catch(() => toast.error('Não foi possível copiar.'));
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-white/5 px-3 py-2.5">
      <span className="text-sm font-semibold text-slate-200">{label}</span>
      {url ? (
        <div className="flex gap-1.5">
          <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-md bg-white/10 px-2.5 py-1.5 text-xs font-bold text-slate-100 hover:bg-white/20">
            <ExternalLink size={13} /> Abrir
          </a>
          <button type="button" onClick={copy} className="flex cursor-pointer items-center gap-1 rounded-md bg-[#0094eb] px-2.5 py-1.5 text-xs font-bold text-white hover:bg-[#007fcc]">
            <Copy size={13} /> Copiar link
          </button>
        </div>
      ) : (
        <span className="text-xs text-slate-500">Indisponível</span>
      )}
    </div>
  );
}

export default function InvoiceDocs({ invoiceId, label }: { invoiceId: string; label: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [docs, setDocs] = useState<Docs | null>(null);

  const load = async () => {
    setOpen(true);
    if (docs) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('asaas-invoice-docs', { body: { invoice_id: invoiceId } });
    let body: any = data;
    if (error && (error as any).context) { try { body = await (error as any).context.json(); } catch { /* usa o padrao */ } }
    setBusy(false);
    if (error || body?.error) {
      toast.error(body?.error || 'Não foi possível consultar os documentos.');
      setOpen(false);
      return;
    }
    setDocs(body as Docs);
  };

  return (
    <>
      <button type="button" onClick={load} title="Fatura e nota fiscal" className="flex cursor-pointer items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-xs font-bold text-slate-200 hover:bg-white/20">
        <FileText size={13} /> Docs
      </button>
      {open && (
        <Modal title={`Documentos: ${label}`} onClose={() => setOpen(false)}>
          {busy || !docs ? (
            <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-slate-400" /></div>
          ) : (
            <div className="space-y-2">
              <Row label="Fatura / cobrança" url={docs.invoice_url} />
              <Row label="Comprovante de pagamento" url={docs.receipt_url} />
              <Row label={`Nota fiscal (PDF)${docs.nf?.number ? ` nº ${docs.nf.number}` : ''}`} url={docs.nf?.pdf_url ?? null} />
              <Row label="Nota fiscal (XML)" url={docs.nf?.xml_url ?? null} />
              {docs.nf?.status && <p className="text-[11px] text-slate-400">Situação da nota: {NF_STATUS[docs.nf.status] ?? docs.nf.status}.</p>}
              {!docs.nf && (
                <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-[11px] text-amber-300">
                  {!docs.has_payment
                    ? 'Esta fatura não tem cobrança vinculada no Asaas.'
                    : docs.nf_checked
                      ? 'Nenhuma nota fiscal emitida no Asaas para esta cobrança. Se a nota é emitida em outro sistema, ela não aparece aqui.'
                      : 'Não foi possível consultar as notas fiscais no Asaas agora.'}
                </p>
              )}
            </div>
          )}
        </Modal>
      )}
    </>
  );
}