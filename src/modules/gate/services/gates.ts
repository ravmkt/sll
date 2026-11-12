import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

const db = () => (supabase as unknown as SupabaseClient).schema("gate");

export interface Gate {
  id: string;
  store_id: string;
  name: string;
  domains: string[];
  gate_url: string;
  starts_at: string;
  ends_at: string;
  whatsapp_url: string | null;
  enabled: boolean;
  exclude_bots: boolean;
  preserve_params: boolean;
  bypass_param: string;
  landing_id?: string | null;
}

export type GateInput = Omit<Gate, "id" | "store_id">;

export async function listGates(storeId: string): Promise<Gate[]> {
  const { data, error } = await db()
    .from("gates")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Gate[];
}

export async function createGate(storeId: string, input: GateInput): Promise<void> {
  const { error } = await db().from("gates").insert({ ...input, store_id: storeId });
  if (error) throw new Error(error.message);
}

export async function updateGate(id: string, patch: Partial<GateInput>): Promise<void> {
  const { error } = await db().from("gates").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteGate(id: string): Promise<void> {
  const { error } = await db().from("gates").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function gateSummary(id: string, days = 7): Promise<Record<string, number>> {
  const { data, error } = await db().rpc("gate_summary", { p_gate: id, p_days: days });
  if (error) throw new Error(error.message);
  const out: Record<string, number> = {};
  for (const r of (data ?? []) as { event_type: string; total: number | string }[]) {
    out[r.event_type] = Number(r.total);
  }
  return out;
}
