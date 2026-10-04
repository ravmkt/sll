import type { ReactNode } from 'react';
import { X } from 'lucide-react';

export const inputCls =
  'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#111524] px-4 py-2.5 text-sm text-slate-800 dark:text-white outline-none focus:border-[#0094eb] transition';
export const primaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-[#0094eb] hover:bg-[#007bc4] px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50 cursor-pointer';
export const ghostBtn =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 transition cursor-pointer';
export const fileCls =
  'text-xs text-slate-500 dark:text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-[#0094eb] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white file:cursor-pointer';
export const labelCls = 'text-sm font-semibold text-slate-700 dark:text-slate-300';
export const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'Erro inesperado.');

export function Modal({ title, onClose, wide, children }: { title: string; onClose: () => void; wide?: boolean; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className={`w-full ${wide ? 'max-w-4xl' : 'max-w-lg'} max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-[#1a1f2c] border border-slate-200 dark:border-slate-800 shadow-2xl`}>
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 p-5">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg bg-slate-100 dark:bg-slate-800 p-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}