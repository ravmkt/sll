import { supabase } from '@/lib/supabase';
import { supabaseLiveCommerce as lc } from '@/services/supabaseClients';
import { dispatchLiveEvent } from './adapters';

export interface CockpitAdvantage {
  id: string;
  title: string;
  description: string;
}
export interface CockpitLive {
  advantages: CockpitAdvantage[];
  activeAdvantageIdx: number | null;
  id: string;
  storeId: string;
  title: string;
  status: string;
  activeDestinations: string[];
}
export interface CockpitProduct {
  id: string;
  productId: string;
  code: string | null;
  order: number;
  isOnAir: boolean;
  name: string;
  price: number | null;
  image: string | null;
}
export interface CockpitCoupon {
  id: string;
  code: string;
  discountPercent: number | null;
  isActive: boolean;
  usedCount: number;
  maxUses: number | null;
}
export interface CockpitData {
  live: CockpitLive;
  products: CockpitProduct[];
  coupons: CockpitCoupon[];
}
export interface CockpitEvent {
  id: string;
  event_type: string;
  created_at: string;
  platform?: string | null;
  metadata?: Record<string, unknown> | null;
}

// Ponte ate o passo 3 do assistente gravar em live_products
async function seedProducts(live: any) {
  const ids: string[] = Array.isArray(live.featured_product_ids) ? live.featured_product_ids : [];
  if (!ids.length) return;
  const { count } = await lc
    .from('live_products')
    .select('id', { count: 'exact', head: true })
    .eq('live_id', live.id);
  if (count) return;
  const { error } = await lc.from('live_products').insert(
    ids.map((pid, i) => ({
      live_id: live.id,
      store_id: live.store_id,
      product_id: pid,
      code: String(i + 1),
      display_order: i,
    })),
  );
  if (error) console.warn('[StreamSell] seed de produtos falhou:', error.message);
}

export async function getCockpit(liveId: string): Promise<CockpitData | null> {
  const { data: live, error } = await lc
    .from('lives')
    .select('id, store_id, title, status, active_destinations, featured_product_ids, advantages, spotlight_advantage_idx')
    .eq('id', liveId)
    .maybeSingle();
  if (error) throw error;
  if (!live) return null;

  await seedProducts(live);

  const [lp, cp] = await Promise.all([
    lc.from('live_products')
      .select('id, product_id, code, display_order, is_on_air')
      .eq('live_id', liveId)
      .order('display_order', { ascending: true }),
    lc.from('live_coupons')
      .select('id, code, discount_percent, max_uses, used_count, is_active')
      .eq('live_id', liveId)
      .order('created_at', { ascending: true }),
  ]);
  if (lp.error) throw lp.error;
  if (cp.error) throw cp.error;

  const ids = (lp.data || []).map((r: any) => r.product_id);
  let prods: any[] = [];
  if (ids.length) {
    const r = await supabase.from('products').select('id, name, price, image_url').in('id', ids);
    prods = r.data || [];
  }
  const byId = new Map(prods.map((p) => [p.id, p]));

  return {
    live: {
      id: live.id,
      storeId: live.store_id,
      title: live.title,
      status: live.status || 'scheduled',
      activeDestinations: Array.isArray(live.active_destinations) ? live.active_destinations : ['site'],
          advantages: Array.isArray(live.advantages)
            ? live.advantages.map((x: any, i: number) => ({
                id: String(x?.id ?? `a_${i}`),
                title: String(x?.title ?? ''),
                description: String(x?.description ?? ''),
              }))
            : [],
          activeAdvantageIdx: typeof live.spotlight_advantage_idx === 'number' ? live.spotlight_advantage_idx : null,
    },
    products: (lp.data || []).map((r: any) => {
      const p = byId.get(r.product_id);
      return {
        id: r.id,
        productId: r.product_id,
        code: r.code,
        order: r.display_order ?? 0,
        isOnAir: !!r.is_on_air,
        name: p?.name ?? 'Produto removido',
        price: p?.price ?? null,
        image: p?.image_url ?? null,
      };
    }),
    coupons: (cp.data || []).map((c: any) => ({
      id: c.id,
      code: c.code,
      discountPercent: c.discount_percent,
      isActive: !!c.is_active,
      usedCount: c.used_count ?? 0,
      maxUses: c.max_uses,
    })),
  };
}

export async function getRecentEvents(liveId: string): Promise<CockpitEvent[]> {
  const { data, error } = await lc
    .from('live_events')
    .select('id, event_type, created_at, platform, metadata')
    .eq('live_id', liveId)
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw error;
  return (data || []) as CockpitEvent[];
}

export async function setProductOnAir(live: CockpitLive, product: CockpitProduct | null) {
  const off = await lc.from('live_products').update({ is_on_air: false }).eq('live_id', live.id).eq('is_on_air', true);
  if (off.error) throw off.error;
  if (product) {
    const on = await lc.from('live_products')
      .update({ is_on_air: true, on_air_at: new Date().toISOString() })
      .eq('id', product.id);
    if (on.error) throw on.error;
  }
  const sp = await lc.from('lives').update({ spotlight_product_id: product?.productId ?? null }).eq('id', live.id);
  if (sp.error) throw sp.error;
  return dispatchLiveEvent(live.activeDestinations, {
    liveId: live.id,
    type: product ? 'product.show' : 'product.hide',
    productId: product?.productId ?? null,
    code: product?.code ?? null,
  });
}

export async function setCouponActive(live: CockpitLive, coupon: CockpitCoupon, active: boolean) {
  const up = await lc.from('live_coupons').update({ is_active: active }).eq('id', coupon.id);
  if (up.error) throw up.error;
  const sp = await lc.from('lives').update({ spotlight_coupon_code: active ? coupon.code : null }).eq('id', live.id);
  if (sp.error) throw sp.error;
  return dispatchLiveEvent(live.activeDestinations, {
    liveId: live.id,
    type: active ? 'coupon.activate' : 'coupon.deactivate',
    couponId: coupon.id,
    code: coupon.code,
  });
}

export async function setAdvantageActive(live: CockpitLive, idx: number | null) {
  const adv = idx == null ? null : live.advantages[idx];
  if (idx != null && !adv) throw new Error('Beneficio nao encontrado');
  const up = await lc.from('lives').update({ spotlight_advantage_idx: idx }).eq('id', live.id);
  if (up.error) throw up.error;
  return dispatchLiveEvent(live.activeDestinations, {
    liveId: live.id,
    type: adv ? 'advantage.activate' : 'advantage.deactivate',
    advantageId: adv?.id ?? null,
  });
}

export async function addCoupon(live: CockpitLive, code: string, percent: number) {
  const clean = code.trim().toUpperCase();
  if (!clean) throw new Error('Informe o codigo do cupom');
  if (!(percent > 0 && percent <= 100)) throw new Error('Desconto deve ficar entre 1 e 100%');
  const { error } = await lc.from('live_coupons').insert({
    live_id: live.id,
    store_id: live.storeId,
    code: clean,
    discount_percent: percent,
    is_active: false,
  });
  if (error) throw error;
}

export async function setBannerActive(live: CockpitLive, bannerId: string, active: boolean) {
  const up = await lc.from('live_banners').update({ is_active: active }).eq('id', bannerId);
  if (up.error) throw up.error;
  return dispatchLiveEvent(live.activeDestinations, {
    liveId: live.id,
    type: active ? 'banner.show' : 'banner.hide',
    bannerId,
  });
}

export async function setLiveStatus(live: CockpitLive, status: 'live' | 'finished') {
  if (status === 'finished') await setProductOnAir(live, null);
  const now = new Date().toISOString();
  const patch = status === 'live' ? { status, started_at: now } : { status, ended_at: now };
  const up = await lc.from('lives').update(patch).eq('id', live.id);
  if (up.error) throw up.error;
  return dispatchLiveEvent(live.activeDestinations, {
    liveId: live.id,
    type: status === 'live' ? 'live.start' : 'live.end',
  });
}

export interface DestinationRow {
  id: string;
  platform: 'youtube' | 'instagram' | 'tiktok';
  status: 'not_connected' | 'connected' | 'error' | 'expired';
  external_account: string | null;
  connected_at: string | null;
}

// Apenas colunas sem credenciais (o SELECT das demais e negado pelo banco)
export async function listDestinations(): Promise<DestinationRow[]> {
  const { data, error } = await lc
    .from('live_destinations')
    .select('id, platform, status, external_account, connected_at');
  if (error) throw error;
  return (data || []) as DestinationRow[];
}

/* ===== ESTUDIO ===== */
export interface StudioInfo {
  youtube_video_id: string | null;
  youtube_url: string | null;
  started_at: string | null;
}
export interface StudioStats { current: number; peak: number }
export interface StudioChatMessage {
  id: string;
  author_name: string | null;
  message: string;
  created_at: string;
  is_from_store?: boolean | null;
}

export async function getStudioInfo(liveId: string): Promise<StudioInfo | null> {
  const { data, error } = await (lc as any)
    .from('lives')
    .select('youtube_video_id, youtube_url, started_at')
    .eq('id', liveId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as StudioInfo | null;
}

export async function getStudioStats(liveId: string): Promise<StudioStats> {
  const { data, error } = await (lc as any).rpc('live_studio_stats', { p_live_id: liveId });
  if (error) throw error;
  return { current: Number(data?.current) || 0, peak: Number(data?.peak) || 0 };
}

export async function listStudioChat(liveId: string): Promise<StudioChatMessage[]> {
  const { data, error } = await (lc as any)
    .from('live_chat_messages')
    .select('id, author_name, message, created_at, is_from_store')
    .eq('live_id', liveId)
    .eq('archived', false)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return ((data || []) as StudioChatMessage[]).reverse();
}

export async function sendStudioChat(liveId: string, text: string) {
  const msg = text.trim().slice(0, 500);
  if (!msg) throw new Error('Digite uma mensagem');
  const { data: l } = await (lc as any).from('lives').select('store_id').eq('id', liveId).maybeSingle();
  const { error } = await (lc as any).from('live_chat_messages').insert({
    live_id: liveId,
    store_id: l?.store_id ?? null,
    author_name: 'Loja',
    message: msg,
    is_from_store: true,
  });
  if (error) throw error;
}

export async function addAdvantage(live: CockpitLive, title: string, description: string) {
  const t = title.trim();
  const d = description.trim();
  if (!t) throw new Error('Informe o titulo do beneficio');
  const { data, error } = await (lc as any).from('lives').select('advantages').eq('id', live.id).maybeSingle();
  if (error) throw error;
  const list = Array.isArray(data?.advantages) ? data.advantages : [];
  const item = {
    id: (globalThis.crypto && 'randomUUID' in globalThis.crypto) ? globalThis.crypto.randomUUID() : String(Date.now()),
    title: t,
    description: d,
  };
  const up = await (lc as any).from('lives').update({ advantages: [...list, item] }).eq('id', live.id);
  if (up.error) throw up.error;
}

/* ===== ESTUDIO V3 ===== */
export interface CatalogProduct {
  id: string;
  name: string;
  price: number | null;
  image_url: string | null;
}

export async function searchCatalog(storeId: string, term: string): Promise<CatalogProduct[]> {
  const q = term.trim().replace(/[%,()]/g, ' ');
  if (q.length < 2) return [];
  const { data, error } = await (supabase as any)
    .from('products')
    .select('id, name, price, image_url')
    .eq('store_id', storeId)
    .ilike('name', `%${q}%`)
    .limit(8);
  if (error) throw error;
  return (data || []) as CatalogProduct[];
}

export async function linkProduct(live: { id: string; storeId: string }, productId: string, code: number) {
  const base: Record<string, unknown> = { live_id: live.id, product_id: productId, code, display_order: code };
  let res = await (lc as any).from('live_products').insert({ ...base, store_id: live.storeId });
  if (res.error && /store_id|column/i.test(res.error.message || '')) {
    res = await (lc as any).from('live_products').insert(base);
  }
  if (res.error) throw res.error;
}

export async function deleteStudioChat(id: string) {
  const { data, error } = await (lc as any).from('live_chat_messages').delete().eq('id', id).select('id');
  if (error) throw error;
  if (!data || data.length === 0) throw new Error('Sem permissao para apagar esta mensagem');
}
