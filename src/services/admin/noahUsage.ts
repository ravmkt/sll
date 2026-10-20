import { supabase } from '@/lib/supabase';

export type NoahDaily = { day: string; questions: number; total_tokens: number; truncated: number };
export type NoahModel = { model: string; questions: number; prompt_tokens: number; completion_tokens: number; total_tokens: number };
export type NoahRecent = {
  created_at: string;
  store_name: string;
  model: string | null;
  total_tokens: number;
  finish_reason: string | null;
  user_message: string | null;
};

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function rangeFromDays(days: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  return { start: iso(start), end: iso(end), from: start.toISOString() };
}

export async function getNoahUsage(days: number) {
  const r = rangeFromDays(days);
  const [daily, models, recent] = await Promise.all([
    supabase.rpc('admin_noah_daily', { p_start: r.start, p_end: r.end }),
    supabase.rpc('admin_noah_metrics', { p_from: r.from }),
    supabase.rpc('admin_noah_recent', { p_limit: 50 }),
  ]);
  const err = daily.error || models.error || recent.error;
  if (err) throw new Error(err.message);
  const n = (v: unknown) => Number(v ?? 0);
  return {
    daily: ((daily.data ?? []) as any[]).map((x) => ({
      day: String(x.day), questions: n(x.questions), total_tokens: n(x.total_tokens), truncated: n(x.truncated),
    })) as NoahDaily[],
    models: ((models.data ?? []) as any[]).map((x) => ({
      model: String(x.model), questions: n(x.questions), prompt_tokens: n(x.prompt_tokens),
      completion_tokens: n(x.completion_tokens), total_tokens: n(x.total_tokens),
    })) as NoahModel[],
    recent: ((recent.data ?? []) as any[]).map((x) => ({
      created_at: String(x.created_at), store_name: String(x.store_name), model: x.model ?? null,
      total_tokens: n(x.total_tokens), finish_reason: x.finish_reason ?? null, user_message: x.user_message ?? null,
    })) as NoahRecent[],
  };
}