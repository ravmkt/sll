import { supabase } from '@/lib/supabase';

const sb: any = supabase;

export type Resource = 'storage_gb' | 'plays' | 'videos' | 'custom';

export interface Addon {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price_monthly: number;
  scope: string;
  target_resource: Resource;
  resource_amount: number;
  is_upsell: boolean;
  upsell_headline: string | null;
  upsell_module_target: string | null;
  is_active: boolean;
  created_at: string;
}

export type AddonInput = Omit<Addon, 'id' | 'slug' | 'created_at'>;

export const RESOURCE_LABEL: Record<Resource, string> = {
  storage_gb: 'Armazenamento (GB)',
  plays: 'Plays',
  videos: 'Vídeos Ativos',
  custom: 'Personalizado',
};

export const brl = (n: number) => (n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatGrant(a: Pick<Addon, 'target_resource' | 'resource_amount'>): string {
  const n = Number(a.resource_amount) || 0;
  const compact = n >= 1000 ? `${(n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k` : n.toLocaleString('pt-BR');
  if (a.target_resource === 'storage_gb') return `+${n.toLocaleString('pt-BR')} GB`;
  if (a.target_resource === 'plays') return `+${compact} Plays`;
  if (a.target_resource === 'videos') return `+${n.toLocaleString('pt-BR')} Vídeos`;
  return 'Personalizado';
}

const slugify = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'addon';

const norm = (r: any): Addon => ({ ...r, price_monthly: Number(r.price_monthly), resource_amount: Number(r.resource_amount) });

export async function listAddons(): Promise<Addon[]> {
  const { data, error } = await sb.from('addons').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return ((data as any[]) || []).map(norm);
}

export async function saveAddon(input: AddonInput, id?: string): Promise<void> {
  if (id) {
    const { error } = await sb.from('addons').update(input).eq('id', id);
    if (error) throw new Error(error.message);
    return;
  }
  const base = slugify(input.name);
  for (let i = 0; i < 4; i++) {
    const slug = i === 0 ? base : `${base}_${Math.random().toString(36).slice(2, 6)}`;
    const { error } = await sb.from('addons').insert({ ...input, slug });
    if (!error) return;
    if (error.code !== '23505') throw new Error(error.message);
  }
  throw new Error('Não foi possível gerar uma chave única para o add-on.');
}

export async function deleteAddon(id: string): Promise<void> {
  const { count, error: e1 } = await sb.from('store_addons').select('id', { count: 'exact', head: true }).eq('addon_id', id);
  if (e1) throw new Error(e1.message);
  if ((count ?? 0) > 0) {
    throw new Error(`Este add-on já foi contratado por ${count} registro(s). Desative-o em vez de excluir.`);
  }
  const { error } = await sb.from('addons').delete().eq('id', id);
  if (error) throw new Error(error.message);
}