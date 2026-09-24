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

  // 1. Validar e resolver o store_id real a partir do banco se necessário
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    // Busca a loja real do usuário em public.stores
    const { data: publicStore } = await supabase
      .from('stores')
      .select('id, name, url, owner_user_id')
      .eq('owner_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (publicStore?.id) {
      store_id = publicStore.id;
    }
  }

  if (!store_id) {
    throw new Error('Nenhuma loja válida encontrada para associar as configurações.');
  }

  const client = getVidClient();
  const now = new Date().toISOString();

  // 2. Garantir sincronização se a foreign key apontar para vidlytics.stores
  try {
    const { data: vidStoreCheck } = await client
      .from('stores')
      .select('id')
      .eq('id', store_id)
      .maybeSingle();

    if (!vidStoreCheck) {
      // Se não existir no schema vidlytics, replica para satisfazer a foreign key
      const { data: pubStoreData } = await supabase
        .from('stores')
        .select('*')
        .eq('id', store_id)
        .single();

      if (pubStoreData) {
        await client.from('stores').upsert({
          id: pubStoreData.id,
          name: pubStoreData.name,
          url: pubStoreData.url || '',
          created_at: pubStoreData.created_at || now,
          updated_at: now,
        });
      }
    }
  } catch (syncErr) {
    // Se a tabela vidlytics.stores não existir ou a FK for direta para public, segue adiante
    console.warn('[VidlyticsDatabaseService] Verificação de stores em vidlytics ignorada:', syncErr);
  }

  // 3. Desmarcar default anterior se este estilo for o padrão
  if (is_default) {
    await client
      .from(TABLE)
      .update({ is_default: false, updated_at: now })
      .eq('store_id', store_id);
  }

  const payload = {
    store_id,
    name: name.trim(),
    is_default,
    widget_style,
    updated_at: now,
  };

  let res;
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