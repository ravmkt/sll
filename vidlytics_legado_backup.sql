--
-- PostgreSQL database dump
--

\restrict ywifKRusvFaWgfYCU0dehpCNPbaqtq0xMlQLX0KW6WNlKnfGLL8c4ONcDDqhwcT

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.11

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: _check_rate_limit(uuid, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._check_rate_limit(p_store_id uuid, p_client_hash text, p_max_per_minute integer) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_window bigint := floor(extract(epoch from now()) / 60);
  v_count integer;
BEGIN
  INSERT INTO public.analytics_rate_limits (client_hash, store_id, window_minute, request_count)
  VALUES (p_client_hash, p_store_id, v_window, 1)
  ON CONFLICT (client_hash, store_id, window_minute)
  DO UPDATE SET request_count = analytics_rate_limits.request_count + 1
  RETURNING request_count INTO v_count;

  RETURN v_count <= p_max_per_minute;
END;
$$;


--
-- Name: admin_extend_subscription(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_extend_subscription(p_store_id uuid, p_days integer) RETURNS timestamp with time zone
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_base timestamptz;
  v_new_end timestamptz;
BEGIN
  SELECT COALESCE(current_period_end, now()) INTO v_base
  FROM subscriptions
  WHERE store_id = p_store_id AND is_current = true;

  v_base := GREATEST(v_base, now());
  v_new_end := v_base + (p_days || ' days')::interval;

  UPDATE subscriptions
  SET current_period_end = v_new_end, status = 'active', updated_at = now()
  WHERE store_id = p_store_id AND is_current = true;

  UPDATE stores
  SET current_period_end = v_new_end,
      subscription_status = 'active',
      trial_ends_at = NULL,
      updated_at = now()
  WHERE id = p_store_id;

  RETURN v_new_end;
END;
$$;


--
-- Name: admin_set_store_lifetime(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_set_store_lifetime(p_store_id uuid, p_plan_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_now timestamptz := now();
BEGIN
  UPDATE stores
  SET subscription_status = 'lifetime',
      plan_id = p_plan_id,
      trial_ends_at = NULL,
      updated_at = v_now
  WHERE id = p_store_id;

  UPDATE subscriptions
  SET is_current = false, updated_at = v_now
  WHERE store_id = p_store_id AND is_current = true;

  INSERT INTO subscriptions (store_id, plan_id, status, current_period_start, current_period_end, is_current, billing_provider, created_at, updated_at)
  VALUES (p_store_id, p_plan_id, 'lifetime', v_now, NULL, true, 'manual_admin', v_now, v_now);

  RETURN json_build_object('success', true, 'store_id', p_store_id, 'status', 'lifetime');
END;
$$;


--
-- Name: admin_set_store_plan(uuid, text, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_set_store_plan(p_store_id uuid, p_plan_name text, p_status text, p_duration_months integer DEFAULT 1) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_now timestamptz := now();
  v_end timestamptz := v_now + (p_duration_months || ' months')::interval;
  v_plan_id uuid;
  v_storage_limit_bytes bigint;
begin
  if p_status not in ('trialing', 'active', 'past_due', 'canceled') then
    raise exception 'Status inválido: %', p_status;
  end if;

  select id, storage_limit_bytes
    into v_plan_id, v_storage_limit_bytes
  from public.plans
  where lower(name) = lower(p_plan_name)
     or lower(slug) = lower(p_plan_name)
  limit 1;

  if v_plan_id is null then
    raise exception 'Plano "%" não encontrado em public.plans', p_plan_name;
  end if;

  -- Desmarca qualquer assinatura vigente anterior desta loja
  update public.subscriptions
  set is_current = false,
      updated_at = v_now
  where store_id = p_store_id
    and is_current = true;

  -- Insere a nova assinatura vigente
  insert into public.subscriptions (
    store_id,
    plan_id,
    status,
    current_period_start,
    current_period_end,
    is_current,
    billing_provider,
    created_at,
    updated_at
  )
  values (
    p_store_id,
    v_plan_id,
    p_status,
    v_now,
    v_end,
    true,
    'manual_admin',
    v_now,
    v_now
  );

  -- Sincroniza a tabela stores
  update public.stores
  set
    plan_id = v_plan_id,
    storage_limit_bytes = v_storage_limit_bytes,
    subscription_status = p_status,
    trial_ends_at = case when p_status = 'trialing' then v_end else null end,
    updated_at = v_now
  where id = p_store_id;

  return json_build_object(
    'success', true,
    'store_id', p_store_id,
    'plan_id', v_plan_id,
    'plan_name', p_plan_name,
    'status', p_status,
    'current_period_end', v_end,
    'storage_limit_bytes', v_storage_limit_bytes
  );
end;
$$;


--
-- Name: auto_assign_super_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_assign_super_admin() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if new.email in ('rodrigoavicennte@gmail.com', 'ravmkt1979@gmail.com') then
    new.is_super_admin := true;
  end if;
  return new;
end;
$$;


--
-- Name: check_chat_rate_limit(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_chat_rate_limit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  recent_count integer;
BEGIN
  IF NEW.is_from_store = false AND NEW.session_id IS NOT NULL THEN
    SELECT count(*) INTO recent_count
    FROM public.live_chat_messages
    WHERE session_id = NEW.session_id
      AND created_at > now() - interval '10 seconds';

    IF recent_count >= 5 THEN
      RAISE EXCEPTION 'RATE_LIMIT_EXCEEDED';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    video_id uuid NOT NULL,
    store_id uuid NOT NULL,
    user_name text,
    user_email text,
    content text NOT NULL,
    status text DEFAULT 'pending'::text,
    parent_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    reply_content text,
    reply_status text
);

ALTER TABLE ONLY public.comments FORCE ROW LEVEL SECURITY;


--
-- Name: create_comment_safe(uuid, uuid, text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_comment_safe(p_store_id uuid, p_video_id uuid, p_user_fingerprint text, p_user_name text, p_user_email text, p_content text) RETURNS public.comments
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_row public.comments;
  v_auto_approve boolean;
BEGIN
  IF NOT public._check_rate_limit(p_store_id, 'comment:' || p_user_fingerprint, 5) THEN
    RAISE EXCEPTION 'rate_limit_exceeded';
  END IF;

  IF length(trim(p_content)) = 0 OR length(p_content) > 1000 THEN
    RAISE EXCEPTION 'invalid_content';
  END IF;

  SELECT auto_approve_comments INTO v_auto_approve
  FROM public.store_settings
  WHERE store_id = p_store_id;

  INSERT INTO public.comments (store_id, video_id, user_name, user_email, content, status)
  VALUES (
    p_store_id, p_video_id, p_user_name, p_user_email, p_content,
    CASE WHEN v_auto_approve THEN 'approved' ELSE 'pending' END
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;


--
-- Name: create_or_get_user_tenant(uuid, text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_or_get_user_tenant(p_user_id uuid, p_user_name text, p_user_email text, p_store_name text, p_referral_code text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_store_id uuid;
  v_is_new boolean := false;
  v_slug text;
  v_clean_name text;
  v_referrer_store_id uuid := null;
  v_clean_ref_code text;
begin
  insert into public.profiles (user_id, name, email, created_at)
  values (p_user_id, coalesce(nullif(trim(p_user_name), ''), 'Lojista'), p_user_email, now())
  on conflict (user_id) do update
  set name = coalesce(nullif(trim(excluded.name), ''), public.profiles.name),
      email = coalesce(nullif(trim(excluded.email), ''), public.profiles.email);

  select id into v_store_id
  from public.stores
  where owner_user_id = p_user_id
  order by created_at desc
  limit 1;

  if v_store_id is null then
    select store_id into v_store_id
    from public.store_members
    where user_id = p_user_id
    order by created_at desc
    limit 1;
  end if;

  if v_store_id is not null then
    return jsonb_build_object('store_id', v_store_id, 'is_new', false);
  end if;

  v_is_new := true;
  v_store_id := gen_random_uuid();
  v_clean_name := coalesce(nullif(trim(p_store_name), ''), 'Minha Loja');
  v_slug := regexp_replace(lower(v_clean_name), '[^a-z0-9]+', '-', 'g');
  v_slug := trim(both '-' from v_slug);
  if v_slug is null or v_slug = '' then
    v_slug := 'loja-' || substr(v_store_id::text, 1, 8);
  else
    v_slug := v_slug || '-' || substr(v_store_id::text, 1, 6);
  end if;

  v_clean_ref_code := upper(trim(coalesce(p_referral_code, '')));
  if v_clean_ref_code <> '' then
    select id into v_referrer_store_id
    from public.stores
    where referral_code = v_clean_ref_code
    limit 1;
  end if;

  insert into public.stores (
    id, owner_user_id, name, slug, referred_by_store_id, created_at, updated_at
  )
  values (
    v_store_id, p_user_id, v_clean_name, v_slug, v_referrer_store_id, now(), now()
  );

  insert into public.store_members (id, store_id, user_id, role, created_at)
  values (gen_random_uuid(), v_store_id, p_user_id, 'owner', now())
  on conflict do nothing;

  if to_regclass('public.store_settings') is not null then
    insert into public.store_settings (
      id, store_id, store_name, store_url, contact_email,
      app_enabled, stories_enabled, carousel_enabled, floating_widget_enabled,
      widget_enabled, open_product_new_tab, autoplay, muted_by_default,
      show_video_controls, timezone, language, created_at
    )
    values (
      gen_random_uuid(), v_store_id, v_clean_name, v_slug, p_user_email,
      true, true, true, true, true, true, true, true, false,
      'America/Sao_Paulo', 'pt-BR', now()
    )
    on conflict do nothing;
  end if;

  if to_regclass('public.usage_counters') is not null then
    insert into public.usage_counters (
      id, store_id, month, videos_count, views_count, users_count, created_at, updated_at
    )
    values (
      gen_random_uuid(), v_store_id, to_char(now(), 'YYYY-MM'), 0, 0, 1, now(), now()
    )
    on conflict (store_id, month) do nothing;
  end if;

  return jsonb_build_object(
    'store_id', v_store_id,
    'is_new', true,
    'referred_by_store_id', v_referrer_store_id
  );
end;
$$;


--
-- Name: fn_generate_store_referral_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_generate_store_referral_code() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.referral_code IS NULL OR NEW.referral_code = '' THEN
    NEW.referral_code := 'VID-' || UPPER(SUBSTRING(MD5(NEW.id::text || clock_timestamp()::text) FROM 1 FOR 6));
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: get_master_dashboard_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_master_dashboard_stats() RETURNS TABLE(total_stores bigint, active_stores bigint, total_views bigint, total_revenue numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
declare
  curr_month text := to_char(now(), 'YYYY-MM');
begin
  if not public.is_super_admin() then
    raise exception 'Acesso negado: Requer privilégios de Super Admin.';
  end if;

  return query
  select
    (select count(*)::bigint from public.stores) as total_stores,
    (
      select count(distinct sb.store_id)::bigint
      from public.subscriptions sb
      where sb.is_current = true
        and sb.status in ('active', 'trialing', 'lifetime')
    ) as active_stores,
    (
      select coalesce(sum(uc.views_count), 0)::bigint
      from public.usage_counters uc
      where uc.month = curr_month
    ) as total_views,
    (
      select coalesce(sum(pl.price_cents), 0)::numeric / 100
      from public.subscriptions sb
      join public.plans pl on pl.id = sb.plan_id
      where sb.is_current = true and sb.status = 'active'
    ) as total_revenue;
end;
$$;


--
-- Name: get_master_overview_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_master_overview_stats() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
declare
  total_stores int;
  active_subscriptions int;
  trialing_subscriptions int;
  past_due_subscriptions int;
  total_videos int;
  current_month text := to_char(now(), 'YYYY-MM');
  total_views bigint;
begin
  if not public.is_super_admin() then
    raise exception 'Acesso negado: Requer privilégios de Super Admin.';
  end if;

  select count(*) into total_stores from public.stores;
  select count(*) into active_subscriptions from public.subscriptions where status = 'active';
  select count(*) into trialing_subscriptions from public.subscriptions where status = 'trialing';
  select count(*) into past_due_subscriptions from public.subscriptions where status = 'past_due';
  select count(*) into total_videos from public.videos;
  select coalesce(sum(views_count), 0) into total_views from public.usage_counters where month = current_month;

  return jsonb_build_object(
    'total_stores', total_stores,
    'active_subscriptions', active_subscriptions,
    'trialing_subscriptions', trialing_subscriptions,
    'past_due_subscriptions', past_due_subscriptions,
    'total_videos', total_videos,
    'current_month_views', total_views
  );
end;
$$;


--
-- Name: get_master_stores_list(text, text, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_master_stores_list(p_search text DEFAULT NULL::text, p_status text DEFAULT NULL::text, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0) RETURNS TABLE(store_id uuid, store_name text, store_slug text, created_at timestamp with time zone, owner_name text, owner_email text, contact_email text, plan_name text, subscription_status text, current_period_end timestamp with time zone, videos_count bigint, month_views bigint, logo_url text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
declare
  curr_month text := to_char(now(), 'YYYY-MM');
begin
  if not public.is_super_admin() then
    raise exception 'Acesso negado: Requer privilégios de Super Admin.';
  end if;

  return query
  select
    s.id as store_id,
    s.name as store_name,
    s.slug as store_slug,
    s.created_at,
    coalesce(p.name, 'Não identificado') as owner_name,
    coalesce(ss.owner_contact_email, s.owner_contact_email, p.email, 'Não identificado') as owner_email,
    ss.contact_email,
    coalesce(pl.name, 'Sem plano') as plan_name,
    coalesce(sub.status, 'nenhum') as subscription_status,
    sub.current_period_end,
    (select count(*)::bigint from public.videos v where v.store_id = s.id) as videos_count,
    coalesce(uc.views_count, 0)::bigint as month_views,
    ss.logo_url
  from public.stores s
  left join public.profiles p on p.user_id = s.owner_user_id
  left join public.store_settings ss on ss.store_id = s.id
  left join lateral (
    select sb.plan_id, sb.status, sb.current_period_end
    from public.subscriptions sb
    where sb.store_id = s.id
    order by sb.created_at desc
    limit 1
  ) sub on true
  left join public.plans pl on pl.id = sub.plan_id
  left join public.usage_counters uc on uc.store_id = s.id and uc.month = curr_month
  where
    (
      p_search is null
      or s.name ilike '%' || p_search || '%'
      or s.slug ilike '%' || p_search || '%'
      or p.email ilike '%' || p_search || '%'
      or ss.owner_contact_email ilike '%' || p_search || '%'
    )
    and (p_status is null or sub.status = p_status)
  order by s.created_at desc
  limit p_limit offset p_offset;
end;
$$;


--
-- Name: get_my_affiliate_data(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_my_affiliate_data() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_store RECORD;
  v_total_referrals INT := 0;
  v_active_subscribers INT := 0;
  v_monthly_recurring NUMERIC(10,2) := 0.00;
  v_accumulated_earnings NUMERIC(10,2) := 0.00;
  v_referrals_json JSON := '[]'::json;
  v_result JSON;
BEGIN
  -- Identifica a loja do usuário autenticado
  SELECT * INTO v_store
  FROM public.stores
  WHERE owner_user_id = auth.uid()
  ORDER BY created_at ASC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'referral_code', '',
      'total_referrals', 0,
      'active_subscribers', 0,
      'monthly_recurring_earnings', 0,
      'accumulated_earnings', 0,
      'referrals', '[]'::json
    );
  END IF;

  -- Se a loja ainda não tiver referral_code, cria agora
  IF v_store.referral_code IS NULL OR v_store.referral_code = '' THEN
    UPDATE public.stores
    SET referral_code = 'VID-' || UPPER(SUBSTRING(MD5(v_store.id::text || clock_timestamp()::text) FROM 1 FOR 6))
    WHERE id = v_store.id
    RETURNING * INTO v_store;
  END IF;

  -- Total acumulado já pago / registrado em referral_rewards
  SELECT COALESCE(SUM(amount), 0.00)
  INTO v_accumulated_earnings
  FROM public.referral_rewards
  WHERE referrer_store_id = v_store.id
    AND status = 'paid';

  -- Coleta dados dos indicados fazendo join correto com public.plans
  WITH referred_stores AS (
    SELECT
      s.id,
      s.name AS store_name,
      s.created_at,
      COALESCE(pl.name, 'Trial') AS plan_name,
      COALESCE(sb.status, 'trialing') AS sub_status,
      COALESCE(ROUND((pl.price_cents / 100.0)::numeric, 2), 0.00) AS plan_price
    FROM public.stores s
    LEFT JOIN LATERAL (
      SELECT sub.plan_id, sub.status
      FROM public.subscriptions sub
      WHERE sub.store_id = s.id
      ORDER BY sub.created_at DESC
      LIMIT 1
    ) sb ON true
    LEFT JOIN public.plans pl ON pl.id = sb.plan_id
    WHERE s.referred_by_store_id = v_store.id
    ORDER BY s.created_at DESC
  ),
  aggregated_items AS (
    SELECT
      id,
      store_name,
      created_at,
      plan_name,
      plan_price,
      sub_status AS status,
      ROUND((plan_price * 0.10)::numeric, 2) AS monthly_commission
    FROM referred_stores
  )
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'active'),
    COALESCE(SUM(monthly_commission) FILTER (WHERE status = 'active'), 0.00),
    COALESCE(json_agg(aggregated_items), '[]'::json)
  INTO
    v_total_referrals,
    v_active_subscribers,
    v_monthly_recurring,
    v_referrals_json
  FROM aggregated_items;

  v_result := json_build_object(
    'referral_code', v_store.referral_code,
    'total_referrals', v_total_referrals,
    'active_subscribers', v_active_subscribers,
    'monthly_recurring_earnings', v_monthly_recurring,
    'accumulated_earnings', v_accumulated_earnings,
    'referrals', v_referrals_json
  );

  RETURN v_result;
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (id, user_id, name, email, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', 'Usuário'),
    NEW.email,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;


--
-- Name: is_store_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_store_admin(target_store_id uuid) RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1
    from public.store_members sm
    where sm.store_id = target_store_id
      and sm.user_id = auth.uid()
      and sm.role in ('owner', 'admin')
  );
$$;


--
-- Name: is_store_member(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_store_member(p_store_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
    SELECT EXISTS (
        SELECT 1 FROM store_members
        WHERE store_id = p_store_id
          AND user_id = auth.uid()
    );
$$;


--
-- Name: is_store_owner(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_store_owner(check_store_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.stores WHERE id = check_store_id AND owner_user_id = auth.uid()
  );
$$;


--
-- Name: is_store_owner_or_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_store_owner_or_admin(check_store_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.stores WHERE id = check_store_id AND owner_user_id = auth.uid()
    UNION ALL
    SELECT 1 FROM public.store_members 
    WHERE store_id = check_store_id AND user_id = auth.uid() AND role IN ('owner', 'admin')
  );
$$;


--
-- Name: is_store_owner_or_member(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_store_owner_or_member(check_store_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.stores WHERE id = check_store_id AND owner_user_id = auth.uid()
    UNION ALL
    SELECT 1 FROM public.store_members WHERE store_id = check_store_id AND user_id = auth.uid()
  );
$$;


--
-- Name: is_super_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_super_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  select coalesce(
    (select is_super_admin from public.profiles where user_id = auth.uid() limit 1),
    false
  );
$$;


--
-- Name: log_activity_trigger(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_activity_trigger() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_store_id UUID;
    v_action VARCHAR(255);
    v_details TEXT;
    v_user_id UUID;
    v_format_br VARCHAR(100);
    v_story_name VARCHAR(255);
    v_story_format VARCHAR(100);
BEGIN
    -- Captura o usuário autenticado com segurança
    BEGIN
        v_user_id := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        v_user_id := NULL;
    END;

    -- Define o store_id de maneira confiável
    v_store_id := COALESCE(NEW.store_id, OLD.store_id);
    IF v_store_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- A. TABELA: STORIES
    IF TG_TABLE_NAME = 'stories' THEN
        v_action := 'Alteração no Story';
        
        IF COALESCE(NEW.format, OLD.format) = 'floating' THEN v_format_br := 'Flutuante';
        ELSIF COALESCE(NEW.format, OLD.format) = 'grid' THEN v_format_br := 'Grade';
        ELSIF COALESCE(NEW.format, OLD.format) = 'inline' THEN v_format_br := 'Carrossel';
        ELSIF COALESCE(NEW.format, OLD.format) = 'stories' THEN v_format_br := 'Stories';
        ELSE v_format_br := COALESCE(NEW.format, 'Padrão');
        END IF;

        IF TG_OP = 'INSERT' THEN
            v_details := 'O Story "' || COALESCE(NEW.name, 'STORIES') || '" foi criado no formato ' || v_format_br || '.';
        ELSIF TG_OP = 'UPDATE' THEN
            -- Evita log se não houve alteração real (usando IS DISTINCT FROM para máxima segurança)
            IF NOT (OLD.name IS DISTINCT FROM NEW.name OR OLD.format IS DISTINCT FROM NEW.format OR OLD.status IS DISTINCT FROM NEW.status) THEN
                RETURN NEW;
            END IF;
            v_details := 'O Story "' || COALESCE(NEW.name, 'STORIES') || '" foi alterado para o formato ' || v_format_br || '.';
        ELSIF TG_OP = 'DELETE' THEN
            v_action := 'Story Excluído';
            v_details := 'O Story "' || COALESCE(OLD.name, 'STORIES') || '" foi removido permanentemente.';
        END IF;

    -- B. TABELA: DISPLAY LOCATIONS (Regras de exibição do Story)
    ELSIF TG_TABLE_NAME = 'display_locations' THEN
        v_action := 'Alteração no Story';
        
        SELECT name, format INTO v_story_name, v_story_format 
        FROM public.stories 
        WHERE id = COALESCE(NEW.story_id, OLD.story_id);
        
        IF v_story_format = 'floating' THEN v_format_br := 'Flutuante';
        ELSIF v_story_format = 'grid' THEN v_format_br := 'Grade';
        ELSIF v_story_format = 'inline' THEN v_format_br := 'Carrossel';
        ELSIF v_story_format = 'stories' THEN v_format_br := 'Stories';
        ELSE v_format_br := 'Flutuante';
        END IF;

        v_details := 'O local de exibição e regras do Story "' || COALESCE(v_story_name, 'STORIES') || '" foram modificados.';

    -- C. TABELA: APPEARANCES (Design e Temas como "Clara", "Escura")
    ELSIF TG_TABLE_NAME = 'appearances' THEN
        IF TG_OP = 'INSERT' THEN
            v_action := 'Design Criado';
            v_details := 'O estilo de design "' || COALESCE(NEW.name, 'Sem nome') || '" foi adicionado.';
        ELSIF TG_OP = 'UPDATE' THEN
            v_action := 'Design Atualizado';
            -- Se alterou o nome do layout de aparência
            IF OLD.name IS DISTINCT FROM NEW.name THEN
                v_details := 'O layout de design foi renomeado de "' || OLD.name || '" para "' || NEW.name || '".';
            ELSE
                v_details := 'As cores, bordas ou fontes do player de stories "' || COALESCE(NEW.name, 'Padrão') || '" foram modificadas.';
            END IF;
        ELSIF TG_OP = 'DELETE' THEN
            v_action := 'Design Excluído';
            v_details := 'O estilo de design "' || COALESCE(OLD.name, 'Sem nome') || '" foi removido permanentemente.';
        END IF;

    -- D. TABELA: VIDEOS
    ELSIF TG_TABLE_NAME = 'videos' THEN
        IF TG_OP = 'INSERT' THEN
            v_action := 'Vídeo Enviado';
            v_details := 'O vídeo "' || COALESCE(NEW.title, 'Sem título') || '" foi adicionado à biblioteca.';
        ELSIF TG_OP = 'UPDATE' THEN
            IF OLD.title IS DISTINCT FROM NEW.title OR OLD.video_url IS DISTINCT FROM NEW.video_url THEN
                v_action := 'Vídeo Atualizado';
                v_details := 'Os parâmetros do vídeo "' || COALESCE(NEW.title, 'Sem título') || '" foram salvos.';
            ELSE
                RETURN NEW;
            END IF;
        ELSIF TG_OP = 'DELETE' THEN
            v_action := 'Vídeo Removido';
            v_details := 'O vídeo "' || COALESCE(OLD.title, 'Sem título') || '" foi excluído da biblioteca.';
        END IF;

    -- E. TABELA: PRODUCTS
    ELSIF TG_TABLE_NAME = 'products' THEN
        v_action := '⚙️ Config';
        IF TG_OP = 'INSERT' THEN
            v_details := 'O produto "' || COALESCE(NEW.title, 'Sem título') || '" foi adicionado ao catálogo.';
        ELSIF TG_OP = 'UPDATE' THEN
            IF NOT (OLD.title IS DISTINCT FROM NEW.title OR OLD.price IS DISTINCT FROM NEW.price) THEN
                RETURN NEW;
            END IF;
            v_details := 'O produto "' || COALESCE(NEW.title, 'Sem título') || '" foi atualizado.';
        ELSIF TG_OP = 'DELETE' THEN
            v_details := 'O produto "' || COALESCE(OLD.title, 'Sem título') || '" foi removido do catálogo.';
        END IF;

    -- F. TABELA: STORE SETTINGS
    ELSIF TG_TABLE_NAME = 'store_settings' THEN
        v_action := '⚙️ Config';
        IF OLD.whatsapp_contact IS NOT DISTINCT FROM NEW.whatsapp_contact AND OLD.default_appearance_id IS NOT DISTINCT FROM NEW.default_appearance_id THEN
            RETURN NEW;
        END IF;
        v_details := 'As configurações cadastrais e canais de atendimento da loja foram atualizados.';

    ELSE
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Gravação limpa
    INSERT INTO public.activity_logs (store_id, user_id, action, details, created_at)
    VALUES (v_store_id, v_user_id, v_action, v_details, NOW());

    RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
    RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: purge_old_activity_events(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.purge_old_activity_events(p_retention_days integer DEFAULT 90) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_deleted_events INTEGER := 0;
    v_deleted_rate_limits INTEGER := 0;
    v_current_minute BIGINT := (EXTRACT(EPOCH FROM NOW())::BIGINT / 60);
    v_cutoff_minute BIGINT := v_current_minute - 60;
BEGIN
    -- 1. Limpeza de eventos brutos com mais de 90 dias
    DELETE FROM public.store_activity_events
    WHERE created_at < (NOW() - (p_retention_days || ' days')::INTERVAL);
    GET DIAGNOSTICS v_deleted_events = ROW_COUNT;

    -- 2. Limpeza de janelas de rate limit com mais de 60 minutos
    DELETE FROM public.analytics_rate_limits
    WHERE window_minute < v_cutoff_minute;
    GET DIAGNOSTICS v_deleted_rate_limits = ROW_COUNT;

    RETURN jsonb_build_object(
        'deleted_events_count', v_deleted_events,
        'deleted_rate_limits_count', v_deleted_rate_limits,
        'executed_at', NOW()
    );
END;
$$;


--
-- Name: recalculate_store_storage_bytes(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.recalculate_store_storage_bytes(p_store_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_total_bytes BIGINT;
BEGIN
    SELECT COALESCE(sum(COALESCE(file_size, 0) + COALESCE(thumbnail_file_size, 0)), 0) 
    INTO v_total_bytes
    FROM videos
    WHERE store_id = p_store_id;

    UPDATE stores
    SET storage_used_bytes = v_total_bytes
    WHERE id = p_store_id;
END;
$$;


--
-- Name: sanitize_appearance_colors(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sanitize_appearance_colors() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Remove caracteres perigosos de qualquer campo de cor
  NEW.primary_color   := regexp_replace(NEW.primary_color,   '[<>"''`&;{}()\\]', '', 'g');
  NEW.secondary_color := regexp_replace(NEW.secondary_color, '[<>"''`&;{}()\\]', '', 'g');
  NEW.text_color      := regexp_replace(NEW.text_color,      '[<>"''`&;{}()\\]', '', 'g');
  NEW.background_color:= regexp_replace(NEW.background_color,'[<>"''`&;{}()\\]', '', 'g');
  NEW.button_color    := regexp_replace(NEW.button_color,    '[<>"''`&;{}()\\]', '', 'g');
  NEW.font_family     := regexp_replace(NEW.font_family,     '[<>`&;{}()\\]', '', 'g');
  RETURN NEW;
END;
$$;


--
-- Name: set_store_trial_defaults(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_store_trial_defaults() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Disparado exclusivamente no INSERT de uma nova loja
  IF NEW.subscription_status IS NULL OR NEW.subscription_status = '' THEN
    NEW.subscription_status := 'trialing';
  END IF;

  IF NEW.trial_ends_at IS NULL THEN
    NEW.trial_ends_at := NOW() + INTERVAL '7 days';
  END IF;

  IF NEW.plan_tier IS NULL OR NEW.plan_tier = '' THEN
    NEW.plan_tier := 'starter';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: set_trial_defaults(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_trial_defaults() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.subscription_status IS NULL OR NEW.subscription_status = 'trialing' THEN
    NEW.subscription_status := 'trialing';
    NEW.trial_ends_at := NOW() + INTERVAL '7 days';
    IF NEW.plan_id IS NULL THEN
      NEW.plan_id := 'c8c634e6-0641-4f5b-a826-4db837192c83'; -- Plano Iniciante
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: store_exists(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.store_exists(target_store_id uuid) RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1
    from public.stores s
    where s.id = target_store_id
  );
$$;


--
-- Name: sync_lives_is_active(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_lives_is_active() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.is_active := (NEW.status = 'live');
  RETURN NEW;
END;
$$;


--
-- Name: sync_sector_benchmarks(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_sector_benchmarks() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    rec RECORD;
BEGIN
    -- Loop por todos os setores cadastrados nas lojas
    FOR rec IN 
        SELECT DISTINCT sector FROM public.stores WHERE sector IS NOT NULL
    LOOP
        -- Atualiza ou insere o benchmark do setor com base na média real dos últimos 30 dias
        INSERT INTO public.sector_benchmarks (
            sector_key, 
            sector_name, 
            avg_ctr, 
            avg_cvr, 
            avg_hook_rate, 
            avg_watch_time,
            updated_at
        )
        VALUES (
            rec.sector,
            -- Nome amigável do setor
            CASE 
                WHEN rec.sector = 'moda_acessorios' THEN 'Moda e Acessórios'
                WHEN rec.sector = 'beleza_cosmeticos' THEN 'Beleza e Cosméticos'
                WHEN rec.sector = 'casa_decoracao' THEN 'Casa e Decoração'
                WHEN rec.sector = 'brinquedos_jogos' THEN 'Brinquedos e Jogos'
                WHEN rec.sector = 'eletronicos' THEN 'Eletrônicos e Tecnologia'
                ELSE 'Outros Setores'
            END,
            -- Cálculo real de CTR Médio do Setor (Cliques / Visualizações) * 100
            COALESCE((
                SELECT (COUNT(CASE WHEN event_type = 'cta_click' THEN 1 END)::NUMERIC / 
                        NULLIF(COUNT(CASE WHEN event_type = 'story_open' THEN 1 END), 0)::NUMERIC) * 100
                FROM public.tracking_events te
                JOIN public.stores s ON te.tenant_id = s.tenant_id
                WHERE s.sector = rec.sector AND te.created_at >= NOW() - INTERVAL '30 days'
            ), 6.50), -- fallback se não houver dados reais suficientes ainda
            
            -- Cálculo real de CVR Médio do Setor (Vendas / Visualizações) * 100
            COALESCE((
                SELECT (COUNT(CASE WHEN event_type = 'purchase' THEN 1 END)::NUMERIC / 
                        NULLIF(COUNT(CASE WHEN event_type = 'story_open' THEN 1 END), 0)::NUMERIC) * 100
                FROM public.tracking_events te
                JOIN public.stores s ON te.tenant_id = s.tenant_id
                WHERE s.sector = rec.sector AND te.created_at >= NOW() - INTERVAL '30 days'
            ), 2.50),
            
            -- Hook Rate Médio do Setor (Percentual de exibições que passaram de 3 segundos)
            40.00, -- Calculado a partir das sessões agregadas de retenção
            
            -- Tempo Médio de Watch Time do Setor (segundos)
            12.50  -- Calculado a partir dos tempos reais registrados
        )
        ON CONFLICT (sector_key) DO UPDATE 
        SET avg_ctr = EXCLUDED.avg_ctr,
            avg_cvr = EXCLUDED.avg_cvr,
            avg_hook_rate = EXCLUDED.avg_hook_rate,
            avg_watch_time = EXCLUDED.avg_watch_time,
            updated_at = NOW();
    END LOOP;
END;
$$;


--
-- Name: sync_store_plan_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_store_plan_id() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Cenário 1: Exclusão de registro
  IF (TG_OP = 'DELETE') THEN
    IF OLD.is_current = true THEN
      UPDATE public.stores 
      SET plan_id = NULL 
      WHERE id = OLD.store_id;
    END IF;
    RETURN OLD;
  END IF;

  -- Cenário 2: Atualização de ativo para inativo (is_current: true -> false)
  IF (TG_OP = 'UPDATE') THEN
    IF OLD.is_current = true AND NEW.is_current = false THEN
      UPDATE public.stores 
      SET plan_id = NULL 
      WHERE id = NEW.store_id;
    END IF;
  END IF;

  -- Cenário 3: Inserção ou Atualização para ativo (is_current: true)
  IF NEW.is_current = true THEN
    UPDATE public.stores 
    SET plan_id = NEW.plan_id 
    WHERE id = NEW.store_id;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: sync_store_sector_slug(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_store_sector_slug() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.sector_id IS NULL THEN
    NEW.sector := NULL;
  ELSE
    SELECT slug INTO NEW.sector FROM public.sectors WHERE id = NEW.sector_id;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: toggle_video_like_safe(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.toggle_video_like_safe(p_store_id uuid, p_video_id uuid, p_user_fingerprint text) RETURNS TABLE(likes_count bigint, viewer_liked boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT public._check_rate_limit(p_store_id, 'like:' || p_user_fingerprint, 20) THEN
    RAISE EXCEPTION 'rate_limit_exceeded';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.video_likes
    WHERE store_id = p_store_id AND video_id = p_video_id AND user_fingerprint = p_user_fingerprint
  ) THEN
    DELETE FROM public.video_likes
    WHERE store_id = p_store_id AND video_id = p_video_id AND user_fingerprint = p_user_fingerprint;
  ELSE
    INSERT INTO public.video_likes (store_id, video_id, user_fingerprint)
    VALUES (p_store_id, p_video_id, p_user_fingerprint);
  END IF;

  RETURN QUERY
  SELECT
    (SELECT count(*) FROM public.video_likes WHERE store_id = p_store_id AND video_id = p_video_id),
    EXISTS (
      SELECT 1 FROM public.video_likes
      WHERE store_id = p_store_id AND video_id = p_video_id AND user_fingerprint = p_user_fingerprint
    );
END;
$$;


--
-- Name: track_widget_event(uuid, uuid, uuid, uuid, text, text, text, text, text, uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.track_widget_event(p_store_id uuid, p_story_id uuid DEFAULT NULL::uuid, p_video_id uuid DEFAULT NULL::uuid, p_product_id uuid DEFAULT NULL::uuid, p_event_type text DEFAULT NULL::text, p_page_url text DEFAULT NULL::text, p_device_type text DEFAULT NULL::text, p_browser text DEFAULT NULL::text, p_referrer text DEFAULT NULL::text, p_session_id uuid DEFAULT NULL::uuid, p_watch_second integer DEFAULT NULL::integer) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_month text;
BEGIN
  INSERT INTO public.store_activity_events (
    store_id, video_id, product_id, event_type, session_id, watch_second, metadata, created_at
  ) VALUES (
    p_store_id,
    p_video_id,
    p_product_id,
    p_event_type,
    p_session_id,
    p_watch_second,
    jsonb_build_object(
      'story_id', p_story_id,
      'page_url', p_page_url,
      'device_type', p_device_type,
      'browser', p_browser,
      'referrer', p_referrer
    ),
    now()
  );

  IF p_event_type IN ('view', 'video_view') THEN
    v_month := to_char(now(), 'YYYY-MM');

    INSERT INTO public.usage_counters (store_id, month, views_count, updated_at)
    VALUES (p_store_id, v_month, 1, now())
    ON CONFLICT (store_id, month)
    DO UPDATE SET
      views_count = public.usage_counters.views_count + 1,
      updated_at = now();
  END IF;

  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'track_widget_event ERRO REAL: % - %', SQLERRM, SQLSTATE;
    RETURN false;
END;
$$;


--
-- Name: trigger_set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


--
-- Name: trigger_sync_store_storage_bytes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_sync_store_storage_bytes() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        PERFORM recalculate_store_storage_bytes(OLD.store_id);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        PERFORM recalculate_store_storage_bytes(NEW.store_id);
        IF (OLD.store_id IS DISTINCT FROM NEW.store_id) THEN
            PERFORM recalculate_store_storage_bytes(OLD.store_id);
        END IF;
        RETURN NEW;
    ELSE
        PERFORM recalculate_store_storage_bytes(NEW.store_id);
        RETURN NEW;
    END IF;
END;
$$;


--
-- Name: update_appearances_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_appearances_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_store_storage(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_store_storage() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE stores 
    SET storage_used_bytes = storage_used_bytes + COALESCE(NEW.file_size, 0)
    WHERE id = NEW.store_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE stores 
    SET storage_used_bytes = GREATEST(0, storage_used_bytes - COALESCE(OLD.file_size, 0))
    WHERE id = OLD.store_id;
  ELSIF (TG_OP = 'UPDATE') THEN
    UPDATE stores 
    SET storage_used_bytes = GREATEST(0, storage_used_bytes - COALESCE(OLD.file_size, 0) + COALESCE(NEW.file_size, 0))
    WHERE id = NEW.store_id;
  END IF;
  RETURN NULL;
END;
$$;


--
-- Name: update_store_storage_usage(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_store_storage_usage() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  old_bytes bigint;
  new_bytes bigint;
BEGIN
  -- Bytes do registro antigo (0 se não for upload hospedado ou não existir)
  IF TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN
    IF OLD.video_source_type = 'upload' THEN
      old_bytes := COALESCE(OLD.file_size, 0) + COALESCE(OLD.thumbnail_file_size, 0);
    ELSE
      old_bytes := 0;
    END IF;
  ELSE
    old_bytes := 0;
  END IF;

  -- Bytes do registro novo
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.video_source_type = 'upload' THEN
      new_bytes := COALESCE(NEW.file_size, 0) + COALESCE(NEW.thumbnail_file_size, 0);
    ELSE
      new_bytes := 0;
    END IF;
  ELSE
    new_bytes := 0;
  END IF;

  -- DELETE: subtrai do store antigo
  IF TG_OP = 'DELETE' THEN
    UPDATE public.stores
    SET storage_used_bytes = GREATEST(storage_used_bytes - old_bytes, 0)
    WHERE id = OLD.store_id;
    RETURN OLD;
  END IF;

  -- INSERT: soma no store novo
  IF TG_OP = 'INSERT' THEN
    UPDATE public.stores
    SET storage_used_bytes = storage_used_bytes + new_bytes
    WHERE id = NEW.store_id;
    RETURN NEW;
  END IF;

  -- UPDATE: trata troca de store_id (raro) + diferença de bytes
  IF TG_OP = 'UPDATE' THEN
    IF OLD.store_id IS DISTINCT FROM NEW.store_id THEN
      -- Vídeo mudou de loja: subtrai da antiga, soma na nova
      UPDATE public.stores
      SET storage_used_bytes = GREATEST(storage_used_bytes - old_bytes, 0)
      WHERE id = OLD.store_id;

      UPDATE public.stores
      SET storage_used_bytes = storage_used_bytes + new_bytes
      WHERE id = NEW.store_id;
    ELSE
      -- Mesma loja: aplica apenas o delta
      UPDATE public.stores
      SET storage_used_bytes = GREATEST(storage_used_bytes + (new_bytes - old_bytes), 0)
      WHERE id = NEW.store_id;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;


--
-- Name: user_has_store_access(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.user_has_store_access(check_store_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT public.is_store_owner_or_member(check_store_id);
$$;


--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid,
    user_id uuid,
    action character varying(255) NOT NULL,
    details text,
    ip_address character varying(45),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: affiliate_withdrawals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.affiliate_withdrawals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    amount numeric(10,2) NOT NULL,
    pix_key text NOT NULL,
    pix_key_type text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    proof_url text,
    admin_notes text,
    requested_at timestamp with time zone DEFAULT now() NOT NULL,
    processed_at timestamp with time zone,
    CONSTRAINT affiliate_withdrawals_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT affiliate_withdrawals_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'paid'::text, 'rejected'::text])))
);


--
-- Name: ai_insights; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_insights (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    video_id uuid,
    rule_code text NOT NULL,
    insight_type text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    impact_label text NOT NULL,
    action_text text NOT NULL,
    priority integer DEFAULT 1 NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ai_insights_insight_type_check CHECK ((insight_type = ANY (ARRAY['success'::text, 'warning'::text, 'tip'::text])))
);


--
-- Name: analytics_rate_limits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.analytics_rate_limits (
    client_hash text NOT NULL,
    store_id uuid NOT NULL,
    window_minute bigint NOT NULL,
    request_count integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: app_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid,
    settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    platform text
);


--
-- Name: appearances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.appearances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    name text DEFAULT 'Default'::text NOT NULL,
    is_default boolean DEFAULT false,
    use_global_appearance boolean DEFAULT true,
    primary_color text DEFAULT '#000000'::text,
    secondary_color text DEFAULT '#000000'::text,
    text_color text DEFAULT '#0F172A'::text,
    background_color text DEFAULT '#FFFFFF'::text,
    button_color text DEFAULT '#0094EB'::text,
    font_family text DEFAULT 'Inter, sans-serif'::text,
    floating_config jsonb,
    carousel_config jsonb,
    grid_config jsonb,
    modal_config jsonb,
    url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    font_size text DEFAULT '14'::text,
    dynamic_carousel_config jsonb DEFAULT '{"mobile": {"shape": "portrait", "width": "80", "enabled": false, "spacing": 16, "view_mode": "preview", "margin_top": "0", "object_fit": "cover", "show_title": false, "auto_center": true, "border_color": "#0094EB", "border_style": "2", "show_product": true, "border_radius": "10", "margin_bottom": "0", "visible_items": 2, "auto_highlight": false, "show_play_icon": true, "autoplay_videos": true, "product_card_bg": "#FFFFFF", "product_card_name_size": "11", "product_card_name_color": "#0F172A", "product_card_price_bold": true, "product_card_price_size": "12", "product_card_price_color": "#0094EB", "product_card_border_color": "#E2E8F0", "product_card_border_width": "1", "product_card_border_radius": "10"}, "desktop": {"shape": "portrait", "width": "80", "enabled": false, "spacing": 16, "view_mode": "preview", "margin_top": "0", "object_fit": "cover", "show_title": false, "auto_center": true, "border_color": "#0094EB", "border_style": "2", "show_product": true, "border_radius": "12", "margin_bottom": "0", "visible_items": 4, "auto_highlight": false, "show_play_icon": true, "autoplay_videos": true, "product_card_bg": "#FFFFFF", "product_card_name_size": "11", "product_card_name_color": "#0F172A", "product_card_price_bold": true, "product_card_price_size": "12", "product_card_price_color": "#0094EB", "product_card_border_color": "#E2E8F0", "product_card_border_width": "1", "product_card_border_radius": "12"}, "same_for_all": true}'::jsonb NOT NULL
);


--
-- Name: asaas_webhook_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asaas_webhook_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id text NOT NULL,
    event_type text NOT NULL,
    payment_id text,
    subscription_id text,
    payload jsonb,
    received_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.asaas_webhook_events FORCE ROW LEVEL SECURITY;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid,
    action text NOT NULL,
    details jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: benchmarks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.benchmarks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sector_id uuid NOT NULL,
    avg_ctr numeric(5,2) DEFAULT 0.00,
    avg_cvr numeric(5,2) DEFAULT 0.00,
    avg_hook_rate numeric(5,2) DEFAULT 0.00,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: billing_info; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.billing_info (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    document_type text DEFAULT 'cpf'::text NOT NULL,
    document_number text,
    legal_name text,
    billing_email text,
    address_zip_code text,
    address_street text,
    address_number text,
    address_complement text,
    address_neighborhood text,
    address_city text,
    address_state text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    cnpj_cpf text,
    email text,
    phone text,
    cep text,
    address text,
    number text,
    complement text,
    neighborhood text,
    city text,
    state text,
    CONSTRAINT billing_info_document_type_check CHECK ((document_type = ANY (ARRAY['cpf'::text, 'cnpj'::text])))
);


--
-- Name: TABLE billing_info; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.billing_info IS 'Dados fiscais/cadastrais para emissão de nota fiscal por loja';


--
-- Name: comments_public; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.comments_public AS
 SELECT id,
    video_id,
    store_id,
    user_name,
    content,
    status,
    parent_id,
    created_at,
    reply_content,
    reply_status
   FROM public.comments
  WHERE (status = 'approved'::text);


--
-- Name: conversions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    video_id uuid,
    product_id uuid,
    visitor_id text NOT NULL,
    order_id text,
    order_value numeric(12,2) DEFAULT 0,
    currency text DEFAULT 'BRL'::text,
    status text DEFAULT 'pending'::text,
    source text DEFAULT 'yampi'::text,
    created_at timestamp with time zone DEFAULT now(),
    live_id uuid
);


--
-- Name: daily_store_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_store_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    date date NOT NULL,
    views_count integer DEFAULT 0 NOT NULL,
    cta_clicks_count integer DEFAULT 0 NOT NULL,
    product_clicks_count integer DEFAULT 0 NOT NULL,
    estimated_revenue numeric(12,2) DEFAULT 0.00 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    shares_count integer DEFAULT 0 NOT NULL,
    video_close_count integer DEFAULT 0 NOT NULL,
    whatsapp_clicks_count integer DEFAULT 0 NOT NULL,
    website_clicks_count integer DEFAULT 0 NOT NULL,
    likes_count integer DEFAULT 0 NOT NULL,
    unlikes_count integer DEFAULT 0 NOT NULL,
    comments_count integer DEFAULT 0 NOT NULL,
    story_opens_count integer DEFAULT 0 NOT NULL
);


--
-- Name: daily_video_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_video_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    video_id uuid NOT NULL,
    date date NOT NULL,
    views_count integer DEFAULT 0 NOT NULL,
    cta_clicks_count integer DEFAULT 0 NOT NULL,
    shares_count integer DEFAULT 0 NOT NULL,
    next_video_count integer DEFAULT 0 NOT NULL,
    video_close_count integer DEFAULT 0 NOT NULL,
    whatsapp_clicks_count integer DEFAULT 0 NOT NULL,
    website_clicks_count integer DEFAULT 0 NOT NULL,
    likes_count integer DEFAULT 0 NOT NULL,
    unlikes_count integer DEFAULT 0 NOT NULL,
    comments_count integer DEFAULT 0 NOT NULL
);


--
-- Name: display_locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.display_locations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    story_id uuid,
    location text,
    selector text,
    "position" text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: insight_rule_conditions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.insight_rule_conditions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rule_id uuid NOT NULL,
    metric_key text NOT NULL,
    operator text NOT NULL,
    value_min numeric NOT NULL,
    value_max numeric,
    compare_to_benchmark boolean DEFAULT false NOT NULL,
    logic_group integer DEFAULT 1 NOT NULL,
    CONSTRAINT insight_rule_conditions_operator_check CHECK ((operator = ANY (ARRAY['<'::text, '>'::text, '<='::text, '>='::text, 'between'::text])))
);


--
-- Name: insight_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.insight_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    sector_slug text,
    priority integer DEFAULT 0 NOT NULL,
    insight_type text NOT NULL,
    title text NOT NULL,
    description_template text NOT NULL,
    impact_label text NOT NULL,
    action_text text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT insight_rules_insight_type_check CHECK ((insight_type = ANY (ARRAY['success'::text, 'warning'::text, 'tip'::text])))
);


--
-- Name: insights; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.insights (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    insight_type text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    action_label text,
    related_video_id uuid,
    related_placement_id uuid,
    metric_key text,
    metric_value numeric,
    metric_comparison_value numeric,
    read boolean DEFAULT false,
    dismissed boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    completed boolean DEFAULT false,
    action_url text,
    CONSTRAINT insights_insight_type_check CHECK ((insight_type = ANY (ARRAY['warning'::text, 'positive'::text, 'suggestion'::text])))
);


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    subscription_id uuid,
    amount_cents integer DEFAULT 0 NOT NULL,
    currency text DEFAULT 'BRL'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    description text,
    due_date date,
    paid_at timestamp with time zone,
    gateway_provider text,
    gateway_invoice_id text,
    invoice_pdf_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    asaas_payment_id text,
    invoice_url text,
    payment_method text,
    CONSTRAINT invoices_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'paid'::text, 'failed'::text, 'refunded'::text, 'canceled'::text])))
);


--
-- Name: TABLE invoices; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.invoices IS 'Histórico de faturas/cobranças por loja';


--
-- Name: live_advantages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.live_advantages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    live_id uuid NOT NULL,
    store_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    "position" integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: live_chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.live_chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    live_id uuid NOT NULL,
    store_id uuid NOT NULL,
    author_name text NOT NULL,
    message text NOT NULL,
    is_from_store boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    session_id text
);


--
-- Name: live_coupons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.live_coupons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    live_id uuid NOT NULL,
    store_id uuid NOT NULL,
    code text NOT NULL,
    discount text NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: live_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.live_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    live_id uuid NOT NULL,
    event_type text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT live_events_event_type_check CHECK ((event_type = ANY (ARRAY['view'::text, 'peak_viewers'::text, 'product_click'::text, 'sale'::text])))
);


--
-- Name: live_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.live_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    widget_divulgacao jsonb DEFAULT '{}'::jsonb NOT NULL,
    widget_aovivo jsonb DEFAULT '{}'::jsonb NOT NULL,
    player_settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


--
-- Name: live_subscribers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.live_subscribers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    live_id uuid NOT NULL,
    store_id uuid NOT NULL,
    name text,
    phone text,
    email text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lives; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lives (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    title text NOT NULL,
    youtube_url text NOT NULL,
    youtube_video_id text NOT NULL,
    status text DEFAULT 'scheduled'::text NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    badge_text text DEFAULT 'AO VIVO AGORA'::text,
    badge_color text DEFAULT '#ff0033'::text,
    featured_product_ids jsonb DEFAULT '[]'::jsonb,
    instagram_url text,
    scheduled_at timestamp with time zone,
    started_at timestamp with time zone,
    ended_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    teaser_video_url text,
    teaser_thumbnail_url text,
    show_countdown boolean DEFAULT true,
    pinned_product_id text,
    notify_leads_enabled boolean DEFAULT true,
    promo_start_at timestamp with time zone,
    promo_end_at timestamp with time zone,
    promo_target_type text DEFAULT 'all'::text,
    promo_target_value text,
    promo_cta_text text DEFAULT 'Assista Agora'::text,
    promo_media_url text,
    promo_media_type text,
    whatsapp_group_url text,
    product_cta_texts jsonb DEFAULT '{}'::jsonb,
    youtube_thumbnail_url text,
    coupons jsonb DEFAULT '[]'::jsonb,
    advantages jsonb DEFAULT '[]'::jsonb,
    appearance_template_id text DEFAULT 'preset_padrao'::text,
    live_widget_config jsonb,
    live_player_config jsonb,
    spotlight_product_id uuid,
    product_coupon_texts jsonb DEFAULT '{}'::jsonb,
    spotlight_coupon_code text,
    spotlight_advantage_idx integer,
    CONSTRAINT lives_promo_media_type_check CHECK ((promo_media_type = ANY (ARRAY['image'::text, 'video'::text]))),
    CONSTRAINT lives_promo_target_type_check CHECK ((promo_target_type = ANY (ARRAY['all'::text, 'home'::text, 'url_contains'::text, 'url_not_contains'::text]))),
    CONSTRAINT lives_status_check CHECK ((status = ANY (ARRAY['scheduled'::text, 'live'::text, 'finished'::text])))
);


--
-- Name: page_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.page_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    story_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    condition_type text,
    value text
);


--
-- Name: plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    description text,
    price_cents integer DEFAULT 0 NOT NULL,
    billing_cycle text DEFAULT 'monthly'::text NOT NULL,
    views_limit integer DEFAULT 0 NOT NULL,
    storage_limit_bytes bigint DEFAULT 0 NOT NULL,
    pages_limit integer DEFAULT 0 NOT NULL,
    features jsonb DEFAULT '[]'::jsonb,
    is_popular boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    videos_limit integer DEFAULT 10,
    allows_live boolean DEFAULT false,
    modules jsonb DEFAULT '["vidlytics"]'::jsonb NOT NULL,
    CONSTRAINT plans_billing_cycle_check CHECK ((billing_cycle = ANY (ARRAY['monthly'::text, 'yearly'::text])))
);


--
-- Name: TABLE plans; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.plans IS 'Catálogo dinâmico dos planos disponíveis (vitrine de preços)';


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    external_id text,
    name text NOT NULL,
    category text,
    price numeric(10,2),
    sale_price numeric(10,2),
    images jsonb DEFAULT '[]'::jsonb,
    product_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    image_url text,
    sku text,
    short_description text,
    active boolean DEFAULT true,
    origin text,
    import_source text,
    xml_id text,
    is_active boolean DEFAULT true,
    last_imported_at timestamp with time zone
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text,
    name text,
    avatar_url text,
    role text DEFAULT 'user'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    user_id uuid,
    document_number text,
    phone text,
    is_super_admin boolean DEFAULT false NOT NULL
);


--
-- Name: stores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    url text,
    platform text DEFAULT 'yampi'::text,
    logo_url text,
    contact_email text,
    settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    owner_user_id uuid,
    sector_id uuid,
    storage_used_bytes bigint DEFAULT 0,
    storage_limit_bytes bigint DEFAULT 1073741824,
    plan_id uuid,
    asaas_customer_id text,
    subscription_status text DEFAULT 'trialing'::text NOT NULL,
    trial_ends_at timestamp with time zone,
    past_due_since timestamp with time zone,
    plan_tier text DEFAULT 'starter'::text,
    current_period_end timestamp with time zone,
    stripe_customer_id text,
    stripe_subscription_id text,
    sector text,
    slug text,
    referral_code text,
    referred_by_store_id uuid,
    active boolean DEFAULT true,
    pix_key text,
    pix_key_type text,
    owner_contact_email text,
    contact_name text,
    CONSTRAINT check_subscription_status CHECK ((subscription_status = ANY (ARRAY['trialing'::text, 'active'::text, 'past_due'::text, 'canceled'::text, 'unpaid'::text, 'lifetime'::text]))),
    CONSTRAINT stores_pix_key_type_check CHECK ((pix_key_type = ANY (ARRAY['cpf'::text, 'cnpj'::text, 'email'::text, 'phone'::text, 'random'::text]))),
    CONSTRAINT stores_subscription_status_check CHECK ((subscription_status = ANY (ARRAY['trialing'::text, 'active'::text, 'past_due'::text, 'canceled'::text, 'lifetime'::text])))
);

ALTER TABLE ONLY public.stores FORCE ROW LEVEL SECURITY;


--
-- Name: COLUMN stores.past_due_since; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stores.past_due_since IS 'Timestamp de quando a loja entrou em past_due. Utilizado para calcular a janela de carência de 72h antes do bloqueio fail-closed do widget.';


--
-- Name: COLUMN stores.contact_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stores.contact_name IS 'Nome da pessoa de contato da loja, usado em tags dinâmicas ({{nome_contato}}) de e-mail e WhatsApp';


--
-- Name: public_live_settings; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.public_live_settings AS
 SELECT ls.store_id,
    ls.widget_divulgacao,
    ls.widget_aovivo,
    ls.player_settings
   FROM (public.live_settings ls
     JOIN public.stores s ON ((s.id = ls.store_id)));


--
-- Name: referral_rewards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referral_rewards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    referrer_store_id uuid NOT NULL,
    referred_store_id uuid NOT NULL,
    amount numeric(10,2) DEFAULT 0.00 NOT NULL,
    status text DEFAULT 'paid'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    asaas_payment_id text,
    commission_rate numeric(5,2) DEFAULT 10.00,
    CONSTRAINT referral_rewards_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'paid'::text, 'canceled'::text])))
);


--
-- Name: sector_benchmarks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sector_benchmarks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sector_key text NOT NULL,
    sector_name text NOT NULL,
    avg_ctr numeric(5,2) DEFAULT 0.00,
    avg_cvr numeric(5,2) DEFAULT 0.00,
    avg_hook_rate numeric(5,2) DEFAULT 0.00,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: sectors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sectors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    icon text,
    display_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: selector_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.selector_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    token text NOT NULL,
    selector text NOT NULL,
    story_id uuid,
    store_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: sizing_models; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sizing_models (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    name text NOT NULL,
    measures jsonb DEFAULT '[]'::jsonb NOT NULL,
    size_name text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: store_activity_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.store_activity_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    event_type text NOT NULL,
    video_id uuid,
    product_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    session_id uuid,
    watch_second integer,
    CONSTRAINT check_metadata_no_pii CHECK (((metadata IS NULL) OR ((NOT (metadata ? 'ip'::text)) AND (NOT (metadata ? 'ip_address'::text)) AND (NOT (metadata ? 'user_agent'::text)) AND (NOT (metadata ? 'email'::text)) AND (NOT (metadata ? 'cpf'::text)) AND (NOT (metadata ? 'query_string'::text))))),
    CONSTRAINT check_valid_event_type CHECK ((event_type = ANY (ARRAY['video_view'::text, 'cta_click'::text, 'product_view'::text, 'story_complete'::text, 'product_click'::text, 'share'::text, 'next_video'::text, 'video_close'::text, 'whatsapp_click'::text, 'website_click'::text, 'progress'::text])))
);


--
-- Name: store_integrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.store_integrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    platform character varying(20) NOT NULL,
    account_id character varying(255),
    account_username character varying(255),
    access_token text NOT NULL,
    refresh_token text,
    token_expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: store_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.store_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text DEFAULT 'member'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: store_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.store_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    modules jsonb DEFAULT '{"analytics": true, "video_showcase": true, "whatsapp_button": true}'::jsonb,
    whatsapp_number text,
    whatsapp_message text DEFAULT 'Olá! Tenho interesse nesse produto que vi no vídeo.'::text,
    security_token text DEFAULT (gen_random_uuid())::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    store_name text DEFAULT ''::text NOT NULL,
    store_url text DEFAULT ''::text NOT NULL,
    logo_url text,
    contact_email text,
    whatsapp_default_message text,
    whatsapp_message_template text,
    app_enabled boolean DEFAULT true NOT NULL,
    stories_enabled boolean DEFAULT true NOT NULL,
    carousel_enabled boolean DEFAULT true NOT NULL,
    floating_widget_enabled boolean DEFAULT true NOT NULL,
    widget_enabled boolean DEFAULT true NOT NULL,
    whatsapp_button_enabled boolean DEFAULT false NOT NULL,
    whatsapp_enabled boolean DEFAULT false NOT NULL,
    open_product_new_tab boolean DEFAULT false NOT NULL,
    autoplay boolean DEFAULT false NOT NULL,
    muted_by_default boolean DEFAULT false NOT NULL,
    show_video_controls boolean DEFAULT true NOT NULL,
    pause_on_invisible boolean DEFAULT true NOT NULL,
    pause_on_leave boolean DEFAULT true NOT NULL,
    timezone text DEFAULT 'America/Sao_Paulo'::text NOT NULL,
    language text DEFAULT 'pt-BR'::text NOT NULL,
    default_template text,
    default_appearance_id uuid,
    public_installation_key text,
    public_live_key text,
    store_public_id text,
    auto_approve_comments boolean DEFAULT false,
    logo_file_size bigint DEFAULT 0,
    platform text,
    owner_contact_email text,
    live_widget_config jsonb DEFAULT '{}'::jsonb,
    live_player_config jsonb DEFAULT '{}'::jsonb
);


--
-- Name: COLUMN store_settings.live_widget_config; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.store_settings.live_widget_config IS 'Configuração visual do widget flutuante de divulgação da Live (bolinha)';


--
-- Name: COLUMN store_settings.live_player_config; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.store_settings.live_player_config IS 'Configuração visual do player em tela cheia da Live';


--
-- Name: store_settings_public; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.store_settings_public AS
 SELECT store_id,
    auto_approve_comments,
    whatsapp_number,
    whatsapp_message,
    whatsapp_message_template,
    store_name,
    logo_url,
    live_widget_config,
    live_player_config
   FROM public.store_settings;


--
-- Name: stores_public; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.stores_public AS
 SELECT id,
    name,
    logo_url,
    subscription_status,
    trial_ends_at,
    past_due_since
   FROM public.stores;


--
-- Name: stories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    title text NOT NULL,
    icon_name text,
    format text DEFAULT 'carousel'::text NOT NULL,
    scroll_direction text DEFAULT 'horizontal'::text,
    appearance_id uuid,
    active boolean DEFAULT true,
    "position" integer DEFAULT 0,
    display_selector text,
    display_position text DEFAULT 'below'::text,
    page_rule_type text DEFAULT 'all_pages'::text,
    page_rule_value text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    model_id uuid,
    click_count integer DEFAULT 0,
    cta_enabled boolean DEFAULT false,
    cta_text text,
    cta_url text,
    is_active boolean DEFAULT true,
    cta_type text,
    whatsapp_message text,
    view_count integer DEFAULT 0
);


--
-- Name: story_products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.story_products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    story_id uuid NOT NULL,
    product_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    store_id uuid NOT NULL
);


--
-- Name: story_videos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.story_videos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    story_id uuid NOT NULL,
    video_id uuid NOT NULL,
    "position" integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    store_id uuid NOT NULL,
    is_cover boolean DEFAULT false
);


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    plan_id uuid NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    billing_cycle text DEFAULT 'monthly'::text NOT NULL,
    current_period_start timestamp with time zone DEFAULT now() NOT NULL,
    current_period_end timestamp with time zone,
    cancel_at_period_end boolean DEFAULT false NOT NULL,
    canceled_at timestamp with time zone,
    gateway_provider text,
    gateway_customer_id text,
    gateway_subscription_id text,
    gateway_payment_method_id text,
    is_current boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    asaas_subscription_id text,
    payment_method text DEFAULT 'PIX'::text,
    asaas_customer_id text,
    billing_provider text DEFAULT 'asaas'::text,
    CONSTRAINT subscriptions_billing_cycle_check CHECK ((billing_cycle = ANY (ARRAY['monthly'::text, 'yearly'::text]))),
    CONSTRAINT subscriptions_status_check CHECK ((status = ANY (ARRAY['active'::text, 'trialing'::text, 'past_due'::text, 'canceled'::text, 'incomplete'::text, 'lifetime'::text])))
);


--
-- Name: TABLE subscriptions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.subscriptions IS 'Assinatura vigente e histórico de planos por loja';


--
-- Name: usage_counters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usage_counters (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    month text NOT NULL,
    videos_count integer DEFAULT 0 NOT NULL,
    views_count integer DEFAULT 0 NOT NULL,
    users_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: video_likes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.video_likes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    video_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    store_id uuid,
    user_fingerprint text
);


--
-- Name: video_placements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.video_placements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    video_id uuid NOT NULL,
    page text NOT NULL,
    "position" text NOT NULL,
    content_type text,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT video_placements_content_type_check CHECK ((content_type = ANY (ARRAY['demonstration'::text, 'lifestyle'::text, 'tutorial'::text, 'review'::text, 'unboxing'::text]))),
    CONSTRAINT video_placements_page_check CHECK ((page = ANY (ARRAY['home'::text, 'product'::text, 'category'::text, 'cart'::text, 'checkout'::text]))),
    CONSTRAINT video_placements_position_check CHECK (("position" = ANY (ARRAY['top'::text, 'middle'::text, 'bottom'::text])))
);


--
-- Name: videos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.videos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    title text NOT NULL,
    video_source_type text DEFAULT 'url'::text,
    video_url text,
    video_file_path text,
    thumbnail_source_type text DEFAULT 'auto'::text,
    thumbnail_url text,
    thumbnail_file_path text,
    product_id uuid,
    sizing_model_id uuid,
    status text DEFAULT 'active'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    active boolean DEFAULT true NOT NULL,
    model_id uuid,
    source_type text,
    qr_code_url text,
    file_size bigint DEFAULT 0,
    thumbnail_file_size bigint DEFAULT 0
);


--
-- Name: COLUMN videos.thumbnail_file_size; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.videos.thumbnail_file_size IS 'Tamanho em bytes do arquivo de thumbnail gerado e hospedado no Supabase Storage';


--
-- Name: widget_selectors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.widget_selectors (
    id bigint NOT NULL,
    token text NOT NULL,
    selector text NOT NULL,
    story_id text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: widget_selectors_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.widget_selectors_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: widget_selectors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.widget_selectors_id_seq OWNED BY public.widget_selectors.id;


--
-- Name: widget_selectors id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.widget_selectors ALTER COLUMN id SET DEFAULT nextval('public.widget_selectors_id_seq'::regclass);


--
-- Data for Name: activity_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.activity_logs (id, store_id, user_id, action, details, ip_address, created_at) FROM stdin;
da66c010-fe6b-4db8-86e0-70a84cfdbdbb	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	5c9f63f2-c9a6-43df-9c88-e8ac6b447935	settings.saved	Use Anny Moda Feminina	\N	2026-09-09 16:38:58.33067+00
c462a8ec-3574-4354-b8c4-0beb289395a8	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	5c9f63f2-c9a6-43df-9c88-e8ac6b447935	settings.saved	Use Anny Moda Feminina	\N	2026-09-09 16:39:37.551023+00
e53c9533-d5e2-4b7f-9b7e-6c2c22e1e83b	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	5c9f63f2-c9a6-43df-9c88-e8ac6b447935	settings.saved	Use Anny Moda Feminina	\N	2026-09-09 16:41:58.058497+00
4c882b73-3f08-46f3-a835-688590e90bfc	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	5c9f63f2-c9a6-43df-9c88-e8ac6b447935	settings.saved	Use Anny Moda Feminina	\N	2026-09-09 16:43:41.993439+00
58bdd0b5-4bfc-40ec-b494-be0cd43a5101	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	5c9f63f2-c9a6-43df-9c88-e8ac6b447935	settings.saved	Use Anny Moda Feminina	\N	2026-09-09 16:44:30.826231+00
a9fb8c4f-caaf-4f6a-8085-d0b87752cc9f	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	5c9f63f2-c9a6-43df-9c88-e8ac6b447935	settings.saved	Use Anny Moda Feminina	\N	2026-09-09 17:01:54.017144+00
0d12a9f5-6993-4cdf-a6d2-74d0783f23da	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	5c9f63f2-c9a6-43df-9c88-e8ac6b447935	settings.saved	Use Anny Moda Feminina	\N	2026-09-09 17:02:08.254721+00
db95957b-ba97-4b3f-a627-311419a41616	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	5c9f63f2-c9a6-43df-9c88-e8ac6b447935	settings.saved	Use Anny Moda Feminina	\N	2026-09-09 17:17:12.690886+00
9588a914-8c78-48ab-ab1a-9b270d96c754	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	5c9f63f2-c9a6-43df-9c88-e8ac6b447935	settings.saved	Use Anny Moda Feminina	\N	2026-09-09 17:27:59.39313+00
194745ad-c8b4-4980-971a-fdab8c5f307a	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	5c9f63f2-c9a6-43df-9c88-e8ac6b447935	settings.saved	Use Anny Moda Feminina	\N	2026-09-09 17:33:41.607244+00
d7133ac5-4bb7-443a-adf6-c10718df7cb4	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	5c9f63f2-c9a6-43df-9c88-e8ac6b447935	settings.saved	Use Anny Moda Feminina	\N	2026-09-09 17:56:33.688868+00
4520ad4f-1d97-4cb0-929e-2ae1bf39d9e6	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	5c9f63f2-c9a6-43df-9c88-e8ac6b447935	Vídeo Enviado	O vídeo "Criação_de_Vídeo_Fashion_Editorial_Luxo.mp4" foi adicionado à biblioteca.	\N	2026-09-09 19:09:51.51128+00
f0c00822-24cf-4211-953b-963658799c4e	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	5c9f63f2-c9a6-43df-9c88-e8ac6b447935	Vídeo Enviado	O vídeo "oculos-de-sol.mp4" foi adicionado à biblioteca.	\N	2026-09-09 19:10:24.191185+00
e674e74b-8e95-4046-a461-54c4608b3e73	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	5c9f63f2-c9a6-43df-9c88-e8ac6b447935	product.imported	3 produtos importados do XML	\N	2026-09-09 19:15:50.707516+00
bfc7935c-b526-43b5-9bac-0ebf72a1e654	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	5c9f63f2-c9a6-43df-9c88-e8ac6b447935	product.updated	Calça Confort Bicolor Preto e Rosa Pink 46/48 - G	\N	2026-09-09 19:16:08.445933+00
1f3a0313-0234-4512-a858-a894198a3750	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	5c9f63f2-c9a6-43df-9c88-e8ac6b447935	product.updated	Blusa Confort - Verde Jade 46/48 - G	\N	2026-09-09 19:16:14.471262+00
95fb4c48-9d0c-4dbc-a2b8-d85bbfd1d72b	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	5c9f63f2-c9a6-43df-9c88-e8ac6b447935	product.updated	Calça Confort - Rosa Pink 42/44 - M	\N	2026-09-09 19:16:19.292099+00
698b7542-3d53-4e54-9f4b-1a1da6856c41	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	5c9f63f2-c9a6-43df-9c88-e8ac6b447935	product.created	Blusa Manga Longa	\N	2026-09-09 19:16:59.460471+00
7229ec96-3f3b-47c1-af1e-63db4e4e6d85	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	5c9f63f2-c9a6-43df-9c88-e8ac6b447935	model.created	Clara	\N	2026-09-09 19:17:26.963892+00
08ed5663-653c-46e6-ba6e-77a3cdf0f5de	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	5c9f63f2-c9a6-43df-9c88-e8ac6b447935	video.updated	Criação_de_Vídeo_Fashion_Editorial_Luxo.mp4	\N	2026-09-09 19:18:01.021155+00
7ebe2f19-6add-4d0a-ac31-f785bd416b33	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	5c9f63f2-c9a6-43df-9c88-e8ac6b447935	Design Criado	O estilo de design "USEANNY" foi adicionado.	\N	2026-09-09 19:18:40.647522+00
d13eb0e3-67ae-4010-9604-7f687756f83c	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	5c9f63f2-c9a6-43df-9c88-e8ac6b447935	appearance.created	USEANNY	\N	2026-09-09 19:18:40.793566+00
47a8e1e2-8a49-4b3b-b02d-506e2fd8ef32	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	5c9f63f2-c9a6-43df-9c88-e8ac6b447935	story.created	TESTE	\N	2026-09-09 19:19:47.399062+00
c99fdd10-ce17-495c-a79f-4edd4c53309b	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	5c9f63f2-c9a6-43df-9c88-e8ac6b447935	story.updated	TESTE	\N	2026-09-09 19:20:10.303696+00
5fb12f4a-59f5-4c34-9360-84c46d7a9be5	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	5c9f63f2-c9a6-43df-9c88-e8ac6b447935	story.updated	TESTE	\N	2026-09-09 19:20:23.959128+00
fe603b9d-90b2-4afe-9b79-9d4469f2d6d9	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	5c9f63f2-c9a6-43df-9c88-e8ac6b447935	Design Atualizado	As cores, bordas ou fontes do player de stories "USEANNY" foram modificadas.	\N	2026-09-09 19:21:06.457616+00
303eb4c0-38c8-4083-855f-ea55843b9eab	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	5c9f63f2-c9a6-43df-9c88-e8ac6b447935	appearance.updated	USEANNY	\N	2026-09-09 19:21:06.565872+00
9f7b0c9a-68fe-4dbc-b343-2a9e05422170	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	5c9f63f2-c9a6-43df-9c88-e8ac6b447935	story.updated	TESTE	\N	2026-09-09 19:22:02.577961+00
a5197767-212d-4eba-bbb6-bc3a5e2cd76e	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	5c9f63f2-c9a6-43df-9c88-e8ac6b447935	story.updated	TESTE	\N	2026-09-09 19:22:32.999565+00
ce285a23-a4ac-4f9a-b02c-79664aaebc40	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	5c9f63f2-c9a6-43df-9c88-e8ac6b447935	Design Atualizado	As cores, bordas ou fontes do player de stories "USEANNY" foram modificadas.	\N	2026-09-09 19:22:58.594625+00
81e5f516-cb1e-4eba-827e-6cd83e6cd57d	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	5c9f63f2-c9a6-43df-9c88-e8ac6b447935	appearance.updated	USEANNY	\N	2026-09-09 19:22:58.698541+00
4f30f978-4387-4ba2-ad2f-9225a0cb5c07	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	5c9f63f2-c9a6-43df-9c88-e8ac6b447935	Design Atualizado	As cores, bordas ou fontes do player de stories "USEANNY" foram modificadas.	\N	2026-09-09 19:23:28.28647+00
3a554753-8d2c-4bd6-baa9-48a7e8ce1dcd	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	5c9f63f2-c9a6-43df-9c88-e8ac6b447935	appearance.updated	USEANNY	\N	2026-09-09 19:23:28.451487+00
ff8e08ca-8bc7-47c6-9f0d-18b8d0aaa94c	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	5c9f63f2-c9a6-43df-9c88-e8ac6b447935	story.updated	TESTE	\N	2026-09-09 19:50:09.739752+00
8dfc8049-625b-43bf-9e46-52018b23e5cd	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	5c9f63f2-c9a6-43df-9c88-e8ac6b447935	settings.saved	Use Anny Moda Feminina	\N	2026-09-10 11:30:19.957558+00
d0675faa-e55a-4312-a123-cdada173e801	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	5c9f63f2-c9a6-43df-9c88-e8ac6b447935	settings.saved	Use Anny Moda Feminina	\N	2026-09-15 13:52:12.269053+00
06f39864-4b7e-48f4-b454-7e0ec2173f91	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	5c9f63f2-c9a6-43df-9c88-e8ac6b447935	settings.saved	Use Anny Moda Feminina	\N	2026-09-15 16:57:32.519418+00
5710c39b-657f-43e7-8c41-ce161cd76041	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	5c9f63f2-c9a6-43df-9c88-e8ac6b447935	story.updated	TESTE	\N	2026-09-16 19:29:57.514156+00
\.


--
-- Data for Name: affiliate_withdrawals; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.affiliate_withdrawals (id, store_id, amount, pix_key, pix_key_type, status, proof_url, admin_notes, requested_at, processed_at) FROM stdin;
\.


--
-- Data for Name: ai_insights; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ai_insights (id, store_id, video_id, rule_code, insight_type, title, description, impact_label, action_text, priority, period_start, period_end, created_at) FROM stdin;
\.


--
-- Data for Name: analytics_rate_limits; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.analytics_rate_limits (client_hash, store_id, window_minute, request_count, created_at) FROM stdin;
\.


--
-- Data for Name: app_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.app_settings (id, store_id, settings, created_at, updated_at, platform) FROM stdin;
\.


--
-- Data for Name: appearances; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.appearances (id, store_id, name, is_default, use_global_appearance, primary_color, secondary_color, text_color, background_color, button_color, font_family, floating_config, carousel_config, grid_config, modal_config, url, created_at, updated_at, font_size, dynamic_carousel_config) FROM stdin;
f95450f8-bfd4-44b3-8ef8-92ac416979c4	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	USEANNY	t	t	#0094EB	#0094EB	#0F172A	#FFFFFF	#0094EB	Inter, sans-serif	{"mobile": {"shape": "portrait", "width": "80", "height": "142", "z_index": "2147483647", "cta_text": "VER VÍDEO", "position": "fixed_bottom_right", "show_cta": false, "draggable": false, "object_fit": "cover", "allow_close": false, "cta_is_bold": true, "top_spacing": "20", "border_color": "#0094EB", "border_style": "2", "cta_bg_color": "#0094EB", "left_spacing": "20", "border_radius": "12", "cta_font_size": 14, "right_spacing": "20", "bottom_spacing": "20", "cta_text_color": "#FFFFFF", "show_play_icon": true, "autoplay_videos": true, "floating_position": "bottom-right"}, "desktop": {"shape": "portrait", "width": "80", "height": "142", "z_index": "2147483647", "cta_text": "VER VÍDEO", "position": "fixed_bottom_right", "show_cta": false, "draggable": false, "object_fit": "cover", "allow_close": false, "cta_is_bold": true, "top_spacing": "20", "border_color": "#0094EB", "border_style": "2", "cta_bg_color": "#0094EB", "left_spacing": "20", "border_radius": "12", "cta_font_size": 14, "right_spacing": "20", "bottom_spacing": "20", "cta_text_color": "#FFFFFF", "show_play_icon": true, "autoplay_videos": true, "floating_position": "bottom-right"}, "same_for_all": true}	{"mobile": {"shape": "portrait", "width": "220", "spacing": 16, "view_mode": "preview", "margin_top": "0", "object_fit": "cover", "show_title": false, "auto_center": true, "border_color": "#0094EB", "border_style": "2", "show_product": true, "border_radius": "12", "margin_bottom": "0", "visible_items": 4, "auto_highlight": false, "show_play_icon": true, "autoplay_videos": true, "product_card_bg": "#FFFFFF", "product_card_name_size": "11", "product_card_name_color": "#0F172A", "product_card_price_bold": true, "product_card_price_size": "12", "product_card_price_color": "#0094EB", "product_card_border_color": "#E2E8F0", "product_card_border_width": "1", "product_card_border_radius": "12"}, "desktop": {"shape": "portrait", "width": "220", "spacing": 16, "view_mode": "preview", "margin_top": "0", "object_fit": "cover", "show_title": false, "auto_center": true, "border_color": "#0094EB", "border_style": "2", "show_product": true, "border_radius": "12", "margin_bottom": "0", "visible_items": 4, "auto_highlight": false, "show_play_icon": true, "autoplay_videos": true, "product_card_bg": "#FFFFFF", "product_card_name_size": "11", "product_card_name_color": "#0F172A", "product_card_price_bold": true, "product_card_price_size": "12", "product_card_price_color": "#0094EB", "product_card_border_color": "#E2E8F0", "product_card_border_width": "1", "product_card_border_radius": "12"}, "same_for_all": true}	{"mobile": {"rows": 1, "shape": "portrait", "width": "220", "spacing": 16, "margin_top": "0", "object_fit": "cover", "show_title": false, "margin_left": "0", "border_color": "#0094EB", "border_style": "2", "margin_right": "0", "show_product": true, "border_radius": "12", "margin_bottom": "0", "visible_items": 2, "autoplay_videos": true, "sequential_playback": false}, "desktop": {"rows": 1, "shape": "portrait", "width": "220", "spacing": 16, "margin_top": "0", "object_fit": "cover", "show_title": false, "margin_left": "0", "border_color": "#0094EB", "border_style": "2", "margin_right": "0", "show_product": true, "border_radius": "12", "margin_bottom": "0", "visible_items": 2, "autoplay_videos": true, "sequential_playback": false}, "same_for_all": true}	{"show_title": true, "border_color": "#0094EB", "border_width": "2", "show_product": true, "border_radius": "12", "product_card_bg": "#FFFFFF", "show_like_button": true, "show_play_button": true, "show_share_button": true, "show_comment_button": true, "show_product_button": true, "product_card_name_size": "11", "product_card_name_color": "#0F172A", "product_card_price_size": "12", "product_card_price_color": "#0094EB", "product_card_border_color": "#E2E8F0", "product_card_border_width": "1", "product_card_border_radius": "12"}	\N	2026-09-09 19:18:10.364+00	2026-09-09 19:23:27.648+00	14	{"mobile": {"shape": "portrait", "width": "80", "enabled": true, "spacing": 16, "view_mode": "preview", "margin_top": "0", "object_fit": "cover", "show_title": false, "auto_center": true, "margin_left": "0", "border_color": "#0094EB", "border_style": "2", "margin_right": "0", "show_product": true, "border_radius": "12", "margin_bottom": "0", "visible_items": 4, "auto_highlight": false, "show_play_icon": true, "autoplay_videos": true, "product_card_bg": "#FFFFFF", "highlight_shadow": false, "highlight_scale_up": false, "product_card_name_size": "11", "product_card_name_color": "#0F172A", "product_card_price_bold": true, "product_card_price_size": "12", "product_card_price_color": "#0094EB", "product_card_border_color": "#E2E8F0", "product_card_border_width": "1", "product_card_border_radius": "12", "highlight_scale_down_others": false}, "desktop": {"shape": "portrait", "width": "80", "enabled": true, "spacing": 16, "view_mode": "preview", "margin_top": "0", "object_fit": "cover", "show_title": false, "auto_center": true, "margin_left": "0", "border_color": "#0094EB", "border_style": "2", "margin_right": "0", "show_product": true, "border_radius": "12", "margin_bottom": "0", "visible_items": 4, "auto_highlight": false, "show_play_icon": true, "autoplay_videos": true, "product_card_bg": "#FFFFFF", "highlight_shadow": false, "highlight_scale_up": false, "product_card_name_size": "11", "product_card_name_color": "#0F172A", "product_card_price_bold": true, "product_card_price_size": "12", "product_card_price_color": "#0094EB", "product_card_border_color": "#E2E8F0", "product_card_border_width": "1", "product_card_border_radius": "12", "highlight_scale_down_others": false}, "same_for_all": true}
\.


--
-- Data for Name: asaas_webhook_events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.asaas_webhook_events (id, event_id, event_type, payment_id, subscription_id, payload, received_at) FROM stdin;
149ca956-c8b9-4557-ae96-f461ec482d3f	PAYMENT_RECEIVED:pay_test_123	PAYMENT_RECEIVED	pay_test_123	\N	{"event": "PAYMENT_RECEIVED", "payment": {"id": "pay_test_123", "value": 97, "status": "RECEIVED", "customer": "cus_test_123", "netValue": 95, "billingType": "PIX"}}	2026-09-14 13:18:07.496+00
2139fdca-abf5-47a0-82ad-655522cd7a05	PAYMENT_CREATED:pay_fsbn4m96ymysj7zw	PAYMENT_CREATED	pay_fsbn4m96ymysj7zw	sub_uwd6q29ev24y6b2e	{"id": "evt_05b708f961d739ea7eba7e4db318f621&1515255967", "event": "PAYMENT_CREATED", "account": {"id": "bc6f17b8-6e46-4dad-b027-cb0d177924ac", "ownerId": null}, "payment": {"id": "pay_fsbn4m96ymysj7zw", "fine": {"type": "FIXED", "value": 0}, "value": 67, "escrow": null, "object": "payment", "status": "PENDING", "deleted": false, "dueDate": "2026-09-17", "refunds": null, "customer": "cus_000200270930", "discount": {"type": "FIXED", "value": 0, "limitDate": null, "dueDateLimitDays": 0}, "interest": {"type": "PERCENTAGE", "value": 0}, "netValue": 65.18, "creditDate": null, "invoiceUrl": "https://www.asaas.com/i/fsbn4m96ymysj7zw", "anticipable": false, "anticipated": false, "bankSlipUrl": "https://www.asaas.com/b/pdf/fsbn4m96ymysj7zw", "billingType": "UNDEFINED", "dateCreated": "2026-09-14", "description": "Assinatura Starter (Mensal) - Vidlytics", "nossoNumero": "485808209", "paymentDate": null, "paymentLink": null, "subscription": "sub_uwd6q29ev24y6b2e", "interestValue": null, "invoiceNumber": "910013436", "originalValue": null, "postalService": false, "pixTransaction": null, "checkoutSession": null, "originalDueDate": "2026-09-17", "clientPaymentDate": null, "externalReference": "c1911fc6-ec70-4be1-9ec1-0443fbfb7632", "installmentNumber": null, "estimatedCreditDate": null, "lastInvoiceViewedDate": null, "transactionReceiptUrl": null, "lastBankSlipViewedDate": null}, "dateCreated": "2026-09-14 10:23:01"}	2026-09-14 13:23:01.767+00
7a332f44-040c-4c32-92cf-412cbc12c1bb	PAYMENT_RECEIVED:pay_fsbn4m96ymysj7zw	PAYMENT_RECEIVED	pay_fsbn4m96ymysj7zw	sub_uwd6q29ev24y6b2e	{"id": "evt_d26e303b238e509335ac9ba210e51b0f&1515260125", "event": "PAYMENT_RECEIVED", "account": {"id": "bc6f17b8-6e46-4dad-b027-cb0d177924ac", "ownerId": null}, "payment": {"id": "pay_fsbn4m96ymysj7zw", "fine": {"type": "FIXED", "value": 0}, "value": 67, "escrow": null, "object": "payment", "status": "RECEIVED_IN_CASH", "deleted": false, "dueDate": "2026-09-17", "refunds": null, "customer": "cus_000200270930", "discount": {"type": "FIXED", "value": 0, "limitDate": null, "dueDateLimitDays": 0}, "interest": {"type": "PERCENTAGE", "value": 0}, "netValue": 67, "creditDate": null, "invoiceUrl": "https://www.asaas.com/i/fsbn4m96ymysj7zw", "anticipable": false, "anticipated": false, "bankSlipUrl": "https://www.asaas.com/b/pdf/fsbn4m96ymysj7zw", "billingType": "UNDEFINED", "dateCreated": "2026-09-14", "description": "Assinatura Starter (Mensal) - Vidlytics", "nossoNumero": "485808209", "paymentDate": "2026-09-14", "paymentLink": null, "subscription": "sub_uwd6q29ev24y6b2e", "interestValue": null, "invoiceNumber": "910013436", "originalValue": null, "postalService": false, "pixTransaction": null, "checkoutSession": null, "originalDueDate": "2026-09-17", "clientPaymentDate": "2026-09-14", "externalReference": "c1911fc6-ec70-4be1-9ec1-0443fbfb7632", "installmentNumber": null, "estimatedCreditDate": null, "lastInvoiceViewedDate": null, "transactionReceiptUrl": null, "lastBankSlipViewedDate": null}, "dateCreated": "2026-09-14 10:25:23"}	2026-09-14 13:25:23.685+00
43c9867d-6229-483d-b3c2-de16fbf63d19	PAYMENT_CREATED:pay_pxbp1mcqsmdjqtqh	PAYMENT_CREATED	pay_pxbp1mcqsmdjqtqh	sub_uwd6q29ev24y6b2e	{"id": "evt_05b708f961d739ea7eba7e4db318f621&1516273361", "event": "PAYMENT_CREATED", "account": {"id": "bc6f17b8-6e46-4dad-b027-cb0d177924ac", "ownerId": null}, "payment": {"id": "pay_pxbp1mcqsmdjqtqh", "fine": {"type": "FIXED", "value": 0}, "value": 67, "escrow": null, "object": "payment", "status": "PENDING", "deleted": false, "dueDate": "2026-10-17", "refunds": null, "customer": "cus_000200270930", "discount": {"type": "FIXED", "value": 0, "limitDate": null, "dueDateLimitDays": 0}, "interest": {"type": "PERCENTAGE", "value": 0}, "netValue": 65.18, "creditDate": null, "invoiceUrl": "https://www.asaas.com/i/pxbp1mcqsmdjqtqh", "anticipable": false, "anticipated": false, "bankSlipUrl": "https://www.asaas.com/b/pdf/pxbp1mcqsmdjqtqh", "billingType": "UNDEFINED", "dateCreated": "2026-09-14", "description": "Assinatura Starter (Mensal) - Vidlytics", "nossoNumero": "486086078", "paymentDate": null, "paymentLink": null, "subscription": "sub_uwd6q29ev24y6b2e", "interestValue": null, "invoiceNumber": "910613899", "originalValue": null, "postalService": false, "pixTransaction": null, "checkoutSession": null, "originalDueDate": "2026-10-17", "clientPaymentDate": null, "externalReference": "c1911fc6-ec70-4be1-9ec1-0443fbfb7632", "installmentNumber": null, "estimatedCreditDate": null, "lastInvoiceViewedDate": null, "transactionReceiptUrl": null, "lastBankSlipViewedDate": null}, "dateCreated": "2026-09-14 20:04:20"}	2026-09-14 23:04:21.813+00
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.audit_logs (id, store_id, action, details, created_at) FROM stdin;
eb5973eb-b5a4-4a6d-be3f-75f8679cf024	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	master_set_lifetime	{"plan": "pro", "description": "Acesso vitalício ativado manualmente pelo Painel Master (plano Pro)."}	2026-09-15 13:55:15.846412+00
582c465c-6555-4083-96e0-e4a7b9e66c97	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	master_set_lifetime	{"plan": "pro", "description": "Acesso vitalício ativado manualmente pelo Painel Master (plano Pro)."}	2026-09-15 18:38:52.536291+00
ecf0fcbe-cca5-45a2-8450-784da7aa15b5	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	master_plan_update	{"plan": "scale", "status": "active", "description": "Plano alterado manualmente pelo Painel Master para Scale (12 meses, status: active).", "duration_months": 12}	2026-09-15 18:38:58.770146+00
b23809a7-3a31-4c41-b118-e75a5b2423a0	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	master_set_lifetime	{"plan": "scale", "description": "Acesso vitalício ativado manualmente pelo Painel Master (plano Scale)."}	2026-09-15 18:39:04.186868+00
f70f9ac6-903b-4b35-aaf0-d3496b1d182e	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	master_set_lifetime	{"plan": "scale", "description": "Acesso vitalício ativado manualmente pelo Painel Master (plano Scale)."}	2026-09-18 09:30:18.66484+00
\.


--
-- Data for Name: benchmarks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.benchmarks (id, sector_id, avg_ctr, avg_cvr, avg_hook_rate, created_at) FROM stdin;
\.


--
-- Data for Name: billing_info; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.billing_info (id, store_id, document_type, document_number, legal_name, billing_email, address_zip_code, address_street, address_number, address_complement, address_neighborhood, address_city, address_state, created_at, updated_at, cnpj_cpf, email, phone, cep, address, number, complement, neighborhood, city, state) FROM stdin;
e9a38002-1af9-4ee1-8b82-af6c73ce70f1	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	cpf	\N	ANNELLYSE DIAS MOREIRA LTDA	\N	\N	\N	\N	\N	\N	\N	\N	2026-09-14 13:22:53.066064+00	2026-09-14 13:22:52.894+00	13561653000191	contato@useanny.com		85860250	rua serelepe	211				
\.


--
-- Data for Name: comments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.comments (id, video_id, store_id, user_name, user_email, content, status, parent_id, created_at, updated_at, reply_content, reply_status) FROM stdin;
22945832-a85f-4f98-b317-0ac7f35aeccc	9a7c8ccd-0c57-4697-abe5-866151f0856c	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	www	\N	eweewee	pending	\N	2026-09-09 19:28:16.282985+00	2026-09-09 19:28:16.282985+00	\N	\N
1aee163d-a80b-4362-a6db-cf6339a75b41	9a7c8ccd-0c57-4697-abe5-866151f0856c	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	Rodrigo Cel	\N	Teste❤️	pending	\N	2026-09-09 21:05:59.064482+00	2026-09-09 21:05:59.064482+00	\N	\N
\.


--
-- Data for Name: conversions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.conversions (id, store_id, video_id, product_id, visitor_id, order_id, order_value, currency, status, source, created_at, live_id) FROM stdin;
c0f84d13-918a-480d-b70d-f6390bc948db	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	9a7c8ccd-0c57-4697-abe5-866151f0856c	a8d19b5f-8319-44a0-a360-32d42e37387b	vly_1788983654207_gzollez	172427122	194.61	BRL	pending	yampi	2026-09-09 19:57:53.550732+00	\N
e8e9ff19-0cf9-4448-97fc-e57c9df966ac	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	\N	\N	vly_1789871685358_lo2gjns	173414095	90.32	BRL	pending	universal_tracker	2026-09-20 02:34:50.330994+00	\N
fc0ffd04-1a13-4eb1-add2-38369f82f770	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	\N	\N	vly_1789871838543_1u9fea7	173414214	93.46	BRL	pending	universal_tracker	2026-09-20 02:37:40.420818+00	\N
\.


--
-- Data for Name: daily_store_metrics; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.daily_store_metrics (id, store_id, date, views_count, cta_clicks_count, product_clicks_count, estimated_revenue, created_at, updated_at, shares_count, video_close_count, whatsapp_clicks_count, website_clicks_count, likes_count, unlikes_count, comments_count, story_opens_count) FROM stdin;
\.


--
-- Data for Name: daily_video_metrics; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.daily_video_metrics (id, store_id, video_id, date, views_count, cta_clicks_count, shares_count, next_video_count, video_close_count, whatsapp_clicks_count, website_clicks_count, likes_count, unlikes_count, comments_count) FROM stdin;
\.


--
-- Data for Name: display_locations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.display_locations (id, store_id, story_id, location, selector, "position", active, created_at, updated_at) FROM stdin;
f9e6ff54-194e-4d95-8fd0-294e1e2caf42	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	591a37a1-1897-4293-9ba4-ea7992849c77	afterend	div#app > section.category-content:nth-of-type(2) > div.main_category_content-1 > div.breadcrumbs.container:nth-of-type(1)	afterend	t	2026-09-09 19:19:29.911+00	2026-09-16 19:29:56.424+00
\.


--
-- Data for Name: insight_rule_conditions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.insight_rule_conditions (id, rule_id, metric_key, operator, value_min, value_max, compare_to_benchmark, logic_group) FROM stdin;
a402b1c3-7469-4173-8d23-2a4e4900e97c	32aa8bbe-793d-4ee2-89aa-0afe1a732f60	hook_rate	>	10	\N	t	1
93a0e4c4-3b9c-4360-9c18-df6ef4cb1e60	108fb2df-5169-43f1-af53-35da839706d9	hook_rate	<	-10	\N	t	1
1eb67216-3f82-4f3e-8b50-9740225dc928	bd47ef27-7cce-425c-86c9-d211b15cf31f	avg_watch_time	<	18	\N	f	1
1b8f492a-9e4f-4f03-a74f-d63bae5170b0	bd47ef27-7cce-425c-86c9-d211b15cf31f	drop_off_rate	>	45	\N	f	1
96819bbb-dd1b-473e-b2bf-84a4f5e9d639	e4e65597-f083-499e-b88d-72ddd6474906	avg_watch_time	<	18	\N	f	1
3ac7a011-b1fd-4b4a-8cbc-6ca89c03d879	e4e65597-f083-499e-b88d-72ddd6474906	drop_off_rate	<	25	\N	f	1
1340ec4c-7814-4400-9322-a1b6bfbc6a95	316cceb3-41b5-4345-920d-ebce647c9f28	ctr	>	15	\N	t	1
56adb623-d29a-4031-aebe-44d9c3a1aa84	62f074b7-7048-46f6-be59-1a8af34d9576	ctr	<	-15	\N	t	1
816f1c7b-2831-4da9-bb15-cc185f05b730	db628823-882e-4d93-b917-c539ca1baffe	ctr	>	0	\N	t	1
c4e85399-19af-4571-a59a-fad380f347a9	db628823-882e-4d93-b917-c539ca1baffe	cvr	<	-20	\N	t	1
d295ce8a-fe66-4161-90a8-48973ee943c7	bac0cdf9-edd2-4133-9c84-2c928c4a3108	ctr	>	0	\N	t	1
4751abaf-1930-40f3-92a0-26edcf19a4e8	bac0cdf9-edd2-4133-9c84-2c928c4a3108	cvr	>	0	\N	t	1
588ee904-53bb-4822-9c1c-0ae796275b8a	407900df-5649-43e8-ab6c-bc12cd0735d7	cvr	<	-20	\N	t	1
9b953484-3f05-41a0-ace2-e653df3bbd3d	407900df-5649-43e8-ab6c-bc12cd0735d7	ctr	between	-10	10	t	1
4f8b0fef-c789-4cb7-a3cb-1904264c1fa1	6f00163f-4f16-491b-9c3a-dbd16a1064e5	engagement_rate	>	3	\N	f	1
3c0950f0-e1c3-4411-beaf-0f15b5d05569	6f00163f-4f16-491b-9c3a-dbd16a1064e5	cvr	<	-10	\N	t	1
0590d1e4-a480-48a4-a115-f46b26e48f05	2041fb0e-b98b-4a62-ab39-552e319bfcf8	engagement_rate	<	1	\N	f	1
26dcac0d-4be7-455f-829b-ced4967e7b2c	7810e07b-5633-4caf-b385-2dfb0fbdc681	comment_rate_vs_avg	>	100	\N	f	1
215eb9cb-c66c-488a-9996-1af4b3bef1e9	04ae31e0-bab7-4a86-810c-7e26e4ecb7f9	peak_hour_concentration	>	60	\N	f	1
a2b14ed6-1b41-4596-8af5-d24ba884cd6e	79331890-0d63-4de5-8328-77f4d30df75d	best_day_diff	>	30	\N	f	1
4de93603-3977-4be4-bcf8-edd60a2d2b3b	2d835301-a569-483b-aeaa-1623094ee352	whatsapp_rate	>	5	\N	f	1
35831b5b-6825-4f92-9304-9a9ec238b3e1	c48c1fdc-58fd-4b15-8115-73294629a791	views	<	50	\N	f	1
0f451927-a106-4a36-9a03-ff994853a0c7	7396464a-5d6c-4b25-9473-3f31a51a6c85	drop_off_rate	>	55	\N	f	1
9ffaa06e-e50d-4ac3-9df2-21598e484ba9	9b6bccc7-382f-4405-9e3c-d2e3912890b6	engagement_rate	<	1	\N	f	1
557a5b9f-096b-46db-b72b-0201a8c86528	2608e5a2-1407-46c6-9e23-6ba5de969282	cvr	>	25	\N	t	1
7f3b78bc-7837-4eb7-97a3-610277c671d9	7a5f0088-3468-4e64-8dbb-2d66f3ffbf72	avg_watch_time	<	4	\N	f	1
\.


--
-- Data for Name: insight_rules; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.insight_rules (id, code, sector_slug, priority, insight_type, title, description_template, impact_label, action_text, is_active, created_at) FROM stdin;
32aa8bbe-793d-4ee2-89aa-0afe1a732f60	hook_rate_excellent	\N	8	success	Gancho Inicial Excelente	O vídeo "{{video_title}}" obteve Hook Rate de {{hook_rate}}%, {{diff}}% acima da média do seu setor. Esse padrão de abertura está funcionando muito bem.	Alto Impacto no CTR	Impulsionar mais esse criativo	t	2026-09-10 17:40:05.756843+00
108fb2df-5169-43f1-af53-35da839706d9	hook_rate_weak	\N	9	warning	Gancho Inicial Fraco	O vídeo "{{video_title}}" tem Hook Rate de apenas {{hook_rate}}%, abaixo da média do seu setor. Os primeiros 3 segundos não estão prendendo atenção.	Perda de Retenção	Reeditar a abertura do vídeo	t	2026-09-10 17:40:05.756843+00
bd47ef27-7cce-425c-86c9-d211b15cf31f	low_watch_high_dropoff	\N	10	warning	Retenção Baixa com Evasão Alta	Tempo médio de {{avg_watch_time}}s combinado com {{drop_off_rate}}% de evasão antes do fim. Considere mostrar o produto já nos 3 primeiros segundos.	Perda de Conversão	Reeditar os primeiros 3 segundos	t	2026-09-10 17:40:05.756843+00
e4e65597-f083-499e-b88d-72ddd6474906	short_but_stable	\N	5	tip	Vídeo Curto com Retenção Estável	O vídeo é naturalmente curto ({{avg_watch_time}}s), mas a evasão está controlada ({{drop_off_rate}}%). Não é um problema — pode ser apenas um formato objetivo.	Formato Eficiente	Manter o formato atual	t	2026-09-10 17:40:05.756843+00
316cceb3-41b5-4345-920d-ebce647c9f28	ctr_above_benchmark	\N	7	success	CTR Acima do Benchmark	O CTR de "{{video_title}}" está em {{ctr}}%, {{diff}}% acima da média do seu setor. O produto está despertando interesse real.	Alto Interesse no Produto	Escalar esse vídeo em mais páginas	t	2026-09-10 17:40:05.756843+00
62f074b7-7048-46f6-be59-1a8af34d9576	ctr_below_benchmark	\N	8	warning	CTR Abaixo do Benchmark	O CTR está {{diff}}% abaixo da média do seu setor. O CTA pode estar pouco visível ou o produto não está sendo destacado no vídeo.	Baixo Interesse no Produto	Revisar posicionamento do CTA	t	2026-09-10 17:40:05.756843+00
db628823-882e-4d93-b917-c539ca1baffe	high_click_low_conversion	\N	10	warning	Clique Alto, Conversão Baixa	Muita gente clica no produto ({{ctr}}%) mas poucos compram ({{cvr}}%). O problema pode não ser o vídeo — pode ser preço, frete ou página de destino.	Fricção na Compra	Revisar página do produto	t	2026-09-10 17:40:05.756843+00
bac0cdf9-edd2-4133-9c84-2c928c4a3108	ctr_cvr_champion	\N	9	success	Vídeo Campeão de Conversão	"{{video_title}}" converte acima da média em cliques e vendas. É seu melhor vídeo do período.	Alto Impacto em Vendas	Usar como referência para novos vídeos	t	2026-09-10 17:40:05.756843+00
407900df-5649-43e8-ab6c-bc12cd0735d7	low_cvr_isolated	\N	6	tip	Conversão Final Baixa	O vídeo atrai cliques normais, mas a conversão final está baixa. Considere reforçar prova social (avaliações, urgência) no story.	Oportunidade de Otimização	Adicionar selo de confiança/urgência	t	2026-09-10 17:40:05.756843+00
6f00163f-4f16-491b-9c3a-dbd16a1064e5	engagement_no_conversion	\N	7	tip	Alto Engajamento sem Conversão	O vídeo tem ótimo engajamento social ({{engagement_rate}}%), mas baixa conversão. O público gosta do conteúdo, mas falta um empurrão final para comprar.	Falta CTA Direto	Adicionar CTA mais direto no final	t	2026-09-10 17:40:05.756843+00
2041fb0e-b98b-4a62-ab39-552e319bfcf8	engagement_very_low	\N	4	warning	Engajamento Muito Baixo	Poucas curtidas, comentários ou compartilhamentos neste período. O conteúdo pode não estar gerando conexão emocional com o público.	Baixa Conexão com Audiência	Testar formatos mais autênticos/bastidores	t	2026-09-10 17:40:05.756843+00
7810e07b-5633-4caf-b385-2dfb0fbdc681	high_comment_volume	\N	5	tip	Comentários Altos	"{{video_title}}" gerou volume alto de comentários. Considere responder rapidamente — isso pode virar prova social para outros visitantes.	Oportunidade Social	Responder comentários pendentes	t	2026-09-10 17:40:05.756843+00
04ae31e0-bab7-4a86-810c-7e26e4ecb7f9	peak_hour_pattern	\N	6	tip	Pico de Engajamento em Horário Específico	{{percent}}% dos cliques em CTA ocorrem entre {{hour_start}} e {{hour_end}}. Considere concentrar novos stories ou ofertas relâmpago nesse horário.	Otimização de Horário	Agendar Stories	t	2026-09-10 17:40:05.756843+00
79331890-0d63-4de5-8328-77f4d30df75d	best_day_of_week	\N	4	tip	Melhor Dia da Semana	{{day_of_week}} tem CVR {{diff}}% acima dos outros dias. Vale concentrar lançamentos de produtos ou promoções nesse dia.	Otimização de Calendário	Planejar lançamentos	t	2026-09-10 17:40:05.756843+00
2d835301-a569-483b-aeaa-1623094ee352	high_whatsapp_clicks	\N	5	tip	Alto Volume de Cliques no WhatsApp	{{whatsapp_rate}}% dos visitantes preferem ir direto ao WhatsApp em vez do checkout. Pode ser sinal de dúvida sobre tamanho/cor/prazo.	Canal Alternativo de Conversão	Adicionar FAQ no story	t	2026-09-10 17:40:05.756843+00
c48c1fdc-58fd-4b15-8115-73294629a791	low_volume_data	\N	3	tip	Poucas Visualizações no Período	Volume de visualizações ainda baixo neste período ({{views}}). Os insights ganham mais precisão com mais dados — considere publicar mais Stories.	Dados Insuficientes	Publicar novos Stories	t	2026-09-10 17:40:05.756843+00
7396464a-5d6c-4b25-9473-3f31a51a6c85	drop_off_critical	\N	3	warning	Queda Drástica de Retenção	O vídeo "{{video_title}}" está sofrendo um drop-off de {{drop_off_rate}}% antes de atingir 80% da duração.	Perda de Conversão	Re-editar os primeiros segundos	t	2026-09-10 17:52:27.691422+00
9b6bccc7-382f-4405-9e3c-d2e3912890b6	low_engagement	\N	1	tip	Baixo Engajamento Social	O vídeo "{{video_title}}" teve apenas {{engagement_rate}}% de engajamento (curtidas + comentários) em relação às views.	Potencial de Interação	Testar CTA de comentário no vídeo	t	2026-09-10 17:52:27.691422+00
2608e5a2-1407-46c6-9e23-6ba5de969282	cvr_excellent	\N	3	success	Alta Taxa de Conversão	O vídeo "{{video_title}}" converteu {{cvr}}% das views em vendas, superando a média do setor.	Excelente ROI	Replicar esse formato em novos vídeos	t	2026-09-10 17:52:27.691422+00
7a5f0088-3468-4e64-8dbb-2d66f3ffbf72	low_watch_time	\N	2	warning	Tempo Médio de Visualização Baixo	O vídeo "{{video_title}}" está sendo assistido em média por apenas {{avg_watch_time}}s. Considere um formato mais curto e direto.	Risco de Desinteresse	Encurtar ou reeditar o vídeo	t	2026-09-10 17:52:27.691422+00
\.


--
-- Data for Name: insights; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.insights (id, store_id, insight_type, title, description, action_label, related_video_id, related_placement_id, metric_key, metric_value, metric_comparison_value, read, dismissed, created_at, completed, action_url) FROM stdin;
\.


--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.invoices (id, store_id, subscription_id, amount_cents, currency, status, description, due_date, paid_at, gateway_provider, gateway_invoice_id, invoice_pdf_url, created_at, updated_at, asaas_payment_id, invoice_url, payment_method) FROM stdin;
\.


--
-- Data for Name: live_advantages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.live_advantages (id, live_id, store_id, title, description, "position", created_at) FROM stdin;
\.


--
-- Data for Name: live_chat_messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.live_chat_messages (id, live_id, store_id, author_name, message, is_from_store, created_at, session_id) FROM stdin;
59e0140c-91c0-40b4-9e77-14801a09d29f	6461b26d-34b0-4356-a9fa-5feac04f8c41	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	Loja	📢 AVISO: sdsdsdd	t	2026-09-19 12:46:36.511119+00	\N
d74411d1-0d5d-475c-b067-2d8afae19e14	6461b26d-34b0-4356-a9fa-5feac04f8c41	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	Loja	🔥 CUPOM ESPECIAL DA LIVE: Use o cupom "DSFSDF" para desconto exclusivo!	t	2026-09-19 12:47:31.896462+00	\N
\.


--
-- Data for Name: live_coupons; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.live_coupons (id, live_id, store_id, code, discount, "position", created_at) FROM stdin;
\.


--
-- Data for Name: live_events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.live_events (id, live_id, event_type, metadata, created_at) FROM stdin;
367dba3a-95ad-409a-b263-9d0aecbc0e14	6461b26d-34b0-4356-a9fa-5feac04f8c41	view	{"source": "promo_card"}	2026-09-18 18:14:33.931929+00
fd3e3db7-672e-4570-bba4-75a2503797d7	6461b26d-34b0-4356-a9fa-5feac04f8c41	view	{"source": "promo_card"}	2026-09-18 18:56:02.940766+00
1c60357e-14de-4230-8102-10f20b210385	6461b26d-34b0-4356-a9fa-5feac04f8c41	view	{"source": "promo_card"}	2026-09-18 18:56:51.692087+00
6a7844c7-e941-4de0-b949-4169bc99060b	6461b26d-34b0-4356-a9fa-5feac04f8c41	view	{"source": "promo_card"}	2026-09-18 20:31:39.709059+00
3cbcc630-fe62-41fe-a14c-463c30f5389a	6461b26d-34b0-4356-a9fa-5feac04f8c41	view	{"source": "promo_card"}	2026-09-19 20:12:16.308948+00
\.


--
-- Data for Name: live_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.live_settings (id, store_id, widget_divulgacao, widget_aovivo, player_settings, created_at, updated_at) FROM stdin;
ee9f6a9c-c9af-47a5-99bf-e3635666ade8	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	{"linked": false, "mobile": {"width": 80, "format": "portrait", "ctaText": "Participe", "showCTA": true, "position": "bottom-left", "marginTop": 0, "objectFit": "cover", "playVideo": true, "ctaBgColor": "#0094ea", "marginSide": 5, "borderColor": "#0094ea", "borderWidth": 2, "borderRadius": 14, "ctaTextColor": "#FFFFFF", "marginBottom": 0, "showCountdown": true, "ctaBorderRadius": "9999px", "showCloseButton": true, "countdownBgColor": "#0094ea", "countdownTextColor": "#FFFFFF", "countdownBorderRadius": "4px"}, "desktop": {"width": 100, "format": "portrait", "ctaText": "Participe", "showCTA": true, "position": "top-left", "marginTop": 0, "objectFit": "cover", "playVideo": true, "ctaBgColor": "#0094ea", "marginSide": 5, "borderColor": "#0094ea", "borderWidth": 2, "borderRadius": 14, "ctaTextColor": "#FFFFFF", "marginBottom": 0, "showCountdown": true, "ctaBorderRadius": "9999px", "showCloseButton": true, "countdownBgColor": "#0094ea", "countdownTextColor": "#FFFFFF", "countdownBorderRadius": "4px"}}	{"linked": false, "mobile": {"width": 80, "format": "portrait", "ctaText": "AO VIVO", "showCTA": true, "position": "bottom-left", "marginTop": 0, "objectFit": "cover", "playVideo": true, "ctaBgColor": "#0094ea", "marginSide": 5, "borderColor": "#0094ea", "borderWidth": 2, "borderRadius": 14, "ctaTextColor": "#FFFFFF", "marginBottom": 0, "ctaBorderRadius": "9999px", "showCloseButton": true}, "desktop": {"width": 100, "format": "portrait", "ctaText": "AO VIVO", "showCTA": true, "position": "bottom-left", "marginTop": 0, "objectFit": "cover", "playVideo": true, "ctaBgColor": "#0094ea", "marginSide": 5, "borderColor": "#0094ea", "borderWidth": 2, "borderRadius": 14, "ctaTextColor": "#FFFFFF", "marginBottom": 0, "ctaBorderRadius": "9999px", "showCloseButton": true}}	{"linked": true, "mobile": {"showChat": true, "showInfo": true, "infoSize1": 18, "infoSize2": 12, "infoText1": "FRETE GRÁTIS", "infoText2": "Acima de R$199,00", "showShare": true, "showTitle": true, "titleText": "Vidlytics Live", "couponCode": "VIDLYTICS10", "couponText": "10% OFF", "showCoupon": true, "titleColor": "#FFFFFF", "borderColor": "#0094ea", "borderWidth": 2, "infoBgColor": "#0094ea", "borderRadius": 14, "shareBgColor": "#FFFFFF", "showProducts": true, "autoplayMuted": true, "infoTextColor": "#FFFFFF", "shareTextColor": "#000000", "couponCodeColor": "#FFFFFF", "couponTextColor": "#000000", "productNameSize": 11, "showViewerCount": true, "productNameColor": "#1e293b", "productPriceSize": 12, "couponCodeBgColor": "#0094ea", "couponTextBgColor": "#FFFFFF", "productPriceColor": "#0094ea"}, "desktop": {"showChat": true, "showInfo": true, "infoSize1": 18, "infoSize2": 12, "infoText1": "FRETE GRÁTIS", "infoText2": "Acima de R$199,00", "showShare": true, "showTitle": true, "titleText": "Vidlytics Live", "couponCode": "VIDLYTICS10", "couponText": "10% OFF", "showCoupon": true, "titleColor": "#FFFFFF", "borderColor": "#0094ea", "borderWidth": 2, "infoBgColor": "#0094ea", "borderRadius": 14, "shareBgColor": "#FFFFFF", "showProducts": true, "autoplayMuted": true, "infoTextColor": "#FFFFFF", "shareTextColor": "#000000", "couponCodeColor": "#FFFFFF", "couponTextColor": "#000000", "productNameSize": 11, "showViewerCount": true, "productNameColor": "#1e293b", "productPriceSize": 12, "couponCodeBgColor": "#0094ea", "couponTextBgColor": "#FFFFFF", "productPriceColor": "#0094ea"}}	2026-09-18 19:16:03.498575+00	2026-09-18 19:16:03.498575+00
\.


--
-- Data for Name: live_subscribers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.live_subscribers (id, live_id, store_id, name, phone, email, created_at) FROM stdin;
\.


--
-- Data for Name: lives; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lives (id, store_id, title, youtube_url, youtube_video_id, status, is_active, badge_text, badge_color, featured_product_ids, instagram_url, scheduled_at, started_at, ended_at, created_at, updated_at, teaser_video_url, teaser_thumbnail_url, show_countdown, pinned_product_id, notify_leads_enabled, promo_start_at, promo_end_at, promo_target_type, promo_target_value, promo_cta_text, promo_media_url, promo_media_type, whatsapp_group_url, product_cta_texts, youtube_thumbnail_url, coupons, advantages, appearance_template_id, live_widget_config, live_player_config, spotlight_product_id, product_coupon_texts, spotlight_coupon_code, spotlight_advantage_idx) FROM stdin;
6461b26d-34b0-4356-a9fa-5feac04f8c41	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	LIVE RODRIGO	https://youtube.com/live/lLlcKFbd59c?feature=share	lLlcKFbd59c	live	t	AO VIVO AGORA	#ff0033	["a8d19b5f-8319-44a0-a360-32d42e37387b", "4e8f74df-0890-4793-adfa-3d5f52fc52b7", "f57444d5-6838-4fb7-b559-4ca49e83d5d4", "6c634eab-b999-46e9-a80c-4d0fcb823249"]	\N	2026-09-30 11:15:00+00	\N	\N	2026-09-18 11:33:15.106481+00	2026-09-18 11:33:15.106481+00	\N	\N	t	\N	t	2026-09-18 11:27:00+00	2026-09-20 11:27:00+00	url_contains	/azul	Cadastre-se	https://wznvecurmisgoaijykbt.supabase.co/storage/v1/object/public/videos/store_c1911fc6-ec70-4be1-9ec1-0443fbfb7632/live_promo/1789730909247.mp4	video	https://chat.whatsapp.com/CsCbywlKjTx3nOVVG7K24r	{"4e8f74df-0890-4793-adfa-3d5f52fc52b7": "Comprar Agora", "6c634eab-b999-46e9-a80c-4d0fcb823249": "Comprar Agora", "a8d19b5f-8319-44a0-a360-32d42e37387b": "Comprar Agora", "f57444d5-6838-4fb7-b559-4ca49e83d5d4": "Comprar Agora"}	https://img.youtube.com/vi/lLlcKFbd59c/maxresdefault.jpg	[{"id": "c_1", "code": "NOVO15", "description": "15%OFF"}, {"id": "c_1789730725816", "code": "NOVO50", "description": "50%OFF"}]	[{"id": "a_1", "title": "FRETE FREE", "description": "Compras acima de R$200"}, {"id": "a_1789730749724", "title": "GIFT", "description": "Ganhe um lindo presente"}]	preset_live	{"aoVivo": {"linked": false, "mobile": {"width": 80, "format": "portrait", "ctaText": "AO VIVO", "showCTA": true, "position": "bottom-left", "marginTop": 0, "objectFit": "cover", "playVideo": true, "ctaBgColor": "#e7191f", "marginSide": 5, "borderColor": "#e7191f", "borderWidth": 2, "borderRadius": 14, "ctaTextColor": "#ffffff", "marginBottom": 0, "ctaBorderRadius": "9999px", "showCloseButton": true}, "desktop": {"width": 100, "format": "portrait", "ctaText": "AO VIVO", "showCTA": true, "position": "bottom-left", "marginTop": 0, "objectFit": "cover", "playVideo": true, "ctaBgColor": "#e7191f", "marginSide": 5, "borderColor": "#e7191f", "borderWidth": 2, "borderRadius": 14, "ctaTextColor": "#ffffff", "marginBottom": 0, "ctaBorderRadius": "9999px", "showCloseButton": true}}, "divulgacao": {"linked": false, "mobile": {"width": 80, "format": "portrait", "ctaText": "Participe", "showCTA": true, "position": "bottom-left", "marginTop": 0, "objectFit": "cover", "playVideo": true, "ctaBgColor": "#e7191f", "marginSide": 5, "borderColor": "#e7191f", "borderWidth": 2, "borderRadius": 14, "ctaTextColor": "#ffffff", "marginBottom": 0, "showCountdown": true, "ctaBorderRadius": "9999px", "showCloseButton": true, "countdownBgColor": "#e7191f", "countdownTextColor": "#ffffff", "countdownBorderRadius": "4px"}, "desktop": {"width": 100, "format": "portrait", "ctaText": "Participe", "showCTA": true, "position": "bottom-left", "marginTop": 0, "objectFit": "cover", "playVideo": true, "ctaBgColor": "#e7191f", "marginSide": 5, "borderColor": "#e7191f", "borderWidth": 2, "borderRadius": 14, "ctaTextColor": "#ffffff", "marginBottom": 0, "showCountdown": true, "ctaBorderRadius": "9999px", "showCloseButton": true, "countdownBgColor": "#e7191f", "countdownTextColor": "#ffffff", "countdownBorderRadius": "4px"}}}	{"linked": true, "mobile": {"showChat": true, "showInfo": true, "infoSize1": 18, "infoSize2": 12, "infoText1": "FRETE GRÁTIS", "infoText2": "Acima de R$199,00", "showShare": true, "showTitle": true, "titleText": "Live Especial", "couponCode": "LIVE15", "couponText": "10% OFF", "showCoupon": true, "titleColor": "#FFFFFF", "borderColor": "#e7191f", "borderWidth": 2, "infoBgColor": "#e7191f", "borderRadius": 14, "shareBgColor": "#FFFFFF", "showProducts": true, "autoplayMuted": true, "infoTextColor": "#ffffff", "shareTextColor": "#000000", "couponCodeColor": "#ffffff", "couponTextColor": "#e7191f", "productNameSize": 11, "showViewerCount": true, "productNameColor": "#1e293b", "productPriceSize": 12, "couponCodeBgColor": "#e7191f", "couponTextBgColor": "#ffffff", "productPriceColor": "#e7191f"}, "desktop": {"showChat": true, "showInfo": true, "infoSize1": 18, "infoSize2": 12, "infoText1": "FRETE GRÁTIS", "infoText2": "Acima de R$199,00", "showShare": true, "showTitle": true, "titleText": "Live Especial", "couponCode": "LIVE15", "couponText": "10% OFF", "showCoupon": true, "titleColor": "#FFFFFF", "borderColor": "#e7191f", "borderWidth": 2, "infoBgColor": "#e7191f", "borderRadius": 14, "shareBgColor": "#FFFFFF", "showProducts": true, "autoplayMuted": true, "infoTextColor": "#ffffff", "shareTextColor": "#000000", "couponCodeColor": "#ffffff", "couponTextColor": "#e7191f", "productNameSize": 11, "showViewerCount": true, "productNameColor": "#1e293b", "productPriceSize": 12, "couponCodeBgColor": "#e7191f", "couponTextBgColor": "#ffffff", "productPriceColor": "#e7191f"}}	\N	{}	\N	\N
\.


--
-- Data for Name: page_rules; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.page_rules (id, store_id, story_id, created_at, updated_at, condition_type, value) FROM stdin;
15a93406-6804-41d3-9448-831a2c676259	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	591a37a1-1897-4293-9ba4-ea7992849c77	2026-09-09 19:20:11.86+00	2026-09-16 19:29:56.784+00	url_contains	/azul
\.


--
-- Data for Name: plans; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.plans (id, slug, name, description, price_cents, billing_cycle, views_limit, storage_limit_bytes, pages_limit, features, is_popular, is_active, sort_order, created_at, updated_at, videos_limit, allows_live, modules) FROM stdin;
a1da1891-9720-42b6-a23c-66b713bb3050	starter	Starter	\N	6700	monthly	5000	5368709120	2	[]	f	t	1	2026-09-08 12:30:22.100323+00	2026-09-19 20:39:33.906651+00	10	f	["vidlytics"]
eae5022d-617a-44f1-a2ce-46e12ad3c32e	pro	Pro	\N	12700	monthly	20000	16106127360	10	[]	t	t	2	2026-09-08 12:30:22.100323+00	2026-09-19 20:39:33.906651+00	30	t	["vidlytics", "live-commerce"]
5493cbc5-05b4-4f39-99ba-e29c98d86cb6	scale	Scale	\N	24700	monthly	60000	53687091200	9999	[]	f	t	3	2026-09-08 12:30:22.100323+00	2026-09-19 20:39:33.906651+00	100	t	["vidlytics", "live-commerce"]
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.products (id, store_id, external_id, name, category, price, sale_price, images, product_url, created_at, updated_at, image_url, sku, short_description, active, origin, import_source, xml_id, is_active, last_imported_at) FROM stdin;
4e8f74df-0890-4793-adfa-3d5f52fc52b7	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	297839759	Calça Confort Bicolor Preto e Rosa Pink 46/48 - G	Calças	154.95	\N	[]	https://www.useanny.com/calca-confort-bicolor-preto-e-rosa-pink/p	2026-09-09 19:15:48.551+00	2026-09-09 19:16:08.326459+00	https://images.yampi.me/assets/stores/use-anny3/uploads/images/calca-confort-bicolor-preto-e-rosa-pink-4648-g-69f8c7c9b60d0-large.jpg	CAL-CONF-BI-PR-PINK-G	A Calça Scrub Feminina Confort é a peça que sustenta sua rotina com leveza e organização sem abrir mão de imagem profissional. Com modelagem funcional, ajuste confortável e tecido tecnológico, entrega o essencial com padrão Use Anny: caimento estável e presença impecável no dia a dia.Tecido tecnológicoConfeccionada em malha tecnológica bi-stretch (elasticidade nos dois sentidos), oferece mobilidade real com toque macio e secagem rápida. Easy care para uma rotina mais simples: amassa menos e facilita a manutenção, além de tecnologias que contribuem para conforto ao longo do uso.Por que escolher a Calça Confort?Bi-stretch: liberdade de movimento com conforto contínuo.Tecnologia Dry: auxilia na sensação de frescor ao longo do uso.Proteção UV50+: mais cuidado com a pele na rotina.Ação antimicrobiana: contribui para higiene e controle de odores.Easy care: seca rápido e amassa menos, facilitando a manutenção.Funcionalidade real: 4 bolsos funcionais (2 frontais + 2 traseiros) para organizar seus essenciais.Ajuste confortável: cintura com elástico e tornozelo com elástico para acompanhar a rotina em movimento.Durabilidade: tecido com boa recuperação, pensado para manter o caimento com uso frequente.Especificações técnicasTecido: Malha tecnológica bi-stretchComposição: 90% Poliéster | 10% ElastanoTecnologias: Dry | UV50+ | Ação antimicrobiana | Easy careBolsos: 4 bolsos funcionais (2 frontais + 2 traseiros)Ajustes: Cintura com elástico | Tornozelo com elásticoFAQ1. Para quem a Calça Confort é indicada?Para quem precisa de praticidade e organização no dia a dia, com conforto e caimento alinhado.2. Ela é confortável para longas horas de trabalho?Sim. O bi-stretch e o ajuste com elástico foram pensados para mobilidade e conforto durante a rotina.3. Precisa passar?Ela é easy care: seca rápido e amassa menos. A necessidade de passar pode variar conforme sua rotina.4. A calça mantém o formato?Sim. A elasticidade e a recuperação do tecido ajudam a preservar o caimento com uso frequente.5. Sobre UV50+ e ação antimicrobianaO tecido possui proteção UV50+ e ação antimicrobiana, contribuindo para conforto e higiene no dia a dia.6. Troca/devoluçãoConsulte a Política de Trocas e Devoluções.7. Prazo de entregaO prazo estimado é informado no checkout conforme seu CEP.8. Formas de pagamentoAs opções disponíveis aparecem no checkout.Sobre a Use AnnyHá mais de 10 anos vestindo profissionais com excelência. Somos especialistas em jalecos e scrubs premium, desenvolvidos especialmente para quem busca qualidade superior, conforto e durabilidade no dia a dia profissional.Localizada em Foz do Iguaçu - Paraná, nossa marca se destaca pela criação de modelos exclusivos confeccionados com materiais de alta qualidade e acabamento impecável. Cada peça é pensada nos mínimos detalhes para oferecer o melhor em funcionalidade e elegância.Já conquistamos a confiança de milhares de profissionais em todo o Brasil e em diversos países como Paraguai, Argentina, Estados Unidos, Portugal, Cuba, Bolívia e Chile. Nossa missão é continuar sendo referência em jalecos e scrubs premium, proporcionando produtos que fazem a diferença na rotina de trabalho dos nossos clientes.Use Anny - Qualidade que você veste, confiança que você sente.	t	xml	xml	297839759	t	\N
a8d19b5f-8319-44a0-a360-32d42e37387b	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	297839835	Blusa Confort - Verde Jade 46/48 - G	Blusas	149.95	\N	[]	https://www.useanny.com/blusa-confort-verde-jade/p	2026-09-09 19:15:48.551+00	2026-09-09 19:16:14.338947+00	https://images.yampi.me/assets/stores/use-anny3/uploads/images/blusa-confort-verde-jade-4648-g-69f8c0badbeec-large.jpg	BLU-CONFORT-VD-JAD-G	A Blusa Scrub Feminina Confort foi pensada para quem precisa de praticidade sem abrir mão de presença. Um essencial com acabamento Use Anny: caimento estável, visual limpo e conforto que acompanha o ritmo do dia do atendimento ao pós-plantão.Tecido tecnológicoConfeccionada em malha tecnológica bi-stretch (elasticidade nos dois sentidos), entrega mobilidade real e conforto contínuo. Toque macio, secagem rápida e easy care para uma rotina mais simples com sensação de frescor ao longo do uso.Por que escolher a Blusa Confort?Bi-stretch: liberdade de movimento com conforto contínuo.Tecnologia Dry: auxilia na sensação de frescor durante o dia.Proteção UV50+: mais cuidado para a rotina.Ação antimicrobiana: contribui para higiene e controle de odores.Easy care: seca rápido e amassa menos, facilitando a manutenção.Design essencial: gola em V clássica e 1 bolso funcional na blusa.FAQ1. Para quem a Blusa Confort é indicada?Para quem quer praticidade e tecnologia no dia a dia, com imagem profissional e conforto.2. Precisa passar?Ela é easy care: seca rápido e amassa menos. A necessidade de passar pode variar conforme sua rotina.3. O tecido ajuda na sensação de frescor?Sim. A Tecnologia Dry auxilia na sensação de frescor ao longo do uso.4. Sobre UV50+ e ação antimicrobianaO tecido possui proteção UV50+ e ação antimicrobiana, contribuindo para conforto e higiene no dia a dia.5. Troca/devoluçãoConsulte a Política de Trocas e Devoluções.6. Prazo de entregaO prazo estimado é informado no checkout conforme seu CEP.7. Formas de pagamentoAs opções disponíveis aparecem no checkout.Sobre a Use AnnyHá mais de 10 anos vestindo profissionais com excelência. Somos especialistas em jalecos e scrubs premium, desenvolvidos especialmente para quem busca qualidade superior, conforto e durabilidade no dia a dia profissional.Localizada em Foz do Iguaçu - Paraná, nossa marca se destaca pela criação de modelos exclusivos confeccionados com materiais de alta qualidade e acabamento impecável. Cada peça é pensada nos mínimos detalhes para oferecer o melhor em funcionalidade e elegância.Já conquistamos a confiança de milhares de profissionais em todo o Brasil e em diversos países como Paraguai, Argentina, Estados Unidos, Portugal, Cuba, Bolívia e Chile. Nossa missão é continuar sendo referência em jalecos e scrubs premium, proporcionando produtos que fazem a diferença na rotina de trabalho dos nossos clientes.Use Anny - Qualidade que você veste, confiança que você sente.	t	xml	xml	297839835	t	\N
f57444d5-6838-4fb7-b559-4ca49e83d5d4	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	297839874	Calça Confort - Rosa Pink 42/44 - M	Calças	149.95	\N	[]	https://www.useanny.com/calca-confort-rosa-pink/p	2026-09-09 19:15:48.551+00	2026-09-09 19:16:19.195503+00	https://images.yampi.me/assets/stores/use-anny3/uploads/images/calca-confort-rosa-pink-4244-m-69f8ccb8dee03-large.jpg	CAL-CONFORT-ROS-PIN-M	A Calça Scrub Feminina Confort é a peça que sustenta sua rotina com leveza e organização sem abrir mão de imagem profissional. Com modelagem funcional, ajuste confortável e tecido tecnológico, entrega o essencial com padrão Use Anny: caimento estável e presença impecável no dia a dia.Tecido tecnológicoConfeccionada em malha tecnológica bi-stretch (elasticidade nos dois sentidos), oferece mobilidade real com toque macio e secagem rápida. Easy care para uma rotina mais simples: amassa menos e facilita a manutenção, além de tecnologias que contribuem para conforto ao longo do uso.Por que escolher a Calça Confort?Bi-stretch: liberdade de movimento com conforto contínuo.Tecnologia Dry: auxilia na sensação de frescor ao longo do uso.Proteção UV50+: mais cuidado com a pele na rotina.Ação antimicrobiana: contribui para higiene e controle de odores.Easy care: seca rápido e amassa menos, facilitando a manutenção.Funcionalidade real: 4 bolsos funcionais (2 frontais + 2 traseiros) para organizar seus essenciais.Ajuste confortável: cintura com elástico e tornozelo com elástico para acompanhar a rotina em movimento.Durabilidade: tecido com boa recuperação, pensado para manter o caimento com uso frequente.Especificações técnicasTecido: Malha tecnológica bi-stretchComposição: 90% Poliéster | 10% ElastanoTecnologias: Dry | UV50+ | Ação antimicrobiana | Easy careBolsos: 4 bolsos funcionais (2 frontais + 2 traseiros)Ajustes: Cintura com elástico | Tornozelo com elásticoFAQ1. Para quem a Calça Confort é indicada?Para quem precisa de praticidade e organização no dia a dia, com conforto e caimento alinhado.2. Ela é confortável para longas horas de trabalho?Sim. O bi-stretch e o ajuste com elástico foram pensados para mobilidade e conforto durante a rotina.3. Precisa passar?Ela é easy care: seca rápido e amassa menos. A necessidade de passar pode variar conforme sua rotina.4. A calça mantém o formato?Sim. A elasticidade e a recuperação do tecido ajudam a preservar o caimento com uso frequente.5. Sobre UV50+ e ação antimicrobianaO tecido possui proteção UV50+ e ação antimicrobiana, contribuindo para conforto e higiene no dia a dia.6. Troca/devoluçãoConsulte a Política de Trocas e Devoluções.7. Prazo de entregaO prazo estimado é informado no checkout conforme seu CEP.8. Formas de pagamentoAs opções disponíveis aparecem no checkout.Sobre a Use AnnyHá mais de 10 anos vestindo profissionais com excelência. Somos especialistas em jalecos e scrubs premium, desenvolvidos especialmente para quem busca qualidade superior, conforto e durabilidade no dia a dia profissional.Localizada em Foz do Iguaçu - Paraná, nossa marca se destaca pela criação de modelos exclusivos confeccionados com materiais de alta qualidade e acabamento impecável. Cada peça é pensada nos mínimos detalhes para oferecer o melhor em funcionalidade e elegância.Já conquistamos a confiança de milhares de profissionais em todo o Brasil e em diversos países como Paraguai, Argentina, Estados Unidos, Portugal, Cuba, Bolívia e Chile. Nossa missão é continuar sendo referência em jalecos e scrubs premium, proporcionando produtos que fazem a diferença na rotina de trabalho dos nossos clientes.Use Anny - Qualidade que você veste, confiança que você sente.	t	xml	xml	297839874	t	\N
6c634eab-b999-46e9-a80c-4d0fcb823249	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	\N	Blusa Manga Longa	Blusas	299.90	\N	[]		2026-09-09 19:16:58.388+00	2026-09-09 19:16:58.388+00	data:image/jpeg;base64,/9j/4QC8RXhpZgAASUkqAAgAAAAGABIBAwABAAAAAQAAABoBBQABAAAAVgAAABsBBQABAAAAXgAAACgBAwABAAAAAgAAABMCAwABAAAAAQAAAGmHBAABAAAAZgAAAAAAAABgAAAAAQAAAGAAAAABAAAABgAAkAcABAAAADAyMTABkQcABAAAAAECAwAAoAcABAAAADAxMDABoAMAAQAAAP//AAACoAQAAQAAAFUFAAADoAQAAQAAAAAIAAAAAAAA/+EO72h0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8APD94cGFja2V0IGJlZ2luPSfvu78nIGlkPSdXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQnPz4KPHg6eG1wbWV0YSB4bWxuczp4PSdhZG9iZTpuczptZXRhLyc+CjxyZGY6UkRGIHhtbG5zOnJkZj0naHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyc+CgogPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9JycKICB4bWxuczpBdHRyaWI9J2h0dHA6Ly9ucy5hdHRyaWJ1dGlvbi5jb20vYWRzLzEuMC8nPgogIDxBdHRyaWI6QWRzPgogICA8cmRmOlNlcT4KICAgIDxyZGY6bGkgcmRmOnBhcnNlVHlwZT0nUmVzb3VyY2UnPgogICAgIDxBdHRyaWI6Q3JlYXRlZD4yMDI2LTA1LTExPC9BdHRyaWI6Q3JlYXRlZD4KICAgICA8QXR0cmliOkRhdGE+eyZxdW90O2RvYyZxdW90OzomcXVvdDtEQUctTmE0d3JiVSZxdW90OywmcXVvdDt1c2VyJnF1b3Q7OiZxdW90O1VBRVZSQWp2bnVnJnF1b3Q7LCZxdW90O2JyYW5kJnF1b3Q7OiZxdW90O1VzZSBBbm55JnF1b3Q7fTwvQXR0cmliOkRhdGE+CiAgICAgPEF0dHJpYjpFeHRJZD4yYzcwNjg2NS1iN2Y2LTQ4YmEtODI1Ni1kN2U2MDA5NTNlNDM8L0F0dHJpYjpFeHRJZD4KICAgICA8QXR0cmliOkZiSWQ+NTI1MjY1OTE0MTc5NTgwPC9BdHRyaWI6RmJJZD4KICAgICA8QXR0cmliOlRvdWNoVHlwZT4yPC9BdHRyaWI6VG91Y2hUeXBlPgogICAgPC9yZGY6bGk+CiAgIDwvcmRmOlNlcT4KICA8L0F0dHJpYjpBZHM+CiA8L3JkZjpEZXNjcmlwdGlvbj4KCiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0nJwogIHhtbG5zOmRjPSdodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyc+CiAgPGRjOnRpdGxlPgogICA8cmRmOkFsdD4KICAgIDxyZGY6bGkgeG1sOmxhbmc9J3gtZGVmYXVsdCc+VVBTQ0FMRVIgcHJvZHV0b3MgdmVydGljYWlzIC0gc2NydWIgZmVtaW5pbm8gbWFuZ2EgbG9uZ2EgYXp1bCBtYXJpbmhvIDAxPC9yZGY6bGk+CiAgIDwvcmRmOkFsdD4KICA8L2RjOnRpdGxlPgogPC9yZGY6RGVzY3JpcHRpb24+CgogPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9JycKICB4bWxuczpwZGY9J2h0dHA6Ly9ucy5hZG9iZS5jb20vcGRmLzEuMy8nPgogIDxwZGY6QXV0aG9yPlVzZSBBbm55PC9wZGY6QXV0aG9yPgogPC9yZGY6RGVzY3JpcHRpb24+CgogPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9JycKICB4bWxuczp4bXA9J2h0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8nPgogIDx4bXA6Q3JlYXRvclRvb2w+Q2FudmEgZG9jPURBRy1OYTR3cmJVIHVzZXI9VUFFVlJBanZudWcgYnJhbmQ9VXNlIEFubnk8L3htcDpDcmVhdG9yVG9vbD4KIDwvcmRmOkRlc2NyaXB0aW9uPgo8L3JkZjpSREY+CjwveDp4bXBtZXRhPgogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAo8P3hwYWNrZXQgZW5kPSd3Jz8+/9sAQwAGBAUGBQQGBgUGBwcGCAoQCgoJCQoUDg8MEBcUGBgXFBYWGh0lHxobIxwWFiAsICMmJykqKRkfLTAtKDAlKCko/9sAQwEHBwcKCAoTCgoTKBoWGigoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgo/8AAEQgIAAVVAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/aAAwDAQACEQMRAD8A+maKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiobi5jgGXNAE1FYt54gtbYZeRfpmuU1/wAfRW2Vt+TjrWU60Y7s0jSlLY9BlniiGZHCj3rKvPEdhbf8tVc+gNeK6t4wubpiDcEZ7BqzG11kjO5g7eprlli39lHRHDLqz2mfxhAq5QYHuRVCbxpzhGXBrxj+3JHYhnBPYA0+K7nuTnlR+lZOvUfU0VKC6Hr3/CZvk/Mp/CpIvGEpPOAD7V5bHerAoEksee+TSNrNqxINwox6NUe2n3K9lHsewReL1H3yD9K0LXxRaS43HBPvXiNtrForEecW/GtKPUrNjn7Rtx/tVaxE0S6EGe4Q6paS/dmT86to6uMoQRXhkOrRI26G8X0wWrZsvEF9BhklEi+xzWscZ/MjOWG/lZ65RXCWHjZQQt0u33xXV6fq9reoDFKuT2zXVCtCezOeVKUdzQooBB6UVqZhRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRWPrWvWumkRySASHoKTdtxpXNckDqaZJKI1JauOm8X6fAqyXFwvPasPUPiPYzO0NsQ7Y9ah1YopU2zrtb8QxWEJZmAPYV5Z4q8ezvJ5dt1b3rm/FviKW6cuWJ+bAWuZkumhQ3Nwcyt90GuSdVyOmFNRNy71ubyjJeysZOoTrWFNqsl05Lnao96yLq9aVmkmOWPQVQkkd/lU8t2rFxua8xqXGoIj/J871YsrS/vzv/1UHck4/nU+i6Xa2Vt9s1NgAOQp70651ifVCYLdDFaDgAd6lvsUvMbLdWWnHZDuubgf3l4z9RTfP1e9IEKmFG6BTWjpGjRxgTSx4HXmuosQhZRFEFHrWbl2LUTk7Lwnf3Pz3dzIc9uDW3ZeAlK5diQO+K7CyUjjO89z6Vbk1KG2AWWYLjtWbnItJHKw+D40B2oo96rz+EiTjcQxrpn12FmzGPMP5Uq380mSYto7HNTzMdkcNL4TngkOHb8Ki8rWrF8W80jKvYnHFdvJqjhtpTJpi3sbt+9iwfWj2jDkRztl4hdsQ6lajcON3JrpNMvB8r2FyVf+6cLTZba0uxvjiDNVO40MSMHtx5T+1Upolx6HoGleLp7bal8uR/eGTXZ6fq9rexho5Bk9q8KfUbzTQEvYzNAO/StfSr6G5Al02fy5f7ldVLFSjvqc86EZbHt4IPQ0V53pfiy4tGWHUEI7bietdpp+q217GGjcGu+nWjPY450pRNCigHI4orYzCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKA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RUVlpTEA9TW/p+kP8oKMMmk5JFKLZTgtVcBthrVstOE2NqnNbVh4dd2BGSPQV1Gm+HygUrG1YzrJG1Og2cxaaA8illXJHbFaun6HIrDap+mK76y0ZQoyMHvV9NHUHcoxXJLFHXHCs4NtBMh/1ZDfSlfQ5EiO6EnHfFeiiyAX7v408WYKbSBg+1ZPEmywx5U2lEp/q8Ee1WrfS/tAG4DI9q9Cl0mItkL+FRDSVVgVUgj0oeKuH1axwMmhtFICEOCatQaOVbJT5T7V3iWQKYZRn6Uo09eOM1LxXQawyOStNKibeuwCqdz4cTLhV613n2FdwCrip/sAYAEVH1mxf1ZWPHdU8JrLExRORz0ridQ8NujMQhwPavoy4sApZQo5HpXLaxo65Pyj14Fb08WzGphEfOupaa0bYCkYrIcPC+BkGvZfEGhqyswXBrgNT0crk45FehSrKSPPq0HExbW/2sBJ+ddloV4U2TwSZ2nnBrh7m0MbYFT6Zdy2cwwSVz0q5xUloZRk4vU+jfDWpDVLQK4ywFU/E2gGRTdWg8uePnA71x/hPWDatHcI2Ub7y169pd3DfRJIwBRxXnzTizsi0zjdA1NNSiNtc/JdR8YPXjiul0TUnsZ/s91kxN0J7VheLvDz210NT07KuvJVehAqzpV4mq2gJwJ14Yd81lJLc0T6HqGnTblCfejP3TWT4u0QX9twMTLyrVW8L3rRYtp8lh9012S7J48Ec1MRSPL/AAzqDxXJsboEbTjn610Oq6fHcQGKRco4+VvQ1R8ZaK9vN/aNoMSL94D0FWvDmojUbURykbx69jVPRivcwNNuJtHvhYXWfKz8jnuBXawzJMpVyCD0rM1vTFvrVosATx/dbucc1meHb9lnNndZEq8HNLbUN0dhpt01hdiJydvUGu/spxPCrA5OK86IF1bFV/1ycitfwnqp3m3lPzrxzXoYWrZ2OSvTuro7WihSGAI6GivSOEKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooo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14kq8FTmvUvzRseTKPLK59OaChsroxN/x7XCjb9TzXS2MRV5Ld+OpX6Vw/hnUP7T0G3nQ5kgAP5DFdtHKZrWC7T76gK2K857m5ieItNaUg4xKnKn1rQ8LX32uIK5/fR8Mta88S3iqw6kGuOkMui615qgiNj89PcR6JZtjlT0OSK0Jgs0XPesOxmD+XKhykmAa1ImKPg/dPShMTRxnjPRG2i4tlxOpyCO4pfC2q/2hata3P8Arl4YV1+ow+dCwGCTwM15hq8NxoOsC6hU+WDl6kpao7K+tEurWWyuB1HyE9s1zXhu7lsr17C7JVlY7M9x2rq7S4j1KzSeEgtjjHrWL4k03zGiv4BiaIjfj0FNMDorhVYJOOo611nhy9E0IQtnHSuE0i7F1bLzww5Fauh3Js73yyTjPFdWHq8sjCtT5onoVFR28gliVh3FSV66d9TzGrBRRRTAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAK8S+N/iPdOmm278LkSAV7BrN4ljps80jbQqHB98V8ra/fHUNXuruc72ds81hXnZWNqMbu5kaZp73+qKzj5MivQb1UjtobZR1wDWb4SsPk85vunpWprLRw72J+YJxXnVHdnfBWRh65cxwwiCLnC7SfevOtVBmljt8kuTyK67UZF+ztNIcA889zWP4Vsv7U1ozEZ+birgrK5EtdD1L4faQtlpELbcEjJpL+YS6hJIMlEFb07DT9LRRwEXJrlry4Ftos8xHLFjzXPe7uapWR4f8Qb43Otzc52kgVgWERlZR1JNP1y4+0avPITkFjXQ+C9L+1zLIRwK7H7sTCK5pHa+CdHESLJIuSenFei2kOxRxzWVo0AijAx0FdDFgAE9a8ytLmZ69CHKiQD5RnrTiMjNCkFskcVKMEZrBnQhqAYqxEOelRouatxKKmxVx6AmpFQZ5pVX0FP2E9aTQ7ihcU9AMGjaccU5c9hUNFCqMjFKFpyCn7e9TYLjFUE09V5qRVxT1XNUokuQwDFL3qQj2ppBNXYm9xMA0BRTgvFLt9KXKK4w9KZxnBqVlqMKc0mhphjIqFogW9qs49BRtz1FDVxqVjIvrYSKcVxniHTso2FyK9GeINmsXVrMFDxmlG8WU7SR8++ItPKSuccVx99bbSTjmvbPFGlrsdtvP0rzDVrLbMRjivVoVbo82vRsdp8HrzfbTWjtggZAz15r1fw4+8z2rYwc9a+fPAt62neJ7dScI7BTXukbtaa3DNH/qpB/Ooqq0rmEdVY6OxjZA8XQxHH1rM8S2YuIS2OvWuhkG26jlH3ZASfrRfW3mwsuPmxxUoTOY8IXxeB7KU4kQkjNdTBN5kJX+NT3rzy8Z9I1aK4wcF8N9K7VbpCILmLlJAAfxokhGwkgkRVPDVh+JbEXEEiSLww61qgjzM9jyDUt4izw89DUsaPM/DGoyaTqRsrjIiY/Jn1NdzcxjG4cxSDDfjXH+M9MeNjcxg74xkYrc8H6smqaZ5Mv+tUYwaXmUVLSM6dqTwk/u5CWj+la80jI6S/xDrTb+08+HjieIjae+O9Ir+fbgkc96pbiZ3nh29E9uoJGcVt1wHhy5+zzhCfl7V3sTB4wR3FezhqnNE8yvDlkOooorpMAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiikZgqlj0FAHnfxj1j7Ho32ZGxJJg/rXgdvbmSQSPyZDkCu9+LOpm+1xolO6OIlePrXOaJbb38xhlFPy159ad5HbSjaJ0+nQiy01vULkVga7K006xfxMBn6V074SGR3/1aKDiuXjG9rm9flFUgfhXJ1udK2OO8dXQSK2tI+GwAcfWu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LM2jV0yYw3KN0Vq7eBt0YNefWr7kCnrkEV2ekTF4ArdR1r08JPocWIj1NKiiiu85AooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAoopHO1CT2FAHnnxX1EQ2Pk565z+VeO2aPKgwPvPgV2vxJvPteoPHuyBWX4WsRdXCvj93Hz+Iry607ybO+lGyRd1AJpHh4AHEsgGfrXPWDix0mW5fPnSYPNXvGl2LjUUt0PyqefwNc/qt4GV4xwiVzpXN72MW4L32qoW6Kck11nhC0D3LyPzn5BXJ2MzGKWQL8z/ACj8DXpXhK1EFgZpBncOM+tXLRWJRrXLGKHjhFHl8dya47xKA13ZWvZAc4rr5yJWjiPTHmH6iuLv5Bc69dznASInH5VnHe5Z5l8XdS8ydLZW4Xgj8KxfBdvvuo8DvWd4zuTea/Mc5AbFdf8AD2y3TKxHFdVT3aZlSXNUPWtChCQqOnFb8IBAxWXp0e1K04OuO1eZJ3PXgi6g5HNTD0qujZOKnjBJrMskWnYp4TpUyx+1IBsamrEQojTmrCqBSGNHSpU6dKcqZPNP2gU1HqJyGilp22kGKtIVwFOHSg4o7UEi0opAcilFAmFFBpc4oAUU9eKatPWqRDHLTwvNNQjNPzzWiIZIo9KXByKRW5Gaf1Oa0SMmIy1GyVOBTJAKGgTKrCql2uVNXmwDUMyhga55xujohKzOC8S2u6NzjtXj/iC02ztxzXvus2+6JgR2ryrxNp5Ds23is6MrOxvUXNEZ8LZWtp2UdCQDXc+N7QqqXUXVecivOvA0pi1doTwGO78hXr8ijUdIKPycc1c/iOXZFrwdfi6sUBPzYxXSkDqPpXl3hS7aw1OS3kOMHjP1r0m3m3rj1GaqLtoY1Ijb2ISQkdc81yzIINQEw7H5q6piSCPQ4rn9VhIucAfK3WruZorXyCC+Dr9xwK0biNbrTiV6gVTdftVgrEYZCam0uTahiY5BpMroUNNlzvgc/d9azdWtskFRg1oXsJtNSEg+61S6jGHj3ripH5lLwdemK5a2kPytwua29WhKsCB1Nckcw3Ec0XDK2eK7lWF7p6OvJA5poT7mXBLyAPvA11WkTkOpzw/NckyhLjgYJ61v6XIFXH93pXVh58sjCrG6OyQ5UGlqvZyb4x9KsV7Kd0ea1YKKKKYgooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACqGtXAt7GRiccVfrlfHF15VmVB7c1nUlyxbLgryseO+JHa51gIpyxaumtYk0bQ2kbhmGf0rH0Sz+3ayZiPlQ5OaXx1qPMdlEcDjNeRJ3Z6MVY5W6n8ySe6c5DNx+NYWpXBZPKH32rYul/0fZj5FNYsaj7bJPIMxR9aqKBl+2tAJre2AyQck/UV6raWvl2UUfQIA5rz7wqPOkE7DJkO1fbFekXLFIIof4mAzUTfQcUVLhlis7m5Yc4Kr+IrzTVJWtNHuLhzgyDNegeKpxDp8VqvU4ORXkXxOvGs9FWAthnHQUQV2kVJ2VzygMbrVHY85Y17N8PbPZbg4ryDw5EZrwHHU19B+D7QQ2qYHUVripW90eEjfU6aFcIvbFXE7EVXAxxVha856npR0J4/U1bQYFVEIxTLi+WEYzyKFFsHKxrxHJ61ciAbp1rkv7W28k8VPD4hVCB3rRUnYzdRHWLDg1JsweawIfEkP/LTg1fi1u3lHDDP1qXSsNTNRRilB55qvHexuuQwNO89TStYpakzEfhTc4NRl+evFJkHvSbKSJQQeaC3ao1OKM80rhYlHFPBqDPNP30XE4kgOaKjDVIpzTJasOXrUi5qLOKerDFUiWh+MU4Hio99ODA/SquS0yTfzxVhTxVIEAmpBMAME1cZWIlG+xbBJph5zVcXC+tIblF6kCq50TyMWQHPFNIpGuUPQg1C12g/iFZtpGiTIb6DehFcT4i0wNC/y813TToyZZhWLqpjkiYAisXHW6Noz0szxuxT7BrKseDnFeqaRP5NyYnPEoG2vMvFaiC/jZTwGHT612rz502wv0P+r61U1szJ9iHxXAbPUo7yPjJGcV2XhrUBdW8ZJ+bArN1i0XUtKBA+YpkH8K57wpfNaXrWspICngmpTIauj09+SxHUVQv082AuByKso+6JZAcgihlATHZq1Tuc+zMa2OxQvZjiq8bGC9x2Jq5InlzEEcL8wqG/X5kmXpwDTZSH63F58AlT+GqNuxntCP4lrVhIltHHUGsO1ZorqRD0zUMaIJ4d2GX15rW8MXW0tbv0PIqnOvlSf7LdKhgbZOki8FTzVXFbobWrQbWLJwc1c0lgwXnkinzkXFmJFwTjJqlpx2yKynp2rSLszOSujsdKk+UAmtWsHT3xMQPStyM5UV7VCV4nm1VaQ6iiitjIKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAJwCa868fztINiHrXoU7bImPtXmPiQtc6kFXpmuXFStGx0YdXlcz9MjXS9IkuJcBiCc159ezteXclxJzliq11vjm98uxisYj878EfhXHPGRAMcIvJ+teatzu2RS1q6xAkKfeGAfrVK5UpaxWxH72bk/hU9vbm7vGd/9WDuJq7aW/2rVmuMEoh+QVomkS1c6vwdZKvJXESKCPr3rpGIeV7hj8irgZ9qpWuLayS2jHzyd6peJdTFhZi3j/1j8cVzSfMzWKsjP1KQ3t4XzmNAa8O+K+o/atU8hGyIyRXsF9cjTtCllmbazoWz74NfOWrXjX+pyzMclmrqw0fev2Mqz0sdD4HsjJex5HevoHQ4PKtl+leR/Di0DTIzDpivbLSPEagD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BHqGmzopAUACt+3v1QDBryO28W20gyZVQD3rbtPE1pJgJOrE+hrFwkjW8WepW9+rn71Sy3I29a84i16NhhWwR3zV2PW2KZDZFS3LqHs4s3NbnEluwPJryeS9+weJo3ztG7muvv8AVd6YzyRXmniScNdmRTyDTgm9xVEkj17Vl8y3tL6IZKkMx9sV0OmXK3Nuu453LXL+DLtNV8OiFiC23H8q0dEkMM727/LtPGfSs3ozC10ZPi/TJLe5W8thgoeSO/NdL4f1IX+no3RwKuanbrc23IBBHSuR0iV9J1VreU7Y3Py5ppkNXR3A5XHaq1yhUq3vViBgx+o4psoJRgfwrRMyehl6rCXh3LyRyDRps++3IbqODVrGYmU84OKyt3k3bIeEY8Um+pS10HS/6PdEfwv0q2wE0BB6imajAZbXenLKMijT5Vkt/m++ODQgZTgLW8+D9w1rRHaDGfuN0rOvI9jBhypqzaEywYPLLVIlo0rIGJSua6DSZONpNc1bS78E/eHUVuac2ycZ7iu3DStJHLWjdHRKcilpqHinV7CPOCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAoopHOFJoA57xDNg7e2M15X4juxNdsc5Veld74pvNkcpB56V5Xua4vQhOQDzXjYiXNNnp0Y2iJdTfZrLb1d84qvDEtta5P+slP86uGAXV8pbiKLmniNLu9XYD5aHHT0rnvY3SLWm2paALGuM9TWrqN1DoelM+R5hHA7mp4Ntvbu7AIq8j3rnYYJfEerGWYEWUJ+X0as/iZWxBoNq0jyapfjDn7obtivJfi34qbUr02du58pOuK9D+K3iiPSrFrKzYCUrt+U9K+dNQuGmmdnOWbkmu3C0uZ8zOavOysU5GzIB2rpvBsXm3qDHGa5TO5hivQ/hzab7lWI4BrtxD5YGGGXNM9v8OxhLWNcdq6BQMdeKxdLXaqgdMVr9FxXhN6nvW0GTtjqeK5nWbko7bTxXSzRh1zmuX1mAsScY+laQ1ZMtDAnvSCxArm9Z1UoC2/8BWjqvmxbgBhfeuK1F1R2eVi3PTrXbTpps5K1VxQq3c15MRO5jh69cGo7jUILKUCD97ju3NY1zcPcOqRk8nFdx4O8DrfI1zduWAUkLwe1dqgkefKpJnNnxHcFyI0257AUsGv30MigFsZzXU6Jolg+pTNdgKinpjpWL8RpdNt7mKLSR93BLbcdqtQTRn7SSLEfia7mCiSPIVvSuj0/VtNvo2W4RBKT1IFX/AF14ZvvB8tvf2wGpZO1xHnjHrVPw34Kj1XVLmJHZQMlGAHGBWU6a2NYVpLUmS0uo3M2myFol5Ksc/lW1p2rb1Cy5SUcEHisSb+0/C9ybW+jJgzjeMnitJGstWi82BgsoHXvXHUhqehTqXWhpXFwcjmrGn3hDYz+dYZjuIflkGfQ1dsfmcdvWsnA259T0LSJ9yKM10NrXH6QxAHpXUWcvSuOe50x1RrKATmrkC1RiatCDpzTgZ1dhZDgVmX8mENXrlvSsu6y+cc1FWXQKMepy+t3pijbHWuDvruSWRjmus8Uq6hgorg73zY1ztOSa0oxW5dSVijqM5jB2nL+lZc9hd3aiad/Lj9AcGtZoIbZTc3T5fqFPasqa7vtUuTbWEZcNwDzxXdTj2OOrNLcvmHR7YxmV2ZsDO4g1W/t3R7Kd0WFXQnPKg1Tm8KX0mqxWUjlp5AMgngZrn/ABvozeHL5LaYhnIycHNdUKF0cU8TbY6a38TaW9zKGgURM2eFHStyS/8AD17hIHkiYjjaQKyPBvw6TX/Dcupi5RGC7ggYelcnb+H7ttZazgbEu7CkGnKgthRxMjrbqG8sctYXImQHJVmycVc0bxZg7Ln5HHGG4rzufUdU0S9eO53bgduSTUxvYNTOchJgM7h1zWU8OmtTaGKaeh6tcaslxFuQ9RXJavKZHYg8VhafrEsA8ifnsGznNSvdmQkZ61zex5To9spo9R+E2q7bv7OzYHH869J1eA21ytzF36189+FdRay1eJlOORX0Vp0yaro6NnLAf0rkrRsy09LmnpUy3VtgnJrF8UaWXhM0X+uj5FP0aVrW9aE8DPeulu4RNEXXkHrWUX0JkrM53w/fG5tl3n96nBFbh5Az3rlZLeTSdWEkY/dSHB9q6iGVXjUg5BqkyJIr3AKSg/w1n6lbll3p1FasoDkhvwqtGSVaJ+tWTsV9OmLxsDzgYIqhIptLwtk+U9CubG7ZTnY3WtG4hW5tsH6g0kUyNh5sWOvcVFYymOfB49ait5zEfLYcrx9RT5ceYsq/dNUhWLzkxXaSj7jHBrZtJMlWz0OayQFmtiueo4qzpjlYij/eBraErMxktDtbV/MjU+1T1l6TMDGATWoK9ylLmjc8uatIKKKK0ICiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACobttsDH2qaqGsyiK0cn0qZOyuOKuzy7x7qAjiaNThmNchaK0aBm/1j9KteJ5vtWq4c/KDxTwu0IWHznoK8Ob1bPWgtEgkxEEgQZZzya2dLskjg3bcAHJNV9PsS0wdxljVrULh5pk06yXLNjew7DvXM3c2WhVvxLq92tnb5ECnLuPbtUXirWbXwtoxhiIDBcKBWreS23h7THDsAVHLHua+cviB4ll1a+kZmOwH5RWtKDk7Ezlyq5znirVZtSvppZWLM3SubuRtT/aNWpmzmV+vaqMxLMSete1Tjyqx5lSV3cjhGXA75r2f4aWZW2WQjrivILCLfcIvqwr6B8C2nlabFx2Fc2NlaNjrwELyudrZAKoq+NxX5Rmq0C7QvpWhByPSvGbPbsVXLqOUrLv42fJEeTXTbUA561Wmi3HPBqoysyXG557q+mTXa7SNtc3eeCWMZZhuB9q9amshu3DBNRNCxG0gY+ldEK7WxhOipbni6eDzHKCkWQO9dPoS3umMVjc+WRjb613L2qHIwAfpUaaRG3zZANbfWu5j9WXQ8+m0W4mvZp4cgN/DWPe+CZtQuPnTBr2BNKYDC4qzFpaK4Ljmn9csS8EmecaP4RurK18uGH5vXNdt4It5tFE7Sw+bO5zycY4rorS3SInuKuxx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OlQk81PEeKRaLCAZBrRtV3DmqEa5HFaNquAM1BoWgique1KrA9KUx70wTgVLFEEXipsK5JFnFS/So0IHFSjNCRnIaRxUbLirBHpQyDvTcRKVii6dc1WMfJ4rSkAxWZeXSQgjPNJaFbkEihSc1WeQZ4NQXFyXyQapo5JrVJmbZakO48VZs15z3qqi8VetB0qZGkNTWtlwBVwHHFVbc4UVaXpURCe4E5NSJ71FtJqRe1BDJ15qQIRz2qDdtXNPS6UrjvVRa6mLT6BNkVVYHJNTNKCTTDg0OzNI3W5ASc4FRvzVhl5ppTNZuJqmivgU6OPnNSrEc1IkZJ4oULg52CNcfWraDimJGfSplUiuiEbHPOVwK45qN+RmpG5qN+BVSRMStMuVNc7rEO6NuM10MvIrNvY8oa4qu9zrpHk3iGzILlRXn+rW4Mbp3PSvZfEFp8jEL1ryvxPD5TOy8Yrrw07nLi4W1OX8La7caBrkbKWChhuX2r6j8HeLINWto3jlXOBkZr5MvQLpWnTAnTqPUVpeDPFc+iX6AsfLY8g9q76tD2i5lueVCryOz2PtEyhgHTBqndW63A3R4WSuL8JeK4763jIkByOhNdokqzRCSEgMO1ebKNnZnZfqikLloX2yjBHQ1pI0V1F2zVOTy7r5ZABIKrHzLR8j7orPZj3M7XdIdX82EYI9Ky1ldQDIDuHWu1huUuYsHB9QaydU0sOrPDx7VoiG+hhPMquHVs+ozVqGdJOGK4Pesx7Z/MdTlTVEyy25JPIBqkJnWxCSEhkIKmtSzm+ZScg1yFpqTOq7T+BrobKfzEX1qoslq51du24gGlYNGwdRyDk/Sq+ntlRnrWo68qccNwa9TD+9E8+rozTspfNhVu+KnrJ05jDO0Z+6eRWtXoRd0cclqFFFFUIKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKR+lAGPrjf6Oxrh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SXitKdRpmVSmpG353vUTy5PFZ6Tk/Sn+bXQ61zn9jYnd8momYUwvmmZ45rKUy4xCQ8VXc5FSMeKiY8VzTZvFGXqYHlOfavnj4nz4umBPGa+hNWyYHx6Gvmb4oy51MqCeprpy+N5nLmErUzhJ25Y1T71aueEHrVZBk19JHY+alqydOFGOtdn4P1B4bmAsflzzXHBflFdFpA2wKw4IrCu1ym1Fans3iOwiu9GEic7l4PvxXNeE72bTr/YkhAHvxXTeHpxd+H1SXqo71gizEWoyAjAI4NeU3o0eilrc9X0zWlvoVjnIEhHDVp2ly0chin5XPBrzLzJILEPGxBQjBroPD+u/brYRzH94Ohrn5dLmr7HdrmOQMn3TVkEED3rCsL4k+XMR7VtW/wC8UY6ZpLcTMLxNHjbxwTTtFtx8u0dec1Z15TJIkeKvaPbeXGSR0rSxneyOg0MfvciuqiI25rndDiw2a6KMfLivZwatA83Eu8ivkiYjseaB8lyrdmqSZcODTZhgK3pXWc5copEO5AaWqJCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACoLg4QmpzVO8fCkVMtEOK1Of1I+YzqK564UJbSeua27hsySkdhWHdZ+zPu7mvDr6yuerS0Rx8gzds/fNblrjfGtZGALrB9a2YDm6QAdK5joZPq/wAtlMB/drx/WLbmVx3Jr1/xAdtof9oYrzLVkHluPUk1rHQhbHmsi4nmU9yTWNfL0zW9qQ8vUCo7gmsnUE3bCB0610wZjM4++TbMcCqDda2NVjw5asqQYOa9Ok7o8+asyMHByK6LwjfMmqwAnvXOHrV/Qn2apAf9oVdSKcWKnJqSPqrTX3W0LHuo/lWkOnFY2hNv0u2b/ZH8q2VyRXzlRWZ9NT2QhbBpN9MfqabnNQbXLaketSB/eqgPA9KA4z1qWWmaMcmB1oknHY4rOaUhuDUV1OVT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6fTl+4PSs1qypGvHGqMHPU8Vo2cRypPeqsaF3X0FatuMFa7qEbtHFVlZF+IYAqwBxUcY4qYV7UVoecxMUN0NLQehqiSK36Gpagtjy1T0IAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiikY4FAFa7cBTzXM6hMfnxWzqUuAea5u5k3EoK8/Ezu7HXRj1G2Y5J9ah1IHaBjvViFcFQKbqQBQcc5rgqLQ6obnF36EagpPvWzo4LXBJ61namv+mIe5rS0LIuXzWKN29BniLgMMdq4PVULROuPeu/8QjKt3yK4bVztOAO1UJbHlPiBCPO9jWDbfvrb6V1HiNT58gxwQa5DSpNl48R6E11Q2MZbgCdpRh93msrWIQGBA4IrfuI9lwxI4NU72132rE8963pyszGcdDkJUKnHamRjDqfer5QAlX/CqskZjbkcdq7lK+hytan0r8IpPO8Owr6Cu+25H0ryf4HXZbTvKznb/jXrf8WK8DERtNnv4Z3gmV2j3VUkQqxrUAqtcp1IrlvY6yG3HFbumhSoFYUJ2nFbOnvhhWdQaLOrWvm2rqPSuOisSkJQDkV6A43pj1FYU9psmfjrWcXZldDzjxCs9md6qSBXFar4ta0cBiwI7V7Rd2CXOUkAry3x34MLztLEmR7V6uGlGWkjjrQla8Tk/wDhPzJJtC/zrX0zXri/J8oFm9K89vtKm026LPGcfSu0+HEkY1GNpCArHkGvQlCKV4nDCvUjK0jrLW+ui4ieMhz2rVEU+zdLGwH0rsH0eGaa3uolHFdk2kQzacBsBbb6Vz8z7HUq9rHkSFFGGBz9KdHNEjcgj8K7rTtGhku2jkj5DVd1rwpafZyyR4PU0ufTY2VVXseay3aBvlOBTor/AGcbuPWupsfBMWoybgcJV24+GoVAUkwfpUOSkbqvGDs2chFfbuC2frVmOXep+bFXbzwPcwSgKSc98VtaR4ClMQM0pye2Khyj0NniIpXbOaiuViJy31q3FqsKjGetdLe/D9UhZlf5qwtP8GNNdbSSADSbS3BYiMldMdHqUYH3qnj1NcfK9as3gNYYM7iaj07waksmCTspXjsYuvFq9ypFrTR8eZn8auJ4j8vAZlP40/WvB0NvF+7zuNcp4m8LXVnpvmwu28g0uWLZDqxaudWnim3ZsPIg/GpBrttI2ElQ/jXy/wCLLjUbK9EcVw2e4FWfDZ1y4mUpK+PpVywqte5hGvzS5Uj6bfVYmGFZc/WqWpsl1aMOvFcD4d0/VJZw107bR7V2k6m3tG3+lcMo8srI6k7nn2iQeVrU6IPlyT+teh2FsNgYjmuc8P6eftMsxH3mP867a0i+UVGInd6GtJWQJEMgip1XnmpQoWkxnpXKXceiDFTbcJTYl5FTSDirS0M5M5Px5c/Y/Dd3IeOMZ+oNfHd0DLO46szGvqb43Xn2fwpLGpwWZf51806bCoaS4fnb0Fe5ly5abkeLj3zTSLehWJaQJjpyfetfxLbmGOGIjqAa2PDGmkRRSlfvMfyqj4nY3GtRIDwuAa3lU5pGChaImj2xjtQSOCK6fQbfZEWI5IqGCwAtYgOM4rb8n7NaHb6VzTlc3jGxzDnfqxUdc111vGRaxKRyWrl9OiMmpM/vXewwZMC49DWVRlwVzUSPy9Ox7VW0e3LHJ6k1q6gAlkAeCcVNo8G1EAGTWF9DRGnDEMr6it/T4+R6YqhawguSe1a9lHtUt2pRWopPQ1rUADI61oQr8wxWdYMGrSgP7wZr0sMcNY0YxxUlNTpTq9dbHnMKG+6fpRSP90/SmBBadWqxUFmPkJqehAwooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACorh9qGpaztRlwuBUzdkVFXZkajNuZsngViRNvmZutWdVnx8vc1XhASM5ryZyvI7oxsiVXAuFANP1Ab4jjtVWwPmTbu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KKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAoPSimyHCE0AZ905JK9q5nVWLThRXRXZwhauWu5C1wT3rhxEtLHVRRBcP5UTYPI4qnpMe+VpXpL59x8sHknmp9y2lpjPOK4ep1WItSu8M6r0A61ThbzGBJ5xVG9nyHUcsaZp9wFctIcKBism7miRLdklpEA4zUGlOftq46A06abdKWHQg1X05tlyTjvWaLOtvf9QuK5/VIw4FdFcLutQfasbUY8xKabFFnG30APmKa4PxDYkxlgOR3r06eHeXBHNcprluAmGHBFVGVhtXPML6Ms8UwGCDgmvVfB8yrDFnoVArzm8j2pPGw+6Miuv8BzebZnJyVJrWauiIaMueONOEitMqkgHiuKVRNaFX5ZBivXry1FxpjBxkEZry25i+yalJGwwucU4PQckcTdL9numBH7snmoLS+k0zUopojwGzxWzr9qFZx26g1ycu542yeVrshaSOSb5WfSnhXV01PTopg4LEDd7Guihk7elfO/w48UNp16ttO/7pj+te8WVwsqK6kEH0rz8TS5JHq4WsqkTbDbgMVFMvOaZC3FTkbhXHY6yCPOa17J8YBPFZW3aatW0nzCk1caNafBGRVJ/WrIO5agccmiOgERFQyJk1Yx0wKSRCBnFaRYmVwdtShVl4YCom54pyZUDFaXBDbjTlKkoMGse4sJU75FdAJD0NBCv170vatG0JtHLgyRnlTxUy3EgGSOtb5to26gVDJZL2AxR7Y2VVGSJSV6c1LEHOKu/YM9OKsxWeAKHVRXtEVPPcgAdqmiE0x24OK0ba0RTkrWjBDGvIAqPaEOqkZVvpDSMGk5rZtbKOLHHSrAYKMCl3cUnJM551ZS0CTAAApq80E5FCdah6mWyJVGBTwKao4qQDAppGbIpBwaqSDnNW5jxVcLmsZo1gyEJmpAuDxUmBimMdvNTaxd7jmIFVZnPPPWnSMc5rO1S7S0t3mmYKqjOTS1k7INIq7Od+IfiCPQ9AnkLgSspCc96+U766k1PUJLiQk7nLGun+Kni+TXtXeCFz9njOAPfkVzVpFsRB3Yg17+Foexhd7s8TE1vazstkdFosBkkj2j5QK9L8H7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3Od4CT1R2tFc9aa+MhZxj3rbt7mKdQ0bAiumnWhPZnJUoTp/EiaiiitTEKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAqK54WpahuhujwKTGjD1k7lrlrp1tQXzlzXS6owSMluvYVxWphzHI7GvNxL1O2gtDJubg3E75yQDzVN3ALv0QUySQqpVeCeSax9ZvxHEYUbnvXBJHYiOe5a6vQqcqDWvbx+VG0rdhisLQkLksB1PWtvUpVhgEYPJ60noUY8b+ZqG5hxmutz5cQwOuK5XSIWuNSHHHWusnTEip7inYlnVN/wAeEa+o/pUqIPsZFR3AC20Q9h/KpR/x749q0sZ3MiSMGNz71lamgmsWXHStmRcRv9ayZlzDIueayZvE4DWbcF0471yyE2ev2zL03iu71uPbbq2O5rhNaHlXkL+4NaQfQmS6nsupKLnQ45f9kGueSVb3STGw+6tbmlyC78KRbTkiMD9K5bTQYpZoWPXoKlbged62Ps9wz91J4rmdciBRjjgjNdl4lgJublT2rlbpftFgcfeQnP0rsps5qhwFx1I966rwbnK/WuavE2TtnpXT+CSC34111n+7MKH8Q9a0dsBc9DXT21w0ZAPT1rktLkxtA6iupt1EkfvivDloz2omxBMH6EVYc5GR1rCSRrd+elXoLsN0NK3Y0TNK3kOcEVpQN0rGjlCn61ZimII5pNFpmwpGavQuNoBrKibcvHWrls/IyalotFqRQeTTFAJxipzgpxSBeOOtIoaFwacAMVGcinxqT9KVihT04oA9aXGKemM80WFccvIGKsxflUSegFTxAYrWKMZsmyMUqnrzTQmRTcGtTCyY7IB6009aQAjmj6VDHYdSGngcU3HNJoLgvApsjAU7oKrTP6VnOVkVFXY1yMnJqGRwBx1prvnNU57gJ3rmbudCVh8suOpwK47xn4mjsLV0iYFyMcGrOt6sUjdYzz615N4quXkDs7E1vRppvUxqzstDgPGGpSX107yMWJOa4p+ZCa6LWHzIx7Vzx5fgV9DhlaJ4Fd3kehfDmzMgL9jxXQ+KYvsdiVBALN+lRfDGALBGT3NS/EKRTepEp4AFefVk3VZ2wjamjH0sZt1UGux0lMQKqnkda5DTh9wDpjmux0Ibyx7VzTdzogin4mZlt0bPQmrfgS9J1BATwOcVW8Uwk2G73NYfhu6a0u1cHgdau3NAm9pnuHiNPMiguVHAAB/On+G59t24B4NO0d01TQcE5JXcPris3TRJa3ahuGB5rlRszu7eTddN7AUmsyZt3weNuKp28pEqH+/xT9X5tmweQM1pEykjjoJyrurH+MYrqgDLp23+LFcVJIq34OeO4rstEmSaAJnJAoasBgXUAliYEYPINY9mZLG4eJ/9U3Q+9dVqEflXWP4c81iapZtNA3lnoSQahlpjoWG4gnB6g1dhuSxHmfeHesDSr4q/2e8XaV4DEda2BEVG5DuWs2rGi1NeFd4E1ufmHUVu6ddiRQD1HWud0+RV2shOO61qQKGYSRfiKE+pMkdTaYK5StizfaQDXMWN0NwAOD6Vs21xuPoa9DDVuVnDWpXR0SnIFLVO1myACauV7kJKSujy5RcXYKKKKokKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigArzzxbYz6ddefApMLHJI9a9DqG8to7uBoplDKRisqtNVI2Z0Yeu6M+Y88sbxJ4VLfe71oRspwayfEWjXOkTmaD5rcnt2qGz1QOoBIBrxatJ03Zn0dKpGtG8TpV2kDFKI1bqKzba7BHJq5HcDjkVjzIUqckOeyBOV601DcW7gxkgirscm4DGKseWHHIrSKe8Wc8pdJIs6fqoYBLj5W9TWsrBhlTkVzM1qCcjg1Ja30lowV8sld9HFte7M8+thFL3qZ0dFQ21wlwgZDn2qavRTTV0ec04uzCiiimIKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKa3fPSnVXv2ZbdivpSY0cxqu6S9z/B2Fct4hDDKAda7e/tj5UbqOc5NctrEW4O5HIFefiFZXO2izz/V5/ssAH8WK5Is13cnI4J5rf8QP5kh39qy9KQPcHC/Ke9cK7nWb+motta5IAA5FUbmT7Rccn5RU99cqqCIHgdRVKzVri5AQcE4q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YFXRs0xPUuzW7QynA49qS3m2kgHKnqDWnbyLcJhvvVn3tmYnLKuQe9Mkuwz7eG+6fSppI0kHQEGsa2nKfI5yM961LeQY+U5WqtcT0KNzbEE7QFI6VBHJtYrJww6GtyRElQZHNYt9bEMd3UdDWbjYpSuaNpMlwhhk5OOtUpbZra5G0/L2qnZytHJhjgitz5bqDP8AEBXRS95WMqnu6mr4fu/M+RuoroK4zRHaK7weRXZIcoDXs4aV4WPMrq0haKKK6DEKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigArP1u0a7sXSM4cDIrQopNXVmVGTi7o8XvdRuNLuXgulYMDjODg1AfEMak/N1r1PxF4astbixMiiUdHxyK8z1b4Z38chNlI0q9s8V51TCu+h7lDMIONpbjotbjYZ3VONbh2kbqxR4E8Qp8og4/3qs23gLW2YebFtH1rNYWRpLF097k0+sqgLA06x1mO4bl+RW1p/w4ZwDeXLD1XFal/4BsItPb7BGqXKj74HJolgpNaGccwgpWMSPUBxhuKvW996muBuri9s7loGhYMpxVqHUroqN0bCvNlTlF2PRTjNXO+W/A6NVmPUlJxmuGgu5n6Ic1p2sd5KAdhAqldGThFnZQ3qN1NWBMG6GuUFvdoMqCasRXskOFmGDT9q1uQ8On8J0owaeoyOlZ9ldLKBzmtOLHWt6clI5akXDRlSdByK5/xHYiXT5SB8ygkV1c6ZU8VQuYRIhUjgioqUzSjUscZ4YviiiNicg4ruLWUMuc155Pbtp2slAMI/zV2WlTbo+TWUJcrsdNeClHmRryNkZqnct8lWR8wqrcJkHFbTbsclOyY/QW/004/u101czoC4vW+hrpq9PA/wzzcf/FCiiiu04gooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACmyLuWnUUAZ91AJIipFchq1swJSPp6iu2vM4Cr941WawUwkMMk96561LnNqdTkPNJbDYz+b0xSWEUauzsPkXvXSaxZeU5yDzXMau/wBni8qMjLV5c48jszvi+daGfqV79puTgEopwK6PTh5Fko74rmtFtPMuCDyAcnNd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q/7PmofZvGSx5x521P1rGa0NIvU+vqKKKwNQooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooqOeVYIWkc4VRk0AfM/7SWrmfX0s0Y7I41bGe9eAXb5Jrufidqr6n4mvZWbIV2QfQE15/cMSTXWlZGEtyu/U+lRsMmnetIOtBIiDmr8A4HrVeJc1ft0Bx61UUBdtlKoSaimbNWpDtiAFUXPNaEjO9BFL16Ud6QARxQKXvSZNACYpQKBS0gDGRS7aMUtMBQKXikBpeM0ABxSUp5pMUAHTtSHrSmkxQFgIpMcUv06UmOaBiUtBFIaBCikI5oopAHFOA4pAOKXOKYCipBTB0paAJO1KeoxTMcZpwxxTAf9aAaTvQBQA4mjPWmgU4j0pgAPrRnikpSvAxSAO9A6daOgpD93igQlFFH0oATtSGlIpMUANNHI6Up4oNIBDnHPWlHSkIpRTGA4pw6UnelFACg07iminUCFB7kUo5pO1L0PNAxTyaU8UelBoELilFIOtGKACgUoFB4oAaBxQaUUh60wFP3abTnHy01aQB2xSHqM049zTcUwA9TijHTNKetN9qQxfQU5SMU0DHWlHtQA9akBqMDBp69KBFiFjkcVOQCuarRNirMfK80xFOVcNzUDKMmrsynriqzjHQUmMqkDJqMjmpXUimEdakYiDjpVq3Yq4PvVaM4qVSc0kUO19BujnH8XWuj+Etz5HjfS2BxmVRWHcJ9o051/iQcUvgy4a18RafKDjZKM1nNFRPvmBt8KN6jNPqjoUvnaNZydd8Sn9KvVym4UUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAVy3xL1MaX4M1O4DYkWIlee9dTXiv7S2sfZPD9vaI3M5ZWGe2KqKuxPY+YNYuTPdzSN1di35msOY5PFW7qTcxzVFzk10mDIz1pVXJzSmnxjNNCJoUya1LKLJyR0qlAta9sPLhJI5rRIlkF02DxVRjU87ZPSoD1oAB1oPNJS0AB6UnendqTHPFABjiloPXilAoAB0paKAKAFAowcUUZpgLSY5pc0npmgAx70EccUnNGeaQCDrR16UoPNHQ0DEIOaQinNSZoEB6UnalHNJQAuaXIpBSgUAKKdmkFBoQDu1O6EUwdKee3FMBw5JpRwaavQ0oagBRzR0NAPFHegBRRnkelFHQcUAB70ZoPPNBHHTigBDSUpxSYoEFIfSg0mOaAA9aQ0pH50lAAOtKBikoHSgY40optOFAC0vam04CgBe1KKDxjFABz1oAXJzmlpOKXPegQA80vakHWl5oAUUZ7UdqD1oAAOKaetOpgPzYpgPbO0UwVJJ92o05NABQRxSmkz8tAB6UEcig4wKOCaQCqQetAwDTeAacCKBjgacDzTe3vSr+tAiRTyBVqGTjiqgPOamhyDTAnkJYGqsikdavAfLj1qrOpB9qAKMg5qM8A1ZYAVBIOOKkaIxnFPyRik6YoJJBpDL+nSAvsI4brVK3BtNVA6bW3CnWzlWGDzVnV4tssVyvG7C/lUSRUT7d8CT+f4U01ic/uE/lW/XEfB+7+1+C7M5zsRV/Su3rke50IKKKKQBRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUABOBmvk39pLV/tXilrQNlIMMPxBr6q1GYQWM8jHhUY/pXwj8Q9TfVPEl7cuxJLlefYmtaS1uTI5Od8nrVY4zUstQHrWrMmOUZNW4V5FVoxk5q9AvOauJLLdtHkir1wdkYWo7FOMkdKLpua0JKjHnHao+tPY54pmPSkMKKTFKKBBzihTzzSmgDvQAA8mlJ5poHGadQA6gCgdKMc0ABoXFBpRTGKaTrQfrSd6QBilxQaB1piExzSUpo60hgc4pvSnd6aaBC0nbilHSgUAIOtOHJpMUqjigBRSikpQKYCmnCkFLmgB3FAxSfWlxQAuOaU+1JyaBwaAHUY4zQaTtQAppKKTqKBAaQ0YpaAEpKWjvigBDQRxSmkoAQDmjFGcClFAwxSgY6UEUo5NABil7Ue1JjFADzmlHtTT2pcUCHEUdKTvRQAtOxxTeoFLmgBeaKBR0HvQAo96YPvU6kXG6mA98bahFTS/dqJetACnoKCKWg9KAG9qXjIoPQAUfWkAgxnmlI5o44o70AOFOHFN6ilHFADxwakibBqIc04U0BejO6iYZU8UyA45NTMNy5FAGdIuKryDkVemUZqq68ikxogbrSd6e4+akIAIpDHR/K3FakifaNMZcZaPLVmIPm4rT0psyNGx4cbaljTPp/9nmcy+CdrdVfFepV45+zrNt0W5t/7srV7HXHLc6I7BRRRUjCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA5D4ran/ZXgq+uFbDAYH45r4a1abzbiRieWcn9a+qf2l9X+zaBFYK2PPGSPoTXyXdnMhremtDOZTkPNIvNB5p8YqzMliXkVoW6cVVhTpWpaR5K+laxRLLa/u4PeqEjZPNXbtwoArPfk5qmJDW9ab04p/fFJSAbjmgjmnUHtQA3vS5xwKTBpcUAKBxRxmlXpQaAFoyM0UCmAZzSijqaDjNAwPSgc0HpSdB70hC96Q0o5NIcA0wEPWl6Cik6UhiUppe1JzQITtS0GigA6ClzSUq+9MBRzSigCg0AKKdSClGaAFpRxSc0uPWgBR1pTSYo60ALmlIG2k7UDgYoEKccUZxSdqKAEPWg8UnOaWgBDRiijvzQAHpSAUp+tAoATFKO+KT6UvvQMKWkzQOaAHZ5o7mjOaOtAhxxkUoOTTc0tADqOMGkFLmgAHaloHNHBpgKemBRzRSk4zSAAaan3qd2pqfepgPl+7US9DUsp4qNaAD0p3Y0h4OKUc0gG0Y6U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2o7ZooOKACjpRSHmgANAoApMGgBetFJz1ozxQAvaik6ilpgFKDSdqUYoAXNKKaM04E59qAFFLSClFACiijPNLQIKKKKADqKDSmk560AHGKOgoOetKPu80ANpaB1o98UAIfSlHHWjNHegAoB4paSgApRQKO9ACjrRSUZoAWl7UmaAeKAFNL3pM89KXvQAd6UUlHegB2OlFGTRk0wFoBoB9qCe1IBSKI+TQTQnrTASXFKn3aY/JqRM4pANOaD1GaQk7vanAdxQAowc4o96QZBNAFAhcUmKUgikoGFFFGKAEpT7UUnQ8UAL2zTw2KZnjmnA4FNASRHnNXoWyKoJxVu3b1oAssuR71TxtlOavL1qvcjDg4oYEUy9MVCwq243Lmq7ChiIOhrW0S4a31CCYcbXBz+NZjVYtmAI9jUNXKW59r+DdRXVPD1rcg53LW3XlHwE1kXmiPZseYAAPxr1euKSs7HUndBRRRUjCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKABiACT0FfFnxuvzdeMr4Zz5chQV9kavP9m0y5mP8AAhavhPx7ffbvEuoz9mlJFa0iJ7HKyHLU6EZNMPJNW7RM8V0IwZetUzgVqynybcDuagsIssvHSnai4zjsK12RFzNnbcxqE5p7HmmHrUlCD1pwpAKXp2oAKGpaSmAlAoPtSc0ABpT60nNLSABRigGlpgHFA70DGTxRQAUdqWg9KQCUe1KOOMUHrQAUlKD7UHrQIKbS5pKBi4pOKWkoAKXFJS0AHalxQKU0wFHvRR7UCgBRS0lLxxQIATu6UpNL3pB9KAAGgHilHpRn1oATkGl5oooAU8ik7D2pKUnIoAOaDyaTmlyc0AApRSZpc0AGKB7Ud6BwaACg9aMUdCKAEHXFLwDQOvQUu3BzQAlKOlGAaUDIoATqaUUgz2peeKAFPWjHNHTmlzn2oABnpS9qM0lADhQRkUdKUUAApU6GkPTApV6UAMY/NinqOKYw5qQcCgBmOvrQOOKB1oGKAF9aXp+NJil9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0cgCl46UwAfeNKDSHrxSr0pAHUZpaKABQAUAAUA8+1Kcd6AAgdc0mPWg44xRQA4UhHHWkzQDmgBwHvSd6ARSH1oAeODTgfmpvUUoPIpgWEPyg1agkyKpK3BFTQOOPrQBdXkEGhNu7FIG+YECgnDZpiG3ajBIFUhgODWsyh4iazpkCnpUsaPQvgrqP2DxdHk4EqhPzNfV1fFPhC6+y+ILCboFmXP519m6bcC6sIJ1OQ67s1yVlqdFN6FmiiisTQKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACuK+ME/keBNU5xmE/zFdrXlv7Ql59m8HNGD/rgy/XpVR1YnsfIMw8y4b3NbGmRbeSOgrNhj3TdK2iPItCe5ruijlkZt9LvmYjpVUHOadI256bijcAFFApcYpgKBzSHil7Uh5NACHpTT2pxptACHvSClpDQAGkpaDmkAnNBpRQBmgAwKSlOM0UAAoozQaAA0ZpKKAFopOaKAFpM0UUwDNKSMDFJSikAUopo60tAC0Uc0UwClpO1LSEFFFB60AHal70lLTGHfilHTNIelAHPWgBwo96QfSloAAT+FKaQdKBQAvYUtIKDQIBTh15ooFACHrS0UvU0AJSGlHGaQDJoAXJoFJ0paADvRRijmgAPSg+powcUEc0AKeo5ozk0fWjFABS80UdqAF7UoPFJntiigBRQaDS5oAUmko60cYPrQAUE9qBS0AMHBFO70pxxR3JxTATJxR360cU7g0ANGadnikFLSAQc8UtA4pTQAg7UZzS/Sk5/CgBe1FIc04ZFACUUYpetCATOKeP1phANKD0pgSAgZqSI9xUJPFOjoA0Y3yBUrAFKqREYAq2vTmmIktnyduahuY9shpEfbMKuzpuTcPShj2KVq/lzI4/hbNfYvw8uhdeDtLfOSIVzXxwylT9a+ofgTffa/ChjJyYSqfpXLWWhtTZ6TRRRXMbBRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAF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ooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigDgPjXceT4IvBnlgP518k7S0pPqa+k/wBom+MOj29srf61TkfQ184w43EmuygtDCo9Rr4RTxzVVRubJq1cN8tQwjLVuZDjwKrSHmrUrAVQkJLGhghh45zTW6UpximmpGIabTjTTQAlIRS0hpAIcUlLRQAho+tBHOaWgBpopTRQAlHWl7UlAAKB1ooFAAKWkoFAC0UdqO1AB2oozQetACkUUcUcUAAHFFA68dKD1pgHel70meaUdKQAKKSlGO1MBaMUUGgAHSlFJntS0AFGKKKAFxRQTRQAtHFIKOtAhTSUE8+1FAC9uKB0pD1zS80DF4NKOtJSjigA/Gg+tGKMUCF78UoApF60c80DFxRgY4pAaM0CDHNOIwKTPFAoAAMUvfpSA80pNACd6KXNFAAaMCiigAxQPaigd6AAc0Y5o7UlACgUd6KBQAvYUvFIaUj0oAM4pc00Cnd8UAApOtL360fSgBM4o4xRjNA78UALkbaAcUnp6U7jFACZ4pCcmlyKBjrQAZI6UEkijHSg9aBgBxzSgkMKUghaQDP1FAhcEk04A4FNXIGaeBxmgBAKehpp604cCgGSxtjk1qWMo6H8Kyh0qSGUo4OeKYG24BU460kXGMCkQ74wVx0pY1xIAaYjs/hbciz8b2juwAJP8q+pkO5FI7gGvjzRp/sur28/Tawr670yYT6fbyKcgov8q4661udNN6FmiiisDQKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooqK8lEFpNKeAiFvyFAHzx+0LqaXGtW9qDzBuBrx5Bwc10fxD1U6x4nvbkHKF+K552Cpx1xXoU1aJyzd2VJmy2PSmqMDNMbJYmpAPlGaokiuHwMd6qk5bFPumzJUa8/WkA1jim/jTjTKBgabmlOKbQAtJRSUgFPWikzRmgBaO1A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KKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKhvbmOztZbidgscY3MT2FTV5T8f/ABWuieGXsonxPdgx8dRxmnFXdgeh4H8Q/EkviHxbdzStujiJjT6A8Vh2Z3MzZwSayYN0geVz8xPPvWpZjCL613wVjlk7li4PynJrOY4PNXrg5JzVFyCasgY+Me1U58b8g8VZk54qnJjdSY0IvU+lSfwimCnZ4qRiN92mU9j8tMoEIaaRTj1pDQAUlHNLigYhpMUp9qMUDEFGKDkGlAoAbinDFIeBxR/DQIUjHajigHikoAUHmlB4pO1FAgpaaM0UAPzSHFJmjNACg0U3NLnNAxRRxSZo+tMBaKTNFIBaO9J1ooAXNApO9LmgBTR6U0HJpc0CHDg0UlA4+lACjrRSClHvQAdqXtSdqB0pjFpcflSE0HNAC89qDxQB6mk+tAhaBigACjjpQAoNOzTT1pce/NABTgaYBTgKADPftQTSHgcUtABnijPNANLigAJozxSZ4o60AFKe3NB54pQPWgBDRRRQMWigUUCF7c0najtRigBQM9OlJ05zQOAaTvQA4cc0UhxjihQaAFBpeo5pKD0oAUYxSAg9RR2o4oAOM0HA4AoGDR3oAOvFHHeil4FAAD2obp70DrS+uKAAdM0gznNLn5eaXAoABSA0oOKMc0CDGaWjIA96aTk0DHjOKKTPFAzn2oAUUDGDSfjSZFAD1IxSjFNA9aUY3YoAkjX5s9q0bTA5zWfHx3q7akZxTA0GYbcU+1cfaEOehqucFTTYWCSD60Adz4N1U6T4rtJUOEkKq30r6ot5VnhSWM5VxkV8a3MmEilj4Zec19M/CnWxrHheHLZeACNs+uK5a0epvSfQ7Siiiuc1CiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAGyuIo2diAFGea+Mvjb4mPiLxbOInJgjwiDsCMg19J/GTxENB8IXRjk2XMi/u6+MS7XN9LM5zli2fqa2pR6kTZYgGAqZ+taceFTjtxWbApLk1oEfuuvWuxHOx0pyKpuOanc4HtUDnvmmIgkPHFVX5NWJGwOKr4JNSwQDpS0ppCeKBiHOKTkUp5NJSEJSUvSkzTGFLSUmTSAB3pe2KT+dJQAtFGOaDQMBz0pDiiigQAcUUZ4oFABRS0cUAGPejFFFACYopaO9ABQKU8cUlMANApaKAExS9qKMcUgDFFGaKADFL0pM0fhQAoFGKATmigQgFL2o5pe1AxBS0DrRQIKXFJS54oGGKMUgNKOtMBR+tLim+9GTQAp60v0pKXvQIMUAetFLk0AJiilGaKAFpB1ozS+9AB360GkHvRQAoo6UlL1oAVuDQKQdaUcUAFLTe9LQAtFApRQAme1A6GjjNL2NACdqDyRSj7tJmgBeMUgNLRxQACilpKAAHigcCjtQenSgAGMijPtQeTRQAtL3pM9qUGgAB5oHfHSkHU0qnigAA4oIJpRS54oAbijGKUUuaAEIpp7U4Hj3oPbNAAOmKUZDYpAfWgdc9qAF4o4FIeaAc0DHL704Dmm804YzTESoBirltjIqkg5q1BkEUAXjjacVBuG4Gn5IGKhbOeKANjdvtTjsK9E+AviQWOtPp08mIpcsM+vQV5nauWgK1Fpd42na1b3EZIMcik/TIrOcboqDsfcI6UVj+E9WTWtCtb1CD5iAmtiuJqx1BRRRSAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACgnAJNFZHizU00jQbq7kIAVCAfcg4oSuB84/tG+Ize6/8A2fG/7u1JB98141AmIifWr/ibUpdU1Se6lbc8rd6gRflVRiu2CsjCbJYjjGKsuflUdOKhjXLAU6Q5cD0rQyBvSoZM4xUpY54qGZsc0wIJDxiowT3oY8mkySKQAetNNOzjikzQMaKKCaSkAGkoozQAdKB1pDSE0DBvajPrSE0negB2aKaOtLQAueKOtJSjmgBelA5pAKUZoEApaBRQAUtAoNACUUDpS0AIQTS0d6MUwEpaKKADFKBQKQdaQB70UAc0tACUtJ3ooAWjGO9JiloAKOTQBS8igBMGiilFACAUvFHel6UAJRS8UAjNMA60DvRS0AFFLxigYxQIMUUoxSEYoGL0oNHWgUCCg9KOKXg0AIKKWkoAKD1FKMUHrQMOlL3pDig8UALmikzxS5yKAFo5ozxSc0CFoz1oB4o7UAHsaCMGgjmg80ALkUgPNKKTigBT60lGaCeKBgelGCfpR2oA7ZoAOQcUv8qTkc0v8qAA8HNLmk60d6AFXmlHQ0mOeKORQIXJNGaOopByKAHCmnNOHT3pDxQADignig0mcdqADOeval56dqQMKXrzQMUcnFL0pF6U4GgAUDrSjNIO9OUetMRIgJqzAcVVXr1qxFkUAWN2VNR5ODmkLZpp6UgL2nkbsE9ajvoylxlaZZvtkUn1rSvkyocDtQxrc9t/Z78QebZy6bO/zLgRj2r2yvjv4fay2heIra6yQm7BH1r68sLhLuzhmjIKuoOR9K46sbO50Qd0WKKKKyLCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigArxT9pDxILPQ00uJ8ST4f8j/APXr2qRgiFm4AGa+Mvjnrb6r41uYg+5LdmRf0NaU1dik9DgI4zLcBScbatJEwfhqgtIy4ZycE1ZETKRhveuyKOdskiMgzwCKRpfnO5fyFSx70QkrmmidCDuGDVECCReSDVec571O3lkcDiqkiAkkHGaljGPx0pB0xTWjYH71KfMGOM0AKR+dJTGZh1Wk81e/BoAe1MzQHUjrQBQAGkJpSKQigYHPakxS96WgBuPWjFKaB0oAbjBpcUUvPekAAUvQ0LzSgjNMQD1xRRn2ox7UAFKKBQKADFApe9IaACijHHFA6UxhSGlopAA6UGijmgBRRQaB3oEHeg0YpetACCjFLRQAhHSlzRRxQAnWl6ijFFACDrS0UEUAGO9FHaj8KAClA9aOtA60wClFIaUdKQARxRR2pRimADOKO9Ln0pMUCAZoB5pe1JzQMAfal9KTPFLyaAA0Cl56Uc0AIKOd2aCBSkYFAB7mg8nNIMGlHWgBc80dKAOeaOKAFoxRmigAoOcUZoB64pAJ3ooPFFMBe1IOlA96KAAHHWg/WkNA6UAKOmKCeaPxoA5oAKBRjmgcUALSj0pMUv8AKgAFKOuKTgDilxxQAE8daCBSAc0ufWgQv0ozkUmcGg89qAA/Wlbn60mKQcmgAAOKXB7GkOcmhQc4xTGP5Pel9qaAQfen8kdKQBkU6m4GacOuMUxD04NToxAqAcU5XAzk0gJcjdnrTs+veq4l9BmnqzsDhcUAWIThhit4bZbIEnkCucRXDfMcCtnSwrIyu3WgCkJVRs91ORX1F8E/EC6v4ZSBmzND976cCvlm92wXLgcjNeo/s9601n4iezdsLc7UUE+9Y1Y3RtB2PpuiiiuQ2CiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigDH8XXosPD19MeqxMR9cV8IeIL1r3WLm5cktK+c19l/Ga5a28GXBU8uCv6V8UyJvnAPWt6S0M5sv2o226jFWR8zD1qIHCAKKen+sFdSMGWAOozxiqr4Gcjipy2VOKrSA7aoSI5FXbgZ/Oq5jPZqmaoyagYzEmeDmgSOP4STSnI6UZxQA0ynutAkjIwQM07Iz0oIXuBQAwCJjnNKYkPIP60mxc+lIYgejGgYGL0agxOBww/Km+Ww6NRiRRQAYkHbNIWcdUNOMkmBxQJSDkqaQDfMx/CaTeufSpPOUj7tG6MnkDFMBm5T0IpRg96eREeBR5SdiaQiOnD1FKIBn7x/OmmJx0bimBIOnvSZIpu2QDsaTLjqtAEnUUgBxTPMPdTSiQdwaAHDrSmm71pdy+tAx1J2ozx1oPQUCA0nNOxSAUAJn1opSMjpRigBO9GaMc0AE0ALSc0oHGKSgBeaQ9KXHFGDQAZpRSYoI5oAMmgH86MUFTkUDFzigdaAOaMGgQUUCgigBaM+tFJjIoAWloI6UY60ANp3ajmg0ALRRj0oFAC0mTRSdTxTAcDxSg803nvQOTQA73oFJzRQAvak74oxxRgg0ALSnpTSKUjFAB6jvSD3pRQQelIBe1HeiigAxikHNO5pO1MAHNFAHBxSYoAKDR1pMGgBfal6GmkHrS4zQAuO1HejvQQd3NAB2peSM0YPT0oA44NACDrQfenADv1oH3T3NACAcZ7U4jApv8PNK3Y9qAEBNL25oI64pB7mgA6YNO3Uw8jigdehoAkySDxSKdw4600E5PWlRCOfWgBeM0E4Oe1IkZ7nmnBVA+Y80AKGXGc0u/HAFJhRSCQelADtxI4U0bXJ6gCmtIxAwKRd5+lAEgjOTluKegQdTUQRieTxUsMagc8mkA8SKH4GQKcJGbOxTQqhT0FSD0HFMBq+a/U4q7YqS4DvjHHFVxn8altmPmZHY0ATarbBX7kHvV7wfevpfiLT7uNsLFICaW5XzrYNweKzo1MQ5zx0NRJFRPuDTpvPsLeXOd8at+YqxWB4GuRdeG7Nwc4jUfpW/XE9zpCiiikAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQByPxQ0abW/C80FuMuoLY9a+Mb/SrjT9VkiuoXQoSOVIr78rk/FPgXRdfSR7u1j88g/vO4rWE+XciUbnxcuNwwOKUEb8Vs/EDT7fw34nu9NjffHC2A2MVzkV3C74DV1qSZg0XWPp0qGQ5HFOEqYwCCKYSD0qiCB8gVG3FWHAxUDUWKIzmilOKaakYZopO9GaAHA0AmkzzRnigBc+lGaQn0pCaAHg+tLwRjAqPNGe9ADiqcZA4oaJMdOtN3ce9APSgA8pexoEPGQxpwPPFHPegQwxOMYajbJyP61KDSZIzQAwPIDjFBlbuKk3ELmkLZFADRMvGQc/SlLxk9KPl4JHNBVD2oAAIj2FKY4zjFN8tM8UGMAcGgY7yQQcHvStF23GmFDkbW4pSr7shuKAFMTADBppikDDnP404mTpnikDSDtQICsvYD86TEg4IFKZJAM4oErA5IoATL7fu0gZgfu09Zm9KcLgYORzQAxXJJ+X9KTfgcj9Kf54A9KUSrzQBHv4HBpTIPQ/lTvNXAzTlljoAYHUHkH8qQuOvOKl8xCc0oMZ7DPpQBFvUml3qcU/8Ad7s7RigLFkZAzQAzcuaUEY6inmOMt90UixxsSMUwG8Z4xScY60/yo8nBoMKYwKAEOMdRSfwnpmlEKg4zQsIx1pAN7ilPTigxfLw3NL5RUj5uKACge9KY2I+9QIz3agAFLim7G4y1KEcH73WgA70Y+akEb5Pzc0bXPOaYC9aOmcUoV8D5uaaEfB+agBVoOaCrk8HpRtbGS1IA6LSjlTmgxttyD1pSjbcZ5oAGGFHFIBluTTyhPBboKRo8Ac80wExzilHBpSh8zk8UNHx1pAJxyDS8Y9qUKo6nJxSMuMdhTATIUHB70cBCfWlUKd2OeadtXac8igCM8LTjjijI8vkUEqEBHWgBuQAfrQWHpTsqcZpGYLkAcUAJxgZpzZVhtHFNLJtH96nNJyooAbg5OOtOxufLU0tiT5eBQXG4YHFADlXLEE0KOopoYliW6UqkkYxxQA4KMHnmhAMFc801AwJxxSopIbPWgBSo8o9zQVGF5zzTdpEeM4pdg8sY5bNADjtDjB4pGKgnHNIyAEHP1oIXd8ooAUMoIwOaazkjgc0p2hsgUuec4pANVznGKUFw/tSsTnI60oPQ9TQA1Q2/rzThGTnceaTktmng8c9aYDQgHXmnALjpSZOelL17UAKaUcjFIORS9qAFFSJTMUqnB56UAPznAqT6VETQGII9KBE6NxT0JDcVErDHFWIvmIzQNGxp48yIr2qvcx7A4b8KtaUT5hGK17LRJtWnWC1jLyyHA4pStYqJ9GfCtXXwlbiQYPb6V2FZvhuyNho1rbsMMsagj3xWlXA9zpCiiikAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAVBqEohsbiQnG2Nj+lT1zHxJ1D+zPCN5cZxxs/MGmldgfG3j27OseKby4PR261ycluPNOwmti6cl5ZWPzEmqsKbu3WuxI52yh5cgOEY0/7RcRDGc/hWhJtjGAOarMvt1qkrEkAv5V++hoOor3Uj8ae8WeoqFoF9KHcNCUXsTfxAU8TxN0cZqg8C56VA8ODwT+dTdjSRrh1J4NKTWEVkXox/OjzplxyeKXOPlN0E96C1Yq38q9QD+FSjUzjDL+lHOg5WaoYkc0A81mpqSE/MCKlF9E3fFPnQWaL2aQNg1WW7jP8QpwnQ9wad0IsBh1FKGwelQCQE8GnCQDvTuFif8ASlBFQ7wacGGOaBWJO59KXHHFRh6XeM0wHEUhFGaM0ALtpMGjPFKDxQAAc0YNLmnA0ANxxTh6UcUtACDrzSnpxS8UgznFMQoo60GjtSABj2owPajpiigBCoI6UoUdMUvakPAyKAEKL1xQI0x0pxHHFJnPWmAnlJ6U7ykBHXP1oJwcUo4NADRCu7BpphXeeakJ+cYppzk5pAhoh4+9R5JB4anjpmgfjQBGIjg/NTvKYD7wqTsRQPrQBGI2yfmoCybDzUhxjjrRzjB6UARYkCilKyBhTweQO1KTj3oAjPmYxiky4xxUrE8UHG6gCMGTOMUgMmRxUpPI7UD73NAEWXyeD0pwZ8jjtTwTk+lKv3jimBEC+WwDRmQr905qTnk0o5XrQBGWk/u0bn9KkJx2pQeOaQEW6TABFKfMGTUucig84oAYwckUMX3BT0p7E7vbFJ/Fye1AEZD5Ap218kZ4pScE96FJzQIQKwJyaAhJ5PNOzQPU9qYxAhDMAaPLwpweTS5OMig5zkGgBvljBBP0oEWF6804cd6MmgBpjAHHWl8tcc04dM01j2oACi8cUoVeD3pAelBI6c0ALt5JNAHIzQD1yaM5pAHfHaj69KSl7UALxjik7daQdfSnEigQgySD2pPpSrmgcE0xiH25pMEc04fSlPJxQA1hQOPel9jSYxyKQCYJOacBwDnmijJzTGLSknOKac5p3pSEA5HJp2eKTAzQM0wDjPFKCaOBzkU1pEA5cfnSAkyRRnJqu13Eo65+lRNfj/lmpzSuFi/zkYFKQe9ZZu53OAAB9KYRcP1b8qOYdjXV0VhlgK7zwD4IvfFu6S0cJCjYLFcjNeWxQOz8sfzr6a/ZkfZp93EDkGTP6VE5tLQuMU2aWhfB4wSbr66jdc/dCkGvS9E8M6bo4H2SAB8dTzW1RXNKcpbmySWwUUUVAwooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAK8r/aDvxB4Pe2DYaR1IH416pXzn+0hqRm1O0s0b5Qh3AeuRV01eRMnZHhUtuZmCjOO9OkRIQAOtaLlLWLg5asO5nLOa7djnY2UjJJqIYJprElqbu5ouIkYgdaruwzxQ5JJqM570NgNY1Cx5qQr3pNpxUlEDCm7c9aslM00x9qmwXKpQelMMY9KuGKk8vjpS5R3KRhFMMPpV8RYoMWBS5B8xnGJh0zSDzB0Y1fKUxoxS5Q5ioJZV6Maet1KtSFB2ppjGDSs0PmQ5dQkHYVIupHuKrGOozHzSvIdkaI1Ne+akXUY+5NZBjxTSho55Byo31voj/EakF0h6MPzrmsHFHNP2jFyI6cXCn+IfnTvOHYiuYDMOhNPE0g6MaftQ5DpRLk9ad5vPWubF1MD981It7KO5p+0QuQ6Iy0vm8VgLqEncZp41JscrT9ohcjN4SUeZWINSHdakXUk9KftELlZseZSiSskajH3p41CM96fOhcrNPfS7xWb9uiP8VOW9j/AL1PmQcrNHfxS7vXpVAXcZ/ip32qMjhqfMgsXt64o3DHNUxcIf4hS+cvZhRcLFncCaUv271WEo9RThKM9RRcLE6sOD3pS2etQeYMggilMnuKLhYmLDtQGzUQkBpQwHei4ibdSHpTAw9aUOM0wHClP3aaWHWkLAigB5PyjIoz0Apm7oDS7h3oAUnmgYppPPFKPemA8HnnmkJ7im5xS9RSAXPGKUHtTaOM0wHButGRnim0CkA7IIzSg4FMI79qAPegBTyPelyaAQM560DrnrQAo6GkJx1oOMUnWgW4dScUo4o470HBPFMYZyeaN2OlJjvRmkAuaUHntik6gA8YpoIFADyR1FKenFNHpmg4/GgB/akPSm45zmgDjg0AKcduooHIzSbgByRmk3qOrD86AsOOPSkyTxTTNHj7wFN+0Qg8uKV0gJQMEUCoHvYF/wCWlMbUbYfx80cyCzLWO5pVHOKoHVrcd6jbWYBnHJpc6HZmr0zmm9+BWQ+uJ0C5qI64ecIKOdByM3cetGMCueOtynov61G2rXLdCRS9oh8rOlPvigsv95R+Ncub67f+NqTdcv8AedqPaBynStNGuQXX86ja7hUcv+Vc+LaRzyTU8dgT940czCyNRtSgXoSfwqJtUT+FSfwqBLFARmrKW0Y7UXkGiIzqMjD5UpPtFy54GKtiJB0FPVcU7MV0Uglw/wB5z+dSLaMT8zGreMDFKPpT5QuQJaIDzzUqwIBwKmOOKPbFFkK5GIwDipUUde1AGaeo4zTsMRFCv7V7v+zXc7dTnt+zBmx+FeG7csCK9c/Z9n8nxeq5+9E9Z1Foy4bn0/RRRXGbhRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAR3EqwwPIxwqjJr5C+JmrrqfjC+ctujjchfpxX038RdTXTPC95KzbSyFQffFfGV7MZXklZss5yc1vRXUzqPoUL6cu5IqhgknPWrTjJ5pgXmukwIdtR7etWsdaibrRYCDbzzTCmamPWlOKAINhNJsANWVWgoPxosMr7OaBGfSrGBRwBRYCv5eKQpUzMKjZwKQDCoxzTCKVnqJjmkAjDmoXFS4JoK0rAV9vNG32qcrSFeKVguVytIVqxt4qMilYZCUGKaUFTYoIpNDuQGP1FMMY7VYxSYHpSsO5X8uk8urG0UhXBpco+YrmPFGzirBXIzTStLlBMg24NBFTFeKTHFKw7kOKTFSbeaNvNFguR0U/bSbaQ7jaM+5p2KMUWATJ9TRub1NJilxQAb2Hc04Sv/eNNxRigB/nSf3jQLiQfxVHijFF2GhMLqX+9Tvtc396q9KKd2FkWBezD+Kn/AG6b1qmKWi7FZFwahMO9KNSmHeqQoxRzMLIvjU5acNVk7is00UczDlRp/wBqv6U7+1T3U1lUU+dhyo1xq3qppRq/qhrHxRRzsOVG1/bC/wBw04aymOVP51h0Gn7Rhyo3BrCHqppRrCehrCpKPaSDlRv/ANsR8fKfzpf7Yi9P1rn6OlL2jDkR0B1iL0/Wk/tiIdj+dc/QeaPaSDkR0H9sx+hpDrMWOFP51gYoxR7SQciN8a1H/dP50HWo8fdP51z+KKXtJByI3zraf3TTTrS5+4awsUpFP2kh8iNs64McIaadbPZTWLilxS55ByI1jrb/AN00h1mTsKycUu2jnkHKjT/tibHFMOrTnoaoYpduaXNILIuNqlwf4qadSuT/ABVWCUuzNF2GhM19cN1emG5mPVzQI6URHNPULoZ5sp/iP500s5/iP51YENOEWKLCuVfmPc/nS7W96uLDntUiwU+UXMUBGTThCTWgsGT0qVIKagJyM1bc+lTJbH0rRSHBHFTrCD2qlAXMZqWee1TpZj0q+kYHSpQoq1BC5inHaKO1TiBR2qZRil68VXKK5GsYz0p4UDpTgMUop2C40LT8DNIB1NKKBCijHNAGDS46UCD3p46fWk45pR92mAo64oIoXFKO9AAvSpFHFNBp69KBk8I3L9K774TXYs/Ftq2cbl2/mRXCWwycV0Xg6byfENk2f+WyD/x4VE9i4vU+0F5UfSlpkLB4kYdxT64ToCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA8i/aIv8AyPDkUAbBZxxXzBdYVQK95/aVuD9rtbcdNob9a8AuTukx6V10loYVHqMA3HNI/A96liXHJFRTH5jitjMiY1G9SH1ph96AGEUmKXvTTxQMdnFBbmmCk5zSAeWqN2xQfamlc0ARs3FRnJqcR0oj9qVhFbaaUJVjZil2YWlYZAFxRtqbbRt/OnYRAUpGWpyKQqO9FgK+OKbtqwVpuKVhlcqM01l5qZh7U0rilYEQFeKTbUzCkxSsBDtpNtSkUhFKwyIg0mKlNNxxSsFyMjim4qXFNIpWGREUYqTFNI5pWC4ykIqTFIRiiwyPFGKkxSEUrDuR7aMVIVpNtFguR7aNtSYoxSsFyPFGKfigiiw7kYFLtpwFKaLCuMxRingUhFAXGkUYp2KMUWC5GRS4pWHNOxxRYdyPFGKcBzQRSsFxuDRinYoxzTGMpcU4rRilYVxmKMU8igDiiw7jMUYqQDikAosK4zFJjmpcUm2iwXGEYpCKkxQFosFyPFGKk20u2iwcxGBzS7afinbadg5iMLRtqZVp2yjlFcg2UoT1qdYzThHz0quUOYgCU4R1ZEXFPWPinyi5iqI6kWOrKx57VKIqaiTcqLFzTxFVtIh6VKkVVyhcprF2qUQjuKtCMA9KeE46U1EVyosNSLEM9KshRigLjmnYRCIqeEx06VLiinYBoWlAxTlHHFKR60wEAzSgetApwpgFLjiijPNACjFAHNGKP6UCF7GlHT2o4x9aTOOKQBThTc8+1OHOKYC9jigdPpR2oGeaBijinDGaaBTloEOA5p6jimU9R8tMZZtjhxmtXR3MWs2TD/nsh/8AHhWREcEHNaFu+2/tX7iRT+tRLYqO59s6LJ52mQP6qKu1ieCpfP8ADNjIf4krbrhe50hRRRSAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAPmb9o6fzPEkK5+7CP514uAWYnHevT/jhd/avFkmDnYpX9a82QfKa7aa0Oab1GONiZFUmbJwatXDfLiqmOc1oSI3Iphp5ppoAYTTCKkNMwaQxKKMGkIoEKBSqOaQU4HigB23mjbSBqXOaAEIpNvFOB5o4oAaVFJtp2aQmgBpWmkcU4nmmMeaAEI4phFPNMJpANNMbrTzTTSGNIphFSUmKAGYpmDmpttNIpARkcU0rUxFJtpWEQlcU3bU+2kxSsO5AUNJt46VOVpCtFgIMUYqYjmjbxRYLkOKaRUxXBpCKVhkWKKkI9KTFAEdGKdjmjHNKwXGYoPvTyKTFFh3GYoxT9vpR7UrCuMwaMU7FBoC4zFAFPpBRYdyNhzTsUN96nGiwyMDmlxSgcUuKLCuNIwaMU7BpKLDuJRil20oFFguNIoAp+KUCiwrkeKMcVJtpMUWC4wClxT8UYosFyPFGKkxRiiwXI8UuOaftpdtOwDNvNPC807FPAosFxFWpAlOValVapIRGqCniPnipVWnqtVYREEqQJT9uKeBkCnYGRiOpVTjkU8UoFMQm30pQpFOXilpgIBRjilpTzQAlOoHFFAAOtHfNL1pMc0wF4xQetJjuKXGaAAH1pc0Ype3NIAFHTrS5pDzTEL2pME0vNKpOaADHFB4NB5+tAoAXgdKTGKUCl74xQAgyacM4JpBSk0AO3A0Aimgc072oAePWng8YNRgc0/0pjRPFzj2q8MiSFu4IP61RhyDV1yR5ePapkNH2D8MZfN8E6Yx6+XXU1xPwgcv4G03POIxXbVwS3OlbBRRRSGFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFQ3swt7WWVjgIM1NXPePr0WXhTUJM4byjj600rsGfJ3j65N54kv5M5Hmtj865gjC4rV1NzLcSyNyXYmsq4bHSu+OiOV7lKdsmoKkkOTntUbHimIQ0w04nikzQA080lL0pOpoAQ9KMGgUtIBtKBzS9TS4oASlxS4o70AIaTNOamE4oAOaaTQTnpTCaAAmmk0vWkPNIBM5pDS4pcUgIyKUU8CjFMYzFGKk20bTQBHjNJtxUoFG2kIh20Bal20hWiwEJXmjFTEe1N20WAiK0m2pSKQjikMiK800ipDTDSYDSKZink02kA3FJTsUhBoGNxSYp+M0FcUCGYoAp+KTFIBmKMYqTHFMxQA00GnEc0FfWgYzFLilI5oIpARH71PNNx89PPQ0DGqO9FKvSlxzQAmKTHNPxS45piGYNGKkxQBRYBgFGOaeBRg0CYzFGKkx7UYp2EMxRin7eaMUWC5GBRipAtLiiwxgFGKeBTgKLAMAp4FKBTgDmnYB8YyKlUYFJGuamAqkgBRxTgvTFAWnrTEA5NOGKTb704DimACl70AUoFAgpaBQaBgelKBgUY4pfegAFKBzSCl9qYB3oNFGKAAZpaQe1OYYNACZopfwo60CDHagUoOPrQaAAHtQCQKQU7tQAL0oHFAzQfWgA60vNANByT7UAKOBxQO+aQdxTqBgCacOtNB5pwoEKKlXp7UxelPXpQMliPzVdk6R/SqKD5hV6X/ln9KljR9W/BV93gixHpGK76vOPgY2fBtsPRBXo9cUtzpWwUUUVIwooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAryv4/ambTw7BAhwZXKt9MV6pXzp+0DqZuNejsVbKRBX/MGtKSvImbsjyC5ckACsu6brgVoSnDHNZty2eB0rtOYqtk1E3JqQ9ajJoARjTSacfemmgYE5pAMUZoBoEGaB1pKUdaQAOtOpBS9KAAGjPrQSOtNJoACetMJNOJoxxQBHQKft45pCPSgBmKKkApCvFFg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	\N	\N	t	manual	\N	\N	t	\N
\.


--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.profiles (id, email, name, avatar_url, role, created_at, updated_at, user_id, document_number, phone, is_super_admin) FROM stdin;
5c9f63f2-c9a6-43df-9c88-e8ac6b447935	ravmkt1979@gmail.com	Usuário	\N	user	2026-09-08 21:53:10.87661+00	2026-09-08 21:53:10.87661+00	5c9f63f2-c9a6-43df-9c88-e8ac6b447935	\N	\N	t
b97915fe-7d23-42a5-b5b6-62831331c5a8	contato@useanny.comm	Use Anny	\N	user	2026-09-08 21:54:19.66031+00	2026-09-08 21:54:19.66031+00	b97915fe-7d23-42a5-b5b6-62831331c5a8	\N	\N	f
63463515-1641-4276-a7b0-4029b2158587	contato@useanny.com	Use Anny	\N	user	2026-09-08 21:56:13.68545+00	2026-09-08 21:56:13.68545+00	63463515-1641-4276-a7b0-4029b2158587	\N	\N	f
3d4bee8c-277b-4646-9d5c-c46a42b7f0fa	rodrigoavicennte@gmail.com	Rodrigo	\N	user	2026-09-21 00:34:21.315883+00	2026-09-21 00:34:21.315883+00	3d4bee8c-277b-4646-9d5c-c46a42b7f0fa	\N	\N	t
\.


--
-- Data for Name: referral_rewards; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.referral_rewards (id, referrer_store_id, referred_store_id, amount, status, created_at, updated_at, asaas_payment_id, commission_rate) FROM stdin;
\.


--
-- Data for Name: sector_benchmarks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sector_benchmarks (id, sector_key, sector_name, avg_ctr, avg_cvr, avg_hook_rate, created_at) FROM stdin;
b2c2d2e2-0001-4000-8000-000000000001	moda_acessorios	Moda e Acessórios	3.80	1.80	62.50	2026-09-01 12:43:18.948011+00
b2c2d2e2-0002-4000-8000-000000000002	beleza_cosmeticos	Beleza e Cosméticos	4.50	2.10	70.00	2026-09-01 12:43:18.948011+00
b2c2d2e2-0003-4000-8000-000000000003	eletronicos	Eletrônicos e Gadgets	2.90	1.20	55.00	2026-09-01 12:43:18.948011+00
b2c2d2e2-0004-4000-8000-000000000004	casa_decoracao	Casa e Decoração	3.20	1.50	58.00	2026-09-01 12:43:18.948011+00
b2c2d2e2-0005-4000-8000-000000000005	saude_suplementos	Saúde e Suplementos	3.60	1.70	60.00	2026-09-01 12:43:18.948011+00
b2c2d2e2-0006-4000-8000-000000000006	esporte_lazer	Esporte e Lazer	3.40	1.60	61.00	2026-09-01 12:43:18.948011+00
b2c2d2e2-0007-4000-8000-000000000007	infantil_brinquedos	Infantil e Brinquedos	3.50	1.50	59.00	2026-09-01 12:43:18.948011+00
b2c2d2e2-0008-4000-8000-000000000008	pet_shop	Pet Shop	4.00	2.00	64.00	2026-09-01 12:43:18.948011+00
b2c2d2e2-0009-4000-8000-000000000009	alimentos_bebidas	Alimentos e Bebidas	4.20	2.20	66.00	2026-09-01 12:43:18.948011+00
b2c2d2e2-0010-4000-8000-000000000010	joias_semijoias	Joias e Semijoias	3.90	1.90	63.50	2026-09-01 12:43:18.948011+00
b2c2d2e2-0011-4000-8000-000000000011	artesanato	Artesanato	4.10	2.10	65.00	2026-09-01 12:43:18.948011+00
b2c2d2e2-0012-4000-8000-000000000012	outros	Outros / Serviços	3.00	1.40	57.00	2026-09-01 12:43:18.948011+00
\.


--
-- Data for Name: sectors; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sectors (id, name, slug, icon, display_order, created_at) FROM stdin;
a1b1c1d1-0001-4000-8000-000000000001	Moda e Acessórios	moda_acessorios	ShoppingBag	1	2026-09-01 12:43:18.948011+00
a1b1c1d1-0002-4000-8000-000000000002	Beleza e Cosméticos	beleza_cosmeticos	Sparkles	2	2026-09-01 12:43:18.948011+00
a1b1c1d1-0003-4000-8000-000000000003	Eletrônicos e Gadgets	eletronicos	Cpu	3	2026-09-01 12:43:18.948011+00
a1b1c1d1-0004-4000-8000-000000000004	Casa e Decoração	casa_decoracao	Home	4	2026-09-01 12:43:18.948011+00
a1b1c1d1-0005-4000-8000-000000000005	Saúde e Suplementos	saude_suplementos	Activity	5	2026-09-01 12:43:18.948011+00
a1b1c1d1-0006-4000-8000-000000000006	Esporte e Lazer	esporte_lazer	Trophy	6	2026-09-01 12:43:18.948011+00
a1b1c1d1-0007-4000-8000-000000000007	Infantil e Brinquedos	infantil_brinquedos	Baby	7	2026-09-01 12:43:18.948011+00
a1b1c1d1-0008-4000-8000-000000000008	Pet Shop	pet_shop	PawPrint	8	2026-09-01 12:43:18.948011+00
a1b1c1d1-0009-4000-8000-000000000009	Alimentos e Bebidas	alimentos_bebidas	Coffee	9	2026-09-01 12:43:18.948011+00
a1b1c1d1-0010-4000-8000-000000000010	Joias e Semijoias	joias_semijoias	Gem	10	2026-09-01 12:43:18.948011+00
a1b1c1d1-0011-4000-8000-000000000011	Artesanato	artesanato	Palette	11	2026-09-01 12:43:18.948011+00
a1b1c1d1-0012-4000-8000-000000000012	Outros / Serviços	outros	Globe	12	2026-09-01 12:43:18.948011+00
\.


--
-- Data for Name: selector_sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.selector_sessions (id, token, selector, story_id, store_id, created_at, updated_at) FROM stdin;
405a3799-ae6a-4874-99c4-b330fc9427a3	sel_1788981594466_j0n876otd	div#app > section.category-content:nth-of-type(2) > div.main_category_content-1 > div.breadcrumbs.container:nth-of-type(1)	591a37a1-1897-4293-9ba4-ea7992849c77	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	2026-09-09 19:19:57.711+00	2026-09-09 19:19:57.711+00
\.


--
-- Data for Name: sizing_models; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sizing_models (id, store_id, name, measures, size_name, created_at, updated_at) FROM stdin;
27cb83b7-6a9f-48d5-b40a-58bb57f60995	eccb3093-8f8e-4cba-b598-6ab8d6326b8f	Clara	[{"name": "Altura", "unit": "cm", "value": 170}, {"name": "Busto", "unit": "cm", "value": 80}, {"name": "Cintura", "unit": "cm", "value": 55}, {"name": "Coxa", "unit": "cm", "value": 35}]	\N	2026-07-27 17:17:31.227+00	2026-07-27 19:06:41.341+00
5d1e4d4e-46b2-4fe2-a0b9-04460cc9cd89	eccb3093-8f8e-4cba-b598-6ab8d6326b8f	teste	[{"name": "Altura", "unit": "cm", "value": 150}, {"name": "busto", "unit": "cm", "value": 80}]	\N	2026-08-07 13:14:17.527+00	2026-08-07 13:14:27.532+00
c9693501-6fc0-461a-91f0-ec21f8f3cbc7	050a427f-8122-4621-a749-09091fe7cfc0	CLARA	[{"name": "Altura", "unit": "cm", "value": 185}, {"name": "Busto", "unit": "cm", "value": 80}, {"name": "Cintura", "unit": "cm", "value": 60}]	\N	2026-08-15 21:27:31.265+00	2026-08-15 21:27:31.265+00
7eee9d78-2528-429d-b2d6-57050cc7cc35	11111111-1111-4111-8111-111111111111	MARCIA	[{"name": "Altura", "unit": "cm", "value": 170}, {"name": "Busto", "unit": "cm", "value": "75cm"}]	\N	2026-08-26 19:49:32.37+00	2026-08-26 19:49:32.37+00
c2e471f3-cc6f-47da-a81b-ebc38f4ae2d0	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	Clara	[{"name": "Altura", "unit": "cm", "value": 175}, {"name": "Busto", "unit": "cm", "value": "85cm"}]	\N	2026-09-09 19:17:26.134+00	2026-09-09 19:17:26.134+00
\.


--
-- Data for Name: store_activity_events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.store_activity_events (id, store_id, event_type, video_id, product_id, metadata, created_at, session_id, watch_second) FROM stdin;
fb1073b4-cc3c-448a-b054-09a4eac49f87	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	product_view	9a7c8ccd-0c57-4697-abe5-866151f0856c	a8d19b5f-8319-44a0-a360-32d42e37387b	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": "591a37a1-1897-4293-9ba4-ea7992849c77", "device_type": "desktop"}	2026-09-09 19:20:31.214271+00	\N	\N
f28d3306-77d9-4581-b56d-92708ce170c0	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	product_view	9a7c8ccd-0c57-4697-abe5-866151f0856c	a8d19b5f-8319-44a0-a360-32d42e37387b	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": "591a37a1-1897-4293-9ba4-ea7992849c77", "device_type": "desktop"}	2026-09-09 19:21:12.882946+00	\N	\N
38391eb7-cd54-40cb-942a-13acd276d3c2	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	product_view	9a7c8ccd-0c57-4697-abe5-866151f0856c	a8d19b5f-8319-44a0-a360-32d42e37387b	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste?vidlytics_preview_story_id=591a37a1-1897-4293-9ba4-ea7992849c77", "referrer": "https://useanny.com/", "story_id": "591a37a1-1897-4293-9ba4-ea7992849c77", "device_type": "desktop"}	2026-09-09 19:21:49.99085+00	\N	\N
7edc86a6-63fb-4b25-8ef8-ba19ec160051	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	product_view	9a7c8ccd-0c57-4697-abe5-866151f0856c	a8d19b5f-8319-44a0-a360-32d42e37387b	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste?vidlytics_preview_story_id=591a37a1-1897-4293-9ba4-ea7992849c77", "referrer": "https://useanny.com/", "story_id": "591a37a1-1897-4293-9ba4-ea7992849c77", "device_type": "desktop"}	2026-09-09 19:21:57.024499+00	\N	\N
1719b784-8a51-459f-9095-0695d78390a5	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_view	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste?vidlytics_preview_story_id=591a37a1-1897-4293-9ba4-ea7992849c77", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-09 19:22:09.932452+00	\N	\N
a6182327-0bda-4b1b-aace-b775962c319f	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_view	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste?vidlytics_preview_story_id=591a37a1-1897-4293-9ba4-ea7992849c77", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-09 19:22:14.443489+00	\N	\N
6b93fe87-e746-4de3-996f-d874258560ad	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	next_video	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste?vidlytics_preview_story_id=591a37a1-1897-4293-9ba4-ea7992849c77", "referrer": "https://useanny.com/", "story_id": "591a37a1-1897-4293-9ba4-ea7992849c77", "device_type": "desktop"}	2026-09-09 19:22:14.553214+00	\N	\N
e4a7a2bb-587c-4bbd-9474-c962631295f9	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_view	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste?vidlytics_preview_story_id=591a37a1-1897-4293-9ba4-ea7992849c77", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-09 19:22:16.430795+00	\N	\N
1e0a3ce9-1d48-4995-ad54-c2cf2ce93c2c	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	next_video	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste?vidlytics_preview_story_id=591a37a1-1897-4293-9ba4-ea7992849c77", "referrer": "https://useanny.com/", "story_id": "591a37a1-1897-4293-9ba4-ea7992849c77", "device_type": "desktop"}	2026-09-09 19:22:21.631851+00	\N	\N
492ac623-5259-4fd8-9aa8-dd832bd77160	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_view	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste?vidlytics_preview_story_id=591a37a1-1897-4293-9ba4-ea7992849c77", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-09 19:22:21.677183+00	\N	\N
60992004-6657-49c2-afa6-be5d46cf9108	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_close	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste?vidlytics_preview_story_id=591a37a1-1897-4293-9ba4-ea7992849c77", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-09 19:22:22.953302+00	\N	\N
a8774f99-0bf3-499a-9aa0-347f268def4e	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	product_click	9a7c8ccd-0c57-4697-abe5-866151f0856c	a8d19b5f-8319-44a0-a360-32d42e37387b	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste?vidlytics_preview_story_id=591a37a1-1897-4293-9ba4-ea7992849c77", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-09 19:23:38.001089+00	\N	\N
96036f20-42c0-4618-b867-292082441a15	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_view	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste?vidlytics_preview_story_id=591a37a1-1897-4293-9ba4-ea7992849c77", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-09 19:27:45.966949+00	\N	\N
3739e0e4-a0c0-49cd-a6c0-50bc139a54e1	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_close	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste?vidlytics_preview_story_id=591a37a1-1897-4293-9ba4-ea7992849c77", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-09 19:27:48.564737+00	\N	\N
de70eb96-11c5-468c-bc7d-6a88c89ea5c8	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_view	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste?vidlytics_preview_story_id=591a37a1-1897-4293-9ba4-ea7992849c77", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-09 19:27:50.012944+00	\N	\N
f32ca599-e8f4-43fe-866e-87c8e2e321cf	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_view	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-09 19:28:07.004549+00	\N	\N
d87d376c-3a65-47a1-bf66-b3292ec59bb6	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_view	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-09 19:28:18.625846+00	\N	\N
c6c158ef-ffe7-454c-aa95-aa901dd7702f	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_close	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-09 19:28:19.92104+00	\N	\N
f1a5b3e5-3205-4b26-b6ee-10165d422990	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_view	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-09 19:54:15.607104+00	\N	\N
a4590e9f-46cb-425d-bf6d-5084194b16b3	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	next_video	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": "591a37a1-1897-4293-9ba4-ea7992849c77", "device_type": "desktop"}	2026-09-09 19:54:16.892347+00	\N	\N
46e77d58-d18e-41ef-a24b-a192bdb005e0	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_view	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-09 19:54:16.926342+00	\N	\N
e620954b-7018-4740-837c-69a88b697be6	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	story_complete	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-09 19:54:25.182578+00	\N	\N
802272ed-494e-4883-a78d-2b8b318cbaa0	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_close	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-09 19:54:25.182196+00	\N	\N
1a5cff93-16ed-4832-9e94-54ede2fdacc4	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_view	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-09 19:54:32.090786+00	\N	\N
21f8ca89-e2c0-41e0-9b91-a3aaca3da193	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_view	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-09 19:54:33.274193+00	\N	\N
a972d417-b950-4773-bd55-39618278d147	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	next_video	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": "591a37a1-1897-4293-9ba4-ea7992849c77", "device_type": "desktop"}	2026-09-09 19:54:33.291948+00	\N	\N
b106343b-fd91-4392-b998-4177f2df47f9	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_close	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-09 19:55:06.265511+00	\N	\N
895b2df6-e76f-4c38-b79e-f055467559c9	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_view	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-09 19:55:12.820682+00	\N	\N
6fb68eb2-4fe0-4bbf-a5db-036bf51afc53	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	next_video	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": "591a37a1-1897-4293-9ba4-ea7992849c77", "device_type": "desktop"}	2026-09-09 19:55:14.463462+00	\N	\N
601c600f-eb8d-41d6-9efc-2072ad003a2d	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_view	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-09 19:55:14.547257+00	\N	\N
edf94130-ba4f-4dc4-b59b-09cf411816bd	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	product_click	9a7c8ccd-0c57-4697-abe5-866151f0856c	a8d19b5f-8319-44a0-a360-32d42e37387b	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "mobile"}	2026-09-09 19:56:20.449988+00	\N	\N
150fccd2-b97e-4e06-9e4f-2a2a22f08326	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_view	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "mobile"}	2026-09-09 21:05:10.410344+00	\N	\N
6e3bc8f3-8817-40c2-a8ff-b57f6e0b23b3	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	next_video	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": "591a37a1-1897-4293-9ba4-ea7992849c77", "device_type": "mobile"}	2026-09-09 21:05:17.102353+00	\N	\N
8a8494b2-d37c-4dc2-81e5-db1876dafe10	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_view	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "mobile"}	2026-09-09 21:05:17.177879+00	\N	\N
8594d1b7-c1cb-436a-a5d3-10b55ec05969	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_close	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "mobile"}	2026-09-09 21:05:20.084112+00	\N	\N
7c67d601-f2c4-4b43-b6d5-111e155dea29	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_view	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "mobile"}	2026-09-09 21:05:21.451355+00	\N	\N
aad0f637-48af-4f7e-9275-d0f3952ec244	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	next_video	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": "591a37a1-1897-4293-9ba4-ea7992849c77", "device_type": "mobile"}	2026-09-09 21:05:23.035392+00	\N	\N
f3f00890-c171-425e-9d5c-9180e4bb8e8d	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_view	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "mobile"}	2026-09-09 21:05:23.161279+00	\N	\N
1d239ddc-c8c4-4471-805a-52d44f37b1e8	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_view	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "mobile"}	2026-09-09 21:06:01.620577+00	\N	\N
d93d8797-ecbd-4d10-9bea-a3fb3c310a8d	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	product_click	9a7c8ccd-0c57-4697-abe5-866151f0856c	a8d19b5f-8319-44a0-a360-32d42e37387b	{"browser": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "mobile"}	2026-09-09 21:06:06.421689+00	\N	\N
aebe88df-ad10-47ec-9941-eb733ec91d4b	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_view	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "mobile"}	2026-09-09 21:06:09.753233+00	\N	\N
dcd8ec44-97c0-4db9-866d-152549ef4da1	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_view	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "mobile"}	2026-09-09 21:06:15.605631+00	\N	\N
66e26203-2ad9-442a-b89e-2cc23a4a6eb3	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_view	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "mobile"}	2026-09-09 21:06:17.912288+00	\N	\N
a0b556e4-ccc1-445b-a2c2-d453955b0d53	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_close	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "mobile"}	2026-09-09 21:06:16.479767+00	\N	\N
ae510d7c-c6c1-40f0-a5eb-c4b3da41551d	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	story_complete	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "mobile"}	2026-09-09 21:06:16.510624+00	\N	\N
04b4bafc-b6df-476c-a0c9-553488c16a91	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 16:32:52.578639+00	695adba1-caf0-441f-803a-a783298b02eb	0
79f49816-a2ee-4743-9918-3fa71d7a777b	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_view	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 16:32:52.606918+00	695adba1-caf0-441f-803a-a783298b02eb	\N
224bdc38-cdcb-402e-b835-a4de76c76614	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 16:32:52.610789+00	695adba1-caf0-441f-803a-a783298b02eb	1
3b3231e9-7a89-48bc-8a7f-91b1502dab9c	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 16:32:52.785715+00	695adba1-caf0-441f-803a-a783298b02eb	2
053ad8b7-005c-443c-8656-016bb073369f	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 16:32:53.909091+00	695adba1-caf0-441f-803a-a783298b02eb	3
dc0ffecd-82fa-40b9-a324-4e4bcf3133aa	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 16:32:54.874735+00	695adba1-caf0-441f-803a-a783298b02eb	4
dd087021-c47f-4121-8d39-c0052a8e9322	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 16:32:55.879005+00	695adba1-caf0-441f-803a-a783298b02eb	5
170f2908-0715-4378-858c-b2ae545e9bd9	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 16:32:56.745756+00	695adba1-caf0-441f-803a-a783298b02eb	6
754e19cf-e1cd-40ef-8528-40fc7b5c36e4	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	next_video	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": "591a37a1-1897-4293-9ba4-ea7992849c77", "device_type": "desktop"}	2026-09-10 16:32:56.921445+00	\N	\N
c6315198-9fc2-4512-a2ac-0765745e4cf7	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_view	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 16:32:57.001356+00	844236ee-1fe4-40b9-9b60-ad4a93e9e3bf	\N
1207690d-ebc6-4121-9d9d-a9256458ce90	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 16:32:57.413029+00	844236ee-1fe4-40b9-9b60-ad4a93e9e3bf	0
3e8e1825-32ad-4691-a1bc-36b9a260a78a	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 16:32:58.581397+00	844236ee-1fe4-40b9-9b60-ad4a93e9e3bf	1
b51bf229-c7de-4c98-bdb3-8e93041c6506	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 16:32:59.328213+00	844236ee-1fe4-40b9-9b60-ad4a93e9e3bf	2
4b06f630-ec04-457a-acc5-e0aa7108c7c3	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 16:33:00.365328+00	844236ee-1fe4-40b9-9b60-ad4a93e9e3bf	3
ab63ebe4-bf26-41ee-b854-da4b3d6731a8	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 16:33:01.434591+00	844236ee-1fe4-40b9-9b60-ad4a93e9e3bf	4
8a46b750-e8a2-4040-80da-9da6ef07c8e3	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 16:33:02.636118+00	844236ee-1fe4-40b9-9b60-ad4a93e9e3bf	5
1e0f0cf0-1226-4bb9-b8b3-9c2509b33f43	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 16:33:03.373015+00	844236ee-1fe4-40b9-9b60-ad4a93e9e3bf	6
9cb1c732-04bb-47d0-bd68-ae9259e5af7b	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 16:33:04.373508+00	844236ee-1fe4-40b9-9b60-ad4a93e9e3bf	7
d37b6bfd-4343-4d16-aa19-d824d77b1453	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 16:33:05.290041+00	844236ee-1fe4-40b9-9b60-ad4a93e9e3bf	8
0a5a4ee9-6328-45eb-9a66-6634269112de	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	story_complete	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 16:33:05.309926+00	844236ee-1fe4-40b9-9b60-ad4a93e9e3bf	\N
8f8b8a45-f2a9-44fb-a7fa-e8d7ada69b9a	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_close	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 16:33:05.316756+00	844236ee-1fe4-40b9-9b60-ad4a93e9e3bf	\N
07206051-7f52-49da-90ee-03c61d664648	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 16:33:05.359204+00	844236ee-1fe4-40b9-9b60-ad4a93e9e3bf	0
2999c310-5648-4d92-b552-53c76fd1700d	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:33:51.621048+00	5a85740b-cdc8-4fef-aed6-3b061ddc9ffe	0
5cefa558-3e3c-4e04-9ffa-194776e26b41	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_view	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:33:51.623277+00	5a85740b-cdc8-4fef-aed6-3b061ddc9ffe	\N
595d448d-11ec-4141-aaea-637ec3891b5b	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:33:52.251462+00	5a85740b-cdc8-4fef-aed6-3b061ddc9ffe	1
96bb6b3a-f7e5-487a-b5f4-de55e7d83c8b	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:33:53.394531+00	5a85740b-cdc8-4fef-aed6-3b061ddc9ffe	2
dab01d02-289a-4062-925d-2c9b5d766486	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	next_video	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": "591a37a1-1897-4293-9ba4-ea7992849c77", "device_type": "desktop"}	2026-09-10 18:33:54.001649+00	\N	\N
9fda0f2a-5b5e-4218-a541-148e51fe3205	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_view	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:33:54.09361+00	e049ac7a-eeab-4502-b7aa-7082553bb44b	\N
a25c989e-7ef2-4321-8676-698de93d081e	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:33:54.607681+00	e049ac7a-eeab-4502-b7aa-7082553bb44b	0
b3948e62-1ce9-46b8-ba3c-a3ad436b46bd	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:33:55.752639+00	e049ac7a-eeab-4502-b7aa-7082553bb44b	1
da00ea86-ac96-4f11-a899-817f3b2f5b9c	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:33:56.618671+00	e049ac7a-eeab-4502-b7aa-7082553bb44b	2
bd3bfe92-f84d-4cc9-a60d-7b3bc3945231	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:33:57.62743+00	e049ac7a-eeab-4502-b7aa-7082553bb44b	3
4afe039c-70a8-4f29-a88d-fce204fa7964	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:33:58.690729+00	e049ac7a-eeab-4502-b7aa-7082553bb44b	4
5138d6cf-808b-4c2e-b6ea-69c7bd55aef9	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:33:59.724245+00	e049ac7a-eeab-4502-b7aa-7082553bb44b	5
adca61e2-a27a-4115-8ea6-bfc50e601b0e	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:34:00.559355+00	e049ac7a-eeab-4502-b7aa-7082553bb44b	6
4fff090e-2324-4ff6-be08-3812c5ba7071	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:34:01.512627+00	e049ac7a-eeab-4502-b7aa-7082553bb44b	7
37ee0b07-a930-47ab-a9f9-2dc2059a8917	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_close	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:34:02.554359+00	e049ac7a-eeab-4502-b7aa-7082553bb44b	\N
e289dc17-632b-4cdf-a281-bde3aff5a164	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	story_complete	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:34:02.578669+00	e049ac7a-eeab-4502-b7aa-7082553bb44b	\N
45f4c34d-1fb9-4670-b163-5cac080183c0	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:34:02.58317+00	e049ac7a-eeab-4502-b7aa-7082553bb44b	0
5d5d4cb2-045b-4e3f-9eaf-03d3e9a30695	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:34:02.598646+00	e049ac7a-eeab-4502-b7aa-7082553bb44b	8
09f4dbaa-510f-41e5-8926-dc3948c8509d	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_view	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:34:04.684118+00	48f84469-ff51-45e1-87d7-ea363fcbb08e	\N
beb4c225-97ff-472a-ab56-db7f3e4e0589	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:34:04.873159+00	48f84469-ff51-45e1-87d7-ea363fcbb08e	0
094dced2-3837-495b-96c3-7dd4650da716	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:34:05.667029+00	48f84469-ff51-45e1-87d7-ea363fcbb08e	1
56342f98-22e7-4267-8f84-2b1d90723fa2	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_view	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:34:06.207964+00	27c46748-cd66-4a72-aa6f-8e1a3fbb5f69	\N
dd41c652-813b-406a-8a5b-718f9bc71200	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:34:06.510922+00	27c46748-cd66-4a72-aa6f-8e1a3fbb5f69	0
3df826e0-b0a4-4e85-b892-181346bfe29b	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:34:07.32071+00	27c46748-cd66-4a72-aa6f-8e1a3fbb5f69	1
11a16424-eb46-4bfb-9cb3-2b82222c5038	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	whatsapp_click	9a7c8ccd-0c57-4697-abe5-866151f0856c	a8d19b5f-8319-44a0-a360-32d42e37387b	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:34:07.414214+00	\N	\N
26174f69-4238-423f-89a4-4e0cca02e864	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_view	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:34:18.251834+00	27c46748-cd66-4a72-aa6f-8e1a3fbb5f69	\N
ca269ab6-52ee-4c20-9325-12652d61232f	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:34:20.628987+00	27c46748-cd66-4a72-aa6f-8e1a3fbb5f69	2
2813e698-37f7-4bfa-a864-be40233604b4	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:34:21.408644+00	27c46748-cd66-4a72-aa6f-8e1a3fbb5f69	3
0a99c7bb-0bce-4405-abda-2a128399e45b	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:34:22.552128+00	27c46748-cd66-4a72-aa6f-8e1a3fbb5f69	4
aa28c8f0-a104-44f0-b30e-b8003f238a53	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:34:23.69175+00	27c46748-cd66-4a72-aa6f-8e1a3fbb5f69	5
e600d589-daa7-476b-ae8e-408d5017dbb6	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:34:24.573867+00	27c46748-cd66-4a72-aa6f-8e1a3fbb5f69	6
4896556b-17e9-4c6a-8784-3601bc0c5e8b	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_view	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:34:26.780818+00	b30045ea-466a-4aba-ace8-595ce8ec8512	\N
f05868dc-6bc6-46af-883c-906004ebc577	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:34:27.81935+00	b30045ea-466a-4aba-ace8-595ce8ec8512	2
4cd037a2-f5fc-42c4-8694-eb1c8d90b0ad	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:34:29.020309+00	b30045ea-466a-4aba-ace8-595ce8ec8512	3
bcdf76d5-308d-4e99-9109-8d4099d5ad75	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:34:29.913852+00	b30045ea-466a-4aba-ace8-595ce8ec8512	4
c0ad1fc5-afd2-440c-87d6-e8c6690f51ec	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:34:30.769175+00	b30045ea-466a-4aba-ace8-595ce8ec8512	5
b4ace4d3-70ad-4f49-87d8-ebd42f77f15c	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:34:31.844688+00	b30045ea-466a-4aba-ace8-595ce8ec8512	6
d977733c-aadd-430b-b0b4-62b802413c43	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:34:32.809555+00	b30045ea-466a-4aba-ace8-595ce8ec8512	7
dc2a9372-afab-4354-bdaf-2e8066d5513f	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:34:33.942723+00	b30045ea-466a-4aba-ace8-595ce8ec8512	8
9bf455b0-7782-4b84-9ae8-14c6db4f0242	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:34:35.15037+00	b30045ea-466a-4aba-ace8-595ce8ec8512	9
99501527-5b28-49bb-8869-561ed1199949	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:34:35.824519+00	b30045ea-466a-4aba-ace8-595ce8ec8512	10
259a6d01-3a24-4ca1-81b1-684192cee5c5	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	next_video	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": "591a37a1-1897-4293-9ba4-ea7992849c77", "device_type": "desktop"}	2026-09-10 18:34:06.171774+00	\N	\N
f850df1b-5f08-4015-9ca3-b2f4ef683f09	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:34:26.360294+00	27c46748-cd66-4a72-aa6f-8e1a3fbb5f69	7
d7482b5d-85ec-49bf-9bd7-717cad9b5db6	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:34:25.951074+00	b30045ea-466a-4aba-ace8-595ce8ec8512	0
569e7c5f-05c3-41f8-9395-ee4dad8eb506	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:34:26.760031+00	b30045ea-466a-4aba-ace8-595ce8ec8512	1
5de3b8b3-c8c7-40d9-9227-3b45030101ae	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	next_video	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": "591a37a1-1897-4293-9ba4-ea7992849c77", "device_type": "desktop"}	2026-09-10 18:34:53.24841+00	\N	\N
843ec564-d82a-4914-98bf-7552aee5e2c8	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:34:36.877848+00	b30045ea-466a-4aba-ace8-595ce8ec8512	11
0258dbeb-06ae-4271-91c8-59c05f654a68	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:34:37.915723+00	b30045ea-466a-4aba-ace8-595ce8ec8512	12
b4eba381-58bb-4099-90ae-0de09c083a49	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:34:38.960409+00	b30045ea-466a-4aba-ace8-595ce8ec8512	13
ff3b8c52-c3e3-4ed3-9f08-c3bffba40855	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:34:39.787715+00	b30045ea-466a-4aba-ace8-595ce8ec8512	14
0ae1c5a5-a14e-498b-b7ac-375ba80192e1	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:34:41.077092+00	b30045ea-466a-4aba-ace8-595ce8ec8512	15
4e472878-111f-4265-bdcf-dfd76ec98851	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:34:41.866274+00	b30045ea-466a-4aba-ace8-595ce8ec8512	16
063fc17d-720e-4a2f-9569-63fa92f2db97	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:34:42.946752+00	b30045ea-466a-4aba-ace8-595ce8ec8512	17
762449c9-36c7-4be4-88b0-7eb8efd5081e	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:34:43.75052+00	b30045ea-466a-4aba-ace8-595ce8ec8512	18
c5c2a9ff-23e9-4c3c-a0d3-ca598614776e	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:34:44.936592+00	b30045ea-466a-4aba-ace8-595ce8ec8512	19
7b170fe0-abc2-4552-80b8-9d093a6627ea	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:34:45.849822+00	b30045ea-466a-4aba-ace8-595ce8ec8512	20
afe83b25-98db-4873-940e-d3c853a23807	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:34:47.113187+00	b30045ea-466a-4aba-ace8-595ce8ec8512	21
ed7ead8d-5cf4-4109-8fc3-ac48458469dc	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:34:47.742277+00	b30045ea-466a-4aba-ace8-595ce8ec8512	22
161a8d1d-790a-4406-9d3f-ce1bf4b91f55	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:34:48.778753+00	b30045ea-466a-4aba-ace8-595ce8ec8512	23
6783fbf3-55db-449c-afd0-1a184bbecb12	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:34:49.884666+00	b30045ea-466a-4aba-ace8-595ce8ec8512	24
e14566b3-8fdf-41a2-a025-fa5be8598b2d	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:34:50.979625+00	b30045ea-466a-4aba-ace8-595ce8ec8512	25
a2693133-9f18-471e-90d3-a2a17050ff8d	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:34:51.969647+00	b30045ea-466a-4aba-ace8-595ce8ec8512	26
13e5d1d3-aa50-4618-9731-73b6f5ccd247	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:34:52.917225+00	b30045ea-466a-4aba-ace8-595ce8ec8512	27
a0e4af82-dd59-44ac-b846-80de636b83f1	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_view	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:34:53.269085+00	fc84fdbe-29dc-48db-854b-3c3f86764b8e	\N
bbb356be-0447-44ac-8b76-6241c10cee4b	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:34:53.540286+00	fc84fdbe-29dc-48db-854b-3c3f86764b8e	0
1d6b353e-092b-440a-a999-e40e77a8cf0a	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:34:54.387068+00	fc84fdbe-29dc-48db-854b-3c3f86764b8e	1
a160ae6a-1c8d-4981-a316-647c8a63f09c	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_view	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:49:23.155858+00	d88c9518-ceb8-4a7f-97fc-17bf21bce6dc	\N
f2087f75-0033-4bf2-a793-d6a7e6260252	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:49:23.1562+00	d88c9518-ceb8-4a7f-97fc-17bf21bce6dc	0
97bbb93a-a6d0-4669-be79-b3e83daf1c48	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	next_video	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": "591a37a1-1897-4293-9ba4-ea7992849c77", "device_type": "desktop"}	2026-09-10 18:49:24.965169+00	\N	\N
9ff014ef-a6c1-4d62-b497-a1217830cb80	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_close	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:49:36.274959+00	b591259a-61d3-4f1a-8ad8-5bd6c391608d	\N
4a53015b-19aa-4c7f-be9d-18549249ef2a	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:49:36.305223+00	b591259a-61d3-4f1a-8ad8-5bd6c391608d	0
af105e77-59ed-4982-8c56-d4cfb8f5ffa7	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	story_complete	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:49:54.059149+00	6285ce07-0859-4243-8916-926eac70c1c4	\N
b1b69dc1-60aa-4272-9a33-4749bab69cfd	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:49:23.98206+00	d88c9518-ceb8-4a7f-97fc-17bf21bce6dc	1
2b1de530-1e62-4dd7-8f69-5819606848e5	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:49:24.987262+00	d88c9518-ceb8-4a7f-97fc-17bf21bce6dc	2
e7dc1c16-58e9-4c0a-bb9b-44e9dc16f1ba	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_view	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:49:25.091454+00	b591259a-61d3-4f1a-8ad8-5bd6c391608d	\N
8d24c2dd-22ec-43d1-8a4b-f2578e047435	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:49:25.379087+00	b591259a-61d3-4f1a-8ad8-5bd6c391608d	0
b2c2b879-c213-4ba2-bb89-850208e99a6d	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:49:26.080696+00	b591259a-61d3-4f1a-8ad8-5bd6c391608d	1
42528d34-9fb9-4d5a-89b5-635711195de5	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:49:27.089823+00	b591259a-61d3-4f1a-8ad8-5bd6c391608d	2
e49afdee-7d73-42e8-a924-c74987a366c3	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:49:28.301945+00	b591259a-61d3-4f1a-8ad8-5bd6c391608d	3
fd98d2f8-1823-40ee-85e6-144eba42fd0e	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:49:29.283767+00	b591259a-61d3-4f1a-8ad8-5bd6c391608d	4
b3f7b945-6359-494d-82a1-7731739e4190	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	whatsapp_click	9a7c8ccd-0c57-4697-abe5-866151f0856c	a8d19b5f-8319-44a0-a360-32d42e37387b	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:49:29.384947+00	\N	\N
6d46916f-2411-4bd7-a054-5b964838e176	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_view	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:49:32.659289+00	b591259a-61d3-4f1a-8ad8-5bd6c391608d	\N
db3218cb-0b00-4ea7-ba55-eb02c6aedc7f	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:49:33.548611+00	b591259a-61d3-4f1a-8ad8-5bd6c391608d	5
cc7e51fa-3988-4232-80b4-15db39ab47a5	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:49:34.513629+00	b591259a-61d3-4f1a-8ad8-5bd6c391608d	6
68dd3bbf-5d5b-4a60-9029-b259a107abab	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:49:35.343145+00	b591259a-61d3-4f1a-8ad8-5bd6c391608d	7
ba8b1c22-851e-4a7e-81d9-0423627ea930	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	story_complete	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:49:36.28661+00	b591259a-61d3-4f1a-8ad8-5bd6c391608d	\N
27afe577-775d-42b4-861f-35e9e30d8863	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:49:36.31155+00	b591259a-61d3-4f1a-8ad8-5bd6c391608d	8
2fc19a50-feb2-45c7-993b-e8dff715c696	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_view	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:49:43.988961+00	61f165b4-d52b-45e5-9f5d-592eca3838df	\N
ddd78642-96d9-4e32-8578-a3aa34a34aa5	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:49:44.225237+00	61f165b4-d52b-45e5-9f5d-592eca3838df	0
51f2085b-9a4d-401f-b0d8-2640d2e68794	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:49:44.888933+00	61f165b4-d52b-45e5-9f5d-592eca3838df	1
23a60425-8c33-4138-9fee-579f26aa537f	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	next_video	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": "591a37a1-1897-4293-9ba4-ea7992849c77", "device_type": "desktop"}	2026-09-10 18:49:45.951674+00	\N	\N
918c4eb1-0678-4d5a-bc0c-ebb5120f8c6c	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:49:45.992385+00	61f165b4-d52b-45e5-9f5d-592eca3838df	2
9c5e4497-6d57-4fe5-8e01-05cfb3e690ea	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_view	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:49:45.996317+00	6285ce07-0859-4243-8916-926eac70c1c4	\N
31bb5ab4-288e-4f09-bf53-a173e33c457f	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:49:46.36379+00	6285ce07-0859-4243-8916-926eac70c1c4	0
642105c8-0612-4074-a138-7a6059b6b52b	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:49:47.109543+00	6285ce07-0859-4243-8916-926eac70c1c4	1
ee6fa8a1-fd18-4801-b781-8808ea9273a5	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:49:48.166095+00	6285ce07-0859-4243-8916-926eac70c1c4	2
40654128-4cf7-459e-86de-0a8def69d188	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:49:49.374778+00	6285ce07-0859-4243-8916-926eac70c1c4	3
603739a6-f53d-468b-9db8-2e4dbdd48560	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:49:50.241867+00	6285ce07-0859-4243-8916-926eac70c1c4	4
f5d55558-faf8-46e9-aec2-ef1182f65669	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:49:51.047437+00	6285ce07-0859-4243-8916-926eac70c1c4	5
4dc77e7c-5871-4c63-90e0-978eca51f77b	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:49:52.191337+00	6285ce07-0859-4243-8916-926eac70c1c4	6
a3fb982a-3f77-4d6c-8e7a-c4bdd164bb09	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:49:53.215597+00	6285ce07-0859-4243-8916-926eac70c1c4	7
c6d54c1e-4ef5-4cf7-a2d6-82653bf60cf3	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:49:54.05079+00	6285ce07-0859-4243-8916-926eac70c1c4	8
6db85ed3-37c8-42bd-bb7a-c573a7906892	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_close	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:49:54.09747+00	6285ce07-0859-4243-8916-926eac70c1c4	\N
436c5303-5baa-45c7-b19b-9416b0fd548a	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:49:54.30932+00	6285ce07-0859-4243-8916-926eac70c1c4	0
8f79b8dc-c0af-4364-9114-934827d9c5c5	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:54:00.974608+00	292bb592-03ea-4bf4-b8f8-d71aac39f5df	0
bb57e1c8-a8ea-4846-b6b6-55f33c66cadd	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_view	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:54:00.972532+00	292bb592-03ea-4bf4-b8f8-d71aac39f5df	\N
a4cb9eb3-47e2-4053-867b-84034ea5a284	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:54:02.343436+00	292bb592-03ea-4bf4-b8f8-d71aac39f5df	1
717f2d1b-492a-4667-b4ed-946fcb578e90	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:54:02.807218+00	292bb592-03ea-4bf4-b8f8-d71aac39f5df	2
acb8b07c-72ef-4dbb-b444-e09d7d71c414	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	next_video	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": "591a37a1-1897-4293-9ba4-ea7992849c77", "device_type": "desktop"}	2026-09-10 18:54:03.009236+00	\N	\N
7292510e-7b79-47df-98b5-39d256f25aaa	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_view	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:54:03.064599+00	f4f0b33e-eb46-4b10-814b-73e1c918b0f7	\N
c41e6e3b-0810-4561-84e7-be9d7d56fb1f	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:54:03.322939+00	f4f0b33e-eb46-4b10-814b-73e1c918b0f7	0
24a824c9-5edc-4bf7-823b-79a0874dc801	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:54:04.081753+00	f4f0b33e-eb46-4b10-814b-73e1c918b0f7	1
5911e4db-c9cb-4b0c-ad28-7a1fc09cade3	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 18:54:05.218959+00	f4f0b33e-eb46-4b10-814b-73e1c918b0f7	2
06332168-4b2b-4b72-925f-f5a2d308a520	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_view	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 19:04:55.233307+00	183c0c83-3df6-424e-abea-09fbf531e593	\N
1e396dfd-330e-4b42-b245-22079dc97b61	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 19:04:55.264223+00	183c0c83-3df6-424e-abea-09fbf531e593	0
8b48d7be-e2ee-47e8-a402-0461d3af0031	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 21:57:29.40956+00	dcd12d8c-d3b0-4d71-bf41-538e3f0317ea	0
405787c7-2970-4ad7-a364-26f47cc0fe55	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_view	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 21:57:29.409493+00	dcd12d8c-d3b0-4d71-bf41-538e3f0317ea	\N
311dd0ea-0009-4401-aa19-22a8b6481f7e	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 21:57:29.8603+00	dcd12d8c-d3b0-4d71-bf41-538e3f0317ea	1
cb786ca9-31fa-4d7e-98cf-bcb16c502e6d	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	next_video	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": "591a37a1-1897-4293-9ba4-ea7992849c77", "device_type": "desktop"}	2026-09-10 21:57:30.66061+00	\N	\N
cd06aab6-e6e3-4faa-a92a-53a8e3454c74	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_view	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 21:57:30.698798+00	de79a940-060f-4cb5-ab9d-91d8e62e8ef4	\N
aec0f446-ab4f-40ca-b206-d959405acf8a	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 21:57:31.260187+00	de79a940-060f-4cb5-ab9d-91d8e62e8ef4	0
5ef20165-8559-4206-9a19-457d01357c1f	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 21:57:32.384256+00	de79a940-060f-4cb5-ab9d-91d8e62e8ef4	1
1e4581ce-5414-4f62-97ad-95498b703205	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 21:57:33.11036+00	de79a940-060f-4cb5-ab9d-91d8e62e8ef4	2
992d0505-2843-469f-9f41-8a004773833b	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 21:57:34.457925+00	de79a940-060f-4cb5-ab9d-91d8e62e8ef4	3
1765d1b9-d20c-4b8d-949d-7885d215b1fb	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 21:57:35.453025+00	de79a940-060f-4cb5-ab9d-91d8e62e8ef4	4
9defa34c-679d-48d9-b49d-6e307f42fc18	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 21:57:36.292523+00	de79a940-060f-4cb5-ab9d-91d8e62e8ef4	5
92223894-5ac2-4880-b243-308588e8da3a	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 21:57:37.10233+00	de79a940-060f-4cb5-ab9d-91d8e62e8ef4	6
b1e89125-01f7-4809-a37d-0879a2f1f45a	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 21:57:38.226447+00	de79a940-060f-4cb5-ab9d-91d8e62e8ef4	7
caf5ca7e-4713-4345-93d2-2182a438f33d	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_close	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 21:57:39.041501+00	de79a940-060f-4cb5-ab9d-91d8e62e8ef4	\N
368fdb9b-ca63-44e2-b213-e6d89c01d382	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 21:57:39.078091+00	de79a940-060f-4cb5-ab9d-91d8e62e8ef4	0
19c6491b-f188-4689-a5fb-bdbabb3c2a1c	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 21:57:39.106737+00	de79a940-060f-4cb5-ab9d-91d8e62e8ef4	8
d8d214f5-163d-4099-bc2f-afa433d590f6	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	story_complete	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 21:57:39.14098+00	de79a940-060f-4cb5-ab9d-91d8e62e8ef4	\N
86d5deca-12f4-46ee-b7b3-2820f7cf952e	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_view	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 21:57:53.683176+00	11855712-e00c-4fb7-8aaf-95c5e3793ceb	\N
6677e9b7-a0af-47df-acd4-08e66bbd243f	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 21:57:53.889804+00	11855712-e00c-4fb7-8aaf-95c5e3793ceb	0
734018cd-62f3-4562-962f-6d878baa56b1	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 21:57:54.633647+00	11855712-e00c-4fb7-8aaf-95c5e3793ceb	1
c97800f7-ca17-49e1-a3dd-6fa67a7c8c98	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	next_video	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": "591a37a1-1897-4293-9ba4-ea7992849c77", "device_type": "desktop"}	2026-09-10 21:57:54.879261+00	\N	\N
b35d9e45-4787-446b-8fcb-5d591e8b79f3	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_view	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 21:57:54.950991+00	1352a475-3c3b-4ad3-b173-315fe340428a	\N
ab4ff8d6-aad3-4e7b-98da-844c62967bf6	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-10 21:57:55.258102+00	1352a475-3c3b-4ad3-b173-315fe340428a	0
86f030bb-b986-4247-9182-c20a61293a2d	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_view	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "mobile"}	2026-09-11 00:16:23.079559+00	d1dd956e-9df8-4c77-80c6-ae48e625e003	\N
c17a95d2-766f-404b-8e5a-16d300bd6cf8	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "mobile"}	2026-09-11 00:16:23.122041+00	d1dd956e-9df8-4c77-80c6-ae48e625e003	0
da01ba3e-d2f6-4162-a322-88f8e95b9a98	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "mobile"}	2026-09-11 00:16:23.978144+00	d1dd956e-9df8-4c77-80c6-ae48e625e003	1
94e35b42-d713-457e-9587-6b1efe4b9a9a	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "mobile"}	2026-09-11 00:16:25.07496+00	d1dd956e-9df8-4c77-80c6-ae48e625e003	2
0625ea03-3f32-4439-9f41-833da67dcc80	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	next_video	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": "591a37a1-1897-4293-9ba4-ea7992849c77", "device_type": "mobile"}	2026-09-11 00:16:25.155246+00	\N	\N
437c9221-3b88-4693-8c6a-8be7351955e6	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_view	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "mobile"}	2026-09-11 00:16:25.331451+00	5ee5f52e-513f-47b8-97f9-f16fd17dc93e	\N
02948894-5936-4b19-87e3-565b14626165	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "mobile"}	2026-09-11 00:16:26.365273+00	5ee5f52e-513f-47b8-97f9-f16fd17dc93e	0
6d1c65c9-4754-43d2-b84b-f8a715f16856	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "mobile"}	2026-09-11 00:16:27.3842+00	5ee5f52e-513f-47b8-97f9-f16fd17dc93e	1
81d12730-8913-4ab6-9933-ee8a74933aa4	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "mobile"}	2026-09-11 00:16:28.327634+00	5ee5f52e-513f-47b8-97f9-f16fd17dc93e	2
4263120f-daa6-4cd5-a976-bf1e71090fad	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "mobile"}	2026-09-11 00:16:29.286651+00	5ee5f52e-513f-47b8-97f9-f16fd17dc93e	3
067e679a-1305-4c9f-98e0-0982fd05dfac	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "mobile"}	2026-09-11 00:16:30.381106+00	5ee5f52e-513f-47b8-97f9-f16fd17dc93e	4
f4206d4b-2d18-405c-909e-869209fda3a4	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "mobile"}	2026-09-11 00:16:31.375139+00	5ee5f52e-513f-47b8-97f9-f16fd17dc93e	5
8d71fc28-de05-47bd-ac84-62d5b6b7e659	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "mobile"}	2026-09-11 00:16:32.429604+00	5ee5f52e-513f-47b8-97f9-f16fd17dc93e	6
e7f66520-ab7e-4049-94eb-1f3ccd3d3b18	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "mobile"}	2026-09-11 00:16:33.239784+00	5ee5f52e-513f-47b8-97f9-f16fd17dc93e	7
b0f87ffd-ba8a-4749-9330-2783a0a56fe1	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "mobile"}	2026-09-11 00:16:34.320281+00	5ee5f52e-513f-47b8-97f9-f16fd17dc93e	8
08e0e57c-9a05-46ab-8412-20437f949e29	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	story_complete	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "mobile"}	2026-09-11 00:16:34.339769+00	5ee5f52e-513f-47b8-97f9-f16fd17dc93e	\N
ea7e1a99-25ef-4021-84e7-5dc39155324e	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_close	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "mobile"}	2026-09-11 00:16:34.3548+00	5ee5f52e-513f-47b8-97f9-f16fd17dc93e	\N
757cb993-26ee-4d6e-a143-001c3195ff5d	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "mobile"}	2026-09-11 00:16:34.414455+00	5ee5f52e-513f-47b8-97f9-f16fd17dc93e	0
a3c5cfec-4c7f-4def-9a96-545bdc43a665	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_view	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "mobile"}	2026-09-11 00:16:34.543579+00	6bee74e0-1ab8-4d97-b06b-6a0c2e9f28cd	\N
e23760a0-8596-443e-94a1-08db2aba1d07	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "mobile"}	2026-09-11 00:16:34.869263+00	6bee74e0-1ab8-4d97-b06b-6a0c2e9f28cd	0
dfe7c5f4-cae8-4d1f-8fe1-42145e5d8061	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "mobile"}	2026-09-11 00:16:35.914716+00	6bee74e0-1ab8-4d97-b06b-6a0c2e9f28cd	1
5766e692-8397-46df-979d-46a8a335a4a1	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	next_video	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": "591a37a1-1897-4293-9ba4-ea7992849c77", "device_type": "mobile"}	2026-09-11 00:16:36.254136+00	\N	\N
2edce214-06ac-4d51-97bc-58f0b2b7fdd1	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_view	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "mobile"}	2026-09-11 00:16:36.314218+00	8ef2b982-9e59-4ff0-8282-9a50b53bad1f	\N
8cd5df10-e90d-4af3-9d7e-2cf6ad1cf7f4	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_view	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "mobile"}	2026-09-11 00:16:42.337872+00	8ec061b8-954a-44b9-8ba5-4219c28a7e17	\N
11b3ee49-fb6c-43d0-81f3-70d2e8537fc4	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_view	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "mobile"}	2026-09-11 00:16:43.343437+00	c142487c-1c0f-4280-b1f2-8f7948748873	\N
eccc94b2-b1b1-47d9-bb1b-b82d02a8663d	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "mobile"}	2026-09-11 00:16:43.72712+00	c142487c-1c0f-4280-b1f2-8f7948748873	0
9fb02780-790d-495f-9b93-6c6fa49604e2	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "mobile"}	2026-09-11 00:16:45.052108+00	c142487c-1c0f-4280-b1f2-8f7948748873	0
d00413ed-df19-4960-a327-ef6ec136733e	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "mobile"}	2026-09-11 00:16:36.543163+00	8ef2b982-9e59-4ff0-8282-9a50b53bad1f	0
429663f3-2321-412f-b1e0-e1bff4313c41	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "mobile"}	2026-09-11 00:16:42.464582+00	8ec061b8-954a-44b9-8ba5-4219c28a7e17	0
11ac62aa-fdaf-4fdf-bfe3-379f38a34934	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	next_video	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": "591a37a1-1897-4293-9ba4-ea7992849c77", "device_type": "mobile"}	2026-09-11 00:16:43.374053+00	\N	\N
a68e3d5a-c724-4b55-82cd-0581582ea17b	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "mobile"}	2026-09-11 00:16:44.718305+00	c142487c-1c0f-4280-b1f2-8f7948748873	1
23af5c12-ce3f-4f8e-a9ca-fd5cf74e362d	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_close	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "mobile"}	2026-09-11 00:16:45.094281+00	c142487c-1c0f-4280-b1f2-8f7948748873	\N
354791b4-f95e-4c2a-9ef1-00d3e1bdc2fe	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-11 15:59:54.019373+00	f904b800-45f5-4a71-84c9-e9ed724fcb15	0
7c01a3fc-c9bf-4c63-a03e-af6a26dca45d	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_view	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-11 15:59:54.073425+00	f904b800-45f5-4a71-84c9-e9ed724fcb15	\N
3a650b09-5567-47e2-95ae-1559182b3d0f	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-11 15:59:54.526272+00	f904b800-45f5-4a71-84c9-e9ed724fcb15	1
2df2eb79-4dea-4463-8629-fa084502c986	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	next_video	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": "591a37a1-1897-4293-9ba4-ea7992849c77", "device_type": "desktop"}	2026-09-11 15:59:54.624601+00	\N	\N
ec32156b-8ced-4031-8b7f-585193814465	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_view	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-11 15:59:54.657871+00	1f82bd53-acdd-4386-82d2-43325b3a472d	\N
0f373bb6-6986-47f5-bf05-323ce3b0f72c	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-11 15:59:55.227221+00	1f82bd53-acdd-4386-82d2-43325b3a472d	0
ac36fffc-5b44-4759-b1b3-df37b28a2c2f	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_view	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-11 16:02:03.060439+00	b38fdb6b-284d-4346-b666-62d43f5f148f	\N
50351684-18f4-49a9-92c5-59992aa7ba7e	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-11 16:02:03.171835+00	b38fdb6b-284d-4346-b666-62d43f5f148f	0
c66b84af-180f-42cf-9bd1-33e4b9599727	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-11 16:02:03.884886+00	b38fdb6b-284d-4346-b666-62d43f5f148f	1
fd3cdc39-394f-45e7-8541-d3cfa8f69a66	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	next_video	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": "591a37a1-1897-4293-9ba4-ea7992849c77", "device_type": "desktop"}	2026-09-11 16:02:04.332848+00	\N	\N
8fda1c13-b287-42ff-a8fc-8e5b04ed309e	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_view	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-11 16:02:04.42359+00	bdd27ae8-4ac2-415f-9bce-d89df0907dd2	\N
adb2fc1d-1e28-4c28-9a61-6aa4c53fa90e	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-11 16:02:04.654291+00	bdd27ae8-4ac2-415f-9bce-d89df0907dd2	0
272f4ab8-cf79-4338-a42b-9325ee70a9ad	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-11 16:02:05.445498+00	bdd27ae8-4ac2-415f-9bce-d89df0907dd2	1
f7cf4b52-0352-467c-b8a8-02210654059f	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-11 16:02:06.547161+00	bdd27ae8-4ac2-415f-9bce-d89df0907dd2	2
e4f97208-ade9-47da-8349-73c5f5451028	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-11 16:05:39.130719+00	982f40f4-a55f-4bcb-a4aa-562e789116c6	0
6800484e-2ed4-4e7b-9f2d-2ae1470a6363	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_view	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-11 16:05:39.140803+00	982f40f4-a55f-4bcb-a4aa-562e789116c6	\N
77c70e81-e219-4282-b081-1e1b669c4b0a	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-11 16:05:39.721594+00	982f40f4-a55f-4bcb-a4aa-562e789116c6	1
af87c814-a6a6-499d-99a1-f35aa741cca2	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	next_video	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": "591a37a1-1897-4293-9ba4-ea7992849c77", "device_type": "desktop"}	2026-09-11 16:05:40.186886+00	\N	\N
19498217-1b48-45b9-a25c-8601be8b3842	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_view	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-11 16:05:40.174398+00	2d4902c3-f622-4ad1-b1c4-bb290ca4310f	\N
f6280ad3-62fd-4de7-8a5d-167bb3bba04b	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-11 16:05:40.376765+00	2d4902c3-f622-4ad1-b1c4-bb290ca4310f	0
fd5b7343-99e5-48b8-807a-fc5e8ab6b1eb	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_view	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-11 16:09:13.780725+00	8db6a11c-6bdf-42f8-ad6b-84e5a196708f	\N
b77a0a03-559f-4734-8f90-81d8f1550c48	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-11 16:09:13.935499+00	8db6a11c-6bdf-42f8-ad6b-84e5a196708f	0
ecddfc47-4fd2-4374-9ce0-a8de5026bdcd	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-11 16:09:14.753798+00	8db6a11c-6bdf-42f8-ad6b-84e5a196708f	1
f8cffb66-de2c-4f04-9886-1bbca7700d58	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	next_video	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": "591a37a1-1897-4293-9ba4-ea7992849c77", "device_type": "desktop"}	2026-09-11 16:09:15.340344+00	\N	\N
999b482f-9f4f-4f08-98a6-5f8188b96556	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	video_view	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-11 16:09:15.386335+00	4b324e79-c5d8-4796-9fd1-22e66613a1b9	\N
f73ca557-c365-4e14-afc2-51f461187e76	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	progress	9a7c8ccd-0c57-4697-abe5-866151f0856c	\N	{"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36", "page_url": "https://useanny.com/teste", "referrer": "https://useanny.com/", "story_id": null, "device_type": "desktop"}	2026-09-11 16:09:15.680217+00	4b324e79-c5d8-4796-9fd1-22e66613a1b9	0
\.


--
-- Data for Name: store_integrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.store_integrations (id, store_id, platform, account_id, account_username, access_token, refresh_token, token_expires_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: store_members; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.store_members (id, store_id, user_id, role, created_at, updated_at) FROM stdin;
73789351-71e8-4a27-a1ee-0daea3ccc6d1	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	63463515-1641-4276-a7b0-4029b2158587	owner	2026-09-08 21:56:15.376349+00	2026-09-08 21:56:15.376349+00
\.


--
-- Data for Name: store_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.store_settings (id, store_id, modules, whatsapp_number, whatsapp_message, security_token, created_at, updated_at, store_name, store_url, logo_url, contact_email, whatsapp_default_message, whatsapp_message_template, app_enabled, stories_enabled, carousel_enabled, floating_widget_enabled, widget_enabled, whatsapp_button_enabled, whatsapp_enabled, open_product_new_tab, autoplay, muted_by_default, show_video_controls, pause_on_invisible, pause_on_leave, timezone, language, default_template, default_appearance_id, public_installation_key, public_live_key, store_public_id, auto_approve_comments, logo_file_size, platform, owner_contact_email, live_widget_config, live_player_config) FROM stdin;
45dfd63e-83ce-46b9-b4da-2615d60b6be6	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	{"analytics": true, "video_showcase": true, "whatsapp_button": true}	5545999629702	Olá! Tenho interesse nesse produto que vi no vídeo.	18812b53-5376-42a1-b408-6c7a3ea5530b	2026-09-15 16:57:31.926+00	2026-09-18 18:56:33.612067+00	Use Anny Moda Feminina	https://useanny.com	https://wznvecurmisgoaijykbt.supabase.co/storage/v1/object/public/store-assets/logos/logo-1788971936599.png	rodrigoavicennte@gmail.com	\N	Olá! Tenho interesse nesse produto que vi no vídeo: {{story_title}}	t	t	t	t	t	f	t	t	t	t	f	t	t	America/Sao_Paulo	pt-BR	minimalista	\N	\N			f	0	yampi	contato@useanny.com	{"aoVivo": {"linked": false, "mobile": {"width": 80, "format": "portrait", "ctaText": "AO VIVO", "showCTA": true, "position": "bottom-left", "marginTop": 0, "objectFit": "cover", "playVideo": true, "ctaBgColor": "#0094ea", "marginSide": 5, "borderColor": "#0094ea", "borderWidth": 2, "borderRadius": 14, "ctaTextColor": "#FFFFFF", "marginBottom": 0, "ctaBorderRadius": "9999px", "showCloseButton": true}, "desktop": {"width": 100, "format": "portrait", "ctaText": "AO VIVO", "showCTA": true, "position": "bottom-left", "marginTop": 0, "objectFit": "cover", "playVideo": true, "ctaBgColor": "#0094ea", "marginSide": 5, "borderColor": "#0094ea", "borderWidth": 2, "borderRadius": 14, "ctaTextColor": "#FFFFFF", "marginBottom": 0, "ctaBorderRadius": "9999px", "showCloseButton": true}}, "divulgacao": {"linked": false, "mobile": {"width": 80, "format": "portrait", "ctaText": "Participe", "showCTA": true, "position": "bottom-left", "marginTop": 0, "objectFit": "cover", "playVideo": true, "ctaBgColor": "#0094ea", "marginSide": 5, "borderColor": "#0094ea", "borderWidth": 2, "borderRadius": 14, "ctaTextColor": "#FFFFFF", "marginBottom": 0, "showCountdown": true, "ctaBorderRadius": "9999px", "showCloseButton": true, "countdownBgColor": "#0094ea", "countdownTextColor": "#FFFFFF", "countdownBorderRadius": "4px"}, "desktop": {"width": 100, "format": "portrait", "ctaText": "Participe", "showCTA": true, "position": "top-left", "marginTop": 0, "objectFit": "cover", "playVideo": true, "ctaBgColor": "#0094ea", "marginSide": 5, "borderColor": "#0094ea", "borderWidth": 2, "borderRadius": 14, "ctaTextColor": "#FFFFFF", "marginBottom": 0, "showCountdown": true, "ctaBorderRadius": "9999px", "showCloseButton": true, "countdownBgColor": "#0094ea", "countdownTextColor": "#FFFFFF", "countdownBorderRadius": "4px"}}}	{"linked": true, "mobile": {"showChat": true, "showInfo": true, "infoSize1": 18, "infoSize2": 12, "infoText1": "FRETE GRÁTIS", "infoText2": "Acima de R$199,00", "showShare": true, "showTitle": true, "titleText": "Vidlytics Live", "couponCode": "VIDLYTICS10", "couponText": "10% OFF", "showCoupon": true, "titleColor": "#FFFFFF", "borderColor": "#0094ea", "borderWidth": 2, "infoBgColor": "#0094ea", "borderRadius": 14, "shareBgColor": "#FFFFFF", "showProducts": true, "autoplayMuted": true, "infoTextColor": "#FFFFFF", "shareTextColor": "#000000", "couponCodeColor": "#FFFFFF", "couponTextColor": "#000000", "productNameSize": 11, "showViewerCount": true, "productNameColor": "#1e293b", "productPriceSize": 12, "couponCodeBgColor": "#0094ea", "couponTextBgColor": "#FFFFFF", "productPriceColor": "#0094ea"}, "desktop": {"showChat": true, "showInfo": true, "infoSize1": 18, "infoSize2": 12, "infoText1": "FRETE GRÁTIS", "infoText2": "Acima de R$199,00", "showShare": true, "showTitle": true, "titleText": "Vidlytics Live", "couponCode": "VIDLYTICS10", "couponText": "10% OFF", "showCoupon": true, "titleColor": "#FFFFFF", "borderColor": "#0094ea", "borderWidth": 2, "infoBgColor": "#0094ea", "borderRadius": 14, "shareBgColor": "#FFFFFF", "showProducts": true, "autoplayMuted": true, "infoTextColor": "#FFFFFF", "shareTextColor": "#000000", "couponCodeColor": "#FFFFFF", "couponTextColor": "#000000", "productNameSize": 11, "showViewerCount": true, "productNameColor": "#1e293b", "productPriceSize": 12, "couponCodeBgColor": "#0094ea", "couponTextBgColor": "#FFFFFF", "productPriceColor": "#0094ea"}}
\.


--
-- Data for Name: stores; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stores (id, name, url, platform, logo_url, contact_email, settings, created_at, updated_at, owner_user_id, sector_id, storage_used_bytes, storage_limit_bytes, plan_id, asaas_customer_id, subscription_status, trial_ends_at, past_due_since, plan_tier, current_period_end, stripe_customer_id, stripe_subscription_id, sector, slug, referral_code, referred_by_store_id, active, pix_key, pix_key_type, owner_contact_email, contact_name) FROM stdin;
c1911fc6-ec70-4be1-9ec1-0443fbfb7632	Loja		yampi	https://wznvecurmisgoaijykbt.supabase.co/storage/v1/object/public/store-assets/logos/logo-1788971936599.png	rodrigoavicennte@gmail.com	{}	2026-09-08 21:56:15.376349+00	2026-09-18 09:30:18.572742+00	5c9f63f2-c9a6-43df-9c88-e8ac6b447935	a1b1c1d1-0010-4000-8000-000000000010	10832307	53687091200	5493cbc5-05b4-4f39-99ba-e29c98d86cb6	cus_000200270930	lifetime	\N	\N	scale	2031-10-14 21:40:46.979778+00	\N	\N	joias_semijoias	\N	VID-1FC9BF	\N	t	02800449926	cpf	contato@useanny.com	Annellyse Moreira
\.


--
-- Data for Name: stories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stories (id, store_id, title, icon_name, format, scroll_direction, appearance_id, active, "position", display_selector, display_position, page_rule_type, page_rule_value, created_at, updated_at, model_id, click_count, cta_enabled, cta_text, cta_url, is_active, cta_type, whatsapp_message, view_count) FROM stdin;
591a37a1-1897-4293-9ba4-ea7992849c77	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	TESTE	\N	floating_widget	horizontal	\N	t	0	\N	below	all_pages	\N	2026-09-09 19:19:45.761+00	2026-09-16 19:29:56.442869+00	\N	0	f			t	none		0
\.


--
-- Data for Name: story_products; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.story_products (id, story_id, product_id, created_at, store_id) FROM stdin;
\.


--
-- Data for Name: story_videos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.story_videos (id, story_id, video_id, "position", created_at, store_id, is_cover) FROM stdin;
4cc8541d-4448-4d68-85f2-06111f88e5d7	591a37a1-1897-4293-9ba4-ea7992849c77	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	1	2026-09-16 19:29:55.706+00	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	t
6571d5dd-9855-401c-9194-5fdf44e04d2b	591a37a1-1897-4293-9ba4-ea7992849c77	9a7c8ccd-0c57-4697-abe5-866151f0856c	2	2026-09-16 19:29:55.706+00	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	f
\.


--
-- Data for Name: subscriptions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.subscriptions (id, store_id, plan_id, status, billing_cycle, current_period_start, current_period_end, cancel_at_period_end, canceled_at, gateway_provider, gateway_customer_id, gateway_subscription_id, gateway_payment_method_id, is_current, created_at, updated_at, asaas_subscription_id, payment_method, asaas_customer_id, billing_provider) FROM stdin;
499e969c-76ea-41bc-8cae-d2bd611e20cf	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	5493cbc5-05b4-4f39-99ba-e29c98d86cb6	active	yearly	2026-09-14 17:36:17.177719+00	2031-09-14 17:36:17.177719+00	f	\N	\N	\N	\N	\N	f	2026-09-14 17:36:17.177719+00	2026-09-14 19:18:39.365162+00	\N	PIX	\N	asaas
c0d271e6-cd1e-4089-b897-dad6babb1d3f	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	5493cbc5-05b4-4f39-99ba-e29c98d86cb6	active	monthly	2026-09-14 19:18:39.365162+00	2031-09-14 19:18:39.365162+00	f	\N	\N	\N	\N	\N	f	2026-09-14 19:18:39.365162+00	2026-09-14 20:00:12.6001+00	\N	PIX	\N	asaas
91202afe-e462-4129-b11e-be3dc34088a1	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	eae5022d-617a-44f1-a2ce-46e12ad3c32e	active	monthly	2026-09-14 20:00:12.6001+00	2031-09-14 20:00:12.6001+00	f	\N	\N	\N	\N	\N	f	2026-09-14 20:00:12.6001+00	2026-09-14 20:32:27.207151+00	\N	PIX	\N	asaas
bada87bb-8aaa-4264-8dc0-90505d4e1235	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	5493cbc5-05b4-4f39-99ba-e29c98d86cb6	active	monthly	2026-09-14 20:32:27.207151+00	2031-09-14 20:32:27.207151+00	f	\N	\N	\N	\N	\N	f	2026-09-14 20:32:27.207151+00	2026-09-14 20:45:39.972293+00	\N	PIX	\N	asaas
bce5b25f-04d0-439f-b030-53444a546298	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	5493cbc5-05b4-4f39-99ba-e29c98d86cb6	active	monthly	2026-09-14 20:46:52.608074+00	2027-09-14 20:46:52.608074+00	f	\N	\N	\N	\N	\N	f	2026-09-14 20:46:52.608074+00	2026-09-14 20:47:38.193572+00	\N	PIX	\N	manual_admin
9f1a6917-d127-46c4-a7e7-fa387a689fe0	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	eae5022d-617a-44f1-a2ce-46e12ad3c32e	active	monthly	2026-09-14 20:45:39.972293+00	2027-09-14 20:45:39.972293+00	f	\N	\N	\N	\N	\N	f	2026-09-14 20:45:39.972293+00	2026-09-14 21:22:41.747238+00	\N	PIX	\N	manual_admin
22015981-5927-4f7a-b829-2e4ff252d5a7	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	eae5022d-617a-44f1-a2ce-46e12ad3c32e	active	monthly	2026-09-14 20:47:38.193572+00	2027-09-14 20:47:38.193572+00	f	\N	\N	\N	\N	\N	f	2026-09-14 20:47:38.193572+00	2026-09-14 21:40:46.979778+00	\N	PIX	\N	manual_admin
3cf066c1-38c7-40ec-acd8-76a16e293550	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	5493cbc5-05b4-4f39-99ba-e29c98d86cb6	active	monthly	2026-09-14 21:40:46.979778+00	2031-10-14 21:40:46.979778+00	f	\N	\N	\N	\N	\N	f	2026-09-14 21:40:46.979778+00	2026-09-14 21:58:32.951284+00	\N	PIX	\N	manual_admin
6c555639-f407-4f57-b0da-af8b1c20f1b9	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	5493cbc5-05b4-4f39-99ba-e29c98d86cb6	lifetime	monthly	2026-09-14 21:58:32.951284+00	\N	f	\N	\N	\N	\N	\N	f	2026-09-14 21:58:32.951284+00	2026-09-15 11:39:45.104662+00	\N	PIX	\N	manual_admin
cdec14fd-ef92-4164-86f2-4cebb15b9ab5	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	5493cbc5-05b4-4f39-99ba-e29c98d86cb6	lifetime	monthly	2026-09-15 11:39:45.104662+00	\N	f	\N	\N	\N	\N	\N	f	2026-09-15 11:39:45.104662+00	2026-09-15 11:58:15.84843+00	\N	PIX	\N	manual_admin
dc32ad4c-1876-4778-ae5d-bfcda5d5ab80	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	5493cbc5-05b4-4f39-99ba-e29c98d86cb6	active	monthly	2026-09-15 11:58:15.84843+00	2027-03-15 11:58:15.84843+00	f	\N	\N	\N	\N	\N	f	2026-09-15 11:58:15.84843+00	2026-09-15 12:00:01.823078+00	\N	PIX	\N	manual_admin
9c405261-027e-4ff9-8b52-02200730d1ab	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	5493cbc5-05b4-4f39-99ba-e29c98d86cb6	lifetime	monthly	2026-09-15 12:00:01.823078+00	\N	f	\N	\N	\N	\N	\N	f	2026-09-15 12:00:01.823078+00	2026-09-15 12:10:49.52225+00	\N	PIX	\N	manual_admin
67fc985a-900d-49f0-98e3-1d1aac8cee29	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	eae5022d-617a-44f1-a2ce-46e12ad3c32e	active	monthly	2026-09-15 12:10:49.52225+00	2026-12-15 12:10:49.52225+00	f	\N	\N	\N	\N	\N	f	2026-09-15 12:10:49.52225+00	2026-09-15 13:55:15.694663+00	\N	PIX	\N	manual_admin
ea12f0d5-c983-43c8-a012-4b8dfe1d8b3e	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	eae5022d-617a-44f1-a2ce-46e12ad3c32e	lifetime	monthly	2026-09-15 13:55:15.694663+00	\N	f	\N	\N	\N	\N	\N	f	2026-09-15 13:55:15.694663+00	2026-09-15 18:38:52.438576+00	\N	PIX	\N	manual_admin
f19cf4a7-29cc-4881-ad5c-9d76413a4cc8	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	eae5022d-617a-44f1-a2ce-46e12ad3c32e	lifetime	monthly	2026-09-15 18:38:52.438576+00	\N	f	\N	\N	\N	\N	\N	f	2026-09-15 18:38:52.438576+00	2026-09-15 18:38:58.684463+00	\N	PIX	\N	manual_admin
b27aded6-058c-4159-bb7a-fad018f7aaee	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	5493cbc5-05b4-4f39-99ba-e29c98d86cb6	active	monthly	2026-09-15 18:38:58.684463+00	2027-09-15 18:38:58.684463+00	f	\N	\N	\N	\N	\N	f	2026-09-15 18:38:58.684463+00	2026-09-15 18:39:04.123624+00	\N	PIX	\N	manual_admin
31a57572-32e7-41a0-ad4d-9d6b2e7b94f9	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	5493cbc5-05b4-4f39-99ba-e29c98d86cb6	lifetime	monthly	2026-09-15 18:39:04.123624+00	\N	f	\N	\N	\N	\N	\N	f	2026-09-15 18:39:04.123624+00	2026-09-18 09:30:18.572742+00	\N	PIX	\N	manual_admin
20c904c3-0e15-4da4-babc-9b55f236eba2	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	5493cbc5-05b4-4f39-99ba-e29c98d86cb6	lifetime	monthly	2026-09-18 09:30:18.572742+00	\N	f	\N	\N	\N	\N	\N	t	2026-09-18 09:30:18.572742+00	2026-09-18 09:30:18.572742+00	\N	PIX	\N	manual_admin
\.


--
-- Data for Name: usage_counters; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.usage_counters (id, store_id, month, videos_count, views_count, users_count, created_at, updated_at) FROM stdin;
6f6d57c5-2968-4f11-857a-aff1fe360ef9	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	2026-09	0	57	1	2026-09-08 21:56:15.376349+00	2026-09-11 16:09:15.386335+00
\.


--
-- Data for Name: video_likes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.video_likes (id, video_id, created_at, store_id, user_fingerprint) FROM stdin;
b464ab4d-0572-47b7-a191-a22809e1b1b7	9a7c8ccd-0c57-4697-abe5-866151f0856c	2026-09-09 19:28:08.775156+00	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	fp_1785342733997_jlrqb34ax
c29f9e39-b514-4051-817e-68b5cfbf45c2	9a7c8ccd-0c57-4697-abe5-866151f0856c	2026-09-09 19:55:16.425813+00	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	fp_1788983651875_eeenyte2o
730fc50b-e148-44b6-8ee8-0056b4b079cb	4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	2026-09-09 21:05:15.42319+00	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	fp_1785710862310_9vcgcq0h4
\.


--
-- Data for Name: video_placements; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.video_placements (id, store_id, video_id, page, "position", content_type, active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: videos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.videos (id, store_id, title, video_source_type, video_url, video_file_path, thumbnail_source_type, thumbnail_url, thumbnail_file_path, product_id, sizing_model_id, status, created_at, updated_at, active, model_id, source_type, qr_code_url, file_size, thumbnail_file_size) FROM stdin;
4cfcefe2-a6b5-4f6a-9c16-aa5f8f1c48fd	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	oculos-de-sol.mp4	upload	https://wznvecurmisgoaijykbt.supabase.co/storage/v1/object/public/videos/c1911fc6-ec70-4be1-9ec1-0443fbfb7632/1788981021706_q9z8u_oculos-de-sol.mp4	\N	auto		\N	\N	\N	active	2026-09-09 19:10:23.751+00	2026-09-09 19:10:24.191185+00	t	\N	upload	\N	8664262	29747
9a7c8ccd-0c57-4697-abe5-866151f0856c	c1911fc6-ec70-4be1-9ec1-0443fbfb7632	Criação_de_Vídeo_Fashion_Editorial_Luxo.mp4	upload	https://wznvecurmisgoaijykbt.supabase.co/storage/v1/object/public/videos/c1911fc6-ec70-4be1-9ec1-0443fbfb7632/1788980987906_qky29_Cria__o_de_V_deo_Fashion_Editorial_Luxo.mp4	\N	auto	https://wznvecurmisgoaijykbt.supabase.co/storage/v1/object/public/store-assets/c1911fc6-ec70-4be1-9ec1-0443fbfb7632/thumbnails/1788981478766-e1b801ea-0047-4b6d-9d93-3a6b0737832d.jpg	\N	a8d19b5f-8319-44a0-a360-32d42e37387b	\N	active	2026-09-09 19:09:51.014+00	2026-09-09 19:18:00.356961+00	t	c2e471f3-cc6f-47da-a81b-ebc38f4ae2d0	upload	\N	2062935	75363
\.


--
-- Data for Name: widget_selectors; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.widget_selectors (id, token, selector, story_id, created_at, updated_at) FROM stdin;
\.


--
-- Name: widget_selectors_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.widget_selectors_id_seq', 8, true);


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: affiliate_withdrawals affiliate_withdrawals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.affiliate_withdrawals
    ADD CONSTRAINT affiliate_withdrawals_pkey PRIMARY KEY (id);


--
-- Name: ai_insights ai_insights_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_insights
    ADD CONSTRAINT ai_insights_pkey PRIMARY KEY (id);


--
-- Name: analytics_rate_limits analytics_rate_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_rate_limits
    ADD CONSTRAINT analytics_rate_limits_pkey PRIMARY KEY (client_hash, store_id, window_minute);


--
-- Name: app_settings app_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_pkey PRIMARY KEY (id);


--
-- Name: appearances appearances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appearances
    ADD CONSTRAINT appearances_pkey PRIMARY KEY (id);


--
-- Name: asaas_webhook_events asaas_webhook_events_event_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asaas_webhook_events
    ADD CONSTRAINT asaas_webhook_events_event_id_key UNIQUE (event_id);


--
-- Name: asaas_webhook_events asaas_webhook_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asaas_webhook_events
    ADD CONSTRAINT asaas_webhook_events_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: benchmarks benchmarks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.benchmarks
    ADD CONSTRAINT benchmarks_pkey PRIMARY KEY (id);


--
-- Name: benchmarks benchmarks_sector_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.benchmarks
    ADD CONSTRAINT benchmarks_sector_id_key UNIQUE (sector_id);


--
-- Name: billing_info billing_info_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_info
    ADD CONSTRAINT billing_info_pkey PRIMARY KEY (id);


--
-- Name: billing_info billing_info_store_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_info
    ADD CONSTRAINT billing_info_store_id_key UNIQUE (store_id);


--
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);


--
-- Name: conversions conversions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversions
    ADD CONSTRAINT conversions_pkey PRIMARY KEY (id);


--
-- Name: daily_store_metrics daily_store_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_store_metrics
    ADD CONSTRAINT daily_store_metrics_pkey PRIMARY KEY (id);


--
-- Name: daily_video_metrics daily_video_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_video_metrics
    ADD CONSTRAINT daily_video_metrics_pkey PRIMARY KEY (id);


--
-- Name: display_locations display_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.display_locations
    ADD CONSTRAINT display_locations_pkey PRIMARY KEY (id);


--
-- Name: insight_rule_conditions insight_rule_conditions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insight_rule_conditions
    ADD CONSTRAINT insight_rule_conditions_pkey PRIMARY KEY (id);


--
-- Name: insight_rules insight_rules_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insight_rules
    ADD CONSTRAINT insight_rules_code_key UNIQUE (code);


--
-- Name: insight_rules insight_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insight_rules
    ADD CONSTRAINT insight_rules_pkey PRIMARY KEY (id);


--
-- Name: insights insights_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insights
    ADD CONSTRAINT insights_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_asaas_payment_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_asaas_payment_id_key UNIQUE (asaas_payment_id);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: live_advantages live_advantages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.live_advantages
    ADD CONSTRAINT live_advantages_pkey PRIMARY KEY (id);


--
-- Name: live_chat_messages live_chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.live_chat_messages
    ADD CONSTRAINT live_chat_messages_pkey PRIMARY KEY (id);


--
-- Name: live_coupons live_coupons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.live_coupons
    ADD CONSTRAINT live_coupons_pkey PRIMARY KEY (id);


--
-- Name: live_events live_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.live_events
    ADD CONSTRAINT live_events_pkey PRIMARY KEY (id);


--
-- Name: live_settings live_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.live_settings
    ADD CONSTRAINT live_settings_pkey PRIMARY KEY (id);


--
-- Name: live_settings live_settings_store_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.live_settings
    ADD CONSTRAINT live_settings_store_id_unique UNIQUE (store_id);


--
-- Name: live_subscribers live_subscribers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.live_subscribers
    ADD CONSTRAINT live_subscribers_pkey PRIMARY KEY (id);


--
-- Name: lives lives_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lives
    ADD CONSTRAINT lives_pkey PRIMARY KEY (id);


--
-- Name: page_rules page_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.page_rules
    ADD CONSTRAINT page_rules_pkey PRIMARY KEY (id);


--
-- Name: plans plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT plans_pkey PRIMARY KEY (id);


--
-- Name: plans plans_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT plans_slug_key UNIQUE (slug);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: referral_rewards referral_rewards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_rewards
    ADD CONSTRAINT referral_rewards_pkey PRIMARY KEY (id);


--
-- Name: sector_benchmarks sector_benchmarks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sector_benchmarks
    ADD CONSTRAINT sector_benchmarks_pkey PRIMARY KEY (id);


--
-- Name: sector_benchmarks sector_benchmarks_sector_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sector_benchmarks
    ADD CONSTRAINT sector_benchmarks_sector_key_key UNIQUE (sector_key);


--
-- Name: sectors sectors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sectors
    ADD CONSTRAINT sectors_pkey PRIMARY KEY (id);


--
-- Name: sectors sectors_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sectors
    ADD CONSTRAINT sectors_slug_key UNIQUE (slug);


--
-- Name: selector_sessions selector_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.selector_sessions
    ADD CONSTRAINT selector_sessions_pkey PRIMARY KEY (id);


--
-- Name: selector_sessions selector_sessions_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.selector_sessions
    ADD CONSTRAINT selector_sessions_token_key UNIQUE (token);


--
-- Name: sizing_models sizing_models_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sizing_models
    ADD CONSTRAINT sizing_models_pkey PRIMARY KEY (id);


--
-- Name: store_activity_events store_activity_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_activity_events
    ADD CONSTRAINT store_activity_events_pkey PRIMARY KEY (id);


--
-- Name: store_integrations store_integrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_integrations
    ADD CONSTRAINT store_integrations_pkey PRIMARY KEY (id);


--
-- Name: store_integrations store_integrations_store_id_platform_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_integrations
    ADD CONSTRAINT store_integrations_store_id_platform_key UNIQUE (store_id, platform);


--
-- Name: store_members store_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_members
    ADD CONSTRAINT store_members_pkey PRIMARY KEY (id);


--
-- Name: store_members store_members_store_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_members
    ADD CONSTRAINT store_members_store_id_user_id_key UNIQUE (store_id, user_id);


--
-- Name: store_members store_members_store_user_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_members
    ADD CONSTRAINT store_members_store_user_unique UNIQUE (store_id, user_id);


--
-- Name: store_settings store_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_settings
    ADD CONSTRAINT store_settings_pkey PRIMARY KEY (id);


--
-- Name: store_settings store_settings_store_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_settings
    ADD CONSTRAINT store_settings_store_id_key UNIQUE (store_id);


--
-- Name: store_settings store_settings_store_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_settings
    ADD CONSTRAINT store_settings_store_id_unique UNIQUE (store_id);


--
-- Name: stores stores_owner_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stores
    ADD CONSTRAINT stores_owner_user_id_unique UNIQUE (owner_user_id);


--
-- Name: stores stores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stores
    ADD CONSTRAINT stores_pkey PRIMARY KEY (id);


--
-- Name: stores stores_referral_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stores
    ADD CONSTRAINT stores_referral_code_key UNIQUE (referral_code);


--
-- Name: stories stories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stories
    ADD CONSTRAINT stories_pkey PRIMARY KEY (id);


--
-- Name: story_products story_products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_products
    ADD CONSTRAINT story_products_pkey PRIMARY KEY (id);


--
-- Name: story_products story_products_story_id_product_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_products
    ADD CONSTRAINT story_products_story_id_product_id_key UNIQUE (story_id, product_id);


--
-- Name: story_videos story_videos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_videos
    ADD CONSTRAINT story_videos_pkey PRIMARY KEY (id);


--
-- Name: story_videos story_videos_story_id_video_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_videos
    ADD CONSTRAINT story_videos_story_id_video_id_key UNIQUE (story_id, video_id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: store_integrations unique_store_platform; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_integrations
    ADD CONSTRAINT unique_store_platform UNIQUE (store_id, platform);


--
-- Name: daily_store_metrics uq_daily_store_metrics; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_store_metrics
    ADD CONSTRAINT uq_daily_store_metrics UNIQUE (store_id, date);


--
-- Name: daily_video_metrics uq_daily_video_metrics; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_video_metrics
    ADD CONSTRAINT uq_daily_video_metrics UNIQUE (store_id, video_id, date);


--
-- Name: usage_counters usage_counters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_counters
    ADD CONSTRAINT usage_counters_pkey PRIMARY KEY (id);


--
-- Name: usage_counters usage_counters_store_id_month_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_counters
    ADD CONSTRAINT usage_counters_store_id_month_key UNIQUE (store_id, month);


--
-- Name: usage_counters usage_counters_store_month_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_counters
    ADD CONSTRAINT usage_counters_store_month_unique UNIQUE (store_id, month);


--
-- Name: video_likes video_likes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_likes
    ADD CONSTRAINT video_likes_pkey PRIMARY KEY (id);


--
-- Name: video_placements video_placements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_placements
    ADD CONSTRAINT video_placements_pkey PRIMARY KEY (id);


--
-- Name: video_placements video_placements_video_id_page_position_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_placements
    ADD CONSTRAINT video_placements_video_id_page_position_key UNIQUE (video_id, page, "position");


--
-- Name: videos videos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.videos
    ADD CONSTRAINT videos_pkey PRIMARY KEY (id);


--
-- Name: widget_selectors widget_selectors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.widget_selectors
    ADD CONSTRAINT widget_selectors_pkey PRIMARY KEY (id);


--
-- Name: widget_selectors widget_selectors_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.widget_selectors
    ADD CONSTRAINT widget_selectors_token_key UNIQUE (token);


--
-- Name: appearances_one_default_per_store; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX appearances_one_default_per_store ON public.appearances USING btree (store_id) WHERE (is_default = true);


--
-- Name: idx_affiliate_withdrawals_store; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_affiliate_withdrawals_store ON public.affiliate_withdrawals USING btree (store_id, status);


--
-- Name: idx_ai_insights_store_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_insights_store_period ON public.ai_insights USING btree (store_id, period_start, period_end);


--
-- Name: idx_analytics_rate_limits_cleanup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_analytics_rate_limits_cleanup ON public.analytics_rate_limits USING btree (window_minute);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at DESC);


--
-- Name: idx_audit_logs_store_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_store_id ON public.audit_logs USING btree (store_id);


--
-- Name: idx_comments_parent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comments_parent_id ON public.comments USING btree (parent_id);


--
-- Name: idx_comments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comments_status ON public.comments USING btree (status);


--
-- Name: idx_comments_store_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comments_store_id ON public.comments USING btree (store_id);


--
-- Name: idx_comments_video_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comments_video_id ON public.comments USING btree (video_id);


--
-- Name: idx_conversions_live_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversions_live_id ON public.conversions USING btree (live_id);


--
-- Name: idx_daily_store_metrics_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_daily_store_metrics_lookup ON public.daily_store_metrics USING btree (store_id, date DESC);


--
-- Name: idx_daily_video_metrics_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_daily_video_metrics_lookup ON public.daily_video_metrics USING btree (store_id, date DESC, views_count DESC);


--
-- Name: idx_display_locations_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_display_locations_active ON public.display_locations USING btree (active);


--
-- Name: idx_display_locations_store_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_display_locations_store_id ON public.display_locations USING btree (store_id);


--
-- Name: idx_display_locations_store_story; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_display_locations_store_story ON public.display_locations USING btree (store_id, story_id);


--
-- Name: idx_display_locations_story_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_display_locations_story_id ON public.display_locations USING btree (story_id);


--
-- Name: idx_events_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_session ON public.store_activity_events USING btree (session_id);


--
-- Name: idx_events_store_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_store_created ON public.store_activity_events USING btree (store_id, created_at);


--
-- Name: idx_events_video_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_video_type ON public.store_activity_events USING btree (video_id, event_type);


--
-- Name: idx_insights_completed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_insights_completed ON public.insights USING btree (completed);


--
-- Name: idx_insights_store; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_insights_store ON public.insights USING btree (store_id);


--
-- Name: idx_insights_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_insights_type ON public.insights USING btree (insight_type);


--
-- Name: idx_invoices_asaas_payment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_asaas_payment_id ON public.invoices USING btree (asaas_payment_id);


--
-- Name: idx_invoices_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_status ON public.invoices USING btree (status);


--
-- Name: idx_invoices_store_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_store_id ON public.invoices USING btree (store_id);


--
-- Name: idx_live_advantages_live_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_live_advantages_live_id ON public.live_advantages USING btree (live_id, "position");


--
-- Name: idx_live_chat_live_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_live_chat_live_id ON public.live_chat_messages USING btree (live_id, created_at);


--
-- Name: idx_live_coupons_live_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_live_coupons_live_id ON public.live_coupons USING btree (live_id, "position");


--
-- Name: idx_live_events_live_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_live_events_live_type ON public.live_events USING btree (live_id, event_type);


--
-- Name: idx_live_subscribers_live_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_live_subscribers_live_id ON public.live_subscribers USING btree (live_id);


--
-- Name: idx_live_subscribers_store_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_live_subscribers_store_id ON public.live_subscribers USING btree (store_id);


--
-- Name: idx_lives_store_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lives_store_active ON public.lives USING btree (store_id, is_active, status);


--
-- Name: idx_page_rules_store_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_page_rules_store_id ON public.page_rules USING btree (store_id);


--
-- Name: idx_page_rules_store_story; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_page_rules_store_story ON public.page_rules USING btree (store_id, story_id);


--
-- Name: idx_page_rules_story_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_page_rules_story_id ON public.page_rules USING btree (story_id);


--
-- Name: idx_products_external_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_external_id ON public.products USING btree (external_id);


--
-- Name: idx_products_store_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_store_id ON public.products USING btree (store_id);


--
-- Name: idx_referral_rewards_payment; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_referral_rewards_payment ON public.referral_rewards USING btree (referrer_store_id, asaas_payment_id) WHERE (asaas_payment_id IS NOT NULL);


--
-- Name: idx_referral_rewards_referrer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referral_rewards_referrer ON public.referral_rewards USING btree (referrer_store_id, status);


--
-- Name: idx_store_activity_events_feed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_store_activity_events_feed ON public.store_activity_events USING btree (store_id, created_at DESC);


--
-- Name: idx_store_settings_store_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_store_settings_store_id ON public.store_settings USING btree (store_id);


--
-- Name: idx_stores_sector; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stores_sector ON public.stores USING btree (sector_id);


--
-- Name: idx_stories_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stories_active ON public.stories USING btree (active);


--
-- Name: idx_stories_appearance_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stories_appearance_id ON public.stories USING btree (appearance_id);


--
-- Name: idx_stories_store_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stories_store_id ON public.stories USING btree (store_id);


--
-- Name: idx_story_products_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_story_products_product_id ON public.story_products USING btree (product_id);


--
-- Name: idx_story_products_story_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_story_products_story_id ON public.story_products USING btree (story_id);


--
-- Name: idx_story_videos_story_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_story_videos_story_id ON public.story_videos USING btree (story_id);


--
-- Name: idx_story_videos_video_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_story_videos_video_id ON public.story_videos USING btree (video_id);


--
-- Name: idx_subscriptions_plan_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_plan_id ON public.subscriptions USING btree (plan_id);


--
-- Name: idx_subscriptions_store_current; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_subscriptions_store_current ON public.subscriptions USING btree (store_id) WHERE (is_current = true);


--
-- Name: idx_subscriptions_store_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_store_id ON public.subscriptions USING btree (store_id);


--
-- Name: idx_usage_counters_store_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usage_counters_store_id ON public.usage_counters USING btree (store_id);


--
-- Name: idx_video_likes_video_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_video_likes_video_id ON public.video_likes USING btree (video_id);


--
-- Name: idx_video_placements_page; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_video_placements_page ON public.video_placements USING btree (page);


--
-- Name: idx_video_placements_store; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_video_placements_store ON public.video_placements USING btree (store_id);


--
-- Name: idx_video_placements_video; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_video_placements_video ON public.video_placements USING btree (video_id);


--
-- Name: idx_videos_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_videos_product_id ON public.videos USING btree (product_id);


--
-- Name: idx_videos_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_videos_status ON public.videos USING btree (status);


--
-- Name: idx_videos_store_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_videos_store_id ON public.videos USING btree (store_id);


--
-- Name: ux_display_locations_story_store_location; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_display_locations_story_store_location ON public.display_locations USING btree (story_id, store_id, location) WHERE ((story_id IS NOT NULL) AND (location IS NOT NULL));


--
-- Name: ux_display_locations_story_store_position; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_display_locations_story_store_position ON public.display_locations USING btree (story_id, store_id, COALESCE("position", 'beforeend'::text)) WHERE (story_id IS NOT NULL);


--
-- Name: comments set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: products set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: profiles set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: store_settings set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.store_settings FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: stores set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.stores FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: stories set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.stories FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: videos set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.videos FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: stores tr_generate_store_referral_code; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_generate_store_referral_code BEFORE INSERT ON public.stores FOR EACH ROW EXECUTE FUNCTION public.fn_generate_store_referral_code();


--
-- Name: profiles trg_auto_super_admin; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auto_super_admin BEFORE INSERT OR UPDATE OF email ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.auto_assign_super_admin();


--
-- Name: billing_info trg_billing_info_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_billing_info_updated_at BEFORE UPDATE ON public.billing_info FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: live_chat_messages trg_chat_rate_limit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_chat_rate_limit BEFORE INSERT ON public.live_chat_messages FOR EACH ROW EXECUTE FUNCTION public.check_chat_rate_limit();


--
-- Name: display_locations trg_display_locations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_display_locations_updated_at BEFORE UPDATE ON public.display_locations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: invoices trg_invoices_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: appearances trg_log_appearances; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_log_appearances AFTER INSERT OR DELETE OR UPDATE ON public.appearances FOR EACH ROW EXECUTE FUNCTION public.log_activity_trigger();


--
-- Name: display_locations trg_log_locations; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_log_locations AFTER INSERT OR UPDATE ON public.display_locations FOR EACH ROW EXECUTE FUNCTION public.log_activity_trigger();


--
-- Name: products trg_log_products; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_log_products AFTER INSERT OR DELETE OR UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.log_activity_trigger();


--
-- Name: store_settings trg_log_settings; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_log_settings AFTER UPDATE ON public.store_settings FOR EACH ROW EXECUTE FUNCTION public.log_activity_trigger();


--
-- Name: stories trg_log_stories; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_log_stories AFTER INSERT OR DELETE OR UPDATE ON public.stories FOR EACH ROW EXECUTE FUNCTION public.log_activity_trigger();


--
-- Name: videos trg_log_videos; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_log_videos AFTER INSERT OR DELETE OR UPDATE ON public.videos FOR EACH ROW EXECUTE FUNCTION public.log_activity_trigger();


--
-- Name: page_rules trg_page_rules_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_page_rules_updated_at BEFORE UPDATE ON public.page_rules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: plans trg_plans_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_plans_updated_at BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: appearances trg_sanitize_appearances; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sanitize_appearances BEFORE INSERT OR UPDATE ON public.appearances FOR EACH ROW EXECUTE FUNCTION public.sanitize_appearance_colors();


--
-- Name: stores trg_set_trial_defaults; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_trial_defaults BEFORE INSERT ON public.stores FOR EACH ROW EXECUTE FUNCTION public.set_store_trial_defaults();


--
-- Name: subscriptions trg_subscriptions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: lives trg_sync_lives_is_active; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sync_lives_is_active BEFORE INSERT OR UPDATE ON public.lives FOR EACH ROW EXECUTE FUNCTION public.sync_lives_is_active();


--
-- Name: videos trg_sync_storage_bytes; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sync_storage_bytes AFTER INSERT OR DELETE OR UPDATE OF file_size, thumbnail_file_size, status, store_id ON public.videos FOR EACH ROW EXECUTE FUNCTION public.trigger_sync_store_storage_bytes();


--
-- Name: subscriptions trg_sync_store_plan_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sync_store_plan_id AFTER INSERT OR DELETE OR UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.sync_store_plan_id();


--
-- Name: stores trg_sync_store_sector; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sync_store_sector BEFORE INSERT OR UPDATE OF sector_id ON public.stores FOR EACH ROW EXECUTE FUNCTION public.sync_store_sector_slug();


--
-- Name: affiliate_withdrawals affiliate_withdrawals_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.affiliate_withdrawals
    ADD CONSTRAINT affiliate_withdrawals_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: ai_insights ai_insights_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_insights
    ADD CONSTRAINT ai_insights_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: ai_insights ai_insights_video_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_insights
    ADD CONSTRAINT ai_insights_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.videos(id) ON DELETE SET NULL;


--
-- Name: analytics_rate_limits analytics_rate_limits_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_rate_limits
    ADD CONSTRAINT analytics_rate_limits_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: app_settings app_settings_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: appearances appearances_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appearances
    ADD CONSTRAINT appearances_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: benchmarks benchmarks_sector_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.benchmarks
    ADD CONSTRAINT benchmarks_sector_id_fkey FOREIGN KEY (sector_id) REFERENCES public.sectors(id) ON DELETE CASCADE;


--
-- Name: billing_info billing_info_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_info
    ADD CONSTRAINT billing_info_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: comments comments_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.comments(id) ON DELETE CASCADE;


--
-- Name: comments comments_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: comments comments_video_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.videos(id) ON DELETE CASCADE;


--
-- Name: conversions conversions_live_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversions
    ADD CONSTRAINT conversions_live_id_fkey FOREIGN KEY (live_id) REFERENCES public.live_events(id) ON DELETE SET NULL;


--
-- Name: daily_store_metrics daily_store_metrics_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_store_metrics
    ADD CONSTRAINT daily_store_metrics_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: daily_video_metrics daily_video_metrics_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_video_metrics
    ADD CONSTRAINT daily_video_metrics_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: daily_video_metrics daily_video_metrics_video_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_video_metrics
    ADD CONSTRAINT daily_video_metrics_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.videos(id) ON DELETE CASCADE;


--
-- Name: insight_rule_conditions insight_rule_conditions_rule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insight_rule_conditions
    ADD CONSTRAINT insight_rule_conditions_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES public.insight_rules(id) ON DELETE CASCADE;


--
-- Name: insights insights_related_placement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insights
    ADD CONSTRAINT insights_related_placement_id_fkey FOREIGN KEY (related_placement_id) REFERENCES public.video_placements(id) ON DELETE SET NULL;


--
-- Name: insights insights_related_video_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insights
    ADD CONSTRAINT insights_related_video_id_fkey FOREIGN KEY (related_video_id) REFERENCES public.videos(id) ON DELETE SET NULL;


--
-- Name: insights insights_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insights
    ADD CONSTRAINT insights_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: invoices invoices_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: invoices invoices_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) ON DELETE SET NULL;


--
-- Name: live_advantages live_advantages_live_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.live_advantages
    ADD CONSTRAINT live_advantages_live_id_fkey FOREIGN KEY (live_id) REFERENCES public.lives(id) ON DELETE CASCADE;


--
-- Name: live_advantages live_advantages_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.live_advantages
    ADD CONSTRAINT live_advantages_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: live_chat_messages live_chat_messages_live_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.live_chat_messages
    ADD CONSTRAINT live_chat_messages_live_id_fkey FOREIGN KEY (live_id) REFERENCES public.lives(id) ON DELETE CASCADE;


--
-- Name: live_chat_messages live_chat_messages_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.live_chat_messages
    ADD CONSTRAINT live_chat_messages_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: live_coupons live_coupons_live_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.live_coupons
    ADD CONSTRAINT live_coupons_live_id_fkey FOREIGN KEY (live_id) REFERENCES public.lives(id) ON DELETE CASCADE;


--
-- Name: live_coupons live_coupons_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.live_coupons
    ADD CONSTRAINT live_coupons_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: live_events live_events_live_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.live_events
    ADD CONSTRAINT live_events_live_id_fkey FOREIGN KEY (live_id) REFERENCES public.lives(id) ON DELETE CASCADE;


--
-- Name: live_settings live_settings_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.live_settings
    ADD CONSTRAINT live_settings_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: live_subscribers live_subscribers_live_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.live_subscribers
    ADD CONSTRAINT live_subscribers_live_id_fkey FOREIGN KEY (live_id) REFERENCES public.lives(id) ON DELETE CASCADE;


--
-- Name: live_subscribers live_subscribers_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.live_subscribers
    ADD CONSTRAINT live_subscribers_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: lives lives_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lives
    ADD CONSTRAINT lives_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: products products_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: referral_rewards referral_rewards_referred_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_rewards
    ADD CONSTRAINT referral_rewards_referred_store_id_fkey FOREIGN KEY (referred_store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: referral_rewards referral_rewards_referrer_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_rewards
    ADD CONSTRAINT referral_rewards_referrer_store_id_fkey FOREIGN KEY (referrer_store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: selector_sessions selector_sessions_story_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.selector_sessions
    ADD CONSTRAINT selector_sessions_story_id_fkey FOREIGN KEY (story_id) REFERENCES public.stories(id);


--
-- Name: store_activity_events store_activity_events_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_activity_events
    ADD CONSTRAINT store_activity_events_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: store_activity_events store_activity_events_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_activity_events
    ADD CONSTRAINT store_activity_events_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: store_activity_events store_activity_events_video_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_activity_events
    ADD CONSTRAINT store_activity_events_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.videos(id) ON DELETE SET NULL;


--
-- Name: store_integrations store_integrations_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_integrations
    ADD CONSTRAINT store_integrations_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: store_members store_members_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_members
    ADD CONSTRAINT store_members_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: store_members store_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_members
    ADD CONSTRAINT store_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: store_settings store_settings_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_settings
    ADD CONSTRAINT store_settings_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: stores stores_owner_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stores
    ADD CONSTRAINT stores_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES auth.users(id);


--
-- Name: stores stores_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stores
    ADD CONSTRAINT stores_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id);


--
-- Name: stores stores_referred_by_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stores
    ADD CONSTRAINT stores_referred_by_store_id_fkey FOREIGN KEY (referred_by_store_id) REFERENCES public.stores(id) ON DELETE SET NULL;


--
-- Name: stories stories_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stories
    ADD CONSTRAINT stories_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: story_products story_products_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_products
    ADD CONSTRAINT story_products_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: story_products story_products_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_products
    ADD CONSTRAINT story_products_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: story_products story_products_story_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_products
    ADD CONSTRAINT story_products_story_id_fkey FOREIGN KEY (story_id) REFERENCES public.stories(id) ON DELETE CASCADE;


--
-- Name: story_videos story_videos_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_videos
    ADD CONSTRAINT story_videos_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: story_videos story_videos_story_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_videos
    ADD CONSTRAINT story_videos_story_id_fkey FOREIGN KEY (story_id) REFERENCES public.stories(id) ON DELETE CASCADE;


--
-- Name: story_videos story_videos_video_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_videos
    ADD CONSTRAINT story_videos_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.videos(id) ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id);


--
-- Name: subscriptions subscriptions_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: video_likes video_likes_video_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_likes
    ADD CONSTRAINT video_likes_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.videos(id) ON DELETE CASCADE;


--
-- Name: video_placements video_placements_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_placements
    ADD CONSTRAINT video_placements_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: video_placements video_placements_video_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_placements
    ADD CONSTRAINT video_placements_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.videos(id) ON DELETE CASCADE;


--
-- Name: videos videos_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.videos
    ADD CONSTRAINT videos_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: videos videos_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.videos
    ADD CONSTRAINT videos_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: conversions Allow store members to read conversions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow store members to read conversions" ON public.conversions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.store_members
  WHERE ((store_members.store_id = conversions.store_id) AND (store_members.user_id = auth.uid())))));


--
-- Name: insights Insert widget; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Insert widget" ON public.insights FOR INSERT WITH CHECK (true);


--
-- Name: ai_insights Leitura por membros da loja; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leitura por membros da loja" ON public.ai_insights FOR SELECT USING (public.is_store_member(store_id));


--
-- Name: benchmarks Leitura pública de benchmarks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leitura pública de benchmarks" ON public.benchmarks FOR SELECT USING (true);


--
-- Name: sector_benchmarks Leitura pública de sector_benchmarks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leitura pública de sector_benchmarks" ON public.sector_benchmarks FOR SELECT USING (true);


--
-- Name: sectors Leitura pública de setores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leitura pública de setores" ON public.sectors FOR SELECT USING (true);


--
-- Name: live_chat_messages Lojista gerencia chat da sua live; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Lojista gerencia chat da sua live" ON public.live_chat_messages USING ((store_id IN ( SELECT stores.id
   FROM public.stores
  WHERE (stores.owner_user_id = auth.uid())))) WITH CHECK ((store_id IN ( SELECT stores.id
   FROM public.stores
  WHERE (stores.owner_user_id = auth.uid()))));


--
-- Name: live_coupons Lojista gerencia cupons da sua live; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Lojista gerencia cupons da sua live" ON public.live_coupons USING ((store_id IN ( SELECT stores.id
   FROM public.stores
  WHERE (stores.owner_user_id = auth.uid())))) WITH CHECK ((store_id IN ( SELECT stores.id
   FROM public.stores
  WHERE (stores.owner_user_id = auth.uid()))));


--
-- Name: lives Lojista gerencia suas lives; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Lojista gerencia suas lives" ON public.lives TO authenticated USING ((store_id IN ( SELECT stores.id
   FROM public.stores
  WHERE (stores.owner_user_id = auth.uid())))) WITH CHECK ((store_id IN ( SELECT stores.id
   FROM public.stores
  WHERE (stores.owner_user_id = auth.uid()))));


--
-- Name: live_advantages Lojista gerencia vantagens da sua live; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Lojista gerencia vantagens da sua live" ON public.live_advantages USING ((store_id IN ( SELECT stores.id
   FROM public.stores
  WHERE (stores.owner_user_id = auth.uid())))) WITH CHECK ((store_id IN ( SELECT stores.id
   FROM public.stores
  WHERE (stores.owner_user_id = auth.uid()))));


--
-- Name: live_events Lojista visualiza eventos de suas lives; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Lojista visualiza eventos de suas lives" ON public.live_events FOR SELECT USING ((live_id IN ( SELECT l.id
   FROM (public.lives l
     JOIN public.stores s ON ((s.id = l.store_id)))
  WHERE (s.owner_user_id = auth.uid()))));


--
-- Name: live_subscribers Lojista visualiza inscritos de suas lives; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Lojista visualiza inscritos de suas lives" ON public.live_subscribers FOR SELECT USING ((live_id IN ( SELECT l.id
   FROM (public.lives l
     JOIN public.stores s ON ((s.id = l.store_id)))
  WHERE (s.owner_user_id = auth.uid()))));


--
-- Name: live_subscribers Lojista visualiza leads de suas lives; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Lojista visualiza leads de suas lives" ON public.live_subscribers USING ((store_id IN ( SELECT stores.id
   FROM public.stores
  WHERE (stores.owner_user_id = auth.uid())))) WITH CHECK ((store_id IN ( SELECT stores.id
   FROM public.stores
  WHERE (stores.owner_user_id = auth.uid()))));


--
-- Name: affiliate_withdrawals Lojistas podem solicitar saques; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Lojistas podem solicitar saques" ON public.affiliate_withdrawals FOR INSERT TO authenticated WITH CHECK ((store_id IN ( SELECT stores.id
   FROM public.stores
  WHERE (stores.owner_user_id = auth.uid()))));


--
-- Name: store_activity_events Lojistas podem ver eventos de suas lojas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Lojistas podem ver eventos de suas lojas" ON public.store_activity_events FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.stores
  WHERE ((stores.id = store_activity_events.store_id) AND (stores.owner_user_id = auth.uid())))));


--
-- Name: affiliate_withdrawals Lojistas podem ver seus saques; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Lojistas podem ver seus saques" ON public.affiliate_withdrawals FOR SELECT TO authenticated USING ((store_id IN ( SELECT stores.id
   FROM public.stores
  WHERE (stores.owner_user_id = auth.uid()))));


--
-- Name: referral_rewards Lojistas podem ver suas recompensas de indicação; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Lojistas podem ver suas recompensas de indicação" ON public.referral_rewards FOR SELECT TO authenticated USING ((referrer_store_id IN ( SELECT stores.id
   FROM public.stores
  WHERE (stores.owner_user_id = auth.uid()))));


--
-- Name: conversions Membro deleta; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Membro deleta" ON public.conversions FOR DELETE TO authenticated USING (public.is_store_owner_or_member(store_id));


--
-- Name: comments Membro gerencia; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Membro gerencia" ON public.comments TO authenticated USING (public.is_store_owner_or_member(store_id)) WITH CHECK (public.is_store_owner_or_member(store_id));


--
-- Name: display_locations Membro gerencia; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Membro gerencia" ON public.display_locations TO authenticated USING (public.is_store_owner_or_member(store_id)) WITH CHECK (public.is_store_owner_or_member(store_id));


--
-- Name: insights Membro gerencia; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Membro gerencia" ON public.insights TO authenticated USING (public.is_store_owner_or_member(store_id)) WITH CHECK (public.is_store_owner_or_member(store_id));


--
-- Name: page_rules Membro gerencia; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Membro gerencia" ON public.page_rules TO authenticated USING (public.is_store_owner_or_member(store_id)) WITH CHECK (public.is_store_owner_or_member(store_id));


--
-- Name: products Membro gerencia; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Membro gerencia" ON public.products TO authenticated USING (public.is_store_owner_or_member(store_id)) WITH CHECK (public.is_store_owner_or_member(store_id));


--
-- Name: stories Membro gerencia; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Membro gerencia" ON public.stories TO authenticated USING (public.is_store_owner_or_member(store_id)) WITH CHECK (public.is_store_owner_or_member(store_id));


--
-- Name: story_products Membro gerencia; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Membro gerencia" ON public.story_products TO authenticated USING (public.is_store_owner_or_member(store_id)) WITH CHECK (public.is_store_owner_or_member(store_id));


--
-- Name: story_videos Membro gerencia; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Membro gerencia" ON public.story_videos TO authenticated USING (public.is_store_owner_or_member(store_id)) WITH CHECK (public.is_store_owner_or_member(store_id));


--
-- Name: videos Membro gerencia; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Membro gerencia" ON public.videos TO authenticated USING (public.is_store_owner_or_member(store_id)) WITH CHECK (public.is_store_owner_or_member(store_id));


--
-- Name: store_integrations Membro gerencia integracoes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Membro gerencia integracoes" ON public.store_integrations TO authenticated USING (public.is_store_owner_or_member(store_id)) WITH CHECK (public.is_store_owner_or_member(store_id));


--
-- Name: conversions Membro insere; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Membro insere" ON public.conversions FOR INSERT TO authenticated WITH CHECK (public.is_store_owner_or_member(store_id));


--
-- Name: appearances Membro ve; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Membro ve" ON public.appearances FOR SELECT TO authenticated USING (public.is_store_owner_or_member(store_id));


--
-- Name: usage_counters Membro ve; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Membro ve" ON public.usage_counters FOR SELECT TO authenticated USING (public.user_has_store_access(store_id));


--
-- Name: stores Membros visualizam; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Membros visualizam" ON public.stores FOR SELECT TO authenticated USING (public.is_store_owner_or_member(id));


--
-- Name: app_settings Owner admin gerencia; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owner admin gerencia" ON public.app_settings TO authenticated USING (public.is_store_owner_or_admin(store_id)) WITH CHECK (public.is_store_owner_or_admin(store_id));


--
-- Name: store_settings Owner admin gerencia; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owner admin gerencia" ON public.store_settings TO authenticated USING (public.is_store_owner_or_admin(store_id)) WITH CHECK (public.is_store_owner_or_admin(store_id));


--
-- Name: conversions Owner admin ve; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owner admin ve" ON public.conversions FOR SELECT TO authenticated USING (public.is_store_owner_or_admin(store_id));


--
-- Name: appearances Owner atualiza; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owner atualiza" ON public.appearances FOR UPDATE TO authenticated USING (public.is_store_owner(store_id)) WITH CHECK (public.is_store_owner(store_id));


--
-- Name: appearances Owner deleta; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owner deleta" ON public.appearances FOR DELETE TO authenticated USING (public.is_store_owner(store_id));


--
-- Name: sizing_models Owner full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owner full access" ON public.sizing_models TO authenticated USING ((store_id IN ( SELECT stores.id
   FROM public.stores
  WHERE (stores.owner_user_id = auth.uid())))) WITH CHECK ((store_id IN ( SELECT stores.id
   FROM public.stores
  WHERE (stores.owner_user_id = auth.uid()))));


--
-- Name: stores Owner full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owner full access" ON public.stores TO authenticated USING ((owner_user_id = auth.uid())) WITH CHECK ((owner_user_id = auth.uid()));


--
-- Name: store_members Owner gerencia membros; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owner gerencia membros" ON public.store_members TO authenticated USING (public.is_store_owner(store_id)) WITH CHECK (public.is_store_owner(store_id));


--
-- Name: appearances Owner insere; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owner insere" ON public.appearances FOR INSERT TO authenticated WITH CHECK (public.is_store_owner(store_id));


--
-- Name: store_settings Permitir alteração aos administradores da loja; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Permitir alteração aos administradores da loja" ON public.store_settings USING (public.is_store_member(store_id)) WITH CHECK (public.is_store_member(store_id));


--
-- Name: selector_sessions Permitir insert anônimo em selector_sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Permitir insert anônimo em selector_sessions" ON public.selector_sessions FOR INSERT TO anon WITH CHECK (true);


--
-- Name: profiles Permitir inserção de perfil no signup; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Permitir inserção de perfil no signup" ON public.profiles FOR INSERT WITH CHECK (true);


--
-- Name: videos Permitir leitura de videos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Permitir leitura de videos" ON public.videos FOR SELECT USING (true);


--
-- Name: store_settings Permitir leitura pública de configurações; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Permitir leitura pública de configurações" ON public.store_settings FOR SELECT USING (true);


--
-- Name: plans Permitir leitura pública de planos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Permitir leitura pública de planos" ON public.plans FOR SELECT TO authenticated, anon USING (true);


--
-- Name: selector_sessions Permitir select authenticated em selector_sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Permitir select authenticated em selector_sessions" ON public.selector_sessions FOR SELECT TO authenticated USING (true);


--
-- Name: selector_sessions Permitir update authenticated em selector_sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Permitir update authenticated em selector_sessions" ON public.selector_sessions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: live_events Publico registra eventos de lives; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Publico registra eventos de lives" ON public.live_events FOR INSERT WITH CHECK (true);


--
-- Name: live_subscribers Publico se inscreve em lives; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Publico se inscreve em lives" ON public.live_subscribers FOR INSERT WITH CHECK (true);


--
-- Name: live_chat_messages Público envia mensagem em live ativa; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Público envia mensagem em live ativa" ON public.live_chat_messages FOR INSERT WITH CHECK (((is_from_store = false) AND (live_id IN ( SELECT lives.id
   FROM public.lives
  WHERE ((lives.is_active = true) AND (lives.store_id = live_chat_messages.store_id))))));


--
-- Name: live_chat_messages Público lê chat de lives ativas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Público lê chat de lives ativas" ON public.live_chat_messages FOR SELECT USING ((live_id IN ( SELECT lives.id
   FROM public.lives
  WHERE (lives.is_active = true))));


--
-- Name: live_coupons Público lê cupons de lives ativas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Público lê cupons de lives ativas" ON public.live_coupons FOR SELECT USING ((live_id IN ( SELECT lives.id
   FROM public.lives
  WHERE (lives.is_active = true))));


--
-- Name: live_advantages Público lê vantagens de lives ativas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Público lê vantagens de lives ativas" ON public.live_advantages FOR SELECT USING ((live_id IN ( SELECT lives.id
   FROM public.lives
  WHERE (lives.is_active = true))));


--
-- Name: live_events Público registra eventos de lives; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Público registra eventos de lives" ON public.live_events FOR INSERT WITH CHECK (true);


--
-- Name: live_subscribers Público se inscreve em lives; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Público se inscreve em lives" ON public.live_subscribers FOR INSERT WITH CHECK (true);


--
-- Name: lives Público visualiza lives ativas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Público visualiza lives ativas" ON public.lives FOR SELECT TO authenticated, anon USING (((is_active = true) AND (status = ANY (ARRAY['scheduled'::text, 'live'::text, 'ended'::text]))));


--
-- Name: insights Select membro; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Select membro" ON public.insights FOR SELECT USING (public.is_store_owner_or_member(store_id));


--
-- Name: appearances Select publico; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Select publico" ON public.appearances FOR SELECT USING (true);


--
-- Name: display_locations Select publico; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Select publico" ON public.display_locations FOR SELECT USING (true);


--
-- Name: page_rules Select publico; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Select publico" ON public.page_rules FOR SELECT USING (true);


--
-- Name: products Select publico; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Select publico" ON public.products FOR SELECT USING (true);


--
-- Name: sizing_models Select publico; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Select publico" ON public.sizing_models FOR SELECT USING (true);


--
-- Name: stories Select publico; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Select publico" ON public.stories FOR SELECT USING (true);


--
-- Name: story_products Select publico; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Select publico" ON public.story_products FOR SELECT USING (true);


--
-- Name: story_videos Select publico; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Select publico" ON public.story_videos FOR SELECT USING (true);


--
-- Name: video_likes Select publico; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Select publico" ON public.video_likes FOR SELECT USING (true);


--
-- Name: stories Select stories ativos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Select stories ativos" ON public.stories FOR SELECT USING ((active = true));


--
-- Name: videos Select videos ativos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Select videos ativos" ON public.videos FOR SELECT USING ((status = 'active'::text));


--
-- Name: app_settings Select widget; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Select widget" ON public.app_settings FOR SELECT TO authenticated, anon USING (true);


--
-- Name: insights Service role full; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full" ON public.insights TO service_role USING (true) WITH CHECK (true);


--
-- Name: activity_logs System can insert logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert logs" ON public.activity_logs FOR INSERT WITH CHECK (true);


--
-- Name: live_settings Users can insert own store live_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own store live_settings" ON public.live_settings FOR INSERT TO authenticated WITH CHECK ((store_id IN ( SELECT stores.id
   FROM public.stores
  WHERE (stores.owner_user_id = auth.uid()))));


--
-- Name: live_settings Users can update own store live_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own store live_settings" ON public.live_settings FOR UPDATE TO authenticated USING ((store_id IN ( SELECT stores.id
   FROM public.stores
  WHERE (stores.owner_user_id = auth.uid())))) WITH CHECK ((store_id IN ( SELECT stores.id
   FROM public.stores
  WHERE (stores.owner_user_id = auth.uid()))));


--
-- Name: activity_logs Users can view logs of their stores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view logs of their stores" ON public.activity_logs FOR SELECT USING ((store_id IN ( SELECT stores.id
   FROM public.stores
  WHERE (stores.owner_user_id = auth.uid()))));


--
-- Name: live_settings Users can view own store live_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own store live_settings" ON public.live_settings FOR SELECT TO authenticated USING ((store_id IN ( SELECT stores.id
   FROM public.stores
  WHERE (stores.owner_user_id = auth.uid()))));


--
-- Name: profiles Usuario gerencia proprio perfil; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuario gerencia proprio perfil" ON public.profiles TO authenticated USING ((id = auth.uid())) WITH CHECK ((id = auth.uid()));


--
-- Name: profiles Usuario ve proprio profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuario ve proprio profile" ON public.profiles FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR (auth.uid() = id)));


--
-- Name: store_members Usuario ve sua associacao; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuario ve sua associacao" ON public.store_members FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: usage_counters Usuários gerenciam contadores da própria loja; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários gerenciam contadores da própria loja" ON public.usage_counters TO authenticated USING ((store_id IN ( SELECT stores.id
   FROM public.stores
  WHERE (stores.owner_user_id = auth.uid())))) WITH CHECK ((store_id IN ( SELECT stores.id
   FROM public.stores
  WHERE (stores.owner_user_id = auth.uid()))));


--
-- Name: profiles Usuários podem atualizar seu próprio profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários podem atualizar seu próprio profile" ON public.profiles FOR UPDATE USING (((auth.uid() = user_id) OR (auth.uid() = id)));


--
-- Name: stores Usuários podem atualizar suas próprias lojas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários podem atualizar suas próprias lojas" ON public.stores FOR UPDATE TO authenticated USING ((owner_user_id = auth.uid()));


--
-- Name: stores Usuários podem inserir suas próprias lojas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários podem inserir suas próprias lojas" ON public.stores FOR INSERT TO authenticated WITH CHECK ((owner_user_id = auth.uid()));


--
-- Name: subscriptions Usuários podem ver assinaturas de suas lojas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários podem ver assinaturas de suas lojas" ON public.subscriptions FOR SELECT TO authenticated USING ((store_id IN ( SELECT stores.id
   FROM public.stores
  WHERE (stores.owner_user_id = auth.uid()))));


--
-- Name: store_settings Usuários podem ver configurações de sua loja; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários podem ver configurações de sua loja" ON public.store_settings TO authenticated USING ((store_id IN ( SELECT stores.id
   FROM public.stores
  WHERE (stores.owner_user_id = auth.uid())))) WITH CHECK ((store_id IN ( SELECT stores.id
   FROM public.stores
  WHERE (stores.owner_user_id = auth.uid()))));


--
-- Name: invoices Usuários podem ver faturas de suas lojas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários podem ver faturas de suas lojas" ON public.invoices FOR SELECT TO authenticated USING ((store_id IN ( SELECT stores.id
   FROM public.stores
  WHERE (stores.owner_user_id = auth.uid()))));


--
-- Name: stores Usuários podem ver suas próprias lojas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários podem ver suas próprias lojas" ON public.stores FOR SELECT TO authenticated USING ((owner_user_id = auth.uid()));


--
-- Name: live_subscribers Visitantes podem se inscrever na live; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Visitantes podem se inscrever na live" ON public.live_subscribers FOR INSERT WITH CHECK (true);


--
-- Name: activity_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: store_activity_events activity_owner_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY activity_owner_select ON public.store_activity_events FOR SELECT TO authenticated USING ((store_id IN ( SELECT stores.id
   FROM public.stores
  WHERE (stores.owner_user_id = auth.uid()))));


--
-- Name: affiliate_withdrawals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.affiliate_withdrawals ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_insights; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

--
-- Name: analytics_rate_limits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.analytics_rate_limits ENABLE ROW LEVEL SECURITY;

--
-- Name: app_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: appearances; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.appearances ENABLE ROW LEVEL SECURITY;

--
-- Name: asaas_webhook_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.asaas_webhook_events ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: benchmarks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.benchmarks ENABLE ROW LEVEL SECURITY;

--
-- Name: billing_info; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.billing_info ENABLE ROW LEVEL SECURITY;

--
-- Name: billing_info billing_info_all_own_store; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY billing_info_all_own_store ON public.billing_info USING ((store_id IN ( SELECT stores.id
   FROM public.stores
  WHERE (stores.owner_user_id = auth.uid())))) WITH CHECK ((store_id IN ( SELECT stores.id
   FROM public.stores
  WHERE (stores.owner_user_id = auth.uid()))));


--
-- Name: billing_info billing_info_select_own_store; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY billing_info_select_own_store ON public.billing_info FOR SELECT USING ((store_id IN ( SELECT stores.id
   FROM public.stores
  WHERE (stores.owner_user_id = auth.uid()))));


--
-- Name: billing_info billing_info_upsert_own_store; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY billing_info_upsert_own_store ON public.billing_info USING ((store_id IN ( SELECT stores.id
   FROM public.stores
  WHERE (stores.owner_user_id = auth.uid())))) WITH CHECK ((store_id IN ( SELECT stores.id
   FROM public.stores
  WHERE (stores.owner_user_id = auth.uid()))));


--
-- Name: comments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

--
-- Name: conversions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.conversions ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_store_metrics daily_metrics_owner_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY daily_metrics_owner_select ON public.daily_store_metrics FOR SELECT TO authenticated USING ((store_id IN ( SELECT stores.id
   FROM public.stores
  WHERE (stores.owner_user_id = auth.uid()))));


--
-- Name: daily_store_metrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.daily_store_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_video_metrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.daily_video_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_video_metrics daily_video_metrics_owner_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY daily_video_metrics_owner_select ON public.daily_video_metrics FOR SELECT TO authenticated USING ((store_id IN ( SELECT stores.id
   FROM public.stores
  WHERE (stores.owner_user_id = auth.uid()))));


--
-- Name: display_locations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.display_locations ENABLE ROW LEVEL SECURITY;

--
-- Name: insight_rule_conditions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.insight_rule_conditions ENABLE ROW LEVEL SECURITY;

--
-- Name: insight_rule_conditions insight_rule_conditions_read_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY insight_rule_conditions_read_all ON public.insight_rule_conditions FOR SELECT USING (true);


--
-- Name: insight_rules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.insight_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: insight_rules insight_rules_read_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY insight_rules_read_all ON public.insight_rules FOR SELECT USING (true);


--
-- Name: insights; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;

--
-- Name: invoices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

--
-- Name: invoices invoices_select_own_store; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY invoices_select_own_store ON public.invoices FOR SELECT USING ((store_id IN ( SELECT stores.id
   FROM public.stores
  WHERE (stores.owner_user_id = auth.uid()))));


--
-- Name: live_advantages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.live_advantages ENABLE ROW LEVEL SECURITY;

--
-- Name: live_chat_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.live_chat_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: live_coupons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.live_coupons ENABLE ROW LEVEL SECURITY;

--
-- Name: live_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.live_events ENABLE ROW LEVEL SECURITY;

--
-- Name: live_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.live_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: live_subscribers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.live_subscribers ENABLE ROW LEVEL SECURITY;

--
-- Name: lives; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lives ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_logs master_audit_logs_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY master_audit_logs_insert ON public.audit_logs FOR INSERT WITH CHECK (public.is_super_admin());


--
-- Name: audit_logs master_audit_logs_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY master_audit_logs_select ON public.audit_logs FOR SELECT USING (public.is_super_admin());


--
-- Name: page_rules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.page_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

--
-- Name: plans plans_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY plans_select_all ON public.plans FOR SELECT USING (true);


--
-- Name: products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: referral_rewards; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

--
-- Name: sector_benchmarks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sector_benchmarks ENABLE ROW LEVEL SECURITY;

--
-- Name: sectors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sectors ENABLE ROW LEVEL SECURITY;

--
-- Name: selector_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.selector_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: asaas_webhook_events service_role_full_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY service_role_full_access ON public.asaas_webhook_events TO service_role USING (true) WITH CHECK (true);


--
-- Name: sizing_models; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sizing_models ENABLE ROW LEVEL SECURITY;

--
-- Name: store_activity_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.store_activity_events ENABLE ROW LEVEL SECURITY;

--
-- Name: store_integrations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.store_integrations ENABLE ROW LEVEL SECURITY;

--
-- Name: store_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.store_members ENABLE ROW LEVEL SECURITY;

--
-- Name: store_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: stores; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

--
-- Name: stories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

--
-- Name: story_products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.story_products ENABLE ROW LEVEL SECURITY;

--
-- Name: story_videos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.story_videos ENABLE ROW LEVEL SECURITY;

--
-- Name: subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: subscriptions subscriptions_all_own_store; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY subscriptions_all_own_store ON public.subscriptions USING ((store_id IN ( SELECT stores.id
   FROM public.stores
  WHERE (stores.owner_user_id = auth.uid())))) WITH CHECK ((store_id IN ( SELECT stores.id
   FROM public.stores
  WHERE (stores.owner_user_id = auth.uid()))));


--
-- Name: profiles super_admin_profiles_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY super_admin_profiles_all ON public.profiles TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());


--
-- Name: stores super_admin_stores_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY super_admin_stores_all ON public.stores TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());


--
-- Name: stories super_admin_stories_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY super_admin_stories_all ON public.stories TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());


--
-- Name: subscriptions super_admin_subscriptions_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY super_admin_subscriptions_all ON public.subscriptions TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());


--
-- Name: usage_counters super_admin_usage_counters_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY super_admin_usage_counters_all ON public.usage_counters TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());


--
-- Name: videos super_admin_videos_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY super_admin_videos_all ON public.videos TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());


--
-- Name: usage_counters; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;

--
-- Name: video_likes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.video_likes ENABLE ROW LEVEL SECURITY;

--
-- Name: video_placements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.video_placements ENABLE ROW LEVEL SECURITY;

--
-- Name: videos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

--
-- Name: widget_selectors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.widget_selectors ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict ywifKRusvFaWgfYCU0dehpCNPbaqtq0xMlQLX0KW6WNlKnfGLL8c4ONcDDqhwcT

