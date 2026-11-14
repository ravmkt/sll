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
  var DEF = {
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
    var tiers = (r.tiers || []).filter(function (t) { return t && (t.label || t.value); });
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
    if (n > 0) {
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
