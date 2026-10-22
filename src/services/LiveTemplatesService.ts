import { supabaseLiveCommerce as lc } from '@/services/supabaseClients';
import type { LiveAppearanceTemplate } from '@/components/live/LiveAppearanceModal';

const LEGACY_KEY = 'vidlytics_live_appearance_templates_v2';

type TemplateInput = Pick<LiveAppearanceTemplate, 'name' | 'divulgacao' | 'aoVivo' | 'player'>;

const fromRow = (r: any): LiveAppearanceTemplate =>
  ({
    id: r.id,
    name: r.name,
    isDefault: false,
    divulgacao: r.divulgacao,
    aoVivo: r.ao_vivo,
    player: r.player,
  }) as LiveAppearanceTemplate;

export const LiveTemplatesService = {
  async list(storeId: string): Promise<LiveAppearanceTemplate[]> {
    const { data, error } = await lc
      .from('appearance_templates')
      .select('id, name, divulgacao, ao_vivo, player')
      .eq('store_id', storeId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []).map(fromRow);
  },

  async create(storeId: string, t: TemplateInput): Promise<LiveAppearanceTemplate> {
    const { data, error } = await lc
      .from('appearance_templates')
      .insert({
        store_id: storeId,
        name: t.name.trim(),
        divulgacao: t.divulgacao,
        ao_vivo: t.aoVivo,
        player: t.player,
      })
      .select('id, name, divulgacao, ao_vivo, player')
      .single();
    if (error) throw error;
    return fromRow(data);
  },

  async update(id: string, t: TemplateInput): Promise<LiveAppearanceTemplate> {
    const { data, error } = await lc
      .from('appearance_templates')
      .update({
        name: t.name.trim(),
        divulgacao: t.divulgacao,
        ao_vivo: t.aoVivo,
        player: t.player,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id, name, divulgacao, ao_vivo, player')
      .single();
    if (error) throw error;
    return fromRow(data);
  },

  async remove(id: string): Promise<void> {
    const { error } = await lc.from('appearance_templates').delete().eq('id', id);
    if (error) throw error;
  },

  // Sobe os temas que existiam so no navegador. Apaga a chave local apenas se der certo.
  async migrateLegacy(storeId: string): Promise<number> {
    let local: any[] = [];
    try {
      const parsed = JSON.parse(localStorage.getItem(LEGACY_KEY) || '[]');
      local = Array.isArray(parsed) ? parsed : [];
    } catch {
      return 0;
    }
    local = local.filter((t) => t && !t.isDefault && String(t.name || '').trim());
    if (!local.length) {
      localStorage.removeItem(LEGACY_KEY);
      return 0;
    }

    const { data: existing, error: e1 } = await lc
      .from('appearance_templates')
      .select('name')
      .eq('store_id', storeId);
    if (e1) throw e1;
    const names = new Set((existing || []).map((r: any) => String(r.name).trim().toLowerCase()));

    const rows = local
      .filter((t) => !names.has(String(t.name).trim().toLowerCase()))
      .map((t) => ({
        store_id: storeId,
        name: String(t.name).trim(),
        divulgacao: t.divulgacao ?? {},
        ao_vivo: t.aoVivo ?? {},
        player: t.player ?? {},
      }));

    if (rows.length) {
      const { error } = await lc.from('appearance_templates').insert(rows);
      if (error) throw error;
    }
    localStorage.removeItem(LEGACY_KEY);
    return rows.length;
  },
};