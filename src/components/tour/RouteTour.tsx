import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import PageTour from '@/components/tour/PageTour';
import type { TourStep } from '@/hooks/usePageTour';
import { buildRouteSteps, isRouteTourPath, routeTourKey } from '@/tours/routeTour';

export default function RouteTour() {
  const { pathname } = useLocation();
  const enabled = isRouteTourPath(pathname);
  const [steps, setSteps] = useState<TourStep[]>([]);

  useEffect(() => {
    setSteps([]);
    if (!enabled) return;
    let last = '';
    const run = () => {
      if (document.querySelector('.driver-popover')) return;
      const next = buildRouteSteps(pathname);
      const sig = JSON.stringify(next);
      if (sig !== last) { last = sig; setSteps(next); }
    };
    const t = window.setInterval(run, 700);
    run();
    return () => window.clearInterval(t);
  }, [pathname, enabled]);

  if (!enabled) return null;
  const key = routeTourKey(pathname);
  return <PageTour key={key} tourKey={key} steps={steps} />;
}