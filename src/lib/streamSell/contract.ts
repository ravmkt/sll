export type Platform = 'site' | 'youtube' | 'instagram' | 'tiktok';

// Mesma lista da policy public_read_cockpit (live_events). Alterar nos dois lugares.
export const COCKPIT_EVENT_TYPES = [
  'live.start', 'live.end',
  'product.show', 'product.hide',
  'coupon.activate', 'coupon.deactivate',
  'banner.show', 'banner.hide',
] as const;

export type LiveEventType = (typeof COCKPIT_EVENT_TYPES)[number];

export interface LiveEventPayload {
  liveId: string;
  type: LiveEventType;
  productId?: string | null;
  couponId?: string | null;
  bannerId?: string | null;
  code?: string | null;
}