import type { RadarKeyword } from '@/types/radar';
import { assertOk, radarDb } from './client';

export async function listKeywords(storeId: string): Promise<RadarKeyword[]> {
  const { data, error } = await radarDb()
    .from('keywords').select('*').eq('store_id', storeId).order('created_at', { ascending: false });
  assertOk(error);
  return (data ?? []) as RadarKeyword[];
}

export async function addKeyword(storeId: string, term: string, region: string | null): Promise<void> {
  const { error } = await radarDb()
    .from('keywords')
    .upsert({ store_id: storeId, term: term.trim().toLowerCase(), region, source: 'manual' }, { onConflict: 'store_id,term,region' });
  assertOk(error);
}

export async function removeKeyword(storeId: string, id: string): Promise<void> {
  const { error } = await radarDb().from('keywords').delete().eq('store_id', storeId).eq('id', id);
  assertOk(error);
}