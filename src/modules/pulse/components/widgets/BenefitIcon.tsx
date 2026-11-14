import { useMemo } from 'react';
import { sanitizeSvg } from '../../lib/benefitIcons';
import type { IconBg } from '../../types/infoCards';

interface Props { svg?: string; size: number; color?: string | null; bg?: IconBg; bgColor?: string | null }

export default function BenefitIcon({ svg, size, color, bg = 'none', bgColor }: Props) {
  const html = useMemo(() => sanitizeSvg(svg ?? ''), [svg]);
  const box = bg === 'none' ? size : Math.round(size * 1.7);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      width: box, height: box, color: color || '#0094EB',
      borderRadius: bg === 'circle' ? '50%' : bg === 'square' ? 10 : 0,
      background: bg === 'none' ? 'transparent' : bgColor || '#E0F2FE',
    }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
        strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: html }} />
    </span>
  );
}
