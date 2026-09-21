import { createClient } from '@supabase/supabase-js';

// No Vite, usamos import.meta.env para acessar variáveis de ambiente
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Atenção: Credenciais do Supabase não encontradas no build.');
}

// Criamos o client com um fallback seguro para evitar que o build da Vercel quebre
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);
