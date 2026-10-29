import { supabaseLiveCommerce, supabasePublic } from './supabaseClients';

export interface NewLiveInput {
  store_id: string;
  title: string;
  youtube_url?: string;
  youtube_video_id?: string;
  status?: 'scheduled' | 'live' | 'finished';
  scheduled_at?: string;
  is_active?: boolean;
  [key: string]: any;
}

export interface LiveItem {
  id: string;
  store_id: string;
  title: string;
  youtube_video_id?: string | null;
  youtube_thumbnail_url?: string | null;
  youtube_url?: string | null;
  status: 'scheduled' | 'live' | 'finished';
  is_active: boolean;
  scheduled_at?: string | null;
  created_at: string;
  [key: string]: any;
}

export const LiveCommerceDatabaseService = {
  // ==========================================
  // --- LIVES (live_commerce.lives) ---
  // ==========================================
  async getLives(storeId: string) {
    const { data, error } = await supabaseLiveCommerce
      .from('lives')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as LiveItem[];
  },

  async getLiveById(liveId: string) {
    const { data, error } = await supabaseLiveCommerce
      .from('lives')
      .select('*')
      .eq('id', liveId)
      .maybeSingle();
    if (error) throw error;
    return data as LiveItem | null;
  },

  async createLive(payload: Record<string, any>) {
    let videoId = payload.youtube_video_id;
    if (!videoId && payload.youtube_url) {
      const match = payload.youtube_url.match(
        /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|live\/))([a-zA-Z0-9_-]{11})/
      );
      if (match) videoId = match[1];
    }

    const insertData = {
      ...payload,
      youtube_video_id: videoId || payload.youtube_video_id || null,
      youtube_thumbnail_url: payload.youtube_thumbnail_url || (videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null),
      status: payload.status || 'scheduled',
      is_active: payload.is_active !== undefined ? payload.is_active : true,
    };

    const { data, error } = await supabaseLiveCommerce
      .from('lives')
      .insert(insertData)
      .select()
      .single();
    if (error) throw error;
    return data as LiveItem;
  },

  async updateLive(liveId: string, updates: Record<string, any>) {
    const { data, error } = await supabaseLiveCommerce
      .from('lives')
      .update(updates)
      .eq('id', liveId)
      .select()
      .single();
    if (error) throw error;
    return data as LiveItem;
  },

  async getLiveProductPrices(liveId: string): Promise<Record<string, string>> {
    const { data, error } = await supabaseLiveCommerce
      .from('live_products')
      .select('product_id, price_override')
      .eq('live_id', liveId);
    if (error) throw error;
    const out: Record<string, string> = {};
    (data || []).forEach((r: any) => {
      if (r.price_override != null) out[r.product_id] = Number(r.price_override).toFixed(2).replace('.', ',');
    });
    return out;
  },

  async syncLiveItems(
    liveId: string,
    storeId: string,
    items: { product_id: string }[],
    coupons: { code: string; description: string }[],
    previousCouponCodes: string[],
    priceOverrides: Record<string, number | null> = {},
  ) {
    // ---- Produtos ----
    const { data: lp, error: lpErr } = await supabaseLiveCommerce
      .from('live_products')
      .select('id, product_id, code')
      .eq('live_id', liveId);
    if (lpErr) throw lpErr;
    const existing: any[] = lp || [];
    const wanted = Array.from(new Set(items.map((i) => i.product_id)));

    const toDelete = existing.filter((r) => !wanted.includes(r.product_id)).map((r) => r.id);
    if (toDelete.length) {
      const { error } = await supabaseLiveCommerce.from('live_products').delete().in('id', toDelete);
      if (error) throw error;
    }

    const kept = existing.filter((r) => wanted.includes(r.product_id));
    const used = new Set<string>(kept.filter((r) => r.code).map((r) => String(r.code)));
    let next = 1;
    const nextCode = () => {
      while (used.has(String(next))) next++;
      used.add(String(next));
      return String(next);
    };
    const byProduct = new Map<string, any>(kept.map((r) => [r.product_id, r]));
    const inserts: any[] = [];

    for (let i = 0; i < wanted.length; i++) {
      const row = byProduct.get(wanted[i]);
      if (row) {
        const patch: Record<string, any> = { display_order: i };
        if (wanted[i] in priceOverrides) patch.price_override = priceOverrides[wanted[i]];
        if (!row.code) patch.code = nextCode();
        const { error } = await supabaseLiveCommerce.from('live_products').update(patch).eq('id', row.id);
        if (error) throw error;
      } else {
        inserts.push({
          live_id: liveId,
          store_id: storeId,
          product_id: wanted[i],
          code: nextCode(),
          display_order: i,
          price_override: priceOverrides[wanted[i]] ?? null,
        });
      }
    }
    if (inserts.length) {
      const { error } = await supabaseLiveCommerce.from('live_products').insert(inserts);
      if (error) throw error;
    }

    // ---- Cupons ----
    const percentOf = (d: string): number | null => {
      const m = (d || '').match(/(\d{1,3}(?:[.,]\d+)?)\s*%/);
      if (!m) return null;
      const v = Number(m[1].replace(',', '.'));
      return v > 0 && v <= 100 ? v : null;
    };
    const clean = new Map<string, { code: string; percent: number | null }>();
    coupons.forEach((c) => {
      const code = c.code.trim().toUpperCase();
      if (code && !clean.has(code)) clean.set(code, { code, percent: percentOf(c.description) });
    });

    const removed = previousCouponCodes
      .map((c) => c.trim().toUpperCase())
      .filter((c) => c && !clean.has(c));
    if (removed.length) {
      const { error } = await supabaseLiveCommerce
        .from('live_coupons').delete().eq('live_id', liveId).in('code', removed);
      if (error) throw error;
    }

    const { data: lcRows, error: lcErr } = await supabaseLiveCommerce
      .from('live_coupons')
      .select('id, code')
      .eq('live_id', liveId);
    if (lcErr) throw lcErr;
    const byCode = new Map<string, any>((lcRows || []).map((r: any) => [String(r.code).toUpperCase(), r]));
    const couponInserts: any[] = [];

    for (const c of clean.values()) {
      const row = byCode.get(c.code);
      if (row) {
        if (c.percent !== null) {
          const { error } = await supabaseLiveCommerce
            .from('live_coupons').update({ discount_percent: c.percent }).eq('id', row.id);
          if (error) throw error;
        }
      } else {
        couponInserts.push({
          live_id: liveId,
          store_id: storeId,
          code: c.code,
          discount_percent: c.percent,
          is_active: false,
        });
      }
    }
    if (couponInserts.length) {
      const { error } = await supabaseLiveCommerce.from('live_coupons').insert(couponInserts);
      if (error) throw error;
    }
    return true;
  },
  async deleteLive(liveId: string) {
    const { error } = await supabaseLiveCommerce
      .from('lives')
      .delete()
      .eq('id', liveId);
    if (error) throw error;
    return true;
  },

  // ==========================================
  // --- EVENTOS E MÉTRICAS (live_commerce.live_events) ---
  // ==========================================
  async getLiveEvents(liveId: string) {
    const { data, error } = await supabaseLiveCommerce
      .from('live_events')
      .select('*')
      .eq('live_id', liveId);
    if (error) throw error;
    return data || [];
  },

  async getLiveOrders(liveId: string, storeId: string) {
    try {
      const { data, error } = await supabasePublic
        .from('orders')
        .select('*')
        .eq('store_id', storeId)
        .eq('live_id', liveId);
      if (error) return [];
      return data || [];
    } catch {
      return [];
    }
  },

  // ==========================================
  // --- CONFIGURAÇÕES DE APARÊNCIA (live_commerce.appearance_settings) ---
  // ==========================================
  async getLiveSettings(storeId: string) {
    const { data, error } = await supabaseLiveCommerce
      .from('appearance_settings')
      .select('widget_divulgacao, widget_aovivo, player_settings')
      .eq('store_id', storeId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async getSettings(storeId: string) {
    return this.getLiveSettings(storeId);
  },

  async upsertLiveSettings(storeId: string, settings: {
    widget_divulgacao?: any;
    widget_aovivo?: any;
    player_settings?: any;
  }) {
    const { data, error } = await supabaseLiveCommerce
      .from('appearance_settings')
      .upsert(
        {
          store_id: storeId,
          ...settings,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'store_id' }
      )
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async saveSettings(storeId: string, settings: {
    widget_divulgacao?: any;
    widget_aovivo?: any;
    player_settings?: any;
  }) {
    return this.upsertLiveSettings(storeId, settings);
  },

  // ==========================================
  // --- PRODUTOS E LOJA (public.products / public.stores) ---
  // ==========================================
  async getProducts(storeId: string) {
    const { data, error } = await supabasePublic
      .from('products')
      .select('id, name, price, promotional_price:sale_price, image_url, permalink:product_url, category, stock_qty')
      .eq('store_id', storeId)
      .order('name', { ascending: true });
    if (error) throw error;
    return (data || []).map(p => ({
      ...p,
      product_url: p.permalink || ''
    }));
  },

  async getStoreData(storeId: string) {
    const { data, error } = await supabasePublic
      .from('stores')
      .select('id, name, logo_url, slug')
      .eq('id', storeId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  // ==========================================
  // --- UPLOAD DE MÍDIA (Storage central) ---
  // ==========================================
  async uploadFile(bucket: string, filePath: string, file: File) {
    const { error } = await supabasePublic.storage
      .from(bucket)
      .upload(filePath, file, { cacheControl: '3600', upsert: true });
    if (error) throw error;

    const { data } = supabasePublic.storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl;
  }
};
