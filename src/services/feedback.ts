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
