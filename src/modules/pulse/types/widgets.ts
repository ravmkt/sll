import type { SupabaseClient } from '@supabase/supabase-js';
import type { Placement } from '../components/widgets/WidgetPlacementPicker';

export interface WidgetsCtx {
  supabase: SupabaseClient;
  storeId: string;
  storeUrl?: string;
  storeName?: string;
  basePath?: string;
}

export interface CardLine { text: string; color?: string; size?: number; }
export interface Tier {
  label: string; value: string;
  lines?: CardLine[]; highlight?: boolean; border_color?: string; bg_color?: string;
}
export interface RulerContent { title: string; tiers: Tier[]; footer: string; }

export interface LineStyle { size: number; color: string; weight: number; font: string; upper: boolean; spacing: number; }

export interface RulerAppearance {
  max_width: number; margin_top: number; margin_bottom: number; padding_y: number; padding_x: number;
  border_color: string; border_width: number; border_radius: number; bg_color: string;
  title_color: string; text_color: string; accent_color: string; track_color: string; footer_color: string;
  title_size: number; title_bold: boolean; title_align: 'left' | 'center' | 'right';
  text_size: number; footer_size: number; footer_align: 'left' | 'center' | 'right';
  bar_height: number; marker_size: number;
  show_title: boolean; show_markers: boolean; show_footer: boolean;
  layout: 'steps' | 'cards';
  cards_visible: number;
  carousel_mode: 'static' | 'auto' | 'manual' | 'stack';
  infinite: boolean; autoplay_ms: number; anim_ms: number; pause_hover: boolean; cards_gap: number;
  card_padding: number; card_radius: number; card_border_width: number;
  card_border_color: string; card_bg_color: string;
  hl_border_color: string; hl_bg_color: string; hl_glow: boolean;
  hl_glow_color?: string;
  hl_glow_size?: number; hl_main_color: string;
  lines: LineStyle[];
}

export interface RulerStyleConfig { desktop: RulerAppearance; mobile: RulerAppearance; }

export interface WidgetStyle {
  id: string; store_id: string; widget_type: string; name: string; primary_color: string;
  config: Partial<RulerStyleConfig>; is_default: boolean; created_at: string;
}

export interface RulerSettings {
  store_id: string; active: boolean; title: string; tiers: Tier[]; footer: string;
  placement: Placement; style_id: string | null;
}

const IMPACT = 'Impact, "Arial Black", sans-serif';
export const CARD_FONTS = [
  ['inherit', 'Padr\u00e3o da loja'], [IMPACT, 'Impacto'], ['Georgia, serif', 'Georgia (serifada)'],
  ['"Trebuchet MS", sans-serif', 'Trebuchet'], ['Verdana, sans-serif', 'Verdana'], ['"Courier New", monospace', 'Courier (mono)'],
] as const;

export const SAMPLE_CONTENT: RulerContent = {
  title: 'Quanto mais voc\u00ea leva, mais voc\u00ea economiza',
  tiers: [
    { label: '2 pe\u00e7as', value: '5% OFF', lines: [{ text: 'Leve 2 pe\u00e7as' }, { text: '5% OFF' }, { text: 'Renove o b\u00e1sico' }] },
    { label: '3 pe\u00e7as', value: '10% OFF', highlight: true, lines: [{ text: 'Leve 3 pe\u00e7as \u2B50' }, { text: '10% OFF' }, { text: '+ Brinde acima de R$ 300' }] },
    { label: '4 pe\u00e7as', value: '15% OFF', lines: [{ text: 'Leve 4+ pe\u00e7as' }, { text: '15% OFF' }, { text: '+ Frete gr\u00e1tis' }] },
  ],
  footer: 'Desconto aplicado automaticamente no carrinho.',
};

export function buildConfig(color: string, o: Partial<RulerAppearance> = {}): RulerStyleConfig {
  const desktop: RulerAppearance = {
    max_width: 0, margin_top: 12, margin_bottom: 12, padding_y: 16, padding_x: 20,
    border_color: '#E2E8F0', border_width: 1, border_radius: 12,
    bg_color: '#FFFFFF', title_color: '#0F172A', text_color: '#475569',
    accent_color: color, track_color: '#E2E8F0', footer_color: '#64748B',
    title_size: 16, title_bold: true, title_align: 'center',
    text_size: 12, footer_size: 11, footer_align: 'center',
    bar_height: 6, marker_size: 18,
    show_title: true, show_markers: true, show_footer: true,
    layout: 'steps', cards_visible: 3, carousel_mode: 'static', infinite: true, autoplay_ms: 3000, anim_ms: 500,
    pause_hover: true, cards_gap: 12, card_padding: 16, card_radius: 10, card_border_width: 1,
    card_border_color: color, card_bg_color: '#F8FAFC', hl_border_color: '#0F172A', hl_bg_color: '#F8FAFC',
    hl_glow: true, hl_main_color: '',
    lines: [
      { size: 11, color: '#475569', weight: 600, font: 'inherit', upper: true, spacing: 1 },
      { size: 28, color, weight: 900, font: IMPACT, upper: false, spacing: 0 },
      { size: 12, color: '#64748B', weight: 400, font: 'inherit', upper: false, spacing: 0 },
    ],
    ...o,
  };
  const mobile: RulerAppearance = {
    ...desktop, padding_y: 12, padding_x: 12, title_size: 14, text_size: 11, footer_size: 10,
    marker_size: 16, margin_top: 8, margin_bottom: 8,
    cards_visible: 1, carousel_mode: 'manual',
    lines: desktop.lines.map((l) => ({ ...l, size: Math.round(l.size * 0.85) })),
  };
  return { desktop, mobile };
}

function mergeApp(d: RulerAppearance, c?: Partial<RulerAppearance>): RulerAppearance {
  const x = { ...d, ...(c ?? {}) } as RulerAppearance;
  x.lines = d.lines.map((l, i) => ({ ...l, ...(c?.lines?.[i] ?? {}) }));
  return x;
}

export function mergeConfig(c?: Partial<RulerStyleConfig> | null): RulerStyleConfig {
  const d = buildConfig('#0094EB');
  return { desktop: mergeApp(d.desktop, c?.desktop), mobile: mergeApp(d.mobile, c?.mobile) };
}

const GOLD_LINES: LineStyle[] = [
  { size: 10, color: '#E5E7EB', weight: 600, font: 'inherit', upper: true, spacing: 1.5 },
  { size: 30, color: '#C9A961', weight: 900, font: IMPACT, upper: false, spacing: 0 },
  { size: 11, color: '#7FA6D6', weight: 400, font: 'inherit', upper: false, spacing: 0 },
];

export const PRESETS: { name: string; color: string; config: RulerStyleConfig }[] = [
  { name: 'Cl\u00e1ssica', color: '#0094EB', config: buildConfig('#0094EB') },
  { name: 'Black Friday', color: '#F2CB40',
    config: buildConfig('#F2CB40', { bg_color: '#0F0F14', border_color: '#F2CB40', border_width: 2,
      title_color: '#FFFFFF', text_color: '#CBD5E1', track_color: '#2A2A33', footer_color: '#94A3B8' }) },
  { name: 'Minimalista', color: '#0F172A',
    config: buildConfig('#0F172A', { bg_color: '#F8FAFC', border_width: 0, border_radius: 0 }) },
  { name: 'Ros\u00e9', color: '#E11D74',
    config: buildConfig('#E11D74', { bg_color: '#FFF1F6', border_color: '#FBCFE8', title_color: '#831843',
      text_color: '#9D174D', track_color: '#FBCFE8', footer_color: '#BE185D', border_radius: 16 }) },
  { name: 'Cards Gold', color: '#C9A961',
    config: buildConfig('#C9A961', { layout: 'cards', carousel_mode: 'auto', bg_color: '#0F0F0F', border_width: 0,
      title_color: '#FFFFFF', footer_color: '#F2CB40', card_bg_color: '#17140F', card_border_color: '#C9A961',
      hl_bg_color: '#17140F', hl_border_color: '#FFFFFF', hl_main_color: '#FFFFFF', lines: GOLD_LINES }) },
  { name: 'Cards Claro', color: '#0094EB',
    config: buildConfig('#0094EB', { layout: 'cards', carousel_mode: 'auto', card_bg_color: '#FFFFFF',
      card_border_color: '#BAE0F7', hl_border_color: '#0094EB', hl_bg_color: '#F0F9FF' }) },
  { name: 'Cards Ros\u00e9', color: '#E11D74',
    config: buildConfig('#E11D74', { layout: 'cards', carousel_mode: 'auto', bg_color: '#FFF1F6', border_color: '#FBCFE8',
      title_color: '#831843', footer_color: '#BE185D', card_bg_color: '#FFFFFF', card_border_color: '#FBCFE8',
      hl_border_color: '#E11D74', hl_bg_color: '#FFF7FA', card_radius: 16 }) },
];