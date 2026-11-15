import fs from 'node:fs';

const fail = (m) => { console.error('ERRO: ' + m); process.exit(1); };
const rd = (p) => { if (!fs.existsSync(p)) fail('Nao existe: ' + p); return fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n'); };
const one = (s, from, to, l) => { const n = s.split(from).length - 1; if (n !== 1) fail(l + ' (ancora encontrada ' + n + 'x)'); return s.replace(from, () => to); };
const re1 = (s, re, to, l) => { if (!re.test(s)) fail(l); return s.replace(re, () => to); };

const RJ = 'public/reviews-render.js';
const WJ = 'public/widgets-widget.js';
const TS = 'src/modules/pulse/types/reviews.ts';
const TX = 'src/modules/pulse/components/widgets/ReviewWidgetModal.tsx';
const out = [];

/* ================= reviews-render.js ================= */
let r = rd(RJ);
if (r.includes('function carousel(')) { console.log('Ja aplicado: ' + RJ); }
else {
  r = one(r, 'show_media: true, show_summary: true };',
    "show_media: true, show_summary: true,\n    width_mode: '', align: 'center', padding: 16, margin_x: 0, arrows: true, dots: true, drag: true,\n    autoplay: false, interval: 5, per_view_desktop: 3, per_view_mobile: 1, loop: true };", 'DEF');
  r = one(r, 'padding:16px;border-radius:var(--rd);margin:var(--my) auto', 'padding:var(--pd);border-radius:var(--rd);margin:var(--my) auto', 'CSS .r');
  r = one(r, "'.trk .cd{flex:0 0 min(320px,85%);scroll-snap-align:start}',",
    "'.trk>*{flex:0 0 calc((100% - 12px*(var(--pv) - 1))/var(--pv));scroll-snap-align:start}',\n" +
    "    '.trk{scrollbar-width:none}.trk::-webkit-scrollbar{display:none}.trk.nd{overflow-x:hidden}.trk.gb{cursor:grab}.trk.dg{cursor:grabbing;user-select:none}.trk img{-webkit-user-drag:none}',\n" +
    "    '.cw{position:relative}.cw .nv{top:50%;margin-top:-16px;z-index:2;padding:0;line-height:1;box-shadow:0 1px 4px rgba(0,0,0,.2)}.cw .nv.p{left:4px}.cw .nv.n{right:4px}.dots i{cursor:pointer}',", 'CSS trk');
  r = one(r, ".sp{padding:0 30px}}'", ".sp{padding:0 30px}.trk>*{flex-basis:calc((100% - 12px*(var(--pvm) - 1))/var(--pvm))}}'", 'CSS media');

  r = re1(r, /T\.cards_photo = function[\s\S]*?\n  \};\n/, String.raw`T.cards_photo = function (root, list, s, D) {
    if (D.show_summary) root.appendChild(summary(D, s, false));
    if (D.carousel) { carousel(root, list, D, function (r) { return card(root, r, D); }); return; }
    var g = mk('div', 'grid');
    list.forEach(function (r) { g.appendChild(card(root, r, D)); });
    root.appendChild(g);
  };
`, 'T.cards_photo');
  r = re1(r, /T\.cards_clean = function[\s\S]*?\n  \};\n/, String.raw`T.cards_clean = function (root, list, s, D) {
    if (D.show_summary) root.appendChild(summary(D, s, false));
    if (D.carousel) { carousel(root, list, D, function (r) { return card(root, r, D); }); return; }
    var g = mk('div', 'grid');
    list.forEach(function (r) { g.appendChild(card(root, r, D)); });
    root.appendChild(g);
  };
`, 'T.cards_clean');
  r = re1(r, /T\.text_only = function[\s\S]*?\n  \};\n/, String.raw`T.text_only = function (root, list, s, D) {
    function qt(r) {
      var q = mk('div', 'qt');
      q.appendChild(mk('p', 'cbd', r.body || r.title || ''));
      q.appendChild(who(r, D));
      return q;
    }
    if (D.carousel) { carousel(root, list, D, qt); return; }
    var g = mk('div', 'grid');
    list.forEach(function (r) { g.appendChild(qt(r)); });
    root.appendChild(g);
  };
`, 'T.text_only');

  const FN = String.raw`  function carousel(root, list, D, mkItem) {
    var wrap = mk('div', 'cw'), tr = mk('div', 'trk ' + (D.drag === false ? 'nd' : 'gb'));
    list.forEach(function (r) { tr.appendChild(mkItem(r)); });
    wrap.appendChild(tr);
    var dots = mk('div', 'dots'), p = mk('button', 'nv p', '\u2039'), n = mk('button', 'nv n', '\u203a');
    p.type = 'button'; n.type = 'button';
    p.setAttribute('aria-label', 'Anterior'); n.setAttribute('aria-label', 'Pr\u00f3ximo');
    function pv() { return Math.max(1, num(window.innerWidth <= 640 ? D.per_view_mobile : D.per_view_desktop, 1)); }
    function pg() { return Math.max(1, Math.floor(pv())); }
    function stp() {
      var a = tr.children[0], b = tr.children[1];
      return a && b ? (b.getBoundingClientRect().left - a.getBoundingClientRect().left) || 1 : (tr.clientWidth || 1);
    }
    function mx() { return Math.max(0, Math.round((tr.scrollWidth - tr.clientWidth) / stp())); }
    function cur() { return Math.round(tr.scrollLeft / stp()); }
    function go(i) { tr.scrollTo({ left: Math.max(0, i) * stp(), behavior: 'smooth' }); }
    function next() { var i = cur(), m = mx(); if (i >= m) { if (D.loop !== false) go(0); } else go(Math.min(i + pg(), m)); }
    function prev() { var i = cur(); if (i <= 0) { if (D.loop !== false) go(mx()); } else go(Math.max(i - pg(), 0)); }
    function dot(k) { var d = mk('i'); d.onclick = function () { go(Math.min(k * pg(), mx())); }; return d; }
    function refresh() {
      var m = mx(), pages = Math.ceil(m / pg()) + 1, more = m > 0;
      p.style.display = n.style.display = (D.arrows !== false && more) ? '' : 'none';
      dots.style.display = (D.dots !== false && more) ? '' : 'none';
      if (dots.children.length !== pages) {
        dots.textContent = '';
        for (var k = 0; k < pages; k++) dots.appendChild(dot(k));
      }
      var a = cur() >= m ? pages - 1 : Math.min(pages - 1, Math.round(cur() / pg()));
      for (var j = 0; j < dots.children.length; j++) dots.children[j].className = j === a ? 'on' : '';
    }
    p.onclick = prev; n.onclick = next;
    tr.addEventListener('scroll', refresh, { passive: true });
    window.addEventListener('resize', refresh);
    if (window.ResizeObserver) new ResizeObserver(refresh).observe(tr);
    setTimeout(refresh, 300); setTimeout(refresh, 1500);

    if (D.drag !== false) {
      var sx = 0, sl = 0, moved = false;
      var mv = function (e) { var dx = e.clientX - sx; if (Math.abs(dx) > 4) moved = true; tr.scrollLeft = sl - dx; };
      var up = function () {
        document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up);
        tr.classList.remove('dg'); tr.style.scrollSnapType = '';
        if (moved) go(cur());
      };
      tr.addEventListener('pointerdown', function (e) {
        if (e.pointerType !== 'mouse' || e.button !== 0) return;
        moved = false; sx = e.clientX; sl = tr.scrollLeft;
        tr.style.scrollSnapType = 'none'; tr.classList.add('dg');
        document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
      });
      tr.addEventListener('click', function (e) { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
    }

    if (D.autoplay) {
      var hov = false, seen = false;
      wrap.addEventListener('mouseenter', function () { hov = true; });
      wrap.addEventListener('mouseleave', function () { hov = false; });
      wrap.addEventListener('touchstart', function () { hov = true; }, { passive: true });
      wrap.addEventListener('touchend', function () { hov = false; }, { passive: true });
      var tm = setInterval(function () {
        if (root.isConnected) seen = true; else if (seen) { clearInterval(tm); return; }
        if (root.isConnected && !hov && !document.hidden && !tr.classList.contains('dg')) next();
      }, Math.max(1, num(D.interval, 5)) * 1000);
    }
    wrap.appendChild(p); wrap.appendChild(n);
    root.appendChild(wrap); root.appendChild(dots);
  }

  function fit(host, anchor, widget, position) {
    if (!host || !anchor || host.getAttribute('data-sll-wm') !== 'auto') return;
    if (position === 'append' || position === 'prepend') return;
    var inner = (anchor.querySelector && anchor.querySelector('.container')) || anchor;
    function apply() {
      if (!host.isConnected) { window.removeEventListener('resize', apply); return; }
      var rc = inner.getBoundingClientRect();
      if (!rc.width) return;
      var cs = window.getComputedStyle(inner);
      var w = rc.width - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
      if (w > 200) { host.style.maxWidth = Math.round(w) + 'px'; host.style.marginLeft = 'auto'; host.style.marginRight = 'auto'; }
    }
    apply();
    window.addEventListener('resize', apply);
    setTimeout(apply, 800); setTimeout(apply, 2500);
  }

  function render(widget, data) {`;
  r = one(r, '  function render(widget, data) {', FN, 'render()');

  r = one(r, "host.style.cssText = 'display:block;width:100%';", String.raw`var wm = D.width_mode || (num(D.max_width, 0) > 0 ? 'custom' : 'auto');
        host.setAttribute('data-sll-wm', wm);
        var hs = host.style;
        hs.display = 'block'; hs.width = '100%'; hs.boxSizing = 'border-box';
        if (num(D.margin_x, 0) > 0) { hs.paddingLeft = num(D.margin_x, 0) + 'px'; hs.paddingRight = num(D.margin_x, 0) + 'px'; }
        if (wm === 'custom' && num(D.max_width, 0) > 0) {
          hs.maxWidth = num(D.max_width, 0) + 'px';
          hs.marginLeft = D.align === 'left' ? '0' : 'auto';
          hs.marginRight = D.align === 'right' ? '0' : 'auto';
        }
        if (D.carousel === undefined || D.carousel === null) D.carousel = (tpl === 'cards_photo');`, 'render host');
  r = one(r, "if (num(D.max_width, 0) > 0) st.maxWidth = num(D.max_width, 0) + 'px';",
    "st.setProperty('--pd', num(D.padding, 16) + 'px');\n        st.setProperty('--pv', String(Math.max(1, Math.min(6, num(D.per_view_desktop, 3)))));\n        st.setProperty('--pvm', String(Math.max(1, Math.min(6, num(D.per_view_mobile, 1)))));", 'render vars');
  r = one(r, 'window.SLLReviews = { render: render };', 'window.SLLReviews = { render: render, fit: fit };', 'export');
  try { new Function(r); } catch (e) { fail('Sintaxe invalida em reviews-render.js: ' + e.message); }
  out.push([RJ, r]);
}

/* ================= widgets-widget.js ================= */
let w = rd(WJ);
if (w.includes('onPlaced')) { console.log('Ja aplicado: ' + WJ); }
else {
  w = re1(w, /place\(t, host, p\.position\);(\s*)return true;/, 'place(t, host, p.position);\n          if (conf.onPlaced) { try { conf.onPlaced(host, t); } catch (e) {} }\n          return true;', 'mount/place');
  w = one(w, "mount({ ruler: { placement: pl } }, function () { return host; })",
    "mount({ ruler: { placement: pl }, onPlaced: function (h, t) { if (window.SLLReviews && window.SLLReviews.fit) window.SLLReviews.fit(h, t, w, pl.position); } }, function () { return host; })", 'initReviews mount');
  w = one(w, "el.src = base + 'reviews-render.js';", "el.src = base + 'reviews-render.js' + (cs && /\\?.*$/.test(cs.src) ? cs.src.match(/\\?.*$/)[0] : '');", 'loadRenderer src');
  try { new Function(w); } catch (e) { fail('Sintaxe invalida em widgets-widget.js: ' + e.message); }
  out.push([WJ, w]);
}

/* ================= types/reviews.ts ================= */
let t = rd(TS);
if (t.includes('width_mode')) { console.log('Ja aplicado: ' + TS); }
else {
  t = one(t, 'show_source: boolean; show_verified: boolean; show_media: boolean; show_summary: boolean;',
    "show_source: boolean; show_verified: boolean; show_media: boolean; show_summary: boolean;\n  width_mode: 'auto' | 'full' | 'custom'; align: 'left' | 'center' | 'right'; padding: number; margin_x: number;\n  carousel: boolean; arrows: boolean; dots: boolean; drag: boolean; autoplay: boolean; interval: number;\n  per_view_desktop: number; per_view_mobile: number; loop: boolean;", 'ReviewDesign');
  t = re1(t, /show_media: true, show_summary: true,(\s*)\};/,
    "show_media: true, show_summary: true,\n  width_mode: 'auto', align: 'center', padding: 16, margin_x: 0,\n  carousel: true, arrows: true, dots: true, drag: true, autoplay: false, interval: 5,\n  per_view_desktop: 3, per_view_mobile: 1, loop: true,\n};", 'DEFAULT_DESIGN');
  t = one(t, '{ show_avatar: false, show_media: false, show_summary: false } }', '{ show_avatar: false, show_media: false, show_summary: false, carousel: false } }', 'tpl cards_clean');
  t = one(t, 'show_verified: false, show_summary: false } }', 'show_verified: false, show_summary: false, carousel: false } }', 'tpl text_only');
  out.push([TS, t]);
}

/* ================= ReviewWidgetModal.tsx ================= */
let x = rd(TX);
if (x.includes('CAROUSEL_TPL')) { console.log('Ja aplicado: ' + TX); }
else {
  x = one(x, "const GRID_TPL = ['cards_clean', 'text_only', 'photo_wall'];", "const GRID_TPL = ['cards_clean', 'text_only', 'photo_wall'];\nconst CAROUSEL_TPL = ['cards_photo', 'cards_clean', 'text_only'];", 'GRID_TPL');
  x = re1(x, /\s*<label><span className=\{lbl\}>Largura m\S+x\. \(0 = total\)<\/span>[\s\S]*?\/><\/label>/, '', 'label largura');
  const UI = String.raw`
                    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
                      <span className={lbl}>Largura na loja</span>
                      <div className="grid grid-cols-3 gap-2">
                        {([['auto', 'Automática'], ['full', 'Tela toda'], ['custom', 'Personalizada']] as [ReviewDesign['width_mode'], string][]).map(([v, l]) => (
                          <button key={v} type="button" onClick={() => setD('width_mode', v)}
                            className={'rounded-lg border px-2 py-2 text-xs font-semibold ' + (design.width_mode === v ? 'border-[#0094EB] bg-sky-50 text-[#0094EB]' : 'border-slate-200 text-slate-600')}>{l}</button>
                        ))}
                      </div>
                      <p className="text-xs text-slate-500">
                        {design.width_mode === 'auto' && 'Segue a largura do bloco da loja onde o review é inserido (alinhado ao tema).'}
                        {design.width_mode === 'full' && 'Ocupa a largura inteira da tela.'}
                        {design.width_mode === 'custom' && 'Você define a largura máxima e o alinhamento.'}
                      </p>
                      {design.width_mode === 'custom' && (
                        <div className="grid grid-cols-2 gap-3">
                          <label><span className={lbl}>Largura máx. (px)</span>
                            <input type="number" min={200} className={inp} value={design.max_width || ''} placeholder="1100"
                              onChange={(e) => setD('max_width', Number(e.target.value) || 0)} /></label>
                          <label><span className={lbl}>Alinhamento</span>
                            <select className={inp} value={design.align} onChange={(e) => setD('align', e.target.value as ReviewDesign['align'])}>
                              <option value="left">Esquerda</option><option value="center">Centro</option><option value="right">Direita</option>
                            </select></label>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <label><span className={lbl}>Espaço interno: {design.padding}px</span>
                          <input type="range" min={0} max={48} value={design.padding} onChange={(e) => setD('padding', Number(e.target.value))} className="w-full" /></label>
                        <label><span className={lbl}>Margem lateral: {design.margin_x}px</span>
                          <input type="range" min={0} max={80} value={design.margin_x} onChange={(e) => setD('margin_x', Number(e.target.value))} className="w-full" /></label>
                      </div>
                    </div>
                    {CAROUSEL_TPL.includes(template) && (
                      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                          <input type="checkbox" checked={design.carousel} onChange={(e) => setD('carousel', e.target.checked)} /> Exibir como carrossel
                        </label>
                        {design.carousel && (
                          <>
                            <div className="grid grid-cols-2 gap-2">
                              {([['arrows', 'Setas'], ['dots', 'Pontos'], ['drag', 'Arrastar (mouse e dedo)'], ['loop', 'Loop (volta ao início)'], ['autoplay', 'Passar automático']] as [keyof ReviewDesign, string][]).map(([k, l]) => (
                                <label key={k} className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                                  <input type="checkbox" checked={Boolean(design[k])} onChange={(e) => setD(k, e.target.checked as never)} /> {l}
                                </label>
                              ))}
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                              {design.autoplay && (
                                <label><span className={lbl}>Intervalo (s)</span>
                                  <input type="number" min={1} max={30} className={inp} value={design.interval} onChange={(e) => setD('interval', Math.max(1, Number(e.target.value) || 5))} /></label>
                              )}
                              <label><span className={lbl}>Itens (desktop)</span>
                                <input type="number" min={1} max={6} step={0.5} className={inp} value={design.per_view_desktop} onChange={(e) => setD('per_view_desktop', Math.max(1, Number(e.target.value) || 1))} /></label>
                              <label><span className={lbl}>Itens (mobile)</span>
                                <input type="number" min={1} max={3} step={0.1} className={inp} value={design.per_view_mobile} onChange={(e) => setD('per_view_mobile', Math.max(1, Number(e.target.value) || 1))} /></label>
                            </div>
                          </>
                        )}
                      </div>
                    )}`;
  x = re1(x, /(\s*)<div className="grid grid-cols-2 gap-2">\s*\{TOGGLES\.map/, (UI + '\n                    <div className="grid grid-cols-2 gap-2">\n                      {TOGGLES.map'), 'bloco TOGGLES');
  out.push([TX, x]);
}

for (const [p, s] of out) { fs.writeFileSync(p + '.bak', fs.readFileSync(p)); fs.writeFileSync(p, s); console.log('OK: ' + p); }
