import { useCallback, useEffect, useRef } from 'react';
import { driver, type Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import '@/styles/tour.css';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export type TourStep = {
  element: string;
  title: string;
  description: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
};

const NOAH_IMG = '/assets/noah-a1.png';
const lsKey = (uid: string, key: string) => `sll_tour_${key}_${uid}`;

async function wasDone(uid: string, key: string): Promise<boolean> {
  try {
    if (localStorage.getItem(lsKey(uid, key))) return true;
  } catch { /* ignora */ }
  try {
    const { data } = await (supabase as any)
      .from('user_tours')
      .select('tour_key')
      .eq('user_id', uid)
      .eq('tour_key', key)
      .maybeSingle();
    if (data) {
      try { localStorage.setItem(lsKey(uid, key), '1'); } catch { /* ignora */ }
      return true;
    }
  } catch { /* ignora */ }
  return false;
}

async function markDone(uid: string, key: string) {
  try { localStorage.setItem(lsKey(uid, key), '1'); } catch { /* ignora */ }
  try {
    await (supabase as any)
      .from('user_tours')
      .upsert({ user_id: uid, tour_key: key }, { onConflict: 'user_id,tour_key' });
  } catch { /* ignora */ }
}

function runTour(steps: TourStep[], onEnd: () => void): Driver | null {
  const valid = steps.filter((s) => document.querySelector(s.element));
  if (!valid.length) return null;

  const d: Driver = driver({
    showProgress: true,
    progressText: '{{current}} de {{total}}',
    nextBtnText: 'Próximo',
    prevBtnText: 'Anterior',
    doneBtnText: 'Concluir',
    popoverClass: 'sll-tour',
    overlayOpacity: 0.6,
    stagePadding: 8,
    stageRadius: 12,
    allowClose: true,
    steps: valid.map((s) => ({
      element: s.element,
      popover: { title: s.title, description: s.description, side: s.side ?? 'bottom', align: 'start' },
    })),
    onPopoverRender: (popover) => {
      const img = document.createElement('img');
      img.src = NOAH_IMG;
      img.alt = 'Noah';
      img.className = 'sll-tour-noah';
      popover.title.prepend(img);

      if (!d.isLastStep()) {
        const skip = document.createElement('button');
        skip.type = 'button';
        skip.className = 'sll-tour-skip';
        skip.textContent = 'Pular tour';
        skip.onclick = () => d.destroy();
        popover.footer.insertBefore(skip, popover.footerButtons);
      }
    },
    onDestroyed: () => onEnd(),
  });
  d.drive();
  return d;
}

export function usePageTour(tourKey: string, steps: TourStep[]) {
  const { user } = useAuth();
  const driverRef = useRef<Driver | null>(null);
  const stepsRef = useRef(steps);
  stepsRef.current = steps;
  const silent = useRef(false);

  const start = useCallback(() => {
    if (!user) return;
    driverRef.current?.destroy();
    driverRef.current = runTour(stepsRef.current, () => {
      driverRef.current = null;
      if (!silent.current) void markDone(user.id, tourKey);
    });
  }, [user, tourKey]);

  useEffect(() => {
    silent.current = false;
    return () => {
      silent.current = true;
      driverRef.current?.destroy();
      driverRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    let timer: number | undefined;
    (async () => {
      const force = new URLSearchParams(window.location.search).has('tour');
      if (!force && (await wasDone(user.id, tourKey))) return;
      if (cancelled) return;
      let tries = 0;
      const tick = () => {
        if (cancelled) return;
        const ready = stepsRef.current.some((s) => document.querySelector(s.element));
        const blocked = document.querySelector('[role="dialog"]:not(.driver-popover)');
        if (ready && !blocked) { start(); return; }
        if (++tries < 25) timer = window.setTimeout(tick, 400);
      };
      timer = window.setTimeout(tick, 800);
    })();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [user, tourKey, start]);

  return { start };
}