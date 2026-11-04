import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const API = "https://generativelanguage.googleapis.com/v1beta";
const LAST_RESORT_MODEL = "gemini-3.1-flash-lite";

export type AiMsg = { role: "user" | "model"; text: string };

export type CallAiOpts = {
  purpose: string;
  storeId?: string | null;
  source?: string;
  system?: string;
  contents?: AiMsg[];
  prompt?: string;
  model?: string;
  models?: string[];
  search?: boolean;
  temperature?: number;
  maxOutputTokens?: number;
  thinkingBudget?: number;
  timeoutMs?: number;
  deadline?: number;
  stopOnQuota?: boolean;
};

export type CallAiResult = {
  text: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  finishReason: string;
  sources: string[];
};

export class AiError extends Error {
  status: number;
  quota: boolean;
  constructor(message: string, status = 0, quota = false) {
    super(message);
    this.status = status;
    this.quota = quota;
  }
}

export async function callAi(o: CallAiOpts): Promise<CallAiResult> {
  const key = Deno.env.get("GEMINI_API_KEY") ?? "";
  if (!key) throw new AiError("IA_NAO_CONFIGURADA");

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  let models = (o.models ?? []).filter(Boolean);
  let search = o.search;
  if (!models.length) {
    const { data: cfg } = await admin
      .from("admin_ai_settings")
      .select("model, fallback_model, use_web_search")
      .eq("purpose", o.purpose)
      .maybeSingle();
    models = [o.model || cfg?.model, cfg?.fallback_model, LAST_RESORT_MODEL].filter(Boolean) as string[];
    if (search === undefined) search = cfg?.use_web_search === true;
  }
  models = [...new Set(models)];

  const contents = (o.contents && o.contents.length ? o.contents : [{ role: "user" as const, text: o.prompt ?? "" }]).map((c) => ({
    role: c.role,
    parts: [{ text: c.text }],
  }));

  const generationConfig: Record<string, unknown> = { temperature: o.temperature ?? 0.4 };
  if (o.maxOutputTokens) generationConfig.maxOutputTokens = o.maxOutputTokens;
  if (o.thinkingBudget !== undefined) generationConfig.thinkingConfig = { thinkingBudget: o.thinkingBudget };

  const errs: string[] = [];
  let lastStatus = 0;
  let quota = false;

  for (const m of models) {
    if (o.deadline && Date.now() > o.deadline) { errs.push("prazo global excedido"); break; }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), o.timeoutMs ?? 50000);
    try {
      const res = await fetch(`${API}/models/${m}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        signal: ctrl.signal,
        body: JSON.stringify({
          ...(o.system ? { systemInstruction: { parts: [{ text: o.system }] } } : {}),
          contents,
          ...(search ? { tools: [{ google_search: {} }] } : {}),
          generationConfig,
        }),
      });

      if (!res.ok) {
        lastStatus = res.status;
        errs.push(`${m} ${res.status} ${(await res.text()).replace(/\s+/g, " ").slice(0, 140)}`);
        if (res.status === 429) {
          quota = true;
          if (o.stopOnQuota) break;
        }
        if (res.status === 400 || res.status === 404 || res.status === 429 || res.status >= 500) continue;
        break;
      }

      const j = await res.json().catch(() => null);
      if (!j) { errs.push(`${m} resposta invalida`); continue; }

      const cand = j?.candidates?.[0];
      const text = String((cand?.content?.parts ?? []).map((p: any) => p?.text ?? "").join(""));
      const sources = [...new Set(
        ((cand?.groundingMetadata?.groundingChunks ?? []) as any[])
          .map((ch) => String(ch?.web?.title ?? "").trim())
          .filter(Boolean),
      )];

      const usage = j?.usageMetadata ?? {};
      const pt = Number(usage.promptTokenCount ?? 0);
      const tt = Number(usage.totalTokenCount ?? 0);
      const ct = tt > pt ? tt - pt : Number(usage.candidatesTokenCount ?? 0);

      const { error: usageErr } = await admin.schema("noah").rpc("log_usage", {
        p_store_id: o.storeId ?? null,
        p_purpose: o.purpose,
        p_model: m,
        p_prompt: pt,
        p_completion: ct,
        p_source: o.source ?? o.purpose,
      });
      if (usageErr) console.error("noah.log_usage", usageErr.message);

      return {
        text,
        model: m,
        promptTokens: pt,
        completionTokens: ct,
        totalTokens: tt || pt + ct,
        finishReason: String(cand?.finishReason ?? ""),
        sources,
      };
    } catch (e) {
      errs.push(`${m} ${(e as Error).message}`);
    } finally {
      clearTimeout(timer);
    }
  }

  throw new AiError(errs.join(" | ") || "IA_INDISPONIVEL", lastStatus, quota);
}