import type { Block, BuilderPage } from '../types';
import { renderBlocksHtml } from '../renderStatic';
import { CAROUSEL_JS } from '../blocks/carouselJs';
import { seoHead } from './seo';
import { bgStyle, styleToCss } from '../bg';

const esc = (s = '') =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const CSS = `*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#1f2937;line-height:1.5}img,video,iframe{max-width:100%}h1,h2,h3,p{overflow-wrap:anywhere}`;

function runtime(apiUrl: string, anonKey: string, pageId: string, preview = false): string {
  const js = `(function(){var API=${JSON.stringify(apiUrl)},KEY=${JSON.stringify(anonKey)},PAGE=${JSON.stringify(pageId)},PV=${preview ? 1 : 0};
try{var CAR=${CAROUSEL_JS};document.querySelectorAll('[data-car]').forEach(function(el){CAR(el)})}catch(e){}
function p(n){return String(n).padStart(2,'0')}
try{if(!PV){var VK='sllv_'+PAGE,SID=null;try{SID=localStorage.getItem('sllvid')}catch(e){}
if(!SID){SID=Math.random().toString(36).slice(2)+Date.now().toString(36);try{localStorage.setItem('sllvid',SID)}catch(e){}}
function tr(ev){fetch(API+'/rest/v1/rpc/track_page_view',{method:'POST',keepalive:true,headers:{'Content-Type':'application/json',apikey:KEY,Authorization:'Bearer '+KEY},body:JSON.stringify({p_page_id:PAGE,p_session:SID,p_event:ev})}).catch(function(){})}
if(!sessionStorage.getItem(VK)){sessionStorage.setItem(VK,'1');tr('view')}
document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href]');if(!a)return;var h=a.getAttribute('href')||'';if(h.charAt(0)==='#'||h.indexOf('javascript:')===0)return;tr('cta_click')})}}catch(e){}
function done(f,b){var m=document.createElement('div');m.style.textAlign='center';
var t=document.createElement('p');t.textContent=f.getAttribute('data-success')||'';t.style.cssText='margin:0 0 12px;font-weight:700;font-size:17px;line-height:1.4;color:'+(f.getAttribute('data-sc')||'#f5e6b3');m.appendChild(t);
var c=f.getAttribute('data-coupon');if(c){var q=document.createElement('p');q.textContent=c;q.style.cssText='display:inline-block;margin:0 0 12px;padding:10px 18px;border-radius:10px;font-size:22px;font-weight:800;letter-spacing:.08em;color:'+(f.getAttribute('data-cc')||'#d4af37')+';background:'+(f.getAttribute('data-cbg')||'transparent')+';border:2px dashed '+(f.getAttribute('data-cbc')||'#d4af37');m.appendChild(q)}
var v=f.getAttribute('data-vip');if(v){var a=document.createElement('a');a.href=v;a.target='_blank';a.rel='noopener';a.textContent=f.getAttribute('data-vip-label')||'Entrar no grupo VIP';
a.style.cssText='display:block;padding:14px 20px;border-radius:10px;font-weight:700;text-decoration:none;text-align:center;background:'+(b.style.backgroundColor||'#10b981')+';color:'+(b.style.color||'#fff');m.appendChild(a)}
f.replaceChildren(m)}
document.querySelectorAll('[data-sll-preview]').forEach(function(e){e.remove()});
document.querySelectorAll('[data-end]').forEach(function(el){var end=new Date(el.getAttribute('data-end')).getTime(),c=el.querySelector('[data-clock]');
function t(){var s=Math.floor(Math.max(0,end-Date.now())/1000);c.textContent=p(Math.floor(s/86400))+'d '+p(Math.floor(s%86400/3600))+'h '+p(Math.floor(s%3600/60))+'m '+p(s%60)+'s'}
t();setInterval(t,1000)});
document.querySelectorAll('[data-cd]').forEach(function(el){var end=new Date(el.getAttribute('data-cd')).getTime(),n=el.querySelectorAll('[data-u]');function t(){var s=Math.floor(Math.max(0,end-Date.now())/1000),v=[Math.floor(s/86400),Math.floor(s%86400/3600),Math.floor(s%3600/60),s%60];n.forEach(function(x,i){x.textContent=p(v[i])})}if(!isNaN(end)){t();setInterval(t,1000)}});
document.querySelectorAll('[data-sll-form]').forEach(function(f){f.addEventListener('submit',function(e){e.preventDefault();
var b=f.querySelector('button'),x=f.elements;function g(n){return x[n]?x[n].value:''}b.disabled=true;
fetch(API+'/rest/v1/rpc/capture_lead',{method:'POST',headers:{'Content-Type':'application/json',apikey:KEY,Authorization:'Bearer '+KEY},
body:JSON.stringify({p_page_id:PAGE,p_name:g('name'),p_email:g('email'),p_whatsapp:g('whatsapp'),p_tag:f.getAttribute('data-tag')||null})})
.then(function(r){if(!r.ok)throw new Error('err');done(f,b)})
.catch(function(){b.disabled=false;alert('Não foi possível enviar. Tente novamente.')})})});})();`;
  return js.replace(/<\//g, '<\\/');
}

export function renderPageHtml(
  page: Pick<BuilderPage, 'id' | 'title' | 'content'>,
  cfg: { apiUrl: string; anonKey: string; preview?: boolean },
): string {
  const s = page.content.settings ?? {};
  const maxW = Number(s.maxW) > 0 ? Number(s.maxW) : 0;
  const minH = Number(s.minH) > 0 ? Number(s.minH) : 0;
  const full = s.fullH === '1';
  const sllBadgeHtml = s.sllBadge === '0' ? '' : '<a href="https://sllhub.com.br" target="_blank" rel="noopener" style="position:absolute;bottom:8px;left:50%;transform:translateX(-50%);z-index:50;display:flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;background:rgba(0,0,0,.45);color:#fff;font:600 11px/1 Arial,sans-serif;text-decoration:none;opacity:.85;white-space:nowrap"><span>Feito com SLL Hub</span><img src="https://app.sllhub.com.br/sll-hub-logo.png" alt="SLL Hub" style="height:16px;width:auto;display:block" onerror="this.remove()"></a>';
  const fit = s.fitScreen === '1';
  const fitPct = Math.min(100, Math.max(30, Number(s.fitMin) || 40));
  const fitJs = fit ? '<script>' + [
    '(function(){',
    'var MIN=' + fitPct / 100 + ';',
    'var b=document.body,d=document.documentElement,t;',
    'function fit(){',
    'b.style.zoom="";',
    'if(window.innerWidth<900)return;',
    'var z=1,n=0;',
    'while(n++<14&&d.scrollHeight>d.clientHeight+1&&z>MIN){',
    'z=Math.max(MIN,z*Math.min(0.98,d.clientHeight/d.scrollHeight));',
    'b.style.zoom=z;',
    '}',
    '}',
    'function sched(){clearTimeout(t);t=setTimeout(fit,60);}',
    'window.addEventListener("resize",sched);',
    'window.addEventListener("load",sched);',
    'if(document.fonts&&document.fonts.ready){document.fonts.ready.then(sched);}',
    'sched();',
    '})();',
  ].join('') + '</script>' : '';
  const fullCss = full ? 'html{min-height:100%}body{min-height:100vh;min-height:100dvh}' : '';
  const wrap = [maxW ? 'max-width:' + maxW + 'px' : '', maxW ? 'margin:0 auto' : '', minH ? 'min-height:' + minH + 'px' : '', full ? 'min-height:100vh;min-height:100dvh' : ''].filter(Boolean).join(';');
  const inner = renderBlocksHtml(page.content.blocks as Block[]);
  const body = wrap ? '<main style="' + wrap + '">' + inner + '</main>' : inner;
  const bgCss = styleToCss(bgStyle(s));
  const pageBgAttr = ' style="' + esc((bgCss ? bgCss + ';' : '') + 'min-height:100%') + '"';
  const pageBgCss = 'html,body{margin:0}body{min-height:100vh;position:relative}' + (bgCss ? 'body{background:transparent}' : '');
  return '<!doctype html><html lang="pt-BR"' + pageBgAttr + '><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' + seoHead(s, page.title) + '<style>' + CSS + fullCss + 'html[style*="url("]{background-color:#141414}' + pageBgCss + '</style></head><body>' + body + '<script>' + runtime(cfg.apiUrl, cfg.anonKey, page.id, cfg.preview) + '</script>' + fitJs + '' + sllBadgeHtml + '</body></html>';
}

