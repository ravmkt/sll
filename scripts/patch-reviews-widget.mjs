import fs from 'node:fs';
const P = 'public/widgets-widget.js';
let s = fs.readFileSync(P, 'utf8');
if (s.includes('initReviews')) { console.log('Ja aplicado.'); process.exit(0); }
const re = /if \(document\.readyState === 'loading'\) document\.addEventListener\('DOMContentLoaded', init\); else init\(\);/;
if (!re.test(s)) { console.error('ancora nao encontrada'); process.exit(1); }
const add = `
  var rvLoader = null;
  function loadRenderer() {
    if (window.SLLReviews) return Promise.resolve();
    if (rvLoader) return rvLoader;
    var cs = document.querySelector('script[src*="widgets-widget"]');
    var base = cs ? cs.src.replace(/[^\\/]*$/, '') : '';
    rvLoader = new Promise(function (res, rej) {
      var el = document.createElement('script');
      el.src = base + 'reviews-render.js';
      el.onload = function () { res(); };
      el.onerror = function () { rvLoader = null; rej(new Error('reviews-render')); };
      document.head.appendChild(el);
    });
    return rvLoader;
  }

  function productKeys() {
    var keys = [];
    function add(v) {
      if (v === null || v === undefined) return;
      v = String(v).trim();
      if (v && v.length < 120 && keys.indexOf(v) < 0) keys.push(v);
    }
    location.pathname.split('/').forEach(function (seg) {
      if (seg.length > 1) { try { add(decodeURIComponent(seg)); } catch (e) { add(seg); } }
    });
    (window.dataLayer || []).forEach(function (e) {
      if (!e || typeof e !== 'object') return;
      var ec = e.ecommerce || {};
      var items = ec.items || (ec.detail && ec.detail.products) || ec.products || [];
      if (!Array.isArray(items)) return;
      items.forEach(function (it) { if (it) { add(it.item_id); add(it.id); add(it.sku); } });
    });
    return keys.slice(0, 12);
  }

  function initReviews() {
    if (!STORE_ID) return;
    rpc('reviews_public_config', { p_store_id: STORE_ID }).then(function (ws) {
      if (!ws || !ws.length) return;
      var keys = productKeys();
      ws.forEach(function (w) {
        var isProd = w.scope === 'product';
        if (isProd && !keys.length) return;
        if (!w.placement || !w.placement.selector) return;
        loadRenderer().then(function () {
          return rpc('reviews_public_data', {
            p_store_id: STORE_ID, p_keys: isProd ? keys : null,
            p_min_rating: w.min_rating, p_sources: w.sources, p_limit: w.max_items });
        }).then(function (d) {
          if (!d || !d.reviews || !d.reviews.length) return;
          var host = window.SLLReviews.render(w, d);
          if (host) mount({ ruler: { placement: w.placement } }, function () { return host; });
        }).catch(function () {});
      });
    }).catch(function () {});
  }

  function boot() { init(); initReviews(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();`;
fs.writeFileSync(P + '.bak', s);
fs.writeFileSync(P, s.replace(re, () => add.trimStart()));
console.log('OK: ' + P);
