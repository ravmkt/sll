process.loadEnvFile();
import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(url, key);

async function check(table) {
  const { data, error } = await supabase.from(table).select("*").limit(1);
  if (error) {
    console.log(`❌ ${table}: ${error.message}`);
  } else {
    console.log(`✅ ${table} existe. Exemplo de colunas:`, data && data[0] ? Object.keys(data[0]) : "(tabela vazia, sem colunas visíveis)");
  }
}

async function main() {
  await check("stores");
  await check("store_settings");
}

main();