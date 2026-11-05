import type { RadarConnection } from '@/types/radar';
import { assertOk, radarDb } from './client';

export async function listConnections(storeId: string): Promise<RadarConnection[]> {
  const { data, error } = await radarDb().from('connections').select('*').eq('store_id', storeId);
  assertOk(error);
  return (data ?? []) as RadarConnection[];
}