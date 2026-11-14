import type { SupabaseClient } from '@supabase/supabase-js';
import type { RulerSettings, RulerStyleConfig, WidgetStyle } from '../types/widgets';

export interface StyleInput {
  id?: string | null;
  name: string;
  primary_color: string;
  config: RulerStyleConfig;
  is_default: boolean;
}

async function call<T>(sb: SupabaseClient, fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await sb.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

export const widgetsService = (sb: SupabaseClient) => ({
  listStyles: (storeId: string) =>
    call<WidgetStyle[]>(sb, 'widgets_styles_list', { p_store_id: storeId }),

  saveStyle: (storeId: string, s: StyleInput) =>
    call<WidgetStyle>(sb, 'widgets_style_save', {
      p_store_id: storeId, p_id: s.id ?? null, p_name: s.name,
      p_primary_color: s.primary_color, p_config: s.config, p_is_default: s.is_default,
    }),

  setDefault: (storeId: string, id: string) =>
    call<void>(sb, 'widgets_style_set_default', { p_store_id: storeId, p_id: id }),

  deleteStyle: (storeId: string, id: string) =>
    call<void>(sb, 'widgets_style_delete', { p_store_id: storeId, p_id: id }),

  getRuler: (storeId: string) =>
    call<RulerSettings>(sb, 'widgets_ruler_get', { p_store_id: storeId }),

  saveRuler: (storeId: string, r: Omit<RulerSettings, 'store_id'>) =>
    call<void>(sb, 'widgets_ruler_save', {
      p_store_id: storeId, p_active: r.active, p_title: r.title, p_tiers: r.tiers,
      p_footer: r.footer, p_placement: r.placement, p_style_id: r.style_id,
    }),
});
