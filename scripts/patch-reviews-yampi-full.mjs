import fs from 'node:fs';
import path from 'node:path';

const YAMPI = "      ['section[class*=\"product_similars\"]', 'after'],\n";
const NEW_FN = String.raw`function sllVisible(e) { return !!(e && (e.offsetWidth || e.offsetHeight || e.getClientRects().length)); }
  function sllTag(el, pos) {
    var old = document.querySelectorAll('[data-sll-anchor]');
    for (var i = 0; i < old.length; i++) old[i].removeAttribute('data-sll-anchor');
    el.setAttribute('data-sll-anchor', '1');
    return { selector: '[data-sll-anchor="1"]', position: pos };
  }
  function sllFindAnchor(last) {
    var PRESETS = [
      ['section[class*="product_similars"]', 'after'],
      ['section.product-specifications > div > div.container:last-child', 'append'],
      ['.woocommerce-tabs', 'after']
    ];
    var i, el;
    for (i = 0; i < PRESETS.length; i++) {
      try { el = document.querySelector(PRESETS[i][0]); } catch (e) { el = null; }
      if (el && sllVisible(el)) return sllTag(el, PRESETS[i][1]);
    }
    var okEl = function (e) { return sllVisible(e) && !e.closest('header,footer,nav,[data-sll-reviews]'); };
    var SEL = '[itemprop="description"],[id*="descri" i],[class*="descri" i]';
    var total = (document.body.textContent || '').length || 1;
    var best = null, bestLen = 0, nodes = document.querySelectorAll(SEL);
    for (i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (n === document.body || n === document.documentElement || !okEl(n)) continue;
      var p = n.parentElement, nested = false;
      while (p) { if (p.matches && p.matches(SEL)) { nested = true; break; } p = p.parentElement; }
      if (nested) continue;
      var len = (n.textContent || '').trim().length;
      if (len >= 80 && len < total * 0.7 && len > bestLen) { best = n; bestLen = len; }
    }
    if (best) return sllTag(best, 'after');
    var hs = document.querySelectorAll('h2,h3,h4,h5,summary,button,[role="tab"]');
    var RX = /^(descri(\u00e7|c)(\u00e3|a)o( do produto)?|detalhes do produto|sobre o produto|description|product description)$/i;
    for (i = 0; i < hs.length; i++) {
      var h = hs[i], t = (h.textContent || '').trim();
      if (!RX.test(t) || !okEl(h)) continue;
      var det = h.closest('details');
      if (det) return sllTag(det, 'after');
      var pid = h.getAttribute('aria-controls'), panel = pid && document.getElementById(pid);
      if (panel) return sllTag(panel, 'after');
      var c = h;
      for (var k = 0; k < 4 && c.parentElement; k++) {
        c = c.parentElement;
        if ((c.textContent || '').trim().length > t.length + 80) return sllTag(c, 'after');
      }
    }
    if (last) {
      var m = document.querySelector('main');
      if (m && sllVisible(m)) return sllTag(m, 'append');
      var f = document.querySelector('footer');
      if (f) return sllTag(f, 'before');
    }
    return null;
  }
  function resolveAnchor(w, cb) {
    var pl = w.placement || {};
    if (pl.selector && String(pl.selector).trim()) { cb(pl); return; }
    if (w.scope !== 'product') return;
    var t0 = Date.now();
    (function tick() {
      var last = Date.now() - t0 > 12000;
      var r = sllFindAnchor(last);
      if (r) { cb(r); return; }
      if (!last) setTimeout(tick, 400);
    })();
  }
  function ruleOk(pl) {`;

const reAuto = /function autoPlacement\(w\) \{[\s\S]*?\n  \}\n  function ruleOk\(pl\) \{/;
const reAutoUse = /var pl = autoPlacement\(w\);\s*if \(!pl\) return;/;
const OLD_CHECK = 'if (!w.placement || !w.placement.selector) return;';
const NEW_CHECK = "if (w.scope !== 'product' && !(w.placement && String(w.placement.selector || '').trim())) return;";
const OLD_MOUNT_A = 'if (host) mount({ ruler: { placement: pl } }, function () { return host; });';
const OLD_MOUNT_B = 'if (host) mount({ ruler: { placement: w.placement } }, function () { return host; });';
const NEW_MOUNT = 'if (host) resolveAnchor(w, function (pl) { mount({ ruler: { placement: pl } }, function () { return host; }); });';

let done = 0;
for (const f of fs.readdirSync('public')) {
  if (!/widgets.*\.js$/i.test(f)) continue;
  const p = path.join('public', f);
  let s = fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
  if (!s.includes('function initReviews')) continue;

  if (s.includes('function sllFindAnchor')) {
    if (s.includes('product_similars')) { console.log('Ja aplicado: ' + p); done++; continue; }
    const A = 'var PRESETS = [\n';
    if (s.split(A).length - 1 !== 1) { console.error('Lista PRESETS nao encontrada em ' + p); process.exit(1); }
    s = s.replace(A, () => A + YAMPI);
  } else {
    if (!s.includes('function ruleOk(pl) {')) { console.error('Falta o patch de regras de pagina (ruleOk) em ' + p); process.exit(1); }
    if (reAuto.test(s)) s = s.replace(reAuto, () => NEW_FN);
    else s = s.replace('function ruleOk(pl) {', () => NEW_FN);
    if (reAutoUse.test(s)) s = s.replace(reAutoUse, () => NEW_CHECK);
    else if (s.includes(OLD_CHECK)) s = s.replace(OLD_CHECK, () => NEW_CHECK);
    else { console.error('Ancora do check de seletor nao encontrada em ' + p); process.exit(1); }
    if (s.includes(OLD_MOUNT_A)) s = s.replace(OLD_MOUNT_A, () => NEW_MOUNT);
    else if (s.includes(OLD_MOUNT_B)) s = s.replace(OLD_MOUNT_B, () => NEW_MOUNT);
    else { console.error('Ancora do mount nao encontrada em ' + p); process.exit(1); }
  }
  try { new Function(s); } catch (e) { console.error('Sintaxe invalida: ' + e.message); process.exit(1); }
  fs.writeFileSync(p + '.bak', fs.readFileSync(p));
  fs.writeFileSync(p, s);
  console.log('OK: ' + p);
  done++;
}
if (!done) { console.error('Nenhum loader com initReviews em public/'); process.exit(1); }
