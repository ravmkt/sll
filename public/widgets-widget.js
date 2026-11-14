(function () {
  'use strict';
  if (window.__SLL_WIDGETS__) return;
  window.__SLL_WIDGETS__ = true;

  var cfg = window.VIDLYTICS_CONFIG || {};
  var SB_URL = String(cfg.supabaseUrl || cfg.url || cfg.SUPABASE_URL || '').replace(/\/$/, '');
  var SB_KEY = cfg.supabaseAnonKey || cfg.anonKey || cfg.key || cfg.SUPABASE_ANON_KEY || '';
  var cs = document.currentScript;
  var STORE_ID = window.SLL_STORE_ID || (cs && (cs.getAttribute('data-store-id') || cs.getAttribute('data-store'))) || '';
  if (!SB_URL || !SB_KEY) return;

  function rpc(fn, body) {
    return fetch(SB_URL + '/rest/v1/rpc/' + fn, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY },
      body: JSON.stringify(body)
    }).then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); });
  }
  function mk(tag, css, text) {
    var e = document.createElement(tag);
    if (css) e.style.cssText = css;
    if (text != null) e.textContent = text;
    return e;
  }
  function esc(s) { return window.CSS && CSS.escape ? CSS.escape(s) : String(s).replace(/([^\w-])/g, '\\$1'); }
  function uniq(sel) { try { return document.querySelectorAll(sel).length === 1; } catch (e) { return false; } }

  function buildSelector(el) {
    if (el.id && uniq('#' + esc(el.id))) return '#' + esc(el.id);
    var parts = [], cur = el;
    while (cur && cur.nodeType === 1 && cur !== document.body && parts.length < 6) {
      if (cur.id && uniq('#' + esc(cur.id))) { parts.unshift('#' + esc(cur.id)); return parts.join(' > '); }
      var part = cur.tagName.toLowerCase();
      var cls = [].slice.call(cur.classList).filter(function (c) {
        return /^[A-Za-z_-][\w-]*$/.test(c) && !/^(sll-|swiper-|slick-|active|is-|has-)/.test(c);
      }).slice(0, 2);
      if (cls.length) part += '.' + cls.map(esc).join('.');
      var p = cur.parentElement;
      if (p) {
        var same = [].filter.call(p.children, function (c) { return c.tagName === cur.tagName; });
        if (same.length > 1) part += ':nth-of-type(' + (same.indexOf(cur) + 1) + ')';
      }
      parts.unshift(part);
      var s = parts.join(' > ');
      if (uniq(s)) return s;
      cur = p;
    }
    return parts.join(' > ');
  }

  /* ---------- Modo seletor ---------- */
  function startPicker(token) {
    var host = mk('div', 'position:fixed;z-index:2147483647;top:0;left:0;width:0;height:0');
    var sh = host.attachShadow({ mode: 'open' });
    var hl = mk('div', 'position:fixed;pointer-events:none;border:2px solid #0094EB;background:rgba(0,148,235,.15);z-index:2147483646;display:none');
    var bar = mk('div', 'position:fixed;top:0;left:0;right:0;background:#0F172A;color:#fff;font:600 14px system-ui;padding:12px 16px;display:flex;gap:12px;align-items:center;justify-content:center;flex-wrap:wrap');
    var msg = mk('span', '', 'Clique no elemento onde a régua será inserida.');
    var ok = mk('button', 'display:none;background:#0094EB;color:#fff;border:0;border-radius:8px;padding:8px 14px;font:700 13px system-ui;cursor:pointer', 'Usar este elemento');
    var again = mk('button', 'display:none;background:#334155;color:#fff;border:0;border-radius:8px;padding:8px 14px;font:700 13px system-ui;cursor:pointer', 'Escolher outro');
    bar.appendChild(msg); bar.appendChild(ok); bar.appendChild(again);
    sh.appendChild(hl); sh.appendChild(bar);
    document.documentElement.appendChild(host);

    var chosen = null, locked = false;
    function move(e) {
      if (locked || e.target === host) return;
      var r = e.target.getBoundingClientRect();
      hl.style.cssText += ';display:block;top:' + r.top + 'px;left:' + r.left + 'px;width:' + r.width + 'px;height:' + r.height + 'px';
    }
    function click(e) {
      if (e.target === host || host.contains(e.target)) return;
      e.preventDefault(); e.stopPropagation();
      if (locked) return;
      chosen = buildSelector(e.target);
      locked = true;
      msg.textContent = 'Selecionado: ' + chosen;
      ok.style.display = 'inline-block'; again.style.display = 'inline-block';
    }
    document.addEventListener('mousemove', move, true);
    document.addEventListener('click', click, true);
    again.onclick = function () {
      locked = false; chosen = null; ok.style.display = 'none'; again.style.display = 'none';
      msg.textContent = 'Clique no elemento onde a régua será inserida.';
    };
    ok.onclick = function () {
      ok.disabled = true;
      rpc('widgets_selector_submit', { p_token: token, p_selector: chosen }).then(function (res) {
        document.removeEventListener('mousemove', move, true);
        document.removeEventListener('click', click, true);
        hl.style.display = 'none';
        ok.style.display = 'none'; again.style.display = 'none';
        msg.textContent = res ? 'Elemento enviado! Pode fechar esta aba e voltar ao painel.' : 'Token expirado. Gere um novo no painel.';
        if (res) setTimeout(function () { try { window.close(); } catch (e) {} }, 1500);
      }).catch(function () { ok.disabled = false; msg.textContent = 'Erro ao enviar. Tente novamente.'; });
    };
  }

  /* ---------- Régua ---------- */
  /* ---------- Cards / carrossel ---------- */
function buildCards(a, tiers) {
  var timers = [];
  function destroy() { timers.forEach(function (t) { clearInterval(t); clearTimeout(t); }); timers = []; }
  var n = tiers.length;
  var v = Math.max(1, parseInt(a.cards_visible, 10) || 3);
  var gap = Math.max(0, +a.cards_gap || 0);
  var mode = a.carousel_mode || 'static';
  var root = mk('div', 'width:100%');

  function card(t) {
    var hl = !!t.highlight;
    var bc = t.border_color || (hl ? a.hl_border_color : a.card_border_color);
    var bg = t.bg_color || (hl ? a.hl_bg_color : a.card_bg_color);
    var gc = a.hl_glow_color || bc; var gm = /^#[0-9a-f]{6}$/i.test(gc) ? gc + '99' : gc;
    var c = mk('div', 'box-sizing:border-box;flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;text-align:center;' +
      'padding:' + a.card_padding + 'px;border-radius:' + a.card_radius + 'px;border:' + a.card_border_width + 'px solid ' + bc + ';background:' + bg +
      (hl && a.hl_glow ? ';box-shadow:0 0 0 1px ' + gc + ',0 0 ' + (+a.hl_glow_size || 22) + 'px ' + gm : ''));
    var L = (t.lines && t.lines.length) ? t.lines : [{ text: t.label || '' }, { text: t.value || '' }, { text: '' }];
    for (var i = 0; i < 3; i++) {
      var ln = L[i];
      if (!ln || !ln.text) continue;
      var s = (a.lines && a.lines[i]) || {};
      var col = ln.color || (hl && i === 1 && a.hl_main_color) || s.color || '#111';
      c.appendChild(mk('div', 'font-size:' + (ln.size || s.size || 12) + 'px;color:' + col + ';font-weight:' + (s.weight || 400) +
        ';font-family:' + (s.font || 'inherit') + ';line-height:1.15;letter-spacing:' + (s.spacing || 0) + 'px;' +
        (s.upper ? 'text-transform:uppercase;' : ''), ln.text));
    }
    return c;
  }

  if (!n) return { el: root, destroy: destroy };

  if (mode === 'stack') {
    root.style.cssText = 'width:100%;display:flex;flex-direction:column;gap:' + gap + 'px';
    tiers.forEach(function (t) { var w = mk('div', 'display:flex'); w.appendChild(card(t)); root.appendChild(w); });
    return { el: root, destroy: destroy };
  }
  if (mode === 'static' || n <= v) {
    root.style.cssText = 'width:100%;display:grid;gap:' + gap + 'px;grid-template-columns:repeat(' + Math.min(n, v) + ',minmax(0,1fr))';
    tiers.forEach(function (t) { var w = mk('div', 'display:flex'); w.appendChild(card(t)); root.appendChild(w); });
    return { el: root, destroy: destroy };
  }

  var inf = a.infinite !== false;
  var pad = inf ? v : 0;
  var maxIdx = inf ? n : n - v;
  var animMs = Math.max(100, +a.anim_ms || 500);
  var basis = 'calc((100% - ' + (gap * (v - 1)) + 'px) / ' + v + ')';
  var step = '((100% - ' + (gap * (v - 1)) + 'px) / ' + v + ' + ' + gap + 'px)';
  var vp = mk('div', 'overflow:hidden;box-sizing:content-box;width:100%;margin:-16px -24px;padding:24px;touch-action:pan-y;cursor:grab;user-select:none;-webkit-user-select:none');
  var track = mk('div', 'display:flex;gap:' + gap + 'px;will-change:transform');
  var seq = [], k;
  if (inf) for (k = n - v; k < n; k++) seq.push(tiers[k]);
  tiers.forEach(function (t) { seq.push(t); });
  if (inf) for (k = 0; k < v; k++) seq.push(tiers[k]);
  seq.forEach(function (t) {
    var cell = mk('div', 'flex:0 0 ' + basis + ';min-width:0;display:flex');
    cell.appendChild(card(t));
    track.appendChild(cell);
  });
  vp.appendChild(track);
  root.appendChild(vp);

  var idx = 0, busy = false, drag = false, hovering = false, sx = 0, dx = 0;
  function setPos(i, off, anim) {
    track.style.transition = anim ? 'transform ' + animMs + 'ms ease' : 'none';
    track.style.transform = 'translateX(calc(' + (-(i + pad)) + ' * ' + step + ' + ' + (off || 0) + 'px))';
  }
  function go(i) {
    if (busy) return;
    if (!inf) { idx = Math.max(0, Math.min(maxIdx, i)); setPos(idx, 0, true); return; }
    busy = true; idx = i; setPos(idx, 0, true);
    timers.push(setTimeout(function () {
      if (idx >= n) idx -= n; else if (idx < 0) idx += n;
      setPos(idx, 0, false); busy = false;
    }, animMs + 30));
  }
  function stepPx() { var c = track.firstChild; return c ? c.offsetWidth + gap : 1; }
  vp.addEventListener('pointerdown', function (e) {
    if (busy) return;
    drag = true; sx = e.clientX; dx = 0; vp.style.cursor = 'grabbing';
    try { vp.setPointerCapture(e.pointerId); } catch (x) {}
  });
  vp.addEventListener('pointermove', function (e) {
    if (!drag) return;
    dx = e.clientX - sx; setPos(idx, dx, false);
  });
  function end() {
    if (!drag) return;
    drag = false; vp.style.cursor = 'grab';
    var th = Math.min(60, stepPx() / 4), d = dx; dx = 0;
    if (d < -th) go(idx + 1); else if (d > th) go(idx - 1); else setPos(idx, 0, true);
  }
  vp.addEventListener('pointerup', end);
  vp.addEventListener('pointercancel', end);
  if (a.pause_hover !== false) {
    vp.addEventListener('mouseenter', function () { hovering = true; });
    vp.addEventListener('mouseleave', function () { hovering = false; });
  }
  if (mode === 'auto') {
    timers.push(setInterval(function () {
      if (hovering || drag || busy) return;
      if (!inf && idx >= maxIdx) go(0); else go(idx + 1);
    }, Math.max(1000, +a.autoplay_ms || 3000)));
  }
  setPos(0, 0, false);
  return { el: root, destroy: destroy };
}
var DEF = {
    layout: 'steps', cards_visible: 3, cards_gap: 12, carousel_mode: 'static', infinite: true, autoplay_ms: 3000, anim_ms: 500, pause_hover: true,
    card_padding: 12, card_radius: 12, card_border_width: 1, card_border_color: '#E2E8F0', card_bg_color: '#FFFFFF',
    hl_border_color: '#0094EB', hl_bg_color: '#F0F9FF', hl_glow: false,
    max_width: 0, margin_top: 12, margin_bottom: 12, padding_y: 16, padding_x: 20,
    border_color: '#E2E8F0', border_width: 1, border_radius: 12, bg_color: '#FFFFFF',
    title_color: '#0F172A', text_color: '#475569', accent_color: '#0094EB', track_color: '#E2E8F0',
    footer_color: '#64748B', title_size: 16, title_bold: true, title_align: 'center', text_size: 12,
    footer_size: 11, footer_align: 'center', bar_height: 6, marker_size: 18,
    show_title: true, show_markers: true, show_footer: true
  };

  /* SLL_BENEFITS_START */
var SLL_ICONS = {"truck":"<path d=\"M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2\"/><path d=\"M15 18H9\"/><path d=\"M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14\"/><circle cx=\"17\" cy=\"18\" r=\"2\"/><circle cx=\"7\" cy=\"18\" r=\"2\"/>","package":"<path d=\"m7.5 4.27 9 5.15\"/><path d=\"M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z\"/><path d=\"m3.3 7 8.7 5 8.7-5\"/><path d=\"M12 22V12\"/>","map-pin":"<path d=\"M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z\"/><circle cx=\"12\" cy=\"10\" r=\"3\"/>","clock":"<circle cx=\"12\" cy=\"12\" r=\"10\"/><polyline points=\"12 6 12 12 16 14\"/>","zap":"<path d=\"M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z\"/>","globe":"<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M2 12h20\"/><path d=\"M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z\"/>","credit-card":"<rect width=\"20\" height=\"14\" x=\"2\" y=\"5\" rx=\"2\"/><line x1=\"2\" x2=\"22\" y1=\"10\" y2=\"10\"/>","pix":"<path d=\"M12 2 22 12 12 22 2 12Z\"/><path d=\"M8.5 12 12 8.5 15.5 12 12 15.5Z\"/>","banknote":"<rect width=\"20\" height=\"12\" x=\"2\" y=\"6\" rx=\"2\"/><circle cx=\"12\" cy=\"12\" r=\"2\"/><path d=\"M6 12h.01M18 12h.01\"/>","wallet":"<path d=\"M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1\"/><path d=\"M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4\"/>","percent":"<line x1=\"19\" x2=\"5\" y1=\"5\" y2=\"19\"/><circle cx=\"6.5\" cy=\"6.5\" r=\"2.5\"/><circle cx=\"17.5\" cy=\"17.5\" r=\"2.5\"/>","tag":"<path d=\"M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z\"/><circle cx=\"7.5\" cy=\"7.5\" r=\".5\" fill=\"currentColor\"/>","shield-check":"<path d=\"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z\"/><path d=\"m9 12 2 2 4-4\"/>","lock":"<rect width=\"18\" height=\"11\" x=\"3\" y=\"11\" rx=\"2\"/><path d=\"M7 11V7a5 5 0 0 1 10 0v4\"/>","badge-check":"<path d=\"M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z\"/><path d=\"m9 12 2 2 4-4\"/>","check-circle":"<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"m9 12 2 2 4-4\"/>","rotate-ccw":"<path d=\"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8\"/><path d=\"M3 3v5h5\"/>","undo":"<path d=\"M9 14 4 9l5-5\"/><path d=\"M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11\"/>","calendar":"<rect width=\"18\" height=\"18\" x=\"3\" y=\"4\" rx=\"2\"/><path d=\"M16 2v4M8 2v4M3 10h18\"/>","star":"<polygon points=\"12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2\"/>","award":"<circle cx=\"12\" cy=\"8\" r=\"6\"/><path d=\"M15.477 12.89 17 22l-5-3-5 3 1.523-9.11\"/>","heart":"<path d=\"M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z\"/>","thumbs-up":"<path d=\"M7 10v12\"/><path d=\"M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z\"/>","gift":"<rect x=\"3\" y=\"8\" width=\"18\" height=\"4\" rx=\"1\"/><path d=\"M12 8v13\"/><path d=\"M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7\"/><path d=\"M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5\"/>","smile":"<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M8 14s1.5 2 4 2 4-2 4-2\"/><path d=\"M9 9h.01M15 9h.01\"/>","shopping-bag":"<path d=\"M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z\"/><path d=\"M3 6h18\"/><path d=\"M16 10a4 4 0 0 1-8 0\"/>","shopping-cart":"<circle cx=\"8\" cy=\"21\" r=\"1\"/><circle cx=\"19\" cy=\"21\" r=\"1\"/><path d=\"M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12\"/>","message-circle":"<path d=\"M7.9 20A9 9 0 1 0 4 16.1L2 22Z\"/>","headphones":"<path d=\"M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3\"/>","phone":"<path d=\"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z\"/>","mail":"<rect width=\"20\" height=\"16\" x=\"2\" y=\"4\" rx=\"2\"/><path d=\"m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7\"/>"};

function bColor(c, def) {
  c = String(c == null ? '' : c).trim();
  return /^[#a-zA-Z0-9(),.% -]{1,40}$/.test(c) ? c : def;
}
function bNum(v, def) { var n = parseFloat(v); return isFinite(n) ? n : def; }
function bIcon(name, size, color) {
  var key = String(name || '').replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  var inner = SLL_ICONS[key] || SLL_ICONS[key.replace(/([a-z])(\d)/g, '$1-$2')];
  if (!inner) return '';
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="' + color +
    '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inner + '</svg>';
}
function bCustom(raw, size, color) {
  if (!raw) return '';
  var TAGS = { path: 1, circle: 1, rect: 1, line: 1, polyline: 1, polygon: 1, ellipse: 1, g: 1 };
  var ATTRS = { d: 1, cx: 1, cy: 1, r: 1, rx: 1, ry: 1, x: 1, y: 1, x1: 1, x2: 1, y1: 1, y2: 1, width: 1, height: 1, points: 1, fill: 1, stroke: 1, 'stroke-width': 1, 'stroke-linecap': 1, 'stroke-linejoin': 1, transform: 1, opacity: 1 };
  var doc;
  try { doc = new DOMParser().parseFromString('<svg xmlns="http://www.w3.org/2000/svg">' + String(raw).replace(/<\/?svg[^>]*>/gi, '') + '</svg>', 'image/svg+xml'); } catch (e) { return ''; }
  var root = doc.documentElement;
  if (!root || root.nodeName !== 'svg' || doc.querySelector('parsererror')) return '';
  function clean(node) {
    Array.prototype.slice.call(node.childNodes).forEach(function (c) {
      if (c.nodeType !== 1) { node.removeChild(c); return; }
      if (!TAGS[c.nodeName.toLowerCase()]) { node.removeChild(c); return; }
      Array.prototype.slice.call(c.attributes).forEach(function (at) {
        if (!ATTRS[at.name] || /url\(|javascript/i.test(at.value)) c.removeAttribute(at.name);
      });
      clean(c);
    });
  }
  clean(root);
  var inner = Array.prototype.map.call(root.childNodes, function (c) { return new XMLSerializer().serializeToString(c); }).join('');
  if (!inner) return '';
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="' + color +
    '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inner + '</svg>';
}
function bTexts(t) {
  var L = t.lines || [];
  return {
    title: String(t.title || t.label || (L[0] && L[0].text) || ''),
    desc: String(t.description || t.subtitle || t.text || t.value || (L[1] && L[1].text) || '')
  };
}

function buildBenefits(conf) {
  var r = conf.ruler || {}, d = r.design || {};
  function pick(keys, def) {
    for (var i = 0; i < keys.length; i++) { var v = d[keys[i]]; if (v !== undefined && v !== null && v !== '') return v; }
    return def;
  }
  var tiers = (r.tiers || []).filter(function (t) {
    if (!t) return false; var x = bTexts(t); return x.title || x.desc || t.icon || t.icon_name || t.icon_svg;
  });
  var n = tiers.length;
  var pos = (r.icon_position === 'top' || r.icon_position === 'right') ? r.icon_position : 'left';
  var size = Math.max(0, Math.min(96, bNum(r.icon_size, 28)));
  var iconBg = (r.icon_bg === 'circle' || r.icon_bg === 'square') ? r.icon_bg : 'none';
  var accent = bColor(r.icon_color || pick(['icon_color', 'accent_color'], ''), '#0094EB');
  var iconBgColor = bColor(r.icon_bg_color || pick(['icon_bg_color'], ''), '#E0F2FE');

  var bg = bColor(pick(['bg_color', 'bg', 'background'], 'transparent'), 'transparent');
  var itemBg = bColor(pick(['item_bg_color', 'card_bg_color'], d.item_card ? 'rgba(127,127,127,.08)' : 'transparent'), 'transparent');
  var titleColor = bColor(pick(['title_color', 'text', 'text_color'], '#0F172A'), '#0F172A');
  var descColor = bColor(pick(['desc_color', 'sub', 'description_color'], '#64748B'), '#64748B');
  var titleSize = bNum(pick(['title_size', 'text_size'], 14), 14);
  var descSize = bNum(pick(['desc_size', 'description_size'], 12), 12);
  var gap = Math.max(0, bNum(pick(['gap'], 12), 12));
  var radius = bNum(pick(['radius', 'border_radius'], 12), 12);
  var itemRadius = bNum(pick(['item_radius', 'card_radius'], 10), 10);
  var padY = bNum(pick(['padding_y'], 12), 12), padX = bNum(pick(['padding_x'], 16), 16);
  var itemPad = bNum(pick(['item_padding', 'card_padding'], 8), 8);
  var bw = bNum(pick(['border_width'], d.border ? 1 : 0), 0);
  var bc = bColor(pick(['border_color', 'border'], '#E2E8F0'), '#E2E8F0');
  var mt = bNum(pick(['margin_top'], 12), 12), mb = bNum(pick(['margin_bottom'], 12), 12);
  var maxW = bNum(pick(['max_width'], 0), 0);
  var cols = Math.max(1, Math.round(bNum(pick(['columns'], n), n)));
  var vis = Math.max(1, bNum(pick(['mobile_visible', 'mobile_cols'], pos === 'top' ? 2 : 1), 1));
  var carousel = n > vis && d.mobile !== 'stack';
  var autoplay = carousel && pick(['mobile_autoplay'], true) !== false;
  var ms = Math.max(1500, bNum(pick(['autoplay_ms'], 3500), 3500));
  var showDots = carousel && pick(['mobile_dots'], true) !== false;
  var dotOff = '#CBD5E1';

  var host = mk('div', 'display:block;width:100%');
  host.id = 'sll-widgets-card-' + (r.id || '');
  var sh = host.attachShadow({ mode: 'open' });

  var css = document.createElement('style');
  css.textContent =
    '.sll-b-track{display:grid;grid-template-columns:repeat(' + cols + ',minmax(0,1fr));gap:' + gap + 'px;position:relative}' +
    '.sll-b-dots{display:none}' + (d.divider ? '@media (min-width:769px){.sll-b-item + .sll-b-item{border-left:1px solid ' + bc + '}}' : '') +
    (carousel ? '@media (max-width:768px){' +
      '.sll-b-track{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;scrollbar-width:none}' +
      '.sll-b-track::-webkit-scrollbar{display:none}' +
      '.sll-b-item{flex:0 0 calc((100% - ' + (gap * (vis - 1)) + 'px) / ' + vis + ');scroll-snap-align:start}' +
      '.sll-b-dots{display:flex;justify-content:center;gap:6px;margin-top:10px}}' : '@media (max-width:768px){.sll-b-track{grid-template-columns:repeat(' + (d.mobile === 'stack' ? 1 : Math.max(1, Math.min(n, Math.ceil(vis)))) + ',minmax(0,1fr))}}');
  sh.appendChild(css);

  var box = mk('div', 'box-sizing:border-box;width:100%;font-family:inherit;margin:' + mt + 'px auto ' + mb + 'px;padding:' + padY + 'px ' + padX + 'px;background:' + bg +
    ';border-radius:' + radius + 'px;' + (maxW > 0 ? 'max-width:' + maxW + 'px;' : '') + (bw > 0 ? 'border:' + bw + 'px solid ' + bc + ';' : ''));
  if (pick(['show_title'], true) !== false && r.title) {
    box.appendChild(mk('div', 'color:' + titleColor + ';font-size:' + (titleSize + 2) + 'px;font-weight:700;text-align:center;margin-bottom:12px;line-height:1.3', r.title));
  }

  var track = mk('div');
  track.className = 'sll-b-track';

  tiers.forEach(function (t) {
    var x = bTexts(t);
    var href = t.link && /^(https?:)?\/\//i.test(String(t.link)) ? String(t.link) : '';
    var itemBorder = d.item_card ? 'border:1px solid ' + bc + ';' : '';
    var dir = pos === 'top' ? 'flex-direction:column;text-align:center;' : (pos === 'right' ? 'flex-direction:row-reverse;text-align:right;' : 'flex-direction:row;text-align:left;');
    var el = mk(href ? 'a' : 'div', 'box-sizing:border-box;min-width:0;display:flex;align-items:center;justify-content:center;gap:10px;padding:' + itemPad +
      'px;border-radius:' + itemRadius + 'px;background:' + itemBg + ';text-decoration:none;' + itemBorder + dir);
    el.className = 'sll-b-item';
    if (href) { el.href = href; el.target = '_blank'; el.rel = 'noopener noreferrer'; }

    var ic = t.icon || t.icon_name || t.iconName;
    if (size > 0 && (ic || t.icon_svg)) {
      var svg = bCustom(t.icon_svg, size, bColor(t.icon_color, accent)) || bIcon(ic, size, bColor(t.icon_color, accent));
      if (svg) {
        var bx = Math.round(size * 1.7);
        var h = mk('div', 'flex:0 0 auto;display:flex;align-items:center;justify-content:center;' +
          (iconBg !== 'none' ? 'width:' + bx + 'px;height:' + bx + 'px;background:' + iconBgColor + ';border-radius:' + (iconBg === 'circle' ? '50%' : '10px') + ';' : ''));
        h.innerHTML = svg;
        el.appendChild(h);
      }
    }
    var tx = mk('div', 'min-width:0');
    if (x.title) tx.appendChild(mk('div', 'color:' + titleColor + ';font-size:' + titleSize + 'px;font-weight:700;line-height:1.25', x.title));
    if (x.desc) tx.appendChild(mk('div', 'color:' + descColor + ';font-size:' + descSize + 'px;line-height:1.3;margin-top:2px', x.desc));
    el.appendChild(tx);
    track.appendChild(el);
  });
  box.appendChild(track);

  var steps = Math.max(1, n - Math.floor(vis) + 1);
  var dotEls = [], cur = 0, paused = false;
  function paintDots() { dotEls.forEach(function (b, i) { b.style.background = i === cur ? accent : dotOff; }); }
  function goTo(i) {
    cur = i; var it = track.children[i];
    if (it && track.scrollTo) track.scrollTo({ left: it.offsetLeft, behavior: 'smooth' });
    paintDots();
  }
  if (showDots) {
    var dw = mk('div'); dw.className = 'sll-b-dots';
    for (var i = 0; i < steps; i++) {
      (function (i) {
        var b = mk('button', 'width:8px;height:8px;border-radius:50%;border:0;padding:0;cursor:pointer;background:' + dotOff);
        b.setAttribute('aria-label', 'Item ' + (i + 1));
        b.onclick = function () { goTo(i); };
        dotEls.push(b); dw.appendChild(b);
      })(i);
    }
    box.appendChild(dw);
    paintDots();
  }
  if (carousel) {
    track.addEventListener('scroll', function () {
      if (track.children.length < 2) return;
      var w = track.children[1].offsetLeft - track.children[0].offsetLeft;
      if (!w) return;
      cur = Math.max(0, Math.min(steps - 1, Math.round(track.scrollLeft / w)));
      paintDots();
    }, { passive: true });
  }
  if (autoplay) {
    var mq = window.matchMedia('(max-width: 768px)');
    ['touchstart', 'pointerdown', 'mouseenter'].forEach(function (ev) { track.addEventListener(ev, function () { paused = true; }, { passive: true }); });
    ['touchend', 'touchcancel', 'pointerup', 'mouseleave'].forEach(function (ev) {
      track.addEventListener(ev, function () { setTimeout(function () { paused = false; }, 3000); }, { passive: true });
    });
    setInterval(function () {
      if (paused || !mq.matches || !host.isConnected) return;
      goTo((cur + 1) % steps);
    }, ms);
  }

  if (pick(['show_footer'], true) !== false && r.footer) {
    box.appendChild(mk('div', 'color:' + descColor + ';font-size:' + descSize + 'px;text-align:center;margin-top:12px;line-height:1.3', r.footer));
  }
  sh.appendChild(box);
  return host;
}
/* SLL_BENEFITS_END */
  function buildRuler(conf) {
    var r = conf.ruler, st = conf.style || {};
    var mobile = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
    var a = Object.assign({}, DEF, (mobile ? st.mobile : st.desktop) || st.desktop || {});
    var tiers = (r.tiers || []).filter(function (t) { return t && (t.label || t.value || (t.lines || []).some(function (l) { return l && l.text; })); });
    var n = tiers.length;

    var host = mk('div', 'display:block;width:100%');
    host.id = 'sll-widgets-card-' + (r.id || '');
    var sh = host.attachShadow({ mode: 'open' });
    var box = mk('div', 'box-sizing:border-box;width:100%;font-family:inherit;margin:' + a.margin_top + 'px auto ' + a.margin_bottom + 'px;padding:' +
      a.padding_y + 'px ' + a.padding_x + 'px;background:' + a.bg_color + ';border-radius:' + a.border_radius + 'px;' +
      (a.max_width > 0 ? 'max-width:' + a.max_width + 'px;' : '') +
      (a.border_width > 0 ? 'border:' + a.border_width + 'px solid ' + a.border_color + ';' : ''));
    if (a.show_title && r.title) {
      box.appendChild(mk('div', 'color:' + a.title_color + ';font-size:' + a.title_size + 'px;font-weight:' + (a.title_bold ? 700 : 400) +
        ';text-align:' + a.title_align + ';margin-bottom:12px;line-height:1.3', r.title));
    }
    if (a.layout === 'cards' && n > 0) {
          box.appendChild(buildCards(a, tiers).el);
        } else if (n > 0) {
      var wrap = mk('div', 'position:relative');
      wrap.appendChild(mk('div', 'position:absolute;left:' + (50 / n) + '%;right:' + (50 / n) + '%;top:' + (a.marker_size / 2 - a.bar_height / 2) +
        'px;height:' + a.bar_height + 'px;background:' + a.track_color + ';border-radius:' + a.bar_height + 'px'));
      var row = mk('div', 'position:relative;display:flex');
      tiers.forEach(function (t) {
        var c = mk('div', 'flex:1;min-width:0;text-align:center');
        c.appendChild(a.show_markers
          ? mk('div', 'width:' + a.marker_size + 'px;height:' + a.marker_size + 'px;border-radius:50%;background:' + a.accent_color +
              ';border:2px solid ' + a.bg_color + ';box-sizing:border-box;margin:0 auto')
          : mk('div', 'height:' + a.marker_size + 'px'));
        c.appendChild(mk('div', 'margin-top:6px;font-size:' + a.text_size + 'px;color:' + a.text_color + ';line-height:1.25', t.label || ''));
        c.appendChild(mk('div', 'font-size:' + (a.text_size + 1) + 'px;color:' + a.accent_color + ';font-weight:700;line-height:1.25', t.value || ''));
        row.appendChild(c);
      });
      wrap.appendChild(row);
      box.appendChild(wrap);
    }
    if (a.show_footer && r.footer) {
      box.appendChild(mk('div', 'color:' + a.footer_color + ';font-size:' + a.footer_size + 'px;text-align:' + a.footer_align +
        ';margin-top:12px;line-height:1.3', r.footer));
    }
    sh.appendChild(box);
    return host;
  }

  function place(target, host, pos) {
    var where = { before: 'beforebegin', after: 'afterend', prepend: 'afterbegin', append: 'beforeend' }[pos] || 'beforebegin';
    target.insertAdjacentElement(where, host);
  }

  function mount(conf, builder) {
    var p = conf.ruler.placement || {};
    if (!p.selector) return;
    var host = (builder || buildRuler)(conf);
    function tryPlace() {
      if (host.isConnected) return true;
      var t; try { t = document.querySelector(p.selector); } catch (e) { return true; }
      if (!t) return false;
      place(t, host, p.position);
      return true;
    }
    tryPlace();
    var started = Date.now();
    var mo = new MutationObserver(function () {
      if (Date.now() - started > 60000) { mo.disconnect(); return; }
      tryPlace();
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }

  function init() {
    var token = new URLSearchParams(location.search).get('sllPickToken');
    if (token && /^sel_[0-9a-f]{32}$/.test(token)) { startPicker(token); return; }
    if (!STORE_ID) return;
    rpc('widgets_public_config', { p_store_id: STORE_ID }).then(function (conf) {
      if (!conf) return;
          var list = conf.cards || (conf.ruler ? [conf.ruler] : []);
          list.forEach(function (c) { mount({ ruler: c, style: c.style || conf.style }, c.kind === 'benefits' ? buildBenefits : null); });
    }).catch(function () {});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

