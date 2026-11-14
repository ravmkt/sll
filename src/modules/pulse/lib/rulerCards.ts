// @ts-nocheck
export function buildCards(a, tiers) {
  var timers = [];
  function mk(tag, css, text) {
    var e = document.createElement(tag);
    if (css) e.style.cssText = css;
    if (text != null) e.textContent = text;
    return e;
  }
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
