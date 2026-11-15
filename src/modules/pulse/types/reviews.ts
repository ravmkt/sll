import type { Placement } from '../components/widgets/WidgetPlacementPicker';

export type ReviewSource = 'manual' | 'store' | 'google';
export type ReviewStatus = 'pending' | 'approved' | 'rejected';
export type ReviewScope = 'product' | 'storefront';

export interface ReviewMedia { id?: string; kind: 'image' | 'video'; url: string; poster_url?: string | null; }

export interface PublicReview {
  id: string; source: ReviewSource; author_name: string; rating: number; title: string; body: string;
  review_date: string; verified: boolean; helpful: number; media: ReviewMedia[];
}
export interface Review extends PublicReview {
  store_id: string; product_ref: string | null; product_name: string | null; status: ReviewStatus;
}
export interface ReviewInput {
  id?: string | null; source: ReviewSource; product_ref: string; product_name: string; author_name: string;
  rating: number; title: string; body: string; review_date: string; verified: boolean; status: ReviewStatus;
  media: ReviewMedia[];
}

export interface ReviewDesign {
  title: string; show_title: boolean; accent: string; star_color: string; bg: string; text: string;
  title_color: string; card_bg: string; border: string; radius: number; font: string; max_width: number;
  margin_y: number; columns: number; show_avatar: boolean; show_stars: boolean; show_date: boolean;
  show_source: boolean; show_verified: boolean; show_media: boolean; show_summary: boolean;
  width_mode: 'auto' | 'full' | 'custom'; align: 'left' | 'center' | 'right'; padding: number; margin_x: number;
  carousel: boolean; arrows: boolean; dots: boolean; drag: boolean; autoplay: boolean; interval: number;
  per_view_desktop: number; per_view_mobile: number; loop: boolean;
  hide_native: boolean; native_selector: string;
}

export interface ReviewWidget {
  id: string; store_id: string; name: string; active: boolean; scope: ReviewScope; template: string;
  min_rating: number; sources: ReviewSource[]; max_items: number; placement: Placement; design: Partial<ReviewDesign>;
}
export type ReviewWidgetInput = Omit<ReviewWidget, 'id' | 'store_id'> & { id?: string | null };

export interface ReviewsData {
  stats: { count: number; avg: number; dist: Record<string, number> };
  reviews: PublicReview[];
}

export const DEFAULT_DESIGN: ReviewDesign = {
  title: 'O que nossos clientes dizem', show_title: true, accent: '#0094EB', star_color: '#F5A623',
  bg: '#FFFFFF', text: '#334155', title_color: '#0F172A', card_bg: '#FFFFFF', border: '#E2E8F0',
  radius: 12, font: 'inherit', max_width: 0, margin_y: 16, columns: 3,
  show_avatar: true, show_stars: true, show_date: true, show_source: true, show_verified: true,
  show_media: true, show_summary: true,
  width_mode: 'auto', align: 'center', padding: 16, margin_x: 0,
  carousel: true, arrows: true, dots: true, drag: true, autoplay: false, interval: 5,
  per_view_desktop: 3, per_view_mobile: 1, loop: true,
  hide_native: false, native_selector: '',
};

export interface ReviewTemplate { id: string; label: string; desc: string; defaults: Partial<ReviewDesign>; }

export const TEMPLATES: ReviewTemplate[] = [
  { id: 'cards_photo', label: 'Cards com fotos', desc: 'Carrossel deslizante, avatar, estrelas e fotos do cliente.', defaults: {} },
  { id: 'cards_clean', label: 'Cards limpos', desc: 'Grade simples, só estrelas e texto.',
    defaults: { show_avatar: false, show_media: false, show_summary: false, carousel: false } },
  { id: 'spotlight', label: 'Depoimento destaque', desc: 'Um depoimento grande por vez, com setas.',
    defaults: { show_media: false, show_summary: false } },
  { id: 'photo_wall', label: 'Mural de fotos', desc: 'Grade de fotos e vídeos dos clientes.',
    defaults: { show_avatar: false } },
  { id: 'summary_list', label: 'Lista com resumo', desc: 'Nota média e barras de 5★ a 1★ ao lado da lista.', defaults: {} },
  { id: 'badge', label: 'Selo compacto', desc: 'Só nota média e total de avaliações.', defaults: { show_title: false } },
  { id: 'text_only', label: 'Texto puro', desc: 'Citações sem estrelas, estilo editorial.',
    defaults: { show_stars: false, show_avatar: false, show_media: false, show_verified: false, show_summary: false, carousel: false } },
  { id: 'ml_style', label: 'Estilo Mercado Livre', desc: 'Nota grande, barras, miniaturas e "compra verificada".',
    defaults: { accent: '#3483FA', star_color: '#3483FA', title: 'Opiniões sobre o produto', title_color: '#333333',
      text: '#333333', border: '#EEEEEE', radius: 6, show_avatar: false, columns: 1 } },
];

export function templateDesign(id: string): ReviewDesign {
  const t = TEMPLATES.find((x) => x.id === id);
  return { ...DEFAULT_DESIGN, ...(t?.defaults ?? {}) };
}

export function computeStats(list: PublicReview[]): ReviewsData['stats'] {
  const dist: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
  list.forEach((r) => { dist[String(r.rating)] = (dist[String(r.rating)] ?? 0) + 1; });
  const avg = list.length ? Math.round((list.reduce((a, r) => a + r.rating, 0) / list.length) * 100) / 100 : 0;
  return { count: list.length, avg, dist };
}

const ph = (c: string) => 'data:image/svg+xml;utf8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="${c}"/></svg>`);

export const SAMPLE_REVIEWS: PublicReview[] = [
  { id: 's1', source: 'store', author_name: 'Mariana S.', rating: 5, title: 'Perfeito!', verified: true, helpful: 4,
    body: 'Chegou antes do prazo e o acabamento é lindo. Já indiquei para as amigas.', review_date: '2026-10-02T12:00:00Z',
    media: [{ kind: 'image', url: ph('#BAE6FD') }, { kind: 'image', url: ph('#FBCFE8') }] },
  { id: 's2', source: 'google', author_name: 'Carlos Eduardo', rating: 5, title: '', verified: false, helpful: 0,
    body: 'Atendimento excelente e entrega rápida. Recomendo.', review_date: '2026-09-18T12:00:00Z', media: [] },
  { id: 's3', source: 'manual', author_name: 'Fernanda L.', rating: 4, title: 'Muito bom', verified: true, helpful: 2,
    body: 'Qualidade ótima, só achei a embalagem simples. O produto é igual ao das fotos.', review_date: '2026-09-05T12:00:00Z',
    media: [{ kind: 'image', url: ph('#BBF7D0') }] },
  { id: 's4', source: 'store', author_name: 'Rafael M.', rating: 5, title: 'Superou a expectativa', verified: true, helpful: 1,
    body: 'Material firme e caimento perfeito. Comprarei novamente.', review_date: '2026-08-21T12:00:00Z',
    media: [{ kind: 'image', url: ph('#FDE68A') }] },
];
