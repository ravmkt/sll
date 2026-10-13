import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Play, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type AcademyVideo = { id: string; title: string; thumbnail: string; published: string };

const VID_PLAYLIST_ID =
  (import.meta.env.VITE_VIDLYTICS_PLAYLIST_ID as string | undefined) ||
  (import.meta.env.VITE_ACADEMY_PLAYLIST_ID as string | undefined) ||
  '';
const HUB_PLAYLIST_ID = (import.meta.env.VITE_ACADEMY_HUB_PLAYLIST_ID as string | undefined) || '';
const CHANNEL_URL = (import.meta.env.VITE_ACADEMY_CHANNEL_URL as string | undefined) || 'https://www.youtube.com';
const SUBSCRIBE_URL = CHANNEL_URL + (CHANNEL_URL.includes('?') ? '&' : '?') + 'sub_confirmation=1';

function YoutubeMark({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2C2 8.8 2 12 2 12s0 3.2.4 4.8a2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8c.4-1.6.4-4.8.4-4.8s0-3.2-.4-4.8ZM10 15V9l5.2 3Z"
      />
    </svg>
  );
}

export default function VidlyticsAcademy({ variant = 'vidlytics' }: { variant?: 'hub' | 'vidlytics' }) {
  const hub = variant === 'hub';
  const PLAYLIST_ID = hub ? (HUB_PLAYLIST_ID || VID_PLAYLIST_ID) : VID_PLAYLIST_ID;
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
    el.scrollBy({ left: dir * Math.max(252, el.clientWidth * 0.8), behavior: 'smooth' });
  };

  if (!PLAYLIST_ID || (!loading && videos.length === 0 && !error)) return null;

  const arrowCls =
    'absolute top-[4.2rem] z-10 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-[#0094eb] shadow hover:bg-slate-50';

  return (
    <section data-tour="academy" className="flex w-full max-w-2xl flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-shadow duration-200 hover:shadow-md">
      <div className="flex flex-col items-start gap-2">
        <img src="/assets/sll-academy-logo-wide.png" alt="SLL Academy" className="h-auto w-[180px] shrink-0 object-contain object-left" />
        <p className="text-sm font-medium text-slate-700">
          {hub ? 'Aulas e dicas do nosso canal para impulsionar o seu e-commerce: operação, tráfego, margem e vendas.' : 'Veja como configurar o Vidlytics, tire dúvidas e aprenda dicas para vender mais com vídeos interativos.'}
        </p>
      </div>

      {loading && <p className="text-sm text-slate-500">Carregando vídeos...</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}

      {videos.length > 0 && (
        <div className="relative">
          {videos.length >= 2 && (
            <button type="button" aria-label="Anterior" onClick={() => scrollBy(-1)} className={`${arrowCls} left-2`}>
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          <div
            ref={trackRef}
            className="flex snap-x snap-mandatory items-start gap-3 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {videos.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setActive(v)}
                className="group w-60 shrink-0 cursor-pointer snap-start text-left"
              >
                <div className="relative aspect-video overflow-hidden rounded-xl bg-slate-100">
                  <img src={v.thumbnail} alt={v.title} loading="lazy" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow transition-transform group-hover:scale-110">
                      <Play className="ml-0.5 h-4 w-4 fill-[#0094eb] text-[#0094eb]" />
                    </div>
                  </div>
                </div>
                <p className="mt-2 line-clamp-2 text-xs font-semibold leading-snug text-slate-700">{v.title}</p>
              </button>
            ))}

            <div className="w-60 shrink-0 snap-start">
              <a
                href={SUBSCRIBE_URL}
                target="_blank"
                rel="noreferrer"
                className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#0094eb] to-[#0073c7] p-4 text-center text-white shadow-sm transition-transform hover:scale-[1.02]"
              >
                <YoutubeMark className="h-9 w-9" />
                <span className="text-sm font-black leading-tight">Quer ver mais?</span>
                <span className="text-[11px] font-medium leading-snug text-white/90">
                  {hub ? 'Veja mais vídeos e dicas para impulsionar o seu e-commerce no nosso canal do YouTube.' : 'Veja todos os vídeos do Vidlytics no nosso canal do YouTube.'}
                </span>
              </a>
              <p className="mt-2 text-xs font-semibold leading-snug text-slate-700">Mais vídeos no canal</p>
            </div>
          </div>
          {videos.length >= 2 && (
            <button type="button" aria-label="Próximo" onClick={() => scrollBy(1)} className={`${arrowCls} right-2`}>
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
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
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 px-4 py-3">
              <h4 className="text-sm font-bold leading-snug text-slate-800">{active.title}</h4>
              <button type="button" aria-label="Fechar" onClick={() => setActive(null)} className="cursor-pointer p-1 text-slate-400 hover:text-slate-700">
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
                <YoutubeMark className="h-4 w-4" />
                VER MAIS VÍDEOS E ASSINAR O CANAL NO YOUTUBE
              </a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}