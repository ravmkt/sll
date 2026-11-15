import fs from 'node:fs';
import path from 'node:path';

function patch(file, marker, edits) {
  let s = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  if (s.includes(marker)) { console.log('Ja aplicado: ' + file); return; }
  for (const [a, b] of edits) {
    const n = s.split(a).length - 1;
    if (n !== 1) { console.error('ancora encontrada ' + n + 'x em ' + file + ': ' + a); process.exit(1); }
    s = s.replace(a, () => b);
  }
  fs.writeFileSync(file + '.bak', fs.readFileSync(file));
  fs.writeFileSync(file, s);
  console.log('OK: ' + file);
}

// Modal: seletor opcional para produto
patch('src/modules/pulse/components/widgets/ReviewWidgetModal.tsx', 'Deixe o seletor vazio', [
  ["if (active && !placement.selector.trim()) { setError('Defina o elemento da loja antes de ativar.'); return; }",
   "if (active && scope === 'storefront' && !placement.selector.trim()) { setError('Defina o elemento da loja antes de ativar.'); return; }"],
  ['<span className={lbl}>Posição na loja</span>',
   '<span className={lbl}>Posição na loja</span>\n' +
   "                  {scope === 'product' && <p className=\"mb-2 text-xs text-slate-500\">Deixe o seletor vazio para exibir automaticamente no fim da descrição do produto.</p>}"],
  ['placeholder="#product-description"',
   "placeholder={scope === 'product' ? 'Vazio = automático (fim da descrição)' : '#banner-principal'}"]
]);

// Loader: posicionamento automatico
const AUTO =
"function autoPlacement(w) {\n" +
"    var pl = w.placement || {};\n" +
"    if (pl.selector && String(pl.selector).trim()) return pl;\n" +
"    if (w.scope !== 'product') return null;\n" +
"    var C = [\n" +
"      ['section.product-specifications > div > div.container:last-child', 'append'],\n" +
"      ['.product-description', 'after'],\n" +
"      ['[itemprop=\"description\"]', 'after'],\n" +
"      ['#product-description', 'after']\n" +
"    ];\n" +
"    for (var i = 0; i < C.length; i++) {\n" +
"      try { if (document.querySelector(C[i][0])) return { selector: C[i][0], position: C[i][1] }; } catch (e) {}\n" +
"    }\n" +
"    return { selector: C[0][0], position: C[0][1] };\n" +
"  }\n" +
"  function ruleOk(pl) {";
let done = 0;
for (const f of fs.readdirSync('public')) {
  if (!/widgets.*\.js$/i.test(f)) continue;
  const p = path.join('public', f);
  if (!fs.readFileSync(p, 'utf8').includes('function initReviews')) continue;
  patch(p, 'function autoPlacement', [
    ['function ruleOk(pl) {', AUTO],
    ['if (!w.placement || !w.placement.selector) return;', 'var pl = autoPlacement(w);\n            if (!pl) return;'],
    ['if (host) mount({ ruler: { placement: w.placement } }, function () { return host; });',
     'if (host) mount({ ruler: { placement: pl } }, function () { return host; });']
  ]);
  done++;
}
if (!done) { console.error('Nenhum loader com initReviews em public/'); process.exit(1); }
