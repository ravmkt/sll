import fs from 'node:fs';
const P = 'public/reviews-render.js';
let s = fs.readFileSync(P, 'utf8');
if (s.includes('data-sll-lightbox')) { console.log('Ja aplicado.'); process.exit(0); }
const a = s.indexOf('function lightbox(');
const b = s.indexOf('function thumbs(');
if (a < 0 || b < 0 || b < a) { console.error('ancoras nao encontradas'); process.exit(1); }
const fn = `function lightbox(root, m, caption) {
    var LBCSS = '*{box-sizing:border-box}.lb{position:fixed;inset:0;background:rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center;padding:16px;font-family:system-ui,sans-serif}.lbb{max-width:min(92vw,900px);max-height:92vh;display:flex;flex-direction:column;gap:8px;color:#fff}.lbb img,.lbb video{max-width:100%;max-height:78vh;border-radius:8px;display:block;margin:0 auto}.lbc{font-size:13px;max-height:12vh;overflow:auto;text-align:center}.lbx{position:absolute;top:12px;right:16px;background:none;border:0;color:#fff;font-size:34px;line-height:1;cursor:pointer}';
    var host = document.createElement('div');
    host.setAttribute('data-sll-lightbox', '');
    host.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:2147483647;transform:none;margin:0;padding:0';
    var sh = host.attachShadow({ mode: 'open' });
    sh.appendChild(mk('style', null, LBCSS));
    var ov = mk('div', 'lb'), box = mk('div', 'lbb'), el;
    if (m.kind === 'video') { el = mk('video'); el.src = m.url; el.controls = true; el.autoplay = true; el.playsInline = true; }
    else { el = mk('img'); el.src = m.url; el.alt = ''; }
    var x = mk('button', 'lbx', '\\u00d7'); x.type = 'button';
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

  `;
fs.writeFileSync(P + '.bak', s);
fs.writeFileSync(P, s.slice(0, a) + fn + s.slice(b));
console.log('OK: ' + P);
