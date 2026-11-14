import type { SupabaseClient } from '@supabase/supabase-js';
import type { InfoCard, InfoCardInput } from '../types/infoCards';

async function call<T>(sb: SupabaseClient, fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await sb.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

export const infoCardsService = (sb: SupabaseClient) => ({
  list: (storeId: string) => call<InfoCard[]>(sb, 'widgets_cards_list', { p_store_id: storeId }),

  save: (storeId: string, c: InfoCardInput) =>
    call<InfoCard>(sb, 'widgets_card_save', {
      p_store_id: storeId, p_id: c.id ?? null, p_name: c.name, p_active: c.active, p_title: c.title,
      p_tiers: c.tiers, p_footer: c.footer, p_placement: c.placement, p_style_id: c.style_id,
    }),

  setActive: (storeId: string, id: string, active: boolean) =>
    call<void>(sb, 'widgets_card_set_active', { p_store_id: storeId, p_id: id, p_active: active }),

  remove: (storeId: string, id: string) =>
    call<void>(sb, 'widgets_card_delete', { p_store_id: storeId, p_id: id }),
});