import { supabaseLiveCommerce as lc } from '@/services/supabaseClients';

export interface LivePreset {
  id: string;
  store_id: string;
  kind: "coupon" | "advantage";
  title: string;
  description: string;
}

const COLS = "id,store_id,kind,title,description";
const table = () => (lc as any).schema("live_commerce").from("live_presets");

export const LivePresetsService = {
  async list(storeId: string): Promise<LivePreset[]> {
    const { data, error } = await table()
      .select(COLS)
      .eq("store_id", storeId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []) as LivePreset[];
  },

  async create(
    storeId: string,
    p: { kind: "coupon" | "advantage"; title: string; description: string },
  ): Promise<LivePreset> {
    const { data, error } = await table()
      .insert({ store_id: storeId, kind: p.kind, title: p.title, description: p.description })
      .select(COLS)
      .single();
    if (error) {
      if ((error as any).code === "23505") throw new Error("Esse atalho já está salvo.");
      throw error;
    }
    return data as LivePreset;
  },

  async update(id: string, p: { title: string; description: string }): Promise<LivePreset> {
    const { data, error } = await table()
      .update({ title: p.title, description: p.description })
      .eq("id", id)
      .select(COLS)
      .single();
    if (error) {
      if ((error as any).code === "23505") throw new Error("Esse atalho j\u00e1 est\u00e1 salvo.");
      throw error;
    }
    return data as LivePreset;
  },
  async remove(id: string): Promise<void> {
    const { data, error } = await table().delete().eq("id", id).select("id");
    if (error) throw error;
    if (!data || data.length === 0) throw new Error("Não foi possível remover o atalho.");
  },
};