import { useEffect, useRef, type CSSProperties } from 'react';
import { buildCards } from '../../lib/rulerCards';
import type { RulerAppearance, RulerContent } from '../../types/widgets';

function Cards({ a, tiers }: { a: RulerAppearance; tiers: RulerContent['tiers'] }) {
  const ref = useRef<HTMLDivElement>(null);
  const key = JSON.stringify([a, tiers]);
  useEffect(() => {
    const h = ref.current;
    if (!h) return;
    const r = buildCards(a, tiers);
    h.innerHTML = '';
    h.appendChild(r.el);
    return () => r.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return <div ref={ref} />;
}

export default function RulerPreview({ a, content }: { a: RulerAppearance; content: RulerContent }) {
  const n = content.tiers.length;
  const box: CSSProperties = {
    boxSizing: 'border-box', width: '100%',
    maxWidth: a.max_width > 0 ? a.max_width : '100%',
    margin: `${a.margin_top}px auto ${a.margin_bottom}px`,
    padding: `${a.padding_y}px ${a.padding_x}px`,
    background: a.bg_color,
    border: a.border_width > 0 ? `${a.border_width}px solid ${a.border_color}` : 'none',
    borderRadius: a.border_radius,
  };
  return (
    <div style={box}>
      {a.show_title && content.title && (
        <div style={{ color: a.title_color, fontSize: a.title_size, fontWeight: a.title_bold ? 700 : 500, textAlign: a.title_align, marginBottom: 12 }}>
          {content.title}
        </div>
      )}
      {a.layout === 'cards' ? (
        <Cards a={a} tiers={content.tiers} />
      ) : (
        <div style={{ position: 'relative' }}>
          {a.show_markers && n > 1 && (
            <div style={{
              position: 'absolute', top: a.marker_size / 2 - a.bar_height / 2, height: a.bar_height,
              left: `${50 / n}%`, right: `${50 / n}%`, background: a.track_color, borderRadius: a.bar_height,
            }} />
          )}
          <div style={{ position: 'relative', display: 'flex' }}>
            {content.tiers.map((t, i) => (
              <div key={i} style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
                {a.show_markers && (
                  <div style={{
                    width: a.marker_size, height: a.marker_size, borderRadius: '50%', margin: '0 auto 6px',
                    background: a.accent_color, border: `2px solid ${a.bg_color}`, boxSizing: 'border-box',
                  }} />
                )}
                <div style={{ color: a.text_color, fontSize: a.text_size }}>{t.label}</div>
                <div style={{ color: a.accent_color, fontSize: a.text_size + 2, fontWeight: 700 }}>{t.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {a.show_footer && content.footer && (
        <div style={{ color: a.footer_color, fontSize: a.footer_size, textAlign: a.footer_align, marginTop: 12 }}>
          {content.footer}
        </div>
      )}
    </div>
  );
}