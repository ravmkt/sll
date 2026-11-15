(function () {
  if (window.SLLReviews) return;
  var DEF = { title: 'O que nossos clientes dizem', show_title: true, accent: '#0094EB', star_color: '#F5A623', bg: '#FFFFFF',
    text: '#334155', title_color: '#0F172A', card_bg: '#FFFFFF', border: '#E2E8F0', radius: 12, font: 'inherit', max_width: 0,
    margin_y: 16, columns: 3, show_avatar: true, show_stars: true, show_date: true, show_source: true, show_verified: true,
    show_media: true, show_summary: true,
    width_mode: '', align: 'center', padding: 16, margin_x: 0, arrows: true, dots: true, drag: true,
    autoplay: false, interval: 5, per_view_desktop: 3, per_view_mobile: 1, loop: true,
    allow_media: true, allow_submit: false, submit_label: 'Escrever avaliação' };

  var CSS = [
    '*{box-sizing:border-box}',
    ':host{display:block}',
    '.r{background:var(--bg);color:var(--tx);font-family:var(--ff);padding:var(--pd);border-radius:var(--rd);margin:var(--my) auto;line-height:1.45;font-size:14px}',
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
    '.trk>*{flex:0 0 calc((100% - 12px*(var(--pv) - 1))/var(--pv));scroll-snap-align:start}',
    '.trk{scrollbar-width:none}.trk::-webkit-scrollbar{display:none}.trk.nd{overflow-x:hidden}.trk.gb{cursor:grab}.trk.dg{cursor:grabbing;user-select:none}.trk img{-webkit-user-drag:none}',
    '.cw{position:relative}.cw .nv{top:50%;margin-top:-16px;z-index:2;padding:0;line-height:1;box-shadow:0 1px 4px rgba(0,0,0,.2)}.cw .nv.p{left:4px}.cw .nv.n{right:4px}.dots i{cursor:pointer}',
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
    '.sbw{margin:0 0 14px}.sb{background:var(--ac);color:#fff;border:0;border-radius:8px;padding:10px 18px;font:inherit;font-weight:700;cursor:pointer}.sb:hover{opacity:.9}',
    '.lb{position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.8);display:flex;align-items:center;justify-content:center;padding:16px}',
    '.lbb{max-width:min(92vw,900px);max-height:92vh;display:flex;flex-direction:column;gap:8px;color:#fff}',
    '.lbb img,.lbb video{max-width:100%;max-height:78vh;border-radius:8px;display:block;margin:0 auto}',
    '.lbc{font-size:13px;max-height:12vh;overflow:auto}',
    '.lbx{position:absolute;top:12px;right:16px;background:none;border:0;color:#fff;font-size:34px;cursor:pointer}',
    '@media(max-width:640px){.grid{grid-template-columns:1fr}.wall{grid-template-columns:repeat(2,minmax(0,1fr))}.two{grid-template-columns:1fr}.sp{padding:0 30px}.trk>*{flex-basis:calc((100% - 12px*(var(--pvm) - 1))/var(--pvm))}}'
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
    if (D.carousel) { carousel(root, list, D, function (r) { return card(root, r, D); }); return; }
    var g = mk('div', 'grid');
    list.forEach(function (r) { g.appendChild(card(root, r, D)); });
    root.appendChild(g);
  };

  T.cards_clean = function (root, list, s, D) {
    if (D.show_summary) root.appendChild(summary(D, s, false));
    if (D.carousel) { carousel(root, list, D, function (r) { return card(root, r, D); }); return; }
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
    function qt(r) {
      var q = mk('div', 'qt');
      q.appendChild(mk('p', 'cbd', r.body || r.title || ''));
      q.appendChild(who(r, D));
      return q;
    }
    if (D.carousel) { carousel(root, list, D, qt); return; }
    var g = mk('div', 'grid');
    list.forEach(function (r) { g.appendChild(qt(r)); });
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

  var FCSS = '*{box-sizing:border-box}' +
    '.o{position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:16px;font-family:var(--ff,system-ui,sans-serif)}' +
    '.m{position:relative;background:var(--bg);color:var(--tx);border-radius:var(--rd);width:min(480px,100%);max-height:92vh;overflow:auto;padding:22px 20px 20px;box-shadow:0 10px 40px rgba(0,0,0,.3);font-size:14px;line-height:1.45}' +
    '.h{margin:0 40px 6px 0;font-size:18px;font-weight:800;color:var(--tt)}' +
    '.x{position:absolute;top:8px;right:12px;background:none;border:0;font-size:30px;line-height:1;cursor:pointer;color:var(--tx)}' +
    'label{display:block;margin-top:10px}label>span,.lb2{display:block;font-weight:600;color:var(--tt);font-size:13px;margin-bottom:4px}' +
    'input,textarea{width:100%;font-family:inherit;font-size:16px;color:var(--tx);background:var(--cb);border:1px solid var(--bd);border-radius:8px;padding:9px 10px;outline:none}' +
    'input:focus,textarea:focus{border-color:var(--ac)}textarea{min-height:96px;resize:vertical}' +
    '.rt{display:flex;gap:4px}.rt button{background:none;border:0;padding:0;font-size:32px;line-height:1;cursor:pointer;color:#CBD5E1}.rt button.on{color:var(--st)}' +
    '.hp{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}' +
    '.hn{font-size:12px;color:#64748B;margin-top:3px}.er{color:#B91C1C;font-size:13px;margin-top:10px;min-height:1px}' +
    '.bt{margin-top:14px;width:100%;padding:11px;border:0;border-radius:8px;background:var(--ac);color:#fff;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer}.bt:disabled{opacity:.6;cursor:default}' +
    '.ok{text-align:center;padding:12px 0 0}.ok b{display:block;font-size:18px;color:var(--tt);margin-bottom:6px}' +
    '.mdw{margin-top:10px}.ad{display:block;width:100%;background:none;border:1px dashed var(--bd);border-radius:8px;padding:10px;color:var(--ac);font:inherit;font-weight:600;cursor:pointer}' +
    '.pvw{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}.pvi{position:relative;width:64px;height:64px;border:1px solid var(--bd);border-radius:8px;overflow:hidden;background:#F1F5F9;display:flex;align-items:center;justify-content:center}' +
    '.pvi img{width:100%;height:100%;object-fit:cover}.pvv{font-size:20px;color:#334155}.pvx{position:absolute;top:0;right:0;width:20px;height:20px;border:0;background:rgba(0,0,0,.65);color:#fff;border-radius:0 0 0 6px;line-height:1;cursor:pointer;padding:0}';

  function formModal(D, opts) {
    var host = document.createElement('div');
    host.setAttribute('data-sll-form', '');
    host.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:2147483647;transform:none;margin:0;padding:0';
    var sh = host.attachShadow({ mode: 'open' });
    sh.appendChild(mk('style', null, FCSS));
    var ov = mk('div', 'o'), vs = ov.style;
    vs.setProperty('--ac', D.accent); vs.setProperty('--st', D.star_color); vs.setProperty('--bg', D.bg);
    vs.setProperty('--tx', D.text); vs.setProperty('--tt', D.title_color); vs.setProperty('--cb', D.card_bg);
    vs.setProperty('--bd', D.border); vs.setProperty('--ff', D.font); vs.setProperty('--rd', num(D.radius, 12) + 'px');
    var box = mk('div', 'm'), x = mk('button', 'x', '\u00d7');
    x.type = 'button'; x.setAttribute('aria-label', 'Fechar');
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
    var prevOv = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    function close() { host.remove(); document.documentElement.style.overflow = prevOv; document.removeEventListener('keydown', key); }
    function key(e) { if (e.key === 'Escape') close(); }
    x.onclick = close;
    document.addEventListener('keydown', key);

    var rating = 0, sts = [], rt = mk('div', 'rt');
    function paint(n) { sts.forEach(function (b, i) { b.className = i < n ? 'on' : ''; }); }
    for (var i = 1; i <= 5; i++) (function (n) {
      var b = mk('button', null, '\u2605'); b.type = 'button';
      b.setAttribute('aria-label', n + (n === 1 ? ' estrela' : ' estrelas'));
      b.onmouseenter = function () { paint(n); };
      b.onclick = function () { rating = n; paint(n); };
      sts.push(b); rt.appendChild(b);
    })(i);
    rt.onmouseleave = function () { paint(rating); };

    function inp(type, max, ac) { var e = mk('input'); e.type = type; e.maxLength = max; if (ac) e.autocomplete = ac; return e; }
    function fld(t, el, hint) {
      var l = mk('label'); l.appendChild(mk('span', null, t)); l.appendChild(el);
      if (hint) l.appendChild(mk('div', 'hn', hint));
      return l;
    }
    var nm = inp('text', 80, 'name'), em = inp('email', 120, 'email'), tt = inp('text', 120), bd = mk('textarea');
    bd.maxLength = 2000;
    var hp = inp('text', 50, 'off'); hp.className = 'hp'; hp.tabIndex = -1; hp.setAttribute('aria-hidden', 'true');
    var err = mk('div', 'er'); err.setAttribute('role', 'alert');
    var go = mk('button', 'bt', 'Enviar avalia\u00e7\u00e3o'); go.type = 'button';

    var form = mk('div'), rw = mk('div');
    rw.style.marginTop = '10px';
    rw.appendChild(mk('div', 'lb2', 'Sua nota *')); rw.appendChild(rt);
    form.appendChild(mk('h4', 'h', 'Escrever avalia\u00e7\u00e3o'));
    form.appendChild(rw);
    form.appendChild(fld('Nome *', nm));
    form.appendChild(fld('E-mail *', em, 'Seu e-mail n\u00e3o ser\u00e1 exibido.'));
    form.appendChild(fld('T\u00edtulo (opcional)', tt));
    form.appendChild(fld('Sua avalia\u00e7\u00e3o *', bd));
    var files = [], MAXF = 3;
    function isVid(f) { return f.type === 'video/mp4' || f.type === 'video/webm'; }
    function upAll() {
      if (!files.length || !opts || !opts.upload) return Promise.resolve([]);
      var res = [], seq = Promise.resolve();
      files.forEach(function (f, k) {
        seq = seq.then(function () {
          go.textContent = 'Enviando arquivo ' + (k + 1) + '/' + files.length + '\u2026';
          return opts.upload(f);
        }).then(function (m) { res.push(m); });
      });
      return seq.then(function () { go.textContent = 'Enviando\u2026'; return res; });
    }
    if (D.allow_media !== false) {
      var mdw = mk('div', 'mdw'), fi = mk('input'), pv = mk('div', 'pvw');
      var ad = mk('button', 'ad', '+ Adicionar foto ou v\u00eddeo'); ad.type = 'button';
      fi.type = 'file'; fi.accept = 'image/*,video/mp4,video/webm'; fi.multiple = true; fi.style.display = 'none';
      var drawFiles = function () {
        pv.textContent = '';
        files.forEach(function (f, k) {
          var c = mk('div', 'pvi');
          if (f.type.indexOf('image/') === 0) {
            var im = mk('img'); im.alt = ''; im.src = URL.createObjectURL(f);
            im.onload = function () { URL.revokeObjectURL(im.src); };
            c.appendChild(im);
          } else c.appendChild(mk('span', 'pvv', '\u25b6'));
          var rm = mk('button', 'pvx', '\u00d7'); rm.type = 'button'; rm.setAttribute('aria-label', 'Remover');
          rm.onclick = function () { files.splice(k, 1); drawFiles(); };
          c.appendChild(rm); pv.appendChild(c);
        });
      };
      ad.onclick = function () { fi.click(); };
      fi.onchange = function () {
        err.textContent = '';
        Array.prototype.forEach.call(fi.files || [], function (f) {
          if (files.length >= MAXF) { err.textContent = 'M\u00e1ximo de 3 arquivos.'; return; }
          if (f.type.indexOf('image/') !== 0 && !isVid(f)) { err.textContent = 'Formato n\u00e3o suportado. Use imagem, mp4 ou webm.'; return; }
          if (isVid(f) && f.size > 30 * 1048576) { err.textContent = 'O v\u00eddeo deve ter at\u00e9 30 MB.'; return; }
          if (isVid(f) && files.some(isVid)) { err.textContent = 'Envie apenas 1 v\u00eddeo.'; return; }
          files.push(f);
        });
        fi.value = ''; drawFiles();
      };
      mdw.appendChild(mk('div', 'lb2', 'Fotos ou v\u00eddeo (opcional)'));
      mdw.appendChild(ad); mdw.appendChild(pv); mdw.appendChild(fi);
      mdw.appendChild(mk('div', 'hn', 'At\u00e9 3 arquivos. V\u00eddeo: 1, de at\u00e9 30 s e 30 MB.'));
      form.appendChild(mdw);
    }
    form.appendChild(hp); form.appendChild(err); form.appendChild(go);

    function done() {
      form.textContent = '';
      var ok = mk('div', 'ok');
      ok.appendChild(mk('b', null, 'Obrigado pela sua avalia\u00e7\u00e3o!'));
      ok.appendChild(mk('div', null, 'Ela ser\u00e1 publicada ap\u00f3s a aprova\u00e7\u00e3o da loja.'));
      var c = mk('button', 'bt', 'Fechar'); c.type = 'button'; c.onclick = close;
      ok.appendChild(c); form.appendChild(ok);
    }
    function reset(msg) { go.disabled = false; go.textContent = 'Enviar avalia\u00e7\u00e3o'; err.textContent = msg; }

    go.onclick = function () {
      err.textContent = '';
      var n = nm.value.trim(), e = em.value.trim(), b = bd.value.trim();
      if (!rating) { err.textContent = 'Escolha uma nota de 1 a 5 estrelas.'; return; }
      if (n.length < 2) { err.textContent = 'Informe seu nome.'; return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) { err.textContent = 'Informe um e-mail v\u00e1lido.'; return; }
      if (b.length < 5) { err.textContent = 'Escreva sua avalia\u00e7\u00e3o (m\u00ednimo 5 caracteres).'; return; }
      if (hp.value) { done(); return; }
      if (!opts || !opts.submit) { err.textContent = 'Pr\u00e9via: o envio funciona apenas na loja.'; return; }
      go.disabled = true; go.textContent = 'Enviando\u2026';
      upAll().then(function (media) { return opts.submit({ rating: rating, name: n, email: e, title: tt.value.trim(), body: b, media: media }); }).then(function (res) {
        if (res && res.ok) { done(); return; }
        var c = res && res.error;
        reset(c === 'duplicate' ? 'Voc\u00ea j\u00e1 avaliou este produto. Obrigado!'
          : c === 'rate_limited' ? 'Muitas avalia\u00e7\u00f5es em pouco tempo. Tente novamente mais tarde.'
          : c === 'invalid' ? 'Confira os campos e tente novamente.'
          : 'N\u00e3o foi poss\u00edvel enviar agora. Tente novamente.');
      }).catch(function (er) { if (er && er.sll) { reset(er.message); return; } reset('N\u00e3o foi poss\u00edvel enviar agora. Tente novamente.'); });
    };

    box.appendChild(x); box.appendChild(form); ov.appendChild(box); sh.appendChild(ov);
    document.documentElement.appendChild(host);
    setTimeout(function () { nm.focus(); }, 50);
  }

  function submitBar(D, opts) {
    var w = mk('div', 'sbw'), b = mk('button', 'sb', D.submit_label || 'Escrever avalia\u00e7\u00e3o');
    b.type = 'button';
    b.onclick = function () { formModal(D, opts); };
    w.appendChild(b);
    return w;
  }

  function carousel(root, list, D, mkItem) {
    var wrap = mk('div', 'cw'), tr = mk('div', 'trk ' + (D.drag === false ? 'nd' : 'gb'));
    list.forEach(function (r) { tr.appendChild(mkItem(r)); });
    wrap.appendChild(tr);
    var dots = mk('div', 'dots'), p = mk('button', 'nv p', '\u2039'), n = mk('button', 'nv n', '\u203a');
    p.type = 'button'; n.type = 'button';
    p.setAttribute('aria-label', 'Anterior'); n.setAttribute('aria-label', 'Pr\u00f3ximo');
    function pv() { return Math.max(1, num(window.innerWidth <= 640 ? D.per_view_mobile : D.per_view_desktop, 1)); }
    function pg() { return Math.max(1, Math.floor(pv())); }
    function stp() {
      var a = tr.children[0], b = tr.children[1];
      return a && b ? (b.getBoundingClientRect().left - a.getBoundingClientRect().left) || 1 : (tr.clientWidth || 1);
    }
    function mx() { return Math.max(0, Math.round((tr.scrollWidth - tr.clientWidth) / stp())); }
    function cur() { return Math.round(tr.scrollLeft / stp()); }
    function go(i) { tr.scrollTo({ left: Math.max(0, i) * stp(), behavior: 'smooth' }); }
    function next() { var i = cur(), m = mx(); if (i >= m) { if (D.loop !== false) go(0); } else go(Math.min(i + pg(), m)); }
    function prev() { var i = cur(); if (i <= 0) { if (D.loop !== false) go(mx()); } else go(Math.max(i - pg(), 0)); }
    function dot(k) { var d = mk('i'); d.onclick = function () { go(Math.min(k * pg(), mx())); }; return d; }
    function refresh() {
      var m = mx(), pages = Math.ceil(m / pg()) + 1, more = m > 0;
      p.style.display = n.style.display = (D.arrows !== false && more) ? '' : 'none';
      dots.style.display = (D.dots !== false && more) ? '' : 'none';
      if (dots.children.length !== pages) {
        dots.textContent = '';
        for (var k = 0; k < pages; k++) dots.appendChild(dot(k));
      }
      var a = cur() >= m ? pages - 1 : Math.min(pages - 1, Math.round(cur() / pg()));
      for (var j = 0; j < dots.children.length; j++) dots.children[j].className = j === a ? 'on' : '';
    }
    p.onclick = prev; n.onclick = next;
    tr.addEventListener('scroll', refresh, { passive: true });
    window.addEventListener('resize', refresh);
    if (window.ResizeObserver) new ResizeObserver(refresh).observe(tr);
    setTimeout(refresh, 300); setTimeout(refresh, 1500);

    if (D.drag !== false) {
      var sx = 0, sl = 0, moved = false;
      var mv = function (e) { var dx = e.clientX - sx; if (Math.abs(dx) > 4) moved = true; tr.scrollLeft = sl - dx; };
      var up = function () {
        document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up);
        tr.classList.remove('dg'); tr.style.scrollSnapType = '';
        if (moved) go(cur());
      };
      tr.addEventListener('pointerdown', function (e) {
        if (e.pointerType !== 'mouse' || e.button !== 0) return;
        moved = false; sx = e.clientX; sl = tr.scrollLeft;
        tr.style.scrollSnapType = 'none'; tr.classList.add('dg');
        document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
      });
      tr.addEventListener('click', function (e) { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
    }

    if (D.autoplay) {
      var hov = false, seen = false;
      wrap.addEventListener('mouseenter', function () { hov = true; });
      wrap.addEventListener('mouseleave', function () { hov = false; });
      wrap.addEventListener('touchstart', function () { hov = true; }, { passive: true });
      wrap.addEventListener('touchend', function () { hov = false; }, { passive: true });
      var tm = setInterval(function () {
        if (root.isConnected) seen = true; else if (seen) { clearInterval(tm); return; }
        if (root.isConnected && !hov && !document.hidden && !tr.classList.contains('dg')) next();
      }, Math.max(1, num(D.interval, 5)) * 1000);
    }
    wrap.appendChild(p); wrap.appendChild(n);
    root.appendChild(wrap); root.appendChild(dots);
  }

  function fit(host, anchor, widget, position) {
    if (!host || !anchor || host.getAttribute('data-sll-wm') !== 'auto') return;
    if (position === 'append' || position === 'prepend') return;
    var inner = (anchor.querySelector && anchor.querySelector('.container')) || anchor;
    function apply() {
      if (!host.isConnected) { window.removeEventListener('resize', apply); return; }
      var rc = inner.getBoundingClientRect();
      if (!rc.width) return;
      var cs = window.getComputedStyle(inner);
      var w = rc.width - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
      if (w > 200) { host.style.maxWidth = Math.round(w) + 'px'; host.style.marginLeft = 'auto'; host.style.marginRight = 'auto'; }
    }
    apply();
    window.addEventListener('resize', apply);
    setTimeout(apply, 800); setTimeout(apply, 2500);
  }

  function render(widget, data, opts) {
    var list = (data && data.reviews) || [];
    if (!list.length && !(widget && widget.design && widget.design.allow_submit)) return null;
    var s = (data && data.stats) || { count: list.length, avg: 0, dist: {} };
    var D = merge(DEF, (widget && widget.design) || {});
    var tpl = widget && T[widget.template] ? widget.template : 'cards_photo';
    var host = mk('div');
    host.setAttribute('data-sll-reviews', tpl);
    var wm = D.width_mode || (num(D.max_width, 0) > 0 ? 'custom' : 'auto');
        host.setAttribute('data-sll-wm', wm);
        var hs = host.style;
        hs.display = 'block'; hs.width = '100%'; hs.boxSizing = 'border-box';
        if (num(D.margin_x, 0) > 0) { hs.paddingLeft = num(D.margin_x, 0) + 'px'; hs.paddingRight = num(D.margin_x, 0) + 'px'; }
        if (wm === 'custom' && num(D.max_width, 0) > 0) {
          hs.maxWidth = num(D.max_width, 0) + 'px';
          hs.marginLeft = D.align === 'left' ? '0' : 'auto';
          hs.marginRight = D.align === 'right' ? '0' : 'auto';
        }
        if (D.carousel === undefined || D.carousel === null) D.carousel = (tpl === 'cards_photo');
    var sh = host.attachShadow({ mode: 'open' });
    sh.appendChild(mk('style', null, CSS));
    var root = mk('section', 'r r-' + tpl), st = root.style;
    st.setProperty('--ac', D.accent); st.setProperty('--st', D.star_color); st.setProperty('--bg', D.bg);
    st.setProperty('--tx', D.text); st.setProperty('--tt', D.title_color); st.setProperty('--cb', D.card_bg);
    st.setProperty('--bd', D.border); st.setProperty('--ff', D.font);
    st.setProperty('--rd', num(D.radius, 12) + 'px'); st.setProperty('--my', num(D.margin_y, 16) + 'px');
    st.setProperty('--cols', String(Math.max(1, Math.min(6, num(D.columns, 3)))));
    st.setProperty('--pd', num(D.padding, 16) + 'px');
        st.setProperty('--pv', String(Math.max(1, Math.min(6, num(D.per_view_desktop, 3)))));
        st.setProperty('--pvm', String(Math.max(1, Math.min(6, num(D.per_view_mobile, 1)))));
    sh.appendChild(root);
    if (D.show_title && D.title && tpl !== 'badge') root.appendChild(mk('h3', 'tt', D.title));
    var bar = D.allow_submit ? submitBar(D, opts) : null;
        if (list.length) {
          if (bar) root.appendChild(bar);
          T[tpl](root, list, s, D);
        } else {
          root.appendChild(mk('p', 'cbd', 'Ainda n\u00e3o h\u00e1 avalia\u00e7\u00f5es. Seja o primeiro a avaliar!'));
          if (bar) root.appendChild(bar);
        }
    return host;
  }

  window.SLLReviews = { render: render, fit: fit };
})();
