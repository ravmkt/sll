import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { action, store_id, provider, secret } = await req.json();
    if (!store_id) return json({ error: 'Loja não informada.' }, 400);

    const url = Deno.env.get('SUPABASE_URL')!;
    const user = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const { data: u } = await user.auth.getUser();
    if (!u?.user) return json({ error: 'Não autenticado.' }, 401);

    const { data: can, error: ce } = await user.rpc('gestor_fin_can', { p_store: store_id, p_action: 'editar' });
    if (ce || !can) return json({ error: 'Sem permissão para editar o financeiro.' }, 403);

    if (provider !== 'pagarme') return json({ error: 'Este gateway ainda não está disponível.' }, 400);

    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    if (action === 'clear_key') {
      const { error } = await admin.rpc('gestor_fin_secret_clear', { p_store: store_id, p_provider: provider });
      if (error) throw error;
      return json({ ok: true });
    }

    if (action === 'save_key') {
      const key = String(secret || '').trim();
      if (!/^sk_(test_)?[A-Za-z0-9]{8,}$/.test(key)) {
        return json({ error: 'Informe a chave secreta do Pagar.me (começa com sk_). A chave pública (pk_) não serve.' }, 400);
      }
      const mode = key.startsWith('sk_test_') ? 'test' : 'live';
      const r = await fetch('https://api.pagar.me/core/v5/orders?page=1&size=1', {
        headers: { Authorization: 'Basic ' + btoa(key + ':'), Accept: 'application/json' },
      });
      if (r.status === 401 || r.status === 403) return json({ error: 'Chave recusada pelo Pagar.me. Confira se copiou a chave secreta inteira.' }, 400);
      if (!r.ok) return json({ error: `O Pagar.me respondeu ${r.status}. Tente de novo em instantes.` }, 400);

      const { error } = await admin.rpc('gestor_fin_secret_put', {
        p_store: store_id, p_provider: provider, p_secret: key, p_mode: mode,
      });
      if (error) throw error;
      return json({ ok: true, mode });
    }

    return json({ error: 'Ação inválida.' }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 400);
  }
});