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

    // Garante que o redirect_uri seja identico ao enviado no frontend
    const FINAL_REDIRECT_URI = redirect_uri?.trim() || 'https://sll-hub-sooty.vercel.app/dashboard/integracao';

    // 1. Troca o codigo temporario pelo Short-Lived Access Token
    // Usa graph.instagram.com para Instagram Login for Business
    const exchangeBody = new URLSearchParams({
      client_id: APP_ID,
      client_secret: APP_SECRET,
      grant_type: 'authorization_code',
      redirect_uri: FINAL_REDIRECT_URI,
      code: code,
    });

    console.log('Trocando code pelo token. redirect_uri:', FINAL_REDIRECT_URI);

    const tokenResponse = await fetch('https://graph.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: exchangeBody.toString(),
    });

    const tokenData = await tokenResponse.json();

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

    const finalAccessToken = longLivedData.access_token || shortLivedToken;

    // 3. Resgata informacoes basicas do perfil
    const profileUrl = `https://graph.instagram.com/me?fields=id,username,account_type&access_token=${finalAccessToken}`;
    const profileResp = await fetch(profileUrl);
    const profileData = await profileResp.json();

    // 4. Salva ou atualiza a integracao
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error: dbError } = await supabase.from('store_integrations').upsert({
      store_id: store_id,
      platform: 'instagram',
      access_token: finalAccessToken,
      account_id: String(instagramUserId || profileData.id || ''),
      account_username: profileData.username || 'instagram_user',
      updated_at: new Date().toISOString(),
    });

    if (dbError) throw dbError;

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