const KEEP_EXACT = new Set([
  'sll_store_id',
  'store_id',
  'sll_current_store_id',
  'current_store_id',
  'sll_referral_code',
  'sll_referral_pending',
  'sll_oauth_store_id',
  'sll_checkout_intent',
  'sll_social_popup',
]);
const KEEP_PREFIX = ['sb-', 'vidlytics_'];

export async function clearLocalCache(): Promise<void> {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) keys.push(k);
    }
    keys.forEach((k) => {
      if (KEEP_EXACT.has(k) || KEEP_PREFIX.some((p) => k.startsWith(p))) return;
      localStorage.removeItem(k);
    });
  } catch { /* storage indisponivel */ }

  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch { /* ignora */ }

  try {
    if ('caches' in window) {
      const names = await caches.keys();
      await Promise.all(names.map((n) => caches.delete(n)));
    }
  } catch { /* ignora */ }
}