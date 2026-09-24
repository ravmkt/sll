import React, { useState, useEffect, useRef } from 'react';
import {
  X, Monitor, Smartphone, Link, Link2Off,
  Settings2, PlaySquare, Layout, LayoutGrid, MonitorPlay,
  Save, CornerUpLeft, Star, ChevronDown, Play,
  Heart, MessageCircle, Share2, ChevronRight, Copy, Loader2
} from 'lucide-react';
import { useLoja } from '@/context/LojaContext';
import { VidlyticsDatabaseService } from '@/services/vidlytics/VidlyticsDatabaseService';

export interface AparenciaModalProps {
  isOpen: boolean;
  onClose: () => void;
  styleName: string;
  setStyleName: (v: string) => void;
  isDefault: boolean;
  setIsDefault: (v: boolean) => void;
  isUnified: boolean;
  toggleUnified: (v: boolean) => void;
  formData: any;
  getConfig: (device: 'desktop' | 'mobile', key: string) => any;
  setConfig: (device: 'desktop' | 'mobile', key: string, value: any) => void;
  resetTab: (tabId: string, device: 'desktop' | 'mobile') => void;
  saveStyle: () => Promise<any>;
  isLoadingStyle: boolean;
  isSaving: boolean;
}

const selectClass = "w-full py-2 px-3 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0094eb] focus:border-transparent dark:bg-slate-800 dark:text-white transition-shadow bg-white cursor-pointer";
const inputClass = "w-full py-2 px-3 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0094eb] focus:border-transparent dark:bg-slate-800 dark:text-white transition-shadow bg-white";

const DEMO_PREVIEW_VIDEOS = [
  '/assets/demo-videos/demo1.mp4',
  '/assets/demo-videos/demo2.mp4',
  '/assets/demo-videos/demo3.mp4',
];

type WidgetShape = 'circle' | 'square' | 'portrait' | 'landscape';

const normalizeWidgetShape = (value: unknown, fallback: WidgetShape = 'portrait'): WidgetShape => {
  const text = String(value || '').trim();
  if (text === 'circle' || text === 'square' || text === 'portrait' || text === 'landscape') return text;
  if (text === 'square_1_1') return 'square';
  if (text === 'landscape_16_9') return 'landscape';
  if (text === 'stories') return 'circle';
  if (text === 'cards' || text === 'portrait_9_16') return 'portrait';
  return fallback;
};

const safeNumber = (value: unknown, fallback: number, min?: number): number => {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return fallback;
  if (typeof min === 'number' && parsed < min) return min;
  return parsed;
};

const limitNumber = (value: unknown, fallback: number, min: number, max: number) => {
  const parsed = safeNumber(value, fallback, min);
  return Math.min(max, Math.max(min, parsed));
};

// ──────────────────── SCALE TO FIT ────────────────────
const ScaleToFit = ({ children }: { children: React.ReactNode }) => {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const calculate = () => {
      const outer = outerRef.current;
      const inner = innerRef.current;
      if (!outer || !inner) return;

      const outerRect = outer.getBoundingClientRect();
      const innerHeight = inner.scrollHeight;
      const innerWidth = inner.scrollWidth;

      if (innerHeight === 0 || innerWidth === 0) return;

      const scaleY = outerRect.height / innerHeight;
      const scaleX = outerRect.width / innerWidth;
      const nextScale = Math.min(scaleX, scaleY, 1);

      setScale(nextScale > 0 ? nextScale : 1);
    };

    calculate();
    const resizeObserver = new ResizeObserver(calculate);
    if (outerRef.current) resizeObserver.observe(outerRef.current);
    if (innerRef.current) resizeObserver.observe(innerRef.current);

    return () => resizeObserver.disconnect();
  }, [children]);

  return (
    <div ref={outerRef} className="w-full h-full flex items-center justify-center overflow-hidden">
      <div
        ref={innerRef}
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          width: '100%',
        }}
      >
        {children}
      </div>
    </div>
  );
};

// ──────────────────── PREVIEW FLUTUANTE ────────────────────
const FloatingPreview = ({ floating, colors, device }: { floating: any; colors: any; device: 'desktop' | 'mobile' }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (floating?.autoplay_videos ?? true) {
      vid.play().catch(() => {});
    } else {
      vid.pause();
    }
  }, [floating?.autoplay_videos]);

  const shape = floating?.shape || 'portrait';
  const isCircle = shape === 'circle';
  const isSquare = shape === 'square';
  const isMobile = device === 'mobile';

  const scale = isMobile ? 0.85 : 1;
  const baseWidth = (Number(floating?.width || 80)) * scale;
  const baseHeight = (isCircle || isSquare)
    ? baseWidth
    : shape === 'landscape'
      ? Math.round(baseWidth * 9 / 16)
      : Math.round(baseWidth * 16 / 9);

  const rawRadius = floating?.border_radius;
  const radiusNum = (rawRadius !== undefined && rawRadius !== null && rawRadius !== '' && !isNaN(Number(rawRadius)))
    ? Math.max(0, Number(rawRadius))
    : 12;

  const borderRadius = isCircle ? '50%' : `${radiusNum}px`;
  const rawBorderWidth = floating?.border_style;
  const parsedBorderWidth = (rawBorderWidth !== undefined && rawBorderWidth !== null && rawBorderWidth !== '' && !isNaN(Number(rawBorderWidth)))
    ? Math.max(0, Number(rawBorderWidth))
    : 0;

  const borderColor = floating?.border_color || colors?.primary || '#0094EB';
  const pos = floating?.position || 'fixed_bottom_right';
  const gapBottom = floating?.bottom_spacing !== undefined ? `${floating.bottom_spacing}px` : (isMobile ? '12px' : '20px');
  const gapTop = floating?.top_spacing !== undefined ? `${floating.top_spacing}px` : (isMobile ? '12px' : '20px');
  const gapLeft = floating?.left_spacing !== undefined ? `${floating.left_spacing}px` : (isMobile ? '12px' : '20px');
  const gapRight = floating?.right_spacing !== undefined ? `${floating.right_spacing}px` : (isMobile ? '12px' : '20px');

  const positionStyle: React.CSSProperties = { width: `${baseWidth}px`, height: `${baseHeight}px` };
  if (pos.includes('bottom')) positionStyle.bottom = gapBottom;
  if (pos.includes('top')) positionStyle.top = gapTop;
  if (pos.includes('left')) positionStyle.left = gapLeft;
  if (pos.includes('right')) positionStyle.right = gapRight;

  const resolveBool = (val: any, fallback: boolean) => {
    if (val === undefined || val === null || val === '') return fallback;
    return String(val) === 'true' || val === true || val === 1 || val === '1';
  };

  const showPlay = resolveBool(floating?.show_play_icon, true);
  const showClose = resolveBool(floating?.allow_close, false);
  const showTooltip = resolveBool(floating?.show_tooltip ?? floating?.show_cta, false);

  return (
    <div style={{ ...positionStyle, borderRadius }} className={`absolute shadow-xl transition-all duration-300 flex items-center justify-center cursor-pointer z-10 ${isCircle ? "aspect-square" : ""} overflow-visible`}>
      <div className="w-full h-full relative overflow-hidden bg-slate-950 shadow-sm transition-all duration-300" style={{ borderRadius, border: `${parsedBorderWidth}px solid ${borderColor}`, boxSizing: 'border-box' }}>
        <video ref={videoRef} src={DEMO_PREVIEW_VIDEOS[0]} loop muted playsInline autoPlay className="w-full h-full pointer-events-none" style={{ objectFit: floating?.object_fit || 'cover' }} />
        {showPlay && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/10 hover:bg-black/20 transition-all pointer-events-none">
            <div className="w-8 h-8 rounded-full bg-white/95 shadow-md flex items-center justify-center">
              <Play size={10} className="text-slate-900 fill-slate-900 ml-0.5" />
            </div>
          </div>
        )}
        {showClose && (
          <div className="absolute top-2 right-2 w-6 h-6 bg-white text-slate-500 rounded-full flex items-center justify-center z-20 shadow-md">
            <X size={14} />
          </div>
        )}
      </div>
      {showTooltip && (
        <div className="absolute z-20 shadow-md flex items-center justify-center whitespace-nowrap transition-all duration-300 pointer-events-none" style={{ backgroundColor: floating?.cta_bg_color || '#0094EB', color: floating?.cta_text_color || '#FFFFFF', padding: '8px 16px', borderRadius: '24px', fontSize: `${floating?.cta_font_size || 14}px`, fontWeight: floating?.cta_is_bold ? 'bold' : 'normal', bottom: '12px', ...(pos.includes('left') ? { left: 'calc(100% - 15px)' } : { right: 'calc(100% - 15px)' }) }}>
          {floating?.cta_text || 'VER VÍDEO'}
        </div>
      )}
    </div>
  );
};

// ──────────────────── PREVIEW CARROSSEL ────────────────────
const CarouselPreview = ({ carousel, colors, isMobile = false }: { carousel: any; colors: any; isMobile?: boolean }) => {
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(isMobile ? 320 : 850);

  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      if (entries[0]) setContainerWidth(entries[0].contentRect.width);
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const videoSources = DEMO_PREVIEW_VIDEOS;
  const len = videoSources.length;
  const REPEAT_TILES = 6;
  const baseIndex = Math.floor(REPEAT_TILES / 2) * len;
  const trackVideos = Array.from({ length: REPEAT_TILES }, () => videoSources).flat();

  const [trackIndex, setTrackIndex] = useState(baseIndex);
  const [noTransition, setNoTransition] = useState(false);
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);

  useEffect(() => {
    if (trackIndex - baseIndex >= len || trackIndex - baseIndex <= -len) {
      const t = setTimeout(() => {
        setNoTransition(true);
        setTrackIndex(baseIndex + ((trackIndex - baseIndex) % len));
        requestAnimationFrame(() => requestAnimationFrame(() => setNoTransition(false)));
      }, 500);
      return () => clearTimeout(t);
    }
  }, [trackIndex, baseIndex, len]);

  const cw = containerWidth || (isMobile ? 320 : 850);
  const isMobileView = isMobile || cw <= 480;
  const shape = normalizeWidgetShape(carousel?.shape, 'portrait');
  const isCircle = shape === 'circle';
  const spacingNum = Number(carousel?.spacing ?? carousel?.gap ?? 12) || 0;
  const visibleItemsDesktop = Math.max(1, Number(carousel?.visible_items ?? 4));
  const rawBorderWidth = carousel?.border_width ?? carousel?.border_style;
  const borderWidth = rawBorderWidth !== undefined && rawBorderWidth !== '' ? Number(rawBorderWidth) : 0;
  const borderColor = carousel?.border_color || colors?.primary || '#0094EB';
  const rawBorderRadius = carousel?.border_radius;
  const borderRadiusNum = rawBorderRadius !== undefined && rawBorderRadius !== '' ? Number(rawBorderRadius) : 12;
  const borderRadius = isCircle ? '50%' : `${borderRadiusNum}px`;
  const titleAlign = carousel?.title_align ?? (isMobileView ? 'left' : 'center');

  const baseItemWidth = isMobileView ? cw * 0.60 : Math.max(40, (cw - (spacingNum * (visibleItemsDesktop - 1))) / visibleItemsDesktop);
  const step = baseItemWidth + spacingNum;

  useEffect(() => {
    videoRefs.current.forEach((video, i) => {
      if (!video) return;
      const isVisible = isMobileView ? (i >= trackIndex - 1 && i <= trackIndex + 1) : (i >= trackIndex && i < trackIndex + visibleItemsDesktop);
      if (isVisible && (carousel?.autoplay_videos ?? true)) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, [carousel?.autoplay_videos, trackIndex, isMobileView, visibleItemsDesktop]);

  const handleDragStart = (x: number) => { setNoTransition(true); setDragStartX(x); };
  const handleDragMove = (x: number) => { if (dragStartX !== null) setDragOffset(x - dragStartX); };
  const handleDragEnd = () => {
    if (dragStartX === null) return;
    if (dragOffset > 40) setTrackIndex(prev => prev - 1);
    else if (dragOffset < -40) setTrackIndex(prev => prev + 1);
    setDragStartX(null);
    setDragOffset(0);
    setNoTransition(false);
  };

  const transformStyle = isMobileView
    ? `translateX(${(cw / 2) - ((trackIndex * step) + (baseItemWidth / 2)) + dragOffset}px)`
    : `translateX(${-trackIndex * step + dragOffset}px)`;

  return (
    <div className="w-full py-2 flex flex-col space-y-3 select-none overflow-hidden" ref={containerRef}>
      {carousel?.show_title && (
        <h4 style={{ fontSize: `${carousel?.title_font_size || 14}px`, fontWeight: carousel?.title_bold ? 'bold' : 'normal', textAlign: titleAlign as any }} className={`tracking-wider w-full px-1 ${isMobile ? 'text-slate-800 dark:text-white' : 'text-slate-800 dark:text-slate-100'}`}>
          {carousel?.title_text || 'Stories'}
        </h4>
      )}
      <div className="relative w-full cursor-grab active:cursor-grabbing" onMouseDown={e => handleDragStart(e.clientX)} onMouseMove={e => handleDragMove(e.clientX)} onMouseUp={handleDragEnd} onMouseLeave={handleDragEnd} onTouchStart={e => handleDragStart(e.touches[0].clientX)} onTouchMove={e => handleDragMove(e.touches[0].clientX)} onTouchEnd={handleDragEnd}>
        <div className="flex items-start" style={{ gap: `${spacingNum}px`, transform: transformStyle, transition: noTransition || dragStartX !== null ? 'none' : 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)' }}>
          {trackVideos.map((videoSrc, i) => (
            <div key={i} className="shrink-0 flex flex-col transition-all duration-300" style={{ width: `${baseItemWidth}px`, gap: '8px' }}>
              <div style={{ width: '100%', height: isCircle || shape === 'square' ? `${baseItemWidth}px` : shape === 'landscape' ? `${Math.round(baseItemWidth * 9 / 16)}px` : `${Math.round(baseItemWidth * 16 / 9)}px`, borderRadius, border: `${borderWidth}px solid ${borderColor}`, boxSizing: 'border-box' }} className="relative overflow-hidden bg-slate-900 flex items-center justify-center shadow-sm">
                <video ref={el => { if (el) videoRefs.current.set(i, el); else videoRefs.current.delete(i); }} src={videoSrc} loop muted playsInline autoPlay preload="metadata" style={{ objectFit: carousel?.object_fit || 'cover' }} className="w-full h-full pointer-events-none" />
                {carousel?.show_play_icon !== false && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                    <div className="w-8 h-8 rounded-full bg-white/95 shadow-md flex items-center justify-center"><Play size={10} className="text-slate-900 fill-slate-900 ml-0.5" /></div>
                  </div>
                )}
              </div>
              {carousel?.show_product && !isCircle && (
                <div className="w-full flex items-center gap-2 transition-all duration-300 overflow-hidden box-border pointer-events-none" style={{ backgroundColor: carousel?.product_card_bg || '#FFFFFF', border: `${Number(carousel?.product_card_border_width ?? 1)}px solid ${carousel?.product_card_border_color || '#E2E8F0'}`, borderRadius: `${Number(carousel?.product_card_border_radius ?? 12)}px`, padding: '8px' }}>
                  <div className="w-8 h-8 rounded bg-slate-100 shrink-0 overflow-hidden border border-slate-100"><img src="https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=80&q=80" alt="Produto" className="w-full h-full object-cover" /></div>
                  <div className="flex-1 min-w-0 text-left">
                    <p style={{ fontSize: `${Number(carousel?.product_card_name_size ?? 9)}px`, color: carousel?.product_card_name_color || '#0F172A' }} className="font-bold truncate">Calça Confort</p>
                    <p style={{ fontSize: `${Number(carousel?.product_card_price_size ?? 8)}px`, color: carousel?.product_card_price_color || colors?.primary || '#0094EB' }} className="font-black">R$ 149,95</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const DynamicCarouselPreview = ({ carousel, colors, isMobile = false }: { carousel: any; colors: any; isMobile?: boolean }) => {
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(isMobile ? 320 : 850);

  useEffect(() => {
    const obs = new ResizeObserver(entries => { if (entries[0]) setContainerWidth(entries[0].contentRect.width); });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const videoSources = DEMO_PREVIEW_VIDEOS;
  const len = videoSources.length;
  const REPEAT_TILES = 6;
  const baseIndex = Math.floor(REPEAT_TILES / 2) * len;
  const trackVideos = Array.from({ length: REPEAT_TILES }, () => videoSources).flat();

  const [trackIndex, setTrackIndex] = useState(baseIndex);
  const [noTransition, setNoTransition] = useState(false);
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);

  useEffect(() => {
    const delay = Number(carousel?.autoplay_delay) || 5000;
    if (delay <= 0 || dragStartX !== null) return;
    const interval = setInterval(() => setTrackIndex(prev => prev + 1), delay);
    return () => clearInterval(interval);
  }, [carousel?.autoplay_delay, dragStartX]);

  useEffect(() => {
    if (trackIndex - baseIndex >= len || trackIndex - baseIndex <= -len) {
      const t = setTimeout(() => {
        setNoTransition(true);
        setTrackIndex(baseIndex + ((trackIndex - baseIndex) % len));
        requestAnimationFrame(() => requestAnimationFrame(() => setNoTransition(false)));
      }, 600);
      return () => clearTimeout(t);
    }
  }, [trackIndex, baseIndex, len]);

  const shape = normalizeWidgetShape(carousel?.shape, 'portrait');
  const isCircle = shape === 'circle';
  const spacingNum = Number(carousel?.spacing ?? 8) || 0;
  const visibleItems = Math.max(1, Number(carousel?.visible_items ?? 4));
  const cw = containerWidth || (isMobile ? 320 : 850);
  const baseItemWidth = isMobile ? cw * 0.6 : Math.max(80, (cw - (spacingNum * (visibleItems - 1))) / visibleItems);
  const step = baseItemWidth + spacingNum;
  const borderWidth = Number(carousel?.border_width ?? carousel?.border_style ?? 2);
  const borderColor = carousel?.border_color || colors?.primary || '#0094EB';
  const borderRadius = isCircle ? '50%' : `${Number(carousel?.border_radius ?? 12)}px`;

  return (
    <div className="w-full overflow-hidden select-none box-border" ref={containerRef}>
      {carousel?.show_title && (
        <div className="w-full px-4 mb-2 text-center">
          <h4 style={{ fontSize: `${Number(carousel?.title_font_size ?? 14)}px`, fontWeight: carousel?.title_bold ? 'bold' : 'normal' }} className={isMobile ? 'text-slate-800 dark:text-white' : 'text-slate-800 dark:text-slate-100 uppercase tracking-wider'}>
            {carousel?.title_text ?? 'Destaques'}
          </h4>
        </div>
      )}
      <div className="relative w-full py-4 cursor-grab active:cursor-grabbing touch-pan-y" onMouseDown={e => { setNoTransition(true); setDragStartX(e.clientX); }} onMouseMove={e => { if (dragStartX !== null) setDragOffset(e.clientX - dragStartX); }} onMouseUp={() => { if (dragStartX !== null) { if (dragOffset > 50) setTrackIndex(p => p - 1); else if (dragOffset < -50) setTrackIndex(p => p + 1); setDragStartX(null); setDragOffset(0); setNoTransition(false); } }}>
        <div className="flex items-center" style={{ gap: `${spacingNum}px`, transform: `translateX(calc(50% - ${trackIndex * step + baseItemWidth / 2}px + ${dragOffset}px))`, transition: noTransition || dragStartX !== null ? 'none' : 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)' }}>
          {trackVideos.map((videoSrc, i) => {
            const isAct = i === trackIndex;
            return (
              <div key={i} className="shrink-0 flex flex-col items-center transition-all duration-500" style={{ width: `${baseItemWidth}px`, transform: `scale(${isAct ? 1.05 : 0.95})`, zIndex: isAct ? 10 : 1, gap: '12px' }}>
                <div style={{ width: '100%', height: isCircle ? `${baseItemWidth}px` : shape === 'landscape' ? `${Math.round(baseItemWidth * 9 / 16)}px` : `${Math.round(baseItemWidth * 16 / 9)}px`, borderRadius, border: isAct ? `${borderWidth}px solid ${borderColor}` : `${borderWidth}px solid transparent`, boxSizing: 'border-box' }} className="relative overflow-hidden bg-slate-900 transition-all duration-500 box-border pointer-events-none">
                  <video ref={el => { if (el) videoRefs.current.set(i, el); }} src={videoSrc} loop muted playsInline autoPlay preload="metadata" style={{ objectFit: carousel?.object_fit || 'cover' }} className="w-full h-full" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const GridPreview = ({ grid, colors, isMobile = false }: { grid: any; colors: any; isMobile?: boolean }) => {
  const shape = normalizeWidgetShape(grid?.shape, 'portrait');
  const isCircle = shape === 'circle';
  const cols = limitNumber(grid?.visible_items, 4, 1, 10);
  const items = Array.from({ length: isMobile ? 4 : cols * 2 });
  const borderRadius = isCircle ? '50%' : `${Number(grid?.border_radius ?? 12)}px`;

  return (
    <div className="w-full py-3 space-y-3 box-border">
      <div className="grid w-full" style={{ gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : `repeat(${cols}, minmax(0, 1fr))`, gap: `${Number(grid?.spacing || 12)}px` }}>
        {items.map((_, i) => (
          <div key={i} className="relative overflow-hidden bg-slate-950 shadow-sm flex items-center justify-center shrink-0" style={{ width: '100%', aspectRatio: isCircle ? '1 / 1' : shape === 'landscape' ? '16 / 9' : '9 / 16', borderRadius, border: `${Number(grid?.border_width ?? 2)}px solid ${grid?.border_color || colors?.primary || '#0094EB'}` }}>
            <video src={DEMO_PREVIEW_VIDEOS[i % DEMO_PREVIEW_VIDEOS.length]} loop muted playsInline autoPlay preload="metadata" className="w-full h-full object-cover pointer-events-none" />
          </div>
        ))}
      </div>
    </div>
  );
};

const ModalPlayerPreview = ({ playerConfig, primaryColor, isMobile = false }: { playerConfig: any; primaryColor: string; isMobile?: boolean }) => {
  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0f111a] border border-slate-800/80 rounded-2xl flex items-center justify-center p-4">
      <div className="relative h-full max-h-[410px] w-full max-w-[230px] overflow-hidden shadow-2xl shrink-0 bg-slate-900 flex flex-col justify-between" style={{ borderColor: playerConfig?.border_color || primaryColor, borderWidth: `${Number(playerConfig?.border_width ?? 2)}px`, borderRadius: `${Number(playerConfig?.border_radius ?? 16)}px` }}>
        <video src={DEMO_PREVIEW_VIDEOS[0]} autoPlay loop muted playsInline className="absolute inset-0 h-full w-full object-cover pointer-events-none" />
        <div className="relative z-20 flex items-center justify-between p-3 text-white">
          <span className="text-xs font-bold">Player Vidlytics</span>
          <X size={14} className="cursor-pointer" />
        </div>
      </div>
    </div>
  );
};

const FormField = ({ label, children }: any) => (
  <div className="flex flex-col gap-1.5">
    {label && <label className="text-xs font-bold text-slate-700 dark:text-slate-300">{label}</label>}
    {children}
  </div>
);

const ColorInput = ({ value, onChange }: any) => (
  <div className="flex items-center gap-2">
    <div className="relative w-10 h-10 shrink-0 cursor-pointer">
      <input type="color" value={value || '#0094eb'} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
      <div className="w-full h-full rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm pointer-events-none" style={{ backgroundColor: value || '#0094eb' }} />
    </div>
    <input type="text" value={value || ''} onChange={(e) => onChange(e.target.value)} className={`${inputClass} uppercase`} placeholder="#000000" />
  </div>
);

const CheckboxField = ({ label, checked, onChange, disabled = false }: any) => (
  <label className={`flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-700 rounded-xl mb-2 transition-colors ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
    <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-[#0094eb] focus:ring-[#0094eb] cursor-pointer" />
    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
  </label>
);

const Accordion = ({ title, isOpen, onClick, children }: any) => (
  <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800 mb-3 shadow-sm">
    <button onClick={onClick} type="button" className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer">
      <span className="font-bold text-sm text-slate-800 dark:text-white">{title}</span>
      <ChevronDown size={18} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
    </button>
    {isOpen && <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800/50">{children}</div>}
  </div>
);

// ──────────────────── COMPONENTE PRINCIPAL ────────────────────
export const AparenciaModal: React.FC<AparenciaModalProps> = ({
  isOpen, onClose,
  styleName, setStyleName,
  isDefault, setIsDefault,
  isUnified, toggleUnified,
  formData,
  getConfig, setConfig,
  resetTab, saveStyle,
  isLoadingStyle, isSaving,
}) => {
  const { storeId: activeStoreId, store } = useLoja();
  const [activeTab, setActiveTab] = useState('basico');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('mobile');
  const [openAccordion, setOpenAccordion] = useState<string>('1. Layout & Dimensões');
  const [localSaving, setLocalSaving] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [modalInputName, setModalInputName] = useState('');
  const [availableStyles, setAvailableStyles] = useState<any[]>([]);

  const isDefaultSystemStyle = (styleName || '').trim().toUpperCase() === 'PADRAO' || formData?.id === 'default' || (formData?.is_default && (styleName || '').trim().toUpperCase() === 'PADRAO');

  const resolvedStoreId = formData?.store_id || activeStoreId || store?.id || localStorage.getItem('sll_store_id') || localStorage.getItem('store_id');

  const loadStylesList = async () => {
    try {
      if (!resolvedStoreId) return;
      const data = await VidlyticsDatabaseService.getAppearances(resolvedStoreId);
      setAvailableStyles(data || []);
    } catch (e) {
      console.warn('Erro ao carregar lista de estilos:', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setActiveTab('basico');
      setPreviewDevice('mobile');
      setOpenAccordion('1. Layout & Dimensões');
      loadStylesList();
      if (!getConfig('desktop', 'carousel_shape') && !getConfig('mobile', 'carousel_shape')) {
        setConfig('desktop', 'carousel_shape', 'portrait');
        setConfig('mobile', 'carousel_shape', 'portrait');
      }
    }
  }, [isOpen, resolvedStoreId]);

  const getC = (key: string) => getConfig(previewDevice, key);
  const setC = (key: string, value: any) => setConfig(previewDevice, key, value);

  const currentFloatingShape = normalizeWidgetShape(getC('floating_format') || 'portrait');
  const currentFloatingWidth = Number(getC('floating_width') || (previewDevice === 'mobile' ? 64 : 80));
  const currentFloatingHeight = (currentFloatingShape === 'circle' || currentFloatingShape === 'square')
    ? currentFloatingWidth
    : currentFloatingShape === 'landscape'
      ? Math.round((currentFloatingWidth * 9) / 16)
      : Math.round((currentFloatingWidth * 16) / 9);

  const floatingPreviewData = {
    shape: currentFloatingShape,
    object_fit: getC('floating_object_fit') || 'cover',
    width: currentFloatingWidth,
    height: currentFloatingHeight,
    position: getC('floating_position') || 'fixed_bottom_right',
    bottom_spacing: getC('floating_margin_bottom') ?? 16,
    top_spacing: getC('floating_margin_top') ?? 16,
    left_spacing: getC('floating_margin_side') ?? 16,
    right_spacing: getC('floating_margin_side') ?? 16,
    border_color: getC('floating_border_color') || formData?.primary_color || '#0094EB',
    border_style: getC('floating_border_width') ?? 2,
    border_radius: getC('floating_border_radius') ?? 12,
    show_cta: getC('floating_show_cta') ?? false,
    cta_text: getC('floating_cta_text') || 'VER VÍDEO',
    cta_font_size: getC('floating_cta_font_size') ?? 12,
    cta_is_bold: getC('floating_cta_is_bold') ?? true,
    cta_bg_color: getC('floating_cta_bg_color') || '#0094EB',
    cta_text_color: getC('floating_cta_text_color') || '#FFFFFF',
    autoplay_videos: getC('floating_auto_play') ?? true,
    show_play_icon: getC('floating_show_play_icon') ?? true,
    allow_close: getC('floating_show_close_button') ?? false,
  };

  const carouselPreviewData = {
    shape: normalizeWidgetShape(getC('carousel_shape') || 'portrait', 'portrait'),
    object_fit: getC('carousel_object_fit') || 'cover',
    width: getC('carousel_width') || (previewDevice === 'mobile' ? 64 : 80),
    visible_items: getC('carousel_visible_items') ?? (previewDevice === 'mobile' ? 2 : 4),
    spacing: getC('carousel_spacing') ?? (previewDevice === 'mobile' ? 12 : 16),
    border_color: getC('carousel_border_color') || '#0094EB',
    border_style: getC('carousel_border_width') ?? 2,
    border_radius: getC('carousel_border_radius') ?? 12,
    show_title: getC('carousel_show_title') ?? false,
    title_text: getC('carousel_title_text') || 'Stories',
    autoplay_videos: getC('carousel_autoplay_videos') ?? true,
    show_play_icon: getC('carousel_show_play_icon') !== false,
    show_product: getC('carousel_show_product') ?? true,
  };

  const dynCarouselPreviewData = { ...carouselPreviewData, shape: normalizeWidgetShape(getC('dyn_carousel_shape') || 'portrait', 'portrait') };
  const gridPreviewData = { ...carouselPreviewData, shape: normalizeWidgetShape(getC('grid_shape') || 'portrait', 'portrait') };
  const playerPreviewData = { border_color: getC('modal_border_color') || '#0094EB', border_width: getC('modal_border_width') ?? 2, border_radius: getC('modal_border_radius') ?? 16 };

  // ──────────────────── GRAVAÇÃO ATRAVÉS DO SERVIÇO VIDLYTICS ────────────────────
  const executeSave = async (finalName: string) => {
    setLocalSaving(true);
    try {
      if (!resolvedStoreId) {
        throw new Error('Nenhuma loja ativa identificada. Por favor, acesse o Dashboard e selecione uma loja.');
      }

      setStyleName(finalName);

      // Salva diretamente na tabela vidlytics.vid_appearances
      await VidlyticsDatabaseService.saveAppearance({
        id: isDefaultSystemStyle ? undefined : formData?.id,
        store_id: resolvedStoreId,
        name: finalName,
        is_default: isDefault,
        widget_style: {
          name: finalName,
          is_default: isDefault,
          is_unified: isUnified,
          desktop: formData?.desktop || {},
          mobile: formData?.mobile || {},
          floating: floatingPreviewData,
          carousel: carouselPreviewData,
          dynamic_carousel: dynCarouselPreviewData,
          grid: gridPreviewData,
          player: playerPreviewData,
        },
      });

      // Emite evento global para que Vidlytics.tsx atualize a tabela visual
      window.dispatchEvent(new CustomEvent('vidlytics:appearance_saved'));

      setShowNameModal(false);
      onClose();
    } catch (error: any) {
      console.error('Erro ao salvar no Vidlytics:', error);
      alert(error?.message || 'Erro ao persistir alterações no banco de dados.');
    } finally {
      setLocalSaving(false);
    }
  };

  const handleInitiateSave = () => {
    if (isDefaultSystemStyle || !styleName?.trim() || styleName.trim().toUpperCase() === 'PADRAO') {
      setModalInputName('');
      setShowNameModal(true);
      return;
    }
    executeSave(styleName.trim());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 w-[95vw] max-w-[1500px] h-[95vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative">

        {/* POPUP SOBREPOSTO PARA NOMEAR ESTILO */}
        {showNameModal && (
          <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                <h4 className="text-base font-extrabold text-slate-800 dark:text-white">Salvar Novo Estilo</h4>
                <button type="button" onClick={() => setShowNameModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                  <X size={18} />
                </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                O modelo "PADRAO" é o nativo da plataforma. Digite um nome para salvar sua versão customizada:
              </p>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Nome do Estilo</label>
                <input
                  type="text"
                  autoFocus
                  value={modalInputName}
                  onChange={(e) => setModalInputName(e.target.value)}
                  placeholder="Ex: Estilo Black Friday"
                  className={inputClass}
                />
              </div>
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button type="button" onClick={() => setShowNameModal(false)} className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer">
                  Cancelar
                </button>
                <button type="button" disabled={!modalInputName.trim() || localSaving} onClick={() => executeSave(modalInputName.trim())} className="flex items-center gap-1.5 px-5 py-2 bg-[#0094eb] hover:bg-[#0082cf] text-white rounded-xl text-xs font-bold shadow-md disabled:opacity-50 cursor-pointer">
                  {localSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Salvar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* HEADER MODAL */}
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="text-xl font-extrabold text-slate-800 dark:text-white">Editar Estilo</h2>
          <button onClick={onClose} type="button" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer">
            <X size={24} />
          </button>
        </div>

        {/* TABS SUPERIORES */}
        <div className="px-6 pb-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar">
            {[
              { id: 'basico', label: 'Básico', icon: Settings2 },
              { id: 'flutuante', label: 'Flutuante', icon: PlaySquare },
              { id: 'carrossel', label: 'Carrossel', icon: Layout },
              { id: 'carrossel-dinamico', label: 'Carrossel Dinâmico', icon: Layout },
              { id: 'grade', label: 'Grade', icon: LayoutGrid },
              { id: 'player', label: 'Player', icon: MonitorPlay },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button key={tab.id} type="button" onClick={() => { setActiveTab(tab.id); if (tab.id !== 'basico') setPreviewDevice('mobile'); }} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors whitespace-nowrap cursor-pointer ${isActive ? 'bg-[#0094eb] text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}`}>
                  <Icon size={16} /> {tab.label}
                </button>
              );
            })}
          </div>

          {activeTab !== 'basico' && (
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0 border border-slate-200 dark:border-slate-700">
              <button type="button" onClick={() => setPreviewDevice('desktop')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold transition-all cursor-pointer ${previewDevice === 'desktop' ? 'bg-white dark:bg-slate-700 text-[#0094eb] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><Monitor size={16} /> Desktop</button>
              <button type="button" onClick={() => setPreviewDevice('mobile')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold transition-all cursor-pointer ${previewDevice === 'mobile' ? 'bg-white dark:bg-slate-700 text-[#0094eb] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><Smartphone size={16} /> Mobile</button>
            </div>
          )}
        </div>

        {/* ÁREA CENTRAL */}
        <div className="flex-1 flex overflow-hidden bg-slate-50 dark:bg-slate-900/50">

          {/* ESQUERDA - CONTROLES */}
          <div className="w-[450px] border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-y-auto p-6 flex flex-col gap-4 shrink-0 custom-scrollbar">
            {isLoadingStyle ? (
              <div className="flex items-center justify-center h-full text-slate-400 font-bold">Carregando...</div>
            ) : activeTab === 'basico' ? (
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Configurações Básicas</h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Selecionar Estilo Ativo</label>
                    <select value={formData?.id || (isDefaultSystemStyle ? 'PADRAO' : '')} onChange={(e) => {
                      const sel = e.target.value;
                      if (sel === 'PADRAO') { setStyleName('PADRAO'); setIsDefault(true); }
                      else {
                        const s = availableStyles.find(item => item.id === sel);
                        if (s) { setStyleName(s.name || 'Estilo'); setIsDefault(s.is_default || false); }
                      }
                    }} className={selectClass}>
                      <option value="PADRAO">PADRAO (Oficial da Loja)</option>
                      {availableStyles.map(s => (
                        <option key={s.id} value={s.id}>{s.name || 'Estilo sem nome'} {s.is_default ? '★' : ''}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Nome do Estilo Atual</label>
                      {isDefaultSystemStyle && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                          Padrão Oficial Protegido
                        </span>
                      )}
                    </div>
                    <input type="text" value={styleName} onChange={(e) => setStyleName(e.target.value)} disabled={isDefaultSystemStyle} placeholder="Ex: Minha Loja" className={`${inputClass} ${isDefaultSystemStyle ? 'bg-slate-100 text-slate-500 cursor-not-allowed border-dashed' : ''}`} />
                  </div>

                  <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <label className={`flex items-start gap-3 ${isDefaultSystemStyle ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}>
                      <div className="mt-1"><input type="checkbox" checked={isDefault} disabled={isDefaultSystemStyle} onChange={(e) => setIsDefault(e.target.checked)} className="w-5 h-5 rounded border-slate-300 text-[#0094eb] focus:ring-[#0094eb] cursor-pointer" /></div>
                      <div>
                        <p className="font-bold text-slate-800 dark:text-white">Definir como padrão</p>
                        <p className="text-xs text-slate-500 mt-1">Vídeos sem estilo definido usarão este modelo automaticamente.</p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-extrabold text-slate-800 dark:text-white mb-2 capitalize">Configurações do {activeTab.replace('-', ' ')}</h3>
                {activeTab === 'flutuante' && (
                  <Accordion title="1. Formato & Dimensões" isOpen={openAccordion === '1. Formato & Dimensões'} onClick={() => setOpenAccordion(openAccordion === '1. Formato & Dimensões' ? '' : '1. Formato & Dimensões')}>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField label="Formato">
                        <select value={getC('floating_format') || 'portrait'} onChange={e => setC('floating_format', e.target.value)} className={selectClass}>
                          <option value="portrait">Retrato 9:16</option>
                          <option value="square">Quadrado 1:1</option>
                          <option value="landscape">Paisagem 16:9</option>
                          <option value="circle">Circular</option>
                        </select>
                      </FormField>
                      <FormField label="Largura (px)"><input type="number" min="40" max="200" value={getC('floating_width') || (previewDevice === 'mobile' ? 64 : 80)} onChange={e => setC('floating_width', parseInt(e.target.value) || 0)} className={inputClass} /></FormField>
                    </div>
                  </Accordion>
                )}
                {activeTab === 'carrossel' && (
                  <Accordion title="1. Layout & Dimensões" isOpen={openAccordion === '1. Layout & Dimensões'} onClick={() => setOpenAccordion(openAccordion === '1. Layout & Dimensões' ? '' : '1. Layout & Dimensões')}>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField label="Formato">
                        <select value={carouselPreviewData.shape} onChange={e => setC('carousel_shape', e.target.value)} className={selectClass}>
                          <option value="portrait">Retrato 9:16 (Padrão)</option>
                          <option value="circle">Circular (Stories)</option>
                          <option value="square">Quadrado 1:1</option>
                          <option value="landscape">Paisagem 16:9</option>
                        </select>
                      </FormField>
                      <FormField label="Itens Visíveis"><input type="number" min="1" max="10" value={getC('carousel_visible_items') ?? (previewDevice === 'mobile' ? 2 : 4)} onChange={e => setC('carousel_visible_items', parseInt(e.target.value) || 1)} className={inputClass} /></FormField>
                    </div>
                  </Accordion>
                )}
                {activeTab === 'carrossel-dinamico' && (
                  <Accordion title="1. Layout & Dimensões" isOpen={openAccordion === '1. Layout & Dimensões'} onClick={() => setOpenAccordion(openAccordion === '1. Layout & Dimensões' ? '' : '1. Layout & Dimensões')}>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField label="Formato">
                        <select value={dynCarouselPreviewData.shape} onChange={e => setC('dyn_carousel_shape', e.target.value)} className={selectClass}>
                          <option value="portrait">Retrato 9:16 (Padrão)</option>
                          <option value="square">Quadrado 1:1</option>
                          <option value="landscape">Paisagem 16:9</option>
                          <option value="circle">Circular</option>
                        </select>
                      </FormField>
                      <FormField label="Largura (px)"><input type="number" min="20" value={getC('dyn_carousel_width') || (previewDevice === 'mobile' ? 64 : 80)} onChange={e => setC('dyn_carousel_width', parseInt(e.target.value) || 0)} className={inputClass} /></FormField>
                    </div>
                  </Accordion>
                )}
                {activeTab === 'grade' && (
                  <Accordion title="1. Layout & Dimensões" isOpen={openAccordion === '1. Layout & Dimensões'} onClick={() => setOpenAccordion(openAccordion === '1. Layout & Dimensões' ? '' : '1. Layout & Dimensões')}>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField label="Formato">
                        <select value={gridPreviewData.shape} onChange={e => setC('grid_shape', e.target.value)} className={selectClass}>
                          <option value="portrait">Retrato 9:16 (Padrão)</option>
                          <option value="square">Quadrado 1:1</option>
                          <option value="landscape">Paisagem 16:9</option>
                          <option value="circle">Circular</option>
                        </select>
                      </FormField>
                      <FormField label="Colunas"><input type="number" min="1" max="10" value={getC('grid_visible_items') ?? (previewDevice === 'mobile' ? 2 : 4)} onChange={e => setC('grid_visible_items', parseInt(e.target.value) || 1)} className={inputClass} /></FormField>
                    </div>
                  </Accordion>
                )}
                {activeTab === 'player' && (
                  <Accordion title="1. Bordas" isOpen={openAccordion === '1. Bordas'} onClick={() => setOpenAccordion(openAccordion === '1. Bordas' ? '' : '1. Bordas')}>
                    <div className="space-y-3">
                      <FormField label="Cor da Borda"><ColorInput value={getC('modal_border_color') || '#0094EB'} onChange={(v: string) => setC('modal_border_color', v)} /></FormField>
                      <FormField label="Largura Borda (px)"><input type="number" min="0" max="10" value={getC('modal_border_width') ?? 2} onChange={e => setC('modal_border_width', parseInt(e.target.value) || 0)} className={inputClass} /></FormField>
                    </div>
                  </Accordion>
                )}
              </>
            )}
          </div>

          {/* DIREITA - ÁREA DE PREVIEW */}
          <div className="flex-1 flex items-center justify-center p-8 relative overflow-hidden h-full">
            <div className="w-full h-full flex items-center justify-center">
              {previewDevice === 'desktop' ? (
                <div className="w-full max-w-5xl aspect-video bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
                  <div className="h-10 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex items-center px-4 gap-2 shrink-0">
                    <div className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-600"></div><div className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-600"></div><div className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-600"></div>
                  </div>
                  <div className="flex-1 relative bg-slate-50 dark:bg-slate-900 flex items-center justify-center overflow-hidden p-6">
                    {activeTab === 'flutuante' && <FloatingPreview floating={floatingPreviewData} colors={{ primary: formData?.primary_color || '#0094EB' }} device="desktop" />}
                    {activeTab === 'carrossel' && <ScaleToFit><div className="w-[850px] max-w-full flex justify-center"><CarouselPreview carousel={carouselPreviewData} colors={{ primary: formData?.primary_color || '#0094EB' }} isMobile={false} /></div></ScaleToFit>}
                    {activeTab === 'carrossel-dinamico' && <ScaleToFit><div className="w-[850px] max-w-full flex justify-center"><DynamicCarouselPreview carousel={dynCarouselPreviewData} colors={{ primary: formData?.primary_color || '#0094EB' }} isMobile={false} /></div></ScaleToFit>}
                    {activeTab === 'grade' && <ScaleToFit><div className="w-[850px] max-w-full flex justify-center"><GridPreview grid={gridPreviewData} colors={{ primary: formData?.primary_color || '#0094EB' }} isMobile={false} /></div></ScaleToFit>}
                    {activeTab === 'player' && <ModalPlayerPreview playerConfig={playerPreviewData} primaryColor={formData?.primary_color || '#0094EB'} isMobile={false} />}
                  </div>
                </div>
              ) : (
                <div className="h-full max-h-[800px] aspect-[9/19] rounded-[2.5rem] border-[10px] border-[#1a1f36] bg-slate-50 dark:bg-slate-900 shadow-2xl relative flex items-center justify-center overflow-hidden shrink-0">
                  <div className="absolute top-0 inset-x-0 h-5 bg-[#1a1f36] w-[40%] mx-auto rounded-b-xl z-20"></div>
                  {activeTab === 'flutuante' && <FloatingPreview floating={floatingPreviewData} colors={{ primary: formData?.primary_color || '#0094EB' }} device="mobile" />}
                  {activeTab === 'carrossel' && <div className="flex-1 w-full h-full overflow-hidden flex flex-col justify-center px-0 py-3"><CarouselPreview carousel={carouselPreviewData} colors={{ primary: formData?.primary_color || '#0094EB' }} isMobile={true} /></div>}
                  {activeTab === 'carrossel-dinamico' && <div className="flex-1 w-full h-full overflow-hidden flex flex-col justify-center px-0 py-3"><DynamicCarouselPreview carousel={dynCarouselPreviewData} colors={{ primary: formData?.primary_color || '#0094EB' }} isMobile={true} /></div>}
                  {activeTab === 'grade' && <div className="flex-1 w-full h-full overflow-y-auto flex flex-col justify-start px-2 py-4 custom-scrollbar"><GridPreview grid={gridPreviewData} colors={{ primary: formData?.primary_color || '#0094EB' }} isMobile={true} /></div>}
                  {activeTab === 'player' && <ModalPlayerPreview playerConfig={playerPreviewData} primaryColor={formData?.primary_color || '#0094EB'} isMobile={true} />}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0">
          <button onClick={() => resetTab(activeTab, previewDevice)} type="button" className="bg-red-50 text-red-500 font-extrabold px-5 py-2.5 rounded-xl text-sm tracking-wide border border-transparent outline-none cursor-pointer hover:bg-red-100 transition-colors">
            RESETAR
          </button>
          <div className="hidden lg:flex items-center gap-2 text-slate-500 bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-full text-sm border border-slate-100 dark:border-slate-700 shadow-sm">
            <CornerUpLeft size={16} className="text-[#0094eb]" />
            <span>Este painel é um <strong>preview meramente visual</strong>. Para testar cliques e interações, use o simulador na edição dos stories.</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} type="button" className="flex items-center gap-2 px-5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer">
              <X size={18} strokeWidth={2.5} /> Cancelar
            </button>
            <button 
              onClick={handleInitiateSave} 
              type="button"
              disabled={isSaving || localSaving} 
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all cursor-pointer ${
                isDefaultSystemStyle 
                  ? 'bg-amber-500 hover:bg-amber-600 text-white' 
                  : 'bg-[#0094eb] hover:bg-[#0082cf] text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isSaving || localSaving ? <Loader2 size={18} className="animate-spin" /> : isDefaultSystemStyle ? <Copy size={18} strokeWidth={2.5} /> : <Save size={18} strokeWidth={2.5} />} 
              {isSaving || localSaving ? 'Salvando...' : isDefaultSystemStyle ? 'Salvar Como Novo Estilo' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AparenciaModal;