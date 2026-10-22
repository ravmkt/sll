import { supabaseLiveCommerce as lc } from '@/services/supabaseClients';
import type { PlatformAdapter } from './types';

// O site e a fonte de verdade: o evento gravado aqui e entregue ao widget via Realtime.
export const siteAdapter: PlatformAdapter = {
  platform: 'site',
  async publish(e) {
    const { error } = await lc.from('live_events').insert({
      live_id: e.liveId,
      event_type: e.type,
      product_id: e.productId ?? null,
      platform: 'site',
      metadata: {
        code: e.code ?? null,
        coupon_id: e.couponId ?? null,
        banner_id: e.bannerId ?? null,
        source: 'cockpit',
      },
    });
    return { platform: 'site', ok: !error, error: error?.message };
  },
};