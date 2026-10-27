import { supabaseLiveCommerce as lc } from '@/services/supabaseClients';
import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { AppModal } from "@/components/common/AppModal";

const p2 = (n: number) => String(n).padStart(2, "0");
const toLocal = (d: Date) =>
  `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}`;

export default function LiveReactivateHost() {
  const [ask, setAsk] = useState<{ id: string; title: string } | null>(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const h = (e: Event) => {
      const d = (e as CustomEvent).detail as { id?: string; title?: string } | undefined;
      if (!d?.id) return;
      const t = new Date(Date.now() + 60 * 60 * 1000);
      t.setMinutes(0, 0, 0);
      setValue(toLocal(t));
      setError("");
      setBusy(false);
      setAsk({ id: d.id, title: d.title || "" });
    };
    window.addEventListener("live:reactivate-ask", h);
    return () => window.removeEventListener("live:reactivate-ask", h);
  }, []);

  const close = () => { if (!busy) setAsk(null); };

  const confirm = async () => {
    if (!ask) return;
    const when = new Date(value);
    if (!value || isNaN(when.getTime())) { setError("Informe a data e a hora."); return; }
    if (when.getTime() < Date.now() - 60000) { setError("Escolha uma data e hora no futuro."); return; }
    setBusy(true);
    setError("");
    const iso = when.toISOString();
    const { data, error: err } = await (lc as any)
      .schema("live_commerce")
      .from("lives")
      .update({ status: "scheduled", scheduled_at: iso, started_at: null, ended_at: null, is_active: true })
      .eq("id", ask.id)
      .select("id");
    if (err || !data || data.length === 0) {
      setBusy(false);
      setError(err?.message || "Nao foi possivel reativar a live.");
      return;
    }
    window.dispatchEvent(new CustomEvent("live:reactivated", { detail: { id: ask.id, scheduled_at: iso } }));
    setBusy(false);
    setAsk(null);
  };

  const btnCancel = "flex-1 cursor-pointer rounded-2xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50";
  const btnMain = "flex-1 cursor-pointer rounded-2xl bg-[#0088ff] px-5 py-2.5 text-xs font-bold text-white shadow-sm shadow-sky-200 transition hover:bg-[#0077e6] disabled:opacity-50";

  return (
    <AppModal
      open={ask !== null}
      title="REATIVAR LIVE"
      onClose={close}
      busy={busy}
      footer={
        <>
          <button type="button" onClick={close} disabled={busy} className={btnCancel}>Cancelar</button>
          <button type="button" onClick={confirm} disabled={busy} className={btnMain}>{busy ? "Reativando..." : "Reativar"}</button>
        </>
      }
    >
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-sky-200/80 bg-sky-50/40">
        <RotateCcw className="h-9 w-9 stroke-[1.75] text-[#0088ff]" />
      </div>
      <p className="mb-4 w-full text-center text-xs font-medium leading-relaxed text-slate-600">
        {ask?.title ? <strong className="text-slate-900">"{ask.title}"</strong> : "A live"} voltará a ficar agendada com os mesmos produtos, cupons e aparência.
      </p>
      <div className="w-full space-y-1.5">
        <label className="text-xs font-bold text-slate-600">Nova data e hora</label>
        <input
          type="datetime-local"
          value={value}
          min={toLocal(new Date())}
          disabled={busy}
          onChange={(e) => { setValue(e.target.value); setError(""); }}
          onKeyDown={(e) => { if (e.key === "Enter") confirm(); }}
          className="h-10 w-full rounded-2xl border border-slate-200 px-4 text-sm text-slate-800 outline-none transition focus:border-[#0088ff] focus:ring-2 focus:ring-sky-100"
        />
        {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
      </div>
    </AppModal>
  );
}