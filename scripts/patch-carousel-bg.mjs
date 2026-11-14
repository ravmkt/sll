import fs from 'node:fs';
import vm from 'node:vm';

function patch(p, edits, check) {
  let s = fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
  const orig = s;
  for (const [a, b] of edits) {
    const n = s.split(a).length - 1;
    if (n !== 1) { console.error(p + ' - ancora encontrada ' + n + 'x: ' + a.slice(0, 70)); process.exit(1); }
    s = s.replace(a, () => b);
  }
  if (check) { try { new vm.Script(s); } catch (e) { console.error('Sintaxe invalida: ' + e.message); process.exit(1); } }
  return [s, orig];
}
const out = [];
function save(p, r, tail) { out.push([p, r[0] + (tail || ''), r[1]]); }

save('src/modules/pulse/types/infoCards.ts', patch('src/modules/pulse/types/infoCards.ts', [
  ['arrows: boolean; arrow_color: string; autoplay: boolean; autoplay_ms: number;',
   'arrows: boolean; arrow_color: string; autoplay: boolean; autoplay_ms: number;\n  bg_on: boolean; bg_color: string; pad: number; title_color: string;'],
]));

save('src/modules/pulse/lib/carouselDefaults.ts', patch('src/modules/pulse/lib/carouselDefaults.ts', [
  ["arrows: true, arrow_color: '#111111', autoplay: false, autoplay_ms: 4000,",
   "arrows: true, arrow_color: '#111111', autoplay: false, autoplay_ms: 4000,\n  bg_on: false, bg_color: '#FFFFFF', pad: 0, title_color: '#111111',"],
]));

save('src/modules/pulse/components/widgets/CarouselPreview.tsx', patch('src/modules/pulse/components/widgets/CarouselPreview.tsx', [
  ['export default function CarouselPreview({ title, items, ds, device }: Props) {',
   'function CarouselInner({ title, items, ds, device }: Props) {'],
  ["color: '#0F172A', marginBottom: 10 }}>{title}</div>}",
   "color: ds.title_color, marginBottom: 10 }}>{title}</div>}"],
]), `
export default function CarouselPreview(props: Props) {
  const ds = props.ds;
  return (
    <div style={{ background: ds.bg_on ? ds.bg_color : 'transparent', padding: ds.pad, boxSizing: 'border-box' }}>
      <CarouselInner {...props} />
    </div>
  );
}
`);

const block = `<div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
                <label className="col-span-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input type="checkbox" checked={ds.bg_on} onChange={(e) => setD({ bg_on: e.target.checked })} /> Usar cor de fundo no carrossel
                </label>
                {ds.bg_on && <Color label="Cor de fundo" value={ds.bg_color} onChange={(v) => setD({ bg_color: v })} />}
                <label className="block"><span className={labelCls}>Espaçamento interno: {ds.pad}px</span>
                  <input type="range" min={0} max={48} value={ds.pad} onChange={(e) => setD({ pad: Number(e.target.value) })} className="w-full" /></label>
                {title.trim() && <Color label="Cor do título" value={ds.title_color} onChange={(v) => setD({ title_color: v })} />}
              </div>
              `;
const anchor = '<div className="mt-3 flex flex-wrap items-center gap-5 text-sm text-slate-700">';
save('src/modules/pulse/components/widgets/CarouselModal.tsx', patch('src/modules/pulse/components/widgets/CarouselModal.tsx', [
  [anchor, block + anchor],
]));

save('public/widgets-widget.js', patch('public/widgets-widget.js', [
  ["var arrowColor = col(d.arrow_color, '#111111');",
   "var arrowColor = col(d.arrow_color, '#111111');\n  var titleColor = col(d.title_color, '#111111');\n  var wrapCss = (d.bg_on === true ? 'background:' + col(d.bg_color, '#FFFFFF') + ';' : '') + 'padding:' + Math.max(0, Math.min(48, num(d.pad, 0))) + 'px;';"],
  ["':host{display:block}.w{position:relative;margin:12px 0;font-family:inherit}' +",
   "':host{display:block}.w{position:relative;margin:12px 0;font-family:inherit;box-sizing:border-box;' + wrapCss + '}' +"],
  ["margin-bottom:12px;color:#111}' +", "margin-bottom:12px;color:' + titleColor + '}' +"],
], true));

for (const [p, s, o] of out) { fs.writeFileSync(p + '.bak', o); fs.writeFileSync(p, s); console.log('OK: ' + p); }
