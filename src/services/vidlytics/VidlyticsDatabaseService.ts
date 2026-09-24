// =====================================================================
// VIDLYTICS - Service de persistência de Estilos de Aparência
// Schema: vidlytics | Tabela: vid_appearances
// Suporta múltiplos estilos nomeados por loja, com 1 padrão (is_default)
// =====================================================================

import { supabase } from '@/lib/supabase';

const TABLE = 'vid_appearances';

const getClient = () => {
  return supabase.schema ? supabase.schema('vidlytics') : supabase;
};

/**
 * Lista todos os estilos de aparência de uma loja.
 */
export const getAppearances = async (storeId: string): Promise<any[]> => {
  if (!storeId) return [];

  const client = getClient();
  const { data, error } = await client
    .from(TABLE)
    .select('id, store_id, name, is_default, widget_style, created_at, updated_at')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[VidlyticsDatabaseService] Erro ao listar estilos:', error);
    throw error;
  }

  return data || [];
};

/**
 * Busca um estilo específico pelo id.
 */
export const getAppearanceById = async (id: string): Promise<any | null> => {
  if (!id) return null;

  const client = getClient();
  const { data, error } = await client
    .from(TABLE)
    .select('id, store_id, name, is_default, widget_style, created_at, updated_at')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[VidlyticsDatabaseService] Erro ao buscar estilo:', error);
    throw error;
  }

  return data || null;
};

/**
 * Cria ou atualiza (se vier "id") um estilo de aparência.
 */
export const saveAppearance = async (params: {
  id?: string;
  store_id: string;
  name: string;
  is_default: boolean;
  widget_style: any;
}): Promise<any> => {
  const { id, store_id, name, is_default, widget_style } = params;

  if (!store_id) {
    throw new Error('[VidlyticsDatabaseService] saveAppearance requer store_id.');
  }

  const client = getClient();
  const now = new Date().toISOString();

  // Se este estilo foi marcado como padrão, desmarca outros padrões da mesma loja
  if (is_default) {
    await client
      .from(TABLE)
      .update({ is_default: false, updated_at: now })
      .eq('store_id', store_id);
  }

  const payload: any = {
    store_id,
    name: name.trim(),
    is_default,
    widget_style,
    updated_at: now,
  };

  let query;
  if (id && id !== 'default') {
    query = client.from(TABLE).upsert({ id, ...payload });
  } else {
    query = client.from(TABLE).insert({ ...payload, created_at: now });
  }

  const { data, error } = await query
    .select('id, store_id, name, is_default, widget_style, created_at, updated_at')
    .single();

  if (error) {
    console.error('[VidlyticsDatabaseService] Erro ao salvar estilo:', error);
    throw error;
  }

  return data;
};

/**
 * Remove um estilo de aparência.
 */
export const deleteAppearance = async (
  id: string,
  storeId: string,
): Promise<void> => {
  const client = getClient();
  const { error } = await client
    .from(TABLE)
    .delete()
    .eq('id', id)
    .eq('store_id', storeId);

  if (error) {
    console.error('[VidlyticsDatabaseService] Erro ao deletar estilo:', error);
    throw error;
  }
};

/**
 * Define um estilo como padrão da loja.
 */
export const setDefaultAppearance = async (
  id: string,
  storeId: string,
): Promise<void> => {
  const client = getClient();
  const now = new Date().toISOString();

  // Desmarca anteriores
  await client
    .from(TABLE)
    .update({ is_default: false, updated_at: now })
    .eq('store_id', storeId);

  // Marca o novo
  const { error } = await client
    .from(TABLE)
    .update({ is_default: true, updated_at: now })
    .eq('id', id)
    .eq('store_id', storeId);

  if (error) {
    console.error('[VidlyticsDatabaseService] Erro ao definir padrão:', error);
    throw error;
  }
};

export const VidlyticsDatabaseService = {
  getAppearances,
  getAppearanceById,
  saveAppearance,
  deleteAppearance,
  setDefaultAppearance,
};

export default VidlyticsDatabaseService;