import { supabase } from '@/lib/supabase';

const TABLE = 'vid_appearances';

const getVidClient = () => {
  return supabase.schema ? supabase.schema('vidlytics') : supabase;
};

export const getAppearances = async (storeId: string): Promise<any[]> => {
  if (!storeId) return [];
  const client = getVidClient();
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
  const client = getVidClient();
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
  let { id, store_id, name, is_default, widget_style } = params;

  // 1. Garante que o store_id seja o da loja real do usuário em public.stores
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: userStore } = await supabase
      .from('stores')
      .select('id')
      .eq('owner_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (userStore?.id) {
      store_id = userStore.id;
    }
  }

  if (!store_id) {
    store_id = localStorage.getItem('sll_store_id') || localStorage.getItem('store_id') || '';
  }

  if (!store_id) {
    throw new Error('Nenhuma loja ativa encontrada no sistema.');
  }

  const client = getVidClient();
  const now = new Date().toISOString();

  // 2. Se for marcado como default, remove o default dos outros estilos da loja
  if (is_default) {
    await client
      .from(TABLE)
      .update({ is_default: false, updated_at: now })
      .eq('store_id', store_id);
  }

  const isExistingUuid = id && id !== 'default' && id.length > 20;

  if (isExistingUuid) {
    const { data, error } = await client
      .from(TABLE)
      .update({
        name: name.trim(),
        is_default: Boolean(is_default),
        widget_style,
        updated_at: now,
      })
      .eq('id', id)
      .select('id, store_id, name, is_default, widget_style, created_at, updated_at')
      .single();

    if (error) {
      console.error('[VidlyticsDatabaseService] Erro ao atualizar estilo:', error);
      throw error;
    }
    return data;
  } else {
    // Estilo novo customizado criado via pop-up
    const newId = crypto?.randomUUID ? crypto.randomUUID() : undefined;
    const insertPayload: any = {
      store_id,
      name: name.trim(),
      is_default: Boolean(is_default),
      widget_style,
      created_at: now,
      updated_at: now,
    };
    if (newId) insertPayload.id = newId;

    const { data, error } = await client
      .from(TABLE)
      .insert(insertPayload)
      .select('id, store_id, name, is_default, widget_style, created_at, updated_at')
      .single();

    if (error) {
      console.error('[VidlyticsDatabaseService] Erro ao inserir estilo:', error);
      throw error;
    }
    return data;
  }
};

export const VidlyticsDatabaseService = {
  getAppearances,
  getAppearanceById,
  saveAppearance,
};

export default VidlyticsDatabaseService;