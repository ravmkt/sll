import { supabase } from '@/lib/supabase';

export type TeamRole = "admin" | "operador" | "financeiro" | "vendedor" | "contador";
export type TeamScope = "all" | "own";
export type TeamPermissions = Record<string, string[]>;

export interface TeamMember {
  id: string;
  store_id: string;
  user_id: string;
  role: string;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  commission_pct: number | null;
  scope: TeamScope;
  permissions: TeamPermissions;
  active: boolean;
  must_change_password: boolean;
  created_at: string | null;
}

const COLS =
  "id, store_id, user_id, role, display_name, email, phone, commission_pct, scope, permissions, active, must_change_password, created_at";

export async function listTeam(storeId: string): Promise<TeamMember[]> {
  const { data, error } = await supabase
    .from("store_members")
    .select(COLS)
    .eq("store_id", storeId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as TeamMember[];
}

export async function getMyMembership(storeId: string): Promise<TeamMember | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await supabase
    .from("store_members")
    .select(COLS)
    .eq("store_id", storeId)
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as TeamMember | null) ?? null;
}

export async function updateMember(
  id: string,
  patch: Partial<Pick<TeamMember, "role" | "display_name" | "phone" | "commission_pct" | "scope" | "permissions" | "active">>,
): Promise<void> {
  const { error } = await supabase.from("store_members").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

export type MemberAction = "create" | "reset_password" | "change_own_password";

export async function callMemberFn<T = Record<string, unknown>>(
  action: MemberAction,
  payload: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke("gestor-create-member", {
    body: { action, ...payload },
  });
  if (error) {
    let msg = error.message;
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx) {
        const j = await ctx.json();
        if (j?.error) msg = String(j.error);
      }
    } catch {
      /* mantém a mensagem padrão */
    }
    throw new Error(msg);
  }
  if (data && typeof data === "object" && "error" in data && (data as { error?: string }).error) {
    throw new Error(String((data as { error: string }).error));
  }
  return data as T;
}
export interface MemberAccess {
  role: string;
  scope: TeamScope;
  active: boolean;
  must_change_password: boolean;
  permissions: TeamPermissions;
}

export async function getMyAccess(storeId: string): Promise<MemberAccess | null> {
  const { data, error } = await supabase.rpc("gestor_my_access", { p_store: storeId });
  if (error) throw new Error(error.message);
  return (data as MemberAccess | null) ?? null;
}

export interface MemberUpdate {
  role: TeamRole;
  display_name: string;
  phone: string;
  commission_pct: number | null;
  scope: TeamScope;
  permissions: TeamPermissions;
  active: boolean;
}

export async function saveMember(storeId: string, userId: string, f: MemberUpdate): Promise<void> {
  const { error } = await supabase.rpc("gestor_member_update", {
    p_store: storeId,
    p_user: userId,
    p_role: f.role,
    p_display_name: f.display_name,
    p_phone: f.phone,
    p_commission: f.commission_pct,
    p_scope: f.scope,
    p_permissions: f.permissions,
    p_active: f.active,
  });
  if (error) throw new Error(error.message);
}