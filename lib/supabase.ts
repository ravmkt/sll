import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Faltam as variáveis de ambiente do Supabase.');
}

// Exporta o cliente para ser usado em qualquer lugar do SLL
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
