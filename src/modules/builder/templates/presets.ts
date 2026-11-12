import type { Block, BlockType, PageContent } from '../types';
import { makeBlock } from '../store';

type P = Record<string, string>;
type Theme = { bg: string; card: string; line: string; accent: string; text: string; muted: string; btnText: string; input: string };

export type Preset = {
  id: string; name: string; category: string; type: 'landing'; description: string;
  swatch: [string, string, string]; build: () => PageContent;
};

const END = '2026-11-27T23:59';
const GOLD: Theme = { bg: '#0b0a08', card: '#14110d', line: '#5c4a1f', accent: '#d4af37', text: '#f5f5f4', muted: '#e5e7eb', btnText: '#0b0a08', input: '#0b0a08' };
const NAVY: Theme = { bg: '#0b1220', card: '#131c2f', line: '#2a3a5c', accent: '#38bdf8', text: '#f1f5f9', muted: '#94a3b8', btnText: '#0b1220', input: '#0b1220' };
const LIGHT: Theme = { bg: '#ffffff', card: '#f8fafc', line: '#e2e8f0', accent: '#111827', text: '#111827', muted: '#64748b', btnText: '#ffffff', input: '#ffffff' };
const HOT: Theme = { bg: '#0a0a0a', card: '#18181b', line: '#3f3f46', accent: '#f43f5e', text: '#fafafa', muted: '#a1a1aa', btnText: '#ffffff', input: '#0a0a0a' };

const mk = (type: BlockType, props: P = {}): Block => {
  const b = makeBlock(type);
  return { ...b, props: { ...b.props, ...props } };
};
const list = (a: P[]) => JSON.stringify(a);

const brand = (t: Theme, o: P = {}) => mk('brandbar', { bg: t.bg, nameColor: t.accent, ...o });
const badge = (t: Theme, text: string, o: P = {}) => mk('badge', { text, bg: t.bg, bc: t.accent, tColor: t.accent, ...o });
const head = (t: Theme, l1: string, l2: string, sub: string, o: P = {}) =>
  mk('heading', { l1, l2, sub, bg: t.bg, l1Color: t.text, l2Color: t.accent, subColor: t.muted, ...o });
const chips = (t: Theme, items: P[], o: P = {}) =>
  mk('chips', { items: list(items), bg: t.bg, chipBg: t.card, chipBc: t.line, tColor: t.text, ...o });
const count = (t: Theme, o: P = {}) =>
  mk('countdown', { endsAt: END, bg: t.bg, boxBg: t.card, boxBc: t.line, lblColor: t.muted, nColor: t.accent, ...o });
const benefits = (t: Theme, title: string, intro: string, items: P[]) =>
  mk('benefits', { title, intro, items: list(items), bg: t.bg, cardBg: t.card, cardBc: t.line, titleColor: t.accent, itemColor: t.text });
const form = (t: Theme, o: P) =>
  mk('leadform', {
    bg: t.bg, cardBg: t.card, cardBc: t.line, inputBg: t.input, inputBc: t.line, inputColor: t.text,
    btnBg: t.accent, btnColor: t.btnText, titleColor: t.accent, subColor: t.muted,
    successColor: t.text, couponColor: t.accent, couponBc: t.accent, couponBg: t.bg, ...o,
  });

const BF = '\u2726 BLACK FRIDAY \u00b7 27 DE NOVEMBRO \u2726';

export const PRESETS: Preset[] = [
  {
    id: 'preset:ouro-vip',
    name: 'Black Friday - Ouro VIP',
    category: 'Black Friday',
    type: 'landing',
    description: 'Escuro e dourado. Cadastro + grupo VIP + contagem + benef\u00edcios.',
    swatch: [GOLD.bg, GOLD.accent, GOLD.card],
    build: () => ({
      blocks: [
        brand(GOLD),
        badge(GOLD, BF),
        head(GOLD, 'ACESSO VIP', 'ANTES DE TODO MUNDO', 'Entre no grupo VIP e receba as **ofertas da Black Friday** em primeira m\u00e3o.'),
        count(GOLD),
        benefits(GOLD, '\ud83c\udfaf O QUE VOC\u00ca GANHA', 'Quem entra no VIP sai na frente:', [
          { ic: '\ud83d\udd14', t: '**Aviso antecipado** das ofertas' },
          { ic: '\ud83d\udcb0', t: '**Descontos exclusivos** para o grupo' },
          { ic: '\ud83c\udf81', t: '**Brindes** em compras selecionadas' },
          { ic: '\u26a1', t: 'Estoque reservado para VIPs' },
        ]),
        form(GOLD, {
          title: 'Entre para a lista VIP', sub: 'Cadastre-se e **garanta seu acesso antecipado**.',
          btn: 'Quero entrar no VIP', success: 'Cadastro realizado! Toque no bot\u00e3o abaixo para entrar no grupo.',
          askName: '1', askEmail: '0', askWhatsapp: '1', vip: '1', vipUrl: 'https://chat.whatsapp.com/', vipLabel: 'Entrar no grupo VIP',
        }),
      ],
    }),
  },
  {
    id: 'preset:lista-espera',
    name: 'Black Friday - Lista de Espera',
    category: 'Black Friday',
    type: 'landing',
    description: 'Azul noite. Foco na captura de leads antes da abertura das ofertas.',
    swatch: [NAVY.bg, NAVY.accent, NAVY.card],
    build: () => ({
      blocks: [
        brand(NAVY),
        badge(NAVY, '\u2726 LISTA DE ESPERA \u00b7 BLACK FRIDAY \u2726'),
        head(NAVY, 'A BLACK FRIDAY', 'EST\u00c1 CHEGANDO', 'Entre na lista de espera e seja **avisado assim que as ofertas abrirem**.'),
        form(NAVY, {
          title: 'Quero ser avisado', sub: 'Sem spam. Voc\u00ea recebe **um \u00fanico aviso** quando abrirmos.',
          btn: 'Entrar na lista de espera', success: 'Voc\u00ea est\u00e1 na lista! Avisaremos assim que as ofertas abrirem.',
          askName: '1', askEmail: '1', askWhatsapp: '1',
        }),
        count(NAVY),
        chips(NAVY, [{ t: '\ud83d\uded2 Descontos progressivos' }, { t: '\u26a1 Desconto no PIX' }, { t: '\ud83d\udcb3 Parcele sem juros' }, { t: '\ud83d\ude9a Frete gr\u00e1tis' }]),
      ],
    }),
  },
  {
    id: 'preset:contagem-minimal',
    name: 'Black Friday - Contagem Minimal',
    category: 'Black Friday',
    type: 'landing',
    description: 'Claro e limpo. T\u00edtulo, contagem e e-mail. Selo e benef\u00edcios v\u00eam ocultos.',
    swatch: [LIGHT.bg, LIGHT.accent, LIGHT.card],
    build: () => ({
      blocks: [
        brand(LIGHT, { nameColor: LIGHT.accent }),
        mk('badge', { text: BF, bg: LIGHT.bg, bc: LIGHT.accent, tColor: LIGHT.accent, hidden: '1' }),
        head(LIGHT, 'BLACK FRIDAY', '27.11', 'Algo grande est\u00e1 chegando. Cadastre seu e-mail para ser o primeiro a saber.', { l2Color: LIGHT.muted }),
        count(LIGHT),
        chips(LIGHT, [{ t: '\u26a1 Desconto no PIX' }, { t: '\ud83d\ude9a Frete gr\u00e1tis' }], { hidden: '1' }),
        form(LIGHT, {
          title: 'Receba o aviso', sub: 'Deixe seu e-mail.', btn: 'Avise-me', success: 'Pronto! Voc\u00ea ser\u00e1 avisado.',
          askName: '0', askEmail: '1', askWhatsapp: '0',
        }),
      ],
    }),
  },
  {
    id: 'preset:cupom-antecipado',
    name: 'Black Friday - Cupom Antecipado',
    category: 'Black Friday',
    type: 'landing',
    description: 'Preto e rosa. O cadastro revela um cupom na hora.',
    swatch: [HOT.bg, HOT.accent, HOT.card],
    build: () => ({
      blocks: [
        brand(HOT),
        badge(HOT, '\u2726 CUPOM ANTECIPADO \u2726'),
        head(HOT, 'CADASTRE-SE E GANHE', '10% OFF EXTRA', 'Cadastre seu e-mail e receba na hora o **cupom antecipado** da Black Friday.'),
        form(HOT, {
          title: 'Libere seu cupom', sub: 'Receba o c\u00f3digo **agora** e use quando as ofertas abrirem.',
          btn: 'Quero meu cupom', success: 'Cupom liberado! Copie o c\u00f3digo abaixo e use no checkout:',
          askName: '0', askEmail: '1', askWhatsapp: '1', coupon: 'BLACK10',
        }),
        chips(HOT, [{ t: '\u26a1 5% OFF no PIX' }, { t: '\ud83d\udcb3 6x sem juros' }, { t: '\ud83d\ude9a Frete gr\u00e1tis' }]),
        count(HOT),
      ],
    }),
  },
];