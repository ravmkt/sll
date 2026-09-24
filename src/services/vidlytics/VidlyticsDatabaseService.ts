import { supabase } from '../../lib/supabase';

export interface VidAppearanceRow {
  id: string;
  store_id: string;
  name: string;
  is_default: boolean;
  widget_style: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export const VidlyticsDatabaseService = {
  // Lista todos os estilos de uma loja (para a tabela do AparenciaTab)
  async getAppearances(storeId: string): Promise<VidAppearanceRow[]> {
    const { data, error } = await supabase
      .schema('vidlytics')
      .from('vid_appearances')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Busca um estilo específico por id (para abrir o modal em edição)
  async getAppearanceById(id: string): Promise<VidAppearanceRow | null> {
    const { data, error } = await supabase
      .schema('vidlytics')
      .from('vid_appearances')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  // Busca a aparência padrão de uma loja (compatibilidade/fallback)
  async getAppearanceByStoreId(storeId: string) {
    try {
      const { data, error } = await supabase
        .schema('vidlytics')
        .from('vid_appearances')
        .select('widget_style')
        .eq('store_id', storeId)
        .order('is_default', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data?.widget_style || null;
    } catch (err) {
      console.error('Erro no getAppearanceByStoreId:', err);
      return null;
    }
  },

  // Salva ou atualiza estilo (criar novo ou editar existente)
  async saveAppearance(payload: {
    id?: string;
    store_id: string;
    name: string;
    is_default: boolean;
    widget_style: Record<string, any>;
  }): Promise<VidAppearanceRow> {
    const now = new Date().toISOString();
    const row = {
      ...(payload.id ? { id: payload.id } : {}),
      store_id: payload.store_id,
      name: payload.name,
      is_default: payload.is_default,
      widget_style: payload.widget_style,
      updated_at: now,
    };

    // Se marcado como padrão, desmarca os outros estilos da loja
    if (payload.is_default) {
      await supabase
        .schema('vidlytics')
        .from('vid_appearances')
        .update({ is_default: false, updated_at: now })
        .eq('store_id', payload.store_id)
        .neq('id', payload.id || '00000000-0000-0000-0000-000000000000');
    }

    const { data, error } = await supabase
      .schema('vidlytics')
      .from('vid_appearances')
      .upsert(row, { onConflict: 'id' })
      .select('*')
      .single();

    if (error) throw error;
    return data;
  },

  // Exclui um estilo
  async deleteAppearance(id: string, storeId: string): Promise<void> {
    const { error } = await supabase
      .schema('vidlytics')
      .from('vid_appearances')
      .delete()
      .eq('id', id)
      .eq('store_id', storeId);

    if (error) throw error;
  },

  // Define um estilo existente como padrão
  async setDefaultAppearance(id: string, storeId: string): Promise<void> {
    const now = new Date().toISOString();

    await supabase
      .schema('vidlytics')
      .from('vid_appearances')
      .update({ is_default: false, updated_at: now })
      .eq('store_id', storeId);

    const { error } = await supabase
      .schema('vidlytics')
      .from('vid_appearances')
      .update({ is_default: true, updated_at: now })
      .eq('id', id)
      .eq('store_id', storeId);

    if (error) throw error;
  },
};
