import type { CSSProperties } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CAROUSEL_FONTS } from '../../lib/carouselDefaults';
import type { CarouselDesign, CarouselFont, CarouselItem } from '../../types/infoCards';

interface Props { title: string; items: CarouselItem[]; ds: CarouselDesign; device: 'mobile' | 'desktop' }

const stack = (f: CarouselFont) => CAROUSEL_FONTS.find((x) => x.id === f)?.stack ?? 'inherit';

export default function CarouselPreview({ title, items, ds, device }: Props) {
  const mobile = device === 'mobile';
  const fixed = ds.size_mode === 'fixed';
  const size = mobile ? ds.size_m : ds.size_d;
  const pv = Math.max(1, mobile ? ds.per_mobile : ds.per_desktop);
  const radius = ds.shape === 'circle' ? '50%' : `${ds.img_radius}%`;
  const aspect = ds.shape === 'circle' ? '1 / 1' : ds.aspect;
  const basis = fixed ? `${size}px` : `calc((100% - ${ds.gap * (pv - 1)}px) / ${pv})`;
  const overflowing = fixed ? items.length > (mobile ? 2 : 5) : items.length > pv;
  const arrow: CSSProperties = {
    position: 'absolute', top: '50%', transform: 'translateY(-50%)', width: 32, height: 32, borderRadius: '50%',
    background: 'rgba(255,255,255,.95)', boxShadow: '0 1px 4px rgba(0,0,0,.2)', color: ds.arrow_color,
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2,
  };
  return (
    <div style={{ background: ds.bg_on ? ds.bg_color : 'transparent', padding: `${ds.pad_t}px ${ds.pad_x}px ${ds.pad_b}px`, boxSizing: 'border-box' }}>
      {title.trim() && (
        <div style={{ textAlign: 'center', fontWeight: ds.title_bold ? 700 : 400, fontSize: ds.title_size, color: ds.title_color,
          fontFamily: stack(ds.title_font), marginBottom: 10 }}>{title}</div>
      )}
      {items.length === 0 && <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-xs text-slate-400">Adicione imagens para ver o preview</div>}
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', gap: ds.gap, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {items.map((it, i) => (
            <div key={i} style={{
              flex: `0 0 ${basis}`, minWidth: 0,
              marginLeft: fixed && i === 0 ? 'auto' : undefined, marginRight: fixed && i === items.length - 1 ? 'auto' : undefined,
            }}>
              <div style={{
                position: 'relative', overflow: 'hidden', boxSizing: 'border-box', aspectRatio: aspect, background: ds.img_bg,
                borderRadius: radius, border: ds.border_on ? `${ds.border_w}px solid ${ds.border_color}` : 'none',
              }}>
                <img src={it.image} alt={it.label} draggable={false} style={{ width: '100%', height: '100%', objectFit: ds.fit, display: 'block' }} />
                {ds.caption_pos === 'overlay' && it.label && (
                  <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '22px 8px 8px', textAlign: 'center', color: '#fff',
                    fontSize: ds.caption_size, fontWeight: ds.caption_bold ? 700 : 400, fontFamily: stack(ds.caption_font),
                    background: 'linear-gradient(transparent,rgba(0,0,0,.6))' }}>{it.label}</div>
                )}
              </div>
              {ds.caption_pos === 'below' && it.label && (
                <div style={{ marginTop: 8, textAlign: 'center', fontSize: ds.caption_size, color: ds.caption_color, lineHeight: 1.3,
                  fontWeight: ds.caption_bold ? 700 : 400, fontFamily: stack(ds.caption_font) }}>{it.label}</div>
              )}
            </div>
          ))}
        </div>
        {ds.arrows && !mobile && overflowing && (
          <>
            <span style={{ ...arrow, left: 4, opacity: 0.4 }}><ChevronLeft size={18} /></span>
            <span style={{ ...arrow, right: 4 }}><ChevronRight size={18} /></span>
          </>
        )}
      </div>
    </div>
  );
}
