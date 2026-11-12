import type { Block, BuilderPage } from '../types';
import { renderBlocksHtml } from '../renderStatic';
import { CAROUSEL_JS } from '../blocks/carouselJs';

const esc = (s = '') =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const CSS = `*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#1f2937;line-height:1.5}img,video,iframe{max-width:100%}h1,h2,h3,p{overflow-wrap:anywhere}`;

function runtime(apiUrl: string, anonKey: string, pageId: string): string {
  const js = `(function(){var API=${JSON.stringify(apiUrl)},KEY=${JSON.stringify(anonKey)},PAGE=${JSON.stringify(pageId)};
try{var CAR=${CAROUSEL_JS};document.querySelectorAll('[data-car]').forEach(function(el){CAR(el)})}catch(e){}
function p(n){return String(n).padStart(2,'0')}
function done(f,b){var m=document.createElement('div');m.style.textAlign='center';
var t=document.createElement('p');t.textContent=f.getAttribute('data-success')||'';t.style.margin='0 0 12px';t.style.fontWeight='700';m.appendChild(t);
var c=f.getAttribute('data-coupon');if(c){var q=document.createElement('p');q.textContent=c;q.style.cssText='display:inline-block;margin:0 0 12px;padding:10px 18px;border:2px dashed currentColor;border-radius:10px;font-size:22px;font-weight:800;letter-spacing:.08em';m.appendChild(q)}
var v=f.getAttribute('data-vip');if(v){var a=document.createElement('a');a.href=v;a.target='_blank';a.rel='noopener';a.textContent=f.getAttribute('data-vip-label')||'Entrar no grupo VIP';
a.style.cssText='display:block;padding:14px 20px;border-radius:10px;font-weight:700;text-decoration:none;text-align:center;background:'+(b.style.backgroundColor||'#10b981')+';color:'+(b.style.color||'#fff');m.appendChild(a)}
f.replaceChildren(m)}
document.querySelectorAll('[data-end]').forEach(function(el){var end=new Date(el.getAttribute('data-end')).getTime(),c=el.querySelector('[data-clock]');
function t(){var s=Math.floor(Math.max(0,end-Date.now())/1000);c.textContent=p(Math.floor(s/86400))+'d '+p(Math.floor(s%86400/3600))+'h '+p(Math.floor(s%3600/60))+'m '+p(s%60)+'s'}
t();setInterval(t,1000)});
document.querySelectorAll('[data-cd]').forEach(function(el){var end=new Date(el.getAttribute('data-cd')).getTime(),n=el.querySelectorAll('[data-u]');function t(){var s=Math.floor(Math.max(0,end-Date.now())/1000),v=[Math.floor(s/86400),Math.floor(s%86400/3600),Math.floor(s%3600/60),s%60];n.forEach(function(x,i){x.textContent=p(v[i])})}if(!isNaN(end)){t();setInterval(t,1000)}});
document.querySelectorAll('[data-sll-form]').forEach(function(f){f.addEventListener('submit',function(e){e.preventDefault();
var b=f.querySelector('button'),x=f.elements;function g(n){return x[n]?x[n].value:''}b.disabled=true;
fetch(API+'/rest/v1/rpc/capture_lead',{method:'POST',headers:{'Content-Type':'application/json',apikey:KEY,Authorization:'Bearer '+KEY},
body:JSON.stringify({p_page_id:PAGE,p_name:g('name'),p_email:g('email'),p_whatsapp:g('whatsapp')})})
.then(function(r){if(!r.ok)throw new Error('err');done(f,b)})
.catch(function(){b.disabled=false;alert('Não foi possível enviar. Tente novamente.')})})});})();`;
  return js.replace(/<\//g, '<\\/');
}

export function renderPageHtml(
  page: Pick<BuilderPage, 'id' | 'title' | 'content'>,
  cfg: { apiUrl: string; anonKey: string },
): string {
  const body = renderBlocksHtml(page.content.blocks as Block[]);
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(page.title)}</title><style>${CSS}</style></head><body>${body}<script>${runtime(cfg.apiUrl, cfg.anonKey, page.id)}</script></body></html>`;
}