import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export interface BuilderPageOption {
  id: string;
  title: string;
  slug: string;
  type: "landing" | "product";
  url: string;
  customDomain: boolean;
}

export async function listPublishedPages(storeId: string): Promise<BuilderPageOption[]> {
  const builder = (supabase as unknown as SupabaseClient).schema("builder");
  const [pagesRes, domRes, storeRes] = await Promise.all([
    builder
      .from("pages")
      .select("id,title,slug,type")
      .eq("store_id", storeId)
      .eq("status", "published")
      .order("updated_at", { ascending: false }),
    supabase.from("store_domains").select("domain").eq("store_id", storeId).eq("status", "verified").limit(1).maybeSingle(),
    supabase.from("stores").select("slug").eq("id", storeId).maybeSingle(),
  ]);
  if (pagesRes.error) throw new Error(pagesRes.error.message);
  const domain = (domRes.data as { domain?: string } | null)?.domain;
  const ref = (storeRes.data as { slug?: string } | null)?.slug ?? storeId;
  return ((pagesRes.data ?? []) as { id: string; title: string; slug: string; type: "landing" | "product" }[]).map((p) => ({
    ...p,
    customDomain: !!domain,
    url: domain ? `https://${domain}/${p.slug}` : `${window.location.origin}/p/${ref}/${p.slug}`,
  }));
}