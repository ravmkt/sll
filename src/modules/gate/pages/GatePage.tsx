import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRightLeft, Code2, Copy, ExternalLink, Eye, Loader2, MessageCircle, Pencil, Plus, ShieldCheck, Trash2,
} from "lucide-react";
import { useLoja } from "@/contexts/LojaContext";
import { Gate, createGate, deleteGate, gateSummary, listGates, updateGate } from "../services/gates";
import { refreshStoreScript } from "../services/storeScript";
import { BuilderPageOption, listPublishedPages } from "../services/builderPages";
import StoreScriptCard from "../components/StoreScriptCard";

type Form = {
  id?: string;
  name: string;
  domains: string;
  landing_id: string | null;
  gate_url: string;
  starts_at: string;
  ends_at: string;
  whatsapp_url: string;
  enabled: boolean;
  exclude_bots: boolean;
  preserve_params: boolean;
  bypass_param: string;
};

const CUSTOM = "__custom";
const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-[#0094eb] focus:ring-2 focus:ring-[#0094eb]/20";
const btnPrimary =
  "inline-flex items-center gap-1.5 rounded-xl bg-[#0094eb] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#0083d1] disabled:opacity-60";
const btnOutline =
  "inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60";
const card = "rounded-2xl border border-slate-100 bg-white p-5 shadow-sm";

const toLocal = (iso: string) => {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const emptyForm = (domain: string): Form => ({
  name: "",
  domains: domain,
  landing_id: null,
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
  if (!g.enabled) return { label: "Desativada", cls: "bg-slate-100 text-slate-500" };
  if (now < new Date(g.starts_at).getTime()) return { label: "Agendada", cls: "bg-amber-50 text-amber-700" };
  if (now >= new Date(g.ends_at).getTime()) return { label: "Encerrada", cls: "bg-slate-200 text-slate-600" };
  return { label: "No ar", cls: "bg-emerald-50 text-emerald-700" };
}

function CardTitle({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0094eb]/10">
        <Icon className="h-4 w-4 text-[#0094eb]" />
      </div>
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">{children}</h3>
    </div>
  );
}

function Metric({ label, value, icon: Icon, tone }: { label: string; value: number; icon: React.ElementType; tone: string }) {
  return (
    <div className={`${card} flex items-center justify-between`}>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
        <p className="mt-1 text-3xl font-extrabold text-slate-900">{value.toLocaleString("pt-BR")}</p>
        <p className="text-[11px] text-slate-400">Últimos 7 dias</p>
      </div>
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${tone}`}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  );
}

export default function GatePage() {
  const { store } = useLoja();
  const storeId = store?.id;
  const [gates, setGates] = useState<Gate[]>([]);
  const [pages, setPages] = useState<BuilderPageOption[]>([]);
  const [pagesError, setPagesError] = useState("");
  const [stats, setStats] = useState<Record<string, Record<string, number>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<Form | null>(null);
  const [copied, setCopied] = useState(false);

  const snippet = `<script src="${window.location.origin}/sll-gate.js"></script>`;

  const storeHost = () => {
    const s = store as unknown as Record<string, unknown> | null;
    const raw = String(s?.url ?? s?.store_url ?? "");
    try {
      return new URL(raw).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  };

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
    }
    try {
      setPages(await listPublishedPages(storeId));
      setPagesError("");
    } catch (e) {
      setPagesError(e instanceof Error ? e.message : "Não foi possível listar as páginas do Builder");
    }
    setLoading(false);
  }, [storeId]);

  useEffect(() => {
    load();
  }, [load]);

  const edit = (g: Gate) =>
    setForm({
      id: g.id,
      name: g.name,
      domains: g.domains.filter((d) => !d.startsWith("www.")).join(", "),
      landing_id: g.landing_id ?? null,
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
      return setError("Escolha uma página do Builder ou informe a URL de destino com https://");
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
        landing_id: form.landing_id,
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
      void refreshStoreScript(storeId);
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
      void refreshStoreScript(storeId!);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    }
  };

  const remove = async (g: Gate) => {
    if (!window.confirm(`Excluir a campanha "${g.name}"?`)) return;
    try {
      await deleteGate(g.id);
      void refreshStoreScript(storeId!);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    }
  };

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  const pickPage = (v: string) => {
    if (v === CUSTOM) return set("landing_id", null);
    const p = pages.find((x) => x.id === v);
    if (p) setForm((f) => (f ? { ...f, landing_id: p.id, gate_url: p.url } : f));
  };

  if (!storeId || loading) {
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  const sum = (k: string) => Object.values(stats).reduce((a, s) => a + (s[k] ?? 0), 0);
  const live = gates.filter((g) => status(g).label === "No ar").length;
  const selected = form && pages.some((p) => p.id === form.landing_id) ? form.landing_id! : CUSTOM;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <div className="mx-auto w-full max-w-7xl space-y-6 p-6">
        <div className={`${card} flex flex-wrap items-center justify-between gap-4`}>
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0094eb]/10">
              <ShieldCheck className="h-7 w-7 text-[#0094eb]" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Gate</h1>
              <p className="text-sm text-slate-500">
                Bloqueia toda a loja e leva os visitantes para uma página de campanha até a data final.
              </p>
            </div>
          </div>
          {!form && (
            <button className={btnPrimary} onClick={() => setForm(emptyForm(storeHost()))}>
              <Plus className="h-4 w-4" /> Nova campanha
            </button>
          )}
        </div>

        {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Metric label="Campanhas no ar" value={live} icon={ShieldCheck} tone="bg-emerald-50 text-emerald-600" />
          <Metric label="Redirecionados" value={sum("redirect")} icon={ArrowRightLeft} tone="bg-sky-50 text-[#0094eb]" />
          <Metric label="Views da campanha" value={sum("view")} icon={Eye} tone="bg-violet-50 text-violet-600" />
          <Metric label="Cliques WhatsApp" value={sum("whatsapp_click")} icon={MessageCircle} tone="bg-amber-50 text-amber-600" />
        </div>

        {form && (
          <div className={`${card} space-y-5`}>
            <CardTitle icon={form.id ? Pencil : Plus}>{form.id ? "Editar campanha" : "Nova campanha"}</CardTitle>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-xs font-semibold text-slate-600">
                <span>Nome</span>
                <input className={inputCls} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Black Friday" />
              </label>
              <label className="space-y-1 text-xs font-semibold text-slate-600">
                <span>Domínios da loja (separados por vírgula)</span>
                <input className={inputCls} value={form.domains} onChange={(e) => set("domains", e.target.value)} placeholder="useanny.com" />
              </label>

              <div className="space-y-1 text-xs font-semibold text-slate-600 md:col-span-2">
                <span>Página de destino</span>
                <select className={inputCls} value={selected} onChange={(e) => pickPage(e.target.value)}>
                  <option value={CUSTOM}>Outra URL (colar manualmente)</option>
                  {pages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} · {p.type === "landing" ? "Landing" : "Produto"} · {p.url.replace("https://", "")}
                    </option>
                  ))}
                </select>
                {selected === CUSTOM ? (
                  <input
                    className={inputCls}
                    value={form.gate_url}
                    onChange={(e) => set("gate_url", e.target.value)}
                    placeholder="https://black.useanny.com/black"
                  />
                ) : (
                  <a href={form.gate_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#0094eb] hover:underline">
                    {form.gate_url} <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {pagesError ? (
                  <p className="font-normal text-rose-600">Não foi possível listar as páginas do Builder: {pagesError}</p>
                ) : pages.length === 0 ? (
                  <p className="font-normal text-slate-500">
                    Nenhuma página publicada no Builder.{" "}
                    <Link to="/dashboard/modules/builder" className="font-semibold text-[#0094eb] hover:underline">
                      Criar página
                    </Link>
                  </p>
                ) : (
                  <p className="font-normal text-slate-400">Só aparecem páginas publicadas.</p>
                )}
              </div>

              <label className="space-y-1 text-xs font-semibold text-slate-600">
                <span>Início</span>
                <input type="datetime-local" className={inputCls} value={form.starts_at} onChange={(e) => set("starts_at", e.target.value)} />
              </label>
              <label className="space-y-1 text-xs font-semibold text-slate-600">
                <span>Fim</span>
                <input type="datetime-local" className={inputCls} value={form.ends_at} onChange={(e) => set("ends_at", e.target.value)} />
              </label>
              <label className="space-y-1 text-xs font-semibold text-slate-600">
                <span>WhatsApp (opcional)</span>
                <input className={inputCls} value={form.whatsapp_url} onChange={(e) => set("whatsapp_url", e.target.value)} placeholder="https://wa.me/55..." />
              </label>
              <label className="space-y-1 text-xs font-semibold text-slate-600">
                <span>Parâmetro de bypass</span>
                <input className={inputCls} value={form.bypass_param} onChange={(e) => set("bypass_param", e.target.value)} />
              </label>
            </div>
            <div className="flex flex-wrap gap-6 text-xs text-slate-600">
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
              <button className={btnPrimary} onClick={save} disabled={saving}>
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Salvar
              </button>
              <button className={btnOutline} onClick={() => { setForm(null); setError(""); }}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <CardTitle icon={ShieldCheck}>Campanhas</CardTitle>
          {gates.length === 0 && !form && (
            <div className={`${card} text-sm text-slate-500`}>Nenhuma campanha criada.</div>
          )}
          {gates.map((g) => {
            const st = status(g);
            const s = stats[g.id] ?? {};
            return (
              <div key={g.id} className={`${card} space-y-4`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">{g.name}</h3>
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${st.cls}`}>{st.label}</span>
                    </div>
                    <p className="mt-1 truncate text-sm text-slate-600">
                      {g.domains.filter((d) => !d.startsWith("www.")).join(", ")} → {g.gate_url}
                    </p>
                    <p className="text-xs text-slate-400">
                      {fmt(g.starts_at)} até {fmt(g.ends_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button className={btnOutline} onClick={() => toggle(g)}>
                      {g.enabled ? "Desativar" : "Ativar"}
                    </button>
                    <button onClick={() => edit(g)} aria-label="Editar" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => remove(g)} aria-label="Excluir" className="rounded-xl p-2 text-rose-500 hover:bg-rose-50">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-center md:grid-cols-4">
                  {[
                    ["Redirecionados", s.redirect],
                    ["Views", s.view],
                    ["Bypass", s.bypass],
                    ["Cliques WhatsApp", s.whatsapp_click],
                  ].map(([label, v]) => (
                    <div key={label as string} className="rounded-xl bg-slate-50 p-3">
                      <div className="text-xl font-extrabold text-slate-900">{(v as number) ?? 0}</div>
                      <div className="text-[11px] text-slate-500">{label} (7 dias)</div>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400">
                  Ver a loja normal: <code className="rounded bg-slate-100 px-1">?{g.bypass_param}=1</code> no final da URL.
                </p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <StoreScriptCard storeId={storeId} />
          <div className={`${card} space-y-4`}>
            <CardTitle icon={Code2}>Instalação via GTM</CardTitle>
            <p className="text-xs text-slate-500">
              Crie uma tag <strong>HTML personalizada</strong> com o código abaixo e use o acionador{" "}
              <strong>Initialization - All Pages</strong>. Só use se não estiver com a instalação automática.
            </p>
            <code className="block break-all rounded-xl bg-slate-50 p-3 text-xs text-slate-700">{snippet}</code>
            <button
              className={btnOutline}
              onClick={() => {
                navigator.clipboard.writeText(snippet);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              <Copy className="h-3.5 w-3.5" /> {copied ? "Copiado" : "Copiar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}