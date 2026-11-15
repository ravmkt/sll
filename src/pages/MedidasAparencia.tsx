import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Cfg = {
  modal_image_url: string | null;
  modal_image_fit: "cover" | "contain";
  modal_image_position: "center" | "top" | "bottom";
  show_modal_title: boolean;
  set_layout: "combined" | "separate";
};
type MC = Record<string, any>;
type F = { s: string; k: string; l: string; t: "text" | "color" | "num" | "bool" | "sel"; o?: string[][] };

const DEFAULTS: Cfg = {
  modal_image_url: null,
  modal_image_fit: "cover",
  modal_image_position: "center",
  show_modal_title: false,
  set_layout: "combined",
};

const MC0: MC = {
  modal_bg: "#ffffff",
  modal_border: false, modal_border_width: 1, modal_border_color: "#e5e7eb",
  modal_rounded: true, modal_radius: 16,
  title_text: "Selecione um tamanho e verifique as medidas", title_color: "#374151", title_size: 14,
  chip_shape: "rounded", chip_bg: "#ffffff", chip_border_color: "#d1d5db", chip_text_color: "#111111",
  chip_active_bg: "#ffffff", chip_active_border_color: "#111111", chip_active_text_color: "#111111",
  table_label_color: "#374151", table_value_color: "#111111", table_line_color: "#e5e7eb",
  hl_label: "Numeração", hl_style: "filled", hl_bg: "#111111", hl_color: "#ffffff", hl_size: 18,
  genders: "both",
  tryon_title: "Provador Virtual", tryon_btn_bg: "#111111", tryon_btn_color: "#ffffff",
  body_title: "Ajuste o formato do corpo",
  body_text: "Este é o formato aproximado do corpo que geramos com suas medidas. Ajuste somente se for necessário.",
  slider_color: "#111111", body_fill: "#e8c4a8",
  result_label: "MELHOR OPÇÃO", result_size_font: 28, result_accent: "#111111",
};

const FIELDS: F[] = [
  { s: "Modal", k: "modal_bg", l: "Cor de fundo", t: "color" },
  { s: "Modal", k: "modal_border", l: "Ter borda", t: "bool" },
  { s: "Modal", k: "modal_border_width", l: "Espessura da borda (px)", t: "num" },
  { s: "Modal", k: "modal_border_color", l: "Cor da borda", t: "color" },
  { s: "Modal", k: "modal_rounded", l: "Cantos arredondados", t: "bool" },
  { s: "Modal", k: "modal_radius", l: "Raio dos cantos (px)", t: "num" },
  { s: "Texto de chamada", k: "title_text", l: "Texto", t: "text" },
  { s: "Texto de chamada", k: "title_color", l: "Cor", t: "color" },
  { s: "Texto de chamada", k: "title_size", l: "Tamanho (px)", t: "num" },
  { s: "Botões de tamanho", k: "chip_shape", l: "Formato", t: "sel", o: [["square", "Quadrado"], ["rounded", "Arredondado"], ["round", "Redondo (pílula)"]] },
  { s: "Botões de tamanho", k: "chip_bg", l: "Fundo", t: "color" },
  { s: "Botões de tamanho", k: "chip_border_color", l: "Cor da borda", t: "color" },
  { s: "Botões de tamanho", k: "chip_text_color", l: "Cor do texto", t: "color" },
  { s: "Botões de tamanho", k: "chip_active_bg", l: "Fundo (selecionado)", t: "color" },
  { s: "Botões de tamanho", k: "chip_active_border_color", l: "Borda (selecionado)", t: "color" },
  { s: "Botões de tamanho", k: "chip_active_text_color", l: "Texto (selecionado)", t: "color" },
  { s: "Tabela de medidas", k: "table_label_color", l: "Cor dos nomes", t: "color" },
  { s: "Tabela de medidas", k: "table_value_color", l: "Cor dos valores", t: "color" },
  { s: "Tabela de medidas", k: "table_line_color", l: "Cor das linhas", t: "color" },
  { s: "Destaque da numeração", k: "hl_label", l: "Texto (ex.: Numeração, Veste)", t: "text" },
  { s: "Destaque da numeração", k: "hl_style", l: "Estilo", t: "sel", o: [["filled", "Pintado (com fundo)"], ["plain", "Sem fundo, em negrito"]] },
  { s: "Destaque da numeração", k: "hl_bg", l: "Cor de fundo", t: "color" },
  { s: "Destaque da numeração", k: "hl_color", l: "Cor do texto", t: "color" },
  { s: "Destaque da numeração", k: "hl_size", l: "Tamanho (px)", t: "num" },
  { s: "Provador Virtual", k: "tryon_title", l: "Texto do botão/título", t: "text" },
  { s: "Provador Virtual", k: "genders", l: "Gêneros exibidos", t: "sel", o: [["both", "Feminino e masculino"], ["f", "Só feminino"], ["m", "Só masculino"]] },
  { s: "Provador Virtual", k: "tryon_btn_bg", l: "Fundo do botão", t: "color" },
  { s: "Provador Virtual", k: "tryon_btn_color", l: "Texto do botão", t: "color" },
  { s: "Ajuste do corpo", k: "body_title", l: "Título", t: "text" },
  { s: "Ajuste do corpo", k: "body_text", l: "Texto de apoio", t: "text" },
  { s: "Ajuste do corpo", k: "slider_color", l: "Cor dos sliders", t: "color" },
  { s: "Ajuste do corpo", k: "body_fill", l: "Cor do corpo", t: "color" },
  { s: "Resultado", k: "result_label", l: "Texto \"melhor opção\"", t: "text" },
  { s: "Resultado", k: "result_size_font", l: "Tamanho da letra do tamanho (px)", t: "num" },
  { s: "Resultado", k: "result_accent", l: "Cor de destaque", t: "color" },
];
const SECTIONS = Array.from(new Set(FIELDS.map((f) => f.s)));
const SIZES = ["XPP", "PP", "P", "M", "G", "GG"];
const ROWS: string[][] = [["Busto", "93 cm"], ["Cintura", "76 cm"], ["Quadril", "100 cm"], ["Comprimento", "98 cm"], ["Manga", "59 cm"]];

const db = () => (supabase as any).schema("sizeadvisor");

export default function MedidasAparencia({ storeId: propStoreId }: { storeId?: string }) {
  const [storeId, setStoreId] = useState<string | null>(propStoreId ?? null);
  const [c, setC] = useState<Cfg>(DEFAULTS);
  const [mc, setMc] = useState<MC>(MC0);
  const [sel, setSel] = useState("XPP");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const set = <K extends keyof Cfg>(k: K, v: Cfg[K]) => setC((p) => ({ ...p, [k]: v }));
  const setM = (k: string, v: any) => setMc((p) => ({ ...p, [k]: v }));

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
        .select("modal_image_url, modal_image_fit, modal_image_position, show_modal_title, set_layout, modal_config")
        .eq("store_id", storeId)
        .maybeSingle();
      if (error) setMsg({ ok: false, text: "Erro ao carregar: " + error.message });
      else if (data) {
        const { modal_config, ...rest } = data as any;
        setC({ ...DEFAULTS, ...rest });
        setMc({ ...MC0, ...(modal_config ?? {}) });
      }
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
    if (error) setMsg({ ok: false, text: "Erro no upload: " + error.message });
    else set("modal_image_url", supabase.storage.from("medidas").getPublicUrl(path).data.publicUrl);
    setUploading(false);
  }

  async function save() {
    if (!storeId) return;
    setSaving(true);
    setMsg(null);
    const payload = { ...c, modal_config: mc, updated_at: new Date().toISOString() };
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

  const lab = "block text-xs font-medium text-gray-700 mb-1";
  const inp = "w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm";

  const renderField = (f: F) => {
    const v = mc[f.k];
    if (f.t === "bool")
      return (
        <label key={f.k} className="flex items-center gap-2 text-sm col-span-2">
          <input type="checkbox" checked={!!v} onChange={(e) => setM(f.k, e.target.checked)} /> {f.l}
        </label>
      );
    return (
      <div key={f.k} className={f.t === "text" ? "col-span-2" : ""}>
        <label className={lab}>{f.l}</label>
        {f.t === "color" && (
          <div className="flex gap-2">
            <input type="color" value={v} onChange={(e) => setM(f.k, e.target.value)} className="h-8 w-10 rounded border" />
            <input className={inp} value={v} onChange={(e) => setM(f.k, e.target.value)} />
          </div>
        )}
        {f.t === "num" && <input type="number" className={inp} value={v} onChange={(e) => setM(f.k, Number(e.target.value))} />}
        {f.t === "text" && <input className={inp} value={v} onChange={(e) => setM(f.k, e.target.value)} />}
        {f.t === "sel" && (
          <select className={inp} value={v} onChange={(e) => setM(f.k, e.target.value)}>
            {f.o!.map(([val, name]) => <option key={val} value={val}>{name}</option>)}
          </select>
        )}
      </div>
    );
  };

  const radius = mc.modal_rounded ? mc.modal_radius : 0;
  const chipR = mc.chip_shape === "round" ? 999 : mc.chip_shape === "rounded" ? 8 : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Medidas → Aparência do modal</h1>
      <p className="text-sm text-gray-600 mb-6">Tudo o que você alterar aparece na prévia ao lado. Clique em Salvar para publicar na loja.</p>

      <div className="grid lg:grid-cols-[420px_1fr] gap-8">
        <div className="space-y-6">
          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wide">Foto</h2>
            <div>
              <label className={lab}>Foto do modal</label>
              <input type="file" accept="image/*" disabled={uploading} className={inp}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
              <p className="text-xs text-gray-500 mt-1">{uploading ? "Enviando..." : "Ideal: vertical, 800 × 1000 px ou maior."}</p>
              {c.modal_image_url && (
                <button type="button" className="text-xs text-red-600 underline mt-1" onClick={() => set("modal_image_url", null)}>remover foto</button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lab}>Ajuste</label>
                <select className={inp} value={c.modal_image_fit} onChange={(e) => set("modal_image_fit", e.target.value as Cfg["modal_image_fit"])}>
                  <option value="cover">Preencher tudo</option>
                  <option value="contain">Mostrar inteira</option>
                </select>
              </div>
              <div>
                <label className={lab}>Foco</label>
                <select className={inp} value={c.modal_image_position} onChange={(e) => set("modal_image_position", e.target.value as Cfg["modal_image_position"])}>
                  <option value="center">Centro</option>
                  <option value="top">Topo</option>
                  <option value="bottom">Base</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm col-span-2">
                <input type="checkbox" checked={c.show_modal_title} onChange={(e) => set("show_modal_title", e.target.checked)} />
                Mostrar o título "Tabela de tamanhos"
              </label>
              <div className="col-span-2">
                <label className={lab}>Produtos de conjunto</label>
                <select className={inp} value={c.set_layout} onChange={(e) => set("set_layout", e.target.value as Cfg["set_layout"])}>
                  <option value="combined">Tabela única: blusa + calça</option>
                  <option value="separate">Peças separadas</option>
                </select>
              </div>
            </div>
          </section>

          {SECTIONS.map((s) => (
            <section key={s} className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wide">{s}</h2>
              <div className="grid grid-cols-2 gap-3">{FIELDS.filter((f) => f.s === s).map(renderField)}</div>
            </section>
          ))}

          <div className="flex items-center gap-3 sticky bottom-0 bg-white py-3 border-t">
            <button type="button" onClick={save} disabled={saving || uploading}
              className="rounded-md bg-black text-white px-5 py-2 text-sm font-semibold disabled:opacity-50">
              {saving ? "Salvando..." : "Salvar"}
            </button>
            <button type="button" onClick={() => { setC(DEFAULTS); setMc(MC0); }} className="rounded-md border border-gray-300 px-4 py-2 text-sm">
              Restaurar padrão
            </button>
            {msg && <span className={"text-sm " + (msg.ok ? "text-green-700" : "text-red-600")}>{msg.text}</span>}
          </div>
        </div>

        <div className="lg:sticky lg:top-4 self-start">
          <p className="text-sm font-medium text-gray-700 mb-2">Prévia do modal</p>
          <div className="grid overflow-hidden shadow-sm"
            style={{
              gridTemplateColumns: "45% 55%", minHeight: 480, background: mc.modal_bg, borderRadius: radius,
              border: mc.modal_border ? `${mc.modal_border_width}px solid ${mc.modal_border_color}` : "1px solid #e5e7eb",
            }}>
            <div className="relative bg-gray-100">
              <img src={c.modal_image_url || "/assets/mock/prod-bazer.jpg"} alt="Foto do modal" className="absolute inset-0 w-full h-full"
                style={{ objectFit: c.modal_image_fit, objectPosition: c.modal_image_position }}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
            </div>
            <div className="p-5 flex flex-col gap-3">
              {c.show_modal_title && <p className="font-bold text-center">Tabela de tamanhos</p>}
              <p className="text-center" style={{ color: mc.title_color, fontSize: mc.title_size }}>{mc.title_text}</p>
              <div className="flex gap-2 justify-center flex-wrap">
                {SIZES.map((t) => {
                  const on = t === sel;
                  return (
                    <button key={t} type="button" onClick={() => setSel(t)}
                      style={{
                        borderRadius: chipR, padding: "6px 14px", fontSize: 13,
                        background: on ? mc.chip_active_bg : mc.chip_bg,
                        color: on ? mc.chip_active_text_color : mc.chip_text_color,
                        border: `${on ? 2 : 1}px solid ${on ? mc.chip_active_border_color : mc.chip_border_color}`,
                      }}>{t}</button>
                  );
                })}
              </div>
              <div className="flex justify-between items-center"
                style={mc.hl_style === "filled"
                  ? { background: mc.hl_bg, color: mc.hl_color, borderRadius: 8, padding: "8px 12px", fontSize: mc.hl_size, fontWeight: 700 }
                  : { color: mc.table_value_color, padding: "6px 0", fontSize: mc.hl_size, fontWeight: 700, borderBottom: `1px solid ${mc.table_line_color}` }}>
                <span>{mc.hl_label}</span><span>40</span>
              </div>
              <div>
                {ROWS.map(([k, v]) => (
                  <div key={k} className="flex justify-between py-2 text-sm" style={{ borderBottom: `1px solid ${mc.table_line_color}` }}>
                    <span style={{ color: mc.table_label_color }}>{k}</span>
                    <span style={{ color: mc.table_value_color }}>{v}</span>
                  </div>
                ))}
              </div>
              <button type="button" className="mt-auto py-2.5 text-sm font-bold"
                style={{ background: mc.tryon_btn_bg, color: mc.tryon_btn_color, borderRadius: Math.min(radius, 10) }}>
                {mc.tryon_title}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}