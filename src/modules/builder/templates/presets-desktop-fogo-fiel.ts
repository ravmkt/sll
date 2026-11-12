import type { Preset, P } from './presets';
import { mk, brand, badge, head, chips, count, form, GOLD } from './presets';

const asset = (name: string) => `${window.location.origin}/assets/templates/${name}`;
const IMG = asset('bf-fogo-fundo.jpg');
const YELLOW = '#facc15';
const CLEAR: P = { bg: '' };

const cols = (n: number, ratio: string, kids: any[][], o: P = {}) => {
  const c: any = mk('columns', { cols: String(n), ratio, stack: '1', gap: '0', pad: '0', align: 'center', ...o } as P);
  c.children = kids;
  return c;
};

export const PRESETS_DESKTOP_FOGO_FIEL: Preset[] = [
  {
    id: 'preset:desk-bf-fogo-fiel',
    name: 'Desktop - Black Friday Fogo (fiel)',
    category: 'Black Friday',
    type: 'landing',
    description: 'Fundo com imagem, t\u00edtulo e contagem \u00e0 esquerda, cadastro VIP \u00e0 direita, vantagens e barra vermelha.',
    swatch: ['#0b0a08', YELLOW, '#b91c1c'],
    build: () => {
      const hero = cols(3, '50,12,38', [
        [
          brand(GOLD, { ...CLEAR, name: 'SUA LOJA', align: 'left' }),
          head(GOLD, 'BLACK FRIDAY', 'EST\u00c1 CHEGANDO!', 'Estamos preparando as **maiores ofertas do ano.**\nCadastre-se e receba acesso antecipado.', {
            ...CLEAR, align: 'left', l1Color: YELLOW, l2Color: '#f3f4f6', subColor: '#ffffff',
            l1Size: '80', l1SizeM: '42', l2Size: '68', l2SizeM: '36',
          }),
          count(GOLD, {
            ...CLEAR, boxBg: '#000000b3', boxBc: YELLOW, nColor: YELLOW, lblColor: '#e5e7eb',
            glow: YELLOW, glowSize: '14', boxW: '120', gap: '14', nSize: '52', nSizeM: '28',
          }),
        ],
        [],
        [
          badge(GOLD, '\ud83d\udd12 LOJA FECHADA PARA PREPARA\u00c7\u00c3O', { ...CLEAR, bc: '#ffffff', tColor: '#ffffff' }),
          form(GOLD, {
            ...CLEAR,
            cardBg: '#14110dd9', cardBc: '#f59e0b', glow: '#f97316', glowSize: '16',
            titleColor: '#ffffff', inputBc: '#6b7280', btnBg: YELLOW, btnColor: '#0b0a08',
            title: 'GARANTA SEU ACESSO VIP',
            sub: '',
            btn: 'QUERO ACESSO ANTECIPADO \u2192',
            success: 'Cadastro realizado! Voc\u00ea ser\u00e1 avisado em primeira m\u00e3o.',
            askName: '1', askEmail: '1', askWhatsapp: '1',
          }),
          head(GOLD, '', '', '\ud83d\udd12 Seus dados est\u00e3o seguros. Sem spam.', { ...CLEAR, subColor: '#d1d5db', subSize: '13', subSizeM: '12', pad: '4' }),
        ],
      ], {
        pad: '56', bgType: 'image', bg: '#0b0a08', bgImg: IMG, bgOverlay: '20', bgSize: 'cover', bgPos: 'top',
      });

      const vantagens = cols(2, '22,78', [
        [
          head(GOLD, 'VANTAGENS', 'EXCLUSIVAS', '', {
            ...CLEAR, l1Color: YELLOW, l2Color: YELLOW, l1Size: '22', l1SizeM: '18', l2Size: '22', l2SizeM: '18', pad: '8',
          }),
        ],
        [
          chips(GOLD, [
            { t: '\ud83c\udff7\ufe0f Descontos de at\u00e9 70%' },
            { t: '\ud83d\udc51 Acesso VIP antes de todos' },
            { t: '\ud83d\ude9a Frete gr\u00e1tis em ofertas selecionadas' },
          ], { ...CLEAR, chipBg: '#000000b3', chipBc: '#8a6d2f', pad: '8' }),
        ],
      ], { pad: '16', bgType: 'image', bg: '#0b0a08', bgImg: IMG, bgOverlay: '35', bgSize: 'cover', bgPos: 'bottom' });

      const barra = cols(2, '72,28', [
        [
          head(GOLD, '', '', '\u26a0\ufe0f Apenas os cadastrados entram primeiro. **Vagas limitadas!**', {
            ...CLEAR, align: 'left', subColor: '#ffffff', subSize: '17', subSizeM: '14', pad: '14',
          }),
        ],
        [
          head(GOLD, '', '', '\u00a9 Sua Loja. Todos os direitos reservados.', {
            ...CLEAR, align: 'right', subColor: '#e5e7eb', subSize: '13', subSizeM: '12', pad: '14',
          }),
        ],
      ], { bgType: 'gradient', bg: '#dc2626', bg2: '#1a0505', bgAngle: '90' });

      return { blocks: [hero, vantagens, barra] };
    },
  },
];