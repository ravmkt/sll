import type { LiveEventPayload, Platform } from '@/lib/streamSell/contract';
import type { AdapterResult, PlatformAdapter } from './types';
import { siteAdapter } from './site';
import { makeStubAdapter } from './stubs';

const registry: Record<Platform, PlatformAdapter> = {
  site: siteAdapter,
  youtube: makeStubAdapter('youtube'),
  instagram: makeStubAdapter('instagram'),
  tiktok: makeStubAdapter('tiktok'),
};

export async function dispatchLiveEvent(
  destinations: string[],
  event: LiveEventPayload,
): Promise<AdapterResult[]> {
  const extra = (destinations || []).filter((p): p is Platform => p in registry);
  const targets = Array.from(new Set<Platform>(['site', ...extra]));
  return Promise.all(
    targets.map((p) =>
      registry[p].publish(event).catch((err: any): AdapterResult => ({
        platform: p,
        ok: false,
        error: String(err?.message ?? err),
      })),
    ),
  );
}