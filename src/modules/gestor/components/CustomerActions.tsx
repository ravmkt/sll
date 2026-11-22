import { Mail, MessageCircle, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { mailLink, whatsappLink } from '../services/contato';
import type { CustomerRow } from '../services/clientes';

const base =
  'inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors';
const on =
  'cursor-pointer hover:bg-[color:var(--sll-b-brand-soft)] hover:text-[color:var(--sll-b-brand)]';
const off = 'cursor-not-allowed opacity-40';
const danger = 'cursor-pointer hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 dark:hover:text-rose-400';

type Props = {
  row: CustomerRow;
  canEdit: boolean;
  onEdit: () => void;
  canDelete?: boolean;
  onDelete?: () => void;
};

export default function CustomerActions({ row, canEdit, onEdit, canDelete, onDelete }: Props) {
  const wa = whatsappLink(row.phone);
  const mail = mailLink(row.email);
  const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();

  return (
    <div className="flex items-center justify-center gap-1" onClick={stop}>
      {canEdit && (
        <button type="button" title="Editar cliente" aria-label="Editar cliente" onClick={(e) => { stop(e); onEdit(); }} className={cn(base, on)}>
          <Pencil size={16} />
        </button>
      )}
      {wa ? (
        <a href={wa} target="_blank" rel="noopener noreferrer" title="Enviar mensagem no WhatsApp" aria-label="Enviar mensagem no WhatsApp" onClick={stop} className={cn(base, on)}>
          <MessageCircle size={16} />
        </a>
      ) : (
        <span title="Cliente sem telefone válido" className={cn(base, off)}><MessageCircle size={16} /></span>
      )}
      {mail ? (
        <a href={mail} title="Enviar e-mail" aria-label="Enviar e-mail" onClick={stop} className={cn(base, on)}>
          <Mail size={16} />
        </a>
      ) : (
        <span title="Cliente sem e-mail válido" className={cn(base, off)}><Mail size={16} /></span>
      )}
      {canDelete && onDelete && (
        <button type="button" title="Excluir cliente" aria-label="Excluir cliente" onClick={(e) => { stop(e); onDelete(); }} className={cn(base, danger)}>
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
}