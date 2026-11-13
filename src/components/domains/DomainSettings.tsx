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

const URL_KEYS = ["store_url", "url", "website", "site_url", "shop_url", "primary_domain", "custom_domain", "store_domain", "domain"];

function toHost(raw: string): string {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split(/[/?#]/)[0]
    .replace(/:\d+$/, "");
}

async function loadRootDomain(storeId: string): Promise<string> {
  for (const col of ["id", "store_id"]) {
    try {
      const { data, error } = await supabase.from("stores").select("*").eq(col, storeId).limit(1).maybeSingle();
      if (error || !data) continue;
      const row = data as Record<string, unknown>;
      for (const k of URL_KEYS) {
        const h = toHost(String(row[k] ?? ""));
        if (h && h.includes(".")) return h;
      }
    } catch {
      /* tenta a proxima coluna */
    }
  }
  return "";
}

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
  const [root, setRoot] = useState("");
  const [fullMode, setFullMode] = useState(false);

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

  useEffect(() => {
    let alive = true;
    loadRootDomain(storeId).then((h) => alive && setRoot(h));
    return () => {
      alive = false;
    };
  }, [storeId]);

  const useSub = !!root && !fullMode;

  let sub = toHost(input);
  if (useSub && sub.endsWith("." + root)) sub = sub.slice(0, -(root.length + 1));
  sub = sub.replace(/[^a-z0-9-]/g, "").replace(/^-+|-+$/g, "");

  const full = useSub ? (sub ? `${sub}.${root}` : "") : toHost(input);
  const valid = useSub ? sub.length > 0 : /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(full);

  const add = async () => {
    if (!valid || busy) return;
    await run({ action: "add", domain: full });
    setInput("");
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold">Meu domínio</h2>
        <p className="text-sm text-muted-foreground">
          {useSub
            ? `Digite só o subdomínio. Ele fica dentro do domínio da sua loja (${root}).`
            : "Publique suas páginas no seu próprio domínio ou subdomínio."}
        </p>
      </div>

      <div className="flex gap-2 items-center">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={useSub ? "black" : "promo.minhaloja.com.br"}
        />
        {useSub && <span className="text-sm text-muted-foreground whitespace-nowrap">.{root}</span>}
        <Button type="button" disabled={busy || !valid} onClick={add}>
          Adicionar
        </Button>
      </div>

      {useSub && full && (
        <p className="text-xs text-muted-foreground">
          Suas páginas do Builder ficarão em <span className="font-mono">{full}/nome-da-pagina</span>
        </p>
      )}

      {root && (
        <button
          type="button"
          className="text-xs text-muted-foreground underline"
          onClick={() => {
            setFullMode((v) => !v);
            setInput("");
          }}
        >
          {fullMode ? `Voltar a usar ${root}` : "Usar outro domínio"}
        </button>
      )}

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