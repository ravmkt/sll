import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Cfg = {
  modal_image_url: string | null;
  modal_image_fit: "cover" | "contain";
  modal_image_position: "center" | "top" | "bottom";
  show_modal_title: boolean;
  set_layout: "combined" | "separate";
};

const DEFAULTS: Cfg = {
  modal_image_url: null,
  modal_image_fit: "cover",
  modal_image_position: "center",
  show_modal_title: false,
  set_layout: "combined",
};

const db = () => (supabase as any).schema("sizeadvisor");

const SAMPLE = {
  Blusa: [["Busto", "92 cm"], ["Cintura", "90 cm"], ["Quadril", "92 cm"], ["Comprimento", "60 cm"]],
  "Calça": [["Cintura", "76 cm"], ["Quadril", "100 cm"], ["Comprimento", "98 cm"]],
} as Record<string, string[][]>;

export default function MedidasAparencia({ storeId: propStoreId }: { storeId?: string }) {
  const [storeId, setStoreId] = useState<string | null>(propStoreId ?? null);
  const [c, setC] = useState<Cfg>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const set = <K extends keyof Cfg>(k: K, v: Cfg[K]) => setC((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (propStoreId) { setStoreId(propStoreId); return; }
    (async () => {
      const { data } = await supabase.from("stores").select("id").limit(1).maybeSingle();
      if (data?.id) setStoreId(data.id as string);
      else setLoading(false);
    })();
  }, [propStoreId]);

  useEffect(() => {
    if (!storeId) return;
    (async () => {
      setLoading(true);
      const { data, error } = await db()
        .from("widget_settings")
        .select("modal_image_url, modal_image_fit, modal_image_position, show_modal_title, set_layout")
        .eq("store_id", storeId)
        .maybeSingle();
      if (error) setMsg({ ok: false, text: "Erro ao carregar: " + error.message });
      else if (data) setC({ ...DEFAULTS, ...data });
      setLoading(false);
    })();
  }, [storeId]);

  async function upload(file: File) {
    if (!storeId) return;
    setUploading(true);
    setMsg(null);
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${storeId}/modal-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("medidas").upload(path, file, { upsert: true, contentType: file.type });
    if (error) {
      setMsg({ ok: false, text: "Erro no upload: " + error.message });
    } else {
      const { data } = supabase.storage.from("medidas").getPublicUrl(path);
      set("modal_image_url", data.publicUrl);
    }
    setUploading(false);
  }

  async function save() {
    if (!storeId) return;
    setSaving(true);
    setMsg(null);
    const payload = { ...c, updated_at: new Date().toISOString() };
    const upd = await db().from("widget_settings").update(payload).eq("store_id", storeId).select("store_id");
    let error = upd.error;
    if (!error && (!upd.data || upd.data.length === 0)) {
      const ins = await db().from("widget_settings").insert({ store_id: storeId, ...payload });
      error = ins.error;
    }
    setSaving(false);
    setMsg(error
      ? { ok: false, text: "Erro ao salvar: " + error.message }
      : { ok: true, text: "Salvo! O modal atualiza na loja em instantes." });
  }

  if (loading) return <div className="p-6 text-sm text-gray-500">Carregando...</div>;
  if (!storeId) return <div className="p-6 text-sm text-red-600">Nenhuma loja encontrada para este usuário.</div>;

  const label = "block text-sm font-medium text-gray-700 mb-1";
  const input = "w-full rounded-md border border-gray-300 px-3 py-2 text-sm";
  const combined = c.set_layout === "combined";

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Medidas → Aparência do modal</h1>
      <p className="text-sm text-gray-600 mb-6">
        Defina a foto que ocupa a metade do modal e como o conjunto (blusa + calça) é exibido.
      </p>

      <div className="grid lg:grid-cols-[380px_1fr] gap-8">
        <div className="space-y-5">
          <div>
            <label className={label}>Foto do modal</label>
            <input type="file" accept="image/*" disabled={uploading} className={input}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
            <p className="text-xs text-gray-500 mt-1">
              {uploading ? "Enviando..." : "Ideal: vertical, 800 × 1000 px ou maior."}
            </p>
            {c.modal_image_url && (
              <button type="button" className="text-xs text-red-600 underline mt-1"
                onClick={() => set("modal_image_url", null)}>remover foto</button>
            )}
          </div>

          <div>
            <label className={label}>Ajuste da foto</label>
            <select className={input} value={c.modal_image_fit}
              onChange={(e) => set("modal_image_fit", e.target.value as Cfg["modal_image_fit"])}>
              <option value="cover">Preencher toda a metade (corta as bordas)</option>
              <option value="contain">Mostrar inteira (pode sobrar espaço)</option>
            </select>
          </div>

          <div>
            <label className={label}>Foco da foto</label>
            <select className={input} value={c.modal_image_position}
              onChange={(e) => set("modal_image_position", e.target.value as Cfg["modal_image_position"])}>
              <option value="center">Centro</option>
              <option value="top">Topo (rosto)</option>
              <option value="bottom">Base</option>
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={c.show_modal_title}
              onChange={(e) => set("show_modal_title", e.target.checked)} />
            Mostrar o título "Tabela de tamanhos"
          </label>

          <div>
            <label className={label}>Produtos de conjunto</label>
            <select className={input} value={c.set_layout}
              onChange={(e) => set("set_layout", e.target.value as Cfg["set_layout"])}>
              <option value="combined">Tabela única: blusa + calça no mesmo tamanho</option>
              <option value="separate">Peças separadas</option>
            </select>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button type="button" onClick={save} disabled={saving || uploading}
              className="rounded-md bg-black text-white px-5 py-2 text-sm font-semibold disabled:opacity-50">
              {saving ? "Salvando..." : "Salvar"}
            </button>
            <button type="button" onClick={() => setC(DEFAULTS)}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm">
              Restaurar padrão
            </button>
          </div>
          {msg && <p className={"text-sm " + (msg.ok ? "text-green-700" : "text-red-600")}>{msg.text}</p>}
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Prévia do modal</p>
          <div className="grid grid-cols-2 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden" style={{ minHeight: 440 }}>
            <div className="relative bg-gray-100">
              <img src={c.modal_image_url || "/assets/mock/prod-bazer.jpg"} alt="Foto do modal"
                className="absolute inset-0 w-full h-full"
                style={{ objectFit: c.modal_image_fit, objectPosition: c.modal_image_position }}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
              {!c.modal_image_url && (
                <span className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-[10px] text-white">
                  foto de exemplo
                </span>
              )}
            </div>

            <div className="p-5 flex flex-col gap-3">
              {c.show_modal_title && <p className="font-bold text-center">Tabela de tamanhos</p>}
              <p className="text-xs text-center text-gray-600">Selecione um tamanho</p>
              <div className="flex gap-2 justify-center flex-wrap">
                {["PP", "P", "M", "G", "GG"].map((t) => (
                  <span key={t} className={"rounded border px-3 py-1.5 text-sm " + (t === "M" ? "border-black" : "border-gray-300")}>{t}</span>
                ))}
              </div>

              <div className="text-xs text-gray-500 text-center">
                {combined ? "Conjunto no tamanho M (blusa + calça)" : "Blusa no tamanho M"}
              </div>

              {(combined ? Object.keys(SAMPLE) : ["Blusa"]).map((g) => (
                <div key={g}>
                  {combined && <p className="text-xs font-bold uppercase tracking-wide text-gray-700 mt-1 mb-1">{g}</p>}
                  {SAMPLE[g].map(([k, v]) => (
                    <div key={k} className="flex justify-between border-b py-1.5 text-sm">
                      <span>{k}</span><span>{v}</span>
                    </div>
                  ))}
                </div>
              ))}

              <button type="button" className="mt-auto rounded-md bg-black text-white py-2.5 text-sm font-bold">
                Provador Virtual
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}