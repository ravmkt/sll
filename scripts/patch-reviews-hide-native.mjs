import fs from 'node:fs';

const fail = (m) => { console.error('ERRO: ' + m); process.exit(1); };
const rd = (p) => { if (!fs.existsSync(p)) fail('Nao existe: ' + p); return fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n'); };
const one = (s, from, to, l) => { const n = s.split(from).length - 1; if (n !== 1) fail(l + ' (ancora encontrada ' + n + 'x)'); return s.replace(from, () => to); };
const re1 = (s, re, to, l) => { if (!re.test(s)) fail(l); return s.replace(re, () => to); };

const WJ = 'public/widgets-widget.js';
const TS = 'src/modules/pulse/types/reviews.ts';
const TX = 'src/modules/pulse/components/widgets/ReviewWidgetModal.tsx';
const out = [];

/* ===== widgets-widget.js ===== */
let w = rd(WJ);
if (w.includes('function hideNative(')) { console.log('Ja aplicado: ' + WJ); }
else {
  const FN = String.raw`  var hiddenNative = {};
  function hideNative(w, host) {
    var d = (w && w.design) || {};
    if (!d.hide_native) return;
    var sel = String(d.native_selector || '').trim() || 'section.product-reviews';
    if (hiddenNative[sel]) return;
    var nodes;
    try { nodes = document.querySelectorAll(sel); } catch (e) { return; }
    for (var i = 0; i < nodes.length; i++) { if (nodes[i].contains(host)) return; }
    hiddenNative[sel] = true;
    var st = document.createElement('style');
    st.setAttribute('data-sll-hide-native', '');
    st.textContent = sel + '{display:none!important}';
    document.head.appendChild(st);
  }

  function initReviews() {`;
  w = one(w, '  function initReviews() {', FN, 'initReviews');
  w = one(w, 'window.SLLReviews.fit(h, t, w, pl.position); }', 'window.SLLReviews.fit(h, t, w, pl.position); hideNative(w, h); }', 'onPlaced');
  try { new Function(w); } catch (e) { fail('Sintaxe invalida em widgets-widget.js: ' + e.message); }
  out.push([WJ, w]);
}

/* ===== types/reviews.ts ===== */
let t = rd(TS);
if (t.includes('hide_native')) { console.log('Ja aplicado: ' + TS); }
else {
  t = one(t, 'per_view_desktop: number; per_view_mobile: number; loop: boolean;',
    'per_view_desktop: number; per_view_mobile: number; loop: boolean;\n  hide_native: boolean; native_selector: string;', 'ReviewDesign');
  t = one(t, 'per_view_desktop: 3, per_view_mobile: 1, loop: true,',
    "per_view_desktop: 3, per_view_mobile: 1, loop: true,\n  hide_native: false, native_selector: '',", 'DEFAULT_DESIGN');
  out.push([TS, t]);
}

/* ===== ReviewWidgetModal.tsx ===== */
let x = rd(TX);
if (x.includes('hide_native')) { console.log('Ja aplicado: ' + TX); }
else {
  const UI = String.raw`
                    {scope === 'product' && (
                      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                          <input type="checkbox" checked={design.hide_native} onChange={(e) => setD('hide_native', e.target.checked)} /> Ocultar avaliações nativas da loja
                        </label>
                        <p className="text-xs text-slate-500">
                          Esconde o bloco de avaliações da plataforma só quando o review do SLL aparecer na página. Atenção: o botão "Avaliar produto" do bloco nativo também some.
                        </p>
                        {design.hide_native && (
                          <label className="block"><span className={lbl}>Seletor do bloco nativo</span>
                            <input className={inp + ' font-mono'} value={design.native_selector} placeholder="section.product-reviews (padrão Yampi)"
                              onChange={(e) => setD('native_selector', e.target.value)} /></label>
                        )}
                      </div>
                    )}`;
  x = re1(x, /(\s*)<div className="grid grid-cols-2 gap-2">\s*\{TOGGLES\.map/,
    UI + '\n                    <div className="grid grid-cols-2 gap-2">\n                      {TOGGLES.map', 'bloco TOGGLES');
  out.push([TX, x]);
}

for (const [p, s] of out) { fs.writeFileSync(p + '.bak', fs.readFileSync(p)); fs.writeFileSync(p, s); console.log('OK: ' + p); }
