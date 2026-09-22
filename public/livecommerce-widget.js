(function() {
  'use strict';

  var SUPABASE_URL = 'https://flivmllysdhaydhogmhg.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsaXZtbGx5c2RoYXlkaG9nbWhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwODY1MTYsImV4cCI6MjA5ODY2MjUxNn0.ye92mnf-5ws78H8A9fSGkf2xGo5q0FoB2oq91v7HFG0';

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
      '.vl-live-chat-send{background:#22c55e;color:#0f172a;border:none;border-radius:50%;width:32px;height:32px;font-size:14px;cursor:pointer;flex-shrink:0;}';
      '.vl-live-spotlight-overlay{position:absolute;left:10px;right:10px;bottom:10px;background:rgba(15,23,42,.92);border-radius:12px;padding:8px 10px;display:flex;align-items:center;gap:10px;z-index:5;opacity:0;transform:translateY(8px);transition:opacity .25s ease,transform .25s ease;pointer-events:none;}' +
'.vl-live-spotlight-overlay.vl-active{opacity:1;transform:translateY(0);pointer-events:auto;}' +
'.vl-live-spotlight-overlay img{width:44px;height:44px;border-radius:8px;object-fit:cover;flex-shrink:0;background:#334155;}' +
'.vl-live-spotlight-overlay-info{flex:1;min-width:0;}' +
'.vl-live-spotlight-overlay-name{color:#fff;font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
'.vl-live-spotlight-overlay-price{color:#22c55e;font-size:13px;font-weight:700;}' +
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
    iframe.src = 'https://www.youtube.com/embed/' + live.youtube_video_id + '?autoplay=1&mute=0';
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
    iframe.allowFullscreen = true;
    playerWrap.appendChild(iframe);
  } else if (live.stream_url) {
    var vidEl = document.createElement('video');
vidEl.src = live.stream_url;
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
      img.src = p.image_url || '';
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

card.onclick = function () {
  trackLiveEvent(live.id, 'product_click', { product_id: p.id, source: 'live_modal' });
  try {
    // Cookie de SESSÃO (sem expires) - atribuição só vale enquanto o navegador estiver aberto
    document.cookie = 'vly_live_id=' + encodeURIComponent(live.id) + '; path=/; SameSite=Lax';
    if (p.id) {
      document.cookie = 'vly_product_id=' + encodeURIComponent(p.id) + '; path=/; SameSite=Lax';
    }
  } catch (_) {}
  if (p.url) window.open(p.url, '_blank');
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
  if (liveChatPollTimer) { clearInterval(liveChatPollTimer); liveChatPollTimer = null; }
  if (liveSpotlightPollTimer) { clearInterval(liveSpotlightPollTimer); liveSpotlightPollTimer = null; }
  liveChatSeenIds = {};
  liveSpotlightProductId = null;
  liveSpotlightOverlayEl = null;
liveActiveProducts = [];

}

function startLivePolling(live) {
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
      author_name: visitorName,
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
              '<img src="' + (prod.image_url || '') + '" alt="">' +
              '<div class="vl-live-spotlight-overlay-info">' +
                '<div class="vl-live-spotlight-overlay-name">' + (prod.name || '') + '</div>' +
                '<div class="vl-live-spotlight-overlay-price">' + (prod.price || '') + '</div>' +
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
  function initLiveWidget() {
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