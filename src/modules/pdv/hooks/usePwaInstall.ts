import { useCallback, useEffect, useState } from 'react';

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: InstallEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as InstallEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    notify();
  });
}

/** canInstall = true so quando o navegador permite instalar e o app ainda nao esta instalado. */
export function usePwaInstall() {
  const [, force] = useState(0);

  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);

  const standalone = typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches;

  const install = useCallback(async () => {
    if (!deferred) return;
    const d = deferred;
    await d.prompt();
    await d.userChoice;
    deferred = null;
    notify();
  }, []);

  return { canInstall: !!deferred && !standalone, install };
}