export const CAROUSEL_JS = `(function(root){
var tr=root.querySelector('[data-car-tr]');
if(!tr||!tr.children.length)return function(){};
var orig=[].slice.call(tr.children),n=orig.length,N=n,base=orig.slice();
var rm=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var secs=Math.max(1,+root.getAttribute('data-secs')||4);
var card=+root.getAttribute('data-card')||0;
var S={i:0,busy:0,timer:0,t:0,drag:null,hover:0,moved:0,w:0,mode:root.getAttribute('data-mode')||'manual'};
var cl=[];
function sw(){return tr.children[0].getBoundingClientRect().width}
function place(anim,x){tr.style.transition=anim?'transform .5s ease':'none';tr.style.transform='translate3d('+(-(N+S.i)*sw()+(x||0))+'px,0,0)'}
function fin(){clearTimeout(S.t);S.busy=0;if(S.i>=N)S.i-=N;else if(S.i<0)S.i+=N;place(false)}
function go(d){if(S.busy||!sw())return;S.busy=1;S.i+=d;place(true);S.t=setTimeout(fin,540)}
function stop(){clearInterval(S.timer);S.timer=0}
function start(){stop();if(S.mode==='auto'&&!rm&&N>1)S.timer=setInterval(function(){if(!S.hover&&!S.drag&&!document.hidden&&sw())go(1)},secs*1000)}
function clear(){clearTimeout(S.t);S.busy=0;cl.forEach(function(c){if(c.parentNode)c.parentNode.removeChild(c)});cl=[]}
function mk(el){var c=el.cloneNode(true);c.setAttribute('aria-hidden','true');[].slice.call(c.querySelectorAll('a')).forEach(function(a){a.tabIndex=-1});cl.push(c);return c}
function build(){
clear();stop();S.i=0;N=n;base=orig.slice();
var w=root.clientWidth;
if(!w){tr.style.transform='';return}
var reps=1,k,r;
if(card>0)reps=Math.max(1,Math.ceil((w+card)/(n*card)));
if(n<2&&reps<2){tr.style.transform='';return}
for(r=1;r<reps;r++)for(k=0;k<n;k++){var c=mk(orig[k]);tr.appendChild(c);base.push(c)}
N=base.length;
for(k=0;k<N;k++)tr.appendChild(mk(base[k]));
for(k=N-1;k>=0;k--)tr.insertBefore(mk(base[k]),tr.firstChild);
place(false);start();
}
function dn(e){if(N<2||S.busy||(e.pointerType==='mouse'&&e.button!==0))return;S.drag={x:e.clientX,id:e.pointerId,dx:0,on:0}}
function mv(e){var d=S.drag;if(!d||e.pointerId!==d.id)return;d.dx=e.clientX-d.x;if(!d.on&&Math.abs(d.dx)>6){d.on=1;try{tr.setPointerCapture(e.pointerId)}catch(x){}}if(d.on){var w=sw();place(false,Math.max(-w,Math.min(w,d.dx)))}}
function up(e){var d=S.drag;if(!d||e.pointerId!==d.id)return;S.drag=null;if(!d.on)return;S.moved=1;setTimeout(function(){S.moved=0},0);var th=sw()/4;if(d.dx<-th)go(1);else if(d.dx>th)go(-1);else{S.busy=1;place(true);S.t=setTimeout(fin,540)}}
function en(e){if(e.pointerType==='mouse')S.hover=1}
function lv(e){if(e.pointerType==='mouse')S.hover=0}
function ck(e){if(S.moved){e.preventDefault();e.stopPropagation()}}
function ds(e){e.preventDefault()}
function rs(){var w=root.clientWidth;if(!w){S.w=0;stop()}else if(!S.w||(card>0&&Math.abs(w-S.w)>1&&!S.drag)){S.w=w;build()}else{S.w=w;if(!S.busy&&!S.drag)place(false)}}
tr.addEventListener('pointerdown',dn);tr.addEventListener('pointermove',mv);tr.addEventListener('pointerup',up);tr.addEventListener('pointercancel',up);
tr.addEventListener('click',ck,true);tr.addEventListener('dragstart',ds);
root.addEventListener('pointerenter',en);root.addEventListener('pointerleave',lv);
var ro=null;
if(window.ResizeObserver){ro=new ResizeObserver(rs);ro.observe(root)}else window.addEventListener('resize',rs);
S.w=root.clientWidth;build();
return function(){
stop();clear();
tr.removeEventListener('pointerdown',dn);tr.removeEventListener('pointermove',mv);tr.removeEventListener('pointerup',up);tr.removeEventListener('pointercancel',up);
tr.removeEventListener('click',ck,true);tr.removeEventListener('dragstart',ds);
root.removeEventListener('pointerenter',en);root.removeEventListener('pointerleave',lv);
if(ro)ro.disconnect();else window.removeEventListener('resize',rs);
tr.style.transform='';tr.style.transition='';
};
})`;