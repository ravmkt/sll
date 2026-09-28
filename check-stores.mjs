process.loadEnvFile();
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const { data, error } = await supabase.rpc("get_table_columns", { table_name: "stores" });
if (error) {
  console.log("RPC não existe, tentando via insert dry-run...");
  const { error: insertError } = await supabase.from("stores").insert({});
  console.log(insertError?.message);
} else {
  console.log(data);
}