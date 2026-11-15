import fs from 'node:fs';
const P = 'src/modules/pulse/pages/widgets/WidgetsModule.tsx';
let s = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
if (s.includes('WidgetsReviewsPage')) { console.log('Ja aplicado.'); process.exit(0); }
function edit(a, b) {
  const n = s.split(a).length - 1;
  if (n !== 1) { console.error('ancora encontrada ' + n + 'x: ' + a); process.exit(1); }
  s = s.replace(a, () => b);
}
edit("import { BadgeCheck, GalleryHorizontal, PanelTop, Palette } from 'lucide-react';",
     "import { BadgeCheck, GalleryHorizontal, PanelTop, Palette, Star } from 'lucide-react';");
edit("import WidgetsAppearancePage from './WidgetsAppearancePage';",
     "import WidgetsReviewsPage from './WidgetsReviewsPage';\nimport WidgetsAppearancePage from './WidgetsAppearancePage';");
edit("'carousel' | 'appearance';", "'carousel' | 'reviews' | 'appearance';");
edit("{ id: 'carousel', label: 'Carrossel', icon: GalleryHorizontal },",
     "{ id: 'carousel', label: 'Carrossel', icon: GalleryHorizontal },\n  { id: 'reviews', label: 'Reviews', icon: Star },");
edit("{sub === 'carousel' && <WidgetsCarouselPage ctx={ctx} />}",
     "{sub === 'carousel' && <WidgetsCarouselPage ctx={ctx} />}\n      {sub === 'reviews' && <WidgetsReviewsPage ctx={ctx} />}");
fs.writeFileSync(P + '.bak', fs.readFileSync(P));
fs.writeFileSync(P, s);
console.log('OK: ' + P);
