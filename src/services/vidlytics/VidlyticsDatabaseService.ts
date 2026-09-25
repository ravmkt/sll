import { supabase } from '../../lib/supabase';

export async function getAppearances(storeId: string) {
  if (!storeId) return [];
  const { data, error } = await supabase
    .from('vidlytics_appearances')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Erro ao buscar aparências:', error);
    return [];
  }
  return data || [];
}

export async function createAppearance(payload: any) {
  const { data, error } = await supabase
    .from('vidlytics_appearances')
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateAppearance(payload: any) {
  if (!payload.id) throw new Error('ID é obrigatório para atualização.');

  const { data, error } = await supabase
    .from('vidlytics_appearances')
    .update({
      widget_style: payload.widget_style,
      updated_at: new Date().toISOString()
    })
    .eq('id', payload.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteAppearance(id: string) {
  if (!id) return;
  const { error } = await supabase
    .from('vidlytics_appearances')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

export const VidlyticsDatabaseService = {
  getAppearances,
  createAppearance,
  updateAppearance,
  deleteAppearance,
  saveAppearance: createAppearance,
  deleteStyle: deleteAppearance,
  removeAppearance: deleteAppearance
};

export default VidlyticsDatabaseService;
