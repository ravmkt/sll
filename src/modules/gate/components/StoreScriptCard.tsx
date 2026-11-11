import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, RefreshCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    if (action === "uninstall" && !window.confirm("Remover o script da loja? O Gate deixará de funcionar.")) return;
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
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Instalação automática</h2>
          <p className="text-sm text-muted-foreground">
            Instala o script do Gate na loja sem precisar mexer no GTM ou no tema.
          </p>
        </div>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : installed ? (
          <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
            <CheckCircle2 className="h-3.5 w-3.5" /> Instalado
          </span>
        ) : (
          <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            <XCircle className="h-3.5 w-3.5" /> Não instalado
          </span>
        )}
      </div>

      {error && <p className="rounded-md bg-rose-50 p-2 text-sm text-rose-700">{error}</p>}

      {!loading && (
        <>
          {installed && state?.updated_at && (
            <p className="text-xs text-muted-foreground">
              Última atualização: {new Date(state.updated_at).toLocaleString("pt-BR")}
              {state.gate === false ? " · nenhuma campanha ativa no script" : ""}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {!installed ? (
              <Button size="sm" onClick={() => run("install")} disabled={busy !== null}>
                {busy === "install" && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Instalar na loja
              </Button>
            ) : (
              <>
                <Button size="sm" variant="outline" onClick={() => run("refresh")} disabled={busy !== null}>
                  {busy === "refresh" ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-1 h-4 w-4" />
                  )}
                  Atualizar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => run("uninstall")} disabled={busy !== null}>
                  {busy === "uninstall" && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Remover
                </Button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}