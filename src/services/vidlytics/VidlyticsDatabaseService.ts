// =====================================================================
// VIDLYTICS - Service de persistência de Estilos de Aparência
// Schema: vidlytics | Tabela: vid_appearances
// Suporta múltiplos estilos nomeados por loja, com 1 padrão (is_default)
// =====================================================================

import { supabaseVidlytics } from '@/services/supabaseClients';
import type {
  ExtendedAppearance,
  VidAppearanceRow,
} from '@/types/vidlytics-appearance';

const TABLE = 'vid_appearances';

/**
 * Lista todos os estilos de aparência de uma loja.
 */
export const getAppearances = async (
  storeId: string,
): Promise<VidAppearanceRow[]> => {
  if (!storeId) return [];

  const { data, error } = await supabaseVidlytics
    .from(TABLE)
    .select('id, store_id, name, is_default, widget_style, created_at, updated_at')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[VidlyticsDatabaseService] Erro ao listar estilos:', error);
    throw error;
  }

  return (data as VidAppearanceRow[]) || [];
};

/**
 * Busca um estilo específico pelo id.
 */
export const getAppearanceById = async (
  id: string,
): Promise<VidAppearanceRow | null> => {
  if (!id) return null;

  const { data, error } = await supabaseVidlytics
    .from(TABLE)
    .select('id, store_id, name, is_default, widget_style, created_at, updated_at')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[VidlyticsDatabaseService] Erro ao buscar estilo:', error);
    throw error;
  }

  return (data as VidAppearanceRow) || null;
};

/**
 * Cria ou atualiza (se vier "id") um estilo de aparência.
 * A troca de is_default entre estilos é garantida pelo trigger no banco.
 */
export const saveAppearance = async (params: {
  id?: string;
  store_id: string;
  name: string;
  is_default: boolean;
  widget_style: ExtendedAppearance;
}): Promise<VidAppearanceRow> => {
  const { id, store_id, name, is_default, widget_style } = params;

  if (!store_id) {
    throw new Error('[VidlyticsDatabaseService] saveAppearance requer store_id.');
  }

  const payload = {
    store_id,
    name,
    is_default,
    widget_style,
    updated_at: new Date().toISOString(),
  };

  const query = id
    ? supabaseVidlytics.from(TABLE).update(payload).eq('id', id)
    : supabaseVidlytics.from(TABLE).insert(payload);

  const { data, error } = await query
    .select('id, store_id, name, is_default, widget_style, created_at, updated_at')
    .single();

  if (error) {
    console.error('[VidlyticsDatabaseService] Erro ao salvar estilo:', error);
    throw error;
  }

  return data as VidAppearanceRow;
};

/**
 * Remove um estilo de aparência.
 */
export const deleteAppearance = async (
  id: string,
  storeId: string,
): Promise<void> => {
  const { error } = await supabaseVidlytics
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
 * O trigger `enforce_single_default_appearance` no banco garante que
 * os demais estilos da mesma loja voltem a is_default = false.
 */
export const setDefaultAppearance = async (
  id: string,
  storeId: string,
): Promise<void> => {
  const { error } = await supabaseVidlytics
    .from(TABLE)
    .update({ is_default: true, updated_at: new Date().toISOString() })
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
