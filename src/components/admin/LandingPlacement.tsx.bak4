import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fetchLandingData } from "@/lib/landingConfig";

interface Page { id: string; slug: string; name: string }
interface Props { kind: "plan" | "module"; id: string }

export default function LandingPlacement({ kind, id }: Props) {
  const table = kind === "plan" ? "landing_page_plans" : "landing_page_modules";
  const col = kind === "plan" ? "plan_id" : "module_slug";
  const [pages, setPages] = useState<Page[]>([]);
  const [on, setOn] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    const [pg, lk] = await Promise.all([
      db.from("landing_pages").select("id,slug,name").order("name"),
      db.from(table).select("landing_id").eq(col, id),
    ]);
    if (pg.error || lk.error) { setError((pg.error ?? lk.error).message); setLoading(false); return; }
    setPages(pg.data ?? []);
    setOn(new Set((lk.data ?? []).map((r: { landing_id: string }) => r.landing_id)));
    setError(null); setLoading(false);
  }, [table, col, id]);

  useEffect(() => { load(); }, [load]);

  const toggle = async (pageId: string, checked: boolean) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    setBusy(pageId);
    const res = checked
      ? await db.from(table).upsert({ landing_id: pageId, [col]: id })
      : await db.from(table).delete().eq("landing_id", pageId).eq(col, id);
    setBusy(null);
    if (res.error) { setError(res.error.message); return; }
    setOn((s) => { const n = new Set(s); if (checked) n.add(pageId); else n.delete(pageId); return n; });
    fetchLandingData(true).catch(() => undefined);
  };

  if (loading) return <Loader2 className="h-4 w-4 animate-spin text-slate-400" />;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-slate-400">Aparece nas páginas de venda</p>
      {pages.map((p) => (
        <label key={p.id} className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" className="h-4 w-4 accent-emerald-500" checked={on.has(p.id)} disabled={busy === p.id}
            onChange={(e) => toggle(p.id, e.target.checked)} />
          {p.name} <span className="text-xs text-slate-400">/{p.slug}</span>
        </label>
      ))}
      {pages.length === 0 && <p className="text-xs text-slate-400">Nenhuma página de venda cadastrada.</p>}
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}
