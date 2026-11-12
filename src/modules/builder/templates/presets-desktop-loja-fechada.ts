import type { Preset, P } from './presets';
import { mk, brand, badge, head, chips, count, form, GOLD } from './presets';

const cols2 = (left: any[], right: any[]) => {
  const c: any = mk('columns', { cols: '2', stack: '1', gap: '32', align: 'center' } as P);
  c.children = [left, right];
  return c;
};

export const PRESETS_DESKTOP_LOJA_FECHADA: Preset[] = [
  {
    id: 'preset:desk-loja-fechada',
    name: 'Desktop - Loja Fechada',
    category: 'Black Friday',
    type: 'landing',
    description: 'Pré-lançamento: título no topo, contagem e benefícios à esquerda, cadastro à direita.',
    swatch: [GOLD.bg, GOLD.accent, GOLD.card],
    build: () => ({
      blocks: [
        brand(GOLD, { name: 'SUA LOJA' }),
        badge(GOLD, '\ud83d\udd12 LOJA FECHADA PARA PREPARA\u00c7\u00c3O'),
        head(GOLD, 'A BLACK FRIDAY', 'EST\u00c1 CHEGANDO!', 'Estamos preparando as **maiores ofertas do ano**. Cadastre-se e garanta seu acesso antecipado.'),
        cols2(
          [
            count(GOLD),
            chips(GOLD, [
              { t: '\ud83c\udff7\ufe0f Descontos de at\u00e9 70%' },
              { t: '\ud83d\udc51 Acesso VIP antecipado' },
              { t: '\ud83d\ude9a Frete gr\u00e1tis em ofertas' },
            ]),
          ],
          [
            form(GOLD, {
              title: 'GARANTA SEU ACESSO ANTECIPADO',
              sub: '\ud83d\udd12 Seus dados est\u00e3o seguros. **Sem spam.**',
              btn: 'QUERO ACESSO ANTECIPADO \u2192',
              success: 'Cadastro realizado! Voc\u00ea ser\u00e1 avisado em primeira m\u00e3o.',
              askName: '1', askEmail: '1', askWhatsapp: '1',
            }),
          ],
        ),
        head(GOLD, 'S\u00d3 QUEM SE CADASTRAR ENTRA PRIMEIRO.', 'VAGAS LIMITADAS!', ''),
      ],
    }),
  },
];