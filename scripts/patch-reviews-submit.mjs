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
if (r.includes('function formModal(')) { console.log('Ja aplicado: ' + RJ); }
else {
  r = one(r, 'per_view_mobile: 1, loop: true };', "per_view_mobile: 1, loop: true,\n    allow_submit: false, submit_label: 'Escrever avalia\u00e7\u00e3o' };", 'DEF');
  r = one(r, "'.mlr{display:flex;justify-content:space-between;align-items:center}',",
    "'.mlr{display:flex;justify-content:space-between;align-items:center}',\n    '.sbw{margin:0 0 14px}.sb{background:var(--ac);color:#fff;border:0;border-radius:8px;padding:10px 18px;font:inherit;font-weight:700;cursor:pointer}.sb:hover{opacity:.9}',", 'CSS botao');

  const FN = String.raw`  var FCSS = '*{box-sizing:border-box}' +
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
    '.ok{text-align:center;padding:12px 0 0}.ok b{display:block;font-size:18px;color:var(--tt);margin-bottom:6px}';

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
      opts.submit({ rating: rating, name: n, email: e, title: tt.value.trim(), body: b }).then(function (res) {
        if (res && res.ok) { done(); return; }
        var c = res && res.error;
        reset(c === 'duplicate' ? 'Voc\u00ea j\u00e1 avaliou este produto. Obrigado!'
          : c === 'rate_limited' ? 'Muitas avalia\u00e7\u00f5es em pouco tempo. Tente novamente mais tarde.'
          : c === 'invalid' ? 'Confira os campos e tente novamente.'
          : 'N\u00e3o foi poss\u00edvel enviar agora. Tente novamente.');
      }).catch(function () { reset('N\u00e3o foi poss\u00edvel enviar agora. Tente novamente.'); });
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

  function carousel(root, list, D, mkItem) {`;
  r = one(r, '  function carousel(root, list, D, mkItem) {', FN, 'carousel anchor');

  r = one(r, 'function render(widget, data) {', 'function render(widget, data, opts) {', 'render sig');
  r = one(r, 'if (!list.length) return null;', 'if (!list.length && !(widget && widget.design && widget.design.allow_submit)) return null;', 'render empty');
  r = one(r, 'T[tpl](root, list, s, D);', String.raw`var bar = D.allow_submit ? submitBar(D, opts) : null;
        if (list.length) {
          if (bar) root.appendChild(bar);
          T[tpl](root, list, s, D);
        } else {
          root.appendChild(mk('p', 'cbd', 'Ainda n\u00e3o h\u00e1 avalia\u00e7\u00f5es. Seja o primeiro a avaliar!'));
          if (bar) root.appendChild(bar);
        }`, 'render body');
  try { new Function(r); } catch (e) { fail('Sintaxe invalida em reviews-render.js: ' + e.message); }
  out.push([RJ, r]);
}

/* ================= widgets-widget.js ================= */
let w = rd(WJ);
if (w.includes('function submitReview(')) { console.log('Ja aplicado: ' + WJ); }
else {
  const FN = String.raw`  function submitReview(w, wk, p) {
    var ref = null;
    if (w.scope === 'product' && wk && wk.length) {
      ref = wk.slice().sort(function (a, b) { return b.length - a.length; })[0];
    }
    var og = document.querySelector('meta[property="og:title"]');
    var nm = String((og && og.content) || document.title || '').trim().slice(0, 200);
    return rpc('review_submit', { p_store_id: STORE_ID, p_data: {
      product_ref: ref, product_name: nm, author_name: p.name, author_email: p.email,
      rating: p.rating, title: p.title, body: p.body } });
  }

  function initReviews() {`;
  w = one(w, 'function initReviews() {', FN, 'initReviews');
  w = one(w, 'if (!d || !d.reviews || !d.reviews.length) return;',
    'if (!d || !d.reviews) return;\n              if (!d.reviews.length && !(w.design && w.design.allow_submit)) return;', 'empty check');
  w = one(w, 'var host = window.SLLReviews.render(w, d);',
    'var host = window.SLLReviews.render(w, d, (w.design && w.design.allow_submit) ? { submit: function (p) { return submitReview(w, wk, p); } } : null);', 'render call');
  try { new Function(w); } catch (e) { fail('Sintaxe invalida em widgets-widget.js: ' + e.message); }
  out.push([WJ, w]);
}

/* ================= types/reviews.ts ================= */
let t = rd(TS);
if (t.includes('allow_submit')) { console.log('Ja aplicado: ' + TS); }
else {
  t = one(t, 'hide_native: boolean; native_selector: string;', 'hide_native: boolean; native_selector: string;\n  allow_submit: boolean; submit_label: string;', 'ReviewDesign');
  t = one(t, "hide_native: false, native_selector: '',", "hide_native: false, native_selector: '',\n  allow_submit: false, submit_label: 'Escrever avaliação',", 'DEFAULT_DESIGN');
  out.push([TS, t]);
}

/* ================= ReviewWidgetModal.tsx ================= */
let x = rd(TX);
if (x.includes('allow_submit')) { console.log('Ja aplicado: ' + TX); }
else {
  const UI = String.raw`
                    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
                      <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                        <input type="checkbox" checked={Boolean(design.allow_submit)} onChange={(e) => setD('allow_submit', e.target.checked)} /> Permitir envio de avaliações pelos clientes
                      </label>
                      <p className="text-xs text-slate-500">
                        Mostra um botão que abre o formulário (nota, nome, e-mail, título e texto). As avaliações chegam como Pendente e só aparecem na loja depois de aprovadas. Sem avaliações aprovadas, o botão aparece mesmo assim.
                      </p>
                      {design.allow_submit && (
                        <label className="block"><span className={lbl}>Texto do botão</span>
                          <input className={inp} maxLength={40} value={design.submit_label ?? ''} placeholder="Escrever avaliação"
                            onChange={(e) => setD('submit_label', e.target.value)} /></label>
                      )}
                    </div>`;
  x = re1(x, /(\s*)<div className="grid grid-cols-2 gap-2">\s*\{TOGGLES\.map/,
    UI + '\n                    <div className="grid grid-cols-2 gap-2">\n                      {TOGGLES.map', 'bloco TOGGLES');
  const old = 'Atenção: o botão "Avaliar produto" do bloco nativo também some.';
  if (x.includes(old)) {
    x = x.replace(old, () => `{design.allow_submit ? 'Com o envio do SLL ligado, os clientes avaliam pelo formulário do SLL.' : 'Atenção: o botão "Avaliar produto" do bloco nativo também some.'}`);
  }
  out.push([TX, x]);
}

for (const [p, s] of out) { fs.writeFileSync(p + '.bak', fs.readFileSync(p)); fs.writeFileSync(p, s); console.log('OK: ' + p); }
