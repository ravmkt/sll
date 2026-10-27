import { useCallback, useEffect, useState } from "react";
import PageTour from "@/components/tour/PageTour";
import type { TourStep } from "@/hooks/usePageTour";
import { Palette, Plus, Pencil, Trash2 } from "lucide-react";
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

function TemplateCard({
  t,
  onRemove,
}: {
  t: LiveAppearanceTemplate;
  onRemove?: (t: LiveAppearanceTemplate) => void;
}) {
  const d: any = t.divulgacao?.desktop || {};
  const colors: string[] = [d.borderColor, d.ctaBgColor, d.countdownBgColor].filter(Boolean);
  const factory = !!t.isDefault;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-800">{t.name}</p>
          <p className="text-[11px] text-slate-400">{factory ? "Modelo de fábrica" : "Tema personalizado"}</p>
        </div>
        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
          {FORMATS[String(d.format || "portrait")] || "Retrato 9:16"}
        </span>
      </div>

      <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
        <span className="text-[10px] font-bold uppercase text-slate-400">Paleta:</span>
        {colors.map((c, i) => (
          <span key={i} className="h-4 w-4 rounded-full border border-white shadow" style={{ background: c }} />
        ))}
        {d.ctaBgColor && (
          <span
            className="ml-auto rounded-full px-3 py-0.5 text-[10px] font-bold"
            style={{ background: d.ctaBgColor, color: d.ctaTextColor || "#fff" }}
          >
            {d.ctaText || "Participe"}
          </span>
        )}
      </div>

      <div className="mt-auto flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="h-8 flex-1 gap-1.5 text-xs font-semibold"
          onClick={() => openEditor(t.id)}
        >
          <Pencil className="h-3.5 w-3.5" /> {factory ? "Personalizar" : "Editar"}
        </Button>
        {!factory && onRemove && (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
            title="Excluir template"
            onClick={() => onRemove(t)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

const APARENCIA_TOUR: TourStep[] = [
  { element: '[data-tour="aparencia-novo"]', title: 'Novo template', description: 'Crie um tema pr\u00f3prio para o widget de divulga\u00e7\u00e3o, o selo "ao vivo" e o player.', side: 'bottom' },
  { element: '[data-tour="aparencia-fabrica"]', title: 'Modelos de f\u00e1brica', description: 'Escolha um modelo e clique em Personalizar. O original nunca \u00e9 sobrescrito: ao salvar, voc\u00ea cria uma c\u00f3pia com o seu nome.', side: 'top' },
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
      setError("Não foi possível carregar seus templates.");
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
      setError("Não foi possível excluir o template.");
    }
  };

  return (
    <div className="w-full space-y-6 p-6">
      <PageTour tourKey="live-aparencia" steps={APARENCIA_TOUR} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800">
            <Palette className="h-5 w-5 text-rose-600" /> Aparência da Live
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Escolha um tema para personalizar ou crie o seu. Os modelos de fábrica nunca são sobrescritos: ao salvar, você dá um nome e cria uma cópia.
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
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Modelos de fábrica</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
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
            Você ainda não criou templates. Personalize um modelo de fábrica e salve com um nome.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {customs.map((t) => (
              <TemplateCard key={t.id} t={t} onRemove={(x) => setDelTpl(x)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}