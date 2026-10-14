type Mod = { slug: string; name: string; status: string; sort_order?: number };

// Mesma regra do Master: ativos primeiro (em breve por ultimo);
// dentro de cada grupo vale a posicao definida no Master (sort_order); desempate A-Z.
export function sortModules<T extends Mod>(list: T[], _owned: string[] = []): T[] {
  const rank = (m: T) => (m.status === 'coming_soon' ? 1 : 0);
  return [...list].sort(
    (a, b) =>
      rank(a) - rank(b) ||
      (a.sort_order ?? 999) - (b.sort_order ?? 999) ||
      a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }),
  );
}