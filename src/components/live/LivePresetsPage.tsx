import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { Tag, Gift, Plus, Pencil, Trash2, Ticket } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDangerModal } from "@/components/common/AppModal";
import { liveStore } from "@/components/live/LiveTemplatesPage";
import { LivePresetsService } from "@/services/LivePresetsService";
import type { LivePreset } from "@/services/LivePresetsService";

type Kind = LivePreset["kind"];

const CFG = {
  coupon: {
    heading: "Cupons de desconto",
    hint: "Cupons que você usa com frequência. Na hora de criar a live, é só escolher.",
    Icon: Tag,
    titleLabel: "Código do cupom",
    titlePh: "Ex: LIVE15",
    descPh: "Ex: 15% OFF em todo o catálogo",
    empty: "Nenhum cupom salvo ainda.",
    newLabel: "Novo cupom",
  },
  advantage: {
    heading: "Benefícios",
    hint: "Frete grátis, brindes, presentes e outras vantagens exclusivas da live.",
    Icon: Gift,
    titleLabel: "Título do benefício",
    titlePh: "Ex: FRETE GRÁTIS ou BRINDE EXCLUSIVO",
    descPh: "Ex: Válido para compras acima de R$ 200,00",
    empty: "Nenhum benefício salvo ainda.",
    newLabel: "Novo benefício",
  },
} as const;

function useStoreId() {
  const [id, setId] = useState<string | null>(liveStore.id);
  useEffect(() => {
    if (id) return;
    const t = setInterval(() => {
      if (liveStore.id) {
        setId(liveStore.id);
        clearInterval(t);
      }
    }, 300);
    return () => clearInterval(t);
  }, [id]);
  return id;
}

function Section({
  kind,
  storeId,
  items,
  setAll,
  onAskDelete,
}: {
  kind: Kind;
  storeId: string;
  items: LivePreset[];
  setAll: Dispatch<SetStateAction<LivePreset[]>>;
  onAskDelete: (p: LivePreset) => void;
}) {
  const cfg = CFG[kind];
  const Icon = cfg.Icon;
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setFormOpen(false);
    setEditingId(null);
    setTitle("");
    setDescription("");
  };

  const startNew = () => {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setFormOpen(true);
  };

  const startEdit = (p: LivePreset) => {
    setEditingId(p.id);
    setTitle(p.title);
    setDescription(p.description || "");
    setFormOpen(true);
  };

  const save = async () => {
    const t = title.trim();
    if (!t) {
      toast.error(kind === "coupon" ? "Digite o código do cupom." : "Digite o título do benefício.");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const u = await LivePresetsService.update(editingId, { title: t, description: description.trim() });
        setAll((prev) => prev.map((x) => (x.id === u.id ? u : x)));
        toast.success("Atalho atualizado.");
      } else {
        const c = await LivePresetsService.create(storeId, { kind, title: t, description: description.trim() });
        setAll((prev) => [...prev, c]);
        toast.success("Atalho salvo.");
      }
      reset();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Não foi possível salvar o atalho.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <Icon className="h-4 w-4 text-rose-600" /> {cfg.heading}
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">{cfg.hint}</p>
        </div>
        {!formOpen && (
          <Button onClick={startNew} className="h-9 gap-1.5 bg-rose-600 text-xs font-bold text-white hover:bg-rose-700">
            <Plus className="h-4 w-4" /> {cfg.newLabel}
          </Button>
        )}
      </div>

      {formOpen && (
        <div className="mt-4 grid gap-3 rounded-xl border border-rose-100 bg-rose-50/40 p-4 md:grid-cols-[220px_1fr_auto] md:items-end">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">{cfg.titleLabel}</label>
            <Input
              autoFocus
              value={title}
              placeholder={cfg.titlePh}
              onChange={(e) => setTitle(kind === "coupon" ? e.target.value.toUpperCase() : e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") save(); }}
              className={"h-9 text-xs " + (kind === "coupon" ? "font-mono font-bold uppercase" : "font-bold")}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Descrição / regra</label>
            <Input
              value={description}
              placeholder={cfg.descPh}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") save(); }}
              className="h-9 text-xs"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" disabled={saving} onClick={reset} className="h-9 text-xs font-semibold">
              Cancelar
            </Button>
            <Button disabled={saving} onClick={save} className="h-9 bg-rose-600 text-xs font-bold text-white hover:bg-rose-700">
              {saving ? "Salvando..." : editingId ? "Atualizar" : "Salvar"}
            </Button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-8 text-center text-xs text-slate-400">
          {cfg.empty}
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
          {items.map((p) => (
            <li key={p.id} className="flex items-center gap-3 bg-white px-4 py-3 hover:bg-slate-50/60">
              <div className="min-w-0 flex-1">
                <p className={"truncate text-sm text-slate-800 " + (kind === "coupon" ? "font-mono font-bold" : "font-bold")}>
                  {p.title}
                </p>
                {p.description && <p className="truncate text-xs text-slate-500">{p.description}</p>}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 text-xs font-semibold"
                onClick={() => startEdit(p)}
              >
                <Pencil className="h-3.5 w-3.5" /> Editar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                title="Excluir atalho"
                onClick={() => onAskDelete(p)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function LivePresetsPage() {
  const storeId = useStoreId();
  const [all, setAll] = useState<LivePreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [del, setDel] = useState<LivePreset | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    setLoading(true);
    LivePresetsService.list(storeId)
      .then((rows) => {
        if (!cancelled) {
          setAll(rows);
          setError("");
        }
      })
      .catch((e) => {
        console.error(e);
        if (!cancelled) setError("Não foi possível carregar os atalhos.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [storeId]);

  const confirmDelete = async () => {
    if (!del) return;
    setDeleting(true);
    try {
      await LivePresetsService.remove(del.id);
      setAll((prev) => prev.filter((x) => x.id !== del.id));
      toast.success("Atalho excluído.");
      setDel(null);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Não foi possível excluir o atalho.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800">
          <Ticket className="h-5 w-5 text-rose-600" /> Cupons e Benefícios
        </h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Crie aqui os cupons e benefícios que você repete nas lives. Eles aparecem como atalhos no Passo 2 ao criar uma live. Excluir um atalho não altera lives já criadas.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div>
      )}

      {!storeId || loading ? (
        <div className="py-16 text-center text-sm text-slate-400">Carregando...</div>
      ) : (
        <>
          <Section
            kind="coupon"
            storeId={storeId}
            items={all.filter((x) => x.kind === "coupon")}
            setAll={setAll}
            onAskDelete={setDel}
          />
          <Section
            kind="advantage"
            storeId={storeId}
            items={all.filter((x) => x.kind === "advantage")}
            setAll={setAll}
            onAskDelete={setDel}
          />
        </>
      )}

      <ConfirmDangerModal open={!!del} onClose={() => { if (!deleting) setDel(null); }} onConfirm={confirmDelete} title="EXCLUIR ATALHO" itemName={del?.title ?? ""} busy={deleting} />
    </div>
  );
}