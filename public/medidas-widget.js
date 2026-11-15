/*! SLL Medidas Widget v1.0
GTM (Custom HTML):
<script>
window.SLL_MEDIDAS = {
  storeId: "UUID_DA_LOJA",
  apiBase: "https://flivmllysdhaydhogmhg.supabase.co/functions/v1",
  openSelectors: [".btn-tabela-medidas", ".btn-descubra-tamanho"],
  sizeSelector: ".product-size-option",
  injectAfter: null
};
</script>
<script src="https://SEU-DOMINIO/medidas-widget.js" async></script>
*/
(function () {
  if (window.__sllMedidas) return;
  window.__sllMedidas = true;

  const cfg = Object.assign({
    storeId: null, apiBase: null, openSelectors: [], openTexts: [], injectAfter: null,
    sizeSelector: null, productRef: null, image: null, chart: null, charts: null, color: '#111'
  }, window.SLL_MEDIDAS || {});

  const LBL = { bust: 'Busto', waist: 'Cintura', hip: 'Quadril', thigh: 'Coxa', height: 'Altura', foot: 'Pé', length: 'Comprimento' };
  const BODY_KEYS = ['bust', 'waist', 'hip'];
  const COL = { g: '#34c38f', y: '#f5a623', r: '#e5484d' };
  const lbl = (k) => (k === 'bust' && S.gender === 'M' ? 'Tórax' : LBL[k] || k);

  const S = {
    screen: 'table', charts: [], ci: 0, sizes: {}, gender: 'F', h: '', w: '', age: '', pref: 0,
    adj: { bust: 0, waist: 0, hip: 0 }, base: {}, size: null, view: null, err: ''
  };

  /* ---------- util ---------- */
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  const anonId = (() => {
    let id = store.get('sll_medidas_anon');
    if (!id) { id = 'a' + Math.random().toString(36).slice(2) + Date.now().toString(36); store.set('sll_medidas_anon', id); }
    return id;
  })();
  const productRef = () => cfg.productRef || location.pathname;
  const productImg = () => {
    if (cfg.image) return cfg.image;
    const m = document.querySelector('meta[property="og:image"]');
    return m ? m.content : '';
  };

  function track(ev, data) {
    const p = Object.assign({ event: 'sll_medidas_' + ev, store_id: cfg.storeId, anon_id: anonId, product_ref: productRef() }, data || {});
    (window.dataLayer = window.dataLayer || []).push(p);
    if (cfg.apiBase && cfg.storeId && navigator.sendBeacon) {
      try { navigator.sendBeacon(cfg.apiBase + '/sizeadvisor-track', new Blob([JSON.stringify(p)], { type: 'text/plain' })); } catch (e) {}
    }
  }

  /* ---------- dados ---------- */
  async function loadCharts() {
    if (S.charts.length) return;
    if (cfg.charts) S.charts = cfg.charts;
    else if (cfg.chart) S.charts = [cfg.chart];
    else if (cfg.apiBase && cfg.storeId) {
      const u = cfg.apiBase + '/sizeadvisor-chart?store_id=' + encodeURIComponent(cfg.storeId) + '&product=' + encodeURIComponent(productRef());
      const r = await fetch(u);
      const j = await r.json();
      S.charts = j.charts || (j.chart ? [j.chart] : []); S.settings = j.settings || {};
    }
    if (S.charts.length) {
      const c = chart();
      S.view = c.rows[0].size;
    }
  }
  const ORDER = { blusa: 0, calca: 1 };
  const list = () => {
    const a = S.charts.filter((c) => c.gender === S.gender);
    const u = S.charts.filter((c) => c.gender === 'U');
    const l = a.length ? a : (u.length ? u : S.charts);
    return l.slice().sort((x, y) => (ORDER[x.category] ?? 9) - (ORDER[y.category] ?? 9));
  };
  const chart = () => list()[S.ci] || list()[0];
  const tabName = (c) => ({ blusa: 'Blusa', calca: 'Calça' }[c.category] || c.name);
  const tabs = () => list().length > 1
    ? `<div class="row" style="justify-content:center">${list().map((c, i) => `<button class="chip ${i === S.ci ? 'on' : ''}" data-act="tab" data-v="${i}">${esc(tabName(c))}</button>`).join('')}</div>`
    : '';
  const sizesByName = () => { const o = {}; list().forEach((c, i) => { o[c.category || c.name] = S.sizes[i]; }); return o; };
  const rng = (m) => (m[0] === m[1] ? m[0] : m[0] + ' - ' + m[1]) + ' cm';
  const eqv = (r) => r.equiv || r.size_equiv || '';
  const rowKeys = (row) => Object.keys(row.measures).filter((k) => row.measures[k]);

  /* ---------- cálculo ---------- */
  function estimate() {
    const h = +S.h, w = +S.w, age = +S.age, b = w / Math.pow(h / 100, 2);
    S.base = S.gender === 'M'
      ? { bust: Math.round(50 + b * 2), waist: Math.round(42 + b * 1.8 + (age - 30) * 0.1), hip: Math.round(55 + b * 1.75) }
      : { bust: Math.round(60 + b * 1.3), waist: Math.round(40 + b * 1.7 + (age - 30) * 0.1), hip: Math.round(55 + b * 1.9) };
    S.adj = { bust: 0, waist: 0, hip: 0 };
  }
  const val = (k) => S.base[k] + S.adj[k];
  // Ajustado (+2): corpo "parece maior" para a peça. Folgado (-2): parece menor.
  const eff = (k) => val(k) + S.pref;

  function status(k, row) {
    const [mn, mx] = row.measures[k], v = eff(k);
    if (v >= mn && v <= mx) return { t: 'ideal', c: 'g', p: 0 };
    const tight = v > mx, d = tight ? v - mx : mn - v, w = tight ? 'justo' : 'folgado';
    if (d <= 2) return { t: 'levemente ' + w, c: 'g', p: 1 };
    if (d <= 5) return { t: w, c: 'y', p: 2 };
    return { t: 'muito ' + w, c: 'r', p: 4 };
  }
  function score(row) {
    return BODY_KEYS.filter((k) => row.measures[k]).reduce((a, k) => {
      const [mn, mx] = row.measures[k];
      return a + status(k, row).p + Math.abs(eff(k) - (mn + mx) / 2) / 100;
    }, 0);
  }
  const rowOf = (size) => chart().rows.find((r) => r.size === size);
  const bestSize = (c = chart()) => c.rows.slice().sort((a, b) => score(a) - score(b))[0].size;

  /* ---------- UI ---------- */
  const host = document.createElement('div');
  host.id = 'sll-medidas-root';
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `<style>
  *{box-sizing:border-box;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
  .ov{position:fixed;inset:0;background:rgba(0,0,0,.62);z-index:2147483000;display:none;align-items:center;justify-content:center;padding:12px}
  .ov.on{display:flex}
  .card{background:#fff;border-radius:6px;width:100%;max-width:900px;max-height:94vh;overflow:auto;position:relative;color:#333}
  .x{position:absolute;top:8px;right:8px;width:34px;height:34px;border:0;border-radius:6px;background:#f2f2f2;font-size:20px;cursor:pointer;z-index:3}
  .grid{display:grid;grid-template-columns:1fr 1fr;min-height:480px}
  .l{padding:24px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#f6f6f6;gap:10px}
  .l img{max-width:100%;max-height:420px;border-radius:8px;object-fit:cover}
  .r{padding:36px 32px;display:flex;flex-direction:column;gap:14px;justify-content:center}
  h2{margin:0;font-size:22px;color:#444}
  p{margin:0;font-size:14px;color:#666}
  .chip{border:1px solid #ccc;background:#fff;border-radius:8px;padding:10px 22px;font-weight:600;cursor:pointer;position:relative}
  .chip.on{border-color:#111;box-shadow:0 0 0 1px #111}
  .chip i{position:absolute;top:-8px;right:-8px;width:18px;height:18px;border-radius:50%;background:#34c38f;color:#fff;font-size:11px;display:flex;align-items:center;justify-content:center;font-style:normal}
  .row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
  .btn{background:var(--c,#111);color:#fff;border:0;border-radius:6px;padding:12px 24px;font-weight:700;cursor:pointer;font-size:14px}
  .btn.g{background:#e6e6e6;color:#111}
  .btn.s{background:#fff;color:#111;border:1px solid #ccc;padding:6px 12px;font-size:12px;font-weight:500}
  .tr{display:flex;justify-content:space-between;border-bottom:1px solid #e3e3e3;padding:12px 0;font-size:14px}
  label{font-size:13px;display:block}
  input[type=number]{border:1px solid #333;border-radius:4px;padding:8px;width:100px;font-size:14px;margin-right:6px}
  .sl{display:flex;align-items:center;gap:8px;font-size:12px}
  .sl input{flex:1;accent-color:#111}
  .sl button{width:30px;height:30px;border:0;border-radius:4px;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.25);cursor:pointer}
  .pill{border-radius:999px;padding:3px 10px;font-size:12px;font-weight:700;color:#fff}
  .g1{background:#34c38f}.y1{background:#f5a623}.r1{background:#e5484d}
  .big{width:96px;height:96px;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,.12);display:flex;align-items:center;justify-content:center;font-size:44px;font-weight:800;color:#333;background:#fff}
  .tag{font-size:12px;font-weight:700;letter-spacing:.04em;color:#555}
  .err{color:#e5484d;font-size:12px;min-height:14px}
  .foot{display:flex;justify-content:space-between;gap:8px;margin-top:6px}
  .sp{width:44px;height:44px;border:3px solid #ddd;border-top-color:#111;border-radius:50%;animation:s 1s linear infinite}
  @keyframes s{to{transform:rotate(360deg)}}
  .by{font-size:11px;color:#999;text-align:center;padding:8px}
  @media(max-width:700px){.grid{grid-template-columns:1fr}.l{padding:14px}.l img{max-height:200px}.r{padding:20px}}
  </style><div class="ov" part="ov"><div class="card" role="dialog" aria-modal="true" aria-label="Tabela de medidas"><button class="x" data-act="close" aria-label="Fechar">×</button><div id="v"></div><div class="by">Powered by SLL Medidas</div></div></div>`;
  root.querySelector('.card').style.setProperty('--c', cfg.color);
  const ov = root.querySelector('.ov'), V = root.getElementById ? root.getElementById('v') : root.querySelector('#v');

  const chips = (cur, sel) => chart().rows.map((r) => `<button class="chip ${r.size === cur ? 'on' : ''}" data-act="${sel}" data-v="${esc(r.size)}">${esc(r.size)}${sel === 'pick' && r.size === bestSize() ? '<i>✓</i>' : ''}</button>`).join('');
  const imgBox = () => { const s = productImg(); return s ? `<img src="${esc(s)}" alt="">` : '<div style="height:260px;width:200px;background:#ddd;border-radius:8px"></div>'; };

  function smooth(p) {
    let d = '';
    for (let i = 1; i < p.length - 1; i++) d += `Q${p[i][0]},${p[i][1]} ${(p[i][0] + p[i + 1][0]) / 2},${(p[i][1] + p[i + 1][1]) / 2} `;
    const l = p[p.length - 1];
    return d + `L${l[0]},${l[1]} `;
  }
  function bodySvg(row) {
    const bw = val('bust') * 0.27, ww = val('waist') * 0.27, hw = val('hip') * 0.27;
    const P = [[bw * 1.08, 66], [bw, 100], [ww, 140], [hw, 188], [hw * 0.8, 250], [hw * 0.58, 318]];
    const L = P.map(([x, y]) => [100 - x, y]), R = P.map(([x, y]) => [100 + x, y]).reverse();
    const skin = '#e7c3a6';
    const band = (k, y) => {
      if (!row || !row.measures[k]) return '';
      const w = (val(k) * 0.27) * 2 + 8;
      return `<rect x="${100 - w / 2}" y="${y}" width="${w}" height="6" rx="3" fill="${COL[status(k, row).c]}" opacity=".92"/>`;
    };
    return `<svg viewBox="0 0 200 330" width="190" aria-hidden="true">
      <path d="M${100 - bw * 1.08 - 3},72 L${100 - hw - 16},205" stroke="${skin}" stroke-width="11" stroke-linecap="round"/>
      <path d="M${100 + bw * 1.08 + 3},72 L${100 + hw + 16},205" stroke="${skin}" stroke-width="11" stroke-linecap="round"/>
      <rect x="93" y="46" width="14" height="22" fill="${skin}"/><ellipse cx="100" cy="30" rx="18" ry="22" fill="${skin}"/>
      <path d="M${L[0][0]},${L[0][1]} ${smooth(L)} L${R[0][0]},${R[0][1]} ${smooth(R)} Z" fill="${skin}"/>
      <line x1="100" y1="215" x2="100" y2="318" stroke="#d3a98a" stroke-width="1.5"/>
      ${band('bust', 97)}${band('waist', 137)}${band('hip', 185)}</svg>`;
  }

  const screens = {
    table() {
      const r = rowOf(S.view) || chart().rows[0];
      return `<div class="grid"><div class="l"><b style="color:#222">Tabela de tamanhos</b>${imgBox()}</div><div class="r">
        ${tabs()}
        <p style="text-align:center">Selecione um tamanho e verifique as medidas</p>
        <div class="row" style="justify-content:center">${chips(r.size, 'view')}</div>
        <div>${eqv(r) ? `<div class="tr"><span>Numeração</span><span>${esc(eqv(r))}</span></div>` : ''}${rowKeys(r).map((k) => `<div class="tr"><span>${lbl(k)}</span><span>${rng(r.measures[k])}</span></div>`).join('')}</div>
        <button class="btn" data-act="toform">Provador Virtual</button></div></div>`;
    },
    form() {
      return `<div class="grid"><div class="l">${imgBox()}</div><div class="r">
        <h2>Provador Virtual</h2><p>Preencha os dados para experimentar este produto</p>
        <div class="row"><button class="chip ${S.gender === 'F' ? 'on' : ''}" data-act="gender" data-v="F">Feminino</button><button class="chip ${S.gender === 'M' ? 'on' : ''}" data-act="gender" data-v="M">Masculino</button></div>
        <label>Altura<br><input type="number" id="f-h" value="${esc(S.h)}" inputmode="numeric"> cm</label>
        <label>Peso<br><input type="number" id="f-w" value="${esc(S.w)}" inputmode="numeric"> kg</label>
        <label>Idade<br><input type="number" id="f-age" value="${esc(S.age)}" inputmode="numeric"> anos</label>
        <div><label>Como você gosta de vestir?</label><div class="row" style="margin-top:6px">${[[2, 'Ajustado'], [0, 'Normal'], [-2, 'Folgado']].map(([v, l]) => `<button class="chip ${S.pref === v ? 'on' : ''}" style="padding:6px 14px" data-act="pref" data-v="${v}">${l}</button>`).join('')}</div></div>
        <div class="err">${esc(S.err)}</div>
        <div class="foot"><button class="btn g" data-act="totable">Voltar</button><button class="btn" data-act="tobody">Próximo</button></div></div></div>`;
    },
    body() {
      return `<div class="grid"><div class="l" id="bd">${bodySvg(null)}</div><div class="r">
        <h2>Ajuste o formato do corpo</h2><p>Este é o formato aproximado do corpo que geramos com suas medidas. Ajuste somente se for necessário.</p>
        ${BODY_KEYS.map((k) => `<div><div style="font-size:12px;text-align:center">${lbl(k)} · <b id="lv-${k}">${val(k)} cm</b></div>
        <div class="sl"><button data-act="adj" data-k="${k}" data-d="-1" aria-label="menos">−</button><input type="range" min="-10" max="10" step="1" value="${S.adj[k]}" data-k="${k}"><button data-act="adj" data-k="${k}" data-d="1" aria-label="mais">+</button></div></div>`).join('')}
        <div class="foot"><button class="btn g" data-act="toform">Voltar</button><button class="btn" data-act="calc">Próximo</button></div></div></div>`;
    },
    loading() {
      return `<div class="grid"><div class="l" style="background:#fff"><div class="sp"></div></div><div class="r"><h2>Quase lá!</h2><p>Estamos calculando as medidas para gerar a recomendação de tamanho ideal</p></div></div>`;
    },
    result() {
      const best = bestSize(), row = rowOf(S.size), sc = rowKeys(row).filter((k) => BODY_KEYS.includes(k));
      const ex = rowKeys(row).filter((k) => !BODY_KEYS.includes(k)).map((k) => lbl(k) + ' ' + rng(row.measures[k])).join(' · ');
      const sts = sc.map((k) => [k, status(k, row)]);
      const bad = sts.some(([, s]) => s.c === 'r');
      const tag = S.size === best ? 'MELHOR OPÇÃO' : bad ? 'NÃO RECOMENDADO' : 'TAMBÉM SERVE';
      return `<div class="grid"><div class="l">${imgBox()}</div><div class="r">
        ${tabs()}
        <div class="tag">${tag}${list().length > 1 ? ' · ' + esc(tabName(chart()).toUpperCase()) : ''}</div>
        <div class="row" style="gap:18px;align-items:flex-start"><div><div class="big">${esc(S.size)}</div><button class="btn s" style="margin-top:8px" data-act="tobody">Editar medidas</button></div><div id="bd">${bodySvg(row)}</div>
        <div style="display:flex;flex-direction:column;gap:10px">${sts.map(([k, s]) => `<div style="font-size:13px"><b>${lbl(k)} (${val(k)} cm)</b><br><span class="pill ${s.c}1">${s.t}</span></div>`).join('')}</div></div>
        ${ex ? `<p style="text-align:center;font-size:12px">Medidas da peça: ${ex}</p>` : ''}
        <p style="text-align:center;font-size:12px">Prove também os tamanhos:</p>
        <div class="row" style="justify-content:center">${chips(S.size, 'pick')}</div>
        <div class="foot"><button class="btn g" data-act="close">Fechar</button><button class="btn" data-act="select">Selecionar tamanho ${esc(S.size)}${list().length > 1 ? ' (' + esc(tabName(chart())) + ')' : ''}</button></div></div></div>`;
    }
  };

  function render() {
    if (!S.charts.length) { V.innerHTML = '<div class="r"><h2>Tabela de medidas indisponível</h2><p>Este produto ainda não possui tabela cadastrada.</p></div>'; return; }
    V.innerHTML = screens[S.screen]();
  }
  const go = (s) => { S.screen = s; render(); };

  /* ---------- ações ---------- */
  function pickOnPage(size, all) {
    let ok = false;
    if (cfg.sizeSelector) {
      const el = [...document.querySelectorAll(cfg.sizeSelector)].find((e) => e.textContent.trim().toUpperCase() === size.toUpperCase());
      if (el) { el.click(); ok = true; }
    }
    document.dispatchEvent(new CustomEvent('sll:size-selected', { detail: { size, applied: ok, sizes: all || {} } }));
    return ok;
  }

  const actions = {
    close() { ov.classList.remove('on'); document.documentElement.style.overflow = ''; },
    view(t) { S.view = t.dataset.v; render(); },
    toform() { S.err = ''; go('form'); },
    totable() { go('table'); },
    gender(t) { readForm(); S.gender = t.dataset.v; S.ci = 0; S.sizes = {}; S.view = chart().rows[0].size; render(); },
    tab(t) {
      S.ci = +t.dataset.v;
      if (S.screen === 'result') S.size = S.sizes[S.ci] || bestSize();
      else S.view = chart().rows[0].size;
      render();
    },
    pref(t) { readForm(); S.pref = +t.dataset.v; render(); },
    tobody() { if (!S.base.bust) { if (!validate()) return; estimate(); } go('body'); },
    adj(t) {
      const k = t.dataset.k, nv = Math.max(-10, Math.min(10, S.adj[k] + +t.dataset.d));
      S.adj[k] = nv; render();
    },
    calc() {
      go('loading');
      store.set('sll_medidas_profile', { gender: S.gender, h: S.h, w: S.w, age: S.age, pref: S.pref });
      setTimeout(() => {
        S.sizes = {};
        list().forEach((c, i) => { S.sizes[i] = bestSize(c); });
        S.ci = 0; S.size = S.sizes[0]; go('result');
        track('result', { recommended_size: S.size, recommended_sizes: sizesByName(), gender: S.gender, height_cm: +S.h, weight_kg: +S.w, age: +S.age, fit_pref: S.pref });
      }, 1100);
    },
    pick(t) { S.size = t.dataset.v; S.sizes[S.ci] = S.size; render(); track('try_size', { size: S.size }); },
    select() { const ok = pickOnPage(S.size, sizesByName()); track('select_size', { size: S.size, sizes: sizesByName(), applied: ok }); actions.close(); }
  };

  function readForm() {
    const g = (id) => { const e = root.getElementById ? root.getElementById(id) : root.querySelector('#' + id); return e ? e.value : null; };
    const h = g('f-h'), w = g('f-w'), a = g('f-age');
    if (h !== null) { S.h = h; S.w = w; S.age = a; }
  }
  function validate() {
    readForm();
    const h = +S.h, w = +S.w, a = +S.age;
    if (!(h >= 120 && h <= 230)) S.err = 'Informe uma altura entre 120 e 230 cm.';
    else if (!(w >= 30 && w <= 250)) S.err = 'Informe um peso entre 30 e 250 kg.';
    else if (!(a >= 12 && a <= 90)) S.err = 'Informe uma idade entre 12 e 90 anos.';
    else { S.err = ''; return true; }
    render();
    return false;
  }

  root.addEventListener('click', (e) => {
    if (e.target.classList && e.target.classList.contains('ov')) return actions.close();
    const t = e.target.closest('[data-act]');
    if (!t) return;
    const a = t.dataset.act;
    if (a === 'tobody') { if (S.screen === 'form') { if (!validate()) return; estimate(); S.base = S.base; } }
    if (actions[a]) actions[a](t);
  });
  root.addEventListener('input', (e) => {
    const t = e.target;
    if (t.type === 'range') {
      const k = t.dataset.k; S.adj[k] = +t.value;
      root.querySelector('#lv-' + k).textContent = val(k) + ' cm';
      root.querySelector('#bd').innerHTML = bodySvg(null);
    }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && ov.classList.contains('on')) actions.close(); });

  /* ---------- abrir ---------- */
  async function open() {
    const p = store.get('sll_medidas_profile');
    if (p) { S.gender = p.gender || 'F'; S.h = p.h; S.w = p.w; S.age = p.age; S.pref = p.pref || 0; }
    try { await loadCharts(); } catch (e) { S.charts = []; }
    S.screen = 'table'; S.base = {}; S.ci = 0; S.sizes = {};
    if (S.charts.length) S.view = chart().rows[0].size;
    document.body.appendChild(host);
    render();
    ov.classList.add('on');
    document.documentElement.style.overflow = 'hidden';
    track('open');
  }

  function bindTriggers() {
    const sel = cfg.openSelectors.join(',');
    const txt = (cfg.openTexts || []).map((s) => s.toLowerCase());
    if (sel || txt.length) {
      document.addEventListener('click', (e) => {
        if (!e.target.closest) return;
        let t = sel ? e.target.closest(sel) : null;
        if (!t && txt.length) {
          const b = e.target.closest('button,a,[role=button]');
          if (b && txt.includes(b.textContent.trim().toLowerCase())) t = b;
        }
        if (t) { e.preventDefault(); e.stopPropagation(); open(); }
      }, true);
    }
    autoButton();
  }

  /* ---------- botão automático ---------- */
  function findSizeBlock() {
    const sizes = new Set(S.charts.flatMap((c) => c.rows.map((r) => r.size.toUpperCase())));
    const els = [...document.querySelectorAll('button,label,li,a,span,div')]
      .filter((e) => !host.contains(e) && e.offsetParent && sizes.has(e.textContent.trim().toUpperCase()));
    const count = new Map();
    els.forEach((e) => {
      let n = e.parentElement, d = 0;
      while (n && d < 4) {
        if (!count.has(n)) count.set(n, new Set());
        count.get(n).add(e.textContent.trim().toUpperCase());
        n = n.parentElement; d++;
      }
    });
    let best = null, bs = 1e9;
    count.forEach((s, n) => {
      if (s.size >= 2) { const c = n.getElementsByTagName('*').length; if (c < bs) { best = n; bs = c; } }
    });
    if (best) {
      const p = best.parentElement;
      if (p && p.children.length <= 2 && /tamanho|size/i.test(p.textContent.slice(0, 40))) best = p;
    }
    return best;
  }
  function findBuy() {
    if (cfg.buySelector) return document.querySelector(cfg.buySelector);
    return [...document.querySelectorAll('button,a,input[type=submit]')].find((e) =>
      !host.contains(e) && e.offsetParent && /^(comprar|adicionar|add to cart|buy)/i.test((e.textContent || e.value || '').trim()));
  }
  function makeBtn(st) {
    const b = document.createElement('button');
    const full = st.full_width !== false;
    b.id = 'sll-medidas-btn'; b.type = 'button';
    b.textContent = st.button_text || 'Descubra seu tamanho';
    b.style.cssText = 'display:' + (full ? 'block;width:100%' : 'inline-block') + ';margin:10px 0;padding:12px 20px;cursor:pointer;font-weight:600;font-size:14px;' +
      'background:' + (st.bg_color || '#111') + ';color:' + (st.text_color || '#fff') + ';' +
      'border:1px solid ' + (st.border_color || st.bg_color || '#111') + ';border-radius:' + (st.radius == null ? 6 : st.radius) + 'px';
    b.onclick = (e) => { e.preventDefault(); open(); };
    return b;
  }
  async function autoButton() {
    try { await loadCharts(); } catch (e) { return; }
    if (!S.charts.length) return;
    const st = S.settings || {};
    const texts = (cfg.openTexts || []).map((s) => s.toLowerCase());
    let n = 0;
    const t = setInterval(() => {
      if (document.getElementById('sll-medidas-btn') || ++n > 40) return clearInterval(t);
      const own = [...document.querySelectorAll('button,a')].some((e) => e.id !== 'sll-medidas-btn' && !host.contains(e) && texts.includes(e.textContent.trim().toLowerCase()));
      if (own) return clearInterval(t);
      const sel = cfg.injectAfter || st.anchor_selector;
      const custom = sel ? document.querySelector(sel) : null;
      const size = findSizeBlock(), buy = findBuy();
      const pref = st.position === 'before_buy' ? [buy, size] : [size, buy];
      const target = custom || pref[0] || pref[1];
      if (!target) return;
      target.insertAdjacentElement(custom ? 'afterend' : 'beforebegin', makeBtn(st));
      clearInterval(t);
    }, 500);
  }
  window.SLLMedidas = { open, close: actions.close };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindTriggers); else bindTriggers();
})();
