import type { RadarSettings } from '@/types/radar';
import { assertOk, radarDb } from './client';

export async function getSettings(storeId: string): Promise<RadarSettings | null> {
  const { data, error } = await radarDb().from('settings').select('*').eq('store_id', storeId).maybeSingle();
  assertOk(error);
  return (data as RadarSettings | null) ?? null;
}

export async function saveSettings(
  s: Pick<RadarSettings, 'store_id' | 'category' | 'regions' | 'competitors' | 'onboarding_done'>,
): Promise<void> {
  const { error } = await radarDb()
    .from('settings')
    .upsert({ ...s, updated_at: new Date().toISOString() }, { onConflict: 'store_id' });
  assertOk(error);
}