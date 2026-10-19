import { supabase } from "../lib/supabase";

export type FeedbackVote = "up" | "down";
export type FeedbackKind = "tip" | "noah";

let cachedStoreId: string | null = null;

export async function resolveStoreId(): Promise<string> {
  if (cachedStoreId) return cachedStoreId;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("not_authenticated");
  const { data, error } = await supabase
    .from("stores")
    .select("id")
    .eq("owner_user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("store_not_found");
  cachedStoreId = data.id as string;
  return cachedStoreId;
}

export async function getMyVote(type: FeedbackKind, referenceId: string): Promise<FeedbackVote | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase
    .from("app_feedbacks")
    .select("vote")
    .eq("user_id", auth.user.id)
    .eq("type", type)
    .eq("reference_id", referenceId)
    .maybeSingle();
  return (data?.vote as FeedbackVote) ?? null;
}

export async function submitVote(params: {
  type: FeedbackKind;
  referenceId: string;
  vote: FeedbackVote;
  comment?: string;
  storeId?: string;
}): Promise<void> {
  const storeId = params.storeId ?? (await resolveStoreId());
  const { error } = await supabase.rpc("submit_feedback_vote", {
    p_store_id: storeId,
    p_type: params.type,
    p_reference_id: params.referenceId,
    p_vote: params.vote,
    p_comment: params.comment ?? null,
  });
  if (error) throw error;
}

export async function submitSuggestion(params: {
  category: "feature" | "difficulty" | "integration" | "other";
  text: string;
  storeId?: string;
}): Promise<void> {
  const storeId = params.storeId ?? (await resolveStoreId());
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("not_authenticated");
  const { error } = await supabase.from("app_feedbacks").insert({
    store_id: storeId,
    user_id: auth.user.id,
    type: "suggestion",
    payload: { category: params.category },
    comment: params.text.trim().slice(0, 2000),
  });
  if (error) throw error;
}

export type WizardStatus = { should_show: boolean; reason: string; days_since_signup: number };

export async function getWizardStatus(storeId: string): Promise<WizardStatus> {
  const { data, error } = await supabase.rpc("feedback_wizard_status", { p_store_id: storeId });
  if (error) throw error;
  return data as WizardStatus;
}

export async function dismissWizard(storeId: string): Promise<void> {
  const { error } = await supabase.rpc("feedback_dismiss_wizard", { p_store_id: storeId });
  if (error) throw error;
}

export async function submitNpsWizard(params: {
  storeId: string;
  score: number;
  topFeature?: string;
  mainPain?: string;
  mainPainOther?: string;
  comment?: string;
}): Promise<void> {
  const { error } = await supabase.rpc("submit_nps_wizard", {
    p_store_id: params.storeId,
    p_score: params.score,
    p_payload: {
      top_feature: params.topFeature || null,
      main_pain: params.mainPain || null,
      main_pain_other: params.mainPainOther || null,
    },
    p_comment: params.comment ?? null,
  });
  if (error) throw error;
}

export type NpsOption = { key: string; label: string };

export async function getNpsOptions(): Promise<{ pains: NpsOption[]; features: NpsOption[] }> {
  const { data, error } = await (supabase as any).rpc("get_nps_options");
  if (error) throw error;
  const rows = (data ?? []) as { kind: string; key: string; label: string }[];
  const pick = (kind: string): NpsOption[] =>
    rows.filter((r) => r.kind === kind).map((r) => ({ key: r.key, label: r.label }));
  return { pains: pick("pain"), features: pick("feature") };
}

export const NPS_TEXT_FIELDS: { key: string; label: string; def: string; max: number }[] = [
  { key: "invite_title", label: "Convite (balão e card)", def: "Como está sendo sua experiência com o SLL?", max: 120 },
  { key: "score_question", label: "Passo 1 · Pergunta da nota (0 a 10)", def: "De 0 a 10, o quanto você recomendaria o SLL a outro lojista?", max: 200 },
  { key: "pain_title", label: "Passo 2 · Pergunta (dificuldade)", def: "Qual tem sido a sua maior dificuldade?", max: 60 },
  { key: "feature_title", label: "Passo 3 · Pergunta (funcionalidade)", def: "Qual recurso mais gera resultado?", max: 60 },
  { key: "comment_question", label: "Passo 4 · Pergunta do comentário", def: "Quer deixar algum comentário? (opcional)", max: 200 },
  { key: "comment_placeholder", label: "Passo 4 · Placeholder do comentário", def: "O que podemos melhorar?", max: 120 },
];

export const NPS_TEXT_DEFAULTS: Record<string, string> = NPS_TEXT_FIELDS.reduce<Record<string, string>>(
  (m, f) => { m[f.key] = f.def; return m; }, {});

export async function getNpsTexts(): Promise<Record<string, string>> {
  const { data, error } = await (supabase as any).rpc("get_nps_texts");
  if (error) throw error;
  return (data ?? {}) as Record<string, string>;
}
