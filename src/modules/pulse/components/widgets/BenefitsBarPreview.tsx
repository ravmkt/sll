import type { CSSProperties } from 'react';
import BenefitIcon from './BenefitIcon';
import type { BenefitItem, BenefitsDesign, IconSettings } from '../../types/infoCards';

interface Props {
  title: string; items: BenefitItem[]; ic: IconSettings; ds: BenefitsDesign; device: 'mobile' | 'desktop';
}

export default function BenefitsBarPreview({ title, items, ic, ds, device }: Props) {
  const mobile = device === 'mobile';
  const carousel = mobile && ds.mobile === 'carousel';
  const stack = mobile && ds.mobile === 'stack';
  const top = ic.position === 'top';
  const dir = top ? 'column' : ic.position === 'right' ? 'row-reverse' : 'row';

  const wrap: CSSProperties = ds.item_card ? {} : {
    background: ds.bg, border: `1px solid ${ds.border}`, borderRadius: ds.radius, overflow: 'hidden',
  };
  const list: CSSProperties = {
    display: 'flex', flexDirection: stack ? 'column' : 'row', gap: ds.item_card ? 10 : 0,
    overflowX: carousel ? 'auto' : 'visible', scrollSnapType: carousel ? 'x mandatory' : undefined,
  };

  return (
    <div>
      {title.trim() && <div style={{ textAlign: 'center', fontWeight: 800, fontSize: 14, color: '#0F172A', marginBottom: 8 }}>{title}</div>}
      <div style={wrap}>
        <div style={list}>
          {items.map((it, i) => {
            const s: CSSProperties = {
              display: 'flex', flexDirection: dir, alignItems: 'center', gap: 12, padding: '14px 16px',
              justifyContent: top ? 'center' : ic.position === 'right' ? 'space-between' : 'flex-start',
              textAlign: top ? 'center' : 'left', flex: carousel ? '0 0 78%' : '1 1 0', minWidth: 0,
              scrollSnapAlign: 'start', color: ds.text, boxSizing: 'border-box',
            };
            if (ds.item_card) { s.background = ds.bg; s.border = `1px solid ${ds.border}`; s.borderRadius = ds.radius; }
            else if (ds.divider && i > 0) { if (stack) s.borderTop = `1px solid ${ds.border}`; else s.borderLeft = `1px solid ${ds.border}`; }
            return (
              <div key={i} style={s}>
                <BenefitIcon svg={it.icon_svg} size={ic.size} color={ic.color} bg={ic.bg} bgColor={ic.bg_color} />
                <div style={{ minWidth: 0, flex: top ? undefined : 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: ds.text }}>{it.label}</div>
                  {it.value && <div style={{ fontSize: 12, color: ds.sub, marginTop: 2 }}>{it.value}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
