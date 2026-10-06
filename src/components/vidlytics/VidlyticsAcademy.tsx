import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Play, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type AcademyVideo = { id: string; title: string; thumbnail: string; published: string };

const PLAYLIST_ID = (import.meta.env.VITE_ACADEMY_PLAYLIST_ID as string | undefined) || '';
const CHANNEL_URL = (import.meta.env.VITE_ACADEMY_CHANNEL_URL as string | undefined) || 'https://www.youtube.com';
const SUBSCRIBE_URL = CHANNEL_URL + (CHANNEL_URL.includes('?') ? '&' : '?') + 'sub_confirmation=1';

export default function VidlyticsAcademy() {
  const [videos, setVideos] = useState<AcademyVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<AcademyVideo | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!PLAYLIST_ID) {
      setLoading(false);
      return;
    }
    supabase.functions
      .invoke('youtube-playlist', { body: { playlist_id: PLAYLIST_ID } })
      .then(({ data, error: err }) => {
        if (err || !data?.videos) {
          setError('Não foi possível carregar os vídeos.');
          return;
        }
        setVideos(data.videos as AcademyVideo[]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActive(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);

  const scrollBy = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.8), behavior: 'smooth' });
  };

  if (!PLAYLIST_ID || (!loading && videos.length === 0 && !error)) return null;

  return (
    <section className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <img src="/assets/sll-academy.png" alt="SLL Academy" className="h-8 w-auto object-contain" />
        <a
          href={CHANNEL_URL}
          target="_blank"
          rel="noreferrer"
          className="text-[11px] font-semibold text-slate-500 hover:text-[#0094eb] transition-colors"
        >
          Ver canal →
        </a>
      </div>

      {loading && <p className="text-xs text-slate-400">Carregando vídeos...</p>}
      {error && <p className="text-xs text-rose-500">{error}</p>}

      {videos.length > 0 && (
        <div className="relative">
          <button
            type="button"
            aria-label="Anterior"
            onClick={() => scrollBy(-1)}
            className="absolute -left-2 top-1/3 z-10 w-8 h-8 rounded-full bg-white border border-slate-200 shadow flex items-center justify-center text-[#0094eb] hover:bg-slate-50"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div
            ref={trackRef}
            className="flex gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {videos.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setActive(v)}
                className="snap-start shrink-0 w-56 text-left group"
              >
                <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-100">
                  <img src={v.thumbnail} alt={v.title} loading="lazy" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-white/95 shadow flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Play className="w-4 h-4 text-[#0094eb] fill-[#0094eb] ml-0.5" />
                    </div>
                  </div>
                </div>
                <p className="mt-1.5 text-xs font-semibold text-slate-800 leading-snug line-clamp-2">{v.title}</p>
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-label="Próximo"
            onClick={() => scrollBy(1)}
            className="absolute -right-2 top-1/3 z-10 w-8 h-8 rounded-full bg-white border border-slate-200 shadow flex items-center justify-center text-[#0094eb] hover:bg-slate-50"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {active && (
        <div
          className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4"
          onClick={() => setActive(null)}
          role="dialog"
          aria-modal="true"
          aria-label={active.title}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 px-4 py-3">
              <h4 className="text-sm font-bold text-slate-800 leading-snug">{active.title}</h4>
              <button
                type="button"
                aria-label="Fechar"
                onClick={() => setActive(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="aspect-video bg-black">
              <iframe
                key={active.id}
                src={`https://www.youtube-nocookie.com/embed/${active.id}?autoplay=1&rel=0`}
                title={active.title}
                className="w-full h-full"
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
              />
            </div>
            <div className="p-4">
              <a
                href={SUBSCRIBE_URL}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-[#ff0000] hover:bg-[#d90000] text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8ZM9.6 15.6V8.4l6.2 3.6-6.2 3.6Z"/></svg>
                VER MAIS VÍDEOS E ASSINAR O CANAL NO YOUTUBE
              </a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}