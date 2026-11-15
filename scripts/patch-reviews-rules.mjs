import fs from 'node:fs';
import path from 'node:path';

function patch(file, marker, edits) {
  let s = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  if (s.includes(marker)) { console.log('Ja aplicado: ' + file); return true; }
  for (const [a, b] of edits) {
    const n = s.split(a).length - 1;
    if (n !== 1) { console.error('ancora encontrada ' + n + 'x em ' + file + ': ' + a); process.exit(1); }
    s = s.replace(a, () => b);
  }
  fs.writeFileSync(file + '.bak', fs.readFileSync(file));
  fs.writeFileSync(file, s);
  console.log('OK: ' + file);
  return true;
}

// 1) Tipo Placement
patch('src/modules/pulse/components/widgets/WidgetPlacementPicker.tsx', 'PageRule', [[
  'export interface Placement { selector: string; position: Position; }',
  "export type PageRule = 'auto' | 'home' | 'all_pages' | 'url_contains' | 'url_not_contains' | 'url_not_equals';\n" +
  'export interface Placement { selector: string; position: Position; rule?: PageRule; rule_value?: string; }'
]]);

// 2) Modal
patch('src/modules/pulse/components/widgets/ReviewWidgetModal.tsx', 'PAGE_RULES', [
  ["import WidgetPlacementPicker, { type Placement } from './WidgetPlacementPicker';",
   "import WidgetPlacementPicker, { type Placement, type PageRule } from './WidgetPlacementPicker';"],
  ["const GRID_TPL = ['cards_clean', 'text_only', 'photo_wall'];",
   "const GRID_TPL = ['cards_clean', 'text_only', 'photo_wall'];\n" +
   "const PAGE_RULES: [PageRule, string][] = [\n" +
   "  ['auto', 'Automático (página do próprio produto)'], ['home', 'Somente na Home'], ['all_pages', 'Todas as páginas'],\n" +
   "  ['url_contains', 'URL contém'], ['url_not_contains', 'URL não contém'], ['url_not_equals', 'URL diferente'],\n" +
   "];\n" +
   "const RULES_WITH_VALUE: PageRule[] = ['url_contains', 'url_not_contains', 'url_not_equals'];"],
  ["if (!sources.length) { setError('Escolha ao menos uma origem de avaliações.'); return; }",
   "if (!sources.length) { setError('Escolha ao menos uma origem de avaliações.'); return; }\n" +
   "    if (RULES_WITH_VALUE.includes(placement.rule ?? 'auto') && !(placement.rule_value ?? '').trim()) { setError('Informe o texto da URL da regra.'); return; }"],
  ['<span className={lbl}>Posição na loja</span>',
   '<span className={lbl}>Posição na loja</span>\n' +
   '                  <div className="mb-3 grid grid-cols-2 gap-3">\n' +
   '                    <label><span className={lbl}>Regra da página</span>\n' +
   "                      <select className={inp} value={placement.rule ?? 'auto'}\n" +
   '                        onChange={(e) => setPlacement({ ...placement, rule: e.target.value as PageRule })}>\n' +
   '                        {PAGE_RULES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}\n' +
   '                      </select></label>\n' +
   "                    {RULES_WITH_VALUE.includes(placement.rule ?? 'auto') && (\n" +
   '                      <label><span className={lbl}>Texto da URL</span>\n' +
   "                        <input className={inp} value={placement.rule_value ?? ''} placeholder=\"confort\"\n" +
   '                          onChange={(e) => setPlacement({ ...placement, rule_value: e.target.value })} /></label>\n' +
   '                    )}\n' +
   '                  </div>']
]);

// 3) Loader(s) em public
const LOADER_FN =
"function ruleOk(pl) {\n" +
"    var r = (pl && pl.rule) || 'auto';\n" +
"    var v = String((pl && pl.rule_value) || '').trim().toLowerCase();\n" +
"    var p = location.pathname.toLowerCase();\n" +
"    if (r === 'home') return p === '/' || p === '';\n" +
"    if (r === 'url_contains') return !!v && p.indexOf(v) !== -1;\n" +
"    if (r === 'url_not_contains') return !v || p.indexOf(v) === -1;\n" +
"    if (r === 'url_not_equals') return p.replace(/^\\/+|\\/+$/g, '') !== v.replace(/^\\/+|\\/+$/g, '');\n" +
"    return true;\n" +
"  }\n" +
"  function reviewKeys(w, keys) {\n" +
"    if (w.scope !== 'product') return null;\n" +
"    var pl = w.placement || {}, r = pl.rule || 'auto', v = String(pl.rule_value || '').trim().toLowerCase();\n" +
"    if (r === 'home' || r === 'all_pages') return null;\n" +
"    if (r === 'url_contains' && v) return keys.concat([v]);\n" +
"    return keys;\n" +
"  }\n" +
"  function initReviews() {";
let done = 0;
for (const f of fs.readdirSync('public')) {
  if (!/widgets.*\.js$/i.test(f)) continue;
  const p = path.join('public', f);
  if (!fs.readFileSync(p, 'utf8').includes('function initReviews')) continue;
  patch(p, 'function ruleOk', [
    ['function initReviews() {', LOADER_FN],
    ['if (isProd && !keys.length) return;',
     'if (!ruleOk(w.placement)) return;\n            var wk = reviewKeys(w, keys);\n            if (isProd && wk && !wk.length) return;'],
    ['p_keys: isProd ? keys : null,', 'p_keys: wk,']
  ]);
  done++;
}
if (!done) { console.error('Nenhum loader com initReviews em public/'); process.exit(1); }
