import { supabase } from '@/lib/supabase';

export interface VidlyticsAppearance {
  id?: string;
  store_id: string;
  name: string;
  widget_style: Record<string, any>;
  is_default?: boolean;
  created_at?: string;
  updated_at?: string;
}

export class VidlyticsDatabaseService {
  private static SCHEMA = 'vidlytics';
  private static TABLE_APPEARANCES = 'vid_appearances'; // Tabela oficial do schema vidlytics

  /**
   * Busca todos os estilos/aparências cadastrados para a loja ativa.
   */
  static async getAppearances(storeId: string): Promise<VidlyticsAppearance[]> {
    if (!storeId) {
      console.warn('[VidlyticsDatabaseService] Não foi possível buscar aparências: storeId ausente.');
      return [];
    }

    const { data, error } = await supabase
      .schema(this.SCHEMA)
      .from(this.TABLE_APPEARANCES)
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[VidlyticsDatabaseService] Erro ao buscar aparências:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Salva ou atualiza um estilo de aparência para a loja ativa.
   */
  static async saveAppearance(
    storeId: string,
    appearance: Omit<VidlyticsAppearance, 'store_id'>
  ): Promise<VidlyticsAppearance> {
    if (!storeId) {
      throw new Error('Loja não identificada. O storeId é obrigatório para salvar o estilo.');
    }

    const payload = {
      ...appearance,
      store_id: storeId,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .schema(this.SCHEMA)
      .from(this.TABLE_APPEARANCES)
      .upsert(payload)
      .select()
      .single();

    if (error) {
      console.error('[VidlyticsDatabaseService] Erro ao salvar aparência:', error);
      throw error;
    }

    return data;
  }

  /**
   * Define um estilo como o padrão oficial da loja e desmarca os demais.
   */
  static async setDefaultAppearance(storeId: string, appearanceId: string): Promise<void> {
    if (!storeId || !appearanceId) return;

    // 1. Desmarca a flag de padrão de todas as aparências da loja
    const { error: resetError } = await supabase
      .schema(this.SCHEMA)
      .from(this.TABLE_APPEARANCES)
      .update({ is_default: false })
      .eq('store_id', storeId);

    if (resetError) {
      console.error('[VidlyticsDatabaseService] Erro ao resetar estilo padrão:', resetError);
      throw resetError;
    }

    // 2. Marca a nova aparência selecionada como padrão
    const { error: setError } = await supabase
      .schema(this.SCHEMA)
      .from(this.TABLE_APPEARANCES)
      .update({ is_default: true, updated_at: new Date().toISOString() })
      .eq('id', appearanceId)
      .eq('store_id', storeId);

    if (setError) {
      console.error('[VidlyticsDatabaseService] Erro ao definir estilo padrão:', setError);
      throw setError;
    }
  }

  /**
   * Exclui um estilo da loja.
   */
  static async deleteAppearance(storeId: string, appearanceId: string): Promise<void> {
    if (!storeId || !appearanceId) return;

    const { error } = await supabase
      .schema(this.SCHEMA)
      .from(this.TABLE_APPEARANCES)
      .delete()
      .eq('id', appearanceId)
      .eq('store_id', storeId);

    if (error) {
      console.error('[VidlyticsDatabaseService] Erro ao deletar aparência:', error);
      throw error;
    }
  }
}
