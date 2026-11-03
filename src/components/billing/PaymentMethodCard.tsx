import { useCallback, useEffect, useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useLoja } from "@/contexts/LojaContext";
import { AppModal } from "@/components/common/AppModal";

type CardInfo = { brand: string | null; last4: string | null } | null;

const FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const FIELD =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-[#0094eb]";
const LABEL = "text-[10px] font-black uppercase tracking-widest text-slate-400";

async function call(name: string, body: unknown) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const r = await fetch(`${FN}/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.message || "N\u00e3o foi poss\u00edvel concluir. Tente novamente.");
  return j;
}

const maskNumber = (v: string) => v.replace(/\D/g, "").slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 ");
const maskExpiry = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 4);
  return d.length > 2 ? d.slice(0, 2) + "/" + d.slice(2) : d;
};

export default function PaymentMethodCard() {
  const { storeId } = useLoja() as { storeId: string | null };
  const [card, setCard] = useState<CardInfo>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [f, setF] = useState({ name: "", number: "", exp: "", ccv: "" });

  const load = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const j = await call("asaas-payment-method", { store_id: storeId });
      setCard(j.card ?? null);
    } catch {
      setCard(null);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => { load(); }, [load]);

  const close = () => {
    if (busy) return;
    setOpen(false);
    setErr("");
    setF({ name: "", number: "", exp: "", ccv: "" });
  };

  const submit = async () => {
    const [mm, yy] = f.exp.split("/");
    if (!f.name.trim() || f.number.replace(/\D/g, "").length < 13 || !mm || !yy || yy.length !== 2 || f.ccv.length < 3) {
      setErr("Confira os dados do cart\u00e3o.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const j = await call("asaas-update-card", {
        store_id: storeId,
        card: { holder_name: f.name, number: f.number, expiry_month: mm, expiry_year: "20" + yy, ccv: f.ccv },
      });
      setF({ name: "", number: "", exp: "", ccv: "" });
      setOpen(false);
      setOk(j.failed?.length ? "Cart\u00e3o atualizado em parte das assinaturas. Tente novamente para as demais." : "Cart\u00e3o atualizado com sucesso.");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro ao atualizar o cart\u00e3o.");
    } finally {
      setBusy(false);
    }
  };

  const btnLine = "flex-1 cursor-pointer rounded-2xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50";
  const btnMain = "flex-1 cursor-pointer rounded-2xl bg-[#0094eb] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#0082cf] disabled:opacity-50";

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0091ff]/10 text-[#0091ff]">
          <CreditCard size={20} />
        </span>
        <div>
          <h2 className="text-base font-black uppercase tracking-tight text-slate-900">{"Forma de pagamento"}</h2>
          {loading ? (
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400"><Loader2 className="h-3 w-3 animate-spin" /> Carregando...</p>
          ) : card?.last4 ? (
            <p className="mt-0.5 text-sm font-semibold text-slate-700">
              {(card.brand ? card.brand.charAt(0).toUpperCase() + card.brand.slice(1).toLowerCase() : "Cart\u00e3o") + " final " + card.last4}
            </p>
          ) : (
            <p className="mt-0.5 text-xs font-medium text-slate-500">{"Nenhum cart\u00e3o cadastrado. O pagamento \u00e9 feito pelo link de cada fatura."}</p>
          )}
          {ok && <p className="mt-1 text-xs font-semibold text-emerald-600">{ok}</p>}
        </div>
      </div>
      <button type="button" onClick={() => { setOk(""); setOpen(true); }} className="cursor-pointer self-start text-xs font-black text-[#0091ff] hover:underline sm:self-auto">
        {card?.last4 ? "Alterar cart\u00e3o" : "Cadastrar cart\u00e3o"}
      </button>

      <AppModal
        open={open}
        title="ALTERAR CART\u00c3O"
        busy={busy}
        onClose={close}
        footer={
          <>
            <button type="button" className={btnLine} disabled={busy} onClick={close}>Cancelar</button>
            <button type="button" className={btnMain} disabled={busy} onClick={submit}>{busy ? "Salvando..." : "Salvar cart\u00e3o"}</button>
          </>
        }
      >
        <div className="w-full space-y-3">
          <div className="space-y-1.5">
            <label className={LABEL}>{"Nome no cart\u00e3o"}</label>
            <input className={FIELD} autoComplete="cc-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <label className={LABEL}>{"N\u00famero do cart\u00e3o"}</label>
            <input className={FIELD} inputMode="numeric" autoComplete="cc-number" value={f.number} onChange={(e) => setF({ ...f, number: maskNumber(e.target.value) })} placeholder="0000 0000 0000 0000" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className={LABEL}>Validade</label>
              <input className={FIELD} inputMode="numeric" autoComplete="cc-exp" value={f.exp} onChange={(e) => setF({ ...f, exp: maskExpiry(e.target.value) })} placeholder="MM/AA" />
            </div>
            <div className="space-y-1.5">
              <label className={LABEL}>CVV</label>
              <input className={FIELD} inputMode="numeric" autoComplete="cc-csc" value={f.ccv} onChange={(e) => setF({ ...f, ccv: e.target.value.replace(/\D/g, "").slice(0, 4) })} />
            </div>
          </div>
          <p className="text-[11px] text-slate-500">{"O cart\u00e3o vale para todas as suas assinaturas ativas. Os dados v\u00e3o direto ao Asaas e n\u00e3o ficam salvos no SLL Hub."}</p>
          {err && <p className="text-xs font-semibold text-rose-600">{err}</p>}
        </div>
      </AppModal>
    </section>
  );
}