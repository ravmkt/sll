import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { fmtWaNumber } from '@/components/configuracoes/WhatsAppConnections';

type St = { state: 'none' | 'connecting' | 'connected'; number?: string | null };

export default function WhatsAppConnectCard({ storeId: storeIdProp, onStatus }: { storeId?: string | null; onStatus?: (connected: boolean) => void }) {
  const sb = supabase as any;
  const navigate = useNavigate();
  const [storeId, setStoreId] = useState<string | null>(storeIdProp ?? null);
  const [st, setSt] = useState<St | null>(null);
  const cb = useRef(onStatus);
  cb.current = onStatus;

  useEffect(() => {
    if (storeIdProp) { setStoreId(storeIdProp); return; }
    (async () => {
      const { data: u } = await sb.auth.getUser();
      if (!u?.user) return;
      const { data } = await sb.from('stores').select('id').eq('owner_user_id', u.user.id).limit(1).maybeSingle();
      if (data?.id) setStoreId(data.id);
    })();
  }, [storeIdProp]);

  const refresh = useCallback(async () => {
    if (!storeId) return;
    const { data, error } = await sb.functions.invoke('live_notify_connect', { body: { action: 'status', store_id: storeId } });
    if (error || data?.error) { setSt((p) => p ?? { state: 'none' }); return; }
    setSt(data as St);
  }, [storeId]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    const f = () => { if (!document.hidden) refresh(); };
    window.addEventListener('focus', f);
    document.addEventListener('visibilitychange', f);
    return () => { window.removeEventListener('focus', f); document.removeEventListener('visibilitychange', f); };
  }, [refresh]);

  useEffect(() => { if (st) cb.current?.(st.state === 'connected'); }, [st]);

  const goSettings = () => navigate('/dashboard/settings#whatsapp-conexoes');

  if (!st) {
    return (
      <div className="mb-4 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" /> {'Verificando WhatsApp...'}
      </div>
    );
  }

  if (st.state === 'connected') {
    return (
      <div className="mb-4 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
        <p className="text-sm font-bold text-emerald-800">
          {'WhatsApp Conectado' + (st.number ? ': ' + fmtWaNumber(st.number) : '')}
        </p>
      </div>
    );
  }

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <p className="text-sm font-bold text-amber-900">{'WhatsApp n\u00e3o conectado para envios autom\u00e1ticos'}</p>
      </div>
      <button
        type="button"
        onClick={goSettings}
        className="cursor-pointer rounded-2xl bg-[#DC2626] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#B91C1C]"
      >
        {'Conectar WhatsApp no SLL Hub \u2192'}
      </button>
    </div>
  );
}