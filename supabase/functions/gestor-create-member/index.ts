import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

const ROLES = ['admin', 'operador', 'financeiro', 'vendedor', 'contador'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const token = (req.headers.get('Authorization') || '').replace('Bearer ', '');
    const { data: u } = await admin.auth.getUser(token);
    const caller = u?.user;
    if (!caller) return json({ error: 'Não autenticado' }, 401);

    const body = await req.json();
    const action = String(body.action || '');

    // Troca da própria senha (modal do primeiro acesso)
    if (action === 'change_own_password') {
      const pwd = String(body.new_password || '');
      if (pwd.length < 8) return json({ error: 'A senha deve ter ao menos 8 caracteres' }, 400);
      const { error: e1 } = await admin.auth.admin.updateUserById(caller.id, { password: pwd });
      if (e1) return json({ error: e1.message }, 400);
      await admin.from('store_members').update({ must_change_password: false, updated_at: new Date().toISOString() }).eq('user_id', caller.id);
      return json({ ok: true });
    }

    const storeId = String(body.store_id || '');
    if (!storeId) return json({ error: 'store_id obrigatório' }, 400);

    // Nível do chamador: owner ou admin da loja
    const { data: st } = await admin.from('stores').select('owner_user_id').eq('id', storeId).maybeSingle();
    const isOwner = st?.owner_user_id === caller.id;
    let isAdmin = false;
    if (!isOwner) {
      const { data: me } = await admin.from('store_members').select('role,active').eq('store_id', storeId).eq('user_id', caller.id).maybeSingle();
      isAdmin = !!me && me.active && ['owner', 'admin'].includes(me.role);
    }
    if (!isOwner && !isAdmin) return json({ error: 'Sem permissão para gerenciar a equipe' }, 403);

    if (action === 'create') {
      const email = String(body.email || '').trim().toLowerCase();
      const name = String(body.display_name || '').trim();
      const pwd = String(body.password || '');
      const role = String(body.role || '');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: 'E-mail inválido' }, 400);
      if (!name) return json({ error: 'Informe o nome' }, 400);
      if (pwd.length < 8) return json({ error: 'A senha provisória deve ter ao menos 8 caracteres' }, 400);
      if (!ROLES.includes(role)) return json({ error: 'Função inválida' }, 400);
      if (role === 'admin' && !isOwner) return json({ error: 'Só o dono da loja cria administradores' }, 403);

      const scope = body.scope === 'all' || body.scope === 'own' ? body.scope : (role === 'vendedor' ? 'own' : 'all');
      let commission: number | null = null;
      if (body.commission_pct !== null && body.commission_pct !== undefined && body.commission_pct !== '') {
        commission = Number(body.commission_pct);
        if (!Number.isFinite(commission) || commission < 0 || commission > 100) return json({ error: 'Comissão deve estar entre 0 e 100' }, 400);
      }
      const permissions = body.permissions && typeof body.permissions === 'object' ? body.permissions : {};

      const { data: created, error: eCreate } = await admin.auth.admin.createUser({
        email, password: pwd, email_confirm: true, user_metadata: { nome_completo: name },
      });
      if (eCreate || !created?.user) {
        const m = eCreate?.message || 'Falha ao criar usuário';
        return json({ error: /already|registered|exists/i.test(m) ? 'Este e-mail já tem cadastro no SLL. Cada usuário pertence a uma única loja.' : m }, 400);
      }
      const newId = created.user.id;

      const { error: eProf } = await admin.from('profiles').upsert({ id: newId, email, name }, { onConflict: 'id' });
      if (eProf) { await admin.auth.admin.deleteUser(newId); return json({ error: 'Perfil: ' + eProf.message }, 400); }

      const { error: eMem } = await admin.from('store_members').insert({
        store_id: storeId, user_id: newId, role, display_name: name, email,
        phone: body.phone ? String(body.phone) : null,
        commission_pct: commission, scope, permissions, active: true, must_change_password: true,
      });
      if (eMem) { await admin.auth.admin.deleteUser(newId); return json({ error: 'Equipe: ' + eMem.message }, 400); }

      return json({ ok: true, user_id: newId });
    }

    if (action === 'reset_password') {
      const userId = String(body.user_id || '');
      const pwd = String(body.password || '');
      if (pwd.length < 8) return json({ error: 'A senha provisória deve ter ao menos 8 caracteres' }, 400);
      const { data: m } = await admin.from('store_members').select('role').eq('store_id', storeId).eq('user_id', userId).maybeSingle();
      if (!m) return json({ error: 'Usuário não pertence a esta loja' }, 404);
      if (m.role === 'owner' || (m.role === 'admin' && !isOwner)) return json({ error: 'Sem permissão para este usuário' }, 403);
      const { error: e2 } = await admin.auth.admin.updateUserById(userId, { password: pwd });
      if (e2) return json({ error: e2.message }, 400);
      await admin.from('store_members').update({ must_change_password: true, updated_at: new Date().toISOString() }).eq('store_id', storeId).eq('user_id', userId);
      return json({ ok: true });
    }

    return json({ error: 'Ação inválida' }, 400);
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
