import type { Preset, P } from './presets';
import { mk, brand, badge, head, chips, count, form, GOLD } from './presets';

const asset = (name: string) => `${window.location.origin}/assets/templates/${name}`;
const YELLOW = '#facc15';
const CLEAR: P = { bg: '' };

export const PRESETS_DESKTOP_FOGO: Preset[] = [
  {
    id: 'preset:desk-bf-fogo',
    name: 'Desktop - Black Friday Fogo',
    category: 'Black Friday',
    type: 'landing',
    description: 'Fundo com imagem, t\u00edtulo e contagem \u00e0 esquerda, cadastro VIP \u00e0 direita, vantagens e faixa vermelha.',
    swatch: ['#0b0a08', YELLOW, '#b91c1c'],
    build: () => {
      const hero: any = mk('columns', {
        cols: '2', stack: '1', gap: '48', pad: '40', align: 'center',
        bgType: 'image', bg: '#0b0a08', bgImg: asset('bf-fogo-fundo.jpg'),
        bgOverlay: '25', bgSize: 'cover', bgPos: 'center',
      } as P);

      hero.children = [
        [
          brand(GOLD, { ...CLEAR, name: 'SUA LOJA', align: 'left' }),
          head(GOLD, 'BLACK FRIDAY', 'EST\u00c1 CHEGANDO', 'Estamos preparando as **maiores ofertas do ano**. Cadastre-se e receba acesso antecipado.', {
            ...CLEAR, align: 'left', l1Color: YELLOW, l2Color: '#ffffff',
            l1Size: '72', l1SizeM: '40', l2Size: '64', l2SizeM: '34',
          }),
          count(GOLD, { ...CLEAR, boxBg: '#000000b3', boxBc: YELLOW, glow: YELLOW, glowSize: '14', nColor: YELLOW, lblColor: '#e5e7eb' }),
        ],
        [
          badge(GOLD, '\ud83d\udd12 LOJA FECHADA PARA PREPARA\u00c7\u00c3O', { ...CLEAR, bc: YELLOW, tColor: '#ffffff' }),
          form(GOLD, {
            ...CLEAR,
            cardBg: '#14110dd9', cardBc: YELLOW, glow: YELLOW, glowSize: '16', titleColor: '#ffffff', btnBg: YELLOW, btnColor: '#0b0a08',
            title: 'GARANTA SEU ACESSO VIP',
            sub: '\ud83d\udd12 Seus dados est\u00e3o seguros. **Sem spam.**',
            btn: 'QUERO ACESSO ANTECIPADO \u2192',
            success: 'Cadastro realizado! Voc\u00ea ser\u00e1 avisado em primeira m\u00e3o.',
            askName: '1', askEmail: '1', askWhatsapp: '1',
          }),
        ],
      ];

      return {
        blocks: [
          hero,
          chips(GOLD, [
            { t: '\ud83c\udff7\ufe0f Descontos de at\u00e9 70%' },
            { t: '\ud83d\udc51 Acesso VIP antes de todos' },
            { t: '\ud83d\ude9a Frete gr\u00e1tis em ofertas selecionadas' },
          ], { bgType: 'gradient', bg: '#0b0a08', bg2: '#1f0707', bgAngle: '180', chipBc: YELLOW }),
          head(GOLD, '\u26a0\ufe0f APENAS OS CADASTRADOS ENTRAM PRIMEIRO.', 'VAGAS LIMITADAS!', '', {
            bgType: 'gradient', bg: '#7f1d1d', bg2: '#dc2626', bgAngle: '90', pad: '14',
            l1Color: '#ffffff', l2Color: '#ffffff', l1Size: '18', l1SizeM: '14', l2Size: '18', l2SizeM: '14',
          }),
        ],
      };
    },
  },
];