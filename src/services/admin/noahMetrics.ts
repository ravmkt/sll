import { supabase } from "@/lib/supabase";

export type NoahDaily = { day: string; up: number; down: number };
export type NoahDown = {
  created_at: string;
  store_id: string;
  store_name: string | null;
  question: string | null;
  reference_id: string | null;
};
export type NoahFeedbackMetrics = {
  up: number;
  down: number;
  total: number;
  daily: NoahDaily[];
  downs: NoahDown[];
};

export async function getNoahFeedbackMetrics(days: number): Promise<NoahFeedbackMetrics> {
  const { data, error } = await (supabase as any).rpc("admin_noah_feedback_metrics", { p_days: days });
  if (error) throw error;
  return data as NoahFeedbackMetrics;
}