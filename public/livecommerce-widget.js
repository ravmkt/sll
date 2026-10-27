(function() {
  'use strict';

  var SUPABASE_URL = 'https://flivmllysdhaydhogmhg.supabase.co';
  var WIDGET_VERSION = '2026.10.23-1';
  window.__sll_live_widget_version = WIDGET_VERSION;
  var SUPABASE_ANON_KEY = 'sb_publishable_fYM4F5uRs_8DbYF7ozy0hA_eA_Z5XUz';

  var currentScript = document.currentScript || (function() {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  var storeId = currentScript ? (currentScript.getAttribute('data-store-id') || currentScript.getAttribute('data-store')) : null;
  if (!storeId && window.SLL_STORE_ID) {
    storeId = window.SLL_STORE_ID;
  }
  if (!storeId) {
    var urlParams = new URLSearchParams(window.location.search);
    storeId = urlParams.get('sll_store_id') || urlParams.get('store_id');
  }

  if (!storeId) {
    console.warn('[LiveCommerce] store_id não encontrado. Abortando inicialização.');
    return;
  }

  var supabaseUrl = SUPABASE_URL;
  var supabaseAnonKey = SUPABASE_ANON_KEY;
  var hasSupabase = true;
  // ===== SLL FEATURE FLAGS (compartilhado com o vidlytics-widget) =====
  window.SLL = window.SLL || {};
  if (!window.SLL.flagsReady) {
    var sllFlags = [];
    window.SLL.flags = sllFlags;
    window.SLL.hasFlag = function (key) {
      var k = String(key || '').trim().toLowerCase();
      if (!k) return false;
      if (k.indexOf(':') === -1) k = 'live_commerce:' + k;
      return sllFlags.indexOf(k) !== -1;
    };
    window.SLL.flagsReady = (function () {
      var sid = String(storeId || '').trim();
      var okUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sid);
      if (!okUuid) return Promise.resolve(sllFlags);
          var cachedFlags = readFlagsCache(sid);
          if (cachedFlags) {
            cachedFlags.forEach(function (x) { sllFlags.push(x); });
            try { window.dispatchEvent(new CustomEvent('sll:flags', { detail: sllFlags.slice() })); } catch (e) {}
            return Promise.resolve(sllFlags);
          }
      return fetch(supabaseUrl + '/rest/v1/rpc/widget_feature_flags', {
        method: 'POST',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': 'Bearer ' + supabaseAnonKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ p_store_id: sid })
      })
        .then(function (res) { return res.ok ? res.json() : []; })
        .then(function (rows) {
          if (Array.isArray(rows)) rows.forEach(function (x) { sllFlags.push(String(x).toLowerCase()); });
              if (Array.isArray(rows) && rows.length) writeFlagsCache(sid, sllFlags);
          try { window.dispatchEvent(new CustomEvent('sll:flags', { detail: sllFlags.slice() })); } catch (e) {}
          return sllFlags;
        })
        .catch(function () { return sllFlags; });
    })();
  }

  function supabaseFetch(path, options) {
    options = options || {};
    var headers = {
      'apikey': supabaseAnonKey,
      'Authorization': 'Bearer ' + supabaseAnonKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Accept-Profile': 'live_commerce',
      'Content-Profile': 'live_commerce',
      'Cache-Control': 'no-cache'
    };
    if (options.headers) {
      Object.keys(options.headers).forEach(function (key) { headers[key] = options.headers[key]; });
    }
    return fetch(supabaseUrl + '/rest/v1/' + path, {
      method: options.method || 'GET',
      headers: headers,
      body: options.body || undefined,
      cache: 'no-store'
    });
  }

var liveWidgetRoot = null;
var liveWidgetShadow = null;
var currentLiveData = null;
var liveDivulgacaoConfig = null;
var liveAoVivoConfig = null;
var livePlayerConfig = {
  primary_color: '#e11d48',
  background_color: '#000000',
  show_viewer_count: true,
  show_chat: true,
  autoplay_muted: true
};

  function sllPx(v, d) {
    if (v === undefined || v === null || v === '') return d + 'px';
    if (typeof v === 'number' || /^\d+(\.\d+)?$/.test(String(v))) return v + 'px';
    return String(v);
  }
  function fetchJson(path, options) {
    return supabaseFetch(path, options).then(function (res) {
      if (!res.ok) {
        return res.text().then(function (t) {
          console.warn('[LiveCommerce] HTTP ' + res.status + ' em ' + path, t);
          return [];
        });
      }
      if (res.status === 204) return [];
      return res.json();
    }).catch(function (err) {
      console.error('[LiveCommerce] Erro de rede em ' + path, err);
      return [];
    });
  }

  function cleanUuid(val) {
    if (!val) return null;
    var s = String(val).trim();
    if (!s || s === 'null' || s === 'undefined' || s === '""') return null;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s) ? s : null;
  }

function fetchActiveLive() {
  console.log('[VIDLYTICS DEBUG] fetchActiveLive chamado.', { hasSupabase: hasSupabase, storeId: storeId });
  if (!hasSupabase) return Promise.resolve(null);
  var cleanId = cleanUuid(storeId);
  if (!cleanId) return Promise.resolve(null);
  var nowIso = new Date().toISOString();
  var path = 'lives?select=*&store_id=eq.' + encodeURIComponent(cleanId) +
    '&status=in.(scheduled,live)&order=created_at.desc&limit=1';
    
return fetchJson(path).then(function (rows) {
  console.log('[VIDLYTICS DEBUG] path:', path, 'rows:', rows);
  if (!rows || !rows.length) return null;
    var live = rows[0];

    // Valida janela de divulgação (se configurada)
    if (live.promo_start_at && new Date(live.promo_start_at) > new Date(nowIso)) return null;
    if (live.promo_end_at && new Date(live.promo_end_at) < new Date(nowIso)) return null;

    // Valida target de página (home / contains / not_contains)
    var path_ = window.location.pathname + window.location.search;
    var targetType = live.promo_target_type || 'all';
    var targetValue = live.promo_target_value || '';
    if (targetType === 'home' && path_ !== '/' && path_ !== '') return null;
    if (targetType === 'url_contains' && targetValue && path_.indexOf(targetValue) === -1) return null;
    if (targetType === 'url_not_contains' && targetValue && path_.indexOf(targetValue) !== -1) return null;

    return live;
  }).catch(function () { return null; });
}

function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function safeUrl(u) {
  try {
    var x = new URL(String(u || ''), window.location.href);
    return (x.protocol === 'https:' || x.protocol === 'http:') ? x.href : '';
  } catch (e) { return ''; }
}
var FLAGS_TTL_MS = 300000;
function readFlagsCache(sid) {
  try {
    var raw = sessionStorage.getItem('sll_flags_' + sid);
    if (!raw) return null;
    var o = JSON.parse(raw);
    if (!o || !Array.isArray(o.f) || (Date.now() - o.t) > FLAGS_TTL_MS) return null;
    return o.f;
  } catch (e) { return null; }
}
function writeFlagsCache(sid, f) {
  try { sessionStorage.setItem('sll_flags_' + sid, JSON.stringify({ t: Date.now(), f: f.slice() })); } catch (e) {}
}
function getLiveSessionId() {
  var v = getLiveSessionIdStored();
  if (v) return v;
  if (!window.__sllLiveSidMem) {
    window.__sllLiveSidMem = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() :
      'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (ch) {
        var r = Math.random() * 16 | 0; return (ch === 'x' ? r : (r & 3 | 8)).toString(16);
      });
  }
  return window.__sllLiveSidMem;
}
function getLiveSessionIdStored() {
  var k = 'sll_live_sid';
  try {
    var v = sessionStorage.getItem(k);
    if (v) return v;
    v = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() :
      'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (ch) {
        var r = Math.random() * 16 | 0; return (ch === 'x' ? r : (r & 3 | 8)).toString(16);
      });
    sessionStorage.setItem(k, v);
    return v;
  } catch (e) { return null; }
}
function trackLiveEvent(liveId, eventType, metadata) {
  if (!hasSupabase || !liveId) return;
  supabaseFetch('live_events', {
    method: 'POST',
    headers: { 'Prefer': 'return=minimal' },
    body: JSON.stringify({
      live_id: liveId,
      event_type: eventType,
      metadata: metadata || {}
    })
  }).catch(function () {});
}

function getActiveLivePlayerConfig() {
  var isMobile = window.innerWidth < 768;
  var cfg = livePlayerConfig || {};
  if (cfg.desktop || cfg.mobile) {
    var devCfg = isMobile ? (cfg.mobile || cfg.desktop) : (cfg.desktop || cfg.mobile);
    return Object.assign({}, devCfg);
  }
  return cfg;
}

/* SLL-PROMO-CFG */
function loadPromoCfg(live) {
  function apply(sid) {
    if (!cleanUuid(sid)) return Promise.resolve();
    return fetchJson('appearance_settings?select=widget_divulgacao,widget_aovivo&store_id=eq.' + sid + '&limit=1', {}).then(function (rows) {
      var r = Array.isArray(rows) ? rows[0] : null;
      if (!r) return;
      if (r.widget_divulgacao) liveDivulgacaoConfig = r.widget_divulgacao;
      if (r.widget_aovivo) liveAoVivoConfig = r.widget_aovivo;
    });
  }
  if (cleanUuid(live.store_id)) return apply(live.store_id);
  return fetchJson('lives?select=store_id&id=eq.' + encodeURIComponent(String(live.id)) + '&limit=1', {}).then(function (rows) {
    return apply(rows && rows[0] && rows[0].store_id);
  });
}

function getActiveLiveWidgetConfig(liveStatus) {
  var isMobile = window.innerWidth < 768;
  var target = (liveStatus === 'live' && liveAoVivoConfig) ? liveAoVivoConfig : (liveDivulgacaoConfig || {});
  if (target.desktop || target.mobile) {
    var devCfg = isMobile ? (target.mobile || target.desktop) : (target.desktop || target.mobile);
    return Object.assign({}, devCfg);
  }
  return target;
}

function renderLiveWidget(live) {
  if (!live || liveWidgetRoot) return;

  var currentCfg = getActiveLiveWidgetConfig(live.status);
  if (currentCfg.enabled === false) return;

  var isLive = live.status === 'live';
  var shape = currentCfg.shape || currentCfg.format || 'portrait';
  var format = shape;
  var isCircle = shape === 'circular' || shape === 'circle';
  var width = Number(currentCfg.width) || (isCircle ? 90 : 180);
  var borderRadius = isCircle ? '999px' : (currentCfg.borderRadius !== undefined ? currentCfg.borderRadius + 'px' : '16px');
  var borderWidth = currentCfg.borderWidth !== undefined ? currentCfg.borderWidth + 'px' : '2px';
  var borderColor = currentCfg.borderColor || '#e11d48';
  var position = currentCfg.position || 'bottom-right';

  var marginBottom = currentCfg.marginBottom !== undefined ? currentCfg.marginBottom + 'px' : '20px';
  var marginTop = currentCfg.marginTop !== undefined ? currentCfg.marginTop + 'px' : '20px';
  var marginSide = currentCfg.marginSide !== undefined ? currentCfg.marginSide + 'px' : '20px';

  var posStyles = [];
  if (position.indexOf('bottom') !== -1) posStyles.push('bottom:' + marginBottom);
  if (position.indexOf('top') !== -1) posStyles.push('top:' + marginTop);
  if (position.indexOf('right') !== -1) posStyles.push('right:' + marginSide);
  if (position.indexOf('left') !== -1) posStyles.push('left:' + marginSide);

  var host = document.createElement('div');
  host.id = 'vidlytics-live-root';
  host.style.cssText = 'position:fixed;z-index:2147483000;' + posStyles.join(';') + ';';
  document.body.appendChild(host);
  liveWidgetRoot = host;
  liveWidgetShadow = host.attachShadow({ mode: 'open' });

  var mediaUrl = live.promo_media_url || live.youtube_thumbnail_url || '';
  var mediaType = live.promo_media_type || 'image';
  var ctaText = currentCfg.ctaText || live.promo_cta_text || (isLive ? 'Assistir Agora' : 'Quero Participar');
  var title = live.title || 'Live Commerce';
  var scheduledAt = live.scheduled_at ? new Date(live.scheduled_at) : null;

  var aspectCss = (shape === 'square' || shape === 'circle') ? 'aspect-ratio: 1/1;' : (shape === 'landscape' ? 'aspect-ratio: 16/9;' : 'aspect-ratio: 9/16;');

  var style = document.createElement('style');
  style.textContent =
    '.vl-live-container {' +
      'width:' + width + 'px;' +
      aspectCss +
      'border-radius:' + borderRadius + ';' +
      'border:' + borderWidth + ' solid ' + borderColor + ';' +
      'overflow:hidden; position:relative; box-shadow:0 12px 32px rgba(0,0,0,0.35);' +
      'cursor:pointer; background:#000; font-family:system-ui,-apple-system,sans-serif;' +
      'user-select:none; transition:transform .2s ease;' +
    '}' +
    '.vl-live-container:hover { transform: scale(1.03); }' +
    '.vl-live-media { width:100%; height:100%; object-fit:' + (currentCfg.objectFit || 'cover') + '; display:block; }' +
    '.vl-live-overlay-grad {' +
      'position:absolute; inset:0;' +
      /* SLL-DARKEN */ 'background:' + (function () { var on = currentCfg.darkenVideo === true; if (!on) return 'none'; var n = Number(currentCfg.darkenIntensity); var k = (isFinite(n) ? Math.min(100, Math.max(0, n)) : 100) / 100; return 'linear-gradient(to top, rgba(0,0,0,' + (0.85 * k).toFixed(2) + ') 0%, rgba(0,0,0,' + (0.2 * k).toFixed(2) + ') 50%, rgba(0,0,0,' + (0.4 * k).toFixed(2) + ') 100%)'; })() + ';' +
      'display:flex; flex-direction:column; justify-content:space-between; padding:10px; box-sizing:border-box;' +
    '}' +
    '.vl-live-top-row { display:flex; justify-content:space-between; align-items:flex-start; width:100%; }' +
    '.vl-live-badge {' +
      'background:' + (currentCfg.ctaBgColor || (isLive ? '#ef4444' : '#3b82f6')) + ';' +
      'color:#fff; font-size:10px; font-weight:800; padding:3px 8px; border-radius:999px;' +
      'display:inline-flex; align-items:center; gap:4px; text-transform:uppercase; letter-spacing:0.5px;' +
    '}' +
    '.vl-live-pulse { width:6px; height:6px; background:#fff; border-radius:50%; animation:vlP 1.2s infinite; }' +
    '@keyframes vlP { 0%,100%{opacity:1;} 50%{opacity:0.3;} }' +
    '.vl-live-close {' +
      'background:rgba(0,0,0,0.5); color:#fff; border:none; border-radius:50%;' +
      'width:22px; height:22px; display:flex; align-items:center; justify-content:center;' +
      'font-size:14px; cursor:pointer; line-height:1; transition:background .2s;' +
    '}' +
    '.vl-live-close:hover { background:rgba(0,0,0,0.8); }' +
    '.vl-live-bottom-info { display:flex; flex-direction:column; gap:6px; width:100%; }' +
    '.vl-live-title { color:#fff; font-size:11px; font-weight:700; line-height:1.2; margin:0; text-shadow:0 1px 2px rgba(0,0,0,0.8); display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }' +
    '.vl-live-countdown { background:' + (currentCfg.countdownBgColor || 'rgba(0,0,0,0.65)') + '; backdrop-filter:blur(4px); color:' + (currentCfg.countdownTextColor || '#fbbf24') + '; font-size:10px; font-weight:700; text-align:center; padding:4px 6px; border-radius:' + (currentCfg.countdownBorderRadius || '6px') + '; }' +
    '.vl-live-cta-btn {' +
      'width:100%; padding:6px 0; background:' + (currentCfg.ctaBgColor || '#22c55e') + ';' +
      'color:' + (currentCfg.ctaTextColor || '#ffffff') + ';' +
      'font-size:11px; font-weight:700; text-align:center; border:none; border-radius:' + sllPx(currentCfg.ctaBorderRadius, 6) + '; cursor:pointer;' +
      'box-shadow:0 2px 8px rgba(0,0,0,0.3); transition:filter .2s;' +
    '}' +
    '.vl-live-cta-btn:hover { filter:brightness(1.1); }' + ((typeof shape !== 'undefined' && shape === 'circle') ? '' : '.vl-live-container{overflow:visible !important;margin-bottom:34px;}.vl-live-media{border-radius:inherit;}.vl-live-close{margin-left:auto;}.vl-live-cta-btn{position:absolute;left:0;right:0;top:calc(100% + 6px);width:auto;}');

  /* SLL-MEDIA-CLIP2 */
  var sllIn = Math.max(0, (parseFloat(borderRadius) || 0) - (parseFloat(borderWidth) || 0)) + 'px';
  style.textContent += '.vl-live-media,.vl-live-overlay-grad{border-radius:' + sllIn + ' !important;clip-path:inset(0 round ' + sllIn + ') !important;}';
  liveWidgetShadow.appendChild(style);

  var card = document.createElement('div');
  card.className = 'vl-live-container';

  if (mediaUrl) {
    if (mediaType === 'video') {
      var vid = document.createElement('video');
      vid.className = 'vl-live-media';
      vid.src = mediaUrl;
      vid.muted = true;
      vid.loop = true;
      vid.autoplay = currentCfg.playVideo !== false;
      vid.playsInline = true;
      card.appendChild(vid);
    } else {
      var img = document.createElement('img');
      img.className = 'vl-live-media';
      img.src = mediaUrl;
      img.alt = title;
      card.appendChild(img);
    }
  }

  if (shape !== 'circle') {
    var overlayEl = document.createElement('div');
    overlayEl.className = 'vl-live-overlay-grad';

    var topRow = document.createElement('div');
    topRow.className = 'vl-live-top-row';

    var badge = document.createElement('div');
    badge.className = 'vl-live-badge';
    if (isLive) {
      badge.innerHTML = '<span class="vl-live-pulse"></span> AO VIVO';
    } else {
      badge.textContent = 'EM BREVE';
    }
    if (currentCfg.showBadge === true) topRow.appendChild(badge);

    if ((currentCfg.allowClose !== false && currentCfg.showCloseButton !== false)) {
      var closeBtn = document.createElement('button');
      closeBtn.className = 'vl-live-close';
      closeBtn.textContent = '×';
      closeBtn.onclick = function (e) {
        e.stopPropagation();
        host.remove();
        liveWidgetRoot = null;
      };
      topRow.appendChild(closeBtn);
    }
    overlayEl.appendChild(topRow);

    var bottomInfo = document.createElement('div');
    bottomInfo.className = 'vl-live-bottom-info';

    if (currentCfg.showPromoTitle === true) {
      var titleEl = document.createElement('p');
      titleEl.className = 'vl-live-title';
      titleEl.textContent = title;
      bottomInfo.appendChild(titleEl);
    }

    if (!isLive && scheduledAt && scheduledAt > new Date() && currentCfg.showCountdown !== false) {
      var countEl = document.createElement('div');
      countEl.className = 'vl-live-countdown';
      function updateCountdown() {
        var diff = scheduledAt.getTime() - new Date().getTime();
        if (diff <= 0) {
          countEl.textContent = 'Começando agora!';
          return;
        }
        var d = Math.floor(diff / (1000 * 60 * 60 * 24));
        var h = Math.floor((diff / (1000 * 60 * 60)) % 24);
        var m = Math.floor((diff / 1000 / 60) % 60);
        var s = Math.floor((diff / 1000) % 60);
        countEl.textContent = '⏳ ' + (d > 0 ? d + 'd ' : '') + (h < 10 ? '0' + h : h) + ':' + (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
      }
      updateCountdown();
      setInterval(updateCountdown, 1000);
      bottomInfo.appendChild(countEl);
    }

    var ctaBtn = document.createElement('button');
    ctaBtn.className = 'vl-live-cta-btn';
    ctaBtn.textContent = ctaText;
    if (currentCfg.showCTA !== false) bottomInfo.appendChild(ctaBtn);

    overlayEl.appendChild(bottomInfo);
    card.appendChild(overlayEl);
  } else {
    if ((currentCfg.allowClose !== false && currentCfg.showCloseButton !== false)) {
      var closeCircle = document.createElement('button');
      closeCircle.className = 'vl-live-close';
      closeCircle.style.cssText = 'position:absolute; top:4px; right:4px; z-index:3;';
      closeCircle.textContent = '×';
      closeCircle.onclick = function (e) {
        e.stopPropagation();
        host.remove();
        liveWidgetRoot = null;
      };
      card.appendChild(closeCircle);
    }
  }

  card.addEventListener('click', function () {
    trackLiveEvent(live.id, 'product_click', { source: 'promo_card' });
    openLiveModal(live);
  });

  liveWidgetShadow.appendChild(card);
  currentLiveData = live;
  trackLiveEvent(live.id, 'view', { source: 'promo_card' });
}

window.SLL = window.SLL || {};
window.SLL.liveAttr = window.SLL.liveAttr || (function () {
  var waCfg = null, waDone = false, waCbs = [];
  function rootDom() {
    try {
      var h = window.location.hostname || '';
      if (!h || h === 'localhost' || /^(\d{1,3}\.){3}\d{1,3}$/.test(h)) return '';
      var parts = h.split('.');
      for (var i = parts.length - 2; i >= 0; i--) {
        var c = parts.slice(i).join('.');
        document.cookie = 'vly_probe=1; path=/; domain=.' + c + '; SameSite=Lax';
        if (document.cookie.indexOf('vly_probe=1') !== -1) {
          document.cookie = 'vly_probe=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.' + c + '; SameSite=Lax';
          return '; domain=.' + c;
        }
      }
    } catch (_) {}
    return '';
  }
  function mark(live, p) {
    var exp = new Date(Date.now() + 30 * 864e5).toUTCString();
    var s = '; expires=' + exp + '; path=/' + rootDom() + '; SameSite=Lax';
    document.cookie = 'vly_live_id=' + encodeURIComponent(live.id) + s;
    document.cookie = 'vly_live_ts=' + Date.now() + s;
    if (p && p.id) document.cookie = 'vly_product_id=' + encodeURIComponent(p.id) + s;
  }
  function tag(url, live, p) {
    if (!url) return url;
    try {
      var u = new URL(url, window.location.href);
      u.searchParams.set('src', 'live_' + live.id);
      u.searchParams.set('utm_source', 'stream_sell');
      u.searchParams.set('utm_campaign', live.id);
      if (p && p.id) u.searchParams.set('utm_content', p.id);
      return u.toString();
    } catch (_) { return url; }
  }
  function loadWa(cb) {
    if (waDone) { cb(waCfg); return; }
    waCbs.push(cb);
    if (waCbs.length > 1) return;
    supabaseFetch('store_settings_public?select=whatsapp_number,whatsapp_message_template&store_id=eq.' + encodeURIComponent(storeId) + '&limit=1', { method: 'GET' })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (rows) {
        var r0 = rows && rows[0];
        var num = r0 ? String(r0.whatsapp_number || '').replace(/\D/g, '') : '';
        if (num && (num.length === 10 || num.length === 11)) num = '55' + num;
        waCfg = num ? { number: num, tpl: String(r0.whatsapp_message_template || '') } : null;
      })
      .catch(function () { waCfg = null; })
      .then(function () {
        waDone = true;
        var q = waCbs.slice();
        waCbs = [];
        q.forEach(function (f) { f(waCfg); });
      });
  }
  function waUrl(cfg, live, p) {
    var t = cfg.tpl || '';
    var msg = (t.indexOf('{{live_title}}') !== -1 || t.indexOf('{{product_name}}') !== -1)
      ? t
      : 'Olá! Estou na live {{live_title}} e tenho interesse no produto {{product_name}}.';
    msg = msg.split('{{live_title}}').join(live.title || 'da loja').split('{{product_name}}').join((p && p.name) || 'produto');
    return 'https://wa.me/' + cfg.number + '?text=' + encodeURIComponent(msg);
  }
  return { mark: mark, tag: tag, loadWa: loadWa, waUrl: waUrl };
})();

var liveOverlay = null;
var liveChatPollTimer = null;
var liveSpotlightPollTimer = null;
var liveSpotlightProductId = null;
var liveSpotlightOverlayEl = null;
var liveActiveProducts = [];
var liveChatSeenIds = {};

function closeLiveModal() {
  stopLivePolling();
  if (liveOverlay) {
    liveOverlay.classList.remove('vl-active');
    setTimeout(function () {
      if (liveOverlay && liveOverlay.parentNode) liveOverlay.parentNode.removeChild(liveOverlay);
      liveOverlay = null;
    }, 200);
  }
}

function openLiveModal(live) {
  if (!document.getElementById('vl-live-modal-styles')) {
    var style = document.createElement('style');
    style.id = 'vl-live-modal-styles';
    style.textContent =
      '.vl-live-overlay{position:fixed;inset:0;z-index:2147483001;background:rgba(0,0,0,.85);' +
        'display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .2s ease;}' +
      '.vl-live-overlay.vl-active{opacity:1;}' +
      '.vl-live-modal{width:100%;max-width:420px;max-height:92vh;background:#0f172a;border-radius:16px;' +
        'overflow:hidden;display:flex;flex-direction:column;position:relative;}' +
      '.vl-live-modal-close{position:absolute;top:8px;right:8px;background:rgba(0,0,0,.5);color:#fff;' +
        'border:none;border-radius:50%;width:30px;height:30px;font-size:16px;cursor:pointer;z-index:2;}' +
      '.vl-live-player-wrap{position:relative;width:100%;aspect-ratio:9/16;background:#000;}' +
      '.vl-live-player-wrap iframe,.vl-live-player-wrap video{width:100%;height:100%;border:0;display:block;}' +
      '.vl-live-modal-body{padding:14px 16px;overflow-y:auto;}' +
      '.vl-live-modal-title{color:#fff;font-size:15px;font-weight:700;margin:0 0 10px;}' +
      '.vl-live-products{display:grid;grid-template-columns:1fr 1fr;gap:10px;}' +
      '.vl-live-product{background:#1e293b;border-radius:10px;overflow:hidden;cursor:pointer;}' +
      '.vl-live-product img{width:100%;height:90px;object-fit:cover;display:block;}' +
      '.vl-live-product-name{color:#e2e8f0;font-size:11px;padding:6px 8px 2px;}' +
      '.vl-live-product-price{color:#22c55e;font-size:12px;font-weight:700;padding:0 8px 8px;}' +
      '.vl-live-product.vl-spotlight{outline:2px solid #22c55e;box-shadow:0 0 0 3px rgba(34,197,94,.25);}' +
      '.vl-live-chat{margin-top:14px;border-top:1px solid #1e293b;padding-top:12px;}' +
      '.vl-live-chat-title{color:#94a3b8;font-size:11px;font-weight:700;text-transform:uppercase;margin:0 0 8px;}' +
      '.vl-live-chat-messages{max-height:160px;overflow-y:auto;display:flex;flex-direction:column;gap:6px;margin-bottom:8px;}' +
      '.vl-live-chat-msg{font-size:12px;color:#e2e8f0;background:#1e293b;border-radius:8px;padding:6px 10px;max-width:85%;word-break:break-word;align-self:flex-start;}' +
      '.vl-live-chat-msg.vl-mine{background:#312e81;align-self:flex-end;text-align:right;}' +
      '.vl-live-chat-msg b{display:block;font-size:10px;color:#64748b;margin-bottom:2px;}' +
      '.vl-live-chat-form{display:flex;gap:6px;}' +
      '.vl-live-chat-input{flex:1;background:#1e293b;border:1px solid #334155;border-radius:20px;padding:8px 12px;color:#fff;font-size:12px;outline:none;}' +
      '.vl-live-chat-send{background:#22c55e;color:#0f172a;border:none;border-radius:50%;width:32px;height:32px;font-size:14px;cursor:pointer;flex-shrink:0;}' +
      '.vl-live-spotlight-overlay{position:absolute;left:10px;right:10px;bottom:10px;background:rgba(15,23,42,.92);border-radius:12px;padding:8px 10px;display:flex;align-items:center;gap:10px;z-index:5;opacity:0;transform:translateY(8px);transition:opacity .25s ease,transform .25s ease;pointer-events:none;}' +
'.vl-live-spotlight-overlay.vl-active{opacity:1;transform:translateY(0);pointer-events:auto;}' +
'.vl-live-spotlight-overlay img{width:44px;height:44px;border-radius:8px;object-fit:cover;flex-shrink:0;background:#334155;}' +
'.vl-live-spotlight-overlay-info{flex:1;min-width:0;}' +
'.vl-live-spotlight-overlay-name{color:#fff;font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
'.vl-live-spotlight-overlay-price{color:#22c55e;font-size:13px;font-weight:700;}';
    document.head.appendChild(style);
  }

  liveOverlay = document.createElement('div');
  liveOverlay.className = 'vl-live-overlay';

  var activePlayerCfg = getActiveLivePlayerConfig();
  var modal = document.createElement('div');
  modal.className = 'vl-live-modal';
  modal.style.background = activePlayerCfg.backgroundColor || activePlayerCfg.background_color || '#0f172a';
  if (activePlayerCfg.borderRadius !== undefined) {
    modal.style.borderRadius = activePlayerCfg.borderRadius + 'px';
  }
  if (activePlayerCfg.borderWidth && activePlayerCfg.borderColor) {
    modal.style.border = activePlayerCfg.borderWidth + 'px solid ' + activePlayerCfg.borderColor;
  }

  var closeBtn = document.createElement('button');
  closeBtn.className = 'vl-live-modal-close';
  closeBtn.textContent = '×';
  closeBtn.onclick = closeLiveModal;
  modal.appendChild(closeBtn);

  var playerWrap = document.createElement('div');
  playerWrap.className = 'vl-live-player-wrap';

  if (live.youtube_video_id) {
    var iframe = document.createElement('iframe');
    iframe.src = 'https://www.youtube.com/embed/' + encodeURIComponent(String(live.youtube_video_id)) + '?autoplay=1&mute=' + (function () { try { var pc = activePlayerCfg; return pc && (pc.autoplayMuted === false || pc.autoplay_muted === false) ? 0 : 1; } catch (e) { return 1; } })() /* SLL-AUTOPLAY */;
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
    iframe.allowFullscreen = true;
    playerWrap.appendChild(iframe);
  } else if (live.stream_url) {
    var vidEl = document.createElement('video');
vidEl.src = safeUrl(live.stream_url);
    vidEl.controls = true;
    vidEl.autoplay = true;
    vidEl.playsInline = true;
    vidEl.muted = activePlayerCfg.autoplayMuted !== false && activePlayerCfg.autoplay_muted !== false;
    playerWrap.appendChild(vidEl);
  }
  modal.appendChild(playerWrap);

  liveSpotlightOverlayEl = document.createElement('div');
liveSpotlightOverlayEl.className = 'vl-live-spotlight-overlay';
playerWrap.appendChild(liveSpotlightOverlayEl);


  var body = document.createElement('div');
  body.className = 'vl-live-modal-body';

  var titleEl = document.createElement('p');
  titleEl.className = 'vl-live-modal-title';
  titleEl.textContent = live.title || 'Live Commerce';
  body.appendChild(titleEl);

  var products = live.featured_products || [];
  if (products.length) {
    liveActiveProducts = products;
    var grid = document.createElement('div');
    grid.className = 'vl-live-products';
    products.forEach(function (p) {
      var card = document.createElement('div');
      card.className = 'vl-live-product' + (liveSpotlightProductId && p.id === liveSpotlightProductId ? ' vl-spotlight' : '');
      card.setAttribute('data-vl-product-id', p.id || '');

      var img = document.createElement('img');
      img.src = safeUrl(p.image_url);
      img.alt = p.name || '';
      card.appendChild(img);

      var name = document.createElement('div');
      name.className = 'vl-live-product-name';
      name.textContent = p.name || '';
      card.appendChild(name);

            var price = document.createElement('div');
      price.className = 'vl-live-product-price';
      price.style.color = livePlayerConfig.primary_color || '#22c55e';
      price.textContent = p.price || '';
      card.appendChild(price);

      var waBtn = document.createElement('button');
      waBtn.type = 'button';
      waBtn.textContent = 'Comprar pelo WhatsApp';
      waBtn.style.cssText = 'display:none;width:100%;margin-top:8px;padding:8px 10px;border:0;border-radius:10px;background:#25d366;color:#fff;font-size:12px;font-weight:700;cursor:pointer;align-items:center;justify-content:center;';
      window.SLL.liveAttr.loadWa(function (cfg) { if (cfg) waBtn.style.display = 'flex'; });
      waBtn.onclick = function (e) {
        e.stopPropagation();
        window.SLL.liveAttr.loadWa(function (cfg) {
          if (!cfg) return;
          (function(){try{var d='',h=location.hostname.split('.');for(var i=h.length-2;i>=0;i--){var c=h.slice(i).join('.');document.cookie='vly_probe=1;path=/;domain=.'+c+';SameSite=Lax';if(document.cookie.indexOf('vly_probe=1')!==-1){document.cookie='vly_probe=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.'+c+';SameSite=Lax';d=';domain=.'+c;break;}}document.cookie='vly_live_ts='+Date.now()+';expires='+new Date(Date.now()+30*864e5).toUTCString()+';path=/'+d+';SameSite=Lax';}catch(_){}})(); trackLiveEvent(live.id, 'whatsapp_click', { product_id: p.id, source: 'live_modal' });
          window.SLL.liveAttr.mark(live, p);
          window.open(window.SLL.liveAttr.waUrl(cfg, live, p), '_blank');
        });
      };
      card.appendChild(waBtn);

card.onclick = function () {
  (function(){try{var d='',h=location.hostname.split('.');for(var i=h.length-2;i>=0;i--){var c=h.slice(i).join('.');document.cookie='vly_probe=1;path=/;domain=.'+c+';SameSite=Lax';if(document.cookie.indexOf('vly_probe=1')!==-1){document.cookie='vly_probe=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.'+c+';SameSite=Lax';d=';domain=.'+c;break;}}document.cookie='vly_live_ts='+Date.now()+';expires='+new Date(Date.now()+30*864e5).toUTCString()+';path=/'+d+';SameSite=Lax';}catch(_){}})(); trackLiveEvent(live.id, 'product_click', { product_id: p.id, source: 'live_modal' });
  var go = p.url || '';
  try {
    if (window.SLL && window.SLL.liveAttr) {
      window.SLL.liveAttr.mark(live, p);
      go = window.SLL.liveAttr.tag(go, live, p);
    } else {
      document.cookie = 'vly_live_id=' + encodeURIComponent(live.id) + '; path=/; SameSite=Lax';
      if (p.id) document.cookie = 'vly_product_id=' + encodeURIComponent(p.id) + '; path=/; SameSite=Lax';
    }
  } catch (_) {}
  go = safeUrl(go); if (go) window.open(go, '_blank', 'noopener,noreferrer');
};

      grid.appendChild(card);
    });
    body.appendChild(grid);
  }

  var chatWrap = document.createElement('div');
  chatWrap.className = 'vl-live-chat';

  var chatTitle = document.createElement('p');
  chatTitle.className = 'vl-live-chat-title';
  chatTitle.textContent = 'Chat';
  chatWrap.appendChild(chatTitle);

  var chatMessages = document.createElement('div');
  chatMessages.className = 'vl-live-chat-messages';
  chatMessages.id = 'vl-live-chat-messages';
  chatWrap.appendChild(chatMessages);

  var chatForm = document.createElement('div');
  chatForm.className = 'vl-live-chat-form';

  var chatInput = document.createElement('input');
  chatInput.className = 'vl-live-chat-input';
  chatInput.type = 'text';
  chatInput.maxLength = 300;
  chatInput.placeholder = 'Digite sua mensagem...';
  chatInput.id = 'vl-live-chat-input';

  var chatSend = document.createElement('button');
  chatSend.className = 'vl-live-chat-send';
  chatSend.textContent = '\u27a4';
  chatSend.onclick = function () {
    var val = chatInput.value.trim();
    if (!val) return;
    postLiveChatMessage(live, val);
    chatInput.value = '';
  };
  chatInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') chatSend.onclick();
  });

  chatForm.appendChild(chatInput);
  chatForm.appendChild(chatSend);
  chatWrap.appendChild(chatForm);
  body.appendChild(chatWrap);

  modal.appendChild(body);
  liveOverlay.appendChild(modal);
  document.body.appendChild(liveOverlay);

  liveOverlay.addEventListener('click', function (e) {
    if (e.target === liveOverlay) closeLiveModal();
  });

  requestAnimationFrame(function () {
    liveOverlay.classList.add('vl-active');
  });

  startLivePolling(live);
}

function stopLivePolling() {
    stopLiveRealtime();
  if (liveChatPollTimer) { clearInterval(liveChatPollTimer); liveChatPollTimer = null; }
  if (liveSpotlightPollTimer) { clearInterval(liveSpotlightPollTimer); liveSpotlightPollTimer = null; }
  liveChatSeenIds = {};
  liveSpotlightProductId = null;
  liveSpotlightOverlayEl = null;
liveActiveProducts = [];

}

var liveRt = { ws: null, timer: null, hb: null, ref: 0, stopped: true, tries: 0 };

  function stopLiveRealtime() {
    liveRt.stopped = true;
    if (liveRt.hb) { clearInterval(liveRt.hb); liveRt.hb = null; }
    if (liveRt.timer) { clearTimeout(liveRt.timer); liveRt.timer = null; }
    if (liveRt.ws) { try { liveRt.ws.close(); } catch (e) {} liveRt.ws = null; }
  }

  function startLiveRealtime(live) {
    if (!live || !live.id || typeof WebSocket === 'undefined') return;
    stopLiveRealtime();
    liveRt.stopped = false;
    var topic = 'realtime:sll-live-' + live.id;
    var wsUrl = supabaseUrl.replace(/^http/, 'ws') + '/realtime/v1/websocket?apikey=' + encodeURIComponent(supabaseAnonKey) + '&vsn=1.0.0';
    var ws;
    try { ws = new WebSocket(wsUrl); } catch (e) { return; }
    liveRt.ws = ws;
    function send(event, payload, t) {
      try { ws.send(JSON.stringify({ topic: t || topic, event: event, payload: payload || {}, ref: String(++liveRt.ref) })); } catch (e) {}
    }
    ws.onopen = function () {
      liveRt.tries = 0;
      send('phx_join', {
        config: {
          broadcast: { self: false },
          presence: { key: '' },
          postgres_changes: [
            { event: '*', schema: 'live_commerce', table: 'live_events', filter: 'live_id=eq.' + live.id },
            { event: 'UPDATE', schema: 'live_commerce', table: 'lives', filter: 'id=eq.' + live.id },
            { event: 'INSERT', schema: 'live_commerce', table: 'live_chat_messages', filter: 'live_id=eq.' + live.id }
          ]
        },
        access_token: supabaseAnonKey
      });
      liveRt.hb = setInterval(function () { send('heartbeat', {}, 'phoenix'); }, 25000);
    };
    ws.onmessage = function (msg) {
      var m;
      try { m = JSON.parse(msg.data); } catch (e) { return; }
      if (m.event !== 'postgres_changes') return;
      var d = m.payload && m.payload.data;
      if (!d) return;
      if (d.table === 'live_chat_messages') fetchLiveChatMessages(live);
      else if (d.table === 'lives') fetchLiveSpotlight(live);
      else if (d.table === 'live_events') {
        var t = d.record && d.record.event_type;
        if (t === 'product.show' || t === 'product.hide') fetchLiveSpotlight(live);
      }
    };
    ws.onclose = function () {
      if (liveRt.hb) { clearInterval(liveRt.hb); liveRt.hb = null; }
      if (liveRt.stopped) return;
      liveRt.tries++;
      liveRt.timer = setTimeout(function () { if (!liveRt.stopped) startLiveRealtime(live); }, Math.min(30000, 2000 * liveRt.tries));
    };
  }

  function startLivePolling(live) {
    startLiveRealtime(live);
  if (!live || !live.id) return;

  fetchLiveChatMessages(live);
  liveChatPollTimer = setInterval(function () { fetchLiveChatMessages(live); }, 4000);

  fetchLiveSpotlight(live);
  liveSpotlightPollTimer = setInterval(function () { fetchLiveSpotlight(live); }, 4000);
}

function fetchLiveChatMessages(live) {
  if (!hasSupabase || !live || !live.id) return;
  supabaseFetch(
    'live_chat_messages?select=*&live_id=eq.' + encodeURIComponent(live.id) +
    '&order=created_at.asc&limit=100',
    { method: 'GET' }
  )
    .then(function (res) { return res.ok ? res.json() : []; })
    .then(function (rows) {
      if (!Array.isArray(rows)) return;
      var container = document.getElementById('vl-live-chat-messages');
      if (!container) return;
      rows.forEach(function (m) {
        if (liveChatSeenIds[m.id]) return;
        liveChatSeenIds[m.id] = true;
        var msgEl = document.createElement('div');
        msgEl.className = 'vl-live-chat-msg' + (m.is_from_store ? ' vl-mine' : '');
        var author = document.createElement('b');
        author.textContent = m.is_from_store ? (live.store_name || 'Loja') : (m.author_name || 'Visitante');
        msgEl.appendChild(author);
        msgEl.appendChild(document.createTextNode(m.message || ''));
        container.appendChild(msgEl);
      });
      container.scrollTop = container.scrollHeight;
    })
    .catch(function () {});
}

function postLiveChatMessage(live, text) {
  if (!hasSupabase || !live || !live.id || !text) return;
  var visitorName = 'Visitante';
  try {
    visitorName = localStorage.getItem('vl_visitor_name') || visitorName;
  } catch (e) {}
  supabaseFetch('live_chat_messages', {
    method: 'POST',
    headers: { 'Prefer': 'return=minimal' },
    body: JSON.stringify({
      live_id: live.id,
      store_id: storeId,
      session_id: getLiveSessionId(), author_name: visitorName,
      message: text,
      is_from_store: false
    })
  }).catch(function () {});
}

function fetchLiveSpotlight(live) {
  if (!hasSupabase || !live || !live.id) return;
  supabaseFetch(
    'lives?select=spotlight_product_id&id=eq.' + encodeURIComponent(live.id) + '&limit=1',
    { method: 'GET' }
  )
    .then(function (res) { return res.ok ? res.json() : []; })
    .then(function (rows) {
      if (!Array.isArray(rows) || !rows.length) return;
      var newId = rows[0].spotlight_product_id || null;
      if (newId === liveSpotlightProductId) return;
      liveSpotlightProductId = newId;

      var cards = document.querySelectorAll('.vl-live-product');
      cards.forEach(function (c) {
        var pid = c.getAttribute('data-vl-product-id');
        if (newId && pid === newId) c.classList.add('vl-spotlight');
        else c.classList.remove('vl-spotlight');
      });

      if (liveSpotlightOverlayEl) {
        if (newId) {
          var prod = liveActiveProducts.filter(function (p) { return p.id === newId; })[0];
          if (prod) {
            liveSpotlightOverlayEl.innerHTML =
              '<img src="' + esc(safeUrl(prod.image_url)) + '" alt="">' +
              '<div class="vl-live-spotlight-overlay-info">' +
                '<div class="vl-live-spotlight-overlay-name">' + esc(prod.name) + '</div>' +
                '<div class="vl-live-spotlight-overlay-price">' + esc(prod.price) + '</div>' +
              '</div>';
            liveSpotlightOverlayEl.classList.add('vl-active');
          } else {
            liveSpotlightOverlayEl.classList.remove('vl-active');
          }
        } else {
          liveSpotlightOverlayEl.classList.remove('vl-active');
        }
      }
    })
    .catch(function () {});
}


  // Inicialização automática do widget de Live
  function isLiveAppEnabled() {
    var sid = cleanUuid(storeId);
    if (!sid) return Promise.resolve(true);
    return fetch(supabaseUrl + '/rest/v1/rpc/get_module_app_enabled', {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': 'Bearer ' + supabaseAnonKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ p_store_id: sid, p_module: 'live_commerce' })
    })
      .then(function (res) { return res.ok ? res.json() : true; })
      .then(function (v) { return v !== false; })
      .catch(function () { return true; });
  }

  function initLiveWidget() {
    isLiveAppEnabled().then(function (on) {
      if (on) runLiveWidget();
      else console.log('[LiveCommerce] Aplicativo desativado para este modulo.');
    });
  }

  function runLiveWidget() {
    fetchActiveLive().then(function(live) {
      if (live) {
        console.log('[LiveCommerce] Live ativa encontrada:', live.id || live.title);
        loadPromoCfg(live).then(function () { renderLiveWidget(live); });
      } else {
        console.log('[LiveCommerce] Nenhuma live ativa encontrada no momento.');
      }
    }).catch(function(err) {
      console.error('[LiveCommerce] Erro ao carregar live ativa:', err);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLiveWidget);
  } else {
    initLiveWidget();
  }
})();

/* SLL-LIVE-ADDON */
(function () {
  if (window.__sllLiveAddon) return;
  window.__sllLiveAddon = true;
  var API = 'https://flivmllysdhaydhogmhg.supabase.co/rest/v1/';
  var KEY = 'sb_publishable_fYM4F5uRs_8DbYF7ozy0hA_eA_Z5XUz';
  var POLL_MS = 4000;
  var UUID = /^[0-9a-f-]{36}$/i;
  var st = { vid: null, box: null, ov: null, timer: null };
  var cfg = {}, cfgStore = null, cfgAt = 0;

  function device() { return window.innerWidth <= 768 ? 'mobile' : 'desktop'; }
  function C() { var o = cfg && cfg[device()]; return (o && typeof o === 'object') ? o : {}; }
  function flag(k) { return C()[k] !== false; }
  /* SLL-BLINK */
  (function () {
    if (document.getElementById('sll-blink-css')) return;
    var s = document.createElement('style'); s.id = 'sll-blink-css';
    s.textContent = '@keyframes sllBlink{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.45;transform:scale(1.06)}}.sll-blink{animation:sllBlink 1s ease-in-out infinite}';
    document.head.appendChild(s);
  })();
  /* SLL-STOCK-CFG */
  function stockTag(qty, big) {
    var q = Number(qty);
    var LV = window.__sllLive || {}; var lim = num(LV.stock_limit != null ? LV.stock_limit : C().stockLimit, 3, 1, 99);
    if (!(q > 0 && q <= lim)) return null;
    var raw = String(C().stockText || 'Restam {n}').slice(0, 40);
    var e = el('em', null, raw.replace(/\{n\}/g, String(q)));
        if (C().stockAnimate === true) e.className = 'sll-blink';
    if (C().stockStyle === 'text') {
      e.style.cssText = 'display:block;margin-top:3px;font-style:normal;font-weight:700;font-size:' + (big ? 12 : 11) + 'px;color:' + (big ? '#fca5a5' : '#dc2626');
    } else {
      e.style.cssText = 'display:inline-block;margin-top:' + (big ? 4 : 3) + 'px;background:#dc2626;color:#fff;font-style:normal;font-weight:800;font-size:' + (big ? 12 : 11) + 'px;padding:' + (big ? '2px 10px' : '1px 8px') + ';border-radius:999px';
    }
    return e;
  }
  function col(v, d) { return /^#[0-9a-f]{3,8}$/i.test(String(v || '')) ? String(v) : d; }
  function num(v, d, min, max) { var n = Number(v); return isFinite(n) ? Math.min(max, Math.max(min, n)) : d; }
  function loadCfg(storeId) {
    if (!storeId || !UUID.test(storeId)) return Promise.resolve();
    if (cfgStore === storeId && (Date.now() - cfgAt) < 60000) return Promise.resolve();
    return api('appearance_settings?select=player_settings&store_id=eq.' + storeId + '&limit=1').then(function (r) {
      cfg = (r[0] && r[0].player_settings) || {};
      cfgStore = storeId;
      cfgAt = Date.now();
    });
  }
  function applyCfg(wrap) {
    var c = C();
    var ratio = c.aspectRatio || (device() === 'mobile' ? '9:16' : '16:9');
    wrap.classList.toggle('sll-yt-portrait', ratio === '9:16');
    var bw = num(c.borderWidth, 0, 0, 8);
    var br = num(c.borderRadius, 0, 0, 40);
    wrap.style.boxSizing = 'border-box';
    wrap.style.border = bw ? (bw + 'px solid ' + col(c.borderColor, '#10b981')) : '';
    wrap.style.borderRadius = br + 'px';
    window.__sllCfg = c;
  }

  var css = document.createElement('style');
  css.textContent =
    '.sll-yt-wrap{position:relative!important;width:100%!important;height:auto!important;max-height:none!important;aspect-ratio:16/9!important;flex:none!important;padding:0!important;overflow:hidden!important;background:#000}' +
    '.sll-yt-wrap iframe{position:absolute!important;top:0!important;left:0!important;width:100%!important;height:100%!important;border:0!important}' +
    '.sll-yt-wrap.sll-yt-portrait{aspect-ratio:9/16!important;max-width:calc(85vh*9/16)!important;margin-left:auto!important;margin-right:auto!important}' +
    '.sll-ao-tt{font-weight:700;font-size:14px;margin-bottom:8px}' +
    '.sll-ao-dh{width:100%;background:#18181b;color:#fff;border:1px solid #27272a;border-radius:10px;padding:8px;font-weight:700;margin-bottom:6px;cursor:pointer}' +
    '.sll-ao-list{display:none}.sll-ao-list.open{display:block}' +
    '.sll-ao-ov{position:absolute;left:8px;right:8px;bottom:8px;z-index:5;display:flex;align-items:center;gap:10px;background:rgba(0,0,0,.82);border:1px solid #10b981;border-radius:12px;padding:8px;color:#fff;font:12px/1.3 system-ui,sans-serif}' +
    '.sll-ao-ov img{width:72px;height:72px;border-radius:10px;object-fit:cover;flex:none}' +
    '.sll-ao-ov b{display:block;font-size:14px}' +
    '.sll-ao-btn{margin-left:auto;background:#10b981;color:#fff;border-radius:8px;padding:6px 12px;font-weight:700;text-decoration:none;white-space:nowrap}' +
    '.sll-ao-box{background:#0b0b0b;color:#fff;padding:8px;font:12px/1.3 system-ui,sans-serif}' +
    '.sll-ao-cp{background:#f59e0b;color:#111;font-weight:700;border-radius:8px;padding:8px 10px;margin-bottom:8px;text-align:center}' +
    '.sll-ao-ad{background:#065f46;border:1px solid #10b981;border-radius:10px;padding:8px 10px;margin-bottom:8px;text-align:center}' +
    '.sll-ao-ad b{display:block;font-size:13px}' +
    '.sll-ao-ad span{color:inherit;opacity:.85}' +
    '.sll-ao-bn{display:block;margin-bottom:8px}' +
    '.sll-ao-bn img{width:100%;border-radius:8px;display:block}' +
    '.sll-ao-it{display:flex;align-items:center;gap:8px;padding:6px;border:1px solid #27272a;border-radius:10px;margin-bottom:6px}' +
    '.sll-ao-it.on{border-color:#10b981;background:rgba(16,185,129,.12)}' +
    '.sll-ao-it img{width:64px;height:64px;border-radius:8px;object-fit:cover;flex:none}' +
    '.sll-ao-it span{flex:1;min-width:0}' +
    '.sll-ao-it em{display:block;font-style:normal;color:#a1a1aa}';
  document.head.appendChild(css);

  function safeUrl(u) {
    try {
      var x = new URL(String(u || ''), window.location.href);
      return (x.protocol === 'https:' || x.protocol === 'http:') ? x.href : '';
    } catch (e) { return ''; }
  }
  function money(v) {
    var n = Number(v);
    return isFinite(n) ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '';
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function api(path, schema) {
    return fetch(API + path, {
      headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Accept-Profile': schema || 'live_commerce' }
    }).then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; });
  }
  function link(url, label, cls) {
    var u = safeUrl(url);
    if (!u) return null;
    var a = el('a', cls, label);
    a.href = u; a.target = '_blank'; a.rel = 'noopener noreferrer';
    return a;
  }

  function teardown() {
    if (st.timer) clearInterval(st.timer);
    if (st.box && st.box.parentNode) st.box.parentNode.removeChild(st.box);
    if (st.ov && st.ov.parentNode) st.ov.parentNode.removeChild(st.ov);
    st = { vid: null, box: null, ov: null, timer: null };
  }

  function render(live, lp, prods, coupons, banners) {
    var byId = {};
    prods.forEach(function (p) { byId[p.id] = p; });
    var onAirId = live.spotlight_product_id;
        /* SLL-BUY-LINK */
        function buy(p, fallback) {
          var u = safeUrl(p && p.purchase_url);
          if (!u) return fallback;
          var code = live.spotlight_coupon_code || (coupons.length ? coupons[0].code : '');
          return code ? u + (u.indexOf('?') < 0 ? '?' : '&') + 'promocode=' + encodeURIComponent(code) : u;
        }
    var w0 = document.querySelector('.sll-yt-wrap');
    if (w0) applyCfg(w0);
    if (st.open === undefined) st.open = device() === 'desktop';
    st.box.textContent = '';

    if (flag('showTitle') && C().titleText) {
      var tt = el('div', 'sll-ao-tt', String(C().titleText));
      tt.style.color = col(C().titleColor, '#fff');
      st.box.appendChild(tt);
    }
    if (coupons.length && flag('showCoupon')) {
      var c = coupons.filter(function (x) { return x.code === live.spotlight_coupon_code; })[0] || coupons[0];
      st.box.appendChild(el('div', 'sll-ao-cp', 'Cupom ' + c.code + (c.discount_percent ? ' - ' + c.discount_percent + '% OFF' : '')));
    }
    var advs = Array.isArray(live.advantages) ? live.advantages : [];
    var ai = live.spotlight_advantage_idx;
    if (typeof ai === 'number' && advs[ai] && flag('showInfo')) {
      var ad = el('div', 'sll-ao-ad');
      ad.style.background = col(C().infoBgColor, '#065f46');
      ad.style.color = col(C().infoTextColor, '#ffffff');
      var abt = el('b', null, String(advs[ai].title || ''));
      abt.style.fontSize = num(C().infoSize1, 13, 10, 32) + 'px';
      ad.appendChild(abt);
      var abd = el('span', null, String(advs[ai].description || ''));
      abd.style.fontSize = num(C().infoSize2, 12, 9, 24) + 'px';
      ad.appendChild(abd);
      st.box.appendChild(ad);
    }
    if (banners.length && safeUrl(banners[0].image_url)) {
      var b = banners[0];
      var holder = link(b.link_url, '', 'sll-ao-bn') || el('div', 'sll-ao-bn');
      var im = el('img'); im.src = safeUrl(b.image_url); im.alt = b.title || '';
      holder.appendChild(im);
      st.box.appendChild(holder);
    }

    var drawerList = el('div', 'sll-ao-list' + (st.open ? ' open' : ''));
    if (flag('showProducts') && lp.length) {
      var head = el('button', 'sll-ao-dh');
      head.type = 'button';
      var lbl = function () { return st.open ? 'Ocultar produtos' : 'Ver produtos (' + lp.length + ')'; };
      head.textContent = lbl();
      head.onclick = function () {
        st.open = !st.open;
        drawerList.classList.toggle('open', st.open);
        head.textContent = lbl();
      };
      st.box.appendChild(head);
      st.box.appendChild(drawerList);
    }
    var onAir = null;
    lp.forEach(function (r, idx) {
      var p = byId[r.product_id] || {};
      var isOn = (onAirId && r.product_id === onAirId) || (!onAirId && r.is_on_air);
      var price = r.price_override != null ? r.price_override : p.price;
      var row = el('div', 'sll-ao-it' + (isOn ? ' on' : ''));
      row.appendChild(el('div', 'sll-ao-num', (idx < 9 ? '0' : '') + (idx + 1)));
      if (safeUrl(p.image_url)) { var i = el('img'); i.src = safeUrl(p.image_url); i.alt = ''; row.appendChild(i); }
      var info = el('span');
      var nb = el('b', null, (r.code ? r.code + '. ' : '') + (p.name || 'Produto'));
      nb.style.fontSize = num(C().productNameSize, 13, 9, 24) + 'px';
      info.appendChild(nb);
      var pe = el('em', 'sll-ao-pe', (isOn ? 'Por: ' : '') + money(price));
      pe.style.color = col(C().productPriceColor, '#a1a1aa');
      pe.style.fontSize = num(C().productPriceSize, 12, 9, 24) + 'px';
      info.appendChild(pe);
      var skEl = stockTag(p.stock_qty, false);
      if (skEl) info.appendChild(skEl);
          row.appendChild(info);
      var btn = link(buy(p, r.checkout_url), 'Comprar', 'sll-ao-btn');
      var rt = el('div', 'sll-ao-rt');
      if (isOn) rt.appendChild(el('small', 'sll-ao-live', 'Ao vivo'));
      if (btn) rt.appendChild(btn);
      row.appendChild(rt);
      drawerList.appendChild(row);
      if (isOn) onAir = { p: p, price: price, url: buy(p, r.checkout_url) };
    });

    if (st.ov) { st.ov.parentNode && st.ov.parentNode.removeChild(st.ov); st.ov = null; }
    if (onAir) {
      var wrap = document.querySelector('.sll-yt-wrap');
      if (wrap) {
        var ov = el('div', 'sll-ao-ov');
        if (safeUrl(onAir.p.image_url)) { var oi = el('img'); oi.src = safeUrl(onAir.p.image_url); oi.alt = ''; ov.appendChild(oi); }
        var t = el('div');
        t.appendChild(el('b', null, onAir.p.name || 'Produto'));
        t.appendChild(el('span', null, money(onAir.price)));
        /* SLL-OV-STOCK */
        var osk = stockTag(onAir.p.stock_qty, true);
        if (osk) { osk.className = (C().stockAnimate === true ? 'sll-blink' : ''); osk.style.fontSize = '13px'; osk.style.position = 'absolute'; osk.style.left = '0'; osk.style.bottom = 'calc(100% + 4px)'; osk.style.margin = '0'; osk.style.width = 'fit-content'; ov.appendChild(osk); }
        ov.appendChild(t);
        var ob = link(onAir.url, 'Comprar', 'sll-ao-btn');
        if (ob) ov.appendChild(ob);
        wrap.appendChild(ov);
        ov.classList.add('sll-ov-new');
        setTimeout(function () { ov.classList.remove('sll-ov-new'); }, 600);
        st.ov = ov;
      }
    }
  }

  function refresh(vid) {
    api('lives?select=id,status,spotlight_product_id,spotlight_coupon_code,advantages,spotlight_advantage_idx,store_id,viewer_min_display,stock_limit&youtube_video_id=eq.' + encodeURIComponent(vid) + '&order=created_at.desc&limit=1')
      .then(function (rows) {
        var live = rows[0];
        if (!live || !UUID.test(live.id)) return;
        window.__sllLiveId = live.id;
        window.__sllKey = KEY; window.__sllLive = live;
        return Promise.all([
          api('live_products?select=product_id,code,display_order,is_on_air,price_override,checkout_url&live_id=eq.' + live.id + '&order=display_order.asc'),
          api('live_coupons?select=code,discount_percent&live_id=eq.' + live.id + '&is_active=eq.true'),
          api('live_banners?select=title,image_url,link_url&live_id=eq.' + live.id + '&is_active=eq.true&order=display_order.asc')
        ]).then(function (res) {
          var ids = res[0].map(function (r) { return r.product_id; }).filter(function (x) { return UUID.test(x); });
          return (ids.length ? api('products?select=id,name,price,image_url,checkout_token,purchase_url,stock_qty&id=in.(' + ids.join(',') + ')', 'public') : Promise.resolve([]))
            .then(function (pr) {
              if (st.vid !== vid || !st.box) return;
              return loadCfg(live.store_id).then(function () {
                if (st.vid !== vid || !st.box) return;
                var rsig = JSON.stringify([live, res[0], pr, res[1], res[2], cfg]);
                if (st.rsig === rsig && st.box.firstChild) return;
                st.rsig = rsig;
                render(live, res[0], pr, res[1], res[2]);
              });
            });
        });
      });
  }

  function tick() {
    var f = document.querySelector('iframe[src*="youtube.com/embed/"]');
    if (!f) { if (st.vid) teardown(); return; }
    var m = /embed\/([^?&#\/]+)/.exec(f.src);
    if (!m) return;
    var vid = m[1];
    if (f.src.indexOf('controls=0') < 0) {
      f.src = f.src + (f.src.indexOf('?') < 0 ? '?' : '&') + 'controls=0&modestbranding=1&rel=0&playsinline=1';
      return;
    }
    var wrap = f.parentElement;
    if (!wrap) return;
    wrap.classList.add('sll-yt-wrap');
    if (st.vid === vid && st.box && document.body.contains(st.box)) return;
    teardown();
    st.vid = vid;
    st.box = el('div', 'sll-ao-box');
    wrap.parentNode.insertBefore(st.box, wrap.nextSibling);
    refresh(vid);
    st.timer = setInterval(function () { refresh(vid); }, POLL_MS);
    try { console.log('[LiveCommerce] addon ativo', vid); } catch (e) {}
  }

  /* SLL-MUTE-FIX */
  function fixMute() {
    var f = document.querySelector('iframe[src*="youtube.com/embed/"]');
    if (!f || !cfgStore || f.src.indexOf('controls=0') < 0) return;
    if (f.getAttribute('data-sll-mute')) return;
    f.setAttribute('data-sll-mute', '1');
    if (C().autoplayMuted === false && f.src.indexOf('mute=1') >= 0) {
      f.src = f.src.replace(/([?&])mute=1/, '$1mute=0');
    }
  }
  setInterval(fixMute, 400);
  setInterval(tick, 1000);
})();
/* SLL-LIVE-LAYOUT */
(function () {
  if (window.__sllLiveLayout) return;
  window.__sllLiveLayout = true;
  var API = 'https://flivmllysdhaydhogmhg.supabase.co/rest/v1/';
  var SID = Math.random().toString(36).slice(2) + Date.now().toString(36);
  var count = 0, beatTimer = null, beatId = null, watched = null, mo = null;

  var css = document.createElement('style');
  css.textContent = [
    '.sll-3c-top{position:absolute;top:8px;left:8px;right:44px;z-index:6;display:flex;align-items:center;gap:6px;pointer-events:none;font:700 12px/1 system-ui,sans-serif;color:#fff}',
    '.sll-3c-t{display:none;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 1px 3px rgba(0,0,0,.7);font-size:13px}',
    '.sll-3c-pill{background:rgba(0,0,0,.55);border-radius:999px;padding:4px 8px;display:flex;align-items:center;gap:4px;font-size:11px}',
    '.sll-3c-live{background:var(--p,#ef4444)}',
    '.sll-3c-share{display:block;width:calc(100% - 16px);margin:8px;padding:10px;border:2px solid var(--p,#10b981);border-radius:10px;background:#fff;color:#000;font:700 14px system-ui,sans-serif;cursor:pointer}',
    '.sll-3c-ph{display:none}',
    '.sll-ao-cp.sll-sp{display:flex;padding:0;overflow:hidden;background:#fff;text-align:initial}',
    '.sll-cp-a,.sll-cp-b{flex:1;display:flex;align-items:center;justify-content:center;padding:10px 8px;font-weight:800}',
    '.vl-live-modal.sll-no-chat .vl-live-chat{display:none!important}',
    '.vl-live-modal.sll-no-share .sll-3c-share{display:none!important}',
    '.vl-live-modal.sll-no-views .sll-3c-views{display:none!important}',
    '@media (min-width:901px){',
    '.vl-live-modal.sll-3c{position:relative!important;--h:90vh;--pw:calc((var(--h) - 96px)*9/16);display:grid!important;grid-template-columns:minmax(0,1fr) var(--pw) minmax(0,1fr)!important;grid-template-rows:auto minmax(0,1fr) auto!important;grid-template-areas:"ph pl ch" "ls pl ch" "ad cp sh"!important;gap:10px!important;width:90vw!important;max-width:none!important;height:var(--h)!important;max-height:none!important;padding:12px!important;background:#fff!important;box-sizing:border-box!important;overflow:hidden!important}',
    '.vl-live-modal.sll-3c>.vl-live-modal-close{position:absolute!important;top:6px;right:6px;z-index:20}',
    '.vl-live-modal.sll-3c .sll-yt-wrap{grid-area:pl;aspect-ratio:auto!important;width:100%!important;max-width:none!important;height:100%!important;margin:0!important;min-height:0}',
    '.vl-live-modal.sll-3c>.sll-ao-box,.vl-live-modal.sll-3c>.vl-live-modal-body{display:contents!important}',
    '.vl-live-modal.sll-3c .vl-live-modal-title,.vl-live-modal.sll-3c .vl-live-products,.vl-live-modal.sll-3c .sll-ao-tt,.vl-live-modal.sll-3c .sll-ao-bn,.vl-live-modal.sll-3c .sll-ao-dh{display:none!important}',
    '.vl-live-modal.sll-3c .sll-3c-t{display:block}',
    '.vl-live-modal.sll-3c .sll-3c-ph{display:block;grid-area:ph;margin-bottom:-10px;padding:8px;background:var(--p);color:#fff;text-align:center;font:800 13px system-ui,sans-serif;text-transform:uppercase;border:2px solid var(--p);border-bottom:0;border-radius:10px 10px 0 0}',
    '.vl-live-modal.sll-3c .sll-ao-list{display:block!important;grid-area:ls;overflow-y:auto;min-height:0;padding:8px;background:#fff;border:2px solid var(--p);border-top:0;border-radius:0 0 10px 10px}',
    '.vl-live-modal.sll-3c .sll-ao-it{background:#fff;border:1.5px solid var(--p);color:#1e293b}',
    '.vl-live-modal.sll-3c .sll-ao-it.on{box-shadow:0 0 0 2px var(--p)}',
    '.vl-live-modal.sll-3c .sll-ao-it b{color:var(--pn,#1e293b)}',
    '.vl-live-modal.sll-3c .sll-ao-it.on b::after{content:"NA LIVE";margin-left:6px;background:var(--p);color:#fff;border-radius:4px;padding:1px 5px;font-size:9px;vertical-align:middle}',
    '.vl-live-modal.sll-3c .sll-ao-btn{background:var(--p)}',
    '.vl-live-modal.sll-3c .sll-ao-ad{grid-area:ad;margin:0;display:flex;flex-direction:column;justify-content:center;border:2px solid var(--p)}',
    '.vl-live-modal.sll-3c .sll-ao-cp{grid-area:cp;margin:0;border:2px solid var(--p);border-radius:10px}',
    '.vl-live-modal.sll-3c .sll-3c-share{grid-area:sh;margin:0;width:auto}',
    '.vl-live-modal.sll-3c .vl-live-chat{grid-area:ch;display:flex!important;flex-direction:column;min-height:0;margin:0!important;padding:0!important;border:2px solid var(--p)!important;border-radius:12px;background:#fff!important;overflow:hidden}',
    '.vl-live-modal.sll-3c .vl-live-chat-title{margin:0!important;padding:8px!important;background:var(--p);color:#fff!important;text-align:center;font-weight:800;text-transform:uppercase}',
    '.vl-live-modal.sll-3c .vl-live-chat-messages{flex:1;min-height:0;max-height:none!important;height:auto!important;overflow-y:auto;padding:8px;color:#1e293b}',
    '.vl-live-modal.sll-3c .vl-live-chat-msg{background:#f1f5f9!important;color:#1e293b!important}',
    '.vl-live-modal.sll-3c .vl-live-chat-msg b{color:var(--p)!important}',
    '.vl-live-modal.sll-3c .vl-live-chat-form{padding:8px;border-top:1px solid #e2e8f0}',
    '.vl-live-modal.sll-3c .vl-live-chat-input{background:#fff!important;color:#111!important;border:1px solid var(--p)!important}',
    '.vl-live-modal.sll-3c .vl-live-chat-send{background:var(--p)!important;color:#fff!important}',
    '}'
  ].join('');
  document.head.appendChild(css);

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function col(v, d) { return /^#[0-9a-f]{3,8}$/i.test(String(v || '')) ? String(v) : d; }
  function fmt(n) { return n >= 1000 ? (n / 1000).toFixed(1).replace('.0', '') + 'K' : String(n); }

  function shareLive() {
    var mt = document.querySelector('.vl-live-modal-title');
    var t = (mt && mt.textContent) || 'ao vivo';
    var msg = 'Estou assistindo a live "' + t + '" agora! Entra comigo e aproveite as ofertas: ' + window.location.href;
    window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank', 'noopener');
  }

  function paintCount() {
    var n = document.querySelector('.sll-3c-n');
    var s = fmt(count);
    if (n && n.textContent !== s) n.textContent = s;
  }
  function beat() {
    var id = window.__sllLiveId, key = window.__sllKey;
    if (!id || !key) return;
    fetch(API + 'rpc/live_heartbeat', {
      method: 'POST',
      headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', 'Content-Profile': 'live_commerce' },
      body: JSON.stringify({ p_live_id: id, p_session: SID })
    }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (n) { if (typeof n === 'number') { count = n; paintCount(); } })
      .catch(function () {});
  }
  function stopBeat() {
    if (beatTimer) clearInterval(beatTimer);
    beatTimer = null; beatId = null; count = 0;
  }

  function sync() {
    var modal = document.querySelector('.vl-live-modal');
    if (!modal) {
      stopBeat(); watched = null;
      if (mo) { mo.disconnect(); mo = null; }
      return;
    }
    if (watched !== modal) {
      watched = modal;
      if (mo) mo.disconnect();
      mo = new MutationObserver(sync);
      mo.observe(modal, { childList: true, subtree: true });
    }
    var c = window.__sllCfg || {};
    var wrap = modal.querySelector('.vl-live-player-wrap');

    modal.classList.toggle('sll-3c', window.innerWidth > 900 && !!modal.querySelector('.sll-ao-box'));
    modal.classList.toggle('sll-no-chat', c.showChat === false);
    modal.classList.toggle('sll-no-share', c.showShare === false);
    modal.classList.toggle('sll-no-views', c.showViewerCount === false);
    modal.style.setProperty('--p', col(c.borderColor, col(c.infoBgColor, '#0094ea'))); modal.style.setProperty('--bw', (isNaN(parseFloat(c.borderWidth)) ? 2 : Math.max(0, Math.min(8, parseFloat(c.borderWidth)))) + 'px'); modal.style.setProperty('--r', (isNaN(parseFloat(c.borderRadius)) ? 10 : Math.max(0, Math.min(40, parseFloat(c.borderRadius)))) + 'px');
    modal.style.setProperty('--pn', col(c.productNameColor, '#1e293b'));

    if (wrap && !wrap.querySelector('.sll-3c-top')) {
      var top = el('div', 'sll-3c-top');
      top.appendChild(el('span', 'sll-3c-t'));
      top.appendChild(el('span', 'sll-3c-pill sll-3c-live', 'AO VIVO'));
      var v = el('span', 'sll-3c-pill sll-3c-views');
      v.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg><span class="sll-3c-n">0</span>';
      top.appendChild(v);
      wrap.appendChild(top);
      paintCount();
    }
    var tt = modal.querySelector('.sll-3c-t');
    var mt = modal.querySelector('.vl-live-modal-title');
    if (tt && mt && tt.textContent !== mt.textContent) tt.textContent = mt.textContent;

    if (!modal.querySelector('.sll-3c-ph')) modal.appendChild(el('div', 'sll-3c-ph', 'Produtos da live'));

    var sh = modal.querySelector('.sll-3c-share');
    if (!sh) {
      sh = el('button', 'sll-3c-share', 'Compartilhar');
      sh.type = 'button';
      sh.onclick = shareLive;
      modal.appendChild(sh);
    }
    sh.style.background = col(c.shareBgColor, '#ffffff');
    sh.style.color = col(c.shareTextColor, '#000000');
      /* SLL-SHARE-TEXT */
      var shTxt = String(c.shareText == null ? '' : c.shareText).trim() || 'Compartilhar';
      if (sh.textContent !== shTxt) sh.textContent = shTxt;
      var shFs = parseFloat(c.shareFontSize);
      sh.style.fontSize = (isFinite(shFs) && shFs >= 8 && shFs <= 40 ? shFs : 14) + 'px';

    var cp = modal.querySelector('.sll-ao-cp');
    if (cp && !cp.getAttribute('data-sll')) {
      cp.setAttribute('data-sll', '1');
      var m = /^Cupom\s+(.+?)(?:\s+-\s+(.+))?$/.exec(cp.textContent || '');
      if (m) {
        cp.textContent = '';
        cp.classList.add('sll-sp');
        var a = el('span', 'sll-cp-a', m[1]);
        a.style.background = col(c.couponCodeBgColor, '#0094ea');
        a.style.color = col(c.couponCodeColor, '#ffffff');
        cp.appendChild(a);
        if (m[2]) {
          var b = el('span', 'sll-cp-b', m[2]);
          b.style.background = col(c.couponTextBgColor, '#ffffff');
          b.style.color = col(c.couponTextColor, '#000000');
          cp.appendChild(b);
        }
      }
    }

    if (window.__sllLiveId && beatId !== window.__sllLiveId) { beatId = window.__sllLiveId; beat(); }
    if (!beatTimer) beatTimer = setInterval(beat, 10000);
  }

  setInterval(sync, 700);
})();
/* SLL-LIVE-LAYOUT2 */
(function () {
  if (window.__sllLiveLayout2) return;
  window.__sllLiveLayout2 = true;

  var css = document.createElement('style');
  css.textContent = [
    '.sll-3c-logo{display:none;width:32px;height:32px;border-radius:50%;object-fit:cover;flex:none;background:var(--p,#ef4444);color:#fff;align-items:center;justify-content:center;font:800 14px system-ui,sans-serif;pointer-events:none}',
    '@media (min-width:901px){',
    '.vl-live-modal.sll-3c .sll-3c-logo{display:flex}',
    '.vl-live-modal.sll-3c .vl-live-player-wrap{position:relative!important;overflow:hidden!important;container-type:size;background:#000}',
    '.vl-live-modal.sll-3c .vl-live-player-wrap iframe{position:absolute!important;top:0!important;left:50%!important;height:100%!important;width:calc(100cqh * 16 / 9)!important;max-width:none!important;transform:translateX(-50%)!important;border:0!important}',
    '.vl-live-modal.sll-3c .vl-live-player-wrap video{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;object-fit:cover!important}',
    '.vl-live-modal.sll-3c .sll-3c-top{top:0!important;left:0!important;right:0!important;height:52px;padding:0 12px;box-sizing:border-box;background:#000;pointer-events:auto;gap:8px;z-index:8}',
    '}'
  ].join('');
  document.head.appendChild(css);

  function logoUrl() {
    var l = window.__sllLive || {}, c = window.__sllCfg || {};
    var u = l.store_logo_url || l.logo_url || l.store_logo || c.logoUrl || '';
    return /^https?:\/\//i.test(String(u)) ? String(u) : '';
  }
  function sync() {
    var top = document.querySelector('.vl-live-modal .sll-3c-top');
    if (!top || top.querySelector('.sll-3c-logo')) return;
    var l = window.__sllLive || {};
    var u = logoUrl(), node;
    if (u) {
      node = document.createElement('img');
      node.src = u;
      node.alt = '';
    } else {
      node = document.createElement('span');
      node.textContent = String(l.store_name || 'L').charAt(0).toUpperCase();
    }
    node.className = 'sll-3c-logo';
    top.insertBefore(node, top.firstChild);
  }
  setInterval(sync, 700);
})();
/* SLL-LIVE-LOGO */
(function () {
  if (window.__sllLiveLogo) return;
  window.__sllLiveLogo = true;
  var API = 'https://flivmllysdhaydhogmhg.supabase.co/rest/v1/';
  var UUID = /^[0-9a-f-]{36}$/i;
  var cache = { id: null, url: '', done: false, busy: false };

  function load(sid) {
    var key = window.__sllKey;
    if (!key) return;
    cache.busy = true;
    fetch(API + 'store_settings_public?select=logo_url,store_name&store_id=eq.' + sid + '&limit=1', {
      headers: { apikey: key, Authorization: 'Bearer ' + key, 'Accept-Profile': 'public' }
    }).then(function (r) { return r.ok ? r.json() : []; })
      .catch(function () { return []; })
      .then(function (rows) {
        if (cache.id !== sid) return;
        var u = rows[0] && rows[0].logo_url;
        cache.url = /^https?:\/\//i.test(String(u || '')) ? String(u) : '';
        cache.done = true;
        cache.busy = false;
      });
  }

  function sync() {
    var l = window.__sllLive;
    if (!l || !UUID.test(String(l.store_id || ''))) return;
    if (cache.id !== l.store_id) cache = { id: l.store_id, url: '', done: false, busy: false };
    if (!cache.done && !cache.busy) load(l.store_id);
    if (!cache.url) return;
    var node = document.querySelector('.vl-live-modal .sll-3c-logo');
    if (!node) return;
    if (node.tagName === 'IMG') {
      if (node.getAttribute('src') !== cache.url) node.src = cache.url;
      return;
    }
    var img = document.createElement('img');
    img.className = 'sll-3c-logo';
    img.alt = '';
    img.src = cache.url;
    node.parentNode.replaceChild(img, node);
  }
  setInterval(sync, 700);
})();
/* SLL-LIVE-HEADER */
(function () {
  if (window.__sllLiveHeader) return;
  window.__sllLiveHeader = true;
  var API = 'https://flivmllysdhaydhogmhg.supabase.co/rest/v1/';
  var UUID = /^[0-9a-f-]{36}$/i;
  var info = { id: null, name: '', logo: '', busy: false, done: false };
  var EYE = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';

  var css = document.createElement('style');
  css.textContent = [
    '@keyframes sllShow{to{visibility:visible}}',
    '.vl-live-modal:not(.sll-rdy){visibility:hidden;animation:sllShow 0s linear 2.2s forwards}',
    '.sll-3c-hd{display:none}',
    '.sll-hd-logo{width:48px;height:48px;border-radius:50%;object-fit:cover;flex:none;background:var(--p,#ef4444);color:#fff;display:flex;align-items:center;justify-content:center;font:800 20px system-ui,sans-serif}',
    '.sll-hd-name{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#1e293b;font:800 24px/1.2 system-ui,sans-serif}',
    '.sll-hd-r{display:flex;align-items:center;gap:10px;flex:none}',
    '@media (min-width:901px){',
    '.vl-live-modal.sll-3c{--pw:calc((var(--h) - 150px)*9/16);grid-template-rows:auto auto minmax(0,1fr) auto!important;grid-template-areas:"hd hd hd" "ph pl ch" "ls pl ch" "ad cp sh"!important}',
    '.vl-live-modal.sll-3c .sll-3c-hd{grid-area:hd;display:flex;align-items:center;gap:12px;height:56px;padding:0 44px 0 4px;box-sizing:border-box;min-width:0}',
    '.sll-3c-hd .sll-3c-pill{font-size:15px;padding:8px 14px;gap:6px}',
    '.vl-live-modal.sll-3c .sll-3c-top .sll-3c-logo,.vl-live-modal.sll-3c .sll-3c-top .sll-3c-live,.vl-live-modal.sll-3c .sll-3c-top .sll-3c-views{display:none!important}',
    '.vl-live-modal.sll-3c .sll-3c-top .sll-3c-t{display:block;text-align:center;font-size:17px}',
    '}'
  ].join('');
  document.head.appendChild(css);

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function load(sid) {
    var key = window.__sllKey;
    if (!key) return;
    info.busy = true;
    fetch(API + 'store_settings_public?select=logo_url,store_name&store_id=eq.' + sid + '&limit=1', {
      headers: { apikey: key, Authorization: 'Bearer ' + key }
    }).then(function (r) { return r.ok ? r.json() : []; })
      .catch(function () { return []; })
      .then(function (rows) {
        if (info.id !== sid) return;
        var r0 = rows[0] || {};
        info.name = String(r0.store_name || '');
        info.logo = /^https?:\/\//i.test(String(r0.logo_url || '')) ? String(r0.logo_url) : '';
        info.busy = false;
        info.done = true;
      });
  }

  function sync() {
    var modal = document.querySelector('.vl-live-modal');
    if (!modal) return;
    var l = window.__sllLive || {};
    if (UUID.test(String(l.store_id || ''))) {
      if (info.id !== l.store_id) info = { id: l.store_id, name: '', logo: '', busy: false, done: false };
      if (!info.done && !info.busy) load(l.store_id);
    }

    var hd = modal.querySelector('.sll-3c-hd');
    if (!hd) {
      hd = el('div', 'sll-3c-hd');
      hd.appendChild(el('span', 'sll-hd-logo'));
      hd.appendChild(el('span', 'sll-hd-name'));
      var r = el('div', 'sll-hd-r');
      r.appendChild(el('span', 'sll-3c-pill sll-3c-live', 'AO VIVO'));
      var v = el('span', 'sll-3c-pill sll-3c-views');
      v.innerHTML = EYE + '<span class="sll-hd-n">0</span>';
      r.appendChild(v);
      hd.appendChild(r);
      modal.appendChild(hd);
    }

    var name = info.name || String(l.store_name || '');
    var nm = hd.querySelector('.sll-hd-name');
    if (nm.textContent !== name) nm.textContent = name;

    var lg = hd.firstChild;
    if (info.logo) {
      if (lg.tagName !== 'IMG') {
        var im = document.createElement('img');
        im.className = 'sll-hd-logo';
        im.alt = '';
        im.src = info.logo;
        hd.replaceChild(im, lg);
      } else if (lg.getAttribute('src') !== info.logo) {
        lg.src = info.logo;
      }
    } else if (lg.tagName !== 'IMG') {
      var ini = (name || 'L').charAt(0).toUpperCase();
      if (lg.textContent !== ini) lg.textContent = ini;
    }

    var src = modal.querySelector('.sll-3c-top .sll-3c-n');
    var dst = hd.querySelector('.sll-hd-n');
    if (src && dst && dst.textContent !== src.textContent) dst.textContent = src.textContent;

    var desk = window.innerWidth > 900;
    if (!modal.classList.contains('sll-rdy') && modal.style.getPropertyValue('--p') &&
        (!desk || (modal.classList.contains('sll-3c') && info.done))) {
      modal.classList.add('sll-rdy');
    }
  }
  setInterval(sync, 150);
})();
/* SLL-LIVE-POLISH */
(function () {
  if (window.__sllLivePolish) return;
  window.__sllLivePolish = true;
  var saved = 0, lastOn = '';

  var css = document.createElement('style');
  css.textContent = [
    '@keyframes sllPing{0%{box-shadow:0 0 0 0 rgba(239,68,68,.7)}100%{box-shadow:0 0 0 8px rgba(239,68,68,0)}}',
    '.vl-live-modal .sll-3c-pill.sll-3c-live{background:#111!important;color:#fff!important;font-size:13px!important;padding:6px 12px!important;gap:7px!important}',
    '.vl-live-modal .sll-3c-pill.sll-3c-live::before{content:"";width:8px;height:8px;border-radius:50%;background:#ef4444;animation:sllPing 1.4s ease-out infinite}',
    '.vl-live-modal .sll-3c-pill.sll-3c-views{background:#111!important;color:#fff!important;font-size:13px!important;padding:6px 12px!important}',
    '.vl-live-modal.sll-hide-views .sll-3c-views{display:none!important}'
  ].join('');
  document.head.appendChild(css);

  document.addEventListener('scroll', function (e) {
    var t = e.target;
    if (t && t.classList && t.classList.contains('sll-ao-list')) saved = t.scrollTop;
  }, true);

  function realCount(modal) {
    var n = modal.querySelector('.sll-3c-top .sll-3c-n');
    if (!n) return 0;
    var t = String(n.textContent || '').trim().toUpperCase();
    var v = parseFloat(t.replace(',', '.'));
    if (!isFinite(v)) return 0;
    return t.slice(-1) === 'K' ? v * 1000 : v;
  }

  function sync() {
    var modal = document.querySelector('.vl-live-modal');
    if (!modal) { saved = 0; lastOn = ''; return; }

    var l = window.__sllLive || {};
    var min = Math.max(0, parseInt(l.viewer_min_display, 10) || 0);
    modal.classList.toggle('sll-hide-views', min > 0 && realCount(modal) < min);

    var list = modal.querySelector('.sll-ao-list');
    if (!list || list.getAttribute('data-sll-sc')) return;
    list.setAttribute('data-sll-sc', '1');
    var on = list.querySelector('.sll-ao-it.on');
    var b = on && on.querySelector('b');
    var key = b ? b.textContent : '';
    if (on && key !== lastOn) {
      lastOn = key;
      list.scrollTop += on.getBoundingClientRect().top - list.getBoundingClientRect().top - 8;
    } else {
      list.scrollTop = saved;
    }
  }
  setInterval(sync, 300);
})();
/* SLL-LIVE-APPEAR */
(function () {
  if (window.__sllAppear) return;
  window.__sllAppear = true;
  var HEX = /^#[0-9a-f]{3,8}$/i;

  var css = document.createElement('style');
  css.textContent = [
    '.sll-ao-ov div>span{display:block!important;margin-top:2px}',
    '.sll-ao-ov em{display:block!important;width:fit-content;margin:6px 0 0!important}',
    '.vl-live-modal.sll-no-views .sll-3c-views{display:none!important}'
  ].join('');
  document.head.appendChild(css);

  function rgb(s) {
    var m = String(s).match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    var p = m[1].split(',').map(parseFloat);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  }
  function hex(h) {
    h = String(h).replace('#', '');
    if (h.length === 3 || h.length === 4) h = h.split('').map(function (x) { return x + x; }).join('');
    return { r: parseInt(h.substr(0, 2), 16), g: parseInt(h.substr(2, 2), 16), b: parseInt(h.substr(4, 2), 16) };
  }
  function lum(o) {
    var f = function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(o.r) + 0.7152 * f(o.g) + 0.0722 * f(o.b);
  }
  function bgOf(e) {
    while (e && e.nodeType === 1) {
      var o = rgb(getComputedStyle(e).backgroundColor);
      if (o && o.a > 0.5) return o;
      e = e.parentElement;
    }
    return { r: 255, g: 255, b: 255 };
  }
  function legible(color, e) {
    var a = lum(hex(color)) + 0.05, b = lum(bgOf(e)) + 0.05;
    return Math.max(a, b) / Math.min(a, b) >= 3;
  }
  function setS(e, p, v) { if (e && v && e.style[p] !== v) e.style[p] = v; }
  function colorize(e, c) { if (e && HEX.test(String(c || '')) && legible(c, e)) setS(e, 'color', c); }
  function size(e, v, k, min, max) {
    var n = Number(v);
    if (e && isFinite(n) && n > 0) setS(e, 'fontSize', Math.min(max, Math.max(min, Math.round(n * k))) + 'px');
  }
  function hx(c) { return HEX.test(String(c || '')) ? String(c) : ''; }

  function sync() {
    var c = window.__sllCfg;
    if (!c) return;
    var modal = document.querySelector('.vl-live-modal');
    if (modal) modal.classList.toggle('sll-no-views', c.showViewerCount === false);

    var names = document.querySelectorAll('.sll-ao-it b');
    for (var i = 0; i < names.length; i++) colorize(names[i], c.productNameColor);

    var ov = document.querySelector('.sll-ao-ov');
    if (ov) {
      var nb = ov.querySelector('b'), pr = ov.querySelector('div > span');
      colorize(nb, c.productNameColor);
      size(nb, c.productNameSize, 1.25, 11, 26);
      colorize(pr, c.productPriceColor);
      size(pr, c.productPriceSize, 1.1, 10, 24);
      setS(ov, 'borderColor', hx(c.borderColor));
      /* SLL-PROD-CARD */
      var pcs = function (n, prop, v, fb) {
        if (!n || !v) return;
        var cc = (typeof col === 'function') ? col(v, fb) : v;
        n.style.setProperty(prop, cc, 'important');
      };
      pcs(ov, 'border-color', c.prodCardBorderColor, '#ffffff'); (function (bw) { bw = parseFloat(bw); if (!isNaN(bw)) ov.style.borderWidth = Math.max(0, Math.min(8, bw)) + 'px'; })(c.prodCardBorderWidth !== undefined ? c.prodCardBorderWidth : c.borderWidth);
      pcs(ov, 'background', c.prodCardBgColor, '#0f172a');
      pcs(nb, 'color', c.prodCardNameColor, '#ffffff');
      pcs(pr, 'color', c.prodCardPriceColor, '#ffffff');
      pcs(ov.querySelector('.sll-ao-btn'), 'background', c.prodCardBtnBgColor, '#ec4899');
      pcs(ov.querySelector('.sll-ao-btn'), 'color', c.prodCardBtnTextColor, '#ffffff');
      if (c.showSpotlight === false) { ov.style.setProperty('display', 'none', 'important'); ov.__sllHid = 1; }
      else if (ov.__sllHid) { ov.style.removeProperty('display'); ov.__sllHid = 0; }
    }

    var cp = document.querySelector('.sll-ao-cp');
    if (cp) {
      setS(cp, 'background', hx(c.couponCodeBgColor));
      setS(cp, 'color', hx(c.couponCodeColor));
    }

    if (modal) {
      var all = modal.getElementsByTagName('*');
      for (var j = 0; j < all.length; j++) {
        var e = all[j];
        if (e.children.length) continue;
        if (!/^\s*\d+(?:[.,]\d+)?\s*%\s*OFF\s*$/i.test(e.textContent || '')) continue;
        var prev = e.previousElementSibling;
        if (!prev) continue;
        setS(e, 'background', hx(c.couponTextBgColor));
        setS(e, 'color', hx(c.couponTextColor));
        setS(prev, 'background', hx(c.couponCodeBgColor));
        setS(prev, 'color', hx(c.couponCodeColor));
      }
    }
  }
  setInterval(sync, 400);
})();
/* SLL-LIVE-CHATCFG */
(function () {
  if (window.__sllLiveChatCfg) return;
  window.__sllLiveChatCfg = true;
  var css = document.createElement('style');
  css.textContent = [
    '.vl-live-modal.sll-no-chat .vl-live-chat{display:none!important}',
    '@media (min-width:901px){',
    '.vl-live-modal.sll-3c.sll-no-chat{grid-template-areas:"hd hd hd" "ph pl pl" "ls pl pl" "ad cp sh"!important}',
    '}'
  ].join('');
  document.head.appendChild(css);

  function sync() {
    var m = document.querySelector('.vl-live-modal');
    if (!m) return;
    var c = window.__sllCfg || {};
    m.classList.toggle('sll-no-chat', c.showChat === false);
    m.classList.toggle('sll-no-share', c.showShare === false);
  }
  setInterval(sync, 300);
})();

/* SLL-BORDA-UNICA */
(function () {
  if (window.__sllBordaUnica) return;
  window.__sllBordaUnica = true;
  var st = document.createElement('style');
  st.id = 'sll-borda-unica-css';
  st.textContent = [
    '.vl-live-modal.sll-3c .sll-3c-ph{border-width:var(--bw,2px)!important;border-bottom-width:0!important;border-top-left-radius:var(--r,10px)!important;border-top-right-radius:var(--r,10px)!important}',
    '.vl-live-modal.sll-3c .sll-ao-list{border-width:var(--bw,2px)!important;border-top-width:0!important;border-radius:0 0 var(--r,10px) var(--r,10px)!important}',
    '.vl-live-modal.sll-3c .sll-ao-it{border-width:var(--bw,2px)!important;border-radius:min(var(--r,10px),14px)!important}',
    '.vl-live-modal.sll-3c .sll-ao-ad{border-width:var(--bw,2px)!important;border-radius:var(--r,10px)!important}',
    '.vl-live-modal.sll-3c .sll-ao-cp{border-width:var(--bw,2px)!important;border-radius:var(--r,10px)!important}',
    '.vl-live-modal.sll-3c .sll-3c-share{border-width:var(--bw,2px)!important;border-radius:var(--r,10px)!important}',
    '.vl-live-modal.sll-3c .vl-live-chat{border-width:var(--bw,2px)!important;border-radius:var(--r,12px)!important}',
    '.vl-live-modal.sll-3c .vl-live-chat-input{border-radius:min(calc(var(--r,10px) * .5),12px)!important}',
    '.vl-live-chat-form{position:relative}',
    '.sll-emoji-btn{background:transparent;border:0;font-size:18px;cursor:pointer;flex-shrink:0;width:32px;height:32px;padding:0;line-height:1}',
    '.sll-emoji-pop{display:none;position:absolute;right:0;bottom:calc(100% + 6px);background:#fff;border:1px solid #cbd5e1;border-radius:10px;padding:6px;grid-template-columns:repeat(6,1fr);gap:2px;z-index:20;box-shadow:0 4px 14px rgba(0,0,0,.25)}',
    '.sll-emoji-pop button{background:none;border:0;font-size:20px;cursor:pointer;padding:4px;line-height:1}'
  ].join('');
  document.head.appendChild(st);

  var EMOJIS = ['\uD83D\uDE00', '\uD83D\uDE02', '\uD83D\uDE0D', '\uD83D\uDE0E', '\uD83D\uDE2E', '\uD83D\uDE4F',
                '\uD83D\uDC4D', '\uD83D\uDC4F', '\uD83D\uDD25', '\u2764\uFE0F', '\uD83C\uDF89', '\uD83D\uDECD\uFE0F'];

  function addEmoji() {
    var inp = document.getElementById('vl-live-chat-input');
    if (!inp) return;
    var form = inp.parentNode;
    if (!form || form.querySelector('.sll-emoji-btn')) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sll-emoji-btn';
    btn.textContent = '\uD83D\uDE0A';
    var pop = document.createElement('div');
    pop.className = 'sll-emoji-pop';
    EMOJIS.forEach(function (em) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = em;
      b.addEventListener('click', function (ev) {
        ev.stopPropagation();
        var s = typeof inp.selectionStart === 'number' ? inp.selectionStart : inp.value.length;
        var e = typeof inp.selectionEnd === 'number' ? inp.selectionEnd : s;
        if (inp.value.length - (e - s) + em.length <= 300) {
          inp.value = inp.value.slice(0, s) + em + inp.value.slice(e);
          var p = s + em.length;
          inp.focus();
          try { inp.setSelectionRange(p, p); } catch (x) {}
        }
        pop.style.display = 'none';
      });
      pop.appendChild(b);
    });
    btn.addEventListener('click', function (ev) {
      ev.stopPropagation();
      pop.style.display = pop.style.display === 'grid' ? 'none' : 'grid';
    });
    document.addEventListener('click', function () { pop.style.display = 'none'; });
    var send = form.querySelector('.vl-live-chat-send');
    form.appendChild(pop);
    if (send) form.insertBefore(btn, send); else form.appendChild(btn);
  }
  setInterval(addEmoji, 700);
})();
/* SLL-VISUAL-FIX */
(function () {
  if (window.__sllVisualFix) return;
  window.__sllVisualFix = true;
  var HEX = /^#[0-9a-f]{3,8}$/i;
  function hx(v, d) { return HEX.test(String(v || '')) ? String(v) : d; }
  function nn(v, d, min, max) { var n = parseFloat(v); return isFinite(n) ? Math.min(max, Math.max(min, n)) : d; }
  function imp(e, p, v) { if (e) e.style.setProperty(p, v, 'important'); }

  var css = document.createElement('style');
  css.textContent = [
    '.sll-ao-box .sll-ao-it{display:flex;align-items:stretch;gap:0;padding:0;overflow:hidden;border:var(--bw,2px) solid var(--p,#10b981);border-radius:min(var(--r,10px),14px);background:#fff;color:#1e293b}',
    '.sll-ao-num{flex:none;width:36px;display:flex;align-items:center;justify-content:center;background:var(--p,#10b981);color:#fff;font:900 15px system-ui,sans-serif}',
    '.sll-ao-box .sll-ao-it>img{width:44px;height:56px;border-radius:0;flex:none;object-fit:cover}',
    '.sll-ao-box .sll-ao-it>span{display:block;align-self:center;padding:6px 8px}',
    '.sll-ao-rt{display:flex;flex-direction:column;align-items:flex-end;justify-content:center;gap:4px;padding:6px 8px;flex:none}',
    '.sll-ao-live{font-size:8px;font-weight:600;text-transform:uppercase;color:#fff}',
    '.sll-ao-box .sll-ao-it .sll-ao-btn{margin:0;border-radius:999px;padding:4px 12px;font-size:10px;background:var(--p,#10b981);color:#fff}',
    '.sll-ao-box .sll-ao-it.on{background:var(--p,#10b981)!important}',
    '.sll-ao-box .sll-ao-it.on b,.sll-ao-box .sll-ao-it.on .sll-ao-pe{color:#fff!important}',
    '.sll-ao-box .sll-ao-it.on .sll-ao-btn{background:#fff!important;color:var(--p,#10b981)!important}',
    '.vl-live-modal.sll-3c .sll-ao-it.on b::after{content:none!important}',
    '.sll-ao-ov{align-items:center;gap:8px;padding:6px}',
    '.sll-ao-ov b{font-weight:500;line-height:1.2}',
    '.sll-ao-ov .sll-ao-btn{border-radius:999px;padding:5px 12px;font-size:11px}'
  ].join('');
  document.head.appendChild(css);

  function sync() {
    var c = window.__sllCfg;
    if (!c) return;
    var modal = document.querySelector('.vl-live-modal');
    if (!modal) return;
    var desk = modal.classList.contains('sll-3c');
    var show = c.showTitle !== false;

    // Titulo: faixa sobre o video (desktop) ou titulo do modal (celular)
    var top = modal.querySelector('.sll-3c-top');
    var tt = modal.querySelector('.sll-3c-t');
    if (top && desk) imp(top, 'background', show ? hx(c.titleBgColor, '#000000') : 'transparent');
    else if (top) top.style.removeProperty('background');
    if (tt) {
      if (show) { tt.style.removeProperty('display'); imp(tt, 'color', hx(c.titleColor, '#ffffff')); }
      else imp(tt, 'display', 'none');
    }
    var mt = modal.querySelector('.vl-live-modal-title');
    if (mt && !desk) {
      if (show) {
        mt.style.removeProperty('display');
        imp(mt, 'background', hx(c.titleBgColor, '#000000'));
        imp(mt, 'color', hx(c.titleColor, '#ffffff'));
        imp(mt, 'text-align', 'center');
        imp(mt, 'padding', '6px 10px');
        imp(mt, 'border-radius', '8px');
      } else imp(mt, 'display', 'none');
    }

    // Card do produto no player (mesmos padroes do preview)
    var ov = document.querySelector('.sll-ao-ov');
    if (ov) {
      var bc = hx(c.borderColor, '#10b981');
      var bw = nn(c.prodCardBorderWidth !== undefined ? c.prodCardBorderWidth : c.borderWidth, 2, 0, 8);
      imp(ov, 'background', hx(c.prodCardBgColor, '#ffffff'));
      imp(ov, 'border', bw + 'px solid ' + hx(c.prodCardBorderColor, bc));
      imp(ov, 'border-radius', nn(c.borderRadius, 12, 0, 40) + 'px');
      imp(ov.querySelector('b'), 'color', hx(c.prodCardNameColor, '#111111'));
      imp(ov.querySelector('div > span'), 'color', hx(c.prodCardPriceColor, bc));
      var ob = ov.querySelector('.sll-ao-btn');
      imp(ob, 'background', hx(c.prodCardBtnBgColor, bc));
      imp(ob, 'color', hx(c.prodCardBtnTextColor, '#ffffff'));
    }
  }
  setInterval(sync, 400);
})();
/* SLL-NO-FLASH */
(function () {
  if (window.__sllNoFlash) return;
  window.__sllNoFlash = true;
  var css = document.createElement('style');
  css.textContent = '.vl-live-modal:not(.sll-cfg-ok){visibility:hidden!important}.sll-ao-ov.sll-ov-new{visibility:hidden!important}';
  document.head.appendChild(css);
  var cur = null, seenAt = 0, cfgAt = 0;
  setInterval(function () {
    var m = document.querySelector('.vl-live-modal');
    if (!m) { cur = null; return; }
    var now = Date.now();
    if (m !== cur) { cur = m; seenAt = now; cfgAt = 0; }
    if (m.classList.contains('sll-cfg-ok')) return;
    if (window.__sllCfg && !cfgAt) cfgAt = now;
    if ((cfgAt && now - cfgAt >= 450) || now - seenAt >= 4000) m.classList.add('sll-cfg-ok');
  }, 40);
})();

;(function () {
  /* SLL-TITULOS-IGUAIS */
  var css = document.createElement('style');
  css.textContent = [
    '.vl-live-modal.sll-3c .vl-live-chat-title{font:800 13px system-ui,sans-serif!important;line-height:normal!important;letter-spacing:0!important}',
    '.vl-live-modal.sll-3c .sll-3c-share{text-transform:none!important}'
  ].join('');
  document.head.appendChild(css);
})();