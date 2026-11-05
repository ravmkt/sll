import type { Priority, RadarTask } from '@/types/radar';
import { assertOk, radarDb } from './client';

export async function listTasks(storeId: string, priority: Priority | 'todas' = 'todas', limit = 50): Promise<RadarTask[]> {
  let q = radarDb().from('tasks').select('*').eq('store_id', storeId).eq('status', 'open');
  if (priority !== 'todas') q = q.eq('priority', priority);
  const { data, error } = await q.order('created_at', { ascending: false }).limit(limit);
  assertOk(error);
  return (data ?? []) as RadarTask[];
}