import { useEffect, useRef } from 'react';
import { SAMPLE_REVIEWS, computeStats, type PublicReview, type ReviewDesign } from '../../types/reviews';

declare global {
  interface Window { SLLReviews?: { render: (w: unknown, d: unknown) => HTMLElement | null }; }
}

let loader: Promise<void> | null = null;
function loadRenderer(): Promise<void> {
  if (window.SLLReviews) return Promise.resolve();
  if (!loader) {
    loader = new Promise<void>((res, rej) => {
      const s = document.createElement('script');
      s.src = `${import.meta.env.BASE_URL}reviews-render.js`;
      s.onload = () => res();
      s.onerror = () => { loader = null; rej(new Error('reviews-render.js não carregou')); };
      document.head.appendChild(s);
    });
  }
  return loader;
}

export default function ReviewsPreview({ template, design, reviews }: {
  template: string; design: Partial<ReviewDesign>; reviews?: PublicReview[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const key = JSON.stringify(design);
  useEffect(() => {
    let off = false;
    loadRenderer().then(() => {
      if (off || !ref.current || !window.SLLReviews) return;
      const list = reviews && reviews.length ? reviews : SAMPLE_REVIEWS;
      const host = window.SLLReviews.render({ template, design }, { reviews: list, stats: computeStats(list) });
      ref.current.replaceChildren(...(host ? [host] : []));
    }).catch(() => {});
    return () => { off = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template, key, reviews]);
  return <div ref={ref} />;
}
