import type { Preset, Theme, P } from './presets';
import { mk, brand, badge, head, chips, count, benefits, form, GOLD, NAVY } from './presets';

const asset = (name: string) => `${window.location.origin}/assets/templates/${name}`;

// Ajuste so aqui se a estrutura do bloco "columns" for diferente (ver diag-columns.txt)
const cols = (n: '2' | '3', left: any[], right: any[], extra: any[] = []) => {
  const c: any = mk('columns', { cols: n, stack: '1', gap: '32', align: 'center' } as P);
  c.children = n === '2' ? [left, right] : [left, right, extra];
  return c;
};

export const PRESETS_DESKTOP: Preset[] = [
  {
    id: 'preset:desk-split-ouro',
    name: 'Desktop - Split Ouro',
    category: 'Black Friday',
    type: 'landing',
    description: 'Texto e contagem \u00e0 esquerda, cadastro \u00e0 direita, tudo na primeira dobra.',
    swatch: [GOLD.bg, GOLD.accent, GOLD.card],
    build: () => ({
      blocks: [
        brand(GOLD),
        cols('2',
          [
            badge(GOLD, '\u2726 BLACK FRIDAY \u00b7 27 DE NOVEMBRO \u2726'),
            head(GOLD, 'LISTA VIP', 'BLACK FRIDAY', 'Entre antes de todo mundo e garanta **ofertas exclusivas**.'),
            count(GOLD),
          ],
          [
            form(GOLD, {
              title: 'Entrar na lista VIP', sub: 'Cadastro r\u00e1pido, **sem custo**.',
              btn: 'Quero entrar', success: 'Voc\u00ea est\u00e1 na lista!',
              askName: '1', askEmail: '1', askWhatsapp: '1',
            }),
          ]),
        chips(GOLD, [{ t: '\ud83d\uded2 At\u00e9 35% OFF' }, { t: '\u26a1 5% OFF no PIX' }, { t: '\ud83d\ude9a Frete gr\u00e1tis' }]),
      ],
    }),
  },
  {
    id: 'preset:desk-split-cupom',
    name: 'Desktop - Split Cupom',
    category: 'Black Friday',
    type: 'landing',
    description: 'Chamada + benef\u00edcios \u00e0 esquerda, cupom antecipado \u00e0 direita.',
    swatch: [NAVY.bg, NAVY.accent, NAVY.card],
    build: () => ({
      blocks: [
        brand(NAVY),
        cols('2',
          [
            head(NAVY, 'CUPOM ANTECIPADO', 'BLACK FRIDAY', 'Cadastre-se e receba o c\u00f3digo **antes da abertura**.'),
            benefits(NAVY, '\ud83c\udfaf VANTAGENS', '', [
              { ic: '\ud83c\udf9f\ufe0f', t: '**Cupom exclusivo** para cadastrados' },
              { ic: '\u26a1', t: '**Acesso antecipado** \u00e0s ofertas' },
              { ic: '\ud83d\ude9a', t: 'Frete gr\u00e1tis em itens selecionados' },
            ]),
          ],
          [
            form(NAVY, {
              title: 'Libere seu cupom', sub: 'Preencha e receba **agora**.',
              btn: 'Quero meu cupom', success: 'Cupom liberado! Copie o c\u00f3digo abaixo:',
              askName: '0', askEmail: '1', askWhatsapp: '1', coupon: 'BLACK10',
            }),
            count(NAVY),
          ]),
      ],
    }),
  },
  {
    id: 'preset:desk-video-form',
    name: 'Desktop - V\u00eddeo + Cadastro',
    category: 'Black Friday',
    type: 'landing',
    description: 'V\u00eddeo \u00e0 esquerda, cadastro \u00e0 direita, contagem abaixo.',
    swatch: [GOLD.bg, GOLD.accent, NAVY.card],
    build: () => ({
      blocks: [
        brand(GOLD),
        cols('2',
          [mk('video', { url: asset('bf-video.mp4') } as P)],
          [
            head(GOLD, 'ASSISTA E', 'GARANTA O CUPOM', 'Veja o que preparamos para a **Black Friday**.'),
            form(GOLD, {
              title: 'Receba o cupom', sub: 'Cadastre-se e libere o c\u00f3digo.',
              btn: 'Quero o cupom', success: 'Cupom liberado! Copie o c\u00f3digo abaixo:',
              askName: '0', askEmail: '1', askWhatsapp: '1', coupon: 'BLACK10',
            }),
          ]),
        count(GOLD),
      ],
    }),
  },
];