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
  var ctaText = live.promo_cta_text || (isLive ? 'Assistir Agora' : 'Quero Participar');
  var title = live.title || 'Live Commerce';
  var scheduledAt = live.scheduled_at ? new Date(live.scheduled_at) : null;

  var aspectCss = (shape === 'square' || shape === 'circle') ? 'aspect-ratio: 1/1;' : 'aspect-ratio: 9/16;';

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
    '.vl-live-media { width:100%; height:100%; object-fit:cover; display:block; }' +
    '.vl-live-overlay-grad {' +
      'position:absolute; inset:0;' +
      'background:linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.4) 100%);' +
      'display:flex; flex-direction:column; justify-content:space-between; padding:10px; box-sizing:border-box;' +
    '}' +
    '.vl-live-top-row { display:flex; justify-content:space-between; align-items:flex-start; width:100%; }' +
    '.vl-live-badge {' +
      'background:' + (isLive ? '#ef4444' : '#3b82f6') + ';' +
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
    '.vl-live-countdown { background:rgba(0,0,0,0.65); backdrop-filter:blur(4px); color:#fbbf24; font-size:10px; font-weight:700; text-align:center; padding:4px 6px; border-radius:6px; border:1px solid rgba(251,191,36,0.3); }' +
    '.vl-live-cta-btn {' +
      'width:100%; padding:6px 0; background:' + (currentCfg.ctaBgColor || '#22c55e') + ';' +
      'color:' + (currentCfg.ctaTextColor || '#ffffff') + ';' +
      'font-size:11px; font-weight:700; text-align:center; border:none; border-radius:6px; cursor:pointer;' +
      'box-shadow:0 2px 8px rgba(0,0,0,0.3); transition:filter .2s;' +
    '}' +
    '.vl-live-cta-btn:hover { filter:brightness(1.1); }';

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
      vid.autoplay = true;
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
    topRow.appendChild(badge);

    if (currentCfg.allowClose !== false) {
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

    if (currentCfg.showTitle !== false) {
      var titleEl = document.createElement('p');
      titleEl.className = 'vl-live-title';
      titleEl.textContent = title;
      bottomInfo.appendChild(titleEl);
    }

    if (!isLive && scheduledAt && scheduledAt > new Date()) {
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
    bottomInfo.appendChild(ctaBtn);

    overlayEl.appendChild(bottomInfo);
    card.appendChild(overlayEl);
  } else {
    if (currentCfg.allowClose !== false) {
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
    iframe.src = 'https://www.youtube.com/embed/' + encodeURIComponent(String(live.youtube_video_id)) + '?autoplay=1&mute=0';
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
  chatTitle.textContent = 'Chat da live';
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
        renderLiveWidget(live);
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

  var css = document.createElement('style');
  css.textContent =
    '.sll-yt-wrap{position:relative!important;width:100%!important;height:auto!important;max-height:none!important;aspect-ratio:16/9!important;flex:none!important;padding:0!important;overflow:hidden!important;background:#000}' +
    '.sll-yt-wrap iframe{position:absolute!important;top:0!important;left:0!important;width:100%!important;height:100%!important;border:0!important}' +
    '.sll-ao-ov{position:absolute;left:8px;right:8px;bottom:8px;z-index:5;display:flex;align-items:center;gap:10px;background:rgba(0,0,0,.82);border:1px solid #10b981;border-radius:12px;padding:8px;color:#fff;font:12px/1.3 system-ui,sans-serif}' +
    '.sll-ao-ov img{width:44px;height:44px;border-radius:8px;object-fit:cover}' +
    '.sll-ao-ov b{display:block;font-size:13px}' +
    '.sll-ao-btn{margin-left:auto;background:#10b981;color:#fff;border-radius:8px;padding:6px 12px;font-weight:700;text-decoration:none;white-space:nowrap}' +
    '.sll-ao-box{background:#0b0b0b;color:#fff;padding:8px;font:12px/1.3 system-ui,sans-serif}' +
    '.sll-ao-cp{background:#f59e0b;color:#111;font-weight:700;border-radius:8px;padding:8px 10px;margin-bottom:8px;text-align:center}' +
    '.sll-ao-bn{display:block;margin-bottom:8px}' +
    '.sll-ao-bn img{width:100%;border-radius:8px;display:block}' +
    '.sll-ao-it{display:flex;align-items:center;gap:8px;padding:6px;border:1px solid #27272a;border-radius:10px;margin-bottom:6px}' +
    '.sll-ao-it.on{border-color:#10b981;background:rgba(16,185,129,.12)}' +
    '.sll-ao-it img{width:40px;height:40px;border-radius:6px;object-fit:cover}' +
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
    st.box.textContent = '';

    if (coupons.length) {
      var c = coupons.filter(function (x) { return x.code === live.spotlight_coupon_code; })[0] || coupons[0];
      st.box.appendChild(el('div', 'sll-ao-cp', 'Cupom ' + c.code + (c.discount_percent ? ' - ' + c.discount_percent + '% OFF' : '')));
    }
    if (banners.length && safeUrl(banners[0].image_url)) {
      var b = banners[0];
      var holder = link(b.link_url, '', 'sll-ao-bn') || el('div', 'sll-ao-bn');
      var im = el('img'); im.src = safeUrl(b.image_url); im.alt = b.title || '';
      holder.appendChild(im);
      st.box.appendChild(holder);
    }

    var onAir = null;
    lp.forEach(function (r) {
      var p = byId[r.product_id] || {};
      var isOn = (onAirId && r.product_id === onAirId) || (!onAirId && r.is_on_air);
      var price = r.price_override != null ? r.price_override : p.price;
      var row = el('div', 'sll-ao-it' + (isOn ? ' on' : ''));
      if (safeUrl(p.image_url)) { var i = el('img'); i.src = safeUrl(p.image_url); i.alt = ''; row.appendChild(i); }
      var info = el('span');
      info.appendChild(el('b', null, (r.code ? r.code + '. ' : '') + (p.name || 'Produto')));
      info.appendChild(el('em', null, money(price)));
      row.appendChild(info);
      var btn = link(r.checkout_url, 'Comprar', 'sll-ao-btn');
      if (btn) row.appendChild(btn);
      st.box.appendChild(row);
      if (isOn) onAir = { p: p, price: price, url: r.checkout_url };
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
        ov.appendChild(t);
        var ob = link(onAir.url, 'Comprar', 'sll-ao-btn');
        if (ob) ov.appendChild(ob);
        wrap.appendChild(ov);
        st.ov = ov;
      }
    }
  }

  function refresh(vid) {
    api('lives?select=id,status,spotlight_product_id,spotlight_coupon_code&youtube_video_id=eq.' + encodeURIComponent(vid) + '&order=created_at.desc&limit=1')
      .then(function (rows) {
        var live = rows[0];
        if (!live || !UUID.test(live.id)) return;
        return Promise.all([
          api('live_products?select=product_id,code,display_order,is_on_air,price_override,checkout_url&live_id=eq.' + live.id + '&order=display_order.asc'),
          api('live_coupons?select=code,discount_percent&live_id=eq.' + live.id + '&is_active=eq.true'),
          api('live_banners?select=title,image_url,link_url&live_id=eq.' + live.id + '&is_active=eq.true&order=display_order.asc')
        ]).then(function (res) {
          var ids = res[0].map(function (r) { return r.product_id; }).filter(function (x) { return UUID.test(x); });
          return (ids.length ? api('products?select=id,name,price,image_url&id=in.(' + ids.join(',') + ')', 'public') : Promise.resolve([]))
            .then(function (pr) {
              if (st.vid !== vid || !st.box) return;
              render(live, res[0], pr, res[1], res[2]);
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

  setInterval(tick, 1000);
})();