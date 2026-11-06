import type { Block, BlockType, BuilderPage } from '../types';

const esc = (s = '') =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const link = (s = '') => (/^(https?:\/\/|\/|#|mailto:|tel:)/i.test(s.trim()) ? esc(s.trim()) : '#');
const col = (s = '', d: string) => (/^#[0-9a-f]{3,8}$/i.test(s) ? s : d);

function embed(u = ''): string {
  const yt = u.match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/);
  return yt ? `https://www.youtube.com/embed/${yt[1]}` : link(u);
}

const R: Record<BlockType, (p: Record<string, string>) => string> = {
  hero: (p) => `<section class="hero" style="background:${col(p.bg, '#111827')}"><div class="c"><h1>${esc(p.title)}</h1><p>${esc(p.subtitle)}</p><a class="btn" href="#">${esc(p.cta)}</a></div></section>`,
  text: (p) => `<section><div class="c pre">${esc(p.content)}</div></section>`,
  image: (p) => `<section class="np"><img src="${link(p.src)}" alt="${esc(p.alt)}" loading="lazy" style="width:100%"></section>`,
  button: (p) => `<section class="center"><a class="btn" style="background:${col(p.color, '#10b981')}" href="${link(p.href)}">${esc(p.label)}</a></section>`,
  video: (p) =>
    `<section><div class="c">${/\.mp4($|\?)/.test(p.url || '')
      ? `<video src="${link(p.url)}" controls preload="none" style="width:100%;border-radius:8px"></video>`
      : `<iframe src="${embed(p.url)}" loading="lazy" allowfullscreen title="Vídeo" style="width:100%;aspect-ratio:16/9;border:0;border-radius:8px"></iframe>`}</div></section>`,
  testimonials: (p) =>
    `<section><div class="c grid3">${['1', '2', '3'].map((i) => `<figure class="card"><blockquote>“${esc(p['t' + i])}”</blockquote><figcaption>${esc(p['n' + i])}</figcaption></figure>`).join('')}</div></section>`,
  faq: (p) =>
    `<section><div class="c" style="max-width:720px">${['1', '2', '3'].map((i) => `<details class="card"><summary>${esc(p['q' + i])}</summary><p>${esc(p['a' + i])}</p></details>`).join('')}</div></section>`,
  timer: (p) => `<section class="center timer" style="background:${col(p.bg, '#dc2626')}" data-end="${esc(p.endsAt)}"><small>${esc(p.label)}</small><div class="clock" data-clock>00d 00h 00m 00s</div></section>`,
  form: (p) =>
    `<section><form class="c form" data-sll-form data-success="${esc(p.success)}"><h2>${esc(p.title)}</h2><input name="name" placeholder="Seu nome" required maxlength="120"><input name="email" type="email" placeholder="Seu e-mail" required maxlength="160"><input name="whatsapp" placeholder="WhatsApp" maxlength="30"><button type="submit" class="btn">${esc(p.button)}</button></form></section>`,
  product: (p) =>
    `<section><div class="c grid2"><img src="${link(p.image)}" alt="${esc(p.name)}" loading="lazy" style="width:100%;border-radius:8px"><div class="info"><h2>${esc(p.name)}</h2><p class="price">${esc(p.price)}</p><a class="btn" href="${link(p.href)}">${esc(p.cta)}</a></div></div></section>`,
};

const CSS = `*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#1f2937;line-height:1.5}img,video,iframe{max-width:100%;display:block}section{padding:40px 24px}section.np{padding:0}.c{max-width:900px;margin:0 auto}.center{text-align:center}.pre{white-space:pre-line}.hero{text-align:center;color:#fff;padding:72px 24px}.hero h1{font-size:2.25rem;margin:0}.hero p{font-size:1.15rem;opacity:.85}.btn{display:inline-block;background:#10b981;color:#fff;padding:12px 24px;border-radius:8px;font-weight:600;text-decoration:none;border:0;font-size:1rem;cursor:pointer}.card{background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:0 0 8px}.card summary{cursor:pointer;font-weight:600}.grid3{display:grid;gap:16px;grid-template-columns:repeat(3,1fr)}.grid2{display:grid;gap:32px;grid-template-columns:1fr 1fr}.info{display:flex;flex-direction:column;justify-content:center;gap:12px}.price{font-size:1.5rem;font-weight:700;color:#059669;margin:0}.timer{color:#fff}.clock{font:700 2rem ui-monospace,monospace}.form{max-width:420px;display:flex;flex-direction:column;gap:12px}.form input{padding:12px;border:1px solid #d1d5db;border-radius:6px;font-size:1rem}@media(max-width:700px){.grid3,.grid2{grid-template-columns:1fr}}`;

function runtime(apiUrl: string, anonKey: string, pageId: string): string {
  const js = `(function(){var API=${JSON.stringify(apiUrl)},KEY=${JSON.stringify(anonKey)},PAGE=${JSON.stringify(pageId)};
function p(n){return String(n).padStart(2,'0')}
document.querySelectorAll('[data-end]').forEach(function(el){var end=new Date(el.getAttribute('data-end')).getTime(),c=el.querySelector('[data-clock]');
function t(){var s=Math.floor(Math.max(0,end-Date.now())/1000);c.textContent=p(Math.floor(s/86400))+'d '+p(Math.floor(s%86400/3600))+'h '+p(Math.floor(s%3600/60))+'m '+p(s%60)+'s'}
t();setInterval(t,1000)});
document.querySelectorAll('[data-sll-form]').forEach(function(f){f.addEventListener('submit',function(e){e.preventDefault();
var b=f.querySelector('button'),x=f.elements;b.disabled=true;
fetch(API+'/rest/v1/rpc/capture_lead',{method:'POST',headers:{'Content-Type':'application/json',apikey:KEY,Authorization:'Bearer '+KEY},
body:JSON.stringify({p_page_id:PAGE,p_name:x['name'].value,p_email:x['email'].value,p_whatsapp:x['whatsapp'].value})})
.then(function(r){if(!r.ok)throw new Error('err');var m=document.createElement('p');m.textContent=f.getAttribute('data-success');m.style.textAlign='center';f.replaceChildren(m)})
.catch(function(){b.disabled=false;alert('Não foi possível enviar. Tente novamente.')})})});})();`;
  return js.replace(/<\//g, '<\\/');
}

export function renderPageHtml(
  page: Pick<BuilderPage, 'id' | 'title' | 'content'>,
  cfg: { apiUrl: string; anonKey: string },
): string {
  const body = (page.content.blocks as Block[]).map((b) => (R[b.type] ? R[b.type](b.props) : '')).join('\n');
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(page.title)}</title><style>${CSS}</style></head><body>${body}<script>${runtime(cfg.apiUrl, cfg.anonKey, page.id)}</script></body></html>`;
}
