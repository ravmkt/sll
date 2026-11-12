import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, RefreshCw, XCircle, Zap } from "lucide-react";
import { storeScript, type StoreScriptState } from "../services/storeScript";

type Action = "install" | "refresh" | "uninstall";

export default function StoreScriptCard({ storeId }: { storeId: string }) {
  const [state, setState] = useState<StoreScriptState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<Action | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setState(await storeScript("status", storeId));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao consultar a instalação");
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const run = async (action: Action) => {
    if (action === "uninstall" && !window.confirm("Remover o script da loja? O Pulse deixará de funcionar.")) return;
    setBusy(action);
    setError("");
    try {
      setState(await storeScript(action, storeId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro na operação");
    } finally {
      setBusy(null);
    }
  };

  const installed = !!state?.installed;

  return (
    <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0094eb]/10">
            <Zap className="h-4 w-4 text-[#0094eb]" />
          </div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Instalação automática</h3>
        </div>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
        ) : installed ? (
          <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" /> Instalado
          </span>
        ) : (
          <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">
            <XCircle className="h-3.5 w-3.5" /> Não instalado
          </span>
        )}
      </div>
      <p className="text-xs text-slate-500">Instala o script do Pulse na loja sem mexer no GTM ou no tema.</p>

      {error && <p className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700">{error}</p>}

      {!loading && (
        <>
          {installed && state?.updated_at && (
            <p className="text-[11px] text-slate-400">
              Última atualização: {new Date(state.updated_at).toLocaleString("pt-BR")}
              {state.gate === false ? " · nenhuma campanha ativa no script" : ""}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {!installed ? (
              <button
                onClick={() => run("install")}
                disabled={busy !== null}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#0094eb] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#0083d1] disabled:opacity-60"
              >
                {busy === "install" && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Instalar na loja
              </button>
            ) : (
              <>
                <button
                  onClick={() => run("refresh")}
                  disabled={busy !== null}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
                >
                  {busy === "refresh" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  Atualizar
                </button>
                <button
                  onClick={() => run("uninstall")}
                  disabled={busy !== null}
                  className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-60"
                >
                  {busy === "uninstall" && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Remover
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}