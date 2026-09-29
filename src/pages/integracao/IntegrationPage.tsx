import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Copy, Store } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTenant } from "@/context/TenantContext";
import { supabase } from "@/lib/supabase";
import { getActiveSubscriptions } from "@/services/subscriptions/getStoreSubscriptions";

declare const __APP_BUILD_ID__: string;

// Mapa de módulos conhecidos do ecossistema SLL.
// Ao criar um novo módulo no futuro, basta adicionar a chave aqui.
const KNOWN_MODULES = ["vidlytics", "live_commerce", "gamification", "reviews"] as const;
type ModuleKey = (typeof KNOWN_MODULES)[number];

export const IntegrationPage = () => {
  const { storeId } = useTenant();

  const [copied, setCopied] = useState(false);
  const [copiedTracking, setCopiedTracking] = useState(false);
  const [installTab, setInstallTab] = useState<"platform" | "gtm">("platform");
  const [securityToken, setSecurityToken] = useState<string>("");
  const [activeModules, setActiveModules] = useState<ModuleKey[]>([]);
  const [loading, setLoading] = useState(true);

  const publicUrl = useMemo(() => {
    const envUrl = import.meta.env.VITE_WIDGET_PUBLIC_URL || "";
    if (envUrl) return String(envUrl).replace(/\/$/, "").trim();
    if (typeof window !== "undefined") return window.location.origin.replace(/\/$/, "").trim();
    return "";
  }, []);

  const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "").trim();
  const supabaseAnonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();

  const isLocal = publicUrl.includes("localhost") || publicUrl.includes("127.0.0.1");
  const hasStoreId = Boolean(storeId);
  const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);
  const canInstall = hasStoreId && hasSupabaseConfig && Boolean(publicUrl);
  const widgetVersion = typeof __APP_BUILD_ID__ !== "undefined" ? __APP_BUILD_ID__ : "1";

  // Carrega assinaturas ativas + token de segurança da loja
  useEffect(() => {
    let active = true;

    async function load() {
      if (!storeId) {
        setLoading(false);
        return;
      }

      const [subs, storeInfo] = await Promise.all([
        getActiveSubscriptions(storeId),
        supabase.from("stores").select("security_token").eq("id", storeId).maybeSingle(),
      ]);

      if (!active) return;

      const modulesSet = new Set<ModuleKey>();
      for (const sub of subs) {
        if (sub.module_key === "bundle" && sub.plan?.modules) {
          for (const m of sub.plan.modules) {
            if (KNOWN_MODULES.includes(m as ModuleKey)) modulesSet.add(m as ModuleKey);
          }
        } else if (sub.module_key && KNOWN_MODULES.includes(sub.module_key as ModuleKey)) {
          modulesSet.add(sub.module_key as ModuleKey);
        } else if (sub.plan?.modules) {
          for (const m of sub.plan.modules) {
            if (KNOWN_MODULES.includes(m as ModuleKey)) modulesSet.add(m as ModuleKey);
          }
        }
      }

      setActiveModules(Array.from(modulesSet));
      setSecurityToken(storeInfo.data?.security_token ?? "");
      setLoading(false);
    }

    load();
    return () => {
      active = false;
    };
  }, [storeId]);

  const widgetsConfig = useMemo(() => {
    const cfg: Record<string, boolean> = {};
    for (const m of KNOWN_MODULES) {
      cfg[m] = activeModules.includes(m);
    }
    return cfg;
  }, [activeModules]);

  const scriptCode = useMemo(() => {
    const widgetsJson = JSON.stringify(widgetsConfig, null, 2).replace(/\n/g, "\n  ");
    return `<script>
window.SLL_CONFIG = {
  storeId: "${storeId || ""}",
  platform: "custom",
  supabaseUrl: "${supabaseUrl}",
  supabaseAnonKey: "${supabaseAnonKey}",
  modules: ${widgetsJson}
};

(function() {
  var script = document.createElement('script');
  script.src = '${publicUrl}/widget.js?v=${widgetVersion}';
  script.type = 'text/javascript';
  script.async = true;
  script.charset = 'UTF-8';
  document.head.appendChild(script);
})();
</script>`;
  }, [storeId, supabaseUrl, supabaseAnonKey, publicUrl, widgetVersion, widgetsConfig]);

  const trackingScriptCode = useMemo(() => {
    return `<script>
(function() {
  var script = document.createElement('script');
  script.src = '${publicUrl}/sll-tracking.js'
    + '?store=${encodeURIComponent(storeId || "")}'
    + '&token=${encodeURIComponent(securityToken)}';
  script.type = 'text/javascript';
  script.async = true;
  document.head.appendChild(script);
})();
</script>`;
  }, [publicUrl, storeId, securityToken]);

  const hasSecurityToken = Boolean(securityToken);
  const trackingReady = canInstall && hasSecurityToken && !loading;

  const copyToClipboard = async (text: string, onDone: () => void) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      }
      onDone();
    } catch (error) {
      console.error("Erro ao copiar script:", error);
    }
  };

  const handleCopyScript = () =>
    copyToClipboard(scriptCode, () => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    });

  const handleCopyTrackingScript = () =>
    copyToClipboard(trackingScriptCode, () => {
      setCopiedTracking(true);
      window.setTimeout(() => setCopiedTracking(false), 2500);
    });

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-20">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-[#0091ff]">
            <Store className="h-3.5 w-3.5" />
            Integração
          </div>
          <h1 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Instalação do SLL
          </h1>
          <p className="mt-1 max-w-3xl text-sm font-medium text-slate-500">
            Instale uma única vez e todos os módulos que você assinar (Vidlytics, Live Shopping e futuros lançamentos)
            passam a funcionar automaticamente, sem precisar reinstalar nada.
          </p>
        </div>

        {!hasStoreId && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-300 bg-rose-50 p-5">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <div className="text-xs text-rose-800">
              <p className="font-black text-sm uppercase tracking-tight">Loja não identificada</p>
              <p className="mt-0.5 font-medium">Nenhuma loja ativa foi encontrada no contexto atual.</p>
            </div>
          </div>
        )}

        {isLocal && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-5">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="text-xs text-amber-800">
              <p className="font-black text-sm uppercase tracking-tight">URL pública ausente</p>
              <p className="mt-0.5 font-medium">
                Configure <strong>VITE_WIDGET_PUBLIC_URL</strong> com o domínio público de produção.
              </p>
            </div>
          </div>
        )}

        {!loading && activeModules.length === 0 && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-5">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="text-xs text-amber-800">
              <p className="font-black text-sm uppercase tracking-tight">Nenhum módulo ativo</p>
              <p className="mt-0.5 font-medium">
                Você ainda não assinou nenhum módulo. O script funcionará, mas nenhum widget será exibido até que você
                assine um módulo em <strong>Planos</strong>.
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex justify-center pt-2">
          <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1.5 shadow-sm">
            <button
              type="button"
              onClick={() => setInstallTab("platform")}
              className={`rounded-xl px-6 py-3 text-xs font-black uppercase tracking-wider transition-all ${
                installTab === "platform"
                  ? "bg-white text-[#0091ff] shadow-md border border-slate-100"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Via Plataforma
            </button>
            <button
              type="button"
              onClick={() => setInstallTab("gtm")}
              className={`rounded-xl px-6 py-3 text-xs font-black uppercase tracking-wider transition-all ${
                installTab === "gtm"
                  ? "bg-white text-[#0091ff] shadow-md border border-slate-100"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Via Google Tag Manager
            </button>
          </div>
        </div>

        {/* Como instalar */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 lg:p-10 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight">
              Como instalar na sua loja
            </h2>
            <p className="mt-0.5 text-xs font-medium text-slate-500">
              Uma única instalação ativa automaticamente todos os módulos que você assinar.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {installTab === "platform" ? (
              <>
                <Step n={1} title="Acesse o painel da loja">
                  Abra as configurações do tema da sua plataforma (Yampi, Shopify, Nuvemshop, WBuy, Bagy, Tray, etc.)
                  e localize a área de scripts ou HTML personalizado.
                </Step>
                <Step n={2} title="Cole o Script Principal">
                  Copie o <strong>Script Principal (Passo 1)</strong> no <code>&lt;head&gt;</code> ou na seção global
                  de scripts. Ele já carrega automaticamente todos os módulos que você assinar.
                </Step>
              </>
            ) : (
              <>
                <Step n={1} title="Acesse o Google Tag Manager">
                  Abra o contêiner do GTM instalado no seu site e vá para a seção de Tags.
                </Step>
                <Step n={2} title="Crie a Tag do Script Principal">
                  Crie uma tag <strong>HTML Personalizado</strong>, cole o Script Principal e configure o gatilho para
                  disparar em <strong>All Pages</strong>.
                </Step>
              </>
            )}
            <Step n={3} title="Assine e publique">
              Assine os módulos desejados em <strong>Planos</strong> e configure o conteúdo em cada módulo. Tudo
              aparece automaticamente na loja, sem reinstalar nada.
            </Step>
          </div>
        </div>

        {/* Script Principal */}
        <ScriptBlock
          step={1}
          title="Script Principal (Widget)"
          description={
            <>
              Este script identifica os módulos assinados pela sua loja e carrega automaticamente os widgets
              correspondentes. Cole dentro da tag <strong>&lt;head&gt;</strong>.
            </>
          }
          filename="widget.js"
          code={scriptCode}
          disabled={!canInstall}
          copied={copied}
          onCopy={handleCopyScript}
        />

        {/* Script de Rastreamento */}
        <ScriptBlock
          step={2}
          badge="RECOMENDADO"
          title="Script de Rastreamento (Vendas)"
          description={
            <>
              Compatível com Yampi, Shopify, Nuvemshop, WBuy, Bagy e Tray. Cole na página de{" "}
              <strong>Obrigado / Confirmação de Pedido</strong>. Ele registra a atribuição de venda a qualquer módulo
              (vídeo, live, etc.) automaticamente — não precisa reinstalar ao assinar novos módulos.
            </>
          }
          filename="sll-tracking.js"
          code={trackingScriptCode}
          disabled={!trackingReady}
          copied={copiedTracking}
          onCopy={handleCopyTrackingScript}
        />
      </div>
    </DashboardLayout>
  );
};

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-6">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0091ff] text-white font-black text-xs shadow-xs">
        {n}
      </div>
      <h3 className="mt-4 text-sm font-black text-slate-900 uppercase tracking-tight">{title}</h3>
      <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500">{children}</p>
    </div>
  );
}

function ScriptBlock({
  step,
  title,
  description,
  filename,
  code,
  disabled,
  copied,
  onCopy,
  badge,
}: {
  step: number;
  title: string;
  description: React.ReactNode;
  filename: string;
  code: string;
  disabled: boolean;
  copied: boolean;
  onCopy: () => void;
  badge?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 lg:p-10 shadow-sm space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#0091ff] text-white font-black text-sm shadow-md">
            {step}
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">{title}</h2>
              {badge && (
                <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-700">
                  {badge}
                </span>
              )}
            </div>
            <p className="mt-1 max-w-3xl text-xs sm:text-sm font-medium leading-relaxed text-slate-500">
              {description}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onCopy}
          disabled={disabled}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0091ff] hover:bg-[#0070f3] px-6 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg hover:scale-[1.02] transition-all disabled:cursor-not-allowed disabled:opacity-50 shrink-0"
        >
          {copied ? (
            <>
              <CheckCircle2 size={16} />
              Copiado!
            </>
          ) : (
            <>
              <Copy size={16} />
              Copiar Script
            </>
          )}
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-[#111524] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/5 bg-[#14182b] px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-rose-500/80" />
            <span className="h-3 w-3 rounded-full bg-amber-500/80" />
            <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
          </div>
          <span className="font-mono text-xs font-bold text-slate-400">{filename}</span>
        </div>
        <pre className="overflow-x-auto whitespace-pre-wrap p-6 font-mono text-xs font-semibold leading-relaxed text-[#22c55e] md:text-sm">
          {code}
        </pre>
      </div>
    </div>
  );
}

export default IntegrationPage;
