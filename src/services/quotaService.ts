import { supabase } from '@/lib/supabase';

export type QuotaKind = 'videos' | 'storage' | 'plays';
export type QuotaLevel = 'ok' | 'warn' | 'over' | 'blocked';

export type QuotaState = {
  allowed: boolean;
  level: QuotaLevel;
  kind: QuotaKind;
  reason?: 'module_inactive';
  used: number;
  limit: number | null;
  pct: number | null;
};

export async function checkQuota(storeId: string, kind: QuotaKind, extra = 0): Promise<QuotaState> {
  const { data, error } = await (supabase as any).rpc('check_store_quota', {
    p_store_id: storeId,
    p_kind: kind,
    p_extra: extra,
  });
  if (error) throw new Error(error.message);
  return data as QuotaState;
}

// Erro lancado pelo banco quando o insert estoura a cota: "QUOTA_EXCEEDED:videos|storage|module_inactive"
export function quotaErrorKind(err: unknown): string | null {
  const msg = String((err as any)?.message ?? err ?? '');
  const m = /QUOTA_EXCEEDED:(\w+)/.exec(msg);
  return m ? m[1] : null;
}