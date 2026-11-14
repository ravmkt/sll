import fs from 'node:fs';

function patch(p, edits) {
  let s = fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
  const orig = s;
  for (const [a, b] of edits) {
    const n = s.split(a).length - 1;
    if (n !== 1) { console.error(p + ' - ancora encontrada ' + n + 'x: ' + a.slice(0, 70)); process.exit(1); }
    s = s.replace(a, () => b);
  }
  fs.writeFileSync(p + '.bak', orig);
  fs.writeFileSync(p, s);
  console.log('OK: ' + p);
}

patch('src/modules/pulse/pages/widgets/WidgetsModule.tsx', [
  ["import { BadgeCheck, PanelTop, Palette } from 'lucide-react';",
   "import { BadgeCheck, GalleryHorizontal, PanelTop, Palette } from 'lucide-react';"],
  ["import WidgetsAppearancePage from './WidgetsAppearancePage';",
   "import WidgetsCarouselPage from './WidgetsCarouselPage';\nimport WidgetsAppearancePage from './WidgetsAppearancePage';"],
  ["type Sub = 'cards' | 'benefits' | 'appearance';",
   "type Sub = 'cards' | 'benefits' | 'carousel' | 'appearance';"],
  ["{ id: 'benefits', label: 'Barra de benefícios', icon: BadgeCheck },",
   "{ id: 'benefits', label: 'Barra de benefícios', icon: BadgeCheck },\n  { id: 'carousel', label: 'Carrossel', icon: GalleryHorizontal },"],
  ["{sub === 'benefits' && <WidgetsBenefitsPage ctx={ctx} />}",
   "{sub === 'benefits' && <WidgetsBenefitsPage ctx={ctx} />}\n      {sub === 'carousel' && <WidgetsCarouselPage ctx={ctx} />}"],
]);

patch('src/modules/pulse/pages/widgets/WidgetsInfoCardsPage.tsx', [
  ["x.kind !== 'benefits'", "x.kind === 'info'"],
]);
