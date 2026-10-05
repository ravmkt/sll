import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { code, store_id, redirect_uri } = await req.json();

    if (!code || !store_id) {
      return new Response(
        JSON.stringify({ error: 'Parâmetros "code" e "store_id" são obrigatórios.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const APP_ID = Deno.env.get('INSTAGRAM_APP_ID')!;
    const APP_SECRET = Deno.env.get('INSTAGRAM_APP_SECRET')!;

    const FINAL_REDIRECT_URI = redirect_uri?.trim() || 'https://app.sllhub.com.br/dashboard/integracao';

    console.log('INICIO - code prefix:', code.substring(0, 15) + '...', 'store_id:', store_id);
    console.log('APP_ID usado:', APP_ID);
    console.log('redirect_uri usado:', FINAL_REDIRECT_URI);
    console.log('APP_SECRET length:', APP_SECRET?.length);

    // 1. Troca o codigo temporario pelo Short-Lived Access Token
    const exchangeBody = new URLSearchParams({
      client_id: APP_ID,
      client_secret: APP_SECRET,
      grant_type: 'authorization_code',
      redirect_uri: FINAL_REDIRECT_URI,
      code: code,
    });

    const tokenResponse = await fetch('https://graph.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: exchangeBody.toString(),
    });

    const tokenData = await tokenResponse.json();
    console.log('RESPOSTA TROCA TOKEN:', JSON.stringify(tokenData));

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error('Erro na troca do token Meta:', tokenData);
      throw new Error(
        (tokenData.error_message || tokenData.error?.message || 'Falha ao obter token do Instagram.') +
        ' | redirect_uri=[' + FINAL_REDIRECT_URI + '] client_id=[' + APP_ID + ']'
      );
    }

    const shortLivedToken = tokenData.access_token;
    const instagramUserId = tokenData.user_id;

    // 2. Troca o Short-Lived Token por um Long-Lived Access Token
    const longLivedUrl = `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${APP_SECRET}&access_token=${shortLivedToken}`;
    const longLivedResp = await fetch(longLivedUrl);
    const longLivedData = await longLivedResp.json();
    console.log('RESPOSTA LONG-LIVED:', JSON.stringify({ ok: !!longLivedData.access_token, expires_in: longLivedData.expires_in ?? null, error: longLivedData.error ?? null }));

    const finalAccessToken = longLivedData.access_token || shortLivedToken;

    // 3. Resgata informacoes basicas do perfil
    const profileUrl = `https://graph.instagram.com/me?fields=id,username,account_type&access_token=${finalAccessToken}`;
    const profileResp = await fetch(profileUrl);
    const profileData = await profileResp.json();
    console.log('RESPOSTA PERFIL:', JSON.stringify(profileData));

    // 4. Salva ou atualiza a integracao
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const nowIso = new Date().toISOString();
    const ttl = longLivedData.access_token ? Number(longLivedData.expires_in ?? 5184000) : 3600;
    const expIso = new Date(Date.now() + ttl * 1000).toISOString();

    const { data: integ, error: dbError } = await supabase.from('store_integrations').upsert({
      store_id: store_id,
      platform: 'instagram',
      access_token: null,
      account_id: String(instagramUserId || profileData.id || ''),
      account_username: profileData.username || 'instagram_user',
      display_name: profileData.username || null,
      status: 'active',
      token_expires_at: expIso,
      connected_at: nowIso,
      updated_at: nowIso,
    }, { onConflict: 'store_id,platform' }).select('id').single();
    if (dbError) throw dbError;

    const { error: secErr } = await supabase.from('store_integration_secrets').upsert({
      integration_id: integ.id,
      access_token: finalAccessToken,
      token_expires_at: expIso,
      updated_at: nowIso,
    }, { onConflict: 'integration_id' });
    if (secErr) throw secErr;

    return new Response(
      JSON.stringify({
        success: true,
        username: profileData.username,
        message: 'Instagram conectado com sucesso!',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Erro na Edge Function de Autenticacao:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Erro interno de servidor.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
