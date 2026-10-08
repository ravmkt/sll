import { useState } from 'react';
import { Loader2, Mail, MessageCircle } from 'lucide-react';
import type { StoreStatus } from '@/services/admin/storesService';

export const CARD = 'rounded-2xl border border-white/10 bg-[#111524] p-4';
export const ICON = 'text-[#fd8539]';
export const INPUT = 'w-full rounded-xl border border-white/10 bg-[#0b0f1c] px-3 py-2 text-xs text-white outline-none focus:border-[#fd8539]';

export const STATUS_LABEL: Record<StoreStatus, string> = {
  active: 'Ativa', trial: 'Em trial', past_due: 'Inadimplente', inactive: 'Inativa',
};
export const STATUS_STYLE: Record<StoreStatus, string> = {
  active: 'bg-emerald-500/15 text-emerald-300',
  trial: 'bg-sky-500/15 text-sky-300',
  past_due: 'bg-rose-500/15 text-rose-300',
  inactive: 'bg-slate-500/15 text-slate-300',
};

export const MODULE_LABEL: Record<string, string> = {
  vidlytics: 'Vidlytics', live_commerce: 'Live Commerce', gamification: 'Gamificação', reviews: 'Avaliações',
};
export const modLabel = (k: string) => MODULE_LABEL[k] || k;

export const brl = (cents: number) => ((cents || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const dt = (v?: string | null) => (v ? new Date(v).toLocaleDateString('pt-BR') : '—');
export const dtt = (v?: string | null) => (v ? new Date(v).toLocaleString('pt-BR') : '—');
export const mb = (b?: number | null) => `${((b || 0) / 1024 / 1024).toFixed(1)} MB`;
export const digits = (v?: string | null) => (v || '').replace(/\D/g, '');

export function Badge({ status }: { status: StoreStatus }) {
  return <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${STATUS_STYLE[status]}`}>{STATUS_LABEL[status]}</span>;
}

export function ContactButtons({ whatsapp, email, size = 16 }: { whatsapp?: string | null; email?: string | null; size?: number }) {
  const wa = digits(whatsapp);
  const waFull = wa.length <= 11 ? `55${wa}` : wa;
  return (
    <div className="flex items-center gap-1">
      {wa ? (
        <a href={`https://wa.me/${waFull}`} target="_blank" rel="noreferrer" title="WhatsApp" className="rounded-lg p-1.5 hover:bg-white/10">
          <MessageCircle size={size} className={ICON} />
        </a>
      ) : (
        <span title="Sem WhatsApp" className="p-1.5"><MessageCircle size={size} className="text-slate-700" /></span>
      )}
      {email ? (
        <a href={`mailto:${email}`} title={email} className="rounded-lg p-1.5 hover:bg-white/10">
          <Mail size={size} className={ICON} />
        </a>
      ) : (
        <span title="Sem e-mail" className="p-1.5"><Mail size={size} className="text-slate-700" /></span>
      )}
    </div>
  );
}

export function DeleteStoreModal({ name, busy, onCancel, onConfirm }: { name: string; busy: boolean; onCancel: () => void; onConfirm: () => void }) {
  const [txt, setTxt] = useState('');
  const ok = txt.trim().toLowerCase() === name.trim().toLowerCase();
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={onCancel}>
      <div className="w-full max-w-md space-y-3 rounded-2xl border border-rose-500/30 bg-[#0b0f1c] p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-black text-white">Excluir loja</h3>
        <p className="text-xs leading-relaxed text-slate-400">
          Isso apaga a loja e os dados ligados a ela. Não tem volta. Digite <b className="text-white">{name}</b> para confirmar.
        </p>
        <input value={txt} onChange={(e) => setTxt(e.target.value)} className={INPUT} autoFocus />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-lg px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/10">Cancelar</button>
          <button type="button" disabled={!ok || busy} onClick={onConfirm} className="flex items-center gap-2 rounded-lg bg-rose-500/20 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/30 disabled:opacity-40">
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Excluir definitivamente
          </button>
        </div>
      </div>
    </div>
  );
}