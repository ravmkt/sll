export const CAROUSEL_JS = `(function(root){
var tr=root.querySelector('[data-car-tr]');
if(!tr||!tr.children.length)return function(){};
var orig=[].slice.call(tr.children),n=orig.length,N=n,base=orig.slice();
var rm=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var secs=Math.max(1,+root.getAttribute('data-secs')||4);
var card=+root.getAttribute('data-card')||0;
var S={pos:0,raf:0,timer:0,drag:null,hover:0,moved:0,w:0,reps:0,b:0,mode:root.getAttribute('data-mode')||'manual'};
var cl=[];
tr.style.transition='none';
function sw(){return tr.children[0].getBoundingClientRect().width}
function paint(){if(!S.b)return;var s=sw();if(!s)return;var l=N*s;S.pos=((S.pos%l)+l)%l;tr.style.transform='translate3d('+(-(l+S.pos))+'px,0,0)'}
function halt(){if(S.raf){cancelAnimationFrame(S.raf);S.raf=0}}
function glide(v){halt();var last=performance.now();function f(t){var dt=Math.min(40,t-last);last=t;S.pos+=v*dt;v*=Math.pow(0.94,dt/16);paint();S.raf=Math.abs(v)>0.015?requestAnimationFrame(f):0}S.raf=requestAnimationFrame(f)}
function step(d){halt();var s=sw();if(!s)return;var from=S.pos,to=(Math.round(from/s)+d)*s,t0=performance.now();function f(t){var k=Math.min(1,(t-t0)/600);var e=1-Math.pow(1-k,3);S.pos=from+(to-from)*e;paint();S.raf=k<1?requestAnimationFrame(f):0}S.raf=requestAnimationFrame(f)}
function stop(){clearInterval(S.timer);S.timer=0}
function start(){stop();if(S.mode==='auto'&&!rm&&N>1)S.timer=setInterval(function(){if(!S.hover&&!S.drag&&!S.raf&&!document.hidden&&sw())step(1)},secs*1000)}
function clear(){cl.forEach(function(c){if(c.parentNode)c.parentNode.removeChild(c)});cl=[]}
function mk(el){var c=el.cloneNode(true);c.setAttribute('aria-hidden','true');[].slice.call(c.querySelectorAll('a')).forEach(function(a){a.tabIndex=-1});cl.push(c);return c}
function build(){
clear();stop();halt();S.pos=0;S.b=0;N=n;base=orig.slice();
var w=root.clientWidth;
if(!w){tr.style.transform='';return}
var reps=1,k,r;
if(card>0)reps=Math.max(1,Math.ceil((w+card)/(n*card)));
S.reps=reps;
if(n<2&&reps<2){tr.style.transform='';return}
for(r=1;r<reps;r++)for(k=0;k<n;k++){var c=mk(orig[k]);tr.appendChild(c);base.push(c)}
N=base.length;
for(k=0;k<N;k++)tr.appendChild(mk(base[k]));
for(k=N-1;k>=0;k--)tr.insertBefore(mk(base[k]),tr.firstChild);
S.b=1;paint();start();
}
function dn(e){if(!S.b||(e.pointerType==='mouse'&&e.button!==0))return;halt();S.drag={x:e.clientX,id:e.pointerId,p0:S.pos,on:0,lx:e.clientX,lt:performance.now(),v:0}}
function mv(e){var d=S.drag;if(!d||e.pointerId!==d.id)return;var dx=e.clientX-d.x;if(!d.on&&Math.abs(dx)>6){d.on=1;try{tr.setPointerCapture(e.pointerId)}catch(x){}}if(d.on){var t=performance.now(),dt=t-d.lt;S.pos=d.p0-dx;if(dt>0)d.v=0.7*d.v+0.3*((d.lx-e.clientX)/dt);d.lx=e.clientX;d.lt=t;paint()}}
function up(e){var d=S.drag;if(!d||e.pointerId!==d.id)return;S.drag=null;if(!d.on)return;S.moved=1;setTimeout(function(){S.moved=0},0);var v=performance.now()-d.lt>80?0:d.v;v=Math.max(-4,Math.min(4,v));if(Math.abs(v)>0.05)glide(v)}
function en(e){if(e.pointerType==='mouse')S.hover=1}
function lv(e){if(e.pointerType==='mouse')S.hover=0}
function ck(e){if(S.moved){e.preventDefault();e.stopPropagation()}}
function ds(e){e.preventDefault()}
function rs(){var w=root.clientWidth;if(!w){S.w=0;stop();halt();return}var want=card>0?Math.max(1,Math.ceil((w+card)/(n*card))):1;if(!S.w||(card>0&&want!==S.reps)){S.w=w;build()}else{S.w=w;if(!S.drag&&!S.raf)paint()}}
tr.addEventListener('pointerdown',dn);tr.addEventListener('pointermove',mv);tr.addEventListener('pointerup',up);tr.addEventListener('pointercancel',up);
tr.addEventListener('click',ck,true);tr.addEventListener('dragstart',ds);
root.addEventListener('pointerenter',en);root.addEventListener('pointerleave',lv);
var ro=null;
if(window.ResizeObserver){ro=new ResizeObserver(rs);ro.observe(root)}else window.addEventListener('resize',rs);
S.w=root.clientWidth;build();
return function(){
stop();halt();clear();
tr.removeEventListener('pointerdown',dn);tr.removeEventListener('pointermove',mv);tr.removeEventListener('pointerup',up);tr.removeEventListener('pointercancel',up);
tr.removeEventListener('click',ck,true);tr.removeEventListener('dragstart',ds);
root.removeEventListener('pointerenter',en);root.removeEventListener('pointerleave',lv);
if(ro)ro.disconnect();else window.removeEventListener('resize',rs);
tr.style.transform='';tr.style.transition='';
};
})`;