import fs from 'node:fs';

const P = 'src/modules/pulse/pages/widgets/WidgetsCarouselPage.tsx';
const D = 'src/modules/pulse/lib/carouselDefaults.ts';
let s = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
if (s.includes('async function duplicate')) { console.log('Ja aplicado.'); process.exit(0); }
if (!fs.readFileSync(D, 'utf8').includes('normalizeCarousel')) {
  console.error('normalizeCarousel nao existe em carouselDefaults.ts. Aplique antes o patch-carousel-v2.mjs.');
  process.exit(1);
}
const orig = s;

function edit(a, b) {
  const n = s.split(a).length - 1;
  if (n !== 1) { console.error('ancora encontrada ' + n + 'x: ' + a.slice(0, 80)); process.exit(1); }
  s = s.replace(a, () => b);
}

edit("import { GalleryHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';",
     "import { Copy, GalleryHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';");

edit("import { infoCardsService } from '../../services/infoCardsService';",
     "import { infoCardsService } from '../../services/infoCardsService';\nimport { normalizeCarousel } from '../../lib/carouselDefaults';");

edit('grid-cols-[2fr_1fr_1fr_2fr_100px_80px]', 'grid-cols-[2fr_1fr_1fr_2fr_100px_110px]');

edit('async function remove(c: InfoCard) {',
`async function duplicate(c: InfoCard) {
    try {
      setError('');
      await svc.save(ctx.storeId, {
        id: null, name: c.name + ' (cópia)', active: false, title: c.title, tiers: c.tiers, footer: c.footer ?? '',
        placement: c.placement, style_id: c.style_id, kind: 'carousel',
        icon_position: c.icon_position, icon_size: c.icon_size, icon_color: c.icon_color,
        icon_bg: c.icon_bg, icon_bg_color: c.icon_bg_color, design: normalizeCarousel(c.design),
      });
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Erro ao duplicar.'); }
  }
  async function remove(c: InfoCard) {`);

edit('<button type="button" title="Excluir" onClick={() => remove(c)}',
     '<button type="button" title="Duplicar" onClick={() => duplicate(c)} className="hover:text-[#0094EB]"><Copy className="h-4 w-4" /></button>\n                  <button type="button" title="Excluir" onClick={() => remove(c)}');

fs.writeFileSync(P + '.bak', orig);
fs.writeFileSync(P, s);
console.log('OK: ' + P);
