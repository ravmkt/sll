export const CATEGORIES = [
  { key: 'conversao', label: 'Conversão & Loja' },
  { key: 'trafego', label: 'Tráfego & Anúncios' },
  { key: 'precificacao', label: 'Precificação & Lucro' },
  { key: 'operacao', label: 'Operação & Cadastro' },
  { key: 'clube_sll', label: 'Clube SLL & Indicação' },
] as const;

export const categoryLabel = (key: string) => CATEGORIES.find((c) => c.key === key)?.label ?? key;

export const METRICS = [
  { key: 'ctr', label: 'CTR dos vídeos (%)' },
  { key: 'views', label: 'Visualizações (30 dias)' },
  { key: 'clicks', label: 'Cliques nos widgets (30 dias)' },
  { key: 'revenue', label: 'Vendas assistidas (R$, 30 dias)' },
  { key: 'products', label: 'Produtos ativos' },
  { key: 'videos', label: 'Vídeos cadastrados' },
  { key: 'referred', label: 'Lojas indicadas' },
] as const;

export const OPERATORS = ['<', '<=', '>', '>=', '=='] as const;

export type Operator = (typeof OPERATORS)[number];
export type Trigger = { metric: string; operator: Operator; value: number };

export function isTriggerActive(t: Trigger | null | undefined, m: Record<string, number>): boolean {
  if (!t || !(t.metric in m)) return false;
  if (t.metric === 'ctr' && (m.views ?? 0) < 30) return false;
  const v = Number(m[t.metric]);
  const x = Number(t.value);
  switch (t.operator) {
    case '<': return v < x;
    case '<=': return v <= x;
    case '>': return v > x;
    case '>=': return v >= x;
    case '==': return v === x;
    default: return false;
  }
}

export const norm = (s: string) =>
  (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();