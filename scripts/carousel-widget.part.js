function buildCarousel(conf) {
  var r = conf.ruler || {}, d = r.design || {};
  function num(v, def) { v = Number(v); return isFinite(v) ? v : def; }
  function col(v, def) { return (typeof v === 'string' && /^(#[0-9a-f]{3,8}|rgba?\([^)]*\)|transparent)$/i.test(v.trim())) ? v.trim() : def; }
  function url(u, re) { return (typeof u === 'string' && re.test(u.trim())) ? u.trim() : ''; }
  var reImg = /^https?:\/\//i, reLink = /^(https?:\/\/|\/(?!\/))/i;
  var items = (r.tiers || []).filter(function (t) { return t && url(t.image, reImg); });
  var shape = (d.shape === 'circle' || d.shape === 'rounded') ? d.shape : 'square';
  var gap = Math.max(0, Math.min(48, num(d.gap, 16)));
  var pd = Math.max(1, num(d.per_desktop, 6)), pm = Math.max(1, num(d.per_mobile, 2.5));
  var radius = shape === 'circle' ? '50%' : shape === 'rounded' ? Math.max(0, num(d.img_radius, 12)) + 'px' : '0';
  var aspect = shape === 'circle' ? '1 / 1' : (/^\d+ \/ \d+$/.test(d.aspect || '') ? d.aspect : '1 / 1');
  var fit = d.fit === 'cover' ? 'cover' : 'contain';
  var imgBg = col(d.img_bg, '#F5F5F5');
  var border = d.border_on ? (Math.max(1, num(d.border_w, 1)) + 'px solid ' + col(d.border_color, '#E2E8F0')) : 'none';
  var capPos = (d.caption_pos === 'overlay' || d.caption_pos === 'none') ? d.caption_pos : 'below';
  var capColor = col(d.caption_color, '#111111'), capSize = Math.max(9, Math.min(28, num(d.caption_size, 13)));
  var arrowColor = col(d.arrow_color, '#111111');
  var titleColor = col(d.title_color, '#111111');
  var wrapCss = (d.bg_on === true ? 'background:' + col(d.bg_color, '#FFFFFF') + ';' : '') + 'padding:' + Math.max(0, Math.min(48, num(d.pad, 0))) + 'px;';
  var showArrows = d.arrows !== false;
  var autoplay = d.autoplay === true, ms = Math.max(1500, num(d.autoplay_ms, 4000));

  var host = document.createElement('div');
  host.id = 'sll-widgets-card-' + (r.id || '');
  host.style.cssText = 'display:block;width:100%';
  var sh = host.attachShadow({ mode: 'open' });
  var st = document.createElement('style');
  st.textContent =
    ':host{display:block}.w{position:relative;margin:12px 0;font-family:inherit;box-sizing:border-box;' + wrapCss + '}' +
    '.ttl{text-align:center;font-weight:800;font-size:18px;margin-bottom:12px;color:' + titleColor + '}' +
    '.t{--gap:' + gap + 'px;--pv:' + pd + ';display:flex;gap:var(--gap);overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;-webkit-overflow-scrolling:touch}' +
    '.t::-webkit-scrollbar{display:none}' +
    '.i{flex:0 0 calc((100% - var(--gap) * (var(--pv) - 1)) / var(--pv));scroll-snap-align:start;min-width:0;display:block;text-decoration:none;color:inherit}' +
    '.m{position:relative;overflow:hidden;box-sizing:border-box;width:100%;aspect-ratio:' + aspect + ';background:' + imgBg + ';border-radius:' + radius + ';border:' + border + '}' +
    '.m img{width:100%;height:100%;object-fit:' + fit + ';display:block;-webkit-user-drag:none;user-select:none}' +
    '.c{margin-top:8px;text-align:center;font-size:' + capSize + 'px;color:' + capColor + ';line-height:1.3;overflow-wrap:anywhere}' +
    '.c.o{position:absolute;left:0;right:0;bottom:0;margin:0;padding:22px 8px 8px;color:#fff;background:linear-gradient(transparent,rgba(0,0,0,.6))}' +
    '.a{position:absolute;top:50%;transform:translateY(-50%);width:34px;height:34px;border:0;border-radius:50%;background:rgba(255,255,255,.95);box-shadow:0 1px 4px rgba(0,0,0,.25);color:' + arrowColor + ';cursor:pointer;display:none;align-items:center;justify-content:center;padding:0;z-index:2}' +
    '.a svg{width:18px;height:18px}.a[disabled]{opacity:.35;cursor:default}.a.p{left:4px}.a.n{right:4px}' +
    '@media (max-width:768px){.t{--pv:' + pm + '}.a{display:none!important}}';
  sh.appendChild(st);

  var wrap = document.createElement('div'); wrap.className = 'w';
  if (r.title && String(r.title).trim()) { var ttl = document.createElement('div'); ttl.className = 'ttl'; ttl.textContent = r.title; wrap.appendChild(ttl); }
  var track = document.createElement('div'); track.className = 't';
  items.forEach(function (t) {
    var href = url(t.link, reLink);
    var el = document.createElement(href ? 'a' : 'div'); el.className = 'i';
    if (href) el.setAttribute('href', href);
    var m = document.createElement('div'); m.className = 'm';
    var img = document.createElement('img');
    img.src = url(t.image, reImg); img.alt = t.label || ''; img.loading = 'lazy'; img.draggable = false;
    m.appendChild(img);
    if (capPos === 'overlay' && t.label) { var o = document.createElement('div'); o.className = 'c o'; o.textContent = t.label; m.appendChild(o); }
    el.appendChild(m);
    if (capPos === 'below' && t.label) { var c = document.createElement('div'); c.className = 'c'; c.textContent = t.label; el.appendChild(c); }
    track.appendChild(el);
  });
  wrap.appendChild(track);

  var chevL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>';
  var chevR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>';
  var prev = document.createElement('button'), next = document.createElement('button');
  prev.type = next.type = 'button'; prev.className = 'a p'; next.className = 'a n';
  prev.setAttribute('aria-label', 'Anterior'); next.setAttribute('aria-label', 'Próximo');
  prev.innerHTML = chevL; next.innerHTML = chevR;
  function step() { var f = track.querySelector('.i'); return f ? f.getBoundingClientRect().width + gap : track.clientWidth; }
  function page() { var s = step(); return Math.max(1, Math.floor(track.clientWidth / s)) * s; }
  function upd() {
    var on = showArrows && track.scrollWidth > track.clientWidth + 2;
    prev.style.display = next.style.display = on ? 'flex' : 'none';
    prev.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
  }
  prev.addEventListener('click', function () { track.scrollBy({ left: -page(), behavior: 'smooth' }); });
  next.addEventListener('click', function () { track.scrollBy({ left: page(), behavior: 'smooth' }); });
  track.addEventListener('scroll', upd, { passive: true });
  window.addEventListener('resize', upd);
  [].forEach.call(track.querySelectorAll('img'), function (im) { im.addEventListener('load', upd); });
  setTimeout(upd, 300); setTimeout(upd, 1500);
  if (showArrows) { wrap.appendChild(prev); wrap.appendChild(next); }

  if (autoplay && items.length > 1) {
    var paused = false;
    track.addEventListener('mouseenter', function () { paused = true; });
    track.addEventListener('mouseleave', function () { paused = false; });
    track.addEventListener('touchstart', function () { paused = true; }, { passive: true });
    track.addEventListener('touchend', function () { setTimeout(function () { paused = false; }, 4000); }, { passive: true });
    setInterval(function () {
      if (paused || document.hidden || !host.isConnected || track.scrollWidth <= track.clientWidth + 2) return;
      if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 4) track.scrollTo({ left: 0, behavior: 'smooth' });
      else track.scrollBy({ left: step(), behavior: 'smooth' });
    }, ms);
  }
  sh.appendChild(wrap);
  return host;
}
