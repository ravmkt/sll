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
 * Garante que a loja exista na tabela referenciada pela Foreign Key ("sll_stores")
 */
async function ensureStoreInSllStores(storeId: string): Promise<string> {
  const now = new Date().toISOString();

  // 1. Tenta buscar em sll_stores no schema public
  const { data: sllStore } = await supabase
    .from('sll_stores')
    .select('id')
    .eq('id', storeId)
    .maybeSingle();

  if (sllStore?.id) {
    return sllStore.id;
  }

  // 2. Se não achou em sll_stores, busca os dados da loja em stores
  const { data: storeData } = await supabase
    .from('stores')
    .select('*')
    .eq('id', storeId)
    .maybeSingle();

  if (storeData) {
    // Insere na sll_stores para satisfazer a constraint foreign key
    const { error: insertSllErr } = await supabase
      .from('sll_stores')
      .upsert({
        id: storeData.id,
        name: storeData.name || 'Loja',
        url: storeData.url || '',
        created_at: storeData.created_at || now,
        updated_at: now,
      }, { onConflict: 'id' });

    if (insertSllErr) {
      console.warn('[VidlyticsDatabaseService] Tentativa de inserção em sll_stores:', insertSllErr);
    }
  }

  return storeId;
}

export const saveAppearance = async (params: {
  id?: string;
  store_id: string;
  name: string;
  is_default: boolean;
  widget_style: any;
}): Promise<any> => {
  let { id, store_id, name, is_default, widget_style } = params;

  // 1. Resolução prioritária da loja real
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

  // 2. SINCRONIZAÇÃO MANDATÓRIA: Garante que o store_id exista em sll_stores
  await ensureStoreInSllStores(store_id);

  const client = getVidClient();
  const now = new Date().toISOString();

  // 3. Se for marcado como default, remove o default de outros estilos da mesma loja
  if (is_default) {
    await client
      .from(TABLE)
      .update({ is_default: false, updated_at: now })
      .eq('store_id', store_id);
  }

  const payload: any = {
    store_id,
    name: name.trim(),
    is_default: Boolean(is_default),
    widget_style,
    updated_at: now,
  };

  let res;
  const isExistingUuid = id && id !== 'default' && id.length > 20;

  if (isExistingUuid) {
    res = await client
      .from(TABLE)
      .update(payload)
      .eq('id', id)
      .select('id, store_id, name, is_default, widget_style, created_at, updated_at')
      .single();
  } else {
    // Para novos estilos (como "Rodrigo Estilo2"), faz o insert direto sem id prévio
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