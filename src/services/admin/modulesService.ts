import { supabase } from '@/lib/supabase';

const sb: any = supabase;

export type ModuleOverview = {
  slug: string;
  name: string;
  status: string;
  is_public_for_sale: boolean;
  sort_order: number;
  logo_url: string | null;
  access: number;
  paying: number;
  trial: number;
  past_due: number;
  lifetime: number;
  mrr: number;
  errors: number;
  events: number | null;
  views: number | null;
  clicks: number | null;
  active_stores: number | null;
  videos: number | null;
  storage_bytes: number | null;
};

export type ModulesData = { days: number; modules: ModuleOverview[]; bundle_stores: number; bundle_mrr: number };

export type ModuleStoreRow = { id: string; name: string | null; status: string; billing_cycle: string | null; plan_name: string | null; via_combo: boolean };

export async function getModulesOverview(days: number): Promise<ModulesData> {
  const { data, error } = await sb.rpc('admin_master_modules', { p_days: days });
  if (error) throw new Error(error.message);
  const res = data as ModulesData;
  const { data: logos } = await sb.from('hub_modules').select('slug,logo_url');
  const map = new Map<string, string | null>((logos || []).map((l: any) => [l.slug, l.logo_url ?? null]));
  res.modules = res.modules.map((m) => ({ ...m, logo_url: map.get(m.slug) ?? null }));
  return res;
}

export async function getModuleStores(slug: string): Promise<ModuleStoreRow[]> {
  const { data, error } = await sb.rpc('admin_module_stores', { p_slug: slug });
  if (error) throw new Error(error.message);
  return (data || []) as ModuleStoreRow[];
}

// logo: null = mantém, '' = remove, texto = nova URL
export async function updateHubModule(
  slug: string, name: string, status: string, isPublic: boolean, sort: number, logo: string | null = null,
): Promise<void> {
  const { error } = await sb.rpc('admin_update_hub_module', {
    p_slug: slug, p_name: name, p_status: status, p_public: isPublic, p_sort: sort, p_logo: logo,
  });
  if (error) throw new Error(error.message);
}

export async function uploadModuleLogo(slug: string, file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Envie uma imagem (PNG, JPG, SVG ou WebP).');
  if (file.size > 2 * 1024 * 1024) throw new Error('A imagem deve ter até 2 MB.');
  const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
  const path = `${slug}/${Date.now()}.${ext}`;
  const { error } = await sb.storage.from('module-logos').upload(path, file, { contentType: file.type, upsert: true });
  if (error) throw new Error(error.message);
  return sb.storage.from('module-logos').getPublicUrl(path).data.publicUrl as string;
}