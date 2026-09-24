import { supabase } from '../lib/supabase'; // Ajuste o caminho se seu client Supabase ficar em outro lugar

export const VidlyticsDatabaseService = {
  
  // Busca as configurações de aparência
  async getAppearanceByStoreId(storeId: string) {
    try {
      const { data, error } = await supabase
        .schema('vidlytics')
        .from('vid_appearances')
        .select('widget_style')
        .eq('store_id', storeId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = Nenhum registro encontrado (novo lojista)
        console.error('Erro ao buscar aparência:', error);
        throw error;
      }

      return data?.widget_style || null;
    } catch (err) {
      console.error('Erro no getAppearanceByStoreId:', err);
      return null;
    }
  },

  // Salva ou atualiza (Upsert) as configurações no JSONB
  async saveAppearance(storeId: string, widgetStyle: any) {
    try {
      // Verifica se já existe
      const { data: existing } = await supabase
        .schema('vidlytics')
        .from('vid_appearances')
        .select('id')
        .eq('store_id', storeId)
        .single();

      if (existing) {
        // Atualiza
        const { error } = await supabase
          .schema('vidlytics')
          .from('vid_appearances')
          .update({ 
            widget_style: widgetStyle, 
            updated_at: new Date().toISOString() 
          })
          .eq('store_id', storeId);
          
        if (error) throw error;
      } else {
        // Cria novo
        const { error } = await supabase
          .schema('vidlytics')
          .from('vid_appearances')
          .insert([{ 
            store_id: storeId, 
            widget_style: widgetStyle 
          }]);
          
        if (error) throw error;
      }
      
      return true;
    } catch (err) {
      console.error('Erro no saveAppearance:', err);
      throw err;
    }
  }
};