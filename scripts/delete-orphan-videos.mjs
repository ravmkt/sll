import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const csv = process.argv[2];
const apply = process.argv.includes("--apply");
const sb = createClient("https://flivmllysdhaydhogmhg.supabase.co", process.env.SUPABASE_SERVICE_ROLE_KEY);

const KEEP = [
  "/brand/", "/live_promo/",
  "1791315387594_3uoyjp", "1791376749829_yr6etm", "1791376758516_ftsgv0",
  "1791376763133_rql0xo", "1791376770156_fd7gh3", "1791666211392_3xaao5",
];

const names = fs.readFileSync(csv, "utf8").split(/\r?\n/).slice(1)
  .map((l) => (l.split(",")[1] || "").replace(/"/g, "").trim())
  .filter(Boolean)
  .filter((n) => !KEEP.some((k) => n.includes(k)));

console.log(`${names.length} arquivos para apagar (bucket videos)`);
if (!apply) { console.log(names.join("\n")); console.log("\nSimulação. Use --apply para apagar."); process.exit(0); }

for (let i = 0; i < names.length; i += 50) {
  const { error } = await sb.storage.from("videos").remove(names.slice(i, i + 50));
  if (error) { console.error("Erro:", error.message); process.exit(1); }
  console.log(`Apagados ${Math.min(i + 50, names.length)}/${names.length}`);
}
