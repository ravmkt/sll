import { supabase } from '../../lib/supabase';

export const VidlyticsDatabaseService = {
  async getAppearances(storeId: string) {
    if (!storeId) return [];
    const { data, error } = await supabase
      .from('vidlytics_appearances')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Erro ao carregar aparências:', error);
      return [];
    }
    return data || [];
  },

  async createAppearance(payload: any) {
    const { data, error } = await supabase
      .from('vidlytics_appearances')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateAppearance(payload: any) {
    if (!payload.id) throw new Error('ID necessário para atualização');

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
  },

  async deleteAppearance(id: string) {
    if (!id) return;
    const { error } = await supabase
      .from('vidlytics_appearances')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  async deleteStyle(id: string) {
    return this.deleteAppearance(id);
  },

  async removeAppearance(id: string) {
    return this.deleteAppearance(id);
  }
};

export default VidlyticsDatabaseService;
