import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Cliente Core (schema public) - Gerenciador oficial de Auth e Sessão
export const supabasePublic = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'public' },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Cliente Vidlytics (schema vidlytics) - Apenas dados
export const supabaseVidlytics = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'vidlytics' },
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Cliente Live Commerce (schema live_commerce) - Apenas dados
export const supabaseLiveCommerce = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'live_commerce' },
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export const supabase = supabasePublic;
