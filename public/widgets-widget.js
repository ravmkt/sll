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
    var c = mk('div', 'box-sizing:border-box;flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;text-align:center;' +
      'padding:' + a.card_padding + 'px;border-radius:' + a.card_radius + 'px;border:' + a.card_border_width + 'px solid ' + bc + ';background:' + bg +
      (hl && a.hl_glow ? ';box-shadow:0 0 0 1px ' + bc + ',0 0 22px ' + bc + '55' : ''));
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
  var vp = mk('div', 'overflow:hidden;width:100%;padding:8px 0;touch-action:pan-y;cursor:grab;user-select:none;-webkit-user-select:none');
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

  function buildRuler(conf) {
    var r = conf.ruler, st = conf.style || {};
    var mobile = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
    var a = Object.assign({}, DEF, (mobile ? st.mobile : st.desktop) || st.desktop || {});
    var tiers = (r.tiers || []).filter(function (t) { return t && (t.label || t.value || (t.lines || []).some(function (l) { return l && l.text; })); });
    var n = tiers.length;

    var host = mk('div', 'display:block;width:100%');
    host.id = 'sll-widgets-ruler';
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

  function mount(conf) {
    var p = conf.ruler.placement || {};
    if (!p.selector) return;
    var host = buildRuler(conf);
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
      if (conf && conf.ruler) mount(conf);
    }).catch(function () {});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
