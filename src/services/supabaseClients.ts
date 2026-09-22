import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Cliente Core (schema public)
export const supabasePublic = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'public' }
});

// Cliente Vidlytics (schema vidlytics)
export const supabaseVidlytics = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'vidlytics' }
});

// Cliente Live Commerce (schema live_commerce)
export const supabaseLiveCommerce = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'live_commerce' }
});

export const supabase = supabasePublic;
