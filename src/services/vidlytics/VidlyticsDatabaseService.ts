import { supabase } from '@/lib/supabase';

const TABLE = 'vid_appearances';

const getClient = () => {
  return supabase.schema ? supabase.schema('vidlytics') : supabase;
};

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

  // Previne conflito 409: se marcou como default, desmarca todos os outros da mesma loja primeiro
  if (is_default) {
    const { error: resetDefaultErr } = await client
      .from(TABLE)
      .update({ is_default: false, updated_at: now })
      .eq('store_id', store_id);

    if (resetDefaultErr) {
      console.warn('[VidlyticsDatabaseService] Aviso ao resetar defaults antigos:', resetDefaultErr);
    }
  }

  const payload = {
    store_id,
    name: name.trim(),
    is_default,
    widget_style,
    updated_at: now,
  };

  let res;
  // Se for um ID válido de UUID existente, faz update ou upsert por ID
  const isExistingUuid = id && id !== 'default' && id.length > 20;

  if (isExistingUuid) {
    res = await client
      .from(TABLE)
      .upsert({ id, ...payload }, { onConflict: 'id' })
      .select('id, store_id, name, is_default, widget_style, created_at, updated_at')
      .single();
  } else {
    res = await client
      .from(TABLE)
      .insert({ ...payload, created_at: now })
      .select('id, store_id, name, is_default, widget_style, created_at, updated_at')
      .single();
  }

  if (res.error) {
    console.error('[VidlyticsDatabaseService] Erro ao salvar estilo:', res.error);
    throw res.error;
  }

  return res.data;
};

export const VidlyticsDatabaseService = {
  getAppearances,
  getAppearanceById,
  saveAppearance,
};

export default VidlyticsDatabaseService;