import { supabase } from '@/lib/supabase';

export const radarDb = () => supabase.schema('radar');
export const publicDb = supabase;

export function assertOk(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}