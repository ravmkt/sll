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

/**
 * Garante a existência do store_id na tabela "sll_stores"
 * sem enviar campos inexistentes como 'url'.
 */
async function ensureStoreInSllStores(storeId: string): Promise<void> {
  const { data: existingSll } = await supabase
    .from('sll_stores')
    .select('id')
    .eq('id', storeId)
    .maybeSingle();

  if (existingSll?.id) return;

  // Busca o nome da loja em stores
  const { data: storeData } = await supabase
    .from('stores')
    .select('id, name')
    .eq('id', storeId)
    .maybeSingle();

  const storeName = storeData?.name || 'Minha Loja';

  // Inserção estritamente com as colunas id e name
  const { error: insertErr } = await supabase
    .from('sll_stores')
    .upsert({
      id: storeId,
      name: storeName,
    }, { onConflict: 'id' });

  if (insertErr) {
    console.warn('[VidlyticsDatabaseService] Inserção simplificada em sll_stores:', insertErr);
  }
}

export const saveAppearance = async (params: {
  id?: string;
  store_id: string;
  name: string;
  is_default: boolean;
  widget_style: any;
}): Promise<any> => {
  let { id, store_id, name, is_default, widget_style } = params;

  // 1. Identifica loja ativa do usuário logado
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
    throw new Error('Nenhuma loja ativa encontrada para vincular o estilo.');
  }

  // 2. Garante o store_id em sll_stores para satisfazer a foreign key
  await ensureStoreInSllStores(store_id);

  const client = getVidClient();
  const now = new Date().toISOString();

  // 3. Se for marcado como default, remove o default de outros da mesma loja
  if (is_default) {
    await client
      .from(TABLE)
      .update({ is_default: false, updated_at: now })
      .eq('store_id', store_id);
  }

  const isExistingUuid = id && id !== 'default' && id.length > 20;
  const targetId = isExistingUuid ? id : (crypto?.randomUUID ? crypto.randomUUID() : undefined);

  const payload: any = {
    id: targetId,
    store_id,
    name: name.trim(),
    is_default: Boolean(is_default),
    widget_style,
    updated_at: now,
  };

  let res;
  if (isExistingUuid) {
    res = await client
      .from(TABLE)
      .update({
        name: payload.name,
        is_default: payload.is_default,
        widget_style: payload.widget_style,
        updated_at: now,
      })
      .eq('id', id)
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