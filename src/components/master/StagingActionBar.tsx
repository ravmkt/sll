import { Eye, FlaskConical, Loader2, Rocket, Undo2, X } from 'lucide-react';
import type { StagingApi } from '@/hooks/useStagingPublish';

type Props<T extends Record<string, any>> = {
  staging: StagingApi<T>;
  /** Config atual do formulario, enviada ao clicar em "Aplicar na Loja Teste" */
  config: T;
  disabled?: boolean;
};

export default function StagingActionBar<T extends Record<string, any>>({ staging: s, config, disabled }: Props<T>) {
  const busy = s.busy !== null;
  const modified = s.status === 'modified';

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-800 bg-[#111524] p-3">
        <span
          className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${
            modified ? 'bg-amber-500/15 text-amber-400' : 'bg-emerald-500/15 text-emerald-400'
          }`}
        >
          {s.loading ? 'Carregando...' : modified ? 'Modificado em Teste' : 'Ao Vivo'}
        </span>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {modified && (
            <button type="button" disabled={busy} onClick={s.discard} className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white disabled:opacity-40">
              {s.busy === 'discard' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />} Descartar
            </button>
          )}
          <button type="button" disabled={busy || disabled} onClick={() => s.saveToTest(config)} className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-700 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40">
            {s.busy === 'save' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />} Aplicar na Loja Teste
          </button>
          <button type="button" disabled={busy} onClick={s.openSandbox} className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-700 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-white/5 disabled:opacity-40">
            <Eye className="h-4 w-4" /> Abrir Loja Teste
          </button>
          <button type="button" disabled={busy || !modified} onClick={s.requestPublish} className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#0094eb] px-4 py-2 text-xs font-bold text-white hover:bg-[#007fcc] disabled:cursor-not-allowed disabled:opacity-40">
            <Rocket className="h-4 w-4" /> Publicar ao Vivo
          </button>
        </div>
      </div>

      {s.confirmOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" onClick={() => !busy && s.cancelPublish()}>
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-slate-800 bg-[#111524] p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-bold text-white">Publicar ao vivo</h3>
              <button type="button" aria-label="Fechar" disabled={busy} onClick={s.cancelPublish} className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-slate-300">Deseja propagar essas alterações para todas as lojas ativas?</p>
            <div className="flex gap-3 border-t border-slate-800 pt-4">
              <button type="button" disabled={busy} onClick={s.cancelPublish} className="flex-1 cursor-pointer rounded-xl border border-slate-700 py-2.5 text-sm font-bold text-slate-300 hover:bg-white/5">
                Cancelar
              </button>
              <button type="button" disabled={busy} onClick={s.confirmPublish} className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#0094eb] py-2.5 text-sm font-bold text-white hover:bg-[#007fcc] disabled:opacity-50">
                {s.busy === 'publish' && <Loader2 className="h-4 w-4 animate-spin" />} Publicar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}