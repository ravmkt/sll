import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import { AffiliateDatabaseService } from '@/services/AffiliateDatabaseService';
import { showError, showSuccess } from '@/utils/toast';
import { ClubeRulesContent } from './ClubeRulesContent';
import { TERMS_VERSION, type ClubeSettings } from './clubeTerms';

type Props = {
  open: boolean;
  storeId: string;
  settings: ClubeSettings;
  onClose: () => void;
  onAccepted: () => void;
};

export function ClubeTermsModal({ open, storeId, settings, onClose, onAccepted }: Props) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [readAll, setReadAll] = useState(false);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);

  const check = () => {
    const el = bodyRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 16) setReadAll(true);
  };

  useEffect(() => {
    if (!open) return;
    setReadAll(false);
    setChecked(false);
    const t = window.setTimeout(check, 80);
    return () => window.clearTimeout(t);
  }, [open]);

  if (!open) return null;

  const accept = async () => {
    setBusy(true);
    try {
      await AffiliateDatabaseService.acceptTerms(storeId, TERMS_VERSION);
      showSuccess('Regras aceitas! Seu link de indicação está ativo.');
      onAccepted();
    } catch (e) {
      console.error(e);
      showError('Não foi possível registrar o aceite. Tente novamente.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Regras do Clube SLL">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl dark:bg-[#111524]">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5 dark:border-slate-800">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fd8539]/15">
              <ShieldCheck className="h-5 w-5 text-[#fd8539]" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">Regras do Clube SLL</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Leia até o final e aceite para ativar o seu link de indicação.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="cursor-pointer p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div ref={bodyRef} onScroll={check} className="flex-1 overflow-y-auto p-5">
          <ClubeRulesContent settings={settings} />
        </div>

        <div className="space-y-3 border-t border-slate-100 p-5 dark:border-slate-800">
          {!readAll && <p className="text-xs font-semibold text-[#fd8539]">Role até o final para liberar o aceite.</p>}
          <label className={`flex items-start gap-2 text-sm ${readAll ? 'cursor-pointer text-slate-700 dark:text-slate-200' : 'cursor-not-allowed text-slate-400'}`}>
            <input
              type="checkbox"
              disabled={!readAll}
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#0094eb]"
            />
            <span>Li e aceito as regras do Clube SLL.</span>
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" disabled={busy} onClick={onClose} className="cursor-pointer rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white">
              Agora não
            </button>
            <button
              type="button"
              disabled={!checked || busy}
              onClick={accept}
              className="cursor-pointer rounded-xl bg-[#0094eb] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#007fcc] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? 'Registrando...' : 'Aceitar e ativar meu link'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}