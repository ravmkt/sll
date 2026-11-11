import { supabase } from "@/lib/supabase";

export type StoreScriptState = { installed: boolean; gate?: boolean; updated_at?: string | null };

export async function storeScript(action: "status" | "install" | "refresh" | "uninstall", storeId: string): Promise<StoreScriptState> {
  const { data, error } = await supabase.functions.invoke("install-store-script", { body: { action, store_id: storeId } });
  if (error) throw new Error((data as { error?: string } | null)?.error ?? error.message);
  if ((data as { error?: string } | null)?.error) throw new Error((data as { error: string }).error);
  return data as StoreScriptState;
}

export async function refreshStoreScript(storeId: string): Promise<void> {
  try { await storeScript("refresh", storeId); } catch { /* nunca bloqueia a tela do Gate */ }
}
