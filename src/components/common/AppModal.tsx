import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AlertTriangle, Save, X } from "lucide-react";

/*
 * PADRAO DE MODAL DO SLL HUB
 * Fundo desfocado, cartao branco arredondado, titulo em caixa alta com X,
 * icone central, caixa de aviso e botoes em pilula.
 * Funciona tambem dentro de outros modais (Radix aninhado).
 */

const btnCancel =
  "flex-1 cursor-pointer rounded-2xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50";
const btnMain =
  "flex-1 cursor-pointer rounded-2xl bg-[#0088ff] px-5 py-2.5 text-xs font-bold text-white shadow-sm shadow-sky-200 transition hover:bg-[#0077e6] disabled:opacity-50";

interface ShellProps {
  open: boolean;
  title: string;
  onClose: () => void;
  busy?: boolean;
  children: React.ReactNode;
  footer: React.ReactNode;
  onOpenAutoFocus?: (e: Event) => void;
}

export function AppModal({ open, title, onClose, busy = false, children, footer, onOpenAutoFocus }: ShellProps) {
  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(v) => {
        if (!v && !busy) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onOpenAutoFocus={onOpenAutoFocus}
          className="fixed left-1/2 top-1/2 z-[100] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <div className="flex items-center justify-between px-7 pb-2 pt-6">
            <DialogPrimitive.Title className="text-sm font-extrabold uppercase tracking-wider text-slate-900">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              disabled={busy}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>
          <div className="flex flex-col items-center px-7 py-5">{children}</div>
          <div className="flex items-center justify-center gap-3 px-7 pb-6 pt-2">{footer}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function WarnBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full items-start gap-3 rounded-2xl border border-amber-200/60 bg-amber-50/50 p-4">
      <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
      <p className="text-xs font-medium leading-relaxed text-amber-900">{children}</p>
    </div>
  );
}

interface ConfirmDangerProps {
  open: boolean;
  title?: string;
  itemName: string;
  confirmLabel?: string;
  busy?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ConfirmDangerModal({
  open,
  title = "EXCLUIR ITEM",
  itemName,
  confirmLabel = "Excluir",
  busy = false,
  onClose,
  onConfirm,
}: ConfirmDangerProps) {
  return (
    <AppModal
      open={open}
      title={title}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={busy} className={btnCancel}>
            Cancelar
          </button>
          <button type="button" onClick={onConfirm} disabled={busy} className={btnMain}>
            {busy ? "Excluindo..." : confirmLabel}
          </button>
        </>
      }
    >
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-amber-200/80 bg-amber-50/40">
        <AlertTriangle className="h-9 w-9 stroke-[1.75] text-amber-500" />
      </div>
      <WarnBanner>
        Esta ação é irreversível. O item <strong className="font-bold text-amber-950">"{itemName}"</strong> será removido
        permanentemente.
      </WarnBanner>
    </AppModal>
  );
}

interface PromptNameProps {
  open: boolean;
  title: string;
  message: string;
  label?: string;
  placeholder?: string;
  value: string;
  error?: string;
  busy?: boolean;
  confirmLabel?: string;
  onChange: (v: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export function PromptNameModal({
  open,
  title,
  message,
  label = "Nome",
  placeholder,
  value,
  error,
  busy = false,
  confirmLabel = "Salvar",
  onChange,
  onConfirm,
  onClose,
}: PromptNameProps) {
  const ref = React.useRef<HTMLInputElement>(null);
  return (
    <AppModal
      open={open}
      title={title}
      onClose={onClose}
      busy={busy}
      onOpenAutoFocus={(e) => {
        e.preventDefault();
        ref.current?.focus();
        ref.current?.select();
      }}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={busy} className={btnCancel}>
            Cancelar
          </button>
          <button type="button" onClick={onConfirm} disabled={busy} className={btnMain}>
            {busy ? "Salvando..." : confirmLabel}
          </button>
        </>
      }
    >
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-sky-200/80 bg-sky-50/40">
        <Save className="h-9 w-9 stroke-[1.75] text-[#0088ff]" />
      </div>
      <WarnBanner>{message}</WarnBanner>
      <div className="mt-4 w-full space-y-1.5">
        <label className="text-xs font-bold text-slate-600">{label}</label>
        <input
          ref={ref}
          value={value}
          disabled={busy}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onConfirm();
          }}
          className="h-10 w-full rounded-2xl border border-slate-200 px-4 text-sm text-slate-800 outline-none transition focus:border-[#0088ff] focus:ring-2 focus:ring-sky-100"
        />
        {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
      </div>
    </AppModal>
  );
}

export default AppModal;