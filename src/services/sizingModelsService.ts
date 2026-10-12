import { supabase } from '@/lib/supabase';

const sb: any = supabase;

export type ModelType = 'humano' | 'objeto';
export interface ModelMeasure { name: string; value: number | string; unit: 'cm' | 'g' | '' }
export interface MeasureModel {
  id: string;
  store_id: string;
  name: string;
  title?: string | null;
  type: ModelType;
  measures: ModelMeasure[];
  created_at: string | null;
  updated_at: string | null;
}
export interface ModelInput {
  id?: string;
  store_id: string;
  name: string;
  title?: string | null;
  type: ModelType;
  measures: ModelMeasure[];
}

function normalize(r: any): MeasureModel {
  const measures: ModelMeasure[] = Array.isArray(r.measures) ? r.measures : [];
  const inferred: ModelType = measures.some((m) => ['largura', 'comprimento'].includes(String(m?.name || '').toLowerCase()))
    ? 'objeto'
    : 'humano';
  return {
    id: r.id,
    store_id: r.store_id,
    name: r.name || '',
    title: r.title || '',
    type: r.type === 'objeto' || r.type === 'humano' ? r.type : inferred,
    measures,
    created_at: r.created_at ?? null,
    updated_at: r.updated_at ?? null,
  };
}

export async function listModels(storeId: string): Promise<MeasureModel[]> {
  const { data, error } = await sb
    .from('sizing_models')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(normalize);
}

export async function saveModel(input: ModelInput): Promise<void> {
  const now = new Date().toISOString();
  const row = { store_id: input.store_id, name: input.name, title: (input.title || '').trim() || null, type: input.type, measures: input.measures, updated_at: now };
  if (input.id) {
    const { error } = await sb.from('sizing_models').update(row).eq('id', input.id).eq('store_id', input.store_id);
    if (error) throw new Error(error.message);
    return;
  }
  const { error } = await sb.from('sizing_models').insert({ ...row, id: crypto.randomUUID(), created_at: now });
  if (error) throw new Error(error.message);
}

export async function deleteModel(id: string, storeId: string): Promise<void> {
  const { error } = await sb.from('sizing_models').delete().eq('id', id).eq('store_id', storeId);
  if (error) throw new Error(error.message);
}

async function pluckAll(build: (from: number, to: number) => PromiseLike<{ data: any[] | null; error: any }>, col: string): Promise<string[]> {
  const out: string[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(from, from + 999);
    if (error) return out;
    (data || []).forEach((r) => { if (r[col]) out.push(String(r[col])); });
    if (!data || data.length < 1000) break;
  }
  return out;
}

export async function listLinkedModelIds(storeId: string): Promise<Set<string>> {
  const [a, b] = await Promise.all([
    pluckAll((x, y) => sb.schema('vidlytics').from('vid_videos').select('model_id').eq('store_id', storeId).not('model_id', 'is', null).range(x, y), 'model_id'),
    pluckAll((x, y) => sb.from('videos').select('sizing_model_id').eq('store_id', storeId).not('sizing_model_id', 'is', null).range(x, y), 'sizing_model_id'),
  ]);
  return new Set([...a, ...b]);
}

export async function deleteModels(ids: string[], storeId: string): Promise<void> {
  for (let i = 0; i < ids.length; i += 100) {
    const { error } = await sb.from('sizing_models').delete().eq('store_id', storeId).in('id', ids.slice(i, i + 100));
    if (error) throw new Error(error.message);
  }
}