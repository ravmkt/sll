export interface PlatformLogo { key: string; label: string; logo: string }

export const PLATFORM_LOGOS: PlatformLogo[] = [
  { key: 'bagy', label: 'Bagy', logo: '/assets/platforms/bagy.svg' },
  { key: 'cartpanda', label: 'CartPanda', logo: '/assets/platforms/cartpanda.svg' },
  { key: 'irroba', label: 'Irroba', logo: '/assets/platforms/irroba.svg' },
  { key: 'lojaintegrada', label: 'Loja Integrada', logo: '/assets/platforms/lojaintegrada.svg' },
  { key: 'nuvemshop', label: 'Nuvemshop', logo: '/assets/platforms/nuvemshop.svg' },
  { key: 'shopify', label: 'Shopify', logo: '/assets/platforms/shopify.svg' },
  { key: 'tray', label: 'Tray', logo: '/assets/platforms/tray.svg' },
  { key: 'yampi', label: 'Yampi', logo: '/assets/platforms/yampi.svg' },
];

export function getPlatformLogo(key: string): PlatformLogo | undefined {
  const k = String(key || '').toLowerCase().replace(/[^a-z]/g, '');
  return PLATFORM_LOGOS.find((p) => p.key === k);
}