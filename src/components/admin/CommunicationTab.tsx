import { useCallback, useEffect, useState } from 'react';
import { Loader2, Mail, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getStoreCommunications, type CommData, type CommItem } from '@/services/admin/storesService';
import { ContactActions, Modal } from '@/components/admin/StoreModals';

const STATUS: Record<CommItem['status'], { t: string; c: string }> = {
  sent: { t: 'Enviado', c: 'bg-emerald-500/15 text-emerald-300' },
  failed: { t: 'Falhou', c: 'bg-rose-500/15 text-rose-300' },
  opened: { t: 'Aberto no WhatsApp', c: 'bg-sky-500/15 text-sky-300' },
};
const fmt = (iso: string) => new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
const LBL = 'text-[10px] font-bold uppercase tracking-wider text-slate-500';

export function CommunicationTab({ storeId, storeName, contactName, whatsapp, email }: {
  storeId: string; storeName?: string | null; contactName?: string | null; whatsapp?: string | null; email?: string | null;
}) {
  const [data, setData] = useState<CommData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<CommItem | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await getStoreCommunications(storeId));
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao carregar o histórico.');
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  const card = 'rounded-xl border border-white/10 bg-white/5 p-4';
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className={card}>
          <p className={LBL}>E-mails enviados</p>
          <p className="mt-1 text-2xl font-black text-white">{data?.email_count ?? 0}</p>
        </div>
        <div className={card}>
          <p className={LBL}>Mensagens WhatsApp</p>
          <p className="mt-1 text-2xl font-black text-white">{data?.whatsapp_count ?? 0}</p>
        </div>
      </div>

      <ContactActions variant="buttons" storeId={storeId} storeName={storeName} contactName={contactName} whatsapp={whatsapp} email={email} onLogged={load} />

      <div className={`${card} space-y-2`}>
        <p className={LBL}>Histórico</p>
        {loading && <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-slate-400" /></div>}
        {!loading && (data?.list.length ?? 0) === 0 && <p className="py-4 text-center text-xs text-slate-500">Nenhuma comunicação registrada ainda.</p>}
        {data?.list.map((it) => (
          <button key={it.id} type="button" onClick={() => setSel(it)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-white/5">
            {it.channel === 'email' ? <Mail size={16} className="shrink-0 text-slate-400" /> : <MessageCircle size={16} className="shrink-0 text-emerald-400" />}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{it.channel === 'email' ? (it.subject || '(sem assunto)') : it.message}</p>
              <p className="truncate text-[11px] text-slate-500">{it.recipient} · {fmt(it.created_at)}</p>
            </div>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS[it.status].c}`}>{STATUS[it.status].t}</span>
          </button>
        ))}
      </div>

      {sel && (
        <Modal title={sel.channel === 'email' ? 'E-mail enviado' : 'Mensagem de WhatsApp'} onClose={() => setSel(null)}>
          <div className="space-y-3 text-sm text-slate-200">
            <div><p className={LBL}>Destinatário</p><p>{sel.recipient}</p></div>
            <div><p className={LBL}>Data</p><p>{fmt(sel.created_at)}</p></div>
            {sel.subject && <div><p className={LBL}>Assunto</p><p>{sel.subject}</p></div>}
            <div><p className={LBL}>Mensagem</p><p className="whitespace-pre-wrap rounded-lg bg-white/5 p-3">{sel.message}</p></div>
            <div><p className={LBL}>Status</p><p>{STATUS[sel.status].t}</p></div>
            {sel.error && <div><p className={LBL}>Erro</p><p className="text-rose-300">{sel.error}</p></div>}
          </div>
          <div className="flex justify-end">
            <button type="button" onClick={() => setSel(null)} className="rounded-lg px-4 py-2 text-xs font-bold text-slate-300 hover:bg-white/10">Fechar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}