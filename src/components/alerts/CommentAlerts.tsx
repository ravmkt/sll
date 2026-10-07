import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, MessageSquare, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useLoja } from '@/contexts/LojaContext';

const OFF_KEY = (storeId: string) => `sll_comment_alerts_off_${storeId}`;
const SEEN_KEY = (storeId: string) => `sll_comment_alert_seen_${storeId}`;
const CHANGED_EVENT = 'sll:comment-alerts-changed';

const alertsEnabled = (storeId: string): boolean => {
  try { return localStorage.getItem(OFF_KEY(storeId)) !== '1'; } catch { return true; }
};

const setAlertsEnabled = (storeId: string, on: boolean) => {
  try {
    if (on) localStorage.removeItem(OFF_KEY(storeId));
    else localStorage.setItem(OFF_KEY(storeId), '1');
  } catch {}
  window.dispatchEvent(new CustomEvent(CHANGED_EVENT));
};

export function CommentAlertModal() {
  const { storeId } = useLoja();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [dontShow, setDontShow] = useState(false);
  const blocked = pathname.startsWith('/auth') || pathname.startsWith('/planos-bloqueio');

  useEffect(() => {
    if (!storeId || blocked) return;
    if (!alertsEnabled(storeId)) return;
    try { if (sessionStorage.getItem(SEEN_KEY(storeId))) return; } catch {}
    let cancelled = false;
    (async () => {
      const db: any = supabase;
      const { count: total, error } = await db
        .from('comments')
        .select('id', { count: 'exact', head: true })
        .eq('store_id', storeId)
        .is('parent_id', null)
        .is('reply_content', null)
        .not('status', 'in', '(rejected,reprovado)');
      if (cancelled || error || !total) return;
      try { sessionStorage.setItem(SEEN_KEY(storeId), '1'); } catch {}
      setCount(total);
      setDontShow(false);
      setOpen(true);
    })();
    return () => { cancelled = true; };
  }, [storeId, blocked]);

  if (!open || !storeId) return null;

  const close = (goReply: boolean) => {
    if (dontShow) setAlertsEnabled(storeId, false);
    setOpen(false);
    if (!goReply) return;
    if (pathname.startsWith('/dashboard/modules/vidlytics')) {
      window.dispatchEvent(new CustomEvent('vidlytics:goto-tab', { detail: 'comentarios' }));
    } else {
      try { sessionStorage.setItem('sll_pending_tab', 'comentarios'); } catch {}
      navigate('/dashboard/modules/vidlytics');
    }
  };

  const plural = count > 1;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4"
      onClick={() => close(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="w-11 h-11 rounded-xl bg-[#e6f4fd] text-[#0094eb] flex items-center justify-center">
            <MessageSquare className="w-5 h-5" />
          </div>
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => close(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <h3 className="mt-4 text-lg font-bold text-slate-800">
          Você tem {plural ? `${count} comentários não respondidos` : 'um comentário não respondido'}
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Responder rápido mostra atenção ao cliente e ajuda a converter mais vendas.
        </p>
        <label className="mt-4 flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={dontShow}
            onChange={(e) => setDontShow(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 accent-[#0094eb]"
          />
          Não receber mais alertas
        </label>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={() => close(true)}
            className="flex-1 rounded-xl bg-[#0094eb] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#0082d0] transition-colors"
          >
            Responder
          </button>
          <button
            type="button"
            onClick={() => close(false)}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Agora não
          </button>
        </div>
      </div>
    </div>
  );
}

export function CommentAlertsCard() {
  const { storeId } = useLoja();
  const [on, setOn] = useState(true);

  useEffect(() => {
    if (!storeId) return;
    const sync = () => setOn(alertsEnabled(storeId));
    sync();
    window.addEventListener(CHANGED_EVENT, sync);
    return () => window.removeEventListener(CHANGED_EVENT, sync);
  }, [storeId]);

  const toggle = () => {
    if (!storeId) return;
    const next = !on;
    setOn(next);
    setAlertsEnabled(storeId, next);
    toast.success(next ? 'Alertas de comentários ativados' : 'Alertas de comentários desativados');
  };

  return (
    <div className="lg:col-span-6 bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0094eb] flex items-center justify-center shrink-0">
          <Bell size={18} />
        </div>
        <div>
          <h3 className="text-xs font-bold text-slate-800 tracking-wider uppercase">
            Alertas de Comentários
          </h3>
          <p className="text-[11px] text-slate-400">Lembrete de comentários sem resposta</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-50">
        <div>
          <p className="text-xs font-semibold text-slate-700">
            {on ? 'Alertas ativados' : 'Alertas desativados'}
          </p>
          <p className="text-[10px] text-slate-400">
            {on ? 'Aviso ao entrar no sistema' : 'Você não será lembrado'}
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={on}
          onClick={toggle}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            on ? 'bg-[#0094eb]' : 'bg-slate-200'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
              on ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </div>
  );
}
