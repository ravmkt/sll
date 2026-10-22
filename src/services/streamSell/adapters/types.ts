import type { LiveEventPayload, Platform } from '@/lib/streamSell/contract';

export interface AdapterResult {
  platform: Platform;
  ok: boolean;
  skipped?: boolean;
  error?: string;
}

export interface PlatformAdapter {
  platform: Platform;
  publish(event: LiveEventPayload): Promise<AdapterResult>;
}