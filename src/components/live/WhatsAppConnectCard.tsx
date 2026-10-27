import { useCallback, useEffect, useState } from "react";
import { Loader2, MessageCircle, QrCode } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppModal, ConfirmDangerModal } from "@/components/common/AppModal";

type St = { state: "none" | "connecting" | "connected"; qr?: string | null; number?: string | null };

const btnRed =
  "cursor-pointer rounded-2xl bg-[#DC2626] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#B91C1C] disabled:opacity-50";
const btnLine =
  "cursor-pointer rounded-2xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50";

export default function WhatsAppConnectCard({ storeId: storeIdProp }: { storeId?: string | null }) {
  const sb = supabase as any;
  const [storeId, setStoreId] = useState<string | null>(storeIdProp ?? null);
  const [st, setSt] = useState<St>({ state: "none" });
  const [qr, setQr] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [askOff, setAskOff] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (storeIdProp) { setStoreId(storeIdProp); return; }
    (async () => {
      const { data: u } = await sb.auth.getUser();
      if (!u?.user) return;
      const { data } = await sb.from("stores").select("id").eq("owner_user_id", u.user.id).limit(1).maybeSingle();
      if (data?.id) setStoreId(data.id);
    })();
  }, [storeIdProp]);

  const call = useCallback(async (action: string): Promise<St | null> => {
    if (!storeId) return null;
    const { data, error } = await sb.functions.invoke("live_notify_connect", { body: { action, store_id: storeId } });
    if (error || data?.error) { setErr(data?.error || "Não foi possível falar com o servidor."); return null; }
    setErr("");
    return data as St;
  }, [storeId]);

  useEffect(() => {
    if (storeId) call("status").then((d) => d && setSt(d));
  }, [storeId, call]);

  useEffect(() => {
    if (!open || !storeId) return;
    let n = 0;
    const t = setInterval(async () => {
      n++;
      const d = await call(n % 8 === 0 ? "connect" : "status");
      if (!d) return;
      if (d.state === "connected") { setSt(d); setOpen(false); return; }
      if (d.qr) setQr(d.qr);
    }, 3000);
    return () => clearInterval(t);
  }, [open, storeId, call]);

  const start = async () => {
    setBusy(true); setQr(null);
    const d = await call("connect");
    setBusy(false);
    if (!d) return;
    if (d.state === "connected") { setSt(d); return; }
    setQr(d.qr ?? null);
    setOpen(true);
  };

  const disconnect = async () => {
    setBusy(true);
    const d = await call("logout");
    setBusy(false); setAskOff(false);
    if (d) setSt({ state: "connecting" });
  };

  const on = st.state === "connected";

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className={"flex h-10 w-10 items-center justify-center rounded-full " + (on ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500")}>
          <MessageCircle className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-extrabold text-slate-900">WhatsApp da loja</p>
          <p className="text-xs text-slate-500">
            {on
              ? `Conectado${st.number ? " · +" + st.number : ""}. Os avisos saem pelo seu número.`
              : "Conecte o número da sua loja para enviar os avisos da régua de notificação."}
          </p>
          {err && <p className="mt-1 text-xs font-semibold text-rose-600">{err}</p>}
        </div>
      </div>
      {on ? (
        <button type="button" className={btnLine} disabled={busy} onClick={() => setAskOff(true)}>Desconectar</button>
      ) : (
        <button type="button" className={btnRed + " flex items-center gap-2"} disabled={busy || !storeId} onClick={start}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />} Conectar WhatsApp
        </button>
      )}

      <AppModal
        open={open}
        title="CONECTAR WHATSAPP"
        onClose={() => setOpen(false)}
        footer={<button type="button" className={btnLine + " flex-1"} onClick={() => setOpen(false)}>Fechar</button>}
      >
        <div className="flex h-56 w-56 items-center justify-center rounded-2xl border border-slate-200 bg-white">
          {qr ? <img src={qr} alt="QR Code do WhatsApp" className="h-52 w-52" /> : <Loader2 className="h-8 w-8 animate-spin text-slate-400" />}
        </div>
        <p className="mt-4 text-center text-xs leading-relaxed text-slate-600">
          No celular: WhatsApp &gt; Aparelhos conectados &gt; Conectar um aparelho e aponte para o QR Code.
          O código se renova sozinho.
        </p>
      </AppModal>

      <ConfirmDangerModal
        open={askOff}
        title="DESCONECTAR WHATSAPP"
        itemName="WhatsApp da loja"
        message="Os avisos de WhatsApp param de ser enviados até você conectar de novo."
        confirmLabel="Desconectar"
        busy={busy}
        onClose={() => setAskOff(false)}
        onConfirm={disconnect}
      />
    </div>
  );
}