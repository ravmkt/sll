import type { Preset, Theme, P } from './presets';
import { mk, brand, badge, head, chips, count, benefits, form } from './presets';

const RED: Theme = { bg: '#0f0505', card: '#1c0b0b', line: '#5c1f1f', accent: '#ef4444', text: '#fef2f2', muted: '#fca5a5', btnText: '#ffffff', input: '#0f0505' };
const VIOLET: Theme = { bg: '#0f0a1f', card: '#1a1330', line: '#4c3a7a', accent: '#a78bfa', text: '#f5f3ff', muted: '#c4b5fd', btnText: '#0f0a1f', input: '#0f0a1f' };

const asset = (name: string) => `${window.location.origin}/assets/templates/${name}`;

export const PRESETS_MEDIA: Preset[] = [
  {
    id: 'preset:bf-video',
    name: 'Black Friday - V\u00eddeo',
    category: 'Black Friday',
    type: 'landing',
    description: 'V\u00eddeo de abertura + contagem + cadastro com cupom.',
    swatch: [RED.bg, RED.accent, RED.card],
    build: () => ({
      blocks: [
        brand(RED),
        badge(RED, '\u2726 BLACK FRIDAY \u00b7 27 DE NOVEMBRO \u2726'),
        head(RED, 'ASSISTA E', 'GARANTA SEU CUPOM', 'Veja o que preparamos e cadastre-se para receber **o cupom antecipado**.'),
        mk('video', { url: asset('bf-video.mp4') } as P),
        count(RED),
        benefits(RED, '\ud83c\udfaf O QUE VEM POR A\u00cd', '', [
          { ic: '\ud83d\uded2', t: '**Descontos progressivos** por quantidade' },
          { ic: '\u26a1', t: '**Desconto extra** no PIX' },
          { ic: '\ud83d\ude9a', t: 'Frete gr\u00e1tis em compras selecionadas' },
        ]),
        form(RED, {
          title: 'Libere seu cupom', sub: 'Cadastre-se e receba o c\u00f3digo **agora**.',
          btn: 'Quero meu cupom', success: 'Cupom liberado! Copie o c\u00f3digo abaixo:',
          askName: '0', askEmail: '1', askWhatsapp: '1', coupon: 'BLACK10',
        }),
      ],
    }),
  },
  {
    id: 'preset:bf-imagem',
    name: 'Black Friday - Imagem',
    category: 'Black Friday',
    type: 'landing',
    description: 'Imagem de destaque no topo + selos + cadastro.',
    swatch: [VIOLET.bg, VIOLET.accent, VIOLET.card],
    build: () => ({
      blocks: [
        brand(VIOLET),
        mk('image', { src: asset('bf-imagem.jpg'), alt: 'Black Friday', radius: '16' } as P),
        badge(VIOLET, '\u2726 BLACK FRIDAY \u00b7 27 DE NOVEMBRO \u2726'),
        head(VIOLET, 'A MAIOR PROMO\u00c7\u00c3O', 'DO ANO CHEGOU', 'Cadastre-se e seja **o primeiro a saber** quando as ofertas abrirem.'),
        chips(VIOLET, [{ t: '\ud83d\uded2 At\u00e9 35% OFF' }, { t: '\u26a1 5% OFF no PIX' }, { t: '\ud83d\udcb3 6x sem juros' }, { t: '\ud83d\ude9a Frete gr\u00e1tis' }]),
        count(VIOLET),
        form(VIOLET, {
          title: 'Quero ser avisado', sub: 'Deixe seus dados e receba **em primeira m\u00e3o**.',
          btn: 'Avise-me', success: 'Cadastro feito! Voc\u00ea ser\u00e1 avisado.',
          askName: '1', askEmail: '1', askWhatsapp: '1',
        }),
      ],
    }),
  },
];