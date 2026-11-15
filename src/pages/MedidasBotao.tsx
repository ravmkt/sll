import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Settings = {
  button_text: string;
  bg_color: string;
  text_color: string;
  border_color: string | null;
  radius: number;
  full_width: boolean;
  position: "before_size" | "before_buy";
  anchor_selector: string | null;
};

const DEFAULTS: Settings = {
  button_text: "Descubra seu tamanho",
  bg_color: "#111111",
  text_color: "#ffffff",
  border_color: null,
  radius: 6,
  full_width: true,
  position: "before_size",
  anchor_selector: null,
};

const db = () => (supabase as any).schema("sizeadvisor");

function hex6(v: string | null | undefined, fallback: string) {
  if (!v) return fallback;
  const m = /^#([0-9a-f]{3})$/i.exec(v);
  if (m) return "#" + m[1].split("").map((c) => c + c).join("");
  return /^#[0-9a-f]{6}$/i.test(v) ? v : fallback;
}

export default function MedidasBotao({ storeId: propStoreId }: { storeId?: string }) {
  const [storeId, setStoreId] = useState<string | null>(propStoreId ?? null);
  const [s, setS] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS((p) => ({ ...p, [k]: v }));

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
        .select("*")
        .eq("store_id", storeId)
        .maybeSingle();
      if (error) setMsg({ ok: false, text: "Erro ao carregar: " + error.message });
      else if (data) setS({ ...DEFAULTS, ...data });
      setLoading(false);
    })();
  }, [storeId]);

  async function save() {
    if (!storeId) return;
    setSaving(true);
    setMsg(null);
    const payload = {
      store_id: storeId,
      button_text: s.button_text.trim() || DEFAULTS.button_text,
      bg_color: s.bg_color,
      text_color: s.text_color,
      border_color: s.border_color || null,
      radius: Number(s.radius) || 0,
      full_width: s.full_width,
      position: s.position,
      anchor_selector: s.anchor_selector?.trim() || null,
      updated_at: new Date().toISOString(),
    };
    const { error } = await db().from("widget_settings").upsert(payload, { onConflict: "store_id" });
    setSaving(false);
    setMsg(error ? { ok: false, text: "Erro ao salvar: " + error.message } : { ok: true, text: "Salvo! O botão atualiza na loja em instantes." });
  }

  const btnStyle = useMemo<React.CSSProperties>(() => ({
    display: s.full_width ? "block" : "inline-block",
    width: s.full_width ? "100%" : undefined,
    margin: "10px 0",
    padding: "12px 20px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 14,
    background: s.bg_color,
    color: s.text_color,
    border: `1px solid ${s.border_color || s.bg_color}`,
    borderRadius: s.radius,
  }), [s]);

  const PreviewButton = <button type="button" style={btnStyle}>{s.button_text || DEFAULTS.button_text}</button>;

  if (loading) return <div className="p-6 text-sm text-gray-500">Carregando...</div>;
  if (!storeId) return <div className="p-6 text-sm text-red-600">Nenhuma loja encontrada para este usuário.</div>;

  const label = "block text-sm font-medium text-gray-700 mb-1";
  const input = "w-full rounded-md border border-gray-300 px-3 py-2 text-sm";

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Medidas → Botão</h1>
      <p className="text-sm text-gray-600 mb-6">
        Personalize o botão que abre a tabela de medidas na página de produto da loja.
      </p>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div>
            <label className={label}>Texto do botão</label>
            <input className={input} value={s.button_text} maxLength={40}
              onChange={(e) => set("button_text", e.target.value)} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={label}>Fundo</label>
              <input type="color" className="h-10 w-full rounded border border-gray-300"
                value={hex6(s.bg_color, "#111111")} onChange={(e) => set("bg_color", e.target.value)} />
            </div>
            <div>
              <label className={label}>Texto</label>
              <input type="color" className="h-10 w-full rounded border border-gray-300"
                value={hex6(s.text_color, "#ffffff")} onChange={(e) => set("text_color", e.target.value)} />
            </div>
            <div>
              <label className={label}>Borda</label>
              <input type="color" className="h-10 w-full rounded border border-gray-300"
                value={hex6(s.border_color, hex6(s.bg_color, "#111111"))}
                onChange={(e) => set("border_color", e.target.value)} />
              <button type="button" className="text-xs text-gray-500 underline mt-1"
                onClick={() => set("border_color", null)}>mesma do fundo</button>
            </div>
          </div>

          <div>
            <label className={label}>Arredondamento: {s.radius}px</label>
            <input type="range" min={0} max={30} value={s.radius} className="w-full"
              onChange={(e) => set("radius", Number(e.target.value))} />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={s.full_width} onChange={(e) => set("full_width", e.target.checked)} />
            Ocupar a largura toda
          </label>

          <div>
            <label className={label}>Posição</label>
            <select className={input} value={s.position}
              onChange={(e) => set("position", e.target.value as Settings["position"])}>
              <option value="before_size">Antes do seletor de tamanho</option>
              <option value="before_buy">Antes do botão Comprar</option>
            </select>
          </div>

          <div>
            <label className={label}>Seletor CSS personalizado (opcional)</label>
            <input className={input} placeholder=".product-sizes" value={s.anchor_selector ?? ""}
              onChange={(e) => set("anchor_selector", e.target.value)} />
            <p className="text-xs text-gray-500 mt-1">
              Use só se o botão cair no lugar errado. O botão entra logo depois desse elemento.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button type="button" onClick={save} disabled={saving}
              className="rounded-md bg-black text-white px-5 py-2 text-sm font-semibold disabled:opacity-50">
              {saving ? "Salvando..." : "Salvar"}
            </button>
            <button type="button" onClick={() => setS(DEFAULTS)}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm">
              Restaurar padrão
            </button>
          </div>
          {msg && <p className={"text-sm " + (msg.ok ? "text-green-700" : "text-red-600")}>{msg.text}</p>}
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Prévia na página de produto</p>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="h-36 rounded-lg bg-gradient-to-br from-gray-100 to-gray-300 mb-4" />
            <p className="font-semibold">Blusa Marina</p>
            <p className="text-lg font-bold mb-3">R$ 129,90</p>

            {s.position === "before_size" && PreviewButton}
            <p className="text-xs text-gray-500 mb-1">Tamanho</p>
            <div className="flex gap-2 mb-3">
              {["PP", "P", "M", "G", "GG"].map((t) => (
                <span key={t} className={"rounded border px-3 py-1.5 text-sm " + (t === "M" ? "border-black" : "border-gray-300")}>{t}</span>
              ))}
            </div>
            {s.position === "before_buy" && PreviewButton}
            <button type="button" className="w-full rounded bg-green-600 text-white py-3 font-bold">COMPRAR</button>
          </div>
        </div>
      </div>
    </div>
  );
}