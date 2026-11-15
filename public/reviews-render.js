(function () {
  if (window.SLLReviews) return;
  var DEF = { title: 'O que nossos clientes dizem', show_title: true, accent: '#0094EB', star_color: '#F5A623', bg: '#FFFFFF',
    text: '#334155', title_color: '#0F172A', card_bg: '#FFFFFF', border: '#E2E8F0', radius: 12, font: 'inherit', max_width: 0,
    margin_y: 16, columns: 3, show_avatar: true, show_stars: true, show_date: true, show_source: true, show_verified: true,
    show_media: true, show_summary: true };

  var CSS = [
    '*{box-sizing:border-box}',
    ':host{display:block}',
    '.r{background:var(--bg);color:var(--tx);font-family:var(--ff);padding:16px;border-radius:var(--rd);margin:var(--my) auto;line-height:1.45;font-size:14px}',
    '.tt{margin:0 0 14px;color:var(--tt);font-size:20px;font-weight:800}',
    '.stars{position:relative;display:inline-block;white-space:nowrap;letter-spacing:1px;font-size:15px;line-height:1}',
    '.stars.big{font-size:22px}.stars .bg{color:#CBD5E1}',
    '.stars .fg{position:absolute;left:0;top:0;overflow:hidden;color:var(--st)}',
    '.cd{background:var(--cb);border:1px solid var(--bd);border-radius:var(--rd);padding:14px;display:flex;flex-direction:column;gap:8px;min-width:0}',
    '.who{display:flex;gap:10px;align-items:center}',
    '.av{width:36px;height:36px;border-radius:50%;background:var(--ac);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;flex:none}',
    '.nm{font-weight:700;color:var(--tt)}.sub{font-size:12px;color:#64748B}.vf{color:#059669}',
    '.ct{font-weight:700;color:var(--tt)}.cbd{margin:0;white-space:pre-line;word-break:break-word}',
    '.th{display:flex;gap:6px;flex-wrap:wrap}',
    '.tb{position:relative;width:64px;height:64px;padding:0;border:1px solid var(--bd);border-radius:8px;overflow:hidden;background:#F1F5F9;cursor:pointer}',
    '.tb img,.tile img{width:100%;height:100%;object-fit:cover;display:block}',
    '.pl{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#fff;background:rgba(0,0,0,.35);font-size:18px}',
    '.trk{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;padding:2px 2px 10px}',
    '.trk .cd{flex:0 0 min(320px,85%);scroll-snap-align:start}',
    '.grid{display:grid;grid-template-columns:repeat(var(--cols),minmax(0,1fr));gap:12px}',
    '.sm{display:flex;gap:20px;align-items:center;margin-bottom:14px;flex-wrap:wrap}',
    '.avg{font-size:44px;font-weight:800;color:var(--tt);line-height:1}.cnt{font-size:12px;color:#64748B}',
    '.bars{flex:1;min-width:180px;display:flex;flex-direction:column;gap:4px}',
    '.br{display:flex;align-items:center;gap:8px;font-size:12px}',
    '.tr{flex:1;height:8px;border-radius:8px;background:#E2E8F0;overflow:hidden}.tr i{display:block;height:100%;background:var(--st)}',
    '.sp{text-align:center;max-width:680px;margin:0 auto;position:relative;padding:0 38px}',
    '.nv{position:absolute;top:40%;width:32px;height:32px;border-radius:50%;border:1px solid var(--bd);background:var(--cb);cursor:pointer;font-size:18px;color:var(--tx)}',
    '.nv.p{left:0}.nv.n{right:0}',
    '.qm{font-size:56px;line-height:.6;color:var(--ac);font-family:Georgia,serif}',
    '.spt{font-size:18px;font-style:italic;margin:10px 0;white-space:pre-line}',
    '.sp .who,.sp .th{justify-content:center}',
    '.dots{display:flex;gap:6px;justify-content:center;margin-top:10px}',
    '.dots i{width:7px;height:7px;border-radius:50%;background:#CBD5E1}.dots i.on{background:var(--ac)}',
    '.wall{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}',
    '.tile{position:relative;aspect-ratio:1;padding:0;border:0;border-radius:var(--rd);overflow:hidden;cursor:pointer;background:#F1F5F9}',
    '.ov{position:absolute;left:0;right:0;bottom:0;padding:6px 8px;background:linear-gradient(transparent,rgba(0,0,0,.65));color:#fff;text-align:left;font-size:12px}',
    '.ov .stars .bg{color:rgba(255,255,255,.4)}',
    '.two{display:grid;grid-template-columns:240px minmax(0,1fr);gap:24px}',
    '.two .sm{flex-direction:column;align-items:stretch}.col{display:flex;flex-direction:column;gap:12px}',
    '.pill{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
    '.qt{border-left:3px solid var(--ac);padding:4px 0 4px 14px;display:flex;flex-direction:column;gap:8px}',
    '.r-ml_style .avg{font-weight:300;font-size:56px}',
    '.mlh{font-weight:600;color:var(--tt);font-size:16px;margin:6px 0}',
    '.mli{border-top:1px solid var(--bd);padding:14px 0;display:flex;flex-direction:column;gap:6px}',
    '.mlr{display:flex;justify-content:space-between;align-items:center}',
    '.lb{position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.8);display:flex;align-items:center;justify-content:center;padding:16px}',
    '.lbb{max-width:min(92vw,900px);max-height:92vh;display:flex;flex-direction:column;gap:8px;color:#fff}',
    '.lbb img,.lbb video{max-width:100%;max-height:78vh;border-radius:8px;display:block;margin:0 auto}',
    '.lbc{font-size:13px;max-height:12vh;overflow:auto}',
    '.lbx{position:absolute;top:12px;right:16px;background:none;border:0;color:#fff;font-size:34px;cursor:pointer}',
    '@media(max-width:640px){.grid{grid-template-columns:1fr}.wall{grid-template-columns:repeat(2,minmax(0,1fr))}.two{grid-template-columns:1fr}.sp{padding:0 30px}}'
  ].join('');

  function mk(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function num(v, d) { v = Number(v); return isFinite(v) ? v : d; }
  function fa(v) { return (Math.round(Number(v) * 10) / 10).toFixed(1).replace('.', ','); }
  function pl(c) { return c + (c === 1 ? ' avaliação' : ' avaliações'); }
  function fd(s) { try { return new Date(s).toLocaleDateString('pt-BR'); } catch (e) { return ''; } }
  function merge(a, b) {
    var o = {}, k;
    for (k in a) o[k] = a[k];
    for (k in b) if (b[k] !== undefined && b[k] !== null && b[k] !== '') o[k] = b[k];
    return o;
  }

  function stars(v, big) {
    var w = mk('span', 'stars' + (big ? ' big' : ''));
    w.setAttribute('aria-label', v + ' de 5');
    w.appendChild(mk('span', 'bg', '★★★★★'));
    var f = mk('span', 'fg', '★★★★★');
    f.style.width = (Math.max(0, Math.min(5, v)) / 5 * 100) + '%';
    w.appendChild(f);
    return w;
  }

  function lightbox(root, m, caption) {
    var LBCSS = '*{box-sizing:border-box}.lb{position:fixed;inset:0;background:rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center;padding:16px;font-family:system-ui,sans-serif}.lbb{max-width:min(92vw,900px);max-height:92vh;display:flex;flex-direction:column;gap:8px;color:#fff}.lbb img,.lbb video{max-width:100%;max-height:78vh;border-radius:8px;display:block;margin:0 auto}.lbc{font-size:13px;max-height:12vh;overflow:auto;text-align:center}.lbx{position:absolute;top:12px;right:16px;background:none;border:0;color:#fff;font-size:34px;line-height:1;cursor:pointer}';
    var host = document.createElement('div');
    host.setAttribute('data-sll-lightbox', '');
    host.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:2147483647;transform:none;margin:0;padding:0';
    var sh = host.attachShadow({ mode: 'open' });
    sh.appendChild(mk('style', null, LBCSS));
    var ov = mk('div', 'lb'), box = mk('div', 'lbb'), el;
    if (m.kind === 'video') { el = mk('video'); el.src = m.url; el.controls = true; el.autoplay = true; el.playsInline = true; }
    else { el = mk('img'); el.src = m.url; el.alt = ''; }
    var x = mk('button', 'lbx', '\u00d7'); x.type = 'button';
    var prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    function close() { host.remove(); document.documentElement.style.overflow = prev; document.removeEventListener('keydown', key); }
    function key(e) { if (e.key === 'Escape') close(); }
    ov.onclick = function (e) { if (e.target === ov || e.target === x) close(); };
    document.addEventListener('keydown', key);
    box.appendChild(el);
    if (caption) box.appendChild(mk('div', 'lbc', caption));
    ov.appendChild(x); ov.appendChild(box); sh.appendChild(ov);
    document.documentElement.appendChild(host);
  }

  function thumbs(root, r) {
    if (!r.media || !r.media.length) return null;
    var row = mk('div', 'th');
    r.media.forEach(function (m) {
      var b = mk('button', 'tb'); b.type = 'button';
      var src = m.kind === 'video' ? (m.poster_url || '') : m.url;
      if (src) { var i = mk('img'); i.src = src; i.alt = ''; i.loading = 'lazy'; b.appendChild(i); }
      if (m.kind === 'video') b.appendChild(mk('span', 'pl', '▶'));
      b.onclick = function () { lightbox(root, m, r.body); };
      row.appendChild(b);
    });
    return row;
  }

  function who(r, D) {
    var h = mk('div', 'who');
    if (D.show_avatar) h.appendChild(mk('span', 'av', (r.author_name || 'C').trim().charAt(0).toUpperCase()));
    var t = mk('div');
    t.appendChild(mk('div', 'nm', r.author_name || 'Cliente'));
    var sub = [];
    if (D.show_date && r.review_date) sub.push(fd(r.review_date));
    if (D.show_source && r.source === 'google') sub.push('via Google');
    var line = mk('div', 'sub', sub.join(' · '));
    if (D.show_verified && r.verified) {
      if (sub.length) line.appendChild(document.createTextNode(' · '));
      line.appendChild(mk('span', 'vf', '✔ Compra verificada'));
    }
    if (line.textContent) t.appendChild(line);
    h.appendChild(t);
    return h;
  }

  function card(root, r, D) {
    var c = mk('article', 'cd');
    c.appendChild(who(r, D));
    if (D.show_stars) c.appendChild(stars(r.rating));
    if (r.title) c.appendChild(mk('div', 'ct', r.title));
    if (r.body) c.appendChild(mk('p', 'cbd', r.body));
    if (D.show_media) { var t = thumbs(root, r); if (t) c.appendChild(t); }
    return c;
  }

  function summary(D, s, bars) {
    var b = mk('div', 'sm'), l = mk('div', 'sl');
    l.appendChild(mk('div', 'avg', fa(s.avg)));
    l.appendChild(stars(s.avg, true));
    l.appendChild(mk('div', 'cnt', pl(s.count)));
    b.appendChild(l);
    if (bars) {
      var bx = mk('div', 'bars');
      for (var k = 5; k >= 1; k--) {
        var c = (s.dist && s.dist[k]) || 0, row = mk('div', 'br');
        row.appendChild(mk('span', null, k + '★'));
        var tr = mk('div', 'tr'), f = mk('i');
        f.style.width = (s.count ? c / s.count * 100 : 0) + '%';
        tr.appendChild(f); row.appendChild(tr); row.appendChild(mk('span', 'cnt', String(c)));
        bx.appendChild(row);
      }
      b.appendChild(bx);
    }
    return b;
  }

  var T = {};

  T.cards_photo = function (root, list, s, D) {
    if (D.show_summary) root.appendChild(summary(D, s, false));
    var tr = mk('div', 'trk');
    list.forEach(function (r) { tr.appendChild(card(root, r, D)); });
    root.appendChild(tr);
  };

  T.cards_clean = function (root, list, s, D) {
    if (D.show_summary) root.appendChild(summary(D, s, false));
    var g = mk('div', 'grid');
    list.forEach(function (r) { g.appendChild(card(root, r, D)); });
    root.appendChild(g);
  };

  T.spotlight = function (root, list, s, D) {
    var i = 0, box = mk('div', 'sp'), q = mk('div'), dots = mk('div', 'dots');
    var p = mk('button', 'nv p', '‹'), nx = mk('button', 'nv n', '›');
    p.type = 'button'; nx.type = 'button';
    function show() {
      q.textContent = ''; dots.textContent = '';
      var r = list[i];
      q.appendChild(mk('div', 'qm', '“'));
      if (D.show_stars) q.appendChild(stars(r.rating, true));
      q.appendChild(mk('p', 'spt', r.body || r.title || ''));
      q.appendChild(who(r, D));
      if (D.show_media) { var t = thumbs(root, r); if (t) q.appendChild(t); }
      list.forEach(function (x, k) { dots.appendChild(mk('i', k === i ? 'on' : '')); });
    }
    p.onclick = function () { i = (i - 1 + list.length) % list.length; show(); };
    nx.onclick = function () { i = (i + 1) % list.length; show(); };
    box.appendChild(q); box.appendChild(dots);
    if (list.length > 1) {
      box.appendChild(p); box.appendChild(nx);
      var tm = setInterval(function () {
        if (!root.isConnected) { clearInterval(tm); return; }
        i = (i + 1) % list.length; show();
      }, 7000);
    }
    show();
    root.appendChild(box);
  };

  T.photo_wall = function (root, list, s, D) {
    var items = [];
    list.forEach(function (r) { (r.media || []).forEach(function (m) { items.push({ r: r, m: m }); }); });
    if (!items.length) { T.cards_clean(root, list, s, D); return; }
    if (D.show_summary) root.appendChild(summary(D, s, false));
    var w = mk('div', 'wall');
    items.forEach(function (it) {
      var t = mk('button', 'tile'); t.type = 'button';
      var src = it.m.kind === 'video' ? (it.m.poster_url || '') : it.m.url;
      if (src) { var im = mk('img'); im.src = src; im.alt = ''; im.loading = 'lazy'; t.appendChild(im); }
      if (it.m.kind === 'video') t.appendChild(mk('span', 'pl', '▶'));
      var ov = mk('div', 'ov');
      if (D.show_stars) ov.appendChild(stars(it.r.rating));
      ov.appendChild(mk('div', null, it.r.author_name || 'Cliente'));
      t.appendChild(ov);
      t.onclick = function () { lightbox(root, it.m, (it.r.author_name || '') + (it.r.body ? ': ' + it.r.body : '')); };
      w.appendChild(t);
    });
    root.appendChild(w);
  };

  T.summary_list = function (root, list, s, D) {
    var w = mk('div', 'two'), c = mk('div', 'col');
    w.appendChild(summary(D, s, true));
    list.forEach(function (r) { c.appendChild(card(root, r, D)); });
    w.appendChild(c); root.appendChild(w);
  };

  T.badge = function (root, list, s, D) {
    var b = mk('div', 'pill');
    if (D.show_stars) b.appendChild(stars(s.avg));
    b.appendChild(mk('strong', null, fa(s.avg)));
    b.appendChild(mk('span', 'cnt', '(' + pl(s.count) + ')'));
    if (D.show_source && list.some(function (r) { return r.source === 'google'; })) b.appendChild(mk('span', 'cnt', '· inclui avaliações do Google'));
    root.appendChild(b);
  };

  T.text_only = function (root, list, s, D) {
    var g = mk('div', 'grid');
    list.forEach(function (r) {
      var q = mk('div', 'qt');
      q.appendChild(mk('p', 'cbd', r.body || r.title || ''));
      q.appendChild(who(r, D));
      g.appendChild(q);
    });
    root.appendChild(g);
  };

  T.ml_style = function (root, list, s, D) {
    root.appendChild(summary(D, s, true));
    root.appendChild(mk('div', 'mlh', 'Opiniões em destaque'));
    list.forEach(function (r) {
      var it = mk('div', 'mli'), row = mk('div', 'mlr');
      if (D.show_stars) row.appendChild(stars(r.rating));
      if (D.show_date) row.appendChild(mk('span', 'sub', fd(r.review_date)));
      it.appendChild(row);
      if (r.title) it.appendChild(mk('div', 'ct', r.title));
      if (r.body) it.appendChild(mk('p', 'cbd', r.body));
      if (D.show_media) { var t = thumbs(root, r); if (t) it.appendChild(t); }
      var ft = mk('div', 'sub');
      if (D.show_verified && r.verified) ft.appendChild(mk('span', 'vf', '✔ Compra verificada'));
      if (r.helpful > 0) ft.appendChild(document.createTextNode((ft.textContent ? ' · ' : '') + 'Útil · ' + r.helpful));
      if (ft.textContent) it.appendChild(ft);
      root.appendChild(it);
    });
  };

  function render(widget, data) {
    var list = (data && data.reviews) || [];
    if (!list.length) return null;
    var s = (data && data.stats) || { count: list.length, avg: 0, dist: {} };
    var D = merge(DEF, (widget && widget.design) || {});
    var tpl = widget && T[widget.template] ? widget.template : 'cards_photo';
    var host = mk('div');
    host.setAttribute('data-sll-reviews', tpl);
    host.style.cssText = 'display:block;width:100%';
    var sh = host.attachShadow({ mode: 'open' });
    sh.appendChild(mk('style', null, CSS));
    var root = mk('section', 'r r-' + tpl), st = root.style;
    st.setProperty('--ac', D.accent); st.setProperty('--st', D.star_color); st.setProperty('--bg', D.bg);
    st.setProperty('--tx', D.text); st.setProperty('--tt', D.title_color); st.setProperty('--cb', D.card_bg);
    st.setProperty('--bd', D.border); st.setProperty('--ff', D.font);
    st.setProperty('--rd', num(D.radius, 12) + 'px'); st.setProperty('--my', num(D.margin_y, 16) + 'px');
    st.setProperty('--cols', String(Math.max(1, Math.min(6, num(D.columns, 3)))));
    if (num(D.max_width, 0) > 0) st.maxWidth = num(D.max_width, 0) + 'px';
    sh.appendChild(root);
    if (D.show_title && D.title && tpl !== 'badge') root.appendChild(mk('h3', 'tt', D.title));
    T[tpl](root, list, s, D);
    return host;
  }

  window.SLLReviews = { render: render };
})();
