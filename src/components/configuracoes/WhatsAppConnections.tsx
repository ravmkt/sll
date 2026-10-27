import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, MessageCircle, QrCode } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AppModal, ConfirmDangerModal } from '@/components/common/AppModal';

type St = { state: 'none' | 'connecting' | 'connected'; qr?: string | null; number?: string | null };

export function fmtWaNumber(v?: string | null): string {
  let d = String(v || '').replace(/\D/g, '');
  if (d.length > 11 && d.startsWith('55')) d = d.slice(2);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return d ? `+${d}` : '';
}

const btnMain =
  'inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-[#0094eb] px-6 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-blue-500/20 transition hover:bg-[#0082cf] disabled:opacity-50';
const btnLine =
  'cursor-pointer rounded-2xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50';

export default function WhatsAppConnections({ storeId }: { storeId: string }) {
  const sb = supabase as any;
  const [st, setSt] = useState<St>({ state: 'none' });
  const [qr, setQr] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [askOff, setAskOff] = useState(false);
  const [err, setErr] = useState('');
  const box = useRef<HTMLDivElement>(null);

  const call = useCallback(async (action: string): Promise<St | null> => {
    if (!storeId) return null;
    const { data, error } = await sb.functions.invoke('live_notify_connect', { body: { action, store_id: storeId } });
    if (error || data?.error) { setErr(data?.error || 'N\u00e3o foi poss\u00edvel falar com o servidor.'); return null; }
    setErr('');
    return data as St;
  }, [storeId]);

  useEffect(() => {
    if (storeId) call('status').then((d) => d && setSt(d));
  }, [storeId, call]);

  useEffect(() => {
    if (!open || !storeId) return;
    let n = 0;
    const t = setInterval(async () => {
      n++;
      const d = await call(n % 8 === 0 ? 'connect' : 'status');
      if (!d) return;
      if (d.state === 'connected') { setSt(d); setOpen(false); return; }
      if (d.qr) setQr(d.qr);
    }, 3000);
    return () => clearInterval(t);
  }, [open, storeId, call]);

  useEffect(() => {
    if (window.location.hash !== '#whatsapp-conexoes') return;
    const t = setTimeout(() => box.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
    return () => clearTimeout(t);
  }, []);

  const start = async () => {
    setBusy(true); setQr(null);
    const d = await call('connect');
    setBusy(false);
    if (!d) return;
    if (d.state === 'connected') { setSt(d); return; }
    setQr(d.qr ?? null);
    setOpen(true);
  };

  const disconnect = async () => {
    setBusy(true);
    const d = await call('logout');
    setBusy(false); setAskOff(false);
    if (d) setSt({ state: 'connecting' });
  };

  const on = st.state === 'connected';
  const label = on ? 'Conectado' : open ? 'Aguardando leitura do QR Code' : 'Desconectado';
  const tone = on
    ? 'bg-emerald-50 text-emerald-700'
    : open
      ? 'bg-amber-50 text-amber-700'
      : 'bg-slate-100 text-slate-500';

  return (
    <div ref={box} id="whatsapp-conexoes" className="scroll-mt-24 space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#1a1f35]/80 sm:p-8">
      <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
        <h2 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">{'Conex\u00f5es de WhatsApp'}</h2>
        <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
          {'Conecte o n\u00famero da loja para os avisos autom\u00e1ticos das lives (r\u00e9gua de notifica\u00e7\u00e3o). Isso n\u00e3o altera o n\u00famero receptor dos v\u00eddeos.'}
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-5 dark:border-slate-800 dark:bg-[#111524]/60 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className={'flex h-11 w-11 shrink-0 items-center justify-center rounded-full ' + (on ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500')}>
            <MessageCircle className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-black text-slate-900 dark:text-white">{'WhatsApp das notifica\u00e7\u00f5es de lives'}</p>
            <span className={'inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ' + tone}>{label}</span>
            {on && st.number && (
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300">{'N\u00famero: ' + fmtWaNumber(st.number)}</p>
            )}
            {err && <p className="text-xs font-semibold text-rose-600">{err}</p>}
          </div>
        </div>
        {on ? (
          <button type="button" className={btnLine} disabled={busy} onClick={() => setAskOff(true)}>Desconectar</button>
        ) : (
          <button type="button" className={btnMain} disabled={busy || !storeId} onClick={start}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />} Conectar WhatsApp
          </button>
        )}
      </div>

      <AppModal
        open={open}
        title="CONECTAR WHATSAPP"
        onClose={() => setOpen(false)}
        footer={<button type="button" className={btnLine + ' flex-1'} onClick={() => setOpen(false)}>Fechar</button>}
      >
        <div className="flex h-56 w-56 items-center justify-center rounded-2xl border border-slate-200 bg-white">
          {qr ? <img src={qr} alt="QR Code do WhatsApp" className="h-52 w-52" /> : <Loader2 className="h-8 w-8 animate-spin text-slate-400" />}
        </div>
        <p className="mt-4 text-center text-xs leading-relaxed text-slate-600">
          {'No celular: WhatsApp > Aparelhos conectados > Conectar um aparelho e aponte para o QR Code. O c\u00f3digo se renova sozinho.'}
        </p>
      </AppModal>

      <ConfirmDangerModal
        open={askOff}
        title="DESCONECTAR WHATSAPP"
        itemName="WhatsApp da loja"
        message={'Os avisos de WhatsApp param de ser enviados at\u00e9 voc\u00ea conectar de novo.'}
        confirmLabel="Desconectar"
        busy={busy}
        onClose={() => setAskOff(false)}
        onConfirm={disconnect}
      />
    </div>
  );
}