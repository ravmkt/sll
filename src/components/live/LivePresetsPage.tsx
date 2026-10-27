import { useCallback, useEffect, useState } from "react";
import { Gift, Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppModal, ConfirmDangerModal } from "@/components/common/AppModal";
import { liveStore } from "@/components/live/LiveTemplatesPage";
import { LivePresetsService } from "@/services/LivePresetsService";
import type { LivePreset, PresetMetrics } from "@/services/LivePresetsService";

type Kind = "coupon" | "advantage";

const EMPTY = { open: false, id: null as string | null, kind: "coupon" as Kind, title: "", description: "", error: "", busy: false };
const fmt = (n: number | undefined) => new Intl.NumberFormat("pt-BR").format(n ?? 0);
const inputCls =
  "h-10 w-full rounded-2xl border border-slate-200 px-4 text-sm text-slate-800 outline-none transition focus:border-[#0088ff] focus:ring-2 focus:ring-sky-100";

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
      setError("Não foi possível carregar seus atalhos.");
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
      setForm((f) => ({ ...f, error: form.kind === "coupon" ? "Informe o código do cupom." : "Informe o título do aviso." }));
      return;
    }
    if (!storeId) {
      setForm((f) => ({ ...f, error: "Loja não identificada. Recarregue a página." }));
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
      setForm((f) => ({ ...f, busy: false, error: e?.message || "Não foi possível salvar." }));
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
      setError(e?.message || "Não foi possível excluir o atalho.");
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
            {isCoupon ? "Cupons" : "Avisos"}
          </h3>
          <Button size="sm" onClick={() => openNew(kind)} className="h-8 gap-1.5 bg-rose-600 text-xs text-white hover:bg-rose-700">
            <Plus className="h-3.5 w-3.5" /> {isCoupon ? "Novo cupom" : "Novo aviso"}
          </Button>
        </div>
        {loading ? (
          <p className="text-sm text-slate-400">Carregando...</p>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
            Nenhum atalho ainda. Eles aparecem como opção rápida ao criar uma live.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                <tr>
                  <th className="p-3">{isCoupon ? "Código" : "Título"}</th>
                  <th className="p-3">Descrição</th>
                  <th className="p-3 text-right">Lives</th>
                  {isCoupon && <th className="p-3 text-right">Usos</th>}
                  <th className="p-3 text-right">Visualizações</th>
                  <th className="p-3 text-right">Cliques</th>
                  <th className="w-24 p-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const m = metrics[p.id];
                  return (
                    <tr key={p.id} className="border-t border-slate-100">
                      <td className="p-3 font-bold text-slate-800">{p.title}</td>
                      <td className="max-w-[260px] truncate p-3 text-slate-600">{p.description || "—"}</td>
                      <td className="p-3 text-right tabular-nums">{fmt(m?.lives_count)}</td>
                      {isCoupon && <td className="p-3 text-right font-semibold tabular-nums">{fmt(m?.uses)}</td>}
                      <td className="p-3 text-right tabular-nums">{fmt(m?.views)}</td>
                      <td className="p-3 text-right tabular-nums">{fmt(m?.clicks)}</td>
                      <td className="p-3 text-center">
                        <button type="button" title="Editar" onClick={() => openEdit(p)} className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-sky-50 hover:text-sky-600">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button type="button" title="Excluir" onClick={() => setDel(p)} className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600">
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

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h2 className="text-lg font-bold text-slate-800">Cupons e Avisos</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Atalhos reutilizáveis nas suas lives. Lives, visualizações e cliques somam as lives em que o atalho foi usado.
        </p>
      </div>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

      {section("coupon")}
      {section("advantage")}

      <AppModal
        open={form.open}
        title={(form.id ? "EDITAR " : "NOVO ") + (isCouponForm ? "CUPOM" : "AVISO")}
        busy={form.busy}
        onClose={() => setForm(EMPTY)}
        footer={
          <>
            <Button variant="outline" disabled={form.busy} onClick={() => setForm(EMPTY)} className="h-10 flex-1 rounded-2xl text-xs font-bold">
              Cancelar
            </Button>
            <Button disabled={form.busy} onClick={save} className="h-10 flex-1 rounded-2xl bg-[#0088ff] text-xs font-bold text-white hover:bg-[#0077e6]">
              {form.busy ? "Salvando..." : "Salvar"}
            </Button>
          </>
        }
      >
        <div className="w-full space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600">{isCouponForm ? "Código do cupom" : "Título do aviso"}</label>
            <input
              autoFocus
              value={form.title}
              maxLength={120}
              disabled={form.busy}
              placeholder={isCouponForm ? "Ex.: LIVE10" : "Ex.: Frete grátis"}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value, error: "" }))}
              onKeyDown={(e) => { if (e.key === "Enter") save(); }}
              className={inputCls}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600">Descrição</label>
            <input
              value={form.description}
              maxLength={300}
              disabled={form.busy}
              placeholder={isCouponForm ? "Ex.: 10% OFF" : "Ex.: Em compras acima de R$ 199"}
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
        title={del?.kind === "coupon" ? "EXCLUIR CUPOM" : "EXCLUIR AVISO"}
        itemName={del?.title || ""}
        busy={delBusy}
        onClose={() => setDel(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}