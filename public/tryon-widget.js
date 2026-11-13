(function () {
  'use strict';
  if (window.__sllTryonLoaded) return;
  window.__sllTryonLoaded = true;

  var script = document.currentScript;
  var ds = (script && script.dataset) || {};
  var cfg = Object.assign({
    storeId: ds.storeId || '',
    appUrl: ds.appUrl || '',
    buttonText: ds.buttonText || 'Provador Virtual',
    imageIndex: parseInt(ds.imageIndex || '0', 10),
    anchorSelector: ds.anchorSelector || '',
    popup: 'width=980,height=760,menubar=no,toolbar=no,location=yes,status=no,resizable=yes,scrollbars=yes',
    hideKeywords: ['acessorio', 'acessorios', 'accessory', 'accessories', 'bolsa', 'mochila', 'necessaire',
      'oculos', 'glasses', 'eyewear', 'armacao'],
    scarfKeywords: ['cachecol', 'lenco', 'scarf', 'echarpe'],
    debug: false
  }, window.SLL_TRYON_CONFIG || {});

  var WRAP_ID = 'sll-tryon-wrapper';
  var BTN_ID = 'sll-tryon-open-button';

  function log() {
    if (cfg.debug) console.log.apply(console, ['[SLL Try-On]'].concat([].slice.call(arguments)));
  }

  function norm(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  }

  /* ---------- Dados estruturados ---------- */
  function readJsonLd() {
    var out = [];
    document.querySelectorAll('script[type="application/ld+json"]').forEach(function (el) {
      try {
        var data = JSON.parse(el.textContent);
        (function walk(node) {
          if (!node) return;
          if (Array.isArray(node)) return node.forEach(walk);
          if (typeof node === 'object') {
            out.push(node);
            if (node['@graph']) walk(node['@graph']);
          }
        })(data);
      } catch (e) {}
    });
    return out;
  }

  function hasType(node, type) {
    var t = node['@type'];
    return Array.isArray(t) ? t.indexOf(type) !== -1 : t === type;
  }

  function meta(prop) {
    var el = document.querySelector('meta[property="' + prop + '"],meta[name="' + prop + '"]');
    return el ? el.getAttribute('content') : '';
  }

  function getProductData() {
    var nodes = readJsonLd();
    var product = nodes.filter(function (n) { return hasType(n, 'Product'); })[0] || null;
    var crumbs = nodes.filter(function (n) { return hasType(n, 'BreadcrumbList'); })[0] || null;

    var categories = [];
    if (product && product.category) categories.push(product.category);
    if (crumbs && Array.isArray(crumbs.itemListElement)) {
      crumbs.itemListElement.forEach(function (i) {
        categories.push((i.item && i.item.name) || i.name || '');
      });
    }
    if (!categories.length) {
      document.querySelectorAll('.breadcrumb a,.breadcrumbs a,[class*="breadcrumb"] a,nav[aria-label*="readcrumb"] a')
        .forEach(function (a) { categories.push(a.textContent); });
    }

    var images = [];
    if (product && product.image) {
      [].concat(product.image).forEach(function (i) {
        images.push(typeof i === 'string' ? i : (i && (i.url || i.contentUrl)) || '');
      });
    }
    var og = meta('og:image');
    if (og) images.push(og);

    var isProductPage = !!product || meta('og:type') === 'product' || !!document.getElementById('sll-tryon-anchor');

    return {
      isProductPage: isProductPage,
      name: (product && product.name) || meta('og:title') || document.title,
      categories: categories,
      images: images
    };
  }

  /* ---------- Imagens ---------- */
  function normalizeImageUrl(url) {
    if (!url) return '';
    if (url.indexOf('//') === 0) url = 'https:' + url;
    try { url = new URL(url, window.location.origin).href; } catch (e) {}
    // Remove proxies de redimensionamento (ex.: images.yampi.io/unsafe/.../https://images.yampi.me/...)
    var inner = url.match(/\/(https?:\/\/.+)$/);
    if (inner && /\/(unsafe|fit-in|filters)\//.test(url.split(inner[1])[0])) url = inner[1];
    return url;
  }

  function largestFromSrcset(srcset) {
    if (!srcset) return '';
    var list = srcset.split(',').map(function (item) {
      var p = item.trim().split(/\s+/);
      return { url: p[0], size: parseInt((p[1] || '0').replace(/[wx]/, ''), 10) || 0 };
    }).sort(function (a, b) { return b.size - a.size; });
    return list.length ? list[0].url : '';
  }

  function imageFromDom() {
    var imgs = [].slice.call(document.querySelectorAll('[class*="product-images"] img,[class*="gallery"] img,[class*="product"] img'));
    if (!imgs.length) imgs = [].slice.call(document.querySelectorAll('img'));
    var scored = imgs.map(function (img) {
      var r = img.getBoundingClientRect();
      var src = normalizeImageUrl(
        img.getAttribute('data-zoom') || img.getAttribute('data-image') || img.getAttribute('data-large') ||
        img.getAttribute('data-src') || img.getAttribute('data-lazy') ||
        largestFromSrcset(img.getAttribute('srcset') || img.getAttribute('data-srcset')) ||
        img.currentSrc || img.getAttribute('src')
      );
      var score = r.width * r.height + (img.naturalWidth || 0) * (img.naturalHeight || 0);
      if (/\/(75x75|100x100)\//.test(src)) score -= 1000000;
      if (r.width < 180 || r.height < 180) score -= 500000;
      return { src: src, score: score };
    }).filter(function (i) { return i.src && i.src.indexOf('data:image') === -1; })
      .sort(function (a, b) { return b.score - a.score; });
    return scored.length ? scored[0].src : '';
  }

  function getProductImage(data) {
    var list = data.images.map(normalizeImageUrl).filter(function (s) { return s && s.indexOf('data:image') === -1; });
    return list[cfg.imageIndex] || list[0] || imageFromDom();
  }

  /* ---------- Categoria ---------- */
  function hasKeyword(text, words) {
    return words.some(function (w) { return text.indexOf(norm(w)) !== -1; });
  }

  function categoryText(data) { return norm(data.categories.join(' ')); }
  function shouldHide(data) { return hasKeyword(categoryText(data), cfg.hideKeywords); }
  function finalCategory(data) { return hasKeyword(categoryText(data), cfg.scarfKeywords) ? 'scarf' : 'clothing'; }

  /* ---------- UI ---------- */
  function injectStyle() {
    if (document.getElementById('sll-tryon-style')) return;
    var st = document.createElement('style');
    st.id = 'sll-tryon-style';
    st.textContent =
      '#' + WRAP_ID + '{margin:18px 0;width:100%;max-width:460px}' +
      '#' + BTN_ID + '{width:100%;height:50px;background:#000;color:#fff;border:0;border-radius:0;padding:0 24px;' +
      'font:700 20px/1 inherit;font-family:inherit;cursor:pointer;display:flex;align-items:center;justify-content:center}' +
      '#' + BTN_ID + ':hover{opacity:.88}';
    document.head.appendChild(st);
  }

  function findAnchor() {
    var sels = [cfg.anchorSelector, '#sll-tryon-anchor', 'product-customizations', '.main-product-info form',
      'form[action*="cart"]', 'button[name="add"]', '[class*="buy-button"]', '[class*="add-to-cart"]']
      .filter(Boolean);
    for (var i = 0; i < sels.length; i++) {
      var el = document.querySelector(sels[i]);
      if (el) return el;
    }
    return null;
  }

  function open(data) {
    if (!cfg.appUrl) return console.error('[SLL Try-On] appUrl não configurado');
    var image = getProductImage(data);
    var params = new URLSearchParams();
    if (cfg.storeId) params.set('store_id', cfg.storeId);
    if (image) params.set('product_image', image);
    params.set('product_name', data.name || '');
    params.set('product_url', window.location.href);
    params.set('category', finalCategory(data));
    var url = cfg.appUrl + (cfg.appUrl.indexOf('?') === -1 ? '?' : '&') + params.toString();

    (window.dataLayer = window.dataLayer || []).push({
      event: 'sll_tryon_open', sll_store_id: cfg.storeId, sll_product_name: data.name, sll_category: finalCategory(data)
    });
    log('URL:', url);
    window.open(url, 'sllTryon', cfg.popup);
  }

  function mount() {
    if (document.getElementById(WRAP_ID)) return true;
    var data = getProductData();
    if (!data.isProductPage) return false;
    if (shouldHide(data)) { log('Oculto: categoria', data.categories); return true; }

    var anchor = findAnchor();
    if (!anchor) return false;

    injectStyle();
    var wrap = document.createElement('div');
    wrap.id = WRAP_ID;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = BTN_ID;
    btn.textContent = cfg.buttonText;
    btn.addEventListener('click', function () { open(getProductData()); });
    wrap.appendChild(btn);

    if (anchor.id === 'sll-tryon-anchor') anchor.appendChild(wrap);
    else anchor.parentNode.insertBefore(wrap, anchor);
    log('Botão montado');
    return true;
  }

  function init() {
    if (mount()) return;
    var obs = new MutationObserver(function () { if (mount()) obs.disconnect(); });
    obs.observe(document.body, { childList: true, subtree: true });
    setTimeout(function () { obs.disconnect(); }, 10000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
