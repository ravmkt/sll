import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Cache-Control": "public, max-age=15",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const host = (new URL(req.url).searchParams.get("host") || "")
    .toLowerCase().replace(/^www\./, "");
  const json = (b: unknown) =>
    new Response(JSON.stringify(b), { headers: { ...cors, "Content-Type": "application/json" } });
  if (!host) return json({ state: "inactive", server_time: new Date().toISOString() });

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    db: { schema: "pulse" },
  });
  const { data } = await sb.from("gates")
    .select("*")
    .eq("enabled", true)
    .or(`domains.cs.{${host}},domains.cs.{www.${host}}`)
    .order("starts_at", { ascending: false })
    .limit(5);

  const now = Date.now();
  const g = (data || []).find((x: any) => new Date(x.starts_at).getTime() <= now && now < new Date(x.ends_at).getTime());
  const base = { server_time: new Date(now).toISOString() };
  const domains = (data?.[0]?.domains as string[] | undefined) || [];
  if (!g) return json({ ...base, state: "inactive", domains });

  // interruptor "Aplicativo ativado" do modulo Pulse
  if ((g as any).store_id) {
    const { data: on } = await sb.schema("public").rpc("get_module_app_enabled", {
      p_store_id: (g as any).store_id,
      p_module: "pulse",
    });
    if (on === false) return json({ ...base, state: "inactive", domains, app_disabled: true });
  }

  return json({
    ...base,
    state: "active",
    gate_id: g.id,
    gate_url: g.gate_url,
    ends_at: g.ends_at,
    domains: g.domains,
    whatsapp_url: g.whatsapp_url,
    exclude_bots: g.exclude_bots,
    preserve_params: g.preserve_params,
    bypass_param: g.bypass_param,
  });
});