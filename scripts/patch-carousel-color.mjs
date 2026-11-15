import fs from 'node:fs';
import vm from 'node:vm';

const rd = (p) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const fail = (m) => { console.error(m); process.exit(1); };
function edit(s, a, b) {
  const n = s.split(a).length - 1;
  if (n !== 1) fail('ancora encontrada ' + n + 'x: ' + a.slice(0, 80));
  return s.replace(a, () => b);
}

const TYPES = 'src/modules/pulse/types/infoCards.ts';
const MODAL = 'src/modules/pulse/components/widgets/CarouselModal.tsx';
const PREV = 'src/modules/pulse/components/widgets/CarouselPreview.tsx';
const WIDGET = 'public/widgets-widget.js';

if (rd(TYPES).includes('link?: string; color?: string')) { console.log('Ja aplicado.'); process.exit(0); }
const out = [];

let t = rd(TYPES);
t = edit(t, 'export type CarouselItem = Tier & { image: string; link?: string };',
  'export type CarouselItem = Tier & { image: string; link?: string; color?: string };');
out.push([TYPES, t]);

let m = rd(MODAL);
m = edit(m, 'const filled = items.filter((i) => i.image);', 'const filled = items.filter((i) => i.image || i.color);');
m = edit(m, 'try { setItem(i, { image: await up(files[0]) }); }', 'try { setItem(i, { image: await up(files[0]), color: undefined }); }');
m = edit(m, String.raw`{it.image ? <img src={it.image} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="h-5 w-5" />}`,
  String.raw`{it.color ? <span className="h-full w-full" style={{ background: it.color }} /> : it.image ? <img src={it.image} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="h-5 w-5" />}`);
const linkInput = String.raw`<input className={inputCls} value={it.link ?? ''} placeholder="Link ao clicar (opcional): https://..." onChange={(e) => setItem(i, { link: e.target.value })} />`;
m = edit(m, linkInput, linkInput + String.raw`
                            {it.color ? <Color label="Cor do item" value={it.color} onChange={(v) => setItem(i, { color: v })} /> : null}
                            <button type="button" onClick={() => setItem(i, { color: it.color ? undefined : '#0094EB' })}
                              className="self-start text-xs font-bold text-sky-600 hover:underline">{it.color ? 'Usar imagem' : 'Usar cor'}</button>`);
m = edit(m, String.raw`<p className="mt-2 text-xs text-slate-400">Até {MAX_ITEMS} imagens de até 15 MB. Elas são convertidas automaticamente para WebP.</p>`,
  String.raw`{items.length < MAX_ITEMS && (
                    <button type="button" onClick={() => setItems((l) => [...l, { label: '', value: '', image: '', link: '', color: '#0094EB' }])}
                      className="ml-2 mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600">
                      <span className="h-3 w-3 rounded-full bg-[#0094EB]" /> Adicionar cor
                    </button>
                  )}
                  <p className="mt-2 text-xs text-slate-400">Até {MAX_ITEMS} itens. Imagens de até 15 MB, convertidas para WebP, ou cores sólidas.</p>`);
m = edit(m, 'Adicione ao menos uma imagem antes de ativar.', 'Adicione ao menos um item (imagem ou cor) antes de ativar.');
out.push([MODAL, m]);

let p = rd(PREV);
const imgLine = String.raw`<img src={it.image} alt={it.label} draggable={false} style={{ width: '100%', height: '100%', objectFit: ds.fit, display: 'block' }} />`;
p = edit(p, imgLine, String.raw`{it.color
                  ? <div role="img" aria-label={it.label} style={{ width: '100%', height: '100%', background: it.color }} />
                  : ` + imgLine + '}');
out.push([PREV, p]);

let w = rd(WIDGET);
w = edit(w, 'return t && url(t.image, reImg); });', "return t && (url(t.image, reImg) || col(t.color, '')); });");
w = edit(w, "img.src = url(t.image, reImg); img.alt = t.label || '';",
  "var bgc = col(t.color, ''); if (bgc) { m.style.background = bgc; m.setAttribute('role', 'img'); m.setAttribute('aria-label', t.label || ''); img.style.display = 'none'; } else { img.src = url(t.image, reImg); } img.alt = t.label || '';");
try { new vm.Script(w); } catch (e) { fail('Sintaxe invalida no widget: ' + e.message); }
out.push([WIDGET, w]);

for (const [f, s] of out) { fs.writeFileSync(f + '.bak', rd(f)); fs.writeFileSync(f, s); console.log('OK: ' + f); }
