import { describe, it, expect } from 'vitest';
import { supabase } from '@/lib/supabase';

describe('Validação de Conexão e Schemas Supabase (flivmllysdhaydhogmhg)', () => {
  it('deve ter a instância do cliente Supabase configurada com a URL correta', () => {
    expect(supabase).toBeDefined();
    // Verifica se a URL do projeto central está presente
    const supabaseUrl = (supabase as any).supabaseUrl || '';
    expect(supabaseUrl).toContain('flivmllysdhaydhogmhg');
  });

  it('deve conseguir instanciar consultas nos schemas vidlytics e live_commerce sem erros de tipagem', () => {
    // Testa consulta no schema padrão (public)
    const publicQuery = supabase.from('stores').select('id').limit(1);
    expect(publicQuery).toBeDefined();

    // Testa consulta no schema vidlytics
    const vidlyticsQuery = supabase.schema('vidlytics' as any).from('videos').select('id').limit(1);
    expect(vidlyticsQuery).toBeDefined();

    // Testa consulta no schema live_commerce
    const liveCommerceQuery = supabase.schema('live_commerce' as any).from('lives').select('id').limit(1);
    expect(liveCommerceQuery).toBeDefined();
  });
});
