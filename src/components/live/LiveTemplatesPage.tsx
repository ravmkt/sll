import { useCallback, useEffect, useState } from "react";
import PageTour from "@/components/tour/PageTour";
import type { TourStep } from "@/hooks/usePageTour";
import { Eye, Palette, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { INITIAL_TEMPLATES } from "@/components/live/LiveAppearanceModal";
import type { LiveAppearanceTemplate } from "@/components/live/LiveAppearanceModal";
import { LiveTemplatesService } from "@/services/LiveTemplatesService";
import { ConfirmDangerModal } from "@/components/common/AppModal";

// Preenchido pelo LiveCommerce com o id da loja ativa
export const liveStore: { id: string | null } = { id: null };

const FORMATS: Record<string, string> = {
  portrait: "Retrato 9:16",
  landscape: "Paisagem 16:9",
  square: "Quadrado 1:1",
  circle: "Circular",
  circular: "Circular",
};

function openEditor(templateId: string) {
  window.dispatchEvent(new CustomEvent("live:open-appearance", { detail: { templateId } }));
}

function imageFor(name: string): string | null {
  const n = String(name || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  if (n.startsWith("vidlytics")) return "/assets/streamsell-template-01.jpg";
  if (n.startsWith("black friday")) return "/assets/streamsell-template-03.jpg";
  if (n.startsWith("live")) return "/assets/streamsell-template-04.jpg";
  if (n.startsWith("aniversario")) return "/assets/streamsell-template-02.jpg";
  return null;
}

function Mockup({ d }: { d: any }) {
  const main = d.borderColor || d.ctaBgColor || "#0094EB";
  const cta = d.ctaBgColor || main;
  return (
    <div className="flex h-full w-full items-center justify-center bg-slate-50">
      <div className="flex h-[78%] aspect-[9/16] flex-col justify-between rounded-xl border-2 bg-white p-2 shadow-md" style={{ borderColor: main }}>
        <div className="flex items-center justify-between">
          <span className="h-2 w-2 rounded-full" style={{ background: main }} />
          <span className="text-[8px] font-bold text-slate-400">LIVE</span>
        </div>
        <div className="h-1/2 rounded bg-slate-100" />
        <div className="rounded-full py-0.5 text-center text-[8px] font-bold" style={{ background: cta, color: d.ctaTextColor || "#fff" }}>
          {d.ctaText || "Participe"}
        </div>
      </div>
    </div>
  );
}

function TemplateCard({
  t,
  onRemove,
}: {
  t: LiveAppearanceTemplate;
  onRemove?: (t: LiveAppearanceTemplate) => void;
}) {
  const d: any = t.divulgacao?.desktop || {};
  const src = imageFor(t.name);
  const [failed, setFailed] = useState(false);
  const format = FORMATS[String(d.format || "portrait")] || "Retrato 9:16";

  return (
    <div className="flex w-[320px] max-w-full shrink-0 flex-col gap-2">
      <div className="flex items-center justify-between gap-2 px-1">
        <span className="truncate text-sm font-medium text-slate-600">{t.name}</span>
        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{format}</span>
      </div>

      <div
        onClick={() => openEditor(t.id)}
        className="group relative aspect-[16/10] w-full cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md"
      >
        {src && !failed ? (
          <img
            src={src}
            alt={t.name}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            onError={() => setFailed(true)}
          />
        ) : (
          <Mockup d={d} />
        )}
        <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/5" />
      </div>

      <div className="flex items-center justify-center gap-1 pt-1">
        <button
          type="button"
          onClick={() => openEditor(t.id)}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium text-slate-400 transition-colors hover:text-slate-700"
        >
          <Eye size={15} />
          {"Visualizar"}
        </button>
        {onRemove && (
          <button
            type="button"
            title={"Excluir template"}
            onClick={() => onRemove(t)}
            className="cursor-pointer rounded-md p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>
    </div>
  );
}

const APARENCIA_TOUR: TourStep[] = [
  { element: '[data-tour="aparencia-novo"]', title: 'Novo template', description: 'Crie um tema pr\u00f3prio para o widget de divulga\u00e7\u00e3o, o selo "ao vivo" e o player.', side: 'bottom' },
  { element: '[data-tour="aparencia-fabrica"]', title: 'Modelos de f\u00e1brica', description: 'Escolha um modelo e clique em Visualizar. O original nunca \u00e9 sobrescrito: ao salvar, voc\u00ea cria uma c\u00f3pia com o seu nome.', side: 'top' },
  { element: '[data-tour="aparencia-meus"]', title: 'Meus templates', description: 'Seus temas salvos ficam aqui para editar ou excluir.', side: 'top' },
];

export default function LiveTemplatesPage() {
  const [customs, setCustoms] = useState<LiveAppearanceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [delTpl, setDelTpl] = useState<LiveAppearanceTemplate | null>(null);

  const load = useCallback(async () => {
    const id = liveStore.id;
    if (!id) return;
    try {
      setError("");
      setCustoms(await LiveTemplatesService.list(id));
    } catch (e) {
      console.error(e);
      setError("N\u00e3o foi poss\u00edvel carregar seus templates.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    window.addEventListener("live:templates-changed", load);
    return () => window.removeEventListener("live:templates-changed", load);
  }, [load]);

  const remove = async (t: LiveAppearanceTemplate) => {
    setDelTpl(null);
    try {
      await LiveTemplatesService.remove(t.id);
      setCustoms((prev) => prev.filter((x) => x.id !== t.id));
    } catch (e) {
      console.error(e);
      setError("N\u00e3o foi poss\u00edvel excluir o template.");
    }
  };

  return (
    <div className="w-full space-y-6 p-6">
      <PageTour tourKey="live-aparencia" steps={APARENCIA_TOUR} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800">
            <Palette className="h-5 w-5 text-rose-600" /> {"Apar\u00eancia da Live"}
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {"Escolha um tema para personalizar ou crie o seu. Os modelos de f\u00e1brica nunca s\u00e3o sobrescritos: ao salvar, voc\u00ea d\u00e1 um nome e cria uma c\u00f3pia."}
          </p>
        </div>
        <Button data-tour="aparencia-novo" onClick={() => openEditor("preset_padrao")} className="gap-2 bg-rose-600 text-white hover:bg-rose-700">
          <Plus className="h-4 w-4" /> Novo template
        </Button>
      </div>

      <ConfirmDangerModal
        open={!!delTpl}
        title="EXCLUIR TEMPLATE"
        itemName={delTpl?.name || ""}
        onClose={() => setDelTpl(null)}
        onConfirm={() => { if (delTpl) remove(delTpl); }}
      />

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
      )}

      <section data-tour="aparencia-fabrica" className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">{"Modelos de f\u00e1brica"}</h3>
        <div className="flex flex-wrap gap-6">
          {INITIAL_TEMPLATES.map((t) => (
            <TemplateCard key={t.id} t={t} />
          ))}
        </div>
      </section>

      <section data-tour="aparencia-meus" className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Meus templates</h3>
        {loading ? (
          <p className="text-sm text-slate-400">Carregando...</p>
        ) : customs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
            {"Voc\u00ea ainda n\u00e3o criou templates. Personalize um modelo de f\u00e1brica e salve com um nome."}
          </div>
        ) : (
          <div className="flex flex-wrap gap-6">
            {customs.map((t) => (
              <TemplateCard key={t.id} t={t} onRemove={(x) => setDelTpl(x)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}