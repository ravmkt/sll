import { createClient } from "@supabase/supabase-js";

// Tenta buscar as variáveis de forma flexível (suporta tanto Vite quanto Next.js)
const supabaseUrl = 
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SUPABASE_URL) || 
  (typeof importScripts === "undefined" && (import.meta as any).env?.VITE_SUPABASE_URL) ||
  "";

const supabaseAnonKey = 
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) || 
  (typeof importScripts === "undefined" && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) ||
  "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("⚠️ AVISO SLL: Variáveis de ambiente do Supabase não configuradas. A integração com o banco não funcionará até que sejam definidas no .env ou Vercel.");
}

// Inicializa o cliente (usa valores placeholder para evitar a tela branca de crash caso falte a env)
export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-key"
);
