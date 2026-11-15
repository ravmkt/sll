import fs from 'node:fs';

const fail = (m) => { console.error('ERRO: ' + m); process.exit(1); };
const rd = (p) => { if (!fs.existsSync(p)) fail('Nao existe: ' + p); return fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n'); };
const one = (s, from, to, l) => { const n = s.split(from).length - 1; if (n !== 1) fail(l + ' (ancora encontrada ' + n + 'x)'); return s.replace(from, () => to); };
const re1 = (s, re, to, l) => { if (!re.test(s)) fail(l); return s.replace(re, () => to); };

const RJ = 'public/reviews-render.js';
const WJ = 'public/widgets-widget.js';
const TS = 'src/modules/pulse/types/reviews.ts';
const TX = 'src/modules/pulse/components/widgets/ReviewWidgetModal.tsx';
const out = [];

/* ================= reviews-render.js ================= */
let r = rd(RJ);
if (r.includes('function upAll(')) { console.log('Ja aplicado: ' + RJ); }
else {
  r = one(r, 'allow_submit: false, submit_label:', 'allow_media: true, allow_submit: false, submit_label:', 'DEF');
  r = one(r, ".ok b{display:block;font-size:18px;color:var(--tt);margin-bottom:6px}';", String.raw`.ok b{display:block;font-size:18px;color:var(--tt);margin-bottom:6px}' +
    '.mdw{margin-top:10px}.ad{display:block;width:100%;background:none;border:1px dashed var(--bd);border-radius:8px;padding:10px;color:var(--ac);font:inherit;font-weight:600;cursor:pointer}' +
    '.pvw{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}.pvi{position:relative;width:64px;height:64px;border:1px solid var(--bd);border-radius:8px;overflow:hidden;background:#F1F5F9;display:flex;align-items:center;justify-content:center}' +
    '.pvi img{width:100%;height:100%;object-fit:cover}.pvv{font-size:20px;color:#334155}.pvx{position:absolute;top:0;right:0;width:20px;height:20px;border:0;background:rgba(0,0,0,.65);color:#fff;border-radius:0 0 0 6px;line-height:1;cursor:pointer;padding:0}';`, 'FCSS');

  r = one(r, 'form.appendChild(hp); form.appendChild(err); form.appendChild(go);', String.raw`var files = [], MAXF = 3;
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
    form.appendChild(hp); form.appendChild(err); form.appendChild(go);`, 'media block');

  r = one(r, 'opts.submit({ rating: rating, name: n, email: e, title: tt.value.trim(), body: b }).then(function (res) {',
    'upAll().then(function (media) { return opts.submit({ rating: rating, name: n, email: e, title: tt.value.trim(), body: b, media: media }); }).then(function (res) {', 'submit call');
  r = one(r, '}).catch(function () { reset(', '}).catch(function (er) { if (er && er.sll) { reset(er.message); return; } reset(', 'catch');
  try { new Function(r); } catch (e) { fail('Sintaxe invalida em reviews-render.js: ' + e.message); }
  out.push([RJ, r]);
}

/* ================= widgets-widget.js ================= */
let w = rd(WJ);
if (w.includes('function uploadReviewMedia(')) { console.log('Ja aplicado: ' + WJ); }
else {
  const FN = String.raw`  var RV_MAX_IMG = 1600, RV_MAX_VIDEO_S = 30, RV_MAX_VIDEO_MB = 30;
  function rvErr(m) { var e = new Error(m); e.sll = true; return e; }
  function rvUuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    var s = ''; while (s.length < 32) s += Math.floor(Math.random() * 16).toString(16);
    return s;
  }
  function rvBlob(c, q) {
    return new Promise(function (res, rej) {
      c.toBlob(function (b) {
        if (b && b.type === 'image/webp') { res(b); return; }
        c.toBlob(function (j) { if (j) res(j); else rej(rvErr('N\u00e3o foi poss\u00edvel processar a imagem.')); }, 'image/jpeg', q);
      }, 'image/webp', q);
    });
  }
  function rvImage(file) {
    return createImageBitmap(file).then(function (bmp) {
      var k = Math.min(1, RV_MAX_IMG / Math.max(bmp.width, bmp.height));
      var c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(bmp.width * k));
      c.height = Math.max(1, Math.round(bmp.height * k));
      c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
      if (bmp.close) bmp.close();
      return rvBlob(c, 0.82);
    }, function () { throw rvErr('Imagem inv\u00e1lida ou n\u00e3o suportada.'); });
  }
  function rvPoster(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file), v = document.createElement('video'), timer;
      function end(fn) { clearTimeout(timer); URL.revokeObjectURL(url); fn(); }
      timer = setTimeout(function () { end(function () { reject(rvErr('N\u00e3o foi poss\u00edvel ler o v\u00eddeo.')); }); }, 15000);
      v.muted = true; v.playsInline = true; v.preload = 'metadata'; v.src = url;
      v.onerror = function () { end(function () { reject(rvErr('V\u00eddeo inv\u00e1lido ou formato n\u00e3o suportado.')); }); };
      v.onloadedmetadata = function () {
        var d = isFinite(v.duration) ? v.duration : 0;
        if (d > RV_MAX_VIDEO_S + 0.5) { end(function () { reject(rvErr('O v\u00eddeo deve ter at\u00e9 30 segundos.')); }); return; }
        v.currentTime = Math.max(0.1, Math.min(0.5, d / 2));
      };
      v.onseeked = function () {
        var k = Math.min(1, 720 / Math.max(v.videoWidth || 1, v.videoHeight || 1));
        var c = document.createElement('canvas');
        c.width = Math.max(1, Math.round((v.videoWidth || 1) * k));
        c.height = Math.max(1, Math.round((v.videoHeight || 1) * k));
        c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
        rvBlob(c, 0.8).then(function (b) { end(function () { resolve(b); }); }, function (e) { end(function () { reject(e); }); });
      };
    });
  }
  function rvPut(blob, type, ext) {
    var path = 'submissions/' + STORE_ID + '/' + rvUuid() + '.' + ext;
    return fetch(SB_URL + '/storage/v1/object/reviews/' + path, {
      method: 'POST',
      headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, 'Content-Type': type, 'x-upsert': 'false' },
      body: blob
    }).then(function (r) {
      if (!r.ok) throw rvErr('Falha ao enviar o arquivo. Tente novamente.');
      return SB_URL + '/storage/v1/object/public/reviews/' + path;
    }, function () { throw rvErr('Falha de conex\u00e3o ao enviar o arquivo.'); });
  }
  function rvExt(b) { return b.type === 'image/jpeg' ? 'jpg' : 'webp'; }
  function uploadReviewMedia(f) {
    if (!STORE_ID || !SB_URL) return Promise.reject(rvErr('Envio indispon\u00edvel.'));
    if (f.type.indexOf('image/') === 0) {
      return rvImage(f).then(function (b) { return rvPut(b, b.type, rvExt(b)); })
        .then(function (u) { return { kind: 'image', url: u }; });
    }
    if (f.type === 'video/mp4' || f.type === 'video/webm') {
      if (f.size > RV_MAX_VIDEO_MB * 1048576) return Promise.reject(rvErr('O v\u00eddeo deve ter at\u00e9 30 MB.'));
      return rvPoster(f).then(function (p) {
        return Promise.all([rvPut(f, f.type, f.type === 'video/mp4' ? 'mp4' : 'webm'), rvPut(p, p.type, rvExt(p))]);
      }).then(function (u) { return { kind: 'video', url: u[0], poster_url: u[1] }; });
    }
    return Promise.reject(rvErr('Formato n\u00e3o suportado. Use imagem, mp4 ou webm.'));
  }

  function submitReview(w, wk, p) {`;
  w = one(w, 'function submitReview(w, wk, p) {', FN.replace(/^  /, ''), 'submitReview');
  w = one(w, 'rating: p.rating, title: p.title, body: p.body } });', 'rating: p.rating, title: p.title, body: p.body, media: p.media || [] } });', 'media field');
  w = one(w, '{ submit: function (p) { return submitReview(w, wk, p); } }',
    '{ submit: function (p) { return submitReview(w, wk, p); }, upload: (w.design.allow_media !== false) ? function (f) { return uploadReviewMedia(f); } : null }', 'render opts');
  try { new Function(w); } catch (e) { fail('Sintaxe invalida em widgets-widget.js: ' + e.message); }
  out.push([WJ, w]);
}

/* ================= types/reviews.ts ================= */
let t = rd(TS);
if (t.includes('allow_media')) { console.log('Ja aplicado: ' + TS); }
else {
  t = one(t, 'allow_submit: boolean;', 'allow_media: boolean; allow_submit: boolean;', 'ReviewDesign');
  t = one(t, 'allow_submit: false,', 'allow_media: true, allow_submit: false,', 'DEFAULT_DESIGN');
  out.push([TS, t]);
}

/* ================= ReviewWidgetModal.tsx ================= */
let x = rd(TX);
if (x.includes('allow_media')) { console.log('Ja aplicado: ' + TX); }
else {
  x = re1(x, /<label className="block"><span className=\{lbl\}>Texto do bot.o<\/span>/,
    `<div className="space-y-2"><label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                          <input type="checkbox" checked={design.allow_media !== false} onChange={(e) => setD('allow_media', e.target.checked)} /> Permitir foto e vídeo no formulário
                        </label>
                        <label className="block"><span className={lbl}>Texto do botão</span>`, 'label texto do botao');
  x = one(x, "onChange={(e) => setD('submit_label', e.target.value)} /></label>", "onChange={(e) => setD('submit_label', e.target.value)} /></label></div>", 'fim label');
  out.push([TX, x]);
}

for (const [p, s] of out) { fs.writeFileSync(p + '.bak', fs.readFileSync(p)); fs.writeFileSync(p, s); console.log('OK: ' + p); }
