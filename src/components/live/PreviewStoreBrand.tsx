import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLoja } from "@/contexts/LojaContext";

const sb: any = supabase;

export default function PreviewStoreBrand() {
  const { store, storeId } = useLoja() as { store: any; storeId: string | null };
  const [logo, setLogo] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!storeId) return;
    let alive = true;
    sb.from("store_settings").select("logo_url,store_name").eq("store_id", storeId).maybeSingle()
      .then(({ data }: any) => {
        if (!alive) return;
        setLogo(((data?.logo_url as string) || store?.logo_url || "").trim() || null);
        setName(((data?.store_name as string) || "").trim());
        setFailed(false);
      });
    return () => { alive = false; };
  }, [storeId, store?.logo_url]);

  const shown = name || store?.name || "Sua Loja";
  const ini = String(shown).trim().split(/\s+/).slice(0, 2).map((p: string) => p[0]?.toUpperCase() ?? "").join("") || "L";

  return (
    <>
      {logo && !failed ? (
        <img src={logo} alt={shown} onError={() => setFailed(true)} className="w-8 h-8 rounded-full object-cover border border-slate-200" />
      ) : (
        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[12px] font-black text-slate-500">{ini}</div>
      )}
      <span className="font-black text-[16px] text-slate-800">{shown}</span>
    </>
  );
}