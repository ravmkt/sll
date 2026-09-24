import React, { useState, useEffect, useRef } from 'react';
import {
  X, Monitor, Smartphone, Link, Link2Off,
  Settings2, PlaySquare, Layout, LayoutGrid, MonitorPlay,
  Save, CornerUpLeft, Star, ChevronDown, Play,
  Heart, MessageCircle, Share2, ChevronRight, Copy, Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface AparenciaModalProps {
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
const FloatingPreview = ({
  floating,
  colors,
  device,
}: {
  floating: any;
  colors: any;
  device: 'desktop' | 'mobile';
}) => {
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

  const positionStyle: React.CSSProperties = {
    width: `${baseWidth}px`,
    height: `${baseHeight}px`,
  };

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
  const showTooltip = resolveBool(floating?.show_tooltip ?? floating?.show_cta ?? floating?.cta_active ?? floating?.cta_enabled, false);

  const ctaText = floating?.cta_text ?? 'VER VÍDEO';
  const ctaBgColor = floating?.cta_bg_color ?? colors?.primary ?? '#0094EB';
  const ctaTextColor = floating?.cta_text_color ?? '#FFFFFF';
  const ctaFontSize = floating?.cta_font_size ?? 14;
  const ctaBold = resolveBool(floating?.cta_is_bold ?? true, true);

  return (
    <div
      style={{ ...positionStyle, borderRadius }}
      className={`absolute shadow-xl transition-all duration-300 flex items-center justify-center cursor-pointer z-10 ${
        isCircle ? "aspect-square" : ""
      } overflow-visible`}
    >
      <div 
        className="w-full h-full relative overflow-hidden bg-slate-950 shadow-sm transition-all duration-300"
        style={{ 
          borderRadius: borderRadius,
          border: `${parsedBorderWidth}px solid ${borderColor}`,
          boxSizing: 'border-box'
        }}
      >
        <video
          ref={videoRef}
          src={DEMO_PREVIEW_VIDEOS[0]}
          loop
          muted
          playsInline
          autoPlay
          className="w-full h-full pointer-events-none"
          style={{ objectFit: floating?.object_fit || 'cover' }}
        />
        {showPlay && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/10 hover:bg-black/20 transition-all pointer-events-none">
            <div className="w-8 h-8 rounded-full bg-white/95 shadow-md flex items-center justify-center">
              <Play size={10} className="text-slate-900 fill-slate-900 ml-0.5" />
            </div>
          </div>
        )}

        {showClose && (
          <div className="absolute top-2 right-2 w-6 h-6 bg-white text-slate-500 rounded-full flex items-center justify-center z-20 shadow-md transition-opacity">
            <X size={14} />
          </div>
        )}
      </div>

      {showTooltip && (
        <div 
          className="absolute z-20 shadow-md flex items-center justify-center whitespace-nowrap transition-all duration-300 pointer-events-none"
          style={{
            backgroundColor: ctaBgColor,
            color: ctaTextColor,
            padding: '8px 16px',
            borderRadius: '24px',
            fontSize: `${ctaFontSize}px`,
            fontWeight: ctaBold ? 'bold' : 'normal',
            bottom: '12px',
            ...(pos.includes('left') 
                ? { left: 'calc(100% - 15px)' } 
                : { right: 'calc(100% - 15px)' })
          }}
        >
          {ctaText}
        </div>
      )}
    </div>
  );
};

// ──────────────────── PREVIEW CARROSSEL ────────────────────
const CarouselPreview = ({
  carousel,
  colors,
  isMobile = false,
}: {
  carousel: any;
  colors: any;
  isMobile?: boolean;
}) => {
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
  const showTitle = carousel?.show_title ?? false;
  const spacingNum = Number(carousel?.spacing ?? carousel?.gap ?? 12) || 0;

  const visibleItemsDesktop = Math.max(1, Number(carousel?.visible_items ?? carousel?.visibleItems ?? 4));

  const rawBorderWidth = carousel?.border_width ?? carousel?.border_style;
  const borderWidth = rawBorderWidth !== undefined && rawBorderWidth !== '' ? Number(rawBorderWidth) : 0;
  const borderColor = carousel?.border_color || colors?.primary || '#0094EB';
  
  const rawBorderRadius = carousel?.border_radius ?? carousel?.borderRadius;
  const borderRadiusNum = rawBorderRadius !== undefined && rawBorderRadius !== '' ? Number(rawBorderRadius) : 12;
  const borderRadius = isCircle ? '50%' : `${borderRadiusNum}px`;

  const titleAlign = carousel?.title_align ?? carousel?.title_alignment ?? (isMobileView ? 'left' : 'center');

  const baseItemWidth = isMobileView
    ? cw * 0.60
    : Math.max(40, (cw - (spacingNum * (visibleItemsDesktop - 1))) / visibleItemsDesktop);
  const step = baseItemWidth + spacingNum;

  useEffect(() => {
    videoRefs.current.forEach((video, i) => {
      if (!video) return;
      const isVisible = isMobileView
        ? (i >= trackIndex - 1 && i <= trackIndex + 1)
        : (i >= trackIndex && i < trackIndex + visibleItemsDesktop);
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
      {showTitle && (
        <h4
          style={{ 
            fontSize: `${carousel?.title_font_size || 14}px`, 
            fontWeight: carousel?.title_bold ? 'bold' : 'normal',
            textAlign: titleAlign as any
          }}
          className={`tracking-wider w-full px-1 ${isMobile ? 'text-slate-800 dark:text-white' : 'text-slate-800 dark:text-slate-100'}`}
        >
          {carousel?.title_text || 'Stories'}
        </h4>
      )}

      <div
        className="relative w-full cursor-grab active:cursor-grabbing"
        onMouseDown={e => handleDragStart(e.clientX)}
        onMouseMove={e => handleDragMove(e.clientX)}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchStart={e => handleDragStart(e.touches[0].clientX)}
        onTouchMove={e => handleDragMove(e.touches[0].clientX)}
        onTouchEnd={handleDragEnd}
      >
        <div
          className="flex items-start"
          style={{
            gap: `${spacingNum}px`,
            transform: transformStyle,
            transition: noTransition || dragStartX !== null ? 'none' : 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)',
          }}
        >
          {trackVideos.map((videoSrc, i) => (
            <div
              key={i}
              className="shrink-0 flex flex-col transition-all duration-300"
              style={{
                width: `${baseItemWidth}px`,
                gap: '8px'
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: isCircle || shape === 'square'
                    ? `${baseItemWidth}px`
                    : shape === 'landscape'
                      ? `${Math.round(baseItemWidth * (9 / 16))}px`
                      : `${Math.round(baseItemWidth * (16 / 9))}px`,
                  borderRadius,
                  border: `${borderWidth}px solid ${borderColor}`,
                  boxSizing: 'border-box'
                }}
                className="relative overflow-hidden bg-slate-900 flex items-center justify-center shadow-sm"
              >
                <video
                  ref={el => { if (el) videoRefs.current.set(i, el); else videoRefs.current.delete(i); }}
                  src={videoSrc}
                  loop
                  muted
                  playsInline
                  autoPlay
                  preload="metadata"
                  style={{ objectFit: carousel?.object_fit || 'cover' }}
                  className="w-full h-full pointer-events-none"
                />
                {carousel?.show_play_icon !== false && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                    <div className="w-8 h-8 rounded-full bg-white/95 shadow-md flex items-center justify-center">
                      <Play size={10} className="text-slate-900 fill-slate-900 ml-0.5" />
                    </div>
                  </div>
                )}
              </div>

              {carousel?.show_product && !isCircle && (
                <div
                  className="w-full flex items-center gap-2 transition-all duration-300 overflow-hidden box-border pointer-events-none"
                  style={{
                    backgroundColor: carousel?.product_card_bg || '#FFFFFF',
                    border: `${Number(carousel?.product_card_border_width ?? 1)}px solid ${carousel?.product_card_border_color || '#E2E8F0'}`,
                    borderRadius: `${Number(carousel?.product_card_border_radius ?? 12)}px`,
                    padding: '8px',
                  }}
                >
                  <div className="w-8 h-8 rounded bg-slate-100 shrink-0 overflow-hidden border border-slate-100">
                    <img src="https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=80&q=80" alt="Produto" className="w-full h-full object-cover" />
                  </div>
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

// ──────────────────── PREVIEW CARROSSEL DINÂMICO ────────────────────
const DynamicCarouselPreview = ({
  carousel,
  colors,
  isMobile = false,
}: {
  carousel: any;
  colors: any;
  isMobile?: boolean;
}) => {
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
    const delay = Number(carousel?.autoplay_delay) || 5000;
    if (delay <= 0 || dragStartX !== null) return;
    const interval = setInterval(() => setTrackIndex((prev) => prev + 1), delay);
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

  const ml = Number(carousel?.margin_left ?? 0);
  const mr = Number(carousel?.margin_right ?? 0);
  const mt = Number(carousel?.margin_top ?? 0);
  const mb = Number(carousel?.margin_bottom ?? 0);

  const cw = containerWidth || (isMobile ? 320 : 850);
  const availableWidth = Math.max(1, cw - ml - mr);

  const baseItemWidth = isMobile 
    ? cw * 0.6 
    : Math.max(80, (availableWidth - (spacingNum * (visibleItems - 1))) / visibleItems);

  const step = baseItemWidth + spacingNum;

  const rawBorderWidth = carousel?.border_width ?? carousel?.border_style;
  const borderWidth = rawBorderWidth !== undefined && rawBorderWidth !== '' ? Number(rawBorderWidth) : 0;
  const borderColor = carousel?.border_color || colors?.primary || '#0094EB';
  const borderRadiusNum = Number(carousel?.border_radius ?? 12) || 0;
  const borderRadius = isCircle ? '50%' : `${borderRadiusNum}px`;

  const titleAlign = carousel?.title_align ?? 'center';
  const titleJustifyClass = titleAlign === 'left' ? 'text-left' : titleAlign === 'right' ? 'text-right' : 'text-center';

  useEffect(() => {
    videoRefs.current.forEach((video, i) => {
      if (!video) return;
      if (i === trackIndex || (carousel?.autoplay_videos ?? true)) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, [carousel?.autoplay_videos, trackIndex]);

  const handleDragStart = (clientX: number) => { setNoTransition(true); setDragStartX(clientX); };
  const handleDragMove = (clientX: number) => { if (dragStartX !== null) setDragOffset(clientX - dragStartX); };
  const handleDragEnd = () => {
    if (dragStartX === null) return;
    if (dragOffset > 50) setTrackIndex(prev => prev - 1);
    else if (dragOffset < -50) setTrackIndex(prev => prev + 1);
    setDragStartX(null); setDragOffset(0); setNoTransition(false);
  };

  return (
    <div 
      className="w-full overflow-hidden select-none box-border" 
      ref={containerRef}
      style={{
        paddingTop: `${mt}px`,
        paddingBottom: `${mb}px`,
        paddingLeft: `${ml}px`,
        paddingRight: `${mr}px`,
      }}
    >
      {carousel?.show_title && (
        <div className={`w-full px-4 mb-2 ${titleJustifyClass}`}>
          <h4 
            style={{ fontSize: `${Number(carousel?.title_font_size ?? 14)}px`, fontWeight: carousel?.title_bold ?? true ? 'bold' : 'normal' }} 
            className={isMobile ? 'text-slate-800 dark:text-white' : 'text-slate-800 dark:text-slate-100 uppercase tracking-wider'}
          >
            {carousel?.title_text ?? 'Destaques'}
          </h4>
        </div>
      )}

      <div 
        className="relative w-full py-4 cursor-grab active:cursor-grabbing touch-pan-y"
        onMouseDown={e => handleDragStart(e.clientX)}
        onMouseMove={e => handleDragMove(e.clientX)}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchStart={e => handleDragStart(e.touches[0].clientX)}
        onTouchMove={e => handleDragMove(e.touches[0].clientX)}
        onTouchEnd={handleDragEnd}
      >
        <div
          className="flex items-center"
          style={{
            gap: `${spacingNum}px`,
            transform: `translateX(calc(50% - ${trackIndex * step + baseItemWidth / 2}px + ${dragOffset}px))`,
            transition: noTransition || dragStartX !== null ? 'none' : 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)',
          }}
        >
          {trackVideos.map((videoSrc, i) => {
            const isAct = i === trackIndex;
            const isInactive = !isAct;

            let cardHeightStr = isCircle || shape === 'square' 
              ? `${baseItemWidth}px` 
              : shape === 'landscape' 
                ? `${Math.round(baseItemWidth * (9 / 16))}px` 
                : `${Math.round(baseItemWidth * (16 / 9))}px`;

            let scaleVal = 1;
            if (carousel?.highlight_enlarge_active) {
              scaleVal = isAct ? 1.05 : 0.95;
            } else if (!isAct) {
              scaleVal = 0.95;
            }

            return (
              <div
                key={i}
                className="shrink-0 flex flex-col items-center transition-all duration-500"
                style={{ width: `${baseItemWidth}px`, transform: `scale(${scaleVal})`, zIndex: isAct ? 10 : 1, gap: '12px' }}
              >
                <div
                  style={{
                    width: '100%',
                    height: cardHeightStr,
                    borderRadius,
                    border: isInactive ? `${borderWidth}px solid transparent` : `${borderWidth}px solid ${borderColor}`,
                    boxShadow: isAct && carousel?.highlight_shadow ? '0 12px 28px -5px rgba(0,0,0,0.45)' : 'none',
                    opacity: isInactive && carousel?.highlight_desaturate_inactive ? 0.7 : 1,
                    filter: isInactive && carousel?.highlight_desaturate_inactive ? 'grayscale(80%)' : 'none',
                    boxSizing: 'border-box'
                  }}
                  className="relative overflow-hidden bg-slate-900 transition-all duration-500 box-border pointer-events-none"
                >
                  <video
                    ref={el => { if (el) videoRefs.current.set(i, el); else videoRefs.current.delete(i); }}
                    src={videoSrc}
                    loop
                    muted
                    playsInline
                    autoPlay
                    preload="metadata"
                    style={{ objectFit: carousel?.object_fit || 'cover' }}
                    className="w-full h-full"
                  />
                  {isInactive && <div className="absolute inset-0 bg-black/60 z-10" />}
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40" />
                  
                  {isAct && carousel?.show_play_icon !== false && (
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                      <div className="w-10 h-10 rounded-full bg-white/95 shadow-md flex items-center justify-center">
                        <Play size={14} className="text-slate-900 fill-slate-900 ml-1" />
                      </div>
                    </div>
                  )}
                </div>

                {carousel?.show_product && !isCircle && (
                  <div
                    className="w-full flex items-center gap-2 transition-all duration-300 overflow-hidden box-border pointer-events-none"
                    style={{
                      backgroundColor: carousel?.product_card_bg || '#FFFFFF',
                      border: `${Number(carousel?.product_card_border_width ?? 1)}px solid ${carousel?.product_card_border_color || '#E2E8F0'}`,
                      borderRadius: `${Number(carousel?.product_card_border_radius ?? 12)}px`,
                      padding: '8px',
                      filter: isInactive ? 'grayscale(80%)' : 'none'
                    }}
                  >
                    <div className="w-8 h-8 rounded bg-slate-100 shrink-0 overflow-hidden border border-slate-100">
                      <img src="https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=80&q=80" alt="Produto" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p style={{ fontSize: `${Number(carousel?.product_card_name_size ?? 9)}px`, color: carousel?.product_card_name_color || '#0F172A' }} className="font-bold truncate">Calça Confort</p>
                      <p style={{ fontSize: `${Number(carousel?.product_card_price_size ?? 8)}px`, color: carousel?.product_card_price_color || colors?.primary || '#0094EB' }} className="font-black">R$ 149,95</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ──────────────────── PREVIEW GRADE ────────────────────
const GridPreview = ({
  grid,
  colors,
  isMobile = false,
}: {
  grid: any;
  colors: any;
  isMobile?: boolean;
}) => {
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());
  const [activeSeqIndex, setActiveSeqIndex] = useState(0);
  
  const shape = normalizeWidgetShape(grid?.shape, 'portrait');
  const isCircle = shape === 'circle';
  const objectFit = grid?.object_fit || 'cover';
  const spacing = safeNumber(grid?.spacing, 12, 0);
  const showPlayIcon = grid?.show_play_icon ?? true;
  const showProduct = grid?.show_product ?? false;
  const isSequential = grid?.sequential_playback ?? false;

  const totalPreviewItems = isMobile ? 4 : limitNumber(grid?.visible_items, 4, 1, 10) * 2;

  useEffect(() => {
    if (!isSequential) return;
    const interval = setInterval(() => {
      setActiveSeqIndex(prev => (prev + 1) % totalPreviewItems);
    }, 5000);
    return () => clearInterval(interval);
  }, [isSequential, totalPreviewItems]);

  useEffect(() => {
    videoRefs.current.forEach((vid, idx) => {
      if (!vid) return;
      const shouldPlay = isSequential
        ? idx === activeSeqIndex
        : (grid?.autoplay_videos ?? true);
      if (shouldPlay) {
        vid.play().catch(() => {});
      } else {
        vid.pause();
      }
    });
  }, [grid?.autoplay_videos, isSequential, activeSeqIndex]);

  const rawBorderRadius = grid?.border_radius;
  const borderRadiusNum = rawBorderRadius !== undefined && rawBorderRadius !== '' ? Number(rawBorderRadius) : 12;
  const borderRadius = isCircle ? '50%' : `${borderRadiusNum}px`;
  
  const rawBorder = grid?.border_width ?? grid?.border_style;
  const parsedBorderWidth = rawBorder !== undefined && rawBorder !== null && rawBorder !== '' && !isNaN(Number(rawBorder)) ? Number(rawBorder) : 0;
  
  const rawCardBorder = grid?.product_card_border_width;
  const parsedCardBorderWidth = rawCardBorder !== undefined && rawCardBorder !== null && rawCardBorder !== '' && !isNaN(Number(rawCardBorder)) ? Number(rawCardBorder) : 0;

  const desktopCanvasWidth = 850;
  const desktopScale = isMobile ? 1 : Math.min(1, desktopCanvasWidth / Math.max(1, limitNumber(grid?.visible_items, 4, 1, 10) * 160));

  const titleAlignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }[grid?.title_align ?? 'center'] || 'text-center';

  const titleStyle: React.CSSProperties = {
    fontSize: `${safeNumber(grid?.title_font_size, 14, 8)}px`,
    fontWeight: (grid?.title_bold ?? true) ? 900 : 500,
  };

  const renderProductCard = (compact = false) => (
    <div
      style={{
        backgroundColor: grid?.product_card_bg || '#FFFFFF',
        borderColor: grid?.product_card_border_color || '#E2E8F0',
        borderWidth: `${parsedCardBorderWidth}px`,
        borderRadius: `${safeNumber(grid?.product_card_border_radius, 8, 0)}px`,
        boxSizing: 'border-box'
      }}
      className={`border flex items-center gap-1 shadow-sm overflow-hidden ${compact ? 'p-1' : 'p-2'}`}
    >
      <div className={`rounded shrink-0 overflow-hidden ${compact ? 'w-5 h-5' : 'w-8 h-8'} bg-slate-200 border border-slate-100`}>
        <img
          src="https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=80&q=80"
          alt="Produto"
          className="w-full h-full object-cover"
        />
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p
          className="truncate"
          style={{
            fontSize: `${safeNumber(grid?.product_card_name_size, compact ? 7 : 9, 6)}px`,
            color: grid?.product_card_name_color || '#0F172A',
            fontWeight: 700,
          }}
        >
          Calça Confort
        </p>
        <p
          style={{
            fontSize: `${safeNumber(grid?.product_card_price_size, compact ? 6.5 : 8, 6)}px`,
            color: grid?.product_card_price_color || colors?.primary || '#0094EB',
            fontWeight: 900,
          }}
        >
          R$ 149,95
        </p>
      </div>
    </div>
  );

  if (isMobile) {
    const items = Array.from({ length: 4 });

    let aspectClass = "aspect-[9/15]";
    if (isCircle) aspectClass = "aspect-square";
    else if (shape === 'landscape') aspectClass = "aspect-[16/9]";
    else if (shape === 'square') aspectClass = "aspect-square";

    return (
      <div className="w-full py-2 flex flex-col space-y-3 box-border">
        {grid?.show_title && (
          <h4 className={`uppercase tracking-wider text-slate-800 dark:text-white ${titleAlignClass}`} style={titleStyle}>
            {grid?.title_text || 'Grade de Vídeos'}
          </h4>
        )}

        <div
          style={{
            marginLeft: `${Number(grid?.margin_left ?? 0)}px`,
            marginRight: `${Number(grid?.margin_right ?? 0)}px`,
            marginTop: `${Number(grid?.margin_top ?? 0)}px`,
            marginBottom: `${Number(grid?.margin_bottom ?? 0)}px`,
            gap: `${spacing}px`,
          }}
          className="grid grid-cols-2 w-full px-2"
        >
          {items.map((_, i) => (
            <div key={i} className="flex flex-col" style={{ gap: '6px' }}>
              <div
                className={`relative bg-slate-950 overflow-hidden shadow-sm flex items-center justify-center transition-all duration-300 ${aspectClass}`}
                style={{
                  borderRadius: borderRadius,
                  border: `${parsedBorderWidth}px solid ${grid?.border_color || colors?.primary || '#0094EB'}`,
                  boxSizing: 'border-box' 
                }}
              >
                <video
                  ref={el => { if (el) videoRefs.current.set(i, el); }}
                  src={DEMO_PREVIEW_VIDEOS[i % DEMO_PREVIEW_VIDEOS.length]}
                  loop
                  muted
                  playsInline
                  className="w-full h-full pointer-events-none"
                  style={{ objectFit: objectFit as any }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30 pointer-events-none" />
                {showPlayIcon && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-6 h-6 rounded-full bg-white/95 flex items-center justify-center shadow-sm">
                      <Play size={8} className="text-slate-900 fill-slate-900 ml-0.5" />
                    </div>
                  </div>
                )}
              </div>

              {showProduct && !isCircle && renderProductCard(true)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const cols = limitNumber(grid?.visible_items, 4, 1, 10);
  const totalItems = cols * 2;
  const items = Array.from({ length: totalItems });
  const shapeRatio = shape === 'landscape' ? (9 / 16) : (16 / 9);

  return (
    <div 
      className="w-full py-3 space-y-3 box-border"
      style={{
        paddingLeft: `${Number(grid?.margin_left ?? 0)}px`,
        paddingRight: `${Number(grid?.margin_right ?? 0)}px`,
        paddingTop: `${Number(grid?.margin_top ?? 0)}px`,
        paddingBottom: `${Number(grid?.margin_bottom ?? 0)}px`,
      }}
    >
      {grid?.show_title && (
        <h4 className={`tracking-wider text-slate-800 dark:text-slate-100 ${titleAlignClass}`} style={titleStyle}>
          {grid?.title_text || 'Grade de Vídeos'}
        </h4>
      )}
      <div
        className="grid w-full"
        style={{ 
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, 
          gap: `${spacing * desktopScale}px`, 
          transform: `scale(${desktopScale})`, 
          transformOrigin: 'center center' 
        }}
      >
        {items.map((_, i) => (
          <div key={i} className="w-full flex flex-col space-y-2">
            <div
              style={{
                width: '100%',
                aspectRatio: isCircle ? '1 / 1' : `${1} / ${shapeRatio}`,
                borderRadius,
                border: `${parsedBorderWidth}px solid ${grid?.border_color || colors?.primary || '#0094EB'}`,
                boxSizing: 'border-box'
              }}
              className="relative overflow-hidden bg-slate-950 shadow-sm flex items-center justify-center shrink-0"
            >
              <video
                ref={el => { if (el) videoRefs.current.set(i, el); }}
                src={DEMO_PREVIEW_VIDEOS[i % DEMO_PREVIEW_VIDEOS.length]}
                loop
                muted
                playsInline
                className="w-full h-full pointer-events-none"
                style={{ objectFit: objectFit as any }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30 pointer-events-none" />
              {showPlayIcon && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-8 h-8 rounded-full bg-white/95 flex items-center justify-center shadow-sm">
                    <Play size={10} className="text-slate-900 fill-slate-900 ml-0.5" />
                  </div>
                </div>
              )}
            </div>
            {showProduct && !isCircle && renderProductCard(false)}
          </div>
        ))}
      </div>
    </div>
  );
};

// ──────────────────── PREVIEW PLAYER (MODAL) ────────────────────
const ModalPlayerPreview = ({
  playerConfig,
  primaryColor,
  isMobile = false,
}: {
  playerConfig: any;
  primaryColor: string;
  isMobile?: boolean;
}) => {
  const parsedBorderWidth = playerConfig?.border_width !== undefined && playerConfig?.border_width !== null && playerConfig?.border_width !== '' 
    ? Number(playerConfig.border_width) 
    : 0;

  const rawCardBorder = playerConfig?.product_card_border_width;
  const parsedCardBorderWidth = rawCardBorder !== undefined && rawCardBorder !== null && rawCardBorder !== '' && !isNaN(Number(rawCardBorder)) ? Number(rawCardBorder) : 0;
  
  const getCardStyle = () => ({
    backgroundColor: playerConfig?.product_card_bg || 'rgba(255,255,255,0.95)',
    borderColor: playerConfig?.product_card_border_color || 'rgba(255,255,255,0.2)',
    borderWidth: `${parsedCardBorderWidth}px`,
    borderStyle: parsedCardBorderWidth > 0 ? 'solid' : 'none',
    borderRadius: playerConfig?.product_card_border_radius !== undefined ? `${playerConfig.product_card_border_radius}px` : '1rem',
  });

  const getFontSize = (sizeVal: any, defaultSize: number, mobileScale = 1) => {
    const size = sizeVal !== undefined && sizeVal !== null && sizeVal !== '' ? Number(sizeVal) : defaultSize;
    return `${size * mobileScale}px`;
  };

  const showLike = playerConfig?.show_like_button !== false;
  const showComments = playerConfig?.show_comment_button !== false;
  const showShare = playerConfig?.show_share_button !== false;
  const showProduct = playerConfig?.show_product !== false;

  if (isMobile) {
    return (
      <div className="relative w-full h-full overflow-hidden bg-slate-950/90 flex items-center justify-center p-4">
        <div 
          className="relative w-full h-[85%] max-h-[700px] overflow-hidden flex flex-col justify-between shadow-2xl bg-black"
          style={{
            color: '#FFFFFF',
            borderColor: playerConfig?.border_color || primaryColor,
            borderWidth: `${parsedBorderWidth}px`,
            borderStyle: parsedBorderWidth > 0 ? 'solid' : 'none',
            borderRadius: playerConfig?.border_radius ? `${playerConfig.border_radius}px` : '1rem',
          }}
        >
          <video
            src={DEMO_PREVIEW_VIDEOS[0]}
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 h-full w-full object-cover pointer-events-none"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/90 pointer-events-none z-10" />

          <div className="relative z-20 flex items-center justify-between p-3 pt-3">
            {playerConfig?.show_title && (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full border border-white/25 bg-white/10 backdrop-blur-sm" />
                <div>
                  <h4 className="text-xs font-bold text-white drop-shadow leading-tight">Calça Confort</h4>
                  <p className="text-[9px] text-white/70">Vidlytics Store</p>
                </div>
              </div>
            )}
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md border border-white/10 transition-colors hover:bg-black/60 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          <div className="absolute right-3 bottom-[110px] z-20 flex flex-col items-center gap-3.5">
            {showLike && (
              <button className="flex flex-col items-center text-white hover:scale-105 transition duration-150 cursor-pointer">
                <div className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center">
                  <Heart size={16} className="text-white fill-white" />
                </div>
                <span className="text-[8px] font-semibold mt-0.5 drop-shadow">1.2k</span>
              </button>
            )}
            {showComments && (
              <button className="flex flex-col items-center text-white hover:scale-105 transition duration-150 cursor-pointer">
                <div className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center">
                  <MessageCircle size={16} className="text-white" />
                </div>
                <span className="text-[8px] font-semibold mt-0.5 drop-shadow">48</span>
              </button>
            )}
            {showShare && (
              <button className="flex flex-col items-center text-white hover:scale-105 transition duration-150 cursor-pointer">
                <div className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center">
                  <Share2 size={16} className="text-white" />
                </div>
                <span className="text-[8px] font-semibold mt-0.5 drop-shadow">Enviar</span>
              </button>
            )}
          </div>

          <div className="relative z-20 w-full p-3 space-y-2.5">
            {showProduct && (
              <div 
                className="backdrop-blur-md p-2.5 flex items-center gap-2.5 shadow-2xl transition hover:scale-[1.01]"
                style={getCardStyle()}
              >
                <div className="h-11 w-11 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-100">
                  <img
                    src="https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=150&q=80"
                    alt="Product"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h5 
                    className="font-bold truncate" 
                    style={{ 
                      color: playerConfig?.product_card_name_color || '#0F172A',
                      fontSize: getFontSize(playerConfig?.product_card_name_size, 11)
                    }}
                  >
                    Calça Confort Premium
                  </h5>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span 
                      className="font-black" 
                      style={{ 
                        color: playerConfig?.product_card_price_color || primaryColor,
                        fontSize: getFontSize(playerConfig?.product_card_price_size, 11)
                      }}
                    >
                      R$ 149,95
                    </span>
                    <span className="text-[9px] text-slate-400 line-through">R$ 199,90</span>
                  </div>
                </div>
                <ChevronRight
                  size={20}
                  className="shrink-0"
                  style={{ color: playerConfig?.product_card_price_color || primaryColor }}
                />
              </div>
            )}

            <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full rounded-full w-2/3" style={{ backgroundColor: primaryColor }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0f111a] border border-slate-800/80 rounded-2xl flex items-center justify-center p-4">
      <div
        className="relative h-full max-h-[410px] w-full max-w-[230px] overflow-hidden shadow-2xl shrink-0 bg-slate-900 flex flex-col justify-between"
        style={{
          color: '#FFFFFF',
          borderColor: playerConfig?.border_color || primaryColor,
          borderWidth: `${parsedBorderWidth}px`,
          borderStyle: parsedBorderWidth > 0 ? 'solid' : 'none',
          borderRadius: playerConfig?.border_radius ? `${playerConfig.border_radius}px` : '1.25rem',
        }}
      >
        <video
          src={DEMO_PREVIEW_VIDEOS[0]}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 h-full w-full object-cover pointer-events-none"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/90 pointer-events-none z-10" />

        <div className="relative z-20 flex items-center justify-between p-3">
          {playerConfig?.show_title && (
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full border border-white/25 bg-white/10 backdrop-blur-sm" />
              <div className="min-w-0">
                <h4 className="text-[10px] font-bold text-white drop-shadow truncate w-24 leading-tight">Calça Confort</h4>
                <p className="text-[8px] text-white/70 truncate w-24">Vidlytics Store</p>
              </div>
            </div>
          )}
          <button
            type="button"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-md transition-colors hover:bg-black/60 cursor-pointer"
          >
            <X size={12} />
          </button>
        </div>

        <div className="absolute right-2.5 bottom-[88px] z-20 flex flex-col items-center gap-2.5">
          {showLike && (
            <button className="flex flex-col items-center text-white hover:scale-105 transition duration-150 cursor-pointer">
              <div className="w-7 h-7 rounded-full bg-black/45 backdrop-blur-md border border-white/10 flex items-center justify-center">
                <Heart size={13} className="text-white fill-white" />
              </div>
              <span className="text-[7px] font-semibold mt-0.5 drop-shadow">1.2k</span>
            </button>
          )}
          {showComments && (
            <button className="flex flex-col items-center text-white hover:scale-105 transition duration-150 cursor-pointer">
              <div className="w-7 h-7 rounded-full bg-black/45 backdrop-blur-md border border-white/10 flex items-center justify-center">
                <MessageCircle size={13} className="text-white" />
              </div>
              <span className="text-[7px] font-semibold mt-0.5 drop-shadow">48</span>
            </button>
          )}
          {showShare && (
            <button className="flex flex-col items-center text-white hover:scale-105 transition duration-150 cursor-pointer">
              <div className="w-7 h-7 rounded-full bg-black/45 backdrop-blur-md border border-white/10 flex items-center justify-center">
                <Share2 size={13} className="text-white" />
              </div>
              <span className="text-[7px] font-semibold mt-0.5 drop-shadow">Enviar</span>
            </button>
          )}
        </div>

        <div className="relative z-20 w-full p-2.5 space-y-2">
          {showProduct && (
            <div 
              className="backdrop-blur-md p-2 flex items-center gap-2 shadow-2xl transition hover:scale-[1.01]"
              style={getCardStyle()}
            >
              <div className="h-8 w-8 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-100">
                <img
                  src="https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=150&q=80"
                  alt="Product"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h5 
                  className="font-bold truncate"
                  style={{ 
                    color: playerConfig?.product_card_name_color || '#0F172A',
                    fontSize: getFontSize(playerConfig?.product_card_name_size, 9, 0.8) 
                  }}
                >
                  Calça Confort Premium
                </h5>
                <div className="flex items-center gap-1 mt-0.5">
                  <span 
                    className="font-black"
                    style={{ 
                      color: playerConfig?.product_card_price_color || primaryColor,
                      fontSize: getFontSize(playerConfig?.product_card_price_size, 9, 0.8) 
                    }}
                  >
                    R$ 149,95
                  </span>
                  <span className="text-[7px] text-slate-400 line-through">R$ 199,90</span>
                </div>
              </div>
              <ChevronRight
                size={16}
                className="shrink-0"
                style={{ color: playerConfig?.product_card_price_color || primaryColor }}
              />
            </div>
          )}

          <div className="w-full h-0.5 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full rounded-full w-2/3" style={{ backgroundColor: primaryColor }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AparenciaModal;