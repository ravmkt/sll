import type { Platform } from '@/lib/streamSell/contract';
import type { PlatformAdapter } from './types';

// Fase 2: trocar cada stub pelo adaptador real (YouTube, Instagram, TikTok).
export const makeStubAdapter = (platform: Platform): PlatformAdapter => ({
  platform,
  async publish() {
    return { platform, ok: false, skipped: true, error: 'Destino ainda nao conectado' };
  },
});