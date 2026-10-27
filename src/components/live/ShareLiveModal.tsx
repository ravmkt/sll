import { useState } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  HelpCircle,
  Laptop,
  MessageCircle,
  Radio,
  Share2,
  Sparkles,
  Users,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { AppModal } from "@/components/common/AppModal";

interface ShareLiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  liveTitle: string;
  youtubeVideoId: string;
  isLiveNow: boolean;
}

type Tab = "customers" | "cohost";

const btnCancel =
  "flex-1 cursor-pointer rounded-2xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50";
const btnGhost =
  "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-2xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";
const btnWa =
  "inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm shadow-emerald-200 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50";

export function ShareLiveModal({ open, onOpenChange, liveTitle, youtubeVideoId, isLiveNow }: ShareLiveModalProps) {
  const [tab, setTab] = useState<Tab>("customers");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const youtubeUrl = youtubeVideoId ? `https://www.youtube.com/watch?v=${youtubeVideoId}` : "";

  const copy = (text: string, key: string, message = "Copiado com sucesso!") => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(message);
    setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 2500);
  };

  const customerText =
    `\uD83D\uDD25 *${isLiveNow ? "ESTAMOS AO VIVO!" : "VEM A\u00CD NOSSA LIVE EXCLUSIVA!"}*\n\n` +
    `\uD83D\uDCCC *${liveTitle || "Live Commerce"}*\n` +
    `Assista agora, interaja conosco e aproveite os descontos especiais!\n\n` +
    `\uD83D\uDC49 Assista direto no YouTube: ${youtubeUrl}`;

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(customerText)}`;

  const cohostText =
    `Ol\u00E1! Tudo bem? Aqui est\u00E3o as instru\u00E7\u00F5es para a nossa transmiss\u00E3o de hoje:\n\n` +
    `\uD83D\uDCCC Tema: ${liveTitle || "Live Commerce"}\n` +
    `\uD83C\uDFA5 Link de transmiss\u00E3o / est\u00FAdio: [Cole aqui seu link do StreamYard ou VDO.Ninja]\n` +
    `\uD83D\uDCFA Link p\u00FAblico no YouTube: ${youtubeUrl}\n\n` +
    `Dicas: use fones de ouvido para evitar eco e fique em um local bem iluminado. At\u00E9 j\u00E1!`;

  const CopyIcon = ({ k }: { k: string }) =>
    copiedKey === k ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />;

  const tabCls = (t: Tab) =>
    "flex cursor-pointer items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition " +
    (tab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700");

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
        <span className="text-sm font-bold text-slate-900">{liveTitle || "Live"}</span>
        {isLiveNow ? (
          <span className="inline-flex animate-pulse items-center gap-1 rounded-full bg-red-600 px-2.5 py-0.5 text-[10px] font-bold text-white">
            <Radio className="h-3 w-3" /> AO VIVO
          </span>
        ) : (
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">PROGRAMADA</span>
        )}
      </div>
      <p className="mb-4 text-center text-xs text-slate-500">
        Compartilhe com sua audi&ecirc;ncia ou convide parceiros para transmitir com voc&ecirc;.
      </p>

      <div className="mb-4 grid w-full grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1">
        <button type="button" className={tabCls("customers")} onClick={() => setTab("customers")}>
          <Share2 className="h-3.5 w-3.5" /> Clientes
        </button>
        <button type="button" className={tabCls("cohost")} onClick={() => setTab("cohost")}>
          <Users className="h-3.5 w-3.5" /> Co-Host / Parceiro
        </button>
      </div>

      {tab === "customers" && (
        <div className="w-full space-y-4">
          <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/50 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                <MessageCircle className="h-4 w-4" /> Divulgar no WhatsApp
              </span>
              <span className="rounded-full border border-emerald-300 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                Alta convers&atilde;o
              </span>
            </div>
            <p className="mb-3 text-xs text-slate-600">
              Envie o convite formatado com um clique para suas listas de transmiss&atilde;o, grupos e status.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className={btnWa}
                disabled={!youtubeVideoId}
                onClick={() => window.open(whatsappUrl, "_blank", "noopener,noreferrer")}
              >
                <MessageCircle className="h-4 w-4" /> Abrir WhatsApp
              </button>
              <button
                type="button"
                className={btnGhost}
                disabled={!youtubeVideoId}
                onClick={() => copy(customerText, "wa_text", "Texto formatado copiado!")}
              >
                <CopyIcon k="wa_text" /> Copiar texto
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600">Link da live no YouTube</label>
            <div className="flex gap-2">
              <input
                readOnly
                value={youtubeUrl || "Adicione o ID da live no formul\u00E1rio"}
                className="h-10 min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 font-mono text-xs text-slate-700 outline-none"
              />
              <button type="button" className={btnGhost} disabled={!youtubeVideoId} onClick={() => copy(youtubeUrl, "yt_url")}>
                <CopyIcon k="yt_url" /> Copiar
              </button>
              {youtubeUrl && (
                <button
                  type="button"
                  title="Abrir no YouTube"
                  className={btnGhost}
                  onClick={() => window.open(youtubeUrl, "_blank", "noopener,noreferrer")}
                >
                  <ExternalLink className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-amber-200/60 bg-amber-50/50 p-4">
            <Sparkles className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
            <p className="text-xs font-medium leading-relaxed text-amber-900">
              <strong className="font-bold">Dica de convers&atilde;o:</strong> com a live ativa, a loja exibe a bolha{" "}
              <strong className="font-bold text-red-600">AO VIVO</strong> com os produtos clic&aacute;veis. Divulgue
              tamb&eacute;m o endere&ccedil;o da sua loja.
            </p>
          </div>
        </div>
      )}

      {tab === "cohost" && (
        <div className="w-full space-y-4">
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200/60 bg-amber-50/50 p-4">
            <HelpCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
            <p className="text-xs font-medium leading-relaxed text-amber-900">
              O YouTube n&atilde;o gera link de convidado na transmiss&atilde;o RTMP padr&atilde;o. Para transmitir em dupla,
              use uma ferramenta de est&uacute;dio que envia direto para o YouTube.
            </p>
          </div>

          {[
            {
              icon: <Laptop className="h-4 w-4" />,
              tone: "bg-amber-100 text-amber-700",
              title: "StreamYard (mais f\u00E1cil, recomendado)",
              desc: "O convidado entra pelo navegador, sem instalar nada.",
              steps: [
                "Crie a transmiss\u00E3o no StreamYard conectando seu canal do YouTube.",
                "Clique em Invite Guests e envie o link ao co-host.",
              ],
              url: "https://streamyard.com",
              label: "Abrir",
            },
            {
              icon: <Video className="h-4 w-4" />,
              tone: "bg-violet-100 text-violet-700",
              title: "OBS Studio + VDO.Ninja (gratuito)",
              desc: "Para transmiss\u00F5es com layout personalizado no OBS.",
              steps: [
                "Crie uma sala no VDO.Ninja e envie o link de c\u00E2mera ao convidado.",
                "Adicione a fonte de navegador (Browser Source) no OBS.",
              ],
              url: "https://vdo.ninja",
              label: "VDO.Ninja",
            },
          ].map((o) => (
            <div key={o.title} className="space-y-3 rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={"flex h-9 w-9 items-center justify-center rounded-xl " + o.tone}>{o.icon}</span>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{o.title}</p>
                    <p className="text-[11px] text-slate-500">{o.desc}</p>
                  </div>
                </div>
                <button type="button" className={btnGhost} onClick={() => window.open(o.url, "_blank", "noopener,noreferrer")}>
                  {o.label} <ExternalLink className="h-3 w-3" />
                </button>
              </div>
              <div className="space-y-1 rounded-xl bg-slate-50 p-3 text-[11px] text-slate-600">
                {o.steps.map((s, i) => (
                  <p key={i}>
                    {i + 1}. {s}
                  </p>
                ))}
              </div>
            </div>
          ))}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-600">Mensagem para o convidado</label>
              <button
                type="button"
                className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-bold text-[#0088ff] hover:underline"
                onClick={() => copy(cohostText, "cohost_template", "Instru\u00E7\u00F5es copiadas!")}
              >
                <CopyIcon k="cohost_template" /> Copiar
              </button>
            </div>
            <textarea
              readOnly
              rows={7}
              value={cohostText}
              className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 outline-none"
            />
          </div>
        </div>
      )}
    </AppModal>
  );
}