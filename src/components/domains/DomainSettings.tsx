import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, Trash2 } from "lucide-react";

type DomainInfo = {
  domain: string;
  status: "pending" | "verified";
  configured: boolean;
  apex: boolean;
  cname: string;
  ipv4: string;
  verification: { type: string; domain: string; value: string }[];
};

async function callApi(body: Record<string, unknown>): Promise<DomainInfo[]> {
  const { data } = await supabase.auth.getSession();
  const r = await fetch("/api/domains", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token}` },
    body: JSON.stringify(body),
  });
  const json = await r.json();
  if (!r.ok) throw new Error(json.error || "Erro ao processar");
  return json.domains;
}

export default function DomainSettings({ storeId }: { storeId: string }) {
  const [domains, setDomains] = useState<DomainInfo[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const run = useCallback(
    async (body: Record<string, unknown>) => {
      setBusy(true);
      setError("");
      try {
        setDomains(await callApi({ store_id: storeId, ...body }));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro");
      } finally {
        setBusy(false);
      }
    },
    [storeId]
  );

  useEffect(() => {
    run({ action: "list" });
  }, [run]);

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold">Meu domínio</h2>
        <p className="text-sm text-muted-foreground">Publique suas páginas no seu próprio domínio ou subdomínio.</p>
      </div>

      <form
        className="flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          await run({ action: "add", domain: input });
          setInput("");
        }}
      >
        <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="promo.minhaloja.com.br" />
        <Button type="submit" disabled={busy || !input.trim()}>Adicionar</Button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {domains.map((d) => (
        <div key={d.domain} className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-medium">
              {d.configured ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              )}
              {d.domain}
              <span className="text-xs text-muted-foreground">{d.configured ? "Ativo" : "Aguardando DNS"}</span>
            </div>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" disabled={busy} onClick={() => run({ action: "list" })}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => confirm(`Remover ${d.domain}?`) && run({ action: "remove", domain: d.domain })}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {!d.configured && (
            <div className="text-sm space-y-2">
              <p>Crie este registro no provedor do seu domínio (Registro.br, Cloudflare etc.):</p>
              <table className="w-full text-left text-xs border rounded">
                <thead className="bg-muted">
                  <tr><th className="p-2">Tipo</th><th className="p-2">Nome</th><th className="p-2">Valor</th></tr>
                </thead>
                <tbody>
                  {d.apex ? (
                    <tr><td className="p-2">A</td><td className="p-2">@</td><td className="p-2 font-mono">{d.ipv4}</td></tr>
                  ) : (
                    <tr>
                      <td className="p-2">CNAME</td>
                      <td className="p-2 font-mono">{d.domain.split(".")[0]}</td>
                      <td className="p-2 font-mono break-all">{d.cname}</td>
                    </tr>
                  )}
                  {d.verification.map((v) => (
                    <tr key={v.value}>
                      <td className="p-2">{v.type}</td>
                      <td className="p-2 font-mono">{v.domain}</td>
                      <td className="p-2 font-mono break-all">{v.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-muted-foreground">
                Se usar Cloudflare, deixe o proxy desligado. Depois de criar, clique em atualizar. Pode levar até 1 hora.
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
