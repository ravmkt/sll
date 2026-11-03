import { useEffect, useState } from "react";
import { ChevronDown, FileText, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useLoja } from "@/contexts/LojaContext";

const sb: any = supabase;

type DocType = "cnpj" | "cpf";
type Form = {
  doc_type: DocType; document: string; legal_name: string; state_registration: string;
  financial_email: string; zip: string; street: string; number: string; city: string; state: string;
};

const EMPTY: Form = {
  doc_type: "cnpj", document: "", legal_name: "", state_registration: "", financial_email: "",
  zip: "", street: "", number: "", city: "", state: "",
};

const T = {
  title: "Dados para emiss\u00e3o de Nota Fiscal",
  sub: "Usados na emiss\u00e3o da nota fiscal das suas assinaturas.",
  ok: "Completo",
  pending: "Dados pendentes",
  pj: "Pessoa Jur\u00eddica (CNPJ)",
  pf: "Pessoa F\u00edsica (CPF)",
  legalPj: "Raz\u00e3o social",
  legalPf: "Nome completo",
  ie: "Inscri\u00e7\u00e3o estadual (opcional)",
  email: "E-mail do financeiro",
  zip: "CEP",
  street: "Logradouro",
  number: "N\u00famero",
  city: "Cidade",
  uf: "UF",
  save: "Salvar dados fiscais",
  errDoc: "Informe um CNPJ/CPF com a quantidade correta de d\u00edgitos.",
  errName: "Informe a raz\u00e3o social ou o nome completo.",
  errMail: "Informe um e-mail financeiro v\u00e1lido.",
  errSave: "N\u00e3o foi poss\u00edvel salvar os dados fiscais.",
  saved: "Dados fiscais salvos.",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INPUT =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 outline-none transition focus:border-[#0091ff] focus:ring-2 focus:ring-[#0091ff]/20";

const onlyDigits = (s: string) => (s || "").replace(/\D/g, "");

function maskDoc(v: string, t: DocType) {
  const d = onlyDigits(v).slice(0, t === "cnpj" ? 14 : 11);
  if (t === "cnpj") {
    return d
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function maskZip(v: string) {
  return onlyDigits(v).slice(0, 8).replace(/^(\d{5})(\d)/, "$1-$2");
}

function isComplete(f: Form) {
  const need = f.doc_type === "cnpj" ? 14 : 11;
  return Boolean(
    onlyDigits(f.document).length === need &&
      f.legal_name.trim() &&
      EMAIL_RE.test(f.financial_email.trim()) &&
      onlyDigits(f.zip).length === 8 &&
      f.street.trim() &&
      f.number.trim() &&
      f.city.trim() &&
      f.state.trim().length === 2
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("block space-y-1", className)}>
      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</span>
      {children}
    </label>
  );
}

export default function BillingProfileCard() {
  const { storeId } = useLoja();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState<Form>(EMPTY);

  useEffect(() => {
    if (!storeId) return;
    let alive = true;
    (async () => {
      const { data } = await sb.from("billing_profiles").select("*").eq("store_id", storeId).limit(1).maybeSingle();
      if (!alive) return;
      if (data) {
        const t: DocType = data.doc_type === "cpf" ? "cpf" : "cnpj";
        setF({
          doc_type: t,
          document: maskDoc(String(data.document ?? ""), t),
          legal_name: String(data.legal_name ?? ""),
          state_registration: String(data.state_registration ?? ""),
          financial_email: String(data.financial_email ?? ""),
          zip: maskZip(String(data.zip ?? "")),
          street: String(data.street ?? ""),
          number: String(data.number ?? ""),
          city: String(data.city ?? ""),
          state: String(data.state ?? "").toUpperCase(),
        });
      }
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [storeId]);

  function set<K extends keyof Form>(k: K, v: Form[K]) {
    setF((p) => ({ ...p, [k]: v }));
  }

  function changeType(t: DocType) {
    setF((p) => ({ ...p, doc_type: t, document: maskDoc(p.document, t) }));
  }

  async function save() {
    if (!storeId) return;
    const need = f.doc_type === "cnpj" ? 14 : 11;
    if (onlyDigits(f.document).length !== need) { toast.error(T.errDoc); return; }
    if (!f.legal_name.trim()) { toast.error(T.errName); return; }
    if (!EMAIL_RE.test(f.financial_email.trim())) { toast.error(T.errMail); return; }

    setSaving(true);
    const payload = {
      store_id: storeId,
      doc_type: f.doc_type,
      document: onlyDigits(f.document),
      legal_name: f.legal_name.trim(),
      state_registration: f.state_registration.trim() || null,
      financial_email: f.financial_email.trim(),
      zip: onlyDigits(f.zip),
      street: f.street.trim(),
      number: f.number.trim(),
      city: f.city.trim(),
      state: f.state.trim().toUpperCase(),
      updated_at: new Date().toISOString(),
    };
    const up = await sb.from("billing_profiles").update(payload).eq("store_id", storeId).select("store_id");
    let err = up.error;
    if (!err && (!up.data || up.data.length === 0)) {
      const ins = await sb.from("billing_profiles").insert(payload);
      err = ins.error;
    }
    setSaving(false);
    if (err) { toast.error(T.errSave); return; }
    toast.success(T.saved);
  }

  const complete = isComplete(f);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full cursor-pointer items-center justify-between gap-3 p-5 text-left"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0091ff]/10 text-[#0091ff]">
            <FileText size={20} />
          </span>
          <span>
            <span className="block text-base font-black text-slate-900">{T.title}</span>
            <span className="block text-xs font-medium text-slate-500">{T.sub}</span>
          </span>
        </span>
        <span className="flex items-center gap-3">
          {!loading && (
            <span
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase",
                complete ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"
              )}
            >
              {complete ? T.ok : T.pending}
            </span>
          )}
          <ChevronDown size={18} className={cn("text-slate-400 transition-transform", open && "rotate-180")} />
        </span>
      </button>

      {open && (
        <div className="space-y-5 border-t border-slate-100 p-5">
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-[#0091ff]" /></div>
          ) : (
            <>
              <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1">
                {(["cnpj", "cpf"] as DocType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => changeType(t)}
                    className={cn(
                      "cursor-pointer rounded-lg px-4 py-2 text-xs font-black transition",
                      f.doc_type === t ? "bg-white text-[#0091ff] shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    {t === "cnpj" ? T.pj : T.pf}
                  </button>
                ))}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={f.doc_type === "cnpj" ? "CNPJ" : "CPF"}>
                  <input className={INPUT} value={f.document} inputMode="numeric" onChange={(e) => set("document", maskDoc(e.target.value, f.doc_type))} />
                </Field>
                <Field label={f.doc_type === "cnpj" ? T.legalPj : T.legalPf}>
                  <input className={INPUT} value={f.legal_name} onChange={(e) => set("legal_name", e.target.value)} />
                </Field>
                <Field label={T.ie}>
                  <input className={INPUT} value={f.state_registration} placeholder="Isento" onChange={(e) => set("state_registration", e.target.value)} />
                </Field>
                <Field label={T.email}>
                  <input className={INPUT} type="email" value={f.financial_email} onChange={(e) => set("financial_email", e.target.value)} />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-6">
                <Field label={T.zip} className="sm:col-span-2">
                  <input className={INPUT} value={f.zip} inputMode="numeric" onChange={(e) => set("zip", maskZip(e.target.value))} />
                </Field>
                <Field label={T.street} className="sm:col-span-3">
                  <input className={INPUT} value={f.street} onChange={(e) => set("street", e.target.value)} />
                </Field>
                <Field label={T.number} className="sm:col-span-1">
                  <input className={INPUT} value={f.number} onChange={(e) => set("number", e.target.value)} />
                </Field>
                <Field label={T.city} className="sm:col-span-4">
                  <input className={INPUT} value={f.city} onChange={(e) => set("city", e.target.value)} />
                </Field>
                <Field label={T.uf} className="sm:col-span-2">
                  <input className={INPUT} value={f.state} maxLength={2} onChange={(e) => set("state", e.target.value.toUpperCase())} />
                </Field>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-[#0091ff] px-6 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg transition hover:bg-[#0070f3] disabled:opacity-60"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {T.save}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}