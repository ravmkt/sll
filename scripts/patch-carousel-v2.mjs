import fs from 'node:fs';
import vm from 'node:vm';

const rd = (p) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const fail = (m) => { console.error(m); process.exit(1); };
function rep(s, a, b) {
  const n = s.split(a).length - 1;
  if (n !== 1) fail('ancora encontrada ' + n + 'x: ' + a.slice(0, 70));
  return s.replace(a, () => b);
}
function between(s, from, to, b) {
  const i = s.indexOf(from);
  const j = i < 0 ? -1 : s.indexOf(to, i + from.length);
  if (i < 0 || j < 0) fail('marcadores nao encontrados: ' + from.slice(0, 60));
  return s.slice(0, i) + b + s.slice(j);
}

const MODAL = 'src/modules/pulse/components/widgets/CarouselModal.tsx';
const TYPES = 'src/modules/pulse/types/infoCards.ts';
const WIDGET = 'public/widgets-widget.js';
if (rd(TYPES).includes('size_mode')) { console.log('Ja aplicado.'); process.exit(0); }

const out = [];

// tipos
let t = rd(TYPES);
const iface = `export type CarouselFont = 'inherit' | 'arial' | 'verdana' | 'trebuchet' | 'georgia' | 'times' | 'courier';

export interface CarouselDesign {
  shape: 'square' | 'circle'; aspect: string; fit: 'contain' | 'cover'; img_radius: number; img_bg: string;
  size_mode: 'auto' | 'fixed'; size_d: number; size_m: number;
  border_on: boolean; border_color: string; border_w: number;
  caption_pos: 'below' | 'overlay' | 'none'; caption_color: string; caption_size: number; caption_font: CarouselFont; caption_bold: boolean;
  title_color: string; title_size: number; title_font: CarouselFont; title_bold: boolean;
  gap: number; per_desktop: number; per_mobile: number;
  arrows: boolean; arrow_color: string; autoplay: boolean; autoplay_ms: number;
  bg_on: boolean; bg_color: string; pad_x: number; pad_t: number; pad_b: number;
}

`;
t = between(t, 'export interface CarouselDesign {', 'export type BenefitItem', iface);
out.push([TYPES, t]);

// defaults e preview (arquivos completos)
out.push(['src/modules/pulse/lib/carouselDefaults.ts', rd('src/modules/pulse/lib/carouselDefaults.ts.new')]);
out.push(['src/modules/pulse/components/widgets/CarouselPreview.tsx', rd('src/modules/pulse/components/widgets/CarouselPreview.tsx.new')]);

// modal
let m = rd(MODAL);
m = rep(m, "import { DEFAULT_CAROUSEL } from '../../lib/carouselDefaults';", "import { CAROUSEL_FONTS, normalizeCarousel } from '../../lib/carouselDefaults';");
m = rep(m, "import type { CarouselDesign, CarouselItem, InfoCard } from '../../types/infoCards';", "import type { CarouselDesign, CarouselFont, CarouselItem, InfoCard } from '../../types/infoCards';");
m = between(m, 'const SHAPES', 'const VIEWS',
  "const SHAPES: { id: CarouselDesign['shape']; label: string }[] = [\n  { id: 'square', label: 'Quadrado' }, { id: 'circle', label: 'Circular' },\n];\n");
m = rep(m, 'interface Props { ctx: WidgetsCtx;', rd('scripts/carousel-textgroup.part.txt') + 'interface Props { ctx: WidgetsCtx;');
m = rep(m, "useState<CarouselDesign>({ ...DEFAULT_CAROUSEL, ...(initial?.design as Partial<CarouselDesign> | undefined) });",
  'useState<CarouselDesign>(() => normalizeCarousel(initial?.design));');
const a = m.indexOf('2. Formato da imagem');
const b = m.indexOf('4. Posição na loja');
if (a < 0 || b < 0) fail('secoes do modal nao encontradas');
const s0 = m.lastIndexOf('<section', a);
const s1 = m.lastIndexOf('<section', b);
if (s0 < 0 || s1 <= s0) fail('limites das secoes invalidos');
m = m.slice(0, s0) + rd('scripts/carousel-sections.part.txt').trimEnd() + '\n                ' + m.slice(s1);
m = rep(m, '4. Posição na loja', '5. Posição na loja');
out.push([MODAL, m]);

// widget da loja
let w = rd(WIDGET);
w = between(w, 'function buildCarousel(conf) {', 'function buildBenefits(conf) {', rd('scripts/carousel-widget2.part.js').trimEnd() + '\n\n');
try { new vm.Script(w); } catch (e) { fail('Sintaxe invalida no widget: ' + e.message); }
out.push([WIDGET, w]);

for (const [p, s] of out) {
  if (fs.existsSync(p)) fs.writeFileSync(p + '.bak', rd(p));
  fs.writeFileSync(p, s);
  console.log('OK: ' + p);
}
fs.unlinkSync('src/modules/pulse/lib/carouselDefaults.ts.new');
fs.unlinkSync('src/modules/pulse/components/widgets/CarouselPreview.tsx.new');
