process.loadEnvFile();
import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  console.log("❌ SUPABASE_SERVICE_ROLE_KEY não encontrada no .env");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  db: { schema: "public" }
});

// Lista todos os schemas existentes no banco
const { data: schemas, error: schemaError } = await supabase
  .rpc("get_schemas");

if (schemaError) {
  console.log("RPC get_schemas não existe. Vamos via SQL direto.");
}

const { data, error } = await supabase
  .from("pg_tables")
  .select("schemaname, tablename")
  .in("schemaname", ["public", "vidlytics", "live", "admin"])
  .order("schemaname");

if (error) {
  console.log("Erro pg_tables:", error.message);
} else {
  console.log(JSON.stringify(data, null, 2));
}