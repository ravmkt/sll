import type { CSSProperties, ElementType } from 'react';
import { Clock, CreditCard, Gift, Headphones, Heart, Package, RefreshCw, ShieldCheck, Star, Truck } from 'lucide-react';
import type { BlockType } from '../types';
import type { BlockDef } from '../registry-extra';
import { ALIGN_OPTIONS, boxCss, boxFields, num, parseItems, safeUrl, textCss, textFields } from '../styleKit';

const ICONS: Record<string, ElementType> = {
  truck: Truck, refresh: RefreshCw, shield: ShieldCheck, card: CreditCard, gift: Gift,
  clock: Clock, star: Star, heart: Heart, support: Headphones, package: Package,
};

const ICON_OPTIONS = [
  { value: 'truck', label: 'Caminh\u00e3o (frete)' },
  { value: 'refresh', label: 'Troca / devolu\u00e7\u00e3o' },
  { value: 'shield', label: 'Seguran\u00e7a' },
  { value: 'card', label: 'Cart\u00e3o / pagamento' },
  { value: 'gift', label: 'Presente' },
  { value: 'clock', label: 'Prazo / rel\u00f3gio' },
  { value: 'star', label: 'Estrela' },
  { value: 'heart', label: 'Cora\u00e7\u00e3o' },
  { value: 'support', label: 'Atendimento' },
  { value: 'package', label: 'Pacote' },
];

const DEFAULT_ITEMS = JSON.stringify([
  { i: 'truck', t: 'Frete gr\u00e1tis', d: 'Em compras acima de R$ 199' },
  { i: 'refresh', t: 'Troca f\u00e1cil', d: '7 dias para trocar' },
  { i: 'shield', t: 'Compra segura', d: 'Seus dados protegidos' },
]);

const HL_CSS = `.sll-hl{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr))}
.sll-hl-i[data-clone]{display:none !important}
@media(max-width:640px){
.sll-hl[data-m="c"]{display:flex;position:relative;overflow-x:auto;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;scrollbar-width:none}
.sll-hl[data-m="c"]::-webkit-scrollbar{display:none}
.sll-hl[data-m="c"]>.sll-hl-i{flex:0 0 85%;scroll-snap-align:center;scroll-snap-stop:always}
.sll-hl[data-m="c"]>.sll-hl-i[data-clone]{display:flex !important}
}`;

const HL_JS = `(function(){if(window.__sllHl)return;window.__sllHl=1;
var mq=window.matchMedia("(max-width:640px)");
function setup(el){
var orig=Array.prototype.slice.call(el.children),n=orig.length;if(n<2)return;
orig.forEach(function(k){var a=k.cloneNode(true);a.setAttribute("data-clone","1");a.setAttribute("aria-hidden","true");el.insertBefore(a,orig[0])});
orig.forEach(function(k){var a=k.cloneNode(true);a.setAttribute("data-clone","1");a.setAttribute("aria-hidden","true");el.appendChild(a)});
var s=Number(el.getAttribute("data-s"))||0,pause=0,t;
function pos(i){var k=el.children[i];return k.offsetLeft+k.offsetWidth/2-el.clientWidth/2}
function near(){var k=el.children,m=el.scrollLeft+el.clientWidth/2,b=0,d=1e9;for(var j=0;j<k.length;j++){var x=Math.abs(k[j].offsetLeft+k[j].offsetWidth/2-m);if(x<d){d=x;b=j}}return b}
function jump(v){el.style.scrollSnapType="none";el.scrollLeft=v;requestAnimationFrame(function(){el.style.scrollSnapType=""})}
function center(){if(mq.matches)jump(pos(n))}
function norm(){if(!mq.matches)return;var b=near(),w=el.children[2*n].offsetLeft-el.children[n].offsetLeft;if(b<n)jump(el.scrollLeft+w);else if(b>=2*n)jump(el.scrollLeft-w)}
el.addEventListener("scroll",function(){clearTimeout(t);t=setTimeout(norm,120)},{passive:true});
el.addEventListener("touchstart",function(){pause=Date.now()+8000},{passive:true});
if(s>0)setInterval(function(){if(!mq.matches||Date.now()<pause)return;var i=Math.min(near()+1,3*n-1);el.scrollTo({left:pos(i),behavior:"smooth"})},s*1000);
center();window.addEventListener("load",center);
if(mq.addEventListener)mq.addEventListener("change",center);else mq.addListener(center)}
function init(){Array.prototype.forEach.call(document.querySelectorAll('.sll-hl[data-m="c"]'),setup)}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init()})();`;
export const STORE_BLOCKS: Partial<Record<BlockType, BlockDef>> = {
  announcement: {
    label: 'Barra de an\u00fancio',
    defaults: {
      text: 'Frete gr\u00e1tis em compras acima de R$ 199',
      href: '',
      bg: '#111827',
      align: 'center',
      pad: '10',
    },
    fields: [
      { key: 'text', label: 'Texto do an\u00fancio' },
      { key: 'href', label: 'Link (opcional)' },
      ...textFields('text', 'Texto', 40, { size: '14', color: '#ffffff', style: 'bold' }),
      { key: 'bg', label: 'Cor da barra', type: 'color', group: 'Barra' },
      { key: 'pad', label: 'Espa\u00e7o vertical (px)', type: 'number', min: 0, max: 60, group: 'Barra', def: '10' },
      { key: 'align', label: 'Alinhamento', type: 'select', options: ALIGN_OPTIONS, group: 'Barra', def: 'center' },
    ],
    render: (p) => (
      <section
        style={{
          background: p.bg || '#111827',
          padding: `${num(p.pad, 10)}px 16px`,
          textAlign: (p.align || 'center') as CSSProperties['textAlign'],
          ...textCss(p, 'text', { size: 14, color: '#ffffff', style: 'bold' }),
        }}
      >
        {p.href ? (
          <a href={safeUrl(p.href)} style={{ color: 'inherit', textDecoration: 'none' }}>{p.text}</a>
        ) : (
          p.text
        )}
      </section>
    ),
  },
  highlights: {
    label: 'Destaques informativos',
    defaults: {
      items: DEFAULT_ITEMS,
      mobile: 'stack',
      sec: '4',
      bg: '#f9fafb',
      pad: '24',
      gap: '16',
      align: 'center',
      iconSize: '32',
      iconColor: '#111827',
    },
    fields: [
      {
        key: 'items',
        label: 'Itens',
        type: 'repeater',
        group: 'Itens',
        itemLabel: 'Item',
        maxItems: 4,
        itemDefaults: { i: 'star', t: 'Novo destaque', d: 'Texto curto' },
        item: [
          { key: 'i', label: '\u00cdcone', type: 'select', options: ICON_OPTIONS },
          { key: 't', label: 'T\u00edtulo' },
          { key: 'd', label: 'Texto' },
        ],
      },
      { key: 'mobile', label: 'No celular', type: 'select', options: [{ value: 'stack', label: 'Empilhar' }, { value: 'carousel', label: 'Carrossel (arrastar)' }], group: 'Celular', def: 'stack' },
      { key: 'sec', label: 'Trocar a cada (segundos, s\u00f3 no carrossel, 0 = manual)', type: 'number', min: 0, max: 60, group: 'Celular', def: '4' },
      { key: 'bg', label: 'Cor de fundo da faixa', type: 'color', group: 'Faixa', def: '#f9fafb' },
      { key: 'pad', label: 'Espa\u00e7o vertical (px)', type: 'number', min: 0, max: 120, group: 'Faixa', def: '24' },
      { key: 'gap', label: 'Espa\u00e7o entre itens (px)', type: 'number', min: 0, max: 80, group: 'Faixa', def: '16' },
      { key: 'align', label: 'Alinhamento', type: 'select', options: ALIGN_OPTIONS, group: 'Faixa', def: 'center' },
      { key: 'iconSize', label: '\u00cdcone: tamanho (px)', type: 'number', min: 12, max: 96, group: '\u00cdcone', def: '32' },
      { key: 'iconColor', label: '\u00cdcone: cor', type: 'color', group: '\u00cdcone', def: '#111827' },
      ...textFields('title', 'T\u00edtulo', 40, { size: '16', color: '#111827', style: 'bold' }),
      ...textFields('desc', 'Texto', 40, { size: '14', color: '#4b5563', style: 'normal' }),
      ...boxFields('card', 'Cards', true, { pad: '16', radius: '8' }),
    ],
    render: (p) => {
      const list = parseItems(p.items).slice(0, 4).filter((x) => x.t || x.d);
      const carousel = p.mobile === 'carousel';
      const sec = Math.max(0, num(p.sec, 4));
      const al = p.align || 'center';
      const flex = al === 'left' ? 'flex-start' : al === 'right' ? 'flex-end' : 'center';
      return (
        <section style={{ background: p.bg || '#f9fafb', padding: `${num(p.pad, 24)}px 16px` }}>
          <style dangerouslySetInnerHTML={{ __html: HL_CSS }} />
          <div
            className="sll-hl"
            data-m={carousel ? 'c' : 's'}
            data-s={carousel && sec > 0 ? String(sec) : undefined}
            style={{ gap: num(p.gap, 16), maxWidth: 1100, margin: '0 auto' }}
          >
            {list.map((it, k) => {
              const Ic = ICONS[it.i] || Truck;
              return (
                <div
                  key={k}
                  className="sll-hl-i"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: flex,
                    textAlign: al as CSSProperties['textAlign'],
                    gap: 6,
                    ...boxCss(p, 'card', { pad: 16, radius: 8 }),
                  }}
                >
                  <Ic size={num(p.iconSize, 32)} color={p.iconColor || '#111827'} strokeWidth={2} />
                  {it.t ? <div style={textCss(p, 'title', { size: 16, color: '#111827', style: 'bold' })}>{it.t}</div> : null}
                  {it.d ? <div style={textCss(p, 'desc', { size: 14, color: '#4b5563', style: 'normal' })}>{it.d}</div> : null}
                </div>
              );
            })}
          </div>
          {carousel ? <script dangerouslySetInnerHTML={{ __html: HL_JS }} /> : null}
        </section>
      );
    },
  },
};