import { useCallback, useEffect, useState } from 'react';
import { getModuleAppEnabled, setModuleAppEnabled, type AppModuleKey } from '@/services/moduleAppService';

export function useModuleAppEnabled(storeId: string | null, moduleKey: AppModuleKey) {
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!storeId) return;
    let alive = true;
    getModuleAppEnabled(storeId, moduleKey).then((v) => {
      if (!alive) return;
      setEnabled(v);
      setLoading(false);
    });
    const sync = (e: Event) => {
      const d = (e as CustomEvent).detail as { module?: AppModuleKey; enabled?: boolean } | undefined;
      if (d?.module === moduleKey && typeof d.enabled === 'boolean') setEnabled(d.enabled);
    };
    window.addEventListener('sll:module-app-enabled', sync);
    return () => {
      alive = false;
      window.removeEventListener('sll:module-app-enabled', sync);
    };
  }, [storeId, moduleKey]);

  const toggle = useCallback(async () => {
    if (!storeId || saving) return;
    const next = !enabled;
    setEnabled(next);
    setSaving(true);
    setError(null);
    const ok = await setModuleAppEnabled(storeId, moduleKey, next);
    setSaving(false);
    if (!ok) {
      setEnabled(!next);
      setError('Não foi possível salvar.');
      return;
    }
    window.dispatchEvent(new CustomEvent('sll:module-app-enabled', { detail: { module: moduleKey, enabled: next } }));
  }, [storeId, moduleKey, enabled, saving]);

  return { enabled, loading, saving, error, toggle };
}