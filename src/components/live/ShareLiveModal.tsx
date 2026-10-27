import { useEffect, useState } from "react";
import { Check, Copy, ExternalLink, MessageCircle, Radio, Share2, Sparkles, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { AppModal } from "@/components/common/AppModal";
import { supabaseLiveCommerce as supabase } from '@/services/supabaseClients';

interface ShareLiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  liveTitle: string;
  youtubeVideoId: string;
  isLiveNow: boolean;
}

type LiveRow = { id: string; store_id: string; scheduled_at: string | null; status: string | null };

const URL_KEYS = ["store_url", "shop_url", "site_url", "website", "url", "primary_domain", "custom_domain", "store_domain", "domain"];
const lsKey = (storeId: string) => `sll_store_url_${storeId}`;

const btnCancel =
  "flex-1 cursor-pointer rounded-2xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50";
const btnGhost =
  "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-2xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";
const btnWa =
  "inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm shadow-emerald-200 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50";
const inputCls =
  "h-10 min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-xs text-slate-700 outline-none transition focus:border-[#0088ff] focus:ring-2 focus:ring-sky-100";

function normalizeBase(raw: string): string {
  const v = String(raw || "").trim();
  if (!v) return "";
  const full = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(full);
    u.search = "";
    u.hash = "";
    return u.toString();
  } catch {
    return "";
  }
}

function buildLink(base: string, liveId: string, signup: boolean): string {
  try {
    const u = new URL(base);
    u.searchParams.set("sll_live", liveId);
    if (signup) u.searchParams.set("sll_cadastro", "1");
    return u.toString();
  } catch {
    return "";
  }
}

function fmtWhen(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const day = d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
  const hm = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${day}, \u00E0s ${hm}`;
}

function pickUrl(row: any): string {
  if (!row) return "";
  for (const k of URL_KEYS) {
    const v = row[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

export function ShareLiveModal({ open, onOpenChange, liveTitle, youtubeVideoId, isLiveNow }: ShareLiveModalProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [live, setLive] = useState<LiveRow | null>(null);
  const [storeInput, setStoreInput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLive(null);
    setStoreInput("");
    if (!youtubeVideoId) return;
    setLoading(true);
    (async () => {
      try {
        const { data } = await (supabase as any)
          .schema("live_commerce")
          .from("lives")
          .select("id,store_id,scheduled_at,status")
          .eq("youtube_video_id", youtubeVideoId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!alive || !data) return;
        setLive(data as LiveRow);

        let found = "";
        try { found = localStorage.getItem(lsKey(data.store_id)) || ""; } catch (_e) { /* sem storage */ }
        if (!found) {
          try {
            const a = await (supabase as any).schema("public").from("store_settings").select("*").eq("store_id", data.store_id).maybeSingle();
            found = pickUrl(a?.data);
          } catch (_e) { /* tenta a proxima fonte */ }
        }
        if (!found) {
          try {
            const b = await (supabase as any).schema("public").from("stores").select("*").eq("id", data.store_id).maybeSingle();
            found = pickUrl(b?.data);
          } catch (_e) { /* campo manual */ }
        }
        if (alive && found) setStoreInput(found);
      } catch (_e) {
        /* sem dados: o campo manual cobre */
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [open, youtubeVideoId]);

  const base = normalizeBase(storeInput);
  const liveUrl = base && live ? buildLink(base, live.id, false) : "";
  const signupUrl = base && live ? buildLink(base, live.id, true) : "";
  const ready = !!liveUrl;
  const title = liveTitle || "Live";
  const when = fmtWhen(live?.scheduled_at ?? null);

  const waText = isLiveNow
    ? `\uD83D\uDD25 *ESTAMOS AO VIVO!*\n\n` +
      `\uD83D\uDCCC *${title}*\n` +
      `Entre agora na nossa loja, interaja com a gente e aproveite as ofertas da live!\n\n` +
      `\uD83D\uDC49 Entre na live: ${liveUrl}`
    : `\uD83D\uDD25 *VEM A\u00CD NOSSA LIVE EXCLUSIVA!*\n\n` +
      `\uD83D\uDCCC *${title}*\n` +
      (when ? `\uD83D\uDCC5 ${when}\n` : "") +
      `Vai ter ofertas especiais e a gente responde suas d\u00FAvidas ao vivo, aqui na nossa loja.\n\n` +
      `\uD83D\uDC49 Acesse a live: ${liveUrl}\n\n` +
      `\u270D\uFE0F Cadastre-se para ser avisado: ${signupUrl}`;

  const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(waText)}`;

  const saveBase = () => {
    if (live && base) {
      try { localStorage.setItem(lsKey(live.store_id), base); } catch (_e) { /* ignora */ }
    }
  };

  const copy = (text: string, key: string, message = "Copiado com sucesso!") => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(message);
    setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 2500);
  };

  const CopyIcon = ({ k }: { k: string }) =>
    copiedKey === k ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />;

  const linkRow = (label: string, value: string, key: string, icon: React.ReactNode) => (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600">{icon}{label}</label>
      <div className="flex gap-2">
        <input readOnly value={value || "Informe o endere\u00E7o da loja acima"} className={`${inputCls} font-mono`} />
        <button type="button" className={btnGhost} disabled={!value} onClick={() => copy(value, key)}>
          <CopyIcon k={key} /> Copiar
        </button>
        {value && (
          <button type="button" title="Abrir" className={btnGhost} onClick={() => window.open(value, "_blank", "noopener,noreferrer")}>
            <ExternalLink className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <AppModal
      open={open}
      title="DIVULGAR LIVE"
      maxWidth="max-w-xl"
      onClose={() => onOpenChange(false)}
      footer={
        <button type="button" onClick={() => onOpenChange(false)} className={btnCancel}>
          Fechar
        </button>
      }
    >
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-sky-200/80 bg-sky-50/40">
        <Share2 className="h-9 w-9 stroke-[1.75] text-[#0088ff]" />
      </div>

      <div className="mb-1 flex flex-wrap items-center justify-center gap-2">
        <span className="text-sm font-bold text-slate-900">{title}</span>
        {isLiveNow ? (
          <span className="inline-flex animate-pulse items-center gap-1 rounded-full bg-red-600 px-2.5 py-0.5 text-[10px] font-bold text-white">
            <Radio className="h-3 w-3" /> AO VIVO
          </span>
        ) : (
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">PROGRAMADA</span>
        )}
      </div>
      <p className="mb-4 text-center text-xs text-slate-500">
        {when && !isLiveNow ? `${when.charAt(0).toUpperCase()}${when.slice(1)}. ` : ""}
        Compartilhe com sua audi&ecirc;ncia.
      </p>

      <div className="w-full space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-600">Endere&ccedil;o da sua loja</label>
          <input
            value={storeInput}
            onChange={(e) => setStoreInput(e.target.value)}
            onBlur={saveBase}
            placeholder="https://www.minhaloja.com.br"
            className={`${inputCls} w-full`}
          />
          {!base && !loading && (
            <p className="text-[11px] text-amber-700">Informe o endere&ccedil;o uma vez para gerar os links. Ele fica salvo neste navegador.</p>
          )}
        </div>

        <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
              <MessageCircle className="h-4 w-4" /> Divulgar no WhatsApp
            </span>
            <span className="rounded-full border border-emerald-300 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Alta convers&atilde;o</span>
          </div>
          <p className="mb-3 text-xs text-slate-600">
            {isLiveNow
              ? "Convite com o link para entrar na live agora, direto na sua loja."
              : "Convite com data e hor\u00E1rio, link da live na sua loja e link de cadastro."}
          </p>
          <div className="flex gap-2">
            <button type="button" className={btnWa} disabled={!ready} onClick={() => window.open(waUrl, "_blank", "noopener,noreferrer")}>
              <MessageCircle className="h-4 w-4" /> Abrir WhatsApp
            </button>
            <button type="button" className={btnGhost} disabled={!ready} onClick={() => copy(waText, "wa_text", "Texto formatado copiado!")}>
              <CopyIcon k="wa_text" /> Copiar texto
            </button>
          </div>
        </div>

        {linkRow("Link da live na sua loja", liveUrl, "live_url", <Radio className="h-3.5 w-3.5" />)}
        {!isLiveNow && linkRow("Link de cadastro (lista de avisos)", signupUrl, "signup_url", <UserPlus className="h-3.5 w-3.5" />)}

        <div className="flex items-start gap-3 rounded-2xl border border-amber-200/60 bg-amber-50/50 p-4">
          <Sparkles className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
          <p className="text-xs font-medium leading-relaxed text-amber-900">
            <strong className="font-bold">Como funciona:</strong> o link abre a sua loja e o widget da live
            {" "}aparece na tela. Quem clica no link de cadastro j&aacute; v&ecirc; o formul&aacute;rio e entra na lista de Audi&ecirc;ncia.
          </p>
        </div>
      </div>
    </AppModal>
  );
}