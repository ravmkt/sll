import { useCallback, useEffect, useState } from "react";
import { Gift, Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppModal, ConfirmDangerModal } from "@/components/common/AppModal";
import { liveStore } from "@/components/live/LiveTemplatesPage";
import { LivePresetsService } from "@/services/LivePresetsService";
import type { LivePreset, PresetMetrics } from "@/services/LivePresetsService";

type Kind = "coupon" | "advantage";

const T = {
  title: "Cupons e Avisos",
  sub: "Atalhos reutiliz\u00e1veis nas suas lives. Use cupons para ofertas e avisos para comunicados (ex.: Sorteio no final). O interruptor pausa ou reativa sem excluir.",
  coupons: "Cupons",
  notices: "Avisos",
  newCoupon: "Novo cupom",
  newNotice: "Novo aviso",
  empty: "Nenhum atalho ainda. Eles aparecem como op\u00e7\u00e3o r\u00e1pida ao criar uma live.",
  loading: "Carregando...",
  loadErr: "N\u00e3o foi poss\u00edvel carregar seus atalhos.",
  toggleErr: "N\u00e3o foi poss\u00edvel alterar o status. Tente novamente.",
  delErr: "N\u00e3o foi poss\u00edvel excluir o atalho.",
  saveErr: "N\u00e3o foi poss\u00edvel salvar.",
  noStore: "Loja n\u00e3o identificada. Recarregue a p\u00e1gina.",
  needCode: "Informe o c\u00f3digo do cupom.",
  needTitle: "Informe o t\u00edtulo do aviso.",
  colActive: "Ativo",
  colCode: "C\u00f3digo",
  colTitle: "T\u00edtulo",
  colDesc: "Descri\u00e7\u00e3o",
  colLives: "Lives",
  colUses: "Usos",
  colViews: "Visualiza\u00e7\u00f5es",
  colClicks: "Cliques",
  colActions: "A\u00e7\u00f5es",
  lblCode: "C\u00f3digo do cupom",
  lblTitle: "T\u00edtulo do aviso",
  lblDesc: "Descri\u00e7\u00e3o",
  phCode: "Ex.: LIVE10",
  phTitle: "Ex.: Sorteio no final da live",
  phDescCoupon: "Ex.: 10% OFF",
  phDescNotice: "Ex.: Fique at\u00e9 o final para participar",
  cancel: "Cancelar",
  save: "Salvar",
  saving: "Salvando...",
  editCoupon: "EDITAR CUPOM",
  newCouponModal: "NOVO CUPOM",
  editNotice: "EDITAR AVISO",
  newNoticeModal: "NOVO AVISO",
  delCoupon: "EXCLUIR CUPOM",
  delNotice: "EXCLUIR AVISO",
  pause: "Pausar",
  activate: "Ativar",
};

const EMPTY = { open: false, id: null as string | null, kind: "coupon" as Kind, title: "", description: "", error: "", busy: false };
const fmt = (n: number | undefined) => new Intl.NumberFormat("pt-BR").format(n ?? 0);
const inputCls =
  "h-10 w-full rounded-2xl border border-slate-200 px-4 text-sm text-slate-800 outline-none transition focus:border-[#0088ff] focus:ring-2 focus:ring-sky-100";

function Switch({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      title={label}
      onClick={onChange}
      className={"relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors " + (on ? "bg-emerald-500" : "bg-slate-300")}
    >
      <span className={"inline-block h-4 w-4 rounded-full bg-white shadow transition-transform " + (on ? "translate-x-[18px]" : "translate-x-0.5")} />
    </button>
  );
}

export default function LivePresetsPage() {
  const [presets, setPresets] = useState<LivePreset[]>([]);
  const [metrics, setMetrics] = useState<Record<string, PresetMetrics>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(EMPTY);
  const [del, setDel] = useState<LivePreset | null>(null);
  const [delBusy, setDelBusy] = useState(false);

  const load = useCallback(async () => {
    const id = liveStore.id;
    if (!id) return;
    try {
      setError("");
      const list = await LivePresetsService.list(id);
      setPresets(list);
      setMetrics(await LivePresetsService.metrics(id).catch(() => ({})));
    } catch (e) {
      console.error(e);
      setError(T.loadErr);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    window.addEventListener("live:templates-changed", load);
    return () => window.removeEventListener("live:templates-changed", load);
  }, [load]);

  const openNew = (kind: Kind) => setForm({ ...EMPTY, open: true, kind });
  const openEdit = (p: LivePreset) =>
    setForm({ ...EMPTY, open: true, id: p.id, kind: p.kind, title: p.title, description: p.description });

  const save = async () => {
    const storeId = liveStore.id;
    const title = form.kind === "coupon" ? form.title.trim().toUpperCase() : form.title.trim();
    if (!title) {
      setForm((f) => ({ ...f, error: form.kind === "coupon" ? T.needCode : T.needTitle }));
      return;
    }
    if (!storeId) {
      setForm((f) => ({ ...f, error: T.noStore }));
      return;
    }
    setForm((f) => ({ ...f, busy: true, error: "" }));
    try {
      const data = { title, description: form.description.trim() };
      if (form.id) await LivePresetsService.update(form.id, data);
      else await LivePresetsService.create(storeId, { kind: form.kind, ...data });
      setForm(EMPTY);
      await load();
    } catch (e: any) {
      setForm((f) => ({ ...f, busy: false, error: e?.message || T.saveErr }));
    }
  };

  const toggle = async (p: LivePreset) => {
    const next = !(p.active !== false);
    setPresets((prev) => prev.map((x) => (x.id === p.id ? { ...x, active: next } : x)));
    try {
      await LivePresetsService.setActive(p.id, next);
      window.dispatchEvent(new CustomEvent("live:presets-changed"));
    } catch (e) {
      console.error(e);
      setPresets((prev) => prev.map((x) => (x.id === p.id ? { ...x, active: !next } : x)));
      setError(T.toggleErr);
    }
  };

  const confirmDelete = async () => {
    if (!del) return;
    setDelBusy(true);
    try {
      await LivePresetsService.remove(del.id);
      setPresets((prev) => prev.filter((x) => x.id !== del.id));
      setDel(null);
    } catch (e: any) {
      setError(e?.message || T.delErr);
      setDel(null);
    } finally {
      setDelBusy(false);
    }
  };

  const section = (kind: Kind) => {
    const rows = presets.filter((p) => p.kind === kind);
    const isCoupon = kind === "coupon";
    return (
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            {isCoupon ? <Tag className="h-4 w-4 text-rose-500" /> : <Gift className="h-4 w-4 text-amber-500" />}
            {isCoupon ? T.coupons : T.notices}
          </h3>
          <Button size="sm" onClick={() => openNew(kind)} className="h-8 gap-1.5 bg-rose-600 text-xs text-white hover:bg-rose-700">
            <Plus className="h-3.5 w-3.5" /> {isCoupon ? T.newCoupon : T.newNotice}
          </Button>
        </div>
        {loading ? (
          <p className="text-sm text-slate-400">{T.loading}</p>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">{T.empty}</div>
        ) : (
          <div className="w-full overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[820px] table-fixed text-left text-sm">
              <colgroup>
                <col className="w-[80px]" />
                <col />
                <col className="w-[90px]" />
                <col className="w-[90px]" />
                <col className="w-[130px]" />
                <col className="w-[100px]" />
                <col className="w-[110px]" />
              </colgroup>
              <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                <tr>
                  <th className="p-3 text-center">{T.colActive}</th>
                  <th className="p-3">{(isCoupon ? T.colCode : T.colTitle) + " / " + T.colDesc}</th>
                  <th className="p-3 text-center">{T.colLives}</th>
                  <th className="p-3 text-center">{T.colUses}</th>
                  <th className="p-3 text-center">{T.colViews}</th>
                  <th className="p-3 text-center">{T.colClicks}</th>
                  <th className="p-3 text-center">{T.colActions}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const m = metrics[p.id];
                  const on = p.active !== false;
                  const dim = on ? "" : " opacity-50";
                  return (
                    <tr key={p.id} className="border-t border-slate-100">
                      <td className="p-3 text-center">
                        <Switch on={on} onChange={() => toggle(p)} label={on ? T.pause : T.activate} />
                      </td>
                      <td className={"p-3" + dim}>
                        <div className="truncate font-bold text-slate-800">{p.title}</div>
                        <div className="truncate text-xs text-slate-500">{p.description || "\u2014"}</div>
                      </td>
                      <td className={"p-3 text-center tabular-nums" + dim}>{fmt(m?.lives_count)}</td>
                      <td className={"p-3 text-center font-semibold tabular-nums" + dim}>{isCoupon ? fmt(m?.uses) : "\u2014"}</td>
                      <td className={"p-3 text-center tabular-nums" + dim}>{fmt(m?.views)}</td>
                      <td className={"p-3 text-center tabular-nums" + dim}>{fmt(m?.clicks)}</td>
                      <td className="p-3 text-center">
                        <button type="button" onClick={() => openEdit(p)} className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-sky-50 hover:text-sky-600">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => setDel(p)} className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  };

  const isCouponForm = form.kind === "coupon";
  const modalTitle = form.id
    ? (isCouponForm ? T.editCoupon : T.editNotice)
    : (isCouponForm ? T.newCouponModal : T.newNoticeModal);

  return (
    <div className="w-full space-y-6 p-6">
      <div>
        <h2 className="text-lg font-bold text-slate-800">{T.title}</h2>
        <p className="mt-0.5 text-sm text-slate-500">{T.sub}</p>
      </div>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

      {section("coupon")}
      {section("advantage")}

      <AppModal
        open={form.open}
        title={modalTitle}
        busy={form.busy}
        onClose={() => setForm(EMPTY)}
        footer={
          <>
            <Button variant="outline" disabled={form.busy} onClick={() => setForm(EMPTY)} className="h-10 flex-1 rounded-2xl text-xs font-bold">
              {T.cancel}
            </Button>
            <Button disabled={form.busy} onClick={save} className="h-10 flex-1 rounded-2xl bg-[#0088ff] text-xs font-bold text-white hover:bg-[#0077e6]">
              {form.busy ? T.saving : T.save}
            </Button>
          </>
        }
      >
        <div className="w-full space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600">{isCouponForm ? T.lblCode : T.lblTitle}</label>
            <input
              autoFocus
              value={form.title}
              maxLength={120}
              disabled={form.busy}
              placeholder={isCouponForm ? T.phCode : T.phTitle}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value, error: "" }))}
              onKeyDown={(e) => { if (e.key === "Enter") save(); }}
              className={inputCls}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600">{T.lblDesc}</label>
            <input
              value={form.description}
              maxLength={300}
              disabled={form.busy}
              placeholder={isCouponForm ? T.phDescCoupon : T.phDescNotice}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              onKeyDown={(e) => { if (e.key === "Enter") save(); }}
              className={inputCls}
            />
          </div>
          {form.error && <p className="text-xs font-semibold text-rose-600">{form.error}</p>}
        </div>
      </AppModal>

      <ConfirmDangerModal
        open={!!del}
        title={del?.kind === "coupon" ? T.delCoupon : T.delNotice}
        itemName={del?.title || ""}
        busy={delBusy}
        onClose={() => setDel(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}