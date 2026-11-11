import { useCallback, useEffect, useState } from "react";
import { Copy, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useLoja } from "@/contexts/LojaContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gate, createGate, deleteGate, gateSummary, listGates, updateGate } from "../services/gates";

type Form = {
  id?: string;
  name: string;
  domains: string;
  gate_url: string;
  starts_at: string;
  ends_at: string;
  whatsapp_url: string;
  enabled: boolean;
  exclude_bots: boolean;
  preserve_params: boolean;
  bypass_param: string;
};

const toLocal = (iso: string) => {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const emptyForm = (): Form => ({
  name: "",
  domains: "",
  gate_url: "",
  starts_at: toLocal(new Date().toISOString()),
  ends_at: toLocal(new Date(Date.now() + 7 * 86400000).toISOString()),
  whatsapp_url: "",
  enabled: false,
  exclude_bots: true,
  preserve_params: true,
  bypass_param: "sll_bypass",
});

const parseDomains = (s: string) => {
  const base = Array.from(
    new Set(
      s
        .split(/[\s,;]+/)
        .map((x) => x.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, ""))
        .filter(Boolean)
    )
  );
  return base.flatMap((d) => [d, `www.${d}`]);
};

const fmt = (iso: string) => new Date(iso).toLocaleString("pt-BR");

function status(g: Gate) {
  const now = Date.now();
  if (!g.enabled) return { label: "Desativada", cls: "bg-muted text-muted-foreground" };
  if (now < new Date(g.starts_at).getTime()) return { label: "Agendada", cls: "bg-amber-100 text-amber-800" };
  if (now >= new Date(g.ends_at).getTime()) return { label: "Encerrada", cls: "bg-slate-200 text-slate-700" };
  return { label: "No ar", cls: "bg-emerald-100 text-emerald-800" };
}

export default function GatePage() {
  const { store } = useLoja();
  const storeId = store?.id;
  const [gates, setGates] = useState<Gate[]>([]);
  const [stats, setStats] = useState<Record<string, Record<string, number>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<Form | null>(null);
  const [copied, setCopied] = useState(false);

  const snippet = `<script async src="${window.location.origin}/sll-gate.js"></script>`;

  const load = useCallback(async () => {
    if (!storeId) return;
    try {
      const list = await listGates(storeId);
      setGates(list);
      const entries = await Promise.all(
        list.map(async (g) => [g.id, await gateSummary(g.id, 7).catch(() => ({}))] as const)
      );
      setStats(Object.fromEntries(entries));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    load();
  }, [load]);

  const edit = (g: Gate) =>
    setForm({
      id: g.id,
      name: g.name,
      domains: g.domains.filter((d) => !d.startsWith("www.")).join(", "),
      gate_url: g.gate_url,
      starts_at: toLocal(g.starts_at),
      ends_at: toLocal(g.ends_at),
      whatsapp_url: g.whatsapp_url ?? "",
      enabled: g.enabled,
      exclude_bots: g.exclude_bots,
      preserve_params: g.preserve_params,
      bypass_param: g.bypass_param,
    });

  const save = async () => {
    if (!form || !storeId) return;
    const domains = parseDomains(form.domains);
    const starts = new Date(form.starts_at);
    const ends = new Date(form.ends_at);
    let target: URL;
    try {
      target = new URL(form.gate_url);
    } catch {
      return setError("Informe a página de destino com https://");
    }
    if (!form.name.trim()) return setError("Informe o nome da campanha");
    if (domains.length === 0) return setError("Informe ao menos um domínio da loja");
    if (target.protocol !== "https:") return setError("A página de destino deve usar https");
    if (domains.includes(target.hostname.toLowerCase())) return setError("O destino não pode estar no mesmo domínio da loja (gera loop)");
    if (isNaN(starts.getTime()) || isNaN(ends.getTime()) || ends <= starts) return setError("O fim deve ser depois do início");

    setSaving(true);
    setError("");
    try {
      const payload = {
        name: form.name.trim(),
        domains,
        gate_url: target.toString(),
        starts_at: starts.toISOString(),
        ends_at: ends.toISOString(),
        whatsapp_url: form.whatsapp_url.trim() || null,
        enabled: form.enabled,
        exclude_bots: form.exclude_bots,
        preserve_params: form.preserve_params,
        bypass_param: form.bypass_param.trim() || "sll_bypass",
      };
      if (form.id) await updateGate(form.id, payload);
      else await createGate(storeId, payload);
      setForm(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (g: Gate) => {
    try {
      await updateGate(g.id, { enabled: !g.enabled });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    }
  };

  const remove = async (g: Gate) => {
    if (!window.confirm(`Excluir a campanha "${g.name}"?`)) return;
    try {
      await deleteGate(g.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    }
  };

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  if (!storeId || loading) {
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Gate</h1>
          <p className="text-sm text-muted-foreground">
            Redireciona a home da loja para uma página de campanha durante um período.
          </p>
        </div>
        {!form && (
          <Button onClick={() => setForm(emptyForm())}>
            <Plus className="mr-1 h-4 w-4" /> Nova campanha
          </Button>
        )}
      </div>

      {error && <p className="rounded-md bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

      {form && (
        <div className="space-y-4 rounded-lg border p-4">
          <h2 className="font-semibold">{form.id ? "Editar campanha" : "Nova campanha"}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span>Nome</span>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Black Friday" />
            </label>
            <label className="space-y-1 text-sm">
              <span>Domínios da loja (separados por vírgula)</span>
              <Input value={form.domains} onChange={(e) => set("domains", e.target.value)} placeholder="useanny.com" />
            </label>
            <label className="space-y-1 text-sm md:col-span-2">
              <span>Página de destino</span>
              <Input value={form.gate_url} onChange={(e) => set("gate_url", e.target.value)} placeholder="https://black.useanny.com/" />
            </label>
            <label className="space-y-1 text-sm">
              <span>Início</span>
              <Input type="datetime-local" value={form.starts_at} onChange={(e) => set("starts_at", e.target.value)} />
            </label>
            <label className="space-y-1 text-sm">
              <span>Fim</span>
              <Input type="datetime-local" value={form.ends_at} onChange={(e) => set("ends_at", e.target.value)} />
            </label>
            <label className="space-y-1 text-sm">
              <span>WhatsApp (opcional)</span>
              <Input value={form.whatsapp_url} onChange={(e) => set("whatsapp_url", e.target.value)} placeholder="https://wa.me/55..." />
            </label>
            <label className="space-y-1 text-sm">
              <span>Parâmetro de bypass</span>
              <Input value={form.bypass_param} onChange={(e) => set("bypass_param", e.target.value)} />
            </label>
          </div>
          <div className="flex flex-wrap gap-6 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.exclude_bots} onChange={(e) => set("exclude_bots", e.target.checked)} />
              Não redirecionar buscadores/bots (protege o SEO)
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.preserve_params} onChange={(e) => set("preserve_params", e.target.checked)} />
              Preservar UTMs, gclid e fbclid
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.enabled} onChange={(e) => set("enabled", e.target.checked)} />
              Ativada
            </label>
          </div>
          <div className="flex gap-2">
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Salvar
            </Button>
            <Button variant="outline" onClick={() => { setForm(null); setError(""); }}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {gates.length === 0 && !form && (
          <p className="text-sm text-muted-foreground">Nenhuma campanha criada.</p>
        )}
        {gates.map((g) => {
          const st = status(g);
          const s = stats[g.id] ?? {};
          return (
            <div key={g.id} className="space-y-3 rounded-lg border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{g.name}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${st.cls}`}>{st.label}</span>
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {g.domains.filter((d) => !d.startsWith("www.")).join(", ")} → {g.gate_url}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {fmt(g.starts_at)} até {fmt(g.ends_at)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button size="sm" variant="outline" onClick={() => toggle(g)}>
                    {g.enabled ? "Desativar" : "Ativar"}
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => edit(g)} aria-label="Editar">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(g)} aria-label="Excluir">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center md:grid-cols-4">
                {[
                  ["Redirecionados", s.redirect],
                  ["Views", s.view],
                  ["Bypass", s.bypass],
                  ["Cliques WhatsApp", s.whatsapp_click],
                ].map(([label, v]) => (
                  <div key={label as string} className="rounded-md bg-muted/50 p-2">
                    <div className="text-lg font-semibold">{(v as number) ?? 0}</div>
                    <div className="text-xs text-muted-foreground">{label} (7 dias)</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Ver a loja normal: <code>?{g.bypass_param}=1</code> no final da URL.
              </p>
            </div>
          );
        })}
      </div>

      <div className="space-y-2 rounded-lg border p-4">
        <h2 className="font-semibold">Instalação via GTM</h2>
        <p className="text-sm text-muted-foreground">
          Crie uma tag <strong>HTML personalizada</strong> com o código abaixo. Use o acionador{" "}
          <strong>Initialization - All Pages</strong> para evitar piscar a home antes do redirecionamento.
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 overflow-x-auto rounded bg-muted p-2 text-xs">{snippet}</code>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(snippet);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            <Copy className="mr-1 h-4 w-4" /> {copied ? "Copiado" : "Copiar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
