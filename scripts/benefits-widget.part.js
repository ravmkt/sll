/* SLL_BENEFITS_START */
var SLL_ICONS = /*ICONS*/{}/*ICONS_END*/;

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
    if (!t) return false; var x = bTexts(t); return x.title || x.desc || t.icon || t.icon_name;
  });
  var n = tiers.length;
  var pos = (r.icon_position === 'top' || r.icon_position === 'right') ? r.icon_position : 'left';
  var size = Math.max(0, Math.min(96, bNum(r.icon_size, 28)));
  var iconBg = (r.icon_bg === 'circle' || r.icon_bg === 'square') ? r.icon_bg : 'none';
  var accent = bColor(r.icon_color || pick(['icon_color', 'accent_color'], ''), '#0094EB');
  var iconBgColor = bColor(r.icon_bg_color || pick(['icon_bg_color'], ''), '#E0F2FE');

  var bg = bColor(pick(['bg_color', 'bg', 'background'], 'transparent'), 'transparent');
  var itemBg = bColor(pick(['item_bg_color', 'card_bg_color'], 'transparent'), 'transparent');
  var titleColor = bColor(pick(['title_color', 'text_color'], '#0F172A'), '#0F172A');
  var descColor = bColor(pick(['desc_color', 'description_color'], '#64748B'), '#64748B');
  var titleSize = bNum(pick(['title_size', 'text_size'], 14), 14);
  var descSize = bNum(pick(['desc_size', 'description_size'], 12), 12);
  var gap = Math.max(0, bNum(pick(['gap'], 12), 12));
  var radius = bNum(pick(['radius', 'border_radius'], 12), 12);
  var itemRadius = bNum(pick(['item_radius', 'card_radius'], 10), 10);
  var padY = bNum(pick(['padding_y'], 12), 12), padX = bNum(pick(['padding_x'], 16), 16);
  var itemPad = bNum(pick(['item_padding', 'card_padding'], 8), 8);
  var bw = bNum(pick(['border_width'], 0), 0);
  var bc = bColor(pick(['border_color'], '#E2E8F0'), '#E2E8F0');
  var mt = bNum(pick(['margin_top'], 12), 12), mb = bNum(pick(['margin_bottom'], 12), 12);
  var maxW = bNum(pick(['max_width'], 0), 0);
  var cols = Math.max(1, Math.round(bNum(pick(['columns'], n), n)));
  var vis = Math.max(1, bNum(pick(['mobile_visible', 'mobile_cols'], pos === 'top' ? 2 : 1), 1));
  var carousel = n > vis;
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
    '.sll-b-dots{display:none}' +
    (carousel ? '@media (max-width:768px){' +
      '.sll-b-track{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;scrollbar-width:none}' +
      '.sll-b-track::-webkit-scrollbar{display:none}' +
      '.sll-b-item{flex:0 0 calc((100% - ' + (gap * (vis - 1)) + 'px) / ' + vis + ');scroll-snap-align:start}' +
      '.sll-b-dots{display:flex;justify-content:center;gap:6px;margin-top:10px}}' : '@media (max-width:768px){.sll-b-track{grid-template-columns:repeat(' + Math.max(1, Math.min(n, Math.ceil(vis))) + ',minmax(0,1fr))}}');
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
    var dir = pos === 'top' ? 'flex-direction:column;text-align:center;' : (pos === 'right' ? 'flex-direction:row-reverse;text-align:right;' : 'flex-direction:row;text-align:left;');
    var el = mk(href ? 'a' : 'div', 'box-sizing:border-box;min-width:0;display:flex;align-items:center;justify-content:center;gap:10px;padding:' + itemPad +
      'px;border-radius:' + itemRadius + 'px;background:' + itemBg + ';text-decoration:none;' + dir);
    el.className = 'sll-b-item';
    if (href) { el.href = href; el.target = '_blank'; el.rel = 'noopener noreferrer'; }

    var ic = t.icon || t.icon_name || t.iconName;
    if (size > 0 && ic) {
      var svg = bIcon(ic, size, bColor(t.icon_color, accent));
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