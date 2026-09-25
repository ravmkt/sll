import { supabase } from '@/lib/supabase';

// Reexporta o client único (mesma instância) — não criar novo createClient aqui.
// Mantido para compatibilidade com LiveCommerceDatabaseService.ts
export const supabasePublic = supabase;
export const supabaseLiveCommerce = supabase.schema('live_commerce');

// Helpers adicionais por schema
export const publicSchema = () => supabase.schema('public');
export const vidlyticsSchema = () => supabase.schema('vidlytics');
export const liveCommerceSchema = () => supabase.schema('live_commerce');

export { supabase };
