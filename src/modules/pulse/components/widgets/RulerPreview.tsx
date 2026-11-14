import type { CSSProperties } from 'react';
import type { RulerAppearance, RulerContent } from '../../types/widgets';

export default function RulerPreview({ a, content }: { a: RulerAppearance; content: RulerContent }) {
  const n = content.tiers.length;
  const box: CSSProperties = {
    boxSizing: 'border-box',
    width: '100%',
    maxWidth: a.max_width > 0 ? a.max_width : '100%',
    margin: `${a.margin_top}px auto ${a.margin_bottom}px`,
    padding: `${a.padding_y}px ${a.padding_x}px`,
    background: a.bg_color,
    border: a.border_width > 0 ? `${a.border_width}px solid ${a.border_color}` : 'none',
    borderRadius: a.border_radius,
    fontFamily: 'inherit',
  };

  return (
    <div style={box}>
      {a.show_title && content.title && (
        <div style={{ color: a.title_color, fontSize: a.title_size, fontWeight: a.title_bold ? 700 : 400,
          textAlign: a.title_align, marginBottom: 12, lineHeight: 1.3 }}>
          {content.title}
        </div>
      )}
      {n > 0 && (
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', left: `${50 / n}%`, right: `${50 / n}%`,
            top: a.marker_size / 2 - a.bar_height / 2, height: a.bar_height,
            background: a.track_color, borderRadius: a.bar_height }} />
          <div style={{ position: 'relative', display: 'flex' }}>
            {content.tiers.map((t, i) => (
              <div key={i} style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
                {a.show_markers ? (
                  <div style={{ width: a.marker_size, height: a.marker_size, borderRadius: '50%',
                    background: a.accent_color, border: `2px solid ${a.bg_color}`, boxSizing: 'border-box',
                    margin: '0 auto' }} />
                ) : <div style={{ height: a.marker_size }} />}
                <div style={{ marginTop: 6, fontSize: a.text_size, color: a.text_color, lineHeight: 1.25 }}>{t.label}</div>
                <div style={{ fontSize: a.text_size + 1, color: a.accent_color, fontWeight: 700, lineHeight: 1.25 }}>{t.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {a.show_footer && content.footer && (
        <div style={{ color: a.footer_color, fontSize: a.footer_size, textAlign: a.footer_align, marginTop: 12, lineHeight: 1.3 }}>
          {content.footer}
        </div>
      )}
    </div>
  );
}
