// =====================================================================
// VIDLYTICS - Service de persistência da Aparência
// Schema: vidlytics | Tabela: vid_appearances | Coluna: widget_style (JSONB)
// =====================================================================

import { supabaseVidlytics } from '@/services/supabaseClients';
import type {
  ExtendedAppearance,
  VidAppearanceRow,
} from '@/types/vidlytics-appearance';
import { createDefaultFormData } from '@/services/vidlytics/appearanceDefaults';

const TABLE = 'vid_appearances';

/**
 * Busca a aparência de uma loja. Se não existir registro ainda,
 * retorna um ExtendedAppearance com os defaults (sem persistir).
 */
export const getAppearanceByStoreId = async (
  storeId: string,
): Promise<ExtendedAppearance> => {
  if (!storeId) {
    console.warn('[VidlyticsService] getAppearanceByStoreId chamado sem storeId.');
    return createDefaultFormData();
  }

  const { data, error } = await supabaseVidlytics
    .from(TABLE)
    .select('id, store_id, widget_style, created_at, updated_at')
    .eq('store_id', storeId)
    .maybeSingle();

  if (error) {
    console.error('[VidlyticsService] Erro ao buscar aparência:', error);
    throw error;
  }

  if (!data) {
    // Loja ainda não tem registro de aparência -> defaults em memória
    return createDefaultFormData(storeId);
  }

  const row = data as VidAppearanceRow;
  const defaults = createDefaultFormData(storeId);

  // Merge defensivo: garante que campos novos adicionados no schema
  // de tipos sempre existam, mesmo que o JSONB salvo seja antigo/incompleto.
  const merged: ExtendedAppearance = {
    ...defaults,
    ...row.widget_style,
    id: row.id,
    store_id: row.store_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };

  return merged;
};

/**
 * Salva (upsert) a aparência completa de uma loja.
 * Sempre grava o objeto ExtendedAppearance inteiro dentro de widget_style.
 */
export const saveAppearance = async (
  storeId: string,
  appearance: ExtendedAppearance,
): Promise<ExtendedAppearance> => {
  if (!storeId) {
    throw new Error('[VidlyticsService] saveAppearance requer storeId.');
  }

  // Remove campos de controle que não devem duplicar dentro do JSONB
  const { id, created_at, updated_at, ...widgetStylePayload } = appearance;

  const { data, error } = await supabaseVidlytics
    .from(TABLE)
    .upsert(
      {
        store_id: storeId,
        widget_style: widgetStylePayload,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'store_id' },
    )
    .select('id, store_id, widget_style, created_at, updated_at')
    .single();

  if (error) {
    console.error('[VidlyticsService] Erro ao salvar aparência:', error);
    throw error;
  }

  const row = data as VidAppearanceRow;

  return {
    ...row.widget_style,
    id: row.id,
    store_id: row.store_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
};

/**
 * Atualiza parcialmente a aparência (merge shallow no nível raiz),
 * útil para toggles rápidos (ex: useGlobalAppearance) sem reenviar tudo.
 */
export const updateAppearancePartial = async (
  storeId: string,
  partial: Partial<ExtendedAppearance>,
): Promise<ExtendedAppearance> => {
  const current = await getAppearanceByStoreId(storeId);
  const updated: ExtendedAppearance = { ...current, ...partial };
  return saveAppearance(storeId, updated);
};

/**
 * Remove o registro de aparência de uma loja (reset total para defaults).
 */
export const deleteAppearance = async (storeId: string): Promise<void> => {
  const { error } = await supabaseVidlytics
    .from(TABLE)
    .delete()
    .eq('store_id', storeId);

  if (error) {
    console.error('[VidlyticsService] Erro ao deletar aparência:', error);
    throw error;
  }
};

export const VidlyticsDatabaseService = {
  getAppearanceByStoreId,
  saveAppearance,
  updateAppearancePartial,
  deleteAppearance,
};

export default VidlyticsDatabaseService;
