import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Play, X } from 'lucide-react';
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
    el.scrollBy({ left: dir * (el.clientWidth + 12), behavior: 'smooth' });
  };

  if (!PLAYLIST_ID || (!loading && videos.length === 0 && !error)) return null;

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-shadow duration-200 hover:shadow-md">
      <div className="flex flex-col items-start gap-2">
        <img src="/assets/sll-academy.png" alt="SLL Academy" className="h-10 w-auto max-w-[200px] shrink-0 object-contain" />
        <p className="text-sm font-medium text-slate-700">
          Aulas práticas e estratégias reais para acelerar o seu e-commerce.
        </p>
      </div>

      {loading && <p className="text-sm text-slate-500">Carregando vídeos...</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}

      {videos.length > 0 && (
        <div className="relative">
          <button
            type="button"
            aria-label="Anterior"
            onClick={() => scrollBy(-1)}
            className="absolute left-2 top-[35%] z-10 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-[#0094eb] shadow hover:bg-slate-50"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div
            ref={trackRef}
            className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {videos.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setActive(v)}
                className="group w-full shrink-0 cursor-pointer snap-start text-left sm:w-[calc(50%-0.375rem)]"
              >
                <div className="relative aspect-video overflow-hidden rounded-xl bg-slate-100">
                  <img src={v.thumbnail} alt={v.title} loading="lazy" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 shadow transition-transform group-hover:scale-110">
                      <Play className="ml-0.5 h-4 w-4 fill-[#0094eb] text-[#0094eb]" />
                    </div>
                  </div>
                </div>
                <p className="mt-2 line-clamp-2 text-sm font-semibold leading-snug text-slate-700">{v.title}</p>
              </button>
            ))}
            <a
              href={SUBSCRIBE_URL}
              target="_blank"
              rel="noreferrer"
              className="group block w-full shrink-0 snap-start sm:w-[calc(50%-0.375rem)]"
            >
              <div className="flex aspect-video flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 text-center transition-colors group-hover:border-[#0094eb]/40 group-hover:bg-white">
                <img src="/assets/sll-academy.png" alt="SLL Academy" className="h-8 w-auto object-contain" />
                <p className="text-sm font-semibold leading-snug text-slate-700">Assista a todos os conteúdos</p>
              </div>
            </a>
          </div>
          <button
            type="button"
            aria-label="Próximo"
            onClick={() => scrollBy(1)}
            className="absolute right-2 top-[35%] z-10 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-[#0094eb] shadow hover:bg-slate-50"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}

      <a
        href={SUBSCRIBE_URL}
        target="_blank"
        rel="noreferrer"
        className="mt-auto inline-flex items-center gap-1.5 self-end text-xs font-bold text-[#0094eb] hover:underline"
      >
        <Play className="h-3.5 w-3.5" /> Assistir e se inscrever <ArrowRight className="h-3 w-3" />
      </a>

      {active && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
          onClick={() => setActive(null)}
          role="dialog"
          aria-modal="true"
          aria-label={active.title}
        >
          <div
            className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 px-4 py-3">
              <h4 className="text-sm font-bold leading-snug text-slate-800">{active.title}</h4>
              <button
                type="button"
                aria-label="Fechar"
                onClick={() => setActive(null)}
                className="cursor-pointer p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="aspect-video bg-black">
              <iframe
                key={active.id}
                src={`https://www.youtube-nocookie.com/embed/${active.id}?autoplay=1&rel=0`}
                title={active.title}
                className="h-full w-full"
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
              />
            </div>
            <div className="p-4">
              <a
                href={SUBSCRIBE_URL}
                target="_blank"
                rel="noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#ff0000] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#d90000]"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8ZM9.6 15.6V8.4l6.2 3.6-6.2 3.6Z"/></svg>
                VER MAIS VÍDEOS E ASSINAR O CANAL NO YOUTUBE
              </a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}