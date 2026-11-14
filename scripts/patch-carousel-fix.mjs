import fs from 'node:fs';
import vm from 'node:vm';

const out = [];
function apply(p, steps, check) {
  let s = fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
  const orig = s;
  for (const st of steps) {
    if (s.includes(st.done)) { console.log('  ja aplicado: ' + p + ' [' + st.done + ']'); continue; }
    if (st.append) { s += st.append; continue; }
    const n = s.split(st.find).length - 1;
    if (n !== 1) { console.error(p + ' - ancora encontrada ' + n + 'x: ' + st.find.slice(0, 70)); process.exit(1); }
    s = s.replace(st.find, () => st.repl);
  }
  if (check) { try { new vm.Script(s); } catch (e) { console.error('Sintaxe invalida em ' + p + ': ' + e.message); process.exit(1); } }
  if (s !== orig) out.push([p, s, orig]);
}

apply('src/modules/pulse/types/infoCards.ts', [{
  done: 'bg_on',
  find: 'arrows: boolean; arrow_color: string; autoplay: boolean; autoplay_ms: number;',
  repl: 'arrows: boolean; arrow_color: string; autoplay: boolean; autoplay_ms: number;\n  bg_on: boolean; bg_color: string; pad: number; title_color: string;',
}]);

apply('src/modules/pulse/lib/carouselDefaults.ts', [{
  done: 'bg_on',
  find: "arrows: true, arrow_color: '#111111', autoplay: false, autoplay_ms: 4000,",
  repl: "arrows: true, arrow_color: '#111111', autoplay: false, autoplay_ms: 4000,\n  bg_on: false, bg_color: '#FFFFFF', pad: 0, title_color: '#111111',",
}]);

apply('src/modules/pulse/components/widgets/CarouselPreview.tsx', [
  { done: 'function CarouselInner',
    find: 'export default function CarouselPreview({ title, items, ds, device }: Props) {',
    repl: 'function CarouselInner({ title, items, ds, device }: Props) {' },
  { done: 'ds.title_color',
    find: "color: '#0F172A', marginBottom: 10 }}>{title}</div>}",
    repl: 'color: ds.title_color, marginBottom: 10 }}>{title}</div>}' },
  { done: 'export default function CarouselPreview(props',
    append: `
export default function CarouselPreview(props: Props) {
  const ds = props.ds;
  return (
    <div style={{ background: ds.bg_on ? ds.bg_color : 'transparent', padding: ds.pad, boxSizing: 'border-box' }}>
      <CarouselInner {...props} />
    </div>
  );
}
` },
]);

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
apply('src/modules/pulse/components/widgets/CarouselModal.tsx', [{ done: 'bg_on', find: anchor, repl: block + anchor }]);

const part = fs.readFileSync('scripts/carousel-widget.part.js', 'utf8').replace(/\r\n/g, '\n').trimEnd();
apply('public/widgets-widget.js', [
  { done: 'function buildCarousel', find: 'function buildBenefits(conf) {', repl: part + '\n\nfunction buildBenefits(conf) {' },
  { done: "c.kind === 'carousel'", find: "c.kind === 'benefits' ? buildBenefits : null",
    repl: "c.kind === 'benefits' ? buildBenefits : (c.kind === 'carousel' ? buildCarousel : null)" },
], true);

for (const [p, s, o] of out) { fs.writeFileSync(p + '.bak', o); fs.writeFileSync(p, s); console.log('OK: ' + p); }
if (out.length === 0) console.log('Nada a alterar.');
